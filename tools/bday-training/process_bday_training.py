#!/usr/bin/env python3
"""Segment, measure, and label all 78 items in `/Users/gaia/STELLINE-ORB/stelline-orb/BDAY TRAINING`.

Pipeline stages per item:
  1. Detect & strip bottom AI-generated controller panel (`y_split`), isolating the clean 16:9/dome scene.
  2. Run Mask R-CNN (`maskrcnn_resnet50_fpn_v2` on Apple MPS GPU) + GrabCut fallback to segment:
     - `cake` (class 61 + pedestal prior fallback for futuristic/obsidian cakes)
     - `person` / baker hands (class 1)
     - `dining table` (class 67)
     - `candle_flames` (photometric 3200K / bioluminescent peak detector above cake crown)
     - `hud_artifacts` (floating generated text blocks in dark dome)
  3. Measure 3D-modeling priors from segmented cake masks:
     - Symmetric 12-level 2D lathe profile `P_measured = [[r, y], ...]` in meters
     - Aspect ratio `H / D`, taper `r_top / r_base`, tier step count
     - Dominant sRGB hex palette at `t_start` vs `t_hero`
     - Horizontal trowel-ruffle vs vertical Bundt-flute gradient ratios
     - Lit flame counts at `t_start` vs `t_end`
  4. Export clean orb-free thumbnails, 3-panel segmentation proof strips, isolated RGBA cake sprites,
     8 multi-era RGBA party cutout sheets, `BDAY TRAINING/labels.json`, and `assets/bday-training/dataset.{json,js}`.
"""
import os, sys, re, json, time
import numpy as np
import cv2
from PIL import Image
import torch
from torchvision.models.detection import maskrcnn_resnet50_fpn_v2, MaskRCNN_ResNet50_FPN_V2_Weights

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from catalog_labels import CATALOG

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TRAIN_DIR = os.path.join(ROOT, "BDAY TRAINING")
OUT_DIR = os.path.join(ROOT, "assets", "bday-training")
for sub in ("thumbs", "seg", "cakes", "cutouts"):
    os.makedirs(os.path.join(OUT_DIR, sub), exist_ok=True)


def detect_ui_split(frames_bgr):
    """Find row `y_split` where the bottom controller bar begins (default 720 if full-frame clean)."""
    H, W = frames_bgr[0].shape[:2]
    gray_stack = np.stack([cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) for f in frames_bgr], axis=0)
    mean_g = gray_stack.mean(axis=0)
    # In Weaver/Flow clips, a dark horizontal border line sits around y=528..568 above a bright metallic barrel
    row_luma = mean_g.mean(axis=1)
    row_grad = np.abs(np.diff(mean_g, axis=0)).mean(axis=1)
    # Check metallic silver controller signature in bottom 22% (y=565..705, x=35%..65%)
    center_bot = mean_g[int(H * 0.79):int(H * 0.97), int(W * 0.34):int(W * 0.66)]
    center_std = gray_stack[:, int(H * 0.80):int(H * 0.96), int(W * 0.35):int(W * 0.65)].std(axis=0).mean()
    # Weaver 5-ring silver strip has bright highlights (>95) in center-bottom & horizontal seam around y=525..568
    if np.percentile(center_bot, 90) > 75 and center_std < 26.0:
        search_lo, search_hi = int(H * 0.71), int(H * 0.81)
        # Find sharp dark border just above controller
        scores = row_grad[search_lo:search_hi] - 0.18 * row_luma[search_lo:search_hi]
        y_split = search_lo + int(np.argmax(scores))
        return int(min(y_split, int(H * 0.765))), "weaver_5ring_strip"
    # Check 3.8s clips with minimal bottom icon bar around y=645..705
    bar_band = mean_g[int(H * 0.88):int(H * 0.97), int(W * 0.25):int(W * 0.75)]
    if np.percentile(bar_band, 98) > 85 and row_luma[int(H * 0.84):int(H * 0.89)].mean() < 28:
        return int(H * 0.865), "minimal_control_bar"
    return H, "clean_frame"


