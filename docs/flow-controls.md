# Google Flow: keep the controller, stop the drift

**Cause.** Any model that is asked to draw the scene AND the controller redraws the controller every clip (drums become ovals, panel text melts). It cannot be held by prompt or by reference alone.

**Fix.** Never let the model see or draw the controller. Generate the scene only, then put the real controller strip under it in post.

1. **Generate scene only, 16:9.** No orb, no panel, no hands in any reference or prompt. Use the orb-free references (`assets/omni/refs/`, `assets/moments/`) and the prompts in `assets/omni/prompts/`. Delete the "REFERENCES ... video N" lines if Flow takes fewer references (see below) and keep the "STRUCTURE" beats and "Hard rules".
2. **Stack.** `tools/flow/stack.sh SCENE.mp4 STRIP.(mp4|jpg) OUT.mp4 [HEIGHT]` puts the real strip (a screen recording of `weaver.html` or `pad.html`, or `assets/refs/10`/`11` as a still) under the scene. The strip is byte-identical every frame, so there is nothing to drift.
3. **Beats on the strip.** Record the strip while it plays the same six beats (`tools/flow/orb-timeline.html`), so ring moves and world changes line up at the same seconds.

## Flow UI, as I understand it (menus change; check on screen)
I cannot open flow.google.com or drive your browser from this session: it has no browser on your machine and does not reach Google. These are the controls to use yourself.
- **Mode: Ingredients to video** (reference images, up to a few, as far as I know 3), not Text to video. Add: room frame (`i1`), cake-position frame (`i2`), seating frame (`i4`). Put the beats prompt in the box.
- **First/last frame mode** if you want exact anchors: first = `i1` (empty room), last = a frame of the candles out (`i6`). Say in words which is first and last.
- **Aspect 16:9, 8 s per clip** (Flow's clip length), one beat group per clip: clip A = room + cake appears + tilts, B = writing + upright, C = children fade in, D = candle on face + candles out. Four 8 s clips is more reliable than one long take.
- **Extend / "Add to scene"** to join the clips; keep the same ingredients attached.
- Each clip prompt must say: "no device, orb, lens, controller or glowing gadget anywhere; nothing in anyone's hands".
- Download each clip, then run `stack.sh` on it.

## Update: the #film frames are the controller reference
`assets/omni/refs/ui1-3_*.jpg` and `u_ui-strip-hud.mp4` are cut from `assets/stelline-orb-film.mp4` (the #film page): world on top with the HUD, the chrome five-ring barrel and panel below. Main prompts attach them FIRST and tell the model to copy the bottom 38% of the frame exactly; this is the layout to keep. Reference budget (Omni 1.2): 6 images, 3 short videos, so the main set is 3 UI frames + 3 world frames + UI clip + 2 orb-free film clips. If the strip still drifts, use the world-only prompts (`*_scene-only.txt`) and `tools/flow/stack.sh`: that cannot drift.
In Flow: attach the three UI frames as the first ingredients, then the room and seating frames; paste the main prompt.

## Orb film without the wrapping reticle
`assets/orbfilm/orb-film-no-reticle.mp4` (nothing on the cake) and `orb-film-reticle-aside.mp4` (one pale crescent beside the cake, like the original film), 34 s, 1280x720, re-recorded by `tools/record_orb_film.mjs` from the weaver of commit 2f09823 and the same director script. The Omni UI references (`ui1-3`, `u_ui-strip-hud.mp4`) now come from the aside version; the no-reticle frames are in `assets/omni/refs/alt-no-reticle/`. The rotation gizmo ring still shows while a child is being turned (it is a control, not the reticle).

## Video references are refused (Flow / Omni): images only
Flow said video clips cannot be reference assets (only image, audio, character, avatar). So the main prompts now use six IMAGES: `ui2_walk-around.jpg` and `ui3_children-come.jpg` (screen layout + controller, from the aside-reticle orb film) and four filmstrips, `f1..f4_strip_*.jpg`, each 3-5 film frames side by side read left to right as time (cake appears, writing and upright, children fade in, candle then flames out). A filmstrip carries a whole beat in one image slot. The earlier video-ref prompts are kept as `*_with-video-refs.txt` for models that accept video.
