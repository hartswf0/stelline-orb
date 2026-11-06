/* Unit tests for the constraint birthday. Run: node experiments/swarms/constraint/tests.js
   Declared tolerances (metres unless stated):
     limb lengths 1e-4 · feet drift 1e-9 · joint sides 1e-4 · contact 1e-4 · balance 1e-4 · joint limits 1e-4
     goal met 4e-3 · light 1.5e-2 (3D) · per machine step, no point moves more than 0.05
     stability: a 1 mm change of the pen moves no point more than 10 mm */
const S = require('./solver.js'), { SCRIPT, DURATION } = require('./proof-script.js');
let pass = 0, fail = 0; const out = [];
function check(name, ok, detail) { (ok ? pass++ : fail++); out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); }
const T = S.TOL, len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const hardOK = r => r.lenMax <= T.length && r.pin <= T.pin && r.side <= T.side && r.contact <= T.contact && r.balance <= T.balance && r.limit <= T.limit;

// 1. a sweep of pen points over the whole reachable and unreachable field, warm-started in a raster
{ const P = S.restPose(); let worst = 0, sideMin = 1, n = 0, solved = 0, uns = 0, allOK = true;
  for (let y = 0.45; y <= 1.15; y += 0.05) for (let x = -0.45; x <= 0.40; x += 0.05) {
    const xs = (Math.round((y - .45) / .05) % 2) ? 0.35 - (x + 0.45) : x;   // serpentine raster, so each goal is near the last
    const r = S.solve(P, [xs, y], { cakeX: 0 }); n++; worst = Math.max(worst, r.hardMax); if (!hardOK(r)) allOK = false; r.solved ? solved++ : uns++; }
  check('hard constraints hold over a 252-point pen sweep', allOK, `worst hard residual ${worst.toExponential(2)} m; ${solved} met, ${uns} unreachable`);
  check('the sweep contains both met and unreachable goals', solved > 20 && uns > 20, `${solved} / ${uns}`); }

// 2. a reachable goal is met exactly; elbow bends the believable way
{ const g = new S.Game({ start: { cakeX: -7, cakeTurn: 33 } }); const P = g.P; const w = S.wick(0, -0.105, 165);
  let r; const from = P[S.I.tipN].slice(); for (let k = 1; k <= 30; k++) r = S.solve(P, [from[0] + (w[0] - from[0]) * k / 30, from[1] + (w[1] - from[1]) * k / 30], { cakeX: -0.105 });
  check('a candle in her plane and in reach: taper meets the wick', r.solved && r.goal <= T.goal, `residual ${(r.goal * 1000).toFixed(4)} mm, tier ${r.tier}`);
  check('elbow open angle between 35 and 180 deg, on its own side', r.elbowDeg >= 35 && r.elbowDeg <= 180 && r.side <= T.side, `${r.elbowDeg.toFixed(1)} deg`);
  check('|z| of that wick within the light tolerance', Math.abs(w[2]) < S.LIGHT_TOL, `z = ${(w[2] * 1000).toFixed(1)} mm`); }

// 3. an unreachable goal is reported, never faked: the hand stops at the edge, residual > tolerance, hard set intact
{ const P = S.restPose(); let r; const from = P[S.I.tipN].slice(), goal = [0.45, 0.85];
  for (let k = 1; k <= 40; k++) r = S.solve(P, [from[0] + (goal[0] - from[0]) * k / 40, from[1] + (goal[1] - from[1]) * k / 40], { cakeX: 0 });
  check('unreachable goal reported unsolved with a residual', !r.solved && r.goal > 0.05, `residual ${(r.goal * 100).toFixed(1)} cm; limits: ${r.binding.join(', ')}`);
  check('at the unreachable goal every hard constraint still holds', hardOK(r), `hard ${r.hardMax.toExponential(2)}`);
  check('a named limit explains it', r.binding.length > 0, r.binding.join(', '));
  const t = P[S.I.tipN], d1 = [goal[0] - t[0], goal[1] - t[1]], c = P[S.I.chest], d2 = [t[0] - c[0], t[1] - c[1]], cos = (d1[0] * d2[0] + d1[1] * d2[1]) / (Math.hypot(...d1) * Math.hypot(...d2));
  check('the hand points toward the goal it cannot reach', cos > 0.8, `cos ${cos.toFixed(3)}`); }

// 4. stability: a 1 mm pen change moves no point more than 10 mm (reachable and unreachable)
{ let worst = 0; for (const g0 of [[-0.2, 0.8], [0.0, 0.85], [0.1, 0.75], [0.4, 0.9], [0.3, 1.1]]) {
    const P = S.restPose(); const from = P[S.I.tipN].slice(); for (let k = 1; k <= 30; k++) S.solve(P, [from[0] + (g0[0] - from[0]) * k / 30, from[1] + (g0[1] - from[1]) * k / 30], { cakeX: 0 });
    S.solve(P, g0, { cakeX: 0 }); const A = P.map(p => p.slice());
    for (const d of [[.001, 0], [-.001, 0], [0, .001], [0, -.001]]) { const Q = A.map(p => p.slice()); S.solve(Q, [g0[0] + d[0], g0[1] + d[1]], { cakeX: 0 }); Q.forEach((q, i) => { worst = Math.max(worst, len(q, A[i])); }); } }
  check('1 mm pen change: max point move <= 10 mm', worst <= 0.010, `${(worst * 1000).toFixed(2)} mm`); }

