// Numerical tests for THE BLOW. node tools/test.js  -> prints a summary, writes tests.json and handles.json
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..');
const MLS = require(path.join(DIR, 'mls.js')), S = require(path.join(DIR, 'scene.js')), { Game, DEMO } = require(path.join(DIR, 'game.js'));
const H = S.buildHandles(), F = S.SURF, FAMS = S.FAMILIES, R = {};
const meshes = { face: MLS.grid(...F.face.rect, ...F.face.grid), paper: MLS.grid(...F.paper.rect, ...F.paper.grid),
  flames: S.CANDLES.map(cd => MLS.grid(cd.x + F.flame.rect[0], cd.y + F.flame.rect[1], F.flame.rect[2], F.flame.rect[3], ...F.flame.grid)) };

// contours: the outlines a viewer follows (sampled in rest coords)
function ell(cx, cy, rx, ry, n) { const a = []; for (let k = 0; k < n; k++) a.push(cx + rx * Math.cos(2 * Math.PI * k / n), cy + ry * Math.sin(2 * Math.PI * k / n)); return Float64Array.from(a); }
const CONT = { face: Float64Array.from([...ell(300, 262, 116, 150, 64), ...ell(300, 331, 28, 4, 24), ...ell(254, 217, 22, 8, 16), ...ell(346, 217, 22, 8, 16)]),
  paper: (() => { const a = []; for (let k = 0; k <= 110; k++) { a.push(25 + 5 * k, S.PAPER_Y - 18, 25 + 5 * k, S.PAPER_Y + 18); } return Float64Array.from(a); })(),
  flame: i => { const cd = S.CANDLES[i], a = []; for (let k = 0; k <= 20; k++) { const y = -90 + 90 * k / 20, w = 10 * Math.sin(Math.PI * k / 20); a.push(cd.x - w, cd.y + y, cd.x + w, cd.y + y); } return Float64Array.from(a); } };

function solveSurf(T, surf, fam, verts, inst) { return MLS.solve(S.pack(H, T, surf, inst), verts, new Float64Array(verts.length), fam, 1); }

// ---------------------------------------------------------------- run the demo at 30 fps, recording each world's state per frame
const G = new Game(); G.playScript(); const frames = [];
for (let f = 0; f < 300; f++) { G.update(1 / 30); frames.push(G.worlds.map((w, wi) => G.worldState(wi))); }
R.demo = { result: G.result, lit: Object.fromEntries(G.worlds.map(w => [w.name, w.lit.reduce((a, b) => a + b, 0)])), events: G.log.filter(e => !['step', 'detent'].includes(e.kind)).map(e => [+e.t.toFixed(3), e.kind, e.i]) };

// extreme states (every ring at its end stop, a full breath at peak, both aims)
const EXT = [];
for (const aim of [-24, 24]) for (const purse of [0, 1]) EXT.push({ face: { fill: 1, purse, open: 1, aim, smile: 0 }, curl: 1, lift: 24, t: 3.3, flames: S.CANDLES.map((cd, i) => ({ W: 1.3, dir: Math.atan2(cd.x - 300, cd.y - 331), lit: 1, size: 1.24 })) });

// ---------------------------------------------------------------- 1 + 2: landmarks hit targets, no fold-overs
const lm = {}, jac = {};
for (const fam of FAMS) {
  let ePt = 0, eNear = 0, eLine = 0; const J = { face: [1e9, 0], paper: [1e9, 0], flame: [1e9, 0] };
  const states = frames.filter((_, k) => k % 3 === 0).map(fr => fr[0]).concat(EXT);
  for (const st of states) {
    const T = S.targets(H, st);
    for (const surf of ['face', 'paper', 'flame']) {
      const insts = surf === 'flame' ? [0, 1, 2, 3, 4, 5, 6] : [null];
      for (const inst of insts) {
        const hs = H.filter(h => h.surf === surf && (inst == null || h.inst === inst));
        // point handles: exactly at the handle, and 0.25 px away
        const pts = [], near = [], mids = [];
        for (const h of hs) if (h.kind === 'p') { pts.push(...h.rest); near.push(h.rest[0] + .25, h.rest[1]); } else mids.push((h.rest[0] + h.rest[2]) / 2, (h.rest[1] + h.rest[3]) / 2, h.rest[0] * .75 + h.rest[2] * .25, h.rest[1] * .75 + h.rest[3] * .25);
        const fp = solveSurf(T, surf, fam, Float64Array.from(pts), inst), fn = solveSurf(T, surf, fam, Float64Array.from(near), inst), fm = solveSurf(T, surf, fam, Float64Array.from(mids), inst);
        let k = 0, m = 0; for (const h of hs) { if (h.kind === 'p') { const q = T[h.id]; ePt = Math.max(ePt, Math.hypot(fp[2 * k] - q[0], fp[2 * k + 1] - q[1])); eNear = Math.max(eNear, Math.hypot(fn[2 * k] - q[0] - .25, fn[2 * k + 1] - q[1]) - .25 * 2); k++; }
          else { const q = T[h.id]; eLine = Math.max(eLine, Math.hypot(fm[2 * m] - (q[0] + q[2]) / 2, fm[2 * m + 1] - (q[1] + q[3]) / 2), Math.hypot(fm[2 * m + 2] - (q[0] * .75 + q[2] * .25), fm[2 * m + 3] - (q[1] * .75 + q[3] * .25))); m += 2; } }
        const mesh = surf === 'flame' ? meshes.flames[inst] : meshes[surf], d = solveSurf(T, surf, fam, mesh.verts, inst), jj = MLS.jacobians(mesh.verts, d, mesh.idx);
        for (const v of jj) { if (v < J[surf][0]) J[surf][0] = v; if (v <= 0) J[surf][1]++; }
      }
    }
  }
  lm[fam] = { point_exact_px: +ePt.toFixed(4), point_0p25_away_excess_px: +Math.max(0, eNear).toFixed(3), line_samples_px: +eLine.toFixed(3) };
  jac[fam] = Object.fromEntries(Object.entries(J).map(([k, v]) => [k, { min_jacobian: +v[0].toFixed(3), folded_triangles: v[1] }]));
}
R.landmarks = lm; R.foldovers = jac; R.foldover_states = 'every 3rd demo frame (100 states) of the player world inputs + 4 extreme states (all rings at end stops, full breath at peak, flames 124%)';

