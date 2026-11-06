/* record.js — films the game with Playwright, driving the device with real pointer input (mouse drags on the rings, presses on SELECT and HOLD).
   The page runs on a virtual clock (?rec=1): each frame advances exactly 1/30 s and is screenshotted; the sound is the page's own event log
   rendered offline through the same play() code. Needs: python3 -m http.server 8771 at the repo root.
   Usage: node tools/record.js <framesdir> [width height]  then: ffmpeg -framerate 30 -i dir/%05d.jpg -i dir/audio.wav -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest proof.mp4 */
'use strict';
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), S = require('../scenario.js');
const out = process.argv[2] || '/tmp/rec', VW = +(process.argv[3] || 1280), VH = +(process.argv[4] || 720); fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8771/experiments/swarms/3d-atelier/index.html?rec=1'); await p.waitForFunction(() => window.MM && MM.ready(), null, { timeout: 30000 });
  await p.evaluate(() => MM.advance(0));
  const geo = await p.evaluate(() => { const r = MM.devRect(), B = MM.BANDS(), T = MM.BTNS(); const band = k => B.find(b => b.ring === k); const deg = { scale: 5, knurl: 9, tri: 6 };
    return { ox: r.left, oy: r.top, rings: Object.fromEntries(['scale', 'knurl', 'tri'].map(k => { const b = band(k); return [k, { x: b.x + b.w / 2, y: b.cy, px: deg[k] / (57.3 * .9) * b.rad }]; })), sel: T.find(t => t.id === 'select'), hold: T.find(t => t.id === 'hold') }; });
  const P = (x, y) => ({ x: geo.ox + x, y: geo.oy + y });
  const acts = S.expand(S.PLAY); let ai = 0, dragRing = null, dragY = 0, lastDetent = -9, tapUp = null; const N = Math.round(S.DURATION * 30), inputLog = [];
  async function release() { if (dragRing) { await p.mouse.up(); dragRing = null; } if (tapUp) { await p.mouse.up(); tapUp = null; } }
  for (let f = 0; f < N; f++) { const t = f / 30;
    if (tapUp && t >= tapUp.t) { await p.mouse.up(); tapUp = null; }
    if (dragRing && t - lastDetent > .2 && !(ai < acts.length && acts[ai][1] === 'turn' && acts[ai][2] === dragRing && acts[ai][0] - t < .25)) { await p.mouse.up(); dragRing = null; }
    while (ai < acts.length && acts[ai][0] <= t) { const a = acts[ai++]; inputLog.push([+t.toFixed(3), a[1], a[2] || '', a[3] || '']);
      if (a[1] === 'sel' || a[1] === 'hold') { await release(); const bt = a[1] === 'sel' ? geo.sel : geo.hold, q = P(bt.x, bt.y); await p.mouse.move(q.x, q.y); await p.mouse.down(); tapUp = { t: t + .1 }; }
      else { const g = geo.rings[a[2]]; if (dragRing !== a[2]) { await release(); dragRing = a[2]; dragY = g.y; const q = P(g.x, dragY); await p.mouse.move(q.x, q.y); await p.mouse.down(); }
        dragY -= a[3] * g.px * 1.0001; const q = P(g.x, dragY); await p.mouse.move(q.x, q.y); lastDetent = t; } }
    await p.evaluate(() => MM.advance(1 / 30));
    if (!process.env.NOSHOT) await p.screenshot({ path: path.join(out, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 88 });
    if (f % 60 === 0) console.log('frame', f, '/', N); }
  await release();
  const au = await p.evaluate(d => MM.renderAudio(0, d), S.DURATION); fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(au.b64, 'base64'));
  const tr = await p.evaluate(() => MM.traceOut()); tr.recording = { viewport: { width: VW, height: VH }, input: 'Playwright mouse events on the device canvas (drags on rings, presses on SELECT and HOLD)', frames: N, fps: 30, inputLog, audioPeak: au.peak, deviceGrains: au.grains, pageErrors: errs };
  fs.writeFileSync(path.join(__dirname, '..', VW > VH ? 'trace.json' : 'trace-mobile.json'), JSON.stringify(tr, null, 1));
  console.log('frames', N, 'errors', errs.length, errs.slice(0, 3).join(' | '), 'final', JSON.stringify(tr.final)); await b.close(); })();
