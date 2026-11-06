/* ORB TOOL scene tests.
   node experiments/orb-tool/tests/scene.test.js            node checks (no browser): the state -> module mapping and the making
   node experiments/orb-tool/tests/scene.test.js --browser  also: every op changes the rendered frame within one frame (headless Chromium,
                                                            the scene bench), and the frame time at 390x844. Needs a static server on the
                                                            repo root at $ORB_URL (default http://localhost:8765). Writes nothing in the repo. */
'use strict';
const path = require('path'), assert = require('assert');
const ROOT = path.resolve(__dirname, '../../..');
const T = require(path.join(ROOT, 'ana/assets/three.min.js'));
const CAKE = require(path.join(ROOT, 'experiments/swarms/evolve-all/modules/cake.js'));
const CANDLES = require(path.join(ROOT, 'experiments/swarms/evolve-all/modules/candles.js'));
const INS = require(path.join(ROOT, 'experiments/swarms/evolve-all/modules/inscription.js'));
const TABLE = require(path.join(ROOT, 'experiments/swarms/evolve-all/modules/table.js'));
const GN = require(path.join(ROOT, 'experiments/orb-tool/scene/genomes.js'));
const S = require(path.join(ROOT, 'experiments/orb-tool/core/state.js'));
let pass = 0, fail = 0; const ok = (name, fn) => { try { fn(); pass++; console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ': ' + e.message); } };
const visibleMeshes = o => { let n = 0; o.traverse(x => { if ((x.isMesh || x.isInstancedMesh) && x.visible) { let p = x; while (p && p.visible) p = p.parent; if (!p) n++; } }); return n; };
const named = (M, G) => Object.fromEntries(M.genes.map((g, i) => [g[0], G[i]]));

/* ------------------------------------------------------------------ node checks */
ok('every film cake maps to genes inside the module ranges', () => {
  for (const c of S.FILM_CAKES) { const G = GN.cakeGenes(CAKE, c.genome); CAKE.genes.forEach((g, i) => assert(G[i] >= g[2] - 1e-9 && G[i] <= g[3] + 1e-9, c.name + ' ' + g[0] + ' ' + G[i])); } });
ok('colours survive the mapping (state sRGB -> module CIELAB -> sRGB within 2 levels)', () => {
  for (const c of S.FILM_CAKES) { const G = named(CAKE, GN.cakeGenes(CAKE, c.genome)), cols = CAKE.colours(GN.cakeGenes(CAKE, c.genome));
    const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); hx(c.genome.top).forEach((v, i) => assert(Math.abs(v - cols.top[i]) <= 2, c.name + ' top ' + cols.top)); hx(c.genome.side).forEach((v, i) => assert(Math.abs(v - cols.side[i]) <= 2, c.name + ' side')); void G; } });
ok('the brown dome is a dome, the drums are not; the height ratio is height / diameter', () => {
  for (const c of S.FILM_CAKES) { const g = named(CAKE, GN.cakeGenes(CAKE, c.genome)); assert.strictEqual(g.dome > .5, c.genome.form === 'dome', c.name); assert(Math.abs(g.height - c.genome.height / (2 * c.genome.radius)) < 1e-9); } });
ok('the making shows: each cake stage adds visible parts and nothing is visible at stage 0', () => {
  for (const c of S.FILM_CAKES) { const G = GN.cakeGenes(CAKE, Object.assign({}, c.genome, { dots: 1 })), o = CAKE.build(T, G, { t: .001 }); const counts = GN.STAGE_T.map(t => { o.userData.setT(Math.max(.001, t)); return visibleMeshes(o); });
    assert(counts[0] === 0 || GN.STAGE_T[0] === 0 && counts[0] <= 1, c.name + ' stage 0 shows ' + counts[0]);
    for (let s = 1; s < counts.length; s++) assert(counts[s] >= counts[s - 1], c.name + ' stage ' + s + ' ' + counts.join(',')); assert(counts[4] > counts[1], c.name + ' ' + counts.join(',')); } });
