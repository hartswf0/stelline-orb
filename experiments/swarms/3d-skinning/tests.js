/* tests.js — the declared invariants, measured in node on the same rig.js the page runs.
   node tests.js            -> prints a table and writes tests.json; exit code 1 if any invariant fails.
   It re-skins the children on the CPU (rig.js skinVertex, checked here against three.js r128's own SkinnedMesh.boneTransform),
   at a fixed stress set (raise, fold, reach, forearm twist) and at every pose sampled from the proof run (trace.json). */
'use strict';
const T = require('../../../ana/assets/three.min.js'), RIG = require('./rig.js'), fs = require('fs'), path = require('path'), V = RIG.V, PI = Math.PI;
const results = []; let fails = 0;
const check = (name, ok, measured, tol, note) => { results.push({ name, pass: !!ok, measured, tolerance: tol, note: note || '' }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name.padEnd(58) + ' ' + JSON.stringify(measured) + '   tol ' + tol); };
const kids = RIG.SPECS.map(s => RIG.buildChild(s)), naive = RIG.SPECS.map(s => RIG.buildChild(Object.assign({}, s, { mask: false })));
const restPose = G => ({ pos: V(0, 0, 0), arms: { L: { dir: G.D.d0L.clone(), bend: 0, pole: V(0, 0, -1) }, R: { dir: G.D.d0R.clone(), bend: 0, pole: V(0, 0, -1) } } });

/* 1. weights: normalised, non-negative, at most four influences (three.js skins with four) */
{ let worst = 0, neg = 0; kids.forEach(G => { for (let k = 0; k < G.n; k++) { let s = 0; for (let j = 0; j < 4; j++) { const w = G.skinWeight[4 * k + j]; if (w < 0) neg++; s += w; } worst = Math.max(worst, Math.abs(s - 1)); } });
  check('weights sum to 1 (all 4 children, every vertex)', worst < 1e-6 && neg === 0, { maxAbsSumError: +worst.toExponential(2), negative: neg, vertices: kids.reduce((a, G) => a + G.n, 0) }, '< 1e-6, none negative'); }

/* 2. the CPU skinner equals three.js r128's SkinnedMesh.boneTransform (morphs off) */
{ const G = kids[1], g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(G.pos, 3)); g.setAttribute('skinIndex', new T.Uint16BufferAttribute(G.skinIndex, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(G.skinWeight, 4));
  const bones = RIG.BONES.map(() => new T.Bone()); bones.forEach((b, j) => { const p = RIG.PARENT[j], r = G.D.rest[RIG.BONES[j]]; if (p < 0) b.position.copy(r); else { b.position.copy(r).sub(G.D.rest[RIG.BONES[p]]); bones[p].add(b); } });
  const mesh = new T.SkinnedMesh(g, new T.MeshBasicMaterial()); mesh.add(bones[0]); mesh.updateMatrixWorld(true); mesh.bind(new T.Skeleton(bones));
  const sol = RIG.solve(G, { pos: V(.2, 0, -.1), yaw: .7, lean: .4, twist: -.3, arms: { L: { target: V(.25, 1.1, .2) }, R: { dir: V(-.3, -.2, .9), bend: 2.2, twist: 1.1 } } }, { noCorrect: true });
  bones[0].position.copy(sol.rootPos); sol.q.forEach((q, i) => bones[i].quaternion.copy(q)); mesh.updateMatrixWorld(true); mesh.skeleton.update();
  const M = RIG.skinMats(G, sol.W); let worst = 0; for (let k = 0; k < G.n; k += 7) { const a = RIG.skinVertex(G, M, null, k), b = mesh.boneTransform(k, new T.Vector3()).applyMatrix4(mesh.matrixWorld); worst = Math.max(worst, a.distanceTo(b)); }
  check('CPU skinning == three.js SkinnedMesh.boneTransform', worst < 1e-6, { max_m: +worst.toExponential(2) }, '< 1e-6 m'); }

