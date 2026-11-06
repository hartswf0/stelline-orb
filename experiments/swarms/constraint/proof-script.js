/* The proof passage, as ring turns on the device (shared by the page's SCENE button, the node check and the film).
   [time s, action, ring, detents, duration s]: 'turn' spreads the detents over the duration like a hand turning. */
(function (root) {
  const SCRIPT = [
    [0.30, 'turn', 'tri', 9, 0.55],      // HAND selected: raise the taper above wick height
    [0.45, 'turn', 'knurl', 46, 1.25],   // and reach for the far side of the cake: she runs out of arm
    [2.40, 'select'],                    // SELECT: the cake
    [2.60, 'turn', 'knurl', -21, 1.00],  // slide the cake along the table toward her
    [3.70, 'turn', 'tri', 8, 0.45],      // turn the cake: a candle comes round into her reach plane
    [4.35, 'select'],                    // SELECT: the hand
    [4.55, 'turn', 'knurl', -32, 1.00],  // bring the taper back over that wick
    [4.75, 'turn', 'tri', -2, 0.30],     // and down onto it
    [6.40, 'select'],                    // SELECT: the cake
    [6.60, 'turn', 'tri', 10, 0.50],     // turn the cake under the held taper: the next candle comes to it
    [7.75, 'turn', 'tri', 20, 0.80],     // and the next
    [8.70, 'turn', 'scale', -4, 0.60],  // kneel 20 degrees to the other side: she is a flat archived figure, the cake is round
    [9.95, 'end']];
  const API = { SCRIPT, DURATION: 10.0 };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PROOF = API;
})(typeof window !== 'undefined' ? window : globalThis);
