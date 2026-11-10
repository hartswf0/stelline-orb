/* arap.js — as-rigid-as-possible surface modeling (Sorkine & Alexa 2007) for a sculpted cake.
   Runs in node (tests, planner) and in the page. Deterministic: no randomness anywhere in here.
   Coordinates: metres-ish scene units, y up, cake centred on the y axis, base at y = 0.
   Primitives kept first-class: cotangent edge weights (W), per-vertex rotations (ROT), handle regions (HANDLES),
   local-global iterations (iterate), the naive linear (Laplacian, R = I) solve for comparison (solveNaive),
   plastic commit (rest <- current), and the shape distance to a target profile (chamfer). */
(function (root) {
'use strict';
const TAU = Math.PI * 2;

/* ----------------------------------------------------------------- mesh: a closed surface of revolution */
// rings run bottom centre -> bottom rim -> up the side -> top rim -> top centre. Poles are separate vertices.
function discProfile(R0, H0) {
  const P = [];
  for (let k = 1; k <= 6; k++) P.push({ r: R0 * k / 6, y: 0, part: 'bottom' });           // bottom disc, k = 6 is the bottom rim
  for (let k = 1; k <= 7; k++) P.push({ r: R0, y: H0 * k / 8, part: 'side' });             // the side wall
  P.push({ r: R0, y: H0, part: 'rim' });                                                    // the top rim
  for (let k = 1; k <= 13; k++) P.push({ r: R0 * (1 - k / 14), y: H0, part: 'top' });       // the top, rim to centre
  return P;
}
function buildMesh(opts) {
  opts = opts || {}; const R0 = opts.R0 || .12, H0 = opts.H0 || .04, M = opts.M || 48;
  const prof = discProfile(R0, H0), NR = prof.length, n = 2 + NR * M, X = new Float64Array(n * 3);
  const id = (ring, j) => 1 + ring * M + ((j % M) + M) % M, top = n - 1;
  X[1] = 0; // bottom pole at origin
  prof.forEach((p, ring) => { for (let j = 0; j < M; j++) { const a = j / M * TAU, i = id(ring, j); X[i * 3] = Math.cos(a) * p.r; X[i * 3 + 1] = p.y; X[i * 3 + 2] = Math.sin(a) * p.r; } });
  X[top * 3 + 1] = H0;
  const F = [];
  for (let j = 0; j < M; j++) F.push(0, id(0, j), id(0, j + 1));
  for (let ring = 0; ring < NR - 1; ring++) for (let j = 0; j < M; j++) {
    const a = id(ring, j), b = id(ring, j + 1), c = id(ring + 1, j), d = id(ring + 1, j + 1);
    if ((j + ring) % 2) { F.push(a, c, d, a, d, b); } else { F.push(a, c, b, b, c, d); }        // alternate diagonals: no handedness bias under twist
  }
  for (let j = 0; j < M; j++) F.push(top, id(NR - 1, j + 1), id(NR - 1, j));
  const tri = Uint32Array.from(F);
  if (signedVolume(X, tri) < 0) for (let t = 0; t < tri.length; t += 3) { const s = tri[t + 1]; tri[t + 1] = tri[t + 2]; tri[t + 2] = s; }
  // per-vertex ring index (-1 bottom pole, NR top pole) and arclength parameter s in [0,1] from bottom centre to top centre
  const ringOf = new Int32Array(n); ringOf[0] = -1; ringOf[top] = NR; for (let r = 0; r < NR; r++) for (let j = 0; j < M; j++) ringOf[id(r, j)] = r;
  const sAt = [0]; let acc = 0, pr = { r: 0, y: 0 }; prof.forEach(p => { acc += Math.hypot(p.r - pr.r, p.y - pr.y); sAt.push(acc); pr = p; }); acc += Math.hypot(pr.r, pr.y - H0); sAt.push(acc);
  const sParam = new Float64Array(n); for (let i = 0; i < n; i++) sParam[i] = sAt[ringOf[i] + 1] / acc;
  return { n, M, NR, X, tri, prof, ringOf, sParam, id, top, R0, H0 };
}
function signedVolume(X, tri) { let v = 0; for (let t = 0; t < tri.length; t += 3) { const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
  v += X[a] * (X[b + 1] * X[c + 2] - X[b + 2] * X[c + 1]) - X[a + 1] * (X[b] * X[c + 2] - X[b + 2] * X[c]) + X[a + 2] * (X[b] * X[c + 1] - X[b + 1] * X[c]); } return v / 6; }

/* ----------------------------------------------------------------- cotangent weights, clamped to stay positive (keeps L positive definite) */
function cotWeights(mesh, X) {
  const { n, tri } = mesh, W = new Map(), key = (i, j) => i < j ? i * n + j : j * n + i;
  const add = (i, j, w) => { const k = key(i, j); W.set(k, (W.get(k) || 0) + w); };
  for (let t = 0; t < tri.length; t += 3) { const v = [tri[t], tri[t + 1], tri[t + 2]];
    for (let c = 0; c < 3; c++) { const o = v[c], i = v[(c + 1) % 3], j = v[(c + 2) % 3];
      const ax = X[i * 3] - X[o * 3], ay = X[i * 3 + 1] - X[o * 3 + 1], az = X[i * 3 + 2] - X[o * 3 + 2], bx = X[j * 3] - X[o * 3], by = X[j * 3 + 1] - X[o * 3 + 1], bz = X[j * 3 + 2] - X[o * 3 + 2];
      const dot = ax * bx + ay * by + az * bz, cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx, cr = Math.hypot(cx, cy, cz);
      add(i, j, .5 * dot / Math.max(cr, 1e-14)); } }
  const nb = Array.from({ length: n }, () => []), wt = Array.from({ length: n }, () => []); let clamped = 0;
  W.forEach((w, k) => { const i = Math.floor(k / n), j = k % n; if (w < 1e-3) { w = 1e-3; clamped++; } nb[i].push(j); wt[i].push(w); nb[j].push(i); wt[j].push(w); });
  return { nb: nb.map(a => Int32Array.from(a)), wt: wt.map(a => Float64Array.from(a)), clamped };
}

/* ----------------------------------------------------------------- 3x3 symmetric eigen (Jacobi) and the optimal rotation from a covariance */
function eigSym3(A) { // A: 9 array (row-major, symmetric); returns {d:[3], V: 9 columns are eigenvectors}
  const a = A.slice(), V = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (let sweep = 0; sweep < 30; sweep++) {
    const off = a[1] * a[1] + a[2] * a[2] + a[5] * a[5]; if (off < 1e-30) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) { const apq = a[p * 3 + q]; if (Math.abs(apq) < 1e-300) continue;
      const app = a[p * 3 + p], aqq = a[q * 3 + q], th = (aqq - app) / (2 * apq), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < 3; k++) { const akp = a[k * 3 + p], akq = a[k * 3 + q]; a[k * 3 + p] = c * akp - s * akq; a[k * 3 + q] = s * akp + c * akq; }
      for (let k = 0; k < 3; k++) { const apk = a[p * 3 + k], aqk = a[q * 3 + k]; a[p * 3 + k] = c * apk - s * aqk; a[q * 3 + k] = s * apk + c * aqk; }
      for (let k = 0; k < 3; k++) { const vkp = V[k * 3 + p], vkq = V[k * 3 + q]; V[k * 3 + p] = c * vkp - s * vkq; V[k * 3 + q] = s * vkp + c * vkq; } } }
  return { d: [a[0], a[4], a[8]], V };
}
// S = sum w e e'^T (rest e, deformed e'). Optimal R (min sum w |e' - R e|^2) = V U^T with S = U Sig V^T, det fixed to +1.
function rotFromCov(S, out, o) {
  const StS = [0, 0, 0, 0, 0, 0, 0, 0, 0]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += S[k * 3 + i] * S[k * 3 + j]; StS[i * 3 + j] = s; }
  const { d, V } = eigSym3(StS), ord = [0, 1, 2].sort((x, y) => d[y] - d[x]);
  const v = ord.map(c => [V[c], V[3 + c], V[6 + c]]);
  const sv = ord.map(c => Math.sqrt(Math.max(0, d[c])));
  const u = [];
  for (let k = 0; k < 2; k++) { const x = [0, 1, 2].map(r => S[r * 3] * v[k][0] + S[r * 3 + 1] * v[k][1] + S[r * 3 + 2] * v[k][2]); const L = Math.hypot(x[0], x[1], x[2]); u.push(L > 1e-14 * (sv[0] + 1e-300) ? x.map(q => q / L) : null); }
  if (!u[0]) { for (let k = 0; k < 9; k++) out[o + k] = k % 4 === 0 ? 1 : 0; return; }
  if (!u[1]) { const a = Math.abs(u[0][0]) < .9 ? [1, 0, 0] : [0, 1, 0], d0 = a[0] * u[0][0] + a[1] * u[0][1] + a[2] * u[0][2]; let w = a.map((q, i) => q - d0 * u[0][i]); const L = Math.hypot(...w); u[1] = w.map(q => q / L); }
  // re-orthogonalise u1 against u0 (numerical safety), u2 = u0 x u1 so U is a proper rotation
  { const d0 = u[0][0] * u[1][0] + u[0][1] * u[1][1] + u[0][2] * u[1][2]; let w = u[1].map((q, i) => q - d0 * u[0][i]); const L = Math.hypot(...w); u[1] = w.map(q => q / L); }
  u[2] = [u[0][1] * u[1][2] - u[0][2] * u[1][1], u[0][2] * u[1][0] - u[0][0] * u[1][2], u[0][0] * u[1][1] - u[0][1] * u[1][0]];
  // V must be proper too; if not, flip the axis with the smallest singular value (standard reflection fix)
  const detV = v[0][0] * (v[1][1] * v[2][2] - v[1][2] * v[2][1]) - v[0][1] * (v[1][0] * v[2][2] - v[1][2] * v[2][0]) + v[0][2] * (v[1][0] * v[2][1] - v[1][1] * v[2][0]);
  if (detV < 0) v[2] = v[2].map(q => -q);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[o + r * 3 + c] = v[0][r] * u[0][c] + v[1][r] * u[1][c] + v[2][r] * u[2][c];   // R = V U^T maps deformed->? see note
}
// note: with S = sum w e e'^T = U Sig V^T, R = V U^T is the rotation with R e ~ e'.

