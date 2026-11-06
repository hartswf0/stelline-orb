/* plan.js — searches for a short sequence of handle moves (integer detents, as the device sets them) that sculpts the plain disc
   into each target within tolerance, with a plastic commit (HOLD) between generations. The result feeds the SCENE autoplay
   and the proof recording; a person playing finds their own moves. Usage: node plan.js  -> plan.json */
'use strict';
const A = require('./arap.js'), fs = require('fs');
const score = c => c.chamfer + .5 * c.hausdorff + (c.fold > A.FOLD_MAX ? 1 : 0);
function evalAt(s, hi, k, t, T, its) { const h = s.H[hi], ok = h.k, ot = h.t, keep = Float64Array.from(s.X); s.setHandle(hi, k, t); s.solve(its || 8); const c = A.chamfer(s, T); c.fold = A.foldAngle(s); s.X.set(keep); s.setHandle(hi, ok, ot); return c; }
function planFor(T, gens, first) {
  const s = new A.Solver(A.buildMesh(), 'arap'), moves = []; let best = A.chamfer(s, T); best.fold = A.foldAngle(s);
  for (let g = 0; g < gens; g++) {
    if (g === 0 && first) { first.forEach(([hi, k, t]) => s.setHandle(hi, k, t)); s.settle(); best = A.chamfer(s, T); moves.push({ gen: 0, set: first, chamfer: best.chamfer, hausdorff: best.hausdorff, by: 'hand: raise the centre and the tier ring' }); console.log(T.id, 'gen 0 (given)', (best.chamfer * 1000).toFixed(2), (best.hausdorff * 1000).toFixed(2)); s.commit(); continue; }
    for (let round = 0; round < 3; round++) { let improved = false;
      for (let hi = 1; hi < s.H.length; hi++) for (const which of ['k', 't']) { if (which === 't' && s.H[hi].tri === 'twist') continue; for (const d of [8, 4, 2, 1]) for (const sg of [1, -1]) {
        const h = s.H[hi], k = which === 'k' ? h.k + sg * d : h.k, t = which === 't' ? h.t + sg * d : h.t; if (k < -12 || k > 24 || t < -12 || t > 12) continue;
        const c = evalAt(s, hi, k, t, T); if (score(c) < score(best) - 1e-5) { s.setHandle(hi, k, t); s.settle(); best = A.chamfer(s, T); best.fold = A.foldAngle(s); improved = true; } } }
      if (!improved) break; }
    s.settle(); best = A.chamfer(s, T); best.fold = A.foldAngle(s);
    const set = s.H.map((h, i) => [i, h.k, h.t]).filter(([, k, t]) => k || t); moves.push({ gen: g, set, chamfer: best.chamfer, hausdorff: best.hausdorff, foldDeg: best.fold });
    console.log(T.id, 'gen', g, JSON.stringify(set), (best.chamfer * 1000).toFixed(2), (best.hausdorff * 1000).toFixed(2), 'fold', best.fold.toFixed(0), A.invertedCount(s));
    s.commit(); if (best.chamfer < A.TOL.chamfer * .8 && best.hausdorff < A.TOL.hausdorff * .8) break; }
  return { target: T.id, moves, final: best };
}
const out = {}; for (const T of A.TARGETS.filter(t => !process.argv[3] || t.id === process.argv[3])) { const t0 = Date.now(); out[T.id] = planFor(T, +(process.argv[2] || 4), T.id === 'DOME' ? [[4, 20, 0], [3, 12, 0]] : null); console.log(T.id, 'secs', (Date.now() - t0) / 1000); }
const prev = fs.existsSync(__dirname + '/plan.json') ? JSON.parse(fs.readFileSync(__dirname + '/plan.json')) : {}; fs.writeFileSync(__dirname + '/plan.json', JSON.stringify(Object.assign(prev, out), null, 1));
