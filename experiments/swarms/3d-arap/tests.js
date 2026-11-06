/* tests.js — node tests for the declared invariants of the ARAP cake solver.  Usage: node tests.js */
'use strict';
const A = require('./arap.js');
let pass = 0, fail = 0; const ok = (c, name, info) => { if (c) pass++; else fail++; console.log((c ? 'PASS ' : 'FAIL ') + name + (info != null ? '  ' + info : '')); };
const mesh = A.buildMesh();

// 1. the mesh is a closed, consistently oriented surface (Euler characteristic 2, positive volume)
{ const E = new Set(); for (let t = 0; t < mesh.tri.length; t += 3) for (let k = 0; k < 3; k++) { const a = mesh.tri[t + k], b = mesh.tri[t + (k + 1) % 3]; E.add(Math.min(a, b) + ',' + Math.max(a, b)); }
  const chi = mesh.n - E.size + mesh.tri.length / 3; ok(chi === 2, 'closed surface, V - E + F = 2', chi); ok(A.signedVolume(mesh.X, mesh.tri) > 0, 'outward orientation (positive volume)'); }

// 2. the local step recovers a known rotation and always returns a proper rotation
{ let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1; let worstErr = 0, worstDet = 0, worstOrth = 0;
  for (let trial = 0; trial < 200; trial++) { const ax = [rnd(), rnd(), rnd()], L = Math.hypot(...ax), th = rnd() * Math.PI, c = Math.cos(th), s = Math.sin(th), [x, y, z] = ax.map(q => q / L);
    const Rt = [c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s, y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s, z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)];
    const S = new Array(9).fill(0); const planar = trial % 2 === 0;   // half the trials with a flat neighbourhood (rank-2 covariance), as on a surface
    for (let k = 0; k < 6; k++) { const e = [rnd(), rnd(), planar ? 0 : rnd()], f = [0, 1, 2].map(r => Rt[r * 3] * e[0] + Rt[r * 3 + 1] * e[1] + Rt[r * 3 + 2] * e[2]); for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) S[r * 3 + q] += e[r] * f[q]; }
    const R = new Float64Array(9); A.rotFromCov(S, R, 0); let err = 0; for (let k = 0; k < 9; k++) err = Math.max(err, Math.abs(R[k] - Rt[k])); worstErr = Math.max(worstErr, err);
    const det = R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]); worstDet = Math.max(worstDet, Math.abs(det - 1));
    const sv = A.singular3(Array.from(R)); worstOrth = Math.max(worstOrth, Math.abs(sv[0] - 1), Math.abs(sv[2] - 1));
    // a random (non-rigid) covariance still gives a proper rotation
    const S2 = Array.from({ length: 9 }, rnd); A.rotFromCov(S2, R, 0); const d2 = R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]); worstDet = Math.max(worstDet, Math.abs(d2 - 1)); }
  ok(worstErr < 1e-8, 'local step recovers the true rotation (200 trials, half planar)', worstErr.toExponential(2)); ok(worstDet < 1e-9, 'local step: det R = +1 always', worstDet.toExponential(2)); ok(worstOrth < 1e-9, 'local step: R orthonormal', worstOrth.toExponential(2)); }

// 3. rest shape is a fixed point with zero energy; a rigid motion of every handle costs nothing
{ const s = new A.Solver(mesh, 'arap'); const E = s.solve(3); ok(E < 1e-20, 'rest shape: energy 0', E.toExponential(2));
  s.setHandle(0, 0, 4); s.setHandle(1, 0, 0); // twist the base 12 deg with every other handle fixed is NOT rigid; instead twist all handles alike via a free twist test:
  const r = new A.Solver(mesh, 'arap'); r.pin([0]); r.setHandle(0, 0, 6); const st = r.settle(); ok(st.E < 1e-10, 'base twisted with nothing else held: the cake turns rigidly (energy ~ 0)', st.E.toExponential(2)); }

// 4. ARAP energy never rises within a settle, across many handle settings, both pinning modes
{ let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; let rises = 0, iters = 0, worstRise = 0;
  for (let trial = 0; trial < 12; trial++) { const s = new A.Solver(mesh, 'arap'); if (trial % 3 === 2) s.pin([1 + Math.floor(rnd() * 4)]);
    for (let hi = 1; hi < 5; hi++) s.setHandle(hi, Math.round(rnd() * 30 - 8), Math.round(rnd() * 16 - 8));
    let prev = null; for (let k = 0; k < 40; k++) { const E = s.iterate(); iters++; if (prev != null && E > prev * (1 + 1e-12)) { rises++; worstRise = Math.max(worstRise, (E - prev) / prev); } prev = E; } }
  ok(rises === 0, `ARAP energy non-increasing per iteration (12 random handle sets, ${iters} iterations)`, rises + ' rises, worst ' + worstRise.toExponential(2)); }

