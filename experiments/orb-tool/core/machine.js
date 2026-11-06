/* ORB TOOL core: the machine. The state holds where the hand (or the agent) set each value; the machine shows it arriving,
   one step at a time at the film's 11.8 steps a second (23.6 when more than 6 steps away), the first step at once.
   create(orb) installs orb.view(). Browser global CORE_MACHINE; node module.exports. */
(function (root) {
  'use strict';
  const S = typeof module !== 'undefined' && module.exports ? require('./state.js') : root.CORE_STATE;
  const RATE = 11.8, FAST = 23.6, FAR = 6;
  function create(orb) {
    const shown = {};          // path -> shown number
    let clock = 0;
    const steppable = sp => sp && (sp.kind === 'int' || sp.kind === 'num');
    function targets(s) { const t = {}; for (const p of S.allPaths(s)) { if (p.kind !== 'int' && p.kind !== 'num') continue; t[p.path] = S.get(s, p.path); } return t; }
    let tg = targets(orb.raw());
    for (const k in tg) shown[k] = tg[k];
    function stepOne(path, fast) { const sp = S.spec(path), want = tg[path]; let v = shown[path]; if (v === undefined || want === undefined) return false; if (v === want) return false;
      const d = want - v, st = sp.step; v = Math.abs(d) <= st + 1e-9 ? want : +(v + Math.sign(d) * st).toFixed(4); shown[path] = v; orb._emitStep && orb._emitStep(path, v, fast); return true; }
    const away = path => { const sp = S.spec(path); return Math.abs(tg[path] - shown[path]) / sp.step; };
    function onChange(s) { const nt = targets(s), moved = [];
      for (const k in shown) if (!(k in nt)) delete shown[k];
      for (const k in nt) { if (!(k in shown)) { shown[k] = nt[k]; continue; } if (nt[k] !== tg[k] && shown[k] === tg[k]) moved.push(k); }
      tg = nt; for (const k of moved) stepOne(k, away(k) > FAR);   // the first step at once: a detent is visible within a frame
      if (moved.length && !busy()) clock = 0; }
    const busy = () => Object.keys(tg).some(k => shown[k] !== tg[k]);
    function snap() { for (const k in tg) shown[k] = tg[k]; clock = 0; }
    function tick(dt) { const b = Object.keys(tg).filter(k => shown[k] !== tg[k]); if (!b.length) { clock = 0; return 0; }
      const fast = b.some(k => away(k) > FAR), period = 1 / (fast ? FAST : RATE); clock += dt; let n = 0;
      while (clock >= period) { clock -= period; for (const k of b) if (stepOne(k, fast)) n++; }
      return n; }
    orb.on('change', (s, entry) => { if (entry && (entry.op === 'load' || entry.op === 'reset')) { tg = targets(s); snap(); } else onChange(s); });
    orb.on('seek', (n, from) => { if (from != null && Math.abs(n - from) === 1) return; tg = targets(orb.raw()); snap(); });   // one step (playback, UNDO) steps; a scrub jumps
    orb.setView(s => { const v = S.clone(s); for (const k in shown) { const L = S.locate(v, k); if (L) L[0][L[1]] = shown[k]; } return v; });
    return { tick, snap, busy, shown: () => Object.assign({}, shown), RATE, FAST };
  }
  const API = { create, RATE, FAST };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CORE_MACHINE = API;
})(typeof window !== 'undefined' ? window : globalThis);
