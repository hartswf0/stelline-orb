/* CUP: the physical orb. An insulated tumbler wrapped in a printed grid, modeled and mapped so a camera can read it.

   What is on the object (read from nine photographs on a centimetre cutting mat, 2026-11-17):
     a slate-blue tumbler with a domed lid; round it a printed label of 24 columns by 6 bands; every cell carries a
     letter (A to X), a number (01 to 24) and its band (B1 to B6); a white strip with a cross and a millimetre ruler
     covers the seam between column 24 and column 01.

   Cup frame (millimetres): y runs up the axis from the base (0) to the top of the lid (H). The angle a is 0 at the
   middle of the ruler strip and grows to the right as you face the cup with its lid up. A point on the surface is
   (R sin a, y, R cos a). Column 01 is the first to the LEFT of the strip, so columns advance with falling angle.
   Band B1 is nearest the base, B6 nearest the lid. The print is upside down when the lid is up.

   Measured, with how well:
     label height 100 mm, band 16.7 mm      from the strip's own ruler (60 mm tip to tip) in two photographs
     column pitch 14.0 deg, seam 24 deg     from column centres either side of the strip; 24 x 14 + 24 = 360
     diameter 90 mm                         column 11.0 mm wide at 14 deg; agrees with the mat grid to about 4 mm
     height 172 mm, base and lid shapes     from the mat grid under perspective: good to about 8 mm
   Everything is a field of CUP.spec, so a caliper reading can replace an estimate (see cup-ar.html, CALIBRATE).

   window.CUP = { spec, colAngle, cellAt, regionAt, cellCenter, paintLabel, buildModel, reference, detect, poseFrom,
                  rayToCup }                                   three.js r128 is needed only for buildModel. */
