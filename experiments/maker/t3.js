const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 160)); });
  await p.goto('http://127.0.0.1:8095/maker.html', { waitUntil: 'load' }); await p.waitForTimeout(2000);
  const run = async (src, sec) => p.evaluate(([s, n]) => { eval(s); for (let k = 0; k < n * 30; k++) FORGE.step(1 / 30); }, [src, sec || .6]);
  const shot = async n => { await p.evaluate(() => FORGE.advance(1 / 30)); await p.screenshot({ path: `/home/claude/stelline-work/maker/w${n}.jpg`, quality: 82 }); };
  await p.evaluate(() => FORGE.manual());
  await run("FORGE.press('ADD'); FORGE.press('ADD')"); await run("FORGE.press('ADD'); FORGE.press('ADD')");   // cake, candles
  await run("FORGE.turn(2, 1)"); await shot(0);                                                                  // kind: spiral
  await run("FORGE.turn(1, 3); FORGE.turn(2, 6); FORGE.turn(3, -4); FORGE.turn(4, -1)", 1); await shot(1);      // candle 3: around, in, out
  await run("FORGE.turn(1, -3); FORGE.turn(2, 4)"); await shot(2);                                               // all: white taper
  await run("FORGE.turn(2, 2)", .6); await shot(3);                                                              // number
  await run("FORGE.press('ADD'); FORGE.press('ADD')", .6);                                                       // writing
  await p.keyboard.press('Backspace'); for (const ch of ' ANA') await p.keyboard.press(ch === ' ' ? 'Space' : ch);
  await run("FORGE.turn(4, 1)", .5); await shot(4);
  await run("FORGE.press('PAIR')", .5); await shot(5);
  console.log(JSON.stringify(await p.evaluate(() => ({ w: FORGE.DOC.writing, c: FORGE.DOC.candles, rings: FORGE.rings().map(r => r && r.n + '=' + r.f(r.v())) }))));
  console.log(errs.slice(0, 8)); await b.close();
})();
