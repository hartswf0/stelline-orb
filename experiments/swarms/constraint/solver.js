/* CONSTRAINT SKETCHPAD — the scene, its relations, the solver and the stepping machine.
   No DOM here: index.html draws it, tests.js and proof render use the same code.
   Units: metres, seconds. x to the right, y up, z toward the viewer.
   The girl stands in the picture plane z = 0; things off that plane are drawn and reached at their
   oblique projection  (x, y - z*OB). */
(function (root) {
  'use strict';
  const TT = 0.62, TW = 0.40, CAKE_R = 0.12, CAKE_H = 0.095, CANDLE_H = 0.07, OB = 0.30;
  const CAKE_RANGE = [-(TW - CAKE_R) - 0.0, TW - CAKE_R];   // supported-on table: the cake's footprint stays on the top
  const STEP = 0.015, SLOW = 11.8, FAST = 23.6, FAR_STEPS = 6, DETENT = 0.01;
  const TOL = { goal: 0.004, length: 1e-4, pin: 1e-9, side: 1e-4, contact: 1e-4, balance: 1e-4, attach: 1e-9, limit: 1e-4 };

  /* ------------------------------------------------------------- the figure: points and lines */
  const PTS = ['ankleN', 'ankleF', 'kneeN', 'kneeF', 'hip', 'chest', 'neck', 'head', 'elbowN', 'wristN', 'tipN', 'elbowF', 'wristF'];
  const I = {}; PTS.forEach((n, i) => { I[n] = i; });
  // [a, b, length, mass]; masses sum to 0.89 (a light child; only ratios matter for balance)
  const BONES = [['ankleN', 'kneeN', .30, .045], ['ankleF', 'kneeF', .30, .045], ['kneeN', 'hip', .31, .10], ['kneeF', 'hip', .31, .10],
    ['hip', 'chest', .30, .38], ['chest', 'neck', .07, .03], ['neck', 'head', .10, .09],
    ['chest', 'elbowN', .21, .028], ['elbowN', 'wristN', .19, .018], ['wristN', 'tipN', .08, .008],
    ['chest', 'elbowF', .21, .028], ['elbowF', 'wristF', .19, .018]].map(([a, b, L, m]) => ({ a: I[a], b: I[b], L, m, name: a + '-' + b }));
  const ARM = .21 + .19 + .08;
  const INVM = { ankleN: 0, ankleF: 0, kneeN: .6, kneeF: .6, hip: .35, chest: .45, neck: .7, head: .7, elbowN: 1, wristN: 1, tipN: 1, elbowF: 1, wristF: 1 };
  const W = PTS.map(n => INVM[n]);
  const PM = PTS.map(() => 0); BONES.forEach(b => { PM[b.a] += b.m / 2; PM[b.b] += b.m / 2; });
  const MTOT = PM.reduce((s, v) => s + v, 0);
  const ANKLE_N = [-0.52, 0.07], ANKLE_F = [-0.58, 0.07];
  const SUPPORT = () => [ANKLE_F[0] - 0.05, ANKLE_N[0] + 0.13];   // heel of the far shoe to the toe of the near shoe
  const BAL_SET = ['hip', 'kneeN', 'kneeF', 'chest', 'neck', 'head', 'elbowF', 'wristF'].map(n => I[n]);
  const BAL_M = BAL_SET.reduce((s, i) => s + PM[i], 0);
  const BODY_CONTACT = ['kneeN', 'kneeF', 'hip', 'chest', 'neck', 'head', 'elbowN', 'wristN', 'tipN', 'elbowF', 'wristF'].map(n => I[n]);

  function restPose() {
    const p = {
      ankleN: ANKLE_N, ankleF: ANKLE_F, kneeN: [-0.51, 0.37], kneeF: [-0.57, 0.37], hip: [-0.545, 0.68], chest: [-0.545, 0.98], neck: [-0.545, 1.05], head: [-0.54, 1.15],
      elbowN: [-0.555, 0.77], wristN: [-0.525, 0.583], tipN: [-0.51, 0.504], elbowF: [-0.56, 0.77], wristF: [-0.55, 0.58]
    };
    const P = PTS.map(n => p[n].slice());
    hardPass(P, { cakeX: 0 }, 400);
    return P;
  }

  /* ------------------------------------------------------------- the scene objects and their relations */
  // candles: attached-to the cake at fixed offsets (the same seven the memory maker uses)
  const CANDLES = Array.from({ length: 7 }, (_, k) => { const a = k / 7 * Math.PI * 2 + .3, r = k % 2 ? .052 : .088; return { k, dx: Math.cos(a) * r, dz: Math.sin(a) * r }; });
  // the order she meets them in: nearest first (smallest x)
  const CANDLE_ORDER = CANDLES.slice().sort((a, b) => a.dx - b.dx).map(c => c.k);
  const TOUCH_UP = 0.052;   // where the hand meets a candle: just under the flame
  function candleBase(k, cakeX) { const c = CANDLES[k]; return [cakeX + c.dx, TT + CAKE_H - c.dz * OB]; }
  function candleTouch(k, cakeX) { const b = candleBase(k, cakeX); return [b[0], b[1] + TOUCH_UP]; }
  function candleTip(k, cakeX) { const b = candleBase(k, cakeX); return [b[0], b[1] + CANDLE_H]; }

  // the relations, as data. Kinds: attached-to, held-by, supported-on, behind, aligned-with.
  function relations(st) {
    const R = [
      { rel: 'supported-on', a: 'table', b: 'floor', hard: true },
      { rel: 'supported-on', a: 'cake', b: 'table', hard: true },
      { rel: 'supported-on', a: 'girl.ankleN', b: 'floor', hard: true },
      { rel: 'supported-on', a: 'girl.ankleF', b: 'floor', hard: true },
      { rel: 'aligned-with', a: 'girl.centre-of-mass', b: 'girl.feet', hard: true },
      { rel: 'aligned-with', a: 'arc', b: 'candle-height', hard: true }];
    CANDLES.forEach(c => R.push({ rel: 'attached-to', a: 'candle' + c.k, b: 'cake', hard: true }));
    if (st.hold && st.hold.kind === 'candle') R.push({ rel: 'held-by', a: 'candle' + st.hold.k, b: 'girl.hand', hard: false });
    if (st.hold && st.hold.kind === 'pen') R.push({ rel: 'held-by', a: 'girl.hand', b: 'light-pen', hard: false });
    if (st.hold && st.hold.kind === 'rest') R.push({ rel: 'held-by', a: 'girl.hand', b: 'girl.side', hard: false });
    // staging: what is behind what (drives draw order)
    R.push({ rel: 'behind', a: 'girl.farLeg', b: 'girl.nearLeg' }, { rel: 'behind', a: 'girl.farArm', b: 'girl.torso' }, { rel: 'behind', a: 'girl.torso', b: 'girl.nearArm' },
      { rel: 'behind', a: 'girl.torso', b: 'girl.head' }, { rel: 'behind', a: 'table', b: 'cake' }, { rel: 'behind', a: 'cake', b: 'girl.nearArm' }, { rel: 'behind', a: 'table', b: 'girl.nearArm' });
    CANDLES.forEach(c => R.push(c.dz < 0 ? { rel: 'behind', a: 'candle' + c.k, b: 'girl.nearArm' } : { rel: 'behind', a: 'girl.nearArm', b: 'candle' + c.k }));
    CANDLES.forEach(c => R.push({ rel: 'behind', a: 'cake', b: 'candle' + c.k }));
    return R;
  }

  /* ------------------------------------------------------------- constraint projections */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], len = v => Math.hypot(v[0], v[1]);
  function projDist(P, i, j, L) { const d = sub(P[j], P[i]), l = len(d) || 1e-12, wi = W[i], wj = W[j], ws = wi + wj; if (!ws) return; const c = (l - L) / l / ws;
    P[i][0] += wi * c * d[0]; P[i][1] += wi * c * d[1]; P[j][0] -= wj * c * d[0]; P[j][1] -= wj * c * d[1]; }
  function projMinDist(P, i, j, L) { const d = sub(P[j], P[i]), l = len(d) || 1e-12; if (l >= L) return; projDist(P, i, j, L); }
  // point k on the given side of line a->b: side +1 = clockwise normal of (b-a)
  function sideDist(P, a, b, k) { const d = sub(P[b], P[a]), l = len(d) || 1e-12, n = [d[1] / l, -d[0] / l]; return [(P[k][0] - P[a][0]) * n[0] + (P[k][1] - P[a][1]) * n[1], n]; }
  function projSide(P, a, b, k) { const [s, n] = sideDist(P, a, b, k); if (s >= 0) return; P[k][0] -= s * n[0]; P[k][1] -= s * n[1]; }
  function boxes(sc) { return [[-TW, TW, -1, TT], [sc.cakeX - CAKE_R, sc.cakeX + CAKE_R, TT, TT + CAKE_H]]; }
  function boxPen(p, bx) { const [x0, x1, y0, y1] = bx; if (p[0] <= x0 || p[0] >= x1 || p[1] <= y0 || p[1] >= y1) return null;
    const c = [[p[0] - x0, -1, 0], [x1 - p[0], 1, 0], [y1 - p[1], 0, 1]].sort((a, b) => a[0] - b[0])[0]; return c; }
  function projContact(P, sc) { const B = boxes(sc); BODY_CONTACT.forEach(i => { B.forEach(bx => { const c = boxPen(P[i], bx); if (c) { P[i][0] += c[1] * c[0]; P[i][1] += c[2] * c[0]; } }); if (P[i][1] < 0) P[i][1] = 0; }); }
  function com(P) { let x = 0, y = 0; for (let i = 0; i < P.length; i++) { x += PM[i] * P[i][0]; y += PM[i] * P[i][1]; } return [x / MTOT, y / MTOT]; }
  function projBalance(P) { const [lo, hi] = SUPPORT(), cx = com(P)[0]; let e = 0; if (cx > hi) e = cx - hi; else if (cx < lo) e = cx - lo; if (!e) return; const dx = -e * MTOT / BAL_M; BAL_SET.forEach(i => { P[i][0] += dx; }); }
  function projLimits(P) {
    // torso: no folding forward past 75 deg from vertical, little backward lean
    const h = P[I.hip], c = P[I.chest], minUp = 0.30 * Math.cos(75 * Math.PI / 180);
    if (c[1] - h[1] < minUp) { c[1] = h[1] + minUp; }
    if (c[0] - h[0] < -0.05) { c[0] = h[0] - 0.05; }
    projMinDist(P, I.chest, I.wristN, 0.14);   // elbow can close only so far
    projMinDist(P, I.chest, I.wristF, 0.14);
    projMinDist(P, I.ankleN, I.hip, 0.45); projMinDist(P, I.ankleF, I.hip, 0.45);   // knees bend only so far
  }
  function hardSweep(P, sc) {
    BONES.forEach(b => projDist(P, b.a, b.b, b.L));
    projSide(P, I.ankleN, I.hip, I.kneeN); projSide(P, I.ankleF, I.hip, I.kneeF);   // knees forward
    projSide(P, I.chest, I.wristN, I.elbowN); projSide(P, I.chest, I.wristF, I.elbowF);   // elbows below/behind the reach line
    projLimits(P); projContact(P, sc); projBalance(P);
    P[I.ankleN][0] = ANKLE_N[0]; P[I.ankleN][1] = ANKLE_N[1]; P[I.ankleF][0] = ANKLE_F[0]; P[I.ankleF][1] = ANKLE_F[1];
  }
  function hardPass(P, sc, n) { for (let k = 0; k < n; k++) { hardSweep(P, sc); if (k > 20 && k % 10 === 0 && residuals(P, sc).hardMax < 2e-8) break; } }
  function softPass(P, goal, light) {
    const pull = (i, t, a) => { P[i][0] += (t[0] - P[i][0]) * a; P[i][1] += (t[1] - P[i][1]) * a; };
    if (goal) pull(I.tipN, goal, 1);
    const h = P[I.hip], c = P[I.chest], n = P[I.neck], f = light ? .1 : 1;
    pull(I.chest, [h[0], h[1] + .30], .03 * f);               // prefer upright
    pull(I.head, [n[0] + .01, n[1] + .10], .25);          // head carried upright, a little forward
    pull(I.elbowF, [c[0] - .01, c[1] - .20], .2); pull(I.wristF, [P[I.elbowF][0] + .02, P[I.elbowF][1] - .19], .2);   // far arm hangs
    [['kneeN', 'ankleN'], ['kneeF', 'ankleF']].forEach(([k, a]) => { const A = P[I[a]]; pull(I[k], [(A[0] + h[0]) / 2 + .012, (A[1] + h[1]) / 2], .04); });   // knees soft, nearly straight
    if (!goal) { pull(I.elbowN, [c[0] - .01, c[1] - .21], .2); pull(I.tipN, [c[0] + .035, c[1] - .475], .2); }
  }
  // Two tiers. Tier 1: the goal joins the hard set (the fingertip is pinned to it) and the body must
  // satisfy every hard constraint around it. If that converges, the goal is met exactly. Tier 2 (only if
  // tier 1 cannot converge): the goal drops to a soft pull and the hard set alone decides where the hand
  // stops; the gap left is the residual the operator panel shows.
  function solve(P, goal, sc, iters) {
    if (goal) {
      const Q = P.map(p => p.slice()), wt = W[I.tipN]; W[I.tipN] = 0; Q[I.tipN] = goal.slice();
      let ok = false;
      for (let k = 0; k < 1500; k++) { if (k < 200) softPass(Q, goal, false); hardSweep(Q, sc); Q[I.tipN] = goal.slice(); if (k > 200 && k % 20 === 0 && residuals(Q, sc).hardMax < 1e-6) { ok = true; break; } }
      W[I.tipN] = wt;
      if (ok) { hardPass(Q, sc, 1500); Q.forEach((p, i) => { P[i][0] = p[0]; P[i][1] = p[1]; }); const r = measure(P, goal, sc); r.tier = 1; return r; }
    }
    for (let k = 0; k < (iters || 120); k++) { softPass(P, goal); for (let s = 0; s < 3; s++) hardSweep(P, sc); }
    hardPass(P, sc, 1500);
    const r = measure(P, goal, sc); r.tier = 2; return r;
  }

  /* ------------------------------------------------------------- residuals: everything the operator panel shows */
  function residuals(P, sc) {
    let lenMax = 0, lenName = ''; BONES.forEach(b => { const e = Math.abs(len(sub(P[b.b], P[b.a])) - b.L); if (e > lenMax) { lenMax = e; lenName = b.name; } });
    const pin = Math.max(len(sub(P[I.ankleN], ANKLE_N)), len(sub(P[I.ankleF], ANKLE_F)));
    const sides = [sideDist(P, I.ankleN, I.hip, I.kneeN)[0], sideDist(P, I.ankleF, I.hip, I.kneeF)[0], sideDist(P, I.chest, I.wristN, I.elbowN)[0], sideDist(P, I.chest, I.wristF, I.elbowF)[0]];
    const side = Math.max(0, -Math.min(...sides));
    let contact = 0; const B = boxes(sc); BODY_CONTACT.forEach(i => { B.forEach(bx => { const c = boxPen(P[i], bx); if (c) contact = Math.max(contact, c[0]); }); contact = Math.max(contact, -P[i][1]); });
    const [lo, hi] = SUPPORT(), cx = com(P)[0], balance = Math.max(0, cx - hi, lo - cx);
    const h = P[I.hip], c = P[I.chest];
    const limit = Math.max(0, 0.30 * Math.cos(75 * Math.PI / 180) - (c[1] - h[1]), -0.05 - (c[0] - h[0]),
      0.14 - len(sub(P[I.wristN], P[I.chest])), 0.14 - len(sub(P[I.wristF], P[I.chest])), 0.45 - len(sub(P[I.hip], P[I.ankleN])), 0.45 - len(sub(P[I.hip], P[I.ankleF])));
    return { lenMax, lenName, pin, side, contact, balance, limit, hardMax: Math.max(lenMax, pin, side, contact, balance, limit), com: cx, support: [lo, hi] };
  }
  function elbowAngle(P) { const a = sub(P[I.chest], P[I.elbowN]), b = sub(P[I.wristN], P[I.elbowN]); return Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (len(a) * len(b))))) * 180 / Math.PI; }
  function measure(P, goal, sc) {
    const r = residuals(P, sc); r.goal = goal ? len(sub(P[I.tipN], goal)) : 0;
    r.solved = r.goal <= TOL.goal; r.elbowDeg = elbowAngle(P); r.reach = len(sub(P[I.tipN], P[I.chest])) / ARM;
    r.lean = Math.atan2(P[I.chest][0] - P[I.hip][0], P[I.chest][1] - P[I.hip][1]) * 180 / Math.PI;
    const bind = [];
    if (!r.solved) {
      if (r.reach > 0.995) bind.push('ARM AT FULL LENGTH');
      if (r.balance > -1 && Math.abs(r.com - r.support[1]) < 2e-3) bind.push('BALANCE AT TOES');
      if (r.lean > 74) bind.push('WAIST AT LIMIT');
      const B = boxes(sc); if ([I.tipN, I.wristN, I.elbowN].some(i => B.some(bx => p_on(P[i], bx)))) bind.push('TOUCHING CAKE OR TABLE');
    }
    r.binding = bind; return r;
  }
  function p_on(p, bx) { const [x0, x1, y0, y1] = bx; return p[0] > x0 - 2e-3 && p[0] < x1 + 2e-3 && p[1] > y0 - 2e-3 && p[1] < y1 + 2e-3; }

  /* ------------------------------------------------------------- the machine: the hand sets, the machine steps at 11.8/s */
  function Machine(opts) {
    opts = opts || {};
    const m = this; m.t = 0; m.clock = 0; m.events = []; m.trace = []; m.steps = 0;
    m.P = restPose(); m.cake = { x: 0, target: 0 };
    m.hold = { kind: 'rest' }; m.goal = restGoal(m.P); m.goalApplied = m.goal.slice();
    m.status = 'SOLVED'; m.last = solve(m.P, m.goalApplied, { cakeX: 0 }); m.pen = null; m.penDetent = null; m.cakeDetent = null;
    m.emit = (kind, extra) => { const e = Object.assign({ t: +m.t.toFixed(4), kind }, extra || {}); m.events.push(e); if (opts.onEvent) opts.onEvent(e); };
  }
  function restGoal(P) { const c = P[I.chest]; return [c[0] + .035, c[1] - .475]; }
  const q = v => Math.round(v / DETENT) * DETENT;
  Machine.prototype.goalTarget = function () {
    const h = this.hold;
    if (h.kind === 'candle') return candleTouch(h.k, this.cake.x);
    if (h.kind === 'pen') return this.pen.slice();
    return restGoal(this.P);
  };
  // the light pen: drag the hand; every detent passed is a quiet click (the hand's own turn)
  Machine.prototype.penTo = function (x, y) {
    const d = [q(x), q(y)]; if (this.penDetent && d[0] === this.penDetent[0] && d[1] === this.penDetent[1]) return false;
    this.penDetent = d; this.pen = d; this.hold = { kind: 'pen' }; this.emit('detent', { what: 'hand', at: d }); return true;
  };
  // release: drop onto a candle if the pen is near one (Sketchpad's pick), else the hand stays held by the pen point
  Machine.prototype.penUp = function (snap) {
    if (!this.pen) return; let best = null, bd = snap || 0.045;
    CANDLES.forEach(c => { const p = candleTouch(c.k, this.cake.x), d = len(sub(p, this.pen)); if (d < bd) { bd = d; best = c.k; } });
    if (best != null) { this.hold = { kind: 'candle', k: best }; this.emit('relate', { rel: 'held-by', a: 'candle' + best, b: 'girl.hand' }); }
    this.penDetent = null;
  };
  Machine.prototype.holdCandle = function (k) { this.hold = { kind: 'candle', k }; this.pen = null; this.emit('relate', { rel: 'held-by', a: 'candle' + k, b: 'girl.hand' }); };
  Machine.prototype.rest = function () { this.hold = { kind: 'rest' }; this.pen = null; this.emit('relate', { rel: 'held-by', a: 'girl.hand', b: 'girl.side' }); };
  // the cake: dragged along the table; supported-on clamps it to the top; detents click
  Machine.prototype.cakeTo = function (x) {
    const d = Math.max(CAKE_RANGE[0], Math.min(CAKE_RANGE[1], q(x))); if (d === this.cakeDetent) return false;
    this.cakeDetent = d; this.cake.target = d; this.emit('detent', { what: 'cake', at: d }); return true;
  };
  Machine.prototype.remaining = function () {
    const g = this.goalTarget(), a = this.goalApplied, gd = len(sub(g, a)), cd = Math.abs(this.cake.target - this.cake.x);
    return Math.ceil(Math.max(gd, cd) / STEP - 1e-9);
  };
  Machine.prototype.tick = function (dt) {
    this.t += dt; const n = this.remaining();
    if (!n) { this.clock = 0; return; }
    const period = n > FAR_STEPS ? 1 / FAST : 1 / SLOW; this.clock += dt;
    while (this.clock >= period - 1e-9) { this.clock -= period; if (!this.step(period === 1 / FAST)) { this.clock = 0; break; } }
  };
  Machine.prototype.step = function (fast) {
    const ct = this.cake.target, cx = this.cake.x;
    if (ct !== cx) this.cake.x = Math.abs(ct - cx) <= STEP ? ct : cx + Math.sign(ct - cx) * STEP;
    const g = this.goalTarget(), a = this.goalApplied, d = sub(g, a), dl = len(d);
    if (!dl && ct === cx) return false;
    this.goalApplied = dl <= STEP ? g.slice() : [a[0] + d[0] / dl * STEP, a[1] + d[1] / dl * STEP];
    const before = this.P.map(p => p.slice());
    const r = solve(this.P, this.goalApplied, { cakeX: this.cake.x });
    let move = 0; this.P.forEach((p, i) => { move = Math.max(move, len(sub(p, before[i]))); });
    this.steps++; this.last = r;
    const atEnd = this.remaining() === 0, was = this.status;
    this.status = !r.solved ? 'UNSOLVABLE' : atEnd ? 'SOLVED' : 'MOVING';
    this.emit(fast ? 'step-fast' : 'step', { n: this.steps });
    if (this.status === 'UNSOLVABLE' && was !== 'UNSOLVABLE') this.emit('strain', { residual: +r.goal.toFixed(4), binding: r.binding });
    if (this.status === 'SOLVED' && was !== 'SOLVED') this.emit('satisfied', { hold: this.hold.kind + (this.hold.k != null ? this.hold.k : '') });
    this.trace.push({ t: +this.t.toFixed(4), step: this.steps, fast: !!fast, status: this.status, hold: this.hold.kind + (this.hold.k != null ? this.hold.k : ''),
      cakeX: +this.cake.x.toFixed(4), goal: this.goalApplied.map(v => +v.toFixed(4)), tip: this.P[I.tipN].map(v => +v.toFixed(4)),
      residual_goal: +r.goal.toExponential(3), hard_max: +r.hardMax.toExponential(3), worst_length: r.lenName, elbow_deg: +r.elbowDeg.toFixed(1), lean_deg: +r.lean.toFixed(1),
      com_x: +r.com.toFixed(4), max_point_move: +move.toFixed(4), binding: r.binding });
    return true;
  };
  Machine.prototype.relations = function () { return relations(this); };

  const API = { TT, TW, CAKE_R, CAKE_H, CANDLE_H, OB, STEP, SLOW, FAST, DETENT, TOL, PTS, I, BONES, ARM, CANDLES, CANDLE_ORDER, CAKE_RANGE, ANKLE_N, ANKLE_F,
    restPose, solve, measure, residuals, com, candleBase, candleTouch, candleTip, relations, Machine, SUPPORT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SK = API;
})(typeof window !== 'undefined' ? window : globalThis);
