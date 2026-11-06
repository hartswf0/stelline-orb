"""Moving cut-outs for the cineosis orb.
From each Secondhand Motion SAM shot (frames/fNNN.jpg + masks.json: per-frame polygons from Grounding DINO + SAM 2.1),
make one RGBA sprite sheet: every frame cut by its mask, cropped to the union of all masks, packed in a grid.
Also takes a chosen set of CINEOSIS still cut-outs (lab/cutouts/*.png) as single-frame sheets.
Writes cut/<id>.webp and cut/catalog.json. Usage: python3 build_cutouts.py SECONDHAND_SHOTS_DIR [CINEOSIS_LAB_DIR]"""
import json, os, sys, math
from PIL import Image, ImageDraw, ImageFilter
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cut')
# where each kind of thing belongs: stands on the table, on the floor, hangs in the air, or lies flat
HOME = {'cat': ('floor', .32), 'dog': ('floor', .45), 'rabbit': ('floor', .25), 'butterfly': ('air', .08), 'flamingo': ('floor', .9), 'duck': ('floor', .3), 'frog': ('table', .07),
  'horse': ('floor', 1.4), 'fish': ('air', .15), 'penguin': ('floor', .6), 'swan': ('floor', .7), 'monkey': ('floor', .6), 'ice-cream': ('table', .14), 'lollipop': ('table', .16),
  'popsicle': ('table', .14), 'mug': ('table', .1), 'coffee-cup': ('table', .09), 'wine-glass': ('table', .18), 'wine-bottle': ('table', .3), 'vase': ('table', .3), 'flower': ('table', .25),
  'hat': ('table', .14), 'lantern': ('air', .3), 'light-bulb': ('air', .12), 'star': ('air', .2), 'umbrella': ('floor', .9), 'camera': ('table', .12), 'book': ('table', .05),
  'trumpet': ('table', .25), 'guitar': ('floor', 1.0), 'apple': ('table', .08), 'sandwich': ('table', .08)}
def sheet(frames, maxdim=176):
    W = max(f.width for f in frames); H = max(f.height for f in frames); k = min(1, maxdim / max(W, H)); fw, fh = max(1, round(W * k)), max(1, round(H * k))
    n = len(frames); cols = min(n, 10); rows = math.ceil(n / cols); S = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
    for i, f in enumerate(frames): S.paste(f.resize((fw, fh), Image.LANCZOS), ((i % cols) * fw, (i // cols) * fh))
    return S, fw, fh, cols, rows
def moving(shots):
    cat = []
    for slug in sorted(HOME):
        d = os.path.join(shots, slug + '-sam'); mp = os.path.join(d, 'masks.json')
        if not os.path.exists(mp): continue
        M = json.load(open(mp)); C = json.load(open(os.path.join(d, 'clip.json'))); keys = sorted(M, key=int); rgba = []; box = None
        for k in keys:
            fp = os.path.join(d, 'frames', 'f%03d.jpg' % int(k));
            if not os.path.exists(fp): continue
            im = Image.open(fp).convert('RGB'); m = Image.new('L', im.size, 0); dr = ImageDraw.Draw(m)
            for poly in M[k]:
                if len(poly) >= 3: dr.polygon([tuple(p) for p in poly], fill=255)
            m = m.filter(ImageFilter.GaussianBlur(.7)); b = m.getbbox()
            if not b: continue
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3])); im.putalpha(m); rgba.append(im)
        if len(rgba) < 8: continue
        pad = 4; box = (max(0, box[0] - pad), max(0, box[1] - pad), min(C['W'], box[2] + pad), min(C['H'], box[3] + pad)); fr = [f.crop(box) for f in rgba]
        S, fw, fh, cols, rows = sheet(fr); S.save(os.path.join(OUT, slug + '.webp'), 'WEBP', quality=80, method=6)
        cat.append({'id': slug, 'name': slug.replace('-', ' ').upper(), 'src': 'cut/' + slug + '.webp', 'frames': len(fr), 'cols': cols, 'rows': rows, 'fw': fw, 'fh': fh, 'fps': C.get('fps', 12),
                    'plane': HOME[slug][0], 'h': HOME[slug][1], 'from': 'Secondhand Motion · ' + C.get('source_title', ''), 'kind': 'moving'})
        print(slug, len(fr), S.size)
    return cat
