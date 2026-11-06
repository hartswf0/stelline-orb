"""Generate a Memory Maker UX video from the multi-reference pack (assets/refs/manifest.json) on fal.
Usage: python3 multiref.py ENDPOINT OUT_DIR "prompt" [--refs 06,07,08,10,11,01] [--arg key=json ...]
The key is injected by the session proxy (queue.fal.run); no key in this file. Candidate multi-reference endpoints (unverified, check fal's docs):
  fal-ai/kling-video/v1.6/pro/elements         input_image_urls (up to 4)
  fal-ai/vidu/q1/reference-to-video            reference_image_urls (up to 7)
  fal-ai/veo3.1/reference-to-video             image_urls (up to 3)
  minimax/h3-max/image-to-video                image_url (single) -- unconfirmed
A refused call (e.g. exhausted balance) is reported as is, never retried."""
import sys, json, base64, subprocess, time, os
ep, out, prompt = sys.argv[1], sys.argv[2], sys.argv[3]; args = sys.argv[4:]
refs = None; extra = {}; i = 0
while i < len(args):
    if args[i] == '--refs': refs = args[i + 1].split(','); i += 2
    elif args[i] == '--arg':
        k, v = args[i + 1].split('=', 1)
        try: v = json.loads(v)
        except Exception: pass
        extra[k] = v; i += 2
    else: i += 1
R = os.path.join(os.path.dirname(__file__), '../../assets/refs/'); man = json.load(open(R + 'manifest.json'))
pick = [r for r in man['refs'] if refs is None or r['file'][:2] in refs]
uris = ['data:image/jpeg;base64,' + base64.b64encode(open(R + r['file'], 'rb').read()).decode() for r in pick]
key = 'image_urls' if 'veo' in ep else 'reference_image_urls' if 'vidu' in ep else 'input_image_urls' if 'elements' in ep else 'image_url'
body = dict(extra, prompt=prompt); body[key] = uris if key != 'image_url' else uris[0]
os.makedirs(out, exist_ok=True); json.dump({'endpoint': ep, 'refs': [r['file'] for r in pick], 'prompt': prompt, 'args': extra}, open(out + '/request.json', 'w'), indent=1)
r = subprocess.run(['curl', '-sS', '-m', '120', '-X', 'POST', 'https://queue.fal.run/' + ep, '-H', 'Content-Type: application/json', '-d', json.dumps(body)], capture_output=True, text=True).stdout
try: sub = json.loads(r)
except Exception: sys.exit('bad response: ' + r[:300])
if 'status_url' not in sub: sys.exit('refused: ' + r[:300])
print('queued', sub['request_id'])
while True:
    s = json.loads(subprocess.run(['curl', '-sS', '-m', '30', sub['status_url']], capture_output=True, text=True).stdout or '{}').get('status')
    if s == 'COMPLETED': break
    if s not in ('IN_QUEUE', 'IN_PROGRESS'): sys.exit('failed: %s' % s)
    time.sleep(15)
res = json.loads(subprocess.run(['curl', '-sS', '-m', '60', sub['response_url']], capture_output=True, text=True).stdout)
url = (res.get('video') or {}).get('url'); print(json.dumps(res)[:400])
if url: subprocess.run(['curl', '-sS', '-m', '300', '-o', out + '/video.mp4', url]); print('saved', out + '/video.mp4')
