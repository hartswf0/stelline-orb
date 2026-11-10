/* ORB TOOL agent: describe(state, extra) -> plain text an agent can read and act on.
   What exists, what stage it is at, what is still missing before the blow, what is pending, what the person did last,
   and the next commands that would move the memory on (in the command language of agent/commands.js).
   extra (optional): { history: ORB.history(), cursor: ORB.cursor(), log: ORB.log() }.
   Install in a page with ORB_DESCRIBE.install(ORB). Browser: window.ORB_DESCRIBE. Node: module.exports. */
(function (root) {
  'use strict';
  const STAGES = ['nothing', 'sponge', 'frosted', 'decorated', 'finished'];
  const FILM_CANDLES = 7;

  function cakeName(s) {
    const k = s.cake.kind;
    if (k === -1) return 'none chosen';
    if (k === -2) return 'its own (bred or edited, not kept in the library)';
    return (s.library[k] || {}).name || 'library ' + k; }

  // the steps from nothing to the blow, in the film's order; each: [done, what, the command that does it]
  function needs(s) {
    const kids = s.people.filter(p => p.kind === 'child').slice(0, 3);
    const n = [...s.inscription.text].length;
    return [
      [s.table.up === 1, 'the table is not up', 'table up'],
      [s.cake.stage >= 4, s.cake.stage === 0 ? 'there is no cake' : 'the cake is only ' + STAGES[s.cake.stage] + ' (stage ' + s.cake.stage + ' of 4)', s.cake.stage === 0 && s.cake.kind === -1 ? 'cake target brown-dome; make' : 'make'],
      [s.inscription.written >= 24 && n > 0, n === 0 ? 'there is no inscription' : 'the inscription ' + s.inscription.text + ' is ' + Math.round(100 * s.inscription.written / 24) + '% written', 'write ' + (s.inscription.text || '生日快乐')],
      [s.candles.count > 0, 'there are no candles', 'candles ' + FILM_CANDLES],
      [s.candles.count === 0 || s.candles.lit === s.candles.count || s.time.blown, s.candles.lit + ' of ' + s.candles.count + ' candles are lit', 'light all'],
      ...kids.map(p => [p.arrived >= 10, p.id + (p.arrived === 0 ? ' has not arrived' : ' is only ' + p.arrived + '/10 there'), 'child ' + p.id.replace('child-', '') + ' arrive']),
      [s.time.hold || s.time.blown, 'the moment is not held', 'hold']]; }

  function describe(s, extra) {
    if (!s) return 'no memory';
    extra = extra || {};
    const L = [];
    const n = needs(s), missing = n.filter(x => !x[0]);
    // the one-line status first, so an agent reading only the head knows where it is
    let status;
    if (s.time.off) status = 'SWITCHED OFF (say: on)';
    else if (s.time.blown) status = 'BLOWN: the candles are out; the memory is complete';
    else if (!missing.length) status = 'READY FOR THE BLOW (say: release, or blow)';
    else status = 'MAKING: ' + missing.length + ' thing' + (missing.length === 1 ? '' : 's') + ' before the blow';
    L.push('MEMORY ' + status);
    L.push('scene: ' + s.scene.place + ', look ' + s.scene.look + ', brightness ' + s.scene.light + '/10' + (s.time.hold ? ', held' : '') + (s.time.off ? ', off' : ''));
    const g = s.cake.genome;
    L.push('cake: ' + cakeName(s) + '; stage ' + s.cake.stage + ' of 4 (' + STAGES[s.cake.stage] + ')' + (s.cake.stage ? '; ' + g.form + ', side ' + g.side + ', top ' + g.top + ', beads ' + g.dots + ', ' + g.layers + ' layer' + (g.layers > 1 ? 's' : '') + ', ' + Math.round(g.radius * 200) + ' cm across' : '') + (s.cake.tilt ? '; tilted ' + s.cake.tilt * 3 + ' degrees toward her' : ''));
    L.push('inscription: ' + (s.inscription.text ? JSON.stringify(s.inscription.text) + ', ' + s.inscription.written + '/24 written' : 'none'));
    L.push('candles: ' + s.candles.count + ', ' + s.candles.lit + ' lit' + (s.time.blown ? ' (blown out)' : ''));
    L.push('table: ' + (s.table.up ? 'up' : 'not up'));
    for (const p of s.people) L.push(p.id + ': ' + (p.arrived >= 10 ? 'here' : p.arrived === 0 ? 'not arrived' : 'arriving ' + p.arrived + '/10') + (p.offset ? ', ' + Math.abs(p.offset) + ' frames ' + (p.offset > 0 ? 'later' : 'earlier') + ' than her' : '') + ', at x ' + p.x + ' z ' + p.z);
    for (const p of s.props) L.push(p.id + ': a ' + p.kind + ' at x ' + p.x + ' z ' + p.z + (p.scale !== 1 ? ', scale ' + p.scale : ''));
    L.push('view: ' + (s.camera.yaw === 0 ? 'from the front' : Math.abs(s.camera.yaw) + ' degrees to the ' + (s.camera.yaw > 0 ? 'right' : 'left')) + ', kneel ' + s.camera.kneel + '/10, looking at ' + s.camera.focus);
    L.push('the person\'s rings work on: ' + s.selection);
    L.push('library: ' + s.library.map((c, i) => i + ' ' + c.name).join(', '));
    if (s.proposals.length) {
      L.push('PENDING (ghosts the person has not answered; they accept, turn or dismiss them):');
      for (const p of s.proposals) L.push('  ' + p.id + ' from ' + p.author + ': ' + p.op + ' ' + JSON.stringify(p.args) + (p.note ? ' -- ' + p.note : ''));
    } else L.push('pending: nothing proposed');
    if (missing.length && !s.time.blown) {
      L.push('BEFORE THE BLOW:');
      for (const m of missing) L.push('  - ' + m[1] + '   (say: ' + m[2] + ')');
    }
    // the history: who did what last
    const H = extra.history, cur = extra.cursor != null ? extra.cursor : H ? H.length : 0;
    if (H && H.length) {
      const applied = H.slice(0, cur), lastHand = [...applied].reverse().find(e => e.author === 'hand');
      L.push('LAST (newest first):');
      for (const e of applied.slice(-5).reverse()) L.push('  ' + (e.author === 'hand' ? 'the person' : e.author) + ': ' + (e.label || e.op) + (e.via ? ' (accepted ' + e.via + ')' : ''));
      if (H.length > cur) L.push('  (' + (H.length - cur) + ' undone; redo brings ' + (H.length - cur === 1 ? 'it' : 'them') + ' back)');
      L.push('the person last: ' + (lastHand ? (lastHand.label || lastHand.op) + (lastHand.via ? ' (accepted ' + lastHand.via + ')' : '') : 'nothing yet'));
    }
    const log = extra.log;
    if (log && log.length) { const refused = log.filter(e => e.refused || e.error).slice(-1)[0]; if (refused) L.push('last refused: ' + (refused.op || '') + ' ' + (refused.error || '')); }
    if (!s.time.blown && !s.time.off) L.push('NEXT: ' + (missing.length ? missing[0][2] : 'release'));
    return L.join('\n'); }

  function install(ORB) { if (!ORB || !ORB.setDescribe) return false;
    ORB.setDescribe(s => describe(s, { history: ORB.history ? ORB.history() : null, cursor: ORB.cursor ? ORB.cursor() : null, log: ORB.log ? ORB.log() : null })); return true; }

  const API = { describe, needs, install };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ORB_DESCRIBE = API;
})(typeof window !== 'undefined' ? window : globalThis);
