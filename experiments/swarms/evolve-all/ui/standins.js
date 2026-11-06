/* ui/standins.js — minimal stand-ins for the six evolver modules, written by the host owner so the host runs before the real
   modules arrive. Each follows CONTRACT.md exactly. Their targets are NOT film references: they are rough numbers taken from
   ana/index.html's hand-built memory (hexagonal table radius 0.4 at height 0.5, chocolate cake with orange top, red inscription,
   seven striped candles). The host uses a real module (window.EVOMOD[name], or require('../modules/<name>.js')) whenever it exists.
   Units: metres-ish, as ana/index.html (table top at 0.5, cake radius 0.12). Every part is built around its own origin = its base. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.STANDINS = factory(); })(this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2, sst = (a, b, t) => clamp((t - a) / (b - a), 0, 1);
  const named = (genes, G) => { const o = {}; genes.forEach((g, i) => o[g[0]] = G[i]); return o; };
  // similarity of named genes to a target: 1 - mean normalised distance over the listed keys
  function sim(genes, G, target, keys) { let s = 0, n = 0; genes.forEach((g, i) => { if (keys && !keys.includes(g[0])) return; if (!(g[0] in target)) return; s += Math.abs(G[i] - target[g[0]]) / (g[3] - g[2]); n++; }); return n ? clamp(1 - 1.6 * s / n, 0, 1) : 1; }
  function make(spec) {
    const { name, genes, groups, target, stageKeys, stages } = spec;
    const mod = { name, genes, groups, stages, making: spec.making, standin: true,
      blank: () => Float64Array.from(genes.map(g => spec.blank[g[0]] != null ? spec.blank[g[0]] : g[4])),
      evaluate(G, refs) { const parts = {}; Object.keys(stageKeys).forEach(k => parts[k] = sim(genes, G, target, stageKeys[k]));
        let sup = 1; if (spec.support) { sup = spec.support(named(genes, G), refs && refs.support); parts.support = sup; }
        const vals = Object.keys(stageKeys).map(k => parts[k]); const fit = clamp(vals.reduce((a, b) => a + b, 0) / vals.length * (.6 + .4 * sup), 0, 1); return { fit, parts }; },
      build: (THREE, G, opts) => spec.build(THREE, named(genes, G), (opts && opts.t != null) ? opts.t : 1, opts || {}),
      anchors: G => spec.anchors(named(genes, G)) };
    return mod;
  }
  const col = (T, r, g, b) => new T.Color(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1));
  const std = (T, c, extra) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .7 }, extra || {}));
  /* ------------------------------------------------------------------ TABLE: a block becomes the hexagonal table */
  const TABLE = make({ name: 'table', groups: ['SHAPE', 'SIZE', 'COLOUR'],
    genes: [['sides', 'SHAPE', 3, 9, 4], ['leg', 'SHAPE', .02, .12, .06], ['radius', 'SIZE', .15, .6, .3], ['height', 'SIZE', .2, .8, .3], ['thick', 'SIZE', .01, .08, .05],
      ['r', 'COLOUR', 0, 1, .5], ['g', 'COLOUR', 0, 1, .5], ['b', 'COLOUR', 0, 1, .5]],
    blank: { sides: 4, radius: .18, height: .22, thick: .07, r: .45, g: .45, b: .45 },
    target: { sides: 6, leg: .06, radius: .4, height: .5, thick: .03, r: .54, g: .38, b: .2 },
    stageKeys: { shape: ['sides', 'leg'], size: ['radius', 'height', 'thick'], colour: ['r', 'g', 'b'] },
    stages: [['SHAPE', 'shape', .9], ['SIZE', 'size', .88], ['COLOUR', 'colour', .85]],
    making: [['SET THE LEG', 0, .45], ['LAY THE TOP', .45, .85], ['OIL THE WOOD', .85, 1]],
    build(T, g, t) { const G = new T.Group(), s = Math.round(g.sides), wood = std(T, col(T, g.r, g.g, g.b), { roughness: .6 }); const lh = (g.height - g.thick) * sst(0, .45, t);
      if (lh > .001) { const leg = new T.Mesh(new T.CylinderGeometry(g.leg * .8, g.leg * 1.15, lh, 16), std(T, 0x1a1612, { roughness: .85 })); leg.position.y = lh / 2; G.add(leg); }
      const u = sst(.45, .85, t); if (u > 0) { const top = new T.Mesh(new T.CylinderGeometry(g.radius * u, g.radius * u, g.thick, s), wood); top.position.y = g.height - g.thick / 2; G.add(top); }
      if (t < 1 && t > .85) wood.color.multiplyScalar(.6 + .4 * sst(.85, 1, t)); return G; },
    anchors: g => ({ base: [0, 0, 0], top: [0, g.height, 0], rim: [g.radius, g.height, 0], floor: [0, 0, 0] }) });
  /* ------------------------------------------------------------------ CAKE: a flat disc of dough becomes the chocolate cake with the orange top */
  const CAKE = make({ name: 'cake', groups: ['FORM', 'SPONGE', 'ICING', 'DECORATION'],
    genes: [['radius', 'FORM', .05, .2, .1], ['height', 'FORM', .01, .16, .02], ['dome', 'FORM', 0, 1, 0], ['sr', 'SPONGE', 0, 1, .85], ['sg', 'SPONGE', 0, 1, .78], ['sb', 'SPONGE', 0, 1, .62],
      ['ir', 'ICING', 0, 1, .9], ['ig', 'ICING', 0, 1, .86], ['ib', 'ICING', 0, 1, .8], ['beads', 'DECORATION', 0, 1, 0]],
    blank: {}, target: { radius: .12, height: .095, dome: 0, sr: .23, sg: .125, sb: .08, ir: .85, ig: .47, ib: .17, beads: .7 },
    stageKeys: { form: ['radius', 'height', 'dome'], sponge: ['sr', 'sg', 'sb'], icing: ['ir', 'ig', 'ib'], deco: ['beads'] },
    stages: [['FORM', 'form', .9], ['SPONGE', 'sponge', .86], ['ICING', 'icing', .86], ['DECORATION', 'fit', .86]],
    making: [['POUR THE BASE', 0, .35], ['RAISE THE SPONGE', .35, .55], ['ICE THE TOP', .55, .8], ['SET THE BEADS', .8, 1]],
    build(T, g, t) { const G = new T.Group(), r = g.radius, h = Math.max(.008, g.height * (.15 + .85 * sst(0, .55, t)));
      const side = new T.Mesh(new T.CylinderGeometry(r * (1 - .25 * g.dome), r, h, 64), std(T, col(T, g.sr, g.sg, g.sb), { roughness: .85 })); side.position.y = h / 2; G.add(side);
      const ic = sst(.55, .8, t); if (ic > 0) { const top = new T.Mesh(new T.CylinderGeometry(r * (1 - .25 * g.dome) * (.4 + .6 * ic) + .002, r * (1 - .25 * g.dome) * (.4 + .6 * ic) + .002, .008, 64), std(T, col(T, g.ir, g.ig, g.ib), { roughness: .5 })); top.position.y = h + .002; G.add(top); }
      const nb = Math.round(70 * g.beads * sst(.8, 1, t)); if (nb > 0) { const im = new T.InstancedMesh(new T.SphereGeometry(.0045, 8, 6), std(T, 0xffffff, { roughness: .4 }), nb), m4 = new T.Matrix4(), cs = [0xe94b3c, 0xf2d14b, 0x4bb0e9, 0xf7f3ea, 0x6cc070];
        for (let k = 0; k < nb; k++) { const a = k * 2.399, y = .01 + ((k * 37) % 70) / 70 * (h - .02); m4.makeTranslation(Math.cos(a) * r * 1.01, y, Math.sin(a) * r * 1.01); im.setMatrixAt(k, m4); im.setColorAt(k, new T.Color(cs[k % 5])); } G.add(im); }
      return G; },
    anchors: g => ({ base: [0, 0, 0], top: [0, g.height + .006, 0], rim: [g.radius * (1 - .25 * g.dome), g.height + .006, 0] }) });
  /* ------------------------------------------------------------------ INSCRIPTION: a dot of icing becomes 生日快乐, written stroke by stroke */
  const CH = ['生', '日', '快', '乐'];
  const INSCRIPTION = make({ name: 'inscription', groups: ['HAND', 'INK'],
    genes: [['size', 'HAND', .2, 1, .3], ['tilt', 'HAND', -.5, .5, .3], ['flourish', 'HAND', 0, 1, 0], ['weight', 'INK', .2, 1, .3], ['r', 'INK', 0, 1, .95], ['g', 'INK', 0, 1, .9], ['b', 'INK', 0, 1, .85]],
    blank: {}, target: { size: .78, tilt: -.12, flourish: .8, weight: .6, r: .77, g: .14, b: .11 },
    stageKeys: { hand: ['size', 'tilt', 'flourish'], ink: ['weight', 'r', 'g', 'b'] },
    stages: [['HAND', 'hand', .88], ['INK', 'fit', .86]],
    making: [['WRITE 生', 0, .2], ['WRITE 日', .2, .4], ['WRITE 快', .4, .6], ['WRITE 乐', .6, .8], ['THE FLOURISH', .8, 1]],
    build(T, g, t, opts) { const G = new T.Group(); if (typeof document === 'undefined') return G; const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      x.translate(128, 140); x.rotate(g.tilt); const ink = `rgb(${g.r * 255 | 0},${g.g * 255 | 0},${g.b * 255 | 0})`; x.fillStyle = ink; x.strokeStyle = ink;
      x.font = `${400 + Math.round(g.weight * 4) * 100} ${Math.round(28 + 22 * g.size)}px "PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      const p = t * 5, step = 30 + 22 * g.size; for (let i = 0; i < 4; i++) { const f = clamp(p - i, 0, 1); if (f <= 0) break; const X = (i - 1.5) * step; x.save(); x.beginPath(); x.rect(X - step / 2, -step / 2, step, step * f); x.clip(); x.fillText(CH[i], X, 0); x.restore(); }
      const ff = clamp(p - 4, 0, 1) * g.flourish; if (ff > 0) { x.lineWidth = 2 + 4 * g.weight; x.lineCap = 'round'; x.beginPath(); for (let k = 0; k <= 30 * ff; k++) { const u = k / 30, X = -80 + u * 160, Y = 34 + Math.sin(u * 5) * 7; k ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke(); }
      const tex = new T.CanvasTexture(c); if (T.sRGBEncoding) tex.encoding = T.sRGBEncoding; const rad = (opts.support && opts.support.rim) ? opts.support.rim[0] * .92 : .11;
      const m = new T.Mesh(new T.CircleGeometry(rad, 48), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .0015; G.add(m); return G; },
    anchors: g => ({ base: [0, 0, 0], centre: [0, .0015, 0] }) });
  /* ------------------------------------------------------------------ CANDLES: seven bare sticks become seven striped candles on the cake top */
  const CANDLES = make({ name: 'candles', groups: ['STICK', 'PLACING'],
    genes: [['height', 'STICK', .02, .12, .04], ['thick', 'STICK', .0015, .008, .006], ['stripe', 'STICK', 0, 1, 0], ['ring', 'PLACING', .02, .2, .15], ['inner', 'PLACING', .2, 1, 1]],
    blank: {}, target: { height: .07, thick: .0028, stripe: .85, ring: .088, inner: .6 },
    stageKeys: { stick: ['height', 'thick', 'stripe'], placing: ['ring', 'inner'] },
    stages: [['STICK', 'stick', .86], ['PLACING', 'fit', .86]],
    support(g, sup) { if (!sup || !sup.rim) return 1; const lim = sup.rim[0] * .92; return g.ring <= lim ? 1 : clamp(1 - (g.ring - lim) / .05, 0, 1); },   // a candle off the cake top fails
    making: [['PLACE CANDLE 1', 0, .14], ['PLACE CANDLE 4', .14, .57], ['PLACE CANDLE 7', .57, 1]],
    build(T, g, t) { const G = new T.Group(); let tex = null; if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = 16; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#f2e9d6'; x.fillRect(0, 0, 16, 64); x.globalAlpha = g.stripe; x.fillStyle = '#d4483e'; for (let y = -16; y < 80; y += 12) { x.beginPath(); x.moveTo(0, y); x.lineTo(16, y + 8); x.lineTo(16, y + 13); x.lineTo(0, y + 5); x.fill(); } tex = new T.CanvasTexture(c); }
      const n = Math.floor(t * 7 + 1e-6); const pos = this_wicks(g); for (let k = 0; k < Math.min(7, n); k++) { const m = new T.Mesh(new T.CylinderGeometry(g.thick, g.thick, g.height, 10), std(T, 0xffffff, { map: tex, roughness: .5 })); m.position.set(pos[k][0], g.height / 2, pos[k][2]); G.add(m); } return G; },
    anchors: g => { const o = { base: [0, 0, 0] }; this_wicks(g).forEach((p, k) => o['wick' + k] = p); return o; } });
  function this_wicks(g) { const out = []; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + .3, r = k % 2 ? g.ring * g.inner : g.ring; out.push([Math.cos(a) * r, g.height + .004, Math.sin(a) * r]); } return out; }
  /* ------------------------------------------------------------------ PEOPLE: three posts become three faceless children around the table, seen at a distance */
  const PEOPLE = make({ name: 'people', groups: ['BODY', 'CLOTHES', 'PLACE'],
    genes: [['height', 'BODY', .3, 1.2, .5], ['width', 'BODY', .05, .3, .08], ['head', 'BODY', .04, .14, .05], ['r', 'CLOTHES', 0, 1, .5], ['g', 'CLOTHES', 0, 1, .5], ['b', 'CLOTHES', 0, 1, .5], ['ring', 'PLACE', .3, 1.2, 1.1], ['spread', 'PLACE', .2, 1.6, .3]],
    blank: {}, target: { height: .72, width: .17, head: .085, r: .78, g: .34, b: .4, ring: .62, spread: 1.15 },
    stageKeys: { body: ['height', 'width', 'head'], clothes: ['r', 'g', 'b'], place: ['ring', 'spread'] },
    stages: [['BODY', 'body', .86], ['CLOTHES', 'clothes', .84], ['PLACE', 'fit', .86]],
    making: [['STAND', 0, .5], ['DRESS', .5, .8], ['GATHER', .8, 1]],
    build(T, g, t) { const G = new T.Group(), k3 = [0, 1, 2]; const cloth = std(T, col(T, g.r * (.5 + .5 * sst(.5, .8, t)), g.g * (.5 + .5 * sst(.5, .8, t)), g.b * (.5 + .5 * sst(.5, .8, t))), { roughness: .9 }), skin = std(T, 0x9b7a62, { roughness: .9 });
      const u = sst(0, .5, t), gather = sst(.8, 1, t); k3.forEach(i => { const a = Math.PI + (i - 1) * g.spread * .5, rr = g.ring * (1.3 - .3 * gather), p = new T.Group(); p.position.set(Math.sin(a) * rr, 0, Math.cos(a) * rr); p.rotation.y = a + Math.PI;
        const bh = g.height * .62 * u * (.9 + .1 * i); if (bh > .01) { const body = new T.Mesh(new T.CylinderGeometry(g.width * .38, g.width * .5, bh, 14), cloth); body.position.y = bh / 2; p.add(body);
          const hd = new T.Mesh(new T.SphereGeometry(g.head * .5 * (.6 + .4 * u), 16, 12), skin); hd.position.y = bh + g.head * .55; p.add(hd); } G.add(p); }); return G; },   // a plain sphere: no face, ever
    anchors: g => ({ base: [0, 0, 0], hands: [0, g.height * .45, -g.ring + .1] }) });
  /* ------------------------------------------------------------------ LIGHT: grey even light becomes the memory's warm round spot */
  const LIGHT = make({ name: 'light', groups: ['SPOT', 'WARMTH'],
    genes: [['spot', 'SPOT', .1, 1.2, 1.1], ['soft', 'SPOT', 0, 1, .1], ['power', 'SPOT', .2, 3, 1], ['warm', 'WARMTH', 0, 1, .4], ['dark', 'WARMTH', 0, 1, .2]],
    blank: {}, target: { spot: .38, soft: .7, power: 2.2, warm: .75, dark: .9 },
    stageKeys: { spot: ['spot', 'soft', 'power'], warmth: ['warm', 'dark'] },
    stages: [['SPOT', 'spot', .86], ['WARMTH', 'fit', .86]],
    making: [['THE MEMORY SWITCHES ON', 0, .6], ['WARM', .6, 1]],
    build(T, g, t) { const G = new T.Group(), w = g.warm, c = new T.Color(1, .82 + .1 * (1 - w), .62 + .35 * (1 - w)); const L = new T.SpotLight(c, g.power * t, 4, .1 + g.spot * .5, g.soft, 1.2); L.position.set(.3, 1.9, .6); L.target.position.set(0, .5, 0); G.add(L, L.target);
      const h = new T.HemisphereLight(0x8a9692, 0x0a0806, .5 * (1 - g.dark) * t + .02); G.add(h);
      const disc = new T.Mesh(new T.CircleGeometry(g.spot, 64), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .12 * t, blending: T.AdditiveBlending, depthWrite: false })); disc.rotation.x = -Math.PI / 2; disc.position.y = .004; G.add(disc); return G; },
    anchors: g => ({ base: [0, 0, 0], source: [.3, 1.9, .6] }) });
  return { table: TABLE, cake: CAKE, inscription: INSCRIPTION, candles: CANDLES, people: PEOPLE, light: LIGHT };
});
