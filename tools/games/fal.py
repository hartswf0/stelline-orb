#!/usr/bin/env python3
"""Run one fal model through the queue REST API and log it. Local files are sent as data URIs (this session reaches queue.fal.run only).
   python3 fal.py <endpoint> key=value ... file:key=path ... [-o outdir]"""
import sys, json, base64, mimetypes, time, urllib.request, os
def call(endpoint, args, files=None, out='assets', log='fal_log.json', name=None):
    inp = dict(args)
    for k, p in (files or {}).items():
        b = base64.b64encode(open(p, 'rb').read()).decode(); inp[k] = f"data:{mimetypes.guess_type(p)[0] or 'application/octet-stream'};base64,{b}"
        if k.endswith('s'): inp[k] = [inp[k]]      # e.g. image_urls takes a list
    H = {'Authorization': 'Key ' + os.environ.get('FAL_KEY', 'proxy-injected'), 'Content-Type': 'application/json'}
    def req(url, data=None):
        r = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=H, method='POST' if data is not None else 'GET')
        return json.loads(urllib.request.urlopen(r, timeout=120).read())
    t0 = time.time(); q = req('https://queue.fal.run/' + endpoint, inp); rid = q['request_id']; su, ru = q.get('status_url'), q.get('response_url')
    while True:
        s = req(su)
        if s['status'] == 'COMPLETED': break
        if s['status'] not in ('IN_QUEUE', 'IN_PROGRESS'): raise SystemExit('fal status ' + json.dumps(s)[:400])
        time.sleep(3)
    res = req(ru); os.makedirs(out, exist_ok=True); saved = []
    def walk(o, key=''):
        if isinstance(o, dict):
            if isinstance(o.get('url'), str) and o['url'].startswith('http'):
                ext = os.path.splitext(o['url'].split('?')[0])[1] or '.bin'; fn = os.path.join(out, (name or endpoint.replace('/', '_')) + (('_' + key) if key and len(saved) else '') + ext)
                try: urllib.request.urlretrieve(o['url'], fn); saved.append(fn)
                except Exception as e: saved.append('DOWNLOAD FAILED ' + o['url'] + ' ' + str(e)[:120])
            for k, v in o.items(): walk(v, k)
        elif isinstance(o, list):
            for v in o: walk(v, key)
    walk(res)
    entry = {'endpoint': endpoint, 'request_id': rid, 'args': {k: (v if len(str(v)) < 300 else str(v)[:120] + '...') for k, v in args.items()}, 'files': files or {}, 'outputs': saved, 'seconds': round(time.time() - t0, 1)}
    L = json.load(open(log)) if os.path.exists(log) else []; L.append(entry); json.dump(L, open(log, 'w'), indent=1); return res, saved
if __name__ == '__main__':
    a = sys.argv[1:]; out = a[a.index('-o') + 1] if '-o' in a else 'assets'; args, files = {}, {}
    for x in a[1:]:
        if x == '-o' or x == out: continue
        k, v = x.split('=', 1)
        if k.startswith('file:'): files[k[5:]] = v
        else:
            try: args[k] = json.loads(v)
            except Exception: args[k] = v
    res, saved = call(a[0], args, files, out); print(json.dumps(res)[:600]); print(saved)
