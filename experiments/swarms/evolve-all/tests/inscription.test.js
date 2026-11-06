/* tests/inscription.test.js — node tests for modules/inscription.js. Run: node tests/inscription.test.js
   Breeding uses the shared core/breed.js (elitist 1 + lambda, keep earlier stages, freeze later groups) with a fixed careful policy:
   strength detent 9 (sigma 0.20 of a gene's range) far from the bar, detent 6 (0.075) within 0.06 of it; bias toward the stage's group; lambda 6.
   build() is checked with the repo's three.js r128 (ana/assets/three.min.js) loaded in node. Deterministic. */
'use strict';
const path = require('path'), fs = require('fs'), D = path.join(__dirname, '..');
const M = require(path.join(D, 'modules', 'inscription.js')), B = require(path.join(D, 'core', 'breed.js'));
const REFS = JSON.parse(fs.readFileSync(path.join(D, 'refs', 'inscription.json'), 'utf8'));
let THREE = null; try { THREE = require(path.join(D, '..', '..', '..', 'ana', 'assets', 'three.min.js')); } catch (e) { /* build checks skipped */ }
let fails = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const sigmaOf = d => .01 * Math.pow(40, d / 11);
const defaults = () => B.defaults(M);
/* ------------------------------------------------------------------ contract */
ok(M.name === 'inscription' && Array.isArray(M.genes) && Array.isArray(M.groups) && Array.isArray(M.stages) && Array.isArray(M.making) &&
  ['blank', 'evaluate', 'build', 'anchors'].every(k => typeof M[k] === 'function'), 'contract: name, genes, groups, stages, making, blank, evaluate, build, anchors');
ok(M.genes.every(g => g.length === 5 && typeof g[0] === 'string' && M.groups.includes(g[1]) && g[2] < g[3] && g[4] >= g[2] && g[4] <= g[3]) && new Set(M.genes.map(g => g[0])).size === M.genes.length,
  `genes: ${M.genes.length} named, bounded, default inside bounds, every group known`);
