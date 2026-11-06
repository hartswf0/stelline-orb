/* STAGE: the second screen. A scene graph, a camera rig, a lens with real depth of field, an etch-a-sketch piping pen and a build-from-nothing cake.
   The pad (handheld orb) sends turns of five rings, a thumb key, a spread gesture and its tilt. The stage is the single source of truth and tells the pad
   what every ring means right now, so the pad can draw the same labels and make the right sounds. */
(function () {
  'use strict';
  const T = THREE, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, D2R = Math.PI / 180;
  const canvas = document.getElementById('gl');
  const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); scene.background = new T.Color(0x020202);
  const cam = new T.PerspectiveCamera(38, 16 / 9, 0.05, 120);
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(11);

  /* ------------------------------------------------------------------ textures */
  function canvasTex(w, h, fn, srgb, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; if (rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } t.anisotropy = 4; return t; }
  const crumbTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6b3d1c'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5200; i++) { const v = rnd(); g.fillStyle = v < .5 ? 'rgba(40,18,6,.55)' : v < .8 ? 'rgba(150,92,46,.5)' : 'rgba(210,150,80,.35)'; const r = 0.6 + rnd() * 2.2; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 7); g.fill(); } }, true, [4, 1]);
  const crumbBump = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { const v = rnd() * 255 | 0; g.fillStyle = `rgba(${v},${v},${v},.6)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 0.8 + rnd() * 2.4, 0, 7); g.fill(); } }, false, [4, 1]);
  const creamBump = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#909090'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const y = rnd() * h, a = rnd(); g.strokeStyle = `rgba(${a < .5 ? 60 : 200},${a < .5 ? 60 : 200},${a < .5 ? 60 : 200},.16)`; g.lineWidth = 2 + rnd() * 5; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 12 * (rnd() - .5), w * .6, y + 12 * (rnd() - .5), w, y + 10 * (rnd() - .5)); g.stroke(); } }, false, [3, 1]);
  const stripeTex = canvasTex(64, 128, (g, w, h) => { for (let y = 0; y < h; y += 16) { g.fillStyle = (y / 16) % 2 ? '#f6efe0' : '#d8473b'; g.fillRect(0, y, w, 16); } }, true);
  const flameTex = canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(32, 84, 2, 32, 76, 52); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(.25, 'rgba(255,200,90,.95)'); gr.addColorStop(.6, 'rgba(255,120,30,.45)'); gr.addColorStop(1, 'rgba(255,80,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(52, 52, 56, 84, 32, 116); g.bezierCurveTo(8, 84, 12, 52, 32, 4); g.fill(); }, true);
  const glowTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,190,100,.55)'); gr.addColorStop(1, 'rgba(255,150,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, true);

  /* ------------------------------------------------------------------ materials */
  const M = {
    crumb: new T.MeshStandardMaterial({ map: crumbTex, bumpMap: crumbBump, bumpScale: 2.2, roughness: .95, color: 0xffffff }),
    cream: new T.MeshStandardMaterial({ color: 0xefdcb2, roughness: .6, metalness: 0, bumpMap: creamBump, bumpScale: .45, side: T.DoubleSide }),
    table: new T.MeshStandardMaterial({ color: 0xe2b960, emissive: 0x2a1a06, roughness: .6, metalness: 0 }),
    candle: new T.MeshStandardMaterial({ map: stripeTex, roughness: .5 }),
    wick: new T.MeshBasicMaterial({ color: 0x111111 }),
    pipe: new T.MeshStandardMaterial({ color: 0xd8473b, roughness: .35, metalness: 0 }),
    guide: new T.LineDashedMaterial({ color: 0x7a2a18, dashSize: .05, gapSize: .04, transparent: true, opacity: .85 })
  };
  M.crumb.map.repeat.set(5, 1);

  /* ------------------------------------------------------------------ the post pass: depth of field, bloom, grade */
  let rt = null, rtW = 0, rtH = 0;
  const postScene = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const post = new T.ShaderMaterial({
    uniforms: { tColor: { value: null }, tDepth: { value: null }, near: { value: cam.near }, far: { value: cam.far }, focus: { value: 6 }, aperture: { value: 1 }, texel: { value: new T.Vector2() }, time: { value: 0 }, grain: { value: 0.03 }, vig: { value: 0.5 }, exposure: { value: 1.1 }, bloom: { value: 0.8 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform sampler2D tColor, tDepth; uniform float near, far, focus, aperture, time, grain, vig, exposure, bloom; uniform vec2 texel;
      float lin(float z){ float ndc=z*2.0-1.0; return (2.0*near*far)/(far+near-ndc*(far-near)); }
      float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
      void main(){
        float d = lin(texture2D(tDepth,vUv).x);
        float coc = clamp(abs(d-focus)/max(0.2,d)*aperture*14.0, 0.0, 16.0);
        vec3 acc = texture2D(tColor,vUv).rgb; float wsum = 1.0; float ang = hash(vUv*vec2(913.0,517.0)+time)*6.2831;
        for(int i=1;i<28;i++){ float fi=float(i); float r=sqrt(fi/28.0)*coc; float a=fi*2.39996+ang; vec2 o=vec2(cos(a),sin(a))*r*texel;
          float sd = lin(texture2D(tDepth,vUv+o).x); float scoc = clamp(abs(sd-focus)/max(0.2,sd)*aperture*14.0,0.0,16.0);
          float w = smoothstep(r-1.0, r+1.0, scoc) * (sd>d-0.05?1.0:0.35); vec3 s = texture2D(tColor,vUv+o).rgb; float lum=dot(s,vec3(0.3,0.5,0.2)); w *= 1.0+lum*lum*1.5; acc += s*w; wsum += w; }
        vec3 c = acc/wsum; vec3 bl = vec3(0.0);
        for(int k=0;k<16;k++){ float a=float(k)*0.3927; float rr=(k%2==0)?7.0:15.0; vec3 sv=texture2D(tColor,vUv+vec2(cos(a),sin(a))*rr*texel).rgb; bl+=max(sv-vec3(1.0),vec3(0.0)); }
        c += bl*(bloom*0.05); c *= exposure; c *= 1.0 - vig*pow(length((vUv-0.5)*vec2(1.0,0.82))*1.35, 2.2);
        c = aces(c); c = pow(c, vec3(1.0/2.2)); c += (hash(vUv*vec2(1731.0,977.0)+fract(time)*19.0)-0.5)*grain; gl_FragColor = vec4(c,1.0); }`,
    depthTest: false, depthWrite: false
  });
  postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), post));
  function ensureRT(w, h) { if (rt && rtW === w && rtH === h) return; if (rt) { rt.depthTexture.dispose(); rt.dispose(); } rt = new T.WebGLRenderTarget(w, h, { minFilter: T.LinearFilter, magFilter: T.LinearFilter, type: T.HalfFloatType, format: T.RGBAFormat }); rt.depthTexture = new T.DepthTexture(w, h); rt.depthTexture.type = T.UnsignedIntType; rtW = w; rtH = h; }

  /* ------------------------------------------------------------------ lights */
  scene.add(new T.HemisphereLight(0x303848, 0x120a04, .22));
  const keyLight = new T.PointLight(0xffa94d, 0, 14, 1.6); keyLight.castShadow = true; keyLight.shadow.mapSize.set(2048, 2048); keyLight.shadow.bias = -0.0015; keyLight.shadow.normalBias = .03; keyLight.shadow.radius = 5; scene.add(keyLight);
  const rimLight = new T.SpotLight(0x9ec8ff, .35, 30, .7, .8, 1.2); rimLight.position.set(-3, 5, -6); rimLight.target.position.set(0, 1, 0); scene.add(rimLight, rimLight.target);
  const fillLight = new T.DirectionalLight(0xfff0dd, 0); fillLight.position.set(2, 4, 5); scene.add(fillLight);

  /* ------------------------------------------------------------------ the world: two sets, far apart */
  const SETA = new T.Group(), SETB = new T.Group(); SETB.position.set(80, 0, 0); scene.add(SETA, SETB);
  // birthday set: the dark chamber, the thin perimeter light, a floor
  const floor = new T.Mesh(new T.CircleGeometry(30, 64), new T.MeshStandardMaterial({ color: 0x050505, roughness: .9 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; floor.receiveShadow = true; SETA.add(floor);
  const horizon = new T.Mesh(new T.TorusGeometry(14, .022, 8, 200), new T.MeshBasicMaterial({ color: 0xcfd6dc })); horizon.rotation.x = Math.PI / 2; horizon.position.y = 1.1; horizon.scale.set(1, 1, 1); SETA.add(horizon);
  const horizon2 = new T.Mesh(new T.TorusGeometry(14.2, .01, 8, 200), new T.MeshBasicMaterial({ color: 0x9aa3ab })); horizon2.rotation.x = Math.PI / 2; horizon2.position.y = 1.0; SETA.add(horizon2);

  /* ------------------------------------------------------------------ the scene graph */
  const nodes = {}; let NID = 0;
  function node(id, name, kind, parent, o) { const n = Object.assign({ id, name, kind, parent: parent || null, kids: [], exists: true, obj: null, p: {} }, o || {}); nodes[id] = n; if (parent) nodes[parent].kids.push(id); return n; }
  const ROOT = node('root', 'ROOT', 'group', null);
  node('cam', 'CAMERA', 'cam', 'root');
  node('lights', 'LIGHTS', 'group', 'root'); node('key', 'KEY', 'light', 'lights'); node('rim', 'RIM', 'light', 'lights');
  node('birthday', 'BIRTHDAY', 'set', 'root', { set: 'A' });
  node('table', 'TABLE', 'prop', 'birthday', { exists: false, set: 'A' });
  node('cake', 'CAKE', 'group', 'birthday', { exists: false, set: 'A' });
  node('tier1', 'TIER 1', 'tier', 'cake', { exists: false, set: 'A' }); node('tier2', 'TIER 2', 'tier', 'cake', { exists: false, set: 'A' });
  node('icing', 'ICING', 'icing', 'cake', { exists: false, set: 'A' }); node('border', 'BORDER', 'border', 'cake', { exists: false, set: 'A' });
  node('candles', 'CANDLES', 'candles', 'cake', { exists: false, set: 'A' }); node('flames', 'FLAMES', 'flames', 'cake', { exists: false, set: 'A' });
  node('writing', 'WRITING', 'writing', 'cake', { exists: false, set: 'A' });
  node('kids', 'KIDS', 'card', 'birthday', { exists: false, set: 'A' });
  node('forest', 'FOREST', 'set', 'root', { set: 'B' });
  node('base', 'PLATE', 'plate', 'forest', { set: 'B' }); node('mid', 'MID', 'plate', 'forest', { set: 'B' }); node('near', 'NEAR', 'plate', 'forest', { set: 'B' }); node('bug', 'BUG', 'bug', 'forest', { set: 'B' });
  node('add', 'ADD', 'add', 'root');
  const PALETTE = [['table', 'TABLE'], ['tier', 'TIER'], ['icing', 'ICING'], ['border', 'BORDER'], ['candle', 'CANDLE'], ['flame', 'FLAME'], ['writing', 'WRITING'], ['kids', 'KIDS']];
  PALETTE.forEach(([id, nm]) => node('add_' + id, nm, 'palette', 'add', { pal: id }));
  const kidsOf = id => nodes[id].kids.map(k => nodes[k]).filter(n => n.exists !== false);
  const setOf = id => { let n = nodes[id]; while (n) { if (n.set) return n.set; n = n.parent ? nodes[n.parent] : null; } return null; };

  /* ------------------------------------------------------------------ the camera rig */
  const C = { tx: 0, ty: .9, tz: 0, D: 7.2, yaw: 22, pitch: 16, roll: 0, focal: 40, foff: 0, stop: 2.8, iy: 0, ip: 0, ir: 0, sy: 22, sp: 16, sr: 0, shake: 0 };
  const SETPOSE = { A: { tx: 0, ty: .9, tz: 0, D: 7.2, yaw: 22, pitch: 16 }, B: { tx: 80, ty: 0, tz: -3, D: 3.4, yaw: 0, pitch: 0 } };
  let curSet = 'A';
  function goSet(s) { if (s === curSet) return; SETPOSE[curSet] = { tx: C.tx, ty: C.ty, tz: C.tz, D: C.D, yaw: C.yaw, pitch: C.pitch }; curSet = s; Object.assign(C, SETPOSE[s]); C.foff = 0; SETA.visible = s === 'A'; SETB.visible = s === 'B'; fillLight.intensity = s === 'B' ? .9 : 0; }
  const STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
  function camPlace(dt) {
    C.sy = lerp(C.sy, C.yaw + C.iy, 1 - Math.exp(-dt * 12)); C.sp = lerp(C.sp, C.pitch + C.ip, 1 - Math.exp(-dt * 12)); C.sr = lerp(C.sr, C.roll + C.ir, 1 - Math.exp(-dt * 12));
    const yaw = C.sy * D2R, pit = clamp(C.sp, -80, 80) * D2R, cp = Math.cos(pit);
    cam.position.set(C.tx + Math.sin(yaw) * cp * C.D, C.ty + Math.sin(pit) * C.D, C.tz + Math.cos(yaw) * cp * C.D);
    cam.up.set(0, 1, 0); cam.lookAt(C.tx, C.ty, C.tz); cam.rotateZ(C.sr * D2R);
    const fov = 2 * Math.atan(12 / C.focal) / D2R; if (Math.abs(cam.fov - fov) > .01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const focus = Math.max(.3, C.D + C.foff); post.uniforms.focus.value = focus;
    post.uniforms.aperture.value = clamp(2.2 / C.stop * (C.focal / 40) * (renderer.domElement.height / 900), .02, 3);
  }

  /* ------------------------------------------------------------------ builders for each thing you can place */
  const TOPY = () => (nodes.table.exists ? .09 : 0);
  function tierY(i) { let y = TOPY(); if (i === 2 && nodes.tier1.exists) y += nodes.tier1.p.h; return y; }
  const cakeG = new T.Group(); SETA.add(cakeG);
  function mkTier(n, i) {
    const p = n.p; p.r = p.r || (i === 1 ? 1.45 : 1.0); p.h = p.h || (i === 1 ? .78 : .6);
    const g = new T.Group(); const body = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 96, 1), M.crumb); body.castShadow = body.receiveShadow = true; g.add(body); n.body = body; n.obj = g; cakeG.add(g); tierApply(n, i);
  }
  function tierApply(n, i) { const p = n.p; n.body.scale.set(p.r, p.h, p.r); n.body.position.y = p.h / 2; n.obj.position.y = tierY(i); M.crumb.map.repeat.set(Math.max(2, Math.round(p.r * 3.4)), 1); }
  function restack() { if (nodes.tier1.exists) tierApply(nodes.tier1, 1); if (nodes.tier2.exists) tierApply(nodes.tier2, 2); if (nodes.icing.exists) icingBuild(); if (nodes.border.exists) borderBuild(); if (nodes.candles.exists) candlesBuild(); if (nodes.writing.exists) writingBuild(); }
  const topTier = () => nodes.tier2.exists ? 2 : nodes.tier1.exists ? 1 : 0;
  function topInfo() { const t = topTier(); if (!t) return { y: TOPY(), r: 1.4 }; const n = nodes['tier' + t]; return { y: tierY(t) + n.p.h + (nodes.icing.exists ? nodes.icing.p.t * .6 : 0), r: n.p.r }; }
  /* icing: a coat over the top and sides of the upper tier(s), with drips along the lower lip */
  function icingBuild() {
    const n = nodes.icing, p = n.p; p.t = p.t == null ? .06 : p.t; p.drip = p.drip == null ? .5 : p.drip; p.gloss = p.gloss == null ? .45 : p.gloss;
    if (n.obj) { cakeG.remove(n.obj); n.obj.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const g = new T.Group(); n.obj = g; cakeG.add(g); const seg = 192, ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    for (const i of [1, 2]) {
      const tn = nodes['tier' + i]; if (!tn.exists) continue; if (i === 1 && nodes.tier2.exists) continue;      // a lower tier under a second tier stays bare
      const r = tn.p.r + p.t, h = tn.p.h, yT = h + p.t, L = h * .72, Lmin = h * .16, rr = .1;
      const prof = []; prof.push([0, yT]); prof.push([r - rr, yT]); for (let k = 1; k <= 8; k++) { const a = k / 8 * Math.PI / 2; prof.push([r - rr + Math.sin(a) * rr, yT - rr + Math.cos(a) * rr]); }
      const sideTop = yT - rr, ROWS = 28; for (let k = 1; k <= ROWS; k++) prof.push([r, sideTop - (k / ROWS) * (L - rr)]);
      const nR = prof.length, pos = new Float32Array((seg + 1) * nR * 3), idx = [];
      for (let a = 0; a <= seg; a++) { const th = a / seg * Math.PI * 2; const dn = Math.max(0, Math.sin(th * 7 + i) * .5 + Math.sin(th * 13 + 2) * .3 + Math.sin(th * 3 + 1) * .4); const lim = Lmin + p.drip * dn * dn * (L - Lmin) * 1.4 + (1 - p.drip) * (L - Lmin) * .1;
        for (let j = 0; j < nR; j++) { let [rad, y] = prof[j]; if (j >= 10) { const drop = sideTop - y; const cl = Math.min(drop, lim); y = sideTop - cl; if (drop > lim) rad = r; rad = r + .02 * ss(lim * .7, lim, cl) * p.drip; } const o = (a * nR + j) * 3; pos[o] = Math.cos(th) * rad; pos[o + 1] = y; pos[o + 2] = Math.sin(th) * rad; } }
      for (let a = 0; a < seg; a++) for (let j = 0; j < nR - 1; j++) { const A = a * nR + j, B = (a + 1) * nR + j, C = A + 1, D = B + 1; idx.push(A, B, C, B, D, C); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const m = new T.Mesh(geo, M.cream); m.castShadow = m.receiveShadow = true; m.position.y = tierY(i); g.add(m);
    }
    M.cream.roughness = lerp(.8, .3, p.gloss);
  }
  /* border: piped shells all round the rim of the top tier */
  const shellGeo = new T.SphereGeometry(1, 14, 10);
  function borderBuild() {
    const n = nodes.border, p = n.p; p.size = p.size || .11; p.count = p.count || 44; const ti = topInfo();
    if (n.obj) { cakeG.remove(n.obj); n.obj.geometry.dispose(); }
    const im = new T.InstancedMesh(shellGeo, M.cream, 90); im.castShadow = true; const d = new T.Object3D(); n.obj = im; im.count = p.count; cakeG.add(im);
    for (let k = 0; k < p.count; k++) { const a = k / p.count * Math.PI * 2; d.position.set(Math.cos(a) * (ti.r - p.size * 1.1), ti.y + p.size * .35, Math.sin(a) * (ti.r - p.size * 1.1)); d.rotation.set(0, -a, 0); d.rotateZ(-.35); d.scale.set(p.size * 1.6, p.size * .62, p.size * .9); d.updateMatrix(); im.setMatrixAt(k, d.matrix); }
    im.instanceMatrix.needsUpdate = true; n.grow = n.grow == null ? 1 : n.grow;
  }
  /* candles on the top tier, flames over them */
  const flameSprites = [];
  function candlesBuild() {
    const n = nodes.candles, p = n.p; p.n = p.n == null ? 1 : p.n; p.h = p.h || .6; p.ring = p.ring || .55; p.rot = p.rot || 0; const ti = topInfo();
    if (n.obj) cakeG.remove(n.obj); const g = new T.Group(); n.obj = g; cakeG.add(g); flameSprites.length = 0;
    for (let k = 0; k < p.n; k++) {
      const a = (p.n === 1 ? 0 : k / p.n * Math.PI * 2) + p.rot, rr = p.n === 1 ? 0 : ti.r * p.ring;
      const c = new T.Group(); c.position.set(Math.cos(a) * rr, ti.y, Math.sin(a) * rr);
      const cr = p.rad || .04, cyl = new T.Mesh(new T.CylinderGeometry(cr, cr, p.h, 14), M.candle); cyl.position.y = p.h / 2; cyl.castShadow = true; c.add(cyl);
      const wick = new T.Mesh(new T.CylinderGeometry(.006, .006, .06, 5), M.wick); wick.position.y = p.h + .03; c.add(wick);
      const fl = new T.Sprite(new T.SpriteMaterial({ map: flameTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: nodes.flames.exists ? 1 : 0 })); fl.scale.set(.22, .44, 1); fl.position.y = p.h + .22; c.add(fl); fl.userData.k = k;
      const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: nodes.flames.exists ? .9 : 0 })); gl.scale.set(.8, .8, 1); gl.position.y = p.h + .2; c.add(gl);
      flameSprites.push({ fl, gl, c }); g.add(c);
    }
    n.top = ti.y + p.h + .2;
  }
  /* writing: the etch-a-sketch pen */
  const WR = { strokes: [], cur: null, px: 0, py: 0, down: false, assist: .6, text: 'MAYA', guide: null, last: null, acc: 0 };
  const GUIDES = ['MAYA', 'HAPPY', 'JOI', '—'];
  function writingBuild() {
    const n = nodes.writing; if (!n.obj) { n.obj = new T.Group(); cakeG.add(n.obj); }
    const ti = topInfo(); n.obj.position.set(0, ti.y + .015, 0); n.R = ti.r * .8;
    if (WR.guide) { n.obj.remove(WR.guide); WR.guide.traverse(o => { if (o.geometry) o.geometry.dispose(); }); WR.guide = null; }
    WR.pts = []; if (WR.text !== '—') {
      const g = new T.Group(); const chars = [...WR.text], cw = 5, W = chars.length * cw - 1, sc = Math.min(n.R * 1.7 / W, n.R * .5 / 6);
      chars.forEach((ch, ci) => { const gl = window.GLYPH[ch]; if (!gl) return; gl.forEach(poly => { const pts = poly.map(([x, y]) => [(ci * cw + x - W / 2 + 2) * sc, -(y - 3) * sc]); WR.pts.push(...pts); const geo = new T.BufferGeometry().setFromPoints(pts.map(q => new T.Vector3(q[0], 0, q[1]))); const line = new T.Line(geo, M.guide); line.computeLineDistances(); g.add(line); }); });
      WR.guide = g; n.obj.add(g);
    }
    WR.strokes.forEach(s => s.mesh && (s.mesh.position.y = 0));
  }
  function strokeMesh(s) {
    if (s.pts.length < 2) return; if (s.mesh) { s.mesh.geometry.dispose(); s.holder.remove(s.mesh); }
    const v = s.pts.map(q => new T.Vector3(q[0], .02, q[1])); const curve = new T.CatmullRomCurve3(v, false, 'catmullrom', .3);
    const geo = new T.TubeGeometry(curve, Math.min(400, v.length * 3), .032, 8, false); const m = new T.Mesh(geo, M.pipe); m.castShadow = true; s.mesh = m; s.holder.add(m);
  }
  function penMove(dx, dy) {
    const n = nodes.writing; if (!n.exists) return false; const R = n.R; let hit = false;
    let nx = WR.px + dx, ny = WR.py + dy; const rr = Math.hypot(nx, ny); if (rr > R) { nx *= R / rr; ny *= R / rr; hit = true; }
    if (WR.down && WR.assist > 0 && WR.pts.length) { let b = null, bd = 1e9; for (const q of WR.pts) { const d = Math.hypot(q[0] - nx, q[1] - ny); if (d < bd) { bd = d; b = q; } } const reach = R * .14 * WR.assist; if (b && bd < reach) { const k = .45 * WR.assist; nx = lerp(nx, b[0], k); ny = lerp(ny, b[1], k); WR.snap = true; } else WR.snap = false; }
    WR.px = nx; WR.py = ny;
    if (WR.down && WR.cur) { const l = WR.cur.pts[WR.cur.pts.length - 1]; if (!l || Math.hypot(l[0] - nx, l[1] - ny) > .02) { WR.cur.pts.push([nx, ny]); if (WR.cur.pts.length % 3 === 0) strokeMesh(WR.cur); fx('pen'); } }
    return hit;
  }
  function penDown(dn) { const n = nodes.writing; if (!n.exists) return; WR.down = dn; if (dn) { WR.cur = { pts: [[WR.px, WR.py]], mesh: null, holder: n.obj }; WR.strokes.push(WR.cur); } else if (WR.cur) { strokeMesh(WR.cur); if (WR.cur.pts.length < 2) WR.strokes.pop(); WR.cur = null; } }
  const nozzle = new T.Mesh(new T.ConeGeometry(.05, .16, 12), new T.MeshStandardMaterial({ color: 0xcfcfcf, metalness: .8, roughness: .3 })); nozzle.rotation.x = Math.PI; nozzle.visible = false; cakeG.add(nozzle);
  /* kids and plates are cut-outs from the film: a card in space, depth-tested, so the lens can focus through them */
  const loader = new T.TextureLoader(); const texCache = {};
  const tex = src => texCache[src] || (texCache[src] = (() => { const t = loader.load(src); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; })());
  function card(src, w, h, cutoff) { const m = new T.MeshBasicMaterial({ map: tex(src), transparent: false, alphaTest: cutoff || .4, side: T.DoubleSide, color: 0xffffff }); const mesh = new T.Mesh(new T.PlaneGeometry(w, h), m); return mesh; }
  function kidsBuild() { const n = nodes.kids; if (n.obj) return; const c = card('assets/bench/kids.webp', 6.6, 6.6 * 483 / 680, .35); c.position.set(0, 2.3, -2.1); SETA.add(c); n.obj = c; n.p.lit = 0; }
  function tableBuild() { const n = nodes.table; if (n.obj) return; const m = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, .09, 6), M.table); m.rotation.y = Math.PI / 6; m.position.y = .045; m.receiveShadow = true; m.castShadow = false; n.obj = m; SETA.add(m); }
  // the forest set: the film's own plates in depth
  (function forestInit() {
    const fov = 2 * Math.atan(12 / 40), asp = 16 / 9; const sizeAt = z => { const h = 2 * Math.tan(fov / 2) * (0.4 - z) * 1.0; return [h * asp, h]; };
    const mk = (src, z, cutoff, id) => { const [w, h] = sizeAt(z); const c = card(src, w, h, cutoff); c.position.set(0, 0, z); SETB.add(c); if (id) nodes[id].obj = c; return c; };
    const ch = new T.Mesh(new T.PlaneGeometry(60, 34), new T.MeshBasicMaterial({ map: tex('assets/bench/chamber.jpg') })); ch.position.set(0, 0, -16); ch.scale.set(1.5, 1.5, 1); SETB.add(ch);
    // opaque base: the three layers laid together
    const cvs = document.createElement('canvas'); cvs.width = 1280; cvs.height = 720; const g = cvs.getContext('2d'); const tc = new T.CanvasTexture(cvs); tc.encoding = T.sRGBEncoding;
    let n = 0; ['far', 'mid', 'near'].forEach(nm => { const im = new Image(); im.onload = () => { g.drawImage(im, 0, 0); tc.needsUpdate = true; if (++n === 3) baseReady = true; }; im.src = 'assets/bench/forest_' + nm + '.webp'; });
    const [bw, bh] = sizeAt(-6); const base = new T.Mesh(new T.PlaneGeometry(bw, bh), new T.MeshBasicMaterial({ map: tc })); base.position.set(0, 0, -6); SETB.add(base); nodes.base.obj = base;
    mk('assets/bench/forest_mid.webp', -4.2, .45, 'mid'); mk('assets/bench/forest_near.webp', -2.4, .45, 'near');
    // the bug is a turntable card standing in the clearing
    const bm = new T.MeshBasicMaterial({ transparent: false, alphaTest: .35, side: T.DoubleSide }); const bugC = new T.Mesh(new T.PlaneGeometry(1.6, 1.05), bm); bugC.position.set(-1.0, -0.55, -3.4); SETB.add(bugC); nodes.bug.obj = bugC;
    const bi = new Image(); bi.onload = () => { const t = new T.Texture(bi); t.encoding = T.sRGBEncoding; t.needsUpdate = true; t.repeat.set(1 / 12, 1); bm.map = t; bm.needsUpdate = true; nodes.bug.img = bi; }; bi.src = 'assets/bench/bug_film.webp';
    nodes.bug.p.yaw = 0; nodes.forest.p.recede = 0;
  })();
  let baseReady = false; SETB.visible = false;

  /* ------------------------------------------------------------------ the five rings: what they mean now */
  const S = { sel: ['birthday'], chan: 'move', deg: [0, 0, 0, 0, 0], acc: [0, 0], note: '', noteAt: 0, history: [], spread: 1 };
  const nsel = () => nodes[S.sel[S.sel.length - 1]];
  const hitWall = [0, 0, 0];
  function setp(obj, key, val, lo, hi) { const c = clamp(val, lo, hi); const hit = c !== val; obj[key] = c; return hit; }
  const fmt = (v, d) => (typeof v === 'number' ? v.toFixed(d == null ? 2 : d) : String(v));
  /* handler tables: [label, apply(deg)->hit, read()->string] per channel and axis */
  function chans(n) {
    const k = n.kind, p = n.p, o = n.obj; const none = ['—', () => false, () => ''];
    const xf = (obj) => ({
      move: [['X', d => { obj.position.x += d * .01; return false; }, () => fmt(obj.position.x)], ['Y', d => { obj.position.y += d * .01; return false; }, () => fmt(obj.position.y)], ['Z', d => { obj.position.z += d * .01; return false; }, () => fmt(obj.position.z)]],
      turn: [['ROLL', d => { obj.rotation.z += d * D2R * .5; return false; }, () => fmt(obj.rotation.z / D2R, 0) + '°'], ['PITCH', d => { obj.rotation.x += d * D2R * .5; return false; }, () => fmt(obj.rotation.x / D2R, 0) + '°'], ['YAW', d => { obj.rotation.y += d * D2R * .5; return false; }, () => fmt(obj.rotation.y / D2R, 0) + '°']],
      scale: [['SIZE', d => { const s = clamp(obj.scale.x * (1 + d * .004), .1, 6); const h = s !== obj.scale.x * (1 + d * .004); obj.scale.setScalar(s); return h; }, () => fmt(obj.scale.x)], none, none]
    });
    if (k === 'cam') return {
      move: [['TRUCK', d => { const r = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0); C.tx += r.x * d * .012; C.tz += r.z * d * .012; return false; }, () => ''], ['BOOM', d => setp(C, 'ty', C.ty + d * .01, -1, 8), () => fmt(C.ty)], ['DOLLY', d => setp(C, 'D', C.D + d * .014, 1.2, 18), () => fmt(C.D) + ' m']],
      turn: [['ROLL', d => setp(C, 'roll', C.roll + d * .3, -45, 45), () => fmt(C.roll, 0) + '°'], ['PITCH', d => setp(C, 'pitch', C.pitch + d * .3, -60, 80), () => fmt(C.pitch, 0) + '°'], ['YAW', d => { C.yaw += d * .4; return false; }, () => fmt(((C.yaw % 360) + 360) % 360, 0) + '°']],
      scale: [['FOCAL', d => setp(C, 'focal', C.focal + d * .12, 18, 135), () => fmt(C.focal, 0) + ' mm'], ['FOCUS', d => focusPull(d), () => fmt(C.D + C.foff) + ' m'], ['STOP', d => { const i = Math.log(C.stop / 1.4) / Math.log(16 / 1.4); const ni = clamp(i + d * .0016, 0, 1); C.stop = 1.4 * Math.pow(16 / 1.4, ni); return ni !== i + d * .0016; }, () => 'T' + fmt(C.stop, 1)]]
    };
    if (k === 'light') { const L = n.id === 'key' ? keyLight : rimLight; return {
      move: xf(L).move, turn: [none, ['PITCH', d => { rimLight.target.position.y += d * .01; return false; }, () => ''], ['YAW', d => { rimLight.target.position.x += d * .01; return false; }, () => '']],
      scale: [['LEVEL', d => { p.lvl = clamp((p.lvl == null ? 1 : p.lvl) + d * .004, 0, 3); return false; }, () => fmt(p.lvl == null ? 1 : p.lvl)], ['WARMTH', d => { p.warm = clamp((p.warm == null ? .6 : p.warm) + d * .003, 0, 1); return false; }, () => Math.round(2600 + (p.warm == null ? .6 : p.warm) * 3400) + ' K'], none] }; }
    if (k === 'tier') { const i = n.id === 'tier1' ? 1 : 2; return { move: none3(), turn: none3(), scale: [['RADIUS', d => { const h = setp(p, 'r', p.r + d * .003, .5, 2.4); restack(); return h; }, () => fmt(p.r)], ['HEIGHT', d => { const h = setp(p, 'h', p.h + d * .003, .25, 1.4); restack(); return h; }, () => fmt(p.h)], none] }; }
    if (k === 'icing') return { move: none3(), turn: none3(), scale: [['COAT', d => { const h = setp(p, 't', p.t + d * .0007, .02, .14); icingBuild(); return h; }, () => fmt(p.t, 3)], ['DRIP', d => { const h = setp(p, 'drip', p.drip + d * .004, 0, 1); icingBuild(); return h; }, () => fmt(p.drip)], ['GLOSS', d => { const h = setp(p, 'gloss', p.gloss + d * .004, 0, 1); icingBuild(); return h; }, () => fmt(p.gloss)]] };
    if (k === 'border') return { move: none3(), turn: none3(), scale: [['SHELL', d => { const h = setp(p, 'size', p.size + d * .0004, .05, .2); borderBuild(); return h; }, () => fmt(p.size, 3)], ['COUNT', d => { const h = setp(p, 'count', Math.round(p.count + d * .05), 12, 90); borderBuild(); return h; }, () => String(p.count)], none] };
    if (k === 'candles') return { move: [['RING', d => { const h = setp(p, 'ring', p.ring + d * .002, .1, .9); candlesBuild(); return h; }, () => fmt(p.ring)], none, none], turn: [none, none, ['SPIN', d => { p.rot = (p.rot || 0) + d * D2R * .5; candlesBuild(); return false; }, () => '']], scale: [['COUNT', d => { const nv = clamp(Math.round(p.n + d * .035), 1, 12); const h = nv !== p.n + d * .035 && (nv === 1 || nv === 12); p.n = nv; candlesBuild(); return h; }, () => String(p.n)], ['HEIGHT', d => { const h = setp(p, 'h', p.h + d * .002, .25, 1.0); candlesBuild(); return h; }, () => fmt(p.h)], none] };
    if (k === 'flames') return { move: none3(), turn: none3(), scale: [['FLAME', d => { p.s = clamp((p.s == null ? 1 : p.s) + d * .004, .3, 2); return false; }, () => fmt(p.s == null ? 1 : p.s)], ['FLICKER', d => { p.f = clamp((p.f == null ? .6 : p.f) + d * .004, 0, 1.5); return false; }, () => fmt(p.f == null ? .6 : p.f)], ['LIGHT', d => { p.lt = clamp((p.lt == null ? 1 : p.lt) + d * .004, 0, 3); return false; }, () => fmt(p.lt == null ? 1 : p.lt)]] };
    if (k === 'card' && o) return xf(o);
    if (k === 'prop' && o) return xf(o);
    if (k === 'plate' && o) return { move: [['SLIDE', d => { o.position.x += d * .01; return false; }, () => fmt(o.position.x)], ['LIFT', d => { o.position.y += d * .01; return false; }, () => fmt(o.position.y)], ['PUSH', d => { o.position.z += d * .01; return false; }, () => fmt(o.position.z)]], turn: none3(), scale: [['SIZE', d => { const s = clamp(o.scale.x * (1 + d * .003), .5, 3); o.scale.setScalar(s); return false; }, () => fmt(o.scale.x)], none, none] };
    if (k === 'bug' && o) return { move: [['SLIDE', d => { o.position.x += d * .01; return false; }, () => fmt(o.position.x - 0)], ['LIFT', d => { o.position.y += d * .01; return false; }, () => fmt(o.position.y)], ['PUSH', d => { o.position.z += d * .01; return false; }, () => fmt(o.position.z)]], turn: [none, none, ['YAW', d => { p.yaw = (p.yaw || 0) + d / 360; return false; }, () => fmt(((p.yaw % 1) + 1) % 1 * 360, 0) + '°']], scale: [['SIZE', d => { const s = clamp(o.scale.x * (1 + d * .003), .3, 4); o.scale.setScalar(s); return false; }, () => fmt(o.scale.x)], none, none] };
    if (k === 'set' && n.id === 'forest') return { move: none3(), turn: none3(), scale: [['RECEDE', d => { const h = setp(p, 'recede', (p.recede || 0) + d * .003, 0, 1); return h; }, () => fmt(p.recede || 0)], none, none] };
    if (k === 'writing') return { move: none3(), turn: none3(), scale: none3(), etch: [['PEN X', d => penMove(d * .011 * (nodes.writing.R || 1), 0), () => fmt(WR.px)], ['PEN Y', d => penMove(0, d * .011 * (nodes.writing.R || 1)), () => fmt(WR.py)], ['ASSIST', d => setp(WR, 'assist', WR.assist + d * .004, 0, 1), () => Math.round(WR.assist * 100) + '%']] };
    return { move: none3(), turn: none3(), scale: none3() };
  }
  function none3() { const z = ['—', () => false, () => '']; return [z, z, z]; }
  const chanOK = (n, c) => { const t = chans(n)[c]; return !!t && t.some(a => a[0] !== '—'); };
  /* focus pull has hard marks at the depth of whatever is in the scene: a detent you can feel */
  function focusMarks() {
    const out = []; const add = (nm, o) => { if (!o) return; const w = new T.Vector3(); o.getWorldPosition(w); const dir = new T.Vector3(); cam.getWorldDirection(dir); const d = w.sub(cam.position).dot(dir); if (d > .4 && d < 40) out.push([nm, d]); };
    if (curSet === 'A') { if (nodes.table.exists) add('TABLE', nodes.table.obj); if (nodes.cake.exists) add('CAKE', topTier() ? nodes['tier' + topTier()].obj : null); if (nodes.writing.exists) add('WRITING', nodes.writing.obj); if (nodes.candles.exists) add('FLAME', nodes.candles.obj); if (nodes.kids.exists) add('KIDS', nodes.kids.obj); }
    else { add('NEAR', nodes.near.obj); add('BUG', nodes.bug.obj); add('MID', nodes.mid.obj); add('PLATE', nodes.base.obj); }
    return out;
  }
  let lock = null;
  function focusPull(d) {
    const marks = focusMarks(); let f = C.D + C.foff + d * .008, hit = false; const lo = .5, hi = 30; if (f < lo || f > hi) { f = clamp(f, lo, hi); hit = true; }
    let best = null, bd = 1e9; marks.forEach(m => { const dd = Math.abs(m[1] - f); if (dd < bd) { bd = dd; best = m; } });
    if (best && bd < .22) { if (!lock || lock[0] !== best[0]) { lock = best; fx('mark'); } f = lerp(f, best[1], .55); } else lock = null;
    C.foff = f - C.D; return hit;
  }

  /* ------------------------------------------------------------------ selection through the graph */
  function pathNodes() { return S.sel.map(id => nodes[id]); }
  function depthMax() { let n = nsel(), d = S.sel.length - 1; let c = n; while (kidsOf(c.id).length) { d++; c = kidsOf(c.id)[0]; } return d; }
  function stepDepth(st) {
    let hit = false;
    if (st > 0) { const k = kidsOf(nsel().id); if (k.length) S.sel.push(k[0].id); else hit = true; }
    else if (S.sel.length > 1) S.sel.pop(); else hit = true;
    afterSel(); return hit;
  }
  function stepSibling(st) {
    const cur = nsel(); const par = cur.parent ? nodes[cur.parent] : null; const sib = par ? kidsOf(par.id) : [cur]; const i = sib.indexOf(cur); if (sib.length < 2) return true;
    const ni = ((i + st) % sib.length + sib.length) % sib.length; S.sel[S.sel.length - 1] = sib[ni].id; afterSel(); return false;
  }
  function afterSel() { const s = setOf(nsel().id); if (s) goSet(s); const n = nsel(); if (!chanOK(n, S.chan) && !(S.chan === 'etch' && n.kind === 'writing')) S.chan = n.kind === 'writing' ? 'etch' : (['move', 'turn', 'scale'].find(c => chanOK(n, c)) || 'move'); if (S.chan === 'etch' && n.kind !== 'writing') S.chan = 'move'; if (n.kind === 'writing' && chanOK(n, 'etch')) S.chan = 'etch'; changed(); }
  function setChan(c) { const n = nsel(); if (c === 'etch' ? n.kind !== 'writing' : !chanOK(n, c)) { fx('deny'); note('NOTHING TO ' + c.toUpperCase() + ' ON ' + n.name); return; } S.chan = c; fx('detent'); changed(); }

  /* ------------------------------------------------------------------ placing things: build the cake from nothing */
  const NEEDS = { icing: ['tier1'], border: ['icing'], candle: ['tier1'], flame: ['candles'], writing: ['icing'], tier: ['table'] };
  function grow(n, secs) { n.grow = 0; n.growDur = secs || .8; }
  function place(pal) {
    const need = NEEDS[pal]; if (need) { const miss = need.find(id => !nodes[id].exists); if (miss) { fx('deny'); note('NEEDS ' + nodes[miss].name); return false; } }
    let n;
    if (pal === 'table') { if (nodes.table.exists) { fx('deny'); note('ALREADY THERE'); return false; } n = nodes.table; n.exists = true; tableBuild(); grow(n); restack(); }
    else if (pal === 'tier') { const i = nodes.tier1.exists ? 2 : 1; if (i === 2 && nodes.tier2.exists) { fx('deny'); note('TWO TIERS ENOUGH'); return false; } n = nodes['tier' + i]; n.exists = true; nodes.cake.exists = true; mkTier(n, i); grow(n); restack(); }
    else if (pal === 'icing') { if (nodes.icing.exists) { fx('deny'); note('ALREADY ICED'); return false; } n = nodes.icing; n.exists = true; icingBuild(); grow(n, 1.1); }
    else if (pal === 'border') { if (nodes.border.exists) { fx('deny'); note('ALREADY PIPED'); return false; } n = nodes.border; n.exists = true; n.grow = 0; n.growDur = 1.6; borderBuild(); n.obj.count = 0; }
    else if (pal === 'candle') { n = nodes.candles; if (!n.exists) { n.exists = true; n.p.n = 0; } if (n.p.n >= 12) { fx('deny'); note('NO ROOM'); return false; } n.p.n++; candlesBuild(); grow(n, .5); }
    else if (pal === 'flame') { if (nodes.flames.exists) { fx('deny'); note('ALREADY LIT'); return false; } n = nodes.flames; n.exists = true; n.lit = 0; candlesBuild(); }
    else if (pal === 'writing') { n = nodes.writing; if (!n.exists) { n.exists = true; writingBuild(); } else { WR.text = GUIDES[(GUIDES.indexOf(WR.text) + 1) % GUIDES.length]; writingBuild(); } }
    else if (pal === 'kids') { if (nodes.kids.exists) { fx('deny'); note('ALREADY HERE'); return false; } n = nodes.kids; n.exists = true; kidsBuild(); grow(n, 1.2); }
    S.history.push({ pal, id: n.id });
    S.sel = pathTo(n.id); fx('place'); note('PLACED ' + n.name); afterSel(); return true;
  }
  function pathTo(id) { const p = []; let n = nodes[id]; while (n && n.id !== 'root') { p.unshift(n.id); n = n.parent ? nodes[n.parent] : null; } return p; }
  function undo() {
    // last stroke first, then last placed thing
    const wr = nodes.writing; if (wr.exists && WR.strokes.length && (!S.history.length || S.history[S.history.length - 1].id === 'writing')) { const s = WR.strokes.pop(); if (s.mesh) { s.holder.remove(s.mesh); s.mesh.geometry.dispose(); } fx('wall'); note('STROKE UNDONE'); return; }
    const h = S.history.pop(); if (!h) { fx('deny'); note('NOTHING TO UNDO'); return; }
    const n = nodes[h.id]; if (h.pal === 'candle' && n.p.n > 1) { n.p.n--; candlesBuild(); }
    else { n.exists = false; if (n.obj && n.obj.parent) n.obj.parent.remove(n.obj); n.obj = null; if (h.pal === 'tier' && !nodes.tier1.exists && !nodes.tier2.exists) nodes.cake.exists = false; if (h.pal === 'flame') { n.lit = 0; candlesBuild(); } if (h.pal === 'writing') { WR.strokes.forEach(s => s.mesh && s.holder && s.holder.remove(s.mesh)); WR.strokes = []; WR.guide = null; } restack(); }
    if (!nsel().exists) S.sel = ['birthday']; fx('wall'); note('UNDONE ' + n.name); afterSel();
  }

  /* ------------------------------------------------------------------ input from the pad */
  let fxQ = []; function fx(n) { fxQ.push(n); }
  function note(t) { S.note = t; S.noteAt = performance.now(); }
  function ring(i, d) {
    if (!d) return; S.deg[i] = (S.deg[i] + d) % 360;
    if (i >= 3) { S.acc[i - 3] += d; const step = 30; while (Math.abs(S.acc[i - 3]) >= step) { const sg = Math.sign(S.acc[i - 3]); S.acc[i - 3] -= sg * step; const hit = i === 3 ? stepDepth(sg) : stepSibling(sg); fx(hit ? 'wall' : 'detent'); } return; }
    const n = nsel(); const t = chans(n)[S.chan]; if (!t) return; const a = t[i]; if (!a || a[0] === '—') return;
    if (n.kind === 'cam' && i < 3 && S.chan === 'scale' && i !== 1) { }
    const hit = a[1](d); logLine('ring' + (i + 1) + ' ' + (d > 0 ? '+' : '') + d.toFixed(1)); if (hit) { if (!hitWall[i]) fx('wall'); hitWall[i] = 8; } changed();
  }
  function key(id, dn) {
    if (id === 'thumb') { const n = nsel(); if (n.kind === 'palette') { if (dn) place(n.pal); } else if (S.chan === 'etch' && n.kind === 'writing') { penDown(dn); fx(dn ? 'pen' : 'detent'); } else { S.clutch = dn; if (!dn) { C.yaw += C.iy; C.pitch = clamp(C.pitch + C.ip, -60, 80); C.roll = clamp(C.roll + C.ir, -45, 45); C.iy = C.ip = C.ir = 0; imuS.ref = null; } fx(dn ? 'detent' : 'wall'); } changed(); return; }
    if (!dn) return;
    if (id === 'move' || id === 'turn' || id === 'scale' || id === 'etch') setChan(id);
    else if (id === 'undo') undo();
    else if (id === 'guide') { place('writing'); }
    else if (id === 'up') { fx(stepDepth(-1) ? 'wall' : 'detent'); logLine('graph up'); }
    else if (id === 'down') { fx(stepDepth(1) ? 'wall' : 'detent'); logLine('graph down'); }
    else if (id === 'left') { fx(stepSibling(-1) ? 'wall' : 'detent'); logLine('graph prev'); }
    else if (id === 'right') { fx(stepSibling(1) ? 'wall' : 'detent'); logLine('graph next'); }
    else if (id === 'mid') { const cs = ['move', 'turn', 'scale'].concat(nsel().kind === 'writing' ? ['etch'] : []).filter(c => c === 'etch' ? nsel().kind === 'writing' : chanOK(nsel(), c)); setChan(cs[(cs.indexOf(S.chan) + 1) % cs.length] || 'move'); }
    else if (id === 'next') { const order = PALETTE.map(x => x[0]); const last = S.history.length ? S.history[S.history.length - 1].pal : null; let i = last ? order.indexOf(last) + 1 : 0; const done = q => ({ table: nodes.table.exists, tier: nodes.tier2.exists, icing: nodes.icing.exists, border: nodes.border.exists, candle: false, flame: nodes.flames.exists, writing: false, kids: nodes.kids.exists })[q]; let k = 0; while (k < order.length && done(order[i % order.length])) { i++; k++; } S.sel = ['add', 'add_' + order[i % order.length]]; fx('detent'); afterSel(); }
    changed();
  }
  function spread(v) { const n = nsel(); let s = Math.exp(v); S.spread = s;
    if (n.kind === 'cam') { setp(C, 'D', C.D / s, 1.2, 18); }
    else if (n.kind === 'tier') { setp(n.p, 'r', n.p.r * s, .5, 2.4); restack(); }
    else if (n.obj && n.obj.scale && n.kind !== 'set' && n.kind !== 'group') { n.obj.scale.setScalar(clamp(n.obj.scale.x * s, .1, 6)); }
    changed(); }
  const imuS = { ref: null, last: 0 };
  const wrap180 = v => { while (v > 180) v -= 360; while (v < -180) v += 360; return v; };
  function imu(y, p, r, down) {
    imuS.last = performance.now(); if (!down) { imuS.ref = null; return; }
    if (!imuS.ref) imuS.ref = { y, p, r };
    C.iy = clamp(wrap180(y - imuS.ref.y) * .9, -80, 80); C.ip = clamp(-(p - imuS.ref.p) * .7, -50, 50); C.ir = clamp(-wrap180(r - imuS.ref.r) * .5, -25, 25);
  }
  function shake() { const wr = nodes.writing; if (wr.exists && WR.strokes.length) undo(); }

  /* ------------------------------------------------------------------ what the pad needs to draw */
  function ui() {
    const n = nsel(), c = S.chan, t = chans(n)[c] || none3();
    const rings = [0, 1, 2].map(i => ({ lab: t[i] ? t[i][0] : '—', val: t[i] && t[i][2] ? t[i][2]() : '', step: 10 }));
    const sib = n.parent ? kidsOf(n.parent) : [n];
    rings.push({ lab: 'DEPTH', val: S.sel.length - 1 + '', step: 30 }); rings.push({ lab: 'NODE', val: n.name, step: 30, n: sib.indexOf(n) + 1 + '/' + sib.length });
    const isPal = n.kind === 'palette';
    const th = isPal ? { lab: 'PLACE', ok: true } : (c === 'etch' && n.kind === 'writing') ? { lab: 'PEN', ok: true, on: WR.down } : { lab: 'CLUTCH', ok: true, on: !!S.clutch };
    const keys = [['move', 'MOVE'], ['turn', 'TURN'], ['scale', 'SCALE'], ['etch', 'ETCH']].map(([id, lab]) => ({ id, lab, on: S.chan === id, ok: id === 'etch' ? n.kind === 'writing' : chanOK(n, id) }));
    const ctx = [{ id: 'undo', lab: 'UNDO', ok: true }]; if (n.kind !== 'palette') ctx.unshift({ id: 'next', lab: 'NEXT PART', ok: true }); if (n.kind === 'writing' || nodes.writing.exists) ctx.push({ id: 'guide', lab: 'GUIDE ' + WR.text, ok: nodes.writing.exists });
    return { sel: pathNodes().map(x => x.name).join(' › '), chan: c, rings, thumb: th, keys, ctx, note: performance.now() - S.noteAt < 2500 ? S.note : '' };
  }
  let dirty = true; function changed() { dirty = true; }

  /* ------------------------------------------------------------------ the reticle: the second screen's menu */
  const ret = document.getElementById('ret'), retArc = document.getElementById('retArc'), retLine = document.getElementById('retLine'), menu = document.getElementById('menu');
  function drawMenu() {
    const u = ui(), n = nsel(); const rows = [];
    const walk = (id, depth) => { const nn = nodes[id]; if (id !== 'root') rows.push([depth, nn]); kidsOf(id).forEach(k => { const open = S.sel.includes(id) || id === 'root' || S.sel.includes(k.id); if (id === 'root' || S.sel.includes(id)) walk(k.id, depth + (id === 'root' ? 0 : 1)); }); };
    walk('root', 0);
    const tree = rows.map(([d, nn]) => `<div class="row${nn.id === n.id ? ' on' : S.sel.includes(nn.id) ? ' in' : ''}" style="padding-left:${d * 12}px">${nn.id === n.id ? '▸ ' : '  '}${nn.name}</div>`).join('');
    const ring = u.rings.slice(0, 3).map((r, i) => `<div class="ax"><span>${i + 1} ${r.lab}</span><b>${r.val}</b></div>`).join('');
    const marks = (n.kind === 'cam' && S.chan === 'scale') ? focusMarks().map(m => `<i class="${lock && lock[0] === m[0] ? 'lk' : ''}">${m[0]} ${m[1].toFixed(1)}</i>`).join('') : '';
    menu.innerHTML = `<div class="path">${u.sel}</div><div class="chan">${['MOVE', 'TURN', 'SCALE', 'ETCH'].map(c => `<u class="${S.chan === c.toLowerCase() ? 'on' : ''}">${c}</u>`).join('')}</div>${ring}<div class="marks">${marks}</div><div class="tree">${tree}</div><div class="note">${u.note || ''}</div>`;
  }
  const _v = new T.Vector3(); const rsvg = document.getElementById('rsvg'); const RT = { x: 0, y: 0, k: 1, built: false, log: [] };
  const $r = id => document.getElementById(id), polar = (r, a) => [Math.cos(a * D2R) * r, Math.sin(a * D2R) * r];
  function annulus(r0, r1, a0, a1) { const p = (r, a) => polar(r, a).map(v => v.toFixed(2)).join(' '); const big = (a1 - a0) > 180 ? 1 : 0; return `M${p(r1, a0)} A${r1} ${r1} 0 ${big} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${big} 0 ${p(r0, a0)} Z`; }
  function buildReticle() {
    $r('rBand').setAttribute('d', annulus(86, 118, -126, 104)); $r('rWedge').setAttribute('d', annulus(86, 118, -126, -92));
    let t = ''; for (let a = -52; a <= 100; a += 6) { const [x0, y0] = polar(100, a), [x1, y1] = polar(118, a); t += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#000" stroke-width="1.3" opacity="${(.2 + .5 * (1 - (a + 52) / 152)).toFixed(2)}"/>`; } $r('rTicks').innerHTML = t;
    $r('rNotch').innerHTML = [[14, 6], [58, 9]].map(([a, w]) => `<path d="${annulus(88, 116, a, a + w)}" fill="#000" opacity=".85"/>`).join('');
    $r('rInner').setAttribute('d', `M${polar(70, -140).join(' ')} A70 70 0 1 1 ${polar(70, 70).join(' ')}`); $r('rInner2').setAttribute('d', `M${polar(58, -100).join(' ')} A58 58 0 0 1 ${polar(58, 40).join(' ')}`);
    RT.built = true;
  }
  const ctr = id => { const o = nodes[id].obj; return o; };
  function logLine(t) { RT.log.push(t); if (RT.log.length > 5) RT.log.shift(); }
  function drawReticle() {
    if (!RT.built) buildReticle(); const n = nsel(), u = ui(), w = window.innerWidth, h = window.innerHeight; let o = n.obj, ok = false, sx = w * .3, sy = h * .38, dist = 6;
    if (n.kind === 'palette' || n.kind === 'add') o = nodes.table.exists ? nodes.table.obj : null; else if (n.kind === 'group' || n.kind === 'set') o = n.id === 'cake' && topTier() ? nodes['tier' + topTier()].obj : n.id === 'forest' ? nodes.bug.obj : n.id === 'birthday' ? (nodes.table.exists ? nodes.table.obj : null) : null;
    if (n.kind === 'light') { _v.copy((n.id === 'key' ? keyLight : rimLight).position); ok = true; }
    else if (o) { const box = new T.Box3().setFromObject(o); if (!box.isEmpty()) { box.getCenter(_v); ok = true; } }
    if (ok) { dist = _v.distanceTo(cam.position); _v.project(cam); if (_v.z > 1) ok = false; else { sx = (_v.x * .5 + .5) * w; sy = (-_v.y * .5 + .5) * h; } }
    const k = clamp(2.6 / Math.max(.8, dist / 3.2), .8, 1.55) * (n.kind === 'cam' ? 1.1 : 1);
    // it floats up and to the left of what you hold, like the film's, and trails a little
    let tx = sx - 150 * k, ty = sy - 120 * k; tx = clamp(tx, 190 * k, w - 190 * k); ty = clamp(ty, 190 * k, h - 190 * k);
    RT.x = lerp(RT.x || tx, tx, .12); RT.y = lerp(RT.y || ty, ty, .12); RT.k = lerp(RT.k || k, k, .1);
    ret.style.opacity = ok || n.kind === 'cam' || n.kind === 'palette' ? .92 : .5; ret.style.transform = `translate(${RT.x}px,${RT.y}px) scale(${RT.k})`;
    // the needles read rings 1 and 2; the block reads ring 3; the bright sector reads where you are among the siblings
    const f = d => (((d % 360) + 360) % 360) / 360, a1 = -102 + f(S.deg[0]) * 74, a2 = 8 + f(S.deg[1]) * 80, a3 = -34 + f(S.deg[2]) * 130;
    const L = (el, r0, r1, a) => { const [x0, y0] = polar(r0, a), [x1, y1] = polar(r1, a); el.setAttribute('x1', x0); el.setAttribute('y1', y0); el.setAttribute('x2', x1); el.setAttribute('y2', y1); };
    L($r('rN1'), 18, 142, a1); L($r('rN2'), 62, 142, a2);
    const [mx, my] = polar(116, a3); $r('rMark').setAttribute('transform', `translate(${mx - 8},${my - 4.5}) rotate(${a3} 8 4.5)`);
    const [l1x, l1y] = polar(146, a1), [l2x, l2y] = polar(146, a2); const t1 = $r('rL1'), t2 = $r('rL2');
    t1.setAttribute('x', l1x); t1.setAttribute('y', l1y); t1.textContent = u.sel.replace(/ › /g, '/'); t1.setAttribute('text-anchor', 'start');
    const ax = u.rings.slice(0, 3).map(r => r.lab === '—' ? '' : r.lab + ' ' + r.val).filter(Boolean).join('  ');
    t2.setAttribute('x', l2x); t2.setAttribute('y', l2y + 3); t2.textContent = (S.chan.toUpperCase()) + (ax ? ' · ' + ax : ''); t2.setAttribute('text-anchor', 'start');
    // the code lines the film shows at the foot of it: what the rings just did
    const lines = ['sel ' + u.sel.toLowerCase().replace(/ › /g, '.'), 'chan ' + S.chan + '  depth ' + (S.sel.length - 1), ...u.rings.slice(0, 3).filter(r => r.lab !== '—').map((r, i) => `ring${i + 1}.${r.lab.toLowerCase()} = ${r.val}`), ...RT.log.slice(-2)];
    $r('rCode').innerHTML = lines.slice(0, 7).map((s, i) => `<text class="code" x="-165" y="${78 + i * 8.5}">${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`).join('');
  }
  function placeReticle() { drawReticle(); }

  /* ------------------------------------------------------------------ frame */
  const clock = new T.Clock(); let tAcc = 0, lastUI = 0;
  function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  function frame() {
    requestAnimationFrame(frame); const dt = Math.min(.25, clock.getDelta()); tAcc += dt;
    for (let i = 0; i < 3; i++) if (hitWall[i] > 0) hitWall[i]--;
    camPlace(dt);
    // growth animations
    Object.values(nodes).forEach(n => { if (n.grow != null && n.grow < 1) { n.grow = Math.min(1, n.grow + dt / n.growDur); const e = n.grow, ov = 1 + Math.sin(e * Math.PI) * .12 * (1 - e); const s = e < 1 ? Math.max(.001, e * ov) : 1;
      if (n.kind === 'tier') n.obj.scale.set(s, s, s); else if (n.kind === 'icing' && n.obj) n.obj.scale.set(1, 1, 1), n.obj.traverse(o => { if (o.isMesh) o.material.opacity = 1; }), n.obj.scale.setScalar(.2 + .8 * s);
      else if (n.kind === 'border' && n.obj) n.obj.count = Math.floor(n.p.count * e);
      else if (n.kind === 'candles' && n.obj) n.obj.scale.set(1, .2 + .8 * s, 1);
      else if (n.obj) n.obj.scale.setScalar(Math.max(.001, s) * (n.kind === 'card' || n.kind === 'prop' ? 1 : 1)); if (n.grow >= 1 && n.obj && n.kind !== 'border') { n.obj.scale.setScalar(1); if (n.kind === 'tier') n.obj.scale.set(1, 1, 1); } } });
    // flames
    const fl = nodes.flames; if (fl.exists) { fl.lit = Math.min(1, (fl.lit || 0) + dt * .7); }
    const lvl = fl.exists ? fl.lit : 0, fp = fl.p, fs = fp.s == null ? 1 : fp.s, ff = fp.f == null ? .6 : fp.f, lt = fp.lt == null ? 1 : fp.lt;
    const flick = .72 + .16 * Math.sin(tAcc * 13.1) + .1 * Math.sin(tAcc * 7.7 + 1.3) + .06 * Math.sin(tAcc * 31) * ff;
    flameSprites.forEach((f, i) => { const fk = 1 + ff * (Math.sin(tAcc * 11 + i * 2.1) * .12 + Math.sin(tAcc * 23 + i) * .06); f.fl.material.opacity = lvl; f.gl.material.opacity = lvl * (.7 + .3 * flick); f.fl.scale.set(.2 * fs * fk, .42 * fs * fk * (1 + .1 * Math.sin(tAcc * 17 + i)), 1); f.fl.position.x = Math.sin(tAcc * 5 + i) * .01 * ff; });
    const cn = nodes.candles; if (cn.exists && flameSprites.length) { const y = (cn.top || 1.4); let ax = 0, az = 0; flameSprites.forEach(f => { ax += f.c.position.x; az += f.c.position.z; }); ax /= flameSprites.length; az /= flameSprites.length; keyLight.position.set(ax, y + .3, az); }
    keyLight.intensity = lvl * flick * (2.2 + flameSprites.length * .45) * lt * (nodes.key.p.lvl == null ? 1 : nodes.key.p.lvl);
    keyLight.color.setHSL(.075 - ((nodes.key.p.warm == null ? .6 : nodes.key.p.warm) - .6) * .03, .95, .58);
    // the children are lit by the flames
    if (nodes.kids.obj) { const k = .1 + lvl * (.75 + .25 * flick) * lt; nodes.kids.obj.material.color.setRGB(k, k * .88, k * .66); }
    // the pen and its nozzle
    const wr = nodes.writing; nozzle.visible = wr.exists && S.chan === 'etch' && nsel().kind === 'writing'; if (nozzle.visible) { const ti = topInfo(); nozzle.position.set(WR.px, ti.y + .1 + (WR.down ? 0 : .1), WR.py); }
    // plates: slow breathing; recede; bug turntable
    if (curSet === 'B') { const r = nodes.forest.p.recede || 0; ['near', 'mid'].forEach((id, i) => { const o = nodes[id].obj; const e = clamp((r * 1.5 - i * .4) / .6, 0, 1); o.position.y = (nodes[id].py == null ? 0 : nodes[id].py) - e * e * 7; });
      const b = nodes.bug; if (b.img && b.obj.material.map) { const fr = Math.floor(((b.p.yaw % 1) + 1) % 1 * 12); b.obj.material.map.offset.x = fr / 12; const w = b.img.naturalWidth / 12, h = b.img.naturalHeight; b.obj.geometry.dispose(); b.obj.geometry = new T.PlaneGeometry(1.6, 1.6 * h / w); b.img.dispose; } }
    // the lens
    post.uniforms.time.value = tAcc;
    const w = renderer.domElement.width, h = renderer.domElement.height; ensureRT(w, h); post.uniforms.texel.value.set(1 / w, 1 / h);
    post.uniforms.near.value = cam.near; post.uniforms.far.value = cam.far;
    renderer.setRenderTarget(rt); renderer.setClearColor(0x020202, 1); renderer.clear(); renderer.render(scene, cam);
    post.uniforms.tColor.value = rt.texture; post.uniforms.tDepth.value = rt.depthTexture; renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    placeReticle();
    if (dirty || performance.now() - lastUI > 400) { dirty = false; lastUI = performance.now(); drawMenu(); sendUI(); }
    flushFx();
    if (window.__frameHook) window.__frameHook(dt, tAcc);
  }
  /* ------------------------------------------------------------------ link */
  let lastSentUI = '';
  function sendUI() { if (!window.PAIR || !PAIR.room) return; PAIR.send({ k: 'ui', u: ui() }); }
  function flushFx() { if (!fxQ.length) return; const q = fxQ; fxQ = []; if (window.PAIR && PAIR.room) PAIR.send({ k: 'fx', n: q.slice(-6) }); if (window.__fxHook) q.forEach(window.__fxHook); }
  let lastSeqApplied = 0;
  function onmsg(m) {
    if (m.role !== 'pad') return;
    if (m.k === 'ring') ring(m.i, m.d);
    else if (m.k === 'key') key(m.id, m.dn);
    else if (m.k === 'spread') spread(m.v);
    else if (m.k === 'imu') imu(m.y, m.p, m.r, m.dn);
    else if (m.k === 'shake') shake();
    lastSeqApplied = m.q; if (m.k !== 'imu' && window.PAIR) PAIR.send({ k: 'ack', q: m.q, t: m.t });
    document.body.classList.add('paired');
  }
  window.STAGE = { ring, key, spread, imu, shake, onmsg, ui, nodes, S, C, WR, place, undo, focusMarks, scene, SETA, cam, keyLight, post, T, tex, card, topInfo, cakeG, flameSprites, instant() { Object.values(nodes).forEach(n => { if (n.grow != null) { n.grow = 1; if (n.obj) { if (n.kind === 'border') n.obj.count = n.p.count; else n.obj.scale.set(1, 1, 1); } } }); nodes.flames.lit = 1; }, start() { frame(); } };
  nodes.birthday.exists = true; afterSel();
})();
