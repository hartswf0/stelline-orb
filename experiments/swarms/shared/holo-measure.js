#!/usr/bin/env node
/* holo-measure.js — measures the film's hologram UI and the device's sound, renders HOLO at the film crops' framing,
   compares with the same extractor, and runs a seeded elitist evolution over the UI genome and the controller's feel.
   node holo-measure.js [--gens 40] [--seed 7] [--no-evolve]
   Reads: /home/claude/stelline-work/film/memory.mp4 (frames extracted to the scratch dir), forensic/arc-series.json, readout-series.json, events.json, pre.wav, ana/device-sounds.wav
   Writes: holo-genome.json, holo-trace.json (numbers only), injects the genome into holo.js; strips with film pixels only to /home/claude/stelline-work/holo/ */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const HERE = __dirname, WORK = '/home/claude/stelline-work', FOR = WORK + '/forensic', FILM = WORK + '/film/memory.mp4', OUT = WORK + '/holo';
const SCR = process.env.HOLO_SCRATCH || '/tmp/claude-0/-home-claude/5dcbf124-08aa-5357-a87a-ec1f490e8f81/scratchpad/holo';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const GENS = +arg('gens', 40), SEED = +arg('seed', 7), EVOLVE = !arg('no-evolve', false);
const HOLO = require('./holo.js');
fs.mkdirSync(SCR + '/f', { recursive: true }); fs.mkdirSync(OUT, { recursive: true });

/* ---------------------------------------------------------------- film frames: the medium cake shot, every frame 144.70-148.5, and the children at 152.4+ */
const T0 = 144.70, NF = 91;
if (!fs.existsSync(SCR + '/f/a090.png')) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(T0), '-i', FILM, '-t', '3.8', '-vf', 'fps=24', '-start_number', '0', SCR + '/f/a%03d.png']);
if (!fs.existsSync(SCR + '/f/k04.png')) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '152.4', '-i', FILM, '-t', '3.6', '-vf', 'fps=6', SCR + '/f/k%02d.png']);
const frames = []; for (let i = 0; i < NF; i++) { const p = `${SCR}/f/a${String(i).padStart(3, '0')}.png`; if (fs.existsSync(p)) frames.push('data:image/png;base64,' + fs.readFileSync(p).toString('base64')); }
const kidFrame = 'data:image/png;base64,' + fs.readFileSync(SCR + '/f/k04.png').toString('base64');
const ARCS = JSON.parse(fs.readFileSync(FOR + '/arc-series.json')), READS = JSON.parse(fs.readFileSync(FOR + '/readout-series.json')), EVENTS = JSON.parse(fs.readFileSync(FOR + '/events.json'));

/* ---------------------------------------------------------------- sound: clicks in the forest close-up (pre.wav 28.8-31.0) and the device's grains */
function wav(p) { const b = fs.readFileSync(p); let o = 12, sr = 48000, ch = 1, bits = 16, data = null; while (o < b.length) { const id = b.toString('ascii', o, o + 4), n = b.readUInt32LE(o + 4); if (id === 'fmt ') { ch = b.readUInt16LE(o + 10); sr = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); } if (id === 'data') { data = b.subarray(o + 8, o + 8 + n); break; } o += 8 + n + (n & 1); }
  const N = data.length / (bits / 8) / ch, x = new Float32Array(N); for (let i = 0; i < N; i++) x[i] = data.readInt16LE(i * ch * 2) / 32768; return { sr, x }; }
function clicks(w, t0, t1) { const { sr, x } = w, a = Math.floor(t0 * sr), b = Math.floor(t1 * sr), n = b - a, d = new Float32Array(n);
  for (let i = 1; i < n; i++) d[i] = Math.abs(x[a + i] - x[a + i - 1]); const env = new Float32Array(n); let acc = 0; for (let i = 0; i < n; i++) { acc += d[i] - (i >= 48 ? d[i - 48] : 0); env[i] = acc / 48; }
  const srt = Float32Array.from(env).sort(), med = srt[n >> 1], thr = med * 4, pk = [];
  for (let i = 0; i < n;) { if (env[i] > thr) { let m = i; for (let j = Math.max(0, i - 480); j < Math.min(n, i + 480); j++) if (env[j] > env[m]) m = j; if (m === i) { pk.push({ t: t0 + i / sr, lv: env[i] / med }); i += 480; continue; } } i++; } return pk; }
function centroid(x, sr, a, len) { const N = 1024, re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; i++) { const v = i < len ? x[a + i] || 0 : 0; re[i] = v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1))); }
  // plain DFT on 1024 points is fine at this scale
  let num = 0, den = 0; for (let k = 1; k < N / 2; k++) { let r = 0, j = 0; for (let i = 0; i < N; i++) { const ph = -2 * Math.PI * k * i / N; r += re[i] * Math.cos(ph); j += re[i] * Math.sin(ph); } const m = Math.hypot(r, j), f = k * sr / N; if (f < 1500) continue; num += m * f; den += m; } return num / den; }