(function () {
'use strict';
const D2R = Math.PI / 180, TAU = Math.PI * 2;
const spec = {
  D: 90, H: 172,                       // body diameter and overall height, mm
  labelY0: 20, labelH: 117,            // the label: lower edge above the base, and its height
  cols: 24, bands: 6, gapDeg: 24,      // the seam the strip covers, centred on angle 0
  stripW: 19, rulerHalf: 30,           // strip width (mm) and the ruler's reach either side of the cross
  baseR: 14, collar: 8, lid: 27,      // base corner radius; label top to lid seam; lid dome height
  color: '#4f6c82', letters: 'ABCDEFGHIJKLMNOPQRSTUVWX'
};
const R = () => spec.D / 2, pitch = () => (360 - spec.gapDeg) / spec.cols, norm = a => ((a % 360) + 540) % 360 - 180;
/* centre angle of column c (1..cols) */
function colAngle(c) { return norm(-(spec.gapDeg / 2 + (c - .5) * pitch())); }
/* what is at angle a (degrees) and height y (mm) */
function regionAt(a, y) {
  if (y < 0 || y > spec.H) return 'off'; if (y < spec.labelY0) return 'base'; const top = spec.labelY0 + spec.labelH;
  if (y > top + spec.collar) return 'lid'; if (y > top) return 'collar';
  return Math.abs(norm(a)) * D2R * R() <= spec.stripW / 2 ? 'strip' : (Math.abs(norm(a)) < spec.gapDeg / 2 ? 'strip' : 'label');
}
function cellAt(a, y) {
  const reg = regionAt(a, y); if (reg !== 'label') return { region: reg };
  const u = ((-norm(a) + 360) % 360 - spec.gapDeg / 2) / pitch(), col = Math.min(spec.cols, Math.max(1, Math.floor(u) + 1));
  const band = Math.min(spec.bands, Math.max(1, Math.floor((y - spec.labelY0) / (spec.labelH / spec.bands)) + 1));
  return { region: 'label', col, band, letter: spec.letters[col - 1], id: spec.letters[col - 1] + String(col).padStart(2, '0') + '-B' + band, u: u - Math.floor(u), v: ((y - spec.labelY0) / (spec.labelH / spec.bands)) % 1 };
}
function cellCenter(col, band) { const a = colAngle(col) * D2R, y = spec.labelY0 + (band - .5) * spec.labelH / spec.bands; return { a: colAngle(col), y, p: [R() * Math.sin(a), y, R() * Math.cos(a)] }; }

/* The label as printed, unwrapped: x runs with the angle (0 at the left edge = the middle of the strip, so the strip
   wraps round the two ends), the top edge is the lid side. sx, sy are pixels per millimetre. */
function paintLabel(ctx, sx, sy) {
  const C = TAU * R(), W = C * sx, Hh = spec.labelH * sy, bh = spec.labelH / spec.bands, mmDeg = C / 360, pw = pitch() * mmDeg;
  ctx.save(); ctx.fillStyle = '#f4f1e8'; ctx.fillRect(0, 0, W, Hh); ctx.scale(sx, sy); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const X = a => ((a % 360) + 360) % 360 * mmDeg;
  for (let c = 1; c <= spec.cols; c++) { const xc = X(colAngle(c));
    ctx.strokeStyle = 'rgba(40,40,40,.55)'; ctx.lineWidth = .18; ctx.beginPath(); ctx.moveTo(xc - pw / 2, 0); ctx.lineTo(xc - pw / 2, spec.labelH); ctx.moveTo(xc + pw / 2, 0); ctx.lineTo(xc + pw / 2, spec.labelH); ctx.stroke();
    for (let b = 1; b <= spec.bands; b++) { const yt = (spec.bands - b) * bh; ctx.fillStyle = '#141414';
      const put = (txt, fy, mm, wt) => { ctx.save(); ctx.translate(xc, yt + fy * bh); ctx.rotate(Math.PI); ctx.font = wt + ' ' + mm + 'px "DejaVu Sans", Verdana, Arial, sans-serif'; ctx.fillText(txt, 0, 0); ctx.restore(); };
      put(spec.letters[c - 1], .16, 2.9, 'bold'); put(String(c).padStart(2, '0'), .5, 5.6, 'bold'); put('B' + b, .84, 3.3, 'bold'); } }
  ctx.strokeStyle = 'rgba(40,40,40,.7)'; ctx.lineWidth = .25; for (let b = 0; b <= spec.bands; b++) { ctx.beginPath(); ctx.moveTo(0, b * bh); ctx.lineTo(C, b * bh); ctx.stroke(); }
  /* the strip: plain white over the seam, a cross at mid height, a ruler in millimetres with 10, 20, 30 marked */
  const hw = spec.stripW / 2, ym = spec.labelH / 2;
  [0, C].forEach(x0 => { ctx.fillStyle = '#fbfaf6'; ctx.fillRect(x0 - hw, -1, spec.stripW, spec.labelH + 2); ctx.strokeStyle = 'rgba(60,60,60,.35)'; ctx.lineWidth = .15; ctx.strokeRect(x0 - hw, -1, spec.stripW, spec.labelH + 2);
    ctx.strokeStyle = '#555'; ctx.lineWidth = .22; ctx.beginPath(); ctx.moveTo(x0, ym - spec.rulerHalf); ctx.lineTo(x0, ym + spec.rulerHalf); ctx.moveTo(x0 - 7, ym); ctx.lineTo(x0 + 7, ym);
    for (let m = -spec.rulerHalf; m <= spec.rulerHalf; m += 2) { const L = m % 10 === 0 ? 2.6 : m % 5 === 0 ? 1.8 : 1.1; ctx.moveTo(x0 - L, ym + m); ctx.lineTo(x0 + L, ym + m); }
    for (let m = -6; m <= 6; m += 2) { ctx.moveTo(x0 + m, ym - 1); ctx.lineTo(x0 + m, ym + 1); } ctx.stroke();
    ctx.fillStyle = '#777'; ctx.font = '1.9px "DejaVu Sans", Verdana, Arial, sans-serif'; ctx.textAlign = 'left'; for (const m of [10, 20, 30]) { ctx.fillText(String(m), x0 + 4.2, ym - m); ctx.fillText(String(m), x0 + 4.2, ym + m); } ctx.textAlign = 'center'; });
  ctx.restore();
}

/* the object in three.js, in millimetres, standing on its base at the origin */
function buildModel(opt) {
  const T = THREE, o = opt || {}, r = R(), g = new T.Group(), top = spec.labelY0 + spec.labelH, seam = top + spec.collar;
  const P = [[0, 0], [r - spec.baseR, 0]]; for (let k = 1; k <= 8; k++) { const a = k / 8 * Math.PI / 2; P.push([r - spec.baseR + spec.baseR * Math.sin(a), spec.baseR - spec.baseR * Math.cos(a)]); }
  P.push([r, seam - 1.2], [r - 1.2, seam - .6], [r - 1.2, seam]);
  const bodyMat = new T.MeshStandardMaterial({ color: spec.color, roughness: .62, metalness: .05, transparent: !!o.ghost, opacity: o.ghost ? .28 : 1 });
  const body = new T.Mesh(new T.LatheGeometry(P.map(p => new T.Vector2(Math.max(.001, p[0]), p[1])), 72), bodyMat); body.name = 'body'; g.add(body);
  const L = [[r - .3, seam + .4]]; for (let k = 1; k <= 14; k++) { const a = k / 14 * Math.PI / 2; L.push([(r - .3) * Math.cos(a) * (1 - .1 * Math.sin(a)) + 0, seam + .4 + spec.lid * Math.pow(Math.sin(a), .8)]); }
  const lid = new T.Mesh(new T.LatheGeometry(L.map(p => new T.Vector2(Math.max(.001, p[0]), p[1])), 72), bodyMat); lid.name = 'lid'; g.add(lid);
  const ring = new T.Mesh(new T.TorusGeometry(9, .6, 8, 40), new T.MeshStandardMaterial({ color: 0x4f6d83, roughness: .7 })); ring.rotation.x = Math.PI / 2; ring.position.y = spec.H - .4; g.add(ring);
  const cv = document.createElement('canvas'), s = o.pxPerMm || 8; cv.width = Math.round(TAU * r * s); cv.height = Math.round(spec.labelH * s); paintLabel(cv.getContext('2d'), cv.width / (TAU * r), cv.height / spec.labelH);
  const tx = new T.CanvasTexture(cv); tx.encoding = T.sRGBEncoding; tx.anisotropy = 8;
  const lab = new T.Mesh(new T.CylinderGeometry(r + .15, r + .15, spec.labelH, 96, 1, true), (o.ghost ? new T.MeshBasicMaterial({ map: tx, color: 0x5ff0dc, transparent: true, opacity: .42, depthWrite: false }) : new T.MeshStandardMaterial({ map: tx, roughness: .9 }))); lab.position.y = spec.labelY0 + spec.labelH / 2; lab.name = 'label'; g.add(lab);
  g.userData.labelCanvas = cv; return g;
}
/* a patch lying on one cell, for showing which cell a finger is on */
function cellPatch(col, band, color) { const T = THREE, r = R() + .6, a0 = (colAngle(col) - pitch() / 2) * D2R, bh = spec.labelH / spec.bands;
  const m = new T.Mesh(new T.CylinderGeometry(r, r, bh, 6, 1, true, a0, pitch() * D2R), new T.MeshBasicMaterial({ color: color || 0xf0b040, transparent: true, opacity: .55, side: T.DoubleSide, depthTest: false })); m.position.y = spec.labelY0 + (band - .5) * bh; return m; }

/* ------------------------------------------------------------------ reading it with a camera ------------------ */
const STEP = .5, NA = 301, MV = 192, A0 = -75;     // the unwrapped patch: 301 angles half a degree apart, 192 rows up the label
const RHOS = [.06, .11, .16, .21];
let REF = null;
function highpass(src, w, h, rad) { const out = new Float32Array(w * h), ii = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += src[y * w + x]; ii[(y + 1) * (w + 1) + x + 1] = ii[y * (w + 1) + x + 1] + row; } }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const x0 = Math.max(0, x - rad), x1 = Math.min(w, x + rad + 1), y0 = Math.max(0, y - rad), y1 = Math.min(h, y + rad + 1);
    out[y * w + x] = src[y * w + x] - (ii[y1 * (w + 1) + x1] - ii[y0 * (w + 1) + x1] - ii[y1 * (w + 1) + x0] + ii[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0)); } return out; }
