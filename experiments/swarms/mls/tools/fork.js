// Branch A (dense) vs branch B (sparse) face: the critic's round-1 repair condition, feature integrity, folds, and the breath.
// node tools/fork.js  -> prints JSON, writes fork.json
const path = require('path'), fs = require('fs'), DIR = path.join(__dirname, '..');
const MLS = require(path.join(DIR, 'mls.js')), S = require(path.join(DIR, 'scene.js'));
const ell = (cx, cy, rx, ry, n) => { const a = []; for (let k = 0; k < n; k++) a.push(cx + rx * Math.cos(2 * Math.PI * k / n), cy + ry * Math.sin(2 * Math.PI * k / n)); return a; };
const area = a => { let s = 0; const n = a.length / 2; for (let k = 0; k < n; k++) { const j = (k + 1) % n; s += a[2 * k] * a[2 * j + 1] - a[2 * j] * a[2 * k + 1]; } return Math.abs(s) / 2; };
const span = (a, ax) => { let lo = 1e9, hi = -1e9; for (let i = ax; i < a.length; i += 2) { lo = Math.min(lo, a[i]); hi = Math.max(hi, a[i]); } return hi - lo; };
const B = [], N = [], CL = [];
for (let k = 0; k <= 40; k++) { const u = k / 40; B.push(128 + 344 * u, 28, 128 + 344 * u, 442, 128, 28 + 414 * u, 472, 28 + 414 * u); }
for (let y = 402; y <= 446; y += 4) for (let x = 256; x <= 344; x += 8) N.push(x, y);
for (let k = 0; k <= 24; k++) { const v = -.1 + .6 * k / 24, y = 262 + 150 * v, u = Math.sqrt(1 - v * v) / (1 + .22 * Math.max(0, v)); CL.push(300 - 112 * u, y, 300 + 112 * u, y); }
const FEAT = { eyeL: ell(254, 217, 22, 8, 24), eyeR: ell(346, 217, 22, 8, 24), nose: [300, 240, 284, 288, 300, 292, 316, 288] };
const out = {};
for (const set of ['dense', 'sparse']) {
  S.setFaceSet(set); const H = S.buildHandles(), F = S.SURF.face, m = MLS.grid(...F.rect, ...F.grid);
  const state = f => ({ face: f, curl: 0, lift: 0, t: 0, flames: S.CANDLES.map(() => ({ W: 0, dir: 0, lit: 1, size: 1 })) });
  const st = state({ fill: 1, purse: .6, open: 0, aim: 0, smile: 0 }), T = S.targets(H, st), h = S.pack(H, T, 'face'), r = { handles: { points: H.filter(x => x.surf === 'face' && x.kind === 'p').length, segments: H.filter(x => x.surf === 'face' && x.kind === 'l').length }, fam: {} };
  const sol = {};
  for (const fam of S.FAMILIES) {
    const f = a => MLS.solve(h, Float64Array.from(a), new Float64Array(a.length), fam, 1), b = f(B), n = f(N), c = f(CL); sol[fam] = c;
    let mb = 0, mn = 0, mo = 0; for (let i = 0; i < B.length; i += 2) mb = Math.max(mb, Math.hypot(b[i] - B[i], b[i + 1] - B[i + 1])); for (let i = 0; i < N.length; i += 2) mn = Math.max(mn, Math.hypot(n[i] - N[i], n[i + 1] - N[i + 1]));
    for (let i = 0; i < CL.length; i += 2) mo = Math.max(mo, Math.abs(c[i] - CL[i]));
    const feat = {}; for (const [k, a] of Object.entries(FEAT)) { const d = f(a); feat[k] = { area_ratio: +(area(d) / area(a)).toFixed(3), width_ratio: +(span(d, 0) / span(a, 0)).toFixed(3), height_ratio: +(span(d, 1) / span(a, 1)).toFixed(3) }; }
    // folds over the game's states: rest, full, full+purse, blow at both aims, smile
    let minJ = 9, folds = 0;
    for (const fs of [{ fill: 1, purse: .6, open: 0, aim: 0 }, { fill: 1, purse: 1, open: 0, aim: 0 }, { fill: .85, purse: 1, open: 1, aim: 24 }, { fill: .85, purse: 0, open: 1, aim: -24 }, { fill: 0, purse: .3, open: 0, aim: 8, smile: 1 }, { fill: 1, purse: 0, open: 0, aim: 0 }]) {
      const T2 = S.targets(H, state(Object.assign({ smile: 0 }, fs))), d = MLS.solve(S.pack(H, T2, 'face'), m.verts, new Float64Array(m.verts.length), fam, 1), J = MLS.jacobians(m.verts, d, m.idx);
      for (const v of J) { minJ = Math.min(minJ, v); if (v <= 0) folds++; } }
    const pre = S.measureFace(MLS, H, { fill: 1, purse: .6, open: 0, aim: 0 }, fam, 1);
    r.fam[fam] = { plate_border_px: +mb.toFixed(3), neck_px: +mn.toFixed(3), cheek_outline_out_px: +mo.toFixed(2), features: feat, min_jacobian: +minJ.toFixed(3), folded_triangles: folds, cheek_disc_gain: +pre.cheek.toFixed(3) };
  }
  let dc = 0, at = null; for (const a of S.FAMILIES) for (const b of S.FAMILIES) if (a < b) for (let i = 0; i < CL.length; i += 2) { const d = Math.hypot(sol[a][i] - sol[b][i], sol[a][i + 1] - sol[b][i + 1]); if (d > dc) { dc = d; at = [a, b, +CL[i].toFixed(0), +CL[i + 1].toFixed(0)]; } }
  r.cheek_outline_family_diff_px = +dc.toFixed(2); r.at = at;
  const ch = F.family; r.repair_condition = { locality_ok: r.fam[ch].plate_border_px <= 1 && r.fam[ch].neck_px <= 1, divergence_ok: dc >= 4, chosen_no_folds: r.fam[ch].folded_triangles === 0 };
  out[set] = r;
}
S.setFaceSet('dense');
fs.writeFileSync(path.join(DIR, 'fork.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
