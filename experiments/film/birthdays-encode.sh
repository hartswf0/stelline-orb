#!/bin/bash
# Cuts the birthdays film: her walk to work (real), the orb take, the children arriving (real), the rest of the take; then lays each mix.
set -e; W=/home/claude/stelline-work/film2; M=$W/../film/memory.mp4; cd $W
ENC="-c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -r 30 -an"
N=$(ls f | wc -l)
ffmpeg -loglevel error -y -ss 128 -t 9 -i $M -vf "scale=1280:720,fps=30,format=yuv420p" $ENC s1.tmp.mp4 && mv s1.tmp.mp4 s1.mp4
ffmpeg -loglevel error -y -framerate 30 -start_number 0 -i f/%05d.jpg -frames:v 900 -vf "fade=in:st=0:d=.4" $ENC s2.tmp.mp4 && mv s2.tmp.mp4 s2.mp4
ffmpeg -loglevel error -y -ss 152 -t 4 -i $M -vf "scale=1280:720,fps=30,format=yuv420p,fade=in:st=0:d=.3,fade=out:st=3.7:d=.3" $ENC s3.tmp.mp4 && mv s3.tmp.mp4 s3.mp4
R=$(( N - 900 )); ffmpeg -loglevel error -y -framerate 30 -start_number 900 -i f/%05d.jpg -frames:v $R -vf "fade=in:st=0:d=.3,fade=out:st=$(python3 -c "print($R/30-2.5)"):d=2.5" $ENC s4.tmp.mp4 && mv s4.tmp.mp4 s4.mp4
printf "file s1.mp4\nfile s2.mp4\nfile s3.mp4\nfile s4.mp4\n" > cat.txt; ffmpeg -loglevel error -y -f concat -safe 0 -i cat.txt -c copy video.mp4
for m in voice memory machine; do ffmpeg -loglevel error -y -i video.mp4 -i mix-$m.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 224k -shortest birthdays-$m.mp4; done
ls -la birthdays-*.mp4
