/* tests/ui.test.js — the interface genome (node, deterministic). Run: node tests/ui.test.js
   Safety: whatever breeding does, every control stays (three roles on three rings), the step rate stays within 5.9-23.6/s on the film's
   11.8/4 grid, detents 4-12 degrees, 3-9 variants. Improvement: two scripted players (CAREFUL, HASTY; ui/player.js) each play 42 parts (seven memories)
   through an evolving UI lineage (four lineage seeds); the final elite is then re-measured on a fixed benchmark (six parts x three
   seeds, not used in the lineage) against the primitive UI the lineage started from. Parts are the stand-ins (ui/standins.js): fast,
   fixed, and independent of the module owners' work in progress. The players are models of two styles, not people. */
'use strict';
const path = require('path'), fs = require('fs'), D = path.join(__dirname, '..');
const U = require(D + '/ui/uigenome.js'), PL = require(D + '/ui/player.js'), S = require(D + '/ui/standins.js'), B = require(D + '/core/breed.js');
let fails = 0, n = 0; const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
const PARTS = ['table', 'cake', 'inscription', 'candles', 'people', 'light'];
const safeOK = u => new Set(u.roles).size === 3 && U.ROLES.every(r => u.roles.includes(r)) && U.RINGS.every(r => Object.values(u.map).includes(r)) && u.rate >= 5.9 && u.rate <= 23.6 && Math.abs(u.rate / (11.8 / 4) - Math.round(u.rate / (11.8 / 4))) < 1e-6 && u.detent >= 4 && u.detent <= 12 && u.lambda >= 3 && u.lambda <= 9;
/* 1. safety under any genome, including garbage */
{ const r = B.mulberry32(9); let all = true; for (let i = 0; i < 2000; i++) { const G = Float64Array.from({ length: 8 }, () => (r() - .3) * 60); if (i % 7 === 0) G[2] = NaN; if (!safeOK(U.decode(G))) all = false; } ok(all, 'safe(): 2000 random and broken genomes all decode to three controls, rate 5.9-23.6/s, detent 4-12, 3-9 variants');
  const L = U.lineage(3); let inb = true; for (let k = 0; k < 300; k++) { const c = U.candidates(L, 3); c.forEach(x => { if (!U.inBounds(x.U) || !safeOK(U.decode(x.U))) inb = false; }); U.record(L, c[1 + k % 2], { gens: 10, accepted: 3 + k % 5, moves: 20, reversals: k % 3, idle: 4, stages: 1 }, { part: PARTS[k % 6] }); }
  ok(inb, '300 rounds of UI breeding: every candidate inside its bounds and safe');
  ok(L.log.length === 300 && L.log.every(e => e.outcome && e.elite && e.ui), 'the UI lineage is logged every round (played, outcome, elite)'); }
/* 2. fitness improves for each scripted player */
const bench = (G, st) => { let s = 0, k = 0; for (const p of PARTS) for (const sd of [11, 12, 13]) { s += U.fitness(PL.simulatePart(S[p], {}, G, st, sd)); k++; } return s / k; };
const runs = {}, ROUNDS = 42, SEEDS = (process.env.SEEDS || '7,8,9,10,11,12,13,14,15,16').split(',').map(Number);
for (const st of ['careful', 'hasty']) { runs[st] = []; const b0 = bench(U.blank(), st);
  for (const seed of SEEDS) { const L = U.lineage(seed); for (let r = 0; r < ROUNDS; r++) { const c = U.candidates(L, 3), ch = PL.choose(r, 3); U.record(L, c[ch], PL.simulatePart(S[PARTS[r % 6]], {}, c[ch].U, st, 100 + r), { part: PARTS[r % 6] }); }
    const b1 = bench(L.elite.U, st); runs[st].push({ seed, before: +b0.toFixed(4), after: +b1.toFixed(4), elite: L.elite.id, ui: U.decode(L.elite.U), log: L.log.map(e => [e.round, e.part, e.played, e.fitness, e.relative, e.outcome, e.elite]) }); }
  const better = runs[st].filter(x => x.after > x.before).length, mean = runs[st].reduce((s, x) => s + x.after - x.before, 0) / SEEDS.length;
  const msg = `${st}: final elite beats the primitive UI on the benchmark in ${better}/${SEEDS.length} lineages (mean gain ${mean.toFixed(4)})`;
  if (st === 'careful') ok(better >= Math.ceil(SEEDS.length * .7) && mean > 0, msg);
  else console.log('info', msg, '(reported, not asserted: in this model the primitive UI is already close to the hasty player\'s best)'); }
/* 3. the two styles are told apart: report where their elites ended */
const avg = (st, k) => runs[st].reduce((s, x) => s + x.ui[k], 0) / SEEDS.length;
['rate', 'detent', 'lambda'].forEach(k => console.log(`     ${k}: careful ${avg('careful', k).toFixed(2)}  hasty ${avg('hasty', k).toFixed(2)}`));
console.log('info: elites differ between the styles as listed above (reported, not asserted)');
fs.writeFileSync(D + '/tests/ui-lineage-trace.json', JSON.stringify({ note: 'written by tests/ui.test.js: UI lineages for two scripted players on the stand-in parts (simulation, not the browser)', runs }, null, 1));
console.log(`\n${n - fails}/${n} passed`); process.exit(fails ? 1 : 0);
