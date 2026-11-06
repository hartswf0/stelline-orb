/* tests/host.test.js — the host's own invariants (node, deterministic). Run: node tests/host.test.js
   core/breed.js: determinism, elitism, freezing of later stages, bias; the stand-ins satisfy the contract and reach every stage;
   every real module present satisfies the contract and offers the anchors its dependants attach to; the page keeps the brief's rules. */
'use strict';
const fs = require('fs'), path = require('path'), D = path.join(__dirname, '..');
const B = require(D + '/core/breed.js'), S = require(D + '/ui/standins.js'), REL = require(D + '/ui/relations.js'), PL = require(D + '/ui/player.js'), U = require(D + '/ui/uigenome.js');
let fails = 0, n = 0; const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
const refsOf = name => { const f = D + '/refs/' + name + '.json'; return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {}; };
const real = {}; REL.PARTS.forEach(p => { const f = D + '/modules/' + p + '.js'; if (fs.existsSync(f)) { try { real[p] = require(f); } catch (e) { real[p] = e; } } });
const mods = REL.PARTS.map(p => [p, real[p] && !(real[p] instanceof Error) ? real[p] : S[p], real[p] && !(real[p] instanceof Error) ? 'real' : 'stand-in']);
/* 1. breed is deterministic and elitist */
{ const m = S.cake, P0 = { G: B.blank(m) }; P0.e = m.evaluate(P0.G, {});
  const a = B.breed(m, P0, { seed: 5, gen: 3, sigma: .1, lambda: 6, stage: 0 }, {}), b = B.breed(m, P0, { seed: 5, gen: 3, sigma: .1, lambda: 6, stage: 0 }, {});
  ok(a.kids.every((k, i) => k.G.every((v, j) => v === b.kids[i].G[j])), 'breed: same seed and generation give identical children');
  let P = P0, prev = -1, mono = true; for (let g = 0; g < 60; g++) { const st = B.stageOf(m, P.e); if (st >= m.stages.length) break; const r = B.breed(m, P, { seed: 1, gen: g, sigma: .1, lambda: 6, stage: st }, {}); if (r.best.score < r.parentScore) mono = false; P = r.best; }
  ok(mono, 'breed: the elite never scores below its parent on the stage measure');
  const fr = B.breed(m, P0, { seed: 2, gen: 0, sigma: .3, lambda: 8, stage: 0, freeze: true }, {}), frozen = B.laterGroups(m, 0);
  ok(frozen.length > 0 && fr.kids.every(k => m.genes.every((g, i) => !frozen.includes(g[1]) || k.G[i] === P0.G[i])), 'breed: groups of later stages are frozen (' + frozen.join(', ') + ')');
  const bi = B.breed(m, P0, { seed: 2, gen: 0, sigma: .2, lambda: 8, stage: 0, bias: 'ICING' }, {}); const mv = grp => bi.kids.reduce((s, k) => s + m.genes.reduce((t, g, i) => t + (g[1] === grp ? Math.abs(k.G[i] - P0.G[i]) / (g[3] - g[2]) : 0), 0), 0) / m.genes.filter(g => g[1] === grp).length;
  ok(mv('ICING') > 2 * mv('SPONGE'), 'breed: a bias moves its group more than the others');
  ok(bi.kids.every(k => B.inBounds(m, k.G)), 'breed: children stay inside the gene bounds'); }
/* 2. every module (real where present) satisfies the contract */
for (const [name, m, kind] of mods) { const tag = name + ' (' + kind + ')';
  if (real[name] instanceof Error) ok(false, tag + ': modules/' + name + '.js fails to load: ' + real[name].message);
  ok(m.name === name && Array.isArray(m.genes) && m.genes.every(g => g.length >= 5 && g[2] < g[3] && g[4] >= g[2] && g[4] <= g[3] && m.groups.includes(g[1])), tag + ': genes are [key, group, min, max, default] with known groups');
  ok(m.stages.length > 0 && m.stages.every(s => s.length === 3 && typeof s[2] === 'number'), tag + ': stages are [label, measure, threshold]');
  const G = B.blank(m), refs = Object.assign({}, refsOf(name)); const sup = REL.SUPPORT[name]; if (sup) { const sm = mods.find(x => x[0] === sup)[1]; refs.support = REL.supportInfo(sup, sm, B.blank(sm)); }
  ok(B.inBounds(m, G), tag + ': blank() is inside the bounds');
  const e1 = m.evaluate(G, refs), e2 = m.evaluate(Float64Array.from(G), refs); ok(e1.fit === e2.fit && e1.fit >= 0 && e1.fit <= 1, tag + ': evaluate is deterministic and in 0..1 (blank ' + e1.fit.toFixed(3) + ')');
  ok(Array.isArray(m.making) && m.making.length > 0 && typeof m.build === 'function', tag + ': has making steps and build()');
  const A = m.anchors(G); ok(A && typeof A === 'object', tag + ': anchors() returns an object');
  REL.PARTS.filter(d => REL.SUPPORT[d] === name).forEach(d => ok(!!REL.findA(A, REL.ATTACH[d]), tag + ': offers an anchor for ' + d + ' (one of ' + REL.ATTACH[d].join('/') + ')')); }
/* 3. the stand-ins reach every stage from blank within 300 generations (the real modules' own tests cover theirs) */
for (const name of REL.PARTS) { const m = S[name]; let P = { G: B.blank(m) }; P.e = m.evaluate(P.G, {}); let st = B.stageOf(m, P.e), g = 0;
  for (; g < 300 && st < m.stages.length; g++) { const r = B.breed(m, P, { seed: 3, gen: g, sigma: .1, lambda: 6, stage: st, keep: m.stages.slice(0, st).map(s => [s[1], s[2]]), freeze: true }, {}); P = r.best; st = Math.max(st, B.stageOf(m, P.e)); }
  ok(st === m.stages.length, 'stand-in ' + name + ': every stage passed from blank in ' + g + ' generations'); }
/* 4. choosing a child: the scripted eye sometimes keeps a variant that is not the fitness best (the machine does not decide) */
{ let off = 0; ['careful', 'hasty'].forEach(st => REL.PARTS.forEach((p, i) => { off += PL.simulatePart(S[p], {}, U.blank(), st, 40 + i).offBest || 0; })); ok(off > 0, 'player: kept a variant that was not the fitness best ' + off + ' times over 12 simulated parts'); }
/* 5. the page keeps the brief's rules */
{ const h = fs.readFileSync(D + '/index.html', 'utf8');
  ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(h), 'index.html: no emoji');
  ok(h.includes('../../../ana/assets/three.min.js') && h.includes('../../../ana/device-sounds.wav'), 'index.html: three.js r128 and the device grains from ana/');
  ok(/html, body \{[^}]*overflow: hidden/.test(h) && h.includes('grid-template-rows'), 'index.html: view over device, no page scroll');
  ok(!/<button[^>]*>(?!SAVE THE TRACE|CLOSE)/.test(h), 'index.html: no plain buttons outside the operator panel'); }
console.log(`\n${n - fails}/${n} passed`); process.exit(fails ? 1 : 0);
