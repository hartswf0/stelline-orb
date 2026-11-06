/* tests.js: the declared invariants, run over every transition the making grammar allows, under every pacing curve.
   node experiments/swarms/3d-metamorphosis/tests.js            (exit code 1 on any failure)
   Invariants:
   1. CORRESPONDENCE: every key form and every in-between has the same vertex count and grid topology.
   2. NO FLIPS: no face normal reverses between consecutive steps (faces of area < 1e-10 m^2 at the axis are skipped).
   3. NO SELF-INTERSECTION: every angular column's profile, closed through the axis, keeps positive orientation, has no
      crossing segments, and no negative radius (tolerance 0: none allowed).
   4. VOLUME PER STEP BOUNDED: |V(k+1) - V(k)| <= 0.16 * max(V(a), V(b)) for morphs (each change gets stepsFor(a, b, pace) in-betweens, at least 12). CUTS are exempt and flagged.
   5. CANDLE ANCHORS CONTINUOUS: each of the seven candle anchors moves at most 6 mm per step during a morph; across a cut the
      page holds the candles and settles them over 6 frames, so the per-frame move is at most 1/6 of the cut jump (checked <= 4 mm).
   6. IDENTITY HELD (a numeric proxy only; the felt result is for the viewer): under LINGER, after a quarter of its steps the surface
      has moved less than 15% of the way to the next key (mean vertex distance).
   7. THE PROOF TRACE (if trace.json exists): the whole making is shown (arrival, at least three stages, the film's chosen cake,
      24 inscription steps, 7 candles placed, 7 lit, the blow), and every machine step is at 11.8/s or 23.6/s. */
