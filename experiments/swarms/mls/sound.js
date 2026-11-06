/* The soundtrack of THE BLOW, mixed sample by sample from the score's events.
   Device grains come from ana/device-sounds.wav (the real click grains; slot table copied from ana/index.html).
   Breath, candle-outs, wash and room tone are synthesized here. Pure function: used by the browser (AudioBuffer)
   and by node (proof.wav), so the film and the page play the same mix. */
(function (root) {
  const SPR = { click: [[0, .065], [.115, .065], [.23, .065], [.345, .065], [.46, .065], [.575, .065], [.69, .065], [.805, .065], [.92, .065]],
    ratchet: [[1.035, .05], [1.135, .05], [1.235, .05], [1.335, .05]], tick: [[1.435, .04], [1.525, .04]], comb: [[1.615, .37]], whirr: [[2.035, .62]] };

  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function biquad(type, f, q, sr) { // RBJ cookbook
    const w = 2 * Math.PI * f / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q); let b0, b1, b2, a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; } else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  function filt() { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; return (c, x) => { const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; }; }

  // grains: Float32Array of the device wav (mono), gsr its sample rate (may be null -> synthesized clicks)
  function mix(events, opt) {
    const sr = opt.sr || 48000, dur = opt.dur || 10, N = Math.round(sr * dur), out = new Float32Array(N), R = rng(opt.seed || 2049);
    const G = opt.grains, gsr = opt.gsr || 48000, light = opt.light || (() => 1);
    function grain(at, kind, rate, vol) {
      const s = SPR[kind][Math.floor(R() * SPR[kind].length)], o = s[0] * gsr, d = s[1] * gsr, i0 = Math.round(at * sr);
      if (!G) { for (let i = 0; i < sr * .02; i++) { const k = i0 + i; if (k >= 0 && k < N) out[k] += vol * (R() * 2 - 1) * Math.exp(-i / (sr * .003)); } return; }
      const n = Math.floor(d / rate * sr / gsr);
      for (let i = 0; i < n; i++) { const src = o + i * rate * gsr / sr, j = Math.floor(src), f = src - j; if (j + 1 >= G.length) break; const k = i0 + i; if (k >= 0 && k < N) out[k] += vol * (G[j] * (1 - f) + G[j + 1] * f); }
    }
    function noiseBand(at, len, shape, filters, vol) { // shape(u in 0..1) -> envelope; filters: [{type,f(u),q}]
      const i0 = Math.round(at * sr), n = Math.round(len * sr), F = filters.map(() => filt()); let cs = null;
      for (let i = 0; i < n; i++) {
        const u = i / n; if (i % 64 === 0) cs = filters.map(fl => biquad(fl.type, typeof fl.f === 'function' ? fl.f(u) : fl.f, fl.q || .707, sr));
        let x = R() * 2 - 1; for (let k = 0; k < F.length; k++) x = F[k](cs[k], x);
        const j = i0 + i; if (j >= 0 && j < N) out[j] += vol * shape(u) * x;
      }
    }
    function tone(at, len, f, vol) { const i0 = Math.round(at * sr), n = Math.round(len * sr); for (let i = 0; i < n; i++) { const j = i0 + i; if (j < N) out[j] += vol * Math.sin(2 * Math.PI * f * i / sr) * Math.exp(-i / (n * .3)); } }
    // room tone: very low rumble + a faint candle hiss that falls with the light
    if (!opt.noRoom) { const lp = filt(), hp = filt(), c1 = biquad('lp', 180, .7, sr), c2 = biquad('bp', 4200, .9, sr);
      for (let i = 0; i < N; i++) { const t = i / sr; out[i] += .02 * lp(c1, R() * 2 - 1) + .006 * light(t) * hp(c2, R() * 2 - 1); } }
    for (const e of events) {
      if (e.kind === 'detent') grain(e.t, 'click', 1.25 + (R() - .5) * .03, .22);
      else if (e.kind === 'step') grain(e.t, 'click', 1 + (R() - .5) * .02, .7);
      else if (e.kind === 'inhale') noiseBand(e.t, e.dur, u => Math.pow(u, 1.4) * (1 - Math.pow(u, 12)), [{ type: 'bp', f: u => 700 + 1200 * u, q: .8 }], .5);
      else if (e.kind === 'blow') {
        noiseBand(e.t, .05, u => 1 - u, [{ type: 'lp', f: 900 }], .5); // the lips part: a soft plosive
        noiseBand(e.t, e.dur, u => Math.min(1, u / .05) * (1 - Math.pow(Math.max(0, (u - .55) / .45), 1.5)) * (.85 + .3 * Math.sin(u * 37)),
          [{ type: 'lp', f: 1500 }, { type: 'bp', f: u => 520 - 140 * u, q: .6 }], 1.1);
      } else if (e.kind === 'out') { noiseBand(e.t, .09, u => Math.pow(1 - u, 2), [{ type: 'bp', f: 2400, q: 1.2 }], .5); tone(e.t, .06, 85 + e.i * 6, .12); }
      else if (e.kind === 'wash') { noiseBand(e.t, .6, u => Math.min(1, u / .1) * Math.pow(1 - u, 2), [{ type: 'hp', f: 2200 }], .25); grain(e.t + .02, 'comb', 1, .3); }
      else if (e.kind === 'select') { for (let k = 0; k < 5; k++) tone(e.t + k * .055, .03, 12000, .05); }
      else if (e.kind === 'family') { grain(e.t, 'tick', 1, .5); grain(e.t + .06, 'tick', 1.1, .4); }
      else if (e.kind === 'refuse') grain(e.t, 'tick', .7, .4);
      else if (e.kind === 'fail') grain(e.t, 'comb', .7, .4);
      else if (e.kind === 'off') { noiseBand(e.t, .8, u => Math.min(1, u / .1) * Math.pow(1 - u, 2), [{ type: 'hp', f: 1800 }], .3); grain(e.t, 'whirr', .8, .3); }
      else if (e.kind === 'breathout') noiseBand(e.t, e.dur, u => Math.sin(Math.PI * u), [{ type: 'lp', f: 900 }], .25);
    }
    if (opt.noNorm) return out;
    let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(out[i]));
    const g = .85 / (pk || 1); for (let i = 0; i < N; i++) out[i] *= g;
    return out;
  }
  const api = { mix, SPR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SOUND = api;
})(typeof self !== 'undefined' ? self : this);
