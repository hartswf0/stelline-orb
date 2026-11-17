"""Train the cup reader: a small network that looks at an unwrapped patch of the cup's label (what CUP.detect makes)
and says which angle of the cup faces the camera and whether the patch is lid-up or base-up.

Every training picture is made here from the label's own drawing (CUP.paintLabel, exported in several fonts): a random
turn, then the faults a real unwrap has (wrong scale, bowed rows, fanned columns, blur, glare, uneven light, things in
the way). No photograph is used for training; the photographs are only looked at to report how it does on them.

  python3 train.py TEXDIR OUT [minutes] [REALDIR]
"""
import sys, glob, json, math, time, os
import numpy as np, torch, torch.nn as nn, torch.nn.functional as F
from PIL import Image
torch.set_num_threads(4); torch.manual_seed(0)
W, H, NB = 296, 192, 120                                   # patch size; angle bins of 3 degrees
texdir, out = sys.argv[1], sys.argv[2]; minutes = float(sys.argv[3]) if len(sys.argv) > 3 else 30; realdir = sys.argv[4] if len(sys.argv) > 4 else None
TEX = []
for p in sorted(glob.glob(texdir + '/tex*.png')):
    t = torch.from_numpy(np.asarray(Image.open(p).convert('L').resize((1440, 384), Image.LANCZOS), dtype=np.float32) / 255)
    TEX.append(torch.cat([t, t[:, :4]], 1)[None, None])    # wrap round
print('textures', len(TEX), flush=True)

