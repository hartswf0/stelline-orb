"""Build the Gemini Omni Flash 1.2 / Google Flow prompts across 4 batches:
1. prompt_museum_notext : Museum-Grade Screenless 5-Ring Orb (NO screen above Orb) + ZERO text anywhere + ")" side crescent
2. prompt_scene_notext  : 100% Hardware-Free Scene-Only + ZERO text anywhere
3. prompt               : Six-image Controller + HUD + Cultural Cake Writing + ")" side crescent
4. prompt_scene         : 100% Hardware-Free Scene-Only + Cultural Cake Writing
Writes assets/omni/prompts.json and assets/omni/prompts/*.txt."""
import json, os, zipfile

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../assets/omni')
os.makedirs(root + '/prompts', exist_ok=True)

MUSEUM_FRAMES = [
 ('image', 'museum_ui2_candles.jpg', 'MUSEUM HARDWARE LOCK (no screen above Orb, zero text): top 75% is the grounded birthday stage with beveled walnut table, ivory porcelain cake stand, and one translucent smoked-glass crescent curving ")" off to the right of the cake (concave side cupping toward the cake); bottom 25% is the pure brushed-metal 5-ring cylindrical Memory Orb barrel WITH NO RECTANGULAR SCREEN ABOVE IT and ZERO text labels. Copy the bottom 25% cylinder exactly every frame.'),
 ('image', 'museum_ui3_children.jpg', 'SAME MUSEUM HARDWARE LOCK WITH CHILDREN AT THE TABLE: top 75% shows the children warmly lit around the grounded cake and walnut table; bottom 25% is the identical screenless 5-ring cylindrical barrel.'),
 ('image', 'f1_strip_cake-appears.jpg', 'FILMSTRIP, left to right (orb-free film shot): empty dark room with one pale line of light, then a cake appears, flickers through three icings, and tilts toward the camera. Copy the pacing and motion, not the specific cake.'),
 ('image', 'f2_strip_writing-upright.jpg', 'FILMSTRIP, left to right (orb-free film shot): the cake sculpts and receives top decoration as it swings upright, a pale crescent ")" beside it on the right.'),
 ('image', 'f3_strip_children-fade.jpg', 'FILMSTRIP, left to right (orb-free film shot): children fade in from faint ghosts to solid around a warm table lit by the cake.'),
 ('image', 'f4_strip_candle-then-out.jpg', 'FILMSTRIP, left to right (orb-free film shot): one candle lights a child face from below, then the candles go out and warm light falls to dark.')
]

FRAMES = [
 ('image', 'ui2_walk-around.jpg', 'SCREEN LAYOUT AND CONTROLLER (lock): top 68% is the grounded world with one translucent pale crescent curving ")" off to the right of the cake (concave side facing the cake); bottom 32% is the fixed five-ring chrome controller barrel and panel. COPY THE BOTTOM 32% EXACTLY every frame.'),
 ('image', 'ui3_children-come.jpg', 'SAME SCREEN LAYOUT AND CONTROLLER, later in the film (children present). The controller strip must look identical to the first screen reference.'),
 ('image', 'f1_strip_cake-appears.jpg', 'FILMSTRIP, read left to right as time (orb-free film shot): the empty dark room with one pale line of light, then a cake appears, flickers through different icings, and tilts toward the camera.'),
 ('image', 'f2_strip_writing-upright.jpg', 'FILMSTRIP, left to right (orb-free film shot): the cake turns like a bundt, then red icing is piped stroke by stroke across the top as the cake swings upright, a pale crescent ")" beside it on the right.'),
 ('image', 'f3_strip_children-fade.jpg', 'FILMSTRIP, left to right (orb-free film shot): children are not there, then ghost-transparent, then solid round a table lit only by the cake.'),
 ('image', 'f4_strip_candle-then-out.jpg', 'FILMSTRIP, left to right (orb-free film shot): one candle lights a boy face from below, then a face is lit warm as the candles go out and the light leaves it.')
]

