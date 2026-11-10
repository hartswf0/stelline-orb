#!/usr/bin/env python3
"""Build the Master 217-Item Cinematographic Video Families Atlas across the entire
Stelline Orb repository (`78 BDAY TRAINING` items + `139 assets/**/*.mp4` videos = 217 items).

Groups every video across 6 orthogonal Cinematographic & Production Family axes:
  1. `angle_family`  — 8 Camera Angle & Elevation Families (with 3D Cake Rig lens presets)
  2. `cut_family`    — 8 Cut & Edit Structure Families (hard cuts, montages, multi-act, morphs, rewinds, counterfactuals)
  3. `motion_family` — 5 Camera Motion Families (locked, dolly push-in, handheld rack, turntable orbit, multi-angle)
  4. `scale_family`  — 6 Shot Scale Progression Families (ECU/CU macro, MCU hero, MFS tableau, wide-to-close, EWS dome, multi-scale)
  5. `layout_family` — 7 Frame & UI Layout Families (5-ring barrel HUD, museum screenless 5-ring, clean cinema, side ')' reticle,
                       split stage+pad, depth/isolated conditioning pass, 9x3 grid)
  6. `source_family` — 8 Video Type & Lineage Families (Bday Weaver Corpus, 6-Way Moment Decompositions, Canonical BR2049 Shots,
                       Counterfactual Designs, Director & Museum Orb Films, Flow/Controller Stacks, Gemini Omni 1.2 Refs,
                       Generative Benchmarks & Mist)

Outputs:
  - `assets/video-families/thumbs/*.webp`
  - `assets/video-families/subshots/*_shots.webp`
  - `assets/video-families/catalog.json`
  - `assets/video-families/catalog.js` (`window.VIDEO_FAMILIES_CATALOG`)
"""
import os, glob, json, time
import numpy as np
import cv2
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BDAY_DS_PATH = os.path.join(ROOT, "assets", "bday-training", "dataset.json")
MOMENTS_CAT_PATH = os.path.join(ROOT, "assets", "moments", "catalog.json")
OUT_DIR = os.path.join(ROOT, "assets", "video-families")
THUMBS_DIR = os.path.join(OUT_DIR, "thumbs")
SUBSHOTS_DIR = os.path.join(OUT_DIR, "subshots")
os.makedirs(THUMBS_DIR, exist_ok=True)
os.makedirs(SUBSHOTS_DIR, exist_ok=True)

