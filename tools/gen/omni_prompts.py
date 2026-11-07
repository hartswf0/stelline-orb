"""Build the ten Gemini Omni Flash 1.2 prompts: ONE birthday, the same beats and the same references, ten different worlds.
Writes assets/omni/prompts.json and assets/omni/prompts/NN_name.txt. Run: python3 -I tools/gen/omni_prompts.py"""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../assets/omni'); os.makedirs(root + '/prompts', exist_ok=True)
REFS = [
 ('video', 'v1_cake-appears.mp4', 'MOTION of the cake: it appears out of nothing in a dark room, flickers through different icings, then tilts toward the camera. Copy this motion, timing and the lit-from-the-cake light. Do not copy the cake itself.'),
 ('video', 'v2_writing-upright.mp4', 'MOTION of the writing: seen over a dark shoulder, red icing is piped stroke by stroke on the cake top, the cake swings upright, a pale white crescent arc hangs beside it. Copy the camera, the arc and the pacing.'),
 ('video', 'v3_children-fade.mp4', 'MOTION of the children: they are not there, then ghost-transparent, then solid, gathered round a lit table. Copy the fade-in and the seating.'),
 ('video', 'v4_candle-on-face.mp4', 'LIGHT on a face: one candle at the frame edge lights a child\'s face from below and from one side, everything else is dark. Copy this light and framing.'),
 ('video', 'v5_candles-out.mp4', 'MOTION of the flames going out: a face is lit, the candles go out and the warm light leaves the face. Copy the fall of light.'),
 ('image', 'i1_room-before-cake.jpg', 'ROOM: the empty dark room with one pale line of light along the horizon. Keep this architecture, this darkness and this camera height. Treat as a guide for the room, not as the opening frame.'),
 ('image', 'i2_cake-floating.jpg', 'POSITION of the cake: floating just above the floor, left of frame, a few candles lit. Keep this placement.'),
 ('image', 'i3_writing_reticle', ''),
]
REFS = REFS[:7] + [('image', 'i3_writing-reticle.jpg', 'FRAMING of the writing shot: low, over a shoulder, cake on the left, white crescent arc between the cake and the shoulder.'),
 ('image', 'i4_children-lit-table.jpg', 'SEATING: children in a half ring round a table lit only by the cake, the table top a bright flat plane in the dark.'),
 ('image', 'i5_boy-face-candle.jpg', 'FACE LIGHT: a child\'s face lit by one candle, soft, warm, shadow behind. Keep the intimacy and the shallow depth of field.'),
 ('image', 'i6_face-lit.jpg', 'CLOSE FACE: a face lit warm from below at the moment before the candles go out.')]
COMMON_RULES = ('Hard rules. Do not show any device, orb, lens, controller, camera or glowing gadget anywhere, and nothing in anyone\'s hands except a cake knife or a plate. '
 'No adult is in focus; if an adult appears it is a dark silhouette at the frame edge. One continuous locked-off wide-to-medium cinema shot, no scene cuts, slow, handheld-still. '
 'Dark, film-grained, anamorphic, low key; the only light is the cake and its candles plus one pale line of light on the horizon. No music, no captions except the cake writing. Audio: room tone, a soft rising hum when the cake appears, a small sigh of breath at the end when the flames go out.')
