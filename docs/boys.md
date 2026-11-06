# The boys

Source: the orphanage flashback in "Blade Runner 2049: Recalling Another's Past" (about 2:23 to 3:07 of that clip).
`tools/boys/segment_boys.py` cuts each boy out as clips of RGBA frames (`assets/boys/<clip>.webp`, a grid of frames; `boys.json` lists them).
A boy is a face box at a start time. It is tracked forward (CSRT) and each frame is cut with a person mask: GrabCut for a boy on his own, and for a boy standing in the line-up a bust (head and shoulders) so the boys beside him fall away.

| boy | clips |
|---|---|
| the dark-haired boy at the furnace | hair_a (profile turns to camera), hair_b (close-ups in furnace light) |
| the tall bald boy | tall_a (close-up, looking off), tall_b (centre of the line-up) |
| the small boy | small_a (right of the two-shot) |
| left of the line | left_a |
| right of the line | right_a |
| at the back | dark_a |

Not yet: the boys who appear only as backs or at a distance, the running boy (143-144 s) and the hand over the fire (147-148 s, the horse being dropped). Group-shot boys are busts and still carry bits of background or neighbours.
`party.html` puts each boy at a birthday of his own, with a cake from the bench gallery.
