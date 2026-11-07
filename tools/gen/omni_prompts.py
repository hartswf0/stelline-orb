"""Build the ten Gemini Omni Flash 1.2 prompts: ONE birthday, the same beats and the same references, ten different worlds.
Writes assets/omni/prompts.json and assets/omni/prompts/NN_name.txt. Run: python3 -I tools/gen/omni_prompts.py"""
import json, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../assets/omni'); os.makedirs(root + '/prompts', exist_ok=True)
# Omni 1.2 limits (fal/Google docs): 6 reference images, short (<=3 s) reference videos, 3 at most. Two modes, each inside the budget.
# composite: the model makes the WHOLE frame: world on top, our controller strip below, copied from the #film frames.
COMPOSITE = [
 ('video', 'u_ui-strip-hud.mp4', 'UI LOCK (the whole screen layout): the top 62% is the world with a thin HUD (title, numbered list at right, green arcs), the bottom 38% is the fixed controller: a chrome five-ring barrel with a panel above it. COPY THE BOTTOM 38% EXACTLY, every frame: same chrome barrel, same rings, same panel, same position, same size, same text layout. Only the small readouts and a thin teal highlight on one ring may change.'),
 ('video', 'v1_cake-appears.mp4', 'WORLD MOTION of the cake (orb-free film shot): it appears out of nothing in a dark room, flickers through icings, tilts toward the camera. Copy the motion and the light, not the cake.'),
 ('video', 'v3_children-fade.mp4', 'WORLD MOTION of the children (orb-free film shot): not there, ghost-transparent, then solid round a lit table. Copy the fade-in and the seating.'),
 ('image', 'ui1_pick-cake.jpg', 'UI FRAME 1: exact layout of the screen and of the controller. The controller strip must look like this in every frame.'),
 ('image', 'ui2_walk-around.jpg', 'UI FRAME 2: same layout, a different ring highlighted, a HUD title bottom left of the world area. Same controller.'),
 ('image', 'ui3_children-come.jpg', 'UI FRAME 3: same layout while the children appear. Same controller.'),
 ('image', 'i1_room-before-cake.jpg', 'ROOM (orb-free film shot): the empty dark room with one pale line of light along the horizon. Keep this architecture, darkness and camera height in the top 62% of the frame.'),
 ('image', 'i3_writing-reticle.jpg', 'FRAMING of the writing beat (orb-free film shot): low, cake on the left, a pale white crescent arc beside it.'),
 ('image', 'i4_children-lit-table.jpg', 'SEATING (orb-free film shot): children in a half ring round a table lit only by the cake.')]
# scene: world only, no controller anywhere; the real controller strip is stacked under it afterwards (tools/flow/stack.sh).
SCENE = [
 ('video', 'v1_cake-appears.mp4', 'MOTION of the cake: it appears out of nothing in a dark room, flickers through different icings, then tilts toward the camera. Copy this motion, timing and the lit-from-the-cake light. Do not copy the cake itself.'),
 ('video', 'v2_writing-upright.mp4', 'MOTION of the writing: seen over a dark shoulder, red icing is piped stroke by stroke on the cake top, the cake swings upright, a pale white crescent arc hangs beside it. Copy the camera, the arc and the pacing.'),
 ('video', 'v3_children-fade.mp4', 'MOTION of the children: they are not there, then ghost-transparent, then solid, gathered round a lit table. Copy the fade-in and the seating.'),
 ('image', 'i1_room-before-cake.jpg', 'ROOM: the empty dark room with one pale line of light along the horizon. Keep this architecture, darkness and camera height. A guide for the room, not the opening frame.'),
 ('image', 'i2_cake-floating.jpg', 'POSITION of the cake: floating just above the floor, left of frame, a few candles lit. Keep this placement.'),
 ('image', 'i3_writing-reticle.jpg', 'FRAMING of the writing shot: low, over a shoulder, cake on the left, white crescent arc between the cake and the shoulder.'),
 ('image', 'i4_children-lit-table.jpg', 'SEATING: children in a half ring round a table lit only by the cake, the table top a bright flat plane in the dark.'),
 ('image', 'i5_boy-face-candle.jpg', 'FACE LIGHT: a child\'s face lit by one candle, soft, warm, shadow behind. Keep the intimacy and the shallow depth of field.'),
 ('image', 'i6_face-lit.jpg', 'CLOSE FACE: a face lit warm from below at the moment before the candles go out.')]
