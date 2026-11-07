#!/bin/sh
# Lock the controller: put the REAL controller strip under a generated scene so the model never draws (or drifts) it.
# usage: stack.sh SCENE.mp4 STRIP.(mp4|jpg|png) OUT.mp4 [STRIP_HEIGHT=260]
# SCENE: whatever Flow/Omni generated, any size (scaled to 1280x720). STRIP: our recorded/rendered orb panel (a still image is looped).
S="$1"; C="$2"; O="$3"; H="${4:-260}"
case "$C" in *.jpg|*.png) LOOP="-loop 1";; *) LOOP="-stream_loop -1";; esac
ffmpeg -v error -y -i "$S" $LOOP -i "$C" -filter_complex "[0:v]scale=1280:720,setsar=1[a];[1:v]scale=1280:${H}:force_original_aspect_ratio=decrease,pad=1280:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[b];[a][b]vstack=inputs=2:shortest=1[v]" -map "[v]" -map 0:a? -c:v libx264 -crf 20 -pix_fmt yuv420p -shortest -movflags +faststart "$O"
