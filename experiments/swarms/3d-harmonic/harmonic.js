/* harmonic.js — the pure core of HARMONIC CAKE: the gear train, the pass paths, the pattern score, the cake's surface, the game's stages.
   No three.js, no DOM: the page (index.html) and the node tests (tests.js) both load this file, so what the tests check is what the page draws.
   Units are metres in the cake's own frame: y up from the cake board, the cake's axis at x = z = 0; azimuth psi = atan2(z, x).
   Time base: the master shaft. One master revolution = 24 gear-train steps (the machine's clicks); the gear angles are exact rational functions of the
   integer sample counter k, computed with integer remainders, so a closed pass returns to its first sample exactly, not approximately. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  // the cake (sponge, then a 3 mm coat of cream with a rounded top edge)
  const CAKE = { R: 0.12, H: 0.087, coat: 0.003, bevel: 0.006 };
  CAKE.Rc = CAKE.R + CAKE.coat; CAKE.Hc = CAKE.H + CAKE.coat;
  const MARGIN = 0.0003;                   // a tube's centre sits this far beyond touching the cream
  const STEPS_PER_REV = 24;                // gear-train teeth per master revolution: one click each
  const PHASE_DET = 24;                    // phase detents per turn (15 degrees each)
  // the knurled ring's detents: gear ratios relative to the master shaft, in rational steps
  const RATIOS = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [1, 1], [5, 4], [4, 3], [3, 2], [5, 3], [7, 4], [2, 1], [5, 2], [3, 1], [7, 2], [4, 1], [9, 2], [5, 1], [6, 1],
    [13, 2], [7, 1], [8, 1], [9, 1], [10, 1], [12, 1], [16, 1], [18, 1], [24, 1], [28, 1], [32, 1], [36, 1]];
  const R11 = 5;                           // index of 1:1
  const RANGE = { t: [0, 15], a: [0, RATIOS.length - 1], n: [0, RATIOS.length - 1] };   // the turntable gear stops at 4:1: a cake does not spin faster than its icing
  const GEARS = ['t', 'a', 'n'];           // turntable, piping arm, nozzle
  const GEAR_NAMES = { t: 'TURNTABLE', a: 'PIPING ARM', n: 'NOZZLE' };
  const gcd = (a, b) => b ? gcd(b, a % b) : a, lcm = (a, b) => a / gcd(a, b) * b;
  const ratioOf = ri => RATIOS[Math.max(0, Math.min(RATIOS.length - 1, ri))];
  const ratioText = ri => { const [p, q] = ratioOf(ri); return p + ':' + q; };
  // exact gear angle at sample k of S samples per master revolution: 2 pi (p k / (q S)) + phase, the fraction taken by integer remainder
  function gearAngle(ri, ph, k, S) { const [p, q] = ratioOf(ri); return TAU * ((p * k) % (q * S)) / (q * S) + ph * TAU / PHASE_DET; }
  // master revolutions until every gear is back where it started: the lcm of the ratios' denominators
  function passRevs(g) { return GEARS.reduce((L, id) => lcm(L, ratioOf(g[id].ri)[1]), 1); }
  // ------------------------------------------------------------------ the stages: what the machine makes, in order, and the film cake they head toward
  // kinds: 'side' (path on the cream wall), 'top' (on the top), 'candles' (stops where the nozzle comes down), auto stages run without a pattern
  const STAGES = [
    { id: 'SPONGE', auto: true, revs: 2, say: 'TWO SPONGE LAYERS RISE ON THE TURNTABLE' },
    { id: 'COAT', auto: true, revs: 1, say: 'THE CREAM COAT IS SPREAD AS THE CAKE TURNS' },
    { id: 'BASE BEADS', kind: 'side', y0: 0.0058, A: 0, e: 0, r0: 0.0052, prof: 'bead', need: ['t', 'n'], target: { t: [R11, 0], a: [R11, 0], n: [27, 0] }, say: 'A RING OF BEADS AT THE FOOT' },
    { id: 'TOP SHELLS', kind: 'top', rho0: 0.106, A: 0, e: 0.0045, r0: 0.0036, prof: 'shell', need: ['t', 'n'], target: { t: [R11, 0], a: [R11, 0], n: [30, 0] }, say: 'SHELLS AROUND THE TOP EDGE' },
    { id: 'SIDE LATTICE', kind: 'side', y0: 0.047, A: 0.016, e: 0, r0: 0.0021, prof: 'const', need: ['t', 'a'], target: { t: [R11, 0], a: [19, 6], n: [R11, 0] }, say: 'A CROSSING GARLAND ROUND THE SIDE' },
    { id: 'INSCRIPTION', auto: true, say: '生日快乐, STROKE BY STROKE, THEN THE FLOURISH' },
    { id: 'CANDLES', kind: 'candles', rhoC: 0.074, A: 0.018, need: ['t', 'a', 'n'], target: { t: [R11, 0], a: [R11, 6], n: [20, 0] }, say: 'SEVEN CANDLES SET WHERE THE NOZZLE COMES DOWN' },
    { id: 'LIGHT', auto: true, revs: 1, say: 'THE CANDLES LIT AS THEY PASS THE MATCH' },
    { id: 'BLOW', auto: true, say: 'BLOW THEM OUT' }];
  const REFERENCE = 'SPONGE, WHITE BEADS (the cake on the table, film 2:35)';
  // tube radius profile along a pass: beads swell and pinch with the nozzle; shells pulse with its orbit
  function tubeR(def, nu) { if (def.prof === 'bead') { const s = Math.abs(Math.cos(nu / 2)); return def.r0 * (0.3 + 0.7 * Math.sqrt(s)); }
    if (def.prof === 'shell') return def.r0 * (0.62 + 0.38 * Math.cos(nu)); return def.r0; }
  // one sample of a pass: centre (x,y,z), tube radius r, surface normal (nx,ny,nz) at the contact, and the head's world-frame data
  function sampleAt(def, g, k, S) {
    const th = gearAngle(g.t.ri, g.t.ph, k, S), al = gearAngle(g.a.ri, g.a.ph, k, S), nu = gearAngle(g.n.ri, g.n.ph, k, S);
    const psi = th, c = Math.cos(psi), s = Math.sin(psi);
    if (def.kind === 'side') { const r = tubeR(def, nu), y = def.y0 + def.A * Math.cos(al) + def.e * Math.sin(nu), rho = CAKE.Rc + r + MARGIN; return { x: rho * c, y, z: rho * s, r, nx: c, ny: 0, nz: s, th, al, nu }; }
    if (def.kind === 'top') { const r = tubeR(def, nu), rho = def.rho0 + def.A * Math.cos(al) + def.e * Math.cos(nu), tang = def.e * Math.sin(nu);
      return { x: rho * c - tang * s, y: CAKE.Hc + r + MARGIN, z: rho * s + tang * c, r, nx: 0, ny: 1, nz: 0, th, al, nu }; }
    if (def.kind === 'candles') { const rho = def.rhoC + def.A * Math.cos(al); return { x: rho * c, y: CAKE.Hc, z: rho * s, r: 0, nx: 0, ny: 1, nz: 0, th, al, nu }; }
    return null; }
  // the whole pass: S samples per master revolution over its closing length (L master revolutions), plus the sample L*S that must equal sample 0
  // samples per master turn grow with the turntable's ratio, so a sample is never more than 1/S of a cake turn from the next (chords stay outside the cream)
  function pass(def, g, S) { S = (S || 240) * Math.max(1, Math.ceil(ratioOf(g.t.ri)[0] / ratioOf(g.t.ri)[1])); const L = passRevs(g), N = L * S, pts = [];
    for (let k = 0; k <= N; k++) pts.push(sampleAt(def, g, k, S));
    const a = pts[0], b = pts[N]; const closeErr = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z, a.r - b.r);
    let stops = null; if (def.kind === 'candles') { stops = []; const [np, nq] = ratioOf(g.n.ri), S2 = PHASE_DET * np;
      // the nozzle is down when n u + ph/24 is a whole number j: u = (24 j - ph) / (24 n), an exact sample of a finer grid S2 = 24 p per master turn
      for (let j = Math.ceil(g.n.ph / PHASE_DET); ; j++) { const k = (PHASE_DET * j - g.n.ph) * nq; if (k >= L * S2) break; if (k >= 0) stops.push(Object.assign({ k, j }, sampleAt(def, g, k, S2))); } }
    return { def, L, S, N, pts, closeErr, stops }; }
  // the pattern score: symmetric mean nearest-neighbour distance in (x, y, z, 3 r); for candles, between the stop sets
  function chamfer(A, B) { const W = 3; const one = (P, Q) => { let sum = 0; for (const p of P) { let m = Infinity; for (const q of Q) { const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 + (W * (p.r - q.r)) ** 2; if (d < m) m = d; } sum += Math.sqrt(m); } return sum / P.length; };
    if (!A.length || !B.length) return Infinity; return (one(A, B) + one(B, A)) / 2; }
  const TOL = 0.0008;   // 0.8 mm mean deviation; set below the smallest one-detent-off distance measured in tests.js
  function targetGears(def, g) { const t = {}; GEARS.forEach(id => { t[id] = { ri: def.target[id][0], ph: def.target[id][1] }; }); return t; }
  function score(def, g) { const S = 240; const P = pass(def, g, S), T = pass(def, targetGears(def, g), S);
    if (def.kind === 'candles') { const d = chamfer(P.stops, T.stops); return { dist: d, ok: P.stops.length === T.stops.length && d <= TOL, count: P.stops.length, want: T.stops.length, P, T }; }
    // a pass longer than the target's repeats the same closed figure; compare one figure each: dedupe by comparing over the shorter of the two
    const d = chamfer(P.pts.slice(0, P.N), T.pts.slice(0, T.N)); return { dist: d, ok: d <= TOL, P, T }; }
  // ------------------------------------------------------------------ the inscription: stroke skeletons in each character's unit box (x right, y toward the reader), in stroke order
  const GLYPHS = {
    '生': [[[.34, .06], [.2, .36]], [[.24, .3], [.82, .3]], [[.28, .56], [.76, .56]], [[.52, .08], [.52, .88]], [[.08, .9], [.92, .9]]],
    '日': [[[.24, .1], [.24, .92]], [[.24, .1], [.76, .1], [.76, .92]], [[.24, .5], [.76, .5]], [[.24, .9], [.76, .9]]],
    '快': [[[.1, .34], [.14, .5]], [[.32, .3], [.27, .42]], [[.21, .06], [.21, .94]], [[.46, .3], [.82, .3], [.82, .52]], [[.38, .52], [.95, .52]], [[.64, .08], [.62, .6], [.42, .93]], [[.67, .62], [.95, .93]]],
    '乐': [[[.8, .07], [.32, .2]], [[.33, .2], [.29, .52], [.86, .52]], [[.57, .3], [.57, .92], [.48, .84]], [[.38, .64], [.25, .82]], [[.72, .64], [.84, .82]]] };
  const TEXT = { chars: ['生', '日', '快', '乐'], size: 0.031, gap: 0.003, z0: 0, r: 0.0024 };
  // strokes in the cake frame on the top surface: the reader kneels at +z, so the glyph's down is +z
  function inscription() { const out = []; const w = TEXT.chars.length * TEXT.size + (TEXT.chars.length - 1) * TEXT.gap, x0 = -w / 2;
    TEXT.chars.forEach((ch, i) => { GLYPHS[ch].forEach((st, j) => { const pts = []; for (let s = 0; s < st.length - 1; s++) { const [a, b] = [st[s], st[s + 1]], n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 14));
      for (let k = (s ? 1 : 0); k <= n; k++) { const u = k / n; pts.push({ x: x0 + i * (TEXT.size + TEXT.gap) + (a[0] + (b[0] - a[0]) * u) * TEXT.size, y: CAKE.Hc + TEXT.r + MARGIN, z: TEXT.z0 - TEXT.size / 2 + (a[1] + (b[1] - a[1]) * u) * TEXT.size, r: TEXT.r, nx: 0, ny: 1, nz: 0 }); } }
      out.push({ ch, stroke: j + 1, pts }); }); });
    // the flourish: a 3:2 harmonic scroll under the words, closing nothing, but its own phases exact
    const fl = []; const n = 60; for (let k = 0; k <= n; k++) { const u = k / n; fl.push({ x: -0.052 + 0.104 * u, y: CAKE.Hc + TEXT.r + MARGIN, z: 0.026 + 0.0042 * Math.sin(TAU * 1.5 * u) - 0.0026 * Math.sin(TAU * 1.0 * u), r: TEXT.r * (0.75 + 0.25 * Math.sin(Math.PI * u)), nx: 0, ny: 1, nz: 0 }); }
    out.push({ ch: 'flourish', stroke: 1, pts: fl }); return out; }
  // ------------------------------------------------------------------ the cake's surface: signed distance to the coated cake (flat bottom on the board, rounded top edge)
  function cakeSDF(x, y, z) { const rho = Math.hypot(x, z), b = CAKE.bevel, Rc = CAKE.Rc, Hc = CAKE.Hc;
    if (y > Hc - b && rho > Rc - b) return Math.hypot(Math.max(0, rho - (Rc - b)), Math.max(0, y - (Hc - b))) - b + (rho - (Rc - b) < 0 || y - (Hc - b) < 0 ? 0 : 0);
    const dx = rho - Rc, dy = Math.max(y - Hc, -y); if (dx > 0 && dy > 0) return Math.hypot(dx, dy); return Math.max(dx, dy); }
  // ------------------------------------------------------------------ the game: a pure reducer. The page feeds it the values the machine has reached and the HOLD commits; the trace replays it.
  function newGame() { const g = {}; GEARS.forEach(id => { g[id] = { ri: R11, ph: 0 }; }); return { stage: 0, gears: g, passes: [], over: false }; }
  function setGear(G, id, ri, ph) { G.gears[id] = { ri: Math.max(RANGE[id][0], Math.min(RANGE[id][1], ri)), ph: Math.max(-12, Math.min(12, ph)) }; }
  function gearsKey(g) { return GEARS.map(id => id + ratioText(g[id].ri) + '@' + g[id].ph * 15).join(' '); }
  function hashPts(pts) { let h = 2166136261 >>> 0; for (const p of pts) for (const v of [p.x, p.y, p.z, p.r]) { const q = Math.round(v * 1e7); h = Math.imul(h ^ (q & 0xffff), 16777619) >>> 0; h = Math.imul(h ^ (q >>> 16 & 0xffff), 16777619) >>> 0; } return h.toString(16); }
  function commit(G) { if (G.over) return null; const def = STAGES[G.stage], rec = { stage: G.stage, id: def.id, gears: JSON.parse(JSON.stringify(G.gears)), key: gearsKey(G.gears) };
    if (def.auto) { rec.ok = true; rec.auto = true; } else { const sc = score(def, G.gears); rec.dist = sc.dist; rec.ok = sc.ok; rec.L = sc.P.L; rec.closeErr = sc.P.closeErr; rec.hash = hashPts(def.kind === 'candles' ? sc.P.stops : sc.P.pts);
      if (sc.count != null) { rec.count = sc.count; rec.want = sc.want; } }
    G.passes.push(rec); if (rec.ok) { G.stage++; if (G.stage >= STAGES.length) G.over = true; } return rec; }
  function summary(G) { return { stage: G.stage, over: G.over, passes: G.passes.map(p => [p.id, p.key, p.ok, p.dist == null ? null : +p.dist.toFixed(6), p.hash || null]) }; }
  const API = { RANGE, TAU, CAKE, MARGIN, STEPS_PER_REV, PHASE_DET, RATIOS, R11, GEARS, GEAR_NAMES, STAGES, REFERENCE, TOL, TEXT, ratioOf, ratioText, gearAngle, passRevs, tubeR, sampleAt, pass, chamfer, score, targetGears, inscription, cakeSDF, newGame, setGear, commit, gearsKey, hashPts, summary };
  if (typeof module === 'object' && module.exports) module.exports = API; else root.HARM = API;
})(this);
