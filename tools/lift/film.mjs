// A film of the Eye being used: the iris turned through birthdays, the generation arc stepped from the hand-made rig
// to the measured solid, the eye carried round the cake, and time run through the making of one cake.
//   node tools/lift/film.mjs [out.mp4]      (default assets/eye/eye-proof.mp4; silent: the page's detent grains are not captured)
// Needs a static server on the repo root (PORT, default 8765) and ffmpeg.
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), PORT = process.env.PORT || 8765;
const out = process.argv[2] || path.join(ROOT, 'assets/eye/eye-proof.mp4');
const ids = (process.env.IDS || 'bday_07,bday_25,bday_73,bday_01').split(',');
const tmp = fs.mkdtempSync('/tmp/eyefilm-');
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const cx = await b.newContext({ viewport: { width: 900, height: 900 }, recordVideo: { dir: tmp, size: { width: 900, height: 900 } } });
const p = await cx.newPage(); p.on('pageerror', e => console.log('PAGE ERROR', e.message));
await p.goto(`http://127.0.0.1:${PORT}/eye.html?id=${ids[0]}&gen=0`); await p.waitForFunction('window.EYE && window.EYE.ready');
const wait = ms => p.waitForTimeout(ms);
const ease = async (key, a, z, ms) => { const n = Math.round(ms / 40); for (let i = 1; i <= n; i++) { const u = i / n, e = u * u * (3 - 2 * u); await p.evaluate(o => EYE.set(o), { [key]: a + (z - a) * e }); await wait(40); } };
await wait(1200);
for (const g of [1, 2]) { await p.evaluate(g => EYE.set({ gen: g }), g); await wait(1300); }           // G0 -> G1 -> G2 on the first cake
await ease('yaw', 0, 360, 6000);                                                                           // round it
for (const id of ids.slice(1)) {                                                                           // the iris: other birthdays
  await p.evaluate(i => EYE.go(EYE.IDS.indexOf(i)), id); await wait(900);
  await p.evaluate(() => EYE.set({ gen: 1 })); await ease('yaw', 0, 55, 1500); await wait(300);              // relief: hollow from the side
  await p.evaluate(() => EYE.set({ gen: 2 })); await wait(600); await ease('yaw', 55, 200, 2600); await ease('yaw', 200, 360, 1800);
}
await p.evaluate(() => EYE.set({ gen: 3, t: 0, yaw: 20 })); await ease('t', 0, 1, 5000); await wait(800);  // the cake being made
await cx.close(); await b.close();
const webm = fs.readdirSync(tmp).find(f => f.endsWith('.webm'));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(tmp, webm), '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '30', '-an', out]);
fs.rmSync(tmp, { recursive: true }); console.log('wrote', out);
