/* =============================================================== THE DOCUMENT: the scene. The room is rebuilt from it; undo keeps copies of it. */
const DOC0 = () => ({ cake: null, candles: null, writing: null, table: null, kids: [], light: { a: 40, h: .8, warm: .75, k: 1.2 } });
let DOC = DOC0(); const UNDO = [], REDO = []; let gestT = -9, dirty = { cake: true, table: true };
const S = { mode: 'EDIT', pick: null, cWhich: 0, adding: null, lastRing: -1, hoverRing: -1, msg: '', msgT: -9, retT: -9, pairShow: false, stretch: 1,
  view: { preset: 'EYE', yaw: 0, pitch: .21, dist: 1.38, fov: 38, tgt: new T.Vector3(0, .69, 0), pan: new T.Vector3() } };
const VIEWS = { EYE: { yaw: 0, pitch: .21, dist: 1.38, fov: 38, eye: true }, FRONT: { yaw: 0, pitch: .06, dist: 1.3, fov: 32 }, SIDE: { yaw: Math.PI / 2, pitch: .06, dist: 1.3, fov: 32 }, TOP: { yaw: 0, pitch: 1.5, dist: 1.4, fov: 32 }, FREE: null };
const CAM = { yaw: 0, pitch: .21, dist: 1.38, fov: 38, tgt: new T.Vector3(0, .69, 0) };   // where the camera is; S.view is where it is going
function snap(force) { if (!force && NOW - gestT < 1.2) { gestT = NOW; return; } gestT = NOW; UNDO.push(JSON.stringify(DOC)); if (UNDO.length > 120) UNDO.shift(); REDO.length = 0; }
function setDoc(d) { DOC = d; dirty.cake = dirty.table = true; if (!things().some(t => t.key === S.pick)) S.pick = (things()[0] || {}).key || null; }
function say(m) { S.msg = m; S.msgT = NOW; oledDirty = true; }
function chime() { tone(1320, 1310, .09, .1); setTimeout(() => tone(1760, 1750, .14, .08), 70); }

/* =============================================================== OBJECTS: what is in the scene, and what could be added */
function things() { const L = []; if (DOC.cake) L.push({ key: 'cake', name: 'CAKE' }); if (DOC.candles) L.push({ key: 'candles', name: 'CANDLES' }); if (DOC.writing) L.push({ key: 'writing', name: 'WRITING' }); if (DOC.table) L.push({ key: 'table', name: 'TABLE' });
  DOC.kids.slice().sort((a, b) => a.i - b.i).forEach(c => L.push({ key: 'kid' + c.i, name: 'FIGURE ' + (c.i + 1), c })); L.push({ key: 'light', name: 'LIGHT' }); return L; }
function addable() { const L = []; if (!DOC.cake) L.push({ key: 'cake', name: 'CAKE' }); if (DOC.cake && !DOC.candles) L.push({ key: 'candles', name: 'CANDLES' }); if (DOC.cake && !DOC.writing) L.push({ key: 'writing', name: 'WRITING' }); if (!DOC.table) L.push({ key: 'table', name: 'TABLE' });
  [0, 1, 2].forEach(i => { if (!DOC.kids.some(c => c.i === i)) L.push({ key: 'kid' + i, name: 'FIGURE ' + (i + 1) }); }); return L; }
function create(key) { if (key === 'cake') DOC.cake = { form: 'DRUM', icing: 1, border: 0, size: 1 }; else if (key === 'candles') { DOC.candles = { n: 7, lit: 1, spread: 1, len: 1, ctype: 0, per: {} }; S.cWhich = 0; } else if (key === 'writing') DOC.writing = { text: 'HAPPY/BIRTHDAY', cur: 14, size: 1, col: 0 };
  else if (key === 'table') DOC.table = { w: 1, wood: 0, shape: 0, k: 0 }; else { const i = +key.slice(3); DOC.kids.push({ i, a: KIDS[i].slot, r: .62, face: 0, s: 1 }); } dirty.cake = dirty.table = true; S.pick = key; }
function remove(key) { if (key === 'cake') { DOC.cake = null; DOC.candles = null; DOC.writing = null; } else if (key === 'candles') DOC.candles = null; else if (key === 'writing') DOC.writing = null; else if (key === 'table') DOC.table = null; else if (key.startsWith('kid')) DOC.kids = DOC.kids.filter(c => c.i !== +key.slice(3)); else return false; dirty.cake = dirty.table = true; return true; }
const picked = () => things().find(t => t.key === S.pick) || null;

