"""Cut Origins asset-kit battle SFX down to game-ready one-shots.

Kit clips run 1.5-5s; attacks in this game cycle every ~0.7s, so full-length
clips pile into mush (the old "chaotic noise" feedback). Each clip here is
trimmed to its onset, capped to `max_s` with a short fade, peak-normalized,
and written mono 16-bit at 24kHz into public/audio/sfx/.
Run from repo root: python3 tools/prepare_sfx.py
"""
import array, wave, os

KIT = 'tools/axie-origins-asset-kit/Assets/OriginsKit/Audio/'
OUT = 'public/audio/sfx/'
RATE = 24000

# dst name -> (kit source, max seconds)
CLIPS = {
    # Attack one-shots, one per VFX family (VFX_CONFIG's UNIT_ATTACK_VFX ids).
    'beast_bite_attack': ('beast_bite_attack', 0.42),
    'beast_slash_attack': ('beast_slash_attack', 0.42),
    'plant_gore_attack': ('plant_gore_attack', 0.45),
    'plant_cast_attack': ('plant_cast_attack', 0.55),
    'aquatic_bite_attack': ('aquatic_bite_attack', 0.42),
    'aquatic_smash_attack': ('aquatic_smash_attack', 0.5),
    'bug_bite_attack': ('bug_bite_attack', 0.4),
    'bird_smash_attack': ('bird_smash_attack', 0.5),
    'reptile_gore_attack': ('reptile_gore_attack', 0.45),
    'dawn_smash_attack': ('dawn_smash_attack', 0.6),
    'bird_projectile_attack': ('bird_projectile_attack', 0.45),
    'bug_projectile_attack': ('bug_projectile_attack', 0.45),
    # Enemy melee families.
    'plant_smash_attack': ('plant_smash_attack', 0.45),
    'beast_gore_attack': ('beast_gore_attack', 0.45),
    'aquatic_slash_attack': ('aquatic_slash_attack', 0.4),
    # Status / events.
    'bubble': ('bubble', 0.7),
    'poison': ('poison', 0.8),
    'stunned': ('stunned', 0.8),
    'weak': ('weak', 0.8),
    'hex': ('hex', 0.8),
    'drain': ('drain', 0.8),
    'shield': ('shield', 0.6),
    'power_awaken': ('power_awaken', 1.6),
    'death_mark': ('death_mark', 1.6),
    'buff': ('buff', 1.2),
    'summon_on': ('summon_on', 0.8),
    'summon_off': ('summon_off', 0.8),
    'bubble_bomb': ('bubble_bomb', 1.0),
}

def read_mono(path):
    w = wave.open(path)
    ch, sw, fr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    assert sw == 2, path
    a = array.array('h', w.readframes(n))
    if ch > 1:
        a = array.array('h', (sum(a[i:i + ch]) // ch for i in range(0, len(a), ch)))
    return [s / 32768 for s in a], fr

def resample(x, fr):
    if fr == RATE:
        return x
    step = fr / RATE
    out, n = [], int(len(x) / step)
    for i in range(n):
        p = i * step; j = int(p); t = p - j
        out.append(x[j] * (1 - t) + x[min(j + 1, len(x) - 1)] * t)
    return out

for dst, (src, max_s) in CLIPS.items():
    x, fr = read_mono(KIT + src + '.wav')
    x = resample(x, fr)
    peak = max(abs(s) for s in x) or 1
    onset = next((i for i, s in enumerate(x) if abs(s) > peak * 0.06), 0)
    start = max(0, onset - int(0.004 * RATE))
    x = x[start:start + int(max_s * RATE)]
    fade = min(len(x), int(0.08 * RATE))
    for i in range(fade):
        x[len(x) - fade + i] *= 1 - i / fade
    peak = max(abs(s) for s in x) or 1
    g = 0.89 / peak  # ~ -1 dBFS
    data = array.array('h', (int(max(-1, min(1, s * g)) * 32767) for s in x))
    with wave.open(OUT + dst + '.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(data.tobytes())
print(f'wrote {len(CLIPS)} clips')
