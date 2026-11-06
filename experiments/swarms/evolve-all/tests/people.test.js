/* tests/people.test.js — node tests for modules/people.js. Run: node tests/people.test.js
   Uses the host's shared breeder (core/breed.js) the way the host's player calls it: sigma 0.205 (strength 9 of 11), 8 visible children,
   bias toward the stage's group, later groups frozen, earlier stages kept. The scripted chooser takes the best visible child (breed's elitist pick). */
'use strict';
const path = require('path'), fs = require('fs');
const M = require(path.join(__dirname, '..', 'modules', 'people.js')), B = require(path.join(__dirname, '..', 'core', 'breed.js'));
const REFS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'refs', 'people.json'), 'utf8'));
let fails = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const SEEDS = [3125, 41, 977, 5, 77, 1234, 9001, 31], CAP = 40;
function play(seed, refs) { let p = { G: B.blank(M) }; p.e = M.evaluate(p.G, refs); let g = 0; const per = [];
  M.stages.forEach(([lab, m, th], si) => { let n = 0;
    while (B.measure(p.e, m) < th && n < CAP) { p = B.breed(M, p, { seed, gen: g++, sigma: .205, lambda: 8, bias: M.groups.includes(lab) ? lab : null, stage: si, keep: M.stages.slice(0, si).map(s => [s[1], s[2]]), freeze: true }, refs).best; n++; }
    per.push(B.measure(p.e, m) >= th ? n : null); });
  return { per, p }; }
/* 1. contract shape */
{ const keys = ['name', 'genes', 'groups', 'stages', 'blank', 'evaluate', 'build', 'making', 'anchors'];
  ok(keys.every(k => k in M) && M.name === 'people', 'contract: name, genes, groups, stages, blank, evaluate, build, making, anchors');
  ok(M.genes.every(g => g.length === 5 && M.groups.includes(g[1]) && g[2] < g[3] && g[4] >= g[2] && g[4] <= g[3]), `genes: ${M.genes.length} named and bounded, blank inside bounds, groups ${M.groups.join(' ')}`);
  const Bl = M.blank(); ok(Bl instanceof Float64Array && Bl.length === M.genes.length && B.inBounds(M, Bl), 'blank(): Float64Array of the genome length, in bounds');
  ok(M.making.every((m, i) => m[1] < m[2] && (i === 0 ? m[1] === 0 : m[1] === M.making[i - 1][2])) && M.making[M.making.length - 1][2] === 1, 'making: ordered steps covering 0..1: ' + M.making.map(m => m[0]).join(' / '));
  ok(M.stages.length <= 3 && M.stages.every(s => typeof s[2] === 'number'), 'stages: ' + M.stages.map(s => `${s[0]} (${s[1]} >= ${s[2]})`).join(', ')); }
/* 2. references: numbers only, no face data */
{ const txt = fs.readFileSync(path.join(__dirname, '..', 'refs', 'people.json'), 'utf8');
  ok(!/\b(facial|landmarks?|eyes?|mouth|nose)\b|data:image|base64/i.test(txt) && txt.length < 30000, `refs/people.json: numbers with provenance, no picture, no face data (${txt.length} bytes)`); }
/* 3. determinism and bounds */
{ const r = B.mulberry32(5); let same = true, inb = true; for (let i = 0; i < 30; i++) { const G = Float64Array.from(M.genes, g => g[2] + r() * (g[3] - g[2])), a = M.evaluate(G, REFS), b = M.evaluate(G, REFS);
    if (a.fit !== b.fit) same = false; if (!(a.fit >= 0 && a.fit <= 1)) inb = false; }
  ok(same, 'determinism: same genome, same result'); ok(inb, 'evaluate: fit within 0..1 for 30 random genomes');
  const p = { G: B.blank(M) }, o = { seed: 9, gen: 3, sigma: .205, lambda: 8, stage: 0, freeze: true }, x = B.breed(M, p, o, REFS), y = B.breed(M, p, o, REFS);
  ok(JSON.stringify(x.kids.map(k => Array.from(k.G))) === JSON.stringify(y.kids.map(k => Array.from(k.G))), 'determinism: same seed and generation give the same children'); }
