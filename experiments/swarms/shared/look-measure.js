#!/usr/bin/env node
/* look-measure.js — measures LOOK renders against the film's party frames and evolves the look genome.
   node look-measure.js film            measure the film frames (needs /home/claude/stelline-work/film/memory.mp4); writes film stats
   node look-measure.js frame           render both shots with the current genome, print region boxes (framing check) and scores
   node look-measure.js evolve [gens]   seeded elitist (mu+lambda) evolution; writes look-trace.json and look-genome.json
   node look-measure.js strip           renders-only strip -> look-strip.png; film side-by-side -> /home/claude/stelline-work/look/
   Film pixels never leave /home/claude/stelline-work and the scratchpad; only numbers are written here.
   Chromium via Playwright (preinstalled). Never reinstall. */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const HERE = __dirname, FILM = '/home/claude/stelline-work/film/memory.mp4', WORK = '/home/claude/stelline-work/look';
const SCRATCH = process.env.LOOK_SCRATCH || '/tmp/claude-0/-home-claude/5dcbf124-08aa-5357-a87a-ec1f490e8f81/scratchpad/look';
const GENOME_FILE = path.join(HERE, 'look-genome.json'), TRACE_FILE = path.join(HERE, 'look-trace.json'), FILMSTATS = path.join(WORK, 'film-stats.json');

/* Regions in film pixels (1280 x 720), drawn on the frames at 146.0 s and 155.3 s (overlays in stelline-work/look/regions-*.png).
   top = the iced top surface, side = the cake's side, table = the hex table top, bg = dark room patches clear of people and the band,
   flame = the box the candle flames stay inside. Times: three frames per shot are averaged. */
const REGIONS = {
  A: { t: [145.6, 146.0, 146.4],
    top: [[300, 338], [360, 320], [450, 318], [515, 342], [545, 405], [528, 452], [470, 472], [380, 462], [305, 432], [282, 390]],
    side: [[268, 430], [305, 455], [380, 478], [470, 485], [530, 468], [522, 520], [470, 562], [380, 582], [305, 570], [265, 520]],
    bg: [[[20, 20], [780, 20], [780, 230], [20, 230]], [[20, 330], [235, 330], [235, 700], [20, 700]], [[570, 480], [780, 480], [780, 700], [570, 700]]],
    flame: [[325, 272], [530, 272], [530, 402], [325, 402]] },
  B: { t: [154.9, 155.3, 155.7],
    top: [[556, 418], [600, 413], [700, 413], [752, 420], [750, 431], [650, 436], [558, 431]],
    side: [[550, 442], [758, 442], [760, 498], [740, 526], [650, 536], [560, 526], [548, 498]],
    table: [[335, 515], [515, 470], [528, 470], [528, 525], [548, 556], [650, 566], [782, 550], [792, 515], [786, 476], [800, 476], [990, 530], [800, 602], [372, 602]],
    bg: [[[220, 20], [440, 20], [440, 320], [220, 320]], [[960, 20], [1260, 20], [1260, 320], [960, 320]], [[20, 630], [300, 630], [300, 710], [20, 710]], [[1010, 580], [1260, 580], [1260, 710], [1010, 710]]],
    flame: [[578, 358], [708, 358], [708, 428], [578, 428]] }
};
/* Tolerances (declared before the evolution ran). Lab units; spreads relative; histogram as earth-mover distance in L units. */
const TOL = { L: 4, a: 3, b: 4, spreadRel: 0.4, spreadMin: 2.5, rb: 0.4, hist: 4, bloomRel: 0.35, hfRel: 0.4, hfMin: 0.4 };

