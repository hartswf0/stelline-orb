/* sound.js: the sounds of making, synthesized as sample arrays by one function, so the page (live) and mix.js (the proof's
   soundtrack, offline) make the same sound from the same log entry. The device's clicks are grains cut from
   ana/device-sounds.wav (the real device recording, gitignored) when it is present; otherwise a synthesized click.
   Every entry is deterministic: its own seed. */
(function (root) {
  'use strict';
  const GRAINS = { click: [[0, .065], [.115, .065], [.23, .065], [.345, .065], [.46, .065], [.575, .065], [.69, .065], [.805, .065], [.92, .065]], ratchet: [[1.035, .05], [1.135, .05], [1.235, .05], [1.335, .05]], tick: [[1.435, .04], [1.525, .04]], comb: [[1.615, .37]] };
  function rng(seed) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647 * 2 - 1; }
  // one-pole filters on a sample array
  function lp(x, f, sr) { const a = Math.exp(-2 * Math.PI * f / sr); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } return x; }
  function hp(x, f, sr) { const a = Math.exp(-2 * Math.PI * f / sr); let y = 0, px = 0; for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } return x; }
  function bp(x, f, sr) { return lp(hp(x, f * .7, sr), f * 1.4, sr); }
  function env(n, sr, att, dec) { return i => { const t = i / sr; return t < att ? t / att : Math.exp(-(t - att) / dec); }; }
  /* synth(type, p, sr) -> Float32Array. p: { seed, vol, rate, ... } */
  function synth(type, p, sr) {
    const R = rng(p.seed || 1), v = p.vol == null ? 1 : p.vol; let n, x, e;
    switch (type) {
      case 'hand': case 'click': { // fallback device click (used only when the real grains are missing)
        n = Math.round(.045 * sr); x = new Float32Array(n).map(() => R()); bp(x, 2600 * (p.rate || 1), sr); e = env(n, sr, .0005, .006); for (let i = 0; i < n; i++) x[i] *= e(i) * v * 1.6; return x; }
      case 'knead': { // dough pressed: a soft low thump
        n = Math.round(.16 * sr); x = new Float32Array(n).map(() => R()); lp(x, 260, sr); lp(x, 260, sr); e = env(n, sr, .01, .045); for (let i = 0; i < n; i++) x[i] = (x[i] * 6 + Math.sin(2 * Math.PI * 95 * i / sr) * .25) * e(i) * v; return x; }
      case 'rise': { // the bake rising: a short warm breath
        n = Math.round(.12 * sr); x = new Float32Array(n).map(() => R()); bp(x, 700 + (p.k || 0) * 25, sr); e = env(n, sr, .03, .04); for (let i = 0; i < n; i++) x[i] *= e(i) * v * 1.3; return x; }
      case 'pour': { // icing or ganache running down: smooth, low, a little longer
        n = Math.round(.2 * sr); x = new Float32Array(n).map(() => R()); lp(x, 520, sr); lp(x, 900, sr); e = env(n, sr, .04, .07); for (let i = 0; i < n; i++) x[i] *= e(i) * v * 3.2 * (1 + .3 * Math.sin(2 * Math.PI * 11 * i / sr)); return x; }
      case 'tier': { // a stage set down: a thud on the board
        n = Math.round(.3 * sr); x = new Float32Array(n); const nz = R; for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (Math.sin(2 * Math.PI * (78 - 30 * t) * t) * Math.exp(-t / .07) + nz() * .25 * Math.exp(-t / .012)) * v; } return x; }
      case 'pipe': { // piping the inscription: a squeeze through a nozzle
        n = Math.round(.11 * sr); x = new Float32Array(n).map(() => R()); const f0 = 1100 + (p.k || 0) % 5 * 90; for (let i = 0; i < n; i++) x[i] *= 1; bp(x, f0, sr); e = env(n, sr, .015, .035); for (let i = 0; i < n; i++) x[i] *= e(i) * v * 1.5 * (1 + .5 * Math.sin(2 * Math.PI * 38 * i / sr)); return x; }
      case 'candle': { // a candle pushed into the cake: a small tock
        n = Math.round(.09 * sr); x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = (Math.sin(2 * Math.PI * 1250 * t) * Math.exp(-t / .012) * .5 + R() * Math.exp(-t / .003) * .4) * v; } return x; }
      case 'strike': { // a match struck: scrape, then the head catches
        n = Math.round(.42 * sr); x = new Float32Array(n).map(() => R()); hp(x, 2500, sr); for (let i = 0; i < n; i++) { const t = i / sr; const scrape = t < .12 ? (1 - Math.abs(t - .06) / .06) : 0, burn = t > .1 ? Math.exp(-(t - .1) / .12) * .6 : 0; x[i] *= (scrape * 1.2 + burn) * v; } return x; }
      case 'flare': { // a wick takes the flame
        n = Math.round(.22 * sr); x = new Float32Array(n).map(() => R()); lp(x, 900, sr); e = env(n, sr, .03, .06); for (let i = 0; i < n; i++) x[i] *= e(i) * v * 2.4; return x; }
      case 'blow': { // her breath
        n = Math.round(1.0 * sr); x = new Float32Array(n).map(() => R()); bp(x, 1100, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= Math.min(1, t / .12) * Math.exp(-Math.max(0, t - .35) / .25) * v * 1.4; } return x; }
      case 'out': { // a flame out: a tiny hiss
        n = Math.round(.12 * sr); x = new Float32Array(n).map(() => R()); hp(x, 4000, sr); e = env(n, sr, .002, .03); for (let i = 0; i < n; i++) x[i] *= e(i) * v * .5; return x; }
      case 'wash': { // the memory changes state (arrival, a cut, a silver decay)
        n = Math.round(.6 * sr); x = new Float32Array(n).map(() => R()); hp(x, 2200, sr); for (let i = 0; i < n; i++) { const t = i / sr; x[i] *= .22 * v * (t < .06 ? t / .06 : Math.exp(-(t - .06) / .12)); } return x; }
      case 'select': { n = Math.round(.3 * sr); x = new Float32Array(n); for (let k = 0; k < 5; k++) { const b = Math.round(k * .055 * sr); for (let i = 0; i < .03 * sr && b + i < n; i++) { const t = i / sr, a = t < .004 ? t / .004 : 1 - (t - .004) / .026; x[b + i] += Math.sin(2 * Math.PI * 12000 * t) * .03 * a; } } return x; }
      case 'refuse': { n = Math.round(.12 * sr); x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / sr; x[i] = Math.sin(2 * Math.PI * 330 * t) * .08 * Math.exp(-t / .04) * v; } return x; }
    }
    return new Float32Array(1);
  }
  const API = { GRAINS, synth };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SOUND = API;
})(typeof window !== 'undefined' ? window : globalThis);
