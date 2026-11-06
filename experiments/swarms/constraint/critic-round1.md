VERDICT: PASS (with one believability gap)

EVIDENCE
- Film 2.37 s: SELECT chirp (12 kHz dashes in spectrogram) then "OUT OF REACH 28 MM" at 2.5 s; hand stops at full reach, gap to the pen visible. 4.0 s: same, 88 mm, dashed line from taper to pen crosshair. No teleport.
- 5.07 s pen satisfied, 6.30 / 7.27 / 9.00 s candles lit; each lit event lines up with a broadband wash in the spectrogram. Step clicks fill 0.4-2.3 s and 4.7-6.2 s while the body moves; silence while idle.
- Feet stay on the pinned floor marks in every frame; solver trace hard residual max 2e-8 m, per-step point move max 3.4 cm.
- Playwright, 390x844 and 1280x800: view top, device below, scrollHeight = innerHeight, no console errors. Playing only with ring detents and SELECT (slide the cake toward her, turn a candle into her plane, walk the pen to the wick), I lit all 7 in 142 steps; HOLD then blew them out. Pushing the pen 31 cm out gave UNSOLVABLE, "OUT OF REACH 170 MM", binding ARM AT FULL LENGTH + BALANCE AT TOES, hand held at the edge of reach.

LARGEST GAP
The elbow does not bend believably. When a candle is reachable the arm still locks straight (elbow_deg 180, tier 1 solved, at the end of my run; lit_end pose is a rigid horizontal arm). In the 2.0-5.0 s lean, the dress is a skewed quad folding at the waist under an upright photo-cutout head, so she reads as a folding mannequin. Smaller items: on phone the girl sits against the left edge and the lower ~40% of the view is empty floor; the info panel says "waist lean (limit 75)" while solver LEAN_MAX is 50; most of the film's steps run at the fast 23.6/s ratchet, not 11.8/s.

REPAIR CONDITION (falsifiable)
In a scripted player run that lights all 7 candles, the elbow angle logged at every 'lit' event is between 100 and 165 degrees, and elbow_deg = 180 appears only in steps whose tier is 2 (unsolvable).

PRESERVE
The device as the only controller with detent then machine-step timing; the tier-2 bisection that freezes the hand at full reach with a visible dashed gap and a millimetre readout; candles turning with the cake and needing to be brought into her plane; the purposeful sound map (detent, step, select chirp, lit wash, strain); the no-scroll phone layout and plain labels.
