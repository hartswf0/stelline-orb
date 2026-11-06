/* ORB TOOL core: the memory state. One JSON object; see core/SCHEMA.md. Browser global CORE_STATE, node module.exports. */
(function (root) {
  'use strict';
  const SELECTIONS = ['cake', 'make', 'inscription', 'candles', 'child-1', 'child-2', 'child-3', 'room'];
  const PLACES = ['dome', 'room', 'forest'], LOOKS = ['film', 'plain', 'holo'], FORMS = ['drum', 'dome'];
  const STAGES = ['nothing', 'sponge', 'frosted', 'decorated', 'finished'];
  // the film's five cakes, in the order the knurl steps through them (from ana/index.html)
  const FILM_CAKES = [
    { name: 'chocolate, orange top', genome: { form: 'drum', side: '#3b2014', top: '#d9782c', dots: 1, height: 0.1, radius: 0.12, layers: 1 } },
    { name: 'mint', genome: { form: 'drum', side: '#8fd0bd', top: '#c5ecdf', dots: 1, height: 0.1, radius: 0.12, layers: 1 } },
    { name: 'red-orange', genome: { form: 'drum', side: '#b3412a', top: '#e46c3c', dots: 1, height: 0.1, radius: 0.12, layers: 1 } },
    { name: 'brown dome', genome: { form: 'dome', side: '#6a4326', top: '#7d5230', dots: 0, height: 0.1, radius: 0.12, layers: 1 } },
    { name: 'sponge, white beads', genome: { form: 'drum', side: '#e2c286', top: '#f1dca9', dots: 1, height: 0.1, radius: 0.12, layers: 1 } }];
  FILM_CAKES.forEach(c => { c.source = 'film: the birthday memory, Blade Runner 2049 (cake swap as read in ana/index.html)'; });
  const FILM = { by: 'film', from: 'the birthday memory in Blade Runner 2049, as read in ana/index.html' };
  const clone = o => JSON.parse(JSON.stringify(o));
  function person(i) { const a = [-0.5, 0, 0.5][i - 1] || 0; return { id: 'child-' + i, kind: 'child', arrived: 0, offset: 0, x: +(a * 0.85).toFixed(2), z: -0.55 + Math.abs(a) * 0.1 }; }
  function empty() {
    return {
      v: 1,
      scene: { place: 'dome', light: 6, look: 'film' },
      cake: { kind: -1, stage: 0, tilt: 0, genome: clone(FILM_CAKES[0].genome) },
      inscription: { text: '生日快乐', written: 0 },
      candles: { count: 7, lit: 7 },
      table: { up: 0 },
      people: [person(1), person(2), person(3)],
      props: [],
      camera: { yaw: 0, kneel: 6, focus: 'cake' },
      time: { hold: false, off: false, blown: false },
      selection: 'cake',
      library: clone(FILM_CAKES),
      proposals: [],
      marks: [],
      seq: 0
    };
  }
  // the start the tool opens on (AUDIT R1: never start empty): the film's birthday, whole, candles lit, not yet blown
  function birthday() { const s = empty(); s.cake.kind = 3; s.cake.stage = 4; s.cake.genome = clone(FILM_CAKES[3].genome); s.inscription.written = 24; s.table.up = 1;
    s.people.forEach(p => { p.arrived = 10; p.source = clone(FILM); }); s.camera.kneel = 8;
    for (const k of ['cake', 'inscription', 'candles', 'table']) s[k].source = clone(FILM); return s; }
  // the settable paths: [pattern, kind, min, max, step]; min/max may be functions of state
  const PATHS = [
    ['cake.kind', 'int', -1, s => s.library.length - 1, 1],
    ['cake.stage', 'int', 0, 4, 1],
    ['cake.tilt', 'int', -2, 10, 1],
    ['cake.genome.dots', 'num', 0, 1, 0.1],
    ['cake.genome.height', 'num', 0.06, 0.16, 0.01],
    ['cake.genome.radius', 'num', 0.08, 0.16, 0.01],
    ['cake.genome.layers', 'int', 1, 3, 1],
    ['cake.genome.form', 'enum', FORMS],
    ['cake.genome.side', 'color'], ['cake.genome.top', 'color'],
    ['inscription.written', 'int', 0, 24, 1],
    ['inscription.text', 'text', 12],
    ['candles.count', 'int', 0, 12, 1],
    ['candles.lit', 'int', 0, s => s.candles.count, 1],
    ['table.up', 'int', 0, 1, 1],
    ['people.*.arrived', 'int', 0, 10, 1],
    ['people.*.offset', 'int', -12, 12, 1],
    ['people.*.x', 'num', -1.5, 1.5, 0.05], ['people.*.z', 'num', -1.5, 1.5, 0.05],
    ['props.*.x', 'num', -1.5, 1.5, 0.05], ['props.*.z', 'num', -1.5, 1.5, 0.05],
    ['props.*.scale', 'num', 0.2, 3, 0.1],
    ['camera.yaw', 'int', -180, 180, 5],
    ['camera.kneel', 'int', 0, 10, 1],
    ['camera.focus', 'id'],
    ['scene.place', 'enum', PLACES],
    ['scene.light', 'int', 0, 10, 1],
    ['scene.look', 'enum', LOOKS]];
  function spec(path) {
    for (const p of PATHS) { const a = p[0].split('.'), b = path.split('.'); if (a.length !== b.length) continue; let ok = true; for (let i = 0; i < a.length; i++) if (a[i] !== '*' && a[i] !== b[i]) { ok = false; break; } if (ok) return { pattern: p[0], kind: p[1], a: p[2], b: p[3], step: p[4] }; }
    return null; }
  // resolve a path to [parent object, key]; arrays of things are addressed by id
  function locate(s, path) {
    const parts = path.split('.'); let o = s;
    for (let i = 0; i < parts.length - 1; i++) { const k = parts[i];
      if (Array.isArray(o)) o = o.find(x => x.id === k); else o = o[k];
      if (o == null || typeof o !== 'object') return null; }
    const last = parts[parts.length - 1]; if (Array.isArray(o) || !(last in o)) return null; return [o, last]; }
  function get(s, path) { const L = locate(s, path); return L ? L[0][L[1]] : undefined; }
  const rng = (v, s) => typeof v === 'function' ? v(s) : v;
  // clamp and round a value for a path; returns { value } or { error }
  function coerce(s, path, value) {
    const sp = spec(path); if (!sp) return { error: 'unknown path ' + path };
    if (!locate(s, path)) return { error: 'nothing at ' + path };
    if (sp.kind === 'int' || sp.kind === 'num') { let v = typeof value === 'string' && value.trim() !== '' ? Number(value) : value; if (typeof v === 'boolean') v = v ? 1 : 0;
      if (typeof v !== 'number' || !isFinite(v)) return { error: path + ' needs a number' };
      const lo = rng(sp.a, s), hi = rng(sp.b, s); v = Math.max(lo, Math.min(hi, v));
      v = sp.kind === 'int' ? Math.round(v) : +(Math.round(v / sp.step) * sp.step).toFixed(4); return { value: v, spec: sp }; }
    if (sp.kind === 'enum') { if (typeof value === 'number') value = sp.a[((Math.round(value) % sp.a.length) + sp.a.length) % sp.a.length]; return sp.a.includes(value) ? { value, spec: sp } : { error: path + ' is one of ' + sp.a.join(', ') }; }
    if (sp.kind === 'color') return /^#[0-9a-f]{6}$/i.test(value) ? { value: value.toLowerCase(), spec: sp } : { error: path + ' needs #rrggbb' };
    if (sp.kind === 'text') return typeof value === 'string' && [...value].length <= sp.a ? { value, spec: sp } : { error: path + ' needs text of at most ' + sp.a + ' characters' };
    if (sp.kind === 'id') return typeof value === 'string' && (value === 'cake' || s.people.some(p => p.id === value) || s.props.some(p => p.id === value)) ? { value, spec: sp } : { error: 'no such thing to focus: ' + value };
    return { error: 'bad path' }; }
  // every settable path present in a state (for the machine and for ORB.paths())
  function allPaths(s) { const out = [];
    for (const p of PATHS) { if (p[0].startsWith('people.*')) s.people.forEach(q => out.push(p[0].replace('*', q.id)));
      else if (p[0].startsWith('props.*')) s.props.forEach(q => out.push(p[0].replace('*', q.id))); else out.push(p[0]); }
    return out.map(path => { const sp = spec(path); return { path, kind: sp.kind, min: typeof sp.a === 'function' ? sp.a(s) : sp.a, max: typeof sp.b === 'function' ? sp.b(s) : sp.b, step: sp.step }; }); }
  const API = { empty, birthday, FILM, clone, spec, locate, get, coerce, allPaths, PATHS, SELECTIONS, PLACES, LOOKS, FORMS, STAGES, FILM_CAKES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CORE_STATE = API;
})(typeof window !== 'undefined' ? window : globalThis);