COMPOSITE = [
 ('video', 'u_museum-no-screen.mp4', 'MUSEUM UI LOCK: top 75% grounded stage with ")" crescent off to the right of the cake; bottom 25% screenless 5-ring brushed metal barrel (NO screen above the orb, ZERO text).'),
 ('video', 'v1_cake-appears.mp4', 'WORLD MOTION of the cake (orb-free film shot): appears in dark room, flickers through icings, tilts.'),
 ('video', 'v3_children-fade.mp4', 'WORLD MOTION of the children (orb-free film shot): ghost-transparent, then solid round a lit table.'),
 ('image', 'museum_ui1_cake.jpg', 'MUSEUM FRAME 1: screenless 5-ring cylinder below, grounded cake on walnut table above.'),
 ('image', 'museum_ui2_candles.jpg', 'MUSEUM FRAME 2: screenless 5-ring cylinder below, lit two-tier cake + ")" crescent above.'),
 ('image', 'museum_ui3_children.jpg', 'MUSEUM FRAME 3: screenless 5-ring cylinder below, children gathered around the cake above.'),
 ('image', 'i1_room-before-cake.jpg', 'ROOM: empty dark room with one pale line of light along the horizon.'),
 ('image', 'i3_writing-reticle.jpg', 'FRAMING: cake on the left/center, translucent smoked-glass crescent curving ")" off to its right (concave inner curve cupping toward the cake).'),
 ('image', 'i4_children-lit-table.jpg', 'SEATING: children in a half ring round a grounded wooden table lit by the cake.')
]

SCENE = [r for r in FRAMES[2:]] + [
 ('image', 'i1_room-before-cake.jpg', 'ROOM: the empty dark room with one pale line of light along the horizon. Keep this architecture, darkness and camera height.'),
 ('image', 'i5_boy-face-candle.jpg', 'FACE LIGHT: a child face lit by one candle, soft, warm, shadow behind. Keep the intimacy and shallow depth of field.')
]

MUSEUM_RULES = (
 'Layout: 16:9. Top 75% is the grounded cinema world (solid beveled wooden table, ivory porcelain cake stand with clear under-cake contact shadow, heroic cake scale); '
 'bottom 25% is the MUSEUM-GRADE SCREENLESS 5-RING CYLINDRICAL MEMORY ORB BARREL copied from the museum references — NO rectangular screen or monitor above the orb, NO text labels, NO HUD captions anywhere. '
 'Off to the right side of the cake floats one translucent pale smoked-glass crescent curving ")" (concave inner side cupping toward the cake, convex outer belly facing right, two fine inward-pointing gauge needles, never wrapping or touching the cake). '
)

COMPOSITE_RULES = (
 'Layout: 16:9. Top 68% is the grounded world, bottom 32% is the controller strip copied from the UI references, locked every frame. '
 'One pale smoked-glass crescent curves ")" off to the right side of the cake (concave side facing the cake); nothing wraps the cake. '
)

NOTEXT_HARD_RULES = (
 'HARD ZERO-TEXT RULES: Do NOT render any text, words, letters, numbers, captions, titles, button labels, or cake writing anywhere in the frame. '
 'In the stage world: no handheld device, orb, lens, or camera in anyone hands. One continuous locked-off cinema take, 35mm anamorphic, warm 2200K candlelight + clear under-cake bounce fill. '
 'Audio: quiet room tone, warm mechanical ring clicks, soft rising hum as the cake materializes, gentle breath as the candles go out.'
)

SCRIPT_HARD_RULES = (
 'Hard rules. Do not show any handheld device, orb, lens, camera, or glowing gadget in the stage world, and nothing in anyone hands except a cake knife or plate. '
 'One continuous locked-off cinema shot, 35mm anamorphic, warm 2200K candlelight + clear grounded wooden table and porcelain stand beneath the cake. '
 'No music, no captions except the piped cake writing. Audio: room tone, soft rising hum when the cake appears, gentle sigh of breath when the flames go out.'
)

