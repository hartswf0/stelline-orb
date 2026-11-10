#!/usr/bin/env python3
"""Frame-accurate Cinematographic Shot-Cut, Camera-Angle, Scale, Motion & Layout Classifier
for all 78 items in `/Users/gaia/STELLINE-ORB/stelline-orb/BDAY TRAINING`.

Computes per video (sampling at 8 fps across the clean scene region above `y_split`):
  1. Hard Scene Cuts vs. Flash/Morph Jumps (`shots`: exact `[start_s, end_s]` sub-shot list, `n_cuts`, `cut_timestamps_s`)
  2. Cut / Edit Structure Family (`cut_family`):
     - `SINGLE_CONTINUOUS_TAKE`      : 0 hard scene cuts, continuous temporal flow
     - `MULTI_SHOT_MONTAGE`          : >=1 true camera/framing cut between distinct angles/scales
     - `STAGE_MORPH_DETENT_SWAP`     : locked/push camera while cake undergoes discrete stage/color/topology swaps
     - `HOLOGRAM_GHOST_MATERIALIZE`  : empty/wireframe/orb -> solidifying figures or multi-tier hologram
     - `TEMPORAL_REWIND_REVERSE`     : reverse-time smoke/particle/expression scrub
     - `BENCHMARK_TRIPTYCH_PLATE`    : static 9x3 multi-shot segmentation reference sheet
  3. Camera Angle & Elevation Family (`angle_family`):
     - `HIGH_CROWN_WRITING_45DEG`    : 38°-58° elevated top/crown view (for piping & calligraphy legibility)
     - `HERO_PEDESTAL_3Q_25DEG`      : 18°-35° three-quarter studio hero view on pedestal/table
     - `CHAMBER_FLOATING_TILT_10DEG` : 5°-16° low chamber angle with 20°-25° tilted floating cake
     - `TABLE_TABLEAU_EYE_10DEG`     : 6°-15° across-the-table ensemble framing (3-7 guests in half-ring)
     - `INTIMATE_CANDLE_FACE_CU`     : 0°-8° shallow-DOF 85mm close-up (flames in lower foreground lighting 1-2 faces)
     - `ARTISAN_BENCH_HANDS_30DEG`   : 20°-35° close craft tabletop framing with baker hands/tools from left/right
  4. Camera Motion Family (`motion_family`):
     - `LOCKED_STATIC`               : fixed tripod/virtual lens
     - `DOLLY_PUSH_IN`               : continuous forward dolly / focal zoom onto cake (cake scale grows >1.45x)
     - `TURNTABLE_ORBIT`             : continuous rotational turntable / orbital sweep
     - `MULTI_ANGLE_CUTS`            : switches camera placement across cuts
  5. Shot Scale Progression (`scale_family`):
     - `WIDE_TO_CLOSE_PUSH`          : WS/MS -> CU
     - `MEDIUM_FULL_TABLEAU`         : MFS / MS ensemble around table
     - `MEDIUM_CLOSE_HERO`           : MCU single object hero
     - `TIGHT_CLOSE_UP_MACRO`        : CU / ECU face or crown macro
     - `MULTI_SCALE_COVERAGE`        : cuts across WS + MCU + CU
  6. Composite Layout Family (`layout_family`):
     - `WEAVER_5RING_BARREL_HUD`     : top ~64% scene + central OLED + bottom 5-ring silver barrel (+ optional left HUD text)
     - `CHAMBER_MINIMAL_DOTBAR`      : 3.8s/10s Open-Matte chamber frame with minimal translucent bottom dot/play bar
     - `CHAMBER_DOME_RIM_CLEAN`      : clean frame bounded only by curved dome rim
     - `REFERENCE_GRID_9X3`          : 9-shot x 3-col segmentation ground-truth plate
"""
import os, json, time
import numpy as np
import cv2
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TRAIN_DIR = os.path.join(ROOT, "BDAY TRAINING")
OUT_DIR = os.path.join(ROOT, "assets", "bday-training")
SUBSHOTS_DIR = os.path.join(OUT_DIR, "subshots")
os.makedirs(SUBSHOTS_DIR, exist_ok=True)

