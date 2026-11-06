/* record.js — films the game played through the device with real mouse input (phone-size viewport), on the page's virtual clock (?rec=1):
   each frame advances exactly 1/30 s and is screenshotted. The moves are the page's own SCRIPT (the brown dome made start to finish),
   performed as drags on the rings and taps on SELECT / HOLD, so every change is a consequence of device input.
   The soundtrack is the page's sound-event log rendered offline through the same play() code (OfflineAudioContext).
   Needs a server at the repo root: python3 -m http.server 8793
   Usage: node record.js <frames-dir>; then ffmpeg -framerate 30 -i <dir>/%05d.jpg -i <dir>/audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest proof.mp4 */
'use strict';
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '/home/claude/stelline-work/arap-scratch/frames', DUR = +(process.argv[3] || 25), URL = 'http://localhost:8793/experiments/swarms/3d-arap/index.html?rec=1';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 1 }); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForFunction(() => window.MM && MM.ready(), null, { timeout: 60000 });
  const geo = await p.evaluate(() => { const r = MM.devRect(), B = MM.BANDS(), T = MM.BTNS(); const band = id => { const b = B.find(b => b.ring && b.ring.id === id); return { x: b.x, w: b.w, cy: b.cy, rad: b.rad, deg: b.ring.deg }; };
    return { ox: r.left, oy: r.top, k: band('knurl'), t: band('tri'), s: band('scale'), sel: T.find(t => t.id === 'select'), hold: T.find(t => t.id === 'hold'), script: MM.SCRIPT }; });
  const P = (x, y) => [geo.ox + x, geo.oy + y];
  let pending = [], F = 0; const at = (df, fn) => pending.push([F + df, fn]); const log = [];
  const tap = (bt, frames) => { const [x, y] = P(bt.x, bt.y); at(0, async () => { await p.mouse.move(x, y); await p.mouse.down(); }); at(frames || 3, async () => { await p.mouse.up(); }); };
  const drag = (band, detents, frames) => { const [x, y0] = P(band.x + band.w / 2, band.cy), dy = -detents * band.deg / (57.3 * .9) * band.rad;
    at(0, async () => { await p.mouse.move(x, y0); await p.mouse.down(); }); for (let i = 1; i <= frames; i++) { const u = i / frames, e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; at(i, async () => { await p.mouse.move(x, y0 + dy * e); }); } at(frames + 1, async () => { await p.mouse.up(); }); };
  const N = Math.round(DUR * 30); let si = 0; const t0 = Date.now();
  for (F = 0; F < N; F++) {
    const t = F / 30;
    while (si < geo.script.length && geo.script[si][0] <= t) { const s = geo.script[si++];
      if (s[1] === 'hold') { tap(geo.hold, 3); log.push([+t.toFixed(2), 'tap HOLD']); }
      else if (s[1] === 'sel') { const st = await p.evaluate(() => ({ cur: MM.S.target })); const n = s[2] == null ? 1 : Math.max(0, s[2] - st.cur); for (let k = 0; k < n; k++) { const df = k * 4; const [x, y] = P(geo.sel.x, geo.sel.y); at(df, async () => { await p.mouse.move(x, y); await p.mouse.down(); }); at(df + 2, async () => { await p.mouse.up(); }); } log.push([+t.toFixed(2), 'tap SELECT x' + n]); }
      else if (s[1] === 'k' || s[1] === 't') { const ix = s[1] === 'k' ? 1 : 2, cur = await p.evaluate(i => MM.RINGS[i].target, ix); drag(geo[s[1]], s[2] - cur, Math.max(4, Math.round(s[3] * 30))); log.push([+t.toFixed(2), 'drag ' + (s[1] === 'k' ? 'KNURL' : 'TRIANGLE'), s[2] - cur]); } }
    for (const a of pending.filter(a => a[0] === F)) await a[1](); pending = pending.filter(a => a[0] > F);
    await p.evaluate(() => MM.advance(1 / 30));
    await p.screenshot({ path: path.join(out, String(F).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 90, timeout: 600000 });
    if (F % 60 === 0) console.log('frame', F, 'of', N, Math.round((Date.now() - t0) / 1000) + ' s', await p.evaluate(() => MM.STAGES[MM.S.stage] + ' ' + MM.tName()));
  }
  const au = await p.evaluate(d => MM.renderAudio(0, d), DUR); fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(au.b64, 'base64'));
  const tr = await p.evaluate(() => MM.traceOut()); tr.source = 'the proof recording (record.js): the game played through the device with mouse input on a virtual clock, ' + DUR + ' s, 432x768'; tr.deviceInputs = log; tr.audio = { peak: au.peak, realDeviceGrains: au.real };
  fs.writeFileSync(path.join(__dirname, 'trace.json'), JSON.stringify(tr, null, 1));
  console.log(JSON.stringify({ stage: tr.stage, gen: tr.gen, rises: tr.monotoneViolations, inverted: tr.maxInverted, now: tr.now, audio: tr.audio, errors: errs }));
  await b.close(); })();
