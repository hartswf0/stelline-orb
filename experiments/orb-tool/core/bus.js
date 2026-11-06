/* ORB TOOL core: the operation bus. One state, every change an op, every op validated, undoable, logged with its author.
   createOrb() -> the API documented in core/SCHEMA.md section 3. Browser global CORE_BUS; node module.exports. */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const S = node ? require('./state.js') : root.CORE_STATE, O = node ? require('./ops.js') : root.CORE_OPS;
  const MERGEABLE = { set: 1, nudge: 1 };
  function createOrb(opts) {
    opts = opts || {};
    let state = opts.state ? S.clone(opts.state) : S.empty();
    const hist = [];      // { before, after, op, args, author, via, gesture, label } (before/after as JSON text)
    let cursor = 0;       // how many history entries are applied
    const log = [];       // every op sent, in order: { seq, op, args, author, gesture, ok, error }
    const subs = {};
    let describeFn = null, viewFn = null;
    const clock = opts.clock || (() => Date.now()), t0 = clock();   // log times are for playback only; replay ignores them
    const emit = (ev, ...a) => (subs[ev] || []).slice().forEach(f => { try { f(...a); } catch (e) { if (typeof console !== 'undefined') console.error(e); } });
    function on(ev, fn) { (subs[ev] = subs[ev] || []).push(fn); return () => { subs[ev] = subs[ev].filter(f => f !== fn); }; }
    const norm = o => (o && typeof o === 'object' && typeof o.op === 'string') ? { op: o.op, args: o.args == null ? {} : o.args } : null;
    // apply one op or a list as a single history entry
    function doOps(input, meta) {
      meta = meta || {}; const author = typeof meta.author === 'string' ? meta.author : 'agent:api', gesture = meta.gesture == null ? null : String(meta.gesture);
      const list = Array.isArray(input) ? input.map(norm) : [norm(input)];
      const rec = { seq: log.length + 1, t: Math.round(clock() - t0), op: Array.isArray(input) ? 'batch' : (list[0] && list[0].op), args: Array.isArray(input) ? list : (list[0] && list[0].args), author, gesture };
      const refuse = error => { rec.ok = false; rec.error = error; log.push(rec); emit('log', rec); emit('refuse', input, error); return { ok: false, error }; };
      if (!list.length || list.some(x => !x)) return refuse('an op is { op, args }');
      if (list.length === 1 && O.META.includes(list[0].op)) { const st = Math.max(1, Math.round((list[0].args && list[0].args.steps) || 1));
        const n = list[0].op === 'undo' ? Math.max(0, cursor - st) : Math.min(hist.length, cursor + st);
        if (n === cursor) { rec.ok = false; rec.error = 'nothing to ' + list[0].op; log.push(rec); emit('log', rec); emit('refuse', input, rec.error); return { ok: false, error: rec.error }; }
        const passed = (n < cursor ? hist.slice(n, cursor).reverse() : hist.slice(cursor, n)).map(h => h.label);
        rec.ok = true; rec.label = (n < cursor ? 'undid ' : 'redid ') + (passed.length > 2 ? passed.length + ' steps, back to ' + (n ? hist[n - 1].label : 'the empty memory') : passed.join(', ')); log.push(rec);
        moveTo(n); emit('log', rec); return { ok: true, label: rec.label }; }
      for (const x of list) if (!O.OPS[x.op]) return refuse('unknown op ' + x.op + '; ops are ' + O.NAMES.join(', '));
      const before = JSON.stringify(state), next = JSON.parse(before), ctx = { author, at: cursor };
      for (const x of list) { let e; try { e = O.OPS[x.op](next, S.clone(x.args), ctx); } catch (err) { e = 'failed: ' + err.message; } if (e) return refuse(x.op + ': ' + e); }
      const after = JSON.stringify(next); if (after === before && !(list.length === 1 && list[0].op === 'snapshot')) { rec.ok = true; rec.same = true; log.push(rec); emit('log', rec); return { ok: true, same: true }; }
      const lab = list.map(x => O.label(x.op, x.args)).join(', ');
      rec.ok = true; rec.label = lab + (ctx.via ? ' (accepted ' + ctx.via + ')' : ''); log.push(rec);
      const prev = hist[cursor - 1], one = list.length === 1 ? list[0] : null;
      // a drag on one ring is one entry: the same gesture on the same path merges
      if (gesture && one && MERGEABLE[one.op] && prev && cursor === hist.length && prev.gesture === gesture && prev.author === author && prev.path === one.args.path) { prev.after = after; prev.label = O.label('set', { path: one.args.path, value: S.get(next, one.args.path) }); prev.args = { path: one.args.path, value: S.get(next, one.args.path) }; prev.op = 'set'; prev.t = rec.t; }
      else { hist.length = cursor; hist.push({ t: rec.t, before, after, op: one ? one.op : 'batch', args: one ? one.args : list, author, via: ctx.via, gesture, path: one && one.args && one.args.path, label: lab }); cursor = hist.length; }
      state = next; const entry = hist[cursor - 1]; emit('change', state, entry); emit('log', rec); return { ok: true, entry: pub(entry, cursor - 1) };
    }
    function moveTo(n) { n = Math.max(0, Math.min(hist.length, n)); if (n === cursor) return; state = JSON.parse(n === 0 ? hist[0].before : hist[n - 1].after); const e = hist[n - 1] || null, from = cursor; cursor = n; emit('change', state, e); emit('seek', n, from); }
    function seek(n) { n = Math.max(0, Math.min(hist.length, Math.round(n))); if (n === cursor) return { ok: true }; return doOps({ op: n < cursor ? 'undo' : 'redo', args: { steps: Math.abs(n - cursor) } }, { author: 'hand' }); }
    const pub = (h, i) => ({ i, t: h.t, op: h.op, args: h.args, author: h.author, via: h.via, label: h.label });
    function describe() { if (describeFn) return describeFn(S.clone(state)); return defaultDescribe(state); }
    const api = {
      state: () => S.clone(state),
      view: () => viewFn ? viewFn(state) : S.clone(state),
      setView(fn) { viewFn = fn; },
      _emitStep: (path, value, fast) => emit('step', path, value, fast),
      raw: () => state,                      // read-only reference for renderers each frame (do not mutate)
      do: (o, meta) => doOps(o, meta),
      propose: (o, note, meta) => doOps({ op: 'propose', args: { op: o && o.op, args: o && o.args, note } }, meta),
      undo: meta => doOps({ op: 'undo', args: {} }, meta || { author: 'hand' }),
      redo: meta => doOps({ op: 'redo', args: {} }, meta || { author: 'hand' }),
      on, describe, setDescribe(fn) { describeFn = fn; }, seek,
      history: () => hist.map(pub), cursor: () => cursor,
      log: () => log.map(r => S.clone(r)),
      save: () => ({ format: 'orb-memory', v: 1, state: S.clone(state), log: log.map(r => S.clone(r)) }),
      load: (json, meta) => { let m = json; if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { return { ok: false, error: 'not JSON' }; } } return doOps({ op: 'load', args: { memory: m } }, meta || { author: 'hand' }); },
      paths: () => S.allPaths(state),
      ops: () => O.NAMES.slice()
    };
    return api;
  }
  // rebuild a state from a log, from an empty memory: the same log always gives the same state
  function replay(log, opts) { const orb = createOrb(opts); for (const r of log) { if (r.ok === false) continue; orb.do(r.op === 'batch' ? r.args : { op: r.op, args: r.args }, { author: r.author, gesture: r.gesture }); } return orb; }
  function defaultDescribe(s) {
    const L = []; const g = s.cake.genome, st = ['no cake', 'a sponge', 'a frosted cake', 'a decorated cake', 'a finished cake'][s.cake.stage];
    L.push('Place: ' + s.scene.place + ', light ' + s.scene.light + ' of 10, look ' + s.scene.look + (s.time.off ? '. The memory is switched off.' : '.'));
    L.push('Cake: ' + st + (s.cake.stage ? ' (' + (s.cake.kind >= 0 ? s.library[s.cake.kind].name : s.cake.kind === -2 ? 'bred, not kept' : 'unchosen') + '; ' + g.form + ', side ' + g.side + ', top ' + g.top + ', ' + g.layers + ' layer' + (g.layers > 1 ? 's' : '') + ')' : '') + (s.cake.tilt ? ', tilted ' + s.cake.tilt * 3 + ' degrees' : '') + '.');
    L.push('Inscription: "' + s.inscription.text + '", written ' + s.inscription.written + ' of 24 steps.');
    L.push('Candles: ' + s.candles.count + ', ' + s.candles.lit + ' lit' + (s.time.blown ? ' (blown out)' : '') + '. Table ' + (s.table.up ? 'up' : 'down') + '.');
    L.push('People: ' + (s.people.length ? s.people.map(p => p.id + ' arrived ' + p.arrived + '/10' + (p.offset ? ', time ' + (p.offset > 0 ? '+' : '') + p.offset + ' frames' : '')).join('; ') : 'none') + '.');
    if (s.props.length) L.push('Props: ' + s.props.map(p => p.id + ' (' + p.kind + ')').join(', ') + '.');
    L.push('Viewer: yaw ' + s.camera.yaw + ' degrees, kneel ' + s.camera.kneel + ' of 10, looking at ' + s.camera.focus + '. Performances ' + (s.time.hold ? 'held' : 'running') + '.');
    L.push('Selected: ' + s.selection + '.' + (s.proposals.length ? ' Pending proposals: ' + s.proposals.map(p => p.id + ' ' + O.label(p.op, p.args) + (p.note ? ' (' + p.note + ')' : '') + ' by ' + p.author).join('; ') + '.' : ''));
    return L.join('\n'); }
  const API = { createOrb, replay, defaultDescribe };
  if (node) module.exports = API; else root.CORE_BUS = API;
})(typeof window !== 'undefined' ? window : globalThis);
