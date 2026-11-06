/* THE GAME on the memory maker's device: rings, the 11.8/s machine, SELECT / HOLD, the scripted scene, the score against
   the film's cake. No rendering and no audio here (the page draws, sound.js voices the log), so node can play it too. */
(function (root) {
  'use strict';
  const D = typeof module !== 'undefined' && module.exports ? require('./dyn.js') : root.DYN;
  const DEG = Math.PI / 180, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TARGETS = ['LAYER', 'POUR', 'BEADS', 'WRITE', 'CANDLES', 'LIGHT'];
  const POUR_ML = 20, OFFSET_MM = 4, TILT_PER = 2, YAW_PER = 5, WSTEPS = 24;
  // the film's cake (refs.json, frame 155.0 s, chocolate with orange top): body height / width from the traced outline
  const REF = { aspect: .40, aspectTol: .06, side: [59, 30, 18], top: [217, 120, 44] };

  class Game {
    constructor() { this.reset(); }
    reset() {
      this.W = { LOOSE: new D.World('LOOSE'), TUNED: new D.World('TUNED'), RIGID: new D.World('RIGID') }; this.main = this.W.TUNED;
      this.t = 0; this.log = []; this.notes = []; this.target = 0; this.ins = 0; this.split = false; this.phase = 'make'; this.offAt = 0; this.dark = 0; this.onAt = 0;
      this.offset = 0; this.amount = 0; this.count = 0; this.slot = 1; this.litWant = 0; this.lastWork = -9; this.anims = []; this.scene = null; this.seed = 11; this.stepClock = 0; this.sweepAt = -9;
      this.rings = [{ id: 'scale', ang: 0, target: 0, applied: 0, deg: 5, min: -36, max: 36, ix: 0 }, { id: 'knurl', ang: 0, target: 0, applied: 0, deg: 9, ix: 1 }, { id: 'tri', ang: 0, target: 0, applied: 0, deg: 6, min: -2, max: 8, ix: 2 }];
      this.trace = []; this.events = []; this.select(0, true); this.say('MEMORY ON');
    }
    rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
    snd(type, o) { this.log.push(Object.assign({ t: +this.t.toFixed(4), type }, o || {})); }
    ev(kind, o) { this.events.push(Object.assign({ t: +this.t.toFixed(3), kind }, o || {})); }
    say(s) { this.notes.push({ t: this.t, s }); }
    each(f) { Object.values(this.W).forEach(f); }
    get T() { return TARGETS[this.target]; }
    // ---- the knurl's meaning for each target
    knurlRange() { const T = this.T, m = this.main; if (T === 'LAYER') return [-5, 5]; if (T === 'POUR') return [0, 16]; if (T === 'BEADS') return [0, D.GEO.beadN - m.beads.length - m.beadQueue];
      if (T === 'WRITE') return m.ice.poured > 0 ? [0, WSTEPS] : [0, 0]; if (T === 'CANDLES') return [1, 7]; return [this.litCount(), 7]; }
    knurlValue() { const T = this.T; return T === 'LAYER' ? this.offset : T === 'POUR' ? this.amount : T === 'BEADS' ? Math.min(this.count, this.knurlRange()[1]) : T === 'WRITE' ? this.ins : T === 'CANDLES' ? this.slot : this.litCount(); }
    litCount() { return this.main.candles.filter(c => c.lit).length; }
    select(i, silent) { this.target = (i + TARGETS.length) % TARGETS.length; const k = this.rings[1]; k.target = k.applied = this.knurlValue(); k.ang = k.target * k.deg; if (!silent) this.snd('select'); this.lastWork = this.t; }
    // a hand turn: detents passed click quietly; the ring's target follows; the tilt is smooth (not stepped), the others wait for the machine
    handTurn(ring, dDeg) { const lim = ring.id === 'knurl' ? this.knurlRange() : [ring.min, ring.max]; const before = Math.round(ring.ang / ring.deg);
      ring.ang = clamp(ring.ang + dDeg, lim[0] * ring.deg, lim[1] * ring.deg); const after = Math.round(ring.ang / ring.deg);
      if (after !== before) { this.snd('hand', { ring: ring.ix, g: Math.floor(this.rnd() * 9) }); ring.target = clamp(after, lim[0], lim[1]); }
      if (ring.id === 'tri') { const th = ring.ang / ring.deg * TILT_PER * DEG; this.each(w => w.setTilt(th)); ring.applied = ring.target; if (this.t - this.sweepAt > 1.2 && Math.abs(dDeg) > 0) { this.snd('sweep'); this.sweepAt = this.t; } } }
    machine(dt) { this.stepClock += dt; const busy = this.rings.filter(r => r.id !== 'tri' && r.target !== r.applied); if (!busy.length) { this.stepClock = 0; return; }
      const fast = busy.some(r => Math.abs(r.target - r.applied) > 6), period = fast ? 1 / 23.6 : 1 / 11.8;
      while (this.stepClock >= period) { this.stepClock -= period; busy.forEach(r => { if (r.target === r.applied) return; r.applied += Math.sign(r.target - r.applied); this.applyStep(r); this.snd('click', { fast, ring: r.ix, g: Math.floor(this.rnd() * 9) }); }); } }
    applyStep(r) { this.lastWork = this.t; const T = this.T, v = r.applied;
      if (r.id === 'scale') { this.each(w => w.setTurn(v * YAW_PER * DEG)); return; }
      if (T === 'LAYER') this.offset = v; else if (T === 'POUR') this.amount = v; else if (T === 'BEADS') this.count = v; else if (T === 'CANDLES') this.slot = v;
      else if (T === 'WRITE') { this.ins = v; this.snd('pipe', { soft: 1 }); if (v === WSTEPS) { this.ev('inscribed'); this.say('生日快乐 WRITTEN'); } }
      else if (T === 'LIGHT') { const k = this.main.candles.findIndex(c => c.state === 'set' && !c.lit); if (k >= 0) { if (this.litCount() === 0) this.snd('match'); this.each(w => w.light(k)); this.snd('catch', { k }); this.ev('lit', { k }); } }
    }
    // HOLD: short = commit the selected material (or the blow, once the cake is ready); long = the memory off
    hold(long) { this.lastWork = this.t; const m = this.main, T = this.T;
      if (long) { this.offAt = this.t; this.snd('wash', { v: 1.2 }); this.ev('off'); return; }
      if (this.phase === 'make' && this.ready()) { this.scoreAtBlow = this.score(); this.phase = 'blowing'; this.each(w => w.startBlow()); this.snd('blow'); this.ev('blow'); this.say('SHE BLOWS'); return; }
      let ok = false;
      if (T === 'LAYER') { ok = m.dropLayer(this.offset * OFFSET_MM / 1000); if (ok) { this.each(w => w !== m && w.dropLayer(this.offset * OFFSET_MM / 1000)); this.ev('drop', { offsetMM: this.offset * OFFSET_MM }); } }
      else if (T === 'POUR') { ok = this.amount > 0 && m.pour(this.amount * POUR_ML * 1000, 1.2); if (ok) { this.each(w => w !== m && w.pour(this.amount * POUR_ML * 1000, 1.2)); this.snd('pour', { dur: 1.2 }); this.ev('pour', { ml: this.amount * POUR_ML }); } }
      else if (T === 'BEADS') { const n = Math.min(this.count, this.knurlRange()[1]); ok = n > 0 && m.pipe(n); if (ok) { this.each(w => w !== m && w.pipe(n)); this.ev('pipe', { n }); } }
      else if (T === 'CANDLES') { const k = this.slot - 1; ok = m.pushCandle(k); if (ok) { this.each(w => w !== m && w.pushCandle(k)); this.ev('push', { k }); } }
      if (!ok) this.snd('refuse');
    }
    toggleSplit() { this.split = !this.split; this.snd('select'); this.ev('split', { on: this.split }); }
    // ---- the score against the film's cake
    score() { const m = this.main, s = m.iceStats(), top = m.cakeTop(), parts = {};
      parts.layers = 15 * m.layers.length / 3; parts.aligned = m.layers.length === 3 && m.layers.every(L => Math.abs(L.x) <= .0061) ? 5 : 0;
      parts.icing = 15 * clamp((s.coverage - .5) / .4, 0, 1) * (s.poured > 0 ? 1 : 0); parts.runs = s.poured > 0 && s.runoff <= .03 && s.drip <= .55 ? 5 : 0;
      const meanTop = s.poured ? s.top / (Math.PI * 120 * 120) / 1000 : 0, aspect = (top + meanTop) / (2 * D.GEO.R); parts.aspect = Math.abs(aspect - REF.aspect) <= REF.aspectTol ? 5 : 0;
      parts.beads = 10 * m.beads.length / D.GEO.beadN; parts.inscription = 10 * this.ins / WSTEPS;
      const upright = m.candles.filter(c => c.state === 'set' && Math.hypot(c.lx.x, c.lz.x) < 6 * DEG).length; parts.candles = 20 * upright / 7;
      parts.level = Math.abs(m.theta) <= 1.5 * DEG ? 5 : 0; parts.rest = m.atRest() ? 10 : 0;
      const total = Object.values(parts).reduce((a, b) => a + b, 0);
      return { total: Math.round(total), parts, upright, aspect, ice: s, pass: total >= 90 && upright === 7 }; }
    stage() { const m = this.main, s = m.iceStats(); let n = 0; if (m.layers.length === 3) n++; else return n; if (s.poured > 0 && !m.ice.pour && m.ice.flow < 5) n++; else return n;
      if (m.beads.length === D.GEO.beadN && this.ins === WSTEPS) n++; else return n; if (m.candles.every(c => c.state === 'set')) n++; else return n; if (this.litCount() === 7) n++; return n; }
    ready() { return this.litCount() === 7 && this.score().pass; }
    // ---- every frame
    advance(dt) {
      this.t += dt; this.runScene(); this.runAnims(); this.machine(dt);
      const before = this.main.events.length; this.each(w => w.advance(dt));
      this.main.events.slice(before).forEach(e => { // sounds of making, from the tuned world (the one the game is scored on)
        if (e.kind === 'landed') { this.snd('thump', { n: e.layer }); this.ev('landed', { layer: e.layer }); }
        else if (e.kind === 'bead') this.snd('pipe', { n: e.n });
        else if (e.kind === 'candle') { this.snd('tap', { k: e.k }); this.ev('candle-set', { k: e.k }); }
        else if (e.kind === 'fell') { this.snd('fall', { k: e.k }); this.ev('fell', { k: e.k }); this.say(`CANDLE ${e.k + 1} FELL: TILTED TOO FAST`); }
        else if (e.kind === 'clatter') this.snd('clatter', { k: e.k });
        else if (e.kind === 'out') { this.snd('out', { k: e.k }); this.ev('out', { k: e.k, why: e.why }); }
        else if (e.kind === 'icing-rest') this.ev('icing-rest');
      });
      if (this.phase === 'blowing' && this.litCount() === 0 && !this.main.blow) { this.phase = 'done'; this.snd('wash', { v: 1.1 }); this.ev('done'); this.say('ALL SEVEN OUT'); }
      if (this.offAt) { this.dark = clamp((this.t - this.offAt) / 1.0, 0, 1); if (this.dark >= 1 && this.t - this.offAt > 1.6) { const keep = this.scene, log = this.log, t = this.t, tr = this.trace, evs = this.events; this.reset(); this.log = log; this.t = t; this.onAt = t; this.trace = tr; this.events = evs; this.scene = keep; } }
      const e = this.main.energy(); this.trace.push([+this.t.toFixed(4), +e.secondary.toExponential(3), +e.icingFlow.toFixed(1), +this.W.LOOSE.energy().secondary.toExponential(3), this.main.atRest() ? 1 : 0]);
    }
    // ---- the hand, animated (the scene, and tests)
    turnBy(ringId, detents, dur) { const r = this.rings.find(q => q.id === ringId); this.anims.push({ r, from: null, by: detents * r.deg, t0: this.t, dur: Math.max(.05, dur) }); }
    tiltTo(det, dur) { const r = this.rings[2]; this.anims.push({ r, from: null, to: det * r.deg, t0: this.t, dur: Math.max(.05, dur) }); }
    runAnims() { this.anims = this.anims.filter(a => { if (a.from == null) { a.from = a.r.ang; a.to = a.to == null ? a.from + a.by : a.to; } const u = clamp((this.t - a.t0) / a.dur, 0, 1), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; this.handTurn(a.r, a.from + (a.to - a.from) * e - a.r.ang); return u < 1; }); }
    play(script) { this.reset(); this.scene = { s: script || SCRIPT, i: 0, t0: this.t }; }
    runScene() { const sc = this.scene; if (!sc) return; const t = this.t - sc.t0;
      while (sc.i < sc.s.length && sc.s[sc.i][0] <= t + 1e-9) { const [, a, b, c] = sc.s[sc.i++];
        if (a === 'sel') this.select(TARGETS.indexOf(b)); else if (a === 'turn') this.turnBy(b, c, sc.s[sc.i - 1][4]); else if (a === 'tilt') this.tiltTo(b, c);
        else if (a === 'hold') this.hold(false); else if (a === 'split') this.toggleSplit(); else if (a === 'end') this.scene = null;
        else if (a === 'fix') { const k = this.main.candles.findIndex(q => q.state === 'fallen' || q.state === 'falling'); if (k >= 0) { const n = k + 1 - this.rings[1].target; if (n) this.turnBy('knurl', n, Math.max(.1, Math.abs(n) / 14)); const at = Math.abs(n) / 11.8 + .35; sc.s.splice(sc.i, 0, [t + at, 'hold'], [t + at + .45, 'fix']); sc.s.sort((p, q) => p[0] - q[0]); } } } }
  }
  // The scene: the whole cake made on the rings, in the film's order (layers, icing, beads, inscription while tilted toward her, level, candles, light, blow).
  // [time s, action, arg, arg, duration]. The split view (left collar) runs from 11.6 to 19.2 s so the three presets are seen answering the same hand.
  const SCRIPT = [
    [.6, 'hold'], [1.35, 'turn', 'knurl', 1, .12], [1.75, 'hold'], [2.5, 'turn', 'knurl', -1, .12], [2.9, 'hold'],
    [3.7, 'sel', 'POUR'], [3.9, 'turn', 'knurl', 10, .7], [5.05, 'hold'], [5.3, 'tilt', 5, 1.6],
    [6.9, 'sel', 'BEADS'], [7.05, 'turn', 'knurl', 24, 1.3], [8.95, 'hold'], [9.3, 'sel', 'WRITE'], [9.45, 'turn', 'knurl', 24, 1.7],
    [11.6, 'split'], [11.8, 'tilt', 0, 1.1], [12.3, 'sel', 'CANDLES'],
    [12.5, 'hold'], [12.85, 'turn', 'knurl', 1, .08], [13.05, 'hold'], [13.4, 'turn', 'knurl', 1, .08], [13.6, 'hold'], [13.95, 'turn', 'knurl', 1, .08], [14.15, 'hold'],
    [14.5, 'turn', 'knurl', 1, .08], [14.7, 'hold'], [15.05, 'turn', 'knurl', 1, .08], [15.25, 'hold'], [15.6, 'turn', 'knurl', 1, .08], [15.8, 'hold'],
    [16.5, 'turn', 'scale', 8, .65], [18.1, 'tilt', 6, .12], [18.24, 'tilt', 0, .14], [19.5, 'split'], [19.8, 'fix'],
    [22.2, 'sel', 'LIGHT'], [22.4, 'turn', 'knurl', 7, .5], [25.4, 'hold'], [28.6, 'end']];
  const API = { Game, SCRIPT, TARGETS, REF, POUR_ML, OFFSET_MM, TILT_PER, YAW_PER, WSTEPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.GAME = API;
})(typeof window !== 'undefined' ? window : globalThis);
