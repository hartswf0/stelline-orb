/* tools/shots.js — several screenshots from one run: node tools/shots.js <query> <outprefix> <t1,t2,...> [js-before] */
const { chromium } = require('playwright');
(async () => { const [q, out, ts, pre] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 432, height: 768 } }); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8790/experiments/swarms/3d-skinning/index.html?rec=1' + (q || '')); await p.waitForFunction(() => window.MM, null, { timeout: 20000 });
  if (pre) await p.evaluate(pre); let t = 0;
  for (const T of ts.split(',').map(Number)) { await p.evaluate(n => { for (let i = 0; i < n; i++) MM.advance(1 / 30); }, Math.round((T - t) * 30)); t = T; await p.screenshot({ path: out + T + '.png' }); }
  const tr = await p.evaluate(() => { const o = MM.traceOut(); delete o.samples; return o; }); console.log(JSON.stringify({ errs, tr })); await b.close(); })();
