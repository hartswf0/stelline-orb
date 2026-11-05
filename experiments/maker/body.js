/* =============================================================== THE DOCUMENT: what the memory is. Everything in the room is rebuilt from it; undo keeps copies of it. */
const DOC0 = () => ({ cake: null, table: null, kids: [], light: { a: 40, h: .8, warm: .75, k: 1.2 }, mist: 0 });
let DOC = DOC0(); const UNDO = [], REDO = []; let gestT = -9, dirty = { cake: true, table: true, kids: true, mist: true };
const S = { pick: 'cake', lastRing: -1, hoverRing: -1, turn: 0, tilt: 0, close: 0, stretch: 1, msg: '', msgT: -9, retT: -9, pairShow: false, anim: null, recall: null };
function snap(force) { if (!force && NOW - gestT < 1.2) { gestT = NOW; return; } gestT = NOW; UNDO.push(JSON.stringify(DOC)); if (UNDO.length > 80) UNDO.shift(); REDO.length = 0; }
function setDoc(d) { DOC = d; dirty.cake = dirty.table = dirty.kids = dirty.mist = true; if (!things().some(t => t.key === S.pick)) S.pick = (things()[0] || { key: 'cake' }).key; }
function say(m) { S.msg = m; S.msgT = NOW; oledDirty = true; }
function lockChime() { tone(1320, 1310, .09, .12); setTimeout(() => tone(1760, 1750, .14, .09), 70); }
function shimmer() { tone(440, 880, .9, .07, 'triangle'); setTimeout(() => tone(660, 1320, .8, .05, 'triangle'), 120); }

/* =============================================================== WHAT CAN BE PICKED: only what exists */
function things() { const L = []; if (DOC.cake) L.push({ key: 'cake', name: 'CAKE' }); if (DOC.table) L.push({ key: 'table', name: 'TABLE' });
  DOC.kids.forEach(c => L.push({ key: 'kid' + c.i, name: 'CHILD ' + (c.i + 1), c })); if (DOC.cake) L.push({ key: 'light', name: 'LIGHT' }, { key: 'memory', name: 'THE MEMORY' }); return L; }
