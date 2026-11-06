const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 160)); });
  await p.goto('http://127.0.0.1:8095/maker.html', { waitUntil: 'load' }); await p.waitForTimeout(2000);
  const run = async (src, sec) => p.evaluate(([s, n]) => { eval(s); for (let k = 0; k < n * 30; k++) FORGE.step(1 / 30); }, [src, sec || .8]);
  const shot = async n => { await p.evaluate(() => FORGE.advance(1 / 30)); await p.screenshot({ path: `/home/claude/stelline-work/maker/r${n}.jpg`, quality: 82 }); };
  await p.evaluate(() => FORGE.manual()); await shot(0);
  await run("FORGE.press('ADD'); FORGE.press('ADD')"); await run("FORGE.turn(2,4); FORGE.turn(3,1)"); await shot(1);
  // candles, table, three figures
  await run("FORGE.press('ADD'); FORGE.press('ADD')"); await run("FORGE.press('ADD'); FORGE.press('ADD')");
  for (let i = 0; i < 3; i++) await run("FORGE.press('ADD'); FORGE.press('ADD')", 1.2);
  await shot(2);
  await run("FORGE.press('MODE'); FORGE.setView('SIDE')", 1.2); await shot(3);
  await run("FORGE.setView('TOP')", 1.2); await shot(4);
  await run("FORGE.setView('FREE'); FORGE.viewBy(.7, -.05, .6)", 1.2); await shot(5);
  console.log(JSON.stringify(await p.evaluate(() => ({ things: FORGE.things().map(t => t.name), add: FORGE.addable().map(t => t.name), rings: FORGE.rings().map(r => r && r.n + '=' + r.f(r.v())) }))));
  console.log(errs.slice(0, 8)); await b.close();
})();