/* =============================================================== THE RINGS */
const list = (n, get, set, L) => ({ n, v: get, set: v => set(clamp(Math.round(v), 0, L.length - 1)), st: 1, f: v => L[clamp(Math.round(v), 0, L.length - 1)], lo: 0, hi: L.length - 1, step: true });
const num = (n, get, set, lo, hi, st, f, wrap) => ({ n, v: get, set: v => set(wrap ? ((v - lo) % (hi - lo) + (hi - lo)) % (hi - lo) + lo : clamp(+v.toFixed(4), lo, hi)), st, f, lo, hi, wrap });
const deg = v => Math.round(((v * 57.2958) % 360 + 540) % 360 - 180) + '°';
function rings() {
  if (window.REMOTE_RINGS) return window.REMOTE_RINGS();
  const out = [null, null, null, null, null];
  if (S.mode === 'VIEW') { const V = S.view, free = () => { if (V.preset !== 'FREE') V.preset = 'FREE'; }, P = Object.keys(VIEWS);
    out[0] = list('CAMERA', () => P.indexOf(V.preset), v => setView(P[v]), P);
    out[1] = num('ORBIT', () => V.yaw, v => { free(); V.yaw = v; }, -Math.PI, Math.PI, 5 / 57.3, deg, true);
    out[2] = num('TILT', () => V.pitch, v => { free(); V.pitch = v; }, -.2, 1.5, 3 / 57.3, v => Math.round(v * 57.3) + '°');
    out[3] = num('ZOOM', () => V.dist, v => { free(); V.dist = v; }, .25, 4, .05, v => v.toFixed(2) + ' M');
    out[4] = num('LENS', () => V.fov, v => V.fov = Math.round(v), 14, 70, 2, v => Math.round(12 / Math.tan(v * Math.PI / 360)) + ' MM'); return out; }
  if (S.adding) { const A = addable(); out[0] = list('ADD', () => Math.max(0, A.findIndex(t => t.key === S.adding)), v => { S.adding = A[v].key; }, A.map(t => t.name)); return out; }
  const L = things(); if (L.length > 1) out[0] = list('PICK', () => Math.max(0, L.findIndex(t => t.key === S.pick)), v => { if (L[v].key !== S.pick) { S.pick = L[v].key; chime(); } }, L.map(t => t.name));
  const p = picked(); if (!p) return out; const C = DOC.cake, Cd = DOC.candles, Tb = DOC.table, Lt = DOC.light, ch = p.c, dc = () => dirty.cake = true;
  const props = p.key === 'cake' ? [list('FORM', () => Object.keys(FORMS).indexOf(C.form), v => { C.form = Object.keys(FORMS)[v]; dc(); }, Object.keys(FORMS)), list('ICING', () => C.icing, v => { C.icing = v; dc(); }, ICING.map(i => i[0])),
      list('BORDER', () => C.border, v => { C.border = v; dc(); }, BORDER.map(i => i[0])), num('SIZE', () => C.size, v => { C.size = v; dc(); }, .6, 1.8, .05, v => '×' + v.toFixed(2))]
    : p.key === 'candles' ? candleRings(Cd, dc)
    : p.key === 'writing' ? writingRings(DOC.writing, dc)
    : p.key === 'table' ? [num('WIDTH', () => Tb.w, v => { Tb.w = v; dirty.table = true; }, .6, 1.6, .05, v => Math.round(120 * v) + ' CM'), list('WOOD', () => Tb.wood, v => { Tb.wood = v; dirty.table = true; }, WOOD.map(w => w[0])), list('SHAPE', () => Tb.shape, v => { Tb.shape = v; dirty.table = true; }, ['HEX', 'ROUND'])]
    : p.key === 'light' ? [num('AROUND', () => Lt.a, v => Lt.a = v, -180, 180, 10, v => Math.round(v) + '°', true), num('HEIGHT', () => Lt.h, v => Lt.h = v, .05, 1.6, .05, v => Math.round(v * 100) + ' CM'), num('WARMTH', () => Lt.warm, v => Lt.warm = v, 0, 1, .05, v => Math.round(lerp(6500, 2200, v) / 100) * 100 + ' K'), num('STRENGTH', () => Lt.k, v => Lt.k = v, 0, 3, .1, v => Math.round(v / 3 * 100) + '%')]
    : [num('AROUND', () => ch.a * 57.2958, v => ch.a = v / 57.2958, 0, 360, 4, v => Math.round(v) + '°', true), num('DISTANCE', () => ch.r, v => ch.r = v, .3, 1.3, .025, v => Math.round(v * 100) + ' CM'), num('FACE', () => ch.face, v => ch.face = Math.round(v), -90, 90, 5, v => (v > 0 ? '+' : '') + Math.round(v) + '°'), num('SIZE', () => ch.s, v => ch.s = v, .6, 1.5, .05, v => '×' + v.toFixed(2))];
  props.forEach((r, i) => { r.undoable = true; out[i + 1] = r; }); return out; }
function candleRings(Cd, dc) { const single = CTYPES[Cd.ctype][0] === 'NUMBER', W = single ? ['ALL'] : ['ALL', ...Array.from({ length: Cd.n }, (_, k) => 'CANDLE ' + (k + 1))]; S.cWhich = Math.min(S.cWhich, W.length - 1);
  const which = list('WHICH', () => S.cWhich, v => { S.cWhich = v; }, W); if (S.cWhich === 0) return [which, list('KIND', () => Cd.ctype, v => { Cd.ctype = v; dc(); }, CTYPES.map(c => c[0])), num('COUNT', () => Cd.n, v => { Cd.n = Math.round(v); Cd.per = {}; dc(); }, 1, 12, 1, v => String(Math.round(v))), list('FLAMES', () => Cd.lit, v => { Cd.lit = v; Cd.per = Object.fromEntries(Object.entries(Cd.per).map(([k, o]) => [k, { ...o, out: false }])); dc(); }, ['ALL OUT', 'ALL LIT'])];
  const k = S.cWhich - 1, P = () => Cd.per[k] || (Cd.per[k] = {});
  return [which, num('AROUND', () => (P().da || 0) * 57.2958, v => { P().da = v / 57.2958; dc(); }, -180, 180, 4, v => (v > 0 ? '+' : '') + Math.round(v) + '°'), num('IN / OUT', () => P().rf == null ? 1 : P().rf, v => { P().rf = v; dc(); }, 0, 1.6, .05, v => Math.round(v * 100) + '%'), list('FLAME', () => (P().out || !Cd.lit) ? 0 : 1, v => { P().out = !v; if (v) Cd.lit = 1; dc(); }, ['OUT', 'LIT'])]; }
