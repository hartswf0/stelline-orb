"""Looks: one grade for everything in a cut, so a synthetic plate and its coded twin stop looking like two sources.

Each look is an ffmpeg filter chain over the 1280 x 576 picture only (captions in the bars are never graded).
They are imitations made from general knowledge of the two media, not measured from a reference print or tape:

  panavision70   1970s anamorphic colour negative, printed: lifted warm blacks, dense amber highlights that never reach white, a little
                 less saturation, red halation round candle flames, soft horizontal smear, fine moving grain, corner fall-off.
  camcorder90    1990s consumer tape: half the resolution, colour smeared and shifted sideways off the luma, edge-sharpening halos,
                 raised saturation with a cool cast, crushed highlights, scan lines and coarse chroma noise.
"""
LOOKS = {
    'clean': None,
    'panavision70': ("format=rgb24,curves=r='0/0.045 0.25/0.26 0.6/0.66 1/0.965':g='0/0.035 0.25/0.235 0.6/0.61 1/0.93':b='0/0.03 0.25/0.2 0.6/0.52 1/0.83',eq=saturation=0.86:contrast=0.96,"
                     "split[pa][pb];[pb]curves=all='0/0 0.72/0 0.9/0.7 1/1',gblur=sigma=16,colorchannelmixer=rr=1:gg=0.38:bb=0.12,format=gbrp[ph];[pa]format=gbrp[pc];[pc][ph]blend=all_mode=screen:all_opacity=0.55,"      # blended as RGB planes: in YUV a screen blend shifts the chroma
                     "gblur=sigma=1.1:sigmaV=0.35,noise=alls=9:allf=t+u,vignette=angle=PI/4.6,format=yuv420p"),
    'camcorder90': ("scale=640:288:flags=bilinear,format=yuv444p,boxblur=luma_radius=0:luma_power=1:chroma_radius=5:chroma_power=2,chromashift=cbh=4:crh=-3,unsharp=5:5:1.6:5:5:0,"
                    "eq=saturation=1.32:contrast=1.1:brightness=0.025:gamma_b=1.07:gamma_r=0.96,curves=all='0/0.02 0.8/0.9 1/0.95',noise=c0s=7:c1s=16:c2s=16:allf=t,"
                    "scale=1280:576:flags=bilinear,drawgrid=w=iw:h=4:t=1:c=black@0.16,format=yuv420p"),
}
def graph(look, py=72, ph=576):
    """A filter graph taking [0:v] (the whole 16:9 frame) to [v] with only the picture graded."""
    chain = LOOKS.get(look)
    return '[0:v]null[v]' if not chain else f'[0:v]split[fa][fb];[fb]crop=iw:{ph}:0:{py},{chain}[fp];[fa][fp]overlay=0:{py}[v]'
