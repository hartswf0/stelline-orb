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
const GENS = +arg('gens', 40), SEED = +arg('seed', 7), STRIP_ONLY = !!arg('strip-only', false), EVOLVE = !arg('no-evolve', false) && !STRIP_ONLY;
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

/* ---------------------------------------------------------------- pass 2: a trustworthy fit, genes set from measurement, evolution only of the free genes */
const PAGE_V2 = String.raw`
// a circle seen in perspective: an ellipse turned by rot. Fit to the band's OUTER edge (half-max crossing scanned per row on the right, per column on the top),
// grid over (rot, asp), linear circle fit in the turned and unstretched frame, then refine. Returns centre, R (semi-major), asp (minor/major), rot (deg), rms (px).
function circLS(P) { let sxx = 0, sxy = 0, sx = 0, syy = 0, sy = 0, n = P.length, bx = 0, by = 0, b1 = 0; for (const [x, y] of P) { const z = x * x + y * y; sxx += x * x; sxy += x * y; sx += x; syy += y * y; sy += y; bx += x * z; by += y * z; b1 += z; }
  const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], b = [bx, by, b1]; const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M), sol = [0, 1, 2].map(i => det(M.map((r, k) => r.map((v, j) => j === i ? b[k] : v))) / D); const cx = sol[0] / 2, cy = sol[1] / 2, R = Math.sqrt(sol[2] + cx * cx + cy * cy);
  let e = 0; for (const [x, y] of P) e += (Math.hypot(x - cx, y - cy) - R) ** 2; return { cx, cy, R, rms: Math.sqrt(e / n) }; }
function fitRot(pts, asp0, asp1) { let best = null; const tryF = (rot, asp) => { const c = Math.cos(-rot * Math.PI / 180), s = Math.sin(-rot * Math.PI / 180); const Q = pts.map(([x, y]) => [(x * c - y * s) / asp, x * s + y * c]); const f = circLS(Q);
    if (!best || f.rms * Math.sqrt(asp) < best.rms * Math.sqrt(best.asp)) { const cr = Math.cos(rot * Math.PI / 180), sr = Math.sin(rot * Math.PI / 180), ux = f.cx * asp, uy = f.cy; best = { rot, asp, R: f.R, rms: f.rms * asp, cx: ux * cr - uy * sr, cy: ux * sr + uy * cr }; } };
  for (let rot = 0; rot < 180; rot += 1) for (let asp = asp0; asp <= asp1 + 1e-9; asp += 0.01) tryF(rot, asp);
  const b0 = best; for (let rot = b0.rot - 1; rot <= b0.rot + 1; rot += 0.1) for (let asp = b0.asp - 0.01; asp <= b0.asp + 0.01; asp += 0.001) tryF(rot, asp);
  if (best.rot > 90) best.rot -= 180; if (best.rot < -90) best.rot += 180;
  let e = 0; pts.forEach(p => { e += ellDist(best, p) ** 2; }); best.rms = Math.sqrt(e / pts.length); return best; }
function ellPt(F, t, rho) { const c = Math.cos(t * Math.PI / 180), s = Math.sin(t * Math.PI / 180), r = F.rot * Math.PI / 180, x = c * F.R * rho * F.asp, y = s * F.R * rho; return [F.cx + x * Math.cos(r) - y * Math.sin(r), F.cy + x * Math.sin(r) + y * Math.cos(r)]; }
function ellDist(F, [x, y]) { const r = -F.rot * Math.PI / 180, dx = x - F.cx, dy = y - F.cy, u = (dx * Math.cos(r) - dy * Math.sin(r)) / F.asp, v = dx * Math.sin(r) + dy * Math.cos(r); const rr = Math.hypot(u, v); return (rr - F.R) * (Math.hypot(u * F.asp, v) / rr); }
function edgePts(L, box) { const W = box.W, pts = []; const at = (x, y) => L[y * W + x];
  for (let y = box.y0; y < box.y1; y++) { let m = 0; for (let x = box.x0; x < box.x1; x++) m = Math.max(m, at(x, y)); if (m < box.min) continue; const th = box.bg + 0.5 * (m - box.bg); let x = box.x1 - 1; while (x > box.x0 && at(x, y) <= th) x--; if (x <= box.x0) continue; const a = at(x, y), b = at(x + 1, y); pts.push([x + (a - th) / Math.max(1e-3, a - b), y]); }
  if (box.top) for (let x = box.top[0]; x < box.top[1]; x++) { let m = 0; for (let y = box.ty; y < box.ty + 50; y++) m = Math.max(m, at(x, y)); if (m < box.min) continue; const th = box.bg + 0.5 * (m - box.bg); let y = box.ty; if (at(x, y) > th) continue; while (y < box.ty + 50 && at(x, y) <= th) y++; pts.push([x, y - 0.5]); }
  return pts; }
function fitArc(plate) { const pts = edgePts(plate, { W: ROI.w, x0: 70, x1: 225, y0: 30, y1: 195, min: 35, bg: 8, top: [85, 160], ty: 19 });
  let F = fitRot(pts, 0.55, 1.0); const keep = pts.filter(p => Math.abs(ellDist(F, p)) < 3 * F.rms + 0.5); F = fitRot(keep, 0.55, 1.0); F.n = keep.length; F.pts = keep; return F; }
// features in the ellipse's parametric frame (t in degrees, rho = fraction of R)
const T2 = [-150, 110];
function features2(L, F, rgb) { const R0 = 0.6, R1 = 1.25, nR = Math.round((R1 - R0) * F.R), nT = T2[1] - T2[0] + 1, P = new Float32Array(nT * nR), bg = 8;
  for (let t = 0; t < nT; t++) for (let k = 0; k < nR; k++) { const [x, y] = ellPt(F, T2[0] + t, R0 + k / F.R); P[t * nR + k] = y < ROI.wallY ? 0 : samp(L, x, y); }
  const body = [-40, 30], rad = new Float32Array(nR); let cnt = 0; for (let t = body[0] - T2[0]; t <= body[1] - T2[0]; t++) { for (let k = 0; k < nR; k++) rad[k] += P[t * nR + k]; cnt++; } for (let k = 0; k < nR; k++) rad[k] = Math.max(0, rad[k] / cnt - bg);
  let pk = 0; for (let k = 0; k < nR; k++) if (rad[k] > rad[pk]) pk = k; let a = pk, b = pk; while (a > 0 && rad[a] > rad[pk] / 2) a--; while (b < nR - 1 && rad[b] > rad[pk] / 2) b++;
  let a3 = pk; while (a3 > 0 && rad[a3] > rad[pk] * 0.25) a3--;
  const ang = new Float32Array(nT), inner = new Float32Array(nT), outer = new Float32Array(nT), mid = (a + b) >> 1; for (let t = 0; t < nT; t++) { let s = 0, si = 0, so = 0; for (let k = a; k <= b; k++) { const v = P[t * nR + k]; s += v; if (k < mid) si += v; else so += v; } ang[t] = s / (b - a + 1) - bg; inner[t] = si / Math.max(1, mid - a) - bg; outer[t] = so / Math.max(1, b - mid + 1) - bg; }
  const sorted = Array.from(ang.slice(body[0] - T2[0], body[1] - T2[0] + 1)).sort((p, q) => p - q), med = sorted[sorted.length >> 1];
  let e0 = -1, e1 = -1; for (let t = 0; t < nT; t++) if (ang[t] > 0.3 * med) { if (e0 < 0) e0 = t; e1 = t; }
  // notches: dips below 0.8 of the local 70th percentile, on the inner half or the whole band
  const gaps = []; for (let t = e0 + 8; t < e1 - 8; t++) { const w = []; for (let d = -8; d <= 8; d++) w.push(ang[t + d]); w.sort((p, q) => p - q); const loc = w[Math.floor(w.length * 0.7)];
    if (ang[t] < 0.8 * loc && ang[t] <= ang[t - 1] && ang[t] <= ang[t + 1]) { let l = t, r = t; const half = (loc + ang[t]) / 2; while (ang[l - 1] < half && l > t - 8) l--; while (ang[r + 1] < half && r < t + 8) r++;
      const g = { t: T2[0] + t, w: r - l + 1, depthIn: 1 - inner[t] / Math.max(1, (inner[t - 6] + inner[t + 6]) / 2), depthOut: 1 - outer[t] / Math.max(1, (outer[t - 6] + outer[t + 6]) / 2) }; if (!gaps.length || g.t - gaps[gaps.length - 1].t > 5) gaps.push(g); } }
  // cap: the bright upper end
  let capEnd = e0; while (capEnd < e1 && ang[capEnd] > 1.25 * med) capEnd++; let cap = 0, cn = 0; for (let t = e0; t < Math.max(e0 + 3, capEnd); t++) { cap += ang[t]; cn++; }
  let lab = null; if (rgb) { let R = 0, G = 0, B = 0, n = 0; const W = ROI.w; for (let t = body[0] - T2[0]; t <= body[1] - T2[0]; t += 2) for (let k = a; k <= b; k++) { if (P[t * nR + k] - bg <= rad[pk] * 0.5) continue; const [x, y] = ellPt(F, T2[0] + t, R0 + k / F.R), i = Math.round(y) * W + Math.round(x); R += rgb[i * 4]; G += rgb[i * 4 + 1]; B += rgb[i * 4 + 2]; n++; } lab = toLab(R / n, G / n, B / n); lab.rgb = [R / n, G / n, B / n]; }
  return { rad: Array.from(rad), ang: Array.from(ang), fwhm: (b - a + 1) * 1, w25: pk - a3, peakRho: R0 + pk / F.R, a0: T2[0] + e0, a1: T2[0] + e1, gaps, segs: gaps.length + 1, capEnd: T2[0] + capEnd, capRatio: cap / cn / med, med, peak: rad[pk], lab, labRgb: lab && lab.rgb }; }
function edges2(L, F) { const W = ROI.w, H = ROI.h, E = []; let mx = 0; const m = new Float32Array(W * H);
  for (let y = Math.max(1, ROI.wallY + 2); y < H - 1; y++) for (let x = 60; x < W - 1; x++) { const r = -F.rot * Math.PI / 180, dx = x - F.cx, dy = y - F.cy, u = (dx * Math.cos(r) - dy * Math.sin(r)) / F.asp, v = dx * Math.sin(r) + dy * Math.cos(r), rr = Math.hypot(u, v) / F.R; if (rr < 0.6 || rr > 1.25) continue;
    const i = y * W + x; const gx = L[i + 1 - W] + 2 * L[i + 1] + L[i + 1 + W] - L[i - 1 - W] - 2 * L[i - 1] - L[i - 1 + W], gy = L[i + W - 1] + 2 * L[i + W] + L[i + W + 1] - L[i - W - 1] - 2 * L[i - W] - L[i - W + 1]; m[i] = Math.hypot(gx, gy); if (m[i] > mx) mx = m[i]; }
  for (let i = 0; i < W * H; i++) if (m[i] > 0.28 * mx) E.push([i % W, (i / W) | 0]); return E; }
function markT(L, plate, F, thr) { let best = 0, bt = null; for (let t = -110; t <= 70; t += 0.5) for (let rr = 0.94; rr <= 1.12; rr += 0.02) { const [x, y] = ellPt(F, t, rr), v = samp(L, x, y) - samp(plate, x, y); if (v > best) { best = v; bt = t; } } return best > thr ? { t: bt, v: best } : null; }
function blob2(L, plate, F, m) { const W = ROI.w, [x0, y0] = ellPt(F, m.t, 1.0); let x1 = 1e9, x2 = -1, y1 = 1e9, y2 = -1, n = 0; for (let y = Math.round(y0 - 12); y <= y0 + 12; y++) for (let x = Math.round(x0 - 14); x <= x0 + 14; x++) { const i = y * W + x; if (L[i] - plate[i] > m.v * 0.5) { n++; x1 = Math.min(x1, x); x2 = Math.max(x2, x); y1 = Math.min(y1, y); y2 = Math.max(y2, y); } } return { w: x2 - x1 + 1, h: y2 - y1 + 1, n }; }
function renderArc2(g, F, markT_, dx, dy) { const c = new OffscreenCanvas(ROI.w, ROI.h), x = c.getContext('2d'); x.fillStyle = 'rgb(8,8,8)'; x.fillRect(0, 0, ROI.w, ROI.h); x.globalCompositeOperation = 'lighter';
  HOLO.draw.arc(x, F.cx + (dx || 0), F.cy + (dy || 0), 1, g, { mark: markT_, alpha: 1 }); x.globalCompositeOperation = 'source-over'; const d = x.getImageData(0, 0, ROI.w, ROI.h).data; return { d, L: lum(d), c }; }
async function filmMeasure2(frames, arcSeries) {
  const imgs = []; for (const u of frames) imgs.push(await loadImg(u)); const D = imgs.map(roiData), Ls = D.map(lum); const plate = pct(Ls, 0.2), F = fitArc(plate);
  const pr = [0, 1, 2].map(c => pct(D.map(d => { const o = new Float32Array(d.length / 4); for (let i = 0; i < o.length; i++) o[i] = d[i * 4 + c]; return o; }), 0.2)), rgb = new Uint8ClampedArray(ROI.w * ROI.h * 4); for (let i = 0; i < ROI.w * ROI.h; i++) { rgb[i * 4] = pr[0][i]; rgb[i * 4 + 1] = pr[1][i]; rgb[i * 4 + 2] = pr[2][i]; rgb[i * 4 + 3] = 255; }
  const feat = features2(plate, F, rgb), E = edges2(plate, F);
  // the mark per frame, aligned to arc-series.json by its absent frames
  const mk = Ls.map(L => markT(L, plate, F, 22)); let al = null; for (let off = -3; off <= 4; off++) { let ag = 0, n = 0; arcSeries.angle.forEach((a, i) => { const m = mk[i + off]; if (m === undefined) return; n++; if ((a === null) === (m === null)) ag++; }); if (!al || ag / n > al.r) al = { off, r: ag / n }; }
  const ser = arcSeries.angle.map((a, i) => mk[i + al.off] ? mk[i + al.off].t : null);
  // the five resting positions: median t over each run between blinks (first 6 frames of each run, before any drift)
  const runs = []; let cur = null; arcSeries.angle.forEach((a, i) => { if (a === null) { cur = null; return; } if (!cur) { cur = []; runs.push(cur); } cur.push(i); });
  const med = a => { const s = a.filter(v => v !== null).sort((p, q) => p - q); return s.length ? s[s.length >> 1] : null; };
  const rest = runs.map(r => med(r.slice(0, 4).map(i => ser[i]))), drift = runs.slice(0, 4).map(r => r.length > 9 ? med(r.slice(7, 10).map(i => ser[i])) - med(r.slice(0, 3).map(i => ser[i])) : null).filter(v => v !== null);
  const blinks = []; for (let i = 1; i < arcSeries.angle.length; i++) if (arcSeries.angle[i] === null && arcSeries.angle[i - 1] !== null) { let j = i; while (arcSeries.angle[j] === null) j++; blinks.push(j - i); }
  let bi = -1; runs[runs.length - 1].slice(0, 10).forEach(i => { const j = i + al.off; if (mk[j] && (bi < 0 || mk[j].v > mk[bi].v)) bi = j; }); const blob = bi >= 0 ? blob2(Ls[bi], plate, F, mk[bi]) : { w: 0, h: 0, n: 0 };
  return { F, feat, E, plate, ser, markAgree: al.r, markOffset: al.off, rest, drift, blinks, blob }; }
// the child's mark at 153.07 s: the same edge fit on the small C, plus its bar and leader
async function kidMeasure(url) { const img = await loadImg(url); const KB = { x: 780, y: 110, w: 120, h: 110 }; const c = new OffscreenCanvas(KB.w, KB.h), x = c.getContext('2d'); x.drawImage(img, -KB.x, -KB.y); const L = lum(x.getImageData(0, 0, KB.w, KB.h).data);
  let mx = 0, bg = 255; L.forEach(v => { mx = Math.max(mx, v); }); const s = Array.from(L).sort((p, q) => p - q); bg = s[s.length >> 2];
  const pts = edgePts(L, { W: KB.w, x0: 52, x1: 105, y0: 20, y1: 85, min: bg + 0.35 * (mx - bg), bg }); const F = fitRot(pts, 0.5, 1.0);
  // thickness: half-max width along rows through the C's right side, in units of the fitted R
  let thick = [], bar = { x1: 99, x2: -1, y1: 99, y2: -1 }; for (let y = Math.round(F.cy - 6); y <= F.cy + 6; y++) { let pkx = -1, pv = 0; for (let xx = Math.round(F.cx); xx < KB.w; xx++) if (L[y * KB.w + xx] > pv) { pv = L[y * KB.w + xx]; pkx = xx; } const th = bg + 0.5 * (pv - bg); let a = pkx, b = pkx; while (a > 0 && L[y * KB.w + a] > th) a--; while (b < KB.w - 1 && L[y * KB.w + b] > th) b++; thick.push(b - a - 1); }
  const thr = bg + 0.6 * (mx - bg); for (let y = Math.max(0, Math.round(F.cy - 30)); y < F.cy + 5; y++) for (let xx = Math.max(0, Math.round(F.cx - 45)); xx < F.cx - 18; xx++) if (L[y * KB.w + xx] > thr) { bar.x1 = Math.min(bar.x1, xx); bar.x2 = Math.max(bar.x2, xx); bar.y1 = Math.min(bar.y1, y); bar.y2 = Math.max(bar.y2, y); }
  thick.sort((p, q) => p - q); return { box: KB, F: { cx: F.cx, cy: F.cy, R: F.R, asp: F.asp, rot: F.rot, rms: F.rms, n: pts.length }, thick: thick[thick.length >> 1], bar: { x: bar.x1 - F.cx, y: bar.y1 - F.cy, w: bar.x2 - bar.x1 + 1, h: bar.y2 - bar.y1 + 1 }, mx, bg, pts }; }
async function kidRender(g, KM) { const c = new OffscreenCanvas(KM.box.w, KM.box.h), x = c.getContext('2d'); x.fillStyle = 'rgb(' + [KM.bg, KM.bg, KM.bg] + ')'; x.fillRect(0, 0, KM.box.w, KM.box.h); x.globalCompositeOperation = 'lighter'; HOLO.draw.childMark(x, KM.F.cx, KM.F.cy, 1, g, 1); const L = lum(x.getImageData(0, 0, KM.box.w, KM.box.h).data); return { L, c }; }
// genes set straight from the measurements
function directGenes(G0, FMx, KM) { const G = JSON.parse(JSON.stringify(G0)), g = G.arc, f = FMx.feat, F = FMx.F; const set = {};
  const S = (k, v) => { const ks = k.split('.'); let o = G; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = typeof v === 'number' ? +v.toFixed(3) : v; set[k] = o[ks[0]]; };
  S('arc.R', F.R); S('arc.asp', F.asp); S('arc.rot', F.rot); S('arc.thick', f.fwhm); S('arc.a0', f.a0); S('arc.a1', f.a1); S('arc.capA0', f.a0); S('arc.capA1', Math.max(f.a0 + 6, f.capEnd)); S('arc.capGain', Math.max(1, f.capRatio));
  S('arc.gaps', f.gaps.map(q => q.t)); S('arc.gapW', f.gaps.reduce((a, q) => a + q.w, 0) / f.gaps.length);
  const dIn = f.gaps.reduce((a, q) => a + q.depthIn, 0) / f.gaps.length, dOut = f.gaps.reduce((a, q) => a + q.depthOut, 0) / f.gaps.length; S('arc.gapDepth', Math.min(1, Math.max(dIn, dOut) * 1.3)); S('arc.gapCover', Math.max(0.35, Math.min(1, 0.5 + 0.5 * (dOut / Math.max(0.01, dIn)))));
  const rgb = f.labRgb, m = Math.max(...rgb); S('arc.col', rgb.map(v => Math.round(v / m * 255))); S('arc.markW', FMx.blob.w); S('arc.markH', FMx.blob.h); S('arc.markOff', 0);
  S('steps.marks', FMx.rest.map((v, i) => v === null ? G0.steps.marks[i] : +v.toFixed(1))); S('steps.blinkFrames', FMx.blinks.reduce((a, b) => a + b, 0) / FMx.blinks.length); S('steps.drift', FMx.drift.reduce((a, b) => a + b, 0) / Math.max(1, FMx.drift.length));
  G.arc.needles = [[-62, 0.6, 1.04, 0.5], [33, 0.74, 1.1, 0.45]];
  if (KM) { const k = G.child; S('child.R', KM.F.R); S('child.asp', KM.F.asp); S('child.rot', KM.F.rot); S('child.thick', KM.thick); S('child.barX', KM.bar.x); S('child.barY', KM.bar.y); S('child.barW', KM.bar.w); S('child.barH', KM.bar.h); }
  G.fit = { dx: 0, dy: 0 }; return { G, set }; }
const TOL2 = { chamfer: 1.6, dE: 6, radial: 0.12, angCorr: 0.12 };
const CHECK2 = { segs: 1, gapMean: 3, fwhm: 1.5, a0: 4, a1: 4, markW: 1.5, markH: 1.5 };
function score2(G) { const F = FM2.F, r = renderArc2(G.arc, F, null, G.fit.dx, G.fit.dy), f = features2(r.L, F, r.d), E = edges2(r.L, F), ff = FM2.feat, m = {}, err = {}, chk = {};
  m.chamfer = chamfer(FM2.E, E); err.chamfer = m.chamfer / TOL2.chamfer; m.dE = Math.hypot(f.lab[0] - ff.lab[0], f.lab[1] - ff.lab[1], f.lab[2] - ff.lab[2]); err.dE = m.dE / TOL2.dE;
  const nr = Math.min(ff.rad.length, f.rad.length); let s = 0; for (let k = 0; k < nr; k++) s += (f.rad[k] / Math.max(1, f.peak) - ff.rad[k] / ff.peak) ** 2; m.radial = Math.sqrt(s / nr); err.radial = m.radial / TOL2.radial;
  const A = ff.ang, B = f.ang; let ma = 0, mb = 0; for (let i = 0; i < A.length; i++) { ma += A[i]; mb += B[i]; } ma /= A.length; mb /= B.length; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < A.length; i++) { sab += (A[i] - ma) * (B[i] - mb); saa += (A[i] - ma) ** 2; sbb += (B[i] - mb) ** 2; } m.angCorr = sab / Math.sqrt(saa * sbb); err.angCorr = (1 - m.angCorr) / TOL2.angCorr;
  // checks (not scored: set directly, verified here by the same extractor)
  chk.segs = f.segs; chk.fwhm = f.fwhm; chk.a0 = f.a0; chk.a1 = f.a1; let gs = 0; ff.gaps.forEach(q => { let b = 99; f.gaps.forEach(p => b = Math.min(b, Math.abs(p.t - q.t))); gs += Math.min(b, 12); }); chk.gapMean = gs / Math.max(1, ff.gaps.length);
  const rm = renderArc2(G.arc, F, FM2.rest[4], G.fit.dx, G.fit.dy), mk = markT(rm.L, r.L, F, 22); if (mk) { const bl = blob2(rm.L, r.L, F, mk); chk.markW = bl.w; chk.markH = bl.h; chk.markT = mk.t; }
  chk.lab = f.lab.map(v => +v.toFixed(1));
  let S = 0; for (const k in err) S += Math.min(err[k] ** 2, 400); return { S, err, m, chk, within: Object.values(err).filter(v => Math.abs(v) <= 1).length, n: Object.keys(err).length }; }
const FREE = [['arc.bandIn', 0.02, 1.2], ['arc.bandOut', 0.1, 1.6], ['arc.fall', 0.3, 3], ['arc.edge', 0, 6], ['arc.lip', 0.2, 1.2], ['arc.glow', 0, 5], ['arc.glowA', 0, 1], ['arc.soft', 0, 2.5], ['arc.gain', 0.3, 2.5], ['arc.hairR', 0.6, 0.95], ['arc.hairA', 0, 0.9], ['arc.tail', 1, 40], ['arc.headTail', 0, 20], ['fit.dx', -1.5, 1.5], ['fit.dy', -1.5, 1.5]];
function evolve2(G0, seed, maxMs, onGen) { const rnd = HOLO.prng(seed), clone = o => JSON.parse(JSON.stringify(o)), t0 = performance.now(); FREE.forEach(([k, lo, hi]) => { if (getP(G0, k) === undefined) setP(G0, k, (lo + hi) / 2); });
  let pop = [{ G: G0, r: score2(G0) }]; const log = [];
  for (let gen = 0; performance.now() - t0 < maxMs; gen++) { const sigma = 0.15 * Math.pow(0.97, gen), kids = [];
    for (let i = 0; i < 16; i++) { const p = pop[Math.min(pop.length - 1, Math.floor(rnd() * rnd() * pop.length))].G, c = clone(p); const nm = 1 + Math.floor(rnd() * 3); for (let j = 0; j < nm; j++) { const [k, lo, hi] = FREE[Math.floor(rnd() * FREE.length)]; let v = getP(c, k) + (rnd() + rnd() + rnd() - 1.5) * (hi - lo) * sigma; setP(c, k, +Math.max(lo, Math.min(hi, v)).toFixed(3)); } kids.push({ G: c, r: score2(c) }); }
    pop = pop.concat(kids).sort((a, b) => a.r.S - b.r.S).slice(0, 5); const b = pop[0].r; const l = { gen, S: +b.S.toFixed(3), within: b.within, of: b.n, m: Object.fromEntries(Object.entries(b.m).map(([k, v]) => [k, +v.toFixed(3)])) }; log.push(l); if (onGen) onGen(l); if (b.within === b.n) break; }
  return { best: pop[0], log }; }
let FM2 = null, KM2 = null;
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
  await pg.setContent('<html><body></body></html>'); await pg.addScriptTag({ path: path.join(HERE, 'holo.js') }); await pg.addScriptTag({ content: PAGE_LIB + PAGE_EVO + PAGE_V2 + `\nconst ARCSER = ${JSON.stringify(ARCS)};` });
  // pass 2: fit the film's arc on its outer edge, verify by overlay, set the measurable genes, evolve only the free ones
  const MAXMIN = +arg('minutes', 25);
  const fm = await pg.evaluate(async ([fr, as, ku]) => { FM2 = await filmMeasure2(fr, as); KM2 = await kidMeasure(ku); const o = Object.assign({}, FM2); delete o.plate; o.E = FM2.E.length; o.F = Object.assign({}, FM2.F); delete o.F.pts; o.kid = Object.assign({}, KM2); delete o.kid.pts; return o; }, [frames, ARCS, kidFrame]);
  trace.pass = 2; trace.filmMeasured = fm;
  console.log('fit', JSON.stringify(fm.F), 'feat', JSON.stringify({ fwhm: fm.feat.fwhm, a0: fm.feat.a0, a1: fm.feat.a1, segs: fm.feat.segs, gaps: fm.feat.gaps, cap: fm.feat.capRatio, capEnd: fm.feat.capEnd, lab: fm.feat.lab }), 'rest', fm.rest, 'drift', fm.drift, 'blinks', fm.blinks, 'blob', JSON.stringify(fm.blob), 'agree', fm.markAgree);
  console.log('kid', JSON.stringify(fm.kid));
  // overlays: fitted ellipses and edge points on the film plate and on the child's mark (film pixels: stelline-work/holo only)
  const ov = await pg.evaluate(async ([fr, ku]) => { const out = {}; const F = FM2.F; { const c = new OffscreenCanvas(ROI.w * 3, ROI.h * 3), x = c.getContext('2d'); const id = new ImageData(ROI.w, ROI.h); for (let i = 0; i < ROI.w * ROI.h; i++) { const v = Math.min(255, FM2.plate[i] * 2.5); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
      const t = new OffscreenCanvas(ROI.w, ROI.h); t.getContext('2d').putImageData(id, 0, 0); x.imageSmoothingEnabled = false; x.drawImage(t, 0, 0, ROI.w * 3, ROI.h * 3);
      x.fillStyle = '#ff4040'; for (let a = -180; a < 180; a += 0.5) { const [px, py] = ellPt(F, a, 1); x.fillRect(px * 3 - 1, py * 3 - 1, 2, 2); } x.fillStyle = '#40a0ff'; for (let a = -180; a < 180; a += 0.5) { const [px, py] = ellPt(F, a, 1 - FM2.feat.fwhm / F.R); x.fillRect(px * 3 - 1, py * 3 - 1, 2, 2); }
      x.fillStyle = '#40ff60'; F.pts.forEach(([px, py]) => x.fillRect(px * 3 - 1, py * 3 - 1, 3, 3)); x.fillStyle = '#ffd040'; FM2.feat.gaps.forEach(g => { const [px, py] = ellPt(F, g.t, 1.08); x.fillRect(px * 3 - 3, py * 3 - 3, 6, 6); });
      FM2.rest.forEach(t => { const [px, py] = ellPt(F, t, 1.14); x.fillStyle = '#ff40ff'; x.fillRect(px * 3 - 3, py * 3 - 3, 6, 6); });
      const b = await c.convertToBlob({ type: 'image/png' }); out.arc = Array.from(new Uint8Array(await b.arrayBuffer())); }
    { const K = KM2, img = await loadImg(ku), c = new OffscreenCanvas(K.box.w * 10, K.box.h * 5), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.filter = 'brightness(2.2)'; x.drawImage(img, K.box.x, K.box.y, K.box.w, K.box.h, 0, 0, K.box.w * 5, K.box.h * 5); x.filter = 'none';
      x.fillStyle = '#ff4040'; for (let a = -180; a < 180; a += 1) { const [px, py] = ellPt(K.F, a, 1); x.fillRect(px * 5 - 1, py * 5 - 1, 3, 3); } x.fillStyle = '#40ff60'; K.pts.forEach(([px, py]) => x.fillRect(px * 5 - 1, py * 5 - 1, 3, 3));
      x.strokeStyle = '#ffd040'; x.strokeRect((K.F.cx + K.bar.x) * 5, (K.F.cy + K.bar.y) * 5, K.bar.w * 5, K.bar.h * 5);
      const G = HOLO.genome; const g = Object.assign({}, G.child, { R: K.F.R, asp: K.F.asp, rot: K.F.rot, thick: K.thick, barX: K.bar.x, barY: K.bar.y, barW: K.bar.w, barH: K.bar.h }); const r = await kidRender(g, K); x.save(); x.translate(K.box.w * 5, 0); x.scale(5, 5); x.filter = 'brightness(2.2)'; x.drawImage(r.c, 0, 0); x.restore();
      const b = await c.convertToBlob({ type: 'image/png' }); out.kid = Array.from(new Uint8Array(await b.arrayBuffer())); }
    return out; }, [frames, kidFrame]);
  fs.writeFileSync(OUT + '/fit-overlay.png', Buffer.from(ov.arc)); fs.writeFileSync(OUT + '/kid-overlay.png', Buffer.from(ov.kid));
  G0.device = gd; const old = await pg.evaluate(G => { G = JSON.parse(JSON.stringify(G)); G.fit = { dx: 0, dy: 0 }; const r = score2(G); return { S: r.S, within: r.within, n: r.n, m: r.m, chk: r.chk }; }, G0); trace.beforeDirect = old;
  const dg = await pg.evaluate(G => directGenes(G, FM2, KM2), G0); trace.directGenes = dg.set;
  const direct = await pg.evaluate(G => { const r = score2(G); return { S: r.S, within: r.within, n: r.n, m: r.m, chk: r.chk, err: r.err }; }, dg.G); trace.afterDirect = direct;
  console.log('old genome S', old.S.toFixed(2), JSON.stringify(old.m), '| direct S', direct.S.toFixed(2), JSON.stringify(direct.m), JSON.stringify(direct.chk));
  let best = { G: dg.G, r: direct }, log = [];
  if (EVOLVE) { await pg.exposeFunction('onGen2', l => { if (l.gen % 5 === 0) console.log('gen', l.gen, 'S', l.S, l.within + '/' + l.of, JSON.stringify(l.m)); });
    const ev = await pg.evaluate(([G, s, ms]) => { const e = evolve2(G, s, ms, window.onGen2); const r = score2(e.best.G); return { G: e.best.G, r: { S: r.S, within: r.within, n: r.n, err: r.err, m: r.m, chk: r.chk }, log: e.log }; }, [dg.G, SEED, MAXMIN * 60000]); best = ev; log = ev.log; }
  trace.after = best.r; trace.log = log; trace.tolerances = { scored: await pg.evaluate(() => TOL2), checked: await pg.evaluate(() => CHECK2) };
  // the child's mark, verified: render with the set genes, re-measure with the same extractor
  trace.kidCheck = await pg.evaluate(async g => { const r = await kidRender(g, KM2); const L = r.L; let mx = 0; L.forEach(v => mx = Math.max(mx, v)); const pts = edgePts(L, { W: KM2.box.w, x0: 52, x1: 105, y0: 20, y1: 85, min: KM2.bg + 0.35 * (mx - KM2.bg), bg: KM2.bg }); if (pts.length < 6) return { n: pts.length }; const F = fitRot(pts, 0.5, 1.0); return { R: F.R, asp: F.asp, rot: F.rot, cx: F.cx, cy: F.cy, rms: F.rms, n: pts.length }; }, best.G.child);
  console.log('kid check', JSON.stringify(trace.kidCheck));
  // strip: film above, HOLO at the same framing below, marks at the film's measured positions
  const strip = await pg.evaluate(async ([fr, G]) => { const W = ROI.w, H = ROI.h, c = new OffscreenCanvas(W * 4, H * 2), x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, W * 4, H * 2);
    const show = [8, 30, 44, 70]; for (let k = 0; k < 4; k++) { const img = await loadImg(fr[show[k]]); x.save(); x.beginPath(); x.rect(k * W, 0, W, H); x.clip(); x.drawImage(img, -ROI.x + k * W, -ROI.y, 1280, 720); x.restore();
      const t = FM2.ser[show[k] - FM2.markOffset]; const r = renderArc2(G.arc, FM2.F, t == null ? null : t, G.fit.dx, G.fit.dy); x.drawImage(r.c, k * W, H); }
    const d = x.getImageData(0, 0, W * 4, H * 2); for (let i = 0; i < d.data.length; i += 4) for (let j = 0; j < 3; j++) d.data[i + j] = Math.min(255, d.data[i + j] * 2.2); x.putImageData(d, 0, 0);
    const b = await c.convertToBlob({ type: 'image/png' }); return Array.from(new Uint8Array(await b.arrayBuffer())); }, [frames, best.G]);
  fs.writeFileSync(OUT + '/strip-arc.png', Buffer.from(strip)); trace.strip = OUT + '/strip-arc.png (top: film, bottom: HOLO at the same framing; brightened x2.2)'; trace.overlays = [OUT + '/fit-overlay.png', OUT + '/kid-overlay.png'];
  await br.close();
  if (STRIP_ONLY) { console.log('strip written'); return; }
  // 4. write genome, inject into holo.js, write trace
  const G = best.G; G.device = gd; const gtxt = JSON.stringify(G, null, 1);
  fs.writeFileSync(path.join(HERE, 'holo-genome.json'), gtxt + '\n');
  const src = fs.readFileSync(path.join(HERE, 'holo.js'), 'utf8'); const a = src.indexOf('/*GENOME*/'), b = src.indexOf('/*END*/'); fs.writeFileSync(path.join(HERE, 'holo.js'), src.slice(0, a + 10) + JSON.stringify(G) + src.slice(b));
  trace.seconds = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(path.join(HERE, 'holo-trace.json'), JSON.stringify(trace, null, 1));
  console.log('after S', best.r.S.toFixed(2), best.r.within + '/' + best.r.n, 'in', trace.seconds, 's');
  console.log(Object.entries(best.r.err).map(([k, v]) => `${k}:${v.toFixed(2)}`).join(' '), JSON.stringify(best.r.chk));
})().catch(e => { console.error(e); process.exit(1); });
