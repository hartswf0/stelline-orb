// AUDIT probe: load a page at a viewport, enumerate its controls, actuate each, and measure whether the view visibly changes.
// usage: node probe.js <url> <name> <w> <h> <outdir> [maxControls]
// Writes <outdir>/<name>-<w>x<h>.json. Read-only with respect to the page source.
const { chromium } = require('playwright');
const fs = require('fs');
const [, , URL0, NAME, W, H, OUT, MAXC] = process.argv;
const VW = +W, VH = +H, MAX = +(MAXC || 60);

const INIT = () => {
  window.__audit = { audioStarts: 0, mediaPlays: 0, msgListeners: 0, keyListeners: 0, rafs: 0 };
  try { const S = AudioScheduledSourceNode.prototype.start; AudioScheduledSourceNode.prototype.start = function () { window.__audit.audioStarts++; return S.apply(this, arguments); }; } catch (e) { }
  try { const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__audit.mediaPlays++; return P.apply(this, arguments); }; } catch (e) { }
  const AEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t) { if (t === 'message' && (this === window)) window.__audit.msgListeners++; if (/^key/.test(t)) window.__audit.keyListeners++; return AEL.apply(this, arguments); };
};

// enumerate visible-ish controls in document order, tagging each with data-audit-id
const ENUM = () => {
  const out = []; let id = 0;
  const sel = 'button,a[href],input,select,textarea,summary,[role=button],[role=tab],[role=slider],[onclick],[tabindex]:not([tabindex="-1"]),label[for]';
  const set = new Set(document.querySelectorAll(sel));
  // elements whose computed cursor is pointer (custom controls built from divs)
  for (const el of document.querySelectorAll('div,span,li,svg,g,path,circle,rect,canvas,p,img')) { const cs = getComputedStyle(el); if (cs.cursor === 'pointer' && !(el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer')) set.add(el); }
  for (const el of set) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    if (el.tagName === 'INPUT' && el.type === 'hidden') continue;
    if (el.tagName === 'LABEL' && el.htmlFor && document.getElementById(el.htmlFor)) continue;
    el.setAttribute('data-audit-id', ++id);
    const txt = (el.getAttribute('aria-label') || el.innerText || el.value || el.title || el.getAttribute('alt') || el.id || el.className || '').toString().replace(/\s+/g, ' ').trim().slice(0, 48);
    out.push({ id, tag: el.tagName.toLowerCase(), type: el.type || '', label: txt, href: el.tagName === 'A' ? el.getAttribute('href') : null,
      x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), inView: r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0,
      font: parseFloat(cs.fontSize), min: el.min, max: el.max, opts: el.tagName === 'SELECT' ? el.options.length : 0 });
  }
  return out;
};

// the view: the largest canvas / video / svg / img visible in the first viewport
const VIEW = () => {
  let best = null, ba = 0;
  for (const el of document.querySelectorAll('canvas,video,svg,img,iframe')) { const r = el.getBoundingClientRect(); const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(innerWidth, r.right), y1 = Math.min(innerHeight, r.bottom);
    const a = Math.max(0, x1 - x0) * Math.max(0, y1 - y0); if (a > ba) { ba = a; best = { tag: el.tagName.toLowerCase(), id: el.id, x: x0, y: y0, w: x1 - x0, h: y1 - y0, cls: (el.className && el.className.baseVal != null ? el.className.baseVal : el.className) || '' }; } }
  return best;
};

const LEGIBLE = () => {
  let small = 0, tiny = 0, total = 0, samples = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); if (r.width < 1 || cs.display === 'none' || cs.visibility === 'hidden') continue;
    total++; const f = parseFloat(cs.fontSize); if (f < 12) small++; if (f < 10) { tiny++; if (samples.length < 6) samples.push(f + 'px "' + n.textContent.trim().slice(0, 30) + '"'); } }
  return { textNodes: total, under12px: small, under10px: tiny, samples };
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1, hasTouch: VW < 600, isMobile: VW < 600 });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage();
  const helper = await ctx.newPage();
  await helper.setContent('<canvas id=c></canvas>');
  const errors = [], warns = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e.message).slice(0, 200)));
  page.on('requestfailed', r => errors.push('REQFAIL ' + r.url().slice(-80)));
  page.on('dialog', d => d.dismiss().catch(() => { }));
  const t0 = Date.now();
  await page.goto(URL0, { waitUntil: 'load', timeout: 45000 }).catch(e => errors.push('GOTO ' + e.message.slice(0, 100)));
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(3000);
  const R = { url: URL0, name: NAME, viewport: [VW, VH], loadMs };
  R.scroll = await page.evaluate(() => ({ docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, vh: innerHeight, vw: innerWidth, overflowY: getComputedStyle(document.body).overflowY }));
  R.pageScrolls = R.scroll.docH > R.scroll.vh + 2; R.hScroll = R.scroll.docW > R.scroll.vw + 2;
  R.view = await page.evaluate(VIEW);
  R.legibility = await page.evaluate(LEGIBLE);
  R.globals = await page.evaluate(() => Object.keys(window).filter(k => /^[A-Z][A-Z0-9_]{1,}$/.test(k) && typeof window[k] === 'object' && window[k] && k !== 'THREE').slice(0, 30));
  const controls = await page.evaluate(ENUM);
  R.controlCount = controls.length;
  R.smallTargets = controls.filter(c => c.w < 32 || c.h < 32).length;
  R.offscreen = controls.filter(c => !c.inView).length;

  const V = R.view || { x: 0, y: 0, w: VW, h: VH };
  const clip = { x: Math.round(V.x), y: Math.round(V.y), width: Math.max(8, Math.round(V.w)), height: Math.max(8, Math.round(V.h)) };
  async function shot() { await page.evaluate(() => scrollTo(0, 0)).catch(() => { }); const b = await page.screenshot({ clip, type: 'png', timeout: 8000 }).catch(() => null); return b; }
  async function diff(a, b) { if (!a || !b) return null; return helper.evaluate(async ([A, B]) => {
      const load = async s => { const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob()); const c = new OffscreenCanvas(96, Math.max(8, Math.round(96 * bm.height / bm.width))); const x = c.getContext('2d'); x.drawImage(bm, 0, 0, c.width, c.height); return x.getImageData(0, 0, c.width, c.height).data; };
      const p = await load(A), q = await load(B); let s = 0, n = 0, ch = 0; for (let i = 0; i < p.length; i += 4) { const d = (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2])) / 3; s += d; n++; if (d > 12) ch++; }
      return { mean: +(s / n).toFixed(2), changedFrac: +(ch / n).toFixed(4) }; }, [a.toString('base64'), b.toString('base64')]); }
  // idle baseline: how much the view changes by itself in ~100 ms and ~1 s
  const idle = [];
  for (let k = 0; k < 3; k++) { const a = await shot(); const tA = Date.now(); await page.waitForTimeout(60); const b = await shot(); const tB = Date.now() - tA; await page.waitForTimeout(900); const c = await shot(); idle.push({ d100: await diff(a, b), d1s: await diff(a, c), ms: tB }); }
  R.idle = idle;
  const idle100 = Math.max(...idle.map(i => i.d100 ? i.d100.changedFrac : 0)), idle1s = Math.max(...idle.map(i => i.d1s ? i.d1s.changedFrac : 0));
  R.idleMax = { d100: idle100, d1s: idle1s };

  const audit = async () => page.evaluate(() => Object.assign({}, window.__audit)).catch(() => ({}));
  const results = [];
  const startURL = page.url();
  for (const c of controls.slice(0, MAX)) {
    const res = { id: c.id, tag: c.tag, type: c.type, label: c.label, box: [c.x, c.y, c.w, c.h], inView: c.inView, font: c.font };
    if (c.tag === 'a' && c.href && !/^#|^javascript:/.test(c.href)) { res.action = 'link (not followed)'; res.href = c.href; results.push(res); continue; }
    const a0 = await audit(); const before = await shot(); const errN = errors.length; const tA = Date.now();
    try {
      const loc = page.locator('[data-audit-id="' + c.id + '"]');
      if (c.tag === 'input' && c.type === 'range') { res.action = 'range to max then min'; await loc.evaluate(el => { el.value = el.value == el.max ? el.min : el.max; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); }
      else if (c.tag === 'select') { res.action = 'select next option'; await loc.evaluate(el => { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); }
      else if ((c.tag === 'input' && /text|search|number|^$/.test(c.type)) || c.tag === 'textarea') { res.action = 'type + Enter'; await loc.fill(c.type === 'number' ? '7' : 'candles 7', { timeout: 1500 }); await loc.press('Enter', { timeout: 1500 }); }
      else if (c.tag === 'input' && c.type === 'file') { res.action = 'file input (skipped)'; results.push(res); continue; }
      else if (c.tag === 'canvas') { res.action = 'tap centre + drag'; const bb = await loc.boundingBox(); if (bb) { const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2; await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + 60, cy + 20, { steps: 4 }); await page.mouse.up(); } }
      else { res.action = 'click'; await loc.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => { }); await loc.click({ timeout: 2000, force: true }); }
    } catch (e) { res.error = 'actuate: ' + e.message.split('\n')[0].slice(0, 100); }
    const tAct = Date.now() - tA;
    const s100 = await shot(); const t100 = Date.now() - tA; await page.waitForTimeout(Math.max(0, 1000 - (Date.now() - tA))); const s1 = await shot();
    res.actMs = tAct; res.firstShotMs = t100;
    res.d100 = await diff(before, s100); res.d1s = await diff(before, s1);
    const a1 = await audit(); res.sound = (a1.audioStarts || 0) - (a0.audioStarts || 0) + (a1.mediaPlays || 0) - (a0.mediaPlays || 0);
    res.newErrors = errors.slice(errN);
    const f100 = res.d100 ? res.d100.changedFrac : 0, f1 = res.d1s ? res.d1s.changedFrac : 0;
    res.visible100 = f100 > Math.max(0.01, idle100 * 1.5 + 0.005);
    res.visible1s = f1 > Math.max(0.01, idle1s * 1.5 + 0.005);
    res.authority = res.visible100 || res.visible1s;
    // the page may have navigated or opened a modal; return to the page if so
    if (page.url() !== startURL && page.url().split('#')[0] !== startURL.split('#')[0]) { res.navigatedTo = page.url(); await page.goto(startURL, { waitUntil: 'load' }).catch(() => { }); await page.waitForTimeout(1500); await page.evaluate(ENUM); }
    await page.keyboard.press('Escape').catch(() => { });
    results.push(res);
  }
  R.results = results;
  R.tested = results.filter(r => r.d100).length;
  R.noAuthority = results.filter(r => r.d100 && !r.authority).map(r => r.id + ' ' + r.tag + ' "' + r.label + '"');
  R.authority100 = results.filter(r => r.visible100).length; R.authority1s = results.filter(r => r.authority).length;
  R.errors = errors.slice(0, 40); R.errorCount = errors.length;
  R.finalAudit = await audit();
  fs.writeFileSync(OUT + '/' + NAME + '-' + VW + 'x' + VH + '.json', JSON.stringify(R, null, 1));
  console.log(NAME, VW + 'x' + VH, 'controls', R.controlCount, 'tested', R.tested, 'auth100', R.authority100, 'auth1s', R.authority1s, 'scroll', R.pageScrolls, 'errors', R.errorCount, 'idle', JSON.stringify(R.idleMax), 'view', R.view && (R.view.tag + '#' + R.view.id + ' ' + Math.round(R.view.w) + 'x' + Math.round(R.view.h)));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
