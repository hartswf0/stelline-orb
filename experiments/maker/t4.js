const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8095/maker.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(() => { FORGE.manual(); const st = n => { for (let k = 0; k < n; k++) FORGE.step(1 / 30); }; FORGE.press('ADD'); FORGE.press('ADD'); st(20); FORGE.press('ADD'); FORGE.press('ADD'); st(10); FORGE.turn(2, 6); st(10);
    FORGE.press('ADD'); FORGE.press('ADD'); st(20); FORGE.press('MODE'); FORGE.setView('TOP'); st(40); });
  await p.evaluate(() => FORGE.advance(1 / 30)); await p.screenshot({ path: '/home/claude/stelline-work/maker/top.jpg', quality: 82 });
  await p.evaluate(() => { FORGE.setView('EYE'); FORGE.press('MODE'); for (let k = 0; k < 40; k++) FORGE.step(1 / 30); FORGE.advance(1 / 30); }); await p.screenshot({ path: '/home/claude/stelline-work/maker/eye.jpg', quality: 82 });
  console.log(errs); await b.close(); })();
