/* record.js — films the game with Playwright, playing it through the device with real pointer input (mouse at phone size).
   The page runs on a virtual clock (?rec=1): each frame advances exactly 1/30 s and is screenshotted; the soundtrack is the page's
   own sound-event log rendered offline through the same play() code (OfflineAudioContext). The "player" reads the readout
   (fitness) the way a person would and turns the knurled ring down as the form gets close.
   Needs a local server at the repo root:  python3 -m http.server 8771
   Usage: node record.js <frames-dir>   then: ffmpeg -framerate 30 -i <dir>/%05d.jpg -i <dir>/audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest proof.mp4 */
'use strict';
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '/tmp/evolve-rec', DUR = 20, URL = 'http://localhost:8771/experiments/swarms/evolve/index.html?rec=1'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 1 }); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForFunction(() => window.MM && MM.ready(), null, { timeout: 30000 }); await p.evaluate(() => MM.advance(0));
  const geo = await p.evaluate(() => { const r = MM.devRect(), B = MM.BANDS(), T = MM.BTNS(); const band = id => B.find(b => b.ring && b.ring.id === id);
    return { ox: r.left, oy: r.top, knurl: band('knurl'), scale: band('scale'), sel: T.find(t => t.id === 'select'), hold: T.find(t => t.id === 'hold') }; });
  const P = (x, y) => [geo.ox + x, geo.oy + y];
  const st = () => p.evaluate(() => ({ t: MM.NOW(), k: MM.TARGETS[MM.S.target][0], h: MM.POP.head.parent.fit, c: MM.POP.cake.parent.fit, hm: MM.POP.head.matched, cm: MM.POP.cake.matched, q: MM.S && 0, busy: MM.RINGS.some(r => r.target !== r.applied), knurl: MM.RINGS[1].target, lit: MM.S.lit }));
  // pointer actions, spread over frames: each is a list of [frameOffset, fn]
  let pending = []; const at = (df, fn) => pending.push([F + df, fn]);
  const tap = (bt, holdFrames) => { const [x, y] = P(bt.x, bt.y); at(0, async () => { await p.mouse.move(x, y); await p.mouse.down(); }); at(holdFrames || 3, async () => { await p.mouse.up(); }); };
  const drag = (band, detents, frames) => { const [x, y0] = P(band.x + band.w / 2, band.cy); const px = band.ring.deg / (57.3 * .9) * band.rad; const dy = -detents * px;
    at(0, async () => { await p.mouse.move(x, y0); await p.mouse.down(); }); for (let i = 1; i <= frames; i++) { const u = i / frames, e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; at(i, async () => { await p.mouse.move(x, y0 + dy * e); }); } at(frames + 1, async () => { await p.mouse.up(); }); };
  let F = 0, nextHold = 0, phase = 'head', selects = 0, lastSel = 0, knurlSet = { head: 10, cake: 10 }, yawDone = false; const N = DUR * 30, log = [];
  for (F = 0; F < N; F++) {
    const s = await st(); const busyPtr = pending.some(a => a[0] >= F);
    if (!busyPtr) {
      const fit = phase === 'head' ? s.h : s.c, want = phase === 'head' ? (fit < .8 ? 10 : fit < .88 ? 8 : 7) : (fit < .7 ? 12 : fit < .8 ? 10 : 8);     // the player's hand on the knurl: smaller steps as it gets close
      if ((phase === 'head' || phase === 'cake') && want !== knurlSet[phase]) { drag(geo.knurl, want - knurlSet[phase], 8); log.push([+(F / 30).toFixed(2), 'knurl', want]); knurlSet[phase] = want; }
      else if (phase === 'head' && s.hm) { phase = 'toCake'; nextHold = F + 24; log.push([+(F / 30).toFixed(2), 'head grown', +s.h.toFixed(4)]); }
      else if (phase === 'toCake' && F >= nextHold) { if (selects < 6) { tap(geo.sel, 2); selects++; nextHold = F + 5; log.push([+(F / 30).toFixed(2), 'select']); } else { phase = 'cake'; nextHold = F + 6; } }
      else if (phase === 'cake' && s.cm) { phase = 'done'; nextHold = F + 8; log.push([+(F / 30).toFixed(2), 'cake grown', +s.c.toFixed(4)]); }
      else if (phase === 'done' && !yawDone && F >= nextHold) { drag(geo.scale, -7, 40); yawDone = true; log.push([+(F / 30).toFixed(2), 'kneel to 0']); }
      else if ((phase === 'head' || phase === 'cake') && F >= nextHold && F > 12) { tap(geo.hold, 3); nextHold = F + 11; log.push([+(F / 30).toFixed(2), 'hold']); }
    }
    for (const a of pending.filter(a => a[0] === F)) await a[1](); pending = pending.filter(a => a[0] > F);
    await p.evaluate(() => MM.advance(1 / 30));
    await p.screenshot({ path: path.join(out, String(F).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 90 });
  }
  const au = await p.evaluate(d => MM.renderAudio(0, d), DUR); fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(au.b64, 'base64'));
  const tr = await p.evaluate(() => MM.traceOut()); tr.source = 'the proof recording (record.js): the game played through the device with mouse input, virtual clock, ' + DUR + ' s'; tr.inputs = log;
  fs.writeFileSync(path.join(__dirname, 'trace.json'), JSON.stringify(tr, null, 1));
  const fin = await st(); console.log(JSON.stringify({ final: fin, gens: tr.generations.length, peak: au.peak, errors: errs }));
  await b.close(); })();
