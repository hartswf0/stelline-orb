/* ORB TOOL agent tests (node). Run: node experiments/orb-tool/tests/agent.test.js
   The command language against the real core bus: every documented example parses, compiles to valid ops,
   a full birthday is made from nothing to the blow by text alone, errors are helpful, describe() tracks it,
   proposals work as ghosts, and the JSON-RPC bridge answers tools/list and tools/call. */
'use strict';
const assert = require('assert');
const path = require('path');
const C = require(path.join(__dirname, '../agent/commands.js'));
const D = require(path.join(__dirname, '../agent/describe.js'));
const BUS = require(path.join(__dirname, '../core/bus.js'));
let bridge = null; try { bridge = require(path.join(__dirname, '../agent/bridge.js')); } catch (e) { }

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + e.message); } }
const isOp = r => r && typeof r.op === 'string';
function run(orb, line, author) {
  const r = C.parse(line, orb.state());
  if (r.error) throw new Error(line + ' -> ' + r.error);
  if (!isOp(r) && !Array.isArray(r)) return r;
  const res = orb.do(r, { author: author || 'agent:test' });
  if (!res.ok) throw new Error(line + ' -> refused: ' + res.error + ' ' + JSON.stringify(r));
  return res; }

test('every example in the brief parses to ops the core accepts', () => {
  const orb = BUS.createOrb();
  for (const l of ['cake target brown-dome', 'make sponge', 'candles 7', 'write 生日快乐', 'kneel 0.4', 'turn -20', 'child 2 later 0.5', 'hold', 'blow', 'undo']) run(orb, l);
});

test('a full birthday from nothing to the blow by text alone', () => {
  const orb = BUS.createOrb(); D.install(orb);
  const script = ['table up', 'cake target brown-dome', 'make sponge', 'make', 'make', 'make', 'write 生日快乐', 'candles 7', 'kneel 0.4', 'turn -20',
    'child 1 arrive', 'child 2 arrive', 'child 2 later 0.5', 'child 3 arrive', 'hold', 'release'];
  for (const l of script) run(orb, l);
  const s = orb.state();
  assert.strictEqual(s.cake.kind, 3, 'brown dome is library 3');
  assert.strictEqual(s.cake.stage, 4); assert.strictEqual(s.inscription.written, 24); assert.strictEqual(s.candles.count, 7);
  assert.strictEqual(s.camera.kneel, 4); assert.strictEqual(s.camera.yaw, -20); assert.strictEqual(s.people[1].offset, 12);
  assert.strictEqual(s.time.blown, true, 'release with all three there blows the candles'); assert.strictEqual(s.candles.lit, 0);
  assert.ok(/BLOWN/.test(orb.describe()), orb.describe().split('\n')[0]);
});

test('cake target keeps the making stage; cake <name> is the whole cake (the film swap)', () => {
  const orb = BUS.createOrb();
  run(orb, 'cake target mint'); assert.strictEqual(orb.state().cake.stage, 0); assert.strictEqual(orb.state().cake.genome.side, '#8fd0bd');
  run(orb, 'make sponge'); assert.strictEqual(orb.state().cake.stage, 1);
  run(orb, 'cake brown dome'); assert.strictEqual(orb.state().cake.kind, 3);
  run(orb, 'cake none'); assert.strictEqual(orb.state().cake.stage, 0);
});

test('a line of several commands is one history entry, and one undo takes it back', () => {
  const orb = BUS.createOrb();
  run(orb, 'table up; cake mint; candles 5');
  assert.strictEqual(orb.history().length, 1);
  run(orb, 'undo'); const s = orb.state(); assert.strictEqual(s.table.up, 0); assert.strictEqual(s.cake.kind, -1); assert.strictEqual(s.candles.count, 7);
});

test('errors say what was expected', () => {
  const st = BUS.createOrb().state();
  const cases = [['cnadles 7', /Did you mean candles/], ['candles 20', /0 to 12; you wrote 20/], ['cake target purple', /no cake called purple/], ['cake target bown dome', /Did you mean brown dome/],
    ['child 9 arrive', /no child-9/], ['kneel 14', /0 to 10/], ['make soup', /make sponge/], ['accept', /nothing is proposed/], ['write', /write what/], ['place moon', /place dome/],
    ['frobnicate', /Type help/], ['{"op":', /does not parse/], ['write 一二三四五六七八九十一二三', /12 characters/]];
  for (const [l, re] of cases) { const r = C.parse(l, st); assert.ok(r.error, l + ' should be an error'); assert.ok(re.test(r.error), l + ' -> ' + r.error); }
});

test('help lists every command family and help <cmd> narrows', () => {
  const h = C.parse('help').help; for (const w of ['cake', 'make', 'write', 'candles', 'child', 'turn', 'kneel', 'hold', 'blow', 'propose', 'undo']) assert.ok(h.includes(w), 'help mentions ' + w);
  assert.ok(/later/.test(C.parse('help child').help)); assert.ok(/turn/.test(C.parse('help kneel').help));
});

