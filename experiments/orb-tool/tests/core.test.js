/* ORB TOOL core tests. Run: node experiments/orb-tool/tests/core.test.js  (node's built-in test runner, no installs) */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const S = require('../core/state.js'), O = require('../core/ops.js'), B = require('../core/bus.js'), M = require('../core/machine.js'), D = require('../core/devmap.js');
const H = { author: 'hand' }, A = { author: 'agent:test' };

test('op validation: bad ops are refused and change nothing', () => {
  const orb = B.createOrb(), before = JSON.stringify(orb.state());
  const bad = [{ op: 'nope' }, { op: 'set', args: { path: 'cake.flavour', value: 1 } }, { op: 'set', args: { path: 'cake.kind', value: 'x' } },
    { op: 'select', args: { target: 'moon' } }, { op: 'write', args: { text: 'x'.repeat(13) } }, { op: 'remove', args: { id: 'ghost' } },
    { op: 'breed', args: { a: 0, b: 99 } }, { op: 'accept' }, { op: 'blow' }, { op: 'load', args: { memory: { v: 1 } } }, { op: 'set', args: { path: 'scene.look', value: 'neon' } },
    { op: 'propose', args: { op: 'set', args: { path: 'nowhere', value: 1 } } }, { op: 'propose', args: { op: 'undo' } }, null, 'text',
    [{ op: 'set', args: { path: 'cake.tilt', value: 4 } }, { op: 'set', args: { path: 'bad', value: 1 } }]];
  for (const b of bad) { const r = orb.do(b, A); assert.equal(r.ok, false, JSON.stringify(b)); assert.ok(r.error); }
  assert.equal(JSON.stringify(orb.state()), before);
  assert.equal(orb.history().length, 0);
  assert.ok(orb.log().every(r => r.ok === false && r.author === 'agent:test'));
});

test('values are clamped and rounded to their range', () => {
  const orb = B.createOrb();
  orb.do({ op: 'set', args: { path: 'candles.count', value: 40 } }, A); assert.equal(orb.state().candles.count, 12);
  orb.do({ op: 'set', args: { path: 'camera.kneel', value: 3.6 } }, A); assert.equal(orb.state().camera.kneel, 4);
  orb.do({ op: 'set', args: { path: 'cake.kind', value: 3 } }, A); const s = orb.state();
  assert.equal(s.cake.stage, 4); assert.equal(s.cake.genome.form, 'dome');
  orb.do({ op: 'set', args: { path: 'candles.count', value: 2 } }, A); assert.equal(orb.state().candles.lit, 2);
});

test('undo/redo round-trip returns exactly to each state', () => {
  const orb = B.createOrb(), seen = [JSON.stringify(orb.state())];
  const ops = [{ op: 'set', args: { path: 'cake.kind', value: 1 } }, { op: 'write', args: { text: '生日快乐' } }, { op: 'candles', args: { count: 5 } }, { op: 'add', args: { kind: 'prop', propKind: 'balloon' } },
    { op: 'camera', args: { turn: -20 } }, { op: 'breed', args: { a: 0, b: 3, seed: 7 } }, { op: 'keep', args: {} }, { op: 'select', args: { target: 'child-2' } }, { op: 'hold' }];
  for (const o of ops) { assert.equal(orb.do(o, A).ok, true, o.op); seen.push(JSON.stringify(orb.state())); }
  for (let i = ops.length - 1; i >= 0; i--) { assert.equal(orb.undo().ok, true); assert.equal(JSON.stringify(orb.state()), seen[i]); }
  assert.equal(orb.undo().ok, false);
  for (let i = 1; i <= ops.length; i++) { assert.equal(orb.redo().ok, true); assert.equal(JSON.stringify(orb.state()), seen[i]); }
  orb.seek(3); assert.equal(JSON.stringify(orb.state()), seen[3]); assert.equal(orb.cursor(), 3);
  // a new op after undo drops the redo branch
  orb.do({ op: 'set', args: { path: 'scene.light', value: 2 } }, A); assert.equal(orb.history().length, 4); assert.equal(orb.redo().ok, false);
});