// ---------------------------------------------------------------- 3: contour stability frame to frame (second difference, contour vs its own handles)
const stab = {};
for (const fam of FAMS) {
  const out = {};
  for (const surf of ['face', 'paper', 'flame']) {
    const insts = surf === 'flame' ? [0, 1, 2, 3, 4, 5, 6] : [null]; let ratio = 0, cmax = 0, hmax = 0, rev = 0, hrev = 0;
    for (const inst of insts) {
      const C = surf === 'flame' ? CONT.flame(inst) : CONT[surf], hs = H.filter(h => h.surf === surf && (inst == null || h.inst === inst));
      const Cs = [], Hs = [];
      for (const fr of frames) { const st = fr[0], T = S.targets(H, st); Cs.push(solveSurf(T, surf, fam, C, inst)); const hv = []; for (const h of hs) hv.push(...T[h.id]); Hs.push(hv); }
      for (let t = 1; t < frames.length - 1; t++) {
        let ca = 0, ha = 0;
        for (let j = 0; j < C.length; j++) ca = Math.max(ca, Math.abs(Cs[t + 1][j] - 2 * Cs[t][j] + Cs[t - 1][j]));
        for (let j = 0; j < Hs[t].length; j++) ha = Math.max(ha, Math.abs(Hs[t + 1][j] - 2 * Hs[t][j] + Hs[t - 1][j]));
        cmax = Math.max(cmax, ca); hmax = Math.max(hmax, ha);
        // reversal: a contour point whose velocity flips sign with |v| > 0.5 px on both sides while no handle flips
        let cr = 0, hr = 0; if (t > 1) { for (let j = 0; j < C.length; j++) { const v0 = Cs[t][j] - Cs[t - 1][j], v1 = Cs[t + 1][j] - Cs[t][j]; if (v0 * v1 < 0 && Math.abs(v0) > .5 && Math.abs(v1) > .5) cr++; }
          for (let j = 0; j < Hs[t].length; j++) { const v0 = Hs[t][j] - Hs[t - 1][j], v1 = Hs[t + 1][j] - Hs[t][j]; if (v0 * v1 < 0 && Math.abs(v0) > .5 && Math.abs(v1) > .5) hr++; } }
        if (cr && !hr) rev++; if (hr) hrev++;
      }
    }
    out[surf] = { max_contour_accel_px: +cmax.toFixed(2), max_handle_accel_px: +hmax.toFixed(2), ratio: +(cmax / Math.max(hmax, 1e-9)).toFixed(3), frames_with_contour_reversal_but_no_handle_reversal: rev };
  }
  stab[fam] = out;
}
R.contour_stability = stab;

// ---------------------------------------------------------------- 4: what each family can do with the breath (the game's coupling)
const best = {};
for (const fam of FAMS) { let b = { out: 0 };
  for (let p = 0; p <= 10; p++) for (let a = -2; a <= 2; a++) { const pre = S.measureFace(MLS, H, { fill: 1, purse: p / 10, open: 0, aim: a * 4 }, fam, 1), op = S.measureFace(MLS, H, { fill: .85, purse: p / 10, open: 1, aim: a * 4 }, fam, 1);
    const pl = S.breathPlan({ cheek: pre.cheek, mouth: op.mouth, width: op.width }, a * 4), n = pl.filter(q => q.s >= 1).length; if (n > b.out) b = { out: n, purse: p, aim: a * 4, cheek_gain: +pre.cheek.toFixed(4), mouth_px2: +op.mouth.toFixed(1) }; }
  best[fam] = b; }
