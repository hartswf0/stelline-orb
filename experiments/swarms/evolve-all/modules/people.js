/* modules/people.js — EVOLVE-ALL evolver module: the children at the party, faceless.
   No facial features of any kind and no face data: a head is a smooth form under a hair mass (crown, back, fringe, side curtains),
   bent toward the cake; the figures are meant to read as children at a distance or from behind.
   Genome (22 genes, one group of children): PLACE (how many, the arc they stand on, its centre, distance from the edge),
   FIGURE (height, head size, shoulders, how much the children differ, lean, head bend, share with hands on the table edge, free-hand lift,
   hands together), CLOTHING (clothing lightness, spread light-to-dark across the group, warmth, share in dresses, party hats, hair length,
   volume, tone, tone spread). Each child is derived from these by a fixed per-child offset table, so the group varies without a gene per child.
   Blank: three grey posts standing at one spot inside the table.
   Fitness (node-safe): place = support (feet on the floor, clear of the table and of each other, no hand inside the table) x placement
   (the far half, spaced, close to the edge: 155 s and 214 s); figure (height to table, child proportions, lean, head bend, hands on the edge
   for about two of three as at 155 s, the children differ); palette (clothing and hair as the candle shows them, matched by brightness
   quantile; refs/people.json).
   The table comes in refs.support ({y, rOut, sides, stretch, yaw, warp} or {y, verts}); table.top(G) gives it. Default: the film's table.
   Plain JS, UMD: node module.exports or window.EVOMOD.people. */
