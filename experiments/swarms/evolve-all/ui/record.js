/* ui/record.js — films the host for proof.mp4 with Playwright (node only; not loaded by the page).
   The page runs on a virtual clock (?rec=1) and is played by the scripted CAREFUL player through the device's own input functions.
   Real time on screen except where a TIME-LAPSE label shows (later generations of a part x32, the first generation of the last three parts x4, stage makings x3, last makings x2).
   15 distinct frames per second of output, written at 30 fps (each frame twice). The soundtrack is the page's own sound log rendered
   offline, with every event moved to the output time of its frame. A part whose generation budget (?budget=) runs out before its
   stages pass is made as it stands, and the trace says so.
   Usage (server at the repo root on 8790):  node ui/record.js <frames-dir>  then ffmpeg (see README). */
'use strict';
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const out = process.argv[2] || '/tmp/evolve-all-rec', BUDGET = +(process.argv[3] || 150), STYLE = process.argv[4] || 'careful', MAXOUT = 58; fs.mkdirSync(out, { recursive: true });
const URL = `http://localhost:8790/experiments/swarms/evolve-all/index.html?rec=1&player=${STYLE}&budget=${BUDGET}`;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 1 }); const errs = [];
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.waitForFunction(() => window.MM && MM.ready(), null, { timeout: 120000 });
  const vts = []; let F = 0, endF = 0;
  for (; F < MAXOUT * 15 + 300; F++) {
    const s = await p.evaluate(() => { const q = MM.P[MM.S.part]; return { done: Object.values(MM.P).filter(x => x.done).length, ph: MM.S.phase, gen: q.gen, made: MM.S.made ? (MM.S.made.last ? 2 : 1) : 0, ended: MM.S.ended, off: MM.S.off, now: MM.NOW() }; });
    let L = s.made === 2 ? 2 : s.made === 1 ? 3 : (s.ph === 'evolve' && s.gen >= 1) ? 32 : (s.ph === 'evolve' && s.done >= 3) ? 4 : 1; if (F / 15 > 46 && !s.ended) L *= 2;
    await p.evaluate(k => MM.setLapse(k), L);
    for (let i = 0; i < 2 * L; i++) await p.evaluate(() => MM.stepOnly(1 / 30));
    await p.evaluate(() => MM.advance(0)); vts.push(await p.evaluate(() => MM.NOW()));
    await p.screenshot({ path: path.join(out, String(F).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 88 });
    if (F % 60 === 0) console.log('frame', F, JSON.stringify(s));
    if ((s.ended || s.off) && !endF) endF = F + 45; if (endF && F >= endF) break; }
  const n = vts.length, DUR = n / 15;
  // virtual time -> output time, through the frames actually captured
  await p.evaluate(v => { window.__VT = v; }, vts);
  const au = await p.evaluate(d => MM.renderAudio(d, t => { const V = window.__VT; if (t <= V[0]) return 0; let i = 1; while (i < V.length && V[i] < t) i++; if (i >= V.length) return null; const u = (t - V[i - 1]) / (V[i] - V[i - 1]); return (i - 1 + u) / 15; }), DUR);
  fs.writeFileSync(path.join(out, 'audio.wav'), Buffer.from(au.b64, 'base64'));
  const tr = await p.evaluate(() => MM.traceOut()); tr.source = `proof recording (ui/record.js): ${STYLE} script, budget ${BUDGET} generations per part, ${n} frames at 15/s = ${DUR.toFixed(1)} s output, ${vts[n - 1].toFixed(1)} s virtual`;
  fs.writeFileSync(path.join(__dirname, '..', 'trace.json'), JSON.stringify(tr, null, 1));
  console.log(JSON.stringify({ frames: n, dur: DUR, virtual: vts[n - 1], peak: au.peak, choices: tr.choices.length, notBest: tr.choices.filter(c => c.notTheBest).length, ui: tr.ui.map(e => [e.part, e.played, e.outcome]), errors: errs.slice(0, 5) }));
  await b.close(); })();
