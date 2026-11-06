/* tests.js — node tests for HARMONIC CAKE's declared invariants. Run: node tests.js   (reads trace.json if present; writes tests.json)
   1 exact periodicity: every pass the machine can make returns to its first sample (all gears whole turns), checked on the stage targets and 400 random gear settings
   2 the tube never cuts into the cake: every tube sample and every chord between samples stays at least its own radius outside the cream (signed distance)
   3 the pattern score discriminates: the target scores 0; every single-detent error in a needed gear scores above tolerance
   4 candles placed by the machine clear the inscription and the shells
   5 reproducible from the trace: replaying the trace's applied gear values and HOLDs through the pure core gives the same passes, distances and path hashes
   6 the machine's click trains in the trace run at 11.8 or 23.6 steps a second */
'use strict';
const H = require('./harmonic.js'), fs = require('fs'), path = require('path');
const results = []; let fail = 0;
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); if (!ok) fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + JSON.stringify(detail) : '')); };
let seed = 12345; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const pattern = H.STAGES.filter(d => !d.auto), randGears = () => { const g = {}; H.GEARS.forEach(id => { g[id] = { ri: H.RANGE[id][0] + Math.floor(rnd() * (H.RANGE[id][1] - H.RANGE[id][0] + 1)), ph: Math.floor(rnd() * 25) - 12 }; }); return g; };
// 1 periodicity
{ let worst = 0, n = 0, worstAng = 0; const sets = []; pattern.forEach(d => sets.push([d, H.targetGears(d)])); for (let i = 0; i < 400; i++) { const d = pattern[i % pattern.length]; sets.push([d, randGears()]); }
  sets.forEach(([d, g]) => { const P = H.pass(d, g, 240); worst = Math.max(worst, P.closeErr); n++; H.GEARS.forEach(id => { const a0 = H.gearAngle(g[id].ri, g[id].ph, 0, 240), a1 = H.gearAngle(g[id].ri, g[id].ph, P.N, 240); worstAng = Math.max(worstAng, Math.abs(a1 - a0)); }); });
  check('1 closed paths return to start (max error over ' + n + ' passes, metres; gear angle error, radians)', worst <= 1e-12 && worstAng <= 1e-12, { worst, worstAng }); }
// 2 clearance
{ let worst = Infinity, at = null, n = 0; const test = (pts, label) => { for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[i + 1] || a; for (const u of [0, .5]) { const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, z = a.z + (b.z - a.z) * u, r = a.r + (b.r - a.r) * u; const c = H.cakeSDF(x, y, z) - r; n++; if (c < worst) { worst = c; at = label; } } } };
  ['white', 'choc'].forEach(rc => pattern.filter(d => d.kind !== 'candles').forEach(d => test(H.pass(d, H.targetGears(d, rc), 720).pts, d.id + ' target ' + rc)));
  for (let i = 0; i < 120; i++) { const d = pattern.filter(d => d.kind !== 'candles')[i % 3]; const g = randGears(); if (H.passRevs(g) > 6) continue; test(H.pass(d, g, 720).pts, d.id + ' random ' + H.gearsKey(g)); }
  H.inscription().forEach(s => test(s.pts, 'inscription ' + s.ch + s.stroke));
  // and the board under the beads: no tube below y = 0
  let floor = Infinity; pattern.filter(d => d.kind === 'side').forEach(d => H.pass(d, H.targetGears(d), 720).pts.forEach(p => { floor = Math.min(floor, p.y - p.r); }));
  check('2 no tube cuts the cream: min (signed distance - tube radius) over ' + n + ' samples and chord midpoints', worst >= -1e-9 && floor >= 0, { min_clearance_m: +worst.toExponential(3), at, min_height_above_board_m: +floor.toFixed(5) }); }