V = [
 dict(id='01', name='mandarin-peach', lang='Mandarin', text='生日快乐', latin='Shēngrì kuàilè',
      cake='a pale pink longevity-peach sponge shaped like a peach, cream rosettes and a green marzipan leaf, red icing writing',
      cake_notext='a pale pink longevity-peach sponge cake with whipped cream shell borders, sculpted blush marzipan peaches, green sugar leaves, and seven lit candles (pure visual patisserie, zero text)',
      kids='five children in 1980s padded cotton jackets, red scarves and cloth shoes, cropped hair and two plaits',
      where='a bare 1980s Beijing apartment room with a paper lantern and a grounded dark walnut table', pal='cherry red, jade and warm tungsten'),
 dict(id='02', name='amharic-tizita', lang='Amharic', text='መልካም ልደት', latin='Melkam lidet',
      cake='a tall honey-and-spice cake with a dark coffee glaze, a ring of glowing embers around its porcelain stand, red icing writing',
      cake_notext='a tall Ethiopian honey-and-spice cake with glossy dark roasted-coffee glaze, piped cream rosettes, toasted sesame, and seven lit beeswax candles on an ivory stand (zero text)',
      kids='six children in white cotton netela shawls and embroidered habesha dresses and shirts, one in a school sweater',
      where='a warm highland room with woven grass mat and grounded carved wooden table', pal='ember orange, cream white and indigo'),
 dict(id='03', name='spanish-tres-leches', lang='Spanish', text='Feliz cumpleaños', latin='Feliz cumpleaños',
      cake='a glossy tres leches cake with whipped cream peaks, whole strawberries and a dusting of cinnamon, red icing writing',
      cake_notext='a lush two-layer tres leches cake crowned with whipped cream peaks, glossy whole ruby strawberries, marigold petals around the porcelain rim, and seven lit candles (zero text)',
      kids='six children in 1960s Sunday clothes: pressed shirts, ribbons, a paper crown, one in a cowboy hat',
      where='a dark courtyard room with cut-paper banners casting patterned shadows behind a grounded oak table', pal='marigold, magenta and deep teal'),
 dict(id='04', name='hindi-saffron-rasmalai', lang='Hindi', text='जन्मदिन मुबारक', latin='Janmadin mubarak',
      cake='a saffron rasmalai cake with pistachio, crimson rose petals and edible silver leaf, red icing writing',
      cake_notext='a golden saffron rasmalai cream cake adorned with crushed green pistachios, crimson Damascus rose petals, edible silver varq, and seven glowing candles on an ivory stand (zero text)',
      kids='six children in silk kurtas, lehengas and glass bangles, a marigold garland round one neck',
      where='a carved sandstone haveli room with brass lamps and a grounded teak table', pal='saffron, rose and brass gold'),
 dict(id='05', name='japanese-shortcake', lang='Japanese', text='お誕生日おめでとう', latin='Otanjōbi omedetō',
      cake='a tall strawberry shortcake, snow-white cream, one perfect strawberry per slice, red icing writing',
      cake_notext='a pristine tall Showa-era Japanese strawberry shortcake in snow-white whipped cream with a ring of whole glossy strawberries, piped cream rosettes, and seven lit candles (zero text)',
      kids='five children in 1970s school uniforms: navy sailor collars, caps, white knee socks, a paper party hat',
      where='a darkened tatami room with shoji paper doors and a grounded low walnut table', pal='milk white, strawberry red and soft grey-green'),
 dict(id='06', name='arabic-date-pistachio', lang='Arabic', text='عيد ميلاد سعيد', latin='Eid milad saeed',
      cake='a round date-and-pistachio cake glazed with blossom syrup, dried rosebuds around it, red icing writing',
      cake_notext='a round Levantine date-and-pistachio cake lacquered in amber orange-blossom syrup, ringed with emerald pistachio crumble, dried rosebuds, and seven lit candles (zero text)',
      kids='six children in long linen thobes and embroidered dresses, headscarves on two girls',
      where='a vaulted stone majlis room with star-shaped brass lantern shadow and grounded walnut table', pal='deep green, gold and lantern amber'),
 dict(id='07', name='russian-medovik', lang='Russian', text='С днём рождения', latin='S dnyom rozhdeniya',
      cake='a many-layered honey medovik with sour-cream frosting and golden crumbs on the sides, red icing writing',
      cake_notext='a tall twelve-layer Russian honey medovik coated in velvety cream and golden honey crumbs, dark lingonberries round the foot, and seven burning candles (zero text)',
      kids='six children in 1980s winter sweaters: big white hair bows, knitted hats, a fur collar',
      where='a cosy winter flat room with frosted glass behind a grounded dark wood table', pal='honey brown, snow white and cold blue'),
 dict(id='08', name='yoruba-fruitcake', lang='Yoruba', text='Ẹ kú ọjọ́ ìbí', latin='E ku ojo ibi',
      cake='a dark Nigerian fruit cake under crisp white royal icing with silver dragées, red icing writing',
      cake_notext='a regal dark Nigerian spiced fruitcake sealed in architectural ivory-and-coral royal icing with piped rosettes, silver dragée pearls, and seven lit striped candles (zero text)',
      kids='six children in bright matching ankara print outfits and head ties, one in a school blazer',
      where='a warm Lagos parlour with louvered shutters and a grounded mahogany table', pal='ankara orange, royal blue and warm bulb yellow'),
 dict(id='09', name='french-gateau', lang='French', text='Joyeux anniversaire', latin='Joyeux anniversaire',
      cake='a tall choux-and-caramel Saint-Honoré gateau with spun-sugar threads, red icing writing',
      cake_notext='a tall Parisian Saint-Honoré gateau with caramel-dipped choux puffs, piped vanilla mousseline waves, spun-sugar halo, and seven lit tapers on a porcelain stand (zero text)',
      kids='five children in 1950s Parisian clothes: smocks, Peter Pan collars, short trousers with braces, a beret',
      where='a dim book-lined Parisian salon with herringbone oak floor and grounded walnut table', pal='caramel, cream and dusty blue'),
 dict(id='10', name='korean-seaweed-rice', lang='Korean', text='생일 축하해', latin='Saengil chukhahae',
      cake='a white Mujigae rice-cake birthday cake with red bean and a ring of fresh persimmon slices, red icing writing',
      cake_notext='a sculpted pastel-layered Korean Mujigae-tteok rice cake topped with glazed persimmon slices, piped bean-paste blossoms, and seven lit candles on an ivory ceramic stand (zero text)',
      kids='six children in colour-block hanbok and one in a 1990s tracksuit, sleeves tied back',
      where='a warm dark ondol room with paper window horizon glow and grounded low walnut table', pal='persimmon orange, ivory and sea green'),
]

