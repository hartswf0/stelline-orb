"""Stelline memory as mist: each segment of the clip becomes a spacetime point volume (x, y, t) after AFTERLIGHT's spacetime renderer.
What the memory is made of (cake, table, children, candle) emits light; the real room (Ana, K, the booth) stays as dim dust; the present frame stands
in front and every earlier moment recedes behind it, so whatever moved leaves a body of light through time."""
import json, subprocess, sys, os, numpy as np
from PIL import Image
sys.path.insert(0, '/home/claude/stelline-work/mist')
import spacetime as ST
from spacetime import Volume, splat, new_acc, resolve, W, H
A = json.load(open('/home/claude/stelline-orb/assets/v6/atlas/atlas.json')); MP4 = '/home/claude/stelline-work/film/memory.mp4'
MEMORY = {'cake', 'table', 'child', 'party', 'glow', 'candle', 'boy'}
RW, RH = ST.RES
def frames_of(beats):
    fr, ts = [], []
    for n in beats:
        sh = A['shots'][n]; parts = [p['name'] for p in sh['parts']]
        for j, t in enumerate(sh['t']):
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', MP4, '-frames:v', '1', '-vf', f'scale={RW}:{RH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
            f = np.frombuffer(raw, np.uint8).reshape(RH, RW, 3).astype(np.float32) / 255
            m = np.array(Image.open(f'/home/claude/stelline-orb/assets/v6/atlas/m{n:02d}_{j:02d}.png').resize((RW, RH), Image.NEAREST))
            mem = np.isin(m, [k for k, p in enumerate(parts) if p in MEMORY]).astype(np.float32)
            kid = np.isin(m, [k for k, p in enumerate(parts) if p in ('child', 'boy', 'party')]).astype(np.float32)
            g = f ** np.where(kid[..., None] > 0, 0.55, 0.85)            # the children are dim in the frame and the point of the memory: lift them
            w = mem[..., None] * (1.3 + 1.6 * kid[..., None]) + (1 - mem[..., None]) * 0.14   # the real room is dust; the memory is light
            fr.append(np.clip(g * w, 0, 1)); ts.append(t)
    return np.stack(fr), ts
def render(name, beats, t0, t1, yaw0, yaw1, out_s=6.0, fps=24):
    F, ts = frames_of(beats); keep = [i for i, t in enumerate(ts) if t0 <= t <= t1]; F = F[keep]
    vol = Volume(F, mode='light', per=9000, seed=7, gamma=.9)
    os.makedirs(name, exist_ok=True); N = int(out_s * fps)
    for k in range(N):
        u = k / (N - 1); present = u * (len(F) - 1)
        cam = dict(yaw=np.radians(yaw0 + (yaw1 - yaw0) * u), pitch=np.radians(-6 + 4 * u), dist=1000 - 140 * u, fov=46, pz=0, fogNear=500, fogLen=2400)
        acc = new_acc(); splat(vol, cam, acc, present=present, tau=14, size=1.2)
        img = resolve(acc, 'light', (0.012, 0.014, 0.013), gain=1.1)
        Image.fromarray((img * 255).astype(np.uint8)).save(f'{name}/{k:04d}.jpg', quality=92)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', f'{name}/%04d.jpg', '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', f'tmp_{name}.mp4'], check=True)
    os.replace(f'tmp_{name}.mp4', f'{name}.mp4'); print(name, len(F), 'source frames ->', N)
SEG = {'cake': ([25, 26, 27], 137.5, 148.5, -16, 14), 'children': ([29], 152.0, 156.0, 18, -12), 'blow': ([44], 213.2, 217.0, -10, 10)}
for k in (sys.argv[1:] or SEG): render(k, *SEG[k])
