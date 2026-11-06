/* ORB TOOL agent: the text command language for memories.
   One short line per command; several on a line are separated by ';'. parse(line, state) compiles a line to
   an op, a list of ops (applied as one history entry), or one of:
     { error }            the line is not understood; the text says what was expected
     { help }             text to show (help, help <command>)
     { describe: true }   the caller should show ORB.describe()
     { wait: seconds }    for scripts: pause before the next line
   Ops are the core's ({ op, args }, core/SCHEMA.md). The state is used to resolve names (cake names to library
   indexes, child numbers, pending proposals) and to give errors that name what exists.
   Browser: window.ORB_COMMANDS. Node: module.exports. */
(function (root) {
  'use strict';

  const STAGES = ['nothing', 'sponge', 'frosted', 'decorated', 'finished'];
  const STAGE_WORDS = { nothing: 0, none: 0, empty: 0, base: 1, sponge: 1, bake: 1, layers: 1, frost: 2, frosted: 2, icing: 2, ice: 2, cream: 2,
    decorate: 3, decorated: 3, beads: 3, dots: 3, pipe: 3, finish: 4, finished: 4, done: 4, whole: 4 };
  const COLOURS = { white: '#f2ece0', cream: '#f1dca9', brown: '#6a4326', chocolate: '#3b2014', orange: '#d9782c', mint: '#8fd0bd', green: '#5f9a5a',
    red: '#b3412a', pink: '#e8a3b4', yellow: '#e8c35a', blue: '#5a7fb8', black: '#151110', gold: '#c9a043' };
  const SELECTIONS = ['cake', 'make', 'inscription', 'candles', 'child-1', 'child-2', 'child-3', 'room'];
  const FPS = 24;   // a child's offset is in frames of her performance; 'later 0.5' is half a second = 12 frames

  // ---------- help: one line per command, used for 'help' and in errors ----------
  const HELP = [
    ['cake', 'cake <name>                the film\'s swap: that cake, whole (cake brown-dome, cake mint, cake 3)', 'cake target <name>         make toward that cake, keeping the making stage (cake target brown-dome)', 'cake none                  no cake', 'cake tilt <-2..10>         tilt toward her, 3 degrees a step', 'cake form dome|drum, cake side <colour>, cake top <colour>, cake dots <0..1>, cake height <0.06..0.16>, cake radius <0.08..0.16>, cake layers <1..3>'],
    ['make', 'make                       the next making step', 'make sponge|frosted|decorated|finished|nothing   make up to that stage (or 0..4)'],
    ['write', 'write <text>               the inscription, written in stroke by stroke (write 生日快乐)', 'ink <0..24>                how much of it is written'],
    ['candles', 'candles <0..12>            that many candles, all lit', 'light <n>|light all        how many are lit (candles lit <n> also works)'],
    ['table', 'table up|down'],
    ['child', 'child <n> arrive [0..1]    she arrives (1 = solid); child <n> gone', 'child <n> later <s>        her performance starts s seconds later (earlier <s> for before; up to 0.5)', 'child <n> at <x> <z>       where she stands (metres)', 'children arrive            all of them', 'add child [x z], add prop <kind> [x z] [scale], remove <id>'],
    ['camera', 'turn <degrees>             turn the view (turn -20)', 'yaw <degrees>              the view from that angle (0 = in front)', 'kneel <0..1 or 0..10>      how low she kneels (kneel 0.4 = kneel 4); stand', 'focus <cake|child-n|prop-n>'],
    ['scene', 'place dome|room|forest, look film|plain|holo, brightness <0..10>'],
    ['time', 'hold                       freeze every performance', 'release                    let go (blows the candles when all three are there and the candles are lit)', 'blow                       blow the candles out', 'off, on                    switch the memory off / on'],
    ['select', 'select <cake|make|inscription|candles|child-n|room>, next, previous   what the rings work on'],
    ['library', 'breed <a> <b> [seed]       mix two cakes of the library (names or numbers)', 'keep [name]                keep this cake in the library'],
    ['work', 'propose <command>          suggest it as a ghost; the person accepts or turns it', 'accept [p<n>], reject [p<n>], amend p<n> <value>', 'undo [n], redo [n], mark <name>, reset'],
    ['agent', 'describe                   a plain account of the memory', 'set <path> <value>, nudge <path> <by>, or a JSON op {"op":...,"args":...}', 'help [command]']];
  function help(topic) {
    if (topic) { const t = topic.toLowerCase(), alias = ALIAS[t] || t;
      const sec = HELP.find(h => h[0] === alias) || HELP.find(h => h.slice(1).some(l => l.split(/\s+/)[0] === t));
      if (sec) return sec.slice(1).join('\n');
      return 'no help for ' + topic + '. Topics: ' + HELP.map(h => h[0]).join(', '); }
    return ['COMMANDS (one per line; separate several with ;)'].concat(HELP.map(h => h.slice(1).join('\n'))).join('\n'); }
  const ALIAS = { light: 'candles', ink: 'write', turn: 'camera', kneel: 'camera', yaw: 'camera', stand: 'camera', focus: 'camera', hold: 'time', release: 'time', blow: 'time', off: 'time', on: 'time',
    place: 'scene', look: 'scene', brightness: 'scene', breed: 'library', keep: 'library', propose: 'work', accept: 'work', reject: 'work', amend: 'work', undo: 'work', redo: 'work', children: 'child', add: 'child', remove: 'child' };

  // ---------- small helpers ----------
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9　-鿿]+/g, ' ').trim();
  const isNum = w => w != null && /^[-+]?(\d+\.?\d*|\.\d+)$/.test(w);
  const num = w => Number(w);
  const E = msg => ({ error: msg });
  const set = (path, value) => ({ op: 'set', args: { path, value } });
  function edit(a, b) { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n]; }
  function nearest(word, list) { let best = null, bd = 1e9; for (const w of list) { const d = edit(word, w); if (d < bd) { bd = d; best = w; } } return bd <= Math.max(1, Math.floor(word.length / 3)) ? best : null; }
  // a fraction 0..1 written with a decimal point means a share of the 0..10 scale; whole numbers are steps
  function tenth(w) { const v = num(w); return (/\./.test(w) && v >= 0 && v <= 1) ? Math.round(v * 10) : Math.round(v); }
  function range(name, v, lo, hi, usage) { if (!isFinite(v)) return E(name + ' needs a number. ' + usage); if (v < lo || v > hi) return E(name + ' takes ' + lo + ' to ' + hi + '; you wrote ' + v + '. ' + usage); return null; }
  function colour(w) { if (!w) return null; if (/^#[0-9a-f]{6}$/i.test(w)) return w.toLowerCase(); if (/^#[0-9a-f]{3}$/i.test(w)) return '#' + w.slice(1).split('').map(c => c + c).join('').toLowerCase(); return COLOURS[w.toLowerCase()] || null; }

  // library names: 'brown-dome', 'brown dome', 'brown', '3', 'kept 1'
  function findCake(state, words) {
    const lib = (state && state.library) || [];
    const q = norm(words.join(' '));
    if (!q) return { error: 'which cake? ' + libList(lib) };
    if (/^\d+$/.test(q)) { const i = +q; return i < lib.length ? { index: i } : { error: 'the library has cakes 0 to ' + (lib.length - 1) + '. ' + libList(lib) }; }
    const names = lib.map(c => norm(c.name));
    let i = names.indexOf(q); if (i >= 0) return { index: i };
    const hits = names.map((n, k) => (n.startsWith(q) || n.split(' ').some(w => w === q) || n.replace(/ /g, '').startsWith(q.replace(/ /g, ''))) ? k : -1).filter(k => k >= 0);
    if (hits.length === 1) return { index: hits[0] };
    if (hits.length > 1) return { error: q + ' could be ' + hits.map(k => lib[k].name).join(' or ') + '. Say more.' };
    const near = nearest(q, names); if (near) return { error: 'no cake called ' + q + '. Did you mean ' + lib[names.indexOf(near)].name + '? ' };
    return { error: 'no cake called ' + q + '. ' + libList(lib) }; }
  const libList = lib => 'The library: ' + lib.map((c, i) => i + ' ' + c.name).join(', ') + '.';

  function childId(state, w) {
    if (w == null) return { error: 'which child? child 1, child 2 ...' };
    const id = /^\d+$/.test(w) ? 'child-' + w : w.toLowerCase();
    const people = (state && state.people) || [];
    if (state && !people.some(p => p.id === id)) return { error: 'there is no ' + id + '. There are ' + (people.map(p => p.id).join(', ') || 'no people') + '.' };
    return { id }; }

  function stageOf(w) { if (isNum(w)) { const v = Math.round(num(w)); return v >= 0 && v <= 4 ? v : null; } const k = STAGE_WORDS[w.toLowerCase()]; return k == null ? null : k; }

  function pending(state, w) {
    const ps = (state && state.proposals) || [];
    if (!ps.length) return { error: 'nothing is proposed' };
    if (w == null) return { id: ps[0].id };
    const id = /^\d+$/.test(w) ? 'p' + w : w.toLowerCase();
    return ps.some(p => p.id === id) ? { id } : { error: 'no proposal ' + id + '. Pending: ' + ps.map(p => p.id).join(', ') + '.' }; }

  // ---------- the verbs ----------
  const V = {};
  V.cake = (w, st) => {
    const u = 'Try: cake brown-dome, cake target brown-dome, cake tilt 4.';
    if (!w.length) return E('cake what? ' + u);
    const k = w[0].toLowerCase(), rest = w.slice(1);
    if (k === 'none' || k === 'nothing' || k === 'clear') return set('cake.kind', -1);
    if (k === 'target' || k === 'toward' || k === 'towards') { const f = findCake(st, rest); if (f.error) return E(f.error);
      // choose what is being made without skipping the making: the stage stays where it is
      return [set('cake.kind', f.index), set('cake.stage', st ? st.cake.stage : 0)]; }
    if (k === 'tilt') { const v = num(rest[0]); return range('cake tilt', v, -2, 10, 'cake tilt 4') || set('cake.tilt', Math.round(v)); }
    if (k === 'form' || k === 'shape') { const f = (rest[0] || '').toLowerCase(); return f === 'dome' || f === 'drum' ? set('cake.genome.form', f) : E('cake form is dome or drum'); }
    if (k === 'side' || k === 'top') { const c = colour(rest[0]); return c ? set('cake.genome.' + k, c) : E('cake ' + k + ' needs a colour: #rrggbb or ' + Object.keys(COLOURS).join(', ')); }
    if (k === 'dots' || k === 'beads') { const v = num(rest[0]); return range('cake dots', v, 0, 1, 'cake dots 0.5') || set('cake.genome.dots', v); }
    if (k === 'height') { const v = num(rest[0]); return range('cake height', v, 0.06, 0.16, 'cake height 0.1 (metres)') || set('cake.genome.height', v); }
    if (k === 'radius') { const v = num(rest[0]); return range('cake radius', v, 0.08, 0.16, 'cake radius 0.12 (metres)') || set('cake.genome.radius', v); }
    if (k === 'layers') { const v = num(rest[0]); return range('cake layers', v, 1, 3, 'cake layers 2') || set('cake.genome.layers', Math.round(v)); }
    const f = findCake(st, w); return f.error ? E(f.error + ' ' + u) : set('cake.kind', f.index); };
  V.make = (w, st) => {
    if (!w.length) { if (st && st.cake.stage >= 4) return E('the cake is finished. Try: cake target <name> to make another, or make nothing to start over.'); return { op: 'make', args: {} }; }
    const s = stageOf(w[w[0] === 'to' ? 1 : 0] || ''); if (s == null) return E('make what? make, make sponge, make frosted, make decorated, make finished, or make 0..4.');
    return { op: 'make', args: { to: s } }; };
  V.write = (w, st, raw) => {
    const text = raw.replace(/^\s*\S+\s*/, '').replace(/^["'“”「]|["'“”」]$/g, '');
    if (!text) return E('write what? write 生日快乐');
    if ([...text].length > 12) return E('the inscription holds at most 12 characters; that is ' + [...text].length + '.');
    return { op: 'write', args: { text } }; };
  V.ink = w => { const v = num(w[0]); return range('ink', v, 0, 24, 'ink 12 (24 = all written)') || set('inscription.written', Math.round(v)); };
  V.candles = (w, st) => {
    if (w[0] === 'lit' || w[0] === 'light') return V.light(w.slice(1), st);
    if (w[0] === 'out') return set('candles.lit', 0);
    const v = num(w[0]); return range('candles', v, 0, 12, 'candles 7') || { op: 'candles', args: { count: Math.round(v) } }; };
  V.light = (w, st) => {
    if (w[0] === 'candles' || w[0] === 'the') w = w.slice(w[1] === 'candles' ? 2 : 1);
    const count = st ? st.candles.count : 12;
    if (!w.length || w[0] === 'all') return set('candles.lit', count);
    const v = num(w[0]); return range('light', v, 0, count, 'light 7 (there are ' + count + ' candles)') || set('candles.lit', Math.round(v)); };
  V.table = w => { const k = (w[0] || '').toLowerCase(); return k === 'up' || k === 'on' || k === '1' ? set('table.up', 1) : k === 'down' || k === 'off' || k === '0' ? set('table.up', 0) : E('table up or table down'); };
  V.child = (w, st) => {
    if (w[0] === 'add' || w[0] === 'new') return V.add(['child'].concat(w.slice(1)), st);
    const c = childId(st, w[0]); if (c.error) return E(c.error);
    const id = c.id, k = (w[1] || 'arrive').toLowerCase(), a = w[2];
    if (k === 'arrive' || k === 'arrives' || k === 'come' || k === 'in') { if (a == null) return set('people.' + id + '.arrived', 10); const v = tenth(a); return range('arrive', v, 0, 10, 'child 2 arrive (or arrive 0.5 for half there)') || set('people.' + id + '.arrived', v); }
    if (k === 'gone' || k === 'leave' || k === 'away' || k === 'out') return set('people.' + id + '.arrived', 0);
    if (k === 'later' || k === 'earlier' || k === 'offset') { const s = num(a); if (!isFinite(s)) return E('child 2 later 0.5 (seconds)');
      const f = k === 'offset' ? Math.round(s) : Math.round((k === 'earlier' ? -s : s) * FPS);
      return range(k === 'offset' ? 'offset' : k + ' (in frames)', f, -12, 12, 'the offset is at most half a second (12 frames) either way') || set('people.' + id + '.offset', f); }
    if (k === 'at' || k === 'to') { const x = num(w[2]), z = num(w[3]); return range('x', x, -1.5, 1.5, 'child 2 at 0.3 -0.5') || range('z', z, -1.5, 1.5, 'child 2 at 0.3 -0.5') || [set('people.' + id + '.x', x), set('people.' + id + '.z', z)]; }
    if (isNum(k)) { const v = tenth(k); return range('arrive', v, 0, 10, 'child 2 arrive') || set('people.' + id + '.arrived', v); }
    return E('child ' + w[0] + ' what? arrive, gone, later <s>, earlier <s>, at <x> <z>.'); };
  V.children = (w, st) => {
    const k = (w[0] || 'arrive').toLowerCase(), people = st ? st.people.filter(p => p.kind === 'child') : [1, 2, 3].map(i => ({ id: 'child-' + i }));
    if (k === 'arrive' || k === 'come' || k === 'in') return people.map(p => set('people.' + p.id + '.arrived', 10));
    if (k === 'gone' || k === 'leave') return people.map(p => set('people.' + p.id + '.arrived', 0));
    return E('children arrive or children gone'); };
  V.add = (w, st) => {
    const k = (w[0] || '').toLowerCase();
    if (k === 'child') { const a = { kind: 'child' }; if (isNum(w[1]) && isNum(w[2])) { a.x = num(w[1]); a.z = num(w[2]); } return { op: 'add', args: a }; }
    if (k === 'prop') { const kind = w[1] && !isNum(w[1]) ? w[1].toLowerCase() : null; if (!kind) return E('add prop <kind> [x z] [scale], e.g. add prop balloon 0.4 -0.2');
      const a = { kind: 'prop', propKind: kind }, n = w.slice(2).filter(isNum).map(num); if (n.length >= 2) { a.x = n[0]; a.z = n[1]; } if (n.length >= 3) a.scale = n[2]; return { op: 'add', args: a }; }
    return E('add child or add prop <kind>'); };
  V.remove = (w, st) => { const id = (w[0] || '').toLowerCase(); if (!id) return E('remove what? remove prop-1');
    if (st && !st.people.concat(st.props).some(p => p.id === id)) return E('nothing called ' + id + '. There are ' + st.people.concat(st.props).map(p => p.id).join(', ') + '.');
    return { op: 'remove', args: { id } }; };
  V.turn = w => { const v = num(w[0]); return range('turn', v, -360, 360, 'turn -20 (degrees; minus turns left)') || { op: 'camera', args: { turn: Math.round(v) } }; };
  V.yaw = w => { const v = num(w[0]); return range('yaw', v, -180, 180, 'yaw 30') || { op: 'camera', args: { yaw: Math.round(v / 5) * 5 } }; };
  V.kneel = w => { if (!w.length) return { op: 'camera', args: { kneel: 10 } }; const v = tenth(w[0]); return range('kneel', v, 0, 10, 'kneel 0.4 or kneel 4 (0 standing, 10 lowest)') || { op: 'camera', args: { kneel: v } }; };
  V.stand = () => ({ op: 'camera', args: { kneel: 0 } });
  V.focus = (w, st) => { let id = (w[0] || '').toLowerCase(); if (/^\d+$/.test(id)) id = 'child-' + id; if (!id) return E('focus cake, focus child-2, focus prop-1');
    if (st && id !== 'cake' && !st.people.concat(st.props).some(p => p.id === id)) return E('nothing called ' + id + ' to focus on.');
    return { op: 'camera', args: { focus: id } }; };
  V.place = w => { const p = (w[0] || '').toLowerCase(); return ['dome', 'room', 'forest'].includes(p) ? { op: 'look', args: { place: p } } : E('place dome, place room or place forest'); };
  V.look = w => { const p = (w[0] || '').toLowerCase(); if (p === 'at') return V.focus(w.slice(1)); return ['film', 'plain', 'holo'].includes(p) ? { op: 'look', args: { look: p } } : E('look film, look plain or look holo'); };
  V.brightness = w => { const v = tenth(w[0] || ''); return range('brightness', v, 0, 10, 'brightness 6') || { op: 'look', args: { light: v } }; };
  V.hold = () => ({ op: 'hold', args: {} });
  V.release = () => ({ op: 'release', args: {} });
  V.blow = () => ({ op: 'blow', args: {} });
  V.off = () => ({ op: 'switchOff', args: {} });
  V.on = () => ({ op: 'switchOn', args: {} });
  V.select = w => { let t = (w[0] || '').toLowerCase(); if (/^child$/.test(t) && w[1]) t = 'child-' + w[1]; if (/^\d$/.test(t)) t = 'child-' + t;
    if (SELECTIONS.includes(t)) return { op: 'select', args: { target: t } };
    const n = nearest(t, SELECTIONS); return E('select ' + (n ? n + '? ' : '') + 'One of ' + SELECTIONS.join(', ') + '.'); };
  V.next = () => ({ op: 'select', args: { by: 1 } });
  V.previous = () => ({ op: 'select', args: { by: -1 } });
  V.breed = (w, st) => { if (w.length < 2) return E('breed <a> <b> [seed], e.g. breed mint brown-dome 7');
    let seed; if (w.length >= 3 && /^\d+$/.test(w[w.length - 1])) { seed = +w[w.length - 1]; w = w.slice(0, -1); }
    // split the words into two names: try each split point
    for (let i = 1; i < w.length; i++) { const a = findCake(st, w.slice(0, i)), b = findCake(st, w.slice(i)); if (!a.error && !b.error) { const args = { a: a.index, b: b.index }; if (seed != null) args.seed = seed; return { op: 'breed', args }; } }
    return E('breed needs two cakes of the library. ' + libList((st && st.library) || [])); };
  V.keep = (w, st, raw) => { const name = raw.replace(/^\s*\S+\s*/, ''); return { op: 'keep', args: name ? { name } : {} }; };
  V.undo = w => ({ op: 'undo', args: w[0] ? { steps: Math.max(1, Math.round(num(w[0])) || 1) } : {} });
  V.redo = w => ({ op: 'redo', args: w[0] ? { steps: Math.max(1, Math.round(num(w[0])) || 1) } : {} });
  V.mark = (w, st, raw) => { const name = raw.replace(/^\s*\S+\s*/, ''); return name ? { op: 'snapshot', args: { name } } : E('mark <name>'); };
  V.reset = () => ({ op: 'reset', args: {} });
  V.accept = (w, st) => { const p = pending(st, w[0]); return p.error ? E(p.error) : { op: 'accept', args: { id: p.id } }; };
  V.reject = (w, st) => { const p = pending(st, w[0]); return p.error ? E(p.error) : { op: 'reject', args: { id: p.id } }; };
  V.amend = (w, st) => {
    const p = pending(st, w[0]); if (p.error) return E(p.error);
    const prop = st.proposals.find(q => q.id === p.id), rest = w.slice(1);
    if (!rest.length) return E('amend ' + p.id + ' <value>, or amend ' + p.id + ' <key>=<value> ...');
    const args = {};
    if (rest.every(x => /=/.test(x))) for (const x of rest) { const [k, v] = x.split('='); args[k] = isNum(v) ? num(v) : v; }
    else { const v = isNum(rest[0]) ? num(rest[0]) : rest.join(' ');
      const key = { set: 'value', nudge: 'by', candles: 'count', write: 'text', make: 'to' }[prop.op] || (prop.op === 'camera' ? Object.keys(prop.args)[0] : null);
      if (!key) return E('say which part to change: amend ' + p.id + ' <key>=<value>'); args[key] = v; }
    return { op: 'amend', args: { id: p.id, args } }; };
  V.propose = (w, st, raw) => {
    const inner = raw.replace(/^\s*\S+\s*/, ''); if (!inner) return E('propose <command>, e.g. propose candles 7');
    let note = ''; const m = inner.match(/^(.*?)\s+(?:--|because)\s+(.*)$/); const body = m ? m[1] : inner; if (m) note = m[2];
    const r = one(body, st); if (r.error) return r; if (!isOp(r) && !Array.isArray(r)) return E('only changes can be proposed');
    const list = Array.isArray(r) ? r : [r];
    for (const o of list) if (['propose', 'accept', 'reject', 'amend', 'undo', 'redo', 'snapshot', 'load', 'reset'].includes(o.op)) return E(o.op + ' cannot be proposed');
    // several ops become several ghosts (the core proposes one op at a time)
    return list.map(o => ({ op: 'propose', args: { op: o.op, args: o.args, note: note || body } })); };
  V.set = (w, st, raw) => { const path = w[0]; if (!path || w.length < 2) return E('set <path> <value>, e.g. set camera.yaw 30');
    const v = raw.replace(/^\s*\S+\s+\S+\s*/, ''); return set(path, isNum(v) ? num(v) : v); };
  V.nudge = w => { if (!w[0] || !isNum(w[1])) return E('nudge <path> <by>, e.g. nudge cake.tilt 1'); return { op: 'nudge', args: { path: w[0], by: num(w[1]) } }; };
  V.describe = () => ({ describe: true });
  V.help = w => ({ help: help(w[0]) });
  V.wait = w => { const v = num(w[0]); return range('wait', v, 0, 60, 'wait 1.5 (seconds)') || { wait: v }; };

  const SYN = { cakes: 'cake', candle: 'candles', inscribe: 'write', inscription: 'write', letters: 'write', lit: 'light', 'let': 'release', letgo: 'release', go: 'release',
    freeze: 'hold', blowout: 'blow', dark: 'off', switch: null, crouch: 'kneel', rotate: 'turn', view: 'yaw', prev: 'previous', back: 'undo', mix: 'breed', save: 'keep',
    snapshot: 'mark', clear: 'reset', ok: 'accept', yes: 'accept', no: 'reject', dismiss: 'reject', suggest: 'propose', kid: 'child', girl: 'child', kids: 'children',
    'show': 'describe', status: 'describe', state: 'describe', '?': 'help', bake: 'make', light: 'light', time: null };
  const isOp = r => r && typeof r === 'object' && typeof r.op === 'string';

  function one(line, st) {
    const raw = line.trim(); if (!raw) return E('empty line');
    if (raw[0] === '{' || raw[0] === '[') { try { const j = JSON.parse(raw); const list = Array.isArray(j) ? j : [j];
      if (!list.every(isOp)) return E('a JSON op looks like {"op":"set","args":{"path":"camera.yaw","value":30}}'); return Array.isArray(j) ? j : j; } catch (e) { return E('that JSON does not parse: ' + e.message); } }
    let w = raw.split(/\s+/); let verb = w[0].toLowerCase();
    if (verb === 'switch' && /^(off|on)$/i.test(w[1] || '')) { verb = w[1].toLowerCase(); w = w.slice(1); }
    if (verb === 'let' && /^go$/i.test(w[1] || '')) { verb = 'release'; w = w.slice(1); }
    if (verb === 'blow' && /^out$/i.test(w[1] || '')) w = w.slice(1);
    if (verb === 'light' && /^\d/.test(w[1] || '') === false && w[1] && /^(film|plain|holo)$/.test(w[1])) verb = 'look';
    if (SYN[verb]) verb = SYN[verb];
    const f = V[verb];
    if (!f) { const n = nearest(verb, Object.keys(V).concat(Object.keys(SYN).filter(k => SYN[k])));
      return E('no command ' + JSON.stringify(w[0]) + '.' + (n ? ' Did you mean ' + (SYN[n] || n) + '?' : '') + ' Type help for the list.'); }
    try { return f(w.slice(1), st, raw); } catch (e) { return E('could not read ' + JSON.stringify(raw) + ': ' + e.message); } }

  // parse a line (possibly several commands separated by ';' or newlines)
  function parse(line, state) {
    const parts = String(line == null ? '' : line).split(/[;\n]/).map(s => s.trim()).filter(s => s && !s.startsWith('#') && !s.startsWith('//'));
    if (!parts.length) return E('empty line. Type help for the commands.');
    if (parts.length === 1) return one(parts[0], state);
    const ops = [];
    for (const p of parts) { const r = one(p, state); if (r.error) return E(p + ': ' + r.error); if (!isOp(r) && !Array.isArray(r)) return E(p + ': only changes can be joined with ;'); (Array.isArray(r) ? r : [r]).forEach(o => ops.push(o)); }
    return ops; }

  // a short plain account of what an op does, for the console and the ghost labels
  function say(o, st) { const a = o.args || {};
    const lib = (st && st.library) || [];
    switch (o.op) {
      case 'set': if (a.path === 'cake.kind') return a.value < 0 ? 'no cake' : 'the cake: ' + ((lib[a.value] || {}).name || a.value);
        if (a.path === 'cake.stage') return 'the cake at ' + (STAGES[a.value] || a.value); if (a.path === 'candles.lit') return a.value + ' candles lit';
        if (/\.arrived$/.test(a.path)) return a.path.split('.')[1] + (a.value >= 10 ? ' arrives' : a.value === 0 ? ' gone' : ' arriving ' + a.value + '/10');
        if (/\.offset$/.test(a.path)) return a.path.split('.')[1] + ' ' + (a.value >= 0 ? 'later' : 'earlier') + ' by ' + Math.abs(a.value) + ' frames';
        if (a.path === 'table.up') return a.value ? 'the table up' : 'the table down';
        return a.path + ' to ' + a.value;
      case 'make': return a.to != null ? 'make the cake ' + STAGES[a.to] : 'the next making step';
      case 'write': return 'write ' + a.text; case 'candles': return a.count + ' candles, lit';
      case 'camera': return a.turn != null ? 'turn ' + a.turn + ' degrees' : a.kneel != null ? 'kneel ' + a.kneel : a.yaw != null ? 'view from ' + a.yaw + ' degrees' : 'focus ' + a.focus;
      case 'propose': return 'propose: ' + say({ op: a.op, args: a.args }, st);
      case 'switchOff': return 'switch the memory off'; case 'switchOn': return 'switch the memory on';
      default: return o.op + (Object.keys(a).length ? ' ' + JSON.stringify(a) : ''); } }

  const API = { parse, help, say, STAGES, COLOURS, FPS, verbs: () => Object.keys(V) };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ORB_COMMANDS = API;
})(typeof window !== 'undefined' ? window : globalThis);
