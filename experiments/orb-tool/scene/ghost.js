/* ORB TOOL scene: what a proposal's ghost draws. The state the proposal would produce, from CORE_OPS.ghostState (core/SCHEMA.md v1.3),
   which works on a copy and never touches the committed state; batch proposals come out as one state. Falls back to applying the op
   to a copy when ghostState is absent. diff() names the parts the ghost changes, so only those are drawn pale.
   Browser global SCENE_GHOST; node module.exports. */
(function (root) {
  'use strict';
  const clone = o => JSON.parse(JSON.stringify(o));
  function trialOf(CO, state, p) {
    if (!CO || !p) return null;
    if (typeof CO.ghostState === 'function') { try { return CO.ghostState(state, p) || null; } catch (e) { return null; } }
    const g = clone(state); g.proposals = []; try { return CO.OPS[p.op](g, clone(p.args || {}), { author: p.author }) ? null : g; } catch (e) { return null; } }
  const PARTS = ['cake', 'candles', 'inscription', 'table', 'people', 'props', 'camera', 'scene', 'time', 'selection'];
  function diff(state, trial) { if (!trial) return []; return PARTS.filter(k => JSON.stringify(state[k]) !== JSON.stringify(trial[k])); }
  const API = { trialOf, diff, PARTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SCENE_GHOST = API;
})(typeof window !== 'undefined' ? window : globalThis);
