# THE BLOW: critic, round 2 (A dense vs B sparse)

**Verdict: pass. B earns promotion over A.** I measured the repair condition myself and B meets it. A does not.

**Evidence**
- **Plate and neck** (my node solve, cheeks 100 %, purse 60 %, scene px):
  - A moves the plate 0.05-0.08 px and the neck 0.08-0.12 px.
  - B moves the plate 0.00 px and the neck 0.01-0.03 px.
  - In fork.mp4 at 3.2 s (f95) the plate border stays straight in both branches. In round 1 it bowed.
- **Family difference** (largest gap between two families over the cheek region):
  - B: 7.14 px at (240, 282) and 5.71 px on the outer cheek band at (376, 330), affine vs similarity. Pass.
  - A: 0.95 px. Fail.
  - fork-strip row 2 shows it. Similarity swells round, while affine and rigid crease at the upper outer cheek.
- **No collapse in B's chosen family** (similarity):
  - 0 folds, minimum area ratio 0.30.
  - Eye-region area ratio 0.998, nose 0.95. Eye spacing is 92.0 px, the same as at rest.
  - Affine and rigid fold 12 triangles at about (180-190, 270), at full cheeks only. That is visible if a player picks them, and it gives the family choice a visible consequence.
- **Played at 390x844 with the device only:**
  - B, unshaped breath (cheeks 100, purse 0, aim 0): 5 of 7 out.
  - B, shaped breath (purse 60, aim +8): all seven out in one breath.
  - A, the same shaped breath: 6 of 7 out.
  - My sweep found B's one-breath win only at aim +8, and only with purse in the middle range. A win needs a shaped breath.
  - Both pages: no page scroll, no emoji, no console errors.
- **Proof (B):** two breaths, outs at 3.93-3.97 s and 7.07 s. No steps share a frame or come faster than 11.8/s. That is fixed since round 1. Idle face difference is 0.00-0.01 per frame.

**Largest remaining gap:** the cheek fill leaves eddies in the engraving under alpha 3. Concentric whorls sit at the cheek handles (proof.mp4 f90, f104). B's open mouth reads as a ragged diamond rather than an O.

**Smaller gaps:**
- B's response to aim is not monotonic. With purse at 0: aim 0 puts out 5, aim +8 puts out 3, aim +16 puts out 5.
- strip.png is stale. It still shows the dense face labelled alpha 1.
- At about 4 fps in this sandbox's software GL, a long SELECT needs about 3 s.

**Repair condition:** at cheeks 100 % and purse 60 % in similarity, no engraving line inside the cheek discs turns by more than 25° from its rest direction.

**Preserve:**
- The pinned plate.
- Alpha 3 with the sparse cheek pairs.
- The breath read off the mesh.
- The narrow, shaped win.
- The flame tear.
- The 11.8/s machine.
- The phone layout.
