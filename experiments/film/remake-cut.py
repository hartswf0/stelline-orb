# Cuts the shot-for-shot remake on the film's own timing and sound, and a side-by-side of the film and the remake, frame for frame.
import json, subprocess, os
W = '/home/claude/stelline-work/remake/'; M = '/home/claude/stelline-work/film/memory.mp4'; FPS = 24
plan = json.load(open(W + 'plan.json')); os.makedirs(W + 'seg', exist_ok=True)
ENC = ['-c:v', 'libx264', '-crf', '19', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', '24', '-an']
def run(a): subprocess.run(a, check=True)
segs = []
for k, (a, b, kind) in enumerate(plan):
    n0, n1 = round(a * FPS), round(b * FPS); name = W + f'seg/{k:02d}.mp4'
    if kind == 'ours': run(['ffmpeg', '-loglevel', 'error', '-y', '-framerate', '24', '-start_number', str(n0), '-i', W + 'f/%05d.jpg', '-frames:v', str(n1 - n0), '-vf', 'scale=1280:720,format=yuv420p'] + ENC + [name + '.t.mp4'])
    else: run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{n0 / FPS:.4f}', '-i', M, '-frames:v', str(n1 - n0), '-vf', 'scale=1280:720,fps=24,format=yuv420p'] + ENC + [name + '.t.mp4'])
    os.replace(name + '.t.mp4', name); segs.append(name)
open(W + 'cat.txt', 'w').write(''.join(f"file '{s}'\n" for s in segs))
run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', W + 'cat.txt', '-c', 'copy', W + 'remake-video.mp4'])
T0, T1 = plan[0][0], plan[-1][1]
run(['ffmpeg', '-loglevel', 'error', '-y', '-i', W + 'remake-video.mp4', '-ss', str(T0), '-t', str(T1 - T0), '-i', M, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '224k', '-shortest', W + 'remake.mp4'])
# side by side: the film on the left, the remake on the right, the film's sound
lab = "drawtext=text='{t}':x=14:y=12:fontsize=20:fontcolor=white@0.85:box=1:boxcolor=black@0.45:boxborderw=6"
run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(T0), '-t', str(T1 - T0), '-i', M, '-i', W + 'remake-video.mp4', '-filter_complex',
     f"[0:v]scale=960:540,fps=24,{lab.format(t='FILM')}[a];[1:v]scale=960:540,{lab.format(t='CINEOSIS ORB')}[b];[a][b]hstack=2,format=yuv420p[v]",
     '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-crf', '22', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '192k', '-shortest', W + 'side-by-side.mp4'])
print('ok')
