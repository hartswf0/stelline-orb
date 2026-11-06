#!/usr/bin/env node
/* ORB TOOL agent harness (node + Playwright). Two runs, each recorded as a short film with the page's own sound:
     agent    a scripted agent builds a whole birthday through the bridge alone (tools/call: orb_describe, orb_command).
              Its policy reads describe() and does what NEXT says, with a few choices of its own (the brown dome,
              kneeling, turning, the second child half a second late).
     cowork   the agent proposes (orb_propose, orb_await_decision); a scripted hand on the device canvas answers with
              real pointer events: ACCEPT, a ring turned to adjust the ghost and then ACCEPT, a long ACCEPT to dismiss,
              and moves of its own (SELECT, the KNURL ring, MAKE, HOLD).
   Usage: node experiments/orb-tool/agent/harness.js [agent|cowork|both] [--page experiments/orb-tool/index.html] [--out DIR] [--no-film]
   Films: DIR/agent.mp4 and DIR/cowork.mp4 (default DIR is the role's scratchpad). A JSON record of each run (timings,
   every call, the final describe) is written beside them. Frames never go into the repo. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const REPO = path.resolve(__dirname, '../../..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const WHICH = (argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--page' && argv[argv.indexOf(a) - 1] !== '--out') || 'both');
const PAGE = arg('--page', 'experiments/orb-tool/index.html');
const OUT = path.resolve(arg('--out', '/tmp/claude-0/-home-claude/5dcbf124-08aa-5357-a87a-ec1f490e8f81/scratchpad/orb-tool-agent'));
const FILM = !argv.includes('--no-film');
const W = 390, H = 844;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- a static server for the repo (the page fetches its sounds and assets over http) ----
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.webp': 'image/webp' };
function serve() { return new Promise(res => { const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(REPO, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(REPO)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end('not found'); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
  srv.listen(0, '127.0.0.1', () => res(srv)); }); }

// ---- in the page before anything runs: tap every sound the page makes into a recorder, and draw the hand's finger ----
const INIT = () => {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  window.__tap = { chunks: [], t0: null, rec: null };
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = orig.call(this, dest, ...rest);
    try { if (dest && dest === this.context.destination) { const c = this.context;
      if (!c.__tapDest) { c.__tapDest = c.createMediaStreamDestination(); const rec = new MediaRecorder(c.__tapDest.stream, { mimeType: 'audio/webm;codecs=opus' });
        rec.ondataavailable = e => { if (e.data.size) window.__tap.chunks.push(e.data); }; rec.start(250); window.__tap.rec = rec; window.__tap.t0 = performance.now(); }
      orig.call(this, c.__tapDest); } } catch (e) { }
    return r; };
  window.__finishTap = () => new Promise(res => { const T = window.__tap; if (!T || !T.rec) return res(null);
    T.rec.onstop = async () => { const b = new Blob(T.chunks, { type: 'audio/webm' }); const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); res({ b64: btoa(s), t0: T.t0 }); };
    T.rec.stop(); });
  addEventListener('DOMContentLoaded', () => { const f = document.createElement('div'); f.id = '__finger';
    f.style.cssText = 'position:fixed;left:-60px;top:-60px;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid rgba(255,244,220,.85);background:rgba(255,244,220,.18);pointer-events:none;z-index:99;transition:transform .08s';
    document.body.appendChild(f);
    for (const ev of ['pointermove', 'pointerdown']) addEventListener(ev, e => { f.style.left = e.clientX + 'px'; f.style.top = e.clientY + 'px'; f.style.transform = e.buttons ? 'scale(.8)' : 'scale(1)'; }, true);
    addEventListener('pointerup', () => { f.style.transform = 'scale(1)'; }, true); });
};

// ---- page setup: make sure the agent side is loaded and mounted (the shell may already have done it) ----
async function prepare(page) {
  await page.waitForFunction(() => window.ORB && typeof window.ORB.do === 'function', null, { timeout: 20000 });
  await page.waitForFunction(() => !!window.ORB.renderer || !!window.ORB_DESCRIBE, null, { timeout: 30000 }).catch(() => { });
  for (const f of ['commands.js', 'describe.js', 'bridge.js', 'console.js']) {
    const g = { 'commands.js': 'ORB_COMMANDS', 'describe.js': 'ORB_DESCRIBE', 'bridge.js': 'ORB_BRIDGE', 'console.js': 'ORB_CONSOLE' }[f];
    if (!await page.evaluate(g => !!window[g], g)) await page.addScriptTag({ url: '/experiments/orb-tool/agent/' + f }); }
  return page.evaluate(() => {
    ORB_DESCRIBE.install(ORB);
    if (!window.__srv) window.__srv = ORB_BRIDGE.createServer(ORB, { commands: ORB_COMMANDS });
    window.__con = window.ORB_CONSOLE_INSTANCE || window.__con || ORB_CONSOLE.mount(ORB, { focus: false });
    window.__lat = []; ORB.on('step', () => { if (window.__sent != null) { window.__lat.push(performance.now() - window.__sent); window.__sent = null; } });
    try { window.CORE_SOUND && CORE_SOUND.wake(); } catch (e) { }
    return { renderer: ORB.renderer || 'unknown', device: !!(window.ORB_DEVICE || window.DEVICE || (window.ORB && window.ORB.device)), scene: !!window.ORB_SCENE, sound: !!window.CORE_SOUND, shellConsole: !!window.ORB_CONSOLE_INSTANCE }; }); }

// one JSON-RPC call through the bridge, as an outside agent would make it; the line is also written in the drawer
let rpcId = 0;
async function call(page, name, args, show) {
  const req = { jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args || {} } };
  return page.evaluate(async ({ req, show, name }) => {
    if (show) window.__con.out(show, 'ag');
    window.__sent = performance.now();
    const r = await window.__srv.handle(req);
    const t = r.result ? r.result.content[0].text : r.error.message;
    if (show && name !== 'orb_describe') window.__con.out(t.split('\n')[0], r.result && r.result.isError ? 'err' : 'ok');
    return { text: t, isError: !!(r.result && r.result.isError) }; }, { req, show, name }); }

// ---- the scripted hand: real pointer events on the device canvas ----
async function deviceHandle(page) {
  return page.evaluate(() => { const D = window.ORB_DEVICE || window.DEVICE || (window.ORB && window.ORB.device); if (!D || !D.toPage) return null;
    const btn = {}; for (const k in D.BTN) btn[k] = D.toPage(D.BTN[k].cx, D.BTN[k].cy);
    const rings = [0, 1, 2, 3].map(i => ({ mid: D.toPage(D.ringX(i), (D.BODY[0] + D.BODY[1]) / 2), step: D.toPage(D.ringX(i), (D.BODY[0] + D.BODY[1]) / 2 + 22)[1] - D.toPage(D.ringX(i), (D.BODY[0] + D.BODY[1]) / 2)[1] }));
    return { btn, rings }; }); }
async function glide(page, x, y, ms) { const steps = Math.max(4, Math.round((ms || 300) / 16)); await page.mouse.move(x, y, { steps }); }
// a press: the finger glides there with the mouse, then pointerdown/pointerup are dispatched on the device canvas in one
// task (a short press) or 900 ms apart (a long press). Under heavy CPU load a mouse down/up pair is processed late and
// the device times it as a long press (it reads performance.now() in the handlers), so the pair is not left to the queue.
async function tap(page, dev, id, long) { const [x, y] = dev.btn[id]; await glide(page, x, y, 220);
  const fire = (type, x, y) => page.evaluate(({ type, x, y }) => { const cv = (window.ORB_DEVICE || window.DEVICE || window.ORB.device).cv;
    const o = { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, bubbles: true, cancelable: true, buttons: type === 'pointerdown' ? 1 : 0 };
    if (type === 'tap') { cv.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, { buttons: 0 }))); }
    else (type === 'pointerdown' ? cv : window).dispatchEvent(new PointerEvent(type, o)); }, { type, x, y });
  if (!long) await fire('tap', x, y); else { await fire('pointerdown', x, y); await sleep(950); await fire('pointerup', x, y); }
  await sleep(180); }
// turn a ring by about n detents: drag up for +, down for -
async function turnRing(page, dev, i, n) { const r = dev.rings[i]; const [x, y] = r.mid; await glide(page, x, y, 350); await page.mouse.down();
  const per = 54 * Math.sin(24 * Math.PI / 180); // device units per detent, as core/device.js
  const scale = await page.evaluate(() => { const D = window.ORB_DEVICE || window.DEVICE || (window.ORB && window.ORB.device); return D.M.s / D.M.dpr; });
  const dy = -(n + 0.4 * Math.sign(n)) * per * scale; const steps = Math.max(6, Math.abs(n) * 5);
  for (let k = 1; k <= steps; k++) { await page.mouse.move(x, y + dy * k / steps); await sleep(28); }
  await page.mouse.up(); await sleep(300); }

async function film(page, ctx, name, t0node) {
  const video = page.video();
  const tap = await page.evaluate(() => window.__finishTap ? window.__finishTap() : null).catch(() => null);
  const pageT0 = await page.evaluate(() => performance.timeOrigin).catch(() => null);
  await page.close(); await ctx.close();
  if (!FILM || !video) return null;
  const webm = await video.path(), mp4 = path.join(OUT, name + '.mp4');
  const a = [];
  if (tap && tap.b64) { const af = path.join(OUT, name + '-audio.webm'); fs.writeFileSync(af, Buffer.from(tap.b64, 'base64'));
    // the audio began tap.t0 ms after the page's time origin; the video began about when the page was created (t0node)
    const off = Math.max(0, ((pageT0 + tap.t0) - t0node) / 1000);
    a.push('-itsoffset', off.toFixed(3), '-i', af); }
  const args = ['-y', '-loglevel', 'error', '-i', webm].concat(a, ['-map', '0:v'], a.length ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '128k'] : [], ['-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', mp4]);
  execFileSync('ffmpeg', args);
  const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim();
  const streams = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', mp4]).toString().trim().split('\n');
  return { file: mp4, seconds: +dur.toFixed(1), audio: streams.includes('audio') }; }

async function newPage(browser, srv, q) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: +(arg('--dpr', '1')), hasTouch: false, recordVideo: FILM ? { dir: OUT, size: { width: W, height: H } } : undefined });
  await ctx.addInitScript(INIT);
  const t0 = Date.now(); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/' + PAGE + (q || ''), { waitUntil: 'load' });
  return { ctx, page, t0, errors }; }

// ================= run 1: the agent alone =================
async function runAgent(browser, srv) {
  const { ctx, page, t0, errors } = await newPage(browser, srv, '');
  const env = await prepare(page); await page.evaluate(() => { document.documentElement.style.setProperty('--orbc-h', '34dvh'); window.__con.open(); });
  await sleep(700);
  const calls = [], start = Date.now(), AUTH = 'agent:script';
  async function cmd(line) { const r = await call(page, 'orb_command', { line, author: AUTH }, AUTH + '> ' + line); calls.push({ t: Date.now() - start, line, error: r.isError ? r.text : null }); await sleep(1150); return r; }
  // the agent's own choices first, then whatever describe() says is next
  const own = ['cake target brown-dome', 'kneel 0.4', 'turn -20'];
  let d = (await call(page, 'orb_describe', {}, AUTH + '> describe')).text; calls.push({ t: Date.now() - start, line: 'describe' });
  for (const l of own) await cmd(l);
  let guard = 0, offsetDone = false;
  while (!/BLOWN/.test(d) && guard++ < 30) {
    d = (await call(page, 'orb_describe', {})).text;
    if (/BLOWN/.test(d)) break;
    const m = d.match(/NEXT: (.*)/); if (!m) break;
    let next = m[1];
    if (next === 'make' && /stage 0 of 4/.test(d)) next = 'make sponge';
    await cmd(next);
    if (!offsetDone && /child 2 arrive/.test(next)) { await cmd('child 2 later 0.5'); offsetDone = true; }
    if (/hold/.test(next)) { await sleep(800); }
  }
  await sleep(2500);
  const final = await page.evaluate(() => ({ describe: ORB.describe(), state: ORB.state(), lat: window.__lat }));
  const f = await film(page, ctx, 'agent', t0);
  return { env, seconds: (Date.now() - start) / 1000, calls, blown: final.state.time.blown, describe: final.describe, latency: stats(final.lat), errors, film: f }; }

// ================= run 2: the agent proposes, the hand answers on the device =================
async function runCowork(browser, srv) {
  const { ctx, page, t0, errors } = await newPage(browser, srv, '');
  const env = await prepare(page);
  await page.evaluate(() => { document.documentElement.style.setProperty('--orbc-h', '22dvh'); window.__con.open(); });
  const dev = await deviceHandle(page);
  if (!dev) { await page.close(); await ctx.close(); return { env, error: 'no device handle on the page (window.ORB_DEVICE with toPage/BTN/ringX)' }; }
  // the drawer must not cover the device's buttons: put it over the view instead
  await page.evaluate(() => { const e = window.__con.el; e.style.top = '0'; e.style.bottom = 'auto'; e.style.transform = 'none'; e.style.borderTop = '0'; e.style.borderBottom = '1px solid #3a3a34'; e.style.background = 'rgba(11,12,11,.82)'; });
  await sleep(600);
  const AUTH = 'agent:claude', start = Date.now(), events = [];
  const ev = (who, what) => events.push({ t: +((Date.now() - start) / 1000).toFixed(2), who, what });
  async function propose(line, note) { const r = await call(page, 'orb_propose', { line, note, author: AUTH }, AUTH + ' proposes: ' + line + (note ? ' -- ' + note : ''));
    const ids = (r.text.match(/proposed: (.*)/) || [, ''])[1].split(', ').filter(Boolean); ev('agent', 'propose ' + line + ' -> ' + (ids.join(',') || r.text)); await sleep(700); return ids; }
  const decided = async id => { const r = await call(page, 'orb_await_decision', { id, timeout_ms: 8000 }); ev('agent', r.text); await page.evaluate(t => window.__con.out(t, 'ag'), 'agent:claude sees: ' + r.text); return r.text; };
  const pending = () => page.evaluate(() => ORB.state().proposals.map(p => p.id));

  // 1. the agent sets the table and chooses the cake; the person accepts both
  let ids = await propose('table up; cake target brown-dome', 'the film\'s table, and her brown dome');
  for (const id of ids) { await tap(page, dev, 'accept'); ev('hand', 'ACCEPT'); await decided(id); }
  // 2. the person makes the cake on the device: MAKE four times
  for (let k = 0; k < 4; k++) { await tap(page, dev, 'make'); ev('hand', 'MAKE'); await sleep(450); }
  // 3. the agent proposes kneeling at 4; the person turns the KNEEL ring two detents lower, then accepts the adjusted ghost
  ids = await propose('kneel 0.4', 'down to her height');
  await turnRing(page, dev, 1, 2); ev('hand', 'turn KNEEL +2 (amends the ghost)'); await sleep(500);
  await tap(page, dev, 'accept'); ev('hand', 'ACCEPT'); await decided(ids[0]);
  // 4. the agent proposes a turn the person does not want: a long ACCEPT dismisses it
  ids = await propose('turn 90', 'see it from the side');
  await tap(page, dev, 'accept', true); ev('hand', 'long ACCEPT (dismiss)'); await decided(ids[0]);
  // 5. the person turns the view a little on their own; the agent writes and lights (accepted)
  await turnRing(page, dev, 0, -4); ev('hand', 'turn SCALE -4');
  ids = await propose('write 生日快乐', 'the inscription, stroke by stroke'); await tap(page, dev, 'accept'); ev('hand', 'ACCEPT'); await decided(ids[0]); await sleep(1500);
  ids = await propose('candles 7', 'seven, as in the film'); await tap(page, dev, 'accept'); ev('hand', 'ACCEPT'); await decided(ids[0]);
  // 6. the children: the agent proposes all three; the second one late by half a second
  ids = await propose('children arrive', 'the three of them'); for (const id of ids) { await tap(page, dev, 'accept'); ev('hand', 'ACCEPT'); await decided(id); }
  ids = await propose('child 2 later 0.5', 'she comes in half a second after the others'); await tap(page, dev, 'accept'); ev('hand', 'ACCEPT'); await decided(ids[0]);
  // 7. the person holds the moment, then lets go: the blow
  await tap(page, dev, 'hold'); ev('hand', 'HOLD'); await sleep(1600);
  await tap(page, dev, 'hold'); ev('hand', 'HOLD again (release: the blow)'); await sleep(2600);
  const final = await page.evaluate(() => ({ describe: ORB.describe(), state: ORB.state(), hist: ORB.history(), lat: window.__lat }));
  const left = await pending();
  const f = await film(page, ctx, 'cowork', t0);
  const by = {}; for (const h of final.hist) by[h.author] = (by[h.author] || 0) + 1;
  return { env, seconds: (Date.now() - start) / 1000, events, blown: final.state.time.blown, kneel: final.state.camera.kneel, yaw: final.state.camera.yaw, pendingLeft: left, historyByAuthor: by,
    accepted: final.hist.filter(h => h.via).map(h => h.via + ' ' + h.label), describe: final.describe, errors, film: f }; }

function stats(a) { if (!a || !a.length) return null; const s = a.slice().sort((x, y) => x - y); return { n: s.length, median_ms: +s[s.length >> 1].toFixed(1), max_ms: +s[s.length - 1].toFixed(1) }; }

(async () => {
  const srv = await serve();
  const launch = () => chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let browser = await launch();
  const out = {};
  try {
    if (WHICH === 'agent' || WHICH === 'both') { out.agent = await runAgent(browser, srv); await browser.close(); browser = await launch(); console.log('agent: blown=' + out.agent.blown + ' in ' + out.agent.seconds.toFixed(1) + ' s, ' + out.agent.calls.length + ' calls' + (out.agent.film ? ', film ' + out.agent.film.file + ' ' + out.agent.film.seconds + ' s audio=' + out.agent.film.audio : '')); }
    if (WHICH === 'cowork' || WHICH === 'both') { out.cowork = await runCowork(browser, srv); console.log('cowork: ' + (out.cowork.error || ('blown=' + out.cowork.blown + ' in ' + out.cowork.seconds.toFixed(1) + ' s, kneel ' + out.cowork.kneel + ', history ' + JSON.stringify(out.cowork.historyByAuthor) + (out.cowork.film ? ', film ' + out.cowork.film.file + ' ' + out.cowork.film.seconds + ' s audio=' + out.cowork.film.audio : '')))); }
  } finally { await browser.close(); srv.close(); }
  fs.writeFileSync(path.join(OUT, 'harness-record.json'), JSON.stringify(out, null, 1));
  console.log('record: ' + path.join(OUT, 'harness-record.json'));
  for (const k in out) if (out[k].errors && out[k].errors.length) console.log(k + ' page errors: ' + out[k].errors.slice(0, 5).join(' | '));
})().catch(e => { console.error(e); process.exit(1); });
