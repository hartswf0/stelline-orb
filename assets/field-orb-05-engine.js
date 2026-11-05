/* ============================================================================
 * VESPER INSTRUMENTS · FIELD ORB 05 // STELLINE-ORB-PRO ENGINE
 *
 * Unifies:
 *   1. Cinema-grade Blade Runner 2049 Stelline Containment Chamber (01_PHYSICAL_LAB + 02_HOLOGRAM_MEMORY)
 *      matching reference frames c0.jpg, c2.jpg, c5.jpg, c7.jpg:
 *      - Pitch-black containment room with thin glowing white horizon ring & glass cylinder mullions
 *      - Hexagonal amber tabletop lit by warm overhead pool + 7 dynamic 3200K candle flames
 *      - Progressive "Build from Nothing" cake & scene construction:
 *        Table -> Sponge Drum -> 12-Lobe Scalloped Bundt Morph -> Procedural Cream Drip Glaze
 *        -> 44 Piped Shell Rosettes -> Animated Piping Nozzle writing 生日快樂 -> 1..7 Striped Candles
 *        -> Igniting Teardrop Flames -> Feathered Film Children (assets/bench/kids.webp) & Ana Stelline
 *        -> Independent Multi-Clock Hold (Children Held at t_H = 2.0s while Cake & Candlelight Turn)
 *        -> Volumetric Scanline Hologram Weave & Forest/Beetle Clearing Reveal
 *   2. Machined Metallic 5-Ring + Concentric Seed Core Orb Controller (#orbProCanvas):
 *      - Physically rotating knurled/ribbed/fluted rings with red witness marks & glowing active lines
 *      - Physical spring-loaded buttons (CAST, MODE, HOLD, REEL, BAKE, KEEP)
 *      - Visible Operator Cursor / Hand Touch Ripples & Drag Vectors for interactive & filmed operation
 *   3. Deterministic 45-Second Director Film Choreography (startDirectorReel / advance(dt))
 * ============================================================================ */
