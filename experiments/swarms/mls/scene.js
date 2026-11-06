/* THE BLOW — the handle set, the poses, and what the deformed picture measures.
   Scene coordinates: a 600 x 1000 page, y down. Shared by index.html and the node tests / renderers. */
(function (root) {
  const STEP_HZ = 11.8;
  const SURF = {
    face: { rect: [120, 20, 360, 430], grid: [36, 43], family: 'similarity', name: 'FACE',
      why: 'Cheeks must swell. Similarity allows local uniform scale, so the engraved lines swell evenly and keep their spacing. Rigid refuses the swell (area held, so the breath is small). Affine swells too but shears the hatching beside the mouth.' },
    flame: { rect: [-20, -92, 40, 100], grid: [6, 16], family: 'affine', name: 'FLAMES',
      why: 'A flame is gas: under breath it leans, thins and stretches. Affine lets it shear and lengthen. Similarity and rigid hold its proportions, so it swings over like a stiff petal.' },
    paper: { rect: [25, 942, 550, 36], grid: [110, 4], family: 'rigid', name: 'STREAMER',
      why: 'Paper does not stretch. Rigid keeps the streamer one width round the bend and the letters one size. Similarity swells and pinches it along the curve. Affine has handles only along the spine, so across the strip it is under-determined and the width wanders.' },
  };
  const FAMILIES = ['affine', 'similarity', 'rigid'];

  // ---------------------------------------------------------------- the handle set. kind p = point, l = segment [ax,ay,bx,by]
  const FACE = [
    ['plateTL', 'p', [128, 28]], ['plateTR', 'p', [472, 28]], ['plateBL', 'p', [128, 442]], ['plateBR', 'p', [472, 442]],
    ['crown', 'p', [300, 62]], ['templeL', 'p', [194, 176]], ['templeR', 'p', [406, 176]], ['earL', 'p', [182, 258]], ['earR', 'p', [418, 258]],
    ['eyeLin', 'p', [276, 218]], ['eyeLout', 'p', [232, 216]], ['eyeLup', 'p', [254, 208]], ['eyeLlo', 'p', [254, 227]],
    ['eyeRin', 'p', [324, 218]], ['eyeRout', 'p', [368, 216]], ['eyeRup', 'p', [346, 208]], ['eyeRlo', 'p', [346, 227]],
    ['noseTip', 'p', [300, 282]], ['alaL', 'p', [284, 288]], ['alaR', 'p', [316, 288]],
    ['mouthL', 'p', [272, 330]], ['mouthR', 'p', [328, 330]], ['lipUin', 'p', [300, 328]], ['lipLin', 'p', [300, 334]],
    ['cheekL', 'p', [242, 290]], ['cheekR', 'p', [358, 290]], ['jawL', 'p', [232, 368]], ['jawR', 'p', [368, 368]],
    ['chin', 'p', [300, 398]], ['neckL', 'p', [262, 438]], ['neckR', 'p', [338, 438]],
    ['browL', 'l', [228, 194, 278, 190]], ['browR', 'l', [322, 190, 372, 194]],
    ['lipUL', 'l', [272, 330, 300, 320]], ['lipUR', 'l', [300, 320, 328, 330]],
    ['lipLL', 'l', [272, 330, 300, 344]], ['lipLR', 'l', [300, 344, 328, 330]],
    ['cheekLineL', 'l', [196, 276, 212, 344]], ['cheekLineR', 'l', [404, 276, 388, 344]],
  ];
  const ANCHORS = new Set(['plateTL', 'plateTR', 'plateBL', 'plateBR', 'crown', 'templeL', 'templeR', 'earL', 'earR', 'neckL', 'neckR']);
  const GROUPS = { // which handles each SELECT target owns (drawn as marks while it is worked)
    STREAMER: h => h.surf === 'paper',
    CHEEKS: h => /cheek|jaw|ala|brow|eye.lo/.test(h.id),
    LIPS: h => /mouth|lip/.test(h.id),
  };

  const CANDLES = [];
  for (let k = 0; k < 7; k++) { const x = 300 - 104 * Math.cos((k + .5) * Math.PI / 7), y = 640 + (k % 2 ? 12 : -8); CANDLES.push({ x, y: y - 34, base: y }); }
  const FLAME = [['wick', 'p', [0, 0]], ['tip', 'p', [0, -84]], ['sideL', 'p', [-8, -26]], ['sideR', 'p', [8, -26]], ['spineLo', 'l', [0, 0, 0, -34]], ['spineHi', 'l', [0, -34, 0, -64]]];
  const PAPER_N = 10, PAPER_LEN = 550, PAPER_Y = 960, SEG = PAPER_LEN / PAPER_N, PAPER_HALF = 18;

  function buildHandles() {
    const H = [];
    for (const [id, k, c] of FACE) H.push({ id, surf: 'face', kind: k, rest: c.slice(), anchor: ANCHORS.has(id) });
    CANDLES.forEach((cd, i) => { for (const [id, k, c] of FLAME) {
      const r = k === 'p' ? [cd.x + c[0], cd.y + c[1]] : [cd.x + c[0], cd.y + c[1], cd.x + c[2], cd.y + c[3]];
      H.push({ id: 'f' + i + '.' + id, surf: 'flame', inst: i, kind: k, rest: r, anchor: id === 'wick' }); } });
    for (let i = 0; i < PAPER_N; i++) H.push({ id: 'paper' + i, surf: 'paper', kind: 'l', rest: [25 + i * SEG, PAPER_Y, 25 + (i + 1) * SEG, PAPER_Y] });
    for (const id of ['paperLt', 'paperLb', 'paperRt', 'paperRb']) H.push({ id, surf: 'paper', kind: 'p', rest: [id[5] === 'L' ? 25 : 575, PAPER_Y + (id[6] === 't' ? -PAPER_HALF : PAPER_HALF)] });
    return H;
  }

  // ---------------------------------------------------------------- poses at full amount (offsets, px). 'id' for points, 'id:a'/'id:b' for segment ends
  const POSES = {
    CHEEKS: { cheekL: [-19, -5], cheekR: [19, -5], 'cheekLineL:a': [-14, -2], 'cheekLineL:b': [-21, 0], 'cheekLineR:a': [14, -2], 'cheekLineR:b': [21, 0],
      jawL: [-9, 3], jawR: [9, 3], lipUin: [0, 3], lipLin: [0, -3], alaL: [-3, 0], alaR: [3, 0],
      'browL:a': [0, -5], 'browL:b': [0, -6], 'browR:a': [0, -6], 'browR:b': [0, -5], eyeLlo: [0, -3], eyeRlo: [0, -3] },
    PURSE: { mouthL: [14, 1], mouthR: [-14, 1], 'lipUL:a': [14, 1], 'lipUR:b': [-14, 1], 'lipLL:a': [14, 1], 'lipLR:b': [-14, 1],
      'lipUL:b': [0, -3], 'lipUR:a': [0, -3], 'lipLL:b': [0, 3], 'lipLR:a': [0, 3] },
    OPEN: { lipUin: [0, -8], lipLin: [0, 13], 'lipUL:b': [0, -4], 'lipUR:a': [0, -4], 'lipLL:b': [0, 9], 'lipLR:a': [0, 9], chin: [0, 3], jawL: [0, 2], jawR: [0, 2],
      eyeLup: [0, 3], eyeRup: [0, 3] },
    SMILE: { mouthL: [-5, -6], mouthR: [5, -6], 'lipUL:a': [-5, -6], 'lipUR:b': [5, -6], 'lipLL:a': [-5, -6], 'lipLR:b': [5, -6], lipLin: [0, 1], 'lipLL:b': [0, 1], 'lipLR:a': [0, 1],
      cheekL: [-3, -6], cheekR: [3, -6], 'cheekLineL:a': [-2, -3], 'cheekLineR:a': [2, -3], eyeLlo: [0, -3], eyeRlo: [0, -3], eyeLup: [0, 1], eyeRup: [0, 1] },
  };
  const MOUTH_IDS = /^(mouth|lip)/;

  // face offsets for a face state {fill, purse, open, smile, aim}. aim in degrees of breath direction (+ = to her left, our right)
  function faceOffsets(f) {
    const out = {}; const add = (P, k) => { if (!k) return; for (const key in P) { const o = out[key] || (out[key] = [0, 0]); o[0] += P[key][0] * k; o[1] += P[key][1] * k; } };
    add(POSES.CHEEKS, f.fill); add(POSES.PURSE, f.purse); add(POSES.OPEN, f.open); add(POSES.SMILE, f.smile || 0);
    const ax = (f.aim || 0) * .55; // the mouth slides toward the aim
    for (const [id, k] of FACE) if (MOUTH_IDS.test(id)) { if (k === 'p') add({ [id]: [ax, 0] }, 1); else add({ [id + ':a']: [ax, 0], [id + ':b']: [ax, 0] }, 1); }
    add({ noseTip: [ax * .4, 0] }, 1);
    return out;
  }

  // the streamer's spine for curl c (0 flat .. 1 wrapped), lifted by `lift` px. Arc length preserved (a turtle walk from the centre).
  const WRAP = (function () {
    const pts = [], E = { cx: 300, cy: 718, rx: 168, ry: 44 };
    for (let k = 0; k <= 200; k++) { const a = Math.PI - k / 200 * Math.PI; pts.push([E.cx + E.rx * Math.cos(a), E.cy + E.ry * Math.sin(a)]); }
    function tail(p, dir) { const o = []; let x = p[0], y = p[1], ang = -Math.PI / 2; for (let k = 0; k < 120; k++) { ang += dir * .022; x += Math.cos(ang); y += Math.sin(ang); o.push([x, y]); } return o; }
    const path = tail(pts[0], -1).reverse().concat(pts, tail(pts[pts.length - 1], 1));
    const cum = [0]; for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]));
    const mid = cum[cum.length - 1] / 2, res = [];
    for (let i = 0; i <= PAPER_N; i++) { const s = mid + (i - PAPER_N / 2) * SEG; let k = 1; while (k < cum.length - 1 && cum[k] < s) k++; const u = (s - cum[k - 1]) / (cum[k] - cum[k - 1]); res.push([path[k - 1][0] + (path[k][0] - path[k - 1][0]) * u, path[k - 1][1] + (path[k][1] - path[k - 1][1]) * u]); }
    const ang = []; for (let i = 0; i < PAPER_N; i++) ang.push(Math.atan2(res[i + 1][1] - res[i][1], res[i + 1][0] - res[i][0]));
    return { ang, centre: res[PAPER_N / 2] };
  })();
  function paperSpine(c, lift) {
    const mid = PAPER_N / 2, P = new Array(PAPER_N + 1), u0 = smooth(c * 1.4);
    P[mid] = [300 + (WRAP.centre[0] - 300) * u0, PAPER_Y + (WRAP.centre[1] - PAPER_Y) * u0 - (lift || 0) * u0];
    const angAt = i => { const far = Math.abs(i + .5 - mid) / mid; return WRAP.ang[i] * smooth((c - far * .45) / .55); };
    for (let i = mid; i < PAPER_N; i++) { const a = angAt(i); P[i + 1] = [P[i][0] + SEG * Math.cos(a), P[i][1] + SEG * Math.sin(a)]; }
    for (let i = mid - 1; i >= 0; i--) { const a = angAt(i); P[i] = [P[i + 1][0] - SEG * Math.cos(a), P[i + 1][1] - SEG * Math.sin(a)]; }
    return P;
  }

  // a node on a flame spine (local x,y; y<0 up) under breath strength W (0..~1.3), direction dir (radians, 0 = straight down the page,
  // + toward our right), lit (1 burning .. 0 out). Returns scene coords.
  function flameNode(t, i, x, y, W, dir, lit, size) {
    size = size || 1; x *= size; y *= size;
    const cd = CANDLES[i], f = Math.min(1, -y / (84 * size));
    const sway = (vnoise(t * 2.1 + i * 13.7) - .5) * 5 + (vnoise(t * 7.3 + i * 5.1) - .5) * 2;
    const stretch = 1 + .08 * (vnoise(t * 3.1 + i * 9.9) - .5);
    const turb = (vnoise(t * 16 + i * 3.3) - .5) * 10 * Math.min(1, W);
    const sx = Math.sin(dir), sy = Math.cos(dir);
    const bendX = W * (sx * 150 + Math.sign(sx) * 18) * f * f + turb * f * f;
    // the downward bend is capped so the spine stays ordered (dy/df < 0 needs bendY < 42 at the tip): a flame never turns inside out
    const Wc = Math.min(W, 1.3), bendY = Wc * (14 + 14 * (1 - Math.abs(sx))) * f * f * Math.max(.3, sy);
    const lengthen = 1 + Wc * (.35 * f * Math.abs(sx) - .3 * (1 - Math.abs(sx))); // outer flames stream longer; the centre one flattens toward us (shorter)
    const thin = 1 - .4 * Math.min(1, W), k = .1 + .9 * lit;
    return [cd.x + (x * thin + sway * f * f * Math.max(0, 1 - W) + bendX) * k, cd.y + (y * stretch * lengthen + bendY) * k];
  }

  // all handle targets for a world state: { face:{fill,purse,open,smile,aim}, curl, lift, flames:[{W,dir,lit}], t }
  function targets(H, st) {
    const off = faceOffsets(st.face), spine = paperSpine(st.curl, st.lift), T = {};
    for (const h of H) {
      let q = h.rest.slice();
      if (h.surf === 'paper') {
        if (h.kind === 'l') { const i = +h.id.slice(5); q = [spine[i][0], spine[i][1], spine[i + 1][0], spine[i + 1][1]]; }
        else { const e = h.id[5] === 'L' ? 0 : PAPER_N, a = spine[e], b = spine[e === 0 ? 1 : PAPER_N - 1], s = e === 0 ? 1 : -1;
          const tx = (b[0] - a[0]) * s / SEG, ty = (b[1] - a[1]) * s / SEG, n = h.id[6] === 't' ? -PAPER_HALF : PAPER_HALF; q = [a[0] - ty * n, a[1] + tx * n]; }
      } else if (h.surf === 'flame') {
        const i = h.inst, cd = CANDLES[i], fl = st.flames[i], loc = (x, y) => flameNode(st.t, i, x - cd.x, y - cd.y, fl.W, fl.dir, fl.lit, fl.size);
        q = h.kind === 'p' ? loc(h.rest[0], h.rest[1]) : loc(h.rest[0], h.rest[1]).concat(loc(h.rest[2], h.rest[3]));
      } else {
        if (h.kind === 'p') { const o = off[h.id]; if (o) { q[0] += o[0]; q[1] += o[1]; } }
        else { const oa = off[h.id + ':a'], ob = off[h.id + ':b']; if (oa) { q[0] += oa[0]; q[1] += oa[1]; } if (ob) { q[2] += ob[0]; q[3] += ob[1]; } }
      }
      T[h.id] = q;
    }
    return T;
  }

  // pack one surface's handles for the solver (flame surfaces: one instance)
  function pack(H, T, surf, inst) {
    const hs = H.filter(h => h.surf === surf && (inst == null || h.inst === inst));
    const P = [], Q = [], L = [], M = [];
    for (const h of hs) { if (h.kind === 'p') { P.push(...h.rest); Q.push(...T[h.id]); } else { L.push(...h.rest); M.push(...T[h.id]); } }
    return { P: Float64Array.from(P), Q: Float64Array.from(Q), L: Float64Array.from(L), M: Float64Array.from(M) };
  }

  // ---------------------------------------------------------------- what the deformed face measures (the breath is read off the picture)
  function ring(cx, cy, rx, ry, n) { const a = new Float64Array(2 * n); for (let k = 0; k < n; k++) { a[2 * k] = cx + rx * Math.cos(2 * Math.PI * k / n); a[2 * k + 1] = cy + ry * Math.sin(2 * Math.PI * k / n); } return a; }
  function area(a) { let s = 0; const n = a.length / 2; for (let k = 0; k < n; k++) { const j = (k + 1) % n; s += a[2 * k] * a[2 * j + 1] - a[2 * j] * a[2 * k + 1]; } return Math.abs(s) / 2; }
  const CHEEK_L = ring(236, 304, 30, 30, 32), CHEEK_R = ring(364, 304, 30, 30, 32), GAP = ring(300, 331, 27, 3, 32);
  // returns { cheek: area gain of the two cheek discs, mouth: aperture area (px^2), width: aperture width (px) }
  function measureFace(MLS, H, faceState, family, alpha) {
    const T = targets(H, { face: faceState, curl: 0, lift: 0, flames: CANDLES.map(() => ({ W: 0, dir: 0, lit: 1 })), t: 0 }), h = pack(H, T, 'face');
    const L = MLS.solve(h, CHEEK_L, new Float64Array(CHEEK_L.length), family, alpha), R = MLS.solve(h, CHEEK_R, new Float64Array(CHEEK_R.length), family, alpha);
    const G = MLS.solve(h, GAP, new Float64Array(GAP.length), family, alpha);
    let x0 = 1e9, x1 = -1e9; for (let k = 0; k < G.length; k += 2) { x0 = Math.min(x0, G[k]); x1 = Math.max(x1, G[k]); }
    return { cheek: (area(L) + area(R)) / (area(CHEEK_L) + area(CHEEK_R)) - 1, mouth: area(G), width: x1 - x0, cheekPoly: [L, R], gapPoly: G };
  }

  // the breath: from measured cheeks + aperture + aim, a strength for every candle. (Jet: speed grows with the air held and
  // with a smaller opening; spread grows with the opening's width.) Returns per-candle { s, dir, delay }.
  const BREATH = { k: 1.37, cheekRef: 0.40, mouthRef: 580, spread0: .05, spreadW: .5, widthRef: 50 };
  function breathPlan(meas, aimDeg) {
    const V = Math.max(0, meas.cheek) / BREATH.cheekRef;            // 1 = a full similarity breath
    const jet = BREATH.k * V * Math.pow(BREATH.mouthRef / Math.max(60, meas.mouth), .5);
    const spread = BREATH.spread0 + BREATH.spreadW * meas.width / BREATH.widthRef; // radians (1 sigma)
    const aim = aimDeg * Math.PI / 180, M = [300 + aimDeg * .55, 331];
    return CANDLES.map(cd => {
      const dx = cd.x - M[0], dy = cd.y - M[1], th = Math.atan2(dx, dy), d = Math.hypot(dx, dy);
      const g = Math.exp(-.5 * Math.pow((th - aim) / spread, 2));
      return { s: jet * g * (290 / d), dir: th, delay: d / 1100 };
    });
  }

  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; }
  function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  const api = { STEP_HZ, SURF, FAMILIES, CANDLES, GROUPS, POSES, PAPER_N, PAPER_Y, PAPER_HALF, buildHandles, faceOffsets, targets, pack, paperSpine,
    measureFace, breathPlan, BREATH, CHEEK_L, CHEEK_R, GAP, area, smooth, vnoise, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SCENE = api;
})(typeof self !== 'undefined' ? self : this);
