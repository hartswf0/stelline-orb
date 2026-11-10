/* rig.js — the children as skinned meshes: geometry, skeleton (bind/rest matrices), vertex weights computed here,
   corrective shapes baked here, the pose solver (two-bone IK with an elbow pole, forearm twist distribution), a CPU
   skinner identical in arithmetic to three.js r128's skinning shader, and the measurements the tests and the page use.
   Units: metres, y up, a child faces +z in her own frame. Bones have identity rest orientation, so a bone's bind
   matrix is a pure translation to its rest joint and its inverse bind is translate(-rest).
   Shared by index.html (browser, THREE global) and tests.js (node, require).                                         */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('../../../ana/assets/three.min.js')); else root.RIG = factory(root.THREE); })(this, function (T) {
'use strict';
const PI = Math.PI, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new T.Vector3(x, y, z);
const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'clavL', 'upperL', 'foreL', 'tw1L', 'tw2L', 'handL', 'clavR', 'upperR', 'foreR', 'tw1R', 'tw2R', 'handR', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
const PARENT = [-1, 0, 1, 2, 3, 2, 5, 6, 7, 8, 9, 2, 11, 12, 13, 14, 15, 0, 17, 18, 0, 20, 21];
const BI = {}; BONES.forEach((n, i) => BI[n] = i);
const SIDES = { L: 1, R: -1 };
const MORPHS = ['elbowL', 'elbowR', 'raiseSideL', 'raiseSideR', 'raiseFwdL', 'raiseFwdR'];
const KEY = { elbow: 125 * PI / 180, elev: 140 * PI / 180, restElev: 25 * PI / 180, raiseGain: .35 }; // raise gain tuned: 1.0 inflated the shoulder to 1.27 of rest volume once the clavicle shrug and the rigid badge were in

/* ------------------------------------------------------------------ proportions */
function dims(H) {
  const D = { H, hipY: .47 * H, chestY: .64 * H, shY: .755 * H, neckY: .80 * H, rh: .105 * H };
  D.headY = D.neckY + .02 * H + D.rh * .88;
  D.armA = .185 * H; D.armB = .165 * H; D.handL = .07 * H; D.ang = 25 * PI / 180;
  D.knee = .26 * H; D.ankle = .05 * H; D.legX = .062 * H;
  D.rest = {};
  const put = (n, x, y, z) => D.rest[n] = V(x, y, z || 0);
  put('hips', 0, D.hipY); put('spine', 0, (D.hipY + D.chestY) / 2); put('chest', 0, D.chestY); put('neck', 0, D.neckY); put('head', 0, D.neckY + .04 * H);
  for (const s in SIDES) { const sx = SIDES[s], S = V(sx * .118 * H, D.shY - .025 * H, 0), d = V(sx * Math.sin(D.ang), -Math.cos(D.ang), 0);
    D['d0' + s] = d; D['h0' + s] = d.clone().cross(V(0, 0, 1)).normalize();
    put('clav' + s, sx * .035 * H, D.shY - .035 * H); D.rest['upper' + s] = S.clone();
    const E = S.clone().addScaledVector(d, D.armA), W = E.clone().addScaledVector(d, D.armB);
    D.rest['fore' + s] = E; D.rest['tw1' + s] = E.clone().addScaledVector(d, D.armB / 3); D.rest['tw2' + s] = E.clone().addScaledVector(d, 2 * D.armB / 3); D.rest['hand' + s] = W;
    put('thigh' + s, sx * D.legX, D.hipY - .045 * H); put('shin' + s, sx * D.legX, D.knee); put('foot' + s, sx * D.legX, D.ankle); }
  return D;
}

/* ------------------------------------------------------------------ geometry builder: tubes and ellipsoids, each vertex born with its weights */
function Builder() { this.p = []; this.uv = []; this.c = []; this.idx = []; this.w = []; this.part = []; this.n = 0; }
Builder.prototype.v = function (p, uv, col, w, part) { this.p.push(p.x, p.y, p.z); this.uv.push(uv[0], uv[1]); this.c.push(col.r, col.g, col.b); this.w.push(w); this.part.push(part); return this.n++; };
Builder.prototype.grid = function (start, rings, segs, closeStart, closeEnd) { // rings x (segs+1) vertices, the last column a UV seam duplicate of the first
  const cols = segs + 1;
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < segs; j++) { const a = start + i * cols + j, b = a + 1, c = a + cols, d = c + 1; this.idx.push(a, c, b, b, c, d); }
  return cols; };
// knots: [[t, boneIndex], ...] sorted by t; weight is a smoothstep blend between consecutive knots (one-hot outside)
function knotWeights(knots, t) { const w = {}; if (t <= knots[0][0]) { w[knots[0][1]] = 1; return w; } const L = knots[knots.length - 1]; if (t >= L[0]) { w[L[1]] = 1; return w; }
  for (let i = 0; i < knots.length - 1; i++) { const [t0, b0] = knots[i], [t1, b1] = knots[i + 1]; if (t >= t0 && t <= t1) { const u = t1 > t0 ? sstep(t0, t1, t) : 1; w[b0] = (w[b0] || 0) + 1 - u; w[b1] = (w[b1] || 0) + u; return w; } } return w; }

const col = h => new T.Color(h);
function buildChild(spec) {
  const H = spec.H, D = dims(H), B = new Builder(), C = spec.colors, WHITE = col(0xffffff), PLAIN = [.9, .9];
  const info = { arms: {}, torso: null, palm: {}, ornament: null };
  /* the arms: one sleeve tube each, shoulder (buried in the torso) to wrist, then the mitten */
  for (const s in SIDES) { const sx = SIDES[s], S = D.rest['upper' + s], d = D['d0' + s], out = V(0, 0, 1).cross(d).normalize().multiplyScalar(sx), Z = V(0, 0, 1);
    if (out.x * sx < 0) out.negate();
    const a = D.armA, b = D.armB, t0 = -.05 * H, t1 = a + b, rings = 48, segs = 20, start = B.n;
    const knots = [[-.035 * H, BI['clav' + s]], [.055 * H, BI['upper' + s]], [a - .03 * H, BI['upper' + s]], [a + .03 * H, BI['fore' + s]], [a + b / 3, BI['tw1' + s]], [a + 2 * b / 3, BI['tw2' + s]], [a + b, BI['hand' + s]]];
    const radius = t => { const u = t / (a + b); return H * (t < 0 ? .046 : u < .5 ? lerp(.046, .036, u / .5) : lerp(.036, .029, (u - .5) / .5)) * (spec.bulky ? 1.12 : 1); };
    const ringT = []; for (let i = 0; i < rings; i++) { const u = i / (rings - 1); ringT.push(t0 + (t1 - t0) * u); }
    const sleeveEnd = spec.shortSleeve ? a * .55 : a + b * .93;
    ringT.forEach((t, i) => { const c = S.clone().addScaledVector(d, t), r = radius(t);
      for (let j = 0; j <= segs; j++) { const ph = -PI + 2 * PI * j / segs, p = c.clone().addScaledVector(out, Math.cos(ph) * r).addScaledVector(Z, Math.sin(ph) * r * .92);
        const uv = [(ph + PI) / (2 * PI) * .5, (t - t0) / (t1 - t0) * .5], skin = t > sleeveEnd;
        B.v(p, skin ? PLAIN : (s === 'R' ? [.52, .02] : uv), skin ? col(C.skin) : WHITE, knotWeights(knots, t), skin ? 'skin' : 'sleeve' + s); } });
    B.grid(start, rings, segs);
    const arm = { start, rings, segs, ringT, a, b, t0, t1, knots, out, d, S, circ: 2 * PI * radius(a * .4), len: t1 - t0 };
    info.arms[s] = arm;
    /* the mitten: an ellipsoid past the wrist, wholly the hand bone's */
    const W = D.rest['hand' + s], hc = W.clone().addScaledVector(d, .03 * H), hs = ellipsoid(B, hc, [out, d, Z], [.026 * H, .042 * H, .018 * H], 10, 12, col(C.skin), () => ({ [BI['hand' + s]]: 1 }), 'hand' + s, -.25);
    // the palm: the mitten's vertex facing the other hand (medial) nearest its middle
    let best = -1, bd = 1e9; for (let k = hs.start; k < hs.end; k++) { const p = V(B.p[3 * k], B.p[3 * k + 1], B.p[3 * k + 2]); const m = p.clone().sub(hc), score = -m.dot(out) / (.018 * H) * 0 + m.clone().addScaledVector(out, .026 * H).length() + Math.abs(m.dot(d)) * .5; if (score < bd) { bd = score; best = k; } }
    info.palm[s] = best;
  }
  /* the torso: elliptical rings up the spine; a dress continues below the hips into a skirt */
  const prof = [[D.neckY + .045 * H, .045, .042], [D.neckY, .05, .046], [D.shY + .02 * H, .1, .068], [D.shY, .132, .075], [D.chestY, .124, .085], [(D.hipY + D.chestY) / 2, .113, .08], [D.hipY, .128, .086], [D.hipY - .05 * H, .118, .082]];
  if (spec.dress) prof.push([D.hipY - .1 * H, .15, .11], [.3 * H, .205, .175]); else prof.push([D.hipY - .08 * H, .09, .07]);
  prof.sort((p, q) => p[0] - q[0]);
  const yB = prof[0][0], yT = prof[prof.length - 1][0], tr = 40, tsegs = 28, tstart = B.n;
  const at = y => { for (let i = 0; i < prof.length - 1; i++) if (y >= prof[i][0] && y <= prof[i + 1][0]) { const u = sstep(prof[i][0], prof[i + 1][0], y) * .7 + (y - prof[i][0]) / (prof[i + 1][0] - prof[i][0]) * .3; return [lerp(prof[i][1], prof[i + 1][1], u) * H, lerp(prof[i][2], prof[i + 1][2], u) * H]; } return [prof[0][1] * H, prof[0][2] * H]; };
  const tknots = [[D.hipY - .02 * H, BI.hips], [(D.hipY + D.chestY) / 2, BI.spine], [D.chestY, BI.chest], [D.shY + .01 * H, BI.chest], [D.neckY + .02 * H, BI.neck]];
  for (let i = 0; i < tr; i++) { const y = yB + (yT - yB) * i / (tr - 1), [rx, rz] = at(y);
    for (let j = 0; j <= tsegs; j++) { const th = PI / 2 + 2 * PI * j / tsegs, x = Math.cos(th) * rx, z = Math.sin(th) * rz * (Math.sin(th) > 0 ? 1.04 : .96);
      const w = knotWeights(tknots, y), side = x > 0 ? 'L' : 'R', cl = sstep(.055 * H, .115 * H, Math.abs(x)) * sstep(D.chestY, D.shY, y) * .65;
      if (cl > 0) { for (const k in w) w[k] *= 1 - cl; w[BI['clav' + side]] = (w[BI['clav' + side]] || 0) + cl; }
      const nk = y > D.neckY + .005 * H; B.v(V(x, y, z), nk ? PLAIN : [.5 + (j / tsegs) * .5, (y - yB) / (yT - yB) * .5], nk ? col(C.skin) : WHITE, w, nk ? 'neck' : 'torso'); } }
  B.grid(tstart, tr, tsegs); info.torso = { start: tstart, rings: tr, segs: tsegs, yB, yT };
  cap(B, tstart + (tr - 1) * (tsegs + 1), tsegs, V(0, yT, 0), [.75, .25], { [BI.neck]: 1 }, true);
  if (!spec.dress) cap(B, tstart, tsegs, V(0, yB, 0), [.75, .25], { [BI.hips]: 1 }, false);
  /* legs: tubes from inside the hips to the ankle, socks or trousers; shoes */
  for (const s in SIDES) { const top = D.rest['thigh' + s], lk = [[-.01 * H, BI.hips], [.05 * H, BI['thigh' + s]], [top.y - D.knee - .03 * H, BI['thigh' + s]], [top.y - D.knee + .03 * H, BI['shin' + s]], [top.y - D.ankle - .02 * H, BI['shin' + s]], [top.y - D.ankle + .01 * H, BI['foot' + s]]];
    const L = top.y - D.ankle + .01 * H, rings = 16, segs = 12, st = B.n;
    for (let i = 0; i < rings; i++) { const t = -.03 * H + (L + .03 * H) * i / (rings - 1), y = top.y - t, r = H * lerp(.052, .032, clamp(t / L, 0, 1)), lc = spec.dress ? (y > D.knee + .02 * H ? C.socks : C.socks) : (y > .07 * H ? C.legs : C.socks);
      for (let j = 0; j <= segs; j++) { const th = 2 * PI * j / segs; B.v(V(top.x + Math.cos(th) * r, y, Math.sin(th) * r), PLAIN, col(spec.dress && y > .1 * H ? C.skin : lc), knotWeights(lk, t), 'leg'); } }
    B.grid(st, rings, segs);
    ellipsoid(B, V(top.x, .03 * H, .03 * H), [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)], [.042 * H, .03 * H, .075 * H], 8, 10, col(C.shoes), () => ({ [BI['foot' + s]]: 1 }), 'shoe'); }
  /* the head: a plain rounded form, no features; hair over the crown and the back, hairline dipping at the nape */
  const hc = V(0, D.headY, .004 * H), hb = () => ({ [BI.head]: 1 });
  ellipsoid(B, hc, [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)], [D.rh * .95, D.rh, D.rh * .97], 14, 18, col(C.skin), hb, 'head');
  ellipsoid(B, hc.clone().add(V(0, .012 * H, -.012 * H)), [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)], [D.rh * 1.02, D.rh * 1.03, D.rh * 1.03], 14, 18, col(C.hair), hb, 'hair', 0, n => (n.z > .25 && n.y < .45 - (spec.longHair ? 0 : 0)) ? .86 : (n.y < -.35 && n.z > -.2 ? .9 : 1));
  const R = D.rh;
  if (spec.hair === 'bun') ellipsoid(B, hc.clone().add(V(0, R * .75, -R * .55)), [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)], [R * .42, R * .38, R * .42], 8, 10, col(C.hair), hb, 'hair');
  if (spec.hair === 'pigtails') for (const sx of [1, -1]) ellipsoid(B, hc.clone().add(V(sx * R * .95, -R * .25, -R * .35)), [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)], [R * .26, R * .48, R * .26], 8, 10, col(C.hair), hb, 'hair');
  if (spec.hair === 'pony') ellipsoid(B, hc.clone().add(V(0, -R * .35, -R * 1.0)), [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)], [R * .3, R * .62, R * .3], 8, 10, col(C.hair), hb, 'hair');
  if (spec.hair === 'cap') { ellipsoid(B, hc.clone().add(V(0, R * .18, 0)), [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)], [R * 1.07, R * .9, R * 1.07], 12, 16, col(C.cap), hb, 'hair', 0, n => n.y < .1 ? .9 : 1); }

  /* normalise, keep the four largest influences (three.js skins with four) */
  const n = B.n, skinIndex = new Uint16Array(n * 4), skinWeight = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { const e = Object.entries(B.w[i]).map(([k, v]) => [+k, v]).filter(e => e[1] > 1e-6).sort((a, b) => b[1] - a[1]).slice(0, 4); const s = e.reduce((a, b) => a + b[1], 0);
    e.forEach(([k, v], j) => { skinIndex[i * 4 + j] = k; skinWeight[i * 4 + j] = v / s; }); }
  const G = { n, pos: new Float32Array(B.p), uv: new Float32Array(B.uv), color: new Float32Array(B.c), index: B.idx.slice(), skinIndex, skinWeight, part: B.part, D, info, spec, morphs: [] };
  /* the printed ornament: a region on the sleeve (or the dress back) whose weights are averaged, so it moves as one piece */
  if (spec.ornament) G.ornament = defineOrnament(G, spec.ornament);
  if (G.ornament && spec.mask !== false) applyMask(G, G.ornament);
  /* corrective shapes: at a key pose each, the difference between what linear blending gives and a dual-quaternion (rotation-blended) result, carried back into rest space */
  G.morphs = MORPHS.map(name => ({ name, delta: bakeCorrective(G, name) }));
  return G;
}
const lerp = (a, b, t) => a + (b - a) * t;
function ellipsoid(B, c, axes, r, rings, segs, colr, wfn, part, ycut, shrink) {
  const start = B.n; const [X, Y, Z] = axes;
  for (let i = 0; i <= rings; i++) { const v = i / rings, th = PI * v; for (let j = 0; j <= segs; j++) { const ph = 2 * PI * j / segs, n = V(Math.sin(th) * Math.cos(ph), -Math.cos(th), Math.sin(th) * Math.sin(ph));
      const k = shrink ? shrink(n) : 1, p = c.clone().addScaledVector(X, n.x * r[0] * k).addScaledVector(Y, n.y * r[1] * k).addScaledVector(Z, n.z * r[2] * k);
      B.v(p, [.9, .9], colr, wfn(p), part); } }
  B.grid(start, rings + 1, segs); return { start, end: B.n }; }
