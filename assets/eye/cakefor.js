/* CAKEFOR: a birthday cake starts from who it is for. Age, name and message decide the design.
   Young children get sculpted cakes (the kind made from sponge shapes, buttercream and sweets): a caterpillar with a
   segment for every year, a ladybird, a train, a dinosaur, a castle, a rocket, a hedgehog. Older children get their
   age as a number cake. One candle per year up to twelve, number candles after that. The message is piped.
   Units: centimetres, y up. Needs three.js r128 and cakemodel.js.
   window.CAKEFOR.make({ age, name, message, design }) -> THREE.Group;  CAKEFOR.designs, CAKEFOR.pick(age) */
(function () {
'use strict';
const T = THREE, C = window.CAKEMODEL, TAU = Math.PI * 2;
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const col = h => new T.Color(h).convertSRGBToLinear();
const fondant = h => new T.MeshPhysicalMaterial({ color: col(h), roughness: .5, clearcoat: .15, clearcoatRoughness: .6 });
const cream = h => C.mat('cream', { color: col(h) });
const gloss = h => C.mat('glaze', { color: col(h) });
const sponge = h => C.mat('sponge', { color: col(h) });
const SWEETS = ['#e8483f', '#f5a623', '#f8e04a', '#58b85c', '#3f8fe0', '#a25bd0', '#f27fb0'];
function add(g, geo, m, x, y, z, sx, sy, sz, rx, ry, rz) { const o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); if (sx != null) o.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
const SPH = new T.SphereGeometry(1, 32, 24), CYL = new T.CylinderGeometry(1, 1, 1, 32), CONE = new T.ConeGeometry(1, 1, 24), BOX = new T.BoxGeometry(1, 1, 1), TOR = new T.TorusGeometry(1, .18, 10, 40);
function rbox(w, h, d, r) { const s = new T.Shape(), x = w / 2, z = d / 2; s.moveTo(-x + r, -z); s.lineTo(x - r, -z); s.quadraticCurveTo(x, -z, x, -z + r); s.lineTo(x, z - r); s.quadraticCurveTo(x, z, x - r, z); s.lineTo(-x + r, z); s.quadraticCurveTo(-x, z, -x, z - r); s.lineTo(-x, -z + r); s.quadraticCurveTo(-x, -z, -x + r, -z);
  const g = new T.ExtrudeGeometry(s, { depth: h - 2 * r * .5, bevelEnabled: true, bevelThickness: r * .5, bevelSize: r * .5, bevelSegments: 4, curveSegments: 8 }); g.rotateX(-Math.PI / 2); g.translate(0, r * .5, 0); return g; }
const eye = (g, x, y, z, r) => { add(g, SPH, fondant('#ffffff'), x, y, z, r); add(g, SPH, gloss('#141210'), x, y + r * .15, z + r * .62, r * .5); };
const smartie = (g, x, y, z, r, c, rx, rz) => add(g, SPH, gloss(c), x, y, z, r, r * .45, r, rx, 0, rz);

/* piping from any text: the letters' shape raised into a rounded bead (or a flat slab for number cakes) */
function relief(text, o) {
  const fs = 150, cv = document.createElement('canvas'), x = cv.getContext('2d'), font = (o.bold ? '900 ' : 'italic 600 ') + fs + 'px ' + (o.font || '"Snell Roundhand","Brush Script MT","Segoe Script","Comic Sans MS","Noto Sans CJK SC",cursive,sans-serif');
  x.font = font; const tw = Math.ceil(x.measureText(text).width) + 40; cv.width = tw; cv.height = fs * 1.5; x.font = font; x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  if (o.bold) { x.lineWidth = fs * .1; x.strokeStyle = '#fff'; x.strokeText(text, 20, cv.height / 2); } x.fillText(text, 20, cv.height / 2);
  const st = o.step || 2, W = Math.floor(cv.width / st), H = Math.floor(cv.height / st), d0 = x.getImageData(0, 0, cv.width, cv.height).data, D = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) D[j * W + i] = d0[((j * st) * cv.width + i * st) * 4] > 110 ? 1e4 : 0;
  for (let j = 1; j < H; j++) for (let i = 1; i < W - 1; i++) { const k = j * W + i; D[k] = Math.min(D[k], D[k - 1] + 1, D[k - W] + 1, D[k - W - 1] + 1.4, D[k - W + 1] + 1.4); }
  for (let j = H - 2; j >= 0; j--) for (let i = W - 2; i > 0; i--) { const k = j * W + i; D[k] = Math.min(D[k], D[k + 1] + 1, D[k + W] + 1, D[k + W + 1] + 1.4, D[k + W - 1] + 1.4); }
  const sc = o.width / W, rad = o.rad || 3, hh = o.height, pos = [], idx = [], id = new Int32Array(W * H).fill(-1), inside = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, d = D[k]; let near = d > 0; if (!near) for (let q = 0; q < 4 && !near; q++) { const n = k + [1, -1, W, -W][q]; if (n >= 0 && n < W * H && D[n] > 0) near = true; } if (!near) continue;
    const t = Math.min(1, d / rad), h = o.flat ? hh * (d > 0 ? Math.min(1, .55 + .45 * Math.sqrt(t)) : 0) : hh * Math.sqrt(1 - (1 - t) * (1 - t)) * (d > 0 ? 1 : 0);
    id[k] = pos.length / 3; pos.push((i - W / 2) * sc, h, (j - H / 2) * sc); if (d > rad * 1.6) inside.push([(i - W / 2) * sc, (j - H / 2) * sc, d * sc]); }
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) { const a = id[j * W + i], b = id[j * W + i + 1], c = id[(j + 1) * W + i], e = id[(j + 1) * W + i + 1]; if (a >= 0 && b >= 0 && c >= 0 && e >= 0) idx.push(a, c, b, b, c, e); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return { geo: g, w: o.width, d: H * sc, inside };
}
function pipe(g, text, m, width, x, y, z, ry, h) { if (!text) return; const r = relief(text, { width: Math.min(width, text.length * width / 7 + width * .25), height: h || .45, rad: 2.2 }); const o = add(g, r.geo, m, x, y, z); o.rotation.y = ry || 0; return o; }