const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!&'.-/生日快乐";
function writingRings(Wt, dc) { const at = () => Wt.text[Wt.cur] || ' ';
  return [list('LETTER', () => Math.max(0, CHARS.indexOf(at())), v => { const ch = CHARS[v]; Wt.text = Wt.text.slice(0, Wt.cur) + ch + Wt.text.slice(Wt.cur + 1); Wt.edit = true; dc(); }, CHARS.split('').map(c => c === ' ' ? 'SPACE' : c === '/' ? 'NEW LINE' : c)),
    num('CURSOR', () => Wt.cur, v => { Wt.cur = Math.round(v); }, 0, Math.max(1, Wt.text.length), 1, v => (Math.round(v) + 1) + ' OF ' + (Wt.text.length + 1)),
    num('SIZE', () => Wt.size, v => { Wt.size = v; dc(); }, .4, 1.3, .05, v => '×' + v.toFixed(2)), list('COLOUR', () => Wt.col, v => { Wt.col = v; dc(); }, WCOLS.map(c => c[0]))]; }
function v01(r) { if (r && r.u != null) return r.u; if (!r || r.lo == null) return .5; let v = r.v(); if (r.wrap) { const sp = r.hi - r.lo; v = ((v - r.lo) % sp + sp) % sp + r.lo; } return clamp((v - r.lo) / Math.max(1e-6, r.hi - r.lo), 0, 1); }
const AXC = ['#ff5b4d', '#5fe36e', '#4f8dff'];
let scrubAcc = [0, 0, 0, 0, 0];
function turn(i, steps) { if (window.REMOTE) { tick('ring', i); ORB.spin(i, steps); S.lastRing = i; return window.REMOTE({ k: 'turn', i, steps }); }
  const r = rings()[i]; if (!r) { tick('dead'); return; } tick('ring', i); if (r.undoable) snap(); r.set(r.v() + r.st * steps); S.lastRing = i; S.retT = NOW; ORB.spin(i, steps); oledDirty = true; }
function scrub(i, frac) { if (window.REMOTE) { ORB.spin(i, frac); S.lastRing = i; return window.REMOTE({ k: 'scrub', i, frac }); }
  const r = rings()[i]; if (!r) return; if (r.step || r.st >= 1) { scrubAcc[i] += frac; while (Math.abs(scrubAcc[i]) >= 1) { turn(i, Math.sign(scrubAcc[i])); scrubAcc[i] -= Math.sign(scrubAcc[i]); } return; }
  if (r.undoable) snap(); const b = Math.floor(r.v() / r.st); r.set(r.v() + r.st * frac); if (Math.floor(r.v() / r.st) !== b) tick('ring', i); S.lastRing = i; S.retT = NOW; ORB.spin(i, frac); oledDirty = true; }
/* the camera: presets, and free movement from the grip, the lens end, and the mouse in the room */
function sceneBox() { const b = new T.Box3(); ['cake', 'candles', 'table', ...DOC.kids.map(c => 'kid' + c.i)].forEach(k => { const x = boxOf(k); if (x) b.union(x); }); return b.isEmpty() ? null : b; }
function setView(p) { const V = S.view; V.preset = p; const P = VIEWS[p]; if (P) { const b = sceneBox(), sz = b ? b.getSize(new T.Vector3()).length() : .3; V.yaw = P.yaw; V.pitch = P.pitch; V.dist = P.eye ? P.dist : clamp(sz * .32 / Math.tan(P.fov * Math.PI / 360), .45, 3.5); V.fov = P.fov; V.pan.set(0, 0, 0); } say('CAMERA · ' + p); }
function viewBy(dyaw, dpitch, dzoom, panx, pany) { if (window.REMOTE) return window.REMOTE({ k: 'view', dx: dyaw, dy: dpitch, dc: dzoom, px: panx, py: pany }); const V = S.view; if (V.preset !== 'FREE') { V.preset = 'FREE'; oledDirty = true; }
  V.yaw += dyaw || 0; V.pitch = clamp(V.pitch + (dpitch || 0), -.2, 1.5); V.dist = clamp(V.dist * Math.exp(-(dzoom || 0)), .25, 4);
  if (panx || pany) { const r = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), u = new T.Vector3(0, 1, 0).applyQuaternion(cam.quaternion); V.pan.addScaledVector(r, -(panx || 0) * V.dist).addScaledVector(u, (pany || 0) * V.dist); }
  setStretch(1 + clamp((1.38 - V.dist) / 1.1, 0, 1) * .45); }

/* =============================================================== BUTTONS: MODE · UNDO on the grip; ADD · DEL · KEEP on the lens end. Each is lit only when it can act. */
function press(b, long) { if (window.REMOTE) { tick('press'); ORB.push(b); return window.REMOTE({ k: 'press', b, long }); } tick('press'); ORB.push(b);
  if (b === 'MODE') { S.adding = null; S.mode = S.mode === 'EDIT' ? 'VIEW' : 'EDIT'; say(S.mode === 'VIEW' ? 'VIEW · THE RINGS MOVE THE CAMERA' : 'EDIT · THE RINGS CHANGE ' + (picked() || { name: 'THE SCENE' }).name); }
  else if (b === 'ADD') { if (S.mode !== 'EDIT') { S.mode = 'EDIT'; } const A = addable(); if (!A.length) { tick('dead'); say('EVERYTHING IS IN THE SCENE'); return; }
    if (!S.adding) { S.adding = A[0].key; say('TURN RING 1 TO CHOOSE · ADD AGAIN TO PUT IT IN'); } else { snap(true); create(S.adding); const n = (picked() || {}).name; S.adding = null; chime(); say(n + ' ADDED'); } }
  else if (b === 'DEL') { if (S.adding) { S.adding = null; say('CANCELLED'); return; } const p = picked(); if (!p || p.key === 'light') { tick('dead'); return; } snap(true); remove(p.key); setDoc(DOC); say(p.name + ' REMOVED · UNDO BRINGS IT BACK'); }
  else if (b === 'UNDO') { if (S.adding) { S.adding = null; say('CANCELLED'); return; } const from = long ? REDO : UNDO, to = long ? UNDO : REDO, s = from.pop(); if (!s) { tick('dead'); say(long ? 'NOTHING TO REDO' : 'NOTHING TO UNDO'); return; } to.push(JSON.stringify(DOC)); setDoc(JSON.parse(s)); say(long ? 'REDONE' : 'UNDONE'); }
  else if (b === 'KEEP') keep();
  else if (b === 'PAIR') PAIR.open();
  oledDirty = true; }