def gen(B):
    xn = torch.linspace(-1, 1, W)[None, None, :].expand(B, H, W); yn = torch.linspace(-1, 1, H)[None, :, None].expand(B, H, W)
    r = lambda a, b: (torch.rand(B, 1, 1) * (b - a) + a)
    face = torch.rand(B) * 360 - 180
    k = r(.55, 1.0); c3 = r(-.12, .12); key = r(-.3, .3); sh = r(-4, 4)
    ang = face[:, None, None] + sh * 0 + 74 * k * (xn + c3 * (xn ** 3 - xn)) * (1 + key * yn)
    y = .5 + .5 * yn * r(.92, 1.12) + r(-.04, .04) + r(-.18, .18) * (xn ** 2 - .33) + r(-.05, .05) * xn + r(-.14, .14) * xn ** 2 * yn
    u = torch.remainder(ang, 360) / 360
    gx = (u * 1440 + .5) / 1444 * 2 - 1; gy = y * 2 - 1
    img = torch.empty(B, 1, H, W); ti = torch.randint(0, len(TEX), (B,))
    for t in range(len(TEX)):
        m = ti == t
        if m.any(): img[m] = F.grid_sample(TEX[t].expand(int(m.sum()), -1, -1, -1), torch.stack([gx[m], gy[m]], -1), mode='bilinear', padding_mode='border', align_corners=False)
    body = r(.15, .6); outside = ((y < 0) | (y > 1))[:, None]; img = torch.where(outside, body[:, None].expand(-1, 1, H, W), img)
    # contrast of the print, light across the patch, glare
    img = 1 - (1 - img) * r(.45, 1.0)[:, None]
    img = img * (r(.5, 1.0)[:, None] + r(-.3, .3)[:, None] * xn[:, None] + r(-.2, .2)[:, None] * yn[:, None] - r(0, .35)[:, None] * xn[:, None] ** 2)
    gl = torch.exp(-((xn - r(-1.5, 1.5)) / r(.03, .15)) ** 2)[:, None] * r(0, .5)[:, None] * (torch.rand(B, 1, 1, 1) < .4); img = img + gl
    # things in the way: soft dark or mid ellipses
    for _ in range(2):
        on = (torch.rand(B, 1, 1) < .35).float(); d = ((xn - r(-1, 1)) / r(.08, .5)) ** 2 + ((yn - r(-1, 1)) / r(.15, .9)) ** 2; a = torch.sigmoid((1 - d) * 8) * on
        img = img * (1 - a[:, None]) + a[:, None] * r(.1, .75)[:, None]
    # blur: each picture its own amount, sideways smear sometimes
    sig = torch.rand(B) ** 1.5 * 1.8 + .3; ks = 13; xs = torch.arange(ks) - ks // 2
    g = torch.exp(-xs[None] ** 2 / (2 * sig[:, None] ** 2)); g = g / g.sum(1, keepdim=True)
    sm = torch.rand(B) * 2.2 * (torch.rand(B) < .2) + sig; gh = torch.exp(-xs[None] ** 2 / (2 * sm[:, None] ** 2)); gh = gh / gh.sum(1, keepdim=True)
    img = F.conv2d(F.pad(img.transpose(0, 1), (ks // 2, ks // 2, 0, 0), mode='replicate'), gh[:, None, None, :], groups=B)
    img = F.conv2d(F.pad(img, (0, 0, ks // 2, ks // 2), mode='replicate'), g[:, None, :, None], groups=B).transpose(0, 1)
    img = img + torch.randn_like(img) * r(0, .04)[:, None]
    flip = torch.rand(B) < .5; img[flip] = torch.flip(img[flip], (2, 3))
    return norm(img), face, flip.float()

def norm(img): return (img - img.mean((2, 3), keepdim=True)) / (img.std((2, 3), keepdim=True) + 1e-4)

class Net(nn.Module):
    def __init__(s, ch=(12, 24, 48, 72, 96)):
        super().__init__(); L = []; c0 = 1
        for c in ch: L += [nn.Conv2d(c0, c, 3, 2, 1, bias=False), nn.BatchNorm2d(c), nn.ReLU()]; c0 = c
        s.f = nn.Sequential(*L); s.h = nn.Linear(c0 * 2, NB + 1)       # columns pooled over rows and over left/right halves
    def forward(s, x):
        z = s.f(x); z = z.mean(2); z = torch.cat([z.mean(2), z.amax(2)], 1); o = s.h(z); return o[:, :NB], o[:, NB]

def target(face, sig=1.2):                                  # soft bins round the true angle
    c = (face + 180) / 360 * NB; b = torch.arange(NB)[None] + .5; d = torch.remainder(b - c[:, None] + NB / 2, NB) - NB / 2; t = torch.exp(-d ** 2 / (2 * sig ** 2)); return t / t.sum(1, keepdim=True)
def read(logits):                                           # the angle: weighted mean round the strongest bin
    p = logits.softmax(1); k = p.argmax(1); idx = (k[:, None] + torch.arange(-3, 4)[None]) % NB; w = p.gather(1, idx); off = (w * torch.arange(-3, 4)[None]).sum(1) / w.sum(1)
    return (k + .5 + off) / NB * 360 - 180, w.sum(1)
def adiff(a, b): return torch.remainder(a - b + 180, 360) - 180

REAL = []
if realdir:
    truth = {'p6_strip': -24.7, 'p1_strip_hand': -11.7, 'p8_stand': 2.5, 'p2_col22': 54, 'p5_col18': 96, 'p4_blur': None}
    for n, t in truth.items():
        U = torch.tensor(json.load(open(f'{realdir}/real_{n}.json'))['U'], dtype=torch.float32).reshape(1, 1, 192, 301)[..., 2:298] / 255; REAL.append((n, norm(U), t))
def real_report(net):
    net.eval(); s = []
    with torch.no_grad():
        for n, U, t in REAL:
            lg, fl = net(U); a, c = read(lg); s.append(f"{n.split('_')[0]}:{a.item():.0f}({'?' if t is None else t}) c{c.item():.2f} f{torch.sigmoid(fl).item():.2f}")
    net.train(); return ' '.join(s)

if __name__ == '__main__':
    net = Net(); LR = 1e-3 if '--resume' in sys.argv else 2e-3; opt = torch.optim.AdamW(net.parameters(), LR, weight_decay=1e-4); t0 = time.time(); step = 0; B = 48; total = minutes * 60
    if os.path.exists(out + '.pt') and '--resume' in sys.argv: net.load_state_dict(torch.load(out + '.pt'))
    while time.time() - t0 < total:
        for gp in opt.param_groups: gp['lr'] = LR * (.5 + .5 * math.cos(math.pi * min(1, (time.time() - t0) / total))) + 2e-5
        x, face, flip = gen(B); lg, fl = net(x)
        loss = -(target(face) * lg.log_softmax(1)).sum(1).mean() + F.binary_cross_entropy_with_logits(fl, flip)
        opt.zero_grad(); loss.backward(); opt.step(); step += 1
        if step % 200 == 0:
            a, _ = read(lg); e = adiff(a, face).abs()
            print(f'{step} {time.time() - t0:.0f}s loss {loss.item():.3f} med {e.median().item():.1f} within7 {(e < 7).float().mean().item():.2f} flip {((fl > 0).float() == flip).float().mean().item():.2f} | {real_report(net)}', flush=True)
            torch.save(net.state_dict(), out + '.pt')
    torch.save(net.state_dict(), out + '.pt')
    # held-out check on fresh pictures, then weights for the browser with the batch norms folded in
    net.eval(); es = []; fs = []
    with torch.no_grad():
        for _ in range(40):
            x, face, flip = gen(50); lg, fl = net(x); a, _ = read(lg); es.append(adiff(a, face).abs()); fs.append(((fl > 0).float() == flip).float())
    e = torch.cat(es); f = torch.cat(fs); rep = {'n': len(e), 'median_deg': e.median().item(), 'within_3': (e < 3).float().mean().item(), 'within_7': (e < 7).float().mean().item(), 'flip_acc': f.mean().item(), 'steps': step, 'real': real_report(net)}
    print(json.dumps(rep), flush=True)
    layers = []; blob = []; mods = list(net.f)
    for i in range(0, len(mods), 3):
        cv, bn = mods[i], mods[i + 1]; sc = bn.weight / torch.sqrt(bn.running_var + bn.eps); w = cv.weight * sc[:, None, None, None]; b = bn.bias - bn.running_mean * sc
        layers.append({'cin': cv.in_channels, 'cout': cv.out_channels}); blob += [w.detach().numpy().ravel(), b.detach().numpy().ravel()]
    blob += [net.h.weight.detach().numpy().ravel(), net.h.bias.detach().numpy().ravel()]
    np.concatenate(blob).astype('<f4').tofile(out + '.bin')
    json.dump({'w': W, 'h': H, 'bins': NB, 'layers': layers, 'report': rep}, open(out + '.json', 'w'))