FAMILY_TAXONOMY = {
    "angle_families": {
        "INTIMATE_CANDLE_FACE_CU": {
            "code": "ANG-01",
            "title": "Intimate Candlelit Face CU",
            "spec": "0°–8° Eye-Level · 85mm f/1.6",
            "desc": "Shallow-DOF portrait across burning wicks; warm 3200K upward bounce on 1–2 faces and breath blow-out.",
            "rig_preset": {"label": "CANDLE FACE CU · 4° · 85MM f/1.6", "p": [0.04, 0.85, 0.54], "yaw": 0.07, "pitch": -0.05, "f": 85, "N": 1.6, "fd": 0.54},
        },
        "HERO_PEDESTAL_3Q_25DEG": {
            "code": "ANG-02",
            "title": "Hero Pedestal 3/4 View",
            "spec": "18°–35° Three-Quarter · 50mm f/2.8",
            "desc": "Balanced studio/chamber 3/4 elevation showing cake silhouette, side relief, ganache drips, and candle crown together.",
            "rig_preset": {"label": "HERO 3/4 · 24° · 50MM", "p": [0.34, 0.99, 0.58], "yaw": 0.53, "pitch": -0.34, "f": 50, "N": 2.8, "fd": 0.68},
        },
        "TABLE_TABLEAU_EYE_10DEG": {
            "code": "ANG-03",
            "title": "Across-Table Party Tableau",
            "spec": "6°–15° Seated Ensemble · 40mm f/2.4",
            "desc": "Medium-wide seated chamber framing with 3–7 party guests arranged in a half-ring behind the candlelit table.",
            "rig_preset": {"label": "PARTY TABLEAU · 9° · 40MM", "p": [0.0, 0.92, 0.88], "yaw": 0.0, "pitch": -0.13, "f": 40, "N": 2.4, "fd": 0.88},
        },
        "CHAMBER_FLOATING_TILT_10DEG": {
            "code": "ANG-04",
            "title": "Low Chamber Floating & 25° Tilt",
            "spec": "5°–16° Kneeling POV · 35mm f/2.0",
            "desc": "Canonical Shot 25/26 low chamber angle where the holographic cake hovers and tilts 20°–25° toward the operator.",
            "rig_preset": {"label": "CHAMBER TILT · 10° · 35MM", "p": [-0.14, 0.84, 0.56], "yaw": -0.24, "pitch": -0.10, "f": 35, "N": 2.0, "fd": 0.58},
        },
        "HIGH_CROWN_WRITING_45DEG": {
            "code": "ANG-05",
            "title": "High-Angle Crown Calligraphy",
            "spec": "38°–58° Overhead-Front · 50mm f/4.0",
            "desc": "Elevated crown framing over shoulder or pad exposing top-plane icing calligraphy (生日快樂) and concentric wick rings.",
            "rig_preset": {"label": "CROWN WRITING · 46° · 50MM", "p": [0.02, 1.18, 0.42], "yaw": 0.04, "pitch": -0.78, "f": 50, "N": 4.0, "fd": 0.56},
        },
        "ARTISAN_BENCH_HANDS_30DEG": {
            "code": "ANG-06",
            "title": "Artisan Bench & Hands-on-Orb POV",
            "spec": "20°–35° First-Person Craft · 45mm f/3.2",
            "desc": "Close tabletop craft perspective with baker hands/spatulas or operator fingers turning physical orb rings.",
            "rig_preset": {"label": "BENCH CRAFT · 28° · 45MM", "p": [0.18, 1.04, 0.52], "yaw": 0.33, "pitch": -0.44, "f": 45, "N": 3.2, "fd": 0.58},
        },
        "WIDE_ARCHITECTURAL_DOME": {
            "code": "ANG-07",
            "title": "Wide Architectural Dome & Silhouette",
            "spec": "2°–12° Wide Chamber · 24mm f/4.0",
            "desc": "Establishing wide shots of the dark containment dome, pale horizon light ring, and K's silhouette at the glass arch.",
            "rig_preset": {"label": "WIDE DOME · 6° · 24MM", "p": [0.0, 1.08, 1.85], "yaw": 0.0, "pitch": -0.09, "f": 24, "N": 4.0, "fd": 1.85},
        },
        "MACRO_SPECIMEN_ECU": {
            "code": "ANG-08",
            "title": "Extreme Macro Specimen & OLED ECU",
            "spec": "15°–30° Macro Optical · 100mm f/2.0",
            "desc": "Razor-thin focal plane macro studies: Carabus beetle compound eyes on wet leaf and micro-OLED instrument readouts.",
            "rig_preset": {"label": "MACRO ECU · 22° · 100MM f/2.0", "p": [0.08, 0.91, 0.34], "yaw": 0.22, "pitch": -0.32, "f": 100, "N": 2.0, "fd": 0.35},
        },
    },
    "cut_families": {
        "SINGLE_CONTINUOUS_TAKE": {
            "code": "CUT-01",
            "title": "Single Continuous Take",
            "spec": "0 Hard Cuts · Unbroken Flow",
            "desc": "One continuous temporal shot with zero camera switches, holding steady through lighting or performance beats.",
        },
        "STAGE_MORPH_DETENT_SWAP": {
            "code": "CUT-02",
            "title": "Stage Morph & Ring-Detent Swap",
            "spec": "0 Camera Cuts · Discrete Object States",
            "desc": "Camera stays continuous while the cake undergoes detented frosting colors, Bundt flutes, tier extrusions, or tilt snaps.",
        },
        "MULTI_SHOT_MONTAGE": {
            "code": "CUT-03",
            "title": "Multi-Shot Coverage Montage",
            "spec": "2–9 Hard Scene Cuts",
            "desc": "Edited montage or supercut cutting across distinct camera angles and shot scales (e.g. Moments 07->25->26->27->29->36->39->44->46).",
        },
        "MULTI_ACT_DIRECTED_FILM": {
            "code": "CUT-04",
            "title": "Multi-Act Directed Sequence Film",
            "spec": "20s–118s · Choreographed Acts",
            "desc": "Long-form multi-beat director films, Museum screenless suites, guided Weaver sessions, and master BR2049 scene flows.",
        },
        "AB_COUNTERFACTUAL_PLATE": {
            "code": "CUT-05",
            "title": "Pixel-Remade Counterfactual Plate",
            "spec": "1.4s–1.6s Frame-Locked Intervention",
            "desc": "Exact 1.5s film windows with pixel-level counterfactual edits: swapped eye focus, re-set calligraphy glyphs, or extinguished wicks.",
        },
        "HOLOGRAM_GHOST_MATERIALIZE": {
            "code": "CUT-06",
            "title": "Hologram & Ghost Materialization",
            "spec": "Empty Void -> Translucent -> Solid",
            "desc": "Empty chamber, mist, or wireframe grid progressively materializing into translucent ghosts and solid candlelit figures.",
        },
        "TEMPORAL_REWIND_REVERSE": {
            "code": "CUT-07",
            "title": "Temporal Rewind & Reverse Scrub",
            "spec": "Negative Local Clock (r < 0)",
            "desc": "Smoke wisps and breath particles condense backward into relighting wicks as expressions scrub in reverse time.",
        },
        "BENCHMARK_TRIPTYCH_PLATE": {
            "code": "CUT-08",
            "title": "9×3 Ground-Truth Segmentation Plate",
            "spec": "9 Shots × 3 Decomposition Columns",
            "desc": "Multi-row diagnostic reference plate pairing Close-Up (No Orb), Full Clean Chamber, and Isolated RGBA Subject.",
        },
    },
    "motion_families": {
        "LOCKED_STATIC": {
            "code": "MOT-01",
            "title": "Locked Static Plate",
            "spec": "Fixed Tripod / Virtual Lens",
            "desc": "Zero camera translation or pan; all motion belongs strictly to flames, icing, ghosts, or hands inside the frame.",
        },
        "DOLLY_PUSH_IN": {
            "code": "MOT-02",
            "title": "Dolly Push-In / Focal Creep",
            "spec": "Scale Growth >= 1.24×",
            "desc": "Slow, deliberate forward camera push toward the birthday cake or child's candlelit face.",
        },
        "HANDHELD_DRIFT_RACK": {
            "code": "MOT-03",
            "title": "Handheld Breathing & Focus Rack",
            "spec": "Anamorphic Drift + DOF Pull",
            "desc": "Subtle organic handheld float paired with shallow depth-of-field focus pulls (beetle eyes, face-to-wick).",
        },
        "TURNTABLE_ORBIT": {
            "code": "MOT-04",
            "title": "Turntable & Orbital Sweep",
            "spec": "360° Subject / Camera Orbit",
            "desc": "Continuous rotational inspection around the vertical cake axis while lighting or piping updates live.",
        },
        "MULTI_ANGLE_CUTS": {
            "code": "MOT-05",
            "title": "Multi-Angle Cut Progression",
            "spec": "Switches Lens Placement Across Cuts",
            "desc": "Combines wide establishing plates, medium craft shots, and close-ups across hard editorial cuts.",
        },
    },
    "scale_families": {
        "TIGHT_CLOSE_UP_MACRO": {
            "code": "SCL-01",
            "title": "Tight Close-Up & Macro (CU / ECU)",
            "spec": "85mm–100mm · Face / Crown / Eye",
            "desc": "Intimate candlelit faces, top-plane calligraphy strokes, beetle ommatidia, and micro-OLED readouts.",
        },
        "MEDIUM_CLOSE_HERO": {
            "code": "SCL-02",
            "title": "Medium-Close Object Hero (MCU)",
            "spec": "45mm–50mm · Single Pedestal Subject",
            "desc": "Single birthday cake or handheld orb fills the active central frame with clear silhouette and crown detail.",
        },
        "MEDIUM_FULL_TABLEAU": {
            "code": "SCL-03",
            "title": "Medium-Full Party Tableau (MFS / MS)",
            "spec": "35mm–40mm · Table + Seated Cast",
            "desc": "Full tabletop plus 3–7 seated children or party guests lit by the central cake.",
        },
        "WIDE_TO_CLOSE_PUSH": {
            "code": "SCL-04",
            "title": "Wide-to-Close Push Progression",
            "spec": "MS -> MCU / CU Push",
            "desc": "Starts in medium/wide chamber framing and pushes steadily into close hero inspection.",
        },
        "EXTREME_WIDE_DOME": {
            "code": "SCL-05",
            "title": "Extreme Wide Chamber & Arch (EWS / WS)",
            "spec": "24mm · Full Dome Architecture",
            "desc": "Full containment room scale where the lit table is a warm island in deep architectural darkness.",
        },
        "MULTI_SCALE_COVERAGE": {
            "code": "SCL-06",
            "title": "Multi-Scale Scene Coverage",
            "spec": "WS + MS + MCU + CU",
            "desc": "Multi-shot sequences stepping across establishing wides, medium craft shots, and intimate close-ups.",
        },
    },
    "layout_families": {
        "WEAVER_5RING_BARREL_HUD": {
            "code": "LAY-01",
            "title": "Weaver 5-Ring Barrel + OLED Strip",
            "spec": "Top ~64% World + Angled OLED + 5-Ring Barrel",
            "desc": "Composite screen with dark chamber above and the 5-ring silver barrel + angled OLED/waveform panel below.",
        },
        "MUSEUM_SCREENLESS_5RING": {
            "code": "LAY-02",
            "title": "Museum Screenless 5-Ring Barrel (Zero Text)",
            "spec": "Top 75% World + Pure Brushed 5-Ring Barrel",
            "desc": "Gallery-grade screenless 5-ring Memory Orb below (OLED & struts removed, zero text anywhere) with grounded stage above.",
        },
        "CLEAN_CINEMA_ORB_FREE": {
            "code": "LAY-03",
            "title": "Clean Orb-Free Cinema / 3D Stage",
            "spec": "100% World · Zero UI / Zero Hardware",
            "desc": "Pure full-frame cinema shots and grounded 3D stages with zero controller or reticle chrome—ready for R2V/I2V & stacking.",
        },
        "CINEMA_WITH_RETICLE_ARC": {
            "code": "LAY-04",
            "title": "Cinema Frame + Side ')' Crescent Reticle",
            "spec": "World + Film-Accurate ')' Arc Beside Cake",
            "desc": "Full-frame world shot accompanied by the pale smoked-glass ')' crescent curving concave-toward-cake on the right.",
        },
        "DECOMP_DEPTH_ISOLATED_PASS": {
            "code": "LAY-05",
            "title": "Isolated Subject / Depth+Edge Conditioning",
            "spec": "RGBA Matte on Black · MiDaS Depth + Canny Edge",
            "desc": "ControlNet / Video2Game structural conditioning passes: isolated segmented foregrounds, depth+edge maps, and 24k mist clouds.",
        },
        "SPLIT_STAGE_PAD_CONSOLE": {
            "code": "LAY-06",
            "title": "Stacked Stage + Pad / Timeline Console",
            "spec": "Dual-Surface Interactive Rig (960×984 / 1280×864)",
            "desc": "Tall composite pairing the live 3D chamber viewport on top with Stage Pad, scene graph, or inferred orb timeline below.",
        },
        "CHAMBER_MINIMAL_DOTBAR": {
            "code": "LAY-07",
            "title": "Open-Matte + Minimal Transport Bar / 9×3 Grid",
            "spec": "Top 87% Scene + Translucent Strip or 9×3 Plate",
            "desc": "Open-matte chamber studies with a thin translucent bottom playback bar (`y_split`) plus the 9×3 ground-truth sheet.",
        },
    },
    "source_families": {
        "BDAY_WEAVER_CORPUS": {
            "code": "SRC-01",
            "title": "Birthday Training Corpus (`BDAY TRAINING/`)",
            "spec": "78 Segmented & Labeled Items",
            "desc": "Multi-era birthday cakes, calligraphy piping, tabletop baker hands, temporal rewinds, and Weaver 5-ring renders.",
        },
        "MOMENTS_6WAY_DECOMP": {
            "code": "SRC-02",
            "title": "6-Way Aligned Moment Decompositions (`moments_videos/`)",
            "spec": "60 Multi-Modal Clips (9 Moments × 6 Passes + 7 Supercuts)",
            "desc": "Synchronized per-moment Close-Up, Clean Chamber, Isolated Mask, Depth+Edge Conditioning, Best3D Stage, and Stelline3D passes.",
        },
        "FILM_CANON_MOMENTS": {
            "code": "SRC-03",
            "title": "Canonical BR2049 Film Moments (`moments/shot*`)",
            "spec": "18 Shots + Master 64s Scene",
            "desc": "Exact shot-cut plates from The Memory Maker (Shots 05–47) plus the master 64s Memory Maker sequence.",
        },
        "COUNTERFACTUAL_DESIGNS": {
            "code": "SRC-04",
            "title": "Pixel-Remade Counterfactual Designs (`moments/design_*`)",
            "spec": "14 Blind-Critic Plates",
            "desc": "Pixel interventions on Shot 07 (eyes), Shot 27 (writing & flames), Shot 29, Shot 36, and Shot 44.",
        },
        "DIRECTOR_ENGINE_FILMS": {
            "code": "SRC-05",
            "title": "Director & Museum Orb Film Suites (`orbfilm/`, `clips/`)",
            "spec": "14 Engine Films & Archive Reels",
            "desc": "8 grounded Orb Film batches (Museum No-Screen, No-Text, ')' Side Reticle, Stage-Only), Cineosis Tizita, and Stelline reels.",
        },
        "FLOW_CONTROLLER_STACKS": {
            "code": "SRC-06",
            "title": "Flow & Stacked Controller Demos (`flow/`, `weaver/`, `demo/`)",
            "spec": "10 Interactive Captures",
            "desc": "Synchronized controller-under-world stacks, Weaver guided sessions, Stage+Pad builds, and Arcs plate demos.",
        },
        "OMNI_1_2_REFS": {
            "code": "SRC-07",
            "title": "Gemini Omni 1.2 Reference Pack (`omni/refs/`)",
            "spec": "8 UI-Lock & Motion Refs",
            "desc": "Museum No-Screen & 5-Ring UI-lock strips plus orb-free world motion clips driving the 10-language Omni birthday pack.",
        },
        "GEN_MODELS_AND_MIST": {
            "code": "SRC-08",
            "title": "Generative Benchmarks & Volumetric Mist",
            "spec": "14 Clips (`generated/`, `units/`, `versions/`, `mist/`)",
            "desc": "MiniMax H3 Max, Kling 2.1, Veo 3.1 R2V, Vidu R2V multi-reference units, version comparisons, and Mist layer plates.",
        },
    },
}