/* ----------------------------------------------------------------- handles: regions of rings, each with two values (knurl, tri) */
const STEP_N = .003, STEP_T = .003, STEP_TW = 3 * Math.PI / 180, STEP_SC = .003;
// region -> rings (indices into the profile) and what the two rings do to it
function handleDefs(mesh) {
  const NR = mesh.NR, top = mesh.top; // profile: 0..5 bottom (5 = bottom rim), 6..12 side, 13 rim, 14..26 top (26 nearest centre)
  return [
    { id: 'BASE', rings: [0, 1, 2, 3, 4, 5], poles: [0], knurl: 'scale', tri: 'twist', fixed: true },
    { id: 'SIDE BAND', rings: [9], knurl: 'normal', tri: 'slide' },
    { id: 'RIM', rings: [13], knurl: 'normal', tri: 'slide' },
    { id: 'TIER RING', rings: [19], knurl: 'normal', tri: 'slide' },
    { id: 'TOP CENTRE', rings: [24, 25, 26], poles: [top], knurl: 'normal', tri: 'twist' }];
}

/* ----------------------------------------------------------------- the solver */
function Solver(mesh, mode) {
  this.mesh = mesh; this.mode = mode || 'arap'; const n = mesh.n;
  this.P = Float64Array.from(mesh.X);          // rest (plastic: replaced on commit)
  this.X = Float64Array.from(mesh.X);          // current
  this.R = new Float64Array(n * 9); for (let i = 0; i < n; i++) { this.R[i * 9] = this.R[i * 9 + 4] = this.R[i * 9 + 8] = 1; }
  this.H = handleDefs(mesh).map(h => Object.assign({ k: 0, t: 0 }, h));
  this.gen = 0; this.energyLog = []; this.rebuild();
}
// which handles hold the dough: null = all of them (sculpting with every pin in), else a list of handle indices (BASE always holds)
Solver.prototype.pin = function (list) { const n = this.mesh.n; this.pinned = list; this.con = new Uint8Array(n); this.hOf = new Int16Array(n).fill(-1);
  this.H.forEach((h, hi) => { h.held = !list || hi === 0 || list.indexOf(hi) >= 0; if (h.held) for (const v of h.verts) { this.con[v] = 1; this.hOf[v] = hi; } });
  const f = []; for (let i = 0; i < n; i++) if (!this.con[i]) f.push(i); this.free = Int32Array.from(f); };
