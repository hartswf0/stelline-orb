#!/bin/bash
# runs probe.js over every audited page at both viewports; two lanes in parallel
cd "$(dirname "$0")"
B=${BASE:-http://127.0.0.1:8731}
lane() { for spec in "$@"; do set -- $spec; SHOT=1 timeout 900 node probe.js "$B/$1" "$2" $3 $4 results 40 >> results/run.log 2>&1 || echo "FAIL $2 $3x$4" >> results/run.log; done; }
lane "hand-orb-v5.html v5 390 844" "maker.html maker 390 844" "stage.html stage 390 844" "film.html film 390 844" "weaver.html weaver 390 844" "studio.html studio 390 844" "ana/index.html ana 390 844" "cineosis-orb/index.html cineosis 390 844" &
lane "hand-orb-v5.html v5 1280 800" "maker.html maker 1280 800" "stage.html stage 1280 800" "film.html film 1280 800" "weaver.html weaver 1280 800" "studio.html studio 1280 800" "ana/index.html ana 1280 800" "cineosis-orb/index.html cineosis 1280 800" &
wait