/* the whole label, unwrapped, small: for showing and for checks */
function reference() { const cv = document.createElement('canvas'); cv.width = 720; cv.height = 192; paintLabel(cv.getContext('2d'), 720 / (TAU * R()), 192 / spec.labelH); return { canvas: cv }; }
/* Read an unwrapped patch (NA x MV, top row assumed to be the lid side) the way a ring encoder is read.
   TICKS  the columns of print repeat every 14 degrees: their phase says how far the nearest column centre is from the
          middle of the patch.
   INDEX  the ruler strip is the one place with no print: when it is in the patch, the turn is known outright.
   WHICH END  inside each band the rows run letter (light), number (heavy), band code (middling) from the lid down;
          the heavier neighbour of the number row is therefore on the base side.
   Returns { score, pitch, cols:[relative angles of column centres], strip: relative angle or null, dir: +1 lid at top,
   -1 lid at bottom, dirConf } with angles in degrees from the patch's middle, growing to the right. */
function pitch0() { return (360 - spec.gapDeg) / spec.cols; }
function decode(U, force) {
  const ink = highpass(U, NA, MV, 20); for (let i = 0; i < ink.length; i++) ink[i] = ink[i] < 0 ? -ink[i] : 0;
  /* columns */
  const prof = new Float32Array(NA), y0 = Math.round(MV * .12), y1 = Math.round(MV * .88); for (let x = 0; x < NA; x++) { let a = 0; for (let y = y0; y < y1; y++) a += ink[y * NA + x]; prof[x] = a / (y1 - y0); }
  const sm = new Float32Array(NA); for (let x = 0; x < NA; x++) { let a = 0, w = 0; for (let k = -8; k <= 8; k++) { const xx = x + k; if (xx < 0 || xx >= NA) continue; const g = Math.exp(-k * k / 18); a += prof[xx] * g; w += g; } sm[x] = a / w; }
  let mean = 0; for (let x = 20; x < NA - 20; x++) mean += sm[x]; mean /= (NA - 40); let v0 = 0; for (let x = 20; x < NA - 20; x++) v0 += (sm[x] - mean) * (sm[x] - mean); if (v0 < 1e-6) return null;
  let pitch = 0, pk = -1; for (let k = 22; k <= 42; k++) { let a = 0; for (let x = 20; x < NA - 20 - k; x++) a += (sm[x] - mean) * (sm[x + k] - mean); a /= v0; if (a > pk) { pk = a; pitch = k; } }
  const srt = Array.from(sm).sort((a, b) => a - b), hi = srt[Math.floor(NA * .85)], cols = [], hw = Math.round(pitch * .42);
  for (let x = 6; x < NA - 6; x++) { let top = true; for (let k = -hw; k <= hw && top; k++) { const xx = x + k; if (xx >= 0 && xx < NA && sm[xx] > sm[x]) top = false; } if (top && sm[x] > .3 * hi) cols.push(x); }
  /* the strip: a stretch with no print, wider than a column, with columns on both sides of it */
  /* the strip: two columns about 2.7 pitches apart (the gap and a pitch), with at most the ruler's own line between
     them, and far less ink between them than a column of print carries */
  let strip = null, stripInk = null; { const want = (spec.gapDeg + pitch0()) / pitch0() * pitch, avg = (x0, x1) => { let a = 0, m = 0; for (let x = Math.max(0, Math.round(x0)); x <= Math.min(NA - 1, Math.round(x1)); x++) { a += prof[x]; m++; } return m ? a / m : 0; };
    let bestS = null; for (let i = 0; i < cols.length; i++) for (let j = i + 1; j <= i + 2 && j < cols.length; j++) { const d = cols[j] - cols[i]; if (Math.abs(d - want) > .22 * want) continue;
      if (j === i + 2 && Math.abs((cols[i + 1] - cols[i]) - d / 2) > .2 * d) continue;
      if (i === 0 && j === cols.length - 1) continue;
      const inside = avg(cols[i] + .6 * pitch, cols[j] - .6 * pitch), print = (avg(cols[i] - .5 * pitch, cols[i] + .5 * pitch) + avg(cols[j] - .5 * pitch, cols[j] + .5 * pitch)) / 2, q = inside / (print || 1);
      if (q < .55 && (!bestS || q < bestS.q)) bestS = { q, i, j }; }
    if (bestS) { strip = (cols[bestS.i] + cols[bestS.j]) / 2; stripInk = bestS.q; if (bestS.j === bestS.i + 2) cols.splice(bestS.i + 1, 1); } }
  /* rows: the slant that makes the row profile sharpest, its period, and which neighbour of the number row is heavier */
  let bestR = null; for (let m = -.12; m <= .1201; m += .02) { const r = new Float32Array(MV), cnt = new Float32Array(MV); for (let x = 30; x < NA - 30; x += 3) { const sh = m * (x - NA / 2); for (let y = 0; y < MV; y++) { const yy = y + sh; if (yy < 0 || yy > MV - 1.001) continue; const yi = yy | 0, f = yy - yi; r[y] += ink[yi * NA + x] * (1 - f) + ink[(yi + 1) * NA + x] * f; cnt[y]++; } }
    let mu = 0, n = 0; for (let y = 16; y < MV - 16; y++) { r[y] /= cnt[y] || 1; mu += r[y]; n++; } mu /= n; let va = 0; for (let y = 16; y < MV - 16; y++) va += (r[y] - mu) * (r[y] - mu); if (!bestR || va > bestR.va) bestR = { va, m, r, mu }; }
  const r = bestR.r; let P = 0, rk = -1; for (let k = 22; k <= 40; k++) { let a = 0; for (let y = 16; y < MV - 16 - k; y++) a += (r[y] - bestR.mu) * (r[y + k] - bestR.mu); a /= bestR.va || 1; if (a > rk) { rk = a; P = k; } }
  const NB = 48, f = new Float32Array(NB), fc = new Float32Array(NB); for (let y = 16; y < MV - 16; y++) { const b = Math.floor((y % P) / P * NB) % NB; f[b] += r[y]; fc[b]++; } for (let b = 0; b < NB; b++) f[b] /= fc[b] || 1;
  const win = (c, w) => { let a = 0; for (let k = -w; k <= w; k++) a += f[((c + k) % NB + NB) % NB]; return a / (2 * w + 1); }; let bn = 0, bv = -1; for (let b = 0; b < NB; b++) { const v = win(b, 6); if (v > bv) { bv = v; bn = b; } }
  const up = win(bn - NB / 3, 5), dn = win(bn + NB / 3, 5), dir = force || (dn >= up ? 1 : -1), dirConf = Math.abs(dn - up) / (dn + up + 1e-6);
  const rel = x => A0 + x * STEP; let out = { score: Math.max(0, pk) * Math.max(0, rk), colScore: pk, rowScore: rk, pitch: pitch * STEP, period: P, slant: bestR.m, amps: cols.map(x => +(sm[x] / hi).toFixed(2)), cols: cols.map(rel), strip: strip === null ? null : rel(strip), stripInk, dir, dirConf };
  if (dir < 0) { out.cols = out.cols.map(a => -a).reverse(); if (out.strip !== null) out.strip = -out.strip; }       // as it would read with the lid at the top
  return out;
}
/* Find the label in an RGBA frame and read which way the cup is turned.
   Returns { ok, c:[x,y] centre of the label on the axis, a:[x,y] unit vector along the axis toward the lid, w half-width
   (the cup's radius in pixels), len label length in pixels along its middle, sag pixels the bands bow by (its sign
   says which end leans toward the camera), face angle of the cup that faces the camera at c, conf 0..1, margin } */