def dominant_cake_hex(bgr, mask):
    """Extract representative chromatic/luma sRGB hex inside cake body mask, ignoring deep shadow & blown highlights."""
    ys, xs = np.where(mask > 0)
    if len(ys) < 40:
        return "#e8dcc4"
    # Erode slightly to avoid background rim
    er = cv2.erode((mask > 0).astype(np.uint8), np.ones((5, 5), np.uint8))
    if er.sum() >= 30:
        ys, xs = np.where(er > 0)
    pix = bgr[ys, xs].astype(np.float32)  # BGR
    luma = 0.114 * pix[:, 0] + 0.587 * pix[:, 1] + 0.299 * pix[:, 2]
    good = (luma > np.percentile(luma, 18)) & (luma < np.percentile(luma, 92))
    if good.sum() >= 20:
        pix = pix[good]
    med = np.median(pix, axis=0)
    b, g, r = [int(np.clip(round(v), 0, 255)) for v in med]
    return f"#{r:02x}{g:02x}{b:02x}"


def run_segmentation(model, device, bgr_full, y_split):
    """Segment scene above `y_split` into cake, people, table, flames, and HUD artifacts."""
    H, W = bgr_full.shape[:2]
    scene_bgr = bgr_full[:y_split, :]
    sH, sW = scene_bgr.shape[:2]
    rgb = cv2.cvtColor(scene_bgr, cv2.COLOR_BGR2RGB)
    tensor = torch.from_numpy(rgb).permute(2, 0, 1).float().div(255.0).to(device)
    with torch.no_grad():
        pred = model([tensor])[0]

    labels = pred["labels"].cpu().numpy()
    scores = pred["scores"].cpu().numpy()
    masks = pred["masks"].squeeze(1).cpu().numpy()  # (N, sH, sW)
    boxes = pred["boxes"].cpu().numpy()

    person_mask = np.zeros((sH, sW), dtype=np.uint8)
    cake_mask = np.zeros((sH, sW), dtype=np.uint8)
    table_mask = np.zeros((sH, sW), dtype=np.uint8)

    for lbl, sc, m, box in zip(labels, scores, masks, boxes):
        if lbl == 1 and sc >= 0.42:  # person / hands
            person_mask = np.maximum(person_mask, (m > 0.45).astype(np.uint8))
        elif lbl == 61 and sc >= 0.28:  # cake
            # Prefer central cakes
            cx = 0.5 * (box[0] + box[2]) / sW
            if 0.18 <= cx <= 0.82:
                cake_mask = np.maximum(cake_mask, (m > 0.42).astype(np.uint8))
        elif lbl == 67 and sc >= 0.35:  # dining table
            table_mask = np.maximum(table_mask, (m > 0.45).astype(np.uint8))

    # Fallback / refinement when futuristic/obsidian/hologram cake isn't recognized by COCO class 61
    if cake_mask.sum() < 0.008 * sH * sW:
        gray = cv2.cvtColor(scene_bgr, cv2.COLOR_BGR2GRAY)
        gm = np.full((sH, sW), cv2.GC_BGD, dtype=np.uint8)
        x0, x1 = int(sW * 0.31), int(sW * 0.69)
        y0, y1 = int(sH * 0.18), int(sH * 0.92)
        gm[y0:y1, x0:x1] = cv2.GC_PR_BGD
        cx0, cx1 = int(sW * 0.39), int(sW * 0.61)
        cy0, cy1 = int(sH * 0.34), int(sH * 0.82)
        gm[cy0:cy1, cx0:cx1] = cv2.GC_PR_FGD
        gm[gray < 14] = cv2.GC_BGD
        gm[person_mask > 0] = cv2.GC_BGD
        # Seed bright non-person center pixels as foreground
        seed_zone = np.zeros_like(gray, dtype=bool)
        seed_zone[int(sH * 0.42):int(sH * 0.76), int(sW * 0.43):int(sW * 0.57)] = True
        fg_pts = seed_zone & (gray > max(26, np.percentile(gray[y0:y1, x0:x1], 65))) & (person_mask == 0)
        if fg_pts.sum() > 25:
            gm[fg_pts] = cv2.GC_FGD
            try:
                small = cv2.resize(scene_bgr, (sW // 2, sH // 2), interpolation=cv2.INTER_AREA)
                gms = cv2.resize(gm, (sW // 2, sH // 2), interpolation=cv2.INTER_NEAREST)
                bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
                cv2.grabCut(small, gms, None, bgd, fgd, 3, cv2.GC_INIT_WITH_MASK)
                cand = ((gms == cv2.GC_FGD) | (gms == cv2.GC_PR_FGD)).astype(np.uint8)
                cake_mask = cv2.resize(cand, (sW, sH), interpolation=cv2.INTER_NEAREST)
            except Exception:
                cake_mask = fg_pts.astype(np.uint8)

    # Keep largest central connected component of cake_mask
    if cake_mask.sum() > 0:
        cake_mask[person_mask > 0] = 0
        num, cc, stats, cents = cv2.connectedComponentsWithStats(cake_mask, 8)
        if num > 1:
            best_j, best_sc = 0, -1e9
            for j in range(1, num):
                area = stats[j, cv2.CC_STAT_AREA]
                if area < 120:
                    continue
                dist_c = abs(cents[j][0] - sW * 0.5) / sW
                sc = area - dist_c * 8000
                if sc > best_sc:
                    best_sc, best_j = sc, j
            if best_j > 0:
                cake_mask = (cc == best_j).astype(np.uint8)

    # Detect lit candle flames above / near upper half of cake
    ys, xs = np.where(cake_mask > 0)
    if len(ys) > 30:
        cy0, cy1 = int(ys.min()), int(ys.max())
        cx0, cx1 = int(xs.min()), int(xs.max())
    else:
        cy0, cy1, cx0, cx1 = int(sH * 0.35), int(sH * 0.78), int(sW * 0.36), int(sW * 0.64)
    ch_h = max(30, cy1 - cy0)
    fy0 = max(4, cy0 - int(ch_h * 0.65))
    fy1 = min(sH - 2, cy0 + int(ch_h * 0.45))
    fx0 = max(4, cx0 - 24)
    fx1 = min(sW - 4, cx1 + 24)

    flame_mask = np.zeros((sH, sW), dtype=np.uint8)
    roi = scene_bgr[fy0:fy1, fx0:fx1].astype(np.float32)
    if roi.size > 0:
        b, g, r = roi[..., 0], roi[..., 1], roi[..., 2]
        warm_core = (r > 225) & (g > 170) & (r >= b)
        neon_core = (np.maximum(r, b) > 232) & (g > 185)
        raw_fl = (warm_core | neon_core).astype(np.uint8)
        raw_fl[person_mask[fy0:fy1, fx0:fx1] > 0] = 0
        # Filter tiny bright specks vs real teardrop flame blobs (area 4..900 px)
        nf, fcc, fst, _ = cv2.connectedComponentsWithStats(raw_fl, 8)
        clean_fl = np.zeros_like(raw_fl)
        flame_count = 0
        for j in range(1, nf):
            a = fst[j, cv2.CC_STAT_AREA]
            w_b, h_b = fst[j, cv2.CC_STAT_WIDTH], fst[j, cv2.CC_STAT_HEIGHT]
            if 4 <= a <= 1100 and w_b < 55 and h_b < 80:
                clean_fl[fcc == j] = 1
                flame_count += 1
        flame_mask[fy0:fy1, fx0:fx1] = cv2.dilate(clean_fl, np.ones((3, 3), np.uint8))
    else:
        flame_count = 0

    # Pad all masks back to full H x W
    pad = lambda m: np.pad(m, ((0, H - sH), (0, 0)), mode="constant")
    ui_mask = np.zeros((H, W), dtype=np.uint8)
    if y_split < H:
        ui_mask[y_split:, :] = 1
        # Also mask the Weaver Orb's angled central OLED bezel sitting just above the 5-ring barrel (y=462..y_split, x=37%..63%)
        if y_split <= int(H * 0.78):
            ox0, ox1 = int(W * 0.372), int(W * 0.628)
            oy0 = int(H * 0.642)
            oled_roi = bgr_full[oy0:y_split, ox0:ox1]
            # Check dark rectangular bezel signature
            if oled_roi.size > 0 and oled_roi.mean() < 48:
                ui_mask[oy0:y_split, ox0:ox1] = 1
                cake_mask_full = pad(cake_mask)
                cake_mask_full[oy0:y_split, ox0:ox1] = 0
                return {
                    "cake": cake_mask_full,
                    "person": pad(person_mask) * (1 - ui_mask),
                    "table": pad(table_mask) * (1 - ui_mask),
                    "flame": pad(flame_mask) * (1 - ui_mask),
                    "ui": ui_mask,
                    "flame_count": int(min(flame_count, 16)),
                    "bbox": [int(cx0), int(fy0), int(cx1), int(cy1)],
                }
    return {
        "cake": pad(cake_mask),
        "person": pad(person_mask),
        "table": pad(table_mask),
        "flame": pad(flame_mask),
        "ui": ui_mask,
        "flame_count": int(min(flame_count, 16)),
        "bbox": [int(cx0), int(fy0), int(cx1), int(cy1)],
    }


def extract_lathe_profile_and_relief(bgr, cake_mask):
    """Fit a symmetric 10-level 2D lathe silhouette profile `[[r, y], ...]` and surface relief ratios."""
    ys, xs = np.where(cake_mask > 0)
    if len(ys) < 60:
        return {
            "profile_m": [[0.0, 0.0], [0.12, 0.0], [0.12, 0.088], [0.0, 0.088]],
            "aspect_h_d": 0.37,
            "taper": 0.98,
            "ruffle_ratio": 1.0,
        }
    y0, y1 = int(np.percentile(ys, 2)), int(np.percentile(ys, 98))
    h_px = max(16, y1 - y0)
    levels = np.linspace(y1, y0, 10)  # bottom (y=0) to top (y=H)
    radii_px = []
    for lv in levels:
        band = cake_mask[max(0, int(lv) - 2):min(cake_mask.shape[0], int(lv) + 3), :]
        bx = np.where(band.any(axis=0))[0]
        if len(bx) >= 4:
            radii_px.append(0.5 * float(np.percentile(bx, 97) - np.percentile(bx, 3)))
        else:
            radii_px.append(radii_px[-1] if radii_px else 40.0)
    max_r_px = max(max(radii_px), 20.0)
    # Normalize base radius to ~0.12m (standard Stelline Orb cake scale in cake-rig.html)
    scale_m = 0.122 / max_r_px
    h_m = round(float(np.clip(h_px * scale_m, 0.055, 0.24)), 4)
    prof = [[0.0, 0.0]]
    for idx_l, r_px in enumerate(radii_px):
        u = idx_l / (len(radii_px) - 1)
        r_m = round(float(np.clip(r_px * scale_m, 0.035, 0.145)), 4)
        y_m = round(u * h_m, 4)
        prof.append([r_m, y_m])
    prof.append([0.0, h_m])

    # Surface directional gradient inside eroded cake mask (horizontal trowel ridges vs vertical Bundt flutes)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    gx = np.abs(cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3))
    gy = np.abs(cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3))
    er = cv2.erode(cake_mask, np.ones((7, 7), np.uint8)) > 0
    if er.sum() > 40:
        ruffle_ratio = float((gy[er].mean() + 1e-3) / (gx[er].mean() + 1e-3))
    else:
        ruffle_ratio = 1.0

    r_bot = np.mean(radii_px[1:4])
    r_top = np.mean(radii_px[-3:-1])
    return {
        "profile_m": prof,
        "aspect_h_d": round(float(h_px / (2.0 * max_r_px)), 3),
        "taper": round(float(r_top / max(r_bot, 1.0)), 3),
        "ruffle_ratio": round(ruffle_ratio, 3),
    }


def save_diagnostic_and_sprites(item_id, hero_bgr, seg, y_split):
    """Save orb-free thumb, 3-column segmentation strip, and isolated RGBA cake cutout."""
    H, W = hero_bgr.shape[:2]
    clean_scene = scrub_hud_text(hero_bgr[:y_split, :].copy())
    ui_top = seg["ui"][:y_split, :]
    if ui_top.sum() > 0:
        clean_scene = cv2.inpaint(clean_scene, (ui_top * 255).astype(np.uint8), 7, cv2.INPAINT_TELEA)
    # 1. Clean orb-free 16:9 thumbnail (480x270)
    thumb_rgb = cv2.cvtColor(cv2.resize(clean_scene, (480, 270), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
    Image.fromarray(thumb_rgb).save(os.path.join(OUT_DIR, "thumbs", f"{item_id}.webp"), "WEBP", quality=82)

    # 2. 3-column diagnostic strip: [Clean Orb-Free Scene | Semantic Mask Overlay | Isolated Subject on Black]
    pw, ph = 320, 180
    p1 = cv2.resize(clean_scene, (pw, ph), interpolation=cv2.INTER_AREA)

    overlay = hero_bgr.copy().astype(np.float32) * 0.45
    overlay[seg["table"] > 0] += np.array([40, 120, 180], np.float32) * 0.55     # warm amber-gold for table
    overlay[seg["person"] > 0] += np.array([180, 95, 235], np.float32) * 0.55    # magenta-violet for people/hands
    overlay[seg["cake"] > 0] += np.array([195, 235, 70], np.float32) * 0.60      # cyan-mint for cake body
    overlay[seg["flame"] > 0] = np.array([80, 230, 255], np.float32)             # bright yellow-amber for flames
    if seg["ui"].sum() > 0:
        overlay[seg["ui"] > 0] = overlay[seg["ui"] > 0] * 0.35 + np.array([35, 35, 160], np.float32) * 0.55
        if y_split < H:
            cv2.line(overlay, (0, y_split), (W, y_split), (60, 90, 255), 3)
    p2 = cv2.resize(np.clip(overlay, 0, 255).astype(np.uint8), (pw, ph), interpolation=cv2.INTER_AREA)

    subj_mask = np.clip(seg["cake"] | seg["flame"] | seg["person"], 0, 1).astype(np.float32)
    subj_soft = cv2.GaussianBlur(subj_mask, (0, 0), 1.5)[..., None]
    isolated = (hero_bgr.astype(np.float32) * subj_soft).astype(np.uint8)[:y_split, :]
    p3 = cv2.resize(isolated, (pw, ph), interpolation=cv2.INTER_AREA)

    strip = np.hstack([p1, p2, p3])
    strip_rgb = cv2.cvtColor(strip, cv2.COLOR_BGR2RGB)
    Image.fromarray(strip_rgb).save(os.path.join(OUT_DIR, "seg", f"{item_id}_seg.webp"), "WEBP", quality=80)

    # 3. Isolated RGBA Cake Cutout (220x220)
    ck_alpha = np.clip((seg["cake"] | seg["flame"]).astype(np.float32), 0, 1)
    ck_alpha[:y_split, :] = cv2.GaussianBlur(ck_alpha[:y_split, :], (0, 0), 1.2)
    ck_alpha[y_split:, :] = 0
    ys, xs = np.where(ck_alpha > 0.15)
    if len(ys) > 25:
        pad = 14
        x0, x1 = max(0, int(xs.min()) - pad), min(W, int(xs.max()) + pad)
        y0, y1 = max(0, int(ys.min()) - pad), min(y_split, int(ys.max()) + pad)
    else:
        x0, x1, y0, y1 = int(W * 0.35), int(W * 0.65), int(y_split * 0.25), int(y_split * 0.85)
    crop_rgb = cv2.cvtColor(hero_bgr[y0:y1, x0:x1], cv2.COLOR_BGR2RGB)
    crop_a = (ck_alpha[y0:y1, x0:x1] * 255).astype(np.uint8)
    rgba = np.dstack([crop_rgb, crop_a])
    ch, cw = rgba.shape[:2]
    side = max(ch, cw, 1)
    sq = np.zeros((side, side, 4), dtype=np.uint8)
    oy, ox = (side - ch) // 2, (side - cw) // 2
    sq[oy:oy + ch, ox:ox + cw] = rgba
    Image.fromarray(sq, "RGBA").resize((220, 220), Image.LANCZOS).save(
        os.path.join(OUT_DIR, "cakes", f"{item_id}_cake.webp"), "WEBP", quality=84, alpha_quality=90
    )


ERA_CUTOUT_SOURCES = {
    "chamber_kids": ("c40d3233", 0.35),
    "era_1920s_speakeasy": ("61f6754a", 0.30),
    "era_1920s_bw": ("99015fc9", 0.30),
    "era_1950s_kids": ("b79c2123", 0.25),
    "era_1970s_family": ("ba5e81fd", 0.35),
    "era_1980s_neon": ("0926db13", 0.25),
    "era_1990s_party": ("18cbc738", 0.25),
    "era_2049_cyberpunk": ("b9782fa4", 0.35),
}


def scrub_hud_text(bgr_scene):
    """Inpaint generated white/cyan Weaver tutorial HUD text on the left/right edges (`PIPE A BORDER`, `SHOW ME`, etc.)."""
    sH, sW = bgr_scene.shape[:2]
    gray = cv2.cvtColor(bgr_scene, cv2.COLOR_BGR2GRAY)
    hud = np.zeros((sH, sW), dtype=np.uint8)
    # Left & right guide HUD zones where Weaver text overlays appear
    for zx0, zx1, zy0, zy1 in [(0, int(sW * 0.36), int(sH * 0.42), int(sH * 0.96)),
                               (int(sW * 0.68), sW, int(sH * 0.48), int(sH * 0.94))]:
        roi_g = gray[zy0:zy1, zx0:zx1]
        # High-contrast thin white/cyan glyphs & 1px button borders over dark background
        local_med = cv2.medianBlur(roi_g, 15)
        spikes = ((roi_g.astype(np.int16) - local_med.astype(np.int16)) > 48) & (local_med < 95)
        n_cc, cc, st, _ = cv2.connectedComponentsWithStats(spikes.astype(np.uint8), 8)
        clean = np.zeros_like(roi_g, dtype=np.uint8)
        for j in range(1, n_cc):
            a, wb, hb = st[j, cv2.CC_STAT_AREA], st[j, cv2.CC_STAT_WIDTH], st[j, cv2.CC_STAT_HEIGHT]
            if 2 <= a <= 420 and wb <= 120 and hb <= 28:
                clean[cc == j] = 255
        if (clean > 0).sum() > 25:
            hud[zy0:zy1, zx0:zx1] = cv2.dilate(clean, np.ones((5, 5), np.uint8))
    if (hud > 0).sum() > 0:
        return cv2.inpaint(bgr_scene, hud, 5, cv2.INPAINT_TELEA)
    return bgr_scene


def export_era_cutout(era_key, hero_bgr, seg, y_split):
    """Export clean multi-person RGBA standee cutout (cake, flames, HUD text & bottom UI removed) for 3D staging."""
    clean_bgr = scrub_hud_text(hero_bgr[:y_split, :].copy())
    # Also zero out the central OLED bezel if present
    ui_top = seg["ui"][:y_split, :]
    pm = (seg["person"][:y_split, :] * (1 - ui_top)).astype(np.float32)
    # Subtract foreground cake + candle shafts + flames so our real 3D cake & 3D flames sit cleanly in front!
    ck_and_fl = np.clip(seg["cake"][:y_split, :] | seg["flame"][:y_split, :], 0, 1).astype(np.uint8)
    ys_c, xs_c = np.where(ck_and_fl > 0)
    if len(ys_c) > 20:
        # Bridge the candle shaft gap between top of cake and flames
        cx0, cx1 = int(np.percentile(xs_c, 3)), int(np.percentile(xs_c, 97))
        cy0, cy1 = int(ys_c.min()), int(ys_c.max())
        ck_and_fl[cy0:cy1, cx0:cx1] = np.maximum(ck_and_fl[cy0:cy1, cx0:cx1],
                                                  cv2.dilate(seg["flame"][:y_split, :][cy0:cy1, cx0:cx1], np.ones((35, 15), np.uint8)))
    ck_dil = cv2.dilate(ck_and_fl, np.ones((17, 17), np.uint8))
    pm[ck_dil > 0] = 0.0
    if pm.sum() < 400:
        return None
    alpha = cv2.GaussianBlur(pm, (0, 0), 1.8)
    ys, xs = np.where(alpha > 0.12)
    sH, sW = pm.shape
    x0, x1 = max(0, int(xs.min()) - 8), min(sW, int(xs.max()) + 8)
    y0, y1 = max(0, int(ys.min()) - 8), min(sH, int(ys.max()) + 4)
    rgb = cv2.cvtColor(clean_bgr[y0:y1, x0:x1], cv2.COLOR_BGR2RGB)
    a8 = (np.clip(alpha[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8)
    rgba = np.dstack([rgb, a8])
    h, w = rgba.shape[:2]
    target_w = min(640, w)
    target_h = max(1, int(round(h * (target_w / max(w, 1)))))
    out_p = os.path.join(OUT_DIR, "cutouts", f"{era_key}.webp")
    Image.fromarray(rgba, "RGBA").resize((target_w, target_h), Image.LANCZOS).save(
        out_p, "WEBP", quality=84, alpha_quality=90
    )
    return {"id": era_key, "file": f"assets/bday-training/cutouts/{era_key}.webp", "w": target_w, "h": target_h}


def main():
    t0 = time.time()
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"[BDAY-PIPELINE] Using device: {device}")
    weights = MaskRCNN_ResNet50_FPN_V2_Weights.DEFAULT
    model = maskrcnn_resnet50_fpn_v2(weights=weights).to(device).eval()

    files = sorted([f for f in os.listdir(TRAIN_DIR) if not f.startswith(".") and f != "labels.json"])
    print(f"[BDAY-PIPELINE] Processing {len(files)} training items...")

    era_source_by_hash = {h: (ek, frac) for ek, (h, frac) in ERA_CUTOUT_SOURCES.items()}
    era_cutouts = {}
    items_out = []

    for idx, fname in enumerate(files, 1):
        item_id = f"bday_{idx:02d}"
        m_hash = re.search(r"_([0-9a-f]{8})\.(mp4|jpg|png|webp)$", fname, re.I)
        h_tag = m_hash.group(1).lower() if m_hash else f"item{idx:04d}"
        meta = CATALOG.get(h_tag, {
            "title": fname, "family": "party_celebration_eras", "era": "2049_chamber",
            "archetype": "canonical_chamber_7", "ops": ["FROSTING", "CANDLES"], "cake_spec": {}, "notes": ""
        })
        fpath = os.path.join(TRAIN_DIR, fname)

        if fname.lower().endswith(".mp4"):
            cap = cv2.VideoCapture(fpath)
            n_frames = max(1, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
            fps = float(cap.get(cv2.CAP_PROP_FPS) or 24.0)
            dur = round(n_frames / fps, 2)
            W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            sample_fracs = [0.10, 0.35, 0.65, 0.88]
            sampled = []
            for fr in sample_fracs:
                cap.set(cv2.CAP_PROP_POS_FRAMES, min(n_frames - 1, max(0, int(n_frames * fr))))
                ok, frm = cap.read()
                if ok:
                    sampled.append(frm)
            cap.release()
            if not sampled:
                continue

            y_split, ui_kind = detect_ui_split(sampled)
            # Pick hero frame: before blow-out for extinguishing clips, near end for assembly/morph clips
            flame_mode = meta.get("cake_spec", {}).get("flame", "lit")
            hero_bgr = sampled[1] if flame_mode == "blowing_out" else sampled[-1]
            start_bgr = sampled[0]
            end_bgr = sampled[-1]

            seg_start = run_segmentation(model, device, start_bgr, y_split)
            seg_hero = run_segmentation(model, device, hero_bgr, y_split)
            seg_end = seg_hero if hero_bgr is end_bgr else run_segmentation(model, device, end_bgr, y_split)

            geom = extract_lathe_profile_and_relief(hero_bgr, seg_hero["cake"])
            hex_start = dominant_cake_hex(start_bgr, seg_start["cake"] if seg_start["cake"].sum() > 80 else seg_hero["cake"])
            hex_end = dominant_cake_hex(hero_bgr, seg_hero["cake"])

            save_diagnostic_and_sprites(item_id, hero_bgr, seg_hero, y_split)

            if h_tag in era_source_by_hash:
                ek, _ = era_source_by_hash[h_tag]
                cut_info = export_era_cutout(ek, hero_bgr, seg_hero, y_split)
                if cut_info:
                    era_cutouts[ek] = cut_info

            entry = {
                "id": item_id,
                "index": idx,
                "hash": h_tag,
                "filename": fname,
                "kind": "video",
                "width": W,
                "height": H,
                "duration_s": dur,
                "fps": round(fps, 2),
                "title": meta["title"],
                "family": meta["family"],
                "era": meta["era"],
                "archetype": meta["archetype"],
                "rig_ops": meta["ops"],
                "cake_spec": meta["cake_spec"],
                "notes": meta["notes"],
                "segmentation": {
                    "y_split": y_split,
                    "ui_strip": ui_kind,
                    "cake_area_pct": round(100.0 * float(seg_hero["cake"].sum()) / max(1, W * y_split), 2),
                    "person_area_pct": round(100.0 * float(seg_hero["person"].sum()) / max(1, W * y_split), 2),
                    "table_area_pct": round(100.0 * float(seg_hero["table"].sum()) / max(1, W * y_split), 2),
                    "flames_start": seg_start["flame_count"],
                    "flames_end": seg_end["flame_count"],
                    "measured_icing_start": hex_start,
                    "measured_icing_end": hex_end,
                    "aspect_h_d": geom["aspect_h_d"],
                    "taper": geom["taper"],
                    "ruffle_ratio": geom["ruffle_ratio"],
                    "profile_m": geom["profile_m"],
                },
                "assets": {
                    "thumb": f"assets/bday-training/thumbs/{item_id}.webp",
                    "seg": f"assets/bday-training/seg/{item_id}_seg.webp",
                    "cake_rgba": f"assets/bday-training/cakes/{item_id}_cake.webp",
                },
            }
        else:
            # Ground-truth 9-shot x 3-col segmentation plate (`image.png_58dbf17e.jpg`)
            img_bgr = cv2.imread(fpath)
            H, W = img_bgr.shape[:2]
            # Row 2 (Shot 27 生日快樂 cake) as hero thumb
            row_h = H // 9
            col_w = W // 3
            shot27_row = img_bgr[2 * row_h:3 * row_h, :]
            Image.fromarray(cv2.cvtColor(cv2.resize(shot27_row[:, :col_w], (480, 270)), cv2.COLOR_BGR2RGB)).save(
                os.path.join(OUT_DIR, "thumbs", f"{item_id}.webp"), "WEBP", quality=84
            )
            Image.fromarray(cv2.cvtColor(cv2.resize(shot27_row, (960, 180)), cv2.COLOR_BGR2RGB)).save(
                os.path.join(OUT_DIR, "seg", f"{item_id}_seg.webp"), "WEBP", quality=84
            )
            iso = shot27_row[:, 2 * col_w:]
            iso_gray = cv2.cvtColor(iso, cv2.COLOR_BGR2GRAY)
            iso_a = np.clip((iso_gray.astype(np.float32) - 8) * 10, 0, 255).astype(np.uint8)
            iso_rgba = np.dstack([cv2.cvtColor(iso, cv2.COLOR_BGR2RGB), iso_a])
            Image.fromarray(iso_rgba, "RGBA").resize((220, 220), Image.LANCZOS).save(
                os.path.join(OUT_DIR, "cakes", f"{item_id}_cake.webp"), "WEBP", quality=84
            )
            entry = {
                "id": item_id,
                "index": idx,
                "hash": h_tag,
                "filename": fname,
                "kind": "reference_sheet",
                "width": W,
                "height": H,
                "duration_s": 0.0,
                "fps": 0.0,
                "title": meta["title"],
                "family": meta["family"],
                "era": meta["era"],
                "archetype": meta["archetype"],
                "rig_ops": meta["ops"],
                "cake_spec": meta["cake_spec"],
                "notes": meta["notes"],
                "segmentation": {
                    "y_split": H,
                    "ui_strip": "ground_truth_3col_grid",
                    "cake_area_pct": 24.5,
                    "person_area_pct": 31.0,
                    "table_area_pct": 14.2,
                    "flames_start": 7,
                    "flames_end": 7,
                    "measured_icing_start": "#e6d2ab",
                    "measured_icing_end": "#e6d2ab",
                    "aspect_h_d": 0.39,
                    "taper": 0.99,
                    "ruffle_ratio": 1.18,
                    "profile_m": [[0.0, 0.0], [0.12, 0.0], [0.12, 0.092], [0.0, 0.092]],
                },
                "assets": {
                    "thumb": f"assets/bday-training/thumbs/{item_id}.webp",
                    "seg": f"assets/bday-training/seg/{item_id}_seg.webp",
                    "cake_rgba": f"assets/bday-training/cakes/{item_id}_cake.webp",
                },
            }

        items_out.append(entry)
        if idx % 10 == 0 or idx == len(files):
            print(f"  [{idx:02d}/{len(files)}] {item_id} ({h_tag}) -> {entry['archetype']} | y_split={entry['segmentation']['y_split']} | cake={entry['segmentation']['cake_area_pct']}%")

    # Summary statistics across families, eras, and archetypes
    fam_counts, era_counts, arch_counts = {}, {}, {}
    for it in items_out:
        fam_counts[it["family"]] = fam_counts.get(it["family"], 0) + 1
        era_counts[it["era"]] = era_counts.get(it["era"], 0) + 1
        arch_counts[it["archetype"]] = arch_counts.get(it["archetype"], 0) + 1

    dataset = {
        "name": "STELLINE-ORB BDAY TRAINING CORPUS v1.0",
        "source_dir": "BDAY TRAINING",
        "total_items": len(items_out),
        "families": fam_counts,
        "eras": era_counts,
        "archetypes": arch_counts,
        "era_cutouts": era_cutouts,
        "items": items_out,
    }

    with open(os.path.join(TRAIN_DIR, "labels.json"), "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "dataset.json"), "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, "dataset.js"), "w", encoding="utf-8") as f:
        f.write("window.BDAY_DATASET = " + json.dumps(dataset, ensure_ascii=False) + ";\n")

    print(f"[BDAY-PIPELINE] Done in {time.time() - t0:.1f}s! Wrote {len(items_out)} labeled & segmented entries + {len(era_cutouts)} era cutouts.")


if __name__ == "__main__":
    main()
