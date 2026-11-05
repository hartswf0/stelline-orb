/* ==========================================================================
   VESPER INSTRUMENTS // FIELD ORB 05 — STELLINE-ORB-PRO ENGINE
   "VOIDBASTARD-TAO ONLINE. SHOW ONLY WHAT IS TRUE NOW."
   "I will first construct the way of the surface, then remove obstruction
    until the operation can proceed without force."
   --------------------------------------------------------------------------
   Replaces Blender/Maya desktop round-trips and floating VR laser menus with
   one unified handheld spatial instrument (Stelline-Orb-Pro):
   - 01_PHYSICAL_LAB: Cylindrical Glass Containment Dome (IOR 1.45, Is Shadow Ray
     bypass), Recessed Concrete Floor Pit, 4500K Overhead Ring Diffuser, and
     Exterior Silhouette Observer (Officer K).
   - 02_HOLOGRAM_MEMORY: Bounded Principled Volume Cube (Density 0.03,
     Anisotropy 0.6), Procedural Hologram Shader Stack (Emission 2.5 + Fresnel
     0.3 Cyan/Amber Rim + Object-Z Wave Scanlines + Capacitive Squeeze
     Solidification), Driven by single Weaver_Control Empty.
   - Multi-Pass Embodied Performance Layering (Animotive 04:16 / 07:22):
     Pass 1 (Env_Dome), Pass 2 (Char_Child_01 MoCap), Pass 3 (Char_Child_02
     Embodied Live with In-World Faded Mirror Ghost), Pass 4 (Quill Anim Brush
     boiling strokes + Clayground 4-pose Stop-Motion Onion Skins + 85mm DOF).
   ========================================================================== */
