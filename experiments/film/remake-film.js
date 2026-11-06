// The memory-maker scene shot for shot: the film's own cut and timing (2:08-4:05 of the clip, 24 fps). Every shot of the memory is
// replaced by cineosis-orb filmed from the same position; shots of Ana, K and her hands stay real. Controls are hidden, as the film hides them.
// Following BUF's notes on how the film was made: the cake comes first, turning in the air; the cakes change through a magnesium-flash decay;
// table and children arrive in spots of projected light; the children are cards that turn within 35 degrees; the memory switches off in banks.
// Frame n is clip frame n (clip time n/24). Writes OUT/f/NNNNN.jpg for the replaced shots only, and OUT/plan.json for the cut.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.env.OUT || '/home/claude/stelline-work/remake/'; fs.mkdirSync(OUT + 'f', { recursive: true });
// the film's shots (start, end in clip seconds) and, for ours, a camera: [from], [toward], lens fov, and a small move over the shot
const ANA = { cake: 23, candles: [7, 0, 1], light: [25, .85, 1, .15], room: [null, 0, .14, .06], children: [['film-child-1', -.36, -.5], ['film-child-2-blow', .02, -.64], ['film-child-3-blow', .38, -.48]] };
const SHOTS = [
  [128.00, 134.38, 'real'], [134.38, 137.46, 'real'],
  [137.46, 141.38, 'ours', { from: [.55, .5, 3.3], to: [0, .66, 0], fov: 27, move: [-.1, 0, -.15] }],
  [141.38, 144.75, 'real'],
  [144.75, 148.38, 'ours', { from: [.12, .76, .62], to: [0, .67, 0], fov: 30, move: [-.06, 0, -.04] }],
  [148.38, 152.04, 'real'],
  [152.04, 156.04, 'ours', { from: [-.1, .98, 1.55], to: [0, .72, -.25], fov: 34, move: [.08, -.02, -.06] }],
  [156.04, 159.12, 'ours', { from: [-.5, 1.25, 6.2], to: [0, .62, 0], fov: 24, move: [0, 0, -.12] }],
  [159.12, 161.33, 'real'], [161.33, 165.62, 'real'], [165.62, 168.50, 'real'],
  [168.50, 171.58, 'ours', { from: [1.6, 1.05, 5.6], to: [0, .66, 0], fov: 21, move: [0, 0, 0] }],
  [171.58, 173.08, 'ours', { face: 0, back: .68, fov: 30 }],
  [173.08, 175.62, 'ours', { from: [.16, .79, .44], to: [-.02, .74, -.2], fov: 26, move: [-.02, 0, 0] }],
  [175.62, 177.92, 'ours', { face: 2, back: .68, fov: 30 }],
  [177.92, 180.50, 'real'],
  [180.50, 185.75, 'ours', { from: [0, .92, 1.2], to: [0, .74, -.25], fov: 36, move: [.1, 0, -.05] }],
  [185.75, 190.42, 'real'], [190.42, 194.29, 'real'], [194.29, 203.46, 'real'], [203.46, 213.25, 'real'],
  [213.25, 216.96, 'ours', { from: [.1, .88, 1.05], to: [0, .72, -.2], fov: 34, move: [-.05, 0, -.03] }],
  [216.96, 226.38, 'real'],
  [226.38, 229.00, 'ours', { face: 1, back: .66, fov: 30 }],
  [229.00, 233.17, 'ours', { from: [1.4, .95, 5.0], to: [0, .64, 0], fov: 22, move: [0, 0, 0] }],
  [233.17, 237.46, 'real'], [237.46, 245.00, 'real']];
