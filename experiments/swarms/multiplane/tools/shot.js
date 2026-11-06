// screenshots of the page at given eye angles (scale-ring steps): node tools/shot.js out.png step [step...]
const { chromium } = require('playwright');
(async () => { const [out, ...steps] = process.argv.slice(2); const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
  pg.on('console', m => console.log('console:', m.text())); pg.on('pageerror', e => console.log('ERR', e.message));
  await pg.goto('http://localhost:8765/experiments/swarms/multiplane/index.html'); await pg.waitForFunction(() => window.MP && MP.ready);
  await pg.evaluate(() => MP.film(true));
  for (let i = 0; i < steps.length; i++) { const s = +steps[i]; await pg.evaluate(s => { MP.RINGS[0].target = MP.RINGS[0].applied = s; MP.RINGS[0].ang = s * 5; MP.V.yaw = s * MP.YAW_PER_STEP; MP.step(1 / 30); }, s); await pg.screenshot({ path: out.replace('.png', '_' + s + '.png') }); }
  await br.close(); })();
