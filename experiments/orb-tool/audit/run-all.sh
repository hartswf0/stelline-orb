#!/bin/bash
# runs probe.js over every audited page at both viewports; two lanes in parallel. VIEWSEL names the scene region per page.
cd "$(dirname "$0")"
B=${BASE:-http://127.0.0.1:8731}; OUTD=${OUTD:-results2}; mkdir -p "$OUTD"
lane() { for spec in "$@"; do set -- $spec; SHOT=1 VIEWSEL="$5 $6" timeout 900 node probe.js "$B/$1" "$2" $3 $4 "$OUTD" 40 >> "$OUTD/run.log" 2>&1 || echo "FAIL $2 $3x$4" >> "$OUTD/run.log"; done; }
P="hand-orb-v5.html:v5:#scene maker.html:maker:#room_canvas stage.html:stage:#gl film.html:film:#orbFilm weaver.html:weaver:#room_canvas studio.html:studio:#webglCanvas ana/index.html:ana:#view_canvas cineosis-orb/index.html:cineosis:#room_canvas"
specs() { for x in $P; do IFS=: read f n s <<<"$x"; echo "$f $n $1 $2 ${s//_/ }"; done; }
mapfile -t A < <(specs 390 844); mapfile -t Bv < <(specs 1280 800)
lane "${A[@]}" & lane "${Bv[@]}" & wait
