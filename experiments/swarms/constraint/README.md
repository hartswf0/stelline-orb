# SCION // IVAN SUTHERLAND · Constraint Sketchpad · the birthday, as a game on the memory maker's device

## Thesis

You never place her body. You move the light pen the taper's flame is held by, and the cake, and the solver moves
everything else: her waist leans, her knees give, her elbow opens, her far arm hangs, her feet stay where they are and she
does not fall over. When you ask for more than her body can give, she stops at the edge of her reach and the gap stays on
screen. The game is to light the seven candles with the taper she holds, then press HOLD and she blows them out.

What would make it bland: a figure dragged by the wrist with a rubber-band IK chain; a hand that snaps to the candle when
it cannot reach it; a free-form editor with handles and buttons instead of the device.

## The controller is the memory maker's device

The device canvas from `ana/index.html` (rings, collars, SELECT, HOLD, SCENE, CLEAR, info) is reused nearly unchanged.

| control | HAND selected | CAKE selected |
|---|---|---|
| knurled ring | the pen along the table (1.5 cm a detent) | slide the cake along the table (1.5 cm a detent, clamped to the top) |
| triangle ring | the pen up and down (1.5 cm a detent) | turn the cake (5 degrees a detent); the candles go round with it |
| scale ring | where you kneel: view yaw, 5 degrees a detent, within plus or minus 35 degrees | same |
| SELECT | switches HAND / CAKE | |
| HOLD | short press: blow, once all seven are lit (refused with a dull click before); long press: memory off | |

Each detent the hand passes is a quiet click. The machine then steps every busy channel one detent at a time at 11.8
steps/s (23.6 only when more than 15 detents behind), one device click per step, and re-solves her body after every step. A candle
lights when the taper's flame comes within 1.5 cm of its wick in 3D, which needs the cake turned so that candle lies in her
plane (a dashed line across the cake top shows that plane while the cake is selected).

## Primitives (solver.js)

- **Points and lines.** 13 points in her plane (ankles, knees, hip, chest/shoulder, neck, head, near elbow, wrist, taper
  flame, far elbow, far wrist), 12 bones with fixed lengths (the last near bone is hand plus taper, 0.15 m).
- **Hard constraints.** Bone lengths; ankles pinned (supported-on floor); knees in front of the ankle-hip line, elbows
  below/behind the shoulder-wrist line (one bend each); elbow closing limit; wrist bend at most about 55 degrees; knee bend limit; waist lean at most 50 degrees;
  contact (no point inside the table or cake); balance: centre of mass between heel and toe (aligned-with).
- **Soft constraints.** The taper flame held-by the light pen; weak upright waist; shoulder 0.47 m from the flame (comfort, keeps the elbow bent); hand in line with the forearm; neck and head halfway to upright; far arm hangs; knees nearly
  straight.
- **Solver.** Sutherland-style relaxation (position projection, Gauss-Seidel). Tier 1: the pen joins the hard set and
  everything is solved around it; accepted if every hard residual falls below 1e-6 m, then refined. Tier 2 (only if tier 1
  cannot converge): bisection, 12 halvings, along the line from where the flame is toward the pen, each candidate solved by
  tier 1; the hand stops at the last point the body can reach. The residual and the limits that bind (ARM AT FULL LENGTH,
  BALANCE AT TOES, WAIST AT LIMIT, TOUCHING CAKE OR TABLE) are reported.
- **Relations as data** (`relations()`): supported-on (table/floor, cake/table, ankles/floor), attached-to (each candle to the
  cake), held-by (taper by hand; flame by light pen), aligned-with (centre of mass with feet; arc with candle height; any
  candle with her reach plane), behind (derived each frame from view depth; `stageOrder()` sorts the draw order from them, so
  turning the view re-stages candles in front of or behind her arm).
- **Scene.** The 2D figure is a cut-out: vector limbs and dress, with the head taken from one archive frame of
  `ana/cut/film-child-2-blow.webp` (already in the repo). Cake, candles, 生日快乐 on the top, hex table, dome band, the
  segmented arc beside the cake at candle height whose mark steps with the machine (top: met; bottom, amber: cannot be met).
