/* =============================================================== THE DOCUMENT */
const PRESETS = [['PLAIN SPONGE', 'DRUM', 0, 0], ['WHITE DRUM', 'DRUM', 2, 1], ['GRANDMOTHER’S CREAM', 'DRUM', 1, 1], ['ROSE DRUM', 'DRUM', 3, 1], ['CHOCOLATE DRUM', 'DRUM', 4, 4], ['LEMON DRUM', 'DRUM', 5, 1], ['MINT DRUM', 'DRUM', 6, 1],
  ['WHITE DOME', 'DOME', 2, 0], ['CHOCOLATE DOME', 'DOME', 4, 3], ['ROSE DOME', 'DOME', 3, 2], ['LEMON DOME', 'DOME', 5, 4], ['WHITE TIERS', 'TIERS', 2, 1], ['CREAM TIERS', 'TIERS', 1, 4], ['ROSE TIERS', 'TIERS', 3, 1],
  ['CHOCOLATE TIERS', 'TIERS', 4, 4], ['WEDDING WHITE', 'TIERS', 2, 4], ['SPONGE RING', 'RING', 0, 0], ['CHOCOLATE RING', 'RING', 4, 0], ['GLAZED RING', 'RING', 2, 0], ['LEMON RING', 'RING', 5, 0],
  ['MINT TIERS', 'TIERS', 6, 2], ['ROSE AND GOLD', 'DRUM', 3, 4], ['CHOCOLATE AND CREAM', 'DOME', 4, 1], ['THE FILM’S CAKE', 'DRUM', 1, 1],
  ['CARAMEL DRUM', 'DRUM', 7, 3], ['CARAMEL RING', 'RING', 7, 0], ['LAVENDER DOME', 'DOME', 8, 1], ['LAVENDER TIERS', 'TIERS', 8, 4], ['RED VELVET DRUM', 'DRUM', 9, 1], ['RED VELVET TIERS', 'TIERS', 9, 1],
  ['COCONUT DOME', 'DOME', 10, 0], ['COCONUT DRUM', 'DRUM', 10, 4], ['SCHOOL SHEET', 'DRUM', 2, 2], ['FARMHOUSE SPONGE', 'DRUM', 0, 1], ['CHURCH-HALL WHITE', 'TIERS', 2, 0], ['NIGHT-SHIFT CHOCOLATE', 'RING', 4, 4],
  ['GARDEN LEMON', 'DOME', 5, 1], ['DINER CARAMEL', 'TIERS', 7, 1], ['MIDSUMMER MINT', 'DRUM', 6, 2], ['WINTER COCONUT', 'TIERS', 10, 4]];
const DOC0 = () => ({ cake: null, candles: null, writing: null, sketch: null, table: null, items: [], light: { a: 40, h: .8, warm: .75, k: 1.2 }, room: { mist: 0, mess: 0, place: null, era: 0 }, title: '', line: '' });
let DOC = DOC0(); const ERAS = ['THE DOME', 'SILVER', 'SEPIA', 'KODACHROME', 'FADED', 'VIDEOTAPE', 'PHONE']; const UNDO = [], REDO = []; let gestT = -9, dirty = { cake: true, table: true, items: true, mess: true }, NEXTID = 1;
const S = { mode: 'PLACE', pick: null, cWhich: 0, add: null, lastRing: -1, hoverRing: -1, msg: '', msgT: -9, retT: -9, pairShow: false, stretch: 1, gain: 1, playT: 0,
  view: { preset: 'EYE', yaw: 0, pitch: .21, dist: 1.38, fov: 38, pan: new T.Vector3() } };
const VIEWS = { EYE: { yaw: 0, pitch: .21, dist: 1.38, fov: 38, eye: true }, FRONT: { yaw: 0, pitch: .06, dist: 1.3, fov: 32 }, SIDE: { yaw: Math.PI / 2, pitch: .06, dist: 1.3, fov: 32 }, TOP: { yaw: 0, pitch: 1.5, dist: 1.4, fov: 32 }, FLY: { yaw: 0, pitch: .3, dist: 1.6, fov: 40, fly: true }, FREE: null };
const CAM = { yaw: 0, pitch: .21, dist: 1.38, fov: 38, tgt: new T.Vector3(0, .69, 0) };
function snap(force) { if (!force && NOW - gestT < 1.2) { gestT = NOW; return; } gestT = NOW; UNDO.push(JSON.stringify(DOC)); if (UNDO.length > 150) UNDO.shift(); REDO.length = 0; }
function setDoc(d) { DOC = d; for (const k in dirty) dirty[k] = true; if (!things().some(t => t.key === S.pick)) S.pick = (things()[0] || {}).key || null; }
function say(m) { S.msg = m; S.msgT = NOW; oledDirty = true; }
function chime() { tone(1320, 1310, .09, .1); setTimeout(() => tone(1760, 1750, .14, .08), 70); }
const itemName = it => it.type === 'cut' ? ((CATBY[it.ref] || {}).name || it.ref) : it.ref;
function things() { const L = []; if (DOC.cake) L.push({ key: 'cake', name: 'CAKE' }); if (DOC.candles) L.push({ key: 'candles', name: 'CANDLES' }); if (DOC.writing) L.push({ key: 'writing', name: 'WRITING' }); if (DOC.sketch) L.push({ key: 'sketch', name: 'ICING PEN' });
  if (DOC.table) L.push({ key: 'table', name: 'TABLE' }); DOC.items.forEach(it => L.push({ key: 'i' + it.id, name: itemName(it), it })); L.push({ key: 'light', name: 'LIGHT' }, { key: 'room', name: 'THE ROOM' }); return L; }
const picked = () => things().find(t => t.key === S.pick) || null;
/* =============================================================== BIRTHDAYS ACROSS TIME AND SPACE: whole scenes, each built from the same shelves.
   cake: preset · candles: [count, kind, lit] · props: [name, x, z, colour] · people: [catalogue id, x, z, size, plane] · room: [place, era, mist, mess] · light: [around, height, warmth, strength] */