function keep() { try { new T.GLTFExporter().parse(MEM, r => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r], { type: 'model/gltf-binary' })); a.download = 'memory.glb'; document.body.append(a); a.click(); setTimeout(() => a.remove(), 1000); say('KEPT · MEMORY.GLB'); }, { binary: true }); } catch (e) { say('COULD NOT KEEP · ' + e.message.slice(0, 30)); } }
const nextAct = () => null;
/*PAIR*/
const CAN_KEEP = window.top === window && !PHONE;
const BTN = {};
[['MODE', -.89, -.07, 0xd9d5cc], ['UNDO', -.77, .07, 0xd9d5cc], ['PAIR', -.655, -.08, 0x9cd6cc], ['ADD', .66, -.1, 0xd9d5cc], ['DEL', .77, .03, 0xd9d5cc], ['KEEP', .88, -.1, 0x5ff0dc]].forEach(([n, x, dz, col]) => { if (n === 'KEEP' && !CAN_KEEP) return;
  const a = .95 + dz * 2, y = Math.cos(a) * .25, z = Math.sin(a) * .25; const g = new T.Group(); g.position.set(x, y, z); g.lookAt(x, y * 3, z * 3); g.userData.keepW = true; ORB.add(g);
  const well = new T.Mesh(new T.CylinderGeometry(.045, .045, .012, 40), darkAlu); well.rotation.x = Math.PI / 2; g.add(well);
  const cap = new T.Mesh(new T.SphereGeometry(.038, 32, 16, 0, TAU, 0, Math.PI / 2), new T.MeshPhysicalMaterial({ color: col, metalness: .8, roughness: .3, clearcoat: .6 })); cap.rotation.x = Math.PI / 2; cap.scale.set(1, .42, 1); cap.position.z = .006; cap.userData.btn = n; g.add(cap);
  const lab = new T.Mesh(new T.PlaneGeometry(.17, .051), new T.MeshBasicMaterial({ map: label(n), transparent: true, toneMapped: false })); lab.position.set(0, -.072, .002); lab.userData.btn = n; g.add(lab); FLAT.push(lab);
  const ic = new T.Mesh(new T.CircleGeometry(.026, 32), new T.MeshBasicMaterial({ map: iconTex(n, '#1b1a17'), transparent: true, toneMapped: false })); ic.position.z = .006 + .038 * .42 + .0015; ic.userData.btn = n; g.add(ic); FLAT.push(ic);
  BTN[n] = { g, cap, lab, z0: .006, down: 0 }; });
let orbPitchV = 0; ORB.rotation.x = .18;
ORB.spin = (i, steps) => { const r = RINGS[i]; r.target += steps * TAU / 36; orbPitchV += Math.sign(steps) * .02; };
ORB.push = b => { if (BTN[b]) { BTN[b].down = 1; orbPitchV -= .02; } };
function setStretch(v) { S.stretch = clamp(v, 1, 1.8); ORB.scale.x = S.stretch; ORB.traverse(o => { if (o.userData.keepW) o.scale.x = 1 / S.stretch; }); fitOrb(); }

/* =============================================================== HANDS ON THE ORB: rings up/down click, sideways scrub; grip end orbits; lens end zooms; pinch zooms */
const oray = new T.Raycaster(), ondc = new T.Vector2(); let odrag = null; const optrs = new Map();
function orbHit(e) { const r = OR.domElement.getBoundingClientRect(); ondc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); oray.setFromCamera(ondc, OC); const h = oray.intersectObjects(ORB.children, true)[0]; if (!h) return null; let o = h.object; while (o && o.userData.ring == null && !o.userData.btn && !o.userData.grip && !o.userData.pair && !o.userData.lens) o = o.parent; return o ? o.userData : null; }
OR.domElement.addEventListener('pointerdown', e => { optrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (optrs.size === 2) { const [p, q] = [...optrs.values()]; odrag = { pinch: Math.hypot(p.x - q.x, p.y - q.y) }; return; }
  const u = orbHit(e); if (!u) return; OR.domElement.setPointerCapture(e.pointerId);
  if (u.btn) { odrag = { btn: u.btn, t: performance.now() }; BTN[u.btn].down = 1; return; }
  if (u.pair) { PAIR.open(); return; }
  if (u.grip || u.lens) { odrag = { grip: !!u.grip, lens: !!u.lens, x: e.clientX, y: e.clientY }; return; }
  odrag = { ring: u.ring, x: e.clientX, y: e.clientY, acc: 0, lock: null }; S.lastRing = u.ring; oledDirty = true; if (!rings()[u.ring]) tick('dead'); });
