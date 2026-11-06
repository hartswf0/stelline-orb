/* modules/inscription.js — 生日快乐 and the film's Z flourish, piped in icing on the cake top. EVOLVE-ALL module (CONTRACT.md).
   Stroke model: 21 strokes (makemeahanzi / hanzi-writer-data medians, in their standard order) plus the flourish's 3 bars = 24 strokes.
   Every stroke is a 6-point polyline. Its points are made from the genome: a straight dash in the stroke's slot (the blank),
   bent toward the chord and then the median by the FORM genes, shaken by WOBBLE, then placed on the cake by the HAND genes
   (size, pitch, rotation, centre, slant, aspect, pressure). The flourish's 4 corners are their own genes (FLOURISH).
   The genome does not hold one free number per control point: with the host's (1 + lambda) breeder a 132-number point genome
   needed about 2000 generations to come close (measured with core/breed.js), so the points are derived from 25 genes instead.
   Fitness is measured against refs/inscription.json: stroke order and medians (font skeleton), the film's character centres,
   sizes, flourish corners and stroke width (frames 144.75-147.375 s), and the icing colour relative to the cake top.
   Units: metres; the module's origin is the cake-top centre (the host puts the group at the cake's 'top' anchor); +z faces the viewer.
   Node and browser (window.EVOMOD.inscription). No DOM; THREE only inside build(). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../refs/inscription.json'));   // node: refs bundled as the fallback
  else { root.EVOMOD = root.EVOMOD || {}; root.EVOMOD.inscription = factory(null); }                                   // browser: the host passes refs/inscription.json
})(this, function (BUNDLED) {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const soft = (e, s) => .5 * Math.exp(-e / s) + .5 * Math.exp(-(e / s) * (e / s));   // 1 at zero error; steep near the target, still sloped far away
  const D2R = Math.PI / 180, R_DEFAULT = .12, TOP_DEFAULT = [.95, .87, .72];   // cake-top radius and colour assumed until the cake module supplies them
  function hash(...xs) { let h = 2166136261; for (const x of xs) { h ^= (x | 0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const noise = (...k) => (hash(...k) % 100000) / 50000 - 1;   // deterministic, -1..1
  /* ------------------------------------------------------------------ genes: [key, group, min, max, default] (default = the finished film inscription, roughly) */
  const genes = [
    ['count', 'STROKES', 0, 1, 1], ['order', 'STROKES', 0, 1, 1],
    ['fSheng', 'FORM', 0, 1, 1], ['fRi', 'FORM', 0, 1, 1], ['fKuai', 'FORM', 0, 1, 1], ['fLe', 'FORM', 0, 1, 1], ['curve', 'FORM', 0, 1, 1], ['wobble', 'FORM', 0, 1, .01],
    ['size', 'HAND', .005, .06, .029], ['pitch', 'HAND', 0, .06, .0285], ['rot', 'HAND', -90, 90, -26.4], ['cx', 'HAND', -.1, .1, .029], ['cz', 'HAND', -.1, .1, .018],
    ['slant', 'HAND', -.6, .6, -.155], ['aspect', 'HAND', .6, 1.5, 1.045], ['pressure', 'HAND', .001, .012, .0049],
    ['fSpan', 'FLOURISH', .005, .15, .0885], ['fDrop', 'FLOURISH', 0, .06, .0253], ['fOff', 'FLOURISH', 0, .06, .003], ['fBack', 'FLOURISH', 0, 1, .29], ['fBot', 'FLOURISH', .005, .15, .0673],
    ['r', 'COLOUR', 0, 1, .744], ['g', 'COLOUR', 0, 1, .473], ['b', 'COLOUR', 0, 1, .188]];   // defaults: the best a long run (3000 generations) found, rounded
  const groups = ['STROKES', 'FORM', 'HAND', 'FLOURISH', 'COLOUR'];
  const GI = {}; genes.forEach((g, i) => GI[g[0]] = i);
  const named = G => { const o = {}; genes.forEach((g, i) => o[g[0]] = G[i]); return o; };
  const BLANK = { count: 0, order: 0, fSheng: 0, fRi: 0, fKuai: 0, fLe: 0, curve: 0, wobble: .5, size: .012, pitch: .012, rot: 0, cx: 0, cz: 0, slant: 0, aspect: 1, pressure: .002,
    fSpan: .03, fDrop: 0, fOff: .02, fBack: .5, fBot: .03, r: .95, g: .93, b: .9 };   // one dot of white icing; the flourish a straight dash
  function blank() { return Float64Array.from(genes.map(g => BLANK[g[0]])); }
  /* ------------------------------------------------------------------ references */
  function refOf(refs) { const r = refs && (refs.medians ? refs : refs.inscription && refs.inscription.medians ? refs.inscription : null); if (r || BUNDLED) return r || BUNDLED;
    throw new Error('inscription needs refs/inscription.json (pass it as refs)'); }
  function supportOf(refs, opts) {   // the cake top: radius R, dome drop, colour. Accepts cake anchors {top, rim}, or {y, r}, or nothing.
    const s = (opts && (opts.support || opts.cakeTop)) || (refs && (refs.support || refs.cakeTop)) || null; let R = R_DEFAULT, drop = 0, y = 0, col = TOP_DEFAULT;
    if (s) { if (s.rim) { R = s.rim[0]; drop = s.top ? Math.max(0, s.top[1] - s.rim[1]) : 0; } else if (s.r) R = s.r; if (s.y != null && !s.rim) y = s.y; if (s.topColour) col = s.topColour; }
    return { R, drop, y, col, surf: r => -drop * Math.pow(clamp(r / R, 0, 1.2), 2) };   // surface height at radius r, relative to the top centre (dome as a parabola)
  }
  /* the stroke table: canonical order, character, medians in the em box (-0.5..0.5, y down), and the film's timing per stroke */
  const CACHE = new WeakMap();
  function table(ref) {
    let t = CACHE.get(ref); if (t) return t;
    const strokes = []; ref.chars.forEach((ch, c) => ref.medians[ch].forEach((pts, s) => strokes.push({ c, s, ch, pts })));
    for (let s = 0; s < 3; s++) strokes.push({ c: 4, s, ch: 'FLOURISH', pts: null });
    const N = strokes.length, len = p => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };
    strokes.forEach(st => { if (!st.pts) return; let x = 0, y = 0; st.pts.forEach(p => { x += p[0]; y += p[1]; }); x /= st.pts.length; y /= st.pts.length;
      st.dash = st.pts.map((p, i) => [x + (i / (st.pts.length - 1) - .5) * .18, y]);                          // the blank: a short level dash in the stroke's slot
      st.chord = st.pts.map((p, i) => { const u = i / (st.pts.length - 1); return [lerp(st.pts[0][0], st.pts[st.pts.length - 1][0], u), lerp(st.pts[0][1], st.pts[st.pts.length - 1][1], u)]; });
      st.len = len(st.pts); });
    // timing: the film's window per character / flourish bar (measured); inside a character the window is shared by median length (not measured)
    const tm = ref.film.timing, T0 = tm.t0, T1 = tm.t1, nt = x => (x - T0) / (T1 - T0), win = [];
    ref.chars.forEach((ch, c) => { const ss = strokes.filter(st => st.c === c), tot = ss.reduce((a, st) => a + st.len, 0); let a = tm.chars[c][0];
      const span = tm.chars[c][1] - tm.chars[c][0]; ss.forEach(st => { const d = span * st.len / tot; win.push([nt(a + d * .15), nt(a + d)]); a += d; }); });
    tm.flourish.forEach(w => win.push([nt(w[0]), nt(w[1])]));
    const making = strokes.map((st, k) => [st.c < 4 ? `WRITE ${st.ch} STROKE ${st.s + 1}` : `FLOURISH ${st.s + 1}`, +win[k][0].toFixed(4), +win[k][1].toFixed(4)]);
    const scramble = strokes.map((_, k) => k).sort((a, b) => hash(a, 77) - hash(b, 77));                        // a fixed shuffle: what order 0 writes
    const rank = new Array(N); scramble.forEach((k, i) => rank[k] = i);
    t = { strokes, N, making, rank }; CACHE.set(ref, t); return t;
  }
  /* ------------------------------------------------------------------ geometry: genome -> strokes in em (form) and on the cake (metres, x right, z toward the viewer) */
  const FKEYS = ['fSheng', 'fRi', 'fKuai', 'fLe'];
  function nWritten(g, N) { return 1 + Math.round(clamp(g.count, 0, 1) * (N - 1)); }
  function writeOrder(g, tb) { const o = clamp(g.order, 0, 1); return tb.strokes.map((_, k) => k).sort((a, b) => (k => o * k + (1 - o) * tb.rank[k])(a) - (k => o * k + (1 - o) * tb.rank[k])(b) || a - b); }
  function emStroke(g, st, k) { const f = clamp(g[FKEYS[st.c]], 0, 1), cu = clamp(g.curve, 0, 1), w = clamp(g.wobble, 0, 1) * .06;
    return st.pts.map((p, i) => { const tx = lerp(st.chord[i][0], p[0], cu), ty = lerp(st.chord[i][1], p[1], cu);
      return [lerp(st.dash[i][0], tx, f) + w * noise(k, i, 1), lerp(st.dash[i][1], ty, f) + w * noise(k, i, 2)]; }); }
  function place(g, x, y) {   // text frame (x along the baseline, y down-page) -> cake top (metres)
    const a = g.rot * D2R, c = Math.cos(a), s = Math.sin(a); return [g.cx + x * c - y * s, g.cz + x * s + y * c]; }
  function flourishCorners(g) { const x0 = -g.fSpan / 2 - g.pitch * .1; return [[x0, g.fOff + g.size * .5], [x0 + g.fSpan, g.fOff + g.size * .5],
    [x0 + g.fBack * g.fSpan, g.fOff + g.size * .5 + g.fDrop], [x0 + g.fBack * g.fSpan + g.fBot, g.fOff + g.size * .5 + g.fDrop]]; }
  function geometry(G, ref) {
    const g = G.length ? named(G) : G, tb = table(ref), out = [];
    tb.strokes.forEach((st, k) => {
      if (st.c < 4) { const em = emStroke(g, st, k), xc = (st.c - 1.5) * g.pitch;
        out.push({ k, c: st.c, em, pts: em.map(([X, Y]) => place(g, xc + (X * g.aspect - g.slant * Y) * g.size, Y * g.size)) }); }
      else { const F = flourishCorners(g), a = F[st.s], b = F[st.s + 1], w = clamp(g.wobble, 0, 1) * .06 * g.size;
        out.push({ k, c: 4, pts: [0, 1, 2, 3, 4, 5].map(i => { const u = i / 5; return place(g, lerp(a[0], b[0], u) + w * noise(k, i, 1), lerp(a[1], b[1], u) + w * noise(k, i, 2)); }) }); } });
    return { g, tb, strokes: out };
  }
  /* ------------------------------------------------------------------ fitness */
  const W = { strokes: .1, form: .3, hand: .3, flourish: .15, colour: .15 };
  const SC = { form: .05, centre: .08, size: .25, width: .35, flourish: .08, colour: .1 };   // tolerance scales (em; cake-top radii R; log ratio; RGB 0..1)
  function evaluate(G, refs) {
    const ref = refOf(refs), sup = supportOf(refs), R = sup.R, geo = geometry(G, ref), g = geo.g, tb = geo.tb, N = tb.N;
    // STROKES: how many strokes are written, and in what order (fraction of stroke pairs in the standard order)
    const n = nWritten(g, N), order = writeOrder(g, tb), pos = new Array(N); order.forEach((k, i) => pos[k] = i);
    let conc = 0, pairs = 0; for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) { pairs++; if (pos[a] < pos[b]) conc++; }
    const countS = 1 - Math.abs(n - N) / (N - 1), orderS = conc / pairs, strokes = .5 * countS + .5 * orderS;
    // FORM: each character's strokes against the font medians, in the em box (placement does not count here)
    const dC = [0, 0, 0, 0], nC = [0, 0, 0, 0];
    geo.strokes.forEach(s => { if (s.c > 3) return; const st = tb.strokes[s.k]; s.em.forEach((p, i) => { dC[s.c] += Math.hypot(p[0] - st.pts[i][0], p[1] - st.pts[i][1]); nC[s.c]++; }); });
    const formC = dC.map((d, c) => soft(d / nC[c], SC.form)), form = formC.reduce((a, b) => a + b, 0) / 4;
    // HAND: where the film's hand put each character on the cake top, how big, how thick the line (all in units of the top radius R)
    const film = ref.film; let eC = 0, eS = 0;
    for (let c = 0; c < 4; c++) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, sx = 0, sz = 0, m = 0;
      geo.strokes.forEach(s => { if (s.c !== c) return; s.pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); sx += p[0]; sz += p[1]; m++; }); });
      const fc = film.chars[c], pw = g.pressure; eC += Math.hypot(sx / m / R - fc.centre[0], sz / m / R - fc.centre[1]);
      eS += Math.abs(Math.log(Math.sqrt(((x1 - x0 + pw) / R) * ((z1 - z0 + pw) / R)) / Math.sqrt(fc.w * fc.h))); }
    const handC = soft(eC / 4, SC.centre), handS = soft(eS / 4, SC.size), handW = soft(Math.abs(Math.log(g.pressure / R / film.strokeWidth)), SC.width);
    const hand = .6 * handC + .3 * handS + .1 * handW;
    // FLOURISH: the Z's four corners against the film's
    const FC = flourishCorners(g).map(p => place(g, p[0], p[1])); let eF = 0; FC.forEach((p, i) => eF += Math.hypot(p[0] / R - film.flourish[i][0], p[1] / R - film.flourish[i][1]));
    const flourish = soft(eF / 4, SC.flourish);
    // COLOUR: the icing against the cake top, per channel, as the film shows it (icing / top)
    const tgt = film.icingRel.map((v, i) => clamp(v * sup.col[i], 0, 1)), colour = soft(Math.hypot(g.r - tgt[0], g.g - tgt[1], g.b - tgt[2]), SC.colour);
    // SUPPORT: every piped point on the cake top, inside the rim (a bead that runs off the edge fails)
    let inside = 0, tot = 0; geo.strokes.forEach(s => s.pts.forEach(p => { tot++; const r = Math.hypot(p[0], p[1]) + g.pressure / 2; inside += clamp(1 - (r - .96 * R) / (.04 * R), 0, 1); }));
    const support = inside / tot;
    const fit = (W.strokes * strokes + W.form * form + W.hand * hand + W.flourish * flourish + W.colour * colour) * (.5 + .5 * support);
    return { fit, parts: { strokes, count: countS, order: orderS, n, form, formChars: formC, hand, handCentre: handC, handSize: handS, handWidth: handW, flourish, colour, support,
      errCentreR: eC / 4, errFlourishR: eF / 4 } };
  }
  const stages = [['STROKES', 'strokes', .95], ['FORM', 'form', .85], ['HAND', 'hand', .8], ['FLOURISH', 'flourish', .75], ['COLOUR', 'fit', .85]];
  /* one step per stroke, in the film's order and timing (t = 0 at 144.80 s, t = 1 at 147.30 s). Written out so the browser has it before refs load;
     tests/inscription.test.js checks it equals what table(refs) computes from refs/inscription.json. */
  const making = [["WRITE 生 STROKE 1",0.0043,0.0284],["WRITE 生 STROKE 2",0.0335,0.0627],["WRITE 生 STROKE 3",0.0671,0.0918],["WRITE 生 STROKE 4",0.1006,0.15],["WRITE 生 STROKE 5",0.1593,0.212],
    ["WRITE 日 STROKE 1",0.2181,0.2528],["WRITE 日 STROKE 2",0.2619,0.3138],["WRITE 日 STROKE 3",0.316,0.3286],["WRITE 日 STROKE 4",0.3315,0.348],
    ["WRITE 快 STROKE 1",0.3498,0.3597],["WRITE 快 STROKE 2",0.3608,0.3674],["WRITE 快 STROKE 3",0.3754,0.4208],["WRITE 快 STROKE 4",0.4256,0.4533],["WRITE 快 STROKE 5",0.4589,0.4905],["WRITE 快 STROKE 6",0.4989,0.5468],["WRITE 快 STROKE 7",0.5517,0.58],
    ["WRITE 乐 STROKE 1",0.6006,0.6265],["WRITE 乐 STROKE 2",0.6357,0.6882],["WRITE 乐 STROKE 3",0.6964,0.743],["WRITE 乐 STROKE 4",0.7454,0.7592],["WRITE 乐 STROKE 5",0.7623,0.78],
    ["FLOURISH 1",0.796,0.856],["FLOURISH 2",0.856,0.932],["FLOURISH 3",0.932,0.996]];
  /* ------------------------------------------------------------------ anchors (metres, origin = cake-top centre) */
  function anchors(G, opts) { const geo = geometry(G, refOf(opts && opts.refs)), sup = supportOf(null, opts), g = geo.g, y = p => sup.surf(Math.hypot(p[0], p[1]));
    const first = geo.strokes[writeOrder(g, geo.tb)[0]].pts[0], F = geo.strokes[geo.strokes.length - 1].pts, last = F[F.length - 1];
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; geo.strokes.forEach(s => s.pts.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }));
    return { base: [0, 0, 0], centre: [g.cx, y([g.cx, g.cz]), g.cz], start: [first[0], y(first), first[1]], end: [last[0], y(last), last[1]],
      boxMin: [x0, 0, z0], boxMax: [x1, 0, z1] }; }
  /* ------------------------------------------------------------------ build: piped icing tubes on the top; opts.t writes stroke by stroke in the film's timing */
  function build(THREE, G, opts) {
    opts = opts || {}; const T = THREE, ref = refOf(opts.refs), geo = geometry(G, ref), g = geo.g, tb = geo.tb, sup = supportOf(opts.refs, opts), grp = new T.Group(); grp.name = 'inscription';
    if (sup.y) grp.position.y = sup.y;
    // the host hangs this part on the cake's 'inscription' anchor; the geometry here is about the cake-top centre, so step back by (top - inscription)
    const S = opts.support; if (S && Array.isArray(S.top) && Array.isArray(S.inscription)) grp.position.set(S.top[0] - S.inscription[0], S.top[1] - S.inscription[1], S.top[2] - S.inscription[2]);
    const t = opts.t == null ? 1 : clamp(opts.t, 0, 1), n = nWritten(g, tb.N), order = writeOrder(g, tb).slice(0, n);
    const rad = g.pressure / 2, mat = new T.MeshStandardMaterial({ color: new T.Color(clamp(g.r, 0, 1), clamp(g.g, 0, 1), clamp(g.b, 0, 1)), roughness: .38, metalness: 0 });
    const prof = s => 1 + .35 * Math.exp(-Math.pow(s / .08, 2)) - .4 * sst(.72, 1, s);       // piped bead: a blob where the tip lands, thinning as it lifts
    let pen = null;
    order.forEach((k, q) => {
      const win = tb.making[q], f = clamp((t - win[1]) / Math.max(1e-6, win[2] - win[1]), 0, 1); if (f <= 0) return;
      const P = geo.strokes[k].pts.map(p => new T.Vector3(p[0], sup.surf(Math.hypot(p[0], p[1])) + rad * .55, p[1]));
      let curve = new T.CatmullRomCurve3(P, false, 'centripetal');
      if (f < 1) { const sub = []; for (let i = 0; i <= 8; i++) sub.push(curve.getPointAt(f * i / 8)); curve = new T.CatmullRomCurve3(sub, false, 'centripetal'); pen = sub[8]; }
      const segs = Math.max(6, Math.round(28 * f)), radial = 8, tube = new T.TubeGeometry(curve, segs, rad, radial, false), pa = tube.attributes.position, v = new T.Vector3();
      for (let i = 0; i <= segs; i++) { const c = curve.getPointAt(i / segs), sc = prof(f * i / segs) * (i === segs && f < 1 ? 1 : 1);
        for (let j = 0; j <= radial; j++) { const id = i * (radial + 1) + j; v.fromBufferAttribute(pa, id).sub(c).multiplyScalar(sc); v.y *= .62; v.add(c); pa.setXYZ(id, v.x, v.y, v.z); } }
      tube.computeVertexNormals(); const mesh = new T.Mesh(tube, mat); mesh.userData = { stroke: k, step: q }; grp.add(mesh);
      const cap = new T.Mesh(new T.SphereGeometry(rad * 1.3, 10, 8), mat); cap.position.copy(P[0]); cap.scale.y = .62; grp.add(cap);
      if (f === 1) { const end = new T.Mesh(new T.SphereGeometry(rad * .62, 8, 6), mat); end.position.copy(curve.getPointAt(1)); end.scale.y = .62; grp.add(end); } });
    if (pen && t < 1) { const tip = new T.Mesh(new T.ConeGeometry(rad * 2.2, rad * 7, 12, 1, true), new T.MeshStandardMaterial({ color: 0xd8d6d0, roughness: .3, metalness: .6, side: T.DoubleSide }));
      tip.rotation.x = Math.PI; tip.position.set(pen.x, pen.y + rad * 4.2, pen.z); tip.name = 'piping-tip'; grp.add(tip); }
    grp.userData = { module: 'inscription', t, written: order.filter((k, q) => t >= tb.making[q][2]).length, anchors: anchors(G, opts) };
    return grp;
  }
  return { name: 'inscription', genes, groups, stages, making, blank, evaluate, build, anchors,
    named, geometry, table: refs => table(refOf(refs)), refOf, supportOf, W, SC };
});
