/* test.js — model-based tests of the birthday girl's machine, through the same device and world the game uses.
   Run: node test.js   (writes traces.json and coverage.json beside it; exits 1 on any failure) */
'use strict';
const fs = require('fs'), path = require('path'), M = require('./memory.js'), S = require('./scenarios.js');
const results = []; let fails = 0;
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + detail : '')); }
function apply(W, a) { if (a[1] === 'sel') M.select(W, W.sel + 1); else if (a[1] === 'turn') M.turn(W, a[2], a[3]); else if (a[1] === 'hold') M.holdPress(W, 0); else if (a[1] === 'long') M.holdPress(W, 1); }
function run(script, dur, opt) { opt = opt || {}; const W = opt.W || M.createWorld({ seed: opt.seed || 7 }), acts = S.expand(script, W.sel), t0 = W.t; let i = 0; const per = [];
  while (W.t - t0 < dur) { while (i < acts.length && acts[i][0] <= W.t - t0) apply(W, acts[i++]); M.step(W); if (opt.each) opt.each(W); }
  return W; }
const visited = W => new Set(W.girl.samples.map(s => s.st).concat(W.girl.trans.map(t => t.to.split('.')[0])));

/* 1 · obedient-default regression: calling her, and calling again, never brings her */
for (const name of ['callOnly', 'callInGoodRoom']) { const W = run(S[name].script, S[name].dur), v = visited(W);
  check(`obedient-default: ${name} (${S[name].dur} s of calling) never produces approach or blow`, !v.has('approach') && !v.has('blow'), `states: ${[...v].join(', ')}; calls heard: ${W.log.filter(e => e.k === 'call').length}`);
  check(`calling produces refusal: ${name}`, v.has('refuse'), `first refuse at ${(W.girl.trans.find(t => t.to.startsWith('refuse')) || {}).t} s`); }
/* 2 · pushing the cake at her: she backs away or turns away, never comes */
{ const W = run(S.pushOnly.script, S.pushOnly.dur), v = visited(W), tr = W.girl.trans;
  check('push-cake: pushing the cake at her produces retreat or refusal within 1 s, never approach', (v.has('retreat') || v.has('refuse')) && !v.has('approach') && tr[0] && tr[0].t < 0.5 + 0.3 + 1.0 && ['retreat', 'refuse'].includes(tr[0].to.split('.')[0]), `first: ${tr[0] && tr[0].to} at ${tr[0] && tr[0].t} s`); }
/* 3 · waiting alone does not earn her */
{ const W = run([], 60), v = visited(W); check('wait-only: 60 s of waiting in the bright room with you standing never produces approach', !v.has('approach'), `states: ${[...v].join(', ')}`); }
/* 4 · the earned path: the changed circumstances bring her, and she blows the candles out */
const earnedW = run(S.earned.script, S.earned.dur);
{ const tr = earnedW.girl.trans, ap = tr.find(t => t.to.startsWith('approach')), bl = tr.find(t => t.to.startsWith('blow'));
  check('earned: dim + children singing + cake back and low + kneeling + waiting produces approach, then blow, all 7 candles out', ap && bl && earnedW.candles.every(c => !c), `approach ${ap && ap.t} s, blow ${bl && bl.t} s, candles out by ${earnedW.ended.toFixed(2)} s`);
  // the approach was not given: in the earned script nothing happens after 8.8 s; she chooses it at her own time
  check('earned: approach chosen after the last input (no input caused it directly)', ap && ap.t > 8.8 + 1, `last input 8.8 s, approach ${ap && ap.t} s`); }
/* 5 · the impatient player: a call while she comes stops her and turns her away; she can still come later */
const impW = run(S.impatient.script, S.impatient.dur);
{ const tr = impW.girl.trans, i = tr.findIndex(t => t.t > 13.2 && t.from.startsWith('approach') && !t.to.startsWith('approach')); const later = tr.slice(i + 1).find(t => t.to.startsWith('approach'));
  check('impatient: a call during approach makes her leave approach for refusal', i >= 0 && tr[i].to.startsWith('refuse'), i >= 0 ? `${tr[i].from} -> ${tr[i].to} at ${tr[i].t} s` : 'no interruption found');
  check('impatient: she comes again later (refusal is not absorbing)', !!later, later ? `approach again at ${later.t} s` : ''); }