// 5. the dome plan (the SCENE / proof moves) reaches the brown dome within tolerance, with no inverted or collapsed triangles and no fold
const plan = [[[4, 20, 0], [3, 12, 0]], [[2, 0, 2], [1, 0, 3], [3, 3, 0]]], DOME = A.TARGETS.find(t => t.id === 'DOME');
function runPlan(mode) { const s = new A.Solver(mesh, mode || 'arap'), log = []; for (const gen of plan) { gen.forEach(([h, k, t]) => s.setHandle(h, k, t)); mode === 'naive' ? s.solve(2) : s.settle(); const c = A.chamfer(s, DOME); log.push({ c, inv: A.invertedCount(s), fold: A.foldAngle(s) }); s.commit(); } return { s, log }; }
{ const { log } = runPlan(); const last = log[log.length - 1];
  ok(log[0].c.chamfer > A.TOL.chamfer, 'generation 1 is not yet the dome (the evolution has a step)', (log[0].c.chamfer * 1000).toFixed(2) + ' mm');
  ok(last.c.chamfer <= A.TOL.chamfer && last.c.hausdorff <= A.TOL.hausdorff, 'generation 2 within tolerance of the brown dome', `${(last.c.chamfer * 1000).toFixed(2)} mm mean, ${(last.c.hausdorff * 1000).toFixed(2)} mm worst (need ${A.TOL.chamfer * 1000} / ${A.TOL.hausdorff * 1000})`);
  ok(log.every(l => l.inv.inverted === 0 && l.inv.collapsed === 0), 'no inverted or collapsed triangles in any generation', JSON.stringify(log.map(l => l.inv)));
  ok(log.every(l => l.fold <= A.FOLD_MAX), 'no fold in the profile', log.map(l => l.fold.toFixed(1)).join(', ') + ' deg (max ' + A.FOLD_MAX + ')'); }

// 6. determinism: the same moves give bit-identical shapes
{ const a = runPlan().s.X, b = runPlan().s.X; let same = true; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; } ok(same, 'deterministic: two runs bit-identical'); }

// 7. the profile shortcut for distance agrees with a brute-force 3D nearest-point check
{ const { s } = runPlan(); const pr = A.chamfer(s, DOME), h3 = A.hausdorff3D(s, DOME, 384);
  // hausdorff3D is one-directional (our points -> target); the profile Hausdorff is >= it, and for these shapes the worst point is on our side
  ok(h3 <= pr.hausdorff + 1e-3, 'profile Hausdorff bounds the 3D one-directional distance', `3D ${(h3 * 1000).toFixed(2)} mm vs profile ${(pr.hausdorff * 1000).toFixed(2)} mm`); }

// 8. details: a bead's frame under ARAP stays a rotation (its own shape); under the naive linear map it shears, for the same twist
{ const sa = new A.Solver(mesh, 'arap'), sn = new A.Solver(mesh, 'naive'); for (const s of [sa, sn]) { plan.forEach(gen => { gen.forEach(([h, k, t]) => s.setHandle(h, k, t)); s.settle(); s.commit(); }); s.pin([4]); s.setHandle(4, 0, 8); s.settle(); }
  const Nd = A.vertexNormals(mesh, sn.X), F = new Array(9); let wa = 0, wn = 0; const ring = 19;
  for (let j = 0; j < mesh.M; j++) { const v = mesh.id(ring, j); const Ra = Array.from(sa.R.subarray(v * 9, v * 9 + 9)), sva = A.singular3(Ra); wa = Math.max(wa, Math.abs(sva[0] - 1), Math.abs(sva[2] - 1));
    A.linearFrame(sn, v, sn.Nrest, Nd, F, 0); const svn = A.singular3(F); wn = Math.max(wn, Math.abs(svn[0] - 1), Math.abs(svn[2] - 1)); }
  ok(wa < 1e-9, 'beads on the tier ring keep their shape under ARAP (24 deg twist of the top)', wa.toExponential(2)); ok(wn > .02, 'the naive linear map distorts the same beads (the comparison has teeth)', wn.toFixed(4));
  ok(A.invertedCount(sa).inverted === 0, 'no inverted triangles after the twist'); }

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