// what happens in the memory, in clip time
const EVENTS = [[137.6, 'cake'], [145.4, 'swap:12'], [146.5, 'swap:31'], [147.6, 'swap:23'], [151.5, 'stop'], [152.1, 'table'], [152.5, 'child:0'], [152.9, 'child:1'], [153.3, 'child:2'], [227.6, 'out'], [230.2, 'off']];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => console.log('PE', e.message));
  await p.goto('http://127.0.0.1:8095/cineosis-orb/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: '.app { grid-template-rows: 1fr !important; } #orb { display: none !important; }' });
  await p.evaluate(() => { window.dispatchEvent(new Event('resize')); FORGE.manual(); document.querySelectorAll('svg').forEach(s => s.style.display = 'none'); });
  await p.evaluate(A => { // warm the children's sheets and the cakes, then start from an empty dark dome with the light set
    window.ANA = A; setDoc(DOC0()); const D = FORGE.DOC; D.light = { a: A.light[0], h: A.light[1], warm: A.light[2], k: A.light[3] }; D.room = { place: null, era: 0, mist: A.room[2], mess: A.room[3] };
    A.children.forEach(([ref, x, z]) => D.items.push({ id: 900 + D.items.length, type: 'cut', ref, plane: 'TABLE', x, z, up: .3, turn: 0, size: 1, play: 1, frame: 0, mirror: 0, color: 0 })); FORGE.touch(); FORGE.advance(1 / 24); }, ANA);
  await p.waitForTimeout(3000);
  await p.evaluate(() => { for (let k = 0; k < 6; k++) FORGE.advance(1 / 24); const D = FORGE.DOC; D.items = []; FORGE.touch(); for (let k = 0; k < 30; k++) FORGE.step(1 / 24); });
  const T0 = 128.0, T1 = 245.0, N = Math.round((T1 - T0) * 24); let ei = 0; const shotAt = t => SHOTS.find(s => t >= s[0] && t < s[1]);
  for (let f = 0; f < N; f++) { const n = Math.round(T0 * 24) + f, t = n / 24;
    while (ei < EVENTS.length && EVENTS[ei][0] <= t) { const [, e] = EVENTS[ei++];
      await p.evaluate(e => { const D = FORGE.DOC, A = window.ANA, [k, v] = e.split(':');
        if (k === 'cake') { const pr = PRESETS[A.cake]; D.cake = { preset: A.cake, form: pr[1], icing: pr[2], border: pr[3], size: 1, turn: 0, tall: 1.3 }; D.writing = { text: '生日快乐', cur: 4, size: .8, col: 4 }; D.candles = { n: A.candles[0], ctype: A.candles[1], lit: 1, spread: 1, len: 1, per: {} }; window.SPIN = 34; }
        else if (k === 'swap') { const pr = PRESETS[+v]; Object.assign(D.cake, { preset: +v, form: pr[1], icing: pr[2], border: pr[3] }); }
        else if (k === 'stop') window.SPIN = 0;
        else if (k === 'table') D.table = { w: .92, wood: 1, shape: 0, k: 1 };
        else if (k === 'child') { const [ref, x, z] = A.children[+v]; D.items.push({ id: 900 + +v, type: 'cut', ref, plane: 'TABLE', x, z, up: .3, turn: [8, -4, -10][+v], size: 1, play: 1, frame: 0, mirror: 0, color: 0, glow: .1 }); }
        else if (k === 'out') D.candles.lit = 0;
        else if (k === 'off') FORGE.switchOff(1.1, () => { setDoc(DOC0()); });
        FORGE.touch(); }, e); }
    const sh = shotAt(t), ours = sh && sh[2] === 'ours';
    await p.evaluate(([cam, u, film]) => { const D = FORGE.DOC; if (D.cake && window.SPIN) D.cake.turn = ((D.cake.turn || 0) + window.SPIN / 24 + 180) % 360 - 180;
      if (cam) { let from, to; if (cam.face != null) { const it = D.items.find(i => i.id === 900 + cam.face); const bx = it && boxOf('i' + it.id);
          if (bx) { const c = bx.getCenter(new T.Vector3()), hgt = bx.max.y - bx.min.y; to = [c.x, bx.max.y - hgt * .2, c.z]; from = [c.x + (c.x > 0 ? -.06 : .06) + u * .015, to[1] - .01, c.z + cam.back - u * .03]; } }
        if (!from) { from = cam.from.map((v, i) => v + (cam.move ? cam.move[i] * u : 0)); to = cam.to; }
        window.CAMOVR = { pos: from, look: to, fov: cam.fov }; }
      film ? FORGE.advance(1 / 24) : FORGE.step(1 / 24); }, [ours ? sh[3] : null, ours ? (t - sh[0]) / (sh[1] - sh[0]) : 0, !!ours]);
    if (ours) { if (t - sh[0] < 1 / 24 && sh[3].face != null) { await p.waitForTimeout(400); await p.evaluate(() => FORGE.advance(1 / 24)); }
      await p.screenshot({ path: OUT + 'f/' + String(n).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 93 }); }
    if (f % 240 === 0) console.log('clip', t.toFixed(1), sh && sh[2]); }
  fs.writeFileSync(OUT + 'plan.json', JSON.stringify(SHOTS.map(s => [s[0], s[1], s[2]]))); await b.close(); console.log('done');
})();
