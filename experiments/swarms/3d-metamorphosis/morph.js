/* morph.js: the cake as one continuous surface that metamorphoses (SCION 7, Peter Foldes, drawn metamorphosis, in 3D).
   Shared by index.html (the game) and tests.js (node). No dependencies.

   Primitives (named as in the technique prompt):
   - KEY FORMS: every cake stage is the same vertex topology, a radial grid of NU profile rows x NT angular columns,
     closed at the axis at the bottom centre (u = 0) and the top centre (u = 1).
   - POINT CORRESPONDENCES: three landmarks on every profile, at fixed grid rows: the bottom centre (u = 0), the foot of the
     side (u = 0.15, row 6), the top rim (u = 0.55, row 22); the top cap is parameterised linearly in radius, so a point
     on the cap keeps its radius fraction across every key. Columns are fixed angles. Vertex (i, j) is the same point of
     the cake in every key.
   - IN-BETWEEN FIELDS: each transition has a field that delays the change by row: RISE (the base changes first, as a
     bake rises), POUR (the top changes first, as icing or ganache runs down), EVEN.
   - PACING: the curve from the knurl's step to the transition's progress (tri ring): EVEN, EASE, LINGER, LEAN.
   - DISCONTINUITY MARKERS: a transition between two of the film's cakes is a CUT (hard cut or 3-frame silver decay, as in
     the film); it is never interpolated, and is flagged in the trace.
   Units: metres, radians. Time base: machine steps (11.8 per second). */