Solver.prototype.rebuild = function () {   // after a commit: new weights, normals, tangents, constraint set
  const m = this.mesh, n = m.n; this.Wt = cotWeights(m, this.P);
  this.Nrest = vertexNormals(m, this.P); this.Tan = profileTangents(m, this.P);
  this.con = new Uint8Array(n); this.hOf = new Int16Array(n).fill(-1);
  this.H.forEach((h, hi) => { const vs = []; h.rings.forEach(r => { for (let j = 0; j < m.M; j++) vs.push(m.id(r, j)); }); (h.poles || []).forEach(p => vs.push(p)); h.verts = Int32Array.from(vs); });
  this.pin(this.pinned || null);
  this.diag = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; const w = this.Wt.wt[i]; for (let k = 0; k < w.length; k++) s += w[k]; this.diag[i] = s; }
  for (let i = 0; i < n * 9; i += 9) { this.R.fill(0, i, i + 9); this.R[i] = this.R[i + 4] = this.R[i + 8] = 1; }
};
// where a handle's vertex goes for the handle's (k, t)
Solver.prototype.handlePos = function (h, v, out) {
  const P = this.P, N = this.Nrest, Tg = this.Tan; let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
  if (h.knurl === 'normal') { x += N[v * 3] * h.k * STEP_N; y += N[v * 3 + 1] * h.k * STEP_N; z += N[v * 3 + 2] * h.k * STEP_N; }
  else if (h.knurl === 'scale') { const r = Math.hypot(x, z); if (r > 1e-9) { const f = (r + h.k * STEP_SC * r / this.mesh.R0) / r; x *= f; z *= f; } }
  if (h.tri === 'slide') { x += Tg[v * 3] * h.t * STEP_T; y += Tg[v * 3 + 1] * h.t * STEP_T; z += Tg[v * 3 + 2] * h.t * STEP_T; }
  else if (h.tri === 'twist') { const a = h.t * STEP_TW, c = Math.cos(a), s = Math.sin(a), nx = c * x - s * z, nz = s * x + c * z; x = nx; z = nz; }
  out[0] = x; out[1] = y; out[2] = z;
};
Solver.prototype.applyHandles = function () { const o = [0, 0, 0]; this.H.forEach(h => { if (!h.held) return; for (const v of h.verts) { this.handlePos(h, v, o); this.X[v * 3] = o[0]; this.X[v * 3 + 1] = o[1]; this.X[v * 3 + 2] = o[2]; } }); };
Solver.prototype.setHandle = function (hi, k, t) { const h = this.H[hi]; h.k = k; h.t = t; this.applyHandles(); this.dirty = true; };

