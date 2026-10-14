"""Build game backgrounds (1920x1080 JPEG) from the Origins asset kit.
Composites event bg+fg layers and the rocky-mountain story layers.
Run from repo root: python3 tools/import_backgrounds.py"""
import os
from PIL import Image
K = 'tools/axie-origins-asset-kit/Assets/OriginsKit/PvE/Backgrounds/'
OUT = 'public/backgrounds/'
W, H = 1920, 1080

def place(c, path, anchor):
    im = Image.open(K + path).convert('RGBA')
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    y = 0 if anchor == 'top' else H - im.height
    c.alpha_composite(im, (0, y))

def build(layers):
    c = Image.new('RGBA', (W, H), (0, 0, 0, 255))
    for path, anchor in layers:
        place(c, path, anchor)
    return c.convert('RGB')

SETS = {
    # HD upgrades of existing ids
    'plant': [('class/bg-plant.jpg', 'top')],
    'beast': [('class/bg-beast.jpg', 'top')],
    'aquatic': [('class/bg-aquatic.jpg', 'top')],
    'dusk': [('class/bg-dusk.jpg', 'top')],
    'mech': [('class/bg-mech.jpg', 'top')],
    'metamorph': [('class/bg_metamorph.png', 'top')],
    'metamorph2': [('class/bg_metamorph2.png', 'top')],
    'autumn24': [('events/autumn24/autumn24_bg.png', 'top'), ('events/autumn24/autumn24_fg.png', 'bottom')],
    'autumn25': [('events/autumn25/autumn25_bg.png', 'top'), ('events/autumn25/autumn25_fg.png', 'bottom')],
    'summer24_gauntlet': [('events/summer24-gauntlet/gauntlet-bg.png', 'top'), ('events/summer24-gauntlet/gauntlet-fg.png', 'bottom')],
    # New scenes
    'bird': [('class/bg-bird.jpg', 'top')],
    'bug': [('class/bg-bug.jpg', 'top')],
    'dawn': [('class/bg-dawn.jpg', 'top')],
    'reptile': [('class/bg-reptile.jpg', 'top')],
    'reptile2': [('class/bg-reptile-2.png', 'top')],
    'canyon': [('class/bg_shop.png', 'top')],
    'halloween': [('events/halloween24/halloween24_bg.png', 'top'), ('events/halloween24/halloween24_fg.png', 'top')],
    'winter': [('events/winter24/winter24_bg.png', 'bottom'), ('events/winter24/winter24_fg.png', 'bottom')],
    'xmas': [('events/xmas24/xmas24_bg.png', 'top')],
    'summer23': [('events/summer23/s23_bg_b.png', 'top'), ('events/summer23/s23_bg_m.png', 'top')],
    'beachRank': [('events/summer24-rank/rank-bg.png', 'top'), ('events/summer24-rank/rank-fg.png', 'bottom')],
    'beachArcade': [('events/summer24-arcade/arcade-bg.png', 'top'), ('events/summer24-arcade/arcade-fg.png', 'bottom')],
    'rockyMountain': [('story/9-rocky-mountain-1/9_BG.png', 'top'), ('story/9-rocky-mountain-1/9_CLOUD-1.png', 'top'),
                      ('story/9-rocky-mountain-1/9_CLOUD-2.png', 'top'), ('story/9-rocky-mountain-1/9_CLOUD-3.png', 'top'),
                      ('story/9-rocky-mountain-1/9_MOUNTAIN.png', 'top'), ('story/9-rocky-mountain-1/9_Ground.png', 'bottom'),
                      ('story/9-rocky-mountain-1/9_ROCK.png', 'bottom'), ('story/9-rocky-mountain-1/9_FOG.png', 'bottom'),
                      ('story/9-rocky-mountain-1/9_FRONT-2.png', 'bottom'), ('story/9-rocky-mountain-1/9_FRONT-1.png', 'bottom')],
}
total = 0
for key, layers in SETS.items():
    path = OUT + f'bg_{key}.jpg'
    build(layers).save(path, quality=80, optimize=True, progressive=True)
    total += os.path.getsize(path)
    print(key, os.path.getsize(path) // 1024, 'KB')
print('total', total // 1024 // 1024, 'MB')
