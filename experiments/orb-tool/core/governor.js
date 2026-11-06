/* ORB TOOL core: the frame governor (AUDIT R6, after orb-pro-5.html:1353-1366). It times each painted frame; two slow paints in a
   row coarsen the drawing one level, three seconds of good paints give a level back, and every change is said in words so the
   status line never hides that the picture is thinned. Levels: 0 full, 1 coarse (pixel ratio 1, fewer segments), 2 coarsest
   (also no knurl, no flame glow). Browser global CORE_GOVERNOR; node module.exports. */
(function (root) {
  'use strict';
  function create(opts) {
    opts = opts || {}; const SLOW = opts.slowMs || 34, BACK = opts.fastFrames || 180, MAX = opts.maxLevel == null ? 2 : opts.maxLevel;
    let level = 0, slow = 0, fast = 0, last = 0;
    const words = ['full drawing', 'thinned: slow paint, drawing coarser', 'thinned more: slow paint, drawing coarsest'];
    function sample(ms) { last = ms;
      if (ms > SLOW) { slow++; fast = 0; if (slow >= 2 && level < MAX) { level++; slow = 0; return { changed: true, level, say: words[level].toUpperCase() + ' (' + Math.round(ms) + ' MS A FRAME)' }; } }
      else { slow = 0; fast++; if (fast >= BACK && level > 0) { level--; fast = 0; return { changed: true, level, say: level ? words[level].toUpperCase() : 'PAINT IS FAST AGAIN: FULL DRAWING' }; } }
      return { changed: false, level }; }
    return { sample, get level() { return level; }, get last() { return last; }, words, SLOW };
  }
  const API = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CORE_GOVERNOR = API;
})(typeof window !== 'undefined' ? window : globalThis);
