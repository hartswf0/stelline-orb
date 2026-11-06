/* ORB TOOL core: what the device's rings and buttons do, as ops. Pure (no drawing), so node tests can drive the device.
   Rings: 0 SCALE (where you kneel around the memory), 1 KNEEL (how low), 2 KNURL (the selection's value), 3 TRIANGLES (its second value).
   Browser global CORE_DEVMAP; node module.exports. */
(function (root) {
  'use strict';
  const S = typeof module !== 'undefined' && module.exports ? require('./state.js') : root.CORE_STATE;
  const RINGS = [{ id: 'scale', title: 'SCALE' }, { id: 'kneel', title: 'KNEEL' }, { id: 'knurl', title: 'KNURL' }, { id: 'tri', title: 'TRIANGLES' }];
  const BUTTONS = { left: [['undo', 'UNDO'], ['redo', 'REDO'], ['keep', 'KEEP'], ['breed', 'BREED'], ['save', 'SAVE']], right: [['select', 'SELECT'], ['hold', 'HOLD'], ['make', 'MAKE'], ['accept', 'ACCEPT'], ['ask', 'ASK']] };
  // which path a ring sets for the current selection, and what to call it
  const TABLE = {
    cake: [['cake.kind', 'WHICH CAKE'], ['cake.tilt', 'TILT']],
    make: [['cake.stage', 'MAKING'], ['cake.genome.height', 'HEIGHT']],
    inscription: [['inscription.written', 'THE INSCRIPTION'], ['cake.tilt', 'TILT']],
    candles: [['candles.count', 'CANDLES'], ['candles.lit', 'LIT']],
    room: [['scene.light', 'LIGHT'], ['scene.place', 'PLACE']]
  };
  function role(s, ring) {
    if (ring === 0) return { path: 'camera.yaw', name: 'WHERE YOU KNEEL' };
    if (ring === 1) return { path: 'camera.kneel', name: 'HOW LOW' };
    const sel = s.selection; let row = TABLE[sel];
    if (!row && /^child-/.test(sel)) row = [['people.' + sel + '.arrived', 'ARRIVING'], ['people.' + sel + '.offset', 'HER TIME']];
    if (!row) return null; const [path, name] = row[ring - 2]; return S.locate(s, path) ? { path, name } : null; }
  // the value a ring would reach after `detents` clicks from `cur`
  function stepValue(s, path, cur, detents) { const sp = S.spec(path);
    if (sp.kind === 'enum') { const i = sp.a.indexOf(cur), n = sp.a.length; return sp.a[(((i + detents) % n) + n) % n]; }
    let v = cur + detents * sp.step;
    if (path === 'camera.yaw') v = ((v + 180) % 360 + 360) % 360 - 180;   // the scale ring goes all the way round
    return v; }
  // a hand turning a ring by whole detents: one `set` (merged per gesture), or an amend of the agent's ghost on the same path
  function turn(orb, ring, detents, meta) {
    meta = Object.assign({ author: 'hand' }, meta || {}); detents = Math.round(detents); if (!detents) return { ok: true, same: true };
    const s = orb.raw(), r = role(s, ring); if (!r) return { ok: false, error: 'this ring does nothing for ' + s.selection };
    const ghost = s.proposals.find(p => p.op === 'set' && p.args.path === r.path);
    if (ghost) return orb.do({ op: 'amend', args: { id: ghost.id, args: { value: clampFor(s, r.path, stepValue(s, r.path, ghost.args.value, detents)) } } }, meta);
    return orb.do({ op: 'set', args: { path: r.path, value: stepValue(s, r.path, S.get(s, r.path), detents) } }, meta); }
  function clampFor(s, path, v) { const c = S.coerce(s, path, v); return c.error ? v : c.value; }
  // a button press; long is a press held past 650 ms. Returns the bus result, or { ui } for what the shell does itself
  function press(orb, id, long, meta) {
    meta = Object.assign({ author: 'hand' }, meta || {}); const s = orb.raw();
    switch (id) {
      case 'select': return orb.do({ op: 'select', args: { by: long ? -1 : 1 } }, meta);
      case 'hold': if (s.time.off) return orb.do({ op: 'switchOn', args: {} }, meta);
        if (long) return orb.do({ op: 'switchOff', args: {} }, meta);
        return orb.do({ op: s.time.hold ? 'release' : 'hold', args: {} }, meta);
      case 'make': return orb.do(long ? { op: 'make', args: { to: 0 } } : { op: 'make', args: {} }, meta);
      case 'accept': return s.proposals.length ? orb.do({ op: long ? 'reject' : 'accept', args: {} }, meta) : { ok: false, error: 'no proposal waiting' };
      case 'undo': return long ? orb.seek(0) : orb.do({ op: 'undo', args: {} }, meta);
      case 'redo': return long ? orb.seek(orb.history().length) : orb.do({ op: 'redo', args: {} }, meta);
      case 'keep': return orb.do({ op: 'keep', args: {} }, meta);
      case 'breed': { const n = s.library.length, a = s.cake.kind >= 0 ? s.cake.kind : (s.seq % n), b = (a + 1 + (s.seq % (n - 1 || 1))) % n;
        return orb.do({ op: 'breed', args: { a, b: b === a ? (a + 1) % n : b, seed: s.seq + 1 } }, meta); }
      case 'save': return { ok: true, ui: long ? 'load' : 'save' };
      case 'ask': return { ok: true, ui: 'ask' };
    }
    return { ok: false, error: 'no button ' + id }; }
  const API = { RINGS, BUTTONS, TABLE, role, turn, press, stepValue };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CORE_DEVMAP = API;
})(typeof window !== 'undefined' ? window : globalThis);