function cap(B, ringStart, segs, center, uv, w, up) { const c = B.v(center, uv, new T.Color(1, 1, 1), w, 'cap');
  for (let j = 0; j < segs; j++) up ? B.idx.push(ringStart + j, ringStart + j + 1, c) : B.idx.push(ringStart + j + 1, ringStart + j, c); }

/* ------------------------------------------------------------------ the ornament region and its mask */
function defineOrnament(G, kind) { const { D, info } = G, H = D.H;
  let verts = [], feather = [], core = new Set(), uvC, uvR;
  if (kind === 'sleeve') { const arm = info.arms.L, cy = .42 * arm.a, half = .034 * H; // a badge on the outer upper sleeve, 42% down the upper arm (at 20% it sat on top of the shoulder cap, out of sight)
    const cu = .25, cv = (cy - arm.t0) / arm.len * .5, ru = half / arm.circ * .5, rv = half / arm.len * .5; uvC = [cu, cv]; uvR = [ru, rv];
    for (let i = 0; i < arm.rings; i++) for (let j = 0; j <= arm.segs; j++) { const k = arm.start + i * (arm.segs + 1) + j, u = G.uv[2 * k], v = G.uv[2 * k + 1], e = Math.hypot((u - cu) / ru, (v - cv) / rv);
      if (e <= 1.25) { core.add(k); verts.push(k); } else if (e < 2.6) feather.push([k, 1 - sstep(1.25, 2.6, e)]); } }
  else { const to = info.torso, y = D.hipY + .02 * H, half = .05 * H; // a bow printed on the back of the dress at the waist
    const cu = .75, cv = (y - to.yB) / (to.yT - to.yB) * .5, circ = 2 * PI * .11 * H, ru = half / circ * .5, rv = half / (to.yT - to.yB) * .5 * .8; uvC = [cu, cv]; uvR = [ru, rv];
    for (let i = 0; i < to.rings; i++) for (let j = 0; j <= to.segs; j++) { const k = to.start + i * (to.segs + 1) + j, u = G.uv[2 * k], v = G.uv[2 * k + 1], e = Math.hypot((u - cu) / ru, (v - cv) / rv);
      if (e <= 1.25) { core.add(k); verts.push(k); } else if (e < 2.6) feather.push([k, 1 - sstep(1.25, 2.6, e)]); } }
  const tris = [], band = [], fz = new Set(feather.map(f => f[0])); for (let t = 0; t < G.index.length; t += 3) { const a = G.index[t], b = G.index[t + 1], c = G.index[t + 2], inC = x => core.has(x), inB = x => core.has(x) || fz.has(x);
    if (inC(a) && inC(b) && inC(c)) tris.push(a, b, c); else if (inB(a) && inB(b) && inB(c)) band.push(a, b, c); }
  return { kind, verts, feather, tris, band, uvC, uvR }; }