def refs_block(R):
    L = ['REFERENCES (all attached; each has one job, use only that job):']
    n = {'video': 0, 'image': 0}
    for kind, f, job in R:
        n[kind] += 1
        L.append('- %s %d (%s): %s' % (kind, n[kind], f, job))
    L.append('Everything else in the references (people, clothes, cake, room contents, colours) is replaced by the brief below.')
    return '\n'.join(L)

HUD = ['PICK THE CAKE', 'WALK AROUND IT', 'WRITE ON IT', 'THE CHILDREN COME', 'LOOK AT THEM', 'BLOW THEM OUT']

def beats_script(v, comp):
    h = (lambda i, r: ' HUD title: "%s"; ring %d is lit.' % (HUD[i], r)) if comp else (lambda i, r: '')
    return (
        'STRUCTURE (one continuous 15 second take):\n'
        '[0-2.5s] The dark room: %s, with a grounded wooden table and ivory porcelain stand clearly visible. Pale line of light on the horizon.%s\n'
        '[2.5-6s] On the grounded porcelain stand, %s materializes at heroic scale with clear under-cake shadow, flickering through three icings and tilting toward the camera.%s\n'
        '[6-9s] The cake swings upright. Red icing pipes stroke by stroke across the crown, reading "%s" (%s). A pale crescent ")" hangs off to its right (concave side cupping toward the cake).%s\n'
        '[9-12s] %s fade in around the grounded table: first translucent ghosts, then solid, warmly lit by the seven candles.%s\n'
        '[12-14s] Warm 2200K candlelight flickers across one child face in shallow DOF.%s\n'
        '[14-15s] All seven candles blow out together, thin smoke rises, and warm light falls to twilight.%s'
        % (v['where'], h(0, 2), v['cake'], h(1, 3), v['text'], v['latin'], h(2, 4), v['kids'][0].upper() + v['kids'][1:], h(3, 2), h(4, 3), h(5, 4))
    )

def beats_notext(v, museum):
    ring_note = (lambda r: ' Ring %d turns subtly on the screenless metal barrel below.' % r) if museum else (lambda r: '')
    ret_note = ' A single pale smoked-glass crescent curves ")" off to the right of the cake (concave side facing the cake).'
    return (
        'STRUCTURE (one continuous 15 second take, ZERO TEXT ANYWHERE):\n'
        '[0-2.5s] %s with a grounded beveled wooden table and ivory porcelain cake stand clearly lit by warm grazing bounce fill.%s\n'
        '[2.5-6s] Heroic-scale %s materializes cleanly on the porcelain stand (clear under-cake contact shadow), shimmering through three glazes and tilting gently.%s\n'
        '[6-9s] The cake settles upright as piped cream rosettes, pearl borders, and fruit garnishes form radially around the crown — NO words or letters.%s%s\n'
        '[9-12s] %s fade in from luminous ghosts to solid joyful figures around the grounded wooden table.%s\n'
        '[12-14s] Intimate close-up of warm 2200K candle flames flickering in the children eyes.%s\n'
        '[14-15s] They lean in and blow out all seven candles together as smoke curls up and warm light drops to shadow.%s'
        % (v['where'], ring_note(2), v['cake_notext'], ring_note(3), ret_note, ring_note(4), v['kids'][0].upper() + v['kids'][1:], ring_note(2), ring_note(3), ring_note(4))
    )

