#!/bin/bash
# runs probe.js over every audited page at both viewports, one at a time (the machine is shared). VIEWSEL names the scene region per page.
cd "$(dirname "$0")"
B=${BASE:-http://127.0.0.1:8731}; OUTD=${OUTD:-results2}; mkdir -p "$OUTD"
export GX=3 GY=2 BUDGET_MS=420000
export MANUAL=1
P="maker.html:maker:#room_canvas weaver.html:weaver:#room_canvas cineosis-orb/index.html:cineosis:#room_canvas ana/index.html:ana:#view_canvas stage.html:stage:#gl studio.html:studio:#webglCanvas film.html:film:#orbFilm"
for vp in "390 844" "1280 800"; do for x in $P; do IFS=: read f n s <<<"$x"; SHOT=1 VIEWSEL="${s//_/ }" timeout 600 node probe.js "$B/$f" "$n" $vp "$OUTD" 20 >> "$OUTD/run.log" 2>&1 || echo "FAIL $n $vp" >> "$OUTD/run.log"; done; done