// 5. the whole scripted birthday through the game: no teleporting, hard set holds every step, candles stay attached, cake stays on the table
{ const g = new S.Game(); const anims = []; let i = 0, maxMove = 0, maxHard = 0, attachErr = 0, onTable = true, sawUns = false, sawLit = 0;
  for (let f = 0; f < DURATION * 30; f++) { const t = f / 30;
    while (i < SCRIPT.length && SCRIPT[i][0] <= t + 1e-9) { const s = SCRIPT[i++]; if (s[1] === 'select') g.select(); if (s[1] === 'hold') g.hold(); if (s[1] === 'turn') anims.push({ ring: s[2], n: s[3], t0: s[0], dur: s[4], done: 0 }); }
    anims.forEach(a => { const u = Math.max(0, Math.min(1, (t - a.t0) / a.dur)), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, want = Math.round(a.n * e); while (a.done !== want) { const d = Math.sign(want - a.done); g.turn(a.ring, d); a.done += d; } });
    g.tick(1 / 30);
    const cx = g.cakeX(), tr = g.cakeTurn(); S.CANDLES.forEach(c => { const w = S.wick(c.k, cx, tr), r = Math.hypot(w[0] - cx, w[2]); attachErr = Math.max(attachErr, Math.abs(r - c.r), Math.abs(w[1] - (S.TT + S.CAKE_H + S.CANDLE_H))); });
    if (Math.abs(cx) > S.TW - S.CAKE_R + 1e-12) onTable = false; }
  g.trace.forEach(x => { if (x.max_point_move != null) maxMove = Math.max(maxMove, x.max_point_move); if (x.hard_max != null) maxHard = Math.max(maxHard, x.hard_max); if (x.status === 'UNSOLVABLE') sawUns = true; });
  sawLit = g.lit.filter(Boolean).length;
  check('scripted birthday: no body point moves more than 5 cm in one machine step', maxMove <= 0.05, `${(maxMove * 100).toFixed(2)} cm over ${g.steps} steps`);
  check('scripted birthday: hard residual within 1e-4 m at every step', maxHard <= 1e-4, maxHard.toExponential(2));
  check('candles stay attached-to the cake (radius and height)', attachErr <= T.attach, attachErr.toExponential(2));
  check('cake stays supported-on the table top', onTable);
  check('scripted birthday shows an unreachable state, lights all seven, and ends blown out', sawUns && sawLit === 7 && g.phase === 'BLOWN', `unreachable seen ${sawUns}, lit ${sawLit}, phase ${g.phase}`);
  // critic round 1 repair condition
  const litSteps = g.trace.filter(x => x.lit && x.lit.length), litEl = litSteps.map(x => x.elbow_deg);
  check('critic R1: elbow at every lit event between 100 and 165 deg', litEl.length === 7 && litEl.every(a => a >= 100 && a <= 165), litEl.join(', '));
  const straightT1 = g.trace.filter(x => x.tier === 1 && x.elbow_deg >= 179.5).length; check('critic R1: a straight elbow (>= 179.5 deg) appears only at tier 2', straightT1 === 0, `${straightT1} tier-1 steps straight`);
  const slowN = g.events.filter(e => e.kind === 'step').length, fastN = g.events.filter(e => e.kind === 'step-fast').length; check('critic R1: 11.8/s steps dominate', slowN > 3 * fastN, `${slowN} at 11.8/s, ${fastN} at 23.6/s`);
  const st = g.events.filter(e => /^step/.test(e.kind)).map(e => e.t); let most = 0; st.forEach(t0 => { most = Math.max(most, st.filter(t => t >= t0 && t < t0 + 2).length); });
  const slow = g.events.filter(e => e.kind === 'step').map(e => e.t); let mostSlow = 0; slow.forEach(t0 => { mostSlow = Math.max(mostSlow, slow.filter(t => t >= t0 && t < t0 + 0.5).length); });
  check('machine never exceeds 23.6 steps/s: at most 48 in any 2 s window (47.2 + one frame of rounding)', most <= 48, `${most} steps in the busiest 2 s`); }

// 6. the ring limits: the cake cannot be slid off the table
{ const g = new S.Game(); g.select(); for (let k = 0; k < 60; k++) g.turn('knurl', 1); for (let k = 0; k < 200; k++) g.tick(1 / 30);
  check('sliding the cake past the edge stops at the last detent on the top (supported-on)', Math.abs(g.cakeX() - 0.27) < 1e-9, `cake x ${g.cakeX().toFixed(3)} m, top edge ${(S.TW - S.CAKE_R).toFixed(3)}`); }

// 7. the end: HOLD does nothing until all seven are lit, then she blows them out
{ const g = new S.Game(); check('HOLD refused before all are lit', g.hold() === false);
  g.lit = g.lit.map(() => true); g.phase = 'ALL LIT'; check('HOLD accepted when all are lit', g.hold() === true); for (let k = 0; k < 60; k++) g.tick(1 / 30);
  check('all seven go out and the game ends', g.phase === 'BLOWN' && g.out.every(Boolean)); }

// 8. determinism
{ const run = () => { const g = new S.Game(); g.turn('knurl', 20); g.turn('tri', 5); for (let k = 0; k < 90; k++) g.tick(1 / 30); return JSON.stringify(g.trace); };
  check('same ring turns give the same trace', run() === run()); }

// 9. staging: the draw order honours every 'behind' relation
{ const g = new S.Game(); const R = g.relations(n => n === 'girl.nearArm' ? 0 : n.startsWith('candle') ? -0.1 : -0.2); const order = S.stageOrder(R);
  const bad = R.filter(r => r.rel === 'behind' && order.indexOf(r.a) > order.indexOf(r.b)); check('draw order satisfies all behind relations', !bad.length, `${R.filter(r => r.rel === 'behind').length} relations`); }

console.log(out.join('\n')); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
