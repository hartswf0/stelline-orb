/* core/breed.js — the one breeding routine every part shares (and the UI genome too). Adapted from ../evolve/evolve-core.js breed():
   seeded mulberry32, elitist (1 + lambda), mutation strength per group, bias toward one trait group.
   Modules never breed themselves: the host calls breed(mod, parent, opts, refs). Node and browser (window.BREED). No DOM, no THREE. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.BREED = factory(); })(this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(...xs) { let h = 2166136261; for (const x of xs) { const v = typeof x === 'string' ? strHash(x) : (x | 0); h ^= v; h = Math.imul(h, 16777619); } return h >>> 0; }
  function strHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2654435761); return h | 0; }
  function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  /* a stage's measure: 'fit' is the whole match; any other name is read from evaluate().parts */
  function measure(e, m) { if (!e) return 0; if (m === 'fit' || m == null) return +e.fit || 0; const v = e.parts ? e.parts[m] : undefined; return typeof v === 'number' ? v : +e.fit || 0; }
  /* the first stage not yet passed (stages are ordered; a stage counts as passed only when every stage before it passes too) */
  function stageOf(mod, e) { for (let i = 0; i < mod.stages.length; i++) { const [, m, th] = mod.stages[i]; if (measure(e, m) < th) return i; } return mod.stages.length; }
  /* per-gene weights: no bias = every gene moves; a bias group = that group's genes fully, the rest at 0.2 */
  function weights(mod, bias) { return mod.genes.map(g => !bias || bias === 'ALL' ? 1 : g[1] === bias ? 1 : .2); }
  function sigmaFor(opts, group) { const s = opts.sigma; return typeof s === 'number' ? s : s && s[group] != null ? s[group] : .1; }
  /* a child is admissible when it keeps every stage already passed (opts.keep: [[measure, threshold], ...]) */
  function admissible(e, keep) { return !keep || keep.every(([m, th]) => measure(e, m) >= th); }
  /* breed: opts { seed, gen, sigma (number or {group: s}), bias (group name or null), lambda, stage (index), keep } -> children + the elite.
     Elitist: the parent survives unless an admissible child scores strictly higher on the stage's measure. Deterministic for the same inputs. */
  function breed(mod, parent, opts, refs) {
    opts = opts || {}; const lambda = Math.max(1, opts.lambda | 0 || 8), si = Math.min(opts.stage | 0, mod.stages.length - 1), m = mod.stages.length ? mod.stages[si][1] : 'fit';
    const r = mulberry32(hash(opts.seed || 1, opts.gen || 0, mod.name)), w = weights(mod, opts.bias), pe = parent.e || mod.evaluate(parent.G, refs), ps = measure(pe, m), kids = [];
    for (let c = 0; c < lambda; c++) { const fine = c >= Math.ceil(lambda / 2) ? .35 : 1;     // half the brood at full strength, half fine
      const G = new Float64Array(mod.genes.length);
      mod.genes.forEach((g, i) => { const [, grp, lo, hi] = g, v = parent.G[i]; G[i] = w[i] ? clamp(v + sigmaFor(opts, grp) * w[i] * fine * (hi - lo) * gauss(r), lo, hi) : v; });
      const e = mod.evaluate(G, refs); kids.push({ G, e, score: measure(e, m), ok: admissible(e, opts.keep) }); }
    return Object.assign({ kids, measure: m, parentScore: ps }, pick({ G: parent.G, e: pe }, kids, lambda, m, opts.keep));
  }
  /* pick the elite among the parent and the first n children (n < lambda when the player keeps before every child was shown) */
  function pick(parent, kids, n, m, keep) { const pe = parent.e; let best = { G: parent.G, e: pe, score: measure(pe, m) }, bi = -1;
    kids.slice(0, n).forEach((k, i) => { if (k.ok !== false && admissible(k.e, keep) && k.score > best.score) { best = k; bi = i; } });
    return { best: { G: best.G, e: best.e, score: best.score }, bestIndex: bi }; }
  function blank(mod) { const G = mod.blank(); return G instanceof Float64Array ? G : Float64Array.from(G); }
  function defaults(mod) { return Float64Array.from(mod.genes.map(g => g[4])); }
  function inBounds(mod, G) { return mod.genes.every((g, i) => G[i] >= g[2] - 1e-12 && G[i] <= g[3] + 1e-12 && Number.isFinite(G[i])); }
  function named(mod, G) { const o = {}; mod.genes.forEach((g, i) => o[g[0]] = G[i]); return o; }
  return { mulberry32, hash, gauss, clamp, measure, stageOf, weights, admissible, breed, pick, blank, defaults, inBounds, named };
});
