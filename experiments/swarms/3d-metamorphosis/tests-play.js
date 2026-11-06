/* tests-play.js: the critic's round-1 failure as a regression test, played with the mouse on the device only.
   At 390 x 844, the page in ?proof mode (its clock advanced by the test, so the run is repeatable). The scene is played
   up to the brown dome and stopped; from there only mouse drags on the knurled ring and presses of HOLD:
   CANDLES: drag the knurl 3 x 160 px (>= 320 px) past the end. INSCRIPTION: the same. MATCH: the same.
   Pass: S.lit never above 7, S.placed never above 7, no page error, all seven flames show, HOLD blows and seven go out.
   Needs a static server on the repo root at :8741.  node experiments/swarms/3d-metamorphosis/tests-play.js  (writes tests-play.json) */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = [], res = { checks: [], log: [] };
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const ok = (c, m) => { res.checks.push({ ok: !!c, m }); console.log((c ? 'PASS ' : 'FAIL ') + m); };
  await p.goto('http://localhost:8741/experiments/swarms/3d-metamorphosis/index.html?proof'); await p.waitForFunction(() => window.PG);
  const adv = s => p.evaluate(n => { for (let i = 0; i < n; i++) PG.advance(1 / 30, i < n - 1); }, Math.round(s * 30));
  await p.evaluate(() => PG.play()); let guard = 0;
  while (await p.evaluate(() => PG.S.cur !== 'BROWN_DOME') && guard++ < 60) await adv(.5);
  await adv(.4); await p.evaluate(() => PG.stop());
  const D = await p.evaluate(() => PG.dev()), kn = D.bands.find(x => x.kind === 'knurl'), hold = D.btns.find(x => x.id === 'hold');
  const KX = D.left + kn.x + kn.w / 2, KY = D.top + kn.cy, st = () => p.evaluate(() => ({ t: PG.tgt(), placed: PG.S.placed, insc: PG.S.insc, lit: PG.S.lit, done: PG.S.done, blowAt: PG.S.blowAt, ended: PG.S.ended }));
  let maxLit = 0, maxPlaced = 0;
  async function drag320() { for (let k = 0; k < 3; k++) { await p.mouse.move(KX, KY + 70); await p.mouse.down(); for (let y = 70; y >= -90; y -= 10) { await p.mouse.move(KX, KY + y); await adv(.05); const s = await st(); maxLit = Math.max(maxLit, s.lit); maxPlaced = Math.max(maxPlaced, s.placed); } await p.mouse.up(); }
    await adv(3); const s = await st(); maxLit = Math.max(maxLit, s.lit); maxPlaced = Math.max(maxPlaced, s.placed); res.log.push(s); return s; }
  async function pressHold() { await p.mouse.move(D.left + hold.x, D.top + hold.y); await p.mouse.down(); await p.mouse.up(); await adv(.6); return st(); }
  let s = await st(); ok(s.t === 'CANDLES', `at the brown dome the selected job is CANDLES (${s.t})`);
  s = await drag320(); ok(s.placed === 7 && s.t === 'CANDLES', `after 480 px of drags: 7 candles, still on CANDLES (placed ${s.placed}, on ${s.t})`);
  s = await pressHold(); ok(s.done.CANDLES && s.t === 'INSCRIPTION', `HOLD sets the candles; next is INSCRIPTION (${s.t})`);
  s = await drag320(); ok(s.insc === 24 && s.t === 'INSCRIPTION' && s.lit === 0, `inscription 24 of 24, no candle lit by the overrun (insc ${s.insc}, lit ${s.lit}, on ${s.t})`);
  s = await pressHold(); ok(s.t === 'MATCH', `HOLD sets the inscription; next is MATCH (${s.t})`);
  s = await drag320(); const cs = await p.evaluate(() => PG.candleState());
  ok(s.lit === 7, `seven lit (${s.lit})`); ok(cs.every(c => c.lit && c.flame > 0 && c.visible), `all seven flames show (${cs.map(c => c.flame).join(',')})`);
  s = await pressHold(); ok(s.blowAt > 0, 'HOLD is the blow'); await adv(2.5); s = await st(); const cs2 = await p.evaluate(() => PG.candleState());
  ok(cs2.every(c => c.out) && s.ended, `seven out, the game ended (${cs2.filter(c => c.out).length} out)`);
  ok(maxLit <= 7 && maxPlaced <= 7, `lit never above 7 (max ${maxLit}), placed never above 7 (max ${maxPlaced})`);
  ok(errs.length === 0, `no page errors (${errs.slice(0, 2).join(' | ')})`);
  await b.close(); res.passed = res.checks.filter(c => c.ok).length; res.failed = res.checks.length - res.passed; res.errors = errs;
  fs.writeFileSync(path.join(__dirname, 'tests-play.json'), JSON.stringify(res, null, 1)); console.log(`${res.passed} passed, ${res.failed} failed`); process.exit(res.failed ? 1 : 0);
})();
