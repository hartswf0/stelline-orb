/* The flat pictures the handles deform. All drawn here, by code, for this page (no film frames):
   - FACE: an original engraved portrait of a child, luminous lines on black (line width = light, as in a line engraving),
     lit from below by the candles. Lines follow a relief so the warp is legible in every line.
   - FLAME: one painted flame (used seven times).
   - PAPER: a printed party streamer, 550 x 36, with rule lines and an inscription.
   - CAKE: the cake, candles, table (not deformed; it is the frame the streamer curls around). */
(function (root) {
  const SC = 2; // texture px per scene px
  function cnv(w, h) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; }
  function rnd(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const g2 = (x, y, cx, cy, sx, sy) => Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);

  // relief of the face, scene coords (face centre 300,250)
  function relief(x, y) {
    const u = (x - 300) / 112, v = (y - 250) / 150, uu = u * (1 + .22 * Math.max(0, v)), base = 1 - uu * uu - v * v;
    if (base <= 0) return null;
    let h = Math.sqrt(base);
    h += .26 * g2(x, y, 300, 262, 9, 26) + .14 * g2(x, y, 300, 283, 12, 9);
    h += .17 * (g2(x, y, 242, 296, 30, 30) + g2(x, y, 358, 296, 30, 30));
    h -= .22 * (g2(x, y, 254, 216, 24, 13) + g2(x, y, 346, 216, 24, 13));
    h += .09 * g2(x, y, 300, 193, 80, 8) + .08 * g2(x, y, 300, 333, 26, 10) + .12 * g2(x, y, 300, 388, 24, 16);
    return h;
  }
  function light(x, y) { // candles below and in front
    const e = 1.2, hx = relief(x + e, y), hy = relief(x, y + e), h = relief(x, y); if (h == null || hx == null || hy == null) return 0;
    let nx = -(hx - h) / e * 112, ny = -(hy - h) / e * 112, nz = 1; const n = Math.hypot(nx, ny, nz); nx /= n; ny /= n; nz /= n;
    const L = [0, .7, .71], d = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    return Math.pow(d, 1.3) * (.5 + .5 * Math.min(1, Math.max(0, (y - 90) / 300)));
  }
  function face() {
    const W = 360, Hh = 430, c = cnv(W * SC, Hh * SC), g = c.getContext('2d'), R = rnd(7);
    g.scale(SC, SC); g.translate(-120, -20); g.lineCap = 'round';
    // 1. relief lines across the face: one family following the form, width = light
    const ink = (b, a) => `rgba(${255},${Math.round(196 + 30 * b)},${Math.round(130 + 60 * b)},${a})`;
    for (let y0 = 92; y0 < 452; y0 += 3.1) {
      let prev = null;
      for (let x = 170; x <= 430; x += 1.5) {
        const h0 = relief(x, y0); if (h0 == null) { prev = null; continue; }
        const y = y0 - 7 * h0 + 2.2 * Math.sin(x * .05);
        const b = light(x, y), w = .12 + 2.0 * b;
        if (prev) { g.strokeStyle = ink(b, .35 + .65 * Math.min(1, b * 1.5)); g.lineWidth = Math.min(2.5, w); g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(x, y); g.stroke(); }
        prev = [x, y];
      }
    }
    // 2. cross lines in the brightest places
    for (let k = -60; k < 80; k++) {
      let prev = null;
      for (let s = 0; s < 420; s += 1.5) {
        const x = 150 + k * 4.2 + s * .5, y = 80 + s; const b = light(x, y);
        if (b > .62 && relief(x, y) != null) { const w = (b - .62) / .38 * 1.3; if (prev) { g.strokeStyle = ink(b, .55); g.lineWidth = w; g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(x, y); g.stroke(); } prev = [x, y]; } else prev = null;
      }
    }
    // 3. features cut back to black
    g.globalCompositeOperation = 'destination-out';
    const cut = (fn, a) => { g.fillStyle = g.strokeStyle = `rgba(0,0,0,${a == null ? 1 : a})`; g.beginPath(); fn(); };
    for (const s of [-1, 1]) {
      const cx = 300 + s * 46, oc = cx + s * 22, ic = cx - s * 22;
      cut(() => { g.moveTo(ic, 218); g.quadraticCurveTo(cx, 202, oc, 216); g.quadraticCurveTo(cx, 231, ic, 218); g.fill(); }, .85); // the eye
      cut(() => { g.lineWidth = 2.6; g.moveTo(ic, 217); g.quadraticCurveTo(cx, 203, oc + s * 2, 214); g.stroke(); }); // the lash line
      for (let k = 0; k < 16; k++) { const u = k / 15, bx = 300 + s * (24 + 50 * u), by = 192 - 5 * Math.sin(u * Math.PI) + (s < 0 ? 0 : 0); cut(() => { g.lineWidth = 1.6; g.moveTo(bx, by + 2); g.lineTo(bx + s * 4, by - 2); g.stroke(); }, .8); } // brows
      cut(() => { g.ellipse(300 + s * 9, 289, 4.2, 2.4, s * .4, 0, Math.PI * 2); g.fill(); }); // nostrils
    }
    cut(() => { g.moveTo(272, 330); g.quadraticCurveTo(300, 326, 328, 330); g.quadraticCurveTo(300, 336.5, 272, 330); g.fill(); }); // the parted lips
    cut(() => { g.lineWidth = 1.4; g.moveTo(266, 329); g.quadraticCurveTo(300, 324, 334, 329); g.stroke(); }, .7);
    // the hair: a dark mass over the forehead and down both sides
    cut(() => { g.moveTo(186, 250); g.bezierCurveTo(180, 120, 250, 76, 300, 78); g.bezierCurveTo(350, 76, 420, 120, 414, 250); g.lineTo(404, 250);
      g.bezierCurveTo(398, 190, 360, 170, 300, 168); g.bezierCurveTo(240, 170, 202, 190, 196, 250); g.closePath(); g.fill(); });
    g.globalCompositeOperation = 'source-over';
    // 4. eyes: iris, catch light; lower lip highlight
    for (const s of [-1, 1]) { const cx = 300 + s * 46; g.fillStyle = 'rgba(120,80,40,.55)'; g.beginPath(); g.arc(cx + s * 1, 217, 6.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(cx + s * 1, 217, 3.2, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,235,200,.95)'; g.beginPath(); g.arc(cx + s * 1 + 2, 214.5, 1.3, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(255,170,130,.75)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(280, 338); g.quadraticCurveTo(300, 346, 320, 338); g.stroke();
    // 5. hair strands, lit at the ends from below
    for (let k = 0; k < 230; k++) {
      const side = k % 2 ? 1 : -1, u = R(), sx = 300 + side * (10 + 120 * u * u), top = 78 + 30 * u * u, len = 120 + 230 * u * R();
      const end = Math.min(400, top + len), bx = 300 + side * (60 + 70 * u + 18 * R());
      g.strokeStyle = `rgba(245,${185 + 30 * R()},${120 + 30 * R()},${.08 + .2 * R()})`; g.lineWidth = .3 + .5 * R();
      g.beginPath(); g.moveTo(300 + side * 4 * R(), top - 6); g.bezierCurveTo(sx, top, bx + side * 30, (top + end) / 2, bx, end); g.stroke();
    }
    for (let k = 0; k < 90; k++) { // the fringe
      const x = 196 + 208 * R(), y1 = 160 + 14 * R(); g.strokeStyle = `rgba(245,200,140,${.08 + .22 * R()})`; g.lineWidth = .3 + .5 * R();
      g.beginPath(); g.moveTo(300 + (x - 300) * .35, 84); g.quadraticCurveTo(x - 6, 120, x + 4 * (R() - .5), y1); g.stroke(); }
    // 6. neck and collar
    for (let y = 400; y < 446; y += 3.1) { for (let x = 252; x < 348; x += 1.5) { const b = .55 - (y - 400) / 140 + .15 * Math.cos((x - 300) / 40); g.strokeStyle = ink(b, .4); g.lineWidth = .15 + 1.6 * Math.max(0, b); g.beginPath(); g.moveTo(x, y + 2 * Math.sin(x / 9)); g.lineTo(x + 1.5, y + 2 * Math.sin((x + 1.5) / 9)); g.stroke(); } }
    // 7. the plate's ruled border and number (it is an archived print)
    g.strokeStyle = 'rgba(210,190,150,.45)'; g.lineWidth = 1; g.strokeRect(128, 28, 344, 414); g.strokeRect(132, 32, 336, 406);
    g.fillStyle = 'rgba(210,190,150,.5)'; g.font = '500 9px Oswald, sans-serif'; g.textAlign = 'right'; g.fillText('PL. 128 · BIRTHDAY', 464, 432);
    return c;
  }
  function flame() {
    const W = 40, Hh = 100, c = cnv(W * 4, Hh * 4), g = c.getContext('2d'); g.scale(4, 4);
    const path = (w, top) => { g.beginPath(); g.moveTo(20, 93); g.bezierCurveTo(20 - w, 88, 20 - w * 1.05, 62, 20, top); g.bezierCurveTo(20 + w * 1.05, 62, 20 + w, 88, 20, 93); g.closePath(); };
    g.filter = 'blur(1.6px)';
    path(11, 4); let gr = g.createLinearGradient(0, 8, 0, 94); gr.addColorStop(0, 'rgba(255,120,30,0)'); gr.addColorStop(.35, 'rgba(255,140,40,.75)'); gr.addColorStop(1, 'rgba(255,160,60,.9)'); g.fillStyle = gr; g.fill();
    path(7.5, 18); gr = g.createLinearGradient(0, 18, 0, 94); gr.addColorStop(0, 'rgba(255,220,140,.6)'); gr.addColorStop(.5, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,250,235,1)'); g.fillStyle = gr; g.fill();
    path(4, 70); g.fillStyle = 'rgba(70,110,255,.7)'; g.fill();
    g.filter = 'none'; g.fillStyle = 'rgba(30,20,10,1)'; g.fillRect(19.3, 86, 1.4, 8);
    return c;
  }
  function glow() { const c = cnv(256, 256), g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,170,80,.55)'); gr.addColorStop(.3, 'rgba(255,140,50,.18)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return c; }
  function paper() {
    const W = 550, Hh = 36, c = cnv(W * SC, Hh * SC), g = c.getContext('2d'), R = rnd(11); g.scale(SC, SC);
    g.fillStyle = '#e9d9b8'; g.fillRect(0, 0, W, Hh);
    for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(120,90,50,${.05 * R()})`; g.fillRect(R() * W, R() * Hh, 2 + 6 * R(), .5); }
    g.fillStyle = '#b4322a'; g.fillRect(0, 3, W, 1.4); g.fillRect(0, Hh - 4.4, W, 1.4);
    g.font = '500 17px Oswald, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#9c2a22';
    let x = 14; const words = ['HAPPY', 'BIRTHDAY', '·', 'MANY', 'HAPPY', 'RETURNS', '·', 'HAPPY', 'BIRTHDAY', '·'];
    for (let k = 0; x < W - 10; k++) { const w = words[k % words.length]; g.fillText(w, x, Hh / 2 + 1); x += g.measureText(w).width + 9; }
    g.fillStyle = 'rgba(80,50,20,.35)'; for (let k = 0; k < W; k += 11) g.fillRect(k, 0, .6, 2.4);
    return c;
  }
  function cake(C) {
    const c = cnv(600 * SC, 1000 * SC), g = c.getContext('2d'); g.scale(SC, SC);
    // the table: a hexagon of light on the floor of the dome
    g.fillStyle = 'rgba(232,206,160,.10)'; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; g.lineTo(300 + 250 * Math.cos(a), 770 + 80 * Math.sin(a)); } g.closePath(); g.fill();
    g.strokeStyle = 'rgba(232,206,160,.25)'; g.lineWidth = 1; g.stroke();
    const top = 640, rx = 150, ry = 40, bot = 760;
    // body: vertical engraved lines, brighter toward the front-centre
    for (let x = 300 - rx; x <= 300 + rx; x += 2.4) { const u = (x - 300) / rx, b = .25 + .6 * Math.sqrt(Math.max(0, 1 - u * u)), yt = top + ry * Math.sqrt(Math.max(0, 1 - u * u)), yb = bot + ry * Math.sqrt(Math.max(0, 1 - u * u));
      g.strokeStyle = `rgba(240,210,160,${.25 + .5 * b})`; g.lineWidth = .3 + 1.2 * b; g.beginPath(); g.moveTo(x, yt); g.lineTo(x, yb); g.stroke(); }
    // frosting scallops along the top rim
    for (let k = 0; k < 40; k++) { const a = Math.PI * k / 39, x = 300 - rx * Math.cos(a), y = top + ry * Math.sin(a); g.fillStyle = 'rgba(250,236,210,.85)'; g.beginPath(); g.arc(x, y + 3, 5, 0, Math.PI); g.fill(); }
    // top: concentric ellipses
    for (let k = 0; k < 14; k++) { const f = 1 - k / 14; g.strokeStyle = `rgba(250,230,190,${.25 + .35 * (1 - f)})`; g.lineWidth = .7; g.beginPath(); g.ellipse(300, top, rx * f, ry * f, 0, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = 'rgba(250,236,210,.9)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(300, top, rx, ry, 0, 0, Math.PI * 2); g.stroke();
    // candles: thin striped sticks
    C.forEach((cd, i) => { const x = cd.x, y0 = cd.y, y1 = cd.base; g.fillStyle = 'rgba(245,240,230,.95)'; g.fillRect(x - 3.5, y0, 7, y1 - y0);
      g.fillStyle = 'rgba(190,60,50,.9)'; for (let y = y0 + 3; y < y1; y += 8) { g.beginPath(); g.moveTo(x - 3.5, y); g.lineTo(x + 3.5, y - 3); g.lineTo(x + 3.5, y); g.lineTo(x - 3.5, y + 3); g.fill(); } });
    return c;
  }
  const api = { face, flame, glow, paper, cake, SC };
  root.TEX = api;
})(typeof self !== 'undefined' ? self : this);