function applyMask(G, O) { const avg = {}; O.verts.forEach(k => { for (let j = 0; j < 4; j++) { const w = G.skinWeight[4 * k + j]; if (w > 0) avg[G.skinIndex[4 * k + j]] = (avg[G.skinIndex[4 * k + j]] || 0) + w / O.verts.length; } });
  const set = (k, m) => { const own = {}; for (let j = 0; j < 4; j++) { const w = G.skinWeight[4 * k + j]; if (w > 0) own[G.skinIndex[4 * k + j]] = (own[G.skinIndex[4 * k + j]] || 0) + w; }
    const mix = {}; for (const b in own) mix[b] = (mix[b] || 0) + own[b] * (1 - m); for (const b in avg) mix[b] = (mix[b] || 0) + avg[b] * m;
    const e = Object.entries(mix).filter(x => x[1] > 1e-6).sort((a, b) => b[1] - a[1]).slice(0, 4), s = e.reduce((a, b) => a + b[1], 0);
    for (let j = 0; j < 4; j++) { G.skinIndex[4 * k + j] = e[j] ? +e[j][0] : 0; G.skinWeight[4 * k + j] = e[j] ? e[j][1] / s : 0; } };
  // rigid mask: the region goes wholly to the bone that dominates it on average (averaging weights instead shrank the badge to 0.73 of its area at a full raise: two rotations 125 degrees apart blend to a smaller matrix)
  if (G.spec.maskMode !== 'average') { const top = Object.entries(avg).sort((a, b) => b[1] - a[1])[0][0]; for (const b in avg) delete avg[b]; avg[top] = 1; O.bone = +top; }
  O.verts.forEach(k => set(k, 1)); O.feather.forEach(([k, m]) => set(k, m)); O.masked = true; }

