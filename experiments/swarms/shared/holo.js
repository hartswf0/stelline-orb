/* HOLO — the memory maker's hologram UI and its handheld device, shared by the swarms.
   Built from the forensic dossier of the party scene (clip 128-245 s) and evolved against film crops by holo-measure.js.
   Every size in the genome is in film pixels of a 1280x720 frame of the medium cake shot (144.75-148.4 s); the 3D sprites scale that up.

   API (FILM-BAR.md):
     HOLO.arc(scene, anchor, opts)        -> { object, step(i), setMark(deg), show(on), off(dur), update(dt, camera), canvas }
     HOLO.readout(scene, anchor, opts)    -> { object, type(lines), feed(n), clear(), show(on), update(dt, camera) }
     HOLO.childMark(scene, target, opts)  -> { object, show(p), update(dt, camera) }
     HOLO.spots(root, opts)               -> { on(dur), off(dur, {origin, banks}), set(k), flash(), update(dt) }
     HOLO.device(canvas, opts)            -> controller { on(ev, fn), rings, select(i), hold, setRange(ring, lo, hi), setValue(ring, v), update(dt) }
     HOLO.Machine                         -> the DOM-free detent/step machine (used by the device and by node tests)
     HOLO.draw.arc / readout / childMark  -> pure 2D renderers (what the measurement compares to the film)
     HOLO.sound                           -> grains from ana/device-sounds.wav if present, else synthesized
   Works without three.js for the device and the 2D renderers; in node, require('./holo.js') gives the Machine and the genome. */