// local step: optimal rotation per vertex
Solver.prototype.localStep = function () {
  const { P, X, R } = this, n = this.mesh.n, S = new Float64Array(9);
  for (let i = 0; i < n; i++) { S.fill(0); const nb = this.Wt.nb[i], wt = this.Wt.wt[i];
    for (let k = 0; k < nb.length; k++) { const j = nb[k], w = wt[k];
      const ex = P[i * 3] - P[j * 3], ey = P[i * 3 + 1] - P[j * 3 + 1], ez = P[i * 3 + 2] - P[j * 3 + 2], fx = X[i * 3] - X[j * 3], fy = X[i * 3 + 1] - X[j * 3 + 1], fz = X[i * 3 + 2] - X[j * 3 + 2];
      S[0] += w * ex * fx; S[1] += w * ex * fy; S[2] += w * ex * fz; S[3] += w * ey * fx; S[4] += w * ey * fy; S[5] += w * ey * fz; S[6] += w * ez * fx; S[7] += w * ez * fy; S[8] += w * ez * fz; }
    rotFromCov(S, R, i * 9); }
};
// right-hand side b_i = sum_j w_ij/2 (R_i + R_j)(p_i - p_j)   (R = I for the naive solve)
Solver.prototype.rhs = function (useR) {
  const { P, R } = this, n = this.mesh.n, b = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) { const nb = this.Wt.nb[i], wt = this.Wt.wt[i]; let bx = 0, by = 0, bz = 0;
    for (let k = 0; k < nb.length; k++) { const j = nb[k], w = wt[k], ex = P[i * 3] - P[j * 3], ey = P[i * 3 + 1] - P[j * 3 + 1], ez = P[i * 3 + 2] - P[j * 3 + 2];
      if (useR) { const a = i * 9, c = j * 9;
        bx += w * .5 * ((R[a] + R[c]) * ex + (R[a + 1] + R[c + 1]) * ey + (R[a + 2] + R[c + 2]) * ez);
        by += w * .5 * ((R[a + 3] + R[c + 3]) * ex + (R[a + 4] + R[c + 4]) * ey + (R[a + 5] + R[c + 5]) * ez);
        bz += w * .5 * ((R[a + 6] + R[c + 6]) * ex + (R[a + 7] + R[c + 7]) * ey + (R[a + 8] + R[c + 8]) * ez); }
      else { bx += w * ex; by += w * ey; bz += w * ez; } }
    b[i * 3] = bx; b[i * 3 + 1] = by; b[i * 3 + 2] = bz; }
  return b;
};
// global step: L x = b on the free vertices, constrained ones moved to the right; Jacobi-preconditioned CG warm-started at the current X
// (CG from x0 never raises the quadratic objective, so the energy stays monotone even when the solve is stopped early)
Solver.prototype.globalStep = function (b, maxIt, tol) {
  const { X, con, diag, free } = this, nb = this.Wt.nb, wt = this.Wt.wt, nf = free.length; let its = 0;
  for (let c = 0; c < 3; c++) {
    const r = new Float64Array(nf), z = new Float64Array(nf), p = new Float64Array(nf), Ap = new Float64Array(nf), idx = new Int32Array(this.mesh.n).fill(-1);
    for (let f = 0; f < nf; f++) idx[free[f]] = f;
    const Lx = (vec, i) => { let s = diag[i] * vec(i); const a = nb[i], w = wt[i]; for (let k = 0; k < a.length; k++) { const j = a[k]; if (!con[j]) s -= w[k] * vec(j); } return s; };
    let bn = 0;
    for (let f = 0; f < nf; f++) { const i = free[f]; let rhs = b[i * 3 + c]; const a = nb[i], w = wt[i]; for (let k = 0; k < a.length; k++) { const j = a[k]; if (con[j]) rhs += w[k] * X[j * 3 + c]; }
      r[f] = rhs - Lx(q => X[q * 3 + c], i); bn += rhs * rhs; }
    bn = Math.sqrt(bn) || 1; let rz = 0; for (let f = 0; f < nf; f++) { z[f] = r[f] / diag[free[f]]; p[f] = z[f]; rz += r[f] * z[f]; }
    for (let it = 0; it < maxIt; it++) { let rn = 0; for (let f = 0; f < nf; f++) rn += r[f] * r[f]; if (Math.sqrt(rn) / bn < tol) break; its++;
      let pAp = 0; for (let f = 0; f < nf; f++) { const i = free[f]; Ap[f] = Lx(q => (idx[q] >= 0 ? p[idx[q]] : 0), i); pAp += p[f] * Ap[f]; }
      const al = rz / pAp; let rz2 = 0; for (let f = 0; f < nf; f++) { X[free[f] * 3 + c] += al * p[f]; r[f] -= al * Ap[f]; z[f] = r[f] / diag[free[f]]; rz2 += r[f] * z[f]; }
      const be = rz2 / rz; rz = rz2; for (let f = 0; f < nf; f++) p[f] = z[f] + be * p[f]; } }
  return its;
};
Solver.prototype.energy = function () {   // E = sum_i sum_j w_ij |(x_i - x_j) - R_i (p_i - p_j)|^2
  const { P, X, R } = this, n = this.mesh.n; let E = 0;
  for (let i = 0; i < n; i++) { const nb = this.Wt.nb[i], wt = this.Wt.wt[i], a = i * 9;
    for (let k = 0; k < nb.length; k++) { const j = nb[k], ex = P[i * 3] - P[j * 3], ey = P[i * 3 + 1] - P[j * 3 + 1], ez = P[i * 3 + 2] - P[j * 3 + 2];
      const dx = X[i * 3] - X[j * 3] - (R[a] * ex + R[a + 1] * ey + R[a + 2] * ez), dy = X[i * 3 + 1] - X[j * 3 + 1] - (R[a + 3] * ex + R[a + 4] * ey + R[a + 5] * ez), dz = X[i * 3 + 2] - X[j * 3 + 2] - (R[a + 6] * ex + R[a + 7] * ey + R[a + 8] * ez);
      E += wt[k] * (dx * dx + dy * dy + dz * dz); } }
  return E;
};
// one local-global iteration; logs E(X_k, R(X_k)) which can only go down for fixed handles
Solver.prototype.iterate = function (cgIt, tol) {
  if (this.mode === 'naive') { const b = this.rhs(false); this.globalStep(b, cgIt || 400, tol || 1e-9); this.localStep(); return this.energy(); }
  this.localStep(); const b = this.rhs(true); this.globalStep(b, cgIt || 60, tol || 1e-7); this.localStep(); const E = this.energy(); this.energyLog.push(E); return E;
};
// settle: iterate until the energy changes by less than SETTLE_REL between iterations (or SETTLE_MAX iterations)
const SETTLE_REL = 1e-5, SETTLE_MAX = 200;
Solver.prototype.settle = function () { let prev = null, k = 0, E = 0; for (; k < SETTLE_MAX; k++) { E = this.iterate(); if (prev != null && Math.abs(prev - E) <= SETTLE_REL * Math.max(prev, 1e-15)) break; prev = E; } return { E, iters: k + 1 }; };
Solver.prototype.solve = function (iters, cgIt) { let E = 0; for (let k = 0; k < (iters || 1); k++) E = this.iterate(cgIt); return E; };
// plastic commit: the current shape becomes the rest shape, handle values return to zero
Solver.prototype.commit = function () { this.P.set(this.X); this.H.forEach(h => { h.k = 0; h.t = 0; }); this.gen++; this.energyLog = []; this.rebuild(); };