/* 3. bind pose: the rest matrices give back the mesh exactly */
{ let worst = 0; kids.forEach(G => { const P = RIG.skinAll(G, RIG.solve(G, restPose(G))); for (let i = 0; i < P.length; i++) worst = Math.max(worst, Math.abs(P[i] - G.pos[i])); });
  check('bind pose reproduces the rest mesh', worst < 1e-6, { max_m: +worst.toExponential(2) }, '< 1e-6 m'); }

/* the stress set, on child 2's left arm (the printed badge) */
const G2 = kids[1], N2 = naive[1], sx = 1;
const STRESS = {
  'raise 150': { dir: V(Math.sin(2.6), -Math.cos(2.6), 0), bend: .1, pole: V(0, 0, -1) },
  'raise 120 + forward': { dir: V(Math.sin(2.1), -Math.cos(2.1), .3), bend: .4, pole: V(0, 0, -1) },
  'raise 90': { dir: V(1, 0, .1), bend: .2, pole: V(0, 0, -1) },
  'forward 140': { dir: V(.1, .76, .64), bend: .2, pole: V(0, 0, -1) },
  'fold (elbow 150)': { dir: V(.3, -.2, .9), bend: 150 * PI / 180, pole: V(.3, -1, 0) },
  'reach': { dir: V(.1, -.1, 1), bend: .3, pole: V(.3, -1, -.2) },
  'elbow 125': { dir: null, bend: 125 * PI / 180, pole: V(0, 0, -1) },
  'elbow 145': { dir: null, bend: 145 * PI / 180, pole: V(0, 0, -1) },
  'forearm twist 150': { dir: null, bend: .3, pole: V(0, 0, -1), twist: 150 * PI / 180 } };
const arm = (G, a) => ({ pos: V(0, 0, 0), arms: { L: Object.assign({}, a, { dir: a.dir ? a.dir.clone() : G.D.d0L.clone() }) } });
const m0 = RIG.armMetrics(G2, RIG.skinAll(G2, RIG.solve(G2, restPose(G2))), 'L'), m0n = RIG.armMetrics(N2, RIG.skinAll(N2, RIG.solve(N2, restPose(N2))), 'L');
const table = [];
for (const [name, a] of Object.entries(STRESS)) {
  const Pc = RIG.skinAll(G2, RIG.solve(G2, arm(G2, a))), Pn = RIG.skinAll(N2, RIG.solve(N2, arm(N2, a), { naive: true }));
  const mc = RIG.armMetrics(G2, Pc, 'L'), mn = RIG.armMetrics(N2, Pn, 'L'), oc = RIG.ornamentMetrics(G2, Pc), on = RIG.ornamentMetrics(N2, Pn);
  const r = (m, z) => ({ elbow: +(m.elbowVol / z.elbowVol).toFixed(3), shoulder: +(m.shoulderVol / z.shoulderVol).toFixed(3), forearm: +(m.foreVol / z.foreVol).toFixed(3), minRing: +(m.foreMinRing / z.foreMinRing).toFixed(3) });
  table.push({ pose: name, corrected: r(mc, m0), naive: r(mn, m0n), badge: { area: +oc.areaRatio.toFixed(4), shape: +oc.shapeResidual.toFixed(4), band: +oc.bandRatio.toFixed(3), bandMin: +oc.bandMin.toFixed(2), bandMax: +oc.bandMax.toFixed(2) }, badgeNaive: { area: +on.areaRatio.toFixed(4), shape: +on.shapeResidual.toFixed(4) } }); }
