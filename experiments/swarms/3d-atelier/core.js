/* core.js — SCION 49 OPEN-CONTENT ATELIER: the reservoir (rights-aware), the device's rings and machine, the making timeline,
   the layout the candles stand on, and the match toward the film's cakes. No three.js, no DOM: the page renders it, node tests it. */
(function (root, factory) { const m = factory(); if (typeof module === 'object' && module.exports) module.exports = m; else root.Atelier = m; })(this, function () {
'use strict';
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ============================================================ RIGHTS CHECKS actually run on 2026-11-06, quoted in every record */
const CHECKS = {
  'si-3d-api': 'WebFetch https://3d-api.si.edu/api/v1.0/content/file/search?q=vessel|plate|candlestick&file_type=glb (2026-11-06): lists 3d_package ids and .glb URLs; fields are title, usage (Web3D/App3D/Download3D), quality, uri, file_type, model_url, file_size. No rights, licence or CC0 field. The q parameter did not filter (same 7 objects for every query, rowCount 1050).',
  'si-open-access': 'WebFetch https://api.si.edu/openaccess/api/v1.0/search with api_key=DEMO_KEY, q=cake, q=fangyi, q="3d_package", q=online_media_type:"3D Images" (2026-11-06): rowCount 0 for every query, so no metadata_usage.access (CC0) value could be read for any record.',
  'si-3d-page': 'WebFetch https://3d.si.edu/explore?edan_q=bowl and the art_design category search (2026-11-06): not fetched, permission request unanswered.',
  'proxy': 'curl from the build sandbox (2026-11-06): CONNECT refused (403) by the egress proxy for 3d-api.si.edu, cdn.3d-api.si.edu, api.si.edu, 3d.si.edu, ids.si.edu, smithsonian-open-access S3, api.getty.edu, media.getty.edu, data.getty.edu. No .glb and no image could be downloaded.',
  'github-mirror': 'git clone (blobs filtered) of github.com/Smithsonian/dpo-voyager and github.com/Smithsonian/OpenAccess (2026-11-06): no .glb models in Voyager; OpenAccess holds only a README (metadata moved to S3, which is refused).'
};
const UNVERIFIED = { status: 'UNVERIFIED', cc0: false, checks: ['si-3d-api', 'si-open-access', 'si-3d-page', 'proxy'], publish: 'the archive file is blocked from the repo and from publishing until CC0 is read on its own record; the stage uses the stand-in only' };
const WANTED = { status: 'NOT FOUND', cc0: false, checks: ['si-3d-api', 'si-open-access', 'proxy'], publish: 'no archive record located; nothing to publish but the stand-in' };
const PKG = id => 'https://3d-api.si.edu/content/document/3d_package:' + id + '/';
const ARCHIVE = {
  colonoware: { institution: 'Smithsonian Institution (3D Digitization)', institution_id: '3d_package:79da3e3f-3ad7-41de-8956-e891d88a3c5f', title: 'Colonoware pot from Cooper River, Charleston County, SC', uri: PKG('79da3e3f-3ad7-41de-8956-e891d88a3c5f'),
    media_url: PKG('79da3e3f-3ad7-41de-8956-e891d88a3c5f') + '2017_108_1_1-ColonoPottery_BlurMasked-Filtered_RENDER-20k-thumb.glb', accession_inferred: '2017.108.1.1 (read from the file name, not from a record)' },
  boshanlu: { institution: 'Smithsonian Institution (3D Digitization)', institution_id: '3d_package:ce850625-2cf1-4c6f-9086-0d5845d9a664', title: 'Lidded incense burner (xianglu) with geometric decoration and narrative scenes', uri: PKG('ce850625-2cf1-4c6f-9086-0d5845d9a664'),
    media_url: PKG('ce850625-2cf1-4c6f-9086-0d5845d9a664') + 'incense-burner-in-the-form-of-a-mountain-(boshanlu)-20k-512-thumb.glb', accession_inferred: null },
  fangyi: { institution: 'Smithsonian Institution (3D Digitization)', institution_id: '3d_package:d8c62f94-4ebc-11ea-b77f-2e728ce88125', title: 'Ritual wine container (fangyi) with masks (taotie), serpents, and birds', uri: PKG('d8c62f94-4ebc-11ea-b77f-2e728ce88125'),
    media_url: PKG('d8c62f94-4ebc-11ea-b77f-2e728ce88125') + 'f1930_54-part_01-smartscan-fixed-textured-20k-512-thumb.glb', accession_inferred: 'F1930.54 (read from the file name, not from a record)' },
  gong: { institution: 'Smithsonian Institution (3D Digitization)', institution_id: '3d_package:d8c646aa-4ebc-11ea-b77f-2e728ce88125', title: 'Ritual wine ewer (gong) with masks (taotie), dragons, and real animals', uri: PKG('d8c646aa-4ebc-11ea-b77f-2e728ce88125'),
    media_url: 'https://cdn.3d-api.si.edu/d8c646aa-4ebc-11ea-b77f-2e728ce88125/f1961_33-part_01-laser-ortery_texture-20k-512-thumb.glb', accession_inferred: 'F1961.33 (read from the file name, not from a record)' }
};
const wanted = (query, inst) => ({ institution: inst || 'Smithsonian Institution or Getty (wanted)', institution_id: null, title: null, uri: null, media_url: null, query });
const STANDIN = what => ({ kind: 'procedural stand-in', what, licence: 'original geometry written in this folder (render.js); contains no third-party data' });

/* ============================================================ THE RESERVOIR: slot, institutional description, animator tags, stand-in form */
const RESERVOIR = [
  { id: 'STAND-BOSHANLU-FOOT', slot: 'STAND', label: 'BRONZE FOOT', form: { type: 'pedestal', h: .085, r: .17, mat: 'bronze' }, source: ARCHIVE.boshanlu, rights: UNVERIFIED,
    stage_asset: STANDIN('lathe profile of a flared pedestal foot, stem and shallow dish, approximating the foot of a boshanlu; not derived from the scan'), crop: 'foot and stem only, below the bowl', tags: ['carries', 'rises', 'rings'] },
  { id: 'STAND-FANGYI-FOOTRING', slot: 'STAND', label: 'SQUARE FOOTRING', form: { type: 'square', h: .06, r: .18, mat: 'bronze' }, source: ARCHIVE.fangyi, rights: UNVERIFIED,
    stage_asset: STANDIN('four-sided footring and slab, approximating the footring of a fangyi; not derived from the scan'), crop: 'footring only', tags: ['carries', 'resists', 'squares'] },
  { id: 'STAND-GLASS-WANTED', slot: 'STAND', label: 'GLASS CAKE STAND', form: { type: 'glass', h: .1, r: .17, mat: 'glass' }, source: wanted('pressed glass cake stand, 19th-20th c.'), rights: WANTED,
    stage_asset: STANDIN('lathe profile of a footed glass cake stand'), crop: 'whole object', tags: ['carries', 'shows-through', 'rings'] },
  { id: 'PLATE-COLONOWARE-BASE', slot: 'PLATE', label: 'EARTHENWARE DISH', form: { type: 'dish', r: .155, mat: 'earth' }, source: ARCHIVE.colonoware, rights: UNVERIFIED,
    stage_asset: STANDIN('low burnished dish with an uneven rim, approximating the lower body of the colonoware pot cut off below the shoulder; not derived from the scan'), crop: 'lower 18 percent of the body', tags: ['holds', 'wears', 'uneven'] },
  { id: 'PLATE-PORCELAIN-WANTED', slot: 'PLATE', label: 'PORCELAIN PLATE', form: { type: 'plate', r: .16, mat: 'porcelain' }, source: wanted('porcelain dessert plate with a blue rim band'), rights: WANTED,
    stage_asset: STANDIN('flat plate with a rim band'), crop: 'whole object', tags: ['holds', 'rings', 'shines'] },
  { id: 'PLATE-PEWTER-WANTED', slot: 'PLATE', label: 'PEWTER CHARGER', form: { type: 'plate', r: .175, mat: 'pewter' }, source: wanted('pewter charger'), rights: WANTED,
    stage_asset: STANDIN('wide flat charger'), crop: 'whole object', tags: ['holds', 'dulls', 'rings'] },
  { id: 'MOULD-TIN-WANTED', slot: 'MOULD', label: 'ROUND TIN', form: { type: 'drum', mat: 'tin' }, source: wanted('tinned iron cake tin'), rights: WANTED,
    stage_asset: STANDIN('open cylinder tin; the cake it leaves is a drum'), crop: 'whole object', tags: ['shapes', 'releases', 'rings'] },
  { id: 'MOULD-COLONOWARE-DOME', slot: 'MOULD', label: 'POT, UPSIDE DOWN', form: { type: 'dome', mat: 'earth' }, source: ARCHIVE.colonoware, rights: UNVERIFIED,
    stage_asset: STANDIN('round-bodied pot turned mouth-down over the plate; the cake it leaves is a dome; approximates the colonoware body; not derived from the scan'), crop: 'body, inverted', tags: ['shapes', 'covers', 'domes'] },
  { id: 'MOULD-FANGYI-BODY', slot: 'MOULD', label: 'SQUARE BRONZE BODY', form: { type: 'square', mat: 'bronze' }, source: ARCHIVE.fangyi, rights: UNVERIFIED,
    stage_asset: STANDIN('four-sided open box with flanges, approximating the fangyi body without its roof lid; not derived from the scan'), crop: 'body without lid, upside down', tags: ['shapes', 'squares', 'resists'] },
  { id: 'MOULD-COPPER-RING-WANTED', slot: 'MOULD', label: 'COPPER RING MOULD', form: { type: 'ring', mat: 'copper' }, source: wanted('copper jelly or ring mould'), rights: WANTED,
    stage_asset: STANDIN('fluted ring mould; the cake it leaves has a hole and flutes'), crop: 'whole object', tags: ['shapes', 'flutes', 'opens'] },
  { id: 'DECO-CHOC-ORANGE', slot: 'DECORATION', label: 'CHOCOLATE, ORANGE TOP', form: { side: 0x3b2014, top: 0xd9782c, beads: 'many' }, source: { institution: 'film reference (numbers only)', institution_id: null, title: 'palette read from the film, cake 1', uri: null, media_url: null }, rights: { status: 'DERIVED NUMBERS', cc0: false, checks: [], publish: 'three colour numbers; no film pixels' },
    stage_asset: STANDIN('icing colours and beads'), crop: 'colour numbers', tags: ['coats', 'beads'] },
  { id: 'DECO-MINT', slot: 'DECORATION', label: 'MINT', form: { side: 0x8fd0bd, top: 0xc5ecdf, beads: 'many' }, source: { institution: 'film reference (numbers only)', institution_id: null, title: 'palette read from the film, cake 2', uri: null, media_url: null }, rights: { status: 'DERIVED NUMBERS', cc0: false, checks: [], publish: 'three colour numbers; no film pixels' },
    stage_asset: STANDIN('icing colours and beads'), crop: 'colour numbers', tags: ['coats', 'beads'] },
  { id: 'DECO-RED-ORANGE', slot: 'DECORATION', label: 'RED-ORANGE', form: { side: 0xb3412a, top: 0xe46c3c, beads: 'many' }, source: { institution: 'film reference (numbers only)', institution_id: null, title: 'palette read from the film, cake 3', uri: null, media_url: null }, rights: { status: 'DERIVED NUMBERS', cc0: false, checks: [], publish: 'three colour numbers; no film pixels' },
    stage_asset: STANDIN('icing colours and beads'), crop: 'colour numbers', tags: ['coats', 'beads'] },
  { id: 'DECO-BROWN-GLAZE', slot: 'DECORATION', label: 'BROWN GLAZE', form: { side: 0x6a4326, top: 0x7d5230, beads: 'none' }, source: { institution: 'film reference (numbers only)', institution_id: null, title: 'palette read from the film, cake 4 (the dome)', uri: null, media_url: null }, rights: { status: 'DERIVED NUMBERS', cc0: false, checks: [], publish: 'three colour numbers; no film pixels' },
    stage_asset: STANDIN('glaze colours'), crop: 'colour numbers', tags: ['coats', 'drips'] },
  { id: 'DECO-SPONGE-WHITE', slot: 'DECORATION', label: 'SPONGE, WHITE BEADS', form: { side: 0xe2c286, top: 0xf1dca9, beads: 'white' }, source: { institution: 'film reference (numbers only)', institution_id: null, title: 'palette read from the film, cake 5', uri: null, media_url: null }, rights: { status: 'DERIVED NUMBERS', cc0: false, checks: [], publish: 'three colour numbers; no film pixels' },
    stage_asset: STANDIN('icing colours and white beads'), crop: 'colour numbers', tags: ['coats', 'beads'] },
  { id: 'HOLDER-BRASS-WANTED', slot: 'CANDLES', label: 'BRASS CUPS', form: { type: 'cup', mat: 'brass' }, source: wanted('brass candle cups or a candlestick'), rights: WANTED,
    stage_asset: STANDIN('small brass cup under each candle'), crop: 'cup only', tags: ['holds-up', 'shines'] },
  { id: 'HOLDER-FANGYI-FINIAL', slot: 'CANDLES', label: 'ROOF FINIALS', form: { type: 'roof', mat: 'bronze' }, source: ARCHIVE.fangyi, rights: UNVERIFIED,
    stage_asset: STANDIN('small hipped-roof cap under each candle, approximating the fangyi lid finial at 1/8 size; not derived from the scan'), crop: 'lid finial only', tags: ['holds-up', 'crowns'] },
  { id: 'HOLDER-PINS', slot: 'CANDLES', label: 'BARE PINS', form: { type: 'pin', mat: 'none' }, source: { institution: 'none', institution_id: null, title: 'no holder', uri: null, media_url: null }, rights: { status: 'NONE NEEDED', cc0: false, checks: [], publish: 'nothing' },
    stage_asset: STANDIN('candles pushed straight into the icing'), crop: '-', tags: ['holds-up'] }
];
const NOT_USED = [{ source: ARCHIVE.gong, rights: UNVERIFIED, why: 'found in the 3D listing; no slot fits a ewer; kept on file' },
  { source: wanted('table, open content image or 3D', 'Getty Open Content / Smithsonian'), rights: WANTED, why: 'the table is the memory hex table (procedural)' },
  { source: wanted('Getty open-content images for textures (still lifes with cakes, porcelain)', 'J. Paul Getty Museum'), rights: { status: 'NOT REACHED', cc0: false, checks: ['proxy'], publish: 'no image fetched' }, why: 'api.getty.edu, media.getty.edu and data.getty.edu are refused by the proxy' }];
const SLOTS = ['STAND', 'PLATE', 'MOULD', 'DECORATION', 'CANDLES'];
const TARGETS = ['STAND', 'PLATE', 'MOULD', 'DECORATION', 'INSCRIPTION', 'CANDLES', 'LIGHT'];
const ITEMS = s => RESERVOIR.filter(r => r.slot === s);
const NEEDS = { STAND: null, PLATE: 'STAND', MOULD: 'PLATE', DECORATION: 'MOULD', INSCRIPTION: 'DECORATION', CANDLES: 'INSCRIPTION', LIGHT: 'CANDLES' };
const WSTEPS = 24;

/* ============================================================ THE FILM'S CAKES the evolution heads toward */
const REFS = [
  { name: 'CHOCOLATE, ORANGE TOP', form: 'drum', side: 0x3b2014, top: 0xd9782c, beads: 'many' }, { name: 'MINT', form: 'drum', side: 0x8fd0bd, top: 0xc5ecdf, beads: 'many' },
  { name: 'RED-ORANGE', form: 'drum', side: 0xb3412a, top: 0xe46c3c, beads: 'many' }, { name: 'BROWN DOME', form: 'dome', side: 0x6a4326, top: 0x7d5230, beads: 'none' },
  { name: 'SPONGE, WHITE BEADS', form: 'drum', side: 0xe2c286, top: 0xf1dca9, beads: 'white' }];
const rgb = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const cdist = (a, b) => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) / 441.7; };
function match(G) { const ref = REFS[G.ref % REFS.length], m = G.placed.MOULD, d = G.placed.DECORATION; let s = 0;
  if (m) s += .3 * (byId(m.id).form.type === ref.form ? 1 : byId(m.id).form.type === 'drum' || ref.form === 'drum' ? .25 : .5);
  if (d) { const f = byId(d.id).form; s += .25 * (1 - cdist(f.side, ref.side)) + .25 * (1 - cdist(f.top, ref.top)) + .1 * (f.beads === ref.beads ? 1 : f.beads === 'none' || ref.beads === 'none' ? 0 : .5); }
  if (G.ins >= WSTEPS) s += .05; if (G.make.holders >= 7) s += .05; return Math.round(s * 1000) / 1000; }
