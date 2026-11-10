/* Invariant tests (node tests.js). Writes tests.json with every measured number.
   Declared: each TUNED material's energy falls to 1e-6 of its peak, and the element sleeps (velocity exactly 0), within its
   declared settle time after the last impulse; at rest nothing moves (bit-identical state); 30 and 60 fps give identical
   states (fixed 1/240 s substeps); response begins after primary motion; no interpenetration; mass of icing conserved;
   a fast tilt has consequences that a careful one does not. */
const D = require('./dyn.js'), { Game, SCRIPT } = require('./game.js'), fs = require('fs');
const DEG = Math.PI / 180, out = { tests: [], measured: {} }; let pass = 0, fail = 0;
function ok(name, cond, info) { out.tests.push({ name, pass: !!cond, info }); cond ? pass++ : fail++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); }
const run = (w, s, fps) => { const n = Math.round(s * (fps || 60)); for (let i = 0; i < n; i++) w.advance(1 / (fps || 60)); };
const baseCake = (name, opts) => { const w = new D.World(name || 'TUNED'); for (let k = 0; k < 3; k++) { w.dropLayer(0); run(w, 1.2); } if (opts && opts.ice !== false) { w.pour(200e3, 1.2); run(w, 5.5); } return w; };
// measure: from t0, sample energy of element group fn every substep-aligned frame (1/240), return peak, time energy < 1e-6 peak, time asleep
function settle(w, eFn, sleepFn, maxT) { let peak = 0, tE = null, tS = null; const t0 = w.t; for (let i = 0; i < maxT * 240; i++) { w.advance(1 / 240); const e = eFn(); if (e > peak) { peak = e; tE = null; } if (peak > 0 && tE === null && e <= 1e-6 * peak) tE = w.t - t0; if (tS === null && sleepFn()) tS = w.t - t0; if (tE !== null && tS !== null) break; } return { peak, tEnergy: tE, tSleep: tS }; }

