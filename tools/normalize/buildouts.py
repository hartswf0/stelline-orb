#!/usr/bin/env python3
"""Every full build-out on one clock: 16 beats.

record_recipes.cjs --buildout films a clip's whole scene through the locked grid camera: the cake made from the empty table by the Memory Weaver's
rings, the clip's own cast arriving, then one bar with the candles lit and blown out. That raw film has one frame per step of the build, so its
length depends on the recipe. This retimes each to the same 16 beats (312 frames at 24 fps, 73.83 bpm):

  beats 0-8     the making, from the empty table to the first candle      (bars 1 and 2)
  beats 8-12    candles, the people, the last touches                       (bar 3)
  beats 12-16   the bar itself: lit, and the breath on beat 3 of the bar    (bar 4; the same bar as the plate and the twin)

so the first candle always lands on the downbeat of bar 3 and the breath on beat 15 of every build-out. Only the making is retimed (two straight
segments); the last bar is played as filmed.

  python3 tools/normalize/buildouts.py <raw_dir>   -> assets/normalized/builds/<id>.mp4, builds/index.json, builds/index.js (window.BUILDOUTS)
"""
import json, os, subprocess, sys, glob
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); N = os.path.join(ROOT, 'assets/normalized'); I = json.load(open(os.path.join(N, 'index.json')))
FPS, BEAT, W, H, PH, PY = 24, I['beat_s'], 1280, 720, 576, 72; fb = lambda b: int(round(b * BEAT * FPS)); SW, SH = 960, 540
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(N, 'builds/raw'); dst = os.path.join(N, 'builds'); os.makedirs(dst, exist_ok=True); out = {}
for jf in sorted(glob.glob(os.path.join(src, '*_buildout.json'))):
    d = json.load(open(jf)); cid = d['id']; raw = os.path.join(src, cid + '_buildout_raw.mp4'); nb, nbar, cf = d['build_frames'], d['bar_frames'], d['candle_frame']
    fr = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', raw, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout, np.uint8).reshape(-1, SH, SW, 3)
    if len(fr) < nb + nbar: print('short', cid, len(fr), nb + nbar); continue
    anchored = 4 < cf < nb - 4; idx = []
    for j in range(fb(16)):
        if j < fb(12):
            if anchored: k = cf * j / fb(8) if j < fb(8) else cf + (nb - 1 - cf) * (j - fb(8)) / (fb(12) - fb(8))
            else: k = (nb - 1) * j / fb(12)
            idx.append(int(round(min(nb - 1, k))))
        else: idx.append(nb + min(nbar - 1, (j - fb(12)) // 2))
    orb = os.path.join(src, cid + '_orb_raw.mp4'); has_orb = os.path.exists(orb)
    if has_orb:      # the controller, filmed in the same pass, retimed frame for frame with the picture
        ofr = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', orb, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout, np.uint8).reshape(-1, 180, 640, 3)
        e2 = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '640x180', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', os.path.join(dst, cid + '_orb.mp4')], stdin=subprocess.PIPE)
        for k in idx: e2.stdin.write(ofr[min(k, len(ofr) - 1)].tobytes())
        e2.stdin.close(); e2.wait()
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{SW}x{SH}', '-r', str(FPS), '-i', '-', '-vf', f'scale={W}:{H}:flags=lanczos,crop={W}:{PH}:0:{PY}', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', os.path.join(dst, cid + '.mp4')], stdin=subprocess.PIPE)
    for k in idx: enc.stdin.write(fr[k].tobytes())
    enc.stdin.close(); enc.wait()
    pb = None
    if d.get('party_frame', -1) >= 0: pf = d['party_frame']; pb = round((8 * pf / cf) if (anchored and pf < cf) else (8 + 4 * (pf - cf) / max(1, nb - 1 - cf)) if anchored else 12 * pf / max(1, nb - 1), 2)
    out[cid] = {'title': d['title'], 'steps': d['steps'], 'beats': 16, 'first_candle_beat': 8 if anchored else None, 'people_beat': pb, 'breath_beat': 14, 'own_cast': bool(d.get('own_cast', os.path.exists(os.path.join(N, 'cast', cid + '.webp')))), 'controller': has_orb, 'reticle': d.get('reticle') or '',
                'fit': None if not d.get('fit') else {'centre_x': round((d['fit'][0] + d['fit'][1]) / 2 * W / SW, 1), 'width': round((d['fit'][1] - d['fit'][0]) * W / SW, 1), 'crown_y': round(d['fit'][2] * H / SH - PY, 1)}}
    print(cid, nb, cf, d.get('party_frame'), flush=True)
json.dump(out, open(os.path.join(dst, 'index.json'), 'w'), ensure_ascii=False, indent=1); open(os.path.join(dst, 'index.js'), 'w', encoding='utf-8').write('window.BUILDOUTS = ' + json.dumps(out, ensure_ascii=False) + ';\n'); print(len(out), 'build-outs')