- **Sound.** Grains of `ana/device-sounds.wav` (the device's real clicks): quiet detent clicks under the hand, one click per
  machine step, a lighter tick when a constraint is met (pen reached, or a candle lit, with a short wash), a low comb grain
  when the goal becomes unreachable, the select chirp, a wash for the blow.

## Measured (revision 2, after critic round 1; `solver-trace.json`, the whole scripted birthday, 224 machine steps)

| event | time in birthday.mp4 (s) |
|---|---|
| reach goes past what she can do: UNSOLVABLE (ARM AT FULL LENGTH, BALANCE AT TOES, WAIST AT LIMIT) | 2.77 |
| cake slid toward her and turned; the pen is reachable again (tick) | 8.03 |
| candles lit, in order 0, 6, 4, 2 (cake turned under the held taper), then 1, 5, 3 | 10.23, 11.47, 13.67, 15.77, 18.03, 21.07, 23.17 |
| HOLD: she blows them out, all seven out | 26.4 to 27.23 |

Worst hard residual over every step: 2e-8 m. Largest pen-to-flame residual while unreachable: 48 mm (drawn as the amber
dimension line). Largest movement of any body point in one step: 3.5 cm. Elbow at the seven lit events: 112.6 to 114.2
degrees. No tier-1 (reachable) step has a straight elbow; the largest tier-1 elbow is 166.6 degrees, at the edge of reach.
All 224 steps ran at 11.8/s (23.6/s now only when a ring is more than 15 detents ahead).

Unit tests (`node tests.js`, 25 passed, 0 failed; tolerances declared at the top of the file), including the critic's
repair condition: elbow at every lit event in 100 to 165 degrees, a straight elbow only at tier 2, and 11.8/s dominating.
Also: hard set over a 252-point pen sweep (137 met, 115 unreachable); unreachable pen reported with a residual, a named limit,
the hand pointing toward it; a 1 mm pen change moves no point more than 1.11 mm; candles attached to 4e-17 m; cake stays on
the top; HOLD refused before seven are lit; deterministic trace; draw order honours all 21 behind relations.

## Invariants (protected)

1. Ankles never move (pinned; tested to 1e-9 m).
2. Bone lengths within 1e-4 m at every displayed step (measured 2e-8 m).
3. Elbows and knees bend one way only; no flip (side residual 0 at every step).
4. Centre of mass between heel and toe.
5. No teleporting: the pen and the cake move one detent per machine step; no body point more than 5 cm per step.
6. An unreachable pen is never met by cheating: the hand stops at the edge, the residual is drawn and read out.
7. Candles stay attached-to the cake; the cake stays supported-on the table.

## What failed and what changed

- Plain relaxation with the pen as a soft pull left the flame 1.7 to 2 cm short of every candle (the hard pass pulled it back),
  so every candle read as unreachable. Changed to the two-tier solve (pen as hard constraint first).
- Tier 1 never converged at first: the arm's rest pull was still applied while the flame was pinned. Fixed at the cause.
- The first tier 2 (soft pull then hard pass) jumped 8 cm in one step at the reach boundary, a hidden teleport. Replaced by
  bisection toward the pen, which is continuous with the last met pose (max step move now 3.4 cm).
- With a 0.15 m taper she could reach 80 cm across the table at a 56 degree lean; moved her back 8 cm and capped the waist at
  50 degrees so far candles are honestly out of reach until the cake is brought closer.
- Her head rode the leaning spine (read as a broken neck); added an upright pull on the neck.
- The first design was a free editor with drag handles and buttons. The coordinator relayed the user's direction that it must
  be a game played on the memory maker's device; rebuilt on ana's rings, SELECT and HOLD.
- Rendering: the skirt drew as a bowtie (crossed hem normals) and the cake side vanished (front half chosen by index, not by
  angle). Both fixed.

## Independent critic

Round 1 was run by the coordinator (this builder had no tool to spawn agents); the report is `critic-round1.md`.
**Verdict: PASS**, with one believability gap: "The elbow does not bend believably. When a candle is reachable the arm still
locks straight (elbow_deg 180, tier 1 solved) ... she reads as a folding mannequin." Also: on the phone she sat against the
left edge with ~40% empty floor; the info panel said lean limit 75 while the solver used 50; most steps ran at 23.6/s.
Repair condition: in a scripted run that lights all 7 candles, the elbow at every lit event is 100 to 165 degrees and 180
appears only at tier 2. Preserve: the device as the only controller, the tier-2 stop with the visible gap and millimetre
readout, candles brought into her plane by turning the cake, the sound map, the no-scroll phone layout.

Repair (revision 2), at the cause:
- Cause: nothing in the solver preferred a bent elbow, and the wrist was an unconstrained joint, so the solver either locked
  the elbow or folded the hand at the wrist. Added a comfort term (the shoulder prefers 0.47 m from the flame, so the waist
  and knees carry the reach), a soft preference for the hand in line with the forearm, and a hard wrist limit (about 55
  degrees); she also stands 4 cm closer. Measured result above: lit elbows 113 to 114 degrees.
- The neck and head now follow the spine halfway to upright instead of staying vertical; the skirt hangs between the thighs
  and straight down instead of folding along the thighs.
- Phone framing: a larger scale and the stage centred vertically on narrow screens.
- Info panel reads the solver's own lean limit (50).
- Fast stepping only beyond 15 detents behind; the script turns at about 14 detents a second.
- The scripted run now lights all seven and ends with the blow: `birthday.mp4` (29 s). `proof.mp4` is its 0.6 to 10.6 s
  window (reach, out of reach, cake brought in, first candle lit at 9.6 s of the clip).
- Round 2 of the critic has not been run.

## What is weak, unknown, not done

- The figure is small in a 1280 x 720 frame (about 380 px tall) and the cake smaller; the candle lightings are small.
- At the 50 degree lean the paper cut-out reads stiff: the dress is one polygon, the neck bends visibly, and she does not
  bend her far arm or shift weight in a way a child would.
- The reach is solved in her plane only; her hand cannot move in depth, so the game makes you turn the cake instead. That is
  a rule of this world, stated, not physics.
- The arm can pass through lit candles' flames and through candles; candles are not obstacles.
- Sound: the mix peaks at 0.84; levels are not measured against the film.
- The blow is not in the 10 s proof; it is in birthday.mp4 (29 s).
- At the lit events she leans back a few degrees (lean -4) because the comfort term pushes the shoulder away when the wick is close.
- Film reference clip (`memory.mp4`) was not inspected; forensic facts were taken from the brief. Not tested on a phone.

## Files

`index.html` (the game), `solver.js` (scene, relations, solver, game), `proof-script.js` (the proof as ring turns),
`tests.js`, `solver-trace.json`, `render.js` + `mix.js` (film: Playwright at a fixed 30 fps clock, grains mixed at the
logged times, ffmpeg), `proof.mp4`, `birthday.mp4`, `critic-round1.md`, `operator.html`. Rerun: from the repo root, `python3 -m http.server 8731` then
`node experiments/swarms/constraint/render.js`.
