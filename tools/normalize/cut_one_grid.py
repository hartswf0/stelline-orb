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

def render_legacy(fname, title, shots, music_beat):       # superseded by tools/timeline/assemble.py; kept for reference
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

# ------------------------------------------------------------------ step 2: the cuts, written as timelines and rendered by the one assembler
MIX = {'file': 'assets/audio/mix1_tizita_stelline_soul.mp3', 'phase_s': MPHASE}
def timeline(title, shots, from_beat, look='clean', poster_at=0.42):
    return {'format': 'stelline-timeline/1', 'title': title, 'beat_s': BEAT, 'fps': FPS, 'music': dict(MIX, from_beat=from_beat), 'look': look, 'poster_at': poster_at, 'shots': shots}
def sh(beats, op, section='', left='', right='', **kw): return dict(beats=beats, op=op, section=section, left=left, right=right, **kw)
def timelines():
    ids = [c['id'] for c in KEPT]; kind = lambda k: [c['id'] for c in KEPT if c['event']['kind'] == k]        # KEPT is already in era order
    breath, turn = kind('breath'), kind('turn'); other = [c['id'] for c in KEPT if c['event']['kind'] in ('arrive', 'hold', 'rewind')]; tw = [c for c in ids if has_twin(c)]
    best = lambda pool: max(pool, key=lambda c: CL[c]['event']['strength']); era_pick = []
    for e in I['era_order']:
        pool = [c for c in tw if CL[c]['era'] == e]
        if pool: era_pick.append(best([c for c in pool if CL[c]['event']['kind'] == 'breath'] or pool))
    white, gold, cyan = [240, 244, 242], [255, 204, 102], [102, 240, 216]; T = {}
    S = [sh(3, 'card', lines=[['ONE GRID, ONE BAR', 54, white], [f'{len(ids)} OF 77 PLATES KEPT · EVERY CAKE IN ONE PLACE · EVERY EVENT ON ONE BEAT', 16, gold]], fade_in=14, fade_out=1)]
    S += [sh(2, 'seen', 'I · WHAT THE MACHINE SEES', 'PLATE ' + name(c), 'SEGMENTS: CAKE · PEOPLE   GRID: CENTRE · CROWN · WIDTH', clip=c, at=0) for c in era_pick[:4]]
    S += [sh(1, 'bar', 'II · ARRIVALS AND TURNS, ERA BY ERA', 'PLATE ' + name(c), CL[c]['event']['kind'].upper() + ' ON BEAT 3', clip=c, layer='plate', at=1.5) for c in (other + turn)[:16]]
    for c in [x for x in era_pick if CL[x]['event']['kind'] == 'breath'][:4]:
        S += [sh(1, 'bar', 'III · PLATE INTO CODED TWIN', 'PLATE ' + name(c), 'SYNTHETIC', clip=c, layer='plate', at=1), sh(1, 'bar', 'III · PLATE INTO CODED TWIN', 'TWIN ' + name(c), 'CODED · SAME GRID · SAME BEAT', clip=c, layer='twin', at=2)]
    S += [sh(1, 'bar', 'IV · EVERY BREATH', 'PLATE ' + name(c), 'THE LIGHT GOES THREE QUARTERS THROUGH', clip=c, layer='plate', at=1.25) for c in breath]
    S.append(sh(8, 'flicker', 'V · ONE PLACE', f'{len(ids)} PLATES · ONE FRAME EACH · THE CAKE DOES NOT MOVE', 'FLICKER · QUARTER BEATS', clips=ids * 2, each_beats=0.25))
    cols = 7 if len(ids) > 30 else 6; rows = -(-len(ids) // cols)
    S.append(sh(4, 'tiles', 'VI · ONE TIME', f'{len(ids)} PLATES AT ONCE · NOTHING RETIMED IN THE EDIT', 'SYNTHETIC', clips=ids, cols=cols, rows=rows, layer='plate', at=0))
    S.append(sh(4, 'tiles', 'VI · ONE TIME', f'{len(tw)} CODED TWINS AT ONCE · THE SAME BAR', 'CODED', clips=ids, cols=cols, rows=rows, layer='twin', at=0))
    S.append(sh(5, 'card', lines=[[f'{len(ids)} PLATES · {len(tw)} TWINS · 1 GRID · 4 BEATS', 30, white], ['', 10, [0, 0, 0]], ['ASSETS/NORMALIZED · STELLINE ORB · SCION DIEGETIC', 16, gold]]))
    T['one-grid'] = timeline('ONE GRID, ONE BAR', S, 34)
    S = [sh(4, 'seam', CL[c]['era'].replace('_', ' ').upper(), 'LEFT OF THE SEAM: PLATE ' + c.upper().replace('_', ' ') + '   RIGHT: ITS CODED TWIN', 'ONE CAKE, TWO HALVES · GRADED AS ONE FILM', clip=c, at=0) for c in era_pick]
    S.append(sh(3, 'card', lines=[['NINE ROOMS · ONE CAKE', 30, white]]))
    T['nine-rooms'] = timeline('NINE ROOMS, ONE CAKE', S, 60, look='panavision70')
    S = [sh(1, 'bar', 'THE BREATH · SYNTHETIC', 'PLATE ' + name(c), 'THE LIGHT GOES MID-SHOT', clip=c, layer='plate', at=1.5) for c in breath]
    S += [sh(0.5, 'bar', 'THE BREATH · CODED', 'TWIN ' + name(c), 'DOUBLE PACE', clip=c, layer='twin', at=1.75) for c in breath if has_twin(c)]
    bc = 5 if len(breath) > 12 else 4
    S += [sh(4, 'tiles', 'THE BREATH · TOGETHER', f'{len(breath)} PLATES · ONE BAR', 'ALL ON BEAT 3', clips=breath, cols=bc, rows=-(-len(breath) // bc), layer='plate', at=0), sh(4, 'tiles', 'THE BREATH · TOGETHER', f'{len(breath)} TWINS · ONE BAR', 'ALL ON BEAT 3', clips=breath, cols=bc, rows=-(-len(breath) // bc), layer='twin', at=0)]
    T['the-breath'] = timeline('THE BREATH', S, 90, look='camcorder90')
    S = []
    for c in turn: S += [sh(1, 'bar', 'THE TURN', 'PLATE ' + name(c), 'SEGMENT · THE CAKE ALONE', clip=c, layer='plate', at=1, segment='cake'), sh(1, 'bar', 'THE TURN', 'PLATE ' + name(c), 'TURNS', clip=c, layer='plate', at=2)]
    S.append(sh(4, 'tiles', 'THE TURN · TOGETHER', f'{len(turn)} PLATES · ONE BAR', 'ALL ON BEAT 3', clips=turn, cols=3, rows=-(-len(turn) // 3), layer='plate', at=0))
    T['the-turn'] = timeline('THE TURN', S, 56)
    bp = os.path.join(N, 'builds/index.json')
    if os.path.exists(bp):
        BO = json.load(open(bp)); S = [sh(3, 'card', lines=[['EVERY SCENE, BUILT OUT', 54, white], ['ITS OWN CAKE · ITS OWN PEOPLE · THE SAME 16 BEATS', 16, gold]], fade_in=10, fade_out=1)]
        for c in [x for x in era_pick if x in BO]:
            sec = CL[c]['era'].replace('_', ' ').upper() + ' · ' + c.upper().replace('_', ' ')
            S += [sh(1, 'bar', sec, 'THE PLATE', 'SYNTHETIC', clip=c, layer='plate', at=1.5), sh(2, 'build', sec, 'THE MAKING, FROM THE EMPTY TABLE', 'CODED · RING BY RING', clip=c, at=1), sh(2, 'build', sec, 'CANDLES, THEN ITS OWN PEOPLE' if BO[c]['own_cast'] else 'CANDLES', 'BAR 3', clip=c, at=8.5), sh(3, 'build', sec, 'THE BREATH', 'BAR 4 · BEAT 3', clip=c, at=12.75)]
        allb = [c for c in ids if c in BO]; cols = 7 if len(allb) > 30 else 6
        S.append(sh(8, 'tiles', f'{len(allb)} SCENES AT ONCE', 'FIRST CANDLE ON THE DOWNBEAT OF BAR 3 · EVERY BREATH ON THE SAME BEAT', 'ONE CLOCK', clips=allb, cols=cols, rows=-(-len(allb) // cols), layer='build', at=8))
        S.append(sh(4, 'card', lines=[[f'{len(allb)} FULL BUILD-OUTS · 16 BEATS EACH', 30, white], ['', 10, [0, 0, 0]], ['FILMED IN ORB 05 · RUN FROM ORB 06', 16, cyan]]))
        T['build-outs'] = timeline('EVERY SCENE, BUILT OUT', S, 34, look='camcorder90', poster_at=0.2); T['build-outs']['frame'] = 'stack'
        own = [x for x in era_pick if x in BO and BO[x]['own_cast']]; nm = lambda c: CL[c]['era'].replace('_', ' ').upper() + ' · ' + c.upper().replace('_', ' ')
        # VERSION: FROM THE FILM. The film's own shots up to the moment the cake is there; then the making starts, and it is ours.
        S = [sh(4, 'film', 'BLADE RUNNER 2049 · THE ROOM BEFORE THE CAKE', 'THE FILM', 'AS SHOT', file='assets/moments/shot24_room-before-cake.mp4', t=0, speed=0.92),
             sh(4, 'film', 'BLADE RUNNER 2049 · THE CAKE APPEARS', 'THE FILM', 'AS SHOT', file='assets/moments/shot25_cake-appears.mp4', t=0.2, speed=1.0),
             sh(2, 'card', lines=[['THE MAKING STARTS', 44, white], ['FROM HERE EVERY FRAME IS MADE BY THE RINGS', 16, gold]], fade_in=4, fade_out=4)]
        for c in own[:6]: S += [sh(4, 'build', nm(c), 'THE MAKING, FROM THE EMPTY TABLE', 'RING BY RING', clip=c, at=0.5), sh(2, 'build', nm(c), 'CANDLES, THEN ITS OWN PEOPLE', 'BAR 3', clip=c, at=8.5), sh(2, 'build', nm(c), 'THE BREATH', 'BAR 4 · BEAT 3', clip=c, at=13)]
        S.append(sh(8, 'tiles', f'{len(allb)} SCENES AT ONCE', 'THE SAME 16 BEATS', 'ONE CLOCK', clips=allb, cols=cols, rows=-(-len(allb) // cols), layer='build', at=8))
        T['from-the-film'] = timeline('FROM THE FILM TO THE MAKING', S, 34, look='panavision70', poster_at=0.3); T['from-the-film']['frame'] = 'stack'
        # VERSION: VIDEO TO GAME. Each video honed, one beat a step, into a scene the orb can play.
        S = [sh(2, 'card', lines=[['VIDEO TO GAME', 54, white], ['EIGHT STEPS · ONE BEAT EACH · THE SAME CAKE IN THE SAME PLACE', 16, gold]], fade_in=6, fade_out=1)]
        for c in own[:7]:
            S += [sh(1, 'bar', nm(c), '1 · THE VIDEO', 'SYNTHETIC PLATE', clip=c, layer='plate', at=0), sh(1, 'seen', nm(c), '2 · WHAT IS IN IT', 'SEGMENTED · ON THE GRID', clip=c, at=1, fade=[1, 0]),
                  sh(1, 'bar', nm(c), '3 · THE CAKE ALONE', 'SEGMENT', clip=c, layer='plate', at=1, segment='cake'), sh(1, 'bar', nm(c), '4 · THE PEOPLE ALONE', 'SEGMENT · BECOMES THE CAST', clip=c, layer='plate', at=1, segment='people'),
                  sh(1, 'build', nm(c), '5 · THE CAKE, MADE BY RING', 'CODED', clip=c, at=3), sh(1, 'build', nm(c), '6 · CANDLES', 'CODED', clip=c, at=8), sh(1, 'build', nm(c), '7 · ITS PEOPLE RETURN', 'CUT-OUT IN THE CODED ROOM', clip=c, at=11), sh(1, 'build', nm(c), '8 · A SCENE YOU CAN PLAY', 'THE BREATH, ON THE BEAT', clip=c, at=13.5)]
        S.append(sh(3, 'card', lines=[['EVERY STEP IS A FILE · EVERY SCENE RUNS IN ORB 06', 30, white]]))
        T['video-to-game'] = timeline('VIDEO TO GAME', S, 56, look='clean', poster_at=0.25); T['video-to-game']['frame'] = 'stack'
        # VERSION: REVERSE INCEPTION. The loop inside out: the made scene holds its twin, which holds the video it came from; then the video holds what was made from it.
        S = [sh(2, 'card', lines=[['REVERSE INCEPTION', 54, white], ['THE SAME BREATH AT THREE DEPTHS', 16, gold]], fade_in=6, fade_out=1)]
        for c in own[:6]:
            S += [sh(4, 'nest', nm(c), 'THE MADE SCENE HOLDS ITS TWIN, WHICH HOLDS THE VIDEO', 'OUTSIDE IN', clip=c, layers=['build', 'twin', 'plate'], at=0), sh(4, 'nest', nm(c), 'THE VIDEO HOLDS ITS TWIN, WHICH HOLDS THE MADE SCENE', 'INSIDE OUT', clip=c, layers=['plate', 'twin', 'build'], at=0)]
        S.append(sh(3, 'card', lines=[['WHAT THE ORB MAKES IS WHAT IT IS SHOWN NEXT', 30, white]]))
        T['reverse-inception'] = timeline('REVERSE INCEPTION', S, 90, look='camcorder90', poster_at=0.2); T['reverse-inception']['frame'] = 'stack'
    tp = os.path.join(N, 'triads.json')
    if os.path.exists(tp):
        TR = json.load(open(tp))['types']; S = []
        for tname, t in TR.items():
            for mode, word in (('MATCH', 'THREE THAT SHARE A PALETTE'), ('CONTRAST', 'THREE THAT STAND APART')):
                if mode in t: S.append(sh(2, 'triptych', tname, ' · '.join(x.upper().replace('_', ' ') for x in t[mode]['clips']), word + ' · SCORE ' + ('%.2f' % t[mode]['score']), clips=t[mode]['clips'], layer='plate', at=1))
        S.append(sh(3, 'card', lines=[['THE BEST THREES, BY SHOT TYPE', 30, white], ['', 10, [0, 0, 0]], ['COLOUR × COMPOSITION · TOOLS/NORMALIZE/TRIADS.PY', 16, cyan]]))
        T['threes'] = timeline('THE BEST THREES', S, 34, poster_at=0.3)
    return T
def cuts(only=None):
    sys.path.insert(0, os.path.join(ROOT, 'tools/timeline')); import assemble
    os.makedirs(os.path.join(N, 'timelines'), exist_ok=True)
    for nm, tl in timelines().items():
        p = os.path.join(N, 'timelines', nm + '.timeline.json'); json.dump(tl, open(p, 'w'), ensure_ascii=False, indent=1)
        if not only or nm in only: assemble.render(p)

if __name__ == '__main__':
    render_bars(sys.argv[1] if len(sys.argv) > 1 else None)
    if '--bars-only' not in sys.argv: cuts([a[7:] for a in sys.argv if a.startswith('--only=')] or None)
