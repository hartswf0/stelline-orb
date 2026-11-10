/* ORB TOOL core: the gates a memory carries (AUDIT R10, after secondhand-motion's tests.json): each with value, bar and pass.
   Values the core can know it computes from the state; values only a renderer or critic can measure (the FILM-BAR match, faces
   seen in a rendered frame) come from the `measure` op and say who measured them. A gate with nothing measured does not pass.
   Browser global CORE_TESTS; node module.exports. */
(function (root) {
  'use strict';
  const FILM_MATCH_BAR = 0.6;   // provisional: v5's MATCH score as a fraction; FILM-BAR.md gives no number, the critic may set its own
  function run(s) {
    const m = s.measures || {}, out = [];
    const madeThings = ['cake', 'inscription', 'candles', 'table'].filter(k => k === 'cake' ? s.cake.stage > 0 : k === 'inscription' ? s.inscription.written > 0 : k === 'table' ? s.table.up : s.candles.count > 0).map(k => s[k])
      .concat(s.people.filter(p => p.arrived > 0), s.props);
    const named = madeThings.filter(o => o.source && o.source.by && o.source.from).length;
    out.push({ name: 'whole cake made', value: s.cake.stage + ' of 4' + (s.cake.kind === -1 ? ', no cake chosen' : ''), bar: '4 of 4', pass: s.cake.stage === 4 && s.cake.kind !== -1 });
    const faces = m.faces ? m.faces.value : 0;
    out.push({ name: 'no faces', value: faces, bar: 0, pass: faces === 0, note: m.faces ? 'measured by ' + m.faces.by : 'figures are faceless in the state; a renderer reports what it draws with measure faces' });
    const fm = m['film-bar match'];
    out.push({ name: 'film-bar match', value: fm ? fm.value : null, bar: FILM_MATCH_BAR, pass: !!fm && fm.value >= FILM_MATCH_BAR, note: fm ? 'measured by ' + fm.by + (fm.note ? ': ' + fm.note : '') : 'not measured yet (a renderer or critic posts it with the measure op)' });
    out.push({ name: 'every made thing names its source', value: named + ' of ' + madeThings.length, bar: 'all', pass: named === madeThings.length });
    return out; }
  function text(s) { return run(s).map(t => (t.pass ? 'PASS ' : 'FAIL ') + t.name + ': ' + (t.value == null ? 'none' : t.value) + ' (bar ' + t.bar + ')' + (t.note ? ' - ' + t.note : '')).join('\n'); }
  const API = { run, text, FILM_MATCH_BAR };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CORE_TESTS = API;
})(typeof window !== 'undefined' ? window : globalThis);