/* 6 · blow interrupt: pressure while she draws breath aborts the blow (the inhale is a cuttable action window) */
{ const W = M.createWorld({ seed: 7 }); const acts = S.expand(S.earned.script); let i = 0, called = false, abort = null;
  while (W.t < 30) { while (i < acts.length && acts[i][0] <= W.t) apply(W, acts[i++]); if (!called && W.girl.st === 'blow' && W.girl.sub === 'inhale' && W.t - W.girl.blowStart > 0.2) { M.select(W, 3); M.turn(W, 'knurl', 3); called = true; } M.step(W);
    if (called && !abort && W.girl.trans.length && W.girl.trans[W.girl.trans.length - 1].from === 'blow.inhale') abort = W.girl.trans[W.girl.trans.length - 1]; }
  check('blow-interrupt: calling during the inhale cuts the blow short into refusal, candles stay lit', called && abort && abort.to.startsWith('refuse') && W.candles.some(c => c), abort ? `${abort.from} -> ${abort.to} at ${abort.t} s; candles lit ${W.candles.reduce((a, b) => a + b, 0)}` : 'not triggered'); }
/* 7 · choices conditioned on declared state: same drives and world, different declared state, different allowed choice */
{ const W = run(S.earned.script, 15.0); const base = JSON.parse(JSON.stringify(W.girl, (k, v) => k === 'rnd' ? undefined : v));
  const mk = st => { const g = Object.assign(JSON.parse(JSON.stringify(base)), { st, since: -10, rnd: W.girl.rnd }); g.u = { watch: 0.4, approach: 1.2, retreat: 0, hide: 0.2, refuse: 0, blow: -1 }; g.guards = { watch: true, approach: true, retreat: true, hide: true, refuse: true, blow: false }; return g; };
  const fromWatch = M.decide(mk('watch')), fromHide = M.decide(mk('hide')), fromRefuse = M.decide(mk('refuse'));
  check('state-conditioned: with approach the best utility, watch -> approach but hide -> watch and refuse -> watch (approach is not declared from hide or refuse)', fromWatch === 'approach' && fromHide === 'watch' && fromRefuse === 'watch', `watch->${fromWatch}, hide->${fromHide}, refuse->${fromRefuse}`);
  const g2 = mk('refuse'); g2.since = g2.t - 0.2; g2.u = { watch: 0.9, approach: -1, retreat: 0, hide: 0, refuse: 0.6, blow: -1 }; const g3 = mk('watch'); g3.since = g3.t - 0.2; g3.u = Object.assign({}, g2.u);
  check('state-conditioned: action windows — inside refusal\'s 1.6 s dwell she stays; from watch the same utilities move her', M.decide(g2) === 'refuse' && M.decide(g3) === 'watch', `refuse(dwell)->${M.decide(g2)}, watch->${M.decide(g3)}`); }
/* 8 · perception: she sees only where she faces. Turned away, she does not learn that you knelt until she looks */
{ const W = run(S.callOnly.script.slice(0, 2), 4); const g = W.girl; const before = g.wm.anaH; M.select(W, 3); M.turn(W, 'knurl', -3);   // stop calling
  M.turn(W, 'scale', 4); while (W.val.scale !== 4) M.step(W); let learnedAt = null, visMax = 0, t0 = W.t, belief5 = 0, kidsAt = null;
  while (W.t - t0 < 30) { M.step(W); if (W.t - t0 >= 5 && kidsAt == null) { kidsAt = W.t - t0; M.select(W, 2); M.turn(W, 'knurl', 3); belief5 = g.wm.anaH; }
    const near = Math.abs(g.wm.anaH - M.anaPose(W.val.scale).h) < 0.1; if (W.t - t0 < 5) visMax = Math.max(visMax, g.vis.ana); if (near && learnedAt == null) learnedAt = { t: W.t - t0, st: g.st + '.' + g.sub }; }
  check('perception: you kneel behind her back; for 5 s she does not see you (vis < 0.2) and still believes you stand; the children\'s song turns her head and then she knows', before > 1.3 && visMax < 0.2 && belief5 > 1.3 && learnedAt && learnedAt.t > 5, `belief before ${before.toFixed(2)} m, at 5 s ${belief5.toFixed(2)} m (truth ${M.anaPose(4).h.toFixed(2)}); max vis of you in 5 s ${visMax.toFixed(2)}; learned at +${learnedAt && learnedAt.t.toFixed(2)} s in ${learnedAt && learnedAt.st}`); }
