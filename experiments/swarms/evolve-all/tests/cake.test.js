/* tests/cake.test.js — node tests for modules/cake.js on its own. Run: node tests/cake.test.js
   The breeder below is a copy of the elitist (1 + lambda) breeder in ../evolve/evolve-core.js (seeded mulberry32, mutation per gene
   range, bias toward a group), so the module is tested without the host's core/breed.js. */
'use strict';
const path = require('path'), fs = require('fs');
const M = require(path.join(__dirname, '..', 'modules', 'cake.js'));
const REFS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'refs', 'cake.json'), 'utf8'));
let fails = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fails++; };
/* ------------------------------------------------------------------ the copied breeder */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(...xs) { let h = 2166136261; for (const x of xs) { h ^= (x | 0); h = Math.imul(h, 16777619); } return h >>> 0; }
function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const measure = (e, m) => m === 'fit' ? e.fit : e.parts[m];
function breed(mod, parent, o, refs) {   // o: { seed, gen, sigma, group, lambda }; the stage's group fully, earlier groups with the same measure at 0.5, later frozen
  const r = mulberry32(hash(o.seed, o.gen, 2)), gi = mod.groups.indexOf(o.group), lam = o.lambda || 8, m = o.measure;
  const sm = o.measure, gm = grp => (mod.stages.find(st => st[0] === grp) || [])[1];
  const w = mod.genes.map(g => g[1] === o.group ? 1 : mod.groups.indexOf(g[1]) < gi && gm(g[1]) === sm ? .5 : 0);   // earlier groups judged on the same measure (BASE under FORM) move at half strength; the rest stay
  const pe = parent.e || mod.evaluate(parent.G, refs); let best = { G: parent.G, e: pe, score: measure(pe, m) }, bi = -1; const kids = [];
  for (let c = 0; c < lam; c++) { const G = Float64Array.from(parent.G, (v, i) => { const g = mod.genes[i]; return w[i] ? clamp(v + o.sigma * w[i] * (c < lam / 2 ? 1 : .35) * (g[3] - g[2]) * gauss(r), g[2], g[3]) : v; });
    const e = mod.evaluate(G, refs); kids.push({ G, e, score: measure(e, m) }); }
  // a child that drops an earlier stage's measure below its bar is not admissible
  const keep = mod.stages.slice(0, Math.max(0, mod.stages.findIndex(s => s[0] === o.group))).filter(([, mm, th]) => measure(pe, mm) >= th);
  kids.forEach((k, i) => { if (k.score > best.score && keep.every(([, mm, th]) => measure(k.e, mm) >= th)) { best = k; bi = i; } });
  return { best, bestIndex: bi, kids, parentScore: measure(pe, m) };
}
// a simple player: works each stage in order until its bar is reached (strength 0.25 far from the bar, 0.08 within 0.08 of it, 0.04 within 0.03)
function play(refs, seed, cap) { let p = { G: M.blank() }; p.e = M.evaluate(p.G, refs); let gen = 0; const per = [];
  for (const [grp, m, th] of M.stages) { let n = 0; while (measure(p.e, m) < th && n < cap) { const gap = th - measure(p.e, m);
      p = breed(M, p, { seed, gen: gen++, sigma: gap > .08 ? .25 : gap > .03 ? .08 : .04, group: grp, measure: m }, refs).best; n++; } per.push(measure(p.e, m) >= th ? n : null); }
  return { per, gen, p }; }
/* ------------------------------------------------------------------ 1. contract shape */
{ const keys = ['name', 'genes', 'groups', 'stages', 'blank', 'evaluate', 'build', 'making', 'anchors'];
  ok(keys.every(k => k in M) && M.name === 'cake', 'contract: name, genes, groups, stages, blank, evaluate, build, making, anchors');
  ok(M.genes.every(g => g.length === 5 && M.groups.includes(g[1]) && g[2] < g[3] && g[4] >= g[2] && g[4] <= g[3]), `genes: ${M.genes.length} named, bounded, default inside bounds, groups known`);
  const B = M.blank(); ok(B instanceof Float64Array && B.length === M.genes.length, 'blank(): Float64Array of the genome length (a flat disc of dough)');
  ok(M.making.every((m, i) => m[1] < m[2] && (i === 0 ? m[1] === 0 : m[1] === M.making[i - 1][2])) && M.making[M.making.length - 1][2] === 1, 'making: ordered steps covering 0..1 without gaps: ' + M.making.map(m => m[0]).join(' / ')); }