const byId = id => RESERVOIR.find(r => r.id === id);

/* ============================================================ LAYOUT: what stands on what; the candles' plane depends only on stand and plate */
const TABLE_TOP = .5, CAKE_H = .1, CAKE_R = .12;
const CANDLE_XZ = Array.from({ length: 7 }, (_, k) => { const a = k / 7 * TAU + .3, r = k % 2 ? .052 : .088; return [Math.cos(a) * r, Math.sin(a) * r]; });
function sizeOf(p) { return p ? 1 + .04 * p.tri : 1; }
function layout(G) { const st = G.placed.STAND, pl = G.placed.PLATE; const standTop = TABLE_TOP + (st ? byId(st.id).form.h * sizeOf(st) : 0);
  const plateTop = standTop + (pl ? .012 * sizeOf(pl) : 0); const candleBase = plateTop + CAKE_H;
  return { tableTop: TABLE_TOP, standTop, plateTop, cakeBase: plateTop, candleBase, candles: CANDLE_XZ.map(([x, z]) => [x, candleBase, z]) }; }
// the height of each cake form's top surface at radius r (from the centre); all are CAKE_H at the candle ring within 3 mm
function surface(type, r) { if (type === 'dome') return .106 * Math.pow(Math.max(0, 1 - Math.pow(r / CAKE_R, 4)), .25); if (type === 'ring' && r < .03) return 0; return CAKE_H; }

