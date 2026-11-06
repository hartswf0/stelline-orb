// The guided cake in the film's own look: ?cinema; every frame at 30 fps; the sound log and per-frame state saved for the score.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => console.log('PE', e.message));
  await p.goto('http://127.0.0.1:8095/weaver.html?cinema', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#labBtn{display:none!important}' }); await p.evaluate(() => { window.SNDLOG = []; FORGE.manual(); FORGE.GUIDE.auto = true; FORGE.GUIDE.q = []; FORGE.GUIDE.show(); FORGE.GUIDE.qT = 1.8; window.T0 = FORGE.S ? 0 : 0; });
  const D = '/home/claude/stelline-work/cine/f/'; const st = []; let hold = 0;
  for (let f = 0; f < 3600; f++) {
    const s = await p.evaluate(() => { FORGE.advance(1 / 30); const F = FORGE.DOC.frames[FORGE.DOC.cur]; return { i: FORGE.GUIDE.i, shot: FORGE.CINE.shot, flames: F.items.filter(x => x.t === 'CANDLE' && !x.out).length, kids: FORGE.DOC.cast.length, mist: FORGE.S.mode === 'WEAVE' ? (FORGE.S.weave.mist || 0) : 0, rot: FORGE.CAKE.rotation.y, now: FORGE.now() }; });
    st.push(s); if (s.i >= 15) { hold++; if (hold === 1) await p.evaluate(() => { FORGE.S.turntable = true; }); if (hold > 150) break; }
    await p.screenshot({ path: D + String(f).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 92 });
    if (f % 300 === 0) console.log('frame', f, 'step', s.i);
  }
  const log = await p.evaluate(() => window.SNDLOG); const t0 = 0;
  fs.writeFileSync('/home/claude/stelline-work/cine/score.json', JSON.stringify({ log, st })); await b.close(); console.log('done', st.length);
})();
