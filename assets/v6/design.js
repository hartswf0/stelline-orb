/* DESIGN: the film re-made from its own pixels.
   For the details she works on (the beetle's eyes, the candles, the writing on the cake, the light on a child's face) every
   frame of the beat carries layers cut from the film itself (tools/design*.py): the frame with its flames out and a wick left,
   the frame with the writing taken off (the cake's top carried from the frame before she wrote, by the top's own plane),
   each eye sharp (the frame's own eye with the detail of the nearest frame where that eye was in focus) and soft.
   Turning a facet mixes those layers per pixel. New writing is piped in the film's icing colour, in the cake's own light,
   on the plane of the film's writing. The candle light on faces is taken out the way the film takes it out when the
   candles are blown at 03:46: the warm light falls (red to .41, green to .34, blue to .15) where the frame was lit by it. */
(function () {
  const WORDS = ['FILM', '生日', '快乐', '乐', '快乐快乐', '安娜', 'JOE', 'ANA', '2049'];
  const BEATS = {
    7: { part: 'beetle', facets: [['focusR', 'RIGHT EYE', 0, 1], ['focusL', 'LEFT EYE', 0, 1]], layers: ['s', 'b', 'l'] },
    27: { part: 'cake', total: 7, facets: [['lit', 'FLAMES', 0, 7, 1], ['words', 'WRITING', 0, WORDS.length - 1, 1, WORDS], ['pipe', 'PIPING', 0, 1]], layers: ['a', 'l'] },
    29: { part: 'cake', total: 7, facets: [['lit', 'FLAMES', 0, 7, 1]], layers: ['a', 'l'] },
    36: { part: 'boy', total: 1, facets: [['lit', 'FLAME', 0, 1, 1]], layers: ['a', 'l'] },
    44: { part: 'cake', total: 6, facets: [['lit', 'FLAMES', 0, 6, 1]], layers: ['a', 'l'] }
  };
  const D = window.DESIGN = { WORDS, BEATS, meta: {}, base: '' };
  const p2 = v => String(v).padStart(2, '0'), imgs = new Map();
  let onload = () => { };
  function img(src) { if (imgs.has(src)) return imgs.get(src); const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { im.ok = true; onload(); }; im.src = src; imgs.set(src, im); return im; }
  D.init = (base, cb) => { D.base = base; onload = cb || onload; fetch(base + 'design/glyphs27.json').then(r => r.json()).then(g => { D.glyphs = g; D.gimg = img(base + 'design/glyphs27.png'); onload(); }).catch(() => { }); for (const n of Object.keys(BEATS)) if (BEATS[n].layers.length) fetch(base + 'design/d' + p2(n) + '.json').then(r => r.json()).then(m => { D.meta[n] = m; onload(); }).catch(() => { }); };
  D.has = n => !!BEATS[n];
  D.facets = n => (BEATS[n] ? BEATS[n].facets : []);
  D.part = n => BEATS[n] && BEATS[n].part;
  const state = n => (window.CORE.ST.design[n] || (window.CORE.ST.design[n] = {}));
  // the value the film itself has at this frame, for a facet the user has not turned
  D.canon = (n, k, j) => { const m = D.meta[n], B = BEATS[n];
    if (k === 'focusR' || k === 'focusL') return m ? m.focus[k === 'focusR' ? 'R' : 'L'][j] : .5;
    if (k === 'lit') return B.total; if (k === 'words') return 0; if (k === 'pipe') return 1; if (k === 'light') return 1; return 0; };
  D.get = (n, k, j) => { const s = state(n); return s[k] != null ? s[k] : D.canon(n, k, j); };
  D.set = (n, k, v) => { state(n)[k] = v; D.ver++; };
  D.reset = n => { window.CORE.ST.design[n] = {}; D.ver++; };
  D.ver = 0;
  // is anything turned away from the film in this beat?
  D.active = n => { const s = window.CORE.ST.design[n]; return !!(s && Object.keys(s).some(k => s[k] != null)); };
  // which writings are the film's own piped characters re-set, and which are typed in a piped hand (the critic can still tell those)
  D.filmWord = w => [...w].every(ch => '生日快乐'.includes(ch));
  D.describe = n => { const s = window.CORE.ST.design[n] || {}, B = BEATS[n]; if (!B) return ''; return B.facets.filter(f => s[f[0]] != null).map(f => f[1].toLowerCase() + ' ' + (f[5] ? f[5][Math.round(s[f[0]])] : f[4] ? Math.round(s[f[0]]) : Math.round(s[f[0]] * 100) + '%')).join(', '); };

  /* ---- rendering a designed frame ---- */
  const cache = new Map();
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function pixels(im, w, h) { const c = canvas(w, h), x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; }
  // the candle light model, learned from the film's own blow-out (03:46.5 to 03:48.9): where warm light falls, it is the candles'
  const OFF = [.41, .34, .15];
  // the room has no other warm light: every pixel loses some, the ones near the flames and lit warm lose most; highlights go with them
  function relight(d, L, fl) {
    if (Math.abs(L - 1) < .01) return; let fx = 0, fy = 0; for (const f of fl) { fx += f[0]; fy += f[1]; } if (fl.length) { fx /= fl.length; fy /= fl.length; } else { fx = 320; fy = 260; }
    for (let y = 0; y < 360; y++) for (let x = 0; x < 640; x++) { const i = (y * 640 + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2], lum = .3 * r + .59 * g + .11 * b;
      const warm = Math.max(0, Math.min(1, (r - b) / (r + 8) * 1.35 - .12)), near = Math.exp(-((x - fx) ** 2 + (y - fy) ** 2) / (2 * 260 * 260));
      const cool = b > r ? Math.min(1, (b - r) / 25) : 0, c = Math.min(1, (.35 + .65 * warm) * (.7 + .3 * near) * Math.min(1, lum / 40 + .35)) * (1 - cool), k = (1 - L) * c, hi = lum > 170 ? (lum - 170) / 85 * k * .5 : 0;
      d[i] = r * (1 - k * (1 - OFF[0])) * (1 - hi); d[i + 1] = g * (1 - k * (1 - OFF[1])) * (1 - hi); d[i + 2] = b * (1 - k * (1 - OFF[2])) * (1 - hi); } }
  // icing piped onto the plane of the film's writing
  function pipe(d, q, text, p) {
    const TL = q[0], TR = q[1], BL = q[3], u = [TR[0] - TL[0], TR[1] - TL[1]], v = [BL[0] - TL[0], BL[1] - TL[1]], w = Math.hypot(...u), h = Math.hypot(...v), S = 6;
    const W = Math.ceil(w * S), H = Math.ceil(h * S), tc = canvas(W, Math.ceil(H * 1.7)), x = tc.getContext('2d');
    x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineJoin = 'round'; x.lineCap = 'round'; x.textBaseline = 'middle'; x.textAlign = 'center';
    const latin = /^[A-Z0-9 ]+$/.test(text); x.font = '400 ' + Math.round(H * (latin ? .8 : .78)) + 'px "Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Arial Rounded MT Bold",sans-serif';
    // piped by hand: each character a little turned and lifted, the line a little thick, as the film's are
    const chars = [...text], cw = chars.map(ch => x.measureText(ch).width), gap = H * .06, tw = cw.reduce((a, b) => a + b, 0) + gap * (chars.length - 1), k = Math.min(1.7, W * (chars.length < 2 ? .4 : chars.length < 3 ? .7 : .92) / tw);
    let seed = 0; for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) % 9973; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let cx = W / 2 - tw * k / 2; const shown = tw * k * p; x.lineWidth = H * .11;
    chars.forEach((ch, i) => { const w0 = cw[i] * k; if (cx - (W / 2 - tw * k / 2) < shown) { x.save(); x.beginPath(); x.rect(0, 0, (W / 2 - tw * k / 2) + shown, H); x.clip();
        x.translate(cx + w0 / 2, H * .54 + (rnd() - .5) * H * .08); x.rotate((rnd() - .5) * .14); x.scale(k * (.94 + rnd() * .1), .96 + rnd() * .08); x.strokeText(ch, 0, 0); x.fillText(ch, 0, 0); x.restore(); } cx += w0 + gap * k; });
    // the underline, as she pipes it: across, back down to the left, across again (a Z), drawn as the hand goes
    if (p > .86) { const e = Math.min(1, (p - .86) / .14), x0 = W / 2 - tw * k * .48, x1 = W / 2 + tw * k * .5, P = [[x0 + W * .12, H * 1.02], [x1, H * .96], [x0 + W * .22, H * 1.52], [x1 + W * .04, H * 1.4]];
      x.lineWidth = H * .1; x.beginPath(); x.moveTo(...P[0]); let L = 0; const seg = [1, 2, 3].map(i => Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])), tot = seg.reduce((a, b) => a + b, 0) * e;
      for (let i = 1; i < 4; i++) { const r = Math.min(1, Math.max(0, (tot - L) / seg[i - 1])); if (r <= 0) break; x.lineTo(P[i - 1][0] + (P[i][0] - P[i - 1][0]) * r, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * r); L += seg[i - 1]; } x.stroke(); }
    const A = x.getImageData(0, 0, W, tc.height).data, a = (sx, sy) => { sx = Math.max(0, Math.min(W - 1, sx | 0)); sy = Math.max(0, Math.min(tc.height - 1, sy | 0)); return A[(sy * W + sx) * 4 + 3] / 255; };
    // area sample a little wider than one output pixel, as soft as the film's own strokes
    const wob = (s, t) => [Math.sin(t * 9.1 + s * 3.7) * .9 + Math.sin(s * 23 + 1.3) * .6, Math.sin(s * 17.3 + t * 2.1) * .9];
    const cov = (s, t) => { const [ox, oy] = wob(s, t); let acc = 0, n = 0; for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) { acc += a(s * W + dx + ox * S, t * H + dy + oy * S); n++; } return acc / n; };
    const det = u[0] * v[1] - u[1] * v[0], xs = [TL[0], TR[0], BL[0], q[2][0]], ys = [TL[1], TR[1], BL[1], q[2][1]];
    const bx0 = Math.max(0, Math.floor(Math.min(...xs)) - 2), bx1 = Math.min(639, Math.ceil(Math.max(...xs)) + 2), by0 = Math.max(0, Math.floor(Math.min(...ys)) - 2), by1 = Math.min(359, Math.ceil(Math.max(...ys)) + 2);
    // the cream's level around the writing, to put the icing in the same light
    let ref = 0, rn = 0; for (let y = by0; y <= by1; y++) for (let xx = bx0; xx <= bx1; xx++) { const i = (y * 640 + xx) * 4; ref += d[i + 1]; rn++; } ref = ref / Math.max(1, rn);
    const IC = [102, 38, 9];
    for (let y = by0; y <= by1; y++) for (let xx = bx0; xx <= bx1; xx++) { const px = xx + .5 - TL[0], py = y + .5 - TL[1], s = (px * v[1] - py * v[0]) / det, t = (u[0] * py - u[1] * px) / det;
      if (s < -.05 || s > 1.05 || t < -.1 || t > 1.75) continue; const c = cov(s, t); if (c < .01) continue;
      const up = cov(s - .6 / w, t - .6 / h), sh = Math.max(-1, Math.min(1, (c - up) * 3.2)), i = (y * 640 + xx) * 4, lit = Math.max(.75, Math.min(1.08, d[i + 1] / Math.max(40, ref)));
      const al = Math.min(1, c * 1.15);
      for (let ch = 0; ch < 3; ch++) { const ridge = Math.max(0, 1 - Math.abs(c - .8) * 4) * .5, col = IC[ch] * lit * (1 + .45 * sh) + (sh > 0 ? sh * 30 * lit : 0) + ridge * 18 * lit; d[i + ch] = d[i + ch] * (1 - al) + col * al; } } }
  // writing made of the film's own piped characters (glyphs27.png: 生 日 快 乐 and the Z, lifted off frame 30 and laid flat):
  // the characters are set side by side on the writing's plane and carried onto this frame's quad, in this frame's light
  function filmPipe(d, q, text, p) { const G = D.glyphs, gi = D.gimg; if (!G || !gi || !gi.ok) return false; const idx = [...text].map(ch => G.chars.indexOf(ch)); if (idx.some(i => i < 0)) return false;
    const gw = G.cuts.slice(1).map((c, i) => c - G.cuts[i]), tw = idx.reduce((a, i) => a + gw[i], 0), c = canvas(G.W, G.HH), x = c.getContext('2d'), sc = Math.min(1, G.W * .98 / tw);
    let cx = (G.W - tw * sc) / 2; for (const i of idx) { x.drawImage(gi, G.cuts[i], 0, gw[i], G.H, cx, 0, gw[i] * sc, G.H); cx += gw[i] * sc; }
    if (p > .86) { const e = Math.min(1, (p - .86) / .14), uw = Math.max(tw * sc * 1.02, G.W * .8); x.save(); x.beginPath(); x.rect((G.W - uw) / 2, G.H, uw * e, G.HH - G.H); x.clip(); x.drawImage(gi, 0, G.H, G.W, G.HH - G.H, (G.W - uw) / 2, G.H, uw, G.HH - G.H); x.restore(); }
    if (p < .86) x.clearRect((G.W - tw * sc) / 2 + tw * sc * p / .86, 0, G.W, G.H);
    const A = x.getImageData(0, 0, G.W, G.HH).data, TL = q[0], u = [q[1][0] - TL[0], q[1][1] - TL[1]], v0 = [q[3][0] - TL[0], q[3][1] - TL[1]], v = [v0[0] * 1.8, v0[1] * 1.8], det = u[0] * v[1] - u[1] * v[0];
    const xs = [TL[0], TL[0] + u[0], TL[0] + v[0], TL[0] + u[0] + v[0]], ys = [TL[1], TL[1] + u[1], TL[1] + v[1], TL[1] + u[1] + v[1]];
    const bx0 = Math.max(0, Math.floor(Math.min(...xs))), bx1 = Math.min(639, Math.ceil(Math.max(...xs))), by0 = Math.max(0, Math.floor(Math.min(...ys))), by1 = Math.min(359, Math.ceil(Math.max(...ys)));
    let ref = 0, rn = 0; for (let y = by0; y <= by1; y++) for (let xx = bx0; xx <= bx1; xx++) { const i = (y * 640 + xx) * 4; ref += d[i + 1]; rn++; } const lit = Math.max(.6, Math.min(1.4, ref / Math.max(1, rn) / 136));
    const smp = (sx, sy, ch) => { sx = Math.max(0, Math.min(G.W - 1, sx | 0)); sy = Math.max(0, Math.min(G.HH - 1, sy | 0)); return A[(sy * G.W + sx) * 4 + ch]; };
    for (let y = by0; y <= by1; y++) for (let xx = bx0; xx <= bx1; xx++) { const px = xx + .5 - TL[0], py = y + .5 - TL[1], s = (px * v[1] - py * v[0]) / det, t = (u[0] * py - u[1] * px) / det; if (s < 0 || s > 1 || t < 0 || t > 1) continue;
      let r = 0, g = 0, b = 0, a = 0, n = 0; for (let dy = -3; dy <= 3; dy += 2) for (let dx = -3; dx <= 3; dx += 2) { const X = s * G.W + dx, Y = t * G.HH + dy, al = smp(X, Y, 3) / 255; r += smp(X, Y, 0) * al; g += smp(X, Y, 1) * al; b += smp(X, Y, 2) * al; a += al; n++; }
      if (a < .01) continue; const al = a / n, i = (y * 640 + xx) * 4; d[i] = d[i] * (1 - al) + r / a * lit * al; d[i + 1] = d[i + 1] * (1 - al) + g / a * lit * al; d[i + 2] = d[i + 2] * (1 - al) + b / a * lit * al; }
    return true; }
  // one designed frame
  D.prefetch = (n, j) => { const B = BEATS[n]; if (B) for (const k of B.layers) img(D.base + 'design/d' + p2(n) + k + '_' + p2(j) + (k === 'l' ? '.png' : '.jpg')); };
  D.render = (n, j, fimg) => { const B = BEATS[n], m = D.meta[n]; if (!B) return null; D.prefetch(n, j); if (!fimg || !fimg.ok) return null; if (B.layers.length && !m) return null;
    const s = window.CORE.ST.design[n] || {}, key = n + ':' + j + ':' + JSON.stringify(s); if (cache.has(key)) return cache.get(key);
    const L = {}; for (const k of B.layers) { const im = img(D.base + 'design/d' + p2(n) + k + '_' + p2(j) + (k === 'l' ? '.png' : '.jpg')); if (!im.ok) return null; L[k] = im; }
    const c = canvas(640, 360), x = c.getContext('2d'); x.drawImage(fimg, 0, 0, 640, 360); const id = x.getImageData(0, 0, 640, 360), d = id.data;
    const box = m && m.box, bw = box ? box[2] - box[0] : 0, bh = box ? box[3] - box[1] : 0, P = {}; for (const k in L) P[k] = pixels(L[k], bw, bh);
    const lay = (k, bx, by) => { const i = (by * bw + bx) * 4; return P[k].subarray(i, i + 4); };
    if (n === 7) { for (const e of ['R', 'L']) { const t = s['focus' + e]; if (t == null) continue; const f = Math.max(.02, m.focus[e][j]), ch = e === 'R' ? 0 : 1;
        for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) { const a = P.l[(by * bw + bx) * 4 + ch] / 255; if (a < .004) continue; const i = ((by + box[1]) * 640 + bx + box[0]) * 4;
          let src, w; if (t >= f) { src = lay('s', bx, by); w = Math.min(1, (t - f) / Math.max(.05, 1 - f)); } else { src = lay('b', bx, by); w = Math.min(1, (f - t) / f); }
          w *= a; for (let q = 0; q < 3; q++) d[i + q] = d[i + q] * (1 - w) + src[q] * w; } } }
    else {
      const lit = s.lit != null ? Math.round(s.lit) : B.total, fl = m ? (m.cand ? m.cand[j] : m.flames[j]) : [];
      // flames out, from the far ones: each candle's region (label red / 30) takes the flames-out layer
      if (m && lit < B.total) { const out = new Set(); for (let k = 0; k < B.total - lit; k++) out.add(fl.length - k);
        for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) { const id8 = Math.round(P.l[(by * bw + bx) * 4] / 30); if (!out.has(id8)) continue; const i = ((by + box[1]) * 640 + bx + box[0]) * 4, a = lay('a', bx, by); d[i] = a[0]; d[i + 1] = a[1]; d[i + 2] = a[2]; } }
      // writing: the film's, or taken off (blue label) and piped anew
      if (n === 27 && s.words != null && Math.round(s.words) !== 0) { for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) { const w = P.l[(by * bw + bx) * 4 + 2] / 255; if (w < .004) continue; const i = ((by + box[1]) * 640 + bx + box[0]) * 4, a = lay('a', bx, by); for (let q = 0; q < 3; q++) d[i + q] = d[i + q] * (1 - w) + a[q] * w; }
        const pp = s.pipe != null ? s.pipe : 1; if (pp > .01) { const wd = WORDS[Math.max(1, Math.min(WORDS.length - 1, Math.round(s.words)))]; if (!filmPipe(d, m.quad[j], wd, pp)) pipe(d, m.quad[j], wd, pp); } }
      // the candles' light: on the hologram cake only around the flames; on the children's faces and the room everywhere it fell
      const Lf = B.total ? lit / B.total : 1, fxy = (fl || []).map(f => n === 27 ? [f[0], f[1]] : [f[0], f[1]]);
      if (n === 27) { if (lit < B.total) for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) { const g = P.l[(by * bw + bx) * 4 + 1] / 255; if (g < .01) continue; const i = ((by + box[1]) * 640 + bx + box[0]) * 4, k = 1 - .28 * g * (1 - lit / B.total); d[i] *= k; d[i + 1] *= k; d[i + 2] *= k * .96; } }
      else relight(d, Lf, fxy); }
    x.putImageData(id, 0, 0); if (cache.size > 24) cache.delete(cache.keys().next().value); cache.set(key, c); return c; };
  D.img = img;
})();
