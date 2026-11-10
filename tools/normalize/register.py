#!/usr/bin/env python3
"""Register every BDAY TRAINING clip to one grid and one bar, and cull.

ONE GRID. The Mask R-CNN / GrabCut masks made by tools/bday-training/process_bday_training.py survive only as the tinted middle panel of
assets/bday-training/seg/<id>_seg.webp. This reads them back (panel 2 minus 0.45 x panel 1 leaves the tint: mint = cake, magenta = people,
amber = table), takes the cake's box, and solves the zoom and shift that put that cake where the Memory Weaver puts its own:
centre x = 640, crown at y = 250, 480 px wide, in the 1280 x 576 picture. Plates are zoomed, never shrunk.

ONE BAR. Each clip has one event: the breath (the half second in which it loses most light), the turn (labels: morph_jumps_s), or its
arrival. The bar is 4 beats at 73.83 bpm (78 frames); the event is put at the start of beat 3 by offsetting the clip,
and by slowing it (never below half speed) only where the clip is too short on one side of its event.

CULL. A clip is kept when its cake was found, it lands within 30% of the grid's size and 80 px of its place, and no generator caption text sits in the picture
(measured: thin bright glyphs on dark in the two zones the generator writes in). Every drop carries its reason.

  python3 tools/normalize/register.py            -> assets/normalized/index.json (+ index.js)
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); BD = os.path.join(ROOT, 'BDAY TRAINING')
W, PH, FPS, BEAT = 1280, 576, 24, 0.8126984
BAR, EVENT_FRAME = 78, 39      # one bar of 4 beats; the event on the first frame of beat 3
GRID = {'cx': 640, 'top': 250, 'width': 480}      # where the cake goes: centre x, the top of its crown, its width (the corpus median cake is 400 px wide; most feet are cut by the crop, so the crown is the anchor); BAR = 78; EVENT_FRAME = 39
L = json.load(open(os.path.join(BD, 'labels.json'))); ITEMS = [i for i in L['items'] if i['kind'] == 'video']
ERA_ORDER = ['1920s_bw', '1920s_speakeasy', '1950s_midcentury', '1970s_kodachrome', '1980s_synthwave', '1990s_pastel', 'studio_craft', '2049_chamber', '2049_cyberpunk']

def world_h(it):
    ys = it['segmentation'].get('y_split', 550); return 720 if ys >= 720 else int(round(ys * 0.78 / 2) * 2)
def masks(it):
    a = np.asarray(Image.open(os.path.join(ROOT, it['assets']['seg'])).convert('RGB')).astype(np.float32); w = a.shape[1] // 3; p1, p2 = a[:, :w], a[:, w:2 * w]
    ys = it['segmentation'].get('y_split', 720); hh = int(round(180 * min(ys, 720) / 720))
    p1r = np.asarray(Image.fromarray(p1.astype(np.uint8)).resize((w, hh), Image.BILINEAR)).astype(np.float32); d = p2[:hh] - 0.45 * p1r      # the tint that was added
    r, g, b = d[..., 0], d[..., 1], d[..., 2]
    cake = (g > 45) & (g > r + 25) & (g > b)                     # + (42, 141, 117)
    person = (r > 40) & (b > 28) & (r > g + 25)                   # + (129, 52, 99)
    return cake, person, hh
def cake_box(it):
    cake, person, hh = masks(it); ys, xs = np.nonzero(cake)
    if len(xs) < 25: return None
    x0, x1 = np.percentile(xs, [2, 98]); y0, y1 = np.percentile(ys, [2, 98])
    return [float(x0 * 4), float(y0 * 4), float(x1 * 4 + 4), float(y1 * 4 + 4)], float(person.mean())
def frames(it, t, n=1, size=(160, 72)):
    wh = world_h(it); raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0, t):.3f}', '-i', os.path.join(BD, it['filename']), '-vf', f'crop=1280:{min(wh, 720)}:0:0,scale={size[0]}:{size[1]}', '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, size[1], size[0]).astype(np.float32)
def box_mean(a, k):
    c = np.cumsum(np.cumsum(np.pad(a, ((k, k), (k, k)), mode='edge'), 0), 1); n = 2 * k + 1
    return (c[n - 1:, n - 1:] - np.pad(c, ((1, 0), (1, 0)))[:-n, n - 1:][:c.shape[0] - n + 1] - np.pad(c, ((1, 0), (1, 0)))[n - 1:, :-n][:, :c.shape[1] - n + 1] + np.pad(c, ((1, 0), (1, 0)))[:-n, :-n][:c.shape[0] - n + 1, :c.shape[1] - n + 1]) / (n * n)
def hud_score(it, t):
    """Share of thin bright glyph pixels on dark, in the lower-left and right zones where the generator writes captions and lists."""
    f = frames(it, t, 1, (640, 288))
    if not len(f): return 0.0
    g = f[0]; H, Wd = g.shape; sc = 0.0
    for x0, x1, y0, y1 in [(0, int(Wd * .30), int(H * .50), int(H * .97)), (int(Wd * .66), int(Wd * .9), int(H * .12), int(H * .6))]:
        z = g[y0:y1, x0:x1]; k = 5; pad = np.pad(z, k, mode='edge'); loc = np.mean([pad[k + dy:k + dy + z.shape[0], k + dx:k + dx + z.shape[1]] for dy in (-k, 0, k) for dx in (-k, 0, k)], axis=0)
        sc = max(sc, float(((z > 135) & (loc < 70) & (z - loc > 75)).mean()))
    return sc
def lum_curve(it):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(BD, it['filename']), '-vf', 'crop=iw:ih*0.58:0:0,scale=64:24,fps=12', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 24 * 64).astype(np.float32).mean(axis=1)

def main():
    out = []
    for it in ITEMS:
        cid = it['id']; sp = it['cake_spec']; cin = it['cinematography']; dur = it['duration_s']; l = lum_curve(it); d = l[6:] - l[:-6]
        drop = float(-d.min()) if len(d) else 0; tb = (int(d.argmin()) + 3) / 12.0 if len(d) else dur / 2; morph = cin.get('morph_jumps_s') or []
        if sp.get('flame') == 'blowing_out' and drop > 3.5: kind, te, strength = 'breath', tb, drop
        elif morph: kind, te, strength = 'turn', float(morph[len(morph) // 2] if len(morph) > 2 else morph[0]), 6.0 + len(morph)
        elif cin.get('cut_family') == 'HOLOGRAM_GHOST_MATERIALIZE': kind, te, strength = 'arrive', min(dur - 1.7, 2.2), 6.0
        elif sp.get('flame') == 'rewinding': kind, te, strength = 'rewind', dur / 2, 5.0
        else: kind, te, strength = 'hold', dur / 2, 3.0
        half = EVENT_FRAME / FPS; span = BAR / FPS
        # offset the clip so its event sits on beat 3; where the clip is too short on one side of the event, slow it just enough (never below half speed)
        speed = float(np.clip(min(1.0, te / half, (dur - te - 0.05) / (span - half)), 0.5, 1.0)); t0 = max(0.0, te - half * speed)
        ev_frame = int(round((te - t0) / speed * FPS))
        wh = world_h(it); s0 = PH / wh if wh < 720 else 1.0; r = {'id': cid, 'era': it['era'], 'archetype': it['archetype'], 'title': it['title'], 'file': it['filename'], 'event': {'kind': kind, 't': round(te, 3), 'strength': round(strength, 1)},
             'window': {'t0': round(t0, 3), 'speed': round(speed, 3), 'event_frame': ev_frame}, 'world_h': wh, 'stage_cast': sp.get('stage_cast'), 'reasons': []}
        cb = cake_box(it)
        if not cb: r['reasons'].append('no cake mask'); r['keep'] = False; out.append(r); continue
        (x0, y0, x1, y1), pshare = cb
        # the same crop the edits use: world rows only, scaled to 576 high, centre 1280 kept (or, full frames, 1280x576 from y=20 at scale 1)
        if wh < 720: bx0, bx1 = (x0 - 640) * s0 + 640, (x1 - 640) * s0 + 640; by0, by1 = y0 * s0, min(y1, wh) * s0
        else: bx0, bx1, by0, by1 = x0, x1, y0 - 20, y1 - 20
        cw = max(8.0, bx1 - bx0); z = GRID['width'] / cw; zc = float(np.clip(z, 1.0, 2.2)); cx = (bx0 + bx1) / 2
        # zoom only (never shrink: that would bare the frame), then shift as far as the zoom allows without baring an edge
        tx = float(np.clip(GRID['cx'] - cx * zc, W - W * zc, 0)); ty = float(np.clip(GRID['top'] - by0 * zc, PH - PH * zc, 0))
        size = cw * zc / GRID['width']; dx = cx * zc + tx - GRID['cx']; dy = by0 * zc + ty - GRID['top']
        r['cake_box'] = [round(v, 1) for v in (bx0, by0, bx1, by1)]; r['people_share'] = round(pshare, 3); r['fit'] = {'zoom': round(zc, 3), 'tx': round(tx, 1), 'ty': round(ty, 1), 'size': round(size, 3), 'dx': round(dx, 1), 'dy': round(dy, 1)}
        hs = max(hud_score(it, te - 0.5), hud_score(it, te + 0.6)); r['hud'] = round(hs, 4)
        r['judged'] = 'by eye' if cid in SEEN_CLEAN | SEEN_TEXT | SEEN_MASKABLE else 'by detector'; r['mask_lower_left'] = cid in SEEN_MASKABLE
        if cid in SEEN_TEXT or (cid not in SEEN_CLEAN | SEEN_MASKABLE and hs > HUD_T): r['reasons'].append('generator caption text in picture')
        if cid in SEEN_MASKABLE: r['reasons'].append('generator caption text in picture (only the lower-left part can be masked)')
        if size > 1.3: r['reasons'].append('cake %d%% larger than the grid and cannot be shrunk without baring the frame' % round(size * 100 - 100))
        if size < 0.8: r['reasons'].append('cake too small to bring up to the grid')
        if abs(dx) > 80 or abs(dy) > 70: r['reasons'].append('cake sits %d px off the grid after the largest shift the zoom allows' % round(max(abs(dx), abs(dy))))
        r['keep'] = not r['reasons']; out.append(r)
    out.sort(key=lambda r: (ERA_ORDER.index(r['era']) if r['era'] in ERA_ORDER else 99, r['id']))
    dst = os.path.join(ROOT, 'assets/normalized'); os.makedirs(dst, exist_ok=True)
    idx = {'grid': GRID, 'picture': [W, PH], 'bar_frames': BAR, 'event_frame': EVENT_FRAME, 'beat_s': BEAT, 'fps': FPS, 'era_order': ERA_ORDER, 'clips': out}
    json.dump(idx, open(os.path.join(dst, 'index.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(dst, 'index.js'), 'w', encoding='utf-8').write('window.NORMALIZED = ' + json.dumps(idx, ensure_ascii=False) + ';\n')
    kept = [r for r in out if r['keep']]; print(len(kept), 'kept of', len(out))
    from collections import Counter
    print(Counter(r['event']['kind'] for r in kept)); print(Counter(x for r in out for x in r['reasons']))
    return idx
HUD_T = 0.010      # calibrated on 71 clips judged by eye: captioned clips score 0.011-0.027, clean ones under 0.004, with the exceptions below
# Judged by eye on contact sheets; these override the detector. Glitter, neon and sparklers fool it (SEEN_CLEAN); a caption that is only a short
# list beside the cake can slip under it (SEEN_TEXT). SEEN_MASKABLE have text only on black in the lower-left corner, removable with delogo.
SEEN_CLEAN = {'bday_%s' % k for k in '05 07 12 13 14 15 16 18 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 39 42 44 45 48 49 50 52 53 57 61 62 63 64 67 68 69 70 71 72 73 75 77 78'.split()}
SEEN_TEXT = {'bday_%s' % k for k in '01 03 04 06 08 10 11 17 22 38 40 41 43 46 56 58 59 60 65 66 74'.split()}
SEEN_MASKABLE = {'bday_02', 'bday_09', 'bday_51'}
if __name__ == '__main__': main()
