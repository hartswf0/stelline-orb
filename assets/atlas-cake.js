// ============================================================================
// BIRTHDAY BUILDER (Protocol II) v2 - a family of cakes and parties.
// shapes: round tiers / fluted bundt / square / heart / cupcake tower / naked layers
// toppings: berries, piped flowers, macarons, sprinkles   candles: striped, taper, sparkler
// tables: hex (the film), cloth, wood, marble   scenes: candlelit dark, fairy-light bokeh, window, neon
// props: bunting, gifts, plates, balloons, smarties   (optionally the film's children as cutouts)
// L1 GEOM.SOLID tiers/rows   L2 WICKS.DOF focus   L3 BUNDT.PIPE flutes / piping / swirl / berries
// R1 STAGE.LUMA candlelight -> room light        R2 WIND.GLAZE glaze hue
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS, H = A.hero; if (!A || !H) return;
  const T = THREE, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const V3 = (x, y, z) => new T.Vector3(x, y, z); const D2 = A.data;
  const pick = (r, arr) => arr[(r() * arr.length) | 0];

  const SPONGES = [['vanilla', '#e3c68e'], ['chocolate', '#4a2c1c'], ['red velvet', '#8b2230'], ['lemon', '#efd878'], ['matcha', '#9bb56b'], ['strawberry', '#f0a3a6'], ['golden', '#d9a04a']];
  const ICINGS = [['buttercream', '#f6ecd8'], ['rose', '#f1b9c4'], ['mint', '#bfe6d2'], ['sky', '#bcd7f0'], ['ganache', '#3b2217'], ['lilac', '#cdb8ea'], ['film cream', '#e6c98e'], ['coral', '#f0a58c'], ['butter yellow', '#f4dc8a'], ['cream', '#f0dcae'], ['orange', '#f2b268'], ['caramel', '#9a5a24']];
  const INKS = [['red', '#c8162c'], ['gold', '#d9a62e'], ['navy', '#1e3a8a'], ['green', '#1f7a43'], ['white', '#fbfbf5'], ['chocolate', '#3a2216'], ['vermilion', '#c8340f'], ['cream', '#f2e3b8'], ['tangerine', '#d4781c']];
  const BALLOONS = ['#d23a4c', '#e9b13a', '#3a78d2', '#44b57a', '#a35bd0', '#f08aa8'];
  const SHAPES = ['round', 'square', 'heart', 'cupcakes', 'naked', 'bundt', 'drum', 'drum', 'poly', 'opera'];
  const FINISHES = { drum: ['sponge', 'frosted', 'naked', 'ganache'], poly: ['ganache', 'frosted'], opera: ['opera'] }, BORDERS = ['shells', 'beads', 'crystals', 'none'], SIDEDECS = ['none', 'none', 'orange', 'gold'], ARRS = ['auto', 'grid', 'row', 'arc', 'cluster'], NAMES = ['LUZ', 'BEA', 'MARA', 'IZZY', 'NIA', 'OLA', 'SAM', 'LEO', 'ZOE', 'KAI', 'AVA', 'NOA', 'EVE', 'MAX', 'ISLA', 'THEO'];
  const TOPPINGS = ['none', 'berries', 'flowers', 'macarons', 'sprinkles'];
  const CANDLES = ['striped', 'braid', 'daisy', 'number', 'taper', 'tealight', 'sparkler'];
  const FONTS = ['piped', 'script', 'sans', 'serif', 'brush', 'round'], MEDIA = ['pipe', 'pipe', 'gel', 'choc', 'gold'], LAYOUTS = ['top', 'top', 'arc', 'side', 'topper'];
  const FONT_CSS = { script: '"Segoe Script","Brush Script MT","Lucida Handwriting",cursive', sans: '"Helvetica Neue",Arial,sans-serif', serif: 'Georgia,"Times New Roman",serif', brush: '"Noto Sans CJK SC","PingFang SC","Microsoft YaHei","Segoe Script",cursive', round: '"Arial Rounded MT Bold","Trebuchet MS",sans-serif' };
  A.writingPresets = [['HAPPY BIRTHDAY', 'script'], ['生日快樂', 'brush'], ['誕生日おめでとう', 'brush'], ['FELIZ CUMPLEAÑOS', 'sans'], ['С ДНЁМ РОЖДЕНИЯ', 'serif'], ['MAKE A WISH', 'round'], ['JOYEUX ANNIVERSAIRE', 'script']];
  const TABLES = ['none', 'hex', 'cloth', 'wood', 'marble'];
  const SCENES = ['void', 'dark', 'bokeh', 'window', 'neon'];
  A.cakeOptions = { SPONGES, ICINGS, INKS, SHAPES: ['round', 'drum', 'poly', 'opera', 'square', 'heart', 'bundt', 'naked', 'cupcakes'], FINISHES, BORDERS, SIDEDECS: ['none', 'orange', 'gold'], ARRS, CANDLES, FONTS, TOPPINGS, MEDIA, LAYOUTS };

  const FILM_VARIANTS = [
    { code: 'CANONICAL [VANILLA CYLINDER + 生日快樂 + 7 WICKS]', patch: { shape: 'round', tiers: 1, bundt: 0.0, age: 7, text: '生日快樂', sponge: 0, icing: 6, ink: 0, drips: 0.0, glaze: 0.5, room: 0.0, focus: 0.55, balloons: 0, smarties: 0, cutouts: 0, solid: 1, pipe: 1, temp: 0.5, font: 'brush', medium: 'pipe', layout: 'top', topping: 'none', candle: 'striped', table: 'hex', scene: 'dark', props: 0 } },
    { code: 'OTHERWISE I: KEPT BUNDT AT PARTY! [11-FLUTE DOME + SMARTIES]', patch: { shape: 'bundt', tiers: 1, bundt: 0.96, age: 7, sponge: 0, icing: 0, ink: 1, drips: 0.25, glaze: 0.58, room: 0.0, focus: 0.62, smarties: 24, topping: 'none' } },
    { code: 'OTHERWISE II: DARK GANACHE & 3 WICKS [SPOTLIGHT]', patch: { shape: 'round', tiers: 1, bundt: 0.0, age: 3, sponge: 1, icing: 4, ink: 1, drips: 0.8, glaze: 0.1, room: 0.0, focus: 0.7, smarties: 0, topping: 'berries' } },
    { code: 'OTHERWISE III: ROSE-GLAZE CROWN & 24 SMARTIES [FULL PARTY]', patch: { shape: 'round', tiers: 2, bundt: 0.68, age: 7, sponge: 5, icing: 1, ink: 4, drips: 0.5, glaze: 0.9, room: 0.25, focus: 0.5, smarties: 24, balloons: 3, topping: 'flowers', scene: 'bokeh', table: 'cloth', props: 1 } },
  ];

  const RECIPES = {
    LUZ:  { shape: 'drum', finish: 'sponge', sponge: 6, icing: 9, border: 'shells', dust: 1, sidedec: 'none', arr: 'grid', age: 13, candle: 'striped', text: 'LUZ', font: 'piped', medium: 'pipe', ink: 6, drips: 0 },
    BEA:  { shape: 'opera', finish: 'opera', sponge: 1, icing: 4, border: 'none', dust: 0, sidedec: 'none', arr: 'row', age: 2, candle: 'braid', text: 'BEA', font: 'piped', medium: 'pipe', ink: 7, drips: 0 },
    IZZY: { shape: 'poly', sides: 12, finish: 'ganache', sponge: 1, icing: 4, border: 'none', dust: 0, sidedec: 'gold', arr: 'row', age: 4, candle: 'daisy', text: 'IZZY', font: 'piped', medium: 'pipe', ink: 7, drips: 0 },
    NIA:  { shape: 'drum', finish: 'frosted', sponge: 3, icing: 10, border: 'shells', dust: 0, sidedec: 'orange', arr: 'grid', age: 19, candle: 'striped', text: 'NIA', font: 'piped', medium: 'pipe', ink: 8, drips: 0 },
    MARA: { shape: 'drum', finish: 'naked', sponge: 1, icing: 11, border: 'crystals', dust: 0, sidedec: 'none', arr: 'row', age: 29, candle: 'number', text: 'MARA', font: 'piped', medium: 'pipe', ink: 7, drips: 0.6 },
  };
  A.cakeRecipes = RECIPES;
  const STUDIO = { scene: 'void', table: 'none', view: 'hero', temp: 0.45, focus: 0.72, room: 0, glaze: 0.08, solid: 1, pipe: 1, layout: 'top', tiers: 1, topping: 'none', balloons: 0, smarties: 0, props: 0, cutouts: 0, bundt: 0 };
  function makeGenome(seed) {
    const r = H.rng(seed); const shape = pick(r, SHAPES);
    const g = { kind: 'cake', seed, name: '', age: 3 + ((r() * 12) | 0), text: pick(r, ['HAPPY BIRTHDAY', 'HAPPY BIRTHDAY', '生日快樂', 'MAKE A WISH', 'CHEERS']), shape, tiers: 1 + ((r() * 3) | 0), bundt: shape === 'bundt' ? 0.6 + r() * 0.4 : r() * 0.5,
      sponge: (r() * SPONGES.length) | 0, icing: (r() * ICINGS.length) | 0, ink: (r() * INKS.length) | 0, drips: r() < 0.55 ? 0.2 + r() * 0.7 : 0, glaze: r(), room: r() < 0.5 ? 0 : r() * 0.4, focus: 0.45 + r() * 0.4,
      smarties: r() < 0.35 ? 8 + ((r() * 28) | 0) : 0, balloons: r() < 0.6 ? 1 + ((r() * 4) | 0) : 0, sprinkles: 0, cutouts: 0, solid: 1, pipe: 1, temp: 0.35, font: pick(r, FONTS), medium: pick(r, MEDIA), layout: pick(r, LAYOUTS), topping: pick(r, TOPPINGS), candle: pick(r, CANDLES), cslots: null, strokes: [], nib: 0.45, burn: 0, finish: 'frosted', border: 'beads', sidedec: 'none', arr: 'auto', dust: 0, sides: 12, table: pick(r, TABLES), scene: pick(r, SCENES), props: r() < 0.6 ? 1 : 0, view: pick(r, ['tq', 'tq', 'front', 'high']), variant: -1 };
    if (g.shape === 'drum' || g.shape === 'poly' || g.shape === 'opera') { Object.assign(g, STUDIO, { finish: pick(r, FINISHES[g.shape]), border: g.shape === 'opera' ? 'none' : pick(r, BORDERS), sidedec: pick(r, SIDEDECS), arr: pick(r, ['grid', 'row', 'arc', 'cluster', 'grid']), dust: r() < 0.3 ? 1 : 0, text: pick(r, NAMES), font: r() < 0.7 ? 'piped' : g.font, sides: 8 + 2 * ((r() * 4) | 0), age: 2 + ((r() * 26) | 0), temp: 0.35 + r() * 0.3 }); if (g.finish === 'ganache' || g.shape === 'opera') g.icing = 4; if (g.finish === 'naked') { g.sponge = 1; g.icing = 11; g.border = pick(r, ['crystals', 'shells', 'none']); } if (r() < 0.5) g.candle = pick(r, ['striped', 'braid', 'daisy', 'number', 'striped']); if (g.candle === 'braid' || g.candle === 'daisy') g.age = Math.min(g.age, 7); if (g.candle === 'number') g.age = Math.min(Math.max(g.age, 1), 40); g.ink = pick(r, [0, 6, 7, 8, 1, 4]); }
    if (g.shape === 'cupcakes') g.age = Math.min(g.age, 12); if (g.candle === 'sparkler') g.age = Math.min(g.age, 9);
    return g;
  }
  function filmCanon(seed) { const g = makeGenome(seed); Object.assign(g, FILM_VARIANTS[0].patch, { name: '', sprinkles: 0, variant: 0, view: 'tq', finish: 'frosted', border: 'beads', sidedec: 'none', arr: 'auto', dust: 0 }); return g; }
  H.recipeGenome = (name, seed) => { const b = makeGenome(seed || 1234); return Object.assign(b, STUDIO, RECIPES[name], { name: '', variant: -1, seed: b.seed, cslots: null, strokes: [] }); };
  const dialOf = v => 20 + 180 * clamp(v, 0, 1); const valOf = a => clamp((((a % 360) + 360) % 360 - 20) / 180, 0, 1);
  const dials = g => [dialOf(g.solid), dialOf(g.focus), dialOf(g.pipe), dialOf(g.room), dialOf((g.temp + 1) / 2)];
  const icingColor = g => new T.Color(ICINGS[g.icing][1]);
  const glazeColor = g => { const c = icingColor(g).clone(); const hsl = {}; c.getHSL(hsl); const h = (g.glaze - 0.5) * 1.0 + hsl.h; return new T.Color().setHSL(((h % 1) + 1) % 1, clamp(hsl.s * 0.5 + Math.abs(g.glaze - 0.5) * 1.6, 0.1, 0.85), clamp(hsl.l * (g.icing === 4 ? 1.0 : 0.92), 0.12, 0.85)); };

  function textTexture(text, font, layout) {
    const W = 1024, Hh = layout === 'arc' ? 1024 : 512, c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, Hh); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = String(text || '').split('\n').slice(0, 3); const ff = FONT_CSS[font] || FONT_CSS.script;
    if (layout === 'arc') {
      const t = lines.join('  '); let sz = 150; for (; sz > 30; sz -= 6) { x.font = `bold ${sz}px ${ff}`; if (x.measureText(t).width < W * 0.78 * 1.6) break; }
      x.font = `bold ${sz}px ${ff}`; const R = W * 0.36, total = x.measureText(t).width; let ang = -Math.PI / 2 - (total / R) / 2; x.save(); x.translate(W / 2, Hh / 2);
      for (const ch of t) { const wch = x.measureText(ch).width; ang += (wch / R) / 2; x.save(); x.rotate(ang + Math.PI / 2); x.fillText(ch, 0, -R); x.restore(); ang += (wch / R) / 2; } x.restore();
    } else {
      let sz = lines.length > 1 ? 150 : 200; for (; sz > 30; sz -= 6) { x.font = `bold ${sz}px ${ff}`; if (Math.max(...lines.map(l => x.measureText(l).width)) < W * 0.86 && sz * lines.length * 1.1 < Hh * 0.9) break; }
      x.font = `bold ${sz}px ${ff}`; lines.forEach((l, i) => x.fillText(l, W / 2, Hh / 2 + (i - (lines.length - 1) / 2) * sz * 1.08));
    }
    const t = new T.CanvasTexture(c); t.anisotropy = 8; const b = document.createElement('canvas'); b.width = W; b.height = Hh; const bx = b.getContext('2d'); bx.filter = 'blur(5px)'; bx.drawImage(c, 0, 0); return [t, new T.CanvasTexture(b)];
  }
  function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,230,170,1)'); g.addColorStop(0.18, 'rgba(255,170,70,0.55)'); g.addColorStop(0.5, 'rgba(255,120,30,0.12)'); g.addColorStop(1, 'rgba(255,100,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); }
  const woodTex = () => H.noiseTex(256, (u, v) => { const n = H.fbm(u * 2, v * 22, 4); const c = 90 + 90 * n; return [c * 1.1, c * 0.72, c * 0.45]; }, true);

  // ---- single-stroke piping font (x 0..4, y 0..6) --------------------------------------------------------
  const GLYPH = {
    A: [[[0, 0], [2, 6], [4, 0]], [[0.8, 2.2], [3.2, 2.2]]], B: [[[0, 0], [0, 6], [2.6, 6], [3.6, 5.3], [3.6, 4.2], [2.6, 3.3], [0, 3.3]], [[2.6, 3.3], [3.8, 2.6], [3.8, 1], [2.8, 0], [0, 0]]], C: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1]]],
    D: [[[0, 0], [0, 6], [2.4, 6], [4, 4.6], [4, 1.4], [2.4, 0], [0, 0]]], E: [[[4, 6], [0, 6], [0, 0], [4, 0]], [[0, 3], [3, 3]]], F: [[[4, 6], [0, 6], [0, 0]], [[0, 3], [3, 3]]], G: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 3], [2.2, 3]]],
    H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]], I: [[[2, 0], [2, 6]], [[0.7, 6], [3.3, 6]], [[0.7, 0], [3.3, 0]]], J: [[[3.6, 6], [3.6, 1.2], [2.6, 0], [1, 0], [0, 1.2]]], K: [[[0, 0], [0, 6]], [[4, 6], [0, 2.6]], [[1.2, 3.6], [4, 0]]],
    L: [[[0, 6], [0, 0], [4, 0]]], M: [[[0, 0], [0, 6], [2, 2.4], [4, 6], [4, 0]]], N: [[[0, 0], [0, 6], [4, 0], [4, 6]]], O: [[[2, 6], [0.6, 5.4], [0, 4], [0, 2], [0.6, 0.6], [2, 0], [3.4, 0.6], [4, 2], [4, 4], [3.4, 5.4], [2, 6]]],
    P: [[[0, 0], [0, 6], [2.8, 6], [4, 5], [4, 4], [2.8, 3], [0, 3]]], Q: [[[2, 6], [0.6, 5.4], [0, 4], [0, 2], [0.6, 0.6], [2, 0], [3.4, 0.6], [4, 2], [4, 4], [3.4, 5.4], [2, 6]], [[2.6, 1.6], [4, -0.4]]], R: [[[0, 0], [0, 6], [2.8, 6], [4, 5], [4, 4], [2.8, 3], [0, 3]], [[2, 3], [4, 0]]],
    S: [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3.2], [3, 2.8], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]], T: [[[0, 6], [4, 6]], [[2, 6], [2, 0]]], U: [[[0, 6], [0, 1.4], [1, 0], [3, 0], [4, 1.4], [4, 6]]], V: [[[0, 6], [2, 0], [4, 6]]], W: [[[0, 6], [1, 0], [2, 3.6], [3, 0], [4, 6]]],
    X: [[[0, 6], [4, 0]], [[4, 6], [0, 0]]], Y: [[[0, 6], [2, 3], [4, 6]], [[2, 3], [2, 0]]], Z: [[[0, 6], [4, 6], [0, 0], [4, 0]]],
    0: [[[2, 6], [0.6, 5.4], [0, 4], [0, 2], [0.6, 0.6], [2, 0], [3.4, 0.6], [4, 2], [4, 4], [3.4, 5.4], [2, 6]]], 1: [[[1, 5], [2.2, 6], [2.2, 0]]], 2: [[[0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [0, 0], [4, 0]]],
    3: [[[0, 5.2], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3.2], [1.6, 3.2]], [[3, 3.2], [4, 2.4], [4, 1], [3, 0], [1, 0], [0, 0.8]]], 4: [[[3, 0], [3, 6], [0, 2], [4, 2]]], 5: [[[4, 6], [0.4, 6], [0, 3.2], [2.4, 3.8], [3.6, 3.2], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
    6: [[[3.6, 6], [1.4, 5], [0, 3], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2.4], [3, 3.2], [1, 3.2], [0, 2.6]]], 7: [[[0, 6], [4, 6], [1.4, 0]]], 8: [[[2, 3.2], [0.4, 3.8], [0.4, 5.2], [1.2, 6], [2.8, 6], [3.6, 5.2], [3.6, 3.8], [2, 3.2], [0, 2.4], [0, 0.8], [1, 0], [3, 0], [4, 0.8], [4, 2.4], [2, 3.2]]],
    9: [[[0.4, 0], [2.6, 1], [4, 3], [4, 5], [3, 6], [1, 6], [0, 5], [0, 3.6], [1, 2.8], [3, 2.8], [4, 3.4]]], '.': [[[2, 0], [2, 0.05]]], '!': [[[2, 6], [2, 2]], [[2, 0], [2, 0.05]]], '-': [[[0.6, 3], [3.4, 3]]], "'": [[[2, 6], [2, 4.6]]], '&': [[[4, 0], [0.6, 4], [1, 5.6], [2.2, 6], [3, 5.2], [0.4, 1.4], [1, 0], [2.6, 0], [4, 2.4]]],
  };
  const glyphsOk = t => [...String(t || '').toUpperCase()].every(ch => ch === '\n' || ch === ' ' || GLYPH[ch]);
  function chaikin(pts, n) { let p = pts; for (let k = 0; k < n; k++) { const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } q.push(p[p.length - 1]); p = q; } return p; }
  const crumbTex = (col, big) => { const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const b = col.clone(); x.fillStyle = '#' + b.getHexString(); x.fillRect(0, 0, S, S); const r = H.rng(9); for (let i = 0; i < (big ? 700 : 1400); i++) { const px = r() * S, py = r() * S, rad = (big ? 2 : 1) + r() * (big ? 7 : 4); x.fillStyle = `rgba(${40 + r() * 30 | 0},${20 + r() * 20 | 0},5,${0.1 + r() * 0.35})`; x.beginPath(); x.ellipse(px, py, rad * (0.7 + r() * 0.8), rad, r() * 3, 0, 7); x.fill(); } for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(255,235,190,${0.05 + r() * 0.12})`; x.beginPath(); x.arc(r() * S, r() * S, 1 + r() * 3, 0, 7); x.fill(); } const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 1); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
  const operaTex = () => { const W = 256, Hh = 512, c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d'); const bands = [[0x3a1f14, 0.17], [0xb88a4e, 0.14], [0x3a1f14, 0.17], [0xb88a4e, 0.14], [0x3a1f14, 0.17], [0x241008, 0.07], [0x2a140a, 0.14]]; let y = 0; bands.forEach(([col, h]) => { x.fillStyle = '#' + new T.Color(col).getHexString(); x.fillRect(0, y * Hh, W, h * Hh + 1); y += h; }); const r = H.rng(5); for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,220,170'},${0.04 + r() * 0.1})`; x.fillRect(r() * W, r() * Hh, 1 + r() * 2, 1 + r() * 2); } const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
  const orangeTex = () => { const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); x.translate(64, 64); x.fillStyle = '#e8861c'; x.beginPath(); x.arc(0, 0, 62, 0, 7); x.fill(); x.fillStyle = '#fbe6b0'; x.beginPath(); x.arc(0, 0, 55, 0, 7); x.fill(); x.fillStyle = '#f7a732'; x.beginPath(); x.arc(0, 0, 50, 0, 7); x.fill(); for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283; x.strokeStyle = '#fbe6b0'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * 52, Math.sin(a) * 52); x.stroke(); x.fillStyle = 'rgba(255,200,90,0.5)'; x.beginPath(); x.arc(Math.cos(a + 0.31) * 28, Math.sin(a + 0.31) * 28, 9, 0, 7); x.fill(); } const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; };
  const medOf = (g, inkCol) => ({ pipe: { color: inkCol, rough: 0.28, cc: 0.9, bump: 4.5, metal: 0 }, gel: { color: inkCol, rough: 0.05, cc: 1, bump: 1.2, metal: 0 }, choc: { color: new T.Color(0x3a2216), rough: 0.25, cc: 1, bump: 6, metal: 0 }, gold: { color: new T.Color(0xd9a62e), rough: 0.22, cc: 0.4, bump: 3, metal: 0.95 } }[g.medium] || { color: inkCol, rough: 0.28, cc: 0.9, bump: 4.5, metal: 0 });
  const smokeTexMk = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(200,200,205,0.55)'); gr.addColorStop(1, 'rgba(160,160,165,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); };
  function roundedRect(w, r) { const s = new T.Shape(), h = w / 2; s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r); s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h); s.lineTo(-h + r, h); s.quadraticCurveTo(-h, h, -h, h - r); s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h); return s; }
  function heartShape(sc) { const s = new T.Shape(); s.moveTo(0, -2.4 * sc); s.bezierCurveTo(-0.3 * sc, -1.7 * sc, -2.5 * sc, -0.6 * sc, -2.5 * sc, 0.9 * sc); s.bezierCurveTo(-2.5 * sc, 2.0 * sc, -1.0 * sc, 2.5 * sc, 0, 1.5 * sc); s.bezierCurveTo(1.0 * sc, 2.5 * sc, 2.5 * sc, 2.0 * sc, 2.5 * sc, 0.9 * sc); s.bezierCurveTo(2.5 * sc, -0.6 * sc, 0.3 * sc, -1.7 * sc, 0, -2.4 * sc); return s; }

  function build(g, ctx) {
    const root = ctx.root, scene = ctx.scene; H.updaters = []; H.parts = [];
    const rr = H.rng(g.seed ^ 0x51ed);
    const iceCol = icingColor(g), spCol = new T.Color(SPONGES[g.sponge][1]), inkCol = new T.Color(INKS[g.ink][1]), glaze = glazeColor(g);
    const icing = new T.MeshPhysicalMaterial({ color: iceCol, roughness: 0.52, clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: 0.6, bumpMap: H.noiseTex(512, (u, v) => { const c = Math.round(120 + 90 * H.fbm(u * 18, v * 18, 4)); return [c, c, c]; }, false, 3), bumpScale: 0.35 });
    const glazeMat = new T.MeshPhysicalMaterial({ color: glaze, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 });
    const spongeMat = new T.MeshStandardMaterial({ color: spCol, roughness: 0.85, envMapIntensity: 0.3, bumpMap: H.noiseTex(256, (u, v) => { const c = Math.round(80 + 140 * H.vnoise(u * 60, v * 60)); return [c, c, c]; }, false, 2), bumpScale: 1.2 });
    const inkMat = new T.MeshPhysicalMaterial({ color: inkCol, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.12, envMapIntensity: 0.8 });
    const scn = g.scene, lightsExtra = [];
    const add = o => { root.add(o); return o; };

    // ============================ SCENE ============================
    const bgPlane = (tex, sc, y, z, w, h) => { const m = new T.MeshBasicMaterial({ map: tex, toneMapped: false }); m.color.setScalar(sc); const p = new T.Mesh(new T.PlaneGeometry(w || 80, h || 44), m); p.position.set(0, y, z); return add(p); };
    let floorCol = 0x030202, floorRough = 0.95, floorMetal = 0;
    if (scn === 'void') { /* pure black: the cake and its candles only */ floorCol = 0x000000; ctx.scene.background = new T.Color(0x000000); }
    else if (scn === 'dark') { const arc = new T.Mesh(new T.TorusGeometry(30, 0.07, 8, 160, Math.PI * 1.1), new T.MeshBasicMaterial({ color: new T.Color(0.7, 0.72, 0.7), toneMapped: false })); arc.rotation.x = Math.PI / 2; arc.rotation.z = Math.PI * 0.95; arc.position.y = 1.5; add(arc); }
    else if (scn === 'bokeh') { bgPlane(H.noiseTex(128, (u, v) => [60 + 40 * v, 30 + 20 * v, 25 + 10 * v], true), 0.5, 7, -16); const lr = H.rng(g.seed ^ 5); const cols = [new T.Color(3.4, 2.2, 1.0), new T.Color(3.4, 1.6, 1.4), new T.Color(3.0, 2.6, 1.6)]; const ms = cols.map(c => new T.MeshBasicMaterial({ color: c, toneMapped: false })); for (let i = 0; i < 70; i++) { const d = new T.Mesh(new T.CircleGeometry(0.05 + lr() * 0.1, 14), ms[i % 3]); d.position.set((lr() - 0.5) * 34, 1 + lr() * 11, -13 - lr() * 3); add(d); } floorCol = 0x120a06; floorRough = 0.6; }
    else if (scn === 'window') { bgPlane(H.noiseTex(128, (u, v) => [230 - 40 * v, 238 - 30 * v, 250 - 20 * v], true), 1.5, 7, -16); [-8, 0, 8].forEach(x => { const bar = new T.Mesh(new T.PlaneGeometry(0.25, 30), new T.MeshBasicMaterial({ color: 0x2a2520 })); bar.position.set(x, 7, -15.9); add(bar); }); const bar2 = new T.Mesh(new T.PlaneGeometry(60, 0.25), new T.MeshBasicMaterial({ color: 0x2a2520 })); bar2.position.set(0, 7, -15.9); add(bar2); floorCol = 0x8b6f4e; floorRough = 0.5; }
    else { bgPlane(H.noiseTex(64, () => [6, 4, 10], true), 1, 6, -16); const m1 = new T.MeshBasicMaterial({ color: new T.Color(3.6, 0.3, 2.2), toneMapped: false }), m2 = new T.MeshBasicMaterial({ color: new T.Color(0.2, 2.6, 3.4), toneMapped: false }); const t1 = new T.Mesh(new T.TorusGeometry(10, 0.12, 8, 80, Math.PI * 0.8), m1); t1.position.set(-6, 4, -12); t1.rotation.z = 0.3; add(t1); const t2 = new T.Mesh(new T.TorusGeometry(8, 0.12, 8, 80, Math.PI * 0.9), m2); t2.position.set(8, 2, -13); t2.rotation.z = Math.PI + 0.2; add(t2); const l1 = new T.PointLight(0xff2fb0, 1.6, 22); l1.position.set(-7, 4, -3); l1.userData.heroLight = true; ctx.scene.add(l1); const l2 = new T.PointLight(0x2fd8ff, 1.6, 22); l2.position.set(8, 3, -3); l2.userData.heroLight = true; ctx.scene.add(l2); lightsExtra.push(l1, l2); floorCol = 0x08060c; floorRough = 0.35; floorMetal = 0.2; }
    const floor = new T.Mesh(new T.CircleGeometry(40, 64), new T.MeshStandardMaterial({ color: floorCol, roughness: floorRough, metalness: floorMetal, envMapIntensity: 0.4 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.62; floor.receiveShadow = true; floor.visible = scn !== 'void'; add(floor);

    // ============================ TABLE ============================
    let tableR = 5.6;
    if (g.table === 'none') { /* floating on black */ }
    else if (g.table === 'hex') { const t = new T.Mesh(new T.CylinderGeometry(5.6, 5.6, 0.22, 6), new T.MeshStandardMaterial({ color: 0xcdb27a, roughness: 0.72, metalness: 0.05, envMapIntensity: 0.35 })); t.position.y = -0.11; t.rotation.y = Math.PI / 6; t.castShadow = t.receiveShadow = true; add(t); }
    else if (g.table === 'cloth') { const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new T.Vector2(0.01 + 5.6 * (t < 0.1 ? t * 10 : 1) * (t < 0.1 ? 1 : 1 + 0.0), t < 0.1 ? 0 : -(t - 0.1) * 5.5)); } const lg = new T.LatheGeometry(pts.map((p, i) => new T.Vector2(i < 4 ? p.x * (i / 3) : 5.6, i < 4 ? 0 : p.y)), 128); const lp = lg.attributes.position; for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i), z = lp.getZ(i); const a = Math.atan2(z, x), k = y < -0.05 ? 1 + 0.045 * Math.sin(a * 18) * Math.min(1, -y / 1.2) : 1; lp.setXYZ(i, x * k, y, z * k); } lg.computeVertexNormals(); const cc = new T.Color().setHSL(g.glaze, 0.12 + 0.3 * (g.seed % 3 === 0), 0.8); const cl = new T.Mesh(lg, new T.MeshStandardMaterial({ color: cc, roughness: 0.9, side: T.DoubleSide })); cl.position.y = -0.02; cl.castShadow = cl.receiveShadow = true; add(cl); }
    else if (g.table === 'wood') { const t = new T.Mesh(new T.BoxGeometry(11.5, 0.3, 7.5), new T.MeshStandardMaterial({ color: 0xffffff, map: woodTex(), roughness: 0.55, envMapIntensity: 0.5 })); t.position.y = -0.15; t.castShadow = t.receiveShadow = true; add(t); tableR = 5; }
    else { const t = new T.Mesh(new T.CylinderGeometry(5.4, 5.4, 0.2, 96), new T.MeshPhysicalMaterial({ color: 0xece9e2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, map: H.noiseTex(256, (u, v) => { const n = H.fbm(u * 5 + v * 3, v * 5, 4); const c = 210 + 40 * Math.pow(Math.abs(Math.sin((u * 8 + n * 5) * Math.PI)), 12); return [c, c, c * 0.98]; }, true), envMapIntensity: 0.9 })); t.position.y = -0.1; t.castShadow = t.receiveShadow = true; add(t); }

    // ============================ CAKE ============================
    const cakeG = new T.Group(); root.add(cakeG); const addC = o => { cakeG.add(o); return o; };
    const slots = []; let topY = 0, rTop = 2, cakeH = 1.2, partsExtra = [], box = null;
    const rosGeo = new T.IcosahedronGeometry(0.075, 2); const rosMat = new T.MeshPhysicalMaterial({ color: iceCol.clone().multiplyScalar(1.02), roughness: 0.45, clearcoat: 0.15, envMapIntensity: 0.6 });
    const mm = new T.Matrix4(), qq = new T.Quaternion(), pp = new T.Vector3(), ss = new T.Vector3();
    function rosettes(points, y, scale) { const n = points.length; const im = new T.InstancedMesh(rosGeo, rosMat, n); im.castShadow = true; for (let k = 0; k < n; k++) { const s = (0.85 + 0.35 * (rr() - 0.5) + 0.25 * g.bundt) * (scale || 1); pp.set(points[k].x, y, points[k].z); ss.set(s * 1.1, s * 0.85, s * 1.1); qq.identity(); mm.compose(pp, qq, ss); im.setMatrixAt(k, mm); } addC(im); }
    function ringPoints(r, spacing) { const n = Math.max(8, Math.floor(2 * Math.PI * r / spacing)); const out = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; out.push({ x: Math.cos(a) * (r - 0.02), z: Math.sin(a) * (r - 0.02) }); } return out; }
    const sp0 = 0.17 - 0.03 * g.bundt;

    if (g.shape === 'round' || g.shape === 'bundt' || g.shape === 'naked') {
      const naked = g.shape === 'naked'; const bundt = g.shape === 'bundt' ? Math.max(0.55, g.bundt) : (naked ? 0 : g.bundt); const T_N = g.tiers;
      const radii = T_N === 1 ? [2.2] : T_N === 2 ? [2.3, 1.55] : [2.4, 1.75, 1.15]; const TH = naked ? 1.0 : 1.12; let y = 0.09;
      const board = new T.Mesh(new T.CylinderGeometry(radii[0] + 0.55, radii[0] + 0.55, 0.09, 96), new T.MeshPhysicalMaterial({ color: 0xe9e6de, roughness: 0.25, metalness: 0.6, clearcoat: 1, envMapIntensity: 0.9 })); board.position.y = 0.045; board.castShadow = board.receiveShadow = true; addC(board);
      const dripRand = H.rng(g.seed ^ 31);
      for (let i = 0; i < T_N; i++) {
        const r = radii[i], h = TH * (i === 0 && bundt > 0.4 ? 1.12 : 1);
        const geo = new T.CylinderGeometry(r, r * (1 - bundt * 0.1 * (i === 0 ? 1 : 0)), h, 176, 28, false); const p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) { const x = p.getX(k), yy = p.getY(k), z = p.getZ(k); const th = Math.atan2(z, x), rad = Math.hypot(x, z); const t = (yy + h / 2) / h; let f = 1; if (i === 0 && bundt > 0) f += bundt * 0.075 * (0.5 + 0.5 * Math.cos(th * 11)) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.05))); f *= 1 - 0.02 * Math.pow(Math.abs(t * 2 - 1), 8); const k2 = rad > 0.01 ? f : 1; p.setXYZ(k, x * k2, yy + (i === 0 && bundt > 0 && Math.hypot(x, z) < r * 0.55 ? 0.06 * bundt * (1 - Math.hypot(x, z) / (r * 0.55)) : 0), z * k2); }
        geo.computeVertexNormals();
        const m = new T.Mesh(geo, (bundt > 0.5 && i === 0) || naked ? spongeMat : icing); m.position.y = y + h / 2; m.castShadow = m.receiveShadow = true; addC(m);
        if (naked) for (let k = 1; k < 3; k++) { const cr = new T.Mesh(new T.CylinderGeometry(r * 1.01, r * 1.01, 0.1, 96), icing); cr.position.y = y + (k / 3) * h; addC(cr); }
        const cap = new T.Mesh(new T.CylinderGeometry(r * 0.985, r * 0.985, 0.05, 128), bundt > 0.5 && i === 0 ? glazeMat : icing); cap.position.y = y + h + 0.015; cap.receiveShadow = true; addC(cap);
        if (!naked && (g.drips > 0.02 || (bundt > 0.5 && i === 0))) { const dg = new T.CylinderGeometry(r * 1.012, r * 1.012, 0.7, 192, 14, true); const dp = dg.attributes.position; const lens = []; for (let k = 0; k < 28; k++) lens.push(0.1 + dripRand() * (0.25 + 0.5 * Math.max(g.drips, bundt > 0.5 ? 0.6 : 0)));
          for (let k = 0; k < dp.count; k++) { const x = dp.getX(k), yy = dp.getY(k), z = dp.getZ(k); const th = (Math.atan2(z, x) + Math.PI) / (Math.PI * 2) * 28; const a = Math.floor(th) % 28, b = (a + 1) % 28, f = th - Math.floor(th); const s = f * f * (3 - 2 * f); const L = lens[a] * (1 - s) + lens[b] * s; const dripL = L * (0.5 + 0.5 * Math.pow(Math.abs(Math.sin(th * Math.PI)), 0.6)); if (yy < 0) dp.setY(k, 0.35 - dripL); else dp.setY(k, 0.35); const bulge = yy < 0 ? 1.012 + 0.012 * Math.pow(Math.sin(th * Math.PI), 2) : 1.0; dp.setX(k, x * bulge); dp.setZ(k, z * bulge); }
          dg.computeVertexNormals(); const sk = new T.Mesh(dg, glazeMat); sk.position.y = y + h - 0.35 + 0.03; sk.castShadow = true; addC(sk); }
        if (!naked) { rosettes(ringPoints(r, sp0), y + h + 0.05); if (i === 0) rosettes(ringPoints(r, sp0), y + 0.05); }
        y += h + 0.04;
      }
      topY = y; rTop = radii[T_N - 1]; cakeH = topY;
      const N = clamp(g.age, 1, 30); const ringA = N > 12 ? Math.ceil(N * 0.62) : N, ringB = N - ringA;
      for (let i = 0; i < ringA; i++) { const a = i / ringA * Math.PI * 2 + 0.3; const rad = N === 1 ? 0 : rTop * (N > 12 ? 0.78 : 0.62) * (naked ? 0.8 : 1); slots.push({ x: Math.cos(a) * rad, y: topY + 0.05, z: Math.sin(a) * rad }); }
      for (let i = 0; i < ringB; i++) { const a = i / ringB * Math.PI * 2; slots.push({ x: Math.cos(a) * rTop * 0.35, y: topY + 0.05, z: Math.sin(a) * rTop * 0.35 }); }
      partsExtra.push({ id: 'TIERS', name: (naked ? 'NAKED LAYERS' : T_N + (T_N === 1 ? ' TIER' : ' TIERS')) + (bundt > 0.4 ? ' · BUNDT' : ''), focus: { pos: [0, topY * 0.5, 0], dist: 6 + radii[0] * 0.9, yaw: 0.5, pitch: 0.16 }, ring: 0 });
      partsExtra.push({ id: 'BUNDT.PIPE', name: 'PIPED BORDER & FLUTES', focus: { pos: [radii[0] * 0.2, 0.55, radii[0] * 0.95], dist: 1.9, yaw: 0.1, pitch: 0.2 }, ring: 2 });
      if (!naked) partsExtra.push({ id: 'GLAZE', name: 'GLAZE & DRIPS', focus: { pos: [radii[0] * 0.7, topY - 0.45, radii[0] * 0.7], dist: 2.2, yaw: 0.85, pitch: 0.1 }, ring: 4 });
    } else if (g.shape === 'drum' || g.shape === 'poly' || g.shape === 'opera') {
      const op = g.shape === 'opera', poly = g.shape === 'poly', fin = g.finish || (op ? 'opera' : 'frosted');
      const R = op ? 2.7 : 2.3, RZ = op ? 2.05 : R, Hh = op ? 1.5 : poly ? 1.7 : 2.2, sides = poly ? Math.max(5, g.sides || 12) : 96; const y0 = 0.09;
      const gan = new T.MeshPhysicalMaterial({ color: fin === 'naked' ? new T.Color(0x7a3c12) : new T.Color(0x140503), roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.0 });
      const ridges = H.noiseTex(256, (u, v) => { const c = 128 + 45 * Math.sin(v * 26 + 5 * H.fbm(u * 5, v * 3, 3)) + 40 * H.fbm(u * 14, v * 14, 3); return [c, c, c]; }, false, 3);
      const ridgedIce = icing.clone(); ridgedIce.bumpMap = ridges; ridgedIce.bumpScale = 0.9;
      const crumb = new T.MeshStandardMaterial({ color: 0xffffff, map: crumbTex(spCol, true), bumpMap: crumbTex(spCol, true), bumpScale: 1.6, roughness: 0.95, envMapIntensity: 0.2 });
      const operaM = new T.MeshPhysicalMaterial({ color: 0xffffff, map: operaTex(), roughness: 0.7, envMapIntensity: 0.3 });
      const mkBody = (h, mat, rad) => { let geo; if (op) geo = new T.BoxGeometry(rad * 2, h, RZ * 2); else { geo = new T.CylinderGeometry(rad, rad, h, sides, 1); if (poly) { geo = geo.toNonIndexed(); geo.computeVertexNormals(); } } const m = new T.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m; };
      let y = y0;
      if (fin === 'naked') {
        const lh = (Hh - 0.36) / 3, fill = new T.MeshPhysicalMaterial({ color: 0x8a4a1c, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.2 });
        for (let k = 0; k < 3; k++) { const m = mkBody(lh, crumb, R); m.position.y = y + lh / 2; addC(m); y += lh; if (k < 2) { const f = mkBody(0.18, fill, R + 0.06); f.position.y = y + 0.09; addC(f); y += 0.18; } }
        const cap = mkBody(0.14, gan, R + 0.04); cap.position.y = y + 0.07; addC(cap); y += 0.14;
        const dg = new T.CylinderGeometry(R + 0.05, R + 0.05, 0.7, 192, 14, true); const dp = dg.attributes.position; const lens = []; const dr0 = H.rng(g.seed ^ 77); for (let k = 0; k < 24; k++) lens.push(0.12 + dr0() * (0.35 + 0.8 * (g.drips || 0.5)));
        for (let k = 0; k < dp.count; k++) { const x = dp.getX(k), yy = dp.getY(k), z = dp.getZ(k); const th = (Math.atan2(z, x) + Math.PI) / (Math.PI * 2) * 24; const a = Math.floor(th) % 24, b = (a + 1) % 24, f = th - Math.floor(th); const sm = f * f * (3 - 2 * f); const L = lens[a] * (1 - sm) + lens[b] * sm; const dl = L * (0.5 + 0.5 * Math.pow(Math.abs(Math.sin(th * Math.PI)), 0.6)); dp.setY(k, yy < 0 ? 0.35 - dl : 0.35); } dg.computeVertexNormals(); const sk = new T.Mesh(dg, gan); sk.position.y = y - 0.35; sk.castShadow = true; addC(sk);
      } else {
        const sideMat = fin === 'sponge' ? crumb : fin === 'ganache' ? gan : fin === 'opera' ? operaM : ridgedIce;
        const body = mkBody(Hh, sideMat, R); body.position.y = y + Hh / 2; addC(body); y += Hh;
        const capH = fin === 'sponge' ? 0.36 : fin === 'frosted' ? 0.16 : 0.1; const cap = mkBody(capH, fin === 'sponge' || fin === 'frosted' ? icing : gan, (fin === 'sponge' ? R * 1.035 : R * 1.004)); cap.position.y = y + capH / 2; addC(cap); y += capH;
        if (fin === 'sponge') { const lip = new T.Mesh(new T.TorusGeometry(R * 1.02, 0.1, 10, 96), icing); lip.rotation.x = Math.PI / 2; lip.position.y = y - capH * 0.5; addC(lip); }
      }
      topY = y; rTop = op ? RZ : R; cakeH = topY; if (op) box = { hx: R * 0.96, hz: RZ * 0.96 };
      const rimR = op ? 0 : R * Math.cos(Math.PI / sides) - 0.12;
      // border
      const bd = op ? 'none' : (g.border || 'none'); const nb = Math.max(8, Math.floor(2 * Math.PI * rimR / (bd === 'shells' ? 0.44 : bd === 'crystals' ? 0.3 : 0.17)));
      if (bd === 'shells') { const sg = new T.TorusKnotGeometry(0.17, 0.075, 56, 8, 2, 3); const bm = new T.MeshPhysicalMaterial({ color: iceCol.clone().multiplyScalar(fin === 'sponge' ? 1.0 : 1.0), roughness: 0.5, clearcoat: 0.1, envMapIntensity: 0.5 }); const im = new T.InstancedMesh(sg, bm, nb); im.castShadow = true; for (let k = 0; k < nb; k++) { const a = k / nb * Math.PI * 2; pp.set(Math.cos(a) * rimR, topY + 0.12, Math.sin(a) * rimR); qq.setFromEuler(new T.Euler(Math.PI / 2 - 0.35, -a + (rr() - 0.5) * 0.3, rr() * 6)); const sc0 = 0.95 + rr() * 0.3; ss.set(sc0, sc0, sc0 * 0.8); mm.compose(pp, qq, ss); im.setMatrixAt(k, mm); } addC(im); }
      else if (bd === 'beads') rosettes(ringPoints(rimR, 0.17), topY + 0.06, 1.1);
      else if (bd === 'crystals') { const cg = new T.IcosahedronGeometry(0.17, 0), cm = new T.MeshPhysicalMaterial({ color: 0xe0a24a, roughness: 0.22, clearcoat: 0.7, envMapIntensity: 1.2 }); const n2 = nb * 2, im = new T.InstancedMesh(cg, cm, n2); im.castShadow = true; for (let k = 0; k < n2; k++) { const a = k / n2 * Math.PI * 2 + (rr() - 0.5) * 0.1, rad = rimR * (0.9 + rr() * 0.13) - (k % 2) * 0.1; pp.set(Math.cos(a) * rad, topY + 0.1 + rr() * 0.1, Math.sin(a) * rad); qq.setFromEuler(new T.Euler(rr() * 6, rr() * 6, rr() * 6)); ss.set(0.8 + rr() * 0.9, 0.7 + rr() * 0.7, 0.8 + rr() * 0.9); mm.compose(pp, qq, ss); im.setMatrixAt(k, mm); } addC(im); }
      // dust (cinnamon / cocoa) on the top
      if (g.dust && !op) { const nd = 650, dm = new T.MeshStandardMaterial({ color: 0xb4521c, roughness: 0.9 }); const im = new T.InstancedMesh(new T.SphereGeometry(0.022, 5, 4), dm, nd); for (let k = 0; k < nd; k++) { const a = rr() * 6.283, rad = rimR * Math.sqrt(0.35 + 0.65 * rr()) * (0.6 + 0.4 * rr()); pp.set(Math.cos(a) * rad, topY + 0.045, Math.sin(a) * rad); qq.identity(); const sc2 = 0.5 + rr() * 1.4; ss.set(sc2, sc2 * 0.6, sc2); mm.compose(pp, qq, ss); im.setMatrixAt(k, mm); } addC(im); }
      // side decoration
      if (g.sidedec === 'orange' && !op) { const ot = orangeTex(), om = new T.MeshPhysicalMaterial({ map: ot, roughness: 0.35, clearcoat: 0.7, side: T.DoubleSide, envMapIntensity: 0.8 }); const ns = 7; for (let k = 0; k < ns; k++) { const a = -1.4 + k / (ns - 1) * 2.8; const sl = new T.Mesh(new T.CircleGeometry(0.5, 40, Math.PI, Math.PI), om); sl.position.set(Math.sin(a) * (R + 0.03), y0 + Hh * 0.34 + (k % 2) * 0.02, Math.cos(a) * (R + 0.03)); sl.rotation.y = a; sl.castShadow = true; addC(sl); } }
      if (g.sidedec === 'gold') { const nf = 34, fm = new T.MeshStandardMaterial({ color: 0xd9a62e, metalness: 1, roughness: 0.28, envMapIntensity: 1.6, side: T.DoubleSide }); const im = new T.InstancedMesh(new T.CircleGeometry(0.11, 5), fm, nf); const rzs = op ? RZ : R; for (let k = 0; k < nf; k++) { const a = -1.5 + rr() * 3.0, hy = y0 + Hh * (0.1 + 0.8 * rr()); const rad = (poly ? R * Math.cos(Math.PI / sides) : R) + 0.012; pp.set(Math.sin(a) * rad, hy, Math.cos(a) * rad); qq.setFromEuler(new T.Euler(0, a, rr() * 6)); const sc3 = 0.6 + rr() * 1.4; ss.set(sc3, sc3 * (0.5 + rr()), 1); mm.compose(pp, qq, ss); im.setMatrixAt(k, mm); } addC(im); }
      partsExtra.push({ id: 'BODY', name: (g.finish || 'frosted').toUpperCase() + ' · ' + g.shape.toUpperCase(), focus: { pos: [0, topY * 0.5, 0], dist: 7 + R * 1.2, yaw: 0.35, pitch: 0.2 }, ring: 0 });
      if (bd !== 'none') partsExtra.push({ id: 'BORDER', name: bd.toUpperCase() + ' BORDER', focus: { pos: [R * 0.5, topY, R * 0.8], dist: 2.8, yaw: 0.3, pitch: 0.55 }, ring: 2 });
    } else if (g.shape === 'square' || g.shape === 'heart') {
      const T_N = Math.min(g.tiers, g.shape === 'heart' ? 2 : 3); let y = 0.09; const heart = g.shape === 'heart';
      for (let i = 0; i < T_N; i++) {
        const sc = 1 - i * 0.28; const shape = heart ? heartShape(0.95 * sc) : roundedRect(4.2 * sc, 0.35); const h = 0.95;
        const geo = new T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 28 }); geo.rotateX(-Math.PI / 2);
        const m = new T.Mesh(geo, icing); m.position.y = y; m.castShadow = m.receiveShadow = true; addC(m);
        const pts = shape.getSpacedPoints(Math.floor((heart ? 24 : 18) * sc * (6 - 3 * g.bundt) / 3)).map(v => ({ x: v.x, z: -v.y })); rosettes(pts, y + h + 0.08, 1.0); if (i === 0) rosettes(pts, y + 0.08, 1.0);
        if (g.drips > 0.05) { const rim = shape.getSpacedPoints(90); const dgM = new T.MeshPhysicalMaterial({ color: glaze, roughness: 0.16, clearcoat: 1, envMapIntensity: 0.9 }); const dr = H.rng(g.seed ^ (31 + i)); rim.forEach((v, k) => { if (k % 3) return; const L = 0.12 + dr() * 0.5 * g.drips; const d = new T.Mesh(new T.CylinderGeometry(0.09, 0.07, L, 10), dgM); d.position.set(v.x * 1.012, y + h - L / 2 + 0.05, -v.y * 1.012); addC(d); const bd = new T.Mesh(new T.SphereGeometry(0.09, 10, 8), dgM); bd.position.set(v.x * 1.012, y + h - L + 0.05, -v.y * 1.012); addC(bd); }); }
        topY = y + h + 0.1; rTop = heart ? 2.0 * sc : 2.0 * sc; if (i === T_N - 1) { const N = clamp(g.age, 1, 30); const per = Math.ceil(N / 2); for (let k = 0; k < N; k++) { const row = k < per ? 0 : 1; const cnt = row ? N - per : per; const idx = row ? k - per : k; const u = cnt === 1 ? 0.5 : idx / (cnt - 1); const wx = (u - 0.5) * (heart ? 3.0 : 3.1) * sc; slots.push({ x: wx, y: topY, z: (heart ? (row ? 0.55 : -0.1) : (row ? 0.7 : -0.7)) * sc * (heart ? 1 : 1) }); } }
        y += h + 0.1;
      }
      cakeH = topY; partsExtra.push({ id: 'TIERS', name: (heart ? 'HEART' : 'SQUARE') + ' · ' + T_N + (T_N > 1 ? ' TIERS' : ' TIER'), focus: { pos: [0, topY * 0.5, 0], dist: 9, yaw: 0.5, pitch: 0.2 }, ring: 0 });
    } else { // cupcakes
      const rows = g.tiers; const rim = [], lay = []; const pitch = 1.15;
      const counts = rows === 1 ? [7] : rows === 2 ? [10, 4] : [12, 6, 1]; const standY = [0.1, 1.5, 2.8];
      const linerMat = new T.MeshPhysicalMaterial({ color: new T.Color().setHSL(g.glaze, 0.55, 0.55), roughness: 0.5, side: T.DoubleSide, envMapIntensity: 0.5 });
      for (let layer = 0; layer < counts.length; layer++) {
        const n = counts[layer], R = layer === 0 ? (n > 7 ? 2.4 : 1.15) * (n === 1 ? 0 : 1) : (n === 1 ? 0 : 1.1); const base = standY[layer];
        const plate = new T.Mesh(new T.CylinderGeometry(layer === 0 ? 3.4 : 2.2 - layer * 0.3, layer === 0 ? 3.4 : 2.2 - layer * 0.3, 0.08, 64), new T.MeshPhysicalMaterial({ color: 0xe9e6de, roughness: 0.2, metalness: 0.6, clearcoat: 1 })); plate.position.y = base - 0.04; plate.castShadow = plate.receiveShadow = true; addC(plate);
        if (layer < counts.length - 1) { const stem = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 1.45, 12), plate.material); stem.position.y = base + 0.7; addC(stem); }
        const cnt = n === 7 && layer === 0 ? 6 : n; for (let k = 0; k < n; k++) {
          const center = (n === 7 && layer === 0 && k === 6); const a = (k / Math.max(1, cnt)) * Math.PI * 2; const cx = center ? 0 : Math.cos(a) * R, cz = center ? 0 : Math.sin(a) * R;
          const grp = new T.Group(); grp.position.set(cx, base, cz);
          const lg = new T.CylinderGeometry(0.5, 0.36, 0.6, 28, 1, true); { const p = lg.attributes.position; for (let v = 0; v < p.count; v++) { const x = p.getX(v), z = p.getZ(v), a2 = Math.atan2(z, x); const f = 1 + 0.06 * Math.sin(a2 * 14); p.setX(v, x * f); p.setZ(v, z * f); } lg.computeVertexNormals(); }
          const liner = new T.Mesh(lg, linerMat); liner.position.y = 0.3; liner.castShadow = true; grp.add(liner);
          const dome = new T.Mesh(new T.SphereGeometry(0.46, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), spongeMat); dome.position.y = 0.58; dome.scale.y = 0.6; dome.castShadow = true; grp.add(dome);
          const turns = 3.2, pts = []; for (let s = 0; s <= 64; s++) { const t = s / 64; const rad = 0.46 * (1 - t) * (1 - 0.15 * Math.sin(t * 20)); pts.push(V3(Math.cos(t * turns * 6.283) * rad, 0.62 + t * (0.5 + 0.5 * g.bundt), Math.sin(t * turns * 6.283) * rad)); }
          const sw = new T.Mesh(H.sweep(new T.CatmullRomCurve3(pts), t => 0.12 * (1 - t * 0.85) + 0.012, 80, 10), icing); sw.castShadow = true; grp.add(sw);
          if (g.topping === 'berries' || g.topping === 'none') { const b = new T.Mesh(new T.SphereGeometry(0.1, 16, 12), new T.MeshPhysicalMaterial({ color: g.topping === 'berries' ? 0x8a0f24 : 0xc01832, roughness: 0.2, clearcoat: 1 })); b.position.y = 1.14 + 0.5 * g.bundt; grp.add(b); }
          addC(grp); lay.push({ x: cx, y: base + 1.15 + 0.5 * g.bundt, z: cz, layer });
        }
      }
      const N = clamp(g.age, 1, 14); lay.sort((a, b) => b.y - a.y || (a.x * a.x + a.z * a.z) - (b.x * b.x + b.z * b.z)); for (let i = 0; i < Math.min(N, lay.length); i++) slots.push({ x: lay[i].x, y: lay[i].y - 0.05, z: lay[i].z });
      topY = standY[counts.length - 1] + 1.3; rTop = 1.4; cakeH = topY;
      partsExtra.push({ id: 'TOWER', name: counts.reduce((a, b) => a + b, 0) + ' CUPCAKES', focus: { pos: [0, topY * 0.45, 0], dist: 8.5, yaw: 0.4, pitch: 0.18 }, ring: 0 });
      partsExtra.push({ id: 'SWIRL', name: 'BUTTERCREAM SWIRLS', focus: { pos: [0, standY[0] + 1.0, 1.0], dist: 2.4, yaw: 0.25, pitch: 0.2 }, ring: 2 });
    }

    const Ex = box ? box.hx / 0.96 : g.shape === 'square' ? 2.1 : rTop, Ez = box ? box.hz / 0.96 : g.shape === 'square' ? 2.1 : g.shape === 'heart' ? 2.0 : rTop;
    const numDigits = g.candle === 'number' ? String(clamp(Math.round(g.age), 1, 99)).split('') : null;
    const arrOn = !g.cslots && g.shape !== 'cupcakes' && ((g.arr && g.arr !== 'auto') || numDigits);
    const textZ = (g.arr && g.arr !== 'auto' && g.arr !== 'ring') || numDigits ? 0.42 * Ez : 0;
    // ---- inscription: script x medium x layout, revealed by the pipe ring ---------------------------------------
    let inscr = null, textRect = null; const reveal = { value: g.pipe }; H.cursorWorld = null; let cursor = null;
    const pipedOK = g.font === 'piped' && g.layout === 'top' && glyphsOk(g.text);
    if (g.shape !== 'cupcakes' && g.text && pipedOK) {
      const sm = medOf(g, inkCol); const lines = String(g.text).toUpperCase().split('\n').slice(0, 2);
      const adv = ch => ch === ' ' ? 3 : (ch === 'I' || ch === '!' || ch === '.' || ch === "'" || ch === '-') ? 4.6 : 5.6;
      const lineU = lines.map(l => [...l].reduce((a, ch) => a + adv(ch), 0) - 1.6);
      const sc = Math.min(Math.min(Ex * 1.5, 3.9) / Math.max(...lineU, 1), 0.2, (Ez * 0.42) / (6 * lines.length + (lines.length - 1) * 3)); const trad = Math.max(0.07, 0.8 * sc);
      const pmat = new T.MeshPhysicalMaterial({ color: sm.color, roughness: Math.max(0.2, sm.rough), metalness: sm.metal, clearcoat: sm.cc, clearcoatRoughness: 0.1, envMapIntensity: 1.0 });
      const pst = []; let ptotal = 0; const baseY = topY + trad * 0.7;
      lines.forEach((l, li) => { let x = -lineU[li] * sc / 2; const zc = textZ + (li - (lines.length - 1) / 2) * 9 * sc;
        [...l].forEach(ch => { const gl = GLYPH[ch]; if (gl) gl.forEach(poly => { const pts = chaikin(poly.map(([px, py]) => [x + px * sc, zc - (py - 3) * sc]), 2); const v3 = pts.map(q => new T.Vector3(q[0], baseY, q[1])); let len = 0; for (let k = 1; k < v3.length; k++) len += v3[k].distanceTo(v3[k - 1]);
            const mk = (pos) => { const c = new T.Mesh(new T.SphereGeometry(trad * 1.04, 14, 10), pmat); c.position.copy(pos); c.castShadow = true; c.visible = false; addC(c); return c; };
            if (len < 0.02) { const c0 = mk(v3[0]); pst.push({ dot: true, cap0: c0, cap1: c0, len: 0.08, start: ptotal }); ptotal += 0.08; return; }
            const curve = new T.CatmullRomCurve3(v3, false, 'centripetal'); const seg = clamp(Math.floor(len / (sc * 0.22)), 8, 150); const geo = H.sweep(curve, () => trad, seg, 8); const m = new T.Mesh(geo, pmat); m.castShadow = true; m.visible = false; addC(m);
            pst.push({ mesh: m, geo, seg, curve, len, start: ptotal, cap0: mk(v3[0]), cap1: mk(v3[v3.length - 1]) }); ptotal += len; }); x += adv(ch) * sc; }); });
      cursor = new T.Mesh(new T.SphereGeometry(0.06, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(3, 2.6, 1.8), toneMapped: false })); addC(cursor);
      const wMax = Math.max(...lineU) * sc; textRect = { hx: wMax / 2 + 0.15, hz: (lines.length * 9 * sc) / 2 + 0.1, cz: textZ };
      H.cursorUpdate = () => { const u = clamp(reveal.value, 0, 1) * ptotal; let head = null; pst.forEach(st => { const f = clamp((u - st.start) / Math.max(st.len, 1e-6), 0, 1); st.cap0.visible = f > 0; if (st.dot) return; st.mesh.visible = f > 0; st.geo.setDrawRange(0, Math.floor(f * st.seg) * 8 * 6); st.cap1.visible = f >= 0.999; if (f > 0 && f < 1) head = st.curve.getPointAt(f); }); cursor.visible = !!head && reveal.value < 0.995; if (head) { cursor.position.copy(head); cursor.position.y += trad + 0.05; cakeG.localToWorld(H.cursorWorld = (H.cursorWorld || new T.Vector3()).copy(cursor.position)); } };
      partsExtra.push({ id: 'INSCRIPTION', name: 'PIPED NAME · ' + g.medium.toUpperCase(), focus: { pos: [0, topY + 0.1, textZ], dist: Ex * 2.2 + 1.5, yaw: 0.0, pitch: 1.0 }, ring: 2 });
    } else if (g.shape !== 'cupcakes' && g.text) {
      const layout = g.layout === 'side' && !(g.shape === 'round' || g.shape === 'bundt' || g.shape === 'naked') ? 'top' : g.layout; const [tt, tb] = textTexture(g.text, g.font, layout);
      const med = medOf(g, inkCol);
      const mat = new T.MeshPhysicalMaterial({ color: med.color, alphaMap: tt, transparent: true, alphaTest: 0.35, bumpMap: tb, bumpScale: med.bump, roughness: med.rough, metalness: med.metal, clearcoat: med.cc, clearcoatRoughness: 0.1, envMapIntensity: 0.9, polygonOffset: true, polygonOffsetFactor: -2, side: T.DoubleSide });
      const uMode = { value: layout === 'arc' ? 1 : 0 };
      mat.onBeforeCompile = sh => { sh.uniforms.uReveal = reveal; sh.uniforms.uMode = uMode; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uReveal; uniform float uMode;').replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\n float rvq = uMode < 0.5 ? vUv.x : fract(atan(vUv.y - 0.5, vUv.x - 0.5) / 6.2832 + 0.75); if (rvq > uReveal) discard;'); };
      if (layout === 'side') { const r0 = (g.shape === 'round' || g.shape === 'bundt' || g.shape === 'naked') ? (g.tiers === 1 ? 2.2 : g.tiers === 2 ? 2.3 : 2.4) : 2.2; const cg = new T.CylinderGeometry(r0 * 1.02, r0 * 1.02, 0.62, 96, 1, true, -0.9, 1.8); inscr = new T.Mesh(cg, mat); inscr.rotation.y = Math.PI / 2; inscr.position.set(0, 0.62, 0); uMode.value = 0; addC(inscr); }
      else if (layout === 'topper') { const sign = new T.Mesh(new T.PlaneGeometry(2.4, 1.2), mat); sign.position.set(0, topY + 1.7, 0); addC(sign); const stick = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 1.3, 8), new T.MeshStandardMaterial({ color: 0xd8c08a, roughness: 0.5 })); stick.position.set(0, topY + 0.65, 0); addC(stick); inscr = sign; }
      else { const wdt = layout === 'arc' ? rTop * 1.9 : (g.shape === 'square' ? 3.4 : g.shape === 'heart' ? 2.6 : rTop * 1.62); inscr = new T.Mesh(new T.PlaneGeometry(wdt, layout === 'arc' ? wdt : wdt * 0.5), mat); inscr.rotation.x = -Math.PI / 2; inscr.position.set(0, topY + 0.07, (g.shape === 'heart' ? 0.2 : 0) + textZ); addC(inscr); textRect = { hx: wdt * 0.43, hz: wdt * 0.23, cz: (g.shape === 'heart' ? 0.2 : 0) + textZ }; }
      if (layout !== 'side') { cursor = new T.Mesh(new T.SphereGeometry(0.06, 12, 8), new T.MeshBasicMaterial({ color: new T.Color(3, 2.6, 1.8), toneMapped: false })); addC(cursor); }
      partsExtra.push({ id: 'INSCRIPTION', name: 'PIPED INSCRIPTION · ' + g.font.toUpperCase() + ' · ' + g.medium.toUpperCase(), focus: { pos: [0, layout === 'topper' ? topY + 1.7 : layout === 'side' ? 0.62 : topY + 0.06, 0], dist: rTop * 2.4 + 1, yaw: layout === 'side' ? 0.0 : 0.0, pitch: layout === 'side' ? 0.15 : layout === 'topper' ? 0.1 : 1.05 }, ring: 2 });
      const wr = layout === 'side' ? (g.tiers === 1 ? 2.2 : 2.3) : rTop;
      H.cursorUpdate = () => { if (!cursor) return; const u = clamp(reveal.value, 0, 1); cursor.visible = u > 0.01 && u < 0.995; if (layout === 'arc') { const a = (u - 0.25) * Math.PI * 2; cursor.position.set(Math.cos(a) * rTop * 0.68, topY + 0.1, Math.sin(a) * rTop * 0.68); } else if (layout === 'topper') cursor.position.set((u - 0.5) * 2.4 * 0.86, topY + 1.7, 0.02); else cursor.position.set((u - 0.5) * (g.shape === 'square' ? 3.4 : g.shape === 'heart' ? 2.6 : rTop * 1.62) * 0.86, topY + 0.1, 0); cakeG.localToWorld(H.cursorWorld = (H.cursorWorld || new T.Vector3()).copy(cursor.position)); };
    } else H.cursorUpdate = null;

    // ---- freehand piping: strokes drawn by the author, stored in the genome ------------------------------------
    const SE = box ? Math.max(Ex, Ez) : g.shape === 'square' ? 2.1 : g.shape === 'heart' ? 2.5 : rTop, SCV = 1024; const strokeCv = document.createElement('canvas'); strokeCv.width = strokeCv.height = SCV; const sctx = strokeCv.getContext('2d');
    const strokeTex = new T.CanvasTexture(strokeCv); strokeTex.anisotropy = 8; g.strokes = g.strokes || [];
    function drawStroke(st) { const p = st.p; sctx.lineWidth = 7 + 26 * st.w; sctx.lineCap = sctx.lineJoin = 'round'; sctx.strokeStyle = sctx.fillStyle = '#fff'; if (p.length <= 2) { sctx.beginPath(); sctx.arc((p[0] * 0.5 + 0.5) * SCV, (p[1] * 0.5 + 0.5) * SCV, sctx.lineWidth / 2, 0, 7); sctx.fill(); return; } sctx.beginPath(); for (let k = 0; k < p.length; k += 2) { const x = (p[k] * 0.5 + 0.5) * SCV, y = (p[k + 1] * 0.5 + 0.5) * SCV; k ? sctx.lineTo(x, y) : sctx.moveTo(x, y); } sctx.stroke(); }
    function redrawStrokes() { sctx.fillStyle = '#000'; sctx.fillRect(0, 0, SCV, SCV); g.strokes.forEach(drawStroke); strokeTex.needsUpdate = true; }
    redrawStrokes();
    if (g.shape !== 'cupcakes') { const sm = medOf(g, inkCol); const smat = new T.MeshPhysicalMaterial({ color: sm.color, alphaMap: strokeTex, transparent: true, alphaTest: 0.35, bumpMap: strokeTex, bumpScale: sm.bump, roughness: sm.rough, metalness: sm.metal, clearcoat: sm.cc, clearcoatRoughness: 0.1, envMapIntensity: 0.9, polygonOffset: true, polygonOffsetFactor: -3, side: T.DoubleSide }); const sp = new T.Mesh(new T.PlaneGeometry(SE * 2, SE * 2), smat); sp.rotation.x = -Math.PI / 2; sp.position.y = topY + 0.075; addC(sp); }

    // ---- toppings -------------------------------------------------------------------------------------------
    if (g.shape !== 'cupcakes' && g.topping !== 'none') {
      const R = rTop * 0.78; const count = Math.floor(10 + 40 * (0.3 + g.bundt)); const tm = new T.Matrix4(); const c = new T.Color();
      if (g.topping === 'berries') { const bm = new T.InstancedMesh(new T.SphereGeometry(0.13, 16, 12), new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.22, clearcoat: 1, envMapIntensity: 0.9 }), count); bm.castShadow = true; for (let i = 0; i < count; i++) { const a = rr() * 6.28, rad = Math.sqrt(rr()) * R; pp.set(Math.cos(a) * rad, topY + 0.15 + rr() * 0.12, Math.sin(a) * rad); const s = 0.7 + rr() * 0.7; ss.set(s, s * 0.95, s); qq.identity(); tm.compose(pp, qq, ss); bm.setMatrixAt(i, tm); c.setHSL(rr() < 0.7 ? 0.97 : 0.68, 0.75, 0.22); bm.setColorAt(i, c); } addC(bm); }
      else if (g.topping === 'flowers') { const nf = 7 + Math.floor(5 * g.bundt); for (let f = 0; f < nf; f++) { const a = f / nf * 6.28 + rr(), rad = (f % 2 ? 0.55 : 1) * R * 0.9; const cx = Math.cos(a) * rad, cz = Math.sin(a) * rad; const col = new T.Color().setHSL((g.glaze + 0.1 * f) % 1, 0.55, 0.7); const pm = new T.MeshPhysicalMaterial({ color: col, roughness: 0.4, clearcoat: 0.2 }); for (let k = 0; k < 6; k++) { const p = new T.Mesh(new T.SphereGeometry(0.17, 14, 10), pm); const ak = k / 6 * 6.28; p.position.set(cx + Math.cos(ak) * 0.2, topY + 0.18, cz + Math.sin(ak) * 0.2); p.scale.set(1, 0.6, 1); p.castShadow = true; addC(p); } const mid = new T.Mesh(new T.SphereGeometry(0.1, 12, 8), new T.MeshStandardMaterial({ color: 0xe8b23a })); mid.position.set(cx, topY + 0.24, cz); addC(mid); const lf = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), new T.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.5 })); lf.scale.set(1.4, 0.25, 0.7); lf.position.set(cx + 0.3, topY + 0.1, cz + 0.2); lf.rotation.y = rr() * 3; addC(lf); } }
      else if (g.topping === 'macarons') { const nm = 8 + Math.floor(6 * g.bundt); for (let i = 0; i < nm; i++) { const a = i / nm * 6.28, rad = R * (i % 2 ? 0.96 : 0.62); const col = new T.Color().setHSL((0.02 + 0.13 * i) % 1, 0.5, 0.75); const sh = new T.MeshPhysicalMaterial({ color: col, roughness: 0.55 }); const cream = new T.MeshStandardMaterial({ color: 0xf6ecd8, roughness: 0.6 }); const grp = new T.Group(); [0, 0.2].forEach(yy => { const d = new T.Mesh(new T.SphereGeometry(0.2, 18, 10, 0, 6.283, 0, 1.8), sh); d.scale.y = 0.55; d.position.y = yy; d.castShadow = true; grp.add(d); }); const cr = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 0.07, 16), cream); cr.position.y = 0.1; grp.add(cr); grp.position.set(Math.cos(a) * rad, topY + 0.18, Math.sin(a) * rad); grp.rotation.z = (rr() - 0.5) * 0.5; addC(grp); } }
      else if (g.topping === 'sprinkles') { const n = 260; const sp = new T.InstancedMesh(new T.CylinderGeometry(0.014, 0.014, 0.09, 6), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), n); for (let i = 0; i < n; i++) { const a = rr() * 6.28, rad = Math.sqrt(rr()) * rTop * 0.92; pp.set(Math.cos(a) * rad, topY + 0.08, Math.sin(a) * rad); qq.setFromEuler(new T.Euler(Math.PI / 2 + (rr() - 0.5) * 0.3, rr() * 6.28, 0)); ss.set(1, 1, 1); tm.compose(pp, qq, ss); sp.setMatrixAt(i, tm); c.setHSL(rr(), 0.8, 0.55); sp.setColorAt(i, c); } addC(sp); }
      partsExtra.push({ id: 'DECOR', name: g.topping.toUpperCase(), focus: { pos: [0, topY + 0.2, 0], dist: rTop * 1.6 + 1.5, yaw: 0.3, pitch: 0.6 }, ring: 2 });
    }

    // ============================ CANDLES ============================
    if (arrOn) {
      const arr = (g.arr && g.arr !== 'auto') ? g.arr : 'row'; const N0 = numDigits ? numDigits.length : clamp(g.age, 1, 30); const pts = []; const yy = topY + 0.05; const bz = -0.36 * Ez;
      if (numDigits) numDigits.forEach((d, i) => pts.push({ x: (i - (N0 - 1) / 2) * 1.2, y: yy, z: bz - 0.1, type: 'number', digit: d }));
      else if (arr === 'grid') { const cols = Math.max(2, Math.ceil(Math.sqrt(N0 * 1.5))), rows = Math.ceil(N0 / cols), sp = Math.min(0.64, (Ex * 1.5) / cols); let k = 0; for (let rI = 0; rI < rows && k < N0; rI++) { const inRow = Math.min(cols, N0 - k); for (let cI = 0; cI < inRow; cI++, k++) pts.push({ x: (cI - (inRow - 1) / 2) * sp + (rI % 2 ? sp * 0.0 : 0) + (rI - (rows - 1) / 2) * sp * 0.18, y: yy, z: bz + (rI - (rows - 1) / 2) * sp * 0.95 }); } }
      else if (arr === 'row') { const sp = Math.min(1.1, (Ex * 1.5) / Math.max(1, N0 - 1) + 0.0); for (let i = 0; i < N0; i++) pts.push({ x: (i - (N0 - 1) / 2) * Math.max(0.5, Math.min(sp, 1.5)), y: yy, z: bz - 0.1 }); }
      else if (arr === 'arc') { for (let i = 0; i < N0; i++) { const a = Math.PI * (1.12 + 0.76 * (N0 === 1 ? 0.5 : i / (N0 - 1))); pts.push({ x: Math.cos(a) * Ex * 0.62, y: yy, z: Math.sin(a) * Ez * 0.62 + 0.1 }); } }
      else { const rc = H.rng(g.seed ^ 55); let tries = 0; while (pts.length < N0 && tries++ < 400) { const a = rc() * 6.283, rad = Math.sqrt(rc()) * 0.62; const x = Math.cos(a) * Ex * rad, z = Math.sin(a) * Ez * rad - 0.2 * Ez; if (pts.every(q => Math.hypot(q.x - x, q.z - z) > 0.5)) pts.push({ x, y: yy, z }); } }
      slots.length = 0; pts.forEach(q => slots.push(q));
    }
    if (g.cslots && g.shape !== 'cupcakes') { slots.length = 0; g.cslots.forEach(c => slots.push({ x: c.x, y: topY + 0.05, z: c.z, type: c.type, off: !!c.off })); }
    const N = slots.length; const candles = []; const lights = []; const glow = glowTex();
    const flameGeo = (() => { const pts = []; for (let k = 0; k <= 20; k++) { const t = k / 20; pts.push(new T.Vector2(0.05 * Math.sin(Math.PI * Math.pow(t, 0.62)) * (1 - 0.35 * t), t * 0.24)); } return new T.LatheGeometry(pts, 18); })();
    const flameMat = new T.MeshBasicMaterial({ color: new T.Color(4.0, 2.6, 1.0), toneMapped: false }), flameCore = new T.MeshBasicMaterial({ color: new T.Color(3.0, 3.2, 4.0), toneMapped: false });
    const waxTex = H.noiseTex(128, (u, v) => { const s = Math.floor((u * 4 + v * 6) % 1 * 2); return s ? [248, 248, 244] : [200, 60, 80]; }, true);
    const taperCols = [0xf4efe4, 0xd23a4c, 0x3a78d2, 0xe9b13a, 0x44b57a];
    const mkFlame = yy => { const fl = new T.Group(); fl.position.y = yy; const f1 = new T.Mesh(flameGeo, flameMat), f2 = new T.Mesh(flameGeo, flameCore); f2.scale.set(0.45, 0.4, 0.45); f2.position.y = 0.012; fl.add(f1, f2); const halo = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 0xffb060, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, toneMapped: false })); halo.scale.set(0.9, 0.9, 1); halo.position.y = 0.12; fl.add(halo); return { fl, halo }; };
    const holderMat = new T.MeshPhysicalMaterial({ color: iceCol.clone().multiplyScalar(0.98), roughness: 0.5, clearcoat: 0.2 }); const holder = grp => { const hm = new T.Mesh(new T.TorusGeometry(0.13, 0.045, 8, 22), holderMat); hm.rotation.x = Math.PI / 2; hm.position.y = 0.025; grp.add(hm); };
    const wickMat = new T.MeshBasicMaterial({ color: 0x120a06 });
    const push = (s, grp, ff, extra) => { addC(grp); candles.push(Object.assign({ slot: s, off: !!s.off, k: s.off ? 0 : 1, burn: 0, grp, fl: ff.fl, halo: ff.halo, ph: rr() * 6.28 }, extra)); };
    function makeCandle(s, i) {
      const ctype = s.type || g.candle; const grp = new T.Group(); grp.position.set(s.x, s.y, s.z);
      if (ctype === 'sparkler') {
        const wire = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 1.0, 6), new T.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.4 })); wire.position.y = 0.5; grp.add(wire);
        const sprites = []; for (let k = 0; k < 14; k++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: glow, color: k % 3 ? 0xfff0c0 : 0xffd060, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); sp.scale.setScalar(0.12 + 0.2 * rr()); sp.position.y = 1.0; grp.add(sp); sprites.push({ sp, ph: rr() * 6.28, v: 0.6 + rr() }); }
        const halo = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 0xffe0a0, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9, toneMapped: false })); halo.scale.set(1.1, 1.1, 1); halo.position.y = 1.0; grp.add(halo);
        addC(grp); candles.push({ slot: s, off: !!s.off, k: s.off ? 0 : 1, burn: 0, grp, spark: sprites, halo, ph: rr() * 6.28, fl: null }); return;
      }
      if (ctype === 'braid') { const bh = 1.5; const bm = new T.MeshPhysicalMaterial({ color: 0x7a1013, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.7 }); for (let k = 0; k < 3; k++) { const ph = k * 2.094, pts = []; for (let q = 0; q <= 48; q++) { const t = q / 48, a = t * Math.PI * 2 * 4.5 + ph; pts.push(V3(Math.cos(a) * 0.075, 0.02 + t * bh, Math.sin(a) * 0.075)); } const m = new T.Mesh(H.sweep(new T.CatmullRomCurve3(pts), () => 0.078, 90, 8), bm); m.castShadow = true; grp.add(m); } const core = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, bh, 12), bm); core.position.y = bh / 2; grp.add(core); holder(grp); const wk = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.1, 6), wickMat); wk.position.y = bh + 0.05; grp.add(wk); const ff = mkFlame(bh + 0.1); grp.add(ff.fl); push(s, grp, ff, { bh: bh + 0.1 }); return; }
      if (ctype === 'daisy') { const sh = 0.95; const stem = new T.Mesh(new T.CylinderGeometry(0.05, 0.055, sh, 14), new T.MeshPhysicalMaterial({ color: 0xf2e6c8, roughness: 0.4, clearcoat: 0.3 })); stem.position.y = sh / 2; stem.castShadow = true; grp.add(stem); const head = new T.Group(); head.position.y = sh + 0.1; head.rotation.x = -0.4; const pm = new T.MeshPhysicalMaterial({ color: 0xf6e8c4, roughness: 0.28, clearcoat: 0.6, envMapIntensity: 0.8 }); for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; const pt = new T.Mesh(new T.SphereGeometry(1, 12, 8), pm); pt.scale.set(0.2, 0.072, 0.05); pt.position.set(Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0); pt.rotation.z = a; pt.castShadow = true; head.add(pt); } const disc = new T.Mesh(new T.SphereGeometry(0.15, 20, 14), new T.MeshPhysicalMaterial({ color: 0xe8b61c, roughness: 0.45 })); disc.scale.z = 0.5; disc.position.z = 0.03; head.add(disc); grp.add(head); const wk = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.28, 6), wickMat); wk.position.set(0, sh + 0.28, 0.12); grp.add(wk); const ff = mkFlame(sh + 0.46); ff.fl.position.z = 0.12; grp.add(ff.fl); holder(grp); push(s, grp, ff, { bh: sh + 0.5 }); return; }
      if (ctype === 'number') { const ds = String(clamp(Math.round(g.age), 1, 99)); const d = s.digit || ds[i % ds.length]; const gl = GLYPH[d] || GLYPH['0']; const sc2 = 0.235; const col = [0x2f66c8, 0xf0c020, 0xd24a8c, 0x3aa86a][i % 4]; const wm = new T.MeshPhysicalMaterial({ color: col, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.8 }); let topV = -1, topX = 0;
        gl.forEach(poly => { const pts = chaikin(poly.map(([px, py]) => [(px - 2) * sc2, py * sc2 + 0.2]), 2); pts.forEach(q => { if (q[1] > topV) { topV = q[1]; topX = q[0]; } }); if (pts.length < 2 || Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.001 && pts.length < 4) return; const m = new T.Mesh(H.sweep(new T.CatmullRomCurve3(pts.map(q => V3(q[0], q[1], 0)), false, 'centripetal'), () => 0.18, Math.min(160, pts.length * 3), 10), wm); m.castShadow = true; grp.add(m); [pts[0], pts[pts.length - 1]].forEach(q => { const c = new T.Mesh(new T.SphereGeometry(0.18, 12, 10), wm); c.position.set(q[0], q[1], 0); grp.add(c); }); });
        for (let k = 0; k < 6; k++) { const dr = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), wm); const gp = gl[k % gl.length]; const q = gp[(k * 3) % gp.length]; dr.position.set((q[0] - 2) * sc2 + (rr() - 0.5) * 0.08, q[1] * sc2 + 0.04 - rr() * 0.14, 0.12); dr.scale.set(1, 2 + rr() * 1.6, 0.8); grp.add(dr); }
        const pud = new T.Mesh(new T.SphereGeometry(0.4, 16, 10), wm); pud.scale.set(1.9, 0.1, 1.0); pud.position.y = 0.06; grp.add(pud); const wk = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.12, 6), wickMat); wk.position.set(topX, topV + 0.15, 0); grp.add(wk); const ff = mkFlame(topV + 0.2); ff.fl.position.x = topX; grp.add(ff.fl); push(s, grp, ff, { bh: topV + 0.2 }); return; }
      const taper = ctype === 'taper', teal = ctype === 'tealight'; const col = taperCols[(i + g.seed) % taperCols.length];
      if (teal) { const cup = new T.Mesh(new T.CylinderGeometry(0.22, 0.19, 0.12, 28), new T.MeshPhysicalMaterial({ color: 0xc8c8cc, metalness: 0.9, roughness: 0.25, envMapIntensity: 1 })); cup.position.y = 0.06; grp.add(cup); const wax = new T.Mesh(new T.CylinderGeometry(0.2, 0.18, 0.1, 28), new T.MeshStandardMaterial({ color: 0xf6efe0, roughness: 0.5 })); wax.position.y = 0.09; grp.add(wax); const fl2 = new T.Group(); fl2.position.y = 0.17; const g1 = new T.Mesh(flameGeo, flameMat), g2 = new T.Mesh(flameGeo, flameCore); g2.scale.set(0.45, 0.4, 0.45); g2.position.y = 0.012; fl2.add(g1, g2); fl2.scale.setScalar(1.15); const hl = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 0xffb060, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, toneMapped: false })); hl.scale.set(1.1, 1.1, 1); hl.position.y = 0.12; fl2.add(hl); grp.add(fl2); addC(grp); candles.push({ slot: s, off: !!s.off, k: s.off ? 0 : 1, burn: 0, grp, fl: fl2, halo: hl, ph: rr() * 6.28, base: 1.15 }); return; }
      const body = new T.Mesh(new T.CylinderGeometry(taper ? 0.04 : 0.05, taper ? 0.045 : 0.055, taper ? 1.05 : 0.78, 20), taper ? new T.MeshPhysicalMaterial({ color: col, roughness: 0.4, clearcoat: 0.3, envMapIntensity: 0.5 }) : new T.MeshPhysicalMaterial({ color: 0xffffff, map: waxTex, roughness: 0.42, clearcoat: 0.3, envMapIntensity: 0.5 })); const bh = taper ? 1.05 : 0.78; body.position.y = bh / 2; body.castShadow = true; grp.add(body);
      holder(grp); const wick = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.07, 6), new T.MeshBasicMaterial({ color: 0x120a06 })); wick.position.y = bh + 0.035; grp.add(wick);
      const fl = new T.Group(); fl.position.y = bh + 0.07; const f1 = new T.Mesh(flameGeo, flameMat), f2 = new T.Mesh(flameGeo, flameCore); f2.scale.set(0.45, 0.4, 0.45); f2.position.y = 0.012; fl.add(f1, f2);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 0xffb060, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85, toneMapped: false })); halo.scale.set(0.9, 0.9, 1); halo.position.y = 0.12; fl.add(halo);
      grp.add(fl); addC(grp); candles.push({ slot: s, off: !!s.off, k: s.off ? 0 : 1, burn: 0, grp, fl, halo, body, wick, bh, ph: rr() * 6.28 });
    }
    slots.forEach((s, i) => makeCandle(s, i));
    const nL = Math.min(4, Math.max(1, Math.ceil(N / 6)));
    for (let i = 0; i < nL; i++) { const L = new T.PointLight(0xff9440, 1, 14, 1.6); const a = slots.length ? slots[Math.floor(i * N / nL) % N] : { x: 0, y: topY, z: 0 }; L.position.set(a.x * 0.6, a.y + 1.3, a.z * 0.6); L.userData.heroLight = true; ctx.scene.add(L); lights.push(L); }

    // ---- extras: smarties, balloons, props ----------------------------------------------------------------
    if (g.smarties > 0) { const sg = new T.CylinderGeometry(0.11, 0.11, 0.05, 20); const sm = new T.InstancedMesh(sg, new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1, envMapIntensity: 0.8 }), g.smarties); sm.castShadow = true; const c = new T.Color(); for (let i = 0; i < g.smarties; i++) { const a = rr() * 6.28, rad = (g.shape === 'cupcakes' ? 3.6 : 3.2) + rr() * 1.6; pp.set(Math.cos(a) * rad, 0.03, Math.sin(a) * rad * 0.8); qq.setFromEuler(new T.Euler((rr() - 0.5) * 0.2, rr() * 6.28, (rr() - 0.5) * 0.2)); ss.set(1, 1, 1); mm.compose(pp, qq, ss); sm.setMatrixAt(i, mm); c.setHSL(rr(), 0.75, 0.5); sm.setColorAt(i, c); } add(sm); }
    const balloons = []; for (let i = 0; i < g.balloons; i++) { const col = new T.Color(BALLOONS[(i + g.seed) % BALLOONS.length]); const b = new T.Mesh(new T.SphereGeometry(1, 48, 32), new T.MeshPhysicalMaterial({ color: col, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 })); b.scale.set(1.05, 1.3, 1.05); const a = -0.6 - i * 0.55 + (i % 2) * 0.4; b.position.set(Math.cos(a * 2 + 2.6) * (6 + i), 4.2 + (i % 3) * 0.8, -5 - i * 0.9); add(b); balloons.push({ b, ph: rr() * 6 }); const s = new T.Mesh(new T.CylinderGeometry(0.01, 0.01, 8, 4), new T.MeshBasicMaterial({ color: 0xd8d0c0 })); s.position.set(b.position.x, b.position.y - 4.6, b.position.z); add(s); }
    if (g.props) {
      // bunting on a catenary behind the table
      const nb = 12, ca = V3(-9, 6.2, -7), cb = V3(9, 6.0, -7); const flagCols = BALLOONS.map(c => new T.Color(c)); const flagG = new T.BufferGeometry().setFromPoints([V3(-0.4, 0, 0), V3(0.4, 0, 0), V3(0, -0.85, 0)]); flagG.computeVertexNormals(); const fm = new T.InstancedMesh(flagG, new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: 0.8 }), nb); const c = new T.Color(); const cp = []; for (let i = 0; i < nb; i++) { const t = (i + 0.5) / nb; const x = ca.x + (cb.x - ca.x) * t, y = ca.y + (cb.y - ca.y) * t - 1.4 * Math.sin(Math.PI * t); pp.set(x, y, -7); qq.setFromEuler(new T.Euler(0, 0, (t - 0.5) * 0.2)); ss.set(1, 1, 1); mm.compose(pp, qq, ss); fm.setMatrixAt(i, mm); fm.setColorAt(i, c.copy(flagCols[i % flagCols.length])); cp.push(V3(x, y, -7)); } add(fm); const line = new T.Mesh(H.sweep(new T.CatmullRomCurve3([ca, V3(0, ca.y - 1.4, -7), cb]), () => 0.015, 24, 4), new T.MeshBasicMaterial({ color: 0xd8d0c0 })); add(line);
      // gifts
      [[-5.6, 1.1, 1.0, 0x3a78d2], [-4.4, 0.7, 2.2, 0xd23a4c], [5.4, 0.9, 1.0, 0x44b57a]].forEach(([x, s, z, col]) => { const bx = new T.Mesh(new T.BoxGeometry(s, s, s), new T.MeshPhysicalMaterial({ color: col, roughness: 0.35, clearcoat: 0.4 })); bx.position.set(x, s / 2, z); bx.rotation.y = x * 0.2; bx.castShadow = bx.receiveShadow = true; add(bx); const rb = new T.Mesh(new T.BoxGeometry(s * 1.02, s * 1.02, s * 0.14), new T.MeshStandardMaterial({ color: 0xe9c25a, metalness: 0.5, roughness: 0.4 })); rb.position.copy(bx.position); rb.rotation.y = bx.rotation.y; add(rb); const rb2 = rb.clone(); rb2.rotation.y += Math.PI / 2; add(rb2); });
      // plates
      for (let i = 0; i < 4; i++) { const pl = new T.Mesh(new T.CylinderGeometry(0.75, 0.7, 0.04, 40), new T.MeshPhysicalMaterial({ color: 0xf2efe8, roughness: 0.15, clearcoat: 1 })); pl.position.set(3.2 + (i % 2) * 0.1, 0.02 + i * 0.045, 2.4); pl.castShadow = true; add(pl); }
    }
    // ---- the film's children, as cutouts (Act II) --------------------------------------------------------------
    if (g.cutouts) {
      const CS = 154, cr = A.getRes(CS), myId = ctx.id;
      const addCut = () => {
        if (!cr.ready) { if (!cr.failed) setTimeout(addCut, 200); return; } if (H.buildId !== myId) return;
        const FW = 768, FH = 432, c = document.createElement('canvas'); c.width = FW; c.height = FH; const x = c.getContext('2d'); x.drawImage(cr.frameImg, 0, 0, FW, FH);
        const pset = {}; D2.sec[CS].segs.forEach(sg => { pset[sg.i] = sg.p > 0.5 ? 1 : 0; });
        const m = document.createElement('canvas'); m.width = FW; m.height = FH; const mx = m.getContext('2d'); const md = mx.createImageData(FW, FH);
        for (let yy = 0; yy < FH; yy++) for (let xx = 0; xx < FW; xx++) { const l = cr.labels[Math.floor(yy * 270 / FH) * 480 + Math.floor(xx * 480 / FW)]; md.data[(yy * FW + xx) * 4 + 3] = pset[l] ? 255 : 0; }
        mx.putImageData(md, 0, 0); const mb = document.createElement('canvas'); mb.width = FW; mb.height = FH; const bx = mb.getContext('2d'); bx.filter = 'blur(2px)'; bx.drawImage(m, 0, 0);
        x.globalCompositeOperation = 'destination-in'; x.drawImage(mb, 0, 0);
        const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 8;
        const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, toneMapped: false }); mat.color.setScalar(1.15); H.cutMat = mat; H.cutHeads = D2.sec[CS].segs.filter(sg => sg.cls === 'FACE').map(sg => [0.4 + (sg.cx - 0.5) * 26, 2.9 + (0.5 - sg.cy) * 26 * 9 / 16, -3.6]);
        const pl = new T.Mesh(new T.PlaneGeometry(26.0, 26.0 * 9 / 16), mat); pl.position.set(0.4, 2.9, -3.6); root.add(pl);
      }; addCut();
    }

    // ---- parts + overview ------------------------------------------------------------------------------------
    const c0 = slots[0] || { x: 0, y: topY, z: 0 };
    H.parts = [
      { id: 'WICKS.DOF', name: N + (g.candle === 'sparkler' ? ' SPARKLERS' : ' CANDLES'), focus: { pos: [0, topY + 0.7, 0], dist: 3.6 + rTop * 0.7, yaw: 0.3, pitch: 0.22 }, ring: 1 },
      { id: 'FLAME', name: g.candle === 'sparkler' ? 'A SPARKLER' : 'A SINGLE FLAME', focus: { pos: [c0.x, c0.y + (g.candle === 'sparkler' ? 1.0 : 0.95), c0.z], dist: 0.9, yaw: 0.2, pitch: 0.05 }, ring: 3 },
    ].concat(partsExtra).concat([{ id: 'STAGE', name: g.table.toUpperCase() + ' TABLE · ' + g.scene.toUpperCase(), focus: { pos: [0, 0.2, 0], dist: 13, yaw: 0.45, pitch: 0.33 }, ring: 3 }]);
    const VIEWS = { tq: [0.4, 0.24], front: [0.0, 0.14], high: [0.3, 0.6], hero: [0.0, 0.72] }; const vw = VIEWS[g.view] || VIEWS.tq;
    H.overviewFrame = g.view === 'hero' ? { pos: [0, topY * 0.8 + (g.candle === 'number' ? 0.5 : 0.2), 0.1], dist: 6.2 + Math.max(Ex, Ez) * 1.5 + cakeH * 0.55 + (g.candle === 'number' ? 1.0 : 0), yaw: 0, pitch: vw[1] } : { pos: [0, Math.max(1.6, cakeH * 0.5), 0], dist: 11 + cakeH * 0.9 + (g.shape === 'cupcakes' ? 2 : 0), yaw: vw[0], pitch: vw[1] };
    H.focusPoint = V3(0, Math.max(1.0, cakeH * 0.7), 0);
    H.cakeRefs = { glazeMat, icing, inkMat, candles, lights, balloons, topY, rTop, inscr };

    // ---- life -------------------------------------------------------------------------------------------------
    H.blown = H.blown || 0; H.blowT = 0;
    const dayLit = scn === 'window' ? 1 : 0, neonLit = scn === 'neon' ? 1 : 0;
    const ghostCol = new T.Color(0.2, 0.9, 0.85); const cakeMats = new Set(); cakeG.traverse(o => { if (o.isMesh && o.material && !o.isSprite) cakeMats.add(o.material); });
    function applySolid(v) { cakeMats.forEach(m => { if (m.userData._o === undefined) m.userData._o = m.transparent ? 1 : 0; const gh = clamp(1 - v, 0, 1); if (gh > 0.01) { m.transparent = true; m.opacity = 0.14 + 0.86 * v; m.depthWrite = v > 0.7; if (m.emissive) { m.emissive.copy(ghostCol).multiplyScalar(0.55 * gh); } } else { m.opacity = 1; m.transparent = !!m.alphaMap || m.userData._o === 1; m.depthWrite = true; if (m.emissive) m.emissive.setScalar(0); } }); }
    const smokeTex = smokeTexMk(); function puff(c) { if (c.smoke) c.grp.remove(c.smoke.sp); const sp = new T.Sprite(new T.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.55 })); sp.position.y = (c.bh || 1) + 0.25; c.grp.add(sp); c.smoke = { sp, t: 0 }; }
    H.cakeAPI = { g, topY, E: SE, rTop, shape: g.shape, cakeG, candles, slots, textRect, supported: g.shape !== 'cupcakes', textZ, puff, drawStroke, redrawStrokes, strokeTex,
      inside(x, z) { if (box) return Math.abs(x) <= box.hx && Math.abs(z) <= box.hz; return ['round', 'bundt', 'naked', 'drum', 'poly'].includes(g.shape) ? Math.hypot(x, z) <= rTop * 0.96 : Math.abs(x) <= SE * 0.96 && Math.abs(z) <= SE * 0.96; },
      addCandle(x, z, type) { const s = { x, y: topY + 0.05, z, type, off: false }; slots.push(s); makeCandle(s, candles.length); return candles[candles.length - 1]; },
      removeCandle(i) { const c = candles[i]; if (!c) return; cakeG.remove(c.grp); candles.splice(i, 1); slots.splice(i, 1); },
      pick(raycaster) { const objs = candles.map(c => c.grp); const hs = raycaster.intersectObjects(objs, true).filter(h => h.object.isMesh); if (!hs.length) return -1; let o = hs[0].object; while (o && !objs.includes(o)) o = o.parent; return objs.indexOf(o); } };
    H.applySolid = applySolid; H.cakeG = cakeG; H.tumbleAmt = 0;
    H.updaters.push((dt, t) => {
      const stage = g.room, lit = H.blown ? Math.max(0, 1 - H.blowT) : 1; if (H.blown) H.blowT = Math.min(2, H.blowT + dt * 0.9); const wind = H.blown ? Math.min(1, H.blowT * 1.6) : 0;
      let litSum = 0; candles.forEach((c, i) => {
        c.k += ((c.off ? 0 : 1) - c.k) * Math.min(1, dt * 6); const cl = lit * c.k; litSum += cl;
        if (H.blown && !c.puffed && cl < 0.5) { c.puffed = true; puff(c); } if (!H.blown && c.puffed && !c.off) c.puffed = false;
        if (c.smoke) { const sm = c.smoke; sm.t += dt; sm.sp.position.y = (c.bh || 1) + 0.25 + sm.t * 0.9; sm.sp.position.x = Math.sin(sm.t * 2.1) * 0.12; sm.sp.scale.setScalar(0.18 + sm.t * 0.6); sm.sp.material.opacity = 0.55 * Math.max(0, 1 - sm.t / 3.2); if (sm.t > 3.2) { c.grp.remove(sm.sp); c.smoke = null; } }
        if (g.burn && c.body && cl > 0.3) { c.burn += dt * g.burn; const sc = 1 - 0.5 * clamp(c.burn / 60, 0, 1); c.body.scale.y = sc; c.body.position.y = c.bh * sc / 2; c.wick.position.y = c.bh * sc + 0.035; c.fl.position.y = c.bh * sc + 0.07; if (c.burn >= 60 && !c.off) { c.off = true; if (c.slot) c.slot.off = true; puff(c); c.puffed = true; } }
        if (c.spark) { c.spark.forEach(s => { const ph = t * 6 * s.v + s.ph; s.sp.position.set(Math.cos(ph * 2.1) * 0.22 * Math.abs(Math.sin(ph)), 1.0 + Math.sin(ph * 1.7) * 0.2, Math.sin(ph * 1.7) * 0.22 * Math.abs(Math.cos(ph))); s.sp.material.opacity = cl * (0.4 + 0.6 * Math.abs(Math.sin(ph * 3))); s.sp.visible = cl > 0.02; }); c.halo.material.opacity = 0.7 * cl * (0.75 + 0.25 * Math.sin(t * 17 + c.ph)); return; }
        const fl = 0.85 + 0.18 * Math.sin(t * 11 + c.ph) + 0.1 * Math.sin(t * 23 + c.ph * 2) + 0.06 * Math.sin(t * 47 + i); const k = cl < 0.02 ? 0.0001 : fl * (0.4 + 0.6 * cl);
        c.fl.scale.set(k, k * (0.9 + 0.25 * Math.sin(t * 8 + c.ph)), k); c.fl.rotation.z = Math.sin(t * 3.3 + c.ph) * 0.12 + wind * 0.9; c.fl.rotation.x = Math.cos(t * 2.7 + c.ph) * 0.1; c.halo.material.opacity = 0.85 * cl * (0.8 + 0.2 * fl); c.fl.visible = cl > 0.02;
      });
      const litFrac = litSum / Math.max(1, candles.length); const allOut = candles.length > 0 && litFrac < 0.02; if (allOut && !H._wish) { H._wish = true; A.emit('wish'); } if (!allOut) H._wish = false;
      const base = (0.5 + 0.9 * (Math.min(N, 12) / 12)) * 1.0 * litFrac; lights.forEach((L, i) => { L.intensity = base * (0.9 + 0.1 * Math.sin(t * 13 + i * 2) + 0.06 * Math.sin(t * 29 + i)) / nL * 1.4; });
      reveal.value = g.pipe; if (H.cursorUpdate) H.cursorUpdate(); applySolid(g.cakeSolid != null ? g.cakeSolid : g.solid); const tmp = g.temp; H.post.uniforms.tintA.value.set(1 - 0.28 * Math.max(0, -tmp) + 0.1 * Math.max(0, tmp), 1 + 0.02 * Math.max(0, -tmp) - 0.06 * Math.max(0, tmp), 1 + 0.14 * Math.max(0, -tmp) - 0.22 * Math.max(0, tmp)); lights.forEach(L => L.color.setRGB(1 - 0.45 * Math.max(0, -tmp), 0.58 + 0.2 * Math.max(0, -tmp) - 0.05 * Math.max(0, tmp), 0.25 + 0.7 * Math.max(0, -tmp)));
      if (H.tumbleAmt > 0.001) { cakeG.rotation.x = 0.5 * H.tumbleAmt * Math.sin(t * 0.9); cakeG.rotation.z = 0.35 * H.tumbleAmt * Math.cos(t * 0.7); cakeG.rotation.y = t * 0.55 * H.tumbleAmt; cakeG.position.y = 2.2 * H.tumbleAmt + 0.15 * H.tumbleAmt * Math.sin(t * 1.3); } else { cakeG.rotation.set(0, 0, 0); cakeG.position.y = 0; }
      const day = dayLit ? 1.0 : 0; H.lights.key.intensity = 0.25 + stage * 3.2 + day * 2.2 + (scn === 'void' ? 0.35 : 0); H.lights.rim.intensity = 0.15 + stage * 1.2 + day * 0.8 + (scn === 'void' ? 0.6 : 0); H.lights.fill.intensity = 0.02 + stage * 0.3 + day * 0.25;
      balloons.forEach(bb => { bb.b.position.y += Math.sin(t * 0.8 + bb.ph) * 0.0015; bb.b.rotation.y = t * 0.1 + bb.ph; });
      H.post.uniforms.exposure.value = (scn === 'dark' ? 0.5 : scn === 'window' ? 0.75 : scn === 'void' ? 0.62 : 0.6) + stage * 0.5; H.lensBias = (1 - g.focus) * H.orbit.dist * 0.4; H.aperture = 0.35 + 0.95 * (1 - g.focus) + 0.25; if (H.cutMat) H.cutMat.opacity = 0.08 + 0.92 * g.solid; glazeMat.color.copy(glazeColor(g));
    });
  }

  H.blow = function () { H.blown = H.blown ? 0 : 1; H.blowT = 0; A.emit('blow', H.blown); };
  function onDial(ring, ang) {
    const g = H.genome, v = valOf(ang);
    if (ring === 0) g.solid = v; else if (ring === 1) g.focus = v; else if (ring === 2) g.pipe = v; else if (ring === 3) g.room = v * 0.6; else if (ring === 4) g.temp = v * 2 - 1;
    g.variant = -1;
  }

  H.register('cake', {
    ref: { sec: 154, frame: { pos: [0.4, 3.3, 0], dist: 25, yaw: 0.0, pitch: 0.12 } },
    mood: g => ({ dark: 'amber', bokeh: 'amber', window: 'dome', neon: 'studio' }[g.scene] || 'amber'), makeGenome, build, filmCanon, dials, onDial, variants: FILM_VARIANTS,
    get overview() { return H.overviewFrame || { pos: [0, 1.6, 0], dist: 12.5, yaw: 0.4, pitch: 0.24 }; },
    mutate(g, r, k) { const c = Object.assign({}, g); const m = (v, s) => clamp(v + (r() - 0.5) * s * k, 0, 1); c.bundt = m(c.bundt, 0.6); c.focus = m(c.focus, 0.3); c.glaze = (c.glaze + (r() - 0.5) * 0.5 * k + 1) % 1; c.drips = m(c.drips, 0.6); c.room = clamp(c.room + (r() - 0.5) * 0.3 * k, 0, 0.5);
      if (r() < 0.5 * k) c.tiers = 1 + ((r() * 3) | 0); if (r() < 0.45 * k) c.shape = pick(r, SHAPES); if (r() < 0.5 * k) c.sponge = (r() * SPONGES.length) | 0; if (r() < 0.5 * k) c.icing = (r() * ICINGS.length) | 0; if (r() < 0.4 * k) c.ink = (r() * INKS.length) | 0; if (r() < 0.45 * k) c.topping = pick(r, TOPPINGS); if (r() < 0.35 * k) c.candle = pick(r, CANDLES); if (r() < 0.35 * k) c.table = pick(r, TABLES); if (r() < 0.4 * k) c.scene = pick(r, SCENES); if (r() < 0.3 * k) c.props = c.props ? 0 : 1; if (r() < 0.4 * k) c.balloons = (r() * 5) | 0; if (r() < 0.3 * k) c.smarties = r() < 0.5 ? 0 : 8 + ((r() * 28) | 0); if (r() < 0.3 * k) c.view = pick(r, ['tq', 'front', 'high']);
      if (r() < 0.45 * k) c.font = pick(r, FONTS); if (r() < 0.4 * k) c.medium = pick(r, MEDIA); if (r() < 0.4 * k) c.layout = pick(r, LAYOUTS); c.temp = clamp(c.temp + (r() - 0.5) * 0.6 * k, -0.6, 0.9); if (c.shape === 'cupcakes') c.age = Math.min(c.age, 12); if (c.candle === 'sparkler') c.age = Math.min(c.age, 9); c.cutouts = 0; c.solid = 1; c.pipe = 1; c.cslots = null; c.strokes = []; c.variant = -1; c.seed = (r() * 4294967295) >>> 0; return c; },
    labels: ['L1:GEOM.SOLID', 'L2:WICKS.DOF', 'L3:BUNDT.PIPE', 'R1:STAGE.LUMA', 'R2:TINT.GLAZE'],
    readout: (g, i) => [g.solid > 0.97 ? 'SOLID' : g.solid < 0.05 ? 'GHOST' : `SOLID ${Math.round(g.solid * 100)}%`, `f/${(1.4 + (1 - g.focus) * 14).toFixed(1)}`, g.pipe > 0.97 ? 'PIPED' : `PIPING ${Math.round(g.pipe * 100)}%`, g.room < 0.04 ? 'CANDLELIGHT' : `ROOM ${Math.round(g.room * 100)}%`, `${Math.round(4800 - 3000 * g.temp)}K`][i],
    title: g => (g.name ? `FOR ${g.name.toUpperCase()} · ` : '') + `${g.age} ${g.candle === 'sparkler' ? 'SPARKLER' : 'CANDLE'}${g.age > 1 ? 'S' : ''}`,
    caption: ['PROCEDURAL BIRTHDAY CAKE, FROM CRUMB TO CANDLE,', 'RENDERED LIVE IN YOUR BROWSER.'],
    spec: g => [['FOR', g.name || '—'], ['AGE / CANDLES', g.age + ' · ' + g.candle], ['SHAPE', g.shape + (g.shape === 'cupcakes' || g.shape === 'naked' ? '' : ' · ' + g.tiers + ' tier' + (g.tiers > 1 ? 's' : ''))], ['SPONGE / ICING', SPONGES[g.sponge][0] + ' / ' + ICINGS[g.icing][0]], ['GLAZE', 'hue ' + Math.round(g.glaze * 360) + '°' + (g.drips > 0.05 ? ' with drips' : '')], ['TOPPING', g.topping], ['INSCRIPTION', g.shape === 'cupcakes' ? '—' : g.text.replace(/\n/g, ' / ') + ' (' + g.font + ', ' + g.medium + (g.medium === 'pipe' || g.medium === 'gel' ? ', ' + INKS[g.ink][0] : '') + ', ' + g.layout + ')'], ['TABLE / SCENE', g.table + ' / ' + g.scene], ['PARTY', [g.balloons ? g.balloons + ' balloons' : '', g.smarties ? g.smarties + ' smarties' : '', g.props ? 'bunting, gifts, plates' : ''].filter(Boolean).join(', ') || 'none']],
  });
})();
