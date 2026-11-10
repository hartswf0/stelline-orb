#!/usr/bin/env node
/* Films the Memory Weaver (field-orb-05.html) building recipes from its RECIPE book, one MP4 per recipe.
   Every frame is stepped (FORGE.manual + FORGE.advance), so the film is exact whatever the machine's speed; the room fills the frame and the orb,
   its rings turning for every gesture, sits below centre. Nothing is drawn on top: what is filmed is the instrument.
     python3 -m http.server 8095 &                       (from the repository root)
     node tools/recipes/record_recipes.cjs --out assets/recipes film_canon canonical_chamber_7 bday_18
     node tools/recipes/record_recipes.cjs --out assets/recipes --shelf ARCHETYPE --part 0/3      (a third of a shelf, for running three at once)
     node tools/recipes/record_recipes.cjs --out assets/recipes/hero --layout room --hero 4 film_canon      (no build filmed: the finished cake, candles lit,
       the camera circling for 4 s, the flames blown out by ring 5 in the last third; files are <id>_hero.mp4)
     node tools/recipes/record_recipes.cjs --out assets/normalized/twin --layout room --size 960x540 --fps 12 --twin bday_33      (the coded twin of a
       normalized plate: the same recipe built, then filmed for one bar of 4 beats with the cake on the plates' grid, centre x, crown line and
       width as in assets/normalized/index.json, and blown out by ring 5 from the first frame of beat 3; files are <id>_twin.mp4)
     node tools/recipes/record_recipes.cjs --out <dir> --layout room --size 960x540 --buildout bday_27      (the full build-out of a normalized clip:
       the recipe is built once unseen to solve the grid camera, then built again from the empty table and filmed through that locked camera with the
       clip's own cast placed where they stood in the plate, then one bar with the candles lit and blown out on beat 3. Writes <id>_buildout_raw.mp4,
       one frame per step, and a .json of where the candles and the people arrive; tools/normalize/buildouts.py retimes it to exactly 16 beats.)
   Options: --pace 4 (the hand's speed, x) · --fps 24 (frames stepped per second of the room's time) · --play 24 (frame rate of the file; --fps 12 --play 24 films at double speed) · --size 1280x720 · --layout inset|room|full · --tail 1.6 (seconds held on the finished cake) */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf('--' + k); if (i < 0) return d; const v = A[i + 1]; A.splice(i, 2); return v; };
