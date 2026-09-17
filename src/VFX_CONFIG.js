// Attack VFX — real pre-rendered sprite-sheet flipbooks pulled from the
// Origins Asset Kit's web-vfx sub-project
// (tools/axie-origins-asset-kit/web-vfx/public/vfx/<clip-id>/, copied into
// public/vfx/ below), NOT the Spine skeletons tools/sprite-gen renders — a
// different, already-baked "attack hits, effect bursts at the defender"
// capture per clip (see that kit's Documentation~/Effects.md's 63-entry
// "Skills" table, named `{class}_{attacktype}`).
//
// IMPORTANT — how these clips actually work (verified by sampling raw atlas
// pixels — easy to misread from a glance): every clip is ONE continuous
// scene capture where the effect's on-screen motion (a projectile flying
// in, a claw swiping in, a burst forming) is baked directly into the frame
// pixels — the sprite/quad itself does NOT move. `anchor` is a fixed point
// *in atlas-frame-pixel space* that always corresponds to the defender's
// position; `captureAttacker`/`captureDefender` are that same clip's
// attacker/defender positions in the original (uncropped) capture, used
// only to work out how big the crop is relative to OUR actual
// attacker/defender distance — every clip below shares the identical
// captureAttacker/captureDefender values because they're all cropped from
// the same reference capture setup, just different crop windows into it.
// Playback means: set the sprite's origin to `anchor` (so that pixel always
// sits at the real defender's screen position), scale the whole sprite by
// `ourDistance / captureDistance`, flip it if our attack direction doesn't
// match the capture's own (attacker-right/defender-left) direction, and
// just play frames 0..endFrame in place — see AttackVfx.js.
//
// `endFrame` is NOT always that clip's own `OnEndLoop` event converted to a
// frame index — for several of these clips OnEndLoop actually fires
// *before* `peakFrame` (an authoring quirk around their idle-loop point,
// unrelated to when the hit itself finishes reading), which would visibly
// cut the effect off mid-impact. Every `endFrame` below is instead
// `min(frames-1, peakFrame + 15)`, a fixed post-impact tail that always
// finishes playing the hit before trimming the long "return to idle" tail.
// bird_projectile/bug_projectile are the exception, kept at their
// OnEndLoop-derived values since those were individually verified live.
export const ATTACK_VFX = {
  bird_projectile: {
    key: 'vfx_bird_projectile',
    path: '/vfx/bird_projectile/atlas.png',
    cols: 8,
    rows: 9,
    frameW: 753,
    frameH: 378,
    endFrame: 51,
    anchor: { x: 281.312, y: 174.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  bug_projectile: {
    key: 'vfx_bug_projectile',
    path: '/vfx/bug_projectile/atlas.png',
    cols: 8,
    rows: 11,
    frameW: 498,
    frameH: 336,
    endFrame: 55,
    anchor: { x: 91.312, y: 135.508 },
    captureAttacker: { x: 484.754, y: 242.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  aquatic_bite: {
    key: 'vfx_aquatic_bite',
    path: '/vfx/aquatic_bite/atlas.png',
    cols: 8,
    rows: 6,
    frameW: 367,
    frameH: 297,
    endFrame: 41,
    anchor: { x: 186.312, y: 174.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  aquatic_smash: {
    key: 'vfx_aquatic_smash',
    path: '/vfx/aquatic_smash/atlas.png',
    cols: 8,
    rows: 6,
    frameW: 692,
    frameH: 428,
    endFrame: 43,
    anchor: { x: 281.312, y: 174.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  beast_bite: {
    key: 'vfx_beast_bite',
    path: '/vfx/beast_bite/atlas.png',
    cols: 8,
    rows: 5,
    frameW: 589,
    frameH: 265,
    endFrame: 30,
    anchor: { x: 272.312, y: 165.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  beast_slash: {
    key: 'vfx_beast_slash',
    path: '/vfx/beast_slash/atlas.png',
    cols: 8,
    rows: 7,
    frameW: 566,
    frameH: 414,
    endFrame: 31,
    anchor: { x: 281.312, y: 174.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  bird_smash: {
    key: 'vfx_bird_smash',
    path: '/vfx/bird_smash/atlas.png',
    cols: 8,
    rows: 6,
    frameW: 572,
    frameH: 231,
    endFrame: 41,
    anchor: { x: 248.312, y: 174.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  bug_bite: {
    key: 'vfx_bug_bite',
    path: '/vfx/bug_bite/atlas.png',
    cols: 8,
    rows: 6,
    frameW: 600,
    frameH: 301,
    endFrame: 37,
    anchor: { x: 281.312, y: 174.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  dawn_smash: {
    key: 'vfx_dawn_smash',
    path: '/vfx/dawn_smash/atlas.png',
    cols: 8,
    rows: 5,
    frameW: 578,
    frameH: 281,
    endFrame: 35,
    anchor: { x: 281.312, y: 174.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  plant_gore: {
    key: 'vfx_plant_gore',
    path: '/vfx/plant_gore/atlas.png',
    cols: 8,
    rows: 5,
    frameW: 764,
    frameH: 360,
    endFrame: 30,
    anchor: { x: 281.312, y: 163.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  plant_cast: {
    key: 'vfx_plant_cast',
    path: '/vfx/plant_cast/atlas.png',
    cols: 8,
    rows: 10,
    frameW: 689,
    frameH: 350,
    endFrame: 36,
    anchor: { x: 206.312, y: 174.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
  reptile_gore: {
    key: 'vfx_reptile_gore',
    path: '/vfx/reptile_gore/atlas.png',
    cols: 8,
    rows: 6,
    frameW: 733,
    frameH: 371,
    endFrame: 30,
    anchor: { x: 242.312, y: 174.508 },
    captureAttacker: { x: 674.754, y: 281.066 },
    captureDefender: { x: 281.312, y: 174.508 },
  },
};

// Player units: one hand-picked VFX per character (per the user's own
// choices), keyed by UNIT_CONFIG.js's `id` — independent of trait/role, so
// e.g. Puffy (ranged/bug) fires aquatic_bite rather than anything
// bug-themed. Every UNIT_CONFIG entry has an entry here.
export const UNIT_ATTACK_VFX = {
  basic: 'beast_bite', // Tripp
  fast: 'beast_slash', // Buba
  tank: 'plant_gore', // Olek
  ranged: 'aquatic_bite', // Puffy
  aoe: 'aquatic_smash', // Noir
  swarm: 'bug_bite', // Shillin
  sniper: 'bird_smash', // Momo
  guardian: 'reptile_gore', // Xia
  support: 'plant_cast', // Mit
  titan: 'dawn_smash', // Temujin
};

// Enemies: unchanged from the original ranged-attack-only pass — only the
// three roles whose `range` exceeds `radius` (ranged/sniper/support, the
// only genuinely ranged roles in ENEMY_CONFIG.js) fire a projectile. No
// per-character enemy VFX was requested, so every other enemy role stays
// silent.
export const ROLE_ATTACK_VFX = {
  ranged: 'bug_projectile',
  sniper: 'bird_projectile',
  support: 'bug_projectile',
};
