/* tests/candles.test.js — node tests for modules/candles.js. Run: node tests/candles.test.js
   Breeding uses the shared core/breed.js (elitist 1 + lambda, keep earlier stages, freeze later groups) with a fixed careful policy:
   strength detent 9 (sigma 0.20 of a gene's range) far from the bar, detent 6 (0.075) within 0.06 of it; bias toward the stage's group; lambda 6.
   build() is checked with the repo's three.js r128 (ana/assets/three.min.js) loaded in node. Deterministic. */
'use strict';
const path = require('path'), fs = require('fs'), D = path.join(__dirname, '..');
const M = require(path.join(D, 'modules', 'candles.js')), B = require(path.join(D, 'core', 'breed.js'));
const REFS = JSON.parse(fs.readFileSync(path.join(D, 'refs', 'candles.json'), 'utf8'));
let THREE = null; try { THREE = require(path.join(D, '..', '..', '..', 'ana', 'assets', 'three.min.js')); } catch (e) { /* build checks skipped */ }
let fails = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const sigmaOf = d => .01 * Math.pow(40, d / 11), defaults = () => B.defaults(M), I = k => M.genes.findIndex(g => g[0] === k);
const withGene = (G, kv) => { const H = Float64Array.from(G); Object.entries(kv).forEach(([k, v]) => H[I(k)] = v); return H; };
/* ------------------------------------------------------------------ contract */
ok(M.name === 'candles' && Array.isArray(M.genes) && Array.isArray(M.groups) && Array.isArray(M.stages) && Array.isArray(M.making) &&
  ['blank', 'evaluate', 'build', 'anchors'].every(k => typeof M[k] === 'function'), 'contract: name, genes, groups, stages, making, blank, evaluate, build, anchors');
ok(M.genes.every(g => g.length === 5 && M.groups.includes(g[1]) && g[2] < g[3] && g[4] >= g[2] && g[4] <= g[3]) && new Set(M.genes.map(g => g[0])).size === M.genes.length,
  `genes: ${M.genes.length} named, bounded, default inside bounds, every group known`);
const Gb = M.blank(), eb = M.evaluate(Gb, REFS);
ok(Gb instanceof Float64Array && Gb.length === M.genes.length && B.inBounds(M, Gb) && eb.parts.n === 1 && B.stageOf(M, eb) === 0, 'blank(): one plain unlit stub in the middle, in bounds, no stage passed');
ok(M.stages.every(s => s.length === 3 && (s[1] === 'fit' || typeof eb.parts[s[1]] === 'number')), 'stages: every measure is fit or a numeric part');
ok(M.making.length === 14 && M.making.slice(0, 7).every((m, k) => m[0] === `PLACE CANDLE ${k + 1}`) && M.making.slice(7).every((m, k) => m[0] === `LIGHT CANDLE ${k + 1}`) &&
  M.making.every((m, i) => m[1] < m[2] && (i === 0 || m[1] >= M.making[i - 1][2] - 1e-9)), 'making: place 1..7 then light 1..7, ordered, not overlapping');
/* ------------------------------------------------------------------ determinism, range, count */
{ const a = M.evaluate(defaults(), REFS), b = M.evaluate(defaults(), REFS); ok(JSON.stringify(a) === JSON.stringify(b), 'determinism: evaluate gives identical results for the same genome'); }
{ const r = B.mulberry32(7); let good = true; for (let i = 0; i < 200; i++) { const G = Float64Array.from(M.genes, g => g[2] + r() * (g[3] - g[2])); const e = M.evaluate(G, REFS);
    if (!(e.fit >= 0 && e.fit <= 1) || M.stages.some(s => !(B.measure(e, s[1]) >= 0 && B.measure(e, s[1]) <= 1))) good = false; } ok(good, 'evaluate: fit and every stage measure within 0..1 for 200 random genomes'); }
{ const e = M.evaluate(defaults(), REFS); ok(B.stageOf(M, e) === M.stages.length, `defaults pass every stage (fit ${e.fit.toFixed(3)}; bases ${e.parts.chamferR.toFixed(3)} R from the film's on average)`);
  const c = [5, 6, 7, 8, 9].map(n => M.evaluate(withGene(defaults(), { count: n }), REFS).parts.count); ok(c[2] === 1 && c[1] < 1 && c[3] < 1 && c[0] < c[1] && c[4] < c[3], `count: seven scores 1, fewer or more score less (${c.map(v => v.toFixed(2)).join(' ')} for 5..9)`); }
