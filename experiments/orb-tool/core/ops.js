/* ORB TOOL core: the operation set. Each op is apply(state, args) -> null or an error string; it mutates the state it is given
   (the bus hands it a copy and throws the copy away on an error, so a refused op changes nothing). See core/SCHEMA.md. */
(function (root) {
  'use strict';
  const S = typeof module !== 'undefined' && module.exports ? require('./state.js') : root.CORE_STATE;
  const isObj = a => a && typeof a === 'object' && !Array.isArray(a);
  function setPath(s, path, value) {
    if (typeof path !== 'string') return 'set needs a path';
    const c = S.coerce(s, path, value); if (c.error) return c.error;
    const [o, k] = S.locate(s, path); o[k] = c.value;
    // consequences that belong to the state, not the renderer
    if (path === 'cake.kind') { if (c.value >= 0) { s.cake.genome = S.clone(s.library[c.value].genome); if (s.cake.stage === 0) s.cake.stage = 4; } else if (c.value === -1) s.cake.stage = 0; }
    if (path === 'candles.count') s.candles.lit = Math.min(s.candles.lit, c.value);
    if (path === 'candles.lit' && c.value > 0) s.time.blown = false;
    if (/^cake\.genome\./.test(path) && s.cake.kind >= 0) s.cake.kind = -2;   // an edited genome is no longer the library's
    if (/^people\..*\.arrived$/.test(path) && c.value > 0) s.table.up = 1;
    return null; }
  // a small deterministic generator for breeding
  function rand(seed) { let t = (seed >>> 0) || 1; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), unhex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const OPS = {
    select(s, a) { if (!isObj(a)) return 'select needs { target } or { by }';
      if (a.by != null) { const i = S.SELECTIONS.indexOf(s.selection), n = S.SELECTIONS.length; s.selection = S.SELECTIONS[(((i + Math.round(a.by)) % n) + n) % n]; return null; }
      if (!S.SELECTIONS.includes(a.target)) return 'select target is one of ' + S.SELECTIONS.join(', ');
      s.selection = a.target; return null; },
    set(s, a) { if (!isObj(a)) return 'set needs { path, value }'; return setPath(s, a.path, a.value); },
    nudge(s, a) { if (!isObj(a) || typeof a.path !== 'string' || typeof a.by !== 'number' || !isFinite(a.by)) return 'nudge needs { path, by }';
      const sp = S.spec(a.path); if (!sp) return 'unknown path ' + a.path; const cur = S.get(s, a.path); if (cur === undefined) return 'nothing at ' + a.path;
      if (sp.kind === 'enum') { const i = sp.a.indexOf(cur); return setPath(s, a.path, sp.a[(((i + Math.round(a.by)) % sp.a.length) + sp.a.length) % sp.a.length]); }
      if (typeof cur !== 'number') return a.path + ' cannot be nudged'; return setPath(s, a.path, cur + a.by * sp.step); },
    add(s, a) { if (!isObj(a)) return 'add needs { kind }'; const kind = a.kind;
      if (kind !== 'child' && kind !== 'prop') return "add kind is 'child' or 'prop'";
      const list = kind === 'child' ? s.people : s.props, pre = kind === 'child' ? 'child-' : 'prop-';
      let id = a.id; if (id != null && (typeof id !== 'string' || !/^[a-z0-9-]{1,24}$/.test(id))) return 'id is lower-case letters, digits and dashes';
      if (!id) { let n = list.length + 1; while (s.people.concat(s.props).some(q => q.id === pre + n)) n++; id = pre + n; }
      if (s.people.concat(s.props).some(q => q.id === id)) return 'id ' + id + ' is taken';
      const num = (v, d) => typeof v === 'number' && isFinite(v) ? Math.max(-1.5, Math.min(1.5, v)) : d;
      if (kind === 'child') s.people.push({ id, kind: 'child', arrived: Math.max(0, Math.min(10, Math.round(a.arrived || 0))), offset: 0, x: num(a.x, 0.9), z: num(a.z, -0.3) });
      else s.props.push({ id, kind: typeof a.propKind === 'string' ? a.propKind.slice(0, 24) : 'box', x: num(a.x, 0.3), z: num(a.z, 0.2), scale: typeof a.scale === 'number' ? Math.max(0.2, Math.min(3, a.scale)) : 1 });
      s.seq++; return null; },
    remove(s, a) { if (!isObj(a) || typeof a.id !== 'string') return 'remove needs { id }';
      for (const list of [s.people, s.props]) { const i = list.findIndex(q => q.id === a.id); if (i >= 0) { list.splice(i, 1); if (s.camera.focus === a.id) s.camera.focus = 'cake'; if (s.selection === a.id) s.selection = 'cake'; return null; } }
      return 'nothing called ' + a.id; },
    make(s, a) { a = a || {}; if (a.to != null) return setPath(s, 'cake.stage', a.to); if (s.cake.stage >= 4) return 'the cake is finished';
      if (s.cake.kind === -1) s.cake.kind = -2; s.cake.stage++; return null; },
    breed(s, a) { if (!isObj(a)) return 'breed needs { a, b, seed }'; const A = s.library[a.a], B = s.library[a.b]; if (!A || !B) return 'breed a and b are library indexes 0..' + (s.library.length - 1);
      const r = rand(a.seed == null ? s.seq + 1 : a.seed), ga = A.genome, gb = B.genome, mixc = (x, y) => { const p = hex(x), q = hex(y), t = r(); return unhex(p.map((v, i) => v + (q[i] - v) * t + (r() - 0.5) * 30)); };
      const g = { form: r() < 0.5 ? ga.form : gb.form, side: mixc(ga.side, gb.side), top: mixc(ga.top, gb.top), dots: +Math.min(1, Math.max(0, (r() < 0.5 ? ga.dots : gb.dots) + (r() - 0.5) * 0.4)).toFixed(1),
        height: +Math.min(0.16, Math.max(0.06, (ga.height + gb.height) / 2 + (r() - 0.5) * 0.04)).toFixed(2), radius: +Math.min(0.16, Math.max(0.08, (ga.radius + gb.radius) / 2 + (r() - 0.5) * 0.03)).toFixed(2),
        layers: Math.max(1, Math.min(3, Math.round((ga.layers + gb.layers) / 2 + (r() - 0.5) * 2))) };
      s.cake.genome = g; s.cake.kind = -2; if (s.cake.stage === 0) s.cake.stage = 4; s.seq++; return null; },
    keep(s, a) { a = a || {}; if (s.cake.stage === 0) return 'there is no cake to keep'; if (s.library.length >= 64) return 'the library is full';
      s.library.push({ name: typeof a.name === 'string' && a.name ? a.name.slice(0, 32) : 'kept ' + (s.library.length - 4), genome: S.clone(s.cake.genome) }); s.cake.kind = s.library.length - 1; return null; },
    write(s, a) { if (!isObj(a) || typeof a.text !== 'string') return 'write needs { text }'; const e = setPath(s, 'inscription.text', a.text); if (e) return e; s.inscription.written = 24; return null; },
    candles(s, a) { if (!isObj(a)) return 'candles needs { count }'; const e = setPath(s, 'candles.count', a.count); if (e) return e; s.candles.lit = s.candles.count; s.time.blown = false; return null; },
    hold(s) { s.time.hold = true; return null; },
    release(s) { s.time.hold = false; if (s.people.filter(p => p.kind === 'child').slice(0, 3).every(p => p.arrived >= 10) && s.candles.lit > 0 && s.cake.stage > 0) { s.candles.lit = 0; s.time.blown = true; } return null; },
    blow(s) { if (s.cake.stage === 0) return 'there is no cake'; if (s.candles.lit === 0) return 'no candle is lit'; s.candles.lit = 0; s.time.blown = true; return null; },
    switchOff(s) { s.time.off = true; return null; },
    switchOn(s) { s.time.off = false; return null; },
    look(s, a) { if (!isObj(a)) return 'look needs { look, place, light }'; let any = false;
      for (const [k, p] of [['look', 'scene.look'], ['place', 'scene.place'], ['light', 'scene.light']]) if (a[k] != null) { const e = setPath(s, p, a[k]); if (e) return e; any = true; }
      return any ? null : 'look needs look, place or light'; },
    camera(s, a) { if (!isObj(a)) return 'camera needs { yaw, kneel, focus, turn }'; let any = false;
      if (a.turn != null) { if (typeof a.turn !== 'number') return 'turn needs degrees'; let y = s.camera.yaw + a.turn; y = ((y + 180) % 360 + 360) % 360 - 180; const e = setPath(s, 'camera.yaw', y); if (e) return e; any = true; }
      for (const k of ['yaw', 'kneel', 'focus']) if (a[k] != null) { const e = setPath(s, 'camera.' + k, a[k]); if (e) return e; any = true; }
      return any ? null : 'camera needs yaw, kneel, focus or turn'; },
    propose(s, a, ctx) { if (!isObj(a) || typeof a.op !== 'string') return 'propose needs { op, args }';
      if (!PROPOSABLE.includes(a.op)) return 'cannot propose ' + a.op;
      const trial = S.clone(s), e = OPS[a.op](trial, a.args || {}); if (e) return 'the proposal would fail: ' + e;
      s.seq++; s.proposals.push({ id: 'p' + s.seq, op: a.op, args: S.clone(a.args || {}), author: (ctx && ctx.author) || 'agent:api', note: typeof a.note === 'string' ? a.note.slice(0, 120) : '' }); return null; },
    amend(s, a) { if (!isObj(a) || !isObj(a.args)) return 'amend needs { id, args }'; const p = s.proposals.find(q => q.id === a.id); if (!p) return 'no proposal ' + a.id;
      const args = Object.assign(S.clone(p.args), a.args), trial = S.clone(s), e = OPS[p.op](trial, args); if (e) return e; p.args = args; return null; },
    accept(s, a, ctx) { a = a || {}; const i = a.id ? s.proposals.findIndex(q => q.id === a.id) : 0; const p = s.proposals[i]; if (!p) return 'no proposal to accept';
      s.proposals.splice(i, 1); const e = OPS[p.op](s, p.args, ctx); if (e) return e; if (ctx) ctx.via = p.id; return null; },
    reject(s, a) { a = a || {}; const i = a.id ? s.proposals.findIndex(q => q.id === a.id) : 0; if (!s.proposals[i]) return 'no proposal to reject'; s.proposals.splice(i, 1); return null; },
    snapshot(s, a, ctx) { if (!isObj(a) || typeof a.name !== 'string' || !a.name) return 'snapshot needs { name }'; s.marks.push({ name: a.name.slice(0, 32), at: ctx && ctx.at != null ? ctx.at : 0 }); return null; },
    load(s, a) { if (!isObj(a) || !isObj(a.memory)) return 'load needs { memory }'; const m = a.memory.state || a.memory; const err = check(m); if (err) return 'not a memory: ' + err;
      for (const k of Object.keys(s)) delete s[k]; Object.assign(s, S.clone(m)); return null; },
    reset(s) { const e = S.empty(); for (const k of Object.keys(s)) delete s[k]; Object.assign(s, e); return null; }
  };
  const PROPOSABLE = ['select', 'set', 'nudge', 'add', 'remove', 'make', 'breed', 'keep', 'write', 'candles', 'hold', 'release', 'blow', 'switchOff', 'switchOn', 'look', 'camera'];
  // a loaded memory must have the shape of the state
  function check(m) { if (!isObj(m)) return 'not an object'; const e = S.empty();
    for (const k of Object.keys(e)) { if (!(k in m)) return 'missing ' + k; if (Array.isArray(e[k]) !== Array.isArray(m[k]) || typeof e[k] !== typeof m[k]) return k + ' has the wrong type'; }
    if (!m.library.length) return 'empty library'; return null; }
  const META = ['undo', 'redo'];
  const NAMES = Object.keys(OPS).concat(META);
  // a short plain label for the history strip
  function label(op, args) { args = args || {};
    switch (op) { case 'set': return args.path + ' ' + JSON.stringify(args.value); case 'nudge': return args.path + (args.by > 0 ? ' +' : ' ') + args.by;
      case 'select': return 'select ' + (args.target || (args.by > 0 ? 'next' : 'previous')); case 'propose': return 'propose ' + label(args.op, args.args);
      case 'write': return 'write ' + args.text; case 'candles': return 'candles ' + args.count; case 'add': return 'add ' + args.kind; case 'remove': return 'remove ' + args.id;
      case 'camera': return 'camera ' + Object.keys(args).map(k => k + ' ' + args[k]).join(' '); case 'look': return 'look ' + Object.keys(args).map(k => args[k]).join(' ');
      default: return op; } }
  const API = { OPS, NAMES, META, PROPOSABLE, label, check };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CORE_OPS = API;
})(typeof window !== 'undefined' ? window : globalThis);