console.log('\nstress set, child 2 left arm (volume ratios to rest; corrected vs linear blending alone):');
table.forEach(t => console.log('  ' + t.pose.padEnd(22) + ' corrected ' + JSON.stringify(t.corrected) + '\n  ' + ''.padEnd(22) + ' naive     ' + JSON.stringify(t.naive) + '\n  ' + ''.padEnd(22) + ' badge ' + JSON.stringify(t.badge) + ' naive badge ' + JSON.stringify(t.badgeNaive)));
const T_ = n => table.find(t => t.pose === n);
/* 4. candy wrapper: the forearm does not pinch shut at a 150 degree twist */
check('no candy-wrapper at forearm twist 150 (min ring area / rest)', T_('forearm twist 150').corrected.minRing >= .8, { corrected: T_('forearm twist 150').corrected.minRing, naive: T_('forearm twist 150').naive.minRing }, '>= 0.80');
check('forearm volume at twist 150', T_('forearm twist 150').corrected.forearm >= .88, { corrected: T_('forearm twist 150').corrected.forearm, naive: T_('forearm twist 150').naive.forearm }, '>= 0.88');
/* 5. elbows and shoulders keep their volume */
const elb = ['elbow 125', 'elbow 145', 'fold (elbow 150)'].map(n => T_(n).corrected.elbow);
check('elbow zone volume, elbow 125/145/150', elb.every(v => v >= .92 && v <= 1.08), { corrected: elb, naive: ['elbow 125', 'elbow 145', 'fold (elbow 150)'].map(n => T_(n).naive.elbow) }, '0.92 - 1.08');
const shp = ['raise 150', 'raise 120 + forward', 'raise 90', 'forward 140', 'reach', 'fold (elbow 150)'], sh = shp.map(n => T_(n).corrected.shoulder);
check('shoulder zone volume, raise/forward/reach/fold', sh.every(v => v >= .9 && v <= 1.15), { corrected: sh, naive: shp.map(n => T_(n).naive.shoulder) }, '0.90 - 1.15');
/* 6. the printed badge keeps its area and shape */
const ba = table.map(t => t.badge.area), bs = table.map(t => t.badge.shape);
check('sleeve badge area held (all stress poses)', ba.every(v => Math.abs(v - 1) <= .02), { min: Math.min(...ba), max: Math.max(...ba), naiveMin: Math.min(...table.map(t => t.badgeNaive.area)), naiveMax: Math.max(...table.map(t => t.badgeNaive.area)) }, '|area-1| <= 0.02');
check('sleeve badge shape held (Procrustes residual / size)', bs.every(v => v <= .02), { max: Math.max(...bs), naiveMax: Math.max(...table.map(t => t.badgeNaive.shape)) }, '<= 0.02');
const bands = table.map(t => t.badge.band); check('fabric ring round the badge (feather band) total area', bands.every(v => v >= .75 && v <= 1.35), { min: Math.min(...bands), max: Math.max(...bands), worstTriangle: [Math.min(...table.map(t => t.badge.bandMin)), Math.max(...table.map(t => t.badge.bandMax))] }, '0.75 - 1.35 (where the badge\'s strain goes)');
/* 7. seams stay welded: duplicated UV-seam vertices move together */
{ let worst = 0, pairs = 0; [kids[1], kids[0]].forEach(G => { const map = new Map(); for (let k = 0; k < G.n; k++) { const key = G.part[k] + Math.round(G.pos[3 * k] * 1e7) + ',' + Math.round(G.pos[3 * k + 1] * 1e7) + ',' + Math.round(G.pos[3 * k + 2] * 1e7); (map.get(key) || map.set(key, []).get(key)).push(k); }
    for (const a of Object.values(STRESS)) { const P = RIG.skinAll(G, RIG.solve(G, arm(G, a))); map.forEach(ids => { for (let i = 1; i < ids.length; i++) { pairs++; const d = Math.hypot(P[3 * ids[i]] - P[3 * ids[0]], P[3 * ids[i] + 1] - P[3 * ids[0] + 1], P[3 * ids[i] + 2] - P[3 * ids[0] + 2]); worst = Math.max(worst, d); } }); } });
  check('UV-seam duplicates stay welded under stress', worst < 1e-9, { max_m: worst, pairsChecked: pairs }, '< 1e-9 m'); }
