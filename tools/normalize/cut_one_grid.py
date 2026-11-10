#!/usr/bin/env python3
"""ONE GRID, ONE BAR: the normalized corpus, and four cuts made from it.

Step 1 (bars). Every clip kept by tools/normalize/register.py is rendered as one bar: 78 frames (4 beats at 73.83 bpm), 1280 x 576, zoomed and
shifted so its cake stands on the shared grid, and timed so its event (the breath, the turn, the arrival) falls on the first frame of beat 3.
assets/normalized/bars/<id>.mp4. Its coded twin (the Memory Weaver building the same recipe, filmed on the same grid for the same bar by
record_recipes.cjs --twin) is copied beside it as <id>_twin.mp4, and what the segmentation saw is saved as vision/<id>.png.

Step 2 (cuts). Because every bar shares a grid and a clock, any frame of any bar can follow any frame of any other and the cake does not move,
and anything laid side by side is already in time. The cuts use only that:

  one-grid.mp4     the whole culled corpus in era order: what the machine sees, the arrivals and turns, plate into twin, every breath,
                   a flicker of all bars on one frame, then all bars at once and all twins at once.
  nine-rooms.mp4   one bar per era or room (nine in the corpus), each a single cake made of two halves: the synthetic plate left of a moving seam, its coded twin right.
  the-breath.mp4   every blow-out as plate, then as twin at double pace, then all together.
  the-turn.mp4     every change of colour or form, with the segmentation shown on the first beat.

  python3 tools/normalize/cut_one_grid.py [twin_source_dir]
"""
import json, os, subprocess, sys, shutil, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); BD = os.path.join(ROOT, 'BDAY TRAINING'); N = os.path.join(ROOT, 'assets/normalized')
I = json.load(open(os.path.join(N, 'index.json'))); CL = {c['id']: c for c in I['clips']}; KEPT = [c for c in I['clips'] if c['keep']]; GRID = I['grid']
FPS, W, H, PH, PY, BAR, EV, BEAT = 24, 1280, 720, 576, 72, I['bar_frames'], I['event_frame'], I['beat_s']
MUSIC = os.path.join(ROOT, 'assets/audio/mix1_tizita_stelline_soul.mp3'); MPHASE = 0.4179592
MONO = '/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf'; DISP = '/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf'
L = json.load(open(os.path.join(BD, 'labels.json'))); ITEMS = {i['id']: i for i in L['items']}
def fb(b): return int(round(b * BEAT * FPS))            # beats -> frames
def run(a):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y'] + a, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-1200:]); raise SystemExit('ffmpeg failed')

# ------------------------------------------------------------------ step 1: the bars, the twins, the vision
def plate_vf(c):
    wh = c['world_h']; f = c['fit']; z = f['zoom']
    base = f'scale={W}:{H},crop={W}:{PH}:0:20' if wh >= 720 else f'crop={W}:{wh}:0:0,scale=-2:{PH},crop={W}:{PH}'
    return f"{base},scale={int(W * z / 2) * 2}:{int(PH * z / 2) * 2}:flags=lanczos,crop={W}:{PH}:{int(round(-f['tx']))}:{int(round(-f['ty']))}"
def render_bars(twin_src):
    os.makedirs(os.path.join(N, 'bars'), exist_ok=True); os.makedirs(os.path.join(N, 'vision'), exist_ok=True)
    for c in KEPT:
        out = os.path.join(N, 'bars', c['id'] + '.mp4'); w = c['window']
        if not os.path.exists(out):
            run(['-ss', f"{w['t0']:.3f}", '-i', os.path.join(BD, c['file']), '-vf', plate_vf(c) + (f",setpts=PTS/{w['speed']:.4f}" if w['speed'] != 1 else '') + f',fps={FPS},tpad=stop_mode=clone:stop_duration=4',
                 '-frames:v', str(BAR), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out])
        tw = os.path.join(N, 'bars', c['id'] + '_twin.mp4'); src = os.path.join(twin_src or '', c['id'] + '_twin.mp4')
        if twin_src and os.path.exists(src) and not os.path.exists(tw):
            run(['-i', src, '-vf', f'scale={W}:{H}:flags=lanczos,crop={W}:{PH}:0:{PY},fps={FPS},tpad=stop_mode=clone:stop_duration=4', '-frames:v', str(BAR), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tw])
        vp = os.path.join(N, 'vision', c['id'] + '.png')
        if not os.path.exists(vp): vision(c).save(vp)
    print('bars:', len(KEPT), 'twins:', sum(os.path.exists(os.path.join(N, 'bars', c['id'] + '_twin.mp4')) for c in KEPT))