/* ------------------------------------------------------------------ support: floating, sinking, off the edge, a smaller cake */
{ const G = defaults(), e = M.evaluate(G, REFS), fl = M.evaluate(withGene(G, { depth: -.006 }), REFS), sk = M.evaluate(withGene(G, { depth: .02, height: .03 }), REFS);
  const off = M.evaluate(withGene(G, { ring: .1, jitter: .3 }), REFS), small = M.evaluate(G, Object.assign({}, REFS, { support: { top: [0, .1, 0], rim: [.06, .1, 0] } }));
  ok(e.parts.support === 1, 'support: the default candles stand on the 0.12 m cake top, pushed in 5 mm');
  ok(fl.parts.support === 0 && fl.parts.placing === 0 && fl.fit < e.fit, `support: candles floating 6 mm above the top fail (support 0, fit ${e.fit.toFixed(3)} -> ${fl.fit.toFixed(3)})`);
  ok(sk.parts.support < .5, `support: candles sunk 20 mm into 30 mm shafts fail (support ${sk.parts.support.toFixed(3)})`);
  ok(off.parts.support < e.parts.support, `support: candles past the rim fail (support ${off.parts.support.toFixed(3)})`);
  ok(small.parts.support < .5 && small.parts.placing < M.stages[1][2], `support: the same genome on a 0.06 m cake is off its rim (support ${small.parts.support.toFixed(3)}; PLACING ${small.parts.placing.toFixed(3)} below its bar)`); }
/* ------------------------------------------------------------------ elitism */
{ let P = { G: M.blank() }; P.e = M.evaluate(P.G, REFS); let mono = true, prev = -1; const r = B.mulberry32(11);
  for (let gen = 0; gen < 100; gen++) { const si = B.stageOf(M, P.e); if (si >= M.stages.length) break; const m = M.stages[si][1], before = B.measure(P.e, m);
    P = B.breed(M, P, { seed: 5, gen, sigma: sigmaOf(Math.floor(r() * 12)), bias: M.groups[Math.floor(r() * M.groups.length)], lambda: 6, stage: si, keep: M.stages.slice(0, si).map(s => [s[1], s[2]]), freeze: true }, REFS).best;
    if (B.measure(P.e, m) < before - 1e-12) mono = false; }
  const F = Object.assign({}, M, { stages: [['ALL', 'fit', 1]] }); let Q = { G: M.blank() }; Q.e = M.evaluate(Q.G, REFS);
  for (let gen = 0; gen < 100; gen++) { Q = B.breed(F, Q, { seed: 6, gen, sigma: sigmaOf(Math.floor(r() * 12)), lambda: 6, stage: 0 }, REFS).best; if (Q.e.fit < prev - 1e-12) mono = false; prev = Q.e.fit; }
  ok(mono, 'elitism: the stage measure and the whole fit never fall over 100 generations with random strengths and biases'); }
/* ------------------------------------------------------------------ convergence */
function play(seed, cap) { let P = { G: M.blank() }; P.e = M.evaluate(P.G, REFS); let si = B.stageOf(M, P.e), gen = 0, last = 0; const per = [];
  while (si < M.stages.length && gen < cap) { const [grp, m, bar] = M.stages[si], sc = B.measure(P.e, m);
    P = B.breed(M, P, { seed, gen, sigma: sigmaOf(sc > bar - .06 ? 6 : 9), bias: grp, lambda: 6, stage: si, keep: M.stages.slice(0, si).map(s => [s[1], s[2]]), freeze: true }, REFS).best; gen++;
    const ns = B.stageOf(M, P.e); while (ns > si) { per.push(gen - last); last = gen; si++; } }
  return { per, gen, passed: si >= M.stages.length, e: P.e }; }
{ const CAP = 300, res = [1, 2, 3, 4, 5, 6, 7, 8].map(s => play(s, CAP)), n = res.filter(r => r.passed).length, gens = res.map(r => r.gen);
  res.forEach((r, i) => console.log(`      seed ${i + 1}: ${r.passed ? 'passed' : 'NOT passed'} in ${r.gen} generations (per stage ${r.per.join(', ')}); fit ${r.e.fit.toFixed(3)}, ${r.e.parts.n} candles, bases ${r.e.parts.chamferR.toFixed(3)} R from the film's`));
  ok(n === 8 && res.every(r => r.e.parts.n === 7), `convergence: 8/8 seeds reach every stage from the blank within ${CAP} generations, all with seven candles (median ${gens.slice().sort((a, b) => a - b)[4]}, max ${Math.max(...gens)})`); }