(function (root, factory) { const M = factory(); if (typeof module === 'object' && module.exports) module.exports = M; else { root.EVOMOD = root.EVOMOD || {}; root.EVOMOD.people = M; } })(this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, D2R = Math.PI / 180;
  const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const cauchy = (d, tol) => 1 / (1 + (d / tol) * (d / tol));
  const logScore = (v, target, tol) => cauchy(Math.log(Math.max(1e-6, v) / target), tol);
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const MAX = 5, CANDLE = [1, .70, .22], GAIN = .7, HAIR_DARK = [.05, .04, .025], HAIR_FAIR = [.8, .62, .34];
  /* [key, group, min, max, blank] */
  const genes = [
    ['count', 'PLACE', 3, 5, 3], ['arc', 'PLACE', 0, 170, 0], ['centre', 'PLACE', -40, 40, 0], ['dist', 'PLACE', -.2, .3, -.15],
    ['height', 'FIGURE', .45, 1.1, .55], ['head', 'FIGURE', .14, .26, .2], ['shoulders', 'FIGURE', .16, .32, .2], ['variety', 'FIGURE', 0, 1, 0],
    ['lean', 'FIGURE', -5, 25, 0], ['tilt', 'FIGURE', -10, 40, 0], ['onTable', 'FIGURE', 0, 1, 0], ['freeLift', 'FIGURE', 0, 1, 0], ['together', 'FIGURE', 0, 1, 0],
    ['clothLum', 'CLOTHING', .1, 1, .5], ['clothSpread', 'CLOTHING', 0, 1, 0], ['clothWarm', 'CLOTHING', 0, 1, 0], ['dress', 'CLOTHING', 0, 1, 0], ['hat', 'CLOTHING', 0, 1, 0],
    ['hairLen', 'CLOTHING', 0, 1, 0], ['hairVol', 'CLOTHING', 0, 1, 0], ['hairTone', 'CLOTHING', 0, 1, .5], ['hairSpread', 'CLOTHING', 0, 1, 0]];
  const groups = ['PLACE', 'FIGURE', 'CLOTHING'];
  const stages = [['PLACE', 'place', .8], ['FIGURE', 'figure', .8], ['CLOTHING', 'palette', .76]];
  const making = [['legs rise from the floor', 0, .2], ['body', .2, .4], ['arms', .4, .5], ['head', .5, .6], ['hair mass', .6, .75], ['clothing wraps on', .75, 1]];
  const blank = () => Float64Array.from(genes.map(g => g[4]));
  const named = G => { const o = {}; genes.forEach((g, i) => o[g[0]] = G[i]); return o; };
  const count = G => Math.round(clamp(G[0], 3, 5));
  /* fixed per-child offsets (-1..1): height, lightness rank, hair, bend, hip sway */
  const OFF = [[.35, .9, -.6, .4, .5], [-.7, -.2, .8, -.3, -.4], [.9, -.9, -.1, .1, .2], [-.25, .45, .4, -.6, -.6], [.6, -.55, -.9, .7, .3]];
  /* ------------------------------------------------------------------ the table they stand at */
  const DEFAULT_SUPPORT = { y: .43, rOut: .33, sides: 6, stretch: 1.05, yaw: 0, warp: .3 };
  function supportOf(refs) { const s = (refs && refs.support) || DEFAULT_SUPPORT; if (s.verts) return s; const n = Math.round(s.sides || 6), verts = [];
    for (let i = 0; i < n; i++) { const b = i / n * Math.PI * 2, a = (s.yaw || 0) * D2R + b - (s.warp || 0) * Math.sin(2 * b) / 2; verts.push([Math.cos(a) * s.rOut * (s.stretch || 1), Math.sin(a) * s.rOut]); }
    return Object.assign({}, s, { verts }); }
  function edgeAlong(S, dx, dz) { let best = 1e9; const V = S.verts;
    for (let i = 0; i < V.length; i++) { const [x1, z1] = V[i], [x2, z2] = V[(i + 1) % V.length], ex = x2 - x1, ez = z2 - z1, den = dx * ez - dz * ex; if (Math.abs(den) < 1e-12) continue;
      const s = (x1 * ez - z1 * ex) / den, u = (x1 * dz - z1 * dx) / den; if (s > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, s); } return best; }
  function inside(S, x, z) { let ins = false; const V = S.verts; for (let i = 0, j = V.length - 1; i < V.length; j = i++) { const [xi, zi] = V[i], [xj, zj] = V[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; }
  function rimDist(S, x, z) { let best = 1e9; const V = S.verts; for (let i = 0; i < V.length; i++) { const a = V[i], b = V[(i + 1) % V.length], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez;
      const u = l2 ? clamp(((x - a[0]) * ex + (z - a[1]) * ez) / l2, 0, 1) : 0; best = Math.min(best, Math.hypot(x - a[0] - u * ex, z - a[1] - u * ez)); } return best; }
  /* ------------------------------------------------------------------ each child from the group genes */
  function children(G) { const g = named(G), n = count(G), out = [];
    for (let k = 0; k < n; k++) { const o = OFF[k], v = g.variety, u = n > 1 ? k / (n - 1) - .5 : 0;
      const lum = clamp(g.clothLum * (1 + g.clothSpread * .85 * o[1]), .03, 1), warm = g.clothWarm;
      out.push({ k, angle: g.centre + g.arc * u, dist: g.dist, height: g.height * (1 + v * .12 * o[0]), head: g.head, shoulders: g.shoulders,
        lean: g.lean + v * 5 * o[3], tilt: g.tilt + v * 10 * o[3], sway: v * .03 * o[4], onTable: clamp(g.onTable * n - k, 0, 1), freeLift: g.freeLift, together: g.together,
        cloth: [lum, lum * lerp(.95, .72, warm), lum * lerp(.9, .38, warm)], dress: clamp(g.dress * n - (n - 1 - k), 0, 1), hat: g.hat,
        hairLen: clamp(g.hairLen + v * .3 * o[2], 0, 1), hairVol: g.hairVol, hairTone: clamp(g.hairTone + g.hairSpread * .6 * o[2], 0, 1) }); }
    return out; }
  /* ------------------------------------------------------------------ the pose: every point the fitness, the build and the anchors share */
  function pose(G, refs) { const S = supportOf(refs), ty = S.y, P = [];
    children(G).forEach(c => { const H = c.height, hd = c.head * H, body = H - hd, legs = body * .52, torso = body * .41, neck = body * .07;
      const a = c.angle * D2R, dx = Math.sin(a), dz = -Math.cos(a), e = edgeAlong(S, dx, dz), sw = c.shoulders * H / 2, rb = Math.max(.05, sw * .8), R = e + c.dist + rb;
      const fx = -dx, fz = -dz, side = [fz, 0, -fx], l = c.lean * D2R, ax = (v, s) => [v[0] + s * Math.sin(l) * fx, v[1] + s * Math.cos(l), v[2] + s * Math.sin(l) * fz];
      const foot = [dx * R, 0, dz * R], hip = [foot[0] + side[0] * c.sway, legs, foot[2] + side[2] * c.sway], chest = ax(hip, torso), shoulder = ax(hip, torso * .88), neckTop = ax(hip, torso + neck);
      const ht = (c.lean + c.tilt) * D2R, head = [neckTop[0] + hd / 2 * Math.sin(ht) * fx, neckTop[1] + hd / 2 * Math.cos(ht), neckTop[2] + hd / 2 * Math.sin(ht) * fz];
      // hands: on the table edge in front (weight onTable), otherwise free: at the sides, lifted toward the chest, together (clapping/holding)
      const armL = .42 * H, elbows = [], hands = [-1, 1].map(sg => { const sh = [shoulder[0] + side[0] * sw * sg, shoulder[1], shoulder[2] + side[2] * sw * sg];
        const rim = [dx * (e - .09) + side[0] * sw * .9 * sg, ty + .03, dz * (e - .09) + side[2] * sw * .9 * sg];
        const fl = c.freeLift, lat = sw * (1 - .9 * c.together) * sg, free = [shoulder[0] + side[0] * lat + fx * armL * .45 * fl, shoulder[1] - armL * lerp(.98, .35, fl), shoulder[2] + side[2] * lat + fz * armL * .45 * fl];
        const ot = c.onTable; let h = free.map((v, j) => lerp(v, rim[j], j === 1 ? Math.sqrt(ot) : ot * ot));   /* the hand rises over the edge before it comes in over the top */ const d = [h[0] - sh[0], h[1] - sh[1], h[2] - sh[2]], L = Math.hypot(...d); if (L > armL) h = sh.map((v, j) => v + d[j] * armL / L);
        const dd = Math.min(armL, L), bend = Math.sqrt(Math.max(0, armL * armL / 4 - dd * dd / 4));
        elbows.push([(sh[0] + h[0]) / 2 + side[0] * sg * bend * .45, (sh[1] + h[1]) / 2 - bend * .8, (sh[2] + h[2]) / 2 + side[2] * sg * bend * .45]); return h; });
      P.push({ i: c.k, c, H, hd, legs, torso, neck, sw, rb, R, a, dir: [dx, dz], fwd: [fx, fz], side, edge: e, foot, hip, chest, shoulder, neckTop, head, hands, elbows, armL }); });
    return { S, P }; }
  /* ------------------------------------------------------------------ fitness */
  function R_(refs) { return refs && refs.people ? refs.people : refs; }
  function evaluate(G, refs) { const r = R_(refs), { S, P } = pose(G, refs), n = P.length, ty = S.y;
    const per = P.map(q => { const s = clamp((ty - q.hip[1]) / Math.max(1e-6, q.torso * Math.cos(q.c.lean * D2R)), 0, 1), over = s * q.torso * Math.sin(q.c.lean * D2R);
      const clear = (q.R - over) - q.edge - q.rb * .9, handsIn = q.hands.map(h => (h[1] < ty - .015 && inside(S, h[0], h[2])) ? Math.min(.2, rimDist(S, h[0], h[2])) : 0).reduce((a, b) => a + b, 0);
      return (q.foot[1] === 0 ? 1 : 0) * (.05 + .95 * sstep(-.15, .005, clear)) * cauchy(handsIn, .04); });
    let sep = 1; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const A = P[i], B = P[j], d = Math.hypot(A.foot[0] - B.foot[0], A.foot[2] - B.foot[2]); sep *= .1 + .9 * sstep(.4, 1, d / (A.rb + B.rb)); }
    const support = mean(per) * Math.pow(sep, 1 / Math.max(1, n - 1));
    const ang = P.map(q => q.c.angle).sort((a, b) => a - b); let gap = 360; for (let i = 1; i < n; i++) gap = Math.min(gap, ang[i] - ang[i - 1]);
    const arc = mean(P.map(q => cauchy(Math.max(0, Math.abs(q.c.angle) - 80), 25))), near = cauchy(Math.max(0, P[0].c.dist - .1) + Math.max(0, -P[0].c.dist), .06);
    const placement = arc * near * cauchy(Math.max(0, 30 - gap), 12), place = support * placement;
    const g = named(G), body = (logScore(g.height / ty, r.heightToTable || 1.786, .12) + logScore(g.head, r.headToHeight || .19, .15) + logScore(g.shoulders, r.shouldersToHeight || .25, .2)) / 3;
    const lean = (cauchy(g.lean - (r.leanDeg || 5), 8) + cauchy(g.tilt - (r.tiltDeg || 15), 12)) / 2;
    const onT = P.map(q => Math.max(...q.hands.map(h => { const inT = (inside(S, h[0], h[2]) ? 1 : -1) * rimDist(S, h[0], h[2]), dIn = inT < .03 ? .03 - inT : inT > .2 ? inT - .2 : 0;
      return cauchy(Math.hypot(dIn, h[1] - (ty + .03)), .05); })));
    const handsFrac = mean(onT), hands = cauchy(handsFrac - (r.handsOnTable || .67), .2);
    const natural = cauchy(Math.abs(g.variety - .6), .4);   // children differ in height, bend and stance: identical figures read as mannequins
    const figure = .4 * body + .25 * lean + .25 * hands + .1 * natural;
    const lit = (alb, gn) => alb.map((v, k) => 255 * clamp(v * CANDLE[k] * gn, 0, 1)), lumOf = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    const quant = (A, B) => { const a = A.slice().sort((x, y) => lumOf(x) - lumOf(y)), b = B.slice().sort((x, y) => lumOf(x) - lumOf(y)), M = b.length;
      return mean(a.map((c, k) => { const u = (k + .5) / a.length * M - .5, i0 = clamp(Math.floor(u), 0, M - 1), i1 = Math.min(M - 1, i0 + 1), f = clamp(u - i0, 0, 1), tg = b[i0].map((v, j) => lerp(v, b[i1][j], f));
        return Math.hypot(c[0] - tg[0], c[1] - tg[1], c[2] - tg[2]) / 255; })); };
    const refC = (r.clothing214 || []).concat((r.kids155 || []).filter(k => k.clothes).map(k => k.clothes)), refH = (r.hair214 || []).concat((r.kids155 || []).map(k => k.hair));
    const cl = P.map(q => lit(q.c.cloth, GAIN)), hr = P.map(q => lit(HAIR_DARK.map((d, k) => lerp(d, HAIR_FAIR[k], q.c.hairTone)), GAIN * .6));
    const cloth = cauchy(quant(cl, refC), .08), hairC = cauchy(quant(hr, refH), .06), hairMass = clamp(g.hairVol / .5, 0, 1) * (.5 + .5 * clamp(g.hairLen / .4, 0, 1));
    const palette = (.5 * cloth + .3 * hairC + .2 * hairMass) * (1 - .3 * sstep(.4, .7, g.hat));   // no party hats are seen in the film
    const fit = .3 * place + .4 * figure + .3 * palette;
    return { fit, parts: { place, support, placement, figure, body, lean, hands, handsFrac, natural, palette, cloth, hair: hairC, hairMass, minGapDeg: gap, count: n } };
  }
  function anchors(G, refs) { const { P } = pose(G, refs), A = {}; P.forEach(q => { A['feet' + q.i] = q.foot.slice(); A['handL' + q.i] = q.hands[0].slice(); A['handR' + q.i] = q.hands[1].slice();
    A['headTop' + q.i] = [q.head[0], q.head[1] + q.hd / 2, q.head[2]]; A['chest' + q.i] = q.chest.slice(); }); return A; }
  /* ------------------------------------------------------------------ build: soft rounded children; opts.t = how far made; opts.refs or opts.support = the table */
  function build(THREE, G, opts) { opts = opts || {}; const t = opts.t == null ? 1 : clamp(opts.t, 0, 1), { P } = pose(G, opts.refs || opts), root = new THREE.Group(); root.name = 'people';
    const clay = new THREE.Color(.5, .49, .47), skin = new THREE.Color(.78, .6, .49), V = a => new THREE.Vector3(a[0], a[1], a[2]), UP = new THREE.Vector3(0, 1, 0);
    P.forEach((q, k) => { const tk = opts.stagger === false ? t : clamp(t * P.length - k, 0, 1), ph = (a, b) => clamp((tk - a) / (b - a), 0, 1); if (tk <= 0) return;
      const c = q.c, g = new THREE.Group(); g.name = 'child' + k; root.add(g);
      const wrap = ph(.75, 1), clothCol = clay.clone().lerp(new THREE.Color(...c.cloth), wrap), hairCol = new THREE.Color(...HAIR_DARK.map((d, j) => lerp(d, HAIR_FAIR[j], c.hairTone)));
      const mCloth = new THREE.MeshStandardMaterial({ color: clothCol, roughness: .92, side: THREE.DoubleSide }), mSkin = new THREE.MeshStandardMaterial({ color: clay.clone().lerp(skin, wrap), roughness: .75 });
      const mLeg = c.dress > .5 ? mSkin : new THREE.MeshStandardMaterial({ color: clay.clone().lerp(new THREE.Color(c.cloth[0] * .35, c.cloth[1] * .33, c.cloth[2] * .4), wrap), roughness: .9 });
      const mHair = new THREE.MeshStandardMaterial({ color: hairCol, roughness: .95, side: THREE.DoubleSide }), mShoe = new THREE.MeshStandardMaterial({ color: new THREE.Color(.05, .045, .04), roughness: .7 });
      const limb = (a, b, r0, r1, mat, f) => { const A = V(a), B = V(b), d = B.clone().sub(A), L = d.length() * f; if (L < 1e-4) return; d.normalize();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, 14, 1, true), mat); m.position.copy(A).addScaledVector(d, L / 2); m.quaternion.setFromUnitVectors(UP, d); g.add(m);
        const s = new THREE.Mesh(new THREE.SphereGeometry(r1, 14, 10), mat); s.position.copy(A).addScaledVector(d, L); g.add(s);
        const s0 = new THREE.Mesh(new THREE.SphereGeometry(r0, 14, 10), mat); s0.position.copy(A); g.add(s0); };
      // legs rise from the floor; small dark shoes
      const lp = ph(0, .2), side = q.side, hw = q.sw * .4;
      [-1, 1].forEach(sg => { const f0 = [q.foot[0] + side[0] * hw * sg, .02, q.foot[2] + side[2] * hw * sg], h0 = [q.hip[0] + side[0] * hw * sg, q.hip[1], q.hip[2] + side[2] * hw * sg]; limb(f0, h0, q.sw * .19, q.sw * .23, mLeg, lp);
        if (lp > 0) { const sh = new THREE.Mesh(new THREE.SphereGeometry(q.sw * .24, 12, 8), mShoe); sh.scale.set(1, .55, 1.5); sh.position.set(f0[0] + q.fwd[0] * q.sw * .12, .018, f0[2] + q.fwd[1] * q.sw * .12); sh.rotation.y = Math.atan2(q.fwd[0], q.fwd[1]); g.add(sh); } });
      // body: one lathed garment along the leaning axis: shoulders, chest, waist, then a skirt flaring toward the knee (dress) or a short top over the hips
      const bp = ph(.2, .4); if (bp > 0) { const hem = lerp(.08, .55, c.dress) * q.legs, top = q.torso, w = q.sw;
        const pts = [[.02, -hem], [w * lerp(.95, 1.35, c.dress), -hem], [w * lerp(.92, 1.15, c.dress), -hem * .55], [w * .9, 0], [w * .82, top * .35], [w * .92, top * .7], [w * .95, top * .88], [w * .7, top * .98], [w * .3, top * 1.02], [.01, top * 1.03]];
        const prof = pts.map(([x, y]) => new THREE.Vector2(x, (y + hem) * bp - hem));
        const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), mCloth); m.position.copy(V(q.hip)); m.quaternion.setFromUnitVectors(UP, V(q.chest).sub(V(q.hip)).normalize()); m.scale.z = .74; g.add(m); }
      // arms: a soft sleeve to the elbow, the forearm, a small rounded hand
      const ap = ph(.4, .5); if (ap > 0) q.hands.forEach((h, j) => { const sg = j ? 1 : -1, sh = [q.shoulder[0] + side[0] * q.sw * .92 * sg, q.shoulder[1], q.shoulder[2] + side[2] * q.sw * .92 * sg], el = q.elbows[j];
        limb(sh, el, q.sw * .24, q.sw * .17, mCloth, Math.min(1, ap * 2)); if (ap > .5) { limb(el, h, q.sw * .14, q.sw * .12, mSkin, (ap - .5) * 2); const hd = new THREE.Mesh(new THREE.SphereGeometry(q.sw * .16, 10, 8), mSkin); hd.position.copy(V(h)); hd.scale.setScalar((ap - .5) * 2); g.add(hd); } });
      // head: a smooth form, no features of any kind, bent toward the cake
      const hp = ph(.5, .6); if (hp > 0) { limb(q.chest, q.neckTop, q.sw * .26, q.sw * .24, mSkin, hp);
        const head = new THREE.Mesh(new THREE.SphereGeometry(q.hd / 2, 28, 20), mSkin); head.position.copy(V(q.head)); head.scale.set(hp * .9, hp * 1.04, hp * .95); head.name = 'head'; g.add(head); }
      // hair mass: crown and back, a fringe over the brow, side curtains and a fall down the back for long hair
      const hm = ph(.6, .75); if (hm > 0) { const r = q.hd / 2 * (1.06 + .14 * c.hairVol);
        const hair = new THREE.Group(); hair.position.copy(V(q.head)); hair.rotation.y = Math.atan2(q.fwd[0], q.fwd[1]); hair.rotateX((c.lean + c.tilt) * D2R); hair.scale.setScalar(hm); hair.name = 'hair'; g.add(hair);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18, 0, Math.PI * 2, 0, Math.PI * .56), mHair); cap.position.set(0, r * .06, -r * .06); hair.add(cap);
        const nape = new THREE.Mesh(new THREE.SphereGeometry(r * 1.01, 24, 16, Math.PI * .6, Math.PI * .8, Math.PI * .3, Math.PI * .5), mHair); nape.position.z = -r * .04; hair.add(nape);   // the back of the head (local -z)
        const fall = q.hd * (.15 + 1.5 * c.hairLen); if (fall > .02) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r * .92, r * (.85 + .45 * c.hairVol), fall, 22, 1, true, Math.PI * .5, Math.PI), mHair);
          f.position.set(0, -fall / 2 + r * .1, -r * .12); hair.add(f);
          [-1, 1].forEach(sg => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r * .3, r * (.28 + .2 * c.hairVol), fall * .8, 12, 1, true), mHair); s.position.set(sg * r * .8, -fall * .4 + r * .15, r * .05); hair.add(s); }); } }
      if (c.hat > .5 && wrap > 0) { const hat = new THREE.Mesh(new THREE.ConeGeometry(q.hd * .26, q.hd * .7 * wrap, 18), mCloth); hat.position.set(q.head[0], q.head[1] + q.hd * (.45 + .35 * wrap), q.head[2]); g.add(hat); }
      g.userData = { index: k, made: tk };
    });
    root.userData = { module: 'people', t, count: P.length }; return root; }
  return { name: 'people', genes, groups, stages, making, blank, evaluate, build, anchors, pose, children, count, supportOf, named, DEFAULT_SUPPORT, MAX };
});