test('kneel: a decimal 0..1 is a share of the scale, whole numbers are steps', () => {
  assert.deepStrictEqual(C.parse('kneel 0.4').args, { kneel: 4 }); assert.deepStrictEqual(C.parse('kneel 7').args, { kneel: 7 }); assert.deepStrictEqual(C.parse('kneel 1').args, { kneel: 1 }); assert.deepStrictEqual(C.parse('kneel 1.0').args, { kneel: 10 });
});

test('propose makes ghosts; amend turns one; accept applies it with the author recorded; reject drops one', () => {
  const orb = BUS.createOrb();
  run(orb, 'propose candles 5 -- five for the five-year-old', 'agent:claude');
  run(orb, 'propose turn 30', 'agent:claude');
  let s = orb.state(); assert.strictEqual(s.proposals.length, 2); assert.strictEqual(s.candles.count, 7, 'a ghost changes nothing yet');
  assert.strictEqual(s.proposals[0].note, 'five for the five-year-old');
  const p1 = s.proposals[0].id;
  run(orb, 'amend ' + p1 + ' 6', 'hand'); assert.strictEqual(orb.state().proposals[0].args.count, 6);
  run(orb, 'accept', 'hand'); s = orb.state(); assert.strictEqual(s.candles.count, 6); assert.strictEqual(s.proposals.length, 1);
  const h = orb.history(); assert.strictEqual(h[h.length - 1].author, 'hand'); assert.strictEqual(h[h.length - 1].via, p1);
  run(orb, 'reject', 'hand'); assert.strictEqual(orb.state().proposals.length, 0); assert.strictEqual(orb.state().camera.yaw, 0);
});

test('a command of several steps is ONE batch ghost; accepting it applies them together with no flash of the whole cake', () => {
  const orb = BUS.createOrb(); const seen = [];
  orb.on('change', s => seen.push(s.cake.stage));
  run(orb, 'propose cake target brown-dome -- her brown dome', 'agent:claude');
  let s = orb.state(); assert.strictEqual(s.proposals.length, 1); assert.strictEqual(s.proposals[0].op, 'batch');
  assert.deepStrictEqual(s.proposals[0].args.ops.map(o => o.args.path), ['cake.kind', 'cake.stage']);
  assert.ok(/brown dome, then/.test(C.say({ op: 'propose', args: s.proposals[0].args.ops ? { ops: s.proposals[0].args.ops } : {} }, s)));
  seen.length = 0; run(orb, 'accept', 'hand'); s = orb.state();
  assert.strictEqual(s.cake.kind, 3); assert.strictEqual(s.cake.stage, 0); assert.ok(!seen.includes(4), 'no change event shows stage 4');
  assert.strictEqual(orb.history().length, 2, 'propose + accept: the batch is one history entry');
  run(orb, 'propose children arrive', 'agent:claude'); assert.strictEqual(orb.state().proposals.length, 1); assert.strictEqual(orb.state().proposals[0].op, 'batch');
  assert.ok(/several steps/.test(C.parse('amend', orb.state()).error || C.parse('amend p' + orb.state().proposals[0].id.slice(1) + ' 3', orb.state()).error));
  run(orb, 'accept', 'hand'); assert.ok(orb.state().people.every(p => p.arrived === 10));
});

test('propose with several commands makes several ghosts', () => {
  const orb = BUS.createOrb(); run(orb, 'propose table up; cake mint'); assert.strictEqual(orb.state().proposals.length, 2);
});

test('describe: status line, what is missing with the command for each, pending, and what the person last did', () => {
  const orb = BUS.createOrb(); D.install(orb);
  let d = orb.describe(); assert.ok(/^MEMORY MAKING/.test(d)); assert.ok(/there is no cake/.test(d)); assert.ok(/NEXT: table up/.test(d));
  run(orb, 'table up', 'hand'); run(orb, 'cake target brown-dome; make sponge'); run(orb, 'propose write 生日快乐');
  d = orb.describe();
  assert.ok(/only sponge/.test(d), d); assert.ok(/PENDING/.test(d) && /write/.test(d)); assert.ok(/the person last: table.up/.test(d), d);
  // every NEXT suggestion is itself a command that parses and applies: follow NEXT until blown
  const o2 = BUS.createOrb(); D.install(o2); let guard = 0;
  while (!o2.state().time.blown && guard++ < 30) { const next = o2.describe().match(/NEXT: (.*)/)[1]; run(o2, next); }
  assert.ok(o2.state().time.blown, 'following NEXT reaches the blow (' + guard + ' steps)');
});

test('JSON ops pass through; set and nudge work', () => {
  const orb = BUS.createOrb(); run(orb, '{"op":"set","args":{"path":"scene.light","value":3}}'); assert.strictEqual(orb.state().scene.light, 3);
  run(orb, 'set camera.yaw 45'); assert.strictEqual(orb.state().camera.yaw, 45); run(orb, 'nudge cake.tilt 2'); assert.strictEqual(orb.state().cake.tilt, 2);
});

