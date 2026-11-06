# Multiplane parallax: the birthday as a game played on the memory maker's device

## Thesis

A flat archive becomes a space the viewer can kneel inside: separate planes at true depths, so that moving the eye reveals
and hides things as a real room would. Here the party is cut into flat pieces, each at its own depth, and the memory maker's
device is the only controller. Where Ana kneels (the scale ring) and how deep each piece sits (the knurled ring) decide what
she can see. The game: kneel, and set the pieces at the right depths, so that when she releases HOLD and the child blows, all
seven candles and all three faces are seen.

What would make it bland: a flat picture slid sideways (every plane at one speed), a 3D scene that only looks layered, a
separate set of buttons instead of the device, or a goal the eye alone can reach.

## Native formal language

Planes, true depths, a lens shift, painter's order. Each card is fronto-parallel and never rotates (cut paper on glass). The
eye moves along a chord around the cake: b = D·sin(yaw), D = 2.6 m. A lens shift holds the cake still on screen, so a card at
depth z slides F·Δb·(1/zc − 1/z) pixels: cards behind the cake move with the eye, cards in front move against it. Cards are
drawn far to near, sorted by their current depth every frame. All of this is in `index.html` (canvas 2D, no library).

## The planes (planes.json)

33 planes. Back wall at 9 m (faint round light spots, the band of light where wall meets floor); 13 floor strips from 9 m
to 1 m, each shaded to meet the next nearer one; four paper lanterns hung at 5.6, 3.6, 2.15 and 1.25 m, filling the dark
above the party; far children at 3.0 and 2.9 m (film cut-outs child 1 and child 3, `ana/cut`), lifted so their faces sit
above the table; the table's far top (2.78 m), the cake and its seven candles (2.6 m, the pivot), the table's near lip and
pedestal (2.36 m); the near child at 1.95 m (film cut-out child 2) and her chair back, which travels with her 10 cm nearer;
a balloon and its string (1.02 m); a chair post (0.86 m).

Round 1 repair (critic-round1.md): the film cut-outs are now opaque. Their matte is thresholded once per frame
(alpha 48 or less becomes clear, the soft interior becomes solid, a 1–2 px edge stays soft), so nothing behind shows through
her hair. The earlier fade to dark at the foot of each card is gone: the near child's cut (shirt hem, matte cut, a dark
shoulder at the lower left) is covered by her chair back, and the far children's cuts by the table top, at every eye angle and
depth the game allows. The drawn pieces (table, chairs, lanterns) carry the projection's round spots on their surfaces
(fixed to each surface, so they move with its plane), lit warm from the candles and falling to true black at their edges;
the whole picture then gets a warm falloff from the cake and a fine round-spot screen.

Rights: every plane except the three children is drawn by the page's code. The three children are frame cut-outs from
Blade Runner 2049 already in this repo (`ana/cut`), reused by relative path, not copied; they are not cleared or licensed
by this swarm. No film frames or film audio are in this folder.

## The device (ana/index.html's barrel, reused)

| part | here |
|---|---|
| SCALE RING | Where Ana kneels: 2° of yaw per detent, −30° to +30°. |
| SELECT | The piece to work on: near child (her chair moves with her), child left, child right, balloon. The selected piece is named under the right collar. |
| KNURLED RING | The selected piece's depth, 5 cm per detent (near child 1.40–2.30 m, far children 2.90–3.90 m, balloon 0.90–2.20 m). |
| TRIANGLE RING | A child's time (±12 frames of her performance); the balloon's height (±24 cm). |
| HOLD | Tap: freeze or release the children. Hold down: switch the memory off. |
| LEFT COLLAR | Play the scene (a solved game; it makes the proof film) or clear. |
| i | The operator panel: rules, a plan seen from above, links. |