const picked = () => things().find(t => t.key === S.pick) || null;
/* =============================================================== THE RINGS: ring 1 picks (when there is a choice); rings 2-5 are the picked thing's properties */
const list = (n, get, set, L) => ({ n, v: get, set: v => set(clamp(Math.round(v), 0, L.length - 1)), st: 1, f: v => L[v], lo: 0, hi: L.length - 1 });
const num = (n, get, set, lo, hi, st, f, wrap) => ({ n, v: get, set: v => set(wrap ? ((v - lo) % (hi - lo) + (hi - lo)) % (hi - lo) + lo : clamp(+v.toFixed(4), lo, hi)), st, f, lo, hi, wrap });
function rings() {
  if (window.REMOTE_RINGS) return window.REMOTE_RINGS();
  const L = things(), p = picked(), out = [null, null, null, null, null]; if (S.recall) return out;
  if (L.length > 1) out[0] = list('PICK', () => Math.max(0, L.findIndex(t => t.key === S.pick)), v => { if (L[v].key !== S.pick) { S.pick = L[v].key; lockChime(); } }, L.map(t => t.name));
  if (!p) return out; const C = DOC.cake, Tb = DOC.table, Lt = DOC.light, ch = p.c;
  const props = p.key === 'cake' ? [list('FORM', () => Object.keys(FORMS).indexOf(C.form), v => { C.form = Object.keys(FORMS)[v]; dirty.cake = true; }, Object.keys(FORMS)), list('ICING', () => C.icing, v => { C.icing = v; dirty.cake = true; }, ICING.map(i => i[0])),
      list('BORDER', () => C.border, v => { C.border = v; dirty.cake = true; }, BORDER.map(i => i[0])), num('CANDLES', () => C.candles, v => { C.candles = Math.round(v); C.out = 0; dirty.cake = true; }, 0, 12, 1, v => String(Math.round(v)))]
    : p.key === 'table' ? [num('WIDTH', () => Tb.w, v => { Tb.w = v; dirty.table = true; }, .6, 1.5, .05, v => '×' + v.toFixed(2)), list('WOOD', () => Tb.wood, v => { Tb.wood = v; dirty.table = true; }, WOOD.map(w => w[0]))]
    : p.key === 'light' ? [num('AROUND', () => Lt.a, v => Lt.a = v, -180, 180, 10, v => Math.round(v) + '°', true), num('HEIGHT', () => Lt.h, v => Lt.h = v, .05, 1.6, .05, v => Math.round(v * 100) + ' CM'), num('WARMTH', () => Lt.warm, v => Lt.warm = v, 0, 1, .05, v => v < .34 ? 'COOL' : v < .67 ? 'NEUTRAL' : 'WARM'), num('STRENGTH', () => Lt.k, v => Lt.k = v, 0, 3, .1, v => Math.round(v / 3 * 100) + '%')]
    : p.key === 'memory' ? [num('MIST', () => DOC.mist, v => DOC.mist = v, 0, 1, .05, v => Math.round(v * 100) + '%')]
    : [num('AROUND', () => ch.a * 57.2958, v => ch.a = v / 57.2958, 0, 360, 4, v => Math.round(v) + '°', true), num('DISTANCE', () => ch.r, v => ch.r = v, .3, 1.3, .025, v => Math.round(v * 100) + ' CM'), num('FACE', () => ch.face, v => ch.face = Math.round(v), -70, 70, 5, v => (v > 0 ? '+' : '') + Math.round(v) + '°'), num('SIZE', () => ch.s, v => ch.s = v, .6, 1.5, .05, v => '×' + v.toFixed(2))];
  props.forEach((r, i) => { r.undoable = true; out[i + 1] = r; }); return out; }
function v01(r) { if (r && r.u != null) return r.u; if (!r || r.lo == null) return .5; return clamp((r.v() - r.lo) / Math.max(1e-6, r.hi - r.lo), 0, 1); }
const AXC = ['#ff5b4d', '#5fe36e', '#4f8dff'];
let scrubAcc = [0, 0, 0, 0, 0];
function turn(i, steps) { if (window.REMOTE) { tick('ring', i); ORB.spin(i, steps); S.lastRing = i; return window.REMOTE({ k: 'turn', i, steps }); }
  const r = rings()[i]; if (!r) { tick('dead'); return; } tick('ring', i); if (r.undoable) snap(); r.set(r.v() + r.st * steps); S.lastRing = i; S.retT = NOW; ORB.spin(i, steps); oledDirty = true; dirty.mist = true; }
function scrub(i, frac) { if (window.REMOTE) { ORB.spin(i, frac); S.lastRing = i; return window.REMOTE({ k: 'scrub', i, frac }); }
  const r = rings()[i]; if (!r) return; if (r.f === undefined || r.st === 1) { scrubAcc[i] += frac; while (Math.abs(scrubAcc[i]) >= 1) { turn(i, Math.sign(scrubAcc[i])); scrubAcc[i] -= Math.sign(scrubAcc[i]); } return; }
  if (r.undoable) snap(); const b = Math.floor(r.v() / r.st); r.set(r.v() + r.st * frac); if (Math.floor(r.v() / r.st) !== b) tick('ring', i); S.lastRing = i; S.retT = NOW; ORB.spin(i, frac); oledDirty = true; }
function viewBy(dx, dy, dc) { if (window.REMOTE) return window.REMOTE({ k: 'view', dx, dy, dc }); S.turn += dx; S.tilt = clamp(S.tilt + dy, -.5, .6); S.close = clamp(S.close + dc, 0, 1); S.stretch = 1 + S.close * .45; setStretch(S.stretch); }

