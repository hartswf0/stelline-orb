/* tests.js — node tests of the declared invariants, run against core.js and scenario.js (the same code the page runs).
   Usage: node tests.js            (also rewrites manifest.json from core.js and checks the folder holds no archive files) */
'use strict';
const fs = require('fs'), path = require('path'), A = require('./core.js'), S = require('./scenario.js');
let pass = 0, fail = 0; const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); }
function run(script, dt) { const G = A.create(); A.select(G, 0, true); const acts = S.expand(script); let ai = 0; dt = dt || 1 / 120; const snaps = [];
  for (let i = 0; i < Math.round(S.DURATION / dt); i++) { const t = i * dt; while (ai < acts.length && acts[ai][0] <= t + 1e-9) { const a = acts[ai++];
      if (a[1] === 'turn') A.handTurn(G, a[2], a[3] * G.rings.find(r => r.id === a[2]).deg); else if (a[1] === 'sel') A.select(G, G.target + 1); else { const before = A.layout(G).candles; const ok = A.hold(G); snaps.push({ t, before, after: A.layout(G).candles, place: G.history[G.history.length - 1], ok }); } }
    A.step(G, dt); } return { G, snaps }; }

// 1 · the reservoir: every item carries URI, institution id, rights status, media URL fields and a transform history; nothing claims CC0 without a check
const man = A.manifest(); fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(man, null, 1));
const fields = ['id', 'slot', 'source', 'rights', 'stage_asset', 'transform_history', 'tags'];
check('every reservoir item has the record fields', man.items.every(it => fields.every(f => it[f] != null) && ['uri', 'institution_id', 'media_url'].every(f => f in it.source) && it.transform_history.length >= 3));
check('no item is marked CC0 without a confirmed check', man.items.every(it => !it.rights.cc0), `${man.items.filter(i => i.rights.cc0).length} marked CC0 (none could be read)`);
const arch = man.items.filter(i => i.source.institution_id); check('archive candidates are traceable to a 3d_package id and a .glb URL', arch.length >= 6 && arch.every(i => /^3d_package:[0-9a-f-]{36}$/.test(i.source.institution_id) && /\.glb$/.test(i.source.media_url)), `${arch.length} items stand for ${new Set(arch.map(i => i.source.institution_id)).size} archive records`);
check('every unverified archive record is marked publish-blocked', arch.every(i => i.rights.status === 'UNVERIFIED' && /blocked/.test(i.rights.publish)));
const bad = []; (function walk(d) { fs.readdirSync(d).forEach(f => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(glb|gltf|obj|jpe?g|png|webp|tiff?|ktx2|bin)$/i.test(f)) bad.push(p); }); })(__dirname);
check('the folder holds no archive model or image file', bad.length === 0, bad.join(', '));
// 2 · every placed layer on stage traces to a reservoir record
const { G, snaps } = run(S.PLAY); const audit = A.stageAudit(G);
check('stage audit: every layer traces to a reservoir record', audit.length >= 6 && audit.filter(l => l.layer !== 'INSCRIPTION').every(l => A.byId(l.id) && l.rights), audit.map(l => l.layer + ':' + l.id).join(' '));
// 3 · the whole cake is made on screen, in order, from nothing
const ev = G.log.map(e => e.k), firstAt = k => G.log.findIndex(e => e.k === k);
const order = ['set', 'plate', 'clank', 'pour', 'bake', 'lift', 'spread', 'pipe', 'written', 'candle', 'match', 'flame', 'blow', 'puff', 'done'];
const idx = order.map(firstAt); check('the making happens in order: stand, plate, mould, batter, bake, unmould, icing, beads, inscription, candles, match, flames, blow, out', idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1])), order.map((k, i) => k + '@' + (idx[i] >= 0 ? G.log[idx[i]].t : 'missing')).join(' '));
check('seven candles set, seven lit, seven out, one at a time', ev.filter(k => k === 'candle').length === 7 && ev.filter(k => k === 'flame').length === 7 && ev.filter(k => k === 'puff').length === 7 && G.phase === 'done');
check('the inscription is written stroke by stroke (24 strokes) and the arc mark steps four times', ev.filter(k => k === 'stroke').length === A.WSTEPS && ev.filter(k => k === 'arcmark').length === 4);
const puffs = G.log.filter(e => e.k === 'puff').map(e => e.t); check('the blow puts the candles out 0.07 s apart (film)', puffs.slice(1).every((t, i) => Math.abs(t - puffs[i] - .07) < .01), puffs.join(' '));
// 4 · the machine: 11.8 steps/s, 23.6 only when far behind
const st = G.steps; const gaps = { slow: [], fast: [] }; for (let i = 1; i < st.length; i++) { const d = st[i][0] - st[i - 1][0]; if (d > 1e-6 && d < .2) gaps[st[i][2] ? 'fast' : 'slow'].push(d); }
const med = a => a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)];
check('machine rate 11.8 steps/s (median interval 84.7 ms within 1 tick of the 120 Hz test clock)', Math.abs(med(gaps.slow) - 1 / 11.8) < 1 / 120 + 1e-6, `median ${(med(gaps.slow) * 1000).toFixed(1)} ms over ${gaps.slow.length} gaps`);
check('fast rate 23.6 steps/s only when more than 6 detents behind', gaps.fast.length === 0 || Math.abs(med(gaps.fast) - 1 / 23.6) < 1 / 120 + 1e-6, gaps.fast.length ? `median ${(med(gaps.fast) * 1000).toFixed(1)} ms over ${gaps.fast.length} gaps` : 'no fast steps');
// 5 · candles hold their place across cake swaps (the film: within about 6 px)
const swaps = snaps.filter(s => s.place && s.place.swap && (s.place.slot === 'DECORATION' || s.place.slot === 'MOULD'));
const maxd = Math.max(0, ...swaps.map(s => Math.max(...s.before.map((p, i) => Math.hypot(p[0] - s.after[i][0], p[1] - s.after[i][1], p[2] - s.after[i][2]))))); check('candle positions identical across cake swaps', swaps.length >= 1 && maxd < 1e-12, `${swaps.length} swap(s) in the scenario, max move ${maxd} m`);
let flo = 0, sink = 0; ['MOULD-TIN-WANTED', 'MOULD-COLONOWARE-DOME', 'MOULD-FANGYI-BODY', 'MOULD-COPPER-RING-WANTED'].forEach(id => { const ty = A.byId(id).form.type; A.CANDLE_XZ.forEach(([x, z]) => { const d = A.surface(ty, Math.hypot(x, z)) - A.CAKE_H; flo = Math.max(flo, -d); sink = Math.max(sink, d); }); });
check('under every mould form, no candle floats more than 3 mm above the cake (its holder covers that) or sinks more than 8 mm', flo <= .003 && sink <= .008, `worst float ${(flo * 1000).toFixed(2)} mm (dome, outer ring), worst sink ${(sink * 1000).toFixed(2)} mm`);
// 6 · evolution: the decoration swap moved the cake toward the film cake
const h = G.history.filter(x => x.slot === 'DECORATION'); check('the decoration swap raises the match toward the target film cake', h.length >= 2 && h[1].match > h[0].match, h.map(x => x.id + ' ' + x.match).join(' -> ') + ` toward ${A.REFS[G.ref].name}`);
check('the finished cake matches the target at 1.0', A.match(G) === 1, 'match ' + A.match(G));
// 7 · the game refuses what cannot stand: a mould before a plate
const G3 = A.create(); A.select(G3, 2, true); const okM = A.hold(G3); check('HOLD on MOULD before a plate is refused with a reason', !okM && G3.log.some(e => e.k === 'dead' && /PLATE/.test(e.why)));
// 8 · the next cake: HOLD after the blow begins generation 2 toward the next film cake, keeping stand and plate
A.hold(G); check('after the blow, HOLD starts the next cake toward the next film cake', G.gen === 2 && G.placed.STAND && !G.placed.MOULD && A.REFS[G.ref].name === 'MINT');
fs.writeFileSync(path.join(__dirname, 'tests.json'), JSON.stringify({ ran: new Date().toISOString(), pass, fail, results }, null, 1));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
