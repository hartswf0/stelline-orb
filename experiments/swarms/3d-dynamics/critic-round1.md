# Critic round 1 · 3d-dynamics

**Verdict: reference stronger.** The game runs and the technique works on paper, but on screen most of the secondary motion can't be seen.

**What works (frames and times from proof.mp4):**
- The whole cake is made in 3D, on screen. Layers come down at 0.5-3.5 s, the icing pours and runs at 4-6 s, then the beads, then 生日快乐 stroke by stroke at 8-11 s. The candles go in at 12-20 s, the candles are lit at 21-23 s, and she blows them out one by one at 25-26 s.
- The device drives every step. Sound follows the events: thumps at the layer landings, pour noise at 4-5.4 s, breath at 25.5-26.5 s.
- I played it on the device at 390x844 and at 1280x800, on a fixed clock with real pointer and wheel input. A careful run reached MATCH 100, and the blow put all seven out. There were no console errors and no page scroll.
- In the careless run, a tilt flick knocked down candle 1. The game kept that consequence: with only 6 of 7 lit, HOLD would not trigger the blow.
- Limit: live headless WebGL ran at only 1.3-2.7 fps, so I could not judge real-time feel.

**Largest gap: the secondary motion can't be read at viewing scale.**
- At 1.8-2.0 s and 3.0-3.1 s, the layer lands and the white magnesium flash fires in the same frames. The flash hides the landing and settle that the technique is about.
- Candle falls show only as text. In the proof at 18.4-18.9 s, and in my careless screenshots c-08 and c-09, no candle lying on the cake is visible; the label "1 FALLEN" is the only evidence.
- The flick moved the tilt readout to only 0.2 deg.

**Second gap: it doesn't look like the memory.**
- In the film (141-148 s) the cake floats in a dark room. Here a large ochre table plane fills the lower view, and it blooms bright orange when the candles are lit (proof 22-28 s, m-11).
- The cake also stands on a stand with a jagged paper crown and red and olive streamers, which the film's cake does not have.
- On mobile, the hologram arc is cut off at the right edge.
- The proof spends 12-20.5 s in the three-way split view, which cuts the cake down to a third of the frame.

**Repair condition (falsifiable):** in a careless run at 390x844, after the flick:
- the tilt readout peaks at 6 deg or more;
- the fallen candle stays visible lying on the cake, at least 20 px long in a crop compared against the pre-flick frame;
- in proof.mp4, no flash frame falls within 0.3 s after a layer lands.

**Unverified:** two lit, at-rest screenshots taken 1 s apart were not identical. The README claims bit-identical rest; I did not isolate the cause (flame flicker or the memory spots).

**Keep:**
- the order of making;
- consequences that persist (a fallen candle blocks the blow);
- the stroke-by-stroke inscription;
- the one-by-one blow;
- the device as the only input;
- sounds tied to events;
- the mobile layout (view on top, device below).
