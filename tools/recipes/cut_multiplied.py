#!/usr/bin/env python3
"""EVERY CAKE, MULTIPLIED: the second edit. Where the first edit cuts between pictures, this one puts pictures inside each other.

Every way of blending or multiplying footage here is a small function over frames (numpy), so each can be reused or re-ordered:

  slits      one film moment, four ways at once: the clean plate, its segmentation, its depth and edges, and the coded 3D stage,
             in sliding vertical bands. The first three are registered pixel for pixel, so a face continues across the cut.
  cutouts    film cut-outs (animated sprite sheets with alpha) standing in the coded room while its camera circles the cake.
  swap       one cast held still, the cake under them changed on every half beat: each element could be otherwise.
  parade     all 77 isolated cakes in three rows moving against each other, the one at centre brought forward.
  blend      a synthetic plate and the coded build of the same cake in one frame: slats, a diagonal wipe, a strobe that settles
             into a dissolve, and a lighten where the two blow-outs land on the same frame.
  grid       the same moment many times: 1, 4, 9, then 20 blow-outs, each tile started so its own measured loss of light lands on
             the same beat (the flames go within about half a second of each other). 20 is every blow-out in the corpus;
             at 5 x 4 a tile is 254 px wide and the faces still read.
  rewind     those 20, backwards: the flames return together.
  stack      three blow-outs lightened into one frame (kept to three: the faces already overlap), then every orb build under the mist.

  python3 tools/recipes/cut_multiplied.py [recipe_films_dir] [hero_dir] [out.mp4]
Needs assets/recipes/every-cake-built.mp4 (for the 42-build mosaic) and hero orbits from record_recipes.cjs --hero.
"""
import json, os, subprocess, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets/recipes')
HERO = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'assets/recipes/hero')
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, 'assets/recipes/every-cake-multiplied.mp4')
A = os.path.join(ROOT, 'assets'); BD = os.path.join(ROOT, 'BDAY TRAINING'); MUSIC = os.path.join(A, 'audio/mix3_tizita_full_anthem.mp3')
FPS, W, H, PH, PY = 24, 1280, 720, 576, 72
PERIOD, DROP, LEAD = 0.8227, 153.0, 26          # measured on the anthem: the big entry at 153.0 s, 0.8227 s a beat there; the edit starts 26 beats before it
T0 = DROP - LEAD * PERIOD
MONO = '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf'; DISP = '/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf'
L = json.load(open(os.path.join(BD, 'labels.json'))); ITEMS = {i['id']: i for i in L['items'] if i['kind'] == 'video'}
def fr(b): return int(round(b * PERIOD * FPS))

# ------------------------------------------------------------------ reading footage as frames
def read(path, t0, n, vf, w=W, h=PH, speed=1.0):
    """n frames of w x h from path, starting at t0, through the filter chain vf; the last frame is held if the clip runs out."""
    chain = (vf + ',' if vf else '') + (f'setpts=PTS/{speed:.5f},' if speed != 1 else '') + f'fps={FPS},scale={w}:{h}:flags=bicubic,tpad=stop_mode=clone:stop_duration=30'
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{max(0, t0):.3f}', '-i', path, '-vf', chain, '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    for _ in range(n):
        b = p.stdout.read(w * h * 3)
        if len(b) < w * h * 3: raise SystemExit('short read ' + path)
        yield np.frombuffer(b, np.uint8).reshape(h, w, 3)
    p.stdout.close(); p.wait()
def world_h(cid):
    ys = ITEMS[cid]['segmentation'].get('y_split', 550); return 720 if ys >= 720 else int(round(ys * 0.78 / 2) * 2)
HUD_LL = {'bday_02', 'bday_09', 'bday_51'}      # generator captions burnt into the dark lower-left corner: interpolated away
def plate_vf(cid):          # only the memory: everything from the generated controller down is cut away
    wh = world_h(cid)
    if wh >= 720: return f'scale={W}:{H},crop={W}:{PH}:0:20'
    mask = f'delogo=x=2:y={int(wh * 0.6)}:w=470:h={wh - int(wh * 0.6) - 3},' if cid in HUD_LL else ''
    return f'{mask}crop={W}:{wh}:0:0,scale=-2:{PH},crop={W}:{PH}'
