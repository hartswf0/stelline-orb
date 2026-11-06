/* scenarios.js — scripted player input as device actions, shared by test.js, the node traces, and the Playwright recordings.
   An action is [time s, what]: {sel:'CAKE'} presses SELECT until that target is selected; {ring, to, dur} turns a ring by hand,
   its detents spread evenly over dur seconds (the machine then steps at 11.8/s, or 23.6/s when far); {hold:1} a short HOLD press;
   {long:1} a long HOLD press (switch off). Times are the player's, not the girl's. */
(function (root, factory) { const S = factory(); if (typeof module === 'object' && module.exports) module.exports = S; else root.Scenarios = S; })(this, function () {
const S = {
  /* the proof: the obedient things first (push the cake, call her), then the circumstances changed one by one, then waiting */
  earned: { dur: 27, script: [
    [0.5, { ring: 'knurl', to: 6, dur: 0.3 }],                 // CAKE selected at start: push the cake at her, fast
    [1.8, { sel: 'HER' }], [2.1, { ring: 'knurl', to: 3, dur: 0.3 }], [3.3, { ring: 'knurl', to: 0, dur: 0.3 }],   // call her, then stop
    [3.9, { sel: 'ROOM' }], [4.1, { ring: 'knurl', to: 1, dur: 0.8 }],        // dim the room
    [5.0, { sel: 'CAKE' }], [5.2, { ring: 'knurl', to: 0, dur: 0.9 }], [6.2, { ring: 'tri', to: 0, dur: 0.9 }],   // bring the cake back, slowly; lower it
    [7.2, { sel: 'CHILDREN' }], [7.4, { ring: 'knurl', to: 3, dur: 0.5 }],     // the children in, singing
    [8.0, { ring: 'scale', to: 4, dur: 0.8 }],                                // kneel to her height; then wait
    [23.0, { long: 1 }] ] },                                                  // after her birthday: a long HOLD ends the memory (then the end card)
  /* obedient default: the player only calls, and calls again */
  callOnly: { dur: 60, script: [[0.5, { sel: 'HER' }], [0.8, { ring: 'knurl', to: 3, dur: 0.2 }], [10, { ring: 'knurl', to: 6, dur: 0.3 }], [30, { ring: 'knurl', to: 0, dur: 0.3 }], [31, { ring: 'knurl', to: 6, dur: 0.3 }]] },
  /* calling her while every other circumstance is right */
  callInGoodRoom: { dur: 60, script: [[0.3, { sel: 'ROOM' }], [0.5, { ring: 'knurl', to: 1, dur: 0.6 }], [1.3, { sel: 'CAKE' }], [1.5, { ring: 'tri', to: 0, dur: 0.6 }],
    [2.3, { sel: 'CHILDREN' }], [2.5, { ring: 'knurl', to: 3, dur: 0.4 }], [3.2, { ring: 'scale', to: 4, dur: 0.6 }], [4, { sel: 'HER' }], [4.2, { ring: 'knurl', to: 2, dur: 0.2 }]] },
  /* pushing the cake at her, again and again */
  pushOnly: { dur: 40, script: [0, 1, 2, 3, 4].flatMap(i => [[0.5 + i * 8, { ring: 'knurl', to: 7, dur: 0.3 }], [4 + i * 8, { ring: 'knurl', to: 0, dur: 0.3 }]]) },
  /* waiting: no input at all */
  waitOnly: { dur: 60, script: [] },
  /* the impatient player (the mobile playtest): calls, pushes, then does the right things but calls again while she comes */
  impatient: { dur: 32, script: [
    [0.5, { sel: 'HER' }], [0.8, { ring: 'knurl', to: 2, dur: 0.2 }], [2.5, { ring: 'knurl', to: 0, dur: 0.2 }],
    [3.0, { sel: 'CAKE' }], [3.2, { ring: 'tri', to: 0, dur: 0.6 }], [4.0, { sel: 'ROOM' }], [4.2, { ring: 'knurl', to: 1, dur: 0.8 }],
    [5.2, { sel: 'CHILDREN' }], [5.4, { ring: 'knurl', to: 3, dur: 0.5 }], [6.0, { ring: 'scale', to: 4, dur: 0.8 }],
    [13.0, { sel: 'HER' }], [13.2, { ring: 'knurl', to: 1, dur: 0.1 }], [13.6, { ring: 'knurl', to: 0, dur: 0.1 }], [27.5, { long: 1 }] ] }
};
/* expand to one entry per detent: [time, kind, arg] */
function expand(script, startSel) { const out = []; let sel = startSel == null ? 1 : startSel; const T = ['ROOM', 'CAKE', 'CHILDREN', 'HER']; const pos = { scale: 0 };
  const val = { ROOM_k: 8, CAKE_k: 0, CAKE_t: 6, CHILDREN_k: 0, CHILDREN_t: 0, HER_k: 0, scale: 0 };
  const key = (ring) => ring === 'scale' ? 'scale' : T[sel] + (ring === 'knurl' ? '_k' : '_t');
  script.forEach(([t, a]) => { if (a.sel) { let n = 0; while (T[sel] !== a.sel) { sel = (sel + 1) % 4; out.push([t + n * 0.15, 'sel']); n++; } }
    else if (a.ring) { const k = key(a.ring), from = val[k], n = Math.abs(a.to - from), d = Math.sign(a.to - from); for (let i = 0; i < n; i++) out.push([t + (n > 1 ? i * a.dur / (n - 1) : 0), 'turn', a.ring, d]); val[k] = a.to; }
    else if (a.hold) out.push([t, 'hold']); else if (a.long) out.push([t, 'long']); });
  return out.sort((a, b) => a[0] - b[0]); }
S.expand = expand; return S; });
