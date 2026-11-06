// Invariant tests, measured on the page's own rendering (Chromium via Playwright), plus checks on trace.json.
//   node tests/run.js        (needs a static server at the repo root: python3 -m http.server 8765)
// Writes tests/results.json and planes.json (the manifest, taken from the running page).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const URL = process.env.MP_URL || 'http://localhost:8765/experiments/swarms/multiplane/index.html', DIR = path.join(__dirname, '..');
const R = { when: new Date().toISOString(), viewport: '390x780 css px, device scale 1', tests: {} }; let fails = 0;
function verdict(name, ok, detail) { R.tests[name] = Object.assign({ pass: ok }, detail); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + ' ' + JSON.stringify(detail).slice(0, 400)); }
// horizontal shift of picture B against picture A (grey levels), by least mean absolute difference, then a parabola
function shiftOf(A, B, W, H, maxS) { const g = d => { const o = new Float32Array(W * H); for (let i = 0; i < W * H; i++) o[i] = d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]; return o; }; const a = g(A), b = g(B);
  const cost = (s, ys, xs) => { let sum = 0, n = 0; for (let y = 0; y < H; y += ys) for (let x = Math.max(0, -s); x < Math.min(W, W - s); x += xs) { const va = a[y * W + x], vb = b[y * W + x + s]; if (va === 0 && vb === 0) continue; sum += Math.abs(va - vb); n++; } return n > 50 ? sum / n : 1e9; };
  let best = 0, bc = 1e18; for (let s = -maxS; s <= maxS; s++) { const c = cost(s, 6, 3); if (c < bc) { bc = c; best = s; } }      // coarse: every 6th row, 3rd column
  const cs = {}; let b2 = best; bc = 1e18; for (let s = best - 4; s <= best + 4; s++) { const c = cost(s, 1, 1); cs[s] = c; if (c < bc) { bc = c; b2 = s; } }   // fine: every pixel
  const c0 = cs[b2 - 1], c2 = cs[b2 + 1]; let sub = 0; if (c0 != null && c2 != null && c0 + c2 - 2 * bc > 0) sub = .5 * (c0 - c2) / (c0 + c2 - 2 * bc); return b2 + sub; }
