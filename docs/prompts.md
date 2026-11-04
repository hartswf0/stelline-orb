# Prompts — Stelline Memory Orb (`SCION DIEGETIC` Case 02)

Copy-paste prompts for running the **SCION DIEGETIC** method: reconstructing a speculative apparatus from cinema or media history so that **the fiction becomes real and the real becomes fiction** — an unoccluded, bijective diegetic instrument capable of both reproducing every frame of the source footage and functioning as a practical authoring studio for designing any custom bug specimen or any bespoke birthday cake for anyone.

---

## 1. The Studio Instruction

Paste [`docs/scion-diegetic.md`](scion-diegetic.md) as the system prompt or at the top of a new conversation, then give the build prompt below.

---

## 2. The Refined Master Build Prompt ("Make the Fiction Real and the Real Fiction")

> Use this prompt with the source footage (`The_Memory_Maker_Blade_Runner_2049_[Open_Matte]_-_Natalizio_Films_(720p).mp4`) and physical prop reference photographs to build or refine the complete Stelline Memory Orb studio in one virtuous cycle.

```text
Run SCION DIEGETIC v2.0 on Dr. Ana Stelline's Memory Maker scene from Blade Runner 2049 (Open Matte 1280x720 footage, 00:00 to 05:00) and Adam Savage / Sinister Propz's physical CNC-machined Memory Orb prop.

Your goal is to make the fiction real and the real fiction: build a single-page interactive artifact (`stelline-memory-orb.html` + `assets/stelline-3d-engine.js`) that is inseparable from a speculative instrument from the film come to life, and that possesses real practical utility for designing any bug specimen or any birthday cake for anyone.

Execute the virtuous cycle in seven strict stages:

1. OPEN MATTE TEMPORAL CORPUS & MULTI-FRAME SEQUENCING
- Extract 1280x720 (16:9 Open Matte) reference plates at 1fps across the full 5-minute clip (`sec_001.jpg` .. `sec_300.jpg`), preserving the full uncropped top-and-bottom optical frame without vertical stretch (`aspect: 1.7778`).
- Identify and wire multi-frame temporal progressions for all 12 canonical shots so time and animation matter:
  * Act I (Forest & Beetle): `00:15` Canopy (`sec_016..022`), `00:25` Wet Leaf & Walking Scarab (`sec_025..028`), `00:32` Compound Bug Eye Macro (`sec_031..035`), `00:50` Dome Voxel Dissolve (`sec_036..052`).
  * Act II (Birthday Party): `02:17` Cake Spawn & Smarties (`sec_138..141`), `02:23` 11-Flute Scalloped Bundt Counterfactual Morph (`sec_142..144`), `02:26` Red Icing Calligraphy `生日快樂` (`sec_146..148`), `02:33` Child Cutouts Staging (`sec_153..157`), `02:56` Candle Exhale & Plume (`sec_173..182`), `03:16` 0.08x Floor Miniature (`sec_196`).
  * Act III & IV: `04:42` Carved Wooden Horse `[6·10·21]` (`sec_282`) and `04:55` Snow Dome (`sec_295`).

2. SAM SEMANTIC SEGMENTATION & DPT-MIDAS 3D RELIEF
- Segment all 12 shots using Segment Anything (SAM) into 4 addressable semantic object masks (`assets/sam_{shot}.png` RGBA) with 64-vertex boundary contours and bounding boxes (`assets/stelline-sam-data.js`).
- Generate DPT-Hybrid-MiDaS monocular depth + Sobel surface-normal maps (`assets/depth_{shot}.png`) to displace 200x140 subdivision relief meshes in WebGL.
- Combine 2D multi-frame footage, 2.5D depth-displaced relief, SAM per-part shaders, and true 3D procedural geometries (hexagonal ommatidia domes, 104 tapered setae bristles, articulated 6-leg scarab, 11-flute Bundt morph target, 24 Smarties, flickering 3200K candle wicks, golden hexagonal table, and carved horse) with 4 live compositor modes (`FULL COMPOSITE`, `2D+3D WEAVE`, `SAM SEGMENTS`, `SOLO PART`).

3. BIJECTIVE OPERATIVE SURFACE (PER-PART 5-DIAL VECTORS + INVERSE BOOTSTRAP)
- Build the physical 1.42 kg CNC aluminum Memory Orb below the holographic dome: 5 concentric ball-detented coaxial rings (`L1, L2, L3, R1, R2`), central 12-rib brass rack-and-pinion calliope accordion, Left Control Pod (`SELECT`, 4-way `D-PAD`, `X-RAY`, `ZERO`), and Right Control Pod (`WEAVE`, `OTHERWISE`, `READER`, Red `IMPRINT` button).
- Store an independent 5-dial state vector `[L1, L2, L3, R1, R2]` and 2D+3D spatial offset `(dx, dy, visible)` for every SAM-segmented part in every shot (including individual children at the party and individual ocular domes on the beetle).
- Render Territory Studio's diegetic in-world HUD inside the hologram:
  * Left-Arc `[ □ ]` SAM sub-object node stack with dashed leader lines and toggleable 64-vertex SAM polygon contours.
  * Right-side 5-Sector Translucent White C-Arc (`arch`) anchored to the selected SAM object, where each sector dynamically graphs the live fill (`0..100%`) of Coaxial Rings `L1..R2` for that specific part.
  * Ocular vernier focus reticles that track `(dxU, dxV)` and `(snU, snV)` as the beetle turns its head (`headShift`).
- Wire full Inverse Bootstrapping: turning any Orb ring updates the selected SAM part and C-Arc; clicking or dragging any C-Arc sector or 3D scene feature back-drives the physical Orb rings with spring-mass-damper rotor inertia.

4. ACOUSTIC INTEGRITY (ZERO CONTINUOUS DRONES)
- Strictly forbid continuous OscillatorNode drones, hums, or ambient synth pads.
- Generate only ultra-short (`3ms–5ms`), rate-limited (`>55ms`) filtered pink/white noise mechanical micro-transients when a ring crosses a ball detent (`1850Hz–2490Hz`), a micro-switch clicks, or the brass rack-and-pinion slides.

5. ULTRA-CLEAN DIEGETIC UI (ZERO WEB-CHROME CLUTTER)
- Never cover the holographic projection dome with rows of HTML pill buttons.
- Keep the default viewport 100% pure speculative artifact: only the unoccluded 16:9 holographic dome above (with its in-world C-Arc, Left-Arc `[ □ ]` selector, and hairline optical timecode stepper) and the physical Memory Orb below.
- Collapse all lab navigation, shot jumping, protocol steps, and version links into a whisper-quiet corner micro-latch (`[ STELLINE.OS // LAB DRAWER ]`, toggled via click or `Tab`).

6. REAL PRACTICAL UTILITY: BESPOKE BUG BUILDER & BIRTHDAY CAKE BUILDER FOR ANYONE
- Make the instrument genuinely useful for designing any bug or any birthday cake for anyone via the physical Red `IMPRINT` button or `[ BUILD BUG / CAKE ]` studio drawer:
  * `PATISSERIE.OS` (Birthday Cake Builder for Anyone): Allow typing any recipient's name or custom message (rendered live in 3D perspective-projected piped icing calligraphy directly on the cake crown alongside or replacing `生日快樂`), choosing `1..12` lit candles, morphing sponge topology (`0.0` Cylinder <-> `0.5` Rose-Crown <-> `1.0` 11-Flute Bundt), selecting glaze palette (`Vanilla Buttercream`, `Dark Chocolate Ganache`, `Rose-Berry`, `Matcha Emerald`, `Aureate Gold`), toggling `24 Smarties`, and blowing out the candles.
  * `ENTOMOLOGY.OS` (Bug Specimen Builder): Allow customizing binomial species taxonomy, ommatidia hex density (`32..320_HEX`), corneal dome boost, sensory setae bristle count (`0..360`), mandible/gait articulation, and thin-film chitin structural wavelength (`420nm` Violet-Cyan <-> `520nm` Emerald <-> `585nm` Gold Scarab <-> `630nm` Ruby).
  * Practical Export (`IMPRINT MEMORY BEARING`): One-click download of a high-resolution `1280x880` Archival Memory Card / Entomological Holotype Plate (`.png`) combining the live 3D hologram, custom piped inscription or species taxonomy, 5-ring calibration vector, and Wallace Archive stamp, plus a shareable live URL (`?proto=cake&insc=...`) that anyone can open to view and blow out their custom cake.

7. BLIND DUAL-CRITIC LOOP
- Verify with headless GPU screenshots across shots, compositor modes, and custom builds. Audit with both the Blind Visual Frame Critic and the Operative Surface Critic until zero regressions remain.
```

---

## 3. The Blind Dual-Critic Verification Prompt

> Paste this to a separate, independent agent with no access to the builder's justifications, providing only the ground-truth film frames (`sec_*.jpg`) and live screenshots of the running artifact.

```text
You are the Independent Dual-Critic for SCION DIEGETIC Case 02 (The Stelline Memory Orb).
You operate in two capacities without relying on the creator's claims:

CRITIC A — BLIND VISUAL & TEMPORAL FRAME CRITIC:
Compare the live rendered screenshots against the ground-truth 1280x720 Open Matte film frames (`sec_025..028`, `sec_031..035`, `sec_138..141`, `sec_142..144`, `sec_146..148`, `sec_153..157`, `sec_173..182`, `sec_282`).
Check and score:
1. Aspect Ratio & Framing: Is the 16:9 Open Matte frame preserved edge-to-edge without vertical stretching or side-clipping?
2. Temporal Animation & Multi-Frame Progression: Does turning the rings advance smoothly across multi-frame sequences (e.g., right eye sharp -> left eye racks into focus -> head shifts left in `bugeye`; cylinder -> 11-flute scalloped Bundt with 2 candles in `bundtmorph`; stroke-by-stroke red `生日快樂` in `redicing`; 3 -> 4 -> 6 party children in `cutouts`)?
3. Spatial Registration: Are the ocular vernier reticles locked precisely onto the beetle's compound eyes even as the head turns? Are the child head-arcs positioned cleanly above the children's heads?
4. Diegetic Purity: Is the holographic viewport free of non-diegetic web-button walls occluding the image?

CRITIC B — OPERATIVE SURFACE & PRACTICAL UTILITY CRITIC:
Test the causal link between the physical Orb and the hologram:
1. Could every operation visible in the film have been performed using this Orb interface?
2. Is every SAM-segmented part in the scene (including individual children at the party and individual ocular domes) independently selectable and addressable by all 5 coaxial rings (`L1..R2`) and the Left Pod D-Pad?
3. Does the 5-sector White C-Arc (`arch`) accurately graph the 5 dial values of the currently selected part?
4. Can a user practically design a brand-new custom bug or a bespoke birthday cake for a real person (with custom piped name on the cake, custom candle count, custom glaze/topology) and export a working `.png` card or shareable URL?

Report every discrepancy as a blocking defect until both critics pass.
```

---

## 4. The Practical Utility & Counterfactual Prompt ("Imagine Each Could Be Otherwise")

> Use this prompt to add or expand counterfactual protocols and real-world authoring utility on any diegetic instrument.

```text
Extend the diegetic instrument so that it does not merely replay canonical film states, but operationalizes counterfactual design ("imagine each element could be otherwise") and real-world practical utility:

1. Identify the moment of design hesitation in the source artifact (such as Dr. Ana Stelline testing and rejecting the 11-flute scalloped Bundt cake at 02:23 before reverting to the flat cylinder).
2. Formalize two complete Operator Protocols:
   - `PROTOCOL I // ENTOMOLOGY.OS (Bug Designer)`: Parameterize hex ommatidia density (`32..320_HEX`), corneal dome curvature, setae bristle growth (`0..360`), mandible/tripod gait, and chitin thin-film interference (`420nm..640nm`), with counterfactual presets (`SCARAB.AURUM 585nm`, `OBSIDIAN.VOID 455nm`, `HETEROCERA.SPLIT`).
   - `PROTOCOL II // PATISSERIE.OS (Birthday Cake Designer)`: Parameterize sponge topology (`Cylinder <-> Crown <-> 11-Flute Bundt`), candle array (`1..12 wicks`), glaze flavor palette (`Vanilla / Dark Ganache / Rose-Berry / Matcha / Gold`), confectionery Smarties, per-child party lighting, and live 3D perspective-projected piped icing calligraphy.
3. Add a diegetic Customizer & Imprint Studio (`BUILD FOR ANYONE`) triggered from the Orb's Red `IMPRINT` button so a user can type anyone's name onto the birthday cake (or name any new insect species), blow out the candles, copy a live shareable URL (`?proto=cake&insc=...`), or imprint a downloadable `1280x880` Archival Memory Card (`.png`).
```

---

## 5. Version Remix Prompts

| Version | File | Focus & Remix Prompt |
| :--- | :--- | :--- |
| **V4 (Master)** | [`stelline-memory-orb.html`](../stelline-memory-orb.html) | **Full SAM + DPT-MiDaS + 2D/3D Compositor & Practical Bug/Cake Studio.** Combines 12-shot Open Matte multi-frame plates, 4-channel SAM masks, 200x140 MiDaS depth relief, 3D rigs, clean diegetic HUD, and custom `.png` / URL imprint export. |
| **Mobile** | [`mobile.html`](../mobile.html) | **Portrait Thumb-Ergonomic Edition.** `48vh` holographic dome + `52vh` bimanual thumb dock with 1..4 SAM part pills, `L1..R2` precision sliders, `OTHERWISE [O]`, `COMP [C]`, and `BUILD / IMPRINT`. |
| **V3** | [`stelline-v3-hybrid3d.html`](../stelline-v3-hybrid3d.html) | **Hybrid 3D + Multi-Frame Film Plates.** Emphasizes simultaneous 3D procedural meshes layered over multi-frame Open Matte plates. |
| **V2** | [`stelline-v2-3dsculptor.html`](../stelline-v2-3dsculptor.html) | **Pure 3D Procedural Sculptor.** Evaluates what the Orb can sculpt using pure procedural Three.js geometry and custom GLSL shaders alone (`renderMode = 'zero'`). |
| **V1** | [`stelline-v1-canvas.html`](../stelline-v1-canvas.html) | **Original 2D/3D Canvas Hardware Lab.** Preserves the foundational 8-layer mechanical Orb physics and Wallace Archive Bearing Reader. |
