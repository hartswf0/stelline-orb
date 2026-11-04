/* The scene: the film as a model, and the bench where the user builds.
   FILM MODEL. Each shot is rebuilt from its own pixels: a clean plate (the frame with its people and things painted out) is the
   back wall, displaced by the shot's depth map; every cut part is a card of the frame's pixels inside its mask, stood forward at its
   layer and given relief. Each layer is scaled so that from the film's camera it lands exactly where the frame had it: at DEPTH = FILM
   the model is the frame; turning DEPTH swings the camera round the model and pulls the layers apart.
   BENCH. The builders' scenes are made of procedural parts (beetle, leaf, cake, candles, table, the dome floor, any shape) and of
   cards cut from the film. DEPTH on the bench wipes from the film's frame to the bench seen from the same camera.
   Both pass through one finishing step: the act's grade, bloom from the bright parts, lens softness, vignette and grain. */
(function () {
  const { ST, curShot, cur, partsOf, edit } = window.CORE;
  const T = THREE, FW = 16, FH = 9, FOV = 32, DIST = (FH / 2) / Math.tan(FOV * Math.PI / 360);
  const S = window.SCENE = { ready: false };
  let R, W = 1, H = 1, filmScene, filmCam, benchScene, benchCam, rtA, rtB, post, postScene, postCam, loader = new T.TextureLoader();
  const texCache = new Map(), maskData = new Map();
  function tex(url, nearest) { if (texCache.has(url)) return texCache.get(url); const t = loader.load(url, () => { S.dirty = true; }); t.generateMipmaps = !nearest; if (nearest) { t.minFilter = T.NearestFilter; t.magFilter = T.NearestFilter; } else { t.minFilter = T.LinearMipmapLinearFilter; t.anisotropy = 4; }
    t.encoding = nearest ? T.LinearEncoding : T.sRGBEncoding; t.wrapS = t.wrapT = T.MirroredRepeatWrapping; texCache.set(url, t); return t; }
  const url = (k, n) => ST.base + k + String(n).padStart(2, '0') + (k === 'f' || k === 'b' ? '.jpg' : '.png');
  function loadMask(n) { if (maskData.has(n)) return maskData.get(n); const o = { w: 0, h: 0, d: null }; maskData.set(n, o); const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); o.d = x.getImageData(0, 0, im.width, im.height).data; o.w = im.width; o.h = im.height; }; im.src = url('m', n); return o; }
  S.maskAt = (n, u, v) => { const o = loadMask(n); if (!o.d) return -1; const x = Math.min(o.w - 1, Math.max(0, Math.floor(u * o.w))), y = Math.min(o.h - 1, Math.max(0, Math.floor(v * o.h))); return o.d[(y * o.w + x) * 4]; };

  /* ---------------- the film model ---------------- */
  const LAYER_VS = `uniform sampler2D depth; uniform float relief, zl, sc, dist; varying vec2 vUv; varying float vD;
    void main(){ vUv=uv; float d=texture2D(depth,clamp(uv,0.0,1.0)).r; vD=d; vec3 p=position; p.z=zl+d*relief; p.xy*=(dist-p.z)/dist; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;
  const LAYER_FS = `uniform sampler2D map, map2, mask; uniform float figs[12]; uniform float feather; uniform float nf, ap, mixp, k, isAll, sel, dim, light, op, t, edge; uniform vec2 px; varying vec2 vUv; varying float vD;
    float is(vec2 u){ return isAll>.5?1.0:step(abs(texture2D(mask,clamp(u,.0008,.9992)).r*255.0-k),.5); }
    void main(){ float a=is(vUv); float n=is(vUv+vec2(px.x,0.))+is(vUv-vec2(px.x,0.))+is(vUv+vec2(0.,px.y))+is(vUv-vec2(0.,px.y)); float sm=0.0; for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++) sm+=is(vUv+vec2(float(i),float(j))*px*feather); float soft=isAll>.5?1.0:smoothstep(.42,1.0,(a*3.0+n+sm)/16.0); if(soft<.02) discard;
      float mk=texture2D(mask,clamp(vUv,0.001,.999)).r*255.0; float under=0.0; if(isAll>.5){ for(int q=0;q<5;q++){ vec2 o=q==0?vec2(0.):q==1?vec2(4.,0.):q==2?vec2(-4.,0.):q==3?vec2(0.,4.):vec2(0.,-4.); float m2=texture2D(mask,clamp(vUv+o*px,.001,.999)).r*255.0; float f=0.0; for(int i=0;i<12;i++){ f=max(f,step(abs(m2-figs[i]),.5)); } under+=f; } under=step(4.5,under); } vec3 c=mix(texture2D(map,vUv).rgb,texture2D(map2,vUv).rgb,mixp*under); c*=mix(.35,1.65,light); float g=dot(c,vec3(.3,.59,.11)); c=mix(c,vec3(g)*vec3(.9,.95,1.0),dim*.7); c*=1.0-dim*.6;
      float rim=a*(1.0-step(3.5,n)); c+=sel*edge*rim*vec3(1.0,.95,.85)*(.55+.45*sin(t*3.0));
      float hn=fract(sin(dot(floor(vUv*vec2(160.,90.)),vec2(12.9898,78.233)))*43758.5453); float on=ap>.999?1.0:smoothstep(hn-.08,hn+.08,ap*1.15-.05); c+=(1.0-ap)*vec3(.22,.27,.3)*(.5+.5*sin(vUv.y*300.0+t*4.0));
      gl_FragColor=vec4(c,soft*op*on*mix(.55,1.0,ap)); }`;
  function layerMat(map, n, k, all) { return new T.ShaderMaterial({ vertexShader: LAYER_VS, fragmentShader: LAYER_FS, transparent: true, depthWrite: !!all,
    uniforms: { map: { value: map }, map2: { value: map }, ap: { value: 1 }, mixp: { value: 0 }, mask: { value: tex(url('m', n), true) }, depth: { value: tex(url('d', n)) }, k: { value: k }, isAll: { value: all ? 1 : 0 }, sel: { value: 0 }, dim: { value: 0 }, light: { value: .5 }, op: { value: 1 }, t: { value: 0 }, edge: { value: 0 },
      px: { value: new T.Vector2(1 / 640, 1 / 360) }, relief: { value: 0 }, zl: { value: 0 }, sc: { value: 1 }, dist: { value: DIST }, nf: { value: 0 }, figs: { value: new Array(12).fill(-9) }, feather: { value: 1.6 } } }); }
  const PG = new T.PlaneGeometry(FW, FH, 160, 90);
  // the back wall runs past the frame's edges (the picture mirrored outward), so a swung camera never sees past it
  const PGB = (() => { const g = new T.PlaneGeometry(FW * 1.5, FH * 1.5, 180, 100), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.5 - .25, uv.getY(i) * 1.5 - .25); return g; })();
  let FM = null; // the film model now built
  function buildFilm(e) {
    if (FM) { filmScene.remove(FM.g); FM.g.traverse(o => o.material && o.material.dispose()); } FM = null; if (!e) return;
    const g = new T.Group(); filmScene.add(g);
    if (e.kind === 'mem') { const t = e.tex || (e.tex = (() => { const x = loader.load(e.img); x.encoding = T.sRGBEncoding; return x; })()); const m = new T.Mesh(PG, new T.MeshBasicMaterial({ map: t, toneMapped: false })); g.add(m); FM = { g, mem: true, n: e.ref, layers: [] }; return; }
    const n = e.n, sh = ST.atlas.shots[n]; loadMask(n);
    const back = new T.Mesh(PGB, layerMat(tex(url('f', n)), n, 0, true)); back.material.uniforms.map2.value = tex(url('b', n)); back.material.uniforms.figs.value = sh.parts.filter(p => p.kind !== 'ground').map(p => p.k).concat(new Array(12).fill(-9)).slice(0, 12); back.renderOrder = 0; g.add(back);
    const layers = []; partsOf(sh).forEach((p, i) => { const m = new T.Mesh(PGB, layerMat(tex(url(p.kind === 'ground' ? 'b' : 'f', n)), n, p.k, false)); m.material.uniforms.feather.value = p.sharp < 1 ? 3.2 : p.sharp < 2.5 ? 2.2 : 1.4; m.renderOrder = 1 + (p.kind === 'ground' ? 0 : Math.round(p.z * 100)); g.add(m); layers.push({ m, p, i }); });
    FM = { g, n, back, layers };
  }
  function updateFilm(now, dt) {
    if (!FM || FM.mem) return; const sh = ST.atlas.shots[FM.n], sp = S.sp, cutting = ST.mode === 'cut', t = now / 1000;
    const zOf = p => p.kind === 'ground' ? 0 : (p.z - .25) * 7 * sp + edit(FM.n, p.k).z * 3.2 * Math.max(.35, sp);
    // the back wall: the clean plate, pushed back and given the depth map's relief as the model opens
    const bz = -3.2 * sp, bm = FM.back.material.uniforms; bm.zl.value = bz; bm.relief.value = 2.2 * sp; bm.sc.value = (DIST - bz) / DIST; bm.light.value = cutting ? .5 : ST.light; bm.dim.value = cutting ? .45 : 0; bm.mixp.value = Math.max(0, Math.min(1, (sp - .12) / .38));
    for (const L of FM.layers) { const u = L.m.material.uniforms, p = L.p, z = p.kind === 'ground' ? bz + .01 : zOf(p), selected = L.i === ST.part;
      u.zl.value = z; u.relief.value = (p.kind === 'ground' ? 2.2 : 1.1 + p.area * 2) * sp; u.sc.value = (DIST - z) / DIST; u.t.value = t;
      const E = edit(FM.n, p.k); u.light.value = Math.max(0, Math.min(1, (cutting ? .5 : ST.light) + (E.light - .5)));
      u.sel.value = selected ? 1 : 0; u.edge.value = cutting ? 1 : ST.mode === 'build' ? 0 : Math.max(0, 1 - (now - S.partAt) / 1600) * .8;
      u.dim.value = cutting && !selected ? .55 : 0; u.op.value = p.kind === 'ground' && !cutting ? 0 : 1;
      L.m.visible = !(p.kind === 'ground' && !cutting && !selected); }
    // the camera: at the film's place when DEPTH is FILM; VIEW and DEPTH swing it round the model
    const yaw = (ST.view * 50 - 28 * sp) * Math.PI / 180 + (S.handOrbit ? S.handOrbit[0] : 0), pitch = (10 * sp) * Math.PI / 180 + (S.handOrbit ? S.handOrbit[1] : 0), d = DIST + 4 * sp;
    const drift = ST.mode === 'watch' && ST.playing ? Math.sin(t * .35) * .015 : 0;
    filmCam.position.set(Math.sin(yaw + drift) * Math.cos(pitch) * d, Math.sin(pitch) * d, Math.cos(yaw + drift) * Math.cos(pitch) * d); filmCam.lookAt(0, 0, -1.2 * sp);
    const off = Math.abs(yaw) + Math.abs(pitch), punch = 1 + off * 1.15 * (1 - Math.min(1, sp * 1.3)) + 0.0; filmCam.zoom = punch; filmCam.updateProjectionMatrix(); post.uniforms.sharp.value = Math.min(.55, .25 + off * 3);
  }

  /* ---------------- the bench: built in the film's own camera space ----------------
     The bench is the reference shot's model (its plate and its cut parts, as on the film side) with the builder's things in it.
     A made thing (beetle, cake, table, a shape) stands for one or more cut parts. FIT places it: position, size and tilt are
     turned until its outline from the film's camera covers the parts' masks (the film sets the settings).
     Then the film's pixels are baked onto it from that camera: its FILM SKIN. With the skin on and the thing at rest it is the
     frame; as MAKE bends it (a bundt, a step of the legs) the film's pixels go with the surface; with the skin off it is the
     model alone, and IMPRINT measures how far the model alone is from the film. */
  function canvasTex(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
  const TX = {};
  function facetTex() { return TX.facet || (TX.facet = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#1a1f1a'; x.fillRect(0, 0, w, h); const r = 7; for (let j = 0; j < h / (r * 1.5) + 2; j++) for (let i = 0; i < w / (r * 1.732) + 2; i++) { const cx = i * r * 1.732 + (j % 2) * r * .866, cy = j * r * 1.5;
      const g = x.createRadialGradient(cx - 1.5, cy - 1.5, .5, cx, cy, r); g.addColorStop(0, '#9aa596'); g.addColorStop(.35, '#3c463b'); g.addColorStop(1, '#0c0f0c'); x.fillStyle = g; x.beginPath(); for (let a = 0; a < 6; a++) x.lineTo(cx + r * .98 * Math.cos(a * Math.PI / 3 + Math.PI / 6), cy + r * .98 * Math.sin(a * Math.PI / 3 + Math.PI / 6)); x.fill(); } })); }
  function leafTex() { return TX.leaf || (TX.leaf = canvasTex(1024, 1024, (x, w, h) => { const g = x.createRadialGradient(w * .5, h * .45, 50, w * .5, h * .5, w * .7); g.addColorStop(0, '#9ccf5a'); g.addColorStop(.6, '#6aa33a'); g.addColorStop(1, '#3f7424'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(220,245,170,.55)'; x.lineWidth = 9; x.beginPath(); x.moveTo(w / 2, h); x.lineTo(w / 2, 0); x.stroke(); x.lineWidth = 3.5; for (let k = 1; k < 12; k++) { const y = h - k * h / 12; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(w / 2, y); x.quadraticCurveTo(w / 2 + s * w * .2, y - h * .05, w / 2 + s * w * .48, y - h * .14); x.stroke(); } }
      x.strokeStyle = 'rgba(40,80,20,.25)'; x.lineWidth = 1; for (let k = 0; k < 900; k++) { const a = Math.random() * w, b = Math.random() * h; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (Math.random() - .5) * 30, b + (Math.random() - .5) * 30); x.stroke(); } })); }
  function bokehTex(kind) { const k = 'bokeh' + kind; return TX[k] || (TX[k] = canvasTex(1024, 576, (x, w, h) => {
      if (kind === 'forest') { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d9ecb0'); g.addColorStop(.45, '#8fbf55'); g.addColorStop(1, '#4d7d2c'); x.fillStyle = g; x.fillRect(0, 0, w, h);
        x.filter = 'blur(18px)'; for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${200 + Math.random() * 55 | 0},${230 + Math.random() * 25 | 0},${150 + Math.random() * 80 | 0},${.12 + Math.random() * .35})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 90, 0, 7); x.fill(); }
        for (let i = 0; i < 30; i++) { x.fillStyle = `rgba(40,${70 + Math.random() * 40 | 0},25,${.2 + Math.random() * .3})`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 40 + Math.random() * 120, 0, 7); x.fill(); } }
      else { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); } })); }
  function icingTex() { return TX.icing || (TX.icing = canvasTex(1024, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#c4161c'; x.font = 'bold 74px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = 'rgba(80,0,0,.6)'; x.shadowBlur = 3; for (const cx of [w * .25, w * .75]) x.fillText('生日快樂', cx, h / 2); })); }
  function flameTex() { return TX.flame || (TX.flame = canvasTex(64, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h * .62, 1, w / 2, h * .58, h * .45); g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(.25, 'rgba(255,220,120,.95)'); g.addColorStop(.6, 'rgba(255,140,30,.45)'); g.addColorStop(1, 'rgba(255,90,0,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(w / 2, h * .6, w * .42, h * .42, 0, 0, 7); x.fill(); })); }
  function glowTex() { return TX.glow || (TX.glow = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,220,150,.9)'); g.addColorStop(.3, 'rgba(255,170,60,.35)'); g.addColorStop(1, 'rgba(255,120,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); })); }
  const M = (o) => new T.MeshPhysicalMaterial(o);
  function tube(pts, r, mat, seg) { const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))); return new T.Mesh(new T.TubeGeometry(c, seg || 24, r, 8, false), mat); }
  const BUILD = {
    leaf(it) { const g = new T.Group(), geo = new T.PlaneGeometry(9, 9, 60, 60), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -Math.pow(Math.abs(x) / 4.5, 2) * 1.6 * it.curl - Math.pow((y + 4.5) / 9, 2) * .4); } geo.computeVertexNormals();
      const m = new T.Mesh(geo, M({ map: leafTex(), roughness: .32, clearcoat: .6, clearcoatRoughness: .25, side: T.DoubleSide })); m.rotation.x = -Math.PI / 2 + .05; m.position.set(0, 0, -1.5); g.add(m);
      const dm = M({ color: 0xffffff, roughness: 0, transmission: .95, thickness: .2, ior: 1.33, transparent: true });
      const rnd = mulberry(7); const n = Math.round(4 + it.wet * 26); for (let k = 0; k < n; k++) { const r = .03 + rnd() * .09, d = new T.Mesh(new T.SphereGeometry(r, 18, 12), dm); d.scale.y = .55; d.position.set((rnd() - .5) * 4, r * .45, (rnd() - .5) * 3 - 1.2); g.add(d); }
      const bg = new T.Mesh(new T.PlaneGeometry(26, 15), new T.MeshBasicMaterial({ map: bokehTex('forest'), toneMapped: false, fog: false })); bg.position.set(0, 2.5, -8); g.add(bg); return g; },
    beetle(it, now) { const g = new T.Group();
      const chitin = M({ color: new T.Color().setHSL(.28 + (it.sheen - .5) * .12, .22, .06), metalness: .45, roughness: .32, clearcoat: 1, clearcoatRoughness: .18 });
      const ell = (r, s, p) => { const m = new T.Mesh(new T.SphereGeometry(r, 48, 32), chitin); m.scale.set(...s); m.position.set(...p); g.add(m); return m; };
      ell(.5, [1, .62, 1.55], [0, .5, -1.25]); ell(.38, [1.15, .62, .9], [0, .5, -.42]); const head = ell(.27, [1.25, .95, .9], [0, .5, -.02]);
      // compound eyes: hemispheres of facets; the facets read only when the eye is in focus
      const eyeM = M({ map: facetTex(), bumpMap: facetTex(), bumpScale: .015, roughness: .22, metalness: .2, clearcoat: 1, clearcoatRoughness: .1 }); eyeM.map.wrapS = eyeM.map.wrapT = T.RepeatWrapping; eyeM.map.repeat.set(3, 2);
      for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(.17, 48, 32), eyeM); e.position.set(s * .25, .54, .03); e.scale.set(.75, 1, .85); g.add(e); }
      // mandibles
      for (const s of [-1, 1]) g.add(tube([[s * .12, .4, .18], [s * .1, .36, .3], [s * .03, .34, .36]], .025, chitin, 12));
      // antennae: long, beaded, sweeping up and back as in the macro shot
      for (const s of [-1, 1]) { const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([s * (.16 + t * .55), .62 + Math.sin(t * 2.2) * .5, .12 - t * .25]); } g.add(tube(pts, .018, chitin, 40));
        for (let k = 1; k < 10; k++) { const t = k / 10, b = new T.Mesh(new T.SphereGeometry(.026, 10, 8), chitin); b.position.set(s * (.16 + t * .55), .62 + Math.sin(t * 2.2) * .5, .12 - t * .25); g.add(b); } }
      // six legs, three joints each; GAIT moves them
      const ph = (now / 1000) * 3 * it.gait, legs = [];
      for (let j = 0; j < 3; j++) for (const s of [-1, 1]) { const z = -.25 - j * .38, sw = Math.sin(ph + j * 2.1 + (s > 0 ? Math.PI : 0)) * .12 * it.gait, base = [s * .3, .42, z];
        const knee = [s * .78, .6, z + .1 + sw + (j === 0 ? .3 : 0)], foot = [s * 1.15, 0.02, z + .25 + sw * 1.4 + (j === 0 ? .55 : 0)];
        const pts = [base, knee, foot]; g.add(tube(pts, .035 - j * .003, chitin, 20)); legs.push(pts); }
      // setae: fine hairs on the legs and the head's rim, grown by SETAE
      if (it.setae > .02) { const n = 900, cone = new T.ConeGeometry(.0035, 1, 3), im = new T.InstancedMesh(cone, new T.MeshStandardMaterial({ color: 0x8a8f78, roughness: .8 }), n), m4 = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), rnd = mulberry(11);
        for (let k = 0; k < n; k++) { let P, N; if (k < n * .7) { const L = legs[k % 6], t = rnd(), a = new T.Vector3(...(t < .5 ? L[0] : L[1])), b = new T.Vector3(...(t < .5 ? L[1] : L[2])); P = a.lerp(b, (t % .5) * 2); N = new T.Vector3(rnd() - .5, rnd() * .6, rnd() - .5).normalize(); }
          else { const a = rnd() * Math.PI * 2; P = new T.Vector3(Math.cos(a) * .33, .5 + Math.sin(a) * .24, -.02); N = new T.Vector3(Math.cos(a), Math.sin(a), .3).normalize(); }
          const len = (.03 + rnd() * .07) * it.setae; q.setFromUnitVectors(up, N); m4.compose(P.add(N.clone().multiplyScalar(len / 2)), q, new T.Vector3(1, len, 1)); im.setMatrixAt(k, m4); } g.add(im); }
      SK(g); return g; },
    shaft(it) { const m = new T.Mesh(new T.ConeGeometry(1.3, 9, 32, 1, true), new T.MeshBasicMaterial({ color: 0xfffbe0, transparent: true, opacity: .12 * it.amount, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
      m.position.set(it.x, 4, it.z); m.rotation.z = .35; return m; },
    floor(it) { const g = new T.Group(); const f = new T.Mesh(new T.CircleGeometry(30, 96), new T.MeshStandardMaterial({ color: 0x0c0d0d, roughness: .22, metalness: .2 })); f.rotation.x = -Math.PI / 2; g.add(f);
      const lm = new T.MeshBasicMaterial({ color: 0xf2efe2, toneMapped: false, fog: false }); const hor = new T.Mesh(new T.TorusGeometry(13, .035, 6, 200), lm); hor.rotation.x = Math.PI / 2; hor.position.y = 1.25; g.add(hor);
      const n = Math.round(it.rings * 4); for (let k = 0; k < n; k++) { const r = new T.Mesh(new T.TorusGeometry(2.4 + k * 1.6, .008, 4, 160), new T.MeshBasicMaterial({ color: 0x6d6f68, fog: false })); r.rotation.x = Math.PI / 2; r.position.y = .003; g.add(r); }
      return g; },
    table(it) { const g = new T.Group(), top = new T.Mesh(new T.CylinderGeometry(2.25, 2.25, .08, 6), new T.MeshStandardMaterial({ color: 0xd8a23a, emissive: new T.Color(.95, .62, .16), emissiveIntensity: .1 + it.glow * .45, roughness: .6 })); top.position.y = .5; g.add(top);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), blending: T.AdditiveBlending, depthWrite: false, opacity: .35 * it.glow, fog: false })); glow.scale.set(7, 3, 1); glow.position.y = .6; g.add(glow); top.userData.sk = 'top'; return g; },
    cake(it, now) { const g = new T.Group(), R = .72, Hh = .55, seg = 120, rows = 24, geo = new T.CylinderGeometry(R, R, Hh, seg, rows, false), p = geo.attributes.position;
      // the cylinder becomes a fluted ring cake: flutes around, a softer crown, a hole down the middle
      for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x), r = Math.hypot(x, z); if (r < 1e-4) continue; const v = (y + Hh / 2) / Hh;
        let rr = r * (1 + it.bundt * (.07 * Math.cos(a * 12) * (1 - .3 * v))); const crown = it.bundt * .12 * Math.sin(v * Math.PI); rr += crown * .3; p.setX(i, Math.cos(a) * rr); p.setZ(i, Math.sin(a) * rr); }
      geo.computeVertexNormals();
      const body = new T.Mesh(geo, new T.MeshStandardMaterial({ color: new T.Color().setHSL(.07, .55, .16 + it.bundt * .1), roughness: .75 })); body.position.y = Hh / 2; g.add(body);
      const top = new T.Mesh(new T.CylinderGeometry(R * (1 + it.bundt * .05), R * .98, .06, seg), new T.MeshStandardMaterial({ color: 0xead2a4, roughness: .55, emissive: 0x3a2008, emissiveIntensity: .2 })); top.position.y = Hh + .02; g.add(top);
      if (it.bundt > .3) { const hole = new T.Mesh(new T.CylinderGeometry(R * .22 * it.bundt, R * .22 * it.bundt, .08, 32), new T.MeshBasicMaterial({ color: 0x050302 })); hole.position.y = Hh + .03; g.add(hole); }
      if (it.icing > .01) { const band = new T.Mesh(new T.CylinderGeometry(R * 1.015 * (1 + it.bundt * .07), R * 1.015 * (1 + it.bundt * .07), .2, seg, 1, true), new T.MeshBasicMaterial({ map: icingTex(), transparent: true, opacity: it.icing, depthWrite: false })); band.position.y = Hh * .55; band.rotation.y = -Math.PI / 2; g.add(band); }
      const C = it.canon || {}, filmHas = it.skin > .5 && it.candles === C.candles && it.bundt < .05 && it.fit, n = filmHas ? 0 : Math.round(it.candles), cm = new T.MeshStandardMaterial({ color: 0xf3efe6, roughness: .5 }), fl = flameTex();
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + .3, rr = n === 1 ? 0 : R * .55, c = new T.Mesh(new T.CylinderGeometry(.028, .028, .32, 10), cm); c.position.set(Math.cos(a) * rr, Hh + .2, Math.sin(a) * rr); g.add(c);
        if (it.flames > .02) { const f = new T.Sprite(new T.SpriteMaterial({ map: fl, blending: T.AdditiveBlending, depthWrite: false, opacity: it.flames, fog: false, toneMapped: false })); const fk = 1 + .08 * Math.sin(now / 90 + k * 1.7); f.scale.set(.09 * fk, .2 * fk * it.flames, 1); f.position.set(Math.cos(a) * rr, Hh + .44, Math.sin(a) * rr); g.add(f); } }
      if (it.flames > .02 && n) { const L = new T.PointLight(0xffb060, 2.2 * it.flames * Math.sqrt(n / 3), 6, 2); L.position.set(0, Hh + .7, 0); g.add(L); const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), blending: T.AdditiveBlending, depthWrite: false, opacity: .5 * it.flames, fog: false })); glow.scale.set(1.8, 1.4, 1); glow.position.y = Hh + .45; g.add(glow); }
      body.userData.sk = 'body'; top.userData.sk = 'top'; return g; },
    prim(it) { const s = Math.round(it.shape), mat = new T.MeshPhysicalMaterial({ color: new T.Color().setHSL(.1, .05, .78), roughness: .35, clearcoat: .5 }), z = it.size;
      const G = [() => new T.SphereGeometry(.5, 64, 48), () => new T.LatheGeometry(capsule(.32, .7), 64), () => new T.CylinderGeometry(.45, .45, 1, 64), () => new T.ConeGeometry(.5, 1, 64), () => new T.BoxGeometry(.85, .85, .85), () => new T.TorusGeometry(.4, .14, 32, 96)][Math.max(0, Math.min(5, s))]();
      const m = new T.Mesh(G, mat); m.scale.setScalar(z); m.position.y = .5 * z; m.rotation.y = it.turn * Math.PI; m.userData.sk = 'p'; const g = new T.Group(); g.add(m); return g; }
  };
  function capsule(r, h) { const pts = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + i / 16 * Math.PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, -h / 2 + Math.sin(a) * r)); } for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; pts.push(new T.Vector2(Math.cos(a) * r, h / 2 + Math.sin(a) * r)); } return pts; }
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const SK = g => { let i = 0; g.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSprite) o.userData.sk = 's' + (i++); }); };
  BUILD.beetle = (it, now) => window.ANATOMY.beetle(it, now); BUILD.cake = (it, now) => window.ANATOMY.cake(it, now);
  const ANIM = {};
  const B = { g: null, film: null, items: new Map(), lights: null, grade: '', refCam: null, fitting: null, baked: new Map() };
  const LAYER_SPREAD = .35;
  // a relief layer's place: the frame's pixels at depth z, scaled so the film's camera sees them where the frame had them
  const zOfPart = p => p.kind === 'ground' ? -3.2 * LAYER_SPREAD : (p.z - .25) * 7 * LAYER_SPREAD;
  function benchFilm(n) {
    if (B.film) { B.g.remove(B.film.g); B.film.g.traverse(o => o.material && o.material.dispose()); } const g = new T.Group(); B.g.add(g); loadMask(n);
    const sh = ST.atlas.shots[n], back = new T.Mesh(PGB, layerMat(tex(url('f', n)), n, 0, true)); back.material.uniforms.map2.value = tex(url('b', n)); back.material.uniforms.figs.value = sh.parts.filter(p => p.kind !== 'ground').map(p => p.k).concat(new Array(12).fill(-9)).slice(0, 12); back.renderOrder = 0; g.add(back);
    const layers = sh.parts.filter(p => p.kind !== 'ground').map(p => { const m = new T.Mesh(PGB, layerMat(tex(url('f', n)), n, p.k, false)); m.material.uniforms.feather.value = p.sharp < 1 ? 3.2 : p.sharp < 2.5 ? 2.2 : 1.4; m.renderOrder = 1 + Math.round(p.z * 100); g.add(m); return { m, p }; });
    B.film = { n, g, back, layers }; }
  // a card cut from another shot, laid into this one
  function foreignCard(it) { const sh = ST.atlas.shots[it.src.n], p = sh.parts.find(q => q.k === it.src.k), m = new T.Mesh(PG, layerMat(tex(url('f', it.src.n)), it.src.n, p.k, false)); m.renderOrder = 60;
    const [x0, y0, x1, y1] = p.bbox, cx = ((x0 + x1) / 2 / 640 - .5) * FW, cy = (.5 - (y0 + y1) / 2 / 360) * FH, z = .6 + it.push * 2.5, sz = it.size, sc = (DIST - z) / DIST;
    const u = m.material.uniforms; u.zl.value = 0; u.relief.value = .5; u.sc.value = 1; u.ap.value = it.appear; u.light.value = it.light;
    m.scale.set(sz * sc, sz * sc, 1); m.position.set(cx * sc * (1 - sz) + (it.slide || 0) * 4, cy * sc * (1 - sz), z); return m; }
  function refCamera() { if (!B.refCam) B.refCam = new T.PerspectiveCamera(FOV, 16 / 9, .1, 200); B.refCam.position.set(0, 0, DIST); B.refCam.lookAt(0, 0, 0); B.refCam.updateMatrixWorld(); B.refCam.updateProjectionMatrix(); return B.refCam; }
  // place a thing by its fit: position in the film's space, size, tilt toward the camera, turn
  function place(o, f) { o.position.set(f.x, f.y, f.z); o.scale.set(f.s, f.s * (f.sy || 1), f.s); o.rotation.set(f.rx || 0, f.ry || 0, 0, 'YXZ'); o.updateMatrixWorld(true); }
  // the parts a thing stands for, as a mask at 160 x 90 (row 0 at the bottom, as the GPU reads)
  function targetMask(n, ks, w, h) { const o = loadMask(n); if (!o.d) return null; const t = new Uint8Array(w * h); let N = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = o.d[((Math.floor((1 - (y + .5) / h) * o.h)) * o.w + Math.floor((x + .5) / w * o.w)) * 4]; if (ks.includes(k)) { t[y * w + x] = 1; N++; } } return { t, N }; }
  function firstFit(it, rest) { const sh = ST.atlas.shots[ST.build.ref], all = sh.parts.filter(p => it.src.ks.includes(p.k)), main = all.filter(p => p.k === it.src.ks[0]), ps = main.length ? main : all; if (!ps.length) return { x: 0, y: -2, z: 0, s: 1, rx: .3, ry: 0, sy: 1 };
    const bb = ps.reduce((a, p) => [Math.min(a[0], p.bbox[0]), Math.min(a[1], p.bbox[1]), Math.max(a[2], p.bbox[2]), Math.max(a[3], p.bbox[3])], [1e9, 1e9, -1e9, -1e9]), z = Math.max(...ps.map(zOfPart)) + .3, sc = (DIST - z) / DIST;
    rest.rotation.set(it.tilt0 || 0, 0, 0); rest.updateMatrixWorld(true); const box = new T.Box3().setFromObject(rest), mh = Math.max(.01, box.max.y - box.min.y), wh = (bb[3] - bb[1]) / 360 * FH * sc, s = wh / mh;
    if (it.anchor) { let hm = null; rest.traverse(o => { if (o.userData.sk === it.anchor.mesh) hm = o; }); if (hm) { const hb = new T.Box3().setFromObject(hm), ww = (bb[2] - bb[0]) / 640 * FW * sc * it.anchor.frac, s2 = ww / Math.max(.01, hb.max.x - hb.min.x);
        return { x: ((bb[0] + bb[2]) / 2 / 640 - .5) * FW * sc, y: (.5 - (bb[1] + bb[3]) / 2 / 360) * FH * sc - (hb.min.y + hb.max.y) / 2 * s2 + (it.anchor.dy || 0) * FH * sc, z, s: s2, rx: it.tilt0 || 0, ry: 0, sy: 1 }; } }
    return { x: ((bb[0] + bb[2]) / 2 / 640 - .5) * FW * sc, y: (.5 - bb[3] / 360) * FH * sc - box.min.y * s, z, s, rx: it.tilt0 || 0, ry: 0, sy: 1 }; }
  const FITW = 160, FITH = 90; let fitRT = null, fitScene = null; const WHITE = new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide });
  function silhouette(o, f, buf) { if (!fitRT) { fitRT = new T.WebGLRenderTarget(FITW, FITH); fitScene = new T.Scene(); fitScene.background = new T.Color(0); fitScene.overrideMaterial = WHITE; }
    fitScene.add(o); place(o, f); R.setRenderTarget(fitRT); R.render(fitScene, refCamera()); R.readRenderTargetPixels(fitRT, 0, 0, FITW, FITH, buf); fitScene.remove(o); R.setRenderTarget(null); }
  function iou(buf, M) { let I = 0, U = 0; for (let i = 0; i < FITW * FITH; i++) { const a = buf[i * 4] > 127 ? 1 : 0, b = M.t[i]; I += a & b; U += a | b; } return U ? I / U : 0; }
  // FIT: the film turns the settings. A climb over position, size, tilt and turn, a few steps a frame so it is seen happening
  S.fit = function (it, iters) { const M = targetMask(ST.build.ref, it.src.ks, FITW, FITH); if (!M) return null; const rest = BUILD[it.type](Object.assign({}, it, it.canon || {}), 0), buf = new Uint8Array(FITW * FITH * 4);
    rest.traverse(o => { if (o.isSprite || o.isLight) o.visible = false; });
    let f = Object.assign({}, it.fit || firstFit(it, rest)); const s0 = f.s; let best; silhouette(rest, f, buf); best = iou(buf, M); let step = 1, k = 0; const keys = ['x', 'y', 's', 'rx', 'ry', 'sy'], scale = { x: .3, y: .3, s: .1, rx: .12, ry: .25, sy: .08 };
    window.CORE.log('fit', it.name + ' starts at ' + Math.round(best * 100) + '%');
    B.fitting = { it, n: iters || 260, k: 0, best, run() { for (let j = 0; j < 8 && k < this.n; j++, k++) { const g = Object.assign({}, f), key = keys[Math.floor(Math.random() * keys.length)], d = (Math.random() * 2 - 1) * scale[key] * step * (key === 'x' || key === 'y' ? Math.max(.5, f.s) : 1);
          g[key] = (g[key] == null ? (key === 'sy' ? 1 : 0) : g[key]) + d; if (g.s <= .01 || (it.anchor && Math.abs(g.s / s0 - 1) > .2) || g.sy < .6 || g.sy > 1.7 || Math.abs(g.rx - (it.tilt0 || 0)) > .35 || Math.abs(g.ry) > .25) continue; silhouette(rest, g, buf); const v = iou(buf, M); if (v > best) { best = v; f = g; } if (k % 70 === 69) step *= .6; }
        this.k = k; this.best = best; it.fit = f; it.iou = +best.toFixed(3); ST.lcd.note = 'FIT: THE FILM PLACES THE ' + it.name.toUpperCase() + ', ' + Math.round(best * 100) + '% ON ITS CUT'; window.CORE.touch('fit');
        if (k >= this.n) { B.fitting = null; B.baked.delete(it.id); rest.traverse(o => o.geometry && o.geometry.dispose()); window.CORE.log('fit', it.name + ' covers ' + Math.round(best * 100) + '% of its cut');
          const next = ST.build.items.find(x => x.src && x.src.ks && !x.fit && BUILD[x.type]); if (next) S.fit(next, 240); else setTimeout(() => { if (/^FIT/.test(ST.lcd.note)) { ST.lcd.note = ''; window.CORE.touch('fit done'); } }, 2500); } } };
    return B.fitting; };
  // the film's pixels baked onto the thing at rest, from the film's camera: each vertex keeps the frame point it covered
  function bake(it) { const key = JSON.stringify(it.fit) + JSON.stringify(it.canon || {}); const had = B.baked.get(it.id); if (had && had.key === key) return had.fuv;
    const rest = BUILD[it.type](Object.assign({}, it, it.canon || {}), 0); place(rest, it.fit); const cam = refCamera(), VP = new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), fuv = {}, v = new T.Vector4();
    rest.traverse(o => { if (!o.isMesh || !o.userData.sk) return; o.updateMatrixWorld(true); const P = o.geometry.attributes.position, A = new Float32Array(P.count * 2);
      for (let i = 0; i < P.count; i++) { v.set(P.getX(i), P.getY(i), P.getZ(i), 1).applyMatrix4(o.matrixWorld).applyMatrix4(VP); A[i * 2] = v.x / v.w * .5 + .5; A[i * 2 + 1] = v.y / v.w * .5 + .5; } fuv[o.userData.sk] = { A, n: P.count }; });
    rest.traverse(o => o.geometry && o.geometry.dispose()); B.baked.set(it.id, { key, fuv }); return fuv; }
  function skin(o, it, fuv) { const n = ST.build.ref, ks = (it.src.ks.concat([-1, -1, -1, -1])).slice(0, 4);
    // hairs grown on the model stand only where the film's own beetle is: each is kept if its root, seen from the film's camera, falls inside the cut
    o.updateMatrixWorld(true); const cam = refCamera(), VP = new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), m4 = new T.Matrix4(), v = new T.Vector4(), Z = new T.Matrix4().makeScale(0, 0, 0);
    o.traverse(m => { if (!m.isInstancedMesh) return; for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, m4); v.set(m4.elements[12], m4.elements[13], m4.elements[14], 1).applyMatrix4(m.matrixWorld).applyMatrix4(VP);
        const u = v.x / v.w * .5 + .5, w = v.y / v.w * .5 + .5, k = u < 0 || u > 1 || w < 0 || w > 1 ? -1 : S.maskAt(n, u, 1 - w); if (!it.src.ks.includes(k)) m.setMatrixAt(i, Z); } m.instanceMatrix.needsUpdate = true; });
    if (it.skin > .5) o.traverse(m => { if ((m.isMesh || m.isSprite) && !m.userData.add && (!m.userData.sk || !fuv[m.userData.sk])) m.visible = false; });
    o.traverse(m => { if (!m.isMesh || !m.userData.sk || !fuv[m.userData.sk] || fuv[m.userData.sk].n !== m.geometry.attributes.position.count) return;
      m.geometry.setAttribute('fuv', new T.BufferAttribute(fuv[m.userData.sk].A, 2)); const mat = m.material.clone(); m.material = mat;
      mat.onBeforeCompile = sh => { mat.userData.sh = sh; sh.uniforms.ftex = { value: B.alt || tex(url('f', n)) }; sh.uniforms.fmask = { value: tex(url('m', n), true) }; sh.uniforms.ks = { value: new T.Vector4(...ks) }; sh.uniforms.skin = { value: it.skin };
        sh.vertexShader = 'attribute vec2 fuv; varying vec2 vFuv;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vFuv = fuv;');
        sh.fragmentShader = 'uniform sampler2D ftex, fmask; uniform vec4 ks; uniform float skin; varying vec2 vFuv;\n' + sh.fragmentShader.replace('#include <encodings_fragment>',
          `{ float mv=texture2D(fmask,vFuv).r*255.0; float inm=max(max(step(abs(mv-ks.x),.5),step(abs(mv-ks.y),.5)),max(step(abs(mv-ks.z),.5),step(abs(mv-ks.w),.5)));
             if(vFuv.x<0.0||vFuv.x>1.0||vFuv.y<0.0||vFuv.y>1.0) inm=0.0; vec3 film=pow(texture2D(ftex,vFuv).rgb,vec3(2.2)); gl_FragColor.rgb=mix(gl_FragColor.rgb,film,skin*inm); if(skin>.5&&inm<.5) discard; }
           #include <encodings_fragment>`); };
      mat.customProgramCacheKey = () => 'skin'; }); }
  // a thing is at rest when the skin is on and nothing has been changed from what the film shows
  const atRest = it => it.fit && it.canon && it.skin > .95 && !(S.benchOrbit && (S.benchOrbit[0] || S.benchOrbit[1])) && Object.keys(it.canon).every(k => Math.abs((it[k] || 0) - it.canon[k]) < .02);
  function syncBench(now) {
    const ref = ST.build.ref; if (!B.film || B.film.n !== ref) { benchFilm(ref); for (const [, h] of B.items) { B.g.remove(h.o); dispose(h.o); } B.items.clear(); }
    if (B.fitting) B.fitting.run();
    // the reference shot's own parts: shown unless a thing stands for them (then only as much as its skin); cards drive theirs
    // when the cake's candles or flames are changed, the frame under it is the one with its candles painted out
    const cakeIt = ST.build.items.find(i => i.type === 'cake'), C = cakeIt && cakeIt.canon, CLEAN = { 24: 'c24.jpg' };
    B.alt = CLEAN[ref] && C && (cakeIt.candles !== C.candles || cakeIt.flames < C.flames - .05) ? tex(ST.base + CLEAN[ref]) : null;
    for (const L of B.film.layers) { if (!L.map0) L.map0 = L.m.material.uniforms.map.value; }
    { const F = B.film, bu = F.back.material.uniforms; if (!F.map0) F.map0 = bu.map.value; bu.map.value = B.alt || F.map0; }
    for (const [, h] of B.items) h.o.traverse(m => { if (m.material && m.material.userData && m.material.userData.sh) m.material.userData.sh.uniforms.ftex.value = B.alt || tex(url('f', ref)); });
    const claimed = new Map(); for (const it of ST.build.items) if (it.src && it.src.ks) for (const k of it.src.ks) claimed.set(k, it);
    const cards = new Map(); for (const it of ST.build.items) if (it.type === 'card' && it.src.n === ref) cards.set(it.src.k, it);
    const bm = B.film.back.material.uniforms; bm.mixp.value = 1; bm.zl.value = -3.2 * LAYER_SPREAD; bm.relief.value = 2.2 * LAYER_SPREAD; bm.sc.value = (DIST - bm.zl.value) / DIST; bm.edge.value = 0;
    for (const L of B.film.layers) { const u = L.m.material.uniforms, z = zOfPart(L.p), c = cards.get(L.p.k), th = claimed.get(L.p.k);
      u.zl.value = z; u.sc.value = (DIST - z) / DIST; u.relief.value = (1.1 + L.p.area * 2) * LAYER_SPREAD; u.t.value = now / 1000; u.edge.value = 0; u.sel.value = 0; u.dim.value = 0;
      u.ap.value = c ? c.appear : 1; u.light.value = c ? c.light : .5; if (c) { const zz = z + c.push * 2.5; u.zl.value = zz; u.sc.value = (DIST - zz) / DIST; }
      u.op.value = th ? Math.min(1, th.skin * 2) : 1; u.map.value = B.alt || L.map0; L.m.renderOrder = th && !atRest(th) ? 2 : 1 + Math.round(L.p.z * 100); L.m.visible = u.op.value > .01; }
    const want = new Set(); for (const it of ST.build.items) { if (it.type === 'card' && it.src.n === ref) continue; want.add(it.id);
      const key = JSON.stringify(it), have = B.items.get(it.id), animate = ANIM[it.type] && ANIM[it.type](it) && now - (have ? have.at : 0) > 60;
      if (!have || have.key !== key || animate) { if (have) { B.g.remove(have.o); dispose(have.o); }
        let o; if (it.type === 'card') o = foreignCard(it); else { o = BUILD[it.type](it, now); o.visible = !atRest(it); if (!it.fit && it.src && it.src.ks && !B.fitting) S.fit(it, 240);
          if (it.fit) place(o, it.fit); else place(o, it.place || { x: 0, y: -2.4, z: 1, s: 1.4, rx: .25, ry: 0 });
          if (it.fit && it.src && it.src.ks && it.skin > .01 && !B.fitting) skin(o, it, bake(it)); o.traverse(m => { if (m.isMesh || m.isSprite) m.renderOrder = 40; }); }
        const pend = B.fitting && it.src && it.src.ks; B.g.add(o); B.items.set(it.id, { o, key: pend ? key + 'f' : key, at: now }); } }
    for (const [id, h] of B.items) if (!want.has(id)) { B.g.remove(h.o); dispose(h.o); B.items.delete(id); }
    for (const [id, h] of B.items) { const it = ST.build.items.find(x => x.id === id); if (it && it.type !== 'card') h.o.visible = !atRest(it); if (h.o.userData.tick) h.o.userData.tick(now / 1000); }
    envFor(ref);
  }
  // the film's own light on the made things: the reference frame, as the room they reflect
  let pmrem = null; function envFor(n) { if (B.envN === n) return; const t = tex(url('f', n)); if (!t.image || !t.image.complete) return; B.envN = n; if (!pmrem) pmrem = new T.PMREMGenerator(R);
    const e = t.clone(); e.mapping = T.EquirectangularReflectionMapping; e.needsUpdate = true; const rt = pmrem.fromEquirectangular(e); if (B.env) B.env.dispose(); B.env = rt; benchScene.environment = rt.texture; }
  function dispose(o) { o.traverse(x => { if (x.geometry && x.geometry !== PG && x.geometry !== PGB) x.geometry.dispose(); }); }
  // light for the made things, set to the film's light on that shot
  function benchLights(grade) { if (B.lights) benchScene.remove(B.lights); const g = B.lights = new T.Group(); benchScene.add(g); benchScene.background = new T.Color(0); benchScene.fog = null;
    if (grade === 'forest') { g.add(new T.HemisphereLight(0xe2f5c0, 0x26331a, 1.0)); const s = new T.DirectionalLight(0xfff3d8, 1.6); s.position.set(-3, 6, 6); g.add(s); const b = new T.DirectionalLight(0xc8f0a0, 1.2); b.position.set(2, 3, -6); g.add(b); }
    else if (grade === 'birthday') { g.add(new T.AmbientLight(0x2a2016, .45)); const up = new T.PointLight(0xffb850, 2.4, 14, 2); up.position.set(0, -1.5, 3); g.add(up); const k = new T.DirectionalLight(0xffd4a0, .5); k.position.set(0, 6, 6); g.add(k); }
    else { g.add(new T.HemisphereLight(0xf2f8ee, 0x7a827a, 1.1)); const s = new T.DirectionalLight(0xffffff, .8); s.position.set(3, 8, 6); g.add(s); }
    B.grade = grade; }
  // the bench camera is the film's camera; a drag or the phone's tilt swings it round the model
  function benchCamera(now, still) { const o = still ? [0, 0] : (S.benchOrbit || [0, 0]), d = DIST + 2, c = new T.Vector3(0, 0, -2), yaw = o[0], pitch = o[1];
    if (!yaw && !pitch) { benchCam.position.set(0, 0, DIST); benchCam.lookAt(0, 0, 0); }
    else { benchCam.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * d, c.y + Math.sin(pitch) * d, c.z + Math.cos(yaw) * Math.cos(pitch) * d); benchCam.lookAt(c); }
    benchCam.fov = filmCam.fov; benchCam.updateProjectionMatrix(); }
  /* ---------------- finishing: one pass for both ---------------- */
  const GRADES = { none: [[0, 0, 0], [1, 1, 1], [1, 1, 1], 0, 0, 0], forest: [[.02, .035, .0], [1.02, 1.0, .92], [.95, 1.04, .86], .5, .55, .25], birthday: [[.0, .0, .0], [1.1, .95, .8], [1.12, .96, .72], .6, .7, .35], dome: [[.03, .04, .035], [1.0, 1.02, 1.0], [.96, 1.01, .98], .35, .4, .22], night: [[.0, .01, .02], [.9, 1, 1.1], [.9, 1, 1.05], .5, .6, .3] };
  const POST_FS = `uniform sampler2D a,b; uniform float wipe, mode, t, soft, grain, vig, bloom; uniform vec3 lift, gam, gain; uniform vec2 hand, res, frame; uniform float handOn; varying vec2 vUv;
    vec3 grade(vec3 c){ c=c*gain+lift*(1.0-c); c=pow(max(c,0.0),1.0/gam); return c; }
    float hsh(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+t*37.0)*43758.5453); }
    uniform float sharp; void main(){ vec2 u=vUv; vec2 fu=(u-.5)/frame+.5; vec3 fa=texture2D(a,u).rgb; fa+= (fa-textureLod(a,u,1.0).rgb)*sharp; vec3 c=fa;
      if(mode>.5){ vec3 fb=mix(textureLod(b,u,0.0).rgb,textureLod(b,u,3.0).rgb,soft);
        vec3 bl=textureLod(b,u,4.0).rgb*.5+textureLod(b,u,5.5).rgb*.5; fb+=max(bl-.55,0.0)*bloom*2.0; fb=grade(fb);
        float e=smoothstep(wipe-.012,wipe+.012,fu.x); c=mix(fa,fb,1.0-e); float ln=1.0-smoothstep(0.0,.0025,abs(fu.x-wipe)); c=mix(c,vec3(1.0,.95,.85),ln*.6*step(.01,wipe)*step(wipe,.99)); }
      if(fu.x<0.||fu.x>1.||fu.y<0.||fu.y>1.){ gl_FragColor=vec4(0.,0.,0.,1.); return; }
      float r=length((fu-.5)*vec2(1.0,.75)); c*=mix(1.0,1.0-vig*.55,smoothstep(.35,.85,r));
      c+=(hsh(u*res)-.5)*grain*.06;
      if(handOn>0.0){ float d=length((u-hand)*vec2(res.x/res.y,1.0)); c+=handOn*vec3(1.0,.93,.8)*(exp(-d*d*1800.0)*.6+exp(-d*d*90.0)*.06); }
      gl_FragColor=vec4(c,1.0); }`;
  S.init = function (canvas) {
    R = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }); R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    filmScene = new T.Scene(); filmScene.background = new T.Color(0x000000); filmCam = new T.PerspectiveCamera(FOV, 16 / 9, .1, 200);
    benchScene = new T.Scene(); benchCam = new T.PerspectiveCamera(30, 16 / 9, .05, 200); B.g = new T.Group(); benchScene.add(B.g);
    const mk = () => { const t = new T.WebGLRenderTarget(4, 4, { minFilter: T.LinearMipmapLinearFilter, generateMipmaps: true, encoding: T.sRGBEncoding }); return t; }; rtA = mk(); rtB = mk();
    post = new T.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', fragmentShader: POST_FS,
      uniforms: { a: { value: rtA.texture }, b: { value: rtB.texture }, wipe: { value: 1 }, mode: { value: 0 }, t: { value: 0 }, soft: { value: 0 }, grain: { value: .6 }, vig: { value: .5 }, bloom: { value: .4 }, lift: { value: new T.Vector3() }, gam: { value: new T.Vector3(1, 1, 1) }, gain: { value: new T.Vector3(1, 1, 1) }, hand: { value: new T.Vector2(.5, .5) }, frame: { value: new T.Vector2(1, 1) }, sharp: { value: 0 }, handOn: { value: 0 }, res: { value: new T.Vector2(1, 1) } } });
    post.extensions = { shaderTextureLOD: true }; postScene = new T.Scene(); postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), post));
    S.ready = true; S.sp = 0; S.partAt = 0; S.benchOrbit = [0, 0];
    window.CORE.on('shot', e => { buildFilm(e); }); window.CORE.on('change', w => { if (w === 'ring1') S.partAt = performance.now(); });
    window.CORE.on('bench', () => { benchLights(ST.build.grade || 'dome'); B.baked.clear(); });
    buildFilm(cur()); benchLights('dome');
  };
  // the picture fills the area above the device at 16:9, black bars where the window's shape differs
  S.resize = function (w, h) { W = w; H = h; R.setSize(w, h, false); const dpr = R.getPixelRatio(); rtA.setSize(Math.round(w * dpr), Math.round(h * dpr)); rtB.setSize(Math.round(w * dpr), Math.round(h * dpr)); filmCam.aspect = w / h; benchCam.aspect = w / h; const fa = w / h; post.uniforms.frame.value.set(fa >= 16 / 9 ? (16 / 9) / fa : 1, fa >= 16 / 9 ? 1 : fa / (16 / 9));
    // keep the whole 16:9 frame in view whatever the window's shape
    const a = w / h; filmCam.fov = a >= 16 / 9 ? FOV : 2 * Math.atan(Math.tan(FOV * Math.PI / 360) * (16 / 9) / a) * 180 / Math.PI; filmCam.updateProjectionMatrix(); post.uniforms.res.value.set(w * dpr, h * dpr); };
  S.frame = function (now, dt) {
    if (!S.ready) return; const want = ST.spread; S.sp += (want - S.sp) * Math.min(1, dt * 7); if (Math.abs(want - S.sp) < 1e-3) S.sp = want;
    if (!FM || (cur() && ((cur().kind === 'film' && FM.n !== cur().n) || (cur().kind === 'mem') !== !!FM.mem))) buildFilm(cur());
    const building = ST.mode === 'build', u = post.uniforms; u.t.value = now / 1000;
    // the film side: the shot's model; on the bench it is the reference shot, seen from the film's camera
    if (building && FM && !FM.mem && ST.build.ref != null && FM.n !== ST.build.ref) { }
    const spSave = S.sp; if (building) S.sp = 0; updateFilm(now, dt); S.sp = spSave;
    R.setRenderTarget(rtA); R.render(filmScene, filmCam);
    if (building) { if (B.grade !== (ST.build.grade || 'dome')) benchLights(ST.build.grade || 'dome'); syncBench(now); benchCamera(now); R.setRenderTarget(rtB); R.render(benchScene, benchCam);
      const G = GRADES.none; u.lift.value.set(...G[0]); u.gam.value.set(...G[1]); u.gain.value.set(...G[2]); u.bloom.value = .1; u.vig.value = 0; u.grain.value = 0;
      const bt = ST.build.items.find(i => i.type === 'beetle'); u.soft.value = bt ? Math.pow(1 - bt.focus, 1.5) * .9 : 0;
      u.mode.value = 1; u.wipe.value = S.sp; }
    else { u.mode.value = 0; u.wipe.value = 1; u.vig.value = 0; u.grain.value = 0; }
    const Hh = S.hand; u.handOn.value = Hh && now - Hh.at < 300 ? Hh.k : 0; if (Hh) u.hand.value.set(Hh.u, 1 - Hh.v);
    R.setRenderTarget(null); R.render(postScene, postCam);
  };
  // page point -> (u, v) of the film frame, if inside the drawn frame (the camera holds the 16:9 frame centred)
  S.toFrame = function (px, py) { const r = R.domElement.getBoundingClientRect(), a = r.width / r.height; let x = (px - r.left) / r.width * 2 - 1, y = (py - r.top) / r.height * 2 - 1;
    let fw, fh; if (a >= 16 / 9) { fh = 1; fw = (16 / 9) / a; } else { fw = 1; fh = a / (16 / 9); } const u = (x / fw + 1) / 2, v = (y / fh + 1) / 2; return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? [u, v] : null; };
  // pick the part under a point of the picture (only when DEPTH is near FILM is the frame where it was)
  S.pick = function (px, py) { const f = S.toFrame(px, py), sh = curShot(); if (!f || !sh || (cur() && cur().kind === 'mem')) return -1; const k = S.maskAt(sh.n, f[0], f[1]); if (k < 0) return -1; const ps = partsOf(sh); return ps.findIndex(p => p.k === k); };
  // IMPRINT: render the bench from the reference camera, lay it beside the film's frame, measure how near it is
  S.imprint = function () {
    const w = 640, h = 360, rt = new T.WebGLRenderTarget(w, h, { encoding: T.sRGBEncoding }), aspect = benchCam.aspect, spSave = S.sp; benchCam.aspect = 16 / 9; S.sp = 0; benchCamera(performance.now(), true); benchCam.fov = FOV; benchCam.updateProjectionMatrix();
    // render the bench through the same finishing step, into a canvas
    rtB.setSize(w, h); R.setRenderTarget(rtB); R.render(benchScene, benchCam); const u = post.uniforms, keep = [u.mode.value, u.wipe.value, u.handOn.value]; u.mode.value = 1; u.wipe.value = 1; u.handOn.value = 0; u.res.value.set(w, h); const fr = u.frame.value.clone(); u.frame.value.set(1, 1);
    R.setRenderTarget(rt); R.render(postScene, postCam); const px = new Uint8Array(w * h * 4); R.readRenderTargetPixels(rt, 0, 0, w, h, px);
    u.mode.value = keep[0]; u.wipe.value = keep[1]; u.handOn.value = keep[2]; u.frame.value.copy(fr); benchCam.aspect = aspect; benchCam.updateProjectionMatrix(); S.sp = spSave; S.resize(W, H); R.setRenderTarget(null); rt.dispose();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), id = x.createImageData(w, h); for (let y = 0; y < h; y++) id.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); x.putImageData(id, 0, 0);
    return { img: c.toDataURL('image/jpeg', .88), canvas: c };
  };
  S.R = () => R; S.FM = () => FM; S.B = B; S.T = T;
})();