/* =============================================================== DO: the one next thing the memory needs, named on the display */
function nextAct() { const C = DOC.cake;
  if (!C) return { t: 'BRING THE CAKE', run: () => { DOC.cake = { form: 'DRUM', icing: 1, border: 0, candles: 0, out: 0 }; S.pick = 'cake'; shimmer(); } };
  if (!DOC.table) return { t: 'SET THE TABLE', run: () => { DOC.table = { w: 1, wood: 0, k: 0 }; S.pick = 'table'; shimmer(); } };
  if (DOC.kids.length < 3) return { t: 'BRING A CHILD', run: () => { const used = new Set(DOC.kids.map(c => c.i)), i = [0, 1, 2].find(n => !used.has(n)); DOC.kids.push({ i, a: KIDS[i].slot, r: .62, face: 0, s: 1 }); S.pick = 'kid' + i; shimmer(); } };
  if (!C.candles) return { t: 'SEVEN CANDLES', run: () => { C.candles = 7; C.out = 0; S.pick = 'cake'; tone(880, 880, .25, .05); } };
  if ((C.out || 0) < C.candles) return { t: 'BLOW THEM OUT', run: () => { S.anim = { k: 'blow', t: 0, n: C.candles - (C.out || 0) }; } };
  if (DOC.mist < 1) return { t: 'LET IT GO TO MIST', run: () => { S.pick = 'memory'; S.anim = { k: 'mist', t: 0, from: DOC.mist, to: 1, dur: 3.5 }; } };
  return { t: 'BRING IT BACK', run: () => { C.out = 0; S.anim = { k: 'mist', t: 0, from: 1, to: 0, dur: 2.5 }; } }; }
function press(b, long) { if (window.REMOTE) { tick('press'); ORB.push(b); return window.REMOTE({ k: 'press', b, long }); } tick('press'); ORB.push(b);
  if (S.recall && b !== 'PLAY') { S.recall = null; setDoc(JSON.parse(S.recallEnd)); say('BACK TO NOW'); return; }
  if (b === 'CAPTURE') { const a = nextAct(); snap(true); a.run(); setDoc(DOC); say(a.t); }
  else if (b === 'UNDO') { const from = long ? REDO : UNDO, to = long ? UNDO : REDO, s = from.pop(); if (!s) { tick('dead'); say(long ? 'NOTHING TO REDO' : 'NOTHING TO UNDO'); return; } to.push(JSON.stringify(DOC)); S.anim = null; setDoc(JSON.parse(s)); say(long ? 'REDONE' : 'UNDONE'); }
  else if (b === 'PLAY') { if (S.recall) { S.recall = null; setDoc(JSON.parse(S.recallEnd)); say('BACK TO NOW'); return; } if (!UNDO.length) { tick('dead'); return; } S.recallEnd = JSON.stringify(DOC); S.recall = { i: 0, t: 0, frames: [...UNDO, S.recallEnd] }; setDoc(JSON.parse(S.recall.frames[0])); say('RECALLING'); }
  else if (b === 'KEEP') keep();
  oledDirty = true; }
function keep() { try { const ex = new T.GLTFExporter(); ex.parse(MEM, r => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r], { type: 'model/gltf-binary' })); a.download = 'memory.glb'; document.body.append(a); a.click(); setTimeout(() => a.remove(), 1000); say('KEPT · MEMORY.GLB'); }, { binary: true }); } catch (e) { say('COULD NOT KEEP · ' + e.message.slice(0, 30)); } }
/*PAIR*/