const BIRTHDAYS = [
  { title: 'ANA’S, IN THE DOME', line: 'The one she made for someone else, and kept.', cake: 23, candles: [7, 0, 1], props: [['PLATE', .32, .18, 5]], people: [['film-child-1', -.36, -.48], ['film-child-2-blow', .02, -.62], ['film-child-3-blow', .38, -.46]], room: [null, 0, .22, .1], light: [30, .8, .8, 1.2] },
  { title: 'A KITCHEN, 1956', line: 'Lemon cake on the counter, the fridge humming, milk in the good glasses.', cake: 5, candles: [6, 2, 1], props: [['GLASS OF MILK', .3, .12, 5], ['GLASS OF MILK', -.32, .1, 5], ['PARTY HAT', -.18, .3, 1], ['PLATE', .12, .34, 5], ['NAPKIN', -.05, .38, 1]], people: [['cast-daisy', -.55, -.75, 1], ['cast-pam', .62, -.95, 1]], room: ['place-00', 3, .12, .35], light: [50, .9, .7, 1.3] },
  { title: 'A FARMHOUSE WINDOW, 1941', line: 'Eight years old, one candle shaped like the number, the field outside going on without us.', cake: 33, candles: [8, 6, 1], props: [['BOWL OF BERRIES', .3, .1, 0], ['MATCHBOX', -.28, .2, 0]], people: [['cast-walker', -.6, -.8, 1], ['cast-mateo', .55, -.85, .95], ['cat', .7, .25, 1, 'FLOOR']], room: ['place-05', 1, .28, .15], light: [-60, .6, .85, 1.1] },
  { title: 'THE SCHOOL CANTEEN, 1962', line: 'The whole class sang. Somebody dropped their slice. Nobody minded.', cake: 32, candles: [12, 0, 1], props: [['CAKE SLICE', .3, .2, 0], ['PLATE', -.3, .25, 5], ['FORK', -.15, .38, 5], ['CUP', .4, -.1, 2], ['PARTY HAT', .05, .42, 0]], people: [['cast-chad', -.7, -.8, 1], ['cast-joe', -.15, -1.05, 1], ['cast-socrates-117', .6, -.9, 1]], room: ['place-03', 3, .1, .75], light: [10, 1.1, .55, 1.4] },
  { title: 'A CLEARING IN THE WOODS, 1948', line: 'A cake carried out on a tray. Berries from the hedge. A butterfly that would not leave.', cake: 7, candles: [5, 4, 1], props: [['BOWL OF BERRIES', -.3, .15, 0], ['NAPKIN', .25, .3, 3]], people: [['cast-the-shepherd', -.65, -.9, 1], ['butterfly', .15, 0, 1.6, 'AIR'], ['rabbit', .8, .2, 1, 'FLOOR']], room: ['place-06', 2, .3, .2], light: [70, 1.2, .7, 1.1] },
  { title: 'THE DESERT ROAD, 1970', line: 'Sparklers in a cake from a gas station, the bus ticking as it cooled.', cake: 25, candles: [6, 7, 1], props: [['BALLOON', -.25, -.2, 4], ['STREAMER', 0, -.35, 1], ['CUP', .3, .2, 0]], people: [['cast-becky', -.6, -.85, 1], ['cast-bro-crates', .65, -.9, 1], ['guitar', .85, .15, .42, 'FLOOR']], room: ['place-08', 4, .18, .3], light: [-30, .7, 1, 1.5] },
  { title: 'A FRONT ROOM, 1975', line: 'Rose cake on the coffee table, presents still in their paper, the cat asleep in the middle of it.', cake: 13, candles: [12, 1, 1], props: [['PRESENT', -.3, .15, 1], ['PRESENT', .32, .18, 2], ['PRESENT', .2, -.25, 6], ['PARTY HAT', -.1, .36, 4]], people: [['cast-madame', -.6, -.85, 1], ['cast-jim', .6, -.9, 1], ['cat', .1, .5, 1, 'FLOOR']], room: ['place-01', 4, .15, .5], light: [40, .8, .9, 1.2] },
  { title: 'AN OFFICE AFTER HOURS, 1994', line: 'One candle in a cake from the shop downstairs. We wrote SORRY WE’RE LATE and meant it.', cake: 29, candles: [1, 5, 1], writing: 'SORRY/WE’RE LATE', props: [['CUP', .3, .1, 7], ['CUP', -.3, .12, 5], ['NAPKIN', 0, .38, 5]], people: [['cast-regent-vallon', -.55, -.85, 1], ['cast-lexi', .6, -.9, 1]], room: ['place-11', 5, .1, .25], light: [0, 1.3, .3, 1.3] },
  { title: 'THE STREET OUTSIDE, 1952', line: 'The table carried out onto the pavement. The dog got the first piece.', cake: 15, candles: [4, 0, 1], props: [['PLATE', -.3, .2, 5], ['FORK', -.18, .3, 5], ['PARTY HAT', .28, .25, 1]], people: [['cast-huey', -.6, -.85, 1], ['dog', .55, .35, 1, 'FLOOR'], ['umbrella', -1.0, -.4, 1, 'FLOOR']], room: ['place-02', 1, .2, .4], light: [-50, .9, .6, 1.2] },
  { title: 'A STADIUM AT NIGHT, 1939', line: 'Lights strung over the stands and a cake for the boy who kept the score.', cake: 12, candles: [9, 0, 1], props: [['STREAMER', 0, -.3, 6], ['GLASS OF MILK', .3, .15, 5]], people: [['cast-cuffs', -.6, -.85, 1], ['light-bulb', -.3, 0, 1.2, 'AIR'], ['star', .35, .05, 1, 'AIR']], room: ['place-16', 1, .3, .2], light: [20, 1.4, .8, 1.2] },
  { title: 'A FARM, 1958', line: 'A sheet cake on a trestle, the horse looking over the fence as if invited.', cake: 33, candles: [10, 2, 1], props: [['BOWL OF BERRIES', .3, .15, 0], ['PLATE', -.3, .2, 5], ['CUP', -.1, .4, 4]], people: [['cast-mateo', -.6, -.85, 1], ['horse', .95, -.6, .9, 'FLOOR'], ['duck', -.9, .2, 1, 'FLOOR']], room: ['place-07', 3, .15, .3], light: [60, 1.1, .7, 1.3] },
  { title: 'A LONG HALL, 2003', line: 'Gold candles and the polished floor, everyone’s phone held up, nobody looking at the cake.', cake: 31, candles: [8, 5, 1], props: [['BALLOON', -.3, -.25, 6], ['BALLOON', .25, -.3, 2], ['PRESENT', .3, .2, 7]], people: [['cast-announcer', -.6, -.85, 1], ['cast-lexi', .55, -.9, 1]], room: ['place-10', 6, .1, .25], light: [0, 1.2, .5, 1.3] },
  { title: 'A VILLAGE STREET, 1930s', line: 'A plain sponge, a cloth on the table, and every child on the street invited.', cake: 0, candles: [3, 4, 1], props: [['NAPKIN', 0, .35, 5], ['CUP', .3, .15, 5]], people: [['cast-walter', -.6, -.85, 1], ['cast-huey', .6, -.95, .9], ['flower', .3, -.15, 1]], room: ['place-13', 2, .35, .15], light: [-40, .8, .9, 1] },
  { title: 'AN OPEN PLAIN, ANY YEAR', line: 'Nothing but the table and the horizon. The cake is the only made thing for miles.', cake: 18, candles: [1, 6, 1], props: [], people: [['swan', -.9, -.5, 1, 'FLOOR']], room: ['place-09', 3, .4, 0], light: [90, .5, 1, 1.4] }];
function makeBirthday(b) { const D = DOC0(); D.title = b.title; D.line = b.line; const pr = PRESETS[b.cake] || PRESETS[0]; D.cake = { preset: b.cake, form: pr[1], icing: b.icing != null ? b.icing : pr[2], border: pr[3], size: 1 };
  if (b.candles && b.candles[0]) D.candles = { n: b.candles[0], ctype: b.candles[1], lit: b.candles[2], spread: 1, len: 1, per: {} }; if (b.writing) D.writing = { text: b.writing, cur: b.writing.length, size: .9, col: 1 };
  D.table = { w: 1, wood: b.title.length % 4, shape: b.title.length % 3 === 0 ? 1 : 0, k: 1 }; let id = 1;
  (b.props || []).forEach(([ref, x, z, c]) => D.items.push({ id: id++, type: 'prop', ref, plane: PROPS[ref], x, z, up: .3, turn: (id * 37) % 60 - 30, size: 1, play: 1, frame: 0, mirror: 0, color: c || 0 }));
  (b.people || []).forEach(([ref, x, z, size, plane]) => { const e = CATBY[ref]; if (!e) return; D.items.push({ id: id++, type: 'cut', ref, plane: plane || (e.plane === 'air' ? 'AIR' : e.plane === 'floor' ? 'FLOOR' : 'TABLE'), x, z, up: plane === 'AIR' ? .35 : .3, turn: 0, size: size || 1, play: 1, frame: 0, mirror: x > 0 && e.kind !== 'film' ? 1 : 0, color: 0 }); });
  NEXTID = Math.max(NEXTID, id); const [place, era, mist, mess] = b.room; D.room = { place, era, mist, mess }; const [a, h, w, k] = b.light; D.light = { a, h, warm: w, k }; return D; }
/* =============================================================== THE SHELVES: everything that can be added */
function shelves() { const C = k => CAT.filter(c => c.kind === k).map(c => ({ key: 'cut:' + c.id, name: c.name, from: c.from }));
  const L = [{ n: 'BIRTHDAYS', items: BIRTHDAYS.map((b, i) => ({ key: 'bday:' + i, name: b.title, from: b.line })) }, { n: 'CAKES', items: PRESETS.map((p, i) => ({ key: 'cake:' + i, name: p[0] })) }];
  if (DOC.cake) L.push({ n: 'ON THE CAKE', items: [!DOC.candles && { key: 'candles', name: 'CANDLES' }, !DOC.writing && { key: 'writing', name: 'WRITING' }, !DOC.sketch && { key: 'sketch', name: 'ICING PEN' }].filter(Boolean) });
  L.push({ n: 'TABLE', items: DOC.table ? [] : [{ key: 'table', name: 'TABLE' }] }, { n: 'PROPS', items: Object.keys(PROPS).map(p => ({ key: 'prop:' + p, name: p })) },
    { n: 'FROM THE FILM', items: C('film') }, { n: 'CAST', items: C('cast') }, { n: 'MOVING', items: C('moving') }, { n: 'STILLS', items: C('still') });
  return L.filter(s => s.items.length); }
function create(key) { const [k, r] = key.split(':'); if (k === 'bday') { setDoc(makeBirthday(BIRTHDAYS[+r])); S.pick = 'cake'; say(DOC.title); return; }
  if (k === 'cake') { const p = PRESETS[+r]; DOC.cake = { preset: +r, form: p[1], icing: p[2], border: p[3], size: 1 }; if (+r === 23 && !DOC.writing) DOC.writing = { text: '生日快乐', cur: 4, size: .8, col: 4 }; S.pick = 'cake'; }
  else if (k === 'candles') { DOC.candles = { n: 7, lit: 1, spread: 1, len: 1, ctype: 0, per: {} }; S.cWhich = 0; S.pick = 'candles'; }
  else if (k === 'writing') { DOC.writing = { text: 'HAPPY/BIRTHDAY', cur: 14, size: 1, col: 0 }; S.pick = 'writing'; }
  else if (k === 'sketch') { DOC.sketch = { pts: [], u: 0, v: 0, down: 1, col: 0 }; S.pick = 'sketch'; }
  else if (k === 'table') { DOC.table = { w: 1, wood: 0, shape: 0, k: 0 }; S.pick = 'table'; }
  else { const it = { id: NEXTID++, type: k === 'prop' ? 'prop' : 'cut', ref: r, x: 0, z: 0, up: .3, turn: 0, size: 1, play: 1, frame: 0, mirror: 0, color: 0 }; const e = CATBY[r];
    it.plane = k === 'prop' ? PROPS[r] : e ? (e.plane === 'air' ? 'AIR' : e.plane === 'floor' ? 'FLOOR' : 'TABLE') : 'TABLE';
    const n = DOC.items.length, a = Math.PI + (n % 7 - 3) * .32; if (it.plane === 'FLOOR') { it.x = Math.sin(a) * 1.0; it.z = Math.cos(a) * 1.0 - .2; } else if (it.plane === 'TABLE' || it.plane === 'FLAT') { const r0 = k === 'prop' ? .28 : .5; it.x = Math.sin(a + (k === 'prop' ? 2 : 0)) * r0; it.z = Math.cos(a + (k === 'prop' ? 2 : 0)) * r0; } else { it.x = (n % 3 - 1) * .25; it.up = .35; }
    if (e && e.kind === 'film') { const s = [Math.PI - .62, Math.PI - .04, Math.PI + .56][+(r.match(/film-child-(\d)/) || [0, 1])[1] - 1]; it.x = Math.sin(s) * .62; it.z = Math.cos(s) * .62; it.plane = 'TABLE'; }
    DOC.items.push(it); S.pick = 'i' + it.id; }
  for (const d in dirty) dirty[d] = true; }
