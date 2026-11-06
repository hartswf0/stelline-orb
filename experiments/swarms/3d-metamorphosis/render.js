/* render.js: proof.mp4 and trace.json. Plays the page's own SCENE (index.html?proof) on a fixed 30 fps clock, screenshots every
   frame at phone size (540 x 960), mixes the logged sounds (mix.js), encodes with ffmpeg.
   Needs a static server on the repo root:  python3 -m http.server 8741   then  node experiments/swarms/3d-metamorphosis/render.js */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const HERE = __dirname, FR = process.env.FRAMES_DIR || '/tmp/claude-0/-home-claude/5dcbf124-08aa-5357-a87a-ec1f490e8f81/scratchpad/meta/frames', FPS = 30;
(async () => { fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 540, height: 960 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8741/experiments/swarms/3d-metamorphosis/index.html?proof'); await p.waitForFunction(() => window.PG); await p.evaluate(() => document.fonts.ready);
  const DUR = await p.evaluate(() => PG.SCRIPT.dur + .4); await p.evaluate(() => PG.play());
  const NF = Math.ceil(DUR * FPS); for (let f = 0; f < NF; f++) { await p.evaluate(() => PG.advance(1 / 30)); await p.screenshot({ timeout: 120000, path: path.join(FR, `f${String(f).padStart(4, '0')}.png`) }); if (f % 150 === 0) console.log('frame', f, 'of', NF); }
  const out = await p.evaluate(() => ({ snd: PG.SNDLOG, steps: PG.TR.steps, events: PG.TR.events, frames: PG.TR.frames, path: PG.S.path }));
  await b.close(); if (errs.length) { console.error(errs); process.exit(1); }
  const ms = out.steps.filter(s => s.kind === 'morph'), mach = out.steps.filter(s => s.machine);
  const summary = { duration_s: +(NF / FPS).toFixed(2), path: out.path, machine_steps: mach.length, at_11_8: mach.filter(s => s.machine === 11.8).length, at_23_6: mach.filter(s => s.machine === 23.6).length, morph_steps: ms.length,
    worst_dV_rel: Math.max(...ms.map(s => s.dV_rel)), flips: ms.reduce((a, s) => a + s.flips, 0), crossings: ms.reduce((a, s) => a + s.crossings, 0), worst_candle_move_per_frame_mm: +(Math.max(...out.frames.map(f => f.candleMove)) * 1000).toFixed(2),
    cuts: out.events.filter(e => e.kind === 'cut').map(e => `${e.from}>${e.to} ${e.how} at ${e.t}s`) };
  fs.writeFileSync(path.join(HERE, 'trace.json'), JSON.stringify({ about: 'The proof run (index.html?proof, the SCENE script), on a fixed 30 fps clock. steps: one entry per machine step (t in s; V_ml cake volume; dV_rel = |dV| / larger key volume; flips = face normals reversed since the previous step; crossings = profile self-intersections). events: what happened. frames: largest candle anchor move per frame (m). Frame f of proof.mp4 shows the state after advance f+1, i.e. t = (f+1)/30.', summary, steps: out.steps, events: out.events, frames: out.frames }, null, 0));
  fs.writeFileSync(path.join(FR, 'snd.json'), JSON.stringify(out.snd)); console.log(JSON.stringify(summary));
  execSync(`node ${path.join(HERE, 'mix.js')} ${path.join(FR, 'snd.json')} ${path.join(FR, 'snd.wav')} ${NF / FPS}`, { stdio: 'inherit' });
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${FR}/f%04d.png -i ${FR}/snd.wav -c:v libx264 -pix_fmt yuv420p -crf 20 -r ${FPS} -c:a aac -b:a 160k -shortest ${path.join(HERE, 'proof.mp4')}`, { stdio: 'inherit' });
  console.log('done'); })();