/* ----------------------------------------------------------------- normals, tangents, frames */
function vertexNormals(mesh, X) { const n = mesh.n, N = new Float64Array(n * 3), tri = mesh.tri;
  for (let t = 0; t < tri.length; t += 3) { const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3, ux = X[b] - X[a], uy = X[b + 1] - X[a + 1], uz = X[b + 2] - X[a + 2], vx = X[c] - X[a], vy = X[c + 1] - X[a + 1], vz = X[c + 2] - X[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const q of [a, b, c]) { N[q] += nx; N[q + 1] += ny; N[q + 2] += nz; } }
  for (let i = 0; i < n; i++) { const L = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; N[i * 3] /= L; N[i * 3 + 1] /= L; N[i * 3 + 2] /= L; } return N; }
// tangent along the profile, pointing toward the top centre (the "along the surface" direction for slide)
function profileTangents(mesh, X) { const n = mesh.n, T = new Float64Array(n * 3), { M, NR, id } = mesh;
  for (let r = 0; r < NR; r++) for (let j = 0; j < M; j++) { const i = id(r, j), up = r < NR - 1 ? id(r + 1, j) : mesh.top, dn = r > 0 ? id(r - 1, j) : 0;
    let tx = X[up * 3] - X[dn * 3], ty = X[up * 3 + 1] - X[dn * 3 + 1], tz = X[up * 3 + 2] - X[dn * 3 + 2]; const L = Math.hypot(tx, ty, tz) || 1; T[i * 3] = tx / L; T[i * 3 + 1] = ty / L; T[i * 3 + 2] = tz / L; }
  return T; }
