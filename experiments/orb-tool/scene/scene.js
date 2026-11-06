/* ORB TOOL scene: the renderer that draws the memory state (core/SCHEMA.md) as Ana's memory in the film.
   three.js r128. The look is LOOK (experiments/swarms/shared/look.js: grade, candle warmth, bloom, grain, spot screen) and the
   hologram UI is HOLO (shared/holo.js: the segmented C arc with its stepping mark, the typing readout, the child marks, the round
   spots the memory switches on and off in). The made things are the evolve-all modules (cake, inscription, candles, table) built
   from evolved genomes (scene/genomes.js) and the state; the children are the people module's featureless children (opts.figures 'cutout' uses weaver.html's film cut-outs).
   The places follow weaver.html: the dome (cinema set: dark dome, its seams, the lit line where wall meets floor, the booth),
   the room (the lab: glass, ring lamp, haze cone, dust) and a forest.

   API
     SCENE.mount(canvas, bus, opts) -> handle { ready: Promise, frame(nowMs), resize(), dispose(), stats(), world }
        bus: anything with view() (or state()) and on(event, fn) — the core bus (window.ORB) or a scripted stand-in.
        opts: { quality: 'high'|'mid'|'low', maxDpr, loop (run own requestAnimationFrame), figures: 'faceless' (default: the people module's evolved featureless children) | 'cutout' (weaver.html's film cut-outs; they carry pieces of other cakes and tables),
                preserve (preserveDrawingBuffer, for tests), base (URL the asset paths resolve against) }
     ORB_SCENE.create(container, ORB) -> { frame(nowMs), resize(), dispose() }   (the hook core/SCHEMA.md section 6 asks for)
   Every op has a visible consequence in the next frame: the machine's first step lands at once (core/machine.js), and the
   'change' event adds a flash, an arc step, readout lines or a pulse (see docs/scene.md for the table). */
