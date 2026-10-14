"""Repair hollow ground shadows on enemy art.

sprite-gen's stripOpaqueBackdrop (chimera renders) removes large near-black
blobs to kill stray backdrops; on some poses that also hollowed out the
character's own soft ground shadow, leaving a faint ring. In battle that
read as the shadow/outline "going transparent" whenever an enemy switched
to its attack/hit pose. This finds the ring (dark, semi-transparent pixels
in the lower part of the image), and if its middle is empty, paints a soft
elliptical shadow BEHIND the existing pixels. Character pixels are never
changed. Works on stills and on packed atlas frames (in place).
Run from repo root: python3 tools/fix_hollow_shadows.py [--dry-run]
"""
import glob, json, os, sys
from PIL import Image, ImageDraw, ImageFilter

DRY = '--dry-run' in sys.argv
# Dryad Ranger's shadow sits under its body/legs, so the ring heuristic
# misfires there (verified visually) — leave its art alone.
SKIP = ('sniper',)

def shadow_pixels(im):
    w, h = im.size
    px = im.load()
    pts = []
    for y in range(int(h * 0.55), h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if 8 < a < 200 and r < 40 and g < 40 and b < 40:
                pts.append((x, y))
    return pts

def fix(im):
    """Returns repaired image or None if nothing to fix."""
    pts = shadow_pixels(im)
    if len(pts) < 40:
        return None
    # Only the bottom-most contiguous band of shadow rows counts — semi-
    # transparent body parts higher up (slime jelly, dryad leaves) are not
    # the ground shadow.
    from collections import Counter
    rows = Counter(p[1] for p in pts)
    y1 = max(rows)
    y0 = y1
    while rows.get(y0 - 1, 0) >= 3 or rows.get(y0 - 2, 0) >= 3:
        y0 -= 1
    pts = [p for p in pts if y0 <= p[1] <= y1]
    if len(pts) < 40:
        return None
    xs = sorted(p[0] for p in pts)
    x0, x1 = xs[int(len(xs) * 0.03)], xs[int(len(xs) * 0.97)]
    ew, eh = x1 - x0, y1 - y0
    if ew < 30 or eh < 6 or eh > ew:  # not a ground-shadow shape
        return None
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    # Hollow check: the ellipse's centre band is (nearly) empty.
    a = im.split()[3]
    band = [a.getpixel((x, cy)) for x in range(cx - ew // 6, cx + ew // 6)]
    if sum(1 for v in band if v > 15) > len(band) * 0.3:
        return None  # already filled (or covered by the body) — leave it
    # Must actually be a ring: shadow pixels present at both ends of the row.
    row_pts = [p[0] for p in pts if abs(p[1] - cy) <= 2]
    if not row_pts or min(row_pts) > x0 + ew * 0.25 or max(row_pts) < x1 - ew * 0.25:
        return None
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    d.ellipse([x0 + ew * 0.06, y0 + eh * 0.1, x1 - ew * 0.06, y1 - eh * 0.05], fill=(0, 0, 0, 95))
    sh = sh.filter(ImageFilter.GaussianBlur(max(2, eh * 0.18)))
    out = Image.alpha_composite(sh, im)  # shadow BEHIND the art
    return out

fixed = []
# Stills
for f in sorted(glob.glob('public/sprites/enemies/*.png')):
    if any(k in f for k in SKIP):
        continue
    im = Image.open(f).convert('RGBA')
    r = fix(im)
    if r is not None:
        fixed.append(f)
        if not DRY:
            r.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(f, optimize=True)
# Atlas frames (enemy sequences)
for j in sorted(glob.glob('public/sprites/atlas/enemy_*.json')):
    if any(k in j for k in SKIP):
        continue
    data = json.load(open(j))
    for tex in data['textures']:
        page_path = os.path.join('public/sprites/atlas', tex['image'])
        page = Image.open(page_path).convert('RGBA')
        changed = 0
        for fr in tex['frames']:
            r0 = fr['frame']; ss = fr['spriteSourceSize']; src = fr['sourceSize']
            crop = page.crop((r0['x'], r0['y'], r0['x'] + r0['w'], r0['y'] + r0['h']))
            full = Image.new('RGBA', (src['w'], src['h']), (0, 0, 0, 0))
            full.paste(crop, (ss['x'], ss['y']))
            rep = fix(full)
            if rep is None:
                continue
            # keep within the frame's trimmed rect (shadow lives inside it)
            page.paste(rep.crop((ss['x'], ss['y'], ss['x'] + r0['w'], ss['y'] + r0['h'])), (r0['x'], r0['y']))
            changed += 1
        if changed:
            fixed.append(f'{page_path} ({changed} frames)')
            if not DRY:
                page.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(page_path, optimize=True)
print(('WOULD FIX' if DRY else 'FIXED'), len(fixed))
for f in fixed: print(' ', f)
