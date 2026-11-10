/* test.js — node test.js. Checks the evolution's declared invariants on evolve-core.js (the same code the game runs). */
'use strict';
const E = require('./evolve-core.js'), ref = require('./refs.json'), fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const SIG = k => .01 * Math.pow(40, (k - 1) / 11);
// 1. elitism: within a stage the stage's score never falls; in colour stages the whole match never falls; a child replaces the parent only if it scores higher
{ let mono = true, repl = true, p = E.start('cake', ref), g = 0; const r = E.mulberry32(99);
  for (const [st, m] of E.STAGES) { let last = m === 'iou' ? p.iou : p.fit;
    for (let i = 0; i < 25; i++) { const res = E.breed('cake', p, { seed: 7, gen: g++, sigma: SIG(1 + Math.floor(r() * 12)), group: st, bias: Math.floor(r() * 4) }, ref);
      const now = res.best.score; if (now < last - 1e-12) mono = false; if (res.bestIndex >= 0 && !(res.kids[res.bestIndex].score > res.parentScore)) repl = false; if (res.bestIndex < 0 && res.best.G !== p.G) repl = false; last = now; p = res.best; } }
  ok(mono, 'elitism: the stage score is non-decreasing over 125 generations with random strengths and leans');
  ok(repl, 'elitism: the parent is replaced only by a child that scores strictly higher'); }
// 2. determinism under a seed, and the seed matters
{ const p = E.start('cake', ref), o = { seed: 3125, gen: 4, sigma: .2, group: 'BASE', bias: 0 }; const a = E.breed('cake', p, o, ref), b = E.breed('cake', p, o, ref), c = E.breed('cake', p, Object.assign({}, o, { seed: 3126 }), ref);
  ok(JSON.stringify(a.kids.map(k => k.G)) === JSON.stringify(b.kids.map(k => k.G)) && a.best.score === b.best.score, 'determinism: same seed, generation and settings give identical children and choice');
  ok(JSON.stringify(a.kids.map(k => k.G)) !== JSON.stringify(c.kids.map(k => k.G)), 'determinism: a different seed gives different children'); }
// 3. convergence: every evolved stage reaches its bar within 40 generations (a simple player: strength 0.27 far from the bar, 0.10 near it)
function play(seed, cap) { let p = E.start('cake', ref), g = 0; const per = []; for (const [st, m, th] of E.STAGES) { let n = 0; const v = () => m === 'iou' ? p.iou : p.fit; while (v() < th && n < cap) { p = E.breed('cake', p, { seed, gen: g++, sigma: SIG(v() < th - .04 ? 11 : 9), group: st, bias: 0 }, ref).best; n++; } per.push(v() >= th ? n : null); } return { per, total: g, fit: p.fit }; }
{ const d = play(3125, 40); ok(d.per.every(n => n !== null), `convergence: default seed 3125 sets all five stages within 40 generations each (took ${d.per.join(', ')}; ${d.total} in all; final whole match ${d.fit.toFixed(4)})`);
  const seeds = Array.from({ length: 20 }, (_, i) => 5000 + i * 13), res = seeds.map(s => play(s, 40)), done = res.filter(r => r.per.every(n => n !== null));
  const tot = done.map(r => r.total).sort((a, b) => a - b);
  console.log(`      20 other seeds: ${done.length}/20 set all stages within 40 per stage; generations in all: median ${tot[tot.length >> 1]}, range ${tot[0]}-${tot[tot.length - 1]}; stuck stages: ${res.flatMap(r => r.per.map((n, i) => n === null ? E.STAGES[i][0] : null)).filter(Boolean).join(', ') || 'none'}`);
  ok(done.length >= 16, `convergence: at least 16 of 20 other seeds set all stages within 40 generations per stage (${done.length})`); }
// 4. the proof's trace replays exactly from its seeds
if (fs.existsSync(__dirname + '/trace.json')) { const t = JSON.parse(fs.readFileSync(__dirname + '/trace.json')); let same = true;
  t.generations.forEach(g => { const pe = E.evaluate('cake', g.parentG, ref), parent = { G: g.parentG, fit: pe.fit, iou: pe.iou }; const r = E.breed('cake', parent, { seed: g.seed, gen: g.gen, sigma: g.sigma, group: g.stage, bias: g.bias }, ref);
    if (r.bestIndex !== g.bestIndex || Math.abs(r.best.score - g.score) > 2e-5 || r.kids.some((k, i) => Math.abs(k.score - g.kids[i]) > 2e-5)) same = false; });
  ok(same && t.generations.length > 0, `trace: all ${t.generations.length} generations of the proof recording reproduce from seed, parent and settings (children's scores and the choice)`);
  ok(t.ended && t.made.length === 8, 'trace: the proof run made every stage (' + t.made.join(' ') + ') and ended with the blow'); }
// 5. the shipped reference is numbers only, and holds no face data
{ const txt = fs.readFileSync(__dirname + '/refs.json', 'utf8'), r = JSON.parse(txt); ok(!('head' in r) && !/landmark|skin|face/i.test(JSON.stringify(Object.keys(r.cake))) && txt.length < 20000, `refs.json: cake outline and colour histograms only, ${txt.length} bytes, no face data`); }
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
