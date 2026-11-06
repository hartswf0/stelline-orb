/* SECONDARY DYNAMICS · the cake's materials (no rendering; runs in the page and in node).
   Primitives: Osc (spring + damper on a mass proxy), primary stand springs (tilt, turn), soft contact (sponge layers),
   a yield-stress thin film (icing), slump springs (cream beads), gripped levers that can break and fall (candles),
   buoyant pendulums (flames), a position-based chain (paper streamers), lever springs (paper crown).
   Units: metres, seconds, radians; icing thickness in millimetres. Fixed substep H = 1/240 s whatever the frame rate.
   Frame: pivot at the stand plate's centre; tilt theta about world x (positive = top toward Ana, who is at +z);
   turn psi about the plate's own y axis (three.js rotation.y convention). */
(function (root) {
  'use strict';
  const H = 1 / 240, G = 9.81, TAU = Math.PI * 2;
  const EPS = { x: 1e-4, v: 1e-3, f: 1e-3, still: .25 };     // sleep: |x-rest|<x, |v|<v, |drive|<f for `still` seconds -> exact rest
  // material priors (TUNED). m: mass proxy kg; f: natural frequency Hz; z: damping ratio; settle: declared time for energy to fall to 1e-6 of its peak and the element to sleep
  const MAT = {
    stand:    { f: 2.6, z: 1.0,  m: 1.2,   settle: 1.2 },     // primary motion (critically damped; the hand's pose, not a secondary)
    sponge:   { f: 3.2, z: .45,  m: .35,   settle: 1.0 },
    bead:     { f: 2.5, z: .8,   m: .002,  settle: .8 },
    candle:   { f: 2.2, z: .38,  m: .01,   settle: 1.6 },
    flame:    { f: 1.6, z: .5,   m: .0005, settle: 1.6 },
    crown:    { f: 4.0, z: .3,   m: .004,  settle: 1.3 },
    fallen:   { f: 6.0, z: .7,   m: .01,   settle: 1.0 },     // a fallen candle lying on the cake: the contact spring it bounces on
    streamer: { air: 2.4, m: .003, settle: 3.5 },
    icing:    { M: 7, tau: 1.15, settle: 5.0 }                // mobility (mm^-1 s^-1), yield thickness on a vertical wall (mm)
  };
  const PRESETS = {
    LOOSE: { name: 'LOOSE', zeta: .25, air: .2, icingM: 2.5, icingTau: .6, rigid: false, settleMul: 4.5 },
    TUNED: { name: 'TUNED', zeta: 1, air: 1, icingM: 1, icingTau: 1, rigid: false, settleMul: 1 },
    RIGID: { name: 'RIGID', zeta: 1, air: 1, icingM: 1, icingTau: 1, rigid: true, settleMul: 1 }
  };
  // geometry
  const GEO = { tableY: .46, plateY: .52, plateR: .165, R: .12, layerH: .032, layers: 3, candleL: .07, candleDepth: .018,
    candleA: k => k / 7 * TAU + .3, candleR: k => (k % 2 ? .052 : .088), beadN: 24, beadR: .111, crownR: .152, crownN: 11, crownH: .03,
    streamers: 4, streamSeg: 5, streamLen: .009, fallLim: 1.5 };
  const ICE = { NA: 72, NT: 10, NS: 16, NB: 4, dsB: 7.5 };      // sectors; top, side, board cells
  ICE.NC = ICE.NT + ICE.NS + ICE.NB;

  // ---- small vector helpers (array [x,y,z])
  const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
  const rotX = (v, a) => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
  const rotvec = (v, r) => { const a = Math.hypot(r[0], r[1], r[2]); if (a < 1e-12) return v.slice(); const k = [r[0] / a, r[1] / a, r[2] / a], c = Math.cos(a), s = Math.sin(a), d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    const cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]]; return [0, 1, 2].map(i => v[i] * c + cr[i] * s + k[i] * d * (1 - c)); };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

  // ---- the spring + damper on a mass proxy. x is a displacement (strain, angle); drive f is an acceleration in x units/s^2
  class Osc {
    constructor(mat, P, rest) { this.w = TAU * mat.f; this.z = mat.z * P.zeta; this.m = mat.m; this.rigid = P.rigid; this.rest = rest || 0; this.x = this.rest; this.v = 0; this.f = 0; this.sleep = true; this.still = 0; }
    kick(dv) { if (this.rigid) return; this.v += dv; this.sleep = false; this.still = 0; }
    step(h) {
      if (this.rigid) { this.x = this.rest; this.v = 0; this.sleep = true; return; }
      if (this.sleep) { if (Math.abs(this.f) > EPS.f || this.x !== this.rest) { this.sleep = false; this.still = 0; } else return; }
      const a = -this.w * this.w * (this.x - this.rest) - 2 * this.z * this.w * this.v + this.f;
      this.v += a * h; this.x += this.v * h;                                   // semi-implicit (symplectic) Euler
      if (Math.abs(this.v) < EPS.v && Math.abs(this.x - this.rest) < EPS.x && Math.abs(this.f) < EPS.f) { this.still += h; if (this.still >= EPS.still - 1e-9) { this.x = this.rest; this.v = 0; this.sleep = true; } } else this.still = 0;
    }
    energy() { const d = this.x - this.rest; return .5 * this.m * (this.v * this.v + this.w * this.w * d * d); }
  }

  // ---- the world: one cake on one stand, under one damping preset
  class World {
    constructor(presetName) {
      const P = this.P = PRESETS[presetName]; this.name = presetName; this.t = 0; this.ticks = 0; this.events = [];
      this.tilt = new Osc(MAT.stand, PRESETS.TUNED); this.turn = new Osc(MAT.stand, PRESETS.TUNED);     // primary: same in every preset
      this.layers = [];          // {x, sq: Osc}
      this.held = null;          // a layer being lowered {x, y, vy}
      this.ice = { h: new Float64Array(ICE.NA * ICE.NC), tau: new Float64Array(ICE.NA), poured: 0, pour: null, frozen: true, still: 0, flow: 0, any: false, lastG: null };
      for (let a = 0; a < ICE.NA; a++) { const u = a / ICE.NA * TAU; this.ice.tau[a] = MAT.icing.tau * P.icingTau * (1 + .32 * Math.sin(3 * u + .7) * Math.cos(5 * u) + .18 * Math.sin(11 * u + 2.1) + .1 * Math.sin(23 * u)); }
      this.beads = []; this.beadQueue = 0; this.beadClock = 0;
      this.candles = Array.from({ length: 7 }, (_, k) => ({ k, state: 'none', lx: new Osc(MAT.candle, P), lz: new Osc(MAT.candle, P), push: 0, brk: (k % 2 ? 11 : 6 + .6 * k) * Math.PI / 180,
        fall: null, lit: false, flame: { fx: new Osc(MAT.flame, P), fz: new Osc(MAT.flame, P), size: new Osc({ f: 3, z: .6, m: .0005 }, P), out: 0 }, wick: null, wick1: null, wick2: null, acc: [0, 0, 0] }));
      this.crown = Array.from({ length: GEO.crownN }, (_, i) => ({ a: i / GEO.crownN * TAU, r: new Osc(MAT.crown, P), t: new Osc(MAT.crown, P), p: null, p1: null, p2: null, acc: [0, 0, 0] }));
      this.streamers = Array.from({ length: GEO.streamers }, (_, s) => { const a = s / GEO.streamers * TAU + Math.PI / 4, anchor = this.local2world([GEO.plateR * Math.cos(a), -.004, GEO.plateR * Math.sin(a)]);
        const pts = []; for (let i = 0; i <= GEO.streamSeg; i++) pts.push({ p: [anchor[0], anchor[1] - i * GEO.streamLen, anchor[2]], q: [anchor[0], anchor[1] - i * GEO.streamLen, anchor[2]] }); return { a, pts, still: 0, sleep: true }; });
      this.base = { p: null, p1: null, p2: null, acc: [0, 0, 0] };       // the cake's top centre, for inertial loads on the icing
      this.blow = null; this.flash = 0;
    }
    // stand kinematics
    get theta() { return this.tilt.x; } get psi() { return this.turn.x; }
    local2world(v, th, ps) { th = th == null ? (this.tilt ? this.tilt.x : 0) : th; ps = ps == null ? (this.turn ? this.turn.x : 0) : ps; const w = rotX(rotY(v, ps), th); return [w[0], w[1] + GEO.plateY, w[2]]; }
    world2localDir(v) { return rotY(rotX(v, -this.theta), -this.psi); }
    cakeTop() { let y = 0; this.layers.forEach(L => { y += GEO.layerH * (1 + L.sq.x); }); return y; }
    layerBase(i) { let y = 0; for (let j = 0; j < i; j++) y += GEO.layerH * (1 + this.layers[j].sq.x); return y; }
    setTilt(rad) { this.tilt.rest = rad; } setTurn(rad) { this.turn.rest = rad; }
    // ---- commands (the game sends the same commands to every preset)
    dropLayer(x) { if (this.candles.some(c => c.state !== 'none') || this.held || this.layers.length >= GEO.layers || this.ice.poured > 0) return false; this.held = { x, y: this.cakeTop() + .06, vy: -.35 }; return true; }
    pour(vol, dur) { if (!this.layers.length || this.ice.pour) return false; this.ice.pour = { vol, dur: dur || 1.2, t: 0 }; this.ice.frozen = false; return true; }
    pipe(n) { if (!this.layers.length) return false; this.beadQueue += Math.min(n, GEO.beadN - this.beads.length - this.beadQueue); return true; }
    pushCandle(k) { const c = this.candles[k]; if (!this.layers.length || c.state === 'pushing' || c.state === 'set' || c.state === 'falling') return false; c.state = 'pushing'; c.push = 0; c.fall = null; c.lit = false; c.lx.x = c.lz.x = c.lx.v = c.lz.v = 0; c.lx.rest = c.lz.rest = 0; return true; }
    light(k) { const c = this.candles[k]; if (c.state !== 'set' || c.lit) return false; c.lit = true; c.wp = c.wp1 = c.wp2 = c.wacc = null; c.flame.out = 0; c.flame.size.x = 0; c.flame.size.v = 0; c.flame.size.rest = 1; c.flame.size.sleep = false; if (this.P.rigid) c.flame.size.x = 1; return true; }
    startBlow() { this.blow = { t: 0, z0: .22, speed: .32, W: 16, sigma: .045 }; }
    emit(kind, data) { this.events.push(Object.assign({ t: +this.t.toFixed(4), kind }, data || {})); }

    // ---- advance by a frame of any length; fixed 1/240 substeps counted in integer ticks
    advance(dt) { this.t += dt; const want = Math.floor(this.t * 240 + 1e-6); while (this.ticks < want) { this.substep(H); this.ticks++; } }
    substep(h) {
      const P = this.P, tick = this.ticks;
      // primary: the stand follows the hand
      const th0 = this.tilt.x, thv0 = this.tilt.v; this.tilt.step(h); this.turn.step(h);
      const thAcc = (this.tilt.v - thv0) / h;
      // the held layer is lowered; it lands on the stack (contact) and the sponge answers
      if (this.held) { const L = this.held, top = this.cakeTop(); L.y += L.vy * h;
        if (L.y <= top) { const sq = new Osc(MAT.sponge, P, 0); this.layers.push({ x: L.x, sq }); const n = this.layers.length;
          this.layers.forEach((Ly, i) => { Ly.sq.rest = -.012 * (n - 1 - i); });                      // the weight above presses each layer a little
          sq.v = P.rigid ? 0 : L.vy * 7; sq.sleep = P.rigid; sq.still = 0; if (n > 1) this.layers[n - 2].sq.kick(L.vy * 3.5);
          this.held = null; this.base.p = this.base.p1 = this.base.p2 = null; this.emit('landed', { layer: n }); } }
      // inertial loads: accelerations of the cake top centre, each candle base / wick, each crown root (finite differences, light low-pass)
      const fd = (o, p) => { o.p2 = o.p1; o.p1 = o.p; o.p = p; if (o.p2) { const a = mul(add(sub(o.p, mul(o.p1, 2)), o.p2), 1 / (h * h)); o.acc = add(mul(o.acc, .6), mul(a, .4)); } return o.acc; };
      const top = this.cakeTop(), aTop = fd(this.base, this.local2world([0, top, 0]));
      // icing
      this.stepIcing(h, aTop, top);
      // beads: piped at 9 a second around the rim, each slumps
      if (this.beadQueue > 0) { this.beadClock += h; if (this.beadClock >= 1 / 9) { this.beadClock -= 1 / 9; this.beadQueue--; const o = new Osc(MAT.bead, P, -.22); o.x = .12; o.v = 0; o.sleep = false; if (P.rigid) o.x = o.rest; this.beads.push({ a: this.beads.length / GEO.beadN * TAU + .13, s: o }); this.emit('bead', { n: this.beads.length }); } }
      this.beads.forEach(b => b.s.step(h));
      // layers' sponge
      this.layers.forEach(L => L.sq.step(h));
      // candles
      this.candles.forEach(c => this.stepCandle(c, h, thAcc, top));
      // paper crown on the plate
      this.crown.forEach(p => { const loc = [GEO.crownR * Math.cos(p.a), 0, GEO.crownR * Math.sin(p.a)], a = this.world2localDir(fd(p, this.local2world(loc)));
        const radial = [Math.cos(p.a), 0, Math.sin(p.a)], tang = [-Math.sin(p.a), 0, Math.cos(p.a)], ar = a[0] * radial[0] + a[2] * radial[2], at = a[0] * tang[0] + a[2] * tang[2];
        p.r.f = -6 * ar - thAcc * (radial[2] * Math.cos(this.psi) - radial[0] * Math.sin(this.psi)) * .5; p.t.f = -6 * at; if (Math.abs(p.r.f) < EPS.f * .5) p.r.f = 0; if (Math.abs(p.t.f) < EPS.f * .5) p.t.f = 0; p.r.step(h); p.t.step(h); });
      // streamers
      this.streamers.forEach(s => this.stepStreamer(s, h));
      // the blow: a front of breath crosses the cake from her side
      if (this.blow) { this.blow.t += h; if (this.blow.t > 2.5) this.blow = null; }
      this.flash = Math.max(0, this.flash - h / .14);
    }
    breathAt(z) { const b = this.blow; if (!b) return 0; const zf = b.z0 - b.speed * b.t; return b.W * Math.exp(-Math.pow((z - zf) / b.sigma, 2)) * Math.min(1, b.t / .08); }
    stepCandle(c, h, thAcc, top) {
      const P = this.P, k = c.k, base = [GEO.candleR(k) * Math.cos(GEO.candleA(k)), top - GEO.candleDepth, GEO.candleR(k) * Math.sin(GEO.candleA(k))];
      if (c.state === 'none') return;
      if (c.state === 'pushing') { c.push += h / .3; if (c.push >= 1) { c.push = 1; c.state = 'set'; const a = GEO.candleA(k) + 1.9; c.lx.kick(Math.cos(a) * 1.0); c.lz.kick(Math.sin(a) * 1.0); this.emit('candle', { k }); } }
      // the base point's acceleration and the stand's angular acceleration load the lean
      const bw = this.local2world(base), o = c; o.bp2 = o.bp1; o.bp1 = o.bp; o.bp = bw; let a = [0, 0, 0];
      if (o.bp2) { a = mul(add(sub(o.bp, mul(o.bp1, 2)), o.bp2), 1 / (h * h)); o.bacc = o.bacc ? add(mul(o.bacc, .6), mul(a, .4)) : a; a = o.bacc; }
      const al = this.world2localDir(a), rot = this.world2localDir([thAcc, 0, 0]);
      if (c.state === 'set') {
        const K = 9.5; c.lx.f = -K * al[2] - rot[0]; c.lz.f = K * al[0] - rot[2]; if (Math.abs(c.lx.f) < EPS.f * .5) c.lx.f = 0; if (Math.abs(c.lz.f) < EPS.f * .5) c.lz.f = 0;
        c.lx.step(h); c.lz.step(h);
        const lean = Math.hypot(c.lx.x, c.lz.x);
        if (!P.rigid && lean > c.brk) { // the grip breaks: it falls the way it leans, onto the cake
          const d = [c.lx.x / lean, c.lz.x / lean]; c.state = 'falling'; c.fall = { d, g: lean, gv: Math.hypot(c.lx.v, c.lz.v), rest: null }; if (c.lit) { c.lit = false; this.emit('out', { k, why: 'fell' }); } this.emit('fell', { k }); }
      } else if (c.state === 'falling' || c.state === 'fallen') {
        const F = c.fall, lim = GEO.fallLim; F.lift = Math.min(1, F.g / lim);   // the grip is gone: the candle comes up out of its hole as it goes over, and lies on the icing
        if (c.state === 'falling') { F.gv += (G / (GEO.candleL * .6)) * Math.sin(F.g) * h; F.g += F.gv * h;
          if (F.g >= lim) { F.g = lim; if (F.gv > .8) { F.gv *= -.25; this.emit('clatter', { k, v: F.gv }); } else { c.state = 'fallen'; F.rest = new Osc(MAT.fallen, P, lim); F.rest.x = lim; F.rest.v = -Math.abs(F.gv) * .25; F.rest.sleep = false; } } }
        else { F.rest.step(h); if (F.rest.x > lim) { F.rest.x = lim; F.rest.v = -Math.abs(F.rest.v) * .25; } F.g = F.rest.x; }   // the cake top is a collision boundary
        c.lx.x = F.d[0] * F.g; c.lz.x = F.d[1] * F.g; c.lx.v = c.lz.v = 0; c.lx.sleep = c.lz.sleep = true;   // the lean now belongs to the fall
      }
      // flame: buoyant, leans toward the wick's acceleration (it wants world-up), the breath pushes it down-wind
      const fl = c.flame; if (!c.lit && fl.out <= 0) return;
      const tipL = add(base, rotvec([0, GEO.candleL, 0], [c.lx.x, 0, c.lz.x])), wick = this.local2world(tipL);
      o.wp2 = o.wp1; o.wp1 = o.wp; o.wp = wick; let aw = [0, 0, 0]; if (o.wp2) { aw = mul(add(sub(o.wp, mul(o.wp1, 2)), o.wp2), 1 / (h * h)); o.wacc = o.wacc ? add(mul(o.wacc, .6), mul(aw, .4)) : aw; aw = o.wacc; }
      const wind = this.breathAt(wick[2]); aw = [aw[0], aw[1], aw[2] - wind];
      const Kf = fl.fx.w * fl.fx.w / G; fl.fx.f = Kf * aw[2]; fl.fz.f = -Kf * aw[0]; if (Math.abs(fl.fx.f) < EPS.f * .5) fl.fx.f = 0; if (Math.abs(fl.fz.f) < EPS.f * .5) fl.fz.f = 0;
      fl.fx.step(h); fl.fz.step(h); fl.size.step(h);
      if (c.lit && Math.hypot(fl.fx.x, fl.fz.x) > .62) { c.lit = false; fl.out = .5; this.emit('out', { k, why: this.blow ? 'breath' : 'lean' }); }
      if (!c.lit && fl.out > 0) { fl.out -= h; fl.size.rest = 0; if (fl.out <= 0) { fl.size.x = 0; fl.size.v = 0; fl.fx.x = fl.fz.x = fl.fx.v = fl.fz.v = 0; fl.fx.sleep = fl.fz.sleep = fl.size.sleep = true; } }
    }
    // icing: a yield-stress thin film per sector (top -> side -> board), conservative fluxes
    stepIcing(h, aTop, topM) {
      const I = this.ice, P = this.P, { NA, NT, NS, NB, NC, dsB } = ICE, R = GEO.R * 1000, dsT = R / NT, dsS = I.dsS || Math.max(4, topM * 1000) / NS, dA = TAU / NA;
      if (I.pour) { if (!I.dsS) I.dsS = dsS; I.age = 0; const p = I.pour, u0 = p.t / p.dur; p.t += h; const u1 = Math.min(1, p.t / p.dur), dv = p.vol * (u1 - u0);
        if (P.rigid) { // no flow: the icing simply is there, evenly on the top
          let area = 0; for (let a = 0; a < NA; a++) for (let i = 0; i < NT; i++) area += dA * (i + .5) * dsT * dsT; for (let a = 0; a < NA; a++) for (let i = 0; i < NT; i++) I.h[a * NC + i] += dv / area;
        } else { const r = .985 * R * Math.pow(u1, .42), ang = u1 * TAU * 5.5, ci = Math.min(NT - 1, Math.floor(r / dsT)); let wsum = 0; const ws = [];
          for (let da = -5; da <= 5; da++) for (let di = -1; di <= 1; di++) { const i = ci + di; if (i < 0 || i >= NT) continue; const a = ((Math.round(ang / dA) + da) % NA + NA) % NA, w = Math.exp(-da * da / 8 - di * di / 1.2); ws.push([a, i, w]); wsum += w; }
          ws.forEach(([a, i, w]) => { const area = dA * (i + .5) * dsT * dsT; I.h[a * NC + i] += dv * w / wsum / area; }); }
        I.poured += dv; I.frozen = false; I.any = true; if (u1 >= 1) { I.pour = null; this.flash = 1; this.emit('poured', { vol: I.poured }); } }   // the magnesium flash marks a change of the cake (never on a landing)
      if (!I.any) return;
      const th = this.theta, ps = this.psi, cf = R * 1e-3 * this.turn.v * this.turn.v / G;
      // driving accelerations (in g) seen in the plate frame
      const aL = this.world2localDir(aTop);
      const Gsig = Math.round(th * 1e4) + ',' + Math.round(aL[0] * 1e3) + ',' + Math.round(aL[2] * 1e3) + ',' + Math.round(cf * 1e4);
      if (I.frozen) { if (Gsig === I.lastG) return; I.frozen = false; I.still = 0; }
      I.lastG = Gsig; let flow = 0; const M = MAT.icing.M * P.icingM; if (!I.pour) I.age = (I.age || 0) + h; const set = 1 + Math.min(2, .6 * Math.max(0, (I.age || 0) - .4));
      if (P.rigid) { I.frozen = true; I.flow = 0; return; }
      const gdown = rotY(rotX([0, -1, 0], -th), -ps);        // gravity direction in plate-local coordinates
      for (let a = 0; a < NA; a++) {
        const phi = (a + .5) * dA, dx = Math.cos(phi), dz = Math.sin(phi), tau = I.tau[a] * set, o = a * NC, hh = I.h;
        const gOut = gdown[0] * dx + gdown[2] * dz - (aL[0] * dx + aL[2] * dz) / G + cf;       // along the top/board, outward
        const gWall = -gdown[1] + aL[1] / G;                                                    // down the wall
        for (let i = 0; i < NC - 1; i++) {
          let ds, gdr, Pf, w;
          if (i < NT - 1) { ds = dsT; gdr = gOut; Pf = 1; w = dA * (i + 1) * dsT; }
          else if (i === NT - 1) { ds = (dsT + dsS) / 2; gdr = (gOut + gWall) / 2; Pf = .8; w = dA * R; }
          else if (i < NT + NS - 1) { ds = dsS; gdr = gWall; Pf = .05; w = dA * R; }
          else if (i === NT + NS - 1) { ds = (dsS + dsB) / 2; gdr = (gWall + gOut) / 2; Pf = .3; w = dA * R; }
          else { ds = dsB; gdr = gOut; Pf = 1; w = dA * (R + (i - NT - NS + 1) * dsB); }
          const hi = hh[o + i], hj = hh[o + i + 1]; if (hi <= 0 && hj <= 0) continue;
          const D = gdr + Pf * (hi - hj) / ds, hm = D > 0 ? hi : hj, ex = Math.abs(D) * hm - tau;
          if (ex <= .1 * tau || hm <= 0) continue;                                             // below yield: it holds (finite stop)
          let q = M * hm * hm * ex * Math.sign(D) * w * h;                                       // volume moved this substep (mm^3)
          const Ai = this.cellArea(i, dsT, dsS), Aj = this.cellArea(i + 1, dsT, dsS);
          if (q > 0) q = Math.min(q, .45 * hi * Ai); else q = -Math.min(-q, .45 * hj * Aj);
          hh[o + i] -= q / Ai; hh[o + i + 1] += q / Aj; flow += Math.abs(q) / h;
        }
      }
      I.flow = flow; if (flow >= 5) I.moved = true;
      if (flow < 5 && !I.pour) { I.still += h; if (I.still >= EPS.still - 1e-9) { I.frozen = true; I.flow = 0; if (I.moved) this.emit('icing-rest', {}); I.moved = false; } } else I.still = 0;
    }
    cellArea(i, dsT, dsS) { dsS = this.ice.dsS || dsS; const { NT, NS, NA, dsB } = ICE, dA = TAU / NA, R = GEO.R * 1000; if (i < NT) return dA * (i + .5) * dsT * dsT; if (i < NT + NS) return dA * R * dsS; return dA * (R + (i - NT - NS + .5) * dsB) * dsB; }
    stepStreamer(s, h) {
      const P = this.P, anchorL = [GEO.plateR * Math.cos(s.a), -.004, GEO.plateR * Math.sin(s.a)], A = this.local2world(anchorL), pts = s.pts;
      if (P.rigid) { pts.forEach((q, i) => { const w = this.local2world([anchorL[0], anchorL[1] - i * GEO.streamLen, anchorL[2]]); w[1] = Math.max(w[1], GEO.tableY + .0015); q.p = w; q.q = w.slice(); }); return; }
      const moved = Math.hypot(A[0] - pts[0].p[0], A[1] - pts[0].p[1], A[2] - pts[0].p[2]);
      if (s.sleep) { if (moved < 1e-9) return; s.sleep = false; s.still = 0; }
      const damp = MAT.streamer.air * P.air; pts[0].q = pts[0].p; pts[0].p = A;
      let ke = 0;
      for (let i = 1; i < pts.length; i++) { const q = pts[i], v = sub(q.p, q.q); q.q = q.p; q.p = add(add(q.p, mul(v, 1 - damp * h)), [0, -G * h * h, 0]); }
      for (let it = 0; it < 8; it++) for (let i = 1; i < pts.length; i++) { const a = pts[i - 1].p, b = pts[i].p, d = sub(b, a), L = Math.hypot(d[0], d[1], d[2]) || 1e-9, e = (L - GEO.streamLen) / L;
        if (i === 1) pts[i].p = sub(b, mul(d, e)); else { pts[i - 1].p = add(a, mul(d, e * .5)); pts[i].p = sub(b, mul(d, e * .5)); }
        const p = pts[i].p; if (p[1] < GEO.tableY + .0015) p[1] = GEO.tableY + .0015;                                  // the table
        const rr = Math.hypot(p[0], p[2]); if (p[1] < GEO.plateY - .006 && rr < .03) { p[0] *= .03 / (rr || 1e-9); p[2] *= .03 / (rr || 1e-9); } }   // the stem
      for (let i = 1; i < pts.length; i++) { const v = sub(pts[i].p, pts[i].q); ke += .5 * MAT.streamer.m / GEO.streamSeg * (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) / (h * h); }
      s.ke = ke;
      if (ke < 1e-9 && moved < 1e-9) { s.still += h; if (s.still >= EPS.still - 1e-9) { s.sleep = true; pts.forEach(q => { q.q = q.p.slice(); }); s.ke = 0; } } else s.still = 0;
    }
    // ---- reading the world
    energy() {
      const e = { stand: this.tilt.energy() + this.turn.energy(), sponge: 0, beads: 0, candles: 0, flames: 0, crown: 0, streamers: 0, icingFlow: this.ice.flow };
      this.layers.forEach(L => e.sponge += L.sq.energy()); this.beads.forEach(b => e.beads += b.s.energy());
      this.candles.forEach(c => { e.candles += c.lx.energy() + c.lz.energy() + (c.fall ? (c.fall.rest ? c.fall.rest.energy() : .5 * MAT.candle.m * c.fall.gv * c.fall.gv) : 0); e.flames += c.flame.fx.energy() + c.flame.fz.energy(); });
      this.crown.forEach(p => e.crown += p.r.energy() + p.t.energy()); this.streamers.forEach(s => e.streamers += s.ke || 0);
      e.secondary = e.sponge + e.beads + e.candles + e.flames + e.crown + e.streamers; return e;
    }
    atRest() {
      const o = [this.tilt, this.turn]; this.layers.forEach(L => o.push(L.sq)); this.beads.forEach(b => o.push(b.s)); this.crown.forEach(p => o.push(p.r, p.t));
      this.candles.forEach(c => { o.push(c.lx, c.lz); if (c.lit) o.push(c.flame.fx, c.flame.fz, c.flame.size); });
      return !this.held && !this.ice.pour && this.ice.frozen && this.beadQueue === 0 && !this.blow && o.every(x => x.sleep) && this.streamers.every(s => s.sleep || this.P.rigid) && this.candles.every(c => c.state !== 'pushing' && c.state !== 'falling' && !(c.state === 'fallen' && !c.fall.rest.sleep));
    }
    snapshot() { // every state number, for the at-rest and frame-rate tests
      const a = [this.tilt.x, this.tilt.v, this.turn.x, this.turn.v]; this.layers.forEach(L => a.push(L.sq.x, L.sq.v)); this.beads.forEach(b => a.push(b.s.x, b.s.v));
      this.candles.forEach(c => a.push(c.lx.x, c.lx.v, c.lz.x, c.lz.v, c.flame.fx.x, c.flame.fz.x, c.flame.size.x, c.fall ? c.fall.g : 0)); this.crown.forEach(p => a.push(p.r.x, p.r.v, p.t.x, p.t.v));
      this.streamers.forEach(s => s.pts.forEach(q => a.push(q.p[0], q.p[1], q.p[2]))); for (let i = 0; i < this.ice.h.length; i++) a.push(this.ice.h[i]); return a; }
    // icing measures
    iceStats() { const I = this.ice, { NA, NT, NS, NB, NC } = ICE, dsT = GEO.R * 1000 / NT, dsS = Math.max(4, this.cakeTop() * 1000) / NS; let top = 0, cov = 0, area = 0, board = 0, total = 0, sideExt = 0;
      for (let a = 0; a < NA; a++) { let ext = 0; for (let i = 0; i < NC; i++) { const v = I.h[a * NC + i] * this.cellArea(i, dsT, dsS); total += v; if (i < NT) { top += v; area += this.cellArea(i, dsT, dsS); if (I.h[a * NC + i] > .3) cov += this.cellArea(i, dsT, dsS); } else if (i < NT + NS) { if (I.h[a * NC + i] > .05) ext = i - NT + 1; } else board += v; } sideExt += ext / NS; }
      return { poured: I.poured, total, top, board, runoff: I.poured ? board / I.poured : 0, coverage: cov / area, drip: sideExt / NA }; }
  }
  const API = { World, Osc, MAT, PRESETS, GEO, ICE, H, G, rotX, rotY, rotvec };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.DYN = API;
})(typeof window !== 'undefined' ? window : globalThis);
