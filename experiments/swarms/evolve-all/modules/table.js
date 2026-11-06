/* modules/table.js — EVOLVE-ALL evolver module: the party table.
   The film's table (155 s, 214 s): a pale, bare, hexagonal top lit by the candles, a thin edge, nothing visible underneath.
   Genome: top radius, number of sides, stretch, orientation, height, edge thickness, legs/pedestal, cloth, colours. Blank: a square post.
   Fitness (node-safe): top silhouette IoU against the traced outline (refs/table.json), proportions (cake to top width, height to width,
   edge to width), lit top colour, and support (it stands, the cake fits, the base stays dark).
   Units: the memory's scene units (ana/index.html: cake radius 0.12). Plain JS, UMD: node module.exports or window.EVOMOD.table. */
(function (root, factory) { const M = factory(); if (typeof module === 'object' && module.exports) module.exports = M; else { root.EVOMOD = root.EVOMOD || {}; root.EVOMOD.table = M; } })(this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const D2R = Math.PI / 180;
  const CAKE_R = .12;                      // the cake's radius in scene units (ana/index.html); the film's cake-to-table ratio is measured against it
  const CANDLE = [1, .70, .22], GAIN = .8;  // reference candle tint and gain: how a surface albedo reads as an sRGB colour in the party frames
  /* [key, group, min, max, default(=blank)] */
  const genes = [
    ['radius', 'FRAME', .04, .6, .05],     // top: centre to vertex (size belongs to FRAME; SHAPE is the form, measured scale-free)
    ['sides', 'SHAPE', 3, 8, 4],           // rounded to an integer; the blank is a square post
    ['stretch', 'SHAPE', .7, 1.6, 1],      // the top widened along x (the film's hexagon has long front and back edges)
    ['yaw', 'SHAPE', -30, 30, 0],          // degrees; 0 = a vertex pointing right (+x)
    ['warp', 'SHAPE', -.9, .9, 0],         // moves the vertices toward (+) or away from (-) the x axis: lengthens the front and back edges (the film's hexagon is not regular)
    ['height', 'FRAME', .1, 1, .5],        // floor to top surface
    ['thick', 'FRAME', .005, .25, .06],      // edge thickness (clamped below the height)
    ['legs', 'BASE', 1, 4, 1],             // rounded: 1 = a central pedestal, 2-4 legs under the vertices
    ['legW', 'BASE', .01, .12, .05],       // pedestal or leg radius
    ['spread', 'BASE', 0, 1, 0],           // legs: how far out under the top (fraction of the inscribed radius)
    ['foot', 'BASE', 0, .45, 0],           // pedestal foot disc radius
    ['legLum', 'BASE', 0, 1, .5],          // leg/pedestal lightness (the film shows nothing under the top)
    ['cloth', 'CLOTH', 0, 1, 0],           // 0 bare; above 0.1 a cloth covers the top and falls this fraction of the height
    ['clothR', 'CLOTH', 0, 1, .9], ['clothG', 'CLOTH', 0, 1, .9], ['clothB', 'CLOTH', 0, 1, .9],
    ['topR', 'COLOUR', 0, 1, .5], ['topG', 'COLOUR', 0, 1, .5], ['topB', 'COLOUR', 0, 1, .5],
  ];
  const groups = ['SHAPE', 'FRAME', 'BASE', 'CLOTH', 'COLOUR'];
  const stages = [['SHAPE', 'silhouette', .87], ['FRAME', 'proportion', .85], ['BASE', 'support', .95], ['COLOUR', 'palette', .85], ['WHOLE', 'fit', .88]];
  const making = [['legs rise', 0, .35], ['top set', .35, .65], ['colour', .65, .8], ['cloth falls', .8, 1]];
  const IDX = {}; genes.forEach((g, i) => IDX[g[0]] = i);
  const named = G => { const o = {}; genes.forEach((g, i) => o[g[0]] = G[i]); return o; };
  const blank = () => Float64Array.from(genes.map(g => g[4]));
  /* ------------------------------------------------------------------ the top as numbers */
  function top(G) { const g = named(G), n = Math.round(g.sides), r = g.radius, h = g.height, th = Math.min(g.thick, h - .005);
    const yaw = g.yaw * D2R, verts = []; for (let i = 0; i < n; i++) { const b = i / n * Math.PI * 2, a = yaw + b - g.warp * Math.sin(2 * b) / 2; verts.push([Math.cos(a) * r * g.stretch, Math.sin(a) * r]); }
    let rIn = 1e9; for (let i = 0; i < n; i++) { const [x1, z1] = verts[i], [x2, z2] = verts[(i + 1) % n], L = Math.hypot(x2 - x1, z2 - z1); if (L > 1e-9) rIn = Math.min(rIn, Math.abs(x1 * z2 - x2 * z1) / L); }   // the smallest centre-to-edge distance
    return { y: h, thick: th, sides: n, rOut: r, rIn, stretch: g.stretch, yaw: g.yaw, verts }; }
  /* ------------------------------------------------------------------ silhouette: the top face projected from the film's camera elevation, normalised by its width */
  const GRID = [96, 32, -.55, .55, -.02, .33];
  function rasterPoly(poly, W, H, X0, X1, Y0, Y1) { const m = new Uint8Array(W * H), sx = W / (X1 - X0), sy = H / (Y1 - Y0);
    for (let y = 0; y < H; y++) { const py = Y0 + (y + .5) / sy; for (let x = 0; x < W; x++) { const px = X0 + (x + .5) / sx; let ins = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; } m[y * W + x] = ins ? 1 : 0; } } return m; }
  function screenTop(T, elevDeg) { const se = Math.sin(elevDeg * D2R); const P = T.verts.map(([x, z]) => [x, z * se]);   // camera at +z, looking down by elevDeg; screen y down = z toward camera
    let x0 = 1e9, x1 = -1e9, y0 = 1e9; P.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }); const w = x1 - x0, cx = (x0 + x1) / 2;
    return { poly: P.map(([x, y]) => [(x - cx) / w, (y - y0) / w]), width: w }; }
  const refCache = new WeakMap();
  function R(refs) { return refs && refs.table ? refs.table : refs; }
  function refMask(t) { let m = refCache.get(t); if (!m) { m = rasterPoly(t.outline, ...GRID); refCache.set(t, m); } return m; }
  function boundary(poly, N) { let per = 0; const L = poly.map((p, i) => { const q = poly[(i + 1) % poly.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); per += l; return l; }), out = [];
    for (let k = 0; k < N; k++) { let d = k / N * per, i = 0; while (d > L[i] && i < L.length - 1) { d -= L[i]; i++; } const p = poly[i], q = poly[(i + 1) % poly.length], u = L[i] ? d / L[i] : 0; out.push([lerp(p[0], q[0], u), lerp(p[1], q[1], u)]); } return out; }
  function segDist(p, poly) { let best = 1e9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey;
      const u = l2 ? clamp(((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / l2, 0, 1) : 0; best = Math.min(best, Math.hypot(p[0] - a[0] - u * ex, p[1] - a[1] - u * ey)); } return best; }
  function chamfer(A, B) { const N = 120; let s = 0; boundary(A, N).forEach(p => s += segDist(p, B)); boundary(B, N).forEach(p => s += segDist(p, A)); return s / (2 * N); }   // mean boundary distance, both ways, in units of the top width
  function corners(poly, minDeg) { let c = 0; for (let i = 0; i < poly.length; i++) { const a = poly[(i + poly.length - 1) % poly.length], b = poly[i], d = poly[(i + 1) % poly.length];
      const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(d[1] - b[1], d[0] - b[0]); let dt = Math.abs(t2 - t1); if (dt > Math.PI) dt = 2 * Math.PI - dt; if (dt * 180 / Math.PI > minDeg) c++; } return c; }   // vertices that turn by more than minDeg on screen
  const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; };
  const logScore = (v, target, tol) => 1 / (1 + Math.pow(Math.log(Math.max(1e-6, v) / target) / tol, 2));   // Cauchy: never flat, so a far-off genome still has a slope
  /* ------------------------------------------------------------------ fitness */
  function evaluate(G, refs) { const t = R(refs), g = named(G), T = top(G), sc = screenTop(T, t.elevationDeg || 13);
    const IoU = iou(rasterPoly(sc.poly, ...GRID), refMask(t)), cham = chamfer(sc.poly, t.outline), nc = corners(sc.poly, 25), cs = 1 / (1 + .5 * Math.pow(nc - (t.corners || 6), 2));
    const silhouette = Math.sqrt(IoU / (1 + Math.pow(cham / .02, 2))) * (.6 + .4 * cs);
    const width = sc.width, cakeToTop = 2 * CAKE_R / width, hToW = T.y / width, eToW = T.thick / width;
    const heightToWidth = t.heightToWidth || .613;
    const edgeS = eToW <= t.edgeToWidth ? 1 : 1 / (1 + Math.pow((eToW - t.edgeToWidth) / .05, 2));
    const proportion = (logScore(cakeToTop, t.cakeToTop, .25) + logScore(hToW, heightToWidth, .3) + edgeS) / 3;
    // lit top colour: cloth colour when a cloth covers the top, else the top albedo; seen under the reference candle
    const cl = g.cloth > .1, alb = cl ? [g.clothR, g.clothG, g.clothB] : [g.topR, g.topG, g.topB];
    const seen = alb.map((a, k) => 255 * clamp(a * CANDLE[k] * GAIN, 0, 1)), tc = t.topColour;
    const dc = Math.hypot(seen[0] - tc[0], seen[1] - tc[1], seen[2] - tc[2]) / 255, palette = 1 / (1 + Math.pow(dc / .05, 2));
    // support: it stands (pedestal foot or leg spread), the cake fits on the top, and the base stays as dark as the film's (nothing visible under the top)
    const legs = Math.round(g.legs), stand = legs === 1 ? sstep(.2, .45, g.foot / Math.max(.01, T.rIn)) * sstep(.01, .03, g.legW) : sstep(.3, .6, g.spread) * sstep(.008, .02, g.legW);
    const fits = .05 + .95 * sstep(.3, 1.5, T.rIn / CAKE_R);
    const below = (cl ? g.cloth * lum(g.clothR, g.clothG, g.clothB) * 40 : 0) + g.legLum * 12 * (legs === 1 ? 1 : .6);   // predicted luma under the top
    const dark = 1 / (1 + Math.pow(Math.max(0, below - (t.belowLuma || 2.8)) / 6, 2));
    const support = stand * fits * dark;
    const fit = .35 * silhouette + .25 * proportion + .15 * support + .25 * palette;
    return { fit, parts: { silhouette, iou: IoU, chamfer: cham, corners: nc, proportion, support, palette, stand, fits, dark, cakeToTop, heightToWidth: hToW, edgeToWidth: eToW, seen } };
  }
  function lum(r, g, b) { return .2126 * r + .7152 * g + .0722 * b; }
  /* ------------------------------------------------------------------ anchors: where other parts attach */
  function anchors(G) { const T = top(G); return { topCentre: [0, T.y, 0], floor: [0, 0, 0], topEdgeFront: [0, T.y, T.rIn], topEdgeBack: [0, T.y, -T.rIn], topEdgeLeft: [-T.rIn, T.y, 0], topEdgeRight: [T.rIn, T.y, 0],
    topRadius: [T.rIn, T.y, T.rOut] /* [inscribed radius, top height, vertex radius] */ }; }
  /* the top polygon's distance from the centre along a horizontal direction (angle deg from +x toward +z); used by dependants */
  function edgeAt(T, angDeg) { const a = angDeg * D2R, dx = Math.cos(a), dz = Math.sin(a); let best = 1e9; const V = T.verts;
    for (let i = 0; i < V.length; i++) { const [x1, z1] = V[i], [x2, z2] = V[(i + 1) % V.length], ex = x2 - x1, ez = z2 - z1, den = dx * ez - dz * ex; if (Math.abs(den) < 1e-12) continue;
      const s = (x1 * ez - z1 * ex) / den, u = (x1 * dz - z1 * dx) / den; if (s > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, s); } return best; }
  /* ------------------------------------------------------------------ build: the 3D table; opts.t (0..1) = how far made */
  function build(THREE, G, opts) { opts = opts || {}; const t = opts.t == null ? 1 : clamp(opts.t, 0, 1), g = named(G), T = top(G), root = new THREE.Group(); root.name = 'table';
    const ph = (a, b) => clamp((t - a) / (b - a), 0, 1), legsP = ph(0, .35), topP = ph(.35, .65), colP = ph(.65, .8), clothP = ph(.8, 1);
    const grey = new THREE.Color(.42, .42, .42), topCol = new THREE.Color(g.topR, g.topG, g.topB), clothCol = new THREE.Color(g.clothR, g.clothG, g.clothB);
    const topMat = new THREE.MeshStandardMaterial({ color: grey.clone().lerp(topCol, colP), roughness: .65, metalness: 0 });
    const legMat = new THREE.MeshStandardMaterial({ color: grey.clone().lerp(new THREE.Color(g.legLum, g.legLum * .92, g.legLum * .82), colP), roughness: .8 });
    // legs rise from the floor
    const legH = Math.max(.001, T.y - T.thick), legs = Math.round(g.legs), LG = new THREE.Group(); LG.scale.y = Math.max(.001, legsP); root.add(LG);
    if (legs === 1) { const p = new THREE.Mesh(new THREE.CylinderGeometry(g.legW, g.legW * 1.15, legH, 24), legMat); p.position.y = legH / 2; LG.add(p);
      if (g.foot > .005) { const f = new THREE.Mesh(new THREE.CylinderGeometry(g.foot, g.foot, .015, 32), legMat); f.position.y = .0075; LG.add(f); } }
    else for (let i = 0; i < legs; i++) { const v = T.verts[Math.round(i * T.sides / legs) % T.sides], k = g.spread * T.rIn / Math.hypot(v[0], v[1]);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(g.legW, g.legW * .8, legH, 12), legMat); l.position.set(v[0] * k, legH / 2, v[1] * k); LG.add(l); }
    // the top is set: it comes down onto the legs
    if (topP > 0) { const shape = new THREE.Shape(T.verts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: T.thick, bevelEnabled: false, curveSegments: 1 }); const m = new THREE.Mesh(geo, topMat); m.rotation.x = -Math.PI / 2;
      m.position.y = T.y - T.thick + (1 - topP) * (1 - topP) * .35; topMat.transparent = topP < 1; topMat.opacity = topP; m.name = 'top'; root.add(m); }
    // the cloth falls over the top and down the sides
    if (g.cloth > .1 && clothP > 0) { const cm = new THREE.MeshStandardMaterial({ color: clothCol, roughness: .9, side: THREE.DoubleSide });
      const sheet = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(T.verts.map(([x, z]) => new THREE.Vector2(x * 1.02, -z * 1.02))), { depth: .004, bevelEnabled: false }), cm);
      sheet.rotation.x = -Math.PI / 2; sheet.position.y = T.y + .001; root.add(sheet);
      const drop = g.cloth * T.y * clothP; if (drop > .002) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(T.rOut * 1.02, T.rOut * 1.05, drop, T.sides, 1, true, Math.PI / 2 - g.yaw * D2R), cm);
        sk.scale.x = g.stretch; sk.position.y = T.y - drop / 2; root.add(sk); } }
    root.userData = { module: 'table', t, top: { y: T.y, rIn: T.rIn, rOut: T.rOut, sides: T.sides, stretch: T.stretch, yaw: T.yaw } };
    return root; }
  return { name: 'table', genes, groups, stages, making, blank, evaluate, build, anchors, top, edgeAt, named, CAKE_R, CANDLE, GAIN };
});
