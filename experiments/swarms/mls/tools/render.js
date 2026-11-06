// Renders proof.mp4 (10 s, 30 fps, sound) and strip.png. node tools/render.js <frames-dir>
// The page runs the game's demonstration (the left collar's SCENE) through the same rings; each frame is stepped by exactly 1/30 s.
// The soundtrack is mixed from the events the game logged (sound.js, with ana/device-sounds.wav grains).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DIR = path.join(__dirname, '..'), FR = process.argv[2] || '/tmp/blow-frames', PAGEF = process.env.PAGE || 'index.html', OUT = process.env.OUT || 'proof', URL = 'http://localhost:8765/experiments/swarms/mls/' + PAGEF;
const SOUND = require(path.join(DIR, 'sound.js'));
function readWav(f) { const b = fs.readFileSync(f); let o = 12, sr = 48000, data = null; while (o < b.length) { const id = b.toString('ascii', o, o + 4), n = b.readUInt32LE(o + 4);
  if (id === 'fmt ') sr = b.readUInt32LE(o + 12); if (id === 'data') { data = new Float32Array(n / 2); for (let i = 0; i < data.length; i++) data[i] = b.readInt16LE(o + 8 + 2 * i) / 32768; } o += 8 + n + (n % 2); } return { sr, data }; }
function writeWav(f, x, sr) { const b = Buffer.alloc(44 + x.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40); for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), 44 + 2 * i); fs.writeFileSync(f, b); }
(async () => {
  fs.mkdirSync(FR, { recursive: true });
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  // the comparison strip
  if (!process.env.PAGE) { const p = await br.newPage({ viewport: { width: 1290, height: 1250 } }); await p.goto(URL + '?strip=1'); await p.waitForFunction('window.READY === true'); await p.screenshot({ path: path.join(DIR, 'strip.png') }); await p.close(); }
  if (process.env.FORKSTRIP) { const p = await br.newPage({ viewport: { width: 1290, height: 660 } }); await p.goto(URL.replace(PAGEF, 'index.html') + '?forkstrip=1'); await p.waitForFunction('window.READY === true'); await p.screenshot({ path: path.join(DIR, 'fork-strip.png') }); await p.close(); if (process.env.FORKSTRIP === 'only') { await br.close(); return; } }
  const p = await br.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '?proof=1'); await p.waitForFunction('window.READY === true');
  await p.evaluate(() => { G.playScript(); });
  const N = 300, light = [];
  for (let f = 0; f < N; f++) {
    const L = await p.evaluate(() => { G.update(1 / 30); PAGE.render(); PAGE.drawDev(); return G.light(0); }); light.push(L);
    await p.screenshot({ path: path.join(FR, `f${String(f).padStart(4, '0')}.png`) });
  }
  const log = await p.evaluate(() => G.log.map(e => Object.assign({}, e)));
  await br.close(); if (errs.length) console.log('page errors:', errs);
  fs.writeFileSync(path.join(DIR, OUT + '-events.json'), JSON.stringify(log.map(e => Object.assign({}, e, { t: +e.t.toFixed(4) }))));
  const g = readWav(path.join(DIR, '../../../ana/device-sounds.wav'));
  const mix = SOUND.mix(log, { sr: 48000, dur: 10, grains: g.data, gsr: g.sr, light: t => light[Math.min(N - 1, Math.floor(t * 30))] });
  writeWav(path.join(FR, 'proof.wav'), mix, 48000);
  execSync(`ffmpeg -v error -y -framerate 30 -i ${FR}/f%04d.png -i ${FR}/proof.wav -c:v libx264 -pix_fmt yuv420p -crf 20 -preset medium -c:a aac -b:a 160k -shortest -movflags +faststart ${path.join(DIR, OUT + '.mp4')}`);
  console.log('ok', log.length, 'events');
})();
