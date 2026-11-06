/* THE BLOW — one handle set, three surfaces, one 10 s score.
   Scene coordinates: a 600 x 1000 page, y down. Shared by index.html (browser) and the node tests / renderers. */
(function (root) {
  const DUR = 10, STEP_HZ = 11.8;

  // ---------------------------------------------------------------- surfaces (rest rects for the mesh) and chosen families
  const SURF = {
    face: { rect: [120, 20, 360, 430], grid: [36, 43], family: 'similarity',
      why: 'Cheeks must swell. Similarity allows local uniform scale, so the engraved lines stay evenly spaced and do not shear; rigid refuses the swell (the cheek slides instead of filling); affine shears the hatching beside the mouth.' },
    flame: { rect: [-20, -92, 40, 100], grid: [6, 16], family: 'affine',
      why: 'A flame is gas: under breath it leans, thins and stretches. Affine lets it shear and lengthen; similarity and rigid keep its width, so it bends like a solid rod.' },
    paper: { rect: [25, 942, 550, 36], grid: [110, 4], family: 'rigid',
      why: 'Paper does not stretch. Rigid keeps the streamer the same width round the bend and the letters the same size; similarity swells and shrinks it where the curve tightens; affine shears the letters.' },
  };

  // ---------------------------------------------------------------- the handle set. Face handles in scene px (face centre 300,250).
  // kind p = point, l = line segment [ax,ay,bx,by]. anchor = never moved by the score (feature protection / frame).
  const FACE = [
    // frame anchors (the archive plate's edge and the skull)
    ['plateTL', 'p', [128, 28]], ['plateTR', 'p', [472, 28]], ['plateBL', 'p', [128, 442]], ['plateBR', 'p', [472, 442]],
    ['crown', 'p', [300, 62]], ['templeL', 'p', [194, 176]], ['templeR', 'p', [406, 176]], ['earL', 'p', [182, 258]], ['earR', 'p', [418, 258]],
    // eyes: corners and lids
    ['eyeLin', 'p', [276, 218]], ['eyeLout', 'p', [232, 216]], ['eyeLup', 'p', [254, 208]], ['eyeLlo', 'p', [254, 227]],
    ['eyeRin', 'p', [324, 218]], ['eyeRout', 'p', [368, 216]], ['eyeRup', 'p', [346, 208]], ['eyeRlo', 'p', [346, 227]],
    // nose
    ['noseTip', 'p', [300, 282]], ['alaL', 'p', [284, 288]], ['alaR', 'p', [316, 288]],
    // mouth: corners and the inner lip edges (the parted gap)
    ['mouthL', 'p', [272, 330]], ['mouthR', 'p', [328, 330]], ['lipUin', 'p', [300, 328]], ['lipLin', 'p', [300, 334]],
    // cheeks, jaw, chin, neck
    ['cheekL', 'p', [242, 290]], ['cheekR', 'p', [358, 290]], ['jawL', 'p', [232, 368]], ['jawR', 'p', [368, 368]],
    ['chin', 'p', [300, 398]], ['neckL', 'p', [262, 438]], ['neckR', 'p', [338, 438]],
    // line handles
    ['browL', 'l', [228, 194, 278, 190]], ['browR', 'l', [322, 190, 372, 194]],
    ['lipUL', 'l', [272, 330, 300, 320]], ['lipUR', 'l', [300, 320, 328, 330]],
    ['lipLL', 'l', [272, 330, 300, 344]], ['lipLR', 'l', [300, 344, 328, 330]],
    ['cheekLineL', 'l', [196, 276, 212, 344]], ['cheekLineR', 'l', [404, 276, 388, 344]],
  ];
  const ANCHORS = new Set(['plateTL', 'plateTR', 'plateBL', 'plateBR', 'crown', 'templeL', 'templeR', 'earL', 'earR', 'neckL', 'neckR']);

  // seven candles in a ring on the cake top (centre 300,640, rx 104, ry 22); flame base = wick at candle top
  const CAKE = { cx: 300, top: 640, rx: 150, ry: 40, body: 120 };
  const CANDLES = [];
  for (let k = 0; k < 7; k++) {
    const x = 300 - 104 * Math.cos((k + .5) * Math.PI / 7), y = 640 + (k % 2 ? 12 : -8);
    CANDLES.push({ x, y: y - 34, base: y });
  }
  // flame handles, in flame-local px (wick at 0,0, up is -y); each candle gets its own copy
  const FLAME = [['wick', 'p', [0, 0]], ['tip', 'p', [0, -84]], ['sideL', 'p', [-8, -26]], ['sideR', 'p', [8, -26]], ['spineLo', 'l', [0, 0, 0, -34]], ['spineHi', 'l', [0, -34, 0, -64]]];

  // streamer: flat archived paper strip, spine of 10 line handles + 2 end points
  const PAPER_N = 10, PAPER_LEN = 550, PAPER_Y = 960, SEG = PAPER_LEN / PAPER_N;

  function buildHandles() {
    const H = [];
    for (const [id, k, c] of FACE) H.push({ id, surf: 'face', kind: k, rest: c.slice(), anchor: ANCHORS.has(id) });
    CANDLES.forEach((cd, i) => { for (const [id, k, c] of FLAME) {
      const r = k === 'p' ? [cd.x + c[0], cd.y + c[1]] : [cd.x + c[0], cd.y + c[1], cd.x + c[2], cd.y + c[3]];
      H.push({ id: 'f' + i + '.' + id, surf: 'flame', inst: i, kind: k, rest: r, anchor: id === 'wick' }); } });
    for (let i = 0; i < PAPER_N; i++) H.push({ id: 'paper' + i, surf: 'paper', kind: 'l', rest: [25 + i * SEG, PAPER_Y, 25 + (i + 1) * SEG, PAPER_Y] });
    // the four corners of the strip (the only handles across its width)
    for (const id of ['paperLt', 'paperLb', 'paperRt', 'paperRb']) H.push({ id, surf: 'paper', kind: 'p', rest: [id[5] === 'L' ? 25 : 575, PAPER_Y + (id[6] === 't' ? -18 : 18)] });
    return H;
  }

  // ---------------------------------------------------------------- poses (offsets in px; key 'id' for points, 'id:a' / 'id:b' for line ends)
  const POSES = {
    REST: {},
    FULL: { // breath held: cheeks fill, lips pressed and pushed, nostrils flare, brows lift, lower lids pushed up by the cheeks
      cheekL: [-13, -4], cheekR: [13, -4], 'cheekLineL:a': [-10, -2], 'cheekLineL:b': [-15, 0], 'cheekLineR:a': [10, -2], 'cheekLineR:b': [15, 0],
      jawL: [-6, 2], jawR: [6, 2], mouthL: [7, 0], mouthR: [-7, 0], lipUin: [0, 3], lipLin: [0, -3],
      'lipUL:a': [7, 0], 'lipUL:b': [0, -2], 'lipUR:a': [0, -2], 'lipUR:b': [-7, 0], 'lipLL:a': [7, 0], 'lipLL:b': [0, 2], 'lipLR:a': [0, 2], 'lipLR:b': [-7, 0],
      alaL: [-3, 0], alaR: [3, 0], 'browL:a': [0, -5], 'browL:b': [0, -6], 'browR:a': [0, -6], 'browR:b': [0, -5], eyeLlo: [0, -3], eyeRlo: [0, -3],
    },
    BLOW: { // the breath: lips purse into an O, cheeks still round, eyes squeeze
      cheekL: [-8, -3], cheekR: [8, -3], 'cheekLineL:a': [-6, -1], 'cheekLineL:b': [-9, 0], 'cheekLineR:a': [6, -1], 'cheekLineR:b': [9, 0],
      jawL: [-3, 3], jawR: [3, 3], chin: [0, 3], mouthL: [14, 1], mouthR: [-14, 1], lipUin: [0, -5], lipLin: [0, 8],
      'lipUL:a': [14, 1], 'lipUL:b': [0, -4], 'lipUR:a': [0, -4], 'lipUR:b': [-14, 1], 'lipLL:a': [14, 1], 'lipLL:b': [0, 8], 'lipLR:a': [0, 8], 'lipLR:b': [-14, 1],
      'browL:a': [0, -2], 'browL:b': [0, 1], 'browR:a': [0, 1], 'browR:b': [0, -2], eyeLup: [0, 3], eyeRup: [0, 3], eyeLlo: [0, -2], eyeRlo: [0, -2],
    },
    SPENT: { // breath gone: cheeks hollow a little, mouth loose and open
      cheekL: [3, 1], cheekR: [-3, 1], 'cheekLineL:a': [3, 0], 'cheekLineL:b': [3, 0], 'cheekLineR:a': [-3, 0], 'cheekLineR:b': [-3, 0],
      mouthL: [5, 1], mouthR: [-5, 1], lipUin: [0, -1], lipLin: [0, 4], 'lipLL:b': [0, 4], 'lipLR:a': [0, 4], 'lipUL:a': [5, 1], 'lipUR:b': [-5, 1], 'lipLL:a': [5, 1], 'lipLR:b': [-5, 1],
      jawL: [0, 2], jawR: [0, 2], chin: [0, 3],
    },
    SMILE: { // after: the corners lift, the cheeks rise under the eyes
      mouthL: [-5, -6], mouthR: [5, -6], 'lipUL:a': [-5, -6], 'lipUR:b': [5, -6], 'lipLL:a': [-5, -6], 'lipLR:b': [5, -6], lipLin: [0, 1], 'lipLL:b': [0, 1], 'lipLR:a': [0, 1],
      cheekL: [-3, -6], cheekR: [3, -6], 'cheekLineL:a': [-2, -3], 'cheekLineR:a': [2, -3], eyeLlo: [0, -3], eyeRlo: [0, -3], eyeLup: [0, 1], eyeRup: [0, 1],
    },
  };
  const KEYS = [[0, 'REST'], [2.6, 'REST'], [3.75, 'FULL'], [4.1, 'FULL'], [4.5, 'BLOW'], [5.4, 'BLOW'], [6.3, 'SPENT'], [7.6, 'SMILE'], [10, 'SMILE']];

  // ---------------------------------------------------------------- the device: hand turns six detents, the machine steps the streamer in 16 steps at 11.8/s
  const HAND = [0.42, 0.5, 0.6, 0.68, 0.78, 0.9]; // quiet detents under the hand
  const STEP0 = 1.0, NSTEP = 16;
  const STEPS = Array.from({ length: NSTEP }, (_, k) => STEP0 + (k + 1) / STEP_HZ);
  function curlAt(t) { // stepped value with a 40 ms settle per step
    let c = 0; for (const s of STEPS) c += smooth((t - s + .04) / .04); return c / NSTEP;
  }

  // ---------------------------------------------------------------- the breath and the candles going out
  const MOUTH = [300, 331];
  const BREATH0 = 4.2; // lips part
  const OUT_ORDER = [3, 2, 4, 1, 5, 0, 6];
  const OUT_AT = {}; OUT_ORDER.forEach((c, k) => OUT_AT[c] = 4.62 + k * 0.075 + (k % 2) * 0.012);
  function breathAt(t, i) { // strength 0..1 at candle i, the front travels from the mouth at ~1100 px/s
    const cd = CANDLES[i], d = Math.hypot(cd.x - MOUTH[0], cd.y - MOUTH[1]), t0 = BREATH0 + d / 1100;
    return smooth((t - t0) / .22) * (1 - smooth((t - 5.45) / .45));
  }
  function litAt(t, i) { return 1 - smooth((t - OUT_AT[i]) / .11); }
  function lightAt(t) { let s = 0; for (let i = 0; i < 7; i++) s += litAt(t, i); return s / 7; }

  // ---------------------------------------------------------------- deterministic noise for flicker
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }
  function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  // pose offsets at time t (smoothstep between keys)
  function poseAt(t, poses) {
    poses = poses || POSES;
    let a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (let k = 0; k < KEYS.length - 1; k++) if (t >= KEYS[k][0] && t <= KEYS[k + 1][0]) { a = KEYS[k]; b = KEYS[k + 1]; break; }
    if (t > KEYS[KEYS.length - 1][0]) a = b;
    const u = a === b ? 0 : smooth((t - a[0]) / (b[0] - a[0])), A = poses[a[1]] || {}, B = poses[b[1]] || {};
    const out = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) { const p = A[key] || [0, 0], q = B[key] || [0, 0]; out[key] = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]; }
    return out;
  }

  // the streamer's target spine for curl c (0 flat .. 1 wrapped). Arc length preserved: a turtle walk outward from the centre.
  const WRAP = (function () {
    // wrapped path: left tail rising and curling out, the front of the cake (half ellipse), right tail; then resample to 10 equal segments
    const pts = [], E = { cx: 300, cy: 718, rx: 168, ry: 44 };
    for (let k = 0; k <= 200; k++) { const a = Math.PI - k / 200 * Math.PI; pts.push([E.cx + E.rx * Math.cos(a), E.cy + E.ry * Math.sin(a)]); }
    // tails: continue upward from each end, curling outward
    function tail(p, dir) { const out = []; let x = p[0], y = p[1], ang = -Math.PI / 2; for (let k = 0; k < 120; k++) { ang += dir * 0.022; x += Math.cos(ang); y += Math.sin(ang); out.push([x, y]); } return out; }
    const L = tail(pts[0], -1).reverse(), R = tail(pts[pts.length - 1], 1);
    const path = L.concat(pts, R);
    const cum = [0]; for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]));
    const tot = cum[cum.length - 1], mid = tot / 2, res = [];
    for (let i = 0; i <= PAPER_N; i++) { const s = mid + (i - PAPER_N / 2) * SEG; let k = 1; while (k < cum.length - 1 && cum[k] < s) k++; const u = (s - cum[k - 1]) / (cum[k] - cum[k - 1]); res.push([path[k - 1][0] + (path[k][0] - path[k - 1][0]) * u, path[k - 1][1] + (path[k][1] - path[k - 1][1]) * u]); }
    const ang = []; for (let i = 0; i < PAPER_N; i++) ang.push(Math.atan2(res[i + 1][1] - res[i][1], res[i + 1][0] - res[i][0]));
    return { res, ang, centre: res[PAPER_N / 2] };
  })();
  function paperSpine(c) {
    const mid = PAPER_N / 2, P = new Array(PAPER_N + 1);
    // the centre lifts first; the ends follow (bend propagates outward), each segment angle = progressive share of its wrapped angle
    P[mid] = [300 + (WRAP.centre[0] - 300) * smooth(c * 1.4), PAPER_Y + (WRAP.centre[1] - PAPER_Y) * smooth(c * 1.4)];
    const angAt = i => { const far = Math.abs(i + .5 - mid) / mid; const u = smooth((c - far * .45) / .55); return WRAP.ang[i] * u; };
    for (let i = mid; i < PAPER_N; i++) { const a = angAt(i); P[i + 1] = [P[i][0] + SEG * Math.cos(a), P[i][1] + SEG * Math.sin(a)]; }
    for (let i = mid - 1; i >= 0; i--) { const a = angAt(i); P[i] = [P[i + 1][0] - SEG * Math.cos(a), P[i + 1][1] - SEG * Math.sin(a)]; }
    return P;
  }

  // ---------------------------------------------------------------- all handle targets at time t
  function targetsAt(t, H, poses) {
    const off = poseAt(t, poses), c = curlAt(t), spine = paperSpine(c);
    const T = {};
    for (const h of H) {
      let q = h.rest.slice();
      if (h.surf === 'paper') {
        if (h.kind === 'l') { const i = +h.id.slice(5); q = [spine[i][0], spine[i][1], spine[i + 1][0], spine[i + 1][1]]; }
        else { const e = h.id[5] === 'L' ? 0 : PAPER_N, a = spine[e], b = spine[e === 0 ? 1 : PAPER_N - 1], s = e === 0 ? 1 : -1;
          const tx = (b[0] - a[0]) * s / SEG, ty = (b[1] - a[1]) * s / SEG, n = h.id[6] === 't' ? -18 : 18; q = [a[0] - ty * n, a[1] + tx * n]; }
      } else if (h.surf === 'flame') {
        const i = h.inst, cd = CANDLES[i], loc = (x, y) => flameNode(t, i, x - cd.x, y - cd.y);
        if (h.kind === 'p') q = loc(h.rest[0], h.rest[1]); else q = loc(h.rest[0], h.rest[1]).concat(loc(h.rest[2], h.rest[3]));
      }
      if (h.kind === 'p') { const o = off[h.id]; if (o) { q[0] += o[0]; q[1] += o[1]; } }
      else { const oa = off[h.id + ':a'], ob = off[h.id + ':b']; if (oa) { q[0] += oa[0]; q[1] += oa[1]; } if (ob) { q[2] += ob[0]; q[3] += ob[1]; } }
      T[h.id] = q;
    }
    return T;
  }
  // a node on the flame spine (local x,y; y<0 up). Returns scene coords.
  function flameNode(t, i, x, y) {
    const cd = CANDLES[i], f = Math.min(1, -y / 84); // 0 at wick, 1 at tip
    const W = breathAt(t, i), lit = litAt(t, i);
    // flicker: slow sway and a quick shiver, both smooth in t
    const sway = (vnoise(t * 2.1 + i * 13.7) - .5) * 5 + (vnoise(t * 7.3 + i * 5.1) - .5) * 2;
    const stretch = 1 + .08 * (vnoise(t * 3.1 + i * 9.9) - .5);
    // breath: away from the mouth (outward and down toward the viewer); the centre flame flattens, the outer ones lie over
    const sx = (cd.x - MOUTH[0]) / 104, turb = (vnoise(t * 16 + i * 3.3) - .5) * 9 * W;
    const bendX = W * (sx * 74 + (sx === 0 ? 0 : Math.sign(sx) * 10)) * f * f + turb * f * f;
    const bendY = W * (30 + 22 * (1 - Math.abs(sx))) * f * f;
    const lengthen = 1 + W * .35 * f * Math.abs(sx);
    // going out: the spine collapses to the wick
    const k = .1 + .9 * lit;
    const thin = 1 - .4 * W;
    const lx = (x * thin + sway * f * f * (1 - W) + bendX) * k, ly = (y * stretch * lengthen + bendY) * k;
    return [cd.x + lx, cd.y + ly];
  }

  // ---------------------------------------------------------------- sound events for the score (shared by browser and offline mixer)
  function events() {
    const E = [];
    HAND.forEach(t => E.push({ t, kind: 'detent' }));
    STEPS.forEach((t, k) => E.push({ t, kind: 'step', k }));
    E.push({ t: 2.55, kind: 'inhale', dur: 1.25 });
    E.push({ t: BREATH0 - .02, kind: 'blow', dur: 1.75 });
    Object.keys(OUT_AT).forEach(i => E.push({ t: OUT_AT[i] + .05, kind: 'out', i: +i }));
    E.push({ t: Math.max(...Object.values(OUT_AT)) + .12, kind: 'wash' });
    E.push({ t: 7.55, kind: 'breathout', dur: .5 });
    return E.sort((a, b) => a.t - b.t);
  }

  const api = { DUR, STEP_HZ, SURF, CAKE, CANDLES, MOUTH, POSES, KEYS, HAND, STEPS, OUT_AT, OUT_ORDER, PAPER_N, PAPER_LEN, PAPER_Y,
    buildHandles, poseAt, targetsAt, curlAt, breathAt, litAt, lightAt, paperSpine, events, smooth, vnoise, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SCENE = api;
})(typeof self !== 'undefined' ? self : this);