(function (root) {
  'use strict';
  const NU = 41, NT = 64, STEPS = 12, TAU = Math.PI * 2;
  const U = i => i / (NU - 1), TH = j => j / NT * TAU;
  const ROW_FOOT = 6, ROW_RIM = 22;           // u = 0.15 and u = 0.55
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sstep = t => t * t * (3 - 2 * t);
  const hex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------------------------------------------------------------- THE KEY FORMS
     Each key: Rb base radius, Rt top radius, H rim height, bulge (side swell), swell (rim bead of icing),
     crown(rho) cap height above the rim at radius fraction rho, lump (angular unevenness of hand-shaped dough),
     colours, beads (the film's coloured dots on the side, 0..1), level (how far into the making), kind ('stage' | 'film'). */
  const KEYS = {
    DOUGH:        { label: 'DOUGH', level: 0, kind: 'stage', Rb: .074, Rt: .062, H: .026, bulge: .016, swell: 0, crown: r => .034 * Math.pow(1 - r * r, .55), lump: .11,
                    side: 0xe7d3a6, top: 0xeedcb4, base: 0xcdb48a, crumb: .05, beads: 0 },
    SPONGE:       { label: 'SPONGE DISC', level: 1, kind: 'stage', Rb: .118, Rt: .116, H: .042, bulge: .002, swell: 0, crown: r => .005 * (1 - r * r), lump: .012,
                    side: 0xcf9548, top: 0xb9772f, base: 0x8a5a26, crumb: .12, beads: 0 },
    DOMED:        { label: 'DOMED SPONGE', level: 1, kind: 'stage', Rb: .118, Rt: .116, H: .05, bulge: .002, swell: 0, crown: r => .042 * Math.pow(1 - r * r, .7), lump: .012,
                    side: 0xcf9548, top: 0xa86a2a, base: 0x8a5a26, crumb: .12, beads: 0 },
    LAYERED:      { label: 'LAYERED', level: 2, kind: 'stage', Rb: .12, Rt: .12, H: .095, bulge: 0, swell: 0, crown: r => .002 * (1 - r * r), lump: .006,
                    side: 0xd29b52, top: 0xf0e4c8, base: 0x8a5a26, crumb: .1, layers: 0xf3ead2, beads: 0 },
    ICED:         { label: 'ICED', level: 3, kind: 'stage', Rb: .122, Rt: .121, H: .096, bulge: .001, swell: .004, crown: r => .003 * (1 - r * r), lump: 0,
                    side: 0xf1ebdc, top: 0xf6f1e4, base: 0xe2dccb, crumb: .02, beads: 0 },
    CHOC_ORANGE:  { label: 'CHOCOLATE, ORANGE TOP', level: 4, kind: 'film', Rb: .121, Rt: .12, H: .095, bulge: .001, swell: .003, crown: r => .003 * (1 - r * r), lump: 0,
                    side: 0x3b2014, top: 0xd9782c, base: 0x2a160d, crumb: .03, beads: 1 },
    MINT:         { label: 'MINT', level: 4, kind: 'film', Rb: .121, Rt: .12, H: .095, bulge: .001, swell: .003, crown: r => .003 * (1 - r * r), lump: 0,
                    side: 0x8fd0bd, top: 0xc5ecdf, base: 0x6aa996, crumb: .03, beads: 1 },
    RED_ORANGE:   { label: 'RED-ORANGE', level: 4, kind: 'film', Rb: .121, Rt: .12, H: .095, bulge: .001, swell: .003, crown: r => .003 * (1 - r * r), lump: 0,
                    side: 0xb3412a, top: 0xe46c3c, base: 0x7d2c1c, crumb: .03, beads: 1 },
    BROWN_DOME:   { label: 'BROWN DOME', level: 4, kind: 'film', Rb: .121, Rt: .12, H: .05, bulge: .001, swell: 0, crown: r => .05 * Math.pow(1 - r * r, .5), lump: 0,
                    side: 0x6a4326, top: 0x7d5230, base: 0x4a2e1a, crumb: .03, beads: 0 },
    SPONGE_BEADS: { label: 'SPONGE, WHITE BEADS', level: 4, kind: 'film', Rb: .121, Rt: .12, H: .1, bulge: .001, swell: .003, crown: r => .003 * (1 - r * r), lump: 0,
                    side: 0xe2c286, top: 0xf1dca9, base: 0xb39661, crumb: .05, beads: 1, beadsWhite: true }
  };
  const ORDER = ['DOUGH', 'SPONGE', 'DOMED', 'LAYERED', 'ICED', 'CHOC_ORANGE', 'MINT', 'RED_ORANGE', 'BROWN_DOME', 'SPONGE_BEADS'];
  const FILM = ORDER.filter(k => KEYS[k].kind === 'film');
  /* The making grammar: which key can follow which, and the field of the change. Film cakes reach each other by CUT only. */
  const EDGES = {
    DOUGH: { SPONGE: 'RISE', DOMED: 'RISE' },
    SPONGE: { LAYERED: 'RISE' },
    DOMED: { BROWN_DOME: 'POUR', LAYERED: 'RISE' },
    LAYERED: { ICED: 'POUR', CHOC_ORANGE: 'POUR' },
    ICED: { MINT: 'POUR', RED_ORANGE: 'POUR', SPONGE_BEADS: 'POUR', BROWN_DOME: 'POUR' }
  };
  FILM.forEach(a => { EDGES[a] = {}; FILM.forEach(b => { if (a !== b) EDGES[a][b] = 'CUT'; }); });
  const PACES = [
    { name: 'EVEN', f: t => t },
    { name: 'EASE', f: t => sstep(t) },
    { name: 'LINGER', f: t => sstep(sstep(t)) },            // holds each shape longest at both ends
    { name: 'LEAN', f: t => 1 - Math.pow(1 - t, 1.6) }      // the change is felt at once, then settles
  ];

  /* ---------------------------------------------------------------- BUILD A KEY: positions (r, y per vertex) and colours */
  function profile(K, u) {        // returns [r, y, region] on the base angle; region 0 base, 1 side, 2 cap
    if (u <= .15) { const s = u / .15; return [K.Rb * s, 0, 0]; }
    if (u <= .55) { const s = (u - .15) / .4;
      const r = lerp(K.Rb, K.Rt, s) + K.bulge * Math.sin(Math.PI * s) + K.swell * Math.exp(-Math.pow((s - .93) / .07, 2));
      return [r, K.H * s, 1]; }
    const s = (u - .55) / .45, rho = 1 - s; return [K.Rt * rho, K.H + K.crown(rho), 2];
  }
  function lumpAt(K, u, th) {     // the hand's unevenness: low angular harmonics, zero at the axis
    if (!K.lump) return 0; const w = Math.sin(Math.PI * u);
    return K.lump * w * (.5 * Math.sin(2 * th + 1.1) + .32 * Math.sin(3 * th + 2.3) + .22 * Math.sin(5 * th + .4) + .12 * Math.sin(7 * th + 4 * u));
  }
  function colourAt(K, u, th, y, region, i, j) {
    let c = region === 0 ? hex(K.base) : region === 1 ? hex(K.side) : hex(K.top);
    if (region === 1 && K.layers) { const band = Math.floor(y / K.H * 5); if (band % 2 === 1) c = hex(K.layers); }
    if (region === 2 && u < .6) c = mix3(c, hex(K.side), (.6 - u) / .05 * .5);   // the cap meets the side
    const n = (hash(i, j) - .5) * K.crumb; return [clamp(c[0] + n, 0, 1), clamp(c[1] + n, 0, 1), clamp(c[2] + n * .8, 0, 1)];
  }
  const CACHE = {};
  function key(name) {
    if (CACHE[name]) return CACHE[name]; const K = KEYS[name]; const n = NU * NT, R = new Float64Array(n), Y = new Float64Array(n), C = new Float64Array(n * 3);
    for (let i = 0; i < NU; i++) { const u = U(i); for (let j = 0; j < NT; j++) { const th = TH(j), [r, y, reg] = profile(K, u), k = i * NT + j;
      R[k] = r * (1 + lumpAt(K, u, th)); Y[k] = y * (reg === 2 ? 1 + .6 * lumpAt(K, u, th + 1) : 1); const c = colourAt(K, u, th, y, reg, i, j); C[k * 3] = c[0]; C[k * 3 + 1] = c[1]; C[k * 3 + 2] = c[2]; } }
    return (CACHE[name] = { name, R, Y, C, beads: K.beads, beadsWhite: !!K.beadsWhite, K });
  }

  /* ---------------------------------------------------------------- IN-BETWEENS: one field over the rows, one pacing curve */
  const FIELD_SPAN = .32;
  function fieldT(field, T, u) {
    if (field === 'RISE') return clamp((T - FIELD_SPAN * u) / (1 - FIELD_SPAN), 0, 1);
    if (field === 'POUR') return clamp((T - FIELD_SPAN * (1 - u)) / (1 - FIELD_SPAN), 0, 1);
    return T;
  }
  /* The surface at step k of N (0..N) from key a to key b. For a CUT the surface is a until the middle step, then b. */
  function between(a, b, step, N, paceIx, out) {
    const A = key(a), B = key(b), field = (EDGES[a] && EDGES[a][b]) || 'EVEN', n = NU * NT;
    out = out || { R: new Float64Array(n), Y: new Float64Array(n), C: new Float64Array(n * 3), beads: 0, cut: false };
    const T = PACES[paceIx || 0].f(clamp(step / N, 0, 1));
    if (field === 'CUT') { const S = step >= N / 2 ? B : A; out.R.set(S.R); out.Y.set(S.Y); out.C.set(S.C); out.beads = S.beads; out.beadsWhite = S.beadsWhite; out.cut = true; out.T = step >= N / 2 ? 1 : 0; return out; }
    for (let i = 0; i < NU; i++) { const t = fieldT(field, T, U(i)); for (let j = 0; j < NT; j++) { const k = i * NT + j;
      out.R[k] = lerp(A.R[k], B.R[k], t); out.Y[k] = lerp(A.Y[k], B.Y[k], t);
      out.C[k * 3] = lerp(A.C[k * 3], B.C[k * 3], t); out.C[k * 3 + 1] = lerp(A.C[k * 3 + 1], B.C[k * 3 + 1], t); out.C[k * 3 + 2] = lerp(A.C[k * 3 + 2], B.C[k * 3 + 2], t); } }
    // the beads grow out of the side as the change passes their height
    const tb = fieldT(field, T, .35); out.beads = lerp(A.beads, B.beads, tb); out.beadsWhite = tb < .5 ? A.beadsWhite : B.beadsWhite; out.cut = false; out.T = T; return out;
  }

  /* ---------------------------------------------------------------- READING THE SURFACE: positions, anchors, volume */
  function xyz(S, k) { const j = k % NT, th = TH(j); return [S.R[k] * Math.cos(th), S.Y[k], S.R[k] * Math.sin(th)]; }
  // a point given by surface parameters (u, theta): bilinear in the grid, so it rides every metamorphosis
  function at(S, u, th) {
    const fi = clamp(u, 0, 1) * (NU - 1), i0 = Math.min(NU - 2, Math.floor(fi)), fu = fi - i0;
    const fj = ((th / TAU * NT) % NT + NT) % NT, j0 = Math.floor(fj) % NT, j1 = (j0 + 1) % NT, fv = fj - Math.floor(fj);
    const g = (i, j) => [S.R[i * NT + j], S.Y[i * NT + j]];
    const p00 = g(i0, j0), p01 = g(i0, j1), p10 = g(i0 + 1, j0), p11 = g(i0 + 1, j1);
    const r = lerp(lerp(p00[0], p01[0], fv), lerp(p10[0], p11[0], fv), fu), y = lerp(lerp(p00[1], p01[1], fv), lerp(p10[1], p11[1], fv), fu);
    return [r * Math.cos(th), y, r * Math.sin(th)];
  }
  // the seven candles: on the cap at fixed radius fractions (the inner and outer ring of the film's cake), fixed angles
  const CANDLES = Array.from({ length: 7 }, (_, k) => { const rho = k % 2 ? .052 / .12 : .088 / .12; return { u: .55 + .45 * (1 - rho), th: k / 7 * TAU + .3 }; });
  // the beads: the film's coloured dots, fixed points of the side
  const BEADS = Array.from({ length: 84 }, (_, k) => ({ u: .18 + .34 * (((k * 37) % 84) / 84), th: k * 2.39996 % TAU, c: k % 5 }));
  function volume(S) { let v = 0;
    for (let i = 0; i < NU - 1; i++) for (let j = 0; j < NT; j++) { const j1 = (j + 1) % NT, a = xyz(S, i * NT + j), b = xyz(S, (i + 1) * NT + j), c = xyz(S, (i + 1) * NT + j1), d = xyz(S, i * NT + j1);
      v += tri6(a, b, c) + tri6(a, c, d); }
    return Math.abs(v); }
  function tri6(a, b, c) { return (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; }
  function faceNormals(S) { const out = []; for (let i = 0; i < NU - 1; i++) for (let j = 0; j < NT; j++) { const j1 = (j + 1) % NT, a = xyz(S, i * NT + j), b = xyz(S, (i + 1) * NT + j), c = xyz(S, (i + 1) * NT + j1), d = xyz(S, i * NT + j1);
      [[a, b, c], [a, c, d]].forEach(([p, q, r]) => { const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
        const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(n[0], n[1], n[2]); out.push(l < 1e-10 ? null : [n[0] / l, n[1] / l, n[2] / l]); }); }
    return out; }
  // per angular column, the profile polygon closed through the axis: signed area (orientation) and self-intersections
  function profileCheck(S) { let minArea = Infinity, crossings = 0, negR = 0;
    for (let j = 0; j < NT; j++) { const P = []; for (let i = 0; i < NU; i++) { const k = i * NT + j; P.push([S.R[k], S.Y[k]]); if (S.R[k] < -1e-9) negR++; }
      let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } minArea = Math.min(minArea, a / 2);
      for (let s = 0; s < P.length - 1; s++) for (let t = s + 2; t < P.length - 1; t++) if (segX(P[s], P[s + 1], P[t], P[t + 1])) crossings++; }
    return { minArea, crossings, negR }; }
  function segX(p, q, r, s) { const o = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const d1 = o(r, s, p), d2 = o(r, s, q), d3 = o(p, q, r), d4 = o(p, q, s); return ((d1 > 1e-14 && d2 < -1e-14) || (d1 < -1e-14 && d2 > 1e-14)) && ((d3 > 1e-14 && d4 < -1e-14) || (d3 < -1e-14 && d4 > 1e-14)); }
  // a 2D silhouette of the profile (radius as a function of height, max over columns) for the identity measure
  function profileDist(S1, S2) { let d = 0, m = 0; for (let k = 0; k < NU * NT; k++) { d += Math.hypot(S1.R[k] - S2.R[k], S1.Y[k] - S2.Y[k]); m++; } return d / m; }

  const API = { NU, NT, STEPS, TAU, KEYS, ORDER, FILM, EDGES, PACES, CANDLES, BEADS, ROW_FOOT, ROW_RIM, key, between, at, xyz, volume, faceNormals, profileCheck, profileDist, U, TH, hex };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.MORPH = API;
})(typeof window !== 'undefined' ? window : globalThis);
