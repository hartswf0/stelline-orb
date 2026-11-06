/* render.js — renders blind-loop candidates with headless Chromium (Playwright) through render.html.
   renderAll(cands, dir) writes dir/<id>.png at 1280x720 (the film's frame size; cropping is done by maker.js the same way as the decoys). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');   // repo root
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
function serve() { return new Promise(res => { const s = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  s.listen(0, '127.0.0.1', () => res(s)); }); }
async function renderAll(cands, dir) {
  const { chromium } = require('playwright'); const srv = await serve(), port = srv.address().port;
  const br = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  fs.mkdirSync(dir, { recursive: true }); const out = [];
  try { for (const c of cands) for (let tries = 0; tries < 3; tries++) { const pg = await br.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
      pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      await pg.route(u => !u.href.startsWith('http://127.0.0.1'), r => r.abort());
      await pg.goto(`http://127.0.0.1:${port}/experiments/blind-loop/render.html`); await pg.waitForFunction('window.READY === true');
      await pg.evaluate(C => window.go(C), c.genome);
      const f = path.join(dir, c.id + '.png'); const url = await pg.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
      fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
      const fl = await pg.evaluate(() => window.FLAMES); const ff = path.join(dir, c.id + '-flames.png'); if (fl) fs.writeFileSync(ff, Buffer.from(fl.split(',')[1], 'base64')); else if (fs.existsSync(ff)) fs.unlinkSync(ff);
      if (errs.length) console.log(c.id, 'page errors:', errs.slice(0, 3).join(' | ')); await pg.close();
      if (fs.statSync(f).size < 200000 && tries < 2) { console.log(c.id, 'came out black; rendering again'); continue; }   // a frame lost to the GPU comes out near black (about 20 KB)
      out.push(f); break; } }
  finally { await br.close(); srv.close(); }
  return out; }
module.exports = { renderAll };