function remove(key) { if (key === 'cake') { DOC.cake = DOC.candles = DOC.writing = DOC.sketch = null; } else if (['candles', 'writing', 'sketch', 'table'].includes(key)) DOC[key] = null; else if (key[0] === 'i') DOC.items = DOC.items.filter(it => 'i' + it.id !== key); else return false; for (const d in dirty) dirty[d] = true; return true; }
/* =============================================================== THE RINGS. Ring 1 picks. PLACE: across, depth (or up), turn, size. STYLE: what the thing is. VIEW: the camera.
   Every ring's step is multiplied by the orb's squeeze: squeezed is coarse (×4), stretched is fine (×¼). */
const list = (n, get, set, L) => ({ n, v: get, set: v => set(clamp(Math.round(v), 0, L.length - 1)), st: 1, f: v => L[clamp(Math.round(v), 0, L.length - 1)], lo: 0, hi: L.length - 1, step: true });
const num = (n, get, set, lo, hi, st, f, wrap) => ({ n, v: get, set: v => set(wrap ? ((v - lo) % (hi - lo) + (hi - lo)) % (hi - lo) + lo : clamp(+v.toFixed(4), lo, hi)), st, f, lo, hi, wrap });
const deg = v => Math.round(((v * 57.2958) % 360 + 540) % 360 - 180) + '°', cm = v => Math.round(v * 100) + ' CM';
function rings() {
  if (window.REMOTE_RINGS) return window.REMOTE_RINGS(); const out = [null, null, null, null, null];
  if (S.add) { const SH = shelves(), si = clamp(S.add.s, 0, SH.length - 1), sh = SH[si]; S.add.s = si; S.add.i = clamp(S.add.i, 0, sh.items.length - 1);
    out[0] = list('SHELF', () => S.add.s, v => { S.add.s = v; S.add.i = 0; ghostDirty = true; }, SH.map(s => s.n)); out[1] = list(sh.n, () => S.add.i, v => { S.add.i = v; ghostDirty = true; }, sh.items.map(x => x.name)); return out; }
  if (S.mode === 'VIEW') { const V = S.view, free = () => { if (V.preset !== 'FREE' && V.preset !== 'FLY') { V.eyeHold = !!(VIEWS[V.preset] && VIEWS[V.preset].eye); V.preset = 'FREE'; } }, P = Object.keys(VIEWS);
    out[0] = list('CAMERA', () => P.indexOf(V.preset), v => setView(P[v]), P); out[1] = num('ORBIT', () => V.yaw, v => { free(); V.yaw = v; }, -Math.PI, Math.PI, 5 / 57.3, deg, true);
    out[2] = num('TILT', () => V.pitch, v => { free(); V.pitch = v; }, -.2, 1.5, 3 / 57.3, v => Math.round(v * 57.3) + '°'); out[3] = num('ZOOM', () => V.dist, v => { free(); V.dist = v; }, .25, 5, .05, v => v.toFixed(2) + ' M');
    out[4] = num('LENS', () => V.fov, v => V.fov = Math.round(v), 14, 70, 2, v => Math.round(12 / Math.tan(v * Math.PI / 360)) + ' MM'); return out; }
  const L = things(); if (L.length > 1) out[0] = list('PICK', () => Math.max(0, L.findIndex(t => t.key === S.pick)), v => { if (L[v].key !== S.pick) { S.pick = L[v].key; chime(); } }, L.map(t => t.name));
  const p = picked(); if (!p) return out; const dc = () => dirty.cake = true; let props = [];
  if (S.mode === 'PLACE') props = placeRings(p, dc); else if (S.mode === 'SHAPE') props = shapeRings(p, dc); else props = styleRings(p, dc);
  props.forEach((r, i) => { if (r) { r.undoable = true; out[i + 1] = r; } }); return out; }
function placeRings(p, dc) { const C = DOC.cake, Lt = DOC.light;
  if (p.key === 'light') return [num('AROUND', () => Lt.a, v => Lt.a = v, -180, 180, 10, v => Math.round(v) + '°', true), num('HEIGHT', () => Lt.h, v => Lt.h = v, .05, 1.6, .05, cm)];
  if (p.key === 'cake') return [num('SIZE', () => C.size, v => { C.size = v; dc(); }, .6, 1.8, .05, v => '×' + v.toFixed(2))];
  if (p.key === 'table') return [num('WIDTH', () => DOC.table.w, v => { DOC.table.w = v; dirty.table = dirty.mess = true; }, .6, 1.6, .05, v => Math.round(120 * v) + ' CM')];
  if (p.key === 'candles') return candleRings(DOC.candles, dc, true);
  if (p.key === 'sketch') return sketchRings(DOC.sketch, dc);
  if (!p.it) return []; const it = p.it, di = () => dirty.items = true, pl = it.plane, lim = pl === 'FLOOR' ? 3 : pl === 'BACK' ? 3 : .9;
  return [num('ACROSS', () => it.x, v => { it.x = v; di(); }, -lim, lim, .01, cm), pl === 'AIR' || pl === 'BACK' ? num('UP', () => it.up, v => { it.up = v; di(); }, -.4, 2.2, .01, cm) : num('DEPTH', () => it.z, v => { it.z = v; di(); }, -lim, lim, .01, cm),
    pl === 'BACK' ? num('DISTANCE', () => it.z, v => { it.z = v; di(); }, -9, -1, .1, v => (-v).toFixed(1) + ' M') : num('TURN', () => it.turn, v => { it.turn = Math.round(v); di(); }, -180, 180, 5, v => Math.round(v) + '°', true),
    num('SIZE', () => it.size, v => { it.size = v; di(); }, .2, 4, .05, v => '×' + v.toFixed(2))]; }
// SHAPE: a made thing is sculpted (height, width, taper, swell, lean); a cut-out is a card, so it is tilted, curled and lit
function shapeRings(p, dc) { const pct = v => Math.round(v * 100) + '%', x2 = v => '×' + v.toFixed(2);
  if (p.key === 'cake') { const C = DOC.cake; return [num('TALL', () => C.tall || 1, v => { C.tall = v; dc(); }, .5, 2.2, .05, x2), num('WIDE', () => C.wide || 1, v => { C.wide = v; dc(); }, .6, 1.6, .05, x2),
    num('TAPER', () => C.taper == null ? 1 : C.taper, v => { C.taper = v; dc(); }, .45, 1.3, .05, v => v < .98 ? 'NARROWS ' + pct(1 - v) : v > 1.02 ? 'FLARES ' + pct(v - 1) : 'STRAIGHT'), num('SWELL', () => C.swell || 0, v => { C.swell = v; dc(); }, -.3, .4, .02, v => v > .01 ? 'BELLIES ' + pct(v) : v < -.01 ? 'PINCHED ' + pct(-v) : 'NONE')]; }
  if (p.key === 'table') return [num('WIDTH', () => DOC.table.w, v => { DOC.table.w = v; dirty.table = dirty.mess = true; }, .6, 1.6, .05, v => Math.round(120 * v) + ' CM')];
  const it = p.it, di = () => dirty.items = true; if (!it) return [];
  if (it.type === 'prop') return [num('TALL', () => it.tall || 1, v => { it.tall = v; di(); }, .4, 2.5, .05, x2), num('WIDE', () => it.wide || 1, v => { it.wide = v; di(); }, .4, 2.5, .05, x2),
    num('LEAN', () => it.lean || 0, v => { it.lean = Math.round(v); di(); }, -90, 90, 5, v => Math.round(v) + '°'), num('SPIN', () => it.turn, v => { it.turn = Math.round(v); di(); }, -180, 180, 5, v => Math.round(v) + '°', true)];
  return [num('TILT', () => it.lean || 0, v => { it.lean = Math.round(v); di(); }, -60, 60, 3, v => v ? (v > 0 ? 'BACK ' : 'FORWARD ') + Math.abs(Math.round(v)) + '°' : 'UPRIGHT'), num('CURL', () => it.curl || 0, v => { it.curl = +v.toFixed(2); di(); }, -1, 1, .05, v => Math.abs(v) < .03 ? 'FLAT' : (v > 0 ? 'TOWARD YOU ' : 'AWAY ') + pct(Math.abs(v))),
    list('FACES', () => it.fixed ? 1 : 0, v => { it.fixed = v; di(); }, ['THE EYE', 'ITS OWN WAY']), num('GLOW', () => it.glow == null ? .14 : it.glow, v => { it.glow = v; di(); }, 0, 1, .02, v => v < .08 ? 'PAPER' : v > .6 ? 'PROJECTED' : pct(v))]; }