(function () {
  'use strict';

  const T = window.THREE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  };
  const TAU = Math.PI * 2;

  /* ---------------- 1. Seeds & 7-Step Implementation Protocol ---------------- */
  const SEEDS = [
    { id: 'Env_Clearing_Dome', short: 'ENV_DOME',   collection: '01_PHYSICAL_LAB',    label: '1:CHAMBER_DOME' },
    { id: 'Prop_Cake',         short: 'PROP_CAKE',  collection: '02_HOLOGRAM_MEMORY', label: '2:BUNDT_CAKE' },
    { id: 'Icing_Shells',      short: 'ICING_DRIP', collection: '02_HOLOGRAM_MEMORY', label: '3:ICING_SHELLS' },
    { id: 'Pipe_Writing',      short: 'PIPE_TEXT',  collection: '02_HOLOGRAM_MEMORY', label: '4:PIPE_生日快樂' },
    { id: 'Candles_Flames',    short: 'CANDLES_7',  collection: '02_HOLOGRAM_MEMORY', label: '5:7_CANDLES' },
    { id: 'Char_Children',     short: 'KIDS_PARTY', collection: '02_HOLOGRAM_MEMORY', label: '6:CHILDREN_HOLD' },
    { id: 'Char_Ana',          short: 'ANA_MAKER',  collection: '02_HOLOGRAM_MEMORY', label: '7:ANA_SILHOUETTE' },
    { id: 'Prop_Beetle',       short: 'CARABUS_BUG',collection: '02_HOLOGRAM_MEMORY', label: '8:FOREST_BEETLE' },
    { id: 'Lens_85mm_Ghost',   short: 'LENS_85MM',  collection: '02_HOLOGRAM_MEMORY', label: '9:85MM_WEAVE' }
  ];

  const IMPL_STEPS = [
    { step: 1, code: '1. CAST TABLE & SPONGE', desc: 'Cast Hexagonal Table & Cylindrical Sponge Base' },
    { step: 2, code: '2. SCULPT BUNDT & GLAZE', desc: 'Morph 12-Flute Bundt Torus & Pour Cream Drip + 44 Shells' },
    { step: 3, code: '3. PIPE 生日快樂 & CANDLES', desc: 'Etch-a-Sketch Pipe Red Inscription & Place 7 Candles' },
    { step: 4, code: '4. IGNITE & SUMMON KIDS', desc: 'Ignite 3200K Flames & Summon Birthday Party Children' },
    { step: 5, code: '5. HOLD KIDS / TURN CAKE', desc: 'Lock Children Clock (r=0) While Rotating Cake & Light (r=1)' },
    { step: 6, code: '6. HOLOGRAM SCAN WEAVE', desc: 'Squeeze Scanline Hologram & Forest Beetle Reveal' },
    { step: 7, code: '7. BAKE & COMMIT USD',   desc: 'Optimize Loop (<100MB FixFlip) & Export .USDA / .OBJ' }
  ];

  /* ---------------- 2. Master State ---------------- */
  const STATE = {
    seedIdx: 1,
    implStep: 3,
    mode: 'WEAVE', // 'SCULPT' | 'ANIMATE' | 'WEAVE'
    opState: 'WORKING (WEAVE)',
    activeRing: 'middle',
    activeBarrelRing: 1, // 0..4 for the 5 physical machined barrel rings
    barrelAngles: [0, 0, 0, 0, 0],
    barrelTargets: [0, 0, 0, 0, 0],
    ringAngles: { outer: 0.14, middle: 0.65, inner: 0.35 },
    btnDown: { CAST: 0, MODE: 0, HOLD: 0, REEL: 0, BAKE: 0, KEEP: 0 },

    // Progressive scene construction flags & parameters
    sceneMode: 'birthday', // 'birthday' | 'forest'
    forestRecede: 1.0,     // 1.0 = birthday chamber, 0.0 = full forest clearing
    table: { exists: true, grow: 1.0 },
    cake: {
      projected: true,
      grow: 1.0,
      bundt: 0.85,         // 0 = cylindrical sponge drum, 1 = 12-lobe scalloped Bundt
      icingCoat: 1.0,      // 0..1 buttercream drip coat
      dripLen: 0.68,       // drip length
      shellsCount: 44,     // 0..44 piped shell rosettes around rim
      pipeProgress: 1.0,   // 0..1 animated piping of 生日快樂
      candles: 7,          // 0..12 striped wax candles
      flames: 1.0,         // 0..1 flame intensity
      turnDeg: 18,         // turntable angle in degrees
      scale: 1.0,
      posOffset: [0, 0, 0],
      customText: '生日快樂'
    },
    kids: {
      projected: true,
      grow: 1.0,
      held: true,          // r = 0 held at t_H = 2.00s!
      clockT: 2.00,
      anaVisible: true,
      anaAlpha: 0.88
    },
    beetle: {
      projected: false,
      speciesIdx: 0,
      focusR: 0.78,
      focusL: 0.78,
      setae: 0.62,
      yaw: 0.25,
      scale: 1.0
    },
    clay: {
      active: false,
      onionSkin: true,
      squashFactor: 0.38
    },
    quill: {
      active: true,
      boilAmp: 0.55
    },
    weaver: {
      locY: 0.30,
      rotZ: 0.25,
      squeeze: 0.94,       // 1.0 = solid cinema PBR, 0.22 = volumetric scanline hologram
      tethered: false,
      timelineCollapsed: false,
      bimanualScale: 1.0
    },
    optics: {
      focalMm: 85,
      fStop: 1.8,
      focusDist: 3.4,
      volumeDensity: 0.032,
      anisotropy: 0.60,
      isShadowRayBypass: true,
      fadedMirrorGhost: false,
      showCalliopeArcs: true
    },
    loop: {
      time: 4.40,
      duration: 15.0,
      playing: true,
      recordingPass: false,
      embodiedChar: 'Char_Child_02',
      passes: [
        { id: 1, name: 'PASS 1 // CHAMBER + HEX TABLE', status: 'COMMITTED', color: '#5ff0dc' },
        { id: 2, name: 'PASS 2 // BUNDT CAKE + 7 FLAMES', status: 'LIVE (r=1)', color: '#ffcc66' },
        { id: 3, name: 'PASS 3 // CHILDREN HELD @ 2.00s', status: 'HELD (r=0)', color: '#98f5b0' },
        { id: 4, name: 'PASS 4 // ANA + CALLIOPE ARCS',  status: 'ACTIVE',    color: '#ff9f43' }
      ]
    },
    perf: {
      memMB: 48.2,
      polyCount: 142800,
      drawCalls: 38,
      bakedLoop: false,
      fixFlipNormals: true
    },
    cameraOrbit: [0.0, 0.10],

    // Virtual / Interactive Operator Hand Cursor on the Orb & Stage
    cursor: {
      visible: false,
      x: 640,
      y: 620,
      down: false,
      ripple: 0,
      label: '',
      dragDir: 0 // -1 up, +1 down, 0 none
    },
    reel: {
      active: false,
      t: 0,
      dur: 45.0
    }
  };

  /* ---------------- 3. WebAudio Mechanical Detents & Cinema Soundscape ---------------- */
  let audioCtx = null;
  function playDetentTick(freq = 1650, gainVal = 0.035, kind = 'tick') {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = kind === 'press' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(90, freq * (kind === 'press' ? 0.45 : 0.32)), t0 + (kind === 'press' ? 0.065 : 0.024));
      gain.gain.setValueAtTime(gainVal, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (kind === 'press' ? 0.068 : 0.026));
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + (kind === 'press' ? 0.07 : 0.028));
    } catch (_) {}
  }

  /* ---------------- 4. Procedural Textures (Crumb, Cream, Candle Stripe, Flame, Crown) ---------------- */
  function makeCanvasTex(w, h, drawFn, repeat) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    drawFn(c.getContext('2d'), w, h);
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    if (repeat) {
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(repeat[0], repeat[1]);
    }
    return { canvas: c, tex };
  }

  const CRUMB_TEX = makeCanvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5c3316';
    g.fillRect(0, 0, w, h);
    let s = 19;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 4200; i++) {
      const v = rnd();
      g.fillStyle = v < 0.48 ? 'rgba(34,15,5,0.6)' : v < 0.8 ? 'rgba(138,82,38,0.52)' : 'rgba(205,142,74,0.36)';
      g.beginPath();
      g.arc(rnd() * w, rnd() * h, 0.7 + rnd() * 2.1, 0, TAU);
      g.fill();
    }
  }, [4, 1]);

  const STRIPE_TEX = makeCanvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#f8f0df';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#d84339';
    for (let y = -32; y < h + 32; y += 22) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + 14);
      g.lineTo(w, y + 23);
      g.lineTo(0, y + 9);
      g.fill();
    }
  });

  const FLAME_TEX = makeCanvasTex(64, 128, (g, w, h) => {
    const gr = g.createRadialGradient(32, 82, 2, 32, 72, 50);
    gr.addColorStop(0.0, 'rgba(255, 253, 236, 1)');
    gr.addColorStop(0.24, 'rgba(255, 208, 102, 0.96)');
    gr.addColorStop(0.58, 'rgba(255, 125, 28, 0.46)');
    gr.addColorStop(1.0, 'rgba(255, 70, 0, 0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(32, 6);
    g.bezierCurveTo(52, 50, 56, 84, 32, 118);
    g.bezierCurveTo(8, 84, 12, 50, 32, 6);
    g.fill();
  });

  const GLOW_TEX = makeCanvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0.0, 'rgba(255, 192, 96, 0.58)');
    gr.addColorStop(0.45, 'rgba(255, 148, 48, 0.22)');
    gr.addColorStop(1.0, 'rgba(255, 120, 20, 0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });

  // Piped 生日快樂 calligraphy strokes in normalized cake-top coordinates (-0.75..0.75)
  const CALLIGRAPHY_PATHS = [
    // 生
    [[-0.58, -0.18], [-0.52, -0.02], [-0.36, -0.04]],
    [[-0.45, -0.19], [-0.45, 0.16]],
    [[-0.54, 0.06], [-0.37, 0.05]],
    [[-0.58, 0.16], [-0.32, 0.15]],
    // 日
    [[-0.24, -0.14], [-0.24, 0.15], [-0.06, 0.15], [-0.06, -0.14], [-0.24, -0.14]],
    [[-0.23, 0.01], [-0.07, 0.01]],
    // 快
    [[0.06, -0.14], [0.06, 0.16]],
    [[0.01, -0.02], [0.11, 0.04]],
    [[0.14, -0.09], [0.29, -0.09], [0.27, 0.02]],
    [[0.11, 0.02], [0.32, 0.02]],
    [[0.21, -0.16], [0.20, 0.03], [0.11, 0.16]],
    [[0.21, 0.03], [0.32, 0.16]],
    // 樂
    [[0.42, -0.14], [0.58, -0.14], [0.56, 0.0], [0.42, 0.0], [0.42, -0.14]],
    [[0.38, 0.06], [0.62, 0.06]],
    [[0.50, -0.16], [0.50, 0.17]],
    [[0.46, 0.07], [0.37, 0.16]],
    [[0.54, 0.07], [0.63, 0.16]],
    // Z underline flourish (matching film cake c5.jpg)
    [[-0.46, 0.25], [0.38, 0.22], [-0.18, 0.31], [0.48, 0.28]]
  ];

  /* ---------------- 5. Hologram Shader Wrapper (Solid Cinema PBR <-> Volumetric Scanlines) ---------------- */
  const holoMaterials = [];
  function wrapHoloMaterial(mat) {
    mat.userData.uSqueeze = { value: STATE.weaver.squeeze };
    mat.userData.uTime = { value: 0 };
    mat.onBeforeCompile = sh => {
      sh.uniforms.uSqueeze = mat.userData.uSqueeze;
      sh.uniforms.uTime = mat.userData.uTime;
      sh.vertexShader = 'varying vec3 vHoloWPos;\nvarying vec3 vHoloWNorm;\n' +
        sh.vertexShader.replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\nvHoloWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvHoloWNorm = normalize(mat3(modelMatrix) * objectNormal);'
        );
      sh.fragmentShader = 'uniform float uSqueeze;\nuniform float uTime;\nvarying vec3 vHoloWPos;\nvarying vec3 vHoloWNorm;\n' +
        sh.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          float holoMix = 1.0 - smoothstep(0.32, 0.88, uSqueeze);
          if (holoMix > 0.005) {
            vec3 V = normalize(cameraPosition - vHoloWPos);
            float fres = pow(1.0 - abs(dot(normalize(vHoloWNorm), V)), 2.1);
            float scan = 0.55 + 0.45 * sin(vHoloWPos.y * 85.0 - uTime * 6.5);
            vec3 scanTint = gl_FragColor.rgb * (0.45 + 0.75 * scan) + vec3(0.37, 0.94, 0.86) * fres * 0.95 + vec3(1.0, 0.72, 0.32) * (1.0 - scan) * 0.18;
            gl_FragColor.rgb = mix(gl_FragColor.rgb, scanTint, holoMix);
          }`
        );
    };
    holoMaterials.push(mat);
    return mat;
  }

  /* ---------------- 6. Scene Graph: 01_PHYSICAL_LAB & 02_HOLOGRAM_MEMORY ---------------- */
  let renderer, scene, camera;
  let colPhysicalLab, colHologramMemory;
  let dustPoints, coneMesh, horizonMesh, horizonGlowMesh;
  let tableGroup, cakeGroup, spongeMesh, icingMesh, shellInstMesh, pipeGroup, nozzleMesh, candlesGroup;
  let flameSprites = [];
  let kidsMesh, anaMesh;
  let forestGroup, forestNearMesh, forestMidMesh, forestFarMesh, beetleGroup;
  let keyCandleLight, tableSpotLight, rimSpotLight, ambientLight;

  const texLoader = new T.TextureLoader();
  const texCache = {};
  function loadTex(url) {
    if (!texCache[url]) {
      const t = texLoader.load(url);
      t.encoding = T.sRGBEncoding;
      texCache[url] = t;
    }
    return texCache[url];
  }

  function buildPhysicalLabCollection() {
    colPhysicalLab = new T.Group();
    colPhysicalLab.name = '01_PHYSICAL_LAB';

    // Dark obsidian chamber floor & recessed pit
    const floorMat = new T.MeshStandardMaterial({ color: 0x050607, roughness: 0.94, metalness: 0.05 });
    const floor = new T.Mesh(new T.CircleGeometry(18, 72), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.62;
    floor.receiveShadow = true;
    colPhysicalLab.add(floor);

    const pitRim = new T.Mesh(
      new T.RingGeometry(2.85, 3.12, 72),
      new T.MeshBasicMaterial({ color: 0x161d24, side: T.DoubleSide })
    );
    pitRim.rotation.x = -Math.PI / 2;
    pitRim.position.y = -1.615;
    colPhysicalLab.add(pitRim);

    // The iconic Blade Runner 2049 thin glowing white perimeter horizon band (matching c0.jpg / c2.jpg / c5.jpg)
    horizonMesh = new T.Mesh(
      new T.TorusGeometry(8.8, 0.018, 8, 200),
      new T.MeshBasicMaterial({ color: 0xdce6ec })
    );
    horizonMesh.rotation.x = Math.PI / 2;
    horizonMesh.position.y = -0.32;
    colPhysicalLab.add(horizonMesh);

    horizonGlowMesh = new T.Mesh(
      new T.TorusGeometry(8.8, 0.11, 8, 200),
      new T.MeshBasicMaterial({ color: 0x8aa4b0, transparent: true, opacity: 0.14, depthWrite: false })
    );
    horizonGlowMesh.rotation.x = Math.PI / 2;
    horizonGlowMesh.position.y = -0.32;
    colPhysicalLab.add(horizonGlowMesh);

    // Cylindrical Glass Containment Partition (IOR 1.45, Is Shadow Ray transparent-shadow bypass)
    const glassWall = new T.Mesh(
      new T.CylinderGeometry(8.75, 8.75, 7.5, 96, 1, true),
      new T.MeshPhysicalMaterial({
        color: 0xc8e4ee,
        transparent: true,
        opacity: 0.045,
        roughness: 0.03,
        metalness: 0.15,
        side: T.DoubleSide,
        depthWrite: false
      })
    );
    glassWall.position.y = 1.6;
    glassWall.castShadow = false;
    colPhysicalLab.add(glassWall);

    // Subtle vertical glass mullions
    const mullionMat = new T.MeshStandardMaterial({ color: 0x161c22, roughness: 0.5, metalness: 0.6 });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU + 0.14;
      const m = new T.Mesh(new T.BoxGeometry(0.03, 7.5, 0.03), mullionMat);
      m.position.set(Math.cos(a) * 8.72, 1.6, Math.sin(a) * 8.72);
      colPhysicalLab.add(m);
    }

    // Overhead 4500K Ring Diffuser + Subtle Volumetric Tyndall Cone
    const ringLamp = new T.Mesh(
      new T.TorusGeometry(2.1, 0.04, 10, 128),
      new T.MeshBasicMaterial({ color: 0xeaf4fa })
    );
    ringLamp.rotation.x = Math.PI / 2;
    ringLamp.position.y = 4.2;
    colPhysicalLab.add(ringLamp);

    coneMesh = new T.Mesh(
      new T.CylinderGeometry(1.9, 3.4, 5.8, 64, 1, true),
      new T.MeshBasicMaterial({
        color: 0x587684,
        transparent: true,
        opacity: 0.032,
        side: T.DoubleSide,
        depthWrite: false,
        blending: T.AdditiveBlending
      })
    );
    coneMesh.position.y = 1.3;
    colPhysicalLab.add(coneMesh);

    // 700 Floating Volumetric Dust Motes in the Chamber
    const dustCount = 700;
    const dustGeo = new T.BufferGeometry();
    const dp = new Float32Array(dustCount * 3);
    let seed = 42;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < dustCount; i++) {
      const a = rnd() * TAU;
      const r = Math.sqrt(rnd()) * 4.2;
      dp[i * 3] = Math.cos(a) * r;
      dp[i * 3 + 1] = -1.5 + rnd() * 4.8;
      dp[i * 3 + 2] = Math.sin(a) * r;
    }
    dustGeo.setAttribute('position', new T.BufferAttribute(dp, 3));
    dustPoints = new T.Points(
      dustGeo,
      new T.PointsMaterial({
        color: 0xd8ebe6,
        size: 0.016,
        transparent: true,
        opacity: 0.38,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    colPhysicalLab.add(dustPoints);

    // Officer K Silhouette Observer Outside the Glass Partition
    const kGroup = new T.Group();
    const darkCoat = new T.MeshStandardMaterial({ color: 0x050709, roughness: 0.85 });
    const torso = new T.Mesh(new T.CylinderGeometry(0.26, 0.38, 1.75, 20), darkCoat);
    torso.position.y = -0.35;
    const head = new T.Mesh(new T.SphereGeometry(0.16, 20, 16), darkCoat);
    head.position.y = 0.72;
    kGroup.add(torso, head);
    kGroup.position.set(-5.6, 0, -7.2);
    kGroup.lookAt(0, -0.4, 0);
    colPhysicalLab.add(kGroup);

    scene.add(colPhysicalLab);
  }
  /* ---------------- 7. 02_HOLOGRAM_MEMORY: Hex Table, Progressive Cake, Feathered Kids & Ana, Forest/Beetle ---------------- */
  function buildHologramMemoryCollection() {
    colHologramMemory = new T.Group();
    colHologramMemory.name = '02_HOLOGRAM_MEMORY';

    // 1. Hexagonal Birthday Table (matching c0.jpg warm amber pool)
    tableGroup = new T.Group();
    const tableTopMat = wrapHoloMaterial(new T.MeshStandardMaterial({
      color: 0xc89948,
      emissive: 0x1a1004,
      roughness: 0.58,
      metalness: 0.04
    }));
    const tableTop = new T.Mesh(new T.CylinderGeometry(1.58, 1.58, 0.06, 6), tableTopMat);
    tableTop.rotation.y = Math.PI / 6;
    tableTop.position.y = -1.16;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    const legMat = wrapHoloMaterial(new T.MeshStandardMaterial({ color: 0x12100d, roughness: 0.7 }));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const leg = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.45, 10), legMat);
      leg.position.set(Math.cos(a) * 0.95, -1.41, Math.sin(a) * 0.95);
      tableGroup.add(leg);
    }

    // Porcelain Cake Plate
    const plateMat = wrapHoloMaterial(new T.MeshStandardMaterial({ color: 0x2b2318, roughness: 0.35, metalness: 0.1 }));
    const plate = new T.Mesh(new T.CylinderGeometry(0.68, 0.64, 0.024, 64), plateMat);
    plate.position.y = -1.12;
    plate.receiveShadow = true;
    tableGroup.add(plate);
    colHologramMemory.add(tableGroup);

    // 2. Progressive 3D Birthday Cake Group (Sponge/Bundt + Drip Glaze + 44 Shells + Piped Text + 7 Candles/Flames)
    cakeGroup = new T.Group();
    cakeGroup.position.set(0, -1.11, 0.08);
    colHologramMemory.add(cakeGroup);

    pipeGroup = new T.Group();
    cakeGroup.add(pipeGroup);

    candlesGroup = new T.Group();
    cakeGroup.add(candlesGroup);

    // Metallic Etch-a-Sketch Piping Nozzle (visible while piping 生日快樂)
    nozzleMesh = new T.Mesh(
      new T.ConeGeometry(0.028, 0.12, 16),
      new T.MeshStandardMaterial({ color: 0xd8dee4, metalness: 0.85, roughness: 0.22 })
    );
    nozzleMesh.rotation.x = Math.PI;
    nozzleMesh.visible = false;
    cakeGroup.add(nozzleMesh);

    rebuildProgressiveCake();

    // 3. Feathered Birthday Children Card (assets/bench/kids.webp — clean soft alpha, lit by 3200K candle bounce)
    const kidsTex = loadTex('assets/bench/kids.webp');
    const KIDS_VS = `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;
    const KIDS_FS = `
      uniform sampler2D map;
      uniform float candleLuma, squeeze, wavePhase, heldGlow, opacityK;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vec4 texel = texture2D(map, vUv);
        // Parabolic + Gaussian dome mask removing the bottom white table & center cake/candle cutout (up to y=0.55 at x=0.47)
        float centerBell = exp(-pow((vUv.x - 0.47) / 0.185, 2.0));
        float domeY = 0.31 + 0.24 * centerBell;
        float tableCut = smoothstep(domeY - 0.02, domeY + 0.04, vUv.y);

        // Chromaticity warmth mask: keeps the warm-lit children & hair while rejecting neutral white/grey matte fringes
        float maxC = max(texel.r, max(texel.g, texel.b));
        float minC = min(texel.r, min(texel.g, texel.b));
        float sat = (maxC - minC) / max(0.001, maxC);
        float warmth = (texel.r - texel.b) / max(0.04, texel.r);
        float notWhiteMatte = 1.0 - smoothstep(0.75, 0.92, maxC * (1.0 - sat * 2.2));
        float notGreyFringe = smoothstep(0.05, 0.16, warmth + sat * 0.35);
        float notDarkBg = smoothstep(0.09, 0.28, maxC);

        float alpha = smoothstep(0.20, 0.70, texel.a) * tableCut * notWhiteMatte * notGreyFringe * notDarkBg * opacityK;
        if (alpha < 0.03) discard;

        // Warm 3200K candlelight bounce across the children's faces & cardigans (matching c0.jpg)
        float radialWarm = exp(-length((vUv - vec2(0.50, 0.48)) * vec2(1.4, 1.2)) * 1.35);
        vec3 baseCol = texel.rgb;
        vec3 litCol = baseCol * mix(vec3(0.24, 0.20, 0.16), vec3(1.22, 0.98, 0.70), clamp(0.28 + candleLuma * (0.55 + 0.65 * radialWarm), 0.0, 1.45));

        // Hologram scanline transition when squeeze < 0.85
        float holoMix = 1.0 - smoothstep(0.32, 0.88, squeeze);
        float scan = 0.55 + 0.45 * sin(vWorldPos.y * 65.0 - wavePhase * 6.5);
        vec3 holoCol = litCol * (0.5 + 0.65 * scan) + vec3(0.35, 0.92, 0.85) * (1.0 - alpha) * 0.35;
        vec3 outCol = mix(litCol, holoCol, holoMix);
        gl_FragColor = vec4(outCol, alpha);
      }
    `;
    const kidsMat = new T.ShaderMaterial({
      vertexShader: KIDS_VS,
      fragmentShader: KIDS_FS,
      transparent: true,
      depthWrite: false,
      uniforms: {
        map: { value: kidsTex },
        candleLuma: { value: 1.0 },
        squeeze: { value: STATE.weaver.squeeze },
        wavePhase: { value: 0 },
        heldGlow: { value: 1.0 },
        opacityK: { value: 1.0 }
      }
    });
    kidsMesh = new T.Mesh(new T.PlaneGeometry(3.85, 2.74, 32, 24), kidsMat);
    kidsMesh.position.set(-0.08, -0.32, -1.08);
    kidsMesh.renderOrder = 1;
    kidsMesh.userData.seedId = 'Char_Children';
    colHologramMemory.add(kidsMesh);

    // 4. Dr. Ana Stelline Foreground Silhouette / Rim-Lit Maker Card (matching c2.jpg / c5.jpg)
    const anaTex = loadTex('assets/bench/ana.webp');
    const ANA_FS = `
      uniform sampler2D map;
      uniform float candleLuma, squeeze, wavePhase, opacityK;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vec4 texel = texture2D(map, vUv);
        float maxC = max(texel.r, max(texel.g, texel.b));
        float minC = min(texel.r, min(texel.g, texel.b));
        float sat = (maxC - minC) / max(0.001, maxC);
        float notWhite = 1.0 - smoothstep(0.80, 0.95, maxC * (1.0 - sat * 1.9));
        float bottomFeather = smoothstep(0.04, 0.18, vUv.y);
        float alpha = smoothstep(0.22, 0.72, texel.a) * notWhite * bottomFeather * opacityK;
        if (alpha < 0.03) discard;
        // Warm 3200K rim-lit grading on Dr. Ana Stelline holding the silver Memory Orb
        float leftRim = smoothstep(0.82, 0.15, vUv.x);
        vec3 col = texel.rgb * mix(vec3(0.26, 0.22, 0.18), vec3(1.08, 0.86, 0.58), leftRim * (0.38 + 0.62 * candleLuma));
        float holoMix = 1.0 - smoothstep(0.32, 0.88, squeeze);
        float scan = 0.55 + 0.45 * sin(vWorldPos.y * 65.0 - wavePhase * 6.5);
        col = mix(col, col * (0.55 + 0.60 * scan) + vec3(0.35, 0.92, 0.85) * 0.12, holoMix);
        gl_FragColor = vec4(col, alpha);
      }
    `;
    const anaMat = new T.ShaderMaterial({
      vertexShader: KIDS_VS,
      fragmentShader: ANA_FS,
      transparent: true,
      depthWrite: false,
      uniforms: {
        map: { value: anaTex },
        candleLuma: { value: 1.0 },
        squeeze: { value: STATE.weaver.squeeze },
        wavePhase: { value: 0 },
        opacityK: { value: 0.88 }
      }
    });
    anaMesh = new T.Mesh(new T.PlaneGeometry(1.75, 2.95), anaMat);
    anaMesh.position.set(1.55, -0.42, 0.55);
    anaMesh.rotation.y = -0.22;
    anaMesh.renderOrder = 2;
    anaMesh.userData.seedId = 'Char_Ana';
    colHologramMemory.add(anaMesh);

    // 5. Forest Clearing & Anchored Iridescent Beetle (recedes in sections via FIELD ring)
    forestGroup = new T.Group();
    forestGroup.visible = false;
    const mkForestCard = (url, z, w, h) => {
      const m = new T.Mesh(
        new T.PlaneGeometry(w, h),
        new T.MeshBasicMaterial({ map: loadTex(url), transparent: true, alphaTest: 0.25 })
      );
      m.position.set(0, -0.35, z);
      forestGroup.add(m);
      return m;
    };
    forestFarMesh = mkForestCard('assets/bench/forest_far.webp', -5.2, 11.5, 6.5);
    forestMidMesh = mkForestCard('assets/bench/forest_mid.webp', -3.6, 9.2, 5.2);
    forestNearMesh = mkForestCard('assets/bench/forest_near.webp', -2.2, 7.4, 4.2);

    beetleGroup = new T.Group();
    beetleGroup.position.set(-0.65, -0.78, 0.65);
    beetleGroup.rotation.y = 0.42;
    forestGroup.add(beetleGroup);
    rebuildBeetleProp();

    colHologramMemory.add(forestGroup);
    scene.add(colHologramMemory);
  }

  /* ---------------- 8. Progressive Cake Mesh Builder (Sponge -> Bundt + Drip Glaze + 44 Shells + Piping + Candles) ---------------- */
  let lastCakeSig = '';
  const shellProtoGeo = new T.SphereGeometry(1, 14, 10);
  const creamMat = wrapHoloMaterial(new T.MeshStandardMaterial({
    color: 0xf2dfc0,
    roughness: 0.46,
    metalness: 0.02,
    side: T.DoubleSide
  }));
  const spongeMat = wrapHoloMaterial(new T.MeshStandardMaterial({
    map: CRUMB_TEX.tex,
    color: 0xd8a878,
    roughness: 0.86,
    metalness: 0.02
  }));
  const pipeRedMat = wrapHoloMaterial(new T.MeshStandardMaterial({
    color: 0xc93228,
    roughness: 0.32,
    metalness: 0.04
  }));
  const candleWaxMat = wrapHoloMaterial(new T.MeshStandardMaterial({
    map: STRIPE_TEX.tex,
    roughness: 0.45
  }));
  const wickMat = new T.MeshBasicMaterial({ color: 0x1a1410 });

  function rebuildProgressiveCake() {
    if (!cakeGroup) return;
    const C = STATE.cake;
    const sig = [
      C.bundt.toFixed(2),
      C.icingCoat.toFixed(2),
      C.dripLen.toFixed(2),
      C.shellsCount,
      C.pipeProgress.toFixed(2),
      C.candles,
      C.flames > 0.02 ? '1' : '0'
    ].join('|');
    if (sig === lastCakeSig) return;
    lastCakeSig = sig;

    // 1. Sponge / 12-Flute Scalloped Bundt Body (Radius 0.56, Height 0.34)
    if (spongeMesh) {
      cakeGroup.remove(spongeMesh);
      spongeMesh.geometry.dispose();
    }
    const R0 = 0.56;
    const H0 = 0.34;
    const radialSegs = 128;
    const heightSegs = 28;
    const sGeo = new T.CylinderGeometry(R0, R0, H0, radialSegs, heightSegs, false);
    const pos = sGeo.attributes.position;
    const bAmt = C.bundt;
    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i);
      let vz = pos.getZ(i);
      const r = Math.hypot(vx, vz);
      const ang = Math.atan2(vz, vx);
      const yNorm = (vy + H0 * 0.5) / H0; // 0 at bottom, 1 at top
      if (r > 0.001) {
        // 12-lobe Bundt scalloping on outer wall + rounded crown shoulder + central Bundt well
        const flute = 1.0 + bAmt * 0.095 * Math.cos(ang * 12);
        const shoulder = 1.0 - bAmt * 0.08 * Math.pow(Math.max(0, yNorm - 0.65) / 0.35, 2);
        const rRatio = r / R0;
        if (yNorm > 0.96 && rRatio < 0.38 && bAmt > 0.05) {
          // Central Bundt ring depression
          const wellDepth = (1.0 - rRatio / 0.38) * 0.16 * bAmt;
          vy -= wellDepth;
        }
        const scaleR = lerp(1.0, flute * shoulder, Math.min(1, rRatio * 1.2));
        vx *= scaleR;
        vz *= scaleR;
      } else if (vy > 0 && bAmt > 0.05) {
        vy -= 0.16 * bAmt;
      }
      pos.setXYZ(i, vx, vy + H0 * 0.5, vz);
    }
    sGeo.computeVertexNormals();
    spongeMesh = new T.Mesh(sGeo, spongeMat);
    spongeMesh.castShadow = true;
    spongeMesh.receiveShadow = true;
    spongeMesh.userData.seedId = 'Prop_Cake';
    cakeGroup.add(spongeMesh);

    // 2. Buttercream Drip Glaze (192-segment procedural drip mantle over crown & upper sides)
    if (icingMesh) {
      cakeGroup.remove(icingMesh);
      icingMesh.geometry.dispose();
      icingMesh = null;
    }
    if (C.icingCoat > 0.02) {
      const seg = 144;
      const rows = 24;
      const coatR = R0 + 0.014;
      const yTop = H0 + 0.012;
      const maxDrop = H0 * 0.72 * C.icingCoat;
      const minDrop = H0 * 0.15 * C.icingCoat;
      const iPos = new Float32Array((seg + 1) * (rows + 1) * 3);
      const iIdx = [];
      for (let a = 0; a <= seg; a++) {
        const th = (a / seg) * TAU;
        const flute = 1.0 + bAmt * 0.085 * Math.cos(th * 12);
        const dripWave = Math.max(0, Math.sin(th * 7 + 0.5) * 0.5 + Math.sin(th * 13 + 1.8) * 0.35 + Math.sin(th * 5) * 0.35);
        const dropLim = minDrop + C.dripLen * dripWave * dripWave * (maxDrop - minDrop);
        const innerHoleR = bAmt * 0.17;
        for (let j = 0; j <= rows; j++) {
          const u = j / rows;
          let rad, yy;
          if (u < 0.45) {
            // Top surface from inner ring out to shoulder
            const tTop = u / 0.45;
            rad = lerp(innerHoleR, coatR * flute, tTop);
            yy = yTop - Math.pow(Math.max(0, tTop - 0.82) / 0.18, 2) * 0.025;
            if (bAmt > 0.05 && tTop < 0.25) {
              yy -= (1.0 - tTop / 0.25) * 0.06 * bAmt;
            }
          } else {
            // Side drip skirt
            const tSide = (u - 0.45) / 0.55;
            rad = coatR * flute + 0.006 * Math.sin(tSide * Math.PI);
            yy = (yTop - 0.025) - tSide * dropLim;
          }
          const o = (a * (rows + 1) + j) * 3;
          iPos[o] = Math.cos(th) * rad;
          iPos[o + 1] = yy;
          iPos[o + 2] = Math.sin(th) * rad;
        }
      }
      for (let a = 0; a < seg; a++) {
        for (let j = 0; j < rows; j++) {
          const A = a * (rows + 1) + j;
          const B = (a + 1) * (rows + 1) + j;
          const C1 = A + 1;
          const D1 = B + 1;
          iIdx.push(A, B, C1, B, D1, C1);
        }
      }
      const iGeo = new T.BufferGeometry();
      iGeo.setAttribute('position', new T.BufferAttribute(iPos, 3));
      iGeo.setIndex(iIdx);
      iGeo.computeVertexNormals();
      icingMesh = new T.Mesh(iGeo, creamMat);
      icingMesh.userData.seedId = 'Icing_Shells';
      cakeGroup.add(icingMesh);
    }

    // 3. 44 Piped Buttercream Shell Rosettes around the Rim + Smarties Dragees
    if (shellInstMesh) {
      cakeGroup.remove(shellInstMesh);
      shellInstMesh.dispose && shellInstMesh.dispose();
      shellInstMesh = null;
    }
    if (C.shellsCount > 0 && C.icingCoat > 0.1) {
      const count = C.shellsCount;
      shellInstMesh = new T.InstancedMesh(shellProtoGeo, creamMat, count);
      const dummy = new T.Object3D();
      const rimR = R0 * 0.88;
      const rimY = H0 + 0.018;
      for (let k = 0; k < count; k++) {
        const a = (k / 44) * TAU;
        const flute = 1.0 + bAmt * 0.06 * Math.cos(a * 12);
        dummy.position.set(Math.cos(a) * rimR * flute, rimY, Math.sin(a) * rimR * flute);
        dummy.rotation.set(0, -a, -0.35);
        dummy.scale.set(0.036, 0.018, 0.024);
        dummy.updateMatrix();
        shellInstMesh.setMatrixAt(k, dummy.matrix);
      }
      shellInstMesh.instanceMatrix.needsUpdate = true;
      shellInstMesh.userData.seedId = 'Icing_Shells';
      cakeGroup.add(shellInstMesh);
    }

    // 4. Piped Red Inscription (生日快樂 + Z underline) on the Crown
    while (pipeGroup.children.length) {
      const m = pipeGroup.children.pop();
      if (m.geometry) m.geometry.dispose();
    }
    if (C.pipeProgress > 0.01) {
      const totalStrokes = CALLIGRAPHY_PATHS.length;
      const activeFloat = C.pipeProgress * totalStrokes;
      const fullCount = Math.floor(activeFloat);
      const partialFrac = activeFloat - fullCount;
      const topY = H0 + 0.022;
      const scaleXZ = R0 * 0.56;

      for (let sIdx = 0; sIdx < totalStrokes; sIdx++) {
        if (sIdx > fullCount) break;
        const rawPts = CALLIGRAPHY_PATHS[sIdx];
        const pts3 = rawPts.map(([px, pz]) => new T.Vector3(px * scaleXZ, topY, pz * scaleXZ));
        const curve = new T.CatmullRomCurve3(pts3);
        const frac = sIdx === fullCount ? partialFrac : 1.0;
        if (frac < 0.08) continue;
        const subPts = [];
        const steps = Math.max(4, Math.ceil(16 * frac));
        for (let k = 0; k <= steps; k++) {
          subPts.push(curve.getPoint((k / steps) * frac));
        }
        const subCurve = new T.CatmullRomCurve3(subPts);
        const tGeo = new T.TubeGeometry(subCurve, steps * 2, 0.0105, 8, false);
        const tm = new T.Mesh(tGeo, pipeRedMat);
        tm.userData.seedId = 'Pipe_Writing';
        pipeGroup.add(tm);

        if (sIdx === fullCount && C.pipeProgress < 0.995) {
          const tip = subPts[subPts.length - 1];
          nozzleMesh.visible = true;
          nozzleMesh.position.set(tip.x, topY + 0.065, tip.z);
        }
      }
      if (C.pipeProgress >= 0.995) nozzleMesh.visible = false;
    } else {
      nozzleMesh.visible = false;
    }

    // 5. Striped Wax Candles (1..12) + Igniting Teardrop Flames & Warm Glow Halos
    while (candlesGroup.children.length) {
      candlesGroup.children.pop();
    }
    flameSprites = [];
    if (C.candles > 0) {
      // Exact film-like cluster around the top of the cake (matching c0.jpg & c5.jpg)
      const candleRingR = R0 * 0.52;
      const baseTopY = H0 + 0.015;
      for (let k = 0; k < C.candles; k++) {
        const a = (k / Math.max(1, C.candles)) * TAU * 0.82 - 1.15 + (k % 2) * 0.08;
        const rr = candleRingR * (0.78 + (k % 3) * 0.14);
        const cH = 0.22 + (k % 3) * 0.022;
        const cg = new T.Group();
        cg.position.set(Math.cos(a) * rr, baseTopY, Math.sin(a) * rr);
        // Slight organic tilt like real birthday candles in c0.jpg / c5.jpg
        cg.rotation.z = ((k % 3) - 1) * 0.035;
        cg.rotation.x = ((k % 2) - 0.5) * 0.03;

        const wax = new T.Mesh(new T.CylinderGeometry(0.014, 0.015, cH, 14), candleWaxMat);
        wax.position.y = cH * 0.5;
        wax.userData.seedId = 'Candles_Flames';
        cg.add(wax);

        const wick = new T.Mesh(new T.CylinderGeometry(0.0025, 0.0025, 0.024, 6), wickMat);
        wick.position.y = cH + 0.012;
        cg.add(wick);

        const flMat = new T.SpriteMaterial({
          map: FLAME_TEX.tex,
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false,
          opacity: C.flames
        });
        const fl = new T.Sprite(flMat);
        fl.scale.set(0.085, 0.18, 1);
        fl.position.y = cH + 0.082;
        fl.renderOrder = 5;
        cg.add(fl);

        const glMat = new T.SpriteMaterial({
          map: GLOW_TEX.tex,
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false,
          opacity: C.flames * 0.85
        });
        const gl = new T.Sprite(glMat);
        gl.scale.set(0.46, 0.46, 1);
        gl.position.y = cH + 0.075;
        gl.renderOrder = 4;
        cg.add(gl);

        flameSprites.push({ fl, gl, cg, idx: k, cH });
        candlesGroup.add(cg);
      }
    }
  }

  function rebuildBeetleProp() {
    if (!beetleGroup || !window.ANATOMY) return;
    while (beetleGroup.children.length) {
      beetleGroup.children.pop();
    }
    const leafGeo = new T.PlaneGeometry(1.6, 1.1, 20, 20);
    const lp = leafGeo.attributes.position;
    for (let i = 0; i < lp.count; i++) {
      lp.setZ(i, -Math.pow(lp.getX(i), 2) * 0.18);
    }
    leafGeo.computeVertexNormals();
    const leafMesh = new T.Mesh(
      leafGeo,
      new T.MeshStandardMaterial({
        map: loadTex('assets/bench/leaf.jpg'),
        roughness: 0.55,
        side: T.DoubleSide
      })
    );
    leafMesh.rotation.x = -Math.PI / 2 + 0.18;
    leafMesh.position.y = -0.14;
    beetleGroup.add(leafMesh);

    const bt = window.ANATOMY.beetle({
      sheen: 0.72,
      focusR: STATE.beetle.focusR,
      focusL: STATE.beetle.focusL,
      setae: STATE.beetle.setae,
      gait: 0.5,
      skin: 0
    }, performance.now());
    bt.scale.setScalar(0.42);
    beetleGroup.add(bt);
  }
  /* ---------------- 9. Diegetic Calliope C-Arc Reticle Overlay (matching c0.jpg & c5.jpg) ---------------- */
  function updateDiegeticReticles(now) {
    const svg = document.getElementById('reticleOverlay');
    if (!svg || !camera) return;
    if (!STATE.optics.showCalliopeArcs) {
      svg.innerHTML = '';
      return;
    }

    const proj = v3 => {
      const p = v3.clone().project(camera);
      if (p.z > 1) return null;
      return [(p.x * 0.5 + 0.5) * 1280, (-p.y * 0.5 + 0.5) * 720];
    };

    let out = '';
    const activeSeed = SEEDS[STATE.seedIdx];

    // 1. Primary Film Calliope Crescent Arc beside the Cake (exact match to c5.jpg)
    if (STATE.cake.projected && cakeGroup) {
      const cPos = proj(new T.Vector3(0.42, -0.82, 0.08));
      if (cPos) {
        const [cx, cy] = cPos;
        const R = 76;
        const rotDeg = (STATE.barrelAngles[STATE.activeBarrelRing] || 0) * 57.3;
        out += `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})">`;
        // Outer translucent white C-arc sector (5 segments like the film's calliope HUD)
        for (let s = 0; s < 5; s++) {
          const a0 = (-68 + s * 27) * (Math.PI / 180);
          const a1 = (-68 + s * 27 + 23) * (Math.PI / 180);
          const rIn = R - 14;
          const rOut = R;
          const x0o = Math.cos(a0) * rOut, y0o = Math.sin(a0) * rOut;
          const x1o = Math.cos(a1) * rOut, y1o = Math.sin(a1) * rOut;
          const x1i = Math.cos(a1) * rIn,  y1i = Math.sin(a1) * rIn;
          const x0i = Math.cos(a0) * rIn,  y0i = Math.sin(a0) * rIn;
          const isHot = s === STATE.activeBarrelRing;
          const op = isHot ? 0.52 : 0.20;
          const col = isHot ? '#e8f8f5' : '#cdd8dc';
          out += `<path d="M${x0o.toFixed(1)} ${y0o.toFixed(1)} A${rOut} ${rOut} 0 0 1 ${x1o.toFixed(1)} ${y1o.toFixed(1)} L${x1i.toFixed(1)} ${y1i.toFixed(1)} A${rIn} ${rIn} 0 0 0 ${x0i.toFixed(1)} ${y0i.toFixed(1)} Z" fill="${col}" fill-opacity="${op}" stroke="rgba(255,255,255,${isHot ? 0.75 : 0.28})" stroke-width="0.9"/>`;
        }
        // Fine radial needle & leader line
        const needleA = ((rotDeg % 120) - 60) * (Math.PI / 180);
        out += `<line x1="0" y1="0" x2="${(Math.cos(needleA) * (R + 8)).toFixed(1)}" y2="${(Math.sin(needleA) * (R + 8)).toFixed(1)}" stroke="rgba(255,255,255,0.68)" stroke-width="1.1"/>`;
        out += `<line x1="-88" y1="22" x2="-18" y2="12" stroke="rgba(255,255,255,0.35)" stroke-width="0.8"/>`;
        out += `<text x="-92" y="34" fill="rgba(235,245,248,0.78)" font-family="JetBrains Mono,monospace" font-size="8.5" letter-spacing="1.2">${activeSeed.short} // BUNDT ${Math.round(STATE.cake.bundt * 100)}% · ${STATE.cake.candles} CANDLES · ${STATE.cake.turnDeg.toFixed(0)}°</text>`;
        out += `</g>`;
      }
    }

    // 2. Two Smaller Calliope C-Arcs above the Birthday Children (exact match to c0.jpg)
    if (STATE.kids.projected && STATE.kids.grow > 0.2) {
      const kidArcs = [
        { pos: new T.Vector3(-0.22, 0.56, -1.05), tag: `PASS 2 // CHILD_01`, sub: STATE.kids.held ? 'CLOCK HELD @ 2.00s (r=0)' : 'LIVE PLAYBACK' },
        { pos: new T.Vector3(0.46, 0.72, -1.05),  tag: `PASS 3 // CHILD_02`, sub: `3200K BOUNCE ${(STATE.cake.flames * 100).toFixed(0)}%` }
      ];
      kidArcs.forEach((ka, idx) => {
        const kp = proj(ka.pos);
        if (!kp) return;
        const [kx, ky] = kp;
        out += `<g transform="translate(${kx.toFixed(1)} ${ky.toFixed(1)})" opacity="${(0.75 * STATE.kids.grow).toFixed(2)}">`;
        out += `<path d="M-8 -22 A24 24 0 0 1 18 16" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3.5"/>`;
        out += `<path d="M-12 -26 A30 30 0 0 1 22 20" fill="none" stroke="rgba(95,240,220,0.45)" stroke-width="1.2" stroke-dasharray="4 3"/>`;
        out += `<line x1="-18" y1="26" x2="-4" y2="10" stroke="rgba(255,255,255,0.45)" stroke-width="0.9"/>`;
        out += `<text x="-54" y="-12" fill="rgba(240,248,252,0.82)" font-family="JetBrains Mono,monospace" font-size="7.5" letter-spacing="1">${ka.tag}</text>`;
        out += `<text x="-54" y="-2" fill="${STATE.kids.held ? '#ffcc66' : '#5ff0dc'}" font-family="JetBrains Mono,monospace" font-size="7" letter-spacing="0.8">${ka.sub}</text>`;
        out += `</g>`;
      });
    }

    svg.innerHTML = out;
  }

  /* ---------------- 10. Core Operations: Rings, Squeeze, Multi-Pass, Steps & Export ---------------- */
  function selectSeed(idx) {
    STATE.seedIdx = ((idx % SEEDS.length) + SEEDS.length) % SEEDS.length;
    STATE.ringAngles.outer = STATE.seedIdx / SEEDS.length;
    playDetentTick(1420 + STATE.seedIdx * 95, 0.035);
  }

  function projectActiveSeedToRoom() {
    const seed = SEEDS[STATE.seedIdx];
    STATE.btnDown.CAST = 1;
    playDetentTick(880, 0.055, 'press');
    if (seed.id === 'Prop_Cake') {
      STATE.table.exists = true;
      STATE.cake.projected = true;
    } else if (seed.id === 'Icing_Shells') {
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
    } else if (seed.id === 'Pipe_Writing') {
      STATE.cake.pipeProgress = 1.0;
    } else if (seed.id === 'Candles_Flames') {
      STATE.cake.candles = Math.max(7, STATE.cake.candles);
      STATE.cake.flames = 1.0;
    } else if (seed.id === 'Char_Children') {
      STATE.kids.projected = true;
      STATE.kids.grow = 1.0;
    } else if (seed.id === 'Char_Ana') {
      STATE.kids.anaVisible = !STATE.kids.anaVisible;
    } else if (seed.id === 'Prop_Beetle') {
      STATE.sceneMode = STATE.sceneMode === 'forest' ? 'birthday' : 'forest';
      STATE.forestRecede = STATE.sceneMode === 'forest' ? 0.0 : 1.0;
    }
    rebuildProgressiveCake();
  }

  // Turn one of the 5 physical machined barrel rings (0..4) OR the 3 concentric optical rings
  function turnBarrelRing(rIdx, deltaSteps) {
    STATE.activeBarrelRing = rIdx;
    STATE.barrelTargets[rIdx] += deltaSteps * 0.22;
    playDetentTick(1650 + rIdx * 240, 0.032);

    if (rIdx === 0) {
      // Ring 1: FIELD / SCENE / ORBIT
      if (STATE.sceneMode === 'forest' || SEEDS[STATE.seedIdx].id === 'Prop_Beetle') {
        STATE.forestRecede = clamp(STATE.forestRecede + deltaSteps * 0.06, 0, 1);
        STATE.sceneMode = STATE.forestRecede < 0.65 ? 'forest' : 'birthday';
      } else {
        STATE.cameraOrbit[0] = clamp(STATE.cameraOrbit[0] + deltaSteps * 0.04, -0.65, 0.65);
      }
    } else if (rIdx === 1) {
      // Ring 2: BUNDT SCULPT / VARIANT MORPH (0% Drum -> 100% 12-Flute Bundt)
      STATE.cake.bundt = clamp(STATE.cake.bundt + deltaSteps * 0.05, 0, 1);
      STATE.ringAngles.middle = STATE.cake.bundt;
      rebuildProgressiveCake();
    } else if (rIdx === 2) {
      // Ring 3: ICING GLAZE, 44 SHELLS & ETCH-A-SKETCH PIPING (生日快樂)
      if (STATE.cake.icingCoat < 0.99) {
        STATE.cake.icingCoat = clamp(STATE.cake.icingCoat + deltaSteps * 0.08, 0, 1);
        STATE.cake.shellsCount = Math.round(STATE.cake.icingCoat * 44);
      } else {
        STATE.cake.pipeProgress = clamp(STATE.cake.pipeProgress + deltaSteps * 0.06, 0, 1);
      }
      rebuildProgressiveCake();
    } else if (rIdx === 3) {
      // Ring 4: CANDLES (0..12) & 3200K FLAME IGNITION
      if (deltaSteps > 0 && STATE.cake.candles < 7) {
        STATE.cake.candles = clamp(STATE.cake.candles + 1, 0, 12);
      } else {
        STATE.cake.flames = clamp(STATE.cake.flames + deltaSteps * 0.08, 0, 1);
      }
      rebuildProgressiveCake();
    } else if (rIdx === 4) {
      // Ring 5: TIME / CAKE TURNTABLE (while Children remain Held at t_H = 2.00s!)
      STATE.cake.turnDeg = (STATE.cake.turnDeg + deltaSteps * 8) % 360;
      STATE.weaver.rotZ = (STATE.cake.turnDeg * Math.PI) / 180;
      STATE.ringAngles.inner = (STATE.ringAngles.inner + deltaSteps * 0.04 + 1) % 1;
      if (!STATE.kids.held) {
        STATE.kids.clockT = (STATE.kids.clockT + deltaSteps * 0.15 + 15) % 15;
      }
    }
  }

  function turnRing(ringName, delta) {
    STATE.activeRing = ringName;
    if (ringName === 'outer') {
      const next = Math.round((STATE.ringAngles.outer + delta) * SEEDS.length);
      selectSeed(next);
    } else if (ringName === 'middle') {
      turnBarrelRing(1, delta * 8);
    } else if (ringName === 'inner') {
      turnBarrelRing(4, delta * 8);
    }
  }

  function setSqueezePressure(val) {
    STATE.weaver.squeeze = clamp(val, 0.05, 1.0);
    STATE.weaver.tethered = STATE.weaver.squeeze >= 0.35 && STATE.weaver.squeeze <= 0.78;
    playDetentTick(900 + STATE.weaver.squeeze * 900, 0.018);
  }

  function toggleHoldChildren() {
    STATE.btnDown.HOLD = 1;
    STATE.kids.held = !STATE.kids.held;
    STATE.loop.passes[2].status = STATE.kids.held ? 'HELD (r=0)' : 'LIVE (r=1)';
    STATE.opState = STATE.kids.held ? 'HOLD KIDS (r=0)' : 'WORKING (WEAVE)';
    playDetentTick(1280, 0.05, 'press');
  }

  function optimizeAndBakeSequence() {
    STATE.btnDown.BAKE = 1;
    STATE.perf.bakedLoop = true;
    STATE.perf.memMB = 19.4;
    STATE.perf.polyCount = 48600;
    STATE.perf.drawCalls = 11;
    STATE.opState = 'COMPLETE (BAKED)';
    playDetentTick(2240, 0.055, 'press');
  }

  function runImplementationStep(stepNum) {
    STATE.implStep = clamp(stepNum, 1, 7);
    playDetentTick(1350 + stepNum * 120, 0.04, 'press');
    if (stepNum === 1) {
      // Step 1: Cast Hex Table & Cylindrical Sponge Drum (0% Bundt, 0 Icing, 0 Candles, No Kids yet)
      STATE.sceneMode = 'birthday';
      STATE.forestRecede = 1.0;
      STATE.table.exists = true;
      STATE.cake.projected = true;
      STATE.cake.bundt = 0.0;
      STATE.cake.icingCoat = 0.0;
      STATE.cake.shellsCount = 0;
      STATE.cake.pipeProgress = 0.0;
      STATE.cake.candles = 0;
      STATE.cake.flames = 0.0;
      STATE.kids.projected = false;
      STATE.kids.anaVisible = false;
      STATE.weaver.squeeze = 0.94;
      STATE.seedIdx = 1;
      STATE.activeBarrelRing = 0;
      STATE.opState = 'STEP 1 // SPONGE BASE';
    } else if (stepNum === 2) {
      // Step 2: Sculpt 12-Flute Bundt Torus & Pour Buttercream Drip Glaze + 44 Shell Rosettes
      STATE.sceneMode = 'birthday';
      STATE.cake.projected = true;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 0.0;
      STATE.cake.candles = 0;
      STATE.cake.flames = 0.0;
      STATE.kids.projected = false;
      STATE.kids.anaVisible = true;
      STATE.weaver.squeeze = 0.94;
      STATE.seedIdx = 2;
      STATE.activeBarrelRing = 1;
      STATE.opState = 'STEP 2 // BUNDT & GLAZE';
    } else if (stepNum === 3) {
      // Step 3: Etch-a-Sketch Pipe Red Inscription (生日快樂) & Place 7 Striped Candles
      STATE.sceneMode = 'birthday';
      STATE.cake.projected = true;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 1.0;
      STATE.cake.candles = 7;
      STATE.cake.flames = 0.85;
      STATE.kids.projected = true;
      STATE.kids.anaVisible = true;
      STATE.weaver.squeeze = 0.94;
      STATE.seedIdx = 3;
      STATE.activeBarrelRing = 2;
      STATE.opState = 'WORKING (WEAVE)';
    } else if (stepNum === 4) {
      // Step 4: Ignite 3200K Flames & Summon Birthday Party Children
      STATE.sceneMode = 'birthday';
      STATE.cake.projected = true;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 1.0;
      STATE.cake.candles = 7;
      STATE.cake.flames = 1.0;
      STATE.kids.projected = true;
      STATE.kids.held = false;
      STATE.kids.anaVisible = true;
      STATE.weaver.squeeze = 0.96;
      STATE.seedIdx = 5;
      STATE.activeBarrelRing = 3;
      STATE.opState = 'STEP 4 // KIDS & 3200K';
    } else if (stepNum === 5) {
      // Step 5: Hero Multi-Clock Proof — Hold Children (r=0) while Rotating Cake & Candlelight (r=1)
      STATE.sceneMode = 'birthday';
      STATE.cake.projected = true;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 1.0;
      STATE.cake.candles = 7;
      STATE.cake.flames = 1.0;
      STATE.kids.projected = true;
      STATE.kids.held = true;
      STATE.kids.anaVisible = true;
      STATE.weaver.squeeze = 0.96;
      STATE.seedIdx = 5;
      STATE.activeBarrelRing = 4;
      STATE.opState = 'WORKING (EMBODY)';
    } else if (stepNum === 6) {
      // Step 6: Volumetric Hologram Scanline Squeeze & Forest Beetle Reveal
      STATE.cake.projected = true;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 1.0;
      STATE.cake.candles = 7;
      STATE.cake.flames = 1.0;
      STATE.kids.projected = true;
      STATE.kids.held = true;
      STATE.weaver.squeeze = 0.24;
      STATE.seedIdx = 7;
      STATE.activeBarrelRing = 0;
      STATE.opState = 'STEP 6 // SCANLINE WEAVE';
    } else if (stepNum === 7) {
      // Step 7: Optimize & Bake Looping Sequence (<100MB FixFlip)
      STATE.sceneMode = 'birthday';
      STATE.cake.projected = true;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 1.0;
      STATE.cake.candles = 7;
      STATE.cake.flames = 1.0;
      STATE.kids.projected = true;
      STATE.kids.held = true;
      STATE.kids.anaVisible = true;
      STATE.weaver.squeeze = 0.94;
      optimizeAndBakeSequence();
      STATE.seedIdx = 1;
      STATE.activeBarrelRing = 4;
      STATE.opState = 'COMPLETE';
    }
    rebuildProgressiveCake();
  }

  function downloadBlob(filename, content, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1200);
  }

  function exportProductionPackage(kind = 'usda') {
    STATE.btnDown.KEEP = 1;
    playDetentTick(2400, 0.05, 'press');
    if (kind === 'png' && renderer) {
      renderer.render(scene, camera);
      const a = document.createElement('a');
      a.href = renderer.domElement.toDataURL('image/png');
      a.download = 'stelline_orb_05_master_frame.png';
      a.click();
      return;
    }
    if (kind === 'obj') {
      const obj = `# VESPER FIELD ORB 05 // FixFlip=ON\no Prop_Birthday_Cake_Bundt\nv 0 0 0\nv 0.56 0 0\nv 0 0.34 0\nvn 0 1 0\nf 1//1 2//1 3//1\n`;
      downloadBlob('stelline_orb_05_cake_fixflip.obj', obj);
      return;
    }
    if (kind === 'imm') {
      downloadBlob('stelline_orb_05_capsule.imm.json', JSON.stringify({ instrument: 'Stelline-Orb-Pro', state: STATE }, null, 2), 'application/json');
      return;
    }
    const usda = `#usda 1.0
(
    defaultPrim = "Stelline_Chamber_Root"
    upAxis = "Y"
)
def Xform "Stelline_Chamber_Root"
{
    def Scope "c_01_PHYSICAL_LAB"
    {
        def Cylinder "Glass_Partition" { double radius = 8.75; bool primvars:isShadowRayBypass = true }
    }
    def Scope "c_02_HOLOGRAM_MEMORY"
    {
        def Xform "Prop_Birthday_Cake"
        {
            float custom:bundtMorph = ${STATE.cake.bundt.toFixed(3)}
            int custom:candles = ${STATE.cake.candles}
            string custom:inscription = "${STATE.cake.customText}"
            bool custom:childrenClockHeld = ${STATE.kids.held}
        }
    }
}
`;
    downloadBlob('stelline_orb_05_scene.usda', usda);
  }
  /* ---------------- 11. 45-Second Choreographed Director Film Sequence (Builds Cake & Scene with Clicks & Ring Drags) ---------------- */
  let lastReelTickStep = -1;

  function startDirectorReel() {
    STATE.reel.active = true;
    STATE.reel.lockedT = null;
    STATE.reel.t = 0;
    STATE.btnDown.REEL = 1;
    lastReelTickStep = -1;
    playDetentTick(1800, 0.05, 'press');
  }

  function updateDirectorReel(t, L) {
    // L is computeOrbLayout(w, h, dpr) so cursor coordinates match the exact hardware controls on #orbProCanvas
    const C = STATE.cursor;
    C.visible = true;
    C.down = false;
    C.dragDir = 0;

    const ringX = idx => L.barrelX + (idx + 0.5) * L.ringW;
    const ringY = L.barrelY + L.barrelH * 0.5;

    const fireTickEvery = (intervalSec, freq, ringIdx, dir) => {
      const step = Math.floor(t / intervalSec);
      if (step !== lastReelTickStep) {
        lastReelTickStep = step;
        if (ringIdx != null) {
          STATE.activeBarrelRing = ringIdx;
          STATE.barrelTargets[ringIdx] += (dir || 1) * 0.24;
        }
        C.ripple = 1.0;
        playDetentTick(freq, 0.032);
      }
    };

    if (t < 3.5) {
      // [00:00 - 00:03.5] ACT I: Empty Dark Chamber -> Move Cursor to CAST Button & Click to Spawn Table + Cylindrical Sponge Base
      STATE.implStep = 1;
      STATE.sceneMode = 'birthday';
      STATE.forestRecede = 1.0;
      const u = clamp(t / 1.4, 0, 1);
      C.x = lerp(L.cx, L.castBtn[0], smooth(u));
      C.y = lerp(L.cy + 40 * L.dpr, L.castBtn[1], smooth(u));
      C.label = t < 1.4 ? 'MOVE -> CAST (SEED->ROOM)' : 'CLICK: CAST TABLE & SPONGE DRUM';
      if (t < 1.4) {
        STATE.table.exists = true;
        STATE.cake.projected = false;
        STATE.kids.projected = false;
        STATE.kids.anaVisible = false;
      } else {
        if (t < 1.65) {
          C.down = true;
          STATE.btnDown.CAST = 1;
          fireTickEvery(0.5, 920, null, 1);
        }
        const g = smooth((t - 1.4) / 1.8);
        STATE.cake.projected = true;
        STATE.cake.grow = g;
        STATE.cake.bundt = 0.0;
        STATE.cake.icingCoat = 0.0;
        STATE.cake.shellsCount = 0;
        STATE.cake.pipeProgress = 0.0;
        STATE.cake.candles = 0;
        STATE.cake.flames = 0.0;
        STATE.kids.projected = false;
        STATE.kids.anaVisible = false;
        STATE.weaver.squeeze = 0.96;
        STATE.opState = 'CAST // SPONGE DRUM ON TABLE';
      }
    } else if (t < 10.0) {
      // [00:03.5 - 00:10.0] ACT II: Drag Ring 2 (BUNDT MORPH) Upward -> Morph Cylindrical Sponge into 12-Flute Scalloped Bundt Torus
      STATE.implStep = 2;
      STATE.sceneMode = 'birthday';
      const u = clamp((t - 3.5) / 5.8, 0, 1);
      const rx = ringX(1);
      C.x = rx;
      C.y = ringY + Math.sin((t - 3.5) * 3.8) * (L.barrelH * 0.32);
      C.down = true;
      C.dragDir = -1;
      C.label = `DRAG R2 (SCULPT) // BUNDT 12-FLUTE ${Math.round(u * 92)}%`;
      STATE.cake.projected = true;
      STATE.cake.grow = 1.0;
      STATE.cake.bundt = smooth(u) * 0.92;
      STATE.cake.icingCoat = 0.0;
      STATE.cake.shellsCount = 0;
      STATE.cake.pipeProgress = 0.0;
      STATE.cake.candles = 0;
      STATE.cake.flames = 0.0;
      STATE.kids.projected = false;
      STATE.kids.anaVisible = false;
      STATE.weaver.bimanualScale = lerp(1.0, 1.32, smooth(u));
      STATE.ringAngles.middle = STATE.cake.bundt;
      STATE.cameraOrbit[0] = Math.sin((t - 3.5) * 0.45) * 0.18;
      STATE.cameraOrbit[1] = lerp(0.08, 0.22, smooth(u));
      STATE.opState = `SCULPT // 12-FLUTE BUNDT ${Math.round(STATE.cake.bundt * 100)}%`;
      fireTickEvery(0.22, 1780, 1, 1);
    } else if (t < 16.5) {
      // [00:10.0 - 00:16.5] ACT III: Drag Ring 3 (ICING & SHELLS) -> Pour Glossy Buttercream Drip Glaze & Pipe 44 Shell Rosettes
      STATE.implStep = 2;
      STATE.sceneMode = 'birthday';
      const u = clamp((t - 10.0) / 5.8, 0, 1);
      const rx = ringX(2);
      C.x = rx;
      C.y = ringY - Math.cos((t - 10.0) * 4.2) * (L.barrelH * 0.32);
      C.down = true;
      C.dragDir = -1;
      STATE.cake.projected = true;
      STATE.cake.grow = 1.0;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = smooth(Math.min(1, u * 1.35));
      STATE.cake.shellsCount = Math.round(smooth(clamp((u - 0.25) / 0.75, 0, 1)) * 44);
      STATE.cake.pipeProgress = 0.0;
      STATE.cake.candles = 0;
      STATE.cake.flames = 0.0;
      STATE.kids.projected = false;
      STATE.kids.anaVisible = true;
      STATE.kids.anaAlpha = smooth(u) * 0.65;
      STATE.weaver.bimanualScale = 1.36;
      C.label = `DRAG R3 (GLAZE) // DRIP ${(STATE.cake.icingCoat * 100).toFixed(0)}% · ${STATE.cake.shellsCount}/44 SHELLS`;
      STATE.cameraOrbit[0] = 0.15 * Math.cos((t - 10.0) * 0.5);
      STATE.cameraOrbit[1] = 0.24;
      STATE.opState = `ICING // ${STATE.cake.shellsCount} PIPED SHELL ROSETTES`;
      fireTickEvery(0.18, 2020, 2, 1);
    } else if (t < 23.0) {
      // [00:16.5 - 00:23.0] ACT IV: Etch-a-Sketch Pipe Red Inscription (生日快樂 + Z Flourish) Across the Crown
      STATE.implStep = 3;
      STATE.sceneMode = 'birthday';
      const u = clamp((t - 16.5) / 5.9, 0, 1);
      const rx = ringX(2);
      C.x = rx + Math.sin((t - 16.5) * 6.0) * (L.ringW * 0.35);
      C.y = ringY + Math.cos((t - 16.5) * 5.0) * (L.barrelH * 0.30);
      C.down = true;
      C.dragDir = 1;
      STATE.cake.projected = true;
      STATE.cake.grow = 1.0;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = u;
      STATE.cake.candles = 0;
      STATE.cake.flames = 0.0;
      STATE.kids.projected = false;
      STATE.kids.anaVisible = true;
      STATE.kids.anaAlpha = 0.72;
      STATE.weaver.bimanualScale = 1.42;
      C.label = `ETCH PIPE R2+R3 // WRITING "生日快樂" ${(u * 100).toFixed(0)}%`;
      STATE.cameraOrbit[0] = Math.sin(u * Math.PI) * 0.10;
      STATE.cameraOrbit[1] = lerp(0.24, 0.34, Math.sin(u * Math.PI));
      STATE.opState = `PIPING // 生日快樂 (${Math.ceil(u * 18)}/18 STROKES)`;
      fireTickEvery(0.16, 2320, 2, 1);
    } else if (t < 29.5) {
      // [00:23.0 - 00:29.5] ACT V: Turn Ring 4 (CANDLES 1..7) -> Ignite 3200K Teardrop Flames -> Summon Birthday Party Children & Ana
      STATE.implStep = 4;
      STATE.sceneMode = 'birthday';
      const u = clamp((t - 23.0) / 6.0, 0, 1);
      const rx = ringX(3);
      C.x = rx;
      C.y = ringY + Math.sin((t - 23.0) * 4.5) * (L.barrelH * 0.32);
      C.down = true;
      C.dragDir = -1;
      STATE.cake.projected = true;
      STATE.cake.grow = 1.0;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 1.0;
      STATE.cake.candles = clamp(Math.ceil(u * 9), 1, 7);
      STATE.cake.flames = smooth(clamp((u - 0.18) / 0.45, 0, 1));
      STATE.kids.projected = u > 0.25;
      STATE.kids.grow = smooth(clamp((u - 0.25) / 0.55, 0, 1));
      STATE.kids.held = false;
      STATE.kids.anaVisible = true;
      STATE.kids.anaAlpha = 0.92;
      STATE.weaver.bimanualScale = lerp(1.42, 1.0, smooth(u));
      STATE.cameraOrbit[0] = lerp(0.08, 0.0, smooth(u));
      STATE.cameraOrbit[1] = lerp(0.24, 0.08, smooth(u));
      C.label = `DRAG R4 (CANDLES) // ${STATE.cake.candles} CANDLES · 3200K FLAMES & KIDS`;
      STATE.opState = `IGNITED // ${STATE.cake.candles} CANDLES + CHILDREN BOUNCE`;
      fireTickEvery(0.24, 2150, 3, 1);
    } else if (t < 37.5) {
      // [00:29.5 - 00:37.5] ACT VI: THE HERO PROOF — Click THUMB HOLD (Lock Children @ t_H = 2.00s, r=0) & Drag Ring 5 (Rotate Cake & 3200K Light, r=1)
      STATE.implStep = 5;
      STATE.sceneMode = 'birthday';
      STATE.cake.projected = true;
      STATE.cake.grow = 1.0;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 1.0;
      STATE.cake.candles = 7;
      STATE.cake.flames = 1.0;
      STATE.kids.projected = true;
      STATE.kids.grow = 1.0;
      STATE.kids.anaVisible = true;
      STATE.kids.anaAlpha = 0.92;
      STATE.weaver.bimanualScale = 1.0;
      const subT = t - 29.5;
      if (subT < 1.2) {
        C.x = lerp(ringX(3), L.thumbBtn[0], smooth(subT / 0.9));
        C.y = lerp(ringY, L.thumbBtn[1], smooth(subT / 0.9));
        C.down = subT > 0.7;
        if (subT > 0.7) {
          STATE.btnDown.HOLD = 1;
          STATE.kids.held = true;
        }
        C.label = 'CLICK THUMB // HOLD CHILDREN @ t_H = 2.00s (r=0)';
        STATE.opState = 'HOLD ENGAGED // KIDS FROZEN (r=0)';
        fireTickEvery(0.45, 1320, null, 1);
      } else {
        const u = clamp((subT - 1.2) / 6.5, 0, 1);
        STATE.kids.held = true;
        C.x = ringX(4);
        C.y = ringY + Math.sin(subT * 4.2) * (L.barrelH * 0.34);
        C.down = true;
        C.dragDir = -1;
        STATE.cake.turnDeg = (18 + u * 360) % 360;
        STATE.weaver.rotZ = (STATE.cake.turnDeg * Math.PI) / 180;
        STATE.ringAngles.inner = u;
        STATE.cameraOrbit[0] = Math.sin(u * TAU) * 0.22;
        C.label = `JOG R5 (TIME) // CAKE TURNS ${STATE.cake.turnDeg.toFixed(0)}° WHILE KIDS HOLD`;
        STATE.opState = `HERO PROOF // KIDS HELD (r=0) · CAKE ${STATE.cake.turnDeg.toFixed(0)}°`;
        fireTickEvery(0.18, 2480, 4, 1);
      }
    } else if (t < 42.0) {
      // [00:37.5 - 00:42.0] ACT VII: Capacitive Squeeze Scanline Hologram Weave (37.5-40.2s) + Forest & Carabus Beetle Reveal (40.2-42.0s)
      STATE.implStep = 6;
      STATE.cake.projected = true;
      STATE.cake.grow = 1.0;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 1.0;
      STATE.cake.candles = 7;
      STATE.cake.flames = 1.0;
      STATE.kids.projected = true;
      STATE.kids.grow = 1.0;
      STATE.kids.held = true;
      STATE.kids.anaVisible = true;
      STATE.kids.anaAlpha = 0.92;
      STATE.weaver.bimanualScale = 1.0;
      if (t < 40.3) {
        STATE.sceneMode = 'birthday';
        const u = clamp((t - 37.5) / 2.8, 0, 1);
        const [sx, sy, sw, sh] = L.squeezeRect;
        const sqVal = 0.96 - 0.74 * Math.sin(u * Math.PI);
        STATE.weaver.squeeze = sqVal;
        C.x = sx + sw * 0.5;
        C.y = sy + sh * (1.0 - sqVal);
        C.down = true;
        C.label = `SQUEEZE SENSOR // ${(sqVal * 100).toFixed(0)}% (${sqVal < 0.45 ? 'VOLUMETRIC SCANLINE' : 'SOLID PBR'})`;
        STATE.opState = sqVal < 0.45 ? 'WEAVE // HOLOGRAM SCANLINE WAVE' : 'WEAVE // SOLIDIFYING PBR';
        fireTickEvery(0.22, 1540, 0, -1);
      } else {
        STATE.sceneMode = 'forest';
        STATE.forestRecede = 0.0;
        STATE.weaver.squeeze = 0.94;
        C.x = L.mirrorBtn[0];
        C.y = L.mirrorBtn[1];
        C.down = t < 40.7;
        C.label = 'FOREST CLEARING // ANCHORED BEETLE (CARABUS STELLINAE)';
        STATE.opState = 'FOREST // CARABUS STELLINAE [542nm]';
        fireTickEvery(0.35, 2050, 0, 1);
      }
    } else {
      // [00:42.0 - 00:45.0] ACT VIII: Click BAKE & COMMIT MEMORY (<100MB FixFlip=ON) -> Final Hero Tableau
      STATE.implStep = 7;
      STATE.sceneMode = 'birthday';
      STATE.forestRecede = 1.0;
      STATE.cake.projected = true;
      STATE.cake.grow = 1.0;
      STATE.cake.bundt = 0.92;
      STATE.cake.icingCoat = 1.0;
      STATE.cake.shellsCount = 44;
      STATE.cake.pipeProgress = 1.0;
      STATE.cake.candles = 7;
      STATE.cake.flames = 1.0;
      STATE.kids.projected = true;
      STATE.kids.grow = 1.0;
      STATE.kids.held = true;
      STATE.kids.anaVisible = true;
      STATE.kids.anaAlpha = 0.92;
      STATE.weaver.bimanualScale = 1.0;
      STATE.weaver.squeeze = 0.96;
      const u = clamp((t - 42.0) / 3.0, 0, 1);
      C.x = lerp(L.mirrorBtn[0], L.rightPanelX + L.rightPanelW * 0.5, smooth(Math.min(1, u * 2)));
      C.y = lerp(L.mirrorBtn[1], L.cy + L.orbR * 0.25, smooth(Math.min(1, u * 2)));
      if (u > 0.35 && !STATE.perf.bakedLoop) {
        C.down = true;
        optimizeAndBakeSequence();
      }
      STATE.cake.turnDeg = (STATE.cake.turnDeg + 0.45) % 360;
      STATE.cameraOrbit[0] = lerp(STATE.cameraOrbit[0], 0.0, 0.08);
      STATE.cameraOrbit[1] = lerp(STATE.cameraOrbit[1], 0.09, 0.08);
      C.label = 'BAKED & COMMITTED // 19.4MB · FixFlip=ON · .USDA READY';
      STATE.opState = 'COMPLETE // MEMORY IMPRINTED';
    }

    rebuildProgressiveCake();
  }

  /* ---------------- 12. Machined Metallic 5-Ring + Concentric Seed Core Orb Deck (#orbProCanvas) ---------------- */
  let orbCanvas, orbCtx, orbDrag = null;

  function computeOrbLayout(W, H, dpr) {
    const narrow = W < 680 * dpr;
    const cx = W * 0.48;
    const cy = H * 0.52;
    const orbR = Math.min(W * (narrow ? 0.14 : 0.076), H * 0.29);

    // Central Machined 5-Ring Barrel sitting to the left of the Concentric Holographic Lens Core
    const barrelW = Math.min(W * (narrow ? 0.34 : 0.21), 265 * dpr);
    const barrelH = orbR * 1.72;
    const barrelX = cx - barrelW * 0.58 - orbR * 0.28;
    const barrelY = cy - barrelH * 0.5;
    const ringW = barrelW / 5;

    // Concentric Seed Core & Optical Lens on the right end of the barrel (like the Lot #131 prop lens)
    const lensCx = barrelX + barrelW + orbR * 0.86;
    const lensCy = cy;

    // Flanking Hardware Actuator Buttons
    const btnXLeft = barrelX - 30 * dpr;
    const btnXRight = lensCx + orbR + 30 * dpr;

    // Left Telemetry & Capacitive Squeeze Wing
    const leftPanelX = 12 * dpr;
    const leftPanelW = Math.max(140 * dpr, btnXLeft - 24 * dpr - leftPanelX);

    // Right Multi-Pass + Bake Monitor + Export Bridge Wing
    const rightPanelX = btnXRight + 26 * dpr;
    const rightPanelW = Math.min(340 * dpr, Math.max(175 * dpr, W - rightPanelX - 12 * dpr));

    return {
      W, H, dpr, narrow, cx, cy, orbR,
      barrelX, barrelY, barrelW, barrelH, ringW,
      lensCx, lensCy,
      rOuter: orbR * 0.96,
      rMiddle: orbR * 0.73,
      rInner: orbR * 0.52,
      rCore: orbR * 0.33,
      leftPanelX, leftPanelW,
      rightPanelX, rightPanelW,
      squeezeRect: [leftPanelX, cy - orbR * 0.80, 20 * dpr, orbR * 1.60],
      castBtn: [btnXLeft, cy - orbR * 0.58, 21 * dpr],
      modeLockBtn: [btnXLeft, cy + 0, 20 * dpr],
      reelBtn: [btnXLeft, cy + orbR * 0.58, 21 * dpr],
      thumbBtn: [btnXRight, cy - orbR * 0.58, 22 * dpr],
      rewindBtn: [btnXRight, cy + 0, 20 * dpr],
      mirrorBtn: [btnXRight, cy + orbR * 0.58, 20 * dpr],
      stepRowY: H - 25 * dpr,
      seedRowY: 7 * dpr
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
      STATE.reel.active = false;
      STATE.cursor.visible = true;
      STATE.cursor.x = x;
      STATE.cursor.y = y;
      STATE.cursor.down = true;
      STATE.cursor.ripple = 1.0;

      // 1. Top Seed Selector Strip
      if (y >= L.seedRowY && y <= L.seedRowY + 21 * dpr) {
        const kw = Math.min(L.W / SEEDS.length, 132 * dpr);
        const x0 = L.cx - (kw * SEEDS.length) / 2;
        const idx = Math.floor((x - x0) / kw);
        if (idx >= 0 && idx < SEEDS.length) {
          selectSeed(idx);
          projectActiveSeedToRoom();
          return;
        }
      }

      // 2. Bottom 7-Step Implementation Protocol Strip
      if (y >= L.stepRowY && y <= L.stepRowY + 21 * dpr) {
        const kw = Math.min(L.W / IMPL_STEPS.length, 165 * dpr);
        const x0 = L.cx - (kw * IMPL_STEPS.length) / 2;
        const idx = Math.floor((x - x0) / kw);
        if (idx >= 0 && idx < IMPL_STEPS.length) {
          runImplementationStep(idx + 1);
          return;
        }
      }

      // 3. Hardware Buttons
      if (Math.hypot(x - L.castBtn[0], y - L.castBtn[1]) <= L.castBtn[2]) {
        projectActiveSeedToRoom();
        return;
      }
      if (Math.hypot(x - L.modeLockBtn[0], y - L.modeLockBtn[1]) <= L.modeLockBtn[2]) {
        STATE.weaver.timelineCollapsed = !STATE.weaver.timelineCollapsed;
        playDetentTick(1750, 0.035, 'press');
        return;
      }
      if (Math.hypot(x - L.reelBtn[0], y - L.reelBtn[1]) <= L.reelBtn[2]) {
        startDirectorReel();
        return;
      }
      if (Math.hypot(x - L.thumbBtn[0], y - L.thumbBtn[1]) <= L.thumbBtn[2]) {
        toggleHoldChildren();
        return;
      }
      if (Math.hypot(x - L.rewindBtn[0], y - L.rewindBtn[1]) <= L.rewindBtn[2]) {
        STATE.loop.time = 0;
        STATE.cake.turnDeg = 0;
        playDetentTick(1400, 0.04, 'press');
        return;
      }
      if (Math.hypot(x - L.mirrorBtn[0], y - L.mirrorBtn[1]) <= L.mirrorBtn[2]) {
        STATE.sceneMode = STATE.sceneMode === 'forest' ? 'birthday' : 'forest';
        STATE.forestRecede = STATE.sceneMode === 'forest' ? 0.0 : 1.0;
        playDetentTick(2050, 0.04, 'press');
        return;
      }

      // 4. Capacitive Squeeze Sensor Rail
      const [sx, sy, sw, sh] = L.squeezeRect;
      if (x >= sx - 8 * dpr && x <= sx + sw + 20 * dpr && y >= sy && y <= sy + sh) {
        orbDrag = { type: 'squeeze', sy, sh };
        setSqueezePressure(1 - (y - sy) / sh);
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      // 5. Right Wing Bake & Export Buttons
      if (!L.narrow && x >= L.rightPanelX && x <= L.rightPanelX + L.rightPanelW) {
        const relY = y - (L.cy - L.orbR * 0.78);
        const totalH = L.orbR * 1.56;
        if (relY > totalH * 0.48 && relY < totalH * 0.74) {
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

      // 6. 5 Physical Machined Barrel Rings (R1..R5)
      if (x >= L.barrelX && x <= L.barrelX + L.barrelW && y >= L.barrelY - 10 * dpr && y <= L.barrelY + L.barrelH + 10 * dpr) {
        const rIdx = clamp(Math.floor((x - L.barrelX) / L.ringW), 0, 4);
        STATE.activeBarrelRing = rIdx;
        orbDrag = { type: 'barrelRing', rIdx, lastY: e.clientY, acc: 0 };
        playDetentTick(1600 + rIdx * 200, 0.028);
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      // 7. Concentric Seed Lens Core
      const distLens = Math.hypot(x - L.lensCx, y - L.lensCy);
      if (distLens <= L.rCore) {
        projectActiveSeedToRoom();
        return;
      }
      if (distLens <= L.rOuter * 1.08) {
        const ring = distLens <= L.rInner ? 'inner' : distLens <= L.rMiddle ? 'middle' : 'outer';
        STATE.activeRing = ring;
        orbDrag = { type: 'lensRing', ring, lastX: e.clientX, lastY: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener('pointermove', e => {
      const [x, y] = getPos(e);
      STATE.cursor.x = x;
      STATE.cursor.y = y;
      if (!orbDrag) return;
      if (orbDrag.type === 'squeeze') {
        setSqueezePressure(1 - (y - orbDrag.sy) / orbDrag.sh);
      } else if (orbDrag.type === 'barrelRing') {
        const dy = orbDrag.lastY - e.clientY;
        orbDrag.lastY = e.clientY;
        orbDrag.acc += dy;
        STATE.cursor.dragDir = Math.sign(-dy);
        while (Math.abs(orbDrag.acc) >= 9) {
          const step = Math.sign(orbDrag.acc);
          orbDrag.acc -= step * 9;
          turnBarrelRing(orbDrag.rIdx, step);
        }
      } else if (orbDrag.type === 'lensRing') {
        const dx = (e.clientX - orbDrag.lastX) / 140;
        const dy = -(e.clientY - orbDrag.lastY) / 140;
        orbDrag.lastX = e.clientX;
        orbDrag.lastY = e.clientY;
        const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        if (Math.abs(d) > 0.001) turnRing(orbDrag.ring, d);
      }
    });

    const endDrag = () => {
      orbDrag = null;
      STATE.cursor.down = false;
      STATE.cursor.dragDir = 0;
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

    // 1. Top Row: 9 Holographic Seeds
    const seedKw = Math.min(w / SEEDS.length, 132 * dpr);
    const seedX0 = L.cx - (seedKw * SEEDS.length) / 2;
    SEEDS.forEach((s, i) => {
      const on = STATE.seedIdx === i;
      const kx = seedX0 + i * seedKw + 2 * dpr;
      x.fillStyle = on ? 'rgba(22, 48, 58, 0.95)' : '#0b0f14';
      x.strokeStyle = on ? '#5ff0dc' : '#24303c';
      x.lineWidth = (on ? 1.8 : 1) * dpr;
      x.beginPath();
      x.roundRect(kx, L.seedRowY, seedKw - 4 * dpr, 19 * dpr, 4 * dpr);
      x.fill();
      x.stroke();
      x.fillStyle = on ? '#5ff0dc' : '#8fa2b4';
      x.font = `700 ${Math.round((L.narrow ? 7.2 : 8.0) * dpr)}px "JetBrains Mono",monospace`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(L.narrow ? s.short.slice(0, 7) : s.label, kx + (seedKw - 4 * dpr) / 2, L.seedRowY + 9.5 * dpr);
    });

    // 2. Machined Metallic 5-Ring Canon/ARRI Barrel (Left of Concentric Seed Core)
    const bx = L.barrelX, by = L.barrelY, bw = L.barrelW, bh = L.barrelH;
    // Outer CNC Aluminum Housing Shroud
    const bodyGrad = x.createLinearGradient(0, by, 0, by + bh);
    bodyGrad.addColorStop(0.0, '#2a2e33');
    bodyGrad.addColorStop(0.22, '#5c636b');
    bodyGrad.addColorStop(0.48, '#363b40');
    bodyGrad.addColorStop(0.82, '#14171a');
    bodyGrad.addColorStop(1.0, '#0a0c0e');
    x.fillStyle = bodyGrad;
    x.strokeStyle = '#52606e';
    x.lineWidth = 1.4 * dpr;
    x.beginPath();
    x.roundRect(bx - 12 * dpr, by - 6 * dpr, bw + 24 * dpr + L.orbR * 0.9, bh + 12 * dpr, 14 * dpr);
    x.fill();
    x.stroke();

    // Red Canon Cinema Ring Band between Barrel and Optical Seed Lens
    x.fillStyle = '#d83b2b';
    x.fillRect(bx + bw + 4 * dpr, by - 5 * dpr, 5 * dpr, bh + 10 * dpr);

    // 5 Rotating Knurled / Ribbed / Fluted Rings with Red Witness Marks & Live Value Plates
    const barrelMeta = [
      { name: 'R1:FIELD',  val: STATE.sceneMode === 'forest' ? 'FOREST' : `${(STATE.cameraOrbit[0] * 57.3).toFixed(0)}°`, col: '#5ff0dc' },
      { name: 'R2:BUNDT',  val: `${Math.round(STATE.cake.bundt * 100)}%`,   col: '#ffcc66' },
      { name: 'R3:ICING',  val: STATE.cake.pipeProgress > 0.02 && STATE.cake.pipeProgress < 0.99 ? `PIPE ${(STATE.cake.pipeProgress * 100).toFixed(0)}%` : `${STATE.cake.shellsCount} SHL`, col: '#ff9f43' },
      { name: 'R4:CANDLE', val: `${STATE.cake.candles} · ${(STATE.cake.flames * 100).toFixed(0)}%`, col: '#ff5a3c' },
      { name: 'R5:TIME',   val: `${STATE.cake.turnDeg.toFixed(0)}°`,       col: '#98f5b0' }
    ];

    for (let i = 0; i < 5; i++) {
      const rx = bx + i * L.ringW + 2 * dpr;
      const rw = L.ringW - 4 * dpr;
      const isAct = STATE.activeBarrelRing === i;

      // Cylindrical metallic shading per ring
      const rg = x.createLinearGradient(0, by, 0, by + bh);
      rg.addColorStop(0.0, '#101317');
      rg.addColorStop(0.26, isAct ? '#6c7680' : '#4a5158');
      rg.addColorStop(0.50, isAct ? '#8a96a2' : '#626a73');
      rg.addColorStop(0.76, '#282d33');
      rg.addColorStop(1.0, '#090b0d');

      x.save();
      x.fillStyle = rg;
      x.strokeStyle = isAct ? barrelMeta[i].col : '#38434f';
      x.lineWidth = (isAct ? 2.0 : 1.0) * dpr;
      x.beginPath();
      x.roundRect(rx, by, rw, bh, 5 * dpr);
      x.fill();
      x.stroke();
      x.clip();

      // Rotating Knurl / Flute Ridges projected onto cylinder
      const ang = STATE.barrelAngles[i] || 0;
      const ridgeCount = 26;
      for (let k = 0; k < ridgeCount; k++) {
        const th = (k / ridgeCount) * TAU + ang;
        const c = Math.cos(th);
        if (c <= 0.02) continue;
        const py = by + bh * 0.5 + Math.sin(th) * (bh * 0.48);
        const major = k % 4 === 0;
        x.strokeStyle = major
          ? `rgba(255, 255, 255, ${(0.22 + 0.48 * c).toFixed(2)})`
          : `rgba(18, 22, 26, ${(0.35 + 0.45 * c).toFixed(2)})`;
        x.lineWidth = (major ? 2.1 : 1.2) * dpr * (0.5 + 0.5 * c);
        x.beginPath();
        x.moveTo(rx + 3 * dpr, py);
        x.lineTo(rx + rw - 3 * dpr, py);
        x.stroke();
      }

      // Red Rotating Witness Index Mark on each ring
      const wTh = ((ang % TAU) + TAU) % TAU;
      const wy = by + bh * 0.5 + Math.sin(wTh) * (bh * 0.44);
      if (Math.cos(wTh) > 0) {
        x.fillStyle = '#ff5a3c';
        x.fillRect(rx + 2 * dpr, wy - 1.8 * dpr, rw - 4 * dpr, 3.6 * dpr);
      }
      x.restore();

      // Engraved OLED Readout Pill on the Ring Center
      const pillH = 30 * dpr;
      const pillY = by + bh * 0.5 - pillH * 0.5;
      x.fillStyle = 'rgba(6, 10, 14, 0.86)';
      x.strokeStyle = isAct ? barrelMeta[i].col : 'rgba(120, 145, 165, 0.35)';
      x.lineWidth = 1 * dpr;
      x.beginPath();
      x.roundRect(rx + 2 * dpr, pillY, rw - 4 * dpr, pillH, 3 * dpr);
      x.fill();
      x.stroke();

      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = isAct ? barrelMeta[i].col : '#c8d6e2';
      x.font = `700 ${Math.round(6.8 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(barrelMeta[i].name, rx + rw * 0.5, pillY + 9.5 * dpr);
      x.fillStyle = '#ffffff';
      x.font = `700 ${Math.round(7.6 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(barrelMeta[i].val, rx + rw * 0.5, pillY + 21.5 * dpr);
    }

    // 3. Concentric Optical Seed Lens on Right End of Barrel (3 Concentric Rings + Spinning Seed Core)
    const ringDefs = [
      { key: 'outer',  rOut: L.rOuter,  rIn: L.rMiddle, label: 'SEED',   color: '#5ff0dc', ticks: 18 },
      { key: 'middle', rOut: L.rMiddle, rIn: L.rInner,  label: 'DEFORM', color: '#ffcc66', ticks: 26 },
      { key: 'inner',  rOut: L.rInner,  rIn: L.rCore,   label: 'TIME',   color: '#ff9f43', ticks: 36 }
    ];

    ringDefs.forEach(rd => {
      const isAct = STATE.activeRing === rd.key;
      x.save();
      x.beginPath();
      x.arc(L.lensCx, L.lensCy, rd.rOut, 0, TAU);
      x.arc(L.lensCx, L.lensCy, rd.rIn, 0, TAU, true);
      x.fillStyle = isAct ? 'rgba(26, 42, 54, 0.96)' : 'rgba(13, 18, 24, 0.94)';
      x.fill();
      x.lineWidth = (isAct ? 2.0 : 1.0) * dpr;
      x.strokeStyle = isAct ? rd.color : '#384654';
      x.stroke();

      const phase = (STATE.ringAngles[rd.key] || 0) * TAU;
      for (let k = 0; k < rd.ticks; k++) {
        const a = (k / rd.ticks) * TAU + phase;
        const r0 = rd.rIn + 2.5 * dpr;
        const r1 = rd.rOut - 2.5 * dpr;
        x.strokeStyle = k % 3 === 0 ? rd.color : 'rgba(180, 198, 214, 0.24)';
        x.lineWidth = (k % 3 === 0 ? 1.6 : 0.8) * dpr;
        x.beginPath();
        x.moveTo(L.lensCx + Math.cos(a) * r0, L.lensCy + Math.sin(a) * r0);
        x.lineTo(L.lensCx + Math.cos(a) * r1, L.lensCy + Math.sin(a) * r1);
        x.stroke();
      }
      x.restore();
    });

    // Translucent Seed Core Inside the Lens
    const coreGrad = x.createRadialGradient(L.lensCx - L.rCore * 0.25, L.lensCy - L.rCore * 0.25, 2, L.lensCx, L.lensCy, L.rCore);
    coreGrad.addColorStop(0, 'rgba(135, 248, 255, 0.45)');
    coreGrad.addColorStop(0.6, 'rgba(12, 36, 46, 0.94)');
    coreGrad.addColorStop(1, '#04080c');
    x.fillStyle = coreGrad;
    x.strokeStyle = '#5ff0dc';
    x.lineWidth = 1.8 * dpr;
    x.beginPath();
    x.arc(L.lensCx, L.lensCy, L.rCore, 0, TAU);
    x.fill();
    x.stroke();

    const activeSeed = SEEDS[STATE.seedIdx];
    const spin = now * 0.002;
    x.save();
    x.translate(L.lensCx, L.lensCy - 2 * dpr);
    x.strokeStyle = '#ffcc66';
    x.lineWidth = 1.2 * dpr;
    const cr = L.rCore * 0.46;
    for (let k = 0; k < 3; k++) {
      x.beginPath();
      x.ellipse(0, 0, cr, cr * Math.abs(Math.sin(spin + k * 1.05)), k * 0.5, 0, TAU);
      x.stroke();
    }
    x.fillStyle = '#ffffff';
    x.font = `700 ${Math.round(7.0 * dpr)}px "JetBrains Mono",monospace`;
    x.textAlign = 'center';
    x.fillText(activeSeed.short, 0, L.rCore * 0.62);
    x.restore();

    // 4. Six Flanking Tactile Hardware Buttons
    const drawOrbBtn = (bx0, by0, rad, topTxt, subTxt, isOn, col, pressAmt) => {
      const py = by0 + (pressAmt || 0) * 2.5 * dpr;
      x.save();
      x.fillStyle = isOn ? 'rgba(24, 48, 56, 0.96)' : '#12171e';
      x.strokeStyle = isOn ? col : '#455261';
      x.lineWidth = (isOn ? 2.2 : 1.2) * dpr;
      x.beginPath();
      x.arc(bx0, py, rad, 0, TAU);
      x.fill();
      x.stroke();
      x.fillStyle = isOn ? col : '#d8e4ee';
      x.font = `700 ${Math.round(7.2 * dpr)}px "JetBrains Mono",monospace`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(topTxt, bx0, py - rad * 0.18);
      x.fillStyle = '#8fa3b5';
      x.font = `600 ${Math.round(6.0 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(subTxt, bx0, py + rad * 0.30);
      x.restore();
    };

    drawOrbBtn(...L.castBtn, 'CAST', 'SEED->ROOM', STATE.cake.projected, '#5ff0dc', STATE.btnDown.CAST);
    drawOrbBtn(...L.modeLockBtn, STATE.weaver.timelineCollapsed ? 'SCULPT' : 'TIMELINE', STATE.weaver.timelineCollapsed ? 'LOCKED' : 'ACTIVE', STATE.weaver.timelineCollapsed, '#ffcc66', STATE.btnDown.MODE);
    drawOrbBtn(...L.reelBtn, STATE.reel.active ? 'FILMING' : 'PLAY FILM', 'AUTO BUILD', STATE.reel.active, '#ff5a3c', STATE.btnDown.REEL);

    drawOrbBtn(...L.thumbBtn, STATE.kids.held ? 'HOLD ON' : 'THUMB', 'KIDS r=0', STATE.kids.held, '#ffcc66', STATE.btnDown.HOLD);
    drawOrbBtn(...L.rewindBtn, '<< 00:00', 'RESET TURN', false, '#98f5b0', 0);
    drawOrbBtn(...L.mirrorBtn, STATE.sceneMode === 'forest' ? 'FOREST' : 'CHAMBER', 'SCENE SET', STATE.sceneMode === 'forest', '#5ff0dc', 0);

    // 5. Left Wing: Capacitive Squeeze Bar & Telemetry
    const [sx, sy, sw, sh] = L.squeezeRect;
    x.fillStyle = '#0c1117';
    x.strokeStyle = '#334150';
    x.lineWidth = 1.2 * dpr;
    x.beginPath();
    x.roundRect(sx, sy, sw, sh, 5 * dpr);
    x.fill();
    x.stroke();

    const fillH = sh * STATE.weaver.squeeze;
    const sqGrad = x.createLinearGradient(0, sy + sh, 0, sy);
    sqGrad.addColorStop(0, '#5ff0dc');
    sqGrad.addColorStop(0.5, '#ffcc66');
    sqGrad.addColorStop(1, '#ff5a3c');
    x.fillStyle = sqGrad;
    x.beginPath();
    x.roundRect(sx + 2.5 * dpr, sy + sh - fillH + 2 * dpr, sw - 5 * dpr, Math.max(4 * dpr, fillH - 4 * dpr), 3 * dpr);
    x.fill();

    if (!L.narrow) {
      const lx = sx + sw + 10 * dpr;
      const ly = sy + 6 * dpr;
      x.textAlign = 'left';
      x.fillStyle = '#5ff0dc';
      x.font = `700 ${Math.round(8.0 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(`STATE // ${STATE.opState}`, lx, ly);

      x.fillStyle = '#e8f0f6';
      x.font = `600 ${Math.round(7.4 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(`SQUEEZE: ${Math.round(STATE.weaver.squeeze * 100)}% (${STATE.weaver.squeeze < 0.4 ? 'SCANLINE' : 'SOLID PBR'})`, lx, ly + 15 * dpr);
      x.fillText(`BUNDT MORPH: ${Math.round(STATE.cake.bundt * 100)}% (12-FLUTE)`, lx, ly + 29 * dpr);
      x.fillText(`GLAZE & SHELLS: ${Math.round(STATE.cake.icingCoat * 100)}% · ${STATE.cake.shellsCount} ROSETTES`, lx, ly + 43 * dpr);
      x.fillText(`PIPED TEXT: ${STATE.cake.customText} (${Math.round(STATE.cake.pipeProgress * 100)}%)`, lx, ly + 57 * dpr);
      x.fillStyle = '#ffcc66';
      x.fillText(`CANDLES: ${STATE.cake.candles} WAX · 3200K ${(STATE.cake.flames * 100).toFixed(0)}%`, lx, ly + 71 * dpr);
      x.fillStyle = '#98f5b0';
      x.fillText(`KIDS CLOCK: ${STATE.kids.held ? 'HELD @ 2.00s (r=0)' : 'LIVE (r=1)'} · CAKE ${STATE.cake.turnDeg.toFixed(0)}°`, lx, ly + 85 * dpr);
    }

    // 6. Right Wing: Multi-Pass Sequencer, Performance/Bake Monitor & Export Bridge
    if (!L.narrow) {
      const rx = L.rightPanelX;
      const ry = sy + 4 * dpr;
      const rw = L.rightPanelW;

      x.textAlign = 'left';
      x.fillStyle = '#ffcc66';
      x.font = `700 ${Math.round(8.0 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(STATE.reel.active ? `DIRECTOR FILM // 00:${STATE.reel.t.toFixed(2).padStart(5, '0')} / 00:45.00` : `LOOP: 00:${STATE.loop.time.toFixed(2).padStart(5, '0')} / 00:15.00 [90Hz]`, rx, ry);

      STATE.loop.passes.forEach((p, idx) => {
        const py = ry + (14 + idx * 13) * dpr;
        x.fillStyle = p.color;
        x.font = `600 ${Math.round(7.1 * dpr)}px "JetBrains Mono",monospace`;
        x.fillText(`${p.name.slice(0, 29)} [${p.status}]`, rx, py);
      });

      const perfY = ry + 68 * dpr;
      x.fillStyle = '#101821';
      x.strokeStyle = STATE.perf.bakedLoop ? '#98f5b0' : '#385068';
      x.lineWidth = 1.2 * dpr;
      x.beginPath();
      x.roundRect(rx, perfY, rw, 26 * dpr, 4 * dpr);
      x.fill();
      x.stroke();

      x.fillStyle = STATE.perf.bakedLoop ? '#98f5b0' : '#5ff0dc';
      x.font = `700 ${Math.round(7.1 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(`PERF: ${STATE.perf.memMB}MB (<100MB OK) · ${(STATE.perf.polyCount / 1000).toFixed(1)}k POLY · ${STATE.perf.drawCalls} DC`, rx + 6 * dpr, perfY + 9 * dpr);
      x.fillStyle = '#ffcc66';
      x.fillText(STATE.perf.bakedLoop ? 'BAKED LOOP -> PAINT LAYER [FixFlip=ON]' : 'CLICK: OPTIMIZE & BAKE LOOPING SEQUENCE', rx + 6 * dpr, perfY + 19 * dpr);

      const expY = perfY + 30 * dpr;
      const expLabs = ['.USDA GRAPH', '.OBJ FixFlip', '.IMM CAPSULE', '4K .PNG'];
      const bwExp = rw / 4;
      expLabs.forEach((lab, i) => {
        const bxExp = rx + i * bwExp + 1.5 * dpr;
        x.fillStyle = '#14202c';
        x.strokeStyle = '#5ff0dc';
        x.beginPath();
        x.roundRect(bxExp, expY, bwExp - 3 * dpr, 19 * dpr, 3 * dpr);
        x.fill();
        x.stroke();
        x.fillStyle = '#e8f0f6';
        x.font = `700 ${Math.round(6.8 * dpr)}px "JetBrains Mono",monospace`;
        x.textAlign = 'center';
        x.fillText(lab, bxExp + (bwExp - 3 * dpr) / 2, expY + 9.5 * dpr);
      });
    }

    // 7. Bottom Row: 7-Step Implementation Protocol
    const stepKw = Math.min(w / IMPL_STEPS.length, 165 * dpr);
    const stepX0 = L.cx - (stepKw * IMPL_STEPS.length) / 2;
    IMPL_STEPS.forEach((st, i) => {
      const on = STATE.implStep === st.step;
      const kx = stepX0 + i * stepKw + 2 * dpr;
      x.fillStyle = on ? 'rgba(48, 38, 16, 0.96)' : '#0c1015';
      x.strokeStyle = on ? '#ffcc66' : '#26323f';
      x.lineWidth = (on ? 1.8 : 1) * dpr;
      x.beginPath();
      x.roundRect(kx, L.stepRowY, stepKw - 4 * dpr, 19 * dpr, 4 * dpr);
      x.fill();
      x.stroke();
      x.fillStyle = on ? '#ffcc66' : '#94a6b8';
      x.font = `700 ${Math.round((L.narrow ? 6.8 : 7.6) * dpr)}px "JetBrains Mono",monospace`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(L.narrow ? `S${st.step}` : st.code, kx + (stepKw - 4 * dpr) / 2, L.stepRowY + 9.5 * dpr);
    });

    // 8. Visible Operator Hand / Cursor Indicator with Click Ripples & Ring Drag Arrows
    if (STATE.cursor.visible) {
      const cx0 = STATE.cursor.x;
      const cy0 = STATE.cursor.y;
      x.save();
      if (STATE.cursor.ripple > 0.02) {
        const rr = (1.0 - STATE.cursor.ripple) * 32 * dpr + 8 * dpr;
        x.strokeStyle = `rgba(95, 240, 220, ${(STATE.cursor.ripple * 0.85).toFixed(2)})`;
        x.lineWidth = 2.2 * dpr;
        x.beginPath();
        x.arc(cx0, cy0, rr, 0, TAU);
        x.stroke();
      }
      // Tactile operator touch ring
      x.fillStyle = STATE.cursor.down ? 'rgba(255, 204, 102, 0.35)' : 'rgba(95, 240, 220, 0.20)';
      x.strokeStyle = STATE.cursor.down ? '#ffcc66' : '#5ff0dc';
      x.lineWidth = 2.2 * dpr;
      x.beginPath();
      x.arc(cx0, cy0, (STATE.cursor.down ? 11 : 13) * dpr, 0, TAU);
      x.fill();
      x.stroke();

      // Center dot
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(cx0, cy0, 3 * dpr, 0, TAU);
      x.fill();

      // Vertical drag direction arrows when turning a ring
      if (STATE.cursor.dragDir !== 0) {
        x.strokeStyle = '#ffcc66';
        x.lineWidth = 2 * dpr;
        for (const s of [-1, 1]) {
          const ay = cy0 + s * 20 * dpr;
          x.beginPath();
          x.moveTo(cx0 - 5 * dpr, ay - s * 4 * dpr);
          x.lineTo(cx0, ay);
          x.lineTo(cx0 + 5 * dpr, ay - s * 4 * dpr);
          x.stroke();
        }
      }

      if (STATE.cursor.label) {
        const tagW = (STATE.cursor.label.length * 5.4 + 16) * dpr;
        const tx = clamp(cx0 - tagW * 0.5, 12 * dpr, w - tagW - 12 * dpr);
        const ty = Math.max(30 * dpr, cy0 - 34 * dpr);
        x.fillStyle = 'rgba(4, 8, 12, 0.92)';
        x.strokeStyle = '#ffcc66';
        x.lineWidth = 1.2 * dpr;
        x.beginPath();
        x.roundRect(tx, ty, tagW, 18 * dpr, 4 * dpr);
        x.fill();
        x.stroke();
        x.fillStyle = '#ffcc66';
        x.font = `700 ${Math.round(7.4 * dpr)}px "JetBrains Mono",monospace`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(STATE.cursor.label, tx + tagW * 0.5, ty + 9 * dpr);
      }
      x.restore();
    }
  }

  /* ---------------- 13. Main 3D Viewport, Deterministic Step & Render Loop ---------------- */
  let simTime = 0;
  let lastWallTime = performance.now();
  let autoLoop = true;

  function initChamberViewport(canvas) {
    renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    scene = new T.Scene();
    scene.background = new T.Color(0x020304);
    scene.fog = new T.FogExp2(0x020304, STATE.optics.volumeDensity);

    camera = new T.PerspectiveCamera(34, 16 / 9, 0.1, 100);

    // Subtle dark chamber ambient + warm overhead tabletop spot + dynamic 3200K candle point light
    ambientLight = new T.AmbientLight(0x1b242c, 0.34);
    scene.add(ambientLight);

    tableSpotLight = new T.SpotLight(0xffe4b8, 1.35, 14, 0.52, 0.78, 1.2);
    tableSpotLight.position.set(0, 3.8, 0.6);
    tableSpotLight.target.position.set(0, -1.1, 0);
    tableSpotLight.castShadow = true;
    tableSpotLight.shadow.mapSize.set(1024, 1024);
    scene.add(tableSpotLight, tableSpotLight.target);

    rimSpotLight = new T.DirectionalLight(0x9cb8cc, 0.38);
    rimSpotLight.position.set(-2.5, 3.2, -3.5);
    scene.add(rimSpotLight);

    keyCandleLight = new T.PointLight(0xff9c3b, 2.8, 9.5, 1.45);
    keyCandleLight.position.set(0, -0.45, 0.08);
    scene.add(keyCandleLight);

    buildPhysicalLabCollection();
    buildHologramMemoryCollection();

    // Viewport Bimanual Orbit & Click-to-Select Seed
    let vpDrag = null;
    const raycaster = new T.Raycaster();
    const mouse = new T.Vector2();

    canvas.addEventListener('pointerdown', e => {
      STATE.reel.active = false;
      vpDrag = {
        x: e.clientX,
        y: e.clientY,
        moved: 0,
        o0: STATE.cameraOrbit.slice()
      };
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', e => {
      if (!vpDrag) return;
      const dx = e.clientX - vpDrag.x;
      const dy = e.clientY - vpDrag.y;
      vpDrag.moved = Math.max(vpDrag.moved, Math.hypot(dx, dy));
      STATE.cameraOrbit[0] = clamp(vpDrag.o0[0] - dx * 0.0045, -0.75, 0.75);
      STATE.cameraOrbit[1] = clamp(vpDrag.o0[1] + dy * 0.0038, -0.15, 0.52);
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
      turnBarrelRing(STATE.activeBarrelRing, e.deltaY < 0 ? 1 : -1);
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

  function stepSimulation(dt) {
    simTime += dt;

    // 1. Update Director Film Choreography if active or locked to a target timestamp
    if ((STATE.reel.active || STATE.reel.lockedT != null) && orbCanvas) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = (orbCanvas.clientWidth || 1280) * dpr;
      const h = (orbCanvas.clientHeight || 340) * dpr;
      if (orbCanvas.width !== w || orbCanvas.height !== h) {
        orbCanvas.width = w;
        orbCanvas.height = h;
      }
      const L = computeOrbLayout(w, h, dpr);
      if (STATE.reel.lockedT != null) {
        STATE.reel.t = STATE.reel.lockedT;
      } else {
        STATE.reel.t += dt;
        if (STATE.reel.t >= STATE.reel.dur) {
          STATE.reel.t = STATE.reel.dur;
          STATE.reel.active = false;
        }
      }
      updateDirectorReel(STATE.reel.t, L);
    }

    // 2. Smoothly decay button press & cursor ripple
    for (const k in STATE.btnDown) {
      STATE.btnDown[k] = Math.max(0, STATE.btnDown[k] - dt * 5.5);
    }
    STATE.cursor.ripple = Math.max(0, STATE.cursor.ripple - dt * 2.4);

    // 3. Smoothly ease the 5 physical barrel rings toward their target angles
    for (let i = 0; i < 5; i++) {
      STATE.barrelAngles[i] += (STATE.barrelTargets[i] - STATE.barrelAngles[i]) * Math.min(1, dt * 16);
    }

    // 4. Advance Multi-Pass Loop Playhead
    if (STATE.loop.playing && !STATE.weaver.timelineCollapsed) {
      STATE.loop.time = (STATE.loop.time + dt) % STATE.loop.duration;
    }

    // 5. Camera Framing (matching c0.jpg / c5.jpg cinema composition)
    const [yaw, pitch] = STATE.cameraOrbit;
    const dist = 4.25 / STATE.weaver.bimanualScale;
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      -0.42 + Math.sin(pitch) * dist,
      Math.cos(yaw) * Math.cos(pitch) * dist
    );
    camera.lookAt(0, -0.72, -0.25);

    // 6. Update Volumetric Dust Motes
    if (dustPoints) {
      const dp = dustPoints.geometry.attributes.position;
      for (let i = 0; i < dp.count; i++) {
        let y = dp.getY(i) + dt * (0.025 + (i % 5) * 0.006);
        if (y > 3.2) y = -1.5;
        dp.setY(i, y);
      }
      dp.needsUpdate = true;
    }

    // 7. Update 3200K Candlelight & Flame Sprites
    const flick = 0.86 + 0.10 * Math.sin(simTime * 13.5) + 0.06 * Math.sin(simTime * 23.1);
    const activeFlames = STATE.cake.projected && STATE.cake.candles > 0 ? STATE.cake.flames : 0;
    const candleLuma = activeFlames * flick * Math.min(1.35, Math.sqrt(STATE.cake.candles / 5));
    keyCandleLight.intensity = 2.6 * candleLuma;
    tableSpotLight.intensity = 0.85 + 0.55 * candleLuma;

    flameSprites.forEach((f, idx) => {
      const wf = 1.0 + 0.11 * Math.sin(simTime * 14 + idx * 1.9);
      f.fl.material.opacity = activeFlames;
      f.gl.material.opacity = activeFlames * 0.82 * flick;
      f.fl.scale.set(0.082 * wf, 0.175 * (2.0 - wf * 0.95), 1);
    });

    // 8. Update Hologram Shaders
    holoMaterials.forEach(m => {
      if (m.userData.uSqueeze) {
        m.userData.uSqueeze.value = STATE.weaver.squeeze;
        m.userData.uTime.value = simTime;
      }
    });

    // 9. Update Table, Cake, Feathered Kids, Ana & Forest/Beetle Visibility
    const isForest = STATE.sceneMode === 'forest';
    forestGroup.visible = isForest;
    tableGroup.visible = !isForest && STATE.table.exists;
    cakeGroup.visible = !isForest && STATE.cake.projected;

    if (cakeGroup.visible) {
      const g = clamp(STATE.cake.grow, 0.001, 1);
      cakeGroup.scale.setScalar(g * STATE.cake.scale);
      cakeGroup.rotation.y = (STATE.cake.turnDeg * Math.PI) / 180;
    }

    if (kidsMesh) {
      kidsMesh.visible = !isForest && STATE.kids.projected && STATE.kids.grow > 0.01;
      // When Children are Held (r=0 at t_H = 2.00s), they stay completely frozen while the cake turns!
      const kt = STATE.kids.held ? STATE.kids.clockT : simTime;
      kidsMesh.position.x = -0.08 + Math.sin(kt * 1.2) * (STATE.kids.held ? 0 : 0.025);
      kidsMesh.position.y = -0.32 + Math.cos(kt * 1.6) * (STATE.kids.held ? 0 : 0.015);
      const u = kidsMesh.material.uniforms;
      u.candleLuma.value = candleLuma;
      u.squeeze.value = STATE.weaver.squeeze;
      u.wavePhase.value = simTime;
      u.opacityK.value = STATE.kids.grow;
    }

    if (anaMesh) {
      anaMesh.visible = !isForest && STATE.kids.anaVisible;
      const u = anaMesh.material.uniforms;
      u.candleLuma.value = candleLuma;
      u.squeeze.value = STATE.weaver.squeeze;
      u.wavePhase.value = simTime;
      u.opacityK.value = STATE.kids.anaAlpha;
    }

    if (isForest && beetleGroup) {
      const bt = beetleGroup.children[1];
      if (bt && bt.userData.tick) bt.userData.tick(simTime * 1.5);
      beetleGroup.rotation.y = 0.42 + Math.sin(simTime * 0.6) * 0.25;
    }

    renderer.render(scene, camera);
    updateDiegeticReticles(simTime * 1000);
    drawOrbDeck(simTime * 1000);
  }

  function animate(now) {
    if (!autoLoop) return;
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, Math.max(0.001, (now - lastWallTime) / 1000));
    lastWallTime = now;
    stepSimulation(dt);
  }

  function init() {
    initChamberViewport(document.getElementById('chamberStageCanvas'));
    initOrbDeck(document.getElementById('orbProCanvas'));
    resizeViewport();
    window.addEventListener('resize', resizeViewport);

    window.addEventListener('keydown', e => {
      if (e.key >= '1' && e.key <= '7') {
        STATE.reel.active = false;
        runImplementationStep(Number(e.key));
      } else if (e.key === 'f' || e.key === 'F') {
        startDirectorReel();
      } else if (e.key === ' ') {
        e.preventDefault();
        toggleHoldChildren();
      } else if (e.key === 'b' || e.key === 'B') {
        optimizeAndBakeSequence();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        turnBarrelRing(STATE.activeBarrelRing, 1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        turnBarrelRing(STATE.activeBarrelRing, -1);
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.has('step')) runImplementationStep(Number(params.get('step')));
    if (params.has('seed')) selectSeed(Number(params.get('seed')));
    if (params.has('squeeze')) setSqueezePressure(Number(params.get('squeeze')));
    if (params.get('baked') === '1') optimizeAndBakeSequence();
    if (params.get('reel') === '1') startDirectorReel();
    if (params.has('t')) {
      startDirectorReel();
      const targetT = Number(params.get('t'));
      STATE.reel.lockedT = targetT;
      STATE.reel.t = targetT;
      stepSimulation(0.016);
    }

    lastWallTime = performance.now();
    requestAnimationFrame(animate);
  }

  window.FIELD_ORB_05 = {
    STATE,
    SEEDS,
    IMPL_STEPS,
    selectSeed,
    projectActiveSeedToRoom,
    turnBarrelRing,
    turnRing,
    setSqueezePressure,
    toggleHoldChildren,
    optimizeAndBakeSequence,
    runImplementationStep,
    exportProductionPackage,
    startDirectorReel,
    seekTo(t) {
      STATE.reel.lockedT = t;
      STATE.reel.t = t;
      stepSimulation(0.016);
    },
    manual() {
      autoLoop = false;
    },
    advance(dt) {
      stepSimulation(dt);
    },
    init
  };
})();