/* 9 · model-based exploration: random device input; every state reached, every taken transition declared, no unintended absorbing state, locomotion continuous */
const rnd = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
/* the player's vocabulary: set a thing to a value through the device (SELECT until it is selected, then hand detents), all at once */
function setVal(W, target, ring, v) { if (ring !== 'scale') while (M.TARGETS[W.sel] !== target) M.select(W, W.sel + 1); const s = ring === 'scale' ? 'scale' : M.slot(W, ring), [lo, hi] = M.RANGES[s];
  const want = Math.max(lo, Math.min(hi, v)), n = want - W.rings[ring].target; for (let i = 0; i < Math.abs(n); i++) M.turn(W, ring, Math.sign(n));
  // a player waits for the device to finish stepping before selecting something else (SELECT abandons pending steps, as on ana's device)
  let k = 0; while (Object.values(W.rings).some(r => r.target !== r.applied) && k++ < 200) STEP(W); }
let STEP = W => M.step(W);
const MACRO = [
  W => setVal(W, 'ROOM', 'knurl', Math.floor(rnd() * 9)), W => setVal(W, 'CAKE', 'knurl', Math.floor(rnd() * 9)), W => setVal(W, 'CAKE', 'tri', Math.floor(rnd() * 9)),
  W => setVal(W, 'CHILDREN', 'knurl', Math.floor(rnd() * 4)), W => setVal(W, 'CHILDREN', 'tri', Math.floor(rnd() * 13) - 6), W => setVal(W, 'HER', 'knurl', rnd() < .5 ? 0 : Math.floor(rnd() * 7)),
  W => setVal(W, 'HER', 'knurl', 0), W => setVal(W, 'x', 'scale', Math.floor(rnd() * 13)), W => M.holdPress(W, 0), W => { if (rnd() < .2) M.holdPress(W, 1); },
  W => { const ring = ['scale', 'knurl', 'tri'][Math.floor(rnd() * 3)]; M.turn(W, ring, rnd() < .5 ? -1 : 1); }, W => M.select(W, W.sel + 1),
  W => { setVal(W, 'ROOM', 'knurl', 1); setVal(W, 'CAKE', 'knurl', 0); setVal(W, 'CAKE', 'tri', 0); setVal(W, 'CHILDREN', 'knurl', 3); setVal(W, 'HER', 'knurl', 0); setVal(W, 'x', 'scale', 4); } ];
const covered = {}, reached = new Set(), snaps = []; let undeclared = [], cont = { maxStep: 0, maxTurn: 0, maxSit: 0, teleport: 0 };
for (let run_ = 0; run_ < 200; run_++) { const W = M.createWorld({ seed: 1 + run_ }); let next = 0; let g = W.girl; let px = g.x, pz = g.z, pth = g.th, ps = g.sit;
  STEP = W => { const nT = g.trans.length; M.step(W);
    if (W.girl !== g) { g = W.girl; px = g.x; pz = g.z; pth = g.th; ps = g.sit; return; }   // switched off: the memory restarted with a new girl
    for (let k = nT; k < g.trans.length; k++) { const a = g.trans[k].from.split('.')[0], b = g.trans[k].to.split('.')[0]; if (a !== b) { covered[a + '>' + b] = (covered[a + '>' + b] || 0) + 1; if (!M.ALLOWED[a].includes(b)) undeclared.push(g.trans[k]); } }
    reached.add(g.st); const step = Math.hypot(g.x - px, g.z - pz), turn = Math.abs(M.wrap(g.th - pth)); cont.maxStep = Math.max(cont.maxStep, step); cont.maxTurn = Math.max(cont.maxTurn, turn); cont.maxSit = Math.max(cont.maxSit, Math.abs(g.sit - ps)); if (step > 0.5 * M.DT * 1.01 + 1e-6) cont.teleport++;
    px = g.x; pz = g.z; pth = g.th; ps = g.sit;
    if (rnd() < 0.004 && snaps.length < 400 && g.st !== 'blow' && !W.offAt) snaps.push(JSON.parse(JSON.stringify(W, (k, v) => k === 'rnd' || k === 'log' || k === 'samples' || k === 'trans' ? undefined : v))); };
  while (W.t < 80) { if (W.t >= next) { MACRO[Math.floor(rnd() * MACRO.length)](W); next = W.t + (rnd() < .4 ? 3 + rnd() * 12 : rnd() * 1.5); } STEP(W); } }