/* ============================================================ THE GAME */
function create(opts) { opts = opts || {};
  const G = { t: 0, target: 0, ref: opts.ref || 0, gen: 1, yaw: 0, tilt: 0, ins: 0, phase: 'build', hold: false, offAt: 0,
    preview: Object.fromEntries(SLOTS.map(s => [s, { id: ITEMS(s)[0].id, idx: 0, tri: 0 }])), placed: Object.fromEntries(SLOTS.map(s => [s, null])),
    make: blankMake(), op: null, log: [], history: [], arcMark: 0, flash: 0, decay: 0, stepClock: 0, steps: [],
    rings: [{ id: 'scale', ang: 0, target: 0, applied: 0, deg: 5, min: -36, max: 36, ix: 0 }, { id: 'knurl', ang: 0, target: 0, applied: 0, deg: 9, ix: 1 }, { id: 'tri', ang: 0, target: 0, applied: 0, deg: 6, ix: 2 }] };
  return G; }
function blankMake() { return { stand: 0, plate: 0, mouldIn: 0, batter: 0, bake: 0, lift: 0, icing: 0, topDisc: 0, beads: 0, holders: 0, lit: 0, out: 0, blowing: 0 }; }
function ev(G, k, extra) { const e = Object.assign({ t: +G.t.toFixed(4), k }, extra || {}); G.log.push(e); return e; }
const tname = G => TARGETS[G.target];
function knurlRange(G) { const t = tname(G); return SLOTS.includes(t) ? [0, ITEMS(t).length - 1] : t === 'INSCRIPTION' ? [0, WSTEPS] : [0, 0]; }
function triRange(G) { const t = tname(G); return SLOTS.includes(t) ? [-4, 4] : t === 'INSCRIPTION' ? [-2, 8] : [0, 0]; }
function knurlValue(G) { const t = tname(G); return SLOTS.includes(t) ? G.preview[t].idx : t === 'INSCRIPTION' ? G.ins : 0; }
function triValue(G) { const t = tname(G); return SLOTS.includes(t) ? G.preview[t].tri : t === 'INSCRIPTION' ? G.tilt : 0; }
function select(G, i, silent) { G.target = ((i % TARGETS.length) + TARGETS.length) % TARGETS.length; const k = G.rings[1], r = G.rings[2];
  k.target = k.applied = knurlValue(G); k.ang = k.target * k.deg; r.target = r.applied = triValue(G); r.ang = r.target * r.deg; if (!silent) ev(G, 'select', { target: tname(G) }); }