/* 4. elitism: each stage's measure never falls under the chooser */
{ let mono = true, p = { G: B.blank(M) }; p.e = M.evaluate(p.G, REFS); let g = 0; const r = B.mulberry32(99);
  M.stages.forEach(([lab, m], si) => { let last = B.measure(p.e, m); for (let i = 0; i < 12; i++) { p = B.breed(M, p, { seed: 7, gen: g++, sigma: .02 + r() * .3, lambda: 8, stage: si, bias: lab }, REFS).best; const now = B.measure(p.e, m); if (now < last - 1e-12) mono = false; last = now; } });
  ok(mono, 'elitism: each stage measure is non-decreasing over 12 generations per stage at random strengths'); }
/* 5. convergence: blank -> every stage, 8 seeds, the host's settings */
const RUNS = SEEDS.map(s => play(s, REFS));
M.stages.forEach(([lab, m, th], si) => { const n = RUNS.map(r => r.per[si]), done = n.filter(x => x !== null).sort((a, b) => a - b);
  ok(done.length >= 7 && done[done.length >> 1] <= 25, `convergence ${lab} (${m} >= ${th}): ${done.length}/8 seeds within ${CAP} generations; median ${done[done.length >> 1]}, max ${done[done.length - 1]} [${n.map(x => x === null ? '-' : x).join(' ')}]`); });
const BEST = RUNS.find(r => r.per.every(x => x !== null)) || RUNS[0];
console.log('      evolved (seed ' + SEEDS[RUNS.indexOf(BEST)] + '): fit ' + BEST.p.e.fit.toFixed(3) + ' ' + JSON.stringify(BEST.p.e.parts, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v).slice(0, 400));
/* 6. build (real three.js r128 in node; no WebGL needed) */
let THREE = null; try { THREE = require(path.join(__dirname, '..', '..', '..', '..', 'ana', 'assets', 'three.min.js')); } catch (e) { }
const box = o => { o.updateMatrixWorld(true); const b = new THREE.Box3(); o.traverse(m => { if (m.isMesh && m.visible) b.expandByObject(m); }); return b; };
if (!THREE) console.log('SKIP build tests: ana/assets/three.min.js not found');
else { const G = BEST.p.G, A = M.anchors(G), o1 = M.build(THREE, G, { t: 1 }), n = M.count(G);
  ok(o1.children.length === n, `build t=1: ${n} children`);
  let feet = true; for (let i = 0; i < n; i++) if (A['feet' + i][1] !== 0) feet = false; const b1 = box(o1); ok(feet && Math.abs(b1.min.y) < .02, `feet on the floor (anchors y = 0; lowest built point ${b1.min.y.toFixed(3)})`);
  let heads = 0, eyes = 0; o1.traverse(m => { if (m.name === 'head') heads++; if (/eye|mouth|nose|face/i.test(m.name)) eyes++; }); ok(heads === n && eyes === 0, `faceless: ${heads} smooth heads, no facial parts`);
  let hair = 0; o1.traverse(m => { if (m.name === 'hair') hair++; }); ok(hair === n, `hair masses on all ${n} children`);
  const counts = [0, .25, .5, .75, 1].map(t => { let k = 0; M.build(THREE, G, { t }).traverse(m => { if (m.isMesh) k++; }); return k; });
  ok(counts.every((c, i) => i === 0 || c >= counts[i - 1]) && counts[0] === 0, `build: the children are formed in turn (meshes at t = 0, .25, .5, .75, 1: ${counts.join(', ')})`);
  const P = M.pose(G, REFS).P; ok(P.every(q => Math.abs(q.c.angle) <= 90), 'placement: every child on the far half of the table (angles ' + P.map(q => q.c.angle.toFixed(0)).join(', ') + ')');
  const kid = P[0]; ok(kid.H / M.DEFAULT_SUPPORT.y > 1.5 && kid.H / M.DEFAULT_SUPPORT.y < 2.1, `child proportions: height ${kid.H.toFixed(2)} = ${(kid.H / M.DEFAULT_SUPPORT.y).toFixed(2)} x the table height (film: 1.79), head ${(kid.hd / kid.H).toFixed(2)} of the height`);
 }
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
