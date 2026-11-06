/* CONSTRAINT SKETCHPAD — the scene, its relations, the solver, and the game the device plays.
   No DOM here: index.html draws it and wires the device; tests.js and the proof render use the same code.
   Units: metres, seconds, degrees on the rings. x to the right, y up, z toward the viewer.
   The girl is a 2D figure: all her points live in the plane z = 0 (her reach plane). The cake and its
   candles are 3D; a candle can be lit only when turning the cake has brought it into her plane. */
(function (root) {
  'use strict';
  const TT = 0.62, TW = 0.40, CAKE_R = 0.12, CAKE_H = 0.095, CANDLE_H = 0.07;
  const CAKE_RANGE = [-(TW - CAKE_R) - 0.0, TW - CAKE_R];   // supported-on table: the cake's footprint stays on the top
  const LEAN_MAX = 50;
  const SLOW = 11.8, FAST = 23.6, FAR_STEPS = 6;
  const TOL = { goal: 0.004, length: 1e-4, pin: 1e-9, side: 1e-4, contact: 1e-4, balance: 1e-4, attach: 1e-9, limit: 1e-4 };

  /* ------------------------------------------------------------- the figure: points and lines */
  const PTS = ['ankleN', 'ankleF', 'kneeN', 'kneeF', 'hip', 'chest', 'neck', 'head', 'elbowN', 'wristN', 'tipN', 'elbowF', 'wristF'];
  const I = {}; PTS.forEach((n, i) => { I[n] = i; });
  // [a, b, length, mass]; masses sum to 0.89 (a light child; only ratios matter for balance)
  const BONES = [['ankleN', 'kneeN', .30, .045], ['ankleF', 'kneeF', .30, .045], ['kneeN', 'hip', .31, .10], ['kneeF', 'hip', .31, .10],
    ['hip', 'chest', .30, .38], ['chest', 'neck', .07, .03], ['neck', 'head', .10, .09],
    ['chest', 'elbowN', .21, .028], ['elbowN', 'wristN', .19, .018], ['wristN', 'tipN', .15, .012],
    ['chest', 'elbowF', .21, .028], ['elbowF', 'wristF', .19, .018]].map(([a, b, L, m]) => ({ a: I[a], b: I[b], L, m, name: a + '-' + b }));
  const ARM = .21 + .19 + .15;   // shoulder to the taper's flame: arm, hand and the lit taper she holds
  const INVM = { ankleN: 0, ankleF: 0, kneeN: .6, kneeF: .6, hip: .35, chest: .45, neck: .7, head: .7, elbowN: 1, wristN: 1, tipN: 1, elbowF: 1, wristF: 1 };
  const W = PTS.map(n => INVM[n]);
  const PM = PTS.map(() => 0); BONES.forEach(b => { PM[b.a] += b.m / 2; PM[b.b] += b.m / 2; });
  const MTOT = PM.reduce((s, v) => s + v, 0);
  const ANKLE_N = [-0.60, 0.07], ANKLE_F = [-0.66, 0.07];
  const SUPPORT = () => [ANKLE_F[0] - 0.05, ANKLE_N[0] + 0.13];   // heel of the far shoe to the toe of the near shoe
  const BAL_SET = ['hip', 'kneeN', 'kneeF', 'chest', 'neck', 'head', 'elbowF', 'wristF'].map(n => I[n]);
  const BAL_M = BAL_SET.reduce((s, i) => s + PM[i], 0);
  const BODY_CONTACT = ['kneeN', 'kneeF', 'hip', 'chest', 'neck', 'head', 'elbowN', 'wristN', 'tipN', 'elbowF', 'wristF'].map(n => I[n]);

  function restPose() {
    const p = {
      ankleN: ANKLE_N, ankleF: ANKLE_F, kneeN: [-0.59, 0.37], kneeF: [-0.65, 0.37], hip: [-0.625, 0.68], chest: [-0.625, 0.98], neck: [-0.625, 1.05], head: [-0.62, 1.15],
      elbowN: [-0.635, 0.77], wristN: [-0.605, 0.583], tipN: [-0.59, 0.434], elbowF: [-0.64, 0.77], wristF: [-0.63, 0.58]
    };
    const P = PTS.map(n => p[n].slice());
    hardPass(P, { cakeX: 0 }, 400);
    for (let k = 0; k <= 20; k++) solve(P, [lerp(P[I.tipN][0], REST_TIP[0], k / 20), lerp(P[I.tipN][1], REST_TIP[1], k / 20)], { cakeX: 0.21 });
    return P;
  }

  /* ------------------------------------------------------------- the scene objects and their relations */
  // candles: attached-to the cake at fixed angles and radii (the same seven the memory maker uses)
  const CANDLES = Array.from({ length: 7 }, (_, k) => ({ k, a: k / 7 * Math.PI * 2 + .3, r: k % 2 ? .052 : .088 }));
  // a candle's wick in the world, for a cake at x = cakeX turned by turnDeg
  function wick(k, cakeX, turnDeg) { const c = CANDLES[k], a = c.a + turnDeg * Math.PI / 180; return [cakeX + Math.cos(a) * c.r, TT + CAKE_H + CANDLE_H, Math.sin(a) * c.r]; }
  const LIGHT_TOL = 0.015;   // the taper's flame within 1.5 cm of a wick (in 3D) lights it
  const REST_TIP = [-0.405, 0.68];   // where the taper is held at the start (elbow bent, taper forward)

  // the relations, as data. Kinds: attached-to, held-by, supported-on, behind, aligned-with.
  // depth(name) gives each staged thing's depth toward the viewer for the current view; 'behind' is derived from it.
  function relations(g, depth) {
    const R = [
      { rel: 'supported-on', a: 'table', b: 'floor', hard: true },
      { rel: 'supported-on', a: 'cake', b: 'table', hard: true, note: 'cake x clamped to the top' },
      { rel: 'supported-on', a: 'girl.ankleN', b: 'floor', hard: true },
      { rel: 'supported-on', a: 'girl.ankleF', b: 'floor', hard: true },
      { rel: 'aligned-with', a: 'girl.centre-of-mass', b: 'girl.feet', hard: true },
      { rel: 'held-by', a: 'taper', b: 'girl.hand', hard: true },
      { rel: 'held-by', a: 'girl.taper-flame', b: 'light-pen', hard: false, note: 'the pen is where the rings put it' },
      { rel: 'aligned-with', a: 'arc', b: 'candle-height', hard: true }];
    CANDLES.forEach(c => R.push({ rel: 'attached-to', a: 'candle' + c.k, b: 'cake', hard: true }));
    if (g) CANDLES.forEach(c => { const w = wick(c.k, g.cakeX(), g.cakeTurn()); if (Math.abs(w[2]) < LIGHT_TOL) R.push({ rel: 'aligned-with', a: 'candle' + c.k, b: 'girl.reach-plane', hard: false }); });
    if (depth) {
      const names = ['table', 'cake', 'girl.farLeg', 'girl.nearLeg', 'girl.farArm', 'girl.torso', 'girl.head', 'girl.nearArm'].concat(CANDLES.map(c => 'candle' + c.k));
      const pairs = [['girl.farLeg', 'girl.nearLeg'], ['girl.farArm', 'girl.torso'], ['girl.torso', 'girl.nearArm'], ['girl.torso', 'girl.head'], ['table', 'cake']];
      pairs.forEach(([a, b]) => R.push({ rel: 'behind', a, b }));
      CANDLES.forEach(c => { R.push({ rel: 'behind', a: 'cake', b: 'candle' + c.k }); R.push(depth('candle' + c.k) < depth('girl.nearArm') ? { rel: 'behind', a: 'candle' + c.k, b: 'girl.nearArm' } : { rel: 'behind', a: 'girl.nearArm', b: 'candle' + c.k }); });
      R.push(depth('cake') < depth('girl.nearArm') ? { rel: 'behind', a: 'cake', b: 'girl.nearArm' } : { rel: 'behind', a: 'girl.nearArm', b: 'cake' });
      R.push(depth('table') < depth('girl.nearLeg') ? { rel: 'behind', a: 'table', b: 'girl.nearLeg' } : { rel: 'behind', a: 'girl.torso', b: 'table' });
      R.names = names;
    }
    return R;
  }
  // a draw order that honours every 'behind' relation (topological sort; ties keep the listed order)
  function stageOrder(R) {
    const names = R.names.slice(), before = {}; names.forEach(n => { before[n] = new Set(); });
    R.filter(r => r.rel === 'behind' && before[r.a] && before[r.b]).forEach(r => before[r.b].add(r.a));
    const out = [], done = new Set(), visiting = new Set();
    const visit = n => { if (done.has(n)) return; if (visiting.has(n)) return; visiting.add(n); before[n].forEach(visit); visiting.delete(n); done.add(n); out.push(n); };
    names.forEach(visit); return out;
  }

  /* ------------------------------------------------------------- constraint projections */
  const lerp = (a, b, t) => a + (b - a) * t;
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
    // torso: no folding forward past 50 deg from vertical, little backward lean
    const h = P[I.hip], c = P[I.chest], minUp = 0.30 * Math.cos(LEAN_MAX * Math.PI / 180);
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
    pull(I.neck, [c[0] + .02, c[1] + .067], .25);          // neck and head carried upright, a little forward, whatever the waist does
    pull(I.head, [P[I.neck][0] + .015, P[I.neck][1] + .099], .3);
    pull(I.elbowF, [c[0] - .01, c[1] - .20], .2); pull(I.wristF, [P[I.elbowF][0] + .02, P[I.elbowF][1] - .19], .2);   // far arm hangs
    [['kneeN', 'ankleN'], ['kneeF', 'ankleF']].forEach(([k, a]) => { const A = P[I[a]]; pull(I[k], [(A[0] + h[0]) / 2 + .012, (A[1] + h[1]) / 2], .04); });   // knees soft, nearly straight
    if (!goal) { pull(I.elbowN, [c[0] - .01, c[1] - .21], .2); pull(I.tipN, [c[0] + .035, c[1] - .475], .2); }
  }
  // Two tiers. Tier 1: the goal joins the hard set (the taper's flame is pinned to it) and the body must
  // satisfy every hard constraint around it; if that converges the goal is met exactly.
  // Tier 2, only when tier 1 cannot converge: the hand goes as far as it can along the line from where it is
  // toward the goal (bisection over tier-1 solves, 12 halvings), so it stops at the edge of what the body
  // allows, never jumps to some other pose. The gap left is the residual the operator panel shows.
  function tryPin(P, goal, sc) {
    const Q = P.map(p => p.slice()), wt = W[I.tipN]; W[I.tipN] = 0; Q[I.tipN] = goal.slice(); let ok = false;
    for (let k = 0; k < 1500; k++) { if (k < 200) softPass(Q, goal, false); hardSweep(Q, sc); Q[I.tipN] = goal.slice(); if (k > 200 && k % 20 === 0 && residuals(Q, sc).hardMax < 1e-6) { ok = true; break; } }
    W[I.tipN] = wt; if (!ok) return null;
    hardPass(Q, sc, 1500); return Q;
  }
  function solve(P, goal, sc) {
    const put = Q => Q.forEach((p, i) => { P[i][0] = p[0]; P[i][1] = p[1]; });
    let Q = tryPin(P, goal, sc), tier = 1;
    if (!Q) {
      tier = 2; const from = P[I.tipN].slice(); let lo = 0, hi = 1, best = null;
      for (let k = 0; k < 12; k++) { const u = (lo + hi) / 2, R = tryPin(P, [lerp(from[0], goal[0], u), lerp(from[1], goal[1], u)], sc); if (R) { lo = u; best = R; } else hi = u; }
      if (best) Q = best; else { Q = P.map(p => p.slice()); hardPass(Q, sc, 1500); }
    }
    put(Q); const r = measure(P, goal, sc); r.tier = tier; return r;
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
    const limit = Math.max(0, 0.30 * Math.cos(LEAN_MAX * Math.PI / 180) - (c[1] - h[1]), -0.05 - (c[0] - h[0]),
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
      if (r.lean > LEAN_MAX - 1) bind.push('WAIST AT LIMIT');
      const B = boxes(sc); if ([I.tipN, I.wristN, I.elbowN].some(i => B.some(bx => p_on(P[i], bx)))) bind.push('TOUCHING CAKE OR TABLE');
    }
    r.binding = bind; return r;
  }
  function p_on(p, bx) { const [x0, x1, y0, y1] = bx; return p[0] > x0 - 2e-3 && p[0] < x1 + 2e-3 && p[1] > y0 - 2e-3 && p[1] < y1 + 2e-3; }

  /* ------------------------------------------------------------- the game the device plays
     Channels are integers in detents. The hand turns a ring and moves a channel's TARGET one detent per
     detent passed (a quiet click); the machine then steps each busy channel's APPLIED value one detent at
     a time, 11.8 steps a second (23.6 when more than six behind), one click a step, re-solving the body
     after every step. Nothing ever jumps more than one detent per step. */
  const DET = { hand: 0.015, cake: 0.015, turn: 5, view: 5 };
  const RANGE = { handX: [-15, 48], handY: [-17, 30], cakeX: [-18, 18], cakeTurn: [-1e9, 1e9], view: [-7, 7] };
  function Game(opts) {
    opts = opts || {};
    const g = this; g.opts = opts; g.t = 0; g.clock = 0; g.events = []; g.trace = []; g.steps = 0;
    const st = opts.start || {};
    g.ch = { view: ch(0), handX: ch(st.handX || 0), handY: ch(st.handY || 0), cakeX: ch(st.cakeX != null ? st.cakeX : 14), cakeTurn: ch(st.cakeTurn != null ? st.cakeTurn : 25) };
    g.sel = 'HAND'; g.lit = CANDLES.map(() => false); g.phase = 'PLAY'; g.blowAt = 0; g.out = CANDLES.map(() => false);
    g.P = restPose(); g.status = 'SOLVED';
    // the start pose: solve from rest toward the starting pen point in small steps (not recorded)
    const goal = g.goal(), r0 = g.P[I.tipN].slice(); for (let k = 1; k <= 20; k++) solve(g.P, [lerp(r0[0], goal[0], k / 20), lerp(r0[1], goal[1], k / 20)], g.sc());
    g.last = solve(g.P, goal, g.sc()); g.status = g.last.solved ? 'SOLVED' : 'UNSOLVABLE';
  }
  const ch = v => ({ t: v, a: v });
  Game.prototype.emit = function (kind, extra) { const e = Object.assign({ t: +this.t.toFixed(4), kind }, extra || {}); this.events.push(e); if (this.opts.onEvent) this.opts.onEvent(e); };
  Game.prototype.cakeX = function () { return this.ch.cakeX.a * DET.cake; };
  Game.prototype.cakeTurn = function () { return this.ch.cakeTurn.a * DET.turn; };
  Game.prototype.viewDeg = function () { return this.ch.view.a * DET.view; };
  Game.prototype.goal = function () { return [REST_TIP[0] + this.ch.handX.a * DET.hand, REST_TIP[1] + this.ch.handY.a * DET.hand]; };
  Game.prototype.goalTarget = function () { return [REST_TIP[0] + this.ch.handX.t * DET.hand, REST_TIP[1] + this.ch.handY.t * DET.hand]; };
  Game.prototype.sc = function () { return { cakeX: this.cakeX() }; };
  Game.prototype.wicks = function () { return CANDLES.map(c => wick(c.k, this.cakeX(), this.cakeTurn())); };
  Game.prototype.flame = function () { return [this.P[I.tipN][0], this.P[I.tipN][1], 0]; };
  // which channel a ring drives depends on what SELECT has picked
  Game.prototype.channelFor = function (ring) {
    if (ring === 'scale') return 'view';
    if (ring === 'knurl') return this.sel === 'HAND' ? 'handX' : 'cakeX';
    return this.sel === 'HAND' ? 'handY' : 'cakeTurn';
  };
  Game.prototype.turn = function (ring, detents) {   // the hand passing detents on a ring
    if (this.phase === 'OFF') return 0; const name = this.channelFor(ring), c = this.ch[name], [lo, hi] = RANGE[name];
    const nt = Math.max(lo, Math.min(hi, c.t + detents)); if (nt === c.t) return 0; c.t = nt; this.emit('detent', { ring, channel: name, target: nt }); return 1;
  };
  Game.prototype.select = function () { this.sel = this.sel === 'HAND' ? 'CAKE' : 'HAND'; this.emit('select', { sel: this.sel }); };
  Game.prototype.hold = function () {   // HOLD: when all seven are lit, she blows them out; otherwise the machine refuses (a dull click)
    if (this.phase === 'ALL LIT') { this.phase = 'BLOWING'; this.blowAt = this.t + 0.35; this.emit('blow'); return true; }
    this.emit('refuse', { phase: this.phase }); return false;
  };
  Game.prototype.off = function () { this.phase = 'OFF'; this.emit('off'); };
  Game.prototype.remaining = function () { let n = 0; for (const k in this.ch) n = Math.max(n, Math.abs(this.ch[k].t - this.ch[k].a)); return n; };
  Game.prototype.tick = function (dt) {
    this.t += dt;
    if (this.phase === 'BLOWING') { const k = Math.floor((this.t - this.blowAt) / 0.07); if (k >= 0) CANDLES.forEach((c, i) => { if (i <= k && !this.out[i]) { this.out[i] = true; this.emit('out', { k: i }); } }); if (this.out.every(Boolean)) { this.phase = 'BLOWN'; this.emit('blown', { steps: this.steps, t: +this.t.toFixed(2) }); } }
    const n = this.remaining(); if (!n) { this.clock = 0; return; }
    const fast = n > FAR_STEPS, period = fast ? 1 / FAST : 1 / SLOW; this.clock += dt;
    while (this.clock >= period - 1e-9) { this.clock -= period; if (!this.step(fast)) { this.clock = 0; break; } }
  };
  Game.prototype.step = function (fast) {
    let moved = []; for (const k in this.ch) { const c = this.ch[k]; if (c.t !== c.a) { c.a += Math.sign(c.t - c.a); moved.push(k); } }
    if (!moved.length) return false;
    this.steps++; this.emit(fast ? 'step-fast' : 'step', { n: this.steps, moved });
    if (moved.length === 1 && moved[0] === 'view') { this.trace.push({ t: +this.t.toFixed(4), step: this.steps, moved, view: this.viewDeg() }); return true; }
    const before = this.P.map(p => p.slice()), goal = this.goal();
    const r = solve(this.P, goal, this.sc()); this.last = r;
    let move = 0; this.P.forEach((p, i) => { move = Math.max(move, len(sub(p, before[i]))); });
    const was = this.status; this.status = !r.solved ? 'UNSOLVABLE' : this.remaining() ? 'MOVING' : 'SOLVED';
    if (this.status === 'UNSOLVABLE' && was !== 'UNSOLVABLE') this.emit('strain', { residual: +r.goal.toFixed(4), binding: r.binding });
    if (r.solved && was === 'UNSOLVABLE') this.emit('satisfied', { what: 'pen' });
    if (this.status === 'SOLVED' && was !== 'SOLVED') this.emit('settled');
    // lighting: the taper's flame (in her plane) near a wick (anywhere in 3D)
    const f = this.flame(); let litNow = [];
    if (this.phase === 'PLAY') this.wicks().forEach((w, k) => { if (!this.lit[k] && Math.hypot(w[0] - f[0], w[1] - f[1], w[2] - f[2]) <= LIGHT_TOL) { this.lit[k] = true; litNow.push(k); this.emit('lit', { k, count: this.lit.filter(Boolean).length }); } });
    if (this.phase === 'PLAY' && this.lit.every(Boolean)) { this.phase = 'ALL LIT'; this.emit('all-lit', { steps: this.steps, t: +this.t.toFixed(2) }); }
    this.trace.push({ t: +this.t.toFixed(4), step: this.steps, fast: !!fast, moved, status: this.status, tier: r.tier,
      goal: goal.map(v => +v.toFixed(4)), tip: this.P[I.tipN].map(v => +v.toFixed(4)), cakeX: +this.cakeX().toFixed(4), cakeTurn: this.cakeTurn(),
      residual_goal: +r.goal.toExponential(3), hard_max: +r.hardMax.toExponential(3), worst_length: r.lenName, elbow_deg: +r.elbowDeg.toFixed(1), lean_deg: +r.lean.toFixed(1),
      com_x: +r.com.toFixed(4), support: r.support.map(v => +v.toFixed(3)), max_point_move: +move.toFixed(4), binding: r.binding, lit: litNow });
    return true;
  };
  Game.prototype.relations = function (depth) { return relations(this, depth); };

  const API = { LEAN_MAX, TT, TW, CAKE_R, CAKE_H, CANDLE_H, TOL, LIGHT_TOL, REST_TIP, PTS, I, BONES, ARM, CANDLES, CAKE_RANGE, ANKLE_N, ANKLE_F, DET, RANGE, SLOW, FAST,
    restPose, solve, measure, residuals, com, wick, relations, stageOrder, Game, SUPPORT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SK = API;
})(typeof window !== 'undefined' ? window : globalThis);
