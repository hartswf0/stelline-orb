/* Writes what train.py needs into ./train/: the label drawn in 40 variations of typeface and proportion (tex*.png)
   and, if the photographs are present in .cuptest/ (they are not in the repository), their unwrapped patches.
   Run from a scratch directory with the site served on 127.0.0.1:8765:  node export.mjs */
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 700, height: 980 } });
  await p.goto('http://127.0.0.1:8765/cup-ar.html?fresh&hands=0'); await p.waitForTimeout(800);
  const fams = ['"DejaVu Sans"', '"DejaVu Sans Mono"', 'FreeSans', 'Inter', '"JetBrains Mono"', 'Carlito'];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 40; k++) { const fam = k % 2 ? fams[0] : fams[(k >> 1) % fams.length], sc = .95 + rnd() * .5, cx = .48 + rnd() * .3, wt = rnd() < .2 ? '600' : 'bold', sm = .85 + rnd() * .45;
    const url = await p.evaluate(([fam, sc, cx, wt, sm]) => { const C = Math.PI * CUP.spec.D, c = document.createElement('canvas'); c.width = 2880; c.height = 768; const x = c.getContext('2d'), d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
      Object.defineProperty(x, 'font', { set(v) { const m = v.match(/^(\w+ )?([\d.]+)px/); d.set.call(this, wt + ' ' + (+m[2] * (+m[2] > 5 ? sc : sc * sm)) + 'px ' + fam); }, get() { return d.get.call(this); } });
      const ft = x.fillText.bind(x); x.fillText = (t, a, b2) => { x.save(); x.scale(cx, 1); ft(t, a / cx, b2); x.restore(); };
      CUP.paintLabel(x, 2880 / C, 768 / CUP.spec.labelH); return c.toDataURL(); }, [fam, sc, cx, wt, sm]);
    fs.writeFileSync(`train/tex${k}.png`, Buffer.from(url.split(',')[1], 'base64')); }
  const out = {};
  for (const f of ['p6_strip', 'p2_col22', 'p5_col18', 'p1_strip_hand', 'p8_stand', 'p4_blur']) {
    await p.goto(`http://127.0.0.1:8765/cup-ar.html?fresh&img=.cuptest/${f}.jpg&hands=0`); await p.waitForFunction('window.CUPAR && window.CUPAR.ready');
    const r = await p.evaluate(() => { const c = document.getElementById('frame'), im = c.getContext('2d').getImageData(0, 0, c.width, c.height); const d = CUP.detect(im, hiFrame()); return { U: Array.from(d.unwrap).map(Math.round), a: d.a, strip: d.strip, face: d.face, pitch: d.pitchSeen }; });
    fs.writeFileSync(`train/real_${f}.json`, JSON.stringify(r)); out[f] = { a: r.a, face: r.face };
  }
  console.log(JSON.stringify(out)); await b.close();
})();
