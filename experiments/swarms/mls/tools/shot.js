// quick screenshots: node tools/shot.js <out.png> <query> <w> <h> <seconds-of-demo>
const { chromium } = require('playwright');
(async () => { const [out, q, w, h, sec] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: +w, height: +h } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/experiments/swarms/mls/index.html' + (q || ''), { waitUntil: 'load' });
  await p.waitForFunction('window.READY === true', null, { timeout: 30000 });
  if (+sec > 0) await p.evaluate(s => { const G = window.G; G.playScript(); const n = Math.round(s * 30); for (let i = 0; i < n; i++) G.update(1 / 30); PAGE.render(); PAGE.drawDev(); }, +sec);
  await p.screenshot({ path: out }); console.log(errs.join('\n') || 'no errors'); await b.close(); })();