ok(M.groups.every(gr => M.genes.some(g => g[1] === gr)), 'groups: every group has genes');
const Gb = M.blank(); ok(Gb instanceof Float64Array && Gb.length === M.genes.length && B.inBounds(M, Gb), 'blank(): Float64Array of the genome length, in bounds');
const eb = M.evaluate(Gb, REFS); ok(eb.parts.n === 1 && eb.parts.form < .4 && B.stageOf(M, eb) === 0, `blank is one dash of icing (strokes written ${eb.parts.n}, form ${eb.parts.form.toFixed(3)}, no stage passed)`);
ok(M.stages.every(s => s.length === 3 && (s[1] === 'fit' || typeof eb.parts[s[1]] === 'number')), 'stages: every measure is fit or a numeric part');
ok(M.making.length === 24 && M.making.every((m, i) => m[1] < m[2] && m[1] >= 0 && m[2] <= 1 && (i === 0 || m[1] >= M.making[i - 1][2])), 'making: 24 steps (21 strokes + 3 flourish bars), ordered, inside 0..1, not overlapping');
ok(JSON.stringify(M.table(REFS).making) === JSON.stringify(M.making), 'making: the written-out steps equal what refs/inscription.json gives (film timing)');
const strokesPerChar = REFS.chars.map(c => REFS.medians[c].length); ok(strokesPerChar.join(',') === '5,4,7,5', 'refs: stroke counts 生 5, 日 4, 快 7, 乐 5 (hanzi-writer-data)');
/* ------------------------------------------------------------------ determinism and range */
{ const a = M.evaluate(defaults(), REFS), b = M.evaluate(defaults(), REFS); ok(JSON.stringify(a) === JSON.stringify(b), 'determinism: evaluate gives identical results for the same genome'); }
{ const r = B.mulberry32(7); let good = true; for (let i = 0; i < 200; i++) { const G = Float64Array.from(M.genes, g => g[2] + r() * (g[3] - g[2])); const e = M.evaluate(G, REFS);
    if (!(e.fit >= 0 && e.fit <= 1) || M.stages.some(s => !(B.measure(e, s[1]) >= 0 && B.measure(e, s[1]) <= 1))) good = false; } ok(good, 'evaluate: fit and every stage measure within 0..1 for 200 random genomes'); }
{ const e = M.evaluate(defaults(), REFS); ok(B.stageOf(M, e) === M.stages.length, `defaults pass every stage (fit ${e.fit.toFixed(3)}; centre error ${e.parts.errCentreR.toFixed(3)} R, flourish corner error ${e.parts.errFlourishR.toFixed(3)} R)`); }
/* ------------------------------------------------------------------ elitism: each stage measure never falls; with the whole fit as the measure, fit never falls */
{ let P = { G: M.blank() }; P.e = M.evaluate(P.G, REFS); let mono = true, prev = -1, si = 0; const r = B.mulberry32(11);
  for (let gen = 0; gen < 100; gen++) { si = B.stageOf(M, P.e); if (si >= M.stages.length) break; const m = M.stages[si][1], before = B.measure(P.e, m);
    P = B.breed(M, P, { seed: 5, gen, sigma: sigmaOf(Math.floor(r() * 12)), bias: M.groups[Math.floor(r() * M.groups.length)], lambda: 6, stage: si, keep: M.stages.slice(0, si).map(s => [s[1], s[2]]), freeze: true }, REFS).best;
    if (B.measure(P.e, m) < before - 1e-12) mono = false; }
  const F = Object.assign({}, M, { stages: [['ALL', 'fit', 1]] }); let Q = { G: M.blank() }; Q.e = M.evaluate(Q.G, REFS);
  for (let gen = 0; gen < 100; gen++) { Q = B.breed(F, Q, { seed: 6, gen, sigma: sigmaOf(Math.floor(r() * 12)), lambda: 6, stage: 0 }, REFS).best; if (Q.e.fit < prev - 1e-12) mono = false; prev = Q.e.fit; }
  ok(mono, 'elitism: the stage measure and the whole fit never fall over 100 generations with random strengths and biases'); }
/* ------------------------------------------------------------------ convergence: blank -> every stage, careful policy */
function play(seed, cap) { let P = { G: M.blank() }; P.e = M.evaluate(P.G, REFS); let si = B.stageOf(M, P.e), gen = 0, last = 0; const per = [];
  while (si < M.stages.length && gen < cap) { const [grp, m, bar] = M.stages[si], sc = B.measure(P.e, m);
    P = B.breed(M, P, { seed, gen, sigma: sigmaOf(sc > bar - .06 ? 6 : 9), bias: grp, lambda: 6, stage: si, keep: M.stages.slice(0, si).map(s => [s[1], s[2]]), freeze: true }, REFS).best; gen++;
    const ns = B.stageOf(M, P.e); while (ns > si) { per.push(gen - last); last = gen; si++; } }
  return { per, gen, passed: si >= M.stages.length, e: P.e }; }
{ const CAP = 250, res = [1, 2, 3, 4, 5, 6, 7, 8].map(s => play(s, CAP)), n = res.filter(r => r.passed).length, gens = res.map(r => r.gen);
  res.forEach((r, i) => console.log(`      seed ${i + 1}: ${r.passed ? 'passed' : 'NOT passed'} in ${r.gen} generations (per stage ${r.per.join(', ')}); fit ${r.e.fit.toFixed(3)}`));
  ok(n === 8, `convergence: 8/8 seeds reach every stage from the blank within ${CAP} generations (median ${gens.slice().sort((a, b) => a - b)[4]}, max ${Math.max(...gens)})`); }
