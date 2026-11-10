/* shots.js — stills of the in-page SCENE at given times (virtual clock). Usage: node tools/shots.js outdir t1 t2 ... [--w 1280 --h 720] */
'use strict';
const { chromium } = require('playwright'), path = require('path'), fs = require('fs');
const a = process.argv.slice(2), out = a.shift(); let W = 1280, H = 720; const ts = [];
for (let i = 0; i < a.length; i++) { if (a[i] === '--w') W = +a[++i]; else if (a[i] === '--h') H = +a[++i]; else ts.push(+a[i]); }
fs.mkdirSync(out, { recursive: true });
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8771/experiments/swarms/3d-atelier/index.html?rec=1'); await p.waitForFunction(() => window.MM && MM.ready(), null, { timeout: 30000 });
  await p.evaluate(() => MM.press('play')); let t = 0;
  for (const tt of ts.sort((x, y) => x - y)) { while (t < tt - 1e-6) { const d = Math.min(.1, tt - t); await p.evaluate(d => MM.advance(d), d); t += d; } await p.screenshot({ path: path.join(out, `t${tt.toFixed(1)}.png`) }); }
  console.log('errors', errs.length, errs.slice(0, 5).join(' | ')); await b.close(); })();