def plate(cid, t0, n, w=W, h=PH, speed=1.0):
    return read(os.path.join(BD, ITEMS[cid]['filename']), min(max(0, t0), ITEMS[cid]['duration_s'] - 0.2), n, plate_vf(cid), w, h, speed)
V169 = f'scale={W}:{H},crop={W}:{PH}:0:72'            # any 16:9 source to the 2.22:1 picture
def lum(cid):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(BD, ITEMS[cid]['filename']), '-vf', 'crop=iw:ih*0.58:0:0,scale=64:24,fps=12', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 24 * 64).astype(np.float32).mean(axis=1)
_bt = {}
def blow_time(cid):
    if cid not in _bt: l = lum(cid); d = l[6:] - l[:-6]; _bt[cid] = (int(d.argmin()) + 3) / 12.0
    return _bt[cid]
def rgba(path): return Image.open(path).convert('RGBA')
def paste(canvas, im, cx, by, scale=1.0, alpha=1.0):
    """im (PIL RGBA) onto canvas (PIL RGB), centred on cx, its bottom edge at by."""
    if scale != 1.0: im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BILINEAR)
    if alpha < 1: im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
    canvas.paste(im, (int(cx - im.width / 2), int(by - im.height)), im)
def glow(cx, cy, r, col=(255, 170, 80), k=0.5):
    y, x = np.mgrid[0:PH, 0:W]; d = np.clip(1 - np.hypot((x - cx) / r, (y - cy) / (r * 0.62)), 0, 1) ** 2
    return (d[..., None] * np.array(col) * k).astype(np.uint8)
XX = np.arange(W)[None, :].repeat(PH, 0); YY = np.arange(PH)[:, None].repeat(W, 1)

# ------------------------------------------------------------------ the techniques
def slits(passes, n, beat_frames):
    K = len(passes); bw = W / K
    for f, frames in enumerate(zip(*passes)):
        s = bw * (f / beat_frames) * 0.5 + 18 * math.sin(f / 9.0)          # the bands slide half a band a beat, and breathe
        idx = np.floor((XX + s) / bw).astype(int) % K; out = np.zeros((PH, W, 3), np.uint8)
        for k in range(K): m = idx == k; out[m] = frames[k][m]
        edge = np.abs(((XX + s) % bw)) < 2; out[edge] = 0
        yield out
def cutouts(bg, sprites, n):
    """sprites: (sheet RGBA, frames, cx0, cx1, bottom, scale, fps): a film cut-out drifting across the coded room."""
    for f, b in enumerate(bg):
        u = f / max(1, n - 1); im = Image.fromarray(b)
        for sheet, fn, cx0, cx1, by, sc, sfps in sprites:
            fw = sheet.width // fn; k = int(f / FPS * sfps) % fn; cell = sheet.crop((k * fw, 0, (k + 1) * fw, sheet.height))
            paste(im, cell, cx0 + (cx1 - cx0) * u, by, sc * (1 + 0.05 * u), min(1.0, f / 10))
        yield np.asarray(im)