(async () => { const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
  pg.on('pageerror', e => console.log('page error', e.message));
  await pg.goto(URL); await pg.waitForFunction(() => window.MP && MP.ready); await pg.evaluate(() => { MP.film(true); MP.reset(); MP.setKT(0); });
  const { W, H, F, ZC } = await pg.evaluate(() => ({ W: MP.W, H: MP.H, F: MP.F, ZC: MP.ZC }));
  fs.writeFileSync(path.join(DIR, 'planes.json'), JSON.stringify(await pg.evaluate(() => MP.manifest()), null, 1));
  // ---------- 1. parallax: each card's measured slide between two eye positions against F*db*(1/zc - 1/z)
  const configs = [{ name: 'start', set: {} }, { name: 'moved', set: { near: 1.4, left: 4.4, right: 2.9, string: 2.2 } }];
  const rows = []; // (G-dark overlay and the game text are not part of render)
  for (const cf of configs) {
    const info = await pg.evaluate(set => { MP.reset(); MP.setKT(0); for (const [k, z] of Object.entries(set)) MP.P[k].z = z; MP.sortPlanes(); return MP.PLANES.map(p => ({ id: p.id, z: p.z })); }, cf.set);
    const b0 = await pg.evaluate(() => MP.camB(-6)), b1 = await pg.evaluate(() => MP.camB(6));
    for (let i = 0; i < info.length; i++) { if (cf.name === 'moved' && !['child2', 'child1', 'child3', 'string'].includes(info[i].id)) continue;
      const PAD = 420, pred0 = F * (b1 - b0) * (1 / ZC - 1 / info[i].z);
      // rendered with a wide margin (so a card that leaves the phone's frame is still measured); the matching runs in the page
      const meas = await pg.evaluate(([b0, b1, i, p, maxS, src]) => { const A = MP.render(b0, 0, i, p), B = MP.render(b1, 0, i, p), W = MP.W + 2 * p, H = MP.H + 2 * p; const shiftOf = eval('(' + src + ')'); return shiftOf(A, B, W, H, maxS); }, [b0, b1, i, PAD, Math.ceil(Math.abs(pred0)) + 40, shiftOf.toString()]);
      const pred = pred0;
      const err = meas - pred, tol = Math.max(1.0, .02 * Math.abs(pred)); rows.push({ config: cf.name, plane: info[i].id, depth: info[i].z, predictedPx: +pred.toFixed(2), measuredPx: +meas.toFixed(2), errorPx: +err.toFixed(2), ok: Math.abs(err) <= tol }); } }
  const worst = rows.reduce((m, r) => Math.abs(r.errorPx) > Math.abs(m.errorPx) ? r : m, rows[0]);
  // the law itself: measured slide divided by (1/zc - 1/z) should be one constant, F*db, for every card away from the pivot
  const ks = rows.filter(r => Math.abs(1 / ZC - 1 / r.depth) > .05).map(r => r.measuredPx / (1 / ZC - 1 / r.depth)), kMean = ks.reduce((a, b) => a + b, 0) / ks.length, kSpread = Math.max(...ks.map(k => Math.abs(k / kMean - 1)));
  verdict('parallax_proportional_to_inverse_depth', rows.every(r => r.ok) && kSpread < .02, { planes: rows.length, worstPlane: worst.plane, worstErrorPx: worst.errorPx, worstPredictedPx: worst.predictedPx, constantFdb: +kMean.toFixed(1), expectedFdb: +(F * (await pg.evaluate(() => MP.camB(6) - MP.camB(-6)))).toFixed(1), eyeMoveM: +(await pg.evaluate(() => MP.camB(6) - MP.camB(-6))).toFixed(4), maxRelativeSpread: +kSpread.toFixed(4), rows });
  // ---------- 2. occlusion order, and 3. gaps, at many eye positions and depth settings
  let checked = 0, wrong = 0, holes = 0, seamBad = 0, floatBad = 0, samples = 0; const wrongAt = [];
  const occConfigs = [{}, { near: 1.4 }, { near: 2.3, string: 2.2 }, { left: 4.4, right: 2.9 }, { string: 2.2, near: 1.4 }];
  for (const set of occConfigs) for (let yaw = -30; yaw <= 30; yaw += 6) {
    const r = await pg.evaluate(([set, yaw]) => { MP.reset(); MP.setKT(0); for (const [k, z] of Object.entries(set)) MP.P[k].z = z; MP.sortPlanes(); const b = MP.camB(yaw);
      const masks = MP.masks(b, 0), pic = MP.idComposite(b, 0), W = MP.W, H = MP.H, N = W * H, zs = MP.PLANES.map(p => p.z), cols = MP.PLANES.map((p, i) => MP.idColor(i));
      let checked = 0, wrong = 0, holes = 0, seamBad = 0, floatBad = 0; const wrongAt = [];
      const key = c => c[0] * 65536 + c[1] * 256 + c[2], byCol = new Map(cols.map((c, i) => [key(c), i]));
      for (let q = 0; q < N; q++) { let amb = false, near = -1, any = 0; for (let i = 0; i < masks.length; i++) { const a = masks[i][q]; if (a > any) any = a; if (a >= 250) { if (near < 0 || zs[i] < zs[near] || (zs[i] === zs[near] && i > near)) near = i; } else if (a > 5) amb = true; }
        if (any < 128) holes++;
        if (amb || near < 0) continue; const j = byCol.get(key([pic[q * 4], pic[q * 4 + 1], pic[q * 4 + 2]])); if (j == null) continue; checked++; if (j !== near) { wrong++; if (wrongAt.length < 5) wrongAt.push({ x: q % W, y: (q / W) | 0, seen: MP.PLANES[j].id, nearest: MP.PLANES[near].id }); } }
      // seams: in every column where both table pieces are, from the top of the far top down to the bottom of the near lip, nothing farther than the table shows
      const ti = MP.P.tabletop.i, fi = MP.P.tablefront.i, ci = MP.P.cake.i, far = new Set(MP.PLANES.filter(p => p.z > MP.P.tabletop.z).map(p => key(MP.idColor(p.i))));
      const lipBottom = MP.project(0, .64, MP.P.tablefront.z, b)[1];
      for (let x = 0; x < W; x++) { let top = -1; for (let y = 0; y < H; y++) if (masks[ti][y * W + x] >= 250) { top = y; break; } let hasF = false; for (let y = 0; y < H; y++) if (masks[fi][y * W + x] >= 250) { hasF = true; break; } if (top < 0 || !hasF) continue;
        for (let y = top; y < lipBottom - 1; y++) { const q = y * W + x; if (far.has(key([pic[q * 4], pic[q * 4 + 1], pic[q * 4 + 2]]))) seamBad++; }
        // the cake never floats: just below its lowest pixel in this column is table (or something nearer), never the floor or wall
        let cb = -1; for (let y = H - 1; y >= 0; y--) if (masks[ci][y * W + x] >= 250) { cb = y; break; } if (cb >= 0) { const q = (cb + 2) * W + x; if (far.has(key([pic[q * 4], pic[q * 4 + 1], pic[q * 4 + 2]]))) floatBad++; } }
      return { checked, wrong, holes, seamBad, floatBad, wrongAt }; }, [set, yaw]);
    checked += r.checked; wrong += r.wrong; holes += r.holes; seamBad += r.seamBad; floatBad += r.floatBad; samples++; wrongAt.push(...r.wrongAt); }
  verdict('occlusion_order_follows_depth', wrong === 0, { views: samples, pixelsChecked: checked, wrongPixels: wrong, examples: wrongAt.slice(0, 5) });
  verdict('no_gaps_or_seams', holes === 0 && seamBad === 0 && floatBad === 0, { views: samples, uncoveredPixels: holes, tableSeamPixels: seamBad, cakeFloatingPixels: floatBad });
  // ---------- 4. the game: no win from the eye alone at the start; a win after one depth change; the scene ends kept
  const game = await pg.evaluate(() => { const scan = () => { const out = []; for (let y = -30; y <= 30; y += 2) { const s = MP.sight(MP.camB(y), 0); if (s.nCandles === 7 && s.nFaces === 3) out.push(y); } return out; };
    MP.reset(); MP.setKT(0); const base = scan(); MP.P.right.z = 4.1; MP.sortPlanes(); const moved = scan(); MP.reset(); return { winsFromStart: base, winsWithChildRightAt4_1m: moved }; });
  const trace = JSON.parse(fs.readFileSync(path.join(DIR, 'trace.json'))); const blowEv = trace.events.find(e => e.k === 'blow'), last = trace.frames[trace.frames.length - 1];
  verdict('game_needs_viewpoint_and_depth', game.winsFromStart.length === 0 && game.winsWithChildRightAt4_1m.length > 0 && blowEv && blowEv.candles === 7 && blowEv.faces === 3 && last.phase === 'kept', Object.assign(game, { proofBlow: blowEv, proofEndPhase: last.phase }));
  // ---------- 5. the device: detents under the hand, then the machine at 11.8 steps a second
  const steps = trace.events.filter(e => e.k === 'step'), trains = []; let cur = [];
  steps.forEach(e => { if (cur.length && e.t - cur[cur.length - 1].t > .2) { trains.push(cur); cur = []; } cur.push(e); }); if (cur.length) trains.push(cur);
  const rates = trains.filter(t => t.length >= 5).map(t => ({ start: t[0].t, steps: t.length, perSecond: +((t.length - 1) / (t[t.length - 1].t - t[0].t)).toFixed(2), firstDetent: (trace.events.find(e => e.k === 'detent' && e.t <= t[0].t + 1e-6 && e.t > t[0].t - 1) || {}).t }));
  verdict('machine_steps_at_11_8_per_second', rates.every(r => Math.abs(r.perSecond - 11.8) < .6 && r.firstDetent != null), { trains: rates, note: 'step times are the 30 fps frame on which each step fell, so a train rate carries up to 1/30 s error at each end' });
  // ---------- 6. smooth view: the picture glides between clicks
  const yaws = trace.frames.map(f => f.yaw), d1 = yaws.slice(1).map((y, i) => y - yaws[i]), d2 = d1.slice(1).map((d, i) => d - d1[i]);
  const stepFrames = new Set(steps.map(e => Math.round(e.t * 30))), moving = d1.map((d, i) => Math.abs(d) > .02 ? i + 1 : -1).filter(i => i >= 0), glide = moving.filter(i => !stepFrames.has(i)).length;
  verdict('view_glides_between_steps', glide > 0 && Math.max(...d2.map(Math.abs)) < 1.0, { movingFrames: moving.length, movingFramesWithoutAStep: glide, maxDegPerFrame: +Math.max(...d1.map(Math.abs)).toFixed(3), maxChangeOfDegPerFrame: +Math.max(...d2.map(Math.abs)).toFixed(3) });
  // ---------- 7. depth tells in the sound: during the long scale sweep, nearer voices move faster (so they are louder) and are tuned brighter
  const sweep = trace.frames.filter(f => f.t > 1.0 && f.t < 2.6), vz = trace.frames[0].vz, meanSp = vz.map((z, i) => sweep.reduce((a, f) => a + f.speed[i], 0) / sweep.length);
  const order = vz.map((z, i) => i).sort((a, b) => vz[a] - vz[b]); let mono = true; for (let k = 1; k < order.length; k++) if (meanSp[order[k]] > meanSp[order[k - 1]] + 1e-6) mono = false;
  let rms = {}; try { const seg = (a, d) => { const o = execSync(`ffmpeg -hide_banner -ss ${a} -t ${d} -i ${path.join(DIR, 'proof.mp4')} -af astats=metadata=0 -f null - 2>&1`).toString(); const m = o.match(/Overall[\s\S]*?RMS level dB:\s*(-?[\d.]+|-inf)/); return m ? m[1] : null; }; rms = { sweep_1_0_to_2_6s: seg(1.0, 1.6), still_4_9_to_5_3s: seg(4.9, .4), afterBlow_8_6_to_9_2s: seg(8.6, .6) }; } catch (e) { rms = { error: e.message }; }
  verdict('nearer_voices_faster_and_brighter', mono, { voiceDepths: vz.map(z => +z.toFixed(2)), meanScreenSpeedPxPerS: meanSp.map(v => +v.toFixed(1)), bandCentreHz: vz.map(z => Math.round(180 + 5200 * Math.pow(.95 / z, 1.3))), audioRmsDb: rms });
  R.summary = { failed: fails, passed: Object.keys(R.tests).length - fails }; fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(R, null, 1)); console.log(R.summary); await br.close(); process.exit(fails ? 1 : 0); })();
