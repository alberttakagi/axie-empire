import Phaser from 'phaser';
import { ATTACK_VFX, UNIT_ATTACK_VFX, ROLE_ATTACK_VFX } from './VFX_CONFIG.js';
import { playSfxFile } from './Audio.js';

// Every clip's natural length runs well over a second — way slower than
// this game's attack cadence (the fastest unit, Swarm, cycles every
// ~667ms). Compressed into a fixed, snappy window instead so it never
// outlives the next attack. See VFX_CONFIG.js for why the sprite itself
// never moves (the motion is baked into the frames) — only its scale does,
// clamped so a very close hit doesn't collapse to nothing and a very long
// one doesn't dwarf the lane.
const PLAYBACK_MS = 420;
const MIN_SCALE = 0.2;
const MAX_SCALE = 1.0;

// Real user feedback: every one of the 10 player units plus 3 enemy roles
// had its OWN distinct attack sfx (12 different real wav clips total, each
// picked per-vfxId — see the old `/audio/sfx/${vfxId}_attack.wav` lookup
// this replaces), which reads as chaotic noise once more than one or two
// units are fighting at once. Collapsed down to exactly 3 shared clips —
// melee/ranged/"other" — reusing the shortest real clip of each flavor
// already in the kit (no new assets) rather than inventing a 4th category
// or keeping the per-character variety.
const ATTACK_SFX_FILE = {
  melee: '/audio/sfx/beast_bite_attack.wav',
  ranged: '/audio/sfx/bug_projectile_attack.wav',
  other: '/audio/sfx/plant_cast_attack.wav',
};

// Player units, by GAMEPLAY range (UNIT_CONFIG.js's own range vs radius —
// not by vfxId name: the vfx clip names (bite/slash/smash/gore/cast) are a
// VISUAL flavor picked per-character and don't line up with which units
// actually reach past contact range, e.g. 'ranged' (Puffy, real range 350
// vs Cat's 140) and 'aoe' (Noir, real range 170 + a splash special) both
// happen to use a "bite"/"smash"-named clip despite genuinely being ranged
// attackers). 'support' (Mit) gets its own "other" bucket rather than
// lumping it into 'ranged' — the roster's true longest reach (range 400)
// AND its own vfx is already a spellcast, not a projectile, so it reads as
// a caster, not just "ranged."
const PLAYER_UNIT_SFX_CATEGORY = {
  basic: 'melee',
  tank: 'melee',
  swarm: 'melee',
  ranged: 'ranged',
  fast: 'melee',
  aoe: 'ranged',
  sniper: 'melee',
  support: 'other',
  titan: 'melee',
  guardian: 'melee', // Xia — real user feedback: wanted OFF its old unique reptile_gore clip
};

// Enemies only ever have 3 possible vfxIds (see ROLE_ATTACK_VFX), and all 3
// are already named '..._projectile' — deriving from the name is simplest
// here and happens to line up with reality (every enemy role with a vfx
// entry at all IS one of the ranged/sniper/support roles ROLE_ATTACK_VFX's
// own header says are the only ones with real reach).
function attackSfxCategory(isPlayerSide, unitId, vfxId) {
  if (isPlayerSide) return PLAYER_UNIT_SFX_CATEGORY[unitId] || 'melee';
  return vfxId.includes('projectile') ? 'ranged' : 'melee';
}

export function preloadAttackVfx(scene) {
  for (const vfx of Object.values(ATTACK_VFX)) {
    if (scene.textures.exists(vfx.key)) continue;
    scene.load.spritesheet(vfx.key, vfx.path, { frameWidth: vfx.frameW, frameHeight: vfx.frameH });
  }
}

// Must run after the spritesheet textures above have actually loaded (i.e.
// from create(), not preload()) since animations reference real frame
// indices. Guarded by anims.exists like preloadAttackVfx guards
// textures.exists, so calling this once per scene instance is safe.
export function createAttackVfxAnims(scene) {
  for (const [vfxId, vfx] of Object.entries(ATTACK_VFX)) {
    if (scene.anims.exists(vfxId)) continue;
    scene.anims.create({
      key: vfxId,
      frames: scene.anims.generateFrameNumbers(vfx.key, { start: 0, end: vfx.endFrame }),
      frameRate: (vfx.endFrame + 1) / (PLAYBACK_MS / 1000),
      repeat: 0,
    });
  }
}

// Fires a one-shot attack VFX for `attacker`'s hit landing at
// (targetX, targetY) — called exactly at the moment an attack connects (see
// GameScene's dealDamage/base-hit onHit closures), so this is purely a
// cosmetic flourish layered on top of damage that's already been applied,
// not something gameplay timing depends on. Player units pick their VFX by
// character (UNIT_ATTACK_VFX, keyed by UNIT_CONFIG id); enemies still pick
// by role (ROLE_ATTACK_VFX — only the three ranged roles). No-ops for any
// attacker without an entry in the relevant map.
//
// The sprite's origin is pinned to the clip's `anchor` point and its
// position set once to the target and never animated — see VFX_CONFIG.js's
// header comment for why (the effect's on-screen motion is baked into the
// frames themselves, not something we tween).
export function fireAttackVfx(scene, attacker, targetX, targetY) {
  const vfxId = attacker.isPlayerSide
    ? UNIT_ATTACK_VFX[attacker.config.id]
    : ROLE_ATTACK_VFX[attacker.config.role];
  if (!vfxId) return;

  // One of exactly 3 shared attack clips (see ATTACK_SFX_FILE's own
  // comment) rather than a unique real clip per vfxId. Played alongside
  // (not instead of) GameScene's own generic hit/crit blip (see
  // applyResolvedDamage) — this is the melee/ranged/other flavor layered
  // on top of that universal baseline, not a replacement.
  const sfxCategory = attackSfxCategory(attacker.isPlayerSide, attacker.config.id, vfxId);
  playSfxFile(ATTACK_SFX_FILE[sfxCategory], { gain: 0.55 });

  const vfx = ATTACK_VFX[vfxId];
  if (!scene.textures.exists(vfx.key)) return;

  const attackerX = attacker.shape.x;
  const captureSpan = Math.abs(vfx.captureDefender.x - vfx.captureAttacker.x) || 1;
  const realSpan = Math.abs(targetX - attackerX);
  const scale = Phaser.Math.Clamp(realSpan / captureSpan, MIN_SCALE, MAX_SCALE);

  // The capture's own direction is always attacker-right/defender-left;
  // flip whenever our actual attack fires the other way.
  const nativeRightToLeft = vfx.captureDefender.x < vfx.captureAttacker.x;
  const oursRightToLeft = targetX < attackerX;
  const flip = nativeRightToLeft !== oursRightToLeft;

  const sprite = scene.add.sprite(targetX, targetY, vfx.key, 0);
  sprite.setOrigin(vfx.anchor.x / vfx.frameW, vfx.anchor.y / vfx.frameH);
  sprite.setScale(scale);
  sprite.setFlipX(flip);
  sprite.setBlendMode(Phaser.BlendModes.ADD);
  scene.uiCamera.ignore(sprite);

  sprite.play(vfxId);
  sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
}