// the naive side's local frame: least-squares deformation gradient J (tangential stretch and shear kept, normal mapped to normal)
function linearFrame(s, i, Nr, Nd, out, o) {
  const { P, X } = s, nb = s.Wt.nb[i], wt = s.Wt.wt[i]; const A = new Float64Array(9), B = new Float64Array(9); let c = 0;
  for (let k = 0; k < nb.length; k++) { const j = nb[k], w = wt[k], e = [P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1], P[i * 3 + 2] - P[j * 3 + 2]], f = [X[i * 3] - X[j * 3], X[i * 3 + 1] - X[j * 3 + 1], X[i * 3 + 2] - X[j * 3 + 2]];
    c += w * (e[0] * e[0] + e[1] * e[1] + e[2] * e[2]); for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) { A[r * 3 + q] += w * f[r] * e[q]; B[r * 3 + q] += w * e[r] * e[q]; } }
  const nr = [Nr[i * 3], Nr[i * 3 + 1], Nr[i * 3 + 2]], nd = [Nd[i * 3], Nd[i * 3 + 1], Nd[i * 3 + 2]];
  for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) { A[r * 3 + q] += c * nd[r] * nr[q]; B[r * 3 + q] += c * nr[r] * nr[q]; }
  const Bi = inv3(B); for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) { let v = 0; for (let k = 0; k < 3; k++) v += A[r * 3 + k] * Bi[k * 3 + q]; out[o + r * 3 + q] = v; }
}
function inv3(m) { const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C, k = 1 / det;
  return [A * k, -(b * i - c * h) * k, (b * f - c * e) * k, B * k, (a * i - c * g) * k, -(a * f - c * d) * k, C * k, -(a * h - b * g) * k, (a * e - b * d) * k]; }