// 3 discrimination
{ const rows = []; let ok = true; ['white', 'choc'].forEach(rc => pattern.forEach(d => { const T = H.targetGears(d, rc), s0 = H.score(d, T, rc); if (!(s0.ok && s0.dist === 0)) ok = false;
    d.need.forEach(id => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dp]) => { const g = JSON.parse(JSON.stringify(T)); g[id].ri += dr; g[id].ph += dp; if (g[id].ri < 0 || g[id].ri >= H.RATIOS.length) return;
      const s = H.score(d, g, rc); if (s.ok && dp === 0) ok = false; if (s.ok && dp !== 0 && !(d.id === 'BASE BEADS' && id === 't') && !(d.id === 'TOP SHELLS' && id === 'n' && false)) ok = false; rows.push([rc, d.id, id, dr, dp, +(s.dist * 1000).toFixed(3), s.ok]); })); }));
  const min = Math.min(...rows.filter(r => !(r[1] === 'BASE BEADS' && r[2] === 't' && r[4] !== 0)).map(r => r[5]));
  check('3 for both recipes (white, chocolate) the target scores 0 and every one-detent error in a needed gear is out of tolerance (' + H.TOL * 1000 + ' mm); smallest error distance in mm', ok && min > H.TOL * 1000, { smallest_mm: min, note: 'turntable phase on the bead ring is a symmetry (24 beads, 15 degrees = one bead), so it is excluded', rows }); }
// 4 candles clear the inscription and shells
{ const d = H.STAGES.find(d => d.kind === 'candles'), stops = H.pass(d, H.targetGears(d), 240).stops, CR = 0.0028; let worst = Infinity, who = null;
  const tubes = H.inscription().map(s => [s.ch + s.stroke, s.pts]).concat([['shells', H.pass(H.STAGES[3], H.targetGears(H.STAGES[3]), 720).pts]]);
  stops.forEach((c, i) => tubes.forEach(([nm, pts]) => pts.forEach(p => { const g = Math.hypot(p.x - c.x, p.z - c.z) - CR - p.r; if (g < worst) { worst = g; who = 'candle ' + i + ' / ' + nm; } })));
  check('4 seven candles, each clear of every inscription stroke and shell (min gap, metres)', stops.length === 7 && worst > 0, { candles: stops.length, min_gap_m: +worst.toFixed(5), at: who }); }
// 5 reproducibility from the trace
const tracePath = path.join(__dirname, 'trace.json');
if (fs.existsSync(tracePath)) { const tr = JSON.parse(fs.readFileSync(tracePath, 'utf8')); const G = H.newGame();
  tr.applied.forEach(e => { if (e[1] === 'commit') H.commit(G); else H.setGear(G, e[1], e[2], e[3]); });
  const a = JSON.stringify(H.summary(G)), b = JSON.stringify(tr.final), same = a === b;
  const G2 = H.newGame(); tr.applied.forEach(e => { if (e[1] === 'commit') H.commit(G2); else H.setGear(G2, e[1], e[2], e[3]); });
  check('5 replaying the trace (' + tr.applied.length + ' machine events) reproduces every pass, distance and path hash', same && JSON.stringify(H.summary(G2)) === a, { passes: H.summary(G).passes.length, kept: G.passes.filter(p => p.ok).length, decayed: G.passes.filter(p => !p.ok).length, over: G.over });
  // 6 click-train rates
  const steps = tr.applied.filter(e => e[1] !== 'commit').map(e => e[0]), trains = []; let cur = [steps[0]];
  for (let i = 1; i < steps.length; i++) { if (steps[i] - steps[i - 1] < .2) cur.push(steps[i]); else { trains.push(cur); cur = [steps[i]]; } } trains.push(cur);
  // the last six steps of a train are slow (11.8/s); no stretch of the machine ever runs faster than 23.6/s. (Whether it runs fast depends on how far
  // the hand got ahead during a drag, so the fast stretches are reported, not asserted.)
  const tails = trains.filter(t => t.length >= 6).map(t => +(5 / (t[t.length - 1] - t[t.length - 6])).toFixed(2)); let maxWin = 0;
  trains.forEach(t => { for (let i = 0; i + 6 < t.length; i++) maxWin = Math.max(maxWin, 6 / (t[i + 6] - t[i])); });
  const heads = trains.filter(t => t.length >= 14).map(t => +((t.length - 8) / (t[t.length - 8] - t[0])).toFixed(2));
  check('6 click trains from the trace: last six steps at 11.8/s (+-10%, 30 fps clock); no 6-step window faster than 23.6/s (+10%)', tails.length > 0 && tails.every(r => r > 10.5 && r < 13.2) && maxWin < 26, { slow_tail_rates: tails, fastest_6_step_window: +maxWin.toFixed(2), head_rates_reported: heads });
} else check('5 trace.json present', false);
fs.writeFileSync(path.join(__dirname, 'tests.json'), JSON.stringify({ ran: new Date().toISOString(), failures: fail, results }, null, 1));
console.log(fail ? fail + ' FAILED' : 'ALL PASS'); process.exit(fail ? 1 : 0);
