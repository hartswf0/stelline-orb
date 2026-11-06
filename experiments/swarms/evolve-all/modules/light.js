/* modules/light.js — EVOLVE-ALL evolver module: the memory's light.
   Candle warmth and falloff, the dark dome (ambient falling off away from the table, the thin bright band), the ambient level, the colour grade
   (exposure, true-black point, display gamma, white balance), and the projected-spot screen density of the memory switching on and off.
   Blank: one dim white light in a dim grey room.
   Fitness (node-safe): a small synthetic frame of the party (camera, hexagonal-table disc, cake, three figures, floor, dome wall and band, the flame)
   is shaded by the genome's lights and graded; its luminance and colour statistics are compared with the film's (refs/light.json: luma percentiles,
   black fraction, mean, mean luma in rings around the candle, colour of highlights and of shadows, five party frames).
   The SPOT genes are not measured by this fitness (the film statistics are of frames with the memory on); they pass to the host unchanged.
   build(THREE, G, opts) returns a THREE.Group of lights; group.userData.params (also params(G)) is what the host applies to its grade/shader.
   Plain JS, UMD: node module.exports or window.EVOMOD.light. */
(function (root, factory) { const M = factory(); if (typeof module === 'object' && module.exports) module.exports = M; else { root.EVOMOD = root.EVOMOD || {}; root.EVOMOD.light = M; } })(this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const cauchy = (d, tol) => 1 / (1 + (d / tol) * (d / tol));
  const genes = [
    ['kelvin', 'CANDLE', 1000, 6500, 6500], ['yellow', 'CANDLE', 0, 1, 0], ['candleI', 'CANDLE', 0, 8, .3], ['range', 'CANDLE', .1, 3, 1], ['decay', 'CANDLE', .5, 4, 2],
    ['domeFall', 'DOME', 0, 3, 0], ['bandI', 'DOME', 0, 3, 0],
    ['amb', 'AMBIENT', 0, 1, .08], ['ambWarm', 'AMBIENT', -1, 1, 0],
    ['exposure', 'GRADE', .2, 4, 1], ['black', 'GRADE', 0, .2, 0], ['gamma', 'GRADE', 1.6, 3, 2.2], ['warmth', 'GRADE', -1, 1, 0],
    ['spotDensity', 'SPOT', 0, 1, .5], ['spotSize', 'SPOT', .2, 3, 1], ['spotDecay', 'SPOT', .05, 1.5, .35]];
  const groups = ['CANDLE', 'DOME', 'AMBIENT', 'GRADE', 'SPOT'];
  const stages = [['CANDLE', 'hiC', .85], ['DOME', 'falloff', .6], ['AMBIENT', 'level', .7], ['GRADE', 'fit', .72]];
  const making = [['dark', 0, .2], ['match struck', .2, .4], ['candle light grows', .4, .8], ['grade settles', .8, 1]];
  const blank = () => Float64Array.from(genes.map(g => g[4]));
  const named = G => { const o = {}; genes.forEach((g, i) => o[g[0]] = G[i]); return o; };
  /* black-body colour of a temperature (Tanner Helland's fit), normalised to its largest channel, linear-ish 0..1 */
  function kelvinRGB(K) { const t = K / 100; let r, g, b;
    r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -.1332047592); g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -.0755148492);
    b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307; const c = [r, g, b].map(v => clamp(v, 0, 255) / 255), m = Math.max(...c); return c.map(v => Math.pow(v / m, 2.2)); }
  /* ------------------------------------------------------------------ the synthetic party frame: geometry is fixed, cast once */
  const FW = 64, FH = 36, CAM = [0, .75, 1.1], LOOK = [0, .45, 0], FOV = 38, CANDLE_P = [0, .6, 0], TY = .43;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrm = a => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  let SCENE = null;
  function scene() { if (SCENE) return SCENE; const fw = nrm(sub(LOOK, CAM)), rt = nrm(crs(fw, [0, 1, 0])), up = crs(rt, fw), th = Math.tan(FOV * Math.PI / 360), asp = FW / FH;
    const KIDS = [-45, 0, 45].map(a => [Math.sin(a * Math.PI / 180) * .4, -Math.cos(a * Math.PI / 180) * .4]);
    const px = []; for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const u = ((x + .5) / FW * 2 - 1) * th * asp, v = (1 - (y + .5) / FH * 2) * th, d = nrm([fw[0] + rt[0] * u + up[0] * v, fw[1] + rt[1] * u + up[1] * v, fw[2] + rt[2] * u + up[2] * v]);
      let best = { t: 1e9 }; const hit = (t, n, alb, kind, em) => { if (t > 1e-4 && t < best.t) best = { t, n, alb, kind, em: em || 0 }; };
      // dome wall (sphere r 3.2 about the origin, seen from inside), with the thin band at y 0.86-0.9
      { const b = dot(CAM, d), c = dot(CAM, CAM) - 3.2 * 3.2, t = -b + Math.sqrt(b * b - c), p = [CAM[0] + d[0] * t, CAM[1] + d[1] * t, CAM[2] + d[2] * t]; hit(t, nrm([-p[0], -p[1], -p[2]]), [.13, .13, .12], p[1] > .86 && p[1] < .92 ? 'band' : 'dome'); }
      if (d[1] < 0) { const t = -CAM[1] / d[1]; hit(t, [0, 1, 0], [.05, .05, .05], 'floor'); }
      if (d[1] < 0) { const t = (TY - CAM[1]) / d[1], p = [CAM[0] + d[0] * t, TY, CAM[2] + d[2] * t]; if (Math.hypot(p[0], p[2]) < .34) hit(t, [0, 1, 0], [.72, .69, .45], 'table'); }
      // the cake: a cylinder r 0.12 from the table top to 0.55, with its top
      { const a = d[0] * d[0] + d[2] * d[2], b = CAM[0] * d[0] + CAM[2] * d[2], c = CAM[0] * CAM[0] + CAM[2] * CAM[2] - .0144, q = b * b - a * c;
        if (q > 0) { const t = (-b - Math.sqrt(q)) / a, y = CAM[1] + d[1] * t; if (y > TY && y < .55) hit(t, nrm([CAM[0] + d[0] * t, 0, CAM[2] + d[2] * t]), [.75, .65, .45], 'cake'); }
        if (d[1] < 0) { const t = (.55 - CAM[1]) / d[1], p = [CAM[0] + d[0] * t, CAM[2] + d[2] * t]; if (Math.hypot(p[0], p[1]) < .12) hit(t, [0, 1, 0], [.8, .72, .55], 'cake'); } }
      // three figures behind the table: a body (vertical cylinder r 0.1, 0-0.62) and a head (sphere r 0.075 at 0.71)
      KIDS.forEach(([kx, kz]) => { const ox = CAM[0] - kx, oz = CAM[2] - kz, a = d[0] * d[0] + d[2] * d[2], b = ox * d[0] + oz * d[2], c = ox * ox + oz * oz - .01, q = b * b - a * c;
        if (q > 0) { const t = (-b - Math.sqrt(q)) / a, y = CAM[1] + d[1] * t; if (y > 0 && y < .62) hit(t, nrm([ox + d[0] * t, 0, oz + d[2] * t]), [.45, .38, .28], 'figure'); }
        const o = [CAM[0] - kx, CAM[1] - .71, CAM[2] - kz], bb = dot(o, d), cc = dot(o, o) - .075 * .075, qq = bb * bb - cc; if (qq > 0) { const t = -bb - Math.sqrt(qq); hit(t, nrm([o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t]), [.4, .32, .25], 'figure'); } });
      // the flame
      { const o = sub(CAM, CANDLE_P), bb = dot(o, d), cc = dot(o, o) - .014 * .014, qq = bb * bb - cc; if (qq > 0) hit(-bb - Math.sqrt(qq), [0, 0, 1], [0, 0, 0], 'flame'); }
      const p = [CAM[0] + d[0] * best.t, CAM[1] + d[1] * best.t, CAM[2] + d[2] * best.t]; px.push({ p, n: best.n, alb: best.alb, kind: best.kind }); }
    // the candle on screen, and each pixel's distance from it in frame widths
    const cp = sub(CANDLE_P, CAM), z = dot(cp, fw), cx = (dot(cp, rt) / z / (th * asp) + 1) / 2 * FW, cy = (1 - dot(cp, up) / z / th) / 2 * FH;
    px.forEach((q, i) => { const x = i % FW + .5, y = Math.floor(i / FW) + .5; q.r = Math.hypot(x - cx, y - cy) / FW; });
    SCENE = { px, candle: [cx / FW, cy / FH] }; return SCENE; }
  /* ------------------------------------------------------------------ shade and grade one frame; returns sRGB 0..255 per pixel */
  function params(G) { const g = named(G), wb = [1 + .12 * g.warmth, 1, 1 - .3 * g.warmth];
    const kc = kelvinRGB(g.kelvin); kc[2] *= 1 - .8 * g.yellow;   // the flame reads more yellow than a black body (less blue)
    return { candleRGB: kc, candleIntensity: g.candleI, candleRange: g.range, candleDecay: g.decay, ambient: g.amb, ambientRGB: [1 + .3 * g.ambWarm, 1, 1 - .85 * g.ambWarm].map(v => clamp(v, 0, 2)),
      domeFalloff: g.domeFall, domeBand: g.bandI, exposure: g.exposure, blackPoint: g.black, gamma: g.gamma, warmth: g.warmth, whiteBalance: wb,
      spotDensity: g.spotDensity, spotSize: g.spotSize, spotDecay: g.spotDecay }; }
  function render(G) { const S = scene(), P = params(G), out = new Float64Array(S.px.length * 3), cc = P.candleRGB, ac = P.ambientRGB;
    S.px.forEach((q, i) => { let c;
      if (q.kind === 'flame') c = cc.map(v => (2 + 4 * v) * P.candleIntensity);
      else { const v = sub(CANDLE_P, q.p), d = Math.hypot(v[0], v[1], v[2]), ndl = Math.max(0, dot(q.n, v) / d), att = P.candleIntensity / (1 + Math.pow(d / P.candleRange, P.candleDecay));
        const domeK = Math.exp(-P.domeFalloff * Math.hypot(q.p[0], q.p[2]));   // the dome darkens away from the table
        c = q.alb.map((a, k) => a * (cc[k] * ndl * att + P.ambient * ac[k] * domeK)); if (q.kind === 'band') c = c.map((x, k) => x + P.domeBand * [.85, .9, .88][k]); }
      for (let k = 0; k < 3; k++) { let x = c[k] * P.exposure * P.whiteBalance[k]; x = Math.max(0, x - P.blackPoint) / (1 - P.blackPoint); x = x * (1 + x / 4) / (1 + x);   // a soft shoulder (Reinhard, white at 2)
        out[i * 3 + k] = 255 * Math.pow(clamp(x, 0, 1), 1 / P.gamma); } });
    return out; }
  const RING = [0, .05, .1, .2, .3, .45, .7];
  function stats(img) { const S = scene(), n = S.px.length, L = new Float64Array(n); for (let i = 0; i < n; i++) L[i] = .2126 * img[i * 3] + .7152 * img[i * 3 + 1] + .0722 * img[i * 3 + 2];
    const sorted = Array.from(L).sort((a, b) => a - b), q = p => sorted[Math.min(n - 1, Math.floor(p * n))];
    const rs = RING.slice(1).map(() => [0, 0]), hi = [0, 0, 0, 0], sh = [0, 0, 0, 0]; let blackN = 0, sum = 0;
    for (let i = 0; i < n; i++) { const l = L[i]; sum += l; if (l < 8) blackN++; const r = S.px[i].r; for (let k = 0; k < rs.length; k++) if (r >= RING[k] && r < RING[k + 1]) { rs[k][0] += l; rs[k][1]++; }
      const acc = l > 120 ? hi : l > 8 && l < 40 ? sh : null; if (acc) { acc[0] += img[i * 3]; acc[1] += img[i * 3 + 1]; acc[2] += img[i * 3 + 2]; acc[3]++; } }
    const avg = a => a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : null;
    return { pct: [q(.1), q(.5), q(.9), q(.99)], black: blackN / n, mean: sum / n, rings: rs.map(([s, c]) => c ? s / c : 0), hiRGB: avg(hi), shRGB: avg(sh) }; }
  /* ------------------------------------------------------------------ fitness */
  function R_(refs) { return refs && refs.light ? refs.light : refs; }
  function evaluate(G, refs) { const r = R_(refs), s = stats(render(G)), sq = v => Math.sqrt(Math.max(0, v) / 255);
    const ePct = s.pct.reduce((a, v, k) => a + Math.abs(sq(v) - sq(r.pct[k])), 0) / 4, eMean = Math.abs(sq(s.mean) - sq(r.mean)), eBlack = Math.abs(s.black - r.black);
    const level = cauchy(ePct, .04) * cauchy(eMean, .04) * cauchy(eBlack, .1);
    const eRing = s.rings.reduce((a, v, k) => a + Math.abs(Math.log((v + 2) / (r.rings[k] + 2))), 0) / s.rings.length, falloff = cauchy(eRing, .18);
    const chroma = c => c ? [c[0] / Math.max(1, c[1]), c[2] / Math.max(1, c[1])] : [1, 1];   // red over green and blue over green: the warmth independent of the level
    const h = chroma(s.hiRGB), hr = chroma(r.hiRGB), d = chroma(s.shRGB), dr = chroma(r.shRGB);
    const hiC = cauchy(Math.abs(h[0] - hr[0]) + Math.abs(h[1] - hr[1]), .12) * (s.hiRGB ? 1 : .5), shC = cauchy(Math.abs(d[0] - dr[0]) + Math.abs(d[1] - dr[1]), .25) * (s.shRGB ? 1 : .5), colour = hiC * (.5 + .5 * shC);
    const fit = .35 * level + .35 * falloff + .3 * colour;
    return { fit, parts: { level, falloff, colour, hiC, shC, pct: s.pct, black: s.black, mean: s.mean, rings: s.rings, hiRGB: s.hiRGB, shRGB: s.shRGB } }; }
  /* ------------------------------------------------------------------ anchors: where the light sits (the candle flame centre the scene is lit from) */
  function anchors(G) { return { candle: CANDLE_P.slice(), domeCentre: [0, 0, 0] }; }
  /* ------------------------------------------------------------------ build: the lights; opts.t = how far made (dark, the match, the candle light grows, the grade settles) */
  function build(THREE, G, opts) { opts = opts || {}; const t = opts.t == null ? 1 : clamp(opts.t, 0, 1), P = params(G), root = new THREE.Group(); root.name = 'light';
    const ph = (a, b) => clamp((t - a) / (b - a), 0, 1), match = ph(.2, .4), grow = ph(.4, .8), settle = ph(.8, 1);
    const cc = new THREE.Color(...P.candleRGB.map(v => Math.pow(v, 1 / 2.2))), at = opts.candle || CANDLE_P;
    const candle = new THREE.PointLight(cc, P.candleIntensity * (.15 * Math.sin(match * Math.PI) + grow), P.candleRange * 4, P.candleDecay); candle.position.set(at[0], at[1], at[2]); candle.name = 'candle'; root.add(candle);
    const ac = new THREE.Color(...P.ambientRGB.map(v => clamp(v * .5, 0, 1))), hemi = new THREE.HemisphereLight(ac, new THREE.Color(.02, .018, .015), P.ambient * grow); hemi.name = 'ambient'; root.add(hemi);
    const graded = { exposure: lerp(1, P.exposure, settle), blackPoint: P.blackPoint * settle, gamma: lerp(2.2, P.gamma, settle), warmth: P.warmth * settle,
      whiteBalance: P.whiteBalance.map(v => lerp(1, v, settle)) };
    root.userData = { module: 'light', t, params: Object.assign({}, P, graded, { madeStep: t < .2 ? 'dark' : t < .4 ? 'match struck' : t < .8 ? 'candle light grows' : 'grade settles' }) };
    return root; }
  return { name: 'light', genes, groups, stages, making, blank, evaluate, build, anchors, params, render, stats, kelvinRGB, FRAME: [FW, FH] };
});