The hand turns a ring quietly, one click a detent; the machine then steps to it at 11.8 a second, one louder click a step
(the device's own grains, `ana/device-sounds.wav`). The picture does not step: the view follows the machine with a critically
damped spring, so it glides between clicks, as the film's tableau shift does.

## The game

Start: HOLD is on, the children are frozen, Ana kneels at 00. Release HOLD and 1.6 s later the child blows. At that moment
the page measures what is seen: a candle counts when more than 60 % of its flame's pixels are not covered by any nearer card;
a face counts the same way over an ellipse at the face. Seven and three: the candles go out one by one, the birthday is
kept, and the counter then shows what was seen at the blow. Anything less: the memory holds again, the miss names the hidden
child, the hidden faces are marked with the film's small arc, and she tries again.

The real winning windows (tests/solve.js, eye angles in 2° steps, depths in 10 cm steps, children's frame 0; the blow
happens 1.6 s into their performance, so a window's edge can move by a step):
- From the start position: no angle wins.
- Child right pushed back: 3.0 m wins at −30°; 3.1 m: −30 to −26°; 3.2 m: −30 to −24°; 3.3–3.4 m: −30 to −22°; 3.5 m: −30 to −20°;
  3.6–3.7 m: −30 to −18°; 3.8 m: −30 to −16°; 3.9 m: scattered between −30 and −16°.
- Near child brought forward: 1.4 m wins at −14° and +24 to +30°; 1.5 m: +26 to +30°; 1.6 m: −20°, +28 to +30°;
  1.7 m: −26 to −22°; 1.8 m: −30 to −26°; 1.9 m: −30°.
- Moving child left or the balloon alone never wins.
So every win needs the viewpoint and a depth together; there are two families of answers.

## Sound

Device grains for detents, steps, SELECT and HOLD; a breath at the blow; a wash when the last candle goes out. Six depth
voices, each noise through a narrow band (Q 7) whose centre is set by depth: chair post (0.86 m) 120 Hz, balloon and nearest
lantern 170 Hz, near child and her chair 324 Hz, table and cake 451 Hz, far children 614 Hz, wall and farthest lantern
1.7 kHz. Near is low, loud and close; far is high and quiet. Each voice is as loud as its cards pass the eye
(F·|db/dt|/z, so nearer passes faster), weighted further by nearness and levelled for its bandwidth, and panned to where its
cards are. The candles crackle through a low-pass that closes as the flames are hidden. The proof film's sound is rendered
offline by the same audio graph from the trace.

## Measured (tests/results.json, last run 2026-11-06, revision r4)

| invariant | result |
|---|---|
| Parallax ∝ 1/depth (eye moved 0.54 m; 33 measurements, including 5 pieces at moved depths) | FAIL on the strict bar, and only on floor strips. Every card with a silhouette (lanterns, children, table pieces, cake, candles, chairs, balloon) is within 0.2 px of F·Δb·(1/zc − 1/z), matched on its silhouette. The fitted constant is 307.4 px against 307.4 expected. The floor strips, matched on their faint spot texture, are up to 2.8 px off; the strip at 1.75 m is 1.35 px off against a 1.15 px tolerance, and the constant's spread is 3.2 % against a 2 % bar. This is read as measurement noise on low-texture strips, not shown to be so. |
| Occlusion order follows depth | PASS: 0 wrong of 10,535,800 pixels checked, 55 views (11 eye angles × 5 depth settings). |
| No gaps or seams | PASS: 0 uncovered pixels, 0 table-seam pixels, 0 floating-cake pixels. |
| Cut edges never seen (new) | PASS: 0 pixels of the children's lowest card bands visible, 55 views. |
| Critic's condition (new) | PASS: at 1440×900, 43 patches of 20×20 px inside the near child over the table; the largest luminance change when the table is hidden is 0.0 %. |
| Game needs viewpoint and depth | PASS: no angle wins from the start; child right at 3.6 m wins from −30° to −18°; the proof's blow sees 7 and 3 and ends kept. |
| Machine at 11.8/s after the hand | PASS: trains of 5, 17, 14, 6 steps at 12.0, 11.71, 11.82, 11.54 per second (frame-quantized). |
| View glides | PASS: 92 of 120 moving frames carry no step. |
| Depth heard as separate bands (new) | PASS: each voice rendered alone over the 1.0–2.6 s sweep. From the chair post (0.86 m) to the wall (7.3 m): −20.7, −23.3, −31.2, −35.7, −39.6, −52.0 dB RMS; zero-crossing pitch 382, 428, 683, 847, 1057, 2209 Hz. |
| Nearer voices pass faster | PASS: 71 px/s (wall) to 572 px/s (chair post). Proof audio: −16.4 dB RMS in the sweep, −32.8 dB in the still moment. |

## Files

- `index.html` the game. `operator.html` the operator page. `proof.mp4` 10 s proof film with sound (810×1440, 30 fps).
- `planes.json` every plane: depth, source, rights. `trace.json` every frame and sound event of the proof.
- `critic-round1.md` the independent critic's round 1 (from the coordinator).
- `tests/run.js` invariants (needs `python3 -m http.server 8765` at the repo root); `tests/solve.js` the game's full solution map.
- `tools/film.js` makes proof.mp4 and trace.json; `tools/shot.js` screenshots at given scale-ring steps.

## What is weak, unknown, not done

- Critic round 1 (independent, run by the coordinator): pass, with a visual-coherence gap. This revision repairs that gap at
  its causes (opaque mattes, an occluding chair instead of a fade, spot-lit materials and a common grade). It has not been
  re-judged by a critic.
- The near child still dominates the frame; her chair back is a large dark shape across the lower middle.
- The children are cards in a room seen from one height: the cake's top ellipse does not change as the eye moves (cut paper).
- The far children shift left as Ana kneels to the left of the cake. That is correct for an orbit about the cake, but it can
  read as the children moving.
- The test of painter's order uses the same drawing code as the game, so it verifies the sort by depth, not an independent
  renderer.
- Not measured: whether a person finds a solution without the scene button; mobile playtest on a real phone.