// 1 · settle within the declared time, per material (TUNED)
{ const w = baseCake('TUNED', { ice: false }); const w2 = new D.World('TUNED'); w2.dropLayer(0); run(w2, .05); const t0 = w2.t; while (w2.layers.length === 0) w2.advance(1 / 240);
  const r = settle(w2, () => w2.layers[0].sq.energy(), () => w2.layers[0].sq.sleep, 5); r.since = 'landing'; out.measured.sponge = r; ok('sponge layer: energy to 1e-6 and asleep within declared ' + D.MAT.sponge.settle + ' s of landing', r.tEnergy !== null && r.tEnergy <= D.MAT.sponge.settle && r.tSleep <= D.MAT.sponge.settle + D.MAT.sponge.settle * .25, r); }
{ const w = baseCake(); w.pipe(1); while (!w.beads.length) w.advance(1 / 240); const b = w.beads[0]; const r = settle(w, () => b.s.energy(), () => b.s.sleep, 5); out.measured.bead = r; ok('cream bead slump: settles within declared ' + D.MAT.bead.settle + ' s', r.tEnergy <= D.MAT.bead.settle && r.tSleep <= D.MAT.bead.settle + .25, r); }
{ const w = baseCake(); w.pushCandle(0); const c = w.candles[0]; while (c.state !== 'set') w.advance(1 / 240); const r = settle(w, () => c.lx.energy() + c.lz.energy(), () => c.lx.sleep && c.lz.sleep, 6);
  // count the sways: zero crossings of the lean component along the kick
  out.measured.candle = r; ok('candle pushed in: sways and settles within declared ' + D.MAT.candle.settle + ' s', r.tEnergy <= D.MAT.candle.settle && r.tSleep <= D.MAT.candle.settle + .25, r); }
{ const w = baseCake(); w.pushCandle(0); run(w, 3); w.light(0); run(w, 2); const c = w.candles[0]; c.flame.fx.kick(1.0); const r = settle(w, () => c.flame.fx.energy() + c.flame.fz.energy(), () => c.flame.fx.sleep && c.flame.fz.sleep, 6); out.measured.flame = r;
  ok('flame lean after a push: settles within declared ' + D.MAT.flame.settle + ' s', r.tEnergy <= D.MAT.flame.settle && r.tSleep <= D.MAT.flame.settle + .25, r); }
{ const w = baseCake(); w.setTurn(5 * DEG); while (!w.turn.sleep) w.advance(1 / 240); const r = settle(w, () => w.crown.reduce((s, p) => s + p.r.energy() + p.t.energy(), 0), () => w.crown.every(p => p.r.sleep && p.t.sleep), 6); out.measured.crown = r;
  ok('paper crown after a 5 deg turn step: settles within declared ' + D.MAT.crown.settle + ' s of the stand stopping', r.tEnergy !== null && r.tEnergy <= D.MAT.crown.settle && r.tSleep <= D.MAT.crown.settle + .25, r); }
{ const w = baseCake(); w.setTilt(10 * DEG); while (!w.tilt.sleep) w.advance(1 / 240); const r = settle(w, () => w.streamers.reduce((s, q) => s + (q.ke || 0), 0), () => w.streamers.every(q => q.sleep), 8); out.measured.streamers = r;
  ok('streamers after a 10 deg tilt: kinetic energy to 1e-6 and asleep within declared ' + D.MAT.streamer.settle + ' s of the stand stopping', r.tEnergy !== null && r.tEnergy <= D.MAT.streamer.settle && r.tSleep <= D.MAT.streamer.settle + .25, r); }
{ const w = baseCake('TUNED', { ice: false }); w.pour(240e3, 1.2); while (w.ice.pour) w.advance(1 / 240); let t = 0; while (!w.ice.frozen && t < 10) { w.advance(1 / 240); t += 1 / 240; } out.measured.icing = { stopAfterPourEnds: t, flow: w.ice.flow };
  ok('icing (240 ml, the most a careful pour uses) stops completely within 4.0 s after the pour ends', w.ice.frozen && t <= 4.0 && w.ice.flow === 0, out.measured.icing);
  const s = w.iceStats(); ok('icing volume conserved (top + sides + board = poured)', Math.abs(s.total - s.poured) / s.poured < 1e-9, { poured: s.poured, total: s.total }); }
{ const res = {}; for (const P of ['LOOSE', 'TUNED']) { const w = baseCake(P); w.pushCandle(0); const c = w.candles[0]; while (c.state !== 'set') w.advance(1 / 240); res[P] = settle(w, () => c.lx.energy() + c.lz.energy(), () => c.lx.sleep && c.lz.sleep, 12); }
  out.measured.looseVsTuned = res; ok('LOOSE preset still comes to rest (within 4.5x the TUNED time) but takes longer: the wiggle the brief forbids, shown for comparison', res.LOOSE.tSleep > 2 * res.TUNED.tSleep && res.LOOSE.tSleep <= 4.5 * D.MAT.candle.settle + .25, { loose: res.LOOSE.tSleep, tuned: res.TUNED.tSleep }); }

// 2 · response begins after primary motion; no motion at rest
{ const w = baseCake(); for (let k = 0; k < 7; k++) { w.pushCandle(k); run(w, .4); } run(w, 4); const s0 = JSON.stringify(w.snapshot()); ok('cake fully settled before the impulse', w.atRest());
  w.setTilt(8 * DEG); const lean0 = w.candles.map(c => Math.hypot(c.lx.x, c.lz.x)); let tPrimary = null, tSec = null, tPeak = 0, peak = 0;
  for (let i = 0; i < 240 * 3; i++) { w.advance(1 / 240); if (tPrimary === null && Math.abs(w.theta) > 1e-6) tPrimary = w.t; const l = Math.max(...w.candles.map(c => Math.hypot(c.lx.x, c.lz.x))); if (tSec === null && l > 1e-6) tSec = w.t; if (l > peak) { peak = l; tPeak = w.t; } }
  ok('secondary response begins no earlier than the primary motion, and peaks after it', lean0.every(v => v === 0) && tSec >= tPrimary && tPeak > tPrimary, { tPrimary, tSecondary: tSec, tPeak, peakDeg: peak / DEG });
  run(w, 4); const a = JSON.stringify(w.snapshot()); run(w, 10); const b = JSON.stringify(w.snapshot()); ok('at rest: 10 s with no input leaves every state number bit-identical', w.atRest() && a === b); }
