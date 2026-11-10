#!/usr/bin/env python3
"""The fal half of the video-to-game loop for games/breath, one level at a time. NOT YET RUN: on the day this was written every call to
queue.fal.run answered 403 "User is locked. Reason: Exhausted balance", so no fal asset is in the game. When the balance is topped up:

  python3 tools/games/fal_assets.py bday_35            (about 6 calls: one concept, one cut-out, one image-to-3D, three sounds)

For the level's clip it follows lovisdotio/video-to-game's asset pipeline, from the video's own frame:
  1. concept     fal-ai/nano-banana-pro/edit    the same cake alone, no candles, no people, plain grey ground, same style and colours
  2. cut-out     fal-ai/birefnet/v2             a clean alpha
  3. image to 3D fal-ai/hunyuan-3d/v3.1/pro/image-to-3d   -> games/breath/levels/<id>/cake_fal.glb   (the game prefers it over the orb's cake.glb)
  4. sounds      fal-ai/elevenlabs/sound-effects/v2        a breath, a flame going out, a room tone
Every call is appended to games/breath/fal_log.json with its endpoint, arguments and outputs. Endpoint ids are the ones listed in that skill's
references/fal-assets.md; check them in fal's live catalogue before the first call, as the skill says.
"""
import os, sys, subprocess, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); sys.path.insert(0, HERE); import fal
def run(cid):
    lv = os.path.join(ROOT, 'games/breath/levels', cid); log = os.path.join(ROOT, 'games/breath/fal_log.json'); frame = os.path.join(lv, 'frame.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '1.0', '-i', os.path.join(ROOT, 'assets/normalized/bars', cid + '.mp4'), '-frames:v', '1', frame], check=True)
    _, c = fal.call('fal-ai/nano-banana-pro/edit', {'prompt': 'the same birthday cake alone, whole, no candles, no people, no hands, three-quarter view from slightly above, centred, plain light grey background, even studio light, same style, decoration and colours as the reference'}, {'image_urls': frame}, lv, log, 'concept')
    _, k = fal.call('fal-ai/birefnet/v2', {}, {'image_url': c[0]}, lv, log, 'cutout')
    _, m = fal.call('fal-ai/hunyuan-3d/v3.1/pro/image-to-3d', {}, {'input_image_url': k[0]}, lv, log, 'cake_fal')
    glb = [f for f in m if f.endswith('.glb')]
    if glb:      # tell the game to use it
        ip = os.path.join(ROOT, 'games/breath/levels/index.json'); idx = json.load(open(ip))
        for L in idx['levels']:
            if L['id'] == cid: L['model'] = os.path.basename(glb[0])
        json.dump(idx, open(ip, 'w'), indent=1); open(ip[:-2], 'w').write('window.LEVELS = ' + json.dumps(idx) + ';\n')
    for name, text, dur, loop in (('breath', 'one long soft human breath blowing out candles, close, no voice', 2.0, False), ('flame_out', 'a single candle flame snuffed out, tiny puff, close', 0.6, False), ('room', 'quiet room tone of a small party holding its breath, faint cloth rustle', 6.0, True)):
        fal.call('fal-ai/elevenlabs/sound-effects/v2', {'text': text, 'duration_seconds': dur, 'loop': loop}, None, lv, log, name)
    print(open(log).read()[-600:])
if __name__ == '__main__':
    if len(sys.argv) < 2: raise SystemExit(__doc__)
    run(sys.argv[1])