function soundTargets() {
  const pre = wav(FOR + '/pre.wav'), pk = clicks(pre, 28.8, 31.0);
  const hand = pk.filter(p => p.t > 28.88 && p.t < 29.4 && p.lv > 10), slow = pk.filter(p => p.t > 29.7 && p.t < 30.4 && p.lv > 30), fast = pk.filter(p => p.t > 30.48 && p.t < 30.95 && p.lv > 10);
  const iv = a => { const d = []; for (let i = 1; i < a.length; i++) d.push(a[i].t - a[i - 1].t); d.sort((p, q) => p - q); return d[d.length >> 1]; };
  const lv = a => { const v = a.map(p => p.lv).sort((p, q) => p - q); return v[v.length >> 1]; };
  const cen = a => { const v = a.map(p => centroid(pre.x, pre.sr, Math.floor((p.t - 0.004) * pre.sr), 1024)).sort((p, q) => p - q); return v[v.length >> 1]; };
  const tr = EVENTS.filter(e => e.kind === 'click train'), inBand = tr.filter(e => e.rate >= 10 && e.rate <= 12.5).length;
  const film = { handClicks: hand.length, handTimes: hand.map(p => +p.t.toFixed(3)), lastHand: hand.length ? hand[hand.length - 1].t : 29.32, slowStart: slow.length ? slow[0].t : 29.75, slowCount: slow.length, slowInterval: iv(slow), fastInterval: iv(fast), fastCount: fast.length,
    handToStep: lv(hand) / lv(slow), fastToStep: lv(fast) / lv(slow), centroidStep: cen(slow), centroidHand: cen(hand), trains: tr.length, trainsAt10to12_5: inBand, trainRateMedian: tr.map(e => e.rate).sort((a, b) => a - b)[tr.length >> 1] };
  film.latency = film.slowStart - film.lastHand;
  let grains = null; const dsp = path.join(HERE, '../../../ana/device-sounds.wav');
  if (fs.existsSync(dsp)) { const g = wav(dsp); const offs = [0, .115, .23, .345, .46]; grains = { src: 'ana/device-sounds.wav', centroidClick: offs.map(o => centroid(g.x, g.sr, Math.floor(o * g.sr), 1024)).sort((a, b) => a - b)[2] }; }
  return { film, grains };
}
/* the controller's feel: a seeded elitist search over the Machine's genome so that a hand turn at the film's hand-click times gives the film's train */
function feelScore(gd, F) { const M = new HOLO.Machine(gd); const ev = []; M.on('step', (r, f) => ev.push({ t: M.t, f })); let hi = 0; const dt = 1 / 240;
  const times = F.handTimes.map(t => t - F.handTimes[0]); const end = times[times.length - 1] + 2.5;
  for (let t = 0; t < end; t += dt) { while (hi < times.length && times[hi] <= t) { M.turn(1, M.ring(1).deg); hi++; } M.update(dt); }
  const slow = ev.filter(e => !e.f), fast = ev.filter(e => e.f), iv = a => a.length > 1 ? (a[a.length - 1].t - a[0].t) / (a.length - 1) : 0;
  const lastHand = times[times.length - 1], m = { latency: slow.length ? slow[0].t - lastHand : 9, slowInterval: iv(slow), slowCount: slow.length, fastInterval: iv(fast), total: ev.length, handToStep: gd.handGain / gd.stepGain, fastToStep: gd.fastGain / gd.stepGain };
  const tol = { latency: 0.04, slowInterval: 0.004, slowCount: 1, fastInterval: 0.006, handToStep: 0.08, fastToStep: 0.08 };
  const want = { latency: F.latency, slowInterval: F.slowInterval, slowCount: F.slowCount, fastInterval: F.fastInterval, handToStep: F.handToStep, fastToStep: F.fastToStep };
  let s = 0; const err = {}; for (const k in tol) { err[k] = (m[k] - want[k]) / tol[k]; s += err[k] * err[k]; } return { s, m, err, want, tol };
}
function evolveFeel(F, seed, log) { const rnd = HOLO.prng(seed); const keys = [['rate', 8, 16], ['fastRate', 16, 32], ['fastAfter', 4, 16, 1], ['latency', 0, 0.8], ['handGain', 0.05, 0.6], ['stepGain', 0.4, 1], ['fastGain', 0.05, 0.8]];
  const base = Object.assign({}, HOLO.genome.device); let pop = [{ g: base, r: feelScore(base, F) }];
  for (let gen = 0; gen < 60; gen++) { const kids = []; for (let i = 0; i < 24; i++) { const p = pop[Math.floor(rnd() * pop.length)].g, c = Object.assign({}, p); keys.forEach(([k, lo, hi, int]) => { if (rnd() < 0.5) { let v = c[k] + (rnd() + rnd() + rnd() - 1.5) * (hi - lo) * 0.08; v = Math.max(lo, Math.min(hi, v)); c[k] = int ? Math.round(v) : +v.toFixed(4); } }); kids.push({ g: c, r: feelScore(c, F) }); }
    pop = pop.concat(kids).sort((a, b) => a.r.s - b.r.s).slice(0, 6); log.push({ gen, best: +pop[0].r.s.toFixed(4), m: pop[0].r.m }); if (pop[0].r.s < 1) break; }
  return pop[0]; }