def stills(lab, want=36):
    man = json.load(open(os.path.join(lab, 'cache', 'cutouts_clean.json'))); pick = []
    for shot, items in man.items():
        for it in items:
            if it['label'] in ('person', 'object', 'animal') and it['p'] > .8 and it['area'] > .03: pick.append(it)
    pick.sort(key=lambda it: -it['p'] * it['area']); out = []
    for i, it in enumerate(pick[:want]):
        fp = os.path.join(lab, it['png'])
        if not os.path.exists(fp): continue
        im = Image.open(fp).convert('RGBA'); b = im.getchannel('A').getbbox()
        if not b: continue
        im = im.crop(b); S, fw, fh, cols, rows = sheet([im], 256); cid = 'still-%02d' % i; S.save(os.path.join(OUT, cid + '.webp'), 'WEBP', quality=82, method=6)
        out.append({'id': cid, 'name': it['label'].upper() + ' ' + str(i + 1), 'src': 'cut/' + cid + '.webp', 'frames': 1, 'cols': 1, 'rows': 1, 'fw': fw, 'fh': fh, 'fps': 0,
                    'plane': 'floor' if it['label'] == 'person' else 'table', 'h': 1.2 if it['label'] == 'person' else .2, 'from': 'CINEOSIS · ' + os.path.basename(it['png']), 'kind': 'still'})
    return out
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True); cat = moving(sys.argv[1])
    if len(sys.argv) > 2: cat += stills(sys.argv[2])
    json.dump(cat, open(os.path.join(OUT, 'catalog.json'), 'w'), indent=1); print(len(cat), 'cut-outs')

def cast(lab):
    """The Republic's cast (CINEOSIS): archive figures that SAM 2.1 followed for a few seconds, as sprite strips.
    Repacked into grids no wider than 2048 px so phones can hold them as textures."""
    P = json.load(open(os.path.join(lab, 'republic', 'planes.json')))['cast']; out = []
    for name, entries in P.items():
        e = next((x for x in entries if x.get('sp')), None)
        if not e: continue
        sp = e['sp']; fp = os.path.join(lab, sp['f'])
        if not os.path.exists(fp): continue
        strip = Image.open(fp).convert('RGBA'); n, w, h = sp['n'], sp['w'], sp['h']; frames = [strip.crop((i * w, 0, (i + 1) * w, h)) for i in range(n)]
        k = min(1, 220 / max(w, h)); fw, fh = max(1, round(w * k)), max(1, round(h * k)); cols = max(1, min(n, 2048 // fw)); rows = math.ceil(n / cols)
        S = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
        for i, f in enumerate(frames): S.paste(f.resize((fw, fh), Image.LANCZOS), ((i % cols) * fw, (i // cols) * fh))
        cid = 'cast-' + ''.join(c if c.isalnum() else '-' for c in name.lower()).strip('-'); S.save(os.path.join(OUT, cid + '.webp'), 'WEBP', quality=80, method=6)
        person = e.get('kind') != 'cartoon'
        out.append({'id': cid, 'name': name.upper(), 'src': 'cut/' + cid + '.webp', 'frames': n, 'cols': cols, 'rows': rows, 'fw': fw, 'fh': fh, 'fps': sp.get('fps', 8), 'feet': e.get('feet', 1),
                    'plane': 'floor', 'h': 1.15 if person else .55, 'from': 'CINEOSIS · The Republic · ' + (e.get('title') or '') + (' (' + str(e['year']) + ')' if e.get('year') else ''), 'kind': 'cast'})
    return out
if __name__ == '__main__' and len(sys.argv) > 3:
    cat = json.load(open(os.path.join(OUT, 'catalog.json'))); cat = [c for c in cat if c['kind'] != 'cast'] + cast(sys.argv[3]); json.dump(cat, open(os.path.join(OUT, 'catalog.json'), 'w'), indent=1); print(len(cat), 'with the cast')