function board(g, r, c, rect) { const m = new T.MeshPhysicalMaterial({ color: col(c || '#d9dde2'), metalness: .65, roughness: .32 }); return rect ? add(g, rbox(rect[0], .6, rect[1], 1.2), m, 0, -.6, 0) : add(g, CYL, m, 0, -.3, 0, r, .6, r); }
function sprinkles(g, n, place) { const geo = new T.CylinderGeometry(.09, .09, .55, 6); SWEETS.forEach((c, ci) => g.add(C.ringInstances(geo, gloss(c), Math.ceil(n / SWEETS.length), k => { const p = place(); return { x: p[0], y: p[1] + .08, z: p[2], rx: Math.PI / 2, ry: rnd() * TAU, rz: (rnd() - .5) * .6 }; }))); }
const digitCandle = (g, ch, x, y, z, c) => { const r = relief(ch, { width: 3.4, height: .9, rad: 3, bold: true, flat: true, font: 'Arial, Helvetica, sans-serif', step: 2 }); const o = add(g, r.geo, C.mat('wax', { color: col(c) }), x, y + 2.6, z); o.rotation.x = -Math.PI / 2; add(g, CYL, new T.MeshStandardMaterial({ color: 0x1a1510 }), x, y + 5.4, z, .06, .7, .06); const f = add(g, C.flameGeo, new T.MeshBasicMaterial({ color: new T.Color(1, .74, .32) }), x, y + 5.7, z, .42); f.castShadow = false; add(g, C.flameGeo, new T.MeshBasicMaterial({ color: new T.Color(1, .97, .86) }), x, y + 5.78, z, .24, .3, .24).castShadow = false; return [x, y + 6.6, z]; };

/* candles: one for every year up to twelve, set where the design says; after that, the age as number candles */
function candles(g, age, spots, numAt) {
  const tips = [];
  if (age <= 12) { for (let k = 0; k < age; k++) { const s = spots[k % spots.length], off = Math.floor(k / spots.length) * .9; const c = C.candle({ x: s[0] + off, y: s[1], z: s[2] + off * .6, w: .7, h: 5.2 + rnd() }, 'striped', k, true); g.add(c); tips.push([s[0], s[1] + 7, s[2]]); } }
  else { const str = String(age), w = 3.6; [...str].forEach((ch, i) => tips.push(digitCandle(g, ch, numAt[0] + (i - (str.length - 1) / 2) * w, numAt[1], numAt[2], SWEETS[(i * 3 + age) % 7]))); }
  if (tips.length) { const m = tips.reduce((a, t) => [a[0] + t[0], a[1] + t[1], a[2] + t[2]], [0, 0, 0]).map(v => v / tips.length); const L = new T.PointLight(new T.Color(1, .7, .4), 1.1 + Math.min(1.2, tips.length * .12), 90, 2); L.position.set(m[0], m[1] + 1.5, m[2]); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -.004; g.add(L); }
}