/* =============================================================== THE BUTTONS: four, each lit only while it can do something */
const CAN_KEEP = window.top === window && !PHONE;
const BTN = {};
[['UNDO', -.8, 0, 0xd9d5cc], ['CAPTURE', .66, -.1, 0xd23a2a], ['PLAY', .77, .03, 0xd9d5cc], ['KEEP', .88, -.1, 0x5ff0dc]].forEach(([n, x, dz, col]) => { if (n === 'KEEP' && !CAN_KEEP) return;
  const a = .95 + dz * 2, y = Math.cos(a) * .25, z = Math.sin(a) * .25; const g = new T.Group(); g.position.set(x, y, z); g.lookAt(x, y * 3, z * 3); g.userData.keepW = true; ORB.add(g);
  const well = new T.Mesh(new T.CylinderGeometry(.045, .045, .012, 40), darkAlu); well.rotation.x = Math.PI / 2; g.add(well);
  const capM = n === 'CAPTURE' ? new T.MeshPhysicalMaterial({ color: col, roughness: .25, clearcoat: 1, emissive: 0x3a0804 }) : new T.MeshPhysicalMaterial({ color: col, metalness: .8, roughness: .3, clearcoat: .6, emissive: 0x000000 });
  const cap = new T.Mesh(new T.SphereGeometry(.038, 32, 16, 0, TAU, 0, Math.PI / 2), capM); cap.rotation.x = Math.PI / 2; cap.scale.set(1, .42, 1); cap.position.z = .006; cap.userData.btn = n; g.add(cap);
  const lab = new T.Mesh(new T.PlaneGeometry(.17, .051), new T.MeshBasicMaterial({ map: label(n), transparent: true, toneMapped: false })); lab.position.set(0, -.072, .002); lab.userData.btn = n; g.add(lab); FLAT.push(lab);
  const ic = new T.Mesh(new T.CircleGeometry(.026, 32), new T.MeshBasicMaterial({ map: iconTex(n, n === 'CAPTURE' ? '#ffffff' : '#1b1a17'), transparent: true, toneMapped: false })); ic.position.z = .006 + .038 * .42 + .0015; ic.userData.btn = n; g.add(ic); FLAT.push(ic);
  BTN[n] = { g, cap, lab, z0: .006, down: 0 }; });
let orbPitchV = 0, orbYawV = 0, orbRollV = 0; ORB.rotation.x = .18;
ORB.spin = (i, steps) => { const r = RINGS[i]; r.target += steps * TAU / 36; orbPitchV += Math.sign(steps) * .03; };
ORB.push = b => { if (BTN[b]) { BTN[b].down = 1; orbPitchV -= .03; } };
function setStretch(v) { S.stretch = clamp(v, 1, 1.8); ORB.scale.x = S.stretch; ORB.traverse(o => { if (o.userData.keepW) o.scale.x = 1 / S.stretch; }); fitOrb(); }

/* =============================================================== HANDS ON THE ORB */
const oray = new T.Raycaster(), ondc = new T.Vector2(); let odrag = null; const optrs = new Map();
function orbHit(e) { const r = OR.domElement.getBoundingClientRect(); ondc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); oray.setFromCamera(ondc, OC); const h = oray.intersectObjects(ORB.children, true)[0]; if (!h) return null; let o = h.object; while (o && o.userData.ring == null && !o.userData.btn && !o.userData.grip && !o.userData.pair && !o.userData.lens) o = o.parent; return o ? o.userData : null; }
OR.domElement.addEventListener('pointerdown', e => { optrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (optrs.size === 2) { const [p, q] = [...optrs.values()]; odrag = { pinch: Math.hypot(p.x - q.x, p.y - q.y), c0: S.close }; return; }
  const u = orbHit(e); if (!u) return; OR.domElement.setPointerCapture(e.pointerId);
  if (u.btn) { odrag = { btn: u.btn, t: performance.now() }; BTN[u.btn].down = 1; return; }
  if (u.pair) { PAIR.open(); return; }
  if (u.grip) { odrag = { grip: true, x: e.clientX, y: e.clientY }; return; }
  if (u.lens) { odrag = { lens: true, x: e.clientX, y: e.clientY }; return; }
  odrag = { ring: u.ring, x: e.clientX, y: e.clientY, acc: 0, lock: null }; S.lastRing = u.ring; oledDirty = true; if (!rings()[u.ring]) tick('dead'); });
