/* Records proof.mp4: plays the scene (game.js SCRIPT) in index.html?proof on a fixed 30 fps clock (no wall time), screenshots
   every frame, mixes the game's sound log with sound.js (device clicks from ana/device-sounds.wav when present), encodes with
   ffmpeg, and writes trace.json. Needs a static server on :8762 serving the repo root (python3 -m http.server 8762). */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const SOUND = require('./sound.js'), HERE = __dirname, FR = process.env.FRAMES_DIR || '/tmp/dyn3d-frames', FPS = 30, W = 1280, H = 720, DUR = 28.5, SR = 48000;
(async () => {
  const START = +(process.env.START || 0); if (!START) fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });   // START: resume after an interrupted run (the game is deterministic; earlier frames are re-simulated without drawing)
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: W, height: H } }); p.setDefaultTimeout(300000); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8762/experiments/swarms/3d-dynamics/index.html?proof'); await p.waitForFunction(() => window.PG); await p.evaluate(() => document.fonts.ready); await p.evaluate(() => PG.play());
  const N = Math.round(DUR * FPS), t0 = Date.now();
  if (START) await p.evaluate(n => { for (let i = 0; i < n - 4; i++) game.advance(1 / 30); for (let i = Math.max(0, n - 4); i < n; i++) PG.advance(1 / 30); }, START);
  for (let f = START; f < N; f++) { for (let k = 0; ; k++) { try { await p.screenshot({ path: path.join(FR, `f${String(f).padStart(4, '0')}.png`) }); break; } catch (e) { if (k >= 6) throw e; await new Promise(r => setTimeout(r, 2000)); } }   /* the capture fails now and then under load */ await p.evaluate(dt => PG.advance(dt), 1 / FPS); if (f % 150 === 0) console.log('frame', f, ((Date.now() - t0) / 1000).toFixed(0) + ' s'); }
  const g = await p.evaluate(() => ({ log: game.log, trace: game.trace, events: game.events, score: game.scoreAtBlow, worldEvents: { TUNED: game.W.TUNED.events, LOOSE: game.W.LOOSE.events, RIGID: game.W.RIGID.events } }));
  await b.close(); if (errs.length) { console.error(errs); process.exit(1); }
  // sound: frame f shows game time (f)/FPS ... PG.play() at t=0, the first screenshot is t=0
  let G = null; const wav = path.join(HERE, '../../../ana/device-sounds.wav'); if (fs.existsSync(wav)) G = SOUND.wavToGrains(fs.readFileSync(wav));
  const n = Math.round(DUR * SR), mix = new Float32Array(n); g.log.forEach(ev => { const y = SOUND.render(ev, SR, G), s0 = Math.round(ev.t * SR); for (let i = 0; i < y.length && s0 + i < n; i++) mix[s0 + i] += y[i]; });
  let pk = 0; for (const v of mix) pk = Math.max(pk, Math.abs(v)); const gain = pk > .89 ? .89 / pk : 1; const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(mix[i] * gain * 32767))), 44 + i * 2); fs.writeFileSync(path.join(FR, 'snd.wav'), buf);
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${FR}/f%04d.png -i ${FR}/snd.wav -c:v libx264 -pix_fmt yuv420p -crf 20 -r ${FPS} -c:a aac -b:a 160k -shortest ${path.join(HERE, 'proof.mp4')}`, { stdio: 'inherit' });
  // trace: per frame [t, tuned secondary energy J, icing flow mm3/s, loose secondary energy J, tuned at rest], events, and settle times after each impulse
  const tr = g.trace.filter((_, i) => i % 1 === 0), impulses = g.events.filter(e => ['landed', 'pour', 'candle-set', 'fell', 'split'].includes(e.kind) || e.kind === 'lit');
  const settle = impulses.map(e => { const after = tr.filter(r => r[0] > e.t + .02); const restAt = after.find(r => r[4] === 1); return { event: e.kind, k: e.k, t: e.t, restAfter: restAt ? +(restAt[0] - e.t).toFixed(3) : null }; });
  fs.writeFileSync(path.join(HERE, 'trace.json'), JSON.stringify({ about: 'The proof run (index.html?proof, game.js SCRIPT) at 30 fps. trace rows: [t s, TUNED secondary energy J, icing flow mm^3/s, LOOSE secondary energy J, TUNED at rest 0/1]. restAfter = seconds from the event to the next frame the whole TUNED cake is at rest (another impulse can come first; null = not at rest before the next one or the end).', fps: FPS, duration: DUR, scoreAtBlow: g.score, events: g.events, settle, soundEvents: g.log.length, presetEvents: g.worldEvents, trace: tr }, null, 0));
  console.log('frames', N, 'sound events', g.log.length, 'peak', pk.toFixed(3), 'grains', !!G);
})();
