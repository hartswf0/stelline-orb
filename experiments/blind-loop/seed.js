/* seed.js — the starting genomes for the blind loop, grown with the EVOLVE-ALL modules' own fitness (node).
   Copies the elitist stage player from evolve-all/tests/cake.test.js. Writes seeds.json (gene dicts by name). */
'use strict';
const path = require('path'), fs = require('fs');
const EA = path.join(__dirname, '..', 'swarms', 'evolve-all');
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const measure = (e, m) => m === 'fit' ? e.fit : e.parts[m];
function grow(mod, refs, seed, start, cap) {
  const r = mulberry32(seed); let G = start ? Float64Array.from(start) : mod.blank(), e = mod.evaluate(G, refs);
  for (let si = 0; si < mod.stages.length; si++) { const [grp, m, th] = mod.stages[si]; let n = 0;
    while (measure(e, m) < th && n < cap) { n++; const gap = th - measure(e, m), sig = gap > .08 ? .25 : gap > .03 ? .08 : .04;
      for (let c = 0; c < 8; c++) { const K = Float64Array.from(G, (v, i) => { const g = mod.genes[i]; const gi = mod.groups.indexOf(g[1]);
          const w = g[1] === grp ? 1 : gi < mod.groups.indexOf(grp) ? .3 : 0; return w ? clamp(v + sig * w * (g[3] - g[2]) * gauss(r), g[2], g[3]) : v; });
        const ke = mod.evaluate(K, refs);
        if (measure(ke, m) > measure(e, m) && mod.stages.slice(0, si).every(([, mm, tt]) => measure(ke, mm) >= tt || measure(ke, mm) >= measure(e, mm))) { G = K; e = ke; } } }
    console.log(mod.name, grp, n, measure(e, m).toFixed(3)); }
  // then polish the whole fit
  for (let n = 0; n < 150; n++) { for (let c = 0; c < 8; c++) { const K = Float64Array.from(G, (v, i) => { const g = mod.genes[i]; return clamp(v + .03 * (g[3] - g[2]) * gauss(r), g[2], g[3]); });
      const ke = mod.evaluate(K, refs); if (ke.fit > e.fit && mod.stages.every(([, mm, tt]) => measure(ke, mm) >= Math.min(tt, measure(e, mm)))) { G = K; e = ke; } } }
  console.log(mod.name, 'fit', e.fit.toFixed(3));
  const o = {}; mod.genes.forEach((g, i) => o[g[0]] = +G[i].toFixed(5)); return o; }
const load = n => [require(path.join(EA, 'modules', n + '.js')), JSON.parse(fs.readFileSync(path.join(EA, 'refs', n + '.json'), 'utf8'))];
const out = {};
const [cake, cr] = load('cake');
out.cakeA = grow(cake, Object.assign({}, cr, { target: 'cream' }), 3125, null, 300);
out.cakeB = grow(cake, Object.assign({}, cr, { target: 'cream_table' }), 3125, null, 300);
const [table, tr] = load('table'); out.table = grow(table, tr, 7, null, 300);
for (const n of ['candles', 'inscription']) { const [m] = load(n); const o = {}; m.genes.forEach(g => o[g[0]] = g[4]); out[n] = o; }
fs.writeFileSync(path.join(__dirname, 'seeds.json'), JSON.stringify(out, null, 1));
