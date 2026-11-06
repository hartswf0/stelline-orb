/* modules/candles.js — the seven candles and their flames. EVOLVE-ALL module (CONTRACT.md).
   Genome: how many candles, how they stand on the cake top (ring radius, arc, arc centre, radial zigzag, how deep they are pushed in),
   the shaft (height, thickness, share striped, spiral turns, share of striped ones in blue), colours (cream shaft, red stripe, blue stripe),
   and the flame (wick, height, width, lean, flicker).
   Fitness is measured against refs/candles.json (frames 147.375 s and 155.0 s): the seven bases in cake-top coordinates, shaft length
   to cake diameter, thickness, stripe turns, flame proportions and flicker, colours relative to the cake top; and SUPPORT: every
   candle's base on the cake top, inside the rim, pushed in but not sunk (a floating or sinking candle fails).
   Units: metres; origin = the cake-top centre (the host hangs the group on the cake's 'top' anchor); +z faces the viewer, -z is the back.
   Lengths are absolute, so when the cake changes radius the same genome stands differently on it and its fitness changes (re-attach).
   Node and browser (window.EVOMOD.candles). No DOM; THREE only inside build(). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../refs/candles.json'));   // node: refs bundled as the fallback
  else { root.EVOMOD = root.EVOMOD || {}; root.EVOMOD.candles = factory(null); }                                   // browser: the host passes refs/candles.json
})(this, function (BUNDLED) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const soft = (e, s, reach) => { const x = e / s; return .5 * Math.exp(-x * x) + .5 * Math.max(0, 1 - x / (reach || 4)); };   // as modules/inscription.js
  const D2R = Math.PI / 180, R_DEFAULT = .12, TOP_DEFAULT = [.95, .87, .72];
  /* ------------------------------------------------------------------ genes: [key, group, min, max, default] (default = the film's candles, roughly) */
  const genes = [
    ['count', 'COUNT', 1, 12, 7],
    ['ring', 'PLACING', 0, .1, .065], ['arc', 'PLACING', 0, 270, 167], ['mid', 'PLACING', -200, 20, -105.6], ['jitter', 'PLACING', 0, .4, .15], ['depth', 'PLACING', -.008, .02, .005],
    ['height', 'SHAFT', .005, .08, .0485], ['thick', 'SHAFT', .002, .015, .0075], ['striped', 'SHAFT', 0, 1, .43], ['turns', 'SHAFT', 0, 12, 8], ['cool', 'SHAFT', 0, 1, .33],
    ['cr', 'COLOUR', 0, 1, .9], ['cg', 'COLOUR', 0, 1, .82], ['cb', 'COLOUR', 0, 1, .59], ['sr', 'COLOUR', 0, 1, .65], ['sg', 'COLOUR', 0, 1, .37], ['sb', 'COLOUR', 0, 1, .01],
    ['br', 'COLOUR', 0, 1, .88], ['bg', 'COLOUR', 0, 1, .86], ['bb', 'COLOUR', 0, 1, 1],
    ['wick', 'FLAME', 0, .25, .1], ['flame', 'FLAME', 0, .8, .37], ['fw', 'FLAME', .2, .8, .41], ['lean', 'FLAME', -20, 20, 0], ['flicker', 'FLAME', 0, .3, .08]];   // ranges: plausible birthday candles, so one mutation step is about one tolerance
  const groups = ['COUNT', 'PLACING', 'SHAFT', 'COLOUR', 'FLAME'];
  const named = G => { const o = {}; genes.forEach((g, i) => o[g[0]] = G[i]); return o; };
  const BLANK = { count: 1, ring: 0, arc: 0, mid: 0, jitter: 0, depth: 0, height: .012, thick: .006, striped: 0, turns: 0, cool: 0,
    cr: .9, cg: .9, cb: .9, sr: .9, sg: .9, sb: .9, br: .9, bg: .9, bb: .9, wick: 0, flame: 0, fw: .5, lean: 0, flicker: .25 };   // one plain white stub in the middle, unlit, no wick
  function blank() { return Float64Array.from(genes.map(g => BLANK[g[0]])); }
  /* ------------------------------------------------------------------ references and support */
  function refOf(refs) { const r = refs && (refs.bases ? refs : refs.candles && refs.candles.bases ? refs.candles : null); if (r || BUNDLED) return r || BUNDLED;
    throw new Error('candles needs refs/candles.json (pass it as refs)'); }
  function supportOf(refs, opts) {   // the cake top: radius R, dome drop, colour. Accepts cake anchors {top, rim}, or {y, r} (refs.cakeTop / opts.cakeTop), or nothing.
    const ref = (() => { try { return refOf(refs); } catch (e) { return null; } })();
    const s = (opts && (opts.support || opts.cakeTop)) || (refs && (refs.support || refs.cakeTop)) || (ref && ref.cakeTopDefault) || null; let R = R_DEFAULT, drop = 0, y = 0, col = TOP_DEFAULT;
    if (s) { if (s.rim) { R = s.rim[0]; drop = s.top ? Math.max(0, s.top[1] - s.rim[1]) : 0; } else if (s.r) R = s.r; if (s.y != null && !s.rim) y = s.y; if (s.topColour) col = s.topColour; }
    return { R, drop, y, col, surf: r => -drop * Math.pow(clamp(r / R, 0, 1.2), 2) };
  }
  /* ------------------------------------------------------------------ layout: genome -> candles (base x, z in metres; kind) */
  const nOf = g => Math.round(clamp(g.count, 1, 12));
  function layout(G) {
    const g = G.length ? named(G) : G, n = nOf(g), ns = Math.round(clamp(g.striped, 0, 1) * n), nb = Math.round(clamp(g.cool, 0, 1) * ns), out = [];
    // striped candles take every other place (as in the film: cream, red, cream, blue, cream, red, cream), then the remaining places
    const order = []; for (let k = 1; k < n; k += 2) order.push(k); for (let k = 0; k < n; k += 2) order.push(k);
    const stripedSet = order.slice(0, ns), mid = stripedSet.slice().sort((a, b) => a - b), b0 = Math.floor((mid.length - nb) / 2), blue = new Set(mid.slice(b0, b0 + nb));
    for (let k = 0; k < n; k++) { const a = (g.mid + (n > 1 ? g.arc * (k / (n - 1) - .5) : 0)) * D2R, r = Math.max(0, g.ring * (1 + g.jitter * (k % 2 ? -1 : 1)));
      out.push({ k, x: Math.cos(a) * r, z: Math.sin(a) * r, r, kind: stripedSet.includes(k) ? (blue.has(k) ? 'blue' : 'red') : 'cream' }); }
    return { g, n, list: out };
  }
  /* ------------------------------------------------------------------ fitness */
  const W = { count: .1, placing: .3, shaft: .2, colour: .2, flame: .2 }, CS = .15;   // colour tolerance (RGB 0..1): the film colours are graded and blurred
  function evaluate(G, refs) {
    const ref = refOf(refs), sup = supportOf(refs), R = sup.R, L = layout(G), g = L.g, n = L.n, P = ref.proportions;
    const count = Math.max(0, 1 - Math.abs(n - ref.count) / 6);
    // PLACING: the bases against the film's seven, both ways (each film candle to its nearest model candle and back), in top radii
    const F = ref.bases.map(b => b.base), M = L.list.map(c => [c.x / R, c.z / R]); let d1 = 0, d2 = 0;
    F.forEach(f => d1 += Math.min(...M.map(m => Math.hypot(m[0] - f[0], m[1] - f[1])))); M.forEach(m => d2 += Math.min(...F.map(f => Math.hypot(m[0] - f[0], m[1] - f[1]))));
    const chamfer = (d1 / F.length + d2 / M.length) / 2;   // an arc with a zigzag cannot copy the film's loose two rows: the best is 0.13 R
    // and where the group as a whole stands (the mean of the bases): this keeps the arc's centre direction measurable even when the arc is wide
    const fm = [F.reduce((a, f) => a + f[0], 0) / F.length, F.reduce((a, f) => a + f[1], 0) / F.length], mmc = [M.reduce((a, m) => a + m[0], 0) / M.length, M.reduce((a, m) => a + m[1], 0) / M.length];
    const where = .7 * soft(chamfer, .2) + .3 * soft(Math.hypot(mmc[0] - fm[0], mmc[1] - fm[1]), .1);
    // SUPPORT: each base inside the rim (with its own half-thickness), pushed in at least 2 mm, never more than half its height
    let support = 0; L.list.forEach(c => { const edge = clamp(1 - (c.r + g.thick / 2 - .95 * R) / (.05 * R), 0, 1);
      const inn = clamp((g.depth + .003) / .005, 0, 1), sunk = clamp(1 - (g.depth - .5 * g.height) / (.25 * g.height), 0, 1); support += edge * inn * sunk; }); support /= n;
    const placing = where * support;
    // SHAFT: length to cake diameter, thickness to length, how many striped, spiral turns, how many of the striped are blue
    const kinds = ref.kinds, ns = Math.round(clamp(g.striped, 0, 1) * n), nStripF = kinds.red + kinds.blue;
    const sp = { length: soft(Math.abs(Math.log(g.height / (2 * R) / P.lengthToDiameter)), .15), thick: soft(Math.abs(Math.log(g.thick / g.height / P.thickToLength)), .2),
      striped: soft(Math.abs(g.striped - nStripF / ref.count), .12), turns: soft(Math.abs(g.turns - P.stripeTurns), 2), blue: soft(Math.abs(g.cool - kinds.blue / nStripF), .2) };
    const shaft = (sp.length + sp.thick + sp.striped + sp.turns + sp.blue) / 5;
    // COLOUR: each against the cake top as the film shows it (colour / cake top, per channel), times this cake's top colour
    const rel = ref.colours.rel, tgt = k => rel[k].map((v, i) => clamp(v * sup.col[i], 0, 1));
    const cc = { cream: soft(Math.hypot(g.cr - tgt('cream')[0], g.cg - tgt('cream')[1], g.cb - tgt('cream')[2]), CS, 1.5 / CS),
      red: soft(Math.hypot(g.sr - tgt('red')[0], g.sg - tgt('red')[1], g.sb - tgt('red')[2]), CS, 1.5 / CS), blue: soft(Math.hypot(g.br - tgt('blue')[0], g.bg - tgt('blue')[1], g.bb - tgt('blue')[2]), CS, 1.5 / CS) };
    const colour = Math.cbrt(cc.cream * cc.red * cc.blue);   // geometric mean: the worst colour leads
    // FLAME: wick, flame height and width to the shaft, lean (flames stand up in still air), flicker
    const fp = { wick: soft(Math.abs(g.wick - P.wickToLength), .05), height: soft(Math.abs(Math.log(Math.max(.01, g.flame) / P.flameToLength)), .15),
      width: soft(Math.abs(Math.log(g.fw / P.flameWidthToHeight)), .2), lean: soft(Math.abs(g.lean), 8), flicker: soft(Math.abs(g.flicker - P.flicker), .05) };
    const flame = (fp.wick + fp.height + fp.width + fp.lean + fp.flicker) / 5;
    const fit = (W.count * count + W.placing * placing + W.shaft * shaft + W.colour * colour + W.flame * flame) * (.5 + .5 * support);
    return { fit, parts: { count, n, placing, where, chamferR: chamfer, support, shaft, shaftParts: sp, colour, colourParts: cc, flame, flameParts: fp } };
  }
  const stages = [['COUNT', 'count', .99], ['PLACING', 'placing', .65], ['SHAFT', 'shaft', .85], ['COLOUR', 'colour', .8], ['FLAME', 'flame', .85]];
  // place 1..7 (first half of t), then light 1..7 (second half); with another count the candles share the same two halves evenly
  const making = []; for (let k = 0; k < 7; k++) making.push([`PLACE CANDLE ${k + 1}`, +(k / 14).toFixed(4), +((k + 1) / 14).toFixed(4)]);
  for (let k = 0; k < 7; k++) making.push([`LIGHT CANDLE ${k + 1}`, +(.5 + k / 14).toFixed(4), +(.5 + (k + 1) / 14).toFixed(4)]);
  /* ------------------------------------------------------------------ anchors (metres, origin = cake-top centre): wick k = where flame k sits */
  function anchors(G, opts) { const L = layout(G), g = L.g, sup = supportOf(opts && opts.refs, opts), o = { base: [0, 0, 0], centre: [0, 0, 0] };
    L.list.forEach(c => { const y0 = sup.surf(c.r) - g.depth; o['wick' + c.k] = [c.x, y0 + g.height + g.wick * g.height, c.z]; }); return o; }
  /* ------------------------------------------------------------------ build */
  function build(THREE, G, opts) {
    opts = opts || {}; const T = THREE, L = layout(G), g = L.g, n = L.n, sup = supportOf(opts.refs, opts), grp = new T.Group(); grp.name = 'candles';
    if (sup.y) grp.position.y = sup.y;
    const t = opts.t == null ? 1 : clamp(opts.t, 0, 1), time = opts.time || 0, blown = opts.blown | 0, rad = g.thick / 2, H = g.height;
    const mat = { cream: new T.MeshStandardMaterial({ color: new T.Color(g.cr, g.cg, g.cb), roughness: .55 }), red: new T.MeshStandardMaterial({ color: new T.Color(g.sr, g.sg, g.sb), roughness: .5 }),
      blue: new T.MeshStandardMaterial({ color: new T.Color(g.br, g.bg, g.bb), roughness: .5 }), wick: new T.MeshStandardMaterial({ color: 0x1b1612, roughness: .9 }) };
    const shaftGeo = new T.CylinderGeometry(rad, rad * 1.02, H, 16, 1);
    let lit = 0, match = null;
    L.list.forEach(c => {
      const pw = [c.k / n * .5, (c.k + 1) / n * .5], lw = [.5 + c.k / n * .5, .5 + (c.k + 1) / n * .5];
      const placed = clamp((t - pw[0]) / (pw[1] - pw[0]), 0, 1); if (placed <= 0) return;
      const cg = new T.Group(); cg.name = 'candle' + c.k; const y0 = sup.surf(c.r) - g.depth;
      cg.position.set(c.x, y0 + (1 - sst(0, 1, placed)) * .07, c.z); grp.add(cg);                                       // lowered into place from above
      const shaft = new T.Mesh(shaftGeo, mat.cream); shaft.position.y = H / 2; cg.add(shaft);
      if (c.kind !== 'cream' && g.turns >= .5) {                                                                        // the spiral stripe: a tube wound round the shaft
        const turns = g.turns, pts = [], steps = Math.max(24, Math.round(turns * 18));
        for (let i = 0; i <= steps; i++) { const u = i / steps, a = u * turns * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * rad, u * H * .98 + H * .01, Math.sin(a) * rad)); }
        const pitch = H / turns, tr = Math.min(rad * .28, pitch * .2), st = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), steps, tr, 5, false), mat[c.kind]); st.scale.set(1, 1, 1); cg.add(st); }
      const wl = Math.max(.0005, g.wick * H), wick = new T.Mesh(new T.CylinderGeometry(rad * .12, rad * .14, wl, 6), mat.wick); wick.position.y = H + wl / 2; cg.add(wick);
      const on = clamp((t - lw[0]) / (lw[1] - lw[0]), 0, 1);
      if (on > 0 && c.k >= blown && g.flame > .01) {
        if (on < 1) match = { c, y0: y0 + H + wl, on };
        const fh = g.flame * H * sst(0, .7, on) * (1 + g.flicker * (.6 * Math.sin(time * 13 + c.k * 1.7) + .4 * Math.sin(time * 31 + c.k * 4.1))), fwid = g.fw * fh;
        if (fh > 1e-4) { const prof = [], q = 14; for (let i = 0; i <= q; i++) { const s = i / q; prof.push(new T.Vector2(.5 * fwid * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), .75) * Math.pow(1 - s, .35) + 1e-5, s * fh)); }
          const fg = new T.Group(); fg.name = 'flame' + c.k; fg.userData.flame = true; fg.position.y = H + wl * .6; fg.rotation.z = -g.lean * D2R;
          const outer = new T.Mesh(new T.LatheGeometry(prof, 16), new T.MeshBasicMaterial({ color: new T.Color(1, .74, .36), transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false }));
          outer.name = 'flame'; outer.userData.flame = true; fg.add(outer);
          const core = new T.Mesh(new T.LatheGeometry(prof.map(p => new T.Vector2(p.x * .5, p.y * .62)), 12), new T.MeshBasicMaterial({ color: new T.Color(1, .97, .86) }));
          core.name = 'flame-core'; core.userData.flame = true; core.position.y = fh * .04; fg.add(core);
          const halo = new T.Mesh(new T.SphereGeometry(fh * .9, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(1, .6, .25), transparent: true, opacity: .12, blending: T.AdditiveBlending, depthWrite: false }));
          halo.name = 'halo'; halo.userData.flame = true; halo.position.y = fh * .45; fg.add(halo);
          cg.add(fg); lit++; } } });
    if (match && t < 1) {   // the match that lights them: a stick with its own flame, held to the wick
      const m = new T.Group(); m.name = 'match'; const stick = new T.Mesh(new T.CylinderGeometry(.0012, .0012, .045, 6), new T.MeshStandardMaterial({ color: 0xc9a46a, roughness: .8 }));
      stick.rotation.z = .9; stick.position.set(.017, .012, 0); m.add(stick); const head = new T.Mesh(new T.SphereGeometry(.0022, 8, 6), new T.MeshStandardMaterial({ color: 0x5a1a10 })); m.add(head);
      const mf = new T.Mesh(new T.SphereGeometry(.004, 8, 6), new T.MeshBasicMaterial({ color: new T.Color(1, .8, .4), transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
      mf.name = 'match-flame'; mf.scale.y = 1.8; mf.position.y = .004; m.add(mf);
      m.position.set(match.c.x + .006 * (1 - match.on), match.y0 + .002, match.c.z); grp.add(m); }
    if (opts.light && lit) { const pl = new T.PointLight(0xffb060, .25 * lit / 7, .9, 2); pl.position.set(0, H * 1.6, 0); pl.name = 'candlelight'; grp.add(pl); }
    grp.userData = { module: 'candles', t, placed: L.list.filter(c => t >= (c.k + 1) / n * .5).length, lit, anchors: anchors(G, opts) };
    return grp;
  }
  return { name: 'candles', genes, groups, stages, making, blank, evaluate, build, anchors, named, layout, refOf, supportOf, W };
});