# Curated + visually verified cinematographic overrides where subtle camera grammar matters
ANGLE_OVERRIDES = {
    # High-angle crown writing clips (38-55 deg looking down at top face)
    "31aca305": "HIGH_CROWN_WRITING_45DEG",
    "188f72fd": "HIGH_CROWN_WRITING_45DEG",
    "1d09d1ad": "HIGH_CROWN_WRITING_45DEG",
    "f7539c75": "HIGH_CROWN_WRITING_45DEG",
    "e8ea46cb": "HIGH_CROWN_WRITING_45DEG",
    "63336ceb": "HIGH_CROWN_WRITING_45DEG",
    # Chamber floating & 25-deg tilting cake studies (low POV, Shot 25/26)
    "8a2b551c": "CHAMBER_FLOATING_TILT_10DEG",
    "c7a46a66": "CHAMBER_FLOATING_TILT_10DEG",
    "53201fa9": "CHAMBER_FLOATING_TILT_10DEG",
    "a59d8383": "CHAMBER_FLOATING_TILT_10DEG",
    "9dce0ae7": "CHAMBER_FLOATING_TILT_10DEG",
    # Baker hands tabletop craft POV
    "7c8f1362": "ARTISAN_BENCH_HANDS_30DEG",
    "12f48977": "ARTISAN_BENCH_HANDS_30DEG",
    "70ea715e": "ARTISAN_BENCH_HANDS_30DEG",
    "7f98f25b": "ARTISAN_BENCH_HANDS_30DEG",
    "42d5f0c5": "ARTISAN_BENCH_HANDS_30DEG",
    # Intimate 1-2 child candlelit face close-ups (85mm shallow DOF)
    "fdd03dd0": "INTIMATE_CANDLE_FACE_CU",
    "2d004333": "INTIMATE_CANDLE_FACE_CU",
    "6239f811": "INTIMATE_CANDLE_FACE_CU",
    "9def47ea": "INTIMATE_CANDLE_FACE_CU",
    "75e96385": "INTIMATE_CANDLE_FACE_CU",
    "2d557767": "INTIMATE_CANDLE_FACE_CU",
    "e8c215f4": "INTIMATE_CANDLE_FACE_CU",
    "0ddc6322": "INTIMATE_CANDLE_FACE_CU",
    "1c1b4229": "INTIMATE_CANDLE_FACE_CU",
    "abec7897": "INTIMATE_CANDLE_FACE_CU",
    "924d85eb": "INTIMATE_CANDLE_FACE_CU",  # multi-shot culminating in hero blonde girl CU
}

# Shot Camera presets in Cake Rig (position, yaw, pitch, focal_mm, aperture_f, focus_m) matching each Angle Family!
CAMERA_RIG_PRESETS = {
    "HIGH_CROWN_WRITING_45DEG": {
        "label": "CROWN WRITING · 46° · 50MM",
        "p": [0.02, 1.18, 0.42], "yaw": 0.04, "pitch": -0.78, "f": 50, "N": 4.0, "fd": 0.56,
        "desc": "Elevated 46° crown angle exposing top calligraphy & candle ring"
    },
    "HERO_PEDESTAL_3Q_25DEG": {
        "label": "HERO 3/4 · 24° · 50MM",
        "p": [0.34, 0.99, 0.58], "yaw": 0.53, "pitch": -0.34, "f": 50, "N": 2.8, "fd": 0.68,
        "desc": "Studio 3/4 pedestal framing balancing side relief, drips & crown"
    },
    "CHAMBER_FLOATING_TILT_10DEG": {
        "label": "CHAMBER TILT · 10° · 35MM",
        "p": [-0.14, 0.84, 0.56], "yaw": -0.24, "pitch": -0.10, "f": 35, "N": 2.0, "fd": 0.58,
        "desc": "Low kneeling Shot 25/26 chamber framing for tilted floating cakes"
    },
    "TABLE_TABLEAU_EYE_10DEG": {
        "label": "PARTY TABLEAU · 9° · 40MM",
        "p": [0.0, 0.92, 0.88], "yaw": 0.0, "pitch": -0.13, "f": 40, "N": 2.4, "fd": 0.88,
        "desc": "Seated across-the-table ensemble framing with party guests in half-ring"
    },
    "INTIMATE_CANDLE_FACE_CU": {
        "label": "CANDLE FACE CU · 4° · 85MM f/1.6",
        "p": [0.04, 0.85, 0.54], "yaw": 0.07, "pitch": -0.05, "f": 85, "N": 1.6, "fd": 0.54,
        "desc": "Shallow-DOF 85mm portrait angle across burning wicks onto lit faces"
    },
    "ARTISAN_BENCH_HANDS_30DEG": {
        "label": "BENCH CRAFT · 28° · 45MM",
        "p": [0.18, 1.04, 0.52], "yaw": 0.33, "pitch": -0.44, "f": 45, "N": 3.2, "fd": 0.58,
        "desc": "Close benchtop craft perspective matching hand-sculpted buttercream clips"
    },
    "WIDE_ARCHITECTURAL_DOME": {
        "label": "WIDE DOME · 6° · 24MM",
        "p": [0.0, 1.08, 1.85], "yaw": 0.0, "pitch": -0.09, "f": 24, "N": 4.0, "fd": 1.85,
        "desc": "Wide architectural chamber view with horizon light ring & silhouette scale"
    },
    "MACRO_SPECIMEN_ECU": {
        "label": "MACRO ECU · 22° · 100MM f/2.0",
        "p": [0.08, 0.91, 0.34], "yaw": 0.22, "pitch": -0.32, "f": 100, "N": 2.0, "fd": 0.35,
        "desc": "Extreme macro specimen / crown detail lens with razor-thin focal plane"
    },
}