STEP = W => M.step(W);
M.STATES.forEach(s => check(`reachable: ${s}`, reached.has(s)));
check('declared: every transition taken in 200 random runs x 80 s is in the declared table', undeclared.length === 0, `${Object.values(covered).reduce((a, b) => a + b, 0)} transitions taken, ${undeclared.length} undeclared`);
const declared = Object.entries(M.ALLOWED).flatMap(([a, bs]) => bs.map(b => a + '>' + b)), notTaken = declared.filter(d => !covered[d]);
console.log(`coverage: ${declared.length - notTaken.length}/${declared.length} declared transitions taken by random input; not taken: ${notTaken.join(', ') || 'none'}`);
check('locomotion continuity: position moves only by walking (max 0.5 m/s), body turn <= 4.2 rad/s, sit changes <= 1/0.65 per s', cont.teleport === 0 && cont.maxTurn <= 4.2 * M.DT + 1e-6 && cont.maxSit <= M.DT / 0.65 + 1e-6, `max speed ${(cont.maxStep / M.DT).toFixed(3)} m/s, max turn ${(cont.maxTurn / M.DT).toFixed(2)} rad/s, max sit rate ${(cont.maxSit / M.DT).toFixed(2)}/s`);
/* absorbing: from each sampled snapshot, under at least one of three player policies (absolute settings through the device), she leaves her state within 40 s */
const POL = { wait: W => { if (W.hold) M.holdPress(W, 0); }, invite: W => { if (W.hold) M.holdPress(W, 0); MACRO[MACRO.length - 1](W); }, call: W => { if (W.hold) M.holdPress(W, 0); setVal(W, 'HER', 'knurl', 4); } };
let absorbing = [], exitsBy = { invite: 0, call: 0, wait: 0 };
snaps.forEach((sn, i) => { const st0 = sn.girl.st; let left = null;
  for (const p of ['wait', 'invite', 'call']) { const W = M.createWorld({ seed: 7 }); Object.assign(W, JSON.parse(JSON.stringify(sn))); W.girl.rnd = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); W.girl.trans = []; W.girl.samples = []; W.log = []; W.events = [];
    POL[p](W); const t0 = W.t; while (W.t - t0 < 40) { M.step(W); if (W.girl.st !== st0) { left = p; break; } }
    if (left) break; }
  if (left) exitsBy[left]++; else absorbing.push({ i, st: st0, sub: sn.girl.sub, t: sn.t, val: sn.val, after: sn.girl.after }); if (process.env.DUMP) fs.writeFileSync('/tmp/claude-0/-home-claude/5dcbf124-08aa-5357-a87a-ec1f490e8f81/scratchpad/stuck.json', JSON.stringify(sn)); });
check(`no unintended absorbing state: each of ${snaps.length} sampled moments leaves its state under wait, invite or call within 40 s`, absorbing.length === 0, `left by wait ${exitsBy.wait}, invite ${exitsBy.invite}, call ${exitsBy.call}; stuck ${absorbing.length}${absorbing.length ? ' e.g. ' + JSON.stringify(absorbing[0]) : ''}`);

