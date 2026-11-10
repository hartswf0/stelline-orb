#!/usr/bin/env python3
"""One assembler for every cut: a cut is a timeline file, and this renders it.

  python3 tools/timeline/assemble.py assets/normalized/timelines/one-grid.timeline.json [--look panavision70] [--out file.mp4]

THE FORMAT ("stelline-timeline/1"). Everything is relative, nothing is in seconds:
  {
    "format": "stelline-timeline/1", "title": "...", "beat_s": 0.8126984, "fps": 24,
    "music": {"file": "assets/audio/mix1_tizita_stelline_soul.mp3", "phase_s": 0.4179592, "from_beat": 34},
    "look": "clean" | "panavision70" | "camcorder90",
    "frame": "bars" | "stack",      (stack: the picture on top and, under every build shot, the real controller as it was filmed making that shot)
    "shots": [ {"beats": 1, "op": "bar", "clip": "bday_33", "layer": "plate", "at": 1.5, "segment": null,
                "section": "...", "left": "...", "right": "..."}, ... ]
  }
  beats     how long the shot lasts. A shot's place in the cut is the sum of the beats before it, so shots can be reordered, removed or
            inserted without retiming anything.
  clip      an id in assets/normalized/index.json. Every clip is one bar of 4 beats on the shared grid, its event on beat 3 (at = 2).
  at        where in the clip's own bar the shot starts, in beats (0..4). A bar wraps into itself.
  layer     "plate" (the synthetic clip) or "twin" (the Memory Weaver's coded build of it, same grid, same bar).
            "build" (with op "build" or "tiles"): the full build-out, 16 beats on the same grid: the making (0-8), the candles and the clip's own
            people (8-12), then the bar (12-16, breath on beat 14). "at" then runs 0..16.
  segment   null, "cake" or "people": show only what that mask covers (assets/normalized/masks/<id>.png), the rest dimmed.
  op        bar       one clip, full frame
            build     one clip's full build-out, full frame
            seen      the clip with what the segmentation saw laid over it, and the grid
            seam      one cake of two halves: plate left of a moving seam, twin right
            triptych  "clips": three ids, the centre third of each side by side (the grid puts a cake in the middle of each third)
            tiles     "clips": many ids at once, "cols", "rows"
            flicker   "clips": one after another, "each_beats" long, all from just before their event
            film      the source film: "file", "t" (seconds in), "speed"
            nest      "layers": e.g. ["build", "twin", "plate"], the same bar drawn at several depths, each inside the one before
            card      "lines": [[text, size, [r, g, b]], ...]
The Memory Weaver's archive orb (field-orb-06.html) writes this format; so does tools/normalize/cut_one_grid.py.
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'tools/normalize')); sys.path.insert(0, HERE)
import cut_one_grid as G, looks
W, H, PH, PY, FPS = G.W, G.H, G.PH, G.PY, G.FPS
_mask = {}
def mask(cid, which):
    if (cid, which) not in _mask:
        m = np.asarray(Image.open(os.path.join(G.N, 'masks', cid + '.png')).convert('RGB').resize((W, PH), Image.BILINEAR)).astype(np.float32) / 255
        _mask[(cid, which)] = (0.1 + 0.9 * m[..., 0 if which == 'people' else 1])[..., None]
    return _mask[(cid, which)]
def build(cid, at, n, w=W, h=PH):       # a full build-out is 16 beats long; it holds its last frame past the end
    return G.read(os.path.join(G.N, 'builds', cid + '.mp4'), int(round(at * G.BEAT * FPS)), n, w, h)
def layer(s, cid, n, w=W, h=PH):
    if s.get('layer') == 'build' or s.get('op') == 'build': return build(cid, s.get('at', 0), n, w, h)
    src = G.bar(cid, s.get('at', 0), n, w, h, twin=s.get('layer') == 'twin' and G.has_twin(cid))
    if s.get('segment') and w == W:
        m = mask(cid, s['segment']); return ((x * m).astype(np.uint8) for x in src)
    return src
def triptych(s, n):
    third = W // 3; x0 = (W - third) // 2; srcs = [layer(s, c, n) for c in s['clips'][:3]]
    for fr in zip(*srcs):
        out = np.zeros((PH, W, 3), np.uint8)
        for i, f in enumerate(fr): out[:, i * third + 1:(i + 1) * third - 1] = f[:, x0 + 1:x0 + third - 1]
        yield out
def film(s, n):       # the source film itself: "file" under assets/, "t" seconds in, "speed"; 16:9 cropped to the picture
    sp = s.get('speed', 1.0); p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', f"{s.get('t', 0):.3f}", '-i', os.path.join(ROOT, s['file']), '-vf', f"scale={W}:{H},crop={W}:{PH}:0:{PY}" + (f',setpts=PTS/{sp}' if sp != 1 else '') + f',fps={FPS},tpad=stop_mode=clone:stop_duration=30', '-frames:v', str(n), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    for _ in range(n): yield np.frombuffer(p.stdout.read(W * PH * 3), np.uint8).reshape(PH, W, 3)
    p.stdout.close(); p.wait()
def nest(s, n):
    """The same bar at several depths: "layers" from the outside in, each drawn inside the one before at 40% size. Every layer plays the same bar-beat
    (a build-out's bar is its beats 12-16), so one event happens in all of them at once."""
    at = s.get('at', 0); srcs = []; boxes = []; x, y, w, h = 0, 0, W, PH
    for i, ly in enumerate(s['layers']):
        boxes.append((x, y, w, h)); srcs.append(build(s['clip'], 12 + at, n, w, h) if ly == 'build' else G.bar(s['clip'], at, n, w, h, twin=ly == 'twin'))
        x, y, w, h = x + int(w * 0.03), y + int(h * 0.05), int(w * 0.4) // 2 * 2, int(h * 0.4) // 2 * 2
    for fr in zip(*srcs):
        out = fr[0].copy()
        for (bx, by, bw, bh), f in list(zip(boxes, fr))[1:]: out[by - 2:by + bh + 2, bx - 2:bx + bw + 2] = 235; out[by:by + bh, bx:bx + bw] = f
        yield out
def make(s, n, beat_frames):
    op = s['op']
    if op == 'film': return film(s, n)
    if op == 'nest': return nest(s, n)
    if op == 'card': return G.card([(t, z, tuple(c)) for t, z, c in s['lines']], n, s.get('fade_in', 8), s.get('fade_out', 30))
    if op in ('bar', 'build'): return layer(s, s['clip'], n)
    if op == 'seen': return G.seen(layer(s, s['clip'], n), s['clip'], n, tuple(s.get('fade', (0.0, 1.0))))
    if op == 'seam': return G.seam(G.bar(s['clip'], s.get('at', 0), n), G.bar(s['clip'], s.get('at', 0), n, twin=True), n)
    if op == 'triptych': return triptych(s, n)
    if op == 'tiles' and s.get('layer') == 'build':
        cols, rows = s['cols'], s['rows']; tw, th = W // cols, PH // rows; ox, oy = (W - cols * tw) // 2, (PH - rows * th) // 2; srcs = [build(c, s.get('at', 0), n, tw - 2, th - 2) for c in s['clips']]
        def gen():
            for fr in zip(*srcs):
                out = np.zeros((PH, W, 3), np.uint8)
                for i, t in enumerate(fr): r, c = divmod(i, cols); out[oy + r * th + 1:oy + (r + 1) * th - 1, ox + c * tw + 1:ox + (c + 1) * tw - 1] = t
                yield out
        return gen()
    if op == 'tiles': return G.tiles(s['clips'], s['cols'], s['rows'], s.get('at', 0), n, twin=s.get('layer') == 'twin')
    if op == 'flicker': return G.flicker(s['clips'], n, max(1, int(round(s.get('each_beats', 0.25) * beat_frames))))
    raise SystemExit('unknown op ' + op)
def stack_frame(title, sec, left, right):
    """The standard frame for anything the orb made: the picture on top, the controller beneath it, a caption either side of the controller."""
    from PIL import ImageDraw, ImageFont
    im = Image.new('RGB', (W, H), 'black'); d = ImageDraw.Draw(im); f = ImageFont.truetype(G.MONO, 13)
    d.text((40, 5), sec, font=f, fill=(255, 204, 102)); d.text((W - 40 - d.textlength(title, font=f), 5), title, font=f, fill=(92, 94, 93))
    for txt, x0, col, right_al in ((left, 40, (206, 210, 208), False), (right, W - 40, (102, 240, 216), True)):
        words = txt.split(' '); lines = ['']
        for w_ in words:
            if d.textlength(lines[-1] + ' ' + w_, font=f) > 360: lines.append(w_)
            else: lines[-1] = (lines[-1] + ' ' + w_).strip()
        for i, ln in enumerate(lines[:4]): d.text((x0 - (d.textlength(ln, font=f) if right_al else 0), 622 + i * 19), ln, font=f, fill=col)
    return np.asarray(im).copy()
SPY, CTL = 24, (427, 604, 426, 112)          # stack frame: picture from y = 24; the controller at x, y, w, h
def render(tl, out=None, look=None):
    if isinstance(tl, str): path = tl; tl = json.load(open(path)); out = out or os.path.join(os.path.dirname(os.path.dirname(path)), os.path.basename(path).replace('.timeline.json', '.mp4'))
    assert tl.get('format') == 'stelline-timeline/1', 'not a stelline-timeline/1 file'
    beat = tl.get('beat_s', G.BEAT); fb = lambda b: int(round(b * beat * FPS)); shots = tl['shots']; total = fb(sum(s['beats'] for s in shots)) / FPS; mu = tl.get('music'); look = look or tl.get('look', 'clean')
    stack = tl.get('frame') == 'stack'; py = SPY if stack else PY
    args = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-']; fc = looks.graph(look, py, PH); maps = ['-map', '[v]']
    if mu:
        t0 = mu.get('phase_s', 0) + mu.get('from_beat', 0) * beat; args += ['-ss', f'{t0:.3f}', '-t', f'{total:.3f}', '-i', os.path.join(ROOT, mu['file'])]
        fc += f';[1:a]afade=t=in:st=0:d=0.3,afade=t=out:st={max(0, total - 2.4):.3f}:d=2.4[a]'; maps += ['-map', '[a]', '-c:a', 'aac', '-b:a', '192k']
    enc = subprocess.Popen(args + ['-filter_complex', fc] + maps + ['-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', out], stdin=subprocess.PIPE)
    b = 0.0; edl = []
    for k, s in enumerate(shots):
        f0 = fb(b); b += s['beats']; n = fb(b) - f0; frame = (stack_frame if stack else G.bars_frame)(tl.get('title', ''), s.get('section', ''), s.get('left', ''), s.get('right', '')); c = 0
        orbp = os.path.join(G.N, 'builds', str(s.get('clip')) + '_orb.mp4'); ctl = G.read(orbp, int(round((s.get('at', 0) + (12 if s['op'] == 'nest' else 0)) * G.BEAT * FPS)), n, CTL[2], CTL[3]) if stack and (s['op'] == 'build' or s['op'] == 'nest' and 'build' in s.get('layers', [])) and os.path.exists(orbp) else None
        for pic in make(s, n, beat * FPS):
            if pic.shape[0] == H: o = pic
            else:
                frame[py:py + PH] = pic; o = frame
                if ctl is not None: frame[CTL[1]:CTL[1] + CTL[3], CTL[0]:CTL[0] + CTL[2]] = next(ctl)
            enc.stdin.write(o.tobytes()); c += 1
            if c >= n: break
        assert c == n, (out, k, c, n); edl.append({'shot': k, 't': round(f0 / FPS, 3), 'frames': n, 'beats': s['beats'], 'op': s['op']})
    enc.stdin.close(); enc.wait()
    json.dump({'fps': FPS, 'beat_s': beat, 'look': look, 'duration_s': round(total, 3), 'shots': edl}, open(os.path.splitext(out)[0] + '.edl.json', 'w'), indent=1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{total * tl.get("poster_at", 0.42):.2f}', '-i', out, '-frames:v', '1', '-q:v', '3', os.path.splitext(out)[0] + '.jpg'])
    print('wrote', os.path.relpath(out, ROOT), f'{total:.1f}s', len(shots), 'shots', 'look:', look, flush=True)
if __name__ == '__main__':
    a = sys.argv[1:]; lk = a[a.index('--look') + 1] if '--look' in a else None; o = a[a.index('--out') + 1] if '--out' in a else None
    for p in [x for x in a if x.endswith('.json')]: render(p, o, lk)
