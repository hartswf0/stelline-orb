from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import sys
M='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'; B='/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
def card(src,out,lines):
    im=Image.open(src).convert('RGB'); im=ImageEnhance.Brightness(im).enhance(.32); d=ImageDraw.Draw(im)
    y=250
    for txt,size,bold,col in lines:
        f=ImageFont.truetype(B if bold else M,size); w=d.textlength(txt,font=f); d.text(((1280-w)/2,y),txt,font=f,fill=col); y+=size+18
    im.save(out,quality=94)
card(sys.argv[1],'title.jpg',[('THE CAKE, FROM NOTHING',44,True,(150,245,232)),('built on the memory orb: five rings, five buttons, one display',20,False,(220,226,220)),('sculpt · pipe · place · animate · weave',18,False,(140,170,165))])
card(sys.argv[2],'end.jpg',[('MEMORY WEAVER',40,True,(150,245,232)),('every control on the orb, every change shown by a reticle in the room',19,False,(220,226,220)),('hartswf0/stelline-orb  ·  weaver.html',18,False,(140,170,165))])