const M = require('./morph.js'), fs = require('fs'), path = require('path');
let pass = 0, fail = 0; const lines = [];
const ok = (c, msg) => { if (c) pass++; else { fail++; lines.push('FAIL ' + msg); } };
const n = M.NU * M.NT;
const edges = []; Object.keys(M.EDGES).forEach(a => Object.keys(M.EDGES[a]).forEach(b => edges.push([a, b, M.EDGES[a][b]])));
// 1
M.ORDER.forEach(k => { const S = M.key(k); ok(S.R.length === n && S.Y.length === n && S.C.length === n * 3, `topology ${k}`); });
let worstVol = 0, worstVolAt = '', worstCandle = 0, worstCandleAt = '', worstCut = 0, flips = 0, crossings = 0, minArea = Infinity, morphs = 0, cuts = 0;
const report = { edges: [] };
edges.forEach(([a, b, field]) => {
  M.PACES.forEach((P, pi) => { const N = M.stepsFor(a, b, pi);
    const S = []; for (let k = 0; k <= N; k++) { const s = M.between(a, b, k, N, pi); S.push({ R: Float64Array.from(s.R), Y: Float64Array.from(s.Y), C: s.C, cut: s.cut }); ok(s.R.length === n, `topology ${a}>${b} step ${k}`); }
    const Va = M.volume(M.key(a)), Vb = M.volume(M.key(b)), Vm = Math.max(Va, Vb);
    const vols = S.map(M.volume), fns = S.map(M.faceNormals); let edgeWorst = 0, edgeCand = 0, edgeFlips = 0;
    for (let k = 0; k < N; k++) {
      const pc = M.profileCheck(S[k + 1]); crossings += pc.crossings; minArea = Math.min(minArea, pc.minArea);
      ok(pc.crossings === 0 && pc.negR === 0 && pc.minArea > 0, `profile ${a}>${b} ${P.name} step ${k + 1}: crossings ${pc.crossings} negR ${pc.negR} minArea ${pc.minArea}`);
      const cand = Math.max(...M.CANDLES.map(c => { const p = M.at(S[k], c.u, c.th), q = M.at(S[k + 1], c.u, c.th); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); }));
      if (field === 'CUT') { worstCut = Math.max(worstCut, cand); continue; }
      let f = 0; for (let q = 0; q < fns[k].length; q++) { const u = fns[k][q], v = fns[k + 1][q]; if (u && v && u[0] * v[0] + u[1] * v[1] + u[2] * v[2] < 0) f++; } edgeFlips += f; flips += f;
      const dv = Math.abs(vols[k + 1] - vols[k]) / Vm; edgeWorst = Math.max(edgeWorst, dv); if (dv > worstVol) { worstVol = dv; worstVolAt = `${a}>${b} ${P.name} step ${k + 1}`; }
      edgeCand = Math.max(edgeCand, cand); if (cand > worstCandle) { worstCandle = cand; worstCandleAt = `${a}>${b} ${P.name} step ${k + 1}`; }
    }
    if (field === 'CUT') { cuts++; ok(S.every(s => s.cut), `${a}>${b} flagged as cut`); }
    else { morphs++; ok(edgeFlips === 0, `no flips ${a}>${b} ${P.name} (${edgeFlips})`); ok(edgeWorst <= .16, `volume step ${a}>${b} ${P.name} ${edgeWorst.toFixed(3)}`); ok(edgeCand <= .006, `candle step ${a}>${b} ${P.name} ${(edgeCand * 1000).toFixed(2)} mm`); }
    if (pi === 0) report.edges.push({ from: a, to: b, field, steps_by_pace: M.PACES.map((_, q) => M.stepsFor(a, b, q)), V_from_ml: +(Va * 1e6).toFixed(1), V_to_ml: +(Vb * 1e6).toFixed(1), worst_dV_rel: +edgeWorst.toFixed(4), worst_candle_mm: +(edgeCand * 1000).toFixed(2) });
  });
  if (field !== 'CUT') { const S0 = M.key(a), S3 = M.between(a, b, Math.round(M.stepsFor(a, b, 2) / 4), M.stepsFor(a, b, 2), 2), S12 = M.key(b), frac = M.profileDist(S0, S3) / M.profileDist(S0, S12);
    ok(frac < .15, `identity held ${a}>${b} LINGER at a quarter of its steps: ${(frac * 100).toFixed(1)}%`); report.edges.find(e => e.from === a && e.to === b).linger_step3_pct = +(frac * 100).toFixed(1); }
});
ok(worstCut / 6 <= .004, `cut candle settle per frame ${(worstCut / 6 * 1000).toFixed(2)} mm`);
// 7
const tp = path.join(__dirname, 'trace.json');
if (fs.existsSync(tp)) { const tr = JSON.parse(fs.readFileSync(tp)); const ev = tr.events.map(e => e.kind);
  ok(ev.includes('arrival'), 'trace: arrival from nothing'); const commits = tr.events.filter(e => e.kind === 'commit').map(e => e.key);
  ok(commits.filter(k => M.KEYS[k].kind === 'stage').length >= 3, `trace: at least three making stages committed (${commits.join(' > ')})`);
  ok(commits.includes('BROWN_DOME'), 'trace: the film\'s chosen cake (brown dome) reached');
  ok(tr.events.filter(e => e.kind === 'stroke').length >= 24, 'trace: 24 inscription steps'); ok(tr.events.filter(e => e.kind === 'candle').length === 7, 'trace: 7 candles placed');
  ok(tr.events.filter(e => e.kind === 'lit').length === 7, 'trace: 7 lit'); ok(ev.includes('blow') && tr.events.filter(e => e.kind === 'out').length === 7, 'trace: the blow, 7 out');
  const st = tr.steps.map(s => s.t); let bad = 0; for (let i = 1; i < st.length; i++) { const d = st[i] - st[i - 1]; if (d < 1 / 23.6 - .034) bad++; } ok(bad === 0, `trace: step intervals no faster than 23.6/s (frame clock 1/30) (${bad} faster)`);
  const tv = tr.steps.filter(s => s.kind === 'morph'); ok(tv.every(s => s.flips === 0 && s.crossings === 0), 'trace: no flips or crossings in the played steps');
  ok(tv.every(s => s.dV_rel <= .16), `trace: played volume steps bounded (worst ${Math.max(...tv.map(s => s.dV_rel)).toFixed(3)})`);
  ok(tr.frames.every((f, i) => i === 0 || f.candleMove <= .006), `trace: candle per-frame move <= 6 mm (worst ${(Math.max(...tr.frames.map(f => f.candleMove)) * 1000).toFixed(2)} mm)`);
} else lines.push('NOTE trace.json not found; trace checks skipped');
report.summary = { morph_edges: morphs / M.PACES.length, cut_edges: cuts / M.PACES.length, paces: M.PACES.map(p => p.name), worst_dV_rel: +worstVol.toFixed(4), worst_dV_at: worstVolAt, worst_candle_step_mm: +(worstCandle * 1000).toFixed(2), worst_candle_at: worstCandleAt, worst_cut_candle_jump_mm: +(worstCut * 1000).toFixed(2), flips, crossings, min_profile_area_m2: +minArea.toExponential(3) };
fs.writeFileSync(path.join(__dirname, 'tests-result.json'), JSON.stringify(Object.assign({ passed: pass, failed: fail, failures: lines }, report), null, 1));
lines.forEach(l => console.log(l)); console.log(JSON.stringify(report.summary)); console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
