"""Match each enemy's shipped idle art to the chimera skeleton it came from.

Compares silhouettes (alpha masks, cropped to their own bounds and
normalised to 64x64) between tools/sprite-gen/output/probe_<folder>_probeidle_0.png
and frame "0" of every public/sprites/atlas/enemy_<id>_idleanim atlas.
Prints the best folder per enemy with its score (IoU, 1.0 = identical).
"""
import glob, json, os
from PIL import Image


def atlas_frame(atlas, name='0'):
    j = json.load(open(f'public/sprites/atlas/{atlas}.json'))
    for t in j['textures']:
        for f in t['frames']:
            if f['filename'] == name:
                page = Image.open(f'public/sprites/atlas/{t["image"]}').convert('RGBA')
                fr, ss, src = f['frame'], f['spriteSourceSize'], f['sourceSize']
                out = Image.new('RGBA', (src['w'], src['h']))
                out.paste(page.crop((fr['x'], fr['y'], fr['x'] + fr['w'], fr['y'] + fr['h'])), (ss['x'], ss['y']))
                return out
    return None


def mask(im, n=64):
    a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    bb = a.getbbox()
    a = a.crop(bb).resize((n, n))
    return [1 if p else 0 for p in a.getdata()], bb


def iou(m1, m2):
    inter = sum(1 for a, b in zip(m1, m2) if a and b)
    union = sum(1 for a, b in zip(m1, m2) if a or b)
    return inter / union if union else 0


def load_probes():
    probes = {}
    for f in glob.glob('tools/sprite-gen/output/probe_*_probeidle_0.png'):
        folder = os.path.basename(f)[len('probe_'):-len('_probeidle_0.png')]
        probes[folder] = Image.open(f).convert('RGBA')
    return probes


if __name__ == '__main__':
    probes = {k: mask(v)[0] for k, v in load_probes().items()}
    enemies = sorted(os.path.basename(p)[:-len('_idleanim.json')] for p in glob.glob('public/sprites/atlas/enemy_*_idleanim.json'))
    result = {}
    for e in enemies:
        m = mask(atlas_frame(f'{e}_idleanim'))[0]
        scores = sorted(((iou(m, pm), f) for f, pm in probes.items()), reverse=True)
        result[e] = {'folder': scores[0][1], 'score': round(scores[0][0], 3), 'runnerUp': f'{scores[1][1]} {scores[1][0]:.3f}'}
        print(f'{e:28s} {scores[0][1]:22s} {scores[0][0]:.3f}   (next {scores[1][1]} {scores[1][0]:.3f})')
    json.dump(result, open('/private/tmp/claude-501/atk/enemy_match.json', 'w'), indent=1)