test('every op is logged with its author; history entries keep author and via', () => {
  const orb = B.createOrb();
  orb.propose({ op: 'set', args: { path: 'cake.kind', value: 3 } }, 'the brown dome', A);
  assert.equal(orb.state().proposals.length, 1); assert.equal(orb.state().cake.kind, -1);
  orb.do({ op: 'accept' }, H);
  const h = orb.history(); assert.equal(h[0].author, 'agent:test'); assert.equal(h[1].author, 'hand'); assert.equal(h[1].via, orb.log()[0] && 'p1');
  assert.equal(orb.state().cake.kind, 3); assert.equal(orb.state().proposals.length, 0);
  orb.propose({ op: 'candles', args: { count: 9 } }, '', A); orb.do({ op: 'reject' }, H); assert.equal(orb.state().candles.count, 7);
  assert.deepEqual(orb.log().map(r => r.author), ['agent:test', 'hand', 'agent:test', 'hand']);
});

test('the hand turns an agent ghost (amend) before accepting it', () => {
  const orb = B.createOrb();
  orb.do({ op: 'select', args: { target: 'candles' } }, H);
  orb.propose({ op: 'set', args: { path: 'candles.count', value: 9 } }, 'nine?', A);
  D.turn(orb, 2, -2, { gesture: 'g1' });                     // KNURL on candles -> amends the ghost to 7
  assert.equal(orb.state().proposals[0].args.value, 7); assert.equal(orb.state().candles.count, 7);
  D.press(orb, 'accept', false); assert.equal(orb.state().candles.count, 7); assert.equal(orb.state().proposals.length, 0);
});

test('replay determinism: the log rebuilds the same state, twice', () => {
  const orb = B.createOrb();
  orb.do({ op: 'breed', args: { a: 1, b: 4, seed: 42 } }, A); orb.do({ op: 'add', args: { kind: 'child' } }, A);
  for (let k = 0; k < 6; k++) D.turn(orb, 0, 1, { gesture: 'drag-1' });
  orb.undo(); orb.redo(); orb.undo(); orb.do({ op: 'make', args: { to: 2 } }, H); orb.do({ op: 'snapshot', args: { name: 'half' } }, H); orb.do({ op: 'nope' }, A);
  const s = JSON.stringify(orb.state()), log = orb.log();
  const r1 = B.replay(log), r2 = B.replay(JSON.parse(JSON.stringify(log)));
  assert.equal(JSON.stringify(r1.state()), s); assert.equal(JSON.stringify(r2.state()), s);
  assert.equal(r1.history().length, orb.history().length); assert.equal(r1.cursor(), orb.cursor());
  // save / load as JSON
  const saved = JSON.parse(JSON.stringify(orb.save())), other = B.createOrb();
  assert.equal(other.load(saved).ok, true); assert.equal(JSON.stringify(other.state()), s); other.undo(); assert.equal(JSON.stringify(other.state()), JSON.stringify(S.empty()));
});