OR.domElement.addEventListener('pointermove', e => { if (optrs.has(e.pointerId)) optrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!odrag) { const u = orbHit(e); const hr = u && u.ring != null && rings()[u.ring] ? u.ring : -1; if (hr !== S.hoverRing) { S.hoverRing = hr; oledDirty = true; } OR.domElement.style.cursor = u ? (u.btn || u.pair ? 'pointer' : u.grip || u.lens ? 'grab' : hr >= 0 ? 'ns-resize' : '') : ''; return; }
  const rx = e.clientX - (odrag.x || 0), ry = e.clientY - (odrag.y || 0);
  if (odrag.pinch != null && optrs.size === 2) { const [p, q] = [...optrs.values()]; viewBy(0, 0, odrag.c0 + (Math.hypot(p.x - q.x, p.y - q.y) / odrag.pinch - 1) * 1.5 - S.close); return; }
  if (odrag.grip) { odrag.x = e.clientX; odrag.y = e.clientY; viewBy(PORTRAIT ? ry * .012 : rx * .012, PORTRAIT ? -rx * .006 : ry * .006, 0); return; }
  if (odrag.lens) { odrag.x = e.clientX; odrag.y = e.clientY; viewBy(0, 0, (PORTRAIT ? -ry : rx) * .004); return; }
  if (odrag.ring == null) return; const dx = PORTRAIT ? -ry : rx, dy = PORTRAIT ? rx : -ry; odrag.x = e.clientX; odrag.y = e.clientY;
  if (!odrag.lock) { odrag.ax = (odrag.ax || 0) + Math.abs(dx); odrag.ay = (odrag.ay || 0) + Math.abs(dy); if (odrag.ax + odrag.ay > 6) odrag.lock = odrag.ax > odrag.ay ? 'x' : 'y'; else return; }
  if (odrag.lock === 'x') { scrub(odrag.ring, dx / (orbEl.clientWidth < 700 ? 16 : 22)); return; }
  odrag.acc += dy; const px = orbEl.clientWidth < 700 ? 9 : 12; while (Math.abs(odrag.acc) >= px) { turn(odrag.ring, Math.sign(odrag.acc)); odrag.acc -= Math.sign(odrag.acc) * px; } });
OR.domElement.addEventListener('pointerup', e => { optrs.delete(e.pointerId); if (odrag && odrag.btn) press(odrag.btn, performance.now() - odrag.t > 550); odrag = null; });
OR.domElement.addEventListener('pointercancel', e => { optrs.delete(e.pointerId); odrag = null; });
OR.domElement.addEventListener('pointerleave', () => { S.hoverRing = -1; oledDirty = true; });
OR.domElement.addEventListener('wheel', e => { e.preventDefault(); const u = orbHit(e); if (!u) return; if (u.lens || e.ctrlKey) { viewBy(0, 0, -e.deltaY * .002); return; } if (u.grip) { viewBy(-e.deltaY * .004, 0, 0); return; } if (u.ring == null) return; if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) scrub(u.ring, -e.deltaX / 40); else turn(u.ring, e.deltaY < 0 ? 1 : -1); }, { passive: false });
addEventListener('keydown', e => { const k = e.key; if (k >= '1' && k <= '5') { S.lastRing = +k - 1; oledDirty = true; } else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); turn(Math.max(0, S.lastRing), k === 'ArrowUp' ? 1 : -1); } else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); viewBy(k === 'ArrowRight' ? .08 : -.08, 0, 0); }
  else if (k === 'd' || k === ' ') { e.preventDefault(); press('CAPTURE'); } else if (k === 'z') press('UNDO', e.shiftKey); else if (k === 'r') press('PLAY'); else if (k === 'p') PAIR.open(); else if (k === '+' || k === '=') viewBy(0, 0, .1); else if (k === '-') viewBy(0, 0, -.1); });