def detect_cuts_and_motion(fpath, y_split, sample_fps=8.0):
    """Analyze temporal cuts, background/foreground motion, and zoom/push-in across a video."""
    cap = cv2.VideoCapture(fpath)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 24.0)
    n_frames = max(1, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
    dur = n_frames / fps
    step = max(1, int(round(fps / sample_fps)))

    hists = []
    grays = []
    edge_boxes = []
    times = []
    raw_frames = []

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
        sc = bgr[:min(y_split, bgr.shape[0]), :]
        small = cv2.resize(sc, (160, 90), interpolation=cv2.INTER_AREA)
        # Exclude left HUD guide region (x < 45, y > 40) from cut detection so HUD text swaps don't false-trigger scene cuts
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        mask = np.ones((90, 160), np.uint8)
        mask[40:, :52] = 0
        h = cv2.calcHist([hsv], [0, 1, 2], mask, [8, 6, 6], [0, 180, 0, 256, 0, 256])
        cv2.normalize(h, h)
        hists.append(h.flatten())

        g = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        grays.append(g)

        # Estimate active central subject width/area growth (push-in detector)
        c_zone = g[10:84, 32:128]
        thr = max(24.0, float(np.percentile(c_zone, 70)) * 0.55)
        fg = c_zone > thr
        xs = np.where(fg.any(axis=0))[0]
        ys = np.where(fg.any(axis=1))[0]
        w_rel = float(xs[-1] - xs[0]) / 96.0 if len(xs) > 4 else 0.25
        h_rel = float(ys[-1] - ys[0]) / 74.0 if len(ys) > 4 else 0.25
        edge_boxes.append((w_rel, h_rel, float(fg.mean())))

        times.append(round(f_idx / fps, 3))
        raw_frames.append(sc)
        f_idx += 1
    cap.release()

    if len(grays) < 3:
        return {"cuts_s": [], "morph_jumps_s": [], "shots": [{"idx": 1, "start_s": 0.0, "end_s": round(dur, 2)}],
                "scale_growth": 1.0, "bg_flow": 0.0, "fg_flow": 0.0, "horiz_flow_bias": 0.0}, []

    # Frame-to-frame histogram distance & pixel L1 outside HUD
    hist_diffs = []
    pix_diffs = []
    bg_flows, fg_flows, vx_abs = [], [], []

    for i in range(1, len(grays)):
        hd = float(1.0 - np.dot(hists[i], hists[i - 1]))
        pd = float(np.abs(grays[i].astype(np.float32) - grays[i - 1].astype(np.float32))[:, 52:].mean()) / 255.0
        hist_diffs.append(hd)
        pix_diffs.append(pd)

        flow = cv2.calcOpticalFlowFarneback(grays[i - 1], grays[i], None, 0.5, 2, 11, 2, 5, 1.1, 0)
        mag = np.hypot(flow[..., 0], flow[..., 1])
        # Outer periphery = camera motion; center = subject/flame/hand motion
        outer = np.ones_like(mag, dtype=bool)
        outer[18:78, 42:118] = False
        outer[40:, :52] = False
        bg_flows.append(float(np.median(mag[outer])))
        fg_flows.append(float(np.percentile(mag[20:76, 48:112], 80)))
        vx_abs.append(float(np.abs(flow[24:72, 50:110, 0]).mean()))

    # Identify hard camera cuts vs in-place cake morph/color jumps
    hard_cuts = []
    morph_jumps = []
    med_pd = float(np.median(pix_diffs))
    for i, (hd, pd) in enumerate(zip(hist_diffs, pix_diffs)):
        t_cut = times[i + 1]
        if t_cut < 0.45 or t_cut > dur - 0.45:
            continue
        # Compare outer-background change vs center-only change!
        g0, g1 = grays[i].astype(np.float32), grays[i + 1].astype(np.float32)
        outer_diff = float(np.abs(g1[:38, :] - g0[:38, :]).mean() + np.abs(g1[:, 124:] - g0[:, 124:]).mean()) / 510.0
        center_diff = float(np.abs(g1[22:76, 48:112] - g0[22:76, 48:112]).mean()) / 255.0

        if (pd > max(0.085, med_pd * 3.4) and outer_diff > 0.045) or (hd > 0.34 and outer_diff > 0.038):
            if not hard_cuts or (t_cut - hard_cuts[-1]) >= 0.75:
                hard_cuts.append(t_cut)
        elif center_diff > max(0.075, med_pd * 2.6) or hd > 0.22:
            if not morph_jumps or (t_cut - morph_jumps[-1]) >= 0.65:
                morph_jumps.append(t_cut)

    # Build sub-shot segments from hard_cuts
    bounds = [0.0] + hard_cuts + [round(dur, 2)]
    shots = []
    sub_frames = []
    for s_i in range(len(bounds) - 1):
        t_a, t_b = bounds[s_i], bounds[s_i + 1]
        mid_t = 0.5 * (t_a + t_b)
        best_k = min(range(len(times)), key=lambda k: abs(times[k] - mid_t))
        shots.append({
            "shot_index": s_i + 1,
            "start_s": round(t_a, 2),
            "end_s": round(t_b, 2),
            "duration_s": round(t_b - t_a, 2),
        })
        sub_frames.append(raw_frames[best_k])

    # Zoom / dolly scale growth: compare first 20% vs last 20% subject box size
    n_b = len(edge_boxes)
    q = max(1, n_b // 5)
    area_0 = np.mean([w * h for w, h, _ in edge_boxes[:q]])
    area_1 = np.mean([w * h for w, h, _ in edge_boxes[-q:]])
    scale_growth = round(float((area_1 + 0.02) / (area_0 + 0.02)), 3)

    return {
        "cuts_s": hard_cuts,
        "morph_jumps_s": morph_jumps,
        "shots": shots,
        "scale_growth": scale_growth,
        "bg_flow": round(float(np.mean(bg_flows)), 3),
        "fg_flow": round(float(np.mean(fg_flows)), 3),
        "horiz_flow": round(float(np.mean(vx_abs)), 3),
    }, sub_frames


def classify_families(item, cm):
    h = item["hash"]
    fam = item["family"]
    seg = item["segmentation"]
    fname = item["filename"].lower()
    spec = item.get("cake_spec", {})

    if item["kind"] == "reference_sheet":
        return {
            "angle_family": "CHAMBER_FLOATING_TILT_10DEG",
            "cut_family": "BENCHMARK_TRIPTYCH_PLATE",
            "motion_family": "MULTI_ANGLE_CUTS",
            "scale_family": "MULTI_SCALE_COVERAGE",
            "layout_family": "REFERENCE_GRID_9X3",
        }

    # 1. Layout family
    ui_s = seg.get("ui_strip", "")
    if h == "abec7897":
        layout_fam = "CHAMBER_DOME_RIM_CLEAN"
    elif ui_s == "minimal_control_bar" or item["duration_s"] < 4.5 or h in ("924d85eb", "cbd992bb"):
        layout_fam = "CHAMBER_MINIMAL_DOTBAR"
    else:
        layout_fam = "WEAVER_5RING_BARREL_HUD"

    # 2. Angle family
    if h in ANGLE_OVERRIDES:
        angle_fam = ANGLE_OVERRIDES[h]
    elif fam == "hands_craft_sculpting":
        angle_fam = "ARTISAN_BENCH_HANDS_30DEG"
    elif fam == "icing_calligraphy_piping":
        angle_fam = "HIGH_CROWN_WRITING_45DEG"
    elif fam == "party_celebration_eras":
        if seg.get("person_area_pct", 0) > 22 and seg.get("cake_area_pct", 0) < 6.5:
            angle_fam = "INTIMATE_CANDLE_FACE_CU"
        else:
            angle_fam = "TABLE_TABLEAU_EYE_10DEG"
    else:
        angle_fam = "HERO_PEDESTAL_3Q_25DEG"

    # 3. Cut / Edit structure family
    if spec.get("flame") == "rewinding" or "rewind" in fname or "reverse" in fname:
        cut_fam = "TEMPORAL_REWIND_REVERSE"
    elif len(cm["cuts_s"]) >= 1 and (h in ("924d85eb", "7c8f1362", "12f48977", "70ea715e", "7f98f25b") or len(cm["cuts_s"]) >= 2):
        cut_fam = "MULTI_SHOT_MONTAGE"
    elif any(w in fname for w in ("appearing", "materialize", "solidifying")) or h in ("fb251263", "b0420991"):
        cut_fam = "HOLOGRAM_GHOST_MATERIALIZE"
    elif fam in ("cake_morph_tilt", "cake_assembly_bundt") and (len(cm["morph_jumps_s"]) >= 1 or "chang" in fname or "morph" in fname or "assembl" in fname or "building" in fname or "transform" in fname):
        cut_fam = "STAGE_MORPH_DETENT_SWAP"
    else:
        cut_fam = "SINGLE_CONTINUOUS_TAKE"

    # 4. Camera motion family
    if cut_fam == "MULTI_SHOT_MONTAGE":
        motion_fam = "MULTI_ANGLE_CUTS"
    elif "rotat" in fname or h in ("8cc1d406", "188f72fd", "fe728df1"):
        motion_fam = "TURNTABLE_ORBIT"
    elif cm["scale_growth"] >= 1.24 or "push" in fname or h in ("af6b2281", "b0420991", "fb251263", "c40d3233"):
        motion_fam = "DOLLY_PUSH_IN"
    elif cm["bg_flow"] >= 0.14 or angle_fam in ("ARTISAN_BENCH_HANDS_30DEG", "INTIMATE_CANDLE_FACE_CU") and cm["bg_flow"] >= 0.085:
        motion_fam = "HANDHELD_DRIFT_RACK"
    else:
        motion_fam = "LOCKED_STATIC"

    # 5. Shot scale family
    if cut_fam == "MULTI_SHOT_MONTAGE":
        scale_fam = "MULTI_SCALE_COVERAGE"
    elif motion_fam == "DOLLY_PUSH_IN":
        scale_fam = "WIDE_TO_CLOSE_PUSH"
    elif angle_fam in ("INTIMATE_CANDLE_FACE_CU", "HIGH_CROWN_WRITING_45DEG"):
        scale_fam = "TIGHT_CLOSE_UP_MACRO"
    elif angle_fam == "TABLE_TABLEAU_EYE_10DEG":
        scale_fam = "MEDIUM_FULL_TABLEAU"
    else:
        scale_fam = "MEDIUM_CLOSE_HERO"

    return {
        "angle_family": angle_fam,
        "cut_family": cut_fam,
        "motion_family": motion_fam,
        "scale_family": scale_fam,
        "layout_family": layout_fam,
    }


def main():
    t0 = time.time()
    ds_path = os.path.join(OUT_DIR, "dataset.json")
    ds = json.load(open(ds_path, "r", encoding="utf-8"))

    groups = {
        "angle_families": {},
        "cut_families": {},
        "motion_families": {},
        "scale_families": {},
        "layout_families": {},
    }
    multi_shot_strips = []

    for it in ds["items"]:
        fpath = os.path.join(TRAIN_DIR, it["filename"])
        if it["kind"] == "video":
            y_split = it["segmentation"]["y_split"]
            cm, sub_frames = detect_cuts_and_motion(fpath, y_split)
        else:
            cm, sub_frames = {
                "cuts_s": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0],
                "morph_jumps_s": [],
                "shots": [{"shot_index": k + 1, "start_s": float(k), "end_s": float(k + 1), "duration_s": 1.0} for k in range(9)],
                "scale_growth": 1.0, "bg_flow": 0.0, "fg_flow": 0.0, "horiz_flow": 0.0,
            }, []

        fams = classify_families(it, cm)
        cam_preset = CAMERA_RIG_PRESETS.get(fams["angle_family"], CAMERA_RIG_PRESETS["HERO_PEDESTAL_3Q_25DEG"])

        # Save multi-shot strip if video has multiple detected shots
        subshot_asset = None
        if len(sub_frames) >= 2:
            thumbs = [cv2.cvtColor(cv2.resize(sf, (240, 135), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB) for sf in sub_frames[:5]]
            strip = np.hstack(thumbs)
            sp = os.path.join(SUBSHOTS_DIR, f"{it['id']}_shots.webp")
            Image.fromarray(strip).save(sp, "WEBP", quality=82)
            subshot_asset = f"assets/bday-training/subshots/{it['id']}_shots.webp"
            multi_shot_strips.append(it["id"])

        it["cinematography"] = {
            **fams,
            "n_shots": len(cm["shots"]),
            "cuts_s": cm["cuts_s"],
            "morph_jumps_s": cm["morph_jumps_s"],
            "shots": cm["shots"],
            "scale_growth": cm["scale_growth"],
            "bg_flow": cm["bg_flow"],
            "fg_flow": cm["fg_flow"],
            "camera_rig_preset": cam_preset,
            "subshots_strip": subshot_asset,
        }

        for gk, fk in [("angle_families", "angle_family"), ("cut_families", "cut_family"),
                       ("motion_families", "motion_family"), ("scale_families", "scale_family"),
                       ("layout_families", "layout_family")]:
            val = fams[fk]
            groups[gk].setdefault(val, []).append({
                "id": it["id"], "filename": it["filename"], "title": it["title"],
                "n_shots": len(cm["shots"]), "cuts_s": cm["cuts_s"], "scale_growth": cm["scale_growth"]
            })

    ds["angle_families"] = {k: len(v) for k, v in groups["angle_families"].items()}
    ds["cut_families"] = {k: len(v) for k, v in groups["cut_families"].items()}
    ds["motion_families"] = {k: len(v) for k, v in groups["motion_families"].items()}
    ds["scale_families"] = {k: len(v) for k, v in groups["scale_families"].items()}
    ds["layout_families"] = {k: len(v) for k, v in groups["layout_families"].items()}
    ds["camera_rig_presets"] = CAMERA_RIG_PRESETS

    # Save enriched dataset & dedicated families_angles_cuts.json
    with open(os.path.join(TRAIN_DIR, "labels.json"), "w", encoding="utf-8") as f:
        json.dump(ds, f, indent=2, ensure_ascii=False)
    with open(os.path.join(TRAIN_DIR, "families_angles_cuts.json"), "w", encoding="utf-8") as f:
        json.dump({
            "summary": {
                "angle_families": ds["angle_families"],
                "cut_families": ds["cut_families"],
                "motion_families": ds["motion_families"],
                "scale_families": ds["scale_families"],
                "layout_families": ds["layout_families"],
            },
            "camera_rig_presets": CAMERA_RIG_PRESETS,
            "groups": groups,
        }, f, indent=2, ensure_ascii=False)
    with open(ds_path, "w", encoding="utf-8") as f:
        json.dump(ds, f, indent=2, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "dataset.js"), "w", encoding="utf-8") as f:
        f.write("window.BDAY_DATASET = " + json.dumps(ds, ensure_ascii=False) + ";\n")

    print(f"[ANGLES & CUTS] Analyzed 78 items in {time.time() - t0:.1f}s!")
    print("  Angle families :", ds["angle_families"])
    print("  Cut families   :", ds["cut_families"])
    print("  Motion families:", ds["motion_families"])
    print("  Scale families :", ds["scale_families"])
    print("  Layout families:", ds["layout_families"])
    print(f"  Multi-shot sub-strips saved: {len(multi_shot_strips)} -> {multi_shot_strips}")


if __name__ == "__main__":
    main()