function handTurn(G, ringId, dDeg) { const ring = G.rings.find(r => r.id === ringId), lim = ring.id === 'knurl' ? knurlRange(G) : ring.id === 'tri' ? triRange(G) : [ring.min, ring.max];
  const before = Math.round(ring.ang / ring.deg); ring.ang = clamp(ring.ang + dDeg, lim[0] * ring.deg, lim[1] * ring.deg); const after = Math.round(ring.ang / ring.deg);
  if (after !== before) { ev(G, 'hand', { ring: ring.id }); ring.target = clamp(after, lim[0], lim[1]); } }
// the machine: one detent per step on every busy ring, at 11.8 steps/s, 23.6 when far (> 6 detents) behind
function machine(G, dt) { G.stepClock += dt; const busy = G.rings.filter(r => r.target !== r.applied); if (!busy.length) { G.stepClock = 0; return; }
  const fast = busy.some(r => Math.abs(r.target - r.applied) > 6), period = fast ? 1 / 23.6 : 1 / 11.8;
  while (G.stepClock >= period) { G.stepClock -= period; busy.forEach(r => { if (r.target === r.applied) return; r.applied += Math.sign(r.target - r.applied); G.steps.push([+G.t.toFixed(4), r.id, fast ? 1 : 0]); ev(G, 'click', { ring: r.id, fast }); applyStep(G, r); }); } }