const OUT = opt('out', 'assets/recipes'), PACE = +opt('pace', 4), FPS = +opt('fps', 24), [W, H] = opt('size', '1280x720').split('x').map(Number), LAYOUT = opt('layout', 'inset'), TAIL = +opt('tail', 1.6), HERO = +opt('hero', 0), TWIN = A.indexOf('--twin') >= 0 ? (A.splice(A.indexOf('--twin'), 1), true) : false, BUILDOUT = A.indexOf('--buildout') >= 0 ? (A.splice(A.indexOf('--buildout'), 1), true) : false, PLAY = +opt('play', 0) || FPS, SHELF = opt('shelf', null), PART = opt('part', null), URL0 = opt('url', 'http://localhost:8095/field-orb-05.html');
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
    if (BUILDOUT) { const raw = path.join(OUT, id + '_buildout_raw.mp4'), rawOrb = path.join(OUT, id + '_orb_raw.mp4'); if (fs.existsSync(raw) && !process.env.FORCE) { console.log('have', id); continue; }
      // THE STANDARD: stage above (the picture, on the grid), the real controller beneath it filmed in the same pass, and the film's reticle standing beside the cake
      await p.setViewportSize({ width: W, height: H + Math.round(W * 270 / 960) }); await p.addStyleTag({ content: `.app{grid-template-rows:${H}px ${Math.round(W * 270 / 960)}px !important;height:${H + Math.round(W * 270 / 960)}px !important} #orb{height:auto !important;border:0 !important;overflow:visible !important}` }); await p.evaluate(() => { window.dispatchEvent(new Event('resize')); window.FORGE.S.reticleAside = 'crescent'; window.__cv2 = document.createElement('canvas');
        // the crescent is drawn in SVG over the room; it is rasterised into every captured frame
        window.__svgDraw = async (x, W, H) => { for (const sv of document.querySelectorAll('#room svg')) { if (!sv.innerHTML) continue; const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${sv.innerHTML}</svg>`); await im.decode(); x.drawImage(im, 0, 0, W, H); } }; });
      const pre = await p.evaluate(([id, W, H]) => { const F = window.FORGE, B = F.BOOK, T = window.THREE, hit = B.find(id); if (!hit) return null; B.shelf = hit[0]; B.idx = hit[1]; B.pace = 12; F.S.mode = 'RECIPE'; B.load(); B.start(); let t = 0; while (B.run && t < 600) { F.step(1 / 24); t += 1 / 24; }
        F.setMode('LOOK'); F.pickTo('cake'); F.S.shotIdx = 1; const o = F.S.orbit, yaw = .18; Object.assign(o, { yaw, pitch: -.2, dist: .9 }); o.tgt.set(0, .84, 0);
        const want = { top: H * (250 + 72) / 720, w: W * 480 / 1280 }, mesh = F.CAKE.children.filter(m => m.isMesh && m.geometry.attributes.color)[0]; let R = .12, crown = .83;
        for (let it = 0; it < 14; it++) { F.S.ease = null; F.step(1 / 240); const bb = new T.Box3().setFromObject(mesh), c = bb.getCenter(new T.Vector3()); R = (bb.max.x - bb.min.x) / 2; crown = bb.max.y; let x0 = 1e9, x1 = -1e9, y0 = 1e9;
          for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, q = F.worldToRoom(new T.Vector3(c.x + R * Math.cos(a), bb.max.y, c.z + R * Math.sin(a))), q2 = F.worldToRoom(new T.Vector3(c.x + R * Math.cos(a), bb.min.y + (bb.max.y - bb.min.y) * .3, c.z + R * Math.sin(a))); x0 = Math.min(x0, q[0], q2[0]); x1 = Math.max(x1, q[0], q2[0]); y0 = Math.min(y0, q[1]); }
          o.dist *= (x1 - x0) / want.w; o.tgt.y -= (y0 - want.top) * ((2 * R) / Math.max(1, x1 - x0)) * .9; o.tgt.x = c.x; o.tgt.z = c.z; window.__fit = [x0, x1, y0]; }
        // the locked camera, and where this clip's people go: the same size and place they have in the plate, on a sheet behind the cake
        const cam = { yaw, pitch: o.pitch, dist: o.dist, t: o.tgt.toArray() }, mpp = 2 * R / 480, r = .44, k = (o.dist + r) / o.dist, pc = window.PLATE_CAST && window.PLATE_CAST[B.cur().clip || B.cur().id], KB = F.KIDS[14];
        const place = pc && KB ? { h: (pc.box[3] - pc.box[1]) * mpp * k, lat: ((pc.box[0] + pc.box[2]) / 2 - 640) * mpp * k, bottom: crown - (pc.box[3] - 250) * mpp * k, r } : null;
        window.__bo = { cam, place, n: 0, candle: -1, party: -1, lock() { const o = F.S.orbit; F.S.ease = null; F.S.shotIdx = 1; F.S.turntable = false; o.yaw = cam.yaw; o.pitch = cam.pitch; o.dist = cam.dist; o.tgt.set(cam.t[0], cam.t[1], cam.t[2]);
            F.DOC.cast.forEach(c => { const K = F.KIDS[c.i], behind = Math.PI / 2 - cam.yaw + Math.PI; if (c.i === 14 && place) { c.a = behind + Math.atan2(place.lat, place.r); c.r = Math.hypot(place.r, place.lat); c.s = place.h / K.h; c.lift = place.bottom - K.base; } else if (K.party) { c.a = behind; c.r = .44; c.s = .72; c.lift = -.02; } else c.a = behind + (K.da || 0); }); } };
        B.pace = 4; F.S.mode = 'RECIPE'; B.start(); F.S.barT = 0; window.__bo.lock(); return { title: B.cur().title, steps: B.run.steps.map(s => s.t), fit: window.__fit, own_cast: !!place }; }, [id, W, H]);
      if (!pre) { console.log('no recipe', id); continue; }
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '24', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', raw], { stdio: ['pipe', 'inherit', 'inherit'] });
      const ff2 = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '24', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', rawOrb], { stdio: ['pipe', 'inherit', 'inherit'] });
      const grabOrb = `(() => { const c = window.__cv2, o = document.querySelector('#orb canvas'); c.width = 640; c.height = 180; const x = c.getContext('2d'); x.fillStyle = '#131412'; x.fillRect(0, 0, 640, 180); x.drawImage(o, 0, 0, 640, 180); return c.toDataURL('image/jpeg', .92).slice(23); })()`;
      const grab = `(async () => { const c = window.__cv, W = ${W}, H = ${H}; c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#030403'; x.fillRect(0, 0, W, H); document.querySelectorAll('#room canvas').forEach(cv => { const q = cv.getBoundingClientRect(); if (q.width > 2 && cv.width > 2) x.drawImage(cv, q.left, q.top, q.width, q.height); }); await window.__svgDraw(x, W, H); return c.toDataURL('image/jpeg', .93).slice(23); })()`;
      const put = async (jpg, orb) => { if (!ff.stdin.write(Buffer.from(jpg, 'base64'))) await new Promise(res => ff.stdin.once('drain', res)); if (!ff2.stdin.write(Buffer.from(orb, 'base64'))) await new Promise(res => ff2.stdin.once('drain', res)); }; let nBuild = 0, t0 = Date.now(), info;
      for (;;) { info = await p.evaluate(async g => { const F = window.FORGE, B = F.BOOK, b = window.__bo; b.lock(); F.step(1 / 24); b.lock(); F.step(1 / 24); b.lock(); F.advance(1 / 24); b.lock(); const st = B.run       /* three small steps a frame: the reticle is on a spring and one big step throws it off */ && B.run.steps[B.run.i]; if (st && b.candle < 0 && /CANDLE/.test(st.t)) b.candle = b.n; if (b.party < 0 && F.DOC.cast.length) b.party = b.n; b.n++; return { jpg: await eval(g[0]), orb: eval(g[1]), run: !!B.run, candle: b.candle, party: b.party, ret: F.S.reticleAside === 'crescent' && !!document.querySelector('#room svg path') ? 'crescent' : '' }; }, [grab, grabOrb]); await put(info.jpg, info.orb); nBuild++; if (!info.run || nBuild > 700) break; }
      await p.evaluate(() => { const F = window.FORGE, b = window.__bo; F.setMode('MAKE'); F.setVerb(F.VERBS.findIndex(v => v[0] === 'BLOW OUT')); F.turn(4, -12); F.setMode('LOOK'); F.pickTo('cake'); b.lit = F.DOC.frames[0].items.filter(i => i.t === 'CANDLE').length; b.k = 0; for (let i = 0; i < 30; i++) { b.lock(); F.step(1 / 24); } });
      let nBar = 0; for (; nBar < 39; nBar++) { const jpg = await p.evaluate(async g => { const F = window.FORGE, b = window.__bo, dt = 1 / 12, t = b.k * dt; F.S.barT = t; b.lock(); if (Math.abs(t - 1.6254) < dt / 2 + 1e-6) { F.S.mode = 'MAKE'; F.setVerb(F.VERBS.findIndex(v => v[0] === 'BLOW OUT')); } if (t >= 1.6254 - 1e-6 && b.lit > 0) { const n = Math.min(b.lit, 2); F.turn(4, n); b.lit -= n; } b.k++; F.step(dt / 2); b.lock(); F.advance(dt / 2); return [await eval(g[0]), eval(g[1])]; }, [grab, grabOrb]); await put(jpg[0], jpg[1]); }
      ff.stdin.end(); ff2.stdin.end(); await Promise.all([new Promise(res => ff.on('close', res)), new Promise(res => ff2.on('close', res))]);
      fs.writeFileSync(path.join(OUT, id + '_buildout.json'), JSON.stringify({ id, title: pre.title, steps: pre.steps, fit: pre.fit, frame: [W, H], own_cast: pre.own_cast, reticle: info.ret, controller: true, build_frames: nBuild, candle_frame: info.candle, party_frame: info.party, bar_frames: nBar }, null, 1));
      console.log('built out', id, nBuild + nBar, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's'); continue; }
    const SUF = HERO ? '_hero' : TWIN ? '_twin' : ''; const mp4 = path.join(OUT, id + SUF + '.mp4'); if (fs.existsSync(mp4) && !process.env.FORCE) { console.log('have', id); continue; }
    const ok = await p.evaluate(([id, pace]) => { const F = window.FORGE, B = F.BOOK, hit = B.find(id); if (!hit) return null; B.shelf = hit[0]; B.idx = hit[1]; B.pace = pace; F.S.mode = 'RECIPE'; B.load(); for (let i = 0; i < 8; i++) F.step(1 / 24); B.start(); return { title: B.cur().title, steps: B.run.steps.map(s => s.t) }; }, [id, PACE]);
    if (!ok) { console.log('no recipe', id); continue; }
    if (TWIN) await p.evaluate(([W, H]) => { const F = window.FORGE, B = F.BOOK, T = window.THREE; B.pace = 12; let t = 0; while (B.run && t < 600) { F.step(1 / 24); t += 1 / 24; }
      F.setMode('MAKE'); F.setVerb(F.VERBS.findIndex(v => v[0] === 'BLOW OUT')); F.turn(4, -12);
      F.setMode('LOOK'); F.pickTo('cake'); F.S.shotIdx = 1; const o = F.S.orbit, yaw = .18;       // shotIdx set: the view holds where it is put and does not ease back to the cake's centre Object.assign(o, { yaw, pitch: -.2, dist: .9 }); o.tgt.set(0, .84, 0);
      F.DOC.cast.forEach(c => { c.a = Math.PI / 2 - yaw + Math.PI + (F.KIDS[c.i].da || 0); if (F.KIDS[c.i].party) { c.r = .44; c.s = .72; c.lift = -.02; } });       // the cast stands behind the cake as this camera sees it
      // the plates' grid, in this frame: centre x 640/1280, crown 250 + 72 of 720, width 480/1280
      const want = { cx: W * .5, top: H * (250 + 72) / 720, w: W * 480 / 1280 }, mesh = F.CAKE.children.filter(m => m.isMesh && m.geometry.attributes.color)[0];
      for (let it = 0; it < 14; it++) { F.S.ease = null; F.step(1 / 240); const bb = new T.Box3().setFromObject(mesh), R = (bb.max.x - bb.min.x) / 2, c = bb.getCenter(new T.Vector3()); let x0 = 1e9, x1 = -1e9, y0 = 1e9;
        for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2, q = F.worldToRoom(new T.Vector3(c.x + R * Math.cos(a), bb.max.y, c.z + R * Math.sin(a))), q2 = F.worldToRoom(new T.Vector3(c.x + R * Math.cos(a), bb.min.y + (bb.max.y - bb.min.y) * .3, c.z + R * Math.sin(a))); x0 = Math.min(x0, q[0], q2[0]); x1 = Math.max(x1, q[0], q2[0]); y0 = Math.min(y0, q[1]); }
        o.dist *= (x1 - x0) / want.w; const mpp = (2 * R) / Math.max(1, x1 - x0); o.tgt.y -= (y0 - want.top) * mpp * .9; o.tgt.x = c.x; o.tgt.z = c.z; window.__twin = { n: 0, lit: F.DOC.frames[0].items.filter(i => i.t === 'CANDLE').length, fit: [Math.round(x0), Math.round(x1), Math.round(y0)] }; }
      for (let i = 0; i < 48; i++) { F.S.ease = null; F.step(1 / 24); } }, [W, H]);       // let the focus pull settle before the bar starts
    if (HERO) await p.evaluate(() => { const F = window.FORGE, B = F.BOOK; B.pace = 12; let t = 0; while (B.run && t < 600) { F.step(1 / 24); t += 1 / 24; }
      F.setMode('MAKE'); F.setVerb(F.VERBS.findIndex(v => v[0] === 'BLOW OUT')); F.turn(4, -12); const kids = F.DOC.cast.length > 0;       // relight every candle
      F.setMode('LOOK'); F.pickTo('cake'); F.S.ease = null; F.S.shotIdx = 0; Object.assign(F.S.orbit, { dist: kids ? 1.02 : .58, pitch: kids ? -.2 : -.3 }); F.S.orbit.yaw -= .9; F.S.orbit.tgt.set(0, kids ? .88 : .84, 0);
      for (let i = 0; i < 20; i++) F.step(1 / 24); F.S.ease = null; window.__hero = { n: 0, lit: F.DOC.frames[0].items.filter(i => i.t === 'CANDLE').length }; });
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(PLAY), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
    let n = 0, tail = Math.round(TAIL * FPS), t0 = Date.now(); const marks = [];
    for (;;) {
      const r = await p.evaluate(([dt, W, H, hero, twin]) => { const F = window.FORGE;
        if (twin) { const h = window.__twin, t = h.n * dt; F.S.ease = null; F.S.orbit.yaw += dt * .035; h.n++;       // one bar: 4 beats of 0.8127 s; the breath starts on beat 3
          if (Math.abs(t - 1.6254) < dt / 2 + 1e-6) { F.S.mode = 'MAKE'; F.setVerb(F.VERBS.findIndex(v => v[0] === 'BLOW OUT')); } if (t >= 1.6254 - 1e-6 && h.lit > 0) { F.turn(4, Math.min(h.lit, dt > .05 ? 2 : 1)); h.lit -= Math.min(h.lit, dt > .05 ? 2 : 1); } }
        if (hero) { const h = window.__hero, N = Math.round(hero / dt); F.S.orbit.yaw += dt * .42; F.S.ease = null; h.n++;       // the camera circles; at two thirds, ring 5 blows the candles out one by one
          if (h.n === Math.round(N * .64)) { F.S.mode = 'MAKE'; F.setVerb(F.VERBS.findIndex(v => v[0] === 'BLOW OUT')); F.S.mode = 'MAKE'; } if (h.n > Math.round(N * .64) && h.lit > 0 && h.n % 2 === 0) { F.turn(4, 1); h.lit--; } }
        F.advance(dt); const c = window.__cv; c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#030403'; x.fillRect(0, 0, W, H);
        document.querySelectorAll('#room canvas, #orb canvas').forEach(cv => { const q = cv.getBoundingClientRect(); if (q.width > 2 && q.height > 2 && cv.width > 2) x.drawImage(cv, q.left, q.top, q.width, q.height); });
        return { jpg: c.toDataURL('image/jpeg', .93).slice(23), run: twin ? window.__twin.n * dt < 3.2508 - 1e-6 : hero ? window.__hero.n < Math.round(hero / dt) : !!F.BOOK.run, i: F.BOOK.run ? F.BOOK.run.i : -1, fit: twin ? window.__twin.fit : null }; }, [1 / FPS, W, H, HERO, TWIN]);
      if (!ff.stdin.write(Buffer.from(r.jpg, 'base64'))) await new Promise(res => ff.stdin.once('drain', res));
      if (r.run && (!marks.length || marks[marks.length - 1].i !== r.i)) marks.push({ i: r.i, t: +(n / PLAY).toFixed(3), step: ok.steps[r.i] });
      n++; if (!r.run && (HERO || TWIN || --tail <= 0)) break; if (n > FPS * 240) break;
    }
    ff.stdin.end(); await new Promise(res => ff.on('close', res));
    fs.writeFileSync(path.join(OUT, id + SUF + '.json'), JSON.stringify({ id, title: ok.title, fps: PLAY, frames: n, duration_s: +(n / PLAY).toFixed(3), pace: +(PACE * PLAY / FPS).toFixed(2), layout: LAYOUT, steps: marks }, null, 1));
    console.log('filmed', id, n, 'frames', ((Date.now() - t0) / 1000).toFixed(0) + 's', ((Date.now() - t0) / n).toFixed(0) + 'ms/frame');
  }
  await b.close();
})();