R.best_single_breath = best;

// ---------------------------------------------------------------- 5: machine rate and solve time
{ const g = new Game(); g.select(1, true); const ring = g.RINGS[1]; g.handTurn(ring, 5 * ring.deg); const ts = []; g.emit = e => { if (e.kind === 'step') ts.push(e.t); };
  for (let k = 0; k < 6000 && ts.length < 5; k++) g.update(1 / 1200); const d = ts.slice(1).map((t, i) => t - ts[i]); R.machine_step_interval_s = d.map(x => +x.toFixed(4)); R.machine_rate_hz = +(1 / (d.reduce((a, b) => a + b, 0) / d.length)).toFixed(2); }
{ const st = frames[140][0], T = S.targets(H, st), t0 = process.hrtime.bigint(); const N = 20;
  for (let k = 0; k < N; k++) { solveSurf(T, 'face', 'similarity', meshes.face.verts); solveSurf(T, 'paper', 'rigid', meshes.paper.verts); meshes.flames.forEach((m, i) => solveSurf(T, 'flame', 'affine', m.verts, i)); }
  R.solve_ms_per_world_frame = +(Number(process.hrtime.bigint() - t0) / 1e6 / N).toFixed(2);
  R.vertex_counts = { face: meshes.face.verts.length / 2, paper: meshes.paper.verts.length / 2, flames: 7 * meshes.flames[0].verts.length / 2 }; }
R.handles = { points: H.filter(h => h.kind === 'p').length, lines: H.filter(h => h.kind === 'l').length, by_surface: { face: H.filter(h => h.surf === 'face').length, flame: H.filter(h => h.surf === 'flame').length, paper: H.filter(h => h.surf === 'paper').length } };

// ---------------------------------------------------------------- verdicts (tolerances stated here)
const chosen = { face: F.face.family, paper: F.paper.family, flame: F.flame.family };
const checks = [
  ['point handles hit their targets exactly (< 0.001 px), every family', FAMS.every(f => lm[f].point_exact_px < 1e-3)],
  ['line handles: segment samples land within 1.0 px of the target segment (numerical integration), every family', FAMS.every(f => lm[f].line_samples_px < 1.0)],
  ['no fold-overs in the chosen family of each surface (demo + extremes)', Object.entries(chosen).every(([s, f]) => jac[f][s].folded_triangles === 0)],
  ['contours never reverse where their handles do not, chosen families', Object.entries(chosen).every(([s, f]) => stab[f][s].frames_with_contour_reversal_but_no_handle_reversal === 0)],
  ['contour acceleration at most 1.5x the handles\' own, chosen families', Object.entries(chosen).every(([s, f]) => stab[f][s].ratio <= 1.5)],
  ['machine steps at 11.8/s (within 1%)', Math.abs(R.machine_rate_hz - 11.8) / 11.8 < .01],
  ['the demo ends with all seven out', R.demo.lit.YOURS === 0],
  ['only the chosen face family can put out all seven in one breath', best.similarity.out === 7 && best.affine.out < 7 && best.rigid.out < 7],
];
R.checks = checks.map(([name, ok]) => ({ name, ok }));
fs.writeFileSync(path.join(DIR, 'tests.json'), JSON.stringify(R, null, 1));
// the handle set
fs.writeFileSync(path.join(DIR, 'handles.json'), JSON.stringify({ about: 'THE BLOW handle set. Scene px, 600 x 1000 page, y down. Points are [x,y]; segments [ax,ay,bx,by]. Poses are offsets at full amount; the game scales CHEEKS by fill, PURSE by purse, OPEN by the breath. Flame and streamer handles are driven by the breath and the WRAP ring (see scene.js).',
  families: Object.fromEntries(Object.entries(F).map(([k, v]) => [k, { family: v.family, why: v.why, mesh: { rect: v.rect, grid: v.grid } }])), alpha: 1, line_weight_unit_px: MLS.LINE_UNIT,
  handles: H.map(h => ({ id: h.id, surface: h.surf, kind: h.kind === 'p' ? 'point' : 'segment', rest: h.rest.map(v => +v.toFixed(2)), anchor: !!h.anchor })), poses: S.POSES, breath: S.BREATH, groups: { STREAMER: 'surface paper', CHEEKS: 'cheek|jaw|ala|brow|lower lids', LIPS: 'mouth|lip', FLAMES: 'flame tips and sides' } }, null, 1));
console.log(JSON.stringify({ landmarks: lm, foldovers: jac, contour_stability: stab, best_single_breath: best, machine_rate_hz: R.machine_rate_hz, solve_ms: R.solve_ms_per_world_frame, demo: R.demo.result, demo_lit: R.demo.lit }, null, 1));
R.checks.forEach(c => console.log((c.ok ? 'PASS ' : 'FAIL ') + c.name));
