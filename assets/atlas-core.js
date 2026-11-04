// ============================================================================
// STELLINE ATLAS CORE  (engine V5)
// The whole 407-second film as an addressable, segmented, relief-modelled scene.
//   data      : window.STELLINE_ATLAS  (per-second segments, tracked ids, priors)
//   frames    : assets/atlas/f/NNNN.jpg  (colour)   l/NNNN.png (labels)  d/NNNN.jpg (relief)
//   renderer  : every segment is its own mesh -> FILM / PARTS / RELIEF / STAGE are one pipeline
//   dials     : the five orb rings drive each segment:  SOLID FOCUS MORPH LUMA TINT
//   ladder    : SOLID climbs  FLAT > GRADIENT > RELIEF > MOSAIC > FILM  (primitive -> photographic)
// ============================================================================
(function () {
  'use strict';
  const D = window.STELLINE_ATLAS;
  if (!D || typeof THREE === 'undefined') return;

  const FW = D.w, FH = D.h;               // 480 x 270
  const WORLD_W = 16, WORLD_H = 9;
  const A = window.ATLAS = {
    data: D, t: 0, sec: -1, playing: false, speed: 1,
    view: 'film',                          // film | parts | relief | stage
    sel: null,                             // tid of selected segment (in frame) or stage item id
    hover: null,
    params: {},                            // tid -> [L1..R2] angles (deviation from truth lives here)
    truth: [165, 128.9, 123.1, 110, 110],      // ring angles that reproduce the film exactly
    compare: false,                        // fidelity heat overlay
    sonic: false, narrate: false,
    cache: new Map(), video: null,
    listeners: {},
  };
  A.on = (ev, fn) => { (A.listeners[ev] = A.listeners[ev] || []).push(fn); };
  A.emit = (ev, ...a) => (A.listeners[ev] || []).forEach(fn => { try { fn(...a); } catch (e) { console.error(e); } });

  // --------------------------------------------------------------------------
  // DIAL MAPPING  ring angle (deg) -> physical model parameter
  // --------------------------------------------------------------------------
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  A.dialValues = function (ang) {
    const a = ang.map(v => ((v % 360) + 360) % 360);
    const c = a.map(v => (v > 215 ? 0 : v));            // past the end stop -> wraps to the bottom stop
    const lvl = clamp((c[0] - 20) / 145, 0, 1) * 4;     // 0..4 ladder level
    const fx = clamp((c[1] - 20) / 165, 0, 1);
    const focus = fx;                                    // 0.66 = truth
    const blur = fx < 0.65 ? (1 - fx / 0.65) * 7.0 : 0;  // px
    const sharp = fx > 0.67 ? (fx - 0.67) / 0.33 : 0;
    const morph = clamp((c[2] - 20) / 165, 0, 1) * 1.6;
    const gain = Math.pow(2, (clamp(c[3], 20, 200) - 110) / 90 * 1.6);
    const temp = (clamp(c[4], 20, 200) - 110) / 90;
    return { lvl, focus, blur, sharp, morph, gain, temp };
  };
  A.LEVEL_NAMES = D.levels;
  A.levelAngle = lv => 20 + 145 * clamp(lv / 4, 0, 1);

  A.getParams = function (key) {
    if (!A.params[key]) A.params[key] = A.truth.slice();
    return A.params[key];
  };
  A.deviation = function (key) {
    const p = A.getParams(key), t = A.truth;
    let s = 0; for (let i = 0; i < 5; i++) s += Math.abs(p[i] - t[i]);
    return s / 5;
  };

  // --------------------------------------------------------------------------
  // THREE renderer on its own canvas (the legacy engines keep webglCanvas)
  // --------------------------------------------------------------------------
  const stage = document.querySelector('.hologram-stage');
  const canvas = document.createElement('canvas');
  canvas.id = 'atlasCanvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;z-index:1;';
  stage.insertBefore(canvas, stage.firstChild);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x05070a, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 400);
  const pickTarget = new THREE.WebGLRenderTarget(256, 144, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  A.renderer = renderer; A.scene = scene; A.camera = camera; A.canvas = canvas;

  // --------------------------------------------------------------------------
  // SHADERS
  // --------------------------------------------------------------------------
  const VERT = `
    uniform sampler2D uDepth; uniform vec4 uRect; uniform float uRelief; uniform float uMorph;
    uniform float uZoff; uniform float uHasDepth;
    varying vec2 vUv; varying vec2 vLocal; varying float vD;
    void main(){
      vLocal = uv;
      vUv = uRect.xy + uv * uRect.zw;
      float d = uHasDepth > 0.5 ? texture2D(uDepth, vUv).r : 0.5;
      vD = d;
      vec3 p = position;
      p.z += (d - 0.5) * uRelief * uMorph + uZoff;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;

  const FRAG = `
    precision highp float;
    uniform sampler2D uFrame, uFrameB, uLabel, uDepth;
    uniform float uMix, uSeg, uHasLabel, uHasDepth;
    uniform float uLevel, uBlur, uSharp, uGain, uTemp, uWire;
    uniform vec3 uBase, uGR, uGG, uGB;  // gradient: (cx-less) x,y coefs packed below
    uniform vec2 uGRy, uGGy, uGBy, uCent;
    uniform float uKr, uRelSeg;
    uniform float uOutline;        // 0 none, 1 faint, 2 selected
    uniform vec3 uOutlineCol;
    uniform float uSelGlow, uDim, uPick, uTime, uHeat, uGrain, uPickId;
    uniform vec2 uTexel;
    uniform float uAlphaAll;       // stage items: alpha from label (>0) rather than id match
    varying vec2 vUv; varying vec2 vLocal; varying float vD;

    float lab(vec2 uv){ return floor(texture2D(uLabel, uv).r * 255.0 + 0.5); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }

    vec3 frameAt(vec2 uv, float lod){
      vec3 a = textureLod(uFrame, uv, lod).rgb;
      if (uMix > 0.001) a = mix(a, textureLod(uFrameB, uv, lod).rgb, uMix);
      return a;
    }
    void main(){
      float id = lab(vUv);
      float inside;
      if (uHasLabel < 0.5) inside = 1.0;
      else if (uAlphaAll > 0.5) inside = step(0.5, id) * step(abs(id - uSeg), 0.5);
      else inside = step(abs(id - uSeg), 0.5);
      if (inside < 0.5) discard;
      if (uPick > 0.5) { gl_FragColor = vec4((uPickId + 1.0) / 255.0, 1.0, 1.0, 1.0); return; }

      // ---- model ladder -------------------------------------------------
      vec2 xy = vec2(vUv.x - uCent.x, (1.0 - vUv.y) - uCent.y);
      vec3 flatC = uBase;
      vec3 grad  = flatC + vec3(dot(uGR.xy, xy), dot(uGG.xy, xy), dot(uGB.xy, xy)) / 255.0;
      vec3 relsh = grad + (uKr / 255.0) * (vD - uRelSeg);
      vec3 mos   = frameAt(vUv, 3.2);
      vec3 film  = frameAt(vUv, 0.0);
      if (uBlur > 0.05) {
        float lod = log2(1.0 + uBlur * 0.9);
        vec3 acc = vec3(0.0); float r = uBlur;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398 + uTime * 0.0;
          acc += frameAt(vUv + vec2(cos(a), sin(a)) * uTexel * r * 0.7, lod);
        }
        film = mix(film, (acc + frameAt(vUv, lod)) / 9.0, clamp(uBlur / 3.0, 0.0, 1.0));
      }
      if (uSharp > 0.001) film = film + (film - frameAt(vUv, 1.6)) * uSharp * 1.6;
      float lv = uLevel;
      vec3 c = flatC;
      c = mix(c, grad,  clamp(lv, 0.0, 1.0));
      c = mix(c, relsh, clamp(lv - 1.0, 0.0, 1.0));
      c = mix(c, mos,   clamp(lv - 2.0, 0.0, 1.0));
      c = mix(c, film,  clamp(lv - 3.0, 0.0, 1.0));
      // primitive proxy: depth contour lines while below GRADIENT
      float prim = 1.0 - clamp(lv, 0.0, 1.0);
      if (prim > 0.01) {
        float cl = abs(fract(vD * 14.0) - 0.5);
        float line = smoothstep(0.42, 0.5, cl) * 0.5 + smoothstep(0.47, 0.5, cl) * 0.35;
        c = mix(c, c * 0.55 + vec3(0.18, 0.55, 0.5) * line, prim * 0.9);
      }
      // grading
      c *= uGain;
      c.r *= 1.0 + 0.30 * uTemp; c.b *= 1.0 - 0.40 * uTemp; c.g *= 1.0 + 0.04 * uTemp;
      c = mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))) * 0.55, uDim);
      if (uGrain > 0.0) c += (hash(vUv * 480.0 + uTime) - 0.5) * uGrain;
      // outline from label neighbours
      if (uOutline > 0.5) {
        float e = 0.0;
        vec2 o = uTexel * 1.0;
        e += abs(lab(vUv + vec2(o.x, 0.0)) - id) > 0.5 ? 1.0 : 0.0;
        e += abs(lab(vUv - vec2(o.x, 0.0)) - id) > 0.5 ? 1.0 : 0.0;
        e += abs(lab(vUv + vec2(0.0, o.y)) - id) > 0.5 ? 1.0 : 0.0;
        e += abs(lab(vUv - vec2(0.0, o.y)) - id) > 0.5 ? 1.0 : 0.0;
        float k = clamp(e, 0.0, 1.0);
        c = mix(c, uOutlineCol, k * (uOutline > 1.5 ? 0.95 : 0.35));
      }
      if (uSelGlow > 0.0) c += uOutlineCol * uSelGlow * (0.10 + 0.06 * sin(uTime * 3.0));
      if (uHeat > 0.0) c = mix(c, vec3(1.0, 0.25, 0.1), clamp(uHeat, 0.0, 1.0) * 0.6);
      gl_FragColor = vec4(c, 1.0);
    }`;

  function makeMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, transparent: false,
      uniforms: {
        uFrame: { value: null }, uFrameB: { value: null }, uLabel: { value: null }, uDepth: { value: null },
        uMix: { value: 0 }, uSeg: { value: 0 }, uHasLabel: { value: 0 }, uHasDepth: { value: 0 },
        uLevel: { value: 4 }, uBlur: { value: 0 }, uSharp: { value: 0 }, uGain: { value: 1 }, uTemp: { value: 0 }, uWire: { value: 0 },
        uBase: { value: new THREE.Vector3(.5, .5, .5) },
        uGR: { value: new THREE.Vector3() }, uGG: { value: new THREE.Vector3() }, uGB: { value: new THREE.Vector3() },
        uGRy: { value: new THREE.Vector2() }, uGGy: { value: new THREE.Vector2() }, uGBy: { value: new THREE.Vector2() },
        uCent: { value: new THREE.Vector2(.5, .5) }, uKr: { value: 0 }, uRelSeg: { value: .5 },
        uOutline: { value: 0 }, uOutlineCol: { value: new THREE.Vector3(.22, .85, .75) },
        uSelGlow: { value: 0 }, uDim: { value: 0 }, uPick: { value: 0 }, uPickId: { value: 0 }, uTime: { value: 0 }, uHeat: { value: 0 }, uGrain: { value: 0 },
        uTexel: { value: new THREE.Vector2(1 / FW, 1 / FH) }, uAlphaAll: { value: 0 },
        uRect: { value: new THREE.Vector4(0, 0, 1, 1) }, uRelief: { value: 0 }, uMorph: { value: 1 }, uZoff: { value: 0 },
      },
    });
  }
  // three r13x injects GLSL3 conversion for WebGL2; textureLod is available there.
  const gridFull = new THREE.PlaneGeometry(WORLD_W, WORLD_H, 128, 72);
  const gridPart = new THREE.PlaneGeometry(1, 1, 56, 56);
  A.makeMaterial = makeMaterial; A.gridPart = gridPart;

  // --------------------------------------------------------------------------
  // FRAME RESOURCES  (colour texture, label canvas+data, depth texture)
  // --------------------------------------------------------------------------
  const pad = n => String(n).padStart(4, '0');
  function loadImg(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }
  function toCanvas(im) {
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    return { c, x };
  }
  function frameTexture(im) {
    const t = new THREE.Texture(im);
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
    t.encoding = THREE.LinearEncoding; t.needsUpdate = true; return t;
  }
  function getRes(sec) {
    sec = clamp(sec | 0, 0, D.n - 1);
    let r = A.cache.get(sec);
    if (r) { r.used = performance.now(); return r; }
    r = { sec, ready: false, used: performance.now() };
    A.cache.set(sec, r);
    const base = 'assets/atlas/';
    Promise.all([loadImg(`${base}f/${pad(sec)}.jpg`), loadImg(`${base}l/${pad(sec)}.png`), loadImg(`${base}d/${pad(sec)}.jpg`)])
      .then(([f, l, d]) => {
        r.frameImg = f; r.frame = frameTexture(f);
        const lc = toCanvas(l); r.labelCanvas = lc.c;
        const id = lc.x.getImageData(0, 0, lc.c.width, lc.c.height).data;
        r.labels = new Uint8Array(lc.c.width * lc.c.height);
        for (let i = 0; i < r.labels.length; i++) r.labels[i] = id[i * 4];
        r.label = new THREE.CanvasTexture(lc.c); r.label.minFilter = r.label.magFilter = THREE.NearestFilter; r.label.generateMipmaps = false;
        const dc = toCanvas(d); r.depthCanvas = dc.c;
        const dd = dc.x.getImageData(0, 0, dc.c.width, dc.c.height).data;
        r.depthData = new Uint8Array(dc.c.width * dc.c.height); for (let i = 0; i < r.depthData.length; i++) r.depthData[i] = dd[i * 4];
        r.dw = dc.c.width; r.dh = dc.c.height;
        const fc = toCanvas(f); r.frameData = fc.x.getImageData(0, 0, fc.c.width, fc.c.height).data;
        r.depth = new THREE.CanvasTexture(dc.c); r.depth.minFilter = r.depth.magFilter = THREE.LinearFilter; r.depth.generateMipmaps = false;
        r.ready = true; A.emit('res', sec);
      }).catch(e => { r.failed = true; console.warn('atlas frame failed', sec, e); });
    // LRU
    if (A.cache.size > 18) {
      const olds = [...A.cache.values()].filter(x => x.sec !== A.sec && !x.pinned).sort((a, b) => a.used - b.used);
      for (let i = 0; i < olds.length && A.cache.size > 18; i++) {
        const o = olds[i]; ['frame', 'label', 'depth'].forEach(k => o[k] && o[k].dispose && o[k].dispose()); A.cache.delete(o.sec);
      }
    }
    return r;
  }
  A.getRes = getRes;

  // --------------------------------------------------------------------------
  // FRAME PARTS  (one mesh per segment in the current second)
  // --------------------------------------------------------------------------
  const parts = [];                       // {mesh, seg}
  let partsSec = -2, partsRes = null;
  const root = new THREE.Group(); scene.add(root);
  A.root = root;
  const stageGroup = new THREE.Group(); scene.add(stageGroup); stageGroup.visible = false; A.stageGroup = stageGroup;

  function hexToVec(hex) { return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255]; }
  A.hexToVec = hexToVec;

  function applySegUniforms(u, seg, res, key) {
    const b = hexToVec(seg.rgb);
    u.uBase.value.set(b[0], b[1], b[2]);
    // gradient coefficients are in 0-255 units per unit image coordinate (R,G,B pairs x,y)
    u.uGR.value.set(seg.gr[0], seg.gr[1], 0); u.uGG.value.set(seg.gr[2], seg.gr[3], 0); u.uGB.value.set(seg.gr[4], seg.gr[5], 0);
    u.uCent.value.set(seg.cx, seg.cy);
    u.uKr.value = seg.kr; u.uRelSeg.value = seg.rel;
    u.uSeg.value = seg.i; u.uPickId.value = seg.i;
    u.uFrame.value = res.frame; u.uLabel.value = res.label; u.uDepth.value = res.depth;
    u.uHasLabel.value = 1; u.uHasDepth.value = 1;
  }
  A.applySegUniforms = applySegUniforms;

  function rebuildParts(sec) {
    parts.forEach(p => { root.remove(p.mesh); p.mesh.material.dispose(); });
    parts.length = 0;
    const S = D.sec[sec];
    partsRes = getRes(sec);
    S.segs.forEach(seg => {
      const mat = makeMaterial();
      const mesh = new THREE.Mesh(gridFull, mat);
      mesh.frustumCulled = false;
      root.add(mesh);
      parts.push({ mesh, seg, key: seg.tid });
    });
    partsSec = sec;
  }


  // --------------------------------------------------------------------------
  // VECTOR CONTOURS  (smooth iso-lines of each segment, crisp at any zoom)
  // --------------------------------------------------------------------------
  A.contours = function (res, seg) {
    res._ct = res._ct || {};
    if (res._ct[seg.i]) return res._ct[seg.i];
    const W = 480, H = 270, lab = res.labels;
    const bb = seg.bb; const x0 = Math.max(1, Math.floor(bb[0] * W) - 4), x1 = Math.min(W - 2, Math.ceil(bb[2] * W) + 4), y0 = Math.max(1, Math.floor(bb[1] * H) - 4), y1 = Math.min(H - 2, Math.ceil(bb[3] * H) + 4);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    let a = new Float32Array(w * h), b = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = lab[(y + y0) * W + x + x0] === seg.i ? 1 : 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let sum = 0, c = 0; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx >= 0 && xx < w) { sum += a[y * w + xx] * (dx === 0 ? 2 : 1); c += dx === 0 ? 2 : 1; } } b[y * w + x] = sum / c; }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let sum = 0, c = 0; for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy >= 0 && yy < h) { sum += b[yy * w + x] * (dy === 0 ? 2 : 1); c += dy === 0 ? 2 : 1; } } a[y * w + x] = sum / c; }
    }
    const out = [];
    const lerp = (v0, v1) => (0.5 - v0) / (v1 - v0);
    for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
      const tl = a[y * w + x], tr = a[y * w + x + 1], br = a[(y + 1) * w + x + 1], bl = a[(y + 1) * w + x];
      const ci = (tl > .5 ? 8 : 0) | (tr > .5 ? 4 : 0) | (br > .5 ? 2 : 0) | (bl > .5 ? 1 : 0);
      if (ci === 0 || ci === 15) continue;
      const T = () => [x + lerp(tl, tr), y], R = () => [x + 1, y + lerp(tr, br)], B = () => [x + lerp(bl, br), y + 1], L = () => [x, y + lerp(tl, bl)];
      let segs;
      switch (ci) {
        case 1: case 14: segs = [[L, B]]; break; case 2: case 13: segs = [[B, R]]; break; case 3: case 12: segs = [[L, R]]; break;
        case 4: case 11: segs = [[T, R]]; break; case 5: segs = [[L, T], [B, R]]; break; case 10: segs = [[L, B], [T, R]]; break;
        case 6: case 9: segs = [[T, B]]; break; case 7: case 8: segs = [[L, T]]; break;
      }
      segs.forEach(([p, q]) => { const P = p(), Q = q(); out.push((P[0] + x0 + 0.5) / W, (P[1] + y0 + 0.5) / H, (Q[0] + x0 + 0.5) / W, (Q[1] + y0 + 0.5) / H); });
    }
    return (res._ct[seg.i] = new Float32Array(out));
  };
  // project contour points to screen (follows relief displacement)
  const _p = new THREE.Vector3();
  A.contourScreen = function (res, seg, W, H, out) {
    const c = A.contours(res, seg); const n = c.length;
    const morph = A.dialValues(A.getParams(seg.tid)).morph;
    const rel = V.relief * morph, ex = V.explode;
    const order = D.sec[A.sec].segs.slice().sort((p, q) => p.rel - q.rel); const rank = order.indexOf(seg);
    const zoff = (seg.rel - 0.5) * ex * 6.0 + (rank - order.length / 2) * ex * 0.55;
    const dd = res.depthData, dw = res.dw, dh = res.dh;
    if (!out || out.length < n) out = new Float32Array(n);
    for (let i = 0; i < n; i += 2) {
      const u = c[i], v = c[i + 1];
      let z = zoff;
      if (rel > 0.01) { const d = dd[Math.min(dh - 1, (v * dh) | 0) * dw + Math.min(dw - 1, (u * dw) | 0)] / 255; z += (d - 0.5) * rel; }
      _p.set((u - 0.5) * WORLD_W, (0.5 - v) * WORLD_H, z).project(camera);
      out[i] = (_p.x * 0.5 + 0.5) * W; out[i + 1] = (-_p.y * 0.5 + 0.5) * H;
    }
    return out;
  };

  // --------------------------------------------------------------------------
  // VIEW STATE (smoothly animated)
  // --------------------------------------------------------------------------
  const VIEWS = {
    film:   { relief: 0.0, explode: 0.0, yaw: 0.0,  pitch: 0.0,  dist: 1.0, auto: false },
    parts:  { relief: 1.6, explode: 1.0, yaw: -0.52, pitch: 0.18, dist: 1.25, auto: false },
    relief: { relief: 3.4, explode: 0.0, yaw: -0.28, pitch: 0.10, dist: 1.0, auto: true },
    stage:  { relief: 0.0, explode: 0.0, yaw: 0.0, pitch: 0.12, dist: 1.0, auto: false },
  };
  const V = { relief: 0, explode: 0, yaw: 0, pitch: 0, dist: 1, userYaw: 0, userPitch: 0, userDist: 1, dragging: false };
  A.V = V; A.VIEWS = VIEWS;

  A.setView = function (v, quiet) {
    if (!VIEWS[v]) return;
    A.view = v;
    root.visible = v !== 'stage';
    stageGroup.visible = v === 'stage' || v === 'stage';
    if (v !== 'stage' && A.stageGroup) stageGroup.visible = false;
    if (v === 'stage') stageGroup.visible = true;
    V.userYaw = 0; V.userPitch = 0; V.userDist = 1;
    if (!quiet && window.playMicroSwitchClick) window.playMicroSwitchClick(true, 140 + ['film', 'parts', 'relief', 'stage'].indexOf(v) * 60);
    A.emit('view', v);
  };

  // fit distance so frame fills canvas
  function fitDist() {
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const hFit = (WORLD_H * 1.0) / 2 / Math.tan(vf / 2);
    const wFit = (WORLD_W * 1.0) / 2 / Math.tan(vf / 2) / aspect;
    return Math.max(hFit, wFit);
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  A.resize = resize;

  // --------------------------------------------------------------------------
  // SEGMENT ACCESS
  // --------------------------------------------------------------------------
  A.curSecData = () => D.sec[clamp(A.sec, 0, D.n - 1)];
  A.segByTid = tid => { const s = A.curSecData(); return s ? s.segs.find(g => g.tid === tid) : null; };
  A.salience = g => g.a * (0.6 + g.rel) * (g.cls === 'FACE' ? 2.2 : g.cls === 'HAIR' ? 1.2 : 1) + (g.p > .5 ? .05 : 0);
  A.segsRanked = () => A.curSecData().segs.slice().sort((a, b) => A.salience(b) - A.salience(a));
  A.chapterAt = t => { let c = D.chapters[0]; for (const ch of D.chapters) if (t >= ch.t) c = ch; return c; };
  A.shotAt = t => { for (let i = 0; i < D.shots.length; i++) if (t < D.shots[i][1]) return i; return D.shots.length - 1; };

  // --------------------------------------------------------------------------
  // TIME
  // --------------------------------------------------------------------------
  A.seek = function (t, opts) {
    opts = opts || {};
    t = clamp(t, 0, D.dur - 0.05);
    const secNew = Math.floor(t);
    A.t = t;
    if (A.video && !opts.fromVideo) { try { A.video.currentTime = t; } catch (e) { } }
    if (secNew !== A.sec) {
      const prevShot = A.sec >= 0 ? D.sec[A.sec].shot : -1;
      A.sec = secNew;
      A.emit('sec', secNew, prevShot !== D.sec[secNew].shot);
    }
  };
  A.step = (ds) => A.seek(A.t + ds);
  A.nextShot = function (dir) {
    const sh = A.shotAt(A.t); const cur = D.shots[sh];
    let target;
    if (dir > 0) target = sh + 1 < D.shots.length ? D.shots[sh + 1][0] : cur[0];
    else target = (A.t - cur[0] > 1.2) ? cur[0] : (sh > 0 ? D.shots[sh - 1][0] : 0);
    A.seek(target + 0.01);
  };
  A.nextChapter = function (dir) {
    let idx = 0; D.chapters.forEach((c, i) => { if (A.t >= c.t - 0.001) idx = i; });
    const n = (idx + (dir > 0 ? 1 : (A.t - D.chapters[idx].t > 2 ? 0 : -1)) + D.chapters.length) % D.chapters.length;
    A.seek(D.chapters[n].t + 0.01);
  };

  // --------------------------------------------------------------------------
  // SELECTION
  // --------------------------------------------------------------------------
  A.select = function (tid, quiet) {
    A.sel = tid;
    const seg = tid ? A.segByTid(tid) : null;
    if (seg) syncRingsToSegment(seg);
    A.emit('select', seg, quiet);
  };
  A.cycleSel = function (dir) {
    const list = A.segsRanked();
    if (!list.length) return;
    let i = list.findIndex(g => g.tid === A.sel);
    i = (i + (dir || 1) + list.length) % list.length;
    A.select(list[i].tid);
  };
  A.selectNode = function (n) {            // orb nodes 1-4 = four most salient parts
    const list = A.segsRanked(); if (list[n]) A.select(list[n].tid);
  };

  function syncRingsToSegment(seg) {
    if (!window.state || !window.setRingAngle) return;
    const p = A.getParams(seg.tid);
    window.state._syncingNode = true;
    for (let r = 0; r < 5; r++) window.setRingAngle(r, p[r], false);
    window.state._syncingNode = false;
  }
  A.syncRings = () => { const s = A.sel && A.segByTid(A.sel); if (s) syncRingsToSegment(s); };

  // called by the orb whenever a ring moves (index.html patches setRingAngle)
  A.onRing = function (ringIdx, angle) {
    if (A.hero && A.hero.active && A.mode && A.mode !== 'film') { const b = A.hero.builders[A.hero.kind]; if (b && b.onDial) b.onDial(ringIdx, angle); A.emit('dial', ringIdx, angle); return; }
    if (A.stageSel) { A.stageSel.dials[ringIdx] = angle; A.emit('dial', ringIdx, angle); return; }
    if (!A.sel) return;
    A.getParams(A.sel)[ringIdx] = angle;
    A.emit('dial', ringIdx, angle);
    const nowT = performance.now(); if (nowT - (A._lm || 0) > 600) { A._lm = nowT; A.emit('loop', 'MODEL'); }
  };

  // --------------------------------------------------------------------------
  // PICKING (GPU id pass)
  // --------------------------------------------------------------------------
  const pickBuf = new Uint8Array(4);
  A.pickAt = function (clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const nx = (clientX - r.left) / r.width, ny = (clientY - r.top) / r.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return -1;
    renderScene(true);
    const px = Math.floor(nx * pickTarget.width), py = Math.floor((1 - ny) * pickTarget.height);
    renderer.readRenderTargetPixels(pickTarget, px, py, 1, 1, pickBuf);
    return pickBuf[3] > 0 && pickBuf[0] > 0 ? pickBuf[0] - 1 : -1;
  };
  A.pickStageItem = null; // set by builder

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  const tmpV = new THREE.Vector3();
  function updatePartUniforms(time, picking) {
    const S = D.sec[A.sec];
    const frac = A.t - A.sec;
    const res = partsRes;
    const nextRes = A.sec + 1 < D.n ? getRes(A.sec + 1) : null;
    const mixB = (!A.video && nextRes && nextRes.ready && frac > 0.55) ? THREE.MathUtils.smoothstep(frac, 0.55, 1.0) * 0.9 : 0;
    const order = S.segs.slice().sort((a, b) => a.rel - b.rel);
    const hov = A.hover;
    parts.forEach((p) => {
      const u = p.mesh.material.uniforms, seg = p.seg;
      applySegUniforms(u, seg, res, p.key);
      if (A.video && A.videoTex) { u.uFrame.value = A.videoTex; }
      u.uFrameB.value = (mixB > 0 && nextRes) ? nextRes.frame : res.frame;
      u.uMix.value = mixB;
      const dv = A.dialValues(A.getParams(p.key));
      u.uLevel.value = dv.lvl; u.uBlur.value = dv.blur; u.uSharp.value = dv.sharp; u.uGain.value = dv.gain; u.uTemp.value = dv.temp;
      u.uMorph.value = dv.morph;
      u.uRelief.value = V.relief;
      const rank = order.indexOf(seg);
      u.uZoff.value = (seg.rel - 0.5) * V.explode * 6.0 + (rank - order.length / 2) * V.explode * 0.55;
      u.uTime.value = time; u.uPick.value = picking ? 1 : 0;
      const isSel = A.sel === seg.tid, isHov = hov === seg.tid;
      const overlay = A.view === 'film' || A.view === 'parts' || A.compare;
      if (A.noOverlay) { u.uOutline.value = 0; u.uSelGlow.value = 0; u.uDim.value = 0; u.uHeat.value = 0; return; }
      u.uOutline.value = 0;
      u.uSelGlow.value = isSel ? 1 : (isHov ? 0.5 : 0);
      u.uDim.value = (A.sel && !isSel && A.focusDim) ? 0.55 : 0;
      u.uHeat.value = A.compare && A.heat ? (A.heat[seg.tid] || 0) : 0;
      u.uGrain.value = 0.0;
      u.uTexel.value.set(1 / FW, 1 / FH);
    });
  }

  const PAD_T = 46; const padB = () => (A.view === 'stage' ? 134 : 76);
  function placeCamera() {
    const v = VIEWS[A.view];
    const tgt = v;
    const k = 0.085;
    V.relief += (tgt.relief - V.relief) * k;
    V.explode += (tgt.explode - V.explode) * k;
    let ty = tgt.yaw, tp = tgt.pitch;
    if (tgt.auto && !V.dragging && !V.userMoved) { ty += Math.sin(A.time * 0.45) * 0.20; tp += Math.sin(A.time * 0.31) * 0.05; }
    V.yaw += ((ty + V.userYaw) - V.yaw) * k;
    V.pitch += ((tp + V.userPitch) - V.pitch) * k;
    const baseD = fitDist() * (canvas.clientHeight / Math.max(60, canvas.clientHeight - PAD_T - padB()));
    const td = baseD * tgt.dist * V.userDist;
    V.dist += ((td) - V.dist) * k;
    if (!V.inited) { V.dist = td; V.inited = true; }
    const cx = Math.sin(V.yaw) * Math.cos(V.pitch) * V.dist;
    const cy = Math.sin(V.pitch) * V.dist;
    const cz = Math.cos(V.yaw) * Math.cos(V.pitch) * V.dist;
    camera.position.set(cx, cy, cz);
    camera.lookAt(0, 0, 0);
    const H = canvas.clientHeight, Wd = canvas.clientWidth;
    camera.setViewOffset(Wd, H, 0, (padB() - PAD_T) / 2, Wd, H);
  }

  function renderScene(picking) {
    resize();
    if (!picking) { placeCamera(); }
    if (A.view !== 'stage') {
      if (A.sec !== partsSec && A.sec >= 0) rebuildParts(A.sec);
      if (partsRes && partsRes.ready && A.sec === partsSec) {
        updatePartUniforms(A.time, picking);
        root.visible = true;
      } else root.visible = false;
    }
    if (A.view === 'stage' && A.stageUpdate) A.stageUpdate(A.time, picking);
    if (picking) {
      renderer.setRenderTarget(pickTarget); renderer.setClearColor(0x000000, 0); renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.setClearColor(0x05070a, 1);
    } else {
      renderer.render(scene, camera);
    }
  }

  // --------------------------------------------------------------------------
  // OFFSCREEN RENDER for the critic (straight-on film camera, no overlays)
  // --------------------------------------------------------------------------
  const camFilm = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 400);
  camFilm.position.set(0, 0, (WORLD_H / 2) / Math.tan(THREE.MathUtils.degToRad(15))); camFilm.lookAt(0, 0, 0);
  const rtCache = {};
  A.renderOffscreen = function (w, h, mode, hideTids) {
    const key = w + 'x' + h;
    const rt = rtCache[key] || (rtCache[key] = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true }));
    const saved = { relief: V.relief, explode: V.explode, view: A.view, nov: A.noOverlay, rv: root.visible, sv: stageGroup.visible, cam: camera.position.clone(), asp: camera.aspect };
    A.noOverlay = true; V.relief = 0; V.explode = 0;
    const useCam = mode === 'stage' ? camera : camFilm;
    if (mode === 'frame') {
      root.visible = true; stageGroup.visible = false;
      const sv = V.relief; updatePartUniforms(A.time, false);
      if (hideTids) parts.forEach(p => { p.mesh.visible = !hideTids.includes(p.key); });
    } else {
      root.visible = false; stageGroup.visible = true;
      if (A.stageUpdate) A.stageUpdate(A.time, false, true);
    }
    if (mode === 'stage') { camera.aspect = 16 / 9; camera.position.copy(A.stageCamPose || camera.position); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); }
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, useCam); renderer.setRenderTarget(null); renderer.setClearColor(0x05070a, 1);
    const buf = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    // flip vertically
    const out = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) out.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    A.noOverlay = saved.nov; V.relief = saved.relief; V.explode = saved.explode; root.visible = saved.rv; stageGroup.visible = saved.sv;
    parts.forEach(p => { p.mesh.visible = true; });
    camera.aspect = saved.asp; camera.position.copy(saved.cam); camera.updateProjectionMatrix();
    return out;
  };
  A.partsRef = parts;
  A.render = renderScene;
  A.time = 0;

  // --------------------------------------------------------------------------
  // PLAYBACK  (1 Hz atlas playhead, or real video when footage is loaded)
  // --------------------------------------------------------------------------
  A.togglePlay = function () {
    A.playing = !A.playing;
    if (A.video) { A.playing ? A.video.play() : A.video.pause(); }
    A.emit('play', A.playing);
  };
  let lastTick = performance.now();
  function advance() {
    const now = performance.now(); const dt = Math.min(0.1, (now - lastTick) / 1000); lastTick = now;
    A.time += dt;
    if (A.playing) {
      if (A.video && !A.video.paused) A.seek(A.video.currentTime, { fromVideo: true });
      else A.seek(A.t + dt * A.speed);
      if (A.t >= D.dur - 0.1) { A.playing = false; A.emit('play', false); }
    }
    // prefetch
    if (A.sec >= 0) { getRes(A.sec); if (A.sec + 1 < D.n) getRes(A.sec + 1); if (A.sec > 0) getRes(A.sec - 1); }
  }
  A.advance = advance;

  // optional local footage (never uploaded anywhere)
  A.loadVideo = function (file) {
    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    const v = document.createElement('video'); v.src = url; v.muted = false; v.playsInline = true; v.crossOrigin = 'anonymous'; v.preload = 'auto';
    v.addEventListener('loadeddata', () => {
      A.video = v; A.videoTex = new THREE.VideoTexture(v);
      A.videoTex.minFilter = THREE.LinearMipmapLinearFilter; A.videoTex.generateMipmaps = true;
      v.currentTime = A.t; A.emit('video', true);
    });
    v.load();
  };

  // --------------------------------------------------------------------------
  // CAMERA INTERACTION (orbit / click-to-select) on the overlay canvas
  // --------------------------------------------------------------------------
  const holo = document.getElementById('hologramCanvas');
  let down = null, moved = 0, hoverT = 0;
  holo.addEventListener('pointerdown', e => { if (window.state && state.engineVersion !== 'v5') return; if (A.hudDown || (A.hero && A.hero.active && A.mode !== 'film')) return; down = { x: e.clientX, y: e.clientY, yaw: V.userYaw, pitch: V.userPitch }; moved = 0; V.dragging = true; });
  window.addEventListener('pointermove', e => {
    if (window.state && state.engineVersion !== 'v5') return;
    if (down) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      if (A.view !== 'film' && moved > 4 && !(A.stageDrag && A.stageDrag.active)) {
        V.userYaw = clamp(down.yaw + dx * 0.006, -1.3, 1.3); V.userPitch = clamp(down.pitch + dy * 0.005, -0.7, 0.9); V.userMoved = true;
      }
    } else if (e.target === holo && performance.now() - hoverT > 90 && A.view !== 'stage') {
      hoverT = performance.now();
      const id = A.pickAt(e.clientX, e.clientY);
      const seg = id >= 0 && A.curSecData() ? A.curSecData().segs.find(g => g.i === id) : null;
      const nh = seg ? seg.tid : null;
      if (nh !== A.hover) { A.hover = nh; A.emit('hover', seg); }
    }
  });
  window.addEventListener('pointerup', e => {
    if (!down) return; const wasDown = down; down = null; V.dragging = false;
    if (moved < 5 && e.target === holo && A.view !== 'stage') {
      const id = A.pickAt(e.clientX, e.clientY);
      const seg = id >= 0 ? A.curSecData().segs.find(g => g.i === id) : null;
      if (seg) A.select(seg.tid); else A.select(null);
    }
  });
  holo.addEventListener('wheel', e => {
    if (window.state && state.engineVersion !== 'v5') return;
    e.preventDefault(); V.userDist = clamp(V.userDist * (1 + e.deltaY * 0.0009), 0.45, 2.2);
  }, { passive: false });
  holo.addEventListener('dblclick', () => { V.userYaw = V.userPitch = 0; V.userDist = 1; V.userMoved = false; });

  A.canvasEl = canvas;
  A.fitDist = fitDist;
  A.ready = true;
  resize();
})();