function styleRings(p, dc) { const C = DOC.cake, Lt = DOC.light, Rm = DOC.room;
  if (p.key === 'cake') return [list('CAKE', () => C.preset == null ? 0 : C.preset, v => { const q = PRESETS[v]; Object.assign(C, { preset: v, form: q[1], icing: q[2], border: q[3] }); dc(); }, PRESETS.map(q => q[0])), list('FORM', () => Object.keys(FORMS).indexOf(C.form), v => { C.form = Object.keys(FORMS)[v]; dc(); }, Object.keys(FORMS)),
    list('ICING', () => C.icing, v => { C.icing = v; dc(); }, ICING.map(i => i[0])), list('BORDER', () => C.border, v => { C.border = v; dc(); }, BORDER.map(i => i[0]))];
  if (p.key === 'candles') return candleRings(DOC.candles, dc, false);
  if (p.key === 'writing') return writingRings(DOC.writing, dc);
  if (p.key === 'sketch') return sketchRings(DOC.sketch, dc);
  if (p.key === 'table') return [list('WOOD', () => DOC.table.wood, v => { DOC.table.wood = v; dirty.table = true; }, WOOD.map(w => w[0])), list('OUTLINE', () => DOC.table.shape, v => { DOC.table.shape = v; dirty.table = true; }, ['HEX', 'ROUND'])];
  if (p.key === 'light') return [num('WARMTH', () => Lt.warm, v => Lt.warm = v, 0, 1, .05, v => Math.round(lerp(6500, 2200, v) / 100) * 100 + ' K'), num('STRENGTH', () => Lt.k, v => Lt.k = v, 0, 3, .1, v => Math.round(v / 3 * 100) + '%')];
  if (p.key === 'room') { const PL = [null, ...CAT.filter(c => c.kind === 'place').map(c => c.id)]; return [list('PLACE', () => Math.max(0, PL.indexOf(Rm.place || null)), v => { Rm.place = PL[v]; }, PL.map(id => id ? CATBY[id].name : 'THE DOME')), list('ERA', () => Rm.era || 0, v => Rm.era = v, ERAS),
    num('MIST', () => Rm.mist, v => Rm.mist = v, 0, 1, .05, v => Math.round(v * 100) + '%'), num('MESS', () => Rm.mess, v => { Rm.mess = v; dirty.mess = true; }, 0, 1, .05, v => Math.round(v * 100) + '%')]; }
  const it = p.it, di = () => dirty.items = true; if (!it) return [];
  const plane = list('PLANE', () => PLANES.indexOf(it.plane), v => { it.plane = PLANES[v]; if (it.plane === 'BACK' && it.z > -1) it.z = -3; if (it.plane !== 'BACK' && it.z < -1) it.z = -.4; di(); }, PLANES);
  if (it.type === 'prop') return [plane, list('COLOUR', () => it.color, v => { it.color = v; di(); }, PALETTE.map(c => c[0]))];
  const e = CATBY[it.ref] || { frames: 1 }; return [plane, e.frames > 1 ? list('MOTION', () => it.play, v => { it.play = v; }, ['HELD', 'PLAYING', 'SLOW', 'FAST', 'BACK AND FORTH']) : null,
    e.frames > 1 ? num('FRAME', () => it.frame, v => { it.frame = Math.round(v); it.play = 0; }, 0, e.frames - 1, 1, v => (Math.round(v) + 1) + ' OF ' + e.frames) : null, list('FACING', () => it.mirror, v => { it.mirror = v; di(); }, ['AS FILMED', 'MIRRORED'])]; }
function candleRings(Cd, dc, place) { const single = CTYPES[Cd.ctype][0] === 'NUMBER', W = single ? ['ALL'] : ['ALL', ...Array.from({ length: Cd.n }, (_, k) => 'CANDLE ' + (k + 1))]; S.cWhich = Math.min(S.cWhich, W.length - 1);
  const which = list('WHICH', () => S.cWhich, v => { S.cWhich = v; }, W), k = S.cWhich - 1, P = () => Cd.per[k] || (Cd.per[k] = {});
  if (place) { if (S.cWhich === 0) return [which, num('SPREAD', () => Cd.spread, v => { Cd.spread = v; dc(); }, .2, 1.6, .05, v => '×' + v.toFixed(2)), num('LENGTH', () => Cd.len, v => { Cd.len = v; dc(); }, .5, 2, .05, v => '×' + v.toFixed(2))];
    return [which, num('AROUND', () => (P().da || 0) * 57.2958, v => { P().da = v / 57.2958; dc(); }, -180, 180, 4, v => (v > 0 ? '+' : '') + Math.round(v) + '°'), num('IN / OUT', () => P().rf == null ? 1 : P().rf, v => { P().rf = v; dc(); }, 0, 1.6, .05, v => Math.round(v * 100) + '%')]; }
  if (S.cWhich === 0) return [which, list('KIND', () => Cd.ctype, v => { Cd.ctype = v; dc(); }, CTYPES.map(c => c[0])), num('COUNT', () => Cd.n, v => { Cd.n = Math.round(v); Cd.per = {}; dc(); }, 1, 12, 1, v => String(Math.round(v))), list('FLAMES', () => Cd.lit, v => { Cd.lit = v; for (const q in Cd.per) Cd.per[q].out = false; dc(); }, ['ALL OUT', 'ALL LIT'])];
  return [which, list('FLAME', () => (P().out || !Cd.lit) ? 0 : 1, v => { P().out = !v; if (v) Cd.lit = 1; dc(); }, ['OUT', 'LIT'])]; }
const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!&'.-/生日快乐";
function writingRings(Wt, dc) { const at = () => Wt.text[Wt.cur] || ' ';
  return [list('LETTER', () => Math.max(0, CHARS.indexOf(at())), v => { Wt.text = Wt.text.slice(0, Wt.cur) + CHARS[v] + Wt.text.slice(Wt.cur + 1); dc(); }, CHARS.split('').map(c => c === ' ' ? 'SPACE' : c === '/' ? 'NEW LINE' : c)),
    num('CURSOR', () => Wt.cur, v => { Wt.cur = Math.round(v); }, 0, Math.max(1, Wt.text.length), 1, v => (Math.round(v) + 1) + ' OF ' + (Wt.text.length + 1)),
    num('SIZE', () => Wt.size, v => { Wt.size = v; dc(); }, .4, 1.3, .05, v => '×' + v.toFixed(2)), list('COLOUR', () => Wt.col, v => { Wt.col = v; dc(); }, WCOLS.map(c => c[0]))]; }
// the Etch A Sketch: ring 2 moves the pen across, ring 3 moves it toward you and away; with the pen down every move is piped
function sketchRings(sk, dc) { const mv = (du, dv) => { sk.u = clamp(sk.u + du, -1, 1); sk.v = clamp(sk.v + dv, -1, 1); if (sk.u * sk.u + sk.v * sk.v > 1) { const l = Math.hypot(sk.u, sk.v); sk.u /= l; sk.v /= l; } sk.pts.push([sk.u, sk.v, sk.down ? 1 : 0]); dc(); };
  return [num('↔ ACROSS', () => sk.u, v => mv(v - sk.u, 0), -1, 1, .025, v => Math.round(v * 100)), num('↕ DEPTH', () => sk.v, v => mv(0, v - sk.v), -1, 1, .025, v => Math.round(v * 100)),
    list('PEN', () => sk.down, v => { sk.down = v; sk.pts.push([sk.u, sk.v, 0]); dc(); }, ['LIFTED', 'PIPING']), list('ICING', () => sk.col, v => { sk.col = v; dc(); }, PALETTE.map(c => c[0]))]; }
function v01(r) { if (r && r.u != null) return r.u; if (!r || r.lo == null) return .5; let v = r.v(); if (r.wrap) { const sp = r.hi - r.lo; v = ((v - r.lo) % sp + sp) % sp + r.lo; } return clamp((v - r.lo) / Math.max(1e-6, r.hi - r.lo), 0, 1); }
const AXC = ['#ff5b4d', '#5fe36e', '#4f8dff'];
let scrubAcc = [0, 0, 0, 0, 0], FLY = [0, 0, 0, 0, 0];
function turn(i, steps) { if (window.REMOTE) { tick('ring', i); ORB.spin(i, steps); S.lastRing = i; return window.REMOTE({ k: 'turn', i, steps }); }
  const r = rings()[i]; if (!r) { tick('dead'); return; } tick('ring', i); if (r.undoable) snap(); const g = r.step ? 1 : S.gain; r.set(r.v() + r.st * steps * g); S.lastRing = i; S.retT = NOW; ORB.spin(i, steps); oledDirty = true; }
function scrub(i, frac) { if (window.REMOTE) { ORB.spin(i, frac); S.lastRing = i; return window.REMOTE({ k: 'scrub', i, frac }); }
  const r = rings()[i]; if (!r) return; if (r.step || r.st >= 1) { scrubAcc[i] += frac; while (Math.abs(scrubAcc[i]) >= 1) { turn(i, Math.sign(scrubAcc[i])); scrubAcc[i] -= Math.sign(scrubAcc[i]); } return; }
  if (r.undoable) snap(); const b = Math.floor(r.v() / r.st); r.set(r.v() + r.st * frac * S.gain); if (Math.floor(r.v() / r.st) !== b) tick('ring', i); S.lastRing = i; S.retT = NOW; ORB.spin(i, frac); oledDirty = true; }
/* the accordion: squeezing and stretching the orb sets how far every ring moves per click */
function setSqueeze(v) { S.stretch = clamp(v, .7, 1.8); S.gain = Math.pow(2, (1.25 - S.stretch) / .275 * 2); setStretch(S.stretch); say(S.gain >= 1.5 ? 'SQUEEZED · COARSE ×' + S.gain.toFixed(1) : S.gain <= .7 ? 'STRETCHED · FINE ×' + S.gain.toFixed(2) : 'EVEN · ×' + S.gain.toFixed(1)); }
function setView(p) { const V = S.view; V.preset = p; V.eyeHold = false; const P = VIEWS[p]; if (P) { const b = sceneBox(), sz = b ? b.getSize(new T.Vector3()).length() : .3; V.yaw = P.yaw; V.pitch = P.pitch; V.dist = P.eye ? P.dist : clamp(sz * .32 / Math.tan(P.fov * Math.PI / 360), .45, 4); V.fov = P.fov; V.pan.set(0, 0, 0); } say('CAMERA · ' + p); }
function viewBy(dyaw, dpitch, dzoom, panx, pany) { if (window.REMOTE) return window.REMOTE({ k: 'view', dx: dyaw, dy: dpitch, dc: dzoom, px: panx, py: pany }); const V = S.view; if (V.preset !== 'FREE') { V.eyeHold = !!(VIEWS[V.preset] && VIEWS[V.preset].eye); V.preset = 'FREE'; oledDirty = true; }
  V.yaw += dyaw || 0; V.pitch = clamp(V.pitch + (dpitch || 0), -.2, 1.5); V.dist = clamp(V.dist * Math.exp(-(dzoom || 0)), .25, 5);
  if (panx || pany) { const r = new T.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), u = new T.Vector3(0, 1, 0).applyQuaternion(cam.quaternion); V.pan.addScaledVector(r, -(panx || 0) * V.dist).addScaledVector(u, (pany || 0) * V.dist); } }