function applyStep(G, r) { const t = tname(G);
  if (r.id === 'scale') { G.yaw = r.applied * 5; return; }
  if (SLOTS.includes(t)) { const p = G.preview[t]; if (r.id === 'knurl') { p.idx = r.applied; p.id = ITEMS(t)[p.idx].id; ev(G, 'preview', { slot: t, id: p.id }); } else p.tri = r.applied; return; }
  if (t === 'INSCRIPTION') { if (r.id === 'knurl') { if (!G.placed.DECORATION || G.op) { return; } const was = Math.floor(G.ins / 5); G.ins = r.applied; ev(G, 'stroke', { n: G.ins });
      const now = Math.min(4, Math.floor(G.ins / 5)); if (now !== was) { G.arcMark = now; ev(G, 'arcmark', { mark: now }); } if (G.ins >= WSTEPS && !G.history.some(h => h.slot === 'INSCRIPTION')) { G.history.push({ t: +G.t.toFixed(3), gen: G.gen, slot: 'INSCRIPTION', id: '生日快乐', match: match(G) }); ev(G, 'written'); } }
    else { if (r.applied !== G.tilt) ev(G, 'tilt'); G.tilt = r.applied; } } }
function canPlace(G, t) { const need = NEEDS[t]; if (!need) return true; if (need === 'INSCRIPTION') return G.ins >= WSTEPS; return !!G.placed[need] && !(need === 'MOULD' && G.make.lift < 1) && !(need === 'DECORATION' && G.make.beads < 1); }
// HOLD (short): place the previewed archive piece, light, blow, or begin the next cake
function hold(G) { ev(G, 'hold'); const t = tname(G);
  if (G.op) { ev(G, 'dead', { why: 'MAKING' }); return false; }
  if (G.phase === 'done') { nextCake(G); return true; }
  if (t === 'LIGHT') { if (G.make.holders < 7) { ev(G, 'dead', { why: 'FIRST: CANDLES' }); return false; } if (G.make.lit < 7) { start(G, 'LIGHT'); return true; } start(G, 'BLOW'); return true; }
  if (t === 'INSCRIPTION') { ev(G, 'dead', { why: 'TURN THE KNURL TO WRITE' }); return false; }
  if (!canPlace(G, t)) { ev(G, 'dead', { why: 'FIRST: ' + NEEDS[t] }); return false; }
  const p = G.preview[t], prev = G.placed[t]; G.placed[t] = { id: p.id, tri: p.tri }; const swap = !!prev && (t === 'MOULD' ? G.make.beads >= 1 : t === 'DECORATION' ? G.make.beads >= 1 : t === 'CANDLES' ? G.make.holders >= 7 : true);
  G.history.push({ t: +G.t.toFixed(3), gen: G.gen, slot: t, id: p.id, size: +sizeOf(p).toFixed(2), turn: p.tri * 15, swap, match: match(G) }); ev(G, 'place', { slot: t, id: p.id, swap });
  if (swap) { G.decay = 1; ev(G, 'decay', { slot: t }); return true; }   // the film's swap: a three-frame silver decay; the candles hold their place
  start(G, t); return true; }