(function (root) {
  'use strict';
  const SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || (typeof location !== 'undefined' ? location.href : '');
  const url = (rel, base) => new URL(rel, base || SRC).href;
  const DEPS = [['THREE', '../../../ana/assets/three.min.js'], ['LOOK', '../../swarms/shared/look.js'], ['HOLO', '../../swarms/shared/holo.js'],
    ['EVOMOD.cake', '../../swarms/evolve-all/modules/cake.js'], ['EVOMOD.inscription', '../../swarms/evolve-all/modules/inscription.js'],
    ['EVOMOD.candles', '../../swarms/evolve-all/modules/candles.js'], ['EVOMOD.table', '../../swarms/evolve-all/modules/table.js'], ['EVOMOD.people', '../../swarms/evolve-all/modules/people.js'], ['SCENE_GENOMES', 'genomes.js']];
  const REFS = { inscription: '../../swarms/evolve-all/refs/inscription.json', candles: '../../swarms/evolve-all/refs/candles.json' };
  const CUT = '../../../assets/cutouts/';
  const has = path => path.split('.').reduce((o, k) => o && o[k], root);
  const loadScript = u => new Promise((ok, no) => { const s = document.createElement('script'); s.src = u; s.onload = () => ok(true); s.onerror = () => no(new Error('cannot load ' + u)); document.head.appendChild(s); });
  let READY = null; const REF = {};
  function ready(base) {
    return READY || (READY = (async () => {
      for (const [g, p] of DEPS) if (!has(g)) await loadScript(url(p, base));
      await Promise.all(Object.keys(REFS).map(k => fetch(url(REFS[k], base)).then(r => r.ok ? r.json() : null).then(j => { REF[k] = j; }).catch(() => { REF[k] = null; })));
    })());
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, TAU = Math.PI * 2, D2R = Math.PI / 180;
  const ease = (dt, tau) => 1 - Math.exp(-dt / tau);
  const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const TABLE_Y = 0.5; const OWN = new WeakSet();   // textures a part owns (disposed with it)
  const KIDS = [   // weaver.html's cast (film cut-outs, sprite sheets); base = feet relative to the table top, h = height in metres
    { file: 'stelline_child1.webp', frames: 16, fps: 10, h: .56, base: -.1 },
    { file: 'stelline_child2.webp', frames: 16, fps: 10, h: .40, base: .0 },
    { file: 'stelline_child3.webp', frames: 16, fps: 10, h: .66, base: -.14 }];

  /* =================================================================== the world */
  function World(canvas, bus, opts) {
    const T = THREE, M = root.EVOMOD, GN = root.SCENE_GENOMES, H = root.HOLO, L = root.LOOK, CS = root.CORE_STATE, CO = root.CORE_OPS;
    const phone = Math.min(screen.width, screen.height) < 600;
    const Q = opts.quality || (phone ? 'mid' : 'high');
    const R = new T.WebGLRenderer({ canvas, antialias: Q === 'low', alpha: false, preserveDrawingBuffer: !!opts.preserve, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(root.devicePixelRatio || 1, opts.maxDpr || (Q === 'high' ? 2 : Q === 'mid' ? 1.5 : 1)));
    R.toneMapping = T.ACESFilmicToneMapping;
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(36, 1, .02, 60);
    const focus = new T.Vector3(0, .6, 0);
    const LK = L.apply(R, scene, cam, { target: new T.Vector3(0, .58, 0), post: Q !== 'low', shadows: Q === 'high' });
    if (LK.pipeline && Q !== 'high') LK.pipeline.enabled.dof = false;
    const G0 = Object.assign({}, LK.genome);

    /* ---------------------------------------------------------------- places (weaver.html's cinema set and lab, and a forest) */
    const PLACES = { dome: new T.Group(), room: new T.Group(), forest: new T.Group() }; Object.values(PLACES).forEach(g => scene.add(g));
    const basic = (c, o) => new T.MeshBasicMaterial(Object.assign({ color: c, toneMapped: false }, o || {}));
    (function dome(D) {
      D.add(new T.Mesh(new T.SphereGeometry(7, 48, 24, 0, TAU, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0x0b0d0c, roughness: 1, side: T.BackSide })));
      const fl = new T.Mesh(new T.CircleGeometry(7, 72), new T.MeshStandardMaterial({ color: 0x040505, roughness: .7, metalness: 0 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; D.add(fl);
      const ring = (r, w, y, c, o) => { const m = new T.Mesh(new T.TorusGeometry(r, w, 6, 240), basic(c, o)); m.rotation.x = Math.PI / 2; m.position.y = y; D.add(m); return m; };
      ring(6.65, .009, .62, 0xf2f7f3); ring(6.65, .05, .62, 0x9fb4ad, { transparent: true, opacity: .07, depthWrite: false, blending: T.AdditiveBlending }); ring(6.6, .03, .004, 0x8fa39c, { transparent: true, opacity: .035, depthWrite: false, blending: T.AdditiveBlending });
      const seam = new T.LineBasicMaterial({ color: 0x161a18, transparent: true, opacity: .5 });
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, pts = []; for (let j = 0; j <= 20; j++) { const e = .1 + j / 20 * 1.4; pts.push(new T.Vector3(Math.cos(a) * Math.cos(e) * 6.95, Math.sin(e) * 6.95, Math.sin(a) * Math.cos(e) * 6.95)); } D.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), seam)); }
      // the booth at the back: a rounded arch lit from inside, a man standing in it
      const B = new T.Group(); B.position.set(3.4, 0, -5.4); B.scale.setScalar(.62); B.lookAt(0, 0, 0); D.add(B);
      const arch = (w, h, r) => { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - r); s.quadraticCurveTo(-w / 2, h, -w / 2 + r, h); s.lineTo(w / 2 - r, h); s.quadraticCurveTo(w / 2, h, w / 2, h - r); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0); return s; };
      const outer = arch(2.6, 2.3, .55), hole = arch(2.36, 2.16, .45); outer.holes.push(hole);
      const shell = new T.Mesh(new T.ExtrudeGeometry(outer, { depth: 1.8, bevelEnabled: false, curveSegments: 12 }), new T.MeshStandardMaterial({ color: 0xdfe6e2, emissive: 0x9aa59f, emissiveIntensity: .3, roughness: .6, side: T.DoubleSide })); shell.position.z = -1.8; B.add(shell);
      const back = new T.Mesh(new T.ShapeGeometry(hole, 12), basic(0x5f6864, { side: T.DoubleSide })); back.position.z = -1.79; B.add(back);
      const fl2 = new T.Mesh(new T.PlaneGeometry(2.36, 1.8), basic(0x8a938f)); fl2.rotation.x = -Math.PI / 2; fl2.position.set(0, .002, -.9); B.add(fl2);
      const ceil = new T.Mesh(new T.PlaneGeometry(2.0, 1.6), basic(0xf0f6f2)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 2.14, -.9); B.add(ceil);
      const blk = new T.MeshBasicMaterial({ color: 0x020202 }), man = new T.Group();
      [[.16, .24, 1.15, .62], [.21, .19, .42, 1.42]].forEach(([a, b, h, y]) => { const m = new T.Mesh(new T.CylinderGeometry(a, b, h, 16), blk); m.position.y = y; man.add(m); });
      const hd = new T.Mesh(new T.SphereGeometry(.105, 16, 12), blk); hd.position.y = 1.8; hd.scale.y = 1.15; man.add(hd); man.position.set(.15, 0, -1.0); B.add(man);
    })(PLACES.dome);
    let cone = null;
    (function room(D) {
      const conc = new T.MeshStandardMaterial({ color: 0x070807, roughness: .95 });
      const fl = new T.Mesh(new T.CircleGeometry(7, 72), conc); fl.rotation.x = -Math.PI / 2; D.add(fl);
      const glass = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 3, 96, 1, true), new T.MeshStandardMaterial({ color: 0xbfd6d0, transparent: true, opacity: .06, roughness: .05, metalness: .3, side: T.DoubleSide, depthWrite: false })); glass.position.y = 1.5; D.add(glass);
      const mull = new T.MeshStandardMaterial({ color: 0x2a2d2b, roughness: .5, metalness: .6 });
      for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, m = new T.Mesh(new T.BoxGeometry(.018, 3, .018), mull); m.position.set(Math.cos(a) * 2.2, 1.5, Math.sin(a) * 2.2); D.add(m); }
      const band = new T.Mesh(new T.TorusGeometry(2.17, .007, 6, 200), basic(0x9bb5ae, { transparent: true, opacity: .5 })); band.rotation.x = Math.PI / 2; band.position.y = .88; D.add(band);
      const lamp = new T.Mesh(new T.TorusGeometry(.95, .025, 8, 120), basic(0xf4f8ff)); lamp.rotation.x = Math.PI / 2; lamp.position.y = 2.8; D.add(lamp);
      const coneMat = new T.ShaderMaterial({ uniforms: { haze: { value: .5 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
        vertexShader: 'varying float vy; varying vec3 vn; varying vec3 vp; void main(){ vy=uv.y; vn=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vp=mv.xyz; gl_Position=projectionMatrix*mv; }',
        fragmentShader: 'uniform float haze; varying float vy; varying vec3 vn; varying vec3 vp; void main(){ float e=pow(abs(dot(normalize(-vp),vn)),1.6); gl_FragColor=vec4(vec3(.62,.7,.72)*haze*.13*vy*e,1.); }' });
      cone = new T.Mesh(new T.CylinderGeometry(.9, 1.45, 2.7, 48, 1, true), coneMat); cone.position.y = 1.45; D.add(cone);
      const over = new T.SpotLight(0xe6efff, .5, 5.5, .36, .85, 1.4); over.position.set(0, 2.75, 0); over.target.position.set(0, .5, 0); D.add(over, over.target);
    })(PLACES.room);
    (function forest(D) {
      const fl = new T.Mesh(new T.CircleGeometry(9, 64), new T.MeshStandardMaterial({ color: 0x0b0d07, roughness: 1 })); fl.rotation.x = -Math.PI / 2; D.add(fl);
      const bark = new T.MeshStandardMaterial({ color: 0x15130f, roughness: 1 }); let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 46; i++) { const a = r() * TAU, d = 1.6 + r() * 6, h = 5 + r() * 3, w = .05 + r() * .14, m = new T.Mesh(new T.CylinderGeometry(w * .8, w, h, 8), bark); m.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d); m.rotation.z = (r() - .5) * .06; D.add(m); }
      const shaft = new T.Mesh(new T.CylinderGeometry(.25, .9, 6, 24, 1, true), basic(0x9aa894, { transparent: true, opacity: .035, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); shaft.position.set(-.9, 3, -1.8); shaft.rotation.z = .25; D.add(shaft);
    })(PLACES.forest);
    // dust in the light (weaver.html)
    const DUST = Q === 'low' ? 250 : 600, dp = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 1.5; dp[i * 3] = Math.cos(a) * r; dp[i * 3 + 1] = Math.random() * 2.2; dp[i * 3 + 2] = Math.sin(a) * r; dseed[i] = Math.random() * 100; }
    const softTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
    const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dp, 3));
    const dust = new T.Points(dustGeo, new T.PointsMaterial({ color: 0xdfe8e4, map: softTex, size: .008, transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false })); scene.add(dust);

    /* ---------------------------------------------------------------- the memory */
    const MEM = new T.Group(); scene.add(MEM);
    const PIVOT = new T.Group(); MEM.add(PIVOT);              // the cake's tilt pivot; holds the cake and its top (inscription, candles)
    const TOP = new T.Group(); PIVOT.add(TOP);
    const parts = {};                                         // name -> { obj, spots }
    function setPart(name, obj, parent, k) {
      const old = parts[name]; if (old) { old.parent.remove(old.obj); dispose(old.obj); old.spots && old.spots.dispose(); }
      if (!obj) { delete parts[name]; return null; }
      clean(obj); parent.add(obj); const sp = H.spots(obj, { auto: false, k: k == null ? 1 : k, cell: 150 });
      const p = parts[name] = { obj, parent, spots: sp, k: k == null ? 1 : k }; if (off) { sp.set(0); } return p; }
    // a NaN vertex or normal (a stroke caught at almost zero length) would poison the half-float bloom chain and blacken the frame: drop or repair it
    function clean(o) { const bad = []; o.traverse(x => { if (!x.isMesh || !x.geometry || !x.geometry.attributes) return; const P = x.geometry.attributes.position, N = x.geometry.attributes.normal;
        if (P) for (let i = 0; i < P.array.length; i++) if (!isFinite(P.array[i])) { bad.push(x); return; }
        if (N) { let fix = false; for (let i = 0; i < N.array.length; i += 3) if (!isFinite(N.array[i]) || !isFinite(N.array[i + 1]) || !isFinite(N.array[i + 2])) { N.array[i] = 0; N.array[i + 1] = 1; N.array[i + 2] = 0; fix = true; } if (fix) N.needsUpdate = true; } });
      bad.forEach(x => x.parent && x.parent.remove(x)); return bad.length; }
    function dispose(o) { o.traverse(x => { if (x.geometry) x.geometry.dispose(); const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; ms.forEach(m => { if (m.map && OWN.has(m.map)) m.map.dispose(); m.dispose(); }); }); }
    const flash = name => { const p = parts[name]; if (p && p.spots) p.spots.flash(); };
    const flashAll = () => Object.keys(parts).forEach(flash);

    // the cake: evolve-all cake module; form, colours, size and layers from the state, finish from the evolved genome
    const cakeGenome = g => GN.cakeGenes(M.cake, g);
    const STAGE_T = GN.STAGE_T;
    const C = { key: '', G: null, s: 1, t: 0, tWant: 0, topY: .1, R: .12, tilt: 0 };
    function rebuildCake(g) { C.G = cakeGenome(g); C.s = g.radius / M.cake.R0; C.R = g.radius; const obj = M.cake.build(T, C.G, { t: Math.max(.001, C.t) });
      obj.scale.setScalar(C.s); obj.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } }); setPart('cake', obj, PIVOT);
      C.topY = M.cake.topY(C.G, 0) * C.s; C.h = C.topY; }

    // the inscription: the module writes 生日快乐 and the flourish stroke by stroke; any other text is piped from a font, left to right
    const I = { text: null, w: -1, wShown: 0 };
    function buildInscription(text, f) {
      if (text === '生日快乐' && REF.inscription) { const g = M.inscription.build(T, GN.arr(M.inscription, GN.G.inscription), { t: f, refs: REF.inscription }); g.scale.setScalar(C.s); g.position.y = .0042 * C.s; return g; }   // lifted onto the cake module's top coat (3 mm) and its ripples
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192; const x = cv.getContext('2d'); const chars = [...text], n = chars.length || 1;
      x.font = '700 120px "PingFang SC","Noto Sans CJK SC","Helvetica Neue",Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const full = x.measureText(text).width, sc = Math.min(1, 480 / Math.max(1, full)); x.save(); x.beginPath(); x.rect(0, 0, 256 - full * sc / 2 + full * sc * f, 192); x.clip();
      x.translate(256, 96); x.scale(sc, sc); x.lineWidth = 9; x.lineJoin = 'round'; x.strokeStyle = 'rgb(190,121,48)'; x.strokeText(text, 0, 0); x.restore();
      const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; OWN.add(tex);
      const m = new T.Mesh(new T.PlaneGeometry(.16, .06), new T.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .1, roughness: .4 })); m.rotation.x = -Math.PI / 2; m.position.y = .002; m.scale.setScalar(C.s);
      const g = new T.Group(); g.add(m); void n; return g; }

    // the candles: the module's evolved candles and layout; the first `count - lit` are out (the blow puts them out one by one as the machine steps lit down)
    const K = { key: '', count: -1, lit: -1, flames: [] };
    function buildCandles(count, lit) {
      if (!count || !REF.candles) return null; const g = GN.arr(M.candles, Object.assign({}, GN.G.candles, { count }));
      const obj = M.candles.build(T, g, { t: 1, blown: count - lit, refs: REF.candles }); obj.scale.setScalar(C.s); return obj; }
    // smoke from a candle that has gone out
    const SMOKE = []; const smokeMat = new T.SpriteMaterial({ map: softTex, color: 0xb9b2a8, transparent: true, opacity: 0, depthWrite: false });
    function smoke(at) { for (let j = 0; j < 3; j++) { const s = new T.Sprite(smokeMat.clone()); s.position.copy(at); s.scale.setScalar(.012); scene.add(s); SMOKE.push({ s, t: -j * .18, x: (Math.random() - .5) * .01 }); } }

    // the table: the module's evolved hexagonal table; table.up 0/1 raises it (its making: legs rise, the top comes down, colour)
    const TB = { up: -1, t: 0, want: 0, built: -1 };
    function buildTable(t) { const g = GN.arr(M.table, GN.G.table), top = M.table.top(g); const obj = M.table.build(T, g, { t: Math.max(.001, t) }); obj.position.y = TABLE_Y - top.y; obj.traverse(x => { if (x.isMesh) x.receiveShadow = true; }); return obj; }

    // the children: film cut-outs (weaver.html), lit by the candles; arrived 0..10 is how far she has come in (round spots), offset = frame offset of her performance
    const KIDTEX = opts.figures !== 'cutout' ? [] : KIDS.map(k => { const t = new T.TextureLoader().load(url(CUT + k.file, opts.base), tt => { k.aspect = tt.image.width / k.frames / tt.image.height; }); t.encoding = T.sRGBEncoding; t.repeat.set(1 / k.frames, 1); return t; });
    const PEOPLE = {};   // id -> { obj, mesh, tex, kid, spots, mark, head, a }
    function personObj(p, i) {
      const kid = KIDS[i % KIDS.length], grp = new T.Group(), head = new T.Object3D(); let mesh, tex = null;
      if (opts.figures !== 'cutout') {   // the people module's evolved children (fit 0.996): soft rounded forms, no features, hair masses, hands on the table edge
        const PG = GN.arr(M.people, Object.assign({}, GN.G.people, { count: 5 })), k = i % 5, q = M.people.pose(PG, {}).P[k], sc = TABLE_Y / M.people.DEFAULT_SUPPORT.y;
        const all = M.people.build(T, PG, { t: 1, stagger: false }), child = all.getObjectByName('child' + k); all.remove(child); dispose(all);
        mesh = new T.Group(); mesh.add(child); mesh.scale.setScalar(sc); mesh.position.set(-q.foot[0] * sc, 0, -q.foot[2] * sc); mesh.userData.face0 = Math.atan2(q.fwd[0], q.fwd[1]);
        child.traverse(x => { if (x.isMesh) x.castShadow = true; }); head.position.set(q.head[0], q.head[1] + q.hd * .7, q.head[2]); mesh.add(head); }
      else { tex = KIDTEX[i % KIDS.length].clone(); if (tex.image) tex.needsUpdate = true; OWN.add(tex);
        mesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffd4a6, emissiveIntensity: .14, color: 0xfff2e2, roughness: .66, transparent: true, alphaTest: .06, side: T.DoubleSide }));
        head.position.y = TABLE_Y + kid.base + kid.h * .86; }
      if (!head.parent) grp.add(head); grp.add(mesh); grp.position.set(p.x, 0, p.z); MEM.add(grp);
      const mark = H.childMark(scene, head, { camera: cam, auto: false, size: .05 });
      return { obj: grp, mesh, tex, kid, head, mark, spots: H.spots(grp, { auto: false, k: 0, cell: 150 }), a: 0 }; }

    // props: plain things on the table or the floor
    const PROPS = {};
    function propObj(p) { const g = new T.Group(), k = String(p.kind || 'box').toLowerCase(), mat = c => new T.MeshStandardMaterial({ color: c, roughness: .6 });
      if (/cup|mug|glass/.test(k)) { const m = new T.Mesh(new T.CylinderGeometry(.03, .025, .07, 18, 1, true), mat(0xe8e2d6)); m.material.side = T.DoubleSide; m.position.y = .035; g.add(m); }
      else if (/plate|dish/.test(k)) { const m = new T.Mesh(new T.CylinderGeometry(.08, .07, .008, 32), mat(0xefe9df)); m.position.y = .004; g.add(m); }
      else if (/balloon/.test(k)) { const m = new T.Mesh(new T.SphereGeometry(.1, 20, 16), mat(0xb3412a)); m.scale.y = 1.2; m.position.y = .9; g.add(m); const st = new T.Mesh(new T.CylinderGeometry(.001, .001, .78, 4), mat(0xdddddd)); st.position.y = .4; g.add(st); }
      else if (/hat/.test(k)) { const m = new T.Mesh(new T.ConeGeometry(.04, .11, 18), mat(0x5a7fb0)); m.position.y = .055; g.add(m); }
      else if (/gift|present/.test(k)) { const m = new T.Mesh(new T.BoxGeometry(.09, .07, .09), mat(0x8c2a24)); m.position.y = .035; g.add(m); const rb = new T.Mesh(new T.BoxGeometry(.092, .072, .015), mat(0xe8d6a0)); rb.position.y = .035; g.add(rb); }
      else { const m = new T.Mesh(new T.BoxGeometry(.07, .07, .07), mat(0x9a8f80)); m.position.y = .035; g.add(m); }
      MEM.add(g); return { obj: g, spots: H.spots(g, { auto: false, k: 0, cell: 150 }) }; }

    /* ---------------------------------------------------------------- the hologram UI: arc and readout beside the selected thing */
    const ANCH = new T.Object3D(); scene.add(ANCH); const anchWant = new T.Vector3(0, .7, 0); ANCH.position.copy(anchWant);
    const arc = H.arc(scene, ANCH, { camera: cam, auto: false, size: .13, side: 1 }), readout = H.readout(scene, ANCH, { camera: cam, auto: false, size: .13, side: 1, seed: 11 });
    let arcI = 0;
    // the pulse: a thin ring of light spreading on the table from the thing an op touched
    const PULSES = []; const pulseGeo = new T.RingGeometry(.96, 1, 96);
    function pulse(at, r) { const m = new T.Mesh(pulseGeo, new T.MeshBasicMaterial({ color: 0xdfe9e4, transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.copy(at); m.userData.r = r || .14; scene.add(m); PULSES.push({ m, t: 0 }); }

    /* ---------------------------------------------------------------- ghosts: a proposal drawn as what it would make, pale and flickering, until accepted or rejected */
    const GHOST = new T.Group(); scene.add(GHOST); let ghostKey = '';
    const ghostMat = new T.MeshBasicMaterial({ color: 0xa8dcff, transparent: true, opacity: .26, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
    const ghostWire = new T.MeshBasicMaterial({ color: 0xd4f0ff, wireframe: true, transparent: true, opacity: .1, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    function ghostify(o, tint) { const out = new T.Group(); o.updateMatrixWorld(true);
      o.traverse(x => { if (!x.isMesh || !x.visible) return; const m1 = x.isInstancedMesh ? new T.InstancedMesh(x.geometry, ghostMat, x.count) : new T.Mesh(x.geometry, tint ? ghostMat.clone() : ghostMat);
        if (x.isInstancedMesh) { m1.instanceMatrix.copy(x.instanceMatrix); } if (tint && m1.material !== ghostMat) m1.material.color.set(tint).lerp(new T.Color(0xa8dcff), .45);
        m1.matrixAutoUpdate = false; m1.matrix.copy(x.matrixWorld); out.add(m1);
        if (!x.isInstancedMesh && x.geometry.attributes.position.count < 6000) { const w = new T.Mesh(x.geometry, ghostWire); w.matrixAutoUpdate = false; w.matrix.copy(x.matrixWorld); out.add(w); } });
      return out; }
    function label(text) { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const x = c.getContext('2d'); x.font = '500 26px "Helvetica Neue",Arial,sans-serif'; x.fillStyle = 'rgba(200,232,255,.92)'; x.fillText(text.slice(0, 40), 6, 40);
      const t = new T.CanvasTexture(c); OWN.add(t); const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); s.scale.set(.24, .03, 1); s.renderOrder = 7; return s; }
    function buildGhosts(v) {
      GHOST.children.slice().forEach(c => { GHOST.remove(c); c.traverse(x => { if (x.material && x.material !== ghostMat && x.material !== ghostWire) { if (x.material.map && OWN.has(x.material.map)) x.material.map.dispose(); x.material.dispose(); } if (x.isMesh && x.parent && x.userData.ownGeo) x.geometry.dispose(); }); });
      (v.proposals || []).forEach((p, pi) => {
        let trial = null; if (CO && CS) { trial = CS.clone(v); try { if (CO.OPS[p.op](trial, CS.clone(p.args || {}), { author: p.author })) trial = null; } catch (e) { trial = null; } }
        const g = new T.Group(); GHOST.add(g); const at = new T.Vector3(0, TABLE_Y + C.topY + .16 + pi * .04, 0);
        const lab = label((p.author || 'agent').replace(/^agent:/, '') + ': ' + (CO ? CO.label(p.op, p.args) : p.op) + (p.note ? ' (' + p.note + ')' : '')); g.add(lab);
        if (!trial) { lab.position.copy(at); return; }
        const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        PIVOT.updateMatrixWorld(true);
        if (!same(trial.cake, v.cake)) { const gg = trial.cake.genome, G2 = cakeGenome(gg), s2 = gg.radius / M.cake.R0, tmp = M.cake.build(T, G2, { t: STAGE_T[trial.cake.stage] || .001 }); tmp.scale.setScalar(s2);
          const piv = new T.Group(); piv.position.copy(PIVOT.position); piv.quaternion.copy(tiltQ(trial.cake.tilt)); piv.add(tmp); piv.updateMatrixWorld(true); g.add(ghostify(tmp, gg.top)); tmp.traverse(x => { if (x.geometry) x.userData.ownGeo = true; }); }
        if (!same(trial.candles, v.candles) && trial.candles.count) { const tmp = buildCandles(trial.candles.count, trial.candles.count); if (tmp) { TOP.add(tmp); g.add(ghostify(tmp)); TOP.remove(tmp); } }
        if (!same(trial.inscription, v.inscription)) { const tmp = buildInscription(trial.inscription.text, trial.inscription.written / 24); TOP.add(tmp); g.add(ghostify(tmp)); TOP.remove(tmp); }
        if (trial.table.up && !v.table.up) { const tmp = buildTable(1); MEM.add(tmp); g.add(ghostify(tmp)); MEM.remove(tmp); }
        trial.people.forEach((q, i) => { const o = (v.people || []).find(x => x.id === q.id); if (o && same(o, q)) return;
          const body = new T.Mesh(new T.CylinderGeometry(.08, .11, .62, 16, 1, true), ghostMat), hd = new T.Mesh(new T.SphereGeometry(.07, 16, 12), ghostMat); body.userData.ownGeo = hd.userData.ownGeo = true;
          body.position.set(q.x, .31 + .03 * q.arrived / 10, q.z); hd.position.set(q.x, .72, q.z); g.add(body, hd); });
        trial.props.forEach(q => { const o = (v.props || []).find(x => x.id === q.id); if (o && same(o, q)) return; const tmp = propObj(q); MEM.remove(tmp.obj); tmp.obj.position.set(q.x, TABLE_Y, q.z); tmp.obj.scale.setScalar(q.scale); g.add(ghostify(tmp.obj)); });
        if (!same(trial.camera, v.camera)) { const e = eyeFor(trial.camera, focusFor(trial)), eye = new T.Mesh(new T.SphereGeometry(.03, 12, 8), ghostMat); eye.position.copy(e); g.add(eye);
          const line = new T.Line(new T.BufferGeometry().setFromPoints([e, focusFor(trial)]), new T.LineBasicMaterial({ color: 0xa8dcff, transparent: true, opacity: .5, toneMapped: false })); g.add(line); }
        if (trial.selection !== v.selection) { const w = new T.Mesh(new T.TorusGeometry(.05, .002, 4, 48, Math.PI * 1.4), ghostMat); w.position.copy(anchorFor(trial)); w.userData.billboard = true; g.add(w); }
        lab.position.copy(at); });
    }

    /* ---------------------------------------------------------------- camera: Ana kneeling around the memory */
    function focusFor(v) { const f = v.camera.focus; if (f === 'cake' || !f) return new T.Vector3(0, TABLE_Y + Math.min(.08, (C.topY || .1) * .6), 0);
      const p = (v.people || []).find(q => q.id === f); if (p) return new T.Vector3(p.x, TABLE_Y + .25, p.z); const q = (v.props || []).find(q => q.id === f); if (q) return new T.Vector3(q.x, TABLE_Y + .05, q.z); return new T.Vector3(0, TABLE_Y + .06, 0); }
    let aspect = 1;
    function eyeFor(c, f, yawDeg) { const yaw = (yawDeg == null ? c.yaw : yawDeg) * D2R, kn = c.kneel / 10, eyeY = lerp(1.32, .58, kn);
      const hf = 2 * Math.atan(Math.tan(cam.fov * D2R / 2) * aspect), D = clamp(.4 / Math.tan(hf / 2), .95, 2.4) * lerp(1.08, .95, kn);
      return new T.Vector3(f.x + Math.sin(yaw) * D, eyeY, f.z + Math.cos(yaw) * D); }
    const tiltAxis = new T.Vector3(1, 0, 0);
    function tiltQ(tilt) { return new T.Quaternion().setFromAxisAngle(tiltAxis, tilt * 3 * D2R); }
    function anchorFor(v) { const s = v.selection; if (/^child-/.test(s)) { const P = PEOPLE[s]; if (P) return P.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .02, 0)); }
      if (s === 'room') return new T.Vector3(0, TABLE_Y + .34, 0);
      return new T.Vector3(0, TABLE_Y + (C.topY || .08) + (s === 'candles' ? .07 : .05), 0); }

    /* ---------------------------------------------------------------- state -> scene, every frame */
    let off = false, offK = 1, held = false, clock = 0, lastNow = 0, look = 'film', place = '', lightLv = -1, yawCur = null, eyeCur = null, focusCur = focus.clone();
    const holoMat = new T.ShaderMaterial({ uniforms: { t: { value: 0 } }, transparent: true, blending: T.AdditiveBlending, depthWrite: false,
      vertexShader: 'varying vec3 vn; varying vec3 vp; varying vec3 wp; void main(){ vn=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vp=mv.xyz; wp=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform float t; varying vec3 vn; varying vec3 vp; varying vec3 wp; void main(){ float f=pow(1.-abs(dot(normalize(-vp),vn)),2.2); float s=.6+.4*sin(wp.y*520.-t*5.); gl_FragColor=vec4(vec3(.45,.95,.88)*f*s*1.2+vec3(.03,.06,.06),1.); }' });
    let prevV = null;
    function sync(v, dt) {
      // place, light, look
      if (v.scene.place !== place) { place = v.scene.place; Object.keys(PLACES).forEach(k => PLACES[k].visible = k === place); scene.fog.density = place === 'forest' ? .16 : place === 'room' ? .07 : .05; }
      if (v.scene.light !== lightLv) { lightLv = v.scene.light; const f = .35 + .11 * lightLv; LK.set({ exposure: G0.exposure * f, keyIntensity: G0.keyIntensity * (.4 + .1 * lightLv), candleIntensity: G0.candleIntensity * (.6 + .07 * lightLv) }); R.toneMappingExposure = 1.1 * f; }
      look = v.scene.look;
      // the cake
      const ck = JSON.stringify(v.cake.genome); if (ck !== C.key) { const first = !C.key; C.key = ck; rebuildCake(v.cake.genome); I.text = null; K.key = ''; if (!first) flash('cake'); }
      C.tWant = STAGE_T[clamp(Math.round(v.cake.stage), 0, 4)];
      if (Math.abs(C.t - C.tWant) > 1e-4) { const sp = dt / .9 * (STAGE_T[1] - STAGE_T[0]) * 1.6; C.t = C.t < C.tWant ? Math.min(C.tWant, C.t + Math.max(sp, (C.tWant - C.t) * ease(dt, .5))) : Math.max(C.tWant, C.t - Math.max(sp, (C.t - C.tWant) * ease(dt, .3)));
        const o = parts.cake && parts.cake.obj; if (o && o.userData.setT) { o.userData.setT(Math.max(.001, C.t)); clean(o); if (parts.cake.spots) parts.cake.spots.each && parts.cake.spots.each(); } }
      PIVOT.position.set(0, TABLE_Y + C.h / 2, 0); TOP.position.set(0, C.topY - C.h / 2, 0); if (parts.cake) parts.cake.obj.position.y = -C.h / 2;
      C.tilt = lerp(C.tilt, v.cake.tilt, ease(dt, .12)); PIVOT.quaternion.copy(tiltQ(C.tilt));
      // the inscription
      const wt = v.inscription.written / 24; I.wShown = Math.abs(I.wShown - wt) < .004 ? wt : lerp(I.wShown, wt, ease(dt, .06));
      if (I.text !== v.inscription.text || Math.abs(I.w - I.wShown) > .003) { I.text = v.inscription.text; I.w = I.wShown; setPart('inscription', I.w > .001 ? buildInscription(I.text, I.w) : null, TOP); }
      // the candles
      const kk = v.candles.count + ':' + v.candles.lit + ':' + C.key; if (kk !== K.key) { const before = K.lit, cnt = K.count; K.key = kk; K.count = v.candles.count; K.lit = v.candles.lit;
        const obj = buildCandles(K.count, K.lit); setPart('candles', obj, TOP); K.flames = []; if (obj) obj.traverse(x => { if (/^flame\d+$/.test(x.name)) K.flames.push(x); });
        if (obj && before > K.lit && cnt === K.count) { obj.updateMatrixWorld(true); for (let k = cnt - before; k < cnt - K.lit; k++) { const c = obj.getObjectByName('candle' + k); if (c) smoke(c.localToWorld(new T.Vector3(0, .06, 0))); } }
        LK.setCandles(K.flames); }
      LK.candlesLit(K.count ? (K.flames.length / Math.max(1, K.count)) * .85 + .15 : .12);
      // the table
      if (v.table.up !== TB.up) { TB.up = v.table.up; TB.want = TB.up ? 1 : 0; }
      if (Math.abs(TB.t - TB.want) > 1e-3 || TB.built < 0) { TB.t = TB.t < TB.want ? Math.min(TB.want, TB.t + dt / .8) : Math.max(TB.want, TB.t - dt / .5); if (Math.abs(TB.built - TB.t) > .02 || TB.t === TB.want) { TB.built = TB.t; setPart('table', TB.t > .002 ? buildTable(TB.t) : null, MEM); } }
      // the children
      const ids = new Set();
      (v.people || []).forEach((p, i) => { ids.add(p.id); let P = PEOPLE[p.id]; if (!P) { P = PEOPLE[p.id] = personObj(p, i); if (off) P.spots.set(0); }
        P.obj.position.x = lerp(P.obj.position.x, p.x, ease(dt, .1)); P.obj.position.z = lerp(P.obj.position.z, p.z, ease(dt, .1));
        const a = p.arrived / 10; P.a = a; P.spots.set(off ? 0 : a * offK); P.mark.show(a === 0 ? .01 : a); P.mark.alpha = off ? 0 : P.mark.alpha;
        if (P.tex && !P.tex.image) { const src = KIDTEX[i % KIDS.length]; if (src.image) { P.tex.image = src.image; P.tex.needsUpdate = true; } }
        if (P.tex) { const k = P.kid, fi = ((Math.floor(clock * k.fps) + p.offset + i * 5) % k.frames + k.frames) % k.frames; P.tex.offset.x = fi / k.frames; P.mesh.scale.set(k.h * (k.aspect || .7), k.h, 1); P.mesh.position.y = TABLE_Y + k.base + k.h / 2; }
        if (P.tex) P.mesh.rotation.y = Math.atan2(cam.position.x - P.obj.position.x, cam.position.z - P.obj.position.z); else P.obj.rotation.y = Math.atan2(-P.obj.position.x, -P.obj.position.z) - P.mesh.userData.face0; });
      Object.keys(PEOPLE).forEach(id => { if (!ids.has(id)) { const P = PEOPLE[id]; MEM.remove(P.obj); dispose(P.obj); P.mark.dispose(); P.spots.dispose(); delete PEOPLE[id]; } });
      // props
      const pids = new Set();
      (v.props || []).forEach(p => { pids.add(p.id); let P = PROPS[p.id]; if (!P || P.kind !== p.kind) { if (P) { MEM.remove(P.obj); dispose(P.obj); } P = PROPS[p.id] = propObj(p); P.kind = p.kind; P.k = 0; P.obj.position.set(p.x, 0, p.z); }
        P.k = Math.min(1, P.k + dt / .6); P.spots.set(off ? 0 : P.k * offK); const onT = TB.t > .5 && Math.hypot(p.x, p.z) < .34;
        P.obj.position.set(lerp(P.obj.position.x, p.x, ease(dt, .1)), lerp(P.obj.position.y, onT ? TABLE_Y : 0, ease(dt, .1)), lerp(P.obj.position.z, p.z, ease(dt, .1))); P.obj.scale.setScalar(lerp(P.obj.scale.x || 1, p.scale, ease(dt, .1))); });
      Object.keys(PROPS).forEach(id => { if (!pids.has(id)) { MEM.remove(PROPS[id].obj); dispose(PROPS[id].obj); delete PROPS[id]; } });
      // time: hold, off
      held = !!v.time.hold;
      if (!!v.time.off !== off) { off = !!v.time.off; const o = new T.Vector3(0, TABLE_Y, 0);
        Object.values(parts).forEach(p => p.spots && (off ? p.spots.off(1.4, { origin: o }) : p.spots.on(.8)));
        if (off) arc.off(.9); else { arc.show(true); } }
      offK = off ? Math.max(0, offK - dt / 1.2) : Math.min(1, offK + dt / .8);
      // the selection: arc and readout move beside it
      anchWant.copy(anchorFor(v)); ANCH.position.lerp(anchWant, ease(dt, .08));
      // proposals
      const gk = JSON.stringify(v.proposals || []) + '|' + C.key + '|' + K.key; if (gk !== ghostKey) { ghostKey = gk; buildGhosts(v); }
      // camera
      const f = focusFor(v); focusCur.lerp(f, ease(dt, .12)); if (yawCur == null) yawCur = v.camera.yaw; let dy = v.camera.yaw - yawCur; dy = ((dy + 540) % 360) - 180; yawCur += dy * ease(dt, .07);
      const e = eyeFor(v.camera, focusCur, yawCur); if (!eyeCur) eyeCur = e.clone(); eyeCur.lerp(e, ease(dt, .07)); cam.position.copy(eyeCur); cam.lookAt(focusCur);
      tiltAxis.set(1, 0, 0).applyQuaternion(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yawCur * D2R));
      prevV = v;
    }

    /* ---------------------------------------------------------------- op consequences (the 'change' event) */
    const CAKE_AT = () => new T.Vector3(0, TABLE_Y + .002, 0);
    function consequence(entry) {
      if (!entry) { flashAll(); return; }
      const op = entry.op, a = entry.args || {}, path = a.path || '';
      arc.step(arcI = (arcI + 1) % 5); readout.type(op === 'batch' ? 3 : 1);
      if (op === 'select') { pulse(new T.Vector3(anchWant.x, TABLE_Y + .002, anchWant.z), .06); const s = prevV && prevV.selection; flash(/^child-/.test(s) ? null : s === 'inscription' ? 'inscription' : s === 'candles' ? 'candles' : 'cake'); }
      else if (op === 'make' || /cake\.stage/.test(path)) pulse(CAKE_AT(), (C.R || .12) * 1.2);
      else if (op === 'breed' || op === 'keep' || /cake\.(kind|genome)/.test(path)) { flash('cake'); pulse(CAKE_AT(), (C.R || .12) * 1.4); }
      else if (op === 'write' || /inscription/.test(path)) flash('cake');
      else if (op === 'candles' || /candles/.test(path)) flash('candles');
      else if (op === 'blow' || op === 'release' || op === 'hold') pulse(CAKE_AT(), .3);
      else if (op === 'add' || op === 'remove') pulse(new T.Vector3(a.x == null ? 0 : a.x, .002, a.z == null ? -.4 : a.z), .1);
      else if (op === 'accept' || op === 'snapshot' || op === 'load' || op === 'reset' || op === 'batch') { flashAll(); pulse(CAKE_AT(), .45); }
      else if (op === 'reject' || op === 'propose' || op === 'amend') pulse(new T.Vector3(0, TABLE_Y + (C.topY || .1) + .1, 0), .08);
      else if (op === 'look' || /scene\./.test(path)) pulse(new T.Vector3(0, .003, 0), .8);
      else if (op === 'undo' || op === 'redo') flashAll();
    }
    const offs = [];
    if (bus.on) {
      offs.push(bus.on('change', (s, entry) => { dirty = true; consequence(entry); }));
      offs.push(bus.on('step', () => { readout.feed(5); }));
      offs.push(bus.on('seek', () => { flashAll(); readout.type(1); }));
      offs.push(bus.on('refuse', () => { arc.flicker = .35; readout.type(1); }));
    }
    let dirty = true;

    /* ---------------------------------------------------------------- the frame */
    const ST = { frames: 0, cpu: 0, worst: 0, last: 0 };
    function renderPlain(lit) { const c = LK.lights.candle; if (K.flames.length) { const p = new T.Vector3(); K.flames.forEach(fl => p.add(fl.getWorldPosition(new T.Vector3()))); c.position.copy(p.multiplyScalar(1 / K.flames.length)); }
      c.intensity = LK.genome.candleIntensity * lit * (held ? 1 : .92 + .08 * Math.sin(clock * 23.1)); R.setRenderTarget(null); R.render(scene, cam); }
    function frame(now) {
      const t0 = performance.now(); now = now == null ? t0 : now; const dt = lastNow ? clamp((now - lastNow) / 1000, 0, .1) : 1 / 60; lastNow = now;
      if (!held) clock += dt;
      const v = bus.view ? bus.view() : bus.state(); sync(v, dt);
      // flames flicker (stopped while held), dust drifts, smoke rises, pulses spread
      K.flames.forEach((fl, i) => { fl.scale.set(1, held ? 1 : 1 + .09 * Math.sin(clock * 13 + i * 1.7) + .05 * Math.sin(clock * 31 + i * 4.1), 1); fl.visible = !off; });
      if (!held) { const P = dustGeo.attributes.position; for (let i = 0; i < DUST; i += 3) { P.array[i * 3 + 1] += Math.sin(clock * .3 + dseed[i]) * .0004; P.array[i * 3] += Math.cos(clock * .2 + dseed[i]) * .0003; } P.needsUpdate = true; }
      for (let i = SMOKE.length - 1; i >= 0; i--) { const s = SMOKE[i]; s.t += dt; const u = s.t / 1.8; if (u < 0) continue; s.s.position.y += dt * .07; s.s.position.x += s.x * dt; s.s.scale.setScalar(.012 + u * .05); s.s.material.opacity = .22 * Math.sin(Math.min(1, u) * Math.PI); if (u >= 1) { scene.remove(s.s); s.s.material.dispose(); SMOKE.splice(i, 1); } }
      for (let i = PULSES.length - 1; i >= 0; i--) { const p = PULSES[i]; p.t += dt; const u = p.t / .7; const r = p.m.userData.r * (1 + u * 1.6); p.m.scale.set(r, r, r); p.m.material.opacity = .5 * (1 - u) * (1 - u); if (u >= 1) { scene.remove(p.m); p.m.material.dispose(); PULSES.splice(i, 1); } }
      GHOST.children.forEach((g, i) => g.traverse(x => { if (x.userData.billboard) x.lookAt(cam.position); }));
      ghostMat.opacity = .2 + .08 * Math.sin(now * .013) * Math.sin(now * .0071); ghostWire.opacity = .07 + .05 * Math.sin(now * .02);
      // the hologram UI and the spots
      arc.update(dt, cam); readout.update(dt, cam); Object.values(PEOPLE).forEach(P => P.mark.update(dt, cam));
      Object.values(parts).forEach(p => p.spots && p.spots.update(dt)); Object.values(PEOPLE).forEach(P => P.spots.update(dt)); Object.values(PROPS).forEach(P => P.spots.update(dt));
      if (cone) cone.material.uniforms.haze.value = .5 + .1 * Math.sin(clock * .7);
      holoMat.uniforms.t.value = clock;
      const lit = K.count ? K.flames.length / K.count : 0;
      if (look === 'holo') { scene.overrideMaterial = holoMat; renderPlain(lit); scene.overrideMaterial = null; }
      else if (look === 'plain' || !LK.pipeline) renderPlain(lit * .85 + .15);
      else LK.render(dt, held);
      const ms = performance.now() - t0; ST.frames++; ST.cpu += ms; ST.worst = Math.max(ST.worst, ms); ST.last = ms; dirty = false;
    }
    function resize() { const w = canvas.clientWidth || canvas.parentNode && canvas.parentNode.clientWidth || 390, h = canvas.clientHeight || canvas.parentNode && canvas.parentNode.clientHeight || 420; aspect = w / Math.max(1, h); cam.aspect = aspect; cam.updateProjectionMatrix(); LK.setSize(w, h); if (!LK.pipeline) R.setSize(w, h, false); }
    function disposeAll() { offs.forEach(f => f && f()); R.dispose(); }
    return { frame, resize, dispose: disposeAll, stats: () => ({ frames: ST.frames, cpuMs: ST.frames ? ST.cpu / ST.frames : 0, worstMs: ST.worst, lastMs: ST.last, quality: Q, pixelRatio: R.getPixelRatio() }),
      three: { renderer: R, scene, camera: cam, look: LK }, parts, PEOPLE, arc, readout, cake: C };
  }

  /* =================================================================== mount and the core hook */
  function mount(canvas, bus, opts) {
    opts = opts || {}; let W = null, raf = 0, dead = false;
    const h = { world: null, frame(now) { if (W) W.frame(now); }, resize() { if (W) W.resize(); }, stats() { return W ? W.stats() : { frames: 0 }; },
      dispose() { dead = true; cancelAnimationFrame(raf); if (W) W.dispose(); } };
    h.ready = ready(opts.base).then(() => { if (dead) return h; W = h.world = World(canvas, bus, opts); W.resize(); if (opts.loop) { const tick = now => { if (dead) return; W.frame(now); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); } return h; });
    h.ready.catch(e => console.error('SCENE', e));
    if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => h.resize()); ro.observe(canvas); }
    return h;
  }
  function create(container, orb) {
    const cv = document.createElement('canvas'); cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:none'; container.appendChild(cv);
    const h = mount(cv, orb, { loop: false });
    root.SCENE_HANDLE = h;
    return { frame: now => h.frame(now), resize: () => h.resize(), dispose: () => { h.dispose(); cv.remove(); }, ready: h.ready, stats: () => h.stats() };
  }
  root.SCENE = { mount, ready, KIDS, version: 1 };
  root.ORB_SCENE = { create };
})(typeof window !== 'undefined' ? window : globalThis);