/* ------------------------------------------------------------------ pose: from performance parameters to bone rotations */
const qAx = (ax, a) => new T.Quaternion().setFromAxisAngle(ax, a);
function frameQuat(d0, h0, d1, h1) { const m0 = new T.Matrix4().makeBasis(d0, h0, d0.clone().cross(h0)), m1 = new T.Matrix4().makeBasis(d1, h1, d1.clone().cross(h1));
  return new T.Quaternion().setFromRotationMatrix(m1.multiply(m0.transpose())); }
/* pose = { pos:Vector3 (feet, world), yaw, lift, lean, twist, side, headPitch, headYaw, tiptoe,
            arms:{L,R}: { target:Vector3 world palm point, pole:Vector3 child-local, twist, naive } | { dir, bend, pole, twist } | null } */
function solve(G, pose, opt) { opt = opt || {}; const D = G.D, H = D.H, q = BONES.map(() => new T.Quaternion()), drivers = {};
  const rootQ = qAx(V(0, 1, 0), pose.yaw || 0);
  q[0] = rootQ.clone().multiply(qAx(V(1, 0, 0), (pose.lean || 0) * .25));
  q[1] = qAx(V(1, 0, 0), (pose.lean || 0) * .4).multiply(qAx(V(0, 0, 1), (pose.side || 0) * .5));
  q[2] = qAx(V(1, 0, 0), (pose.lean || 0) * .35).multiply(qAx(V(0, 1, 0), pose.twist || 0)).multiply(qAx(V(0, 0, 1), (pose.side || 0) * .5));
  q[3] = qAx(V(1, 0, 0), (pose.headPitch || 0) * .4); q[4] = qAx(V(1, 0, 0), (pose.headPitch || 0) * .6).multiply(qAx(V(0, 1, 0), pose.headYaw || 0));
  const tip = pose.tiptoe || 0; q[BI.footL] = qAx(V(1, 0, 0), tip * .5); q[BI.footR] = qAx(V(1, 0, 0), tip * .5);
  if (pose.kneel) { q[BI.thighL] = qAx(V(1, 0, 0), -pose.kneel); q[BI.thighR] = q[BI.thighL].clone(); q[BI.shinL] = qAx(V(1, 0, 0), pose.kneel * 1.6); q[BI.shinR] = q[BI.shinL].clone(); }
  const rootPos = (pose.pos || V(0, 0, 0)).clone().add(V(0, D.hipY + (pose.lift || 0) + tip * .02 * H, 0));
  let W = world(G, q, rootPos);
  for (const s in SIDES) { const A = pose.arms && pose.arms[s], sx = SIDES[s], d0 = D['d0' + s], h0 = D['h0' + s], iu = BI['upper' + s], ic = BI['clav' + s];
    let arm = A || { dir: V(sx * Math.sin(12 * PI / 180), -Math.cos(12 * PI / 180), .06).normalize(), bend: .2, pole: V(sx * .3, 0, -1), twist: 0 };
    const naive = opt.naive || (A && A.naive);
    for (let pass = 0; pass < (arm.target ? 3 : 1); pass++) {
      const Pc = W[ic], Rp = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(Pc)), Rpi = Rp.clone().invert();
      let d1, bend, g;
      if (arm.target) { // two-bone IK in the clavicle's frame, aiming the palm (not the wrist) at the target
        const S = V(0, 0, 0).setFromMatrixPosition(W[iu]), Wq = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(W[BI['hand' + s]]));
        const palmOff = V(G.pos[3 * G.info.palm[s]], G.pos[3 * G.info.palm[s] + 1], G.pos[3 * G.info.palm[s] + 2]).sub(D.rest['hand' + s]).applyQuaternion(Wq);
        const Tw = arm.target.clone().sub(pass ? palmOff : V(0, 0, 0)).sub(S).applyQuaternion(Rpi);
        const a = D.armA, b = D.armB, c = clamp(Tw.length(), Math.abs(a - b) + 1e-4, a + b - 1e-4), n = Tw.clone().normalize();
        const pole = (arm.pole || V(sx * .5, -.3, -1)).clone(), m = pole.clone().addScaledVector(n, -pole.dot(n)).normalize();
        const al = Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c), -1, 1)); d1 = n.clone().multiplyScalar(Math.cos(al)).addScaledVector(m, Math.sin(al)).normalize();
        bend = PI - Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b), -1, 1));
        const E = d1.clone().multiplyScalar(a), f = n.clone().multiplyScalar(c).sub(E); g = f.addScaledVector(d1, -f.dot(d1)).normalize(); if (!isFinite(g.x) || bend < 1e-3) g = m.clone().negate();
      } else { d1 = arm.dir.clone().normalize(); bend = arm.bend || 0; const pole = (arm.pole || V(sx * .3, 0, -1)).clone(); g = pole.addScaledVector(d1, -pole.dot(d1)).normalize().negate(); }
      const h1 = d1.clone().cross(g).normalize(), Qw = frameQuat(d0, h0, d1, h1); q[iu] = Qw; q[BI['fore' + s]] = qAx(h0, bend);
      const tw = arm.twist || 0; if (naive) { q[BI['tw1' + s]] = new T.Quaternion(); q[BI['tw2' + s]] = new T.Quaternion(); q[BI['hand' + s]] = qAx(d0, tw).multiply(qAx(h0, arm.wrist || 0)); }
      else { q[BI['tw1' + s]] = qAx(d0, tw / 3); q[BI['tw2' + s]] = qAx(d0, tw / 3); q[BI['hand' + s]] = qAx(d0, tw / 3).multiply(qAx(h0, arm.wrist || 0)); }
      // the clavicle shrugs with the raise (a share of elevation above 60 degrees), which spares the shoulder some of its stretch
      const el = Math.acos(clamp(-d1.y, -1, 1)); q[ic] = qAx(V(0, 0, sx), (naive ? 0 : .2) * Math.max(0, el - PI / 3));
      W = world(G, q, rootPos);
      drivers['elbow' + s] = bend; drivers['elev' + s] = el; drivers['fwd' + s] = clamp(Math.atan2(Math.max(0, d1.z), Math.abs(d1.x) + 1e-6) / (PI / 2), 0, 1);
    } }
  const morphW = opt.naive || opt.noCorrect ? MORPHS.map(() => 0) : morphWeights(drivers);
  for (const s in SIDES) if (pose.arms && pose.arms[s] && pose.arms[s].naive) MORPHS.forEach((n, j) => { if (n.endsWith(s)) morphW[j] = 0; });
  return { q, rootPos, W, drivers, morphW }; }