/* 10 · critic round 1 repair condition: being pressed has a lasting cost. Seed 7. Fresh: the setup at once. Pressed: first call 6/6 for 6 s and push the cake to 112 cm, then the same setup.
   Time from the end of the setup to approach must be at least 2x the fresh time, and she must visibly differ: stop short and look back at Ana before she blows. */
function setup(W) { setVal(W, 'ROOM', 'knurl', 1); setVal(W, 'CAKE', 'knurl', 0); setVal(W, 'CAKE', 'tri', 0); setVal(W, 'CHILDREN', 'knurl', 3); setVal(W, 'HER', 'knurl', 0); setVal(W, 'x', 'scale', 4); }
function repairRun(pressed) { const W = M.createWorld({ seed: 7 }); for (let i = 0; i < 15; i++) M.step(W);
  if (pressed) { setVal(W, 'HER', 'knurl', 6); const t0 = W.t; while (W.t - t0 < 6) M.step(W); setVal(W, 'HER', 'knurl', 0); setVal(W, 'CAKE', 'knurl', 8); for (let i = 0; i < 30; i++) M.step(W); }
  const before = W.girl.trans.length; setup(W); const ts = W.t; let ap = null, pause = null, blow = null; while (W.t - ts < 120 && !blow) { M.step(W); const g = W.girl;
    for (let k = before; k < g.trans.length; k++) { const t = g.trans[k]; if (!ap && t.to.startsWith('approach')) ap = t.t - ts; if (!pause && t.to === 'approach.pause') pause = t.t - ts; if (!blow && t.to.startsWith('blow')) blow = t.t - ts; } }
  return { W, ap, pause, blow, M: W.girl.M, trace: W.girl.trans.slice(before) }; }
const fresh = repairRun(false), pressed = repairRun(true);
check('lasting cost (critic r1): after 6 s of calling at 6/6 and a 112 cm cake push, time from setup to approach >= 2x fresh', fresh.ap && pressed.ap && pressed.ap >= 2 * fresh.ap, `fresh ${fresh.ap && fresh.ap.toFixed(2)} s, pressed ${pressed.ap && pressed.ap.toFixed(2)} s (x${(pressed.ap / fresh.ap).toFixed(2)})`);
check('lasting cost (critic r1): after being pressed she stops short and looks back at Ana before she blows; fresh she does not', pressed.pause != null && pressed.blow != null && pressed.pause < pressed.blow && fresh.pause == null, `pressed: pause ${pressed.pause && pressed.pause.toFixed(2)} s, blow ${pressed.blow && pressed.blow.toFixed(2)} s; fresh: pause ${fresh.pause}, blow ${fresh.blow && fresh.blow.toFixed(2)} s`);
/* write the traces and coverage */
const pick = W => ({ transitions: W.girl.trans, samples: W.girl.samples.filter((s, i) => i % 2 === 0), inputs: W.log.filter(e => ['hand', 'select', 'hold', 'off', 'call'].includes(e.k)), candles: W.candles, ended: W.ended });
const traces = { note: 'Decision traces of the birthday girl, run headless in node through memory.js with the scripted device input in scenarios.js (seed 7). Each transition carries every utility, the guards, the drives and what she believed she had seen at that tick. Samples every 0.2 s.',
  K: M.K, earned: pick(earnedW), impatient: pick(impW), callOnly: pick(run(S.callOnly.script, S.callOnly.dur)), callInGoodRoom: pick(run(S.callInGoodRoom.script, S.callInGoodRoom.dur)), pushOnly: pick(run(S.pushOnly.script, S.pushOnly.dur)), waitOnly: pick(run([], 60)), repairFresh: { transitions: fresh.trace }, repairPressed: { transitions: pressed.trace } };
fs.writeFileSync(path.join(__dirname, 'traces.json'), JSON.stringify(traces));
fs.writeFileSync(path.join(__dirname, 'coverage.json'), JSON.stringify({ runs: 200, seconds: 80, transitionsTaken: covered, notTaken, reached: [...reached], snapshots: snaps.length, exitsBy, results }, null, 1));
console.log(`\n${results.length - fails}/${results.length} passed`); process.exit(fails ? 1 : 0);
