// Tizita music video, second version: every birthday is made on screen, through the orb's own controls, from an empty dome.
// Ana's comes first, as in the film; then a kitchen, a desert road, and in the last section two more made faster. Between them the mist rises and takes the last one away.
// Frame n is song time n/30; windows that the edit gives to the real film are stepped through without being filmed.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.env.OUT || '/home/claude/stelline-work/mv2/'; fs.mkdirSync(OUT + 'f', { recursive: true });
const T0 = 13.7, T1 = +process.env.T1 || 209.8;
const CUTAWAY = [[24.6, 28.1], [44.5, 46.6], [57.6, 61.0], [84.2, 88.2], [98.1, 100.4], [133.5, 150.05]];
// [song time to start, birthday index, how much of it to make]; the hand's speed is fitted so each is finished a little before the next begins
const ANA = { title: 'ANA’S, IN THE DOME', line: 'The one she made for someone else, and kept.', cake: 23, candles: [7, 0, 1], props: [['PLATE', .32, .18, 5]],
  people: [['film-child-1', -.36, -.48], ['film-child-2-blow', .02, -.62], ['film-child-3-blow', .38, -.46]], room: [null, 0, .22, .1], light: [30, .8, .8, 1.2] };
const BUILDS = [[14.2, 'ANA', 63.5], [66.5, 1, 100.4], [101.5, 5, 150.5], [151.2, 9, 175.5], [176.5, 10, 198.5]];
const trim = (b, np, nq) => Object.assign({}, b, { props: (b.props || []).slice(0, np), people: (b.people || []).slice(0, nq) });
const cut = t => CUTAWAY.some(([a, b]) => t >= a && t < b);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => console.log('PE', e.message));
  await p.goto('http://127.0.0.1:8095/cineosis-orb/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  await p.addScriptTag({ path: __dirname + '/hand.js' });
  await p.evaluate(() => { FORGE.manual(); document.querySelectorAll('svg').forEach(s => s.style.display = 'none'); window.loadB = i => { FORGE.S.add = null; FORGE.press('ADD'); FORGE.S.add.s = 0; FORGE.S.add.i = i; FORGE.press('ADD'); FORGE.advance(1 / 30); }; });
  for (const i of [1, 5, 9, 10, 0]) { await p.evaluate(i => loadB(i), i); await p.waitForTimeout(2200); await p.evaluate(() => { for (let k = 0; k < 4; k++) FORGE.advance(1 / 30); }); }   // warm the textures
  // plans, and a dry run of each at speed 1 to fit the speed to its slot
  const specs = await p.evaluate(([BUILDS, ANA]) => BUILDS.map(([t, bi, end]) => { const b0 = bi === 'ANA' ? ANA : BIRTHDAYS[bi]; return Object.assign({}, b0, bi === 'ANA' ? {} : { props: (b0.props || []).slice(0, 3), people: (b0.people || []).slice(0, 2) }); }), [BUILDS, ANA]);
  const speeds = [];
  for (let k = 0; k < specs.length; k++) { const dur = await p.evaluate(b => { setDoc(DOC0()); FORGE.S.pick = null; FORGE.S.add = null; HAND.clear(); HAND.speed = 1; HAND.run(b); let f = 0; while (HAND.busy() && f < 9000) { HAND.tick(1 / 30); FORGE.step(1 / 30); f++; } return f / 30; }, specs[k]);
    const room = BUILDS[k][2] - BUILDS[k][0] - (k < specs.length - 1 ? 3.2 : 1.5); speeds.push(Math.max(.85, Math.min(3.2, dur / room))); console.log('build', k, 'dry', dur.toFixed(1), 's, slot', room.toFixed(1), 'speed', speeds[k].toFixed(2)); }
  await p.evaluate(() => { setDoc(DOC0()); FORGE.S.pick = null; FORGE.S.add = null; HAND.clear(); FORGE.S.mode = 'PLACE'; for (let k = 0; k < 60; k++) FORGE.step(1 / 30); FORGE.setView('EYE'); for (let k = 0; k < 60; k++) FORGE.step(1 / 30); window.SNDLOG = []; });
  const N = Math.round((T1 - T0) * 30), st = []; let bi = 0, dissolved = -1, drift = 1;
  for (let f = 0; f < N; f++) { const t = T0 + f / 30, n = Math.round(t * 30);
    if (bi < BUILDS.length && t >= BUILDS[bi][0]) { await p.evaluate(([b, sp]) => { HAND.clear(); HAND.speed = sp; FORGE.setView('EYE'); FORGE.viewBy(0, .06, -.2); HAND.run(b); }, [specs[bi], speeds[bi]]); bi++; drift = -drift; }
    if (bi < BUILDS.length && bi > 0 && dissolved < bi && t >= BUILDS[bi][0] - 2.4) { await p.evaluate(() => { HAND.clear(); HAND.speed = 1.4; HAND.dissolve(); }); dissolved = bi; }
    const fin = t > 199.2 ? Math.min(1, (t - 199.2) / 6) : 0;
    const s = await p.evaluate(([dr, fin, film]) => { HAND.tick(1 / 30); if (fin > 0 && !window.__end) { window.__end = 1; HAND.clear(); HAND.speed = .5; HAND.dissolve(); HAND.Q.splice(HAND.Q.length - 2, 2); }
      FORGE.viewBy(.00025 * dr, 0, .00008 + fin * .0012); film ? FORGE.advance(1 / 30) : FORGE.step(1 / 30);
      const V = FORGE.S.view; return { now: FORGE.now(), ang: RINGS.map(r => r.ang), yaw: V.yaw, pitch: V.pitch, dist: V.dist, flames: FORGE.flames(), add: !!FORGE.S.add, title: FORGE.DOC.title, era: FORGE.DOC.room.era || 0, place: FORGE.DOC.room.place, mist: FORGE.DOC.room.mist, items: FORGE.DOC.items.length }; }, [drift, fin, !cut(t)]);
    s.song = t; st.push(s);
    if (!cut(t)) await p.screenshot({ path: OUT + 'f/' + String(n).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 92 });
    if (f % 300 === 0) { console.log('song', t.toFixed(1), s.title || '(making)', s.items); fs.writeFileSync(OUT + 'take.json', JSON.stringify({ log: await p.evaluate(() => SNDLOG), st })); } }
  fs.writeFileSync(OUT + 'take.json', JSON.stringify({ log: await p.evaluate(() => SNDLOG), st })); await b.close(); console.log('done', st.length);
})();
