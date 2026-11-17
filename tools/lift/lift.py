#!/usr/bin/env python3
"""LIFT: the birthday videos into three dimensions, measured from the footage itself.

For every clip in assets/bday-training/dataset.json this writes assets/eye/<id>/ and one entry in
assets/eye/lift.json (and lift.js). The Eye (eye.html) builds every generation from these numbers in the browser.

  G1 relief   one frame, Depth Anything V2 depth, the footage as the texture: every visible surface, no backs.
  G2 revolve  the cake measured as a solid of revolution: axis, camera pitch, profile, candles, footage projected
              onto it, standing in the relief scene. The relief's depth scale is solved from the cake's own
              roundness (the cake is the ruler), so cake and room share one space.
  G3 time     G2 measured at several moments of the clip: the cake being made, in three dimensions.

Measured per clip (written to lift.json so every claim can be checked):
  world_bottom  the row where the world picture ends (found as the full-width step to black, not assumed)
  pitch_deg     camera pitch from the ellipse of the cake's base or top edge
  round_r2      how well the depth across the cake's side matches a circle of the measured radius
  depth_k       scene units of depth per unit of model disparity, from that same fit

Usage:  python3 tools/lift/lift.py [ids...]   (no ids = all)     LIFT_JOBS=2 to run two at once
Needs:  numpy, opencv-python-headless, onnxruntime, ai-edge-litert, and the weights listed in models.py.
"""
import os, sys, json, math
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import models as M

SRC = os.path.join(ROOT, 'BDAY TRAINING')
OUT = os.path.join(ROOT, 'assets', 'eye')
PLATE_W = 960          # stored plate width
DEPTH_W = 384          # stored depth grid width
RINGS = 40             # profile samples
KEYS = (0.06, 0.2, 0.34, 0.48, 0.62, 0.76, 0.9)   # moments of the hero shot measured for G3
ANGLE_PITCH = {'INTIMATE_CANDLE_FACE_CU': 6, 'HERO_PEDESTAL_3Q_25DEG': 25, 'TABLE_TABLEAU_EYE_10DEG': 10,
               'HIGH_CROWN_WRITING_45DEG': 45, 'CHAMBER_FLOATING_TILT_10DEG': 10, 'ARTISAN_BENCH_HANDS_30DEG': 30}


def world_bottom(cap, n, H, y_split):
    """Row where the world picture ends: a step from picture to black across the width, steady over time."""
    fs = []
    for k in np.linspace(0.05, 0.95, 10):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(n * k)); ok, f = cap.read()
        if ok: fs.append(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32))
    g = np.stack(fs)
    step = ((g[:, :-1] - g[:, 1:]) > 6) & (g[:, 1:] < 14)
    frac = step.mean(axis=(0, 2))
    lo, hi = int(H * 0.45), min(y_split + 4, H - 2)
    r = lo + int(np.argmax(frac[lo:hi]))
    return (r + 1, float(frac[r])) if frac[r] >= 0.1 else (min(y_split, H), float(frac[r]))


