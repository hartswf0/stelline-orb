#!/bin/bash
# One encoded file per scene, same size/rate/settings, captions burnt in; stills for title and end; joined with concat -c copy.
set -e
cd /home/claude/stelline-work/film/weave
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf; FONTB=/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf
ENC="-c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -r 30"
declare -A CAP=(
 [A]="1  SPAWN    tool ring to SPAWN, base ring to TIERS, thumb puts it on the table"
 [B]="2  SCULPT   pull a waist all the way round, smooth it, paint a band"
 [C]="3  PIPE     beaded borders on both tiers, then red writing on top"
 [D]="4  PLACE    seven candles, ten berries, a scatter of sprinkles"
 [S]="5  STAGE    lift and tilt the cake, bring in the children, pull focus"
 [E]="6  ANIMATE  capture frames, turn each one, play them tweened"
 [F]="7  WEAVE    materialize the memory from light, scale it, raise the haze")
for k in A B C D S E F; do
  n=$(ls s$k/*.jpg | wc -l); dur=$(python3 -c "print($n/30)")
  ffmpeg -y -loglevel error -framerate 30 -i s$k/%05d.jpg -vf "drawbox=x=0:y=0:w=iw:h=34:color=black@0.55:t=fill:enable='between(t,0.2,$dur-0.3)',drawtext=fontfile=$FONT:text='${CAP[$k]}':x=16:y=10:fontsize=17:fontcolor=0x9ff5ea:alpha='if(lt(t,0.2),0,if(lt(t,0.6),(t-0.2)/0.4,if(gt(t,$dur-0.7),max(0,($dur-0.3-t)/0.4),1)))'" $ENC tmp_$k.mp4 && mv tmp_$k.mp4 scene_$k.mp4
done
# stills
ffmpeg -y -loglevel error -framerate 30 -i title.jpg -vf "format=yuv420p,loop=-1:1,trim=duration=3.5,fade=t=in:st=0:d=0.6,fade=t=out:st=3.0:d=0.5" $ENC tmp_T.mp4 && mv tmp_T.mp4 scene_0.mp4
ffmpeg -y -loglevel error -framerate 30 -i end.jpg -vf "format=yuv420p,loop=-1:1,trim=duration=4,fade=t=in:st=0:d=0.5,fade=t=out:st=3.4:d=0.6" $ENC tmp_Z.mp4 && mv tmp_Z.mp4 scene_Z.mp4
printf "file 'scene_0.mp4'\nfile 'scene_A.mp4'\nfile 'scene_B.mp4'\nfile 'scene_C.mp4'\nfile 'scene_D.mp4'\nfile 'scene_S.mp4'\nfile 'scene_E.mp4'\nfile 'scene_F.mp4'\nfile 'scene_Z.mp4'\n" > list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -c copy tmp_all.mp4 && mv tmp_all.mp4 memory-weaver-cake.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 memory-weaver-cake.mp4
