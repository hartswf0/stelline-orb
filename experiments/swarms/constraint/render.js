/* Renders proof.mp4: plays the proof script in the page at a fixed 30 fps clock (no wall time), screenshots
   every frame, saves the solver trace and the sound log, mixes the device's own grains at the logged times,
   and encodes. Run from the repo root:  node experiments/swarms/constraint/render.js  (a static server on :8731
   serving the repo root must be running: python3 -m http.server 8731). */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const HERE = __dirname, FR = path.join(process.env.FRAMES_DIR || '/tmp/constraint-frames'), FPS = 30, DUR = 10, W = 1280, H = 720;
(async () => {
  fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: W, height: H } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8731/experiments/swarms/constraint/index.html?proof'); await p.waitForFunction(() => window.PG && PG.headReady(), null, { timeout: 10000 });
  await p.evaluate(() => document.fonts.ready); await p.evaluate(() => PG.play());
  for (let f = 0; f < FPS * DUR; f++) { await p.screenshot({ path: path.join(FR, `f${String(f).padStart(4, '0')}.png`) }); await p.evaluate(dt => PG.advance(dt), 1 / FPS); }
  const out = await p.evaluate(() => ({ snd: PG.SNDLOG, trace: PG.G().trace, events: PG.G().events, lit: PG.G().lit }));
  await b.close(); if (errs.length) { console.error(errs); process.exit(1); }
  // the page clock starts at 0 when PG.play() is called and frame f is shown at f/FPS before advancing
  fs.writeFileSync(path.join(HERE, 'solver-trace.json'), JSON.stringify({ about: 'One entry per machine step of the proof passage (index.html?proof, proof-script.js). Units m, deg, s. residual_goal = taper flame to pen; hard_max = worst hard-constraint residual.', fps: FPS, trace: out.trace, events: out.events.filter(e => !/^step|detent/.test(e.kind)) }, null, 1));
  fs.writeFileSync(path.join(FR, 'snd.json'), JSON.stringify(out.snd));
  execSync(`node ${path.join(HERE, 'mix.js')} ${path.join(FR, 'snd.json')} ${path.join(FR, 'snd.wav')} ${DUR}`, { stdio: 'inherit' });
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${FR}/f%04d.png -i ${FR}/snd.wav -c:v libx264 -pix_fmt yuv420p -crf 20 -r ${FPS} -c:a aac -b:a 160k -shortest ${path.join(HERE, 'proof.mp4')}`, { stdio: 'inherit' });
  console.log('frames', FPS * DUR, 'sound events', out.snd.length, 'lit', out.lit.map(Number).join(''));
})();