/* ------------------------------------------------------------------ 2. references: numbers only, no face data, eight cakes */
{ const txt = fs.readFileSync(path.join(__dirname, '..', 'refs', 'cake.json'), 'utf8'), ids = M.targets(REFS).map(t => t.id);
  ok(ids.length === 8 && ids.every(id => Array.isArray(REFS.cakes[id].outline) && REFS.cakes[id].side.lab.length === 3), 'refs: 8 cakes with outline and CIELAB colours: ' + ids.join(', '));
  ok(!/\b(face|faces|facial|landmarks?|skin)\b|data:image|base64/i.test(txt) && txt.length < 30000, `refs: numbers only, no face data, ${txt.length} bytes`); }
/* ------------------------------------------------------------------ 3. determinism; evaluate is node-safe and bounded */
{ const r = mulberry32(5); let same = true, inb = true; for (let i = 0; i < 20; i++) { const G = Float64Array.from(M.genes, g => g[2] + r() * (g[3] - g[2]));
    for (const id of Object.keys(REFS.cakes)) { const R = M.select(REFS, id), a = M.evaluate(G, R), b = M.evaluate(G, R); if (a.fit !== b.fit) same = false; if (!(a.fit >= 0 && a.fit <= 1)) inb = false; } }
  ok(same, 'determinism: evaluate gives identical results for the same genome and reference'); ok(inb, 'evaluate: fit within 0..1 for 160 random genomes x references'); }
/* ------------------------------------------------------------------ 4. elitism: the stage measure never falls */
{ let mono = true, p = { G: M.blank() }; const R = M.select(REFS, 'chocolate_orange'); p.e = M.evaluate(p.G, R); let g = 0; const r = mulberry32(99);
  for (const [grp, m] of M.stages) { let last = measure(p.e, m); for (let i = 0; i < 20; i++) { p = breed(M, p, { seed: 7, gen: g++, sigma: .02 + r() * .3, group: grp, measure: m }, R).best; const now = measure(p.e, m); if (now < last - 1e-12) mono = false; last = now; } }
  ok(mono, 'elitism: each stage measure is non-decreasing over 100 generations with random strengths'); }
/* ------------------------------------------------------------------ 5. convergence: blank -> every stage for every reference */
const CAP = 80, results = {};
for (const { id } of M.targets(REFS)) { const R = M.select(REFS, id), runs = [3125, 41, 977].map(sd => play(R, sd, CAP)); results[id] = runs;
  const d = runs[0], all = runs.filter(x => x.per.every(n => n !== null)).length, P = d.p.e.parts;
  ok(d.per.every(n => n !== null) && all >= 2, `convergence ${id}: seed 3125 passes every stage (gens per stage ${d.per.join(', ')}; ${d.gen} total); ${all}/3 seeds pass all; fit ${d.p.e.fit.toFixed(3)} IoU ${P.iou.toFixed(3)} dE top ${P.dETop.toFixed(1)} side ${P.dESide.toFixed(1)} bead ${P.dEBead.toFixed(1)}`); }
/* ------------------------------------------------------------------ 6. the icing: evolved top is cream, not olive */
{ const R = M.select(REFS, 'cream_table'), p = results.cream_table[0].p, g = M.named(p.G), ref = REFS.cakes.cream_table.top.lab;
  const old = M.srgb2lab(191, 136, 30);   // the icing the old evolver reached on this frame (sRGB 0.749, 0.533, 0.118)
  const dNew = Math.hypot(g.topL - ref[0], g.topA - ref[1], g.topB - ref[2]), dOld = Math.hypot(old[0] - ref[0], old[1] - ref[1], old[2] - ref[2]);
  ok(dNew < 4.9 && dNew < dOld, `icing: evolved top for her cake at 155 s is sRGB ${M.colours(p.G).top} (dE ${dNew.toFixed(1)} from the measured top ${REFS.cakes.cream_table.top.srgb}); the old evolver's olive ${[191, 136, 30]} is dE ${dOld.toFixed(1)} away`);
  const c = REFS.cakes.cream, pc = results.cream[0].p, gc = M.named(pc.G);
  ok(Math.hypot(gc.topL - c.top.lab[0], gc.topA - c.top.lab[1], gc.topB - c.top.lab[2]) < 4.9, `icing: evolved top for the cream cake at 147 s is sRGB ${M.colours(pc.G).top} (measured ${c.top.srgb})`); }