/* =============================================================== BUTTONS: MODE · UNDO · PHONE on the grip; ADD · DEL · KEEP on the lens end */
const MODES = ['PLACE', 'SHAPE', 'STYLE', 'VIEW'], MODECOL = { PLACE: 0x5fd07a, SHAPE: 0xd27ac4, STYLE: 0xe0a040, VIEW: 0x6f9fe0 };
function press(b, long) { if (window.REMOTE) { tick('press'); ORB.push(b); return window.REMOTE({ k: 'press', b, long }); } tick('press'); ORB.push(b);
  if (b === 'MODE') { S.add = null; ghostDirty = true; S.mode = long ? 'VIEW' : MODES[(MODES.indexOf(S.mode) + 1) % MODES.length]; const pk = picked(); if (S.mode === 'SHAPE' && !(pk && shapeRings(pk, () => {}).length)) S.mode = 'STYLE';
    const card = pk && pk.it && pk.it.type === 'cut'; say(S.mode === 'PLACE' ? 'PLACE · WHERE IT IS' : S.mode === 'SHAPE' ? (card ? 'SHAPE · BEND AND TILT THE CARD' : 'SHAPE · SCULPT IT') : S.mode === 'STYLE' ? 'STYLE · WHAT IT IS LIKE' : 'VIEW · HOW IT IS SEEN'); }
  else if (b === 'ADD') { if (!S.add) { if (S.mode === 'VIEW') S.mode = 'PLACE'; S.add = { s: DOC.cake ? 2 : 0, i: 0 }; ghostDirty = true; say('RING 1 A SHELF · RING 2 THE THING · ADD AGAIN TO PUT IT IN'); }
    else { const sh = shelves()[S.add.s], x = sh && sh.items[S.add.i]; if (!x) return; snap(true); create(x.key); S.add = null; ghostDirty = true; chime(); if (!x.key.startsWith('bday')) say(x.name + ' · IN'); } }
  else if (b === 'DEL') { if (S.add) { S.add = null; ghostDirty = true; say('CANCELLED'); return; } const p = picked(); if (!p || p.key === 'light' || p.key === 'room') { tick('dead'); return; } if (p.key === 'sketch' && DOC.sketch.pts.length && !long) { snap(true); DOC.sketch.pts = []; dirty.cake = true; say('SHAKEN CLEAN'); return; } snap(true); remove(p.key); setDoc(DOC); say(p.name + ' · OUT · UNDO BRINGS IT BACK'); }
  else if (b === 'UNDO') { if (S.add) { S.add = null; ghostDirty = true; say('CANCELLED'); return; } const from = long ? REDO : UNDO, to = long ? UNDO : REDO, s = from.pop(); if (!s) { tick('dead'); say(long ? 'NOTHING TO REDO' : 'NOTHING TO UNDO'); return; } to.push(JSON.stringify(DOC)); setDoc(JSON.parse(s)); say(long ? 'REDONE' : 'UNDONE'); }
  else if (b === 'KEEP') keep(); else if (b === 'PAIR') PAIR.open();
  oledDirty = true; }
function keep() { try { new T.GLTFExporter().parse(MEM, r => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r], { type: 'model/gltf-binary' })); a.download = 'memory.glb'; document.body.append(a); a.click(); setTimeout(() => a.remove(), 1000); say('KEPT · MEMORY.GLB'); }, { binary: true }); } catch (e) { say('COULD NOT KEEP'); } }
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
function setStretch(v) { ORB.scale.x = v; ORB.traverse(o => { if (o.userData.keepW) o.scale.x = 1 / v; }); fitOrb(); }

/* =============================================================== HANDS ON THE ORB: rings click up and down, scrub sideways, and keep spinning when flicked.
   Pull the two ends apart (or pinch) to stretch the orb: fine. Push them together: coarse. */
const oray = new T.Raycaster(), ondc = new T.Vector2(); let odrag = null; const optrs = new Map();
function orbHit(e) { const r = OR.domElement.getBoundingClientRect(); ondc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); oray.setFromCamera(ondc, OC); const h = oray.intersectObjects(ORB.children, true)[0]; if (!h) return null; let o = h.object; while (o && o.userData.ring == null && !o.userData.btn && !o.userData.grip && !o.userData.pair && !o.userData.lens) o = o.parent; return o ? o.userData : null; }
OR.domElement.addEventListener('pointerdown', e => { optrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (optrs.size === 2) { const [p, q] = [...optrs.values()]; odrag = { pinch: Math.hypot(p.x - q.x, p.y - q.y), s0: S.stretch }; return; }
  const u = orbHit(e); if (!u) return; OR.domElement.setPointerCapture(e.pointerId);
  if (u.btn) { odrag = { btn: u.btn, t: performance.now() }; BTN[u.btn].down = 1; return; } if (u.pair) { PAIR.open(); return; }
  if (u.grip || u.lens) { odrag = { end: u.grip ? -1 : 1, x: e.clientX, y: e.clientY, s0: S.stretch }; return; }
  odrag = { ring: u.ring, x: e.clientX, y: e.clientY, acc: 0, lock: null, vel: 0, t: performance.now() }; FLY[u.ring] = 0; S.lastRing = u.ring; oledDirty = true; if (!rings()[u.ring]) tick('dead'); });
OR.domElement.addEventListener('pointermove', e => { if (optrs.has(e.pointerId)) optrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (!odrag) { const u = orbHit(e); const hr = u && u.ring != null && rings()[u.ring] ? u.ring : -1; if (hr !== S.hoverRing) { S.hoverRing = hr; oledDirty = true; } OR.domElement.style.cursor = u ? (u.btn || u.pair ? 'pointer' : u.grip || u.lens ? 'ew-resize' : hr >= 0 ? 'ns-resize' : '') : ''; return; }
  if (odrag.pinch != null) { if (optrs.size === 2) { const [p, q] = [...optrs.values()]; setSqueeze(odrag.s0 * Math.hypot(p.x - q.x, p.y - q.y) / odrag.pinch); } return; }
  const rx = e.clientX - odrag.x, ry = e.clientY - odrag.y;
  if (odrag.end) { const along = (PORTRAIT ? -ry : rx) * odrag.end; setSqueeze(odrag.s0 + along / (orbEl.clientWidth * .5)); return; }
  if (odrag.ring == null) return; const dx = PORTRAIT ? -ry : rx, dy = PORTRAIT ? rx : -ry; odrag.x = e.clientX; odrag.y = e.clientY; const now = performance.now(), dt = Math.max(1, now - odrag.t); odrag.t = now;
  if (!odrag.lock) { odrag.ax = (odrag.ax || 0) + Math.abs(dx); odrag.ay = (odrag.ay || 0) + Math.abs(dy); if (odrag.ax + odrag.ay > 6) odrag.lock = odrag.ax > odrag.ay ? 'x' : 'y'; else return; }
  if (odrag.lock === 'x') { scrub(odrag.ring, dx / (orbEl.clientWidth < 700 ? 16 : 22)); return; }
  const px = orbEl.clientWidth < 700 ? 9 : 12; odrag.vel = odrag.vel * .6 + (dy / px) / dt * 1000 * .4; odrag.acc += dy; while (Math.abs(odrag.acc) >= px) { turn(odrag.ring, Math.sign(odrag.acc)); odrag.acc -= Math.sign(odrag.acc) * px; } });
OR.domElement.addEventListener('pointerup', e => { optrs.delete(e.pointerId); if (odrag && odrag.btn) press(odrag.btn, performance.now() - odrag.t > 550); if (odrag && odrag.ring != null && odrag.lock === 'y' && Math.abs(odrag.vel) > 18 && performance.now() - odrag.t < 80) FLY[odrag.ring] = clamp(odrag.vel, -60, 60); odrag = null; });
OR.domElement.addEventListener('pointercancel', e => { optrs.delete(e.pointerId); odrag = null; });
OR.domElement.addEventListener('pointerleave', () => { S.hoverRing = -1; oledDirty = true; });
OR.domElement.addEventListener('wheel', e => { e.preventDefault(); const u = orbHit(e); if (!u) return; if (u.lens || u.grip || e.ctrlKey) { setSqueeze(S.stretch - e.deltaY * .002); return; } if (u.ring == null) return; if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) scrub(u.ring, -e.deltaX / 40); else turn(u.ring, e.deltaY < 0 ? 1 : -1); }, { passive: false });
// a phone shaken while the icing pen is picked clears the drawing, as the toy does
let shakeE = 0; addEventListener('devicemotion', e => { const a = e.accelerationIncludingGravity; if (!a) return; const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0); shakeE = shakeE * .9 + Math.max(0, m - 16); if (shakeE > 40) { shakeE = 0; if (S.pick === 'sketch') press('DEL'); else if (window.REMOTE) window.REMOTE({ k: 'press', b: 'DEL' }); } });
/* hands in the room: drag orbits, right-drag or two fingers pan, wheel or pinch zooms, a click picks */
const rptr = new Map(); let rdrag = null; const rray = new T.Raycaster(), rndc = new T.Vector2();
R.domElement.addEventListener('contextmenu', e => e.preventDefault());
R.domElement.addEventListener('pointerdown', e => { R.domElement.setPointerCapture(e.pointerId); rptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); rdrag = { pan: e.button === 2 || e.shiftKey, moved: 0 }; if (rptr.size === 2) { const [p, q] = [...rptr.values()]; rdrag = { two: true, d: Math.hypot(p.x - q.x, p.y - q.y), cx: (p.x + q.x) / 2, cy: (p.y + q.y) / 2, moved: 9 }; } });
R.domElement.addEventListener('pointermove', e => { if (!rptr.has(e.pointerId) || !rdrag) return; const pr = rptr.get(e.pointerId), dx = e.clientX - pr.x, dy = e.clientY - pr.y; rptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); const H = roomEl.clientHeight;
  if (rdrag.two && rptr.size === 2) { const [p, q] = [...rptr.values()], d = Math.hypot(p.x - q.x, p.y - q.y), cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2; viewBy(0, 0, Math.log(d / rdrag.d) * 1.4, (cx - rdrag.cx) / H, (cy - rdrag.cy) / H); rdrag.d = d; rdrag.cx = cx; rdrag.cy = cy; return; }
  rdrag.moved += Math.abs(dx) + Math.abs(dy); if (rdrag.moved < 4) return; if (rdrag.pan) viewBy(0, 0, 0, dx / H, dy / H); else viewBy(-dx * .008, dy * .005, 0); });