/* ------------------------------------------------------------------ support: the cake under it */
{ const G = defaults(), on = M.evaluate(G, REFS), small = M.evaluate(G, Object.assign({}, REFS, { support: { top: [0, .1, 0], rim: [.06, .1, 0] } }));
  ok(on.parts.support > .99 && small.parts.support < .9 && small.fit < on.fit, `support: on the 0.12 m cake ${on.parts.support.toFixed(3)}; the same writing on a 0.06 m cake runs off the rim (support ${small.parts.support.toFixed(3)}, fit ${on.fit.toFixed(3)} -> ${small.fit.toFixed(3)})`);
  const big = M.evaluate(G, Object.assign({}, REFS, { cakeTop: { y: 0, r: .2 } })); ok(big.parts.hand < on.parts.hand, `support: on a 0.2 m cake the same writing no longer matches the film's proportions (hand ${on.parts.hand.toFixed(3)} -> ${big.parts.hand.toFixed(3)})`); }
/* ------------------------------------------------------------------ anchors */
{ const A = M.anchors(defaults()); const inside = ['centre', 'start', 'end'].every(k => Array.isArray(A[k]) && Math.hypot(A[k][0], A[k][2]) < .12);
  ok(A.base.join() === '0,0,0' && inside, 'anchors: base at the origin (cake-top centre); centre, first stroke start and flourish end inside the rim');
  ok(A.centre[2] > 0, `anchors: the writing sits toward the viewer (+z ${A.centre[2].toFixed(3)} m), as in the film`); }
/* ------------------------------------------------------------------ build (three.js r128 in node) */
if (THREE) {
  const G = defaults(), sup = { top: [0, .1, 0], rim: [.12, .1, 0], inscription: [0, .1, .036] };
  const tubes = o => { const l = []; o.traverse(c => { if (c.geometry && c.geometry.type === 'TubeGeometry') l.push(c); }); return l; };
  const g0 = M.build(THREE, G, { t: 0, support: sup, refs: REFS }), g1 = M.build(THREE, G, { t: 1, support: sup, refs: REFS });
  ok(tubes(g0).length === 0 && tubes(g1).length === 24, `build: t=0 nothing piped; t=1 ${tubes(g1).length} piped tubes (21 strokes + 3 flourish bars)`);
  ok(Math.abs(g1.position.z + .036) < 1e-9, 'build: steps back from the cake\'s inscription anchor so the geometry is about the cake-top centre');
  let maxR = 0, minY = 1; tubes(g1).forEach(m => { const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { maxR = Math.max(maxR, Math.hypot(p.getX(i), p.getZ(i))); minY = Math.min(minY, p.getY(i)); } });
  ok(maxR < .12 && minY > -.001, `build: every piped vertex on the top (max radius ${maxR.toFixed(4)} m < 0.12; lowest ${minY.toFixed(4)} m)`);
  let orderOK = true, prevDone = 0; for (const t of [.1, .25, .4, .55, .7, .85, .95, 1]) { const o = M.build(THREE, G, { t, support: sup, refs: REFS }), done = o.userData.written, want = M.making.filter(m => t >= m[2]).length;
    const ids = tubes(o).map(m => m.userData.stroke); if (done !== want || done < prevDone || ids.some((k, i) => k !== i)) orderOK = false; prevDone = done; }
  ok(orderOK, 'build: opts.t writes stroke by stroke in the film\'s order and timing (strokes finished = making steps passed at each t)');
  const mid = M.build(THREE, G, { t: .5, support: sup, refs: REFS }); let tip = null; mid.traverse(c => { if (c.name === 'piping-tip') tip = c; });
  ok(!!tip, 'build: the piping tip is shown at the pen while a stroke is being written');
  const gb = M.build(THREE, M.blank(), { t: 1, support: sup, refs: REFS }); ok(tubes(gb).length === 1, 'build: the blank pipes a single short dash');
} else ok(false, 'build: three.js r128 not found at ana/assets/three.min.js');
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exitCode = fails ? 1 : 0;