OR.domElement.addEventListener('pointermove', e => { if (optrs.has(e.pointerId)) optrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!odrag) { const u = orbHit(e); const hr = u && u.ring != null && rings()[u.ring] ? u.ring : -1; if (hr !== S.hoverRing) { S.hoverRing = hr; oledDirty = true; } OR.domElement.style.cursor = u ? (u.btn || u.pair ? 'pointer' : u.grip || u.lens ? 'grab' : hr >= 0 ? 'ns-resize' : '') : ''; return; }
  if (odrag.pinch != null) { if (optrs.size === 2) { const [p, q] = [...optrs.values()], d = Math.hypot(p.x - q.x, p.y - q.y); viewBy(0, 0, Math.log(d / odrag.pinch) * 1.4); odrag.pinch = d; } return; }
  const rx = e.clientX - (odrag.x || 0), ry = e.clientY - (odrag.y || 0);
  if (odrag.grip) { odrag.x = e.clientX; odrag.y = e.clientY; viewBy(-(PORTRAIT ? ry : rx) * .01, (PORTRAIT ? -rx : ry) * .006, 0); say('GRIP TURNED · ORBIT ' + Math.round(((S.view.yaw * 57.3) % 360 + 540) % 360 - 180) + '°'); return; }
  if (odrag.lens) { odrag.x = e.clientX; odrag.y = e.clientY; viewBy(0, 0, (PORTRAIT ? -ry : rx) * .006); say((rx > 0 ? 'PULLED APART · CLOSER · ' : 'PUSHED TOGETHER · FURTHER · ') + S.view.dist.toFixed(2) + ' M'); return; }
  if (odrag.ring == null) return; const dx = PORTRAIT ? -ry : rx, dy = PORTRAIT ? rx : -ry; odrag.x = e.clientX; odrag.y = e.clientY;
  if (!odrag.lock) { odrag.ax = (odrag.ax || 0) + Math.abs(dx); odrag.ay = (odrag.ay || 0) + Math.abs(dy); if (odrag.ax + odrag.ay > 6) odrag.lock = odrag.ax > odrag.ay ? 'x' : 'y'; else return; }
  if (odrag.lock === 'x') { scrub(odrag.ring, dx / (orbEl.clientWidth < 700 ? 16 : 22)); return; }
  odrag.acc += dy; const px = orbEl.clientWidth < 700 ? 9 : 12; while (Math.abs(odrag.acc) >= px) { turn(odrag.ring, Math.sign(odrag.acc)); odrag.acc -= Math.sign(odrag.acc) * px; } });
OR.domElement.addEventListener('pointerup', e => { optrs.delete(e.pointerId); if (odrag && odrag.btn) press(odrag.btn, performance.now() - odrag.t > 550); odrag = null; });
OR.domElement.addEventListener('pointercancel', e => { optrs.delete(e.pointerId); odrag = null; });
OR.domElement.addEventListener('pointerleave', () => { S.hoverRing = -1; oledDirty = true; });
OR.domElement.addEventListener('wheel', e => { e.preventDefault(); const u = orbHit(e); if (!u) return; if (u.lens || u.grip || e.ctrlKey) { viewBy(0, 0, -e.deltaY * .002); return; } if (u.ring == null) return; if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) scrub(u.ring, -e.deltaX / 40); else turn(u.ring, e.deltaY < 0 ? 1 : -1); }, { passive: false });
/* hands in the room: drag orbits, right-drag or two fingers pan, wheel or pinch zooms, a click picks */
const rptr = new Map(); let rdrag = null; const rray = new T.Raycaster(), rndc = new T.Vector2();
R.domElement.addEventListener('contextmenu', e => e.preventDefault());
R.domElement.addEventListener('pointerdown', e => { R.domElement.setPointerCapture(e.pointerId); rptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); rdrag = { x0: e.clientX, y0: e.clientY, pan: e.button === 2 || e.shiftKey, moved: 0 }; if (rptr.size === 2) { const [p, q] = [...rptr.values()]; rdrag = { two: true, d: Math.hypot(p.x - q.x, p.y - q.y), cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2, moved: 9 }; } });
R.domElement.addEventListener('pointermove', e => { if (!rptr.has(e.pointerId) || !rdrag) return; const pr = rptr.get(e.pointerId), dx = e.clientX - pr.x, dy = e.clientY - pr.y; rptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); const H = roomEl.clientHeight;
  if (rdrag.two && rptr.size === 2) { const [p, q] = [...rptr.values()], d = Math.hypot(p.x - q.x, p.y - q.y), cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2; viewBy(0, 0, Math.log(d / rdrag.d) * 1.4, (cx - rdrag.cx) / H, (cy - rdrag.cy) / H); rdrag.d = d; rdrag.cx = cx; rdrag.cy = cy; return; }
  rdrag.moved += Math.abs(dx) + Math.abs(dy); if (rdrag.moved < 4) return; if (rdrag.pan) viewBy(0, 0, 0, dx / H, dy / H); else viewBy(-dx * .008, dy * .005, 0); });
const rEnd = e => { rptr.delete(e.pointerId); if (rdrag && !rdrag.two && rdrag.moved < 4 && e.type === 'pointerup') clickPick(e); if (!rptr.size) rdrag = null; };
R.domElement.addEventListener('pointerup', rEnd); R.domElement.addEventListener('pointercancel', rEnd);
R.domElement.addEventListener('wheel', e => { e.preventDefault(); viewBy(0, 0, -e.deltaY * .0015); }, { passive: false });
function clickPick(e) { const r = R.domElement.getBoundingClientRect(); rndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rray.setFromCamera(rndc, cam);
  const objs = [...CAKE.children, ...TABLE.children, ...Object.values(KM), keyMark]; const h = rray.intersectObjects(objs, true)[0]; if (!h) return; let o = h.object;
  for (const i in KM) if (KM[i] === o) return pickKey('kid' + i); let p = o; while (p) { if (p === keyMark) return pickKey('light'); if (p === TABLE) return pickKey('table'); if (p.parent === CAKE && p.isGroup) { S.cWhich = p.userData.candle != null && CTYPES[DOC.candles.ctype][0] !== 'NUMBER' ? p.userData.candle + 1 : 0; return pickKey('candles'); } if (p.userData && p.userData.writing) return pickKey('writing'); if (p === CAKE) return pickKey('cake'); p = p.parent; } }