/* =============================================================== THE DISPLAY: what is picked · what the ring last turned is · what DO will do */
let oledDirty = true;
function drawOLED() { const W = OLED.width, H = OLED.height, x = ox; x.fillStyle = '#020403'; x.fillRect(0, 0, W, H); const CY = '#5ff0dc', DIM = '#2e7a70', MID = '#8fe9dc', AMB = '#f0b040';
  if (S.pairShow && !PHONE) { drawPairQR(x, W, H); oledTex.needsUpdate = true; return; }
  const st = window.REMOTE_STATE, p = PHONE ? null : picked(), act = PHONE ? (st && st.step ? { t: st.step } : null) : nextAct();
  x.textAlign = 'left'; x.font = '600 26px ui-monospace, Menlo, monospace'; x.fillStyle = DIM; x.fillText(S.recall ? 'RECALLING' : PHONE ? 'PAIRED ORB' : p ? 'WORKING ON' : 'NOTHING YET', 30, 64);
  x.font = '700 72px ui-monospace, Menlo, monospace'; x.fillStyle = CY; x.fillText(PHONE ? (st ? st.mode || '' : '') : p ? p.name : '', 30, 150);
  const RS = rings(), r = RS[S.lastRing]; if (r && !S.recall) { x.textAlign = 'center'; x.font = '600 26px ui-monospace, Menlo, monospace'; x.fillStyle = DIM; x.fillText(r.n, W * .52, 64); x.font = '700 72px ui-monospace, Menlo, monospace'; x.fillStyle = '#e8f6f2'; x.fillText(String(r.f(r.v())), W * .52, 150); }
  if (act) { x.textAlign = 'right'; x.font = '600 26px ui-monospace, Menlo, monospace'; x.fillStyle = '#7a3a30'; x.fillText('DO', W - 30, 64); x.font = '700 50px ui-monospace, Menlo, monospace'; x.fillStyle = AMB; x.fillText(act.t, W - 30, 146); }
  x.textAlign = 'center'; x.font = '500 26px ui-monospace, Menlo, monospace'; x.fillStyle = MID; if (S.msg && NOW - S.msgT < 3.5) x.fillText(S.msg.slice(0, 70), W / 2, 280);
  else if (!PHONE && !DOC.cake) x.fillText('PRESS DO', W / 2, 280); else if (!PHONE && NOW - S.retT > 20) { x.fillStyle = DIM; x.fillText('GRIP END TURNS THE MEMORY · LENS END BRINGS IT CLOSE', W / 2, 280); }
  oledTex.needsUpdate = true; }
setInterval(() => { oledDirty = true; }, 500);

