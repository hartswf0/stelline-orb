#!/usr/bin/env node
/* Films the Memory Weaver (field-orb-05.html) building recipes from its RECIPE book, one MP4 per recipe.
   Every frame is stepped (FORGE.manual + FORGE.advance), so the film is exact whatever the machine's speed; the room fills the frame and the orb,
   its rings turning for every gesture, sits below centre. Nothing is drawn on top: what is filmed is the instrument.
     python3 -m http.server 8095 &                       (from the repository root)
     node tools/recipes/record_recipes.cjs --out assets/recipes film_canon canonical_chamber_7 bday_18
     node tools/recipes/record_recipes.cjs --out assets/recipes --shelf ARCHETYPE --part 0/3      (a third of a shelf, for running three at once)
   Options: --pace 4 (the hand's speed, x) · --fps 24 (frames stepped per second of the room's time) · --play 24 (frame rate of the file; --fps 12 --play 24 films at double speed) · --size 1280x720 · --layout inset|room|full · --tail 1.6 (seconds held on the finished cake) */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf('--' + k); if (i < 0) return d; const v = A[i + 1]; A.splice(i, 2); return v; };
const OUT = opt('out', 'assets/recipes'), PACE = +opt('pace', 4), FPS = +opt('fps', 24), [W, H] = opt('size', '1280x720').split('x').map(Number), LAYOUT = opt('layout', 'inset'), TAIL = +opt('tail', 1.6), PLAY = +opt('play', 0) || FPS, SHELF = opt('shelf', null), PART = opt('part', null), URL0 = opt('url', 'http://localhost:8095/field-orb-05.html');
const CSS = { inset: '.app{grid-template-rows:1fr !important} #orb{position:fixed !important;left:50%;bottom:1.2vw;width:46vw;height:19.5vw;margin-left:-23vw;background:none !important;border:0 !important}', room: '.app{grid-template-rows:1fr 0px !important} #orb{height:0 !important;border:0 !important;overflow:hidden}', full: '' }[LAYOUT];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('PAGE', String(e.stack || e).slice(0, 300)));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: CSS });
  await p.evaluate(([W, H, lift]) => { window.dispatchEvent(new Event('resize')); const F = window.FORGE; F.manual(); if (lift) F.cam.setViewOffset(W, H, 0, Math.round(H * lift), W, H); window.__cv = document.createElement('canvas'); }, [W, H, LAYOUT === 'inset' ? .13 : 0]);   // the cake sits above the orb, not behind it
  let ids = A.slice();
  if (SHELF) ids = ids.concat(await p.evaluate(s => (window.FORGE.BOOK.shelves.find(q => q[0] === s) || [0, []])[1].map(r => r.id), SHELF));
  if (PART) { const [k, n] = PART.split('/').map(Number); ids = ids.filter((_, i) => i % n === k); }   // --part k/n: every n-th id, for running n recorders side by side
  for (const id of ids) {
    const mp4 = path.join(OUT, id + '.mp4'); if (fs.existsSync(mp4) && !process.env.FORCE) { console.log('have', id); continue; }
    const ok = await p.evaluate(([id, pace]) => { const F = window.FORGE, B = F.BOOK, hit = B.find(id); if (!hit) return null; B.shelf = hit[0]; B.idx = hit[1]; B.pace = pace; F.S.mode = 'RECIPE'; B.load(); for (let i = 0; i < 8; i++) F.step(1 / 24); B.start(); return { title: B.cur().title, steps: B.run.steps.map(s => s.t) }; }, [id, PACE]);
    if (!ok) { console.log('no recipe', id); continue; }
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(PLAY), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
    let n = 0, tail = Math.round(TAIL * FPS), t0 = Date.now(); const marks = [];
    for (;;) {
      const r = await p.evaluate(([dt, W, H]) => { const F = window.FORGE; F.advance(dt); const c = window.__cv; c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#030403'; x.fillRect(0, 0, W, H);
        document.querySelectorAll('#room canvas, #orb canvas').forEach(cv => { const q = cv.getBoundingClientRect(); if (q.width > 2 && q.height > 2 && cv.width > 2) x.drawImage(cv, q.left, q.top, q.width, q.height); });
        return { jpg: c.toDataURL('image/jpeg', .93).slice(23), run: !!F.BOOK.run, i: F.BOOK.run ? F.BOOK.run.i : -1 }; }, [1 / FPS, W, H]);
      if (!ff.stdin.write(Buffer.from(r.jpg, 'base64'))) await new Promise(res => ff.stdin.once('drain', res));
      if (r.run && (!marks.length || marks[marks.length - 1].i !== r.i)) marks.push({ i: r.i, t: +(n / PLAY).toFixed(3), step: ok.steps[r.i] });
      n++; if (!r.run && --tail <= 0) break; if (n > FPS * 240) break;
    }
    ff.stdin.end(); await new Promise(res => ff.on('close', res));
    fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify({ id, title: ok.title, fps: PLAY, frames: n, duration_s: +(n / PLAY).toFixed(3), pace: +(PACE * PLAY / FPS).toFixed(2), layout: LAYOUT, steps: marks }, null, 1));
    console.log('filmed', id, n, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's', ((Date.now() - t0) / n).toFixed(0) + 'ms/frame');
  }
  await b.close();
})();
