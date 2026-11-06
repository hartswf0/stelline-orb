/* ORB TOOL core: the device, drawn on a canvas below the view. After hand-orb-v5's barrel (assets/v5/orb.js: knurled rings
   with engraved labels that scroll under the finger, a red index line, a glass strip on top) with ana/index.html's behaviour
   (a quiet click per hand detent, then the machine's louder clicks at 11.8 a second; SELECT; HOLD, held = switch off).
   Every ring and button goes through CORE_DEVMAP to ops on the bus, so the hand and an agent act the same way.
   Frame: 400 x 316 device units, scaled to fit. Browser global CORE_DEVICE. */
(function (root) {
  'use strict';
  const S = root.CORE_STATE, DM = root.CORE_DEVMAP;
  const DW = 400, DH = 370, BODY = [86, 190], RW = 80, RG = 6, RX0 = 32, LONG = 650, HIT = 26, MINFONT = 13;   // HIT: button touch radius; MINFONT: no text under 13 units (12.4 px at 390 px wide)
  const RINGS = [0, 1, 2, 3].map(i => [RX0 + i * (RW + RG), RX0 + i * (RW + RG) + RW]);
  const BROWS = [['select', 'hold', 'make', 'accept', 'ask'], ['undo', 'redo', 'keep', 'breed', 'save']];
  const LAB = {}; for (const side of ['left', 'right']) DM.BUTTONS[side].forEach(([k, l]) => { LAB[k] = l; });
  const BTN = {}; BROWS.forEach((row, r) => row.forEach((k, i) => { BTN[k] = { cx: 44 + i * 78, cy: 268 + r * 60, r: 18, lab: LAB[k] }; }));
  const lerp = (a, b, t) => a + (b - a) * t, mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t))), rgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a == null ? 1 : a})`;
  const FONT = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  function create(cv, orb, opts) {
    opts = opts || {}; const ctx = cv.getContext('2d'), SND = root.CORE_SOUND;
    const D = { cv, quality: 0, touching: null, M: null, hot: null, held: null, down: null, disp: [0, 0, 0, 0], flash: {}, grip: null, msg: null, ring: 2, gest: 0 };
    // ---- what each ring shows: its labels and where the hand has it
    function ringInfo(s, i) { const r = DM.role(s, i); if (!r) return null; const sp = S.spec(r.path), v = S.get(s, r.path);
      const ghost = s.proposals.find(p => root.CORE_OPS.ghostArg(p, r.path)), gv = ghost ? ghost.args[root.CORE_OPS.ghostArg(ghost, r.path)] : null;
      let labels, pos, gpos = null;
      if (sp.kind === 'enum') { labels = sp.a.map(x => x.toUpperCase()); pos = sp.a.indexOf(v); if (ghost) gpos = sp.a.indexOf(gv); }
      else { const lo = typeof sp.a === 'function' ? sp.a(s) : sp.a, hi = typeof sp.b === 'function' ? sp.b(s) : sp.b, n = Math.round((hi - lo) / sp.step);
        labels = []; for (let k = 0; k <= n; k++) labels.push(fmt(s, r.path, lo + k * sp.step)); pos = (v - lo) / sp.step; if (ghost) gpos = (gv - lo) / sp.step; }
      return { role: r, labels, pos, gpos, value: fmt(s, r.path, v), long: longName(s, r.path, v) }; }
    function fmt(s, path, v) {
      if (path === 'cake.kind') return v === -1 ? 'NONE' : v === -2 ? 'BRED' : (s.library[v] ? s.library[v].name.split(',')[0].toUpperCase() : '' + v);
      if (path === 'cake.stage') return S.STAGES[v].toUpperCase();
      if (path === 'camera.yaw') return (((Math.round(v) % 360) + 360) % 360 + '').padStart(2, '0');
      if (path === 'cake.tilt') return v * 3 + '°';
      if (path === 'inscription.written') return Math.min(5, Math.ceil(v / 5)) + '/5';
      if (/offset$/.test(path)) return (v > 0 ? '+' : '') + v;
      if (/arrived$/.test(path)) return v * 10 + '%';
      if (path === 'cake.genome.height') return Math.round(v * 100) + 'CM';
      return typeof v === 'number' ? (Math.round(v * 100) / 100 + '') : String(v).toUpperCase(); }
    function longName(s, path, v) {
      if (path === 'cake.kind') return v >= 0 ? s.library[v].name : v === -2 ? 'a bred cake, not kept' : 'no cake';
      if (path === 'inscription.written') return s.inscription.text + ', ' + v + ' of 24 strokes';
      if (path === 'camera.yaw') return 'kneeling at ' + (((v % 360) + 360) % 360) + ' degrees around the memory';
      if (path === 'camera.kneel') return 'kneel ' + v + ' of 10';
      return path.replace(/\./g, ' ') + ' ' + fmt(s, path, v); }
    // ---- geometry
    function layout() { const dpr = D.quality >= 1 ? 1 : Math.min(2, root.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const s = Math.min(w / DW, h / DH) * .98 * dpr; D.M = { s, cx: cv.width / 2, cy: cv.height / 2, dpr }; }
    function toDev(e) { const r = cv.getBoundingClientRect(), M = D.M; return [((e.clientX - r.left) * M.dpr - M.cx) / M.s + DW / 2, ((e.clientY - r.top) * M.dpr - M.cy) / M.s + DH / 2]; }
    function hitAt(x, y) { for (const k in BTN) { const b = BTN[k]; if (Math.hypot(x - b.cx, y - b.cy) < HIT) return { btn: k }; }
      for (let i = 0; i < 4; i++) if (x >= RINGS[i][0] - 3 && x <= RINGS[i][1] + 3 && y >= BODY[0] - 16 && y <= BODY[1] + 46) return { ring: i };
      if (y < 72 && x > 20 && x < 380) return { glass: true }; return null; }
    D.toPage = (x, y) => { const M = D.M, r = cv.getBoundingClientRect(); return [((x - DW / 2) * M.s + M.cx) / M.dpr + r.left, ((y - DH / 2) * M.s + M.cy) / M.dpr + r.top]; };
    D.ringX = i => (RINGS[i][0] + RINGS[i][1]) / 2; D.BTN = BTN; D.BODY = BODY; D.hitAt = hitAt;
    // ---- actions
    function say(t, bad) { D.msg = { t: String(t || ''), bad: !!bad, at: performance.now() }; }
    function turn(i, k, gesture) { D.ring = i; const r = DM.turn(orb, i, k, { author: 'hand', gesture }); if (r.ok) { SND && SND.hand(i); D.grip = { ring: i, at: performance.now() }; } else say(r.error, true); return r; }
    function press(id, long) { D.flash[id] = performance.now(); SND && SND.wake();
      const r = DM.press(orb, id, long, { author: 'hand' });
      if (r && r.ui) opts.onUi && opts.onUi(r.ui); else if (r && !r.ok) say(r.error, true);
      else if (id === 'select') SND && SND.select(); else if (id === 'hold') SND && SND.wash(orb.raw().time.off ? 1.2 : .5); else SND && SND.tick();
      return r; }
    D.turn = turn; D.press = press;
    function pdown(e) { layout(); const [x, y] = toDev(e), h = hitAt(x, y); if (!h) return; e.preventDefault(); SND && SND.wake(); try { cv.setPointerCapture(e.pointerId); } catch (er) { }
      if (h.glass) { opts.onUi && opts.onUi('ask'); return; }
      if (h.btn) { D.held = { btn: h.btn, at: performance.now(), ts: e.timeStamp, long: false }; D.flash[h.btn] = performance.now(); return; }
      D.touching = h.ring; D.down = { ring: h.ring, y, acc: 0, g: 'drag-' + (++D.gest) + '-' + Date.now() }; D.ring = h.ring; }
    // one label step is 24 degrees of the barrel: the label under the finger stays under it
    const STEP = 54 * Math.sin(24 * Math.PI / 180);
    function pmove(e) { if (D.down) { const [, y] = toDev(e), d = y - D.down.y; D.down.y = y; D.down.acc += -d / STEP;
        const k = D.down.acc > 0 ? Math.floor(D.down.acc) : Math.ceil(D.down.acc); if (k) { D.down.acc -= k; turn(D.down.ring, k, D.down.g); } return; }
      if (e.target !== cv) { if (D.hot) D.hot = null; return; } const [x, y] = toDev(e), h = hitAt(x, y), nh = h ? (h.btn || (h.glass ? 'glass' : 'r' + h.ring)) : null;
      if (nh !== D.hot) { D.hot = nh; cv.style.cursor = h ? (h.ring != null ? 'ns-resize' : 'pointer') : 'default'; } }
    // long or short is decided from the pointer events' own timeStamps, so a slow frame cannot turn a tap into a long press
    function pup(e) { if (D.held) { const H = D.held; D.held = null; const up = e && e.timeStamp != null ? e.timeStamp : performance.now(); press(H.btn, DM.isLong(H.ts != null ? H.ts : H.at, up)); } D.down = null; D.touching = null; }
    cv.addEventListener('pointerdown', pdown); root.addEventListener('pointermove', pmove); root.addEventListener('pointerup', pup); root.addEventListener('pointercancel', pup);
    cv.addEventListener('wheel', e => { layout(); const [x, y] = toDev(e), h = hitAt(x, y); if (h && h.ring != null) { e.preventDefault(); turn(h.ring, e.deltaY > 0 ? -1 : 1, 'wheel-' + h.ring + '-' + Math.floor(performance.now() / 600)); } }, { passive: false });
    root.addEventListener('keydown', e => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = e.key;
      if (k >= '1' && k <= '4') D.ring = +k - 1; else if (k === 'ArrowUp' || k === 'ArrowDown') turn(D.ring, k === 'ArrowUp' ? 1 : -1, 'key-' + D.ring + '-' + Math.floor(performance.now() / 800));
      else if (k === 'ArrowLeft' || k === 'ArrowRight') D.ring = (D.ring + (k === 'ArrowRight' ? 1 : 3)) % 4; else if (k === ' ') press('hold', e.shiftKey); else if (k === 's') press('select', e.shiftKey);
      else if (k === 'm') press('make', false); else if (k === 'Enter') press('accept', e.shiftKey); else if (k === 'z') press('undo', false); else if (k === 'y') press('redo', false); else return; e.preventDefault(); });
    // ---- drawing
    const P = { hi: [226, 230, 228], lo: [34, 37, 39], key: [224, 51, 43], glow: [160, 222, 210] };
    function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    function cylGrad(c, y0, y1, k) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgb(mix(P.lo, P.hi, .55 * k))); g.addColorStop(.18, rgb(mix(P.hi, [255, 255, 255], .2))); g.addColorStop(.32, rgb(mix(P.hi, P.lo, .12)));
      g.addColorStop(.62, rgb(mix(P.hi, P.lo, .5))); g.addColorStop(.9, rgb(P.lo)); g.addColorStop(1, rgb(mix(P.lo, [0, 0, 0], .5))); return g; }
    function fit(c, s, w) { if (c.measureText(s).width <= w) return s; while (s.length > 2 && c.measureText(s + '.').width > w) s = s.slice(0, -1); return s + '.'; }
    function draw(now) { layout(); const c = ctx, M = D.M; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      c.setTransform(M.s, 0, 0, M.s, M.cx - DW / 2 * M.s, M.cy - DH / 2 * M.s);
      const s = orb.raw(), infos = [0, 1, 2, 3].map(i => ringInfo(s, i));
      if (D.held && !D.held.long && now - D.held.at > LONG) D.held.long = true;
      // the barrel
      c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 18; c.shadowOffsetY = 8; rr(c, 10, BODY[0] + 6, 380, BODY[1] - BODY[0] - 12, 14); c.fillStyle = '#222'; c.fill(); c.restore();
      c.fillStyle = cylGrad(c, BODY[0] + 8, BODY[1] - 8, .7); rr(c, 10, BODY[0] + 8, 380, BODY[1] - BODY[0] - 16, 10); c.fill();
      for (let i = 0; i < 4; i++) ring(c, i, infos[i], now);
      glass(c, s, infos, now); buttons(c, s, now); grips(c, now);
      if (s.time.off) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, BODY[0], DW, BODY[1] - BODY[0]); } }
    function ring(c, i, R, now) {
      const [x0, x1] = RINGS[i], w = x1 - x0, wide = i === 2, y0 = BODY[0] - (wide ? 6 : 0), y1 = BODY[1] + (wide ? 6 : 0), cy = (y0 + y1) / 2, rad = (y1 - y0) / 2, act = D.ring === i, hov = D.hot === 'r' + i;
      const tgt = R ? R.pos : 0; D.disp[i] += (tgt - D.disp[i]) * .35; if (Math.abs(tgt - D.disp[i]) > 30 || Math.abs(tgt - D.disp[i]) < .002) D.disp[i] = tgt; const pos = D.disp[i];
      c.save(); rr(c, x0, y0, w, y1 - y0, 6); c.clip();
      if (i === 3) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, rgb(mix(P.lo, P.glow, .5))); g.addColorStop(.25, rgb(mix(P.glow, [255, 255, 255], .4), .95)); g.addColorStop(.6, rgb(mix(P.glow, P.lo, .55))); g.addColorStop(1, rgb(P.lo)); c.fillStyle = g; c.fillRect(x0, y0, w, y1 - y0); }
      else { c.fillStyle = cylGrad(c, y0, y1, 1); c.fillRect(x0, y0, w, y1 - y0); if (D.quality < 2) {
        const ph = pos * 24 * Math.PI / 180, dd = 3 * Math.PI / 180; c.strokeStyle = 'rgba(0,0,0,.42)'; c.lineWidth = .6;
        for (let k = -80; k < 80; k++) { const th = k * dd - (ph % dd), kk = Math.round((th + ph) / dd); if (Math.abs(th) > 1.45) continue; const y = cy + rad * Math.sin(th), L = kk % 8 === 0 ? 9 : kk % 4 === 0 ? 6 : 3.5;
          c.globalAlpha = .55 * Math.cos(th); c.beginPath(); c.moveTo(x0 + 2, y); c.lineTo(x0 + 2 + L, y); c.moveTo(x1 - 2 - L, y); c.lineTo(x1 - 2, y); c.stroke(); } c.globalAlpha = 1;
        } c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0, y0, 1, y1 - y0); c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x1 - 1, y0, 1, y1 - y0); }
      if (R) { const N = R.labels.length;
        for (let k = Math.max(0, Math.floor(pos) - 4); k <= Math.min(N - 1, Math.ceil(pos) + 4); k++) { const th = (k - pos) * 24 * Math.PI / 180; if (Math.abs(th) > 1.4) continue;
          const y = cy + rad * .86 * Math.sin(th), sc = Math.cos(th), on = Math.abs(k - pos) < .5, lab = R.labels[k] || '';
          c.save(); c.translate((x0 + x1) / 2, y); c.scale(1, Math.max(.05, sc)); c.font = (on ? '700 ' : '500 ') + (on ? 14 : MINFONT) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = i === 3 ? (on ? '#fff' : 'rgba(255,255,255,.55)') : on ? '#111' : 'rgba(20,20,20,.5)'; c.fillText(fit(c, lab, w - 22), 0, 0); c.restore(); }
        // the agent's ghost on this ring: a dashed cyan mark where it would set the value
        if (R.gpos != null) { const th = (R.gpos - pos) * 24 * Math.PI / 180; if (Math.abs(th) < 1.4) { const y = cy + rad * .86 * Math.sin(th); c.setLineDash([3, 3]); c.strokeStyle = '#38d6e0'; c.lineWidth = 2; rr(c, x0 + 4, y - 9, w - 8, 18, 4); c.stroke(); c.setLineDash([]); } } }
      c.restore();
      // the index: a red line at the barrel's front, as on the film's lens
      c.fillStyle = act ? '#e0332b' : 'rgba(190,40,35,.75)'; c.fillRect(x0 - 2, cy - 1, 6, 2); c.fillRect(x1 - 4, cy - 1, 6, 2);
      if (act || hov) { c.strokeStyle = act ? 'rgba(224,51,43,.95)' : 'rgba(255,255,255,.35)'; c.lineWidth = act ? 2.2 : 1.4; rr(c, x0 - 1, y0 - 1, w + 2, y1 - y0 + 2, 7); c.stroke(); }
      // the role and value under the ring, in plain words
      c.textAlign = 'center'; c.font = '500 ' + MINFONT + 'px ' + FONT; c.fillStyle = act ? '#f2c2bd' : 'rgba(230,230,230,.72)'; c.fillText(fit(c, R ? R.role.name : 'NOTHING', w + 4), (x0 + x1) / 2, BODY[1] + 22);
      c.font = '700 15px ' + FONT; c.fillStyle = '#f4f4f2'; c.fillText(fit(c, R ? R.value : '', w + 4), (x0 + x1) / 2, BODY[1] + 41); }
    // the status line (AUDIT R5): line 1 says what is true, line 2 what just happened (or the waiting ghost, or what to do)
    function truth(s) { const st = ['NO CAKE', 'SPONGE', 'FROSTED', 'DECORATED', 'FINISHED'][s.cake.stage], name = s.cake.kind >= 0 && s.library[s.cake.kind] ? s.library[s.cake.kind].name.split(',')[0].toUpperCase() + ' ' : s.cake.kind === -2 ? 'BRED ' : '';
      const here = s.people.filter(p => p.arrived >= 10).length, flags = [s.time.off ? 'OFF' : '', s.time.hold ? 'HELD' : '', s.time.blown ? 'BLOWN' : ''].filter(Boolean).join(' ');
      return 'ON ' + s.selection.toUpperCase() + ' | ' + (s.cake.stage ? name + st : st) + ' | ' + Math.min(5, Math.ceil(s.inscription.written / 5)) + '/5 WRITTEN | CANDLES ' + s.candles.lit + '/' + s.candles.count + ' | HERE ' + here + '/' + s.people.length + (flags ? ' | ' + flags : ''); }
    D.truth = () => truth(orb.raw());
    function glass(c, s, infos, now) { const x = 12, y = 6, w = 376, h = 62; c.save(); rr(c, x, y, w, h, 9);
      const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,.04)'); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(255,255,255,.26)'; c.lineWidth = 1; c.stroke(); c.clip();
      c.textAlign = 'left'; c.font = '700 ' + MINFONT + 'px ' + FONT; c.fillStyle = '#ffffff'; c.fillText(fit(c, truth(s), w - 16), x + 8, y + 24);
      let note = '', col = 'rgba(255,224,160,.95)';
      if (D.msg && now - D.msg.at < 3000) { note = D.msg.t; col = D.msg.bad ? '#ff9a8a' : col; }
      else if (s.proposals.length) { const p = s.proposals[0]; note = (s.proposals.length > 1 ? s.proposals.length + ' WAITING. ' : '') + p.author.replace('agent:', '').toUpperCase() + ' PROPOSES ' + root.CORE_OPS.label(p.op, p.args) + (p.note ? ' (' + p.note + ')' : '') + '. ACCEPT OR HOLD TO TAKE IT, TURN IT, OR HOLD ACCEPT DOWN TO REJECT'; col = '#7fe9f0'; }
      else if (s.time.off) note = 'SWITCHED OFF. PRESS HOLD TO SWITCH ON';
      else if (s.time.hold) note = 'HELD. PRESS HOLD TO RELEASE' + (s.people.slice(0, 3).every(p => p.arrived >= 10) && s.candles.lit > 0 ? ': THEY BLOW THE CANDLES' : '');
      else if (s.time.blown) note = 'BLOWN OUT. HOLD THE HOLD BUTTON DOWN TO SWITCH THE MEMORY OFF';
      else { const R = infos[D.ring]; note = R ? R.long : 'DRAG A RING UP OR DOWN'; }
      c.font = '600 ' + MINFONT + 'px ' + FONT; c.fillStyle = col; c.fillText(fit(c, note.toUpperCase(), w - 16), x + 8, y + 48); c.restore(); }
    function buttons(c, s, now) { for (const k in BTN) { const b = BTN[k], prs = (D.held && D.held.btn === k) || (now - (D.flash[k] || 0) < 160), hov = D.hot === k;
        const lit = (k === 'hold' && (s.time.hold || s.time.off)) || (k === 'accept' && s.proposals.length) || (k === 'undo' && orb.cursor() > 0) || (k === 'redo' && orb.cursor() < orb.history().length);
        c.save(); c.translate(b.cx, b.cy + (prs ? 1.5 : 0));
        c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = prs ? 2 : 6; c.shadowOffsetY = prs ? 1 : 3; c.beginPath(); c.arc(0, 0, b.r, 0, 7); c.fillStyle = '#1b1c1d'; c.fill(); c.shadowColor = 'transparent';
        const g = c.createRadialGradient(-5, -7, 2, 0, 0, b.r); g.addColorStop(0, '#fafafa'); g.addColorStop(.55, '#b4b8b6'); g.addColorStop(1, '#4c5250');
        c.beginPath(); c.arc(0, 0, b.r - 2.5, 0, 7); c.fillStyle = g; c.fill();
        if (lit || hov) { c.beginPath(); c.arc(0, 0, b.r - 1, 0, 7); c.lineWidth = 2.5; c.strokeStyle = k === 'accept' ? '#38d6e0' : k === 'hold' ? (s.time.off ? '#888' : '#f0b040') : hov && !lit ? 'rgba(255,255,255,.7)' : 'rgba(224,51,43,.85)'; c.stroke(); }
        if (D.held && D.held.btn === k) { const f = Math.min(1, (now - D.held.at) / LONG); c.beginPath(); c.arc(0, 0, b.r + 4, -Math.PI / 2, -Math.PI / 2 + f * 6.283); c.strokeStyle = f >= 1 ? '#ffd36b' : 'rgba(255,211,107,.5)'; c.lineWidth = 2; c.stroke(); }
        c.restore();
        if (k === 'select') { c.font = '600 ' + MINFONT + 'px ' + FONT; const tw = c.measureText(b.lab).width + 8; c.fillStyle = '#b8352c'; c.fillRect(b.cx - tw / 2, b.cy + b.r + 3, tw, 16); c.fillStyle = '#f4e9e3'; c.textAlign = 'center'; c.fillText(b.lab, b.cx, b.cy + b.r + 15); }
        else { c.font = '600 ' + MINFONT + 'px ' + FONT; c.textAlign = 'center'; c.fillStyle = 'rgba(240,240,240,.85)'; const lab = k === 'hold' && s.time.off ? 'ON' : k === 'hold' && s.time.hold ? 'RELEASE' : b.lab; c.fillText(lab, b.cx, b.cy + b.r + 16); } } }
    function grips(c, now) { const G = D.grip; if (!G || now - G.at > 400) return; const [x0, x1] = RINGS[G.ring], cx = (x0 + x1) / 2;
      c.save(); c.globalAlpha = .5 * (1 - (now - G.at) / 400); for (const [dx, dy] of [[-.25, -.38], [.28, .34]]) { const X = cx + dx * (x1 - x0), Y = (BODY[0] + BODY[1]) / 2 + dy * 100, g = c.createRadialGradient(X, Y, 2, X, Y, 20); g.addColorStop(0, 'rgba(232,190,160,.95)'); g.addColorStop(1, 'rgba(232,190,160,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(X, Y, 22, 14, 0, 0, 7); c.fill(); } c.restore(); }
    D.draw = draw; D.layout = layout; D.say = say; D.ringInfo = i => ringInfo(orb.raw(), i);
    layout(); return D;
  }
  root.CORE_DEVICE = { create, DW, DH, BTN, RINGS, BODY, HIT, MINFONT };
})(typeof window !== 'undefined' ? window : globalThis);
