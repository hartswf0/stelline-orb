/* ui/relations.js — which part stands on which, and the anchor names the host looks for (first match wins). Node and browser (window.REL). */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.REL = factory(); })(this, function () {
  'use strict';
  const PARTS = ['table', 'cake', 'inscription', 'candles', 'people', 'light'];
  const SUPPORT = { table: null, cake: 'table', inscription: 'cake', candles: 'cake', people: 'table', light: null };
  const ATTACH = { cake: ['top', 'topCentre', 'topCenter', 'tableTop', 'surface', 'centre', 'center'], inscription: ['inscription', 'writing', 'top', 'topCentre', 'topCenter', 'surface', 'centre'],
    candles: ['candles', 'top', 'topCentre', 'topCenter', 'surface', 'centre'], people: ['floor', 'ground', 'base'] };
  const BASE = ['base', 'bottom', 'origin'];
  const findA = (A, names) => { if (!A) return null; for (const k of names) if (Array.isArray(A[k]) && A[k].length >= 3 && typeof A[k][0] === 'number') return A[k]; return null; };
  /* what a dependant is told about its support (refs.support): the support's anchors, plus its top(G) description when the module has one (the table's polygon) */
  function supportInfo(name, mod, G) { let A = {}; try { A = mod.anchors(G) || {}; } catch (e) { } let top = {}; try { if (typeof mod.top === 'function') top = mod.top(G) || {}; } catch (e) { } return Object.assign({ part: name }, A, top); }
  return { PARTS, SUPPORT, ATTACH, BASE, findA, supportInfo };
});
