// A short film of one memory: it assembles out of the mist piece by piece, holds whole and lit among its guests
// while the eye moves in, and falls back to light when the candles are blown.
//   node tools/orb06/film.mjs 5 33 ...      (ages, as made by make100.mjs)  -> assets/memories/films/NNN.mp4
// Shot at 12 frames a second, one screenshot per frame (the page is set to each frame, not played in real time), so
// the film is the same on any machine. 1280 x 720, no orb, no text, silent.
// Needs assets/memories/memories.json, a static server on the repo root (PORT, default 8765) and ffmpeg.
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), PORT = process.env.PORT || 8765, OUT = path.join(ROOT, 'assets/memories/films');
fs.mkdirSync(OUT, { recursive: true });
const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/memories/memories.json')));
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const n of process.argv.slice(2)) {
  const P = db[n]; if (!P) { console.log(n, 'not made'); continue; }
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } }), tmp = fs.mkdtempSync('/tmp/memfilm-'); page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await page.goto(`http://127.0.0.1:${PORT}/orb-06.html?${P.q}&stage=1&notext=1`); await page.waitForFunction('window.FORGE'); await page.waitForTimeout(500);
  const N = await page.evaluate(() => { FORGE.sequence(4); FORGE.setMode('TIME'); window.__y0 = FORGE.S.orbit.yaw; return FORGE.DOC.frames.length; });
  let k = 0; const shot = async () => { await page.waitForTimeout(170); await page.screenshot({ path: path.join(tmp, String(k++).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 86 }); };
  const set = (f, push, dy) => page.evaluate(([f, push, dy]) => { FORGE.DOC.cur = f; FORGE.showFrame(); FORGE.frameIt(push); FORGE.S.orbit.yaw = window.__y0 + dy; }, [f, push, dy]);
  const making = N - 5;                                   // frames before the guests arrive
  for (let i = 0; i < 40; i++) { await set(Math.min(making, Math.floor(i / 40 * (making + 1))), 1.12 - i * .002, -.16 + i * .003); await shot(); }   // it assembles
  for (let i = 0; i < 40; i++) { await set(N - 2, 1.04 - i * .007, -.04 + i * .0016); await shot(); }                                                // it holds, the eye moves in
  for (let i = 0; i < 18; i++) { await set(N - 1, .76, .024); await shot(); }                                                                         // the blow
  await page.close();
  const out = path.join(OUT, String(n).padStart(3, '0') + '.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '12', '-i', path.join(tmp, '%04d.jpg'), '-vf', 'fps=24', '-c:v', 'libx264', '-crf', '23', '-pix_fmt', 'yuv420p', '-an', out]);
  fs.rmSync(tmp, { recursive: true }); console.log(n, P.name, P.design, '->', path.relative(ROOT, out), k, 'frames');
}
await b.close();
