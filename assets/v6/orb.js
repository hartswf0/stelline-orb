/* The device: a lens barrel with five rings between two grip pods, drawn on a canvas. Every control lives on it: the rings,
   ten buttons on the pods, two small screens and the glass strip on top. The film tints the metal and writes the labels;
   turning a ring is the only way the film changes. The device is drawn in its own 1000 x 300 frame; on a tall screen
   the whole frame turns a quarter so the barrel runs along the long side, as when the phone is held in two hands. */
(function () {
  const { ST, ringDefs, turn, press, BUTTONS } = window.CORE;
  const DW = 1000, DH = 300, BODY = [70, 230], RX = [190, 810], RW = [92, 112, 168, 112, 92], GAP = 11;
  const RINGS = []; { let x = RX[0]; for (const w of RW) { RINGS.push([x, x + w]); x += w + GAP; } }
  const POD = { left: [4, 40, 180, 262], right: [820, 40, 996, 262] };
  const BTN = {}; for (const side of ['left', 'right']) { const [x0, y0, x1] = POD[side]; BUTTONS[side].forEach(([k, lab], i) => { const row = i < 3 ? 0 : 1, col = i < 3 ? i : i - 3, n = row ? 2 : 3;
      const cx = x0 + (x1 - x0) * (row ? (col + 1) / 3 : (col + .5) / n), cy = y0 + (row ? 192 : 140); BTN[k] = { cx, cy, r: 19, lab, side }; }); }
  const O = window.ORB = { cv: null, ctx: null, M: null, rot: 0, hot: null, held: null, down: null, disp: [0, 0, 0, 0, 0], grip: null, flash: {}, pal: null, remote: null, hide: false };
  let pend = null;
  function attach(cv, opts) { O.cv = cv; O.ctx = cv.getContext('2d'); O.opts = opts || {}; cv.addEventListener('pointerdown', pdown); addEventListener('pointermove', pmove); addEventListener('pointerup', pup); addEventListener('pointercancel', pup);
    cv.addEventListener('wheel', e => { const h = hit(e); if (h && h.ring != null) { e.preventDefault(); const R = ringDefs()[h.ring], sh = window.CORE.curShot(); act('turn', h.ring, (e.deltaY > 0 ? 1 : -1) * (R && R.scrub && sh ? 1 / sh.T + 1e-4 : R && R.disc ? 1 : .25)); } }, { passive: false });
    addEventListener('keydown', key); }
  // an action from any input: on the phone it is also sent to the scene, which holds the true state
  function act(k, ...a) { if (k === 'turn') turn(a[0], a[1], a[2]); else if (k === 'press') { O.flash[a[0]] = performance.now(); press(a[0], a[1]); } if (O.remote) O.remote({ k, a }); }
  O.act = act;
  function layout() { const cv = O.cv, dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const tall = h > w * 1.15; O.rot = tall ? 1 : 0; const L = tall ? h : w, S = tall ? w : h, s = Math.min(L / DW, S / DH) * .98 * dpr;
    const cx = cv.width / 2, cy = cv.height / 2; O.M = { s, cx, cy, rot: O.rot, dpr }; }
  function toDev(e) { const r = O.cv.getBoundingClientRect(), M = O.M; let x = (e.clientX - r.left) * M.dpr - M.cx, y = (e.clientY - r.top) * M.dpr - M.cy; if (M.rot) { const t = x; x = y; y = -t; } return [x / M.s + DW / 2, y / M.s + DH / 2]; }
  function hit(e) { const [x, y] = toDev(e); return hitAt(x, y); }
  function hitAt(x, y) { { const [x0, y0, x1] = POD.left; if (x >= x0 + 12 && x <= x1 - 12 && y >= y0 + 14 && y <= y0 + 90) return { lcd: 'left' }; }
    for (const k in BTN) { const b = BTN[k]; if (Math.hypot(x - b.cx, y - b.cy) < b.r + 6) return { btn: k }; }
    for (let i = 0; i < 5; i++) if (x >= RINGS[i][0] - 4 && x <= RINGS[i][1] + 4 && y >= BODY[0] - 30 && y <= BODY[1] + 30) return { ring: i, x, y }; return null; }
  O.hitAt = hitAt; O.ringX = i => (RINGS[i][0] + RINGS[i][1]) / 2; O.btn = BTN; O.RINGS = RINGS; O.BODY = BODY; O.DW = DW; O.DH = DH;
  // device frame -> page pixels (for hands and tests)
  O.toPage = (x, y) => { const M = O.M, r = O.cv.getBoundingClientRect(); let u = (x - DW / 2) * M.s, v = (y - DH / 2) * M.s; if (M.rot) { const t = u; u = -v; v = t; } return [(u + M.cx) / M.dpr + r.left, (v + M.cy) / M.dpr + r.top]; };
  O.fromPage = (px, py) => toDev({ clientX: px, clientY: py });
  function pdown(e) { const h = hit(e); if (!h) return; e.preventDefault(); O.cv.setPointerCapture && O.cv.setPointerCapture(e.pointerId);
    if (h.lcd) { O.onLcd && O.onLcd(h.lcd); return; }
    if (h.btn) { O.held = { btn: h.btn, at: performance.now(), long: false }; return; }
    const [x, y] = toDev(e); O.down = { ring: h.ring, y, acc: 0, moved: 0 }; ST.ring = h.ring; window.CORE.touch('select ring'); }
  function pmove(e) { if (O.down) { const [, y] = toDev(e), d = y - O.down.y; O.down.y = y; O.down.moved += Math.abs(d); const R = ringDefs()[O.down.ring]; if (!R) return;
      // the label under the finger stays under it: one label step is 24 degrees of the barrel
      const step = (80 * Math.sin(24 * Math.PI / 180)); O.down.acc += -d / step; if (R.disc) { const k = O.down.acc > 0 ? Math.floor(O.down.acc) : Math.ceil(O.down.acc); if (k) { O.down.acc -= k; act('turn', O.down.ring, k, 'drag'); } }
      else { act('turn', O.down.ring, O.down.acc, 'drag'); O.down.acc = 0; } }
    else { const h = O.cv && hit(e); const nh = h ? (h.btn || h.lcd || 'r' + h.ring) : null; if (nh !== O.hot) { O.hot = nh; O.cv.style.cursor = h ? (h.btn || h.lcd ? 'pointer' : 'ns-resize') : 'default'; } } }
  function pup(e) { if (O.held) { const H = O.held; O.held = null; act('press', H.btn, H.long); } if (O.down) settle(O.down.ring); O.down = null; }
  function settle(i) { const R = ringDefs()[i]; if (!R || !R.scrub) return; const v = R.get(), r = Math.round(v); if (Math.abs(v - r) < .06) window.CORE.setRing(i, r); }
  O.settle = settle;
  function key(e) { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = e.key.toLowerCase(), K = { w: 'watch', c: 'cut', b: 'build', z: 'zero', t: 'take', g: 'bug', h: 'birthday', a: 'anything', o: 'otherwise', i: 'imprint' };
    if (k >= '1' && k <= '5') { ST.ring = +k - 1; window.CORE.touch('select ring'); }
    else if (k === 'arrowup' || k === 'arrowdown') { const R = ringDefs()[ST.ring], dir = k === 'arrowdown' ? 1 : -1;
      // TIME: an arrow is the next beat (its key frame), with shift the next frame
      if (R && R.scrub) { const sh = window.CORE.curShot(), v = R.get(); if (e.shiftKey && sh) act('turn', ST.ring, dir / sh.T + 1e-4, 'key'); else window.CORE.setRing(ST.ring, Math.max(0, Math.round(Math.floor(v + 1e-6) + dir))); }
      else act('turn', ST.ring, dir * (R && R.disc ? 1 : e.shiftKey ? .05 : .25), 'key'); }
    else if (k === 'arrowleft' || k === 'arrowright') { ST.ring = (ST.ring + (k === 'arrowright' ? 1 : 4)) % 5; window.CORE.touch('select ring'); }
    else if (k === ' ') act('press', 'watch'); else if (K[k]) act('press', K[k], e.shiftKey); else return; e.preventDefault(); }

  /* ---- drawing ---- */
  const lerp = (a, b, t) => a + (b - a) * t, mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t))), rgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 1 : a})`;
  // the film's light on the metal: the brightest large part lights the top of the barrel, the darkest the underside
  function palette() { const sh = window.CORE.curShot(); if (!sh) return { hi: [235, 238, 236], lo: [40, 44, 46], key: [210, 60, 50], glow: [140, 220, 210] };
    const ps = sh.parts.slice().sort((a, b) => b.area - a.area), lum = c => .3 * c[0] + .59 * c[1] + .11 * c[2];
    const br = ps.slice().sort((a, b) => lum(b.rgb) - lum(a.rgb))[0].rgb, dk = ps.slice().sort((a, b) => lum(a.rgb) - lum(b.rgb))[0].rgb;
    const p = window.CORE.partsOf(sh)[ST.part] || ps[0];
    return { hi: mix([238, 240, 238], br, .28), lo: mix([34, 36, 38], dk, .35), key: p.rgb, glow: mix(br, [255, 255, 255], .3), warm: lum(br) < 90 && br[0] > br[2] * 1.3 }; }
  function draw(now) {
    if (!O.cv) return; layout(); const c = O.ctx, M = O.M, cv = O.cv; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    c.setTransform(M.s, 0, 0, M.s, M.cx, M.cy); if (M.rot) c.transform(0, 1, -1, 0, 0, 0); c.translate(-DW / 2, -DH / 2);
    const P = O.pal = palette(), D = ringDefs();
    if (O.held && !O.held.long && now - O.held.at > 650) { O.held.long = true; }
    // shadow and body
    lensRings(c, P, now); c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 24; c.shadowOffsetY = 10; rr(c, 150, BODY[0] + 6, 700, BODY[1] - BODY[0] - 12, 18); c.fillStyle = '#222'; c.fill(); c.restore();
    barrel(c, 150, BODY[0] + 8, 700, BODY[1] - BODY[0] - 16, P, 0);
    for (let i = 0; i < 5; i++) ring(c, i, D[i], P, now);
    pod(c, 'left', P, now); pod(c, 'right', P, now); glass(c, D, P, now); lcdLeft(c, P, now); lcdRight(c, D, P, now); grips(c, now);
  }
  // behind the device, the barrel seen end-on: thin dotted and dashed circles, as a lens's rings look down its axis
  function lensRings(c, P, now) { c.save(); const cx = DW / 2, cy = DH / 2 + 10; c.strokeStyle = rgb(mix(P.glow, [255, 255, 255], .3), .16); c.lineWidth = .7;
    [[560, [2, 6]], [610, [14, 10]], [660, [1, 9]]].forEach(([r, d], i) => { c.setLineDash(d); c.lineDashOffset = -O.disp[i * 2] * 12; c.beginPath(); c.ellipse(cx, cy, r, r * .5, 0, 0, Math.PI * 2); c.stroke(); });
    c.setLineDash([]); c.strokeStyle = rgb(P.key, .45); c.lineWidth = 1.2; const a0 = -Math.PI / 2 + (ST.ring - 2) * .18; c.beginPath(); c.ellipse(cx, cy, 610, 305, 0, a0 - .05, a0 + .05); c.stroke(); c.restore(); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // a cylinder seen from the side: bright where the film's light falls, dark beneath
  function cylGrad(c, y0, y1, P, k) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgb(mix(P.lo, P.hi, .55 * k))); g.addColorStop(.18, rgb(mix(P.hi, [255, 255, 255], .2))); g.addColorStop(.32, rgb(mix(P.hi, P.lo, .12)));
    g.addColorStop(.62, rgb(mix(P.hi, P.lo, .5))); g.addColorStop(.9, rgb(P.lo)); g.addColorStop(1, rgb(mix(P.lo, [0, 0, 0], .5))); return g; }
  function barrel(c, x, y, w, h, P) { c.fillStyle = cylGrad(c, y, y + h, P, .7); rr(c, x, y, w, h, 10); c.fill(); }
  function ring(c, i, R, P, now) {
    const [x0, x1] = RINGS[i], w = x1 - x0, y0 = BODY[0] - (i === 2 ? 8 : 0), y1 = BODY[1] + (i === 2 ? 8 : 0), cy = (y0 + y1) / 2, rad = (y1 - y0) / 2, act = ST.ring === i, hov = O.hot === 'r' + i;
    // the displayed position eases toward the true one, so a detent is felt as a settle
    const tgt = R ? R.get() : 0; O.disp[i] += (tgt - O.disp[i]) * .28; if (Math.abs(tgt - O.disp[i]) > 20) O.disp[i] = tgt; const pos = O.disp[i];
    c.save(); rr(c, x0, y0, w, y1 - y0, 6); c.clip();
    if (i === 2) { // the glass drum: the film's light passes through it
      const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgb(mix(P.lo, P.glow, .5))); g.addColorStop(.25, rgb(mix(P.glow, [255, 255, 255], .4), .95)); g.addColorStop(.6, rgb(mix(P.glow, P.lo, .55))); g.addColorStop(1, rgb(P.lo));
      c.fillStyle = g; c.fillRect(x0, y0, w, y1 - y0); }
    else { c.fillStyle = cylGrad(c, y0, y1, P, 1); c.fillRect(x0, y0, w, y1 - y0);
      // knurl: fine grooves that scroll with the ring
      const ph = pos * 24 * Math.PI / 180; c.strokeStyle = 'rgba(0,0,0,.42)'; c.lineWidth = .6;
      for (let k = -80; k < 80; k++) { const th = k * 3 * Math.PI / 180 - (ph % (3 * Math.PI / 180)), kk = Math.round((th + ph) / (3 * Math.PI / 180)); if (Math.abs(th) > 1.45) continue; const y = cy + rad * Math.sin(th), L = kk % 8 === 0 ? 9 : kk % 4 === 0 ? 6 : 3.5;
        c.globalAlpha = .55 * Math.cos(th); c.beginPath(); c.moveTo(x0 + 2, y); c.lineTo(x0 + 2 + L, y); c.moveTo(x1 - 2 - L, y); c.lineTo(x1 - 2, y); c.stroke(); } c.globalAlpha = 1;
      // a fine bevel line where the ring meets the barrel
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0, y0, 1, y1 - y0); c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x1 - 1, y0, 1, y1 - y0); }
    // engraved labels on the barrel, foreshortened as they turn away
    if (R) { const N = R.labels.length; for (let k = Math.max(0, Math.floor(pos) - 4); k <= Math.min(N - 1, Math.ceil(pos) + 4); k++) { const th = (k - pos) * 24 * Math.PI / 180; if (Math.abs(th) > 1.4) continue;
        const y = cy + rad * .86 * Math.sin(th), sc = Math.cos(th), on = Math.abs(k - pos) < .5; const lab = R.labels[k] || '';
        c.save(); c.translate((x0 + x1) / 2, y); c.scale(1, Math.max(.05, sc)); c.font = (on ? '600 ' : '500 ') + (lab.length > 9 ? 9 : lab.length > 6 ? 10.5 : 12.5) + 'px "IBM Plex Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = i === 2 ? (on ? '#fff' : 'rgba(255,255,255,.55)') : on ? '#111' : 'rgba(20,20,20,.55)'; c.fillText(fit(c, lab, w - 22), 0, 0); c.restore();
        if (!lab) { c.fillStyle = i === 2 ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.35)'; c.fillRect((x0 + x1) / 2 - 1, y - 4 * sc, 2, 8 * sc); } } }
    c.restore();
    // the index: a red line across the ring at the barrel's front, as on the film's lens
    c.fillStyle = act ? '#e0332b' : 'rgba(190,40,35,.75)'; c.fillRect(x0 - 2, cy - 1, 6, 2); c.fillRect(x1 - 4, cy - 1, 6, 2);
    if (act || hov) { c.strokeStyle = act ? rgb(P.key, .95) : 'rgba(255,255,255,.35)'; c.lineWidth = act ? 2.5 : 1.5; rr(c, x0 - 1, y0 - 1, w + 2, y1 - y0 + 2, 7); c.stroke(); }
    // the ring's name engraved on the barrel's collar below it
    c.font = '500 9px "IBM Plex Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.fillStyle = act ? rgb(mix(P.key, [255, 255, 255], .55)) : 'rgba(235,235,235,.45)'; c.fillText(fit(c, (i + 1) + ' ' + (R ? R.title : ''), w + 6), (x0 + x1) / 2, BODY[1] + 24);
  }
  function fit(c, s, w) { if (c.measureText(s).width <= w) return s; while (s.length > 2 && c.measureText(s + '.').width > w) s = s.slice(0, -1); return s + '.'; }
  function pod(c, side, P, now) {
    const [x0, y0, x1, y1] = POD[side]; c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 18; c.shadowOffsetY = 8; rr(c, x0, y0, x1 - x0, y1 - y0, 26); c.fillStyle = '#2a2c2e'; c.fill(); c.restore();
    const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, rgb(mix(P.hi, [255, 255, 255], .1))); g.addColorStop(.5, rgb(mix(P.hi, P.lo, .35))); g.addColorStop(1, rgb(mix(P.lo, P.hi, .15)));
    c.fillStyle = g; rr(c, x0, y0, x1 - x0, y1 - y0, 26); c.fill();
    // bead-blast grain
    c.fillStyle = 'rgba(0,0,0,.05)'; for (let k = 0; k < 140; k++) { const u = (Math.sin(k * 12.9898 + (side === 'left' ? 1 : 7)) * 43758.5453) % 1, v = (Math.sin(k * 78.233 + 3) * 12345.678) % 1; c.fillRect(x0 + Math.abs(u) * (x1 - x0), y0 + Math.abs(v) * (y1 - y0), 1.2, 1.2); }
    for (const k in BTN) if (BTN[k].side === side) button(c, k, BTN[k], P, now);
  }
  function button(c, k, b, P, now) {
    const on = k === ST.mode || k === ST.proto || (k === 'watch' && ST.mode === 'watch'), prs = (O.held && O.held.btn === k) || (now - (O.flash[k] || 0) < 160), hov = O.hot === k;
    const lit = { take: ST.mode === 'cut' || ST.mode === 'watch', imprint: ST.mode === 'build' }[k];
    c.save(); c.translate(b.cx, b.cy + (prs ? 1.5 : 0));
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = prs ? 2 : 6; c.shadowOffsetY = prs ? 1 : 3; c.beginPath(); c.arc(0, 0, b.r, 0, 7); c.fillStyle = '#1b1c1d'; c.fill(); c.shadowColor = 'transparent';
    const g = c.createRadialGradient(-6, -8, 2, 0, 0, b.r); g.addColorStop(0, '#fafafa'); g.addColorStop(.55, rgb(mix(P.hi, [150, 150, 150], .3))); g.addColorStop(1, rgb(mix(P.lo, [90, 90, 90], .3)));
    c.beginPath(); c.arc(0, 0, b.r - 2.5, 0, 7); c.fillStyle = g; c.fill();
    // an LED ring: lit for the active mode or builder, the film's colour for the part in hand
    if (on || lit || hov) { c.beginPath(); c.arc(0, 0, b.r - 1, 0, 7); c.lineWidth = 2.5; c.strokeStyle = on ? (k === 'watch' && !ST.playing ? '#f0b040' : '#e0332b') : hov ? 'rgba(255,255,255,.7)' : rgb(P.key, .9); c.stroke(); }
    if (O.held && O.held.btn === k && O.held.long) { c.beginPath(); c.arc(0, 0, b.r + 4, -Math.PI / 2, -Math.PI / 2 + 6.28); c.strokeStyle = '#ffd36b'; c.lineWidth = 2; c.stroke(); }
    c.restore();
    c.font = '700 9px "IBM Plex Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.fillStyle = on ? '#fff' : 'rgba(240,240,240,.82)'; c.fillText(k === 'watch' && ST.mode === 'watch' ? (ST.playing ? 'PAUSE' : 'PLAY') : b.lab, b.cx, b.cy + b.r + 12);
  }
  function screen(c, x, y, w, h) { c.save(); rr(c, x, y, w, h, 6); c.fillStyle = '#0b0f0e'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.stroke(); c.clip(); }
  // left screen: the pairing code and the hands the camera sees
  function lcdLeft(c, P, now) { const [x0, y0, x1] = POD.left, x = x0 + 12, y = y0 + 14, w = x1 - x0 - 24, h = 80; screen(c, x, y, w, h);
    c.font = '600 9px "IBM Plex Mono", monospace'; c.fillStyle = '#9fe8d8'; c.textAlign = 'left';
    const L = ST.lcd.left || []; (Array.isArray(L) ? L : [L]).slice(0, 6).forEach((s, i) => c.fillText(fit(c, s, w - 10 - (O.qr ? 46 : 0)), x + 5, y + 12 + i * 11.5));
    if (O.qr) { const q = O.qr, n = q.getModuleCount(), s = 44 / n; c.fillStyle = '#e8fff8'; c.fillRect(x + w - 50, y + 4, 48, 48); c.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect(x + w - 48 + k * s, y + 6 + r * s, s + .2, s + .2); }
    // the hands, as the camera sees them
    const H = ST.hands; if (H.marks && H.marks.length) { const ox = x + w - 46, oy = y + 52, sw = 42, sh = 22; c.strokeStyle = '#c4f46a'; c.lineWidth = 1;
      for (const m of H.marks) for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]]) {
        c.beginPath(); c.moveTo(ox + (1 - m[a].x) * sw, oy + m[a].y * sh); c.lineTo(ox + (1 - m[b].x) * sw, oy + m[b].y * sh); c.stroke(); } }
    c.restore(); }
  // right screen: the ring in hand, its value, the match of the last imprint, the step of the builder
  function lcdRight(c, D, P, now) { const [x0, y0, x1] = POD.right, x = x0 + 12, y = y0 + 14, w = x1 - x0 - 24, h = 80; screen(c, x, y, w, h);
    const R = D[ST.ring]; c.textAlign = 'left'; c.font = '600 9px "IBM Plex Mono", monospace'; c.fillStyle = '#9fe8d8';
    c.fillText(ST.mode.toUpperCase() + (ST.proto && ST.mode === 'build' ? ' · ' + ST.proto.toUpperCase() : ''), x + 5, y + 12);
    if (R) { c.fillStyle = '#fff'; c.font = '700 11px "IBM Plex Mono", monospace'; c.fillText(fit(c, (ST.ring + 1) + ' ' + R.title, w - 10), x + 5, y + 28); c.font = '600 10px "IBM Plex Mono", monospace'; c.fillStyle = rgb(mix(P.key, [255, 255, 255], .45));
      const v = R.get(), lab = R.scrub ? (R.labels[Math.floor(v + 1e-6)] || '') + ' +' + (((window.CORE.curShot() || {}).t || [0])[ST.fr] - ((window.CORE.curShot() || {}).start || 0)).toFixed(1) + 's' : R.disc || R.key === 'part' ? (R.labels[Math.round(v)] || '') : Math.round(v / Math.max(1, R.labels.length - 1) * 100) + '%'; c.fillText(fit(c, lab, w - 10), x + 5, y + 42); }
    if (ST.score != null) { c.fillStyle = '#ffd36b'; c.fillText('MATCH ' + ST.score + '%', x + 5, y + 57); }
    if (ST.steps) { c.fillStyle = '#9fe8d8'; c.fillText('STEP ' + Math.min(ST.step + 1, ST.steps.length) + '/' + ST.steps.length, x + 5, y + 70); }
    c.restore(); }
  // the glass strip on top of the barrel: the long name of what the ring points at, and the builder's next step
  function glass(c, D, P, now) { const x = RX[0], y = 10, w = RX[1] - RX[0], h = 50; c.save(); rr(c, x, y, w, h, 10);
    const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,.04)'); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(255,255,255,.28)'; c.stroke(); c.clip();
    const R = D[ST.ring]; c.textAlign = 'center'; c.font = '600 12px "IBM Plex Mono", monospace'; c.fillStyle = 'rgba(255,255,255,.92)';
    const ri = R ? (R.scrub ? Math.floor(R.get() + 1e-6) : Math.round(R.get())) : 0, long = R && R.long ? R.long[ri] : R ? R.title + ' ' + (R.labels[ri] || '') : ''; c.fillText(fit(c, (long || '').toUpperCase(), w - 20), x + w / 2, y + 20);
    let note = ST.lcd.note || (ST.mode !== 'build' && window.CORE.momentNote ? window.CORE.momentNote() : ''); if (ST.steps && ST.step < ST.steps.length && !note) note = (ST.step + 1) + '/' + ST.steps.length + '  ' + ST.steps[ST.step].say; else if (ST.steps && ST.step >= ST.steps.length && !note) note = ST.proto.toUpperCase() + ' BUILT. TURN TIME TO SEE YOUR MEMORY IN THE FILM';
    c.font = '600 10.5px "IBM Plex Mono", monospace'; c.fillStyle = rgb(mix(P.key, [255, 230, 160], .6)); c.fillText(fit(c, note.toUpperCase(), w - 20), x + w / 2, y + 38);
    // where the ring in hand sits on its whole range
    if (R && R.labels.length > 1) { const f = R.get() / (R.labels.length - 1); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x + 20, y + h - 5, w - 40, 2); c.fillStyle = '#e0332b'; c.fillRect(x + 20 + f * (w - 40) - 3, y + h - 6, 6, 4); }
    c.restore(); }
  // hands on the barrel: when a hand turns a ring, two fingertips rest on it, as in the film
  function grips(c, now) { const G = O.grip; if (!G || now - G.at > 400) return; const [x0, x1] = RINGS[G.ring], cx = (x0 + x1) / 2;
    c.save(); c.globalAlpha = .55; for (const [dx, dy] of [[-.28, -.42], [.3, .38]]) { const g = c.createRadialGradient(cx + dx * (x1 - x0), 150 + dy * 160, 2, cx + dx * (x1 - x0), 150 + dy * 160, 26); g.addColorStop(0, 'rgba(232,190,160,.95)'); g.addColorStop(1, 'rgba(232,190,160,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(cx + dx * (x1 - x0), 150 + dy * 160, 28, 18, 0, 0, 7); c.fill(); } c.restore(); }
  O.attach = attach; O.draw = draw;
})();
