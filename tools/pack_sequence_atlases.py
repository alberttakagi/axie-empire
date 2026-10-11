"""Pack every run/idleanim frame sequence in public/sprites/{units,enemies}
into a Phaser multiatlas (TexturePacker JSON-array format, 2048px pages,
alpha-trimmed with spriteSourceSize so on-screen placement is unchanged).

Output: public/sprites/atlas/<prefix>_<id>[_evolved]_<field>.json + _<page>.png
Frame names are the frame index as a string ("0", "1", ...).
Run from the repo root:  python3 tools/pack_sequence_atlases.py [--delete-frames]
"""
import glob, json, os, re, sys
from collections import defaultdict
from PIL import Image

PAGE = 2048
PAD = 2
OUT = 'public/sprites/atlas'
os.makedirs(OUT, exist_ok=True)

groups = defaultdict(dict)
for d in ('units', 'enemies'):
    for f in glob.glob(f'public/sprites/{d}/*.png'):
        m = re.match(r'(.+)_(run|idleanim)_(\d+)\.png$', os.path.basename(f))
        if m:
            groups[f'{m.group(1)}_{m.group(2)}'][int(m.group(3))] = f

total_pages = 0
for key, frames in sorted(groups.items()):
    items = []
    for idx in sorted(frames):
        im = Image.open(frames[idx]).convert('RGBA')
        bbox = im.getbbox() or (0, 0, 1, 1)
        items.append((idx, im.size, bbox, im.crop(bbox)))
    # Shelf packing, tallest first, onto as many PAGE x PAGE pages as needed.
    order = sorted(items, key=lambda it: -it[3].height)
    pages = []  # list of (placements, used_height)
    cur, x, y, shelf_h = [], 0, 0, 0
    for it in order:
        w, h = it[3].size
        if x + w > PAGE:
            x, y, shelf_h = 0, y + shelf_h + PAD, 0
        if y + h > PAGE:
            pages.append(cur)
            cur, x, y, shelf_h = [], 0, 0, 0
        cur.append((it, x, y))
        x += w + PAD
        shelf_h = max(shelf_h, h)
    if cur:
        pages.append(cur)

    textures = []
    for p, placements in enumerate(pages):
        pw = max(px + it[3].width for it, px, py in placements)
        ph = max(py + it[3].height for it, px, py in placements)
        sheet = Image.new('RGBA', (pw, ph), (0, 0, 0, 0))
        out_frames = []
        for (idx, (sw, sh), bbox, crop), px, py in placements:
            sheet.paste(crop, (px, py))
            out_frames.append({
                'filename': str(idx), 'rotated': False, 'trimmed': True,
                'sourceSize': {'w': sw, 'h': sh},
                'spriteSourceSize': {'x': bbox[0], 'y': bbox[1], 'w': crop.width, 'h': crop.height},
                'frame': {'x': px, 'y': py, 'w': crop.width, 'h': crop.height},
            })
        img_name = f'{key}_{p}.png'
        sheet.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(os.path.join(OUT, img_name), optimize=True)
        textures.append({'image': img_name, 'format': 'RGBA8888', 'size': {'w': pw, 'h': ph}, 'scale': 1, 'frames': out_frames})
        total_pages += 1
    with open(os.path.join(OUT, f'{key}.json'), 'w') as fh:
        json.dump({'textures': textures, 'meta': {'app': 'tools/pack_sequence_atlases.py', 'version': '1'}}, fh, separators=(',', ':'))

print(f'{len(groups)} atlases, {total_pages} pages, {sum(len(v) for v in groups.values())} frames')

if '--delete-frames' in sys.argv:
    n = 0
    for frames in groups.values():
        for f in frames.values():
            os.remove(f); n += 1
    print(f'deleted {n} individual frame PNGs')
