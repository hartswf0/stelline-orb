/* modules/people.js — EVOLVE-ALL evolver module: the children at the party, faceless.
   No facial features of any kind: the head is a smooth form with a hair mass only; no face data is read or stored.
   Genome: up to five figures (count 3-5), each with height, head size, shoulder width, posture (lean, head tilt, arm reach, arm lift,
   hands together: hands toward the cake on the table edge / clapping / holding; a bent elbow reaches the hand), clothing (dress length, colour, party hat), hair mass (length, volume, tone),
   and place around the table (angle, distance from the edge). Blank: three grey posts standing inside the table at the same spot.
   Fitness (node-safe): support (feet on the floor, no interpenetration with the table or each other, the table edge within arm's reach),
   placement (the far half of the table, spaced, close to the edge, as at 155 s and 214 s), posture (height to table, head and shoulder
   proportions, lean, head tilt, hands on the table edge as two of the three children at 155 s), clothing and hair palette (refs/people.json).
   The supporting table comes in refs.support ({y, rOut, sides, stretch, yaw, warp} or {verts}); table.top(G) gives it. Default: the film's table.
   Plain JS, UMD: node module.exports or window.EVOMOD.people. */
(function (root, factory) { const M = factory(); if (typeof module === 'object' && module.exports) module.exports = M; else { root.EVOMOD = root.EVOMOD || {}; root.EVOMOD.people = M; } })(this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, D2R = Math.PI / 180;
  const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const cauchy = (d, tol) => 1 / (1 + (d / tol) * (d / tol));
  const logScore = (v, target, tol) => cauchy(Math.log(Math.max(1e-6, v) / target), tol);
  const MAX = 5, CANDLE = [1, .70, .22], GAIN = .7, HAIR_DARK = [.05, .04, .025], HAIR_FAIR = [.8, .62, .34];
  /* per-person genes: [key, group, min, max, blank] */
  const PER = [
    ['height', 'BODY', .4, 1.4, .6], ['head', 'BODY', .1, .25, .2], ['shoulders', 'BODY', .15, .4, .2],
    ['lean', 'POSTURE', -15, 30, 0], ['tilt', 'POSTURE', -20, 45, 0], ['reach', 'POSTURE', 0, 1, 0], ['lift', 'POSTURE', 0, 1, 0], ['together', 'POSTURE', 0, 1, 0],
    ['dress', 'CLOTHING', 0, 1, 0], ['clothR', 'CLOTHING', 0, 1, .5], ['clothG', 'CLOTHING', 0, 1, .5], ['clothB', 'CLOTHING', 0, 1, .5], ['hat', 'CLOTHING', 0, 1, 0],
    ['hairLen', 'HAIR', 0, 1, 0], ['hairVol', 'HAIR', 0, 1, 0], ['hairTone', 'HAIR', 0, 1, .5],
    ['angle', 'PLACE', -180, 180, 0], ['dist', 'PLACE', -.3, .5, -.1]];
  const genes = [['count', 'PLACE', 3, 5, 3]];
  for (let i = 0; i < MAX; i++) PER.forEach(([k, g, lo, hi, b]) => genes.push([k + i, g, lo, hi, b]));
  const groups = ['PLACE', 'BODY', 'POSTURE', 'CLOTHING', 'HAIR'];
  const stages = [['PLACE', 'support', .95], ['SPACING', 'placement', .9], ['BODY', 'body', .9], ['POSTURE', 'posture', .85], ['CLOTHING', 'cloth', .8], ['HAIR', 'hairAll', .85], ['WHOLE', 'fit', .88]];
  const stageGroup = { PLACE: 'PLACE', SPACING: 'PLACE', BODY: 'BODY', POSTURE: 'POSTURE', CLOTHING: 'CLOTHING', HAIR: 'HAIR', WHOLE: null };   // which group a stage leans on (for the host's bias)
  const making = [['legs rise from the floor', 0, .2], ['torso', .2, .4], ['arms', .4, .5], ['head', .5, .6], ['hair mass', .6, .75], ['clothing wraps on', .75, 1]];
  const blank = () => Float64Array.from(genes.map(g => g[4]));
  const count = G => Math.round(clamp(G[0], 3, 5));
  function person(G, i) { const o = {}, b = 1 + i * PER.length; PER.forEach(([k], j) => o[k] = G[b + j]); return o; }
  /* ------------------------------------------------------------------ the table they stand at */
  const DEFAULT_SUPPORT = { y: .43, rOut: .33, sides: 6, stretch: 1.05, yaw: 0, warp: .3 };
  function supportOf(refs) { const s = (refs && refs.support) || DEFAULT_SUPPORT; if (s.verts) return s; const n = Math.round(s.sides || 6), verts = [];
    for (let i = 0; i < n; i++) { const b = i / n * Math.PI * 2, a = (s.yaw || 0) * D2R + b - (s.warp || 0) * Math.sin(2 * b) / 2; verts.push([Math.cos(a) * s.rOut * (s.stretch || 1), Math.sin(a) * s.rOut]); }
    return Object.assign({}, s, { verts }); }
  function edgeAlong(S, dx, dz) { let best = 1e9; const V = S.verts;   // distance from the centre to the table edge along a horizontal direction
    for (let i = 0; i < V.length; i++) { const [x1, z1] = V[i], [x2, z2] = V[(i + 1) % V.length], ex = x2 - x1, ez = z2 - z1, den = dx * ez - dz * ex; if (Math.abs(den) < 1e-12) continue;
      const s = (x1 * ez - z1 * ex) / den, u = (x1 * dz - z1 * dx) / den; if (s > 0 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, s); } return best; }
  function inside(S, x, z) { let ins = false; const V = S.verts; for (let i = 0, j = V.length - 1; i < V.length; j = i++) { const [xi, zi] = V[i], [xj, zj] = V[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; }
  function rimDist(S, x, z) { let best = 1e9; const V = S.verts; for (let i = 0; i < V.length; i++) { const a = V[i], b = V[(i + 1) % V.length], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez;
      const u = l2 ? clamp(((x - a[0]) * ex + (z - a[1]) * ez) / l2, 0, 1) : 0; best = Math.min(best, Math.hypot(x - a[0] - u * ex, z - a[1] - u * ez)); } return best; }
  /* ------------------------------------------------------------------ the pose: every point the fitness, the build and the anchors share */
  function pose(G, refs) { const S = supportOf(refs), n = count(G), P = [];
    for (let i = 0; i < n; i++) { const p = person(G, i), H = p.height, hd = p.head * H, body = H - hd, legs = body * .56, torso = body * .38, neck = body * .06;
      const a = p.angle * D2R, dx = Math.sin(a), dz = -Math.cos(a), e = edgeAlong(S, dx, dz), sw = p.shoulders * H / 2, rb = Math.max(.05, sw * .78), R = e + p.dist + rb;
      const fx = -dx, fz = -dz, l = p.lean * D2R, ax = (v, s) => [v[0] + s * Math.sin(l) * fx, v[1] + s * Math.cos(l), v[2] + s * Math.sin(l) * fz];   // along the leaning body axis
      const foot = [dx * R, 0, dz * R], hip = [foot[0], legs, foot[2]], chest = ax(hip, torso), shoulder = ax(hip, torso * .9), neckTop = ax(hip, torso + neck);
      const ht = (p.lean + p.tilt) * D2R, head = [neckTop[0] + hd / 2 * Math.sin(ht) * fx, neckTop[1] + hd / 2 * Math.cos(ht), neckTop[2] + hd / 2 * Math.sin(ht) * fz];
      // hands: placed directly (forward and up from the shoulder, in arm lengths) and reached with a bent elbow; never further than the arm
      const armL = .42 * H, side = [fz, 0, -fx], elbows = [];
      const hands = [-1, 1].map(sg => { const lat = sw * (1 - .92 * p.together) * sg, sh = [shoulder[0] + side[0] * sw * sg, shoulder[1], shoulder[2] + side[2] * sw * sg];
        let f = p.reach * armL, u = lerp(-1, .6, p.lift) * armL, w = lat - sw * sg; const L = Math.hypot(f, u, w); if (L > armL) { f *= armL / L; u *= armL / L; w *= armL / L; }
        const h = [sh[0] + side[0] * w + fx * f, sh[1] + u, sh[2] + side[2] * w + fz * f], d = Math.min(armL, Math.hypot(f, u, w)), bend = Math.sqrt(Math.max(0, armL * armL / 4 - d * d / 4));
        elbows.push([(sh[0] + h[0]) / 2 + side[0] * sg * bend * .5, (sh[1] + h[1]) / 2 - bend * .85, (sh[2] + h[2]) / 2 + side[2] * sg * bend * .5]); return h; });
      P.push({ i, p, H, hd, legs, torso, neck, sw, rb, R, a, dir: [dx, dz], fwd: [fx, fz], side, edge: e, foot, hip, chest, shoulder, neckTop, head, hands, elbows, armL }); }
    return { S, P }; }
  /* ------------------------------------------------------------------ fitness */
  function R_(refs) { return refs && refs.people ? refs.people : refs; }
  function evaluate(G, refs) { const r = R_(refs), { S, P } = pose(G, refs), n = P.length, ty = S.y;
    // SUPPORT: feet on the floor; the body clear of the table where it is below the top; the figures clear of each other; the table edge within arm's reach
    const feet = P.map(q => q.foot[1] === 0 ? 1 : 0), per = P.map(q => {
      const s = clamp((ty - q.hip[1]) / Math.max(1e-6, q.torso * Math.cos(q.p.lean * D2R)), 0, 1), over = s * q.torso * Math.sin(q.p.lean * D2R);   // how far the body has come forward where it meets the table top height
      const clear = (q.R - over) - q.edge - q.rb * .9;
      const handsIn = q.hands.map(h => (h[1] < ty - .015 && inside(S, h[0], h[2])) ? Math.min(.2, rimDist(S, h[0], h[2])) : 0).reduce((a, b) => a + b, 0);   // a hand inside the table below its top
      const reachable = Math.hypot(q.shoulder[0] - q.dir[0] * q.edge, q.shoulder[2] - q.dir[1] * q.edge) - q.armL;
      return (.05 + .95 * sstep(-.15, .005, clear)) * cauchy(handsIn, .03) * (.3 + .7 * sstep(.2, -.02, reachable)); });
    let sep = 1; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const A = P[i], B = P[j], d = Math.hypot(A.foot[0] - B.foot[0], A.foot[2] - B.foot[2]); sep *= .1 + .9 * sstep(.4, 1, d / (A.rb + B.rb)); }
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const support = mean(feet) * (.5 * mean(per) + .5 * Math.min(...per)) * Math.pow(sep, 1 / Math.max(1, n - 1));
    // PLACEMENT: the far half (angle 0 = across the table from the camera), spaced, standing close to the edge
    const ang = P.map(q => q.p.angle).sort((a, b) => a - b); let gap = 360; for (let i = 0; i < n; i++) gap = Math.min(gap, i ? ang[i] - ang[i - 1] : ang[0] + 360 - ang[n - 1]);
    const arc = mean(P.map(q => cauchy(Math.max(0, Math.abs(q.p.angle) - 80), 25))), near = mean(P.map(q => cauchy(Math.max(0, q.p.dist - .12) + Math.max(0, -.0 - q.p.dist), .06)));
    const placement = arc * near * cauchy(Math.max(0, 28 - gap), 10);
    // POSTURE: children to the table (refs: 1.79 x the table height), head and shoulders as a child's, a slight lean in, head bent to the cake, hands on the edge for about two of three
    const hTo = r.heightToTable || 1.786, body = mean(P.map(q => (logScore(q.H / ty, hTo, .12) + logScore(q.p.head, r.headToHeight || .167, .15) + logScore(q.p.shoulders, r.shouldersToHeight || .25, .2)) / 3));
    const lean = mean(P.map(q => (cauchy(q.p.lean - (r.leanDeg || 5), 8) + cauchy(q.p.tilt - (r.tiltDeg || 15), 12)) / 2));
    // a hand on the table: on its top (0.03 above), 0.04-0.2 inside the rim; the score falls off smoothly with the distance from there
    const onT = P.map(q => Math.max(...q.hands.map(h => { const inT = (inside(S, h[0], h[2]) ? 1 : -1) * rimDist(S, h[0], h[2]), dIn = inT < .04 ? .04 - inT : inT > .2 ? inT - .2 : 0;
      return cauchy(Math.hypot(dIn, h[1] - (ty + .03)), .04); })));
    const kOn = Math.max(1, Math.round((r.handsOnTable || .67) * n)), handsFrac = onT.filter(v => v > .5).length / n;
    const hands = onT.slice().sort((a, b) => b - a).slice(0, kOn).reduce((a, b) => a + b, 0) / kOn;   // the best-placed two thirds have their hands on the edge; the rest are free
    const posture = .45 * body + .3 * lean + .25 * hands;
    // PALETTE: clothing and hair as the candle shows them (refs: torso and hair boxes at 214 s and 155 s), matched by brightness quantile
    const lit = (alb, g) => alb.map((v, k) => 255 * clamp(v * CANDLE[k] * g, 0, 1));
    const cl = P.map(q => lit([q.p.clothR, q.p.clothG, q.p.clothB], GAIN)), hr = P.map(q => lit(HAIR_DARK.map((d, k) => lerp(d, HAIR_FAIR[k], q.p.hairTone)), GAIN * .6));
    const refC = (r.clothing214 || []).concat((r.kids155 || []).filter(k => k.clothes).map(k => k.clothes)), refH = (r.hair214 || []).concat((r.kids155 || []).map(k => k.hair));
    // the figures sorted by brightness against the film's colours sorted by brightness, at the same quantiles (a 1-D transport: smooth, no figure has to
    // pass through a worse match to take the free colour)
    const lumOf = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    const quant = (A, B) => { const a = A.slice().sort((x, y) => lumOf(x) - lumOf(y)), b = B.slice().sort((x, y) => lumOf(x) - lumOf(y)), M = b.length;
      return mean(a.map((c, k) => { const u = (k + .5) / a.length * M - .5, i0 = clamp(Math.floor(u), 0, M - 1), i1 = Math.min(M - 1, i0 + 1), f = clamp(u - i0, 0, 1), tg = b[i0].map((v, j) => lerp(v, b[i1][j], f));
        return Math.hypot(c[0] - tg[0], c[1] - tg[1], c[2] - tg[2]) / 255; })); };
    const cloth = cauchy(quant(cl, refC), .05), hairC = cauchy(quant(hr, refH), .04), hairMass = mean(P.map(q => clamp(q.p.hairVol / .5, 0, 1))), hairAll = .6 * hairC + .4 * hairMass;
    const hat = mean(P.map(q => q.p.hat > .5 ? 1 : 0));   // no party hats are seen in the film
    const palette = (.5 * cloth + .5 * hairAll) * (1 - .3 * hat);
    const fit = .25 * support + .2 * placement + .3 * posture + .25 * palette;
    return { fit, parts: { support, placement, posture, palette, body, lean, hands, handsFrac, cloth, hair: hairC, hairMass, hairAll, hat, minGapDeg: gap, count: n } };
  }
  /* ------------------------------------------------------------------ anchors */
  function anchors(G, refs) { const { P } = pose(G, refs), A = {}; P.forEach(q => { A['feet' + q.i] = q.foot.slice(); A['handL' + q.i] = q.hands[0].slice(); A['handR' + q.i] = q.hands[1].slice();
    A['headTop' + q.i] = [q.head[0], q.head[1] + q.hd / 2, q.head[2]]; A['chest' + q.i] = q.chest.slice(); }); return A; }
  /* ------------------------------------------------------------------ build: soft rounded figures; opts.t = how far made (each figure grows from the floor up, then its clothing wraps on) */
  function build(THREE, G, opts) { opts = opts || {}; const t = opts.t == null ? 1 : clamp(opts.t, 0, 1), { P } = pose(G, opts.refs), root = new THREE.Group(); root.name = 'people';
    const clay = new THREE.Color(.5, .49, .47), skin = new THREE.Color(.62, .5, .42);
    const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    P.forEach((q, k) => { const tk = opts.stagger === false ? t : clamp(t * P.length - k, 0, 1), ph = (a, b) => clamp((tk - a) / (b - a), 0, 1); if (tk <= 0) return;
      const p = q.p, g = new THREE.Group(); g.name = 'person' + k; root.add(g);
      const wrap = ph(.75, 1), cloth = clay.clone().lerp(new THREE.Color(p.clothR, p.clothG, p.clothB), wrap);
      const hairCol = new THREE.Color(...HAIR_DARK.map((d, j) => lerp(d, HAIR_FAIR[j], p.hairTone)));
      const mClothes = new THREE.MeshStandardMaterial({ color: cloth, roughness: .85 }), mSkin = new THREE.MeshStandardMaterial({ color: clay.clone().lerp(skin, wrap), roughness: .7 });
      const mLeg = new THREE.MeshStandardMaterial({ color: clay.clone().lerp(p.dress > .5 ? skin : new THREE.Color(p.clothR * .5, p.clothG * .5, p.clothB * .55), wrap), roughness: .85 });
      const mHair = new THREE.MeshStandardMaterial({ color: hairCol, roughness: .9 });
      const limb = (a, b, r0, r1, mat, f) => { const A = V(a), B = V(b), d = B.clone().sub(A), L = d.length() * f; if (L < 1e-4) return; const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, 12), mat);
        c.position.copy(A).addScaledVector(d.normalize(), L / 2); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(c);
        const s = new THREE.Mesh(new THREE.SphereGeometry(r1, 12, 8), mat); s.position.copy(A).addScaledVector(d, L); g.add(s); };
      // legs rise from the floor (a dress hides most of them)
      const lp = ph(0, .2), side = q.side, hw = q.sw * .42;
      [-1, 1].forEach(sg => { const f0 = [q.foot[0] + side[0] * hw * sg, 0, q.foot[2] + side[2] * hw * sg], h0 = [q.hip[0] + side[0] * hw * sg, q.hip[1], q.hip[2] + side[2] * hw * sg]; limb(f0, h0, q.sw * .2, q.sw * .17, mLeg, lp); });
      // torso: a lathed rounded form along the leaning body axis
      const tp = ph(.2, .4); if (tp > 0) { const prof = []; for (let s = 0; s <= 10; s++) { const u = s / 10, w = q.sw * (.82 + .18 * Math.sin(u * Math.PI * .9)) * (u > .92 ? .7 : 1); prof.push(new THREE.Vector2(Math.max(.002, w * Math.sin(Math.min(1, (u + .04) * 1.15) * Math.PI / 2 + (u > .85 ? (u - .85) * 6 : 0)) ), u * q.torso * tp)); }
        const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), mClothes); torso.position.copy(V(q.hip)); torso.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(q.chest).sub(V(q.hip)).normalize()); torso.scale.z = .72; g.add(torso);
        // the dress: a flared skirt from the hip down, wrapping on last
        if (p.dress > .15) { const dl = q.legs * (.35 + .55 * p.dress) * wrap; if (dl > .003) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(q.sw * .85, q.sw * (1.05 + .5 * p.dress), dl, 24, 1, true), mClothes); mClothes.side = THREE.DoubleSide; sk.position.set(q.hip[0], q.hip[1] - dl / 2 + .01, q.hip[2]); g.add(sk); } } }
      // arms: toward the cake, clapping, or holding (hands together)
      const ap = ph(.4, .5); if (ap > 0) q.hands.forEach((h, j) => { const sg = j ? 1 : -1, sh = [q.shoulder[0] + side[0] * q.sw * sg, q.shoulder[1], q.shoulder[2] + side[2] * q.sw * sg], el = q.elbows[j];
        limb(sh, el, q.sw * .17, q.sw * .15, mClothes, Math.min(1, ap * 2)); if (ap > .5) limb(el, h, q.sw * .15, q.sw * .13, mSkin, (ap - .5) * 2); });
      // head: a smooth form only, no features of any kind
      const hp = ph(.5, .6); if (hp > 0) { const head = new THREE.Mesh(new THREE.SphereGeometry(q.hd / 2, 28, 20), mSkin); head.position.copy(V(q.head)); head.scale.set(hp * .92, hp, hp * .96); g.add(head);
        limb(q.chest, q.neckTop, q.sw * .22, q.sw * .2, mSkin, hp); }
      // hair mass: a cap over the crown and the back of the head, and a fall down the back for long hair
      const hm = ph(.6, .75); if (hm > 0 && p.hairVol > .05) { const r = q.hd / 2 * (1.04 + .14 * p.hairVol), back = [-q.fwd[0], -q.fwd[1]];
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 16, 0, Math.PI * 2, 0, Math.PI * (.42 + .1 * p.hairVol)), mHair); cap.position.copy(V(q.head)).add(new THREE.Vector3(back[0] * r * .12, r * .04, back[1] * r * .12)); cap.scale.setScalar(hm); g.add(cap);
        const fall = q.hd * (.2 + 1.6 * p.hairLen) * hm; if (fall > .01) { const f = new THREE.Mesh(new THREE.CylinderGeometry(r * .9, r * (.8 + .4 * p.hairVol), fall, 20, 1, false, 0, Math.PI), mHair);
          f.position.set(q.head[0] + back[0] * r * .35, q.head[1] - fall / 2 + r * .2, q.head[2] + back[1] * r * .35); f.rotation.y = Math.atan2(back[0], back[1]) - Math.PI / 2; g.add(f); } }
      // party hat (a cone on the crown), last
      if (p.hat > .5 && wrap > 0) { const hat = new THREE.Mesh(new THREE.ConeGeometry(q.hd * .28, q.hd * .7 * wrap, 18), mClothes); hat.position.set(q.head[0], q.head[1] + q.hd * (.45 + .35 * wrap), q.head[2]); g.add(hat); }
      g.userData = { index: k, made: tk };
    });
    root.userData = { module: 'people', t, count: P.length }; return root; }
  return { name: 'people', genes, groups, stages, stageGroup, making, blank, evaluate, build, anchors, pose, person, count, supportOf, DEFAULT_SUPPORT, MAX };
});
