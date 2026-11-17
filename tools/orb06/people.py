#!/usr/bin/env python3
"""People from the archive: cut the party-goers out of each birthday clip, unaltered, as RGBA cut-outs.

For every clip whose frame holds people this takes the lifted hero frame (the moment and crop recorded in
assets/eye/lift.json), finds people with the MediaPipe selfie segmenter, removes the cake, splits the result into
separate figures (or groups, where people overlap) and writes each as assets/people/<id>_<k>.webp, with
assets/people/people.json (+ .js) saying which clip and era each came from, where it stood across the frame, how
tall it was in the frame, and whether the clip's label speaks of children. Faces are never altered.

Usage: python3 tools/orb06/people.py      Needs tools/lift/models.py and its weights (see that file).
"""
import os, sys, json, re
import numpy as np, cv2
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'lift'))
import models as M
OUT = os.path.join(ROOT, 'assets', 'people'); os.makedirs(OUT, exist_ok=True)
lift = json.load(open(os.path.join(ROOT, 'assets/eye/lift.json')))['items']
data = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'assets/bday-training/dataset.json')))['items']}
db = {}
for iid in sorted(lift):
    e, d = lift[iid], data[iid]
    if not e.get('ok') or d['segmentation'].get('person_area_pct', 0) < 8: continue
    cap = cv2.VideoCapture(os.path.join(ROOT, 'BDAY TRAINING', e['file'])); n = int(cap.get(7))
    # the moment of the hero shot in which the people are best lit (the hero frame itself is often after the blow)
    best = None
    for u in (.25, .45, .65, .85, 1.0):
        t = e['shot'][0] + (e['hero_t'] - e['shot'][0]) * u
        cap.set(1, int(np.clip(t / e['dur'], 0, .999) * n)); ok, g = cap.read()
        if not ok: continue
        g = g[:e['world_bottom']]; q = M.people(g); lum = cv2.cvtColor(g, cv2.COLOR_BGR2GRAY)
        sc = float((lum * (q > .5)).sum() / 255.0)
        if best is None or sc > best[0]: best = (sc, g, q, t)
    if best is None: continue
    f = best[1]; H, W = f.shape[:2]
    p = cv2.GaussianBlur(best[2], (0, 0), 2)
    boxes = M.detect(f, want=(0,), thresh=.3) + [(s0, c, x0 + ox, y0, x1 + ox, y1) for ox in (0, W - H) for (s0, c, x0, y0, x1, y1) in M.detect(f[:, ox:ox + H], want=(0,), thresh=.3)]
    cake = cv2.resize(cv2.imread(os.path.join(ROOT, 'assets/eye', iid, 'depth.png'))[..., 0], (W, H)) > 127
    cake = cv2.dilate(cake.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    p[cake] = 0
    b = (p > .5).astype(np.uint8)
    b = cv2.morphologyEx(b, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    num, lab, st, cen = cv2.connectedComponentsWithStats(b)
    parts = sorted([l for l in range(1, num) if st[l, cv2.CC_STAT_AREA] > .02 * W * H and st[l, cv2.CC_STAT_HEIGHT] > .3 * H], key=lambda l: -st[l, cv2.CC_STAT_AREA])[:4]
    ppl = []
    for k, l in enumerate(sorted(parts, key=lambda l: cen[l][0])):
        x, y, w, h = st[l, :4]; x0, y0, x1, y1 = max(0, x - 6), max(0, y - 6), min(W, x + w + 6), min(H, y + h + 6)
        if not any(x0 <= (bx[2] + bx[4]) / 2 <= x1 and y0 <= (bx[3] + bx[5]) / 2 <= y1 for bx in boxes): continue      # no person found here: a hand, a prop
        lumc = cv2.cvtColor(f[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY)[lab[y0:y1, x0:x1] == l]
        if lumc.mean() < 42: continue                                                                                # too dark to read
        a = np.where(lab[y0:y1, x0:x1] == l, p[y0:y1, x0:x1], 0); a = np.clip((a - .35) / .5, 0, 1)
        a = cv2.erode(a, np.ones((3, 3), np.uint8)); a = cv2.GaussianBlur(a, (0, 0), 1.2)
        rgba = np.dstack([f[y0:y1, x0:x1], (a * 255).astype(np.uint8)])
        sc = min(1, 420 / rgba.shape[0]); rgba = cv2.resize(rgba, (max(1, int(rgba.shape[1] * sc)), max(1, int(rgba.shape[0] * sc))), interpolation=cv2.INTER_AREA)
        name = '%s_%d.webp' % (iid, len(ppl)); cv2.imwrite(os.path.join(OUT, name), rgba, [cv2.IMWRITE_WEBP_QUALITY, 84])
        ppl.append(dict(file=name, w=rgba.shape[1], h=rgba.shape[0], cx=round(float(cen[l][0] / W), 3), hfrac=round(float(h / H), 3), area=round(float(st[l, cv2.CC_STAT_AREA] / (W * H)), 3)))
    if not ppl: continue
    # the room: the same frame with its people and its cake taken out (filled in from what surrounds them and left
    # soft), so that the guests and the cake being made are the only people and the only cake in the picture
    RW = 960; rs = RW / W; small = cv2.resize(f, (RW, int(H * rs)), interpolation=cv2.INTER_AREA)
    away = ((best[2] > .12) | cake).astype(np.uint8)
    for bx in [[v / (960 / W) for v in e['box']]] + [list(d0[2:]) for d0 in M.detect(f, want=(60,), thresh=.3)[:2]]:      # the cake, by its measured box and by the detector
        x0, y0, x1, y1 = bx; ex, ey = .12 * (x1 - x0), .12 * (y1 - y0); away[int(max(0, y0 - 3 * ey)):int(min(H, y1 + ey)), int(max(0, x0 - ex)):int(min(W, x1 + ex))] = 1
    gone = cv2.dilate(away, np.ones((61, 61), np.uint8)); gone = cv2.resize(gone, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    q4 = cv2.resize(small, (240, int(small.shape[0] / 4)), interpolation=cv2.INTER_AREA); g4 = cv2.resize(gone, (q4.shape[1], q4.shape[0]), interpolation=cv2.INTER_NEAREST)
    fill = cv2.resize(cv2.inpaint(q4, g4 * 255, 9, cv2.INPAINT_TELEA), (small.shape[1], small.shape[0]), interpolation=cv2.INTER_CUBIC); fill = cv2.GaussianBlur(fill, (0, 0), 18)
    soft = cv2.GaussianBlur(gone.astype(np.float32), (0, 0), 12)[..., None]
    clean = (small * (1 - soft) + fill * soft).astype(np.uint8)
    os.makedirs(os.path.join(ROOT, 'assets', 'rooms'), exist_ok=True)
    cv2.imwrite(os.path.join(ROOT, 'assets', 'rooms', iid + '.webp'), small, [cv2.IMWRITE_WEBP_QUALITY, 80]); cv2.imwrite(os.path.join(ROOT, 'assets', 'rooms', iid + '_clean.webp'), clean, [cv2.IMWRITE_WEBP_QUALITY, 80])
    label = (d['title'] + ' ' + e['file']).lower()
    db[iid] = dict(id=iid, era=d['era'], title=d['title'], kids=bool(re.search(r'child|kid|girl|boy', label)), t=round(float(best[3]), 3), taken_out=round(float(gone.mean()), 3), people=ppl)
    print(iid, d['era'], 'kids' if db[iid]['kids'] else 'grown', len(ppl), [q['hfrac'] for q in ppl], flush=True)
json.dump(db, open(os.path.join(OUT, 'people.json'), 'w'), indent=0)
open(os.path.join(OUT, 'people.js'), 'w').write('window.PEOPLE=' + json.dumps(db, separators=(',', ':')) + ';')
print(len(db), 'clips', sum(len(v['people']) for v in db.values()), 'cut-outs')
