// ============================================================================
// STELLINE HERO RENDERER
// One specimen (a bug, a birthday cake) filling the frame, lit and lensed like a
// macro photograph: procedural PBR materials, studio/candle environment, real
// depth-of-field, grain, vignette. The five orb rings edit the specimen's genome.
// ============================================================================
(function () {
  'use strict';
  const A = window.ATLAS; if (!A || typeof THREE === 'undefined') return;
  const T = THREE;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const H = A.hero = { active: false, kind: null, parts: [], sel: 0, t: 0, genome: null, seed: 1, builders: {}, fps: 60 };

  // ---- deterministic randomness -------------------------------------------------
  H.rng = function (seed) { let s = (seed >>> 0) || 1; return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  H.hash = function (str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  H.seedName = n => n.toString(36).toUpperCase().padStart(6, '0').slice(-6);

  // ---- scene --------------------------------------------------------------------
  const renderer = A.renderer;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = H.scene = new T.Scene();
  const cam = H.cam = new T.PerspectiveCamera(30, 16 / 9, 0.02, 80);
  const root = H.root = new T.Group(); scene.add(root);
  const key = new T.DirectionalLight(0xfff1de, 2.4); key.position.set(3, 5, 4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -5; key.shadow.camera.right = 5; key.shadow.camera.top = 5; key.shadow.camera.bottom = -5; key.shadow.camera.near = 0.5; key.shadow.camera.far = 20; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  const rim = new T.DirectionalLight(0xa8c8ff, 1.1); rim.position.set(-4, 2.5, -3);
  const fill = new T.AmbientLight(0xffffff, 0.06);
  scene.add(key, rim, fill, key.target);
  H.lights = { key, rim, fill };

  // ---- environment (procedural softboxes -> PMREM) --------------------------------
  const pmrem = new T.PMREMGenerator(renderer);
  const envCache = {};
  const MOODS = {
    studio: { exp: 0.8, bg: 0x0b0907, boxes: [[0xffe6c8, 1.8, [4, 5, 4], 3, 2], [0xb8d0ff, 0.8, [-5, 2, -2], 2, 3], [0xffffff, 0.15, [0, 7, 0], 8, 8]], page: '#2a1a12' },
    amber:  { exp: 1.5, bg: 0x060403, boxes: [[0xffb060, 1.6, [2, 3, 3], 2, 2], [0x405070, 0.5, [-5, 2, -3], 3, 4], [0xff9040, 0.6, [0, 1, 6], 6, 2]], page: '#1a0f08' },
    forest: { exp: 0.8, bg: 0x050805, boxes: [[0xfff2d0, 1.8, [3, 6, 2], 2.5, 2.5], [0x7090ff, 0.5, [-4, 2, 3], 2, 3], [0x80ff90, 0.12, [0, 0.5, -5], 8, 3]], page: '#0d1a0d' },
    dome:   { exp: 0.7, bg: 0x0a0d0d, boxes: [[0xf0fff8, 2.4, [3, 5, 4], 4, 3], [0xd0e8ff, 1.4, [-5, 3, 0], 3, 4], [0xffffff, 0.5, [0, 6, -4], 9, 5]], page: '#1b2420' },
  };
  H.setMood = function (name) {
    const m = MOODS[name] || MOODS.studio; H.mood = name;
    if (!envCache[name]) {
      const e = new T.Scene(); e.background = new T.Color(m.bg);
      m.boxes.forEach(([col, k, p, w, h]) => { const mat = new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(k), side: T.DoubleSide }); const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat); mesh.position.set(p[0], p[1], p[2]); mesh.lookAt(0, 0, 0); e.add(mesh); });
      envCache[name] = pmrem.fromScene(e, 0.035).texture;
    }
    scene.environment = envCache[name];
    scene.background = new T.Color(m.bg);
    post.uniforms.exposure.value = m.exp || 1; H.pageTint = m.page; document.documentElement.style.setProperty('--page-tint', m.page);
    const warm = name === 'amber';
    key.color.set(warm ? 0xffc890 : 0xfff1de); key.intensity = warm ? 1.0 : 2.4; rim.intensity = warm ? 0.4 : 1.1;
  };

  // ---- post: depth of field + filmic + grain -------------------------------------
  let rt = null, rtW = 0, rtH = 0;
  const postScene = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const post = new T.ShaderMaterial({
    uniforms: { tColor: { value: null }, tDepth: { value: null }, near: { value: cam.near }, far: { value: cam.far }, focus: { value: 5 }, aperture: { value: 1 }, texel: { value: new T.Vector2() }, time: { value: 0 }, grain: { value: 0.035 }, vig: { value: 0.55 }, exposure: { value: 1 }, tintA: { value: new T.Vector3(1, 1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tColor, tDepth; uniform float near, far, focus, aperture, time, grain, vig, exposure; uniform vec2 texel; uniform vec3 tintA;
      float lin(float z){ float ndc=z*2.0-1.0; return (2.0*near*far)/(far+near-ndc*(far-near)); }
      float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
      void main(){
        float d = lin(texture2D(tDepth,vUv).x);
        float coc = clamp(abs(d-focus)/max(0.2,d)*aperture*14.0, 0.0, 14.0);
        vec3 acc = texture2D(tColor,vUv).rgb; float wsum = 1.0;
        float ang = hash(vUv*vec2(913.0,517.0)+time)*6.2831;
        for(int i=1;i<28;i++){
          float fi=float(i); float r=sqrt(fi/28.0)*coc; float a=fi*2.39996+ang;
          vec2 o=vec2(cos(a),sin(a))*r*texel;
          float sd = lin(texture2D(tDepth,vUv+o).x);
          float scoc = clamp(abs(sd-focus)/max(0.2,sd)*aperture*14.0,0.0,14.0);
          float w = smoothstep(r-1.0, r+1.0, scoc) * (sd>d-0.05?1.0:0.35);
          vec3 s = texture2D(tColor,vUv+o).rgb; float lum=dot(s,vec3(0.3,0.5,0.2));
          w *= 1.0+lum*lum*1.5;
          acc += s*w; wsum += w;
        }
        vec3 c = acc/wsum * exposure * tintA;
        float v = 1.0 - vig*pow(length((vUv-0.5)*vec2(1.0,0.82))*1.35, 2.2);
        c *= v;
        c = aces(c);
        c = pow(c, vec3(1.0/2.2));
        c += (hash(vUv*vec2(1731.0,977.0)+fract(time)*19.0)-0.5)*grain;
        gl_FragColor = vec4(c,1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), post));
  H.post = post;
  function ensureRT(w, h) {
    if (rt && rtW === w && rtH === h) return;
    if (rt) { rt.depthTexture.dispose(); rt.dispose(); }
    rt = new T.WebGLRenderTarget(w, h, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, type: T.HalfFloatType, format: T.RGBAFormat });
    rt.depthTexture = new T.DepthTexture(w, h); rt.depthTexture.type = T.UnsignedIntType;
    rtW = w; rtH = h;
  }

  // ---- camera rig ---------------------------------------------------------------
  const orbit = H.orbit = { yaw: 0.5, pitch: 0.18, dist: 7, tx: 0, ty: 0.4, tz: 0, tYaw: 0.5, tPitch: 0.18, tDist: 7, tTx: 0, tTy: 0.4, tTz: 0, focus: 7, tFocus: 7, userYaw: 0, userPitch: 0, userDist: 1, px: 0, py: 0 };
  H.frame = function (f, snap) {
    orbit.tTx = f.pos[0]; orbit.tTy = f.pos[1]; orbit.tTz = f.pos[2]; orbit.tDist = f.dist; orbit.tYaw = f.yaw; orbit.tPitch = f.pitch; orbit.tFocus = f.dist * (f.focusK || 1);
    orbit.userYaw = orbit.userPitch = 0; orbit.userDist = 1;
    if (snap) { orbit.tx = f.pos[0]; orbit.ty = f.pos[1]; orbit.tz = f.pos[2]; orbit.dist = f.dist; orbit.yaw = f.yaw; orbit.pitch = f.pitch; orbit.focus = orbit.tFocus; }
  };
  function placeCam(dt) {
    const k = 1 - Math.pow(0.0015, dt);
    const L = (a, b) => a + (b - a) * k;
    orbit.tx = L(orbit.tx, orbit.tTx); orbit.ty = L(orbit.ty, orbit.tTy); orbit.tz = L(orbit.tz, orbit.tTz);
    orbit.dist = L(orbit.dist, orbit.tDist * orbit.userDist); orbit.yaw = L(orbit.yaw, orbit.tYaw + orbit.userYaw + orbit.px * 0.10);
    orbit.pitch = L(orbit.pitch, clamp(orbit.tPitch + orbit.userPitch - orbit.py * 0.07, -1.3, 1.45)); orbit.focus = L(orbit.focus, orbit.tFocus * orbit.userDist + (H.focusBias || 0));
    const cp = Math.cos(orbit.pitch);
    cam.position.set(orbit.tx + Math.sin(orbit.yaw) * cp * orbit.dist, orbit.ty + Math.sin(orbit.pitch) * orbit.dist, orbit.tz + Math.cos(orbit.yaw) * cp * orbit.dist);
    cam.lookAt(orbit.tx, orbit.ty, orbit.tz);
    // keep the key light attached to the view so every angle is lit
    key.position.set(orbit.tx + 3.2 + Math.sin(orbit.yaw) * 2, orbit.ty + 5, orbit.tz + 4 + Math.cos(orbit.yaw) * 2); key.target.position.set(orbit.tx, orbit.ty, orbit.tz);
  }
  H.nudge = (dy, dp, dz) => { orbit.userYaw += dy; orbit.userPitch = clamp(orbit.userPitch + dp, -1.2, 1.2); if (dz) orbit.userDist = clamp(orbit.userDist * (1 + dz), 0.18, 3.5); };

  // pointer: drag to orbit, wheel to dolly, hover parallax
  const holo = document.getElementById('hologramCanvas');
  let drag = null, moved = 0;
  holo.addEventListener('pointerdown', e => { if (!H.active || A.hudDown) return; drag = { x: e.clientX, y: e.clientY, yaw: orbit.userYaw, pitch: orbit.userPitch }; moved = 0; });
  window.addEventListener('pointermove', e => {
    const r = holo.getBoundingClientRect(); orbit.px = ((e.clientX - r.left) / r.width - 0.5) * 2; orbit.py = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!drag || !H.active) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
    orbit.userYaw = drag.yaw - dx * 0.006; orbit.userPitch = clamp(drag.pitch + dy * 0.005, -1.2, 1.2);
  });
  window.addEventListener('pointerup', () => { drag = null; });
  holo.addEventListener('wheel', e => { if (!H.active) return; e.preventDefault(); e.stopImmediatePropagation(); orbit.userDist = clamp(orbit.userDist * (1 + e.deltaY * 0.0012), 0.12, 3.5); }, { passive: false, capture: true });
  holo.addEventListener('dblclick', () => { orbit.userYaw = orbit.userPitch = 0; orbit.userDist = 1; });

  // ---- specimen lifecycle -------------------------------------------------------
  H.clear = function () {
    while (root.children.length) { const o = root.children[0]; root.remove(o); o.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) { (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { ['map', 'bumpMap', 'roughnessMap', 'normalMap', 'alphaMap'].forEach(k => m[k] && m[k].dispose && m[k].dispose()); m.dispose(); }); } }); }
    H.parts = []; H.updaters = []; scene.fog = null;
    const rm = []; scene.traverse(n => { if (n.userData && n.userData.heroLight) rm.push(n); }); rm.forEach(n => scene.remove(n));
  };
  // builders register: { kind, makeGenome(seed), build(genome, ctx), labels, ... }
  H.register = (kind, b) => { H.builders[kind] = b; };
  H.start = function (kind, seed, genome, opts) {
    const b = H.builders[kind]; if (!b) return;
    opts = opts || {};
    H.kind = kind; H.seed = seed >>> 0 || 1; H.active = true;
    H.genome = genome || b.makeGenome(H.seed);
    H.rebuild(true);
    if (!opts.keepSel) H.sel = -1;
    if (H.sel < 0) { H.overview(); const b2 = H.builders[kind]; H.frame(b2.overview, true); } else H.select(H.sel, true);
    A.emit('hero', kind, H.seed);
  };
  H.rebuild = function (snap) {
    const b = H.builders[H.kind]; if (!b) return;
    H.clear(); H.setMood(b.mood(H.genome)); H.buildId = (H.buildId || 0) + 1;
    b.build(H.genome, { root, scene, H, rng: H.rng(H.seed ^ 0x9e3779b9), id: H.buildId });
    if (snap) { const f = (H.parts[H.sel] && H.parts[H.sel].focus) || b.overview; H.frame(f, true); }
  };
  let rbT = 0; H.rebuildSoon = function (ms) { clearTimeout(rbT); rbT = setTimeout(() => { H.rebuild(false); if (H.sel >= 0) H.frame(H.parts[H.sel].focus, false); }, ms || 180); };
  H.select = function (i, snap) {
    if (!H.parts.length) return; if (H.sel < 0 && i < 0) i = H.parts.length - 1; H.sel = ((i % H.parts.length) + H.parts.length) % H.parts.length;
    H.frame(H.parts[H.sel].focus, snap); A.emit('hero-select', H.parts[H.sel]);
  };
  H.cyclePart = d => H.select(H.sel < 0 ? (d < 0 ? H.parts.length - 1 : 0) : H.sel + (d || 1));
  H.overview = () => { const b = H.builders[H.kind]; if (b) H.frame(b.overview); };
  H.reroll = function () { H.start(H.kind, (Math.random() * 4294967295) >>> 0, null, { keepSel: true }); A.emit('reroll', H.seed); };
  H.setGenome = function (patch, rebuild) { Object.assign(H.genome, patch); if (rebuild) H.rebuild(false); A.emit('genome', H.genome); };

  // ---- frame --------------------------------------------------------------------
  let lastT = performance.now(), fpsAcc = 0, fpsN = 0;
  H.renderFrame = function (target, w, h, tms) {
    const aspect = w / h; if (cam.aspect !== aspect) { cam.aspect = aspect; cam.updateProjectionMatrix(); }
    const ss = target ? 1 : 1.25; const rw = Math.round(w * ss), rh = Math.round(h * ss);
    ensureRT(rw, rh);
    renderer.setRenderTarget(rt); renderer.setClearColor(scene.background || 0x000000, 1); renderer.clear(); renderer.render(scene, cam);
    post.uniforms.tColor.value = rt.texture; post.uniforms.tDepth.value = rt.depthTexture;
    post.uniforms.near.value = cam.near; post.uniforms.far.value = cam.far; post.uniforms.focus.value = Math.max(0.15, orbit.focus); post.uniforms.aperture.value = H.noDOF ? 0 : (H.aperture || 0.6);
    post.uniforms.texel.value.set(1 / rw, 1 / rh); post.uniforms.time.value = tms;
    renderer.setRenderTarget(target || null); renderer.render(postScene, postCam);
    renderer.setRenderTarget(null); renderer.setClearColor(0x05070a, 1);
  };
  H.setLock = function (f) { H.lockRef = f || null; if (f) H.frame(f); else if (H.sel >= 0 && H.parts[H.sel]) H.frame(H.parts[H.sel].focus); else H.overview(); };
  H.tick = function () {
    const now = performance.now(); const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; H.t += dt;
    fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { H.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    (H.updaters || []).forEach(u => u(dt, H.t));
    if (H.lockRef) { orbit.userYaw = orbit.userPitch = 0; orbit.userDist = 1; orbit.px = orbit.py = 0; H.focusBias = 0; }
    placeCam(dt);
    const w = A.canvas.clientWidth, h = A.canvas.clientHeight; renderer.setSize(w, h, false);
    H.renderFrame(null, w, h, H.t);
  };
  // offscreen capture (for snapshot cards and the critic)
  H.capture = function (w, h) {
    const target = new T.WebGLRenderTarget(w, h, { minFilter: T.LinearFilter, magFilter: T.LinearFilter });
    const prevAspect = cam.aspect; H.renderFrame(target, w, h, H.t);
    const buf = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(target, 0, 0, w, h, buf); target.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const id = x.createImageData(w, h);
    for (let y = 0; y < h; y++) id.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    x.putImageData(id, 0, 0);
    cam.aspect = prevAspect; cam.updateProjectionMatrix(); return c;
  };

  // ---- shared procedural texture helpers ------------------------------------------
  H.noiseTex = function (size, fn, srgb, repeat) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); const id = x.createImageData(size, size);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const v = fn(i / size, j / size); const o = (j * size + i) * 4; id.data[o] = v[0]; id.data[o + 1] = v[1]; id.data[o + 2] = v[2]; id.data[o + 3] = 255; }
    x.putImageData(id, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; if (repeat) t.repeat.set(repeat, repeat); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
  };
  // cheap value noise
  const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  H.vnoise = function (x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return hash2(xi, yi) * (1 - u) * (1 - v) + hash2(xi + 1, yi) * u * (1 - v) + hash2(xi, yi + 1) * (1 - u) * v + hash2(xi + 1, yi + 1) * u * v; };
  H.fbm = function (x, y, o) { let a = 0.5, s = 0, f = 1; for (let i = 0; i < (o || 4); i++) { s += a * H.vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; };
  // swept tube with radius profile along a curve
  H.sweep = function (curve, radiusFn, seg, rad, capEnds) {
    seg = seg || 24; rad = rad || 10; const pos = [], idx = [], uv = [];
    const frames = curve.computeFrenetFrames(seg, false);
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, p = curve.getPointAt(u), r = radiusFn(u), N = frames.normals[i], B = frames.binormals[i];
      for (let j = 0; j <= rad; j++) { const a = j / rad * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); pos.push(p.x + (N.x * c + B.x * s) * r, p.y + (N.y * c + B.y * s) * r, p.z + (N.z * c + B.z * s) * r); uv.push(u, j / rad); }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  // thin-film iridescence injected into a standard material
  H.iridescent = function (mat, amount) {
    mat.userData.film = { value: amount };
    mat.envMapIntensity = 0.9 * (1 - 0.65 * (mat.userData.dullK || 0)); mat.onBeforeCompile = sh => {
      sh.uniforms.uFilm = mat.userData.film; sh.uniforms.uFilmHue = mat.userData.hue = mat.userData.hue || { value: 0 };
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uFilm; uniform float uFilmHue;\nvec3 filmCol(float t,float h){ return 0.5+0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t*1.4+h)); }')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n float fr = 1.0 - abs(dot(normalize(vViewPosition), normal)); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.2 + 1.0 * filmCol(fr, uFilmHue)), uFilm * smoothstep(0.1, 0.95, fr));');
    };
    return mat;
  };
  H.ready = true;
})();
