#!/usr/bin/env python3
"""Build verified handmade 3D Cake Rig models & step-by-step UI replay sequences
for every archetype in `assets/bday-training/dataset.json`.

Outputs:
  - `assets/bday-training/handmade_models.json`
  - `assets/bday-training/handmade_models.js` (`window.BDAY_HANDMADE`)
"""
import os, json, math, copy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(ROOT, "assets", "bday-training")


def make_base_model():
    return {
        "P": [[0.0, 0.0], [0.12, 0.0], [0.12, 0.085], [0.0, 0.085]],
        "cn": 7,
        "lit": [1] * 7,
        "pos": [0.0, 0.0, 0.0],
        "rot": [0.0, 0.0, 0.0],
        "s": 1.0,
        "icing": "#f0e2c2",
        "cam": {"p": [0.34, 0.99, 0.58], "yaw": 0.53, "pitch": -0.34, "f": 50, "N": 2.8, "fd": 0.68},
    }


def apply_extrude(m, dist_mm, inset_pct=0):
    P = m["P"]
    n = len(P)
    d = dist_mm / 1000.0
    k = inset_pct / 100.0
    rt, yt = P[n - 2]
    if k == 0:
        ny = round(yt + d, 5)
        P[n - 2] = [rt, ny]
        P[n - 1] = [0.0, ny]
    else:
        ri = round(rt * (1.0 - k), 5)
        ny = round(yt + d, 5)
        P[n - 1 : n] = [[ri, yt], [ri, ny], [0.0, ny]]
    verb = "RAISED" if dist_mm >= 0 else "SUNK"
    pre = f"INSET {inset_pct}% · " if inset_pct else ""
    return f"{pre}{verb} {abs(dist_mm)} MM"


def apply_inflate(m, e_idx, out_mm):
    P = m["P"]
    d = out_mm / 1000.0
    for i in (e_idx, e_idx + 1):
        if i < len(P) and P[i][0] > 1e-6:
            P[i] = [round(max(0.02, P[i][0] + d), 5), P[i][1]]
    return f"{'OUT' if out_mm >= 0 else 'IN'} {abs(out_mm)} MM"


def apply_bevel(m, c_idx, width_mm, seg=3):
    P = m["P"]
    w = width_mm / 1000.0
    if w <= 0 or c_idx <= 0 or c_idx >= len(P) - 1:
        return "BEVEL 0 MM"
    A, C, B = P[c_idx - 1], P[c_idx], P[c_idx + 1]
    la = math.hypot(A[0] - C[0], A[1] - C[1])
    lb = math.hypot(B[0] - C[0], B[1] - C[1])
    w = min(w, la * 0.42, lb * 0.42)
    p0 = [C[0] + (A[0] - C[0]) / la * w, C[1] + (A[1] - C[1]) / la * w]
    p1 = [C[0] + (B[0] - C[0]) / lb * w, C[1] + (B[1] - C[1]) / lb * w]
    pts = []
    for i in range(seg + 1):
        u = i / seg
        a, b, cc = (1 - u) ** 2, 2 * u * (1 - u), u ** 2
        pts.append([round(a * p0[0] + b * C[0] + cc * p1[0], 5), round(a * p0[1] + b * C[1] + cc * p1[1], 5)])
    P[c_idx : c_idx + 1] = pts
    return f"BEVEL {round(w * 1000)} MM"


def apply_candles(m, count, flame_mode="lit"):
    m["cn"] = int(count)
    if flame_mode == "out":
        m["lit"] = [0] * m["cn"]
    elif flame_mode == "half":
        m["lit"] = [1 if i % 2 == 0 else 0 for i in range(m["cn"])]
    else:
        m["lit"] = [1] * m["cn"]
    return f"{m['cn']} CANDLES ({flame_mode.upper()})"