CURATED_ASSETS = {
    "assets/stelline-orb-film.mp4": {
        "title": "Stelline Orb Director Film (Master 8-Act Cut)",
        "notes": "Master 34.1s 1280×720 real-time engine film: cast sponge -> 12-flute Bundt -> glaze -> 生日快樂 piping -> 7 candles -> held children multi-clock.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/orbfilm/orb-film-museum-no-screen.mp4": {
        "title": "Museum Batch A · Screenless 5-Ring Orb · No Reticle · Zero Text",
        "notes": "Gallery-grade screenless 5-ring brushed metal barrel below + heroic grounded 4-cake build, 3 warmly lit children, blow-out, and mist weave above.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "MUSEUM_SCREENLESS_5RING", "era": "2049_chamber",
    },
    "assets/orbfilm/orb-film-museum-side-reticle.mp4": {
        "title": "Museum Batch A · Screenless 5-Ring Orb + Side ')' Reticle",
        "notes": "Top OLED screen & struts removed; refined 5-ring barrel below, grounded walnut table, zero text, and film-accurate ')' crescent beside cake.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "MUSEUM_SCREENLESS_5RING", "era": "2049_chamber",
    },
    "assets/orbfilm/orb-film-no-text.mp4": {
        "title": "Zero-Text Batch B · Graphical Wave Panel · No Reticle",
        "notes": "Zero text characters anywhere on stage or controller (pure harmonic wave telemetry panel) + grounded 4-cake evolution and 3 children.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/orbfilm/orb-film-no-text-side-reticle.mp4": {
        "title": "Zero-Text Batch B · Graphical Wave Panel + Side ')' Reticle",
        "notes": "Non-verbal waveform OLED + 5-ring barrel below, zero text in stage, grounded walnut table, and ')' side crescent reticle.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/orbfilm/orb-film-no-reticle.mp4": {
        "title": "Grounded Batch C · Orb Film · Reticle Removed",
        "notes": "Grounded director film with wrapping arcs, numbered lists, and cake circles removed; HUD caption and 5-ring barrel stay.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/orbfilm/orb-film-reticle-aside.mp4": {
        "title": "Grounded Batch C · Orb Film · Side ')' Crescent Reticle",
        "notes": "Grounded director film with porcelain stand shadow and smoked-glass ')' crescent curving concave-toward-cake on the right.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/orbfilm/orb-film-stage-grounded.mp4": {
        "title": "Grounded Batch C · Stage-Only (Zero Hardware · No Reticle)",
        "notes": "100% full-frame grounded 3D stage with zero controller hardware and zero text — clean plate ready for R2V style transfer or controller stacking.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/orbfilm/orb-film-stage-side-reticle.mp4": {
        "title": "Grounded Batch C · Stage-Only + Side ')' Reticle (Zero Hardware)",
        "notes": "100% full-frame grounded 3D stage with the film-accurate ')' side crescent and zero bottom hardware.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "CINEMA_WITH_RETICLE_ARC", "era": "2049_chamber",
    },
    "assets/clips/cineosis_tizita_film.mp4": {
        "title": "Cineosis-Orb × Tizita Multiplane Birthday Film",
        "notes": "19.8s multiplane cutout chamber sequence blending segmented party standees, live OLED viewfinder, and Tizita memory atmosphere.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "TABLE_TABLEAU_EYE_10DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "DOLLY_PUSH_IN",
        "scale_family": "WIDE_TO_CLOSE_PUSH", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/clips/stelline_birthday_craft.mp4": {
        "title": "Stelline Archive · Birthday Memory Craft Reel",
        "notes": "94.5s reference study of Dr. Ana Stelline crafting the birthday cake, piping calligraphy, fading in children, and sculpting candlelight.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "CHAMBER_FLOATING_TILT_10DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/clips/stelline_how_memories_work.mp4": {
        "title": "Stelline Archive · How Memories Work Dialogue Scene",
        "notes": "67.5s multi-shot chamber sequence intercutting Ana Stelline in the glass dome with Officer K discussing authentic vs crafted memory detail.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "WIDE_ARCHITECTURAL_DOME",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/clips/stelline_oled_reel.mp4": {
        "title": "Stelline OLED Viewfinder Loop Reel",
        "notes": "118s compact 420×236 diegetic micro-display reel streamed inside the angled glass OLED viewfinder of Cineosis-Orb and Field Orb.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "MACRO_SPECIMEN_ECU",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/clips/stelline_walk_to_work.mp4": {
        "title": "Stelline Laboratories · Walk Into the Containment Dome",
        "notes": "36.0s architectural approach into Stelline Laboratories establishing the cylindrical glass partition and forest/chamber atmosphere.",
        "source_family": "DIRECTOR_ENGINE_FILMS", "angle_family": "WIDE_ARCHITECTURAL_DOME",
        "cut_family": "MULTI_SHOT_MONTAGE", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "EXTREME_WIDE_DOME", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/maker/memory-maker.mp4": {
        "title": "The Memory Maker · Master Reference Scene (64s)",
        "notes": "High-bitrate 1280×720 master capture of the Memory Maker sequence uniting hands-on-orb shots, reticle arcs, cake sculpting, and children.",
        "source_family": "FILM_CANON_MOMENTS", "angle_family": "ARTISAN_BENCH_HANDS_30DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "CINEMA_WITH_RETICLE_ARC", "era": "2049_chamber",
    },
    "assets/flow/original-flow.mp4": {
        "title": "Original Film Flow (02:17–02:50 Continuous Sequence)",
        "notes": "33.5s canonical BR2049 birthday crafting flow: cake summoned, icing swaps, 25° tilt, Bundt morph, 生日快樂 piping, children fade-in.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "CHAMBER_FLOATING_TILT_10DEG",
        "cut_family": "MULTI_SHOT_MONTAGE", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "CINEMA_WITH_RETICLE_ARC", "era": "2049_chamber",
    },
    "assets/flow/original-flow-controls.mp4": {
        "title": "Original Film Flow + Inferred Orb Controls Below",
        "notes": "960×800 stacked composite pairing the 33.5s original footage above with the live inferred ring & key timeline strip below.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "CHAMBER_FLOATING_TILT_10DEG",
        "cut_family": "MULTI_SHOT_MONTAGE", "motion_family": "MULTI_ANGLE_CUTS",
        "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": "SPLIT_STAGE_PAD_CONSOLE", "era": "2049_chamber",
    },
    "assets/flow/game-arcs-film-plate.mp4": {
        "title": "Game Flow · Diegetic Arcs on the Film Plate",
        "notes": "87.1s interactive capture driving diegetic cake arcs, stroke lettering, 25° tilt, retimed child hold, and flame blow-out over the film plate.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "CHAMBER_FLOATING_TILT_10DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "CINEMA_WITH_RETICLE_ARC", "era": "2049_chamber",
    },
    "assets/flow/game-forest-focus.mp4": {
        "title": "Game Flow · Forest Reveal & Focus Pull w/ Pad",
        "notes": "20.0s 960×984 stacked capture of the forest clearing depth reveal and optical focus rack with the interactive Pad visible below.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "MACRO_SPECIMEN_ECU",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "HANDHELD_DRIFT_RACK",
        "scale_family": "TIGHT_CLOSE_UP_MACRO", "layout_family": "SPLIT_STAGE_PAD_CONSOLE", "era": "2049_chamber",
    },
    "assets/flow/game-stage-pad.mp4": {
        "title": "Game Flow · Cake Built From Nothing on Stage + Pad",
        "notes": "72.8s 960×984 dual-screen capture building the birthday cake from an empty chamber via scene graph, pen calligraphy, DOF pull, and tilt.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "TURNTABLE_ORBIT",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "SPLIT_STAGE_PAD_CONSOLE", "era": "2049_chamber",
    },
    "assets/flow/game-tall-cake.mp4": {
        "title": "Game Flow · Two-Tier Tall 9-Candle Cake & Orbit",
        "notes": "82.4s 960×984 capture constructing a tall 2-step 9-candle cake with crown lettering and continuous orbital camera sweep.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "TURNTABLE_ORBIT",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "SPLIT_STAGE_PAD_CONSOLE", "era": "2049_chamber",
    },
    "assets/demo/arcs-demo.mp4": {
        "title": "Arcs UI Demo · Reticle & Ring Scrubbing",
        "notes": "87.1s demonstration of `arcs.html` driving cake variant swaps, calligraphy strokes, and flame extinction directly through diegetic arcs.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "CHAMBER_FLOATING_TILT_10DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "CINEMA_WITH_RETICLE_ARC", "era": "2049_chamber",
    },
    "assets/demo/stage-pad-demo.mp4": {
        "title": "Stage + Pad Paired Instrument Demo",
        "notes": "72.8s 960×984 paired demonstration of `stage.html` + `pad.html` sculpting geometry, piping top script, and pulling aperture focus.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "TURNTABLE_ORBIT",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "SPLIT_STAGE_PAD_CONSOLE", "era": "2049_chamber",
    },
    "assets/weaver/weaver-cake-film.mp4": {
        "title": "Weaver Engine · Full Chamber Cake & 24k Mist Film",
        "notes": "76.6s 1280×720 capture of `weaver.html` telescoping barrel rings building the cake, lighting 2D child standees, and dissolving to 24k mist.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "TURNTABLE_ORBIT",
        "scale_family": "WIDE_TO_CLOSE_PUSH", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/weaver/weaver-cake-guided.mp4": {
        "title": "Weaver Engine · Guided Step-by-Step Console Session",
        "notes": "76.6s 1280×864 tall capture showing guided prompts alongside the telescoping 5-ring Weaver instrument and physically-lit chamber table.",
        "source_family": "FLOW_CONTROLLER_STACKS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "MULTI_ACT_DIRECTED_FILM", "motion_family": "TURNTABLE_ORBIT",
        "scale_family": "WIDE_TO_CLOSE_PUSH", "layout_family": "SPLIT_STAGE_PAD_CONSOLE", "era": "2049_chamber",
    },
    # Omni 1.2 Refs
    "assets/omni/refs/u_museum-no-screen.mp4": {
        "title": "Omni Ref U0 · Museum Screenless 5-Ring UI Lock (Zero Text)",
        "notes": "UI-LOCK reference from the Museum No-Screen batch: screenless 5-ring brushed metal barrel below + grounded walnut table & zero text above.",
        "source_family": "OMNI_1_2_REFS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "MUSEUM_SCREENLESS_5RING", "era": "2049_chamber",
    },
    "assets/omni/refs/u_ui-strip-hud.mp4": {
        "title": "Omni Ref U1 · Locked 5-Ring UI Strip + Aside Reticle",
        "notes": "3.0s UI-LOCK reference for Gemini Omni Flash 1.2: top 62% dark world w/ pale crescent beside cake + locked bottom 38% 5-ring chrome barrel.",
        "source_family": "OMNI_1_2_REFS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/omni/refs/alt-no-reticle/u_ui-strip-hud.mp4": {
        "title": "Omni Ref U1-Alt · Locked 5-Ring UI Strip (No Reticle)",
        "notes": "3.0s alternate UI-LOCK reference with zero reticle in the world area and identical locked bottom 38% 5-ring silver barrel.",
        "source_family": "OMNI_1_2_REFS", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/omni/refs/v1_cake-appears.mp4": {
        "title": "Omni Ref V1 · World Motion: Cake Appears & Tilts",
        "notes": "3.0s orb-free motion reference: cake materializes out of darkness, flickers through icings, and tilts 25° toward the lens.",
        "source_family": "OMNI_1_2_REFS", "angle_family": "CHAMBER_FLOATING_TILT_10DEG",
        "cut_family": "STAGE_MORPH_DETENT_SWAP", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/omni/refs/v2_writing-upright.mp4": {
        "title": "Omni Ref V2 · World Motion: Red Piping & Upright Swing",
        "notes": "3.0s over-shoulder reference: red 生日快樂 icing pipes stroke-by-stroke across top plane before the cake swings upright beside the white arc.",
        "source_family": "OMNI_1_2_REFS", "angle_family": "HIGH_CROWN_WRITING_45DEG",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "HANDHELD_DRIFT_RACK",
        "scale_family": "TIGHT_CLOSE_UP_MACRO", "layout_family": "CINEMA_WITH_RETICLE_ARC", "era": "2049_chamber",
    },
    "assets/omni/refs/v3_children-fade.mp4": {
        "title": "Omni Ref V3 · World Motion: Children Ghost-Fade Around Table",
        "notes": "3.0s orb-free reference: empty table -> ghost-transparent silhouettes -> solid children seated in a half-ring lit by the cake.",
        "source_family": "OMNI_1_2_REFS", "angle_family": "TABLE_TABLEAU_EYE_10DEG",
        "cut_family": "HOLOGRAM_GHOST_MATERIALIZE", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_FULL_TABLEAU", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/omni/refs/v4_candle-on-face.mp4": {
        "title": "Omni Ref V4 · World Motion: Single Candle on Boy's Face",
        "notes": "2.5s shallow-DOF 85mm close-up reference: warm 3200K flame light flickering from below on a child's face against deep darkness.",
        "source_family": "OMNI_1_2_REFS", "angle_family": "INTIMATE_CANDLE_FACE_CU",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "HANDHELD_DRIFT_RACK",
        "scale_family": "TIGHT_CLOSE_UP_MACRO", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/omni/refs/v5_candles-out.mp4": {
        "title": "Omni Ref V5 · World Motion: Flames Extinguish & Light Leaves Face",
        "notes": "2.6s close-up blow-out reference: candles go out together, warm 3200K bounce drops off the birthday girl's face into cool dark room tone.",
        "source_family": "OMNI_1_2_REFS", "angle_family": "INTIMATE_CANDLE_FACE_CU",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "HANDHELD_DRIFT_RACK",
        "scale_family": "TIGHT_CLOSE_UP_MACRO", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    # Generative Runs, Multi-Ref Units, Versions & Mist
    "assets/generated/h3max-weaver-ux.mp4": {
        "title": "MiniMax H3 Max · 1080p Cake Built w/ Controller in Frame",
        "notes": "10.1s 1920×1080 text-to-video generation where a cake builds from nothing while the 5-ring controller and OLED panel remain in frame.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "STAGE_MORPH_DETENT_SWAP", "motion_family": "DOLLY_PUSH_IN",
        "scale_family": "WIDE_TO_CLOSE_PUSH", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/generated/gen-A-summon.mp4": {
        "title": "Kling 2.1 Gen-A · Summon & Red Lettering w/ Orb Panel",
        "notes": "5.0s I2V from original frame + orb panel: cake rises from table and red icing characters form across the crown.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "CHAMBER_FLOATING_TILT_10DEG",
        "cut_family": "HOLOGRAM_GHOST_MATERIALIZE", "motion_family": "DOLLY_PUSH_IN",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/generated/gen-B-lettering.mp4": {
        "title": "Kling 2.1 Gen-B · Crown Lettering & 25° Tip w/ Panel",
        "notes": "5.0s I2V starting at Shot 27 lettering with controller panel below: cake tips toward camera while candles burn.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "HIGH_CROWN_WRITING_45DEG",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "HANDHELD_DRIFT_RACK",
        "scale_family": "TIGHT_CLOSE_UP_MACRO", "layout_family": "WEAVER_5RING_BARREL_HUD", "era": "2049_chamber",
    },
    "assets/generated/gen-C-from-nothing.mp4": {
        "title": "Kling 2.1 Gen-C · Layer-by-Layer Build on Stage + Pad",
        "notes": "5.0s 960×960 I2V starting from Stage+Pad: hex table materializes and cake stacks layer by layer above the controller panel.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "STAGE_MORPH_DETENT_SWAP", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "SPLIT_STAGE_PAD_CONSOLE", "era": "2049_chamber",
    },
    "assets/generated/gen-D-candles.mp4": {
        "title": "Kling 2.1 Gen-D · Sequential Candle Ignition on Stage + Pad",
        "notes": "5.0s 960×960 I2V: candles ignite one by one spreading warm 3200K table bounce while the lower pad panel animates.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "DOLLY_PUSH_IN",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "SPLIT_STAGE_PAD_CONSOLE", "era": "2049_chamber",
    },
    "assets/units/U2-veo/U2-cake-appears.mp4": {
        "title": "Unit U2 (Veo 3.1 R2V) · First-Person Orb Summons Cake",
        "notes": "8.0s multi-reference Veo 3.1 generation preserving first-person hands on the silver Memory Orb while summoning the birthday cake.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "ARTISAN_BENCH_HANDS_30DEG",
        "cut_family": "HOLOGRAM_GHOST_MATERIALIZE", "motion_family": "HANDHELD_DRIFT_RACK",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "CINEMA_WITH_RETICLE_ARC", "era": "2049_chamber",
    },
    "assets/units/U2-vidu/U2-cake-appears.mp4": {
        "title": "Unit U2 (Vidu R2V 1080p) · Multi-Reference Cake Summon",
        "notes": "5.4s 1920×1080 Vidu reference-to-video unit testing handheld orb retention and low-key chamber cake materialization.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "ARTISAN_BENCH_HANDS_30DEG",
        "cut_family": "HOLOGRAM_GHOST_MATERIALIZE", "motion_family": "HANDHELD_DRIFT_RACK",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "CINEMA_WITH_RETICLE_ARC", "era": "2049_chamber",
    },
    "assets/versions/v0_original.mp4": {
        "title": "Birthday Frame V0 · Canonical Film Baseline (4.2s)",
        "notes": "Baseline 4.2s canonical film plate of the children gathered around the lit birthday cake for A/B comparison against V1–V3.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "TABLE_TABLEAU_EYE_10DEG",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_FULL_TABLEAU", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/versions/v1_blowout.mp4": {
        "title": "Birthday Frame V1 · Breath, Flame-Out & Falling Light",
        "notes": "5.0s variation from the canonical birthday frame: breath bends all flames out into curling smoke as warm face light falls away.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "TABLE_TABLEAU_EYE_10DEG",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_FULL_TABLEAU", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/versions/v2_pushin.mp4": {
        "title": "Birthday Frame V2 · Slow Dolly Push-In to Birthday Girl",
        "notes": "5.0s camera-motion study pushing slowly across the glowing cake toward the central birthday girl.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "TABLE_TABLEAU_EYE_10DEG",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "DOLLY_PUSH_IN",
        "scale_family": "WIDE_TO_CLOSE_PUSH", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/versions/v3_hologram.mp4": {
        "title": "Birthday Frame V3 · Mist-Edge Hologram Turn",
        "notes": "5.0s volumetric variation where figure edges dissolve like spacetime mist as the children turn toward the burning candles.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "TABLE_TABLEAU_EYE_10DEG",
        "cut_family": "HOLOGRAM_GHOST_MATERIALIZE", "motion_family": "HANDHELD_DRIFT_RACK",
        "scale_family": "MEDIUM_FULL_TABLEAU", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
    },
    "assets/mist/blow.mp4": {
        "title": "Mist Layer Plate · Candle Blow-Out (`mist/blow.mp4`)",
        "notes": "6.0s 960×540 source memory plate segmented into particle-mist salience fields for `mist.html` (blow-out beat).",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "INTIMATE_CANDLE_FACE_CU",
        "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "HANDHELD_DRIFT_RACK",
        "scale_family": "TIGHT_CLOSE_UP_MACRO", "layout_family": "DECOMP_DEPTH_ISOLATED_PASS", "era": "2049_chamber",
    },
    "assets/mist/cake.mp4": {
        "title": "Mist Layer Plate · Floating Cake (`mist/cake.mp4`)",
        "notes": "6.0s 960×540 source memory plate driving the volumetric cake-summon particle cloud in `mist.html`.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "CHAMBER_FLOATING_TILT_10DEG",
        "cut_family": "STAGE_MORPH_DETENT_SWAP", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "DECOMP_DEPTH_ISOLATED_PASS", "era": "2049_chamber",
    },
    "assets/mist/children.mp4": {
        "title": "Mist Layer Plate · Children Around Table (`mist/children.mp4`)",
        "notes": "6.0s 960×540 source memory plate driving the children half-ring salience point cloud in `mist.html`.",
        "source_family": "GEN_MODELS_AND_MIST", "angle_family": "TABLE_TABLEAU_EYE_10DEG",
        "cut_family": "HOLOGRAM_GHOST_MATERIALIZE", "motion_family": "LOCKED_STATIC",
        "scale_family": "MEDIUM_FULL_TABLEAU", "layout_family": "DECOMP_DEPTH_ISOLATED_PASS", "era": "2049_chamber",
    },
}

MOMENTS_DECOMP_INFO = {
    "m07": ("Moment 07 (00:31) · Beetle Compound Eyes Focus", "MACRO_SPECIMEN_ECU", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO"),
    "m25": ("Moment 25 (02:17) · Cake Appears, Frostings & 25° Tilt", "CHAMBER_FLOATING_TILT_10DEG", "STAGE_MORPH_DETENT_SWAP", "LOCKED_STATIC", "MEDIUM_CLOSE_HERO"),
    "m26": ("Moment 26 (02:21) · Cylinder to 12-Flute Bundt Morph", "CHAMBER_FLOATING_TILT_10DEG", "STAGE_MORPH_DETENT_SWAP", "LOCKED_STATIC", "MEDIUM_CLOSE_HERO"),
    "m27": ("Moment 27 (02:24) · Red 生日快樂 Piping & Upright Swing", "HIGH_CROWN_WRITING_45DEG", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO"),
    "m29": ("Moment 29 (02:32) · Children Ghost-Fade Solidification", "TABLE_TABLEAU_EYE_10DEG", "HOLOGRAM_GHOST_MATERIALIZE", "LOCKED_STATIC", "MEDIUM_FULL_TABLEAU"),
    "m36": ("Moment 36 (02:53) · Single Candle Light on Boy's Face", "INTIMATE_CANDLE_FACE_CU", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO"),
    "m39": ("Moment 39 (03:00) · Dim Chamber Table & Children", "TABLE_TABLEAU_EYE_10DEG", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "MEDIUM_FULL_TABLEAU"),
    "m44": ("Moment 44 (03:33) · Warm Lit Table & Children Circle", "TABLE_TABLEAU_EYE_10DEG", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "MEDIUM_FULL_TABLEAU"),
    "m46": ("Moment 46 (03:46) · Candles Blow Out on Her Face", "INTIMATE_CANDLE_FACE_CU", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO"),
}

MODALITY_LABELS = {
    "film_closeup": ("Close-Up Clean Film Plate", "CLEAN_CINEMA_ORB_FREE", "Cropped orb-free close-up film plate isolating subject choreography."),
    "film_chamber_clean": ("Full Clean Chamber Plate", "CLEAN_CINEMA_ORB_FREE", "Uncropped 16:9 clean containment chamber plate with zero hardware."),
    "seg_isolated": ("Isolated RGBA Subject Matte", "DECOMP_DEPTH_ISOLATED_PASS", "SAM/Mask-RCNN foreground subject isolated on pure black for compositing & R2V."),
    "cond_depth_edge": ("Depth + Canny Edge Conditioning", "DECOMP_DEPTH_ISOLATED_PASS", "DPT-MiDaS monocular depth + structural Canny edge pass for ControlNet / Video2Game."),
    "best3d_stage": ("Best3D Weaver Grounded Stage", "CLEAN_CINEMA_ORB_FREE", "Grounded 3D Weaver stage-only reconstruction synchronized to the film moment."),
    "stelline3d": ("Stelline 3D Engine Reconstruction", "CLEAN_CINEMA_ORB_FREE", "Real-time Three.js Stelline 3D procedural + relief reconstruction of the moment."),
}

MASTER_SUPERCUTS = {
    "master_00_stelline_3d_stage_only.mp4": ("Master Supercut 00 · Stelline 3D Grounded Stage-Only", "HERO_PEDESTAL_3Q_25DEG", "CLEAN_CINEMA_ORB_FREE", "Complete multi-shot 3D grounded stage supercut across all canonical birthday moments (zero hardware)."),
    "master_01_film_closeup_supercut.mp4": ("Master Supercut 01 · Canonical Film Close-Ups (No Orb)", "INTIMATE_CANDLE_FACE_CU", "CLEAN_CINEMA_ORB_FREE", "Multi-shot close-up supercut across Moments 07–46 with the Memory Maker excluded."),
    "master_02_film_chamber_supercut.mp4": ("Master Supercut 02 · Full Clean Chamber Supercut", "TABLE_TABLEAU_EYE_10DEG", "CLEAN_CINEMA_ORB_FREE", "Multi-shot full-frame clean chamber supercut across Moments 07–46."),
    "master_03_segmented_isolated_supercut.mp4": ("Master Supercut 03 · Isolated RGBA Subjects Supercut", "HERO_PEDESTAL_3Q_25DEG", "DECOMP_DEPTH_ISOLATED_PASS", "Multi-shot isolated foreground matte supercut across Moments 07–46 on black."),
    "master_04_best3d_weaver_stage_only.mp4": ("Master Supercut 04 · Best3D Weaver Stage-Only Supercut", "HERO_PEDESTAL_3Q_25DEG", "CLEAN_CINEMA_ORB_FREE", "Complete grounded Weaver 3D stage-only supercut spanning cake sculpt, piping, children, and blow-out."),
    "master_05_mist_pointcloud_supercut.mp4": ("Master Supercut 05 · 24k Volumetric Mist Point-Cloud Supercut", "TABLE_TABLEAU_EYE_10DEG", "DECOMP_DEPTH_ISOLATED_PASS", "Multi-shot volumetric salience particle-mist supercut across cake, children, and candle blow-out."),
    "master_06_depth_edge_supercut.mp4": ("Master Supercut 06 · Depth + Structural Edge Supercut", "HERO_PEDESTAL_3Q_25DEG", "DECOMP_DEPTH_ISOLATED_PASS", "Multi-shot DPT-MiDaS depth + Canny edge conditioning supercut across Moments 07–46."),
}

SHOT_RULES = {
    "shot05_beetle-on-leaf.mp4": ("MACRO_SPECIMEN_ECU", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO", "CLEAN_CINEMA_ORB_FREE"),
    "shot07_beetle-eyes-focus.mp4": ("MACRO_SPECIMEN_ECU", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO", "CLEAN_CINEMA_ORB_FREE"),
    "shot24_room-before-cake.mp4": ("WIDE_ARCHITECTURAL_DOME", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "EXTREME_WIDE_DOME", "CLEAN_CINEMA_ORB_FREE"),
    "shot25_cake-appears.mp4": ("CHAMBER_FLOATING_TILT_10DEG", "STAGE_MORPH_DETENT_SWAP", "LOCKED_STATIC", "MEDIUM_CLOSE_HERO", "CLEAN_CINEMA_ORB_FREE"),
    "shot26_cake-bundt.mp4": ("CHAMBER_FLOATING_TILT_10DEG", "STAGE_MORPH_DETENT_SWAP", "LOCKED_STATIC", "MEDIUM_CLOSE_HERO", "CINEMA_WITH_RETICLE_ARC"),
    "shot27_cake-writing-upright.mp4": ("HIGH_CROWN_WRITING_45DEG", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO", "CINEMA_WITH_RETICLE_ARC"),
    "shot29_children-fade-in.mp4": ("TABLE_TABLEAU_EYE_10DEG", "HOLOGRAM_GHOST_MATERIALIZE", "LOCKED_STATIC", "MEDIUM_FULL_TABLEAU", "CLEAN_CINEMA_ORB_FREE"),
    "shot30_table-wide-children.mp4": ("TABLE_TABLEAU_EYE_10DEG", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "MEDIUM_FULL_TABLEAU", "CLEAN_CINEMA_ORB_FREE"),
    "shot33_k-arch-wide.mp4": ("WIDE_ARCHITECTURAL_DOME", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "EXTREME_WIDE_DOME", "CLEAN_CINEMA_ORB_FREE"),
    "shot34_table-far-k-back.mp4": ("WIDE_ARCHITECTURAL_DOME", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "EXTREME_WIDE_DOME", "CLEAN_CINEMA_ORB_FREE"),
    "shot35_children-faces-1.mp4": ("INTIMATE_CANDLE_FACE_CU", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO", "CLEAN_CINEMA_ORB_FREE"),
    "shot36_boy-candle-light.mp4": ("INTIMATE_CANDLE_FACE_CU", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO", "CLEAN_CINEMA_ORB_FREE"),
    "shot37_children-faces-2.mp4": ("INTIMATE_CANDLE_FACE_CU", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO", "CLEAN_CINEMA_ORB_FREE"),
    "shot39_table-dark-children.mp4": ("TABLE_TABLEAU_EYE_10DEG", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "MEDIUM_FULL_TABLEAU", "CLEAN_CINEMA_ORB_FREE"),
    "shot42_table-far-k-back-2.mp4": ("WIDE_ARCHITECTURAL_DOME", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "EXTREME_WIDE_DOME", "CLEAN_CINEMA_ORB_FREE"),
    "shot44_table-lit-children.mp4": ("TABLE_TABLEAU_EYE_10DEG", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "MEDIUM_FULL_TABLEAU", "CLEAN_CINEMA_ORB_FREE"),
    "shot46_candles-go-out-face.mp4": ("INTIMATE_CANDLE_FACE_CU", "SINGLE_CONTINUOUS_TAKE", "HANDHELD_DRIFT_RACK", "TIGHT_CLOSE_UP_MACRO", "CLEAN_CINEMA_ORB_FREE"),
    "shot47_k-back-dark.mp4": ("WIDE_ARCHITECTURAL_DOME", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "EXTREME_WIDE_DOME", "CLEAN_CINEMA_ORB_FREE"),
}

DESIGN_NOTES = {
    "design_e_both.mp4": ("Counterfactual E-Both · Both Beetle Eyes Sharp (Shot 07)", "MACRO_SPECIMEN_ECU", "CLEAN_CINEMA_ORB_FREE", "Pixel-remade Shot 07 window with both compound eyes simultaneously in crisp macro focus (passed 4/5 critic rounds)."),
    "design_e_swap.mp4": ("Counterfactual E-Swap · Left Eye Sharp, Right Soft (Shot 07)", "MACRO_SPECIMEN_ECU", "CLEAN_CINEMA_ORB_FREE", "Pixel-remade Shot 07 window inverting the film's focal plane between left and right ommatidia."),
    "design_e_none.mp4": ("Counterfactual E-None · Both Beetle Eyes Defocused (Shot 07)", "MACRO_SPECIMEN_ECU", "CLEAN_CINEMA_ORB_FREE", "Pixel-remade Shot 07 window softening both compound eyes to shallow bokeh."),
    "design_c_kl.mp4": ("Counterfactual C-KL · Re-Set '快乐' Her Characters (Shot 27)", "HIGH_CROWN_WRITING_45DEG", "CINEMA_WITH_RETICLE_ARC", "Homography-carried cake crown replacing 生日快樂 with lifted two-glyph '快乐' piped tubes."),
    "design_c_sr.mp4": ("Counterfactual C-SR · Re-Set '生日' Her Characters (Shot 27)", "HIGH_CROWN_WRITING_45DEG", "CINEMA_WITH_RETICLE_ARC", "Homography-carried cake crown re-setting Ana's own '生日' icing characters in film light."),
    "design_c_le.mp4": ("Counterfactual C-LE · Single '乐' Character Crown (Shot 27)", "HIGH_CROWN_WRITING_45DEG", "CINEMA_WITH_RETICLE_ARC", "Homography-carried cake crown isolating single '乐' piped glyph on clean buttercream."),
    "design_c_ana.mp4": ("Counterfactual C-ANA · Piped '安娜' Inscription (Shot 27)", "HIGH_CROWN_WRITING_45DEG", "CINEMA_WITH_RETICLE_ARC", "Counterfactual red-piped '安娜' (Ana) inscription tracked onto the tilting Shot 27 cake top."),
    "design_c_joe.mp4": ("Counterfactual C-JOE · Piped 'JOE' Inscription (Shot 27)", "HIGH_CROWN_WRITING_45DEG", "CINEMA_WITH_RETICLE_ARC", "Counterfactual red-piped 'JOE' inscription tracked onto the tilting Shot 27 cake top."),
    "design_c_out0.mp4": ("Counterfactual C-Out0 · All 7 Cake Candles Extinguished (Shot 27)", "HIGH_CROWN_WRITING_45DEG", "CINEMA_WITH_RETICLE_ARC", "Shot 27 crown counterfactual removing all 7 flames and scaling warm light ratios (R:0.41, G:0.34, B:0.15)."),
    "design_c_out3.mp4": ("Counterfactual C-Out3 · Only 3 Candles Left Burning (Shot 27)", "HIGH_CROWN_WRITING_45DEG", "CINEMA_WITH_RETICLE_ARC", "Partial flame-out counterfactual leaving 3 burning wicks and 4 smoked tips on Shot 27."),
    "design_b_out.mp4": ("Counterfactual B-Out · Boy's Single Candle Extinguished (Shot 36)", "INTIMATE_CANDLE_FACE_CU", "CLEAN_CINEMA_ORB_FREE", "Shot 36 portrait counterfactual extinguishing the foreground candle and removing warm 3200K cheek bounce."),
    "design_k_out.mp4": ("Counterfactual K-Out · All Candles Out Before Blow (Shot 44)", "TABLE_TABLEAU_EYE_10DEG", "CLEAN_CINEMA_ORB_FREE", "Shot 44 party tableau counterfactual with all wicks unlit while preserving cool dome horizon rim."),
    "design_k_half.mp4": ("Counterfactual K-Half · Half Ring Candles Extinguished (Shot 44)", "TABLE_TABLEAU_EYE_10DEG", "CLEAN_CINEMA_ORB_FREE", "Shot 44 party tableau counterfactual extinguishing three candles and halving warm table bounce."),
    "design_p_out.mp4": ("Counterfactual P-Out · Ghost Children w/ Dark Unlit Cake (Shot 29)", "TABLE_TABLEAU_EYE_10DEG", "CLEAN_CINEMA_ORB_FREE", "Shot 29 ghost-materialization counterfactual with all cake flames extinguished into dark chamber tone."),
}


def analyze_video_fast(abs_path, layout_hint):
    cap = cv2.VideoCapture(abs_path)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 24.0)
    n_frames = max(1, int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1))
    dur = round(n_frames / fps, 2)

    if layout_hint == "WEAVER_5RING_BARREL_HUD":
        y_split = int(h * 0.64)
    elif layout_hint == "MUSEUM_SCREENLESS_5RING":
        y_split = int(h * 0.74)
    elif layout_hint == "SPLIT_STAGE_PAD_CONSOLE":
        y_split = int(h * 0.56)
    elif layout_hint == "CHAMBER_MINIMAL_DOTBAR":
        y_split = int(h * 0.87)
    else:
        y_split = h

    target_fps = 6.0 if dur <= 18.0 else (3.5 if dur <= 50.0 else 2.0)
    step = max(1, int(round(fps / target_fps)))

    hists, grays, edge_boxes, times, raw_frames = [], [], [], [], []
    f_idx = 0
    while f_idx < n_frames:
        ok = cap.grab()
        if not ok:
            break
        if f_idx % step != 0:
            f_idx += 1
            continue
        ok, bgr = cap.retrieve()
        if not ok:
            break
        sc = bgr[: max(64, min(y_split, bgr.shape[0])), :]
        small = cv2.resize(sc, (160, 90), interpolation=cv2.INTER_AREA)
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        mask = np.ones((90, 160), np.uint8)
        mask[50:, :48] = 0
        hist = cv2.calcHist([hsv], [0, 1, 2], mask, [8, 6, 6], [0, 180, 0, 256, 0, 256])
        cv2.normalize(hist, hist)
        hists.append(hist.flatten())

        g = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        grays.append(g)

        c_zone = g[10:82, 30:130]
        thr = max(20.0, float(np.percentile(c_zone, 70)) * 0.55)
        fg = c_zone > thr
        xs = np.where(fg.any(axis=0))[0]
        ys = np.where(fg.any(axis=1))[0]
        w_rel = float(xs[-1] - xs[0]) / 100.0 if len(xs) > 4 else 0.25
        h_rel = float(ys[-1] - ys[0]) / 72.0 if len(ys) > 4 else 0.25
        edge_boxes.append((w_rel, h_rel))

        times.append(round(f_idx / fps, 2))
        raw_frames.append(cv2.cvtColor(cv2.resize(sc, (480, 270), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB))
        f_idx += 1
    cap.release()

    if len(grays) < 3:
        return {
            "width": w, "height": h, "fps": round(fps, 2), "duration_s": dur, "y_split": y_split,
            "cuts_s": [], "morph_jumps_s": [],
            "shots": [{"shot_index": 1, "start_s": 0.0, "end_s": dur, "duration_s": dur}],
            "scale_growth": 1.0, "bg_flow": 0.0, "fg_flow": 0.0,
        }, raw_frames, []

    hist_diffs, pix_diffs, bg_flows, fg_flows = [], [], [], []
    for i in range(1, len(grays)):
        hd = float(1.0 - np.dot(hists[i], hists[i - 1]))
        pd = float(np.abs(grays[i].astype(np.float32) - grays[i - 1].astype(np.float32))[:, 48:].mean()) / 255.0
        hist_diffs.append(hd)
        pix_diffs.append(pd)
        flow = cv2.calcOpticalFlowFarneback(grays[i - 1], grays[i], None, 0.5, 2, 11, 2, 5, 1.1, 0)
        mag = np.hypot(flow[..., 0], flow[..., 1])
        outer = np.ones_like(mag, dtype=bool)
        outer[18:76, 40:120] = False
        bg_flows.append(float(np.median(mag[outer])))
        fg_flows.append(float(np.percentile(mag[18:76, 44:116], 80)))

    hard_cuts, morph_jumps = [], []
    med_pd = float(np.median(pix_diffs)) if pix_diffs else 0.02
    min_gap = 0.7 if dur < 25.0 else 1.4
    for i, (hd, pd) in enumerate(zip(hist_diffs, pix_diffs)):
        t_cut = times[i + 1]
        if t_cut < 0.35 or t_cut > dur - 0.35:
            continue
        g0, g1 = grays[i].astype(np.float32), grays[i + 1].astype(np.float32)
        outer_diff = float(np.abs(g1[:36, :] - g0[:36, :]).mean() + np.abs(g1[:, 124:] - g0[:, 124:]).mean()) / 510.0
        center_diff = float(np.abs(g1[20:76, 46:114] - g0[20:76, 46:114]).mean()) / 255.0
        if (pd > max(0.085, med_pd * 3.4) and outer_diff > 0.044) or (hd > 0.35 and outer_diff > 0.038):
            if not hard_cuts or (t_cut - hard_cuts[-1]) >= min_gap:
                hard_cuts.append(round(t_cut, 2))
        elif center_diff > max(0.075, med_pd * 2.6) or hd > 0.22:
            if not morph_jumps or (t_cut - morph_jumps[-1]) >= 0.65:
                morph_jumps.append(round(t_cut, 2))

    bounds = [0.0] + hard_cuts + [dur]
    shots, sub_frames = [], []
    for s_i in range(len(bounds) - 1):
        t_a, t_b = bounds[s_i], bounds[s_i + 1]
        mid_t = 0.5 * (t_a + t_b)
        best_k = min(range(len(times)), key=lambda k: abs(times[k] - mid_t))
        shots.append({"shot_index": s_i + 1, "start_s": round(t_a, 2), "end_s": round(t_b, 2), "duration_s": round(t_b - t_a, 2)})
        sub_frames.append(raw_frames[best_k])

    q = max(1, len(edge_boxes) // 5)
    a0 = np.mean([w_r * h_r for w_r, h_r in edge_boxes[:q]])
    a1 = np.mean([w_r * h_r for w_r, h_r in edge_boxes[-q:]])
    scale_growth = round(float((a1 + 0.02) / (a0 + 0.02)), 3)

    return {
        "width": w, "height": h, "fps": round(fps, 2), "duration_s": dur, "y_split": y_split,
        "cuts_s": hard_cuts, "morph_jumps_s": morph_jumps, "shots": shots,
        "scale_growth": scale_growth,
        "bg_flow": round(float(np.mean(bg_flows)), 3),
        "fg_flow": round(float(np.mean(fg_flows)), 3),
    }, raw_frames, sub_frames


def normalize_bday_item(it):
    cin = it.get("cinematography", {})
    layout_fam = cin.get("layout_family", "WEAVER_5RING_BARREL_HUD")
    if layout_fam == "CHAMBER_DOME_RIM_CLEAN":
        layout_fam = "CLEAN_CINEMA_ORB_FREE"
    elif layout_fam == "REFERENCE_GRID_9X3":
        layout_fam = "CHAMBER_MINIMAL_DOTBAR"
    return {
        "id": it["id"],
        "corpus": "bday_training",
        "path": f"BDAY TRAINING/{it['filename']}",
        "filename": it["filename"],
        "kind": it["kind"],
        "title": it["title"],
        "notes": it["notes"],
        "era": it.get("era", "2049_chamber"),
        "archetype": it.get("archetype", "canonical_chamber_7"),
        "width": it["width"],
        "height": it["height"],
        "fps": it.get("fps", 24.0),
        "duration_s": it.get("duration_s", 0.0),
        "thumb": it["assets"]["thumb"],
        "seg_strip": it["assets"].get("seg"),
        "cake_rgba": it["assets"].get("cake_rgba"),
        "subshots_strip": cin.get("subshots_strip"),
        "source_family": "BDAY_WEAVER_CORPUS",
        "angle_family": cin.get("angle_family", "HERO_PEDESTAL_3Q_25DEG"),
        "cut_family": cin.get("cut_family", "SINGLE_CONTINUOUS_TAKE"),
        "motion_family": cin.get("motion_family", "LOCKED_STATIC"),
        "scale_family": cin.get("scale_family", "MEDIUM_CLOSE_HERO"),
        "layout_family": layout_fam,
        "n_shots": cin.get("n_shots", 1),
        "cuts_s": cin.get("cuts_s", []),
        "morph_jumps_s": cin.get("morph_jumps_s", []),
        "shots": cin.get("shots", []),
        "scale_growth": cin.get("scale_growth", 1.0),
        "bg_flow": cin.get("bg_flow", 0.0),
        "fg_flow": cin.get("fg_flow", 0.0),
        "y_split": it.get("segmentation", {}).get("y_split", it["height"]),
    }


def build_asset_item(idx, rel_path, moments_cat):
    bname = os.path.basename(rel_path)
    abs_path = os.path.join(ROOT, rel_path)
    item_id = f"vid_{idx:03d}"

    if rel_path in CURATED_ASSETS:
        meta = dict(CURATED_ASSETS[rel_path])
    elif rel_path.startswith("assets/moments_videos/"):
        if bname in MASTER_SUPERCUTS:
            title, ang, lay_f, notes = MASTER_SUPERCUTS[bname]
            meta = {
                "title": title, "notes": notes,
                "source_family": "MOMENTS_6WAY_DECOMP", "angle_family": ang,
                "cut_family": "MULTI_SHOT_MONTAGE", "motion_family": "MULTI_ANGLE_CUTS",
                "scale_family": "MULTI_SCALE_COVERAGE", "layout_family": lay_f, "era": "2049_chamber",
            }
        else:
            stem = bname.replace(".mp4", "")
            m_code = stem.split("_")[0]
            mod_key = "_".join(stem.split("_")[1:])
            m_title, ang, cut_f, mot_f, scl_f = MOMENTS_DECOMP_INFO.get(
                m_code, (f"Moment {m_code}", "HERO_PEDESTAL_3Q_25DEG", "SINGLE_CONTINUOUS_TAKE", "LOCKED_STATIC", "MEDIUM_CLOSE_HERO")
            )
            mod_lbl, lay_f, mod_desc = MODALITY_LABELS.get(mod_key, (mod_key, "CLEAN_CINEMA_ORB_FREE", "Synchronized moment modality pass."))
            meta = {
                "title": f"{m_title} · [{mod_lbl}]",
                "notes": f"{mod_desc} Aligned 6-way decomposition pass (`{bname}`).",
                "source_family": "MOMENTS_6WAY_DECOMP", "angle_family": ang,
                "cut_family": cut_f, "motion_family": mot_f,
                "scale_family": scl_f, "layout_family": lay_f, "era": "2049_chamber",
            }
    elif rel_path.startswith("assets/moments/shot"):
        ang, cut_f, mot_f, scl_f, lay_f = SHOT_RULES[bname]
        shot_num = bname.split("_")[0].replace("shot", "").lstrip("0") or "0"
        m_info = moments_cat.get("shots", {}).get(shot_num, {})
        lbl = m_info.get("label", bname.replace(".mp4", ""))
        t0, t1 = m_info.get("t0", 0), m_info.get("t1", 0)
        meta = {
            "title": f"BR2049 Shot {int(shot_num):02d} · {lbl[:1].upper() + lbl[1:]}",
            "notes": f"Canonical orb-free film moment ({t0:.2f}s–{t1:.2f}s in open-matte master){' · cropped to cake' if m_info.get('cropped') else ''}.",
            "source_family": "FILM_CANON_MOMENTS", "angle_family": ang,
            "cut_family": cut_f, "motion_family": mot_f,
            "scale_family": scl_f, "layout_family": lay_f, "era": "2049_chamber",
        }
    elif rel_path.startswith("assets/moments/design_"):
        title, ang, lay_f, notes = DESIGN_NOTES[bname]
        meta = {
            "title": title, "notes": notes,
            "source_family": "COUNTERFACTUAL_DESIGNS", "angle_family": ang,
            "cut_family": "AB_COUNTERFACTUAL_PLATE",
            "motion_family": "HANDHELD_DRIFT_RACK" if ang in ("MACRO_SPECIMEN_ECU", "INTIMATE_CANDLE_FACE_CU", "HIGH_CROWN_WRITING_45DEG") else "LOCKED_STATIC",
            "scale_family": "TIGHT_CLOSE_UP_MACRO" if ang != "TABLE_TABLEAU_EYE_10DEG" else "MEDIUM_FULL_TABLEAU",
            "layout_family": lay_f, "era": "2049_chamber",
        }
    else:
        meta = {
            "title": bname.replace(".mp4", "").replace("_", " ").title(),
            "notes": f"Repository video asset `{rel_path}`.",
            "source_family": "GEN_MODELS_AND_MIST", "angle_family": "HERO_PEDESTAL_3Q_25DEG",
            "cut_family": "SINGLE_CONTINUOUS_TAKE", "motion_family": "LOCKED_STATIC",
            "scale_family": "MEDIUM_CLOSE_HERO", "layout_family": "CLEAN_CINEMA_ORB_FREE", "era": "2049_chamber",
        }

    cm, raw_frames, sub_frames = analyze_video_fast(abs_path, meta["layout_family"])

    thumb_rel = f"assets/video-families/thumbs/{item_id}.webp"
    if raw_frames:
        mid_k = len(raw_frames) // 2
        best_f = max(raw_frames[max(0, mid_k - 3) : min(len(raw_frames), mid_k + 4)] or raw_frames, key=lambda fr: float(fr.mean()))
        Image.fromarray(best_f).save(os.path.join(ROOT, thumb_rel), "WEBP", quality=82)

    subshot_rel = None
    if len(sub_frames) >= 2:
        step_pick = max(1, len(sub_frames) // 6)
        picked = sub_frames[::step_pick][:6]
        strip_imgs = [cv2.resize(sf, (240, 135), interpolation=cv2.INTER_AREA) for sf in picked]
        strip = np.hstack(strip_imgs)
        subshot_rel = f"assets/video-families/subshots/{item_id}_shots.webp"
        Image.fromarray(strip).save(os.path.join(ROOT, subshot_rel), "WEBP", quality=80)

    return {
        "id": item_id,
        "corpus": "repo_assets",
        "path": rel_path,
        "filename": bname,
        "kind": "video",
        "title": meta["title"],
        "notes": meta["notes"],
        "era": meta["era"],
        "archetype": "canonical_chamber_7",
        "width": cm["width"],
        "height": cm["height"],
        "fps": cm["fps"],
        "duration_s": cm["duration_s"],
        "thumb": thumb_rel,
        "seg_strip": None,
        "cake_rgba": None,
        "subshots_strip": subshot_rel,
        "source_family": meta["source_family"],
        "angle_family": meta["angle_family"],
        "cut_family": meta["cut_family"],
        "motion_family": meta["motion_family"],
        "scale_family": meta["scale_family"],
        "layout_family": meta["layout_family"],
        "n_shots": len(cm["shots"]),
        "cuts_s": cm["cuts_s"],
        "morph_jumps_s": cm["morph_jumps_s"],
        "shots": cm["shots"],
        "scale_growth": cm["scale_growth"],
        "bg_flow": cm["bg_flow"],
        "fg_flow": cm["fg_flow"],
        "y_split": cm["y_split"],
    }


def main():
    t0 = time.time()
    bday_ds = json.load(open(BDAY_DS_PATH, "r", encoding="utf-8"))
    moments_cat = json.load(open(MOMENTS_CAT_PATH, "r", encoding="utf-8")) if os.path.exists(MOMENTS_CAT_PATH) else {}

    all_items = [normalize_bday_item(it) for it in bday_ds["items"]]

    asset_mp4s = sorted(
        os.path.relpath(p, ROOT).replace("\\", "/")
        for p in glob.glob(os.path.join(ROOT, "assets", "**", "*.mp4"), recursive=True)
    )
    for idx, rel_p in enumerate(asset_mp4s, 1):
        all_items.append(build_asset_item(idx, rel_p, moments_cat))

    axes = [
        ("angle_families", "angle_family"),
        ("cut_families", "cut_family"),
        ("motion_families", "motion_family"),
        ("scale_families", "scale_family"),
        ("layout_families", "layout_family"),
        ("source_families", "source_family"),
    ]
    counts = {}
    grouped_ids = {}
    for axis_key, field in axes:
        c_map = {fam_k: 0 for fam_k in FAMILY_TAXONOMY[axis_key]}
        g_map = {fam_k: [] for fam_k in FAMILY_TAXONOMY[axis_key]}
        for it in all_items:
            v = it[field]
            c_map[v] = c_map.get(v, 0) + 1
            g_map.setdefault(v, []).append(it["id"])
        counts[axis_key] = c_map
        grouped_ids[axis_key] = g_map

    total_duration_s = round(sum(float(it.get("duration_s") or 0.0) for it in all_items), 1)
    total_detected_shots = sum(int(it.get("n_shots") or 1) for it in all_items)
    multi_shot_count = sum(1 for it in all_items if int(it.get("n_shots") or 1) >= 2)

    catalog = {
        "name": "Stelline Memory Orb · Master Cinematographic Video Families Atlas",
        "version": "3.0",
        "total_items": len(all_items),
        "total_videos": sum(1 for it in all_items if it["kind"] == "video"),
        "total_reference_plates": sum(1 for it in all_items if it["kind"] != "video"),
        "total_duration_s": total_duration_s,
        "total_detected_shots": total_detected_shots,
        "multi_shot_items": multi_shot_count,
        "counts": counts,
        "taxonomy": FAMILY_TAXONOMY,
        "grouped_ids": grouped_ids,
        "items": all_items,
    }

    with open(os.path.join(OUT_DIR, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "catalog.js"), "w", encoding="utf-8") as f:
        f.write("window.VIDEO_FAMILIES_CATALOG = " + json.dumps(catalog, ensure_ascii=False) + ";\n")

    print(f"[MASTER VIDEO FAMILIES v3.0] Built {len(all_items)}-item unified catalog in {time.time() - t0:.1f}s!")
    print(f"  Total items: {catalog['total_items']} ({catalog['total_videos']} videos + {catalog['total_reference_plates']} plate) · {total_duration_s}s runtime · {total_detected_shots} sub-shots")
    for axis_key, _ in axes:
        print(f"  {axis_key:16s}: {counts[axis_key]}")


if __name__ == "__main__":
    main()
