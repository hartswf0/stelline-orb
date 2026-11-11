/* CAKEMODEL: a cake built as geometry, not a picture.
   Every part is a mesh: sponge and icing body, ruffles, glaze and drips, piped shells, beads, curls, plate,
   candles with wax, wick and flame. Sizes come from the measured profile (assets/eye/lift.json), kinds from the
   clip's label (cake_spec in dataset.json), colours are read from the footage ring by ring.
   Units: plate pixels, y up from the base centre, z toward the footage's camera. three.js r128.
   window.CAKEMODEL.build({ prof, spec, sample, candles }) -> THREE.Group (with .userData.lights, .userData.flames) */
(function () {
'use strict';
const T = THREE, TAU = Math.PI * 2;
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const lin = c => new T.Color(c[0] / 255, c[1] / 255, c[2] / 255).convertSRGBToLinear();
const mixc = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const lum = c => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

/* fine surface: a height field turned into a normal map, made once per kind */
const nmCache = {};
function normalMap(kind) {
  if (nmCache[kind]) return nmCache[kind];
  const N = 256, h = new Float32Array(N * N); let s = 7;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const blob = (n, rad, amp) => { for (let k = 0; k < n; k++) { const cx = r() * N, cy = r() * N, a = (r() - .5) * amp, R = rad * (.5 + r()); for (let y = -R | 0; y <= R; y++) for (let x = -R | 0; x <= R; x++) { const d = Math.hypot(x, y) / R; if (d < 1) h[((cy + y + N) % N | 0) * N + ((cx + x + N) % N | 0)] += a * (1 - d * d); } } };
  if (kind === 'cream') { blob(500, 14, .5); blob(2500, 3, .18); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] += 0.22 * Math.sin(y * 0.9 + 2 * Math.sin(x * 0.05)); }      // spatula streaks
  else if (kind === 'sponge') { blob(5000, 2.5, 1); blob(300, 7, -1.2); }                                                                                                             // crumb and air holes
  else { blob(120, 30, .25); }                                                                                                                                                        // glaze: nearly flat
  const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x], l = Math.hypot(dx, dy, 1), k = (y * N + x) * 4; im.data[k] = (-dx / l * .5 + .5) * 255; im.data[k + 1] = (-dy / l * .5 + .5) * 255; im.data[k + 2] = (1 / l * .5 + .5) * 255; im.data[k + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return nmCache[kind] = t;
}
function mat(kind, o) {
  const p = { cream: { roughness: .62, nm: 'cream', ns: .55, rep: [10, 3] }, sponge: { roughness: .95, nm: 'sponge', ns: 1.1, rep: [16, 3] }, glaze: { roughness: .16, nm: 'glaze', ns: .25, rep: [3, 1], clearcoat: 1, clearcoatRoughness: .12 },
    ceramic: { roughness: .22, clearcoat: .6, clearcoatRoughness: .2 }, wax: { roughness: .45 }, neonbody: { roughness: .35, metalness: .3 } }[kind];
  const m = new T.MeshPhysicalMaterial(Object.assign({ roughness: p.roughness, metalness: p.metalness || 0, clearcoat: p.clearcoat || 0, clearcoatRoughness: p.clearcoatRoughness || 0 }, o || {}));
  if (p.nm) { m.normalMap = normalMap(p.nm).clone(); m.normalMap.needsUpdate = true; m.normalMap.repeat.set(p.rep[0], p.rep[1]); m.normalScale = new T.Vector2(p.ns, p.ns); }
  return m;
}

/* the measured profile, cleaned: [[r, h]...] bottom to top, a plate split off if the bottom rings are a wide thin lip */
function readProfile(prof) {
  const n = prof.length, hmax = prof[n - 1][1], sm = prof.map((p, i) => { let a = 0, c = 0; for (let k = -1; k <= 1; k++) if (prof[i + k]) { a += prof[i + k][0]; c++; } return [a / c, p[1]]; });
  const mid = sm.filter(p => p[1] > .25 * hmax && p[1] < .6 * hmax).map(p => p[0]).sort((a, b) => a - b), Rm = mid[mid.length >> 1] || sm[0][0];
  let plateTop = 0, plateR = 0;
  for (let i = 0; i < n && sm[i][1] < .22 * hmax; i++) if (sm[i][0] > 1.1 * Rm) { plateTop = sm[i][1]; plateR = Math.max(plateR, sm[i][0]); }
  const body = sm.filter(p => p[1] >= plateTop).map(p => [p[0], p[1] - plateTop]);
  if (body.length < 4) return { body: sm, plateR: 0, plateTop: 0, hmax, R: Rm };
  body[0][0] = Math.min(body[0][0], body[Math.min(3, body.length - 1)][0] * 1.04);
  /* tier edges: where the radius steps in by 12 percent or more below the top tenth */
  const edges = []; let cur = body[1][0];
  for (let i = 2; i < body.length; i++) { const h = body[i][1], top = body[body.length - 1][1]; if (h > .9 * top) break; if (body[i][0] < .88 * cur && body[Math.min(body.length - 1, i + 1)][0] < .9 * cur) { edges.push({ h: body[i - 1][1], R: cur, r: body[i][0] }); cur = body[i][0]; } else cur = Math.max(cur * .995, body[i][0]); }
  return { body, plateR, plateTop, hmax: body[body.length - 1][1], R: Rm, edges };
}
const radAt = (P, h) => { for (let i = 1; i < P.length; i++) if (h <= P[i][1]) { const u = (h - P[i - 1][1]) / Math.max(1e-6, P[i][1] - P[i - 1][1]); return P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u; } return P[P.length - 1][0]; };

/* body: a dense surface of revolution; `disp(h, a, vert)` pushes the icing in and out; colour per ring from the footage */
function bodyMesh(P, o) {
  const ROWS = 150, SEG = 144, hmax = P[P.length - 1][1], Rt = P[P.length - 1][0], CAP = 14, bev = Math.min(.07 * Rt, .12 * hmax);
  const pos = [], col = [], uv = [], idx = [], rows = [];
  for (let i = 0; i <= ROWS; i++) { const h = hmax * i / ROWS; let r = radAt(P, h); const d = hmax - h; if (d < bev) r -= bev - Math.sqrt(Math.max(0, bev * bev - (bev - d) * (bev - d))); const r2 = radAt(P, Math.min(hmax, h + hmax / ROWS)); rows.push({ r, h, vert: Math.min(1, Math.max(0, 1 - Math.abs(r2 - radAt(P, h)) / (hmax / ROWS) * 1.5)), top: false }); }
  for (let i = 1; i <= CAP; i++) { const u = i / CAP; rows.push({ r: (Rt - bev) * (1 - u), h: hmax + (o.dome || 0) * Rt * (1 - (1 - u) * (1 - u)) * .3, vert: 0, top: true, u }); }
  rows.forEach((w, i) => { const c = w.top ? o.topCol(w.u) : o.sideCol(w.h / hmax); for (let j = 0; j <= SEG; j++) { const a = j / SEG * TAU, r = Math.max(.01, w.r + (o.disp ? o.disp(w.h, a, w.vert, w) : 0)); pos.push(r * Math.sin(a), w.h, r * Math.cos(a)); col.push(c.r, c.g, c.b); uv.push(j / SEG, i / rows.length); } });
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < SEG; j++) { const a = i * (SEG + 1) + j, b = a + SEG + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* one piped shell: a star nozzle squeezed, pulled and let go. Lies along +x, starts fat, ends in a tail. */
function shellGeo(L, lobes) {
  const TS = 16, AS = lobes * 4, pos = [], idx = [];
  for (let i = 0; i <= TS; i++) { const t = i / TS, rad = L * .34 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15 + .04)), .55) * (1 - .62 * t), x = L * (t - .35) , y = L * .3 * Math.sin(Math.PI * Math.min(1, t * 1.2)) * (1 - .5 * t), tw = t * 1.6;
    for (let j = 0; j <= AS; j++) { const a = j / AS * TAU, rr = rad * (1 + .2 * Math.cos(lobes * a)); pos.push(x, y + rr * Math.cos(a + tw) * .9 + rad * .5, rr * Math.sin(a + tw)); } }
  for (let i = 0; i < TS; i++) for (let j = 0; j < AS; j++) { const a = i * (AS + 1) + j, b = a + AS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* a rosette: the same nozzle wound in a rising spiral */
function rosetteGeo(R, lobes) {
  const TS = 70, AS = lobes * 3, pos = [], idx = [];
  for (let i = 0; i <= TS; i++) { const t = i / TS, ang = t * TAU * 2.2, rr0 = R * (1 - .86 * t), cx = rr0 * Math.cos(ang), cz = rr0 * Math.sin(ang), cy = R * .75 * t, rad = R * .3 * (1 - .55 * t) * Math.min(1, t * 8 + .2);
    const tx = -Math.sin(ang), tz = Math.cos(ang);
    for (let j = 0; j <= AS; j++) { const a = j / AS * TAU, q = rad * (1 + .22 * Math.cos(lobes * a + t * 5)), u = q * Math.cos(a), v = q * Math.sin(a); pos.push(cx + u * tz, cy + v + rad, cz - u * tx); } }
  for (let i = 0; i < TS; i++) for (let j = 0; j < AS; j++) { const a = i * (AS + 1) + j, b = a + AS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* a chocolate curl: a thin strip rolled on itself */
function curlGeo(L, R) {
  const TS = 40, WS = 5, pos = [], idx = [];
  for (let i = 0; i <= TS; i++) { const t = i / TS, a = t * TAU * 1.7, r = R * (1 - .45 * t); for (let j = 0; j <= WS; j++) pos.push((j / WS - .5) * L + r * .15 * Math.sin(a), r * Math.cos(a) + R, r * Math.sin(a)); }
  for (let i = 0; i < TS; i++) for (let j = 0; j < WS; j++) { const a = i * (WS + 1) + j, b = a + WS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* a drip: glaze running down from the lip, thick at the end where it stopped */
function dripGeo(len, w) {
  const pts = [[0, 0]]; const N = 14;
  for (let i = 0; i <= N; i++) { const t = i / N; pts.push([w * (.55 + .12 * Math.sin(t * 9) + .5 * Math.pow(t, 6)) * (t > .97 ? .6 : 1), -len * t]); }
  pts.push([0, -len - w * .45]);
  const g = new T.LatheGeometry(pts.map(p => new T.Vector2(Math.max(.001, p[0]), p[1])), 12); return g;
}
function ringInstances(geo, material, n, place) {
  const im = new T.InstancedMesh(geo, material, n), m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), e = new T.Euler();
  for (let k = 0; k < n; k++) { const o = place(k); p.set(o.x, o.y, o.z); e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); q.setFromEuler(e); s.setScalar(o.s || 1); if (o.sy) s.y *= o.sy; m.compose(p, q, s); im.setMatrixAt(k, m); }
  im.castShadow = true; im.receiveShadow = true; return im;
}

const PASTEL = [[244, 170, 190], [170, 210, 240], [250, 226, 150], [180, 226, 190], [214, 184, 236]];
function stripeTex(a, b) { const c = document.createElement('canvas'); c.width = 32; c.height = 128; const g = c.getContext('2d'); g.fillStyle = 'rgb(' + a.map(Math.round) + ')'; g.fillRect(0, 0, 32, 128); g.strokeStyle = 'rgb(' + b.map(Math.round) + ')'; g.lineWidth = 7; for (let y = -32; y < 160; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(32, y + 26); g.stroke(); } const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
const flameGeo = (() => { const p = []; for (let i = 0; i <= 14; i++) { const t = i / 14; p.push(new T.Vector2(Math.max(.001, .5 * Math.sin(Math.PI * Math.pow(t, .62)) * (1 - .25 * t)), t * 2.6)); } return new T.LatheGeometry(p, 14); })();

function candle(c, style, k, lit) {
  const g = new T.Group(), w = c.w, h = c.h; let body;
  if (style === 'striped') { const a = PASTEL[k % 5]; body = mat('wax', { map: stripeTex([250, 246, 236], a) }); }
  else if (style === 'pastel') body = mat('wax', { color: lin(PASTEL[k % 5]) });
  else if (style === 'neon') body = mat('wax', { color: lin(PASTEL[k % 5]), emissive: lin(PASTEL[k % 5]), emissiveIntensity: .8 });
  else if (style === 'crystal' || style === 'sparkler') body = mat('ceramic', { color: 0xdfe6ee, metalness: .7, roughness: .25 });
  else body = mat('wax', { color: lin([244, 236, 214]) });
  const st = new T.Mesh(new T.CylinderGeometry(w * (style === 'taper' ? .34 : .5), w * .5, h, 14, 1), body); st.position.y = h / 2; st.castShadow = true; g.add(st);
  const pool = new T.Mesh(new T.SphereGeometry(w * .5, 12, 6, 0, TAU, 0, Math.PI / 2), body); pool.scale.y = .35; pool.position.y = h; g.add(pool);              // melted top
  for (let d = 0; d < 2; d++) { const dr = new T.Mesh(dripGeo(h * (.12 + .2 * rnd()), w * .16), body); const a = rnd() * TAU; dr.position.set(Math.sin(a) * w * .46, h, Math.cos(a) * w * .46); g.add(dr); }
  const wick = new T.Mesh(new T.CylinderGeometry(w * .05, w * .06, w * .9, 6), new T.MeshStandardMaterial({ color: 0x1a1510, roughness: 1 })); wick.position.y = h + w * .45; wick.rotation.z = .12; g.add(wick);
  if (lit) {
    const fl = new T.Mesh(flameGeo, new T.MeshBasicMaterial({ color: new T.Color(1, .74, .32), transparent: true, opacity: .96 })); fl.scale.setScalar(w * .62); fl.position.y = h + w * .7; g.add(fl);
    const core = new T.Mesh(flameGeo, new T.MeshBasicMaterial({ color: new T.Color(1, .97, .86) })); core.scale.set(w * .36, w * .46, w * .36); core.position.y = h + w * .78; g.add(core);
    const blue = new T.Mesh(new T.SphereGeometry(w * .2, 8, 6), new T.MeshBasicMaterial({ color: new T.Color(.25, .4, 1), transparent: true, opacity: .7 })); blue.position.y = h + w * .82; g.add(blue);
    g.userData.flame = [fl, core]; g.userData.tip = h + w * 1.6;
  }
  g.position.set(c.x, c.y, c.z); return g;
}

function build(inp) {
  seed = 1 + (inp.seed || 7); const spec = inp.spec || {}, S = inp.sample, G = new T.Group(), M = readProfile(inp.prof), P = M.body, hmax = M.hmax, Rt = P[P.length - 1][0], R = M.R, y0 = M.plateTop;
  const finish = spec.finish || 'smooth', dark = [38, 22, 14];
  /* colours from the footage: the side ring by ring, the top by radius. Flames and glare are clipped so the icing is not read as white-hot. */
  /* The footage is lit warm and dim, so its pixels are not the icing's own colour. The label's icing colour sets the
     level and hue; the footage sets how each ring differs from the cake's median (bands, tiers, glaze over sponge). */
  const hex = h => h && /^#[0-9a-f]{6}$/i.test(h) ? [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] : null;
  const label = hex(spec.icing_end), ref = S.side(y0 + .5 * hmax), delit = c => { if (!label) return c; const o = c.map((v, i) => Math.min(255, label[i] * Math.min(1.6, Math.max(.45, (v + 12) / (ref[i] + 12))))); return mixc(o, c, .2); };
  const side = u => delit(S.side(u * hmax + y0)), top = u => delit(S.top(1 - u)), topC = delit(S.top(.35)), sideLow = delit(S.side(y0 + .3 * hmax)), sideHi = delit(S.side(y0 + .8 * hmax));
  let sideCol = u => lin(side(u)), topCol = u => lin(top(u)), disp = null, bm = 'cream', dome = .1;
  const tierTop = h => M.edges.some(e => Math.abs(e.h - h) < .03 * hmax);
  if (finish === 'ruffle') { const per = Math.max(hmax / 9, R * .12); disp = (h, a, v) => v * R * .028 * ((1 - 2 * Math.abs(((h / per + .06 * Math.sin(a * 7)) % 1) - .5)) + .25 * Math.sin(a * 23 + h * .4)); }
  else if (finish === 'smooth') disp = (h, a, v) => v * R * .004 * Math.sin(a * 5 + h * .1);
  else if (finish === 'ganache' || finish === 'mirror_glaze') { bm = 'glaze'; dome = .05; const base = lum(sideLow) > lum(topC) + 25 ? sideLow : topC; sideCol = () => lin(base); topCol = () => lin(topC); disp = (h, a, v) => v * R * .003 * Math.sin(a * 4); }
  else if (finish === 'naked') { bm = 'sponge'; const layers = 3; disp = (h, a, v) => { const f = (h / hmax * layers) % 1; return v * R * (f > .82 ? .035 * Math.sin((f - .82) / .18 * Math.PI) * (1 + .3 * Math.sin(a * 9)) : -.01); }; sideCol = u => { const f = (u * layers) % 1; return lin(f > .82 ? mixc(topC, [250, 244, 230], .5) : mixc(side(u), [196, 150, 96], .35)); }; }
  else if (finish === 'neon_circuit') { bm = 'neonbody'; sideCol = u => lin(mixc(side(u), [14, 12, 22], .7)); topCol = u => lin(mixc(top(u), [14, 12, 22], .7)); }
  const flutes = +spec.flutes || 0; if (flutes) { const d0 = disp; disp = (h, a, v, w) => (d0 ? d0(h, a, v, w) : 0) + (w.top ? 0 : R * .06 * Math.cos(flutes * a) * Math.sin(Math.PI * Math.min(1, h / hmax))); }
  const bodyMat = mat(bm, { vertexColors: true, flatShading: finish === 'faceted' });
  const body = new T.Mesh(bodyMesh(P, { disp, sideCol, topCol, dome }), bodyMat); body.position.y = y0; body.castShadow = body.receiveShadow = true; G.add(body);

  const creamCol = lum(sideHi) > 60 ? mixc(sideHi, [255, 250, 240], .25) : mixc(topC, [255, 250, 240], .15), piping = mat('cream', { color: lin(creamCol) });
  /* glaze lip and drips */
  if ((finish === 'ganache' || finish === 'mirror_glaze') || spec.drips) {
    const gm = mat('glaze', { color: lin(topC) }), amt = spec.drips == null ? .5 : +spec.drips;
    const lip = new T.Mesh(new T.TorusGeometry(Rt * .985, Rt * .035, 10, 96), gm); lip.rotation.x = Math.PI / 2; lip.position.y = y0 + hmax - Rt * .02; G.add(lip);
    const n = Math.round(18 + 16 * amt); for (let k = 0; k < n; k++) { const a = (k + rnd() * .7) / n * TAU, len = hmax * (.12 + amt * .7 * Math.pow(rnd(), 1.4)), w = Rt * (.03 + .03 * rnd()), d = new T.Mesh(dripGeo(len, w), gm); d.position.set(Math.sin(a) * (Rt + w * .2), y0 + hmax - Rt * .03, Math.cos(a) * (Rt + w * .2)); d.scale.z = .6; d.rotation.y = a; d.castShadow = true; G.add(d); }
  }
  /* borders: at the top rim, at each tier's shoulder, at the foot */
  const rims = [{ h: hmax, r: Rt * .93, top: true }].concat(M.edges.map(e => ({ h: e.h, r: e.R * .93, top: true })), [{ h: 0, r: P[0][0] * 1.0, foot: true }], M.edges.map(e => ({ h: e.h, r: e.r * 1.02, foot: true })));
  const border = spec.border || 'none';
  rims.forEach(rm => {
    if (border === 'shells') { const L = R * .2, n = Math.max(10, Math.round(TAU * rm.r / (L * .78))), geo = shellGeo(L, 7);
      G.add(ringInstances(geo, piping, n, k => { const a = k / n * TAU; return { x: Math.sin(a) * rm.r, y: y0 + rm.h + (rm.foot ? 0 : 0), z: Math.cos(a) * rm.r, ry: a + (rm.foot ? Math.PI : 0), rz: 0, s: (rm.foot ? 1.05 : .9) * (.94 + .12 * rnd()) }; })); }
    else if (border === 'beads') { const b = R * (rm.foot ? .05 : .04), n = Math.round(TAU * rm.r / (b * 2.05)); G.add(ringInstances(new T.SphereGeometry(b, 12, 9), rm.foot ? piping : mat('glaze', { color: lin(mixc(creamCol, [236, 180, 70], finish === 'ruffle' && lum(topC) > 150 ? .0 : .0)) }), n, k => { const a = k / n * TAU; return { x: Math.sin(a) * rm.r, y: y0 + rm.h + b * .7, z: Math.cos(a) * rm.r }; })); }
    else if (border === 'neon_ring') { const cN = S.bright || [120, 220, 255], t = new T.Mesh(new T.TorusGeometry(rm.r * 1.02, R * .014, 8, 96), new T.MeshBasicMaterial({ color: lin(cN) })); t.rotation.x = Math.PI / 2; t.position.y = y0 + rm.h + (rm.foot ? R * .02 : 0); G.add(t); }
  });
  /* toppings */
  if (spec.topping === 'cocoa_curls') { const geo = curlGeo(R * .2, R * .05), cm = mat('glaze', { color: lin(mixc(dark, topC, .25)), side: T.DoubleSide, roughness: .4 }); G.add(ringInstances(geo, cm, 16, k => { const a = rnd() * TAU, r = Rt * .55 * Math.sqrt(rnd()); return { x: Math.sin(a) * r, y: y0 + hmax + R * .01, z: Math.cos(a) * r, ry: rnd() * TAU, rx: (rnd() - .5) * .5, s: .8 + .6 * rnd() }; })); }
  if (border === 'shells' && finish !== 'naked') { const n = finish === 'ganache' ? 10 : 8, geo = rosetteGeo(R * .11, 6); G.add(ringInstances(geo, finish === 'ganache' ? mat('cream', { color: lin(mixc(topC, [120, 70, 40], .3)) }) : piping, n, k => { const a = (k + .5) / n * TAU; return { x: Math.sin(a) * Rt * .74, y: y0 + hmax, z: Math.cos(a) * Rt * .74, ry: rnd() * TAU }; })); }
  if (finish === 'neon_circuit') { const cN = S.bright || [120, 220, 255], lm = new T.MeshBasicMaterial({ color: lin(cN) }); for (let k = 0; k < 14; k++) { const pts = []; let a = rnd() * TAU, h = hmax * (.1 + .8 * rnd()); for (let s2 = 0; s2 < 7; s2++) { const r = radAt(P, h) * 1.012; pts.push(new T.Vector3(Math.sin(a) * r, y0 + h, Math.cos(a) * r)); if (s2 % 2) h = Math.min(hmax * .95, Math.max(hmax * .05, h + hmax * (.25 * (rnd() - .5)))); else a += .22 * (rnd() > .5 ? 1 : -1) * (1 + rnd()); const r2 = radAt(P, h) * 1.012; pts.push(new T.Vector3(Math.sin(a) * r2, y0 + h, Math.cos(a) * r2)); } G.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.02), 60, R * .008, 5), lm)); } }
  /* plate */
  const pr = Math.max(M.plateR, P[0][0] * 1.16), pc = S.plate && lum(S.plate) > 40 ? S.plate : [232, 228, 220], th = Math.max(R * .03, y0 * .5);
  const plate = new T.Mesh(new T.LatheGeometry([[0, y0 - th], [pr * .55, y0 - th], [pr * .98, y0 - th * .2], [pr, y0 + th * .15], [pr * .97, y0 + th * .2], [pr * .6, y0], [0, y0]].map(p => new T.Vector2(Math.max(.001, p[0]), p[1])), 96), mat('ceramic', { color: lin(pc) })); plate.receiveShadow = true; plate.castShadow = true; G.add(plate);
  /* candles: where the footage has them if enough were found, else the labelled count on a ring */
  const want = +spec.candles || 0, found = (inp.candles || []).filter(c => c.h > R * .12), flames = [], lit = !/^out$/.test(spec.flame || 'lit');
  let list = [];
  if (found.length >= Math.max(3, want * .6)) list = found.map(c => ({ x: c.x, z: c.z, h: c.h, w: Math.max(c.w, R * .045) }));
  else if (want) {
    /* as many as fit on the top stand there; the rest stand on the shoulders of the tiers below */
    const cw = Math.min(R * (spec.candle_style === 'taper' ? .05 : .06), Rt * .13), hh = Math.min(found.length ? found.map(c => c.h).sort((a, b) => a - b)[found.length >> 1] : R * .62, Math.max(Rt * 1.3, R * .4));
    const spots = [{ r: Rt * (want > 8 ? .7 : .55), y: null }].concat(M.edges.slice().reverse().map(e => ({ r: (e.R + e.r) / 2, y: y0 + e.h })));
    let left = want; spots.forEach((sp, si) => { if (!left) return; const fit = Math.max(1, Math.floor(TAU * sp.r / (cw * 2.6))), n = si === spots.length - 1 ? left : Math.min(left, fit); left -= n; for (let k = 0; k < n; k++) { const a = k / n * TAU + .3 + si; list.push({ x: Math.sin(a) * sp.r, z: Math.cos(a) * sp.r, h: hh * (.92 + .16 * rnd()), w: cw, y: sp.y }); } });
  }
  let lx = 0, lz = 0, ly = 0;
  list.forEach((c, k) => { c.y = c.y != null ? c.y : y0 + hmax + (dome * Rt * .3) * (1 - Math.pow(Math.hypot(c.x, c.z) / Rt, 2)) - R * .01; const cg = candle(c, spec.candle_style || 'taper', k, lit); G.add(cg); if (cg.userData.flame) { flames.push(cg); lx += c.x; lz += c.z; ly += c.y + cg.userData.tip; } });
  const lights = [];
  if (flames.length) { const pl = new T.PointLight(new T.Color(1, .68, .36), 1.5 + .12 * flames.length, R * 14, 2); pl.position.set(lx / flames.length, ly / flames.length + R * .15, lz / flames.length); pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024); pl.shadow.bias = -.004; pl.shadow.radius = 3; G.add(pl); lights.push(pl); }
  G.userData = { lights, flames, R, hmax: hmax + y0, parts: G.children.length, candles: list.length, tiers: M.edges.length + 1 };
  return G;
}
window.CAKEMODEL = { build, readProfile };
})();
