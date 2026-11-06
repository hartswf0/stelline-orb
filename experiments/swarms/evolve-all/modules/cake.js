/* modules/cake.js — EVOLVE-ALL evolver module: the cake.
   Ported from ../evolve/evolve-core.js (lathe profile, projection from the reference camera, rasterised silhouette IoU).
   What changed:
   - Eight film references (refs/cake.json): the seven cakes of 138-148 s plus her cake on the table at 155 s. Each has its own
     traced outline, camera elevation and roll, and separate top / side / bead colours measured in CIELAB.
   - Colour is judged per region in CIELAB: the icing genes against the measured top, the sponge genes against the measured side,
     the bead genes against the measured beads. The old fitness pooled every pixel of the cake into one sRGB histogram; the dark
     side (about 90% of the pixels at 7 degrees) and the film's crushed blue channel pulled the icing to olive (see docs/cake.md).
   - Colour genes are CIELAB (L, a, b), so a mutation step is about the same visible change everywhere.
   - build(THREE, G, {t}) makes the cake on screen from the table up: board, sponge layers, filling, dome, icing poured then
     spread down the side, beads piped one by one. anchors(G) gives base, top centre, rim, the inscription spot and seven candle seats.
   Units: scene units of ana/index.html (cake body radius 0.12); origin = centre of the cake's underside (sits on the table top).
   Breeding is not here (core/breed.js). Plain JS, UMD: node module.exports, browser window.EVOMOD.cake. */
