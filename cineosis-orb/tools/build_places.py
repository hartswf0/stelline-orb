"""Places for birthdays, from CINEOSIS · The Republic's multiplane: archive frames that Depth Anything V2 split into FAR (the frame with
its nearer things painted out), MID and NEAR (transparent layers). Each place here keeps its three layers, so the camera opens parallax
inside one archival picture. Names are what the picture shows. Usage: python3 build_places.py REPUBLIC_PLANES_DIR"""
import json, os, sys
from PIL import Image
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cut')
PICK = [('4ab554', 'p0a', 'A KITCHEN', 'colour, 1950s'), ('4ab554', 'p1a', 'A FRONT ROOM', 'colour, 1950s'), ('4ab554', 'p2a', 'THE STREET OUTSIDE', 'black and white'),
  ('9ff660', 'p0a', 'A SCHOOL CANTEEN', 'colour, 1960s'), ('6b21b7', 'p2a', 'A RESTAURANT', 'colour, 1960s'), ('731792', 'p0a', 'A FARMHOUSE WINDOW', 'black and white'),
  ('da8655', 'p0a', 'A CLEARING IN THE WOODS', 'colour, 1940s'), ('fe6eb7', 'p2a', 'A FARM', 'colour, 1950s'), ('c84033', 'p1a', 'THE DESERT ROAD', 'colour, 1970s'),
  ('c84033', 'p0a', 'AN OPEN PLAIN', 'colour'), ('d3bc20', 'p2a', 'A LONG HALL', 'colour'), ('e90b7e', 'p0a', 'AN OFFICE AFTER HOURS', 'colour, 1990s'),
  ('e90b7e', 'p2a', 'AN OFFICE, OPEN PLAN', 'colour, 1990s'), ('a929ad', 'p2a', 'A VILLAGE STREET', 'black and white'), ('65a408', 'p2a', 'A GRAND ROOM', 'black and white'),
  ('42c8aa', 'p2a', 'A PARK', 'black and white'), ('42c8aa', 'p0a', 'A STADIUM AT NIGHT', 'colour')]
def main(root):
    cat = json.load(open(os.path.join(OUT, 'catalog.json'))); cat = [c for c in cat if c['kind'] != 'place']
    for i, (ep, v, name, look) in enumerate(PICK):
        pid = 'place-%02d' % i; L = {}
        for layer in ('far', 'mid', 'near'):
            fp = os.path.join(root, ep, '%s_%s.webp' % (v, layer))
            if not os.path.exists(fp): continue
            im = Image.open(fp); im.save(os.path.join(OUT, '%s-%s.webp' % (pid, layer)), 'WEBP', quality=78, method=6); L[layer] = 'cut/%s-%s.webp' % (pid, layer); w, h = im.size
        cat.append({'id': pid, 'name': name, 'kind': 'place', 'layers': L, 'aspect': round(w / h, 4), 'from': 'CINEOSIS · The Republic multiplane · an archive frame, ' + look}); print(pid, name, list(L))
    json.dump(cat, open(os.path.join(OUT, 'catalog.json'), 'w'), indent=1)
if __name__ == '__main__': main(sys.argv[1])