test('device -> op mapping: rings follow the selection, a drag is one undo, buttons map to ops', () => {
  const orb = B.createOrb();
  assert.equal(D.role(orb.raw(), 2).path, 'cake.kind'); assert.equal(D.role(orb.raw(), 3).path, 'cake.tilt'); assert.equal(D.role(orb.raw(), 0).path, 'camera.yaw');
  for (let k = 0; k < 4; k++) D.turn(orb, 2, 1, { gesture: 'g' });  // -1 -> 3: the brown dome
  assert.equal(orb.state().cake.kind, 3); assert.equal(orb.history().length, 1); assert.equal(orb.history()[0].author, 'hand');
  orb.undo(); assert.equal(orb.state().cake.kind, -1); orb.redo();
  D.turn(orb, 0, -4); assert.equal(orb.state().camera.yaw, -20);
  D.turn(orb, 0, -40); assert.equal(orb.state().camera.yaw, 140);  // the scale ring wraps: -220 is 140
  const order = ['make', 'inscription', 'candles', 'child-1', 'child-2', 'child-3', 'room', 'cake'];
  for (const t of order) { D.press(orb, 'select', false); assert.equal(orb.state().selection, t); }
  D.press(orb, 'select', false); D.press(orb, 'select', false); D.press(orb, 'select', false); D.press(orb, 'select', false); // child-1
  assert.equal(D.role(orb.raw(), 2).path, 'people.child-1.arrived'); D.turn(orb, 2, 10); assert.equal(orb.state().people[0].arrived, 10); assert.equal(orb.state().table.up, 1);
  D.turn(orb, 3, -3); assert.equal(orb.state().people[0].offset, -3);
  D.press(orb, 'hold', false); assert.equal(orb.state().time.hold, true); D.press(orb, 'hold', false); assert.equal(orb.state().time.hold, false);
  D.press(orb, 'hold', true); assert.equal(orb.state().time.off, true); D.press(orb, 'hold', false); assert.equal(orb.state().time.off, false);
  assert.equal(D.press(orb, 'accept', false).ok, false);
  const n = orb.state().library.length; D.press(orb, 'breed', false); assert.equal(orb.state().cake.kind, -2); D.press(orb, 'keep', false); assert.equal(orb.state().library.length, n + 1);
  // room: the triangles ring cycles the place
  while (orb.state().selection !== 'room') D.press(orb, 'select', false);
  D.turn(orb, 3, 1); assert.equal(orb.state().scene.place, 'room'); D.turn(orb, 3, 2); assert.equal(orb.state().scene.place, 'dome');
  // every ring has a role for every selection
  for (const sel of S.SELECTIONS) { const st = orb.state(); st.selection = sel; for (let r = 0; r < 4; r++) assert.ok(D.role(st, r), sel + ' ring ' + r); }
});

test('the machine: first step at once, then 11.8 a second toward the target', () => {
  const orb = B.createOrb(), mc = M.create(orb), steps = [];
  orb.on('step', (p, v, f) => steps.push([p, v, f]));
  orb.do({ op: 'set', args: { path: 'inscription.written', value: 4 } }, H);
  assert.equal(orb.view().inscription.written, 1, 'first step visible at once');
  mc.tick(1 / 11.8 - 1e-6); assert.equal(orb.view().inscription.written, 1);
  mc.tick(2e-6); assert.equal(orb.view().inscription.written, 2);
  mc.tick(2 / 11.8); assert.equal(orb.view().inscription.written, 4); assert.equal(steps.length, 4); assert.ok(steps.every(s => !s[2]));
  orb.do({ op: 'set', args: { path: 'inscription.written', value: 24 } }, H); mc.tick(1 / 23.6 + 1e-6); assert.ok(steps[steps.length - 1][2], 'fast when far');
  mc.tick(5); assert.equal(orb.view().inscription.written, 24); assert.equal(orb.state().inscription.written, 24);
  orb.seek(0); assert.equal(orb.view().inscription.written, 0, 'scrubbing snaps');
});

test('a whole birthday, from nothing to the blow, through ops only', () => {
  const orb = B.createOrb(), ag = { author: 'agent:builder' };
  const r = orb.do([{ op: 'look', args: { place: 'dome', light: 4 } }, { op: 'select', args: { target: 'make' } }], ag); assert.equal(r.ok, true);
  for (let k = 0; k < 4; k++) assert.equal(orb.do({ op: 'make' }, H).ok, true);
  assert.equal(orb.do({ op: 'make' }, H).ok, false, 'a finished cake cannot be made further');
  orb.do({ op: 'set', args: { path: 'cake.kind', value: 3 } }, ag);
  orb.do({ op: 'write', args: { text: '生日快乐' } }, ag);
  orb.do({ op: 'candles', args: { count: 7 } }, ag);
  orb.propose({ op: 'camera', args: { kneel: 8, turn: -20 } }, 'kneel as Ana does', ag); orb.do({ op: 'accept' }, H);
  for (const id of ['child-1', 'child-2', 'child-3']) { orb.do({ op: 'select', args: { target: id } }, H); D.turn(orb, 2, 10, { gesture: id }); }
  orb.do({ op: 'hold' }, H); orb.do({ op: 'snapshot', args: { name: 'before the blow' } }, H);
  orb.do({ op: 'release' }, H);
  const s = orb.state();
  assert.equal(s.cake.stage, 4); assert.equal(s.library[s.cake.kind].name, 'brown dome'); assert.equal(s.inscription.written, 24);
  assert.equal(s.candles.lit, 0); assert.equal(s.time.blown, true); assert.equal(s.table.up, 1); assert.equal(s.camera.yaw, -20); assert.equal(s.camera.kneel, 8);
  assert.ok(s.people.every(p => p.arrived === 10)); assert.equal(s.marks[0].name, 'before the blow');
  const d = orb.describe(); assert.match(d, /brown dome/); assert.match(d, /blown out/); assert.match(d, /生日快乐/);
  const authors = new Set(orb.history().map(h => h.author)); assert.ok(authors.has('hand') && authors.has('agent:builder'));
  assert.equal(JSON.stringify(B.replay(orb.log()).state()), JSON.stringify(s));
  orb.do({ op: 'switchOff' }, H); assert.match(orb.describe(), /switched off/);
});

