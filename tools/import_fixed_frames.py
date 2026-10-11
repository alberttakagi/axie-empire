"""NOTE: frame sequences now ship as atlases (tools/pack_sequence_atlases.py);
run this against unpacked frames, then re-run the packer.

Import re-rendered (un-clipped) frame sequences from tools/sprite-gen/output/fix_*
into public/sprites, matching the shipped frames' pixel scale and the
character's position relative to the frame center (sprites use origin 0.5),
so in-game size/foot placement are unchanged — only the clipped tops return."""
import glob, os, re, sys
from PIL import Image

OUT = 'tools/sprite-gen/output'
PUB = 'public/sprites/units'

def union_bbox(imgs):
    bs = [im.getbbox() for im in imgs]
    return (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))

bases = sorted({re.sub(r'_\d+\.png$', '', os.path.basename(f))[4:] for f in glob.glob(f'{OUT}/fix_*_*.png')})
for base in bases:
    n = len(glob.glob(f'{OUT}/fix_{base}_*.png'))
    old = [Image.open(f'{PUB}/{base}_{i}.png').convert('RGBA') for i in range(n)]
    new = [Image.open(f'{OUT}/fix_{base}_{i}.png').convert('RGBA') for i in range(n)]
    ob, nb = union_bbox(old), union_bbox(new)
    W0, H0 = old[0].size
    # Width never clipped -> use content width ratio as the scale.
    s = (ob[2] - ob[0]) / (nb[2] - nb[0])
    new = [im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS) for im in new]
    nb = union_bbox(new)
    # Keep feet (bbox bottom) and bbox left at the same offset from frame center.
    dy = ob[3] - H0 / 2          # bottom offset from center (old)
    dx = ob[0] - W0 / 2          # left offset from center (old)
    cy = nb[3] - dy              # center y in new image coords
    cx = nb[0] - dx
    half_h = max(cy - (nb[1] - 4), (nb[3] + 4) - cy)
    half_w = max(cx - (nb[0] - 4), (nb[2] + 4) - cx)
    H, W = round(2 * half_h), round(2 * half_w)
    ox, oy = round(W / 2 - cx), round(H / 2 - cy)
    for i, im in enumerate(new):
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canvas.paste(im, (ox, oy), im)
        canvas.save(f'{PUB}/{base}_{i}.png', optimize=True)
    print(f'{base}: {n} frames, scale {s:.3f}, {W0}x{H0} -> {W}x{H}')
