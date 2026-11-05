/* =============================================================== PLANES: where a thing can be. Each has its own two place coordinates.
   TABLE  stands on the table top (across, depth)      FLOOR  stands on the floor (across, depth)
   AIR    hangs over the table (across, up)            BACK   a glass plane behind the table, as in a multiplane camera (across, up; depth is its distance)
   FLAT   lies on the table like a photograph or a napkin (across, depth) */
const PLANES = ['TABLE', 'FLOOR', 'AIR', 'BACK', 'FLAT'];
const ITEMG = new T.Group(); MEM.add(ITEMG);
function planeY(pl) { return pl === 'FLOOR' ? 0 : TOP; }
/* =============================================================== CUT-OUTS: stills and moving sprite sheets from the catalog */
let CAT = []; const CATBY = {}; const TEX = {};
fetch('cut/catalog.json').then(r => r.json()).then(c => { CAT = c; c.forEach(x => CATBY[x.id] = x); dirty.items = true; oledDirty = true; }).catch(() => {});
function sheetTex(e) { if (TEX[e.id]) return TEX[e.id]; const t = new T.TextureLoader().load(e.src, () => { dirty.items = true; }); t.encoding = T.sRGBEncoding; t.anisotropy = 4; t.minFilter = T.LinearFilter; return TEX[e.id] = t; }
function cutMesh(it) { const e = CATBY[it.ref]; if (!e) return null; const base = sheetTex(e), tex = base.clone(); tex.needsUpdate = true; tex.repeat.set(1 / e.cols, 1 / e.rows);
  const mat = mistify(new T.MeshStandardMaterial({ map: tex, alphaTest: .35, side: T.DoubleSide, roughness: .92, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .14, transparent: true }));
  const m = new T.Mesh(new T.PlaneGeometry(1, 1), mat); m.castShadow = true; m.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: tex, alphaTest: .35 }); m.userData = { cut: e, tex }; return m; }