function pickKey(k) { if (S.mode !== 'EDIT') S.mode = 'EDIT'; S.adding = null; if (k !== S.pick) { S.pick = k; chime(); } S.retT = NOW; oledDirty = true; }
addEventListener('keydown', e => { const k = e.key; if (S.mode === 'EDIT' && S.pick === 'writing' && DOC.writing && !e.metaKey && !e.ctrlKey) { const Wt = DOC.writing; if (k.length === 1 && k !== '+' && k !== '=') { snap(); Wt.text = Wt.text.slice(0, Wt.cur) + k.toUpperCase() + Wt.text.slice(Wt.cur); Wt.cur++; dirty.cake = true; S.retT = NOW; e.preventDefault(); return; } if (k === 'Backspace') { if (Wt.cur > 0) { snap(); Wt.text = Wt.text.slice(0, Wt.cur - 1) + Wt.text.slice(Wt.cur); Wt.cur--; dirty.cake = true; } S.retT = NOW; e.preventDefault(); return; } if (k === 'Enter') { snap(); Wt.text = Wt.text.slice(0, Wt.cur) + '/' + Wt.text.slice(Wt.cur); Wt.cur++; dirty.cake = true; e.preventDefault(); return; } if (k === 'ArrowLeft' || k === 'ArrowRight') { Wt.cur = clamp(Wt.cur + (k === 'ArrowRight' ? 1 : -1), 0, Wt.text.length); S.retT = NOW; e.preventDefault(); return; } } if (k >= '1' && k <= '5') { S.lastRing = +k - 1; oledDirty = true; } else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); turn(Math.max(0, S.lastRing), k === 'ArrowUp' ? 1 : -1); } else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); scrub(Math.max(0, S.lastRing), k === 'ArrowRight' ? .25 : -.25); }
  else if (k === 'Tab' || k === 'v') { e.preventDefault(); press('MODE'); } else if (k === 'a') press('ADD'); else if (k === 'Delete' || k === 'Backspace' || k === 'x') press('DEL'); else if (k === 'z') press('UNDO', e.shiftKey); else if (k === 'p') PAIR.open();
  else if (k === 'f' || k === 'F') { S.view.pan.set(0, 0, 0); say('FRAMED'); } else if (k === '+' || k === '=') viewBy(0, 0, .15); else if (k === '-') viewBy(0, 0, -.15); });

/* =============================================================== THE DISPLAY: the mode, the object, the value just set */
let oledDirty = true;
function drawOLED() { const W = OLED.width, H = OLED.height, x = ox; x.fillStyle = '#020403'; x.fillRect(0, 0, W, H); const CY = '#5ff0dc', DIM = '#2e7a70', MID = '#8fe9dc', AMB = '#f0b040';
  if (S.pairShow && !PHONE) { drawPairQR(x, W, H); oledTex.needsUpdate = true; return; }
  const st = window.REMOTE_STATE, mode = PHONE ? (st ? st.mode : '') : S.adding ? 'ADD' : S.mode, p = PHONE ? null : picked();
  const what = PHONE ? (st && st.step) || '' : S.adding ? (addable().find(t => t.key === S.adding) || {}).name : S.mode === 'VIEW' ? S.view.preset : p ? p.name : 'EMPTY SCENE';
  x.textAlign = 'left'; x.font = '700 30px ui-monospace, Menlo, monospace'; x.fillStyle = mode === 'VIEW' ? '#9fc4ff' : mode === 'ADD' ? AMB : CY; x.fillText(mode || '', 30, 64);
  x.font = '700 70px ui-monospace, Menlo, monospace'; x.fillStyle = '#e8f6f2'; x.fillText(what || '', 30, 150);
  const RS = rings(), r = RS[S.lastRing]; if (r) { x.textAlign = 'right'; x.font = '600 26px ui-monospace, Menlo, monospace'; x.fillStyle = DIM; x.fillText(r.n, W - 30, 64); x.font = '700 70px ui-monospace, Menlo, monospace'; x.fillStyle = CY; x.fillText(String(r.f(r.v())), W - 30, 150); }
  x.textAlign = 'center'; x.font = '500 26px ui-monospace, Menlo, monospace'; x.fillStyle = MID;
  if (S.msg && NOW - S.msgT < 3.5) x.fillText(S.msg.slice(0, 72), W / 2, 280); else if (!PHONE && !things().some(t => t.key !== 'light')) x.fillText('PRESS ADD', W / 2, 280);
  oledTex.needsUpdate = true; }
setInterval(() => { oledDirty = true; }, 500);

/* =============================================================== SELECTION: thin brackets on the picked object, for a moment after it is picked or changed */
const SEL = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0xd8e6e2, transparent: true, opacity: 0, depthTest: false, toneMapped: false })); SEL.renderOrder = 40; scene.add(SEL);
function boxOf(key) { const b = new T.Box3(); if (key === 'cake') CAKE.children.forEach(o => { if (!o.isGroup && !o.userData.writing) b.expandByObject(o); }); else if (key === 'candles') CAKE.children.forEach(o => { if (o.isGroup && (S.cWhich === 0 || o.userData.candle === S.cWhich - 1)) b.expandByObject(o); }); else if (key === 'writing') CAKE.children.forEach(o => { if (o.userData.writing) b.expandByObject(o); }); else if (key === 'table') b.expandByObject(TABLE.children[0] || TABLE);
  else if (key === 'light') b.setFromCenterAndSize(keyMark.position, new T.Vector3(.06, .06, .06)); else if (key && key.startsWith('kid') && KM[+key.slice(3)]) b.expandByObject(KM[+key.slice(3)]); return b.isEmpty() ? null : b; }
