/* Stelline Orb v5: the shared state. The film (an atlas of 48 shots, each cut into named parts) and the device (five rings and
   ten buttons) are two views of one state: turning a ring changes what the film shows, and what the film holds decides what each
   ring offers. Nothing here draws; orb.js draws the device, scene.js draws the film and the bench. */
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ST = window.ST = {
    atlas: null, TL: [], t: 0, part: 0, mode: 'watch', spread: 0, view: 0, light: .5, iso: 0, playing: true, shotClock: 0,
    proto: null, build: { items: [], sel: 0, ref: null, n: 0 }, ring: 0, mems: 0, score: null, last: null,
    lcd: { left: '', right: '', note: '' }, steps: null, step: 0, stepAt: 0, hands: { n: 0, src: '', who: '' }, edits: {}, rec: [], recFrom: 0, replaying: false, pair: { room: null, peers: 0 }, rev: 0, log: []
  };
  const bus = {}; const on = (k, f) => (bus[k] = bus[k] || []).push(f); const emit = (k, ...a) => (bus[k] || []).forEach(f => { try { f(...a); } catch (e) { console.error(e); } });
  const touch = (why) => { ST.rev++; ST.last = why; emit('change', why); };
  function log(k, m) { ST.log.push({ t: +(performance.now() / 1000).toFixed(2), k, m }); if (ST.log.length > 300) ST.log.shift(); }
  /* ---- the timeline: the film's shots, with memories the user imprinted put in after the shot they answer ---- */
  const cur = () => ST.TL[ST.t] || null;
  const shotOf = e => e && e.kind === 'film' ? ST.atlas.shots[e.n] : null;
  const curShot = () => shotOf(cur()) || (cur() && cur().kind === 'mem' ? ST.atlas.shots[cur().ref] : null);
  const fmt = s => { s = Math.max(0, s); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
  const actOf = n => ST.atlas.acts.find(a => n >= a.first && n <= a.last);
  const figures = sh => sh ? sh.parts.filter(p => p.kind !== 'ground') : [];
  const partsOf = sh => sh ? sh.parts.filter(p => p.kind !== 'ground').concat(sh.parts.filter(p => p.kind === 'ground')) : [];
  function partName(sh, p) { const same = sh.parts.filter(q => q.name === p.name); return same.length > 1 ? p.name + ' ' + (same.indexOf(p) + 1) : p.name; }

  /* ---- the bench: what the user builds. An item has facets; ring 2 picks item and facet, ring 4 sets the facet, ring 5 lights the item ---- */
  const FACETS = {
    beetle: [['skin', 'FILM SKIN', 0, 1], ['focus', 'EYE FOCUS', 0, 1], ['setae', 'SETAE', 0, 1], ['gait', 'GAIT', 0, 1], ['sheen', 'CHITIN', 0, 1]],
    cake: [['skin', 'FILM SKIN', 0, 1], ['candles', 'CANDLES', 1, 9, 1], ['bundt', 'BUNDT', 0, 1], ['icing', 'ICING', 0, 1], ['flames', 'FLAMES', 0, 1]],
    table: [['skin', 'FILM SKIN', 0, 1], ['glow', 'GLOW', 0, 1]],
    card: [['appear', 'APPEAR', 0, 1], ['push', 'PUSH', -1, 1]],
    far: [['appear', 'APPEAR', 0, 1], ['size', 'SIZE', .3, 2], ['slide', 'SLIDE', -1, 1], ['push', 'PUSH', -1, 1]],
    prim: [['shape', 'SHAPE', 0, 5], ['size', 'SIZE', .3, 2], ['turn', 'TURN', -1, 1]]
  };
  const SHAPES = ['SPHERE', 'CAPSULE', 'CYLINDER', 'CONE', 'BOX', 'RING'];
  let IID = 0;
  function item(type, o) { const it = Object.assign({ id: 'i' + (++IID), type, name: type, x: 0, z: 0, y: 0, light: .5, rot: 0 }, o || {}); for (const f of facetList(it)) if (it[f[0]] == null) it[f[0]] = f[0] === 'size' ? 1 : f[0] === 'appear' ? 1 : f[2] < 0 ? 0 : f[2]; return it; }
  const facetList = it => it.type === 'card' && it.src && ST.build.ref != null && it.src.n !== ST.build.ref ? FACETS.far : (FACETS[it.type] || []);
  // each builder starts from a shot of the film: its made things stand for that shot's cut parts, its cards are the shot's own people
  const ks = (n, names) => ST.atlas.shots[n].parts.filter(p => names.includes(p.name)).map(p => p.k);
  const TEMPLATES = {
    bug: { ref: 6, grade: 'forest', items: () => [item('beetle', { name: 'beetle', src: { n: 6, ks: ks(6, ['beetle head', 'compound eye', 'antenna', 'foreleg']) }, canon: { focus: 1, setae: 0, gait: 0, sheen: .5 }, skin: 1, focus: .15, setae: 0, gait: 0, sheen: .5, tilt0: 0, anchor: { mesh: 'head', frac: .36, dy: .02 } })] },
    birthday: { ref: 24, grade: 'birthday', items: () => [item('table', { name: 'table', src: { n: 24, ks: ks(24, ['table']) }, canon: { glow: .8 }, skin: 1, glow: .8, tilt0: .55 }),
      item('cake', { name: 'cake', src: { n: 24, ks: ks(24, ['cake']) }, canon: { candles: 4, bundt: 0, icing: 0, flames: 1 }, skin: 1, candles: 4, bundt: 0, icing: 0, flames: 1, tilt0: .45 }),
      ...cardsFrom(24, ['child']).map(c => Object.assign(c, { appear: .3 }))] },
    anything: { ref: null, grade: 'dome', items: () => [item('prim', { name: 'form', shape: 0, size: 1, place: { x: 0, y: -2.6, z: 2, s: 1.6, rx: .2, ry: 0 } })] }
  };
  function cardsFrom(n, names) { const sh = ST.atlas.shots[n]; return sh.parts.filter(p => names.includes(p.name)).map(p => item('card', { name: partName(sh, p), src: { n, k: p.k }, appear: 1, push: 0 })); }
  function facetsOfBuild() { const out = []; for (const it of ST.build.items) for (const f of facetList(it)) out.push({ it, f }); return out; }

  /* ---- the five rings: what each offers comes from the film and the mode ---- */
  const DEPTH_L = ['FILM', '', 'LAYERS', '', 'MODEL'], VIEW_L = ['-60', '-30', '0', '+30', '+60'], LIGHT_L = ['DIM', '', 'SET', '', 'BRIGHT'];
  function ringDefs() {
    const sh = curShot(), mode = ST.mode, D = [];
    // 1 TIME: every shot and every memory, by its time in the clip
    D.push({ key: 'time', title: mode === 'build' ? 'COMPARE TO' : 'TIME', labels: ST.TL.map(e => e.kind === 'film' ? fmt(ST.atlas.shots[e.n].start) : 'MEM ' + e.id), disc: true,
      long: ST.TL.map(e => e.kind === 'film' ? fmt(ST.atlas.shots[e.n].start) + ' ' + actOf(e.n).name + ' · ' + figures(ST.atlas.shots[e.n]).map(p => p.name).filter((v, i, a) => a.indexOf(v) === i).join(', ') : 'YOUR MEMORY ' + e.id + ' · answers ' + fmt(ST.atlas.shots[e.ref].start)),
      get: () => ST.t, set: v => setT(Math.round(v)) });
    // 2 PART: the parts of this shot, or the facets of the bench
    if (mode === 'build') { const F = facetsOfBuild(); D.push({ key: 'part', title: 'FACET', labels: F.map(x => (x.it.name + ' ' + x.f[1]).toUpperCase()), disc: true, long: F.map(x => x.it.name + ' · ' + x.f[1].toLowerCase()), get: () => ST.build.sel, set: v => { ST.build.sel = clamp(Math.round(v), 0, Math.max(0, F.length - 1)); } }); }
    else { const ps = partsOf(sh); D.push({ key: 'part', title: 'PART', labels: ps.map(p => partName(sh, p).toUpperCase()), disc: true, long: ps.map(p => partName(sh, p) + (p.kind === 'ground' ? ' (ground)' : '')), get: () => ST.part, set: v => { ST.part = clamp(Math.round(v), 0, Math.max(0, ps.length - 1)); } }); }
    // 3 DEPTH: the same picture as film, as cut layers, as a model
    D.push({ key: 'depth', title: 'DEPTH', labels: DEPTH_L, get: () => ST.spread * 4, set: v => { ST.spread = clamp(v / 4, 0, 1); } });
    // 4 VIEW (watch), ISOLATE (cut), MAKE (build): the facet's value
    if (mode === 'build') { const F = facetsOfBuild()[ST.build.sel]; if (F) { const [k, lab, a, b, step] = F.f, n = step ? (b - a) / step + 1 : 5;
        const labels = step ? Array.from({ length: n }, (_, i) => String(a + i * step)) : k === 'shape' ? SHAPES : [lab, '', '', '', ''].map((s, i) => i === 0 ? '0' : i === 4 ? 'MAX' : i === 2 ? lab : '');
        D.push({ key: 'make', title: lab, labels, long: labels.map((_, i) => F.it.name + ' · ' + lab.toLowerCase() + ' ' + (step ? labels[i] : k === 'shape' ? labels[i].toLowerCase() : Math.round(i / (labels.length - 1) * 100) + '%')), disc: !!step || k === 'shape', get: () => (F.it[k] - a) / (b - a) * (labels.length - 1), set: v => { let x = a + clamp(v / (labels.length - 1), 0, 1) * (b - a); if (step) x = Math.round(x); F.it[k] = x; } }); }
      else D.push({ key: 'make', title: 'MAKE', labels: ['-'], get: () => 0, set: () => { } }); }
    else if (mode === 'cut') { const E = edit(); D.push({ key: 'push', title: 'PUSH', labels: ['BACK', '', 'AS CUT', '', 'FORWARD'], get: () => (E.z + 1) * 2, set: v => { E.z = clamp(v / 2 - 1, -1, 1); } }); }
    else D.push({ key: 'view', title: 'VIEW', labels: VIEW_L, get: () => (ST.view + 1) * 2, set: v => { ST.view = clamp(v / 2 - 1, -1, 1); } });
    // 5 LIGHT: the whole frame, the chosen part, or the chosen item
    D.push({ key: 'light', title: 'LIGHT', labels: LIGHT_L, get: () => (mode === 'build' ? ((facetsOfBuild()[ST.build.sel] || {}).it || { light: .5 }).light : ST.light) * 4,
      set: v => { const x = clamp(v / 4, 0, 1); if (mode === 'build') { const F = facetsOfBuild()[ST.build.sel]; if (F) F.it.light = x; } else if (mode === 'cut') edit().light = x; else ST.light = x; } });
    if (mode === 'cut') D[4].get = () => edit().light * 4;
    return D;
  }
  // a correction to the film's model, for the part in hand: how far forward it stands, how it is lit
  function edit(n, k) { const sh = curShot(); if (n == null) { if (!sh) return { z: 0, light: .5 }; const p = partsOf(sh)[ST.part]; if (!p) return { z: 0, light: .5 }; n = sh.n; k = p.k; }
    const key = n + ':' + k; return ST.edits[key] || (ST.edits[key] = { z: 0, light: .5 }); }
  // every move is kept: a memory carries the hand performance that made it, and can be played back by the simulated hands
  const rec = (k, a) => { if (!ST.replaying) ST.rec.push({ t: +(performance.now() / 1000).toFixed(2), k, a }); if (ST.rec.length > 4000) ST.rec.shift(); };
  function turn(i, d, why) { const R = ringDefs()[i]; if (!R) return; const n = Math.max(1, R.labels.length); const v = clamp(R.get() + d, 0, n - 1); R.set(v); ST.ring = i; rec('ring', [i, +R.get().toFixed(3)]); log('turn', (why || '') + ' ring ' + (i + 1) + ' ' + R.key + ' -> ' + (R.labels[Math.round(R.get())] || '').trim()); touch('ring' + i); check(); }
  function setRing(i, v) { const R = ringDefs()[i]; if (!R) return; R.set(clamp(v, 0, R.labels.length - 1)); rec('ring', [i, +R.get().toFixed(3)]); ST.ring = i; touch('ring' + i); check(); }
  function setT(t) { t = clamp(t, 0, ST.TL.length - 1); if (t === ST.t) return; ST.t = t; ST.shotClock = 0; const ps = partsOf(curShot()); if (ST.part >= ps.length) ST.part = 0;
    if (ST.mode === 'build' && cur().kind === 'film' && !ST.build.items.some(i => i.src && (i.src.ks || i.src.n === ST.build.ref))) ST.build.ref = cur().n; emit('shot', cur()); }

  /* ---- the ten buttons ---- */
  const BUTTONS = {
    left: [['watch', 'WATCH'], ['cut', 'CUT'], ['build', 'BUILD'], ['zero', 'ZERO'], ['take', 'TAKE']],
    right: [['bug', 'BUG'], ['birthday', 'BIRTHDAY'], ['anything', 'ANYTHING'], ['otherwise', 'OTHERWISE'], ['imprint', 'IMPRINT']]
  };
  function press(k, long) {
    rec('press', [k, !!long]);
    log('press', k + (long ? ' (held)' : ''));
    if (k === 'watch') { if (ST.mode === 'watch') ST.playing = !ST.playing; else { ST.mode = 'watch'; ST.playing = true; } }
    else if (k === 'cut') { ST.mode = 'cut'; ST.playing = false; }
    else if (k === 'build') { if (!ST.build.items.length) startProto('anything'); else ST.mode = 'build'; }
    else if (k === 'zero') { if (ST.mode === 'build') { const p = ST.proto; ST.build.items = []; startProto(p || 'anything'); } else { ST.spread = 0; ST.view = 0; ST.light = .5; ST.iso = 0; } }
    else if (k === 'take') take();
    else if (k === 'bug' || k === 'birthday' || k === 'anything') { if (long) { emit('demo', k); return; } startProto(k); }
    else if (k === 'otherwise') otherwise();
    else if (k === 'imprint') { if (long && cur() && cur().kind === 'mem') { emit('replay', cur()); return; } emit('imprint'); return; }
    touch('press ' + k); check();
  }
  function startProto(k) {
    ST.recFrom = Math.max(0, ST.rec.length - 1);
    const T = TEMPLATES[k]; ST.proto = k; ST.mode = 'build'; ST.playing = false; ST.build.ref = T.ref != null ? T.ref : (curShot() ? curShot().n : 17); ST.build.items = T.items(); ST.build.sel = 0; ST.build.grade = T.ref != null ? T.grade : gradeOf(ST.build.ref);
    const i = ST.TL.findIndex(e => e.kind === 'film' && e.n === ST.build.ref); if (i >= 0 && ST.t !== i) { ST.t = i; emit('shot', cur()); }
    ST.steps = PROTO_STEPS[k] || null; if (ST.steps && ST.step >= ST.steps.length) ST.step = 0; emit('bench'); }
  function take() {
    const sh = curShot(); if (!sh) return; const p = partsOf(sh)[ST.part]; if (!p) return;
    if (!ST.build.items.length || ST.build.ref == null) { ST.proto = 'anything'; ST.build.ref = sh.n; ST.build.items = []; ST.build.grade = gradeOf(sh.n); }
    const it = item('card', { name: partName(sh, p) + ' ' + fmt(sh.start), src: { n: sh.n, k: p.k }, appear: 1, push: .2, size: 1, slide: 0 });
    ST.build.items.push(it); for (const f of facetList(it)) if (it[f[0]] == null) it[f[0]] = f[2];
    const F = facetsOfBuild(); ST.build.sel = Math.max(0, F.findIndex(x => x.it === it)); ST.mode = 'build'; ST.playing = false;
    const i = ST.TL.findIndex(e => e.kind === 'film' && e.n === ST.build.ref); if (i >= 0) { ST.t = i; emit('shot', cur()); } emit('bench'); }
  function otherwise() {
    if (ST.mode !== 'build') { const ps = partsOf(curShot()); ST.part = (ST.part + 1) % Math.max(1, ps.length); return; }
    for (const it of ST.build.items) for (const f of facetList(it)) { const [k, , a, b, step] = f; let v = a + Math.random() * (b - a); if (step) v = Math.round(v); if (k !== 'appear' && k !== 'skin') it[k] = v; }
    emit('bench'); }
  const gradeOf = n => n >= 2 && n <= 11 ? 'forest' : n >= 22 && n <= 29 ? 'birthday' : n <= 1 ? 'night' : 'dome';

  /* ---- the cycle: each builder is taught as the film did it, one step at a time; a step is done when the state says so ---- */
  const it = n => ST.build.items.find(i => i.type === n);
  const curPart = () => partsOf(curShot())[ST.part] || {};
  const PROTO_STEPS = {
    bug: [
      { say: 'TIME: find the beetle on the leaf (00:30)', done: () => ST.mode === 'build' || (cur() && cur().kind === 'film' && (cur().n === 4 || cur().n === 6)) },
      { say: 'PART: pick the beetle', done: () => ST.mode === 'build' || /beetle/.test(curPart().name || '') },
      { say: 'DEPTH: turn to MODEL and see it whole', done: () => ST.mode === 'build' || ST.spread > .85 },
      { say: 'BUG: bring it to the bench', done: () => ST.mode === 'build' && ST.proto === 'bug' },
      { say: 'FACET beetle eye focus, MAKE: rack the eye into focus', done: () => it('beetle') && it('beetle').focus > .8 },
      { say: 'FACET beetle setae, MAKE: grow the hairs', done: () => it('beetle') && it('beetle').setae > .6 },
      { say: 'IMPRINT: lay it beside the film', done: () => ST.mems > 0 && ST.lastMemRef === 6 }],
    birthday: [
      { say: 'TIME: find the birthday (02:32)', done: () => ST.mode === 'build' || (cur() && cur().kind === 'film' && cur().n >= 22 && cur().n <= 29) },
      { say: 'PART: pick the cake', done: () => ST.mode === 'build' || /cake/.test(curPart().name || '') },
      { say: 'DEPTH: open the layers', done: () => ST.mode === 'build' || ST.spread > .4 },
      { say: 'BIRTHDAY: build it on the bench', done: () => ST.mode === 'build' && ST.proto === 'birthday' },
      { say: 'FACET cake candles, MAKE: seven candles', done: () => it('cake') && it('cake').candles === 7 },
      { say: 'FACET cake bundt, MAKE: flute the cake', done: () => it('cake') && it('cake').bundt > .8 },
      { say: 'FACET cake icing, MAKE: write on it', done: () => it('cake') && it('cake').icing > .8 },
      { say: 'FACET child APPEAR: bring the children in', done: () => ST.build.items.filter(i => i.type === 'card').every(c => c.appear > .9) },
      { say: 'LIGHT: warm one child', done: () => ST.build.items.some(c => c.type === 'card' && c.light > .75) },
      { say: 'IMPRINT: lay it beside the film', done: () => ST.mems > 0 && ST.lastMemRef === 24 },
      { say: 'FACET cake flames, MAKE: blow them out', done: () => it('cake') && it('cake').flames < .1 }],
    anything: [
      { say: 'FACET form shape, MAKE: choose a shape', done: () => it('prim') && it('prim').shape > .5 },
      { say: 'CUT a part from any shot and TAKE it', done: () => ST.build.items.some(i => i.type === 'card') },
      { say: 'DEPTH: see your scene as a model', done: () => ST.mode === 'build' && ST.spread > .85 },
      { say: 'IMPRINT: lay it beside the film', done: () => ST.mems > 0 }]
  };
  function check() { const S = ST.steps; if (!S) return; let moved = false; while (ST.step < S.length && S[ST.step].done()) { ST.step++; moved = true; ST.stepAt = performance.now(); }
    if (moved) { log('step', ST.proto + ' step ' + ST.step + '/' + S.length); emit('step', ST.step, S.length); } }
  function addMemory(img, ref, score) { ST.mems++; const m = { kind: 'mem', id: ST.mems, img, ref, score, proto: ST.proto, rec: ST.rec.slice(ST.recFrom || 0) }; let i = ST.TL.findIndex(e => e.kind === 'film' && e.n === ref); if (i < 0) i = ST.t; while (ST.TL[i + 1] && ST.TL[i + 1].kind === 'mem') i++;
    ST.TL.splice(i + 1, 0, m); ST.lastMemRef = ref; ST.score = score; log('imprint', 'memory ' + m.id + ' answers shot ' + ref + ', match ' + score); touch('imprint'); check(); return m; }
  async function load(base) {
    ST.atlas = await (await fetch(base + 'atlas.json')).json();
    // walls, floors, light and leaves are the ground a shot stands on, whatever word named them: they belong to the back wall
    const GROUND = /floor|wall|dome|ceiling|light|haze|tree|foliage|canopy|undergrowth|window|glow|door|booth|panel|arch|rib|shaft|leaf/;
    for (const sh of ST.atlas.shots) for (const p of sh.parts) if (p.kind === 'thing' && GROUND.test(p.name)) p.kind = 'ground'; ST.base = base; ST.TL = ST.atlas.shots.map(s => ({ kind: 'film', n: s.n })); emit('atlas'); }
  // the clock: in WATCH each shot holds for its length in the clip, then the next comes
  function tick(dt) { if (ST.mode === 'watch' && ST.playing && ST.atlas) { ST.shotClock += dt; const e = cur(), len = e.kind === 'film' ? ST.atlas.shots[e.n].end - ST.atlas.shots[e.n].start : 6;
      if (ST.shotClock > len) { setT(ST.t + 1 >= ST.TL.length ? 0 : ST.t + 1); touch('play'); } } }
  window.CORE = { ST, edit, on, emit, touch, ringDefs, turn, setRing, press, BUTTONS, FACETS, SHAPES, startProto, take, addMemory, load, tick, cur, curShot, partsOf, partName, figures, fmt, actOf, gradeOf, facetsOfBuild, check, log, PROTO_STEPS, item };
})();