/* =============================================================== THE SIGHT: one small reticle beside what a ring is changing, only while it changes */
const SIGHT = new T.Group(); scene.add(SIGHT); const sMat = new T.MeshBasicMaterial({ color: 0xd8e6e2, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
const sArc = new T.Mesh(new T.TorusGeometry(1, .03, 6, 80, 4.2), sMat); sArc.rotation.z = Math.PI / 2 + (TAU - 4.2) / 2 + Math.PI; sArc.renderOrder = 40; SIGHT.add(sArc);
const sBox = new T.Mesh(new T.BoxGeometry(.13, .13, .02), sMat); sBox.renderOrder = 41; SIGHT.add(sBox);
const sTick = []; for (let k = 0; k < 9; k++) { const t = new T.Mesh(new T.BoxGeometry(.03, .14, .01), sMat); const a = Math.PI * .5 + (TAU - 4.2) / 2 + Math.PI - 4.2 / 2 + k / 8 * 4.2; t.position.set(Math.cos(a) * 1.12, Math.sin(a) * 1.12, 0); t.rotation.z = a; t.renderOrder = 40; SIGHT.add(t); sTick.push(t); }
function centerOf(key) { if (key === 'cake') { const b = new T.Box3().setFromObject(CAKE); return b.isEmpty() ? null : { c: b.getCenter(new T.Vector3()), r: b.getSize(new T.Vector3()).length() / 2 }; }
  if (key === 'table') { const b = new T.Box3().setFromObject(TABLE.children[0] || TABLE); return { c: b.getCenter(new T.Vector3()), r: .3 }; }
  if (key === 'light') return { c: keyMark.position.clone(), r: .06 };
  if (key.startsWith('kid')) { const m = KM[+key.slice(3)]; if (!m) return null; return { c: m.getWorldPosition(new T.Vector3()), r: m.scale.y * .5 }; } return null; }
function updSight(dt) { const show = !S.recall && !FILM ? NOW - S.retT < 2.4 : NOW - S.retT < 2.4, ce = show ? centerOf(S.pick) : null; const want = ce ? .75 : 0; sMat.opacity += (want - sMat.opacity) * Math.min(1, dt * 6); SIGHT.visible = sMat.opacity > .02; if (!ce) return;
  const right = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), s = clamp(ce.r * .42, .025, .16); SIGHT.position.copy(ce.c).addScaledVector(right, ce.r * 1.05 + s * 1.3); SIGHT.quaternion.copy(cam.quaternion); SIGHT.scale.setScalar(s);
  const r = rings()[S.lastRing], u = v01(r), a = Math.PI * .5 + (TAU - 4.2) / 2 + Math.PI - 4.2 / 2 + u * 4.2; sBox.position.set(Math.cos(a), Math.sin(a), 0); sBox.rotation.z = a; }

/* =============================================================== THE ROOM: rebuild what changed; the camera is your eye, kneeling */
function apply(dt) { if (dirty.cake) { buildCake(DOC.cake); dirty.cake = false; dirty.mist = true; } if (dirty.table) { buildTable(DOC.table); dirty.table = false; dirty.mist = true; }
  if (DOC.table) { DOC.table.k = Math.min(1, (DOC.table.k || 0) + dt * .9); tableMat.opacity = legMat.opacity = DOC.table.k; tableMat.transparent = legMat.transparent = DOC.table.k < 1; } placeKids(dt);
  const Lt = DOC.light, cw = CAKE.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .05, 0)), la = Lt.a * Math.PI / 180;
  key.position.set(cw.x + Math.sin(la) * .95, cw.y + Lt.h, cw.z + Math.cos(la) * .95); key.target.position.copy(cw); key.color.setRGB(lerp(.72, 1, Lt.warm), lerp(.82, .72, Lt.warm), lerp(1, .45, Lt.warm)); key.intensity = DOC.cake ? Lt.k : 0;
  keyMark.position.copy(key.position); keyMark.visible = keyLine.visible = S.pick === 'light' && NOW - S.retT < 3 && !FILM; keyLine.geometry.setFromPoints([key.position, cw]);
  const lit = FLAMES.length; candleLight.position.set(cw.x, cw.y + .15, cw.z); candleLight.intensity = lit ? (.25 + Math.min(lit, 12) * .12) * (.94 + Math.sin(NOW * 21) * .04 + Math.sin(NOW * 7) * .03) : 0;
  FLAMES.forEach((f, i) => { const k = 1 + Math.sin(NOW * 13 + i * 1.7) * .06 + Math.sin(NOW * 31 + i) * .04; f.scale.set(.016 * k, .034 * (2 - k), 1); });
  MU.uMist.value = DOC.mist; MISTP.visible = DOC.mist > .01; if (MISTP.visible && dirty.mist) { buildMist(); dirty.mist = false; }
  PIV.rotation.set(S.tilt, S.turn, 0, 'XYZ'); if (!DOC.table) { PIV.rotation.z = Math.sin(NOW * .45) * .03; PIV.rotation.x += Math.sin(NOW * .31 + 1) * .025; } }
