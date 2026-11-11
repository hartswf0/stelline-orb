// The gate. The Eye (eye.html) draws each generation of each birthday; the footage judges it.
//   node tools/lift/score.mjs [ids...]      writes assets/eye/scores.json and scores.js
// Needs a static server on the repo root:  python3 -m http.server 8765 --bind 127.0.0.1   (PORT=... to change)
// Measures, per birthday and generation (0 rig, 1 relief, 2 revolve):
//   iou    the drawn cake's outline against the cake's mask in the frame, from the footage's own camera
//   solid  smallest outline area over yaw 30..180 divided by the area at yaw 0 (a relief collapses, a solid does not)
//   color  mean absolute RGB difference between the drawn cake and the frame where both have cake, 0..1
// pass = iou >= 0.85 and solid >= 0.60 (provisional thresholds, set before the first full run and not tuned after).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = process.env.PORT || 8765;
const out = path.join(ROOT, 'assets/eye/scores.json');
const db = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out)) : {};
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 800, height: 420 } });
p.on('pageerror', e => console.log('PAGE ERROR', e.message));
await p.goto(`http://127.0.0.1:${PORT}/eye.html?bare=1&w=768`);
await p.waitForFunction('window.EYE && window.EYE.ready');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : await p.evaluate(() => EYE.IDS);
for (const id of ids) {
  await p.evaluate(i => EYE.show(i), id); await p.evaluate(() => EYE.texReady());
  const has = await p.evaluate(i => !!EYE.DB[i].revolve, id);
  const r = {};
  for (const g of has ? [0, 1, 2] : [1]) r['g' + g] = await p.evaluate(g => EYE.score(g), g);
  if (has) r.g3 = r.g2;      // generation 3 at its last moment is generation 2; its earlier moments have no separate ground truth yet
  db[id] = r;
  console.log(id, Object.entries(r).filter(([k]) => k !== 'g3').map(([k, v]) => `${k} iou ${v.iou.toFixed(2)} solid ${v.solid.toFixed(2)} col ${v.color.toFixed(3)} ${v.pass ? 'PASS' : 'FAIL'}`).join(' | '));
}
await b.close();
fs.writeFileSync(out, JSON.stringify(db));
fs.writeFileSync(path.join(ROOT, 'assets/eye/scores.js'), 'window.EYE_SCORES=' + JSON.stringify(db) + ';');
const gens = ['g0', 'g1', 'g2'], sum = {};
for (const g of gens) { const v = Object.values(db).map(r => r[g]).filter(Boolean); const m = k => v.reduce((a, x) => a + x[k], 0) / (v.length || 1); sum[g] = { n: v.length, pass: v.filter(x => x.pass).length, iou: +m('iou').toFixed(3), solid: +m('solid').toFixed(3), color: +m('color').toFixed(4) }; }
fs.writeFileSync(path.join(ROOT, 'assets/eye/summary.json'), JSON.stringify(sum, null, 1));
console.table(sum);
