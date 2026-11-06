/* tools/shot.js — screenshots the page at phone size on the virtual clock: node tools/shot.js <query> <out.png> <seconds> [js-to-eval-before] */
const { chromium } = require('playwright');
(async () => { const [q, out, secs, pre] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 432, height: 768 } }); p.setDefaultTimeout(0); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8790/experiments/swarms/3d-skinning/index.html?rec=1' + (q || ''));
  await p.waitForFunction(() => window.MM, null, { timeout: 20000 });
  if (pre) await p.evaluate(pre);
  const n = Math.round(+secs * 30); for (let i = 0; i < n; i++) await p.evaluate(() => MM.advance(1 / 30));
  await p.screenshot({ path: out }); console.log(JSON.stringify({ errs, t: await p.evaluate(() => MM.NOW()) })); await b.close(); })();