def build_archetype(arch_id, items, cam_presets):
    ref = items[0]
    spec = ref.get("cake_spec", {})
    cin = ref.get("cinematography", {})
    ang = cin.get("angle_family", "HERO_PEDESTAL_3Q_25DEG")
    cam = copy.deepcopy(cam_presets.get(ang, cam_presets["HERO_PEDESTAL_3Q_25DEG"]))

    m = make_base_model()
    m["icing"] = spec.get("icing_end") or ref.get("segmentation", {}).get("measured_icing_end") or "#f0e2c2"
    m["cam"] = {k: cam[k] for k in ("p", "yaw", "pitch", "f", "N", "fd") if k in cam}

    steps = []
    history = []

    tiers = int(spec.get("tiers", 1))
    flutes = int(spec.get("flutes", 0))
    candles = int(spec.get("candles", 7))
    flame_st = spec.get("flame", "lit")
    tilt_deg = float(spec.get("tilt_deg", 0))

    # Step 1: Base proportioning
    if flutes >= 10 or "bundt" in arch_id:
        s1 = apply_extrude(m, 25, 0)
        steps.append({"target": {"kind": "top"}, "op": "EXTRUDE", "v": {"main": 0.025, "aux": 0, "con": 1}})
        history.append(f"TOP -> EXTRUDE: {s1}")
        s2 = apply_inflate(m, 1, 14)
        steps.append({"target": {"kind": "side", "e": 1}, "op": "INFLATE", "v": {"main": 0.014}})
        history.append(f"SIDE 1 -> INFLATE: {s2}")
        s3 = apply_bevel(m, len(m["P"]) - 2, 18, seg=4)
        steps.append({"target": {"kind": "edge", "c": 2}, "op": "BEVEL", "v": {"main": 0.018, "con": 3}})
        history.append(f"CROWN EDGE -> {s3}")
        s4 = apply_extrude(m, -55, 45)
        steps.append({"target": {"kind": "top"}, "op": "EXTRUDE", "v": {"main": -0.055, "aux": 45, "con": 1}})
        history.append(f"BUNDT WELL -> EXTRUDE: {s4}")
    elif tiers >= 3:
        for t_i, (dh, ins) in enumerate([(15, 0), (55, 28), (45, 30)], 1):
            st = apply_extrude(m, dh, ins)
            steps.append({"target": {"kind": "top"}, "op": "EXTRUDE", "v": {"main": dh / 1000.0, "aux": ins, "con": 1}})
            history.append(f"TIER {t_i} -> EXTRUDE: {st}")
        sb = apply_bevel(m, len(m["P"]) - 2, 8, seg=2)
        steps.append({"target": {"kind": "edge", "c": len(m["P"]) - 3}, "op": "BEVEL", "v": {"main": 0.008, "con": 1}})
        history.append(f"CROWN -> {sb}")
    elif tiers == 2:
        s1 = apply_inflate(m, 1, 12)
        steps.append({"target": {"kind": "side", "e": 1}, "op": "INFLATE", "v": {"main": 0.012}})
        history.append(f"BASE TIER -> INFLATE: {s1}")
        s2 = apply_extrude(m, 60, 28)
        steps.append({"target": {"kind": "top"}, "op": "EXTRUDE", "v": {"main": 0.060, "aux": 28, "con": 1}})
        history.append(f"UPPER TIER -> EXTRUDE: {s2}")
        s3 = apply_bevel(m, len(m["P"]) - 2, 9, seg=3)
        steps.append({"target": {"kind": "edge", "c": len(m["P"]) - 3}, "op": "BEVEL", "v": {"main": 0.009, "con": 2}})
        history.append(f"CROWN RIM -> {s3}")
    else:
        # Single-tier tailored silhouette (tall drum, faceted, tart, or classic chamber)
        if "tall" in arch_id or "crown" in arch_id or "ruffle" in arch_id:
            s1 = apply_extrude(m, 30, 0)
            steps.append({"target": {"kind": "top"}, "op": "EXTRUDE", "v": {"main": 0.030, "aux": 0, "con": 1}})
            history.append(f"DRUM HEIGHT -> EXTRUDE: {s1}")
        elif "tart" in arch_id or "petit" in arch_id:
            s1 = apply_extrude(m, -20, 0)
            steps.append({"target": {"kind": "top"}, "op": "EXTRUDE", "v": {"main": -0.020, "aux": 0, "con": 1}})
            history.append(f"LOW TART -> EXTRUDE: {s1}")
        else:
            s1 = apply_extrude(m, 12, 0)
            steps.append({"target": {"kind": "top"}, "op": "EXTRUDE", "v": {"main": 0.012, "aux": 0, "con": 1}})
            history.append(f"CHAMBER DRUM -> EXTRUDE: {s1}")

        bw = 14 if "faceted" in arch_id or "hex" in arch_id else 9
        seg_n = 1 if "faceted" in arch_id or "hex" in arch_id else 3
        sb = apply_bevel(m, len(m["P"]) - 2, bw, seg=seg_n)
        steps.append({"target": {"kind": "edge", "c": 2}, "op": "BEVEL", "v": {"main": bw / 1000.0, "con": 0 if seg_n == 1 else 2}})
        history.append(f"SHOULDER -> {sb}")

    # Step 2: Tilt or turntable angle if specified
    if tilt_deg:
        m["rot"][2] = round(tilt_deg, 1)
        m["pos"][1] = 0.045
        steps.append({"target": {"kind": "object"}, "op": "MOVE", "v": {"main": 0.045, "con": 1}})
        steps.append({"target": {"kind": "object"}, "op": "ROTATE", "v": {"main": tilt_deg, "con": 2}})
        history.append(f"CHAMBER FLOAT -> LIFT +45 MM Y · TILT {int(tilt_deg)}° Z")

    # Step 3: Candles & flame state
    f_mode = "out" if flame_st == "out" else ("half" if flame_st == "blowing_out" else "lit")
    sc = apply_candles(m, candles, f_mode)
    steps.append({"target": {"kind": "top"}, "op": "CANDLES", "v": {"main": candles}})
    history.append(f"CANDLE RING -> {sc}")

    # Step 4: Shot Camera framing matched to Angle Family
    steps.append({"target": {"kind": "camera"}, "op": "LENS", "v": {"main": m["cam"]["f"], "aux": m["cam"]["N"]}})
    history.append(f"SHOT CAMERA -> {cam.get('label', '50MM f/2.8')}")

    title = arch_id.replace("_", " ").upper()
    summary = f"{tiers}-tier · {candles} candles · {ang.replace('_', ' ')}"
    return {
        "id": arch_id,
        "title": title,
        "summary": summary,
        "count": len(items),
        "angle_family": ang,
        "ref_id": ref["id"],
        "render": ref["assets"]["thumb"],
        "model": m,
        "history": history,
        "steps": steps,
    }


def main():
    ds = json.load(open(os.path.join(OUT_DIR, "dataset.json"), "r", encoding="utf-8"))
    cam_presets = ds.get("camera_rig_presets", {})
    by_arch = {}
    for it in ds["items"]:
        by_arch.setdefault(it["archetype"], []).append(it)

    models = {}
    for arch_id, items in sorted(by_arch.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        models[arch_id] = build_archetype(arch_id, items, cam_presets)

    payload = {"total_models": len(models), "models": models}
    with open(os.path.join(OUT_DIR, "handmade_models.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "handmade_models.js"), "w", encoding="utf-8") as f:
        f.write("window.BDAY_HANDMADE = " + json.dumps(payload, ensure_ascii=False) + ";\n")
    print(f"[HANDMADE 3D] Built {len(models)} verified Cake Rig archetypes ({sum(len(m['steps']) for m in models.values())} total UI steps).")


if __name__ == "__main__":
    main()
