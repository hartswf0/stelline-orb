// ============================================================================
// STELLINE 3D REALITY-MODELING ENGINE (THREE.JS WEBGL + PROCEDURAL GLSL)
// Bidirectional Scene <-> Diegetic Orb Architecture ("The Scene Makes the
// Interface as Much as the Interface Makes the Scene"):
// - Every 3D scene can be deconstructed to raw 3D primitives (ZERO) and
//   sculpted to photographic film parity via the 6 coaxial Orb rings & buttons.
// - Direct 3D viewport sculpting (dragging on eyes, setae, cake, candles,
//   cutouts, or clicking C-Arc nodes) inversely drives the physical Orb rings.
// - Scene chromatic radiance dynamically reflects onto the physical Orb casing.
// ============================================================================
(function () {
  const webglCanvas = document.getElementById('webglCanvas');
  if (!webglCanvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 200);
  const texLoader = new THREE.TextureLoader();

  function loadFilmTex(path) {
    const t = texLoader.load(path);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  }

  const filmTextures = {
    canopy:   loadFilmTex('assets/stelline_frames/sec_016.jpg'),
    branch22: loadFilmTex('assets/stelline_frames/sec_022.jpg'),
    leaf:     loadFilmTex('assets/stelline_frames/sec_025.jpg'),
    leaf26:   loadFilmTex('assets/sec_026.jpg'),
    leaf27:   loadFilmTex('assets/sec_027.jpg'),
    leaf28:   loadFilmTex('assets/sec_028.jpg'),
    bugeye31: loadFilmTex('assets/sec_031.jpg'),
    bugeye32: loadFilmTex('assets/stelline_frames/sec_032.jpg'),
    bugeye33: loadFilmTex('assets/sec_033.jpg'),
    bugeye34: loadFilmTex('assets/stelline_frames/sec_034.jpg'),
    bugeye35: loadFilmTex('assets/sec_035.jpg'),
    clear36:  loadFilmTex('assets/stelline_frames/sec_036.jpg'),
    clear39:  loadFilmTex('assets/stelline_frames/sec_039.jpg'),
    clear43:  loadFilmTex('assets/stelline_frames/sec_043.jpg'),
    clear50:  loadFilmTex('assets/stelline_frames/sec_050.jpg'),
    dissolve: loadFilmTex('assets/stelline_frames/sec_052.jpg'),
    dim133:   loadFilmTex('assets/stelline_frames/sec_133.jpg'),
    spawn138: loadFilmTex('assets/sec_138.jpg'),
    spawn:    loadFilmTex('assets/stelline_frames/ref_0217_spawn.png'),
    spawn141: loadFilmTex('assets/sec_141.jpg'),
    bundt142: loadFilmTex('assets/sec_142.jpg'),
    bundt143: loadFilmTex('assets/sec_143.jpg'),
    bundt:    loadFilmTex('assets/stelline_frames/ref_0223_bundt.png'),
    bundt145: loadFilmTex('assets/sec_145.jpg'),
    icing146: loadFilmTex('assets/sec_146.jpg'),
    icing147: loadFilmTex('assets/sec_147.jpg'),
    icing:    loadFilmTex('assets/stelline_frames/ref_0226_icing.png'),
    cut153:   loadFilmTex('assets/sec_153.jpg'),
    cutouts:  loadFilmTex('assets/stelline_frames/ref_0233_cutouts.png'),
    cut155:   loadFilmTex('assets/sec_155.jpg'),
    cut156:   loadFilmTex('assets/sec_156.jpg'),
    party6:   loadFilmTex('assets/stelline_frames/sec_158.jpg'),
    mini170:  loadFilmTex('assets/stelline_frames/sec_170.jpg'),
    blow173:  loadFilmTex('assets/stelline_frames/sec_173.jpg'),
    blow174:  loadFilmTex('assets/stelline_frames/sec_174.jpg'),
    blow:     loadFilmTex('assets/stelline_frames/sec_177.jpg'),
    blow178:  loadFilmTex('assets/stelline_frames/sec_178.jpg'),
    blow182:  loadFilmTex('assets/stelline_frames/sec_182.jpg'),
    blow185:  loadFilmTex('assets/stelline_frames/sec_185.jpg'),
    blow189:  loadFilmTex('assets/stelline_frames/sec_189.jpg'),
    mini:     loadFilmTex('assets/stelline_frames/sec_196.jpg'),
    reader:   loadFilmTex('assets/stelline_frames/sec_283.jpg'),
    snow:     loadFilmTex('assets/stelline_frames/sec_288.jpg'),
    sam_canopy:       loadFilmTex('assets/sam_canopy.png'),
    depth_canopy:     loadFilmTex('assets/depth_canopy.png'),
    sam_bugeye:       loadFilmTex('assets/sam_bugeye.png'),
    depth_bugeye:     loadFilmTex('assets/depth_bugeye.png'),
    sam_leaf:         loadFilmTex('assets/sam_leaf.png'),
    depth_leaf:       loadFilmTex('assets/depth_leaf.png'),
    sam_clearing:     loadFilmTex('assets/sam_clearing.png'),
    depth_clearing:   loadFilmTex('assets/depth_clearing.png'),
    sam_cakespawn:    loadFilmTex('assets/sam_cakespawn.png'),
    depth_cakespawn:  loadFilmTex('assets/depth_cakespawn.png'),
    sam_bundtmorph:   loadFilmTex('assets/sam_bundtmorph.png'),
    depth_bundtmorph: loadFilmTex('assets/depth_bundtmorph.png'),
    sam_redicing:     loadFilmTex('assets/sam_redicing.png'),
    depth_redicing:   loadFilmTex('assets/depth_redicing.png'),
    sam_cutouts:      loadFilmTex('assets/sam_cutouts.png'),
    depth_cutouts:    loadFilmTex('assets/depth_cutouts.png'),
    sam_blowcandles:  loadFilmTex('assets/sam_blowcandles.png'),
    depth_blowcandles:loadFilmTex('assets/depth_blowcandles.png'),
    sam_miniature:    loadFilmTex('assets/sam_miniature.png'),
    depth_miniature:  loadFilmTex('assets/depth_miniature.png'),
    sam_horsecarve:   loadFilmTex('assets/sam_horsecarve.png'),
    depth_horsecarve: loadFilmTex('assets/depth_horsecarve.png'),
    sam_snow:         loadFilmTex('assets/sam_snow.png'),
    depth_snow:       loadFilmTex('assets/depth_snow.png')
  };

  function syncRendererSize() {
    const rect = webglCanvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    if (webglCanvas.width !== Math.floor(w * renderer.getPixelRatio()) ||
        webglCanvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  window.addEventListener('resize', syncRendererSize);

  const GLSL_NOISE = `
    #define PI 3.14159265359
    #define TAU 6.28318530718
    #ifndef saturate
    #define saturate(x) clamp(x, 0.0, 1.0)
    #endif
    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
      for (int i = 0; i < 4; i++) {
        v += a * vnoise(p);
        p = rot * p * 2.03;
        a *= 0.5;
      }
      return v;
    }
    vec4 hexGrid(vec2 uv, float scale) {
      vec2 p = uv * scale;
      const vec2 s = vec2(1.0, 1.7320508);
      vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
      vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
      vec4 cell = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hC.xy) : vec4(h.zw, hC.zw + 0.5);
      vec2 ab = abs(cell.xy);
      float hexDist = 0.5 - max(dot(ab, s * 0.5), ab.x);
      float id = hash21(cell.zw);
      return vec4(cell.xy, hexDist, id);
    }
  `;

  // Shared GLSL Per-Object SAM Segmentation + DPT-Hybrid-MiDaS 3D Depth & 5-Dial + Spatial Transform Processor
  // Maps all 5 Coaxial Orb Rings (L1:SOLID, L2:FOCUS, L3:MORPH, R1:LUMA, R2:TINT) AND Left-Pod D-Pad Spatial
  // Translation (uObjOffsetX, uObjOffsetY), Visibility (uObjVis), and Compositor Modes (uCompMode) independently
  // to each of the 4 SAM-segmented objects/people across all 12 Open Matte shots.
  const GLSL_SAM_PER_OBJECT = `
    uniform sampler2D uSamTex;
    uniform sampler2D uDepthTex;
    uniform vec4 uObjSolid;
    uniform vec4 uObjFocus;
    uniform vec4 uObjMorph;
    uniform vec4 uObjLuma;
    uniform vec4 uObjTint;
    uniform vec4 uObjOffsetX;
    uniform vec4 uObjOffsetY;
    uniform vec4 uObjVis;
    uniform float uCompMode;
    uniform float uSelectedIdx;
    uniform float uHeadShift;

    vec3 applySamPerObject(vec3 baseCol, vec3 blurCol, vec2 uv) {
      vec2 samUv = clamp(uv + vec2(0.068, 0.024) * uHeadShift, 0.001, 0.999);
      vec3 samRGB = texture2D(uSamTex, samUv).rgb;
      vec3 depthB = texture2D(uDepthTex, samUv).rgb;
      vec4 origMasks = vec4(samRGB, depthB.b);
      float dVal = depthB.r;
      float edgeVal = depthB.g;

      vec3 outCol = baseCol;

      // First pass: if any SAM part is hidden (uObjVis < 0.5) or moved away via D-Pad, fill its vacated footprint with clean ambient background
      for (int i = 0; i < 4; i++) {
        float mOrig = (i == 0) ? origMasks.x : (i == 1) ? origMasks.y : (i == 2) ? origMasks.z : origMasks.w;
        float ox = (i == 0) ? uObjOffsetX.x : (i == 1) ? uObjOffsetX.y : (i == 2) ? uObjOffsetX.z : uObjOffsetX.w;
        float oy = (i == 0) ? uObjOffsetY.x : (i == 1) ? uObjOffsetY.y : (i == 2) ? uObjOffsetY.z : uObjOffsetY.w;
        float visV = (i == 0) ? uObjVis.x : (i == 1) ? uObjVis.y : (i == 2) ? uObjVis.z : uObjVis.w;
        float movedDist = abs(ox) + abs(oy);
        if (mOrig > 0.05 && (visV < 0.5 || movedDist > 0.003)) {
          float vacateMask = smoothstep(0.05, 0.65, mOrig);
          outCol = mix(outCol, blurCol * 0.28, vacateMask);
        }
      }

      // Second pass: composite each visible SAM part at its translated D-Pad coordinates (uv - offset) with its 5-dial parameters
      for (int i = 0; i < 4; i++) {
        float visV = (i == 0) ? uObjVis.x : (i == 1) ? uObjVis.y : (i == 2) ? uObjVis.z : uObjVis.w;
        if (visV >= 0.5) {
          float ox = (i == 0) ? uObjOffsetX.x : (i == 1) ? uObjOffsetX.y : (i == 2) ? uObjOffsetX.z : uObjOffsetX.w;
          float oy = (i == 0) ? uObjOffsetY.x : (i == 1) ? uObjOffsetY.y : (i == 2) ? uObjOffsetY.z : uObjOffsetY.w;
          vec2 partSamUv = clamp(samUv - vec2(ox, -oy), 0.001, 0.999);
          vec3 sRGB = texture2D(uSamTex, partSamUv).rgb;
          vec3 dB   = texture2D(uDepthTex, partSamUv).rgb;
          float m = (i == 0) ? sRGB.x : (i == 1) ? sRGB.y : (i == 2) ? sRGB.z : dB.b;

          if (m > 0.02) {
            float solidV = (i == 0) ? uObjSolid.x : (i == 1) ? uObjSolid.y : (i == 2) ? uObjSolid.z : uObjSolid.w;
            float focusV = (i == 0) ? uObjFocus.x : (i == 1) ? uObjFocus.y : (i == 2) ? uObjFocus.z : uObjFocus.w;
            float morphV = (i == 0) ? uObjMorph.x : (i == 1) ? uObjMorph.y : (i == 2) ? uObjMorph.z : uObjMorph.w;
            float lumaV  = (i == 0) ? uObjLuma.x  : (i == 1) ? uObjLuma.y  : (i == 2) ? uObjLuma.z  : uObjLuma.w;
            float tintV  = (i == 0) ? uObjTint.x  : (i == 1) ? uObjTint.y  : (i == 2) ? uObjTint.z  : uObjTint.w;

            float wMask = smoothstep(0.02, 0.78, m);
            vec3 objCol = baseCol;

            // 1. L2 FOCUS: 0.0 = optical bokeh defocus -> 0.62 = neutral -> 1.0 = unsharp optical crystallization
            if (focusV < 0.60) {
              objCol = mix(blurCol, objCol, clamp(focusV / 0.60, 0.0, 1.0));
            } else if (focusV > 0.64) {
              vec3 detail = objCol - blurCol;
              objCol = clamp(objCol + detail * ((focusV - 0.64) * 3.8), 0.0, 1.0);
            }

            // 2. R1 LUMA: Lighten / Darken individual SAM person or object
            if (abs(lumaV - 1.0) > 0.02) {
              if (lumaV > 1.0) {
                float boost = lumaV - 1.0;
                float fgLuma = dot(objCol, vec3(0.299, 0.587, 0.114));
                float fgMask = smoothstep(0.11, 0.25, fgLuma);
                objCol = mix(
                  objCol,
                  pow(max(objCol, vec3(0.001)), vec3(0.72)) * (1.0 + boost * 1.05) + vec3(0.10, 0.08, 0.05) * boost * fgMask,
                  clamp(boost, 0.0, 1.0) * fgMask
                );
              } else {
                objCol *= max(0.48, lumaV);
              }
            }

            // 3. R2 TINT: Chromatic Kelvin Warmth / Coolness per SAM item (-1.0 cool 4800K .. +1.0 warm 2600K)
            if (abs(tintV) > 0.02) {
              vec3 kMult = (tintV > 0.0)
                ? mix(vec3(1.0), vec3(1.28, 1.04, 0.70), clamp(tintV, 0.0, 1.0))
                : mix(vec3(1.0), vec3(0.76, 0.96, 1.26), clamp(-tintV, 0.0, 1.0));
              objCol *= kMult;
            }

            // 4. L1 SOLID: < 0.32 transitions this specific SAM object into a 3D DPT-MiDaS Topographic Depth-Contour Lattice
            if (solidV < 0.32) {
              float isoLines = pow(0.5 + 0.5 * sin(dB.r * 40.0 * 3.14159), 10.0);
              vec3 wireTint = vec3(0.82, 0.94, 0.90);
              vec3 holoMesh = objCol * (0.76 + 0.20 * dB.r) +
                              wireTint * (dB.g * 0.55 + isoLines * 0.28);
              objCol = mix(holoMesh, objCol, smoothstep(0.0, 0.32, solidV));
            }

            // 4b. 2D+3D WEAVE MODE (uCompMode == 1.0): Weave 3D DPT-MiDaS Topographic Lattice + UV Structural Mesh with 2D Film Plate
            if (uCompMode > 0.5 && uCompMode < 1.5) {
              float isSel = (abs(float(i) - uSelectedIdx) < 0.25) ? 1.0 : 0.0;
              float isoLines = pow(0.5 + 0.5 * sin(dB.r * 46.0 * 3.14159), 8.0);
              float uvGrid = step(0.94, fract((partSamUv.x + dB.r * 0.018) * 64.0)) + step(0.94, fract((partSamUv.y + dB.r * 0.018) * 36.0));
              vec3 weaveTint = (isSel > 0.5) ? vec3(0.22, 0.94, 0.78) : vec3(0.68, 0.88, 0.82);
              objCol = objCol * (0.80 + 0.20 * dB.r) +
                       weaveTint * (dB.g * (0.38 + 0.32 * isSel) + isoLines * (0.22 + 0.20 * isSel) + clamp(uvGrid, 0.0, 1.0) * (0.08 + 0.14 * isSel));
            }

            // 5. SAM SEGMENTS MODE (uCompMode == 2.0): Semantic Part Overlay + Topographic Contour Lines
            if (uCompMode > 1.5 && uCompMode < 2.5) {
              vec3 segTint = (i == 0) ? vec3(0.22, 0.92, 0.68)
                           : (i == 1) ? vec3(0.28, 0.76, 0.98)
                           : (i == 2) ? vec3(0.98, 0.72, 0.24)
                           :            vec3(0.94, 0.38, 0.78);
              float isSel = (abs(float(i) - uSelectedIdx) < 0.25) ? 1.0 : 0.0;
              float iso = pow(0.5 + 0.5 * sin(dB.r * 48.0 * 3.14159), 8.0);
              objCol = mix(objCol * 0.72, segTint, 0.32 + 0.22 * isSel) + segTint * (dB.g * 0.45 + iso * 0.28);
            }

            outCol = mix(outCol, clamp(objCol, 0.0, 1.0), wMask);
          }
        }
      }

      // 6. SOLO PART MODE (uCompMode == 3.0): Isolate selected SAM part against a clean 3D studio grid
      if (uCompMode > 2.5) {
        int selI = int(floor(uSelectedIdx + 0.5));
        float ox = (selI == 0) ? uObjOffsetX.x : (selI == 1) ? uObjOffsetX.y : (selI == 2) ? uObjOffsetX.z : uObjOffsetX.w;
        float oy = (selI == 0) ? uObjOffsetY.x : (selI == 1) ? uObjOffsetY.y : (selI == 2) ? uObjOffsetY.z : uObjOffsetY.w;
        vec2 selUv = clamp(samUv - vec2(ox, -oy), 0.001, 0.999);
        vec3 sRGB = texture2D(uSamTex, selUv).rgb;
        vec3 dB   = texture2D(uDepthTex, selUv).rgb;
        float selM = (selI == 0) ? sRGB.x : (selI == 1) ? sRGB.y : (selI == 2) ? sRGB.z : dB.b;
        float wSel = smoothstep(0.05, 0.65, selM);
        float gLine = step(0.96, fract(uv.x * 48.0)) + step(0.96, fract(uv.y * 27.0));
        vec3 studioBg = outCol * 0.14 + vec3(0.04, 0.12, 0.11) * clamp(gLine, 0.0, 1.0) * 0.35;
        outCol = mix(studioBg, outCol + vec3(0.18, 0.75, 0.65) * dB.g * 0.25, wSel);
      }

      return outCol;
    }
  `;

  const rootGroups = {
    bugeye: new THREE.Group(),
    leaf: new THREE.Group(),
    canopy: new THREE.Group(),
    birthday: new THREE.Group(),
    horse: new THREE.Group()
  };
  Object.values(rootGroups).forEach(g => {
    g.visible = false;
    scene.add(g);
  });

  // Helper for segmented insect limbs and smooth organic limbs
  function createSegmentedLimb(points, radii, mat, pinchStrength) {
    const pinchAmt = pinchStrength !== undefined ? pinchStrength : 0.14;
    const curve = new THREE.CatmullRomCurve3(points);
    const geom = new THREE.TubeGeometry(curve, 36, 1.0, 16, false);
    const pos = geom.attributes.position;
    const uv = geom.attributes.uv;
    const center = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const t = uv.getX(i);
      curve.getPointAt(t, center);
      v.fromBufferAttribute(pos, i).sub(center);
      const rIdx = t * (radii.length - 1);
      const i0 = Math.floor(rIdx), i1 = Math.min(radii.length - 1, i0 + 1);
      const baseR = radii[i0] + (radii[i1] - radii[i0]) * (rIdx - i0);
      const segPinch = 1.0 - pinchAmt * Math.pow(Math.sin(t * Math.PI * 4.0), 8.0);
      v.multiplyScalar(baseR * segPinch).add(center);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geom.computeVertexNormals();
    return new THREE.Mesh(geom, mat);
  }

  // ==========================================================================
  // 1. ACT I: BEETLE COMPOUND EYE & HEAD MACRO (00:31 sec_031 -> 00:35 sec_035)
  // Combines 3D Anatomical Sculpted Relief Mesh + Procedural GLSL Hexagonal
  // Ommatidia Shader + 180 3D Tapered Sensory Bristles (Setae) + Primitive Mode
  // ==========================================================================
  const bugEyeUniforms = {
    uTime:          { value: 0 },
    uSculptRelief:  { value: 1.0 },
    uRightEyeFocus: { value: 0.95 },
    uLeftEyeFocus:  { value: 0.0 },
    uSetaeMorph:    { value: 0.0 },
    uMandibleFlex:  { value: 0.0 },
    uWireOverlay:   { value: 0.0 },
    uTex31:         { value: filmTextures.bugeye31 },
    uTex32:         { value: filmTextures.bugeye32 },
    uTex33:         { value: filmTextures.bugeye33 },
    uTex34:         { value: filmTextures.bugeye34 },
    uTex35:         { value: filmTextures.bugeye35 },
    uSamTex:        { value: filmTextures.sam_bugeye },
    uDepthTex:      { value: filmTextures.depth_bugeye },
    uObjSolid:      { value: new THREE.Vector4(1, 1, 1, 1) },
    uObjFocus:      { value: new THREE.Vector4(0.85, 0.85, 0.85, 0.85) },
    uObjMorph:      { value: new THREE.Vector4(0.8, 0.8, 0.8, 0.8) },
    uObjLuma:       { value: new THREE.Vector4(1, 1, 1, 1) },
    uObjTint:       { value: new THREE.Vector4(0, 0, 0, 0) },
    uObjOffsetX:    { value: new THREE.Vector4(0, 0, 0, 0) },
    uObjOffsetY:    { value: new THREE.Vector4(0, 0, 0, 0) },
    uObjVis:        { value: new THREE.Vector4(1, 1, 1, 1) },
    uCompMode:      { value: 0.0 },
    uSelectedIdx:    { value: 0 },
    uHeadShift:      { value: 0.0 },
    uHexDensity:     { value: 165.0 },
    uLeftHexDensity: { value: 165.0 },
    uChitinShift:    { value: 0.0 },
    uSplitOptics:    { value: 0.0 },
    uEyeDomeBoost:   { value: 1.0 },
    uLightDir:       { value: new THREE.Vector3(0.25, 0.78, 0.58).normalize() }
  };

  // High-density 3D DPT-MiDaS Displaced Relief Mesh (200x140) spanning the full 13.0 x 4.9 viewport
  const bugReliefGeom = new THREE.PlaneGeometry(13.0, 4.90, 200, 140);
  const bugReliefMat = new THREE.ShaderMaterial({
    uniforms: bugEyeUniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying float vReliefZ;
      uniform float uTime;
      uniform float uSculptRelief;
      uniform float uSetaeMorph;
      uniform float uMandibleFlex;
      uniform float uHeadShift;
      uniform float uEyeDomeBoost;
      uniform vec4 uObjMorph;
      uniform sampler2D uDepthTex;
      uniform sampler2D uSamTex;
      void main() {
        vUv = uv;
        vec2 samUv = clamp(uv + vec2(0.068, 0.024) * uHeadShift, 0.001, 0.999);
        vec3 samRGB = texture2D(uSamTex, samUv).rgb;
        vec3 depthB = texture2D(uDepthTex, samUv).rgb;
        float midasDepth = depthB.r;
        vec4 masks = vec4(samRGB, depthB.b);
        float objMorphScale = 0.65 + 0.55 * dot(masks, uObjMorph) / max(1.0, masks.x + masks.y + masks.z + masks.w);

        // Pin outer border Z to 0 so perspective never pulls the frame edges inward
        float edgePin = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x) *
                        smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.92, uv.y);

        float eyeDome = (masks.x * 0.048 + masks.y * 0.048) * objMorphScale * uEyeDomeBoost;
        float zSculpt = ((midasDepth - 0.32) * 0.54 * objMorphScale + eyeDome) * edgePin;

        vec3 pos = position;
        float headMask = smoothstep(0.18, 0.65, midasDepth) * edgePin;
        float labrumMask = masks.w * edgePin;
        pos.x += sin(uTime * 1.15) * 0.015 * headMask + (uv.x - 0.52) * 0.085 * max(0.0, uMandibleFlex - 0.45) * labrumMask;
        pos.y += (cos(uTime * 0.95) * 0.012 * headMask) - (0.042 * uMandibleFlex * labrumMask);
        pos.z = zSculpt * clamp(uSculptRelief, 0.25, 1.0);
        pos.xy *= (8.0 - pos.z) / 8.0;
        vReliefZ = pos.z;

        vNormal = normalize(normalMatrix * normalize(vec3(
          (uv.x - 0.54) * 0.65,
          (uv.y - 0.52) * 0.65,
          1.0
        )));
        vec4 vp = modelViewMatrix * vec4(pos, 1.0);
        vViewPos = -vp.xyz;
        gl_Position = projectionMatrix * vp;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying float vReliefZ;
      uniform float uTime;
      uniform float uSculptRelief;
      uniform float uRightEyeFocus;
      uniform float uLeftEyeFocus;
      uniform float uSetaeMorph;
      uniform float uWireOverlay;
      uniform float uHexDensity;
      uniform float uLeftHexDensity;
      uniform float uChitinShift;
      uniform float uSplitOptics;
      uniform sampler2D uTex31;
      uniform sampler2D uTex32;
      uniform sampler2D uTex33;
      uniform sampler2D uTex34;
      uniform sampler2D uTex35;
      uniform vec3 uLightDir;
      ${GLSL_NOISE}
      ${GLSL_SAM_PER_OBJECT}
      void main() {
        vec2 uv = vUv;
        vec3 col32 = texture2D(uTex32, uv).rgb;
        vec3 col33 = texture2D(uTex33, uv).rgb;
        vec3 col34 = texture2D(uTex34, uv).rgb;
        vec3 col35 = texture2D(uTex35, uv).rgb;

        // Multi-keyframe progression across 00:31 (bokeh rack) -> 00:32 -> 00:33 -> 00:34 -> 00:35
        vec3 filmCol = col32;
        if (uSetaeMorph >= 0.20 && uSetaeMorph < 0.48) {
          filmCol = mix(col32, col33, smoothstep(0.20, 0.48, uSetaeMorph));
        } else if (uSetaeMorph >= 0.48 && uSetaeMorph < 0.76) {
          filmCol = mix(col33, col34, smoothstep(0.48, 0.76, uSetaeMorph));
        } else if (uSetaeMorph >= 0.76) {
          filmCol = mix(col34, col35, smoothstep(0.76, 0.98, uSetaeMorph));
        }

        // Compute 9-tap optical bokeh of the ACTIVE frame (prevents cross-frame ghost double-eyes!)
        vec3 blurStep = vec3(0.0);
        vec2 offs[8];
        offs[0] = vec2( 0.0055,  0.0000);
        offs[1] = vec2(-0.0055,  0.0000);
        offs[2] = vec2( 0.0000,  0.0075);
        offs[3] = vec2( 0.0000, -0.0075);
        offs[4] = vec2( 0.0042,  0.0055);
        offs[5] = vec2(-0.0042,  0.0055);
        offs[6] = vec2( 0.0042, -0.0055);
        offs[7] = vec2(-0.0042, -0.0055);
        for (int k = 0; k < 8; k++) {
          vec2 uvk = clamp(uv + offs[k], 0.001, 0.999);
          vec3 ck = (uSetaeMorph < 0.48)
            ? mix(texture2D(uTex32, uvk).rgb, texture2D(uTex33, uvk).rgb, smoothstep(0.20, 0.48, uSetaeMorph))
            : (uSetaeMorph < 0.76)
              ? mix(texture2D(uTex33, uvk).rgb, texture2D(uTex34, uvk).rgb, smoothstep(0.48, 0.76, uSetaeMorph))
              : mix(texture2D(uTex34, uvk).rgb, texture2D(uTex35, uvk).rgb, smoothstep(0.76, 0.98, uSetaeMorph));
          blurStep += ck * 0.125;
        }
        vec3 blurFilmCol = mix(filmCol, blurStep, 0.82);

        if (uSetaeMorph < 0.20) {
          filmCol = mix(blurFilmCol * 0.96, col32, smoothstep(0.0, 0.20, uSetaeMorph));
        }

        // Apply SAM per-object 5-dial processing (L1:SOLID wireframe, L2:FOCUS, L3:MORPH, R1:LUMA, R2:TINT)
        filmCol = applySamPerObject(filmCol, blurFilmCol, uv);

        // Authentic Per-Eye Compound Ommatidia Crystallization (ZERO 2D brick-grid artifacts!)
        // In sec_032 (col32), the left eye (OCULUS.SN) is smooth matte green chitin (0_HEX),
        // while in sec_034/sec_035 (col34/col35), both eyes have crystalline 165_HEX hexagonal ommatidia.
        vec2 samUv = clamp(uv + vec2(0.068, 0.024) * uHeadShift, 0.001, 0.999);
        vec3 samMasks = texture2D(uSamTex, samUv).rgb;
        float mRightEye = smoothstep(0.18, 0.72, samMasks.x);
        float mLeftEye  = smoothstep(0.18, 0.72, samMasks.y);
        float inAnyEye  = clamp(mRightEye + mLeftEye, 0.0, 1.0);
        vec3 hiFreq = filmCol - blurFilmCol;

        // 1. Right Compound Eye (OCULUS.DX): smoothly rack between smooth matte cornea (0_HEX) and crisp film ommatidia (165..320_HEX)
        float dxCryst = clamp(uHexDensity / 165.0, 0.0, 1.0) * clamp(uRightEyeFocus, 0.0, 1.0);
        if (mRightEye > 0.01) {
          vec3 dxSmooth = blurFilmCol * 0.97;
          vec3 dxCrisp  = mix(filmCol, col34, 0.35);
          float dxHyper = clamp((uHexDensity - 165.0) / 145.0, 0.0, 1.15);
          vec3 dxFinal  = mix(dxSmooth, dxCrisp + hiFreq * (0.45 + dxHyper * 1.15), dxCryst);
          filmCol = mix(filmCol, clamp(dxFinal, 0.0, 1.0), mRightEye);
        }

        // 2. Left Compound Eye (OCULUS.SN): independent smooth matte green chitin (col32) <-> crystalline 165_HEX ommatidia (col34/col35)
        float snCryst = (uSplitOptics > 0.5)
          ? 0.0
          : clamp(uLeftHexDensity / 165.0, 0.0, 1.0) * clamp(uLeftEyeFocus, 0.0, 1.0);
        if (mLeftEye > 0.01) {
          vec3 snSmooth = mix(blurFilmCol * 0.97, col32, 0.65);
          vec3 snCrisp  = mix(col34, col35, smoothstep(0.55, 0.98, max(uSetaeMorph, uLeftEyeFocus)));
          vec3 snHiFreq = snCrisp - blurFilmCol;
          float snHyper = clamp((uLeftHexDensity - 165.0) / 145.0, 0.0, 1.15);
          vec3 snFinal  = mix(snSmooth, snCrisp + snHiFreq * (0.35 + snHyper * 1.10), snCryst);
          filmCol = mix(filmCol, clamp(snFinal, 0.0, 1.0), mLeftEye);
        }
        if (abs(uChitinShift) > 0.05) {
          float bugFg = smoothstep(0.22, 0.50, texture2D(uDepthTex, samUv).r);
          if (uChitinShift > 1.05) {
            // 630nm Crimson-Ruby Jewel Scarab thin-film interference
            vec3 rubySpec = filmCol * vec3(1.22, 0.86, 0.90) + max(vec3(0.0), hiFreq) * vec3(1.45, 0.55, 0.65);
            filmCol = mix(filmCol, clamp(rubySpec, 0.0, 1.0), clamp((uChitinShift - 0.9) * 1.4, 0.0, 1.0) * bugFg * 0.52);
          } else if (uChitinShift > 0.0) {
            // 585nm Aureate Gold Scarab specular highlight on compound eye facets & carapace
            vec3 warmSpec = filmCol * vec3(1.16, 1.08, 0.84) + max(vec3(0.0), hiFreq) * vec3(1.35, 1.15, 0.58);
            filmCol = mix(filmCol, clamp(warmSpec, 0.0, 1.0), clamp(uChitinShift, 0.0, 1.0) * bugFg * 0.50);
          } else {
            // 445nm Obsidian-Cyan / Sapphire-Violet structural interference
            vec3 jadeSpec = filmCol * vec3(0.84, 1.04, 1.16) + hiFreq * (1.25 * inAnyEye);
            filmCol = mix(filmCol, clamp(jadeSpec, 0.0, 1.0), clamp(-uChitinShift, 0.0, 1.0) * bugFg * 0.50);
          }
        }

        if (uWireOverlay > 0.01) {
          vec2 dt = texture2D(uDepthTex, samUv).rg;
          float wGrid = step(0.93, fract((uv.x + dt.r * 0.02) * 64.0)) + step(0.93, fract((uv.y + dt.r * 0.02) * 42.0));
          filmCol = mix(filmCol, vec3(0.72, 0.94, 0.84), clamp(wGrid + dt.g * 0.8, 0.0, 1.0) * uWireOverlay * 0.48);
        }

        gl_FragColor = vec4(filmCol, 1.0);
      }
    `
  });
  const bugReliefMesh = new THREE.Mesh(bugReliefGeom, bugReliefMat);
  rootGroups.bugeye.add(bugReliefMesh);

  // 180 3D Tapered Sensory Bristles (Setae) anchored in 3D space around the cheeks, brow & mouthparts
  const setaeGroup = new THREE.Group();
  setaeGroup.position.z = 0.32;
  rootGroups.bugeye.add(setaeGroup);

  const setaeShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uChitinShift: bugEyeUniforms.uChitinShift },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uChitinShift;
      void main() {
        float t = vUv.x;
        vec3 rootCol = vec3(0.22, 0.28, 0.12);
        vec3 tipCol  = vec3(0.72, 0.80, 0.48);
        if (uChitinShift > 0.2) {
          rootCol = vec3(0.38, 0.26, 0.06);
          tipCol  = vec3(0.98, 0.84, 0.36);
        } else if (uChitinShift < -0.2) {
          rootCol = vec3(0.06, 0.18, 0.28);
          tipCol  = vec3(0.36, 0.88, 0.96);
        }
        vec3 col = mix(rootCol, tipCol, t);
        float alpha = (1.0 - pow(t, 1.3)) * 0.56;
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
  const setaeList = [];

  function addBristle(origin, dir, len) {
    const start = new THREE.Vector3(0, 0, 0);
    const mid = dir.clone().multiplyScalar(len * 0.55).add(new THREE.Vector3(0, -len * 0.08, 0));
    const tip = dir.clone().multiplyScalar(len).add(new THREE.Vector3(0, -len * 0.18, 0));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, tip);
    const geom = new THREE.TubeGeometry(curve, 6, 0.006, 4, false);
    const pos = geom.attributes.position;
    const uv = geom.attributes.uv;
    const c = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const t = uv.getX(i);
      curve.getPointAt(t, c);
      v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(1.0 - t * 0.92).add(c);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    const mesh = new THREE.Mesh(geom, setaeShaderMat);
    mesh.position.copy(origin);
    setaeGroup.add(mesh);
    setaeList.push(mesh);
  }

  // Anchor 3D setae bristles along the left & right sub-ocular cheek rims & brow vertex
  for (let i = 0; i < 38; i++) {
    const ang = 2.1 + (i / 37) * 1.8;
    const ox = -0.56 + Math.cos(ang) * 0.52;
    const oy = 0.18 + Math.sin(ang) * 0.62;
    const dir = new THREE.Vector3(Math.cos(ang) * 0.85, Math.sin(ang) * 0.45, 0.25).normalize();
    addBristle(new THREE.Vector3(ox, oy, 0.12), dir, 0.18 + (i % 4) * 0.05);
  }
  for (let i = 0; i < 38; i++) {
    const ang = -1.35 + (i / 37) * 1.45;
    const ox = 1.92 + Math.cos(ang) * 0.48;
    const oy = 0.22 + Math.sin(ang) * 0.58;
    const dir = new THREE.Vector3(Math.cos(ang) * 0.85, Math.sin(ang) * 0.45, 0.25).normalize();
    addBristle(new THREE.Vector3(ox, oy, 0.16), dir, 0.18 + (i % 4) * 0.05);
  }
  for (let i = 0; i < 28; i++) {
    const t = (i / 27) * 2 - 1;
    const ox = 0.65 + t * 0.55;
    const oy = 1.25 + Math.cos(t * 1.5) * 0.14;
    const dir = new THREE.Vector3(t * 0.35, 0.90, 0.25).normalize();
    addBristle(new THREE.Vector3(ox, oy, 0.14), dir, 0.16 + (i % 3) * 0.04);
  }

  // 3D Articulated Antenna Scapes & Mandible Pincers in Macro BugEye Rig ([4/8] & [6/8])
  const bugeyeAmbient = new THREE.AmbientLight(0x88b070, 1.35);
  const bugeyeKeyLight = new THREE.DirectionalLight(0xe4f5c8, 1.95);
  bugeyeKeyLight.position.set(1.8, 3.2, 2.8);
  const bugeyeRimLight = new THREE.DirectionalLight(0x68a878, 1.15);
  bugeyeRimLight.position.set(-2.5, 1.4, -1.5);
  rootGroups.bugeye.add(bugeyeAmbient, bugeyeKeyLight, bugeyeRimLight);
  rootGroups.leaf.add(bugeyeAmbient.clone(), bugeyeKeyLight.clone(), bugeyeRimLight.clone());

  const bugChitinMat = new THREE.ShaderMaterial({
    uniforms: {
      uLightDir: bugEyeUniforms.uLightDir,
      uChitinShift: bugEyeUniforms.uChitinShift
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      varying vec3 vViewPos;
      void main() {
        vLocalPos = position;
        vNormal = normalize(normalMatrix * normal);
        vec4 vp = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -vp.xyz;
        gl_Position = projectionMatrix * vp;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      varying vec3 vViewPos;
      uniform vec3 uLightDir;
      uniform float uChitinShift;
      ${GLSL_NOISE}
      void main() {
        float microPit = fbm(vLocalPos.xy * 18.0 + vLocalPos.z * 12.0);
        vec3 N = normalize(vNormal + vec3(microPit - 0.5) * 0.22);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(uLightDir);
        vec3 H = normalize(L + V);
        float diff = max(0.0, dot(N, L) * 0.65 + 0.35);
        float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.4);
        float spec = pow(max(0.0, dot(N, H)), 24.0) * (0.5 + 0.5 * microPit);
        vec3 darkChitin = vec3(0.06, 0.09, 0.04);
        vec3 midChitin  = vec3(0.18, 0.26, 0.12);
        vec3 rimChitin  = vec3(0.32, 0.44, 0.20);
        if (uChitinShift > 0.15) {
          darkChitin = vec3(0.12, 0.09, 0.02);
          midChitin  = vec3(0.42, 0.32, 0.08);
          rimChitin  = vec3(0.76, 0.58, 0.16);
        } else if (uChitinShift < -0.15) {
          darkChitin = vec3(0.02, 0.06, 0.12);
          midChitin  = vec3(0.08, 0.24, 0.38);
          rimChitin  = vec3(0.18, 0.52, 0.72);
        }
        vec3 col = mix(darkChitin, midChitin, diff * (0.82 + 0.24 * microPit));
        col += rimChitin * fresnel * 0.48 + rimChitin * spec * 0.45;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const bugEyeAntennaGroup = new THREE.Group();
  rootGroups.bugeye.add(bugEyeAntennaGroup);
  const leftMacroAntennaPivot = new THREE.Group();
  leftMacroAntennaPivot.position.set(-1.35, 0.28, 0.18);
  bugEyeAntennaGroup.add(leftMacroAntennaPivot);
  leftMacroAntennaPivot.add(createSegmentedLimb([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.95, -0.06, 0.12),
    new THREE.Vector3(-2.10, -0.18, 0.22),
    new THREE.Vector3(-3.20, -0.34, 0.28)
  ], [0.16, 0.13, 0.10, 0.07], bugChitinMat, 0.28));

  const rightMacroAntennaPivot = new THREE.Group();
  rightMacroAntennaPivot.position.set(2.48, 0.22, 0.18);
  bugEyeAntennaGroup.add(rightMacroAntennaPivot);
  rightMacroAntennaPivot.add(createSegmentedLimb([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.95, -0.08, 0.12),
    new THREE.Vector3(2.10, -0.22, 0.22),
    new THREE.Vector3(3.15, -0.38, 0.28)
  ], [0.16, 0.13, 0.10, 0.07], bugChitinMat, 0.28));

  const bugEyeMandibleGroup = new THREE.Group();
  rootGroups.bugeye.add(bugEyeMandibleGroup);
  const leftMacroMandiblePivot = new THREE.Group();
  leftMacroMandiblePivot.position.set(0.05, -0.82, 0.20);
  bugEyeMandibleGroup.add(leftMacroMandiblePivot);
  leftMacroMandiblePivot.add(createSegmentedLimb([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.18, -0.45, 0.12),
    new THREE.Vector3(0.18, -0.88, 0.16)
  ], [0.22, 0.15, 0.06], bugChitinMat, 0.35));

  const rightMacroMandiblePivot = new THREE.Group();
  rightMacroMandiblePivot.position.set(1.25, -0.82, 0.20);
  bugEyeMandibleGroup.add(rightMacroMandiblePivot);
  rightMacroMandiblePivot.add(createSegmentedLimb([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.18, -0.45, 0.12),
    new THREE.Vector3(-0.18, -0.88, 0.16)
  ], [0.22, 0.15, 0.06], bugChitinMat, 0.35));

  // Complete 3D Anatomical Macro Beetle Head Capsule + Dual Compound Eye Domes (for V2 Pure 3D, ZERO mode & .OBJ 3D Export)
  const macroBeetleHeadGroup = new THREE.Group();
  macroBeetleHeadGroup.visible = false;
  rootGroups.bugeye.add(macroBeetleHeadGroup);
  {
    const headCapG = new THREE.SphereGeometry(1.42, 64, 48);
    const hPos = headCapG.attributes.position;
    for (let i = 0; i < hPos.count; i++) {
      let x = hPos.getX(i) * 1.28;
      let y = hPos.getY(i) * 0.86;
      let z = hPos.getZ(i) * 0.68;
      // Sculpt ocular sockets at (-0.95, 0.05) and (+0.95, 0.05) in local space, plus dorsal supraorbital brow ridges
      const dL = Math.hypot(x + 0.92, y - 0.04);
      const dR = Math.hypot(x - 0.92, y - 0.04);
      const sock = (Math.exp(-dL * dL * 2.8) + Math.exp(-dR * dR * 2.8)) * Math.max(0, z);
      z -= sock * 0.42;
      const browL = Math.exp(-Math.pow(x + 0.82, 2) * 3.5 - Math.pow(y - 0.48, 2) * 12.0) * Math.max(0, z);
      const browR = Math.exp(-Math.pow(x - 0.82, 2) * 3.5 - Math.pow(y - 0.48, 2) * 12.0) * Math.max(0, z);
      z += (browL + browR) * 0.28;
      y += (browL + browR) * 0.14;
      // Median frontal furrow & flared genae cheek flanges
      const furrow = Math.exp(-x * x * 8.0) * Math.max(0, y + 0.2) * Math.max(0, z);
      z -= furrow * 0.12;
      const gena = Math.exp(-Math.pow(y + 0.38, 2) * 8.0) * Math.min(1.0, Math.abs(x) / 1.2);
      x *= 1.0 + gena * 0.18;
      hPos.setXYZ(i, x, y, z);
    }
    headCapG.computeVertexNormals();
    const headCapM = new THREE.Mesh(headCapG, bugChitinMat);
    headCapM.position.set(0.62, 0.12, -0.18);
    headCapM.name = 'MacroBeetle_HeadCapsule';
    macroBeetleHeadGroup.add(headCapM);

    const pronotumG = new THREE.SphereGeometry(1.95, 48, 32);
    pronotumG.scale(1.42, 0.86, 0.85);
    const pronotumM = new THREE.Mesh(pronotumG, bugChitinMat);
    pronotumM.position.set(0.58, 0.34, -1.25);
    pronotumM.name = 'MacroBeetle_Pronotum';
    macroBeetleHeadGroup.add(pronotumM);

    const clypeusG = new THREE.CylinderGeometry(0.76, 0.56, 0.52, 32);
    clypeusG.scale(1.25, 1.0, 0.72);
    const clypeusM = new THREE.Mesh(clypeusG, bugChitinMat);
    clypeusM.position.set(0.64, -0.66, 0.18);
    clypeusM.name = 'MacroBeetle_ClypeusLabrum';
    macroBeetleHeadGroup.add(clypeusM);

    const macroEyeMat = new THREE.ShaderMaterial({
      uniforms: {
        uHexDensity: bugEyeUniforms.uHexDensity,
        uChitinShift: bugEyeUniforms.uChitinShift,
        uLightDir: bugEyeUniforms.uLightDir
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 vp = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -vp.xyz;
          gl_Position = projectionMatrix * vp;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        uniform float uHexDensity;
        uniform float uChitinShift;
        uniform vec3 uLightDir;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewPos);
          vec3 L = normalize(uLightDir);
          float scale = max(28.0, uHexDensity * 0.42);
          vec2 p = vUv * vec2(scale, scale * 0.866);
          vec2 r = vec2(1.0, 1.7320508);
          vec2 h = r * 0.5;
          vec2 a = mod(p, r) - h;
          vec2 b = mod(p - h, r) - h;
          vec2 gv = dot(a, a) < dot(b, b) ? a : b;
          float d = length(gv);
          float cell = smoothstep(0.52, 0.14, d);
          float groove = smoothstep(0.36, 0.48, d);
          vec3 cN = normalize(N + vec3(gv.x, gv.y, 0.18) * 0.55);
          float diff = max(0.0, dot(cN, L) * 0.7 + 0.3);
          float spec = pow(max(0.0, dot(reflect(-L, cN), V)), 22.0) * cell;
          float fres = pow(1.0 - max(0.0, dot(N, V)), 2.2);
          float pseudo = smoothstep(0.93, 0.995, dot(N, V));
          vec3 baseCol = vec3(0.22, 0.30, 0.14);
          if (uChitinShift > 0.15) baseCol = mix(baseCol, vec3(0.46, 0.34, 0.08), clamp(uChitinShift, 0.0, 1.0));
          else if (uChitinShift < -0.15) baseCol = mix(baseCol, vec3(0.08, 0.26, 0.38), clamp(-uChitinShift, 0.0, 1.0));
          vec3 col = baseCol * (0.42 + 0.88 * diff) * cell * (1.0 - groove * 0.72) + vec3(0.75, 0.86, 0.56) * spec * 0.85 + baseCol * fres * 0.35;
          col *= mix(1.0, 0.25, pseudo);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    const eyeLG = new THREE.SphereGeometry(0.68, 48, 36);
    eyeLG.scale(0.96, 1.08, 0.86);
    const eyeLM = new THREE.Mesh(eyeLG, macroEyeMat);
    eyeLM.position.set(-0.32, 0.14, 0.44);
    eyeLM.rotation.y = -0.28;
    eyeLM.rotation.z = 0.08;
    eyeLM.name = 'MacroBeetle_CompoundEye_SN';
    macroBeetleHeadGroup.add(eyeLM);

    const eyeRG = new THREE.SphereGeometry(0.72, 48, 36);
    eyeRG.scale(0.98, 1.10, 0.88);
    const eyeRM = new THREE.Mesh(eyeRG, macroEyeMat);
    eyeRM.position.set(1.56, 0.16, 0.46);
    eyeRM.rotation.y = 0.28;
    eyeRM.rotation.z = -0.08;
    eyeRM.name = 'MacroBeetle_CompoundEye_DX';
    macroBeetleHeadGroup.add(eyeRM);
  }

  // ==========================================================================
  // 2. ACT I: WET SERRATED LEAF & WALKING SCARAB BEETLE (00:25 sec_025 -> 00:28 sec_028)
  // Combines 3D Curved Leaf Relief + Multi-Keyframe Scarab Gait & Water Menisci +
  // Articulated 3D Primitive Scarab Rig (visible in ZERO / LAYER modes)
  // ==========================================================================
  const leafUniforms = {
    uTime:       { value: 0 },
    uVeinDepth:  { value: 0.95 },
    uWetness:    { value: 0.95 },
    uBeetleWalk: { value: 0.0 },
    uWireOverlay:{ value: 0.0 },
    uLeafTex:    { value: filmTextures.leaf },
    uLeaf26Tex:  { value: filmTextures.leaf26 },
    uLeaf27Tex:  { value: filmTextures.leaf27 },
    uLeaf28Tex:  { value: filmTextures.leaf28 },
    uSamTex:     { value: filmTextures.sam_leaf },
    uDepthTex:   { value: filmTextures.depth_leaf },
    uObjSolid:   { value: new THREE.Vector4(1, 1, 1, 1) },
    uObjFocus:   { value: new THREE.Vector4(0.85, 0.85, 0.85, 0.85) },
    uObjMorph:   { value: new THREE.Vector4(0.8, 0.8, 0.8, 0.8) },
    uObjLuma:    { value: new THREE.Vector4(1, 1, 1, 1) },
    uObjTint:    { value: new THREE.Vector4(0, 0, 0, 0) },
    uObjOffsetX: { value: new THREE.Vector4(0, 0, 0, 0) },
    uObjOffsetY: { value: new THREE.Vector4(0, 0, 0, 0) },
    uObjVis:     { value: new THREE.Vector4(1, 1, 1, 1) },
    uCompMode:   { value: 0.0 },
    uSelectedIdx:{ value: 0 },
    uHeadShift:  { value: 0.0 },
    uLightDir:   { value: new THREE.Vector3(-0.22, 0.74, 0.64).normalize() }
  };

  const leafReliefGeom = new THREE.PlaneGeometry(13.0, 4.90, 200, 140);
  const leafReliefMat = new THREE.ShaderMaterial({
    uniforms: leafUniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform float uTime;
      uniform float uVeinDepth;
      uniform float uBeetleWalk;
      uniform vec4 uObjMorph;
      uniform sampler2D uDepthTex;
      uniform sampler2D uSamTex;
      void main() {
        vUv = uv;
        vec3 samRGB = texture2D(uSamTex, uv).rgb;
        vec3 depthB = texture2D(uDepthTex, uv).rgb;
        float midasDepth = depthB.r;
        vec4 masks = vec4(samRGB, depthB.b);
        float morphBoost = 0.65 + 0.55 * dot(masks, uObjMorph) / max(1.0, masks.x + masks.y + masks.z + masks.w);
        vec3 pos = position;
        float edgePin = smoothstep(0.0, 0.05, uv.x) * (1.0 - smoothstep(0.95, 1.0, uv.x)) *
                        smoothstep(0.0, 0.05, uv.y) * (1.0 - smoothstep(0.95, 1.0, uv.y));
        float breeze = sin(uTime * 1.2 + uv.y * 3.5) * 0.025 * edgePin;
        float bladeArch = -0.28 * pow(uv.x - 0.52, 2.0) + 0.12 * sin(uv.y * 3.14159) + breeze;
        pos.z = ((bladeArch + (midasDepth - 0.35) * 0.52 * morphBoost) * edgePin) * clamp(uVeinDepth, 0.25, 1.0);
        vNormal = normalize(normalMatrix * normalize(vec3((0.52 - uv.x) * 0.6, 0.1, 1.0)));
        vec4 vp = modelViewMatrix * vec4(pos, 1.0);
        vViewPos = -vp.xyz;
        gl_Position = projectionMatrix * vp;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform float uTime;
      uniform float uVeinDepth;
      uniform float uWetness;
      uniform float uBeetleWalk;
      uniform float uWireOverlay;
      uniform sampler2D uLeafTex;
      uniform sampler2D uLeaf26Tex;
      uniform sampler2D uLeaf27Tex;
      uniform sampler2D uLeaf28Tex;
      uniform vec3 uLightDir;
      ${GLSL_NOISE}
      ${GLSL_SAM_PER_OBJECT}
      void main() {
        vec2 uv = vUv;
        float walkProg = clamp(uBeetleWalk, 0.0, 1.0);
        vec3 col25 = texture2D(uLeafTex, uv).rgb;
        vec3 col26 = texture2D(uLeaf26Tex, uv).rgb;
        vec3 col27 = texture2D(uLeaf27Tex, uv).rgb;
        vec3 col28 = texture2D(uLeaf28Tex, uv).rgb;

        vec3 filmCol = col25;
        if (walkProg < 0.34) {
          filmCol = mix(col25, col26, smoothstep(0.04, 0.30, walkProg));
        } else if (walkProg < 0.68) {
          filmCol = mix(col26, col27, smoothstep(0.36, 0.64, walkProg));
        } else {
          filmCol = mix(col27, col28, smoothstep(0.70, 0.96, walkProg));
        }

        vec3 blurCol = (
          filmCol * 0.28 +
          texture2D(uLeafTex, clamp(uv + vec2( 0.005, 0.0), 0.0, 1.0)).rgb * 0.18 +
          texture2D(uLeafTex, clamp(uv + vec2(-0.005, 0.0), 0.0, 1.0)).rgb * 0.18 +
          texture2D(uLeafTex, clamp(uv + vec2(0.0,  0.007), 0.0, 1.0)).rgb * 0.18 +
          texture2D(uLeafTex, clamp(uv + vec2(0.0, -0.007), 0.0, 1.0)).rgb * 0.18
        );

        float luma = dot(filmCol, vec3(0.299, 0.587, 0.114));
        float shimmer = 0.92 + 0.14 * sin(uTime * 2.8 + uv.x * 16.0 + uv.y * 12.0);
        float glintMask = smoothstep(0.52, 0.82, luma) * smoothstep(0.18, 0.28, uv.x) * (1.0 - smoothstep(0.80, 0.90, uv.x));
        filmCol = mix(filmCol * (0.90 + 0.10 * uWetness), filmCol * (0.76 + 0.28 * uWetness * shimmer), glintMask);

        filmCol = applySamPerObject(filmCol, blurCol, uv);

        if (uWireOverlay > 0.01) {
          vec2 dt = texture2D(uDepthTex, uv).rg;
          float wGrid = step(0.93, fract((uv.x + dt.r * 0.02) * 64.0)) + step(0.93, fract((uv.y + dt.r * 0.02) * 42.0));
          filmCol = mix(filmCol, vec3(0.68, 0.92, 0.54), clamp(wGrid + dt.g * 0.8, 0.0, 1.0) * uWireOverlay * 0.45);
        }

        gl_FragColor = vec4(filmCol, 1.0);
      }
    `
  });
  const leafReliefMesh = new THREE.Mesh(leafReliefGeom, leafReliefMat);
  rootGroups.leaf.add(leafReliefMesh);

  // 3D Walking Metallic Emerald Scarab Beetle (active when R1 moves or in primitive mode)
  const scarabBeetleGroup = new THREE.Group();
  scarabBeetleGroup.scale.setScalar(0.58);
  rootGroups.leaf.add(scarabBeetleGroup);

  const elytraMaterial = new THREE.ShaderMaterial({
    uniforms: { uLightDir: leafUniforms.uLightDir, uChitinShift: bugEyeUniforms.uChitinShift },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      varying vec3 vViewPos;
      void main() {
        vLocalPos = position;
        vNormal = normalize(normalMatrix * normal);
        vec4 vp = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -vp.xyz;
        gl_Position = projectionMatrix * vp;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      varying vec3 vViewPos;
      uniform vec3 uLightDir;
      uniform float uChitinShift;
      void main() {
        float suture = exp(-vLocalPos.x * vLocalPos.x * 500.0);
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(uLightDir);
        vec3 H = normalize(L + V);
        float diff = max(0.0, dot(N, L) * 0.6 + 0.4);
        float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.6);
        float spec = pow(max(0.0, dot(N, H)), 48.0);
        float rightWingGlint = pow(max(0.0, dot(N, normalize(vec3(0.48, 0.18, 0.85)))), 75.0);
        vec3 darkChitin = vec3(0.03, 0.07, 0.04);
        vec3 midChitin  = vec3(0.12, 0.24, 0.14);
        vec3 rimChitin  = vec3(0.16, 0.32, 0.18);
        if (uChitinShift > 0.2) {
          darkChitin = vec3(0.10, 0.07, 0.01);
          midChitin  = vec3(0.44, 0.32, 0.06);
          rimChitin  = vec3(0.82, 0.62, 0.14);
        } else if (uChitinShift < -0.2) {
          darkChitin = vec3(0.01, 0.05, 0.10);
          midChitin  = vec3(0.05, 0.22, 0.38);
          rimChitin  = vec3(0.14, 0.56, 0.78);
        }
        vec3 baseCol = mix(darkChitin, midChitin, diff);
        baseCol += rimChitin * fresnel * 0.55;
        baseCol *= (1.0 - suture * 0.55);
        baseCol += vec3(0.76, 0.88, 0.76) * (spec * 0.45 + rightWingGlint * 0.95);
        gl_FragColor = vec4(baseCol, 1.0);
      }
    `
  });

  const elytraGeom = new THREE.SphereGeometry(0.42, 40, 32);
  elytraGeom.scale(0.62, 1.42, 0.50);
  const elytraMesh = new THREE.Mesh(elytraGeom, elytraMaterial);
  elytraMesh.position.set(0, 0.22, 0.16);
  scarabBeetleGroup.add(elytraMesh);

  // Split Dorsal Elytra & Unfurling Translucent Hindwings ([3/8] ELYTRA.WINGS — sec_028.jpg)
  const leftElytronPivot = new THREE.Group();
  leftElytronPivot.position.set(-0.08, -0.22, 0.24);
  scarabBeetleGroup.add(leftElytronPivot);
  const halfElytronGeom = new THREE.SphereGeometry(0.24, 28, 22);
  halfElytronGeom.scale(0.64, 2.25, 0.42);
  const leftElytronMesh = new THREE.Mesh(halfElytronGeom, elytraMaterial);
  leftElytronMesh.position.set(-0.08, 0.44, 0.0);
  leftElytronPivot.add(leftElytronMesh);

  const rightElytronPivot = new THREE.Group();
  rightElytronPivot.position.set(0.08, -0.22, 0.24);
  scarabBeetleGroup.add(rightElytronPivot);
  const rightElytronMesh = new THREE.Mesh(halfElytronGeom, elytraMaterial);
  rightElytronMesh.position.set(0.08, 0.44, 0.0);
  rightElytronPivot.add(rightElytronMesh);

  const flightWingMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8ead0,
    roughness: 0.18,
    metalness: 0.12,
    transmission: 0.72,
    transparent: true,
    opacity: 0.56,
    side: THREE.DoubleSide
  });
  const flightWingGeom = new THREE.PlaneGeometry(0.36, 1.05, 8, 12);
  const leftFlightWingPivot = new THREE.Group();
  leftFlightWingPivot.position.set(-0.06, -0.18, 0.22);
  const leftFlightWing = new THREE.Mesh(flightWingGeom, flightWingMat);
  leftFlightWing.position.set(-0.14, 0.48, 0.02);
  leftFlightWingPivot.add(leftFlightWing);
  scarabBeetleGroup.add(leftFlightWingPivot);

  const rightFlightWingPivot = new THREE.Group();
  rightFlightWingPivot.position.set(0.06, -0.18, 0.22);
  const rightFlightWing = new THREE.Mesh(flightWingGeom, flightWingMat);
  rightFlightWing.position.set(0.14, 0.48, 0.02);
  rightFlightWingPivot.add(rightFlightWing);
  scarabBeetleGroup.add(rightFlightWingPivot);

  const scarabPronotum = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), elytraMaterial);
  scarabPronotum.scale.set(0.84, 0.72, 0.52);
  scarabPronotum.position.set(0, -0.42, 0.14);
  scarabBeetleGroup.add(scarabPronotum);

  const scarabHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 20), elytraMaterial);
  scarabHead.scale.set(0.78, 0.80, 0.50);
  scarabHead.position.set(0, -0.70, 0.11);
  scarabBeetleGroup.add(scarabHead);

  // 11-Segment Filiform Antennae & Mandible Pincers on Walking Scarab ([4/8] & [6/8] — sec_027.jpg)
  const leftScarabAntennaPivot = new THREE.Group();
  leftScarabAntennaPivot.position.set(-0.10, -0.76, 0.13);
  leftScarabAntennaPivot.add(createSegmentedLimb([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.22, -0.26, 0.08),
    new THREE.Vector3(-0.48, -0.42, 0.14),
    new THREE.Vector3(-0.74, -0.48, 0.18)
  ], [0.016, 0.012, 0.009, 0.005], elytraMaterial, 0.08));
  scarabBeetleGroup.add(leftScarabAntennaPivot);

  const rightScarabAntennaPivot = new THREE.Group();
  rightScarabAntennaPivot.position.set(0.10, -0.76, 0.13);
  rightScarabAntennaPivot.add(createSegmentedLimb([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.22, -0.26, 0.08),
    new THREE.Vector3(0.48, -0.42, 0.14),
    new THREE.Vector3(0.74, -0.48, 0.18)
  ], [0.016, 0.012, 0.009, 0.005], elytraMaterial, 0.08));
  scarabBeetleGroup.add(rightScarabAntennaPivot);

  const beetleLegs = [];
  [
    { side: -1, y: -0.44, angle: -0.42, span: 0.54 },
    { side:  1, y: -0.44, angle: -0.42, span: 0.48 },
    { side: -1, y: -0.04, angle:  0.14, span: 0.68 },
    { side:  1, y: -0.04, angle:  0.14, span: 0.54 },
    { side: -1, y:  0.38, angle:  0.65, span: 0.72 },
    { side:  1, y:  0.38, angle:  0.65, span: 0.60 }
  ].forEach((cfg, idx) => {
    const legMesh = createSegmentedLimb([
      new THREE.Vector3(cfg.side * 0.16, cfg.y, 0.11),
      new THREE.Vector3(cfg.side * (cfg.span * 0.62), cfg.y + cfg.angle * 0.26, 0.18),
      new THREE.Vector3(cfg.side * cfg.span, cfg.y + cfg.angle * 0.50, -0.01),
      new THREE.Vector3(cfg.side * (cfg.span + 0.12), cfg.y + cfg.angle * 0.65, -0.04)
    ], [0.024, 0.018, 0.013, 0.008], elytraMaterial, 0.12);
    scarabBeetleGroup.add(legMesh);
    beetleLegs.push({ mesh: legMesh, idx, side: cfg.side });
  });

  // 3D Refractive Water Droplets on Wet Leaf Surface (Restored from s1_leaf 3D model)
  const dropletsGroup = new THREE.Group();
  rootGroups.leaf.add(dropletsGroup);
  const dropletMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uLightDir: leafUniforms.uLightDir },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 vp = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -vp.xyz;
        gl_Position = projectionMatrix * vp;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform vec3 uLightDir;
      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vViewPos);
        vec3 L = normalize(uLightDir);
        vec3 H = normalize(L + V);
        float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.2);
        float spec = pow(max(0.0, dot(N, H)), 64.0);
        float caustic = pow(max(0.0, dot(-N, L)), 3.0) * 0.45;
        vec3 col = vec3(0.42, 0.72, 0.36) * (0.45 + caustic) + vec3(0.78, 0.96, 0.82) * fresnel * 0.75 + vec3(1.0, 1.0, 0.96) * spec * 1.35;
        float alpha = clamp(0.22 + fresnel * 0.52 + spec * 0.85, 0.0, 0.92);
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
  const dropletSpecs = [
    [-1.45,  0.52, 0.09], [-0.88,  0.74, 0.12], [-0.34,  0.62, 0.08], [ 0.42,  0.82, 0.11],
    [ 1.15,  0.58, 0.10], [-1.18, -0.38, 0.11], [-0.52, -0.58, 0.13], [ 0.28, -0.46, 0.09],
    [ 0.94, -0.34, 0.12], [ 1.52, -0.18, 0.08], [-0.22,  0.18, 0.07], [ 0.64,  0.22, 0.10]
  ];
  dropletSpecs.forEach(([dx, dy, dr]) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(dr, 16, 12), dropletMat);
    drop.scale.set(1.15, 0.92, 0.48);
    drop.position.set(dx, dy, 0.22);
    dropletsGroup.add(drop);
  });

  // ==========================================================================
  // 3. SUNLIT FOREST CANOPY (00:15 sec_016->sec_022) & DOME DISSOLVE (00:36-00:52)
  // Uses extracted multi-frame progression: sec_036 -> sec_039 -> sec_043 -> sec_050 -> sec_052
  // ==========================================================================
  const canopyUniforms = {
    uTime:        { value: 0 },
    uDissolve:    { value: 0.0 },
    uSunRays:     { value: 0.9 },
    uSculptRelief:{ value: 1.0 },
    uBranchZoom:  { value: 0.0 },
    uCanopyTex:   { value: filmTextures.canopy },
    uBranchTex:   { value: filmTextures.branch22 },
    uClear36:     { value: filmTextures.clear36 },
    uClear39:     { value: filmTextures.clear39 },
    uClear43:     { value: filmTextures.clear43 },
    uClear50:     { value: filmTextures.clear50 },
    uDissolveTex: { value: filmTextures.dissolve },
    uSamTex:      { value: filmTextures.sam_canopy },
    uDepthTex:    { value: filmTextures.depth_canopy },
    uObjSolid:    { value: new THREE.Vector4(1, 1, 1, 1) },
    uObjFocus:    { value: new THREE.Vector4(0.85, 0.85, 0.85, 0.85) },
    uObjMorph:    { value: new THREE.Vector4(0.8, 0.8, 0.8, 0.8) },
    uObjLuma:     { value: new THREE.Vector4(1, 1, 1, 1) },
    uObjTint:     { value: new THREE.Vector4(0, 0, 0, 0) },
    uObjOffsetX:  { value: new THREE.Vector4(0, 0, 0, 0) },
    uObjOffsetY:  { value: new THREE.Vector4(0, 0, 0, 0) },
    uObjVis:      { value: new THREE.Vector4(1, 1, 1, 1) },
    uCompMode:    { value: 0.0 },
    uSelectedIdx: { value: 0 },
    uHeadShift:   { value: 0.0 }
  };

  const canopyGeom = new THREE.PlaneGeometry(13.0, 4.90, 120, 80);
  const canopyShaderMat = new THREE.ShaderMaterial({
    uniforms: canopyUniforms,
    vertexShader: `
      varying vec2 vUv;
      uniform sampler2D uDepthTex;
      uniform float uTime;
      uniform float uDissolve;
      uniform float uSculptRelief;
      void main() {
        vUv = uv;
        float d = texture2D(uDepthTex, uv).r;
        float edgePin = smoothstep(0.0, 0.05, uv.x) * (1.0 - smoothstep(0.95, 1.0, uv.x)) *
                        smoothstep(0.0, 0.05, uv.y) * (1.0 - smoothstep(0.95, 1.0, uv.y));
        vec3 pos = position;
        pos.x += sin(uTime * 1.1 + uv.y * 5.0) * 0.035 * edgePin * (1.0 - uDissolve * 0.7);
        float dz = ((d - 0.42) * 0.65 * uSculptRelief + cos(uTime * 1.3 + uv.x * 4.0) * 0.025) * edgePin;
        pos.z += dz;
        pos.xy *= (8.0 - dz) / 8.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uCanopyTex;
      uniform sampler2D uBranchTex;
      uniform sampler2D uClear36;
      uniform sampler2D uClear39;
      uniform sampler2D uClear43;
      uniform sampler2D uClear50;
      uniform sampler2D uDissolveTex;
      uniform float uTime;
      uniform float uDissolve;
      uniform float uSunRays;
      uniform float uSculptRelief;
      uniform float uBranchZoom;
      ${GLSL_NOISE}
      ${GLSL_SAM_PER_OBJECT}
      void main() {
        vec2 uv = vUv;
        vec3 colCanopy = mix(texture2D(uCanopyTex, uv).rgb, texture2D(uBranchTex, uv).rgb, smoothstep(0.15, 0.85, uBranchZoom));

        vec2 toSun = uv - vec2(0.49, 0.78);
        float distSun = length(toSun);
        float rayAng = atan(toSun.y, toSun.x) + uTime * 0.08;
        float rays = pow(0.5 + 0.5 * sin(rayAng * 12.0), 3.0) * exp(-distSun * 2.2) * (uSunRays - 0.50);
        colCanopy += vec3(0.45, 0.52, 0.32) * rays * 0.55;

        // Multi-frame progression for 00:36 -> 00:52 (Stelline in forest hologram -> Officer K enters -> Dome dissolve)
        vec3 c36 = texture2D(uClear36, uv).rgb;
        vec3 c39 = texture2D(uClear39, uv).rgb;
        vec3 c43 = texture2D(uClear43, uv).rgb;
        vec3 c50 = texture2D(uClear50, uv).rgb;
        vec3 c52 = texture2D(uDissolveTex, uv).rgb;

        vec3 colClear;
        if (uDissolve < 0.22) {
          colClear = mix(c36, c39, smoothstep(0.02, 0.22, uDissolve));
        } else if (uDissolve < 0.45) {
          colClear = mix(c39, c43, smoothstep(0.22, 0.45, uDissolve));
        } else if (uDissolve < 0.68) {
          colClear = mix(c43, c50, smoothstep(0.45, 0.68, uDissolve));
        } else {
          colClear = mix(c50, c52, smoothstep(0.68, 0.92, uDissolve));
        }

        vec3 col = (uDissolve > 0.01) ? colClear : colCanopy;
        vec3 blurCol = col * 0.82;
        col = applySamPerObject(col, blurCol, uv);
        if (uSculptRelief < 0.85) {
          float grid = step(0.93, fract(uv.x * 48.0)) + step(0.93, fract(uv.y * 32.0));
          col = mix(col * 0.55 + vec3(0.28, 0.78, 0.64) * clamp(grid, 0.0, 1.0) * 0.55, col, uSculptRelief / 0.85);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const canopyMesh = new THREE.Mesh(canopyGeom, canopyShaderMat);
  rootGroups.canopy.add(canopyMesh);

  // ==========================================================================
  // 4. ACT II: BIRTHDAY PARTY (02:17 - 03:16)
  // Combines Volumetric Studio Readymades + Live 3D Morphing Birthday Cake +
  // DPT-MiDaS 3D Depth Relief + SAM Per-Object Dials (L1..R2) + 3D Hex Table
  // ==========================================================================
  const bdayUniforms = {
    uTime:           { value: 0 },
    uShotMode:       { value: 0 }, // 0=spawn, 1=bundt, 2=icing, 3=cutouts, 4=blow, 5=miniature
    uSculptRelief:   { value: 1.0 }, // L1: blends shaded 3D model/relief <-> photographic radiance
    uRadianceCalib:  { value: 1.0 }, // L2: photographic candle subsurface radiance calibration
    uStageProgress:  { value: 0.5 }, // Multi-frame progression for 02:17-02:21 (sec_138 -> ref_0217 -> sec_141)
    uBundtMorph:     { value: 0.0 }, // L3: morphs Cylinder (sec_142) -> Rising Bundt (sec_143) -> Scalloped Bundt (ref_0223)
    uIcingDetail:    { value: 1.0 }, // L3: pipes 生日 (sec_146) -> 生日快樂 (sec_147) -> Flourish (ref_0226)
    uCutoutProgress: { value: 0.75 },// R1: stages Cutout 1 (sec_153) -> Cutout 2 (ref_0233) -> Cutout 3 (sec_155) -> Cutout 4 (sec_156) -> Party 6 (sec_158)
    uCandleWind:     { value: 0.0 }, // R2: breath wind & multi-shot blowcandles progression (sec_174->182->173->177->178)
    uWireOverlay:    { value: 0.0 },
    uCameraOrbit:    { value: 0.0 },
    uLiveMode:       { value: 0.0 },
    uSamTex:         { value: filmTextures.sam_cakespawn },
    uDepthTex:       { value: filmTextures.depth_cakespawn },
    uObjSolid:       { value: new THREE.Vector4(0.95, 0.95, 0.95, 0.95) },
    uObjFocus:       { value: new THREE.Vector4(0.65, 0.65, 0.65, 0.65) },
    uObjMorph:       { value: new THREE.Vector4(0.80, 0.80, 0.80, 0.80) },
    uObjLuma:        { value: new THREE.Vector4(1.00, 1.00, 1.00, 1.00) },
    uObjTint:        { value: new THREE.Vector4(0.00, 0.00, 0.00, 0.00) },
    uObjOffsetX:     { value: new THREE.Vector4(0.00, 0.00, 0.00, 0.00) },
    uObjOffsetY:     { value: new THREE.Vector4(0.00, 0.00, 0.00, 0.00) },
    uObjVis:         { value: new THREE.Vector4(1.00, 1.00, 1.00, 1.00) },
    uCompMode:       { value: 0.0 },
    uSelectedIdx:    { value: 0.0 },
    uHeadShift:      { value: 0.0 },
    uFrostingShift:  { value: 0.0 },
    uTexF0:          { value: filmTextures.spawn138 },
    uTexF1:          { value: filmTextures.spawn },
    uTexF2:          { value: filmTextures.spawn141 },
    uTexF3:          { value: filmTextures.dim133 },
    uTexF4:          { value: filmTextures.party6 }
  };

  const GLSL_MULTIFRAME_BDAY = `
    vec3 sampleMultiFrameBday(vec2 uv) {
      vec3 c0 = texture2D(uTexF0, uv).rgb;
      vec3 c1 = texture2D(uTexF1, uv).rgb;
      vec3 c2 = texture2D(uTexF2, uv).rgb;
      vec3 c3 = texture2D(uTexF3, uv).rgb;
      vec3 c4 = texture2D(uTexF4, uv).rgb;

      // SHOT 0 (02:17 - 02:21): 3 Candles + Smarties (c0) -> 7 Candles + Smarties (c1) -> Smarties Cleared (c2)
      if (uShotMode < 0.5) {
        if (uStageProgress < 0.52) {
          return mix(c0, c1, smoothstep(0.05, 0.50, uStageProgress));
        } else {
          return mix(c1, c2, smoothstep(0.54, 0.92, uStageProgress));
        }
      }
      // SHOT 1 (02:22 - 02:25): Level Cylinder w/ 7 Candles (c0) -> Rising Bundt w/ 1 Candle (c1) -> Tilted Bundt w/ 2 Candles (c2)
      else if (uShotMode < 1.5) {
        if (uBundtMorph < 0.48) {
          return mix(c0, c1, smoothstep(0.04, 0.46, uBundtMorph));
        } else {
          return mix(c1, c2, smoothstep(0.48, 0.88, uBundtMorph));
        }
      }
      // SHOT 2 (02:26 - 02:28): Piped 生日 (c0) -> Piped 生日快樂 (c1) -> + Underline Flourish (c2)
      else if (uShotMode < 2.5) {
        if (uIcingDetail < 0.52) {
          return mix(c0, c1, smoothstep(0.05, 0.50, uIcingDetail));
        } else {
          return mix(c1, c2, smoothstep(0.52, 0.92, uIcingDetail));
        }
      }
      // SHOT 3 (02:33 - 02:38): 1st Child Cutout (c0) -> 2 Cutouts (c1) -> 3rd Cutout (c2=sec_155 clean wall!) -> 4th Cutout (c3) -> Wide 6-Child Circle (c4)
      else if (uShotMode < 3.5) {
        if (uCutoutProgress < 0.28) {
          return mix(c0, c1, smoothstep(0.04, 0.26, uCutoutProgress));
        } else if (uCutoutProgress < 0.82) {
          return mix(c1, c2, smoothstep(0.28, 0.50, uCutoutProgress));
        } else if (uCutoutProgress < 0.92) {
          return mix(c2, c3, smoothstep(0.82, 0.91, uCutoutProgress));
        } else {
          return mix(c3, c4, smoothstep(0.92, 0.99, uCutoutProgress));
        }
      }
      // SHOT 4 (02:53 - 03:09): Multi-frame candle-blowing sequence (c0=174 -> c1=182 -> c2=173 -> c3=177 -> c4=178)
      else if (uShotMode < 4.5) {
        float w = clamp(uCandleWind, 0.0, 1.0);
        if (w < 0.25) return mix(c0, c1, smoothstep(0.02, 0.24, w));
        if (w < 0.50) return mix(c1, c2, smoothstep(0.25, 0.48, w));
        if (w < 0.75) return mix(c2, c3, smoothstep(0.50, 0.74, w));
        return mix(c3, c4, smoothstep(0.75, 0.96, w));
      }
      return c0;
    }
  `;

  const bgBirthdayGeom = new THREE.PlaneGeometry(13.0, 4.90, 200, 140);
  const bgBirthdayMat = new THREE.ShaderMaterial({
    uniforms: bdayUniforms,
    vertexShader: `
      varying vec2 vUv;
      varying float vDepth;
      uniform sampler2D uDepthTex;
      uniform sampler2D uSamTex;
      uniform vec4 uObjSolid;
      uniform float uSculptRelief;
      void main() {
        vUv = uv;
        float d = texture2D(uDepthTex, uv).r;
        vec4 sam = texture2D(uSamTex, uv);
        float objSolid = mix(uSculptRelief, dot(sam, uObjSolid), clamp(sam.r + sam.g + sam.b + sam.a, 0.0, 1.0));
        float edgePin = smoothstep(0.0, 0.04, uv.x) * (1.0 - smoothstep(0.96, 1.0, uv.x)) *
                        smoothstep(0.0, 0.04, uv.y) * (1.0 - smoothstep(0.96, 1.0, uv.y));
        vec3 pos = position;
        float dz = (d - 0.38) * 1.15 * objSolid * edgePin;
        pos.z += dz;
        pos.xy *= (8.15 - dz) / 8.15;
        vDepth = d;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying float vDepth;
      uniform float uTime;
      uniform float uShotMode;
      uniform float uSculptRelief;
      uniform float uRadianceCalib;
      uniform float uStageProgress;
      uniform float uBundtMorph;
      uniform float uIcingDetail;
      uniform float uCutoutProgress;
      uniform float uCandleWind;
      uniform float uCameraOrbit;
      uniform float uLiveMode;
      uniform float uWireOverlay;
      uniform float uFrostingShift;
      uniform sampler2D uTexF0;
      uniform sampler2D uTexF1;
      uniform sampler2D uTexF2;
      uniform sampler2D uTexF3;
      uniform sampler2D uTexF4;
      ${GLSL_NOISE}
      ${GLSL_SAM_PER_OBJECT}
      ${GLSL_MULTIFRAME_BDAY}
      void main() {
        vec2 uv = vUv;
        vec3 col = sampleMultiFrameBday(uv);

        // Compute 9-tap bokeh blur for L2:FOCUS defocus on any selected SAM item (child cutout, Stelline, cake)
        vec3 blurCol = (
          sampleMultiFrameBday(uv + vec2( 0.010,  0.000)) +
          sampleMultiFrameBday(uv + vec2(-0.010,  0.000)) +
          sampleMultiFrameBday(uv + vec2( 0.000,  0.014)) +
          sampleMultiFrameBday(uv + vec2( 0.000, -0.014)) +
          col
        ) * 0.20;

        // Apply subtle photorealistic frosting grade on the cake SAM region when a PROTOCOL II counterfactual is active
        vec4 samMask = texture2D(uSamTex, uv);
        float cakeMask = (uShotMode >= 2.5 && uShotMode < 3.5) ? samMask.a : samMask.r;
        if (abs(uFrostingShift) > 0.05 && cakeMask > 0.05) {
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          vec3 ganacheGrade = vec3(lum * 0.55, lum * 0.34, lum * 0.20);
          vec3 roseGrade    = vec3(lum * 1.12, lum * 0.72, lum * 0.82);
          vec3 targetGrade  = (uFrostingShift > 0.0)
            ? mix(col, ganacheGrade, clamp(uFrostingShift * 0.75, 0.0, 0.75))
            : mix(col, roseGrade,    clamp(-uFrostingShift * 0.65, 0.0, 0.65));
          col = mix(col, targetGrade, cakeMask);
        }
        if (uShotMode >= 3.5 && uShotMode < 4.5) {
          float glowMod = 1.0 - max(0.0, uCandleWind - 0.65) * 0.45;
          col *= (0.82 + 0.25 * glowMod);
        }
        if (uCandleWind > 0.52) {
          float extK = clamp((uCandleWind - 0.52) / 0.45, 0.0, 1.0);
          float bLum = dot(col, vec3(0.299, 0.587, 0.114));
          float isHorizon = smoothstep(0.44, 0.49, uv.y) * (1.0 - smoothstep(0.53, 0.60, uv.y)) * (1.0 - clamp(samMask.r + samMask.g + samMask.b, 0.0, 1.0));
          vec3 coolTwilight = mix(vec3(0.07, 0.09, 0.13) * pow(bLum, 0.88) + col * 0.12, col * 0.82, isHorizon);
          col = mix(col, coolTwilight, extK * 0.86);
        }

        // Apply SAM per-object L1:SOLID (3D DPT-MiDaS depth contour mesh), L2:FOCUS, R1:LUMA (lighten/darken people!), R2:TINT!
        col = applySamPerObject(col, blurCol, uv);
        if (uWireOverlay > 0.01) {
          float wGrid = step(0.93, fract(uv.x * 64.0)) + step(0.93, fract(uv.y * 36.0));
          col += vec3(0.35, 0.88, 0.78) * clamp(wGrid, 0.0, 1.0) * uWireOverlay * 0.35;
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const bgBirthdayQuad = new THREE.Mesh(bgBirthdayGeom, bgBirthdayMat);
  bgBirthdayQuad.position.z = -0.15;
  rootGroups.birthday.add(bgBirthdayQuad);

  // ==========================================================================
  // LIVE 3D MORPHING BIRTHDAY CAKE MESH (Cylinder <-> Scalloped Bundt <-> Red Icing)
  // ==========================================================================
  const cakeGroup = new THREE.Group();
  rootGroups.birthday.add(cakeGroup);

  const bdayAmbient = new THREE.AmbientLight(0xffe0a8, 0.95);
  const bdayCandleLight = new THREE.PointLight(0xffb84d, 1.85, 12.0);
  bdayCandleLight.position.set(0.0, 1.8, 1.6);
  rootGroups.birthday.add(bdayAmbient, bdayCandleLight);

  const cakeShaderMat = new THREE.ShaderMaterial({
    uniforms: bdayUniforms,
    vertexShader: `
      uniform float uBundtMorph;
      uniform float uSculptRelief;
      varying vec2 vUv;
      varying vec3 vLocalPos;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec4 vClipPos;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float r = length(pos.xz);
        float ang = atan(pos.z, pos.x);
        float ny = (pos.y + 0.55) / 1.1;

        // Morph between Cylinder Cake (02:17 / 02:22 / 02:26) and Tall Scalloped Bundt Dome (02:23-02:25)
        float scallop = 1.0 + 0.075 * cos(ang * 11.0) * smoothstep(0.15, 0.92, ny) * uSculptRelief;
        float glazeCapBulge = exp(-pow(ny - 0.68, 2.0) * 18.0) * 0.09 * uBundtMorph * uSculptRelief;
        float domeTaper = mix(1.0, 1.06 - 0.36 * pow(ny, 1.7) + glazeCapBulge, uBundtMorph);
        float heightStretch = mix(1.0, 1.36, uBundtMorph);

        // Organic hand-spatulated buttercream ridges around cylinder side wall
        float spatulaRidge = 0.022 * sin(ny * 22.0 + sin(ang * 4.0) * 1.5) * (1.0 - ny * 0.5) * (1.0 - uBundtMorph) * uSculptRelief;

        pos.x *= domeTaper * mix(1.0, scallop, uBundtMorph) + spatulaRidge * cos(ang);
        pos.z *= domeTaper * mix(1.0, scallop, uBundtMorph) + spatulaRidge * sin(ang);
        pos.y *= heightStretch;

        // Raised piped buttercream rim around top edge of cylinder cake
        float rimBump = exp(-pow(r - 1.08, 2.0) * 75.0) * smoothstep(0.82, 0.96, ny) * (1.0 - uBundtMorph) * uSculptRelief;
        pos.y += rimBump * (0.055 + 0.018 * sin(ang * 28.0));

        vLocalPos = pos;
        vNormal = normalize(normalMatrix * normalize(vec3(pos.x, pos.y * 0.45 + (ny > 0.88 ? 1.6 : 0.0), pos.z)));
        vec4 vp = modelViewMatrix * vec4(pos, 1.0);
        vViewPos = -vp.xyz;
        vClipPos = projectionMatrix * vp;
        gl_Position = vClipPos;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vLocalPos;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec4 vClipPos;
      uniform float uShotMode;
      uniform float uSculptRelief;
      uniform float uRadianceCalib;
      uniform float uStageProgress;
      uniform float uBundtMorph;
      uniform float uIcingDetail;
      uniform float uCutoutProgress;
      uniform float uCandleWind;
      uniform float uWireOverlay;
      uniform float uCameraOrbit;
      uniform float uFrostingShift;
      uniform sampler2D uTexF0;
      uniform sampler2D uTexF1;
      uniform sampler2D uTexF2;
      uniform sampler2D uTexF3;
      uniform sampler2D uTexF4;
      ${GLSL_NOISE}
      ${GLSL_MULTIFRAME_BDAY}
      void main() {
        float r = length(vLocalPos.xz);
        float ang = atan(vLocalPos.z, vLocalPos.x);
        float maxH = 0.55 * mix(1.0, 1.36, uBundtMorph);
        float ny = clamp((vLocalPos.y + maxH) / (2.0 * maxH), 0.0, 1.0);
        float isTop = smoothstep(0.84, 0.92, ny);
        float isBottom = step(ny, 0.08);

        vec2 topUv = vLocalPos.xz * 2.4;
        float swirl = fbm(topUv * 2.4 + vec2(cos(ang * 2.0), sin(ang * 2.0)) * 0.5);
        float sideSwirl = fbm(vec2(ang * 3.5, vLocalPos.y * 7.5));
        float spatulaWave = sin(ny * 22.0 + sin(ang * 4.0) * 1.5);

        vec3 N = normalize(vNormal + vec3((swirl - 0.5) * 0.24, (sideSwirl - 0.5 + spatulaWave * 0.35) * 0.28, 0.0) * max(0.35, uSculptRelief));
        vec3 L = normalize(vec3(0.2, 1.2, 1.4) - vLocalPos);
        vec3 V = normalize(vViewPos);
        vec3 H = normalize(L + V);

        float diff = max(0.0, dot(N, L) * 0.65 + 0.35);
        float verticalCandleFalloff = mix(smoothstep(-0.08, 0.92, ny), 1.0, isTop);
        float sideWallShadow = smoothstep(-0.25, 0.65, ny + 0.16 * (vLocalPos.x / 1.18));
        float sideShadow = (uShotMode < 2.5)
          ? mix(sideWallShadow, 1.0, isTop)
          : (0.38 + 0.62 * verticalCandleFalloff);

        float spec = pow(max(0.0, dot(N, H)), 24.0);

        vec3 deepUmber   = vec3(0.04, 0.018, 0.005);
        vec3 creamShadow = vec3(0.32, 0.18, 0.04);
        vec3 creamMid    = vec3(0.76, 0.54, 0.18);
        vec3 creamBright = vec3(0.96, 0.82, 0.42);

        // PROTOCOL II // CAKE BIRTHDAY COUNTERFACTUAL ("IMAGINE EACH COULD BE OTHERWISE"):
        // Shift buttercream palette to 2400K Dark Chocolate Ganache (+uFrostingShift) or 4600K Rose-Berry Glaze (-uFrostingShift)
        if (uFrostingShift > 0.15) {
          float gAmt = clamp(uFrostingShift, 0.0, 1.0);
          creamShadow = mix(creamShadow, vec3(0.07, 0.032, 0.014), gAmt);
          creamMid    = mix(creamMid,    vec3(0.22, 0.105, 0.045), gAmt);
          creamBright = mix(creamBright, vec3(0.45, 0.230, 0.100), gAmt);
        } else if (uFrostingShift < -0.15) {
          float rAmt = clamp(-uFrostingShift, 0.0, 1.0);
          creamShadow = mix(creamShadow, vec3(0.34, 0.09, 0.14), rAmt);
          creamMid    = mix(creamMid,    vec3(0.80, 0.34, 0.44), rAmt);
          creamBright = mix(creamBright, vec3(0.98, 0.68, 0.74), rAmt);
        }

        vec3 col = mix(creamShadow, creamMid, diff * (0.76 + 0.24 * sideSwirl));
        col = mix(col, creamBright, smoothstep(0.30, 0.92, diff) * (0.32 + 0.68 * isTop));
        col = mix(deepUmber, col, clamp(sideShadow, 0.04, 1.0));

        if (uBundtMorph > 0.20) {
          float dripWave = 0.44 + 0.065 * cos(ang * 11.0);
          float inGlazeCap = smoothstep(dripWave - 0.035, dripWave + 0.035, ny);
          float rightBounce = smoothstep(-0.6, 0.8, vLocalPos.x);
          vec3 glazeCol = mix(vec3(0.28, 0.18, 0.06), vec3(0.92, 0.80, 0.48), diff * (0.45 + 0.55 * rightBounce));
          vec3 spongeBase = mix(vec3(0.06, 0.025, 0.008), vec3(0.38, 0.21, 0.06), diff * (0.35 + 0.65 * rightBounce));
          col = mix(col, mix(spongeBase, glazeCol, inGlazeCap), uBundtMorph);
        }

        if (isBottom > 0.5 && uBundtMorph > 0.25) {
          col = vec3(0.028, 0.012, 0.004);
        }

        float rimDist = abs(r - 1.04);
        if (isTop > 0.3 && rimDist < 0.18 && uBundtMorph < 0.45) {
          float crumb = vnoise(topUv * 18.0);
          col = mix(col, vec3(0.58, 0.42, 0.14), crumb * 0.48);
        }

        float specBoost = (uFrostingShift > 0.15) ? 0.44 : 0.20;
        col += vec3(0.98, 0.88, 0.58) * spec * specBoost * sideShadow;

        // Smoothly blend between the rich shaded 3D s2 cake model (when L1 is in 3D sculpt range < 0.88, orbiting, or Counterfactual)
        // and the camera-projected multi-keyframe photographic radiance!
        if (uShotMode < 3.5) {
          vec2 screenUv = clamp(vClipPos.xy / vClipPos.w * 0.5 + 0.5, 0.0, 1.0);
          vec3 photoRad = sampleMultiFrameBday(screenUv);
          float orbitFade = clamp(1.0 - uCameraOrbit * 2.5, 0.0, 1.0);
          float counterFactFade = clamp(1.0 - abs(uFrostingShift) * 1.25 - (uShotMode > 2.5 ? uBundtMorph * 1.25 : 0.0), 0.0, 1.0);
          float photoTransfer = uRadianceCalib * smoothstep(0.68, 0.94, uSculptRelief) * orbitFade * counterFactFade;
          col = mix(col, photoRad, photoTransfer);
        }

        // Physical candle-extinguish relighting when candles are blown out
        if (uCandleWind > 0.52) {
          float extK = clamp((uCandleWind - 0.52) / 0.45, 0.0, 1.0);
          float cLum = dot(col, vec3(0.299, 0.587, 0.114));
          vec3 coolCake = vec3(0.075, 0.095, 0.135) * pow(cLum, 0.88) + col * 0.11;
          col = mix(col, coolCake, extK * 0.88);
        }

        // Delicate holographic contour wireframe overlay only when LAYER mode (uWireOverlay) is active
        float wireMix = uWireOverlay;
        if (wireMix > 0.01) {
          float wGrid = step(0.91, fract(vUv.x * 32.0)) + step(0.91, fract(vUv.y * 16.0));
          col += vec3(0.45, 0.92, 0.82) * clamp(wGrid, 0.0, 1.0) * wireMix * 0.36;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const cakeGeom = new THREE.CylinderGeometry(1.18, 1.18, 1.1, 96, 36);
  const cakeMesh = new THREE.Mesh(cakeGeom, cakeShaderMat);
  cakeGroup.add(cakeMesh);

  // Dark Chocolate Studs embedded into Cake Sides & Bundt Glaze Cap
  const studsGroup = new THREE.Group();
  cakeGroup.add(studsGroup);
  const chocMat = new THREE.MeshStandardMaterial({ color: 0x160903, roughness: 0.38, metalness: 0.08 });
  const studGeom = new THREE.SphereGeometry(0.044, 14, 10);
  studGeom.scale(1.0, 0.85, 0.48);
  const sideStuds = [];
  for (let row = 0; row < 3; row++) {
    const count = 11;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + row * 0.31;
      const y = -0.30 + row * 0.30;
      const stud = new THREE.Mesh(studGeom, chocMat);
      stud.userData = { ang, row, baseY: y };
      studsGroup.add(stud);
      sideStuds.push(stud);
    }
  }

  // Colorful Candy Smarties on top for 02:17-02:19 (shaded 3D StandardMaterial)
  const topSmartiesGroup = new THREE.Group();
  cakeGroup.add(topSmartiesGroup);
  const smartieGeom = new THREE.CylinderGeometry(0.062, 0.062, 0.026, 16);
  const smartieColors = [0xb82818, 0x204e9e, 0xd48e1c, 0x2c7430, 0x381808];
  for (let i = 0; i < 24; i++) {
    const rad = 0.18 + ((i * 37) % 100) / 100 * 0.78;
    const ang = i * 1.65;
    const smMat = new THREE.MeshStandardMaterial({
      color: smartieColors[i % smartieColors.length],
      roughness: 0.32,
      metalness: 0.06
    });
    const sm = new THREE.Mesh(smartieGeom, smMat);
    sm.position.set(Math.cos(ang) * rad, 0.0, Math.sin(ang) * rad);
    topSmartiesGroup.add(sm);
  }

  // Piped Red Icing Calligraphy (生日快樂) on top of Cake (02:26 - 02:28)
  const redIcingGroup = new THREE.Group();
  redIcingGroup.position.set(0, 0.565, 0.28);
  cakeGroup.add(redIcingGroup);

  const redIcingMat = new THREE.MeshStandardMaterial({ color: 0x7a120a, roughness: 0.22, metalness: 0.05 });
  const icingStrokeMeshes = [];
  const icingStrokeTips = [];
  function addIcingStroke(pts2d) {
    const pts3d = pts2d.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(pts3d);
    const geom = new THREE.TubeGeometry(curve, 16, 0.025, 8, false);
    const mesh = new THREE.Mesh(geom, redIcingMat);
    redIcingGroup.add(mesh);
    icingStrokeMeshes.push(mesh);
    icingStrokeTips.push(pts3d[pts3d.length - 1].clone());
  }
  addIcingStroke([[-0.56, -0.14], [-0.62, 0.04]]);
  addIcingStroke([[-0.58, -0.05], [-0.36, -0.06]]);
  addIcingStroke([[-0.47, -0.18], [-0.47, 0.16]]);
  addIcingStroke([[-0.56, 0.05], [-0.38, 0.04]]);
  addIcingStroke([[-0.60, 0.16], [-0.34, 0.15]]);
  addIcingStroke([[-0.22, -0.14], [-0.22, 0.15], [-0.04, 0.15], [-0.04, -0.14], [-0.22, -0.14]]);
  addIcingStroke([[-0.21, 0.01], [-0.05, 0.01]]);
  addIcingStroke([[0.10, -0.15], [0.10, 0.16]]);
  addIcingStroke([[0.18, -0.05], [0.34, -0.06], [0.32, 0.04]]);
  addIcingStroke([[0.15, 0.04], [0.38, 0.03]]);
  addIcingStroke([[0.25, -0.16], [0.23, 0.04], [0.15, 0.16]]);
  addIcingStroke([[0.24, 0.03], [0.36, 0.16]]);
  addIcingStroke([[0.48, -0.12], [0.66, -0.12]]);
  addIcingStroke([[0.57, -0.16], [0.57, 0.16]]);
  addIcingStroke([[0.46, 0.02], [0.68, 0.01]]);
  addIcingStroke([[0.54, 0.03], [0.45, 0.15]]);
  addIcingStroke([[0.60, 0.03], [0.69, 0.15]]);
  // Underline zig-zag flourish (sec_148 / ref_0226_icing)
  addIcingStroke([[-0.42, 0.24], [0.48, 0.21], [-0.18, 0.30], [0.56, 0.28]]);

  // 12 Striped Birthday Candles + Dynamic Flickering Flames (0..6 canonical 7 wicks, 7..11 extended crown for 1..12 custom birthday cakes)
  const candlesGroup = new THREE.Group();
  cakeGroup.add(candlesGroup);
  const candleObjs = [];
  const candleSpecs = [
    { x: -0.58, z: -0.12, h: 0.46, tiltX: -0.08, tiltZ:  0.12, stripeCol: new THREE.Color(0xd83224) },
    { x: -0.44, z: -0.48, h: 0.48, tiltX: -0.12, tiltZ:  0.06, stripeCol: new THREE.Color(0xe8c848) },
    { x: -0.26, z: -0.22, h: 0.45, tiltX:  0.04, tiltZ:  0.08, stripeCol: new THREE.Color(0xd83224) },
    { x: -0.06, z: -0.52, h: 0.47, tiltX: -0.04, tiltZ:  0.02, stripeCol: new THREE.Color(0x2858b8) },
    { x:  0.06, z: -0.18, h: 0.44, tiltX:  0.06, tiltZ: -0.04, stripeCol: new THREE.Color(0xe8c848) },
    { x:  0.34, z: -0.42, h: 0.48, tiltX: -0.06, tiltZ: -0.10, stripeCol: new THREE.Color(0xd83224) },
    { x:  0.66, z: -0.16, h: 0.46, tiltX:  0.08, tiltZ: -0.14, stripeCol: new THREE.Color(0xe8c848) },
    { x: -0.64, z:  0.22, h: 0.45, tiltX:  0.05, tiltZ:  0.10, stripeCol: new THREE.Color(0x2858b8) },
    { x: -0.32, z:  0.36, h: 0.47, tiltX:  0.07, tiltZ:  0.04, stripeCol: new THREE.Color(0xd83224) },
    { x:  0.02, z:  0.40, h: 0.46, tiltX:  0.08, tiltZ: -0.02, stripeCol: new THREE.Color(0xe8c848) },
    { x:  0.36, z:  0.34, h: 0.47, tiltX:  0.06, tiltZ: -0.07, stripeCol: new THREE.Color(0x2858b8) },
    { x:  0.62, z:  0.18, h: 0.45, tiltX:  0.04, tiltZ: -0.11, stripeCol: new THREE.Color(0xd83224) }
  ];

  candleSpecs.forEach((spec, idx) => {
    const holder = new THREE.Group();
    const waxMat = new THREE.ShaderMaterial({
      uniforms: { uStripeCol: { value: spec.stripeCol } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uStripeCol;
        void main() {
          float stripe = step(0.5, fract(vUv.x * 2.0 + vUv.y * 5.0));
          vec3 cream = vec3(0.96, 0.91, 0.80);
          vec3 col = mix(cream, uStripeCol, stripe * 0.85);
          col += vec3(0.95, 0.55, 0.15) * smoothstep(0.65, 1.0, vUv.y) * 0.65;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, spec.h, 16), waxMat);
    body.position.y = spec.h * 0.5;
    holder.add(body);

    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.05, 8),
      new THREE.MeshBasicMaterial({ color: 0x1a120a })
    );
    wick.position.y = spec.h + 0.025;
    holder.add(wick);

    const flameGeom = new THREE.SphereGeometry(0.042, 16, 16);
    flameGeom.scale(0.68, 2.35, 0.68);
    const flameMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float core = smoothstep(0.0, 0.6, 1.0 - abs(vUv.x - 0.5) * 2.0);
          vec3 col = mix(vec3(1.0, 0.45, 0.08), vec3(1.0, 0.98, 0.85), core);
          float alpha = sin(vUv.y * 3.14159) * 0.95;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    const flame = new THREE.Mesh(flameGeom, flameMat);
    flame.position.y = spec.h + 0.11;
    holder.add(flame);

    const haloGeom = new THREE.SphereGeometry(0.16, 16, 12);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 vp = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -vp.xyz;
          gl_Position = projectionMatrix * vp;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          float falloff = pow(max(0.0, dot(normalize(vNormal), normalize(vViewPos))), 2.6);
          gl_FragColor = vec4(1.0, 0.68, 0.22, falloff * 0.42);
        }
      `
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.position.y = spec.h + 0.11;
    holder.add(halo);

    candlesGroup.add(holder);
    candleObjs.push({ holder, flame, halo, spec, idx });
  });

  // ==========================================================================
  // WARM GOLDEN-LIT HEXAGONAL TABLETOP & CAKE PLATE (02:33 - 02:38)
  // ==========================================================================
  const hexTableGroup = new THREE.Group();
  rootGroups.birthday.add(hexTableGroup);

  const hexTableMat = new THREE.ShaderMaterial({
    uniforms: bdayUniforms,
    vertexShader: `
      varying vec3 vLocalPos;
      varying vec3 vNormal;
      varying vec4 vClipPos;
      void main() {
        vLocalPos = position;
        vNormal = normalize(normalMatrix * normal);
        vClipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = vClipPos;
      }
    `,
    fragmentShader: `
      varying vec3 vLocalPos;
      varying vec3 vNormal;
      varying vec4 vClipPos;
      uniform float uShotMode;
      uniform float uStageProgress;
      uniform float uBundtMorph;
      uniform float uIcingDetail;
      uniform float uCutoutProgress;
      uniform float uCandleWind;
      uniform float uRadianceCalib;
      uniform float uSculptRelief;
      uniform float uWireOverlay;
      uniform float uCameraOrbit;
      uniform sampler2D uTexF0;
      uniform sampler2D uTexF1;
      uniform sampler2D uTexF2;
      uniform sampler2D uTexF3;
      uniform sampler2D uTexF4;
      ${GLSL_MULTIFRAME_BDAY}
      void main() {
        float dist = length(vLocalPos.xz * vec2(0.92, 1.08));
        vec3 centerGold = vec3(0.98, 0.78, 0.34);
        vec3 midAmber   = vec3(0.82, 0.52, 0.14);
        vec3 edgeBrown  = vec3(0.24, 0.12, 0.02);
        vec3 col = mix(centerGold, midAmber, smoothstep(0.35, 1.85, dist));
        col = mix(col, edgeBrown, smoothstep(1.65, 2.75, dist));
        float plateShadow = exp(-pow(dist - 0.62, 2.0) * 85.0) * 0.52 + step(dist, 0.62) * 0.32;
        col *= (1.0 - plateShadow);
        if (vNormal.y < 0.5) col *= 0.16;

        vec2 screenUv = clamp(vClipPos.xy / vClipPos.w * 0.5 + 0.5, 0.0, 1.0);
        vec3 photoTable = sampleMultiFrameBday(screenUv);
        float photoTransfer = uRadianceCalib * smoothstep(0.68, 0.94, uSculptRelief) * clamp(1.0 - uCameraOrbit * 2.5, 0.0, 1.0);
        col = mix(col, photoTable, photoTransfer);

        if (uCandleWind > 0.52) {
          float extK = clamp((uCandleWind - 0.52) / 0.45, 0.0, 1.0);
          float tLum = dot(col, vec3(0.299, 0.587, 0.114));
          vec3 coolTable = vec3(0.07, 0.09, 0.13) * pow(tLum, 0.88) + col * 0.10;
          col = mix(col, coolTable, extK * 0.88);
        }

        float wireMix = uWireOverlay;
        if (wireMix > 0.01) {
          float wGrid = step(0.92, fract(vLocalPos.x * 6.5)) + step(0.92, fract(vLocalPos.z * 6.5));
          col += vec3(0.45, 0.92, 0.82) * clamp(wGrid, 0.0, 1.0) * wireMix * 0.34;
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const hexTopGeom = new THREE.CylinderGeometry(2.75, 2.75, 0.055, 6);
  hexTopGeom.rotateY(Math.PI / 6);
  const hexTopMesh = new THREE.Mesh(hexTopGeom, hexTableMat);
  hexTableGroup.add(hexTopMesh);

  const platterMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.60, 0.028, 48),
    new THREE.MeshStandardMaterial({ color: 0x2c1c0c, roughness: 0.28, metalness: 0.55 })
  );
  platterMesh.position.y = 0.035;
  hexTableGroup.add(platterMesh);

  // ==========================================================================
  // 5. ACT III: CARVED WOODEN HORSE [6 · 10 · 21] & OPTICAL READER (04:42)
  // ==========================================================================
  const horseAmbient = new THREE.AmbientLight(0x3a2e22, 0.85);
  const horseKeyLight = new THREE.DirectionalLight(0xffb868, 1.85);
  horseKeyLight.position.set(2.2, 3.2, 2.8);
  const horseCyanRim = new THREE.PointLight(0x38d9c0, 1.6, 10.0);
  horseCyanRim.position.set(-2.2, 0.8, -1.5);
  rootGroups.horse.add(horseAmbient, horseKeyLight, horseCyanRim);

  const bgHorseMat = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uReaderTex:   { value: filmTextures.reader },
      uSnowTex:     { value: filmTextures.snow },
      uShowSnow:    { value: 0.0 },
      uDimBackdrop: { value: 0.0 },
      uSamTex:      { value: filmTextures.sam_horsecarve },
      uDepthTex:    { value: filmTextures.depth_horsecarve },
      uObjSolid:    { value: new THREE.Vector4(1, 1, 1, 1) },
      uObjFocus:    { value: new THREE.Vector4(0.85, 0.85, 0.85, 0.85) },
      uObjMorph:    { value: new THREE.Vector4(0.8, 0.8, 0.8, 0.8) },
      uObjLuma:     { value: new THREE.Vector4(1, 1, 1, 1) },
      uObjTint:     { value: new THREE.Vector4(0, 0, 0, 0) },
      uObjOffsetX:  { value: new THREE.Vector4(0, 0, 0, 0) },
      uObjOffsetY:  { value: new THREE.Vector4(0, 0, 0, 0) },
      uObjVis:      { value: new THREE.Vector4(1, 1, 1, 1) },
      uCompMode:    { value: 0.0 },
      uSelectedIdx: { value: 0 },
      uHeadShift:   { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uReaderTex;
      uniform sampler2D uSnowTex;
      uniform float uShowSnow;
      uniform float uDimBackdrop;
      ${GLSL_NOISE}
      ${GLSL_SAM_PER_OBJECT}
      void main() {
        vec2 uv = vUv;
        vec3 readerCol = texture2D(uReaderTex, uv).rgb * mix(1.0, 0.62, uDimBackdrop);
        float furnaceGlow = exp(-length((uv - vec2(0.50, 0.24)) * vec2(1.4, 2.0)) * 3.2);
        readerCol += vec3(0.45, 0.22, 0.05) * furnaceGlow * 0.85 * uDimBackdrop;
        vec3 snowCol = texture2D(uSnowTex, uv).rgb;
        vec3 baseCol = mix(readerCol, snowCol, uShowSnow);
        vec3 col = applySamPerObject(baseCol, baseCol * 0.82, uv);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const bgHorseQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgHorseMat);
  bgHorseQuad.frustumCulled = false;
  bgHorseQuad.renderOrder = -10;
  rootGroups.horse.add(bgHorseQuad);

  const woodHorseGroup = new THREE.Group();
  woodHorseGroup.scale.setScalar(0.84);
  woodHorseGroup.position.set(0.0, -0.10, 0.0);
  rootGroups.horse.add(woodHorseGroup);

  const woodGrainMat = new THREE.ShaderMaterial({
    uniforms: {
      uSculptRelief: { value: 1.0 },
      uWireOverlay:  { value: 0.0 }
    },
    vertexShader: `
      varying vec3 vLocalPos;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform float uSculptRelief;
      void main() {
        // Knife-whittled planar facets carved into the 3D mesh as uSculptRelief increases
        vec3 whittledPos = mix(position, floor(position * 14.0 + 0.5) / 14.0, 0.28 * uSculptRelief);
        vLocalPos = whittledPos;
        vec3 facetNorm = normalize(normal + (floor(normal * 5.0 + 0.5) / 5.0 - normal) * 0.55 * uSculptRelief);
        vNormal = normalize(normalMatrix * facetNorm);
        vec4 vp = modelViewMatrix * vec4(whittledPos, 1.0);
        vViewPos = -vp.xyz;
        gl_Position = projectionMatrix * vp;
      }
    `,
    fragmentShader: `
      varying vec3 vLocalPos;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      uniform float uSculptRelief;
      uniform float uWireOverlay;
      ${GLSL_NOISE}
      void main() {
        float grain = fbm(vec2(vLocalPos.x * 8.5, vLocalPos.y * 22.0 + vLocalPos.z * 9.0));
        float whittleFacet = floor(vnoise(vLocalPos.xy * 6.5) * 5.0) / 5.0;
        vec3 N = normalize(vNormal + vec3(grain - 0.5, (whittleFacet - 0.5) * 0.6, 0.0) * 0.32 * uSculptRelief);
        vec3 L = normalize(vec3(0.55, 0.72, 0.45));
        vec3 V = normalize(vViewPos);
        vec3 H = normalize(L + V);
        float diff = max(0.0, dot(N, L) * 0.68 + 0.32);
        float rim = pow(1.0 - max(0.0, dot(N, V)), 2.8);
        float spec = pow(max(0.0, dot(N, H)), 28.0);
        vec3 darkChar = vec3(0.11, 0.06, 0.03);
        vec3 warmOak  = vec3(0.48, 0.29, 0.13);
        vec3 col = mix(darkChar, warmOak, diff * (0.68 + 0.32 * grain));
        col += vec3(0.75, 0.52, 0.28) * (spec * 0.38 + rim * 0.25);
        if (uWireOverlay > 0.01) {
          float wGrid = step(0.90, fract(vLocalPos.x * 12.0)) + step(0.90, fract(vLocalPos.y * 12.0));
          col = mix(col, vec3(0.95, 0.72, 0.38), clamp(wGrid, 0.0, 1.0) * uWireOverlay * 0.45);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const hBarrel = new THREE.Mesh(new THREE.SphereGeometry(0.50, 16, 12), woodGrainMat);
  hBarrel.scale.set(1.62, 0.85, 0.76);
  hBarrel.position.set(0.0, 0.22, 0);
  woodHorseGroup.add(hBarrel);

  const hChest = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 10), woodGrainMat);
  hChest.scale.set(1.05, 1.00, 0.80);
  hChest.position.set(0.56, 0.30, 0);
  woodHorseGroup.add(hChest);

  const hCroup = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 10), woodGrainMat);
  hCroup.scale.set(1.10, 0.94, 0.80);
  hCroup.position.set(-0.60, 0.26, 0);
  woodHorseGroup.add(hCroup);

  const hNeck = createSegmentedLimb([
    new THREE.Vector3(0.54, 0.38, 0),
    new THREE.Vector3(0.82, 0.78, 0),
    new THREE.Vector3(1.02, 1.14, 0)
  ], [0.34, 0.27, 0.20], woodGrainMat, 0.0);
  woodHorseGroup.add(hNeck);

  const hMane = createSegmentedLimb([
    new THREE.Vector3(0.38, 0.54, 0),
    new THREE.Vector3(0.68, 0.90, 0),
    new THREE.Vector3(0.94, 1.24, 0)
  ], [0.10, 0.12, 0.08], woodGrainMat, 0.0);
  woodHorseGroup.add(hMane);

  const hSkull = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), woodGrainMat);
  hSkull.scale.set(1.15, 0.88, 0.76);
  hSkull.position.set(1.08, 1.16, 0);
  woodHorseGroup.add(hSkull);

  const hSnout = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.19, 0.56, 9), woodGrainMat);
  hSnout.rotation.z = -1.96;
  hSnout.position.set(1.36, 1.05, 0);
  woodHorseGroup.add(hSnout);

  [-0.09, 0.09].forEach(ez => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), woodGrainMat);
    ear.position.set(1.00, 1.38, ez);
    ear.rotation.z = -0.22;
    woodHorseGroup.add(ear);
  });

  const hTail = createSegmentedLimb([
    new THREE.Vector3(-0.95, 0.34, 0),
    new THREE.Vector3(-1.22, 0.06, 0),
    new THREE.Vector3(-1.32, -0.45, 0)
  ], [0.11, 0.13, 0.06], woodGrainMat, 0.0);
  woodHorseGroup.add(hTail);

  [
    { x0:  0.62, z0: -0.22, xKnee:  0.68, xHoof:  0.72 },
    { x0:  0.54, z0:  0.22, xKnee:  0.52, xHoof:  0.48 },
    { x0: -0.62, z0: -0.22, xKnee: -0.72, xHoof: -0.66 },
    { x0: -0.54, z0:  0.22, xKnee: -0.60, xHoof: -0.54 }
  ].forEach(ls => {
    const legMesh = createSegmentedLimb([
      new THREE.Vector3(ls.x0, 0.08, ls.z0),
      new THREE.Vector3(ls.xKnee, -0.52, ls.z0),
      new THREE.Vector3(ls.xHoof, -1.12, ls.z0)
    ], [0.15, 0.11, 0.09], woodGrainMat, 0.0);
    woodHorseGroup.add(legMesh);
  });

  const hBase = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.16, 0.82), woodGrainMat);
  hBase.position.set(0.04, -1.18, 0);
  woodHorseGroup.add(hBase);

  // ==========================================================================
  // DIEGETIC 3D-PROJECTED RADIAL C-ARC MENU, SUB-OBJECT NODE SELECTOR ([ □ ]),
  // AND SURGICAL 3D ACTIVE TOOL LOCUS RETICLES (2D HOLOGRAM OVERLAY CANVAS)
  // ==========================================================================
  let activeOverlayHitboxes = [];

  const SCENE_OPERATIVE_GRAPH = {
    bugeye: [
      { id: 'OCULUS.DX', label: 'OCULUS.DX [HEX_165]', uv: [0.732, 0.435], ringIdx: 1 },
      { id: 'SETAE.180', label: 'SETAE.FOLLICLES [180]', uv: [0.680, 0.620], ringIdx: 2 },
      { id: 'OCULUS.SN', label: 'OCULUS.SN [RACK_35]', uv: [0.435, 0.445], ringIdx: 1 },
      { id: 'LABRUM.RIG', label: 'MANDIBLE.RIG [ARTIC]', uv: [0.565, 0.740], ringIdx: 3 }
    ],
    leaf: [
      { id: 'SCARAB.RIG', label: 'SCARAB.RIG [GAIT_28]', uv: [0.495, 0.485], ringIdx: 3 },
      { id: 'LAMINA.3D',  label: 'LAMINA.VEINS [RELIEF]', uv: [0.550, 0.360], ringIdx: 0 },
      { id: 'MENISCUS',   label: 'MENISCUS.FILM [WET]', uv: [0.420, 0.620], ringIdx: 1 }
    ],
    canopy: [
      { id: 'CANOPY.VOX', label: 'CANOPY.VOXELS [RELIEF]', uv: [0.480, 0.340], ringIdx: 0 },
      { id: 'GODRAYS',    label: 'GODRAYS.VOL [SCATTER]', uv: [0.510, 0.240], ringIdx: 1 },
      { id: 'DOME.GRID',  label: 'DOME.ACCORDION [UNWEAVE]', uv: [0.420, 0.560], ringIdx: 4 }
    ],
    clearing: [
      { id: 'DOME.GRID',  label: 'DOME.ACCORDION [UNWEAVE]', uv: [0.420, 0.560], ringIdx: 4 },
      { id: 'CANOPY.VOX', label: 'CANOPY.VOXELS [RELIEF]', uv: [0.480, 0.340], ringIdx: 0 },
      { id: 'GODRAYS',    label: 'GODRAYS.VOL [SCATTER]', uv: [0.510, 0.240], ringIdx: 1 }
    ],
    cakespawn: [
      { id: 'SPONGE.CYL', label: 'SPONGE.CYL [EXTRUDE]', uv: [0.335, 0.525], ringIdx: 0 },
      { id: 'WICK.07',    label: 'WICK.ARRAY [03->07_LIT]', uv: [0.335, 0.455], ringIdx: 1 },
      { id: 'SMARTIES',   label: 'CONFECT.DISCS [POP->CLR]', uv: [0.355, 0.505], ringIdx: 3 }
    ],
    bundtmorph: [
      { id: 'BUNDT.11',   label: 'BUNDT.SCALLOP [11_FLUTE]', uv: [0.245, 0.545], ringIdx: 2 },
      { id: 'GLAZE.CAP',  label: 'GLAZE.CAP [DRIP_WAVE]', uv: [0.255, 0.485], ringIdx: 0 },
      { id: 'WICK.CREST', label: 'WICK.CREST [07->01->02]', uv: [0.245, 0.440], ringIdx: 1 }
    ],
    redicing: [
      { id: 'HANZI.PIPE', label: 'HANZI.PIPE [生日快樂]', uv: [0.335, 0.565], ringIdx: 2 },
      { id: 'CRUMB.RIM',  label: 'CRUMB.RUFFLE [TORUS]', uv: [0.385, 0.525], ringIdx: 0 },
      { id: 'WICK.3200K', label: 'WICK.RADIANCE [3200K]', uv: [0.335, 0.440], ringIdx: 1 }
    ],
    cutouts: [
      { id: 'CUTOUT.01',  label: 'CUTOUT.01 [LEFT_GIRL]', uv: [0.265, 0.480], ringIdx: 3 },
      { id: 'CUTOUT.02',  label: 'CUTOUT.02 [CENTER_GIRL]', uv: [0.555, 0.450], ringIdx: 3 },
      { id: 'CUTOUT.03',  label: 'CUTOUT.03_04 [PARTY_6]', uv: [0.410, 0.480], ringIdx: 3 },
      { id: 'HEX.TABLE',  label: 'HEX.TABLE [PLATTER_3D]', uv: [0.495, 0.720], ringIdx: 0 }
    ],
    blowcandles: [
      { id: 'FLAME.WIND', label: 'FLAME.VORTEX [EXHALE]', uv: [0.495, 0.760], ringIdx: 4 },
      { id: 'PARTY.RING', label: 'PARTY.CIRCLE [6_NODES]', uv: [0.495, 0.460], ringIdx: 3 }
    ],
    miniature: [
      { id: 'MINI.STAGE', label: 'MINI.DIORAMA [0.08X]', uv: [0.520, 0.740], ringIdx: 4 },
      { id: 'DOME.SHELL', label: 'DOME.SHELL [HORIZON]', uv: [0.480, 0.450], ringIdx: 0 }
    ],
    horsecarve: [
      { id: 'EQUUS.HULL', label: 'EQUUS.HULL [WHITTLE]', uv: [0.495, 0.520], ringIdx: 0 },
      { id: 'INSC.61021', label: 'BASE.INSC [6·10·21]', uv: [0.495, 0.740], ringIdx: 2 },
      { id: 'FURNACE',    label: 'FURNACE.RIM [3200K]', uv: [0.520, 0.620], ringIdx: 1 }
    ]
  };
  window.SCENE_OPERATIVE_GRAPH = SCENE_OPERATIVE_GRAPH;

  function projectTo2D(vec3World, w, h) {
    const v = vec3World.clone().project(camera);
    if (v.z > 1.0) return null;
    return {
      x: (v.x * 0.5 + 0.5) * w,
      y: (-v.y * 0.5 + 0.5) * h
    };
  }

  // Draws the Left-Arc 8-Element Diegetic Sub-Assembly Stack ([1/8]..[8/8]) + Active SAM Polygon Boundary Contour
  function drawSubObjectNodeStack(ctx, w, h, shot, state, drawVisual, headShift = 0.0) {
    const asmNodes = (typeof window.getActiveAssemblyNodes === 'function')
      ? window.getActiveAssemblyNodes(shot)
      : (SCENE_OPERATIVE_GRAPH[shot] || SCENE_OPERATIVE_GRAPH.bugeye);
    const samList = (window.STELLINE_SAM_DATA && window.STELLINE_SAM_DATA[shot])
      ? window.STELLINE_SAM_DATA[shot]
      : [];
    const totalNodes = asmNodes.length;
    const selIdx = (state.selectedNodeIdx || 0) % totalNodes;
    const arcR  = Math.min(w, h) * 0.36;
    const arcCx = Math.max(arcR + 16, w * 0.165);
    const arcCy = h * 0.49;

    if (drawVisual) {
      ctx.save();
      ctx.strokeStyle = 'rgba(210, 228, 224, 0.24)';
      ctx.lineWidth = 0.85;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(arcCx, arcCy, arcR, Math.PI * 0.76, Math.PI * 1.24);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    asmNodes.forEach((asmNode, idx) => {
      const samNode = (idx < samList.length) ? samList[idx] : null;
      const offset = (idx - (totalNodes - 1) * 0.5) * 0.064;
      const ang = Math.PI + offset;
      const bx = arcCx + Math.cos(ang) * arcR;
      const by = arcCy + Math.sin(ang) * arcR;
      const isSel = (idx === selIdx);

      // Compute head-shift-compensated centroid + live D-Pad part offset (dx, dy)
      const partTf = (state.objectTransforms && state.objectTransforms[shot] && state.objectTransforms[shot][idx])
        ? state.objectTransforms[shot][idx]
        : { dx: 0, dy: 0, visible: true };
      const shiftU = ((shot === 'bugeye' && (idx === 0 || idx === 1)) ? (-0.068 * headShift) : 0.0) + (partTf.dx || 0);
      const shiftV = ((shot === 'bugeye' && (idx === 0 || idx === 1)) ? ( 0.024 * headShift) : 0.0) + (partTf.dy || 0);
      const rawUv = (asmNode.uvByShot && (asmNode.uvByShot[shot] || asmNode.uvByShot.default))
        || (samNode && samNode.cx !== undefined ? [samNode.cx, samNode.cy] : (asmNode.uv || [0.5, 0.5]));
      const cxU = rawUv[0] + shiftU;
      const cyV = rawUv[1] + shiftV;

      if (drawVisual) {
        ctx.save();
        const sz = isSel ? 6.5 : 4.5;
        ctx.strokeStyle = isSel ? 'rgba(56, 217, 192, 0.96)' : (partTf.visible === false ? 'rgba(255, 110, 96, 0.55)' : 'rgba(195, 214, 210, 0.48)');
        ctx.lineWidth = isSel ? 1.25 : 0.85;
        ctx.strokeRect(bx - sz * 0.5, by - sz * 0.5, sz, sz);
        if (isSel) {
          ctx.fillStyle = 'rgba(56, 217, 192, 0.34)';
          ctx.fillRect(bx - sz * 0.5, by - sz * 0.5, sz, sz);
          const br = 8.0;
          const tk = 3.0;
          ctx.strokeStyle = 'rgba(245, 252, 250, 0.92)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(bx - br, by - br + tk); ctx.lineTo(bx - br, by - br); ctx.lineTo(bx - br + tk, by - br);
          ctx.moveTo(bx - br, by + br - tk); ctx.lineTo(bx - br, by + br); ctx.lineTo(bx - br + tk, by + br);
          ctx.moveTo(bx + br - tk, by - br); ctx.lineTo(bx + br, by - br); ctx.lineTo(bx + br, by - br + tk);
          ctx.moveTo(bx + br - tk, by + br); ctx.lineTo(bx + br, by + br); ctx.lineTo(bx + br, by + br - tk);
          ctx.stroke();

          ctx.font = '7.5px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(240, 252, 250, 0.95)';
          const visTag = (partTf.visible === false) ? ' [HIDDEN]' : '';
          ctx.fillText(`[${idx + 1}/${totalNodes}] ${asmNode.id}${visTag}`, bx + 13, by + 2.5);

          const tx = cxU * w;
          const ty = cyV * h;
          ctx.strokeStyle = 'rgba(56, 217, 192, 0.30)';
          ctx.lineWidth = 0.8;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(bx + 12, by + 4);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw subtle surgical target crosshair at the selected element's 3D locus
          ctx.strokeStyle = 'rgba(56, 217, 192, 0.62)';
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.arc(tx, ty, 5.5, 0, Math.PI * 2);
          ctx.moveTo(tx - 9, ty); ctx.lineTo(tx - 3, ty);
          ctx.moveTo(tx + 3, ty); ctx.lineTo(tx + 9, ty);
          ctx.moveTo(tx, ty - 9); ctx.lineTo(tx, ty - 3);
          ctx.moveTo(tx, ty + 3); ctx.lineTo(tx, ty + 9);
          ctx.stroke();

          // Draw SAM Polygon Boundary Contour in LAYER (xray), SAM SEGMENTS, or SOLO PART mode, or when D-Pad moves a part
          const movedPart = Math.abs(partTf.dx || 0) + Math.abs(partTf.dy || 0) > 0.002;
          const showContour = (state.renderMode === 'xray') || (state.compositeMode === 'segments') || (state.compositeMode === 'isolate') || movedPart;
          if (showContour && samNode && Array.isArray(samNode.contour) && samNode.contour.length > 2) {
            ctx.strokeStyle = 'rgba(56, 217, 192, 0.65)';
            ctx.lineWidth = 1.05;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            samNode.contour.forEach(([cu, cv], cIdx) => {
              const px = (cu + shiftU) * w;
              const py = (cv + shiftV) * h;
              if (cIdx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else {
          ctx.font = '6.5px "JetBrains Mono", monospace';
          ctx.fillStyle = (partTf.visible === false) ? 'rgba(255, 110, 96, 0.55)' : 'rgba(185, 210, 206, 0.55)';
          ctx.fillText(`${idx + 1}:${asmNode.id || ''}`, bx + 10, by + 2);
        }
        ctx.restore();
      }

      // Click hitbox on the left-arc [ □ ] node button
      activeOverlayHitboxes.push({
        x: bx - 14,
        y: by - 10,
        w: 118,
        h: 20,
        onClick: () => {
          if (typeof window.selectSceneObject === 'function') {
            window.selectSceneObject(idx);
          }
        }
      });

      // Click hitbox directly on the element's locus in the 3D scene
      const tx = cxU * w;
      const ty = cyV * h;
      activeOverlayHitboxes.push({
        x: tx - 30,
        y: ty - 26,
        w: 60,
        h: 52,
        isObjectBox: true,
        onClick: () => {
          if (typeof window.selectSceneObject === 'function') {
            window.selectSceneObject(idx);
          }
        }
      });
    });

    if (drawVisual) ctx.restore();
  }

  // Draws the Film's Translucent White C-Arc Menu (`arch`) where all 5 Sectors
  // Graph the 5 Coaxial Orb Dials (Element-Specific L1..R2)
  // for the Currently Selected Anatomical / Scene Element ([1/8]..[8/8])!
  function drawFilmRadialArcMenu(ctx, cx, cy, radius, openLeft, showTelemetry, activeSector, opLabel, drawVisual = true, ringNorms = [0.8, 0.8, 0.6, 0.5, 0.3], selNodeInfo = null) {
    const st = window.state;
    const pKey = (st && st.scene === 'birthday') ? 'cake' : 'bug';
    const pDef = (window.OPERATOR_PROTOCOLS && window.OPERATOR_PROTOCOLS[pKey]) ? window.OPERATOR_PROTOCOLS[pKey] : null;
    const dialNames = (selNodeInfo && Array.isArray(selNodeInfo.dials) && selNodeInfo.dials.length === 5)
      ? selNodeInfo.dials
      : ((pDef && pDef.dialLabels) ? pDef.dialLabels : ['L1:SOLID', 'L2:FOCUS', 'L3:MORPH', 'R1:LUMA', 'R2:TINT']);
    const startA = Math.PI * 0.58;
    const endA   = Math.PI * 1.42;
    const numSectors = 5;
    const span = (endA - startA) / numSectors;

    if (drawVisual) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(openLeft ? -0.78 : 0.78, 1.0);

      // Subtle inner optical field wedge
      ctx.fillStyle = 'rgba(210, 226, 224, 0.07)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius * 0.94, startA + span * 0.2, endA - span * 0.2);
      ctx.closePath();
      ctx.fill();

      const baseThicknesses = [11, 14, 11, 14, 11];
      for (let s = 0; s < numSectors; s++) {
        const a0 = startA + s * span + 0.022;
        const a1 = startA + (s + 1) * span - 0.022;
        const isAct = (s === activeSector % numSectors);
        const rVal = Math.max(0.0, Math.min(1.0, ringNorms[s] !== undefined ? ringNorms[s] : 0.7));
        const thick = baseThicknesses[s] * (isAct ? 1.25 : 0.95);
        const rIn = radius - thick * 0.5;
        const rOut = radius + thick * 0.5;

        // 1. Background structural sector track (dim translucent white)
        ctx.fillStyle = isAct ? 'rgba(220, 238, 235, 0.22)' : 'rgba(185, 205, 202, 0.14)';
        ctx.beginPath();
        ctx.arc(0, 0, rOut, a0, a1);
        ctx.arc(0, 0, rIn, a1, a0, true);
        ctx.closePath();
        ctx.fill();

        // 2. Live Graphed Dial Fill proportional to rVal (0%..100%) within each sector!
        const aFill = a0 + (a1 - a0) * Math.max(0.08, rVal);
        const rOutFill = rIn + (rOut - rIn) * (0.45 + 0.55 * rVal);
        ctx.fillStyle = isAct
          ? 'rgba(245, 252, 250, 0.92)'
          : `rgba(215, 234, 230, ${(0.38 + 0.42 * rVal).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(0, 0, rOutFill, a0, aFill);
        ctx.arc(0, 0, rIn, aFill, a0, true);
        ctx.closePath();
        ctx.fill();
      }

      // Inner Vernier Track + Sliding Ring Value Needle
      ctx.strokeStyle = 'rgba(225, 240, 238, 0.58)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.74, startA - 0.06, endA + 0.06);
      ctx.stroke();

      const actIdx = activeSector % numSectors;
      const actNorm = Math.max(0, Math.min(1, ringNorms[actIdx] || 0.5));
      const wedgeAng = startA + (actIdx + actNorm) * span;
      ctx.fillStyle = 'rgba(56, 217, 192, 0.95)';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.79, wedgeAng - 0.042, wedgeAng + 0.042);
      ctx.arc(0, 0, radius * 0.67, wedgeAng + 0.042, wedgeAng - 0.042, true);
      ctx.closePath();
      ctx.fill();

      // 5 Leader Ticks extending from each of the 5 Dial Sectors
      for (let s = 0; s < numSectors; s++) {
        const midA = startA + (s + 0.5) * span;
        const r0 = radius + 6;
        const r1 = radius + 16;
        const x0 = Math.cos(midA) * r0, y0 = Math.sin(midA) * r0;
        const x1 = Math.cos(midA) * r1, y1 = Math.sin(midA) * r1;
        ctx.strokeStyle = (s === actIdx) ? 'rgba(56, 217, 192, 0.88)' : 'rgba(215, 232, 230, 0.42)';
        ctx.lineWidth = (s === actIdx) ? 1.15 : 0.85;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 - 10, y1);
        ctx.stroke();
      }

      ctx.restore();

      // Draw all 5 element-specific dial readouts along the C-Arc + 3-line telemetry block below C-Arc
      ctx.save();
      const actS = activeSector % numSectors;
      const dir = openLeft ? -0.78 : 0.78;
      for (let s = 0; s < numSectors; s++) {
        const midA = startA + (s + 0.5) * span;
        const lx = cx + Math.cos(midA) * (radius + 20) * dir;
        const ly = cy + Math.sin(midA) * (radius + 14) + 2.5;
        const pct = Math.round((ringNorms[s] || 0) * 100);
        const isAct = (s === actS);
        ctx.font = isAct ? '700 7px "JetBrains Mono", monospace' : '6px "JetBrains Mono", monospace';
        ctx.fillStyle = isAct ? 'rgba(56, 217, 192, 0.96)' : 'rgba(205, 226, 222, 0.52)';
        const txt = `${dialNames[s]} ${pct}%`;
        ctx.fillText(txt, openLeft ? lx + 4 : lx - ctx.measureText(txt).width - 4, ly);
      }

      if (showTelemetry && opLabel) {
        const tx = openLeft ? (cx - radius * 1.85) : (cx - radius * 0.95);
        const ty = cy + radius * 1.36;
        if (selNodeInfo && selNodeInfo.label) {
          ctx.font = '700 7px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(56, 217, 192, 0.88)';
          ctx.fillText(selNodeInfo.label, tx, ty - 10.5);
        }
        ctx.font = '7.5px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(215, 234, 232, 0.78)';
        ctx.fillText(opLabel[0] || '', tx, ty);
        ctx.fillText(opLabel[1] || '', tx, ty + 9.5);
        ctx.fillText(opLabel[2] || '', tx, ty + 19.0);

        // Diegetic Micro-Action Brackets directly below the C-Arc Telemetry Block
        const actY = ty + 31.0;
        const actionDefs = [
          {
            label: st && st.scene === 'birthday' ? '[INSCRIBE CAKE]' : '[TAXON INSCRIBE]',
            w: 78,
            fn: () => { if (typeof window.startHoloDirectTextEdit === 'function') window.startHoloDirectTextEdit(); }
          },
          {
            label: st && st.scene === 'birthday'
              ? ((st.customCake && st.customCake.blownOut) ? '[RELIGHT WICKS]' : '[BLOW CANDLES]')
              : ((st && st.customBug && st.customBug.wingUnfurl > 0.3) ? '[FOLD ELYTRA]' : '[UNFURL WINGS]'),
            w: 74,
            fn: () => {
              if (!st) return;
              if (st.scene === 'birthday') {
                st.customCake = st.customCake || { active: true, inscription: '生日快樂', candles: 7, glaze: 'vanilla', bundt: 0, smarties: false, blownOut: false };
                st.customCake.active = true;
                st.customCake.blownOut = !st.customCake.blownOut;
              } else {
                st.customBug = st.customBug || { active: true, taxon: 'Carabus stellinae', wavelengthNm: 520, hexDensity: 165, leftHexDensity: 165, setaeCount: 180, wingUnfurl: 0 };
                st.customBug.active = true;
                st.customBug.wingUnfurl = (st.customBug.wingUnfurl > 0.3) ? 0.0 : 0.92;
                if (st.activeShot !== 'leaf' && typeof window.selectFilmShot === 'function') {
                  window.selectFilmShot('leaf');
                }
                if (typeof window.selectSceneObject === 'function') window.selectSceneObject(2);
                if (typeof window.setRingAngle === 'function') {
                  window.setRingAngle(2, st.customBug.wingUnfurl > 0.3 ? 172 : 128, true);
                }
              }
            }
          },
          {
            label: '[IMPRINT .PNG]',
            w: 66,
            fn: () => { if (typeof window.exportMemoryCardPNG === 'function') window.exportMemoryCardPNG(); }
          }
        ];

        let ax = tx;
        actionDefs.forEach(aDef => {
          ctx.fillStyle = 'rgba(12, 24, 28, 0.65)';
          ctx.fillRect(ax - 2, actY - 7.5, aDef.w, 11);
          ctx.strokeStyle = 'rgba(56, 217, 192, 0.38)';
          ctx.lineWidth = 0.7;
          ctx.strokeRect(ax - 2, actY - 7.5, aDef.w, 11);
          ctx.font = '6.5px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(235, 248, 245, 0.88)';
          ctx.fillText(aDef.label, ax + 2, actY);
          activeOverlayHitboxes.push({
            x: ax - 2,
            y: actY - 9,
            w: aDef.w,
            h: 14,
            onClick: aDef.fn
          });
          ax += aDef.w + 5;
        });
      }
      ctx.restore();
    }

    // Inverse-Bootstrap: Clicking any of the 5 C-Arc sectors directly adjusts that Coaxial Orb Ring for the selected element!
    activeOverlayHitboxes.push({
      x: cx - radius * 1.45,
      y: cy - radius * 1.25,
      w: radius * 2.9,
      h: radius * 2.5,
      onClick: (state, clickY) => {
        const relSector = Math.max(0, Math.min(4, Math.floor(((clickY - (cy - radius)) / (radius * 2)) * 5)));
        if (typeof window.setRingAngle === 'function') {
          const cur = state.rings[relSector] ? state.rings[relSector].angle : 100;
          window.setRingAngle(relSector, ((cur + 28) % 205) + 15, true);
        }
      }
    });
  }

  // Surgical Optical Vernier Locus Ring (random-eyes right-arc style) for Macro Focus & Tool Tips
  function drawOpticalVernierLocus(ctx, cx, cy, r, focusVal, label, drawVisual = true) {
    if (!drawVisual) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 240, 236, 0.42)';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.32, Math.PI * 0.32);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.68, Math.PI * 1.32);
    ctx.stroke();
    ctx.setLineDash([]);

    const indAng = (-0.26 + focusVal * 0.52) * Math.PI;
    const ix = cx + Math.cos(indAng) * r;
    const iy = cy + Math.sin(indAng) * r;
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(indAng);
    ctx.fillStyle = 'rgba(245, 252, 250, 0.88)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (label) {
      ctx.font = '7.5px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(220, 240, 236, 0.65)';
      ctx.fillText(label, cx - r * 0.45, cy + r + 11);
    }
    ctx.restore();
  }

  function drawChildNodeOverlay(ctx, nx, ny, hx, hy, isSelected, idx, drawVisual = true, objDialVec = null) {
    if (drawVisual) {
      ctx.save();
      const rIn = 14.5;
      const rOut = 19.0;
      const startA = -Math.PI * 0.44;
      const endA = Math.PI * 0.44;
      const numSec = 5;
      const span = (endA - startA) / numSec;

      for (let s = 0; s < numSec; s++) {
        const a0 = startA + s * span + 0.03;
        const a1 = startA + (s + 1) * span - 0.03;
        const dVal = objDialVec ? (objDialVec[s] || 0.6) : 0.6;
        const aFill = a0 + (a1 - a0) * Math.max(0.15, dVal);
        ctx.fillStyle = isSelected ? 'rgba(56, 217, 192, 0.25)' : 'rgba(195, 214, 212, 0.20)';
        ctx.beginPath();
        ctx.arc(nx, ny, rOut, a0, a1);
        ctx.arc(nx, ny, rIn, a1, a0, true);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = isSelected ? 'rgba(245, 252, 250, 0.88)' : 'rgba(225, 240, 238, 0.65)';
        ctx.beginPath();
        ctx.arc(nx, ny, isSelected ? rOut + 1.0 : rOut, a0, aFill);
        ctx.arc(nx, ny, rIn, aFill, a0, true);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = isSelected ? 'rgba(56, 217, 192, 0.82)' : 'rgba(205, 220, 218, 0.45)';
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.arc(nx, ny, rIn * 0.80, -Math.PI * 0.48, Math.PI * 0.48);
      ctx.stroke();

      [-0.55, 0.0, 0.55].forEach(a => {
        const x0 = nx + Math.cos(a) * (rOut + 1.5);
        const y0 = ny + Math.sin(a) * (rOut + 1.5);
        const x1 = nx + Math.cos(a) * (rOut + 8.5);
        const y1 = ny + Math.sin(a) * (rOut + 8.5);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 + 6, y1);
        ctx.stroke();
      });

      const barX = nx - rOut - 11;
      const barTop = ny - rOut;
      for (let b = 0; b < 13; b++) {
        const bw = 7 + ((b * 5 + idx * 3) % 9);
        ctx.fillStyle = (b % 4 === 0) ? 'rgba(230, 242, 240, 0.62)' : 'rgba(180, 198, 196, 0.28)';
        ctx.fillRect(barX, barTop + b * 3.0, bw, 1.5);
      }

      const dirX = hx > nx ? 1 : -1;
      const lx0 = nx + dirX * (rIn * 0.4);
      const ly0 = ny + rOut + 6;
      const lx1 = lx0 + dirX * 14;
      const ly1 = ly0 + 14;
      ctx.strokeStyle = isSelected ? 'rgba(56, 217, 192, 0.85)' : 'rgba(235, 245, 242, 0.75)';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(lx0, ly0);
      ctx.lineTo(lx1, ly1);
      ctx.stroke();

      ctx.restore();
    }

    activeOverlayHitboxes.push({
      x: nx - 36,
      y: ny - 28,
      w: 72,
      h: 64,
      onClick: () => {
        if (typeof window.selectSceneObject === 'function') {
          window.selectSceneObject(idx);
        }
      }
    });
  }

  // ==========================================================================
  // INVERSE BOOTSTRAPPING: Direct 3D Scene Sculpting -> Physical Orb Rings!
  // ==========================================================================
  const holoOverlayCanvas = document.getElementById('hologramCanvas');
  let sceneSculptDrag = null;

  if (holoOverlayCanvas) {
    holoOverlayCanvas.addEventListener('pointerdown', e => {
      const rect = holoOverlayCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const u = x / Math.max(1, rect.width);
      const v = y / Math.max(1, rect.height);
      const st = window.state;
      if (!st) return;

      // 1. Check non-object UI Hitboxes (C-Arc Menu, Left-Arc [ □ ] buttons, Child Head Arcs) first
      for (const hb of activeOverlayHitboxes) {
        if (!hb.isObjectBox && x >= hb.x && x <= hb.x + hb.w && y >= hb.y && y <= hb.y + hb.h) {
          st.userHoldTimer = 3.5;
          hb.onClick(st, y);
          e.stopPropagation();
          return;
        }
      }

      // 2. Check SAM Object Bounding Boxes in the 3D scene to select that object AND start dragging its dials!
      for (const hb of activeOverlayHitboxes) {
        if (hb.isObjectBox && x >= hb.x && x <= hb.x + hb.w && y >= hb.y && y <= hb.y + hb.h) {
          st.userHoldTimer = 3.5;
          hb.onClick(st, y);
          break;
        }
      }

      // 3. Inverse-Bootstrap Direct 3D Feature Sculpting Drag:
      if (!e.shiftKey && !e.altKey) {
        st.userHoldTimer = 3.5;
        if (st.scene === 'beetle' && st.activeShot === 'bugeye') {
          if (u >= 0.58 && u <= 0.86 && v >= 0.16 && v <= 0.62) {
            if (typeof window.selectSceneObject === 'function') window.selectSceneObject(0);
            sceneSculptDrag = { ringA: 1, ringB: 0, startX: x, startY: y, a0: st.rings[1].angle, b0: st.rings[0].angle };
            e.stopPropagation();
          } else if (u >= 0.28 && u <= 0.54 && v >= 0.16 && v <= 0.62) {
            if (typeof window.selectSceneObject === 'function') window.selectSceneObject(1);
            sceneSculptDrag = { ringA: 2, ringB: 1, startX: x, startY: y, a0: st.rings[2].angle, b0: st.rings[1].angle };
            e.stopPropagation();
          } else {
            sceneSculptDrag = { ringA: 2, ringB: 3, startX: x, startY: y, a0: st.rings[2].angle, b0: st.rings[3].angle };
            e.stopPropagation();
          }
        } else if (st.scene === 'beetle' && (st.activeShot === 'canopy' || st.activeShot === 'clearing')) {
          sceneSculptDrag = {
            ringA: 1,
            ringB: 0,
            startX: x,
            startY: y,
            a0: st.rings[1].angle,
            b0: st.rings[0].angle,
            driveSpread: true,
            spread0: (st.accordionTarget || 0) * 100
          };
          e.stopPropagation();
        } else if (st.scene === 'beetle' && st.activeShot === 'leaf') {
          sceneSculptDrag = { ringA: 3, ringB: 1, startX: x, startY: y, a0: st.rings[3].angle, b0: st.rings[1].angle };
          e.stopPropagation();
        } else if (st.scene === 'birthday') {
          if (st.activeShot === 'blowcandles') {
            sceneSculptDrag = { ringA: 4, ringB: 1, startX: x, startY: y, a0: st.rings[4].angle, b0: st.rings[1].angle };
            e.stopPropagation();
          } else if (st.activeShot === 'cutouts') {
            sceneSculptDrag = { ringA: 3, ringB: 0, startX: x, startY: y, a0: st.rings[3].angle, b0: st.rings[0].angle };
            e.stopPropagation();
          } else {
            sceneSculptDrag = {
              ringA: 2,
              ringB: 1,
              startX: x,
              startY: y,
              a0: st.rings[2].angle,
              b0: st.rings[1].angle,
              morphBundt: true,
              bundt0: st.bundtMorph || 0
            };
            e.stopPropagation();
          }
        } else if (st.scene === 'horse' || st.scene === 'snow') {
          sceneSculptDrag = { ringA: 0, ringB: 2, startX: x, startY: y, a0: st.rings[0].angle, b0: st.rings[2].angle };
          e.stopPropagation();
        }
      }
    }, true);

    window.addEventListener('pointermove', e => {
      if (!sceneSculptDrag || !window.state) return;
      const dx = e.clientX - sceneSculptDrag.startX;
      const dy = e.clientY - sceneSculptDrag.startY;
      const st = window.state;
      st.userHoldTimer = 3.5;
      if (typeof window.setRingAngle === 'function') {
        window.setRingAngle(sceneSculptDrag.ringA, sceneSculptDrag.a0 + dx * 0.55 - dy * 0.55, true);
        window.setRingAngle(sceneSculptDrag.ringB, sceneSculptDrag.b0 + dx * 0.45, true);
      }
      if (st.rings && st.rings[sceneSculptDrag.ringA]) {
        st.rings[sceneSculptDrag.ringA].vel = (dx - dy) * 0.08;
      }
      if (st.rings && st.rings[sceneSculptDrag.ringB]) {
        st.rings[sceneSculptDrag.ringB].vel = dx * 0.06;
      }
      if (sceneSculptDrag.morphBundt) {
        st.bundtMorph = Math.max(0, Math.min(1, sceneSculptDrag.bundt0 - dy * 0.004));
      }
      if (sceneSculptDrag.driveSpread && typeof window.setAccordionSpread === 'function') {
        window.setAccordionSpread(sceneSculptDrag.spread0 + dx * 0.25, true);
      }
    });

    window.addEventListener('pointerup', () => {
      sceneSculptDrag = null;
    });
  }

  // Helper: Pack 8 Assembly Elements' 5-Dial Vectors (L1..R2) + Spatial Offsets (dx, dy) + Visibility into Shader Uniforms
  function syncSamObjectUniforms(state, shot, targetUniforms) {
    if (typeof window.ensureObjectParams === 'function') {
      window.ensureObjectParams(shot);
    }
    const objMap = (state.objectParams && state.objectParams[shot]) ? state.objectParams[shot] : null;
    const tfMap  = (state.objectTransforms && state.objectTransforms[shot]) ? state.objectTransforms[shot] : null;
    const baseRings = (objMap && objMap.baseRings) ? objMap.baseRings : [165, 160, 145, 150, 110];
    const solidArr = [0.95, 0.95, 0.95, 0.95];
    const focusArr = [0.62, 0.62, 0.62, 0.62];
    const morphArr = [0.80, 0.80, 0.80, 0.80];
    const lumaArr  = [1.00, 1.00, 1.00, 1.00];
    const tintArr  = [0.00, 0.00, 0.00, 0.00];
    const offXArr  = [0.00, 0.00, 0.00, 0.00];
    const offYArr  = [0.00, 0.00, 0.00, 0.00];
    const visArr   = [1.00, 1.00, 1.00, 1.00];
    const normDivs = [140, 145, 150, 210, 170];
    const perObjNorms = [];

    for (let i = 0; i < 8; i++) {
      const angs = (objMap && objMap[i]) ? objMap[i] : state.rings.map(r => r.angle);
      const n0 = Math.min(1, Math.max(0, angs[0] / normDivs[0]));
      const n1 = Math.min(1, Math.max(0, angs[1] / normDivs[1]));
      const n2 = Math.min(1, Math.max(0, angs[2] / normDivs[2]));
      const n3 = Math.min(1, Math.max(0, angs[3] / normDivs[3]));
      const n4 = Math.min(1, Math.max(0, angs[4] / normDivs[4]));
      if (i < 4) {
        solidArr[i] = n0;
        focusArr[i] = Math.max(0.0, Math.min(1.0, 0.62 + (angs[1] - baseRings[1]) / 130.0));
        morphArr[i] = n2;
        const isActI = (shot === 'bugeye' || shot === 'leaf' || shot === 'canopy' || shot === 'clearing');
        lumaArr[i]  = isActI
          ? Math.max(0.84, Math.min(1.45, 1.0 + (angs[3] - baseRings[3]) / 190.0))
          : Math.max(0.48, Math.min(2.25, 1.0 + (angs[3] - baseRings[3]) / 75.0));
        tintArr[i]  = Math.max(-1.0, Math.min(1.0, (angs[4] - baseRings[4]) / 85.0));
        if (tfMap && tfMap[i]) {
          offXArr[i] = tfMap[i].dx || 0.0;
          offYArr[i] = tfMap[i].dy || 0.0;
          visArr[i]  = (tfMap[i].visible === false) ? 0.0 : 1.0;
        }
      }
      perObjNorms.push([n0, n1, n2, n3, n4]);
    }

    const compModeVal = (state.compositeMode === 'hybrid3d') ? 1.0
                      : (state.compositeMode === 'segments') ? 2.0
                      : (state.compositeMode === 'isolate')  ? 3.0
                      : 0.0;

    if (targetUniforms && targetUniforms.uObjSolid) {
      targetUniforms.uObjSolid.value.fromArray(solidArr);
      targetUniforms.uObjFocus.value.fromArray(focusArr);
      targetUniforms.uObjMorph.value.fromArray(morphArr);
      targetUniforms.uObjLuma.value.fromArray(lumaArr);
      targetUniforms.uObjTint.value.fromArray(tintArr);
      if (targetUniforms.uObjOffsetX) targetUniforms.uObjOffsetX.value.fromArray(offXArr);
      if (targetUniforms.uObjOffsetY) targetUniforms.uObjOffsetY.value.fromArray(offYArr);
      if (targetUniforms.uObjVis)     targetUniforms.uObjVis.value.fromArray(visArr);
      if (targetUniforms.uCompMode)   targetUniforms.uCompMode.value = compModeVal;
      targetUniforms.uSelectedIdx.value = (state.selectedNodeIdx || 0) % 4;
    }
    return perObjNorms;
  }

  // ==========================================================================
  // MAIN 60FPS RENDER LOOP & SCENE -> ORB OPTICAL REFLECTION COUPLING
  // ==========================================================================
  window.renderStellineWebGLScene = function (state, holoCanvas, holoCtx) {
    syncRendererSize();
    const w = holoCanvas.clientWidth;
    const h = holoCanvas.clientHeight;
    holoCtx.clearRect(0, 0, w, h);
    activeOverlayHitboxes = [];

    const t = state.time;
    const L1 = Math.min(1, Math.max(0, state.rings[0].angle / 140));
    const L2 = Math.min(1, Math.max(0, state.rings[1].angle / 145));
    const L3 = Math.min(1, Math.max(0, state.rings[2].angle / 150));
    const R1 = Math.min(1, Math.max(0, state.rings[3].angle / 210));
    const R2 = Math.min(1, Math.max(0, state.rings[4].angle / 170));
    const R3 = state.accordionSpread;
    const ringNorms = [L1, L2, L3, R1, R2];

    let activeRingIdx = 1;
    let maxVel = 0.001;
    for (let i = 0; i < 5; i++) {
      const rv = Math.abs(state.rings[i].vel || 0);
      if (rv > maxVel) {
        maxVel = rv;
        activeRingIdx = i;
      }
    }
    state.activeCoupledRing = activeRingIdx;

    Object.values(rootGroups).forEach(g => { g.visible = false; });

    const shot = state.activeShot || 'bugeye';
    const orbitYaw = (state.cam3D ? state.cam3D.yaw : 0) * 0.25;
    const orbitPitch = (state.cam3D ? state.cam3D.pitch : 0) * 0.18;
    const zoomFactor = state.cam3D ? (1.0 / Math.max(0.65, Math.min(1.65, state.cam3D.zoom || 1.0))) : 1.0;
    const wireOverlay = (state.renderMode === 'xray') ? 1.0 : 0.0;
    const drawVisualOverlay = !state.hideHud;

    const asmNodes = (typeof window.getActiveAssemblyNodes === 'function')
      ? window.getActiveAssemblyNodes(shot)
      : [];
    const samList = (window.STELLINE_SAM_DATA && window.STELLINE_SAM_DATA[shot])
      ? window.STELLINE_SAM_DATA[shot]
      : [];
    const totalAsm = Math.max(1, asmNodes.length || samList.length);
    const selIdx = (state.selectedNodeIdx || 0) % totalAsm;
    const selAsm = asmNodes[selIdx] || null;
    const selSam = (selIdx < samList.length) ? samList[selIdx] : null;
    const rawSelUv = (selAsm && selAsm.uvByShot && (selAsm.uvByShot[shot] || selAsm.uvByShot.default))
      || (selSam && selSam.cx !== undefined ? [selSam.cx, selSam.cy] : [0.68, 0.48]);
    const selObj = {
      idx: selIdx,
      id: (selAsm && selAsm.id) || (selSam && selSam.id) || 'SCENE.ROOT',
      label: (selAsm && selAsm.label) || (selSam && selSam.label) || '',
      dials: (selAsm && selAsm.dials) || null,
      cx: rawSelUv[0],
      cy: rawSelUv[1]
    };

    // Compute head-shift for bugeye so SAM contours and reticles track the beetle's head turn
    const setaeMorph = Math.max(0.0, Math.min(1.0, (state.rings[2].angle - 102) / 74));
    const headShift = (shot === 'bugeye')
      ? Math.max(0.0, Math.min(1.0, (setaeMorph - 0.20) / 0.52))
      : 0.0;

    // Draw Left-Arc 8-Element Sub-Assembly Stack ([1/8]..[8/8]) + SAM Polygon Contour on all shots
    drawSubObjectNodeStack(holoCtx, w, h, shot, state, drawVisualOverlay, headShift);

    // Expose live Scene Optical Reflection Tint so the physical Orb below reflects the hologram's light!
    if (state.scene === 'beetle') {
      state.sceneLightTint = { r: 120, g: 168, b: 68, intensity: 0.35 + L2 * 0.45 };
    } else if (state.scene === 'birthday') {
      const candleFlicker = 0.85 + 0.15 * Math.sin(t * 14.0);
      state.sceneLightTint = { r: 255, g: 184, b: 76, intensity: (0.45 + L3 * 0.35) * candleFlicker };
    } else {
      state.sceneLightTint = { r: 224, g: 142, b: 64, intensity: 0.40 + L1 * 0.35 };
    }

    // ------------------------------------------------------------------------
    // ACT I: FOREST & BEETLE (00:15 canopy, 00:25 leaf, 00:31-00:35 bugeye, 00:50 clearing)
    // ------------------------------------------------------------------------
    const selTf = (state.objectTransforms && state.objectTransforms[shot] && state.objectTransforms[shot][selIdx])
      ? state.objectTransforms[shot][selIdx]
      : { dx: 0, dy: 0, visible: true };
    const selDx = selTf.dx || 0;
    const selDy = selTf.dy || 0;

    if (state.scene === 'beetle') {
      if (shot === 'canopy' || shot === 'clearing') {
        rootGroups.canopy.visible = true;
        canopyUniforms.uSamTex.value = (shot === 'clearing') ? filmTextures.sam_clearing : filmTextures.sam_canopy;
        canopyUniforms.uDepthTex.value = (shot === 'clearing') ? filmTextures.depth_clearing : filmTextures.depth_canopy;
        const canNorms = syncSamObjectUniforms(state, shot, canopyUniforms);
        const selNorms = canNorms[selIdx] || ringNorms;

        canopyUniforms.uTime.value = t;
        canopyUniforms.uSculptRelief.value = Math.min(1.0, L1 * 1.15);
        canopyUniforms.uBranchZoom.value = (shot === 'canopy') ? Math.max(0.0, (L3 - 0.55) * 2.2) : 0.0;
        canopyUniforms.uDissolve.value = shot === 'clearing' ? Math.max(0.04, R3 * 1.05) : 0.0;
        canopyUniforms.uSunRays.value = 0.35 + L2 * 0.75;
        camera.position.set(orbitYaw * 0.4, orbitPitch * 0.3, 8.0 * zoomFactor);
        camera.lookAt(0, 0, 0);

        const arcX = w * Math.min(0.84, Math.max(0.24, (selObj.cx || 0.50) + selDx + 0.16));
        const arcY = h * Math.min(0.72, Math.max(0.28, (selObj.cy || 0.46) + selDy));
        drawFilmRadialArcMenu(
          holoCtx, arcX, arcY, 44, true, true, activeRingIdx,
          [`VOXEL.CANOPY // RELIEF ${(selNorms[0] * 100).toFixed(0)}%`, `GODRAYS.VOL  // SCATTER ${(selNorms[1] * 100).toFixed(0)}%`, `DOME.UNWEAVE // SPREAD ${(R3 * 100).toFixed(0)}%`],
          drawVisualOverlay, selNorms, selObj
        );
      } else if (shot === 'leaf') {
        rootGroups.leaf.visible = true;
        const leafObjNorms = syncSamObjectUniforms(state, 'leaf', leafUniforms);
        const selNorms = leafObjNorms[selIdx] || ringNorms;
        const vBug = (window.OPERATOR_PROTOCOLS && window.OPERATOR_PROTOCOLS.bug && state.otherwiseVariant)
          ? window.OPERATOR_PROTOCOLS.bug.otherwise[state.otherwiseVariant.bug || 0]
          : null;
        const cBug = (state.customBug && state.customBug.active) ? state.customBug : null;
        bugEyeUniforms.uChitinShift.value = cBug
          ? ((cBug.wavelengthNm - 520) / 75.0)
          : ((vBug && vBug.chitinShift !== undefined) ? vBug.chitinShift : 0.0);

        leafUniforms.uTime.value = t;
        leafUniforms.uVeinDepth.value = Math.min(1.0, L1 * 1.15);
        leafUniforms.uWetness.value = Math.min(1.0, L2 * 1.10);
        leafUniforms.uWireOverlay.value = wireOverlay;
        leafUniforms.uLightDir.value.set(-0.22 + Math.sin(t * 1.2) * 0.18, 0.74, 0.64).normalize();

        const wingUnfurl = cBug && cBug.wingUnfurl !== undefined
          ? cBug.wingUnfurl
          : (selIdx === 2 ? Math.max(0, (L3 - 0.50) * 1.9) : 0.0);
        const walkProg = Math.max(
          wingUnfurl > 0.25 ? 0.92 : 0.0,
          Math.max(0.0, Math.min(1.0, (state.rings[3].angle - 135) / 75))
        );
        leafUniforms.uBeetleWalk.value = walkProg;

        // Show standalone 3D primitive beetle/droplet meshes in V2, V3, 2D+3D WEAVE, ZERO mode, or when sculpting ELYTRA.WINGS ([3/8])
        const engVer = state.engineVersion || 'v4';
        const show3DLeafModels = (state.renderMode === 'zero') || (state.compositeMode === 'hybrid3d') || (engVer === 'v2') || (engVer === 'v3') || (wingUnfurl > 0.15);
        scarabBeetleGroup.visible = show3DLeafModels;
        dropletsGroup.visible = show3DLeafModels;
        scarabBeetleGroup.position.set(
          0.02 - walkProg * 0.18 + selDx * 4.5,
          -0.12 + walkProg * 0.38 - selDy * 2.8,
          0.25
        );
        scarabBeetleGroup.rotation.z = -0.08 + Math.sin(walkProg * 6.0) * 0.05;

        // Articulate Split Dorsal Elytra & Unfurling Translucent Flight Wings ([3/8] ELYTRA.WINGS)
        elytraMesh.visible = (wingUnfurl < 0.08);
        leftElytronPivot.visible = (wingUnfurl >= 0.08);
        rightElytronPivot.visible = (wingUnfurl >= 0.08);
        leftElytronPivot.rotation.set(wingUnfurl * 0.35, -wingUnfurl * 0.25, -wingUnfurl * 0.58);
        rightElytronPivot.rotation.set(wingUnfurl * 0.35,  wingUnfurl * 0.25,  wingUnfurl * 0.58);
        leftFlightWingPivot.visible = (wingUnfurl > 0.06);
        rightFlightWingPivot.visible = (wingUnfurl > 0.06);
        const wingBeat = Math.sin(t * 28.0) * 0.08 * wingUnfurl;
        leftFlightWingPivot.rotation.set(0.18 * wingUnfurl, -0.22 * wingUnfurl + wingBeat, -0.82 * wingUnfurl);
        rightFlightWingPivot.rotation.set(0.18 * wingUnfurl, 0.22 * wingUnfurl - wingBeat,  0.82 * wingUnfurl);
        leftFlightWingPivot.scale.set(0.25 + 0.85 * wingUnfurl, 0.25 + 0.95 * wingUnfurl, 1.0);
        rightFlightWingPivot.scale.set(0.25 + 0.85 * wingUnfurl, 0.25 + 0.95 * wingUnfurl, 1.0);

        // Articulate 11-Segment Filiform Antennae ([4/8] ANTENNA.SCAPE)
        const antSweep = ((leafObjNorms[3] ? leafObjNorms[3][2] : L3) - 0.5) * 0.55 + Math.sin(t * 3.2) * 0.08;
        leftScarabAntennaPivot.rotation.z = -antSweep;
        rightScarabAntennaPivot.rotation.z = antSweep;

        beetleLegs.forEach(leg => {
          leg.mesh.rotation.z = Math.sin(walkProg * 12.0 + leg.idx * 1.1) * 0.11 * leg.side;
        });

        camera.position.set(orbitYaw * 0.4, orbitPitch * 0.3, 8.0 * zoomFactor);
        camera.lookAt(0, 0, 0);

        if (drawVisualOverlay) {
          const sx = w * (0.495 - walkProg * 0.025 + selDx);
          const sy = h * (0.495 - walkProg * 0.065 + selDy);
          const locLabel = wingUnfurl > 0.10
            ? `ELYTRA.SPLIT // ${(wingUnfurl * 62).toFixed(0)}DEG UNFURL`
            : `GAIT.LOCUS // +${(walkProg * 14.2).toFixed(1)}mm`;
          drawOpticalVernierLocus(holoCtx, sx, sy, 42, Math.max(walkProg, wingUnfurl), locLabel, true);
        }
        const arcX = w * Math.min(0.84, Math.max(0.24, (selObj.cx || 0.50) + selDx + 0.18));
        const arcY = h * Math.min(0.72, Math.max(0.28, (selObj.cy || 0.48) + selDy));
        drawFilmRadialArcMenu(
          holoCtx, arcX, arcY, 44, true, true, activeRingIdx,
          [`ELYTRA.WINGS // UNFURL ${(wingUnfurl * 100).toFixed(0)}%`, `MENISCUS.H2O // FILM ${(selNorms[1] * 100).toFixed(0)}%`, `SCARAB.GAIT  // 00:25->00:28 [${(walkProg * 100).toFixed(0)}%]`],
          drawVisualOverlay, selNorms, selObj
        );
      } else {
        // 00:31 -> 00:35 BUG EYE MACRO SEQUENCE (sec_031 -> sec_032 -> sec_033 -> sec_034 -> sec_035)
        rootGroups.bugeye.visible = true;
        const bugObjNorms = syncSamObjectUniforms(state, 'bugeye', bugEyeUniforms);
        const selNorms = bugObjNorms[selIdx] || ringNorms;
        const vBug = (window.OPERATOR_PROTOCOLS && window.OPERATOR_PROTOCOLS.bug && state.otherwiseVariant)
          ? window.OPERATOR_PROTOCOLS.bug.otherwise[state.otherwiseVariant.bug || 0]
          : null;

        bugEyeUniforms.uTime.value = t;
        bugEyeUniforms.uSculptRelief.value = Math.min(1.0, L1 * 1.05);
        bugEyeUniforms.uRightEyeFocus.value = Math.min(1.0, (bugObjNorms[0] ? bugObjNorms[0][1] : L2) * 1.05);
        const leftFocus = Math.max(0.0, Math.min(1.0, (state.rings[1].angle - 150) / 42));
        bugEyeUniforms.uLeftEyeFocus.value = Math.max(leftFocus, bugObjNorms[1] ? (bugObjNorms[1][1] - 0.5) * 1.8 : 0.0);
        bugEyeUniforms.uMandibleFlex.value = R1;
        bugEyeUniforms.uHeadShift.value = headShift;

        // Wire PROTOCOL I // BUG DESIGNER Counterfactual & Bespoke Custom Bug Uniforms (Independent Per-Eye Hex Density!)
        const cBug = (state.customBug && state.customBug.active) ? state.customBug : null;
        const dxHexNorm = bugObjNorms[0] ? bugObjNorms[0][0] : L1;
        const snHexNorm = bugObjNorms[1] ? bugObjNorms[1][0] : L1;
        const effHex = (cBug && cBug.hexDensity !== undefined)
          ? cBug.hexDensity
          : ((vBug && vBug.hexDensity) ? vBug.hexDensity : Math.round(dxHexNorm * 231));
        const effLeftHex = (cBug && cBug.leftHexDensity !== undefined)
          ? cBug.leftHexDensity
          : ((vBug && vBug.splitSpectrum > 0.5) ? 58 : Math.round(snHexNorm * 231));
        const isSplit = cBug
          ? Boolean(cBug.splitOptics || Math.abs(effHex - effLeftHex) > 25)
          : Boolean(vBug && vBug.splitSpectrum > 0.5);
        const effChitinShift = cBug
          ? ((cBug.wavelengthNm - 520) / 75.0)
          : ((vBug && vBug.chitinShift !== undefined) ? vBug.chitinShift : 0.0);
        const effDomeBoost = cBug
          ? (cBug.eyeDome || 1.0)
          : ((vBug && vBug.eyeDomeBoost) ? vBug.eyeDomeBoost : 1.0);
        bugEyeUniforms.uHexDensity.value = effHex;
        bugEyeUniforms.uLeftHexDensity.value = effLeftHex;
        bugEyeUniforms.uChitinShift.value = effChitinShift;
        bugEyeUniforms.uSplitOptics.value = isSplit ? 1.0 : 0.0;
        bugEyeUniforms.uEyeDomeBoost.value = effDomeBoost;

        bugEyeUniforms.uLightDir.value.set(
          0.25 + Math.sin(t * 1.35 + R2 * 3.0) * 0.24,
          0.78 + Math.cos(t * 1.10) * 0.12,
          0.58
        ).normalize();

        bugEyeUniforms.uSetaeMorph.value = setaeMorph;
        bugEyeUniforms.uWireOverlay.value = wireOverlay;

        const setaeMult = cBug
          ? (cBug.setaeCount / 180.0)
          : ((vBug && vBug.setaeScale !== undefined) ? vBug.setaeScale : 1.0);
        const bristleScale = cBug
          ? Math.max(0.0, Math.min(2.0, setaeMult))
          : Math.max(0.0, Math.min(1.9, ((setaeMorph - 0.18) / 0.65) * setaeMult));
        setaeGroup.visible = bristleScale > 0.02;
        setaeList.forEach((b, idx) => {
          b.scale.setScalar(bristleScale);
          b.rotation.z = Math.sin(t * 2.2 + idx * 0.35) * 0.035 * bristleScale;
        });

        // Articulate 3D Antenna Scapes ([4/8]), Mandible Pincers ([6/8]), and 3D Macro Head Capsule in V2 / ZERO / hybrid3d mode
        const engVerBug = state.engineVersion || 'v4';
        const isPure3DBug = (engVerBug === 'v2') || (state.renderMode === 'zero');
        bugReliefMesh.visible = (engVerBug !== 'v2');
        macroBeetleHeadGroup.visible = isPure3DBug;
        const showMacro3DRig = isPure3DBug || (state.compositeMode === 'hybrid3d');
        bugEyeAntennaGroup.visible = showMacro3DRig;
        bugEyeMandibleGroup.visible = showMacro3DRig;
        const antFlex = ((bugObjNorms[3] ? bugObjNorms[3][2] : L3) - 0.5) * 0.45;
        leftMacroAntennaPivot.rotation.set(0, antFlex * 0.4, -antFlex);
        rightMacroAntennaPivot.rotation.set(0, -antFlex * 0.4, antFlex);
        const mandPinch = ((bugObjNorms[5] ? bugObjNorms[5][2] : R1) - 0.5) * 0.48;
        leftMacroMandiblePivot.rotation.z = mandPinch;
        rightMacroMandiblePivot.rotation.z = -mandPinch;

        camera.position.set(orbitYaw * 0.45, orbitPitch * 0.35, 8.0 * zoomFactor);
        camera.lookAt(0, 0, 0);

        // Shift both eye reticles & C-Arc by (-0.068 * headShift, +0.024 * headShift) + D-Pad offset so they stay locked onto the beetle's eyes!
        const tf0 = (state.objectTransforms && state.objectTransforms.bugeye && state.objectTransforms.bugeye[0]) || { dx: 0, dy: 0 };
        const tf1 = (state.objectTransforms && state.objectTransforms.bugeye && state.objectTransforms.bugeye[1]) || { dx: 0, dy: 0 };
        const dxU = 0.732 - 0.068 * headShift + (tf0.dx || 0);
        const dxV = 0.380 + 0.024 * headShift + (tf0.dy || 0);
        const snU = 0.442 - 0.068 * headShift + (tf1.dx || 0);
        const snV = 0.401 + 0.024 * headShift + (tf1.dy || 0);

        const dxHexCount = Math.round(effHex);
        const snHexCount = Math.round(effLeftHex);
        if (drawVisualOverlay) {
          drawOpticalVernierLocus(holoCtx, w * dxU, h * dxV, 48, bugObjNorms[0][1], `OCULUS.DX // ${dxHexCount}_HEX`, true);
          if (leftFocus > 0.10 || selIdx === 1 || isSplit || cBug) {
            drawOpticalVernierLocus(holoCtx, w * snU, h * snV, 46, Math.max(leftFocus, bugObjNorms[1][1]), `OCULUS.SN // ${snHexCount}_HEX`, true);
          }
          if (cBug && cBug.taxon) {
            holoCtx.save();
            holoCtx.font = '8.5px "JetBrains Mono", monospace';
            holoCtx.fillStyle = 'rgba(56, 217, 192, 0.90)';
            holoCtx.fillText(`HOLOTYPE // ${cBug.taxon.toUpperCase()} [${cBug.wavelengthNm}nm · DX:${dxHexCount}_HEX SN:${snHexCount}_HEX]`, w * 0.28, h * 0.11);
            if (cBug.commonName) {
              holoCtx.font = '7.5px "JetBrains Mono", monospace';
              holoCtx.fillStyle = 'rgba(215, 234, 230, 0.72)';
              holoCtx.fillText(`DESIGNATION // ${cBug.commonName.toUpperCase()}`, w * 0.28, h * 0.11 + 12);
            }
            holoCtx.restore();
          }
        }
        const rawCx = (selIdx === 0) ? dxU : (selIdx === 1 ? snU : 0.70 + selDx);
        const rawCy = (selIdx === 0) ? dxV : (selIdx === 1 ? snV : 0.54 + selDy);
        const arcX = w * Math.min(0.84, Math.max(0.24, rawCx + 0.10));
        const arcY = h * Math.min(0.68, Math.max(0.26, rawCy + 0.02));
        const chitinTag = cBug
          ? `${cBug.wavelengthNm}nm ${cBug.taxon ? cBug.taxon.slice(0, 14).toUpperCase() : 'CUSTOM'}`
          : ((vBug && vBug.idx === 1) ? '585nm SCARAB.AURUM' : (vBug && vBug.idx === 2) ? '455nm OBSIDIAN.VOID' : (vBug && vBug.idx === 3) ? 'SPLIT [260G / 58C]' : '520nm EMERALD');
        drawFilmRadialArcMenu(
          holoCtx, arcX, arcY, 46, true, true, activeRingIdx,
          [`OCULUS.OPTIC // DX:${dxHexCount}_HEX SN:${snHexCount}_HEX`, `SETAE.GROWTH // ${Math.round(bristleScale * 180)} BRISTLES`, `CHITIN.SPEC  // ${chitinTag}`],
          drawVisualOverlay, selNorms, selObj
        );
      }
    }

    // ------------------------------------------------------------------------
    // ACT II: BIRTHDAY PARTY (02:17 - 03:16)
    // ------------------------------------------------------------------------
    else if (state.scene === 'birthday') {
      rootGroups.birthday.visible = true;

      // Bind shot-specific SAM & DPT-MiDaS textures across all 6 Act II shots
      const samTexMap = {
        cakespawn:   filmTextures.sam_cakespawn,
        bundtmorph:  filmTextures.sam_bundtmorph,
        redicing:    filmTextures.sam_redicing,
        cutouts:     filmTextures.sam_cutouts,
        blowcandles: filmTextures.sam_blowcandles,
        miniature:   filmTextures.sam_miniature
      };
      const depthTexMap = {
        cakespawn:   filmTextures.depth_cakespawn,
        bundtmorph:  filmTextures.depth_bundtmorph,
        redicing:    filmTextures.depth_redicing,
        cutouts:     filmTextures.depth_cutouts,
        blowcandles: filmTextures.depth_blowcandles,
        miniature:   filmTextures.depth_miniature
      };
      bdayUniforms.uSamTex.value   = samTexMap[shot]   || filmTextures.sam_cutouts;
      bdayUniforms.uDepthTex.value = depthTexMap[shot] || filmTextures.depth_cutouts;

      // Bind the 5 active keyframe textures for this birthday shot (keeping total shader sampler2D count <= 7!)
      if (shot === 'cakespawn') {
        bdayUniforms.uTexF0.value = filmTextures.spawn138;
        bdayUniforms.uTexF1.value = filmTextures.spawn;
        bdayUniforms.uTexF2.value = filmTextures.spawn141;
        bdayUniforms.uTexF3.value = filmTextures.dim133;
        bdayUniforms.uTexF4.value = filmTextures.spawn141;
      } else if (shot === 'bundtmorph') {
        bdayUniforms.uTexF0.value = filmTextures.bundt142;
        bdayUniforms.uTexF1.value = filmTextures.bundt143;
        bdayUniforms.uTexF2.value = filmTextures.bundt;
        bdayUniforms.uTexF3.value = filmTextures.bundt145;
        bdayUniforms.uTexF4.value = filmTextures.bundt;
      } else if (shot === 'redicing') {
        bdayUniforms.uTexF0.value = filmTextures.icing146;
        bdayUniforms.uTexF1.value = filmTextures.icing147;
        bdayUniforms.uTexF2.value = filmTextures.icing;
        bdayUniforms.uTexF3.value = filmTextures.icing;
        bdayUniforms.uTexF4.value = filmTextures.icing;
      } else if (shot === 'cutouts') {
        bdayUniforms.uTexF0.value = filmTextures.cut153;
        bdayUniforms.uTexF1.value = filmTextures.cutouts;
        bdayUniforms.uTexF2.value = filmTextures.cut155;
        bdayUniforms.uTexF3.value = filmTextures.cut156;
        bdayUniforms.uTexF4.value = filmTextures.party6;
      } else if (shot === 'blowcandles') {
        bdayUniforms.uTexF0.value = filmTextures.blow174;
        bdayUniforms.uTexF1.value = filmTextures.blow182;
        bdayUniforms.uTexF2.value = filmTextures.blow185;
        bdayUniforms.uTexF3.value = filmTextures.blow;
        bdayUniforms.uTexF4.value = filmTextures.blow189;
      } else {
        bdayUniforms.uTexF0.value = filmTextures.mini170;
        bdayUniforms.uTexF1.value = filmTextures.mini;
        bdayUniforms.uTexF2.value = filmTextures.mini;
        bdayUniforms.uTexF3.value = filmTextures.mini;
        bdayUniforms.uTexF4.value = filmTextures.mini;
      }

      const bdayObjNorms = syncSamObjectUniforms(state, shot, bdayUniforms);
      const selNorms = bdayObjNorms[selIdx] || ringNorms;
      const vCake = (window.OPERATOR_PROTOCOLS && window.OPERATOR_PROTOCOLS.cake && state.otherwiseVariant)
        ? window.OPERATOR_PROTOCOLS.cake.otherwise[state.otherwiseVariant.cake || 0]
        : null;
      const cCake = (state.customCake && state.customCake.active) ? state.customCake : null;
      const isCakeOtherwise = Boolean((vCake && vCake.idx > 0) || cCake);
      const glazeMap = { vanilla: 0.0, ganache: 0.92, rose: -0.85, matcha: -0.45, gold: 0.45 };
      bdayUniforms.uFrostingShift.value = cCake
        ? (glazeMap[cCake.glaze] !== undefined ? glazeMap[cCake.glaze] : 0.0)
        : ((vCake && vCake.frostingShift !== undefined) ? vCake.frostingShift : 0.0);

      bdayUniforms.uTime.value = t;
      const orbitMag = Math.abs(orbitYaw) + Math.abs(orbitPitch);
      bdayUniforms.uCameraOrbit.value = orbitMag;

      // Cake/Table solid dial (`cakeSolid`): idx 3 in cutouts (`TABLE.AND.CAKE`), idx 0 in cakespawn/bundtmorph/redicing
      const cakeObjIdx = (shot === 'cutouts') ? 3 : 0;
      const cakeSolid = bdayObjNorms[cakeObjIdx] ? bdayObjNorms[cakeObjIdx][0] : L1;

      bdayUniforms.uLiveMode.value = (isCakeOtherwise || orbitMag > 0.05 || cakeSolid < 0.88) ? 1.0 : 0.0;
      bdayUniforms.uSculptRelief.value = isCakeOtherwise ? Math.max(0.76, Math.min(0.86, cakeSolid)) : Math.min(1.0, cakeSolid * 1.08);
      bdayUniforms.uRadianceCalib.value = (shot === 'cakespawn') ? Math.min(1.0, cakeSolid * 1.10) : Math.min(1.0, L2 * 1.15);
      bdayUniforms.uWireOverlay.value = wireOverlay;

      const stageProg = Math.max(0.0, Math.min(1.0, (state.rings[1].angle - 45) / 105));
      bdayUniforms.uStageProgress.value = stageProg;

      let bundtVal = state.bundtMorph || 0;
      if (cCake && cCake.bundt !== undefined) {
        bundtVal = cCake.bundt;
      } else if (vCake && vCake.forceBundtInParty > 0.05) {
        bundtVal = vCake.forceBundtInParty;
      } else if (shot === 'bundtmorph') {
        bundtVal = Math.max(0.0, Math.min(0.96, (state.rings[2].angle - 48) / 96));
      } else if (shot === 'cakespawn' || (shot === 'cutouts' && (!vCake || vCake.forceBundtInParty <= 0.05))) {
        bundtVal = 0.0;
      }
      bdayUniforms.uBundtMorph.value = bundtVal;

      const icingProg = Math.max(0.0, Math.min(1.0, (state.rings[2].angle - 48) / 98));
      bdayUniforms.uIcingDetail.value = (shot === 'redicing') ? icingProg : 1.0;

      const cutoutProg = Math.max(0.0, Math.min(1.0, (state.rings[3].angle - 35) / 165));
      bdayUniforms.uCutoutProgress.value = (shot === 'cutouts') ? cutoutProg : R1;

      sideStuds.forEach(stud => {
        const ny = (stud.userData.baseY + 0.55) / 1.1;
        const scallop = 1.0 + 0.075 * Math.cos(stud.userData.ang * 11.0) * Math.min(1, Math.max(0, (ny - 0.15) / 0.77));
        const glazeCapBulge = Math.exp(-Math.pow(ny - 0.68, 2.0) * 18.0) * 0.09 * bundtVal;
        const domeTaper = 1.0 + (1.06 - 0.36 * Math.pow(ny, 1.7) + glazeCapBulge - 1.0) * bundtVal;
        const r = 1.18 * domeTaper * (1.0 + (scallop - 1.0) * bundtVal);
        const y = stud.userData.baseY * (1.0 + 0.36 * bundtVal);
        stud.position.set(Math.cos(stud.userData.ang) * r, y, Math.sin(stud.userData.ang) * r);
      });

      const isBundt = bundtVal > 0.30;
      const topY = 0.55 * (1.0 + 0.36 * bundtVal);
      if (cCake && cCake.blownOut) {
        cCake.exhaleAnim = Math.min(1.0, (cCake.exhaleAnim || 0) + 0.025);
      } else if (cCake) {
        cCake.exhaleAnim = Math.max(0.0, (cCake.exhaleAnim || 0) - 0.04);
      }
      const wind = (cCake && cCake.exhaleAnim > 0.01)
        ? cCake.exhaleAnim
        : (shot === 'blowcandles' ? Math.max(0.05, R2) : 0.02 * Math.sin(t * 2.3));
      bdayUniforms.uCandleWind.value = Math.max(0, wind);

      // Show 3D primitive cake & table meshes in V2 (Pure 3D), V3 (Hybrid 3D), 2D+3D WEAVE, or ZERO primitive mode; in V4 (default), bgBirthdayQuad renders the 200x140 DPT-MiDaS 3D displaced film plates cleanly
      const engVer = state.engineVersion || 'v4';
      bgBirthdayQuad.visible = (engVer !== 'v2');
      const show3DExtras = (state.renderMode === 'zero') || (engVer === 'v2') || (engVer === 'v3' && shot !== 'cutouts');
      const targetCandles = cCake ? Math.max(1, Math.min(12, parseInt(cCake.candles, 10) || 7)) : 7;

      candleObjs.forEach((c, idx) => {
        let showThisCandle = idx < targetCandles;
        if (!cCake) {
          if (vCake && vCake.candleMode === 3) {
            showThisCandle = (idx === 0 || idx === 2 || idx === 5);
          } else if (shot === 'bundtmorph' && !(vCake && vCake.forceBundtInParty)) {
            if (bundtVal < 0.28) showThisCandle = idx < 7;
            else if (bundtVal < 0.65) showThisCandle = (idx === 3);
            else showThisCandle = (idx === 1 || idx === 5);
          } else if (shot === 'cakespawn' && stageProg < 0.35 && !isCakeOtherwise) {
            showThisCandle = (idx === 0 || idx === 2 || idx === 5);
          } else {
            showThisCandle = idx < 7;
          }
        }
        c.holder.visible = show3DExtras && showThisCandle;
        const rScale = isBundt ? 0.50 : 1.0;
        c.holder.position.set(c.spec.x * rScale, topY, c.spec.z * rScale);
        c.holder.rotation.set(c.spec.tiltX, 0, c.spec.tiltZ);
        const flicker = 0.86 + 0.20 * Math.sin(t * 15.0 + idx * 2.1);
        const flameAlive = Math.max(0.0, 1.0 - Math.max(0, wind - 0.15) * 1.15);
        c.flame.visible = flameAlive > 0.04;
        c.halo.visible = flameAlive > 0.08;
        c.flame.scale.set(0.68, Math.max(0.01, 2.35 * flicker * flameAlive), 0.68);
        c.flame.rotation.z = -wind * 0.65;
      });

      const forceSmarties = cCake ? Boolean(cCake.smarties) : Boolean(vCake && vCake.forceSmartiesInParty);
      studsGroup.visible = show3DExtras && (shot !== 'cakespawn' || isBundt);
      topSmartiesGroup.visible = show3DExtras && (forceSmarties || (shot === 'cakespawn' && stageProg < 0.72));
      topSmartiesGroup.scale.set(isBundt ? 0.58 : 1.0, 1.0, isBundt ? 0.58 : 1.0);
      topSmartiesGroup.position.y = topY + 0.018;

      redIcingGroup.visible = show3DExtras && !isBundt && (shot === 'redicing' || shot === 'cutouts');
      redIcingGroup.position.y = topY + 0.015;
      platterMesh.visible = show3DExtras;

      const strokeFloat = icingProg * icingStrokeMeshes.length;
      icingStrokeMeshes.forEach((m, idx) => {
        const sProg = Math.max(0.0, Math.min(1.0, strokeFloat - idx));
        m.visible = sProg > 0.02;
        m.scale.set(sProg, 1.0, sProg);
      });

      camera.position.set(orbitYaw * 0.4, orbitPitch * 0.3, 8.0 * zoomFactor);
      camera.lookAt(0, 0, 0);

      // Helper: Draw Bespoke Custom Birthday Cake Piped Calligraphy, Custom Candles (1..12) & Exhale Smoke directly on the Cake Crown!
      function drawBespokeCakeOverlay(crownX, crownY, crownRx, crownRy, tiltRad) {
        if (!cCake || !drawVisualOverlay) return;
        holoCtx.save();
        holoCtx.translate(crownX, crownY);
        holoCtx.rotate(tiltRad);

        // 1. Optional 24 Smarties confectionery ring on the cake crown
        if (cCake.smarties) {
          const smCols = ['#d43824', '#2c68c8', '#e6a428', '#389642', '#783218'];
          for (let s = 0; s < 16; s++) {
            const sa = (s / 16) * Math.PI * 2;
            const sx = Math.cos(sa) * crownRx * 0.88;
            const sy = Math.sin(sa) * crownRy * 0.88;
            holoCtx.fillStyle = smCols[s % smCols.length];
            holoCtx.beginPath();
            holoCtx.ellipse(sx, sy, 4.2, 2.4, sa * 0.3, 0, Math.PI * 2);
            holoCtx.fill();
            holoCtx.fillStyle = 'rgba(255,255,255,0.45)';
            holoCtx.fillRect(sx - 1.5, sy - 1, 2, 1);
          }
        }

        // 2. Custom Piped Buttercream Inscription (3D extruded crimson/gold icing bead + specular sugar crest)
        const rawInsc = (cCake.inscription || '').trim();
        if (rawInsc.length > 0 && rawInsc !== '生日快樂') {
          // Smooth buttercream crown glaze coat over the center when replacing the default Hanzi inscription
          if (rawInsc !== '生日快樂') {
            const glazeFill = (cCake.glaze === 'ganache') ? ['rgba(58, 36, 24, 0.92)', 'rgba(42, 24, 15, 0.0)']
                            : (cCake.glaze === 'rose')    ? ['rgba(224, 172, 168, 0.90)', 'rgba(195, 138, 132, 0.0)']
                            : (cCake.glaze === 'matcha')  ? ['rgba(168, 188, 132, 0.90)', 'rgba(138, 158, 102, 0.0)']
                            : ['rgba(218, 186, 124, 0.92)', 'rgba(188, 152, 92, 0.0)'];
            holoCtx.save();
            holoCtx.scale(1.0, Math.max(0.54, crownRy / Math.max(1, crownRx)));
            const cGrad = holoCtx.createRadialGradient(0, 6, crownRx * 0.12, 0, 6, crownRx * 0.78);
            cGrad.addColorStop(0, glazeFill[0]);
            cGrad.addColorStop(0.72, glazeFill[0]);
            cGrad.addColorStop(1, glazeFill[1]);
            holoCtx.fillStyle = cGrad;
            holoCtx.beginPath();
            holoCtx.arc(0, 6, crownRx * 0.78, 0, Math.PI * 2);
            holoCtx.fill();
            holoCtx.restore();
          }

          const revealCount = (shot === 'redicing')
            ? Math.max(1, Math.ceil(Math.max(0.25, icingProg) * rawInsc.length))
            : rawInsc.length;
          const visibleText = rawInsc.slice(0, revealCount);
          const lines = visibleText.length > 14 && visibleText.includes(' ')
            ? (() => {
                const words = visibleText.split(' ');
                const mid = Math.ceil(words.length / 2);
                return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
              })()
            : [visibleText];

          holoCtx.save();
          holoCtx.scale(1.0, Math.max(0.54, crownRy / Math.max(1, crownRx)));
          const fontSize = Math.max(11, Math.min(20, Math.round((crownRx * 1.45) / Math.max(5, lines[0].length * 0.65))));
          holoCtx.font = `700 ${fontSize}px "Inter", "PingFang SC", "Hiragino Sans", sans-serif`;
          holoCtx.textAlign = 'center';
          holoCtx.textBaseline = 'middle';

          const isDarkGlaze = (cCake.glaze === 'ganache');
          const pipeShadow = isDarkGlaze ? 'rgba(28, 8, 4, 0.92)' : 'rgba(62, 6, 4, 0.90)';
          const pipeMid    = isDarkGlaze ? 'rgba(232, 68, 52, 0.96)' : 'rgba(186, 24, 18, 0.96)';
          const pipeHi     = isDarkGlaze ? 'rgba(255, 198, 168, 0.85)' : 'rgba(255, 142, 128, 0.82)';

          lines.forEach((ln, lIdx) => {
            const ly = (lIdx - (lines.length - 1) * 0.5) * (fontSize * 1.18) + 6;
            // 3D Extruded Buttercream Shadow Bead
            holoCtx.lineJoin = 'round';
            holoCtx.lineCap = 'round';
            holoCtx.lineWidth = 4.2;
            holoCtx.strokeStyle = pipeShadow;
            holoCtx.strokeText(ln, 1.5, ly + 2.2);
            holoCtx.fillStyle = pipeShadow;
            holoCtx.fillText(ln, 1.5, ly + 2.2);

            // Primary Piped Buttercream Body
            holoCtx.lineWidth = 2.4;
            holoCtx.strokeStyle = pipeMid;
            holoCtx.strokeText(ln, 0, ly);
            holoCtx.fillStyle = pipeMid;
            holoCtx.fillText(ln, 0, ly);

            // Specular Sugar Highlight Crest
            holoCtx.fillStyle = pipeHi;
            holoCtx.fillText(ln, -0.6, ly - 0.9);
          });

          // Piped crimson zig-zag flourish underneath inscription
          const flY = (lines.length * 0.5) * (fontSize * 1.1) + 12;
          const flW = Math.min(crownRx * 0.72, 74);
          holoCtx.strokeStyle = pipeMid;
          holoCtx.lineWidth = 2.2;
          holoCtx.beginPath();
          holoCtx.moveTo(-flW * 0.65, flY);
          holoCtx.lineTo(flW * 0.65, flY - 2);
          holoCtx.lineTo(-flW * 0.35, flY + 5);
          holoCtx.lineTo(flW * 0.75, flY + 4);
          holoCtx.stroke();
          holoCtx.restore();
        }

        // 3. Custom Lit Birthday Candles (when candle count != 7 or when exhaling/blowing out candles)
        if (targetCandles !== 7 || wind > 0.12) {
          const nC = targetCandles;
          const cH = Math.max(22, crownRx * 0.36);
          for (let c = 0; c < nC; c++) {
            const ca = -Math.PI * 0.88 + (nC === 1 ? Math.PI * 0.38 : (c / (nC - 1)) * Math.PI * 0.82);
            const cx = Math.cos(ca) * crownRx * 0.72;
            const cy = Math.sin(ca) * crownRy * 0.62 - 6;

            // Striped wax candle shaft
            holoCtx.fillStyle = (c % 2 === 0) ? 'rgba(238, 224, 198, 0.92)' : 'rgba(224, 72, 56, 0.90)';
            holoCtx.fillRect(cx - 2.2, cy - cH, 4.4, cH);
            holoCtx.fillStyle = 'rgba(30, 20, 12, 0.9)';
            holoCtx.fillRect(cx - 0.6, cy - cH - 4, 1.2, 4);

            const flameAlive = Math.max(0.0, 1.0 - Math.max(0, wind - 0.12) * 1.18);
            if (flameAlive > 0.05) {
              const flk = 0.85 + 0.22 * Math.sin(t * 16.0 + c * 1.9);
              const bendX = -wind * 14.0;
              const fx = cx + bendX * 0.4;
              const fy = cy - cH - 9 * flameAlive * flk;
              const grad = holoCtx.createRadialGradient(fx, fy, 1, fx, fy, 14 * flameAlive);
              grad.addColorStop(0, 'rgba(255, 252, 230, 0.98)');
              grad.addColorStop(0.35, 'rgba(255, 168, 48, 0.82)');
              grad.addColorStop(1, 'rgba(255, 90, 12, 0.0)');
              holoCtx.fillStyle = grad;
              holoCtx.beginPath();
              holoCtx.arc(fx, fy, 14 * flameAlive, 0, Math.PI * 2);
              holoCtx.fill();
            } else {
              // Rising warm ember & candle smoke curl after blowing out candles!
              const smokeY = cy - cH - 8 - ((t * 18 + c * 7) % 28);
              const smokeX = cx - 6 - Math.sin(t * 3.2 + c) * 5;
              holoCtx.strokeStyle = 'rgba(215, 228, 235, 0.42)';
              holoCtx.lineWidth = 1.2;
              holoCtx.beginPath();
              holoCtx.moveTo(cx, cy - cH - 4);
              holoCtx.quadraticCurveTo(cx - 8, (cy - cH + smokeY) * 0.5, smokeX, smokeY);
              holoCtx.stroke();
            }
          }
        }
        holoCtx.restore();

        // Top-center diegetic recipient banner when custom cake is active
        if (cCake.inscription) {
          holoCtx.save();
          holoCtx.font = '8.5px "JetBrains Mono", monospace';
          holoCtx.fillStyle = 'rgba(240, 168, 72, 0.92)';
          const statusStr = cCake.blownOut ? 'WISH MADE [CANDLES EXTINGUISHED]' : `${String(targetCandles).padStart(2, '0')} WICKS LIT [3200K]`;
          holoCtx.fillText(`PATISSERIE.OS // "${cCake.inscription.toUpperCase()}" · ${statusStr}`, w * 0.24, h * 0.11);
          holoCtx.restore();
        }
      }

      if (shot === 'cakespawn') {
        bdayUniforms.uShotMode.value = 0.0;
        hexTableGroup.visible = false;
        cakeGroup.visible = show3DExtras;
        cakeGroup.scale.set(0.56, 0.38, 0.56);
        cakeGroup.position.set(-2.05 + selDx * 4.5, -0.18 - selDy * 2.8, 0.45);
        cakeGroup.rotation.set(0.30 + orbitPitch, 0.22 + orbitYaw, -0.10);

        drawBespokeCakeOverlay(w * (0.335 + selDx), h * (0.505 + selDy), w * 0.085, h * 0.055, -0.06);

        const candleCount = cCake ? `${String(targetCandles).padStart(2, '0')}_WICKS` : ((vCake && vCake.candleMode === 3) || (stageProg < 0.35 && !isCakeOtherwise) ? '03_WICKS' : '07_WICKS');
        const smartieState = (forceSmarties || stageProg < 0.70) ? '24_SMARTIES_ON' : 'TOP_CLEARED';
        const arcX = w * Math.min(0.82, Math.max(0.32, (selObj.cx || 0.32) + selDx + 0.14));
        const arcY = h * Math.min(0.72, Math.max(0.28, (selObj.cy || 0.45) + selDy));
        drawFilmRadialArcMenu(
          holoCtx, arcX, arcY, 44, true, true, activeRingIdx,
          [`SPONGE.CYL  // EXTRUDE ${(selNorms[0] * 100).toFixed(0)}%`, `WICK.ARRAY  // ${candleCount} [3200K]`, `CONFECT.TOP // ${smartieState}`],
          drawVisualOverlay, selNorms, selObj
        );
      }
      else if (shot === 'bundtmorph') {
        bdayUniforms.uShotMode.value = 1.0;
        hexTableGroup.visible = false;
        cakeGroup.visible = show3DExtras;
        cakeGroup.scale.setScalar(0.80);
        cakeGroup.position.set(-2.35 + selDx * 4.5, -0.32 - selDy * 2.8, 0.55);
        cakeGroup.rotation.set(
          0.18 - bundtVal * 0.56 + orbitPitch,
          0.12 + bundtVal * 0.24 + orbitYaw,
          -0.08 - bundtVal * 0.20
        );

        drawBespokeCakeOverlay(w * (0.255 + selDx), h * (0.495 + selDy), w * 0.082, h * 0.052, -0.14 * bundtVal);

        const bundtStage = bundtVal < 0.30 ? 'CYL_07_WICKS' : (bundtVal < 0.68 ? 'EXTRUDE_01_WICK' : 'BUNDT_02_WICKS');
        const arcX = w * Math.min(0.82, Math.max(0.28, (selObj.cx || 0.22) + selDx + 0.10));
        const arcY = h * Math.min(0.72, Math.max(0.28, (selObj.cy || 0.42) + selDy));
        drawFilmRadialArcMenu(
          holoCtx, arcX, arcY, 42, false, true, activeRingIdx,
          [`TOPOLOGY.L3 // ${(1.0 - bundtVal).toFixed(2)} CYL -> ${bundtVal.toFixed(2)} DOME`, `FLUTE.ARRAY // 11_SCALLOP_RIBS`, `STAGE.STATE // ${bundtStage}`],
          drawVisualOverlay, selNorms, selObj
        );
      }
      else if (shot === 'redicing') {
        bdayUniforms.uShotMode.value = 2.0;
        hexTableGroup.visible = false;
        cakeGroup.visible = show3DExtras;
        cakeGroup.scale.setScalar(1.02);
        cakeGroup.position.set(-1.95 + selDx * 4.5, -0.22 - selDy * 2.8, 0.75);
        cakeGroup.rotation.set(0.56 + orbitPitch, -0.18 + orbitYaw, 0.24);

        drawBespokeCakeOverlay(w * (0.338 + selDx), h * (0.555 + selDy), w * 0.115, h * 0.078, 0.14);

        if (drawVisualOverlay) {
          const tipX = w * (0.295 + icingProg * 0.095 + selDx);
          const tipY = h * (0.565 - Math.sin(icingProg * Math.PI) * 0.025 + selDy);
          holoCtx.save();
          holoCtx.strokeStyle = 'rgba(245, 252, 250, 0.78)';
          holoCtx.lineWidth = 0.9;
          holoCtx.beginPath();
          holoCtx.arc(tipX, tipY, 7, 0, Math.PI * 2);
          holoCtx.moveTo(tipX - 12, tipY); holoCtx.lineTo(tipX + 12, tipY);
          holoCtx.moveTo(tipX, tipY - 12); holoCtx.lineTo(tipX, tipY + 12);
          holoCtx.stroke();
          holoCtx.restore();
        }

        const hanziStage = (cCake && cCake.inscription)
          ? `[${cCake.inscription.slice(0, 14).toUpperCase()}]`
          : (icingProg < 0.45 ? '[生日]' : (icingProg < 0.82 ? '[生日快樂]' : '[生日快樂 + FLOURISH]'));
        const arcX = w * Math.min(0.82, Math.max(0.32, (selObj.cx || 0.34) + selDx + 0.18));
        const arcY = h * Math.min(0.72, Math.max(0.28, (selObj.cy || 0.50) + selDy));
        drawFilmRadialArcMenu(
          holoCtx, arcX, arcY, 54, true, true, activeRingIdx,
          [`SURF.PIPE   // ICING ${hanziStage}`, `NOZZLE.LOCUS// STROKE ${(icingProg * 18).toFixed(0)}/18`, `WICK.RIG    // ${String(targetCandles).padStart(2, '0')}_CANDLE_EMISSIVE_3200K`],
          drawVisualOverlay, selNorms, selObj
        );
      }
      else if (shot === 'cutouts') {
        bdayUniforms.uShotMode.value = 3.0;
        hexTableGroup.visible = show3DExtras;
        cakeGroup.visible = show3DExtras;

        hexTableGroup.scale.set(1.12, 0.95, 1.08);
        hexTableGroup.position.set(0.01, -0.82, 0.35);
        hexTableGroup.rotation.set(0.18 + orbitPitch * 0.4, orbitYaw * 0.35, 0);

        cakeGroup.scale.set(isBundt ? 0.66 : 0.56, 0.56, isBundt ? 0.66 : 0.56);
        cakeGroup.position.set(0.01, -0.46, 0.35);
        cakeGroup.rotation.set(0.18 + orbitPitch * 0.4, orbitYaw * 0.35, 0);

        const cTf3 = (state.objectTransforms && state.objectTransforms.cutouts && state.objectTransforms.cutouts[3]) || { dx: 0, dy: 0 };
        drawBespokeCakeOverlay(w * (0.495 + (cTf3.dx || 0)), h * (0.555 + (cTf3.dy || 0)), w * 0.068, h * 0.036, 0.0);

        const cTf0 = (state.objectTransforms && state.objectTransforms.cutouts && state.objectTransforms.cutouts[0]) || { dx: 0, dy: 0 };
        const cTf1 = (state.objectTransforms && state.objectTransforms.cutouts && state.objectTransforms.cutouts[1]) || { dx: 0, dy: 0 };
        const cTf2 = (state.objectTransforms && state.objectTransforms.cutouts && state.objectTransforms.cutouts[2]) || { dx: 0, dy: 0 };

        if (cutoutProg > 0.05 && cTf0.visible !== false) {
          drawChildNodeOverlay(holoCtx, w * (0.205 + (cTf0.dx || 0)), h * (0.315 + (cTf0.dy || 0)), w * (0.275 + (cTf0.dx || 0)), h * (0.345 + (cTf0.dy || 0)), selIdx === 0, 0, drawVisualOverlay, bdayObjNorms[0]);
        }
        if (cutoutProg > 0.22 && cTf2.visible !== false) {
          drawChildNodeOverlay(holoCtx, w * (0.645 + (cTf2.dx || 0)), h * (0.285 + (cTf2.dy || 0)), w * (0.575 + (cTf2.dx || 0)), h * (0.315 + (cTf2.dy || 0)), selIdx === 2, 2, drawVisualOverlay, bdayObjNorms[2]);
        }
        if (cutoutProg > 0.45 && cTf1.visible !== false) {
          drawChildNodeOverlay(holoCtx, w * (0.385 + (cTf1.dx || 0)), h * (0.355 + (cTf1.dy || 0)), w * (0.415 + (cTf1.dx || 0)), h * (0.395 + (cTf1.dy || 0)), selIdx === 1, 1, drawVisualOverlay, bdayObjNorms[1]);
        }

        // Also draw the primary 5-Dial White C-Arc Menu anchored beside the selected SAM item (child or table/cake)!
        const arcX = w * Math.min(0.84, Math.max(0.74, (selObj.cx || 0.50) + selDx + 0.22));
        const arcY = h * Math.min(0.72, Math.max(0.54, (selObj.cy || 0.56) + selDy));
        drawFilmRadialArcMenu(
          holoCtx, arcX, arcY, 44, true, true, activeRingIdx,
          [`SAM.TARGET  // ${selObj.id} [L1..R2]`, `LUMA.GAIN   // R1:${(selNorms[3] * 100).toFixed(0)}% TINT:${(selNorms[4] * 100).toFixed(0)}%`, `SOLID.MESH  // L1:${(selNorms[0] * 100).toFixed(0)}% FOCUS:${(selNorms[1] * 100).toFixed(0)}%`],
          drawVisualOverlay, selNorms, selObj
        );
      }
      else if (shot === 'blowcandles') {
        bdayUniforms.uShotMode.value = 4.0;
        hexTableGroup.visible = false;
        cakeGroup.visible = show3DExtras;
        cakeGroup.scale.setScalar(0.55);
        cakeGroup.position.set(0.0, -1.65, 1.8);
        cakeGroup.rotation.set(0.05, Math.sin(t * 0.7) * 0.08, 0);

        drawBespokeCakeOverlay(w * (0.495 + selDx), h * (0.765 + selDy), w * 0.095, h * 0.048, 0.0);

        const arcX = w * Math.min(0.84, Math.max(0.24, (selObj.cx || 0.49) + selDx + 0.16));
        const arcY = h * Math.min(0.74, Math.max(0.26, (selObj.cy || 0.48) + selDy));
        drawFilmRadialArcMenu(
          holoCtx, arcX, arcY, 44, true, true, activeRingIdx,
          [`EXHALE.SEQ  // 02:53->03:09 [${(wind * 100).toFixed(0)}%]`, `PLUME.WIND  // ${targetCandles}_WICKS_EXTINGUISH`, `SAM.TARGET  // ${selObj.id}`],
          drawVisualOverlay, selNorms, selObj
        );
      }
      else if (shot === 'miniature') {
        bdayUniforms.uShotMode.value = 5.0;
        hexTableGroup.visible = false;
        cakeGroup.visible = false;

        const arcX = w * Math.min(0.84, Math.max(0.24, (selObj.cx || 0.52) + selDx + 0.14));
        const arcY = h * Math.min(0.74, Math.max(0.26, (selObj.cy || 0.64) + selDy));
        drawFilmRadialArcMenu(
          holoCtx, arcX, arcY, 44, true, true, activeRingIdx,
          [`MINI.SCALE  // 0.08X FLOOR DIORAMA`, `DOME.LIGHT  // PERIMETER COVE`, `SAM.TARGET  // ${selObj.id}`],
          drawVisualOverlay, selNorms, selObj
        );
      }
    }

    // ------------------------------------------------------------------------
    // ACT III / IV: CARVED WOODEN HORSE [6 · 10 · 21] & SNOW DOME (04:42 / 04:55)
    // ------------------------------------------------------------------------
    else {
      rootGroups.horse.visible = true;
      const isSnow = (state.scene === 'snow');
      bgHorseMat.uniforms.uShowSnow.value = isSnow ? 1.0 : 0.0;
      bgHorseMat.uniforms.uSamTex.value = isSnow ? filmTextures.sam_snow : filmTextures.sam_horsecarve;
      bgHorseMat.uniforms.uDepthTex.value = isSnow ? filmTextures.depth_snow : filmTextures.depth_horsecarve;
      const horseNorms = syncSamObjectUniforms(state, isSnow ? 'snow' : 'horsecarve', bgHorseMat.uniforms);
      const selNorms = horseNorms[selIdx] || ringNorms;

      const showHorse3D = !isSnow;
      bgHorseMat.uniforms.uDimBackdrop.value = showHorse3D ? 1.0 : 0.0;
      woodHorseGroup.visible = showHorse3D;
      woodGrainMat.uniforms.uSculptRelief.value = Math.min(1.0, L1 * 1.15);
      woodGrainMat.uniforms.uWireOverlay.value = wireOverlay;
      woodHorseGroup.rotation.y = -0.45 + orbitYaw + Math.sin(t * 0.85) * 0.32 + (R2 - 0.5) * 0.8;
      woodHorseGroup.rotation.x = 0.12 + orbitPitch + Math.cos(t * 0.7) * 0.06;
      woodHorseGroup.position.set(selDx * 3.5, -0.10 - selDy * 2.2, 0.0);
      camera.position.set(0, 0.25, 5.6 * zoomFactor);
      camera.lookAt(0, 0, 0);

      if (woodHorseGroup.visible) {
        const base2D = projectTo2D(new THREE.Vector3(selDx * 3.5, -1.08 - selDy * 2.2, 0.45), w, h);
        if (base2D && L3 > 0.20) {
          const inscChars = '6 · 10 · 21';
          const nChars = Math.max(1, Math.min(inscChars.length, Math.floor(((L3 - 0.20) / 0.55) * inscChars.length)));
          holoCtx.save();
          holoCtx.font = '11px "JetBrains Mono", monospace';
          holoCtx.fillStyle = 'rgba(240, 168, 72, 0.92)';
          holoCtx.fillText(inscChars.slice(0, nChars), base2D.x - 36, base2D.y + 4);
          holoCtx.restore();
        }
      }
      const arcX = w * Math.min(0.84, Math.max(0.24, (selObj.cx || 0.50) + selDx + 0.16));
      const arcY = h * Math.min(0.72, Math.max(0.28, (selObj.cy || 0.50) + selDy));
      drawFilmRadialArcMenu(
        holoCtx, arcX, arcY, 46, true, true, activeRingIdx,
        [`EQUUS.HULL  // WHITTLE ${(selNorms[0] * 100).toFixed(0)}%`, `BASE.INSC   // [6 · 10 · 21]`, `FURNACE.RIM // 3200K RADIANCE`],
        drawVisualOverlay, selNorms, selObj
      );
    }

    // ------------------------------------------------------------------------
    // IN-HOLOGRAM DIEGETIC LASER-CURSOR INSCRIPTION / TAXON PROMPT ([I])
    // ------------------------------------------------------------------------
    if (state.holoDirectEdit && state.holoDirectEdit.active && drawVisualOverlay) {
      const targetMode = state.holoDirectEdit.target;
      const curText = (targetMode === 'cake')
        ? ((state.customCake && state.customCake.inscription) || '')
        : ((state.customBug && state.customBug.taxon) || '');
      const promptTitle = (targetMode === 'cake')
        ? 'PATISSERIE.OS // DIRECT BUTTERCREAM INSCRIPTION PIPE'
        : 'ENTOMOLOGY.OS // DIRECT BINOMIAL TAXON DESIGNATION';
      const cursorChar = (Math.floor(t * 3.5) % 2 === 0) ? '_' : ' ';
      const px = w * 0.50;
      const py = h * 0.16;
      const pw = Math.min(360, w * 0.65);
      const ph = 42;

      holoCtx.save();
      holoCtx.fillStyle = 'rgba(6, 12, 16, 0.86)';
      holoCtx.fillRect(px - pw * 0.5, py - ph * 0.5, pw, ph);
      holoCtx.strokeStyle = 'rgba(56, 217, 192, 0.85)';
      holoCtx.lineWidth = 1.1;
      holoCtx.strokeRect(px - pw * 0.5, py - ph * 0.5, pw, ph);

      holoCtx.font = '7px "JetBrains Mono", monospace';
      holoCtx.fillStyle = 'rgba(56, 217, 192, 0.85)';
      holoCtx.textAlign = 'center';
      holoCtx.fillText(`${promptTitle} [ENTER TO LOCK]`, px, py - 9);

      holoCtx.font = '700 11px "JetBrains Mono", monospace';
      holoCtx.fillStyle = 'rgba(245, 252, 250, 0.98)';
      holoCtx.fillText(`> ${curText}${cursorChar}`, px, py + 8);
      holoCtx.restore();
    }

    // ------------------------------------------------------------------------
    // WHISPER-CLEAN IN-WORLD VIEWFINDER HORIZON MICRO-BAR (Bottom-Right)
    // Allows stepping shots, cycling COMP / OTHERWISE, and triggering INSCRIBE / IMPRINT
    // with zero non-diegetic web-chrome clutter occluding the hologram!
    // ------------------------------------------------------------------------
    if (drawVisualOverlay && w > 420) {
      const shotOrder = ['canopy', 'leaf', 'bugeye', 'clearing', 'cakespawn', 'bundtmorph', 'redicing', 'cutouts', 'blowcandles', 'miniature', 'horsecarve'];
      const shotIdx = Math.max(0, shotOrder.indexOf(shot));
      const vy = h - 9;
      holoCtx.save();
      holoCtx.font = '7px "JetBrains Mono", monospace';
      holoCtx.textBaseline = 'middle';

      const items = [
        { label: '< PREV', w: 38, act: () => { if (window.selectFilmShot) window.selectFilmShot(shotOrder[(shotIdx - 1 + shotOrder.length) % shotOrder.length]); } },
        { label: `${String(shotIdx + 1).padStart(2, '0')}/11 ${shot.toUpperCase()}`, w: 78, act: () => { if (window.toggleLabDrawer) window.toggleLabDrawer(); } },
        { label: 'NEXT >', w: 38, act: () => { if (window.selectFilmShot) window.selectFilmShot(shotOrder[(shotIdx + 1) % shotOrder.length]); } },
        { label: `COMP:${(state.compositeMode || 'FULL').slice(0, 6).toUpperCase()}`, w: 66, act: () => { if (window.cycleCompositeMode) window.cycleCompositeMode(); } },
        { label: 'OTHERWISE [O]', w: 68, act: () => { if (window.cycleOtherwiseVariant) window.cycleOtherwiseVariant(); } },
        { label: 'INSCRIBE [I]', w: 64, hi: true, act: () => { if (window.startHoloDirectTextEdit) window.startHoloDirectTextEdit(); } },
        { label: 'EXPORT [.OBJ]', w: 68, hi: true, act: () => { if (window.exportScene3DOBJ) window.exportScene3DOBJ(); } },
        { label: 'IMPRINT [.PNG]', w: 74, hi: true, act: () => { if (window.exportMemoryCardPNG) window.exportMemoryCardPNG(); } }
      ];

      let curX = w - 14;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const x0 = curX - it.w;
        holoCtx.fillStyle = it.hi ? 'rgba(240, 168, 72, 0.72)' : 'rgba(195, 218, 214, 0.45)';
        holoCtx.fillText(it.label, x0 + 4, vy);
        activeOverlayHitboxes.push({
          x: x0,
          y: vy - 10,
          w: it.w,
          h: 18,
          onClick: it.act
        });
        curX = x0 - 8;
      }
      holoCtx.restore();
    }

    renderer.render(scene, camera);
  };

  // ==========================================================================
  // WATERTIGHT 3D WAVEFRONT .OBJ MESH EXPORTER (Exports active 3D Beetle, Cake, or Wooden Horse)
  // ==========================================================================
  window.exportScene3DOBJ = function () {
    const st = window.stellineState || { scene: 'forest', activeShot: 'bugeye' };
    const shot = st.activeShot || 'bugeye';
    let targetGroups = [];
    if (st.scene === 'forest') {
      if (shot === 'leaf') targetGroups = [scarabGroup];
      else targetGroups = [macroBeetleHeadGroup, bugEyeAntennaGroup, bugEyeMandibleGroup, setaeGroup];
    } else if (st.scene === 'birthday') {
      targetGroups = [cakeGroup, hexTableMesh];
    } else {
      targetGroups = [woodHorseGroup];
    }

    const lines = [
      '# STELLINE MEMORY LABORATORY // 3D ENGRAM GEOMETRY EXPORT (.OBJ)',
      `# SHOT: ${shot.toUpperCase()} | SCENE: ${(st.scene || 'forest').toUpperCase()}`,
      `# GENERATED: ${new Date().toISOString()}`
    ];
    let vOffset = 1;
    const v3 = new THREE.Vector3();
    const n3 = new THREE.Vector3();
    const normalMat = new THREE.Matrix3();

    targetGroups.forEach((grp, gIdx) => {
      if (!grp) return;
      grp.updateMatrixWorld(true);
      grp.traverse(obj => {
        if (!obj.isMesh || !obj.geometry) return;
        const geom = obj.geometry;
        const pos = geom.attributes.position;
        if (!pos) return;
        const norm = geom.attributes.normal;
        const uv = geom.attributes.uv;
        const idx = geom.index;
        lines.push(`o ${obj.name || ('Part_' + gIdx + '_' + obj.id)}`);
        normalMat.getNormalMatrix(obj.matrixWorld);
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
          lines.push(`v ${v3.x.toFixed(5)} ${v3.y.toFixed(5)} ${v3.z.toFixed(5)}`);
        }
        if (uv) {
          for (let i = 0; i < uv.count; i++) {
            lines.push(`vt ${uv.getX(i).toFixed(5)} ${uv.getY(i).toFixed(5)}`);
          }
        }
        if (norm) {
          for (let i = 0; i < norm.count; i++) {
            n3.fromBufferAttribute(norm, i).applyMatrix3(normalMat).normalize();
            lines.push(`vn ${n3.x.toFixed(5)} ${n3.y.toFixed(5)} ${n3.z.toFixed(5)}`);
          }
        }
        const fmt = (k) => {
          const vi = vOffset + k;
          if (uv && norm) return `${vi}/${vi}/${vi}`;
          if (norm) return `${vi}//${vi}`;
          return `${vi}`;
        };
        if (idx) {
          for (let i = 0; i < idx.count; i += 3) {
            lines.push(`f ${fmt(idx.getX(i))} ${fmt(idx.getX(i + 1))} ${fmt(idx.getX(i + 2))}`);
          }
        } else {
          for (let i = 0; i < pos.count; i += 3) {
            lines.push(`f ${fmt(i)} ${fmt(i + 1)} ${fmt(i + 2)}`);
          }
        }
        vOffset += pos.count;
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stelline-3d-${shot}.obj`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 250);
    return lines.length;
  };
})();