const OPS = { STAND: 1.0, PLATE: .9, MOULD: 3.3, DECORATION: 3.0, CANDLES: 7 * .3 + .2, LIGHT: .6 + 7 * .26, BLOW: .9 + 7 * .07 + .4 };
function start(G, kind) { G.op = { kind, t: 0, dur: OPS[kind], fired: {} }; ev(G, 'begin', { op: kind }); }
function once(G, key, k, extra) { if (G.op.fired[key]) return; G.op.fired[key] = 1; ev(G, k, extra); }
function stepOp(G, dt) { const o = G.op; if (!o) return; o.t += dt; const u = Math.min(o.t, o.dur), M = G.make;
  if (o.kind === 'STAND') { M.stand = clamp(1e-9 + u / .85, 0, 1); if (u >= .85) once(G, 'set', 'set', { what: 'stand' }); }
  else if (o.kind === 'PLATE') { M.plate = clamp(1e-9 + u / .75, 0, 1); if (u >= .75) once(G, 'plate', 'plate'); }
  else if (o.kind === 'MOULD') { M.mouldIn = clamp(1e-9 + u / .6, 0, 1); if (u >= .6) once(G, 'clank', 'clank'); M.batter = clamp(1e-9 + (u - .7) / 1.3, 0, 1); if (u >= .7) once(G, 'pour', 'pour');
    M.bake = clamp(1e-9 + (u - 2.0) / .4, 0, 1); if (u >= 2.0) once(G, 'bake', 'bake'); M.lift = clamp(1e-9 + (u - 2.5) / .8, 0, 1); if (u >= 2.5) once(G, 'lift', 'lift'); }
  else if (o.kind === 'DECORATION') { M.icing = clamp(1e-9 + u / 1.2, 0, 1); if (u >= 0) once(G, 'spread', 'spread'); M.topDisc = clamp(1e-9 + (u - 1.1) / .4, 0, 1); const b = clamp(1e-9 + (u - 1.6) / 1.2, 0, 1);
    const n0 = Math.floor(M.beads * 14), n1 = Math.floor(b * 14); M.beads = b; for (let i = n0; i < n1; i++) ev(G, byId(G.placed.DECORATION.id).form.beads === 'none' ? 'drip' : 'pipe', { i }); }
  else if (o.kind === 'CANDLES') { const n = Math.min(7, Math.floor(u / .3)); while (M.holders < n) { M.holders++; ev(G, 'candle', { i: M.holders }); } if (u >= o.dur) M.holders = 7; }
  else if (o.kind === 'LIGHT') { if (u >= 0) once(G, 'match', 'match'); const n = clamp(Math.floor((u - .6) / .26) + 1, 0, 7); while (M.lit < n) { M.lit++; ev(G, 'flame', { i: M.lit }); } }
  else if (o.kind === 'BLOW') { if (u >= .1) once(G, 'inhale', 'inhale'); if (u >= .8) once(G, 'blow', 'blow'); M.blowing = clamp(1e-9 + (u - .8) / .6, 0, 1); const n = clamp(Math.floor((u - .9) / .07) + 1, 0, 7); while (M.out < n) { M.out++; ev(G, 'puff', { i: M.out }); } }
  if (o.t >= o.dur) { const k = o.kind; G.op = null; ev(G, 'end', { op: k });
    if (k === 'BLOW') { G.phase = 'done'; G.history.push({ t: +G.t.toFixed(3), gen: G.gen, slot: 'BLOW', id: 'seven out', match: match(G) }); ev(G, 'done', { match: match(G) }); }
    else if (k === 'LIGHT') { G.history.push({ t: +G.t.toFixed(3), gen: G.gen, slot: 'LIGHT', id: 'seven lit', match: match(G) }); }
    else { const nx = { STAND: 1, PLATE: 2, MOULD: 3, CANDLES: 6 }[k]; if (nx != null && G.target === TARGETS.indexOf(k)) select(G, nx); } } }