const rEnd = e => { rptr.delete(e.pointerId); if (rdrag && !rdrag.two && rdrag.moved < 4 && e.type === 'pointerup') clickPick(e); if (!rptr.size) rdrag = null; };
R.domElement.addEventListener('pointerup', rEnd); R.domElement.addEventListener('pointercancel', rEnd);
R.domElement.addEventListener('wheel', e => { e.preventDefault(); viewBy(0, 0, -e.deltaY * .0015); }, { passive: false });
function clickPick(e) { const r = R.domElement.getBoundingClientRect(); rndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); rray.setFromCamera(rndc, cam);
  const h = rray.intersectObjects([...CAKE.children, ...TABLE.children, ...ITEMG.children, keyMark], true).find(h => !h.object.material || !h.object.material.alphaTest || true); if (!h) return; let p = h.object;
  while (p) { if (p.userData && p.userData.item) return pickKey('i' + p.userData.item); if (p === keyMark) return pickKey('light'); if (p === TABLE) return pickKey('table'); if (p === SKETCHG) return pickKey('sketch');
    if (p.parent === CAKE && p.isGroup && p.userData.candle != null) { S.cWhich = CTYPES[DOC.candles.ctype][0] !== 'NUMBER' ? p.userData.candle + 1 : 0; return pickKey('candles'); } if (p.userData && p.userData.writing) return pickKey('writing'); if (p === CAKE) return pickKey('cake'); p = p.parent; } }
function pickKey(k) { if (S.mode === 'VIEW') S.mode = 'PLACE'; S.add = null; if (k !== S.pick) { S.pick = k; chime(); } S.retT = NOW; oledDirty = true; }
addEventListener('keydown', e => { const k = e.key; if (S.mode !== 'VIEW' && S.pick === 'writing' && DOC.writing && !e.metaKey && !e.ctrlKey) { const Wt = DOC.writing; if (k.length === 1) { snap(); Wt.text = Wt.text.slice(0, Wt.cur) + k.toUpperCase() + Wt.text.slice(Wt.cur); Wt.cur++; dirty.cake = true; S.retT = NOW; e.preventDefault(); return; } if (k === 'Backspace') { if (Wt.cur > 0) { snap(); Wt.text = Wt.text.slice(0, Wt.cur - 1) + Wt.text.slice(Wt.cur); Wt.cur--; dirty.cake = true; } e.preventDefault(); return; } if (k === 'Enter') { snap(); Wt.text = Wt.text.slice(0, Wt.cur) + '/' + Wt.text.slice(Wt.cur); Wt.cur++; dirty.cake = true; e.preventDefault(); return; } }
  if (k >= '1' && k <= '5') { S.lastRing = +k - 1; oledDirty = true; } else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); turn(Math.max(0, S.lastRing), k === 'ArrowUp' ? 1 : -1); } else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); scrub(Math.max(0, S.lastRing), k === 'ArrowRight' ? .25 : -.25); }
  else if (k === 'Tab' || k === 'm') { e.preventDefault(); press('MODE'); } else if (k === 'a') press('ADD'); else if (k === 'Delete' || k === 'Backspace' || k === 'x') press('DEL'); else if (k === 'z') press('UNDO', e.shiftKey); else if (k === 'p') PAIR.open(); else if (k === '[') setSqueeze(S.stretch - .1); else if (k === ']') setSqueeze(S.stretch + .1); });

/* =============================================================== THE DEVICE'S OWN SOUNDS: if cut/device-sounds.wav is present (clicks, ratchet, ticks, comb and whirr cut from the scene),
   the rings click with it, faster turns ratchet, presses tick; without it the synthesized clicks stay. Each ring is pitched a little differently. */
const DEVSPR = {"click": [[0.0, 0.065], [0.115, 0.065], [0.23, 0.065], [0.345, 0.065], [0.46, 0.065], [0.575, 0.065], [0.69, 0.065], [0.805, 0.065], [0.92, 0.065]], "ratchet": [[1.035, 0.05], [1.135, 0.05], [1.235, 0.05], [1.335, 0.05]], "tick": [[1.435, 0.04], [1.525, 0.04]], "comb": [[1.615, 0.37]], "whirr": [[2.035, 0.62]]}; let DEVBUF = null, lastRingT = [0, 0, 0, 0, 0];
fetch('cut/device-sounds.wav').then(r => r.ok ? r.arrayBuffer() : null).then(ab => { if (!ab) return; DEVBUF = ab; }).catch(() => { });
const tickSynth = tick;
tick = function (kind, i) { if (!DEVBUF || !(window.AudioContext || window.webkitAudioContext)) return tickSynth(kind, i);
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    if (DEVBUF instanceof ArrayBuffer) { const ab = DEVBUF; DEVBUF = 'decoding'; AC.decodeAudioData(ab, b => { DEVBUF = b; }, () => { DEVBUF = null; }); }
    if (!(DEVBUF instanceof AudioBuffer)) return tickSynth(kind, i);
    if (window.SNDLOG && kind !== 'press') window.SNDLOG.push({ t: NOW, k: kind, i: i || 0 });
    const now = performance.now(), fast = kind === 'ring' && now - (lastRingT[i || 0] || 0) < 70; if (kind === 'ring') lastRingT[i || 0] = now;
    const set = kind === 'ring' ? DEVSPR[fast ? 'ratchet' : 'click'] : kind === 'press' ? DEVSPR.tick : DEVSPR.click, [o, d] = set[Math.floor(Math.random() * set.length)];
    const n = AC.createBufferSource(); n.buffer = DEVBUF; n.playbackRate.value = kind === 'ring' ? 1 + ((i || 0) - 2) * .045 + (Math.random() - .5) * .03 : kind === 'dead' ? .7 : 1;
    const g = AC.createGain(); g.gain.value = kind === 'dead' ? .25 : kind === 'press' ? .7 : .9; n.connect(g).connect(AC.destination); n.start(0, o, d);
    if (kind === 'press') return tickSynth('press', i); } catch (e) { return tickSynth(kind, i); }
  if (navigator.vibrate) navigator.vibrate(kind === 'press' ? 14 : kind === 'dead' ? 3 : 6); };
/* =============================================================== THE DISPLAY */
let oledDirty = true; function wrapLines(x, t, w, n) { const out = []; let cur = ''; for (const word of String(t || '').split(' ')) { const tr = cur ? cur + ' ' + word : word; if (x.measureText(tr).width > w && cur) { out.push(cur); cur = word; } else cur = tr; } if (cur) out.push(cur); if (out.length > n) { out.length = n; out[n - 1] += '…'; } return out; }
function drawOLED() { const W = OLED.width, H = OLED.height, x = ox; x.fillStyle = '#020403'; x.fillRect(0, 0, W, H); const CY = '#5ff0dc', DIM = '#2e7a70', MID = '#8fe9dc';
  if (S.pairShow && !PHONE) { drawPairQR(x, W, H); oledTex.needsUpdate = true; return; }
  const FD = window.OLED_FEED; if (FD && FD.img && FD.img.width) { const im = FD.img, k = Math.max(W / im.width, H / im.height), w = im.width * k, h = im.height * k; x.globalAlpha = FD.a == null ? 1 : FD.a; x.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); x.globalAlpha = 1;
    x.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 1); if (FD.cap) { const g = x.createLinearGradient(0, H - 110, 0, H); g.addColorStop(0, 'rgba(2,4,3,0)'); g.addColorStop(1, 'rgba(2,4,3,.85)'); x.fillStyle = g; x.fillRect(0, H - 110, W, 110); x.textAlign = 'center'; x.fillStyle = '#f0d9a8'; x.font = '600 26px ui-monospace, Menlo, monospace'; x.fillText(FD.cap, W / 2, H - 30); }
    oledTex.needsUpdate = true; return; }
  const st = window.REMOTE_STATE, mode = PHONE ? (st ? st.mode : '') : S.add ? 'ADD' : S.mode, p = PHONE ? null : picked(), mc = '#' + (MODECOL[mode] || 0xf0b040).toString(16).padStart(6, '0');
  let what = PHONE ? (st && st.step) || '' : S.mode === 'VIEW' ? S.view.preset : p ? p.name : 'EMPTY'; if (S.add) { const sh = shelves()[S.add.s]; what = sh ? sh.n : ''; }
  x.textAlign = 'left'; x.font = '700 30px ui-monospace, Menlo, monospace'; x.fillStyle = mc; x.fillText(mode || '', 30, 64); x.fillStyle = DIM; x.font = '600 24px ui-monospace, Menlo, monospace'; x.fillText(S.gain >= 1.5 ? 'COARSE ×' + S.gain.toFixed(1) : S.gain <= .7 ? 'FINE ×' + S.gain.toFixed(2) : '', 200, 64);
  x.font = '700 64px ui-monospace, Menlo, monospace'; x.fillStyle = '#e8f6f2'; x.fillText(String(what).slice(0, 22), 30, 148);
  const RS = rings(), r = RS[S.lastRing] || (S.add ? RS[1] : null); if (r) { x.textAlign = 'right'; x.font = '600 26px ui-monospace, Menlo, monospace'; x.fillStyle = DIM; x.fillText(r.n, W - 30, 64); x.font = '700 60px ui-monospace, Menlo, monospace'; x.fillStyle = CY; x.fillText(String(r.f(r.v())).slice(0, 22), W - 30, 148); }
  x.textAlign = 'center'; x.font = '500 25px ui-monospace, Menlo, monospace'; x.fillStyle = MID;
  if (S.msg && NOW - S.msgT < 3.5) x.fillText(S.msg.slice(0, 74), W / 2, 280); else if (S.add) { const sh = shelves()[S.add.s], it = sh && sh.items[S.add.i]; if (it && it.from) { x.fillStyle = DIM; x.fillText(it.from.slice(0, 74), W / 2, 280); } } else if (!PHONE && !DOC.cake && !DOC.items.length) x.fillText('PRESS ADD', W / 2, 280); else if (!PHONE && DOC.title) { x.fillStyle = '#f0d9a8'; x.font = '600 26px ui-monospace, Menlo, monospace'; x.fillText(DOC.title, W / 2, 236); x.fillStyle = '#b9a98a'; x.font = 'italic 400 25px Georgia, serif'; wrapLines(x, DOC.line, W - 80, 2).forEach((l, i) => x.fillText(l, W / 2, 276 + i * 32)); }
  oledTex.needsUpdate = true; }