(function (root, factory) { const M = factory(); if (typeof module === 'object' && module.exports) module.exports = M; else { root.EVOMOD = root.EVOMOD || {}; root.EVOMOD.cake = M; } })(this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, D2R = Math.PI / 180;
  const sst = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const R0 = .12;                                   // body radius in scene units
  const LAMBDA = .014;   // frosting ripple wavelength in scene units (1.4 cm); ripple amplitude = slope * LAMBDA / PI
  /* ------------------------------------------------------------------ genome: [key, group, min, max, default (= blank)] */
  const genes = [
    ['height', 'BASE', .06, .9, .06],      // body height / body diameter
    ['taper', 'BASE', .85, 1.12, 1],       // top radius / bottom radius
    ['board', 'BASE', 0, 1, 0],            // cake board: 0 none, 1 = 8% wider than the body and 3% of its width thick
    ['layers', 'FORM', 1, 4, 1],           // sponge layers (rounded)
    ['dome', 'FORM', 0, 1, 0],             // dome height, up to 0.6 of the body diameter
    ['bevel', 'FORM', 0, .35, 0],          // rounded top edge
    ['sideL', 'SPONGE', 0, 100, 80], ['sideA', 'SPONGE', -30, 50, 3], ['sideB', 'SPONGE', -30, 80, 20],   // the side as seen (CIELAB)
    ['topL', 'ICING', 0, 100, 80], ['topA', 'ICING', -30, 50, 3], ['topB', 'ICING', -30, 80, 20],         // the icing on top as seen
    ['frostTop', 'FROSTING', 0, 1, 0],       // frosting roughness of the top: surface slope of the ripples (0 = a smooth poured glaze)
    ['frostSide', 'FROSTING', 0, 1, 0],       // frosting roughness of the side
    ['spread', 'ICING', 0, 1, 0],          // how far the icing runs down the side (fraction of the height); not measured
    ['fill', 'ICING', 0, 1, 0],            // filling between layers (thickness); not measured
    ['beads', 'DECORATION', 0, .6, 0],     // fraction of the side covered by beads
    ['beadL', 'DECORATION', 0, 100, 50], ['beadA', 'DECORATION', -30, 50, 0], ['beadB', 'DECORATION', -30, 80, 0],
    ['border', 'DECORATION', 0, .4, 0],    // piped shell border round the top rim: relief (shell height / wavelength); 0 = none
    ['foot', 'DECORATION', 0, 1, 0],       // piped border round the foot (shell size, 0 = none); not measured (the foot is in shadow in every frame)
  ];
  const groups = ['BASE', 'FORM', 'SPONGE', 'ICING', 'FROSTING', 'DECORATION'];
  // a stage is passed when its measure (a key of evaluate().parts, or 'fit') reaches the threshold
  const stages = [['BASE', 'iou', .75], ['FORM', 'iou', .8], ['SPONGE', 'side', .82], ['ICING', 'top', .85], ['FROSTING', 'frost', .8], ['DECORATION', 'deco', .75]];
  const making = [['SET THE BOARD', 0, .08], ['SET THE SPONGE LAYERS', .08, .36], ['RAISE THE DOME', .36, .44],
    ['POUR THE ICING', .44, .58], ['SPREAD THE ICING DOWN THE SIDE', .58, .72], ['PIPE THE BORDERS', .72, .86], ['SET THE BEADS', .86, 1]];
  const IDX = {}; genes.forEach((g, i) => IDX[g[0]] = i);
  const named = G => { const o = {}; genes.forEach((g, i) => o[g[0]] = G[i]); return o; };
  const blank = () => Float64Array.from(genes.map(g => g[4]));
  /* ------------------------------------------------------------------ colour: CIELAB (D65) <-> sRGB */
  function lab2srgb(L, a, b) { const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200, e = 216 / 24389, k = 24389 / 27;
    const inv = f => f * f * f > e ? f * f * f : (116 * f - 16) / k, X = inv(fx) * .95047, Y = inv(fy), Z = inv(fz) * 1.08883;
    const lin = [3.2404542 * X - 1.5371385 * Y - .4985314 * Z, -.969266 * X + 1.8760108 * Y + .041556 * Z, .0556434 * X - .2040259 * Y + 1.0572252 * Z];
    return lin.map(v => { v = clamp(v, 0, 1); return Math.round(255 * (v <= .0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - .055)); }); }
  function srgb2lab(r, g, b) { const lin = [r, g, b].map(v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    const X = (.4124564 * lin[0] + .3575761 * lin[1] + .1804375 * lin[2]) / .95047, Y = .2126729 * lin[0] + .7151522 * lin[1] + .072175 * lin[2], Z = (.0193339 * lin[0] + .119192 * lin[1] + .9503041 * lin[2]) / 1.08883;
    const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; }
  const dE = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  function colours(G) { const g = named(G); return { side: lab2srgb(g.sideL, g.sideA, g.sideB), top: lab2srgb(g.topL, g.topA, g.topB), bead: lab2srgb(g.beadL, g.beadA, g.beadB) }; }
  /* ------------------------------------------------------------------ the shape: one lathe profile, body radius 0.5 (diameter 1) */
  function shape(G) { const g = named(G), R = .5, H = g.height, rt = R * g.taper, bev = g.bevel * Math.min(rt, H), D = g.dome * .6,
      Rb = R + g.board * .04, hb = g.board * .03, rr = rt - bev, y0 = hb, yTop = y0 + H;
    return { g, R, H, rt, bev, D, Rb, hb, rr, y0, yTop, layers: Math.round(g.layers) }; }
  // height of the cake's upper surface at radius r (0..rt) above the underside, in profile units
  function surfaceY(s, r) { if (r <= s.rr) return s.yTop + s.D * Math.sqrt(Math.max(0, 1 - (r / Math.max(1e-9, s.rr)) ** 2));
    const u = clamp((r - s.rr) / Math.max(1e-9, s.bev), 0, 1); return s.yTop - s.bev + s.bev * Math.sqrt(Math.max(0, 1 - u * u)); }
  function profile(G) { const s = shape(G), pts = [];   // [r, y, part] bottom centre -> top centre
    pts.push([0, 0, 'board'], [s.Rb, 0, 'board'], [s.Rb, s.hb, 'board'], [s.R, s.y0, 'side']);
    for (let k = 1; k <= 8; k++) { const u = k / 8, y = s.y0 + u * (s.H - s.bev); pts.push([lerp(s.R, s.rt, (y - s.y0) / s.H), y, 'side']); }
    for (let k = 1; k <= 5; k++) { const a = k / 5 * Math.PI / 2; pts.push([s.rr + s.bev * Math.cos(a), s.yTop - s.bev + s.bev * Math.sin(a), 'top']); }
    for (let k = 1; k <= 8; k++) { const a = k / 8 * Math.PI / 2; pts.push([s.rr * Math.cos(a), s.yTop + s.D * Math.sin(a), 'top']); }
    return { pts, s }; }
  /* ------------------------------------------------------------------ silhouette: project from the reference camera (elevation, roll), normalise by width, rasterise */
  const CN = 40, GRID = { W: 80, H: 88, X0: -.55, X1: .55, Y0: -.02, Y1: 1.19 };
  function screen(G, elevDeg, rollDeg) { const { pts } = profile(G), e = elevDeg * D2R, ce = Math.cos(e), se = Math.sin(e), ro = rollDeg * D2R, cr = Math.cos(ro), sr = Math.sin(ro);
    const n = pts.length, S = new Float64Array(n * CN * 2); let k = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < CN; j++) { const a = j / CN * Math.PI * 2, x = Math.sin(a) * pts[i][0], y = pts[i][1], z = Math.cos(a) * pts[i][0];
      const sx = x, sy = -(y * ce - z * se); S[k++] = sx * cr - sy * sr; S[k++] = sx * sr + sy * cr; }   // camera at +z, elevated; screen y down; then the image roll
    let x0 = 1e9, x1 = -1e9, y0 = 1e9; for (let i = 0; i < S.length; i += 2) { x0 = Math.min(x0, S[i]); x1 = Math.max(x1, S[i]); y0 = Math.min(y0, S[i + 1]); }
    const w = x1 - x0, cx = (x0 + x1) / 2; for (let i = 0; i < S.length; i += 2) { S[i] = (S[i] - cx) / w; S[i + 1] = (S[i + 1] - y0) / w; }
    return { S, rows: n, cols: CN }; }
  function fillTri(m, ax, ay, bx, by, cx, cy) { const { W, H } = GRID;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-12) return;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x + .5, py = y + .5, w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
      if (w0 >= -1e-9 && w1 >= -1e-9 && 1 - w0 - w1 >= -1e-9) m[y * W + x] = 1; } }
  function maskOf(G, elev, roll) { const { S, rows, cols } = screen(G, elev, roll), { W, H, X0, X1, Y0, Y1 } = GRID, sx = W / (X1 - X0), sy = H / (Y1 - Y0), m = new Uint8Array(W * H);
    const X = i => (S[i * 2] - X0) * sx, Y = i => (S[i * 2 + 1] - Y0) * sy;
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols; c++) { const a = r * cols + c, b = r * cols + (c + 1) % cols, d = a + cols, f = b + cols;
      fillTri(m, X(a), Y(a), X(d), Y(d), X(b), Y(b)); fillTri(m, X(b), Y(b), X(d), Y(d), X(f), Y(f)); }
    return m; }
  function polyMask(poly) { const { W, H, X0, X1, Y0, Y1 } = GRID, m = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) { const py = Y0 + (y + .5) * (Y1 - Y0) / H; for (let x = 0; x < W; x++) { const px = X0 + (x + .5) * (X1 - X0) / W; let ins = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; } m[y * W + x] = ins ? 1 : 0; } } return m; }
  const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; };
  /* ------------------------------------------------------------------ references: the whole refs/cake.json (uses refs.target, else refs.default) or one cake entry */
  const cache = new WeakMap();
  function target(refs) { if (!refs) throw new Error('cake.evaluate needs refs/cake.json'); if (refs.outline) return refs;
    const id = refs.target || refs.default; const t = refs.cakes[id]; if (!t) throw new Error('cake: no reference ' + id); return t; }
  function select(refs, id) { if (!refs.cakes[id]) throw new Error('cake: no reference ' + id); return Object.assign({}, refs, { target: id }); }
  const targets = refs => (refs.order || Object.keys(refs.cakes)).map(id => ({ id, t: refs.cakes[id].t, label: refs.cakes[id].label }));
  /* ------------------------------------------------------------------ fitness
     0.3 silhouette + 0.2 top colour + 0.15 side colour + 0.1 beads + 0.15 frosting texture + 0.1 top border.
     Texture is predicted from the genome by one shading rule: a surface whose ripples have slope s, seen at lightness L, shows a
     band-pass lightness spread of about L * s. (Beads also add side texture in the frames; they are judged by their own term instead.) The prediction is compared with the
     band-pass spread measured in the frame (refs texture, rimTop). The rule is not calibrated against rendered images. */
  const DE_SCALE = 30, W = { iou: .3, top: .2, side: .15, beads: .1, frost: .15, border: .1 };
  function predictTexture(g) {
    return { top: g.topL * g.frostTop, side: g.sideL * g.frostSide, rim: g.topL * (.4 * g.frostTop + g.border) }; }
  function evaluate(G, refs) { const t = target(refs), g = named(G); let rm = cache.get(t); if (!rm) { rm = polyMask(t.outline); cache.set(t, rm); }
    const I = iou(maskOf(G, t.elevationDeg, t.rollDeg || 0), rm);
    const dTop = dE([g.topL, g.topA, g.topB], t.top.lab), dSide = dE([g.sideL, g.sideA, g.sideB], t.side.lab);
    const bf = t.beads.frac, dBead = t.beads.lab ? dE([g.beadL, g.beadA, g.beadB], t.beads.lab) : 0;
    const top = Math.exp(-dTop / DE_SCALE), side = Math.exp(-dSide / DE_SCALE);
    const beads = Math.sqrt(Math.exp(-Math.abs(g.beads - bf) / .05) * Math.exp(-dBead / DE_SCALE));   // geometric mean: neither the share nor the colour can be ignored
    const P = predictTexture(g), tx = t.texture || {}, dT = tx.top != null ? Math.abs(P.top - tx.top) : 0, dS = tx.side != null ? Math.abs(P.side - tx.side) : 0;
    const frost = Math.exp(-(dT + dS) / 5), border = t.rimTop ? Math.exp(-Math.abs(P.rim - t.rimTop.energy) / 3) : 1;
    const fit = W.iou * I + W.top * top + W.side * side + W.beads * beads + W.frost * frost + W.border * border;
    return { fit, parts: { iou: I, top, side, beads, frost, border, deco: .6 * beads + .4 * border,
      dETop: dTop, dESide: dSide, dEBead: dBead, beadFrac: g.beads, texTop: P.top, texSide: P.side, rim: P.rim } }; }
  /* ------------------------------------------------------------------ anchors (scene units; origin = centre of the underside) */
  function anchors(G) { const s = shape(G), k = R0 / s.R, ty = surfaceY(s, 0) * k, o = {
      base: [0, 0, 0], baseRim: [s.Rb * k, 0, 0], bodyBase: [0, s.y0 * k, 0], bodyRim: [s.R * k, s.y0 * k, 0],
      top: [0, ty, 0], widest: [Math.max(s.Rb, s.R, s.rt) * k + s.g.frostSide * LAMBDA / Math.PI, 0, 0], rim: [s.rr * k, s.yTop * k, 0], edge: [s.rt * k, (s.yTop - s.bev) * k, 0] };
    const ri = .3 * s.rr; o.inscription = [0, surfaceY(s, ri) * k, ri * k];                     // toward the viewer (+z), the inscription's centre
    const rc = .62 * s.rr; for (let i = 0; i < 7; i++) { const a = Math.PI + (i - 3) * (2 * Math.PI / 7); o['candle' + i] = [Math.sin(a) * rc * k, surfaceY(s, rc) * k, Math.cos(a) * rc * k]; }
    return o; }
  const topY = (G, r) => { const s = shape(G), k = R0 / s.R; return surfaceY(s, r / k) * k; };   // surface height at a radius (scene units)
  const stepAt = t => { for (const m of making) if (t < m[2]) return m[0]; return making[making.length - 1][0]; };
  /* ------------------------------------------------------------------ the making on screen */
  function hashf(i) { let h = Math.imul(i + 1, 2654435761) ^ 0x5bd1e995; h = Math.imul(h ^ h >>> 15, 2246822519); h ^= h >>> 13; return ((h >>> 0) % 100000) / 100000; }
  // frosting ripples: a fixed sum of waves, periodic round the cake; v in scene units (height on the side, radius on the top); value about -1..1
  const RIP = [[9, 140], [17, 230], [29, 90], [41, 310], [6, 420]].map(([n, m], i) => [n, m, hashf(i + 31) * 6.283]);
  const ripple = (a, v) => { let z = 0; for (const [n, m, ph] of RIP) z += Math.sin(a * n + v * m + ph); return z / 2.2; };
  function build(THREE, G, opts) { opts = opts || {}; const T = THREE, s = shape(G), g = s.g, k = R0 / s.R, grp = new T.Group(); grp.name = 'cake';
    const C = colours(G), tint = opts.tint || [1, 1, 1], lin = opts.linear !== false;
    // colours are as seen in the film (already under its warm candle light and grade). With an sRGB-encoded renderer the sRGB value is
    // converted to linear here; opts.tint (sRGB fractions of the scene light's colour) divides that light back out so a warm scene light does not warm the icing twice.
    const col = c => { const q = new T.Color(clamp(c[0] / 255 / tint[0], 0, 1), clamp(c[1] / 255 / tint[1], 0, 1), clamp(c[2] / 255 / tint[2], 0, 1)); return lin && q.convertSRGBToLinear ? q.convertSRGBToLinear() : q; };
    const mat = (c, rough) => new T.MeshStandardMaterial({ color: col(c), roughness: rough, metalness: 0, side: T.DoubleSide });
    const sponge = mat(C.side, .9), icing = mat(C.top, .5), beadM = mat(C.bead, .35), boardM = new T.MeshStandardMaterial({ color: new T.Color(.08, .07, .06), roughness: .6 });
    const ampTop = g.frostTop * LAMBDA / Math.PI, ampSide = g.frostSide * LAMBDA / Math.PI;
    // a lathe mesh; disp(a, x, y) -> [dr, dy] in scene units moves each vertex (radially / vertically) for the frosting
    function lathe(pts, m, disp, seg) { const geo = new T.LatheGeometry(pts.map(p => new T.Vector2(Math.max(1e-5, p[0]) * k, p[1] * k)), seg || 64);
      if (disp) { const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z); if (r < 1e-6) continue;
          const a = Math.atan2(x, z), [dr, dy] = disp(a, r, y), f = (r + dr) / r; P.setXYZ(i, x * f, y + dy, z * f); } geo.computeVertexNormals(); }
      return new T.Mesh(geo, m); }
    const sideDisp = (a, r, y) => [ampSide * ripple(a, y), 0];
    const topDisp = (a, r, y) => [0, ampTop * (.5 + .5 * ripple(a, r))];   // ripples stand up from the coat
    const parts = { board: null, layers: [], fills: [], dome: null, pour: null, beads: null, shells: null, foot: null };
    // board
    if (s.hb > 1e-4) { parts.board = lathe([[0, 0], [s.Rb, 0], [s.Rb, s.hb], [0, s.hb]], boardM); grp.add(parts.board); }
    // sponge layers (each a band of the tapered side with a flat lid), filling discs between them; the side carries the side frosting
    const NL = s.layers, bodyTop = s.yTop - s.bev, rAt = y => lerp(s.R, s.rt, (y - s.y0) / s.H);
    for (let i = 0; i < NL; i++) { const ya = s.y0 + s.H * i / NL, yb = i === NL - 1 ? bodyTop : s.y0 + s.H * (i + 1) / NL, pts = [[0, ya], [rAt(ya), ya]];
      for (let q = 1; q <= 10; q++) { const y = lerp(ya, yb, q / 10); pts.push([rAt(y), y]); }
      if (i === NL - 1) for (let q = 1; q <= 5; q++) { const a = q / 5 * Math.PI / 2; pts.push([s.rr + s.bev * Math.cos(a), s.yTop - s.bev + s.bev * Math.sin(a)]); }
      pts.push([0, i === NL - 1 ? s.yTop : yb]); const m = lathe(pts, sponge, (a, r, y) => r > (s.rr - .01) * k ? sideDisp(a, r, y) : [0, 0], 96); parts.layers.push(m); grp.add(m);
      if (i < NL - 1 && g.fill > .02) { const th = (.004 + .02 * g.fill), yf = yb; const f = lathe([[0, yf - th / 2], [rAt(yf) + .004, yf - th / 2], [rAt(yf) + .004, yf + th / 2], [0, yf + th / 2]], icing); parts.fills.push(f); grp.add(f); } }
    if (s.D > 1e-3) { const pts = []; for (let q = 0; q <= 12; q++) { const a = q / 12 * Math.PI / 2; pts.push([s.rr * Math.cos(a), s.yTop + s.D * Math.sin(a)]); } parts.dome = lathe(pts, sponge, null, 64); grp.add(parts.dome); }
    // icing: a pour column, the top coat (rebuilt as it spreads), the side coat (rebuilt as it runs down)
    parts.pour = new T.Mesh(new T.CylinderGeometry(.006, .006, 1, 12), icing); grp.add(parts.pour);
    const top = new T.Group(); grp.add(top); const side = new T.Group(); grp.add(side);
    const coat = .003 / k;   // icing thickness in profile units
    const drop = o => o.traverse(m => { if (m.geometry) m.geometry.dispose(); });
    function topCoat(p) { drop(top); top.clear(); if (p <= 0) return; const rmax = s.rt * p, pts = []; for (let q = 0; q <= 22; q++) { const r = rmax * (1 - q / 22); pts.push([r, surfaceY(s, Math.min(r, s.rt)) + coat]); }
      pts[0] = [rmax, surfaceY(s, Math.min(rmax, s.rt)) + coat * .3]; top.add(lathe(pts, icing, topDisp, 96)); }
    function sideCoat(p) { drop(side); side.clear(); const depth = g.spread * s.H * p; if (depth < 1e-3) return; const ya = s.yTop - s.bev - depth, pts = [];
      for (let q = 0; q <= 16; q++) { const y = lerp(ya, s.yTop - s.bev, q / 16); pts.push([rAt(clamp(y, s.y0, s.yTop)) + coat, y]); } side.add(lathe(pts, icing, sideDisp, 96)); }
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), v3 = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    // piped shells: elongated drops laid tangent to a ring (real geometry, icing colour)
    function shellRing(r, y, spacing, len, hgt, wid) { const n = Math.max(8, Math.round(2 * Math.PI * r / spacing)), im = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), icing, n); im.userData.place = [];
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; im.userData.place.push({ a, x: Math.sin(a) * r, y, z: Math.cos(a) * r, sx: wid, sy: hgt, sz: len }); } return im; }
    if (g.border > .005) { const sp = .009, h = clamp(g.border * sp * 1.2, .0012, .006); parts.shells = shellRing((s.rt - s.bev * .35) * k, s.yTop * k + coat * k * .5, sp, sp * .62, h, .0042); grp.add(parts.shells); }
    if (g.foot > .05) { const sp = .01, sz = .0025 + .004 * g.foot; parts.foot = shellRing(s.R * k + sz * .5, s.y0 * k + sz * .6, sp, sp * .6, sz * .8, sz); grp.add(parts.foot); }
    // beads: around the foot, around the top rim, then scattered on the side; set one by one
    const sideArea = 2 * Math.PI * (s.R + s.rt) / 2 * k * s.H * k, nb = Math.round(g.beads * sideArea / (Math.PI * .0045 * .0045));   /* bead count from the covered share of the side */ if (nb > 0) { parts.beads = new T.InstancedMesh(new T.SphereGeometry(.0045, 8, 6), beadM, nb); parts.beads.userData.pos = [];
      for (let i = 0; i < nb; i++) { let a, y; const ring = i % 3; if (ring === 0) { a = i / nb * 6 * Math.PI; y = s.y0 + .02; }
        else if (ring === 1) { a = i / nb * 6 * Math.PI + .5; y = s.yTop - s.bev - .02; }
        else { a = hashf(i) * Math.PI * 2; y = s.y0 + (.1 + .8 * hashf(i + 977)) * s.H; } const r = rAt(y) * k + .004 + ampSide;
        parts.beads.userData.pos.push([Math.sin(a) * r, y * k, Math.cos(a) * r]); }
      grp.add(parts.beads); }
    function showShells(im, u) { if (!im) return; const n = im.count, show = Math.floor(n * u + 1e-9); im.visible = show > 0;
      for (let i = 0; i < n; i++) { const p = im.userData.place[i], f = i < show ? 1 : 0; q4.setFromAxisAngle(up, p.a + Math.PI / 2); m4.compose(v3.set(p.x, p.y, p.z), q4, new T.Vector3(p.sx * f + 1e-6, p.sy * f + 1e-6, p.sz * f + 1e-6)); im.setMatrixAt(i, m4); }
      im.instanceMatrix.needsUpdate = true; }
    function setT(t) { t = clamp(t, 0, 1); grp.userData.t = t; grp.userData.step = stepAt(t);
      if (parts.board) { const u = sst(0, .08, t); parts.board.visible = u > 0; parts.board.position.y = (1 - u) * .05; parts.board.scale.set(.6 + .4 * u, 1, .6 + .4 * u); }
      const lw = .28 / NL; parts.layers.forEach((m, i) => { const a = .08 + i * lw, u = sst(a, a + lw, t); m.visible = u > 0; m.position.y = (1 - u) * .12; });   // dropped in from above, settles
      parts.fills.forEach((f, i) => { const a = .08 + (i + 1) * lw, u = sst(a - lw * .5, a, t); f.visible = u > 0; f.scale.set(.3 + .7 * u, 1, .3 + .7 * u); });
      if (parts.dome) { const u = Math.max(.01, sst(.36, .44, t)); parts.dome.visible = t > .36; parts.dome.scale.y = u; parts.dome.position.y = s.yTop * k * (1 - u); }
      const pu = sst(.44, .58, t), pourOn = t > .44 && t < .58; parts.pour.visible = pourOn;
      if (pourOn) { const yb = topY(G, 0), len = .25 * (1 - .6 * pu); parts.pour.scale.set(1, len, 1); parts.pour.position.y = yb + len / 2; }
      if (grp.userData.pu !== pu) { topCoat(pu); grp.userData.pu = pu; } const su = sst(.58, .72, t); if (grp.userData.su !== su) { sideCoat(su); grp.userData.su = su; }
      showShells(parts.shells, sst(.72, .8, t)); showShells(parts.foot, sst(.8, .86, t));
      if (parts.beads) { const n = parts.beads.count, show = Math.floor(n * sst(.86, 1, t) + 1e-9); parts.beads.visible = show > 0;
        for (let i = 0; i < n; i++) { const p = parts.beads.userData.pos[i], sc = i < show ? 1 : 0; m4.makeScale(sc, sc, sc).setPosition(p[0], p[1], p[2]); parts.beads.setMatrixAt(i, m4); }
        parts.beads.instanceMatrix.needsUpdate = true; } }
    grp.userData.setT = setT; grp.userData.anchors = anchors(G); grp.userData.making = making; setT(opts.t == null ? 1 : opts.t); return grp; }
  return { name: 'cake', genes, groups, stages, making, blank, evaluate, build, anchors,
    // extras (not in the contract): reference selection, colour helpers, surface height for dependants, step label
    named, colours, lab2srgb, srgb2lab, select, targets, target, topY, stepAt, R0, W, DE_SCALE, maskOf, polyMask, GRID };
});
