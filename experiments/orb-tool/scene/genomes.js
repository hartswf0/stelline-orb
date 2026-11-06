/* ORB TOOL scene: the evolved parts' genomes the renderer builds from.
   Each is the best of a hill climb on the evolve-all module's own node fitness against its film-derived refs
   (experiments/swarms/evolve-all/refs/*.json; derived numbers only, no film pixels). Climb: 6000 evaluations (cake 1500),
   1-3 genes mutated per try, steps 30% of a gene's range for the first half then 8%. Fitness reached (0..1):
   table 0.964, inscription 0.992, candles 0.997, people 0.996, cake (reference 'cream', her cake) 0.971.
   The cake's colours, form, height, radius and layers come from the memory state; only its finish genes (frosting, borders, beads) come from here.
   Browser global SCENE_GENOMES; node module.exports. */
(function (root) {
  'use strict';
  const G = {
    table: { hex: 0.4714, stretch: 1.125, yaw: 0.6193, radius: 0.3602, height: 0.4191, thick: 0.0083, foot: 0.3731, legs: 3.4774, legW: 0.0419, cloth: 0.3025, clothR: 0.5328, clothG: 0.6814, clothB: 0.6397, topR: 0.7149, topG: 0.6834, topB: 0.4522, legLum: 0.0202 },
    inscription: { count: 1, order: 1, form: 1, curve: 1, wobble: 0, size: 0.0293, pitch: 0.0287, pressure: 0.0049, cx: 0.0297, cz: 0.0188, rot: -27.1767, fSpan: 0.0924, fDrop: 0.0265, fBack: 0.2911, fBot: 0.0674, r: 0.7455, g: 0.4739, b: 0.1876 },
    candles: { count: 7.393, ring: 0.0462, arc: 117.4658, mid: -122.9271, jitter: 0.3765, height: 0.052, thick: 0.0076, depth: 0.0098, striped: 0.4665, turns: 7.9867, cool: 0.282, cr: 0.8878, cg: 0.7556, cb: 0.5497, sr: 0.5769, sg: 0.3767, sb: 0, br: 0.831, bg: 0.8706, bb: 0.9473, wick: 0.1136, flame: 0.3444, fw: 0.4195, lean: 0.7831, flicker: 0.0765 },
    people: { count: 3.482, arc: 93.7882, centre: 4.4722, dist: 0.0682, height: 0.7679, head: 0.167, shoulders: 0.2499, variety: 0.5999, lean: 4.9981, tilt: 15.0114, onTable: 0.6277, freeLift: 0.1431, together: 0.047, clothLum: 0.4656, clothSpread: 0.8735, clothWarm: 0.3802, dress: 0.6682, hat: 0.0838, hairLen: 0.737, hairVol: 0.6172, hairTone: 0.075, hairSpread: 0.3908 },
    cakeFinish: null   // filled below from the cake climb
  };
  G.cakeFinish = { taper: 0.98, board: 0, bevel: 0.14, frostTop: 0.32, frostSide: 0.22, spread: 0.9, fill: 0.5, border: 0.22, foot: 0.45, beadL: 86, beadA: 1, beadB: 10 };
  // a genome array for a module from a named object (genes not named keep the module's blank)
  function arr(M, named) { const g = M.blank(); M.genes.forEach((d, i) => { if (named && named[d[0]] != null) g[i] = Math.max(d[2], Math.min(d[3], named[d[0]])); }); return g; }
  const API = { G, arr };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SCENE_GENOMES = API;
})(typeof window !== 'undefined' ? window : globalThis);
