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

24 planes. Back wall at 9 m (a faint field of round light spots and the band of light where wall meets floor); 13 floor
strips from 9 m to 1 m, each shaded so it meets the next nearer one; far children at 3.1 and 3.25 m (film cut-outs
child 1 and child 3, `ana/cut`); the table's far top (2.78 m), the cake and its seven candles (2.6 m, the pivot), the
table's near lip and pedestal (2.36 m); the near child at 1.95 m (film cut-out child 2); a chair back (1.32 m), a balloon
and its string (1.02 m), a chair post (0.86 m). The children's cards fade to dark over their lowest third, as the memory's
light falls off, so a cut edge is never a hard line.

Rights: every plane except the three children is drawn by the page's code. The three children are frame cut-outs from
Blade Runner 2049 already in this repo (`ana/cut`), reused by relative path, not copied; they are not cleared or licensed
by this swarm. No film frames or film audio are in this folder.

## The device (ana/index.html's barrel, reused)

| part | here |
|---|---|
| SCALE RING | Where Ana kneels: 2° of yaw per detent, −30° to +30°. |
| SELECT | The piece to work on: near child, child left, child right, balloon. |
| KNURLED RING | The selected piece's depth, 5 cm per detent (near child 1.40–2.30 m, far children 2.90–4.40 m, balloon 0.90–2.20 m). |
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
a face counts the same way over an ellipse at the face. Seven and three: the candles go out one by one, and the birthday is
kept. Anything less: the memory holds again, the hidden faces are marked with the film's small arc, and she tries again.

Measured on the page (tests/run.js): from the start position no eye angle wins; with child right moved back to 4.10 m the eye
wins anywhere from −30° to −18°. So the game needs the viewpoint and a depth together.

## Sound

Device grains for detents, steps, SELECT and HOLD; a breath at the blow; a wash when the last candle goes out. Six depth
voices (wall, far children, table and cake, near child, chair and balloon, chair post): each is noise through a band-pass
tuned by depth (460 Hz for the wall to 6.1 kHz for the nearest post), panned to where its cards are, and as loud as its cards
pass the eye (F·|db/dt|/z), so near pieces rush brightly and far ones murmur. The candles crackle through a low-pass that
closes as the flames are hidden. The proof film's sound is rendered offline by the same audio graph from the trace.

## Measured (tests/results.json)

See the results file for the exact numbers of the latest run; summary at the time of writing is in the final report and on
operator.html. Tests: (1) each plane's slide between two eye positions against F·Δb·(1/zc − 1/z), measured by matching
renders of each plane alone, at the start depths and with four pieces moved; (2) painter's order against depth, pixel by
pixel, over 55 views (11 eye angles × 5 depth settings, including the balloon moved behind the near child); (3) no uncovered
pixel, no table seam, the cake never floating, same 55 views; (4) the game's solution space; (5) step trains at 11.8/s after
the hand's detents; (6) the view glides between steps; (7) voice speeds ordered by depth, and audio level in the sweep against
a still moment.

## Files

- `index.html` the game. `operator.html` the operator page. `proof.mp4` 10 s proof film with sound (810×1440, 30 fps).
- `planes.json` every plane: depth, source, rights. `trace.json` every frame and sound event of the proof.
- `tests/run.js` invariants (needs `python3 -m http.server 8765` at the repo root); `tests/solve.js` the game's full solution map.
- `tools/film.js` makes proof.mp4 and trace.json; `tools/shot.js` screenshots at given scale-ring steps.

## What is weak, unknown, not done

- No independent critic has run. This builder had no tool to start a separate agent. Verdict: inconclusive.
- The far children are small and dark; the top third of the view is empty wall. The near child dominates the frame.
- The children are cards in a room seen from one height: the cake's top ellipse does not change as the eye moves (cut paper).
- The far children shift left as Ana kneels to the left of the cake. That is correct for an orbit about the cake, but it can
  read as the children moving.
- The test of painter's order uses the same drawing code as the game, so it verifies the sort by depth, not an independent
  renderer.
- The depth-voice test checks the trace's speeds and the overall audio level, not each voice soloed in the rendered audio.
- Not measured: whether a person can find the solution without the scene button; mobile playtest on a real phone.
