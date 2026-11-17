// Conditioning plates: clean, orb-free renders of an accepted model from the eight camera families, with a depth
// pass and a turntable, for steering a video model. The link from "better models" to "better videos".
//   node tools/lift/plates.mjs bday_07 [more ids]     -> assets/eye/plates/<id>/a1..a8.jpg, a1..a8_depth.jpg, turn.mp4
// Needs a static server on the repo root (PORT, default 8765) and ffmpeg.
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), PORT = process.env.PORT || 8765;
// yaw, elevation (null = the footage's own pitch), zoom: after the repo's angle families ANG-01..08
const ANG = [['a1', 0, 6, 1.7], ['a2', 32, 25, 1.15], ['a3', 0, 10, 0.8], ['a4', -18, 10, 1.0], ['a5', 0, 46, 1.3], ['a6', 40, 30, 1.2], ['a7', 0, null, 0.7], ['a8', 12, 14, 2.4]];
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1300, height: 760 } });
p.on('pageerror', e => console.log('PAGE ERROR', e.message));
await p.goto(`http://127.0.0.1:${PORT}/eye.html?bare=1&w=1280&h=720`); await p.waitForFunction('window.EYE && window.EYE.ready');
const save = async f => fs.writeFileSync(f, Buffer.from((await p.evaluate(() => EYE.png())).split(',')[1], 'base64'));
for (const id of process.argv.slice(2)) {
  const dir = path.join(ROOT, 'assets/eye/plates', id); fs.mkdirSync(dir, { recursive: true });
  await p.evaluate(i => EYE.show(i), id); await p.evaluate(() => EYE.texReady());
  for (const [n, yaw, elev, zoom] of ANG) {
    await p.evaluate(a => EYE.set({ gen: 2, ortho: false, room: true, matte: false, depthPass: false, yaw: a[0], elev: a[1], zoom: a[2], t: 1 }), [yaw, elev, zoom]); await save(path.join(dir, n + '.jpg'));
    await p.evaluate(() => EYE.set({ depthPass: true })); await save(path.join(dir, n + '_depth.jpg'));
  }
  const tmp = fs.mkdtempSync('/tmp/turn-');
  for (let f = 0; f < 144; f++) { await p.evaluate(y => EYE.set({ depthPass: false, room: false, yaw: y, elev: null, zoom: 1.1 }), f * 2.5); await save(path.join(tmp, String(f).padStart(4, '0') + '.jpg')); }
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24', '-i', path.join(tmp, '%04d.jpg'), '-c:v', 'libx264', '-crf', '21', '-pix_fmt', 'yuv420p', '-vf', 'scale=960:-2', path.join(dir, 'turn.mp4')]);
  fs.rmSync(tmp, { recursive: true }); console.log(id, 'plates written');
}
await b.close();