function placeCam() { const k = sm(S.close); cam.position.set(Math.sin(NOW * .23) * .004, lerp(.98, .8, k) + Math.sin(NOW * .9) * .003, lerp(1.32, .5, k)); cam.lookAt(0, lerp(.69, .68, k), 0); }
function tickAnim(dt) { const A = S.anim; if (!A) return; A.t += dt;
  if (A.k === 'blow') { const C = DOC.cake; if (A.t > .45) { A.t = 0; C.out = (C.out || 0) + 1; dirty.cake = true; tone(320, 120, .35, .04, 'triangle'); if (C.out >= C.candles) { S.anim = null; say('MAKE A WISH'); } } }
  if (A.k === 'mist') { const u = clamp(A.t / A.dur, 0, 1); DOC.mist = lerp(A.from, A.to, sm(u)); if (u >= 1) { S.anim = null; say(A.to ? 'ALL OF IT IS MIST' : 'IT COMES BACK'); } } }
function tickRecall(dt) { const Rc = S.recall; if (!Rc) return; Rc.t += dt; if (Rc.t > .55) { Rc.t = 0; Rc.i++; if (Rc.i >= Rc.frames.length) { S.recall = null; setDoc(JSON.parse(S.recallEnd)); say('THAT IS HOW IT WAS MADE'); return; } setDoc(JSON.parse(Rc.frames[Rc.i])); tick('ring', Rc.i % 5); } }
function resize() { const w = Math.max(2, roomEl.clientWidth), h = Math.max(2, roomEl.clientHeight); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); const pr = R.getPixelRatio(); rt.setSize(Math.round(w * pr), Math.round(h * pr)); mistMat.uniforms.uPx.value = h * pr / (2 * Math.tan(cam.fov * Math.PI / 360)); fitOrb(); }
addEventListener('resize', resize);
function update(dt) { NOW += dt; MU.uTime.value = NOW; tickAnim(dt); tickRecall(dt); apply(dt); placeCam(); updSight(dt);
  const dpos = dustG.attributes.position; for (let i = 0; i < DUSTN; i++) { let y = dpos.array[i * 3 + 1] + dt * (.015 + (i % 7) * .003); if (y > 2.2) y = 0; dpos.array[i * 3 + 1] = y; } dpos.needsUpdate = true;
  RINGS.forEach((r, i) => { r.ang += (r.target - r.ang) * Math.min(1, dt * 18); r.g.rotation.x = r.ang; const on = !!rings()[i]; r.lit.visible = on; r.lit.material.color.setHex(i === S.lastRing ? 0x8ffff0 : i === 0 ? 0xb07a20 : 0x2fae9f); });
  const can = { CAPTURE: true, UNDO: UNDO.length > 0, PLAY: UNDO.length > 0 || !!S.recall, KEEP: !!DOC.cake };
  for (const k in BTN) { const b = BTN[k]; if (odrag && odrag.btn === k) b.down = 1; else b.down = Math.max(0, b.down - dt * 6); b.cap.position.z = b.z0 - b.down * .008; b.lab.material.opacity = can[k] ? 1 : .25; b.g.visible = true; }
  orbPitchV += ((.18 - ORB.rotation.x) * 42 - orbPitchV * 9) * dt; ORB.rotation.x += orbPitchV * dt;
  ORB.userData.iris.material.opacity = .55 + .35 * (.5 + .5 * Math.sin(NOW * 1.6));
  drawDialLabels(); if (oledDirty || (S.msg && NOW - S.msgT < 3.6)) { drawOLED(); oledDirty = false; } }
function render() { if (!PHONE) { grade.uniforms.gt.value = (NOW * 37.1) % 100; R.setRenderTarget(rt); R.render(scene, cam); R.setRenderTarget(null); R.render(gQ, gC); } OR.render(OS, OC); }
let last = performance.now(), auto = true;
function loop(now) { if (!auto) return; const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(loop); }
resize(); requestAnimationFrame(loop);
window.FORGE = { S, get DOC() { return DOC; }, turn, scrub, press, viewBy, rings, things, nextAct, now: () => NOW, flames: () => FLAMES.length, manual() { auto = false; }, advance(dt) { update(dt); render(); }, step(dt) { update(dt); }, PAIR };