function setFrame(m, f) { const e = m.userData.cut, i = ((f % e.frames) + e.frames) % e.frames; m.userData.tex.offset.set((i % e.cols) / e.cols, 1 - (Math.floor(i / e.cols) + 1) / e.rows); }
/* =============================================================== PROPS: the things a birthday table has */
const PALETTE = [['RED', 0xc23b32], ['ROSE', 0xe7a1b0], ['SKY', 0x8fb8e0], ['MINT', 0xa8d8bf], ['LEMON', 0xeed27a], ['WHITE', 0xf3efe6], ['GOLD', 0xd2a23a], ['NAVY', 0x2c3e66], ['GREEN', 0x4f8a4a]];
const PROPS = { 'PLATE': 'TABLE', 'CAKE SLICE': 'TABLE', 'FORK': 'TABLE', 'SPOON': 'TABLE', 'CUP': 'TABLE', 'GLASS OF MILK': 'TABLE', 'PARTY HAT': 'TABLE', 'PRESENT': 'TABLE', 'BOWL OF BERRIES': 'TABLE', 'MATCHBOX': 'TABLE', 'NAPKIN': 'FLAT', 'BALLOON': 'AIR', 'STREAMER': 'AIR' };
const pmat = (c, o) => mistify(new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .55 }, o || {})));
function propMesh(it) { const g = new T.Group(), col = PALETTE[it.color || 0][1], S = (x) => { x.castShadow = x.receiveShadow = true; g.add(x); return x; };
  const n = it.ref;
  if (n === 'PLATE' || n === 'CAKE SLICE') { const p = S(new T.Mesh(new T.LatheGeometry([[0, 0], [.07, 0], [.085, .008], [.09, .012], [.086, .013], [.068, .004], [0, .004]].map(q => new T.Vector2(q[0], q[1])), 48), pmat(0xf4f1ea, { roughness: .2 })));
    if (n === 'CAKE SLICE') { const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(.06, -.022); sh.lineTo(.06, .022); sh.lineTo(0, 0); const w = S(new T.Mesh(new T.ExtrudeGeometry(sh, { depth: .045, bevelEnabled: false }), pmat(0xf0e2c4, { roughness: .8 }))); w.rotation.x = -Math.PI / 2; w.position.set(-.03, .005, 0);
      const sp = S(new T.Mesh(new T.BoxGeometry(.003, .036, .043), pmat(0xc99b5e))); sp.position.set(.03, .028, 0); } }
  else if (n === 'FORK' || n === 'SPOON') { const h = S(new T.Mesh(new T.BoxGeometry(.006, .002, .11), pmat(0xc9c6bf, { metalness: .9, roughness: .25 }))); h.position.y = .002; if (n === 'SPOON') { const b = S(new T.Mesh(new T.SphereGeometry(.012, 16, 8), pmat(0xc9c6bf, { metalness: .9, roughness: .25 }))); b.scale.set(1, .25, 1.4); b.position.set(0, .003, -.06); } else for (const dx of [-.006, -.002, .002, .006]) { const t = S(new T.Mesh(new T.BoxGeometry(.0015, .0015, .03), pmat(0xc9c6bf, { metalness: .9, roughness: .25 }))); t.position.set(dx, .002, -.07); } }
  else if (n === 'CUP') { S(new T.Mesh(new T.LatheGeometry([[0, 0], [.028, 0], [.033, .07], [.031, .07], [.026, .004], [0, .004]].map(q => new T.Vector2(q[0], q[1])), 32), pmat(col, { roughness: .4 }))); }
  else if (n === 'GLASS OF MILK') { S(new T.Mesh(new T.CylinderGeometry(.026, .023, .1, 24, 1, true), pmat(0xdfe8e6, { transparent: true, opacity: .35, roughness: .05 }))).position.y = .05; S(new T.Mesh(new T.CylinderGeometry(.024, .022, .075, 24), pmat(0xf7f5ef, { roughness: .3 }))).position.y = .039; }
  else if (n === 'PARTY HAT') { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#' + col.toString(16).padStart(6, '0'); x.fillRect(0, 0, 64, 64); x.fillStyle = '#f6f1e4'; for (let k = 0; k < 64; k += 16) x.fillRect(k, 0, 7, 64); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 1); t.encoding = T.sRGBEncoding;
    S(new T.Mesh(new T.ConeGeometry(.04, .11, 32, 1, true), pmat(0xffffff, { map: t, side: T.DoubleSide }))).position.y = .055; S(new T.Mesh(new T.SphereGeometry(.011, 12, 8), pmat(0xf6f1e4, { roughness: 1 }))).position.y = .112; }
  else if (n === 'PRESENT') { S(new T.Mesh(new T.BoxGeometry(.11, .08, .09), pmat(col, { roughness: .35 }))).position.y = .04; const rib = pmat(0xf2e6c8, { roughness: .3, metalness: .2 }); S(new T.Mesh(new T.BoxGeometry(.112, .082, .014), rib)).position.y = .04; S(new T.Mesh(new T.BoxGeometry(.014, .082, .092), rib)).position.y = .04;
    for (const r of [-.6, .6]) { const b = S(new T.Mesh(new T.TorusGeometry(.016, .005, 8, 16), rib)); b.position.y = .086; b.rotation.set(Math.PI / 2 - .4, r, 0); } }
  else if (n === 'BOWL OF BERRIES') { S(new T.Mesh(new T.LatheGeometry([[0, 0], [.03, 0], [.05, .035], [.047, .035], [.028, .004], [0, .004]].map(q => new T.Vector2(q[0], q[1])), 32), pmat(0xf2efe8, { roughness: .2 }))); const bm = pmat(0x5a1230, { roughness: .3 });
    for (let k = 0; k < 14; k++) { const a = k * 2.4, r = .012 + (k % 3) * .009; S(new T.Mesh(new T.SphereGeometry(.009, 10, 8), bm)).position.set(Math.cos(a) * r, .03 + (k % 4) * .004, Math.sin(a) * r); } }
  else if (n === 'MATCHBOX') { S(new T.Mesh(new T.BoxGeometry(.05, .014, .035), pmat(0xd8c49a))).position.y = .007; const m = S(new T.Mesh(new T.BoxGeometry(.035, .003, .002), pmat(0xe9dcc0))); m.position.set(.03, .002, .03); m.rotation.y = .5; }
  else if (n === 'NAPKIN') { const m = S(new T.Mesh(new T.PlaneGeometry(.14, .14, 6, 6), pmat(col, { side: T.DoubleSide, roughness: .9 }))); m.rotation.x = -Math.PI / 2; m.position.y = .0015; const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * .0015); m.geometry.computeVertexNormals(); }
  else if (n === 'BALLOON') { const b = S(new T.Mesh(new T.SphereGeometry(.07, 32, 20), pmat(col, { roughness: .18, clearcoat: 1 }))); b.scale.set(1, 1.18, 1); const knot = S(new T.Mesh(new T.ConeGeometry(.008, .014, 8), pmat(col))); knot.position.y = -.088; knot.rotation.x = Math.PI;
    g.add(new T.Line(new T.BufferGeometry().setFromPoints(Array.from({ length: 20 }, (_, k) => new T.Vector3(Math.sin(k * .7) * .01, -.095 - k * .025, 0))), new T.LineBasicMaterial({ color: 0xe8e2d6 }))); }
  else if (n === 'STREAMER') { const pts = Array.from({ length: 30 }, (_, k) => new T.Vector3((k / 29 - .5) * .9, -Math.sin(k / 29 * Math.PI) * .12, 0)); const m = S(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 60, .004, 6), pmat(col, { roughness: .6 }))); }
  g.userData.prop = true; return g; }