/* ---------------------------------------------------------------- the in-page extractor (runs identically on film frames and on HOLO renders) */
const PAGE_LIB = String.raw`
const ROI = { x: 540, y: 270, w: 260, h: 220, wallY: 20 };
function loadImg(u) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; }); }
function roiData(img) { const c = new OffscreenCanvas(ROI.w, ROI.h), x = c.getContext('2d'); x.drawImage(img, -ROI.x, -ROI.y); return x.getImageData(0, 0, ROI.w, ROI.h).data; }
function lum(d) { const n = d.length / 4, L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]; return L; }
function pct(stack, q) { const n = stack[0].length, out = new Float32Array(n), v = new Float32Array(stack.length); for (let i = 0; i < n; i++) { for (let k = 0; k < stack.length; k++) v[k] = stack[k][i]; v.sort(); out[i] = v[Math.floor(q * (v.length - 1))]; } return out; }
function samp(L, x, y) { const W = ROI.w, H = ROI.h; if (x < 0 || y < 0 || x >= W - 1 || y >= H - 1) return 0; const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = y0 * W + x0; return L[i] * (1 - fx) * (1 - fy) + L[i + 1] * fx * (1 - fy) + L[i + W] * (1 - fx) * fy + L[i + W + 1] * fx * fy; }
function fitEllipse(L) { const W = ROI.w, pts = []; let bg = 1e9, mx = 0; const G0 = { cx: 112, cy: 110, R: 80 };
  const ok = (x, y) => { const r = Math.hypot(x - G0.cx, y - G0.cy) / G0.R; return y >= ROI.wallY && x >= 88 && r > 0.72 && r < 1.3; };
  for (let y = 0; y < ROI.h; y++) for (let x = 0; x < W; x++) if (ok(x, y)) { const v = L[y * W + x]; if (v < bg) bg = v; if (v > mx) mx = v; }
  const th = bg + 0.25 * (mx - bg); for (let y = 0; y < ROI.h; y++) for (let x = 0; x < W; x++) if (ok(x, y)) { const v = L[y * W + x]; if (v > th) pts.push([x, y, v - th]); }
  let best = null; for (let asp = 0.72; asp <= 1.1; asp += 0.02) for (let cx = 90; cx <= 135; cx += 1) for (let cy = 95; cy <= 125; cy += 1) { let sw = 0, sr = 0, sr2 = 0; for (const [x, y, w] of pts) { const r = Math.hypot((x - cx) / asp, y - cy); sw += w; sr += w * r; sr2 += w * r * r; } const mu = sr / sw, sd = Math.sqrt(Math.max(0, sr2 / sw - mu * mu)); if (!best || sd < best.sd) best = { sd, asp, cx, cy, R: mu }; }
  return best; }
// polar unwrap in the frame of an ellipse fit: rho in units of R, theta in degrees (canvas convention, negative = above)
const TH0 = -135, TH1 = 85, RH0 = 0.55, RH1 = 1.3;
function polar(L, F) { const nT = TH1 - TH0 + 1, nR = Math.round((RH1 - RH0) * F.R), P = new Float32Array(nT * nR); for (let t = 0; t < nT; t++) { const a = (TH0 + t) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); for (let k = 0; k < nR; k++) { const r = (RH0 + k / F.R) * F.R; const x = F.cx + c * r * F.asp, y = F.cy + s * r; P[t * nR + k] = y < ROI.wallY ? 0 : samp(L, x, y); } } return { P, nT, nR }; }
function features(L, F, rgb) { const { P, nT, nR } = polar(L, F); const bg = 8;
  // radial profile over the band body (-60..30 deg)
  const rad = new Float32Array(nR); let cnt = 0; for (let t = -60 - TH0; t <= 30 - TH0; t++) { for (let k = 0; k < nR; k++) rad[k] += P[t * nR + k]; cnt++; } for (let k = 0; k < nR; k++) rad[k] = rad[k] / cnt - bg;
  let pk = 0; for (let k = 0; k < nR; k++) if (rad[k] > rad[pk]) pk = k; let a = pk, b = pk; while (a > 0 && rad[a] > rad[pk] / 2) a--; while (b < nR - 1 && rad[b] > rad[pk] / 2) b++;
  let cs = 0, cw = 0; for (let k = a; k <= b; k++) { cs += k * rad[k]; cw += rad[k]; }
  // inner hairline: the strongest local peak inside the band
  let hk = -1; for (let k = 2; k < a - 1; k++) if (rad[k] > rad[k - 1] && rad[k] >= rad[k + 1] && (hk < 0 || rad[k] > rad[hk])) hk = k;
  // angular profile: brightness through the band
  const ang = new Float32Array(nT); for (let t = 0; t < nT; t++) { let s = 0; for (let k = a; k <= b; k++) s += P[t * nR + k]; ang[t] = s / (b - a + 1) - bg; }
  const body = Array.from(ang.slice(-60 - TH0, 30 - TH0 + 1)).sort((p, q) => p - q), med = body[body.length >> 1];
  let e0 = -1, e1 = -1; for (let t = 0; t < nT; t++) if (ang[t] > 0.3 * med) { if (e0 < 0) e0 = t; e1 = t; }
  const gaps = []; for (let t = Math.max(3, e0 + 6); t < e1 - 6; t++) { let lo = 1e9, hiS = []; for (let d = -7; d <= 7; d++) hiS.push(ang[t + d]); hiS.sort((p, q) => p - q); const loc = hiS[Math.floor(hiS.length * 0.7)]; if (ang[t] < 0.78 * loc && ang[t] <= ang[t - 1] && ang[t] <= ang[t + 1] && ang[t] < ang[t - 2] && ang[t] < ang[t + 2]) { if (!gaps.length || TH0 + t - gaps[gaps.length - 1] > 4) gaps.push(TH0 + t); } }
  let cap = 0, cn = 0; for (let t = e0; t < Math.min(nT, e0 + 22); t++) { cap += ang[t]; cn++; }
  // colour of the band (mean RGB of its brighter half, CIE Lab)
  let lab = null; if (rgb) { let R = 0, G = 0, B = 0, n = 0; const W = ROI.w; for (let t = -60 - TH0; t <= 30 - TH0; t += 2) for (let k = a; k <= b; k++) { const aa = (TH0 + t) * Math.PI / 180, r = (RH0 + k / F.R) * F.R, x = Math.round(F.cx + Math.cos(aa) * r * F.asp), y = Math.round(F.cy + Math.sin(aa) * r); const i = y * W + x; if (P[t * nR + k] - bg > rad[pk] * 0.5) { R += rgb[i * 4]; G += rgb[i * 4 + 1]; B += rgb[i * 4 + 2]; n++; } } lab = toLab(R / n, G / n, B / n); }
  return { rad: Array.from(rad), ang: Array.from(ang), fwhm: (b - a), peakRho: RH0 + pk / F.R, centroidRho: RH0 + cs / cw / F.R, hairRho: hk >= 0 ? RH0 + hk / F.R : null, hairRatio: hk >= 0 ? rad[hk] / rad[pk] : 0,
    a0: TH0 + e0, a1: TH0 + e1, gaps, segs: gaps.length + 1, capRatio: cap / cn / med, med, lab, peak: rad[pk] }; }
function toLab(r, g, b) { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; const R = f(r), G = f(g), B = f(b); let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883; const h = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; X = h(X); Y = h(Y); Z = h(Z); return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]; }
function edges(L, F) { const W = ROI.w, H = ROI.h, E = []; let mx = 0; const m = new Float32Array(W * H); for (let y = Math.max(1, ROI.wallY + 2); y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; const gx = L[i + 1 - W] + 2 * L[i + 1] + L[i + 1 + W] - L[i - 1 - W] - 2 * L[i - 1] - L[i - 1 + W], gy = L[i + W - 1] + 2 * L[i + W] + L[i + W + 1] - L[i - W - 1] - 2 * L[i - W] - L[i - W + 1]; const r = Math.hypot((x - F.cx) / F.asp, y - F.cy) / F.R; if (r < 0.55 || r > 1.3 || x < 60) continue; m[i] = Math.hypot(gx, gy); if (m[i] > mx) mx = m[i]; }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (m[i] > 0.28 * mx) E.push([x, y]); } return E; }
function chamfer(A, B) { const d = (P, Q) => { let s = 0; for (const p of P) { let b = 1e9; for (const q of Q) { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (dd < b) b = dd; } s += Math.min(Math.sqrt(b), 12); } return s / Math.max(1, P.length); }; return (d(A, B) + d(B, A)) / 2; }
// the index mark: brightest residual above the plate along the band's outer edge
function markAngle(L, plate, F, thr) { let best = 0, ba = null; for (let t = -60; t <= 40; t += 0.5) { const a = t * Math.PI / 180; for (let rr = 0.9; rr <= 1.16; rr += 0.02) { const r = rr * F.R, v = samp(L, F.cx + Math.cos(a) * r * F.asp, F.cy + Math.sin(a) * r) - samp(plate, F.cx + Math.cos(a) * r * F.asp, F.cy + Math.sin(a) * r); if (v > best) { best = v; ba = t; } } } return best > thr ? { a: ba, v: best } : null; }
function markBlob(L, plate, F, m) { const W = ROI.w, a = m.a * Math.PI / 180, x0 = F.cx + Math.cos(a) * F.R * F.asp, y0 = F.cy + Math.sin(a) * F.R; let x1 = 1e9, x2 = -1, y1 = 1e9, y2 = -1, n = 0; for (let y = Math.round(y0 - 10); y <= y0 + 10; y++) for (let x = Math.round(x0 - 12); x <= x0 + 12; x++) { const i = y * W + x; if (L[i] - plate[i] > m.v * 0.5) { n++; x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); } } return { w: x2 - x1 + 1, h: y2 - y1 + 1, n }; }
// the readout: rows of tiny type left of the arc
const RD = { x: 14, y: 138, w: 112, h: 50, k: 0.18 };   // rows are deskewed: the readout rises to the right (k = measured slope)
function readFeat(L, bgL) { const W = ROI.w, H2 = RD.h + 26, rows = new Float32Array(H2); const lit = []; for (let y = 0; y < RD.h; y++) for (let x = 0; x < RD.w; x++) { const i = (RD.y + y) * W + RD.x + x, v = L[i] - bgL[i]; if (v > 7) { const yy = Math.round(y + x * RD.k); rows[yy] += v; lit.push([x, yy]); } }
  const pk = []; for (let y = 1; y < H2 - 1; y++) if (rows[y] > 60 && rows[y] >= rows[y - 1] && rows[y] > rows[y + 1] && (!pk.length || y - pk[pk.length - 1] > 2)) pk.push(y);
  const lines = []; pk.forEach(y => { let a = y, b = y; while (a > 0 && rows[a - 1] > rows[y] / 2) a--; while (b < H2 - 1 && rows[b + 1] > rows[y] / 2) b++; let x1 = 1e9, x2 = -1, n = 0; lit.forEach(([x, yy]) => { if (yy >= a && yy <= b) { n++; x1 = Math.min(x1, x); x2 = Math.max(x2, x); } }); lines.push({ y, h: b - a + 1, x1, x2, len: x2 - x1 + 1, n }); });
  return lines.filter(l => l.len > 6 && l.n > 6); }
`;