function morphWeights(dr) { return MORPHS.map(n => { const s = n.slice(-1);
  if (n.startsWith('elbow')) return clamp((1 - Math.cos(dr['elbow' + s])) / (1 - Math.cos(KEY.elbow)), 0, 1.25);
  const base = clamp((1 - Math.cos(Math.max(0, dr['elev' + s] - KEY.restElev))) / (1 - Math.cos(KEY.elev - KEY.restElev)), 0, 1.2), f = dr['fwd' + s];
  return (n.startsWith('raiseSide') ? base * (1 - f) : base * f) * KEY.raiseGain; }); }
function world(G, q, rootPos) { const D = G.D, W = [];
  BONES.forEach((n, i) => { const p = PARENT[i], lp = p < 0 ? rootPos : D.rest[n].clone().sub(D.rest[BONES[p]]), L = new T.Matrix4().compose(lp, q[i], V(1, 1, 1)); W[i] = p < 0 ? L : W[p].clone().multiply(L); }); return W; }
function skinMats(G, W) { return W.map((m, i) => m.clone().multiply(new T.Matrix4().makeTranslation(-G.D.rest[BONES[i]].x, -G.D.rest[BONES[i]].y, -G.D.rest[BONES[i]].z))); }

/* ------------------------------------------------------------------ skinning on the CPU (the same sum three.js does on the GPU: morph in rest space, then the weighted matrix sum) */
function skinVertex(G, M, morphW, k, out) { let x = G.pos[3 * k], y = G.pos[3 * k + 1], z = G.pos[3 * k + 2];
  if (morphW) G.morphs.forEach((m, j) => { const w = morphW[j]; if (w) { x += m.delta[3 * k] * w; y += m.delta[3 * k + 1] * w; z += m.delta[3 * k + 2] * w; } });
  let ox = 0, oy = 0, oz = 0; for (let j = 0; j < 4; j++) { const w = G.skinWeight[4 * k + j]; if (!w) continue; const e = M[G.skinIndex[4 * k + j]].elements;
    ox += w * (e[0] * x + e[4] * y + e[8] * z + e[12]); oy += w * (e[1] * x + e[5] * y + e[9] * z + e[13]); oz += w * (e[2] * x + e[6] * y + e[10] * z + e[14]); }
  return (out || V(0, 0, 0)).set(ox, oy, oz); }