def swap(casts, cakes, n, half):
    base = glow(W / 2, PH * 0.62, 620, k=0.42)
    for f in range(n):
        ci = min(len(casts) - 1, f // (half * 4)); ki = (f // half) % len(cakes); age = f % half; im = Image.fromarray(base)
        cast = casts[ci]; paste(im, cast, W / 2, PH + 6, 520 / cast.height * (1 + 0.04 * (f % (half * 4)) / (half * 4)))
        cake = cakes[ki]; paste(im, cake, W / 2, PH - 26, 250 / max(cake.width, cake.height) * (1 + 0.16 * max(0, 1 - age / 3)))
        yield np.asarray(im)
def parade(cakes, n):
    rows = [cakes[i::3] for i in range(3)]; gap = 176; base = glow(W / 2, PH / 2, 760, k=0.3)
    for f in range(n):
        im = Image.fromarray(base)
        for r, row in enumerate(rows):
            span = gap * len(row); off = (f * (7.5 if r != 1 else -9.0)) % span
            for i, c in enumerate(row):
                x = (i * gap + off) % span - gap
                if x < -gap or x > W + gap: continue
                near = math.exp(-((x - W / 2) / 190.0) ** 2) if r == 1 else 0
                paste(im, c, x, 150 + r * 178 + 14 * near, (118 + 62 * near) / max(c.width, c.height))
        yield np.asarray(im)
def blend(a, b, n, mode):
    for f, (x, y) in enumerate(zip(a, b)):
        u = f / max(1, n - 1)
        if mode == 'slats': m = (((XX / 80.0) + u * 2.0) % 1.0) < (0.5 + 0.42 * math.sin(u * math.pi * 2)); out = np.where(m[..., None], y, x)
        elif mode == 'wipe':
            e = np.clip((XX + YY * 0.6 - (W + PH * 0.6 + 120) * (1.15 * u - 0.05) + 60) / 120.0, 0, 1)[..., None]; out = (y * (1 - e) + x * e).astype(np.uint8)
        elif mode == 'strobe': out = (y if (f // 3) % 2 else x) if u < 0.5 else ((x.astype(np.uint16) + y) // 2).astype(np.uint8)
        else: out = np.maximum(x, y)
        yield out
def grid(tiles, cols, rows):
    tw, th = W // cols, PH // rows; ox, oy = (W - cols * tw) // 2, (PH - rows * th) // 2
    for frames in zip(*tiles):
        out = np.zeros((PH, W, 3), np.uint8)
        for i, t in enumerate(frames): r, c = divmod(i, cols); out[oy + r * th + 1:oy + (r + 1) * th - 1, ox + c * tw + 1:ox + (c + 1) * tw - 1] = t
        yield out
def tiles_of(cids, cols, rows, n, lead):       # every tile starts `lead` seconds before its own breath
    tw, th = W // cols - 2, PH // rows - 2
    return [plate(c, blow_time(c) - lead, n, tw, th) for c in cids]
def stack(srcs):
    for frames in zip(*srcs): yield np.maximum.reduce(frames)
def screen(a, b):
    for x, y in zip(a, b): yield (255 - ((255 - x.astype(np.uint16)) * (255 - y) // 255)).astype(np.uint8)
def card(lines, n, fade_in=18, fade_out=0):
    im = Image.new('RGB', (W, H), 'black'); d = ImageDraw.Draw(im); y = H / 2 - sum(s for _, s, _ in lines) * 0.75
    for txt, size, col in lines:
        font = ImageFont.truetype(DISP if size >= 30 else MONO, size); tw = d.textlength(txt, font=font); d.text(((W - tw) / 2, y), txt, font=font, fill=col); y += size * 1.5
    a = np.asarray(im).astype(np.float32)
    for f in range(n): k = min(1, f / fade_in if fade_in else 1, (n - f) / fade_out if fade_out else 1); yield (a * k).astype(np.uint8)

# ------------------------------------------------------------------ the frame round the picture: one line of caption in each bar, nothing on the picture
def bars(sec, left, right):
    im = Image.new('RGB', (W, H), 'black'); d = ImageDraw.Draw(im); f = ImageFont.truetype(MONO, 15)
    d.text((40, PY - 36), sec, font=f, fill=(255, 204, 102)); t = 'EVERY CAKE, MULTIPLIED'; d.text((W - 40 - d.textlength(t, font=f), PY - 36), t, font=f, fill=(92, 94, 93))
    d.text((40, PY + PH + 22), left, font=f, fill=(206, 210, 208)); d.text((W - 40 - d.textlength(right, font=f), PY + PH + 22), right, font=f, fill=(102, 240, 216))
    return np.asarray(im).copy()

# ------------------------------------------------------------------ the cut
SHOTS = []
def add(beats, sec, left, right, make): SHOTS.append((beats, sec, left, right, make))
MV = os.path.join(A, 'moments_videos'); hero = lambda r: os.path.join(HERO, r + '_hero.mp4')
I, II, III = 'I · ONE MOMENT, MANY WAYS', 'II · EACH ELEMENT COULD BE OTHERWISE', 'III · THE SAME BREATH'
add(3, '', '', '', lambda n: card([('EVERY CAKE, MULTIPLIED', 54, (240, 244, 242)), ('FILM · SEGMENT · DEPTH · CODED · SYNTHETIC · IN ONE FRAME', 16, (255, 204, 102))], n))
for m, name in [('m29', 'THE CHILDREN FADE IN'), ('m44', 'THE TABLE, LIT'), ('m36', 'A BOY BY CANDLELIGHT'), ('m46', 'THE CANDLES GO OUT')]:
    def mk(n, m=m):
        coded = os.path.join(MV, m + '_stelline3d.mp4'); cd = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', coded], capture_output=True, text=True).stdout)
        fd = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(MV, m + '_film_chamber_clean.mp4')], capture_output=True, text=True).stdout); sp = min(1.0, fd / (n / FPS))
        return slits([read(os.path.join(MV, m + '_film_chamber_clean.mp4'), 0, n, V169, speed=sp), read(os.path.join(MV, m + '_seg_isolated.mp4'), 0, n, V169, speed=sp),
                      read(os.path.join(MV, m + '_cond_depth_edge.mp4'), 0, n, V169, speed=sp), read(coded, max(0, cd - n / FPS - 0.1), n, V169)], n, fr(1))
    add(4, I, 'FILM · ' + name, 'SLITS · PLATE / SEGMENT / DEPTH + EDGE / CODED 3D', mk)
def mk_cut(n):
    S = lambda f: rgba(os.path.join(A, 'cutouts', f))
    return cutouts(read(hero('film_canon'), 0, n, V169, speed=4.0 / (n / FPS) * 0.62), [(S('stelline_blow_trio.webp'), 16, 250, 310, PH + 10, 1.75, 8), (S('stelline_boy_blow.webp'), 16, 1060, 990, PH + 14, 1.7, 8)], n)
add(7, I, 'FILM CUT-OUTS IN THE CODED ROOM', 'CUT-OUT · 2 SPRITES OVER A CIRCLING STAGE', mk_cut)
# the drop
order = sorted(ITEMS, key=lambda c: (ITEMS[c]['era'], c)); CAKES = None
def cakes():
    global CAKES
    if CAKES is None:
        CAKES = []
        for c in order:
            im = rgba(os.path.join(ROOT, ITEMS[c]['assets']['cake_rgba'])); bb = im.getbbox()
            if bb and (bb[2] - bb[0]) > 40: CAKES.append(im.crop(bb))
    return CAKES
ERAS = ['chamber_kids', 'era_1920s_bw', 'era_1950s_kids', 'era_1970s_family', 'era_1980s_neon', 'era_1990s_party', 'era_2049_cyberpunk', 'era_1920s_speakeasy']
add(8, II, '8 CASTS HELD · THE CAKE CHANGED EVERY HALF BEAT', 'SWAP · 16 OF ' + str(77) + ' CAKES', lambda n: swap([rgba(os.path.join(A, 'bday-training/cutouts', e + '.webp')) for e in ERAS], cakes()[3::4], n, max(1, fr(0.5))))
add(8, II, 'EVERY CAKE CUT FROM ITS PLATE', 'PARADE · 77 · THREE ROWS', lambda n: parade(cakes(), n))
PAIRS = [('bday_51', 4.0, 'bundt_12flute_glaze', 'slats', 4, 'SLATS'), ('bday_07', 6.4, 'synthwave_neon_tiers', 'wipe', 4, 'DIAGONAL WIPE'), ('bday_09', 5.0, 'three_tier_orb_grand', 'strobe', 3, 'STROBE, THEN DISSOLVE')]
for cid, t0, rid, mode, beats, name in PAIRS:
    add(beats, II, 'SYNTHETIC ' + cid.upper().replace('_', ' ') + '  ×  CODED ' + rid.upper().replace('_', ' '), 'BLEND · ' + name, lambda n, cid=cid, t0=t0, rid=rid, mode=mode: blend(plate(cid, t0, n), read(hero(rid), 0.2, n, V169), n, mode))
def mk_light(n):       # both breaths on one frame: the coded cake is blown out 64% through its 4 s orbit
    at = n / FPS * 0.55; return blend(plate('bday_33', blow_time('bday_33') - at, n), read(hero('film_canon'), 4 * 0.64 + 0.35 - at, n, V169), n, 'lighten')
add(3, II, 'SYNTHETIC BDAY 33  ×  CODED THE CAKE SHE KEPT', 'BLEND · LIGHTEN · TWO BREATHS, ONE FRAME', mk_light)
# the second hit: the same breath, multiplied
B = ['bday_31', 'bday_28', 'bday_34', 'bday_45', 'bday_16', 'bday_33', 'bday_68', 'bday_26', 'bday_30', 'bday_32', 'bday_78', 'bday_35', 'bday_69', 'bday_71', 'bday_29', 'bday_67', 'bday_18', 'bday_27', 'bday_73', 'bday_77']
for cids, cols, rows in [(B[:1], 1, 1), (B[1:5], 2, 2), (B[5:14], 3, 3), (B, 5, 4)]:
    add(4, III, f'{len(cids)} BREATH' + ('S' if len(cids) > 1 else '') + ' · THE LIGHT GOES ON THE THIRD BEAT', f'MULTIPLY · {cols} × {rows}', lambda n, cids=cids, cols=cols, rows=rows: grid(tiles_of(cids, cols, rows, n, 2 * PERIOD), cols, rows))
def mk_rev(n):
    fs = list(grid(tiles_of(B, 5, 4, n, n / FPS - 0.35), 5, 4)); return iter(fs[::-1])
add(4, III, '20 BREATHS TURNED BACK · THE FLAMES RETURN TOGETHER', 'MULTIPLY · 5 × 4 · REVERSED', mk_rev)
add(4, III, '3 BREATHS IN ONE FRAME', 'STACK · LIGHTEN · 3', lambda n: stack([plate(c, blow_time(c) - 2 * PERIOD, n) for c in ['bday_33', 'bday_34', 'bday_31']]))
def mk_mist(n):
    first = os.path.join(A, 'recipes/every-cake-built.mp4'); e = json.load(open(os.path.splitext(first)[0] + '.edl.json')); m = next(s for s in e['shots'] if s['beats'] == 10)
    return screen(read(first, m['t'] + m['frames'] / FPS - n / FPS - 0.1, n, f'crop={W}:{PH}:0:{PY}'), read(os.path.join(MV, 'master_05_mist_pointcloud_supercut.mp4'), 4.0, n, V169))
add(4, III, '42 CODED BUILDS UNDER THE MIST OF THE FILM', 'STACK · SCREEN', mk_mist)
add(6, '', '', '', lambda n: card([('8 WAYS TO PUT ONE PICTURE INSIDE ANOTHER', 30, (240, 244, 242)), ('', 10, (0, 0, 0)), ('SLITS · CUT-OUT · SWAP · PARADE · BLEND · GRID · REWIND · STACK', 16, (102, 240, 216)), ('STELLINE ORB · SCION DIEGETIC · 1000 SMALL FUTURES', 16, (255, 204, 102))], n, fade_in=10, fade_out=44))

if os.environ.get('ONLY'): SHOTS = [SHOTS[int(i)] for i in os.environ['ONLY'].split(',')]      # ONLY=1,5,6 renders just those shots, to try a technique
total_b = sum(s[0] for s in SHOTS); total = fr(total_b) / FPS
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-ss', f'{T0:.3f}', '-t', f'{total:.3f}', '-i', MUSIC,
                        '-filter_complex', f'[1:a]afade=t=in:st=0:d=0.6,afade=t=out:st={total - 3.4:.3f}:d=3.4[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
                        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT], stdin=subprocess.PIPE)
