// ============================================================================
// STELLINE ATLAS BUILDER  -  the virtuous cycle
//   OBSERVE  segment the film                (atlas-core)
//   ISOLATE  imprint a part into the bearing bin
//   MODEL    climb the ladder FLAT>GRADIENT>RELIEF>MOSAIC>FILM; relief mesh; parts
//   COMPOSE  place parts + procedural kits (BUG / BIRTHDAY) on the stage
//   COMPARE  blind critic scores the composite against the frame
//   LEARN    inverse bootstrap: the fitted dials become the orb's new defaults
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS; if (!A) return;
  const D = A.data;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const WORLD_W = 16, WORLD_H = 9;

  // --------------------------------------------------------------------------
  // PERSISTENCE (per-viewer convenience only)
  // --------------------------------------------------------------------------
  const LS = 'stelline.v5';
  function lsGet() { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } }
  function lsSet(o) { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) { } }
  const saved = lsGet();
  A.learned = saved.learned || {};            // cls -> {dials:[5], lv, n}
  A.bin = [];                                  // imprinted parts
  A.stageItems = [];
  function persist() {
    lsSet({
      learned: A.learned,
      bin: A.bin.filter(b => b.src).map(b => ({ sec: b.src.sec, tid: b.src.tid, params: b.params })),
    });
  }
  A.persist = persist;

  // class priors: dial angles a fresh part of this class should start from
  A.priorFor = function (cls) {
    const L = A.learned[cls];
    if (L) return L.dials.slice();
    const pr = D.priors[cls];
    const d = A.truth.slice();
    if (pr) d[0] = A.levelAngle(Math.min(4, pr.lv + 0.6));
    return d;
  };

  // --------------------------------------------------------------------------
  // PROCEDURAL PRIMITIVES  (height-field painter -> colour / label / depth)
  // --------------------------------------------------------------------------
  function paintPrim(W, H, hf, col, opts) {
    opts = opts || {};
    const hm = new Float32Array(W * H), mat = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const nx = (x + 0.5) / W * 2 - 1, ny = (y + 0.5) / H * 2 - 1;
      PR.mat = 0; const h = hf(nx, ny); hm[y * W + x] = h; mat[y * W + x] = PR.mat;
    }
    const ct = document.createElement('canvas'); ct.width = W; ct.height = H;
    const cl = document.createElement('canvas'); cl.width = W; cl.height = H;
    const cd = document.createElement('canvas'); cd.width = W; cd.height = H;
    const it = ct.getContext('2d').createImageData(W, H), il = cl.getContext('2d').createImageData(W, H), id = cd.getContext('2d').createImageData(W, H);
    const kz = opts.k || 5.0;
    const Lx = -0.42, Ly = -0.52, Lz = 0.74;
    let sr = 0, sg = 0, sb = 0, sn = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, o = i * 4, h = hm[i];
      il.data[o + 3] = 255; it.data[o + 3] = 255; id.data[o + 3] = 255;
      if (h < 0) { id.data[o] = id.data[o + 1] = id.data[o + 2] = 0; continue; }
      const hx = (hm[Math.min(W - 1, x + 1) + y * W] < 0 ? h : hm[Math.min(W - 1, x + 1) + y * W]) - (hm[Math.max(0, x - 1) + y * W] < 0 ? h : hm[Math.max(0, x - 1) + y * W]);
      const hy = (hm[x + Math.min(H - 1, y + 1) * W] < 0 ? h : hm[x + Math.min(H - 1, y + 1) * W]) - (hm[x + Math.max(0, y - 1) * W] < 0 ? h : hm[x + Math.max(0, y - 1) * W]);
      let nx = -hx * kz, ny = -hy * kz, nz = 1; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const diff = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
      const hxv = Lx, hyv = Ly, hzv = Lz + 1; const hl = Math.hypot(hxv, hyv, hzv);
      const spec = Math.pow(Math.max(0, (nx * hxv + ny * hyv + nz * hzv) / hl), 28);
      const c = col((x + 0.5) / W * 2 - 1, (y + 0.5) / H * 2 - 1, h, nx, ny, nz, mat[i]);
      const em = c[3] || 0, sp = c[4] === undefined ? 0.35 : c[4];
      const ao = 0.45 + 0.55 * Math.pow(clamp(h, 0, 1), 0.5);
      const r = c[0] * (0.22 + 0.95 * diff) * ao + spec * 255 * sp + em * c[0];
      const g = c[1] * (0.22 + 0.95 * diff) * ao + spec * 255 * sp + em * c[1];
      const b = c[2] * (0.22 + 0.95 * diff) * ao + spec * 255 * sp + em * c[2];
      it.data[o] = clamp(r, 0, 255); it.data[o + 1] = clamp(g, 0, 255); it.data[o + 2] = clamp(b, 0, 255);
      il.data[o] = 1;
      const dv = clamp(h, 0, 1) * 255; id.data[o] = id.data[o + 1] = id.data[o + 2] = dv;
      sr += it.data[o]; sg += it.data[o + 1]; sb += it.data[o + 2]; sn++;
    }
    ct.getContext('2d').putImageData(it, 0, 0); cl.getContext('2d').putImageData(il, 0, 0); cd.getContext('2d').putImageData(id, 0, 0);
    const tex = new THREE.CanvasTexture(ct); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true;
    const lab = new THREE.CanvasTexture(cl); lab.minFilter = lab.magFilter = THREE.NearestFilter; lab.generateMipmaps = false;
    const dep = new THREE.CanvasTexture(cd); dep.minFilter = dep.magFilter = THREE.LinearFilter; dep.generateMipmaps = false;
    const m = [sr / sn, sg / sn, sb / sn];
    const hex = '#' + m.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
    return { frame: tex, label: lab, depth: dep, ready: true, thumb: ct, rgb: hex, w: W, h: H };
  }
  const PR = { mat: 0 };
  const dome = (x, y, cx, cy, rx, ry, hz) => { const dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy; return d < 1 ? Math.sqrt(1 - d) * hz : -1; };
  const rgbOf = (r, g, b) => [r, g, b];

  // each primitive: {kit, cls, w, h (world units), make(opts)}  - opts = palette / text / counts
  const DEF = { pal: [34, 88, 52], eye: [48, 56, 26], facets: 11, sponge: [214, 176, 128], icing: [248, 238, 226], text: 'HAPPY BIRTHDAY', ink: [200, 22, 40], candle: [230, 70, 90], balloon: [210, 50, 70], leaf: [70, 140, 44], hue: 0 };
  const O = o => Object.assign({}, DEF, o || {});
  const sc3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const PRIMS = {
    // ---------------- BUG KIT ----------------
    THORAX: { kit: 'bug', cls: 'FORM', w: 2.8, h: 2.2, make: (o) => { o = O(o); return paintPrim(160, 128,
      (x, y) => dome(x, y, 0, 0, 0.96, 0.92, 1),
      (x, y, h, nx, ny) => { const sh = 0.5 + 0.5 * Math.sin(nx * 5 + ny * 3); const k = 0.45 + 0.75 * sh * h; return [o.pal[0] * k * 1.2 + 14 * sh, o.pal[1] * k * 1.1 + 22 * sh, o.pal[2] * k * 1.2 + 14 * sh, 0, 0.55]; }); } },
    HEAD: { kit: 'bug', cls: 'FORM', w: 1.7, h: 1.5, make: (o) => { o = O(o); return paintPrim(128, 112,
      (x, y) => dome(x, y, 0, 0, 0.94, 0.9, 0.9),
      (x, y, h) => { const k = 0.5 + 0.7 * h; return [o.pal[0] * k, o.pal[1] * k, o.pal[2] * k, 0, 0.5]; }); } },
    'COMPOUND EYE': { kit: 'bug', cls: 'FORM', w: 1.4, h: 1.7, make: (o) => { o = O(o); const s = o.facets; return paintPrim(144, 168,
      (x, y) => dome(x, y, 0, 0, 0.94, 0.94, 1),
      (x, y, h, nx, ny) => {
        const u = x * s, v = y * s * 1.1547, row = Math.round(v / 1.1547), off = row % 2 ? 0.5 : 0;
        const fx = Math.abs((((u + off) % 1) + 1) % 1 - 0.5), fy = Math.abs((((v / 1.1547) % 1) + 1) % 1 - 0.5);
        const facet = 0.5 + 0.5 * Math.min(1, (fx * fx + fy * fy) * 5); const base = 0.3 + 0.7 * (1 - facet);
        return [o.eye[0] * (0.5 + 1.4 * base), o.eye[1] * (0.5 + 1.4 * base), o.eye[2] * (0.5 + 1.4 * base), 0, 0.9];
      }); } },
    LEG: { kit: 'bug', cls: 'FORM', w: 3.6, h: 0.7, make: (o) => { o = O(o); return paintPrim(240, 48,
      (x, y) => { const r = Math.abs(y) / (0.86 - 0.08 * Math.abs(Math.sin(x * 6))); return r < 1 ? Math.sqrt(1 - r * r) : -1; },
      (x, y, h) => { const k = 0.4 + 0.8 * h; return [o.pal[0] * k * .9, o.pal[1] * k * .9, o.pal[2] * k * .9, 0, 0.6]; }); } },
    ANTENNA: { kit: 'bug', cls: 'FORM', w: 3.0, h: 1.4, make: (o) => { o = O(o); return paintPrim(200, 96,
      (x, y) => { const cy = -0.55 + 0.9 * Math.pow((x + 1) / 2, 1.8) * 0.5 - 0.4 * Math.sin((x + 1) * 1.2); const d = Math.abs(y - cy) / (0.09 - 0.05 * (x + 1) / 2); return d < 1 ? Math.sqrt(1 - d * d) * 0.8 : -1; },
      (x, y, h) => { const k = 0.35 + 0.6 * h; return [o.pal[0] * k * .8, o.pal[1] * k * .8, o.pal[2] * k * .8, 0, 0.5]; }); } },
    MANDIBLE: { kit: 'bug', cls: 'FORM', w: 1.6, h: 1.8, make: (o) => { o = O(o); return paintPrim(96, 112,
      (x, y) => { const a = Math.atan2(y - 0.1, x), r = Math.hypot(x, y - 0.1); const rr = (r - 0.62) / 0.2; const tip = 1 - Math.max(0, (a + 0.4)) * 0.6; return (a > -2.4 && a < 1.6 && Math.abs(rr) < Math.max(0.15, tip)) ? Math.sqrt(1 - Math.min(1, rr * rr / (tip * tip))) * 0.9 : -1; },
      (x, y, h) => [28 + 36 * h + o.pal[0] * .2, 20 + 24 * h + o.pal[1] * .1, 12 + 14 * h, 0, 0.7]); } },
    ELYTRA: { kit: 'bug', cls: 'FORM', w: 3.0, h: 2.0, make: (o) => { o = O(o); return paintPrim(192, 128,
      (x, y) => { const h = dome(x, y, 0, 0, 0.97, 0.95, 0.85); return h < 0 ? h : h + 0.06 * Math.sin(x * 22); },
      (x, y, h, nx, ny) => { const ir = 0.5 + 0.5 * Math.sin(nx * 3 + y * 2); const k = 0.5 + 0.8 * h; return [o.pal[0] * k * 1.1 + 20 * ir, o.pal[1] * k * 1.1 + 30 * ir, o.pal[2] * k * 1.1 + 24 * (1 - ir), 0, 0.7]; }); } },
    LEAF: { kit: 'bug', cls: 'GREENERY', w: 4.2, h: 2.6, make: (o) => { o = O(o); return paintPrim(224, 144,
      (x, y) => { const u = (x + 1) / 2; const half = 0.86 * Math.sin(Math.PI * Math.pow(u, 0.8)); const d = Math.abs(y) / Math.max(0.001, half); if (d >= 1) return -1; const vein = 0.05 * Math.abs(Math.sin(Math.abs(y) * 26 - u * 9)); return Math.sqrt(1 - d * d) * 0.55 + vein; },
      (x, y, h) => { const v = Math.abs(y) < 0.04 ? 1.4 : 1; return [o.leaf[0] * v * (.6 + .8 * h), o.leaf[1] * v * (.6 + .8 * h), o.leaf[2] * v * (.7 + .6 * h), 0, 0.3]; }); } },
    'DEW DROP': { kit: 'bug', cls: 'LIGHT', w: 0.9, h: 0.9, make: () => paintPrim(64, 64,
      (x, y) => dome(x, y, 0, 0, 0.95, 0.95, 1),
      (x, y, h, nx, ny) => { const rim = Math.pow(1 - h, 2); return [150 + 100 * rim - 50 * ny, 190 + 60 * rim, 170 + 80 * rim, 0.1, 1.0]; }) },
    // ---------------- BIRTHDAY KIT ----------------
    'CAKE TIER': { kit: 'cake', cls: 'WARM.OBJECT', w: 3.8, h: 2.3, make: (o) => { o = O(o); return paintPrim(256, 156,
      (x, y) => {
        const top = dome(x, y, 0, -0.38, 0.97, 0.36, 0.2) >= 0 ? 0.8 : -1;
        if (top > 0) { PR.mat = 1; return top; }
        if (y > -0.38 && y < 0.62 && Math.abs(x) < 0.97) { const edge = Math.sqrt(1 - (x / 0.97) ** 2); if (y < 0.28 || (y < 0.28 + 0.14 * (0.5 + 0.5 * Math.sin(x * 14)))) { PR.mat = 2; return 0.2 + edge * 0.6; } PR.mat = 0; return 0.1 + edge * 0.6; }
        const bot = dome(x, y, 0, 0.62, 0.97, 0.36, 0.2); if (bot >= 0 && y >= 0.62) { PR.mat = 0; return 0.1 + bot * 0.5; }
        return -1; },
      (x, y, h, nx, ny, nz, m) => m === 1 ? [...o.icing, 0, 0.3] : m === 2 ? [o.icing[0] * 1.0, o.icing[1] * .98, o.icing[2] * .96, 0, 0.35] : [...o.sponge, 0, 0.15]); } },
    BUNDT: { kit: 'cake', cls: 'WARM.OBJECT', w: 3.0, h: 2.8, make: (o) => { o = O(o); return paintPrim(192, 176,
      (x, y) => { const base = Math.abs(x) < 0.95 - 0.35 * Math.max(0, -y) ? 1 : 0; if (!base || y < -0.9 || y > 0.9) return -1; const flute = 0.08 * Math.abs(Math.sin(x * 11)); const prof = Math.sqrt(1 - (x / (0.95 - 0.35 * Math.max(0, -y))) ** 2); return prof * (0.7 - 0.3 * Math.abs(y)) + flute + 0.1; },
      (x, y) => y < -0.4 ? [...o.icing, 0, 0.5] : [...sc3(o.sponge, 0.9), 0, 0.2]); } },
    CANDLE: { kit: 'cake', cls: 'WARM.OBJECT', w: 0.5, h: 2.2, make: (o) => { o = O(o); return paintPrim(40, 150,
      (x, y) => { if (y < -0.25 || y > 0.98) return -1; if (Math.abs(x) > 0.78) return -1; return Math.sqrt(1 - (x / 0.78) ** 2) * 0.8; },
      (x, y) => Math.floor((y + 1) * 9) % 2 ? [250, 250, 250, 0, 0.3] : [...o.candle, 0, 0.3]); } },
    FLAME: { kit: 'cake', cls: 'FLAME', w: 0.55, h: 1.1, make: () => paintPrim(48, 96,
      (x, y) => { const t = (y + 1) / 2; const w = 0.78 * Math.sin(Math.PI * Math.pow(1 - t, 0.75)) * (1 - 0.2 * t); const d = Math.abs(x) / Math.max(0.001, w); return t > 0.02 && d < 1 ? Math.sqrt(1 - d * d) : -1; },
      (x, y, h) => { const core = Math.pow(h, 1.8); return [255, 150 + 100 * core, 40 + 160 * core * (1 - (y + 1) / 2), 0.9, 0]; }) },
    'HEX TABLE': { kit: 'cake', cls: 'SURFACE', w: 6.0, h: 2.0, make: () => paintPrim(240, 80,
      (x, y) => { const ax = Math.abs(x), ay = Math.abs(y); return ay < 0.62 && ax < 1.0 - ay * 0.8 ? 0.25 + 0.15 * (1 - ay) : -1; },
      (x, y, h) => [230 + 20 * h, 160 + 40 * h, 64 + 40 * h, 0.25, 0.4]) },
    BALLOON: { kit: 'cake', cls: 'WARM.OBJECT', w: 1.5, h: 2.1, make: (o) => { o = O(o); return paintPrim(120, 168,
      (x, y) => { const b = dome(x, y, 0, -0.18, 0.92, 0.78, 1); if (b >= 0) return b; return Math.abs(x) < 0.07 && y > 0.58 && y < 0.8 ? 0.3 : -1; },
      (x, y, h) => { const k = 0.45 + 0.65 * h; return [o.balloon[0] * k, o.balloon[1] * k, o.balloon[2] * k, 0, 0.9]; }); } },
    SMARTIE: { kit: 'cake', cls: 'FORM', w: 0.5, h: 0.5, make: (o) => { o = O(o); return paintPrim(48, 48,
      (x, y) => dome(x, y, 0, 0, 0.95, 0.95, 0.4),
      (x, y, h) => { const k = 0.4 + 0.8 * h; return [o.balloon[0] * k, o.balloon[1] * k, o.balloon[2] * k, 0, 0.7]; }); } },
    'ICING SCRIPT': { kit: 'cake', cls: 'WARM.OBJECT', w: 4.0, h: 1.4, make: (o) => { o = O(o);
      const W = 288, H = 100, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const lines = String(o.text || '').split('\n').slice(0, 2); const font = '"Noto Sans CJK SC","Noto Sans SC","PingFang SC","Microsoft YaHei","Segoe Script","Brush Script MT",cursive,sans-serif';
      let size = lines.length > 1 ? 40 : 62; for (; size > 12; size -= 2) { x.font = `bold ${size}px ${font}`; if (Math.max(...lines.map(l => x.measureText(l).width)) < W - 16) break; }
      x.font = `bold ${size}px ${font}`; lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
      const md = x.getImageData(0, 0, W, H).data; const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const bx = cv.getContext('2d'); bx.filter = 'blur(2.5px)'; bx.drawImage(c, 0, 0); const bd = bx.getImageData(0, 0, W, H).data;
      return paintPrim(W, H, (nx, ny) => { const X = Math.floor((nx + 1) / 2 * W), Y = Math.floor((ny + 1) / 2 * H); const v = md[(Y * W + X) * 4] / 255; if (v < 0.5) return -1; return 0.35 + 0.65 * (bd[(Y * W + X) * 4] / 255); }, () => [...o.ink, 0, 0.7], { k: 6 }); } },
    'GIFT BOX': { kit: 'cake', cls: 'FORM', w: 2.2, h: 2.2, make: (o) => { o = O(o); return paintPrim(120, 120,
      (x, y) => (Math.abs(x) < 0.9 && Math.abs(y) < 0.9) ? 0.5 + 0.1 * (Math.abs(x) < 0.12 || Math.abs(y) < 0.12 ? 1 : 0) : -1,
      (x, y) => (Math.abs(x) < 0.12 || Math.abs(y) < 0.12) ? [240, 200, 70, 0, 0.8] : [...o.balloon, 0, 0.35]); } },
    // ---------------- ANYTHING ----------------
    'CLAY BLOB': { kit: 'any', cls: 'FORM', w: 2.2, h: 2.2, make: (o) => { o = O(o); return paintPrim(128, 128,
      (x, y) => { const r = Math.hypot(x, y) * (1 + 0.18 * Math.sin(Math.atan2(y, x) * 3 + 1) + 0.1 * Math.sin(Math.atan2(y, x) * 5)); return r < 0.92 ? Math.sqrt(1 - (r / 0.92) ** 2) : -1; },
      (x, y, h) => [o.sponge[0] * (.6 + .5 * h), o.sponge[1] * (.6 + .5 * h), o.sponge[2] * (.6 + .5 * h), 0, 0.3]); } },
  };
  A.PRIMS = PRIMS;
  A.primKits = { bug: ['THORAX', 'HEAD', 'COMPOUND EYE', 'LEG', 'ANTENNA', 'MANDIBLE', 'ELYTRA', 'LEAF', 'DEW DROP'],
    cake: ['CAKE TIER', 'BUNDT', 'CANDLE', 'FLAME', 'HEX TABLE', 'BALLOON', 'SMARTIE', 'ICING SCRIPT', 'GIFT BOX'], any: ['CLAY BLOB'] };
  const primCache = {};
  function primRes(name, opts) { const k = name + (opts ? JSON.stringify(opts) : ''); if (!primCache[k]) primCache[k] = PRIMS[name].make(opts); return primCache[k]; }
  A.primRes = primRes;

  // --------------------------------------------------------------------------
  // BIN  (the Wallace memory bearings): imprint a segment as a reusable part
  // --------------------------------------------------------------------------
  function thumbOf(res, seg) {
    const c = document.createElement('canvas'); c.width = 72; c.height = 44;
    const x = c.getContext('2d'); x.fillStyle = '#0a0f14'; x.fillRect(0, 0, 72, 44);
    if (res.frameImg && res.labels) {
      const bb = seg.bb, k = res.frameImg.naturalWidth / 480, bx = bb[0] * 480, by = bb[1] * 270, bw = (bb[2] - bb[0]) * 480, bh = (bb[3] - bb[1]) * 270;
      const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(bw)); t.height = Math.max(1, Math.round(bh));
      const tx = t.getContext('2d'); tx.drawImage(res.frameImg, bx * k, by * k, bw * k, bh * k, 0, 0, t.width, t.height);
      const id = tx.getImageData(0, 0, t.width, t.height);
      for (let yy = 0; yy < t.height; yy++) for (let xx = 0; xx < t.width; xx++) {
        const lx = Math.min(479, Math.floor(bx + xx)), ly = Math.min(269, Math.floor(by + yy));
        if (res.labels[ly * 480 + lx] !== seg.i) id.data[(yy * t.width + xx) * 4 + 3] = 0;
      }
      tx.putImageData(id, 0, 0);
      const s = Math.min(68 / t.width, 40 / t.height); const w = t.width * s, h = t.height * s;
      x.drawImage(t, (72 - w) / 2, (44 - h) / 2, w, h);
    }
    return c.toDataURL();
  }
  A.imprint = function (tid) {
    tid = tid || A.sel; if (!tid) return null;
    const seg = A.segByTid(tid); if (!seg) return null;
    const res = A.getRes(A.sec); if (!res.ready) return null;
    const exist = A.bin.find(b => b.src && b.src.tid === tid && b.src.sec === A.sec);
    if (exist) { A.binHand = exist; A.emit('bin'); return exist; }
    res.pinned = true;
    const item = {
      id: 'B' + (A.bin.length + 1) + ':' + seg.id, name: seg.id, cls: seg.cls, src: { sec: A.sec, tid }, res, seg,
      thumb: thumbOf(res, seg), params: A.getParams(tid).slice(),
      rect: [seg.bb[0], 1 - seg.bb[3], seg.bb[2] - seg.bb[0], seg.bb[3] - seg.bb[1]],
    };
    A.bin.push(item); A.binHand = item; persist(); A.emit('bin'); A.emit('loop', 'ISOLATE');
    return item;
  };
  A.restoreBin = function () {
    (saved.bin || []).forEach(s => {
      const res = A.getRes(s.sec); res.pinned = true;
      const wait = () => {
        if (!res.ready) { if (!res.failed) setTimeout(wait, 150); return; }
        const seg = D.sec[s.sec].segs.find(g => g.tid === s.tid); if (!seg) return;
        A.bin.push({ id: 'B' + (A.bin.length + 1) + ':' + seg.id, name: seg.id, cls: seg.cls, src: { sec: s.sec, tid: s.tid }, res, seg, thumb: thumbOf(res, seg), params: s.params || A.truth.slice(), rect: [seg.bb[0], 1 - seg.bb[3], seg.bb[2] - seg.bb[0], seg.bb[3] - seg.bb[1]] });
        A.emit('bin');
      }; wait();
    });
  };
  A.cycleHand = function (dir) {
    const all = A.handList(); if (!all.length) return;
    let i = all.findIndex(h => h === A.binHand); i = (i + (dir || 1) + all.length) % all.length; A.binHand = all[i]; A.emit('bin');
  };
  // the "hand" can hold a film part (bin) or a kit primitive
  A.handList = function () { return A.bin.concat(A.kitItems()); };
  A.kitItems = function () {
    const out = [];
    (A.activeKit ? (A.primKits[A.activeKit] || []) : []).concat(A.activeKit ? A.primKits.any : []).forEach(n => {
      if (!A._kitObj) A._kitObj = {};
      if (!A._kitObj[n]) A._kitObj[n] = { id: 'K:' + n, name: n, cls: PRIMS[n].cls, prim: n, params: null };
      out.push(A._kitObj[n]);
    });
    return out;
  };
  A.setKit = function (k) { A.activeKit = k; A.binHand = A.handList()[0] || A.binHand; A.emit('bin'); A.emit('kit', k); };

  // --------------------------------------------------------------------------
  // STAGE
  // --------------------------------------------------------------------------
  const sg = A.stageGroup;
  A.stageBackdrop = 'dome';
  const bgMat = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: { uTop: { value: new THREE.Color(0x0b1218) }, uMid: { value: new THREE.Color(0x182430) }, uBot: { value: new THREE.Color(0x05070a) }, uTex: { value: null }, uUseTex: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
    fragmentShader: 'varying vec2 vUv; uniform vec3 uTop,uMid,uBot; uniform sampler2D uTex; uniform float uUseTex; void main(){ vec3 c = mix(uBot,uMid,smoothstep(0.0,0.5,vUv.y)); c = mix(c,uTop,smoothstep(0.5,1.0,vUv.y)); float v=1.0-0.55*pow(length(vUv-0.5)*1.6,2.0); c*=v; if(uUseTex>0.5){ vec3 t=textureLod(uTex,vUv,4.0).rgb*0.55; c=mix(c,t,0.85); } gl_FragColor=vec4(c,1.0);} ',
  });
  const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W * 5, WORLD_H * 5), bgMat); bgMesh.position.z = -22; sg.add(bgMesh);
  const ghostMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false, color: 0xffffff });
  const ghost = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W, WORLD_H), ghostMat); ghost.position.z = -0.4; sg.add(ghost);
  const floor = new THREE.GridHelper(40, 40, 0x38d9c0, 0x1b2a36); floor.position.y = -4.6; floor.material.transparent = true; floor.material.opacity = 0.18; floor.position.z = 4; sg.add(floor);
  A.stageCamPose = new THREE.Vector3(0, 0, 0);

  A.targetSec = null;
  A.setTarget = function (sec) {
    A.targetSec = sec == null ? A.sec : sec;
    const r = A.getRes(A.targetSec);
    const apply = () => { if (r.ready) { ghostMat.map = r.frame; ghostMat.needsUpdate = true; } else setTimeout(apply, 120); };
    apply(); A.emit('target', A.targetSec);
  };
  A.setGhost = v => { ghostMat.opacity = v; A.ghostOn = v > 0; A.emit('ghost', v); };
  A.cycleBackdrop = function () {
    const order = ['dome', 'void', 'frame']; A.stageBackdrop = order[(order.indexOf(A.stageBackdrop) + 1) % 3]; A.emit('backdrop', A.stageBackdrop);
  };
  function paletteOfSec(sec) {
    const S = D.sec[sec]; const top = S.segs.filter(g => g.cy < 0.5).sort((a, b) => b.a - a.a)[0] || S.segs[0];
    const bot = S.segs.filter(g => g.cy >= 0.5).sort((a, b) => b.a - a.a)[0] || S.segs[0];
    const mid = S.segs.slice().sort((a, b) => b.a - a.a)[0];
    return [top.rgb, mid.rgb, bot.rgb];
  }

  let itemSeq = 1;
  function makeItemMesh(def) {
    const res = def.prim ? primRes(def.prim, def.opts) : def.res;
    let seg, rect, w, h;
    if (def.prim) {
      const P = PRIMS[def.prim];
      seg = { i: 1, rgb: res.rgb, gr: [0, 0, 0, 0, 0, 0], cx: .5, cy: .5, kr: 0, rel: .5, cls: P.cls, id: def.prim, tid: 'K:' + def.prim };
      rect = [0, 0, 1, 1]; w = P.w; h = P.h;
    } else {
      seg = def.seg; rect = def.rect; w = rect[2] * WORLD_W; h = rect[3] * WORLD_H;
    }
    const mat = A.makeMaterial(); const mesh = new THREE.Mesh(A.gridPart, mat); mesh.frustumCulled = false;
    const u = mat.uniforms; A.applySegUniforms(u, seg, res, null);
    u.uRect.value.set(rect[0], rect[1], rect[2], rect[3]);
    u.uOutline.value = 0; u.uTexel.value.set(1 / (res.w || 480), 1 / (res.h || 270));
    if (def.prim) { u.uFrameB.value = res.frame; }
    return { mesh, res, seg, w, h };
  }

  A.place = function (def, at) {
    def = def || A.binHand; if (!def) return null;
    const m = makeItemMesh(def);
    const id = itemSeq++;
    const item = {
      id, def, name: def.name, cls: def.cls, mesh: m.mesh, seg: m.seg, res: m.res, w: m.w, h: m.h,
      x: at ? at.x : (Math.random() - 0.5) * 6, y: at ? at.y : (Math.random() - 0.5) * 2.5, z: at && at.z != null ? at.z : (Math.random() - 0.5) * 3,
      s: 1, rot: 0, flip: 1,
      dials: def.prim ? A.priorFor(def.cls) : (def.params ? def.params.slice() : A.truth.slice()),
    };
    if (def.prim) item.dials[0] = A.truth[0];
    sg.add(item.mesh); A.stageItems.push(item);
    A.stageSel = item; A.sel = null;
    A.emit('stage'); A.emit('loop', 'COMPOSE'); A.emit('select', null);
    A.syncStageRings(item);
    return item;
  };
  A.syncStageRings = function (item) {
    if (!window.state || !window.setRingAngle) return;
    state._syncingNode = true; for (let r = 0; r < 5; r++) window.setRingAngle(r, item.dials[r], false); state._syncingNode = false;
  };
  A.removeItem = function (item) {
    item = item || A.stageSel; if (!item) return;
    sg.remove(item.mesh); item.mesh.material.dispose(); A.stageItems = A.stageItems.filter(i => i !== item);
    if (A.stageSel === item) A.stageSel = A.stageItems[A.stageItems.length - 1] || null; A.emit('stage');
  };
  A.clearStage = function () { A.stageItems.slice().forEach(i => A.removeItem(i)); A.stageSel = null; A.emit('stage'); };
  A.selectItem = function (item) { A.stageSel = item; A.sel = null; if (item) A.syncStageRings(item); A.emit('select', null); A.emit('stage'); };
  A.cycleItem = function (dir) {
    if (!A.stageItems.length) return; let i = A.stageItems.indexOf(A.stageSel); i = (i + (dir || 1) + A.stageItems.length) % A.stageItems.length; A.selectItem(A.stageItems[i]);
  };
  A.nudge = function (dx, dy, dz) { const it = A.stageSel; if (!it) return; it.x += dx; it.y += dy; it.z += dz || 0; };
  A.duplicate = function () { const it = A.stageSel; if (!it) return; const n = A.place(it.def, { x: it.x + 0.5, y: it.y, z: it.z }); n.s = it.s; n.rot = it.rot; n.flip = it.flip; n.dials = it.dials.slice(); A.syncStageRings(n); return n; };
  A.mirror = function () { const it = A.stageSel; if (!it) return; const n = A.place(it.def, { x: -it.x, y: it.y, z: it.z }); n.s = it.s; n.rot = -it.rot; n.flip = -it.flip; n.dials = it.dials.slice(); A.syncStageRings(n); return n; };

  A.stageUpdate = function (time, picking, offscreen) {
    // backdrop = the scene makes the stage
    const sec = A.targetSec != null ? A.targetSec : Math.max(0, A.sec);
    const pal = paletteOfSec(sec);
    if (A.stageBackdrop !== 'void') {
      bgMat.uniforms.uTop.value.set(pal[0]).multiplyScalar(0.45); bgMat.uniforms.uMid.value.set(pal[1]).multiplyScalar(0.65); bgMat.uniforms.uBot.value.set(pal[2]).multiplyScalar(0.3);
    } else { bgMat.uniforms.uTop.value.set(0x05070a); bgMat.uniforms.uMid.value.set(0x0a0f14); bgMat.uniforms.uBot.value.set(0x020304); }
    bgMat.uniforms.uUseTex.value = 0;
    if (A.stageBackdrop === 'frame') { const r = A.getRes(sec); if (r.ready) { bgMat.uniforms.uTex.value = r.frame; bgMat.uniforms.uUseTex.value = 1; } }
    floor.visible = !offscreen && A.stageBackdrop !== 'frame';
    ghost.visible = !offscreen; ghostMat.opacity = A.ghostOn ? 0.42 : 0;
    A.stageItems.forEach(it => {
      const u = it.mesh.material.uniforms, dv = A.dialValues(it.dials);
      it.mesh.position.set(it.x, it.y, it.z); it.mesh.rotation.z = it.rot; it.mesh.scale.set(it.w * it.s * it.flip, it.h * it.s, 1);
      u.uLevel.value = dv.lvl; u.uBlur.value = dv.blur; u.uSharp.value = dv.sharp; u.uGain.value = dv.gain; u.uTemp.value = dv.temp;
      u.uMorph.value = dv.morph; u.uRelief.value = 1.6 / Math.max(0.6, it.s); u.uTime.value = time; u.uPick.value = picking ? 1 : 0; u.uPickId.value = it.id;
      const sel = A.stageSel === it && !offscreen; u.uSelGlow.value = sel ? 1 : 0; u.uOutline.value = 0; u.uHeat.value = 0; u.uDim.value = 0;
      it.mesh.renderOrder = 0;
    });
    // keep camera pose for offscreen compare
    A.stageCamPose.copy(A.camera.position);
  };
  // picking on stage: GPU pass -> item id
  A.pickStage = function (cx, cy) {
    const id = A.pickAt(cx, cy);
    return id >= 0 ? A.stageItems.find(i => (i.id) === id) : null;
  };

  // pointer drag of stage items
  (function () {
    const holo = document.getElementById('hologramCanvas');
    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
    let drag = null;
    function toWorld(cx, cy, z) {
      const r = A.canvas.getBoundingClientRect();
      ray.setFromCamera({ x: ((cx - r.left) / r.width) * 2 - 1, y: -((cy - r.top) / r.height) * 2 + 1 }, A.camera);
      plane.constant = -z; return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
    }
    holo.addEventListener('pointerdown', e => {
      if (window.state && state.engineVersion !== 'v5') return; if (A.view !== 'stage') return;
      A.camera.updateMatrixWorld();
      const it = A.pickStage(e.clientX, e.clientY);
      if (it) { A.selectItem(it); const w = toWorld(e.clientX, e.clientY, it.z); drag = { it, ox: w ? it.x - w.x : 0, oy: w ? it.y - w.y : 0 }; A.stageDrag = { active: true }; }
      else { A.stageDrag = { active: false }; }
    });
    window.addEventListener('pointermove', e => {
      if (!drag) return; const w = toWorld(e.clientX, e.clientY, drag.it.z); if (w) { drag.it.x = w.x + drag.ox; drag.it.y = w.y + drag.oy; }
    });
    window.addEventListener('pointerup', () => { if (drag) { A.emit('loop', 'COMPOSE'); } drag = null; A.stageDrag = { active: false }; });
    holo.addEventListener('wheel', e => {
      if (window.state && state.engineVersion !== 'v5') return; if (A.view !== 'stage' || !A.stageSel) return;
      if (e.shiftKey) { A.stageSel.z = clamp(A.stageSel.z - e.deltaY * 0.01, -8, 8); } else { A.stageSel.s = clamp(A.stageSel.s * (1 - e.deltaY * 0.001), 0.15, 5); }
      e.stopImmediatePropagation(); e.preventDefault();
    }, { passive: false, capture: true });
  })();

  // --------------------------------------------------------------------------
  // BLIND CRITIC
  // --------------------------------------------------------------------------
  const CW = 192, CH = 108;
  function targetPixels(sec) {
    const r = A.getRes(sec); if (!r.ready) return null;
    if (!r._t192) {
      const c = document.createElement('canvas'); c.width = CW; c.height = CH; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(r.frameImg, 0, 0, CW, CH); r._t192 = x.getImageData(0, 0, CW, CH).data;
      const lc = document.createElement('canvas'); lc.width = CW; lc.height = CH; const lx = lc.getContext('2d', { willReadFrequently: true });
      lx.imageSmoothingEnabled = false; lx.drawImage(r.labelCanvas, 0, 0, CW, CH); const ld = lx.getImageData(0, 0, CW, CH).data;
      r._l192 = new Uint8Array(CW * CH); for (let i = 0; i < CW * CH; i++) r._l192[i] = ld[i * 4];
    }
    return r;
  }
  const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  function ssimBlocks(a, b, mask) {
    // 8x8 non-overlapping luma SSIM, optionally restricted to mask (label==id)
    const C1 = 6.5, C2 = 58.5; let sum = 0, n = 0;
    for (let by = 0; by + 8 <= CH; by += 4) for (let bx = 0; bx + 8 <= CW; bx += 4) {
      if (mask) { let cnt = 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (mask((by + y) * CW + bx + x)) cnt++; if (cnt < 24) continue; }
      let ma = 0, mb = 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = ((by + y) * CW + bx + x) * 4; ma += luma(a, i); mb += luma(b, i); }
      ma /= 64; mb /= 64; let va = 0, vb = 0, cv = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = ((by + y) * CW + bx + x) * 4; const da = luma(a, i) - ma, db = luma(b, i) - mb; va += da * da; vb += db * db; cv += da * db; }
      va /= 63; vb /= 63; cv /= 63;
      sum += ((2 * ma * mb + C1) * (2 * cv + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2)); n++;
    }
    return n ? sum / n : 1;
  }
  function edgeMap(d) {
    const e = new Float32Array(CW * CH);
    for (let y = 1; y < CH - 1; y++) for (let x = 1; x < CW - 1; x++) {
      const i = (y * CW + x) * 4;
      const gx = luma(d, i + 4) - luma(d, i - 4), gy = luma(d, i + CW * 4) - luma(d, i - CW * 4); e[y * CW + x] = Math.hypot(gx, gy);
    } return e;
  }
  function pearson(a, b) {
    let ma = 0, mb = 0; const n = a.length; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
    let sa = 0, sb = 0, sc = 0; for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sa += x * x; sb += y * y; sc += x * y; }
    return sc / Math.sqrt(sa * sb + 1e-9);
  }
  function histInter(a, b) {
    const ha = new Float32Array(16), hb = new Float32Array(16);
    for (let i = 0; i < CW * CH; i++) { ha[Math.min(15, luma(a, i * 4) >> 4)]++; hb[Math.min(15, luma(b, i * 4) >> 4)]++; }
    let s = 0; for (let k = 0; k < 16; k++) s += Math.min(ha[k], hb[k]); return s / (CW * CH);
  }
  const verdicts = [[97, 'INDISTINGUISHABLE. A blind listener could not tell the model from the frame.'], [90, 'NEARLY IDENTICAL. Only a trained ear would catch the difference.'], [78, 'CLOSE. The room is right; fine detail is missing.'], [60, 'RECOGNISABLE. The scene is there, the surfaces are not.'], [35, 'IMPRESSION ONLY. Mood and layout survive.'], [0, 'DIFFERENT SCENE. Rebuild from parts.']];
  const COST = [3, 9, 10, 1008, 389000];   // floats per segment at each ladder level (flat, gradient, relief, mosaic, film)
  A.levelCost = lv => { const a = Math.floor(clamp(lv, 0, 4)), b = Math.min(4, a + 1), f = clamp(lv, 0, 4) - a; return Math.exp(Math.log(COST[a]) * (1 - f) + Math.log(COST[b]) * f); };

  A.critic = { last: null };
  A.critic.run = function (mode) {
    mode = mode || (A.view === 'stage' ? 'stage' : 'frame');
    const sec = mode === 'stage' ? (A.targetSec != null ? A.targetSec : A.sec) : A.sec;
    const tgt = targetPixels(sec); if (!tgt) return null;
    const out = A.renderOffscreen(CW, CH, mode);
    const a = out, b = tgt._t192;
    let dE = 0; for (let i = 0; i < CW * CH; i++) { const o = i * 4; dE += (Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2])) / 765; }
    dE /= CW * CH;
    const ss = ssimBlocks(a, b), ec = clamp(pearson(edgeMap(a), edgeMap(b)), 0, 1), hi = histInter(a, b);
    const fid = 100 * clamp(0.40 * clamp(ss, 0, 1) + 0.25 * clamp(1 - dE * 3.4, 0, 1) + 0.20 * ec + 0.15 * hi, 0, 1);
    // per-segment error (frame mode: by label; stage mode: global only)
    const heat = {}, notes = [];
    if (mode === 'frame') {
      D.sec[sec].segs.forEach(seg => {
        const m = i => tgt._l192[i] === seg.i; let cnt = 0, e = 0, dr = 0, dg = 0, db = 0;
        for (let i = 0; i < CW * CH; i++) if (m(i)) { cnt++; const o = i * 4; e += (Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2])) / 765; dr += a[o] - b[o]; dg += a[o + 1] - b[o + 1]; db += a[o + 2] - b[o + 2]; }
        if (cnt < 20) return; e /= cnt; const sx = ssimBlocks(a, b, m);
        heat[seg.tid] = clamp(e * 5, 0, 1);
        if (e > 0.012 || sx < 0.93) {
          const warm = (dr - db) / cnt, bright = (dr + dg + db) / (3 * cnt);
          notes.push({ tid: seg.tid, id: seg.id, e, sx, text: `${seg.id}: ${bright > 6 ? 'too bright' : bright < -6 ? 'too dark' : 'tone ok'}${warm > 6 ? ', too warm' : warm < -6 ? ', too cool' : ''}${sx < 0.8 ? ', detail missing' : ''} (SSIM ${(sx * 100) | 0})` });
        }
      });
      notes.sort((p, q) => q.e - p.e);
    } else {
      // stage: describe what is missing relative to the target's big parts
      D.sec[sec].segs.slice().sort((p, q) => q.a - p.a).slice(0, 3).forEach(seg => {
        const x0 = Math.floor(seg.cx * CW), y0 = Math.floor(seg.cy * CH), i = (y0 * CW + x0) * 4;
        const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        if (d > 90) notes.push({ tid: seg.tid, id: seg.id, e: d / 765, text: `Nothing like ${seg.id} (${seg.cn}) at ${(seg.cx * 100) | 0}% across, ${(seg.cy * 100) | 0}% down.` });
      });
    }
    // model cost (frame mode): geometric mean of per-segment ladder costs vs full film
    let cost = 0, full = 0;
    if (mode === 'frame') D.sec[sec].segs.forEach(seg => { const lv = A.dialValues(A.getParams(seg.tid)).lvl; cost += A.levelCost(lv) * 1; full += COST[4]; });
    const res = { mode, sec, fid, ssim: ss, dE, edge: ec, hist: hi, heat, notes, cost, full, ratio: full ? full / Math.max(1, cost) : 0,
      verdict: verdicts.find(v => fid >= v[0])[1], t: performance.now() };
    A.critic.last = res; A.heat = heat; A.emit('critic', res); A.emit('loop', 'COMPARE');
    return res;
  };

  // --------------------------------------------------------------------------
  // INVERSE BOOTSTRAP  scene -> orb:  fit the dials, let the rings turn, remember it
  // --------------------------------------------------------------------------
  A.fitting = false;
  function turnRing(r, angle) { if (window.setRingAngle) { state._syncingNode = true; setRingAngle(r, angle, true); state._syncingNode = false; } }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function segSSIM(seg, sec, bufT) {
    const tgt = targetPixels(sec); const out = A.renderOffscreen(96 * 2, 54 * 2, 'frame'); // 192x108
    return ssimBlocks(out, tgt._t192, i => tgt._l192[i] === seg.i);
  }
  A.bootstrap = async function () {
    if (A.fitting || A.view === 'stage' && !A.stageSel) return;
    A.fitting = true; A.emit('fit', 'start');
    try {
      if (A.view === 'stage') await fitStageItem(A.stageSel);
      else {
        const segs = A.sel ? [A.segByTid(A.sel)] : A.segsRanked().slice(0, 6);
        for (const seg of segs) {
          if (!seg) continue;
          if (A.sel !== seg.tid) A.select(seg.tid, true);
          const p = A.getParams(seg.tid);
          // 1. reset to truth while ladder is walked from the primitive upward
          for (let r = 1; r < 5; r++) { p[r] = A.truth[r]; turnRing(r, A.truth[r]); }
          let fitLv = 4, q = 1;
          for (let lv = 0; lv <= 4; lv++) {
            p[0] = A.levelAngle(lv); turnRing(0, p[0]); await sleep(90);
            q = lv === 4 ? 1 : segSSIM(seg, A.sec);
            A.emit('fit', 'step', seg, lv, q);
            if (q >= 0.9) { fitLv = lv; break; }
          }
          const ang = A.levelAngle(fitLv); p[0] = ang; turnRing(0, ang);
          // 2. learn
          const L = A.learned[seg.cls] || (A.learned[seg.cls] = { dials: A.truth.slice(), lv: fitLv, n: 0 });
          L.n++; L.lv = L.lv * 0.6 + fitLv * 0.4; L.dials = A.truth.slice(); L.dials[0] = A.levelAngle(Math.min(4, L.lv + 0.35));
          A.fit = A.fit || {}; A.fit[seg.tid] = { lv: fitLv, q };
          A.emit('fit', 'done', seg, fitLv, q); await sleep(120);
        }
        persist();
      }
    } finally { A.fitting = false; A.emit('fit', 'end'); A.critic.run(); }
  };

  // stage item: match colour, tone and softness to the film's own part of the same class
  async function fitStageItem(it) {
    const tgtSec = A.targetSec != null ? A.targetSec : A.sec;
    const cands = D.sec[tgtSec].segs.filter(g => g.cls === it.cls || (it.cls === 'FLAME' && g.cls === 'LIGHT'));
    const ref = (cands.sort((a, b) => b.a - a.a)[0]) || D.sec[tgtSec].segs.slice().sort((a, b) => b.a - a.a)[0];
    const hx = A.hexToVec; const mine = hx(it.seg.rgb), want = hx(ref.rgb);
    const lm = 0.299 * mine[0] + 0.587 * mine[1] + 0.114 * mine[2], lw = 0.299 * want[0] + 0.587 * want[1] + 0.114 * want[2];
    const gain = clamp(lw / Math.max(0.02, lm), 0.3, 3.0);
    const rbM = (mine[0] - mine[2]), rbW = (want[0] - want[2]);
    const temp = clamp((rbW - rbM * gain) * 2.2, -1, 1);
    const angGain = 110 + Math.log2(gain) / 1.6 * 90, angTemp = 110 + temp * 90;
    const angFocus = 20 + 165 * clamp(0.66 * (0.35 + ref.fo * 1.2), 0.2, 0.8) / 0.66 * 0.66 / 0.66 * 0.66 / 0.66;
    const targets = [it.dials[0], clamp(20 + 165 * clamp(0.3 + ref.fo * 0.55, 0.3, 0.9), 20, 185), it.dials[2], clamp(angGain, 20, 200), clamp(angTemp, 20, 200)];
    for (let k = 0; k < 14; k++) {
      for (let r = 1; r < 5; r++) { const v = it.dials[r] + (targets[r] - it.dials[r]) * 0.38; it.dials[r] = v; turnRing(r, v); }
      await sleep(55);
    }
    for (let r = 1; r < 5; r++) { it.dials[r] = targets[r]; turnRing(r, targets[r]); }
    const L = A.learned[it.cls] || (A.learned[it.cls] = { dials: A.truth.slice(), lv: 4, n: 0 });
    L.n++; for (let r = 1; r < 5; r++) L.dials[r] = L.dials[r] * 0.5 + targets[r] * 0.5;
    A.emit('fit', 'done', ref, 4, 1); persist();
  }
  A.pins = {};

  // ladder explainer data for the UI
  A.ladderFor = function (seg) {
    const p = D.priors[seg.cls]; return { need: seg.lv != null ? seg.lv : (p ? Math.round(p.lv) : 4), q: seg.lq || (p ? p.q : null) };
  };


  // --------------------------------------------------------------------------
  // PER-RING MOTOR FIT: tapping a motor button on the orb asks that ring to seek
  // the value the scene implies (frame part: the film's truth / ladder level;
  // stage part: match the film's own part of the same class).
  // --------------------------------------------------------------------------
  async function seekRing(r, target, steps) {
    const holder = A.view === 'stage' && A.stageSel ? A.stageSel.dials : (A.sel ? A.getParams(A.sel) : null); if (!holder) return;
    const from = holder[r]; steps = steps || 12;
    for (let k = 1; k <= steps; k++) { const v = from + (target - from) * (k / steps); holder[r] = v; turnRing(r, v); await sleep(34); }
    holder[r] = target; turnRing(r, target);
  }
  A.fitRing = async function (r) {
    if (A.fitting) return; A.fitting = true;
    try {
      if (A.view === 'stage' && A.stageSel) {
        const it = A.stageSel; const sec = A.targetSec != null ? A.targetSec : A.sec;
        const ref = D.sec[sec].segs.filter(g => g.cls === it.cls).sort((a, b) => b.a - a.a)[0] || D.sec[sec].segs.slice().sort((a, b) => b.a - a.a)[0];
        const hx = A.hexToVec, mine = hx(it.seg.rgb), want = hx(ref.rgb);
        const lm = 0.299 * mine[0] + 0.587 * mine[1] + 0.114 * mine[2], lw = 0.299 * want[0] + 0.587 * want[1] + 0.114 * want[2];
        const gain = clamp(lw / Math.max(0.02, lm), 0.3, 3.0);
        const t = [A.truth[0], clamp(20 + 165 * clamp(0.3 + ref.fo * 0.55, 0.3, 0.9), 20, 185), A.priorFor(it.cls)[2],
          clamp(110 + Math.log2(gain) / 1.6 * 90, 20, 200), clamp(110 + clamp(((want[0] - want[2]) - (mine[0] - mine[2]) * gain) * 2.2, -1, 1) * 90, 20, 200)];
        await seekRing(r, t[r]);
        A.emit('fit', 'ring', ref, r);
      } else if (A.sel) {
        const seg = A.segByTid(A.sel); if (!seg) return;
        if (r === 0) {
          for (let lv = 0; lv <= 4; lv++) {
            await seekRing(0, A.levelAngle(lv), 5); await sleep(40);
            const q = lv === 4 ? 1 : (A.view === 'stage' ? 1 : (function () { const tgt = targetPixels(A.sec); const out = A.renderOffscreen(CW, CH, 'frame'); return ssimBlocks(out, tgt._t192, i => tgt._l192[i] === seg.i); })());
            if (q >= 0.9) { A.fit = A.fit || {}; A.fit[seg.tid] = { lv, q }; const L = A.learned[seg.cls] || (A.learned[seg.cls] = { dials: A.truth.slice(), lv, n: 0 }); L.n++; L.lv = L.lv * 0.6 + lv * 0.4; L.dials[0] = A.levelAngle(Math.min(4, L.lv + 0.35)); persist(); A.emit('fit', 'done', seg, lv, q); break; }
          }
        } else await seekRing(r, A.truth[r]);
      }
    } finally { A.fitting = false; A.critic.run(); }
  };

  // --------------------------------------------------------------------------
  // WEAVE / REBUILD: zero the frame to primitives and climb the ladder until the
  // critic can no longer tell it from the film. Records the rate-fidelity curve.
  // --------------------------------------------------------------------------
  A.curve = [];
  A.weave = async function () {
    if (A.fitting) return; if (A.view === 'stage') A.setView('film');
    A.fitting = true; A.curve = []; A.emit('fit', 'start');
    const segs = A.segsRanked();
    segs.forEach(g => { A.getParams(g.tid)[0] = A.levelAngle(0); });
    if (A.sel) A.syncRings(); await sleep(250);
    let stop = false;
    for (let lv = 1; lv <= 4 && !stop; lv++) {
      for (const g of segs) {
        if (A.fitting === false) { stop = true; break; }
        const p = A.getParams(g.tid);
        const start = p[0]; const goal = A.levelAngle(lv);
        for (let k = 1; k <= 3; k++) { p[0] = start + (goal - start) * k / 3; if (A.sel === g.tid) turnRing(0, p[0]); await sleep(24); }
        const r = A.critic.run('frame'); if (r) { A.curve.push({ fid: r.fid, ratio: r.ratio, lv, id: g.id }); }
        if (r && r.fid >= 97.5 && lv < 4) { stop = true; break; }
      }
    }
    A.fitting = false; A.emit('fit', 'end');
    const r = A.critic.run('frame');
    A.say(`Rebuilt. ${r.fid.toFixed(0)} out of 100 at ${r.ratio > 1 ? r.ratio.toFixed(0) + ' to 1' : 'full'} model size.`);
    A.emit('weave', A.curve);
  };


  // --------------------------------------------------------------------------
  // HERO CRITIC: the procedural bug / cake at the film's camera vs the film's own frame
  // --------------------------------------------------------------------------
  function frameStats(d) {
    let m = 0, m2 = 0, rb = 0, sat = 0, n = CW * CH, dark = 0;
    for (let i = 0; i < n; i++) { const o = i * 4, r = d[o], g = d[o + 1], b = d[o + 2], L = 0.299 * r + 0.587 * g + 0.114 * b; m += L; m2 += L * L; rb += r - b; sat += Math.max(r, g, b) - Math.min(r, g, b); if (L < 24) dark++; }
    m /= n; return { L: m, sd: Math.sqrt(Math.max(0, m2 / n - m * m)), warm: rb / n, sat: sat / n, dark: dark / n };
  }
  A.critic.runHero = function () {
    const H = A.hero; if (!H || !H.active) return null;
    const sec = A.matchSec != null ? A.matchSec : 33; const tgt = targetPixels(sec); if (!tgt) return null;
    const cv = H.capture(CW, CH); const a = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, CW, CH).data; const b = tgt._t192;
    let dE = 0; for (let i = 0; i < CW * CH; i++) { const o = i * 4; dE += (Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2])) / 765; } dE /= CW * CH;
    const ss = ssimBlocks(a, b), ec = clamp(pearson(edgeMap(a), edgeMap(b)), 0, 1), hi = histInter(a, b);
    const sa = frameStats(a), sb = frameStats(b);
    const fid = 100 * clamp(0.30 * clamp(ss * 1.4, 0, 1) + 0.30 * clamp(1 - dE * 2.6, 0, 1) + 0.15 * ec + 0.25 * hi, 0, 1);
    const notes = [];
    const dl = sa.L - sb.L; if (Math.abs(dl) > 14) notes.push(dl > 0 ? 'model is brighter than the frame' : 'model is darker than the frame');
    const dw = sa.warm - sb.warm; if (Math.abs(dw) > 12) notes.push(dw > 0 ? 'too warm / red against the frame' : 'too cool / green against the frame');
    const ds = sa.sat - sb.sat; if (Math.abs(ds) > 18) notes.push(ds > 0 ? 'more saturated than the frame' : 'flatter / greyer than the frame');
    const dc = sa.sd - sb.sd; if (Math.abs(dc) > 12) notes.push(dc > 0 ? 'more contrast than the frame' : 'less contrast than the frame');
    if (sb.dark - sa.dark > 0.2) notes.push('the frame is much darker around the subject'); if (sa.dark - sb.dark > 0.2) notes.push('the frame has more light in the surround');
    if (ec < 0.35) notes.push('edges and silhouette differ');
    const res = { mode: 'hero', sec, fid, ssim: ss, dE, edge: ec, hist: hi, notes: notes.map(t => ({ text: t })), verdict: verdicts.find(v => fid >= v[0])[1], stats: { model: sa, film: sb }, t: performance.now() };
    A.critic.last = res; A.emit('critic', res); return res;
  };


  // --------------------------------------------------------------------------
  // NO-REFERENCE QUALITY CRITIC: is this a usable film image, whatever it depicts?
  // Judged against the film's own statistics (exposure, contrast, colour, subject isolation),
  // not against one frame. Also a descriptor for diversity.
  // --------------------------------------------------------------------------
  const filmPri = (() => {
    const L = [], C = [], S = []; D.sec.forEach(x => { L.push(x.luma); C.push(x.contrast); S.push(x.sat); });
    const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(p * (b.length - 1))]; };
    return { luma: [q(L, .05), q(L, .95)], contrast: [q(C, .05), q(C, .95)], sat: [q(S, .05), q(S, .95)] };
  })();
  A.filmPriors = filmPri;
  A.critic.quality = function (cv) {
    const w = cv.width, h = cv.height; const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data; const n = w * h;
    const lum = new Float32Array(n); let m = 0, sat = 0, clipHi = 0, crush = 0; const hist = new Float32Array(64);
    for (let i = 0; i < n; i++) { const o = i * 4, r = d[o], g = d[o + 1], b = d[o + 2], L = 0.299 * r + 0.587 * g + 0.114 * b; lum[i] = L; m += L; sat += Math.max(r, g, b) - Math.min(r, g, b); if (L > 247) clipHi++; if (L < 12) crush++; hist[L >> 2]++; }
    m /= n; sat /= n; const pct = p => { let a = 0; for (let k = 0; k < 64; k++) { a += hist[k]; if (a >= p * n) return k * 4; } return 255; };
    const p5 = pct(.05), p50 = pct(.5), p95 = pct(.95); let v = 0; for (let i = 0; i < n; i++) v += (lum[i] - m) * (lum[i] - m); const sd = Math.sqrt(v / n);
    // edge energy: centre vs periphery (subject isolation / depth of field)
    let ec = 0, ep = 0, nc = 0, np = 0, sub = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; const gx = lum[i + 1] - lum[i - 1], gy = lum[i + w] - lum[i - w]; const e = Math.hypot(gx, gy); const cx = Math.abs(x / w - 0.5) < 0.25 && Math.abs(y / h - 0.5) < 0.25; if (cx) { ec += e; nc++; } else { ep += e; np++; } }
    ec /= nc; ep /= np; const iso = ec / Math.max(0.5, ep);
    // subject coverage: pixels far from the border colour
    let br = 0, bg = 0, bb = 0, bn = 0; for (let x = 0; x < w; x++) for (const y of [0, 1, h - 2, h - 1]) { const o = (y * w + x) * 4; br += d[o]; bg += d[o + 1]; bb += d[o + 2]; bn++; } br /= bn; bg /= bn; bb /= bn;
    for (let i = 0; i < n; i++) { const o = i * 4; if (Math.abs(d[o] - br) + Math.abs(d[o + 1] - bg) + Math.abs(d[o + 2] - bb) > 70) sub++; } sub /= n;
    const notes = []; let score = 0;
    // 1 exposure (0-20)
    let e = 20; if (m < 22) { e -= 12; notes.push('too dark overall'); } else if (m < 34) e -= 4; if (m > 165) { e -= 12; notes.push('overexposed'); } else if (m > 135) e -= 5; if (clipHi / n > 0.06) { e -= 8; notes.push('highlights clip to white'); } if (crush / n > 0.8) { e -= 8; notes.push('nearly black'); } score += clamp(e, 0, 20);
    // 2 dynamic range (0-20)
    const dr = p95 - p5; let r = clamp((dr - 25) / 90, 0, 1) * 20; if (dr < 55) notes.push('flat tonal range'); score += r;
    // 3 subject isolation / depth (0-20)
    let s3 = clamp((iso - 0.8) / 1.2, 0, 1) * 20; if (iso < 1.1) notes.push('subject does not separate from the background'); score += s3;
    // 4 subject size (0-15)
    let s4 = sub > 0.08 && sub < 0.75 ? 15 : sub <= 0.08 ? clamp(sub / 0.08, 0, 1) * 15 : clamp((1 - sub) / 0.25, 0, 1) * 15; if (sub <= 0.08) notes.push('subject too small'); if (sub >= 0.75) notes.push('frame is all subject'); score += s4;
    // 5 film style fit (0-25): luma, contrast, saturation inside the film's own 5-95% range (soft)
    const lN = m / 255, cN = sd / 255, sN = sat / 255 / 0.5 * 0.5; const fit = (x, [lo, hi]) => { const span = hi - lo + 1e-6; return x < lo ? clamp(1 - (lo - x) / span, 0, 1) : x > hi ? clamp(1 - (x - hi) / span, 0, 1) : 1; };
    const f1 = fit(lN, [filmPri.luma[0] * 0.5, Math.min(0.75, filmPri.luma[1] * 1.15)]), f2 = fit(cN, [filmPri.contrast[0] * 0.6, filmPri.contrast[1] * 1.5]), f3 = fit(sat / 255, [0.04, 0.42]); score += 25 * (0.4 * f1 + 0.3 * f2 + 0.3 * f3); if (f3 < 0.6) notes.push(sat / 255 > 0.42 ? 'more saturated than anything in the film' : 'greyer than the film');
    // descriptor: 4x3 mean colour + edge grid
    const desc = []; for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 4; gx++) { let rr = 0, gg = 0, bb2 = 0, c = 0; for (let y = Math.floor(gy * h / 3); y < Math.floor((gy + 1) * h / 3); y += 2) for (let x = Math.floor(gx * w / 4); x < Math.floor((gx + 1) * w / 4); x += 2) { const o = (y * w + x) * 4; rr += d[o]; gg += d[o + 1]; bb2 += d[o + 2]; c++; } desc.push(rr / c / 255, gg / c / 255, bb2 / c / 255); }
    return { score: clamp(score, 0, 100), notes, desc, stats: { mean: m, sd, p5, p50, p95, sat, iso, sub, clipHi: clipHi / n } };
  };
  A.critic.distance = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]); return Math.sqrt(s / a.length); };


  // --------------------------------------------------------------------------
  // LEARNED CRITIC FEATURES: 20 low-level statistics that separate real film frames from renders.
  // A logistic model on these (weights in atlas-critic.js, trained in-browser on film frames vs
  // our own renders) is the "blind critic": its accuracy is how far we still are from the film.
  // --------------------------------------------------------------------------
  A.critic.FEATURE_NAMES = ['luma', 'contrast', 'p5', 'p95', 'sat', 'colour-spread', 'warmth', 'dark-frac', 'bright-frac', 'detail', 'detail-centre', 'detail-ratio', 'edge-density', 'local-contrast', 'tone-entropy', 'hue-entropy', 'grain', 'top-bottom', 'sat-luma', 'spectral-slope'];
  A.critic.features = function (cv) {
    const w = cv.width, h = cv.height; const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data; const n = w * h;
    const L = new Float32Array(n); let m = 0, sat = 0, warm = 0, dark = 0, bright = 0; const hist = new Float32Array(32), hh = new Float32Array(8); const sats = new Float32Array(n);
    for (let i = 0; i < n; i++) { const o = i * 4, r = d[o], g = d[o + 1], b = d[o + 2], l = 0.299 * r + 0.587 * g + 0.114 * b; L[i] = l; m += l; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const sa = mx - mn; sats[i] = sa; sat += sa; warm += r - b; if (l < 24) dark++; if (l > 230) bright++; hist[l >> 3]++; if (sa > 12) { const hue = Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b); hh[(((hue / Math.PI + 1) * 4) | 0) & 7] += sa; } }
    m /= n; sat /= n; warm /= n; let v = 0; for (let i = 0; i < n; i++) v += (L[i] - m) * (L[i] - m); const sd = Math.sqrt(v / n); const hs = []; for (let k = 0; k < 32; k++) hs.push(hist[k]);
    const cum = []; let a = 0; for (let k = 0; k < 32; k++) { a += hist[k]; cum.push(a / n); } const pc = p => { for (let k = 0; k < 32; k++) if (cum[k] >= p) return k * 8; return 255; };
    let lapC = 0, lapP = 0, nc = 0, np = 0, lapAll = 0, edge = 0, flatLap = 0, nf = 0, gE1 = 0; const L2 = new Float32Array((w >> 1) * (h >> 1)); const w2 = w >> 1;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; const lap = Math.abs(4 * L[i] - L[i - 1] - L[i + 1] - L[i - w] - L[i + w]); const gx = L[i + 1] - L[i - 1], gy = L[i + w] - L[i - w]; const ge = Math.hypot(gx, gy); lapAll += lap; gE1 += ge; if (ge > 20) edge++; if (ge < 4) { flatLap += lap; nf++; } const cx = Math.abs(x / w - 0.5) < 0.25 && Math.abs(y / h - 0.5) < 0.25; if (cx) { lapC += lap; nc++; } else { lapP += lap; np++; } }
    for (let y = 0; y < (h >> 1); y++) for (let x = 0; x < w2; x++) L2[y * w2 + x] = (L[(2 * y) * w + 2 * x] + L[(2 * y) * w + 2 * x + 1] + L[(2 * y + 1) * w + 2 * x] + L[(2 * y + 1) * w + 2 * x + 1]) / 4;
    let gE2 = 0; for (let y = 1; y < (h >> 1) - 1; y++) for (let x = 1; x < w2 - 1; x++) { const i = y * w2 + x; gE2 += Math.hypot(L2[i + 1] - L2[i - 1], L2[i + w2] - L2[i - w2]); }
    lapAll /= n; lapC /= nc; lapP /= np; edge /= n; flatLap = nf ? flatLap / nf : 0; gE1 /= n; gE2 /= (w2 * (h >> 1));
    const bm = []; for (let by = 0; by < h - 8; by += 8) for (let bx = 0; bx < w - 8; bx += 8) { let s = 0; for (let y = 0; y < 8; y += 2) for (let x = 0; x < 8; x += 2) s += L[(by + y) * w + bx + x]; bm.push(s / 16); } const bmm = bm.reduce((p, q) => p + q, 0) / bm.length; const lc = Math.sqrt(bm.reduce((p, q) => p + (q - bmm) * (q - bmm), 0) / bm.length);
    let ent = 0; hs.forEach(c => { const p = c / n; if (p > 0) ent -= p * Math.log2(p); }); let he = 0; const hsum = hh.reduce((p, q) => p + q, 0) + 1e-6; hh.forEach(c => { const p = c / hsum; if (p > 0) he -= p * Math.log2(p); });
    let top = 0, bot = 0; for (let y = 0; y < h / 2; y++) for (let x = 0; x < w; x++) { top += L[y * w + x]; bot += L[(y + (h >> 1)) * w + x]; } top /= (n / 2); bot /= (n / 2);
    let cs = 0; for (let i = 0; i < n; i++) cs += (sats[i] - sat) * (L[i] - m); cs /= n * (sd * 20 + 1e-3);
    let sv = 0; for (let i = 0; i < n; i++) sv += (sats[i] - sat) * (sats[i] - sat); sv = Math.sqrt(sv / n);
    return [m / 255, sd / 255, pc(.05) / 255, pc(.95) / 255, sat / 255, sv / 255, warm / 255, dark / n, bright / n, lapAll / 40, lapC / 40, lapC / (lapP + 0.5), edge, lc / 255, ent / 5, he / 3, flatLap / 6, (top - bot) / 255, clamp(cs, -1, 1), Math.log((gE1 + 0.5) / (gE2 + 0.5))];
  };
  // trained blind critic: P(this frame is real film)
  A.critic.filmLike = function (cv) {
    const M = window.STELLINE_CRITIC; if (!M) return null; const f = A.critic.features(cv); let z = M.b; for (let i = 0; i < f.length; i++) z += M.w[i] * (f[i] - M.mean[i]) / (M.std[i] + 1e-6);
    const contrib = f.map((x, i) => ({ name: A.critic.FEATURE_NAMES[i], c: M.w[i] * (x - M.mean[i]) / (M.std[i] + 1e-6) })).sort((a, b) => a.c - b.c);
    return { p: 1 / (1 + Math.exp(-z)), z, worst: contrast_(contrib), feats: f };
  };
  function contrast_(c) { return c.slice(0, 3).map(x => x.name); }

  // initial kit / hand
  A.activeKit = null;
  setTimeout(() => A.restoreBin && A.restoreBin(), 400);
})();
