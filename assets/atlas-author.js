// ============================================================================
// STELLINE AUTHORING LAYER
// Direct manipulation for the things Stelline lingers on:
//   CAKE   CANDLES tool: click the icing to place, click a candle to light/snuff it,
//          shift-click to remove. PIPE tool: draw freehand piping on the cake.
//   WRITING font x medium x layout x ink, presets in many languages, keep-clear of candles
//   BUG    EYE STUDIO: 7 eye types, facet shape, density, bulge, hue, banding, sheen, glow;
//          the key light follows the pointer so facets glint as you sweep across them
//   Undo / redo for every edit. Consequences are physical: snuffed candles stop lighting
//   the icing, burning candles shorten, all out = a wish, a candle on the writing warns.
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS, H = A.hero; if (!A || !H) return;
  const T = THREE, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const holo = document.getElementById('hologramCanvas');
  A.tool = 'orbit'; A.author = {};
  const toast = m => A.toast && A.toast(m), say = m => A.say && A.say(m);
  const g = () => H.genome;
  const cakeOn = () => window.state && state.engineVersion === 'v5' && A.mode === 'cake' && H.active && !A.photo && !A.tl && !A.galleryOpen;

  // ---------------------------------------------------------------- history
  const hist = { undo: [], redo: [] };
  const snap = () => JSON.stringify({ c: g().cslots || null, s: g().strokes || [], age: g().age, text: g().text, font: g().font, medium: g().medium, layout: g().layout, ink: g().ink, candle: g().candle });
  function push() { hist.undo.push(snap()); if (hist.undo.length > 80) hist.undo.shift(); hist.redo.length = 0; }
  function restore(str) { const o = JSON.parse(str), G = g(); G.cslots = o.c; G.strokes = o.s; G.age = o.age; G.text = o.text; G.font = o.font; G.medium = o.medium; G.layout = o.layout; G.ink = o.ink; G.candle = o.candle; H.rebuild(false); if (H.sel >= 0 && H.parts[H.sel]) H.frame(H.parts[H.sel].focus); if (A.rebuildDrawer) A.rebuildDrawer(); }
  A.undo = function (redo) {
    if (A.mode !== 'cake') return; const from = redo ? hist.redo : hist.undo, to = redo ? hist.undo : hist.redo; if (!from.length) { toast(redo ? 'NOTHING TO REDO' : 'NOTHING TO UNDO'); return; }
    to.push(snap()); restore(from.pop()); toast(redo ? 'REDO' : 'UNDO · ' + (hist.undo.length) + ' LEFT');
  };
  A.authorPush = push;

  // ---------------------------------------------------------------- tools
  const TOOLS = ['orbit', 'candle', 'pipe'];
  A.setTool = function (t) {
    if (A.mode !== 'cake') { if (t !== 'orbit') toast('TOOLS ARE FOR THE BIRTHDAY BUILDER'); A.tool = 'orbit'; return; }
    const api = H.cakeAPI; if (t !== 'orbit' && api && !api.supported) { toast('CUPCAKE TOWERS ARE EDITED WITH THE DRAWER'); return; }
    A.tool = t; hideGhost(); holo.style.cursor = t === 'orbit' ? 'grab' : 'crosshair';
    const msg = { orbit: 'Orbit. Drag to turn the cake.', candle: 'Candles. Click the icing to place one, click a candle to light or snuff it, shift-click to remove.', pipe: 'Piping. Drag on the icing to draw. Press Z to undo.' }[t]; toast(t.toUpperCase() + ' TOOL'); say(msg);
    if (t !== 'orbit' && api) { H.sel = -1; H.lockRef = null; const R = api.E; H.frame(t === 'pipe' ? { pos: [0, api.topY + 0.06, 0], dist: R * 2.9 + 2.5, yaw: 0, pitch: 1.12 } : { pos: [0, api.topY + 0.4, 0], dist: R * 3.4 + 3, yaw: 0.25, pitch: 0.78 }); }
    A.emit('tool', t);
  };
  A.cycleTool = () => A.setTool(TOOLS[(TOOLS.indexOf(A.tool) + 1) % TOOLS.length]);

  // ---------------------------------------------------------------- picking
  const ray = new T.Raycaster(), pl = new T.Plane(new T.Vector3(0, 1, 0), 0), hit = new T.Vector3(), ndc = new T.Vector2();
  function toNDC(e) { const r = A.canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  function topPoint(e, loose) { const api = H.cakeAPI; if (!api) return null; toNDC(e); H.cam.updateMatrixWorld(); ray.setFromCamera(ndc, H.cam); pl.constant = -(api.topY + 0.05); if (!ray.ray.intersectPlane(pl, hit)) return null; if (!loose && !api.inside(hit.x, hit.z)) return null; return hit.clone(); }
  function pickCandle(e) { const api = H.cakeAPI; if (!api) return -1; toNDC(e); H.cam.updateMatrixWorld(); ray.setFromCamera(ndc, H.cam); return api.pick(ray); }
  // ghost / nozzle
  let ghost = null;
  function ghostFor(kind) { if (!ghost) { const grp = new T.Group(); const cand = new T.Mesh(new T.CylinderGeometry(0.05, 0.055, 0.78, 16), new T.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.45, depthWrite: false })); cand.position.y = 0.39; const ring = new T.Mesh(new T.TorusGeometry(0.22, 0.012, 6, 32), new T.MeshBasicMaterial({ color: 0xf0b050, transparent: true, opacity: 0.8 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; const noz = new T.Mesh(new T.SphereGeometry(0.07, 14, 10), new T.MeshBasicMaterial({ color: new T.Color(3, 2.6, 1.8), toneMapped: false })); noz.position.y = 0.08; grp.add(cand, ring, noz); grp.userData = { cand, ring, noz }; ghost = grp; } if (!ghost.parent) H.root.add(ghost); ghost.userData.cand.visible = kind === 'candle'; ghost.userData.ring.visible = kind === 'candle'; ghost.userData.noz.visible = kind === 'pipe'; return ghost; }
  function hideGhost() { if (ghost) ghost.visible = false; }
  const ensureCustom = () => { const G = g(), api = H.cakeAPI; if (!G.cslots) G.cslots = api.slots.map(s => ({ x: +s.x.toFixed(3), z: +s.z.toFixed(3), type: s.type, off: !!s.off })); };
  const overlapsWriting = (x, z) => { const r = H.cakeAPI && H.cakeAPI.textRect; return r && Math.abs(x) < r.hx && Math.abs(z - (r.cz || 0)) < r.hz; };

  // ---------------------------------------------------------------- candles
  A.addCandleAt = function (x, z) {
    const api = H.cakeAPI, G = g(); if (!api || !api.supported) return;
    for (const s of api.slots) if (Math.hypot(s.x - x, s.z - z) < 0.26) { toast('TOO CLOSE TO ANOTHER CANDLE'); return; }
    push(); ensureCustom(); G.cslots.push({ x: +x.toFixed(3), z: +z.toFixed(3), off: false }); G.age = G.cslots.length; G.variant = -1;
    api.addCandle(x, z); if (A.chime) A.chime(); H._wish = false;
    if (overlapsWriting(x, z)) { toast('THAT CANDLE SITS ON THE WRITING · USE KEEP CLEAR'); say('That candle is on top of the writing.'); } else say(`${G.age} candles.`);
    A.emit('author');
  };
  A.toggleCandle = function (i) {
    const api = H.cakeAPI, c = api && api.candles[i]; if (!c) return; push(); ensureCustom(); c.off = !c.off; g().cslots[i].off = c.off; if (c.slot) c.slot.off = c.off;
    if (c.off) { api.puff(c); c.puffed = true; } else { c.puffed = false; c.burn = 0; if (c.body) { c.body.scale.y = 1; c.body.position.y = c.bh / 2; } if (A.shutter) A.shutter(); }
    say(c.off ? 'Candle snuffed.' : 'Candle lit.'); A.emit('author');
  };
  A.removeCandle = function (i) {
    const api = H.cakeAPI, G = g(); if (!api || !api.candles[i]) return; push(); ensureCustom(); G.cslots.splice(i, 1); G.age = G.cslots.length; api.removeCandle(i); say(`${G.age} candles.`); A.emit('author');
  };
  A.keepClear = function () {
    const api = H.cakeAPI, G = g(); if (!api || !api.textRect) { toast('NO TOP WRITING TO CLEAR'); return; } push(); ensureCustom(); const r = api.textRect; let moved = 0;
    G.cslots.forEach(c => { if (overlapsWriting(c.x, c.z)) { const up = c.z - (r.cz || 0) < 0 ? -1 : 1; c.z = +((r.cz || 0) + up * (r.hz + 0.3)).toFixed(3); moved++; } });
    if (!moved) { hist.undo.pop(); toast('NOTHING IS ON THE WRITING'); return; } H.rebuild(false); toast(moved + ' CANDLES MOVED OFF THE WRITING'); say(moved + ' candles moved off the writing.');
  };
  A.setAllCandles = function (on) { const api = H.cakeAPI; if (!api) return; push(); ensureCustom(); api.candles.forEach((c, i) => { if (c.off === !on) return; c.off = !on; g().cslots[i].off = c.off; if (c.slot) c.slot.off = c.off; if (c.off) { api.puff(c); c.puffed = true; } else { c.puffed = false; c.burn = 0; } }); };
  A.setCandleType = function (t) { const G = g(); push(); G.candle = t; G.cslots = null; if (t === 'sparkler') G.age = Math.min(G.age, 9); if (t === 'braid' || t === 'daisy') G.age = Math.min(G.age, 8); if (t === 'number') G.age = clamp(G.age, 1, 99); H.rebuild(false); say(t + ' candles.'); };
  A.applyRecipe = function (name) {
    const b = H.builders.cake; push(); const keepName = g().name; const ng = H.recipeGenome(name, H.seed); if (keepName) { ng.name = keepName; ng.text = keepName.toUpperCase(); } H.start('cake', H.seed, ng); H.sel = -1; H.overview(); H.frame(b.overview, true); if (A.syncHeroRings) A.syncHeroRings(); if (A.rebuildDrawer) A.rebuildDrawer(); toast('RECIPE · ' + name); say('Recipe ' + name + '.');
  };
  A.setCake = function (key, val) {
    const G = g(); push(); G[key] = val; G.variant = -1; if (key === 'arr' || key === 'shape') G.cslots = null;
    if (key === 'shape') { const D = { drum: 'sponge', poly: 'ganache', opera: 'opera' }; if (D[val]) { const ok = { drum: ['sponge', 'frosted', 'naked', 'ganache'], poly: ['ganache', 'frosted'], opera: ['opera'] }[val]; if (!ok.includes(G.finish)) G.finish = D[val]; if (G.scene !== 'void') { G.scene = 'void'; G.table = 'none'; } G.view = 'hero'; } else if (G.view === 'hero') G.view = 'tq'; }
    H.rebuild(false); H.overview(); if (A.rebuildDrawer) A.rebuildDrawer();
  };
  A.setBurn = function (v) { g().burn = v; toast(v === 0 ? 'BURN OFF' : v === 1 ? 'BURNING DOWN · REAL TIME' : 'BURNING DOWN · TIME-LAPSE'); };

  // ---------------------------------------------------------------- piping
  let stroke = null, drawing = false;
  A.clearStrokes = function () { const G = g(); if (!G.strokes || !G.strokes.length) return; push(); G.strokes = []; H.rebuild(false); say('Piping cleared.'); };
  A.setNib = v => { g().nib = clamp(v, 0.05, 1); };
  function onDown(e) {
    if (!cakeOn() || A.tool === 'orbit' || A.hudDown) return; const api = H.cakeAPI; if (!api || !api.supported) return;
    if (A.tool === 'candle') { e.stopImmediatePropagation(); e.preventDefault(); const i = pickCandle(e); if (i >= 0) { e.shiftKey ? A.removeCandle(i) : A.toggleCandle(i); return; } const p = topPoint(e); if (p) A.addCandleAt(p.x, p.z); else toast('CLICK ON THE ICING'); return; }
    if (A.tool === 'pipe') { const p = topPoint(e); if (!p) { return; } e.stopImmediatePropagation(); e.preventDefault(); push(); const G = g(); stroke = { w: G.nib == null ? 0.45 : G.nib, p: [+(p.x / api.E).toFixed(3), +(p.z / api.E).toFixed(3)] }; G.strokes.push(stroke); drawing = true; api.drawStroke(stroke); api.strokeTex.needsUpdate = true; try { holo.setPointerCapture(e.pointerId); } catch (x) { } }
  }
  function onMove(e) {
    if (!cakeOn() || A.tool === 'orbit') { if (ghost && ghost.visible) hideGhost(); return; } const api = H.cakeAPI; if (!api || !api.supported) return;
    if (drawing && stroke) { const p = topPoint(e, true); if (!p) return; const nx = clamp(p.x / api.E, -1, 1), nz = clamp(p.z / api.E, -1, 1); const L = stroke.p.length; if (Math.hypot(nx - stroke.p[L - 2], nz - stroke.p[L - 1]) < 0.012) return; stroke.p.push(+nx.toFixed(3), +nz.toFixed(3)); api.redrawStrokes(); const gh = ghostFor('pipe'); gh.visible = true; gh.position.set(nx * api.E, api.topY + 0.1, nz * api.E); return; }
    const p = topPoint(e); const gh = ghostFor(A.tool); if (!p) { gh.visible = false; return; } gh.visible = true; gh.position.set(p.x, api.topY + 0.05 + (A.tool === 'pipe' ? 0.1 : 0), p.z);
    if (A.tool === 'candle') { const bad = api.slots.some(s => Math.hypot(s.x - p.x, s.z - p.z) < 0.26); const warn = overlapsWriting(p.x, p.z); gh.userData.ring.material.color.set(bad ? 0xff5a4a : warn ? 0xffd040 : 0xf0b050); gh.userData.cand.material.opacity = bad ? 0.15 : 0.45; }
  }
  function onUp() { if (drawing) { drawing = false; stroke = null; A.emit('author'); say('Piped.'); } }
  holo.addEventListener('pointerdown', onDown, true); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  A.on('mode', () => { A.tool = 'orbit'; hideGhost(); hist.undo.length = hist.redo.length = 0; });
  A.on('wish', () => { toast('ALL OUT · A WISH IS MADE'); say('All the candles are out. The wish is made.'); if (A.chime) A.chime(); });

  // ---------------------------------------------------------------- HUD (tools row)
  A.drawAuthorHud = function (ctx, w, h, U) {
    if (A.mode !== 'cake' || A.photo) return; const narrow = w < 720; let x = narrow ? 30 : w / 2 - 150; const y = narrow ? 112 : 96;
    U.txt(ctx, 'TOOL', x, y, U.DIM, 'left', 8.5); x += 40;
    [['orbit', 'ORBIT'], ['candle', 'CANDLES'], ['pipe', 'PIPE']].forEach(([k, l]) => { const on = A.tool === k; U.txt(ctx, l, x, y, on ? U.INK : U.AMB, 'left', 9); const ww = ctx.measureText(l).width; if (on) { ctx.fillStyle = U.AMB; ctx.fillRect(x, y + 3, ww, 1.5); } U.addHit(x - 4, y - 12, ww + 8, 20, () => A.setTool(k), 'tool-' + k, l + ' tool'); x += ww + 16; });
    const api = H.cakeAPI; if (api) { const lit = api.candles.filter(c => !c.off).length; U.txt(ctx, `${lit}/${api.candles.length} LIT${g().burn ? ' · BURNING' : ''}`, x + 6, y, U.DIM, 'left', 8.5); }
    if (A.tool !== 'orbit') { const m = A.tool === 'candle' ? 'CLICK ICING: PLACE · CLICK CANDLE: LIGHT / SNUFF · SHIFT: REMOVE · Z: UNDO' : 'DRAG ON THE ICING TO PIPE · Z: UNDO · NIB IN DESIGN'; U.txt(ctx, m, w / 2, h - 80, U.AMB, 'center', 8.5); }
  };

  // ---------------------------------------------------------------- drawer extensions
  const FONTS = ['piped', 'script', 'sans', 'serif', 'brush', 'round'], MEDIA = ['pipe', 'gel', 'choc', 'gold'], LAYOUTS = ['top', 'arc', 'side', 'topper'], CANDLES = ['striped', 'braid', 'daisy', 'number', 'taper', 'tealight', 'sparkler'];
  const row = (attr, list, cur) => `<div class="drow" style="margin-top:3px;gap:4px">${list.map(t => `<button class="dbtn${cur === t ? ' amber' : ''}" ${attr}="${t}">${t.toUpperCase()}</button>`).join('')}</div>`;
  const sl = (id, label, v, min, max) => `<label>${label}</label><input type="range" id="${id}" min="${min}" max="${max}" value="${v}">`;
  A.extendDrawer = function (drawer, G) {
    const $ = (s) => drawer.querySelector(s);
    if (A.mode === 'bug') {
      const EY = ['compound', 'dome', 'stalk', 'spider', 'mantis', 'simple', 'notched'], SH = ['hex', 'square', 'round'];
      drawer.insertAdjacentHTML('afterbegin', `<h5>EYE STUDIO</h5><div class="drow" style="margin:0 0 4px"><button class="dbtn amber" id="eFrame">FRAME THE EYE</button><button class="dbtn" id="eMatch">MATCH THE FILM</button></div>
        <label>TYPE</label>${row('data-eye', EY, G.eyeType)}<label>FACET SHAPE</label>${row('data-fshape', SH, G.facetShape || 'hex')}
        ${sl('eFac', 'FACET DENSITY', Math.round(G.facets * 100), 0, 100)}${sl('eSize', 'EYE SIZE', Math.round(G.eyeSize * 100), 60, 150)}${sl('eBul', 'BULGE', Math.round((G.bulge == null ? 0.56 : G.bulge) * 100), 0, 100)}
        ${sl('eHue', 'EYE COLOUR', Math.round(G.eyeHue * 100), 0, 100)}${sl('eBand', 'BANDING', Math.round((G.eyeBand || 0) * 100), 0, 100)}${sl('eBHue', 'BAND COLOUR', Math.round((G.bandHue || 0) * 100), 0, 100)}${sl('eSheen', 'CORNEA SHEEN', Math.round((G.sheen == null ? 0.3 : G.sheen) * 100), 0, 100)}${sl('eGlow', 'BIOLUMINESCENCE', Math.round((G.glow || 0) * 100), 0, 100)}
        <div class="drow"><button class="dbtn" id="eSplit">${G.split ? 'ASYMMETRIC' : 'SYMMETRIC'}</button></div><h5>BODY</h5>`);
      drawer.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => { A.patchGenome({ eyeType: b.dataset.eye }, true); setTimeout(A.rebuildDrawer, 320); });
      drawer.querySelectorAll('[data-fshape]').forEach(b => b.onclick = () => { G.facetShape = b.dataset.fshape; G.variant = -1; A.setRing(0, 20 + 180 * G.facets, false); H.rebuild(false); setTimeout(A.rebuildDrawer, 80); });
      $('#eFrame').onclick = () => { H.select(0); say('Framing the right eye. Move the pointer to sweep light across the facets.'); };
      $('#eMatch').onclick = () => A.toggleMatch && A.toggleMatch(true);
      $('#eFac').oninput = e => { G.facets = e.target.value / 100; A.setRing(0, 20 + 180 * G.facets, false); };
      $('#eSize').oninput = e => A.patchGenome({ eyeSize: e.target.value / 100 }, true);
      const live = (id, key, div) => { $(id).oninput = e => { G[key] = e.target.value / (div || 100); G.variant = -1; }; };
      live('#eBul', 'bulge'); live('#eHue', 'eyeHue'); live('#eBand', 'eyeBand'); live('#eBHue', 'bandHue'); live('#eSheen', 'sheen'); live('#eGlow', 'glow');
      $('#eSplit').onclick = e => { const v = G.split ? 0 : 1; A.patchGenome({ split: v }, true); e.target.textContent = v ? 'ASYMMETRIC' : 'SYMMETRIC'; };
    }
    if (A.mode === 'cake') {
      const O = A.cakeOptions; const FIN = ['sponge', 'frosted', 'naked', 'ganache', 'opera'];
      drawer.insertAdjacentHTML('afterbegin', `<h5>RECIPES</h5><div class="drow" style="margin:0 0 4px;gap:4px">${Object.keys(A.cakeRecipes).map(n => `<button class="dbtn" data-recipe="${n}">${n}</button>`).join('')}<button class="dbtn amber" id="rFilm">FILM</button></div>
        <h5>CAKE BODY</h5><label>SHAPE</label>${row('data-shape', O.SHAPES, G.shape)}<label>FINISH · DRUM / POLY / OPERA</label>${row('data-fin', FIN, G.finish)}<label>BORDER</label>${row('data-bord', O.BORDERS, G.border)}<label>SIDE DECORATION</label>${row('data-side', O.SIDEDECS, G.sidedec)}<label>CANDLE LAYOUT</label>${row('data-arr', O.ARRS, G.arr)}
        <div class="drow"><button class="dbtn${G.dust ? ' amber' : ''}" id="bDust">${G.dust ? 'DUSTED' : 'NO DUST'}</button><button class="dbtn" id="bSides">POLY SIDES ${G.sides || 12}</button></div>`);
      drawer.querySelectorAll('[data-recipe]').forEach(b => b.onclick = () => A.applyRecipe(b.dataset.recipe)); drawer.querySelector('#rFilm').onclick = () => { A.canon(); };
      const bind = (attr, key) => drawer.querySelectorAll(`[${attr}]`).forEach(b => b.onclick = () => A.setCake(key, b.getAttribute(attr)));
      bind('data-shape', 'shape'); bind('data-fin', 'finish'); bind('data-bord', 'border'); bind('data-side', 'sidedec'); bind('data-arr', 'arr');
      drawer.querySelector('#bDust').onclick = () => A.setCake('dust', G.dust ? 0 : 1); drawer.querySelector('#bSides').onclick = () => A.setCake('sides', G.sides >= 16 ? 5 : (G.sides || 12) + 1);
      const PRE = A.writingPresets || [];
      drawer.insertAdjacentHTML('beforeend', `<h5>WRITING</h5><label>PRESETS</label><div class="drow" style="margin-top:3px;gap:4px">${PRE.map((p, i) => `<button class="dbtn" data-pre="${i}">${p[0].length > 12 ? p[0].slice(0, 10) + '…' : p[0]}</button>`).join('')}</div>
        <label>SCRIPT</label>${row('data-font', FONTS, G.font)}<label>MEDIUM</label>${row('data-med', MEDIA, G.medium)}<label>LAYOUT</label>${row('data-lay', LAYOUTS, G.layout)}
        <h5>CANDLES</h5><label>TYPE</label>${row('data-cand', CANDLES, G.candle)}
        <div class="drow"><button class="dbtn amber" id="aTool">CANDLE TOOL</button><button class="dbtn" id="aClear">KEEP CLEAR OF WRITING</button></div>
        <div class="drow"><button class="dbtn" id="aAllOff">SNUFF ALL</button><button class="dbtn" id="aAllOn">LIGHT ALL</button><button class="dbtn${G.burn ? ' amber' : ''}" id="aBurn">${G.burn === 6 ? 'BURN ×6' : G.burn === 1 ? 'BURN' : 'NO BURN'}</button></div>
        <h5>PIPING</h5><div class="drow" style="margin-top:0"><button class="dbtn amber" id="pTool">PIPE TOOL</button><button class="dbtn" id="pClear">CLEAR PIPING</button></div>${sl('pNib', 'NOZZLE WIDTH', Math.round((G.nib == null ? 0.45 : G.nib) * 100), 5, 100)}
        <div class="drow"><button class="dbtn" id="uUndo">UNDO</button><button class="dbtn" id="uRedo">REDO</button></div>`);
      drawer.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { const p = PRE[+b.dataset.pre]; push(); G.text = p[0]; G.font = p[1]; G.variant = -1; H.rebuild(false); A.rebuildDrawer(); });
      const setK = (attr, key) => drawer.querySelectorAll(`[${attr}]`).forEach(b => b.onclick = () => { push(); G[key] = b.getAttribute(attr); G.variant = -1; H.rebuild(false); A.rebuildDrawer(); });
      setK('data-font', 'font'); setK('data-med', 'medium'); setK('data-lay', 'layout');
      drawer.querySelectorAll('[data-cand]').forEach(b => b.onclick = () => { A.setCandleType(b.dataset.cand); A.rebuildDrawer(); });
      $('#aTool').onclick = () => A.setTool('candle'); $('#aClear').onclick = () => A.keepClear(); $('#aAllOff').onclick = () => A.setAllCandles(false); $('#aAllOn').onclick = () => A.setAllCandles(true);
      $('#aBurn').onclick = e => { const v = G.burn === 0 ? 1 : G.burn === 1 ? 6 : 0; A.setBurn(v); e.target.textContent = v === 6 ? 'BURN ×6' : v === 1 ? 'BURN' : 'NO BURN'; e.target.classList.toggle('amber', !!v); };
      $('#pTool').onclick = () => A.setTool('pipe'); $('#pClear').onclick = () => A.clearStrokes(); $('#pNib').oninput = e => A.setNib(e.target.value / 100);
      $('#uUndo').onclick = () => A.undo(false); $('#uRedo').onclick = () => A.undo(true);
    }
  };
  if (A.mode !== 'film' && A.rebuildDrawer) A.rebuildDrawer();
})();
