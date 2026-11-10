"""Cut the original Memory Maker film (407 s) into orb-free reference clips, one per film shot, for the Moments and Designs pages.
Usage: python3 -I cut_moments.py FILM.mp4 OUT_DIR
Shots are the film's own cuts (ffmpeg scene detect, threshold .08 on 320 px frames). Shots where Ana holds the orb are NOT exported whole:
  25, 26 -> cropped to the cake only; 6, 31 (the orb itself) and the forest/white-room dialogue are left out.
Clips are silent H.264, 1280x720 (crops upscaled)."""
import json, subprocess, sys, os
film, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
SH = json.load(open(os.path.join(os.path.dirname(__file__), 'shots.json')))
# id: (shot, label, tags, crop 'w:h:x:y' or None)
CLEAN = {
 5:  ('beetle-on-leaf', 'the beetle on the leaf, before the focus', ['bug'], None),
 7:  ('beetle-eyes-focus', 'the beetle\'s eyes come into focus', ['bug', 'eyes'], None),
 24: ('room-before-cake', 'the empty dark room, K from behind: the plate before the cake', ['room'], None),
 25: ('cake-appears', 'the cake appears, tries on frostings, tilts (cropped to the cake)', ['cake', 'sculpt'], '720:405:0:200'),
 26: ('cake-bundt', 'the cake becomes a bundt, the reticle beside it (cropped to the cake)', ['cake', 'sculpt', 'reticle'], '480:270:0:300'),
 27: ('cake-writing-upright', 'the writing on the cake, then it turns upright (over her shoulder, orb out of frame)', ['cake', 'sculpt', 'writing', 'reticle'], None),
 29: ('children-fade-in', 'the children are faded in around the lit table', ['children', 'cake'], None),
 30: ('table-wide-children', 'wide: the children at the table in the dark', ['children', 'cake', 'room'], None),
 33: ('k-arch-wide', 'K at the arch, wide', ['room'], None),
 34: ('table-far-k-back', 'the lit table far away, K from behind', ['cake', 'room'], None),
 35: ('children-faces-1', 'children\'s faces in candlelight', ['children', 'face', 'light'], None),
 36: ('boy-candle-light', 'one candle, its light on the boy\'s face', ['children', 'face', 'light', 'flames'], None),
 37: ('children-faces-2', 'faces, mouths open, the candle low', ['children', 'face', 'light'], None),
 39: ('table-dark-children', 'the table and children, dim', ['children', 'cake', 'room'], None),
 42: ('table-far-k-back-2', 'the lit table far away, K from behind', ['cake', 'room'], None),
 44: ('table-lit-children', 'the table lit, children round the cake', ['children', 'cake', 'light'], None),
 46: ('candles-go-out-face', 'the candles go out on her face', ['face', 'flames', 'light'], None),
 47: ('k-back-dark', 'K from behind, dark', ['room'], None),
}
def enc(a, b, name, crop=None):
    vf = 'scale=1280:720:flags=lanczos' if not crop else 'crop=%s,scale=1280:720:flags=lanczos' % crop
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '%.3f' % a, '-to', '%.3f' % b, '-i', film, '-an', '-vf', vf, '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', os.path.join(out, name)], check=True)
cat = {'film': 'The Memory Maker, Blade Runner 2049 (open matte), 407 s', 'shots': {}, 'designs': {}}
for sid, (nm, lab, tags, crop) in CLEAN.items():
    a, b = SH[sid]; a += .04; b -= .04; f = 'shot%02d_%s.mp4' % (sid, nm); enc(a, b, f, crop)
    cat['shots'][sid] = {'file': f, 'label': lab, 'tags': tags, 't0': round(a, 2), 't1': round(b, 2), 'cropped': bool(crop)}
# design instances: 1.5 s windows at the frame the design was proofed on (12 fps frames of the moment's shot)
SHOT_OF = {7: 7, 27: 27, 36: 36, 44: 44, 29: 29}
D = [('e_both', 7, 18), ('e_swap', 7, 40), ('e_none', 7, 28), ('c_kl', 27, 34), ('c_sr', 27, 28), ('c_le', 27, 26), ('c_ana', 27, 22), ('c_joe', 27, 28),
     ('c_out0', 27, 36), ('c_out3', 27, 10), ('b_out', 36, 14), ('k_out', 44, 18), ('k_half', 44, 30), ('p_out', 29, 34)]
for name, n, j in D:
    s = SHOT_OF[n]; a0, b0 = SH[s]; t = a0 + j / 12.; a = max(a0 + .04, t - .75); b = min(b0 - .04, t + .75)
    f = 'design_%s.mp4' % name; enc(a, b, f); cat['designs'][name] = {'file': f, 'shot': s, 'frame': j, 't0': round(a, 2), 't1': round(b, 2)}
json.dump(cat, open(os.path.join(out, 'catalog.json'), 'w'), indent=1)
print(len(cat['shots']), 'shots', len(cat['designs']), 'design windows')