const sleep = ms => new Promise(r => setTimeout(r, ms));
function frameFile(t) { fs.mkdirSync(path.join(SCRATCH, 'film'), { recursive: true }); const f = path.join(SCRATCH, 'film', `f${t.toFixed(2)}.bmp`);   // BMP: no colour chunks, so Chromium does not colour-manage the pixels
  if (!fs.existsSync(f)) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', FILM, '-frames:v', '1', f]); return f; }
const dataUrl = f => (f.endsWith('.bmp') ? 'data:image/bmp;base64,' : 'data:image/png;base64,') + fs.readFileSync(f).toString('base64');

async function openPage() {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror', e.message)); page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto('file://' + path.join(HERE, 'look-test.html') + '?measure=1');
  await page.waitForFunction(() => window.LOOKTEST && window.LOOK);
  return { browser, page };
}
function avgStats(list) { // average numeric leaves of a list of identical-shaped objects
  const rec = (xs) => { if (typeof xs[0] === 'number') return xs.reduce((s, v) => s + v, 0) / xs.length; if (Array.isArray(xs[0])) return xs[0].map((_, i) => rec(xs.map(x => x[i]))); if (xs[0] && typeof xs[0] === 'object') { const o = {}; for (const k in xs[0]) o[k] = rec(xs.map(x => x[k])); return o; } return xs[0]; };
  return rec(list); }

async function measureFilm(page) {
  const out = {};
  for (const s of ['A', 'B']) { const per = []; for (const t of REGIONS[s].t) per.push(await page.evaluate(([u, d]) => LOOKTEST.measureImage(u, d), [dataUrl(frameFile(t)), REGIONS[s]])); out[s] = avgStats(per); out[s].perFrame = per.map(p => ({ top: p.regions.top, bloom: p.bloom.r })); }
  fs.mkdirSync(WORK, { recursive: true }); fs.writeFileSync(FILMSTATS, JSON.stringify(out, null, 1)); return out;
}
function loadFilm() { if (!fs.existsSync(FILMSTATS)) throw new Error('run: node look-measure.js film'); return JSON.parse(fs.readFileSync(FILMSTATS)); }

/* the score: every term is |difference| / tolerance; a term above 1 is a failure */
function terms(r, f, s) { const T = {}, M = (a, b) => Math.abs(a - b);
  for (const k of Object.keys(f.regions)) { const a = r.regions[k], b = f.regions[k]; if (!a) { T[`${s}.${k}.missing`] = 9; continue; }
    T[`${s}.${k}.L`] = M(a.L, b.L) / TOL.L; T[`${s}.${k}.a`] = M(a.a, b.a) / TOL.a; T[`${s}.${k}.b`] = M(a.b, b.b) / TOL.b;
    T[`${s}.${k}.sL`] = M(a.sL, b.sL) / Math.max(TOL.spreadMin, TOL.spreadRel * b.sL);
    if (k !== 'bg') T[`${s}.${k}.sb`] = M(a.sb, b.sb) / Math.max(TOL.spreadMin, TOL.spreadRel * b.sb); }
  if (s === 'A' && r.regions.top) T['A.top.rb'] = M(r.regions.top.rb, f.regions.top.rb) / TOL.rb;
  const emd = (h1, h2) => { let c1 = 0, c2 = 0, x = 0; for (let i = 0; i < h1.length; i++) { c1 += h1[i]; c2 += h2[i]; x += Math.abs(c1 - c2) * 100 / h1.length; } return x; };
  T[`${s}.hist`] = emd(r.hist, f.hist) / TOL.hist;
  T[`${s}.bloom`] = M(r.bloom.r, f.bloom.r) / (TOL.bloomRel * f.bloom.r);
  T[`${s}.hf`] = !r.tex || !isFinite(r.tex.hf) ? 9 : M(r.tex.hf, f.tex.hf) / Math.max(TOL.hfMin, TOL.hfRel * f.tex.hf);
  return T; }
function score(T) { let s = 0, fails = 0, worst = 0, wk = ''; for (const k in T) { const v = Math.min(T[k], 6); s += v * v; if (v > 1) fails++; if (v > worst) { worst = v; wk = k; } } return { score: s + 4 * fails, fails, worst, worstKey: wk }; }

async function evalGenome(page, g, film, keep) {
  const res = {}; let all = {};
  try { for (const s of ['A', 'B']) { const r = await page.evaluate(([s, g, d]) => { LOOKTEST.frame(s, g); return LOOKTEST.measure(s, d); }, [s, g, REGIONS[s]]); res[s] = r; Object.assign(all, terms(r, film[s], s)); } }
  catch (e) { console.error('eval failed', e.message.slice(0, 200)); return { score: 1e9, fails: 99, worst: 99, worstKey: 'error', terms: {} }; }
  const sc = score(all); return Object.assign(sc, { terms: all, raw: keep ? res : undefined });
}

/* seeded PRNG */
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

async function evolve(gens) {
  const film = loadFilm(), { browser, page } = await openPage();
  const RANGES = await page.evaluate(() => LOOK.RANGES), START = await page.evaluate(() => Object.assign({}, LOOK.GENOME));
  const keys = Object.keys(RANGES), seed = +(process.env.LOOK_SEED || 20261106), rnd = mulberry(seed), MU = 6, LAMBDA = 14;
  let start = START; if (fs.existsSync(GENOME_FILE) && process.env.LOOK_RESUME) start = JSON.parse(fs.readFileSync(GENOME_FILE)).genome;
  const clampG = g => { for (const k of keys) { const [a, b] = RANGES[k]; g[k] = Math.max(a, Math.min(b, g[k])); } return g; };
  const trace = { seed, mu: MU, lambda: LAMBDA, tolerances: TOL, started: new Date().toISOString(), generations: [] };
  let pop = [{ g: Object.assign({}, start) }];
  for (let i = 1; i < MU; i++) { const g = Object.assign({}, start); for (const k of keys) { const [a, b] = RANGES[k]; g[k] += gauss(rnd) * 0.15 * (b - a); } pop.push({ g: clampG(g) }); }
  for (const p of pop) Object.assign(p, await evalGenome(page, p.g, film));
  let sigma = 0.12, best = Infinity, t0 = Date.now();
  for (let gen = 0; gen < gens; gen++) {
    const kids = [];
    for (let j = 0; j < LAMBDA; j++) { const A = pop[Math.floor(rnd() * pop.length)], B = pop[Math.floor(rnd() * pop.length)], g = {};
      for (const k of keys) { const [a, b] = RANGES[k]; g[k] = (rnd() < 0.5 ? A.g[k] : B.g[k]); if (rnd() < 0.35) g[k] += gauss(rnd) * sigma * (b - a); }
      kids.push({ g: clampG(g) }); }
    for (const k of kids) Object.assign(k, await evalGenome(page, k.g, film));
    pop = pop.concat(kids).sort((a, b) => a.score - b.score).slice(0, MU);
    const b0 = pop[0]; if (b0.score < best - 1e-6) { best = b0.score; sigma = Math.min(0.25, sigma * 1.15); } else sigma = Math.max(0.015, sigma * 0.8);
    trace.generations.push({ gen, best: +b0.score.toFixed(3), fails: b0.fails, worst: b0.worstKey + ' ' + b0.worst.toFixed(2), sigma: +sigma.toFixed(4), elite: pop.map(p => +p.score.toFixed(2)), genome: b0.g });
    console.log(`gen ${gen} best ${b0.score.toFixed(2)} fails ${b0.fails} worst ${b0.worstKey} ${b0.worst.toFixed(2)} sigma ${sigma.toFixed(3)} t ${((Date.now() - t0) / 1000) | 0}s`);
    fs.writeFileSync(TRACE_FILE, JSON.stringify(trace, null, 1));
    if (b0.fails === 0 && process.env.LOOK_STOP_ON_PASS) break;
  }
  const fin = await evalGenome(page, pop[0].g, film, true);
  trace.final = { score: fin.score, fails: fin.fails, worst: fin.worstKey, terms: fin.terms };
  trace.ended = new Date().toISOString(); fs.writeFileSync(TRACE_FILE, JSON.stringify(trace, null, 1));
  writeGenome(pop[0].g, film, fin);
  await browser.close();
}
function round(o, d) { if (typeof o === 'number') return +o.toFixed(d); if (Array.isArray(o)) return o.map(x => round(x, d)); if (o && typeof o === 'object') { const r = {}; for (const k in o) r[k] = round(o[k], d); return r; } return o; }
function writeGenome(g, film, fin) {
  const slim = s => ({ regions: s.regions, hist: s.hist, bloom: { r: s.bloom.r, n: s.bloom.n }, tex: s.tex });
  const out = { note: 'Accepted LOOK genome and the film numbers it was measured against (numbers only, no pixels). Regenerate with look-measure.js.',
    genome: round(g, 4), tolerances: TOL, regions: REGIONS, film: { A: round(slim(film.A), 3), B: round(slim(film.B), 3) },
    result: fin ? { score: +fin.score.toFixed(3), fails: fin.fails, worst: fin.worstKey, terms: round(fin.terms, 3), rendered: fin.raw ? { A: round(slim(fin.raw.A), 3), B: round(slim(fin.raw.B), 3) } : undefined } : undefined };
  fs.writeFileSync(GENOME_FILE, JSON.stringify(out, null, 1));
}

async function frame() {
  const film = loadFilm(), { browser, page } = await openPage();
  const g = fs.existsSync(GENOME_FILE) ? JSON.parse(fs.readFileSync(GENOME_FILE)).genome : null;
  const fin = await evalGenome(page, g || await page.evaluate(() => LOOK.GENOME), film, true);
  for (const s of ['A', 'B']) { const bx = fin.raw[s].boxes; const fb = k => { const p = (k === 'bg' ? REGIONS[s][k].flat() : REGIONS[s][k]).map(([x, y]) => [x * 0.5, y * 0.5]); return [Math.min(...p.map(q => q[0])), Math.min(...p.map(q => q[1])), Math.max(...p.map(q => q[0])), Math.max(...p.map(q => q[1]))].map(Math.round); };
    console.log(s, 'render boxes @640', JSON.stringify(bx), '\n  film boxes', JSON.stringify({ top: fb('top'), side: fb('side'), table: REGIONS[s].table ? fb('table') : null, flame: fb('flame') }));
    await page.evaluate(([s, g]) => LOOKTEST.frame(s, g), [s, g]); const png = await page.evaluate(() => LOOKTEST.png()); fs.writeFileSync(path.join(SCRATCH, `render-${s}.png`), Buffer.from(png.split(',')[1], 'base64')); }
  console.log('score', fin.score.toFixed(2), 'fails', fin.fails); const bad = Object.entries(fin.terms).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}=${v.toFixed(2)}`); console.log(bad.join('  '));
  console.log('render', JSON.stringify(round({ A: fin.raw.A.regions, B: fin.raw.B.regions, bloomA: fin.raw.A.bloom.r, bloomB: fin.raw.B.bloom.r, hfA: fin.raw.A.tex.hf }, 2)));
  console.log('film  ', JSON.stringify(round({ A: film.A.regions, B: film.B.regions, bloomA: film.A.bloom.r, bloomB: film.B.bloom.r, hfA: film.A.tex.hf }, 2)));
  if (!fs.existsSync(GENOME_FILE) || process.env.LOOK_WRITE) writeGenome(g || await page.evaluate(() => LOOK.GENOME), film, fin);
  await browser.close();
}

async function strip() {
  const { browser, page } = await openPage(); const g = JSON.parse(fs.readFileSync(GENOME_FILE)).genome; const shots = [];
  for (const s of ['A', 'B']) { await page.evaluate(([s, g]) => LOOKTEST.frame(s, g), [s, g]); const png = await page.evaluate(() => LOOKTEST.png()); const f = path.join(SCRATCH, `strip-${s}.png`); fs.writeFileSync(f, Buffer.from(png.split(',')[1], 'base64')); shots.push(f); }
  // a spot switch-off frame (renders only)
  await page.evaluate(g => { LOOKTEST.frame('A', g); LOOK.reveal(LOOKTEST.H.room ? LOOKTEST.H.room.parent.children.find(o => o.type === 'Group' && o.children.length > 2) : null, 1); }, g).catch(() => { });
  await page.evaluate(g => { const sc = LOOKTEST.H.lights.key.parent.parent; const mem = sc.children.find(o => o.type === 'Group' && !o.name); LOOK.reveal(mem, 0.45); LOOKTEST.H.render(0, true); }, g);
  const png = await page.evaluate(() => LOOKTEST.png()); const fS = path.join(SCRATCH, 'strip-spots.png'); fs.writeFileSync(fS, Buffer.from(png.split(',')[1], 'base64'));
  await browser.close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', shots[0], '-i', shots[1], '-i', fS, '-filter_complex', '[0][1][2]hstack=3,scale=1920:-2', path.join(HERE, 'look-strip.png')]);
  fs.mkdirSync(WORK, { recursive: true });
  for (const [s, t] of [['A', 146.0], ['B', 155.3]]) { const ff = frameFile(t);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', ff, '-i', shots[s === 'A' ? 0 : 1], '-filter_complex', '[0]scale=640:360[a];[a][1]hstack=2', path.join(WORK, `side-${s}.png`)]); }
  console.log('wrote', path.join(HERE, 'look-strip.png'), 'and', WORK + '/side-A.png, side-B.png');
}

(async () => {
  const cmd = process.argv[2] || 'frame';
  if (cmd === 'film') { const { browser, page } = await openPage(); const f = await measureFilm(page); console.log(JSON.stringify(round({ A: f.A.regions, B: f.B.regions, bloomA: f.A.bloom, bloomB: f.B.bloom, texA: f.A.tex }, 2))); await browser.close(); }
  else if (cmd === 'frame') await frame();
  else if (cmd === 'evolve') await evolve(+(process.argv[3] || 30));
  else if (cmd === 'strip') await strip();
  else console.log('usage: node look-measure.js film|frame|evolve [gens]|strip');
})().catch(e => { console.error(e); process.exit(1); });
