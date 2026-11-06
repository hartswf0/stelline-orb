// AUDIT static probe: no actuation. For each page and viewport: load time, page scroll, DOM controls, small text, small targets,
// frame interval, script handles on window, console errors split into environment (blocked network) and page.
// usage: node probe-static.js <base> <outfile>
const { chromium } = require('playwright');
const fs = require('fs');
const [, , BASE, OUTF] = process.argv;
const PAGES = ['hand-orb-v5.html', 'maker.html', 'stage.html', 'weaver.html', 'studio.html', 'film.html', 'ana/index.html', 'cineosis-orb/index.html'];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const all = [];
  for (const [w, h] of [[390, 844], [1280, 800]]) for (const p of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 600, isMobile: w < 600 });
    await ctx.route(u => !/^http:\/\/127\.0\.0\.1/.test(u.href), r => r.abort());
    const page = await ctx.newPage(); const env = [], own = [];
    page.on('console', m => { if (m.type() !== 'error') return; const t = m.text(); (/WebSocket|ERR_FAILED|ERR_INSUFFICIENT|googleapis|gstatic|net::/.test(t) ? env : own).push(t.slice(0, 140)); });
    page.on('pageerror', e => own.push('PAGEERROR ' + String(e.message).slice(0, 140)));
    const t0 = Date.now(); let ok = true;
    await page.goto(BASE + '/' + p, { waitUntil: 'commit', timeout: 60000 }).catch(() => ok = false);
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 90000 }).catch(() => ok = false);
    const loadMs = Date.now() - t0; await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const sel = 'button,a[href],input,select,textarea,[role=button],[onclick]'; const C = [...document.querySelectorAll(sel)].filter(el => { const b = el.getBoundingClientRect(), cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && !(el.type === 'hidden'); });
      const inView = C.filter(el => { const b = el.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth; });
      const small = C.filter(el => { const b = el.getBoundingClientRect(); return b.width < 44 || b.height < 44; }).length, tiny = C.filter(el => { const b = el.getBoundingClientRect(); return b.width < 24 || b.height < 24; }).length;
      let tn = 0, u12 = 0, u10 = 0, minF = 99; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (tw.nextNode()) { const n = tw.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement, cs = getComputedStyle(el), b = el.getBoundingClientRect(); if (b.width < 1 || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue; if (b.bottom < 0 || b.top > innerHeight) continue; tn++; const f = parseFloat(cs.fontSize); minF = Math.min(minF, f); if (f < 12) u12++; if (f < 10) u10++; }
      const canv = [...document.querySelectorAll('canvas')].map(c => { const b = c.getBoundingClientRect(); return [c.id || c.parentElement.id || '', Math.round(b.width), Math.round(b.height), Math.round(b.top)]; }).filter(c => c[1] * c[2] > 4000);
      const handles = ['FORGE', 'CORE', 'ORB', 'MM', 'STAGE', 'ST', 'HAND', 'SCENE', 'APP', 'PAIR', 'LINK'].filter(k => window[k]);
      return { docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, controls: C.length, controlsInView: inView.length, under44px: small, under24px: tiny, textNodesInView: tn, textUnder12px: u12, textUnder10px: u10, minFontPx: minF === 99 ? null : minF, canvases: canv, handles };
    }).catch(e => ({ err: e.message }));
    r.fps = await page.evaluate(() => new Promise(res => { const T = []; let last = performance.now(); const to = setTimeout(() => res({ framesIn15s: T.length }), 15000); function f(t) { T.push(t - last); last = t; if (T.length < 20) requestAnimationFrame(f); else { clearTimeout(to); T.sort((a, b) => a - b); res({ medianFrameMs: +T[10].toFixed(1) }); } } requestAnimationFrame(f); })).catch(() => null);
    const row = Object.assign({ page: p, viewport: [w, h], loaded: ok, loadMs, pageScrolls: r.docH > h + 2, hScroll: r.docW > w + 2, envErrors: env.length, pageErrors: own.slice(0, 6), pageErrorCount: own.length }, r);
    all.push(row); fs.writeFileSync(OUTF, JSON.stringify(all, null, 1));
    console.log('STATIC', p, w + 'x' + h, 'scroll', row.pageScrolls, 'controls', r.controls, 'inView', r.controlsInView, '<44px', r.under44px, 'text<12', r.textUnder12px + '/' + r.textNodesInView, 'minFont', r.minFontPx, 'pageErr', own.length, 'frame', JSON.stringify(r.fps), 'handles', (r.handles || []).join(','));
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
