"""Run the ten Gemini Omni Flash 1.2 variants on fal (queue API through the session proxy; no key in this file).
  python3 omni.py list
  python3 omni.py run 02 [--draft] [--dry] [--scene]        # one variant; --draft = 360p 5 s test; --dry = write request only
  python3 omni.py run all [--draft]
Endpoint: google/gemini-omni-flash/v1.2/reference-to-video. The 1.2 input field names could not be read (fal.ai is not reachable from the session), so FIELDS below is a best guess from the 1.1 page:
if fal answers 422, the error lists the real field names: edit FIELDS and rerun. Costs: about $0.82 per 10 s 720p clip (fal's page); references are not billed.
Output: assets/omni/out/NN_name/{request.json,video.mp4}. A refused call (e.g. exhausted balance) is reported as is, never retried."""
import sys, json, base64, subprocess, time, os
H = os.path.dirname(os.path.abspath(__file__)); R = H + '/../../assets/omni/'; EP = 'google/gemini-omni-flash/v1.2/reference-to-video'
FIELDS = {'prompt': 'prompt', 'images': 'image_urls', 'videos': 'video_urls', 'duration': 'duration', 'resolution': 'resolution', 'aspect': 'aspect_ratio', 'audio': 'generate_audio'}
P = json.load(open(R + 'prompts.json')); args = sys.argv[1:]
if not args or args[0] == 'list':
    for v in P['variants']: print(v['id'], v['name'], '|', v['lang'], v['text']); sys.exit()
which = args[1]; draft = '--draft' in args; dry = '--dry' in args; scene = '--scene' in args  # default = composite (world + locked controller strip in one frame); --scene = world only, stack the strip afterwards with tools/flow/stack.sh
def uri(f):
    mime = 'video/mp4' if f.endswith('.mp4') else 'image/jpeg'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(open(R + 'refs/' + f, 'rb').read()).decode())
def run(v):
    out = R + 'out/%s_%s%s/' % (v['id'], v['name'], '_scene' if scene else ''); os.makedirs(out, exist_ok=True)
    body = {FIELDS['prompt']: v['prompt_scene' if scene else 'prompt'], FIELDS['images']: [uri(f) for f in v['refs_scene' if scene else 'refs'] if f.endswith('.jpg')], FIELDS['videos']: [uri(f) for f in v['refs_scene' if scene else 'refs'] if f.endswith('.mp4')],
            FIELDS['duration']: 5 if draft else 15, FIELDS['resolution']: '360p' if draft else '720p', FIELDS['aspect']: '16:9', FIELDS['audio']: True}
    json.dump({k: (x if k == FIELDS['prompt'] or not isinstance(x, list) else [s[:40] + '...' for s in x]) for k, x in body.items()}, open(out + 'request.json', 'w'), indent=1, ensure_ascii=False)
    if dry: print(v['id'], 'dry: request written'); return
    r = subprocess.run(['curl', '-sS', '-m', '300', '-X', 'POST', 'https://queue.fal.run/' + EP, '-H', 'Content-Type: application/json', '--data-binary', '@-'], input=json.dumps(body), capture_output=True, text=True).stdout
    try: sub = json.loads(r)
    except Exception: print(v['id'], 'bad response', r[:300]); return
    if 'status_url' not in sub: print(v['id'], 'refused:', r[:600]); return
    print(v['id'], 'queued', sub['request_id'])
    while True:
        s = json.loads(subprocess.run(['curl', '-sS', '-m', '30', sub['status_url']], capture_output=True, text=True).stdout or '{}').get('status')
        if s == 'COMPLETED': break
        if s not in ('IN_QUEUE', 'IN_PROGRESS'): print(v['id'], 'failed', s); return
        time.sleep(15)
    res = json.loads(subprocess.run(['curl', '-sS', '-m', '60', sub['response_url']], capture_output=True, text=True).stdout)
    url = (res.get('video') or {}).get('url'); print(json.dumps(res)[:300])
    if url: subprocess.run(['curl', '-sS', '-m', '300', '-o', out + 'video.mp4', url]); print(v['id'], 'saved', out + 'video.mp4')
for v in P['variants']:
    if which in ('all', v['id']): run(v)
