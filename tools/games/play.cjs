#!/usr/bin/env node
/* Plays games/breath with the keyboard, as a player would, and films it.
   The scenario reads only window.__game.state (what is on screen: where the lit candles are, the lung, the beat) and presses arrows and space.
   It never writes into the game. Frames are stepped (?manual), so the film is 30 fps whatever this machine's speed; the true frame rate on
   real hardware is NOT measured here (this runs on a software renderer).
     node tools/games/srv.cjs &
     node tools/games/play.cjs --clip bday_35 --seconds 24 --out games/breath/takes/bday_35.mp4
     node tools/games/play.cjs --dry --seconds 120 [--tune reach,drain,back,out,fill]      (no film: plays as fast as it can, to tune how hard the game is) */
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs'), path = require('path');
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf('--' + k); return i < 0 ? d : A[i + 1]; };
const DRY = A.includes('--dry'), TUNE = opt('tune', ''), CLIP = opt('clip', 'bday_35'), SECONDS = +opt('seconds', 24), OUT = opt('out', 'take.mp4'), LOOK = opt('look', 'film'), W = 960, H = 540, FPS = 30;
(async () => {
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(`http://localhost:8095/games/breath/index.html?clip=${CLIP}&autostart&manual&seed=7&look=${LOOK}${TUNE ? '&tune=' + TUNE : ''}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__game && window.__game.state.phase === 'play', null, { timeout: 40000 });
  const ff = DRY ? { stdin: { write: () => true, end() {} }, on: (e, f) => f() } : spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const down = new Set(), key = async (k, on) => { if (on && !down.has(k)) { down.add(k); await p.keyboard.down(k); } else if (!on && down.has(k)) { down.delete(k); await p.keyboard.up(k); } };
  const log = []; let last = null;
  for (let f = 0; f < SECONDS * FPS; f++) {
    const s = await p.evaluate(() => window.__game.state);
    if (s.phase === 'play') {      // go to the nearest flame; blow when over it; with a full lung, wait a moment for the third beat
      const lit = s.targets.filter(t => t.lit); let t = null, bd = 1e9; lit.forEach(q => { const d = Math.hypot(q.x - s.aim[0], q.z - s.aim[1]); if (d < bd) { bd = d; t = q; } });
      if (t) { const dx = t.x - s.aim[0], dz = t.z - s.aim[1]; await key('ArrowRight', dx > .008); await key('ArrowLeft', dx < -.008); await key('ArrowDown', dz > .008); await key('ArrowUp', dz < -.008);
        const waitBeat = !s.blowing && s.lung > .95 && s.beat > 1.25 && s.beat < 1.8; await key('Space', bd < .022 && !s.winded && (s.blowing ? s.lung > .03 : s.lung > .3) && !waitBeat); }
      else { for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Space']) await key(k, false); }
    } else { for (const k of [...down]) await key(k, false); if (s.phase === 'end') break; }
    if (!last || last.phase !== s.phase || last.clip !== s.clip) log.push({ t: +(f / FPS).toFixed(2), phase: s.phase, clip: s.clip, cakes: s.cakes, lost: s.lost, breaths: s.breaths }); last = s;
    if (DRY) { await p.evaluate(dt => window.__game.advance(dt, true), 1 / FPS); continue; }
    const jpg = await p.evaluate(dt => { window.__game.advance(dt); const c = window.__cap || (window.__cap = document.createElement('canvas')); c.width = innerWidth; c.height = innerHeight; const x = c.getContext('2d'); x.drawImage(document.getElementById('gl'), 0, 0, c.width, c.height); x.drawImage(document.getElementById('hud'), 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .92).slice(23); }, 1 / FPS);
    if (!ff.stdin.write(Buffer.from(jpg, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); const end = await p.evaluate(() => window.__game.state);
  if (DRY) { console.log(JSON.stringify({ tune: TUNE || 'default', cakes: end.cakes, lost: end.lost, breaths: end.breaths, errors: errs.length, phases: log.map(l => l.t + ':' + l.phase + ':' + l.clip.replace('bday_', '')).join(' ') })); await b.close(); return; }
  const res = { clip: CLIP, seconds: SECONDS, cakes: end.cakes, lost: end.lost, breaths: end.breaths, console_errors: errs, log }; fs.writeFileSync(OUT.replace(/\.mp4$/, '.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ cakes: end.cakes, lost: end.lost, breaths: end.breaths, errors: errs.length, phases: log.map(l => l.t + ':' + l.phase + ':' + l.clip.replace('bday_', '')).join(' ') })); await b.close();
})();