(function () {
  'use strict';
  const T = window.THREE;
  if (!T) {
    console.error('THREE.js required for Field Orb 05');
    return;
  }

  /* ---------------- 1. Holographic Seeds (Outer Ring Catalog) ---------------- */
  const SEEDS = [
    {
      id: 'Env_Dome',
      code: 'SEED 01 // ENV_DOME',
      short: 'ENV_DOME',
      collection: '01_PHYSICAL_LAB',
      pipeline: 'BLENDER -> ORB NATIVE',
      desc: 'Cylindrical Glass Containment Room (R=4m, H=5m, IOR 1.45, IsShadowRay) + Recessed Pit + Hex Amber Table'
    },
    {
      id: 'Prop_Cake',
      code: 'SEED 02 // PROP_CAKE',
      short: 'PROP_CAKE',
      collection: '02_HOLOGRAM_MEMORY',
      pipeline: 'CLAYGROUND / SHAPELAB',
      desc: 'Birthday Cake on Hex Table (Cylinder Sponge <-> 12-Flute Bundt, 生日快樂 Piping, 3200K Candles)'
    },
    {
      id: 'Prop_Beetle',
      code: 'SEED 03 // PROP_BEETLE',
      short: 'PROP_BEETLE',
      collection: '02_HOLOGRAM_MEMORY',
      pipeline: 'SHAPELAB / QUILL',
      desc: 'Carabus stellinae on Swaying Elderberry Leaf Socket #T142 (Ommatidia Hex + Setae Bristles)'
    },
    {
      id: 'Lens_85mm',
      code: 'SEED 04 // LENS_85MM',
      short: 'LENS_85MM',
      collection: '01_PHYSICAL_LAB',
      pipeline: 'ANIMOTIVE CAMERA',
      desc: '85mm f/1.4 Virtual Cinema Lens + In-World Faded Mirror Framing Ghost (04:22)'
    },
    {
      id: 'Char_Child_01',
      code: 'SEED 05 // CHAR_CHILD_01',
      short: 'CHAR_01',
      collection: '02_HOLOGRAM_MEMORY',
      pipeline: 'ANIMOTIVE MOCAP',
      desc: 'Birthday Child #1 (Center-Right) — Recorded Pass: Leaning In & Blowing Out Candles'
    },
    {
      id: 'Char_Child_02',
      code: 'SEED 06 // CHAR_CHILD_02',
      short: 'CHAR_02',
      collection: '02_HOLOGRAM_MEMORY',
      pipeline: 'ANIMOTIVE EMBODY',
      desc: 'Birthday Child #2 (Center-Left) — Embodied by Operator Now alongside Pass 2 Playback'
    },
    {
      id: 'Char_Child_03',
      code: 'SEED 07 // CHAR_CHILD_03',
      short: 'CHAR_03',
      collection: '02_HOLOGRAM_MEMORY',
      pipeline: 'SHAPESXR / MOCAP',
      desc: 'Birthday Witnesses #3 & #4 — Peripheral Table Cutouts with 3200K Bounce Light'
    },
    {
      id: 'Quill_AnimBrush',
      code: 'SEED 08 // QUILL_BRUSH',
      short: 'QUILL_STROKE',
      collection: '02_HOLOGRAM_MEMORY',
      pipeline: 'QUILL 2.8 ANIM BRUSH',
      desc: 'Live Volumetric Ribbon Strokes (Boiling Candle Aura, Suspended Dust Motes & Wind Swirls)'
    },
    {
      id: 'Clay_StopMotion',
      code: 'SEED 09 // CLAY_LOOP',
      short: 'CLAY_ONION',
      collection: '02_HOLOGRAM_MEMORY',
      pipeline: 'CLAYGROUND STOP-MO',
      desc: '4-Pose Stop-Motion Clay Loop (Hold 4f -> Squash -> Stretch -> Land) with +/-1f Onion Skins'
    }
  ];

  /* ---------------- 2. The 6 VR Pipeline Surfaces (Section 1 & 4 Matrix) ---------------- */
  const VR_PIPELINES = [
    { id: 'orb_pro',    name: 'STELLINE-ORB-PRO (ALL-IN-ONE)', exit: '.IMM / .USDA / .GLB / 4K', timeline: 'MULTI-PASS LOOP (90Hz)' },
    { id: 'quill',      name: 'QUILL BY SMOOTHSTEP (STROKE)',  exit: '.USD / .ABC / .IMM',      timeline: 'DOPE-SHEET + ANIM BRUSH' },
    { id: 'clayground', name: 'CLAYGROUND (STOP-MO CLAY)',     exit: 'ANIMATED .GLB -> BLENDER', timeline: 'POSE + ONION SKIN + HOLD' },
    { id: 'animotive',  name: 'ANIMOTIVE (LIVE 6DOF MOCAP)',   exit: '.FBX RIG + CAM + AUDIO',   timeline: 'MULTI-PASS EMBODIED TAKE' },
    { id: 'shapesxr',   name: 'TVORI -> SHAPESXR (TWEEN)',     exit: '.FBX / .OBJ / .ABC',       timeline: 'FRAME-TO-FRAME AUTO-TWEEN' },
    { id: 'shapelab',   name: 'SHAPELAB (DYN-TOPO SCULPT)',    exit: 'HIGH-POLY .FBX / .OBJ',    timeline: 'COLLAPSED (ROUTE TO DCC)' }
  ];

  /* ---------------- 3. The 7-Step Implementation Protocol (Section 8) ---------------- */
  const IMPL_STEPS = [
    { step: 1, code: '1. CAST ROOM',       title: 'Cast the Containment Dome & Table (Env_Dome + Full Squeeze)' },
    { step: 2, code: '2. DIAL ATMOSPHERE', title: 'Tilt Orb + Twist Inner Ring (+30% Bounded Volume & God-Rays)' },
    { step: 3, code: '3. WEAVE PROPS',     title: 'Project Cake/Beetle -> Half-Squeeze Tether -> Middle Ring Morph -> Solidify' },
    { step: 4, code: '4. PLACE 85MM LENS', title: 'Lock 85mm Virtual Camera & Activate In-World Faded Mirror Ghost (04:22)' },
    { step: 5, code: '5. LAYER ACTORS',    title: 'Embody Char_01 -> Record -> Rewind Inner Ring to 00:00 -> Embody Char_02' },
    { step: 6, code: '6. FOCUS & SCULPT',  title: 'Handheld 85mm Focus Pull (f/1.4) + Live Quill Anim Brush & Clay Onion Skin' },
    { step: 7, code: '7. COMMIT MEMORY',   title: 'Long-Press Thumb-Iris: Optimize/Bake (<100MB, FixFlip) & Export Capsule' }
  ];

  /* ---------------- 4. Master State Store (Weaver_Control Single-Empty Driver) ---------------- */
  const STATE = {
    opState: 'WORKING (WEAVE)', // 'REST' | 'READY (SEED)' | 'WORKING (WEAVE)' | 'WORKING (EMBODY)' | 'CHANGED' | 'FAULT' | 'RECOVERY' | 'COMPLETE'
    implStep: 3,
    pipelineIdx: 0,
    seedIdx: 1, // Default: Prop_Cake
    activeRing: 'middle', // 'outer' | 'middle' | 'inner'
    ringAngles: { outer: 0.12, middle: 0.45, inner: 0.30 },

    // Weaver_Control Empty (Single Driver for all Hologram Shaders & Alembic/Loop Offsets)
    weaver: {
      pos: [0, 0, 0],
      rotZ: 0.25,          // Drives Wave Scanline Phase & Turntable Yaw
      locY: 0.24,          // Drives Alembic / Loop Time Offset (0..15s)
      tiltPitch: 0.32,     // Drives Volumetric God-Ray Cone Angle
      squeeze: 0.88,       // Capacitive Squeeze: 0 = Ghost Scanline, 0.5 = 6DoF Tether, 1.0 = Solid PBR
      tethered: false,
      bimanualScale: 1.0,  // Bimanual World Grip scale (0.25x .. 3.5x)
      timelineCollapsed: false // Quill 2.1+ Mode Isolation (Sculpt vs. Time)
    },

    // Bounded Principled Volume & 85mm Optics (Inner Ring)
    optics: {
      volumeDensity: 0.032, // 0.00 .. 0.08 (Principled Volume Density)
      anisotropy: 0.60,     // Tyndall forward scatter
      showVolumeWire: true, // Bounded Volume_Cube wireframe visibility
      focalLength: 85,      // 85mm Cinema Prime
      fStop: 1.8,           // f/1.4 .. f/16
      focusDist: 4.8,       // m
      isShadowRayBypass: true, // Prevents Glass Dome black-mirror failure
      fadedMirrorGhost: true   // Animotive 04:22 In-World Framing & Eyeline Ghost
    },

    // Hero Props State (Middle Ring)
    cake: {
      projected: true,
      bundt: 0.65,
      candles: 7,
      flames: 1.0,
      pipeProgress: 0.92,
      customText: '生日快樂',
      glazeIdx: 0,
      posOffset: [0, 0, 0],
      scale: 1.36
    },
    beetle: {
      projected: false,
      speciesIdx: 0,
      focusR: 0.85,
      focusL: 0.85,
      setae: 0.72,
      scale: 1.42
    },

    // Stop-Motion Clayground & Quill Anim Brush State
    clay: {
      active: true,
      onionSkin: true,     // +/- 1 Frame ghosting (Cyan = Prev Squash, Amber = Next Stretch)
      holdFrames: 4,       // Hold(4f) on extreme poses
      poseIdx: 2,          // 0: Rest, 1: Hold(4f), 2: Squash, 3: Stretch, 4: Land
      squashFactor: 0.38
    },
    quill: {
      active: true,
      boilAmp: 0.55,       // Anim Brush stroke boil amplitude
      ribbonWidth: 0.045,
      customStrokes: []    // Live 3D strokes drawn by user in viewport
    },

    // Multi-Pass Embodied Performance Layering (00:00.00 - 00:15.00 Loop)
    loop: {
      playing: true,
      time: 4.12,
      duration: 15.0,
      recordingPass: false,
      embodiedChar: 'Char_Child_02', // Currently embodied character rig
      passes: [
        { id: 1, name: 'PASS 1 // ENV_DOME + VOLUME_CUBE', status: 'COMMITTED', active: true, color: '#70d6ff' },
        { id: 2, name: 'PASS 2 // CHAR_01 BLOWING CANDLES (MOCAP)', status: 'PLAYING', active: true, color: '#98f5b0' },
        { id: 3, name: 'PASS 3 // CHAR_02 EMBODIED BY OPERATOR', status: 'EMBODIED NOW', active: true, color: '#ffcc66' },
        { id: 4, name: 'PASS 4 // QUILL BRUSH + CLAY ONION + 85MM', status: 'LIVE LAYER', active: true, color: '#ff9f43' }
      ],
      recordedTrack02: []  // Live motion samples recorded for Char_02
    },

    // Live Performance & Bake Monitor (Quill 2.3+ / 2.5+)
    perf: {
      memMB: 48.2,
      polyCount: 142800,
      drawCalls: 38,
      audioVoices: 3,
      bakedLoop: false,
      optimizedStrokes: false,
      fixFlip: true,       // Houdini/Blender negative-scale normal protection
      abortOnErrors: false,
      faultMessage: ''
    },

    cameraOrbit: [0.08, 0.14]
  };

  /* ---------------- 5. Transient Micro-Click Haptic Audio (Zero Continuous Drone) ---------------- */
  let audioCtx = null;
  function playDetentTick(freq = 2200, gainVal = 0.025) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.008);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.009);
    } catch (e) {}
  }

  /* ---------------- 6. Procedural Hologram Shader Stack (Section 5 Node Graph) ---------------- */
  // Implements: [Albedo/Tex] -> [Emission 2.5] + [Fresnel 0.3 Cyan/Amber Rim]
  //             + [Object-Z Wave Scanline driven by Weaver_Empty.Rot_Z]
  //             -> Mix(Hologram, Solid PBR) driven by Capacitive Squeeze (0..1)
  const HOLO_VS = `
    varying vec2 vUv;
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    varying vec3 vObjPos;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vObjPos = position;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vViewDir = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const HOLO_FS = `
    uniform sampler2D map;
    uniform float hasMap;
    uniform vec3 baseColor;
    uniform vec3 rimColor;
    uniform float squeeze;
    uniform float wavePhase;
    uniform float candleLight;
    varying vec2 vUv;
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    varying vec3 vObjPos;
    varying vec3 vWorldPos;

    void main() {
      vec4 texCol = hasMap > 0.5 ? texture2D(map, vUv) : vec4(baseColor, 1.0);
      if (texCol.a < 0.05) discard;

      // 1. Solid PBR / Subsurface Approximation (when Squeeze -> 1.0)
      vec3 lightDir = normalize(vec3(0.3, 1.2, 0.6));
      float ndl = max(0.18, dot(vNormalW, lightDir));
      vec3 warmBounce = vec3(1.18, 0.92, 0.65) * candleLight * 0.45;
      vec3 solidCol = texCol.rgb * (ndl * 0.85 + warmBounce);

      // 2. Hologram Shader Graph (Emission 2.5 + Fresnel 0.3 + Z-Scanline Wave)
      float fresnel = pow(1.0 - max(0.0, dot(vNormalW, vViewDir)), 2.2);
      float zScan = 0.5 + 0.5 * sin(vObjPos.y * 55.0 - wavePhase * 8.0);
      float scanMask = mix(0.38, 1.0, step(0.25, zScan));
      vec3 holoCol = texCol.rgb * 1.45 * scanMask + rimColor * fresnel * 1.65;
      holoCol += vec3(0.25, 0.82, 1.0) * step(0.92, zScan) * 0.45;

      // 3. Capacitive Squeeze Interpolation (Ghost Scanline -> Solid PBR)
      vec3 finalCol = mix(holoCol, solidCol, clamp(squeeze, 0.0, 1.0));
      float finalAlpha = texCol.a * mix(0.46 + fresnel * 0.42, 1.0, clamp(squeeze, 0.0, 1.0));
      gl_FragColor = vec4(finalCol, finalAlpha);
    }
  `;

  function makeHoloMaterial(opts) {
    return new T.ShaderMaterial({
      vertexShader: HOLO_VS,
      fragmentShader: HOLO_FS,
      transparent: true,
      depthWrite: true,
      side: T.DoubleSide,
      uniforms: {
        map: { value: opts.map || null },
        hasMap: { value: opts.map ? 1.0 : 0.0 },
        baseColor: { value: new T.Color(opts.color || 0xd49b35) },
        rimColor: { value: new T.Color(opts.rimColor || 0x5ff0dc) },
        squeeze: { value: STATE.weaver.squeeze },
        wavePhase: { value: 0.0 },
        candleLight: { value: 1.0 }
      }
    });
  }

  /* ---------------- 7. Scene Graph: 01_PHYSICAL_LAB & 02_HOLOGRAM_MEMORY ---------------- */
  let renderer, scene, camera;
  let colPhysicalLab, colHologramMemory, weaverEmpty;
  let glassDomeMesh, overheadRingMesh, observerKGroup, volumeCubeWire, godRayCones = [];
  let tableGroup, cakeGroup, beetleGroup, childCards = [];
  let quillStrokeGroup, clayLoopGroup, fadedMirrorGhostGroup, beamLineMesh;
  let crownCanvas, crownTex, mirrorCanvas, mirrorTex;
  const texLoader = new T.TextureLoader();
  const texCache = {};
  const holoMaterials = [];

  function getTex(url) {
    if (!texCache[url]) {
      const t = texLoader.load(url);
      t.encoding = T.sRGBEncoding;
      texCache[url] = t;
    }
    return texCache[url];
  }

  // Real film calligraphy sprite sheet (生日快樂)
  const GLYPHS = { img: null, meta: null, ready: false };
  fetch('assets/v6/design/glyphs27.json')
    .then(r => r.json())
    .then(meta => {
      GLYPHS.meta = meta;
      const im = new Image();
      im.onload = () => {
        GLYPHS.img = im;
        GLYPHS.ready = true;
        updateCrownTexture();
      };
      im.src = 'assets/v6/design/glyphs27.png';
    })
    .catch(() => {});

  function initCrownTexture() {
    crownCanvas = document.createElement('canvas');
    crownCanvas.width = 512;
    crownCanvas.height = 512;
    crownTex = new T.CanvasTexture(crownCanvas);
    crownTex.encoding = T.sRGBEncoding;
    updateCrownTexture();
  }

  function updateCrownTexture() {
    if (!crownCanvas) return;
    const x = crownCanvas.getContext('2d'), w = 512, h = 512;
    const g = x.createRadialGradient(w * 0.46, h * 0.44, 16, w * 0.5, h * 0.5, w * 0.5);
    g.addColorStop(0, '#fbf3dc');
    g.addColorStop(0.65, '#f2dfba');
    g.addColorStop(1, '#d9bf8c');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);

    if (STATE.cake.bundt > 0.08) {
      const wg = x.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, 118 * STATE.cake.bundt);
      wg.addColorStop(0, `rgba(26, 12, 5, ${0.88 * STATE.cake.bundt})`);
      wg.addColorStop(0.7, `rgba(72, 38, 16, ${0.52 * STATE.cake.bundt})`);
      wg.addColorStop(1, 'rgba(240, 222, 185, 0)');
      x.fillStyle = wg;
      x.beginPath();
      x.arc(w / 2, h / 2, 120, 0, Math.PI * 2);
      x.fill();
    }

    // Smarties dragees
    const cols = ['#d84339', '#3b82c4', '#4caf50', '#f5b027', '#8e44ad', '#e67e22'];
    const nDrag = Math.max(6, STATE.cake.candles * 2);
    for (let i = 0; i < nDrag; i++) {
      const a = (i / nDrag) * Math.PI * 2 + 0.35;
      const dx = w / 2 + Math.cos(a) * 188;
      const dy = h / 2 + Math.sin(a) * 188;
      x.save();
      x.translate(dx, dy);
      x.rotate(a);
      x.fillStyle = cols[i % cols.length];
      x.beginPath();
      x.ellipse(0, 0, 8.5, 6, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }

    // Piped 生日快樂 Calligraphy
    const p = Math.max(0, Math.min(1, STATE.cake.pipeProgress));
    if (p > 0.01) {
      if (GLYPHS.ready && STATE.cake.customText === '生日快樂') {
        const M = GLYPHS.meta;
        const dstX = 96, dstY = 235, dstW = 320, dstH = 78;
        const cP = Math.min(1, p / 0.85);
        for (let c = 0; c < 4; c++) {
          const u = Math.max(0, Math.min(1, cP * 4 - c));
          if (u <= 0) continue;
          const x0 = M.cuts[c], cw = M.cuts[c + 1] - x0;
          const sy = Math.min(M.S - 1, Math.floor(u * M.S)) * M.HH;
          x.drawImage(GLYPHS.img, x0, sy, cw, M.H, dstX + (x0 / M.W) * dstW, dstY, (cw / M.W) * dstW, dstH);
        }
        if (p > 0.85) {
          const u = Math.min(1, (p - 0.85) / 0.15);
          const wPx = Math.max(1, Math.round(M.W * u));
          x.drawImage(GLYPHS.img, 0, M.S * M.HH + M.H, wPx, M.HH - M.H, dstX, dstY + dstH - 6, (wPx / M.W) * dstW, 56);
        }
      } else {
        x.save();
        x.translate(w / 2, h * 0.58);
        x.font = 'bold 50px "Songti SC","Kaiti SC",serif';
        x.textAlign = 'center';
        x.fillStyle = '#c82822';
        x.fillText(STATE.cake.customText || '生日快樂', 0, 0);
        x.restore();
      }
    }
    crownTex.needsUpdate = true;
  }

  /* ---------------- 8. Build Collection 01_PHYSICAL_LAB ---------------- */
  function buildPhysicalLabCollection() {
    colPhysicalLab = new T.Group();
    colPhysicalLab.name = '01_PHYSICAL_LAB';

    // 1. Recessed Concrete Floor Pit (Inset + Extrude basin with concentric rings)
    const pitOuter = new T.Mesh(
      new T.RingGeometry(4.0, 14.0, 96),
      new T.MeshStandardMaterial({ color: 0x07090b, roughness: 0.35, metalness: 0.25, side: T.DoubleSide })
    );
    pitOuter.rotation.x = -Math.PI / 2;
    pitOuter.position.y = -2.05;
    colPhysicalLab.add(pitOuter);

    const pitWall = new T.Mesh(
      new T.CylinderGeometry(4.0, 3.85, 0.32, 96, 1, true),
      new T.MeshStandardMaterial({ color: 0x12161b, roughness: 0.5, metalness: 0.3, side: T.DoubleSide })
    );
    pitWall.position.y = -2.21;
    colPhysicalLab.add(pitWall);

    const pitFloor = new T.Mesh(
      new T.CircleGeometry(3.85, 96),
      new T.MeshStandardMaterial({ color: 0x090c10, roughness: 0.32, metalness: 0.2 })
    );
    pitFloor.rotation.x = -Math.PI / 2;
    pitFloor.position.y = -2.37;
    colPhysicalLab.add(pitFloor);

    for (let k = 0; k < 4; k++) {
      const rRing = new T.Mesh(
        new T.TorusGeometry(1.6 + k * 0.72, 0.01, 6, 96),
        new T.MeshBasicMaterial({ color: 0x3b4852, transparent: true, opacity: 0.42 })
      );
      rRing.rotation.x = Math.PI / 2;
      rRing.position.y = -2.35;
      colPhysicalLab.add(rRing);
    }

    // 2. Cylindrical Glass Containment Partition (R=4.0m, H=5.0m, IOR 1.45, Is Shadow Ray Bypass)
    const glassGeo = new T.CylinderGeometry(4.0, 4.0, 5.2, 96, 1, true);
    const glassMat = new T.MeshPhysicalMaterial({
      color: 0xa8d8ea,
      transparent: true,
      opacity: 0.14,
      roughness: 0.03,
      metalness: 0.05,
      reflectivity: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      side: T.DoubleSide,
      depthWrite: false
    });
    glassDomeMesh = new T.Mesh(glassGeo, glassMat);
    glassDomeMesh.position.y = 0.4;
    colPhysicalLab.add(glassDomeMesh);

    // Subtle vertical glass mullion seams
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const seam = new T.Mesh(
        new T.CylinderGeometry(0.012, 0.012, 5.2, 6),
        new T.MeshBasicMaterial({ color: 0x567282, transparent: true, opacity: 0.32 })
      );
      seam.position.set(Math.sin(a) * 4.0, 0.4, Math.cos(a) * 4.0);
      colPhysicalLab.add(seam);
    }

    // 3. Clinical White Overhead Ring Diffuser (4500K, 500W Area Disk/Torus)
    overheadRingMesh = new T.Mesh(
      new T.TorusGeometry(3.65, 0.065, 12, 128),
      new T.MeshBasicMaterial({ color: 0xeaf4f8 })
    );
    overheadRingMesh.rotation.x = Math.PI / 2;
    overheadRingMesh.position.y = 2.85;
    colPhysicalLab.add(overheadRingMesh);

    // 4. Exterior Silhouette Observer (Officer K outside the glass partition in dark contrast)
    observerKGroup = new T.Group();
    observerKGroup.position.set(2.45, -0.35, -4.35);
    observerKGroup.rotation.y = -0.45;
    const kSilPlane = new T.Mesh(
      new T.PlaneGeometry(1.75, 2.45),
      new T.MeshBasicMaterial({
        map: getTex('assets/v6/atlas/f40_00.jpg'),
        transparent: true,
        opacity: 0.88
      })
    );
    observerKGroup.add(kSilPlane);
    const kFrame = new T.Mesh(
      new T.BoxGeometry(1.82, 2.52, 0.06),
      new T.MeshBasicMaterial({ color: 0x486575, wireframe: true, transparent: true, opacity: 0.48 })
    );
    observerKGroup.add(kFrame);
    colPhysicalLab.add(observerKGroup);

    scene.add(colPhysicalLab);
  }

  /* ---------------- 9. Build Collection 02_HOLOGRAM_MEMORY ---------------- */
  function buildHologramMemoryCollection() {
    colHologramMemory = new T.Group();
    colHologramMemory.name = '02_HOLOGRAM_MEMORY';

    // Single Weaver_Control Empty (Master Driver for Hologram Shaders & Time Offset)
    weaverEmpty = new T.Group();
    weaverEmpty.name = 'Weaver_Control_Empty';
    colHologramMemory.add(weaverEmpty);

    // 1. Bounded Principled Volume Cube (Wireframe display = ON, prevents infinite raymarch lag)
    const volBoxGeo = new T.BoxGeometry(6.8, 4.4, 6.8);
    const volEdges = new T.EdgesGeometry(volBoxGeo);
    volumeCubeWire = new T.LineSegments(
      volEdges,
      new T.LineBasicMaterial({ color: 0x38d9c0, transparent: true, opacity: 0.28 })
    );
    volumeCubeWire.position.set(0, 0.05, -0.35);
    colHologramMemory.add(volumeCubeWire);

    // Anisotropic Tyndall God-Ray Cones inside the Volume_Cube
    for (let i = 0; i < 3; i++) {
      const coneGeo = new T.ConeGeometry(1.65 + i * 0.45, 4.6, 48, 1, true);
      const coneMat = new T.MeshBasicMaterial({
        color: i === 1 ? 0xffd180 : 0x8ce8ff,
        transparent: true,
        opacity: 0.055,
        side: T.DoubleSide,
        depthWrite: false,
        blending: T.AdditiveBlending
      });
      const cone = new T.Mesh(coneGeo, coneMat);
      cone.position.set((i - 1) * 0.65, 0.55, -0.35);
      godRayCones.push(cone);
      colHologramMemory.add(cone);
    }

    // 2. Backdrop Film Memory Plate (Softly blended inside the dome)
    const backPlane = new T.Mesh(
      new T.PlaneGeometry(14.5, 8.15),
      new T.MeshBasicMaterial({
        map: getTex('assets/v5/atlas/b24.jpg'),
        transparent: true,
        opacity: 0.72,
        depthWrite: false
      })
    );
    backPlane.position.set(0, 0.35, -4.1);
    colHologramMemory.add(backPlane);

    // 3. Hexagonal Amber Illuminated Table
    tableGroup = new T.Group();
    tableGroup.position.set(0, -1.58, -0.35);
    const hexMat = makeHoloMaterial({ color: 0xd49b35, rimColor: 0xffcc66 });
    holoMaterials.push(hexMat);
    const hexTop = new T.Mesh(new T.CylinderGeometry(2.32, 2.32, 0.12, 6), hexMat);
    hexTop.rotation.y = Math.PI / 6;
    hexTop.userData.seedId = 'Env_Dome';
    tableGroup.add(hexTop);

    const pedMat = new T.MeshStandardMaterial({ color: 0x15110c, roughness: 0.7, metalness: 0.3 });
    const pedestal = new T.Mesh(new T.CylinderGeometry(0.62, 0.92, 1.0, 6), pedMat);
    pedestal.position.y = -0.56;
    tableGroup.add(pedestal);
    colHologramMemory.add(tableGroup);

    // 4. Multi-Pass Embodied Characters (Pass 2: Char_Child_01, Pass 3: Char_Child_02, Pass 4: Witnesses)
    const c24Tex = getTex('assets/v5/atlas/c24.jpg');
    const m24Tex = texLoader.load('assets/v5/atlas/m24.png');
    m24Tex.minFilter = T.NearestFilter;
    m24Tex.magFilter = T.NearestFilter;
    const d24Tex = texLoader.load('assets/v5/atlas/d24.png');

    const CHILD_VS = `
      uniform sampler2D depthMap;
      uniform float relief;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        float d = texture2D(depthMap, clamp(uv, 0.0, 1.0)).r;
        vec3 p = position + vec3(0.0, 0.0, (d - 0.5) * relief);
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;
    const CHILD_FS = `
      uniform sampler2D map, maskMap;
      uniform float kId, lightK, squeeze, wavePhase, embodiedGlow;
      uniform vec3 candlePos;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      float isMask(vec2 u) {
        float mv = texture2D(maskMap, clamp(u, 0.001, 0.999)).r * 255.0;
        return step(abs(mv - kId), 0.6);
      }
      void main() {
        vec2 px = vec2(1.0 / 640.0, 1.0 / 360.0);
        float a = isMask(vUv);
        float sum = 0.0;
        for (int i = -1; i <= 1; i++) {
          for (int j = -1; j <= 1; j++) {
            sum += isMask(vUv + vec2(float(i), float(j)) * px * 1.6);
          }
        }
        float alpha = smoothstep(0.18, 0.85, (a * 3.0 + sum) / 12.0);
        if (alpha < 0.03) discard;
        vec3 col = texture2D(map, vUv).rgb;
        float dist = length(vWorldPos - candlePos);
        float warmBounce = clamp(2.4 / (1.0 + dist * dist * 0.45), 0.15, 1.65) * lightK;
        vec3 solidCol = col * mix(vec3(0.14, 0.18, 0.25), vec3(1.25, 1.08, 0.88), clamp(warmBounce, 0.0, 1.35));

        // Hologram scanline wave & Fresnel rim
        float scan = 0.55 + 0.45 * sin(vWorldPos.y * 42.0 - wavePhase * 7.0);
        float rim = a * (1.0 - step(8.5, sum));
        float holoFade = 1.0 - smoothstep(0.72, 0.92, squeeze);
        vec3 holoCol = solidCol * scan + vec3(0.35, 0.92, 0.85) * rim * 0.85;

        vec3 outCol = mix(holoCol, solidCol, clamp(squeeze, 0.0, 1.0));
        outCol += rim * vec3(0.35, 0.92, 0.85) * 0.45 * holoFade;
        outCol += embodiedGlow * rim * vec3(1.0, 0.82, 0.35) * 0.55;
        float outAlpha = alpha * mix(0.62, 1.0, clamp(squeeze, 0.0, 1.0));
        gl_FragColor = vec4(outCol, outAlpha);
      }
    `;

    const childSpecs = [
      { k: 2, z: -1.45, seedId: 'Char_Child_03', passIdx: 1 },
      { k: 3, z: -1.82, seedId: 'Char_Child_02', passIdx: 2 }, // Embodied by Operator Now (Pass 3)
      { k: 4, z: -1.76, seedId: 'Char_Child_01', passIdx: 1 }, // Recorded MoCap Pass 2 (Blowing Candles)
      { k: 5, z: -1.35, seedId: 'Char_Child_03', passIdx: 1 }
    ];

    childCards = childSpecs.map((cs, idx) => {
      const geo = new T.PlaneGeometry(9.2, 5.18, 96, 54);
      const mat = new T.ShaderMaterial({
        vertexShader: CHILD_VS,
        fragmentShader: CHILD_FS,
        transparent: true,
        depthWrite: false,
        uniforms: {
          map: { value: c24Tex },
          maskMap: { value: m24Tex },
          depthMap: { value: d24Tex },
          kId: { value: cs.k },
          relief: { value: 0.55 },
          lightK: { value: 1.0 },
          squeeze: { value: STATE.weaver.squeeze },
          wavePhase: { value: 0.0 },
          embodiedGlow: { value: 0.0 },
          candlePos: { value: new T.Vector3(0, -0.35, -0.2) }
        }
      });
      const m = new T.Mesh(geo, mat);
      m.position.set(0, 0.05, cs.z);
      m.userData.basePos = m.position.clone();
      m.userData.seedId = cs.seedId;
      m.userData.passIdx = cs.passIdx;
      m.userData.idx = idx;
      colHologramMemory.add(m);
      return m;
    });

    // 5. Hero Prop A: Birthday Cake (Prop_Cake)
    cakeGroup = new T.Group();
    cakeGroup.position.set(0, -1.51, -0.35);
    colHologramMemory.add(cakeGroup);
    rebuildCakeProp();

    // 6. Hero Prop B: Anchored Iridescent Beetle on Leaf Socket (Prop_Beetle)
    beetleGroup = new T.Group();
    beetleGroup.position.set(-1.35, -1.18, 0.35);
    beetleGroup.rotation.y = 0.55;
    colHologramMemory.add(beetleGroup);
    rebuildBeetleProp();

    // 7. Quill 2.8 Anim Brush Volumetric Ribbon Strokes (Quill_AnimBrush)
    quillStrokeGroup = new T.Group();
    buildQuillAnimStrokes();
    colHologramMemory.add(quillStrokeGroup);

    // 8. Clayground 4-Pose Stop-Motion Loop + Cyan/Amber Onion Skins (Clay_StopMotion)
    clayLoopGroup = new T.Group();
    clayLoopGroup.position.set(1.38, -1.36, 0.25);
    buildClayOnionSkinRig();
    colHologramMemory.add(clayLoopGroup);

    // 9. In-World Faded Mirror / 85mm Camera Framing Ghost (Animotive 04:16 / 04:22)
    buildFadedMirrorGhost();
    colHologramMemory.add(fadedMirrorGhostGroup);

    // 10. Volumetric Tether Beam from Orb to Active Target (when Half-Squeeze held)
    const beamGeo = new T.BufferGeometry().setFromPoints([
      new T.Vector3(0, -1.8, 2.2),
      new T.Vector3(0, -0.9, -0.35)
    ]);
    beamLineMesh = new T.Line(
      beamGeo,
      new T.LineBasicMaterial({ color: 0x5ff0dc, transparent: true, opacity: 0.65 })
    );
    colHologramMemory.add(beamLineMesh);

    scene.add(colHologramMemory);
  }

  let lastCakeSig = '';
  function rebuildCakeProp() {
    if (!cakeGroup || !window.ANATOMY) return;
    const sig = [
      STATE.cake.bundt.toFixed(2),
      STATE.cake.candles,
      STATE.cake.flames.toFixed(2),
      STATE.weaver.squeeze.toFixed(2)
    ].join('|');
    if (sig === lastCakeSig && cakeGroup.children.length > 0) return;
    lastCakeSig = sig;

    while (cakeGroup.children.length) {
      const ch = cakeGroup.children.pop();
      ch.traverse(o => o.geometry && o.geometry.dispose());
    }

    const cakeObj = window.ANATOMY.cake({
      bundt: STATE.cake.bundt,
      candles: STATE.cake.candles,
      flames: STATE.cake.flames,
      icing: 0,
      skin: 0
    }, performance.now());

    cakeObj.scale.setScalar(STATE.cake.scale);
    cakeObj.traverse(o => {
      if (o.isMesh) {
        o.userData.seedId = 'Prop_Cake';
        o.castShadow = false; // VOID CONTRACT: 02_HOLOGRAM_MEMORY never casts hard black physical shadows
        if (o.userData.sk === 'top' && crownTex) {
          o.material = makeHoloMaterial({ map: crownTex, rimColor: 0xffcc66 });
        } else if (o.userData.sk === 'body') {
          o.material = makeHoloMaterial({ map: o.material.map, color: 0x3b1e0e, rimColor: 0x5ff0dc });
        }
      }
    });
    cakeGroup.add(cakeObj);
  }

  let lastBeetleSig = '';
  function rebuildBeetleProp() {
    if (!beetleGroup || !window.ANATOMY) return;
    const sig = [
      STATE.beetle.speciesIdx,
      STATE.beetle.focusR.toFixed(2),
      STATE.beetle.setae.toFixed(2)
    ].join('|');
    if (sig === lastBeetleSig && beetleGroup.children.length > 0) return;
    lastBeetleSig = sig;

    while (beetleGroup.children.length) {
      const ch = beetleGroup.children.pop();
      ch.traverse(o => o.geometry && o.geometry.dispose());
    }

    // Support leaf patch (elderberry_leaf_01#T142)
    const leafGeo = new T.PlaneGeometry(1.15, 0.85, 16, 16);
    const lp = leafGeo.attributes.position;
    for (let i = 0; i < lp.count; i++) {
      lp.setZ(i, -Math.pow(lp.getX(i), 2) * 0.22);
    }
    leafGeo.computeVertexNormals();
    const leafMesh = new T.Mesh(
      leafGeo,
      new T.MeshStandardMaterial({
        map: getTex('assets/v6/atlas/f05_03.jpg'),
        color: 0x4d7c38,
        roughness: 0.65,
        side: T.DoubleSide
      })
    );
    leafMesh.rotation.x = -Math.PI / 2 + 0.15;
    leafMesh.position.y = -0.12;
    leafMesh.userData.seedId = 'Prop_Beetle';
    beetleGroup.add(leafMesh);

    const bt = window.ANATOMY.beetle({
      sheen: 0.65,
      focusR: STATE.beetle.focusR,
      focusL: STATE.beetle.focusL,
      setae: STATE.beetle.setae,
      gait: 0.5,
      skin: 0
    }, performance.now());
    bt.scale.setScalar(0.32 * STATE.beetle.scale);
    bt.traverse(o => {
      if (o.isMesh) {
        o.userData.seedId = 'Prop_Beetle';
        o.castShadow = false;
      }
    });
    beetleGroup.add(bt);
  }

  /* ---------------- 10. Quill Anim Brush & Clayground Onion-Skin Rigs ---------------- */
  let quillRibbons = [];
  function buildQuillAnimStrokes() {
    while (quillStrokeGroup.children.length) {
      quillStrokeGroup.children.pop();
    }
    quillRibbons = [];
    // 18 Volumetric Quill Anim-Brush ember filaments framing the containment dome perimeter
    for (let i = 0; i < 18; i++) {
      const pts = [];
      const baseAngle = (i / 18) * Math.PI * 2;
      const rad = 1.72 + (i % 3) * 0.36;
      for (let j = 0; j < 20; j++) {
        const u = j / 19;
        const a = baseAngle + u * 1.15;
        pts.push(new T.Vector3(
          Math.cos(a) * (rad - u * 0.22),
          -1.35 + u * 2.15 + Math.sin(u * Math.PI * 2 + i) * 0.06,
          -0.45 + Math.sin(a) * (rad - u * 0.22)
        ));
      }
      const curve = new T.CatmullRomCurve3(pts);
      const geo = new T.TubeGeometry(curve, 24, 0.0038 + (i % 2) * 0.0018, 6, false);
      const col = i % 3 === 0 ? 0xffcc66 : i % 3 === 1 ? 0x5ff0dc : 0xff9f43;
      const mat = new T.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.26,
        blending: T.AdditiveBlending
      });
      const m = new T.Mesh(geo, mat);
      m.userData.seedId = 'Quill_AnimBrush';
      m.userData.baseIndex = i;
      quillStrokeGroup.add(m);
      quillRibbons.push(m);
    }
  }

  let clayCurrMesh, clayPrevGhost, clayNextGhost;
  function buildClayOnionSkinRig() {
    while (clayLoopGroup.children.length) {
      clayLoopGroup.children.pop();
    }
    // Clayground stop-motion character/sculpture beside the cake with Prev (Cyan Squash) & Next (Amber Stretch) Onion Skins
    const clayGeo = new T.SphereGeometry(0.22, 28, 22);
    const currMat = makeHoloMaterial({ color: 0xe69f66, rimColor: 0xffcc66 });
    clayCurrMesh = new T.Mesh(clayGeo, currMat);
    clayCurrMesh.userData.seedId = 'Clay_StopMotion';
    clayLoopGroup.add(clayCurrMesh);

    const prevMat = new T.MeshBasicMaterial({
      color: 0x5ff0dc,
      wireframe: true,
      transparent: true,
      opacity: 0.36
    });
    clayPrevGhost = new T.Mesh(clayGeo, prevMat);
    clayPrevGhost.position.set(-0.22, -0.04, 0);
    clayPrevGhost.scale.set(1.28, 0.72, 1.28); // Squash pose (Frame N-1)
    clayLoopGroup.add(clayPrevGhost);

    const nextMat = new T.MeshBasicMaterial({
      color: 0xffb84d,
      wireframe: true,
      transparent: true,
      opacity: 0.36
    });
    clayNextGhost = new T.Mesh(clayGeo, nextMat);
    clayNextGhost.position.set(0.22, 0.14, 0);
    clayNextGhost.scale.set(0.76, 1.38, 0.76); // Stretch pose (Frame N+1)
    clayLoopGroup.add(clayNextGhost);
  }

  /* ---------------- 11. In-World Faded Mirror / 85mm Framing Ghost (Animotive 04:22) ---------------- */
  function buildFadedMirrorGhost() {
    fadedMirrorGhostGroup = new T.Group();
    fadedMirrorGhostGroup.position.set(-1.68, 0.12, -1.15);
    fadedMirrorGhostGroup.rotation.y = 0.32;

    mirrorCanvas = document.createElement('canvas');
    mirrorCanvas.width = 512;
    mirrorCanvas.height = 320;
    mirrorTex = new T.CanvasTexture(mirrorCanvas);

    const plane = new T.Mesh(
      new T.PlaneGeometry(2.15, 1.35),
      new T.MeshBasicMaterial({
        map: mirrorTex,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        side: T.DoubleSide
      })
    );
    plane.userData.seedId = 'Lens_85mm';
    fadedMirrorGhostGroup.add(plane);
    updateFadedMirrorCanvas(0);
  }

  function updateFadedMirrorCanvas(t) {
    if (!mirrorCanvas) return;
    const x = mirrorCanvas.getContext('2d'), W = 512, H = 320;
    x.clearRect(0, 0, W, H);

    // Translucent 85mm Viewfinder & Faded Mirror Ghost Backdrop
    x.fillStyle = 'rgba(6, 14, 20, 0.58)';
    x.fillRect(4, 4, W - 8, H - 8);
    x.strokeStyle = 'rgba(95, 240, 220, 0.75)';
    x.lineWidth = 2;
    x.strokeRect(6, 6, W - 12, H - 12);

    // Corner 85mm optical brackets
    const bLen = 22;
    x.strokeStyle = '#ffcc66';
    x.lineWidth = 3;
    [[12, 12, 1, 1], [W - 12, 12, -1, 1], [12, H - 12, 1, -1], [W - 12, H - 12, -1, -1]].forEach(([bx, by, sx, sy]) => {
      x.beginPath();
      x.moveTo(bx, by + sy * bLen);
      x.lineTo(bx, by);
      x.lineTo(bx + sx * bLen, by);
      x.stroke();
    });

    // Top HUD inside the in-world Faded Mirror Ghost
    x.font = '700 13px "JetBrains Mono","SF Mono",monospace';
    x.fillStyle = '#5ff0dc';
    x.fillText(`FADED MIRROR GHOST // LENS ${STATE.optics.focalLength}MM f/${STATE.optics.fStop.toFixed(1)}`, 22, 30);

    x.font = '600 11px "JetBrains Mono",monospace';
    x.fillStyle = '#ffcc66';
    x.fillText(`EMBODIED: ${STATE.loop.embodiedChar.toUpperCase()} · ${STATE.loop.recordingPass ? 'REC PASS ACTIVE' : 'EYELINE LOCKED'}`, 22, 48);

    // Silhouette Ghost of Embodied Performer + Recorded Pass 2 Performer + Cake Eyeline Target
    const cx = W * 0.5, cy = H * 0.62;
    const sway = Math.sin(t * 2.2) * 10;

    // Pass 2 Ghost (Char_Child_01 playing back)
    x.strokeStyle = 'rgba(152, 245, 176, 0.65)';
    x.lineWidth = 2;
    x.beginPath();
    x.arc(cx + 68, cy - 38, 22, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = 'rgba(152, 245, 176, 0.14)';
    x.fill();

    // Pass 3 Ghost (You: Embodied as Char_Child_02)
    x.strokeStyle = 'rgba(255, 204, 102, 0.92)';
    x.lineWidth = 2.5;
    x.beginPath();
    x.arc(cx - 58 + sway, cy - 42, 25, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = 'rgba(255, 204, 102, 0.22)';
    x.fill();

    // Eyeline Convergence Vector to Birthday Cake Crown
    x.setLineDash([4, 4]);
    x.strokeStyle = 'rgba(95, 240, 220, 0.72)';
    x.beginPath();
    x.moveTo(cx - 58 + sway, cy - 42);
    x.lineTo(cx + 4, cy + 32);
    x.lineTo(cx + 68, cy - 38);
    x.stroke();
    x.setLineDash([]);

    // Cake Framing Target
    x.strokeStyle = '#ff9f43';
    x.strokeRect(cx - 38, cy + 16, 84, 42);
    x.fillStyle = '#e8f0f6';
    x.font = '600 10px "JetBrains Mono",monospace';
    x.fillText(`DOF TARGET: ${STATE.optics.focusDist.toFixed(1)}m · VOL ${(STATE.optics.volumeDensity * 1000).toFixed(0)}m`, 22, H - 18);

    mirrorTex.needsUpdate = true;
  }

  /* ---------------- 12. Operations: Outer / Middle / Inner Rings, Squeeze, & Thumb-Iris ---------------- */
  function selectSeed(idx) {
    STATE.seedIdx = (idx + SEEDS.length) % SEEDS.length;
    const seed = SEEDS[STATE.seedIdx];
    if (seed.id === 'Prop_Beetle') STATE.beetle.projected = true;
    if (seed.id === 'Lens_85mm') STATE.optics.fadedMirrorGhost = true;
    STATE.opState = 'READY (SEED)';
    playDetentTick(2400, 0.03);
  }

  function projectActiveSeedToRoom() {
    const seed = SEEDS[STATE.seedIdx];
    if (seed.id === 'Prop_Beetle') STATE.beetle.projected = true;
    if (seed.id === 'Prop_Cake') STATE.cake.projected = true;
    if (seed.id === 'Lens_85mm') STATE.optics.fadedMirrorGhost = true;
    if (seed.id === 'Clay_StopMotion') STATE.clay.active = true;
    if (seed.id === 'Quill_AnimBrush') STATE.quill.active = true;
    STATE.weaver.squeeze = Math.max(0.75, STATE.weaver.squeeze);
    STATE.opState = 'WORKING (WEAVE)';
    playDetentTick(1650, 0.04);
  }

  function turnRing(ringName, delta) {
    STATE.activeRing = ringName;
    STATE.ringAngles[ringName] = (STATE.ringAngles[ringName] + delta * 0.35 + 10) % 1;
    playDetentTick(ringName === 'outer' ? 1850 : ringName === 'middle' ? 2350 : 2850, 0.02);

    const seed = SEEDS[STATE.seedIdx];

    if (ringName === 'outer') {
      // OUTER RING: Cycle Holographic Seed inside the Orb's core
      if (Math.abs(delta) > 0.035) {
        selectSeed(STATE.seedIdx + (delta > 0 ? 1 : -1));
      }
    } else if (ringName === 'middle') {
      // MIDDLE RING: Scale & Organic Deform (Replaces Blender S, Modifiers, Extrude/Bundt, Clay Squash/Stretch)
      STATE.opState = 'WORKING (WEAVE)';
      if (seed.id === 'Prop_Cake' || seed.id === 'Env_Dome') {
        STATE.cake.bundt = Math.max(0, Math.min(1, STATE.cake.bundt + delta * 0.7));
        if (Math.abs(delta) > 0.06) {
          STATE.cake.candles = Math.max(1, Math.min(12, Math.round(STATE.cake.candles + delta * 5)));
        }
        updateCrownTexture();
        rebuildCakeProp();
      } else if (seed.id === 'Prop_Beetle') {
        STATE.beetle. projected = true;
        STATE.beetle.focusR = Math.max(0.1, Math.min(1, STATE.beetle.focusR + delta * 0.65));
        STATE.beetle.setae = Math.max(0, Math.min(1, STATE.beetle.setae + delta * 0.65));
        if (Math.abs(delta) > 0.08) {
          STATE.beetle.speciesIdx = (STATE.beetle.speciesIdx + (delta > 0 ? 1 : -1) + 4) % 4;
        }
        rebuildBeetleProp();
      } else if (seed.id === 'Clay_StopMotion') {
        STATE.clay.squashFactor = Math.max(-0.6, Math.min(0.8, STATE.clay.squashFactor + delta * 0.8));
      } else if (seed.id === 'Quill_AnimBrush') {
        STATE.quill.boilAmp = Math.max(0.05, Math.min(1.5, STATE.quill.boilAmp + delta * 0.75));
      } else {
        STATE.cake.scale = Math.max(0.75, Math.min(1.85, STATE.cake.scale + delta * 0.45));
        rebuildCakeProp();
      }
    } else if (ringName === 'inner') {
      // INNER RING: Time Scrub (00:00..15:00), Volumetric Fog Density, & 85mm DOF Focus
      if (STATE.weaver.timelineCollapsed) {
        // VOID CONTRACT: When Timeline is Collapsed (Sculpt Mode), Inner Ring dials Optics/Volume only — zero accidental frame stepping!
        STATE.optics.volumeDensity = Math.max(0.005, Math.min(0.08, STATE.optics.volumeDensity + delta * 0.035));
        STATE.optics.fStop = Math.max(1.4, Math.min(16.0, STATE.optics.fStop + delta * 4.5));
      } else {
        STATE.loop.time = (STATE.loop.time + delta * 4.5 + STATE.loop.duration) % STATE.loop.duration;
        STATE.weaver.rotZ += delta * 2.2;
        STATE.weaver.locY = STATE.loop.time / STATE.loop.duration;
        // Also gently modulate volumetric density & candle breath at end of loop
        if (seed.id === 'Lens_85mm' || seed.id === 'Env_Dome') {
          STATE.optics.volumeDensity = Math.max(0.008, Math.min(0.075, STATE.optics.volumeDensity + delta * 0.025));
          STATE.optics.fStop = Math.max(1.4, Math.min(11.0, STATE.optics.fStop - delta * 2.5));
        }
        // At t > 11.5s, child's breath blows out candles!
        const blowFactor = STATE.loop.time > 11.5 ? Math.max(0, 1 - (STATE.loop.time - 11.5) / 2.2) : 1.0;
        if (Math.abs(blowFactor - STATE.cake.flames) > 0.05) {
          STATE.cake.flames = blowFactor;
          rebuildCakeProp();
        }
      }
      STATE.opState = 'CHANGED';
    }
  }

  function setSqueezePressure(val) {
    STATE.weaver.squeeze = Math.max(0, Math.min(1, val));
    STATE.weaver.tethered = STATE.weaver.squeeze >= 0.42 && STATE.weaver.squeeze <= 0.68;
    if (STATE.weaver.squeeze < 0.15) {
      STATE.opState = 'READY (SEED)';
    } else if (STATE.weaver.tethered) {
      STATE.opState = 'WORKING (WEAVE)';
    } else if (STATE.weaver.squeeze > 0.9) {
      STATE.opState = 'CHANGED';
    }
  }

  function tapThumbIris() {
    playDetentTick(1420, 0.045);
    const seed = SEEDS[STATE.seedIdx];
    if (seed.id.startsWith('Char_')) {
      STATE.loop.embodiedChar = seed.id;
    }
    STATE.loop.recordingPass = !STATE.loop.recordingPass;
    if (STATE.loop.recordingPass) {
      STATE.opState = 'WORKING (EMBODY)';
      STATE.optics.fadedMirrorGhost = true;
      STATE.loop.playing = true;
    } else {
      STATE.opState = 'CHANGED';
      STATE.loop.passes[2].status = 'COMMITTED PASS';
    }
  }

  function rewindToZeroAndSwitchCharacter() {
    // Animotive 07:22 workflow: Rewind Inner Ring to 00:00 and switch embodied character pass
    playDetentTick(1200, 0.04);
    STATE.loop.time = 0.0;
    STATE.loop.embodiedChar = STATE.loop.embodiedChar === 'Char_Child_01' ? 'Char_Child_02' : 'Char_Child_01';
    STATE.opState = 'WORKING (EMBODY)';
    STATE.optics.fadedMirrorGhost = true;
  }

  function optimizeAndBakeSequence() {
    // Quill 2.3+ / 2.5+ Live Performance & Bake Monitor: Traceable Optimization
    playDetentTick(3100, 0.04);
    STATE.perf.bakedLoop = true;
    STATE.perf.optimizedStrokes = true;
    STATE.perf.memMB = 19.4;
    STATE.perf.polyCount = 48600;
    STATE.perf.drawCalls = 11;
    STATE.opState = 'COMPLETE';
  }

  function triggerFaultRecovery() {
    // Section 7 Failure Recovery: Instant rollback & FixFlip / IsShadowRay / Fog / Mirror restoration
    playDetentTick(1950, 0.04);
    STATE.optics.isShadowRayBypass = true;
    STATE.optics.volumeDensity = 0.030;
    STATE.optics.fadedMirrorGhost = true;
    STATE.perf.fixFlip = true;
    STATE.weaver.squeeze = 0.92;
    STATE.opState = 'RECOVERY';
  }

  function runImplementationStep(stepNum) {
    STATE.implStep = stepNum;
    playDetentTick(2500, 0.035);
    if (stepNum === 1) {
      // 1. Cast the Room
      STATE.seedIdx = 0; // Env_Dome
      STATE.weaver.squeeze = 1.0;
      STATE.opState = 'READY (SEED)';
    } else if (stepNum === 2) {
      // 2. Dial the Atmosphere
      STATE.seedIdx = 0;
      STATE.activeRing = 'inner';
      STATE.optics.volumeDensity = 0.038;
      STATE.optics.showVolumeWire = true;
      STATE.opState = 'WORKING (WEAVE)';
    } else if (stepNum === 3) {
      // 3. Weave the Hero Props
      STATE.seedIdx = 1; // Prop_Cake
      STATE.activeRing = 'middle';
      STATE.cake.bundt = 0.85;
      STATE.beetle.projected = true;
      STATE.weaver.squeeze = 0.94;
      rebuildCakeProp();
      rebuildBeetleProp();
      STATE.opState = 'WORKING (WEAVE)';
    } else if (stepNum === 4) {
      // 4. Place the Virtual Lens (85mm + Faded Mirror Ghost)
      STATE.seedIdx = 3; // Lens_85mm
      STATE.optics.fadedMirrorGhost = true;
      STATE.optics.fStop = 1.8;
      STATE.opState = 'WORKING (WEAVE)';
    } else if (stepNum === 5) {
      // 5. Layer Embodied Actors (Animotive Multi-Pass)
      STATE.seedIdx = 5; // Char_Child_02
      STATE.loop.embodiedChar = 'Char_Child_02';
      STATE.loop.recordingPass = true;
      STATE.optics.fadedMirrorGhost = true;
      STATE.opState = 'WORKING (EMBODY)';
    } else if (stepNum === 6) {
      // 6. Live Camera, Quill Anim Brush & Clay Onion Skin
      STATE.seedIdx = 8; // Clay_StopMotion
      STATE.clay.onionSkin = true;
      STATE.quill.active = true;
      STATE.weaver.tethered = true;
      STATE.opState = 'WORKING (WEAVE)';
    } else if (stepNum === 7) {
      // 7. Commit the Memory (Optimize/Bake + Export Ready)
      optimizeAndBakeSequence();
    }
  }

  /* ---------------- 13. Production Bridge Exporters (.USDA, .OBJ, .IMM.JSON, .PNG) ---------------- */
  function downloadBlob(filename, textOrBlob, mime = 'text/plain;charset=utf-8') {
    const blob = textOrBlob instanceof Blob ? textOrBlob : new Blob([textOrBlob], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 250);
  }

  function exportProductionPackage(format = 'usda') {
    optimizeAndBakeSequence();
    const fixFlipSign = STATE.perf.fixFlip ? 1 : -1;

    if (format === 'png') {
      renderer.render(scene, camera);
      renderer.domElement.toBlob(b => {
        if (b) downloadBlob('stelline_orb_05_master_frame.png', b, 'image/png');
      }, 'image/png');
      return;
    }

    if (format === 'imm') {
      const capsule = {
        schema: 'VESPER_FIELD_ORB_05_SPATIAL_CAPSULE',
        timestamp: new Date().toISOString(),
        voidContract: {
          strictCollections: ['01_PHYSICAL_LAB', '02_HOLOGRAM_MEMORY'],
          singleEmptyDriver: 'Weaver_Control_Empty',
          fixFlipEnabled: STATE.perf.fixFlip,
          isShadowRayBypass: STATE.optics.isShadowRayBypass
        },
        weaverDriver: STATE.weaver,
        optics85mm: STATE.optics,
        cakeProp: STATE.cake,
        beetleProp: STATE.beetle,
        clayOnionLoop: STATE.clay,
        multiPassTimeline: STATE.loop.passes,
        performanceMonitor: STATE.perf
      };
      downloadBlob('stelline_orb_05_capsule.imm.json', JSON.stringify(capsule, null, 2), 'application/json');
      return;
    }

    if (format === 'obj') {
      let obj = `# VESPER FIELD ORB 05 // WATER-TIGHT PRODUCTION .OBJ EXPORT\n`;
      obj += `# FixFlip=${STATE.perf.fixFlip} (Houdini/Blender Negative-Scale Normal Protection)\n`;
      let vOffset = 1;
      cakeGroup.traverse(m => {
        if (!m.isMesh || !m.geometry) return;
        const pos = m.geometry.attributes.position;
        if (!pos) return;
        obj += `o ${m.userData.sk || 'CakePart'}\n`;
        const v = new T.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
          obj += `v ${(v.x * fixFlipSign).toFixed(5)} ${v.y.toFixed(5)} ${v.z.toFixed(5)}\n`;
        }
        const idx = m.geometry.index;
        if (idx) {
          for (let i = 0; i < idx.count; i += 3) {
            const a = idx.getX(i) + vOffset;
            const b = idx.getX(i + 1) + vOffset;
            const c = idx.getX(i + 2) + vOffset;
            obj += STATE.perf.fixFlip ? `f ${a} ${b} ${c}\n` : `f ${a} ${c} ${b}\n`;
          }
        }
        vOffset += pos.count;
      });
      downloadBlob('stelline_orb_05_scene.obj', obj);
      return;
    }

    // Default: .USDA (Universal Scene Description ASCII with 01_PHYSICAL_LAB, 02_HOLOGRAM_MEMORY & Weaver_Control)
    const usda = `#usda 1.0
(
    defaultPrim = "StellineMemoryChamber"
    metersPerUnit = 1
    upAxis = "Y"
    doc = "Vesper Instruments Field Orb 05 — Stelline-Orb-Pro Live Virtual Production Graph (FixFlip=${STATE.perf.fixFlip})"
)

def Xform "StellineMemoryChamber"
{
    def Scope "01_PHYSICAL_LAB"
    {
        def Cylinder "Glass_Containment_Dome"
        {
            double height = 5.2
            double radius = 4.0
            float inputs:ior = 1.45
            float inputs:roughness = 0.03
            bool primvars:isShadowRayBypass = ${STATE.optics.isShadowRayBypass}
        }
        def Camera "Lens_85mm_Virtual_Cam"
        {
            float focalLength = ${STATE.optics.focalLength}
            float fStop = ${STATE.optics.fStop.toFixed(2)}
            float focusDistance = ${STATE.optics.focusDist.toFixed(2)}
        }
    }

    def Scope "02_HOLOGRAM_MEMORY"
    {
        def Xform "Weaver_Control_Empty"
        {
            double3 xformOp:translate = (0, ${STATE.weaver.locY.toFixed(3)}, 0)
            float xformOp:rotateZ = ${(STATE.weaver.rotZ * 57.2958).toFixed(2)}
            float custom:capacitiveSqueeze = ${STATE.weaver.squeeze.toFixed(3)}
            uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:rotateZ"]
        }
        def Cube "Bounded_Principled_Volume"
        {
            double size = 6.8
            float inputs:density = ${STATE.optics.volumeDensity.toFixed(4)}
            float inputs:anisotropy = ${STATE.optics.anisotropy.toFixed(2)}
        }
        def Xform "Prop_Birthday_Cake"
        {
            float custom:bundtFluteMorph = ${STATE.cake.bundt.toFixed(3)}
            int custom:candleCount = ${STATE.cake.candles}
            float custom:flameLuma = ${STATE.cake.flames.toFixed(3)}
            string custom:pipedInscription = "${STATE.cake.customText}"
            bool primvars:castShadows = false
        }
    }
}
`;
    downloadBlob('stelline_orb_05_scene.usda', usda);
  }

  /* ---------------- 14. Operable Stelline-Orb-Pro Hardware Deck (#orbProCanvas) ---------------- */
  let orbCanvas, orbCtx, orbDrag = null, holdTimer = null;

  function computeOrbLayout(W, H, dpr) {
    const narrow = W < 760 * dpr;
    const cx = W * 0.5;
    const cy = H * 0.50;
    const orbR = Math.min(W * (narrow ? 0.22 : 0.115), H * 0.34);

    // Side actuator columns cleanly separated from the concentric rings
    const btnXLeft = cx - orbR - 36 * dpr;
    const btnXRight = cx + orbR + 36 * dpr;

    // Left Tactile Wing: Capacitive Squeeze Bar & Bimanual World Scale Telemetry (anchored to left edge, zero overlap with buttons)
    const leftPanelX = Math.max(16 * dpr, btnXLeft - 310 * dpr);
    const leftPanelW = Math.max(180 * dpr, btnXLeft - 34 * dpr - leftPanelX);

    // Right Tactile Wing: Multi-Pass Sequencer, Performance/Bake Monitor & Export Bridge (anchored to right of right-side buttons)
    const rightPanelX = btnXRight + 38 * dpr;
    const rightPanelW = Math.min(340 * dpr, Math.max(210 * dpr, W - rightPanelX - 16 * dpr));

    return {
      W, H, dpr, narrow, cx, cy, orbR,
      rOuter: orbR * 0.96,
      rMiddle: orbR * 0.74,
      rInner: orbR * 0.54,
      rCore: orbR * 0.34,
      leftPanelX, leftPanelW,
      rightPanelX, rightPanelW,
      squeezeRect: [leftPanelX, cy - orbR * 0.78, 22 * dpr, orbR * 1.56],
      thumbBtn: [btnXRight, cy - orbR * 0.56, 24 * dpr],
      rewindBtn: [btnXRight, cy + orbR * 0.02, 21 * dpr],
      mirrorBtn: [btnXRight, cy + orbR * 0.58, 21 * dpr],
      castBtn: [btnXLeft, cy - orbR * 0.56, 23 * dpr],
      modeLockBtn: [btnXLeft, cy + orbR * 0.02, 21 * dpr],
      undoFlickBtn: [btnXLeft, cy + orbR * 0.58, 21 * dpr],
      stepRowY: H - 26 * dpr,
      seedRowY: 8 * dpr
    };
  }

  function initOrbDeck(canvas) {
    orbCanvas = canvas;
    orbCtx = canvas.getContext('2d');

    const getPos = e => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      return [
        (e.clientX - r.left) * (canvas.width / Math.max(1, r.width)),
        (e.clientY - r.top) * (canvas.height / Math.max(1, r.height)),
        dpr
      ];
    };

    canvas.addEventListener('pointerdown', e => {
      const [x, y, dpr] = getPos(e);
      const L = computeOrbLayout(canvas.width, canvas.height, dpr);

      // 1. Check Top Seed Selector Strip
      if (y >= L.seedRowY && y <= L.seedRowY + 22 * dpr) {
        const kw = Math.min(L.W / SEEDS.length, 128 * dpr);
        const x0 = L.cx - (kw * SEEDS.length) / 2;
        const idx = Math.floor((x - x0) / kw);
        if (idx >= 0 && idx < SEEDS.length) {
          selectSeed(idx);
          return;
        }
      }

      // 2. Check Bottom 7-Step Implementation Protocol Strip
      if (y >= L.stepRowY && y <= L.stepRowY + 22 * dpr) {
        const kw = Math.min(L.W / IMPL_STEPS.length, 155 * dpr);
        const x0 = L.cx - (kw * IMPL_STEPS.length) / 2;
        const idx = Math.floor((x - x0) / kw);
        if (idx >= 0 && idx < IMPL_STEPS.length) {
          runImplementationStep(idx + 1);
          return;
        }
      }

      // 3. Check Side Actuator Keys around the Spherical Orb
      if (Math.hypot(x - L.thumbBtn[0], y - L.thumbBtn[1]) <= L.thumbBtn[2]) {
        tapThumbIris();
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          exportProductionPackage('usda');
        }, 1200);
        return;
      }
      if (Math.hypot(x - L.rewindBtn[0], y - L.rewindBtn[1]) <= L.rewindBtn[2]) {
        rewindToZeroAndSwitchCharacter();
        return;
      }
      if (Math.hypot(x - L.mirrorBtn[0], y - L.mirrorBtn[1]) <= L.mirrorBtn[2]) {
        STATE.optics.fadedMirrorGhost = !STATE.optics.fadedMirrorGhost;
        playDetentTick(2100, 0.03);
        return;
      }
      if (Math.hypot(x - L.castBtn[0], y - L.castBtn[1]) <= L.castBtn[2]) {
        projectActiveSeedToRoom();
        return;
      }
      if (Math.hypot(x - L.modeLockBtn[0], y - L.modeLockBtn[1]) <= L.modeLockBtn[2]) {
        STATE.weaver.timelineCollapsed = !STATE.weaver.timelineCollapsed;
        STATE.opState = STATE.weaver.timelineCollapsed ? 'READY (SCULPT)' : 'WORKING (WEAVE)';
        playDetentTick(1750, 0.03);
        return;
      }
      if (Math.hypot(x - L.undoFlickBtn[0], y - L.undoFlickBtn[1]) <= L.undoFlickBtn[2]) {
        triggerFaultRecovery();
        return;
      }

      // 4. Check Capacitive Squeeze Rail
      const [sx, sy, sw, sh] = L.squeezeRect;
      if (x >= sx - 8 * dpr && x <= sx + sw + 24 * dpr && y >= sy && y <= sy + sh) {
        orbDrag = { type: 'squeeze', sy, sh };
        setSqueezePressure(1 - (y - sy) / sh);
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      // 5. Check Right Wing Bake & Export Buttons
      if (!L.narrow && x >= L.rightPanelX && x <= L.rightPanelX + L.rightPanelW) {
        const relY = y - (L.cy - L.orbR * 0.72);
        const totalH = L.orbR * 1.44;
        if (relY > totalH * 0.52 && relY < totalH * 0.74) {
          optimizeAndBakeSequence();
          return;
        }
        if (relY >= totalH * 0.74 && relY <= totalH * 1.05) {
          const relX = (x - L.rightPanelX) / L.rightPanelW;
          if (relX < 0.25) exportProductionPackage('usda');
          else if (relX < 0.50) exportProductionPackage('obj');
          else if (relX < 0.75) exportProductionPackage('imm');
          else exportProductionPackage('png');
          return;
        }
      }

      // 6. Check Concentric Spherical Orb Rings (Core, Inner, Middle, Outer)
      const dist = Math.hypot(x - L.cx, y - L.cy);
      if (dist <= L.rCore) {
        projectActiveSeedToRoom();
        return;
      }
      if (dist <= L.rOuter * 1.08) {
        const ring = dist <= L.rInner ? 'inner' : dist <= L.rMiddle ? 'middle' : 'outer';
        STATE.activeRing = ring;
        orbDrag = { type: 'ring', ring, lastX: e.clientX, lastY: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (!orbDrag) return;
      if (orbDrag.type === 'squeeze') {
        const [, y] = getPos(e);
        setSqueezePressure(1 - (y - orbDrag.sy) / orbDrag.sh);
      } else if (orbDrag.type === 'ring') {
        const dx = (e.clientX - orbDrag.lastX) / 150;
        const dy = -(e.clientY - orbDrag.lastY) / 150;
        orbDrag.lastX = e.clientX;
        orbDrag.lastY = e.clientY;
        const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        if (Math.abs(d) > 0.001) turnRing(orbDrag.ring, d);
      }
    });

    const endDrag = () => {
      orbDrag = null;
      clearTimeout(holdTimer);
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
  }

  function drawOrbDeck(now) {
    if (!orbCanvas || !orbCtx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = orbCanvas.clientWidth * dpr;
    const h = orbCanvas.clientHeight * dpr;
    if (orbCanvas.width !== w || orbCanvas.height !== h) {
      orbCanvas.width = w;
      orbCanvas.height = h;
    }

    const x = orbCtx;
    const L = computeOrbLayout(w, h, dpr);
    x.clearRect(0, 0, w, h);

    // 1. Top Row: 9 Holographic Seeds (Outer Ring Catalog)
    const seedKw = Math.min(w / SEEDS.length, 128 * dpr);
    const seedX0 = L.cx - (seedKw * SEEDS.length) / 2;
    SEEDS.forEach((s, i) => {
      const on = STATE.seedIdx === i;
      const kx = seedX0 + i * seedKw + 2 * dpr;
      x.fillStyle = on ? 'rgba(22, 48, 58, 0.95)' : '#0c1015';
      x.strokeStyle = on ? '#5ff0dc' : '#26323f';
      x.lineWidth = (on ? 1.8 : 1) * dpr;
      x.beginPath();
      x.roundRect(kx, L.seedRowY, seedKw - 4 * dpr, 20 * dpr, 4 * dpr);
      x.fill();
      x.stroke();
      x.fillStyle = on ? '#5ff0dc' : '#94a6b8';
      x.font = `700 ${Math.round((L.narrow ? 7.5 : 8.5) * dpr)}px "JetBrains Mono",monospace`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(L.narrow ? s.short.slice(0, 7) : `${i + 1}:${s.short}`, kx + (seedKw - 4 * dpr) / 2, L.seedRowY + 10 * dpr);
    });

    // 2. Central Spherical Stelline-Orb-Pro Instrument (3 Concentric Optical Rings + In-Orb Seed Core)
    const ringDefs = [
      { key: 'outer',  rOut: L.rOuter,  rIn: L.rMiddle, label: 'OUTER: SEED',   color: '#5ff0dc', ticks: 18 },
      { key: 'middle', rOut: L.rMiddle, rIn: L.rInner,  label: 'MID: DEFORM',   color: '#ffcc66', ticks: 28 },
      { key: 'inner',  rOut: L.rInner,  rIn: L.rCore,   label: 'INNER: TIME/DOF', color: '#ff9f43', ticks: 42 }
    ];

    // Outer ambient halo
    const halo = x.createRadialGradient(L.cx, L.cy, L.rCore * 0.4, L.cx, L.cy, L.rOuter * 1.18);
    halo.addColorStop(0, 'rgba(95, 240, 220, 0.22)');
    halo.addColorStop(0.65, 'rgba(18, 28, 38, 0.85)');
    halo.addColorStop(1, 'rgba(5, 7, 10, 0)');
    x.fillStyle = halo;
    x.beginPath();
    x.arc(L.cx, L.cy, L.rOuter * 1.18, 0, Math.PI * 2);
    x.fill();

    ringDefs.forEach(rd => {
      const isAct = STATE.activeRing === rd.key;
      x.save();
      x.beginPath();
      x.arc(L.cx, L.cy, rd.rOut, 0, Math.PI * 2);
      x.arc(L.cx, L.cy, rd.rIn, 0, Math.PI * 2, true);
      x.fillStyle = isAct ? 'rgba(30, 42, 54, 0.95)' : 'rgba(16, 21, 28, 0.92)';
      x.fill();
      x.lineWidth = (isAct ? 2.2 : 1.1) * dpr;
      x.strokeStyle = isAct ? rd.color : '#3a4654';
      x.stroke();

      // Rotary detent ticks around each concentric ring
      const phase = (STATE.ringAngles[rd.key] || 0) * Math.PI * 2;
      const rMid = (rd.rOut + rd.rIn) * 0.5;
      for (let k = 0; k < rd.ticks; k++) {
        const a = (k / rd.ticks) * Math.PI * 2 + phase;
        const r0 = rd.rIn + 3 * dpr;
        const r1 = rd.rOut - 3 * dpr;
        x.strokeStyle = k % 3 === 0 ? rd.color : 'rgba(180, 198, 214, 0.25)';
        x.lineWidth = (k % 3 === 0 ? 1.8 : 0.9) * dpr;
        x.beginPath();
        x.moveTo(L.cx + Math.cos(a) * r0, L.cy + Math.sin(a) * r0);
        x.lineTo(L.cx + Math.cos(a) * r1, L.cy + Math.sin(a) * r1);
        x.stroke();
      }

      // Ring engraved arc label
      x.fillStyle = isAct ? rd.color : '#b8c7d6';
      x.font = `700 ${Math.round(7.5 * dpr)}px "JetBrains Mono",monospace`;
      x.textAlign = 'center';
      x.fillText(rd.label, L.cx, L.cy - rMid + 3 * dpr);
      x.restore();
    });

    // 3. In-Orb Translucent Holographic Seed Preview Core (Spinning Miniature Inside the Sphere)
    const coreGrad = x.createRadialGradient(L.cx - L.rCore * 0.25, L.cy - L.rCore * 0.25, 2, L.cx, L.cy, L.rCore);
    coreGrad.addColorStop(0, 'rgba(140, 245, 255, 0.42)');
    coreGrad.addColorStop(0.55, 'rgba(14, 38, 48, 0.92)');
    coreGrad.addColorStop(1, '#04080c');
    x.fillStyle = coreGrad;
    x.strokeStyle = '#5ff0dc';
    x.lineWidth = 2 * dpr;
    x.beginPath();
    x.arc(L.cx, L.cy, L.rCore, 0, Math.PI * 2);
    x.fill();
    x.stroke();

    // Wireframe Spinning Miniature Seed Inside the Core
    const activeSeed = SEEDS[STATE.seedIdx];
    const spin = now * 0.0018;
    x.save();
    x.translate(L.cx, L.cy - 4 * dpr);
    x.strokeStyle = '#ffcc66';
    x.lineWidth = 1.4 * dpr;
    const cr = L.rCore * 0.46;
    for (let k = 0; k < 3; k++) {
      x.beginPath();
      x.ellipse(0, 0, cr, cr * Math.abs(Math.sin(spin + k * 1.05)), k * 0.5, 0, Math.PI * 2);
      x.stroke();
    }
    x.fillStyle = '#ffffff';
    x.font = `700 ${Math.round(7.8 * dpr)}px "JetBrains Mono",monospace`;
    x.textAlign = 'center';
    x.fillText(activeSeed.short, 0, L.rCore * 0.58);
    x.fillStyle = '#5ff0dc';
    x.font = `600 ${Math.round(6.5 * dpr)}px "JetBrains Mono",monospace`;
    x.fillText('TAP: PROJECT', 0, L.rCore * 0.80);
    x.restore();

    // 4. Six Tactile Hardware Buttons Flanking the Orb
    const drawOrbBtn = (bx, by, rad, topTxt, subTxt, isOn, col) => {
      x.save();
      x.fillStyle = isOn ? 'rgba(24, 48, 56, 0.96)' : '#12171e';
      x.strokeStyle = isOn ? col : '#455261';
      x.lineWidth = (isOn ? 2.2 : 1.2) * dpr;
      x.beginPath();
      x.arc(bx, by, rad, 0, Math.PI * 2);
      x.fill();
      x.stroke();
      x.fillStyle = isOn ? col : '#d8e4ee';
      x.font = `700 ${Math.round(7.5 * dpr)}px "JetBrains Mono",monospace`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(topTxt, bx, by - rad * 0.18);
      x.fillStyle = '#8fa3b5';
      x.font = `600 ${Math.round(6.3 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(subTxt, bx, by + rad * 0.30);
      x.restore();
    };

    drawOrbBtn(...L.castBtn, 'CAST', 'SEED->ROOM', true, '#5ff0dc');
    drawOrbBtn(...L.modeLockBtn, STATE.weaver.timelineCollapsed ? 'SCULPT' : 'TIMELINE', STATE.weaver.timelineCollapsed ? 'LOCKED' : 'ACTIVE', STATE.weaver.timelineCollapsed, '#ffcc66');
    drawOrbBtn(...L.undoFlickBtn, 'FLICK L', 'RECOVERY', STATE.opState === 'RECOVERY', '#ff9f43');

    drawOrbBtn(...L.thumbBtn, STATE.loop.recordingPass ? 'REC ON' : 'IRIS', 'EMBODY/TAKE', STATE.loop.recordingPass, '#ff5a3c');
    drawOrbBtn(...L.rewindBtn, '<< 00:00', 'NEXT CHAR', false, '#98f5b0');
    drawOrbBtn(...L.mirrorBtn, 'MIRROR', STATE.optics.fadedMirrorGhost ? 'GHOST ON' : 'GHOST OFF', STATE.optics.fadedMirrorGhost, '#5ff0dc');

    // 5. Left Wing: Capacitive Squeeze Sensor Bar (0% Scanline -> 50% Tether -> 100% Solid PBR) & Telemetry
    const [sx, sy, sw, sh] = L.squeezeRect;
    x.fillStyle = '#0c1117';
    x.strokeStyle = '#334150';
    x.lineWidth = 1.2 * dpr;
    x.beginPath();
    x.roundRect(sx, sy, sw, sh, 6 * dpr);
    x.fill();
    x.stroke();

    const fillH = sh * STATE.weaver.squeeze;
    const sqGrad = x.createLinearGradient(0, sy + sh, 0, sy);
    sqGrad.addColorStop(0, '#5ff0dc');
    sqGrad.addColorStop(0.5, '#ffcc66');
    sqGrad.addColorStop(1, '#ff5a3c');
    x.fillStyle = sqGrad;
    x.beginPath();
    x.roundRect(sx + 3 * dpr, sy + sh - fillH + 2 * dpr, sw - 6 * dpr, Math.max(4 * dpr, fillH - 4 * dpr), 4 * dpr);
    x.fill();

    // Left Wing Beside-Hand OLED Readout (Section 3 Keep-Cut Ledger: Secondary Hand Indicator)
    if (!L.narrow) {
      const lx = sx + sw + 12 * dpr;
      const ly = sy + 8 * dpr;
      x.textAlign = 'left';
      x.fillStyle = '#5ff0dc';
      x.font = `700 ${Math.round(8.5 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(`STATE // ${STATE.opState}`, lx, ly);

      x.fillStyle = '#e8f0f6';
      x.font = `600 ${Math.round(8 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(`SQUEEZE: ${Math.round(STATE.weaver.squeeze * 100)}% (${STATE.weaver.squeeze < 0.35 ? 'SCANLINE' : STATE.weaver.tethered ? '6DOF TETHER' : 'SOLID PBR'})`, lx, ly + 16 * dpr);
      x.fillText(`COLLECTION: ${activeSeed.collection}`, lx, ly + 31 * dpr);
      x.fillText(`DRIVER: Weaver_Empty (RotZ ${(STATE.weaver.rotZ * 57.3).toFixed(0)}°)`, lx, ly + 46 * dpr);
      x.fillText(`VOLUME: ${(STATE.optics.volumeDensity * 1000).toFixed(0)}m · ANISO ${STATE.optics.anisotropy.toFixed(1)}`, lx, ly + 61 * dpr);
      x.fillText(`GLASS IOR 1.45 · ShadowRay=${STATE.optics.isShadowRayBypass ? 'BYPASS' : 'BLOCK'}`, lx, ly + 76 * dpr);
      x.fillStyle = '#ffcc66';
      x.fillText(`CAKE: BUNDT ${Math.round(STATE.cake.bundt * 100)}% · ${STATE.cake.candles} CANDLES`, lx, ly + 92 * dpr);
      x.fillStyle = '#98f5b0';
      x.fillText(`CLAY ONION: ${STATE.clay.onionSkin ? 'ON (+/-1f HOLD 4f)' : 'OFF'}`, lx, ly + 107 * dpr);
    }

    // 6. Right Wing: Multi-Pass Loop Sequencer, Live Performance/Bake Monitor & Production Export Bridge
    if (!L.narrow) {
      const rx = L.rightPanelX;
      const ry = sy + 6 * dpr;
      const rw = L.rightPanelW;

      x.textAlign = 'left';
      x.fillStyle = '#ffcc66';
      x.font = `700 ${Math.round(8.5 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(`LOOP: 00:${STATE.loop.time.toFixed(2).padStart(5, '0')} / 00:15.00 [90Hz]`, rx, ry);

      STATE.loop.passes.forEach((p, idx) => {
        const py = ry + (15 + idx * 14) * dpr;
        x.fillStyle = p.color;
        x.font = `600 ${Math.round(7.4 * dpr)}px "JetBrains Mono",monospace`;
        x.fillText(`${p.name.slice(0, 28)} [${p.status}]`, rx, py);
      });

      // Performance & Bake Monitor (Quill 2.3+ / 2.5+)
      const perfY = ry + 75 * dpr;
      x.fillStyle = '#101821';
      x.strokeStyle = STATE.perf.bakedLoop ? '#98f5b0' : '#385068';
      x.lineWidth = 1.2 * dpr;
      x.beginPath();
      x.roundRect(rx, perfY, rw, 28 * dpr, 4 * dpr);
      x.fill();
      x.stroke();

      x.fillStyle = STATE.perf.bakedLoop ? '#98f5b0' : '#5ff0dc';
      x.font = `700 ${Math.round(7.5 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(`PERF: ${STATE.perf.memMB}MB (<100MB OK) · ${(STATE.perf.polyCount / 1000).toFixed(1)}k POLY · ${STATE.perf.drawCalls} DC`, rx + 6 * dpr, perfY + 10 * dpr);
      x.fillStyle = '#ffcc66';
      x.fillText(STATE.perf.bakedLoop ? 'BAKED LOOP -> PAINT LAYER [FixFlip=ON]' : 'CLICK: OPTIMIZE & BAKE LOOPING SEQUENCE', rx + 6 * dpr, perfY + 21 * dpr);

      // 4 Downstream Production Bridge Export Buttons (.USDA, .OBJ, .IMM, .PNG)
      const expY = perfY + 33 * dpr;
      const expLabs = ['.USDA GRAPH', '.OBJ FixFlip', '.IMM CAPSULE', '4K .PNG'];
      const bw = rw / 4;
      expLabs.forEach((lab, i) => {
        const bx = rx + i * bw + 1.5 * dpr;
        x.fillStyle = '#14202c';
        x.strokeStyle = '#5ff0dc';
        x.beginPath();
        x.roundRect(bx, expY, bw - 3 * dpr, 20 * dpr, 3 * dpr);
        x.fill();
        x.stroke();
        x.fillStyle = '#e8f0f6';
        x.font = `700 ${Math.round(7 * dpr)}px "JetBrains Mono",monospace`;
        x.textAlign = 'center';
        x.fillText(lab, bx + (bw - 3 * dpr) / 2, expY + 10 * dpr);
      });
    }

    // 7. Bottom Row: 7-Step Implementation Protocol (Section 8 Checklist)
    const stepKw = Math.min(w / IMPL_STEPS.length, 155 * dpr);
    const stepX0 = L.cx - (stepKw * IMPL_STEPS.length) / 2;
    IMPL_STEPS.forEach((st, i) => {
      const on = STATE.implStep === st.step;
      const kx = stepX0 + i * stepKw + 2 * dpr;
      x.fillStyle = on ? 'rgba(48, 38, 16, 0.96)' : '#0c1015';
      x.strokeStyle = on ? '#ffcc66' : '#26323f';
      x.lineWidth = (on ? 1.8 : 1) * dpr;
      x.beginPath();
      x.roundRect(kx, L.stepRowY, stepKw - 4 * dpr, 20 * dpr, 4 * dpr);
      x.fill();
      x.stroke();
      x.fillStyle = on ? '#ffcc66' : '#94a6b8';
      x.font = `700 ${Math.round((L.narrow ? 7.2 : 8.2) * dpr)}px "JetBrains Mono",monospace`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(L.narrow ? `S${st.step}` : st.code, kx + (stepKw - 4 * dpr) / 2, L.stepRowY + 10 * dpr);
    });
  }

  /* ---------------- 15. Main 90Hz Spatial Render Loop & Bimanual Viewport ---------------- */
  let candlePointLight, overheadLight, ambientLight;
  let lastWallTime = performance.now();

  function initChamberViewport(canvas) {
    renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    scene = new T.Scene();
    scene.background = new T.Color(0x04070a);
    scene.fog = new T.FogExp2(0x060b10, STATE.optics.volumeDensity);

    camera = new T.PerspectiveCamera(36, 16 / 9, 0.1, 100);

    ambientLight = new T.AmbientLight(0x283848, 0.55);
    scene.add(ambientLight);

    overheadLight = new T.DirectionalLight(0xeef6fa, 1.45);
    overheadLight.position.set(0.4, 5.2, 1.2);
    scene.add(overheadLight);

    candlePointLight = new T.PointLight(0xff9d3b, 2.8, 11.5, 1.4);
    candlePointLight.position.set(0, -0.35, -0.25);
    scene.add(candlePointLight);

    initCrownTexture();
    buildPhysicalLabCollection();
    buildHologramMemoryCollection();

    // Viewport interaction:
    // - Drag: Bimanual World Orbit / Scale OR 6DoF Tether Move when Half-Squeeze is active
    // - Click on any 3D object: Aims Orb beam & selects its Holographic Seed
    let vpDrag = null;
    const raycaster = new T.Raycaster();
    const mouse = new T.Vector2();

    canvas.addEventListener('pointerdown', e => {
      vpDrag = {
        x: e.clientX,
        y: e.clientY,
        moved: 0,
        o0: STATE.cameraOrbit.slice(),
        c0: STATE.cake.posOffset.slice()
      };
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', e => {
      if (!vpDrag) return;
      const dx = e.clientX - vpDrag.x;
      const dy = e.clientY - vpDrag.y;
      vpDrag.moved = Math.max(vpDrag.moved, Math.hypot(dx, dy));

      if (STATE.weaver.tethered) {
        // Half-Squeeze 6DoF Vector Tether: Move prop directly in 3D space with zero gizmo arrows!
        STATE.cake.posOffset[0] = Math.max(-1.4, Math.min(1.4, vpDrag.c0[0] + dx * 0.004));
        STATE.cake.posOffset[1] = Math.max(-0.5, Math.min(0.8, vpDrag.c0[1] - dy * 0.004));
      } else {
        STATE.cameraOrbit[0] = Math.max(-0.75, Math.min(0.75, vpDrag.o0[0] - dx * 0.0045));
        STATE.cameraOrbit[1] = Math.max(-0.22, Math.min(0.58, vpDrag.o0[1] + dy * 0.0038));
      }
    });

    canvas.addEventListener('pointerup', e => {
      if (!vpDrag) return;
      const wasClick = vpDrag.moved < 6;
      vpDrag = null;
      if (wasClick) {
        const r = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        for (const h of hits) {
          let o = h.object;
          while (o) {
            if (o.userData && o.userData.seedId) {
              const idx = SEEDS.findIndex(s => s.id === o.userData.seedId);
              if (idx >= 0) selectSeed(idx);
              return;
            }
            o = o.parent;
          }
        }
      }
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.shiftKey) {
        // Bimanual World Scale (Both Grips)
        STATE.weaver.bimanualScale = Math.max(0.45, Math.min(2.2, STATE.weaver.bimanualScale - e.deltaY * 0.001));
      } else {
        turnRing(STATE.activeRing, -e.deltaY * 0.0012);
      }
    }, { passive: false });
  }

  function resizeViewport() {
    if (!renderer) return;
    const parent = renderer.domElement.parentElement;
    if (!parent) return;
    const w = Math.max(320, parent.clientWidth);
    const h = Math.max(200, parent.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.1, (now - lastWallTime) / 1000);
    lastWallTime = now;

    // 1. Advance Multi-Pass Loop Playhead if Playing & Timeline Not Collapsed
    if (STATE.loop.playing && !STATE.weaver.timelineCollapsed) {
      STATE.loop.time = (STATE.loop.time + dt) % STATE.loop.duration;
      STATE.weaver.locY = STATE.loop.time / STATE.loop.duration;
    }
    const tLoop = STATE.loop.time;

    // 2. Bimanual World Grip Camera & 85mm Lens Framing
    const [yaw, pitch] = STATE.cameraOrbit;
    const dist = 5.45 / STATE.weaver.bimanualScale;
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      0.62 + Math.sin(pitch) * dist,
      Math.cos(yaw) * Math.cos(pitch) * dist
    );
    camera.lookAt(0, -0.48, -0.35);

    // 3. Update Bounded Principled Volume & Tyndall God-Ray Cones
    scene.fog.density = STATE.optics.volumeDensity * 0.85;
    volumeCubeWire.visible = STATE.optics.showVolumeWire;
    godRayCones.forEach((c, i) => {
      c.rotation.z = (i - 1) * 0.14 + Math.sin(tLoop * 0.6 + i) * 0.04;
      c.material.opacity = Math.min(0.18, STATE.optics.volumeDensity * 2.1);
    });

    // 4. Update Weaver_Control Single-Empty Driver -> All Hologram Shaders
    weaverEmpty.position.set(0, STATE.weaver.locY, 0);
    weaverEmpty.rotation.z = STATE.weaver.rotZ;

    const flicker = STATE.cake.flames > 0.02
      ? (0.92 + 0.14 * Math.sin(now * 0.011 + tLoop * 4.0))
      : 0.05;
    const lK = Math.max(0.08, STATE.cake.flames * flicker * Math.sqrt(STATE.cake.candles / 4));
    candlePointLight.intensity = 2.9 * lK;

    holoMaterials.forEach(m => {
      if (m.uniforms) {
        m.uniforms.squeeze.value = STATE.weaver.squeeze;
        m.uniforms.wavePhase.value = tLoop + STATE.weaver.rotZ;
        m.uniforms.candleLight.value = lK;
      }
    });

    // 5. Update Cake Prop & Turntable
    cakeGroup.visible = STATE.cake.projected;
    cakeGroup.position.set(
      STATE.cake.posOffset[0],
      -1.51 + STATE.cake.posOffset[1],
      -0.35
    );
    cakeGroup.rotation.y = STATE.weaver.rotZ + tLoop * 0.28;
    cakeGroup.traverse(o => {
      if (o.isMesh && o.material && o.material.uniforms) {
        o.material.uniforms.squeeze.value = STATE.weaver.squeeze;
        o.material.uniforms.wavePhase.value = tLoop + STATE.weaver.rotZ;
        o.material.uniforms.candleLight.value = lK;
      }
    });
    const cakeInner = cakeGroup.children[0];
    if (cakeInner && cakeInner.userData.tick) {
      cakeInner.userData.tick(tLoop * 1.4);
    }

    // 6. Update Beetle Prop on Elderberry Leaf Socket
    beetleGroup.visible = STATE.beetle.projected || SEEDS[STATE.seedIdx].id === 'Prop_Beetle';
    beetleGroup.position.y = -1.18 + Math.sin(tLoop * 1.8) * 0.05;
    const btInner = beetleGroup.children[1];
    if (btInner && btInner.userData.tick) {
      btInner.userData.tick(tLoop * 1.6);
    }

    // 7. Update Multi-Pass Embodied Children Cutouts
    childCards.forEach((card, i) => {
      const bp = card.userData.basePos;
      const isEmbodied = card.userData.seedId === STATE.loop.embodiedChar;
      const sway = Math.sin(tLoop * 1.65 + i * 1.3) * (isEmbodied ? 0.065 : 0.028);
      const nod = Math.cos(tLoop * 2.1 + i) * (isEmbodied ? 0.045 : 0.015);
      card.position.set(bp.x + sway, bp.y + nod, bp.z);
      card.rotation.z = sway * 0.25;
      const u = card.material.uniforms;
      if (u) {
        u.lightK.value = lK;
        u.squeeze.value = STATE.weaver.squeeze;
        u.wavePhase.value = tLoop + STATE.weaver.rotZ;
        u.embodiedGlow.value = isEmbodied ? 1.0 : 0.0;
        u.candlePos.value.copy(candlePointLight.position);
      }
    });

    // 8. Update Quill Anim Brush Volumetric Ribbons (Boiling Stroke Loop)
    quillStrokeGroup.visible = STATE.quill.active;
    const quillFocus = SEEDS[STATE.seedIdx].id === 'Quill_AnimBrush' || STATE.implStep === 6;
    quillRibbons.forEach((rib, idx) => {
      const s = 1.0 + Math.sin(tLoop * 3.2 + idx * 0.7) * 0.08 * STATE.quill.boilAmp;
      rib.scale.set(s, 1.0, s);
      rib.rotation.y = tLoop * 0.22 + Math.sin(tLoop * 1.5 + idx) * 0.06 * STATE.quill.boilAmp;
      rib.material.opacity = quillFocus ? 0.68 : 0.24;
    });

    // 9. Update Clayground 4-Pose Stop-Motion Loop & Onion Skins
    clayLoopGroup.visible = STATE.clay.active;
    if (clayCurrMesh) {
      // Quantize to stop-motion stepped frames (Hold 4f)
      const stepT = Math.floor(tLoop * 3) / 3;
      const sq = Math.sin(stepT * 2.4) * STATE.clay.squashFactor;
      clayCurrMesh.scale.set(1.0 - sq * 0.45, 1.0 + sq * 0.65, 1.0 - sq * 0.45);
      clayCurrMesh.position.y = Math.max(0, sq * 0.18);
      if (clayCurrMesh.material.uniforms) {
        clayCurrMesh.material.uniforms.squeeze.value = STATE.weaver.squeeze;
        clayCurrMesh.material.uniforms.wavePhase.value = stepT;
      }
      clayPrevGhost.visible = STATE.clay.onionSkin;
      clayNextGhost.visible = STATE.clay.onionSkin;
    }

    // 10. Update In-World Faded Mirror / 85mm Framing Ghost (Animotive 04:22)
    fadedMirrorGhostGroup.visible = STATE.optics.fadedMirrorGhost;
    if (STATE.optics.fadedMirrorGhost) {
      updateFadedMirrorCanvas(tLoop);
    }

    // 11. Update Orb Focal Beam Tether
    beamLineMesh.visible = STATE.weaver.tethered || STATE.opState === 'READY (SEED)';

    renderer.render(scene, camera);
    drawOrbDeck(now);
  }

  /* ---------------- 16. Boot & URL Query Parameters ---------------- */
  function init() {
    initChamberViewport(document.getElementById('chamberStageCanvas'));
    initOrbDeck(document.getElementById('orbProCanvas'));
    resizeViewport();
    window.addEventListener('resize', resizeViewport);

    // Keyboard shortcuts for rapid testing & verification
    window.addEventListener('keydown', e => {
      if (e.key >= '1' && e.key <= '7') {
        runImplementationStep(Number(e.key));
      } else if (e.key === ' ') {
        e.preventDefault();
        tapThumbIris();
      } else if (e.key === 'r' || e.key === 'R') {
        rewindToZeroAndSwitchCharacter();
      } else if (e.key === 'm' || e.key === 'M') {
        STATE.optics.fadedMirrorGhost = !STATE.optics.fadedMirrorGhost;
      } else if (e.key === 'b' || e.key === 'B') {
        optimizeAndBakeSequence();
      } else if (e.key === 'ArrowRight') {
        turnRing(STATE.activeRing, 0.08);
      } else if (e.key === 'ArrowLeft') {
        turnRing(STATE.activeRing, -0.08);
      } else if (e.key === 'q' || e.key === 'Q') {
        setSqueezePressure(STATE.weaver.squeeze - 0.15);
      } else if (e.key === 'e' || e.key === 'E') {
        setSqueezePressure(STATE.weaver.squeeze + 0.15);
      }
    });

    // URL query parameters for headless GPU verification (?step=1..7, ?squeeze=0.25, ?seed=2, ?baked=1)
    const params = new URLSearchParams(window.location.search);
    if (params.has('step')) runImplementationStep(Number(params.get('step')));
    if (params.has('seed')) selectSeed(Number(params.get('seed')));
    if (params.has('squeeze')) setSqueezePressure(Number(params.get('squeeze')));
    if (params.get('baked') === '1') optimizeAndBakeSequence();
    if (params.get('sculpt') === '1') STATE.weaver.timelineCollapsed = true;

    requestAnimationFrame(animate);
  }

  window.FIELD_ORB_05 = {
    STATE,
    SEEDS,
    VR_PIPELINES,
    IMPL_STEPS,
    selectSeed,
    projectActiveSeedToRoom,
    turnRing,
    setSqueezePressure,
    tapThumbIris,
    rewindToZeroAndSwitchCharacter,
    optimizeAndBakeSequence,
    triggerFaultRecovery,
    runImplementationStep,
    exportProductionPackage,
    init
  };
})();