/* ---------------------------------------------------------------- the in-page evolution */
const PAGE_EVO = String.raw`
async function filmMeasure(frames, arcSeries, readSeries, kidUrl) {
  const imgs = []; for (const u of frames) imgs.push(await loadImg(u)); const D = imgs.map(roiData), Ls = D.map(lum);
  const plate = pct(Ls, 0.2), F = fitEllipse(plate); const rgbStack = [0, 1, 2].map(c => D.map(d => { const o = new Float32Array(d.length / 4); for (let i = 0; i < o.length; i++) o[i] = d[i * 4 + c]; return o; }));
  const pr = [0, 1, 2].map(c => pct(rgbStack[c], 0.2)), rgb = new Uint8ClampedArray(ROI.w * ROI.h * 4); for (let i = 0; i < ROI.w * ROI.h; i++) { rgb[i * 4] = pr[0][i]; rgb[i * 4 + 1] = pr[1][i]; rgb[i * 4 + 2] = pr[2][i]; rgb[i * 4 + 3] = 255; }
  const feat = features(plate, F, rgb), E = edges(plate, F);
  const marks = Ls.map(L => markAngle(L, plate, F, 22)); let best = null; // align the extracted frames with arc-series.json (null pattern)
  for (let off = -3; off <= 4; off++) { let agree = 0, n = 0; arcSeries.angle.forEach((a, i) => { const m = marks[i + off]; if (m === undefined) return; n++; if ((a === null) === (m === null)) agree++; }); if (!best || agree / n > best.r) best = { off, r: agree / n }; }
  const series = arcSeries.angle.map((a, i) => marks[i + best.off] ? marks[i + best.off].a : null);
  let bias = 0, bn = 0; series.forEach((a, i) => { if (a !== null && arcSeries.angle[i] !== null) { bias += a - arcSeries.angle[i]; bn++; } }); bias /= bn;
  let rm = 0; series.forEach((a, i) => { if (a !== null && arcSeries.angle[i] !== null) rm += (a - bias - arcSeries.angle[i]) ** 2; }); rm = Math.sqrt(rm / bn);
  const mi = series.findIndex((a, i) => a !== null && i > 50), blob = markBlob(Ls[mi + best.off], plate, F, marks[mi + best.off]);
  // readout: background from the frames where it is empty (146.71-146.96)
  const emp = []; readSeries.forEach(r => { if (r[1] === 0) { const i = Math.round((r[0] - ${T0}) * 24); if (Ls[i]) emp.push(Ls[i]); } }); const bgL = pct(emp, 0.5);
  const rf = Ls.map(L => readFeat(L, bgL)); const glyph = [], gapsY = [], lens = []; rf.forEach((ls, i) => { ls.forEach(l => glyph.push(l.h)); for (let k = 1; k < ls.length; k++) gapsY.push(ls[k].y - ls[k - 1].y); lens.push(ls.length ? ls[ls.length - 1].len : 0); });
  const med = a => { const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };
  const rate = typeRate(rf.map(ls => ls.length ? ls[ls.length - 1].x2 : null), 24);
  const readStart = med(rf.filter(ls => ls.length).map(ls => ls[0].x1)), readY = med(rf.filter(ls => ls.length).map(ls => ls[0].y - Math.round(ls[0].x1 * RD.k)));
  // the child's mark at 153.07 (k04): its extent
  const ki = await loadImg(kidUrl); const kc = new OffscreenCanvas(80, 70), kx = kc.getContext('2d'); kx.drawImage(ki, -810, -125); const kd = lum(kx.getImageData(0, 0, 80, 70).data); let x1 = 99, x2 = -1, y1 = 99, y2 = -1, kmx = 0; kd.forEach(v => kmx = Math.max(kmx, v)); kd.forEach((v, i) => { if (v > kmx * 0.45) { const x = i % 80, y = (i / 80) | 0; x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); } });
  return { F, feat, E, plate, marks: series, markOffset: best.off, markAgree: best.r, markBias: bias, markRmsVsSeries: rm, blob, read: { glyphH: med(glyph), lineGap: med(gapsY), maxLines: Math.max(...rf.map(l => l.length)), maxLen: Math.max(...lens), rate, x0: readStart, y0: readY, series: rf.map(l => l.length) }, kid: { w: x2 - x1 + 1, h: y2 - y1 + 1 } };
}
function typeRate(xs, fps) { // px per second while a line is growing: median of the rate over growing runs (ignoring line changes)
  const r = []; for (let i = 0; i + 6 < xs.length; i += 3) { const a = xs[i], b = xs[i + 6]; if (a !== null && b !== null && b > a + 1 && b - a < 60) r.push((b - a) / (6 / fps)); } r.sort((p, q) => p - q); return r.length ? r[r.length >> 1] : 0; }
// render HOLO's arc into the ROI at the film's framing
function renderArc(g, F, markDeg, dx, dy) { const c = new OffscreenCanvas(ROI.w, ROI.h), x = c.getContext('2d'); x.fillStyle = 'rgb(7,7,7)'; x.fillRect(0, 0, ROI.w, ROI.h); x.globalCompositeOperation = 'lighter';
  HOLO.draw.arc(x, F.cx + (dx || 0), F.cy + (dy || 0), 1, g, { mark: markDeg, alpha: 1 }); x.globalCompositeOperation = 'source-over'; const d = x.getImageData(0, 0, ROI.w, ROI.h).data; return { d, L: lum(d), c }; }
function renderRead(gr, typedPx, lines) { const c = new OffscreenCanvas(ROI.w, ROI.h), x = c.getContext('2d'); x.fillStyle = 'rgb(7,7,7)'; x.fillRect(0, 0, ROI.w, ROI.h); HOLO.draw.readout(x, RD.x + FM.read.x0, RD.y + FM.read.y0, 1, gr, lines, typedPx, 1); return lum(x.getImageData(0, 0, ROI.w, ROI.h).data); }
let FM = null;
const TOL = { chamfer: 1.6, radial: 0.12, angCorr: 0.12, segs: 1, gapMean: 3, fwhm: 1.5, dE: 6, a0: 4, a1: 4, cap: 0.25, markW: 1.5, markH: 1.5, markRms: 1.5, blink: 0.75, drift: 1.0, glyphH: 0.75, lineGap: 0.75, typeRate: 0.2, maxLen: 0.15 };
function scoreGenome(G, full) {
  const g = G.arc, F = FM.F, r = renderArc(g, F, null, G.fit.dx, G.fit.dy), f = features(r.L, F, r.d), E = edges(r.L, F), ff = FM.feat, err = {}, m = {};
  m.chamfer = chamfer(FM.E, E); err.chamfer = m.chamfer / TOL.chamfer;
  const nr = Math.min(ff.rad.length, f.rad.length); let s = 0, nn = 0; for (let k = 0; k < nr; k++) { s += (f.rad[k] / f.peak - ff.rad[k] / ff.peak) ** 2; nn++; } m.radial = Math.sqrt(s / nn); err.radial = m.radial / TOL.radial;
  const A = ff.ang, B = f.ang; let ma = 0, mb = 0; for (let i = 0; i < A.length; i++) { ma += A[i]; mb += B[i]; } ma /= A.length; mb /= B.length; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < A.length; i++) { sab += (A[i] - ma) * (B[i] - mb); saa += (A[i] - ma) ** 2; sbb += (B[i] - mb) ** 2; } m.angCorr = sab / Math.sqrt(saa * sbb); err.angCorr = (1 - m.angCorr) / TOL.angCorr;
  m.segs = f.segs; err.segs = (f.segs - ff.segs) / TOL.segs;
  let gs = 0; ff.gaps.forEach(a => { let b = 99; f.gaps.forEach(q => b = Math.min(b, Math.abs(q - a))); gs += Math.min(b, 12); }); m.gapMean = gs / Math.max(1, ff.gaps.length); err.gapMean = m.gapMean / TOL.gapMean;
  m.fwhm = f.fwhm; err.fwhm = (f.fwhm - ff.fwhm) / TOL.fwhm; m.a0 = f.a0; err.a0 = (f.a0 - ff.a0) / TOL.a0; m.a1 = f.a1; err.a1 = (f.a1 - ff.a1) / TOL.a1; m.cap = f.capRatio; err.cap = (f.capRatio - ff.capRatio) / TOL.cap;
  m.lab = f.lab; m.dE = Math.hypot(f.lab[0] - ff.lab[0], f.lab[1] - ff.lab[1], f.lab[2] - ff.lab[2]); err.dE = m.dE / TOL.dE;
  // the mark: its size, rendered and found by the same tracker at the film's last position
  const am = FM.marks.filter(a => a !== null), last = am[am.length - 1]; const rm = renderArc(g, F, last - FM.markBias, G.fit.dx, G.fit.dy), mk = markAngle(rm.L, r.L, F, 22);
  if (mk) { const bl = markBlob(rm.L, r.L, F, mk); m.markW = bl.w; m.markH = bl.h; } else { m.markW = 0; m.markH = 0; } err.markW = (m.markW - FM.blob.w) / TOL.markW; err.markH = (m.markH - FM.blob.h) / TOL.markH;
  // step timing: MarkState driven by the film's step moments, compared frame by frame with arc-series.json
  const st = stepSeries(G.steps); m.markRms = st.rms; m.blink = st.blink; m.drift = st.drift; err.markRms = st.rms / TOL.markRms; err.blink = st.blink / TOL.blink; err.drift = st.drift / TOL.drift;
  // readout: type for 1.6 s from empty and measure the same way
  const rd = readSeriesFor(G.readout); Object.assign(m, rd); err.glyphH = (rd.glyphH - FM.read.glyphH) / TOL.glyphH; err.lineGap = (rd.lineGap - FM.read.lineGap) / TOL.lineGap; err.typeRate = (rd.typeRate / FM.read.rate - 1) / TOL.typeRate; err.maxLen = (rd.maxLen / FM.read.maxLen - 1) / TOL.maxLen;
  let S = 0; for (const k in err) S += Math.min(err[k] * err[k], 400); const within = Object.keys(err).filter(k => Math.abs(err[k]) <= 1).length;
  return { S, err, m, within, n: Object.keys(err).length, E: full ? E : null };
}
function stepSeries(gs) { const A = ARCSER.angle, t0 = ARCSER.t0; const steps = []; for (let i = 1; i < A.length; i++) if (A[i] === null && A[i - 1] !== null) steps.push(i);
  const ms = new HOLO.MarkState(gs); let k = 0; const out = []; const dt = 1 / 24; let lastStep = -9;
  for (let i = 0; i < A.length; i++) { if (k < steps.length && steps[k] === i) { ms.step(k + 1); k++; } out.push(ms.update(dt)); }
  let s = 0, n = 0, bl = 0, dr = 0, dn = 0; for (let i = 0; i < A.length; i++) { if ((A[i] === null) !== (out[i] === null)) bl++; if (A[i] !== null && out[i] !== null && i < 76) { s += (A[i] - out[i]) ** 2; n++; } }
  // drift: film rises ~2-3 deg after each landing; compare the change over the 8 frames after each reappearance
  steps.forEach(si => { let j = si; while (j < A.length && A[j] === null) j++; if (j + 8 < 76 && A[j + 8] !== null && out[j] !== null && out[j + 8] !== null) { dr += Math.abs((A[j + 8] - A[j]) - (out[j + 8] - out[j])); dn++; } });
  return { rms: Math.sqrt(s / n), blink: bl / steps.length, drift: dn ? dr / dn : 0, series: out }; }
function readSeriesFor(gr) { const o = HOLO.readout(null, null, { genome: { readout: gr }, auto: false, seed: 3 }); o.type(6); const xs = [], glyph = [], gapsY = [], lens = []; const bg = new Float32Array(ROI.w * ROI.h).fill(7);
  for (let i = 0; i < 40; i++) { o.update(1 / 24); const L = renderRead(gr, o.typed, o.lines.map(l => l)); const ls = readFeat(L, bg); ls.forEach(l => glyph.push(l.h)); for (let k = 1; k < ls.length; k++) gapsY.push(ls[k].y - ls[k - 1].y); xs.push(ls.length ? ls[ls.length - 1].x2 : null); lens.push(ls.length ? ls[ls.length - 1].len : 0); }
  const med = a => { const s = a.slice().sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0; }; return { glyphH: med(glyph), lineGap: med(gapsY), typeRate: typeRate(xs, 24), maxLen: Math.max(...lens) }; }
// the genome as a vector of evolvable genes
const GENES = [['fit.dx', -6, 6], ['fit.dy', -6, 6], ['arc.R', 70, 100], ['arc.asp', 0.7, 1.1], ['arc.thick', 8, 26], ['arc.bandIn', 0.02, 0.6], ['arc.bandOut', 0.2, 1.2], ['arc.a0', -125, -85], ['arc.a1', 25, 70], ['arc.tail', 2, 30],
  ['arc.capA1', -95, -55], ['arc.capGain', 0.8, 2.6], ['arc.gapW', 0.8, 6], ['arc.hairR', 0.6, 0.92], ['arc.hairA', 0, 0.8], ['arc.glow', 0, 4], ['arc.glowA', 0, 0.9], ['arc.col.0', 140, 255], ['arc.col.1', 140, 255], ['arc.col.2', 120, 255],
  ['arc.markW', 3, 14], ['arc.markH', 2, 10], ['arc.markOff', -4, 6], ['arc.edge', 0, 4],
  ['steps.blinkFrames', 2, 5.5], ['steps.drift', 0, 5], ['steps.driftTime', 0.15, 1.2],
  ['readout.glyphH', 1, 4.5], ['readout.lineGap', 3.5, 10], ['readout.typeRate', 20, 200], ['readout.lineW', 50, 140], ['readout.charW', 0.8, 3], ['readout.burst', 0.04, 0.2], ['readout.blur', 0, 3]];
function getP(o, p) { return p.split('.').reduce((a, k) => a[k], o); } function setP(o, p, v) { const ks = p.split('.'), l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; }
function evolve(G0, seed, gens, onGen) { const rnd = HOLO.prng(seed); const clone = o => JSON.parse(JSON.stringify(o)); let pop = [{ G: G0, r: scoreGenome(G0) }]; const log = [];
  for (let gen = 0; gen < gens; gen++) { const kids = []; const sigma = 0.12 * Math.pow(0.96, gen);
    for (let i = 0; i < 14; i++) { const p = pop[Math.min(pop.length - 1, Math.floor(rnd() * rnd() * pop.length))].G, c = clone(p); const nm = 1 + Math.floor(rnd() * 4);
      for (let j = 0; j < nm; j++) { const [k, lo, hi] = GENES[Math.floor(rnd() * GENES.length)]; let v = getP(c, k) + (rnd() + rnd() + rnd() - 1.5) * (hi - lo) * sigma; v = Math.max(lo, Math.min(hi, v)); setP(c, k, +v.toFixed(3)); }
      // gaps: occasionally re-seat one gap on a film gap, or nudge one
      if (rnd() < 0.3 && FM.feat.gaps.length) { const gi = Math.floor(rnd() * c.arc.gaps.length); c.arc.gaps[gi] = +(c.arc.gaps[gi] + (rnd() - 0.5) * 4).toFixed(1); c.arc.gaps.sort((a, b) => a - b); }
      if (rnd() < 0.08) { if (c.arc.gaps.length > FM.feat.gaps.length && rnd() < 0.5) c.arc.gaps.splice(Math.floor(rnd() * c.arc.gaps.length), 1); else c.arc.gaps.push(FM.feat.gaps[Math.floor(rnd() * FM.feat.gaps.length)] + FM.markBias * 0); c.arc.gaps.sort((a, b) => a - b); }
      kids.push({ G: c, r: scoreGenome(c) }); }
    pop = pop.concat(kids).sort((a, b) => a.r.S - b.r.S).slice(0, 5); const b = pop[0].r; log.push({ gen, S: +b.S.toFixed(3), within: b.within, of: b.n, worst: Object.entries(b.err).sort((p, q) => Math.abs(q[1]) - Math.abs(p[1])).slice(0, 3).map(([k, v]) => k + ':' + v.toFixed(2)) });
    if (onGen) onGen(log[log.length - 1]); if (b.within === b.n) break; }
  return { best: pop[0], log }; }
`;

