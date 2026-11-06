// Films the orb for the Tizita music video ("Someone Wrote My First Winter"), on the song's own clock.
// Frame n is song time n/30. Each birthday lands on the first beat after one of the song's breaths; the shelf is scrolled during the breath,
// so the device's clicks fall in the quiet. Windows where the edit cuts to the real film are stepped through without being filmed.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = '/home/claude/stelline-work/mv/'; fs.mkdirSync(OUT + 'f', { recursive: true });
const T0 = 13.7, T1 = 209.8;
const CUTAWAY = [[24.6, 28.1], [44.5, 46.6], [57.6, 61.0], [84.2, 88.2], [98.1, 100.4], [133.5, 150.05]];
// landings: [song time, birthday] - phrase starts after each breath, then every bar in the last section
const LAND = [[20.25, 1], [34.64, 2], [40.26, 3], [53.17, 4], [67.57, 5], [73.24, 6], [79.55, 7], [93.16, 8], [107.04, 9], [113.5, 10], [120.0, 11], [126.8, 12],
  [152.04, 13], [155.3, 5], [158.55, 1], [161.8, 9], [165.05, 3], [168.3, 11], [171.55, 7], [174.8, 2], [178.05, 10], [181.3, 6], [184.55, 12], [187.8, 4], [191.05, 8], [194.3, 13], [199.2, 0]];
const ERA = { 13: 3, 1: 1 };   // on a few landings the same birthday comes back in another era (index: era)
const cut = t => CUTAWAY.some(([a, b]) => t >= a && t < b);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => console.log('PE', e.message));
  await p.goto('http://127.0.0.1:8095/cineosis-orb/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  await p.evaluate(() => { FORGE.manual(); document.querySelectorAll('svg').forEach(s => s.style.display = 'none');
    window.loadB = i => { FORGE.S.add = null; FORGE.press('ADD'); FORGE.S.add.s = 0; FORGE.S.add.i = i; FORGE.press('ADD'); FORGE.advance(1 / 30); }; });
  for (let i = 13; i >= 0; i--) { await p.evaluate(i => loadB(i), i); await p.waitForTimeout(2200); await p.evaluate(() => { for (let k = 0; k < 4; k++) FORGE.advance(1 / 30); }); }
  await p.evaluate(() => { for (let k = 0; k < 90; k++) FORGE.step(1 / 30); FORGE.setView('EYE'); for (let k = 0; k < 60; k++) FORGE.step(1 / 30); window.SNDLOG = []; });
  // the queue: open the shelf ~1.5 s before each landing, walk the ring there (overshoot once in a while), press on the beat
  const Q = []; let cur = 0;
  LAND.forEach(([t, bi], n) => { const fast = t > 150, open = t - (fast ? 1.1 : 1.7); Q.push({ t: open, k: 'open', from: cur }); let d = bi - cur, path = [bi];
    if (n % 3 === 1 && Math.abs(d) < 10) path = [bi + Math.sign(d || 1) * 2, bi]; let tt = open + .35, c = cur;
    for (const to of path) { const dd = Math.max(0, Math.min(13, to)) - c, gap = Math.min(.16, (t - .3 - tt) / Math.max(1, Math.abs(dd) + 1)); for (let s = 0; s < Math.abs(dd); s++) { Q.push({ t: tt, k: 'turn', d: Math.sign(dd) }); tt += gap; } c = Math.max(0, Math.min(13, to)); tt += .12; }
    Q.push({ t: t - 1 / 30, k: 'land', era: ERA[n] }); cur = bi; });
  Q.sort((a, c) => a.t - c.t);
  const N = Math.round((T1 - T0) * 30), st = []; let qi = 0, drift = 1, lastLand = T0;
  for (let f = 0; f < N; f++) { const t = T0 + f / 30, n = Math.round(t * 30);
    while (qi < Q.length && Q[qi].t <= t) { const q = Q[qi++];
      if (q.k === 'open') await p.evaluate(i => { FORGE.press('ADD'); FORGE.S.add.s = 0; FORGE.S.add.i = i; }, q.from);
      else if (q.k === 'turn') await p.evaluate(d => FORGE.turn(1, d), q.d);
      else if (q.k === 'land') { await p.evaluate(e => { FORGE.press('ADD'); if (e != null) FORGE.DOC.room.era = e; FORGE.step(1 / 60); FORGE.setView('EYE'); }, q.era); await p.waitForTimeout(1300); drift = -drift; lastLand = t; } }
    const fin = t > 199.2 ? Math.min(1, (t - 199.2) / 4) : 0, spd = t > 152 && t < 199 ? 2.2 : 1;
    const s = await p.evaluate(([dr, fin, spd, film]) => { FORGE.viewBy(.0012 * dr * spd * (1 - fin), fin ? -.0008 : 0, .00025 * spd + fin * .0016); film ? FORGE.advance(1 / 30) : FORGE.step(1 / 30);
      const V = FORGE.S.view; return { now: FORGE.now(), ang: RINGS.map(r => r.ang), yaw: V.yaw, pitch: V.pitch, dist: V.dist, flames: FORGE.flames(), add: !!FORGE.S.add, title: FORGE.DOC.title, era: FORGE.DOC.room.era || 0, place: FORGE.DOC.room.place }; }, [drift, fin, spd, !cut(t)]);
    s.song = t; st.push(s);
    if (!cut(t)) await p.screenshot({ path: OUT + 'f/' + String(n).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 92 });
    if (f % 300 === 0) { console.log('song', t.toFixed(1), s.title); fs.writeFileSync(OUT + 'take.json', JSON.stringify({ log: await p.evaluate(() => SNDLOG), st })); } }
  fs.writeFileSync(OUT + 'take.json', JSON.stringify({ log: await p.evaluate(() => SNDLOG), st })); await b.close(); console.log('done', st.length);
})();