function mul3(A, B) { const o = new Array(9); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { let s = 0; for (let k = 0; k < 3; k++) s += A[r * 3 + k] * B[k * 3 + c]; o[r * 3 + c] = s; } return o; }
function singular3(M) { const MtM = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += M[k * 3 + i] * M[k * 3 + j]; MtM[i * 3 + j] = s; } return eigSym3(MtM).d.map(x => Math.sqrt(Math.max(0, x))).sort((a, b) => b - a); }

/* ----------------------------------------------------------------- inverted and collapsed triangles */
// a triangle is inverted when its deformed normal points against its rest normal carried by the local rotations
function invertedCount(s) { const { P, X } = s, tri = s.mesh.tri; let inv = 0, deg = 0; const R = s.R;
  for (let t = 0; t < tri.length; t += 3) { const v = [tri[t], tri[t + 1], tri[t + 2]], nr = triN(P, v), nd = triN(X, v);
    let rx = 0, ry = 0, rz = 0; for (const q of v) { const a = q * 9; rx += R[a] * nr[0] + R[a + 1] * nr[1] + R[a + 2] * nr[2]; ry += R[a + 3] * nr[0] + R[a + 4] * nr[1] + R[a + 5] * nr[2]; rz += R[a + 6] * nr[0] + R[a + 7] * nr[1] + R[a + 8] * nr[2]; }
    const ar = Math.hypot(...nr), ad = Math.hypot(...nd); if (ad < 1e-3 * ar) deg++; else if (rx * nd[0] + ry * nd[1] + rz * nd[2] < 0) inv++; }
  return { inverted: inv, collapsed: deg }; }
function triN(X, v) { const a = v[0] * 3, b = v[1] * 3, c = v[2] * 3, ux = X[b] - X[a], uy = X[b + 1] - X[a + 1], uz = X[b + 2] - X[a + 2], wx = X[c] - X[a], wy = X[c + 1] - X[a + 1], wz = X[c + 2] - X[a + 2]; return [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx]; }

/* ----------------------------------------------------------------- targets: the film's cakes as profiles (r, y), base at y = 0 */
function ellipse(r0, y0, a, b, n) { const p = []; for (let k = 0; k <= n; k++) { const t = k / n * Math.PI / 2; p.push([r0 * Math.cos(t), y0 + b * Math.sin(t)]); } return p; }
const TARGETS = [
  // from ana/index.html CAKES and the traced outline in evolve/refs.json (frame 155 s, side height about 0.39 of the width at r .12 => h about .094)
  { id: 'DRUM', name: 'CHOCOLATE, ORANGE TOP', prof: [[0, 0], [.12, 0], [.12, .094], [0, .094]], side: 0x3b2014, top: 0xd9782c, beads: 0xf2d14b, icing: 'top' },
  { id: 'DOME', name: 'BROWN DOME', prof: [[0, 0], [.12, 0], [.12, .02]].concat(ellipse(.12, .02, .12, .08, 24).slice(1)), side: 0x6a4326, top: 0x7d5230, beads: 0xe9dcc4, icing: 'all' },
  // INFERRED: the film's sponge with white beads read as two tiers (lower r .12, upper r .075); the film's own sponge is one drum about .1 high
  { id: 'TIERS', name: 'SPONGE, WHITE BEADS, TWO TIERS', prof: [[0, 0], [.12, 0], [.12, .06], [.075, .06], [.075, .105], [0, .105]], side: 0xe2c286, top: 0xf1dca9, beads: 0xf7f3ea, icing: 'top' }];
