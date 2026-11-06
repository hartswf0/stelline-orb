/* ORB TOOL scene: the film-bar match of a rendered frame. The statistics are those of shared/look.js LOOK.measure (CIELAB D65 from sRGB:
   mean L, a, b, the spread of L, the red/blue ratio of the summed channels, a 25-bin L histogram compared by earth-mover distance),
   taken over the whole frame at 160x90. The targets are the same statistics of the film's frames (155 s: the party at the table;
   147.4 s: the cake floating, written), measured outside the repo; only these numbers are committed.
   match() is 0..1: the mean over six terms of max(0, 1 - error / scale). Browser global SCENE_MEASURE; node module.exports. */
(function (root) {
  'use strict';
  const TARGETS = {
    party: { t: 155, L: 9.22, a: 0.74, b: 8.09, sL: 14.92, rb: 3.059, hist: [0.6976, 0.0859, 0.03, 0.0256, 0.0189, 0.0169, 0.0117, 0.0102, 0.0142, 0.0124, 0.0115, 0.0126, 0.0093, 0.0097, 0.0113, 0.0145, 0.0054, 0.0011, 0.0006, 0.0001, 0.0002, 0.0001, 0.0001, 0, 0] },
    floating: { t: 147.4, L: 7.08, a: -0.85, b: 4.06, sL: 11.53, rb: 1.667, hist: [0.5162, 0.3487, 0.0311, 0.0182, 0.0122, 0.0092, 0.0082, 0.0061, 0.0046, 0.004, 0.0065, 0.007, 0.0037, 0.0051, 0.0045, 0.0031, 0.004, 0.0058, 0.0017, 0.0001, 0.0001, 0, 0, 0, 0] } };
  const LUT = new Float64Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; LUT[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  // data: RGBA bytes (ImageData.data or a Uint8Array), n pixels
  function stats(data, n) {
    let sL = 0, sa = 0, sb = 0, qL = 0, R = 0, B = 0; const h = new Float64Array(25);
    for (let i = 0; i < n; i++) { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2], lr = LUT[r], lg = LUT[g], lb = LUT[b];
      const x = f((0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047), y = f(0.2126 * lr + 0.7152 * lg + 0.0722 * lb), z = f((0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883);
      const L = 116 * y - 16; sL += L; qL += L * L; sa += 500 * (x - y); sb += 200 * (y - z); R += r; B += b; h[Math.min(24, Math.max(0, Math.floor(L / 100 * 25)))]++; }
    return { L: sL / n, a: sa / n, b: sb / n, sL: Math.sqrt(Math.max(0, qL / n - (sL / n) * (sL / n))), rb: R / Math.max(1, B), hist: Array.from(h, v => v / n) }; }
  function emd(h1, h2) { let c1 = 0, c2 = 0, s = 0; const w = 100 / h1.length; for (let i = 0; i < h1.length; i++) { c1 += h1[i]; c2 += h2[i]; s += Math.abs(c1 - c2) * w; } return s; }
  function match(s, T) { const term = (e, k) => Math.max(0, 1 - e / k);
    const parts = { L: term(Math.abs(s.L - T.L), 8), a: term(Math.abs(s.a - T.a), 4), b: term(Math.abs(s.b - T.b), 6), sL: term(Math.abs(s.sL - T.sL), 8), rb: term(Math.abs(s.rb - T.rb), T.rb * 0.5), hist: term(emd(s.hist, T.hist), 6) };
    const v = Object.values(parts).reduce((a, b) => a + b, 0) / 6; return { value: v, parts }; }
  // which film moment the memory is at: the party (table up, someone arrived) or the floating cake
  const targetFor = v => (v && v.table && v.table.up && (v.people || []).some(p => p.arrived >= 5)) ? 'party' : 'floating';
  const API = { TARGETS, stats, emd, match, targetFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SCENE_MEASURE = API;
})(typeof window !== 'undefined' ? window : globalThis);