out = []
for v in V:
    head = 'Gemini Omni Flash 1.2 / Google Flow reference-to-video. 15 seconds, 16:9, 1080p, 24fps, native audio.\n\n'
    world_notext = '\n\nWORLD: %s. Cake (zero text): %s. People: %s. Palette: %s.\n\n' % (v['where'], v['cake_notext'], v['kids'], v['pal'])
    world_script = '\n\nWORLD: %s. Cake: %s. People: %s. Palette: %s. Language: %s.\n\n' % (v['where'], v['cake'], v['kids'], v['pal'], v['lang'])

    p_museum_notext = head + refs_block(MUSEUM_FRAMES) + world_notext + beats_notext(v, True) + '\n\n' + MUSEUM_RULES + NOTEXT_HARD_RULES
    p_scene_notext  = head + refs_block(SCENE) + world_notext + beats_notext(v, False) + '\n\n' + NOTEXT_HARD_RULES
    p_frames        = head + refs_block(FRAMES) + world_script + beats_script(v, True) + '\n\n' + COMPOSITE_RULES + SCRIPT_HARD_RULES
    p_video         = head + refs_block(COMPOSITE) + world_script + beats_script(v, True) + '\n\n' + MUSEUM_RULES + SCRIPT_HARD_RULES
    p_scene         = head + refs_block(SCENE) + world_script + beats_script(v, False) + '\n\n' + SCRIPT_HARD_RULES

    d = dict(
        v,
        prompt_museum_notext=p_museum_notext,
        prompt_scene_notext=p_scene_notext,
        prompt=p_frames,
        prompt_video_refs=p_video,
        prompt_scene=p_scene,
        refs_museum=[f for _, f, _ in MUSEUM_FRAMES],
        refs=[f for _, f, _ in FRAMES],
        refs_video=[f for _, f, _ in COMPOSITE],
        refs_scene=[f for _, f, _ in SCENE]
    )
    out.append(d)

    open('%s/prompts/%s_%s_museum-no-screen-no-text.txt' % (root, v['id'], v['name']), 'w').write(p_museum_notext + '\n')
    open('%s/prompts/%s_%s_scene-only-no-text.txt' % (root, v['id'], v['name']), 'w').write(p_scene_notext + '\n')
    open('%s/prompts/%s_%s.txt' % (root, v['id'], v['name']), 'w').write(p_frames + '\n')
    open('%s/prompts/%s_%s_with-video-refs.txt' % (root, v['id'], v['name']), 'w').write(p_video + '\n')
    open('%s/prompts/%s_%s_scene-only.txt' % (root, v['id'], v['name']), 'w').write(p_scene + '\n')

J = lambda R: [dict(kind=k, file='refs/' + f, job=j) for k, f, j in R]
manifest = {
    'model': 'google/gemini-omni-flash/v1.2/reference-to-video',
    'refs_museum': J(MUSEUM_FRAMES),
    'refs': J(FRAMES),
    'refs_video': J(COMPOSITE),
    'refs_scene': J(SCENE),
    'variants': out
}
json.dump(manifest, open(root + '/prompts.json', 'w'), indent=1, ensure_ascii=False)

# Rebuild omni-pack.zip so the 1-click download has all new Museum No-Screen & No-Text refs + prompts!
zip_path = os.path.join(root, 'omni-pack.zip')
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(root, 'prompts.json'), 'prompts.json')
    for dirpath, _, filenames in os.walk(root):
        for fn in sorted(filenames):
            if fn == 'omni-pack.zip':
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root)
            if rel != 'prompts.json':
                zf.write(full, rel)

print(len(out), 'variants x 5 prompt batches written + omni-pack.zip updated!')
