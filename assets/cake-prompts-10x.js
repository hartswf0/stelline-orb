/* ==========================================================================
   STELLINE / CINEOSIS-ORB — 10 PROMPTS BENEATH EACH CAKE (PEOPLE x TIMES x CAKES)
   Supports 4 Batch Modes + Side-Reticle `)` vs No-Reticle toggle:
     1. museum_notext   — Museum-Grade Screenless 5-Ring Orb + Zero Text Anywhere (Default)
     2. scene_notext    — 100% Hardware-Free Grounded Stage + Zero Text Anywhere
     3. museum_script   — Museum-Grade Screenless Orb + Cultural Cake Calligraphy
     4. scene_script    — 100% Hardware-Free Grounded Stage + Cultural Cake Calligraphy
   ========================================================================== */
(function () {
  'use strict';

  const CAKE_DECKS = {
    bundt: {
      cakeTitle: 'CAKE 01 · 12-FLUTE BUNDT RING CAKE',
      cakeSub: 'Fluted ring architecture · clear pedestal & under-cake bounce light · 10 eras, people & ring cakes',
      items: [
        { id: '01', era: '1974 ADDIS ABABA', people: 'Six children in white cotton netela shawls & school sweaters', cakeName: 'Spiced Honey-Teff Fluted Bundt', cakeNoText: 'a tall 12-flute golden honey-and-berbere bundt cake glazed in dark roasted-coffee syrup with toasted sesame seeds and seven lit beeswax candles', cakeScript: 'Amharic', text: 'መልካም ልደት', latin: 'Melkam lidet', room: 'a warm mud-plaster highland room with woven grass floor mats', palette: 'ember amber, raw honey gold, and deep indigo shadow' },
        { id: '02', era: '1928 VIENNA WINTER', people: 'Four siblings in boiled-wool sailor coats & knee socks', cakeName: '12-Flute Marbled Gugelhupf', cakeNoText: 'a tall 12-flute Viennese marbled chocolate-and-vanilla Gugelhupf ring cake dusted finely with powdered sugar, dark Amarena cherries in the crown, and seven slender ivory candles', cakeScript: 'German', text: 'Alles Gute', latin: 'Alles Gute', room: 'a dark walnut-paneled Viennese parlour with frosted window glass behind', palette: 'warm walnut, ivory sugar, and candlelit brass' },
        { id: '03', era: '1968 OAXACA COURTYARD', people: 'Five cousins in embroidered huipiles, braided ribbons & pressed shirts', cakeName: 'Cacao-Cinnamon Pan de Yema Ring', cakeNoText: 'a glossy 12-flute Oaxacan dark-cacao and cinnamon Pan de Yema bundt cake drizzled with amber piloncillo glaze, ringed with orange marigold petals and seven glowing candles', cakeScript: 'Spanish', text: 'Feliz cumpleaños', latin: 'Feliz cumpleanos', room: 'a candlelit adobe courtyard room with subtle cut-paper shadow patterns on stone', palette: 'marigold gold, deep cacao, and warm terracotta' },
        { id: '04', era: '1955 HARLEM BROWNSTONE', people: 'Five children in Sunday pleats, suspenders & satin hair bows', cakeName: 'Glazed Lemon-Buttermilk Bundt', cakeNoText: 'a golden 12-flute buttermilk-lemon pound bundt cake with thick poured vanilla-bean icing ribbons running down every flute, candied lemon curls, and seven striped birthday candles', cakeScript: 'English', text: 'Happy Birthday', latin: 'Happy Birthday', room: 'a warm mahogany-trimmed brownstone dining room at dusk', palette: 'lemon cream, mahogany brown, and Kodachrome amber' },
        { id: '05', era: '1984 LENINGRAD WINTER', people: 'Six children in knitted wool collars & giant white organdy hair bows', cakeName: 'Walnut & Sour-Cream Kuglof Ring', cakeNoText: 'a sculpted 12-flute walnut-and-sour-cream Kuglof ring cake coated in glossy dark boiled-caramel glaze, crushed toasted walnuts around the foot, and seven warm glowing candles', cakeScript: 'Russian', text: 'С днём рождения', latin: 'S dnyom rozhdeniya', room: 'a cosy winter apartment room with a brass tea glass steaming nearby', palette: 'toasted walnut, snow cream, and twilight slate-blue' },
        { id: '06', era: '1979 ISFAHAN EVENING', people: 'Six cousins in embroidered vests & patterned silk scarves', cakeName: 'Saffron-Pistachio Rosewater Bundt', cakeNoText: 'a luminous golden saffron-and-cardamom 12-flute ring cake glazed in rosewater sugar, studded with emerald crushed pistachios, dried Damascus rosebuds, and seven lit candles', cakeScript: 'Persian', text: 'تولدت مبارک', latin: 'Tavallodat mobarak', room: 'a quiet arched plaster room with a woven carpet pool beneath a carved walnut table', palette: 'saffron gold, pistachio green, and rose-amber' },
        { id: '07', era: '1993 SUBURBAN REC ROOM', people: 'Five kids in teal-and-magenta 90s windbreakers & backwards caps', cakeName: '90s Confetti-Glaze Party Bundt', cakeNoText: 'a plump 12-flute vanilla confetti bundt cake covered in thick glossy cream glaze, rainbow nonpareil sprinkles clustered in the ridges, maraschino cherries at the base, and seven bright spiral candles', cakeScript: 'English', text: 'Happy 9th', latin: 'Happy 9th', room: 'a wood-paneled 1990s basement room turned dark for the birthday wish', palette: 'electric teal, magenta windbreaker, and warm 2400K candle glow' },
        { id: '08', era: '1912 EDWARDIAN PARLOUR', people: 'Six children in ivory lace pinafores & tweed Norfolk jackets', cakeName: 'Apricot-Glazed Brioche Savarin Crown', cakeNoText: 'an architectural 12-flute golden brioche Savarin crown cake lacquered in glistening apricot preserve, topped with whipped Chantilly rosettes, candied citron peel, and seven tall beeswax tapers', cakeScript: 'French', text: 'Bon Anniversaire', latin: 'Bon Anniversaire', room: 'an antique oak dining room with silver candlestick reflections in the dark', palette: 'burnished apricot, antique ivory, and sepia shadow' },
        { id: '09', era: '1998 SAO PAULO VERANDA', people: 'Five cousins in vintage football shirts & denim overalls', cakeName: 'Cornmeal & Ruby Guava Goiabada Ring', cakeNoText: 'a warm golden 12-flute Brazilian Bolo de Fuba cornmeal-and-coconut ring cake draped in glossy ruby-red melted goiabada guava glaze with seven flickering birthday candles', cakeScript: 'Portuguese', text: 'Parabéns', latin: 'Parabens', room: 'a warm tiled evening veranda room with louvered wooden shutters', palette: 'cornmeal gold, ruby guava, and tropical twilight' },
        { id: '10', era: '2049 STELLINE DOME', people: 'Three memory-chamber children in soft cream cardigans & wool', cakeName: 'Canonical 12-Flute Vanilla-Rose Bundt', cakeNoText: 'the canonical 12-flute domed vanilla-and-rose bundt cake resting on a gold-rimmed ivory porcelain pedestal stand with pearl bead base border, colorful candy studs, and seven lit red-and-white striped candles', cakeScript: 'Mandarin', text: '生日快樂', latin: 'Shengri kuaile', room: 'the dark circular Stelline memory chamber with one pale horizon light line and a grounded hexagonal oak table', palette: 'warm 2200K candle amber, rose cream, and obsidian chamber shadow' }
      ]
    },
    drum: {
      cakeTitle: 'CAKE 02 · SINGLE-TIER FROSTED DRUM CAKE',
      cakeSub: 'Classic cylindrical sponge · crisp porcelain stand & under-rim shadow · 10 eras, people & drum cakes',
      items: [
        { id: '01', era: '1986 BEIJING HUTONG', people: 'Five schoolchildren in padded cotton jackets, red scarves & twin plaits', cakeName: 'Longevity-Peach Whipped Cream Drum', cakeNoText: 'a round single-tier whipped-cream cylinder cake tinted soft blossom pink with piped cream shell borders, sculpted blush marzipan peaches, green sugar leaves, and seven lit candles', cakeScript: 'Mandarin', text: '生日快乐', latin: 'Shengri kuaile', room: 'a quiet 1980s courtyard apartment room with terrazzo floor and warm dark corners', palette: 'peach blossom, cherry red, jade leaf, and tungsten gold' },
        { id: '02', era: '1976 TOKYO SHOWA', people: 'Five children in navy sailor collars, white knee socks & a paper crown', cakeName: 'Showa Ichigo Strawberry Shortcake Drum', cakeNoText: 'a pristine snow-white whipped-cream Japanese strawberry shortcake cylinder with a ring of glossy whole ruby strawberries around the crown, piped cream peaks, and seven lit candles', cakeScript: 'Japanese', text: 'お誕生日おめでとう', latin: 'Otanjoubi omedetou', room: 'a darkened Showa-era tatami room with faint shoji screen texture behind', palette: 'milk white, lacquer strawberry red, and warm candle gold' },
        { id: '03', era: '1947 POSTWAR LONDON', people: 'Four children in hand-knitted fair-isle cardigans & wool shorts', cakeName: 'Buttercream & Raspberry Victoria Drum', cakeNoText: 'a classic round two-sponge Victoria sandwich drum cake frosted in pale ivory buttercream with a visible ruby raspberry-jam waist, crystallized violets, and seven glowing candles', cakeScript: 'English', text: 'Happy Birthday', latin: 'Happy Birthday', room: 'a cosy coal-warmed London sitting room with dark floral wallpaper in shadow', palette: 'buttercream ivory, raspberry jam, and hearth amber' },
        { id: '04', era: '1982 SYNTHWAVE BASEMENT', people: 'Four kids in striped ringer tees, corduroy & tousled 80s hair', cakeName: 'Dark Ganache & Pastel-Geo Arcade Drum', cakeNoText: 'a mirror-smooth dark chocolate ganache cylinder cake piped around its vertical wall with crisp pastel-mint, coral, and lemon geometric triangles, chocolate curls at the foot, and seven lit candles', cakeScript: 'English', text: 'Level 10', latin: 'Level 10', room: 'a darkened 1982 suburban den around a solid round oak table', palette: 'espresso ganache, pastel mint/coral, and golden flame halation' },
        { id: '05', era: '1963 HAVANA SALON', people: 'Six cousins in crisp white guayaberas, satin ribbons & Sunday shoes', cakeName: 'Toasted-Meringue Dulce de Leche Drum', cakeNoText: 'a round Cuban Capuchina drum cake coated in swirled Italian meringue with torched golden peaks, caramel dulce de leche drips along the rim, and seven glowing candles', cakeScript: 'Spanish', text: 'Felicidades', latin: 'Felicidades', room: 'a high-ceilinged Havana room with mahogany louver doors and warm tile', palette: 'torched meringue gold, caramel, and Caribbean twilight teal' },
        { id: '06', era: '1989 LAGOS PARLOUR', people: 'Six cousins in vibrant matching ankara print dresses & shirts', cakeName: 'Royal-Iced Nigerian Rich Fruitcake Drum', cakeNoText: 'a dense dark spiced Nigerian birthday fruitcake sealed inside architectural snow-white royal icing with piped latticework, edible silver dragee pearls, and seven tall lit candles', cakeScript: 'Yoruba', text: 'Ẹ kú ọjọ́ ìbí', latin: 'E ku ojo ibi', room: 'a warm Lagos front parlour with louvered shutters and polished wood table', palette: 'ankara cobalt and tangerine, royal white, and warm candle amber' },
        { id: '07', era: '1936 KANSAS PRAIRIE', people: 'Three siblings in patched denim overalls, calico dress & newsboy cap', cakeName: 'Double-Fudge Buttermilk Cocoa Drum', cakeNoText: 'a humble homemade round dark-cocoa buttermilk drum cake frosted in glossy swirled chocolate fudge with pecan halves around the bottom edge and seven flickering wax candles', cakeScript: 'English', text: 'Happy Birthday', latin: 'Happy Birthday', room: 'a quiet timber farmhouse kitchen at night lit solely by the cake on a scrubbed pine table', palette: 'rich Dutch cocoa, weathered pine, and intimate candle chiaroscuro' },
        { id: '08', era: '1972 BEIRUT STONE ROOM', people: 'Six children in linen shirts, embroidered waistcoats & velvet ribbons', cakeName: 'Orange-Blossom Semolina & Cream Drum', cakeNoText: 'a golden round Levantine semolina-and-ashta cream drum cake glazed in fragrant blossom syrup, bordered with emerald pistachio crumble, candied orange peel, and seven lit candles', cakeScript: 'Arabic', text: 'عيد ميلاد سعيد', latin: 'Eid milad saeed', room: 'a vaulted limestone room with warm brass tray reflections beneath the cake', palette: 'blossom honey, crushed emerald pistachio, and limestone shadow' },
        { id: '09', era: '1995 MUMBAI MONSOON', people: 'Six cousins in shimmering silk kurtas, lehengas & glass bangles', cakeName: 'Alphonso-Mango & Cardamom Malai Drum', cakeNoText: 'a lush round saffron-and-Alphonso-mango cream cylinder cake with mirror mango glaze on top, piped cardamom cream pearls around the foot, pistachio slivers, and seven lit candles', cakeScript: 'Hindi', text: 'जन्मदिन मुबारक', latin: 'Janmadin mubarak', room: 'a teak-furnished Mumbai apartment room with rain-misted dark window glass behind', palette: 'Alphonso mango gold, cardamom cream, and teakwood shadow' },
        { id: '10', era: '2077 NEO-KYOTO NIGHT', people: 'Four children in matte charcoal technical jackets with subtle piping', cakeName: 'Black-Sesame Mirror & Spun-Sugar Drum', cakeNoText: 'a sculptural obsidian black-sesame mirror-glaze cylinder cake on an ivory ceramic plinth, crowned with a delicate fan of translucent amber-and-cyan spun-sugar filaments and seven real beeswax flames', cakeScript: 'Japanese', text: 'おめでとう', latin: 'Omedetou', room: 'a minimalist dark cedar architectural room with a single low horizon light strip', palette: 'obsidian glaze, spun-sugar cyan, and warm 2200K flame contrast' }
      ]
    },
    dome: {
      cakeTitle: 'CAKE 03 · SCULPTED PATISSERIE DOME CAKE',
      cakeSub: 'Hemispherical domed sponge · luminous glaze & crisp base berries · 10 eras, people & domed cakes',
      items: [
        { id: '01', era: '1958 ROME EVENING', people: 'Five cousins in pressed white collars, wool vests & silk ribbons', cakeName: 'Chocolate-Ricotta Zuccotto Dome', cakeNoText: 'a hemispherical Florentine Zuccotto dome cake paneled in alternating cocoa-dusted sponge and pale ricotta-cream wedges, dark chocolate-covered berries around the foot, and seven lit candles', cakeScript: 'Italian', text: 'Buon Compleanno', latin: 'Buon Compleanno', room: 'a warm Roman dining room with dark plaster walls and a polished walnut table', palette: 'terracotta cocoa, ricotta cream, and Fellini tungsten gold' },
        { id: '02', era: '1973 STOCKHOLM TWILIGHT', people: 'Five blonde cousins in embroidered linen shirts & braided crowns', cakeName: 'Smooth Marzipan Prinsesstarta Dome', cakeNoText: 'a rounded Swedish Prinsesstarta dome cake cloaked in silky pale-celadon green marzipan with a single sculpted pink marzipan rose at the apex, powdered sugar mist, and seven lit candles', cakeScript: 'Swedish', text: 'Grattis', latin: 'Grattis', room: 'a dark birch-paneled Nordic room with midsummer twilight glow at the horizon', palette: 'celadon marzipan, rose pink, and warm birch candlelight' },
        { id: '03', era: '1926 MANHATTAN JAZZ AGE', people: 'Six celebrants in velvet collars, bowties & beaded cloche hats', cakeName: 'Torched-Meringue Baked Alaska Dome', cakeNoText: 'a theatrical hemispherical Baked Alaska dome covered in billowing swiss-meringue swirls toasted to rich amber-gold tips, dark brandied cherries around the porcelain base, and seven tall lit tapers', cakeScript: 'English', text: 'Many Happy Returns', latin: 'Many Happy Returns', room: 'an intimate Art Deco supper room with dark brass trim and mahogany table', palette: 'toasted amber meringue, blackcherry red, and Deco gold' },
        { id: '04', era: '1991 JAIPUR HAVELI', people: 'Six children in saffron-and-crimson bandhani silks & silver anklets', cakeName: 'Saffron & Silver-Leaf Rasmalai Dome', cakeNoText: 'a rounded saffron-soaked Rasmalai mousse dome cake glazed in pale golden milk-cream, garnished with delicate edible silver varq, crimson rose petals, pistachios, and seven glowing candles', cakeScript: 'Hindi', text: 'जन्मदिन मुबारक', latin: 'Janmadin mubarak', room: 'a carved sandstone haveli room with warm brass thali reflections on dark wood', palette: 'kesar saffron, rose crimson, and burnished silver' },
        { id: '05', era: '1951 KYOTO AUTUMN', people: 'Four children in woven indigo kasuri & soft wool cardigans', cakeName: 'Chestnut Mont-Blanc Castella Dome', cakeNoText: 'a domed honey-castella cake piped in concentric golden-brown Japanese kuri chestnut vermicelli strands with a snow-white cream crest, candied chestnuts round the foot, and seven lit candles', cakeScript: 'Japanese', text: 'お誕生日おめでとう', latin: 'Otanjoubi omedetou', room: 'a quiet Kyoto machiya room with dark cedar beams and low lacquered table', palette: 'roasted chestnut, honey cream, and deep indigo shadow' },
        { id: '06', era: '1965 CAIRO EVENING', people: 'Six children in starched cotton collars, cardigans & hair clips', cakeName: 'Golden Kunafa & Clotted-Cream Dome', cakeNoText: 'a crisp hemispherical spun-pastry Kunafa dome lacquered in fragrant amber syrup over snowy clotted cream, ringed at the base with crushed green pistachios, apricot halves, and seven lit candles', cakeScript: 'Arabic', text: 'عيد ميلاد سعيد', latin: 'Eid milad saeed', room: 'a high-ceilinged Cairo apartment salon with parquet wood and warm shadow', palette: 'spun amber gold, clotted ivory, and emerald pistachio' },
        { id: '07', era: '1985 TAIPEI NIGHT', people: 'Five cousins in knit vests, collared shirts & bobbed bangs', cakeName: 'Whipped Taro & Vanilla Pudding Dome', cakeNoText: 'a silky hemispherical pale-lilac taro cream dome cake with glossy egg-custard crown, piped white buttercream pearls around the porcelain stand, dark berries, and seven lit candles', cakeScript: 'Mandarin', text: '生日快樂', latin: 'Shengri kuaile', room: 'a cosy 1980s Taipei dining room with dark rattan chairs and warm wood table', palette: 'soft taro lilac, custard gold, and warm tungsten' },
        { id: '08', era: '1908 ST. PETERSBURG', people: 'Five children in velvet tunics, lace collars & braided hair', cakeName: 'Candied-Berry Sweet Curd Dome', cakeNoText: 'a sculpted hemispherical vanilla-bean sweet curd dome cake studded with ruby candied cranberries and golden raisins, piped buttercream garlands at the foot, and seven tall beeswax candles', cakeScript: 'Russian', text: 'С днём рождения', latin: 'S dnyom rozhdeniya', room: 'a dark oak-wainscoted northern winter room lit entirely by the birthday candles', palette: 'ivory curd, ruby cranberry, and Rembrandt candlelight' },
        { id: '09', era: '1970 KINGSTON TWILIGHT', people: 'Five kids in sunshine-yellow cottons, crochet vests & neat braids', cakeName: 'Spiced Dark-Rum & Glazed Cherry Dome', cakeNoText: 'a rich rounded Caribbean spiced fruit dome cake coated in glossy lemon-amber icing glaze with ruby maraschino cherries and piped rosettes circling the base and seven glowing candles', cakeScript: 'English', text: 'Blessed Earthstrong', latin: 'Blessed Earthstrong', room: 'a warm cedar-lined Kingston living room with vinyl sleeves in soft background shadow', palette: 'amber rum glaze, cherry crimson, and warm cedar' },
        { id: '10', era: '2064 ORBITAL CONSERVATORY', people: 'Four children in natural undyed linen jumpsuits', cakeName: 'Golden Lemon-Honey Patisserie Dome', cakeNoText: 'a luminous golden lemon-and-wildflower-honey patisserie dome cake with mirror citrus glaze, white piped pearl collar around the foot, and seven warm flickering birthday candles on an ivory stand', cakeScript: 'French', text: 'Joyeux Anniversaire', latin: 'Joyeux Anniversaire', room: 'a dark curved glass conservatory dome with a thin silver horizon ring and grounded walnut table', palette: 'wildflower lemon gold, porcelain ivory, and deep space black' }
      ]
    },
    tiers: {
      cakeTitle: 'CAKE 04 · TWO-TIER HERO CELEBRATION CAKE',
      cakeSub: 'Two-tier rose, chocolate & white patisserie · 360-degree borders, rosettes, cherries, berries & 7 candles · 10 eras, people & tiered cakes',
      items: [
        { id: '01', era: '1994 SUBURBAN 90s PARTY', people: 'Five kids in bright colour-block 90s windbreakers, denim & caps', cakeName: '90s Confetti & Maraschino Two-Tier Cake', cakeNoText: 'a festive two-tier vanilla confetti birthday cake with pastel rose-and-white buttercream, closed beaded piping borders on both tiers, 10 cream rosettes, 8 glossy cherries, rainbow sprinkles, and 7 lit striped candles', cakeScript: 'English', text: 'Happy Birthday', latin: 'Happy Birthday', room: 'a darkened 1990s wood-paneled family room around a solid hexagonal oak table', palette: 'windbreaker teal & magenta, buttercream rose, and 2400K candle gold' },
        { id: '02', era: '1904 EDWARDIAN GATHERING', people: 'Six children in heirloom ivory lace dresses, velvet vests & curls', cakeName: 'Lambeth Ivory Royal-Icing Two-Tier Cake', cakeNoText: 'an ornate two-tier Edwardian celebration cake piped in intricate ivory-and-blush Lambeth royal-icing overrich garlands, sugar rosettes, dark berries round the foot, and seven tall beeswax candles', cakeScript: 'English', text: 'Happy Birthday', latin: 'Happy Birthday', room: 'a candlelit Victorian-Edwardian oak dining room with deep chiaroscuro shadows', palette: 'antique ivory, blush rose, dark oak, and beeswax gold' },
        { id: '03', era: '1974 ADDIS ABABA TIZITA', people: 'Six children in white cotton netela shawls & embroidered habesha clothes', cakeName: 'Highland Honey-Spice & Coffee Two-Tier Cake', cakeNoText: 'a soulful two-tier Ethiopian honey-and-spice celebration cake with dark espresso-chocolate foot, warm rose-amber lower tier, ivory upper tier, gold beaded piping, berries, and seven glowing candles', cakeScript: 'Amharic', text: 'መልካም ልደት', latin: 'Melkam lidet', room: 'a warm dark highland salon with woven basket patterns and glowing hearth horizon', palette: 'Tizita amber, coffee espresso, habesha white, and gold' },
        { id: '04', era: '1967 OAXACA FIESTA', people: 'Six children in pressed 1960s Sunday shirts, ribbons & a paper crown', cakeName: 'Marigold & Strawberry Tres Leches Two-Tier', cakeNoText: 'a lush two-tier Tres Leches celebration cake frosted in billowy whipped cream and rose glaze, ringed with glossy strawberries, cherries, cinnamon-gold piped borders, and seven flickering candles', cakeScript: 'Spanish', text: 'Feliz cumpleaños', latin: 'Feliz cumpleanos', room: 'a dark stone courtyard room with faint cut-paper banner shadows and warm wood table', palette: 'fiesta marigold, strawberry crimson, cream, and deep teal shadow' },
        { id: '05', era: '1954 PARISIAN SALON', people: 'Five children in smocks, Peter Pan collars, short trousers & a beret', cakeName: 'Saint-Honore Choux & Caramel Two-Tier Gateau', cakeNoText: 'a two-tier Parisian patisserie gateau with rose-and-praline lower tier, ivory vanilla mousseline upper tier, gold-glazed choux puffs, piped rosettes, dark berries at the foot, and seven lit candles', cakeScript: 'French', text: 'Joyeux anniversaire', latin: 'Joyeux anniversaire', room: 'a dim book-lined Parisian apartment salon with herringbone oak floor', palette: 'burnt caramel, dusty rose, cream, and slate blue' },
        { id: '06', era: '1985 MOSCOW WINTER', people: 'Six children in 1980s knitted winter sweaters, fur collar & white bows', cakeName: 'Twelve-Layer Honey Medovik Two-Tier Cake', cakeNoText: 'a grand two-tier twelve-layer Russian honey Medovik cake coated in velvety cream and golden honey-crumb, piped white-and-gold borders, dark lingonberries round the foot, and seven burning candles', cakeScript: 'Russian', text: 'С днём рождения', latin: 'S dnyom rozhdeniya', room: 'a cosy winter communal flat room with frosted glass and polished wooden table', palette: 'amber honey, snow white, berry crimson, and cold twilight blue' },
        { id: '07', era: '1988 LAGOS CELEBRATION', people: 'Six children in joyful matching royal-blue & orange ankara prints', cakeName: 'Sculpted Sugarcraft & Berry Two-Tier Cake', cakeNoText: 'a regal two-tier Nigerian celebration fruitcake iced in smooth coral-rose and ivory fondant with gold-beaded collars, 10 piped rosettes, glossy cherries, foot berries, and seven lit striped candles', cakeScript: 'Yoruba', text: 'Ẹ kú ọjọ́ ìbí', latin: 'E ku ojo ibi', room: 'a warm dark Lagos dining room with polished mahogany table and soft shutters', palette: 'ankara royal blue, coral rose, gold piping, and warm candlelight' },
        { id: '08', era: '1925 HARLEM ART DECO', people: 'Six celebrants in tuxedo vests, bowties, silk dresses & cloche hats', cakeName: 'Art Deco Black-Cocoa & Gold Two-Tier Cake', cakeNoText: 'a dramatic 1920s Art Deco two-tier dark-cocoa and rose-velvet cake piped with metallic gold geometric garlands, ivory buttercream crown, dark brandied cherries, and seven tall golden candles', cakeScript: 'English', text: 'Happy Birthday', latin: 'Happy Birthday', room: 'a smoky intimate 1920s supper-club room with warm brass lamp rim light', palette: 'espresso black-cocoa, champagne gold, and 35mm celluloid amber' },
        { id: '09', era: '1996 SEOUL ONDOL ROOM', people: 'Six children in pastel colour-block hanbok & one 90s striped tracksuit', cakeName: 'Pastel Mujigae Rice-Cake & Persimmon Two-Tier', cakeNoText: 'a sculpted two-tier Korean celebration Mujigae-tteok rice cake layered in soft rose, honey, and ivory, bordered with piped white pearls, glazed persimmons, dark berries, and seven lit candles', cakeScript: 'Korean', text: '생일 축하해', latin: 'Saengil chukhahae', room: 'a warm dark ondol room with low polished walnut table and paper-screen horizon glow', palette: 'persimmon orange, hanbok rose, ivory rice-cake, and sea-green shadow' },
        { id: '10', era: '2049 STELLINE CHAMBER', people: 'Three luminous childhood friends gathered close around the hexagonal table', cakeName: 'Canonical Stelline Rose, Gold & Berry Two-Tier', cakeNoText: 'the hero two-tier Stelline birthday cake with dark chocolate foot and 12 dark berries, rose-glazed lower tier with 10 cream rosettes and 8 cherries, gold-and-white piped borders, white upper crown with sprinkles, and 7 lit striped candles', cakeScript: 'Mandarin', text: '生日快樂', latin: 'Shengri kuaile', room: 'Dr. Ana Stelline dark spherical memory chamber with one pale horizon line and a grounded bevel-edged hexagonal oak table', palette: 'rose buttercream, 2200K candle flame gold, and obsidian dome shadow' }
      ]
    }
  };

  // Moment-specific beat descriptions so beneath each moment on moments.html the 10 prompts drive THAT exact cinematic beat!
  const MOMENT_BEATS = {
    25: {
      deck: 'drum',
      label: 'MOMENT 25 · CAKE SPAWN, FROSTING MORPH & 45-DEGREE TILT',
      action: (it, writeClause) => `From the empty dark room, ${it.cakeNoText} materializes cleanly on a grounded ivory porcelain pedestal stand atop a solid beveled wooden table (clear soft contact shadow and warm woodgrain visible beneath the cake). Over 5 seconds, its frosting shimmers smoothly through dark chocolate, pale pastel cream, and ${it.palette.split(',')[0]} glaze, then tilts gently toward the camera.${writeClause}`
    },
    26: {
      deck: 'bundt',
      label: 'MOMENT 26 · CYLINDER MORPHING INTO 12-FLUTE BUNDT CAKE',
      action: (it, writeClause) => `Resting clearly on a grounded porcelain stand over a warm solid wooden table (clear under-cake contact shadow and tabletop grain), a smooth round sponge cake sculpts and ripples radially into ${it.cakeNoText}, its twelve deep flutes catching warm 2200K candlelight from the seven wicks.${writeClause}`
    },
    27: {
      deck: 'dome',
      label: 'MOMENT 27 · TOP DECORATION PIPING & SWINGING UPRIGHT',
      action: (it, writeClause) => `Tilted 40 degrees toward the lens above a grounded solid wooden table, ${it.cakeNoText} receives delicate piped patisserie decoration across its crown stroke by stroke${writeClause}, then swings smoothly upright onto its ivory porcelain stand with clear warm bounce light beneath the cake.`
    },
    29: {
      deck: 'tiers',
      label: 'MOMENT 29 · GROUNDED TABLE & CHILDREN FADING IN FROM GHOSTS TO SOLID',
      action: (it, writeClause) => `A solid beveled wooden table and ivory porcelain stand anchor ${it.cakeNoText} in the dark room (clear contact shadow and floor pool beneath the table). Around the table, ${it.people} materialize smoothly — first translucent golden ghosts for two seconds, then 100% solid joyful figures warmly illuminated by the seven birthday candles.${writeClause}`
    },
    36: {
      deck: 'tiers',
      label: 'MOMENT 36 · INTIMATE CANDLELIGHT FLICKERING ACROSS CHILDREN FACES',
      action: (it, writeClause) => `Intimate shallow-DOF medium close-up across ${it.cakeNoText} on its grounded porcelain stand: warm 2200K flames from the seven birthday candles flicker across the cheeks and eyes of ${it.people} gathered around the wooden table, rich chiaroscuro and clear warm bounce fill beneath the cake.${writeClause}`
    },
    39: {
      deck: 'tiers',
      label: 'MOMENT 39 · FULL ENSEMBLE PARTY TABLE AROUND THE LIT CAKE',
      action: (it, writeClause) => `Balanced ensemble tableau inside ${it.room}: ${it.people} are gathered in a warm half-circle around a solid grounded wooden table holding ${it.cakeNoText} on an ivory porcelain stand, upward golden candlelight illuminating every face and the tabletop grain beneath the cake.${writeClause}`
    },
    44: {
      deck: 'tiers',
      label: 'MOMENT 44 · LAUGHING & LEANING IN AROUND THE SEVEN CANDLES BEFORE THE WISH',
      action: (it, writeClause) => `Inside ${it.room}, ${it.people} laugh softly and lean in shoulder-to-shoulder over the grounded wooden table toward ${it.cakeNoText}, the seven golden candle flames reflecting brightly in their eyes and on the porcelain rim beneath the cake right before the birthday wish.${writeClause}`
    },
    46: {
      deck: 'tiers',
      label: 'MOMENT 46 · INHALING THE WISH & BLOWING OUT ALL SEVEN CANDLES',
      action: (it, writeClause) => `Around the grounded wooden table in ${it.room}, ${it.people} inhale together and blow across ${it.cakeNoText}: all seven golden candle flames bend, flicker, and go out in unison, sending thin wisps of wax smoke upward as the warm light on their faces drops to cool twilight shadow.${writeClause}`
    }
  };

  function buildSinglePrompt(it, deckKey, batchMode, reticleMode, momentNum) {
    const withOrb = batchMode === 'museum_notext' || batchMode === 'museum_script';
    const noText = batchMode === 'museum_notext' || batchMode === 'scene_notext';
    const sideRet = reticleMode === 'aside';

    const writeClause = noText
      ? ' Pure tactile royal-icing rosettes, piped pearl borders, and fruit motifs only — NO written words, NO letters, and NO numbers anywhere on the cake.'
      : ` Glossy crimson icing pipes "${it.text}" (${it.latin}) cleanly across the top crown.`;

    const retClause = sideRet
      ? ' Optical reticle rule: a single translucent pale smoked-glass crescent arc floats off to the RIGHT side of the cake, curving ")" so its concave inner curve cups toward the cake and its convex outer belly faces right, with two fine inward-pointing gauge needles; nothing ever wraps or touches the cake.'
      : ' Clean stage rule: NO reticle, NO HUD arcs, NO floating rings, and NO wireframe overlays anywhere in the scene.';

    const bodyAction = momentNum && MOMENT_BEATS[momentNum]
      ? MOMENT_BEATS[momentNum].action(it, writeClause)
      : `One continuous 15-second 24fps cinema shot inside ${it.room} (dark low-key chamber with one faint pale horizon line). [0-3s] Grounded beveled wooden table with visible pedestal, floor light pool, and ivory porcelain cake stand with clear under-cake contact shadow. [3-7s] ${it.cakeNoText} builds and glazes cleanly on the stand, clearly grounded from below.${writeClause} [7-12s] ${it.people} fade in from luminous ghosts to solid figures around the table, warmly lit by the seven 2200K candles. [12-15s] They lean in together and blow out the candles as wisps of smoke rise and warm light falls to twilight.`;

    if (withOrb) {
      const refImg1 = sideRet ? 'orb-film-museum-side-reticle.jpg' : 'orb-film-museum-no-screen.jpg';
      return [
        `[BATCH: ${noText ? 'MUSEUM-GRADE · NO SCREEN ABOVE ORB · ZERO TEXT' : 'MUSEUM-GRADE · NO SCREEN ABOVE ORB + CAKE SCRIPT'} | RETICLE: ${sideRet ? 'SIDE CRESCENT )' : 'OFF'}]`,
        `[WORLD ${it.id}: ${it.era} · ${it.cakeName}]`,
        `LAYOUT & MUSEUM HARDWARE LOCK (attach ${refImg1}): 16:9 split composition. Top 75% is the cinema stage; bottom 25% is the MUSEUM-GRADE 5-RING CYLINDRICAL MEMORY ORB BARREL ONLY — brushed satin titanium and stainless steel with five knurled rings, WITH NO RECTANGULAR SCREEN OR MONITOR ABOVE THE ORB (unobstructed view of the grounded table & cake above). Copy the bottom 25% cylinder exactly every frame.`,
        `SCENE & GROUNDING: ${bodyAction}`,
        `PALETTE & OPTICS: ${it.palette}. 35mm anamorphic lens, shallow DOF, clear warm bounce fill beneath the cake stand so the cake base and tabletop are unmistakable.${retClause}`,
        noText
          ? `HARD ZERO-TEXT & HARDWARE RULES: ZERO text anywhere in the entire frame — no HUD captions, no titles, no button labels, no screen above the orb, and no letters or words on the cake. Inside the upper stage world: no handheld orb, camera, or device in anyone's hands.`
          : `HARD HARDWARE RULES: No rectangular screen above the bottom cylindrical orb, no HUD captions or floating text lists. Inside the upper stage world: no handheld orb, camera, or device in anyone's hands.`
      ].join('\n');
    } else {
      return [
        `[BATCH: ${noText ? 'NO TEXT · 100% SCENE-ONLY (ZERO HARDWARE)' : 'SCENE-ONLY + CULTURAL CAKE SCRIPT'} | RETICLE: ${sideRet ? 'SIDE CRESCENT )' : 'OFF'}]`,
        `[WORLD ${it.id}: ${it.era} · ${it.cakeName}]`,
        `SCENE & GROUNDING (16:9 full-frame world, zero controller hardware): ${bodyAction}`,
        `PALETTE & OPTICS: ${it.palette}. 35mm anamorphic cinema photography, fine organic grain, clear grounded wooden tabletop, pedestal, and soft ambient-occlusion shadow beneath the porcelain cake stand.${retClause}`,
        noText
          ? `HARD ZERO-TEXT & ZERO-ORB RULES: Do NOT show any Memory Maker orb, cylindrical controller, screen, HUD overlay, caption, watermark, or written letters/words/numbers anywhere on the cake or in the room.`
          : `HARD ZERO-ORB RULES: Do NOT show any Memory Maker orb, cylindrical controller, screen, camera, or HUD text anywhere in the frame (only the natural piped cake inscription "${it.text}").`
      ].join('\n');
    }
  }

  // Inject shared high-contrast styles once
  function ensureStyles() {
    if (document.getElementById('cakePrompts10xStyles')) return;
    const st = document.createElement('style');
    st.id = 'cakePrompts10xStyles';
    st.textContent = `
      .cp10-wrap {
        margin-top: 16px;
        border: 2px solid #2d423c;
        background: #090e0d;
        color: #f2f6f4;
        padding: 18px 20px 20px;
        border-radius: 6px;
        font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        box-shadow: 0 12px 32px rgba(0,0,0,0.55);
      }
      .cp10-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-bottom: 14px;
        border-bottom: 1px solid #243530;
        margin-bottom: 14px;
      }
      .cp10-kicker {
        font: 700 11.5px/1.3 "IBM Plex Mono", ui-monospace, Menlo, monospace;
        letter-spacing: 0.09em;
        color: #66f0d8;
        text-transform: uppercase;
      }
      .cp10-title {
        font: 700 17px/1.3 "IBM Plex Mono", ui-monospace, Menlo, monospace;
        color: #ffffff;
        margin-top: 3px;
      }
      .cp10-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        align-items: center;
        margin-bottom: 14px;
      }
      .cp10-pill {
        font: 700 11.5px/1.2 "IBM Plex Mono", ui-monospace, Menlo, monospace;
        letter-spacing: 0.04em;
        padding: 8px 12px;
        border: 1.5px solid #2e453e;
        background: #101917;
        color: #d8e6e1;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.14s ease;
      }
      .cp10-pill:hover {
        border-color: #66f0d8;
        color: #ffffff;
      }
      .cp10-pill.active {
        background: #66f0d8;
        color: #05110e;
        border-color: #66f0d8;
      }
      .cp10-pill.ret-pill.active {
        background: #f5b642;
        color: #120c02;
        border-color: #f5b642;
      }
      .cp10-pill.copy-all {
        background: #f5b642;
        color: #120c02;
        border-color: #f5b642;
        margin-left: auto;
      }
      .cp10-pill.copy-all:hover {
        background: #ffd072;
      }
      .cp10-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      @media (max-width: 960px) {
        .cp10-grid { grid-template-columns: 1fr; }
      }
      .cp10-card {
        border: 1px solid #283a35;
        background: #0e1513;
        border-radius: 5px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .cp10-card:hover {
        border-color: #4f8276;
      }
      .cp10-card-top {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .cp10-num-era {
        font: 700 13px/1.3 "IBM Plex Mono", ui-monospace, Menlo, monospace;
        color: #ffcc66;
      }
      .cp10-cake-badge {
        font: 700 11.5px/1.3 "IBM Plex Mono", ui-monospace, Menlo, monospace;
        color: #66f0d8;
        background: rgba(102, 240, 216, 0.10);
        border: 1px solid rgba(102, 240, 216, 0.30);
        padding: 2px 7px;
        border-radius: 3px;
      }
      .cp10-people {
        font-size: 13px;
        font-weight: 600;
        color: #e4edea;
        line-height: 1.35;
      }
      .cp10-text {
        width: 100%;
        min-height: 118px;
        background: #060a09;
        color: #eef5f2;
        border: 1px solid #22332e;
        border-radius: 4px;
        padding: 9px 10px;
        font: 500 12.5px/1.5 "IBM Plex Mono", ui-monospace, Menlo, monospace;
        resize: vertical;
      }
      .cp10-card-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .cp10-meta {
        font: 500 11px/1.3 "IBM Plex Mono", ui-monospace, Menlo, monospace;
        color: #93a8a1;
      }
      .cp10-copy-btn {
        font: 700 11.5px/1.2 "IBM Plex Mono", ui-monospace, Menlo, monospace;
        padding: 6px 12px;
        background: #172824;
        color: #66f0d8;
        border: 1px solid #3c786b;
        border-radius: 3px;
        cursor: pointer;
      }
      .cp10-copy-btn:hover {
        background: #66f0d8;
        color: #06120f;
      }
    `;
    document.head.appendChild(st);
  }

  const STATE = {
    batch: 'museum_notext',
    reticle: 'aside'
  };
  const MOUNTED = [];

  function renderDeckInstance(inst) {
    const { el, deckKey, momentNum, customTitle } = inst;
    const deck = CAKE_DECKS[deckKey] || CAKE_DECKS.tiers;
    const beatInfo = momentNum ? MOMENT_BEATS[momentNum] : null;
    const heading = customTitle || (beatInfo ? `10 PROMPTS FOR M${momentNum} · DIFFERENT PEOPLE × TIMES × CAKES` : `10 PROMPTS BENEATH ${deck.cakeTitle} · PEOPLE × TIMES × CAKES`);

    const prompts = deck.items.map(it => ({
      it,
      txt: buildSinglePrompt(it, deckKey, STATE.batch, STATE.reticle, momentNum)
    }));

    el.innerHTML = `
      <div class="cp10-wrap">
        <div class="cp10-head">
          <div>
            <div class="cp10-kicker">${beatInfo ? beatInfo.label : deck.cakeSub}</div>
            <div class="cp10-title">${heading}</div>
          </div>
          <button type="button" class="cp10-pill copy-all" data-act="copy-all">COPY ALL 10 PROMPTS</button>
        </div>
        <div class="cp10-controls">
          <button type="button" class="cp10-pill ${STATE.batch === 'museum_notext' ? 'active' : ''}" data-batch="museum_notext">1 · MUSEUM ORB (NO SCREEN ABOVE ORB · NO TEXT)</button>
          <button type="button" class="cp10-pill ${STATE.batch === 'scene_notext' ? 'active' : ''}" data-batch="scene_notext">2 · NO TEXT · SCENE ONLY (ZERO ORB)</button>
          <button type="button" class="cp10-pill ${STATE.batch === 'museum_script' ? 'active' : ''}" data-batch="museum_script">3 · MUSEUM ORB + CAKE WRITING</button>
          <button type="button" class="cp10-pill ${STATE.batch === 'scene_script' ? 'active' : ''}" data-batch="scene_script">4 · SCENE ONLY + CAKE WRITING</button>
          <button type="button" class="cp10-pill ret-pill ${STATE.reticle === 'aside' ? 'active' : ''}" data-ret="aside">RETICLE: SIDE ")" (FILM REF)</button>
          <button type="button" class="cp10-pill ret-pill ${STATE.reticle === 'off' ? 'active' : ''}" data-ret="off">RETICLE: OFF</button>
        </div>
        <div class="cp10-grid">
          ${prompts.map(({ it, txt }, idx) => `
            <div class="cp10-card">
              <div class="cp10-card-top">
                <span class="cp10-num-era">#${it.id} · ${it.era}</span>
                <span class="cp10-cake-badge">${it.cakeName}</span>
              </div>
              <div class="cp10-people">PEOPLE: ${it.people}</div>
              <textarea class="cp10-text" readonly>${txt}</textarea>
              <div class="cp10-card-foot">
                <span class="cp10-meta">${STATE.batch.includes('notext') ? 'ZERO TEXT · PURE PATISSERIE' : `${it.cakeScript}: ${it.text}`} · ${STATE.reticle === 'aside' ? 'SIDE ")" ARC' : 'NO RETICLE'}</span>
                <button type="button" class="cp10-copy-btn" data-idx="${idx}">COPY #${it.id}</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    el.querySelectorAll('[data-batch]').forEach(btn => {
      btn.onclick = () => {
        STATE.batch = btn.dataset.batch;
        MOUNTED.forEach(renderDeckInstance);
      };
    });
    el.querySelectorAll('[data-ret]').forEach(btn => {
      btn.onclick = () => {
        STATE.reticle = btn.dataset.ret;
        MOUNTED.forEach(renderDeckInstance);
      };
    });
    el.querySelectorAll('.cp10-copy-btn').forEach(btn => {
      btn.onclick = () => {
        const p = prompts[+btn.dataset.idx];
        if (!p) return;
        navigator.clipboard.writeText(p.txt).catch(() => {});
        const orig = btn.textContent;
        btn.textContent = 'COPIED!';
        setTimeout(() => { btn.textContent = orig; }, 1300);
      };
    });
    const copyAllBtn = el.querySelector('[data-act="copy-all"]');
    if (copyAllBtn) {
      copyAllBtn.onclick = () => {
        const joined = prompts.map(p => p.txt).join('\n\n' + '='.repeat(72) + '\n\n');
        navigator.clipboard.writeText(joined).catch(() => {});
        copyAllBtn.textContent = 'COPIED ALL 10!';
        setTimeout(() => { copyAllBtn.textContent = 'COPY ALL 10 PROMPTS'; }, 1500);
      };
    }
  }

  window.CAKE_PROMPTS_10X = {
    CAKE_DECKS,
    MOMENT_BEATS,
    buildSinglePrompt,
    setGlobalBatch(batch, reticle) {
      if (batch) STATE.batch = batch;
      if (reticle) STATE.reticle = reticle;
      MOUNTED.forEach(renderDeckInstance);
    },
    mount(elOrId, opts = {}) {
      ensureStyles();
      const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
      if (!el) return;
      const inst = {
        el,
        deckKey: opts.deck || 'tiers',
        momentNum: opts.moment || null,
        customTitle: opts.title || null
      };
      MOUNTED.push(inst);
      renderDeckInstance(inst);
    }
  };
})();
