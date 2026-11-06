/* maker.js — the MAKER of the blind-critic loop (see LOG.md).
   A candidate is one genome for the whole cake shot: the EVOLVE-ALL module genomes (cake, candles, inscription, table),
   the shared LOOK genome (grade, light, bloom, grain), and the scene (shot, pose, camera, flames, room band).
   The fitness is the blind critic's score (0-10, "this is a frame from the film's memory"); its named giveaways steer mutation.

     node maker.js init                 round 01: 8 candidates from the seeds (4 per framing)
     node maker.js next <scores.json>   record the critic's scores for the last round, breed and write the next round
     node maker.js write <NN>           (re)render and write round NN from trace.json

   scores.json: { "<image name>": { "score": 0-10, "rank": n, "giveaway": "text" }, ... } (names as in the blind folder).
   Blind images go to /home/claude/stelline-work/blind/round-NN/, keys to /home/claude/stelline-work/blind-keys/round-NN.json.
   Candidate renders (no film pixels) are copied to rounds/NN/. Film decoys never enter the repo. */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { renderAll } = require('./render.js');
const HERE = __dirname, EA = path.join(HERE, '..', 'swarms', 'evolve-all');
const WORK = '/home/claude/stelline-work', FILM = WORK + '/film/memory.mp4';
const SCRATCH = '/tmp/claude-0/-home-claude/5dcbf124-08aa-5357-a87a-ec1f490e8f81/scratchpad/blind-maker';
const TRACE = path.join(HERE, 'trace.json');
const pad = n => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ framings: one crop for the film decoy and the render alike */
const SHOTS = {
  A: { film: 146.0, crop: 'crop=608:342:20:250,scale=640:360:flags=bicubic' },     // her cake in the air, tilted toward her (cut 128.04-148.38 s)
  B: { film: 152.25, crop: 'crop=640:360:300:345' } };                            // the cake on the hexagonal table (cut 152.04-159.13 s), below the children
