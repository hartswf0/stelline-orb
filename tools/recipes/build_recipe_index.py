#!/usr/bin/env python3
"""Index the filmed recipe builds for recipes.html.
Reads the films made by tools/recipes/record_recipes.cjs (a directory of <id>.mp4 + <id>.json), writes web-sized copies and posters into
assets/recipes/, and writes assets/recipes/index.json + index.js (window.RECIPE_FILMS).
  python3 tools/recipes/build_recipe_index.py [source_dir]      (source defaults to assets/recipes itself: re-index only)"""
import json, os, subprocess, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets/recipes')
DST = os.path.join(ROOT, 'assets/recipes'); os.makedirs(DST, exist_ok=True)
labels = json.load(open(os.path.join(ROOT, 'BDAY TRAINING/labels.json')))
items = {i['id']: i for i in labels['items']}
models = json.load(open(os.path.join(ROOT, 'assets/bday-training/handmade_models.json')))['models']
FILM = {'film_canon': 'assets/orbfilm/cakes/cake2_stage_clean.jpg', 'film_bundt': 'assets/orbfilm/cakes/cake1_stage_clean.jpg', 'film_drum': 'assets/orbfilm/cakes/cake2_stage_clean.jpg',
        'film_dome': 'assets/orbfilm/cakes/cake3_stage_clean.jpg', 'film_tiers': 'assets/orbfilm/cakes/cake4_stage_clean.jpg', 'film_wish': 'assets/orbfilm/cakes/cake4_stage_clean.jpg'}
out = []
for jf in sorted(glob.glob(os.path.join(SRC, '*.json'))):
    d = json.load(open(jf))
    if 'steps' not in d or 'frames' not in d: continue
    rid = d['id']; src = os.path.join(SRC, rid + '.mp4'); dst = os.path.join(DST, rid + '.mp4')
    if not os.path.exists(src): continue
    if os.path.abspath(src) != os.path.abspath(dst):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', dst], check=True)
        json.dump(d, open(os.path.join(DST, rid + '.json'), 'w'), indent=1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.3', '-i', dst, '-frames:v', '1', '-q:v', '4', os.path.join(DST, rid + '.jpg')], check=True)
    e = {'id': rid, 'title': d['title'], 'duration_s': d['duration_s'], 'steps': [s['step'] for s in d['steps'] if s.get('step')], 'marks': [s['t'] for s in d['steps'] if s.get('step')]}
    if rid in FILM: e.update(shelf='FILM', ref=FILM[rid])
    elif rid in models:
        m = models[rid]; it = items.get(m.get('ref_id'), {})
        e.update(shelf='ARCHETYPE', ref=m.get('render'), clip=it.get('filename'), clip_id=m.get('ref_id'), count=m.get('count'), era=it.get('era'))
    elif rid in items:
        it = items[rid]; e.update(shelf='CLIP', ref=it['assets']['thumb'], clip=it['filename'], clip_id=rid, era=it.get('era'))
    else: e.update(shelf='FILM')
    out.append(e)
order = {'FILM': 0, 'ARCHETYPE': 1, 'CLIP': 2}
out.sort(key=lambda e: (order[e['shelf']], -(e.get('count') or 0), e['id']))
clips = [{'id': i['id'], 'title': i['title'], 'era': i['era'], 'archetype': i['archetype'], 'thumb': i['assets']['thumb']} for i in labels['items'] if i['kind'] == 'video']
heroes = []
HSRC = os.path.join(SRC, 'hero') if os.path.isdir(os.path.join(SRC, 'hero')) else os.path.join(os.path.dirname(SRC.rstrip('/')), 'hero')
HDST = os.path.join(DST, 'hero'); os.makedirs(HDST, exist_ok=True)
for jf in sorted(glob.glob(os.path.join(HSRC, '*_hero.json')) or glob.glob(os.path.join(HDST, '*_hero.json'))):
    d = json.load(open(jf)); rid = d['id']; src = os.path.join(os.path.dirname(jf), rid + '_hero.mp4'); dst = os.path.join(HDST, rid + '_hero.mp4')
    if os.path.abspath(src) != os.path.abspath(dst):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', dst], check=True)
        json.dump(d, open(os.path.join(HDST, rid + '_hero.json'), 'w'), indent=1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '1.2', '-i', dst, '-frames:v', '1', '-q:v', '4', os.path.join(HDST, rid + '_hero.jpg')], check=True)
    heroes.append({'id': rid, 'title': d['title']})
idx = {'films': out, 'clips': clips, 'heroes': heroes}
json.dump(idx, open(os.path.join(DST, 'index.json'), 'w'), ensure_ascii=False, indent=1)
open(os.path.join(DST, 'index.js'), 'w', encoding='utf-8').write('window.RECIPE_FILMS = ' + json.dumps(idx, ensure_ascii=False) + ';\n')
print(len(out), 'films indexed,', len(clips), 'clip recipes linked')
