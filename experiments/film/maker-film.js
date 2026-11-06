// Films maker.html?film from the kneeling eye: the orb in the corner, every act done on it at the moment it shows.
const { chromium } = require('playwright'); const fs = require('fs');
// [time, action]: action is JS run in the page; 'turn i n' spreads n detents over the next beat
const CUE = [
  [2.0, "press('CAPTURE')"],
  [3.6, 'turn 1 1'], [4.6, 'turn 1 1'], [5.6, 'turn 1 1'], [6.6, 'turn 1 -3'],
  [7.6, 'turn 2 3'], [8.8, 'turn 2 -1'], [9.8, 'turn 2 1'], [10.8, 'turn 2 -2'],
  [12.0, 'turn 3 1'], [13.2, 'turn 4 7'],
  [15.0, 'grip 1.6 1.4 .12'], [17.4, 'grip -1.6 1.4 -.12'], [19.4, 'lens .7 1.2'], [21.4, 'lens -.7 1.2'],
  [23.2, "press('CAPTURE')"], [25.4, 'pick light'], [26.0, 'turn 1 -9'], [27.6, 'turn 3 -6'], [29.0, 'turn 3 6'], [30.2, 'pick cake'],
  [31.0, "press('CAPTURE')"], [33.0, "press('CAPTURE')"], [35.0, "press('CAPTURE')"], [36.6, 'turn 3 -4'], [37.8, 'turn 2 -3'],
  [39.4, 'grip .5 1.5 0'], [41.4, "press('CAPTURE')"], [46.0, "press('CAPTURE')"], [48.0, 'grip 3.2 8 0'], [56.5, 'end']];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => console.log('PE', e.message));
  await p.goto('http://127.0.0.1:8095/maker.html?film', { waitUntil: 'load' }); await p.waitForTimeout(2000);
  await p.evaluate(() => { window.SNDLOG = []; FORGE.manual(); window.Q = []; window.GV = null;
    window.cue = (src) => { const m = src.split(' '); if (m[0] === 'turn') { const i = +m[1], n = +m[2]; for (let k = 0; k < Math.abs(n); k++) Q.push({ at: k * .11, f: () => FORGE.turn(i, Math.sign(n)) }); }
      else if (m[0] === 'grip' || m[0] === 'lens') { GV = { k: m[0], tot: +m[1], dur: +m[2], tilt: +(m[3] || 0), t: 0 }; }
      else if (m[0] === 'pick') { const L = FORGE.things(), want = L.findIndex(t => t.key === m[1]), cur = L.findIndex(t => t.key === FORGE.S.pick); const n = want - cur; for (let k = 0; k < Math.abs(n); k++) Q.push({ at: k * .15, f: () => FORGE.turn(0, Math.sign(n)) }); }
      else if (src !== 'end') { Q.push({ at: 0, f: () => eval('FORGE.' + src) }); } Q.forEach(q => q.t0 = q.t0 == null ? FORGE.now() : q.t0); };
    window.tickQ = dt => { const now = FORGE.now(); window.Q = Q.filter(q => { if (now - q.t0 >= q.at) { q.f(); return false; } return true; });
      if (GV) { const d = Math.min(dt, GV.dur - GV.t); GV.t += dt; const u = d / GV.dur; if (GV.k === 'grip') FORGE.viewBy(GV.tot * u, GV.tilt * u, 0); else FORGE.viewBy(0, 0, GV.tot * u); if (GV.t >= GV.dur) GV = null; } }; });
  const D = '/home/claude/stelline-work/mfilm/f/'; const st = []; let ci = 0; const N = Math.round(CUE[CUE.length - 1][0] * 30);
  for (let f = 0; f < N; f++) { const t = f / 30; while (ci < CUE.length && CUE[ci][0] <= t) { await p.evaluate(s => cue(s), CUE[ci][1]); ci++; }
    const fast = (+process.env.EVERY || 1) > 1 && f % (+process.env.EVERY) !== 0; const s = await p.evaluate(fast => { tickQ(1 / 30); fast ? FORGE.step(1 / 30) : FORGE.advance(1 / 30); return { now: FORGE.now(), flames: FORGE.flames(), kids: FORGE.DOC.kids.length, mist: FORGE.DOC.mist }; }, fast); st.push(s);
    if (f % (+process.env.EVERY || 1) === 0) await p.screenshot({ path: D + String(f).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 92 }); if (f % 300 === 0) console.log('frame', f); }
  fs.writeFileSync('/home/claude/stelline-work/mfilm/score.json', JSON.stringify({ log: await p.evaluate(() => SNDLOG), st })); await b.close(); console.log('done', st.length);
})();
