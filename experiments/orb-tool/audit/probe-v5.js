// AUDIT probe for hand-orb-v5.html: actuate each ring and button at its exact place on the device (ORB.toPage), as a finger would,
// and measure the scene canvas before/after. usage: node probe-v5.js <url> <w> <h> <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
const [, , URL0, W, H, OUT] = process.argv; const VW = +W, VH = +H;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  await ctx.route(u => !/^http:\/\/127\.0\.0\.1/.test(u.href), r => r.abort());
  const page = await ctx.newPage(), helper = await ctx.newPage(); await helper.setContent('<p>');
  const errors = []; page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
  await page.goto(URL0, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForFunction(() => window.CORE && CORE.ST.atlas && window.ORB && ORB.M, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { CORE.ST.playing = false; }); // hold the film still so the idle baseline measures nothing but the input
  const sc = await page.evaluate(() => { const r = document.getElementById('scene').getBoundingClientRect(), o = document.getElementById('orb').getBoundingClientRect(); return { s: [r.left, r.top, r.width, r.height], o: [o.left, o.top, o.width, o.height], rot: ORB.M.rot }; });
  const clip = { x: Math.round(sc.s[0]), y: Math.round(sc.s[1]), width: Math.round(sc.s[2]), height: Math.round(sc.s[3]) };
  const oclip = { x: Math.round(sc.o[0]), y: Math.round(sc.o[1]), width: Math.round(sc.o[2]), height: Math.round(Math.min(sc.o[3], VH - sc.o[1])) };
  const shot = c => page.screenshot({ clip: c || clip, type: 'png' }).catch(() => null);
  const diff = (a, b) => (!a || !b) ? null : helper.evaluate(async ([A, B]) => { const load = async s => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(96, Math.max(8, Math.round(96 * bm.height / bm.width))); const x = c.getContext('2d'); x.drawImage(bm, 0, 0, c.width, c.height); return x.getImageData(0, 0, c.width, c.height).data; };
    const p = await load(A), q = await load(B); let ch = 0, n = 0; for (let i = 0; i < p.length; i += 4) { n++; if ((Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2])) / 3 > 12) ch++; } return +(ch / n).toFixed(4); }, [a.toString('base64'), b.toString('base64')]);
  const idle = []; for (let k = 0; k < 2; k++) { const a = await shot(); await page.waitForTimeout(60); const b = await shot(); await page.waitForTimeout(900); const c = await shot(); idle.push([await diff(a, b), await diff(a, c)]); }
  const i100 = Math.max(...idle.map(x => x[0] || 0)), i1 = Math.max(...idle.map(x => x[1] || 0));
  const geo = await page.evaluate(() => ({ rings: [0, 1, 2, 3, 4].map(i => ({ c: ORB.toPage(ORB.ringX(i), 150), up: ORB.toPage(ORB.ringX(i), 150 - 60), title: CORE.ringDefs()[i] && CORE.ringDefs()[i].title })), btns: Object.entries(ORB.btn).map(([k, b]) => ({ k, c: ORB.toPage(b.cx, b.cy), r: b.r * ORB.M.s / ORB.M.dpr })) }));
  const out = [];
  async function measure(label, act, extra) { const a = await shot(), da = await shot(oclip); const st0 = await page.evaluate(() => JSON.stringify([CORE.ST.mode, CORE.ST.t, CORE.ST.part, CORE.ST.spread, CORE.ST.view, CORE.ST.light, CORE.ST.build.sel])); const t0 = Date.now(); await act(); const b = await shot(); const tb = Date.now() - t0; await page.waitForTimeout(Math.max(0, 1000 - (Date.now() - t0))); const c = await shot(), dc = await shot(oclip);
    const st1 = await page.evaluate(() => JSON.stringify([CORE.ST.mode, CORE.ST.t, CORE.ST.part, CORE.ST.spread, CORE.ST.view, CORE.ST.light, CORE.ST.build.sel]));
    const d100 = await diff(a, b), d1 = await diff(a, c), dd = await diff(da, dc); out.push(Object.assign({ label, firstShotMs: tb, d100, d1s: d1, deviceDiff: dd, stateChanged: st0 !== st1, visible100: d100 > Math.max(.01, i100 * 1.5 + .005), visible1s: d1 > Math.max(.01, i1 * 1.5 + .005) }, extra || {})); }
  const drag = async (p, q) => { await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.move(q[0], q[1], { steps: 8 }); await page.mouse.up(); };
  for (const phase of ['watch', 'build']) {
    if (phase === 'build') await page.evaluate(() => CORE.press('birthday'));
    for (let i = 0; i < 5; i++) { const g = geo.rings[i]; await measure(phase + ': drag ring ' + (i + 1) + ' (' + (g.title || '') + ')', () => drag(g.c, g.up), { tsz: null }); }
    if (phase === 'watch') for (const b of geo.btns) { await measure('tap button ' + b.k, async () => { await page.mouse.click(b.c[0], b.c[1]); }, { targetPx: Math.round(b.r * 2) }); await page.evaluate(() => { CORE.press('watch'); CORE.ST.playing = false; }); }
  }
  // the scene canvas itself: drag to swing, tap to pick
  const cx = clip.x + clip.width / 2, cy = clip.y + clip.height / 2;
  await measure('scene: drag', () => drag([cx, cy], [cx + 80, cy + 10]));
  await measure('scene: tap', async () => { await page.mouse.click(cx - 30, cy); });
  const ringPx = await page.evaluate(() => { const M = ORB.M; return { ringWidthsPx: ORB.RINGS.map(([a, b]) => Math.round((b - a) * M.s / M.dpr)), labelPx: +(12.5 * M.s / M.dpr).toFixed(1), smallLabelPx: +(9 * M.s / M.dpr).toFixed(1), scale: +(M.s / M.dpr).toFixed(3), rotated: !!M.rot }; });
  const R = { url: URL0, viewport: [VW, VH], scene: sc, idle: { d100: i100, d1s: i1 }, device: ringPx, results: out, errors: errors.slice(0, 10) };
  fs.writeFileSync(OUT + '/v5input-' + VW + 'x' + VH + '.json', JSON.stringify(R, null, 1));
  console.log('V5', VW + 'x' + VH, 'actions', out.length, 'scene<=~100ms', out.filter(r => r.visible100).length, 'scene<=1s', out.filter(r => r.visible100 || r.visible1s).length, 'stateChanged', out.filter(r => r.stateChanged).length, JSON.stringify(ringPx));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
