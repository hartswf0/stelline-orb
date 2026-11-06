/* memory.js — the birthday world, Ana's device, and the birthday girl's decision machine.
   No DOM, no randomness outside a seeded generator. Shared by index.html (the game) and test.js (the model-based tests).
   Time base: fixed ticks of 1/30 s. Units: metres, y up, the table at the origin, Ana is the camera. */
(function (root, factory) { const M = factory(); if (typeof module === 'object' && module.exports) module.exports = M; else root.Memory = M; })(this, function () {
'use strict';
const TAU = Math.PI * 2, DT = 1 / 30;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const ease = (v, t, tc, dt) => v + (t - v) * (1 - Math.exp(-dt / tc));
const toward = (v, t, rate, dt) => v + clamp(t - v, -rate * dt, rate * dt);
const ang = (ax, az, bx, bz) => Math.atan2(bz - az, bx - ax);
const hyp = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ------------------------------------------------------------------ GEOMETRY */
const GEO = { tableTop: 0.45, tableR: 0.40, roomR: 2.45, look: { x: 0.8, y: 0.45, z: -0.2 }, camR: 2.95,
  girlStart: { x: 1.55, z: -0.3 }, kids: [[-0.36, -0.52], [0.02, -0.66], [0.38, -0.5]], reach: 0.58 };
/* Ana: the scale ring. 0 standing; 1..6 lowering to sitting on the floor; 7..12 kneeling and shuffling round toward her side (5 degrees a step). */
function anaPose(v) { const h = v <= 6 ? 1.55 - v * (0.95 / 6) : 0.78, yaw = v <= 6 ? 0 : (v - 6) * 5 * Math.PI / 180;
  return { x: GEO.look.x - 0.25 + Math.sin(yaw) * GEO.camR, z: GEO.look.z + Math.cos(yaw) * GEO.camR, h, yaw }; }
function anaWords(v) { return v === 0 ? 'STANDING' : v <= 2 ? 'STOOPING' : v <= 5 ? 'KNEELING' : v === 6 ? 'SITTING' : `KNEELING, ${(v - 6) * 5}° ROUND`; }

/* ------------------------------------------------------------------ THE DEVICE (as ana/index.html: hand detents, then the machine steps at 11.8/s) */
const TARGETS = ['ROOM', 'CAKE', 'CHILDREN', 'HER'];
const RANGES = { scale: [0, 12], ROOM_k: [0, 8], CAKE_k: [0, 8], CAKE_t: [0, 8], CHILDREN_k: [0, 3], CHILDREN_t: [-6, 6], HER_k: [0, 6] };
function slot(W, ring) { const t = TARGETS[W.sel]; if (ring === 'scale') return 'scale'; const k = t + (ring === 'knurl' ? '_k' : '_t'); return RANGES[k] ? k : null; }
function role(W, ring) { const t = TARGETS[W.sel], v = W.val;
  if (ring === 'scale') return ['WHERE YOU ARE', anaWords(v.scale)];
  if (ring === 'knurl') return t === 'ROOM' ? ['ROOM LIGHT', `${v.ROOM_k} OF 8`] : t === 'CAKE' ? ['CAKE TOWARD HER', `${Math.round(v.CAKE_k * 14)} CM`] :
    t === 'CHILDREN' ? ['CHILDREN IN', `${v.CHILDREN_k} OF 3`] : ['CALLING HER', v.HER_k ? `${v.HER_k} OF 6` : 'SILENT'];
  return t === 'CAKE' ? ['CAKE HEIGHT', v.CAKE_t ? `HELD UP ${v.CAKE_t * 9} CM` : 'ON THE TABLE'] : t === 'CHILDREN' ? ['THEIR TIME', `${v.CHILDREN_t > 0 ? '+' : ''}${v.CHILDREN_t} BEATS`] : ['—', '']; }

/* ------------------------------------------------------------------ THE SONG the children sing (Happy Birthday, public domain melody), 3/4 */
const BEAT = 0.33;
const SONG = (() => { const G4 = 392, A4 = 440, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99;
  const L = [[[G4, .75], [G4, .25], [A4, 1], [G4, 1], [C5, 1], [B4, 2]], [[G4, .75], [G4, .25], [A4, 1], [G4, 1], [D5, 1], [C5, 2]],
    [[G4, .75], [G4, .25], [G5, 1], [E5, 1], [C5, 1], [B4, 1], [A4, 2]], [[F5, .75], [F5, .25], [E5, 1], [C5, 1], [D5, 1], [C5, 3]]];
  const notes = []; let b = 0; L.forEach((ln, li) => { ln.forEach(([f, d], ni) => { notes.push({ b, f, d, li, ni }); b += d; }); b += 1; });
  return { notes, len: b + 2, last: notes[notes.length - 1].b }; })();

/* ------------------------------------------------------------------ THE GIRL: declared states, sub-states, transitions, guards, action windows */
const STATES = ['watch', 'approach', 'retreat', 'hide', 'refuse', 'blow'];
const SUBS = { watch: ['look'], approach: ['walk', 'slow', 'arrive'], retreat: ['back'], hide: ['lower', 'hidden', 'peek'], refuse: ['turn', 'sulk', 'glance'], blow: ['inhale', 'blow', 'after'] };
const ALLOWED = { watch: ['approach', 'retreat', 'hide', 'refuse', 'blow'], approach: ['watch', 'retreat', 'refuse', 'blow'], retreat: ['watch', 'refuse', 'hide'],
  hide: ['watch', 'refuse', 'retreat'], refuse: ['watch', 'hide', 'retreat'], blow: ['watch', 'refuse'] };
const GUARDS = { approach: 'has seen the cake low and still for 1.5 s; candles lit; fear < 0.35; pressure < 0.15',
  blow: 'at the table, cake low within reach, candles lit, quiet for 1.5 s, fear < 0.3', retreat: 'room behind her (not at the wall)',
  watch: 'always', hide: 'always', refuse: 'always' };
const DWELL = { watch: 0.8, approach: 1.0, retreat: 0.7, hide: 2.2, refuse: 1.6, blow: 0 };
const DANGER = { retreat: 1, refuse: 1 }, HYST = 0.12;
const WINDOW = { inhale: 0.8, blow: 1.1, after: 1.3 };   // the blow's action window; only the inhale can be cut short (by pressure)
/* tuned constants (tune.js searches some of these; the proof uses the values here) */
const K = { callBase: 0.45, callPer: 0.06, clickP: 0.032, pushGain: 2.4, pDecay: 1.4, uTc: 1.6, uRise: 4.5, fRise: 0.35, fFall: 2.6, fFallSing: 0.7,
  trustGain: 0.32, trustErode: 0.7, memStep: 0.14, peekC: 0.36 };

function createGirl(seed) {
  const g = { t: 0, st: 'watch', sub: 'look', since: 0, subSince: 0, rnd: rng(seed || 7),
    x: GEO.girlStart.x, z: GEO.girlStart.z, th: 0, psi: 0, speed: 0, leg: 0, sit: 0, headDown: 0, cross: 0, hug: 0, tableHands: 0, together: 0,
    inhale: 0, mouth: 0, smile: 0, lean: 0, crouch: 0,
    P: 0, U: 0.25, F: 0.15, M: 0, C: 0.3, T: 0.2, A: 0, quiet: 10, push: 0, lastPushEv: -9,
    wm: null, heard: [], threat: 'ana', atTableFor: 0, cakeStill: 5, gazeT: 0, gazeAt: 'cake', glanceAt: -9, peekAt: -9, after: false,
    blowStart: 0, puffs: [], u: {}, guards: {}, vis: {}, trans: [], samples: [], lastSample: -1, pushes: 0 };
  g.th = ang(g.x, g.z, 0, 0); return g; }

/* ------------------------------------------------------------------ WORLD */
function createWorld(opts) { opts = opts || {};
  const W = { t: 0, sel: 1, val: { scale: 0, ROOM_k: 8, CAKE_k: 0, CAKE_t: 6, CHILDREN_k: 0, CHILDREN_t: 0, HER_k: 0 },
    rings: { scale: { target: 0, applied: 0 }, knurl: { target: 0, applied: 0 }, tri: { target: 0, applied: 0 } }, stepClock: 0,
    cake: { x: 0, z: 0, y: 0, vx: 0, vz: 0, dirx: 1, dirz: 0 }, candles: [1, 1, 1, 1, 1, 1, 1], kids: [0, 0, 0], hold: false, off: 0, offAt: 0,
    songBeat: -1, songRound: 0, lastCall: -9, cue: 0, callClock: 0, events: [], log: [], girl: createGirl(opts.seed), ended: 0, keep: !!opts.keepEvents };
  const d = Math.hypot(W.girl.x, W.girl.z); W.cake.dirx = W.girl.x / d; W.cake.dirz = W.girl.z / d;
  cakeTarget(W); W.cake.x = W.cake.tx; W.cake.z = W.cake.tz; W.cake.y = W.cake.ty; select(W, 1, true); return W; }
function ev(W, k, a) { const e = Object.assign({ t: +W.t.toFixed(4), k }, a || {}); W.events.push(e); W.log.push(e); }
function cakeTarget(W) { const c = W.cake; c.tx = c.dirx * W.val.CAKE_k * 0.14; c.tz = c.dirz * W.val.CAKE_k * 0.14; c.ty = GEO.tableTop + W.val.CAKE_t * 0.09; }
function select(W, i, silent) { W.sel = ((i % TARGETS.length) + TARGETS.length) % TARGETS.length;
  ['knurl', 'tri'].forEach(r => { const s = slot(W, r), v = s ? W.val[s] : 0; W.rings[r].target = W.rings[r].applied = v; }); if (!silent) ev(W, 'select', { to: TARGETS[W.sel] }); }
/* a hand detent on a ring: the hand sets where the machine must go */
function turn(W, ring, steps) { const s = slot(W, ring); if (!s) { ev(W, 'dead', { ring }); return; } const [a, b] = RANGES[s], R = W.rings[ring];
  const nt = clamp(R.target + steps, a, b); const n = Math.abs(nt - R.target); R.target = nt; for (let i = 0; i < n; i++) ev(W, 'hand', { ring }); }
function holdPress(W, long) { if (long) { W.offAt = W.t; ev(W, 'off'); return; } W.hold = !W.hold; ev(W, 'hold', { on: W.hold }); }
/* one machine step on a ring: the value moves one step, and the step clicks where the thing it moves is */
function applyStep(W, ring, dir, fast) { const s = slot(W, ring); if (!s) return; W.val[s] += dir; const g = W.girl; let src;
  if (s === 'CAKE_k' && dir > 0) { const d = Math.hypot(g.x, g.z); W.cake.dirx = g.x / d; W.cake.dirz = g.z / d; }
  if (s.startsWith('CAKE')) { cakeTarget(W); src = { x: W.cake.tx, z: W.cake.tz }; }
  else if (s === 'scale') { const a = anaPose(W.val.scale); src = { x: a.x, z: a.z }; }
  else if (s.startsWith('CHILDREN')) src = { x: 0, z: -0.6 };
  else if (s === 'HER_k') { const a = anaPose(W.val.scale); src = { x: a.x, z: a.z }; if (dir > 0 && W.t - W.lastCall > 0.6) callOut(W); }
  else src = { x: GEO.look.x, z: GEO.look.z };   // the room light: overhead
  if (s === 'CHILDREN_t' && W.songBeat >= 0) W.songBeat = ((W.songBeat + dir) % SONG.len + SONG.len) % SONG.len;
  ev(W, 'click', { ring, fast, sx: src.x, sz: src.z });
  W.girl.heard.push({ at: W.t + 0.1, kind: 'click', fast, x: src.x, z: src.z }); }
function callOut(W) { const v = W.val.HER_k; ev(W, 'call', { v }); W.girl.heard.push({ at: W.t + 0.1, kind: 'call', v }); W.callClock = 0; W.lastCall = W.t; }

function stepWorld(W, dt) { dt = dt || DT; W.t += dt;
  // the device steps toward what the hand set: 11.8 a second, 23.6 when far
  W.stepClock += dt; const busy = Object.keys(W.rings).filter(r => W.rings[r].target !== W.rings[r].applied);
  if (!busy.length) W.stepClock = 0; else { const fast = busy.some(r => Math.abs(W.rings[r].target - W.rings[r].applied) > 6), per = fast ? 1 / 23.6 : 1 / 11.8;
    while (W.stepClock >= per) { W.stepClock -= per; busy.forEach(r => { const R = W.rings[r]; if (R.target === R.applied) return; const d = Math.sign(R.target - R.applied); R.applied += d; applyStep(W, r, d, fast); }); } }
  // calling: while the HER ring is above zero, Ana keeps calling, more often the higher it is
  if (W.val.HER_k > 0) { W.callClock += dt; if (W.callClock >= 3.2 - 0.4 * W.val.HER_k) callOut(W); } else W.callClock = 0;
  // the cake eases to where the steps put it
  const c = W.cake, px = c.x, pz = c.z; c.x = ease(c.x, c.tx, 0.12, dt); c.z = ease(c.z, c.tz, 0.12, dt); c.y = ease(c.y, c.ty, 0.12, dt); c.vx = (c.x - px) / dt; c.vz = (c.z - pz) / dt;
  // children: brought in one by one, each arriving over 1.2 s
  for (let i = 0; i < 3; i++) { const was = W.kids[i]; W.kids[i] = toward(W.kids[i], i < W.val.CHILDREN_k ? 1 : 0, 1 / 1.2, dt); if (was < 1 && W.kids[i] >= 1) ev(W, 'arrive', { i }); }
  const present = W.kids.filter(k => k >= 1).length, singing = present > 0 && !W.hold && !W.offAt;
  if (W.val.CHILDREN_k === 0 && W.kids.every(k => k === 0)) W.songBeat = -1;
  if (singing) { if (W.songBeat < 0) { W.songBeat = 0; ev(W, 'songStart'); } const b0 = W.songBeat; W.songBeat += dt / BEAT;
    SONG.notes.forEach(n => { if (n.b >= b0 && n.b < W.songBeat) ev(W, 'note', { f: n.f, d: n.d * BEAT, n: present, li: n.li, ni: n.ni }); });
    if (W.songBeat >= SONG.len) { W.songBeat -= SONG.len; W.songRound++; } }
  const inCue = singing && W.songBeat >= SONG.last - 1 && W.songBeat < SONG.last + 3; W.cue = inCue ? 1 : W.cue * Math.exp(-dt / 0.5);
  // switching off: dark, then the memory starts again empty-handed (she starts again too)
  if (W.offAt) { W.off = clamp((W.t - W.offAt) / 1.0); if (W.t - W.offAt > 1.6) { const keepLog = W.log, t = W.t; Object.assign(W, createWorld({ seed: 7, keepEvents: W.keep })); W.t = t; W.log = keepLog; ev(W, 'restart'); } return; }
  const ana = anaPose(W.val.scale);
  const world = { t: W.t, ana, cake: { x: c.x, z: c.z, y: c.y, vx: c.vx, vz: c.vz }, lit: W.candles.reduce((a, b) => a + b, 0), L: W.val.ROOM_k / 8,
    kids: present, kidsArriving: W.kids.reduce((a, b) => a + b, 0), singing, cue: W.cue, sel: TARGETS[W.sel] };
  stepGirl(W.girl, world, dt, W);
  if (!W.ended && world.lit === 0) W.ended = W.t; }

/* ------------------------------------------------------------------ THE GIRL'S TICK: perceive, feel, decide, move */
function stepGirl(g, w, dt, W) { g.t = w.t; const out = (k, a) => ev(W, k, Object.assign({ who: 'her' }, a || {}));
  if (!g.wm) g.wm = { anaH: w.ana.h, cakeH: w.cake.y - GEO.tableTop, cakeD: hyp(g.x, g.z, w.cake.x, w.cake.z), kids: w.kids, L: w.L };
  /* PERCEPTION. Seeing goes where her head points, and needs her eyes up; hearing is all round, 0.1 s late. */
  const hd = g.th + g.psi, eyes = 1 - 0.95 * g.headDown;
  const see = (x, z, gain) => clamp(0.5 + 0.7 * Math.cos(wrap(ang(g.x, g.z, x, z) - hd))) * eyes * gain;
  const vA = see(w.ana.x, w.ana.z, 0.25 + 0.75 * w.L), vC = see(w.cake.x, w.cake.z, w.lit ? 1 : 0.3 + 0.7 * w.L), vK = see(0, -0.58, 0.4 + 0.6 * w.L + 0.3 * w.lit / 7);
  g.vis = { ana: vA, cake: vC, kids: vK };
  const wm = g.wm, k = r => Math.min(1, 6 * r * dt), prevH = wm.cakeH;
  wm.anaH += (w.ana.h - wm.anaH) * k(vA); wm.cakeH += (w.cake.y - GEO.tableTop - wm.cakeH) * k(vC);
  const dC = hyp(g.x, g.z, w.cake.x, w.cake.z); wm.cakeD += (dC - wm.cakeD) * k(Math.max(vC, dC < 0.6 ? 1 : 0)); wm.kids += (w.kids - wm.kids) * k(Math.max(vK, w.singing ? 1 : 0)); wm.L = w.L;
  // the cake coming at her: its own velocity toward her, felt if she sees it or it is within 0.6 m
  const ux = (g.x - w.cake.x) / (dC || 1), uz = (g.z - w.cake.z) / (dC || 1), vt = w.cake.vx * ux + w.cake.vz * uz;
  const pushNow = clamp(vt / 0.3) * clamp((1.8 - dC) / 1.2) * Math.max(vC, dC < 0.6 ? 1 : 0);
  g.push = ease(g.push, pushNow, 0.15, dt);
  // what she hears now
  let callHeard = 0, clickP = 0; g.heard = g.heard.filter(h => { if (h.at > w.t) return true;
    if (h.kind === 'call') callHeard = Math.max(callHeard, K.callBase + K.callPer * h.v);
    else { const d = hyp(g.x, g.z, h.x, h.z); clickP += K.clickP * (h.fast ? 1.6 : 1) * clamp((1.6 - d) / 1.1); } return false; });
  /* DRIVES */
  const pushedEvent = callHeard > 0 || (g.push > 0.35 && w.t - g.lastPushEv > 1);
  if (pushedEvent) { g.M = Math.min(1, g.M + K.memStep); g.lastPushEv = w.t; g.quiet = 0; g.pushes++; g.threat = callHeard > 0 ? 'ana' : 'cake'; }
  if (clickP > 0.02) { g.quiet = Math.min(g.quiet, 0.5); g.threat = g.push > 0.1 ? 'cake' : g.threat; }
  g.quiet += dt;
  g.P = Math.min(1.5, (g.P + callHeard + g.push * dt * K.pushGain + clickP) * Math.exp(-dt / K.pDecay));
  const standing = clamp((wm.anaH - 0.85) / 0.6);
  const looming = clamp((wm.cakeH - 0.2) / 0.5) * clamp((1.6 - wm.cakeD) / 1.0);
  const Ut = 0.5 * standing + 0.3 * w.L + 0.4 * looming; g.U = ease(g.U, Ut, Ut > g.U ? K.uRise : K.uTc, dt);
  const Ft = clamp(0.9 * g.P + 0.7 * g.U + 0.3 * g.M * Math.min(1, g.P * 4)); g.F = ease(g.F, Ft, Ft > g.F ? K.fRise : (w.singing ? K.fFallSing : K.fFall), dt);
  const cakeLow = wm.cakeH < 0.12; g.cakeStill = g.push > 0.05 ? 0 : g.cakeStill + dt;
  g.A = (w.lit / 7) * (1 - 0.7 * w.L) * (0.4 + 0.6 * (cakeLow ? 1 : 0));
  g.C *= Math.exp(-dt / 5);
  if (w.singing && !g._sing) g.C += 0.5; g._sing = w.singing;
  if (w.kidsArriving > (g._kids || 0) + 0.5) { g.C += 0.25; g._kids = w.kidsArriving; } if (w.kidsArriving < (g._kids || 0)) g._kids = w.kidsArriving;
  if (g._L != null && w.L < g._L) g.C += 0.7 * (g._L - w.L); g._L = w.L;
  if (wm.cakeH < prevH) g.C += 1.0 * (prevH - wm.cakeH);
  g.C = clamp(Math.max(g.C, 0.25 * g.A, w.singing ? 0.35 : 0), 0, 1.2);
  const inv = 0.35 * (1 - standing) + 0.35 * (w.singing ? Math.min(1, 0.5 + w.kids / 6) : 0) + 0.25 * (cakeLow ? 1 : 0) + 0.2 * (1 - w.L) + 0.15 * clamp((g.quiet - 3) / 3);
  g.T = clamp(g.T + (K.trustGain * inv * Math.pow(1 - g.F, 2) * (1 - 0.5 * g.M) - K.trustErode * g.P - 0.1 * looming) * dt);
  /* UTILITIES and GUARDS */
  const away = threatAngle(g, w) + Math.PI, bx = g.x + Math.cos(away) * 0.5, bz = g.z + Math.sin(away) * 0.5;
  const rb = clamp((GEO.roomR - Math.hypot(bx, bz)) / 0.5) * (Math.hypot(bx, bz) > GEO.tableR + 0.2 ? 1 : 0);
  const atTable = Math.hypot(g.x, g.z) < GEO.reach + 0.06; g.atTableFor = atTable && g.speed < 0.05 ? g.atTableFor + dt : 0;
  const u = g.u = {
    watch: 0.35 + 0.45 * g.C * (1 - g.F),
    retreat: (1.6 * g.push + 0.3 * g.P) * (0.5 + g.F) * rb,
    refuse: 1.3 * g.P * (0.5 + g.F) + 0.9 * g.M * g.P + 0.3 * g.push * (1 - rb),
    hide: 0.95 * (g.U - 0.3) + 0.45 * g.F * (1 - clamp(g.P * 2)),
    approach: 2.2 * (g.T - 0.55) + 0.5 * g.A + 0.2 * g.C - 2 * g.F,
    blow: 1.8 * (g.T - 0.45) + 1.0 * w.cue + 0.4 * g.A + 0.3 * clamp(g.atTableFor / 6) - 2 * g.F };
  if (g.st === 'refuse') u.refuse += 0.15 + 0.3 * g.F; if (g.st === 'hide') u.hide += 0.15 + 0.25 * g.F;
  const inA = g.st === 'approach';
  const G = g.guards = { watch: true, hide: true, refuse: true, retreat: rb > 0.05,
    approach: cakeLow && g.cakeStill > (inA ? 0.3 : 1.5) && w.lit > 0 && g.F < (inA ? 0.45 : 0.35) && g.P < (inA ? 0.2 : 0.15),
    blow: atTable && dC < 0.75 && w.lit > 0 && cakeLow && g.quiet > 1.5 && g.F < 0.3 };
  /* DECIDE (from the declared state only) */
  const prev = g.st, prevSub = g.sub;
  if (g.st === 'blow') blowWindow(g, w, out); else { const nx = decide(g); if (nx !== g.st) enter(g, nx, w, out); }
  subStates(g, w, out);
  if (g.st !== prev || g.sub !== prevSub) { const r = x => Math.round(x * 1000) / 1000, uu = {}; for (const s in u) uu[s] = r(u[s]);
    g.trans.push({ t: r(w.t), from: prev + '.' + prevSub, to: g.st + '.' + g.sub, util: uu, guards: Object.assign({}, G),
      drives: { P: r(g.P), U: r(g.U), F: r(g.F), M: r(g.M), C: r(g.C), T: r(g.T), A: r(g.A) }, believes: { anaH: r(wm.anaH), cakeH: r(wm.cakeH) } }); }
  body(g, w, dt, out);
  if (w.t - g.lastSample >= 0.1 - 1e-6) { g.lastSample = w.t; const r = x => Math.round(x * 1000) / 1000;
    g.samples.push({ t: r(w.t), st: g.st, sub: g.sub, P: r(g.P), U: r(g.U), F: r(g.F), M: r(g.M), C: r(g.C), T: r(g.T), A: r(g.A), x: r(g.x), z: r(g.z), u: Object.fromEntries(Object.entries(u).map(([a, b]) => [a, r(b)])) }); if (g.samples.length > 3000) g.samples.shift(); }
}
function threatAngle(g, w) { return g.threat === 'cake' ? ang(g.x, g.z, w.cake.x, w.cake.z) : ang(g.x, g.z, w.ana.x, w.ana.z); }
function decide(g) { const u = g.u, G = g.guards, cur = g.st, age = g.t - g.since;
  let best = cur, bu = G[cur] ? u[cur] + HYST : -Infinity; const locked = G[cur] && age < DWELL[cur];
  for (const s of ALLOWED[cur]) { if (!G[s]) continue; const v = u[s]; if (locked && !(DANGER[s] && !DANGER[cur] && v > u[cur] + 0.25)) continue; if (v > bu) { bu = v; best = s; } }
  if (bu === -Infinity) best = 'watch'; return best; }
function enter(g, s, w, out) { g.st = s; g.since = g.t; g.sub = SUBS[s][0]; g.subSince = g.t;
  if (s === 'refuse') out('hum'); else if (s === 'retreat') out('gasp'); else if (s === 'hide') out('rustle'); else if (s === 'blow') { g.blowStart = g.t; out('inhale'); }
  else if (s === 'approach') out('breath'); }
function setSub(g, s, out) { if (g.sub === s) return; g.sub = s; g.subSince = g.t; if (s === 'peek') out('breath', { soft: 1 }); if (s === 'blow') out('blow'); if (s === 'after') out('giggle'); if (s === 'arrive') out('breath'); }
function blowWindow(g, w, out) { const a = g.t - g.blowStart;
  if (g.sub === 'inhale' && g.P > 0.22) { g.M = Math.min(1, g.M + 0.2); enter(g, 'refuse', w, out); return; }   // pressed while drawing breath: she gives it up
  if (a >= WINDOW.inhale && g.sub === 'inhale') { setSub(g, 'blow', out); g.puffs = []; for (let i = 0; i < 7; i++) g.puffs.push(g.t + 0.12 + i * 0.1); }
  if (g.sub === 'blow') { g.puffs = g.puffs.filter((pt, i) => { if (g.t >= pt) { out('puff', { i: 7 - g.puffs.length }); return false; } return true; }); if (a >= WINDOW.inhale + WINDOW.blow) setSub(g, 'after', out); }
  if (g.sub === 'after' && a >= WINDOW.inhale + WINDOW.blow + WINDOW.after) { g.after = true; enter(g, 'watch', w, out); } }
function subStates(g, w, out) { const age = g.t - g.subSince;
  if (g.st === 'refuse') { if (g.sub === 'turn' && age > 0.6) setSub(g, 'sulk', out);
    else if (g.sub === 'sulk' && g.C > 0.45 && g.P < 0.12 && g.t - g.glanceAt > 2.2 && age > 1.2) { setSub(g, 'glance', out); g.glanceAt = g.t; }
    else if (g.sub === 'glance' && age > 1.1) setSub(g, 'sulk', out); }
  if (g.st === 'hide') { if (g.sub === 'lower' && age > 0.8) setSub(g, 'hidden', out);
    else if (g.sub === 'hidden' && ((g.C > K.peekC && g.t - g.peekAt > 1.6) || (g.C > 0.2 && g.t - g.peekAt > 6)) && age > 0.6) { setSub(g, 'peek', out); g.peekAt = g.t; g.peekN = (g.peekN || 0) + 1; }
    else if (g.sub === 'peek' && age > 1.3) setSub(g, 'hidden', out); }
  if (g.st === 'approach') { const d = Math.hypot(g.x, g.z) - GEO.reach; setSub(g, d < 0.04 && g.speed < 0.06 ? 'arrive' : d < 0.3 ? 'slow' : 'walk', out); } }

/* ------------------------------------------------------------------ BODY: posture follows state and drives; position only by walking */
function body(g, w, dt, out) {
  let thT = g.th, vT = 0, back = false, sitT = 0, hdT = 0, crossT = 0, hugT = 0, tabT = 0, togT = g.after ? 1 : 0, leanT = 0, inhT = 0, mouthT = 0;
  const toCake = ang(g.x, g.z, w.cake.x, w.cake.z), th = threatAngle(g, w);
  // where the head goes: a gaze scheduler weighted by what matters to her now
  if (g.t >= g.gazeT) { const r = g.rnd(), wts = { cake: 0.4 + g.A + (w.lit ? 0.2 : 0), ana: 0.2 + g.U + g.P, kids: w.kids ? 0.3 + (w.singing ? 0.6 : 0) : 0 };
    let s = wts.cake + wts.ana + wts.kids, x = r * s; g.gazeAt = (x -= wts.cake) < 0 ? 'cake' : (x -= wts.ana) < 0 ? 'ana' : 'kids'; g.gazeT = g.t + 1.2 + g.rnd() * 1.4; }
  const gazeAng = g.gazeAt === 'cake' ? toCake : g.gazeAt === 'ana' ? ang(g.x, g.z, w.ana.x, w.ana.z) : ang(g.x, g.z, 0, -0.58);
  let psiT = clamp(wrap(gazeAng - g.th), -1.3, 1.3);
  switch (g.st) {
    case 'watch': if (Math.abs(wrap(toCake - g.th)) > 0.7 || g.after) thT = toCake; hdT = 0.15 * g.F; crossT = g.after ? 0 : 0.3 * g.F; break;
    case 'approach': { const r = Math.hypot(g.x, g.z), tx = g.x / r * GEO.reach, tz = g.z / r * GEO.reach, d = r - GEO.reach; thT = ang(g.x, g.z, tx, tz);
      vT = d < 0.02 ? 0 : d < 0.3 ? 0.2 : 0.45; psiT = clamp(wrap(toCake - g.th), -1.3, 1.3); tabT = g.sub === 'arrive' ? 1 : 0; break; }
    case 'retreat': thT = th; vT = 0.38; back = true; psiT = clamp(wrap(th - g.th), -1.3, 1.3); hdT = 0.1; break;
    case 'hide': sitT = 1; hugT = 1; hdT = g.sub === 'peek' ? 0.15 : 1; psiT = g.sub === 'peek' ? clamp(wrap((w.singing && g.peekN % 2 ? ang(g.x, g.z, 0, -0.58) : ang(g.x, g.z, w.ana.x, w.ana.z)) - g.th), -1.9, 1.9) : 0; break;
    case 'refuse': thT = th + Math.PI; crossT = 1; hdT = g.sub === 'glance' ? 0.05 : 0.55; psiT = g.sub === 'glance' ? clamp(wrap(th - g.th), -1.9, 1.9) : 0; break;
    case 'blow': thT = toCake; tabT = 1; leanT = g.sub === 'after' ? 0.2 : 1; inhT = g.sub === 'inhale' ? 1 : 0; mouthT = g.sub === 'blow' ? 1 : 0; psiT = clamp(wrap(toCake - g.th), -1, 1); break; }
  // rising before anything else: a seated child cannot turn or walk
  g.sit = toward(g.sit, sitT, 1 / 0.65, dt); const standing = g.sit < 0.25;
  if (standing) { const dth = wrap(thT - g.th), rate = g.st === 'refuse' ? 4.2 : 3.0; g.th = wrap(g.th + clamp(dth, -rate * dt, rate * dt)); }
  const aligned = Math.abs(wrap(thT - g.th)) < 0.9;
  const sp = standing && aligned && g.sit < 0.05 ? vT : 0; g.speed = toward(g.speed, sp, 1.5, dt);
  if (g.speed > 0) { const dir = back ? g.th + Math.PI : g.th; let nx = g.x + Math.cos(dir) * g.speed * dt, nz = g.z + Math.sin(dir) * g.speed * dt;
    const r = Math.hypot(nx, nz); if (r < GEO.reach) { nx *= GEO.reach / r; nz *= GEO.reach / r; } if (r > GEO.roomR) { nx *= GEO.roomR / r; nz *= GEO.roomR / r; }
    const moved = Math.hypot(nx - g.x, nz - g.z); g.x = nx; g.z = nz; const l0 = g.leg; g.leg += (back ? -1 : 1) * moved / 0.2 * Math.PI;
    if (Math.floor(l0 / Math.PI) !== Math.floor(g.leg / Math.PI)) out('step', { soft: g.st === 'approach' && g.sub === 'slow' ? 1 : 0 }); }
  g.psi = ease(g.psi, psiT, 0.12, dt); g.headDown = ease(g.headDown, hdT, 0.25, dt); g.cross = ease(g.cross, crossT, 0.25, dt); g.hug = ease(g.hug, hugT, 0.2, dt);
  g.tableHands = ease(g.tableHands, tabT, 0.25, dt); g.together = ease(g.together, togT, 0.3, dt); g.lean = ease(g.lean, leanT, 0.3, dt);
  g.inhale = ease(g.inhale, inhT, 0.3, dt); g.mouth = ease(g.mouth, mouthT, 0.06, dt); g.smile = ease(g.smile, g.after ? 1 : 0, 0.4, dt); g.crouch = ease(g.crouch, g.F, 0.4, dt);
}
/* the girl's puffs put the candles out, one by one */
function applyGirlEvents(W) { W.events.forEach(e => { if (e.k === 'puff' && W.candles[e.i]) { W.candles[e.i] = 0; if (W.candles.every(c => !c)) ev(W, 'out'); } }); }
function step(W, dt) { if (!W.keep) W.events.length = 0; stepWorld(W, dt); applyGirlEvents(W); }

return { DT, GEO, TARGETS, RANGES, SONG, BEAT, STATES, SUBS, ALLOWED, GUARDS, DWELL, WINDOW, K, createWorld, step, select, turn, holdPress, slot, role, anaPose, anaWords, decide, clamp, wrap, ang };
});