def find_cake(bgr, dp, prior=None):
    """Cake box: the detector on the whole frame and on square tiles; else the nearest thing in the middle."""
    H, W = bgr.shape[:2]
    best = None
    wins = [(0, W)] + [(int(x), int(x) + min(W, int(H * a))) for a in (1.0, 1.6) for x in np.linspace(0, W - min(W, int(H * a)), 4)]
    for x0, x1 in wins:
        for s, c, a, b, c2, d in M.detect(bgr[:, x0:x1], thresh=0.22)[:3]:
            a, c2 = a + x0, c2 + x0
            if (c2 - a) < 0.06 * W or (d - b) < 0.12 * H: continue
            if (c2 - a) * (d - b) > 0.8 * W * H: continue
            cx = (a + c2) / 2
            sc = s - 0.25 * abs(cx - W / 2) / W
            if prior is not None: sc -= 0.6 * abs(cx - (prior[0] + prior[2]) / 2) / W
            if best is None or sc > best[0]: best = (sc, [a, b, c2, d], float(s))
    if best: return [float(np.clip(v, 0, m)) for v, m in zip(best[1], (W, H, W, H))], best[2]
    if prior is not None: return prior, 0.0
    pp = M.people(bgr)
    w = dp.copy(); w[pp > 0.4] = dp.min(); w[:, :W // 3] = dp.min(); w[:, 2 * W // 3:] = dp.min(); w[int(H * 0.9):] = dp.min(); w[:int(H * 0.2)] = dp.min()
    y, x = np.unravel_index(np.argmax(cv2.GaussianBlur(w, (0, 0), 12)), w.shape)
    return [max(0, x - 0.16 * W), max(0, y - 0.3 * H), min(W, x + 0.16 * W), min(H, y + 0.3 * H)], 0.0


def cake_mask(bgr, box):
    H, W = bgr.shape[:2]
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    side = int(min(max(x1 - x0, y1 - y0) * 1.5, max(W, H)))
    sx = int(np.clip(cx - side / 2, 0, max(0, W - side))); sy = int(np.clip(cy - side / 2, 0, max(0, H - side)))
    crop = bgr[sy:sy + side, sx:sx + side]
    pts = [(cx - sx, cy - sy + 0.18 * (y1 - y0)), (cx - sx, cy - sy), (cx - sx - 0.2 * (x1 - x0), cy - sy + 0.2 * (y1 - y0)), (cx - sx + 0.2 * (x1 - x0), cy - sy + 0.2 * (y1 - y0))]
    m = M.touch(crop, pts)
    full = np.zeros((H, W), np.float32); full[sy:sy + crop.shape[0], sx:sx + crop.shape[1]] = m
    ex, ey = 0.12 * (x1 - x0), 0.1 * (y1 - y0)
    keep = np.zeros((H, W), np.uint8); keep[int(max(0, y0 - 2.2 * ey)):int(min(H, y1 + ey)), int(max(0, x0 - ex)):int(min(W, x1 + ex))] = 1
    b = ((full > 0.5) & (keep > 0)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(b)
    if n <= 1: return b
    l = lab[int(np.clip(cy + 0.18 * (y1 - y0), 0, H - 1)), int(np.clip(cx, 0, W - 1))]
    if l == 0: l = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    return (lab == l).astype(np.uint8)


def fit_revolve(mask, pitch_prior, dp=None):
    """Axis, pitch and profile of a solid of revolution from its silhouette.

    Under a camera pitched down by p, a ring of radius r at height h draws an ellipse with half-axes (r, r sin p)
    centred h cos p above the base centre. So: the lower edge of the silhouette is the near half of the base
    ellipse and the upper edge of the body is the far half of the top ellipse (their sag gives p), and the
    silhouette's half-width on the row of a ring's centre is that ring's radius."""
    H, W = mask.shape
    ys, xs = np.where(mask > 0)
    if len(xs) < 300: return None
    bw = max(3, int((xs.max() - xs.min()) * 0.16)) | 1
    body = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (bw, 1)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(body)
    if n <= 1: return None
    body = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    ys, xs = np.where(body > 0)
    rows = np.arange(ys.min(), ys.max() + 1)
    left = np.array([np.argmax(body[y]) for y in rows], np.float32)
    right = np.array([W - 1 - np.argmax(body[y][::-1]) for y in rows], np.float32)
    hw = (right - left + 1) / 2
    xc = float(np.average((left + right) / 2, weights=hw))
    hw = np.convolve(np.pad(hw, 3, mode='edge'), np.ones(7) / 7, 'valid')
    y_top, y_bot = int(rows[0]), int(rows[-1])
    cut = y_bot >= H - 3                      # the picture's edge cuts the cake: the base ellipse is not visible

    def sag(edge_y, R, sign):
        # edge_y(x) = y0 + sign * b * sqrt(1 - dx^2 / R^2) over the middle 80 percent
        cols = np.arange(int(xc - 0.8 * R), int(xc + 0.8 * R) + 1)
        cols = cols[(cols >= 0) & (cols < W)]
        yy = np.array([edge_y(c) for c in cols], np.float32)
        ok = np.isfinite(yy)
        if ok.sum() < 12: return None
        u = np.sqrt(np.clip(1 - ((cols[ok] - xc) / R) ** 2, 0, 1))
        A = np.stack([np.ones(ok.sum()), sign * u], 1)
        (y0, b), res = np.linalg.lstsq(A, yy[ok], rcond=None)[:2]
        return float(y0), float(b)

    def low(c):
        col = np.where(body[:, c] > 0)[0]; return col.max() if len(col) else np.nan

    def high(c):
        col = np.where(body[:, c] > 0)[0]; return col.min() if len(col) else np.nan

    nrow = len(rows)
    Rb = float(hw[int(nrow * 0.7):].max()); Rt = float(np.percentile(hw[:max(4, int(nrow * 0.3))], 80))
    cands = []
    if not cut:
        f = sag(low, Rb, +1)
        if f and 0.03 * Rb < f[1] < 0.95 * Rb: cands.append(math.degrees(math.asin(f[1] / Rb)))
    f = sag(high, Rt, -1)
    if f and 0.03 * Rt < f[1] < 0.95 * Rt: cands.append(math.degrees(math.asin(f[1] / Rt)))
    measured = len(cands) > 0
    pitch = float(np.clip(np.median(cands) if measured else pitch_prior, 4, 62))

    def at(pitch):
        p = math.radians(pitch)
        y_bc = y_bot - Rb * math.sin(p)                    # row of the base centre (when the picture's edge cuts the
                                                           # cake, the last visible row stands in for the base's near edge)
        y_tc = y_top + Rt * math.sin(p)                    # row of the top centre
        if y_bc - y_tc < 6: return None
        hmax = (y_bc - y_tc) / math.cos(p)
        prof = []
        for i in range(RINGS):
            h = hmax * i / (RINGS - 1)
            k = int(np.clip(round(y_bc - h * math.cos(p)) - rows[0], 0, nrow - 1))
            prof.append([float(hw[k]), float(h)])
        return y_bc, y_tc, hmax, prof

    def outline_iou(pitch):
        """Draw the solid this pitch implies (one filled ellipse per ring) and compare with the body's outline."""
        r = at(pitch)
        if r is None: return 0.0
        y_bc, y_tc, hmax, prof = r; p = math.radians(pitch)
        im = np.zeros_like(body)
        for i in range(0, RINGS * 3):
            h = hmax * i / (RINGS * 3 - 1); rad = float(np.interp(h, [q[1] for q in prof], [q[0] for q in prof]))
            cv2.ellipse(im, (int(round(xc)), int(round(y_bc - h * math.cos(p)))), (max(1, int(rad)), max(1, int(rad * math.sin(p)))), 0, 0, 360, 1, -1)
        return float((im & body).sum() / max(1, (im | body).sum()))

    def depth_r2(pitch):
        """How well the solid this pitch implies explains the depth map: sample its visible top and front side,
        compare their camera depth with the model's disparity there (one scale, one offset), return (r2, scale).
        The top recedes as 1 / tan(pitch) per row and the side leans as tan(pitch), so depth tells pitches apart
        that the outline cannot."""
        r = at(pitch)
        if r is None: return 0.0, None
        y_bc, y_tc, hmax, prof = r; p = math.radians(pitch); cp, sp = math.cos(p), math.sin(p)
        pr = np.array(prof); zs, ds = [], []
        th = np.radians(np.linspace(-62, 62, 25))
        for h in np.linspace(0.06 * hmax, 0.97 * hmax, 22):                       # front of the side
            rad = float(np.interp(h, pr[:, 1], pr[:, 0]))
            x = xc + rad * np.sin(th); y = y_bc - h * cp + rad * np.cos(th) * sp
            zs.append(rad * np.cos(th) * cp + h * sp); ds.append((x, y))
        for rho in np.linspace(0.1, 0.9, 9) * Rt:                                  # the top
            ta = np.radians(np.linspace(-170, 170, 28))
            x = xc + rho * np.sin(ta); y = y_tc + rho * np.cos(ta) * sp
            zs.append(rho * np.cos(ta) * cp + hmax * sp); ds.append((x, y))
        z = np.concatenate(zs); x = np.concatenate([d[0] for d in ds]); y = np.concatenate([d[1] for d in ds])
        ok = (x >= 0) & (x < W - 1) & (y >= 0) & (y < H - 1)
        ok[ok] &= body[y[ok].astype(int), x[ok].astype(int)] > 0
        if ok.sum() < 80: return 0.0, None
        d = dp[y[ok].astype(int), x[ok].astype(int)]; z = z[ok]
        A = np.stack([d, np.ones_like(d)], 1); (k, c), *_ = np.linalg.lstsq(A, z, rcond=None)
        res = z - (k * d + c)
        return float(1 - (res ** 2).sum() / (((z - z.mean()) ** 2).sum() + 1e-9)), float(k)

    # Choosing the pitch. The edge sag can over-read it (roses, shards, a plate), and the outline alone cannot
    # tell a pitch that is too shallow (at 0 degrees any symmetric outline is reproduced). So when a depth map is
    # given, take the pitch whose solid best explains the depth while still fitting its own outline; otherwise
    # step the read pitch down until the solid stops bulging past the outline.
    pitch_read, method, dr2, dk, dpitch = pitch, ('edge' if measured else 'prior'), None, None, None
    if dp is not None:
        best = None
        for q in np.arange(4, 61, 1.0):
            r2, k = depth_r2(q); oi = outline_iou(q)
            if k is None or k <= 0: continue
            sc = r2 * min(1.0, oi / 0.9)
            if best is None or sc > best[0]: best = (sc, float(q), r2, k)
        if best: dr2, dk, dpitch = best[2], best[3], best[1]
        # trusted only when the fit is strong: on eight test clips, fits of 0.74 and up agreed with the edge read
        # within 7 degrees, fits of 0.57 to 0.68 (tiers, domes) did not
        if best and best[2] >= 0.72:
            pitch, method = best[1], 'depth'
    fit_iou = outline_iou(pitch)
    while method != 'depth' and fit_iou < 0.90 and pitch > 6:
        pitch -= 2; fit_iou = outline_iou(pitch); method = 'outline'
    r = at(pitch)
    if r is None: return None
    y_bc, y_tc, hmax, prof = r
    return dict(xc=xc, y_bc=float(y_bc), y_tc=float(y_tc), pitch=float(pitch), pitch_read=float(pitch_read), outline_iou=fit_iou, pitch_method=method, depth_r2=dr2, depth_k=dk if method == 'depth' else None, pitch_depth=dpitch, edge_read=measured, pitch_measured=(method != 'prior'), cut=bool(cut),
                Rb=Rb, Rt=Rt, hmax=float(hmax), prof=prof, body=body)


def find_candles(mask, fit, bgr):
    """Candles: where each stands on the top, how tall, what colour, lit or not.

    Lit ones are found by their flames (a small saturated blob with a warm halo over the cake's top); the candle is
    the thin column under the flame that stands out from the icing on both sides, followed down to where that
    stops: its foot. Unlit ones are the thin upright pieces of the mask that stand out of the body's outline."""
    body = fit['body']; H, W = mask.shape
    p = math.radians(fit['pitch']); sp = max(0.12, math.sin(p)); out = []
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV); V = hsv[..., 2]
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    R = fit['Rt']; x_lo, x_hi = int(max(0, fit['xc'] - 1.15 * fit['Rb'])), int(min(W, fit['xc'] + 1.15 * fit['Rb']))
    y_far = fit['y_tc'] - R * sp                          # far edge of the top
    y_lo, y_hi = int(max(0, y_far - 1.1 * fit['hmax'] - 0.25 * R)), int(min(H, fit['y_tc'] + R * sp))
    hot = np.zeros((H, W), np.uint8); hot[y_lo:y_hi, x_lo:x_hi] = (V[y_lo:y_hi, x_lo:x_hi] > 236).astype(np.uint8)
    n, cl, st, cen = cv2.connectedComponentsWithStats(hot)
    amax = max(40, 0.012 * R * R)

    def place(bx, by, hpx, wpx, lit, box):
        X = bx - fit['xc']; Z = (by - fit['y_tc']) / sp
        rr = math.hypot(X, Z)
        if rr > 1.25 * R: return
        if rr > 0.94 * R: X, Z = X * 0.94 * R / rr, Z * 0.94 * R / rr
        x0, y0, w0, h0 = box
        px = bgr[int(y0 + 0.35 * h0):y0 + h0, int(bx - max(1, wpx / 4)):int(bx + max(1, wpx / 4)) + 1].reshape(-1, 3)
        col = np.median(px, 0) if len(px) else np.array([200, 200, 200])
        out.append(dict(x=float(X), z=float(Z), h=float(hpx / math.cos(p)), w=float(np.clip(wpx, 2.5, 0.09 * R + 3)),
                        rgb=[int(col[2]), int(col[1]), int(col[0])], lit=lit, box=[int(x0), int(y0), int(w0), int(h0)]))

    for l in range(1, n):
        x, y, w, h, a = st[l]
        if a < 4 or a > amax or w > 2.2 * h + 4 or h > 0.5 * R: continue
        ring = cv2.dilate((cl[max(0, y - 6):y + h + 6, max(0, x - 6):x + w + 6] == l).astype(np.uint8), np.ones((7, 7), np.uint8))
        patch = bgr[max(0, y - 6):y + h + 6, max(0, x - 6):x + w + 6].astype(np.float32)
        halo = patch[ring > 0]
        if len(halo) == 0 or (halo[:, 2].mean() - halo[:, 0].mean()) < 18: continue      # not warm: icing, a lamp, a highlight
        fx = int(round(cen[l][0])); fy = y + h
        d = max(3, int(0.035 * R)); wid = []; yb = fy; miss = 0
        for yy in range(fy + 1, min(H - 1, int(fy + 2.2 * fit['hmax'] + R))):
            if fx - 2 * d < 0 or fx + 2 * d >= W: break
            c = lab[yy, fx - 1:fx + 2].mean(0); side = (lab[yy, fx - 2 * d:fx - d].mean(0) + lab[yy, fx + d:fx + 2 * d].mean(0)) / 2
            if np.abs(c - side).sum() > 16: yb = yy; miss = 0
            else:
                miss += 1
                if miss > max(3, 0.03 * R): break
        hpx = yb - fy
        if hpx < 0.06 * R: continue
        place(fx, yb, hpx, max(3, 0.03 * R), True, (fx - 3, fy, 6, hpx))
    extra = ((mask > 0) & (cv2.dilate(body, np.ones((3, 3), np.uint8)) == 0)).astype(np.uint8)
    n, cl, st, _ = cv2.connectedComponentsWithStats(extra)
    for l in range(1, n):
        x, y, w, h, a = st[l]
        if h < 0.05 * fit['hmax'] or h < 8 or w > 0.5 * h + 6 or a < 20: continue
        bx = x + w / 2
        if any(abs(bx - (fit['xc'] + c['x'])) < max(6, 0.05 * R) for c in out): continue
        lit = bool((V[max(0, y - 4):y + max(3, h // 4), max(0, x - 3):x + w + 3] > 215).mean() > 0.06)
        place(bx, y + h, h, min(w, 0.12 * h + 3), lit, (x, y, w, h))
    out.sort(key=lambda c: -c['h']); keep = []          # one candle per place: the tallest reading wins
    for c in out:
        if all(abs(c['box'][0] + c['box'][2] / 2 - (k['box'][0] + k['box'][2] / 2)) > max(5, 0.05 * R) for k in keep): keep.append(c)
    return keep[:16]


def ruler(dp, fit):
    """Depth scale from the cake's roundness. Along one image row of the side, camera depth is
    sqrt(r^2 - dx^2) / cos(pitch) + const, so regress that against model disparity with one intercept per row."""
    p = math.radians(fit['pitch']); zs, ds = [], []
    y0, y1 = fit['y_tc'] + fit['Rt'] * math.sin(p) + 2, fit['y_bc'] - 2
    prof = np.array(fit['prof'])
    for y in np.linspace(y0 + 0.15 * (y1 - y0), y1 - 0.1 * (y1 - y0), 14):
        y = int(y)
        if y < 0 or y >= dp.shape[0]: continue
        h = (fit['y_bc'] - y) / math.cos(p)
        r = float(np.interp(h, prof[:, 1], prof[:, 0]))
        xs = np.arange(int(fit['xc'] - 0.85 * r), int(fit['xc'] + 0.85 * r))
        xs = xs[(xs >= 0) & (xs < dp.shape[1])]
        if len(xs) < 12: continue
        z = np.sqrt(np.clip(r * r - (xs - fit['xc']) ** 2, 0, None)) / math.cos(p)
        d = dp[y, xs]
        zs.append(z - z.mean()); ds.append(d - d.mean())
    if not zs: return None, 0.0
    z, d = np.concatenate(zs), np.concatenate(ds)
    k = float((z * d).sum() / ((d * d).sum() + 1e-12))
    r2 = float(1 - ((z - k * d) ** 2).sum() / ((z * z).sum() + 1e-12))
    return k, r2


def lift(item):
    iid = item['id']
    path = os.path.join(SRC, item['filename'])
    cap = cv2.VideoCapture(path)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); H = int(cap.get(4)); W = int(cap.get(3))
    if n < 2: return dict(id=iid, ok=False, why='not a video')
    wb, wb_conf = world_bottom(cap, n, H, item['segmentation']['y_split'])
    dur = item['duration_s']
    shots = item['cinematography'].get('shots') or [dict(start_s=0, end_s=dur)]
    hero_t = 0.9 * dur
    sh = next((s for s in shots if s['start_s'] <= hero_t <= s['end_s'] + 0.05), shots[-1])
    t0, t1 = sh['start_s'], min(sh['end_s'], dur)

    def frame(t):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(np.clip(t / dur, 0, 0.999) * n)); ok, f = cap.read()
        return f[:wb] if ok else None

    hero = frame(hero_t)
    if hero is None: return dict(id=iid, ok=False, why='no frame')
    Hw = hero.shape[0]
    dp = M.depth(hero)
    box, det = find_cake(hero, dp)
    mask = cake_mask(hero, box)
    prior = ANGLE_PITCH.get(item['cinematography']['angle_family'], 20)
    fit = fit_revolve(mask, prior, dp)
    os.makedirs(os.path.join(OUT, iid), exist_ok=True)
    s = PLATE_W / W                                   # stored-plate pixels per source pixel
    e = dict(id=iid, ok=True, title=item['title'], file=item['filename'], family=item['family'], era=item['era'],
             w=PLATE_W, h=int(round(Hw * s)), src_w=W, src_h=H, world_bottom=wb, world_bottom_conf=round(wb_conf, 3),
             dataset_y_split=item['segmentation']['y_split'], hero_t=round(hero_t, 3), shot=[round(t0, 3), round(t1, 3)],
             dur=dur, det=round(det, 3), box=[round(v * s, 1) for v in box], revolve=None, keys=[])
    plate = cv2.resize(hero, (e['w'], e['h']), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(OUT, iid, 'plate.webp'), plate, [cv2.IMWRITE_WEBP_QUALITY, 82])
    k, r2 = (None, 0.0)
    if fit:
        k, r2 = ruler(dp, fit)
        if fit['depth_k']: k, r2 = fit['depth_k'], fit['depth_r2']     # the whole-solid fit supersedes the side-only ruler
    # disparity -> scene depth. Without a trusted ruler, use a gentle default: the frame's disparity range = 0.35 widths
    k_ok = bool(fit and k and k > 0 and r2 > 0.5)
    rng = float(np.percentile(dp, 99) - np.percentile(dp, 1)) + 1e-9
    kk = k if k_ok else 0.35 * W / rng
    kk = float(np.clip(kk, 0.12 * W / rng, 1.2 * W / rng))
    d_ref = float(np.median(dp[int(fit['y_tc']):int(fit['y_bc']), int(fit['xc'] - 4):int(fit['xc'] + 4)])) if fit else float(np.median(dp))
    z = (dp - d_ref) * kk / W                          # depth toward the eye, in plate widths; 0 at the cake's front
    if fit: z += fit['Rb'] / W                          # so 0 is the cake's axis
    zlo, zhi = float(z.min()), float(z.max())
    gh = int(round(DEPTH_W * Hw / W))
    zq = cv2.resize(z, (DEPTH_W, gh), interpolation=cv2.INTER_AREA)
    q = np.clip((zq - zlo) / (zhi - zlo + 1e-9) * 65535, 0, 65535).astype(np.uint16)
    mk = cv2.resize(mask * 255, (DEPTH_W, gh), interpolation=cv2.INTER_AREA)
    pk = np.dstack([mk, (q & 255).astype(np.uint8), (q >> 8).astype(np.uint8)])    # BGR: B mask, G low, R high
    cv2.imwrite(os.path.join(OUT, iid, 'depth.png'), pk, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    e.update(z_lo=round(zlo, 5), z_hi=round(zhi, 5), depth_w=DEPTH_W, depth_h=gh, depth_k=round(kk * 1.0, 4),
             ruler_ok=k_ok, round_r2=round(r2, 3), mask_area=round(float(mask.mean()), 4))
    if not fit:
        e['why'] = 'no revolve fit (cake not found as a solid of revolution)'
        return e

    def pack(f, m, ft, frame_bgr, with_candles):
        c = find_candles(m, ft, frame_bgr) if with_candles else []
        return dict(xc=round(ft['xc'] * s, 2), y_bc=round(ft['y_bc'] * s, 2), pitch=round(ft['pitch'], 2),
                    prof=[[round(r * s, 2), round(h * s, 2)] for r, h in ft['prof']],
                    candles=[dict(x=round(c1['x'] * s, 2), z=round(c1['z'] * s, 2), h=round(c1['h'] * s, 2), w=round(c1['w'] * s, 2), rgb=c1['rgb'], lit=c1['lit']) for c1 in c]), c

    rev, cands = pack(hero, mask, fit, hero, True)
    rev.update(pitch_measured=fit['pitch_measured'], pitch_prior=prior, pitch_read=round(fit['pitch_read'], 2), pitch_method=fit['pitch_method'], pitch_depth=fit['pitch_depth'], pitch_depth_r2=fit['depth_r2'] and round(fit['depth_r2'], 3), edge_read=fit['edge_read'], outline_iou=round(fit['outline_iou'], 3), cut=fit['cut'])
    e['revolve'] = rev
    # the body's own texture: candles painted out, so they do not ghost on the icing when the eye moves
    cm = np.zeros(mask.shape, np.uint8)
    for c1 in cands:
        x, y, w, h = c1['box']; cm[max(0, y - 6):y + h + 2, max(0, x - 3):x + w + 3] = 255
    bodytex = cv2.inpaint(hero, cm, 5, cv2.INPAINT_TELEA) if cands else hero
    cv2.imwrite(os.path.join(OUT, iid, 'body.webp'), cv2.resize(bodytex, (e['w'], e['h']), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 82])
    # G3: the same measurement at several moments of the hero shot, pitch held at the hero's
    for j, kf in enumerate(KEYS):
        t = t0 + (t1 - t0) * kf
        f = hero if kf == KEYS[-1] and abs(t - hero_t) < 0.2 else frame(t)
        if f is None: continue
        if f is hero: m2, ft2 = mask, fit
        else:
            m2 = cake_mask(f, box)
            ft2 = fit_revolve(m2, fit['pitch'])
            if ft2:
                ft2 = dict(ft2); p = math.radians(fit['pitch'])
                # hold the hero pitch: re-read the profile under it
                ft2 = fit_revolve_fixed(m2, fit['pitch']) or ft2
        tex = 'k%d.webp' % j
        cv2.imwrite(os.path.join(OUT, iid, tex), cv2.resize(f, (e['w'] // 2, e['h'] // 2), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_WEBP_QUALITY, 78])
        if ft2 is None:
            e['keys'].append(dict(t=round(t, 3), tex=tex, empty=True)); continue
        kd, _ = pack(f, m2, ft2, f, True)
        kd.update(t=round(t, 3), tex=tex, empty=False)
        e['keys'].append(kd)
    return e


def fit_revolve_fixed(mask, pitch):
    """fit_revolve with the pitch given rather than read from the edges (used for the moments of G3)."""
    f = fit_revolve(mask, pitch)
    if not f or abs(f['pitch'] - pitch) < 0.5: return f
    p = math.radians(pitch); body = f['body']
    ys = np.where(body.any(1))[0]; rows = np.arange(ys.min(), ys.max() + 1)
    W = body.shape[1]
    left = np.array([np.argmax(body[y]) for y in rows], np.float32); right = np.array([W - 1 - np.argmax(body[y][::-1]) for y in rows], np.float32)
    hw = np.convolve(np.pad((right - left + 1) / 2, 3, mode='edge'), np.ones(7) / 7, 'valid')
    y_bc = rows[-1] - f['Rb'] * math.sin(p); y_tc = rows[0] + f['Rt'] * math.sin(p)
    if y_bc - y_tc < 6: return None
    hmax = (y_bc - y_tc) / math.cos(p)
    prof = [[float(hw[int(np.clip(round(y_bc - (hmax * i / (RINGS - 1)) * math.cos(p)) - rows[0], 0, len(rows) - 1))]), float(hmax * i / (RINGS - 1))] for i in range(RINGS)]
    f.update(pitch=pitch, y_bc=float(y_bc), y_tc=float(y_tc), hmax=float(hmax), prof=prof)
    return f


def main():
    d = json.load(open(os.path.join(ROOT, 'assets', 'bday-training', 'dataset.json')))
    want = set(sys.argv[1:])
    os.makedirs(OUT, exist_ok=True)
    jpath = os.path.join(OUT, 'lift.json')
    db = json.load(open(jpath)) if os.path.exists(jpath) else dict(items={})
    for it in d['items']:
        if it['kind'] != 'video' or (want and it['id'] not in want): continue
        try:
            e = lift(it)
        except Exception as ex:
            import traceback; traceback.print_exc()
            e = dict(id=it['id'], ok=False, why='error: %s' % ex)
        db['items'][it['id']] = e
        r = e.get('revolve')
        print(e['id'], 'ok' if e.get('ok') else 'FAIL', e.get('why', ''), 'wb', e.get('world_bottom'), 'det', e.get('det'),
              'pitch', r and r['pitch'], r and r['pitch_method'], 'edge-read', r and r['pitch_read'], 'r2', e.get('round_r2'),
              'candles', r and len(r['candles']), 'keys', len(e.get('keys', [])), flush=True)
        db['tool'] = 'tools/lift/lift.py'
        db['models'] = dict(depth='Depth Anything V2 ViT-L (ONNX, 518 px, tiled)', detect='EfficientDet-Lite2 (COCO cake)', mask='MediaPipe magic_touch', people='MediaPipe selfie multiclass')
        json.dump(db, open(jpath, 'w'), separators=(',', ':'))
        open(os.path.join(OUT, 'lift.js'), 'w').write('window.LIFT=' + json.dumps(db, separators=(',', ':')) + ';')
    open(os.path.join(OUT, 'lift.js'), 'w').write('window.LIFT=' + json.dumps(db, separators=(',', ':')) + ';')


if __name__ == '__main__':
    main()