function resample(prof, step) { const out = []; for (let k = 0; k < prof.length - 1; k++) { const [r0, y0] = prof[k], [r1, y1] = prof[k + 1], L = Math.hypot(r1 - r0, y1 - y0), m = Math.max(1, Math.ceil(L / step)); for (let q = 0; q < m; q++) out.push([r0 + (r1 - r0) * q / m, y0 + (y1 - y0) * q / m, L / m]); } const l = prof[prof.length - 1]; out.push([l[0], l[1], 0]); return out; }
function distToPoly(r, y, poly) { let best = Infinity; for (let k = 0; k < poly.length - 1; k++) { const [r0, y0] = poly[k], [r1, y1] = poly[k + 1], dx = r1 - r0, dy = y1 - y0, L2 = dx * dx + dy * dy, u = L2 ? Math.max(0, Math.min(1, ((r - r0) * dx + (y - y0) * dy) / L2)) : 0, ex = r0 + u * dx - r, ey = y0 + u * dy - y, d = ex * ex + ey * ey; if (d < best) best = d; } return Math.sqrt(best); }
// our profile: the mean (r, y) of each ring, poles at r = 0
function meshProfile(s) { const m = s.mesh, X = s.X, pr = [[0, X[1]]]; for (let r = 0; r < m.NR; r++) { let rr = 0, yy = 0; for (let j = 0; j < m.M; j++) { const i = m.id(r, j); rr += Math.hypot(X[i * 3], X[i * 3 + 2]); yy += X[i * 3 + 1]; } pr.push([rr / m.M, yy / m.M]); } pr.push([0, X[m.top * 3 + 1]]); return pr; }
// symmetric Chamfer (mean of the two directed means, area-weighted by r) and Hausdorff, on surfaces of revolution, in metres
function chamfer(s, target) {
  const ours = resample(meshProfile(s), .002), theirs = resample(target.prof, .002), ourPoly = meshProfile(s);
  let a = 0, aw = 0, ha = 0; for (const [r, y, l] of ours) { const d = distToPoly(r, y, target.prof), w = (r + .01) * (l || .001); a += d * w; aw += w; ha = Math.max(ha, d); }
  let b = 0, bw = 0, hb = 0; for (const [r, y, l] of theirs) { const d = distToPoly(r, y, ourPoly), w = (r + .01) * (l || .001); b += d * w; bw += w; hb = Math.max(hb, d); }
  return { chamfer: .5 * (a / aw + b / bw), hausdorff: Math.max(ha, hb) };
}
// brute-force 3D check of the same quantity (used by the tests to confirm the profile shortcut)
function targetPoints(target, M) { const pts = []; for (const [r, y] of resample(target.prof, .002)) for (let j = 0; j < M; j++) { const a = j / M * TAU; pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); } return pts; }
function hausdorff3D(s, target, M) { const tp = targetPoints(target, M || 96), X = s.X, n = s.mesh.n; let h1 = 0;
  for (let i = 0; i < n; i++) { let b = Infinity; for (const p of tp) { const d = (X[i * 3] - p[0]) ** 2 + (X[i * 3 + 1] - p[1]) ** 2 + (X[i * 3 + 2] - p[2]) ** 2; if (d < b) b = d; } h1 = Math.max(h1, Math.sqrt(b)); } return h1; }

// the sharpest turn along the profile (degrees): a fold of the dough back on itself shows as a turn near 180
function foldAngle(s) { const p = meshProfile(s); let worst = 0; for (let k = 1; k < p.length - 1; k++) { const ax = p[k][0] - p[k - 1][0], ay = p[k][1] - p[k - 1][1], bx = p[k + 1][0] - p[k][0], by = p[k + 1][1] - p[k][1], la = Math.hypot(ax, ay), lb = Math.hypot(bx, by); if (la < 1e-6 || lb < 1e-6) continue;
  worst = Math.max(worst, Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))) * 180 / Math.PI); } return worst; }
const FOLD_MAX = 100;
const TOL = { chamfer: .002, hausdorff: .008 };   // 2 mm mean, 8 mm worst, on a cake 240 mm across
const API = { buildMesh, cotWeights, Solver, rotFromCov, eigSym3, vertexNormals, linearFrame, mul3, singular3, inv3, invertedCount, TARGETS, chamfer, hausdorff3D, meshProfile, TOL, foldAngle, FOLD_MAX, SETTLE_REL, SETTLE_MAX, STEP_N, STEP_T, STEP_TW, signedVolume };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ARAP = API;
})(typeof self !== 'undefined' ? self : this);