test('the rest of the language compiles and applies', () => {
  const orb = BUS.createOrb();
  for (const l of ['cake tilt 4', 'cake form dome', 'cake side chocolate', 'cake top #ffcc88', 'cake dots 0.5', 'cake layers 2', 'cake height 0.12', 'breed mint brown-dome 7', 'keep my cake',
    'ink 12', 'light 3', 'candles out', 'light all', 'add child 0.9 -0.3', 'add prop balloon 0.4 -0.2 1.5', 'focus prop-1', 'remove prop-1', 'yaw 30', 'stand', 'kneel',
    'place room', 'look holo', 'brightness 0.7', 'select candles', 'next', 'previous', 'mark start', 'children arrive', 'child 1 earlier 0.25', 'child 3 at 0.3 -0.6', 'child 3 gone',
    'switch off', 'on', 'let go', 'redo', 'reset']) { try { run(orb, l); } catch (e) { if (!/nothing to redo/.test(e.message)) throw e; } }
});

if (bridge && bridge.createServer) test('bridge: initialize, tools/list, tools/call run against an orb', () => {
  const orb = BUS.createOrb(); D.install(orb);
  const srv = bridge.createServer(orb, { commands: C });
  const out = [];
  const call = (method, params) => { const r = srv.handle({ jsonrpc: '2.0', id: out.length + 1, method, params }); out.push(r); return r; };
  const init = call('initialize', {}); assert.ok(init.result.serverInfo.name);
  const list = call('tools/list', {}); const names = list.result.tools.map(t => t.name); for (const n of ['orb_describe', 'orb_command', 'orb_do', 'orb_propose', 'orb_state']) assert.ok(names.includes(n), n);
  const r = call('tools/call', { name: 'orb_command', arguments: { line: 'table up; candles 7' } }); assert.ok(!r.result.isError, JSON.stringify(r));
  assert.strictEqual(orb.state().table.up, 1);
  const bad = call('tools/call', { name: 'orb_command', arguments: { line: 'cnadles 3' } }); assert.ok(bad.result.isError); assert.ok(/candles/.test(bad.result.content[0].text));
  const d = call('tools/call', { name: 'orb_describe', arguments: {} }); assert.ok(/MEMORY/.test(d.result.content[0].text));
  const u = call('nosuch', {}); assert.strictEqual(u.error.code, -32601);
});

test('proposals are turnable sets on ring paths, and a ring turn on the device amends the ghost', () => {
  const DM = require(path.join(__dirname, '../core/devmap.js'));
  const orb = BUS.createOrb();
  run(orb, 'propose kneel 0.4; turn -20; make', 'agent:claude');
  const ps = orb.state().proposals; assert.deepStrictEqual(ps.map(p => p.args.path), ['camera.kneel', 'camera.yaw', 'cake.stage']);
  DM.turn(orb, 1, 2, { author: 'hand' }); assert.strictEqual(orb.state().proposals[0].args.value, 6, 'the KNEEL ring raised the ghost from 4 to 6');
  DM.press(orb, 'accept', false); assert.strictEqual(orb.state().camera.kneel, 6);
  DM.press(orb, 'accept', true); assert.strictEqual(orb.state().camera.yaw, 0, 'a long ACCEPT dismissed the turn');
  assert.ok(/change nothing/.test(C.parse('propose table down', orb.state()).error), 'a ghost that changes nothing is not proposed');
});

async function asyncTests() {
  if (!bridge) return;
  const orb = BUS.createOrb(); D.install(orb); const srv = bridge.createServer(orb, { commands: C });
  const call = (name, args) => srv.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  try {
    const r = call('orb_propose', { line: 'kneel 0.4', note: 'lower', author: 'agent:claude' }); const id = r.result.content[0].text.match(/proposed: (p\d+)/)[1];
    const wait = call('orb_await_decision', { id, timeout_ms: 2000 });
    setTimeout(() => { orb.do({ op: 'amend', args: { id, args: { value: 7 } } }, { author: 'hand' }); orb.do({ op: 'accept', args: { id } }, { author: 'hand' }); }, 50);
    const t = (await wait).result.content[0].text; assert.ok(/accepted .* by the person/.test(t) && /turned it/.test(t), t);
    const r2 = call('orb_propose', { line: 'turn 90' }); const id2 = r2.result.content[0].text.match(/proposed: (p\d+)/)[1];
    setTimeout(() => orb.do({ op: 'reject', args: {} }, { author: 'hand' }), 30);
    const t2 = (await call('orb_await_decision', { id: id2, timeout_ms: 2000 })).result.content[0].text; assert.ok(/dismissed/.test(t2), t2);
    pass++; console.log('ok   bridge: orb_await_decision reports an adjusted accept and a dismissal');
  } catch (e) { fail++; console.log('FAIL bridge await\n     ' + e.message); } }

asyncTests().then(() => { console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); });