function skinAll(G, sol) { const M = skinMats(G, sol.W), out = new Float32Array(G.n * 3), v = V(0, 0, 0); for (let k = 0; k < G.n; k++) { skinVertex(G, M, sol.morphW, k, v); out[3 * k] = v.x; out[3 * k + 1] = v.y; out[3 * k + 2] = v.z; } return out; }

/* ------------------------------------------------------------------ dual-quaternion blend (the reference the correctives are baked from) */
function dqOf(m) { const qr = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(m)), t = V(0, 0, 0).setFromMatrixPosition(m);
  const qd = new T.Quaternion(t.x, t.y, t.z, 0).multiply(qr); qd.x *= .5; qd.y *= .5; qd.z *= .5; qd.w *= .5; return [qr, qd]; }
function dqsVertex(G, M, DQ, k, p) { let r = [0, 0, 0, 0], d = [0, 0, 0, 0], ref = null;
  for (let j = 0; j < 4; j++) { const w = G.skinWeight[4 * k + j]; if (!w) continue; const [qr, qd] = DQ[G.skinIndex[4 * k + j]]; if (!ref) ref = qr; const s = (ref.x * qr.x + ref.y * qr.y + ref.z * qr.z + ref.w * qr.w) < 0 ? -w : w;
    r[0] += s * qr.x; r[1] += s * qr.y; r[2] += s * qr.z; r[3] += s * qr.w; d[0] += s * qd.x; d[1] += s * qd.y; d[2] += s * qd.z; d[3] += s * qd.w; }
  const nrm = Math.hypot(...r); r = r.map(x => x / nrm); d = d.map(x => x / nrm);
  const qr = new T.Quaternion(r[0], r[1], r[2], r[3]), qd = new T.Quaternion(d[0], d[1], d[2], d[3]), tq = qd.clone().multiply(qr.clone().conjugate());
  return p.clone().applyQuaternion(qr).add(V(2 * tq.x, 2 * tq.y, 2 * tq.z)); }