test('every op answers in words: log labels for ops, undo and refusals', () => {
  const orb = B.createOrb(), seen = [];
  orb.on('log', r => seen.push(r.ok ? r.author + ': ' + r.label : 'refused ' + r.error));
  orb.do({ op: 'candles', args: { count: 5 } }, A); orb.do({ op: 'set', args: { path: 'cake.kind', value: 3 } }, H); orb.undo(); orb.do({ op: 'blow' }, A);
  assert.equal(seen[0], 'agent:test: candles 5'); assert.equal(seen[1], 'hand: cake.kind 3'); assert.match(seen[2], /^hand: undid cake\.kind 3; brought back cake\.kind -1, cake\.stage 0/); assert.match(seen[3], /^refused blow: there is no cake/);
  assert.ok(orb.history().every(h => typeof h.t === 'number'));
  const moves = []; orb.on('seek', (n, from) => moves.push([n, from])); orb.redo(); orb.seek(0); assert.deepEqual(moves, [[2, 1], [0, 2]]);
});

test('press length is timed by event timestamps: a tap handled late stays a tap', () => {
  assert.equal(D.isLong(1000, 1120), false); assert.equal(D.isLong(1000, 1649), false); assert.equal(D.isLong(1000, 1650), true);
  // the device file decides from the events' own stamps, not from when the handler runs
  const src = require('fs').readFileSync(require('path').join(__dirname, '../core/device.js'), 'utf8');
  assert.match(src, /ts: e\.timeStamp/); assert.match(src, /DM\.isLong\(H\.ts/);
});

test('ghosts of candles, camera and look turn on the rings like set ghosts; HOLD accepts a waiting ghost', () => {
  const orb = B.createOrb();
  orb.do({ op: 'select', args: { target: 'candles' } }, H);
  orb.propose({ op: 'candles', args: { count: 9 } }, 'nine', A);
  D.turn(orb, 2, -3, { gesture: 'c' }); assert.equal(orb.state().proposals[0].args.count, 6); assert.equal(orb.state().candles.count, 7);
  D.press(orb, 'hold', false); assert.equal(orb.state().candles.count, 6); assert.equal(orb.state().time.hold, false, 'HOLD accepted, it did not hold');
  orb.propose({ op: 'camera', args: { kneel: 8 } }, '', A); D.turn(orb, 1, -5); assert.equal(orb.state().proposals[0].args.kneel, 3); assert.equal(orb.state().camera.kneel, 6);
  D.press(orb, 'accept', true); assert.equal(orb.state().proposals.length, 0); assert.equal(orb.state().camera.kneel, 6);
  D.press(orb, 'hold', false); assert.equal(orb.state().time.hold, true, 'with no ghost HOLD holds');
});

test('a ghost made of several steps is one proposal and shows only where it ends; the state is untouched until accepted', () => {
  const orb = B.createOrb(), before = JSON.stringify(Object.assign(orb.state(), { proposals: [] }));
  orb.do({ op: 'make', args: { to: 1 } }, H);
  const r = orb.propose({ ops: [{ op: 'set', args: { path: 'cake.kind', value: 3 } }, { op: 'set', args: { path: 'cake.stage', value: 1 } }] }, 'brown dome, keep making', A);
  assert.equal(r.ok, true); const s = orb.state(); assert.equal(s.proposals.length, 1); assert.equal(s.proposals[0].op, 'batch'); assert.equal(s.cake.kind, -1);
  const g = O.ghostState(s, s.proposals[0]); assert.equal(g.cake.stage, 1); assert.equal(g.cake.genome.form, 'dome'); assert.equal(orb.state().cake.stage, 1);
  orb.do({ op: 'accept' }, H); assert.equal(orb.state().cake.kind, 3); assert.equal(orb.state().cake.stage, 1);
  assert.equal(orb.do({ op: 'propose', args: { ops: [{ op: 'undo' }] } }, A).ok, false); assert.ok(before);
});

// ---- AUDIT.md section R, one test each where the core can carry it
test('R1 never start empty: the birthday start is whole, and from an empty start the first detent of any ring makes something', () => {
  const b = S.birthday(); assert.equal(b.cake.stage, 4); assert.equal(b.cake.kind, 3); assert.equal(b.inscription.written, 24); assert.equal(b.candles.lit, 7); assert.equal(b.table.up, 1); assert.ok(b.people.every(p => p.arrived === 10));
  for (const sel of S.SELECTIONS) for (let r = 2; r < 4; r++) { const orb = B.createOrb(); orb.do({ op: 'select', args: { target: sel } }, H);
    const res = D.turn(orb, r, 1); assert.equal(res.ok, true, sel + ' ring ' + (r + 1)); assert.ok(!res.same, sel + ' ring ' + (r + 1) + ' changed something'); }
  const orb = B.createOrb(); orb.do({ op: 'select', args: { target: 'inscription' } }, H); const res = D.turn(orb, 2, 1); assert.equal(orb.state().cake.stage, 4); assert.match(res.retarget, /made one/);
});

test('R2 every ring moves something visible: re-targets, and selecting frames the selection', () => {
  const orb = B.createOrb({ state: S.birthday() });
  for (const sel of S.SELECTIONS) { orb.do({ op: 'select', args: { target: sel } }, H);
    for (let r = 0; r < 4; r++) { const a = D.turn(orb, r, 1), b = a.ok && !a.same ? a : D.turn(orb, r, -1); assert.ok(b.ok && !b.same, sel + ' ring ' + (r + 1)); } }
  orb.do({ op: 'select', args: { target: 'child-2' } }, H); assert.equal(orb.state().camera.focus, 'child-2');
  orb.do({ op: 'select', args: { target: 'candles' } }, H); assert.equal(orb.state().camera.focus, 'cake');
  const e = B.createOrb(); e.do({ op: 'set', args: { path: 'cake.kind', value: 0 } }, H); e.do({ op: 'select', args: { target: 'child-1' } }, H);
  D.turn(e, 3, 2); assert.equal(e.state().people[0].arrived, 2, 'her time with her absent brings her in');
  e.do({ op: 'switchOff' }, H); D.turn(e, 0, 1); assert.equal(e.state().time.off, false, 'a ring on a dark memory switches it on');
});

test('R5 + R7 the device: no text under 13 units, touch targets of 44 px or more at 390 px wide', () => {
  const vm = require('vm'), fs = require('fs'), path = require('path'), g = { CORE_STATE: S, CORE_OPS: O, CORE_DEVMAP: D };
  g.window = g; vm.createContext(g); vm.runInContext(fs.readFileSync(path.join(__dirname, '../core/device.js'), 'utf8'), g);
  const DV = g.CORE_DEVICE, scale = Math.min(390 / DV.DW, (390 * DV.DH / DV.DW + 6) / DV.DH) * .98;
  assert.ok(DV.MINFONT * scale >= 12, 'smallest text ' + (DV.MINFONT * scale).toFixed(1) + ' px');
  const src = fs.readFileSync(path.join(__dirname, '../core/device.js'), 'utf8'); const sizes = [...src.matchAll(/'(?:[0-9]{3} )?([0-9.]+)px /g)].map(m => +m[1]); assert.ok(sizes.every(px => px >= DV.MINFONT), 'fixed sizes ' + sizes);
  assert.ok(DV.HIT * 2 * scale >= 44, 'button target ' + (DV.HIT * 2 * scale).toFixed(1) + ' px');
  for (const [x0, x1] of DV.RINGS) assert.ok((x1 - x0) * scale >= 44);
  const b = Object.values(DV.BTN); for (const p of b) for (const q of b) if (p !== q) assert.ok(Math.hypot(p.cx - q.cx, p.cy - q.cy) * scale >= 44, 'buttons too close');
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'); assert.match(html, /min-height: 44px/); assert.match(html, /#strip \{ flex: 0 0 44px/);
});

test('R6 the governor: two slow paints coarsen, it says so, good paints give the level back', () => {
  const G = require('../core/governor.js').create({ fastFrames: 5 });
  assert.equal(G.sample(50).changed, false); const r = G.sample(60); assert.equal(r.changed, true); assert.equal(r.level, 1); assert.match(r.say, /THINNED/);
  G.sample(80); assert.equal(G.sample(80).level, 2); G.sample(90); G.sample(90); assert.equal(G.level, 2, 'no further than the last level');
  let back; for (let k = 0; k < 5; k++) back = G.sample(10); assert.equal(back.level, 1); assert.equal(back.changed, true);
});

test('R8 the undo journal says what it brought back; replay from a non-empty start is exact', () => {
  const orb = B.createOrb({ state: S.birthday() }); orb.do({ op: 'candles', args: { count: 3 } }, A); const u = orb.undo();
  assert.match(u.label, /^undid candles 3; brought back candles\.count 7, candles\.lit 7$/);
  orb.do({ op: 'blow' }, H); const sv = JSON.parse(JSON.stringify(orb.save()));
  assert.equal(JSON.stringify(B.replay(sv).state()), JSON.stringify(orb.state()));
});

test('R10 every made thing names its source; the memory carries its tests; the ledger keeps proposals and answers', () => {
  const orb = B.createOrb();
  orb.do({ op: 'breed', args: { a: 1, b: 3, seed: 5 } }, A); assert.deepEqual(orb.state().cake.source, { by: 'agent:test', from: 'bred from mint x brown dome, seed 5' });
  orb.do({ op: 'keep', args: { name: 'mint dome' } }, H); assert.match(orb.state().library[5].source, /^kept by hand from bred from mint x brown dome/);
  orb.do({ op: 'set', args: { path: 'cake.kind', value: 3 } }, H); assert.match(orb.state().cake.source.from, /^brown dome \(film:/);
  orb.do({ op: 'add', args: { kind: 'prop', propKind: 'balloon' } }, A); assert.equal(orb.state().props[0].source.by, 'agent:test');
  D.turn(orb, 2, 0); orb.do({ op: 'select', args: { target: 'child-1' } }, H); D.turn(orb, 2, 10); assert.equal(orb.state().people[0].source.by, 'hand');
  let t = orb.tests(); const by = n => t.find(x => x.name === n);
  assert.equal(by('whole cake made').pass, true); assert.equal(by('no faces').pass, true); assert.equal(by('film-bar match').pass, false); assert.equal(by('film-bar match').value, null);
  assert.equal(by('every made thing names its source').pass, true, by('every made thing names its source').value);
  orb.do({ op: 'measure', args: { test: 'film-bar match', value: 0.72, note: 'strip at 146 s' } }, 'agent:critic' && { author: 'agent:critic' });
  t = orb.tests(); assert.equal(by('film-bar match').pass, true); assert.match(by('film-bar match').note, /agent:critic/);
  assert.ok(orb.save().tests.length === 4 && orb.save().tests.every(x => 'value' in x && 'bar' in x && 'pass' in x));
  assert.ok(S.birthday().people.every(p => p.source && p.source.by === 'film'));
  orb.propose({ op: 'candles', args: { count: 9 } }, 'nine', A); orb.do({ op: 'reject' }, H); assert.deepEqual(orb.ledger().map(r => r.op), ['propose', 'reject']);
});