function updSel(dt) { const b = null; SEL.material.opacity += ((b ? .7 : 0) - SEL.material.opacity) * Math.min(1, dt * 8); SEL.visible = SEL.material.opacity > .02; if (!b) return;
  const m = .006, lo = b.min.clone().subScalar(m), hi = b.max.clone().addScalar(m), L = Math.min(.04, (hi.x - lo.x) / 4, (hi.y - lo.y) / 4), P = [];
  for (const cx of [0, 1]) for (const cy of [0, 1]) for (const cz of [0, 1]) { const c = new T.Vector3(cx ? hi.x : lo.x, cy ? hi.y : lo.y, cz ? hi.z : lo.z), s = new T.Vector3(cx ? -1 : 1, cy ? -1 : 1, cz ? -1 : 1).multiplyScalar(L); P.push(c, c.clone().add(new T.Vector3(s.x, 0, 0)), c, c.clone().add(new T.Vector3(0, s.y, 0)), c, c.clone().add(new T.Vector3(0, 0, s.z))); }
  SEL.geometry.setFromPoints(P); }

/* =============================================================== THE INFORMATION SIGHT: corner marks on the picked thing and, beside it, what it is and what its rings are set to.
   Dim while you look, bright while you change it; it never sits on the thing itself. */
const infoSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); infoSVG.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;font-family:ui-monospace,Menlo,monospace'; roomEl.append(infoSVG);
const scr = v => { const p = v.clone().project(cam); return p.z > 1 ? null : [(p.x + 1) / 2 * roomEl.clientWidth, (1 - p.y) / 2 * roomEl.clientHeight]; };
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function updInfo() { if (PHONE || S.mode !== 'EDIT' || !S.pick) { infoSVG.innerHTML = ''; return; } const b = boxOf(S.pick); if (!b) { infoSVG.innerHTML = ''; return; } const W = roomEl.clientWidth, H = roomEl.clientHeight;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let k = 0; k < 8; k++) { const p = scr(new T.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z)); if (!p) continue; x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  if (x1 < x0) { infoSVG.innerHTML = ''; return; } x0 -= 6; y0 -= 6; x1 += 6; y1 += 6; const act = NOW - S.retT < 3.5 || S.hoverRing >= 0, op = act ? 1 : .5, L = Math.max(6, Math.min(14, (x1 - x0) / 4, (y1 - y0) / 4)), col = '#d8e6e2';
  let o = `<g opacity="${op}" stroke="${col}" stroke-width="1.2" fill="none"><path d="M${x0} ${y0 + L}V${y0}H${x0 + L}M${x1 - L} ${y0}H${x1}V${y0 + L}M${x1} ${y1 - L}V${y1}H${x1 - L}M${x0 + L} ${y1}H${x0}V${y1 - L}"/></g>`;
  const RS = rings(), p = picked(), lines = RS.slice(1).filter(Boolean).map((r, i) => ({ t: r.n + '  ' + r.f(r.v()), hot: i + 1 === S.lastRing || i + 1 === S.hoverRing }));
  if (S.pick === 'writing' && DOC.writing) { const Wt = DOC.writing, t = Wt.text; lines.unshift({ t: t.slice(0, Wt.cur) + '[' + (t[Wt.cur] || ' ') + ']' + t.slice(Wt.cur + 1), hot: false, big: true }); }
  const cb = boxOf('cake'); let X0 = x0, X1 = x1; if (cb && (S.pick === 'candles' || S.pick === 'writing')) for (let k = 0; k < 8; k++) { const q = scr(new T.Vector3(k & 1 ? cb.max.x : cb.min.x, k & 2 ? cb.max.y : cb.min.y, k & 4 ? cb.max.z : cb.min.z)); if (q) { X0 = Math.min(X0, q[0] - 6); X1 = Math.max(X1, q[0] + 6); } }
  const right = X1 + 180 < W || X0 < 190, tx = right ? X1 + 14 : X0 - 14, an = right ? 'start' : 'end', ty = clamp(y0 + 4, 16, H - lines.length * 15 - 24);
  o += `<path d="M${right ? x1 : x0} ${y0 + 4}H${tx + (right ? -4 : 4)}" stroke="${col}" stroke-width="1" opacity="${op * .6}"/>`;
  o += `<text x="${tx}" y="${ty + 4}" text-anchor="${an}" fill="#f0b040" font-size="11" letter-spacing="1.5" opacity="${op}" paint-order="stroke" stroke="#000" stroke-width="3">${esc(p ? p.name : '')}</text>`;
  lines.forEach((l, i) => { o += `<text x="${tx}" y="${ty + 20 + i * 15}" text-anchor="${an}" fill="${l.hot ? '#ffffff' : '#a9c4bd'}" font-size="${l.hot || l.big ? 12 : 11}" font-weight="${l.hot ? 700 : 400}" opacity="${l.hot ? 1 : op}" paint-order="stroke" stroke="#000" stroke-width="3">${esc(l.t)}</text>`; });
  infoSVG.innerHTML = o; }

