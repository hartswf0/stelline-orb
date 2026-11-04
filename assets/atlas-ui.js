// ============================================================================
// STELLINE ATLAS UI  -  a viewfinder, not a dashboard.
// The hero (a bug, a birthday cake, or a frame of the film) fills the glass.
// Hairline furniture, a bracketed part selector, a focus-pull slider, quiet
// captions. Every control also lives on the orb (rings, SELECT, red-dot, aux,
// ENGRAM, jog wheel, rocker, X-RAY, motor buttons) and on the keyboard.
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS; if (!A) return;
  const D = A.data, H = A.hero;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const $ = (s, r) => (r || document).querySelector(s);
  const fmtT = t => { t = Math.max(0, t); return String((t / 60) | 0).padStart(2, '0') + ':' + String((t % 60) | 0).padStart(2, '0'); };
  document.body.classList.add('v5');
  if (window.state) { state.staticMode = true; state.liveModeling = false; }
  A.mode = 'film'; A.photo = false;

  // -------------------------------------------------------------------------- CSS
  const css = document.createElement('style');
  css.textContent = `
  body.v5 .minimal-corner,body.v5 .mobile-thumb-dock{display:none!important}
  body.v5 .orb-stage{align-items:center!important;padding-top:0!important}
  body:not(.v5) #v5Root{display:none}
  #v5Root{position:absolute;inset:0;pointer-events:none;z-index:6;font-family:var(--font-mono);color:#f3e7d6}
  #v5Root *{user-select:none}
  #v5Root button,#v5Root input,#v5Root textarea,#v5Root .hit{pointer-events:auto}
  .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .sr-only button:focus{position:fixed;left:50%;top:10px;width:auto;height:auto;clip:auto;z-index:99;background:#000;color:#fff;padding:6px 10px;border:1px solid #f0b050}
  #v5TLwrap{position:absolute;left:112px;right:112px;bottom:46px;height:30px;display:none}
  body.film-on #v5TLwrap{display:block}
  body.photo #v5TLwrap{display:none}
  #v5TL{position:absolute;inset:0;width:100%;height:100%;cursor:ew-resize;touch-action:none;pointer-events:auto}
  #v5Drawer{position:absolute;top:96px;right:22px;width:252px;max-height:calc(100% - 170px);overflow:auto;background:rgba(14,9,6,.62);backdrop-filter:blur(14px);border:1px solid rgba(247,236,222,.14);padding:12px 14px;display:none;font-size:9.5px;letter-spacing:.06em;scrollbar-width:thin;pointer-events:auto}
  #v5Drawer.on{display:block}
  #v5Drawer h5{font-weight:500;color:#f0b050;letter-spacing:.2em;font-size:8.5px;margin:10px 0 5px}
  #v5Drawer h5:first-child{margin-top:0}
  #v5Drawer label{display:block;color:rgba(243,231,214,.5);font-size:8px;letter-spacing:.2em;margin:8px 0 2px}
  #v5Drawer input[type=text],#v5Drawer textarea{width:100%;background:transparent;border:0;border-bottom:1px solid rgba(243,231,214,.28);color:#f3e7d6;font:500 11px var(--font-mono);padding:3px 0;outline:none;letter-spacing:.04em;resize:none}
  #v5Drawer input[type=text]:focus,#v5Drawer textarea:focus{border-color:#f0b050}
  #v5Drawer input[type=range]{width:100%;accent-color:#f0b050;height:14px}
  .sw-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:3px}
  .sw{width:18px;height:18px;border:1px solid rgba(243,231,214,.3);cursor:pointer}
  .sw.on{outline:1px solid #f0b050;outline-offset:2px}
  .stp{display:flex;align-items:center;gap:10px}
  .stp button,.dbtn{background:transparent;border:1px solid rgba(243,231,214,.3);color:#f3e7d6;font:500 10px var(--font-mono);letter-spacing:.14em;padding:5px 9px;cursor:pointer}
  .stp button:hover,.dbtn:hover{border-color:#f0b050;color:#f0b050}
  .stp b{font-weight:500;font-size:16px;min-width:30px;text-align:center}
  .dbtn.amber{color:#f0b050;border-color:rgba(240,176,80,.5)}
  .drow{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
  #v5Toast{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);background:rgba(14,9,6,.8);border:1px solid rgba(240,176,80,.5);color:#f0b050;padding:6px 14px;font-size:9.5px;letter-spacing:.14em;opacity:0;transition:opacity .35s;pointer-events:none;white-space:nowrap}
  #v5Toast.on{opacity:1}
  #v5Flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
  #v5Help{position:absolute;inset:60px 15% 70px 15%;background:rgba(10,7,5,.95);border:1px solid rgba(247,236,222,.2);padding:18px 22px;display:none;overflow:auto;font-size:10px;line-height:1.75;letter-spacing:.04em;pointer-events:auto;z-index:20}
  #v5Help.on{display:block}
  #v5Help kbd{border:1px solid rgba(243,231,214,.35);padding:0 4px;color:#f0b050;font-family:inherit}
  #v5Help h3{color:#f0b050;font-size:9px;letter-spacing:.22em;margin:10px 0 2px;font-weight:500}
  @media (max-width:760px){
    #v5Drawer{top:auto;bottom:90px;left:12px;right:12px;width:auto;max-height:46%}
    #v5TLwrap{left:20px;right:20px}
    #v5Help{inset:50px 10px 60px 10px}
  }`;
  document.head.appendChild(css);

  // -------------------------------------------------------------------------- DOM
  const stage = $('.hologram-stage');
  const holo = document.getElementById('hologramCanvas');
  const root = document.createElement('div'); root.id = 'v5Root'; stage.appendChild(root);
  root.innerHTML = `
  <div class="sr-only" id="v5Live" aria-live="polite" role="status"></div>
  <nav class="sr-only" id="v5SR" aria-label="Stelline controls"></nav>
  <div id="v5TLwrap"><canvas id="v5TL" aria-label="Timeline of the whole film"></canvas></div>
  <aside id="v5Drawer" aria-label="Design"></aside>
  <div id="v5Toast"></div><div id="v5Flash"></div>
  <input type="file" id="v5File" accept="video/*" style="display:none">
  <div id="v5Help"><b style="color:#f0b050;letter-spacing:.2em;font-weight:500">THE ORB IS THE INTERFACE · THE KEYS MIRROR IT</b>
   <h3>ORB</h3>rings <b>L1–R2</b> edit the specimen's genome (labels and readouts change with what you build) · <b>SELECT</b> next part · <b>ENGRAM</b> new specimen (film: next chapter) · <b>red dot</b> snapshot card (hold: share link) · <b>aux</b> switch FILM / BUG / BIRTHDAY (hold: back to the film's canon) · <b>jog wheel</b> rack focus (film: scrub) · <b>rocker</b> orbit &amp; dolly · <b>X-RAY</b> bug: anatomy / cake: blow the candles · <b>speed dome</b> tap: OTHERWISE (the film's counterfactual variants) · <b>big red thumb</b> MATCH: put the film frame beside your model and let the critic score it · <b>M1–M4, LR1</b> tap: that ring seeks the film's canon, hold: spin · <b>scale window</b> sound
   <h3>KEYS</h3><kbd>W</kbd> mode · <kbd>Tab</kbd> next part · <kbd>1</kbd>–<kbd>5</kbd> pick a ring, <kbd>↑</kbd><kbd>↓</kbd> turn it (<kbd>Shift</kbd> fine) · <kbd>←</kbd><kbd>→</kbd> orbit (film: step a second) · <kbd>[</kbd><kbd>]</kbd> dolly · <kbd>E</kbd> new specimen · <kbd>T</kbd> OTHERWISE · <kbd>R</kbd> x-ray / blow · <kbd>Y</kbd> canon · <kbd>Q</kbd> snapshot · <kbd>L</kbd> share link · <kbd>D</kbd> design drawer · <kbd>M</kbd> watch the film (wipe + critic; <kbd>,</kbd><kbd>.</kbd> step the film) · <kbd>X</kbd> photo mode · <kbd>P</kbd> sound · <kbd>N</kbd> narrate · <kbd>H</kbd> describe · <kbd>?</kbd> this page
   <h3>FILM MODE</h3>407 seconds, 57 shots, every second segmented and relief-modelled. <kbd>Space</kbd> play · <kbd>Shift</kbd>+arrows shots · <kbd>PgUp</kbd><kbd>PgDn</kbd> chapters · <kbd>V</kbd> film / parts / relief · <kbd>C</kbd> compare with the blind critic · <kbd>Z</kbd> rebuild zero → film
   <h3>THE LOOP</h3>Observe the film's bug and cake → isolate their parts → model them with the rings → compose your own specimen → compare with the critic → the orb remembers what each kind of part needs. The scene makes the interface; the interface makes the scene.
   <div style="margin-top:10px"><button class="dbtn" onclick="document.getElementById('v5Help').classList.remove('on')">CLOSE</button> <button class="dbtn" onclick="document.getElementById('v5Help').classList.remove('on');cycleEngineVersion()">LEGACY ENGINES V4–V1</button> <button class="dbtn" onclick="document.getElementById('v5File').click()">LOAD MY COPY OF THE FILM</button></div></div>`;
  $('#v5File').onchange = e => { if (e.target.files[0]) { A.loadVideo(e.target.files[0]); A.setMode('film'); } };
  const live = $('#v5Live'), toastEl = $('#v5Toast');
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('on'), 2400); }
  function say(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 20); if (A.speak) A.speak(msg); }
  A.say = say; A.toast = toast;

  // -------------------------------------------------------------------------- MODES
  const builderOf = () => (H && H.kind && H.builders[H.kind]) || null;
  const drawer = $('#v5Drawer');
  A.setMode = function (m, opts) {
    opts = opts || {};
    if (m === A.mode && !opts.force) return;
    A.mode = m;
    document.body.classList.toggle('film-on', m === 'film');
    if (m === 'film') { if (H) H.active = false; document.documentElement.style.setProperty('--page-tint', '#10161d'); A.setView(A.view === 'stage' ? 'film' : A.view, true); drawer.classList.remove('on'); drawer.innerHTML = ''; }
    else {
      A.setView('film', true);
      const b = H.builders[m]; const seed = opts.seed || H.hash(m + 'film'); const g = opts.genome || (b.filmCanon ? b.filmCanon(seed) : b.makeGenome(seed));
      H.blown = 0; H.start(m, seed, g); syncRingsToGenome(); buildDrawer();
    }
    A.emit('mode', m); say(m === 'film' ? 'Film mode. The whole footage, segmented.' : (m === 'bug' ? 'Bug designer. ' : 'Birthday designer. ') + builderOf().title(H.genome));
    refreshSR();
  };
  function syncRingsToGenome() { const b = builderOf(); if (!b || !window.setRingAngle) return; const d = b.dials(H.genome); state._syncingNode = true; for (let r = 0; r < 5; r++) setRingAngle(r, d[r], false); state._syncingNode = false; }
  A.syncHeroRings = syncRingsToGenome;
  const cycleModes = ['film', 'bug', 'cake'];
  const nextMode = () => A.setMode(cycleModes[(cycleModes.indexOf(A.mode) + 1) % 3]);
  A.cycleVariant = function () {
    const b = builderOf(); if (!b) return; const g = H.genome; const n = ((g.variant < 0 ? 0 : g.variant) + 1) % b.variants.length;
    Object.assign(g, b.variants[n].patch, { variant: n }); H.rebuild(false); H.select(H.sel, false); syncRingsToGenome(); buildDrawer(); toast(b.variants[n].code); say(b.variants[n].code);
  };
  A.canon = function () { const b = builderOf(); if (!b) return; const keep = { name: H.genome.name, age: H.genome.age, text: H.genome.text }; H.genome = b.filmCanon(H.seed); if (A.mode === 'cake') H.genome.age = keep.age; H.rebuild(false); H.select(H.sel, false); syncRingsToGenome(); buildDrawer(); toast('FILM CANON'); };
  A.reroll = function () { if (A.mode === 'film') return; const keep = A.mode === 'cake' ? { name: H.genome.name, age: H.genome.age, text: H.genome.text } : {}; const seed = (Math.random() * 4294967295) >>> 0; H.start(A.mode, seed, null, { keepSel: true }); Object.assign(H.genome, keep); if (keep.text !== undefined) H.rebuild(false); syncRingsToGenome(); buildDrawer(); toast('NEW SPECIMEN · ' + H.seedName(seed)); say('New specimen. ' + builderOf().title(H.genome)); if (A.chime) A.chime(); };
  A.selectPart = function (d) { if (A.mode === 'film') { A.cycleSel(d || 1); return; } H.cyclePart(d || 1); const p = H.parts[H.sel]; if (p) say(`${p.id}. ${p.name}.`); if (A.tick1) A.tick1(); };

  // -------------------------------------------------------------------------- WATCH THE FILM (critic <-> builders)
  A.matchOn = false; A.wipe = 0.5; A.matchSec = null; A.criticT = 0;
  A.toggleMatch = function (on) {
    if (A.mode === 'film') { OPS.compare(); return; }
    const b = builderOf(); A.matchOn = on === undefined ? !A.matchOn : on;
    if (A.matchOn) { A.matchSec = b.ref.sec; A.getRes(A.matchSec); H.setLock(b.ref.frame); A.criticT = performance.now() - 2000; toast('WATCHING THE FILM · ' + fmtT(A.matchSec) + ' · DRAG THE WIPE'); say('Matching the film at ' + fmtT(A.matchSec) + '. The critic is scoring your model against the frame.'); }
    else { H.setLock(null); toast('MATCH OFF'); }
  };
  A.matchStep = function (d) { if (!A.matchOn) return; A.matchSec = clamp(A.matchSec + d, 0, D.n - 1); A.getRes(A.matchSec); A.criticT = performance.now() - 2000; };

  // -------------------------------------------------------------------------- DESIGN DRAWER
  let dTimer = 0; const patch = (o, rebuild) => { Object.assign(H.genome, o, { variant: -1 }); clearTimeout(dTimer); dTimer = setTimeout(() => { if (rebuild) { H.rebuild(false); H.select(H.sel, false); } syncRingsToGenome(); }, 220); };
  function swatches(list, cur, key) { return `<div class="sw-row">${list.map((c, i) => `<div class="sw hit${i === cur ? ' on' : ''}" data-k="${key}" data-i="${i}" title="${c[0]}" style="background:${c[1]}"></div>`).join('')}</div>`; }
  function buildDrawer() {
    if (A.mode === 'film') { drawer.innerHTML = ''; return; }
    const g = H.genome;
    if (A.mode === 'cake') {
      const O = A.cakeOptions;
      drawer.innerHTML = `<h5>BIRTHDAY FOR</h5><label>NAME</label><input type="text" id="dName" value="${(g.name || '').replace(/"/g, '&quot;')}" placeholder="whoever it is for" maxlength="24">
      <label>AGE · CANDLES</label><div class="stp"><button data-act="age-">−</button><b id="dAge">${g.age}</b><button data-act="age+">+</button></div>
      <label>INSCRIPTION (2 LINES MAX)</label><textarea id="dText" rows="2" maxlength="40">${g.text}</textarea>
      <h5>MATERIALS</h5><label>SPONGE</label>${swatches(O.SPONGES, g.sponge, 'sponge')}<label>ICING</label>${swatches(O.ICINGS, g.icing, 'icing')}<label>PIPING INK</label>${swatches(O.INKS, g.ink, 'ink')}
      <label>DRIPS</label><input type="range" id="dDrips" min="0" max="100" value="${Math.round(g.drips * 100)}">
      <h5>THE PARTY</h5><label>BALLOONS</label><input type="range" id="dBal" min="0" max="5" value="${g.balloons}"><label>SMARTIES</label><input type="range" id="dSma" min="0" max="36" value="${g.smarties}">
      <div class="drow"><button class="dbtn" id="dSpr">SPRINKLES ${g.sprinkles ? 'ON' : 'OFF'}</button><button class="dbtn" id="dCut">FILM CHILDREN ${g.cutouts ? 'ON' : 'OFF'}</button></div>
      <div class="drow"><button class="dbtn amber" id="dCard">CARD ↓</button><button class="dbtn" id="dLink">LINK</button><button class="dbtn" id="dJson">SPEC</button></div>`;
      $('#dName', drawer).oninput = e => { const t = e.target.value.trim(); g.name = e.target.value; if (t && (/HAPPY BIRTHDAY/.test(g.text) || g.text === '生日快樂')) { g.text = 'HAPPY BIRTHDAY\n' + t.toUpperCase(); $('#dText', drawer).value = g.text; patch({}, true); } else if (!t && /^HAPPY BIRTHDAY\n/.test(g.text)) { g.text = 'HAPPY BIRTHDAY'; $('#dText', drawer).value = g.text; patch({}, true); } };
      $('#dText', drawer).oninput = e => patch({ text: e.target.value }, true);
      drawer.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { const d = b.dataset.act === 'age+' ? 1 : -1; const age = clamp(g.age + d, 1, 30); patch({ age }, true); $('#dAge', drawer).textContent = age; });
      $('#dDrips', drawer).oninput = e => patch({ drips: e.target.value / 100 }, true); $('#dBal', drawer).oninput = e => patch({ balloons: +e.target.value }, true); $('#dSma', drawer).oninput = e => patch({ smarties: +e.target.value }, true);
      $('#dCut', drawer).onclick = e => { const v = g.cutouts ? 0 : 1; patch({ cutouts: v }, true); e.target.textContent = 'FILM CHILDREN ' + (v ? 'ON' : 'OFF'); };
      $('#dSpr', drawer).onclick = e => { const v = g.sprinkles ? 0 : 1; patch({ sprinkles: v }, true); e.target.textContent = 'SPRINKLES ' + (v ? 'ON' : 'OFF'); };
    } else {
      drawer.innerHTML = `<h5>BUG DESIGNER</h5><label>SPECIES</label><input type="text" id="dSp" value="${g.name}" maxlength="30"><label>LENGTH · ${g.mm} MM</label><input type="range" id="dMm" min="4" max="60" value="${g.mm}">
      <label>HABITAT</label><div class="drow" style="margin-top:3px"><button class="dbtn${g.habitat === 'leaf' ? ' amber' : ''}" data-hab="leaf">LEAF</button><button class="dbtn${g.habitat === 'bark' ? ' amber' : ''}" data-hab="bark">BARK</button></div>
      <label>ELYTRA PATTERN</label><input type="range" id="dStr" min="0" max="3" value="${g.stripes}">
      <label>JAW · LEGS · ANTENNAE</label><input type="range" id="dJaw" min="30" max="140" value="${Math.round(g.jaw * 100)}"><input type="range" id="dLeg" min="70" max="140" value="${Math.round(g.leg * 100)}"><input type="range" id="dAnt" min="60" max="150" value="${Math.round(g.ant * 100)}">
      <div class="drow"><button class="dbtn" id="dSplit">${g.split ? 'ASYMMETRIC EYES' : 'SYMMETRIC EYES'}</button></div>
      <div class="drow"><button class="dbtn amber" id="dCard">CARD ↓</button><button class="dbtn" id="dLink">LINK</button><button class="dbtn" id="dJson">SPEC</button></div>`;
      $('#dSp', drawer).oninput = e => { g.name = e.target.value; }; $('#dMm', drawer).oninput = e => { g.mm = +e.target.value; };
      drawer.querySelectorAll('[data-hab]').forEach(b => b.onclick = () => { patch({ habitat: b.dataset.hab }, true); setTimeout(buildDrawer, 300); });
      $('#dStr', drawer).oninput = e => patch({ stripes: +e.target.value }, true); $('#dJaw', drawer).oninput = e => patch({ jaw: e.target.value / 100 }, true); $('#dLeg', drawer).oninput = e => patch({ leg: e.target.value / 100 }, true); $('#dAnt', drawer).oninput = e => patch({ ant: e.target.value / 100 }, true);
      $('#dSplit', drawer).onclick = e => { const v = g.split ? 0 : 1; patch({ split: v }, true); e.target.textContent = v ? 'ASYMMETRIC EYES' : 'SYMMETRIC EYES'; };
    }
    drawer.querySelectorAll('.sw').forEach(s => s.onclick = () => { patch({ [s.dataset.k]: +s.dataset.i }, true); drawer.querySelectorAll(`.sw[data-k="${s.dataset.k}"]`).forEach(x => x.classList.toggle('on', x === s)); });
    $('#dCard', drawer).onclick = () => A.snapshot(); $('#dLink', drawer).onclick = () => A.shareLink(); $('#dJson', drawer).onclick = () => A.downloadSpec();
  }
  A.toggleDrawer = () => { if (A.mode === 'film') { toast('OPEN BUG OR BIRTHDAY TO DESIGN'); return; } drawer.classList.toggle('on'); };

  // -------------------------------------------------------------------------- SNAPSHOT / CARD / LINK
  A.snapshot = function () {
    if (A.mode === 'film') { toast('SNAPSHOT IS FOR BUG / BIRTHDAY'); return; }
    const fl = $('#v5Flash'); fl.style.transition = 'none'; fl.style.opacity = 0.85; requestAnimationFrame(() => { fl.style.transition = 'opacity .6s'; fl.style.opacity = 0; });
    if (A.shutter) A.shutter();
    const b = builderOf(), g = H.genome; const W = 1600, Hh = 900; const c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d');
    const img = H.capture(1040, 585); const pageTint = H.pageTint || '#1a0f08';
    const gr = x.createLinearGradient(0, 0, W, Hh); gr.addColorStop(0, pageTint); gr.addColorStop(1, '#050403'); x.fillStyle = gr; x.fillRect(0, 0, W, Hh);
    x.drawImage(img, 60, 120, 1040, 585); x.strokeStyle = 'rgba(247,236,222,.35)'; x.lineWidth = 1; x.strokeRect(60.5, 120.5, 1040, 585);
    const mono = '"JetBrains Mono","SF Mono",Menlo,monospace'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#f0b050'; x.font = `500 13px ${mono}`; x.fillText(A.mode === 'cake' ? 'STELLINE · BIRTHDAY MEMORY' : 'STELLINE · SPECIMEN PLATE', 60, 70);
    x.fillStyle = '#f3e7d6'; x.font = `500 32px ${mono}`; x.fillText(b.title(g), 60, 106);
    let y = 150; b.spec(g).forEach(([k, v]) => { x.font = `500 12px ${mono}`; x.fillStyle = 'rgba(243,231,214,.45)'; x.fillText(k, 1150, y); x.fillStyle = '#f3e7d6'; x.font = `500 15px ${mono}`; const lines = wrap(String(v), 36); lines.forEach((l, i) => x.fillText(l, 1150, y + 20 + i * 19)); y += 44 + (lines.length - 1) * 19; });
    const ref = D.sec[A.mode === 'cake' ? 154 : 34]; ref.segs.slice().sort((a, b) => b.a - a.a).slice(0, 6).forEach((s, i) => { x.fillStyle = s.rgb; x.fillRect(1150 + i * 56, 780, 48, 14); });
    x.fillStyle = 'rgba(243,231,214,.5)'; x.font = `500 10px ${mono}`; x.fillText('PALETTE OF THE FILM MOMENT THIS WAS BUILT FROM', 1150, 814);
    x.fillText(`SEED ${H.seedName(H.seed)} · ${new Date().toISOString().slice(0, 10)} · DESIGNED ON THE STELLINE MEMORY ORB`, 60, 750); x.fillStyle = 'rgba(243,231,214,.28)'; x.fillText('Anything real should be a mess.', 60, 840);
    c.toBlob(bl => { const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `stelline-${A.mode}-${H.seedName(H.seed)}.png`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); });
    toast('CARD SAVED'); say('Snapshot card saved.'); return c;
  };
  function wrap(text, n) { const out = []; text.split('\n').forEach(seg => { let line = ''; seg.split(' ').forEach(w => { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }); out.push(line); }); return out; }
  A.shareURL = function () { const q = btoa(unescape(encodeURIComponent(JSON.stringify(H.genome)))); return location.origin + location.pathname + '?m=' + A.mode + '&g=' + q; };
  A.shareLink = function () { const u = A.shareURL(); const done = () => toast('LINK COPIED · ANYONE CAN OPEN THIS DESIGN'); if (navigator.clipboard) navigator.clipboard.writeText(u).then(done, () => window.prompt('Copy this link', u)); else window.prompt('Copy this link', u); say('Share link copied.'); };
  A.downloadSpec = function () { const b = builderOf(); const o = { kind: A.mode, seed: H.seed, genome: H.genome, spec: b ? b.spec(H.genome) : [] }; const bl = new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = `stelline-${A.mode}-${H.seedName(H.seed)}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800); toast('SPEC SAVED'); };

  // -------------------------------------------------------------------------- HUD (hairline viewfinder)
  const INK = 'rgba(247,236,222,.9)', DIM = 'rgba(247,236,222,.4)', FAINT = 'rgba(247,236,222,.16)', AMB = '#f0b050';
  const hits = []; let hudTime = 0; let hudDrag = null;
  function addHit(x, y, w, h, fn, id, label) { hits.push({ x, y, w, h, fn, id, label }); }
  function txt(ctx, s, x, y, col, align, size) { ctx.font = `500 ${size || 9.5}px "JetBrains Mono",ui-monospace,monospace`; ctx.fillStyle = col || INK; ctx.textAlign = align || 'left'; ctx.fillText(s, x, y); }
  function brackets(ctx, x, y, s, col) { const L = s * 0.32; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { ctx.moveTo(x + sx * s, y + sy * (s - L)); ctx.lineTo(x + sx * s, y + sy * s); ctx.lineTo(x + sx * (s - L), y + sy * s); }); ctx.stroke(); }
  function furniture(ctx, w, h, t) {
    ctx.save(); let sg = ctx.createLinearGradient(0, 0, 0, 110); sg.addColorStop(0, 'rgba(6,4,3,.62)'); sg.addColorStop(1, 'rgba(6,4,3,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, w, 110); sg = ctx.createLinearGradient(0, h - 120, 0, h); sg.addColorStop(0, 'rgba(6,4,3,0)'); sg.addColorStop(1, 'rgba(6,4,3,.7)'); ctx.fillStyle = sg; ctx.fillRect(0, h - 120, w, 120);
    ctx.strokeStyle = FAINT; ctx.lineWidth = 1; ctx.strokeRect(12.5, 12.5, w - 25, h - 25);
    [[22, 22], [w - 22, 22], [22, h - 22], [w - 22, h - 22]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke(); });
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46;
    ctx.setLineDash([2, 6]); ctx.lineDashOffset = -t * 4; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.72, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(247,236,222,.5)'; ctx.lineWidth = 1.2; [[-2.5, -1.7], [0.2, 0.75], [2.2, 2.8]].forEach(([a, b], i) => { const r = R * (1 - i * 0.12); const rot = Math.sin(t * 0.2 + i) * 0.05; ctx.beginPath(); ctx.arc(cx, cy, r, a + rot, b + rot); ctx.stroke(); });
    ctx.strokeStyle = FAINT; ctx.lineWidth = 1; for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; const l = k % 4 === 0 ? 10 : 5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6)); ctx.lineTo(cx + Math.cos(a) * (R + 6 + l), cy + Math.sin(a) * (R + 6 + l)); ctx.stroke(); }
    ctx.restore();
  }
  function partsList() {
    if (A.mode === 'film') return A.segsRanked().slice(0, 8).map(g => ({ id: g.id, name: `${g.cn} · ${(g.a * 100).toFixed(0)}%`, color: g.rgb, tid: g.tid, sel: A.sel === g.tid }));
    return H.parts.map((p, i) => ({ id: p.id, name: p.name, i, sel: i === H.sel }));
  }
  function bracketStack(ctx, w, h) {
    const list = partsList(); const x = w < 720 ? 30 : Math.max(56, Math.min(130, w * 0.085)); const gap = Math.min(54, (h - 220) / Math.max(1, list.length)); const y0 = h / 2 - (list.length - 1) * gap / 2;
    list.forEach((p, k) => {
      const y = y0 + k * gap;
      if (p.sel) { brackets(ctx, x, y, 17, INK); ctx.fillStyle = p.color || 'rgba(247,236,222,.85)'; ctx.fillRect(x - 8, y - 8, 16, 16); txt(ctx, p.id, x + 32, y - 2, INK, 'left', 10); if (w >= 720) txt(ctx, p.name, x + 32, y + 11, DIM, 'left', 8.5); }
      else { ctx.strokeStyle = 'rgba(247,236,222,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x - 6.5, y - 6.5, 13, 13); if (p.color) { ctx.fillStyle = p.color; ctx.globalAlpha = 0.5; ctx.fillRect(x - 5, y - 5, 10, 10); ctx.globalAlpha = 1; } }
      addHit(x - 22, y - 22, 190, 44, () => { if (A.mode === 'film') A.select(p.tid); else { H.select(p.i); say(`${p.id}. ${p.name}.`); } }, 'part-' + k, p.id + ' ' + p.name);
    });
  }
  function sliderRight(ctx, w, h) {
    const x = w < 720 ? w - 30 : w - 68, y0 = h * 0.30, y1 = h * 0.70;
    ctx.strokeStyle = DIM; ctx.lineWidth = 1; ctx.setLineDash([1.5, 4]); ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.setLineDash([]);
    let val; if (A.mode !== 'film' && H.active) { const span = H.orbit.tDist * 0.8; val = clamp(0.5 - (H.focusBias || 0) / (2 * span), 0, 1); } else val = A.t / D.dur;
    const my = y0 + (y1 - y0) * val; ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + 34, h / 2, 14, 3.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = INK; ctx.fillRect(x - 3, my - 3, 6, 6); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(x - 9, my); ctx.lineTo(x + 9, my); ctx.stroke();
    brackets(ctx, x, y0 - 38, 11, INK); ctx.beginPath(); ctx.moveTo(x - 4, y0 - 38); ctx.lineTo(x + 4, y0 - 38); ctx.moveTo(x, y0 - 42); ctx.lineTo(x, y0 - 34); ctx.stroke();
    brackets(ctx, x, y1 + 38, 11, INK); ctx.beginPath(); ctx.moveTo(x - 4, y1 + 38); ctx.lineTo(x + 4, y1 + 38); ctx.stroke();
    txt(ctx, A.mode === 'film' ? 'TIME' : 'FOCUS', x + 2, y1 + 66, DIM, 'center', 8);
    addHit(x - 20, y0 - 50, 40, 24, () => { if (A.mode === 'film') A.step(1); else H.nudge(0, 0, -0.18); }, 'zoom-in', 'Zoom in');
    addHit(x - 20, y1 + 26, 40, 24, () => { if (A.mode === 'film') A.step(-1); else H.nudge(0, 0, 0.18); }, 'zoom-out', 'Zoom out');
    hits.push({ x: x - 22, y: y0 - 6, w: 44, h: y1 - y0 + 12, slider: { y0, y1 }, id: 'slider', label: 'Focus pull' });
    const ex = w < 720 ? w - 30 : w - 100, ey = w < 720 ? h * 0.9 - 70 : h * 0.78; brackets(ctx, ex, ey, 13, INK); ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(ex, ey + 2, 4.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex, ey + 1, 1.8, 0, 7); ctx.fill();
    addHit(ex - 16, ey - 16, 32, 32, () => A.togglePhoto(), 'photo', 'Photo mode');
  }
  function ringReadouts(ctx, w, h) {
    const b = builderOf(); const act = window.state ? state.activeCoupledRing : -1; const y = h - (A.mode === 'film' ? 100 : 56); let labs, vals; const narrow = w < 720;
    if (A.mode === 'film') { const g = A.sel && A.segByTid(A.sel); const dv = A.dialValues(g ? A.getParams(g.tid) : A.truth); labs = ['L1 SOLID', 'L2 FOCUS', 'L3 MORPH', 'R1 LUMA', 'R2 TINT']; vals = [A.LEVEL_NAMES[Math.round(dv.lvl)], dv.blur > .1 ? 'SOFT ' + dv.blur.toFixed(1) : dv.sharp > .02 ? 'SHARP+' : 'TRUE', '×' + dv.morph.toFixed(1), (Math.log2(dv.gain) >= 0 ? '+' : '') + Math.log2(dv.gain).toFixed(1) + 'EV', dv.temp > .05 ? 'WARM' : dv.temp < -.05 ? 'COOL' : 'TRUE']; }
    else if (b) { labs = b.labels.map(l => l.replace(':', ' ')); vals = [0, 1, 2, 3, 4].map(i => b.readout(H.genome, i)); } else return;
    if (narrow) { const i = act >= 0 ? act : 0; txt(ctx, labs[i], w / 2, y, AMB, 'center', 8); txt(ctx, vals[i], w / 2, y + 13, INK, 'center', 10); return; }
    const span = Math.min(w - 330, 640), x0 = w / 2 - span / 2;
    for (let i = 0; i < 5; i++) { const x = x0 + span * i / 4; const on = act === i; txt(ctx, labs[i], x, y, on ? AMB : DIM, 'center', 8); txt(ctx, vals[i], x, y + 13, on ? AMB : INK, 'center', 10); addHit(x - 46, y - 12, 92, 32, () => { if (window.state) state.activeCoupledRing = i; }, 'ring-' + i, labs[i] + ' ' + vals[i]); }
  }
  function topBlocks(ctx, w, h) {
    const b = builderOf(); const narrow = w < 720; const labels = [['FILM', 'film'], ['BUG', 'bug'], ['BIRTHDAY', 'cake']]; let x = narrow ? 30 : w / 2 - 118;
    labels.forEach(([l, m]) => { const on = A.mode === m; txt(ctx, l, x, 44, on ? INK : DIM, 'left', 10.5); const lw = ctx.measureText(l).width; if (on) { ctx.fillStyle = AMB; ctx.fillRect(x, 50, lw, 1.5); } addHit(x - 6, 30, lw + 12, 26, () => A.setMode(m), 'mode-' + m, l + ' mode'); x += lw + 26; });
    let l1, l2, l3;
    if (A.mode === 'film') { const ch = A.chapterAt(A.t); l1 = 'FOOTAGE-WIDE SEGMENTATION, 407 SECONDS,'; l2 = 'EVERY SECOND SEGMENTED AND RELIEF-MODELLED. '; l3 = `${fmtT(A.t)} · ${ch.name} · SHOT ${D.sec[Math.max(0, A.sec)].shot + 1}/${D.shots.length}`; }
    else if (b) { l1 = b.caption[0]; l2 = b.caption[1] + ' '; l3 = b.title(H.genome) + (H.genome.variant >= 0 ? ' · ' + b.variants[H.genome.variant].code.split('[')[0].trim() : ''); }
    if (!narrow) { txt(ctx, l1, 36, 38, INK, 'left', 9); txt(ctx, l2, 36, 51, INK, 'left', 9); const aw = ctx.measureText(l2).width; txt(ctx, A.mode === 'film' ? 'THE FILM, AS DATA.' : (A.mode === 'cake' ? 'CANDLES SOLD SEPARATELY.' : 'LEGS SOLD SEPARATELY.'), 36 + aw, 51, AMB, 'left', 9); if (l3) txt(ctx, l3, 36, 68, DIM, 'left', 8.5); txt(ctx, (A.mode === 'film' ? 60 : (H.fps || 60)) + ' FPS', w - 36, 28, DIM, 'right', 9); txt(ctx, 'PHOTO MODE ' + (A.photo ? 'ON' : 'OFF'), w - 36, 41, DIM, 'right', 9); addHit(w - 150, 14, 120, 36, () => A.togglePhoto(), 'photo2', 'Photo mode'); }
    else if (l3) txt(ctx, l3, 30, 70, DIM, 'left', 8.5);
    if (A.mode !== 'film') {
      const act = [['REROLL', () => A.reroll()], ['OTHERWISE', () => A.cycleVariant()], ['DESIGN', () => A.toggleDrawer()], [A.matchOn ? 'MATCH ●' : 'MATCH FILM', () => A.toggleMatch()]]; let ax = narrow ? 30 : w / 2 - 118; const ay = narrow ? 92 : 74;
      if (!narrow) { txt(ctx, 'SEED ' + H.seedName(H.seed), ax, 74, DIM, 'left', 8.5); ax += 92; }
      act.forEach(([l, fn]) => { txt(ctx, l, ax, ay, AMB, 'left', 8.5); const ww = ctx.measureText(l).width; ctx.fillStyle = AMB; ctx.globalAlpha = .5; ctx.fillRect(ax, ay + 3, ww, 1); ctx.globalAlpha = 1; addHit(ax - 4, ay - 12, ww + 8, 20, fn, 'act-' + l, l); ax += ww + 18; });
    }
    if (A.critic.last && (A.mode === 'film' || A.matchOn) && !narrow) { const r = A.critic.last; txt(ctx, `CRITIC ${r.fid.toFixed(1)}`, w - 36, 60, AMB, 'right', 9.5); txt(ctx, r.verdict.split('.')[0], w - 36, 73, DIM, 'right', 8); (r.notes || []).slice(0, A.mode === 'film' ? 0 : 3).forEach((n, i) => txt(ctx, '› ' + n.text, w - 36, 86 + i * 12, 'rgba(240,176,80,.8)', 'right', 8)); }
  }
  function bottomBlocks(ctx, w, h) {
    const sound = A.sonic; const pre = w < 720 ? '' : 'STELLINE MEMORY ORB · MADE WITH THREE.JS · ';
    txt(ctx, pre, 36, h - 30, DIM, 'left', 8.5); const bw = ctx.measureText(pre).width; const sl = 'SOUND ' + (sound ? 'ON' : 'OFF');
    txt(ctx, sl, 36 + bw, h - 30, AMB, 'left', 8.5); const sw = ctx.measureText(sl).width; ctx.fillStyle = AMB; ctx.fillRect(36 + bw, h - 27, sw, 1);
    ctx.strokeStyle = DIM; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(36 + bw + sw + 14, h - 33); ctx.lineTo(36 + bw + sw + 62, h - 33); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = INK; ctx.fillRect(36 + bw + sw + 62, h - 36, 6, 6);
    addHit(36 + bw - 4, h - 44, sw + 8, 20, () => A.toggleSonic && A.toggleSonic(), 'sound', 'Sound');
    const label = A.mode === 'film' ? 'COMPARE' : 'SNAPSHOT'; ctx.font = '500 10px "JetBrains Mono",monospace'; const lw = ctx.measureText(label).width; const bx = w - 36 - lw - 18, by = h - 44;
    ctx.strokeStyle = AMB; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx - 4, by - 6); ctx.lineTo(bx - 10, by - 6); ctx.lineTo(bx - 10, by + 16); ctx.lineTo(bx - 4, by + 16); ctx.moveTo(bx + lw + 8, by - 6); ctx.lineTo(bx + lw + 14, by - 6); ctx.lineTo(bx + lw + 14, by + 16); ctx.lineTo(bx + lw + 8, by + 16); ctx.stroke();
    txt(ctx, label, bx, by + 9, INK, 'left', 10); addHit(bx - 12, by - 8, lw + 28, 28, () => { if (A.mode === 'film') OPS.compare(); else A.snapshot(); }, 'snap', label);
  }
  A.togglePhoto = function () { A.photo = !A.photo; drawer.classList.remove('on'); document.body.classList.toggle('photo', A.photo); say('Photo mode ' + (A.photo ? 'on' : 'off')); };

  const hitAt = (x, y) => { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; };
  holo.addEventListener('pointerdown', e => {
    A.hudDown = false; if (!window.state || state.engineVersion !== 'v5') return;
    const r = holo.getBoundingClientRect(); const h = hitAt(e.clientX - r.left, e.clientY - r.top);
    if (h) { A.hudDown = true; e.stopImmediatePropagation(); if (h.slider || h.wipe) { hudDrag = h.wipe ? { wipe: true } : h.slider; setSlider(e.clientY - r.top, e.clientX - r.left); holo.setPointerCapture(e.pointerId); } else h.fn(); }
  }, true);
  holo.addEventListener('pointermove', e => { const r = holo.getBoundingClientRect(); if (hudDrag) { setSlider(e.clientY - r.top, e.clientX - r.left); return; } const h = hitAt(e.clientX - r.left, e.clientY - r.top); holo.style.cursor = h ? 'pointer' : (A.mode === 'film' ? 'crosshair' : 'grab'); });
  holo.addEventListener('pointerup', () => { hudDrag = null; });
  function setSlider(y, x) { const s = hudDrag; if (s.wipe) { A.wipe = clamp(x / holo.clientWidth, 0.05, 0.95); A.criticT = performance.now() - 1800; return; } const v = clamp((y - s.y0) / (s.y1 - s.y0), 0, 1); if (A.mode === 'film') A.seek(v * D.dur); else H.focusBias = (0.5 - v) * 2 * H.orbit.tDist * 0.8; }
  function refreshSR() {
    const sr = $('#v5SR'); const items = [['Film mode', () => A.setMode('film')], ['Bug designer', () => A.setMode('bug')], ['Birthday designer', () => A.setMode('cake')], ['Next part', () => A.selectPart(1)], ['New specimen', () => A.reroll()], ['Otherwise variant', () => A.cycleVariant()], ['Open design drawer', () => A.toggleDrawer()], ['Snapshot card', () => A.snapshot()], ['Copy share link', () => A.shareLink()], ['Read the frame aloud', () => A.readFrame && A.readFrame()], ['Toggle sound', () => A.toggleSonic && A.toggleSonic()], ['Toggle narration', () => A.toggleNarrate && A.toggleNarrate()]];
    sr.innerHTML = ''; items.forEach(([l, fn]) => { const b = document.createElement('button'); b.textContent = l; b.onclick = fn; sr.appendChild(b); });
  }

  // -------------------------------------------------------------------------- FILM OVERLAY (segments)
  const proj = new THREE.Vector3(); let outBuf = new Float32Array(8192);
  function segScreen(seg, W, Hh) { const V = A.V; const morph = A.dialValues(A.getParams(seg.tid)).morph; const z = (seg.rel - 0.5) * V.relief * morph + (seg.rel - 0.5) * V.explode * 6.0; proj.set((seg.cx - 0.5) * 16, (0.5 - seg.cy) * 9, z).project(A.camera); return [(proj.x * 0.5 + 0.5) * W, (-proj.y * 0.5 + 0.5) * Hh]; }
  function drawTag(ctx, x, y, lines, col, W, Hh) {
    ctx.textAlign = 'left'; ctx.font = '500 9.5px "JetBrains Mono",monospace'; const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 14, hh = lines.length * 13 + 8;
    const bx = clamp(x + 26, 200, W - w - 100), by = clamp(y - 34, 90, Hh - hh - 90);
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by + hh / 2); ctx.lineTo(bx + 4, by + hh / 2); ctx.stroke();
    ctx.fillStyle = 'rgba(12,8,5,.78)'; ctx.fillRect(bx, by, w, hh); ctx.strokeRect(bx + .5, by + .5, w, hh);
    lines.forEach((l, i) => { ctx.fillStyle = i === 0 ? col : 'rgba(247,236,222,.78)'; ctx.fillText(l, bx + 7, by + 15 + i * 13); }); ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fillStyle = col; ctx.fill();
  }
  function drawArc(ctx, x, y, ang, truth, labels, col) {
    const R = 34; ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 5; i++) {
      const a0 = -Math.PI / 2 + i * (Math.PI * 2 / 5) + 0.06, a1 = a0 + Math.PI * 2 / 5 - 0.12; const rng = [145, 165, 165, 180, 180][i];
      const dv = clamp((ang[i] % 360 - 20) / rng, 0, 1), tv = clamp((truth[i] - 20) / rng, 0, 1);
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(247,236,222,.14)'; ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.stroke();
      ctx.strokeStyle = state.activeCoupledRing === i ? AMB : col; ctx.beginPath(); ctx.arc(0, 0, R, a0, a0 + (a1 - a0) * dv); ctx.stroke();
      const am = a0 + (a1 - a0) * tv; ctx.lineWidth = 1.4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(Math.cos(am) * (R - 6), Math.sin(am) * (R - 6)); ctx.lineTo(Math.cos(am) * (R + 6), Math.sin(am) * (R + 6)); ctx.stroke();
      const lm = (a0 + a1) / 2; ctx.fillStyle = INK; ctx.font = '500 7px "JetBrains Mono",monospace'; ctx.textAlign = 'center'; ctx.fillText(labels[i], Math.cos(lm) * (R + 15), Math.sin(lm) * (R + 15) + 2.5);
    }
    ctx.restore();
  }
  function filmOverlay(ctx, cw, ch) {
    if (A.sec < 0) return; const S = D.sec[A.sec]; const r = A.getRes(A.sec);
    if (!r.ready) { txt(ctx, 'LOADING FRAME ' + A.sec + '…', cw / 2, ch / 2, DIM, 'center', 10); return; }
    if (A.sec === r.sec) {
      const showAll = A.view !== 'relief' || A.compare;
      S.segs.forEach(g => {
        const isSel = g.tid === A.sel, isHov = g.tid === A.hover; if (!showAll && !isSel && !isHov) return;
        outBuf = A.contourScreen(r, g, cw, ch, outBuf); const n = A.contours(r, g).length;
        ctx.beginPath(); for (let i = 0; i < n; i += 4) { ctx.moveTo(outBuf[i], outBuf[i + 1]); ctx.lineTo(outBuf[i + 2], outBuf[i + 3]); }
        ctx.lineWidth = isSel ? 1.8 : isHov ? 1.4 : 0.7; ctx.strokeStyle = isSel ? 'rgba(247,236,222,.98)' : isHov ? 'rgba(240,176,80,.95)' : 'rgba(247,236,222,.28)'; ctx.stroke();
      });
      const draw = (g, col, full) => { const [sx, sy] = segScreen(g, cw, ch); const dv = A.dialValues(A.getParams(g.tid)); const dev = A.deviation(g.tid); const lines = [`${g.id}`, `${g.cn} · ${(g.a * 100).toFixed(0)}%`, `${A.LEVEL_NAMES[Math.round(dv.lvl)]} · relief ${g.rel.toFixed(2)}${dev > 4 ? ' · OTHERWISE' : ''}${A.compare && A.heat && A.heat[g.tid] != null ? ' · err ' + ((A.heat[g.tid] * 100) | 0) : ''}`]; drawTag(ctx, sx, sy, full ? lines : [lines[0]], col, cw, ch); };
      if (A.hover && A.hover !== A.sel) { const g = A.segByTid(A.hover); if (g) draw(g, AMB, false); }
      if (A.sel) { const g = A.segByTid(A.sel); if (g) { draw(g, 'rgba(247,236,222,.95)', true); const [sx, sy] = segScreen(g, cw, ch); drawArc(ctx, clamp(sx - 70, 260, cw - 260), clamp(sy + 70, 120, ch - 170), A.getParams(g.tid), A.truth, ['SOL', 'FOC', 'MRF', 'LUM', 'TNT'], 'rgba(247,236,222,.9)'); } else A.sel = null; }
      if (A.fitting) txt(ctx, 'THE RINGS ARE FITTING THE FRAME', cw / 2, 100, AMB, 'center', 10);
    }
    if (A.compare) txt(ctx, 'COMPARE · red = where the model disagrees with the frame', cw / 2, 96, AMB, 'center', 9);
  }
  const tl = $('#v5TL'), tx = tl.getContext('2d');
  const strip = D.sec.map(s => { const g = s.segs.slice().sort((a, b) => b.a - a.a)[0]; return g ? g.rgb : '#222'; }); const stripLum = D.sec.map(s => s.luma);
  let tlHover = -1, tlDrag = false;
  function drawTL() {
    const w = tl.clientWidth, h = tl.clientHeight; if (!w) return; const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (tl.width !== (w * dpr | 0) || tl.height !== (h * dpr | 0)) { tl.width = w * dpr | 0; tl.height = h * dpr | 0; }
    tx.setTransform(dpr, 0, 0, dpr, 0, 0); tx.clearRect(0, 0, w, h); const colW = w / D.n;
    for (let s = 0; s < D.n; s++) { tx.fillStyle = strip[s]; tx.globalAlpha = 0.45 + 0.4 * stripLum[s]; tx.fillRect(s * colW, 12, colW + 0.6, h - 12); } tx.globalAlpha = 1;
    tx.fillStyle = 'rgba(247,236,222,.4)'; D.shots.forEach(sh => tx.fillRect(sh[0] / D.dur * w, 12, 1, h - 12));
    tx.font = '500 8px "JetBrains Mono",monospace'; tx.textBaseline = 'top'; D.chapters.forEach(c => { const x = c.t / D.dur * w; tx.fillStyle = 'rgba(240,176,80,.8)'; tx.fillRect(x, 0, 1, h); tx.fillStyle = 'rgba(247,236,222,.8)'; tx.fillText(c.name, x + 4, 1); });
    const px = A.t / D.dur * w; tx.fillStyle = '#fff'; tx.fillRect(px - 1, 0, 2, h);
    if (tlHover >= 0) { const hx = tlHover / D.dur * w; tx.fillStyle = 'rgba(255,255,255,.4)'; tx.fillRect(hx, 0, 1, h); tx.fillStyle = '#fff'; tx.fillText(fmtT(tlHover), Math.min(w - 36, hx + 4), h - 10); }
  }
  const tlSeek = e => { const r = tl.getBoundingClientRect(); A.seek(clamp((e.clientX - r.left) / r.width, 0, 1) * D.dur); };
  tl.addEventListener('pointerdown', e => { tlDrag = true; tl.setPointerCapture(e.pointerId); tlSeek(e); });
  tl.addEventListener('pointermove', e => { const r = tl.getBoundingClientRect(); tlHover = clamp((e.clientX - r.left) / r.width, 0, 1) * D.dur; if (tlDrag) tlSeek(e); });
  tl.addEventListener('pointerup', () => { tlDrag = false; }); tl.addEventListener('pointerleave', () => { tlHover = -1; });

  // -------------------------------------------------------------------------- RENDER HOOK
  window.renderAtlasScene = function (state, holoCanvas, holoCtx) {
    if (state.engineVersion !== 'v5') return;
    const wgl = document.getElementById('webglCanvas'); if (wgl && wgl.style.display !== 'none') wgl.style.display = 'none';
    const heroOn = H && H.active && A.mode !== 'film';
    if (heroOn) H.tick(); else { A.advance(); A.render(false); }
    const ctx = holoCtx, cw = holoCanvas.clientWidth, ch = holoCanvas.clientHeight, k = holoCanvas.width / Math.max(1, cw);
    ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, cw, ch); hudTime += 0.016; hits.length = 0;
    if (heroOn && A.matchOn) {
      const r = A.getRes(A.matchSec); const wx = clamp(A.wipe, 0.05, 0.95) * cw;
      if (r.ready && r.frameImg) { const fw = ch * 16 / 9, fx = cw / 2 - fw / 2; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, wx, ch); ctx.clip(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch); ctx.drawImage(r.frameImg, fx, 0, fw, ch); ctx.restore(); }
      ctx.strokeStyle = AMB; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(wx, 70); ctx.lineTo(wx, ch - 90); ctx.stroke(); ctx.fillStyle = AMB; ctx.beginPath(); ctx.arc(wx, ch / 2, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#120a05'; ctx.fillRect(wx - 1.5, ch / 2 - 3, 1, 6); ctx.fillRect(wx + 0.5, ch / 2 - 3, 1, 6);
      txt(ctx, `THE FILM ${fmtT(A.matchSec)}`, wx - 12, 116, AMB, 'right', 9); txt(ctx, 'YOUR MODEL', wx + 12, 116, AMB, 'left', 9);
      hits.push({ x: wx - 16, y: 90, w: 32, h: ch - 190, wipe: true, id: 'wipe', label: 'Film versus model wipe' });
      if (performance.now() - A.criticT > 2600) { A.criticT = performance.now(); A.critic.runHero(); }
    }
    if (!heroOn && !A.photo) filmOverlay(ctx, cw, ch);
    if (!A.photo) { furniture(ctx, cw, ch, hudTime); bracketStack(ctx, cw, ch); sliderRight(ctx, cw, ch); topBlocks(ctx, cw, ch); bottomBlocks(ctx, cw, ch); ringReadouts(ctx, cw, ch); if (!heroOn) drawTL(); }
    else { txt(ctx, 'PHOTO MODE · click or press X to return', cw / 2, ch - 24, 'rgba(247,236,222,.25)', 'center', 8.5); addHit(0, ch - 60, cw, 60, () => A.togglePhoto(), 'photo-off', 'Leave photo mode'); }
    orbCoupling(state);
  };

  // -------------------------------------------------------------------------- SCENE -> ORB
  let lastScale = null, lastKind = null;
  function orbCoupling(state) {
    if (A.mode !== 'film' && H.active) {
      const m = { studio: [255, 200, 150], amber: [255, 160, 70], forest: [150, 220, 110], dome: [200, 240, 220] }[H.mood] || [255, 200, 150];
      const flick = A.mode === 'cake' ? 0.85 + 0.12 * Math.sin(H.t * 11) : 0.9; state.sceneLightTint = { r: m[0], g: m[1], b: m[2], intensity: 0.55 * flick };
      const sp = A.mode === 'cake' ? 8 + (H.genome.tiers - 1) * 14 : 22 + H.genome.gait * 30; if (lastKind !== A.mode + H.sel && window.setAccordionSpread) { lastKind = A.mode + H.sel; setAccordionSpread(sp, false); }
      document.documentElement.style.setProperty('--page-tint', H.pageTint || '#1a0f08'); return;
    }
    const S = D.sec[Math.max(0, A.sec)]; const g = A.sel ? A.segByTid(A.sel) : null; const big = S.segs.slice().sort((a, b) => b.a - a.a)[0]; const c = A.hexToVec((g || big).rgb);
    const lum = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; const boost = 1 / Math.max(0.35, lum * 1.6);
    state.sceneLightTint = { r: Math.min(255, c[0] * 255 * boost), g: Math.min(255, c[1] * 255 * boost), b: Math.min(255, c[2] * 255 * boost), intensity: 0.45 + 0.4 * S.luma + (g ? 0.15 : 0) };
    if (S.scale !== lastScale) { lastScale = S.scale; const map = { ECU: 8, CU: 16, DETAIL: 20, MS: 34, WS: 58 }; if (window.setAccordionSpread) setAccordionSpread(map[S.scale] || 30, false); }
  }
  window.drawV5OrbStrip = function (ctx, cx, stripY, rOffs) {
    ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(235,244,252,.9)'; ctx.font = '600 6.8px "JetBrains Mono",monospace';
    let title, labs, ang, truth; const b = builderOf();
    if (A.mode !== 'film' && b) { const p = H.parts[H.sel]; title = `${H.kind === 'bug' ? 'BUG.DESIGNER' : 'CAKE.BIRTHDAY'} → ${p ? p.id : 'OVERVIEW'} · ${b.title(H.genome)}`; labs = b.labels.map((l, i) => [l.length > 12 ? l.slice(0, 12) : l, b.readout(H.genome, i)]); ang = b.dials(H.genome); truth = b.filmCanon ? b.dials(b.filmCanon(H.seed)) : ang; }
    else { const g = A.sel ? A.segByTid(A.sel) : null; const dv = A.dialValues(g ? A.getParams(g.tid) : A.truth); ang = g ? A.getParams(g.tid) : A.truth; truth = A.truth;
      title = `${A.chapterAt(A.t).name} → ${g ? `[${A.segsRanked().findIndex(s => s.tid === g.tid) + 1}/${D.sec[A.sec].segs.length}] ${g.id} · ${g.cn}` : 'SELECT A PART'}`;
      labs = [['L1:' + A.LEVEL_NAMES[Math.round(dv.lvl)], ''], ['L2:' + (dv.blur > .1 ? 'SOFT ' + dv.blur.toFixed(1) : dv.sharp > .02 ? 'SHARP+' : 'TRUE'), ''], ['L3:×' + dv.morph.toFixed(1), ''], ['R1:' + (Math.log2(dv.gain) >= 0 ? '+' : '') + Math.log2(dv.gain).toFixed(1) + 'EV', ''], ['R2:' + (dv.temp > .05 ? 'WARM' : dv.temp < -.05 ? 'COOL' : 'TRUE'), '']]; }
    ctx.fillText(title, cx, stripY - 14);
    for (let i = 0; i < 5; i++) {
      const tagX = cx + rOffs[i], active = state.activeCoupledRing === i;
      ctx.fillStyle = active ? 'rgba(240,168,72,.25)' : 'rgba(12,16,22,.8)'; ctx.strokeStyle = active ? 'rgba(240,168,72,.95)' : 'rgba(210,224,238,.38)'; ctx.lineWidth = active ? 1.15 : .8; ctx.fillRect(tagX - 20, stripY - 7, 40, 17); ctx.strokeRect(tagX - 20, stripY - 7, 40, 17);
      ctx.fillStyle = active ? '#ffd080' : 'rgba(225,236,246,.9)'; ctx.font = '700 4.7px "JetBrains Mono",monospace';
      if (A.mode !== 'film' && b) { ctx.fillText(labs[i][0], tagX, stripY - 1.4); ctx.fillStyle = active ? '#fff' : 'rgba(240,176,80,.95)'; ctx.fillText(String(labs[i][1]).slice(0, 13), tagX, stripY + 4.6); } else ctx.fillText(labs[i][0], tagX, stripY - 0.2);
      const gx0 = tagX - 16, gw = 32, gy = stripY + 8; ctx.strokeStyle = 'rgba(210,224,238,.35)'; ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx0 + gw, gy); ctx.stroke();
      const f = a => gx0 + gw * clamp((((a % 360) > 215 ? 0 : a % 360) - 20) / 180, 0, 1);
      ctx.fillStyle = '#fff'; const t0 = f(truth[i]); ctx.beginPath(); ctx.moveTo(t0, gy - 2.2); ctx.lineTo(t0 + 1.8, gy); ctx.lineTo(t0, gy + 2.2); ctx.lineTo(t0 - 1.8, gy); ctx.fill();
      ctx.fillStyle = active ? '#f0a848' : '#38d9c0'; ctx.beginPath(); ctx.arc(f(ang[i]), gy, 1.6, 0, 7); ctx.fill();
    }
    ctx.restore();
  };

  // -------------------------------------------------------------------------- OPERATIONS (orb buttons call these)
  const VIEW_ORDER = ['film', 'parts', 'relief'];
  const OPS = window.V5OPS = {
    imprint() { if (A.mode !== 'film') { A.snapshot(); return; } if (!A.sel) A.cycleSel(1); const it = A.imprint && A.imprint(); if (it) say(`Imprinted ${it.name} to the bearing bin.`); },
    cycleView() { nextMode(); },
    place() { if (A.mode !== 'film') A.toggleMatch(); else A.togglePhoto(); },
    compare() {
      if (A.mode === 'cake') { H.blow(); say(H.blown ? 'Blowing out the candles.' : 'Relit.'); return; }
      if (A.mode === 'bug') { A.xray = !A.xray; H.scene.traverse(n => { if (n.isMesh && n.geometry && n.geometry.type !== 'PlaneGeometry' && n.geometry.type !== 'CircleGeometry') (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { m.wireframe = A.xray; }); }); say(A.xray ? 'Anatomy view.' : 'Surface view.'); return; }
      A.compare = !A.compare || !A.critic.last; if (A.compare) A.critic.run();
    },
    bootstrap() { if (A.mode !== 'film') A.shareLink(); else A.bootstrap(); },
    reset() { if (A.mode !== 'film') A.canon(); else { if (A.sel) { A.params[A.sel] = A.truth.slice(); A.syncRings(); } say('Reset to the film’s truth.'); } },
    step(d) { if (A.mode === 'film') A.step(d); else H.nudge(-d * 0.15, 0, 0); }, shot(d) { A.nextShot(d); },
    chapter(d) { if (A.mode === 'film') A.nextChapter(d); else A.reroll(); },
    selectNext() { A.selectPart(1); },
    scrubDrag(dy) { if (A.mode === 'film') A.seek(A.t + dy * 0.12); else H.focusBias = clamp((H.focusBias || 0) - dy * 0.02, -H.orbit.tDist, H.orbit.tDist); },
    sonic() { A.toggleSonic && A.toggleSonic(); },
    dpad(dx, dy) { if (A.mode !== 'film') { if (Math.abs(dx) >= Math.abs(dy)) H.nudge(-dx * 0.22, 0, 0); else H.nudge(0, 0, dy * 0.1); return; } if (Math.abs(dx) >= Math.abs(dy)) A.step(dx > 0 ? 1 : -1); else A.nextShot(dy > 0 ? 1 : -1); },
    weave() { if (A.mode !== 'film') A.cycleVariant(); else A.weave && A.weave(); },
    fitRing(r) {
      if (A.mode === 'film') { A.fitRing && A.fitRing(r); return; } const b = builderOf(); const c = b.dials(b.filmCanon(H.seed)); const from = b.dials(H.genome)[r]; let k = 0;
      const tm = setInterval(() => { k++; const v = from + (c[r] - from) * Math.min(1, k / 12); state._syncingNode = true; setRingAngle(r, v, true); state._syncingNode = false; b.onDial(r, v); if (k >= 12) { clearInterval(tm); syncRingsToGenome(); } }, 34);
    },
  };
  A.ops = OPS;

  let ringFocus = 0;
  window.addEventListener('keydown', e => {
    if (!window.state || state.engineVersion !== 'v5') return; if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const k = e.key; const handled = () => { e.preventDefault(); e.stopImmediatePropagation(); }; if (window.ensureAudio) ensureAudio();
    const hero = A.mode !== 'film';
    switch (k) {
      case ' ': handled(); if (!hero) A.togglePlay(); else H.overview(); break;
      case 'ArrowLeft': handled(); if (hero) H.nudge(0.12, 0, 0); else (e.shiftKey ? A.nextShot(-1) : A.step(-1)); break;
      case 'ArrowRight': handled(); if (hero) H.nudge(-0.12, 0, 0); else (e.shiftKey ? A.nextShot(1) : A.step(1)); break;
      case '[': handled(); if (hero) H.nudge(0, 0, -0.12); break; case ']': handled(); if (hero) H.nudge(0, 0, 0.12); break;
      case 'PageUp': handled(); if (!hero) A.nextChapter(-1); break; case 'PageDown': handled(); if (!hero) A.nextChapter(1); break;
      case 'Tab': handled(); A.selectPart(e.shiftKey ? -1 : 1); break;
      case '1': case '2': case '3': case '4': case '5': handled(); ringFocus = +k - 1; state.activeCoupledRing = ringFocus; { const b = builderOf(); say(hero && b ? b.labels[ringFocus].replace(':', ' ') + ' ring. ' + b.readout(H.genome, ringFocus) : ['Solid ladder', 'Focus', 'Morph relief', 'Luma', 'Tint'][ringFocus] + ' ring selected.'); } break;
      case 'ArrowUp': case 'ArrowDown': { handled(); const d = (k === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 1.5 : 7); if (hero) { const cur = builderOf().dials(H.genome)[ringFocus]; const v = clamp(cur + d, 20, 200); state._syncingNode = true; setRingAngle(ringFocus, v, true); state._syncingNode = false; builderOf().onDial(ringFocus, v); } else setRingAngle(ringFocus, state.rings[ringFocus].angle + d, true); break; }
      case 'q': case 'Q': handled(); OPS.imprint(); break; case 'w': case 'W': handled(); nextMode(); break;
      case 'e': case 'E': handled(); if (hero) A.reroll(); else OPS.place(); break; case 'r': case 'R': handled(); OPS.compare(); break;
      case 't': case 'T': handled(); if (hero) A.cycleVariant(); else OPS.bootstrap(); break; case 'y': case 'Y': handled(); OPS.reset(); break;
      case 'l': case 'L': handled(); if (hero) A.shareLink(); break; case 'd': case 'D': handled(); A.toggleDrawer(); break;
      case 'x': case 'X': handled(); A.togglePhoto(); break; case 'm': case 'M': handled(); A.toggleMatch(); break;
      case ',': if (A.matchOn) { handled(); A.matchStep(-1); } break; case '.': if (A.matchOn) { handled(); A.matchStep(1); } break; case 'p': case 'P': handled(); OPS.sonic(); break;
      case 'n': case 'N': handled(); A.toggleNarrate && A.toggleNarrate(); break; case 'h': case 'H': handled(); A.readFrame && A.readFrame(); break;
      case 'v': case 'V': handled(); if (!hero) { const i = VIEW_ORDER.indexOf(A.view); A.setView(VIEW_ORDER[(i + 1) % 3]); } break;
      case 'c': case 'C': handled(); if (!hero) OPS.compare(); break; case 'z': case 'Z': handled(); if (!hero) A.weave && A.weave(); break;
      case '?': handled(); $('#v5Help').classList.toggle('on'); break;
      case 'Escape': $('#v5Help').classList.remove('on'); drawer.classList.remove('on'); if (A.photo) A.togglePhoto(); if (!hero) { A.select(null); A.compare = false; } break;
      case 's': case 'S': case 'o': case 'O': handled(); break;
    }
  }, true);

  A.onEngine = v => { document.body.classList.toggle('v5', v === 'v5'); if (window.state) { state.staticMode = v === 'v5'; if (v !== 'v5') state.liveModeling = true; } const c = document.getElementById('atlasCanvas'); if (c) c.style.display = v === 'v5' ? 'block' : 'none'; if (v !== 'v5' && window.resizeCanvases) resizeCanvases(); };
  A.on('select', (seg, quiet) => { if (seg && !quiet && A.mode === 'film') say(describeSeg(seg)); });
  let lastSay = 0; A.on('critic', r => { if (performance.now() - lastSay > 14000) { lastSay = performance.now(); say(`Critic: ${r.fid.toFixed(0)} out of 100. ${r.verdict}` + (r.mode === 'hero' && r.notes.length ? ' ' + r.notes[0].text + '.' : '')); } });
  A.on('dial', () => { if (A.matchOn) A.criticT = performance.now() - 1600; });
  function describeSeg(g) { const depth = g.rel > .66 ? 'near' : g.rel > .4 ? 'mid-distance' : 'far'; const pos = (g.cx < .34 ? 'left' : g.cx > .66 ? 'right' : 'centre') + (g.cy < .34 ? ' top' : g.cy > .66 ? ' bottom' : ''); return `${g.id.replace('.', ' ')}: ${g.cn}, ${depth}, ${pos}, ${(g.a * 100).toFixed(0)} percent of frame.`; }
  A.describeSeg = describeSeg;
  A.on('hero-select', p => { if (p && window.state) state.activeCoupledRing = p.ring; });

  // -------------------------------------------------------------------------- BOOT
  const q = new URLSearchParams(location.search);
  A.seek(parseFloat(q.get('t') || '43')); A.select(A.segsRanked()[0].tid, true); A.setView(q.get('view') || 'film', true);
  if (q.get('video')) A.loadVideo(q.get('video'));
  refreshSR();
  const bootMode = q.get('m') || (q.get('t') || q.get('view') ? 'film' : 'bug');
  document.body.classList.add('film-on');
  if (q.get('g')) { try { const g = JSON.parse(decodeURIComponent(escape(atob(q.get('g'))))); A.setMode(bootMode, { seed: g.seed, genome: g }); } catch (e) { A.setMode('bug'); } }
  else if (bootMode !== 'film') A.setMode(bootMode);
})();