/* ------------------------------------------------------------------ anchors */
{ const G = defaults(), A = M.anchors(G), w = Object.keys(A).filter(k => /^wick\d+$/.test(k)), g = B.named(M, G);
  ok(w.length === 7 && w.every(k => Math.hypot(A[k][0], A[k][2]) + g.thick / 2 < .95 * .12), `anchors: seven wicks, every base inside the rim (${w.length})`);
  ok(w.every(k => Math.abs(A[k][1] - (-g.depth + g.height * (1 + g.wick))) < 1e-9), 'anchors: each wick anchor is the flame base (top surface - depth + shaft + wick)');
  const back = w.filter(k => A[k][2] < 0).length; ok(back >= 5, `anchors: the candles stand mostly at the back (${back}/7 with z < 0), leaving the front for the writing`);
  const Ad = M.anchors(G, { support: { top: [0, .11, 0], rim: [.12, .1, 0] } }); ok(w.every(k => Ad[k][1] < A[k][1]), 'anchors: on a domed top (1 cm higher at the centre than the rim) the wicks follow the surface down'); }
/* ------------------------------------------------------------------ build */
if (THREE) {
  const G = defaults(), sup = { top: [0, .1, 0], rim: [.12, .1, 0] };
  const count = (o, re) => { let n = 0; o.traverse(c => { if (re.test(c.name || '')) n++; }); return n; };
  const b0 = M.build(THREE, G, { t: 0, support: sup }), bh = M.build(THREE, G, { t: .5, support: sup }), b1 = M.build(THREE, G, { t: 1, support: sup }), bb = M.build(THREE, G, { t: 1, support: sup, blown: 3 });
  ok(count(b0, /^candle\d+$/) === 0 && count(bh, /^candle\d+$/) === 7 && count(bh, /^flame\d+$/) === 0 && count(b1, /^flame\d+$/) === 7, 'build: t=0 nothing; t=0.5 seven candles placed, none lit; t=1 seven flames');
  ok(count(bb, /^flame\d+$/) === 4, 'build: opts.blown=3 puts out the first three flames (the blow, one by one)');
  let steps = true; for (let k = 0; k <= 7; k++) { const o = M.build(THREE, G, { t: k / 14 + 1e-6, support: sup }); if (o.userData.placed !== k) steps = false; }
  for (let k = 0; k <= 7; k++) { const o = M.build(THREE, G, { t: .5 + k / 14 + 1e-6, support: sup }); if (count(o, /^flame\d+$/) !== k) steps = false; }
  ok(steps, 'build: opts.t places candles one by one (k placed at t = k/14), then lights them one by one (k flames at t = 0.5 + k/14)');
  let lowered = null; M.build(THREE, G, { t: 3.5 / 14, support: sup }).traverse(c => { if (c.name === 'candle3') lowered = c.position.y; });
  ok(lowered > -B.named(M, G).depth + .01, 'build: the candle being placed comes down from above');
  let match = 0; M.build(THREE, G, { t: .5 + 2.5 / 14, support: sup }).traverse(c => { if (c.name === 'match') match++; }); ok(match === 1, 'build: a match is held to the wick while a candle is being lit');
  let flagged = true; b1.traverse(c => { if (/flame|halo/.test(c.name) && !(c.userData && c.userData.flame)) flagged = false; }); ok(flagged, 'build: flame meshes are named flame/halo and flagged userData.flame (the host can hide or replace them)');
  let striped = 0; b1.traverse(c => { if (c.material && c.material.vertexColors) striped++; }); ok(striped === 3, `build: three striped shafts (spiral painted into the shaft) (${striped})`);
} else ok(false, 'build: three.js r128 not found at ana/assets/three.min.js');
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exitCode = fails ? 1 : 0;