def vision(c):
    """What the segmentation saw, carried through the same crop, zoom and shift as the picture: the cake in mint, people in magenta, and the grid."""
    it = ITEMS[c['id']]; a = np.asarray(Image.open(os.path.join(ROOT, it['assets']['seg'])).convert('RGB')).astype(np.float32); w = a.shape[1] // 3; p1, p2 = a[:, :w], a[:, w:2 * w]
    ys = it['segmentation'].get('y_split', 720); hh = int(round(180 * min(ys, 720) / 720)); p1r = np.asarray(Image.fromarray(p1.astype(np.uint8)).resize((w, hh), Image.BILINEAR)).astype(np.float32); d = p2[:hh] - 0.45 * p1r
    r, g, b = d[..., 0], d[..., 1], d[..., 2]; out = Image.new('RGBA', (W, PH), (0, 0, 0, 0))
    for m, col in (((r > 40) & (b > 28) & (r > g + 25), (230, 104, 184)), ((g > 45) & (g > r + 25) & (g > b), (95, 240, 220))):
        full = np.zeros((180, w), np.uint8); full[:hh][m] = 255; im = Image.fromarray(full).resize((W, H), Image.BILINEAR); wh = c['world_h']; f = c['fit']; z = f['zoom']
        if wh >= 720: im = im.crop((0, 20, W, 20 + PH))
        else: im = im.crop((0, 0, W, wh)); sw = int(round(W * PH / wh)); im = im.resize((sw, PH), Image.BILINEAR).crop(((sw - W) // 2, 0, (sw - W) // 2 + W, PH))
        im = im.resize((int(W * z), int(PH * z)), Image.BILINEAR).crop((int(round(-f['tx'])), int(round(-f['ty'])), int(round(-f['tx'])) + W, int(round(-f['ty'])) + PH)).filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 110 else 0)
        edge = Image.fromarray((np.asarray(im.filter(ImageFilter.MaxFilter(7))).astype(int) - np.asarray(im.filter(ImageFilter.MinFilter(3))) > 0).astype(np.uint8) * 255)
        lay = Image.new('RGBA', (W, PH), col + (0,)); lay.putalpha(Image.fromarray((np.asarray(im) * 0.30 + np.asarray(edge) * 0.9).clip(0, 255).astype(np.uint8))); out.alpha_composite(lay)
    d = ImageDraw.Draw(out); x0, x1, y = GRID['cx'] - GRID['width'] // 2, GRID['cx'] + GRID['width'] // 2, GRID['top']
    for x in (x0, x1): d.line([(x, 0), (x, PH)], fill=(255, 255, 255, 150), width=1)
    d.line([(0, y), (W, y)], fill=(255, 255, 255, 150), width=1); d.line([(GRID['cx'], y - 14), (GRID['cx'], y + 14)], fill=(255, 255, 255, 220), width=1)
    return out

# ------------------------------------------------------------------ frames
def read(path, f0, n, w=W, h=PH):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f'{max(0, f0) / FPS:.4f}', '-i', path, '-vf', f'fps={FPS},scale={w}:{h}:flags=bicubic,tpad=stop_mode=clone:stop_duration=30', '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    for _ in range(n):
        b = p.stdout.read(w * h * 3)
        if len(b) < w * h * 3: raise SystemExit('short read ' + path)
        yield np.frombuffer(b, np.uint8).reshape(h, w, 3)
    p.stdout.close(); p.wait()
def bar(cid, b0, n, w=W, h=PH, twin=False):          # n frames of a bar starting at bar-beat b0; a bar wraps into itself
    path = os.path.join(N, 'bars', cid + ('_twin' if twin else '') + '.mp4'); f0 = fb(b0) % BAR
    if f0 + n <= BAR: yield from read(path, f0, n, w, h)
    else:
        k = BAR - f0; yield from read(path, f0, k, w, h); yield from bar(cid, 0, n - k, w, h, twin)
def has_twin(cid): return os.path.exists(os.path.join(N, 'bars', cid + '_twin.mp4'))
_vis = {}
def vis(cid):
    if cid not in _vis: _vis[cid] = np.asarray(Image.open(os.path.join(N, 'vision', cid + '.png')).convert('RGBA')).astype(np.float32)
    return _vis[cid]
def seen(frames, cid, n, fade=(0.0, 1.0)):            # the picture with what the machine saw laid over it, coming and going
    v = vis(cid); a = v[..., 3:4] / 255.0
    for f, x in enumerate(frames):
        u = f / max(1, n - 1); k = min(1, u / 0.25 if fade[0] == 0 else 1, (1 - u) / 0.3 if fade[1] == 1 else 1) if n > 6 else 1
        yield (x * (1 - a * k) + v[..., :3] * a * k).astype(np.uint8)
def seam(a, b, n, sway=90):                            # one cake of two halves: plate left of the seam, twin right of it
    xx = np.arange(W)[None, :, None]
    for f, (x, y) in enumerate(zip(a, b)):
        s = GRID['cx'] + sway * math.sin(f / n * math.pi * 2); m = np.clip((xx - s) / 3.0 + 0.5, 0, 1); out = (x * (1 - m) + y * m).astype(np.uint8); out[:, int(s) - 1:int(s) + 1] = 235; yield out
def tiles(cids, cols, rows, b0, n, twin=False):
    tw, th = W // cols, PH // rows; ox, oy = (W - cols * tw) // 2, (PH - rows * th) // 2; srcs = [bar(c, b0, n, tw - 2, th - 2, twin and has_twin(c)) for c in cids]
    for fr in zip(*srcs):
        out = np.zeros((PH, W, 3), np.uint8)
        for i, t in enumerate(fr): r, c = divmod(i, cols); out[oy + r * th + 1:oy + (r + 1) * th - 1, ox + c * tw + 1:ox + (c + 1) * tw - 1] = t
        yield out
def flicker(cids, n, each):
    for k, c in enumerate(cids):
        if k * each >= n: break
        yield from bar(c, 1.85, min(each, n - k * each))
    left = n - min(n, len(cids) * each)
    if left > 0: yield from bar(cids[-1], 1.85 + each / (BEAT * FPS), left)
def card(lines, n, fade_in=8, fade_out=30):
    im = Image.new('RGB', (W, H), 'black'); d = ImageDraw.Draw(im); y = H / 2 - sum(s for _, s, _ in lines) * 0.75
    for txt, size, col in lines:
        font = ImageFont.truetype(DISP if size >= 30 else MONO, size); d.text(((W - d.textlength(txt, font=font)) / 2, y), txt, font=font, fill=col); y += size * 1.5
    a = np.asarray(im).astype(np.float32)
    for f in range(n): yield (a * min(1, f / fade_in, (n - f) / fade_out)).astype(np.uint8)
def bars_frame(title, sec, left, right):
    im = Image.new('RGB', (W, H), 'black'); d = ImageDraw.Draw(im); f = ImageFont.truetype(MONO, 15)
    d.text((40, PY - 36), sec, font=f, fill=(255, 204, 102)); d.text((W - 40 - d.textlength(title, font=f), PY - 36), title, font=f, fill=(92, 94, 93))
    d.text((40, PY + PH + 22), left, font=f, fill=(206, 210, 208)); d.text((W - 40 - d.textlength(right, font=f), PY + PH + 22), right, font=f, fill=(102, 240, 216))
    return np.asarray(im).copy()
def name(cid): c = CL[cid]; return cid.upper().replace('_', ' ') + ' · ' + c['era'].replace('_', ' ').upper()

def render(fname, title, shots, music_beat):
    """shots: (beats, section, left caption, right caption, generator(n)). Cut times are beat times; the music is taken from the same beat grid."""
    out = os.path.join(N, fname); total_b = sum(s[0] for s in shots); total = fb(total_b) / FPS; t0 = MPHASE + music_beat * BEAT
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-ss', f'{t0:.3f}', '-t', f'{total:.3f}', '-i', MUSIC,
                            '-filter_complex', f'[1:a]afade=t=in:st=0:d=0.3,afade=t=out:st={total - 2.4:.3f}:d=2.4[a]', '-map', '0:v', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
                            '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], stdin=subprocess.PIPE)
    b = 0.0; edl = []
    for k, (beats, sec, left, right, make) in enumerate(shots):
        f0 = fb(b); b += beats; n = fb(b) - f0; frame = bars_frame(title, sec, left, right); c = 0
        for pic in make(n):
            if pic.shape[0] == H: o = pic
            else: frame[PY:PY + PH] = pic; o = frame
            enc.stdin.write(o.tobytes()); c += 1
            if c >= n: break
        assert c == n, (fname, k, c, n); edl.append({'shot': k, 't': round(f0 / FPS, 3), 'frames': n, 'beats': beats, 'what': left, 'how': right})
    enc.stdin.close(); enc.wait()
    json.dump({'fps': FPS, 'beat_s': BEAT, 'music_from_s': round(t0, 3), 'duration_s': round(total, 3), 'shots': edl}, open(os.path.splitext(out)[0] + '.edl.json', 'w'), indent=1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{total * 0.42:.2f}', '-i', out, '-frames:v', '1', '-q:v', '3', os.path.splitext(out)[0] + '.jpg'])
    print('wrote', fname, f'{total:.1f}s', len(shots), 'shots', flush=True)

# ------------------------------------------------------------------ step 2: the cuts
def cuts():
    ids = [c['id'] for c in KEPT]; kind = lambda k: [c['id'] for c in KEPT if c['event']['kind'] == k]        # KEPT is already in era order
    breath, turn = kind('breath'), kind('turn'); other = [c['id'] for c in KEPT if c['event']['kind'] in ('arrive', 'hold', 'rewind')]; tw = [c for c in ids if has_twin(c)]
    first_of_era = []
    for c in KEPT:
        if c['era'] not in [CL[x]['era'] for x in first_of_era] and has_twin(c['id']): first_of_era.append(c['id'])
    best = lambda pool: max(pool, key=lambda c: CL[c]['event']['strength'])
    era_pick = []
    for e in I['era_order']:
        pool = [c for c in tw if CL[c]['era'] == e]
        if pool: era_pick.append(best([c for c in pool if CL[c]['event']['kind'] == 'breath'] or pool))
    T1 = 'ONE GRID, ONE BAR'; S = []
    S.append((3, '', '', '', lambda n: card([('ONE GRID, ONE BAR', 54, (240, 244, 242)), (f'{len(ids)} OF 77 PLATES KEPT · EVERY CAKE IN ONE PLACE · EVERY EVENT ON ONE BEAT', 16, (255, 204, 102))], n, 14, 1)))
    for c in era_pick[:4]: S.append((2, 'I · WHAT THE MACHINE SEES', 'PLATE ' + name(c), 'SEGMENTS: CAKE · PEOPLE   GRID: CENTRE · CROWN · WIDTH', lambda n, c=c: seen(bar(c, 0, n), c, n)))
    for c in (other + turn)[:16]: S.append((1, 'II · ARRIVALS AND TURNS, ERA BY ERA', 'PLATE ' + name(c), CL[c]['event']['kind'].upper() + ' ON BEAT 3', lambda n, c=c: bar(c, 1.5, n)))
    for c in [x for x in era_pick if CL[x]['event']['kind'] == 'breath'][:4]:
        S.append((1, 'III · PLATE INTO CODED TWIN', 'PLATE ' + name(c), 'SYNTHETIC', lambda n, c=c: bar(c, 1, n))); S.append((1, 'III · PLATE INTO CODED TWIN', 'TWIN ' + name(c), 'CODED · SAME GRID · SAME BEAT', lambda n, c=c: bar(c, 2, n, twin=True)))
    for c in breath: S.append((1, 'IV · EVERY BREATH', 'PLATE ' + name(c), 'THE LIGHT GOES THREE QUARTERS THROUGH', lambda n, c=c: bar(c, 1.25, n)))
    S.append((8, 'V · ONE PLACE', f'{len(ids)} PLATES · ONE FRAME EACH · THE CAKE DOES NOT MOVE', 'FLICKER · QUARTER BEATS', lambda n: flicker(ids * 2, n, max(1, fb(0.25)))))
    cols = 7 if len(ids) > 30 else 6; rows = -(-len(ids) // cols)
    S.append((4, 'VI · ONE TIME', f'{len(ids)} PLATES AT ONCE · NOTHING RETIMED IN THE EDIT', 'SYNTHETIC', lambda n: tiles(ids, cols, rows, 0, n)))
    S.append((4, 'VI · ONE TIME', f'{len(tw)} CODED TWINS AT ONCE · THE SAME BAR', 'CODED', lambda n: tiles(ids, cols, rows, 0, n, twin=True)))
    S.append((5, '', '', '', lambda n: card([(f'{len(ids)} PLATES · {len(tw)} TWINS · 1 GRID · 4 BEATS', 30, (240, 244, 242)), ('', 10, (0, 0, 0)), ('ASSETS/NORMALIZED · STELLINE ORB · SCION DIEGETIC', 16, (255, 204, 102))], n)))
    render('one-grid.mp4', T1, S, 34)

    S = []
    for c in era_pick: S.append((4, CL[c]['era'].replace('_', ' ').upper(), 'LEFT OF THE SEAM: PLATE ' + c.upper().replace('_', ' ') + '   RIGHT: ITS CODED TWIN', 'ONE CAKE, TWO HALVES', lambda n, c=c: seam(bar(c, 0, n), bar(c, 0, n, twin=True), n)))
    S.append((3, '', '', '', lambda n: card([('NINE ROOMS · ONE CAKE', 30, (240, 244, 242))], n)))
    render('nine-rooms.mp4', 'NINE ROOMS, ONE CAKE', S, 60)

    S = []
    for c in breath: S.append((1, 'THE BREATH · SYNTHETIC', 'PLATE ' + name(c), 'THE LIGHT GOES MID-SHOT', lambda n, c=c: bar(c, 1.5, n)))
    for c in [x for x in breath if has_twin(x)]: S.append((0.5, 'THE BREATH · CODED', 'TWIN ' + name(c), 'DOUBLE PACE', lambda n, c=c: bar(c, 1.75, n, twin=True)))
    bc = 5 if len(breath) > 12 else 4; S.append((4, 'THE BREATH · TOGETHER', f'{len(breath)} PLATES · ONE BAR', 'ALL ON BEAT 3', lambda n: tiles(breath, bc, -(-len(breath) // bc), 0, n)))
    S.append((4, 'THE BREATH · TOGETHER', f'{len(breath)} TWINS · ONE BAR', 'ALL ON BEAT 3', lambda n: tiles(breath, bc, -(-len(breath) // bc), 0, n, twin=True)))
    render('the-breath.mp4', 'THE BREATH', S, 90)

    S = []
    for c in turn:
        S.append((1, 'THE TURN', 'PLATE ' + name(c), 'SEEN', lambda n, c=c: seen(bar(c, 1, n), c, n, fade=(0.0, 0.0)))); S.append((1, 'THE TURN', 'PLATE ' + name(c), 'TURNS', lambda n, c=c: bar(c, 2, n)))
    S.append((4, 'THE TURN · TOGETHER', f'{len(turn)} PLATES · ONE BAR', 'ALL ON BEAT 3', lambda n: tiles(turn, 3, -(-len(turn) // 3), 0, n)))
    render('the-turn.mp4', 'THE TURN', S, 56)

if __name__ == '__main__':
    render_bars(sys.argv[1] if len(sys.argv) > 1 else None)
    if '--bars-only' not in sys.argv: cuts()