function keyPose(name) { const s = name.slice(-1), sx = SIDES[s], arms = {};
  if (name.startsWith('elbow')) arms[s] = { dir: null, bend: KEY.elbow };
  else if (name.startsWith('raiseSide')) arms[s] = { dir: V(sx * Math.sin(KEY.elev), -Math.cos(KEY.elev), 0), bend: 0 };
  else arms[s] = { dir: V(sx * .08, -Math.cos(KEY.elev), Math.sin(KEY.elev)), bend: 0 };
  return { s, arms }; }
function bakeCorrective(G, name) { const D = G.D, { s, arms } = keyPose(name); const A = arms[s]; if (!A.dir) A.dir = D['d0' + s].clone(); A.pole = V(0, 0, -1).applyAxisAngle(V(0, 1, 0), 0);
  const sol = solve(G, { pos: V(0, 0, 0), arms }, { noCorrect: true, rawKey: true }); const M = skinMats(G, sol.W), DQ = M.map(dqOf), delta = new Float32Array(G.n * 3);
  const orn = new Map(); if (G.ornament && G.spec.mask !== false && G.spec.maskCorrective !== false) { G.ornament.verts.forEach(k => orn.set(k, 1)); G.ornament.feather.forEach(([k, m]) => orn.set(k, Math.max(orn.get(k) || 0, m))); }
  const p = V(0, 0, 0), A4 = new T.Matrix4();
  for (let k = 0; k < G.n; k++) { const part = G.part[k]; if (!(part === 'sleeve' + s || part === 'skin' || part === 'torso')) continue;
    let mixed = false, ref = -1; for (let j = 0; j < 4; j++) if (G.skinWeight[4 * k + j]) { const b = G.skinIndex[4 * k + j]; if (ref < 0) ref = b; else mixed = true; } if (!mixed) continue;
    p.set(G.pos[3 * k], G.pos[3 * k + 1], G.pos[3 * k + 2]); const ideal = dqsVertex(G, M, DQ, k, p);
    const e = new Array(16).fill(0); for (let j = 0; j < 4; j++) { const w = G.skinWeight[4 * k + j]; if (!w) continue; const me = M[G.skinIndex[4 * k + j]].elements; for (let i = 0; i < 16; i++) e[i] += w * me[i]; }
    A4.fromArray(e); const inv = A4.clone().invert(), back = ideal.applyMatrix4(inv), m = 1 - (orn.get(k) || 0);
    delta[3 * k] = (back.x - p.x) * m; delta[3 * k + 1] = (back.y - p.y) * m; delta[3 * k + 2] = (back.z - p.z) * m; }
  // the seam column must carry exactly the delta of the column it duplicates
  return delta; }

/* ------------------------------------------------------------------ measurements */
function ringPts(G, P, arm, i) { const out = []; for (let j = 0; j < arm.segs; j++) { const k = arm.start + i * (arm.segs + 1) + j; out.push(V(P[3 * k], P[3 * k + 1], P[3 * k + 2])); } return out; }
function ringArea(pts) { const c = pts.reduce((a, b) => a.add(b), V(0, 0, 0)).multiplyScalar(1 / pts.length), A = V(0, 0, 0); for (let j = 0; j < pts.length; j++) A.add(pts[j].clone().sub(c).cross(pts[(j + 1) % pts.length].clone().sub(c))); return A.length() / 2; }
// signed volume of the stretch of sleeve between two rings, closed with fans to each end ring's centroid (inverted, collapsed regions count against it)
function zoneVolume(G, P, arm, i0, i1) { let vol = 0; const R = []; for (let i = i0; i <= i1; i++) R.push(ringPts(G, P, arm, i)); const n = arm.segs, o = R[0][0].clone();
  const tri = (a, b, c) => { vol += a.clone().sub(o).dot(b.clone().sub(o).cross(c.clone().sub(o))) / 6; };
  for (let i = 0; i < R.length - 1; i++) for (let j = 0; j < n; j++) { const a = R[i][j], b = R[i][(j + 1) % n], c = R[i + 1][j], d = R[i + 1][(j + 1) % n]; tri(a, c, b); tri(b, c, d); }
  const cen = r => r.reduce((a, b) => a.add(b), V(0, 0, 0)).multiplyScalar(1 / r.length), c0 = cen(R[0]), c1 = cen(R[R.length - 1]);
  for (let j = 0; j < n; j++) { tri(c0, R[0][j], R[0][(j + 1) % n]); tri(c1, R[R.length - 1][(j + 1) % n], R[R.length - 1][j]); }
  return Math.abs(vol); }
