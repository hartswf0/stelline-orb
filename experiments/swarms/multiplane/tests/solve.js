// the game's solution space: at which eye angles (and with which single depth change) are all 7 candles and all 3 faces seen
// node tests/solve.js  -> prints a map; writes tests/solve.json
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const URL = process.env.MP_URL || 'http://localhost:8765/experiments/swarms/multiplane/index.html';
(async () => { const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
  await pg.goto(URL); await pg.waitForFunction(() => window.MP && MP.ready); await pg.evaluate(() => { MP.film(true); MP.reset(); });
  const res = await pg.evaluate((ONLY) => { const yaws = []; for (let y = -30; y <= 30; y += 2) yaws.push(y);
    const scan = () => yaws.map(y => { const s = MP.sight(MP.camB(y), 0); return s.nCandles === 7 && s.nFaces === 3 ? 'X' : String(Math.min(9, (7 - s.nCandles) + (3 - s.nFaces))); }).join('');
    const out = { yaws, base: scan(), moves: {} };
    MP.TARGETS.filter(t => !ONLY || t.name === ONLY).forEach(t => { const p = MP.P[t.p], z0 = p.z; out.moves[t.name] = []; for (let z = t.zr[0]; z <= t.zr[1] + 1e-6; z += 0.1) { p.z = +z.toFixed(2); MP.sortPlanes(); out.moves[t.name].push([p.z, scan()]); } p.z = z0; MP.sortPlanes(); });
    return out; }, process.env.ONLY || null);
  console.log('yaw    ', res.yaws.map(y => (y % 10 === 0 ? '|' : ' ')).join('')); console.log('default', res.base);
  for (const [k, rows] of Object.entries(res.moves)) rows.forEach(([z, s]) => console.log((k + ' ' + z.toFixed(2)).padEnd(18), s));
  fs.writeFileSync(path.join(__dirname, 'solve.json'), JSON.stringify(res, null, 1)); await br.close(); })();