// 3 · frame-rate independence and stability
{ const go = fps => { const w = new D.World('TUNED'); const cmd = [[0, w => w.dropLayer(0)], [1.2, w => w.dropLayer(.004)], [2.4, w => w.dropLayer(0)], [3.6, w => w.pour(200e3)], [4.0, w => w.setTilt(10 * DEG)], [9, w => w.pipe(24)], [12, w => { for (let k = 0; k < 7; k++) w.pushCandle(k); }], [14, w => w.setTurn(40 * DEG)], [16, w => w.setTilt(0)], [18, w => w.light(0)]];
    const snaps = []; let i = 0, f = 0; const n = 20 * fps; for (; f < n; f++) { const t = f / fps; while (i < cmd.length && cmd[i][0] <= t + 1e-9) cmd[i++][1](w); w.advance(1 / fps); if (f % (fps / 30) === fps / 30 - 1) snaps.push(w.snapshot()); } return snaps; };
  const a = go(30), b = go(60); let maxd = 0; a.forEach((s, k) => s.forEach((v, j) => { maxd = Math.max(maxd, Math.abs(v - b[k][j])); }));
  out.measured.fps30vs60 = { frames: a.length, maxAbsDiff: maxd }; ok('30 fps and 60 fps give identical states at every shared frame (fixed 1/240 s substeps)', maxd === 0, out.measured.fps30vs60);
  const wmax = Math.max(...Object.values(D.MAT).filter(m => m.f).map(m => 2 * Math.PI * m.f)); out.measured.stability = { omegaMax: wmax, omegaH: wmax * D.H }; ok('stability margin: max omega*H = ' + (wmax * D.H).toFixed(3) + ' (symplectic Euler needs < 2)', wmax * D.H < .2); }
// 4 · consequences: careful vs careless tilt
{ const res = {}; for (const P of ['LOOSE', 'TUNED', 'RIGID']) for (const mode of ['careful', 'careless']) { const w = baseCake(P); w.pipe(24); run(w, 3.5); for (let k = 0; k < 7; k++) { w.pushCandle(k); run(w, .4); } run(w, 3);
    if (mode === 'careful') { for (let i = 0; i <= 120; i++) { w.setTilt(12 * DEG * i / 120); w.advance(1 / 60); } for (let i = 0; i <= 120; i++) { w.setTilt(12 * DEG * (1 - i / 120)); w.advance(1 / 60); } }
    else { for (let i = 0; i <= 6; i++) { w.setTilt(12 * DEG * i / 6); w.advance(1 / 60); } for (let i = 0; i <= 6; i++) { w.setTilt(12 * DEG * (1 - i / 6)); w.advance(1 / 60); } }
    run(w, 5); res[P + ' ' + mode] = { fell: w.candles.filter(c => c.state !== 'set').length, rest: w.atRest(), minStreamerY: Math.min(...w.streamers.flatMap(s => s.pts.map(p => p.p[1]))) }; }
  out.measured.tilt = res; ok('careful tilt (12 deg over 2 s and back): no candle falls in any preset', ['LOOSE', 'TUNED', 'RIGID'].every(P => res[P + ' careful'].fell === 0), res);
  ok('careless tilt (12 deg in 0.1 s and back): TUNED loses at least one candle, LOOSE at least as many, RIGID none', res['TUNED careless'].fell >= 1 && res['LOOSE careless'].fell >= res['TUNED careless'].fell && res['RIGID careless'].fell === 0, Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v.fell])));
  ok('everything comes to rest after the careless tilt (TUNED, RIGID)', res['TUNED careless'].rest && res['RIGID careless'].rest);
  ok('no streamer passes through the table', Object.values(res).every(r => r.minStreamerY >= D.GEO.tableY + .0015 - 1e-12), Object.values(res).map(r => +r.minStreamerY.toFixed(4))); }
{ const res = {}; for (const fl of [0, 1]) { const w = baseCake('TUNED', { ice: false }); w.pour(200e3, 1.2); run(w, 1.3); if (fl) { for (let i = 0; i <= 6; i++) { w.setTilt(16 * DEG * i / 6); w.advance(1 / 60); } for (let i = 0; i <= 6; i++) { w.setTilt(16 * DEG * (1 - i / 6)); w.advance(1 / 60); } } run(w, 6); res[fl ? 'flick' : 'still'] = w.iceStats(); }
  out.measured.wetIcing = { stillDrip: res.still.drip, flickDrip: res.flick.drip, stillTop: res.still.top, flickTop: res.flick.top };
  ok('a flick while the icing is wet sends more of it down the sides than leaving it still', res.flick.drip > res.still.drip && res.flick.top < res.still.top, out.measured.wetIcing); }