const FINISH = 'gblur=sigma=0.45,noise=alls=7:allf=t+u';   // the same mild softening and grain on every image, film or render
const JPEG = ['-q:v', '3', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact'];

/* ------------------------------------------------------------------ the genome */
const mods = {}; for (const n of ['cake', 'candles', 'inscription', 'table']) mods[n] = require(path.join(EA, 'modules', n + '.js'));
const lookSrc = fs.readFileSync(path.join(HERE, '..', 'swarms', 'shared', 'look.js'), 'utf8');
const LOOK_G = JSON.parse(lookSrc.match(/const GENOME = (\{[^;]*\});/)[1]), LOOK_R = JSON.parse(lookSrc.match(/const RANGES = (\{[^;]*\});/)[1].replace(/(\w+):\[/g, '"$1":['));
const SCENE_R = { tiltX: [-0.3, 0.7], tiltZ: [-0.5, 0.3], yaw: [-3.14, 3.14], lift: [-0.05, 0.2], cx: [-0.1, 0.1], cz: [-0.1, 0.1], scale: [0.7, 1.4],
  camX: [-0.15, 0.15], camY: [-0.15, 0.15], camZ: [-0.2, 0.2], lookX: [-0.1, 0.1], lookY: [-0.1, 0.1], fov: [0.8, 1.25],
  tintR: [0.3, 1.6], tintG: [0.3, 1.6], tintB: [0.3, 1.6], flameW: [0.5, 2], flameH: [0.5, 2], halo: [0, 2.5], modFlame: [0, 1], room: [0, 1], bandY: [-0.3, 1.0], time: [0, 10], insLift: [0, 0.008],
  lump: [0, 0.01], lop: [-0.015, 0.015], rimW: [0.003, 0.01], dots: [10, 70], dotS: [0.003, 0.008], lean: [0, 15], flameGain: [0.6, 3], tableR: [0.25, 0.5], seed: [1, 999], lookIcing: [0, 1], metalBoard: [0, 1], modBeads: [0, 1] };
const SCENE_A = { shot: 'A', tiltX: 0.12, tiltZ: -0.15, yaw: 0.4, lift: 0.06, cx: 0, cz: 0, scale: 1, camX: 0, camY: 0, camZ: 0, lookX: 0, lookY: 0, fov: 1,
  tintR: 1.2, tintG: 1, tintB: 0.8, flameW: 0.7, flameH: 0.8, halo: 0.4, modFlame: 0.3, room: 0.8, bandY: 0.45, time: 2, insLift: 0.003 };
const SCENE_B = Object.assign({}, SCENE_A, { shot: 'B', tiltX: 0, tiltZ: 0, yaw: 0, lift: 0, scale: 0.9, camZ: 0.08, bandY: 0.25 });
/* TOOL v2 (round 02): new hand-layer genes (render.html M1-M8) and the light/framing reset applied to every genome, elites included */
const SCENE_V2 = { lump: 0.004, lop: 0.006, rimW: 0.006, dots: 34, dotS: 0.0048, lean: 7, flameGain: 2.6, tableR: 0.36, seed: 7, lookIcing: 1, metalBoard: 1, modBeads: 0 };
const LOOK_V2 = { keySoft: 1, keyCone: 0.8, contrast: 0.9, saturation: 0.65, wbB: 1.0, ambient: 0.12, aperture: 1.4, keyIntensity: 1.9, exposure: 1.3, keyHeight: 1.0, keyForward: 0.9 };
const CAKE_V2 = { frostTop: 0.03, frostSide: 0.03 };
const FRAME_V2 = { A: { fov: 1.12, lookY: 0.03 }, B: { lookY: 0.04, camZ: 0.12 } };
function upgradeV2(G, r) { const o = clone(G); for (const k in SCENE_V2) if (o.scene[k] == null) o.scene[k] = SCENE_V2[k];
  o.scene.seed = Math.round(1 + r() * 998); Object.assign(o.look, LOOK_V2); Object.assign(o.cake, CAKE_V2); o.cake.topL = Math.max(o.cake.topL, 74); o.cake.topB = Math.min(o.cake.topB, 38); o.cake.sideL = o.cake.topL - 8; o.cake.sideB = o.cake.topB - 4; o.inscription.count = 0.875; o.scene.flameGain = SCENE_V2.flameGain; o.scene.flameH = Math.max(o.scene.flameH, 1); Object.assign(o.scene, FRAME_V2[o.scene.shot]); o.tool = 2; return o; }
const LOOK_SEED = { wbB: 0.95, wbR: 1.0, saturation: 0.72, flame: 2.2, halo: 0.6, tableTone: 0.22, keyIntensity: 1.6, grain: 0.04 };
function rangeOf(part, key) { if (part === 'scene') return SCENE_R[key]; if (part === 'look') return LOOK_R[key]; const g = mods[part].genes.find(g => g[0] === key); return g && [g[2], g[3]]; }
const INT = { 'cake.layers': 1, 'candles.count': 1 };

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { const u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clone = o => JSON.parse(JSON.stringify(o));

function seedGenome(shot) { const S = JSON.parse(fs.readFileSync(path.join(HERE, 'seeds.json'), 'utf8'));
  return { scene: clone(shot === 'A' ? SCENE_A : SCENE_B), cake: clone(shot === 'A' ? S.cakeA : S.cakeB), candles: clone(S.candles), inscription: clone(S.inscription), table: clone(S.table), look: Object.assign(clone(LOOK_G), LOOK_SEED) }; }

/* mutate: rate = share of genes touched, sigma = step as a share of the gene's range; focus = { 'part' or 'part.key': weight } raises rate and sigma there */
function mutate(G, r, rate, sigma, focus) { const o = clone(G); focus = focus || {};
  for (const part of ['scene', 'cake', 'candles', 'inscription', 'table', 'look']) { if (part === 'table' && o.scene.shot !== 'B') continue;
    for (const key of Object.keys(o[part])) { const rg = rangeOf(part, key); if (!rg || typeof o[part][key] !== 'number') continue;
      const f = Math.max(focus[part] || 0, focus[part + '.' + key] || 0); const p = Math.min(0.9, rate * (1 + 3 * f));
      if (r() > p) continue; let v = o[part][key] + sigma * (1 + f) * (rg[1] - rg[0]) * gauss(r); v = clamp(v, rg[0], rg[1]);
      if (INT[part + '.' + key]) v = Math.round(v); o[part][key] = +v.toFixed(5); } }
  if (o.candles) o.candles.count = 7;   // seven candles, as in the film
  if ((o.tool || 1) >= 2) o.inscription.count = 0.875;   // the characters only: the film's frames do not show the flourish
  return o; }
function cross(a, b, r) { const o = clone(a); for (const part of ['cake', 'candles', 'inscription', 'table', 'look']) for (const k of Object.keys(o[part] || {})) if (b[part] && r() < 0.5) o[part][k] = b[part][k];
  for (const k of Object.keys(o.scene)) if (k !== 'shot' && r() < 0.5 && b.scene.shot === a.scene.shot) o.scene[k] = b.scene[k]; return o; }

/* the critic's words -> where to mutate (keyword -> genes). Plain lookup; extended as the critic names new things. */
const STEER = [
  [/grade|colou?r|warm|orange|yellow|saturat|tint|hue|white balance|green|teal/i, { 'look.wbR': 1, 'look.wbB': 1, 'look.saturation': 1, 'look.keyKelvin': .7, 'scene.tintR': 1, 'scene.tintG': 1, 'scene.tintB': 1, 'look.icingWarm': .5 }],
  [/bright|exposure|dark|black|contrast|crush|shadow|lift|flat|dim/i, { 'look.exposure': 1, 'look.contrast': 1, 'look.blackPoint': 1, 'look.toe': 1, 'look.keyIntensity': 1, 'look.ambient': .6, 'look.bgLevel': .6 }],
  [/cg|render|plastic|clean|smooth|synthetic|3d|computer|game|waxy|uniform|perfect|sharp|crisp/i, { 'look.grain': 1, 'look.aperture': 1, 'look.roughIcing': 1, 'look.bumpIcing': 1, 'cake.frostTop': 1, 'cake.frostSide': 1, 'look.bloomStrength': .5 }],
  [/flame|candle light|glow|bloom|halo|flare/i, { 'scene.flameW': 1, 'scene.flameH': 1, 'scene.halo': 1, 'scene.modFlame': 1, 'look.flame': 1, 'look.halo': 1, 'look.bloomStrength': 1, 'look.bloomRadius': 1, 'look.halation': 1 }],
  [/candle|wax|stripe|spiral/i, { 'candles': .6 }],
  [/inscription|writing|letters|characters|text|script|piping|red/i, { 'inscription': .7 }],
  [/shape|proportion|tall|short|height|wide|thin|silhouette|geometry|cylinder|form/i, { 'cake.height': 1, 'cake.taper': 1, 'cake.dome': 1, 'cake.bevel': 1, 'scene.scale': .6 }],
  [/icing|frost|texture|surface|cream|top|smear|rough/i, { 'cake.frostTop': 1, 'cake.frostSide': 1, 'cake.topL': .6, 'cake.topA': .6, 'cake.topB': .6, 'look.bumpIcing': 1, 'look.roughIcing': 1 }],
  [/bead|dot|decoration|sprinkle|border|pip/i, { 'cake.beads': 1, 'cake.border': 1, 'cake.beadL': .6, 'cake.foot': .6 }],
  [/side|sponge|layer/i, { 'cake.sideL': 1, 'cake.sideA': .6, 'cake.sideB': .6, 'cake.layers': .5, 'cake.frostSide': .6 }],
  [/table|hexagon|surface below|tabletop/i, { 'table': .8, 'look.tableTone': 1, 'look.tableWarm': 1 }],
  [/angle|camera|framing|perspective|tilt|composition|position|scale|size|lens|focal/i, { 'scene.tiltX': 1, 'scene.tiltZ': 1, 'scene.yaw': .5, 'scene.camX': 1, 'scene.camY': 1, 'scene.camZ': 1, 'scene.fov': 1, 'scene.lookX': .6, 'scene.lookY': .6 }],
  [/background|band|horizon|wall|room|ring|line of light/i, { 'scene.room': 1, 'scene.bandY': 1, 'look.band': 1, 'look.bgLevel': 1, 'look.vignette': .6 }],
  [/focus|blur|depth|bokeh|soft/i, { 'look.aperture': 1, 'look.grain': .5 }],
  [/noise|grain|compression/i, { 'look.grain': 1, 'look.grainSize': 1 }],
  [/light|lit|lighting|key|falloff|spot/i, { 'look.keyIntensity': 1, 'look.keyCone': 1, 'look.keySoft': 1, 'look.keyHeight': 1, 'look.keyForward': 1, 'look.candleIntensity': 1, 'look.candleDecay': .6 }] ];
function steer(text) { const f = {}; if (!text) return f; for (const [re, w] of STEER) if (re.test(text)) for (const k in w) f[k] = Math.max(f[k] || 0, w[k]); return f; }

/* ------------------------------------------------------------------ writing a round */
function ff(args) { cp.execFileSync('ffmpeg', ['-loglevel', 'error', '-y'].concat(args), { stdio: 'inherit' }); }
function names(n, r) { const s = new Set(); while (s.size < n) s.add(Array.from({ length: 3 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(r() * 26)]).join('')); return [...s]; }
async function writeRound(N, cands, tool) {
  const R = pad(N), tmp = path.join(SCRATCH, 'round-' + R), blind = path.join(WORK, 'blind', 'round-' + R), keys = path.join(WORK, 'blind-keys'), repo = path.join(HERE, 'rounds', R);
  [tmp, blind, keys, repo].forEach(d => fs.mkdirSync(d, { recursive: true }));
  fs.readdirSync(blind).forEach(f => fs.unlinkSync(path.join(blind, f)));
  await renderAll(cands, tmp);
  const r = mulberry32((Date.now() ^ (N * 7919)) >>> 0), nm = names(cands.length + 2, r), key = {}; let i = 0;
  const items = cands.map(c => ({ id: c.id, shot: c.genome.scene.shot, src: path.join(tmp, c.id + '.png') }));
  for (const s of ['A', 'B']) { const f = path.join(tmp, 'film-' + s + '.png'); ff(['-ss', String(SHOTS[s].film), '-i', FILM, '-frames:v', '1', f]); items.push({ id: 'FILM-' + s, shot: s, src: f, film: true }); }
  // shuffle the order names are given out in
  const order = items.map((it, k) => [r(), k]).sort((a, b) => a[0] - b[0]).map(x => items[x[1]]);
  for (const it of order) { const name = nm[i++] + '.jpg', out = path.join(blind, name);
    ff(['-i', it.src, '-vf', SHOTS[it.shot].crop + ',' + FINISH, '-frames:v', '1'].concat(JPEG, [out]));
    key[name] = it.film ? 'FILM' : it.id; if (it.film) key[name + ':shot'] = it.id;
    if (!it.film) fs.copyFileSync(out, path.join(repo, it.id + '.jpg')); }
  fs.writeFileSync(path.join(keys, 'round-' + R + '.json'), JSON.stringify(key, null, 1));
  fs.writeFileSync(path.join(blind, 'READY'), `round ${R}: ${Object.keys(key).filter(k => !k.includes(':')).length} images, 640x360 JPEG, same crop, softening, grain and quality for all. Score each 0-10: is this a frame from the film's memory?\n`);
  return { blind, key }; }

function loadTrace() { return fs.existsSync(TRACE) ? JSON.parse(fs.readFileSync(TRACE, 'utf8')) : { loop: 'blind-critic', rounds: [] }; }
function saveTrace(t) { fs.writeFileSync(TRACE, JSON.stringify(t, null, 1)); }

async function init() {
  const r = mulberry32(101), cands = [];
  for (const s of ['A', 'B']) { const base = seedGenome(s); cands.push({ id: 'r01-' + s + '1', parents: ['seed'], genome: base });
    for (let k = 2; k <= 4; k++) cands.push({ id: 'r01-' + s + k, parents: ['seed'], genome: mutate(base, r, 0.35, 0.1) }); }
  const tool = 'EVOLVE-ALL modules (cake, candles, inscription, table build) + shared/look.js; orb-tool has no scene renderer yet (no scene/ folder), so its ops cannot render a frame';
  const t = loadTrace(); t.rounds = [{ round: 1, tool, candidates: cands, scores: null }]; saveTrace(t);
  const w = await writeRound(1, cands, tool); console.log('round 01 written to', w.blind); }

async function next(scoresFile) {
  const t = loadTrace(), last = t.rounds[t.rounds.length - 1], N = last.round, key = JSON.parse(fs.readFileSync(path.join(WORK, 'blind-keys', 'round-' + pad(N) + '.json'), 'utf8'));
  const sc = JSON.parse(fs.readFileSync(scoresFile, 'utf8')), byId = {}, decoys = [];
  for (const [name, v] of Object.entries(sc)) { const id = key[name]; if (!id) continue; if (id === 'FILM') decoys.push(Object.assign({ name, shot: key[name + ':shot'] }, v)); else byId[id] = Object.assign({ name }, v); }
  last.candidates.forEach(c => { c.score = byId[c.id] ? byId[c.id].score : 0; c.giveaway = byId[c.id] ? byId[c.id].giveaway || '' : ''; });
  last.decoys = decoys; last.scores = sc; saveTrace(t);
  const lowDecoy = Math.min(...decoys.map(d => d.score)), best = [...last.candidates].sort((a, b) => b.score - a.score);
  console.log('round', N, 'best', best[0].id, best[0].score, 'decoys', decoys.map(d => d.shot + ':' + d.score).join(' '));
  if (best[0].score >= lowDecoy) { console.log('STOP: a candidate reached the lower decoy score'); return; }
  if (N >= 8) { console.log('STOP: 8 rounds'); return; }
  // select: elitist, keep top 2; 6 children biased to the named giveaways; keep both framings in the population
  const M = N + 1, r = mulberry32(1000 + M);
  best.forEach(c => { if ((c.genome.tool || 1) < 2) c.genome = upgradeV2(c.genome, r); });
  const elite = best.slice(0, 2), kids = [];
  const pool = best.slice(0, 4), byShot = s => best.filter(c => c.genome.scene.shot === s);
  const need = { A: 4 - elite.filter(c => c.genome.scene.shot === 'A').length, B: 4 - elite.filter(c => c.genome.scene.shot === 'B').length };
  for (const s of ['A', 'B']) { const ps = byShot(s); for (let k = 0; k < need[s]; k++) { const a = ps[Math.min(ps.length - 1, k % 2)], b = ps[Math.min(ps.length - 1, 1 + (k % 3))];
      const focus = steer([a.giveaway, b.giveaway].join(' ')); let g = k === 0 ? a.genome : cross(a.genome, b.genome, r); g = mutate(g, r, 0.18, 0.07, focus);
      kids.push({ id: `r${pad(M)}-${s}${k + 1}`, parents: [a.id, b.id], focus: Object.keys(focus), genome: g }); } }
  const cands = elite.map(e => ({ id: `r${pad(M)}-E-${e.id}`, parents: [e.id], elite: true, genome: e.genome })).concat(kids);
  t.rounds.push({ round: M, tool: last.tool, candidates: cands, scores: null }); saveTrace(t);
  const w = await writeRound(M, cands, last.tool); console.log('round', pad(M), 'written to', w.blind); }

const [cmd, arg] = process.argv.slice(2);
(cmd === 'init' ? init() : cmd === 'next' ? next(arg) : cmd === 'write' ? (async () => { const t = loadTrace(), rd = t.rounds.find(x => x.round === +arg); await writeRound(rd.round, rd.candidates, rd.tool); })() : Promise.resolve(console.log('usage: node maker.js init | next <scores.json> | write <NN>')))
  .catch(e => { console.error(e); process.exit(1); });
module.exports = { mutate, steer, seedGenome, upgradeV2, mulberry32 };
