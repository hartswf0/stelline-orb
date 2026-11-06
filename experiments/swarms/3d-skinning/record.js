/* record.js — films the game with Playwright at phone size, played through the device with real mouse input (drags on the rings,
   taps on SELECT and HOLD). The page runs on a virtual clock (?rec=1): each frame advances exactly 1/30 s and is screenshotted.
   The soundtrack is the page's own sound-event log rendered offline through the same play() code (OfflineAudioContext).
   Needs a local server at the repo root:  python3 -m http.server 8790
   Usage: node record.js <frames-dir>
   then:  ffmpeg -framerate 30 -i <dir>/%05d.jpg -i <dir>/audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest proof.mp4 */
'use strict';
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '/tmp/skin-rec', URL = 'http://localhost:8790/experiments/swarms/3d-skinning/index.html?rec=1'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 1 }); p.setDefaultTimeout(0); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForFunction(() => window.MM && MM.ready(), null, { timeout: 30000 }); await p.evaluate(() => MM.advance(0));
  const geo = await p.evaluate(() => { const r = MM.devRect(), B = MM.BANDS(), T = MM.BTNS(); const band = id => { const b = B.find(b => b.ring && b.ring.id === id); return { x: b.x, w: b.w, cy: b.cy, rad: b.rad, deg: b.ring.deg }; };
    return { ox: r.left, oy: r.top, knurl: band('knurl'), tri: band('tri'), scale: band('scale'), sel: T.find(t => t.id === 'select'), hold: T.find(t => t.id === 'hold') }; });
  const P = (x, y) => [geo.ox + x, geo.oy + y];
  let F = 0, pending = []; const at = (df, fn) => pending.push([F + df, fn]);
  const tap = (bt, frames) => { const [x, y] = P(bt.x, bt.y); at(0, async () => { await p.mouse.move(x, y); await p.mouse.down(); }); at(frames || 3, async () => { await p.mouse.up(); }); return (frames || 3) + 2; };
  // a hand turn: strokes of at most 9 detents, regripping between them, about 12.5 detents a second
  const turn = (band, detents) => { const px = band.deg / (57.3 * .9) * band.rad, sgn = Math.sign(detents); let left = Math.abs(detents), off = 0;
    while (left > 0) { const n = Math.min(9, left), frames = Math.max(4, Math.round(n / 12.5 * 30)), x = P(band.x + band.w / 2, 0)[0], y0 = P(0, band.cy + sgn * band.rad * .85)[1], dy = -sgn * (n + .45) * px;
      at(off, async () => { await p.mouse.move(x, y0); await p.mouse.down(); });
      for (let i = 1; i <= frames; i++) { const u = i / frames; at(off + i, async () => { await p.mouse.move(x, y0 + dy * u); }); }
      at(off + frames + 1, async () => { await p.mouse.up(); }); off += frames + 3; left -= n; } return off; };
  const st = () => p.evaluate(() => ({ t: MM.NOW(), target: MM.S.target, prog: MM.KIDS.map(k => k.prog), busy: MM.RINGS.some(r => r.target !== r.applied), ens: MM.S.ens, done: [...MM.S.done], ended: MM.S.ended, reach: MM.KIDS.map(k => k.reach), lim: MM.limitOf(MM.S.target) }));
  // the player's plan: [what, arg]; each step waits for the machine to finish the previous one
  const PLAN = [['wait', 2.3], ['knurl', 18], ['select'], ['knurl', 22], ['tri', 6], ['knurl', 22], ['select'], ['tri', 3], ['knurl', 22], ['hold'], ['scale', -6, 'free'], ['wait', 4.5], ['scale', 6, 'free'], ['untilEnd'], ['wait', 2.6]];
  let step = 0, busyUntil = 0, waitUntil = 0; const log = [];
  for (F = 0; F < 40 * 30; F++) {
    if (F >= busyUntil && step < PLAN.length) { const s = await st(); const [what, arg, free] = PLAN[step];
      const machineIdle = !s.busy && !s.ens;
      if (what === 'wait') { if (!waitUntil) waitUntil = s.t + arg; if (s.t >= waitUntil) { waitUntil = 0; step++; } }
      else if (what === 'untilEnd') { if (s.ended && s.t - s.ended > .1) step++; }
      else if (free || machineIdle) {
        if (what === 'knurl') busyUntil = F + turn(geo.knurl, arg) + 2; else if (what === 'tri') busyUntil = F + turn(geo.tri, arg) + 2; else if (what === 'scale') busyUntil = F + turn(geo.scale, arg) + 2;
        else if (what === 'select') busyUntil = F + tap(geo.sel, 2) + 4; else if (what === 'hold') busyUntil = F + tap(geo.hold, 3) + 3;
        log.push([+(F / 30).toFixed(2), what, arg == null ? '' : arg]); step++; } }
    for (const a of pending.filter(a => a[0] === F)) await a[1](); pending = pending.filter(a => a[0] > F);
    await p.evaluate(() => MM.advance(1 / 30));
    await p.screenshot({ path: path.join(out, String(F).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 88 });
    if (step >= PLAN.length && !pending.length) { F++; break; }
    if (F % 60 === 0) console.error('frame', F, JSON.stringify(await st()));
  }
  const DUR = F / 30; const au = await p.evaluate(d => MM.renderAudio(0, d), DUR); fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(au.b64, 'base64'));
  const tr = await p.evaluate(() => MM.traceOut()); tr.source = 'record.js: the game played through the device with mouse input on a virtual clock, ' + DUR.toFixed(2) + ' s, 432x768'; tr.inputs = log; tr.frames = F;
  fs.writeFileSync(path.join(__dirname, 'trace.json'), JSON.stringify(tr, null, 1));
  console.log(JSON.stringify({ frames: F, dur: DUR, gens: tr.gens.length, lit: tr.lit, out: tr.out, peak: au.peak, errors: errs, inputs: log }));
  await b.close(); })();
