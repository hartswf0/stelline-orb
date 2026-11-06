/* The sounds of the shot, rendered to sample arrays (the same function voices the page and mixes proof.mp4).
   Device clicks are grains of ana/device-sounds.wav when it is present (gitignored); otherwise synthesized.
   The making (thump, pour, pipe, tap, match, catch, fall, blow) is synthesized here; nothing is sampled from the film. */
(function (root) {
  'use strict';
  // grain map of device-sounds.wav (offset s, length s), as in ana/index.html
  const SPR = { click: [[0, .065], [.115, .065], [.23, .065], [.345, .065], [.46, .065], [.575, .065], [.69, .065], [.805, .065], [.92, .065]], ratchet: [[1.035, .05], [1.135, .05], [1.235, .05], [1.335, .05]], tick: [[1.435, .04], [1.525, .04]], comb: [[1.615, .37]] };
  function rng(seed) { let s = (Math.floor(seed * 1000) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647 * 2 - 1; }
  function biquad(x, type, f, q, SR) { const w = 2 * Math.PI * f / SR, a = Math.sin(w) / (2 * q), c = Math.cos(w); let b0, b1, b2, a0, a1, a2;
    if (type === 'bp') { b0 = a; b1 = 0; b2 = -a; } else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
  const env = (n, SR, att, dec) => i => { const t = i / SR; return t < att ? t / att : Math.exp(-(t - att) / dec); };
  function noiseBuf(len, SR, r) { const n = Math.floor(len * SR), a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = r(); return a; }
  function grainOf(G, kind, idx, rate, vol) { const set = SPR[kind], [o, d] = set[idx % set.length], n = Math.floor(d * G.SR / rate), y = new Float32Array(n);
    for (let i = 0; i < n; i++) { const si = o * G.SR + i * rate, k = Math.floor(si), fr = si - k; y[i] = ((G.data[k] || 0) * (1 - fr) + (G.data[k + 1] || 0) * fr) * vol; } return y; }
  // ev: one entry of the game's sound log
  function render(ev, SR, G) {
    const r = rng(ev.t * 7.3 + 3), T = ev.type;
    if (T === 'click' || T === 'hand') { const vol = T === 'hand' ? .22 : .75, rate = T === 'hand' ? 1.25 + ev.ring * .03 : 1 + (ev.ring - 1) * .045;
      if (G) return grainOf(G, ev.fast ? 'ratchet' : 'click', ev.g || 0, rate, vol); const x = biquad(noiseBuf(.05, SR, r), 'bp', 2600 * rate, 2.2, SR), e = env(0, SR, .001, .008); return x.map((v, i) => v * e(i) * vol * 1.6); }
    if (T === 'select') { const y = new Float32Array(Math.floor(.3 * SR)); for (let k = 0; k < 5; k++) { const b = Math.round(k * .055 * SR); for (let i = 0; i < .03 * SR; i++) { const t = i / SR, e = t < .004 ? t / .004 : 1 - (t - .004) / .026; y[b + i] += Math.sin(2 * Math.PI * 12000 * t) * .03 * e; } } return y; }
    if (T === 'wash') { const x = biquad(noiseBuf(.6, SR, r), 'hp', 2200, .7, SR); return x.map((v, i) => { const t = i / SR; return v * .22 * (ev.v || 1) * (t < .06 ? t / .06 : Math.exp(-(t - .06) / .12)); }); }
    if (T === 'sweep') { const y = new Float32Array(Math.floor(1.5 * SR)); [0, .18, .36].forEach((d, k) => { let ph = 0; for (let i = 0; i < 1.1 * SR; i++) { const t = i / SR, f = (6000 + k * 300) * Math.pow((11500 + k * 200) / (6000 + k * 300), t / 1.1); ph += 2 * Math.PI * f / SR; const e = t < .08 ? t / .08 : 1 - (t - .08) / 1.02; y[Math.floor(d * SR) + i] += Math.sin(ph) * .02 * e; } }); return y; }
    if (T === 'thump') { // a sponge layer set down: a soft low body and a short pad of air
      const n = Math.floor(.35 * SR), y = new Float32Array(n), nz = biquad(noiseBuf(.35, SR, r), 'lp', 500, .7, SR); let ph = 0;
      for (let i = 0; i < n; i++) { const t = i / SR, f = 95 - 35 * Math.min(1, t / .12); ph += 2 * Math.PI * f / SR; y[i] = Math.sin(ph) * .5 * Math.exp(-t / .07) * Math.min(1, t / .004) + nz[i] * .35 * Math.exp(-t / .03); } return y; }
    if (T === 'pour') { // a thick pour: low-passed noise, slowly gurgling, for the pour's length
      const d = (ev.dur || 1.2) + .5, nz = biquad(noiseBuf(d, SR, r), 'lp', 420, 1.2, SR), y = new Float32Array(nz.length);
      for (let i = 0; i < y.length; i++) { const t = i / SR, e = Math.min(1, t / .15) * (t > d - .5 ? Math.max(0, (d - t) / .5) : 1), g = .6 + .4 * Math.sin(2 * Math.PI * (5.5 + 2 * Math.sin(t * 3.1)) * t); y[i] = nz[i] * .9 * e * g; } return y; }
    if (T === 'pipe') { // cream through a nozzle: a short squeeze
      const d = ev.soft ? .07 : .11, nz = biquad(noiseBuf(d, SR, r), 'bp', ev.soft ? 1500 : 900 + (ev.n || 0) % 5 * 60, 3, SR); return nz.map((v, i) => { const t = i / SR; return v * (ev.soft ? .35 : .55) * Math.sin(Math.PI * t / d); }); }
    if (T === 'tap') { // a candle pushed into sponge: a waxy tick and a small low push
      const n = Math.floor(.18 * SR), y = new Float32Array(n), nz = biquad(noiseBuf(.18, SR, r), 'bp', 2400, 4, SR); let ph = 0;
      for (let i = 0; i < n; i++) { const t = i / SR; ph += 2 * Math.PI * 180 / SR; y[i] = nz[i] * .6 * Math.exp(-t / .006) + Math.sin(ph) * .22 * Math.exp(-t / .05) * Math.min(1, t / .01); } return y; }
    if (T === 'match') { // strike, then the flare
      const nz = noiseBuf(.8, SR, r), hs = biquad(nz, 'hp', 3000, .8, SR), fl = biquad(nz, 'bp', 1200, .9, SR); return hs.map((v, i) => { const t = i / SR; return v * .5 * (t < .12 ? Math.min(1, t / .005) * (1 - t / .12 * .5) : 0) + fl[i] * .45 * (t > .1 ? Math.exp(-(t - .1) / .2) * Math.min(1, (t - .1) / .03) : 0); }); }
    if (T === 'catch') { const nz = biquad(noiseBuf(.3, SR, r), 'lp', 900, .8, SR); return nz.map((v, i) => { const t = i / SR; return v * .4 * Math.sin(Math.PI * Math.min(1, t / .25)); }); }
    if (T === 'fall') { const n = Math.floor(.45 * SR), y = new Float32Array(n), nz = biquad(noiseBuf(.45, SR, r), 'bp', 1600, 2, SR); for (let i = 0; i < n; i++) { const t = i / SR; y[i] = nz[i] * .3 * Math.min(1, t / .15) * (t < .2 ? 1 : Math.exp(-(t - .2) / .04)) + (t > .2 ? nz[i] * 1.2 * Math.exp(-(t - .2) / .01) : 0); } return y; }
    if (T === 'clatter') { const nz = biquad(noiseBuf(.08, SR, r), 'bp', 2800, 3, SR); return nz.map((v, i) => v * .5 * Math.exp(-i / SR / .008)); }
    if (T === 'out') { const nz = biquad(noiseBuf(.15, SR, r), 'lp', 700, .7, SR); return nz.map((v, i) => { const t = i / SR; return v * .25 * Math.sin(Math.PI * t / .15); }); }
    if (T === 'blow') { const d = 1.3, nz = biquad(biquad(noiseBuf(d, SR, r), 'bp', 700, .6, SR), 'lp', 2500, .7, SR); return nz.map((v, i) => { const t = i / SR; return v * 1.1 * Math.min(1, t / .12) * Math.max(0, 1 - Math.max(0, t - .35) / (d - .35)); }); }
    if (T === 'refuse') { const n = Math.floor(.12 * SR), y = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; y[i] = Math.sin(2 * Math.PI * 120 * t) * .3 * Math.exp(-t / .03); } return y; }
    return new Float32Array(0);
  }
  function wavToGrains(buf) { // 16-bit mono PCM wav (node Buffer or ArrayBuffer via DataView)
    const dv = buf instanceof ArrayBuffer ? new DataView(buf) : new DataView(buf.buffer, buf.byteOffset, buf.byteLength); let off = 12, SR = 48000;
    while (off < dv.byteLength) { const id = String.fromCharCode(dv.getUint8(off), dv.getUint8(off + 1), dv.getUint8(off + 2), dv.getUint8(off + 3)), len = dv.getUint32(off + 4, true);
      if (id === 'fmt ') SR = dv.getUint32(off + 12, true); if (id === 'data') { const n = len / 2, d = new Float32Array(n); for (let i = 0; i < n; i++) d[i] = dv.getInt16(off + 8 + i * 2, true) / 32768; return { SR, data: d }; } off += 8 + len; } return null; }
  const API = { render, wavToGrains, SPR };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SOUND = API;
})(typeof window !== 'undefined' ? window : globalThis);
