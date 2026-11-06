/* LOOK — the look of Ana's memory (Blade Runner 2049, party scene 128-245 s) for three.js r128.
   Warm candlelight on true black, falloff, the round projected-spot screen, bloom on flames, grain,
   shallow depth of field, and materials for sponge, cream icing, piped beads, chocolate, wax, red piping.
   Parameters are an evolved genome (look-genome.json, measured against the film by look-measure.js).

   API
     LOOK.apply(renderer, scene, camera, opts) -> handle
        opts.target   THREE.Vector3  the cake's centre (key light aims here, focus defaults here)
        opts.candles  [Vector3|Object3D]  flame positions (world); drives the candle light and flicker
        opts.genome   object  overrides (defaults: LOOK.GENOME, replaced by look-genome.json when loaded)
        opts.post     bool (default true)  bloom, depth of field, grade, grain, spot screen
        opts.room     bool (default false) adds the dark dome, floor and the band of light
        opts.shadows  bool (default true)
        handle.render(dt)       renders one frame (call instead of renderer.render)
        handle.setSize(w, h)    css pixels; uses renderer pixel ratio
        handle.set(genome)      change parameters live
        handle.focus(v)         Vector3 or distance in metres
        handle.candlesLit(f)    0..1, fraction of candles burning (dims the candle light)
        handle.lights           { key, candle, hemi }
     LOOK.material(kind, opts)  kinds: sponge, icing (alias cream), bead, chocolate, wax, piping, board,
                                table, floor, flame, halo. opts: { color, stripe, speckle, seed, repeat }
     LOOK.reveal(object, k, pitchPx)  0 = gone, 1 = whole; LOOK materials switch on/off as round spots
     LOOK.flash(object, k)            magnesium-flash decay on a cake change (k 1 -> 0 over ~0.4 s)
     LOOK.post(composerOrNull)  with an EffectComposer: returns a Pass (grade, bloom, grain, spots; no DOF);
                                with null: returns a standalone pipeline { render(scene, cam), setSize(w,h) }
     LOOK.stats(canvas, mask?)  { L, a, b, sL, sa, sb, rb, hist, hf } for tests
     LOOK.measure.*             the measurement functions used by look-measure.js
     LOOK.load(url)             fetches a genome JSON (look-genome.json) and applies it everywhere
*/
(function (root) {
  'use strict';
  const T = root.THREE;
  if (!T) throw new Error('LOOK needs THREE (r128) loaded first');

  /* ------------------------------------------------------------------ the genome (defaults = accepted values) */
  const GENOME = {"exposure":1.1,"keyIntensity":2.4,"keyKelvin":3300,"keyCone":0.5,"keySoft":0.75,"keyHeight":1.3,"keyForward":0.5,"candleIntensity":0.9,"candleDecay":1.6,"candleKelvin":2100,"ambient":0.05,"ambientCool":0.6,"bgLevel":0.004,"wbR":1.06,"wbB":1.0,"contrast":1.08,"saturation":1.0,"blackPoint":0.012,"toe":1.15,"bloomStrength":0.55,"bloomRadius":0.7,"bloomThreshold":1.1,"halation":0.5,"flame":3.2,"halo":1.0,"grain":0.03,"grainSize":1.2,"aperture":0.9,"vignette":0.55,"spotSteady":0.0,"spotPitch":4,"icingTone":0.92,"icingWarm":0.25,"spongeTone":0.85,"chocoTone":1.0,"tableTone":0.7,"tableWarm":0.5,"roughIcing":0.72,"bumpIcing":1.0,"band":0.6};
  const RANGES = {exposure:[0.3,3],keyIntensity:[0,8],keyKelvin:[1800,5200],keyCone:[0.2,0.95],keySoft:[0.1,1],keyHeight:[0.6,2.2],keyForward:[-0.4,1.4],candleIntensity:[0,4],candleDecay:[0.6,2.6],candleKelvin:[1400,2600],ambient:[0,0.4],ambientCool:[0,1],bgLevel:[0,0.012],wbR:[0.8,1.4],wbB:[0.45,1.4],contrast:[0.7,1.5],saturation:[0.5,1.6],blackPoint:[0,0.05],toe:[0.7,2],bloomStrength:[0,2],bloomRadius:[0.2,1.6],bloomThreshold:[0.3,3],halation:[0,1],flame:[1,8],halo:[0,2.5],grain:[0,0.1],grainSize:[0.6,2.5],aperture:[0,3],vignette:[0,1.6],spotSteady:[0,0.2],spotPitch:[2,9],icingTone:[0.4,1.05],icingWarm:[0,1],spongeTone:[0.4,1.05],chocoTone:[0.3,2.4],tableTone:[0.2,1.05],tableWarm:[0,1],roughIcing:[0.3,1],bumpIcing:[0,3],band:[0.2,2.5]};
  const G = Object.assign({}, GENOME);

  /* ------------------------------------------------------------------ helpers */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function kelvin(k) { // approximate blackbody -> linear rgb, normalized to max 1
    const t = k / 100; let r, g, b;
    r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
    g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755);
    b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
    const c = new T.Color(clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255);
    return c.convertSRGBToLinear();
  }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* ------------------------------------------------------------------ procedural textures (cached) */
  const TEX = {};
  function tex(key, w, h, draw, srgb) {
    if (TEX[key]) return TEX[key];
    const c = canvas(w, h), x = c.getContext('2d'); draw(x, w, h);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; if (srgb) t.encoding = T.sRGBEncoding;
    return (TEX[key] = t);
  }
  function mottle(x, w, h, r, n, base, amp, sizeA, sizeB) { // soft blobs, value noise by stacking
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { const px = r() * w, py = r() * h, s = sizeA + r() * (sizeB - sizeA), v = (r() - 0.5) * amp;
      const g = x.createRadialGradient(px, py, 0, px, py, s); const col = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { x.save(); x.translate(ox, oy); x.fillRect(px - s, py - s, 2 * s, 2 * s); x.restore(); } }
  }
  const TEXGEN = {
    icingMap: o => tex('icingMap' + (o.speckle || 0) + (o.seed || 1), 512, 256, (x, w, h) => { const r = rng(o.seed || 1);
      mottle(x, w, h, r, 260, '#ffffff', 0.16, 6, 40);
      if (o.speckle) { for (let i = 0; i < 2600 * o.speckle; i++) { const px = r() * w, py = r() * h * 0.35 + (r() < 0.5 ? 0 : h * 0.62); x.fillStyle = `rgba(${150 + r() * 60 | 0},${95 + r() * 40 | 0},${40 + r() * 30 | 0},${0.35 + r() * 0.5})`; x.fillRect(px, py, 1 + r() * 2, 1 + r() * 1.5); } }
    }, true),
    icingBump: o => tex('icingBump' + (o.seed || 1), 512, 256, (x, w, h) => { const r = rng((o.seed || 1) * 7 + 3);
      x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); x.lineCap = 'round';
      for (let i = 0; i < 140; i++) { const cx = r() * w, cy = r() * h, rad = 10 + r() * 60, a0 = r() * 6.28, a1 = a0 + 0.6 + r() * 2.2, v = r() < 0.5 ? 255 : 0;
        x.strokeStyle = `rgba(${v},${v},${v},${0.10 + r() * 0.18})`; x.lineWidth = 2 + r() * 7; x.beginPath(); x.arc(cx, cy, rad, a0, a1); x.stroke(); }
      x.filter = 'blur(1.5px)'; x.drawImage(x.canvas, 0, 0); x.filter = 'none';
      for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.15})`; x.fillRect(r() * w, r() * h, 1, 1); }
    }, false),
    spongeMap: o => tex('spongeMap' + (o.seed || 1), 256, 256, (x, w, h) => { const r = rng((o.seed || 1) * 11 + 5);
      mottle(x, w, h, r, 120, '#ffffff', 0.1, 4, 20);
      for (let i = 0; i < 1400; i++) { const s = 0.6 + r() * 2.4; x.fillStyle = `rgba(110,70,20,${0.25 + r() * 0.4})`; x.beginPath(); x.ellipse(r() * w, r() * h, s, s * (0.5 + r() * 0.6), r() * 3, 0, 6.29); x.fill(); }
    }, true),
    spongeBump: o => tex('spongeBump' + (o.seed || 1), 256, 256, (x, w, h) => { const r = rng((o.seed || 1) * 13 + 1);
      x.fillStyle = '#b0b0b0'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) { const s = 0.6 + r() * 2.6; x.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; x.beginPath(); x.ellipse(r() * w, r() * h, s, s * (0.5 + r() * 0.6), r() * 3, 0, 6.29); x.fill(); }
    }, false),
    chocoMap: o => tex('chocoMap' + (o.seed || 1), 512, 256, (x, w, h) => { const r = rng((o.seed || 1) * 17 + 9);
      mottle(x, w, h, r, 200, '#ffffff', 0.22, 6, 50);
      for (let i = 0; i < 90; i++) { const y = r() * h; x.strokeStyle = `rgba(255,235,200,${0.05 + r() * 0.1})`; x.lineWidth = 1 + r() * 3; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 20, w * 0.7, y + (r() - 0.5) * 20, w, y); x.stroke(); }
    }, true),
    chocoBump: o => tex('chocoBump' + (o.seed || 1), 512, 256, (x, w, h) => { const r = rng((o.seed || 1) * 19 + 2);
      x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) { const y = r() * h, v = r() < 0.5 ? 255 : 0; x.strokeStyle = `rgba(${v},${v},${v},${0.12 + r() * 0.2})`; x.lineWidth = 2 + r() * 9; x.beginPath(); x.moveTo(-10, y); x.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 30, w * 0.7, y + (r() - 0.5) * 30, w + 10, y); x.stroke(); }
      x.filter = 'blur(2px)'; x.drawImage(x.canvas, 0, 0); x.filter = 'none';
    }, false),
    waxMap: o => tex('wax' + (o.stripe || 'none'), 32, 128, (x, w, h) => {
      x.fillStyle = '#f6efe0'; x.fillRect(0, 0, w, h); if (!o.stripe) return;
      x.fillStyle = o.stripe; for (let y = -32; y < h + 32; y += 22) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + 16); x.lineTo(w, y + 25); x.lineTo(0, y + 9); x.fill(); }
    }, true),
    tableMap: o => tex('table' + (o.seed || 1), 256, 256, (x, w, h) => { const r = rng((o.seed || 1) * 23 + 4); mottle(x, w, h, r, 90, '#ffffff', 0.06, 10, 60); }, true),
    flameMap: () => tex('flame', 32, 64, (x, w, h) => { const g = x.createRadialGradient(w / 2, h * 0.64, 0.5, w / 2, h * 0.56, h * 0.42);
      g.addColorStop(0, 'rgba(255,255,245,1)'); g.addColorStop(0.28, 'rgba(255,214,120,0.95)'); g.addColorStop(0.62, 'rgba(255,130,40,0.35)'); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      const b = x.createRadialGradient(w / 2, h * 0.8, 0, w / 2, h * 0.8, w * 0.22); b.addColorStop(0, 'rgba(90,120,255,0.55)'); b.addColorStop(1, 'rgba(90,120,255,0)'); x.globalCompositeOperation = 'lighter'; x.fillStyle = b; x.fillRect(0, 0, w, h); }, false),
    haloMap: () => tex('halo', 64, 64, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,200,130,0.55)'); g.addColorStop(0.35, 'rgba(255,150,70,0.14)'); g.addColorStop(1, 'rgba(255,120,40,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false)
  };

  /* ------------------------------------------------------------------ the spot reveal + flash, injected into every LOOK mesh material */
  const SH = { uTime: { value: 0 }, uPitch: { value: 4 } };
  function spotify(mat) {
    const U = mat.userData; U.on = { value: 1 }; U.fl = { value: 0 };
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uTime: SH.uTime, uPitch: SH.uPitch, uOn: U.on, uFl: U.fl });
      sh.fragmentShader = 'uniform float uTime, uPitch, uOn, uFl;\nfloat lkH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n'
        + sh.fragmentShader.replace('void main() {', 'void main() {\n float lkSpot = 0.0; if (uOn < 0.999) { vec2 q = gl_FragCoord.xy / uPitch; float h = lkH(floor(q)); float r = clamp((uOn * 1.35 - h * 0.35) / 0.65 + 0.0, 0.0, 1.0); r = clamp((uOn - h * 0.55) / 0.45, 0.0, 1.0); float d = length(fract(q) - 0.5); if (d > r * 0.72) discard; lkSpot = (1.0 - r) * (1.0 - smoothstep(0.0, 0.5, d)); }')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.rgb += lkSpot * vec3(1.0, 0.82, 0.56) * 2.2;\n if (uFl > 0.001) { float v = 0.84 + 0.16 * sin(uTime * 95.0) * sin(uTime * 37.0); vec3 hue = mix(vec3(1.0, 0.45, 0.8), mix(vec3(1.0, 0.74, 0.4), vec3(1.0, 0.98, 0.93), smoothstep(0.55, 1.0, uFl)), smoothstep(0.0, 0.55, uFl)); gl_FragColor.rgb = mix(gl_FragColor.rgb, hue * 2.4 * v, uFl * 0.85); }');
    };
    mat.customProgramCacheKey = () => 'lookspot1';
    return mat;
  }

  /* ------------------------------------------------------------------ materials */
  const MATS = [];   // { m, kind, base(Color, sRGB-hex), o }
  const KIND = {
    // base colours are sRGB albedo before the tone genes; measured from the film's lit regions and evolved
    sponge:    { color: 0xe7c47e, rough: 0.9, tone: 'spongeTone' },
    icing:     { color: 0xf3e6c8, rough: null, tone: 'icingTone' },
    bead:      { color: 0xf6ead2, rough: 0.38, tone: 'icingTone' },
    chocolate: { color: 0x5a3a24, rough: 0.55, tone: 'chocoTone' },
    wax:       { color: 0xffffff, rough: 0.45, tone: null },
    piping:    { color: 0xc2271c, rough: 0.28, tone: null },
    board:     { color: 0x1d1612, rough: 0.6, tone: null },
    table:     { color: 0xd9b989, rough: 0.62, tone: 'tableTone' },
    floor:     { color: 0x0d0e0e, rough: 0.5, tone: null }
  };
  function tint(m, rec) {
    const k = KIND[rec.kind]; if (!k) return;
    const c = new T.Color(rec.o.color != null ? rec.o.color : k.color);
    if (k.tone) { const t = G[k.tone]; c.multiplyScalar(t); }
    if (rec.kind === 'icing' || rec.kind === 'bead') { const w = G.icingWarm; c.r *= 1 + 0.04 * w; c.b *= 1 - 0.22 * w; m.roughness = rec.kind === 'icing' ? G.roughIcing : k.rough; if (m.bumpMap) m.bumpScale = 0.0035 * G.bumpIcing * (rec.o.scale || 1); }
    if (rec.kind === 'table') { const w = G.tableWarm; c.g *= 1 - 0.08 * w; c.b *= 1 - 0.35 * w; }
    m.color.copy(c.convertSRGBToLinear ? c.convertSRGBToLinear() : c);
  }
  function material(kind, opts) {
    const o = opts || {}; kind = kind === 'cream' ? 'icing' : kind;
    if (kind === 'flame' || kind === 'halo') {
      const m = new T.SpriteMaterial({ map: kind === 'flame' ? TEXGEN.flameMap() : TEXGEN.haloMap(), blending: T.AdditiveBlending, depthWrite: false, transparent: true });
      m.userData.lookKind = kind; const rec = { m, kind, o }; MATS.push(rec); spriteTint(m, rec); return m;
    }
    const k = KIND[kind] || KIND.icing, m = new T.MeshStandardMaterial({ roughness: k.rough == null ? G.roughIcing : k.rough, metalness: 0 });
    const rep = o.repeat || [1, 1];
    const setTex = (mapT, bumpT) => { if (mapT) { m.map = mapT.clone(); m.map.needsUpdate = true; m.map.repeat.set(rep[0], rep[1]); } if (bumpT) { m.bumpMap = bumpT.clone(); m.bumpMap.needsUpdate = true; m.bumpMap.repeat.set(rep[0], rep[1]); } };
    if (kind === 'icing') { setTex(TEXGEN.icingMap(o), TEXGEN.icingBump(o)); }
    if (kind === 'sponge') { setTex(TEXGEN.spongeMap(o), TEXGEN.spongeBump(o)); m.bumpScale = 0.004; }
    if (kind === 'chocolate') { setTex(TEXGEN.chocoMap(o), TEXGEN.chocoBump(o)); m.bumpScale = 0.003; }
    if (kind === 'wax') { setTex(TEXGEN.waxMap(o), null); m.emissive = new T.Color(0x3a2410); m.emissiveIntensity = 0.25; }
    if (kind === 'table') { setTex(TEXGEN.tableMap(o), null); }
    if (kind === 'piping') { m.emissive = new T.Color(0x200402); }
    m.userData.lookKind = kind; spotify(m);
    const rec = { m, kind, o }; MATS.push(rec); tint(m, rec); return m;
  }
  function spriteTint(m, rec) { const s = rec.kind === 'flame' ? G.flame : G.flame * 0.35 * G.halo; m.color.setRGB(s, s, s); }
  function retintAll() { MATS.forEach(r => { if (r.kind === 'flame' || r.kind === 'halo') spriteTint(r.m, r); else tint(r.m, r); }); }

  function forMats(obj, fn) { obj.traverse(x => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; ms.forEach(m => fn(m, x)); }); }
  function reveal(obj, k, pitch) {
    if (pitch) SH.uPitch.value = pitch;
    forMats(obj, (m, x) => { const U = m.userData;
      if (U.on) { U.on.value = k; if (x.visible === false && k > 0) x.visible = true; }
      else { if (U.op0 == null) { U.op0 = m.opacity; U.tr0 = m.transparent; } m.transparent = k < 1 ? true : U.tr0; m.opacity = U.op0 * k * k; } });
  }
  function flash(obj, k) { forMats(obj, m => { if (m.userData.fl) m.userData.fl.value = k; }); }

  /* ------------------------------------------------------------------ post: depth of field, bloom, grade, grain, spot screen */
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const FS = {
    copy: 'uniform sampler2D tA; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tA, vUv); }',
    dof: `uniform sampler2D tA; uniform sampler2D tD; uniform vec2 px; uniform float near, far, focus, ap, maxR; varying vec2 vUv;
      float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
      float coc(vec2 uv){ float z = lin(texture2D(tD, uv).x); return clamp(abs(z - focus) / max(z, 1e-3) * ap * 12.0, 0.0, maxR); }
      void main(){ float c0 = coc(vUv); vec4 acc = vec4(texture2D(tA, vUv).rgb, 1.0); if (c0 < 0.35 && maxR < 0.01) { gl_FragColor = vec4(acc.rgb, 1.0); return; }
        for (int i = 1; i < 40; i++) { float fi = float(i); float a = fi * 2.39996; float r = sqrt(fi / 40.0) * maxR; vec2 o = vec2(cos(a), sin(a)) * r * px; float cs = coc(vUv + o);
          float w = smoothstep(r - 1.0, r, min(cs, c0 + 1.5) ); w = max(w, smoothstep(r - 1.0, r, cs) * step(c0, cs)); acc += vec4(texture2D(tA, vUv + o).rgb * w, w); }
        gl_FragColor = vec4(acc.rgb / acc.w, 1.0); }`,
    bright: `uniform sampler2D tA; uniform vec2 px; uniform float thr; varying vec2 vUv;
      void main(){ vec3 c = (texture2D(tA, vUv + px * vec2(-.5,-.5)).rgb + texture2D(tA, vUv + px * vec2(.5,-.5)).rgb + texture2D(tA, vUv + px * vec2(-.5,.5)).rgb + texture2D(tA, vUv + px * vec2(.5,.5)).rgb) * 0.25;
        float l = max(c.r, max(c.g, c.b)); float k = max(l - thr, 0.0); k = k * k / (k + 0.5 * thr + 1e-4); gl_FragColor = vec4(c * (k / max(l, 1e-4)), 1.0); }`,
    down: `uniform sampler2D tA; uniform vec2 px; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tA, vUv + px * vec2(-1.,-1.)).rgb + texture2D(tA, vUv + px * vec2(1.,-1.)).rgb + texture2D(tA, vUv + px * vec2(-1.,1.)).rgb + texture2D(tA, vUv + px * vec2(1.,1.)).rgb; gl_FragColor = vec4(c * 0.25, 1.0); }`,
    blur: `uniform sampler2D tA; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tA, vUv).rgb * 0.227027; c += (texture2D(tA, vUv + dir * 1.3846).rgb + texture2D(tA, vUv - dir * 1.3846).rgb) * 0.316216; c += (texture2D(tA, vUv + dir * 3.2308).rgb + texture2D(tA, vUv - dir * 3.2308).rgb) * 0.070270; gl_FragColor = vec4(c, 1.0); }`,
    final: `uniform sampler2D tA; uniform sampler2D b0; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D b3;
      uniform vec4 bw; uniform float bloom, halation, exposure, wbR, wbB, contrast, sat, bp, toe, vig, grain, gsize, seed, spot, pitch, aspect, bg;
      varying vec2 vUv;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main(){
        vec3 c = texture2D(tA, vUv).rgb + vec3(bg) * vec3(0.86, 1.0, 0.8);
        vec3 B = texture2D(b0, vUv).rgb * bw.x + texture2D(b1, vUv).rgb * bw.y + texture2D(b2, vUv).rgb * bw.z + texture2D(b3, vUv).rgb * bw.w;
        B *= mix(vec3(1.0), vec3(1.0, 0.62, 0.34), halation);
        c += B * bloom;
        c *= exposure * vec3(wbR, 1.0, wbB);
        c = aces(c);
        c = toSRGB(c);
        c = (c - 0.5) * contrast + 0.5;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = max(mix(vec3(l), c, sat), 0.0);
        c = max(c - bp, 0.0) / (1.0 - bp); c = pow(c, vec3(toe));
        vec2 q = (vUv - 0.5) * vec2(aspect, 1.0); c *= clamp(1.0 - vig * dot(q, q), 0.0, 1.0);
        if (spot > 0.0) { float d = length(fract(gl_FragCoord.xy / pitch) - 0.5); c *= 1.0 - spot * smoothstep(0.28, 0.5, d); }
        vec2 gp = floor(gl_FragCoord.xy / gsize); float n = (h2(gp + seed) + h2(gp * 1.37 + seed * 1.91) - 1.0);
        float lw = clamp(dot(c, vec3(0.3333)), 0.0, 1.0); c += n * grain * (0.35 + 2.6 * lw * (1.0 - lw));
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`
  };
  function Pipeline(renderer) {
    const gl = renderer.getContext(), isGL2 = renderer.capabilities.isWebGL2;
    const canHalf = isGL2 ? !!gl.getExtension('EXT_color_buffer_float') : !!(gl.getExtension('OES_texture_half_float') && gl.getExtension('EXT_color_buffer_half_float'));
    const type = canHalf ? T.HalfFloatType : T.UnsignedByteType;
    const mk = (w, h, depth) => { const rt = new T.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), { type, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: !!depth, stencilBuffer: false });
      if (depth) { rt.depthTexture = new T.DepthTexture(Math.max(1, w), Math.max(1, h)); rt.depthTexture.type = T.UnsignedIntType; } return rt; };
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new T.Mesh(new T.PlaneGeometry(2, 2)), qs = new T.Scene(); qs.add(quad); quad.frustumCulled = false;
    const M = {}; for (const k in FS) M[k] = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS[k], depthTest: false, depthWrite: false, uniforms: {} });
    const P = { W: 1, H: 1, main: null, dofRT: null, half: null, lv: [], focusDist: 1, frame: 0, enabled: { dof: true } };
    function pass(mat, uniforms, target) { mat.uniforms = uniforms; quad.material = mat; mat.uniformsNeedUpdate = true; renderer.setRenderTarget(target); renderer.render(qs, cam); }
    P.setSize = (w, h) => { // device pixels
      w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h)); if (w === P.W && h === P.H && P.main) return; P.W = w; P.H = h;
      [P.main, P.dofRT, P.half].concat(P.lv.flat()).forEach(r => r && r.dispose());
      P.main = mk(w, h, true); P.dofRT = mk(w, h, false); P.half = mk(w >> 1, h >> 1, false); P.lv = [];
      for (let i = 0; i < 4; i++) { const s = 4 << i; P.lv.push([mk(Math.ceil(w / s), Math.ceil(h / s)), mk(Math.ceil(w / s), Math.ceil(h / s))]); }
    };
    P.process = (inTex, depthTex, camera, target) => {
      const W = P.W, H = P.H; let src = inTex;
      const maxR = clamp(G.aperture * 4 * (H / 540), 0, 14);
      if (depthTex && camera && G.aperture > 0.01 && P.enabled.dof) {
        pass(M.dof, { tA: { value: inTex }, tD: { value: depthTex }, px: { value: new T.Vector2(1 / W, 1 / H) }, near: { value: camera.near }, far: { value: camera.far }, focus: { value: P.focusDist }, ap: { value: G.aperture * (H / 540) }, maxR: { value: maxR } }, P.dofRT);
        src = P.dofRT.texture;
      }
      pass(M.bright, { tA: { value: src }, px: { value: new T.Vector2(1 / W, 1 / H) }, thr: { value: G.bloomThreshold } }, P.half);
      let prev = P.half;
      for (let i = 0; i < 4; i++) { const [a, b] = P.lv[i], w = a.width, h = a.height;
        pass(M.down, { tA: { value: prev.texture }, px: { value: new T.Vector2(0.5 / prev.width, 0.5 / prev.height) } }, a);
        pass(M.blur, { tA: { value: a.texture }, dir: { value: new T.Vector2(1 / w, 0) } }, b);
        pass(M.blur, { tA: { value: b.texture }, dir: { value: new T.Vector2(0, 1 / h) } }, a); prev = a; }
      const r = G.bloomRadius, ws = [1, r, r * r, r * r * r], sum = ws.reduce((s, v) => s + v, 0);
      P.frame++;
      pass(M.final, { tA: { value: src }, b0: { value: P.lv[0][0].texture }, b1: { value: P.lv[1][0].texture }, b2: { value: P.lv[2][0].texture }, b3: { value: P.lv[3][0].texture },
        bw: { value: new T.Vector4(ws[0] / sum, ws[1] / sum, ws[2] / sum, ws[3] / sum) }, bloom: { value: G.bloomStrength }, halation: { value: G.halation }, exposure: { value: G.exposure },
        wbR: { value: G.wbR }, wbB: { value: G.wbB }, contrast: { value: G.contrast }, sat: { value: G.saturation }, bp: { value: G.blackPoint }, toe: { value: G.toe }, vig: { value: G.vignette },
        grain: { value: G.grain }, gsize: { value: G.grainSize * Math.max(1, H / 720) }, seed: { value: P.fixedSeed != null ? P.fixedSeed : (P.frame % 61) * 1.7 }, spot: { value: G.spotSteady }, pitch: { value: G.spotPitch * Math.max(1, H / 720) },
        aspect: { value: W / H }, bg: { value: G.bgLevel } }, target);
    };
    P.render = (scene, camera, target) => {
      const tm = renderer.toneMapping, enc = renderer.outputEncoding; renderer.toneMapping = T.NoToneMapping;
      renderer.setRenderTarget(P.main); renderer.clear(); renderer.render(scene, camera);
      P.process(P.main.texture, P.main.depthTexture, camera, target || null);
      renderer.toneMapping = tm; renderer.outputEncoding = enc; renderer.setRenderTarget(null);
    };
    return P;
  }
  function post(composer) {
    if (!composer) return null; // standalone pipelines are made by apply(); kept for API symmetry
    const renderer = composer.renderer, P = Pipeline(renderer);
    return { enabled: true, needsSwap: true, clear: false, renderToScreen: false,
      setSize(w, h) { P.setSize(w, h); },
      render(r, writeBuffer, readBuffer) { P.setSize(readBuffer.width, readBuffer.height); const tm = r.toneMapping; r.toneMapping = T.NoToneMapping; P.process(readBuffer.texture, null, null, this.renderToScreen ? null : writeBuffer); r.toneMapping = tm; } };
  }

  /* ------------------------------------------------------------------ the room (optional) */
  function room(scene) {
    const g = new T.Group(); g.name = 'LOOK.room';
    const fl = new T.Mesh(new T.CircleGeometry(9, 96), material('floor')); fl.rotation.x = -Math.PI / 2; fl.userData.region = 'room'; g.add(fl);
    const wall = new T.Mesh(new T.SphereGeometry(8, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0x0b0d0c, roughness: 0.9, side: T.BackSide })); wall.userData.region = 'room'; g.add(wall);
    const bandMat = new T.MeshBasicMaterial({ color: 0xdfe8e4 }); bandMat.userData.lookBand = true;
    const band = new T.Mesh(new T.TorusGeometry(7.7, 0.012, 6, 256), bandMat); band.rotation.x = Math.PI / 2; band.position.y = 0.42; band.userData.region = 'band'; g.add(band);
    const glowMat = new T.MeshBasicMaterial({ color: 0x9fb0aa, transparent: true, opacity: 0.16, depthWrite: false }); glowMat.userData.lookBand = true;
    const glow = new T.Mesh(new T.TorusGeometry(7.7, 0.06, 6, 256), glowMat); glow.rotation.x = Math.PI / 2; glow.position.y = 0.42; glow.userData.region = 'band'; g.add(glow);
    scene.add(g); return g;
  }

  /* ------------------------------------------------------------------ apply */
  function apply(renderer, scene, camera, opts) {
    const o = opts || {}; if (o.genome) Object.assign(G, o.genome);
    renderer.outputEncoding = T.sRGBEncoding; renderer.physicallyCorrectLights = false;
    if (o.shadows !== false) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; }
    scene.background = new T.Color(0x000000); scene.fog = new T.FogExp2(0x020303, 0.05);
    const target = (o.target || new T.Vector3(0, 0.55, 0)).clone();
    const rig = new T.Group(); rig.name = 'LOOK.rig'; scene.add(rig);
    const key = new T.SpotLight(0xffffff, 1, 5, 0.5, 0.7, 2); key.castShadow = o.shadows !== false; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0008; key.shadow.radius = 4;
    rig.add(key, key.target); key.target.position.copy(target);
    const candle = new T.PointLight(0xffffff, 1, 2.5, 1.6); rig.add(candle);
    const hemi = new T.HemisphereLight(0x8a9894, 0x080604, 0.05); rig.add(hemi);
    const roomG = o.room ? room(scene) : null;
    const P = o.post === false ? null : Pipeline(renderer);
    const H = { genome: G, lights: { key, candle, hemi }, pipeline: P, room: roomG, target, lit: 1, t: 0, candles: o.candles || [] };
    const tmp = new T.Vector3();
    function sync() {
      key.color.copy(kelvin(G.keyKelvin)); key.intensity = G.keyIntensity; key.angle = G.keyCone; key.penumbra = G.keySoft;
      key.position.set(target.x + 0.12, target.y + G.keyHeight, target.z + G.keyForward);
      candle.color.copy(kelvin(G.candleKelvin)); candle.decay = G.candleDecay;
      hemi.intensity = G.ambient; hemi.color.setRGB(0.55 + 0.25 * (1 - G.ambientCool), 0.6, 0.55 + 0.3 * G.ambientCool);
      if (roomG) roomG.traverse(x => { if (x.material && x.material.userData.lookBand) { x.material.color.setHex(x.material.transparent ? 0x9fb0aa : 0xdfe8e4).multiplyScalar(G.band); } });
      retintAll();
    }
    H.set = g => { Object.assign(G, g || {}); sync(); };
    H.focus = v => { if (!P) return; P.focusDist = typeof v === 'number' ? v : camera.position.distanceTo(v); P.focusAuto = false; };
    H.candlesLit = f => { H.lit = clamp(f, 0, 1); };
    H.setCandles = list => { H.candles = list || []; };
    H.setSize = (w, h) => { renderer.setSize(w, h, false); if (P) P.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio()); };
    H.render = (dt, fixed) => {
      H.t += dt || 0; SH.uTime.value = H.t; SH.uPitch.value = Math.max(2, G.spotPitch * renderer.getPixelRatio());
      const n = H.candles.length; if (n) { tmp.set(0, 0, 0); H.candles.forEach(c => tmp.add(c.isObject3D ? c.getWorldPosition(new T.Vector3()) : c)); tmp.multiplyScalar(1 / n); candle.position.copy(tmp); candle.position.y += 0.02; }
      else candle.position.set(target.x, target.y + 0.15, target.z);
      const fl = fixed ? 1 : 0.9 + 0.06 * Math.sin(H.t * 23.1) * Math.sin(H.t * 7.7) + 0.04 * Math.sin(H.t * 41.3);
      candle.intensity = G.candleIntensity * H.lit * fl;
      if (P) { if (P.focusAuto !== false) P.focusDist = camera.position.distanceTo(target); P.fixedSeed = fixed ? 3.1 : null; P.render(scene, camera, null); }
      else renderer.render(scene, camera);
    };
    H.dispose = () => { scene.remove(rig); if (roomG) scene.remove(roomG); };
    sync(); APPLIED.push(H); return H;
  }
  const APPLIED = [];

  /* ------------------------------------------------------------------ measurement (shared by tests and look-measure.js) */
  function srgb2lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  const LUT = new Float32Array(256); for (let i = 0; i < 256; i++) LUT[i] = srgb2lin(i);
  function lab(r, g, b) { const R = LUT[r], Gg = LUT[g], B = LUT[b];
    let x = (0.4124 * R + 0.3576 * Gg + 0.1805 * B) / 0.95047, y = 0.2126 * R + 0.7152 * Gg + 0.0722 * B, z = (0.0193 * R + 0.1192 * Gg + 0.9505 * B) / 1.08883;
    const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; x = f(x); y = f(y); z = f(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)]; }
  function regionStats(img, mask) { // img: ImageData-like {data,width,height}; mask: Uint8Array (1 = in) or null
    const d = img.data, N = img.width * img.height; let n = 0, sL = 0, sa = 0, sb = 0, qL = 0, qa = 0, qb = 0, R = 0, B = 0;
    for (let i = 0; i < N; i++) { if (mask && !mask[i]) continue; const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], v = lab(r, g, b);
      n++; sL += v[0]; sa += v[1]; sb += v[2]; qL += v[0] * v[0]; qa += v[1] * v[1]; qb += v[2] * v[2]; R += r; B += b; }
    if (!n) return null; const m = (s) => s / n, sd = (s, q) => Math.sqrt(Math.max(0, q / n - (s / n) * (s / n)));
    return { n, L: m(sL), a: m(sa), b: m(sb), sL: sd(sL, qL), sa: sd(sa, qa), sb: sd(sb, qb), rb: R / Math.max(1, B) };
  }
  function hist(img, mask, bins) { bins = bins || 25; const h = new Float64Array(bins), d = img.data, N = img.width * img.height; let n = 0;
    for (let i = 0; i < N; i++) { if (mask && !mask[i]) continue; const L = lab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])[0]; h[Math.min(bins - 1, Math.max(0, Math.floor(L / 100 * bins)))]++; n++; }
    return Array.from(h, v => v / Math.max(1, n)); }
  function emd(h1, h2) { let c1 = 0, c2 = 0, s = 0; const w = 100 / h1.length; for (let i = 0; i < h1.length; i++) { c1 += h1[i]; c2 += h2[i]; s += Math.abs(c1 - c2) * w; } return s; }
  function luma(img) { const d = img.data, N = img.width * img.height, o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]; return o; }
  function boxBlur(a, W, H, r) { const t = new Float32Array(W * H), o = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < W) { s += a[y * W + xx]; c++; } } t[y * W + x] = s / c; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < H) { s += t[yy * W + x]; c++; } } o[y * W + x] = s / c; } return o; }
  function texture(img, mask) { // fine texture: std of (L - blur1) and of (blur1 - blur4), luma 0-255, in the mask
    const W = img.width, H = img.height, l = luma(img), b1 = boxBlur(l, W, H, 1), b4 = boxBlur(l, W, H, 4); let n = 0, s1 = 0, q1 = 0, s2 = 0, q2 = 0;
    for (let i = 0; i < W * H; i++) { if (mask && !mask[i]) continue; const e1 = l[i] - b1[i], e2 = b1[i] - b4[i]; n++; s1 += e1; q1 += e1 * e1; s2 += e2; q2 += e2 * e2; }
    const hf = Math.sqrt(Math.max(0, q1 / n - (s1 / n) ** 2)), mf = Math.sqrt(Math.max(0, q2 / n - (s2 / n) ** 2)); return { hf, mf, ratio: hf / Math.max(1e-6, mf) }; }
  function bloomRadius(img, zone, k) { // zone: Uint8Array where flames may be; returns mean radius (px at this image width) where the
    // upper-sector luminance above a flame peak decays to 10 % of (peak - surround)
    const W = img.width, H = img.height, l = luma(img), peaks = []; k = k || 7; const R = Math.round(28 * W / 1280);
    const idx = []; for (let i = 0; i < W * H; i++) if ((!zone || zone[i]) && l[i] > 200) idx.push(i);
    idx.sort((a, b) => l[b] - l[a]); const sup = Math.max(3, Math.round(7 * W / 1280));
    for (const i of idx) { const x = i % W, y = (i / W) | 0; if (peaks.some(p => Math.abs(p[0] - x) <= sup && Math.abs(p[1] - y) <= sup * 1.6)) continue; peaks.push([x, y]); if (peaks.length >= k) break; }
    const rad = [];
    for (const [px, py] of peaks) { const prof = [];
      for (let r = 0; r <= R; r++) { let s = 0, c = 0; for (let a = -150; a <= -30; a += 10) { const x = Math.round(px + Math.cos(a * Math.PI / 180) * r), y = Math.round(py + Math.sin(a * Math.PI / 180) * r); if (x >= 0 && y >= 0 && x < W && y < H) { s += l[y * W + x]; c++; } } prof.push(c ? s / c : 0); }
      const base = Math.min(...prof.slice(R - 4)), top = prof[0]; let rr = R; for (let r = 1; r <= R; r++) if (prof[r] - base < 0.1 * (top - base)) { rr = r; break; } rad.push(rr * 1280 / W); }
    return { n: peaks.length, r: rad.length ? rad.reduce((s, v) => s + v, 0) / rad.length : 0, peaks };
  }
  function stats(cv, mask) { const c2 = cv.getContext && cv.getContext('2d') ? cv : null; let img;
    if (c2) img = c2.getContext('2d').getImageData(0, 0, cv.width, cv.height); else { const t = canvas(cv.width, cv.height), x = t.getContext('2d'); x.drawImage(cv, 0, 0); img = x.getImageData(0, 0, cv.width, cv.height); }
    const s = regionStats(img, mask) || {}; s.hist = hist(img, mask); Object.assign(s, texture(img, mask)); return s; }

  async function load(url) { try { const r = await fetch(url); if (!r.ok) return false; const j = await r.json(); const g = j.genome || j; Object.assign(G, g); APPLIED.forEach(h => h.set({})); retintAll(); return true; } catch (e) { return false; } }

  root.LOOK = { version: 1, GENOME, RANGES, genome: G, apply, material, reveal, flash, post, stats, load, kelvin, room,
    set(g) { Object.assign(G, g || {}); APPLIED.forEach(h => h.set({})); retintAll(); },
    measure: { lab, regionStats, hist, emd, texture, bloomRadius, luma } };
})(typeof window !== 'undefined' ? window : globalThis);
