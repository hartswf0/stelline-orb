# MLS / THE BLOW: critic, round 1

**Verdict: inconclusive, leaning pass.** The game works and the flames are convincing. The face, which the brief centres on, does not yet show its own family choice, and the cheek fill is not local.

**Evidence**
- Flames: in proof.mp4 frames 128-160 (4.27-5.33 s) the flames bend progressively. Five go out at 4.93-5.00 s, matching the 'out' events and the noise burst in the spectrogram. At rest the face panel changes by 0.00-0.01 mean abs diff per frame, so there is no idle wobble. During the blow the change is about 3 every 2-3 frames, which is the stepping, not jitter. No fold-overs are visible.
- At 9.0 s (f265-295), YOURS has all seven out in two breaths. The all-affine world still has one burning. That is the only place a family choice is visible in the film.
- Game, tested at 390x844 and desktop:
  - Page scroll is 0 and there are no emoji. The view (557 px) sits above the device (287 px).
  - There were no console errors, only software-WebGL warnings, including "GPU stall due to ReadPixels".
  - Lose: cheeks at 20% put out none. Cheeks at 100% with purse at 0 put out 3 of 7.
  - Win: cheeks at 100%, purse at 70% and aim 0 put out all seven in one breath on the first try. Maxing both rings is enough to win.
  - A long SELECT changes the family, but only after about 3 s of wall time at 4 fps, because the long press is timed on the game clock.

**Largest gap:** filling the cheeks bends the whole plate, not the cheeks. With cheeks at 100% (phone-shaped and phone2-rigidface screenshots, and desk-shaped), the printed plate border bows, its top-left corner bends, and the neck lines and hair outline swell. The README says there are 11 anchors on the plate edge. The cheeks themselves barely read as fuller.

The strip shows the same thing: the three families on the face (row 1) are almost indistinguishable. The README puts the difference at 10-20%.

**Other gaps:**
- The machine steps at 23.6/s in its fast mode. The proof also shows two steps in one frame at 0.50, 2.47, 3.60, 3.77, 6.00 and 6.17 s, against the required 11.8/s.
- The smallest flame triangle has an area ratio of 0.000.
- Frame times were 100-250 ms under software GL, so responsiveness could not be judged here.

**Repair condition (falsifiable):** with cheeks at 100% and purse at 60%, the plate border and the neck move 1 px or less in the chosen family. In the same state, the outer contour of the cheeks differs by at least 4 px between at least two of the three face families, at the same place, in the strip.

**Preserve:**
- The breath is read off the deformed mesh.
- The four-up COMPARE view.
- The progressive bend and out of the flames, and the smoke.
- The rigid streamer, whose type does not stretch.
- The no-scroll device layout and its plain labels.
- The quiet contour at rest.
