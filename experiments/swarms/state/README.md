# SCION // State Machines — Characters That Can Refuse · Her Birthday

## Thesis

In the film, Ana assembles the birthday on her device and the children perform on cue. Here the birthday girl is not a
puppet. A machine that perceives, wants and remembers chooses what she does, tick by tick, from the circumstances Ana sets
on the same device (the three rings, SELECT, HOLD). Calling her, or pushing the cake at her, makes her refuse. She comes
to the cake, and blows, only when the room is changed: dimmer, the cake brought back and lowered, the other children in and
singing, Ana kneeling, and time. The memory never names her states; her body, timing and small sounds carry them. The
machine is shown only behind the (i) and on the end card.

What would make it bland: an obedient child (the default every state machine slides back to); labels doing the acting; a
"correct sequence" puzzle where the right input triggers the approach directly.

## The game (index.html)

Ana's device from `ana/index.html`, unchanged in look and feel: drag a ring and it clicks quietly under the hand at each
detent; then the device steps to it at 11.8 clicks/s (23.6 when more than 6 steps away), with the real click grains from
`ana/device-sounds.wav`. SELECT cycles what the knurl and triangle rings drive (SELECT abandons steps not yet taken, as on
ana's device):

| selected | knurl | triangle |
|---|---|---|
| ROOM | overhead light, 0–8 | nothing (the label says so) |
| CAKE | carried toward her, 14 cm a step | height above the table, 9 cm a step |
| CHILDREN | how many are brought in, 0–3 (each arrives over 1.2 s and sings) | their time in the song, ± beats |
| HER | calling her, 0 silent … 6; each step up is a call, and Ana keeps calling while it is above 0 | nothing |

The scale ring is where Ana is: standing, stooping, kneeling, sitting; past that, kneeling and moving round toward her side.
HOLD freezes the children and their song (not her: she keeps living); a long HOLD switches the memory off and it starts again.
SCENE (left collar) plays the proof's own input through the same rings; CLEAR starts again; (i) opens the machine panel.
Layout: memory on top, device below, no page scroll; works with touch, mouse drag or the wheel.

## The machine (memory.js)

Fixed ticks of 1/30 s; deterministic (seeded gaze scheduler). The same file runs the game, the tests and the traces.

- **Perception.** Sight goes where her head points and needs her eyes up: `vis = clamp(0.5 + 0.7·cos(angle off her head)) · (1 − 0.95·headDown) · light`.
  Ana is harder to see in a dim room; lit candles are always visible. She keeps a **world model** (Ana's eye height, the cake's
  height and distance, the children) that updates only at the rate she sees. Hearing is all round and 0.1 s late: Ana's calls,
  the children's song, and **the device's own steps**: every machine step clicks where the thing it moves is, and steps within
  1.6 m of her (faster ones more) add pressure.
- **Drives.** P pressure (calls, the cake's velocity toward her when seen or within 0.6 m, nearby device steps; decays 1.4 s);
  U unease (a standing figure as she believes it, a bright room, a cake held up near her); F fear (from P, U, and M when pressed);
  M memory of being pushed (+0.14 per push, never decays within a life); C curiosity (song onset, children arriving, the room
  dimming, the cake seen lowered); T trust (grows with the invitation — kneeling as seen, singing, cake low as seen, dark, quiet —
  slowed by fear squared and by M, eaten by P); A the candles' pull (lit, low, against a dark room).
- **Utilities.** watch = 0.35 + 0.45·C·(1−F); retreat = (1.6·push + 0.3·P)(0.5+F)·room behind; refuse = 1.3·P(0.5+F) + 0.9·M·P
  (+0.15 + 0.3·F once refusing: the sulk); hide = 0.95(U−0.3) + 0.45·F(1−2P) (+0.15 + 0.25·F once hidden);
  approach = 2.2(T−0.55) + 0.5·A + 0.2·C − 2F; blow = 1.8(T−0.45) + cue + 0.4·A + 0.3·(time at the table / 6 s) − 2F,
  where cue is 1 from the beat before the song's last note ("you") to 3 beats after it.
- **Declared transitions** (`ALLOWED`): approach is reachable only from watch (she looks before she comes); blow only from
  watch or approach; blow leaves only to watch (after the window) or refuse (pressed during the inhale). Choice = highest
  utility among the current state (+0.12 hysteresis) and its declared successors whose guards pass. **Guards**: approach needs
  the cake seen low and still for 1.5 s, candles lit, F < 0.35, P < 0.15; blow needs her at the table, the cake low within
  reach, lit, quiet 1.5 s, F < 0.3. **Action windows**: minimum dwell per state (hide 2.2 s, refuse 1.6 s …), which a danger
  state may cut only when 0.25 higher; the blow is inhale 0.8 s (cuttable by pressure) + blow 1.1 s + after 1.3 s.
- **Sub-states.** refuse {turn, sulk: back turned, arms crossed, head down; glance: looks back over her shoulder when curious and
  unpressed — the only way she can see you while refusing}; hide {lower, hidden: sitting, knees up, face down, almost blind;
  peek: lifts her head, alternately toward the song and toward you}; approach {walk, slow, arrive}; blow {inhale, blow, after}.
- **Body layer.** Position changes only by walking (≤ 0.45 m/s, backing at 0.38 facing the threat); body turns ≤ 3 rad/s
  (4.2 when turning away); a seated child cannot turn or walk until she has risen (0.65 s); head leads the body (0.12 s).

The girl is a paper cut-out drawn every frame from this body layer (legs from her own travel, arms blended between rest,
crossed, round the knees, on the table, together; face shown only where her head faces Ana; a paper party hat). The other
three children are the film cut-outs already in the repo (`ana/cut`), animating only while they sing.

## Measured (test.js, 23 of 23 pass; headless node, the same memory.js)

| check | result |
|---|---|
| obedient default: 60 s of calling at 3, then 6 | 67 calls heard; never approach or blow; first refusal 1.03 s |
| calling in a good room (dim, cake low, children singing, kneeling) | never approach in 60 s; refuses at 6.8 s after tolerating the first calls |
| pushing the cake at her, 5 times | first choice retreat at 1.07 s; never approach |
| waiting only, 60 s | watch, then hide at 5.0 s; never approach |
| earned path (proof input; last input at 8.8 s) | approach 13.93 s, blow 17.13 s, 7 candles out by 18.70 s |
| impatient player: one call while she comes | approach.slow → refuse.turn at 13.43 s; she comes again at 16.7 s |
| a call during the inhale | blow.inhale → refuse.turn; 7 candles stay lit |
| perception: kneel behind her back | for 5 s vis of Ana 0.00, belief stays 1.55 m (truth 0.92); learns at +6.17 s on a peek after the song starts |
| state-conditioned choice | same utilities: from watch → approach; from hide or refuse → watch (approach not declared there) |
| 200 random runs × 80 s (device macro-actions) | all 6 states reached; 1567 transitions, 0 undeclared; 17 of 20 declared transitions taken (not by random input: approach→retreat, approach→refuse, retreat→hide; approach→refuse is taken in the impatient scenario) |
| no unintended absorbing state | 400 sampled moments, each leaves its state within 40 s under waiting, inviting or calling; 0 stuck |
| locomotion continuity | max speed 0.45 m/s, max turn 4.20 rad/s, max sit rate 1.54/s, 0 jumps |

The recorded proof, driven by real mouse pointer events on the device canvas, produced the same choices within one tick of
the headless run: retreat 1.03, refuse 1.73, hide 6.83, watch 11.03, approach 13.90, blow 17.10 (inhale on "to", blow on
"you": song beat 25.56 of 26), watch with all candles out 20.30 (`proof-trace.json`). Audio peak 0.96 before a 0.95 limit.

## Files

- `index.html` game · `memory.js` world, device, machine · `scenarios.js` scripted inputs
- `test.js` → `traces.json` (six scenarios, every transition with all utilities, guards, drives, beliefs), `coverage.json`
- `chart.js` → `state-chart.svg` · `record.js` → `proof.mp4`, `mobile-playtest.mp4`, `proof-trace.json`, `mobile-trace.json`
- `operator.html` phone-readable operator page

Remake: `python3 -m http.server 8765` at the repo root; `node test.js && node chart.js`;
`node record.js proof /tmp/f && ffmpeg -framerate 30 -i /tmp/f/%05d.jpg -i /tmp/f/audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest proof.mp4`
(same with `mobile` → `mobile-playtest.mp4`). Frames are captured on a virtual clock (`?rec=1`), the sound is the page's
event log rendered offline through the same synthesis code.

## Sources and rights

Reused from this repo: `ana/assets/three.min.js`, the Oswald fonts, `ana/device-sounds.wav` (device click grains), the
three child cut-outs `ana/cut/film-child-{1,2,3}-blow.webp`, the device drawing code from `ana/index.html`. Nothing from
`memory.mp4` is used or committed (one contact sheet was looked at, outside the repo). The girl, the room, the cake, the
voices and the song are drawn or synthesized here; the "Happy Birthday" melody is public domain.

## What is weak, unknown, not done

- **No independent critic.** This builder had no tool to start a separate agent, so no critic has watched the proof or played
  the page. Verdict: not run. That is the next blocking step.
- **No human playtests.** The phone recording is scripted touch input, not a person.
- The pushed cake is held 54 cm up and from Ana's standing eye reads as floating far off, not coming at her (perceptually
  judged by the builder on frames, not by a critic).
- At phone size she is ~150 px tall; her face is a few pixels, so refusal and peeking read through posture, not expression.
- She is a flat cut-out; the turnaround (front, profile, back) is drawn, not modelled, and reads stiff while turning.
- Voices are formant-synthesized hums: "come here", "mm-mm", the song's vowels; they read as prosody, not words.
- Retreat lasts 0.7 s before she turns away: a flinch more than a backing off.
- Tuning was by hand against scripted scenarios (no search); timings could be tuned to feel, which is unknown until people play.
