# Critic, round 1: multiplane

**Verdict: pass, with a visual-coherence gap.**

**Evidence**
- Parallax is real, not one flat slide. Frames 0.9 to 3.1 s (scale ring 00 to 336°): the cake holds still, the near child slides one way, the chair and balloon string slide faster, and the far children slide the other way. Planes move at different speeds by depth.
- Occlusion works and is the game. At 0.0 s the near child covers 4 of 7 candles; at 0.9 s she covers all 7 (0 of 7); by 2.6 s all 7 are revealed. The order never flipped in any frame I checked.
- Steps come at about 0.083 s intervals in trace.json (11.8/s, quantized to 30 fps). There are detents before steps, and the win at 6.87 s puts the candles out one by one.
- Naive play at 390x844 using only the device: sweeping the scale ring reaches 7 of 7 at 330° but 2 of 3 faces. The miss message names "HIDDEN: CHILD RIGHT". SELECT twice, then the knurled ring to 3.6 m gives 3 of 3. Won on try 2. The page has no scroll at 390x844 or 1440x900, and there were no console errors.

**Largest gap.** The planes do not read as one room. The near child is a semi-transparent photo card: the gray table edge shows through her hair (desktop, x 700 to 760). Under her is a dark translucent plinth with a straight horizontal cut (mobile start frame, y 690 to 1000). The table and chairs are flat gray and brown CG slabs next to film cut-outs. A viewer sees cards in a stage box, not a room they kneel inside.

Smaller gaps:
- The scale ring shows 10/20/30 while the readout says 330°.
- The "CHILD RIGHT" label is clipped at the right edge on mobile.
- At 9.5 s, after "THE BIRTHDAY IS KEPT", the counter reads 2 of 3 faces.
- The sound during viewpoint moves is one broadband wash from 0 to 18 kHz (spectrogram 0.3 to 3.3 s). It does not separate into audible depth bands.

**Falsifiable repair condition.** In a frame where the near child's card overlaps the table at 1440x900, sample a 20x20 px patch inside her hair. Its luminance must not change by more than 2% when the table plane is hidden. Her card must also show no straight horizontal edge or dark plinth below the shoulders.

**Preserve:**
- the 1/depth slide with the lens shift fixed on the cake
- per-frame painter sorting
- the miss message that names the hidden child
- the need to use both the viewpoint and a depth together
- device-only input
- hand detents, then machine steps
