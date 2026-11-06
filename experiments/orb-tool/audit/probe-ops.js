// AUDIT probe 2: call each page's own operations through its script handle (FORGE / CORE / MM / STAGE) from its starting state,
// and measure whether the view changes. Separates "the op has no visible consequence" from "the input never reaches the op".
// usage: node probe-ops.js <url> <name> <w> <h> <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
const [, , URL0, NAME, W, H, OUT] = process.argv;
const VW = +W, VH = +H;

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  await ctx.route(u => !/^http:\/\/127\.0\.0\.1/.test(u.href), r => r.abort());
  const page = await ctx.newPage(), helper = await ctx.newPage(); await helper.setContent('<p>');
  const errors = []; page.on('pageerror', e => errors.push(String(e.message).slice(0, 160))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await page.goto(URL0, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 90000 }).catch(() => errors.push('not complete'));
  await page.waitForTimeout(3500);
  const view = await page.evaluate(() => { let best = null, ba = 0; for (const el of document.querySelectorAll('canvas,video')) { const r = el.getBoundingClientRect(); const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(innerWidth, r.right), y1 = Math.min(innerHeight, r.bottom), a = Math.max(0, x1 - x0) * Math.max(0, y1 - y0); if (a > ba) { ba = a; best = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, id: el.id }; } } return best; });
  const clip = { x: Math.round(view.x), y: Math.round(view.y), width: Math.round(view.w), height: Math.round(view.h) };
  const shot = () => page.screenshot({ clip, type: 'png' }).catch(() => null);
  const diff = (a, b) => (!a || !b) ? null : helper.evaluate(async ([A, B]) => { const load = async s => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(96, Math.max(8, Math.round(96 * bm.height / bm.width))); const x = c.getContext('2d'); x.drawImage(bm, 0, 0, c.width, c.height); return x.getImageData(0, 0, c.width, c.height).data; };
    const p = await load(A), q = await load(B); let ch = 0, n = 0; for (let i = 0; i < p.length; i += 4) { n++; if ((Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2])) / 3 > 12) ch++; } return +(ch / n).toFixed(4); }, [a.toString('base64'), b.toString('base64')]);
  // idle
  const idle = []; for (let k = 0; k < 3; k++) { const a = await shot(); await page.waitForTimeout(60); const b = await shot(); await page.waitForTimeout(900); const c = await shot(); idle.push([await diff(a, b), await diff(a, c)]); }
  const i100 = Math.max(...idle.map(x => x[0] || 0)), i1 = Math.max(...idle.map(x => x[1] || 0));
  // the op list per page handle
  const plan = await page.evaluate(() => {
    const P = [];
    if (window.CORE && window.CORE.turn) { for (let i = 0; i < 5; i++) P.push({ label: 'CORE.turn(' + i + ',+2)', js: 'CORE.turn(' + i + ',2)' }); for (const side of ['left', 'right']) for (const [k] of CORE.BUTTONS[side]) P.push({ label: 'CORE.press(' + k + ')', js: 'CORE.press("' + k + '")' }); for (let i = 0; i < 5; i++) P.push({ label: 'build: CORE.turn(' + i + ',+2)', js: 'CORE.turn(' + i + ',2)', when: 'build' }); }
    else if (window.FORGE && window.FORGE.turn) { for (let i = 0; i < 5; i++) P.push({ label: 'FORGE.turn(' + i + ',+3)', js: 'FORGE.turn(' + i + ',3)' }); const B = window.FORGE.BTN ? Object.keys(window.FORGE.BTN) : ['ADD', 'ADD', 'MODE', 'MODE', 'UNDO', 'ADD', 'ADD'];
      for (const b of B) if (b !== 'KEEP' && b !== 'PAIR' && b !== 'PHONE') P.push({ label: 'FORGE.press(' + b + ')', js: 'FORGE.press("' + b + '",false)' }); for (let i = 0; i < 5; i++) P.push({ label: 'after ops: FORGE.turn(' + i + ',+3)', js: 'FORGE.turn(' + i + ',3)' }); }
    else if (window.MM) { for (let i = 0; i < 3; i++) P.push({ label: 'MM.handTurn(ring' + i + ', 3 detents)', js: 'MM.handTurn(MM.RINGS[' + i + '], MM.RINGS[' + i + '].deg*3)' }); P.push({ label: 'MM.select(next)', js: 'MM.select(MM.S.target+1)' }); for (let i = 0; i < 3; i++) P.push({ label: 'after select: MM.handTurn(ring' + i + ', 3)', js: 'MM.handTurn(MM.RINGS[' + i + '], MM.RINGS[' + i + '].deg*3)' }); P.push({ label: 'MM.toggleHold()', js: 'MM.toggleHold()' }); P.push({ label: 'MM.switchOff()', js: 'MM.switchOff()' }); }
    else if (window.STAGE) { for (let i = 0; i < 5; i++) P.push({ label: 'STAGE.ring(' + i + ',+3)', js: 'STAGE.ring(' + i + ',3)' }); }
    return P; });
  const res = [];
  for (const p of plan) {
    if (p.when === 'build') await page.evaluate(() => { if (CORE.ST.mode !== 'build') CORE.press('birthday'); }).catch(() => { });
    const a = await shot(); const t0 = Date.now(); let err = null; await page.evaluate(js => { try { (0, eval)(js); return null; } catch (e) { return e.message; } }, p.js).then(e => err = e);
    const b = await shot(); const tb = Date.now() - t0; await page.waitForTimeout(Math.max(0, 1000 - (Date.now() - t0))); const c = await shot();
    const d100 = await diff(a, b), d1 = await diff(a, c);
    res.push({ op: p.label, err, firstShotMs: tb, d100, d1s: d1, visible100: d100 > Math.max(.01, i100 * 1.5 + .005), visible1s: d1 > Math.max(.01, i1 * 1.5 + .005) });
  }
  const R = { url: URL0, name: NAME, viewport: [VW, VH], view, idle: { d100: i100, d1s: i1 }, ops: res, errors: errors.slice(0, 20), handle: plan.length ? plan[0].label.split('.')[0] : 'none' };
  fs.writeFileSync(OUT + '/ops-' + NAME + '-' + VW + 'x' + VH + '.json', JSON.stringify(R, null, 1));
  console.log('OPS', NAME, VW + 'x' + VH, 'handle', R.handle, 'ops', res.length, 'visible<=~100ms', res.filter(r => r.visible100).length, 'visible<=1s', res.filter(r => r.visible100 || r.visible1s).length, 'idle', i100, i1);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