(function (root, factory) { const H = factory(root); if (typeof module === 'object' && module.exports) module.exports = H; else root.HOLO = H; })(typeof self !== 'undefined' ? self : this, function (root) {
'use strict';
const TAU = Math.PI * 2, D2R = Math.PI / 180, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const hasDOM = typeof document !== 'undefined';

/* ------------------------------------------------------------------ THE GENOME (evolved; holo-genome.json holds the same numbers) */
const GENOME = /*GENOME*/{"arc":{"R":85.186,"asp":0.89,"thick":15.985,"a0":-107.284,"a1":48.998,"tail":12.934,"capA0":-104,"capA1":-73.139,"capGain":1.586,"bandIn":0.156,"bandOut":0.362,"edge":1.2,"gaps":[-22,-9,6.3,15.1,29.8,40],"gapW":2.4,"gapDepth":0.75,"hairR":0.801,"hairA":0.305,"hairW":1,"col":[196,198.878,197.994],"glow":1.968,"glowA":0.29,"markW":8.082,"markH":6,"markOff":0.852,"markGain":1.35,"tickLen":13,"tickDots":4,"tickDot":2,"tickGap":4.5,"needles":[[-79,0.52,1.06,0.55],[33,0.74,1.1,0.45]],"needleW":1},"steps":{"marks":[-23.2,-19.3,-10,-0.7,6],"blinkFrames":3.85,"drift":2.339,"driftTime":0.5},"readout":{"glyphH":2.4,"lineGap":5.956,"charW":1.7,"charGap":0.9,"wordMin":3,"wordMax":9,"spaceW":3.2,"lineW":102.179,"maxLines":3,"typeRate":74.595,"burst":0.096,"alpha":0.72,"col":[206,214,200],"clearHold":0.45},"child":{"R":13,"asp":0.9,"thick":4.2,"a0":-110,"a1":70,"capGain":1.6,"barW":9,"barH":12,"leader":16,"leaderA":135,"alpha":0.8},"device":{"detentDeg":9,"rate":11.7098,"fastRate":16,"fastAfter":8,"latency":0.423,"handGain":0.1672,"stepGain":0.7851,"fastGain":0.1638,"clickRate":1.6,"handRate":1.442},"fit":{"dx":0.39,"dy":0}}/*END*/;

/* ------------------------------------------------------------------ small helpers */
function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rgba(c, a) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1).toFixed(3)})`; }
function merge(base, over) { const o = JSON.parse(JSON.stringify(base)); if (!over) return o; for (const k in over) { if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && o[k]) o[k] = merge(o[k], over[k]); else o[k] = over[k]; } return o; }

const LAYERS = {}; function layer(w, h) { const k = w + 'x' + h; if (!LAYERS[k]) LAYERS[k] = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }); return LAYERS[k]; }
/* ================================================================== 2D RENDERERS (pure; the measurement draws these at the film's framing)
   drawArc(ctx, cx, cy, s, g, st): s = pixels per film pixel; st = { mark: deg or null, alpha, segOn: [0..1 per segment] } */
function drawArc(ctx, cx, cy, s, g, st) { // eslint-disable-line
  st = st || {}; const A = st.alpha == null ? 1 : st.alpha; if (A <= 0.002) return;
  const R = g.R * s, th = g.thick * s, col = g.col;
  // the segments, from the band's top end to its lower end, cut by the gaps
  const cuts = [g.a0].concat(g.gaps.filter(a => a > g.a0 && a < g.a1)).concat([g.a1]); const segOn = st.segOn || [];
  ctx.save(); ctx.translate(cx, cy); ctx.scale(g.asp, 1);
  const band = (alphaK) => {
    const nr = Math.max(4, Math.round(th / Math.max(0.5, s * 0.75)));
    for (let i = 0; i < cuts.length - 1; i++) {
      const on = segOn[i] == null ? 1 : segOn[i]; if (on <= 0.01) continue;
      let p0 = cuts[i] + (i ? g.gapW / 2 : 0), p1 = cuts[i + 1] - (i < cuts.length - 2 ? g.gapW / 2 : 0); if (p1 <= p0) continue;
      for (let k = 0; k < nr; k++) { const u = (k + 0.5) / nr, r = R - th + u * th; // u: 0 inner -> 1 outer
        let a = lerp(g.bandIn, g.bandOut, Math.pow(u, 1.3)); if (u > 1 - g.edge / g.thick) a *= 0.55; // a softer outer lip
        // the lower end fades out over 'tail' degrees; the cap at the upper end is brighter
        const steps = Math.max(2, Math.ceil((p1 - p0) / 3));
        for (let j = 0; j < steps; j++) { const q0 = p0 + (p1 - p0) * j / steps, q1 = p0 + (p1 - p0) * (j + 1) / steps, qm = (q0 + q1) / 2;
          let k2 = a; if (qm > g.a1 - g.tail) k2 *= clamp((g.a1 - qm) / g.tail, 0, 1); if (qm >= g.capA0 && qm <= g.capA1) k2 *= g.capGain * (0.75 + 0.25 * Math.sin(Math.PI * (qm - g.capA0) / (g.capA1 - g.capA0)));
          ctx.strokeStyle = rgba(col, k2 * A * on * alphaK); ctx.lineWidth = th / nr + 0.6; ctx.beginPath(); ctx.arc(0, 0, r, q0 * D2R, q1 * D2R + 0.002); ctx.stroke(); } }
    }
    // the gaps do not cut clean: a dark notch with a little of the band left in it
    ctx.globalCompositeOperation = 'source-over';
  };
  // the band is drawn once into a layer; the glow is that layer blurred, laid under it
  const cw = ctx.canvas.width, ch = ctx.canvas.height; const lay = layer(cw, ch), lx = lay.getContext('2d'); lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, cw, ch); lx.setTransform(ctx.getTransform()); lx.lineCap = 'butt';
  const keep = ctx; ctx = lx; band(1); ctx = keep; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (g.glow > 0 && ctx.filter !== undefined) { ctx.filter = `blur(${(g.glow * s).toFixed(2)}px)`; ctx.globalAlpha = g.glowA; ctx.drawImage(lay, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1; }
  ctx.drawImage(lay, 0, 0); ctx.restore();
  // inner hairline, concentric, the full height of the band
  ctx.strokeStyle = rgba(col, g.hairA * A); ctx.lineWidth = Math.max(0.5, g.hairW * s) / g.asp; ctx.beginPath(); ctx.arc(0, 0, R * g.hairR, (g.a0 + 18) * D2R, (g.a1 - 6) * D2R); ctx.stroke();
  ctx.restore();
  // the needles: thin straight lines across the band that do not move
  ctx.save(); ctx.translate(cx, cy); ctx.lineWidth = Math.max(0.5, g.needleW * s);
  g.needles.forEach(([a, r0, r1, al]) => { const c = Math.cos(a * D2R), sn = Math.sin(a * D2R); ctx.strokeStyle = rgba([235, 240, 232], al * A); ctx.beginPath(); ctx.moveTo(c * R * r0 * g.asp, sn * R * r0); ctx.lineTo(c * R * r1 * g.asp, sn * R * r1); ctx.stroke(); });
  // the index mark, a bright block on the outer edge, and the dotted tick that runs out from it
  if (st.mark != null) { const a = st.mark * D2R, c = Math.cos(a), sn = Math.sin(a), rr = R + g.markOff * s - g.markW * s / 2, mx = c * rr * g.asp, my = sn * rr;
    ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.atan2(sn, c * g.asp));
    ctx.fillStyle = rgba([250, 252, 246], Math.min(1, g.markGain * 0.74) * A); ctx.fillRect(-g.markW * s / 2, -g.markH * s / 2, g.markW * s, g.markH * s);
    if (g.glow > 0 && ctx.filter !== undefined) { ctx.filter = `blur(${(g.glow * s).toFixed(2)}px)`; ctx.fillRect(-g.markW * s / 2, -g.markH * s / 2, g.markW * s, g.markH * s); ctx.filter = 'none'; }
    ctx.fillStyle = rgba(col, 0.75 * A); const x0 = g.markW * s / 2 + 1.5 * s; ctx.fillRect(x0, -0.5 * s, g.tickLen * s * 0.45, Math.max(0.6, 1 * s));
    for (let k = 0; k < g.tickDots; k++) ctx.fillRect(x0 + g.tickLen * s * 0.5 + k * g.tickGap * s, -g.tickDot * s / 2, g.tickDot * s, g.tickDot * s);
    ctx.restore(); }
  ctx.restore();
}
/* the readout: rows of tiny type, typed left to right. lines: array of glyph-width arrays (negative = space); typed: how many px of the last line are shown */
function drawReadout(ctx, x0, y0, s, g, lines, typed, alpha) {
  const A = alpha == null ? 1 : alpha; if (A <= 0.002 || !lines.length) return; ctx.save(); ctx.translate(x0, y0); ctx.transform(1, -(g.slant || 0), 0, 1, 0, 0); x0 = 0; y0 = 0; if (g.blur > 0 && ctx.filter !== undefined) ctx.filter = `blur(${(g.blur * s).toFixed(2)}px)`;   // rows rise to the right, as seen in the film
  for (let i = 0; i < lines.length; i++) { const ln = lines[i], lim = i === lines.length - 1 ? typed : 1e9; let px = 0; const y = y0 + i * g.lineGap * s;
    for (let k = 0; k < ln.length; k++) { const w = ln[k]; if (px >= lim) break; if (w > 0) { const ww = Math.min(w, lim - px); ctx.fillStyle = rgba(g.col, g.alpha * A * (0.75 + 0.25 * ((k * 7919) % 13) / 13)); ctx.fillRect(x0 + px * s, y - g.glyphH * s / 2, ww * s, g.glyphH * s * (((k * 31) % 5) ? 1 : 0.7)); }
      px += Math.abs(w) + g.charGap; } }
  ctx.restore();
}
function makeLine(g, rnd, width) { const out = []; let x = 0; const W = width || g.lineW * (0.8 + 0.2 * rnd());
  while (x < W) { const n = Math.round(lerp(g.wordMin, g.wordMax, rnd())); for (let k = 0; k < n && x < W; k++) { const w = g.charW * (0.6 + 0.8 * rnd()); out.push(w); x += w + g.charGap; } out.push(-g.spaceW); x += g.spaceW + g.charGap; } return out; }
function lineLength(ln, g) { return ln.reduce((a, w) => a + Math.abs(w) + g.charGap, 0); }
/* the child's mark: a small C with a bright cap, a little bar beside it, and a leader line down toward the head */
function drawChildMark(ctx, cx, cy, s, g, alpha) { const A = alpha == null ? 1 : alpha; if (A <= 0.002) return; const R = g.R * s, col = [214, 222, 208];
  ctx.save(); ctx.translate(cx, cy); ctx.save(); ctx.scale(g.asp, 1); ctx.lineCap = 'butt';
  for (let a = g.a0; a < g.a1; a += 4) { const k = a < g.a0 + 40 ? g.capGain : 1; ctx.strokeStyle = rgba(col, g.alpha * 0.7 * k * A * (a > g.a1 - 30 ? (g.a1 - a) / 30 : 1)); ctx.lineWidth = g.thick * s; ctx.beginPath(); ctx.arc(0, 0, R - g.thick * s / 2, a * D2R, (a + 4.3) * D2R); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = rgba(col, g.alpha * 0.45 * A); ctx.fillRect(-R * 2.2, -R * 0.55, g.barW * s, g.barH * s); ctx.fillStyle = rgba(col, g.alpha * 0.95 * A); ctx.fillRect(-R * 2.2, -R * 0.55, g.barW * s, 2 * s);
  const la = g.leaderA * D2R; ctx.strokeStyle = rgba(col, g.alpha * 0.6 * A); ctx.lineWidth = Math.max(0.6, 0.9 * s); ctx.beginPath(); ctx.moveTo(Math.cos(la) * R * 1.1, Math.sin(la) * R * 1.1); ctx.lineTo(Math.cos(la) * (R * 1.1 + g.leader * s), Math.sin(la) * (R * 1.1 + g.leader * s)); ctx.stroke();
  ctx.restore(); }

/* ================================================================== THE STEPPING MARK (pure state; used by the arc and by the timing measurement)
   step(i): the mark blinks out for blinkFrames/24 s, comes back at marks[i], then eases on by 'drift' degrees */
function MarkState(gs) { this.g = gs; this.i = 0; this.ang = gs.marks[0]; this.blink = 0; this.since = 9; this.from = gs.marks[0]; }
MarkState.prototype.step = function (i) { i = clamp(i | 0, 0, this.g.marks.length - 1); if (i === this.i && this.blink <= 0) return; this.i = i; this.blink = this.g.blinkFrames / 24; this.since = -this.blink; };
MarkState.prototype.update = function (dt) { this.blink -= dt; this.since += dt; const base = this.g.marks[this.i]; const u = clamp(this.since / this.g.driftTime, 0, 1); this.ang = base + (this.since > 0 ? this.g.drift * (1 - Math.pow(1 - u, 2)) : 0); return this.blink > 0 ? null : this.ang; };

/* ================================================================== 3D (three.js r128 if present)
   Sprites carry a canvas drawn by the 2D renderers at 'ss' pixels per film pixel. */
const LIVE = new Set(); let ticking = false, lastT = 0;
function tickAll(t) { const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016); lastT = t; LIVE.forEach(o => { try { o._auto && o.update(dt); } catch (e) { } }); if (LIVE.size) requestAnimationFrame(tickAll); else { ticking = false; lastT = 0; } }
function live(o) { LIVE.add(o); if (!ticking && hasDOM && typeof requestAnimationFrame === 'function') { ticking = true; requestAnimationFrame(tickAll); } }
function three() { return root.THREE || null; }
function spriteFor(scene, cw, ch, worldH) { const T = three(); const c = document.createElement('canvas'); c.width = cw; c.height = ch; const tex = new T.CanvasTexture(c); if (T.sRGBEncoding) tex.encoding = T.sRGBEncoding;
  const m = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, opacity: 1, blending: T.AdditiveBlending }); const s = new T.Sprite(m); s.scale.set(worldH * cw / ch, worldH, 1); s.renderOrder = 6; if (scene) scene.add(s); return { c, x: c.getContext('2d'), tex, s }; }
function anchorPos(anchor, out) { if (!anchor) return out.set(0, 0, 0); if (anchor.isVector3) return out.copy(anchor); if (anchor.getWorldPosition) return anchor.getWorldPosition(out); return out.set(anchor.x || 0, anchor.y || 0, anchor.z || 0); }

/* HOLO.arc: beside the cake at candle height, open toward it. opts: { genome, size (world height of the arc), offset (world units to the side), side (+1 right of the anchor as seen, -1 left), camera, follow } */
function arc(scene, anchor, opts) {
  opts = opts || {}; const G = merge(GENOME, opts.genome); const g = G.arc; const T = three(); const ss = opts.ss || 3;
  const half = (g.R + g.tickLen + g.tickDots * g.tickGap + 14), W = Math.ceil(half * 2 * ss), H = Math.ceil((g.R + 10) * 2 * ss);
  const size = opts.size || 0.2, sp = T ? spriteFor(scene, W, H, size * H / (g.R * 2 * ss)) : null;
  const ms = new MarkState(G.steps); const nSeg = g.gaps.filter(a => a > g.a0 && a < g.a1).length + 1;
  const o = { object: sp && sp.s, canvas: sp && sp.c, genome: G, mark: ms, alpha: 0, want: opts.visible === false ? 0 : 1, segOn: new Array(nSeg).fill(1), _off: null, _auto: true, side: opts.side || 1, flicker: 0,
    step(i) { ms.step(i); this.want = 1; this.flicker = 0.12; return this; }, setMark(deg) { ms.g = Object.assign({}, ms.g, { marks: ms.g.marks.map((m, k) => k === ms.i ? deg : m) }); return this; },
    show(on) { this.want = on ? 1 : 0; if (on) { this._off = null; this.segOn.fill(1); } return this; },
    off(dur) { this._off = { t: 0, dur: dur || 0.9, order: this.segOn.map((_, i) => nSeg - 1 - i) }; return this; },   // banks of neon: segments go out one after another from the lower end, each with a stutter
    update(dt, camera) { ms.update(dt); this.alpha = lerp(this.alpha, this.want, Math.min(1, dt * 8)); this.flicker = Math.max(0, this.flicker - dt);
      if (this._off) { const f = this._off; f.t += dt; this.segOn = this.segOn.map((_, i) => { const t0 = f.order[i] / nSeg * f.dur * 0.8, u = (f.t - t0) / 0.12; return u < 0 ? 1 : u > 1 ? 0 : (Math.sin(u * 40) > 0 ? 0.9 : 0.15) * (1 - u); }); if (f.t > f.dur) { this.want = 0; this.alpha = 0; } }
      if (sp) { if (opts.follow !== false && anchor && T && (camera || opts.camera)) { const cam = camera || opts.camera, p = anchorPos(anchor, new T.Vector3()), right = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion); sp.s.position.copy(p).addScaledVector(right, this.side * (opts.offset || size * 1.45)); }
        sp.s.material.opacity = 1; sp.s.visible = this.alpha > 0.01; if (sp.s.visible) this.draw(); } return this; },
    draw() { const x = sp.x; x.clearRect(0, 0, W, H); x.save(); if (this.side < 0) { x.translate(W, 0); x.scale(-1, 1); } const fl = this.flicker > 0 ? 0.82 + 0.18 * Math.sin(this.flicker * 160) : 1;
      drawArc(x, W / 2 - (g.tickLen + g.tickDots * g.tickGap) * ss * 0.5, H / 2, ss, g, { mark: ms.blink > 0 ? null : ms.ang, alpha: this.alpha * fl, segOn: this.segOn }); x.restore(); sp.tex.needsUpdate = true; },
    dispose() { LIVE.delete(this); if (sp) { scene && scene.remove(sp.s); sp.tex.dispose(); sp.s.material.dispose(); } } };
  if (sp && anchor && (anchor.isVector3 || !opts.camera)) { const p = anchorPos(anchor, new T.Vector3()); sp.s.position.copy(p).add(new T.Vector3(o.side * (opts.offset || size * 1.45), 0, 0)); }
  if (opts.auto !== false) live(o); return o;
}
/* HOLO.readout: between the cake and the arc, a little below its centre. .type(lines) queues lines (strings or counts); .feed(px) types px more (e.g. per machine step) */
function readout(scene, anchor, opts) {
  opts = opts || {}; const G = merge(GENOME, opts.genome), g = G.readout, T = three(), ss = opts.ss || 4, rnd = prng(opts.seed || 7);
  const W = Math.ceil((g.lineW + 8) * ss), H = Math.ceil((g.lineGap * g.maxLines + 4) * ss), size = opts.size || 0.2;
  const k = size / (2 * G.arc.R), sp = T ? spriteFor(scene, W, H, (g.lineGap * g.maxLines + 4) * k) : null;   // same film-pixel scale as the arc
  const o = { object: sp && sp.s, canvas: sp && sp.c, genome: G, lines: [], typed: 0, queue: 0, alpha: 0, want: 1, clearAt: -1, _auto: opts.typeAuto !== false, side: opts.side || 1, t: 0, burstT: 0,
    type(lines) { const n = typeof lines === 'number' ? lines : Array.isArray(lines) ? lines.length : 1; this.queue += n; this.want = 1; return this; },
    feed(px) { if (!this.lines.length) this.newLine(); this.typed += px; this.wrap(); this.want = 1; return this; },
    newLine() { if (this.lines.length >= g.maxLines) this.lines = []; this.lines.push(makeLine(g, rnd)); this.typed = 0; },
    wrap() { const last = this.lines[this.lines.length - 1]; if (last && this.typed >= lineLength(last, g)) { if (this.queue > 0) this.queue--; if (this.lines.length >= g.maxLines) { this.clearAt = this.t + g.clearHold; } else this.newLine(); } },
    clear() { this.lines = []; this.typed = 0; this.queue = 0; return this; }, show(on) { this.want = on ? 1 : 0; return this; },
    update(dt, camera) { this.t += dt; this.alpha = lerp(this.alpha, this.want, Math.min(1, dt * 8));
      if (this.clearAt >= 0 && this.t >= this.clearAt) { this.clearAt = -1; this.lines = []; if (this.queue > 0) this.newLine(); }
      else if (this.queue > 0 && this.clearAt < 0) { if (!this.lines.length) this.newLine(); this.burstT += dt; while (this.burstT >= g.burst) { this.burstT -= g.burst; this.typed += g.typeRate * g.burst; this.wrap(); } }
      if (sp) { if (anchor && T && (camera || opts.camera)) { const cam = camera || opts.camera, p = anchorPos(anchor, new T.Vector3()), right = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion); sp.s.position.copy(p).addScaledVector(right, this.side * (opts.offset || size * 0.85)).add(new T.Vector3(0, -size * 0.12, 0)); }
        sp.s.visible = this.alpha > 0.01 && this.lines.length > 0; if (sp.s.visible) { const x = sp.x; x.clearRect(0, 0, W, H); drawReadout(x, 4 * ss, (2 + g.lineGap / 2) * ss, ss, g, this.lines, this.typed, this.alpha); sp.tex.needsUpdate = true; } } return this; },
    dispose() { LIVE.delete(this); if (sp) { scene && scene.remove(sp.s); sp.tex.dispose(); } } };
  if (sp && anchor && anchor.isVector3) sp.s.position.copy(anchor).add(new T.Vector3(o.side * (opts.offset || size * 0.85), -size * 0.12, 0));
  if (opts.auto !== false) live(o); return o;
}
/* HOLO.childMark: above and to one side of a child's head while she arrives; gone once she is solid. show(p): p = arrival 0..1 (1 = solid, mark goes) */
function childMark(scene, target, opts) {
  opts = opts || {}; const G = merge(GENOME, opts.genome), g = G.child, T = three(), ss = opts.ss || 4, size = opts.size || 0.06;
  const W = Math.ceil((g.R * 4.4 + g.leader) * ss), H = Math.ceil((g.R * 2 + g.leader + 6) * ss); const sp = T ? spriteFor(scene, W, H, size * H / (g.R * 2 * ss)) : null;
  const o = { object: sp && sp.s, canvas: sp && sp.c, alpha: 0, want: 0, _auto: true,
    show(p) { this.want = p > 0 && p < 1 ? 1 : 0; return this; },
    update(dt, camera) { this.alpha = lerp(this.alpha, this.want, Math.min(1, dt * 8)); if (!sp) return this;
      if (target && T) { const p = anchorPos(target, new T.Vector3()); const cam = camera || opts.camera; const right = cam ? new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion) : new T.Vector3(1, 0, 0); sp.s.position.copy(p).addScaledVector(right, size * 0.6).add(new T.Vector3(0, size * 0.9, 0)); }
      sp.s.visible = this.alpha > 0.01; if (sp.s.visible) { const x = sp.x; x.clearRect(0, 0, W, H); drawChildMark(x, W - (g.R * 1.3) * ss, (g.R + 3) * ss, ss, g, this.alpha); sp.tex.needsUpdate = true; } return this; },
    dispose() { LIVE.delete(this); if (sp) { scene && scene.remove(sp.s); sp.tex.dispose(); } } };
  if (opts.auto !== false) live(o); return o;
}
/* HOLO.spots: matter switches on and off as round spots of light; switching off goes in banks ordered by distance (a corridor of neon going dark).
   Patches every material under root (MeshStandard/Basic/Phong/Lambert). k: 1 whole, 0 gone. */
function spots(rootObj, opts) {
  opts = opts || {}; const T = three(); if (!T) return null; const U = { uRev: { value: opts.k == null ? 1 : opts.k }, uRevO: { value: new T.Vector3() }, uRevD: { value: 0 }, uCell: { value: opts.cell || 160 }, uFl: { value: 0 }, uTime: { value: 0 } };
  const patch = mat => { if (!mat || mat.userData.holoSpots) return; mat.userData.holoSpots = true; const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vHW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vHW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform float uRev, uRevD, uCell, uFl, uTime; uniform vec3 uRevO; varying vec3 vHW;\nfloat hh(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\n'
        + sh.fragmentShader.replace('void main() {', 'void main() {\n float spotG = 0.0; if (uRev < 0.999) { vec3 gq = vHW * uCell; vec3 cid = floor(gq); float cell = hh(cid); float th = mix(cell, clamp(length(vHW - uRevO) / 1.1, 0.0, 1.0) * 0.85 + cell * 0.15, uRevD) * 0.8 + 0.02; float r = clamp((uRev - th) / 0.18, 0.0, 1.0); float dd = length(fract(gq) - 0.5); if (dd > r * 0.87) discard; spotG = (1.0 - r) * (1.0 - smoothstep(0.0, 0.5, dd)) + 0.25 * (1.0 - r); }')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb += spotG * vec3(1.0, 0.86, 0.62) * 1.6;\n if (uFl > 0.001) { float v = 0.82 + 0.18 * sin(uTime * 95.0) * sin(uTime * 37.0); vec3 hue = mix(vec3(0.82, 0.86, 0.9), vec3(1.0, 0.98, 0.94), smoothstep(0.5, 1.0, uFl)); gl_FragColor.rgb = mix(gl_FragColor.rgb, hue * 1.6 * v, uFl * 0.85); }'); };
    const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => ''; mat.customProgramCacheKey = () => key() + '|holospots'; mat.needsUpdate = true; };
  const each = () => rootObj.traverse(x => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; ms.forEach(patch); });
  each(); const o = { uniforms: U, k: U.uRev.value, anim: null, _auto: true,
    set(k) { this.k = U.uRev.value = clamp(k, 0, 1); return this; },
    on(dur, origin) { each(); this.anim = { from: this.k, to: 1, t: 0, dur: dur || 0.8 }; U.uRevD.value = 0; return this; },
    off(dur, o2) { o2 = o2 || {}; each(); this.anim = { from: this.k, to: 0, t: 0, dur: dur || 1.6 }; U.uRevD.value = o2.banks === false ? 0 : 1; if (o2.origin) U.uRevO.value.copy(o2.origin); return this; },
    flash() { U.uFl.value = 1; return this; },   // magnesium-flash decay after a change: silver, three frames, then gone
    update(dt) { U.uTime.value += dt; if (U.uFl.value > 0) U.uFl.value = Math.max(0, U.uFl.value - dt / 0.125); if (this.anim) { const a = this.anim; a.t += dt; const u = clamp(a.t / a.dur, 0, 1), e = u * u * (3 - 2 * u); this.set(lerp(a.from, a.to, e)); if (u >= 1) this.anim = null; } return this; },
    dispose() { LIVE.delete(this); } };
  if (opts.auto !== false) live(o); return o;
}

/* ================================================================== SOUND: the device's own grains (ana/device-sounds.wav) if present, otherwise synthesized */
const SPR = { click: [[0, .065], [.115, .065], [.23, .065], [.345, .065], [.46, .065], [.575, .065], [.69, .065], [.805, .065], [.92, .065]], ratchet: [[1.035, .05], [1.135, .05], [1.235, .05], [1.335, .05]], tick: [[1.435, .04], [1.525, .04]], comb: [[1.615, .37]], whirr: [[2.035, .62]] };
const sound = { ac: null, buf: null, muted: false, urls: ['device-sounds.wav', '../../../ana/device-sounds.wav', '../../ana/device-sounds.wav', '../ana/device-sounds.wav', '/ana/device-sounds.wav', '../../../cineosis-orb/cut/device-sounds.wav'], log: null, gd: GENOME.device,
  ctx() { if (!hasDOM) return null; if (!this.ac) { const A = root.AudioContext || root.webkitAudioContext; if (!A) return null; this.ac = new A(); this.load(); } if (this.ac.state === 'suspended') this.ac.resume(); return this.ac; },
  load() { const a = this.ac; const tryU = i => { if (i >= this.urls.length) return; fetch(this.urls[i]).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => a.decodeAudioData(b)).then(b => { this.buf = b; this.src = this.urls[i]; }).catch(() => tryU(i + 1)); }; tryU(0); },
  noise(len) { const a = this.ac, b = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = a.createBufferSource(); s.buffer = b; return s; },
  grain(kind, rate, vol) { if (this.log) this.log.push({ kind, rate, vol, t: (this.ac && this.ac.currentTime) || 0 }); if (this.muted) return; const a = this.ctx(); if (!a) return;
    if (this.buf) { const set = SPR[kind], [o, d] = set[Math.floor(Math.random() * set.length)], s = a.createBufferSource(); s.buffer = this.buf; s.playbackRate.value = rate || 1; const g = a.createGain(); g.gain.value = vol == null ? .8 : vol; s.connect(g).connect(a.destination); s.start(0, o, d); return; }
    const s = this.noise(.05), f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = kind === 'tick' ? 6000 : 2600 * (rate || 1); f.Q.value = 2.2; const g = a.createGain(), t = a.currentTime; g.gain.setValueAtTime(vol == null ? .7 : vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); s.connect(f).connect(g).connect(a.destination); s.start(); },
  step(fast, ring) { try { this.grain('click', this.gd.clickRate * (fast ? 1.08 : 1) * (1 + (ring - 1) * .045 + (Math.random() - .5) * .02), fast ? this.gd.fastGain : this.gd.stepGain); } catch (e) { } },
  hand(ring) { try { this.grain('click', this.gd.handRate + ring * .03, this.gd.handGain); } catch (e) { } },
  wash(v) { if (this.log) this.log.push({ kind: 'wash' }); if (this.muted) return; try { const a = this.ctx(); if (!a) return; const s = this.noise(.6), f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2200; const g = a.createGain(), t = a.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22 * (v || 1), t + .06); g.gain.exponentialRampToValueAtTime(.001, t + .55); s.connect(f).connect(g).connect(a.destination); s.start(); if (this.buf && Math.random() < .6) this.grain('comb', 1, .25); } catch (e) { } },
  sweep() { if (this.log) this.log.push({ kind: 'sweep' }); if (this.muted) return; try { const a = this.ctx(); if (!a) return; const t = a.currentTime; [0, .18, .36].forEach((d, i) => { const o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(6000 + i * 300, t + d); o.frequency.exponentialRampToValueAtTime(11500 + i * 200, t + d + 1.1); g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.025, t + d + .08); g.gain.linearRampToValueAtTime(0, t + d + 1.1); o.connect(g).connect(a.destination); o.start(t + d); o.stop(t + d + 1.2); }); } catch (e) { } },
  select() { if (this.log) this.log.push({ kind: 'select' }); if (this.muted) return; try { const a = this.ctx(); if (!a) return; const t = a.currentTime; for (let k = 0; k < 5; k++) { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 12000; g.gain.setValueAtTime(0, t + k * .055); g.gain.linearRampToValueAtTime(.03, t + k * .055 + .004); g.gain.linearRampToValueAtTime(0, t + k * .055 + .03); o.connect(g).connect(a.destination); o.start(t + k * .055); o.stop(t + k * .055 + .04); } } catch (e) { } }
};

/* ================================================================== THE MACHINE (DOM-free): a hand turn sets a target in detents with quiet irregular clicks;
   when the hand stops, the machine steps the applied value to it at a fixed rate (11.8/s; double when far behind), one click a step. */
function Machine(gd, rings) {
  this.g = Object.assign({}, GENOME.device, gd || {}); this.clock = 0; this.t = 0; this.handT = -9; this.listeners = {};
  this.rings = (rings || [{ id: 'scale', min: -36, max: 36 }, { id: 'knurl', min: 0, max: 24 }, { id: 'tri', min: -12, max: 12 }]).map((r, i) => Object.assign({ ix: i, ang: 0, target: 0, applied: 0, deg: r.deg || this.g.detentDeg }, r));
}
Machine.prototype.on = function (ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return this; };
Machine.prototype.emit = function (ev, a, b) { (this.listeners[ev] || []).forEach(f => f(a, b)); };
Machine.prototype.ring = function (id) { return typeof id === 'number' ? this.rings[id] : this.rings.find(r => r.id === id); };
Machine.prototype.setRange = function (id, lo, hi) { const r = this.ring(id); r.min = lo; r.max = hi; r.target = clamp(r.target, lo, hi); r.applied = clamp(r.applied, lo, hi); r.ang = clamp(r.ang, lo * r.deg, hi * r.deg); };
Machine.prototype.setValue = function (id, v) { const r = this.ring(id); r.target = r.applied = clamp(Math.round(v), r.min, r.max); r.ang = r.target * r.deg; };
// the hand turns a ring by dDeg; each detent passed is one quiet click and moves the target
Machine.prototype.turn = function (id, dDeg) { const r = this.ring(id); const before = Math.round(r.ang / r.deg); r.ang = clamp(r.ang + dDeg, r.min * r.deg, r.max * r.deg); const after = Math.round(r.ang / r.deg);
  if (after !== before) { r.target = clamp(after, r.min, r.max); this.handT = this.t; this.emit('hand', r, after - before); } };
Machine.prototype.update = function (dt) { this.t += dt; const busy = this.rings.filter(r => r.target !== r.applied); if (!busy.length) { this.clock = 0; this.run = 0; return; }
  if (this.t - this.handT < this.g.latency) { this.clock = 0; this.run = 0; return; }   // the machine waits for the hand to settle
  // a train starts at the fixed rate and, after fastAfter steps, doubles (forest close-up: ten at 11.8/s, then ~24/s)
  const period = () => 1 / ((this.run || 0) >= this.g.fastAfter ? this.g.fastRate : this.g.rate);
  if (!this.run) { this.clock = period(); this.run = 0; } else this.clock += dt;
  while (this.clock >= period()) { this.clock -= period(); const fast = this.run >= this.g.fastAfter; this.run++;
    busy.forEach(r => { if (r.target === r.applied) return; r.applied += Math.sign(r.target - r.applied); this.emit('step', r, fast); });
    if (busy.every(r => r.target === r.applied)) { this.clock = 0; this.run = 0; break; } } };

/* ================================================================== THE DEVICE: the barrel in her hands, drawn as the game controller
   Rings from left: SCALE (full-circle numbered, 00 18 35 ... 220 255 280 300), red index lines, KNURL, TRIANGLES (two rows), CHROME band, grip with SELECT and HOLD. */
const SCALE_NUMS = [[0, '00'], [18, '18'], [35, '35'], [60, '60'], [90, '90'], [120, '120'], [150, '150'], [180, '180'], [220, '220'], [255, '255'], [280, '280'], [300, '300'], [330, '330']];
function device(canvas, opts) {
  opts = opts || {}; const G = merge(GENOME, opts.genome); const M = new Machine(G.device, opts.rings); sound.gd = G.device; const dx = canvas.getContext('2d'); let DW = 0, DH = 0, BANDS = [], BTNS = [], drag = null, holdDown = -1;
  const labels = Object.assign({ scale: ['WHERE YOU KNEEL', v => `${v * 5}°`], knurl: ['VALUE', v => String(v)], tri: ['TILT', v => String(v)] }, opts.labels || {});
  const ctl = { machine: M, rings: M.rings, hold: false, target: 0, targets: opts.targets || ['CAKE'], status: '', listeners: {}, mode: 'YOURS',
    on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return this; }, emit(ev, a, b) { (this.listeners[ev] || []).forEach(f => f(a, b)); },
    select(i, silent) { this.target = ((i % this.targets.length) + this.targets.length) % this.targets.length; if (!silent) sound.select(); this.emit('select', this.target, this.targets[this.target]); },
    setRange(id, lo, hi) { M.setRange(id, lo, hi); }, setValue(id, v) { M.setValue(id, v); }, turn(id, d) { M.turn(id, d); }, value(id) { return M.ring(id).applied; },
    setLabel(id, name, fmt) { labels[id] = [name, fmt || (v => String(v))]; },
    press(id, down) { sound.ctx(); if (id === 'select') { this.select(this.target + 1); } else if (id === 'hold') { if (down) holdDown = M.t; else { const long = M.t - holdDown > 0.7; holdDown = -1; if (long) { sound.wash(1.2); this.emit('off'); } else { this.hold = !this.hold; sound.step(false, 2); this.emit('hold', this.hold); } } } else this.emit('button', id); },
    update(dt) { M.update(dt); draw(); }, layout, draw, sound, _auto: opts.auto !== false };
  M.on('hand', (r) => { sound.hand(r.ix); ctl.emit('hand', r.id, r.target); });
  M.on('step', (r, fast) => { sound.step(fast, r.ix); ctl.emit('step', r.id, r.applied, fast); ctl.emit('ring', r.id, r.applied); });
  function layout() { const r = canvas.getBoundingClientRect(), pr = Math.min(2, root.devicePixelRatio || 1); DW = r.width || canvas.width; DH = r.height || canvas.height; canvas.width = Math.round(DW * pr); canvas.height = Math.round(DH * pr); dx.setTransform(pr, 0, 0, pr, 0, 0);
    const L = Math.min(DW - 24, 980), x0 = (DW - L) / 2, cy = DH * .42, rad = Math.min(DH * .3, L * .13); const w = f => f * L; let x = x0;
    const seg = (kind, f, extra) => { const b = Object.assign({ kind, x, w: w(f), cy, rad }, extra || {}); x += w(f); return b; };
    BANDS = [seg('collarL', .1), seg('scale', .2, { ring: M.rings[0] }), seg('redline', .05), seg('knurl', .14, { ring: M.rings[1] }), seg('tri', .2, { ring: M.rings[2] }), seg('chrome', .07), seg('collarR', .24)];
    const cl = BANDS[0], cr = BANDS[6]; BTNS = [{ id: 'aux1', x: cl.x + cl.w * .5, y: cy - rad * .42, r: rad * .17 }, { id: 'aux2', x: cl.x + cl.w * .5, y: cy + rad * .42, r: rad * .17 },
      { id: 'select', x: cr.x + cr.w * .3, y: cy - rad * .42, r: rad * .21 }, { id: 'hold', x: cr.x + cr.w * .3, y: cy + rad * .42, r: rad * .25 }, { id: 'info', x: cr.x + cr.w * .86, y: cy - rad * .8, r: rad * .12 }]; }
  const shade = (b, base, hi) => { const g = dx.createLinearGradient(0, b.cy - b.rad, 0, b.cy + b.rad); g.addColorStop(0, '#0b0c0c'); g.addColorStop(.18, base); g.addColorStop(.42, hi); g.addColorStop(.62, base); g.addColorStop(1, '#070807'); return g; };
  const marksOn = (b, ang, list) => list.forEach(([a, fn]) => { const th = (a - ang) * D2R, c = Math.cos(th); if (c <= .05) return; fn(b.cy - Math.sin(th) * b.rad * .92, c); });
  const fit = (s, x, y, w, px, col, wt) => { let f = px; dx.font = `${wt || 500} ${f}px Oswald, 'Arial Narrow', sans-serif`; while (dx.measureText(s).width > w && f > 7) { f -= 1; dx.font = `${wt || 500} ${f}px Oswald, 'Arial Narrow', sans-serif`; } dx.fillStyle = col; dx.fillText(s, x, y); };
  function draw() { if (!DW) layout(); dx.clearRect(0, 0, DW, DH);
    BANDS.forEach(b => { const top = b.cy - b.rad, h = b.rad * 2, ang = b.ring ? b.ring.ang : 0;
      if (b.kind === 'collarL' || b.kind === 'collarR') { dx.fillStyle = shade(b, '#3c4341', '#a9b2af'); dx.fillRect(b.x, top + h * .04, b.w, h * .92); dx.fillStyle = 'rgba(0,0,0,.35)'; dx.fillRect(b.kind === 'collarL' ? b.x + b.w - 2 : b.x, top + h * .04, 2, h * .92); }
      else if (b.kind === 'scale') { dx.fillStyle = shade(b, '#1b1f1e', '#525a58'); dx.fillRect(b.x, top, b.w, h); dx.textAlign = 'center'; dx.textBaseline = 'middle';
        marksOn(b, ang, SCALE_NUMS.map(([a, s]) => [-a, (y, c) => { dx.save(); dx.translate(b.x + b.w * .52, y); dx.scale(1, c); dx.fillStyle = `rgba(232,238,236,${.3 + .65 * c})`; dx.font = `400 ${Math.round(b.rad * .27)}px Oswald, 'Arial Narrow', sans-serif`; dx.fillText(s, 0, 0); dx.fillRect(-b.w * .44, -.8, b.w * .12, 1.6); dx.restore(); }]));
        for (let a = 0; a < 360; a += 5) marksOn(b, ang, [[-a, (y, c) => { dx.fillStyle = `rgba(200,210,206,${.32 * c})`; dx.fillRect(b.x + b.w * .86, y - .5, b.w * (a % 15 ? .06 : .12), 1); }]]); }
      else if (b.kind === 'redline') { dx.fillStyle = shade(b, '#2a302e', '#78817e'); dx.fillRect(b.x, top, b.w, h); dx.fillStyle = '#c2453a'; for (let k = -3; k <= 3; k++) { const y = b.cy - Math.sin(k * .38) * b.rad * .9; dx.fillRect(b.x + b.w * .22, y - .8, b.w * .56, 1.6); } }
      else if (b.kind === 'knurl') { dx.fillStyle = shade(b, '#262b2a', '#7a8481'); dx.fillRect(b.x, top, b.w, h); for (let a = 0; a < 360; a += 3.6) marksOn(b, ang, [[a, (y, c) => { dx.fillStyle = `rgba(6,7,7,${.6 * c})`; dx.fillRect(b.x + 3, y - 1 * c, b.w - 6, 2 * c); dx.fillStyle = `rgba(210,220,216,${.12 * c})`; dx.fillRect(b.x + 3, y + 1 * c, b.w - 6, .8 * c); }]]); }
      else if (b.kind === 'tri') { dx.fillStyle = shade(b, '#4b5452', '#bcc5c2'); dx.fillRect(b.x, top, b.w, h);
        for (let a = 0; a < 360; a += 10) marksOn(b, ang, [[a, (y, c) => { const s = b.rad * .065 * c; dx.fillStyle = 'rgba(10,11,11,.85)'; [[.3, 1], [.66, 1.35]].forEach(([fx, k]) => { dx.beginPath(); dx.moveTo(b.x + b.w * fx - s * k, y); dx.lineTo(b.x + b.w * fx + s * k * .6, y - s * k * .8); dx.lineTo(b.x + b.w * fx + s * k * .6, y + s * k * .8); dx.fill(); }); dx.fillStyle = `rgba(80,88,86,${.7 * c})`; dx.fillRect(b.x + b.w * .4, y - .5, b.w * .16, 1); }]]); }
      else if (b.kind === 'chrome') { const g = dx.createLinearGradient(b.x, 0, b.x + b.w, 0); g.addColorStop(0, '#dfe5e2'); g.addColorStop(.35, '#8a9491'); g.addColorStop(.55, '#f2f6f4'); g.addColorStop(1, '#6f7976'); dx.fillStyle = g; dx.fillRect(b.x, top + h * .02, b.w, h * .96);
        dx.save(); dx.translate(b.x + b.w * .5, b.cy); dx.rotate(Math.PI / 2); dx.fillStyle = 'rgba(20,22,22,.72)'; dx.font = `500 ${Math.max(7, Math.round(b.rad * .15))}px Oswald, 'Arial Narrow', sans-serif`; dx.textAlign = 'center'; dx.textBaseline = 'middle'; dx.fillText('VR — T–0 — R0', 0, 0); dx.restore(); }
      if (b.ring) { const busy = b.ring.target !== b.ring.applied; dx.fillStyle = busy ? 'rgba(232,178,100,.9)' : 'rgba(200,210,206,.35)'; dx.fillRect(b.x + 4, top - 7, b.w - 8, 2);
        const L = labels[b.ring.id] || [b.ring.id.toUpperCase(), v => String(v)]; dx.textAlign = 'center'; dx.textBaseline = 'alphabetic'; fit(L[0], b.x + b.w / 2, top + h + 15, b.w - 4, 11, 'rgba(120,130,126,.9)'); fit(L[1](b.ring.applied, b.ring.target), b.x + b.w / 2, top + h + 30, b.w - 4, 13, 'rgba(225,232,229,.92)'); } });
    BTNS.forEach(bt => { const g = dx.createRadialGradient(bt.x - bt.r * .3, bt.y - bt.r * .3, 1, bt.x, bt.y, bt.r); g.addColorStop(0, '#e8eeec'); g.addColorStop(.6, '#8f9996'); g.addColorStop(1, '#3a403e'); dx.fillStyle = g; dx.beginPath(); dx.arc(bt.x, bt.y, bt.r, 0, TAU); dx.fill();
      dx.fillStyle = 'rgba(15,16,16,.85)'; if (bt.id === 'info') { dx.fillRect(bt.x - 1, bt.y - bt.r * .1, 2, bt.r * .6); dx.fillRect(bt.x - 1, bt.y - bt.r * .5, 2, 2); }
      if (bt.id === 'hold' && ctl.hold) { dx.strokeStyle = 'rgba(232,178,100,.95)'; dx.lineWidth = 2; dx.beginPath(); dx.arc(bt.x, bt.y, bt.r + 4, 0, TAU); dx.stroke(); }
      if (bt.id === 'hold' && holdDown >= 0) { const u = clamp((M.t - holdDown) / .7, 0, 1); dx.strokeStyle = 'rgba(232,178,100,.9)'; dx.lineWidth = 2; dx.beginPath(); dx.arc(bt.x, bt.y, bt.r + 8, -Math.PI / 2, -Math.PI / 2 + u * TAU); dx.stroke(); }
      dx.textAlign = 'center'; dx.textBaseline = 'middle';
      if (bt.id === 'select') { dx.font = `700 ${Math.round(Math.max(9, bt.r * .55))}px Oswald, 'Arial Narrow', sans-serif`; const w = dx.measureText('SELECT').width + 10, hh = Math.max(13, bt.r * .75), y = bt.y - bt.r - hh * .5 - 5;
        dx.fillStyle = '#d9dcd6'; dx.beginPath(); if (dx.roundRect) dx.roundRect(bt.x - w / 2, y - hh / 2, w, hh, hh * .35); else dx.rect(bt.x - w / 2, y - hh / 2, w, hh); dx.fill(); dx.fillStyle = '#a82c22'; dx.fillText('SELECT', bt.x, y + 1); }
      if (bt.id === 'hold') { dx.font = `700 ${Math.round(Math.max(9, bt.r * .45))}px Oswald, 'Arial Narrow', sans-serif`; dx.fillStyle = 'rgba(170,178,174,.9)'; dx.fillText('HOLD', bt.x, bt.y + bt.r + 11); } });
    const cr = BANDS[6]; dx.textAlign = 'left'; dx.textBaseline = 'alphabetic'; fit(ctl.targets[ctl.target], cr.x + cr.w * .55, cr.cy + 4, cr.w * .44, 13, 'rgba(232,178,100,.92)'); fit(ctl.status || ctl.mode, cr.x + cr.w * .55, cr.cy + 20, cr.w * .44, 11, 'rgba(120,130,126,.85)', 400); }
  // hand on the rings: a vertical drag turns the ring under the finger (the barrel's surface follows the finger); the wheel turns one detent
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', e => { sound.ctx(); const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const bt = BTNS.find(b => Math.hypot(b.x - x, b.y - y) < b.r + 10); if (bt) { ctl.press(bt.id, true); const up = () => { removeEventListener('pointerup', up); ctl.press(bt.id, false); }; addEventListener('pointerup', up); return; }
    const band = BANDS.find(b => b.ring && x >= b.x && x <= b.x + b.w && Math.abs(y - b.cy) < b.rad * 1.25); if (band) { drag = { band, y }; canvas.setPointerCapture(e.pointerId); ctl.emit('grab', band.ring.id); } });
  canvas.addEventListener('pointermove', e => { if (!drag) return; const y = e.clientY - canvas.getBoundingClientRect().top, d = y - drag.y; drag.y = y; M.turn(drag.band.ring.ix, -d / (drag.band.rad * .92) * 57.3); });
  const end = () => { drag = null; }; canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', e => { e.preventDefault(); sound.ctx(); const r = canvas.getBoundingClientRect(), x = e.clientX - r.left; const band = BANDS.find(b => b.ring && x >= b.x && x <= b.x + b.w); if (band) M.turn(band.ring.ix, -Math.sign(e.deltaY) * band.ring.deg); }, { passive: false });
  root.addEventListener && root.addEventListener('resize', () => layout());
  layout(); if (root.document && document.fonts) document.fonts.load('400 20px Oswald').then(draw).catch(() => { });
  if (ctl._auto) live(ctl); return ctl;
}

return { version: '1.0', genome: GENOME, merge, prng, arc, readout, childMark, spots, device, Machine, MarkState, sound, live,
  draw: { arc: drawArc, readout: drawReadout, childMark: drawChildMark, makeLine, lineLength } };
});