setInterval(() => { oledDirty = true; }, 500);

/* =============================================================== THE SIGHT: corner marks on the picked thing; beside it its name, where it came from, and its rings */
const infoSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); infoSVG.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;font-family:ui-monospace,Menlo,monospace'; roomEl.append(infoSVG);
const scr = v => { const p = v.clone().project(cam); return p.z > 1 ? null : [(p.x + 1) / 2 * roomEl.clientWidth, (1 - p.y) / 2 * roomEl.clientHeight]; };
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function boxOf(key) { const b = new T.Box3(); if (key === 'cake') CAKE.children.forEach(o => { if (!o.isGroup && !o.userData.writing && o !== penMark) b.expandByObject(o); }); else if (key === 'candles') CAKE.children.forEach(o => { if (o.isGroup && o.userData.candle != null && (S.cWhich === 0 || o.userData.candle === S.cWhich - 1)) b.expandByObject(o); });
  else if (key === 'writing') CAKE.children.forEach(o => { if (o.userData.writing) b.expandByObject(o); }); else if (key === 'sketch') { b.expandByObject(SKETCHG); b.expandByObject(penMark); } else if (key === 'table') b.expandByObject(TABLE.children[0] || TABLE);
  else if (key === 'light') b.setFromCenterAndSize(keyMark.position, new T.Vector3(.06, .06, .06)); else if (key && key[0] === 'i') { const o = ITEMG.children.find(m => 'i' + m.userData.item === key); if (o) b.expandByObject(o); } return b.isEmpty() ? null : b; }
function sceneBox() { const b = new T.Box3(); ['cake', 'table'].forEach(k => { const x = boxOf(k); if (x) b.union(x); }); ITEMG.children.forEach(o => { if (o.userData.plane !== 'BACK') b.expandByObject(o); }); return b.isEmpty() ? null : b; }
function updInfo() { if (PHONE || S.mode === 'VIEW' || !S.pick || S.add) { infoSVG.innerHTML = ''; return; } const b = boxOf(S.pick); if (!b) { infoSVG.innerHTML = ''; return; } const W = roomEl.clientWidth, H = roomEl.clientHeight;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let k = 0; k < 8; k++) { const p = scr(new T.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z)); if (!p) continue; x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  if (x1 < x0) { infoSVG.innerHTML = ''; return; } x0 -= 6; y0 -= 6; x1 += 6; y1 += 6; const act = NOW - S.retT < 3.5 || S.hoverRing >= 0, op = act ? 1 : .5, L = Math.max(6, Math.min(14, (x1 - x0) / 4, (y1 - y0) / 4)), col = '#d8e6e2', mc = '#' + MODECOL[S.mode].toString(16).padStart(6, '0');
  let o = `<g opacity="${op}" stroke="${col}" stroke-width="1.2" fill="none"><path d="M${x0} ${y0 + L}V${y0}H${x0 + L}M${x1 - L} ${y0}H${x1}V${y0 + L}M${x1} ${y1 - L}V${y1}H${x1 - L}M${x0 + L} ${y1}H${x0}V${y1 - L}"/></g>`;
  const RS = rings(), p = picked(), lines = RS.slice(1).filter(Boolean).map((r) => ({ t: r.n + '  ' + r.f(r.v()), hot: RS.indexOf(r) === S.lastRing || RS.indexOf(r) === S.hoverRing }));
  if (p && p.it && p.it.type === 'cut') { const e = CATBY[p.it.ref]; if (e) lines.unshift({ t: e.from.slice(0, 58), dim: true }); lines.unshift({ t: 'ON THE ' + p.it.plane, dim: true }); } else if (p && p.it) lines.unshift({ t: 'ON THE ' + p.it.plane, dim: true });
  if (S.pick === 'writing' && DOC.writing) { const Wt = DOC.writing, t = Wt.text; lines.unshift({ t: t.slice(0, Wt.cur) + '[' + (t[Wt.cur] || ' ') + ']' + t.slice(Wt.cur + 1) }); }
  const right = x1 + 220 < W || x0 < 230, tx = right ? x1 + 14 : x0 - 14, an = right ? 'start' : 'end', ty = clamp(y0 + 4, 16, H - lines.length * 15 - 24);
  o += `<path d="M${right ? x1 : x0} ${y0 + 4}H${tx + (right ? -4 : 4)}" stroke="${col}" stroke-width="1" opacity="${op * .6}"/><text x="${tx}" y="${ty + 4}" text-anchor="${an}" fill="${mc}" font-size="11" letter-spacing="1.5" opacity="${op}" paint-order="stroke" stroke="#000" stroke-width="3">${esc(S.mode + ' · ' + (p ? p.name : ''))}</text>`;
  lines.forEach((l, i) => { o += `<text x="${tx}" y="${ty + 20 + i * 15}" text-anchor="${an}" fill="${l.hot ? '#ffffff' : l.dim ? '#6f8a84' : '#a9c4bd'}" font-size="${l.hot ? 12 : 11}" font-weight="${l.hot ? 700 : 400}" opacity="${l.hot ? 1 : op}" paint-order="stroke" stroke="#000" stroke-width="3">${esc(l.t)}</text>`; });
  // the plane the thing stands on, while it is being placed
  if (act && S.mode === 'PLACE' && p && p.it) { const pl = p.it.plane, y = pl === 'FLOOR' ? 0 : pl === 'BACK' ? null : TOP; if (y != null) { const c = b.getCenter(new T.Vector3()), r = pl === 'FLOOR' ? .5 : .25, pts = [];
      for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU, q = scr(new T.Vector3(c.x + Math.cos(a) * r, (pl === 'AIR' ? c.y : y) + .001, c.z + Math.sin(a) * r)); if (q) pts.push(q[0].toFixed(1) + ' ' + q[1].toFixed(1)); }
      if (pts.length > 2) o += `<path d="M${pts.join('L')}" fill="none" stroke="${mc}" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>`; } }
  infoSVG.innerHTML = o; }

/* =============================================================== THE ROOM: items rebuilt from the document; a ghost of what ADD will put in */
const ITEMM = {}; let ghostDirty = true; const GHOST = new T.Group(); MEM.add(GHOST);
function placeItem(m, it, dt) { const e = it.type === 'cut' ? CATBY[it.ref] : null, pl = it.plane, y = pl === 'FLOOR' ? 0 : TOP;
  if (e) { const hh = e.h * it.size, ww = hh * e.fw / e.fh; m.scale.set(ww * (it.mirror ? -1 : 1), hh, 1); const lift = (e.lift || 0) * it.size, feet = 1 - (e.feet == null ? 1 : e.feet);
    if (pl === 'FLAT') { m.position.set(it.x, TOP + .002, it.z); m.rotation.set(-Math.PI / 2, 0, it.turn * Math.PI / 180); return; }
    if (pl === 'BACK') { m.position.set(it.x, it.up + hh / 2, it.z); m.rotation.set(0, 0, 0); return; }
    bendCard(m, it.curl || 0); m.material.emissiveIntensity = it.glow == null ? .14 : it.glow;
    m.position.set(it.x, (pl === 'AIR' ? TOP + it.up : y + lift) + hh / 2 - feet * hh, it.z); m.updateMatrixWorld(true); const wp = m.getWorldPosition(new T.Vector3());
    if (it.fixed) m.rotation.set(0, 0, 0); else m.lookAt(cam.position.x, wp.y, cam.position.z); m.rotateY(it.turn * Math.PI / 180);
    if (it.lean) { const b = hh / 2 - feet * hh; m.translateY(-b); m.rotateX(-it.lean * Math.PI / 180); m.translateY(b); } return; }
  m.scale.set(it.size * (it.wide || 1), it.size * (it.tall || 1), it.size * (it.wide || 1)); m.rotation.set(0, it.turn * Math.PI / 180, (it.lean || 0) * Math.PI / 180, 'YXZ'); if (pl === 'AIR') m.position.set(it.x, TOP + it.up + (it.ref === 'BALLOON' ? .45 : 0) + Math.sin(NOW * .8 + it.id) * .006, it.z); else if (pl === 'BACK') m.position.set(it.x, it.up, it.z); else m.position.set(it.x, y, it.z); }
