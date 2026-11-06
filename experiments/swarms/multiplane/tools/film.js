// films the scene button (a solved game) at 30 fps on a phone-sized page, renders its sound offline with the same graph, writes proof.mp4 and trace.json
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const URL = process.env.MP_URL || 'http://localhost:8765/experiments/swarms/multiplane/index.html', DIR = path.join(__dirname, '..'), TMP = process.env.TMPDIR_FILM || '/tmp/mp-film', DUR = 10, FPS = 30;
(async () => { fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 2 }); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto(URL); await pg.waitForFunction(() => window.MP && MP.ready); await pg.evaluate(() => document.fonts.ready);
  await pg.evaluate(() => { MP.film(true); MP.playScene(); });
  for (let f = 0; f < DUR * FPS; f++) { await pg.evaluate(dt => MP.step(dt), 1 / FPS); await pg.screenshot({ path: path.join(TMP, String(f).padStart(5, '0') + '.png') }); }
  const { frames, events } = await pg.evaluate(() => ({ frames: MP.FRAMES, events: MP.EVENTS.slice() }));
  const a = await pg.evaluate(async ([fr, ev, d]) => MP.audioRender(fr, ev, d), [frames, events, DUR]);
  fs.writeFileSync(path.join(TMP, 'sound.wav'), Buffer.from(a.b64, 'base64'));
  fs.writeFileSync(path.join(DIR, 'trace.json'), JSON.stringify({ about: 'One entry per film frame (30 fps) of proof.mp4, and every sound event. Times in seconds from the start of the scene.', fps: FPS, frames, events, audioPeakBeforeLimit: a.peak }, null, 0));
  await br.close();
  execSync(`ffmpeg -loglevel error -y -framerate ${FPS} -i ${TMP}/%05d.png -i ${TMP}/sound.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -vf scale=810:1440 -c:a aac -b:a 160k -shortest ${path.join(DIR, 'proof.mp4')}`);
  console.log('wrote proof.mp4, trace.json; frames', frames.length, 'events', events.length); })();