function detect(img, hi) {                                    // hi: the same view at full size, to read the print from
  const W = img.width, H = img.height, d = img.data, n = W * H, gray = new Float32Array(n), br = new Uint8Array(n);
  const hist = new Uint32Array(256); for (let i = 0; i < n; i++) { const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; gray[i] = r * .3 + g * .59 + b * .11; const mx = Math.max(r, g, b); br[i] = mx; hist[mx]++; }
  let acc = 0, p97 = 255; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * .03) { p97 = v; break; } }
  /* The label is found by its print, not its colour (under a warm lamp the paper is not white): dense dark marks on a
     light ground give a high local contrast with a high local ceiling. Thin lines on a mat, a keyboard, cloth and
     skin do not. */
  const ii = new Float64Array((W + 1) * (H + 1)), i2 = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) { let r1 = 0, r2 = 0; for (let x = 0; x < W; x++) { const g = gray[y * W + x]; r1 += g; r2 += g * g; ii[(y + 1) * (W + 1) + x + 1] = ii[y * (W + 1) + x + 1] + r1; i2[(y + 1) * (W + 1) + x + 1] = i2[y * (W + 1) + x + 1] + r2; } }
  /* and the ground under the print is not blue: the cup is, and so is a cutting mat with its white lines */
  const iw = new Float64Array((W + 1) * (H + 1)); for (let y = 0; y < H; y++) { let r1 = 0; for (let x = 0; x < W; x++) { const i = y * W + x; r1 += d[i * 4] > d[i * 4 + 2] - 8 ? 1 : 0; iw[(y + 1) * (W + 1) + x + 1] = iw[y * (W + 1) + x + 1] + r1; } }
  const rt = Math.max(3, Math.round(Math.max(W, H) / 70)), m0 = new Float32Array(n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const x0 = Math.max(0, x - rt), x1 = Math.min(W, x + rt + 1), y0 = Math.max(0, y - rt), y1 = Math.min(H, y + rt + 1), cnt = (x1 - x0) * (y1 - y0), q = (I, a, b2, c, d2) => I[d2 * (W + 1) + c] - I[b2 * (W + 1) + c] - I[d2 * (W + 1) + a] + I[b2 * (W + 1) + a];
    const mean = q(ii, x0, y0, x1, y1) / cnt, sd = Math.sqrt(Math.max(0, q(i2, x0, y0, x1, y1) / cnt - mean * mean)); m0[y * W + x] = (sd > .09 * mean && mean + 1.5 * sd > .45 * p97 && mean > 45 && q(iw, x0, y0, x1, y1) / cnt > .7) ? 1 : 0; }
  const rad = Math.max(2, Math.round(Math.max(W, H) / 110)), blur = (m) => { const hp = highpass(m, W, H, rad), o = new Uint8Array(n); for (let i = 0; i < n; i++) o[i] = (m[i] - hp[i]) > .5 ? 1 : 0; return o; };
  let mask = blur(m0); const lab = new Int32Array(n), stack = new Int32Array(n);
  const flood = (msk, seeds, id, lb) => { let sp = 0, area = 0; const pts = []; for (const s of seeds) if (msk[s] && !lb[s]) { lb[s] = id; stack[sp++] = s; }
    while (sp) { const q = stack[--sp], x = q % W, y = (q / W) | 0; area++; let edge = false; const nb = (k, okk) => { if (!okk) { edge = true; return; } if (msk[k]) { if (!lb[k]) { lb[k] = id; stack[sp++] = k; } } else edge = true; };
      nb(q - 1, x > 0); nb(q + 1, x < W - 1); nb(q - W, y > 0); nb(q + W, y < H - 1); if (edge) pts.push(x, y); } return { area, pts }; };
  /* Keep the broad body of a region and drop what hangs off it (a lit finger edge, bright things behind the cup):
     close small holes, measure every point's distance to the outside, keep the part more than .45 of the largest
     distance deep, and grow that back by the same amount inside the region. */
  const dist = (inside) => { const D = new Float32Array(n), B = 1e6; for (let i = 0; i < n; i++) D[i] = inside[i] ? B : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!D[i]) continue; let v = D[i]; if (x === 0 || y === 0 || x === W - 1) v = 1; else { v = Math.min(v, D[i - 1] + 1, D[i - W] + 1, D[i - W - 1] + 1.41, D[i - W + 1] + 1.41); } D[i] = v; }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!D[i]) continue; let v = D[i]; if (y === H - 1 || x === 0 || x === W - 1) v = Math.min(v, 1); else v = Math.min(v, D[i + 1] + 1, D[i + W] + 1, D[i + W + 1] + 1.41, D[i + W - 1] + 1.41); D[i] = v; } return D; };
  const trim = (lb, area) => { const ins = new Uint8Array(n), out = new Int32Array(n); for (let i = 0; i < n; i++) ins[i] = lb[i] ? 0 : 1;
    const hl = new Int32Array(n); let hid = 0; for (let s = 0; s < n; s++) { if (!ins[s] || hl[s]) continue; hid++; const h = flood(ins, [s], hid, hl); if (h.area < area * .05) { /* a small hole: fill */ for (let k = 0; k < n; k++) if (hl[k] === hid) ins[k] = 2; } }
    const reg = new Uint8Array(n); for (let i = 0; i < n; i++) reg[i] = (lb[i] || ins[i] === 2) ? 1 : 0;
    const D = dist(reg); let dm = 0, at = 0; for (let i = 0; i < n; i++) if (D[i] > dm) { dm = D[i]; at = i; } if (dm < 6) return null; const r = dm * .45;
    const core = new Uint8Array(n); for (let i = 0; i < n; i++) core[i] = D[i] > r ? 1 : 0; const cl = new Int32Array(n); flood(core, [at], 1, cl);
    const inv = new Uint8Array(n); for (let i = 0; i < n; i++) inv[i] = cl[i] ? 0 : 1; const D2 = dist(inv), keep = new Uint8Array(n); for (let i = 0; i < n; i++) keep[i] = reg[i] && D2[i] <= r + 1.5 ? 1 : 0;
    const res = flood(keep, [at], 1, out); res.lab = out; return res; };
  const comps = []; for (let s = 0; s < n; s++) { if (!mask[s] || lab[s]) continue; const id = comps.length + 1, c = flood(mask, [s], id, lab); c.id = id; comps.push(c); }
  window.CUP._dbg = { W, H, mask, p97, cand: null, comps: comps.map(c => c.area).sort((x, y) => y - x).slice(0, 5), log: [] };
  /* For each likely patch of print: learn the colour of its paper, then take in the paper around it that carries no
     print (the ruler strip, the margins), so the whole label is one region. */
  const cand0 = comps.filter(c => c.area > n * .008).sort((a, b) => b.area - a.area).slice(0, 5), cand = []; let best = null;
  for (const c of cand0) { const vals = []; let x0 = W, x1 = 0, y0 = H, y1 = 0; for (let i = 0; i < n; i += 1) if (lab[i] === c.id) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if ((x + y) % 3 === 0) vals.push(gray[i]); }
    vals.sort((a, b) => a - b); const g70 = vals[Math.floor(vals.length * .7)] || 0; let pr = 0, pg = 0, pb = 0, pn = 0; for (let i = 0; i < n; i += 2) if (lab[i] === c.id && gray[i] >= g70) { pr += d[i * 4]; pg += d[i * 4 + 1]; pb += d[i * 4 + 2]; pn++; } if (!pn) continue; pr /= pn; pg /= pn; pb /= pn; const pgy = pr * .3 + pg * .59 + pb * .11;
    const ex = Math.round((x1 - x0) * .3), ey = Math.round((y1 - y0) * .3), X0 = Math.max(0, x0 - ex), X1 = Math.min(W - 1, x1 + ex), Y0 = Math.max(0, y0 - ey), Y1 = Math.min(H - 1, y1 + ey), pm = new Float32Array(n);
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const i = y * W + x, r = d[i * 4], g = d[i * 4 + 1] + 1, b2 = d[i * 4 + 2]; pm[i] = (lab[i] === c.id || (gray[i] > .72 * pgy && Math.abs(r / g - pr / (pg + 1)) < .09 && Math.abs(b2 / g - pb / (pg + 1)) < .09)) ? 1 : 0; }
    const m2 = blur(pm), lb2 = new Int32Array(n), seeds = []; for (let i = 0; i < n; i += 7) if (lab[i] === c.id) seeds.push(i); let reg = flood(m2, seeds, 1, lb2); reg = trim(lb2, reg.area) || reg; reg.id = 1; cand.push(reg); }
  const sampLo = (x, y) => { if (x < 0 || y < 0 || x > W - 1.001 || y > H - 1.001) return -1; const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * W + x0; return gray[i] * (1 - fx) * (1 - fy) + gray[i + 1] * fx * (1 - fy) + gray[i + W] * (1 - fx) * fy + gray[i + W + 1] * fx * fy; };
  /* the label is found in the small picture; the print is read from the large one when there is one */
  let samp = sampLo; if (hi && hi.width > W * 1.3) { const HW = hi.width, HH = hi.height, hd = hi.data, k = HW / W, taps = Math.max(1, Math.round(k / 2.2)), gh = (xi, yi) => { const q = (yi * HW + xi) * 4; return hd[q] * .3 + hd[q + 1] * .59 + hd[q + 2] * .11; };
    samp = (x, y) => { if (x < 0 || y < 0 || x > W - 1.001 || y > H - 1.001) return -1; const X = (x + .5) * k - .5, Y = (y + .5) * k - .5; let a = 0, m = 0; for (let dy = 0; dy < taps; dy++) for (let dx = 0; dx < taps; dx++) { const xx = X + (dx - (taps - 1) / 2) * 1.6, yy = Y + (dy - (taps - 1) / 2) * 1.6; if (xx < 0 || yy < 0 || xx > HW - 1.001 || yy > HH - 1.001) continue; const x0 = xx | 0, y0 = yy | 0, fx = xx - x0, fy = yy - y0; a += gh(x0, y0) * (1 - fx) * (1 - fy) + gh(x0 + 1, y0) * fx * (1 - fy) + gh(x0, y0 + 1) * (1 - fx) * fy + gh(x0 + 1, y0 + 1) * fx * fy; m++; } return m ? a / m : -1; }; }
  window.CUP._dbg.cand = cand.map(c => c.lab);
  let hyp = null;
  for (const c of cand) {
    /* the tightest box round it, at any angle */
    const P = c.pts, step = Math.max(1, Math.floor(P.length / 2 / 500)) * 2; let bb = null;
    for (let ang = 0; ang < 180; ang += 1.5) { const ca = Math.cos(ang * D2R), sa = Math.sin(ang * D2R); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (let k = 0; k < P.length; k += step) { const u = P[k] * ca + P[k + 1] * sa, v = -P[k] * sa + P[k + 1] * ca; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; }
      const ar = (u1 - u0) * (v1 - v0); if (!bb || ar < bb.ar) bb = { ar, ca, sa, cu: (u0 + u1) / 2, cv: (v0 + v1) / 2, eu: (u1 - u0) / 2, ev: (v1 - v0) / 2 }; }
    if (window.CUP.debug) window.CUP._dbg.log.push({ area: c.area, fill: +(c.area / bb.ar).toFixed(2), eu: Math.round(bb.eu), ev: Math.round(bb.ev) });
    if (c.area / bb.ar < .6 || Math.min(bb.eu, bb.ev) < 12) continue;
    const cx = bb.cu * bb.ca - bb.cv * bb.sa, cy = bb.cu * bb.sa + bb.cv * bb.ca;
    for (const ax of [0, 1]) {                                    // either side of the box may be the axis
      const a = ax ? [-bb.sa, bb.ca] : [bb.ca, bb.sa], p = [-a[1], a[0]], l = ax ? bb.ev : bb.eu, w = ax ? bb.eu : bb.ev;
      /* along each line parallel to the axis, where the paper starts and stops; then a fit that knows a band on a
         cylinder seen at a tilt is an arc of an ellipse: t = c0 + c1 s + c2 (1 - sqrt(1 - s^2)) */
      /* seen from above or below, the far end of the label is narrower: measure both sides along the axis and let the
         width and the middle run as straight lines of t */
      let oc = [0, 0], hc = [w, 0]; { const ts = [], lo = [], hi2 = []; for (let t = -.8 * l; t <= .8 * l; t += 3) { let u0 = null, u1 = null; for (let u = -1.5 * w; u <= 1.5 * w; u += 1) { const x = Math.round(cx + a[0] * t + p[0] * u), y = Math.round(cy + a[1] * t + p[1] * u); if (x < 0 || y < 0 || x >= W || y >= H) continue; if (c.lab[y * W + x] === c.id) { if (u0 === null) u0 = u; u1 = u; } } if (u0 !== null && u1 - u0 > w) { ts.push(t); lo.push(u0); hi2.push(u1); } }
        if (ts.length >= 8) { const lin = (ys) => { let sx = 0, sy = 0, sxx = 0, sxy = 0, m = ts.length; for (let k = 0; k < m; k++) { sx += ts[k]; sy += ys[k]; sxx += ts[k] * ts[k]; sxy += ts[k] * ys[k]; } const b = (m * sxy - sx * sy) / (m * sxx - sx * sx || 1); return [(sy - b * sx) / m, b]; }, L = lin(lo), Hh = lin(hi2); oc = [(L[0] + Hh[0]) / 2, (L[1] + Hh[1]) / 2]; hc = [(Hh[0] - L[0]) / 2, (Hh[1] - L[1]) / 2]; } }
      const off = (t, u) => oc[0] + oc[1] * t + u * (hc[0] + hc[1] * t) / w;      // u in pixels at the middle of the label
      const S = [], T0 = [], T1 = []; for (let i = 0; i < NA; i += 6) { const s = Math.sin((A0 + i * STEP) * D2R); if (Math.abs(s) > .9) continue; let t0 = null, t1 = null; for (let t = -1.35 * l; t <= 1.35 * l; t += 1) { const uu = off(t, w * s), x = Math.round(cx + a[0] * t + p[0] * uu), y = Math.round(cy + a[1] * t + p[1] * uu); if (x < 0 || y < 0 || x >= W || y >= H) continue; if (c.lab[y * W + x] === c.id) { if (t0 === null) t0 = t; t1 = t; } } if (t0 !== null && t1 - t0 > l) { S.push(s); T0.push(t0); T1.push(t1); } }
      if (S.length < 12) continue;
      const fit = (ts) => { let keep = ts.map(() => true), co = [0, 0, 0]; for (let it = 0; it < 3; it++) { const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [0, 0, 0]; S.forEach((s, k) => { if (!keep[k]) return; const f = [1, s, 1 - Math.sqrt(1 - s * s)]; for (let i = 0; i < 3; i++) { B[i] += f[i] * ts[k]; for (let j = 0; j < 3; j++) A[i][j] += f[i] * f[j]; } });
          const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]); if (Math.abs(det) < 1e-9) break;
          const sol = i => { const M = A.map(r => r.slice()); for (let k = 0; k < 3; k++) M[k][i] = B[k]; return (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])) / det; }; co = [sol(0), sol(1), sol(2)];
          const res = S.map((s, k) => Math.abs(ts[k] - (co[0] + co[1] * s + co[2] * (1 - Math.sqrt(1 - s * s))))), med = res.slice().sort((x, y) => x - y)[res.length >> 1]; keep = res.map(r => r <= Math.max(2, 3 * med)); } return co; };
      const f0 = fit(T0), f1 = fit(T1), at = (f, s) => f[0] + f[1] * s + f[2] * (1 - Math.sqrt(Math.max(0, 1 - s * s)));
      /* Unwrap with the camera's nearness in it. Seen from a distance d the near side of a cylinder is magnified: a
         point at angle th lands at K sin th / (1 - rho cos th) from the axis, rho = R / d. rho is not known, so a few
         are tried and the print itself says which is right. */
      for (const rho of RHOS) { const K = w * Math.sqrt(1 - rho * rho), U = new Float32Array(NA * MV); let bad = 0;
        for (let i = 0; i < NA; i++) { const th = (A0 + i * STEP) * D2R, xo = K * Math.sin(th) / (1 - rho * Math.cos(th)), sN = Math.max(-1, Math.min(1, xo / w)), tb = at(f0, sN), tt = at(f1, sN);
          for (let j = 0; j < MV; j++) { const t = tt - (tt - tb) * (j + .5) / MV, uu = off(t, xo), v = samp(cx + a[0] * t + p[0] * uu, cy + a[1] * t + p[1] * uu); if (v < 0) { bad++; U[j * NA + i] = 128; } else U[j * NA + i] = v; } }
        if (bad > NA * MV * .25) continue;
        const want = ((a[1] < -.15 || (Math.abs(a[1]) <= .15 && a[0] > 0)) ? 1 : -1) * (spec.lidDown ? -1 : 1), r = decode(U, want); if (window.CUP.debug) window.CUP._dbg.log.push({ ax, rho, w: Math.round(w), score: r && +r.score.toFixed(3), col: r && +r.colScore.toFixed(2), row: r && +r.rowScore.toFixed(2), pitch: r && r.pitch, strip: r && r.strip, dir: r && r.dir, dc: r && +r.dirConf.toFixed(2), U });
        if (r && r.pitch > 11.5 && r.pitch < 19 && (!hyp || r.score > hyp.score)) hyp = Object.assign(r, { rho, a, w, f0, f1, cx, cy, taper: hc[1] * l / (hc[0] || 1), oc, area: c.area / n, U }); } } }
  if (hyp) { const kk = pitch0() / hyp.pitch; hyp.cols = hyp.cols.map(v => v * kk); if (hyp.strip !== null) hyp.strip *= kk;   // the columns are 14 degrees apart whatever the unwrap made of them
    const dir = hyp.dir, grid = spec.gapDeg / 2 + pitch() / 2;       // column centres sit at -(grid + k pitch)
    /* the turn: outright if the strip is seen; otherwise only its remainder within one column (phase) */
    let near = null; hyp.cols.forEach(a => { if (near === null || Math.abs(a) < Math.abs(near)) near = a; });
    best = { ok: true, c: [hyp.cx + hyp.a[0] * (hyp.f0[0] + hyp.f1[0]) / 2, hyp.cy + hyp.a[1] * (hyp.f0[0] + hyp.f1[0]) / 2], a: [hyp.a[0] * dir, hyp.a[1] * dir], w: hyp.w, len: hyp.f1[0] - hyp.f0[0], sag: dir * (hyp.f0[2] + hyp.f1[2]) / 2,
      taper: dir * hyp.taper, strip: hyp.strip, face: hyp.strip === null ? null : norm(-hyp.strip), phase: near === null ? null : near, cols: hyp.cols, pitchSeen: hyp.pitch, conf: hyp.score, dirConf: hyp.dirConf, rho: hyp.rho, area: hyp.area, unwrap: hyp.U, read: null, lid: 'assumed' };
    /* the trained reader, when it is loaded: which end is the lid, and the turn read from the print itself */
    const N = window.CUPNET; if (N && N.ready && !spec.noNet) { const r = N.read(hyp.U); best.net = r;
      if (Math.abs(r.pLid - .5) > .3) { best.lid = 'read'; if ((r.lidAtTop ? 1 : -1) !== dir) { best.a = [-best.a[0], -best.a[1]]; best.sag = -best.sag; best.taper = -best.taper; best.cols = best.cols.map(v => -v).reverse(); if (best.strip !== null) { best.strip = -best.strip; best.face = norm(-best.strip); } if (best.phase !== null) best.phase = -best.phase; } }
      if (r.conf > .5) best.read = r.face; } }
  if (!best) return { ok: false, why: 'no label found' }; return best;
}