(async () => {
  const t0 = Date.now(); const trace = { tool: 'holo-measure.js', seed: SEED, date: new Date().toISOString(), film: { shot: 'medium cake shot 144.70-148.5 s, every frame, ROI x540-800 y270-490 of 1280x720', kids: '153.07 s' } };
  // 1. sound and feel (node)
  const snd = soundTargets(); trace.sound = snd; const feelLog = []; const G0 = JSON.parse(JSON.stringify(HOLO.genome));
  const feel0 = feelScore(G0.device, snd.film), feel = EVOLVE ? evolveFeel(snd.film, SEED, feelLog) : { g: G0.device, r: feel0 };
  trace.feel = { before: { score: +feel0.s.toFixed(3), m: feel0.m }, after: { score: +feel.r.s.toFixed(3), m: feel.r.m, err: feel.r.err }, want: feel.r.want, tol: feel.r.tol, log: feelLog };
  const gd = Object.assign({}, feel.g); if (snd.grains) { gd.clickRate = +Math.max(0.6, Math.min(1.6, snd.film.centroidStep / snd.grains.centroidClick)).toFixed(3); gd.handRate = +Math.max(0.6, Math.min(1.8, snd.film.centroidHand / snd.grains.centroidClick)).toFixed(3); }
  trace.sound.grainRates = { clickRate: gd.clickRate, handRate: gd.handRate, note: 'playback rate that moves the grain spectral centroid onto the film click centroid' };
  console.log('feel', JSON.stringify(trace.feel.after.m), 'score', trace.feel.after.score);
  // 2. the UI (browser)
  const { chromium } = require('playwright'); const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 400, height: 300 } });
  pg.on('console', m => { if (m.type() === 'error') console.log('page:', m.text()); });
  await pg.setContent('<html><body></body></html>'); await pg.addScriptTag({ path: path.join(HERE, 'holo.js') }); await pg.addScriptTag({ content: PAGE_LIB + PAGE_EVO + `\nconst ARCSER = ${JSON.stringify(ARCS)};` });
  const fm = await pg.evaluate(async ([fr, as, rs, ku]) => { FM = await filmMeasure(fr, as, rs, ku); const o = Object.assign({}, FM); delete o.plate; o.E = FM.E.length; o.feat = Object.assign({}, FM.feat); return o; }, [frames, ARCS, READS, kidFrame]);
  trace.filmMeasured = fm; console.log('film fit', JSON.stringify(fm.F), 'segs', fm.feat.segs, 'gaps', fm.feat.gaps, 'fwhm', fm.feat.fwhm, 'lab', fm.feat.lab.map(v => v.toFixed(1)), 'read', JSON.stringify(fm.read).slice(0, 200), 'mark agree', fm.markAgree, 'bias', fm.markBias.toFixed(2), 'rms', fm.markRmsVsSeries.toFixed(2), 'blob', JSON.stringify(fm.blob), 'kid', JSON.stringify(fm.kid));
  G0.fit = G0.fit || { dx: 0, dy: 0 }; G0.device = gd;
  const before = await pg.evaluate(G => { const r = scoreGenome(G); return { S: r.S, within: r.within, n: r.n, err: r.err, m: r.m }; }, G0); trace.before = before; console.log('before S', before.S.toFixed(2), before.within + '/' + before.n);
  let best = { G: G0, r: before }, log = [];
  if (EVOLVE) { await pg.exposeFunction('onGen', l => { if (l.gen % 5 === 0) console.log('gen', l.gen, 'S', l.S, l.within + '/' + l.of, l.worst.join(' ')); });
    const ev = await pg.evaluate(([G, s, n]) => { const e = evolve(G, s, n, window.onGen); return { G: e.best.G, r: { S: e.best.r.S, within: e.best.r.within, n: e.best.r.n, err: e.best.r.err, m: e.best.r.m }, log: e.log }; }, [G0, SEED, GENS]); best = ev; log = ev.log; }
  trace.after = best.r; trace.log = log; trace.tolerances = await pg.evaluate(() => TOL);
  // 3. strips (film pixels: only to stelline-work/holo)
  const strip = await pg.evaluate(async ([fr, G]) => { const W = ROI.w, H = ROI.h, c = new OffscreenCanvas(W * 4, H * 2), x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, W * 4, H * 2);
    const show = [10, 40, 62, 84]; for (let k = 0; k < 4; k++) { const img = await loadImg(fr[show[k]]); x.drawImage(img, -ROI.x + k * W, -ROI.y, 1280, 720); x.save(); x.beginPath(); x.rect(k * W, 0, W, H); x.clip(); x.restore();
      const m = FM.marks[show[k] - FM.markOffset]; const r = renderArc(G.arc, FM.F, m === null || m === undefined ? null : m - FM.markBias, G.fit.dx, G.fit.dy); x.drawImage(r.c, k * W, H);
      const o = HOLO.readout(null, null, { genome: { readout: G.readout }, auto: false, seed: 3 }); o.type(3); for (let i = 0; i < 10 + k * 6; i++) o.update(1 / 24); x.globalCompositeOperation = 'lighter'; HOLO.draw.readout(x, k * W + RD.x + FM.read.x0, H + RD.y + FM.read.y0, 1, G.readout, o.lines, o.typed, 1); x.globalCompositeOperation = 'source-over'; }
    // brighten for reading
    const d = x.getImageData(0, 0, W * 4, H * 2); for (let i = 0; i < d.data.length; i += 4) for (let j = 0; j < 3; j++) d.data[i + j] = Math.min(255, d.data[i + j] * 2.2); x.putImageData(d, 0, 0);
    const b = await c.convertToBlob({ type: 'image/png' }); const ab = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < ab.length; i++) s += String.fromCharCode(ab[i]); return btoa(s); }, [frames, best.G]);
  fs.writeFileSync(OUT + '/strip-arc.png', Buffer.from(strip, 'base64')); trace.strip = OUT + '/strip-arc.png (top: film, bottom: HOLO at the same framing; brightened x2.2)';
  await br.close();
  // 4. write genome, inject into holo.js, write trace
  const G = best.G; G.device = gd; const gtxt = JSON.stringify(G, null, 1);
  fs.writeFileSync(path.join(HERE, 'holo-genome.json'), gtxt + '\n');
  const src = fs.readFileSync(path.join(HERE, 'holo.js'), 'utf8'); const a = src.indexOf('/*GENOME*/'), b = src.indexOf('/*END*/'); fs.writeFileSync(path.join(HERE, 'holo.js'), src.slice(0, a + 10) + JSON.stringify(G) + src.slice(b));
  trace.seconds = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(path.join(HERE, 'holo-trace.json'), JSON.stringify(trace, null, 1));
  console.log('after S', best.r.S.toFixed(2), best.r.within + '/' + best.r.n, 'in', trace.seconds, 's');
  console.log(Object.entries(best.r.err).map(([k, v]) => `${k}:${v.toFixed(2)}`).join(' '));
})().catch(e => { console.error(e); process.exit(1); });