/* =============================================================== THE MESS: crumbs, confetti and wax that make a table look used */
const MESSG = new T.Group(); MEM.add(MESSG);
function buildMess(k, tw) { MESSG.clear(); if (!k || !tw) return; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const R0 = .55 * tw * Math.cos(Math.PI / 6), crumb = new T.InstancedMesh(new T.DodecahedronGeometry(.003, 0), pmat(0xc99b5e, { roughness: .9 }), Math.round(260 * k)), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  for (let i = 0; i < crumb.count; i++) { const a = rnd() * TAU, r = .12 + Math.pow(rnd(), 1.6) * (R0 - .12), s = .5 + rnd() * 1.4; q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3)); m4.compose(new T.Vector3(Math.cos(a) * r, TOP + .002, Math.sin(a) * r), q, new T.Vector3(s, s * .7, s)); crumb.setMatrixAt(i, m4); }
  crumb.receiveShadow = true; MESSG.add(crumb);
  const cols = [0xe84a5f, 0xf6c445, 0x5bc0eb, 0x9bc53d, 0xf6f6f6, 0xc86fc9], N = Math.round(180 * k); for (let c = 0; c < cols.length; c++) { const im = new T.InstancedMesh(new T.PlaneGeometry(.007, .005), pmat(cols[c], { side: T.DoubleSide, roughness: .5 }), Math.ceil(N / cols.length));
    for (let i = 0; i < im.count; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * R0 * 1.02; q.setFromEuler(e.set(-Math.PI / 2 + (rnd() - .5) * .3, 0, rnd() * TAU)); m4.compose(new T.Vector3(Math.cos(a) * r, TOP + .0012, Math.sin(a) * r), q, new T.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); } MESSG.add(im); } }
/* =============================================================== THE ETCH A SKETCH: icing drawn on the cake with two knobs */
const SKETCHG = new T.Group(); CAKE.add(SKETCHG); const penMark = new T.Mesh(new T.SphereGeometry(.004, 12, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthTest: false })); penMark.renderOrder = 30; CAKE.add(penMark);
function buildSketch(sk, F) { SKETCHG.clear(); penMark.visible = false; if (!sk || !F) return; const R0 = (F.ring ? F.edge + .03 : F.edge) * .92, y = (u, v) => F.domed ? F.top - .006 - (u * u + v * v) * .03 : F.top + .002;
  const at = (u, v) => new T.Vector3(u * R0, y(u, v) + .0015, v * R0), mat = pmat(PALETTE[sk.col || 0][1], { roughness: .5 }); let run = [];
  const flush = () => { if (run.length > 1) { const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(run), Math.max(4, run.length * 3), .0019, 6), mat); m.castShadow = true; SKETCHG.add(m); } run = []; };
  sk.pts.forEach(p => { if (p[2]) run.push(at(p[0], p[1])); else flush(); }); flush(); penMark.position.copy(at(sk.u, sk.v)); penMark.visible = true; penMark.material.color.setHex(sk.down ? 0xff6050 : 0xffffff); }