function nextCake(G) { G.gen++; G.ref = (G.ref + 1) % REFS.length; G.phase = 'build'; ['MOULD', 'DECORATION', 'CANDLES'].forEach(s => G.placed[s] = null);
  const keep = { stand: G.make.stand, plate: G.make.plate }; G.make = Object.assign(blankMake(), keep); G.ins = 0; G.arcMark = 0; G.tilt = 0; ev(G, 'nextcake', { gen: G.gen, toward: REFS[G.ref].name }); select(G, 2); }
function longHold(G) { ev(G, 'off'); G.offAt = G.t; }
function step(G, dt) { G.t += dt; machine(G, dt); stepOp(G, dt); if (G.decay > 0) G.decay = Math.max(0, G.decay - dt / .1); if (G.offAt && G.t - G.offAt > 1.6) { const keepT = G.t, log = G.log, hist = G.history, steps = G.steps; Object.assign(G, create({ ref: G.ref })); G.t = keepT; G.log = log; G.history = hist; G.steps = steps; ev(G, 'cleared'); } }
// the stage: every visible layer traced to its reservoir record
function stageAudit(G) { const L = []; SLOTS.forEach(s => { const p = G.placed[s]; if (!p) return; const r = byId(p.id); L.push({ layer: s, id: r.id, institution_id: r.source.institution_id, title: r.source.title, rights: r.rights.status, cc0: r.rights.cc0, rendered_as: r.stage_asset.kind, crop: r.crop, size: +sizeOf(p).toFixed(2), turn_deg: p.tri * 15 }); });
  if (G.ins > 0) L.push({ layer: 'INSCRIPTION', id: '生日快乐', institution_id: null, title: 'four characters drawn stroke by stroke', rights: 'ORIGINAL', cc0: false, rendered_as: 'canvas text' }); return L; }