const D = {};
D.smash = (g, p) => {                    /* first birthday: a small tall cake to be put hands into, one candle */
  board(g, 11); add(g, CYL, cream('#fbe3ea'), 0, 3.5, 0, 6, 7, 6); add(g, SPH, cream('#fbe3ea'), 0, 7, 0, 6, .8, 6);
  const sh = C.shellGeo(1.5, 7); g.add(C.ringInstances(sh, cream('#ffffff'), 22, k => { const a = k / 22 * TAU; return { x: Math.sin(a) * 6, y: 0, z: Math.cos(a) * 6, ry: a + Math.PI }; }));
  g.add(C.ringInstances(C.rosetteGeo(.9, 6), cream('#ffffff'), 12, k => { const a = k / 12 * TAU; return { x: Math.sin(a) * 4.9, y: 7.4, z: Math.cos(a) * 4.9 }; }));
  sprinkles(g, 90, () => { const a = rnd() * TAU, r = 4 * Math.sqrt(rnd()); return [Math.sin(a) * r, 7.75, Math.cos(a) * r]; });
  pipe(g, p.message || 'one', cream('#e8769a'), 13, 0, .02, 8.4, 0, .4); pipe(g, p.name, cream('#e8769a'), 13, 0, .02, -8.2, 0, .4);
  return { spots: [[0, 7.8, 0]], num: [0, 7.8, 0] };
};
D.caterpillar = (g, p) => {              /* a segment for every year, sweets for feet */
  const n = Math.max(4, Math.min(12, p.age + 1)), r = 3.3, L = (n - 1) * r * 1.55; board(g, 0, '#cfe8c8', [L + 16, 22]); const spots = [];
  for (let k = 0; k < n; k++) { const x = -L / 2 + k * r * 1.55, z = 3.2 * Math.sin(k * .9), head = k === n - 1, rr = head ? r * 1.25 : r;
    add(g, SPH, cream(head ? '#7ccf5a' : k % 2 ? '#58b85c' : '#9be07a'), x, rr * .9, z, rr, rr * .95, rr);
    if (!head) { smartie(g, x - .6, .35, z + rr * .95, .75, SWEETS[k % 7], 1.2); smartie(g, x + .6, .35, z - rr * .95, .75, SWEETS[(k + 3) % 7], -1.2); add(g, SPH, gloss(SWEETS[(k * 2) % 7]), x, rr * 1.83, z, .9, .5, .9); spots.push([x, rr * 1.9, z]); }
    else { eye(g, x - 1.3, rr * 1.35, z + rr * .78, .85); eye(g, x + 1.3, rr * 1.35, z + rr * .78, .85); add(g, new T.TorusGeometry(1, .16, 8, 24, Math.PI), gloss('#c0392b'), x, rr * .92, z + rr * .9, 1.25, 1.25, 1.25, -.25, 0, Math.PI);
      [-1, 1].forEach(s => { add(g, CYL, gloss('#1b1512'), x + s * 1.2, rr * 2.2, z, .16, 2.6, .16, 0, 0, -s * .3); add(g, SPH, gloss('#e8483f'), x + s * 1.6, rr * 2.2 + 1.3, z, .5); }); } }
  pipe(g, p.name, cream('#2f7d3a'), 16, 0, .02, 8.2, 0, .45); spots.reverse(); return { spots, num: [-L / 2 + 2 * r * 1.55, r * 1.9, 0] };
};
D.ladybird = (g, p) => {                 /* a dome of sponge under red icing, chocolate buttons for spots */
  board(g, 21, '#bfe3b4'); add(g, SPH, fondant('#d8322b'), 0, 0, 0, 10.5, 7.6, 12); add(g, SPH, fondant('#161312'), 0, 2.2, 10.6, 5.6, 4.6, 5); add(g, BOX, fondant('#161312'), 0, 7.4, -.6, .35, .5, 21, -.05);
  const sp = [[-5, 4.5], [5, 4.5], [-6.2, -2], [6.2, -2], [-3.6, -8], [3.6, -8], [-2.6, -1], [2.6, -1]]; sp.slice(0, Math.max(2, Math.min(8, p.age * 2))).forEach(q => { const y = 7.6 * Math.sqrt(Math.max(0, 1 - (q[0] / 10.5) ** 2 - (q[1] / 12) ** 2)); const o = add(g, SPH, gloss('#161312'), q[0], y, q[1], 1.5, .35, 1.5); o.lookAt(q[0] * 2 * 7.6 / 10.5, y * 2 * 10.5 / 7.6, q[1] * 2); o.rotateX(Math.PI / 2); });
  eye(g, -2, 4.6, 14, 1.1); eye(g, 2, 4.6, 14, 1.1); [-1, 1].forEach(s => { add(g, CYL, gloss('#161312'), s * 2.2, 7.4, 12.5, .15, 3, .15, .5, 0, -s * .35); add(g, SPH, gloss('#161312'), s * 2.75, 8.6, 13.3, .45); });
  for (let k = 0; k < 6; k++) { const s = k < 3 ? -1 : 1, z = -5 + (k % 3) * 5; add(g, CYL, gloss('#161312'), s * 10.6, .5, z, .35, 3.4, .35, 0, 0, Math.PI / 2 - s * .3); }
  pipe(g, p.name, cream('#d8322b'), 13, 0, .02, 18.4, 0, .45);
  return { spots: sp.map(q => [q[0] * .75, 7.6 * Math.sqrt(Math.max(0, 1 - (q[0] * .75 / 10.5) ** 2 - ((q[1] * .75 + 1.5) / 12) ** 2)) - .2, q[1] * .75 + 1.5]), num: [0, 7.5, 0] };
};
D.train = (g, p) => {                    /* loaf-cake engine and a wagon of sweets for the years, biscuit wheels */
  const cars = Math.max(1, Math.min(4, Math.ceil(p.age / 3))), L = 13 + cars * 10.5; board(g, 0, '#d9dde2', [L + 8, 20]); const x0 = L / 2 - 7.5, wheel = (x, z, r) => { add(g, CYL, sponge('#d9a55c'), x, r, z, r, .9, r, Math.PI / 2); add(g, SPH, gloss('#e8483f'), x, r, z + (z > 0 ? .5 : -.5), .6, .6, .3); };
  add(g, CYL, fondant('#2f6fd0'), x0 + 1, 4.6, 0, 3, 9, 3, 0, 0, Math.PI / 2); add(g, rbox(6, 8, 7, .8), fondant('#e8483f'), x0 - 5, 1.6, 0); add(g, rbox(7, 1, 8, .4), fondant('#f8e04a'), x0 - 5, 9.4, 0); add(g, rbox(13, 1.6, 6.4, .5), fondant('#1d2733'), x0 - 1.5, .6, 0);
  add(g, CYL, fondant('#1d2733'), x0 + 3.4, 8.6, 0, .9, 2.6, .9); add(g, CYL, fondant('#f8e04a'), x0 + 3.4, 10, 0, 1.25, .5, 1.25); add(g, SPH, cream('#ffffff'), x0 + 3.6, 11.6, 0, 1.3); add(g, SPH, cream('#ffffff'), x0 + 2.6, 13.2, 0, 1.0); add(g, CYL, fondant('#f8e04a'), x0 + 5.6, 4.6, 0, 3.05, .3, 3.05, 0, 0, Math.PI / 2); eye(g, x0 - 5, 6.6, 3.5, .01);
  add(g, BOX, gloss('#bfe6ff'), x0 - 5, 6.6, 3.52, 3, 2.4, .1); add(g, BOX, gloss('#bfe6ff'), x0 - 5, 6.6, -3.52, 3, 2.4, .1);
  [[x0 + 3, 1.7], [x0 - .5, 1.7], [x0 - 5, 2.4]].forEach(w => { wheel(w[0], 3.7, w[1]); wheel(w[0], -3.7, w[1]); });
  const spots = []; for (let c = 0; c < cars; c++) { const x = x0 - 13.5 - c * 10.5, cc = SWEETS[(c * 2 + 3) % 7]; add(g, rbox(8.6, 4.2, 7, .7), fondant(cc), x, 1.6, 0); add(g, rbox(9, 1.2, 6.4, .4), fondant('#1d2733'), x, .6, 0); add(g, CYL, fondant('#1d2733'), x + 4.9, 1.6, 0, .3, 1.6, .3, 0, 0, Math.PI / 2); wheel(x - 2.6, 3.7, 1.5); wheel(x + 2.6, 3.7, 1.5); wheel(x - 2.6, -3.7, 1.5); wheel(x + 2.6, -3.7, 1.5);
    for (let k = 0; k < 16; k++) smartie(g, x + (rnd() - .5) * 6.4, 5.9 + rnd() * .7, (rnd() - .5) * 5, .75, SWEETS[k % 7], rnd() * 3, rnd() * 3); for (let k = 0; k < 3; k++) spots.push([x - 2.6 + k * 2.6, 6.3, (k % 2 ? 1.3 : -1.3)]); }
  pipe(g, p.name, cream('#2f6fd0'), 16, 0, .02, 7.8, 0, .45); return { spots, num: [x0 - 13.5, 6.3, 0] };
};
D.dinosaur = (g, p) => {                 /* body carved from a dome, neck and tail from offcuts, plates down the back */
  board(g, 19, '#cfe8c8'); const gr = cream('#58b85c'), lt = cream('#9be07a'); add(g, SPH, gr, 0, 5, 0, 8, 5.6, 6);
  for (let k = 0; k < 9; k++) { const t = k / 8, r = 3.6 - 2.9 * t; add(g, SPH, gr, -6 - 9 * t, 3.4 - 2.6 * t + .2, 2.5 * Math.sin(t * 2.2), r, r * .9, r); }                                     // tail
  for (let k = 0; k < 6; k++) { const t = k / 5; add(g, SPH, gr, 5.5 + 3.6 * t, 6 + 6.6 * t, 0, 2.8 - .7 * t); } add(g, SPH, gr, 11.4, 13.4, 0, 3.4, 2.5, 2.6); add(g, SPH, lt, 13.4, 12.8, 0, 2.2, 1.6, 2.1);  // neck, head
  eye(g, 11.6, 14.6, 1.9, .75); eye(g, 11.6, 14.6, -1.9, .75); g.children[g.children.length - 1].position.z = -2.4; g.children[g.children.length - 2].position.z = -1.9; add(g, SPH, gloss('#141210'), 14.9, 13.4, .8, .22); add(g, SPH, gloss('#141210'), 14.9, 13.4, -.8, .22);
  [[4.5, 4.4], [4.5, -4.4], [-4, 4.4], [-4, -4.4]].forEach(q => add(g, CYL, gr, q[0], 1.7, q[1], 1.9, 3.4, 1.9));
  for (let k = 0; k < 13; k++) { const t = k / 12, x = 9 - 22 * t, y = t < .2 ? 12.4 - 16 * t : 10.6 - 9 * Math.abs(t - .42) * 1.9; add(g, CONE, fondant(SWEETS[k % 2 ? 1 : 0]), x, Math.max(1.5, t > .62 ? 6.2 - 8.5 * (t - .62) * 1.6 : y), t > .62 ? 2.5 * Math.sin((t - .62) / .38 * 2.2) * .8 : 0, 1.0, 2.2, .35, 0, 0, t < .2 ? -.6 : .15); }
  const spots = []; for (let k = 0; k < 12; k++) { const a = k * 2.4, r = 2 + 3.6 * ((k * 7) % 5) / 5, x = Math.cos(a) * r - .5, z = Math.sin(a) * r * .6, y = 5 + 5.6 * Math.sqrt(Math.max(0, 1 - (x / 8) ** 2 - (z / 6) ** 2)); if (k < 8) add(g, SPH, lt, x * 1.25, y - .9 - Math.abs(x) * .12, z * 1.6 + (z > 0 ? 2.4 : -2.4), .8, .3, .8); spots.push([x * .8, y - .25, z + (k % 2 ? 1.6 : -1.6)]); }
  pipe(g, p.name, cream('#2f7d3a'), 16, 0, .02, 12.5, 0, .45); return { spots, num: [-1, 10.4, 0] };
};
D.castle = (g, p) => {                   /* a round cake keep, four towers, ice-cream cones for roofs */
  board(g, 19, '#e9d7ef'); const wall = cream('#f6c5d8'), trim = cream('#ffffff'), roof = fondant('#a25bd0');
  add(g, CYL, wall, 0, 4.5, 0, 9, 9, 9); add(g, CYL, wall, 0, 12, 0, 5, 6, 5); g.add(C.ringInstances(new T.BoxGeometry(1.7, 1.6, 1.3), wall, 16, k => { const a = k / 16 * TAU; return { x: Math.sin(a) * 8.4, y: 9.8, z: Math.cos(a) * 8.4, ry: a }; })); g.add(C.ringInstances(new T.BoxGeometry(1.3, 1.3, 1), wall, 10, k => { const a = k / 10 * TAU; return { x: Math.sin(a) * 4.5, y: 15.6, z: Math.cos(a) * 4.5, ry: a }; }));
  g.add(C.ringInstances(C.shellGeo(1.7, 7), trim, 34, k => { const a = k / 34 * TAU; return { x: Math.sin(a) * 9.05, y: 0, z: Math.cos(a) * 9.05, ry: a + Math.PI }; }));
  const spots = []; for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4, x = Math.sin(a) * 9, z = Math.cos(a) * 9; add(g, CYL, wall, x, 7, z, 2.6, 14, 2.6); add(g, CONE, roof, x, 16.8, z, 3.1, 5.6, 3.1); add(g, SPH, gloss('#f8e04a'), x, 19.8, z, .5); add(g, BOX, gloss('#5a3b7a'), x * 1.27, 10, z * 1.27, 1.1, 1.8, .2, 0, a); g.add(C.ringInstances(new T.SphereGeometry(.42, 10, 8), trim, 14, j => { const b = j / 14 * TAU; return { x: x + Math.sin(b) * 2.7, y: 14, z: z + Math.cos(b) * 2.7 }; })); }
  add(g, CONE, roof, 0, 18.2, 0, 4.2, 6.4, 4.2); add(g, CYL, gloss('#f8e04a'), 0, 22.6, 0, .1, 2.6, .1); add(g, BOX, fondant('#e8483f'), .95, 23.3, 0, 1.8, 1.1, .08);
  add(g, rbox(3.6, 5, .5, .2), fondant('#8a5a34'), 0, 0, 9); add(g, SPH, fondant('#8a5a34'), 0, 5, 9, 1.8, 1.8, .3); add(g, SPH, gloss('#f8e04a'), .9, 2.6, 9.4, .22);
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + .26; if (Math.abs(((a - .26) / (TAU / 4)) % 1 - .5) < .14) continue; spots.push([Math.sin(a) * 6.6, 9, Math.cos(a) * 6.6]); } for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; add(g, SPH, gloss(SWEETS[k % 7]), Math.sin(a) * 9.2, 5 + (k % 2) * 1.6, Math.cos(a) * 9.2, .55); }
  pipe(g, p.name, cream('#a25bd0'), 15, 0, .02, 14.6, 0, .45); return { spots, num: [0, 9, 6.6] };
};
D.rocket = (g, p) => {                   /* standing on its fins over a plume of piped orange */
  board(g, 16, '#1d2733'); const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new T.Vector2(Math.max(.01, 4.6 * Math.pow(Math.sin(Math.PI * (.14 + .86 * t) * .5 + Math.PI * .5 * 0) , 1) * (t > .62 ? Math.sqrt(Math.max(0, 1 - ((t - .62) / .38) ** 2)) : .8 + .2 * Math.sin(t / .62 * Math.PI * .5))), 4 + t * 20)); }
  add(g, new T.LatheGeometry(pts, 40), fondant('#f3f1ec'), 0, 0, 0); add(g, new T.LatheGeometry(pts.slice(17), 40), fondant('#e8483f'), 0, .02, 0, 1.02, 1, 1.02); add(g, CYL, fondant('#e8483f'), 0, 9, 0, 4.72, 1, 4.72);
  for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + .5; const f = add(g, rbox(5.5, 8, .9, .3), fondant('#2f6fd0'), Math.sin(a) * 5.6, 1.2, Math.cos(a) * 5.6); f.rotation.y = a - Math.PI / 2; }
  add(g, TOR, fondant('#2f6fd0'), 0, 15.5, 4.45, 1.9, 1.9, 1.9); add(g, SPH, gloss('#bfe6ff'), 0, 15.5, 4.3, 1.75, 1.75, .5);
  g.add(C.ringInstances(C.rosetteGeo(1.5, 6), cream('#f5a623'), 9, k => { const a = k / 9 * TAU; return { x: Math.sin(a) * 2.6, y: 0, z: Math.cos(a) * 2.6, s: 1.2 }; })); g.add(C.ringInstances(C.rosetteGeo(1.2, 6), cream('#f8e04a'), 14, k => { const a = k / 14 * TAU; return { x: Math.sin(a) * 7.8, y: 0, z: Math.cos(a) * 7.8 }; }));
  for (let k = 0; k < 26; k++) { const a = rnd() * TAU, r = 9.5 + rnd() * 5.5; add(g, SPH, gloss(k % 3 ? '#f8e04a' : '#ffffff'), Math.sin(a) * r, .12, Math.cos(a) * r, .28, .12, .28); }
  const spots = []; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + .2; spots.push([Math.sin(a) * 11.5, 0, Math.cos(a) * 11.5]); }
  pipe(g, p.name, cream('#f8e04a'), 13, 0, .02, 13.2, 0, .45); return { spots, num: [8, 0, 8] };
};
D.hedgehog = (g, p) => {                 /* chocolate buttercream dome, piped spikes, a pale face */
  board(g, 21, '#e7dcc8'); add(g, SPH, cream('#6b4226'), 0, 0, -1, 9.5, 8, 11); add(g, CONE, cream('#e9c9a0'), 0, 3, 11.4, 4.6, 7.5, 4.2, Math.PI / 2 - .12); add(g, SPH, gloss('#141210'), 0, 2.7, 15.2, .95); eye(g, -2, 4.9, 11.6, .7); eye(g, 2, 4.9, 11.6, .7); [-1, 1].forEach(s => add(g, SPH, cream('#e9c9a0'), s * 3.6, 6.2, 9, 1.4, 1.4, .6));
  const N = 150, sg = new T.ConeGeometry(.75, 2.6, 7); g.add(C.ringInstances(sg, cream('#4a2c18'), N, k => { const u = (k + .5) / N, th = Math.acos(1 - u * .96), ph = k * 2.399963, nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph); if (nz > .62 && ny < .75) return { x: 0, y: -50, z: 0 }; return { x: nx * 9.5, y: ny * 8, z: nz * 11 - 1, rx: Math.atan2(Math.hypot(nx, nz), ny) * (nz >= 0 ? 1 : 1), ry: Math.atan2(nx, nz) , s: .9 + .5 * rnd() }; }));
  const spots = []; for (let k = 0; k < 12; k++) { const a = k * 2.399963, r = 1.5 + 4.6 * (k / 12), x = Math.cos(a) * r, z = Math.sin(a) * r - 2; spots.push([x, 8 * Math.sqrt(Math.max(0, 1 - (x / 9.5) ** 2 - ((z + 1) / 11) ** 2)) + .6, z]); }
  pipe(g, p.name, cream('#6b4226'), 13, 0, .02, 18.6, 0, .45); return { spots, num: [0, 8.4, -2] };
};
D.number = (g, p) => {                   /* the age itself, cut from sheet cake, covered in piped kisses, berries and sweets */
  const str = String(p.age), w = 13 * str.length + 4, r = relief(str, { width: w, height: 3.2, rad: 5, bold: true, flat: true, font: '"Arial Rounded MT Bold","Nunito","Arial Black",Arial,sans-serif', step: 2 }); board(g, 0, '#f1e9dd', [w + 9, r.d * .78 + 9]);
  add(g, r.geo, sponge('#e6c48e'), 0, 0, 0); const top = add(g, r.geo, cream('#fbe3ea'), 0, 2.3, 0, .97, .42, .97);
  const pts = r.inside.filter(q => q[2] > 1.1), pick = () => pts[Math.floor(rnd() * pts.length)], kiss = C.rosetteGeo(.95, 6), n = Math.min(150, Math.round(pts.length / 18));
  g.add(C.ringInstances(kiss, cream('#ffffff'), n, () => { const q = pick(); return { x: q[0] * .97, y: 3.55, z: q[1] * .97, s: .8 + .5 * rnd() }; })); g.add(C.ringInstances(kiss, cream('#f27fb0'), Math.round(n * .6), () => { const q = pick(); return { x: q[0] * .97, y: 3.55, z: q[1] * .97, s: .7 + .4 * rnd() }; }));
  for (let k = 0; k < n * .35; k++) { const q = pick(); add(g, SPH, gloss(k % 3 ? '#c0273a' : '#3f3a8a'), q[0] * .97, 4.5, q[1] * .97, .75, k % 3 ? .85 : .7, .75); } for (let k = 0; k < n * .2; k++) { const q = pick(); smartie(g, q[0] * .97, 4.35, q[1] * .97, .8, SWEETS[k % 7], rnd() * .8, rnd() * .8); }
  const spots = []; for (let k = 0; k < 12; k++) { const q = pts[Math.floor((k + .5) / 12 * pts.length)]; spots.push([q[0] * .97, 3.6, q[1] * .97]); }
  pipe(g, p.name, cream('#e8769a'), 15, 0, .02, r.d * .39 + 2.6, 0, .45); const mid = pts[pts.length >> 1]; return { spots, num: [0, 3.6, mid[1] * .97 - 1] };
};
D.round = (g, p) => {                    /* for the grown: a tall drip cake, the message piped on top, the age in number candles */
  const kid = p.age < 21, base = kid ? '#bfe6ff' : p.age >= 60 ? '#f4ead4' : '#f3efe6', glz = kid ? '#f27fb0' : p.age >= 60 ? '#b8862b' : '#3b2114'; board(g, 14, '#d9dde2');
  add(g, CYL, cream(base), 0, 5.5, 0, 9, 11, 9); add(g, CYL, gloss(glz), 0, 11.05, 0, 9.05, .35, 9.05); const lip = add(g, new T.TorusGeometry(9, .42, 10, 80), gloss(glz), 0, 11, 0); lip.rotation.x = Math.PI / 2;
  for (let k = 0; k < 30; k++) { const a = (k + rnd() * .6) / 30 * TAU, d = add(g, C.dripGeo(1.5 + 5.5 * Math.pow(rnd(), 1.5), .32 + .25 * rnd()), gloss(glz), Math.sin(a) * 9.1, 11, Math.cos(a) * 9.1); d.scale.z = .6; d.rotation.y = a; }
  g.add(C.ringInstances(C.rosetteGeo(1.25, 6), cream(kid ? '#ffffff' : base), 12, k => { const a = k / 12 * TAU; return { x: Math.sin(a) * 7.3, y: 11.2, z: Math.cos(a) * 7.3 }; })); g.add(C.ringInstances(new T.SphereGeometry(.42, 10, 8), kid ? cream('#ffffff') : gloss('#d9b45a'), 62, k => { const a = k / 62 * TAU; return { x: Math.sin(a) * 9.15, y: .4, z: Math.cos(a) * 9.15 }; }));
  if (kid) sprinkles(g, 120, () => { const a = rnd() * TAU, r = 6 * Math.sqrt(rnd()); return [Math.sin(a) * r, 11.25, Math.cos(a) * r]; });
  pipe(g, p.message || 'Happy Birthday', cream(kid ? '#ffffff' : base === '#f3efe6' ? '#f3efe6' : '#7a4a1e'), 11.5, 0, 11.24, 1.6, 0, .4); pipe(g, p.name, cream(kid ? '#ffffff' : base === '#f3efe6' ? '#f3efe6' : '#7a4a1e'), 9, 0, 11.24, 4.4, 0, .4);
  const spots = []; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; spots.push([Math.sin(a) * 4.6, 11.25, Math.cos(a) * 4.6 - 1.5]); } return { spots, num: [0, 11.25, -3] };
};
const designs = ['smash', 'caterpillar', 'ladybird', 'train', 'dinosaur', 'castle', 'rocket', 'hedgehog', 'number', 'round'];
const why = { smash: 'first birthday: a small cake to put hands into', caterpillar: 'a segment for every year', ladybird: 'a dome and chocolate-button spots', train: 'wagons of sweets, biscuit wheels', dinosaur: 'carved body, plates down the back', castle: 'a keep, four towers, cone roofs', rocket: 'standing on a plume of piped orange', hedgehog: 'piped chocolate spikes', number: 'the age itself, cut from sheet cake', round: 'tall drip cake, number candles' };
const pick = age => age <= 1 ? 'smash' : age === 2 ? 'caterpillar' : age === 3 ? 'ladybird' : age === 4 ? 'train' : age === 5 ? 'dinosaur' : age === 6 ? 'castle' : age === 7 ? 'rocket' : age === 8 ? 'hedgehog' : age <= 12 || age === 18 || age === 21 || age % 10 === 0 ? 'number' : 'round';
function make(p) { p = Object.assign({ age: 5, name: '', message: '' }, p); seed = 11 + p.age * 7 + (p.name || '').length; const g = new T.Group(), d = p.design && D[p.design] ? p.design : pick(p.age), r = D[d](g, p); candles(g, p.age, r.spots, r.num); g.userData = { design: d, why: why[d], candles: p.age <= 12 ? p.age + ' candles, one a year' : 'number candles ' + p.age }; return g; }
window.CAKEFOR = { make, designs, pick, why };
})();