ok('the stage times rise from 0 to 1', () => { assert.strictEqual(GN.STAGE_T[0], 0); assert.strictEqual(GN.STAGE_T[4], 1); for (let i = 1; i < 5; i++) assert(GN.STAGE_T[i] > GN.STAGE_T[i - 1]); });
ok('candles: count n, lit k -> n candles and exactly k flames (the blow puts them out one by one)', () => {
  for (const n of [1, 7, 12]) for (let k = 0; k <= n; k++) { const o = CANDLES.build(T, GN.arr(CANDLES, Object.assign({}, GN.G.candles, { count: n })), { t: 1, blown: n - k }); let c = 0, f = 0;
    o.traverse(x => { if (/^candle\d+$/.test(x.name)) c++; if (/^flame\d+$/.test(x.name)) f++; }); assert.strictEqual(c, n, 'candles ' + n); assert.strictEqual(f, k, n + ' candles, ' + k + ' lit, flames ' + f); } });
ok('the inscription is written stroke by stroke: more of it at each written step', () => {
  const G = GN.arr(INS, GN.G.inscription); let prev = -1; for (let w = 0; w <= 24; w += 4) { const o = INS.build(T, G, { t: w / 24 }); let n = 0; o.traverse(x => { if (x.isMesh && x.userData && x.userData.stroke != null) n++; }); assert(n >= prev, 'written ' + w + ': ' + n + ' < ' + prev); prev = n; } assert(prev >= 20, 'whole inscription has ' + prev + ' strokes'); });
ok('the table top stands at the state table height (0.5 m) once placed', () => { const g = GN.arr(TABLE, GN.G.table), top = TABLE.top(g); assert(top.y > .2 && top.y < 1, 'module top ' + top.y); assert(top.rIn > .2 && top.rIn < .6, 'radius ' + top.rIn); });
ok('the evolved genomes stay inside their gene ranges', () => { for (const [M, k] of [[TABLE, 'table'], [INS, 'inscription'], [CANDLES, 'candles']]) M.genes.forEach(g => { const v = GN.G[k][g[0]]; if (v != null) assert(v >= g[2] - 1e-9 && v <= g[3] + 1e-9, k + '.' + g[0]); }); });