function manifest() { return { title: 'SCION 49 OPEN-CONTENT ATELIER reservoir', built: '2026-11-06', rule: 'Only CC0 files may enter the repo. No archive file is in the repo: none could be downloaded, and none had its CC0 status read. Every piece on the stage is an original procedural stand-in; the archive record it stands for is kept with its rights state.',
  checks: CHECKS, items: RESERVOIR.map(r => ({ id: r.id, slot: r.slot, label: r.label, source: r.source, rights: r.rights, stage_asset: r.stage_asset, transform_history: [{ op: 'select', what: 'chosen for the ' + r.slot + ' slot' }, { op: 'crop', what: r.crop }, { op: 'stand-in', what: r.stage_asset.what }, { op: 'stage', what: 'scaled by the triangle ring 0.84-1.16 (stand, plate, holders) and turned 15 degrees a detent' }], tags: r.tags })),
  on_file_not_used: NOT_USED, refs: REFS }; }
return { TAU, RESERVOIR, NOT_USED, CHECKS, SLOTS, TARGETS, ITEMS, NEEDS, REFS, WSTEPS, TABLE_TOP, CAKE_H, CAKE_R, CANDLE_XZ, byId, create, select, handTurn, machine, hold, longHold, step, layout, surface, match, knurlRange, triRange, sizeOf, stageAudit, manifest, tname };
});