/* Carry the turn from frame to frame. state = { face, known } (start with {}). When the strip is seen the turn is set
   outright. Otherwise, if it was known, it moves to the reading nearest the last one that puts the column centres
   where they were seen (the columns are 14 degrees apart, so this holds while the cup turns less than 7 degrees
   between frames). If a reading says the strip should be in view and it is not, the turn is marked unknown again. */
function track(det, state) {
  if (!det || !det.ok) return state; const p = pitch(), grid = spec.gapDeg / 2 + p / 2;
  if (det.face !== null) { state.face = det.face; state.known = true; state.how = 'strip'; state.pend = null; return state; }
  if (det.read != null) {                                    // read from the print; made exact by the column ticks when they agree
    let f = det.read; if (det.phase !== null) { let b = null; for (let k = 0; k < spec.cols; k++) { const c = norm(-(grid + k * p) - det.phase), d = Math.abs(norm(c - det.read)); if (b === null || d < b.d) b = { c, d }; } if (b.d < p * .5) f = b.c; }
    /* a reading far from where the cup was is believed only when the next one says the same */
    if (!state.known || Math.abs(norm(f - state.face)) < 25 || (state.pend != null && Math.abs(norm(f - state.pend)) < 12)) { state.face = f; state.known = true; state.how = 'read'; state.pend = null; return state; }
    state.pend = f; }
  if (!state.known || det.phase === null) { state.how = state.known ? 'held' : 'unknown'; return state; }
  /* a column centre seen at relative angle ph is some column c: face + ph = -(grid + k p)  ->  face = -(grid + k p) - ph */
  let bestF = null; for (let k = 0; k < spec.cols; k++) { const f = norm(-(grid + k * p) - det.phase), d = Math.abs(norm(f - state.face)); if (bestF === null || d < bestF.d) bestF = { f, d }; }
  if (bestF.d > p * .5) { state.how = 'held'; return state; }
  if (Math.abs(bestF.f) < 50 && det.cols.length >= 4) { state.known = false; state.how = 'unknown'; return state; }   // the strip would be in plain view, and is not
  state.face = bestF.f; state.how = 'counted'; return state;
}
/* From what detect() found to where the cup is. Camera frame as three.js has it: x right, y up, z toward the viewer,
   the camera at the origin. f is the focal length in pixels of the frame detect() saw. Returns the matrix (column
   major, millimetres) that carries cup coordinates into the camera frame, with distance and tilt. */