/* ------------------------------------------------------------------ 7. build and anchors (real three.js r128 in node; no WebGL needed) */
let THREE = null; try { THREE = require(path.join(__dirname, '..', '..', '..', '..', 'ana', 'assets', 'three.min.js')); } catch (e) { }
if (!THREE) console.log('SKIP build tests: ana/assets/three.min.js not found');
else { const G = results.cream[0].p.G, A = M.anchors(G);
  const box = o => { o.updateMatrixWorld(true); const b = new THREE.Box3(); o.traverse(m => { if (m.isMesh && m.visible && !m.isInstancedMesh) b.expandByObject(m); }); return b; };
  const steps = [], heights = []; for (let i = 0; i <= 20; i++) { const o = M.build(THREE, G, { t: i / 20 }); steps.push(o.userData.step); const b = box(o); heights.push(b.isEmpty() ? 0 : b.max.y); }
  ok(new Set(steps).size === M.making.length && steps.every((s, i) => i === 0 || M.making.findIndex(m => m[0] === s) >= M.making.findIndex(m => m[0] === steps[i - 1])), 'build: the making steps appear in order as t goes 0..1');
  const o1 = M.build(THREE, G, { t: 1 }), b1 = box(o1), o0 = M.build(THREE, G, { t: 0 }), b0 = box(o0);
  ok(Math.abs(b1.min.y) < 1e-3, `build t=1: the cake stands on its origin (min y ${b1.min.y.toFixed(4)})`);
  ok(Math.abs(b1.max.y - A.top[1]) < .005, `anchors: top centre ${A.top[1].toFixed(4)} matches the built cake's top ${b1.max.y.toFixed(4)} (within the 3 mm icing)`);
  ok(Math.abs(Math.max(b1.max.x, -b1.min.x) - A.widest[0]) < .004, `anchors: widest radius ${A.widest[0].toFixed(4)} (base ${A.baseRim[0].toFixed(4)}) matches the built half-width ${Math.max(b1.max.x, -b1.min.x).toFixed(4)} (icing coat 3 mm)`);
  ok(b0.isEmpty() || b0.max.y < .02, 'build t=0: nothing made yet (at most the board arriving)');
  let seats = true; for (let i = 0; i < 7; i++) { const c = A['candle' + i], r = Math.hypot(c[0], c[2]); if (r > A.rim[0] || Math.abs(c[1] - M.topY(G, r)) > 1e-9) seats = false; }
  ok(seats && A.inscription[2] > 0, 'anchors: seven candle seats inside the rim and on the top surface; inscription spot toward the viewer (+z)');
  // decoration and frosting are real geometry: piped shells round the top rim, beads on the side, ripples in the coats
  const shells = o1.children.filter(m => m.isInstancedMesh && m.count > 0 && m.visible), gc = M.named(G);
  const spread = o => { let lo = 1e9, hi = -1e9; o.traverse(m => { if (m.isMesh && !m.isInstancedMesh && m.material && m.material.roughness === .5 && m.geometry.attributes.position.count > 500) { const P = m.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const r = Math.hypot(P.getX(i), P.getZ(i)); if (r > .03 && r < .07) { const y = P.getY(i) - M.topY(G, r); lo = Math.min(lo, y); hi = Math.max(hi, y); } } } }); return hi - lo; };
  const Gs = Float64Array.from(G); Gs[M.genes.findIndex(x => x[0] === 'frostTop')] = 0; const rip = spread(o1), flat = spread(M.build(THREE, Gs, { t: 1 }));
  ok(shells.length >= 1 && shells.reduce((n, m) => n + m.count, 0) >= 20, `build cream t=1: ${shells.length} visible instanced decorations, ${shells.reduce((n, m) => n + m.count, 0)} pieces (piped top border: relief ${gc.border.toFixed(2)}; beads ${(gc.beads * 100).toFixed(0)}% of the side)`);
  ok(rip > flat + .0002, `build cream t=1: the top coat is rippled frosting (height above the smooth surface spreads ${(rip * 1000).toFixed(2)} mm vs ${(flat * 1000).toFixed(2)} mm with frostTop 0; frostTop ${gc.frostTop.toFixed(2)})`);
  // dome: the top anchor rises with the dome
  const D = Float64Array.from(G); D[M.genes.findIndex(g => g[0] === 'dome')] = 1; ok(M.anchors(D).top[1] > A.top[1] + .05, 'anchors: a dome raises the top centre'); }
{ let rows = []; for (const { id } of M.targets(REFS)) { const P = results[id][0].p.e.parts, t = REFS.cakes[id]; rows.push(`${id} tex top ${P.texTop.toFixed(1)}/${t.texture.top} side ${P.texSide.toFixed(1)}/${t.texture.side} rim ${P.rim.toFixed(1)}/${t.rimTop ? t.rimTop.energy : '-'}`); }
  ok(M.targets(REFS).every(({ id }) => results[id][0].p.e.parts.frost > .5), 'frosting: predicted texture within reach of the measured texture for every reference (frost part > 0.5)'); console.log('      ' + rows.join('\n      ')); }
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
