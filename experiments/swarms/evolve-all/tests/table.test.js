/* tests/table.test.js — node tests for modules/table.js. Run: node tests/table.test.js
   Uses the host's shared breeder (core/breed.js) the way the host's player calls it: sigma 0.205 (strength 9 of 11), 8 visible children,
   bias toward the stage's group, later groups frozen, earlier stages kept. The scripted chooser takes the best visible child (breed's elitist pick). */
'use strict';
const path = require('path'), fs = require('fs');
const M = require(path.join(__dirname, '..', 'modules', 'table.js')), B = require(path.join(__dirname, '..', 'core', 'breed.js'));
const REFS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'refs', 'table.json'), 'utf8'));
let fails = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
const SEEDS = [3125, 41, 977, 5, 77, 1234, 9001, 31], CAP = 40;
function play(seed, refs) { let p = { G: B.blank(M) }; p.e = M.evaluate(p.G, refs); let g = 0; const per = [];
  M.stages.forEach(([lab, m, th], si) => { let n = 0;
    while (B.measure(p.e, m) < th && n < CAP) { p = B.breed(M, p, { seed, gen: g++, sigma: .205, lambda: 8, bias: M.groups.includes(lab) ? lab : null, stage: si, keep: M.stages.slice(0, si).map(s => [s[1], s[2]]), freeze: true }, refs).best; n++; }
    per.push(B.measure(p.e, m) >= th ? n : null); });
  return { per, p }; }
/* 1. contract shape */
{ const keys = ['name', 'genes', 'groups', 'stages', 'blank', 'evaluate', 'build', 'making', 'anchors'];
  ok(keys.every(k => k in M) && M.name === 'table', 'contract: name, genes, groups, stages, blank, evaluate, build, making, anchors');
  ok(M.genes.every(g => g.length === 5 && M.groups.includes(g[1]) && g[2] < g[3] && g[4] >= g[2] && g[4] <= g[3]), `genes: ${M.genes.length} named and bounded, blank inside bounds, groups ${M.groups.join(' ')}`);
  const Bl = M.blank(); ok(Bl instanceof Float64Array && Bl.length === M.genes.length && B.inBounds(M, Bl), 'blank(): Float64Array of the genome length, in bounds');
  ok(M.making.every((m, i) => m[1] < m[2] && (i === 0 ? m[1] === 0 : m[1] === M.making[i - 1][2])) && M.making[M.making.length - 1][2] === 1, 'making: ordered steps covering 0..1: ' + M.making.map(m => m[0]).join(' / '));
  ok(M.stages.length <= 3 && M.stages.every(s => typeof s[2] === 'number'), 'stages: ' + M.stages.map(s => `${s[0]} (${s[1]} >= ${s[2]})`).join(', ')); }
/* 2. references: numbers only, no face data */
{ const txt = fs.readFileSync(path.join(__dirname, '..', 'refs', 'table.json'), 'utf8');
  ok(!/\b(facial|landmarks?|eyes?|mouth|nose)\b|data:image|base64/i.test(txt) && txt.length < 30000, `refs/table.json: numbers with provenance, no picture, no face data (${txt.length} bytes)`); }
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
else { const G = BEST.p.G, A = M.anchors(G), o1 = M.build(THREE, G, { t: 1 }), b1 = box(o1), T = M.top(G);
  ok(Math.abs(b1.min.y) < 1e-3 && Math.abs(b1.max.y - A.topCentre[1]) < 1e-3, `build t=1: stands on the floor (min y ${b1.min.y.toFixed(4)}), top at the anchor ${A.topCentre[1].toFixed(3)} (built ${b1.max.y.toFixed(3)})`);
  ok(Math.abs(Math.max(b1.max.x, -b1.min.x) - T.verts.reduce((a, v) => Math.max(a, Math.abs(v[0])), 0)) < .005, `anchors/top(): the vertex polygon matches the built top (half-width ${Math.max(b1.max.x, -b1.min.x).toFixed(3)})`);
  ok(A.topRadius[0] > 1.1 * M.CAKE_R, `anchors: inscribed radius ${A.topRadius[0].toFixed(3)} holds the cake (radius ${M.CAKE_R})`);
  const hs = [0, .2, .5, .7, 1].map(t => { const b = box(M.build(THREE, G, { t })); return b.isEmpty() ? 0 : b.max.y; });
  ok(hs[0] < .01 && hs[1] < hs[4] && hs[2] > hs[4] && Math.abs(hs[4] - A.topCentre[1]) < 1e-3, `build: the making is seen (highest point at t = 0, .2, .5, .7, 1: ${hs.map(h => h.toFixed(3)).join(', ')}: legs rise, the top comes down onto them)`);
  ok(M.named(G).hex > .3 && BEST.p.e.parts.corners > 5.5, `the evolved top is a six-cornered top (hex ${M.named(G).hex.toFixed(2)}: 0 = square post, 1 = regular hexagon; corners seen on screen ${BEST.p.e.parts.corners.toFixed(1)})`);
  const post = box(M.build(THREE, M.blank(), { t: 1 })), s = post.getSize(new THREE.Vector3()); ok(s.x < .15 && s.y > .4, `blank builds a post (${s.x.toFixed(2)} wide, ${s.y.toFixed(2)} high)`);
 }
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