V = [
 dict(id='01', name='mandarin-peach', lang='Mandarin', text='生日快乐', latin='Shēngrì kuàilè', cake='a pale pink longevity-peach sponge shaped like a peach, cream and a green marzipan leaf, red icing writing', kids='five children in padded cotton jackets, red scarves and cloth shoes, cropped hair and two plaits', where='a bare 1980s apartment room with a paper lantern and a tiled floor', pal='cherry red, jade and warm tungsten'),
 dict(id='02', name='amharic-tizita', lang='Amharic', text='መልካም ልደት', latin='Melkam lidet', cake='a tall honey-and-spice cake with a dark glaze, a ring of glowing coals around its plate like a coffee ceremony, red icing writing', kids='six children in white cotton netela shawls and embroidered habesha dresses and shirts, bare feet, one in a school sweater', where='a whitewashed highland room with a woven grass mat and a small clay stove', pal='ember orange, cream white and indigo'),
 dict(id='03', name='spanish-tres-leches', lang='Spanish', text='Feliz cumpleaños', latin='Feliz cumpleaños', cake='a glossy tres leches cake with whipped cream peaks, strawberries and a dusting of cinnamon, red icing writing', kids='six children in 1960s Sunday clothes: pressed shirts, ribbons, a paper crown, one in a cowboy hat', where='a courtyard room with cut-paper banners casting patterned shadows on a stone floor', pal='marigold, magenta and deep teal'),
 dict(id='04', name='hindi-saffron-rasmalai', lang='Hindi', text='जन्मदिन मुबारक', latin='Janmadin mubarak', cake='a saffron rasmalai cake with pistachio, rose petals and edible silver leaf, red icing writing', kids='six children in silk kurtas, lehengas and bangles, a marigold garland round one neck', where='a haveli courtyard room with carved stone arches and brass lamps on the floor', pal='saffron, rose and brass gold'),
 dict(id='05', name='japanese-shortcake', lang='Japanese', text='お誕生日おめでとう', latin='Otanjōbi omedetō', cake='a tall strawberry shortcake, white cream, one perfect strawberry per slice, red icing writing', kids='five children in 1970s school uniforms: navy sailor collars, caps, white knee socks, a paper party hat', where='a tatami room with sliding paper doors lit from behind', pal='milk white, strawberry red and soft grey-green'),
 dict(id='06', name='arabic-date-pistachio', lang='Arabic', text='عيد ميلاد سعيد', latin='Eid milad saeed', cake='a round date-and-pistachio cake glazed with syrup, dried rose petals around it, red icing writing', kids='six children in long linen thobes and embroidered dresses, headscarves on two girls, kohl on their eyes', where='a stone majlis room with a brass lantern throwing star-shaped light on a rug', pal='deep green, gold and lantern amber'),
 dict(id='07', name='russian-medovik', lang='Russian', text='С днём рождения', latin='S dnyom rozhdeniya', cake='a many-layered honey medovik with cream and crumbs on the sides, red icing writing', kids='six children in 1980s Soviet winter clothes: big white hair bows, knitted hats, a fur collar, felt boots', where='a cold communal flat room with wallpaper peeling at the corner and a steaming glass of tea', pal='honey brown, snow white and cold blue'),
 dict(id='08', name='yoruba-fruitcake', lang='Yoruba', text='Ẹ kú ọjọ́ ìbí', latin='E ku ojo ibi', cake='a dark Nigerian fruit cake under white royal icing with silver balls, red icing writing', kids='six children in bright ankara print outfits and head ties, matching fabric, one in a school blazer', where='a front room with a lace-covered table, a ceiling fan and louvred shutters', pal='ankara orange, royal blue and warm bulb yellow'),
 dict(id='09', name='french-gateau', lang='French', text='Joyeux anniversaire', latin='Joyeux anniversaire', cake='a tall choux-and-caramel gateau with spun-sugar threads, red icing writing', kids='five children in 1950s Parisian clothes: smocks, Peter Pan collars, short trousers with braces, a beret', where='a book-lined salon with a herringbone floor and one tall window', pal='caramel, cream and dusty blue'),
 dict(id='10', name='korean-seaweed-rice', lang='Korean', text='생일 축하해', latin='Saengil chukhahae', cake='a white rice-cake birthday cake with red bean and a ring of fresh persimmon slices, red icing writing', kids='six children in colour-block hanbok and one in a 1990s tracksuit, sleeves tied back', where='a warm ondol floor room with low table and paper window light', pal='persimmon orange, ivory and sea green'),
]
def refs_block():
    L = ['REFERENCES (all attached; each has one job, use only that job):']
    n = {'video': 0, 'image': 0}
    for kind, f, job in REFS:
        n[kind] += 1; L.append('- %s %d (%s): %s' % (kind, n[kind], f, job))
    L.append('Everything else about each reference (people, clothes, cake, room contents, language, colours) is NOT to be copied: it is replaced by the brief below.')
    return '\n'.join(L)
def beats(v):
    return ('STRUCTURE (one continuous 15 second take):\n'
     '[0-2.5s] The empty dark room: %s. Only the pale line of light on the horizon. Stillness.\n'
     '[2.5-6s] From nothing, %s appears low and left of the frame. It flickers through three different icings (white, caramel, then a pale blue) and tilts toward the camera, as in video 1.\n'
     '[6-9s] The cake swings upright. Red icing writes itself across the top, stroke by stroke, reading exactly "%s" (%s). A pale white crescent arc hangs beside the cake as in video 2.\n'
     '[9-12s] %s fade in around the table: first as faint ghosts, then solid, as in video 3. Their faces catch the cake light.\n'
     '[12-14s] One candle burns on one child\'s face, as in video 4: warm light from below, the rest dark.\n'
     '[14-15s] The candles go out together, the warm light leaves the faces, the room returns to dark, as in video 5.' % (v['where'], v['cake'], v['text'], v['latin'], v['kids'][0].upper() + v['kids'][1:]))
out = []
for v in V:
    p = ('Gemini Omni Flash 1.2 / reference-to-video. 15 seconds, 16:9, 720p draft then 1080p keeper, native audio.\n\n' + refs_block() + '\n\nWORLD: %s. Cake: %s. Children: %s. Palette: %s. Language of the cake writing: %s.\n\n' % (v['where'], v['cake'], v['kids'], v['pal'], v['lang']) + beats(v) + '\n\n' + COMMON_RULES)
    d = dict(v, prompt=p, refs=[f for _, f, _ in REFS]); out.append(d)
    open('%s/prompts/%s_%s.txt' % (root, v['id'], v['name']), 'w').write(p + '\n')
json.dump({'model': 'google/gemini-omni-flash/v1.2/reference-to-video', 'refs': [dict(kind=k, file='refs/' + f, job=j) for k, f, j in REFS], 'variants': out}, open(root + '/prompts.json', 'w'), indent=1, ensure_ascii=False)
print(len(out), 'prompts;', len(p), 'chars each')
