// ============================================================================
// STELLINE ORB DESIGN  -  the orb is the design tool; the drawer is a convenience.
//
// RING BANKS: each builder exposes several banks of five rings. Discrete choices
// (shape, finish, border, candle type, script, ink...) are detented rings; continuous
// ones (age, height, bulge, glow...) are smooth. The rocker (or PgUp/PgDn, or the
// bank tabs) changes bank. Every parameter of every builder is reachable from the orb.
//
// LETTER WHEEL: in the WRITING bank, L1 spins through A-Z, 0-9, space and delete; the
// red-dot button types the letter onto the cake. The orb types the name.
//
// INVERSE DESIGN: give the orb a target (a photo dropped on the glass, or the film's own
// frame) and it turns its own rings, bank by bank, until the model resembles the target.
// What the orb found is the recipe: the ring positions ARE the design.
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS, H = A.hero; if (!A || !H) return;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const toast = m => A.toast && A.toast(m), say = m => A.say && A.say(m);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const CO = A.cakeOptions || {};

  // ---------------------------------------------------------------- spec helpers
  const dialOf = v => 20 + 180 * clamp(v, 0, 1), valOf = a => clamp((((a % 360) + 360) % 360 - 20) / 180, 0, 1);
  // enum ring: options are values stored in g[key]; names optional
  function En(label, key, opts, o) {
    o = o || {}; const N = opts.length, names = o.names || opts.map(v => String(v).toUpperCase());
    return { label, enumN: N, key, live: !!o.live, fit: o.fit !== false, norm: g => (Math.max(0, opts.findIndex(v => v === g[key])) + 0.5) / N,
      apply(g, v) { const i = clamp(Math.floor(v * N), 0, N - 1); if (g[key] === opts[i]) return false; g[key] = opts[i]; if (o.after) o.after(g, opts[i]); return true; },
      step(g, d) { const i = clamp(opts.findIndex(x => x === g[key]) + d, 0, N - 1); if (g[key] === opts[i]) return false; g[key] = opts[i]; if (o.after) o.after(g, opts[i]); return true; },
      read: g => names[Math.max(0, opts.findIndex(v => v === g[key]))] || '?', fitVals: opts.map((_, i) => (i + 0.5) / N) };
  }
  // numeric ring
  function Nu(label, key, min, max, o) {
    o = o || {}; const f = o.fmt || (v => v.toFixed(2)); const q = v => o.int ? Math.round(v) : v;
    return { label, key, live: !!o.live, fit: o.fit !== false, norm: g => (g[key] - min) / (max - min), apply(g, v) { const nv = q(min + v * (max - min)); if (nv === g[key]) return false; g[key] = nv; if (o.after) o.after(g, nv); return true; },
      step(g, d, fine) { const span = max - min; const nv = clamp(q(g[key] + d * (o.int ? 1 : span * (fine ? 0.02 : 0.08))), min, max); if (nv === g[key]) return false; g[key] = nv; if (o.after) o.after(g, nv); return true; }, read: g => f(g[key]), fitVals: [0.15, 0.5, 0.85] };
  }
  const names = arr => arr.map(x => x[0].toUpperCase());
  const idx = n => Array.from({ length: n }, (_, i) => i);

  // ---------------------------------------------------------------- letter wheel
  const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', ' ', '⌫'];
  A.letterIdx = 0; A.letterBuf = null;
  const LetterSpec = { label: 'LETTER', enumN: LETTERS.length, letter: true, live: true, fit: false, norm: () => (A.letterIdx + 0.5) / LETTERS.length,
    apply(g, v) { const i = clamp(Math.floor(v * LETTERS.length), 0, LETTERS.length - 1); if (i === A.letterIdx) return false; A.letterIdx = i; return true; },
    step(g, d) { const i = clamp(A.letterIdx + d, 0, LETTERS.length - 1); if (i === A.letterIdx) return false; A.letterIdx = i; return true; },
    read: g => `${LETTERS[A.letterIdx] === ' ' ? '␣' : LETTERS[A.letterIdx]}  ▸ ${String(g.text || '').replace(/\n/g, '/').slice(-8)}▮`, fitVals: [] };
  A.commitLetter = function () {
    const G = H.genome; if (A.mode !== 'cake') return; const ch = LETTERS[A.letterIdx]; let t = String(G.text || '');
    if (!A.letterBuf) { A.letterBuf = true; if (/^(HAPPY BIRTHDAY|MAKE A WISH|CHEERS|生日快樂)$/.test(t) || A._fresh) t = ''; }
    if (ch === '⌫') t = t.slice(0, -1); else if (t.length < 12) t += ch;
    if (A.authorPush) A.authorPush(); G.text = t; G.name = t; G.font = G.font === 'piped' || /^[A-Z0-9 ]*$/.test(t) ? 'piped' : G.font; G.variant = -1; G.layout = G.layout === 'side' || G.layout === 'arc' ? G.layout : 'top';
    H.pipeToEnd = true; H.rebuild(false); if (A.chime) A.chime(); say(t ? 'Piped ' + t : 'Cleared'); if (A.refreshHud) A.refreshHud();
  };

  // ---------------------------------------------------------------- the banks
  const fixCake = g => { const D = { drum: 'sponge', poly: 'ganache', opera: 'opera' }; const ok = { drum: ['sponge', 'frosted', 'naked', 'ganache'], poly: ['ganache', 'frosted'], opera: ['opera'] }[g.shape]; if (ok) { if (!ok.includes(g.finish)) g.finish = D[g.shape]; g.scene = 'void'; g.table = 'none'; g.view = 'hero'; } else if (g.view === 'hero') g.view = 'tq'; g.cslots = null; };
  const resetSlots = g => { g.cslots = null; };
  const BANKS = {
    cake: () => [
      { name: 'LENS', lens: true },
      { name: 'FORM', specs: [En('L1:SHAPE', 'shape', CO.SHAPES, { after: fixCake }), En('L2:FINISH', 'finish', ['sponge', 'frosted', 'naked', 'ganache', 'opera']), Nu('L3:TIERS', 'tiers', 1, 3, { int: true, fmt: v => v + (v > 1 ? ' TIERS' : ' TIER') }), En('R1:BORDER', 'border', CO.BORDERS), En('R2:SIDES', 'sidedec', CO.SIDEDECS)] },
      { name: 'SURFACE', specs: [En('L1:SPONGE', 'sponge', idx(CO.SPONGES.length), { names: names(CO.SPONGES) }), En('L2:ICING', 'icing', idx(CO.ICINGS.length), { names: names(CO.ICINGS) }), Nu('L3:DRIPS', 'drips', 0, 1, { fmt: v => Math.round(v * 100) + '%' }), En('R1:TOPPING', 'topping', CO.TOPPINGS), En('R2:DUST', 'dust', [0, 1], { names: ['NONE', 'DUSTED'] })] },
      { name: 'CANDLES', specs: [En('L1:CANDLE', 'candle', CO.CANDLES, { after: resetSlots }), Nu('L2:AGE', 'age', 1, 40, { int: true, after: resetSlots, fmt: v => v + (v > 1 ? ' CANDLES' : ' CANDLE') }), En('L3:LAYOUT', 'arr', CO.ARRS, { after: resetSlots }), En('R1:BURN', 'burn', [0, 1, 6], { live: true, names: ['STILL', 'BURNING', 'TIME-LAPSE'] }), Nu('R2:PARTY', 'balloons', 0, 5, { int: true, fmt: v => v + ' BALLOONS' })] },
      { name: 'WRITING', specs: [LetterSpec, En('L2:SCRIPT', 'font', CO.FONTS), En('L3:MEDIUM', 'medium', CO.MEDIA), En('R1:INK', 'ink', idx(CO.INKS.length), { names: names(CO.INKS) }), En('R2:LAYOUT', 'layout', CO.LAYOUTS)] },
      sysBank(),
    ],
    bug: () => { const B = H.builders.bug, O = B.opts || {}; return [
      { name: 'LENS', lens: true },
      { name: 'EYE', specs: [En('L1:EYE', 'eyeType', O.EYE_TYPES), En('L2:FACETS', 'facetShape', ['hex', 'square', 'round']), Nu('L3:BULGE', 'bulge', 0, 1, { live: true }), Nu('R1:BAND', 'eyeBand', 0, 1, { live: true }), Nu('R2:GLOW', 'glow', 0, 1, { live: true })] },
      { name: 'BODY', specs: [En('L1:PLAN', 'plan', O.PLANS, { after: (g, v) => B.applyPlan(g, v) }), Nu('L2:LEGS', 'legLen', 0.5, 1.8), Nu('L3:ANTENNA', 'antLen', 0.3, 2.5), Nu('R1:JAW', 'jawLen', 0.3, 2), Nu('R2:SIZE', 'mm', 4, 60, { int: true, live: true, fmt: v => v + ' MM' })] },
      { name: 'SURFACE', specs: [En('L1:PATTERN', 'pattern', O.PATTERNS), Nu('L2:MATTE', 'dull', 0, 1), Nu('L3:METAL', 'metal', 0, 1), Nu('R1:EYE HUE', 'eyeHue', 0, 1, { live: true }), En('R2:STAGE', 'stage', O.STAGES)] },
      sysBank(),
    ]; },
    child: () => [
      { name: 'LENS', lens: true },
      { name: 'LOOK', specs: [En('L1:SKIN', 'skin', idx(6), { names: ['PORCELAIN', 'PEACH', 'GOLDEN', 'OLIVE', 'BROWN', 'DEEP'] }), En('L2:HAIR', 'hair', idx(6), { names: ['BLOND', 'LT BROWN', 'DK BROWN', 'BLACK', 'RED', 'AUBURN'] }), En('L3:STYLE', 'style', ['bangs', 'curly', 'short', 'pony', 'bob']), Nu('R1:EYES', 'iris', 0, 1), Nu('R2:FACES', 'count', 1, 3, { int: true, fmt: v => v + (v > 1 ? ' FACES' : ' FACE') })] },
      sysBank(),
    ],
  };
  // ---------------------------------------------------------------- SYSTEM bank: everything that used to be a menu on the glass
  A.sysIdx = { action: 0, out: 0, mode: -1, recipe: 0, variant: -1 };
  const MODES = ['film', 'bug', 'cake', 'child'];
  const OUTS = [['SNAPSHOT', () => A.snapshot()], ['STILL 4K', () => A.still()], ['CLIP 8s', () => A.recordClip()], ['SHARE LINK', () => A.shareLink()], ['SPEC FILE', () => A.downloadSpec()]];
  const actionList = () => { const L = [['REPLAY', () => A.replay()], ['REROLL', () => A.reroll()], ['GALLERY', () => A.gallery()], ['OTHERWISE', () => A.cycleVariant()], ['MATCH FILM', () => A.toggleMatch()], ['FIT FILM', () => A.fitFromFilm()], ['FIT PHOTO', () => A.pickPhoto()], ['UNDO', () => A.undo(false)], ['REDO', () => A.undo(true)], ['BLOW / XRAY', () => A.ops.compare()]];
    if (A.mode === 'cake') L.push(['KEEP CLEAR', () => A.keepClear()], ['CLEAR PIPING', () => A.clearStrokes()], ['SNUFF ALL', () => A.setAllCandles(false)], ['LIGHT ALL', () => A.setAllCandles(true)]);
    L.push(['PHOTO MODE', () => A.togglePhoto()], ['SOUND', () => A.toggleSonic && A.toggleSonic()], ['NARRATE', () => A.toggleNarrate && A.toggleNarrate()], ['DRAWER', () => A.toggleDrawer()], ['HELP', () => document.getElementById('v5Help').classList.toggle('on')]); return L; };
  const deb = {}; const later = (k, fn, ms) => { clearTimeout(deb[k]); deb[k] = setTimeout(fn, ms || 320); };
  function Sys(label, nFn, getFn, setFn, readFn) { return { label, sys: true, live: true, fit: false, fitVals: [], get enumN() { return nFn(); }, norm: () => (getFn() + 0.5) / nFn(), apply(g, v) { const N = nFn(), i = clamp(Math.floor(v * N), 0, N - 1); if (i === getFn()) return false; setFn(i); return true; }, step(g, d) { const i = clamp(getFn() + d, 0, nFn() - 1); if (i === getFn()) return false; setFn(i); return true; }, read: readFn }; }
  const recipeNames = () => Object.keys(A.cakeRecipes || {}).concat(['FILM']);
  const variantNames = () => (H.builders[H.kind].variants || []).map(v => v.code.replace(/^(CANONICAL|OTHERWISE [IV]+):?\s*/, (m, a) => a === 'CANONICAL' ? 'CANON ' : a.replace('OTHERWISE', 'OTH') + ' ').split('[')[0].trim().slice(0, 14));
  A.setVariant = function (n) { const b = H.builders[H.kind], g = H.genome; if (!b.variants[n]) return; Object.assign(g, b.variants[n].patch, { variant: n }); H.rebuild(false); if (A.syncHeroRings) A.syncHeroRings(); if (A.rebuildDrawer) A.rebuildDrawer(); toast(b.variants[n].code); };
  const sysBank = () => ({ name: 'SYSTEM', specs: [
    Sys('L1:MODE', () => 4, () => A.sysIdx.mode >= 0 ? A.sysIdx.mode : MODES.indexOf(A.mode), i => { A.sysIdx.mode = i; later('mode', () => { const m = MODES[A.sysIdx.mode]; A.sysIdx.mode = -1; if (m !== A.mode) A.setMode(m); }); }, () => (MODES[A.sysIdx.mode >= 0 ? A.sysIdx.mode : MODES.indexOf(A.mode)] || '').toUpperCase()),
    Sys('L2:TOOL', () => 3, () => ['orbit', 'candle', 'pipe'].indexOf(A.tool), i => A.setTool(['orbit', 'candle', 'pipe'][i]), () => (A.tool || 'orbit').toUpperCase()),
    Sys('L3:RECIPE', () => H.kind === 'cake' ? recipeNames().length : Math.max(1, variantNames().length), () => H.kind === 'cake' ? A.sysIdx.recipe : (A.sysIdx.variant >= 0 ? A.sysIdx.variant : Math.max(0, H.genome.variant)), i => { if (H.kind === 'cake') { A.sysIdx.recipe = i; later('rec', () => { const n = recipeNames()[A.sysIdx.recipe]; n === 'FILM' ? A.canon() : A.applyRecipe(n); }); } else { A.sysIdx.variant = i; later('var', () => { A.setVariant(A.sysIdx.variant); A.sysIdx.variant = -1; }); } }, () => H.kind === 'cake' ? recipeNames()[A.sysIdx.recipe] : (variantNames()[A.sysIdx.variant >= 0 ? A.sysIdx.variant : Math.max(0, H.genome.variant)] || 'CANON')),
    Sys('R1:ACTION', () => actionList().length, () => Math.min(A.sysIdx.action, actionList().length - 1), i => { A.sysIdx.action = i; }, () => (actionList()[Math.min(A.sysIdx.action, actionList().length - 1)] || ['?'])[0]),
    Sys('R2:OUTPUT', () => OUTS.length, () => A.sysIdx.out, i => { A.sysIdx.out = i; }, () => OUTS[A.sysIdx.out][0]),
  ] });
  A.bankIsSystem = () => A.mode !== 'film' && A.bankName() === 'SYSTEM';
  A.execSystem = function () { const r = window.state ? state.activeCoupledRing | 0 : 0; if (r === 4) { OUTS[A.sysIdx.out][1](); return; } if (r === 3 || r === 0) { const a = actionList()[Math.min(A.sysIdx.action, actionList().length - 1)]; if (a) { toast('EXECUTE · ' + a[0]); a[1](); } return; } toast('TURN R1 (ACTION) OR R2 (OUTPUT), THEN PRESS THE RED DOT'); };
  const state_ = { bank: {}, banks: {} }; const orig = {};
  const kindNow = () => H.kind;
  const banksOf = k => state_.banks[k] || (state_.banks[k] = BANKS[k] ? BANKS[k]() : [{ name: 'LENS', lens: true }]);
  const curBank = k => banksOf(k)[state_.bank[k] || 0];
  A.bankName = () => curBank(kindNow()).name;
  A.bankIsWriting = () => A.mode === 'cake' && A.bankName() === 'WRITING';
  A.banksList = () => banksOf(kindNow()).map(b => b.name);
  A.bankIndex = () => state_.bank[kindNow()] || 0;
  A.currentSpecs = () => { const b = curBank(kindNow()); return b.lens ? null : b.specs; };

  function wrap(kind) {
    const b = H.builders[kind]; if (!b || b._wrapped) return; b._wrapped = true; orig[kind] = { dials: b.dials, onDial: b.onDial, labels: b.labels, readout: b.readout };
    b.dials = g => { const bk = curBank(kind); return bk.lens ? orig[kind].dials(g) : bk.specs.map(sp => dialOf(sp.norm(g))); };
    b.labels = new Proxy(orig[kind].labels, { get(t, p) { const bk = curBank(kind); if (bk.lens) return t[p]; const L = bk.specs.map(sp => sp.label); if (p === 'length') return 5; if (p === 'map') return (...a) => L.map(...a); if (typeof p === 'string' && /^\d+$/.test(p)) return L[+p]; return L[p]; } });
    b.readout = (g, i) => { const bk = curBank(kind); return bk.lens ? orig[kind].readout(g, i) : bk.specs[i].read(g); };
    b.onDial = (ring, ang) => { const bk = curBank(kind); if (bk.lens) return orig[kind].onDial(ring, ang); const sp = bk.specs[ring]; if (!sp) return; const g = H.genome; const ch = sp.apply(g, valOf(ang)); if (!ch) return; g.variant = -1; if (sp.enumN && window.playDetentTick) try { playDetentTick(ring, 1.2); } catch (e) { } if (!sp.live && !sp.letter) H.rebuildSoon(170); if (A.refreshHud) A.refreshHud(); };
    b.origDials = orig[kind].dials; b.lensDials = g => orig[kind].dials(g);
  }
  ['cake', 'bug', 'child'].forEach(wrap);

  A.setBank = function (i, quiet) {
    const k = kindNow(); const L = banksOf(k); const n = ((i % L.length) + L.length) % L.length; state_.bank[k] = n;
    if (A.syncHeroRings) A.syncHeroRings(); if (window.state) state.activeCoupledRing = 0;
    if (!quiet) { toast('BANK · ' + L[n].name + (L[n].lens ? '' : ' · ' + L[n].specs.map(s => s.label.split(':')[1]).join(' · '))); say('Ring bank ' + L[n].name + '.'); if (window.playMicroSwitchClick) playMicroSwitchClick(true, 160 + n * 40); }
  };
  A.cycleBank = d => A.setBank((state_.bank[kindNow()] || 0) + (d || 1));
  A.on('mode', () => { state_.bank[kindNow()] = 0; });
  // step the active ring (keyboard / HUD), enum = one detent, numeric = 8% (fine 2%)
  A.stepRing = function (r, d, fine) { const k = kindNow(), b = H.builders[k]; const bk = curBank(k); if (bk.lens) return false; const sp = bk.specs[r]; if (!sp) return true; const ch = sp.step(H.genome, d, fine); if (ch) { H.genome.variant = -1; if (window.state) { state._syncingNode = true; setRingAngle(r, dialOf(sp.norm(H.genome)), true); state._syncingNode = false; } if (!sp.live && !sp.letter) H.rebuildSoon(170); if (window.playDetentTick && sp.enumN) try { playDetentTick(r, 1.2); } catch (e) { } if (A.refreshHud) A.refreshHud(); } return true; };

  // ---------------------------------------------------------------- inverse design
  const TW = 96, TH = 54;
  function toTarget(src) { const c = document.createElement('canvas'); c.width = TW; c.height = TH; const x = c.getContext('2d', { willReadFrequently: true }); const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight; const ar = TW / TH; let cw = sw, ch = sw / ar; if (ch > sh) { ch = sh; cw = sh * ar; } x.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, TW, TH); return x.getImageData(0, 0, TW, TH).data; }
  function score(a, b) {
    let l1 = 0, dr = 0, dg = 0, db = 0; const ha = new Float32Array(12), hb = new Float32Array(12); const n = TW * TH;
    for (let i = 0; i < n; i++) { const o = i * 4; l1 += Math.abs(a[o] - b[o]) + Math.abs(a[o + 1] - b[o + 1]) + Math.abs(a[o + 2] - b[o + 2]); dr += a[o]; dg += a[o + 1]; db += a[o + 2]; ha[Math.min(11, (0.3 * a[o] + 0.59 * a[o + 1] + 0.11 * a[o + 2]) / 21.3 | 0)]++; hb[Math.min(11, (0.3 * b[o] + 0.59 * b[o + 1] + 0.11 * b[o + 2]) / 21.3 | 0)]++; }
    let hi = 0; for (let k = 0; k < 12; k++) hi += Math.min(ha[k], hb[k]); hi /= n;
    let tr = 0, tg = 0, tb = 0; for (let i = 0; i < n; i++) { const o = i * 4; tr += b[o]; tg += b[o + 1]; tb += b[o + 2]; }
    const cd = (Math.abs(dr - tr) + Math.abs(dg - tg) + Math.abs(db - tb)) / (n * 765);
    return 0.5 * (1 - l1 / (n * 765) * 1.6) + 0.3 * hi + 0.2 * (1 - cd * 3);
  }
  A.designFit = null;
  A.inverseFit = async function (srcImage, label) {
    if (A.mode === 'film') { toast('OPEN BUG, BIRTHDAY OR CHILD FIRST'); return; } if (A.designFit) return;
    const kind = H.kind, b = H.builders[kind], tgt = toTarget(srcImage); const G = H.genome;
    A.designFit = { cancel: false, score: 0, step: 0, total: 0, label: label || 'TARGET' }; const F = A.designFit;
    if (kind === 'cake') Object.assign(G, { scene: 'void', table: 'none', view: 'hero', props: 0, balloons: 0, smarties: 0, cutouts: 0, cslots: null, solid: 1, pipe: 1 });
    H.sel = -1; H.lockRef = null; A.matchOn = false; H.rebuild(false); H.frame(b.overview, true); H.syncCam();
    const evalNow = async () => { H.updaters.forEach(u => u(0.016, H.t)); H.syncCam(); await sleep(16); const cv = H.capture(TW, TH); return score(cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, TW, TH).data, tgt); };
    const banks = banksOf(kind).filter(bk => !bk.lens); const jobs = []; banks.forEach((bk, bi) => bk.specs.forEach((sp, ri) => { if (sp.fit === false) return; jobs.push({ bk, bi, sp, ri }); }));
    F.total = jobs.reduce((a, j) => a + j.sp.fitVals.length, 0); say('The orb is turning itself to match ' + F.label + '.'); toast('INVERSE DESIGN · THE ORB IS TURNING ITSELF'); A.setBank(banksOf(kind).indexOf(banks[0]), true);
    let best = await evalNow(); F.score = best;
    for (const j of jobs) {
      if (F.cancel) break; A.setBank(banksOf(kind).indexOf(j.bk), true); if (window.state) state.activeCoupledRing = j.ri;
      const keep = JSON.parse(JSON.stringify(G)); let bestV = null;
      for (const v of j.sp.fitVals) {
        if (F.cancel) break; F.step++; const before = JSON.stringify(G);
        const changed = j.sp.apply(G, v); if (!changed) { continue; }
        state._syncingNode = true; setRingAngle(j.ri, dialOf(j.sp.norm(G)), true); state._syncingNode = false;
        H.rebuild(false); H.frame(b.overview, true); const sc = await evalNow(); F.score = Math.max(F.score, sc);
        if (sc > best + 1e-4) { best = sc; bestV = JSON.parse(JSON.stringify(G)); }
      }
      Object.keys(G).forEach(k => delete G[k]); Object.assign(G, bestV || keep); if (bestV) { H.rebuild(false); H.frame(b.overview, true); }
      state._syncingNode = true; setRingAngle(j.ri, dialOf(j.sp.norm(G)), true); state._syncingNode = false; if (A.syncHeroRings) A.syncHeroRings();
      await sleep(30);
    }
    const done = F; A.designFit = null; G.variant = -1; H.rebuild(false); H.frame(b.overview, true); A.setBank(0, true); if (A.syncHeroRings) A.syncHeroRings(); if (A.rebuildDrawer) A.rebuildDrawer();
    toast(done.cancel ? 'INVERSE DESIGN STOPPED' : `FOUND IT · MATCH ${(best * 100).toFixed(0)} / 100 · THE RINGS ARE THE RECIPE`); say(done.cancel ? 'Stopped.' : `Match ${(best * 100).toFixed(0)} out of 100. The ring positions are the recipe.`); A.emit('author'); return best;
  };
  A.fitFromFilm = async function () { const ref = { cake: 154, bug: 33, child: 172 }[H.kind]; const r = A.getRes(ref); let t = 0; while (!r.ready && t++ < 100) await sleep(50); if (!r.ready) return; return A.inverseFit(r.frameImg, 'THE FILM AT ' + ref + 's'); };
  A.pickPhoto = () => { let inp = document.getElementById('v5RefFile'); if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.id = 'v5RefFile'; inp.style.display = 'none'; document.body.appendChild(inp); inp.onchange = e => { const f = e.target.files[0]; if (f) fitFile(f); inp.value = ''; }; } inp.click(); };
  function fitFile(f) { const im = new Image(); im.onload = () => { A.inverseFit(im, 'YOUR PHOTO'); }; im.src = URL.createObjectURL(f); }
  const holo = document.getElementById('hologramCanvas');
  ['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => { if (!window.state || state.engineVersion !== 'v5' || A.mode === 'film') return; const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (ev === 'dragover') { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); return; } if (f && /^image\//.test(f.type)) { e.preventDefault(); fitFile(f); } }));
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && A.designFit) A.designFit.cancel = true; }, true);

  // ---------------------------------------------------------------- HUD: only the inverse-design progress (no menus on the glass)
  const prevHud = A.drawAuthorHud;
  A.drawAuthorHud = function (ctx, w, h, U) {
    if (prevHud) prevHud(ctx, w, h, U);
    if (A.designFit) { const F = A.designFit; U.txt(ctx, `INVERSE DESIGN · ${F.label} · MATCH ${(F.score * 100).toFixed(0)} · ${F.step}/${F.total} · ESC TO STOP`, w / 2, h - 96, U.AMB, 'center', 9.5); const bw = 260, bx = w / 2 - bw / 2, by = h - 88; ctx.fillStyle = 'rgba(247,236,222,.2)'; ctx.fillRect(bx, by, bw, 2); ctx.fillStyle = U.AMB; ctx.fillRect(bx, by, bw * clamp(F.step / Math.max(1, F.total), 0, 1), 2); }
  };
  // rocker: left/right = bank, up/down = dolly (hero modes)
  const ops = window.V5OPS; if (ops) { const od = ops.dpad; ops.dpad = function (dx, dy) { if (A.mode !== 'film' && !A.designFit) { if (Math.abs(dx) >= Math.abs(dy)) { if (!A._rk || performance.now() - A._rk > 280) { A._rk = performance.now(); A.cycleBank(dx > 0 ? 1 : -1); } } else H.nudge(0, 0, dy * 0.1); return; } od(dx, dy); }; const oi = ops.imprint; ops.imprint = function () { if (A.mode !== 'film' && A.bankIsWriting()) { A.commitLetter(); return; } if (A.mode !== 'film' && A.bankIsSystem()) { A.execSystem(); return; } oi(); }; ops.inverseFit = () => A.fitFromFilm(); }
  window.addEventListener('keydown', e => { if (!window.state || state.engineVersion !== 'v5' || A.mode === 'film') return; if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; const k = e.key; if (k === 'PageUp' || k === 'PageDown') { e.preventDefault(); e.stopImmediatePropagation(); A.cycleBank(k === 'PageDown' ? 1 : -1); } else if (k === 'i' || k === 'I') { e.preventDefault(); e.stopImmediatePropagation(); e.shiftKey ? A.pickPhoto() : A.fitFromFilm(); } else if ((k === 'ArrowUp' || k === 'ArrowDown') && !e.altKey) { const r = window.state ? state.activeCoupledRing | 0 : 0; if (A.stepRing(r, k === 'ArrowUp' ? 1 : -1, e.shiftKey)) { e.preventDefault(); e.stopImmediatePropagation(); } } else if (k === 'Enter' && A.bankIsWriting()) { e.preventDefault(); e.stopImmediatePropagation(); A.commitLetter(); } else if (k === 'Enter' && A.bankIsSystem()) { e.preventDefault(); e.stopImmediatePropagation(); A.execSystem(); } }, true);
  // replays assume the LENS bank
  const rp = A.replay; if (rp) A.replay = function (n) { A.setBank(0, true); return rp.call(this, n); };
})();
