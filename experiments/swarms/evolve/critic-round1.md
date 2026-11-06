# Critic, round 1 (GROWN CAKE / evolve)

**Verdict: reference stronger.** The mechanics meet the brief. The picture does not yet read as the film's party cake.

**Evidence (proof.mp4, 4 fps frames):**
- 0-2 s: a flat white disc with eight child discs around it. "BASE / GEN 1 / SHAPE 0.447" can be read. It is 3D, lit, with no faces.
- 5.5-7.4 s: the cake turns grey, then purple, then flashes white. 9.9 s: a lime-green top. 10.9 s: mustard on brown. The colour moves around a lot instead of heading toward one cake, so a viewer sees random recolouring more than convergence.
- 10.9-12 s (the DECORATION stage): no beads, piping or border show up. The finished cake is a smooth cylinder with a mustard lid, which looks like a CG puck or flowerpot. The film's cake at 146 s is cream, frosted and rough-sided.
- 12-14 s: 生日快乐 is written stroke by stroke beside the stepping arc. This is good.
- 14-16.4 s: seven candles are placed and lit. 16.4-17 s: all seven go out in under 1 s.
- Spectrogram: click trains and washes line up with the generations. A sustained tone sits under most of the clip.

**Live play (Playwright):**
- 390x844, using only the device: I made the whole cake twice (19 and 15 generations). No console errors, no page scroll.
- In my run at 70 degrees yaw the cake came out as a brown-orange bucket with a green top, and the inscription looked doubled.
- 1440x900: the layout works and there is no scroll. I could not finish it, because software GL ran at 2 fps (environment-limited).

**Largest gap:** the player's steering is not visible, and the endpoint does not look like the film's cake. HOLD breeds, then the machine picks the best child by fitness. The player only sets mutation strength and lean, so the evolution plays out like an autopilot. The fitness is silhouette plus colour histogram, and it stops at a smooth tinted cylinder with no frosting texture or beads.

**Repair condition (falsifiable):** at the end of the proof, a frame of the finished cake (candles lit, same camera framing) shows visible bead or piped-border decoration, plus a cream or white frosted top. Five viewers shown it next to film 146 s pick "same kind of cake" at least 4 of 5 times. Also, at least one generation in the proof shows the player choosing between visible children (SELECT or knurl picks a child that is not the fitness best), and the trace records that choice.

**Preserve:**
- The child-ring breeding display and the GEN/MATCH readout
- The stroke-by-stroke inscription with the arc
- The candle place/light/blow sequence
- The device with no plain buttons
- The no-scroll phone layout
- Deterministic, reproducible traces
- The removal of faces
