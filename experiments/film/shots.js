const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0,140)); });
  await p.goto('http://127.0.0.1:8095/weaver.html?cinema', { waitUntil: 'load' }); await p.waitForTimeout(2000);
  await p.addStyleTag({ content: '#labBtn{display:none!important}' }); await p.evaluate(() => { FORGE.manual(); FORGE.GUIDE.auto = true; FORGE.GUIDE.show(); });
  const want = new Set((process.argv[2] || '0,2,5,8,11,13,14').split(',').map(Number)); const done = new Set();
  for (let s = 0; s < 500; s++) {
    const st = await p.evaluate(() => { for (let k = 0; k < 6; k++) FORGE.step(1/30); return [FORGE.GUIDE.i, FORGE.GUIDE.doneT]; });
    if (want.has(st[0]) && !done.has(st[0]) && st[1] != null) { done.add(st[0]); await p.evaluate(() => FORGE.advance(1/30)); await p.screenshot({ path: `/home/claude/stelline-work/cine/c${String(st[0]).padStart(2,'0')}.jpg`, quality: 85 }); }
    if (st[0] >= 15) break;
  }
  console.log(errs.slice(0, 6), [...done]);
  await b.close();
})();