function poseFrom(det, W, H, f) {
  const r = R(), z = r * Math.sqrt(1 + (f / det.w) * (f / det.w));                // the outline of a cylinder of radius r is w wide at this distance
  const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sgn = Math.abs(det.taper || 0) > .03 ? Math.sign(det.taper) : Math.sign(det.sag) || 1, ym = spec.labelY0 + spec.labelH / 2, px = v => [W / 2 + f * v[0] / -v[2], H / 2 - f * v[1] / -v[2]];
  /* the lean (+ : lid toward the camera): which end looks wider says which way; how much is the lean at which the
     label, put where it was seen, comes out as long in the picture as it was measured */
  const place = (tilt) => { const A = nrm([Math.cos(tilt) * det.a[0], -Math.cos(tilt) * det.a[1], Math.sin(tilt)]); let P = [(det.c[0] - W / 2) / f * z, -(det.c[1] - H / 2) / f * z, -z], F;
    for (let it = 0; it < 4; it++) { const toCam = nrm([-P[0], -P[1], -P[2]]); F = nrm(toCam.map((v, i) => v - dot(toCam, A) * A[i])); const zs = -(P[2] + r * F[2]), Ps = [(det.c[0] - W / 2) / f * zs, -(det.c[1] - H / 2) / f * zs, -zs]; P = Ps.map((v, i) => v - r * F[i]); P = P.map(v => v * z / Math.hypot(P[0], P[1], P[2])); }
    const top = px(P.map((v, i) => v + r * F[i] + A[i] * spec.labelH / 2)), bot = px(P.map((v, i) => v + r * F[i] - A[i] * spec.labelH / 2)); return { A, P, F, len: Math.hypot(top[0] - bot[0], top[1] - bot[1]) }; };
  let bestT = null; for (let d = 0; d <= 65; d += 1) { const q = place(sgn * d * D2R), e = Math.abs(q.len - det.len); if (!bestT || e < bestT.e) bestT = { e, d, q }; }
  const tilt = sgn * bestT.d * D2R, A = bestT.q.A, P = bestT.q.P, F = bestT.q.F, faceDeg = det.face == null ? 0 : det.face, Sd = cross(A, F), a = faceDeg * D2R;
  const ex = F.map((v, i) => v * Math.sin(a) + Sd[i] * Math.cos(a)), ez = F.map((v, i) => v * Math.cos(a) - Sd[i] * Math.sin(a)), O = P.map((v, i) => v - A[i] * ym);
  return { m: [ex[0], ex[1], ex[2], 0, A[0], A[1], A[2], 0, ez[0], ez[1], ez[2], 0, O[0], O[1], O[2], 1], dist: z, tilt: tilt / D2R, axis: A, origin: O };
}
/* Where a pixel's ray meets the cup: { region, col, band, letter, id, a, y } or { region:'off' }. pad (mm) widens the
   cylinder for the thickness of a fingertip. */