/* =============================================================== THE ROOM */
function apply(dt) { if (dirty.cake) { buildCake(DOC.cake ? Object.assign({}, DOC.cake, { candles: DOC.candles ? DOC.candles.n : 0, out: DOC.candles && !DOC.candles.lit ? DOC.candles.n : 0, spread: DOC.candles ? DOC.candles.spread : 1, clen: DOC.candles ? DOC.candles.len : 1, ctype: DOC.candles ? DOC.candles.ctype || 0 : 0, per: DOC.candles ? DOC.candles.per : {}, writing: DOC.writing }) : null); dirty.cake = false; }
  if (dirty.table) { buildTable(DOC.table); dirty.table = false; }
  if (DOC.table) { DOC.table.k = Math.min(1, (DOC.table.k || 0) + dt * 1.5); tableMat.opacity = legMat.opacity = DOC.table.k; tableMat.transparent = legMat.transparent = DOC.table.k < 1; } placeKids(dt);
  const Lt = DOC.light, cw = new T.Vector3(0, TOP + .05, 0), la = Lt.a * Math.PI / 180;
  key.position.set(cw.x + Math.sin(la) * .95, cw.y + Lt.h, cw.z + Math.cos(la) * .95); key.target.position.copy(cw); key.color.setRGB(lerp(.72, 1, Lt.warm), lerp(.82, .72, Lt.warm), lerp(1, .45, Lt.warm)); key.intensity = Lt.k;
  keyMark.position.copy(key.position); keyMark.visible = keyLine.visible = S.mode === 'EDIT' && S.pick === 'light' && !FILM; keyLine.geometry.setFromPoints([key.position, cw]);
  const lit = FLAMES.length; candleLight.position.set(cw.x, cw.y + .15, cw.z); candleLight.intensity = lit ? (.25 + Math.min(lit, 12) * .12) * (.94 + Math.sin(NOW * 21) * .04 + Math.sin(NOW * 7) * .03) : 0;
  FLAMES.forEach((f, i) => { if (f.userData.sparkle) { const k = .7 + Math.random() * .6; f.scale.set(.05 * k, .05 * k, 1); f.material.rotation = Math.random() * TAU; return; } const k = 1 + Math.sin(NOW * 13 + i * 1.7) * .06 + Math.sin(NOW * 31 + i) * .04; f.scale.set(.016 * k, .034 * (2 - k), 1); }); }
function placeCam(dt) { const V = S.view, P = VIEWS[V.preset], eye = P && P.eye, k = Math.min(1, (dt || 1) * 6);
  let bc = new T.Vector3(0, TOP + .07, 0); if (!eye) { const b = sceneBox(); if (b) bc = b.getCenter(new T.Vector3()); }
  const tgt = (eye ? new T.Vector3(0, .69, 0) : bc).add(V.pan);
  CAM.yaw += (((V.yaw - CAM.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI) * k; CAM.pitch += (V.pitch - CAM.pitch) * k; CAM.dist += (V.dist - CAM.dist) * k; CAM.fov += (V.fov - CAM.fov) * k; CAM.tgt.lerp(tgt, k);
  cam.position.set(CAM.tgt.x + Math.sin(CAM.yaw) * Math.cos(CAM.pitch) * CAM.dist, CAM.tgt.y + Math.sin(CAM.pitch) * CAM.dist, CAM.tgt.z + Math.cos(CAM.yaw) * Math.cos(CAM.pitch) * CAM.dist); cam.lookAt(CAM.tgt);
  if (Math.abs(cam.fov - CAM.fov) > .01) { cam.fov = CAM.fov; cam.updateProjectionMatrix(); } }
function resize() { const w = Math.max(2, roomEl.clientWidth), h = Math.max(2, roomEl.clientHeight); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); const pr = R.getPixelRatio(); rt.setSize(Math.round(w * pr), Math.round(h * pr)); fitOrb(); }
addEventListener('resize', resize);
function update(dt) { NOW += dt; MU.uTime.value = NOW; apply(dt); placeCam(dt); updSel(dt); updInfo();
  RINGS.forEach((r, i) => { r.ang += (r.target - r.ang) * Math.min(1, dt * 18); r.g.rotation.x = r.ang; const on = !!rings()[i]; r.lit.visible = on; r.lit.material.color.setHex(i === S.lastRing ? 0x8ffff0 : i === 0 ? (S.mode === 'VIEW' ? 0x5f8fd0 : 0xb07a20) : S.mode === 'VIEW' ? 0x3a6fb0 : 0x2fae9f); });
  const can = { PAIR: true, MODE: true, UNDO: UNDO.length > 0 || !!S.adding, ADD: addable().length > 0, DEL: !!S.adding || (!!picked() && S.pick !== 'light' && S.mode === 'EDIT'), KEEP: things().length > 1 };
  for (const k in BTN) { const b = BTN[k]; if (odrag && odrag.btn === k) b.down = 1; else b.down = Math.max(0, b.down - dt * 6); b.cap.position.z = b.z0 - b.down * .008; b.lab.material.opacity = can[k] ? 1 : .25; }
  orbPitchV += ((.18 - ORB.rotation.x) * 42 - orbPitchV * 9) * dt; ORB.rotation.x += orbPitchV * dt; ORB.userData.iris.material.opacity = .55 + .35 * (.5 + .5 * Math.sin(NOW * 1.6));
  drawDialLabels(); if (oledDirty || (S.msg && NOW - S.msgT < 3.6)) { drawOLED(); oledDirty = false; } }
function render() { if (!PHONE) { grade.uniforms.gt.value = (NOW * 37.1) % 100; R.setRenderTarget(rt); R.render(scene, cam); R.setRenderTarget(null); R.render(gQ, gC); } OR.render(OS, OC); }
let last = performance.now(), auto = true;
function loop(now) { if (!auto) return; const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(loop); }
resize(); requestAnimationFrame(loop);
window.FORGE = { S, get DOC() { return DOC; }, turn, scrub, press, viewBy, setView, rings, things, addable, pickKey, now: () => NOW, flames: () => FLAMES.length, manual() { auto = false; }, advance(dt) { update(dt); render(); }, step(dt) { update(dt); }, PAIR };