/* 8. the corrective is exact at its key: linear blend + corrective == dual-quaternion reference */
{ const G = G2, sol = RIG.solve(G, arm(G, { dir: null, bend: RIG.KEY.elbow, pole: V(0, 0, -1) })); const w = sol.morphW[0];
  check('elbow corrective weight is 1 at its key pose', Math.abs(w - 1) < 1e-6, { weight: +w.toFixed(6) }, '1 +- 1e-6'); }

/* 9. the proof run: every sampled pose re-skinned here; dress bow, sleeve badge, and hands on what they hold */
const tp = path.join(__dirname, 'trace.json');
if (fs.existsSync(tp)) { const tr = JSON.parse(fs.readFileSync(tp, 'utf8')); let cmax = 0, cn = 0, cworst = null; const oa = [[], []], os = [[], []];
  tr.samples.forEach(s => s.kids.forEach((k, c) => { const G = kids[c], pose = { pos: V(...k.pos), yaw: k.yaw, lean: k.lean, twist: k.twist, headPitch: k.headPitch, tiptoe: k.tiptoe, arms: {} };
    for (const sd of ['L', 'R']) pose.arms[sd] = { target: V(...k.arms[sd].target), pole: V(...k.arms[sd].pole), twist: k.arms[sd].twist };
    const sol = RIG.solve(G, pose), M = RIG.skinMats(G, sol.W);
    for (const sd in k.contact) { const d = RIG.skinVertex(G, M, sol.morphW, G.info.palm[sd]).distanceTo(V(...k.contact[sd].target)); cn++; if (d > cmax) { cmax = d; cworst = { t: s.t, child: c + 1, hand: sd, holding: k.contact[sd].key, d: +d.toFixed(4) }; } }
    if (G.ornament && s.kids.length) { const P = RIG.skinAll(G, sol), o = RIG.ornamentMetrics(G, P), j = c === 0 ? 0 : 1; oa[j].push(o.areaRatio); os[j].push(o.shapeResidual); } }));
  check('hands touch what they hold (palm vertex to grip point), proof run', cn > 0 && cmax < .01, { contactsMeasured: cn, max_m: +cmax.toFixed(4), worst: cworst }, '< 0.010 m');
  check('dress bow area/shape held through the proof run (child 1)', oa[0].every(v => Math.abs(v - 1) <= .02) && os[0].every(v => v <= .02), { samples: oa[0].length, areaMin: +Math.min(...oa[0]).toFixed(4), areaMax: +Math.max(...oa[0]).toFixed(4), shapeMax: +Math.max(...os[0]).toFixed(4) }, '|area-1| <= 0.02, shape <= 0.02');
  check('sleeve badge area/shape held through the proof run (child 2)', oa[1].every(v => Math.abs(v - 1) <= .02) && os[1].every(v => v <= .02), { samples: oa[1].length, areaMin: +Math.min(...oa[1]).toFixed(4), areaMax: +Math.max(...oa[1]).toFixed(4), shapeMax: +Math.max(...os[1]).toFixed(4) }, '|area-1| <= 0.02, shape <= 0.02');
  const order = tr.events.filter(e => e[0] === 'done').map(e => e[3]);
  check('the whole cake is made, in order, by the children', JSON.stringify(order) === JSON.stringify(['board', 'layer1', 'layer2', 'iceTop', 'iceSide', 'beads', 'write', 'candles', 'light', 'blow']), order, 'board..blow, all ten');
  check('seven candles lit, then all seven out', tr.lit === 7 && tr.out === 7, { lit: tr.lit, out: tr.out, beads: tr.beads }, '7 and 7');
  check('page-side contact log (measured live in the page)', Object.values(tr.contacts).every(c => c.max_m < .01), tr.contacts, '< 0.010 m each');
} else check('trace.json present', false, 'missing', 'run record.js first');
fs.writeFileSync(path.join(__dirname, 'tests.json'), JSON.stringify({ when: new Date().toISOString(), fails, results, stress: table }, null, 1));
console.log(`\n${results.length - fails} of ${results.length} invariants pass`); process.exit(fails ? 1 : 0);
