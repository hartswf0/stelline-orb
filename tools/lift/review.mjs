// Review sheets for a critic who did not build the thing: for each chosen birthday, the footage plate beside the
// accepted generation drawn from the footage's camera and from 45, 90 and 180 degrees round.
//   node tools/lift/review.mjs outdir [ids...]     (no ids = best 3, middle 4, worst 3 by g2 silhouette score)
// Needs a static server on the repo root (PORT, default 8765).
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), PORT = process.env.PORT || 8765;
const outdir = process.argv[2]; fs.mkdirSync(outdir, { recursive: true });
let ids = process.argv.slice(3);
if (!ids.length) { const sc = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/eye/scores.json'))); const r = Object.keys(sc).filter(k => sc[k].g2).sort((a, b) => sc[b].g2.iou - sc[a].g2.iou), m = Math.floor(r.length / 2); ids = [...r.slice(0, 3), ...r.slice(m - 2, m + 2), ...r.slice(-3)]; }
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 700, height: 420 } }); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
await p.goto(`http://127.0.0.1:${PORT}/eye.html?bare=1&w=640&h=400`); await p.waitForFunction('window.EYE && window.EYE.ready');
const sheet = await b.newPage({ viewport: { width: 5 * 644, height: 404 } });
for (const id of ids) {
  await p.evaluate(i => EYE.show(i), id); await p.evaluate(() => EYE.texReady());
  const shots = [];
  for (const yaw of [0, 45, 90, 180]) { await p.evaluate(y => EYE.set({ gen: 2, ortho: false, room: true, matte: false, yaw: y, elev: null, zoom: 1, t: 1 }), yaw); shots.push(await p.evaluate(() => EYE.png())); }
  const html = `<body style="margin:0;background:#000;display:flex;gap:4px;font:14px monospace;color:#fff"><div style="width:640px;height:400px;background:#000 url(http://127.0.0.1:${PORT}/assets/eye/${id}/plate.webp) center/contain no-repeat;position:relative"><b style="position:absolute;left:6px;top:4px;background:#000">${id} FOOTAGE</b></div>` +
    shots.map((s, i) => `<div style="position:relative"><img src="${s}" width="640" height="400"><b style="position:absolute;left:6px;top:4px;background:#000">3D yaw ${[0, 45, 90, 180][i]}</b></div>`).join('') + '</body>';
  await sheet.setContent(html); await sheet.waitForTimeout(300); await sheet.screenshot({ path: path.join(outdir, id + '.jpg'), quality: 80, type: 'jpeg' });
  console.log(id);
}
await b.close();
