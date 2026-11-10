/* The critic's repair condition, round 1: a careless run at 390x844 on a fixed clock. Reports the tilt readout peak after the flick, each fallen candle's on-screen length (px), and writes two at-rest frame pairs (lit, unlit) 1 s apart for a pixel diff. Needs the :8762 server. */
/* careless run at 390x844 (the critic's repair condition), plus the at-rest identity check */
const { chromium } = require('playwright'), fs = require('fs'); const S = process.env.OUT || '/tmp/dyn3d-careless'; fs.mkdirSync(S + '/shots', { recursive: true });
(async () => { const b = await chromium.launch();  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.setDefaultTimeout(180000); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8762/experiments/swarms/3d-dynamics/index.html?proof'); await p.waitForFunction(() => window.PG); await p.evaluate(() => document.fonts.ready);
  const adv = async (n, draw) => p.evaluate(([n, d]) => { for (let i = 0; i < n; i++) (d || i >= n - 3) ? PG.advance(1/30) : game.advance(1/30); }, [n, draw]);
  await p.evaluate(() => PG.play()); await adv(Math.round(18.05 * 30)); await p.screenshot({ path: S + '/shots/c-pre.png' });
  let peak = 0; for (let i = 0; i < 25; i++) { await adv(1, true); peak = Math.max(peak, await p.evaluate(() => Math.abs(Math.round(game.rings[2].ang / game.rings[2].deg * 2)))); }
  await adv(6); await p.screenshot({ path: S + '/shots/c-post.png' });
  const fallen = await p.evaluate(() => game.main.candles.map((c, k) => c.state === 'fallen' ? PG.candleScreen(k) : null).filter(Boolean));
  const stand = await p.evaluate(() => Math.round(Math.abs(game.main.theta) * 180 / Math.PI * 10) / 10);
  // at rest, lit (24.3 and 25.3 s, before the blow) and unlit (after the blow and the smoke, 29.6 and 30.6 s)
  const to = async (T, draw) => { const now = await p.evaluate(() => game.t); let n = Math.round((T - now) * 30); if (!draw) return adv(n); while (n > 0) { const k = Math.min(6, n); await adv(k, true); n -= k; } };
  await to(24.3); const l1 = await p.screenshot(); const restL = await p.evaluate(() => [game.main.atRest(), game.litCount()]); await to(25.3); const l2 = await p.screenshot(); const restL2 = await p.evaluate(() => [game.main.atRest(), game.litCount()]);
  await to(29.6, true); const u1 = await p.screenshot(); const restU = await p.evaluate(() => game.main.atRest()); await to(30.6, true); const u2 = await p.screenshot();
  fs.writeFileSync(S + '/shots/u1.png', u1); fs.writeFileSync(S + '/shots/u2.png', u2); fs.writeFileSync(S + '/shots/l1.png', l1); fs.writeFileSync(S + '/shots/l2.png', l2);
  console.log(JSON.stringify({ tiltReadoutPeak: peak, standTiltAfter: stand, fallen, restUnlit: restU, restLit: [restL, restL2], errs })); await b.close(); })();
