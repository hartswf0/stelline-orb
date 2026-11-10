#!/usr/bin/env python3
"""The best sets of three, per shot type, by colour and composition.

Shot types are the archive's own: the angle families in BDAY TRAINING/labels.json (and, as a second axis, the event each bar carries).
Only clips kept by register.py are candidates, so every member is already on the grid and on the beat.

For each bar, measured on the frame just before its event (frame 30 of 78):
  colour       mean lightness, mean chroma, the hue the chroma points to, and a 12-bin hue histogram weighted by chroma
  composition  how far the cake still sits from the grid (dx, dy, size), how evenly the people fall left and right of it (from the masks),
               and whether the crown has headroom
Each bar gets a composition score in 0..1. Every set of three within a type is then scored two ways:
  MATCH     the three share a palette: small distance between their hue histograms and their lightness. They cut together invisibly.
  CONTRAST  the three stand apart in hue (the smallest gap between any two is as large as possible) while lightness stays close.
            They read as a deliberate three-colour set.
Both are multiplied by the three composition scores, so a striking palette cannot carry a badly framed bar.

  python3 tools/normalize/triads.py     -> assets/normalized/triads.json, triads/<type>__<mode>.jpg, masks/<id>.png
"""
import json, os, subprocess, itertools, colorsys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); N = os.path.join(ROOT, 'assets/normalized'); BD = os.path.join(ROOT, 'BDAY TRAINING')
I = json.load(open(os.path.join(N, 'index.json'))); KEPT = [c for c in I['clips'] if c['keep']]; GRID = I['grid']; W, PH = I['picture']
ITEMS = {i['id']: i for i in json.load(open(os.path.join(BD, 'labels.json')))['items']}
def frame(cid, f=30, size=(320, 144)):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{f / 24:.3f}', '-i', os.path.join(N, 'bars', cid + '.mp4'), '-vf', f'scale={size[0]}:{size[1]}', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(size[1], size[0], 3).astype(np.float32) / 255
def masks(c):
    """The stored segmentation, carried through this clip's crop, zoom and shift: (people, cake) as 0/1 arrays in picture coordinates."""
    it = ITEMS[c['id']]; a = np.asarray(Image.open(os.path.join(ROOT, it['assets']['seg'])).convert('RGB')).astype(np.float32); w = a.shape[1] // 3; p1, p2 = a[:, :w], a[:, w:2 * w]
    ys = it['segmentation'].get('y_split', 720); hh = int(round(180 * min(ys, 720) / 720)); p1r = np.asarray(Image.fromarray(p1.astype(np.uint8)).resize((w, hh), Image.BILINEAR)).astype(np.float32); d = p2[:hh] - 0.45 * p1r
    r, g, b = d[..., 0], d[..., 1], d[..., 2]; out = []
    for m in ((r > 40) & (b > 28) & (r > g + 25), (g > 45) & (g > r + 25) & (g > b)):
        full = np.zeros((180, w), np.uint8); full[:hh][m] = 255; im = Image.fromarray(full).resize((W, 720), Image.BILINEAR); wh = c['world_h']; f = c['fit']; z = f['zoom']
        if wh >= 720: im = im.crop((0, 20, W, 20 + PH))
        else: im = im.crop((0, 0, W, wh)); sw = int(round(W * PH / wh)); im = im.resize((sw, PH), Image.BILINEAR).crop(((sw - W) // 2, 0, (sw - W) // 2 + W, PH))
        im = im.resize((int(W * z), int(PH * z)), Image.BILINEAR).crop((int(round(-f['tx'])), int(round(-f['ty'])), int(round(-f['tx'])) + W, int(round(-f['ty'])) + PH))
        out.append((np.asarray(im) > 110))
    return out
def features(c):
    x = frame(c['id']); mx, mn = x.max(-1), x.min(-1); chroma = mx - mn; light = x.mean(-1)
    hue = np.zeros_like(mx); r, g, b = x[..., 0], x[..., 1], x[..., 2]; d = np.where(chroma > 1e-4, chroma, 1)
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6.0
    wgt = chroma * (light > 0.06); hist = np.histogram(hue, bins=12, range=(0, 1), weights=wgt)[0]; hist = hist / max(1e-6, hist.sum())
    ang = hue * 2 * np.pi; vx, vy = (np.cos(ang) * wgt).sum(), (np.sin(ang) * wgt).sum(); dom = (np.arctan2(vy, vx) / (2 * np.pi)) % 1; purity = float(np.hypot(vx, vy) / max(1e-6, wgt.sum()))
    people, cake = masks(c); os.makedirs(os.path.join(N, 'masks'), exist_ok=True)
    Image.fromarray(np.dstack([people * 255, cake * 255, np.zeros_like(cake)]).astype(np.uint8)).resize((640, 288), Image.NEAREST).save(os.path.join(N, 'masks', c['id'] + '.png'))
    cx = GRID['cx']; pl, pr = float(people[:, :cx].mean()), float(people[:, cx:].mean()); bal = 1 - abs(pl - pr) / max(0.02, pl + pr) if pl + pr > 0.02 else 0.85
    f = c['fit']; on_grid = max(0, 1 - (abs(f['dx']) / 80 + abs(f['dy']) / 70 + abs(f['size'] - 1) / 0.3) / 3); head = min(1.0, max(0.0, (GRID['top'] + f['dy']) / 120))
    comp = 0.5 * on_grid + 0.3 * bal + 0.2 * head; rgb = x.reshape(-1, 3)[light.reshape(-1) > 0.06].mean(0) if (light > 0.06).any() else np.zeros(3)
    return {'light': float(light.mean()), 'chroma': float(chroma.mean()), 'hue': float(dom), 'purity': purity, 'hist': hist.tolist(), 'balance': round(bal, 3), 'on_grid': round(on_grid, 3), 'headroom': round(head, 3), 'composition': round(comp, 3),
            'swatch': '#%02x%02x%02x' % tuple(int(v * 255) for v in rgb)}
def hue_gap(a, b): d = abs(a - b) % 1; return min(d, 1 - d)
def best(pool, F):
    out = {}
    for mode in ('MATCH', 'CONTRAST'):
        top = None
        for tri in itertools.combinations(pool, 3):
            comp = np.prod([F[t]['composition'] for t in tri]); lights = [F[t]['light'] for t in tri]; dl = max(lights) - min(lights)
            if mode == 'MATCH':
                dh = np.mean([np.abs(np.array(F[a]['hist']) - np.array(F[b]['hist'])).sum() / 2 for a, b in itertools.combinations(tri, 2)]); colour = (1 - dh) * (1 - min(1, dl / 0.25))
            else:
                gap = min(hue_gap(F[a]['hue'], F[b]['hue']) for a, b in itertools.combinations(tri, 2)); colour = min(1, gap / 0.33) * (1 - min(1, dl / 0.35)) * np.mean([F[t]['purity'] for t in tri]) ** 0.5
            s = float(colour * comp)
            if top is None or s > top[0]: top = (s, tri, float(colour), float(comp))
        if top: out[mode] = {'clips': sorted(top[1], key=lambda t: F[t]['hue']), 'score': round(top[0], 3), 'colour': round(top[2], 3), 'composition': round(top[3], 3)}
    return out
def main():
    F = {c['id']: features(c) for c in KEPT}; types = {}
    for c in KEPT:
        types.setdefault('ANGLE · ' + ITEMS[c['id']]['cinematography']['angle_family'].replace('_', ' '), []).append(c['id']); types.setdefault('EVENT · ' + c['event']['kind'].upper(), []).append(c['id'])
    res = {'method': 'see tools/normalize/triads.py', 'features': F, 'types': {}}; os.makedirs(os.path.join(N, 'triads'), exist_ok=True)
    for name, pool in sorted(types.items()):
        if len(pool) < 3: res['types'][name] = {'pool': pool, 'note': 'fewer than three kept clips of this type'}; continue
        b = best(pool, F); res['types'][name] = {'pool': pool, **b}
        for mode, t in b.items():
            ims = [Image.fromarray((frame(cid, 30, (1280, 576))[:, 427:853] * 255).astype(np.uint8)) for cid in t['clips']]; sh = Image.new('RGB', (1280, 576)); [sh.paste(im, (427 * i, 0)) for i, im in enumerate(ims)]
            t['still'] = 'assets/normalized/triads/' + name.replace(' · ', '_').replace(' ', '_').lower() + '__' + mode.lower() + '.jpg'; sh.save(os.path.join(ROOT, t['still']), quality=88)
        print(name, len(pool), {m: (t['clips'], t['score']) for m, t in b.items()})
    json.dump(res, open(os.path.join(N, 'triads.json'), 'w'), indent=1); open(os.path.join(N, 'triads.js'), 'w').write('window.TRIADS = ' + json.dumps(res) + ';\n')
if __name__ == '__main__': main()
