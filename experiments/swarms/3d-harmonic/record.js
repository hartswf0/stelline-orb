/* record.js — films HARMONIC CAKE with Playwright, played through the device with mouse input at phone size (432 x 768).
   The page runs on a virtual clock (?rec=1): each frame advances exactly 1/30 s and is screenshotted. The soundtrack is the page's own sound-event
   log rendered offline by the same play() code (OfflineAudioContext), with the device's click grains if ana/device-sounds.wav is present.
   The player is a script: it asks the page's planner (MM.plan) what the pattern needs (the same planner the SCENE button uses), then does it
   with the mouse on the drawn rings and buttons. It commits one pass early on purpose (TOP SHELLS with the nozzle still at 24:1) to show a rejection.
   Needs a server at the repo root:  python3 -m http.server 8779
   Usage: node record.js <frames-dir>   then: ffmpeg -framerate 30 -i <dir>/%05d.jpg -i <dir>/audio.wav -c:v libx264 -crf 21 -pix_fmt yuv420p -c:a aac -shortest proof.mp4 */
'use strict';
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '/home/claude/stelline-work/harmonic/frames', MAXDUR = 34, URL = 'http://localhost:8779/experiments/swarms/3d-harmonic/index.html?rec=1'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 1 }); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForFunction(() => window.MM && MM.ready(), null, { timeout: 120000 }); await p.waitForTimeout(1500); await p.evaluate(() => MM.advance(0));
  const geo = await p.evaluate(() => { const r = MM.devRect(), B = MM.BANDS(), T = MM.BTNS(); const band = id => B.find(b => b.ring && b.ring.id === id);
    return { ox: r.left, oy: r.top, knurl: band('knurl'), tri: band('tri'), scale: band('scale'), sel: T.find(t => t.id === 'select'), hold: T.find(t => t.id === 'hold') }; });
  const P = (x, y) => [geo.ox + x, geo.oy + y];
  let pending = [], F = 0; const at = (df, fn) => pending.push([F + df, fn]);
  const tap = (bt, frames) => { const [x, y] = P(bt.x, bt.y); at(0, async () => { await p.mouse.move(x, y); await p.mouse.down(); }); at(frames || 3, async () => { await p.mouse.up(); }); };
  const drag = (band, detents, frames) => { const [x, y0] = P(band.x + band.w / 2, band.cy); const px = band.ring.deg / (57.3 * .9) * band.rad, dy = -detents * px;
    at(0, async () => { await p.mouse.move(x, y0); await p.mouse.down(); }); for (let i = 1; i <= frames; i++) { const u = i / frames, e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; at(i, async () => { await p.mouse.move(x, y0 + dy * e); }); } at(frames + 1, async () => { await p.mouse.up(); }); };
  const log = []; let cool = 0, overAt = -1, yawA = false, yawB = false, yawC = false;
  for (F = 0; F < MAXDUR * 30; F++) {
    const s = await p.evaluate(() => ({ stage: MM.G.stage, run: MM.S.run && MM.S.run.def.id, over: MM.S.over, plan: MM.plan({ missOnce: 'TOP SHELLS' }), busy: MM.RINGS.some(r => r.target !== r.applied) }));
    const ptr = pending.some(a => a[0] >= F);
    if (!ptr && F >= 24) {
      if (s.run === 'SPONGE' && !yawA) { drag(geo.scale, -5, 22); yawA = true; log.push([+(F / 30).toFixed(2), 'scale', -25]); }
      else if (s.stage === 5 && !s.run && !yawB) { drag(geo.scale, 5, 18); yawB = true; log.push([+(F / 30).toFixed(2), 'scale', 0]); }
      else if (s.over && !yawC && F - overAt > 10) { drag(geo.scale, 4, 30); yawC = true; log.push([+(F / 30).toFixed(2), 'scale', 20]); }
      else if (s.plan && F >= cool) { const pl = s.plan;
        if (pl.type === 'select') { tap(geo.sel, 2); cool = F + 6; }
        else if (pl.type === 'hold') { tap(geo.hold, 3); cool = F + 10; }
        else { const band = pl.ring === 'knurl' ? geo.knurl : geo.tri; drag(band, pl.d, Math.max(6, Math.min(20, Math.round(Math.abs(pl.d) * 1.2)))); cool = F + 8; }
        log.push([+(F / 30).toFixed(2), pl.type, pl.ring || '', pl.d || '']); } }
    if (s.over && overAt < 0) overAt = F;
    for (const a of pending.filter(a => a[0] === F)) await a[1](); pending = pending.filter(a => a[0] > F);
    await p.evaluate(() => MM.advance(1 / 30));
    await p.screenshot({ path: path.join(out, String(F).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 90, timeout: 300000 });
    if (overAt >= 0 && F - overAt > 75) { F++; break; }
    if (F % 60 === 0) console.error('frame', F, s.stage, s.run || '');
  }
  const dur = F / 30; const au = await p.evaluate(d => MM.renderAudio(0, d), dur); fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(au.b64, 'base64'));
  const tr = await p.evaluate(() => MM.traceOut()); tr.source = 'record.js: the game played through the device with mouse input on a virtual 30 fps clock, ' + dur.toFixed(2) + ' s'; tr.player = log; tr.audio = { peak: au.peak, device_grains: au.grains };
  fs.writeFileSync(path.join(__dirname, 'trace.json'), JSON.stringify(tr, null, 1));
  console.log(JSON.stringify({ frames: F, dur, final: tr.final, peak: au.peak, grains: au.grains, errors: errs }));
  await b.close(); })();
