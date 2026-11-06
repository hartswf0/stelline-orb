// THE HAND: works the orb through its own controls, one detent at a time, so a film shows a birthday being made, not loaded.
// Injected into cineosis-orb by a film driver. HAND.plan(b) turns a birthday into presses and turns; HAND.tick(dt) is called once per frame.
(function () {
  const F = window.FORGE, S = F.S;
  const Q = []; let wait = 0, cur = null;
  const ringIx = name => F.rings().findIndex(r => r && r.n === name);
  const R = (gap) => ({ gap: gap || .075 });
  // one op at a time; each returns true when finished
  const OPS = {
    press(o) { F.press(o.b); wait = o.after == null ? .35 : o.after; return true; },
    wait(o) { wait = o.s; return true; },
    gain(o) { S.gain = o.g; return true; },
    mode(o) { if (S.mode === o.m) return true; F.press('MODE'); wait = .3; o.n = (o.n || 0) + 1; return o.n > 5; },
    pick(o) { const L = F.things(), want = L.findIndex(t => typeof o.key === 'function' ? o.key(t) : t.key === o.key), at = L.findIndex(t => t.key === S.pick); if (want < 0) return true;
      if (want === at) { wait = .25; return true; } F.turn(0, Math.sign(want - at)); wait = Math.abs(want - at) > 3 ? .05 : .11; return false; },
    shelf(o) { const SH = F.shelves(), si = SH.findIndex(s => s.n === o.shelf); if (si < 0) return true;
      if (S.add.s !== si) { F.turn(0, Math.sign(si - S.add.s)); wait = .14; return false; }
      const ii = SH[si].items.findIndex(x => x.key === o.key); if (ii < 0) return true;
      if (S.add.i !== ii) { const d = ii - S.add.i; F.turn(1, Math.sign(d)); wait = Math.abs(d) > 6 ? .045 : .1; return false; } wait = .4; return true; },
    set(o) { const i = ringIx(o.ring); if (i < 0) return true; const r = F.rings()[i]; let v = r.v(), to = typeof o.to === 'function' ? o.to() : o.to;
      if (r.wrap) { const sp = r.hi - r.lo; let d = ((to - v) % sp + sp) % sp; if (d > sp / 2) d -= sp; to = v + d; }
      const g = r.step ? 1 : S.gain, st = r.st * g; if (Math.abs(to - v) <= st * .5 + 1e-9) { wait = .2; return true; }
      F.turn(i, Math.sign(to - v)); const left = Math.abs(to - v) / st; wait = left > 8 ? .042 : left > 3 ? .07 : .12; return false; },
    js(o) { o.f(); return true; } };
  function tick(dt) { dt *= window.HAND.speed; if (wait > 0) { wait -= dt; return; } while (true) { if (!cur) cur = Q.shift(); if (!cur) return; const done = OPS[cur.op](cur); if (done) { cur = null; if (wait > 0) return; } else return; } }
  // a birthday, made from nothing: table, cake, candles, the things on the table, the people, the light, then the place and its year
  function plan(b, opt) { opt = opt || {}; const P = [], add = (shelf, key) => { P.push({ op: 'press', b: 'ADD', after: .45 }, { op: 'shelf', shelf, key }, { op: 'press', b: 'ADD', after: .7 }); };
    const place = (x, z, up) => { P.push({ op: 'mode', m: 'PLACE' }, { op: 'gain', g: 4 }, { op: 'set', ring: 'ACROSS', to: x }); if (up != null) P.push({ op: 'set', ring: 'UP', to: up }); else P.push({ op: 'set', ring: 'DEPTH', to: z }); P.push({ op: 'gain', g: 1 }); };
    P.push({ op: 'wait', s: .4 });
    if (!opt.keepTable) { add('TABLE', 'table'); P.push({ op: 'mode', m: 'STYLE' }, { op: 'set', ring: 'WOOD', to: b.title.length % 4 }, { op: 'set', ring: 'OUTLINE', to: b.title.length % 3 === 0 ? 1 : 0 }); }
    add('CAKES', 'cake:' + b.cake);
    if (b.candles && b.candles[0]) { add('ON THE CAKE', 'candles'); P.push({ op: 'mode', m: 'STYLE' }, { op: 'set', ring: 'KIND', to: b.candles[1] }, { op: 'set', ring: 'COUNT', to: b.candles[0] }); }
    (b.props || []).forEach(([ref, x, z, c]) => { add('PROPS', 'prop:' + ref); if (c) P.push({ op: 'mode', m: 'STYLE' }, { op: 'set', ring: 'COLOUR', to: c }); place(x, z, (typeof PROPS !== 'undefined' && PROPS[ref] === 'AIR') ? .3 : null); });
    (b.people || []).forEach(([ref, x, z, size, plane]) => { const e = F.CAT.find(c => c.id === ref); if (!e) return; const shelf = { film: 'FROM THE FILM', cast: 'CAST', moving: 'MOVING', still: 'STILLS' }[e.kind];
      add(shelf, 'cut:' + ref); if (plane) P.push({ op: 'mode', m: 'STYLE' }, { op: 'set', ring: 'PLANE', to: () => ['TABLE', 'FLOOR', 'AIR', 'BACK', 'FLAT'].indexOf(plane) });
      if (e.kind !== 'film') place(x, z, plane === 'AIR' ? .35 : null); if (size && Math.abs(size - 1) > .04) P.push({ op: 'mode', m: 'PLACE' }, { op: 'set', ring: 'SIZE', to: size });
      if (x > 0 && e.kind !== 'film') P.push({ op: 'mode', m: 'STYLE' }, { op: 'set', ring: 'FACING', to: 1 }); });
    const [a, h, w, k] = b.light; P.push({ op: 'pick', key: 'light' }, { op: 'mode', m: 'PLACE' }, { op: 'set', ring: 'AROUND', to: a }, { op: 'set', ring: 'HEIGHT', to: h }, { op: 'mode', m: 'STYLE' }, { op: 'set', ring: 'WARMTH', to: w });
    const [pl, era, mist, mess] = b.room; P.push({ op: 'pick', key: 'room' }, { op: 'mode', m: 'STYLE' }, { op: 'set', ring: 'MESS', to: mess });
    if (pl) P.push({ op: 'set', ring: 'PLACE', to: () => [null, ...F.CAT.filter(c => c.kind === 'place').map(c => c.id)].indexOf(pl) });
    P.push({ op: 'set', ring: 'ERA', to: era }, { op: 'set', ring: 'MIST', to: mist }, { op: 'js', f: () => { F.DOC.title = b.title; F.DOC.line = b.line; } }, { op: 'pick', key: 'cake' }, { op: 'mode', m: 'PLACE' });
    return P; }
  // the memory let go: the room's mist rises until the birthday is points of light, then the dome is empty again
  function dissolve() { return [{ op: 'pick', key: 'room' }, { op: 'mode', m: 'STYLE' }, { op: 'gain', g: 4 }, { op: 'set', ring: 'MIST', to: 1 }, { op: 'gain', g: 1 }, { op: 'wait', s: .9 },
    { op: 'js', f: () => { setDoc(DOC0()); S.pick = null; S.add = null; } }, { op: 'wait', s: .5 }]; }
  window.HAND = { Q, plan, tick, speed: 1, dissolve() { Q.push(...dissolve()); }, run(b, opt) { Q.push(...plan(b, opt)); }, busy: () => !!cur || Q.length > 0 || wait > 0, clear() { Q.length = 0; cur = null; wait = 0; } };
})();