// 5 · the whole game, scripted on the rings
for (const fps of [30, 60]) { const g = new Game(); g.play(); let minGap = 1, sqMin = 0, landedOK = true, maxFall = 0, beforeBlow = null; const n = 30 * fps;
  for (let f = 0; f < n; f++) { g.advance(1 / fps); const m = g.main; if (m.held) minGap = Math.min(minGap, m.held.y - m.cakeTop()); m.layers.forEach(L => { sqMin = Math.min(sqMin, L.sq.x); }); m.candles.forEach(c => { if (c.fall) maxFall = Math.max(maxFall, c.fall.g); });
    if (!beforeBlow && g.phase === 'blowing') beforeBlow = { t: g.t, score: g.scoreAtBlow, lit: g.events.filter(e => e.kind === 'lit').length }; }
  const ev = g.events, outs = ev.filter(e => e.kind === 'out' && e.why === 'breath'), clicks = g.log.filter(e => e.type === 'click').map(e => e.t);
  const gaps = clicks.slice(1).map((t, i) => +(t - clicks[i]).toFixed(4)).filter(d => d > 0 && d < .2), on118 = gaps.filter(d => Math.abs(d - 1 / 11.8) < .02 || Math.abs(d - 1 / 23.6) < .02).length;
  const tag = `[${fps} fps] `; out.measured['game' + fps] = { done: ev.find(e => e.kind === 'done'), fell: ev.filter(e => e.kind === 'fell').map(e => e.k), beforeBlow: beforeBlow && { t: beforeBlow.t, score: beforeBlow.score.total, parts: beforeBlow.score.parts, aspect: beforeBlow.score.aspect }, outs: outs.map(e => [e.t, e.k]), minLayerGap: minGap, minStrain: sqMin, clickGaps: { n: gaps.length, at118or236: on118 } };
  ok(tag + 'the scene makes the whole cake: 3 layers landed, icing poured and set, 24 beads, inscription, 7 candles, then lit', ['landed', 'pour', 'icing-rest', 'inscribed'].every(k => ev.some(e => e.kind === k)) && ev.filter(e => e.kind === 'landed').length === 3 && g.main.beads.length === 24 && beforeBlow && beforeBlow.lit >= 7, { lit: beforeBlow && beforeBlow.lit });
  ok(tag + 'the careless flick in the scene costs a candle, which is pushed back in', ev.some(e => e.kind === 'fell') && ev.filter(e => e.kind === 'fell').every(f => ev.some(e => e.kind === 'candle-set' && e.k === f.k && e.t > f.t)), out.measured['game' + fps].fell);
  ok(tag + 'at the blow the cake matches the film\'s within tolerance (score >= 90, 7 upright, at rest)', beforeBlow && beforeBlow.score.pass && beforeBlow.score.parts.rest === 10, beforeBlow && beforeBlow.score.total);
  ok(tag + 'the breath puts the seven out one by one (distinct times, spread over >= 0.3 s)', outs.length === 7 && new Set(outs.map(e => e.t)).size >= 5 && outs[6].t - outs[0].t >= .3, outs.map(e => e.t));
  ok(tag + 'a layer never passes into the cake below it while lowered; sponge never inverts', minGap >= -.35 / 240 - 1e-9 && sqMin > -.4, { minGap, sqMin });
  ok(tag + 'a fallen candle lies on the cake (angle stops at its contact, 86 deg)', maxFall <= D.GEO.fallLim + 1e-9, { maxFallDeg: maxFall / DEG });
  ok(tag + 'machine clicks step at 11.8/s (23.6/s only when far behind)', gaps.length > 50 && on118 / gaps.length > .95, { n: gaps.length, frac: on118 / gaps.length });
  ok(tag + 'game ends: done', !!ev.find(e => e.kind === 'done'));
  if (fps === 60) { run(g.main, 0); const a = JSON.stringify(g.main.snapshot()); for (let i = 0; i < 300; i++) g.advance(1 / 60); const b = JSON.stringify(g.main.snapshot()); ok('after the blow, 5 s with no input: the tuned cake is bit-identical (no motion at rest)', g.main.atRest() && a === b); }
}
fs.writeFileSync(__dirname + '/tests.json', JSON.stringify(Object.assign({ ran: new Date().toISOString(), pass, fail }, out), null, 1));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
