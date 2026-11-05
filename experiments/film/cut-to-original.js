// Films maker.html?film from the kneeling eye: the orb in the corner, every act done on it at the moment it shows.
const { chromium } = require('playwright'); const fs = require('fs');
// [time, action]: action is JS run in the page; 'turn i n' spreads n detents over the next beat
const CUE = [
  [6.21, "press('CAPTURE')"],
  [9.9, "turn 1 1"],
  [10.48, "turn 1 1"],
  [10.74, "turn 1 1"],
  [11.07, "turn 1 1"],
  [11.2, "turn 2 1"],
  [11.41, "turn 2 1"],
  [12.84, "turn 2 1"],
  [12.94, "turn 2 1"],
  [13.99, "turn 2 -1"],
  [14.1, "turn 2 -1"],
  [14.2, "turn 2 -1"],
  [14.26, "turn 2 -1"],
  [14.36, "turn 2 -1"],
  [14.44, "turn 3 1"],
  [14.57, "turn 3 1"],
  [14.82, "turn 3 1"],
  [14.9, "turn 1 -4"],
  [15.58, "turn 4 1"],
  [15.67, "turn 4 1"],
  [15.8, "turn 4 1"],
  [19.21, "turn 4 1"],
  [19.54, "turn 4 1"],
  [19.63, "turn 4 1"],
  [19.69, "turn 4 1"],
  [21.0, "grip 1.1 2.4 .1"],
  [21.88, "turn 2 1"],
  [22.64, "turn 2 1"],
  [22.92, "turn 2 1"],
  [25.89, "press('CAPTURE')"],
  [26.51, "press('CAPTURE')"],
  [26.92, "press('CAPTURE')"],
  [27.31, "press('CAPTURE')"],
  [28.73, "lens .55 1.4"],
  [30.08, "pick light"],
  [30.18, "turn 3 1"],
  [30.46, "turn 3 1"],
  [30.67, "turn 3 1"],
  [30.82, "turn 3 1"],
  [32.0, "end"]];
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
  const D = '/home/claude/stelline-work/cut/f/'; const st = []; let ci = 0; const N = Math.round(CUE[CUE.length - 1][0] * 30);
  for (let f = 0; f < N; f++) { const t = f / 30; while (ci < CUE.length && CUE[ci][0] <= t) { await p.evaluate(s => cue(s), CUE[ci][1]); ci++; }
    const fast = (+process.env.EVERY || 1) > 1 && f % (+process.env.EVERY) !== 0; const s = await p.evaluate(fast => { tickQ(1 / 30); fast ? FORGE.step(1 / 30) : FORGE.advance(1 / 30); return { now: FORGE.now(), flames: FORGE.flames(), kids: FORGE.DOC.kids.length, mist: FORGE.DOC.mist }; }, fast); st.push(s);
    if (f % (+process.env.EVERY || 1) === 0) await p.screenshot({ path: D + String(f).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 92 }); if (f % 300 === 0) console.log('frame', f); }
  fs.writeFileSync('/home/claude/stelline-work/cut/score.json', JSON.stringify({ log: await p.evaluate(() => SNDLOG), st })); await b.close(); console.log('done', st.length);
})();