function rayToCup(px, py, W, H, f, pose, pad) {
  const m = pose.m, dC = [(px - W / 2) / f, -(py - H / 2) / f, -1], tr = v => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[4] * v[0] + m[5] * v[1] + m[6] * v[2], m[8] * v[0] + m[9] * v[1] + m[10] * v[2]];
  const o = tr([-m[12], -m[13], -m[14]]), dd = tr(dC), r = R() + (pad || 0), A = dd[0] * dd[0] + dd[2] * dd[2], B = 2 * (o[0] * dd[0] + o[2] * dd[2]), C = o[0] * o[0] + o[2] * o[2] - r * r, disc = B * B - 4 * A * C;
  if (disc < 0 || A < 1e-12) return { region: 'off' }; const t = (-B - Math.sqrt(disc)) / (2 * A); if (t <= 0) return { region: 'off' };
  const hx = o[0] + dd[0] * t, hy = o[1] + dd[1] * t, hz = o[2] + dd[2] * t, a = Math.atan2(hx, hz) / D2R; return Object.assign({ a, y: hy }, cellAt(a, hy));
}
window.CUP = { spec, colAngle, cellAt, regionAt, cellCenter, cellPatch, paintLabel, buildModel, reference, detect, decode, track, poseFrom, rayToCup, NA, MV, STEP };
})();
