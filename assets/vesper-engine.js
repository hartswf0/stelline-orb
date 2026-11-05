/* ============================================================================
   VESPER INSTRUMENTS · FIELD ORB 04
   Handheld Apparatus for Spatial Scene Authoring with Independent Layer Time Control
   ("The Birthday Cake = The Blender Donut of the Stelline Memory Orb")
   Implements Patent Specification [0001]-[0038], FIGS. 1-8, Claims 1-18
   ============================================================================ */
(function () {
  const T = THREE;

  /* ---------------- 1. Multi-Clock & Patent State (FIGS. 4-8) ---------------- */
  const wallNow = () => performance.now() / 1000;

  function makeClock(id, label, q0, r0, minQ, maxQ) {
    return {
      id,
      label,
      q: q0,
      e: wallNow(),
      r: r0, // 0 = HELD, 1 = LIVE
      minQ: minQ != null ? minQ : 0,
      maxQ: maxQ != null ? maxQ : 6.0,
      worldHold: false,
      frozenWorldPos: null,
      eval(tWall) {
        const raw = this.q + this.r * ((tWall != null ? tWall : wallNow()) - this.e);
        if (this.r === 0) return this.q;
        const span = this.maxQ - this.minQ;
        return this.minQ + ((((raw - this.minQ) % span) + span) % span);
      },
      setHold(hold, tWall) {
        const now = tWall != null ? tWall : wallNow();
        const cur = this.eval(now);
        this.q = cur;
        this.e = now;
        this.r = hold ? 0 : 1;
      },
      jog(dq, tWall) {
        const now = tWall != null ? tWall : wallNow();
        const cur = this.eval(now);
        const span = this.maxQ - this.minQ;
        let next = cur + dq;
        next = Math.max(this.minQ, Math.min(this.maxQ, next));
        this.q = next;
        this.e = now;
      }
    };
  }

  const STATE = {
    sceneMode: 'birthday', // 'birthday' | 'forest' | 'scan'
    donutStage: 4,         // 1..5 (Defaults to Stage 4: Held Children vs. Live Cake Hero Proof)
    activeRing: 'time',    // 'field' (110) | 'variant' (112) | 'time' (114)
    capturedRole: 'cake',  // 'cake' | 'icing' | 'candles' | 'children' | 'hand' | 'insect' | 'eyeR' | 'setae' | 'horse'
    shroudExtended: true,  // 140 Front Shroud: true = EXTENDED (Active), false = RETRACTED (Stowed)
    doorwayAlert: false,   // 234 Visitor Alert / Protected Doorway Volume (FIG. 4, Claim 7)
    cameraOrbit: [0, 0],   // [yaw, pitch]
    filmSkinBlend: 0.72,   // Hybrid film + 3D skin blend

    // Ring angular positions (for visual barrel feedback)
    ringAngles: { field: 0.18, variant: 0.45, time: 0.52 },

    // 110 FIELD parameters (Segmented Depth Reveal & 1st-Person Edge Softness)
    fieldReveal: 0.14,     // 0.0 = Full Projected Memory, 1.0 = Physical Glass Chamber (230)
    edgeSoftness: 0.22,    // Claim 14: 1st-person peripheral blur/vignette softness

    // Birthday Cake ("The Donut of the Orb") persistent parameters
    cake: {
      bundt: 0.0,          // 0.0 =Canon Flat/Cylinder Sponge, 1.0 = 12-Flute Scalloped Bundt Torus
      glazeIdx: 0,         // 0: Canon Crimson 生日快樂, 1: Vanilla Buttercream, 2: Dark Ganache, 3: Matcha Velvet, 4: Custom Name
      customText: '生日快樂',
      pipeProgress: 1.0,   // 0..1 stroke-by-stroke piping progress
      candles: 7,          // 1..12 striped wax candles
      dragees: 12,         // Smarties candy dragees count
      flames: 1.0,         // 1.0 = Full 3200K flames, 0.0 = Blown out with glowing wick embers & smoke
      turntableYaw: 0.0,   // Cake rotation driven by TIME ring
      exprWeight: 0.65,    // Children facial expression weight (0: Hesitation, 0.5: Subtle Smile, 1.0: Joy)
      conflictPolicy: 'follow', // 'follow' (Follow Contact) | 'suspend' (Suspend Constraint) | 'block' (Block Jog)
      conflictState: 'LIVE'     // 'LIVE' | 'HELD' | 'FOLLOWING' | 'SUSPENDED' | 'BLOCKED'
    },

    // Forest & Anchored Insect parameters (FIG. 4-5, [0022]-[0024], [0029])
    forest: {
      speciesIdx: 0,       // 0: Carabid Beetle (Carabus stellinae), 1: Emerald Scarab, 2: Praying Mantis, 3: Gold Scarab
      focusR: 0.92,        // Compound eye ommatidia focus
      focusL: 0.35,
      setae: 0.38,         // Sub-ocular sensory bristles
      gait: 0.45,
      leafCurl: 0.35,
      leafWet: 0.65
    },

    // Stelline Scan Review Console (FIG. 8, [0034]-[0035], Claim 9)
    scan: {
      scrub: 0.52,
      importedToEditStore: false,
      authenticityScore: 99.4,
      provenanceLog: [
        { ts: '00:00.0', action: 'INIT SLIT-LAMP RECOLLECTION TERMINAL (280) — READ-ONLY STORE (286)' }
      ]
    },

    // Per-Layer Clocks (FIG. 6, [0025]-[0027])
    clocks: {
      children: makeClock('children', '260 CHILDREN LAYER', 2.00, 0, 0, 5.0), // HELD at 2.00s by default!
      cake:     makeClock('cake',     '262 CAKE & CANDLES', 2.40, 0, 0, 6.0), // Ready to JOG with TIME ring!
      hand:     makeClock('hand',     '264 1ST-PERSON HAND', 1.85, 0, 0, 4.0),
      forest:   makeClock('forest',   '266 FOREST CANOPY',   1.50, 1, 0, 6.0),
      insect:   makeClock('insect',   '268 ANCHORED INSECT', 2.10, 1, 0, 6.0)
    },

    // Reversible Transaction Stack (FIG. 7, [0036], Claim 8)
    txStack: [],
    pendingTx: null
  };

  /* ---------------- 2. Surface Anchor Metadata (FIG. 5, [0022]-[0024]) ---------------- */
  const ROLE_INFO = {
    cake: {
      id: 'cake',
      title: '<cake-on-table>',
      clockKey: 'cake',
      anchor: { supportId: 'table_hex_01', tri: 18, uvw: [0.33, 0.34, 0.33], normal: [0, 1, 0] },
      variantLabel: () => {
        const b = STATE.cake.bundt;
        return b < 0.15 ? 'CYLINDER SPONGE (0% BUNDT)' : b < 0.65 ? `FLUTED CROWN (${Math.round(b * 100)}% BUNDT)` : `12-FLUTE BUNDT TORUS (${Math.round(b * 100)}%)`;
      },
      timeLabel: () => `CAKE TIME q=${STATE.clocks.cake.eval().toFixed(2)}s · TURN ${(STATE.cake.turntableYaw * 180 / Math.PI).toFixed(0)} deg`
    },
    icing: {
      id: 'icing',
      title: '<icing-crown>',
      clockKey: 'cake',
      anchor: { supportId: 'cake_top_01', tri: 64, uvw: [0.50, 0.25, 0.25], normal: [0, 1, 0] },
      variantLabel: () => ['CRIMSON 生日快樂 (CANON)', 'WHIPPED BUTTERCREAM', 'DARK GANACHE GLAZE', 'MATCHA VELVET GLAZE', `CUSTOM: "${STATE.cake.customText}"`][STATE.cake.glazeIdx],
      timeLabel: () => `PIPING PROGRESS ${Math.round(STATE.cake.pipeProgress * 100)}% · q=${STATE.clocks.cake.eval().toFixed(2)}s`
    },
    candles: {
      id: 'candles',
      title: '<candle-ring>',
      clockKey: 'cake',
      anchor: { supportId: 'cake_crown_01', tri: 92, uvw: [0.42, 0.38, 0.20], normal: [0, 1, 0] },
      variantLabel: () => `${STATE.cake.candles} STRIPED CANDLES + ${STATE.cake.dragees} DRAGEES`,
      timeLabel: () => STATE.cake.flames > 0.08 ? `3200K FLAMES ${Math.round(STATE.cake.flames * 100)}% (LIT)` : 'BLOWN OUT · WICK EMBERS & SMOKE'
    },
    children: {
      id: 'children',
      title: '<children-table>',
      clockKey: 'children',
      anchor: { supportId: 'bench_arc_01', tri: 8, uvw: [0.50, 0.30, 0.20], normal: [0, 0, 1] },
      variantLabel: () => {
        const w = STATE.cake.exprWeight;
        const tag = w < 0.3 ? 'HESITATION' : w < 0.7 ? 'SUBTLE SMILE' : 'WARM JOY';
        return `EXPRESSION: ${tag} (${Math.round(w * 100)}%)`;
      },
      timeLabel: () => `CHILD TIME q=${STATE.clocks.children.eval().toFixed(2)}s [${STATE.clocks.children.r === 0 ? 'HELD' : 'LIVE'}]`
    },
    hand: {
      id: 'hand',
      title: '<1st-person-hand>',
      clockKey: 'hand',
      anchor: { supportId: 'cake_rim_contact', tri: 108, uvw: [0.60, 0.20, 0.20], normal: [-0.4, 0.8, 0.4] },
      variantLabel: () => `CONFLICT POLICY: ${STATE.cake.conflictPolicy.toUpperCase()}`,
      timeLabel: () => `HAND TIME q=${STATE.clocks.hand.eval().toFixed(2)}s [${STATE.cake.conflictState}]`
    },
    insect: {
      id: 'insect',
      title: '<insect-on-this-leaf>',
      clockKey: 'insect',
      anchor: { supportId: 'elderberry_leaf_01', tri: 142, uvw: [0.34, 0.48, 0.18], normal: [0, 0.96, 0.28] },
      variantLabel: () => [
        'Carabus stellinae (CARABID BEETLE)',
        'Chrysina resplendens (EMERALD SCARAB)',
        'Mantis religiosa (PRAYING MANTIS)',
        'Chrysina aurigans (GOLD SCARAB)'
      ][STATE.forest.speciesIdx],
      timeLabel: () => `INSECT GAIT q=${STATE.clocks.insect.eval().toFixed(2)}s [${STATE.clocks.insect.worldHold ? 'WORLD-HELD' : STATE.clocks.insect.r === 0 ? 'POSE-HELD' : 'LIVE'}]`
    },
    eyeR: {
      id: 'eyeR',
      title: '<compound-eye-dx>',
      clockKey: 'insect',
      anchor: { supportId: 'head_socket_dx', tri: 31, uvw: [0.45, 0.35, 0.20], normal: [0.6, 0.4, 0.7] },
      variantLabel: () => `OMMATIDIA FOCUS: DX ${Math.round(STATE.forest.focusR * 100)}% / SN ${Math.round(STATE.forest.focusL * 100)}%`,
      timeLabel: () => `OPTIC RACK q=${STATE.clocks.insect.eval().toFixed(2)}s`
    },
    setae: {
      id: 'setae',
      title: '<sub-ocular-setae>',
      clockKey: 'insect',
      anchor: { supportId: 'genae_rim_01', tri: 48, uvw: [0.28, 0.52, 0.20], normal: [0.7, -0.2, 0.6] },
      variantLabel: () => `SENSORY SETAE: ${Math.round(STATE.forest.setae * 100)}% (${Math.round(28 * STATE.forest.setae)} BRISTLES)`,
      timeLabel: () => `MICROMOTION q=${STATE.clocks.insect.eval().toFixed(2)}s`
    },
    horse: {
      id: 'horse',
      title: '<carved-wooden-horse>',
      clockKey: 'cake',
      anchor: { supportId: 'furnace_ash_01', tri: 12, uvw: [0.50, 0.50, 0.0], normal: [0, 1, 0] },
      variantLabel: () => STATE.scan.importedToEditStore ? 'IMPORTED TO EDIT STORE (220)' : 'READ-ONLY REVIEW STORE (286)',
      timeLabel: () => `SCAN RECOLLECTION ${(STATE.scan.scrub * 100).toFixed(0)}% · 6.10.21`
    }
  };

  /* ---------------- 3. Extracted Film Glyphs (Beat 27 生日快樂) ---------------- */
  const GLYPHS = { img: null, meta: null, ready: false };
  function loadFilmGlyphs() {
    const im = new Image();
    im.onload = () => { GLYPHS.img = im; if (GLYPHS.meta) GLYPHS.ready = true; };
    im.src = 'assets/v6/design/glyphs27.png';
    fetch('assets/v6/design/glyphs27.json')
      .then(r => r.json())
      .then(m => { GLYPHS.meta = m; if (GLYPHS.img) GLYPHS.ready = true; })
      .catch(() => {});
  }
  loadFilmGlyphs();

  /* ---------------- 4. Three.js Chamber Viewport Engine ---------------- */
  let renderer, scene, camera, clock;
  let birthdayGroup, forestGroup, scanGroup, chamberShellGroup, doorwayGroup;
  let cakeMeshGroup, tableGroup, childrenGroup, handGroup, candlePointLight, ambientLight, tablePointLight;
  let insectMeshGroup, leafMeshGroup, forestBands = [];
  let reticleCanvas, reticleTex, reticleSprite;
  const texLoader = new T.TextureLoader();
  const texMap = new Map();

  function getTex(url) {
    if (texMap.has(url)) return texMap.get(url);
    const t = texLoader.load(url);
    t.encoding = T.sRGBEncoding;
    texMap.set(url, t);
    return t;
  }

  // Dynamic canvas texture for the cake crown (glaze + progressive stroke-by-stroke piping + dragees)
  let crownCanvas, crownCtx, crownTex;
  function initCrownTexture() {
    crownCanvas = document.createElement('canvas');
    crownCanvas.width = 512;
    crownCanvas.height = 512;
    crownCtx = crownCanvas.getContext('2d');
    crownTex = new T.CanvasTexture(crownCanvas);
    crownTex.encoding = T.sRGBEncoding;
    updateCrownTexture();
  }

  function updateCrownTexture() {
    if (!crownCtx) return;
    const x = crownCtx, w = 512, h = 512;
    const palettes = [
      { bg0: '#f5e4be', bg1: '#dec28d', swirl: 'rgba(215,182,125,0.45)', stroke: '#b81614' }, // 0: Canon Buttercream + Crimson 生日快樂
      { bg0: '#fff6df', bg1: '#ebd5a7', swirl: 'rgba(235,205,150,0.45)', stroke: '#c4201c' }, // 1: Whipped Vanilla
      { bg0: '#2d1810', bg1: '#1c0e08', swirl: 'rgba(65,36,22,0.55)',   stroke: '#e8b960' }, // 2: Dark Chocolate Ganache
      { bg0: '#6e8c48', bg1: '#4d692e', swirl: 'rgba(135,168,90,0.45)', stroke: '#fff3d6' }, // 3: Matcha Velvet
      { bg0: '#f4e0b6', bg1: '#d8b87c', swirl: 'rgba(210,175,115,0.45)', stroke: '#b81614' }  // 4: Custom Recipient Name
    ];
    const pal = palettes[STATE.cake.glazeIdx % palettes.length];
    const grd = x.createRadialGradient(w * 0.5, h * 0.5, 20, w * 0.5, h * 0.5, w * 0.52);
    grd.addColorStop(0, pal.bg0);
    grd.addColorStop(1, pal.bg1);
    x.fillStyle = grd;
    x.fillRect(0, 0, w, h);

    // Buttercream spatula swirls
    x.strokeStyle = pal.swirl;
    x.lineWidth = 4;
    for (let i = 0; i < 42; i++) {
      const r = 30 + (i * 5.2);
      x.beginPath();
      x.arc(w / 2, h / 2, r, (i * 0.7) % 6.28, ((i * 0.7) % 6.28) + 1.8);
      x.stroke();
    }

    // Smarties / Candy Dragees scattered around perimeter
    const drageeCols = ['#d1342b', '#3b8f3a', '#e7c22e', '#2b62c4', '#e87a24', '#8e44ad'];
    const nDrag = STATE.cake.dragees;
    for (let i = 0; i < nDrag; i++) {
      const ang = (i / Math.max(1, nDrag)) * Math.PI * 2 + 0.4;
      const rad = 185 + (i % 3) * 16;
      const dx = w / 2 + Math.cos(ang) * rad;
      const dy = h / 2 + Math.sin(ang) * rad;
      x.save();
      x.translate(dx, dy);
      x.rotate(ang);
      x.fillStyle = 'rgba(0,0,0,0.28)';
      x.beginPath();
      x.ellipse(2, 3, 9, 6.5, 0, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = drageeCols[i % drageeCols.length];
      x.beginPath();
      x.ellipse(0, 0, 8.5, 6, 0, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.45)';
      x.beginPath();
      x.ellipse(-2.5, -2, 3.2, 1.8, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }

    // Piped Calligraphy (生日快樂 + Z underline) using real film glyphs27.png when glazeIdx === 0 and customText === '生日快樂'
    const p = Math.max(0, Math.min(1, STATE.cake.pipeProgress));
    if (p > 0.01) {
      const useFilmGlyphs = GLYPHS.ready && STATE.cake.glazeIdx === 0 && STATE.cake.customText === '生日快樂';
      if (useFilmGlyphs) {
        const M = GLYPHS.meta;
        const dstX = 96, dstY = 235, dstW = 320, dstH = 78;
        const cP = Math.min(1, p / 0.85);
        for (let c = 0; c < 4; c++) {
          const u = Math.max(0, Math.min(1, cP * 4 - c));
          if (u <= 0) continue;
          const x0 = M.cuts[c], cw = M.cuts[c + 1] - x0;
          const sy = Math.min(M.S - 1, Math.floor(u * M.S)) * M.HH;
          x.save();
          x.globalAlpha = 0.94;
          x.drawImage(GLYPHS.img, x0, sy, cw, M.H, dstX + (x0 / M.W) * dstW, dstY, (cw / M.W) * dstW, dstH);
          x.restore();
        }
        if (p > 0.85) {
          const u = Math.min(1, (p - 0.85) / 0.15);
          const wPx = Math.max(1, Math.round(M.W * u));
          x.save();
          x.globalAlpha = 0.92;
          x.drawImage(GLYPHS.img, 0, M.S * M.HH + M.H, wPx, M.HH - M.H, dstX, dstY + dstH - 6, (wPx / M.W) * dstW, 56);
          x.restore();
        }
      } else {
        x.save();
        x.translate(w / 2, h * 0.58);
        const txt = STATE.cake.customText || '生日快樂';
        x.font = 'bold 52px "Songti SC","Kaiti SC","Noto Serif CJK SC",Georgia,serif';
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        const cP = Math.min(1, p / 0.82);
        x.save();
        x.beginPath();
        x.rect(-190, -50, 380 * cP, 100);
        x.clip();
        x.fillStyle = 'rgba(30,5,2,0.55)';
        x.fillText(txt, 2, 4);
        x.fillStyle = pal.stroke;
        x.fillText(txt, 0, 0);
        x.restore();
        if (p > 0.82) {
          const u = Math.min(1, (p - 0.82) / 0.18);
          x.strokeStyle = pal.stroke;
          x.lineWidth = 6.5;
          x.lineCap = 'round';
          x.lineJoin = 'round';
          x.beginPath();
          x.moveTo(-110, 36);
          x.lineTo(-110 + 210 * Math.min(1, u * 2), 36 - 10 * Math.min(1, u * 2));
          if (u > 0.5) {
            x.lineTo(-55, 52);
            x.lineTo(-55 + 165 * ((u - 0.5) * 2), 52 - 8 * ((u - 0.5) * 2));
          }
          x.stroke();
        }
        x.restore();
      }
    }
    crownTex.needsUpdate = true;
  }

  /* ---------------- 5. Build the Sterile Chamber Shell & Doorway (FIG. 4) ---------------- */
  function buildChamberShell() {
    chamberShellGroup = new T.Group();
    // Dome floor with concentric architectural rings (230 in FIG. 4)
    const floorGeo = new T.CircleGeometry(24, 96);
    const floorMat = new T.MeshStandardMaterial({ color: 0x0b0d0e, roughness: 0.28, metalness: 0.25 });
    const floor = new T.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;
    chamberShellGroup.add(floor);

    for (let k = 0; k < 5; k++) {
      const ring = new T.Mesh(
        new T.TorusGeometry(2.6 + k * 1.9, 0.012, 6, 128),
        new T.MeshBasicMaterial({ color: 0x3b4446, transparent: true, opacity: 0.45 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -2.19;
      chamberShellGroup.add(ring);
    }

    // Chamber horizon light band (seen when FIELD sweeps away the projected memory)
    const horizonRing = new T.Mesh(
      new T.TorusGeometry(11.5, 0.045, 8, 160),
      new T.MeshBasicMaterial({ color: 0xd8e2dc, transparent: true, opacity: 0.65 })
    );
    horizonRing.rotation.x = Math.PI / 2;
    horizonRing.position.y = 1.15;
    chamberShellGroup.add(horizonRing);

    // Protected Doorway Sightline Volume (234 in FIG. 4, Claim 7)
    doorwayGroup = new T.Group();
    doorwayGroup.position.set(2.35, 0.32, -2.55);
    doorwayGroup.rotation.y = -0.32;
    const frameGeo = new T.BoxGeometry(1.75, 2.35, 0.08);
    const frameMat = new T.MeshBasicMaterial({ color: 0x70d6ff, wireframe: true, transparent: true, opacity: 0.9 });
    const doorFrame = new T.Mesh(frameGeo, frameMat);
    doorwayGroup.add(doorFrame);

    const glassGeo = new T.PlaneGeometry(1.66, 2.25);
    const glassMat = new T.MeshBasicMaterial({ map: getTex('assets/v6/atlas/f40_00.jpg'), transparent: true, opacity: 0.95 });
    const doorGlass = new T.Mesh(glassGeo, glassMat);
    doorGlass.position.z = 0.05;
    doorwayGroup.add(doorGlass);
    doorwayGroup.visible = false;
    chamberShellGroup.add(doorwayGroup);

    scene.add(chamberShellGroup);
  }

  /* ---------------- 6. Build Scene A: Birthday Chamber ("The Donut of the Orb") ---------------- */
  let filmBackPlane, childCards = [], handMeshGroup;
  function buildBirthdayScene() {
    birthdayGroup = new T.Group();

    // 1. Film reference backdrop (Open Matte Birthday Chamber clean plate b24.jpg)
    const backGeo = new T.PlaneGeometry(16.5, 9.28);
    const backMat = new T.MeshBasicMaterial({
      map: getTex('assets/v5/atlas/b24.jpg'),
      transparent: true,
      opacity: 0.92
    });
    filmBackPlane = new T.Mesh(backGeo, backMat);
    filmBackPlane.position.set(0, 0.35, -4.6);
    birthdayGroup.add(filmBackPlane);

    // 2. Hexagonal Amber Illuminated Table (table_hex_01)
    tableGroup = new T.Group();
    tableGroup.position.set(0, -1.58, -0.35);
    const hexTop = new T.Mesh(
      new T.CylinderGeometry(2.35, 2.35, 0.12, 6),
      new T.MeshStandardMaterial({
        color: 0xd49b35,
        emissive: new T.Color(0x9e5c14),
        emissiveIntensity: 0.38,
        roughness: 0.52,
        metalness: 0.15
      })
    );
    hexTop.rotation.y = Math.PI / 6;
    hexTop.userData.role = 'cake';
    tableGroup.add(hexTop);

    const pedestal = new T.Mesh(
      new T.CylinderGeometry(0.65, 0.95, 1.4, 6),
      new T.MeshStandardMaterial({ color: 0x16120d, roughness: 0.7, metalness: 0.3 })
    );
    pedestal.position.y = -0.76;
    tableGroup.add(pedestal);
    birthdayGroup.add(tableGroup);

    // 3. The 4 SAM-Segmented + Depth-Displaced Birthday Children around the table (260 CHILDREN LAYER, k = 2, 3, 4, 5)
    childrenGroup = new T.Group();
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
      uniform float kId, lightK, exprK, selK;
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
        col *= mix(vec3(0.12, 0.15, 0.22), vec3(1.22, 1.06 + exprK * 0.12, 0.88), clamp(warmBounce, 0.0, 1.35));
        float rim = a * (1.0 - step(8.5, sum));
        col += selK * rim * vec3(1.0, 0.85, 0.55) * 0.45;
        gl_FragColor = vec4(col, alpha);
      }
    `;

    const childKs = [
      { k: 2, z: -1.45, thresh: 0.78 },
      { k: 3, z: -1.85, thresh: 0.58 },
      { k: 4, z: -1.78, thresh: 0.52 },
      { k: 5, z: -1.35, thresh: 0.74 }
    ];
    childCards = childKs.map((ck, idx) => {
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
          kId: { value: ck.k },
          relief: { value: 0.55 },
          lightK: { value: 1.0 },
          exprK: { value: 0.65 },
          selK: { value: 0.0 },
          candlePos: { value: new T.Vector3(0, -0.35, -0.2) }
        }
      });
      const m = new T.Mesh(geo, mat);
      m.position.set(0, 0.05, ck.z);
      m.userData.role = 'children';
      m.userData.basePos = m.position.clone();
      m.userData.idx = idx;
      m.userData.thresh = ck.thresh;
      childrenGroup.add(m);
      return m;
    });
    birthdayGroup.add(childrenGroup);

    // 4. First-Person Child's Hand Reaching for Frosting ([0033], Section 4-5 Cross-Time Conflict Demo)
    handGroup = new T.Group();
    const skinMat = new T.MeshPhysicalMaterial({
      color: 0xdba584,
      roughness: 0.56,
      clearcoat: 0.14,
      clearcoatRoughness: 0.48
    });
    const sleeveMat = new T.MeshStandardMaterial({
      color: 0x232b36,
      roughness: 0.78
    });

    // Articulated arm & hand built in local handGroup space pointing along -X/-Z toward the cake rim
    const armPivot = new T.Group();
    armPivot.rotation.set(0.18, 0.52, 0.15);

    const sleeve = new T.Mesh(new T.CylinderGeometry(0.115, 0.135, 0.52, 20), sleeveMat);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.set(0.56, -0.06, 0.0);
    sleeve.userData.role = 'hand';
    armPivot.add(sleeve);

    const wrist = new T.Mesh(new T.CylinderGeometry(0.082, 0.098, 0.34, 20), skinMat);
    wrist.rotation.z = Math.PI / 2;
    wrist.position.set(0.24, -0.03, 0.0);
    wrist.userData.role = 'hand';
    armPivot.add(wrist);

    const palm = new T.Mesh(new T.SphereGeometry(0.105, 24, 18), skinMat);
    palm.scale.set(1.25, 0.58, 1.05);
    palm.position.set(0.06, -0.01, 0.0);
    palm.userData.role = 'hand';
    armPivot.add(palm);

    // 4 fingers + thumb connected to the palm
    const fingerSpecs = [
      { z: -0.065, len: 0.22, r: 0.022, pitch:  0.04 }, // Index finger reaching frosting
      { z: -0.020, len: 0.20, r: 0.022, pitch: -0.18 }, // Middle finger slightly curled
      { z:  0.025, len: 0.18, r: 0.020, pitch: -0.28 }, // Ring finger curled
      { z:  0.065, len: 0.15, r: 0.018, pitch: -0.35 }  // Pinky curled
    ];
    fingerSpecs.forEach(fs => {
      const f = new T.Mesh(new T.CylinderGeometry(fs.r * 0.82, fs.r, fs.len, 14), skinMat);
      f.rotation.z = Math.PI / 2 + fs.pitch;
      f.position.set(-0.08, fs.pitch * 0.08, fs.z);
      f.userData.role = 'hand';
      armPivot.add(f);
      const tip = new T.Mesh(new T.SphereGeometry(fs.r * 0.85, 12, 10), skinMat);
      tip.position.set(-0.08 - Math.cos(fs.pitch) * (fs.len * 0.5), fs.pitch * 0.08 - Math.sin(fs.pitch) * (fs.len * 0.5), fs.z);
      tip.userData.role = 'hand';
      armPivot.add(tip);
    });

    const thumb = new T.Mesh(new T.CylinderGeometry(0.020, 0.026, 0.15, 14), skinMat);
    thumb.rotation.z = Math.PI / 2 - 0.35;
    thumb.rotation.y = 0.48;
    thumb.position.set(-0.01, -0.04, -0.095);
    thumb.userData.role = 'hand';
    armPivot.add(thumb);

    // Dab of buttercream frosting at the index fingertip contact point
    const dab = new T.Mesh(
      new T.SphereGeometry(0.032, 16, 12),
      new T.MeshStandardMaterial({ color: 0xf7e8c6, roughness: 0.32 })
    );
    dab.scale.set(1.2, 0.85, 1.1);
    dab.position.set(-0.20, 0.01, -0.065);
    dab.userData.role = 'hand';
    armPivot.add(dab);

    handGroup.add(armPivot);
    handGroup.position.set(0.88, -0.70, 0.32);
    birthdayGroup.add(handGroup);

    // 5. Persistent Birthday Cake ("The Donut of the Orb")
    cakeMeshGroup = new T.Group();
    cakeMeshGroup.position.set(0, -1.51, -0.35);
    birthdayGroup.add(cakeMeshGroup);
    rebuildCakeGeometry();

    scene.add(birthdayGroup);
  }

  let lastCakeSig = '';
  function rebuildCakeGeometry() {
    if (!cakeMeshGroup || !window.ANATOMY) return;
    const sig = [
      STATE.cake.bundt.toFixed(2),
      STATE.cake.candles,
      STATE.cake.flames.toFixed(2),
      STATE.cake.glazeIdx,
      STATE.cake.dragees
    ].join('|');
    if (sig === lastCakeSig && cakeMeshGroup.children.length > 0) return;
    lastCakeSig = sig;

    while (cakeMeshGroup.children.length) {
      const ch = cakeMeshGroup.children.pop();
      ch.traverse(o => o.geometry && o.geometry.dispose());
    }

    const cakeObj = window.ANATOMY.cake({
      bundt: STATE.cake.bundt,
      candles: STATE.cake.candles,
      flames: STATE.cake.flames,
      icing: 0, // We apply our high-res interactive crownTex directly to 'top'
      skin: 0
    }, performance.now());

    cakeObj.scale.setScalar(1.38);
    cakeObj.traverse(o => {
      if (o.isMesh) {
        if (o.userData.sk === 'top' && crownTex) {
          o.material = new T.MeshPhysicalMaterial({
            map: crownTex,
            roughness: 0.42,
            clearcoat: 0.35,
            clearcoatRoughness: 0.45
          });
          o.userData.role = 'icing';
        } else if (o.userData.sk === 'body') {
          o.userData.role = 'cake';
        } else {
          o.userData.role = 'candles';
        }
      }
    });
    cakeMeshGroup.add(cakeObj);
  }

  /* ---------------- 7. Build Scene B: Forest Leaf & Insect Anchor (FIGS. 4-5) ---------------- */
  let anchorPinMesh;
  function buildForestScene() {
    forestGroup = new T.Group();
    forestGroup.visible = false;

    // 4 Segmented Depth-Band Forest Layers (FIG. 4: d1 Foreground, d2 Mid-Canopy, d3 Deep Trees, d4 Mist Backplate)
    const bandConfigs = [
      { z: -6.8, w: 19, h: 10.7, tex: 'assets/v6/atlas/f01_04.jpg', threshold: 0.82, label: 'BAND 4 · DEEP FOREST CANOPY' },
      { z: -4.8, w: 16, h: 9.0,  tex: 'assets/v6/atlas/f04_05.jpg', threshold: 0.58, label: 'BAND 3 · SUNLIT SHAFTS' },
      { z: -3.1, w: 13.5, h: 7.6, tex: 'assets/v6/atlas/f05_03.jpg', threshold: 0.34, label: 'BAND 2 · ELDERBERRY FOLIAGE' }
    ];
    forestBands = bandConfigs.map(cfg => {
      const m = new T.Mesh(
        new T.PlaneGeometry(cfg.w, cfg.h),
        new T.MeshBasicMaterial({ map: getTex(cfg.tex), transparent: true, opacity: 0.92 })
      );
      m.position.set(0, 0.3, cfg.z);
      m.userData.threshold = cfg.threshold;
      forestGroup.add(m);
      return m;
    });

    // Moving Wet Elderberry Leaf Support Surface (elderberry_leaf_01)
    leafMeshGroup = new T.Group();
    const leafGeo = new T.PlaneGeometry(5.5, 4.2, 48, 48);
    const lp = leafGeo.attributes.position;
    for (let i = 0; i < lp.count; i++) {
      const lx = lp.getX(i), ly = lp.getY(i);
      lp.setZ(i, -Math.pow(Math.abs(lx) / 2.8, 2) * 0.55 - Math.pow((ly + 2.1) / 4.2, 2) * 0.25);
    }
    leafGeo.computeVertexNormals();
    const leafMat = new T.MeshStandardMaterial({
      map: getTex('assets/v6/atlas/f05_03.jpg'),
      color: 0x5c8a46,
      roughness: 0.72,
      metalness: 0.04,
      side: T.DoubleSide
    });
    const leafMesh = new T.Mesh(leafGeo, leafMat);
    leafMesh.rotation.x = -Math.PI / 2 + 0.18;
    leafMesh.position.set(0, -0.78, 0.2);
    leafMesh.userData.role = 'insect';
    leafMeshGroup.add(leafMesh);

    // Visual Surface Socket Pin (244 in FIG. 5: supportId + triangleIdx + barycentricUVW + tangentFrame)
    const pinRing = new T.Mesh(
      new T.RingGeometry(0.18, 0.23, 32),
      new T.MeshBasicMaterial({ color: 0x70d6ff, side: T.DoubleSide, transparent: true, opacity: 0.85 })
    );
    pinRing.rotation.x = -Math.PI / 2 + 0.18;
    pinRing.position.set(0, -0.68, 0.35);
    anchorPinMesh = pinRing;
    leafMeshGroup.add(pinRing);

    forestGroup.add(leafMeshGroup);

    // Anchored Insect Group (242 in FIG. 5)
    insectMeshGroup = new T.Group();
    forestGroup.add(insectMeshGroup);
    rebuildInsectGeometry();

    scene.add(forestGroup);
  }

  let lastInsectSig = '';
  function rebuildInsectGeometry() {
    if (!insectMeshGroup || !window.ANATOMY) return;
    const sig = [
      STATE.forest.speciesIdx,
      STATE.forest.focusR.toFixed(2),
      STATE.forest.focusL.toFixed(2),
      STATE.forest.setae.toFixed(2)
    ].join('|');
    if (sig === lastInsectSig && insectMeshGroup.children.length > 0) return;
    lastInsectSig = sig;

    while (insectMeshGroup.children.length) {
      const ch = insectMeshGroup.children.pop();
      ch.traverse(o => o.geometry && o.geometry.dispose());
    }

    const sp = STATE.forest.speciesIdx;
    const sheenVals = [0.48, 0.72, 0.58, 0.15];
    const bt = window.ANATOMY.beetle({
      sheen: sheenVals[sp] || 0.5,
      focusR: STATE.forest.focusR,
      focusL: STATE.forest.focusL,
      setae: STATE.forest.setae,
      gait: STATE.forest.gait,
      skin: 0
    }, performance.now());

    // Customize material/proportions for the 4 anchored insect variants on the exact same leaf socket!
    const variantColors = [
      { h: 0.27, s: 0.28, l: 0.04, metal: 0.25, scale: [1.45, 1.45, 1.45] }, // 0: Carabid Beetle (Carabus stellinae)
      { h: 0.38, s: 0.82, l: 0.18, metal: 0.82, scale: [1.55, 1.38, 1.35] }, // 1: Emerald Scarab (Chrysina resplendens)
      { h: 0.29, s: 0.65, l: 0.16, metal: 0.15, scale: [1.12, 1.75, 1.65] }, // 2: Praying Mantis / Lacewing Morph
      { h: 0.12, s: 0.88, l: 0.28, metal: 0.92, scale: [1.52, 1.42, 1.40] }  // 3: Gold Scarab (Chrysina aurigans)
    ][sp];

    bt.scale.set(...variantColors.scale);
    bt.traverse(o => {
      if (o.isMesh) {
        if (o.userData.sk === 'eyeR' || o.userData.sk === 'eyeL') {
          o.userData.role = 'eyeR';
        } else if (o.material && o.material.color && o.userData.sk !== 'eyeR' && o.userData.sk !== 'eyeL') {
          o.material.color.setHSL(variantColors.h, variantColors.s, variantColors.l);
          o.material.metalness = variantColors.metal;
          o.userData.role = 'insect';
        }
      }
    });
    insectMeshGroup.add(bt);
  }

  /* ---------------- 8. Build Scene C: Stelline Scan Read-Only Review Console (FIG. 8) ---------------- */
  let horseMeshGroup, scanPlaneMesh;
  function buildScanScene() {
    scanGroup = new T.Group();
    scanGroup.visible = false;

    const scanBack = new T.Mesh(
      new T.PlaneGeometry(15.2, 8.55),
      new T.MeshBasicMaterial({ map: getTex('assets/v6/atlas/f49_03.jpg'), transparent: true, opacity: 0.9 })
    );
    scanBack.position.set(0, 0.2, -3.8);
    scanPlaneMesh = scanBack;
    scanGroup.add(scanBack);

    // 3D Carved Wooden Horse ("6 · 10 · 21") on the Review Pedestal
    horseMeshGroup = new T.Group();
    const woodMat = new T.MeshStandardMaterial({
      color: 0x4a2f1b,
      roughness: 0.78,
      metalness: 0.08
    });
    const torso = new T.Mesh(new T.CylinderGeometry(0.22, 0.25, 0.85, 20), woodMat);
    torso.rotation.z = Math.PI / 2;
    torso.position.set(0, 0.1, 0);
    torso.userData.role = 'horse';
    horseMeshGroup.add(torso);

    const neck = new T.Mesh(new T.CylinderGeometry(0.12, 0.18, 0.52, 16), woodMat);
    neck.rotation.z = -0.55;
    neck.position.set(0.36, 0.38, 0);
    neck.userData.role = 'horse';
    horseMeshGroup.add(neck);

    const head = new T.Mesh(new T.BoxGeometry(0.34, 0.18, 0.18), woodMat);
    head.rotation.z = -0.25;
    head.position.set(0.52, 0.56, 0);
    head.userData.role = 'horse';
    horseMeshGroup.add(head);

    for (const [lx, lz] of [[-0.28, 0.11], [-0.28, -0.11], [0.28, 0.11], [0.28, -0.11]]) {
      const leg = new T.Mesh(new T.CylinderGeometry(0.055, 0.042, 0.58, 12), woodMat);
      leg.position.set(lx, -0.26, lz);
      leg.userData.role = 'horse';
      horseMeshGroup.add(leg);
    }
    horseMeshGroup.position.set(0, -0.55, 0.65);
    scanGroup.add(horseMeshGroup);

    scene.add(scanGroup);
  }

  /* ---------------- 9. Diegetic White C-Arc Optical Reticle (02:23 / 02:26) ---------------- */
  function initReticle() {
    reticleCanvas = document.createElement('canvas');
    reticleCanvas.width = 512;
    reticleCanvas.height = 256;
    reticleTex = new T.CanvasTexture(reticleCanvas);
    const mat = new T.SpriteMaterial({
      map: reticleTex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    reticleSprite = new T.Sprite(mat);
    reticleSprite.scale.set(2.9, 1.45, 1);
    reticleSprite.renderOrder = 999;
    scene.add(reticleSprite);
  }

  function updateReticleCanvas() {
    if (!reticleCanvas) return;
    const x = reticleCanvas.getContext('2d'), W = 512, H = 256;
    x.clearRect(0, 0, W, H);
    const cx = 128, cy = 128, r = 68;

    // 3 Segmented C-Arc bands corresponding to 110 FIELD, 112 VARIANT, 114 TIME
    const rings = ['field', 'variant', 'time'];
    const a0 = -Math.PI * 0.72, a1 = Math.PI * 0.72;
    for (let i = 0; i < 3; i++) {
      const s0 = a0 + (a1 - a0) * (i / 3) + 0.06;
      const s1 = a0 + (a1 - a0) * ((i + 1) / 3) - 0.06;
      const isAct = STATE.activeRing === rings[i];
      x.strokeStyle = isAct ? 'rgba(255,255,255,0.98)' : 'rgba(215,228,220,0.48)';
      x.lineWidth = isAct ? 10 : 6;
      x.lineCap = 'round';
      x.beginPath();
      x.arc(cx, cy, r, Math.PI + s0, Math.PI + s1);
      x.stroke();
    }

    // Top bright registration cap
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(cx + Math.cos(Math.PI + a1) * r, cy + Math.sin(Math.PI + a1) * r, 6.5, 0, Math.PI * 2);
    x.fill();

    // Inner optical tick marks
    const val = STATE.ringAngles[STATE.activeRing] || 0.5;
    const am = Math.PI + a0 + (a1 - a0) * (val % 1);
    x.strokeStyle = '#ffffff';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(cx + Math.cos(am) * (r - 13), cy + Math.sin(am) * (r - 13));
    x.lineTo(cx + Math.cos(am) * (r + 13), cy + Math.sin(am) * (r + 13));
    x.stroke();

    // Dashed leader line to captured object
    x.strokeStyle = 'rgba(235,245,240,0.65)';
    x.lineWidth = 1.8;
    x.setLineDash([6, 5]);
    x.beginPath();
    x.moveTo(cx - r - 6, cy);
    x.lineTo(8, cy + 28);
    x.stroke();
    x.setLineDash([]);

    // Diegetic readout beside the C-arc
    const info = ROLE_INFO[STATE.capturedRole] || ROLE_INFO.cake;
    const clk = STATE.clocks[info.clockKey];
    const isHeld = clk && clk.r === 0;

    x.font = '600 13px "JetBrains Mono","SF Mono",monospace';
    x.fillStyle = 'rgba(255,255,255,0.95)';
    x.fillText(`CAPTURE // ${info.title}`, cx + r + 18, cy - 28);

    x.font = '500 11px "JetBrains Mono","SF Mono",monospace';
    x.fillStyle = '#8ce8ff';
    x.fillText(info.variantLabel().slice(0, 38), cx + r + 18, cy - 8);

    x.fillStyle = isHeld ? '#ffcc66' : '#98f5b0';
    x.fillText(info.timeLabel().slice(0, 38), cx + r + 18, cy + 12);

    x.fillStyle = 'rgba(200,215,210,0.68)';
    x.font = '500 10px "JetBrains Mono","SF Mono",monospace';
    x.fillText(`ANCHOR: ${info.anchor.supportId}#T${info.anchor.tri}`, cx + r + 18, cy + 30);

    reticleTex.needsUpdate = true;
  }

  /* ---------------- 10. Cross-Time Dependency Resolver ([0028], [0033]) ---------------- */
  function evaluateCrossTimeDependencies(tWall) {
    const qCake = STATE.clocks.cake.eval(tWall);
    const qHand = STATE.clocks.hand.eval(tWall);
    const handReaching = STATE.donutStage === 5 || STATE.capturedRole === 'hand';
    handGroup.visible = handReaching;

    if (!handReaching) {
      STATE.cake.conflictState = STATE.clocks.children.r === 0 ? 'HELD-REF' : 'LIVE';
      return;
    }

    // Contact epoch is around qCake = 2.40s, qHand = 1.85s
    const deltaCake = qCake - 2.40;
    const pol = STATE.cake.conflictPolicy;
    const isConflict = Math.abs(deltaCake) > 0.12 && STATE.clocks.hand.r === 0;

    if (!isConflict) {
      STATE.cake.conflictState = STATE.clocks.hand.r === 0 ? 'HELD-CONTACT' : 'LIVE';
      handGroup.position.set(0.88, -0.70 + Math.sin(qHand * 2.2) * 0.04, 0.32 - (qHand - 1.5) * 0.12);
      handGroup.rotation.y = 0;
    } else if (pol === 'follow') {
      // Policy 1: Child hand follows the displaced cake rim contact frame!
      STATE.cake.conflictState = 'FOLLOW CONTACT';
      const ang = STATE.cake.turntableYaw;
      handGroup.position.set(0.88 + Math.sin(ang) * 0.28, -0.70, 0.32 + (Math.cos(ang) - 1) * 0.22);
      handGroup.rotation.y = ang * 0.65;
    } else if (pol === 'suspend') {
      // Policy 2: Suspend contact constraint; hand stays frozen in room while cake turns underneath
      STATE.cake.conflictState = 'CONSTRAINT SUSPENDED';
      handGroup.position.set(0.88, -0.70, 0.32);
      handGroup.rotation.y = 0;
    } else if (pol === 'block') {
      // Policy 3: Clamp cake jog to contact window
      STATE.cake.conflictState = 'JOG CLAMPED AT CONTACT';
      STATE.clocks.cake.q = 2.40 + Math.sign(deltaCake) * 0.12;
      STATE.cake.turntableYaw = Math.sign(deltaCake) * 0.15;
    }
  }

  /* ---------------- 11. Ring Turn & Control Dispatch (FIGS. 1-2, Claims 1-18) ---------------- */
  function beginPreviewTransaction(ringName) {
    if (!STATE.pendingTx) {
      STATE.pendingTx = {
        ring: ringName,
        role: STATE.capturedRole,
        at: new Date().toLocaleTimeString(),
        snapshot: JSON.stringify({
          cake: STATE.cake,
          forest: STATE.forest,
          fieldReveal: STATE.fieldReveal,
          edgeSoftness: STATE.edgeSoftness,
          qCake: STATE.clocks.cake.q,
          qChildren: STATE.clocks.children.q
        })
      };
    }
  }

  function commitTransaction() {
    const snap = STATE.pendingTx || {
      ring: STATE.activeRing,
      role: STATE.capturedRole,
      at: new Date().toLocaleTimeString(),
      snapshot: JSON.stringify({
        cake: STATE.cake,
        forest: STATE.forest,
        fieldReveal: STATE.fieldReveal,
        edgeSoftness: STATE.edgeSoftness,
        qCake: STATE.clocks.cake.q,
        qChildren: STATE.clocks.children.q
      })
    };
    STATE.txStack.push(snap);
    if (STATE.txStack.length > 16) STATE.txStack.shift();
    STATE.pendingTx = null;
    syncDOM();
  }

  function undoTransaction() {
    const tx = STATE.pendingTx || STATE.txStack.pop();
    STATE.pendingTx = null;
    if (!tx) return;
    try {
      const s = JSON.parse(tx.snapshot);
      Object.assign(STATE.cake, s.cake);
      Object.assign(STATE.forest, s.forest);
      STATE.fieldReveal = s.fieldReveal;
      STATE.edgeSoftness = s.edgeSoftness;
      STATE.clocks.cake.q = s.qCake;
      STATE.clocks.children.q = s.qChildren;
      updateCrownTexture();
      rebuildCakeGeometry();
      rebuildInsectGeometry();
      syncDOM();
    } catch (e) {}
  }

  function turnRing(ringName, delta) {
    STATE.activeRing = ringName;
    STATE.ringAngles[ringName] = (STATE.ringAngles[ringName] + delta * 0.35 + 10) % 1;
    beginPreviewTransaction(ringName);
    const tWall = wallNow();

    if (ringName === 'field') {
      // 110 FIELD: Sweeps depth-band reveal threshold d = n·x & 1st-person edge softness
      STATE.fieldReveal = Math.max(0, Math.min(1, STATE.fieldReveal + delta * 0.45));
      STATE.edgeSoftness = Math.max(0.05, Math.min(0.85, STATE.edgeSoftness + delta * 0.3));
    } else if (ringName === 'variant') {
      // 112 VARIANT: Modifies captured role's form while retaining its surface anchor
      const role = STATE.capturedRole;
      if (STATE.sceneMode === 'birthday') {
        if (role === 'cake') {
          STATE.cake.bundt = Math.max(0, Math.min(1, STATE.cake.bundt + delta * 0.65));
          rebuildCakeGeometry();
        } else if (role === 'icing') {
          if (Math.abs(delta) > 0.04) {
            const step = delta > 0 ? 1 : -1;
            STATE.cake.glazeIdx = (STATE.cake.glazeIdx + step + 5) % 5;
            updateCrownTexture();
            rebuildCakeGeometry();
          }
        } else if (role === 'candles') {
          const nextC = Math.max(1, Math.min(12, Math.round(STATE.cake.candles + delta * 8)));
          STATE.cake.candles = nextC;
          STATE.cake.dragees = Math.max(4, nextC * 2);
          updateCrownTexture();
          rebuildCakeGeometry();
        } else if (role === 'children') {
          STATE.cake.exprWeight = Math.max(0, Math.min(1, STATE.cake.exprWeight + delta * 0.65));
        } else if (role === 'hand') {
          const pols = ['follow', 'suspend', 'block'];
          const idx = (pols.indexOf(STATE.cake.conflictPolicy) + (delta > 0 ? 1 : -1) + 3) % 3;
          STATE.cake.conflictPolicy = pols[idx];
        }
      } else if (STATE.sceneMode === 'forest') {
        if (role === 'insect') {
          if (Math.abs(delta) > 0.05) {
            STATE.forest.speciesIdx = (STATE.forest.speciesIdx + (delta > 0 ? 1 : -1) + 4) % 4;
            rebuildInsectGeometry();
          }
        } else if (role === 'eyeR') {
          STATE.forest.focusR = Math.max(0.05, Math.min(1, STATE.forest.focusR + delta * 0.65));
          STATE.forest.focusL = Math.max(0.05, Math.min(1, STATE.forest.focusL + delta * 0.45));
          rebuildInsectGeometry();
        } else if (role === 'setae') {
          STATE.forest.setae = Math.max(0, Math.min(1, STATE.forest.setae + delta * 0.65));
          rebuildInsectGeometry();
        }
      }
    } else if (ringName === 'time') {
      // 114 TIME: Jogs the captured layer's local clock q_i forward/backward while held layers stay frozen!
      const role = STATE.capturedRole;
      if (STATE.sceneMode === 'birthday') {
        if (role === 'cake') {
          STATE.clocks.cake.jog(delta * 2.4, tWall);
          STATE.cake.turntableYaw += delta * 2.1;
          // In Stage 4 (Hero Proof), jogging cake time also gently pulses flame intensity & piping if near ends
          if (STATE.donutStage === 4) {
            const q = STATE.clocks.cake.eval(tWall);
            STATE.cake.flames = Math.max(0.0, Math.min(1.0, 1.0 - Math.max(0, (q - 4.4) / 1.1)));
            rebuildCakeGeometry();
          }
        } else if (role === 'icing') {
          STATE.clocks.cake.jog(delta * 2.2, tWall);
          STATE.cake.pipeProgress = Math.max(0, Math.min(1, STATE.cake.pipeProgress + delta * 0.75));
          updateCrownTexture();
        } else if (role === 'candles') {
          STATE.clocks.cake.jog(delta * 2.4, tWall);
          STATE.cake.flames = Math.max(0, Math.min(1, STATE.cake.flames + delta * 0.85));
          rebuildCakeGeometry();
        } else if (role === 'children') {
          STATE.clocks.children.jog(delta * 2.0, tWall);
        } else if (role === 'hand') {
          STATE.clocks.hand.jog(delta * 1.8, tWall);
        }
      } else if (STATE.sceneMode === 'forest') {
        STATE.clocks.insect.jog(delta * 2.4, tWall);
      } else if (STATE.sceneMode === 'scan') {
        STATE.scan.scrub = Math.max(0, Math.min(1, STATE.scan.scrub + delta * 0.55));
      }
    }

    evaluateCrossTimeDependencies(tWall);
    updateReticleCanvas();
    syncDOM();
  }

  /* ---------------- 12. Donut Stage Presets ("The Blender Donut of the Orb") ---------------- */
  function setDonutStage(stageNum) {
    STATE.sceneMode = 'birthday';
    STATE.donutStage = stageNum;
    const tWall = wallNow();

    if (stageNum === 1) {
      // Stage 1: Sponge & Bundt Torus Base
      STATE.capturedRole = 'cake';
      STATE.activeRing = 'variant';
      if (STATE.cake.bundt < 0.2) STATE.cake.bundt = 0.85;
      rebuildCakeGeometry();
    } else if (stageNum === 2) {
      // Stage 2: Buttercream Glaze & Piped 生日快樂 Calligraphy
      STATE.capturedRole = 'icing';
      STATE.activeRing = 'time';
      STATE.cake.pipeProgress = 0.78;
      updateCrownTexture();
      rebuildCakeGeometry();
    } else if (stageNum === 3) {
      // Stage 3: Candles, 3200K Flames, Breath Wind & Smoke
      STATE.capturedRole = 'candles';
      STATE.activeRing = 'time';
      rebuildCakeGeometry();
    } else if (stageNum === 4) {
      // Stage 4: Hero Proof — Hold Children (r=0) while Jogging Cake & Live 3200K Candlelight
      STATE.capturedRole = 'cake';
      STATE.activeRing = 'time';
      STATE.clocks.children.setHold(true, tWall);
      STATE.clocks.cake.setHold(true, tWall);
      rebuildCakeGeometry();
    } else if (stageNum === 5) {
      // Stage 5: 1st-Person Hand Reaching for Frosting & Cross-Time Conflict Resolution
      STATE.capturedRole = 'cake';
      STATE.activeRing = 'time';
      STATE.clocks.hand.setHold(true, tWall);
      STATE.clocks.children.setHold(true, tWall);
      evaluateCrossTimeDependencies(tWall);
    }
    updateReticleCanvas();
    syncDOM();
  }

  function setSceneMode(mode) {
    STATE.sceneMode = mode;
    if (mode === 'birthday') {
      STATE.capturedRole = 'cake';
    } else if (mode === 'forest') {
      STATE.capturedRole = 'insect';
    } else if (mode === 'scan') {
      STATE.capturedRole = 'horse';
    }
    updateReticleCanvas();
    syncDOM();
  }

  function captureRole(roleId) {
    if (!ROLE_INFO[roleId]) return;
    STATE.capturedRole = roleId;
    updateReticleCanvas();
    syncDOM();
  }

  function toggleHoldCaptured() {
    const info = ROLE_INFO[STATE.capturedRole];
    if (!info) return;
    const clk = STATE.clocks[info.clockKey];
    if (!clk) return;
    clk.setHold(clk.r !== 0, wallNow());
    updateReticleCanvas();
    syncDOM();
  }

  function toggleWorldHold() {
    const info = ROLE_INFO[STATE.capturedRole];
    if (!info) return;
    const clk = STATE.clocks[info.clockKey];
    if (!clk) return;
    clk.worldHold = !clk.worldHold;
    if (clk.worldHold && insectMeshGroup) {
      clk.frozenWorldPos = insectMeshGroup.position.clone();
    }
    updateReticleCanvas();
    syncDOM();
  }

  function importScanToEditStore() {
    STATE.scan.importedToEditStore = true;
    STATE.scan.provenanceLog.push({
      ts: new Date().toLocaleTimeString(),
      action: 'EXPLICIT IMPORT (Claim 9): Copied <carved-wooden-horse> from Review Store (286) -> Edit Store (220)'
    });
    updateReticleCanvas();
    syncDOM();
  }

  /* ---------------- 13. Operable Vesper Field Orb 04 Hardware Barrel (#vesperOrbCanvas) ---------------- */
  let orbCanvas, orbCtx, dragRing = null, dragStartX = 0;


  /* Orb layout: one geometry shared by drawing and hit-testing. Every control lives on the barrel. */
  const STAGE_KEYS = [['1', 'stage', 1, 'BUNDT'], ['2', 'stage', 2, 'GLAZE'], ['3', 'stage', 3, 'FLAME'], ['4', 'stage', 4, 'HOLD'], ['5', 'stage', 5, 'HAND'], ['B', 'scene', 'forest', 'FOREST'], ['C', 'scene', 'scan', 'SCAN']];
  const ROLE_KEYS = [['cake', 'CAKE'], ['icing', 'ICING'], ['candles', 'CANDLE'], ['children', 'KIDS'], ['hand', 'HAND'], ['insect', 'BUG'], ['eyeR', 'EYE'], ['setae', 'SETAE']];
  const CLOCK_KEYS = [['children', 'KID'], ['cake', 'CAKE'], ['hand', 'HND']];
  function orbLayout(W, H, dpr, cssW) {
    const k = cssW < 600 ? 0.97 : 0.62;
    const bw = Math.min(W * k, 620 * dpr);
    const rowH = 26 * dpr, gap = 6 * dpr, head = 14 * dpr;
    const bh = Math.max(90 * dpr, Math.min(195 * dpr, H - (head + 2 * rowH + 4 * gap + 6 * dpr)));
    const total = head + gap + rowH + gap + bh + gap + rowH;
    const y0 = Math.max(0, (H - total) / 2);
    const r1 = y0 + head + gap, top = r1 + rowH + gap, r2 = top + bh + gap;
    const cx = W / 2, left = cx - bw / 2, cy = top + bh / 2;
    const s = Math.max(0.8, Math.min(1, bw / dpr / 560));
    const narrow = bw / dpr < 480;
    const L = { W, H, dpr, bw, bh, cx, cy, left, top, r1, r2, rowH, s, narrow, hy: y0 + head * 0.55, zones: [] };
    const add = (z, x, y, w, h) => L.zones.push({ z, x, y, w, h });
    // row 1: stages and scenes; row 2: capture targets
    const kw1 = Math.min(bw / STAGE_KEYS.length, 86 * dpr), x1 = cx - kw1 * STAGE_KEYS.length / 2;
    STAGE_KEYS.forEach((kk, i) => add('stage:' + i, x1 + i * kw1, r1, kw1, rowH));
    const kw2 = Math.min(bw / ROLE_KEYS.length, 80 * dpr), x2 = cx - kw2 * ROLE_KEYS.length / 2;
    ROLE_KEYS.forEach((kk, i) => add('role:' + i, x2 + i * kw2, r2, kw2, rowH));
    // left housing: 140 shroud, 278 undo / 276 commit, 234 doorway
    const rad = Math.min(bw * 0.05, 20 * dpr);
    L.rad = rad;
    L.btn = {
      shroud: [left + bw * 0.07, cy - bh * 0.2], undo: [left + bw * 0.185, cy - bh * 0.2],
      commit: [left + bw * 0.07, cy + bh * 0.2], door: [left + bw * 0.185, cy + bh * 0.2],
      thumb: [left + bw * 0.87, cy - bh * 0.1], world: [left + bw * 0.87, cy + bh * 0.28]
    };
    L.thumbRad = Math.min(bw * 0.058, 24 * dpr); L.worldRad = Math.min(bw * 0.048, 19 * dpr);
    Object.keys(L.btn).forEach(n => { const r = n === 'thumb' ? L.thumbRad : n === 'world' ? L.worldRad : rad; add('btn:' + n, L.btn[n][0] - r, L.btn[n][1] - r, 2 * r, 2 * r); });
    // clock lamps above the thumb
    L.lamps = CLOCK_KEYS.map((c, i) => [left + bw * (0.79 + i * 0.07), cy - bh * 0.4]);
    L.lamps.forEach((l, i) => add('lamp:' + i, l[0] - 13 * dpr, l[1] - 13 * dpr, 26 * dpr, 30 * dpr));
    // rings
    const ringAreaLeft = left + bw * 0.25, ringW = bw * 0.49 / 3;
    ['field', 'variant', 'time'].forEach((n, i) => add('ring:' + n, ringAreaLeft + i * ringW, top, ringW, bh));
    return L;
  }
  function orbHit(L, x, y) {
    for (let i = L.zones.length - 1; i >= 0; i--) { const z = L.zones[i]; if (z.w > 0 && x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.z; }
    return null;
  }
  function orbPress(zone) {
    const [kind, arg] = zone.split(':');
    const click = sel => { const el = document.querySelector(sel); if (el) el.click(); };
    if (kind === 'stage') { const kk = STAGE_KEYS[Number(arg)]; click(kk[1] === 'stage' ? `[data-donut-stage="${kk[2]}"]` : `[data-scene-mode="${kk[2]}"]`); return true; }
    if (kind === 'role') { click(`[data-capture-role="${ROLE_KEYS[Number(arg)][0]}"]`); return true; }
    if (kind === 'lamp') { click(`[data-toggle-clock="${CLOCK_KEYS[Number(arg)][0]}"]`); return true; }
    if (zone === 'btn:undo') { click('#btnUndoTx'); return true; }
    if (zone === 'btn:door') { click('#btnDoorwayAlert'); return true; }
    return false;
  }

  function initOrbBarrel(canvas) {
    orbCanvas = canvas;
    orbCtx = canvas.getContext('2d');

    const getHitZone = (ex, ey) => {
      const r = canvas.getBoundingClientRect();
      const dpr = canvas.width / r.width;
      const x = (ex - r.left) * dpr, y = (ey - r.top) * dpr;
      const z = orbHit(orbLayout(canvas.width, canvas.height, dpr, r.width), x, y);
      if (!z) return null;
      if (z.startsWith('ring:')) return z.slice(5);
      if (z === 'btn:thumb') return 'thumb_hold';
      if (z === 'btn:world') return 'thumb_world';
      if (z === 'btn:shroud') return 'shroud_140';
      if (z === 'btn:commit') return 'commit_276';
      return z;
    };

    canvas.addEventListener('pointerdown', e => {
      const zone = getHitZone(e.clientX, e.clientY);
      if (!zone) return;
      if (orbPress(zone)) { e.preventDefault(); return; }
      if (zone === 'thumb_hold') {
        toggleHoldCaptured();
        return;
      }
      if (zone === 'thumb_world') {
        toggleWorldHold();
        return;
      }
      if (zone === 'shroud_140') {
        STATE.shroudExtended = !STATE.shroudExtended;
        syncDOM();
        return;
      }
      if (zone === 'commit_276') {
        commitTransaction();
        return;
      }
      dragRing = zone;
      STATE.activeRing = zone;
      dragStartX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      updateReticleCanvas();
      syncDOM();
    });

    canvas.addEventListener('pointermove', e => {
      if (!dragRing) return;
      const dx = (e.clientX - dragStartX) / 180;
      dragStartX = e.clientX;
      if (Math.abs(dx) > 0.0005) {
        turnRing(dragRing, dx);
      }
    });

    const endDrag = () => { dragRing = null; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zone = getHitZone(e.clientX, e.clientY) || STATE.activeRing;
      const ring = ['field', 'variant', 'time'].includes(zone) ? zone : STATE.activeRing;
      const delta = -e.deltaY * 0.0012;
      turnRing(ring, delta);
    }, { passive: false });
  }

  function drawOrbBarrel() {
    if (!orbCtx || !orbCanvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = orbCanvas.getBoundingClientRect();
    const W = Math.max(320, Math.round(rect.width * dpr));
    const H = Math.max(160, Math.round(rect.height * dpr));
    if (orbCanvas.width !== W || orbCanvas.height !== H) {
      orbCanvas.width = W;
      orbCanvas.height = H;
    }

    const x = orbCtx;
    x.clearRect(0, 0, W, H);

    // Ambient studio floor reflection beneath the Vesper barrel
    const L = orbLayout(W, H, dpr, rect.width);
    const { cx, cy, bw, bh, left, top } = L;

    const bgGlow = x.createRadialGradient(cx, cy, bh * 0.1, cx, cy, bw * 0.65);
    bgGlow.addColorStop(0, 'rgba(60, 115, 135, 0.16)');
    bgGlow.addColorStop(1, 'rgba(5, 8, 12, 0)');
    x.fillStyle = bgGlow;
    x.fillRect(0, 0, W, H);

    // Extendable Front Optical Shroud (140 in FIGS. 1-2, Claim 16)
    const shroudShift = STATE.shroudExtended ? -18 * dpr : 0;
    x.save();
    x.fillStyle = '#14181d';
    x.strokeStyle = STATE.shroudExtended ? '#70d6ff' : '#3a424c';
    x.lineWidth = 1.5 * dpr;
    x.beginPath();
    x.roundRect(left - 14 * dpr + shroudShift, top + bh * 0.12, 26 * dpr, bh * 0.76, 8 * dpr);
    x.fill();
    x.stroke();

    // Front Optical Element glow
    const lensGlow = x.createLinearGradient(left + shroudShift, top, left + shroudShift, top + bh);
    lensGlow.addColorStop(0, 'rgba(112,214,255,0.15)');
    lensGlow.addColorStop(0.5, 'rgba(255,195,110,0.42)');
    lensGlow.addColorStop(1, 'rgba(112,214,255,0.15)');
    x.fillStyle = lensGlow;
    x.fillRect(left - 12 * dpr + shroudShift, top + bh * 0.18, 6 * dpr, bh * 0.64);
    x.restore();

    // Main Anodized Cinema Barrel Body (102 in FIG. 1 — Canon Cinema EOS + ARRI Hi-5 aesthetic)
    const bodyGrad = x.createLinearGradient(0, top, 0, top + bh);
    bodyGrad.addColorStop(0, '#3a4048');
    bodyGrad.addColorStop(0.18, '#58606b');
    bodyGrad.addColorStop(0.5, '#252a30');
    bodyGrad.addColorStop(0.85, '#15181c');
    bodyGrad.addColorStop(1, '#2c323a');

    x.fillStyle = bodyGrad;
    x.strokeStyle = '#687380';
    x.lineWidth = 1.5 * dpr;
    x.beginPath();
    x.roundRect(left, top, bw, bh, 18 * dpr);
    x.fill();
    x.stroke();

    // Left Housing: Shroud 140 & Commit 276 keys
    const drawSideButton = (bx, by, rad, label, sub, active, accent) => {
      x.save();
      x.fillStyle = active ? 'rgba(30,52,66,0.95)' : '#181c22';
      x.strokeStyle = active ? accent : '#4b5560';
      x.lineWidth = 2 * dpr;
      x.beginPath();
      x.arc(bx, by, rad, 0, Math.PI * 2);
      x.fill();
      x.stroke();
      x.fillStyle = active ? accent : '#cfd8e0';
      x.font = `700 ${Math.round(Math.min(9 * dpr, rad * 0.46))}px "JetBrains Mono",monospace`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(label, bx, by - rad * 0.16);
      x.fillStyle = 'rgba(180,195,205,0.78)';
      x.font = `500 ${Math.round(Math.min(7 * dpr, rad * 0.34))}px "JetBrains Mono",monospace`;
      x.fillText(sub, bx, by + rad * 0.34);
      x.restore();
    };

    drawSideButton(...L.btn.shroud, L.rad, '140', STATE.shroudExtended ? 'OUT' : 'IN', STATE.shroudExtended, '#70d6ff');
    drawSideButton(...L.btn.undo, L.rad, '278', 'UNDO', false, '#e8f0f6');
    drawSideButton(...L.btn.commit, L.rad, '276', `COMMIT ${STATE.txStack.length}`, Boolean(STATE.pendingTx), '#98f5b0');
    drawSideButton(...L.btn.door, L.rad, '234', 'DOOR', STATE.doorwayAlert, '#ff9f43');

    // 3 Coaxial Draggable Rings in the Central Cinema Barrel Window (110 FIELD, 112 VARIANT, 114 TIME)
    const ringAreaLeft = left + bw * 0.25;
    const ringAreaW = bw * 0.49;
    const ringW = ringAreaW / 3;

    const ringSpecs = [
      {
        key: 'field',
        num: '110',
        name: 'FIELD',
        sub: 'DEPTH REVEAL',
        pitch: 14, // Broad Scallops (Claim 18)
        style: 'scallop',
        accent: '#70d6ff',
        readout: `${Math.round((1 - STATE.fieldReveal) * 100)}% MEM`
      },
      {
        key: 'variant',
        num: '112',
        name: 'VARIANT',
        sub: 'FORM / SPECIES',
        pitch: 22, // Indexed Detents (Claim 18)
        style: 'detent',
        accent: '#ffd166',
        readout: STATE.sceneMode === 'birthday'
          ? (STATE.capturedRole === 'cake' ? `BUNDT ${Math.round(STATE.cake.bundt * 100)}%` : STATE.capturedRole === 'candles' ? `${STATE.cake.candles} CANDLES` : `GLAZE #${STATE.cake.glazeIdx + 1}`)
          : `VAR #${STATE.forest.speciesIdx + 1}`
      },
      {
        key: 'time',
        num: '114',
        name: 'TIME',
        sub: 'LAYER JOG q_i',
        pitch: 38, // Fine-Knurled Continuous Jog Wheel (Claim 18)
        style: 'knurl',
        accent: '#ff9f43',
        readout: `${STATE.clocks[ROLE_INFO[STATE.capturedRole]?.clockKey || 'cake'].eval().toFixed(2)}s`
      }
    ];

    ringSpecs.forEach((rs, idx) => {
      const rx = ringAreaLeft + idx * ringW + 3 * dpr;
      const rw = ringW - 6 * dpr;
      const isAct = STATE.activeRing === rs.key;

      // Recessed barrel track
      const rGrad = x.createLinearGradient(0, top, 0, top + bh);
      rGrad.addColorStop(0, '#1c2026');
      rGrad.addColorStop(0.25, isAct ? '#343d48' : '#2a3038');
      rGrad.addColorStop(0.5, isAct ? '#485464' : '#38404a');
      rGrad.addColorStop(0.75, isAct ? '#2c343e' : '#22272e');
      rGrad.addColorStop(1, '#14171b');

      x.fillStyle = rGrad;
      x.strokeStyle = isAct ? rs.accent : '#4e5865';
      x.lineWidth = (isAct ? 2.2 : 1.1) * dpr;
      x.beginPath();
      x.roundRect(rx, top - 4 * dpr, rw, bh + 8 * dpr, 6 * dpr);
      x.fill();
      x.stroke();

      // Tactilely Distinct Knurling / Scallops / Detents (Claim 18)
      const phase = (STATE.ringAngles[rs.key] || 0) * Math.PI * 2;
      const nTicks = rs.pitch;
      x.save();
      x.beginPath();
      x.rect(rx + 2 * dpr, top, rw - 4 * dpr, bh);
      x.clip();

      for (let k = 0; k < nTicks; k++) {
        const a = (k / nTicks) * Math.PI * 2 + phase;
        const sinA = Math.sin(a);
        const cosA = Math.cos(a);
        if (cosA < -0.15) continue;
        const py = cy + sinA * (bh * 0.48);

        if (rs.style === 'scallop') {
          x.fillStyle = `rgba(15, 18, 22, ${0.55 * cosA})`;
          x.fillRect(rx + 4 * dpr, py - 3.5 * dpr, rw - 8 * dpr, 7 * dpr);
          x.strokeStyle = `rgba(190, 215, 230, ${0.35 * cosA})`;
          x.lineWidth = 1.2 * dpr;
          x.beginPath();
          x.moveTo(rx + 4 * dpr, py - 3.5 * dpr);
          x.lineTo(rx + rw - 4 * dpr, py - 3.5 * dpr);
          x.stroke();
        } else if (rs.style === 'detent') {
          x.strokeStyle = k % 3 === 0 ? `rgba(255, 209, 102, ${0.65 * cosA})` : `rgba(180, 195, 210, ${0.32 * cosA})`;
          x.lineWidth = (k % 3 === 0 ? 2.2 : 1.1) * dpr;
          x.beginPath();
          x.moveTo(rx + 6 * dpr, py);
          x.lineTo(rx + rw - 6 * dpr, py);
          x.stroke();
        } else {
          // Fine-knurled continuous TIME jog wheel
          x.strokeStyle = k % 5 === 0 ? `rgba(255, 159, 67, ${0.75 * cosA})` : `rgba(210, 220, 230, ${0.28 * cosA})`;
          x.lineWidth = (k % 5 === 0 ? 1.8 : 0.9) * dpr;
          x.beginPath();
          x.moveTo(rx + 4 * dpr, py);
          x.lineTo(rx + rw - 4 * dpr, py);
          x.stroke();
        }
      }
      x.restore();

      // Engraved Canon/ARRI Witness Mark & Label Plate on each ring
      x.fillStyle = 'rgba(12, 16, 20, 0.86)';
      x.fillRect(rx + 3 * dpr, cy - 18 * dpr, rw - 6 * dpr, 36 * dpr);

      x.fillStyle = rs.accent;
      x.font = `700 ${Math.round(9.5 * dpr)}px "JetBrains Mono",monospace`;
      x.textAlign = 'center';
      x.fillText(L.narrow ? rs.name : `${rs.num} ${rs.name}`, rx + rw / 2, cy - 6 * dpr);

      x.fillStyle = '#e8f0f5';
      x.font = `600 ${Math.round(8.5 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(rs.readout, rx + rw / 2, cy + 7 * dpr);

      if (!L.narrow) {
      x.fillStyle = 'rgba(170,185,198,0.65)';
      x.font = `500 ${Math.round(6.8 * dpr)}px "JetBrains Mono",monospace`;
      x.fillText(rs.sub, rx + rw / 2, cy + 16 * dpr); }
    });

    // Right Grip Housing: Thumb Actuator (120 HOLD POSE & WORLD HOLD)
    const activeClk = STATE.clocks[ROLE_INFO[STATE.capturedRole]?.clockKey || 'cake'];
    const isHeld = activeClk && activeClk.r === 0;
    const isWorldHeld = activeClk && activeClk.worldHold;

    drawSideButton(...L.btn.thumb, L.thumbRad, '120', isHeld ? 'HELD' : 'LIVE', isHeld, '#ffcc66');
    drawSideButton(...L.btn.world, L.worldRad, 'WORLD', isWorldHeld ? 'LOCK' : 'FOLLOW', isWorldHeld, '#ff9f43');
    // clock lamps: one per layer, lit amber while held, green while live
    CLOCK_KEYS.forEach((c, i) => {
      const clk = STATE.clocks[c[0]]; const held = clk && clk.r === 0; const lx = L.lamps[i][0], ly = L.lamps[i][1];
      x.save(); x.fillStyle = held ? '#ffcc66' : '#98f5b0'; x.shadowColor = held ? '#ffcc66' : '#98f5b0'; x.shadowBlur = 8 * dpr;
      x.beginPath(); x.arc(lx, ly, 5 * dpr, 0, Math.PI * 2); x.fill(); x.restore();
      x.fillStyle = 'rgba(200,214,224,0.8)'; x.font = `600 ${Math.round(6.5 * dpr)}px "JetBrains Mono",monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(c[1], lx, ly + 12 * dpr);
    });

    // Engraved header: what is captured, and what the scene is doing
    x.fillStyle = 'rgba(210, 224, 232, 0.8)';
    x.font = `600 ${Math.round(9 * dpr)}px "JetBrains Mono",monospace`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const depTxt = (document.getElementById('vConflictBadge') || {}).textContent || '';
    x.fillText(`${ROLE_INFO[STATE.capturedRole]?.title.toUpperCase()} · ${STATE.sceneMode === 'birthday' ? 'STAGE ' + STATE.donutStage : STATE.sceneMode.toUpperCase()}${depTxt ? ' · ' + depTxt : ''}`, cx, L.hy);
    const keyRow = (n, y, w, labeler, isOn, accent) => {
      const kw = Math.min(L.bw / n, 86 * dpr), x0 = cx - kw * n / 2;
      for (let i = 0; i < n; i++) {
        const on = isOn(i), kx = x0 + i * kw + 2 * dpr;
        x.fillStyle = on ? 'rgba(28,46,60,0.96)' : '#14181d'; x.strokeStyle = on ? accent : '#46505b'; x.lineWidth = (on ? 2 : 1) * dpr;
        x.beginPath(); x.roundRect(kx, y, kw - 4 * dpr, L.rowH, 6 * dpr); x.fill(); x.stroke();
        x.fillStyle = on ? accent : '#b9c6d2'; x.font = `700 ${Math.round((L.narrow ? 8 : 9.5) * dpr)}px "JetBrains Mono",monospace`;
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(labeler(i), kx + (kw - 4 * dpr) / 2, y + L.rowH / 2 + dpr * 0.5);
      }
    };
    keyRow(STAGE_KEYS.length, L.r1, 0, i => L.narrow ? STAGE_KEYS[i][0] : STAGE_KEYS[i][0] + ' ' + STAGE_KEYS[i][3],
      i => STAGE_KEYS[i][1] === 'stage' ? (STATE.sceneMode === 'birthday' && STATE.donutStage === STAGE_KEYS[i][2]) : STATE.sceneMode === STAGE_KEYS[i][2], '#ffcc66');
    keyRow(ROLE_KEYS.length, L.r2, 0, i => ROLE_KEYS[i][1], i => STATE.capturedRole === ROLE_KEYS[i][0], '#70d6ff');
  }

  /* ---------------- 14. Main Render Loop & Viewport Picking ---------------- */
  function initViewport(canvas) {
    renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    scene = new T.Scene();
    scene.background = new T.Color(0x050709);
    camera = new T.PerspectiveCamera(32, 16 / 9, 0.1, 150);
    camera.position.set(0, 0.15, 6.2);
    camera.lookAt(0, -0.35, 0);

    // Studio & 3200K Candle Lighting
    ambientLight = new T.AmbientLight(0x2d241c, 0.65);
    scene.add(ambientLight);

    candlePointLight = new T.PointLight(0xffad52, 2.8, 14, 1.8);
    candlePointLight.position.set(0, -0.35, -0.2);
    scene.add(candlePointLight);

    tablePointLight = new T.PointLight(0xff9f38, 1.4, 10, 2.0);
    tablePointLight.position.set(0, -1.3, 0.4);
    scene.add(tablePointLight);

    const keyLight = new T.DirectionalLight(0xfff0d8, 0.75);
    keyLight.position.set(2.5, 5.0, 4.5);
    scene.add(keyLight);

    initCrownTexture();
    buildChamberShell();
    buildBirthdayScene();
    buildForestScene();
    buildScanScene();
    initReticle();

    // Raycast Capture on Viewport Click (240 in FIG. 5)
    const raycaster = new T.Raycaster();
    const mouse = new T.Vector2();
    let orbitDrag = false, ox = 0, oy = 0, moved = false;

    canvas.addEventListener('pointerdown', e => {
      orbitDrag = true;
      moved = false;
      ox = e.clientX;
      oy = e.clientY;
    });

    window.addEventListener('pointermove', e => {
      if (!orbitDrag) return;
      const dx = e.clientX - ox, dy = e.clientY - oy;
      if (Math.hypot(dx, dy) > 4) moved = true;
      ox = e.clientX;
      oy = e.clientY;
      STATE.cameraOrbit[0] = Math.max(-0.65, Math.min(0.65, STATE.cameraOrbit[0] - dx * 0.0045));
      STATE.cameraOrbit[1] = Math.max(-0.35, Math.min(0.45, STATE.cameraOrbit[1] + dy * 0.0035));
    });

    window.addEventListener('pointerup', e => {
      if (!orbitDrag) return;
      orbitDrag = false;
      if (!moved && e.target === canvas) {
        const r = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        for (const h of hits) {
          let obj = h.object;
          while (obj) {
            if (obj.userData && obj.userData.role) {
              captureRole(obj.userData.role);
              return;
            }
            obj = obj.parent;
          }
        }
      }
    });

    // Wheel on Chamber Viewport turns the active ring directly!
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      turnRing(STATE.activeRing, -e.deltaY * 0.0012);
    }, { passive: false });
  }

  function resizeAll() {
    if (!renderer) return;
    const vp = renderer.domElement.parentElement;
    if (!vp) return;
    const w = Math.max(320, vp.clientWidth);
    const h = Math.max(200, vp.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function renderFrame() {
    requestAnimationFrame(renderFrame);
    const tWall = wallNow();

    birthdayGroup.visible = STATE.sceneMode === 'birthday';
    forestGroup.visible = STATE.sceneMode === 'forest';
    scanGroup.visible = STATE.sceneMode === 'scan';
    doorwayGroup.visible = STATE.doorwayAlert;

    // Camera orbit & elevated over-the-table angle matching Blade Runner 2049 (02:23 / 02:26)
    const [yaw, pitch] = STATE.cameraOrbit;
    const dist = 5.65;
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      0.68 + Math.sin(pitch) * dist,
      Math.cos(yaw) * Math.cos(pitch) * dist
    );
    camera.lookAt(0, -0.52, -0.35);

    if (STATE.sceneMode === 'birthday') {
      const qCake = STATE.clocks.cake.eval(tWall);
      const qChild = STATE.clocks.children.eval(tWall);

      // 1. Update Cake Turntable & 3200K Candlelight Bounce
      cakeMeshGroup.rotation.y = STATE.cake.turntableYaw + (STATE.clocks.cake.r ? (qCake - 2.4) * 0.35 : 0);
      const cakeInner = cakeMeshGroup.children[0];
      if (cakeInner && cakeInner.userData.tick) {
        cakeInner.userData.tick(qCake * 1.4);
      }

      // Live 3200K candle flicker moves across the HELD children's faces!
      const flicker = STATE.cake.flames > 0.02
        ? (0.92 + 0.14 * Math.sin(tWall * 9.5 + qCake * 5.0) + 0.08 * Math.cos(tWall * 17.0))
        : 0.04;
      candlePointLight.intensity = 2.9 * STATE.cake.flames * flicker * Math.sqrt(STATE.cake.candles / 4);
      candlePointLight.position.set(
        Math.sin(cakeMeshGroup.rotation.y + tWall * 1.8) * 0.48,
        -0.32,
        -0.25 + Math.cos(cakeMeshGroup.rotation.y + tWall * 1.8) * 0.38
      );

      // Twilight dimming when candles are blown out or FIELD sweeps toward chamber
      const memVis = 1 - STATE.fieldReveal;
      filmBackPlane.material.opacity = 0.88 * memVis * (0.22 + 0.78 * STATE.cake.flames);
      ambientLight.intensity = 0.25 + 0.45 * STATE.cake.flames;

      // 2. Children Layer: Frozen at qChild when HELD (r=0), breathing/swaying when LIVE (r=1)
      const expr = STATE.cake.exprWeight;
      const lK = Math.max(0.08, STATE.cake.flames * flicker * Math.sqrt(STATE.cake.candles / 4));
      childCards.forEach((card, i) => {
        const bp = card.userData.basePos;
        const sway = Math.sin(qChild * 1.8 + i * 1.4) * 0.032;
        const nod = (expr - 0.5) * 0.06 + Math.cos(qChild * 2.1 + i) * 0.015;
        card.position.set(bp.x + sway, bp.y + nod * 0.4, bp.z);
        card.rotation.z = sway * 0.25;
        const u = card.material.uniforms;
        if (u) {
          u.lightK.value = lK;
          u.exprK.value = expr;
          u.selK.value = STATE.capturedRole === 'children' ? 1.0 : 0.0;
          u.candlePos.value.copy(candlePointLight.position);
        }
        card.visible = STATE.fieldReveal < (card.userData.thresh || 0.75);
      });

      evaluateCrossTimeDependencies(tWall);

      // Position Reticle cleanly to the upper-right of Captured Target (02:23 / 02:26 film composition)
      const retPos = {
        cake:     [1.38, -0.18, 0.55],
        icing:    [1.34, -0.08, 0.55],
        candles:  [1.38,  0.12, 0.55],
        children: [1.55,  0.65, -0.4],
        hand:     [1.35, -0.35, 0.75]
      }[STATE.capturedRole] || [1.38, -0.18, 0.55];
      reticleSprite.position.set(...retPos);
    } else if (STATE.sceneMode === 'forest') {
      const qForest = STATE.clocks.forest.eval(tWall);
      const qInsect = STATE.clocks.insect.eval(tWall);

      // Segmented Depth-Band Forest Reveal (FIG. 4: forest recedes in discrete sections!)
      forestBands.forEach(b => {
        b.visible = STATE.fieldReveal < b.userData.threshold;
      });

      // Moving Wet Leaf Support Surface
      const leafSwayX = Math.sin(qForest * 1.6) * 0.18;
      const leafSwayY = Math.cos(qForest * 2.1) * 0.09;
      leafMeshGroup.position.set(leafSwayX, leafSwayY, 0);
      leafMeshGroup.rotation.z = Math.sin(qForest * 1.6) * 0.06;

      // Anchored Insect: Follows moving leaf socket unless WORLD HOLD (Claim 12) is active!
      if (STATE.clocks.insect.worldHold && STATE.clocks.insect.frozenWorldPos) {
        insectMeshGroup.position.copy(STATE.clocks.insect.frozenWorldPos);
        insectMeshGroup.rotation.z = 0;
      } else {
        insectMeshGroup.position.set(leafSwayX, -0.68 + leafSwayY, 0.25);
        insectMeshGroup.rotation.z = leafMeshGroup.rotation.z;
      }

      const btInner = insectMeshGroup.children[0];
      if (btInner && btInner.userData.tick) {
        btInner.userData.tick(qInsect * 1.5);
      }
      reticleSprite.position.set(0.95, 0.15, 0.85);
    } else if (STATE.sceneMode === 'scan') {
      horseMeshGroup.rotation.y = (STATE.scan.scrub - 0.5) * Math.PI * 1.6;
      reticleSprite.position.set(0.92, 0.12, 0.9);
    }

    renderer.render(scene, camera);
    drawOrbBarrel();
  }

  /* ---------------- 15. DOM Synchronization & Interactive Bindings ---------------- */
  function syncDOM() {
    const info = ROLE_INFO[STATE.capturedRole] || ROLE_INFO.cake;
    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setTxt('vTargetBadge', info.title);
    setTxt('vAnchorBadge', `${info.anchor.supportId} · tri #${info.anchor.tri} · uvw(${info.anchor.uvw.join(', ')})`);
    setTxt('vVariantReadout', info.variantLabel());
    setTxt('vTimeReadout', info.timeLabel());
    setTxt('vConflictBadge', STATE.cake.conflictState);

    const heroTitleEl = document.getElementById('vStageHeroTitle');
    const heroBodyEl = document.getElementById('vStageHeroBody');
    if (heroTitleEl && heroBodyEl) {
      if (STATE.sceneMode === 'forest') {
        heroTitleEl.textContent = 'SCENE B // FOREST DEPTH REVEAL & ANCHORED INSECT (FIGS. 4-5)';
        heroBodyEl.innerHTML = 'Drag <b>110 FIELD</b> to sweep forest depth bands back toward the sterile chamber. Drag <b>112 VARIANT</b> to swap insect species on surface socket <b>elderberry_leaf_01#T142</b>, or press <b>W (WORLD HOLD)</b> to freeze the bug in room space while the leaf keeps swaying.';
      } else if (STATE.sceneMode === 'scan') {
        heroTitleEl.textContent = 'SCENE C // STELLINE SCAN READ-ONLY REVIEW CONSOLE (FIG. 8, CLAIM 9)';
        heroBodyEl.innerHTML = 'Inspect external memory scan <b>&lt;carved-wooden-horse&gt; (6·10·21)</b> in isolated Review Store <b>(286)</b>. Live Edit Store <b>(220)</b> remains untouched unless you explicitly click <b>IMPORT SCAN TO EDIT STORE</b>.';
      } else if (STATE.donutStage === 1) {
        heroTitleEl.textContent = 'DONUT STAGE 1 // SPONGE & 12-FLUTE BUNDT TORUS (<cake-on-table>)';
        heroBodyEl.innerHTML = 'Just as Blender starts with a torus mesh, start by shaping the cake sponge. Drag <b>112 VARIANT</b> (or scroll wheel) to morph continuously between the <b>Cylinder Sponge</b> and the <b>12-Flute Scalloped Bundt Torus</b> on socket <b>table_hex_01#T18</b>.';
      } else if (STATE.donutStage === 2) {
        heroTitleEl.textContent = 'DONUT STAGE 2 // BUTTERCREAM GLAZE & 生日快樂 CALLIGRAPHY (<icing-crown>)';
        heroBodyEl.innerHTML = 'Drag <b>112 VARIANT</b> to cycle glaze materiality (Canon Buttercream, Whipped Vanilla, Dark Ganache, Matcha). Drag <b>114 TIME</b> to scrub the 5-stroke piping curve of <b>生日快樂</b> + Z-underline, or type any recipient name top-right.';
      } else if (STATE.donutStage === 3) {
        heroTitleEl.textContent = 'DONUT STAGE 3 // CANDLES, 3200K FLAMES & BREATH SMOKE (<candle-ring>)';
        heroBodyEl.innerHTML = 'Drag <b>112 VARIANT</b> to dial <b>1–12 striped wax candles</b> &amp; Smarties dragees. Drag <b>114 TIME</b> forward to blow out the <b>3200K teardrop flames</b> into glowing red embers, rising smoke wisps, and twilight chamber relighting.';
      } else if (STATE.donutStage === 5) {
        heroTitleEl.textContent = 'DONUT STAGE 5 // 1ST-PERSON HAND & CROSS-TIME CONFLICT ([0028], [0033])';
        heroBodyEl.innerHTML = 'The reaching 1st-person child hand is <b>HELD in frosting contact (r = 0)</b>. Drag <b>114 TIME</b> to jog the cake away from the contact epoch and watch the <b>Cross-Time Dependency Resolver</b> follow contact, suspend constraint, or clamp jog.';
      } else {
        heroTitleEl.textContent = 'PROVE IT IN ONE TURN // HERO PROOF (DONUT STAGE 4)';
        heroBodyEl.innerHTML = 'The 4 birthday children are <b>HELD at t_H = 2.00s (r = 0)</b> while <b>&lt;cake-on-table&gt;</b> is captured. Drag the <b>114 TIME ring</b> (or scroll wheel) to rotate the cake &amp; shift live <b>3200K candlelight</b> across their frozen faces.';
      }
    }

    // Update Donut Stage pills
    document.querySelectorAll('[data-donut-stage]').forEach(btn => {
      const st = Number(btn.getAttribute('data-donut-stage'));
      btn.classList.toggle('active', STATE.sceneMode === 'birthday' && STATE.donutStage === st);
    });

    // Update Scene Mode pills
    document.querySelectorAll('[data-scene-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-scene-mode') === STATE.sceneMode);
    });

    // Update Target Capture pills
    document.querySelectorAll('[data-capture-role]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-capture-role') === STATE.capturedRole);
    });

    // Update FIG. 6 Multi-Clock Track Bars
    const tWall = wallNow();
    ['children', 'cake', 'hand'].forEach(k => {
      const clk = STATE.clocks[k];
      const q = clk.eval(tWall);
      const pct = Math.max(0, Math.min(100, ((q - clk.minQ) / (clk.maxQ - clk.minQ)) * 100));
      const fill = document.getElementById(`clkFill_${k}`);
      if (fill) fill.style.width = `${pct.toFixed(1)}%`;
      const stat = document.getElementById(`clkStat_${k}`);
      if (stat) {
        stat.textContent = `${clk.r === 0 ? 'HELD' : 'LIVE'} @ ${q.toFixed(2)}s`;
        stat.className = `clock-stat ${clk.r === 0 ? 'held' : 'live'}`;
      }
    });

    // Peripheral Edge Softness vignette overlay (Claim 14)
    const vig = document.getElementById('vEdgeSoftnessOverlay');
    if (vig) {
      const s = Math.round(STATE.edgeSoftness * 95);
      vig.style.boxShadow = `inset 0 0 ${s}px ${Math.round(s * 0.45)}px rgba(4, 7, 10, ${(0.35 + STATE.edgeSoftness * 0.55).toFixed(2)})`;
    }

    // Doorway Alert pill
    const doorBtn = document.getElementById('btnDoorwayAlert');
    if (doorBtn) doorBtn.classList.toggle('active', STATE.doorwayAlert);

    // Scan Import button
    const scanBtn = document.getElementById('btnScanImport');
    if (scanBtn) {
      scanBtn.style.display = STATE.sceneMode === 'scan' ? 'inline-flex' : 'none';
      scanBtn.textContent = STATE.scan.importedToEditStore
        ? 'IMPORTED TO EDIT STORE (220)'
        : 'IMPORT SCAN TO EDIT STORE (CLAIM 9)';
    }
  }

  function initUI() {
    initViewport(document.getElementById('chamberCanvas'));
    initOrbBarrel(document.getElementById('vesperOrbCanvas'));
    resizeAll();
    window.addEventListener('resize', resizeAll);

    // Donut stage buttons
    document.querySelectorAll('[data-donut-stage]').forEach(btn => {
      btn.addEventListener('click', () => setDonutStage(Number(btn.getAttribute('data-donut-stage'))));
    });

    // Scene mode buttons
    document.querySelectorAll('[data-scene-mode]').forEach(btn => {
      btn.addEventListener('click', () => setSceneMode(btn.getAttribute('data-scene-mode')));
    });

    // Target role capture buttons
    document.querySelectorAll('[data-capture-role]').forEach(btn => {
      btn.addEventListener('click', () => captureRole(btn.getAttribute('data-capture-role')));
    });

    // Clock Hold toggles in FIG. 6 strip
    document.querySelectorAll('[data-toggle-clock]').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.getAttribute('data-toggle-clock');
        const clk = STATE.clocks[k];
        if (clk) {
          clk.setHold(clk.r !== 0, wallNow());
          updateReticleCanvas();
          syncDOM();
        }
      });
    });

    // Custom cake inscription input
    const nameInput = document.getElementById('customCakeInput');
    if (nameInput) {
      nameInput.addEventListener('input', e => {
        STATE.cake.customText = e.target.value || '生日快樂';
        STATE.cake.glazeIdx = 4;
        updateCrownTexture();
        updateReticleCanvas();
        syncDOM();
      });
    }

    // Doorway Alert button (234 in FIG. 4)
    const doorBtn = document.getElementById('btnDoorwayAlert');
    if (doorBtn) {
      doorBtn.addEventListener('click', () => {
        STATE.doorwayAlert = !STATE.doorwayAlert;
        syncDOM();
      });
    }

    // Scan Import button (FIG. 8, Claim 9)
    const scanBtn = document.getElementById('btnScanImport');
    if (scanBtn) {
      scanBtn.addEventListener('click', importScanToEditStore);
    }

    // Undo / Commit buttons
    const btnCommit = document.getElementById('btnCommitTx');
    if (btnCommit) btnCommit.addEventListener('click', commitTransaction);
    const btnUndo = document.getElementById('btnUndoTx');
    if (btnUndo) btnUndo.addEventListener('click', undoTransaction);

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.key >= '1' && e.key <= '5') {
        setDonutStage(Number(e.key));
      } else if (e.key === ' ') {
        e.preventDefault();
        toggleHoldCaptured();
      } else if (e.key === 'w' || e.key === 'W') {
        toggleWorldHold();
      } else if (e.key === 'ArrowRight') {
        turnRing(STATE.activeRing, 0.08);
      } else if (e.key === 'ArrowLeft') {
        turnRing(STATE.activeRing, -0.08);
      } else if (e.key === 'Enter') {
        commitTransaction();
      } else if (e.key === 'z' || e.key === 'Z') {
        undoTransaction();
      }
    });

    // URL query support for headless verification screenshots (?stage=1..5, ?scene=forest|scan, ?bundt=1, ?blown=1)
    const params = new URLSearchParams(window.location.search);
    if (params.has('scene')) setSceneMode(params.get('scene'));
    if (params.has('stage')) setDonutStage(Number(params.get('stage')));
    if (params.get('bundt') === '1') {
      STATE.cake.bundt = 1.0;
      rebuildCakeGeometry();
    }
    if (params.get('blown') === '1') {
      STATE.cake.flames = 0.0;
      rebuildCakeGeometry();
    }
    if (params.get('doorway') === '1') {
      STATE.doorwayAlert = true;
    }

    updateReticleCanvas();
    syncDOM();
    requestAnimationFrame(renderFrame);
  }

  window.VESPER = {
    STATE,
    turnRing,
    setDonutStage,
    setSceneMode,
    captureRole,
    toggleHoldCaptured,
    toggleWorldHold,
    commitTransaction,
    undoTransaction,
    initUI
  };
})();
