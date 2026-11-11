#!/usr/bin/env python3
"""Draw each measured revolve over its plate (rings, axis, candle bases) so the fit can be judged by eye.
Usage: python3 tools/lift/viz.py out.jpg [ids...]"""
import os, sys, json, math, numpy as np, cv2
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
db = json.load(open(os.path.join(ROOT, 'assets/eye/lift.json')))['items']
ids = sys.argv[2:] or sorted(db)
tiles = []
for i in ids:
    e = db[i]
    if not e.get('ok'): continue
    im = cv2.imread(os.path.join(ROOT, 'assets/eye', i, 'plate.webp'))
    r = e.get('revolve')
    if r:
        p = math.radians(r['pitch'])
        for k, (rad, h) in enumerate(r['prof']):
            if k % 3 and k != len(r['prof']) - 1: continue
            c = (int(r['xc']), int(r['y_bc'] - h * math.cos(p)))
            cv2.ellipse(im, c, (max(1, int(rad)), max(1, int(rad * math.sin(p)))), 0, 0, 360, (0, 255, 255) if k % 6 == 0 else (0, 160, 255), 1, cv2.LINE_AA)
        top = r['prof'][-1][1]
        for c in r['candles']:
            b = (int(r['xc'] + c['x']), int(r['y_bc'] - top * math.cos(p) + c['z'] * math.sin(p)))
            cv2.line(im, b, (b[0], int(b[1] - c['h'] * math.cos(p))), (255, 80, 255), 2)
    cv2.putText(im, '%s pitch %.0f%s r2 %.2f k %s' % (i, r['pitch'] if r else 0, '' if r and r['pitch_measured'] else '(prior)', e.get('round_r2', 0), 'ok' if e.get('ruler_ok') else 'default'), (8, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
    tiles.append(cv2.resize(im, (640, int(640 * im.shape[0] / im.shape[1]))))
h = max(t.shape[0] for t in tiles); tiles = [cv2.copyMakeBorder(t, 0, h - t.shape[0], 0, 0, cv2.BORDER_CONSTANT) for t in tiles]
cols = 3; rows = [np.hstack(tiles[i:i + cols] + [np.zeros_like(tiles[0])] * (cols - len(tiles[i:i + cols]))) for i in range(0, len(tiles), cols)]
cv2.imwrite(sys.argv[1], np.vstack(rows))