assert len([r for r in COMPOSITE if r[0]=='image'])<=6 and len([r for r in COMPOSITE if r[0]=='video'])<=3
assert len([r for r in SCENE if r[0]=='image'])<=6 and len([r for r in SCENE if r[0]=='video'])<=3
COMPOSITE_RULES = ('Layout: 16:9. The top 62% of the frame is the world, the bottom 38% is the controller strip copied from the UI references, locked: it never moves, never changes shape, never gets redrawn, never gets a new design. The thin HUD (title and a numbered list at the right, in English, as in the UI references) stays in the world area. In the world: no other device, orb, lens or camera, and nothing in anyone\'s hands except a cake knife or a plate. ')
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
def refs_block(R):
    L = ['REFERENCES (all attached; each has one job, use only that job):']; n = {'video': 0, 'image': 0}
    for kind, f, job in R:
        n[kind] += 1; L.append('- %s %d (%s): %s' % (kind, n[kind], f, job))
    L.append('Everything else in the references (people, clothes, cake, room contents, language, colours) is NOT copied: it is replaced by the brief below.')
    return '\n'.join(L)
HUD = ['PICK THE CAKE', 'WALK AROUND IT', 'WRITE ON IT', 'THE CHILDREN COME', 'LOOK AT THEM', 'BLOW THEM OUT']
def beats(v, comp):
    h = (lambda i, r: ' HUD title: "%s"; ring %d is the lit one on the strip.' % (HUD[i], r)) if comp else (lambda i, r: '')
    return ('STRUCTURE (one continuous 15 second take):\n'
     '[0-2.5s] The empty dark room: %s. Only the pale line of light on the horizon. Stillness.%s\n'
     '[2.5-6s] From nothing, %s appears low and left. It flickers through three different icings (white, caramel, then a pale blue) and tilts toward the camera.%s\n'
     '[6-9s] The cake swings upright. Red icing writes itself across the top, stroke by stroke, reading exactly "%s" (%s). A pale white crescent arc hangs beside it.%s\n'
     '[9-12s] %s fade in around the table: first faint ghosts, then solid. Their faces catch the cake light.%s\n'
     '[12-14s] One candle burns on one child\'s face: warm light from below, the rest dark.%s\n'
     '[14-15s] The candles go out together, the warm light leaves the faces, the room returns to dark.%s' % (v['where'], h(0, 2), v['cake'], h(1, 3), v['text'], v['latin'], h(2, 4), v['kids'][0].upper() + v['kids'][1:], h(3, 2), h(4, 3), h(5, 4)))
out = []
for v in V:
    body = lambda R, comp: ('Gemini Omni Flash 1.2 / reference-to-video. 15 seconds, 16:9, 720p draft then 1080p keeper, native audio.\n\n' + refs_block(R) + '\n\nWORLD: %s. Cake: %s. Children: %s. Palette: %s. Language of the cake writing: %s.\n\n' % (v['where'], v['cake'], v['kids'], v['pal'], v['lang']) + beats(v, comp) + '\n\n' + (COMPOSITE_RULES if comp else '') + COMMON_RULES)
    pc, ps = body(COMPOSITE, True), body(SCENE, False)
    d = dict(v, prompt=pc, prompt_scene=ps, refs=[f for _, f, _ in COMPOSITE], refs_scene=[f for _, f, _ in SCENE]); out.append(d)
    open('%s/prompts/%s_%s.txt' % (root, v['id'], v['name']), 'w').write(pc + '\n'); open('%s/prompts/%s_%s_scene-only.txt' % (root, v['id'], v['name']), 'w').write(ps + '\n')
J = lambda R: [dict(kind=k, file='refs/' + f, job=j) for k, f, j in R]
json.dump({'model': 'google/gemini-omni-flash/v1.2/reference-to-video', 'refs': J(COMPOSITE), 'refs_scene': J(SCENE), 'variants': out}, open(root + '/prompts.json', 'w'), indent=1, ensure_ascii=False)
print(len(out), 'variants x 2 modes')
