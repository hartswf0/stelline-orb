/* record.js — films the game with Playwright, driving the device with real pointer input (mouse for the proof, touch for the phone playtest).
   The page runs on a virtual clock (?rec=1): each frame is advanced exactly 1/30 s, then screenshotted; the sound is the page's own
   event log rendered offline through the same play() code. Needs a local server at the repo root: python3 -m http.server 8765
   Usage: node record.js proof|mobile <outdir-for-frames>   then encode with ffmpeg (see README). */
'use strict';
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), S = require('./scenarios.js');
const mode = process.argv[2] || 'proof', out = process.argv[3] || '/tmp/rec'; fs.mkdirSync(out, { recursive: true });
const CFG = mode === 'mobile' ? { vp: { width: 390, height: 844 }, sc: 'impatient', dur: 32, touch: true } : { vp: { width: 1280, height: 720 }, sc: 'earned', dur: 27, touch: false };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: CFG.vp, deviceScaleFactor: 1, hasTouch: CFG.touch, isMobile: CFG.touch }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/experiments/swarms/state/index.html?rec=1'); await p.waitForFunction(() => window.MM && MM.ready(), null, { timeout: 30000 });
  await p.evaluate(() => MM.advance(0));
  const cdp = CFG.touch ? await ctx.newCDPSession(p) : null;
  const geo = await p.evaluate(() => { const r = MM.devRect(), B = MM.BANDS(), T = MM.BTNS(); const band = k => B.find(b => b.ring === k);
    return { ox: r.left, oy: r.top, rings: Object.fromEntries(['scale', 'knurl', 'tri'].map(k => { const b = band(k); return [k, { x: b.x + b.w / 2, y: b.cy, px: MM.RV[k].deg / (57.3 * .9) * b.rad }]; })), sel: T.find(t => t.id === 'select'), hold: T.find(t => t.id === 'hold') }; });
  const P = (x, y) => ({ x: geo.ox + x, y: geo.oy + y });
  async function down(x, y) { if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); else { await p.mouse.move(x, y); await p.mouse.down(); } }
  async function move(x, y) { if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); else await p.mouse.move(x, y); }
  async function upp(x, y) { if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await p.mouse.up(); }
  const acts = S.expand(S[CFG.sc].script); let ai = 0, dragRing = null, dragY = 0, lastDetent = -9, tapUp = null;
  const N = Math.round(CFG.dur * 30), inputLog = [];
  for (let f = 0; f < N; f++) { const t = f / 30;
    if (tapUp && t >= tapUp.t) { await upp(tapUp.x, tapUp.y); tapUp = null; }
    if (dragRing && t - lastDetent > 0.2 && !(ai < acts.length && acts[ai][1] === 'turn' && acts[ai][2] === dragRing && acts[ai][0] - t < 0.25)) { const g = geo.rings[dragRing], q = P(g.x, dragY); await upp(q.x, q.y); dragRing = null; }
    while (ai < acts.length && acts[ai][0] <= t) { const a = acts[ai++]; inputLog.push([+t.toFixed(3), a[1], a[2] || '', a[3] || '']);
      if (tapUp && a[1] !== 'turn') { await upp(tapUp.x, tapUp.y); tapUp = null; }
      if (a[1] === 'sel') { if (dragRing) { const g = geo.rings[dragRing], q = P(g.x, dragY); await upp(q.x, q.y); dragRing = null; } const q = P(geo.sel.x, geo.sel.y); await down(q.x, q.y); tapUp = { t: t + 0.1, ...q }; }
      else if (a[1] === 'hold' || a[1] === 'long') { if (dragRing) { const g = geo.rings[dragRing], q = P(g.x, dragY); await upp(q.x, q.y); dragRing = null; } const q = P(geo.hold.x, geo.hold.y); await down(q.x, q.y); tapUp = { t: t + (a[1] === 'long' ? 0.9 : 0.1), ...q }; }
      else if (a[1] === 'turn') { const g = geo.rings[a[2]]; if (dragRing !== a[2]) { if (dragRing) { const h = geo.rings[dragRing], q = P(h.x, dragY); await upp(q.x, q.y); } dragRing = a[2]; dragY = g.y; const q = P(g.x, dragY); await down(q.x, q.y); }
        dragY -= a[3] * g.px * 1.0001; const q = P(g.x, dragY); await move(q.x, q.y); lastDetent = t; } }
    await p.evaluate(() => MM.advance(1 / 30));
    await p.screenshot({ path: path.join(out, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 88 }); }
  if (dragRing) await upp(0, 0);
  const au = await p.evaluate(d => MM.renderAudio(0, d), CFG.dur); fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(au.b64, 'base64'));
  const tr = await p.evaluate(() => MM.traceOut()); tr.recording = { mode, viewport: CFG.vp, input: CFG.touch ? 'CDP touch events on the device canvas' : 'mouse pointer events on the device canvas', scenario: CFG.sc, inputLog, audioPeak: au.peak };
  fs.writeFileSync(path.join(__dirname, mode === 'mobile' ? 'mobile-trace.json' : 'proof-trace.json'), JSON.stringify(tr));
  console.log('frames', N, 'errors', errs.length, errs.slice(0, 3).join(' | '), 'transitions', tr.transitions.map(t => `${t.t}:${t.to}`).join(' '));
  await b.close(); })();