function ringsIn(arm, ta, tb) { let i0 = -1, i1 = -1; arm.ringT.forEach((t, i) => { if (t >= ta && i0 < 0) i0 = i; if (t <= tb) i1 = i; }); return [i0, i1]; }
function triArea(P, a, b, c) { const A = V(P[3 * a], P[3 * a + 1], P[3 * a + 2]), Bv = V(P[3 * b], P[3 * b + 1], P[3 * b + 2]), Cv = V(P[3 * c], P[3 * c + 1], P[3 * c + 2]); return Bv.sub(A).cross(Cv.sub(A)).length() / 2; }
// ornament: area ratio, and the shape residual after the best rotation+translation+uniform scale (Horn), as a fraction of the ornament's size
function ornamentMetrics(G, P) { const O = G.ornament; let a0 = 0, a1 = 0; for (let t = 0; t < O.tris.length; t += 3) { a0 += triArea(G.pos, O.tris[t], O.tris[t + 1], O.tris[t + 2]); a1 += triArea(P, O.tris[t], O.tris[t + 1], O.tris[t + 2]); }
  const X = O.verts.map(k => V(G.pos[3 * k], G.pos[3 * k + 1], G.pos[3 * k + 2])), Y = O.verts.map(k => V(P[3 * k], P[3 * k + 1], P[3 * k + 2]));
  const cx = X.reduce((a, b) => a.add(b), V(0, 0, 0)).multiplyScalar(1 / X.length), cy = Y.reduce((a, b) => a.add(b), V(0, 0, 0)).multiplyScalar(1 / Y.length);
  const x = X.map(p => p.clone().sub(cx)), y = Y.map(p => p.clone().sub(cy)); const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < x.length; i++) { const a = x[i].toArray(), b = y[i].toArray(); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S[r][c] += a[r] * b[c]; }
  const [Sxx, Sxy, Sxz] = S[0], [Syx, Syy, Syz] = S[1], [Szx, Szy, Szz] = S[2];
  const N = [[Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx], [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz], [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy], [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz]];
  const ev = jacobiMaxEig(N), qq = new T.Quaternion(ev[1], ev[2], ev[3], ev[0]).normalize();
  let num = 0, den = 0; x.forEach((p, i) => { const r = p.clone().applyQuaternion(qq); num += r.dot(y[i]); den += p.lengthSq(); }); const sc = num / den;
  let err = 0; x.forEach((p, i) => { err += p.clone().applyQuaternion(qq).multiplyScalar(sc).distanceToSquared(y[i]); });
  let b0 = 0, b1 = 0, bmin = Infinity, bmax = 0; for (let t = 0; t < O.band.length; t += 3) { const r0 = triArea(G.pos, O.band[t], O.band[t + 1], O.band[t + 2]), r1 = triArea(P, O.band[t], O.band[t + 1], O.band[t + 2]); b0 += r0; b1 += r1; if (r0 > 1e-12) { bmin = Math.min(bmin, r1 / r0); bmax = Math.max(bmax, r1 / r0); } }
  const size = Math.sqrt(a0); return { areaRatio: a1 / a0, shapeResidual: Math.sqrt(err / x.length) / size, scale: sc, areaRest: a0, bandRatio: b1 / b0, bandMin: bmin, bandMax: bmax }; }
function jacobiMaxEig(A) { const n = 4, a = A.map(r => r.slice()), v = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  for (let sweep = 0; sweep < 60; sweep++) { let off = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q]; if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) { if (Math.abs(a[p][q]) < 1e-30) continue; const th = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = v[k][p], vkq = v[k][q]; v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq; } } }
  let best = 0; for (let i = 1; i < n; i++) if (a[i][i] > a[best][best]) best = i; return [v[0][best], v[1][best], v[2][best], v[3][best]]; }
function armMetrics(G, P, s) { const arm = G.info.arms[s], a = arm.a, b = arm.b, H = G.D.H;
  const z = (ta, tb) => ringsIn(arm, ta, tb);
  const [e0, e1] = z(a - .07 * H, a + .07 * H), [f0, f1] = z(a + .02 * H, a + b - .005 * H), [s0, s1] = z(0, .1 * H);
  let minA = Infinity; for (let i = f0; i <= f1; i++) minA = Math.min(minA, ringArea(ringPts(G, P, arm, i)));
  return { elbowVol: zoneVolume(G, P, arm, e0, e1), foreVol: zoneVolume(G, P, arm, f0, f1), shoulderVol: zoneVolume(G, P, arm, s0, s1), foreMinRing: minA }; }

const SPECS = [
  { name: 'CHILD 1', role: 'the birthday child', H: 1.02, dress: true, shortSleeve: true, hair: 'bun', ornament: 'bow', ang: -48, colors: { top: 0xc9566a, skin: 0xd9a27c, hair: 0x3a2416, shoes: 0x7a2630, socks: 0xf2ece4, legs: 0xf2ece4 } },
  { name: 'CHILD 2', role: 'carries the layers', H: 1.2, bulky: true, hair: 'short', ornament: 'sleeve', ang: 50, colors: { top: 0x2f6f8f, skin: 0xc68a62, hair: 0x18120e, shoes: 0x2a2a2a, socks: 0xdddddd, legs: 0x2b3140 } },
  { name: 'CHILD 3', role: 'ices, pipes and writes', H: 1.1, hair: 'pigtails', ang: -112, colors: { top: 0x5d8a45, skin: 0xe0b090, hair: 0x7a4a22, shoes: 0x5a3a2a, socks: 0xdcd2c4, legs: 0x6a4a3a } },
  { name: 'CHILD 4', role: 'places and lights the candles', H: 1.15, hair: 'cap', ang: 110, colors: { top: 0xc0502e, skin: 0xa8714e, hair: 0x120c0a, cap: 0x24305a, shoes: 0x303030, socks: 0xd8d8d8, legs: 0x3a3f2c } }];
return { SPECS, BONES, PARENT, BI, MORPHS, KEY, dims, buildChild, solve, world, skinMats, skinVertex, skinAll, armMetrics, ornamentMetrics, ringArea, ringPts, zoneVolume, morphWeights, V };
});