function syncItems(dt) { const ids = new Set(DOC.items.map(it => it.id)); for (const id in ITEMM) if (!ids.has(+id) || dirty.items && ITEMM[id].userData.rebuild) { ITEMG.remove(ITEMM[id]); delete ITEMM[id]; }
  DOC.items.forEach(it => { let m = ITEMM[it.id]; const sig = it.type + it.ref + (it.color || 0); if (m && m.userData.sig !== sig) { ITEMG.remove(m); m = null; }
    if (!m) { m = it.type === 'cut' ? cutMesh(it) : propMesh(it); if (!m) return; m.userData.item = it.id; m.userData.sig = sig; m.traverse(o => o.userData.item = it.id); ITEMM[it.id] = m; ITEMG.add(m); }
    m.userData.plane = it.plane; placeItem(m, it, dt);
    if (it.type === 'cut' && m.userData.cut) { const e = m.userData.cut, sp = [0, 1, .5, 2, 1][it.play], t = S.playT * e.fps * sp; let f = it.play === 0 ? it.frame : Math.floor(t + it.id * 7);
      if (it.play === 4) { const L2 = Math.max(1, (e.frames - 1) * 2); f = Math.floor(t) % L2; if (f >= e.frames) f = L2 - f; } setFrame(m, f); } }); dirty.items = false; }
function updGhost() { if (!ghostDirty) return; ghostDirty = false; GHOST.clear(); if (!S.add) return; const sh = shelves()[S.add.s], x = sh && sh.items[S.add.i]; if (!x) return; const [k, r] = x.key.split(':');
  if (k === 'prop' || k === 'cut') { const it = { id: 0, type: k === 'prop' ? 'prop' : 'cut', ref: r, x: 0, z: 0, up: .3, turn: 0, size: 1, color: 0, mirror: 0, plane: k === 'prop' ? PROPS[r] : ((CATBY[r] || {}).plane || 'table').toUpperCase() };
    const n = DOC.items.length, a = Math.PI + (n % 7 - 3) * .32; if (it.plane === 'FLOOR') { it.x = Math.sin(a) * 1.0; it.z = Math.cos(a) * 1.0 - .2; } else if (it.plane === 'TABLE' || it.plane === 'FLAT') { const r0 = k === 'prop' ? .28 : .5; it.x = Math.sin(a + (k === 'prop' ? 2 : 0)) * r0; it.z = Math.cos(a + (k === 'prop' ? 2 : 0)) * r0; } else { it.up = .35; }
    const m = k === 'prop' ? propMesh(it) : cutMesh(it); if (!m) return; m.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .45; o.material.depthWrite = false; } }); m.userData.ghost = it; GHOST.add(m); } }
function apply(dt) { const cd = DOC.candles;
  if (dirty.cake) { buildCake(DOC.cake ? Object.assign({}, DOC.cake, { candles: cd ? cd.n : 0, out: cd && !cd.lit ? cd.n : 0, spread: cd ? cd.spread : 1, clen: cd ? cd.len : 1, ctype: cd ? cd.ctype || 0 : 0, per: cd ? cd.per : {}, writing: DOC.writing, sketch: DOC.sketch }) : null); dirty.cake = false; }
  if (dirty.table) { buildTable(DOC.table); dirty.table = false; dirty.mess = true; } if (dirty.mess) { buildMess(DOC.room.mess, DOC.table ? DOC.table.w : 0); dirty.mess = false; }
  if (DOC.table) { DOC.table.k = Math.min(1, (DOC.table.k || 0) + dt * 1.5); tableMat.opacity = legMat.opacity = DOC.table.k; tableMat.transparent = legMat.transparent = DOC.table.k < 1; }
  syncItems(dt); updGhost(); GHOST.children.forEach(m => { const it = m.userData.ghost; if (it) placeItem(m, it, dt); });
  const Lt = DOC.light, cw = new T.Vector3(0, TOP + .05, 0), la = Lt.a * Math.PI / 180;
  key.position.set(Math.sin(la) * .95, cw.y + Lt.h, Math.cos(la) * .95); key.target.position.copy(cw); key.color.setRGB(lerp(.72, 1, Lt.warm), lerp(.82, .72, Lt.warm), lerp(1, .45, Lt.warm)); key.intensity = Lt.k;
  keyMark.position.copy(key.position); keyMark.visible = keyLine.visible = S.mode !== 'VIEW' && S.pick === 'light' && !FILM; keyLine.geometry.setFromPoints([key.position, cw]);
  const lit = FLAMES.filter(f => !f.userData.sparkle).length; candleLight.position.set(0, cw.y + .15, 0); candleLight.intensity = lit ? (.25 + Math.min(lit, 12) * .12) * (.94 + Math.sin(NOW * 21) * .04 + Math.sin(NOW * 7) * .03) : 0;
  FLAMES.forEach((f, i) => { if (f.userData.sparkle) { const k = .7 + Math.random() * .6; f.scale.set(.05 * k, .05 * k, 1); f.material.rotation = Math.random() * TAU; return; } const k = 1 + Math.sin(NOW * 13 + i * 1.7) * .06 + Math.sin(NOW * 31 + i) * .04; f.scale.set(.016 * k, .034 * (2 - k), 1); });
  grade.uniforms.mist.value = DOC.room.mist; grade.uniforms.era.value = DOC.room.era || 0; buildPlace(DOC.room.place); scene.fog.density = .028 + DOC.room.mist * .09; }
function placeCam(dt) { const V = S.view, P = VIEWS[V.preset], eye = (P && P.eye) || (V.preset === 'FREE' && V.eyeHold), k = Math.min(1, (dt || 1) * 6); if (P && P.fly) V.yaw += (dt || 0) * .22;
  let bc = new T.Vector3(0, TOP + .07, 0); if (!eye) { const b = sceneBox(); if (b) bc = b.getCenter(new T.Vector3()); } const tgt = (eye ? new T.Vector3(0, .69, 0) : bc).add(V.pan); if (P && P.fly) tgt.y += Math.sin(NOW * .5) * .05;
  CAM.yaw += (((V.yaw - CAM.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI) * k; CAM.pitch += (V.pitch - CAM.pitch) * k; CAM.dist += (V.dist - CAM.dist) * k; CAM.fov += (V.fov - CAM.fov) * k; CAM.tgt.lerp(tgt, k);
  cam.position.set(CAM.tgt.x + Math.sin(CAM.yaw) * Math.cos(CAM.pitch) * CAM.dist, CAM.tgt.y + Math.sin(CAM.pitch) * CAM.dist, CAM.tgt.z + Math.cos(CAM.yaw) * Math.cos(CAM.pitch) * CAM.dist); cam.lookAt(CAM.tgt);
  if (Math.abs(cam.fov - CAM.fov) > .01) { cam.fov = CAM.fov; cam.updateProjectionMatrix(); } }
function resize() { const w = Math.max(2, roomEl.clientWidth), h = Math.max(2, roomEl.clientHeight); R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); const pr = R.getPixelRatio(); rt.setSize(Math.round(w * pr), Math.round(h * pr)); grade.uniforms.px.value.set(1 / (w * pr), 1 / (h * pr)); fitOrb(); }
addEventListener('resize', resize);
function update(dt) { NOW += dt; S.playT += dt; MU.uTime.value = NOW;
  for (let i = 0; i < 5; i++) if (FLY[i]) { FLY[i] *= Math.pow(.18, dt); scrubAcc[i] += FLY[i] * dt; while (Math.abs(scrubAcc[i]) >= 1) { turn(i, Math.sign(scrubAcc[i])); scrubAcc[i] -= Math.sign(scrubAcc[i]); } if (Math.abs(FLY[i]) < 2) FLY[i] = 0; }
  apply(dt); placeCam(dt); updInfo();
  RINGS.forEach((r, i) => { r.ang += (r.target - r.ang) * Math.min(1, dt * 18); r.g.rotation.x = r.ang; const on = !!rings()[i]; r.lit.visible = on; r.lit.material.color.setHex(i === S.lastRing ? 0xffffff : i === 0 ? 0xb07a20 : (MODECOL[S.add ? 'STYLE' : S.mode] || 0x2fae9f)); });
  const can = { PAIR: true, MODE: true, UNDO: UNDO.length > 0 || !!S.add, ADD: true, DEL: !!S.add || (!!picked() && S.pick !== 'light' && S.pick !== 'room'), KEEP: !!DOC.cake || DOC.items.length > 0 };
  for (const k in BTN) { const b = BTN[k]; if (odrag && odrag.btn === k) b.down = 1; else b.down = Math.max(0, b.down - dt * 6); b.cap.position.z = b.z0 - b.down * .008; b.lab.material.opacity = can[k] ? 1 : .25; }
  orbPitchV += ((.18 - ORB.rotation.x) * 42 - orbPitchV * 9) * dt; ORB.rotation.x += orbPitchV * dt; ORB.userData.iris.material.opacity = .55 + .35 * (.5 + .5 * Math.sin(NOW * 1.6));
  drawDialLabels(); if (oledDirty || window.OLED_FEED || (S.msg && NOW - S.msgT < 3.6)) { drawOLED(); oledDirty = false; } }
function render() { if (!PHONE) { grade.uniforms.gt.value = (NOW * 37.1) % 100; R.setRenderTarget(rt); R.render(scene, cam); R.setRenderTarget(null); R.render(gQ, gC); } OR.render(OS, OC); }
let last = performance.now(), auto = true;
function loop(now) { if (!auto) return; const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(loop); }
resize(); requestAnimationFrame(loop);
window.FORGE = { S, get DOC() { return DOC; }, get CAT() { return CAT; }, turn, scrub, press, viewBy, setView, setSqueeze, rings, things, shelves, pickKey, now: () => NOW, flames: () => FLAMES.length, manual() { auto = false; }, advance(dt) { update(dt); render(); }, step(dt) { update(dt); }, PAIR, touch() { for (const d in dirty) dirty[d] = true; } };
