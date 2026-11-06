/* record.js — films the game with Playwright, playing it through the device with real mouse input at phone size (432 x 768).
   The page runs on a virtual clock (?rec=1): each frame advances exactly 1/30 s and is screenshotted; the soundtrack is the page's
   own sound-event log rendered offline through the same play() code (OfflineAudioContext). The "player" reads the readout the way
   a person would: HOLD to breed until the stage's bar is reached, HOLD to set it, the knurl for strokes and candles.
   Needs a local server at the repo root:  python3 -m http.server 8771
   Usage: node record.js <frames-dir>   then: ffmpeg -framerate 30 -i <dir>/%05d.jpg -i <dir>/audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest proof.mp4 */
'use strict';
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '/tmp/evolve-rec', MAXDUR = 30, URL = 'http://localhost:8771/experiments/swarms/evolve/index.html?rec=1'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 1 }); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForFunction(() => window.MM && MM.ready(), null, { timeout: 30000 }); await p.evaluate(() => MM.advance(0));
  const geo = await p.evaluate(() => { const r = MM.devRect(), B = MM.BANDS(), T = MM.BTNS(); const band = id => B.find(b => b.ring && b.ring.id === id);
    return { ox: r.left, oy: r.top, knurl: band('knurl'), scale: band('scale'), sel: T.find(t => t.id === 'select'), hold: T.find(t => t.id === 'hold') }; });
  const P = (x, y) => [geo.ox + x, geo.oy + y];
  const st = () => p.evaluate(() => { const si = Math.min(MM.S.target, 4), s = MM.E.STAGES[si]; return { step: MM.stepName(), ready: MM.stageReady(), score: s[1] === 'iou' ? MM.P.parent.iou : MM.P.parent.fit, bar: s[2], knurl: MM.RINGS[1].target, busy: MM.RINGS.some(r => r.target !== r.applied), ended: MM.S.ended, lighting: MM.S.lighting, ins: MM.S.ins, placed: MM.S.placed }; });
  let pending = [], F = 0; const at = (df, fn) => pending.push([F + df, fn]);
  const tap = (bt, holdFrames) => { const [x, y] = P(bt.x, bt.y); at(0, async () => { await p.mouse.move(x, y); await p.mouse.down(); }); at(holdFrames || 3, async () => { await p.mouse.up(); }); };
  const drag = (band, detents, frames) => { const [x, y0] = P(band.x + band.w / 2, band.cy); const px = band.ring.deg / (57.3 * .9) * band.rad; const dy = -detents * px;
    at(0, async () => { await p.mouse.move(x, y0); await p.mouse.down(); }); for (let i = 1; i <= frames; i++) { const u = i / frames, e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; at(i, async () => { await p.mouse.move(x, y0 + dy * e); }); } at(frames + 1, async () => { await p.mouse.up(); }); };
  let next = 12, endAt = 0, turned = false, lastStep = ''; const log = [], L = (...a) => log.push([+(F / 30).toFixed(2), ...a]);
  for (F = 0; F < MAXDUR * 30; F++) {
    const s = await st(); const busyPtr = pending.some(a => a[0] >= F);
    if (s.step !== lastStep) { lastStep = s.step; next = Math.max(next, F + 8); }
    if (!busyPtr && F >= next && !s.busy) {
      const evolved = ['BASE', 'FORM', 'SPONGE', 'ICING', 'DECORATION'].includes(s.step);
      if (evolved) { const want = s.score < s.bar - .04 ? 11 : 9;
        if (s.ready) { tap(geo.hold, 3); next = F + 14; L('hold: set', s.step, +s.score.toFixed(4)); }
        else if (want !== s.knurl) { drag(geo.knurl, want - s.knurl, 7); next = F + 9; L('knurl', want); }
        else if (s.step === 'FORM' && !turned) { drag(geo.scale, -3, 20); turned = true; next = F + 4; L('kneel', 20); }
        else { tap(geo.hold, 3); next = F + 11; L('hold', s.step); } }
      else if (s.step === 'INSCRIPTION') { if (s.ins < 24) { drag(geo.knurl, 24 - s.ins, 22); next = F + 26; L('knurl: write'); } else { tap(geo.hold, 3); next = F + 10; L('hold: set inscription'); } }
      else if (s.step === 'CANDLES') { if (s.placed < 7) { drag(geo.knurl, 7 - s.placed, 12); next = F + 16; L('knurl: candles'); } else { tap(geo.hold, 3); next = F + 10; L('hold: set candles'); } }
      else if (s.step === 'LIGHT' && !s.lighting) { tap(geo.hold, 3); next = F + 30; L('hold: light'); }
      else if (s.step === 'BLOW' && !s.ended && F >= next) { tap(geo.hold, 3); next = F + 9999; L('hold: blow'); }
    }
    if (s.ended && !endAt) endAt = F + 45;
    for (const a of pending.filter(a => a[0] === F)) await a[1](); pending = pending.filter(a => a[0] > F);
    await p.evaluate(() => MM.advance(1 / 30));
    await p.screenshot({ path: path.join(out, String(F).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 90 });
    if (endAt && F >= endAt) break;
  }
  const DUR = (F + 1) / 30;
  const au = await p.evaluate(d => MM.renderAudio(0, d), DUR); fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(au.b64, 'base64'));
  const tr = await p.evaluate(() => MM.traceOut()); tr.source = 'the proof recording (record.js): the game played through the device with mouse input on a virtual clock, ' + DUR.toFixed(2) + ' s'; tr.inputs = log;
  fs.writeFileSync(path.join(__dirname, 'trace.json'), JSON.stringify(tr, null, 1));
  console.log(JSON.stringify({ dur: DUR, final: await st(), gens: tr.generations.length, peak: au.peak, errors: errs }));
  await b.close(); })();
