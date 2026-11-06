// Films cineosis-orb from the kneeling eye: one long take on the orb while it flips through birthdays across time and space.
// The orb's little screen carries the real scene (frames from .feed/) while her voice plays; every frame logs the rings' angles for the score.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = '/home/claude/stelline-work/film2/'; const DUR = +process.env.DUR || 63;
// [time, birthday index, scrub path]: open the shelf, wander the ring through the path, land, press
const PLAN = [[3.4, 1, [1]], [9.4, 2, [2, 4, 3, 2]], [15.4, 3, [3]], [20.6, 4, [5, 6, 4]], [25.8, 5, [5]],
  [30.4, 6, [6]], [34.9, 7, [9, 8, 7]], [38.3, 8, [8]], [41.8, 9, [9]], [45.4, 10, [12, 11, 10]], [49.2, 11, [11]], [52.6, 12, [12]], [55.4, 0, [6, 0]]];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => console.log('PE', e.message));
  await p.goto('http://127.0.0.1:8095/cineosis-orb/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  await p.evaluate(() => { FORGE.manual(); window.SNDLOG = []; document.querySelectorAll('svg').forEach(s => s.style.display = 'none'); window.loadB = i => { FORGE.S.add = null; FORGE.press('ADD'); FORGE.S.add.s = 0; FORGE.S.add.i = i; FORGE.press('ADD'); FORGE.advance(1 / 30); };
    window.feed = src => new Promise(r => { if (!src) { window.OLED_FEED = null; return r(); } const im = new Image(); im.onload = () => { window.OLED_FEED = Object.assign(window.OLED_FEED || {}, { img: im }); r(); }; im.onerror = r; im.src = src; }); });
  for (let i = 13; i >= 0; i--) { await p.evaluate(i => loadB(i), i); await p.waitForTimeout(2500); await p.evaluate(() => { for (let k = 0; k < 4; k++) FORGE.advance(1 / 30); }); }   // warm every texture, end on Ana's
  await p.evaluate(() => { for (let k = 0; k < 90; k++) FORGE.step(1 / 30); FORGE.setView('EYE'); for (let k = 0; k < 60; k++) FORGE.step(1 / 30); window.SNDLOG = []; });
  const N = Math.round(DUR * 30), st = []; const Q = []; let cap = "ANA’S, IN THE DOME";
  PLAN.forEach(([t, bi, path], n) => { let cur = n ? PLAN[n - 1][1] : 0; Q.push({ t, k: 'open', from: cur }); let tt = t + .55;
    for (const to of path) { const d = to - cur, steps = Math.abs(d), gap = steps > 3 ? .055 : .16; for (let s = 0; s < steps; s++) { Q.push({ t: tt, k: 'turn', d: Math.sign(d) }); tt += gap; } cur = to; tt += .3; }
    Q.push({ t: tt + .25, k: 'land', bi }); });
  Q.sort((a, c) => a.t - c.t); let qi = 0, drift = 1;
  for (let f = 0; f < N; f++) { const t = f / 30;
    while (qi < Q.length && Q[qi].t <= t) { const q = Q[qi++];
      if (q.k === 'open') await p.evaluate(i => { FORGE.press('ADD'); FORGE.S.add.s = 0; FORGE.S.add.i = i; }, q.from);
      else if (q.k === 'turn') await p.evaluate(d => FORGE.turn(1, d), q.d);
      else if (q.k === 'land') { await p.evaluate(() => FORGE.press('ADD')); await p.evaluate(() => FORGE.step(1 / 60)); await p.evaluate(() => FORGE.setView('EYE')); await p.waitForTimeout(1400); cap = await p.evaluate(() => FORGE.DOC.title); drift = -drift; } }
    const fsrc = t < 30 ? `/.feed/a${String(Math.floor(t * 30) + 1).padStart(4, '0')}.jpg` : t < 41 ? `/.feed/b${String(Math.floor((t - 30) * 30) + 1).padStart(4, '0')}.jpg` : null;
    await p.evaluate(([s, c]) => feed(s).then(() => { if (window.OLED_FEED) window.OLED_FEED.cap = c; }), [fsrc, cap]);
    const end = t > 56.6 ? Math.min(1, (t - 56.6) / 2) : 0;
    const s = await p.evaluate(([dr, end]) => { FORGE.viewBy(.0012 * dr * (1 - end), end ? -.0008 : 0, .00025 + end * .0016); FORGE.advance(1 / 30);
      const V = FORGE.S.view; return { now: FORGE.now(), ang: RINGS.map(r => r.ang), yaw: V.yaw, pitch: V.pitch, dist: V.dist, flames: FORGE.flames(), add: !!FORGE.S.add, title: FORGE.DOC.title, era: FORGE.DOC.room.era || 0, place: FORGE.DOC.room.place }; }, [drift, end]);
    st.push(s); await p.screenshot({ path: OUT + 'f/' + String(f).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 92 });
    if (f % 150 === 0) console.log('frame', f, s.title); }
  fs.writeFileSync(OUT + 'take.json', JSON.stringify({ log: await p.evaluate(() => SNDLOG), st })); await b.close(); console.log('done', st.length);
})();
