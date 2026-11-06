/* scenario.js — one played birthday, as device actions: [time s, 'turn', ring, detents, seconds] | [time, 'sel'] | [time, 'hold'].
   The page's PLAY collar, the node tests and the Playwright recorder all run this same list. */
(function (root, f) { const m = f(); if (typeof module === 'object' && module.exports) module.exports = m; else root.Scenario = m; })(this, function () {
const PLAY = [
  [0.5, 'turn', 'knurl', 1, .25], [1.1, 'turn', 'knurl', 1, .25], [1.7, 'turn', 'knurl', -2, .4],     // STAND: look through the archive: footring, glass, back to the bronze foot
  [2.0, 'turn', 'scale', 3, .5],                                                                       // kneel 15 degrees round
  [2.7, 'hold'],                                                                                       // place the stand
  [3.9, 'turn', 'knurl', 1, .25], [4.3, 'turn', 'tri', 2, .3], [4.9, 'hold'],                          // PLATE: porcelain, a little larger, place
  [6.0, 'turn', 'knurl', 1, .25], [6.6, 'turn', 'knurl', -1, .25], [7.2, 'hold'],                      // MOULD: the pot (dome), then the tin (drum); bake
  [10.8, 'turn', 'knurl', 1, .25], [11.3, 'hold'],                                                     // DECORATION: mint first
  [14.6, 'turn', 'knurl', -1, .25], [15.1, 'hold'],                                                    // evolve toward the target: chocolate with the orange top (silver decay swap)
  [15.6, 'sel'], [15.9, 'turn', 'knurl', 24, 1.9],                                                     // INSCRIPTION: write 生日快乐 stroke by stroke
  [18.4, 'sel'], [18.7, 'hold'],                                                                       // CANDLES: brass cups, seven set one by one
  [21.3, 'hold'],                                                                                      // LIGHT: strike the match
  [23.9, 'turn', 'scale', -3, .5],                                                                     // kneel back to face the cake
  [24.6, 'hold']                                                                                       // BLOW
];
// one entry per detent passed, so the hand clicks are as the hand would make them
function expand(list) { const out = []; list.forEach(a => { if (a[1] !== 'turn') { out.push(a); return; } const n = Math.abs(a[3]), s = Math.sign(a[3]); for (let i = 0; i < n; i++) out.push([+(a[0] + (i + .5) * a[4] / n).toFixed(4), 'turn', a[2], s]); });
  return out.sort((p, q) => p[0] - q[0]); }
return { PLAY, expand, DURATION: 28 };
});
