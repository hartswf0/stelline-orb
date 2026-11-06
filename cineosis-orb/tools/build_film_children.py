"""The film's children as moving cut-outs. Two beats of the Memory Maker scene were segmented frame by frame earlier (per-frame label mattes,
640x360, one label per part): beat 29 (2:32-2:36, they come in) and beat 44 (3:33-3:37, they blow the candles out).
For each child: the frame is taken from the clip at 1280x720, the child's label is lifted from the matte (largest piece near where it was
a frame before), frames where the matte loses the child are dropped, and the rest are cropped to one box and packed as a sprite sheet.
Usage: python3 build_film_children.py CLIP.mp4 ATLAS6.json MATTES_DIR"""
import json, os, sys, math, subprocess, io
import numpy as np, cv2
from PIL import Image, ImageFilter
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cut')
def frame(clip, t):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', '%.3f' % t, '-i', clip, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    return Image.open(io.BytesIO(raw)).convert('RGB')
def main(clip, atlas, mdir):
    A = json.load(open(atlas))['beats']; cat = json.load(open(os.path.join(OUT, 'catalog.json'))); cat = [c for c in cat if not c['id'].startswith('film-')]; add = []
    for n, tag in ((29, 'arrive'), (44, 'blow')):
        B = A[n]; kids = [p for p in B['parts'] if p['name'] == 'child']
        imgs = [frame(clip, f['t']) for f in B['frames']]; W, H = imgs[0].size
        for p in kids:
            k = p['k']; masks = []; prev = None
            for i, f in enumerate(B['frames']):
                m = np.array(Image.open(os.path.join(mdir, 'm%d_%02d.png' % (n, i)))) == k
                cnt, lab, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
                if cnt < 2: masks.append(None); continue
                cands = range(1, cnt); j = max(cands, key=lambda c: st[c, cv2.CC_STAT_AREA] - (0 if prev is None else 40 * np.hypot(*(cen[c] - prev))))
                prev = cen[j]; masks.append((lab == j, st[j, cv2.CC_STAT_AREA], cen[j]))
            areas = np.array([x[1] for x in masks if x]); med = np.median(areas); cx = np.median([x[2][0] for x in masks if x]); cy = np.median([x[2][1] for x in masks if x])
            good = [i for i, x in enumerate(masks) if x and .75 * med < x[1] < 1.35 * med and np.hypot(x[2][0] - cx, x[2][1] - cy) < 22]
            if len(good) < 6: print('child', p['label'], tag, 'only', len(good), 'good frames'); continue
            fr = []; box = None
            for i in good:
                m = Image.fromarray((masks[i][0] * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.2))
                im = imgs[i].copy(); im.putalpha(m); b = m.point(lambda v: 255 if v > 90 else 0).getbbox(); fr.append(im)
                box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
            pad = 8; box = (max(0, box[0] - pad), max(0, box[1] - pad), min(W, box[2] + pad), min(H, box[3] + pad)); fr = [f.crop(box) for f in fr]
            w, h = fr[0].size; s = min(1, 300 / max(w, h)); fw, fh = round(w * s), round(h * s); cols = min(len(fr), max(1, 2048 // fw)); rows = math.ceil(len(fr) / cols)
            S = Image.new('RGBA', (cols * fw, rows * fh)); [S.paste(f.resize((fw, fh), Image.LANCZOS), ((i % cols) * fw, (i // cols) * fh)) for i, f in enumerate(fr)]
            ci = int(p['label'].split()[-1]); cid = 'film-child-%d-%s' % (ci, tag); S.save(os.path.join(OUT, cid + '.webp'), 'WEBP', quality=84, method=6)
            fps = len(B['frames']) / (B['end'] - B['start'])
            add.append({'id': cid, 'name': 'CHILD %d · %s' % (ci, 'COMES IN' if tag == 'arrive' else 'BLOWS'), 'src': 'cut/' + cid + '.webp', 'frames': len(fr), 'cols': cols, 'rows': rows, 'fw': fw, 'fh': fh, 'fps': round(fps, 2),
                        'plane': 'table', 'h': {'arrive': [.56, .26, .72], 'blow': [.5, .46, .52]}[tag][ci - 1], 'lift': {'arrive': [-.1, .05, -.14], 'blow': [-.12, -.12, -.12]}[tag][ci - 1], 'from': 'Blade Runner 2049 · the Memory Maker scene, %d:%02d' % (B['start'] // 60, B['start'] % 60), 'kind': 'film'})
            print(cid, len(fr), 'of', len(B['frames']), S.size)
    json.dump(add + cat, open(os.path.join(OUT, 'catalog.json'), 'w'), indent=1)
if __name__ == '__main__': main(*sys.argv[1:4])
