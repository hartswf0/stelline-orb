#!/usr/bin/env python3
"""A cast of its own for every kept clip: the people of that plate, cut out by its own mask, as a short sprite strip.

For each bar in assets/normalized/bars, eight frames spread over the bar are multiplied by the clip's people mask (masks/<id>.png, widened and
feathered) and cropped to the mask's box. The strip is what the Memory Weaver stands behind its 3D cake when it builds that clip, so each scene
has its own people, moving through the same bar, and index.json records where in the picture they stood so the orb can put them back there.

  python3 tools/normalize/cast.py   -> assets/normalized/cast/<id>.webp, cast/index.json, cast/index.js (window.PLATE_CAST)
"""
import json, os, subprocess
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); N = os.path.join(ROOT, 'assets/normalized')
I = json.load(open(os.path.join(N, 'index.json'))); W, PH = I['picture']; FRAMES = 8; CELL_H, CELL_W = 220, 489
os.makedirs(os.path.join(N, 'cast'), exist_ok=True); out = {}
for c in [c for c in I['clips'] if c['keep']]:
    cid = c['id']; m = Image.open(os.path.join(N, 'masks', cid + '.png')).convert('RGB').resize((W, PH), Image.BILINEAR).split()[0]
    hard = np.asarray(m) > 110
    if hard.mean() < 0.03: continue                                   # nobody in this plate
    full = Image.open(os.path.join(N, 'masks', cid + '.png')).convert('RGB').resize((W, PH), Image.BILINEAR); cake = np.asarray(full.split()[1]) > 110
    alpha = m.point(lambda v: 255 if v > 110 else 0).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(6)); strip_box = None
    if cake.any(): cys, cxs = np.nonzero(cake); strip_box = (max(0, int(np.percentile(cxs, 3)) - 6), max(0, int(np.percentile(cys, 2)) - 100), int(np.percentile(cxs, 97)) + 6, int(np.percentile(cys, 2)) + 30)
    ys, xs = np.nonzero(np.asarray(alpha) > 40); x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    k = min(CELL_H / (y1 - y0), CELL_W / (x1 - x0)); cw, ch = max(2, int((x1 - x0) * k)), max(2, int((y1 - y0) * k)); strip = Image.new('RGBA', (cw * FRAMES, ch), (0, 0, 0, 0))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(N, 'bars', cid + '.mp4'), '-vf', f"select='not(mod(n\\,{I['bar_frames'] // FRAMES + 1}))',crop={x1 - x0}:{y1 - y0}:{x0}:{y0},scale={cw}:{ch}", '-vsync', '0', '-frames:v', str(FRAMES), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, ch, cw, 3); a = alpha.crop((x0, y0, x1, y1)).resize((cw, ch), Image.BILINEAR)
    # (Cutting the plate's own candles out of the strip was tried and dropped: it leaves candle-shaped holes. They stay, behind the orb's candles.)
    for i in range(FRAMES):
        im = Image.fromarray(fr[min(i, len(fr) - 1)]).convert('RGBA'); im.putalpha(a); strip.paste(im, (i * cw, 0))
    strip.save(os.path.join(N, 'cast', cid + '.webp'), 'WEBP', quality=86)
    out[cid] = {'file': f'assets/normalized/cast/{cid}.webp', 'frames': FRAMES, 'w': cw, 'h': ch, 'box': [x0, y0, x1, y1], 'era': c['era']}
json.dump(out, open(os.path.join(N, 'cast/index.json'), 'w'), indent=1); open(os.path.join(N, 'cast/index.js'), 'w').write('window.PLATE_CAST = ' + json.dumps(out) + ';\n')
print(len(out), 'casts')
