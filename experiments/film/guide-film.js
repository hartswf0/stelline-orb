// Films the guide building the cake on the orb, frame by frame at 30 fps; one folder per guide step.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 864 } });
  p.on('pageerror', e => console.log('PE', e.message));
  await p.goto('http://127.0.0.1:8095/weaver.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(() => { FORGE.manual(); FORGE.GUIDE.auto = true; FORGE.GUIDE.q = []; FORGE.GUIDE.show(); FORGE.GUIDE.qT = 1.6; });
  const D = '/home/claude/stelline-work/film/guide/'; let n = 0, endHold = 0, last = -1;
  for (let f = 0; f < 3600; f++) {
    const st = await p.evaluate(() => { FORGE.advance(1 / 30); return FORGE.GUIDE.i; });
    if (st !== last) { last = st; n = 0; fs.mkdirSync(D + 's' + String(st).padStart(2, '0'), { recursive: true }); }
    if (st >= 15) { endHold++; if (endHold === 1) await p.evaluate(() => { FORGE.S.turntable = true; }); if (endHold > 150) break; }
    await p.screenshot({ path: D + 's' + String(st).padStart(2, '0') + '/' + String(n++).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 92 });
    if (f % 150 === 0) console.log('frame', f, 'step', st);
  }
  await b.close(); console.log('done');
})();
