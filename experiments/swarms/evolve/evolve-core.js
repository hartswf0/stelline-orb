/* evolve-core.js — the evolution itself, shared by the game (browser) and the tests (node). No three.js, no DOM.
   The cake is a genome of numbers in [0,1]. A genome builds a mesh; the mesh is projected from the
   reference's camera and rasterised; fitness compares that picture with targets derived from two film frames (refs.json).
   The neuroglow slice contours drawn over the growing cake come from Watson's neuroglow_v3-plus.html (hartswf0/head-neuroglow),
   and the parametric-genome-plus-breeding loop from his head-evolution.html; here the population is scored against a reference. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.EVO = factory(); })(this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  /* ------------------------------------------------------------------ seeded randomness */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(...xs) { let h = 2166136261; for (const x of xs) { h ^= (x | 0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  /* ------------------------------------------------------------------ genomes: [key, group, label, blank value] */
  const CAKE_GENES = [
    ['h', 'BASE', 'HEIGHT', 0], ['taper', 'BASE', 'TAPER', .5], ['plate', 'BASE', 'BOARD', 0],
    ['tiers', 'FORM', 'LAYERS', 0], ['dome', 'FORM', 'DOME', 0], ['bevel', 'FORM', 'EDGE', .5],
    ['sideR', 'SPONGE', 'SPONGE RED', .5], ['sideG', 'SPONGE', 'SPONGE GREEN', .5], ['sideB', 'SPONGE', 'SPONGE BLUE', .5], ['shade', 'SPONGE', 'LIGHT FALLOFF', .3],
    ['topR', 'ICING', 'ICING RED', .5], ['topG', 'ICING', 'ICING GREEN', .5], ['topB', 'ICING', 'ICING BLUE', .5], ['fill', 'ICING', 'FILLING', 0],
    ['beads', 'DECORATION', 'BEADS', 0]];
  const KIND = { cake: CAKE_GENES };
  const groupsOf = kind => [...new Set(KIND[kind].map(g => g[1]))];
  const blank = kind => KIND[kind].map(g => g[3]);
  const named = (kind, G) => { const o = {}; KIND[kind].forEach((g, i) => o[g[0]] = G[i]); return o; };
  /* ------------------------------------------------------------------ the cake: a lathe profile, with layers, board, icing, beads */
  const CN = 64;
  function cakeProfile(G) {  // returns [r, y, part] from the bottom centre up to the top centre; radius 0.5 = the body
    const g = named('cake', G), H = lerp(.08, .62, g.h), R = .5, rt = R * lerp(.8, 1.12, g.taper), bev = lerp(.0, .35, g.bevel) * Math.min(rt, H), dome = g.dome * Math.min(R, H * 1.2);
    const pts = [], pr = R + g.plate * .1, ph = g.plate * .05;
    pts.push([0, -ph, 'board'], [pr, -ph, 'board'], [pr, 0, 'board'], [R, 0, 'side']);
    const side = 12; for (let s = 1; s <= side; s++) { const u = s / side, y = u * (H - bev); pts.push([lerp(R, rt, u * (H - bev) / H), y, 'side']); }
    for (let s = 1; s <= 6; s++) { const a = s / 6 * Math.PI / 2; pts.push([rt - bev + bev * Math.cos(a), H - bev + bev * Math.sin(a), 'top']); }
    const rr = rt - bev; for (let s = 1; s <= 10; s++) { const u = s / 10; pts.push([rr * (1 - u), H + dome * Math.sin(u * Math.PI / 2), 'top']); }
    return { pts, H, g };
  }
  function cakeMesh(G) { const { pts, H, g } = cakeProfile(G), n = pts.length, P = new Float32Array(n * (CN + 1) * 3); let k = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j <= CN; j++) { const a = j / CN * Math.PI * 2; P[k++] = Math.sin(a) * pts[i][0]; P[k++] = pts[i][1]; P[k++] = Math.cos(a) * pts[i][0]; }
    return { P, rows: n, cols: CN + 1, parts: pts.map(p => p[2]), H, g, colours: cakeColours(g) }; }
  function cakeColours(g) { const c = (r, gg, b) => [r * 255, gg * 255, b * 255];
    const side = c(g.sideR, g.sideG, g.sideB), top = c(g.topR, g.topG, g.topB);
    return { side, top, fill: top.map(v => v * .9), bead: side.map(v => v * .35), board: side.map(v => v * .45) }; }
  /* ------------------------------------------------------------------ projection and rasterisation from the reference camera */
  function project(mesh, elevDeg) { const e = (elevDeg || 0) * Math.PI / 180, ce = Math.cos(e), se = Math.sin(e), P = mesh.P, n = P.length / 3, S = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; S[i * 3] = x; S[i * 3 + 1] = -(y * ce - z * se); S[i * 3 + 2] = z * ce + y * se; } return S; }  // screen x right, y down, depth toward camera
  function bbox(S) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < S.length; i += 3) { x0 = Math.min(x0, S[i]); x1 = Math.max(x1, S[i]); y0 = Math.min(y0, S[i + 1]); y1 = Math.max(y1, S[i + 1]); } return { x0, x1, y0, y1 }; }
  function grid(W, H, X0, X1, Y0, Y1) { return { W, H, X0, X1, Y0, Y1, m: new Uint8Array(W * H), z: new Float32Array(W * H).fill(-1e9), c: new Int16Array(W * H).fill(-1) }; }
  function tri(gr, ax, ay, az, bx, by, bz, cx, cy, cz, col) {   // coordinates already in grid units
    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(gr.W - 1, Math.ceil(Math.max(ax, bx, cx))), minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(gr.H - 1, Math.ceil(Math.max(ay, by, cy)));
    const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-9) return;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) { const px = x + .5, py = y + .5;
      const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d, w2 = 1 - w0 - w1;
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue; const i = y * gr.W + x; gr.m[i] = 1; const z = w0 * az + w1 * bz + w2 * cz; if (z > gr.z[i]) { gr.z[i] = z; gr.c[i] = col; } } }
  function rasterMesh(mesh, S, gr, norm, colOf) { const { rows, cols } = mesh, sx = gr.W / (gr.X1 - gr.X0), sy = gr.H / (gr.Y1 - gr.Y0);
    const X = i => ((S[i * 3] - norm.cx) / norm.s - gr.X0) * sx, Y = i => ((S[i * 3 + 1] - norm.top) / norm.s - gr.Y0) * sy, Z = i => S[i * 3 + 2];
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) { const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1, col = colOf ? colOf(r, c) : 0;
      tri(gr, X(a), Y(a), Z(a), X(d), Y(d), Z(d), X(b), Y(b), Z(b), col); tri(gr, X(b), Y(b), Z(b), X(d), Y(d), Z(d), X(e), Y(e), Z(e), col); } }
  function rasterPoly(poly, gr) { const sx = gr.W / (gr.X1 - gr.X0), sy = gr.H / (gr.Y1 - gr.Y0), m = new Uint8Array(gr.W * gr.H);
    for (let y = 0; y < gr.H; y++) { const py = gr.Y0 + (y + .5) / sy; for (let x = 0; x < gr.W; x++) { const px = gr.X0 + (x + .5) / sx; let ins = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins; } m[y * gr.W + x] = ins ? 1 : 0; } } return m; }
  function iou(a, b) { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; }
  /* ------------------------------------------------------------------ fitness */
  const CAKE_GRID = [88, 48, -.55, .55, 0, .6];
  const W_CAKE = { iou: .6, hist: .4, emdScale: .4 };
  const cache = new WeakMap();
  function refMask(ref, kind) { let c = cache.get(ref); if (!c) { c = {}; cache.set(ref, c); } if (!c[kind]) { const gr = grid(...CAKE_GRID); c[kind] = rasterPoly(ref[kind].outline, gr); } return c[kind]; }
  const BINS = 6;
  const lightK = (g, lit) => .06 + 1.1 * Math.pow(lit, lerp(.6, 3, g.shade));   // how fast the candle light falls off round the side (gene LIGHT FALLOFF)
  function evalCake(G, ref) { const mesh = cakeMesh(G), S = project(mesh, ref.cake.elevationDeg), bb = bbox(S), s = bb.x1 - bb.x0, norm = { cx: (bb.x0 + bb.x1) / 2, top: bb.y0, s };
    const gr = grid(...CAKE_GRID), parts = mesh.parts, g = mesh.g, H = mesh.H, layers = 1 + Math.round(g.tiers * 2);
    const pal = [mesh.colours.side, mesh.colours.top, mesh.colours.fill, mesh.colours.bead, mesh.colours.board];
    // each cell gets a part (0 sponge, 1 icing, 2 filling, 3 bead, 4 board) and a light level: the candles light it from above, the side falls off away from us
    rasterMesh(mesh, S, gr, norm, (r, c) => { const p = parts[r], a = (c + .5) / CN * Math.PI * 2, face = Math.max(0, Math.cos(a)), y = clamp(mesh.P[(r * mesh.cols) * 3 + 1] / H, 0, 1);
      const sh = q => q + 8 * Math.round(clamp(p === 'top' ? .85 + .15 * face : (.18 + .82 * Math.pow(face, .8)) * (.55 + .45 * y), 0, 1) * 15);
      if (p === 'board') return sh(4); if (p === 'top') return sh(1);
      if (y > 1 - (.04 + .1 * g.fill)) return sh(1);                                         // icing creeps over the top edge
      for (let L = 1; L < layers; L++) if (Math.abs(y - L / layers) < .035 + .05 * g.fill) return sh(2);   // filling lines between layers
      if (((hash(r, c) % 1000) / 1000) < g.beads * .22) return sh(3); return sh(0); });
    const I = iou(gr.m, refMask(ref, 'cake')), MB = 32, mg = [new Float64Array(MB), new Float64Array(MB), new Float64Array(MB)], h3 = new Float64Array(BINS ** 3); let n = 0;
    for (let i = 0; i < gr.m.length; i++) if (gr.m[i] && gr.c[i] >= 0) { const lit = lightK(g, (gr.c[i] >> 3) / 15), c = pal[gr.c[i] & 7];
      { const f = c.map(v => clamp(v * lit * BINS / 256 - .5, 0, BINS - 1)), lo = f.map(x => Math.min(BINS - 2, Math.floor(x))), t = f.map((x, k) => x - lo[k]);   // joint 6x6x6 soft histogram, as in extract-refs.py
        for (let d = 0; d < 8; d++) { const dr = d >> 2 & 1, dg = d >> 1 & 1, db = d & 1; h3[((lo[0] + dr) * BINS + lo[1] + dg) * BINS + lo[2] + db] += (dr ? t[0] : 1 - t[0]) * (dg ? t[1] : 1 - t[1]) * (db ? t[2] : 1 - t[2]); } }
      for (let ch = 0; ch < 3; ch++) { const v = clamp(c[ch] * lit, 0, 255) * MB / 256 - .5, lo = clamp(Math.floor(v), 0, MB - 1), hi = Math.min(MB - 1, lo + 1), t = clamp(v - lo, 0, 1); mg[ch][lo] += 1 - t; mg[ch][hi] += t; } n++; }
    // colour distance: per-channel 1-D earth mover's distance between the form's colours and the reference's, averaged, in units of the full 0..255 range
    let emd = 0; const RM = ref.cake.marginals; for (let ch = 0; ch < 3; ch++) { let ca = 0, cb = 0; for (let b = 0; b < MB; b++) { ca += n ? mg[ch][b] / n : 0; cb += RM[ch][b]; emd += Math.abs(ca - cb) / MB; } } emd /= 3;
    // the joint histogram's Hellinger distance catches wrong hues that the per-channel marginals let through (a pink top on a brown cake)
    let bc = 0; const RH = ref.cake.hist; for (let i = 0; i < h3.length; i++) bc += Math.sqrt((n ? h3[i] / n : 0) * RH[i]); const helJ = Math.sqrt(Math.max(0, 1 - bc));
    const hel = .7 * Math.min(1, emd / W_CAKE.emdScale) + .3 * helJ;
    const fit = 1 - (W_CAKE.iou * (1 - I) + W_CAKE.hist * hel);
    return { fit, iou: I, hist: hel, emd, helJ, mask: gr.m, grid: CAKE_GRID };
  }
  const evaluate = (kind, G, ref) => evalCake(G, ref);
  /* ------------------------------------------------------------------ one generation: lambda children around the parent, elitist (1 + lambda) */
  const LAMBDA = 8, THRESH = { cake: .86 };
  // the making, in order: each evolved stage is set when the whole-cake match reaches its bar; then the hand-made stages
  const STAGES = [['BASE', 'iou', .85], ['FORM', 'iou', .94], ['SPONGE', 'fit', .78], ['ICING', 'fit', .84], ['DECORATION', 'fit', .87]];
  // which genes a generation may change: the selected stage's genes fully, the stages already made a little (so a later stage can refine an earlier one), later stages not at all
  const ORDER = ['BASE', 'FORM', 'SPONGE', 'ICING', 'DECORATION'];
  function weights(kind, group, bias) { const gs = KIND[kind], gi = ORDER.indexOf(group); const inG = gs.map(g => group === 'ALL' || g[1] === group); const idx = gs.map((g, i) => i).filter(i => inG[i]);
    return gs.map((g, i) => { if (!inG[i]) return gi > 0 && ORDER.indexOf(g[1]) < gi ? .35 : 0; return (bias > 0 && idx[(bias - 1) % idx.length] === i) ? 1.6 : bias > 0 ? .35 : 1; }); }
  // each stage is selected on its own measure: the shape stages on silhouette overlap alone (colour is not theirs to change), the colour stages on the whole match
  const MEASURE = { BASE: 'iou', FORM: 'iou', SPONGE: 'fit', ICING: 'fit', DECORATION: 'fit', ALL: 'fit' };
  const scoreOf = (e, m) => m === 'iou' ? e.iou : e.fit;
  function breed(kind, parent, opts, ref) {   // opts: { seed, gen, sigma, group, bias }; elitist: the parent survives unless a child scores higher on the stage's measure
    const r = mulberry32(hash(opts.seed, opts.gen, 2)), grp = opts.group || 'ALL', m = MEASURE[grp], w = weights(kind, grp, opts.bias || 0), kids = [];
    const pe = evaluate(kind, parent.G, ref), ps = scoreOf(pe, m);
    for (let c = 0; c < LAMBDA; c++) { const G = parent.G.map((v, i) => w[i] ? clamp(v + opts.sigma * w[i] * gauss(r) * (c < LAMBDA / 2 ? 1 : .35), 0, 1) : v); const e = evaluate(kind, G, ref); kids.push({ G, fit: e.fit, iou: e.iou, score: scoreOf(e, m), e }); }
    let best = { G: parent.G, fit: pe.fit, iou: pe.iou, score: ps }, bi = -1; kids.forEach((k, i) => { if (k.score > best.score) { best = k; bi = i; } });
    return { kids, best: { G: best.G, fit: best.fit, iou: best.iou, score: best.score }, bestIndex: bi, measure: m, parentScore: ps };
  }
  function start(kind, ref) { const G = blank(kind), e = evaluate(kind, G, ref); return { G, fit: e.fit, iou: e.iou }; }
  /* ------------------------------------------------------------------ slices, for the neuroglow look: where planes cut the mesh (line segments) */
  function slices(mesh, axis, count) { const { P, rows, cols } = mesh, ax = axis === 'x' ? 0 : axis === 'y' ? 1 : 2; let lo = 1e9, hi = -1e9;
    for (let i = ax; i < P.length; i += 3) { lo = Math.min(lo, P[i]); hi = Math.max(hi, P[i]); }
    const out = [], lev = []; for (let k = 1; k <= count; k++) lev.push(lerp(lo, hi, k / (count + 1)));
    const cut = (a, b, c, L) => { const va = P[a * 3 + ax] - L, vb = P[b * 3 + ax] - L, vc = P[c * 3 + ax] - L, s = [];
      const edge = (p, q, vp, vq) => { if ((vp < 0) !== (vq < 0)) { const t = vp / (vp - vq); s.push(lerp(P[p * 3], P[q * 3], t), lerp(P[p * 3 + 1], P[q * 3 + 1], t), lerp(P[p * 3 + 2], P[q * 3 + 2], t)); } };
      edge(a, b, va, vb); edge(b, c, vb, vc); edge(c, a, vc, va); if (s.length === 6) out.push(...s); };
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) { const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      for (const L of lev) { cut(a, d, b, L); cut(b, d, e, L); } }
    return new Float32Array(out); }
  function indices(rows, cols) { const I = []; for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) { const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1; I.push(a, b, d, b, e, d); } return I; }   // wound so that three.js faces point outward
  return { lightK, KIND, groupsOf, blank, named, cakeMesh, project, evaluate, breed, start, weights, slices, indices, mulberry32, hash, LAMBDA, THRESH, STAGES, MEASURE, W_CAKE, CAKE_GRID };
});
