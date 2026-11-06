/* THE BLOW — the game, played on the memory maker's device. Shared by index.html and the node tests / proof renderer.
   Inputs are only the device's: three rings (turned by hand in detents; the machine then steps to the value at 11.8/s),
   SELECT (short: next thing; long: next MLS family for that thing's surface), HOLD (short: blow; long: switch off),
   and the left collar (SCENE plays the demonstration through the same rings, CLEAR relights and resets).
   Goal: shape one breath so all seven flames go out. Three breaths at most. */
(function (root) {
  const S = root.SCENE || require('./scene.js'), MLS = root.MLS || require('./mls.js');
  const TARGETS = ['STREAMER', 'CHEEKS', 'LIPS', 'FLAMES'];
  const SURF_OF = { STREAMER: 'paper', CHEEKS: 'face', LIPS: 'face', FLAMES: 'flame' };
  const OUT_ORDER = [3, 2, 4, 1, 5, 0, 6];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function Game(opts) {
    opts = opts || {};
    const G = this, H = S.buildHandles(); G.H = H; G.alpha = 1;
    G.emit = opts.emit || (() => { }); G.now = 0; G.log = [];
    // channels: what the hand set (target) and what the machine has reached (applied); shown eases to applied in 40 ms
    const ch = (min, max, v) => ({ min, max, target: v, applied: v, shown: v });
    G.C = { 'STREAMER.k': ch(0, 16, 0), 'STREAMER.t': ch(-4, 4, 0), 'CHEEKS.k': ch(0, 10, 0), 'AIM': ch(-6, 6, 0), 'LIPS.k': ch(0, 10, 0), 'FLAMES.k': ch(0, 7, 7), 'FLAMES.t': ch(-2, 2, 0), 'YAW': ch(-6, 6, 0) };
    G.RINGS = [{ id: 'scale', ix: 0, deg: 5, ang: 0 }, { id: 'knurl', ix: 1, deg: 9, ang: 0 }, { id: 'tri', ix: 2, deg: 6, ang: 0 }];
    G.sel = 1; G.hold = false; G.stepClock = 0; G.lastWork = -9;
    // worlds: 0 is the player's (families chosen per surface); 1..3 are the same inputs under one family everywhere
    G.worlds = [{ name: 'YOURS', fam: { face: S.SURF.face.family, flame: S.SURF.flame.family, paper: S.SURF.paper.family } }]
      .concat(S.FAMILIES.map(f => ({ name: f.toUpperCase(), fam: { face: f, flame: f, paper: f } })));
    G.reset();
  }
  Game.prototype.ev = function (kind, extra) { const e = Object.assign({ t: this.now, kind }, extra || {}); this.log.push(e); this.emit(e); };
  Game.prototype.reset = function () {
    const G = this; for (const k in G.C) { const c = G.C[k], v = k === 'FLAMES.k' ? 7 : 0; c.target = c.applied = c.shown = v; }
    G.worlds.forEach(w => { w.lit = [1, 1, 1, 1, 1, 1, 1]; w.outAt = [null, null, null, null, null, null, null]; w.plan = null; w.meas = null; });
    G.breath = null; G.breaths = 0; G.result = null; G.wonAt = null; G.offAt = null; G.dark = 0; G.anims = []; G.script = null;
    G.select(1, true);
  };
  Game.prototype.chanFor = function (ring) { const t = TARGETS[this.sel];
    if (ring.id === 'scale') return 'YAW'; if (ring.id === 'knurl') return t + '.k'; return t === 'CHEEKS' || t === 'LIPS' ? 'AIM' : t + '.t'; };
  Game.prototype.select = function (i, silent) { const G = this; G.sel = (i + TARGETS.length) % TARGETS.length;
    G.RINGS.forEach(r => { r.ang = G.C[G.chanFor(r)].target * r.deg; }); if (!silent) G.ev('select'); G.lastWork = G.now; };
  Game.prototype.cycleFamily = function () { const G = this, surf = SURF_OF[TARGETS[G.sel]], w = G.worlds[0], i = S.FAMILIES.indexOf(w.fam[surf]);
    w.fam[surf] = S.FAMILIES[(i + 1) % 3]; G.ev('family', { surf, fam: w.fam[surf] }); G.lastWork = G.now; };
  // the hand turns a ring by dDeg; each detent passed is a quiet click and moves the target
  Game.prototype.handTurn = function (ring, dDeg) { const G = this, c = G.C[G.chanFor(ring)], before = Math.round(ring.ang / ring.deg);
    ring.ang = clamp(ring.ang + dDeg, c.min * ring.deg, c.max * ring.deg); const after = Math.round(ring.ang / ring.deg);
    if (after !== before) { G.ev('detent', { ring: ring.ix }); c.target = clamp(after, c.min, c.max); G.lastWork = G.now; } };
  // the machine: every channel not at its target steps one value at 11.8/s (23.6/s when far), one click per step
  Game.prototype.machine = function (dt) { const G = this; G.stepClock += dt;
    const busy = Object.keys(G.C).filter(k => G.C[k].target !== G.C[k].applied); if (!busy.length) { G.stepClock = 0; return; }
    const fast = busy.some(k => Math.abs(G.C[k].target - G.C[k].applied) > 6), period = fast ? 1 / 23.6 : 1 / S.STEP_HZ;
    while (G.stepClock >= period) { G.stepClock -= period; busy.forEach(k => { const c = G.C[k]; if (c.target === c.applied) return; c.applied += Math.sign(c.target - c.applied); G.applyStep(k, c); }); }
  };
  Game.prototype.applyStep = function (k, c) { const G = this; G.lastWork = G.now;
    G.ev('step', { ring: k === 'YAW' ? 0 : /\.k$/.test(k) ? 1 : 2, chan: k, v: c.applied });
    if (k === 'FLAMES.k') { // relight / pinch one candle per step, the same candle in every world
      const n = c.applied; G.worlds.forEach(w => { OUT_ORDER.forEach((i, r) => { const want = r < n ? 1 : 0; if (w.lit[i] !== want) { w.lit[i] = want; w.outAt[i] = want ? null : G.now; } }); });
      if (n === 7) { G.result = null; G.breaths = 0; G.wonAt = null; }
    }
  };
  // HOLD short: the breath. Measured off the deformed face, under each world's face family.
  Game.prototype.blow = function () { const G = this; if (G.breath || G.offAt != null) return;
    const fill = G.C['CHEEKS.k'].applied / 10; if (fill <= 0 || G.worlds[0].lit.every(v => !v) || G.breaths >= 3) { G.ev('refuse'); return; }
    const face = G.faceState(0), aim = G.C['AIM'].applied * 4, size = 1 + .12 * G.C['FLAMES.t'].applied;
    const dur = .25 + G.C['CHEEKS.k'].applied / S.STEP_HZ;
    G.worlds.forEach(w => {
      const pre = S.measureFace(MLS, G.H, Object.assign({}, face, { fill, open: 0 }), w.fam.face, G.alpha);
      const open = S.measureFace(MLS, G.H, Object.assign({}, face, { fill: fill * .85, open: 1 }), w.fam.face, G.alpha);
      w.meas = { cheek: pre.cheek, mouth: open.mouth, width: open.width };
      w.plan = S.breathPlan(w.meas, aim).map(p => Object.assign(p, { s: p.s / size }));
      w.plan.forEach((p, i) => { p.outAt = w.lit[i] && p.s >= 1 ? G.now + .3 + p.delay + .16 / p.s : null; });
    });
    G.breath = { t0: G.now, dur, fill }; G.breaths++; G.ev('blow', { dur: dur + .45, fill });
    G.C['CHEEKS.k'].target = 0; // the machine steps the cheeks empty under the breath
  };
  Game.prototype.switchOff = function () { if (this.offAt == null) { this.offAt = this.now; this.ev('off'); } };
  Game.prototype.press = function (id, long) { const G = this;
    if (id === 'select') { if (long) G.cycleFamily(); else G.select(G.sel + 1); }
    else if (id === 'hold') { if (long) G.switchOff(); else G.blow(); }
    else if (id === 'clear') { G.reset(); G.ev('wash'); }
    else if (id === 'play') G.playScript(); };
  // envelope of the breath at time t (0..1), and of the lips' opening
  Game.prototype.env = function (t) { const b = this.breath; if (!b) return 0; const u = t - b.t0; return S.smooth(u / .12) * (1 - S.smooth((u - b.dur) / .45)); };
  Game.prototype.faceState = function () { const G = this, C = G.C;
    return { fill: C['CHEEKS.k'].shown / 10, purse: C['LIPS.k'].shown / 10, open: G.env(G.now), aim: C['AIM'].shown * 4, smile: G.wonAt != null ? S.smooth((G.now - G.wonAt - .5) / .9) : 0 }; };
  // the world state for rendering world w at the current time
  Game.prototype.worldState = function (wi) { const G = this, w = G.worlds[wi], C = G.C, t = G.now, b = G.breath;
    const size = 1 + .12 * C['FLAMES.t'].shown;
    const flames = S.CANDLES.map((cd, i) => {
      let W = 0, dir = 0, lit = w.lit[i];
      if (b && w.plan) { const p = w.plan[i]; dir = p.dir; const u = t - b.t0 - p.delay; W = Math.min(1.3, p.s) * S.smooth(u / .22) * (1 - S.smooth((u - b.dur) / .45)); }
      if (w.outAt[i] != null) lit = 1 - S.smooth((t - w.outAt[i]) / .11); else if (w.lit[i]) lit = 1;
      return { W, dir, lit, size, outAt: w.outAt[i] };
    });
    return { face: G.faceState(), curl: C['STREAMER.k'].shown / 16, lift: C['STREAMER.t'].shown * 6, flames, t, yaw: C['YAW'].shown * 5 };
  };
  Game.prototype.light = function (wi) { const st = this.worldState(wi); return st.flames.reduce((s, f) => s + f.lit, 0) / 7; };
  Game.prototype.update = function (dt) { const G = this; G.now += dt;
    G.runScript(); G.anims = G.anims.filter(a => { const u = clamp((G.now - a.t0) / a.dur, 0, 1), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; G.handTurn(a.r, a.from + (a.to - a.from) * e - a.r.ang); return u < 1; });
    G.machine(dt);
    for (const k in G.C) { const c = G.C[k]; c.shown += (c.applied - c.shown) * Math.min(1, dt / .04); if (Math.abs(c.applied - c.shown) < 1e-3) c.shown = c.applied; }
    // the breath puts flames out (each world on its own plan)
    if (G.breath) {
      G.worlds.forEach((w, wi) => w.plan && w.plan.forEach((p, i) => { if (p.outAt != null && w.lit[i] && G.now >= p.outAt) { w.lit[i] = 0; w.outAt[i] = p.outAt; if (wi === 0) G.ev('out', { i }); } }));
      if (G.now - G.breath.t0 > G.breath.dur + .6) {
        const w = G.worlds[0], n = w.lit.reduce((a, b) => a + b, 0); G.breath = null;
        G.C['FLAMES.k'].target = G.C['FLAMES.k'].applied = n;
        if (n === 0) { G.result = G.breaths === 1 ? 'ALL SEVEN OUT IN ONE BREATH' : `ALL SEVEN OUT IN ${['', 'ONE', 'TWO', 'THREE'][G.breaths]} BREATHS`; G.wonAt = G.now; G.ev('wash'); }
        else if (G.breaths >= 3) { G.result = `${['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][n]} STILL BURNING`; G.ev('fail'); }
        else G.result = null;
      }
    }
    if (G.offAt != null) { G.dark = clamp((G.now - G.offAt) / 1, 0, 1); if (G.now - G.offAt > 1.6) { const keep = G.script; G.reset(); G.script = keep; } }
  };
  // scripted play (the left collar's SCENE, and the proof film): the same rings and buttons, turned by a scripted hand
  // entries: [t, 'k'|'t'|'s', toValue, seconds] or [t, button, long]
  const DEMO = [
    [.15, 'sel', 0], [.25, 'k', 16, .45],                       // STREAMER: wrap the cake
    [2.05, 'sel', 1], [2.15, 'k', 10, .4],                      // CHEEKS: fill
    [3.25, 'sel', 2], [3.35, 'k', 6, .3], [3.45, 't', 3, .3],   // LIPS: purse, aim off to the right
    [4.25, 'hold'],                                             // breath one
    [5.55, 't', -1, .3], [5.75, 'sel', 1], [5.85, 'k', 10, .4], // re-aim, fill again
    [7.0, 'hold'],                                              // breath two
  ];
  Game.prototype.playScript = function (list) { this.reset(); this.script = { t0: this.now, i: 0, list: list || DEMO, auto: true }; };
  Game.prototype.runScript = function () { const G = this, sc = G.script; if (!sc) return; const t = G.now - sc.t0;
    while (sc.i < sc.list.length && sc.list[sc.i][0] <= t) { const s = sc.list[sc.i++];
      if (s[1] === 'sel') { if (G.sel !== s[2]) G.select(s[2]); }
      else if (s[1] === 'hold' || s[1] === 'select' || s[1] === 'clear') G.press(s[1], !!s[2]);
      else { const r = G.RINGS[{ s: 0, k: 1, t: 2 }[s[1]]]; G.anims.push({ r, from: r.ang, to: s[2] * r.deg, t0: G.now, dur: s[3] }); } }
    if (sc.i >= sc.list.length && !G.anims.length && !G.breath) G.script = null; };
  // what a ring is doing right now: [role, value]
  Game.prototype.ringRole = function (ring) { const G = this, t = TARGETS[G.sel], C = G.C;
    if (ring.id === 'scale') return ['WHERE YOU KNEEL', `${C.YAW.target * 5}°`];
    if (ring.id === 'knurl') return t === 'STREAMER' ? ['WRAP', `${C['STREAMER.k'].target} OF 16`] : t === 'CHEEKS' ? ['BREATH HELD', `${C['CHEEKS.k'].target * 10}%`]
      : t === 'LIPS' ? ['PURSE', `${C['LIPS.k'].target * 10}%`] : ['CANDLES LIT', `${C['FLAMES.k'].target} OF 7`];
    return t === 'STREAMER' ? ['HEIGHT', `${C['STREAMER.t'].target * 6} PX`] : t === 'FLAMES' ? ['FLAME SIZE', `${100 + C['FLAMES.t'].target * 12}%`] : ['AIM', `${C.AIM.target * 4}°`]; };

  const api = { Game, TARGETS, SURF_OF, DEMO, OUT_ORDER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GAME = api;
})(typeof self !== 'undefined' ? self : this);