/* ------------------------------------------------------------------ browser checks */
async function browser() {
  const { chromium } = require('playwright'); const URL = (process.env.ORB_URL || 'http://localhost:8765') + '/experiments/orb-tool/scene/index.html?manual&preserve';
  const OPDPR = process.env.OP_DPR || '0.25';   // the op checks render at this pixel ratio (software GL is slow); the frame time is measured at 1
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', r => { const u = r.request().url(); return /^(http:\/\/localhost|data:|blob:)/.test(u) ? r.continue() : r.abort(); });
  await p.goto(URL, { waitUntil: 'commit', timeout: 120000 }); await p.waitForFunction(() => window.BENCH && window.BENCH.h.world, null, { timeout: 120000 });
  // a small grey copy of the canvas for diffs
  const SETUP = () => { const B = window.BENCH; B.t = performance.now(); B.tick = n => { for (let i = 0; i < (n || 1); i++) { B.t += 16.7; B.frame(B.t); } };
    const c = document.createElement('canvas'); c.width = 130; c.height = 260; const x = c.getContext('2d'); B.grab = () => { x.drawImage(document.querySelector('#view canvas'), 0, 0, 130, 260); const d = x.getImageData(0, 0, 130, 260).data, o = new Float32Array(130 * 260); for (let i = 0; i < o.length; i++) o[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; return o; };
    B.diff = (a, b2) => { let s = 0, n = 0; for (let i = 0; i < a.length; i++) { const e = Math.abs(a[i] - b2[i]); s += e; if (e > 6) n++; } return { mean: s / a.length, px: n }; }; };
  await p.evaluate(SETUP);
  // frame time: a finished party, 390x844, quality mid (the phone default)
  await p.evaluate(() => { const o = window.BENCH.orb; o.do([{ op: 'set', args: { path: 'cake.kind', value: 4 } }, { op: 'write', args: { text: '生日快乐' } }, { op: 'candles', args: { count: 7 } }, { op: 'set', args: { path: 'table.up', value: 1 } },
    { op: 'set', args: { path: 'people.child-1.arrived', value: 10 } }, { op: 'set', args: { path: 'people.child-2.arrived', value: 10 } }, { op: 'set', args: { path: 'people.child-3.arrived', value: 10 } }, { op: 'camera', args: { kneel: 8 } }]); window.BENCH.mach.snap(); window.BENCH.tick(4); });
  const ft = await p.evaluate(() => { const B = window.BENCH, gl = B.h.world.three.renderer.getContext(), px = new Uint8Array(4), ts = []; for (let i = 0; i < 8; i++) { const a = performance.now(); B.tick(1); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - a); } ts.sort((x, y) => x - y); return { median: ts[4], p90: ts[7], cpu: B.h.stats().cpuMs, quality: B.h.stats().quality, dpr: B.h.stats().pixelRatio }; });
  console.log('frame time 390x844 (headless Chromium, SwiftShader software GL, this machine): median ' + ft.median.toFixed(1) + ' ms, max ' + ft.p90.toFixed(1) + ' ms; scene CPU per frame ' + ft.cpu.toFixed(1) + ' ms; quality ' + ft.quality + ', pixel ratio ' + ft.dpr);
  // every op: one frame after it, the picture has changed beyond the noise of two frames with no op (performances held so flames and grain stand still)
  const OPS = [['select next', { op: 'select', args: { by: 1 } }], ['turn the viewpoint', { op: 'camera', args: { turn: 5 } }], ['kneel', { op: 'nudge', args: { path: 'camera.kneel', by: -1 } }],
    ['cake kind', { op: 'set', args: { path: 'cake.kind', value: 0 } }], ['unmake one stage', { op: 'set', args: { path: 'cake.stage', value: 3 } }], ['make', { op: 'make' }], ['tilt', { op: 'nudge', args: { path: 'cake.tilt', by: 2 } }],
    ['height', { op: 'nudge', args: { path: 'cake.genome.height', by: 2 } }], ['breed', { op: 'breed', args: { a: 1, b: 2, seed: 3 } }], ['keep', { op: 'keep', args: { name: 'test' } }],
    ['write other text', { op: 'write', args: { text: 'ANA' } }], ['inscription back', { op: 'write', args: { text: '生日快乐' } }], ['candles 9', { op: 'candles', args: { count: 9 } }], ['one candle out', { op: 'nudge', args: { path: 'candles.lit', by: -1 } }],
    ['child leaves', { op: 'set', args: { path: 'people.child-2.arrived', value: 6 } }], ['child time offset', { op: 'nudge', args: { path: 'people.child-1.offset', by: 4 } }], ['child moves', { op: 'nudge', args: { path: 'people.child-3.x', by: 2 } }],
    ['add child', { op: 'add', args: { kind: 'child', x: .7, z: -.2 } }], ['add prop', { op: 'add', args: { kind: 'prop', propKind: 'gift', x: .25, z: .15 } }], ['remove prop', { op: 'remove', args: { id: 'prop-1' } }],
    ['focus a child', { op: 'camera', args: { focus: 'child-1' } }], ['focus cake', { op: 'camera', args: { focus: 'cake' } }],
    ['propose', { op: 'propose', args: { op: 'candles', args: { count: 5 }, note: 'five' } }], ['amend', { op: 'amend', args: { id: '__P__', args: { count: 3 } } }], ['accept', { op: 'accept', args: {} }],
    ['propose 2', { op: 'propose', args: { op: 'set', args: { path: 'cake.kind', value: 3 } } }], ['reject', { op: 'reject', args: {} }],
    ['snapshot', { op: 'snapshot', args: { name: 'a' } }], ['light', { op: 'look', args: { light: 3 } }], ['place room', { op: 'look', args: { place: 'room' } }], ['place dome', { op: 'look', args: { place: 'dome' } }],
    ['look plain', { op: 'look', args: { look: 'plain' } }], ['look holo', { op: 'look', args: { look: 'holo' } }], ['look film', { op: 'look', args: { look: 'film' } }],
    ['table down', { op: 'set', args: { path: 'table.up', value: 0 } }], ['table up', { op: 'set', args: { path: 'table.up', value: 1 } }],
    ['undo', { op: 'undo', args: {} }], ['redo', { op: 'redo', args: {} }], ['blow', { op: 'blow' }], ['switch off', { op: 'switchOff' }], ['switch on', { op: 'switchOn' }], ['release', { op: 'release' }], ['hold', { op: 'hold' }]];
  // the op checks: a fresh page at a lower pixel ratio
  await p.goto(URL + '&dpr=' + OPDPR, { waitUntil: 'commit', timeout: 120000 }); await p.waitForFunction(() => window.BENCH && window.BENCH.h.world, null, { timeout: 120000 });
  await p.evaluate(SETUP); await p.evaluate(() => { const o = window.BENCH.orb; o.do([{ op: 'set', args: { path: 'cake.kind', value: 4 } }, { op: 'write', args: { text: '生日快乐' } }, { op: 'candles', args: { count: 7 } }, { op: 'set', args: { path: 'table.up', value: 1 } },
    { op: 'set', args: { path: 'people.child-1.arrived', value: 10 } }, { op: 'set', args: { path: 'people.child-2.arrived', value: 10 } }, { op: 'set', args: { path: 'people.child-3.arrived', value: 10 } }, { op: 'hold' }]); window.BENCH.mach.snap(); window.BENCH.tick(12); });
  const rows = [];
  for (const [name, op0] of OPS) {
    const r = await p.evaluate(op0 => { const B = window.BENCH, o = B.orb; let op = JSON.parse(JSON.stringify(op0)); if (op.args && op.args.id === '__P__') op.args.id = (o.state().proposals[0] || {}).id;
      if (op.op !== 'release' && op.op !== 'hold' && !o.state().time.hold) o.do({ op: 'hold' });
      let a = B.grab(), n = null; for (let k = 0; k < 16; k++) { B.tick(1); const b2 = B.grab(); n = B.diff(a, b2); a = b2; if (n.px < 40) break; } const pre = a;   // settle: the last op's transition has ended
      const res = o.do(op, { author: 'hand' }); const t0 = performance.now(); B.tick(1); const one = B.diff(pre, B.grab()), ms = performance.now() - t0; B.tick(1); const two = B.diff(pre, B.grab());
      return { ok: res.ok, error: res.error, noise: n, one, two, ms }; }, op0);
    const seen = r.one.px > Math.max(20, r.noise.px * 3); rows.push([name, r]); if (!r.ok) console.log('     ' + name + ': op refused: ' + r.error);
    ok('visible within one frame: ' + name + ' (changed px ' + r.one.px + ' vs noise ' + r.noise.px + ', frame ' + r.ms.toFixed(0) + ' ms)', () => assert(r.ok && seen, 'changed ' + r.one.px + ' px, noise ' + r.noise.px));
  }
  if (errs.length) console.log('page errors: ' + errs.slice(0, 5).join(' | '));
  ok('no page errors', () => assert.strictEqual(errs.length, 0, errs[0]));
  await b.close();
}
(async () => { if (process.argv.includes('--browser')) { try { await browser(); } catch (e) { fail++; console.log('FAIL browser: ' + e.message); } }
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); })();
