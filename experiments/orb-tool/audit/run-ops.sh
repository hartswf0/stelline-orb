#!/bin/bash
# calls each page's own ops through its script handle and measures the view; one page at a time
cd "$(dirname "$0")"; B=${BASE:-http://127.0.0.1:8731}; OUTD=${OUTD:-results2}; mkdir -p "$OUTD"
for x in hand-orb-v5.html:v5 maker.html:maker weaver.html:weaver cineosis-orb/index.html:cineosis ana/index.html:ana stage.html:stage; do IFS=: read f n <<<"$x"; timeout 900 node probe-ops.js "$B/$f" "$n" 390 844 "$OUTD" >> "$OUTD/ops.log" 2>&1 || echo "FAIL $n" >> "$OUTD/ops.log"; done