b = 0.0; edl = []
for k, (beats, sec, left, right, make) in enumerate(SHOTS):
    f0 = fr(b); b += beats; n = fr(b) - f0; frame = bars(sec, left, right) if (sec or left) else None; c = 0
    for pic in make(n):
        if pic.shape[0] == H: out = pic
        else: frame[PY:PY + PH] = pic; out = frame
        enc.stdin.write(out.tobytes()); c += 1
        if c >= n: break
    assert c == n, (k, c, n)
    edl.append({'shot': k, 't': round(f0 / FPS, 3), 'frames': n, 'beats': beats, 'technique': right or 'CARD', 'what': left}); print(f'{k:3d} {f0 / FPS:7.2f}s {n:4d}f  {right}', flush=True)
enc.stdin.close(); enc.wait()
json.dump({'fps': FPS, 'beat_s': PERIOD, 'music_from_s': round(T0, 3), 'duration_s': round(total, 3), 'shots': edl}, open(os.path.splitext(OUT)[0] + '.edl.json', 'w'), indent=1)
grid_shot = next((e for e in edl if e['technique'].startswith('MULTIPLY · 5')), edl[0])
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f"{grid_shot['t'] + 1.0:.3f}", '-i', OUT, '-frames:v', '1', '-q:v', '3', os.path.splitext(OUT)[0] + '.jpg'])
print('wrote', OUT, f'{total:.1f}s', len(SHOTS), 'shots')
