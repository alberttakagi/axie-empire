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

// Per-character attack sound matched to the attack animation's own VFX
// family (Round 2): each unit plays the real Origins clip for its VFX id
// (`/audio/sfx/<vfxId>_attack.wav`, trimmed to a one-shot by
// tools/prepare_sfx.py). Earlier feedback that per-character sounds were
// "chaotic noise" came from the untrimmed 1.5-3s clips overlapping; the
// trimmed clips plus Audio.js's voice limiting (group cap + per-clip
// retrigger gap + slight detune) keep a big fight readable.
//
// Enemies: ranged roles use their projectile clip; melee roles get a family
// matched to their chimera (slimes = aquatic, wolves/bears = beast,
// treants/dryads = plant), mixed quieter than the player's side.
const ENEMY_MELEE_SFX = {
  basic: 'aquatic_slash', thatguy: 'aquatic_slash', mehmeh: 'aquatic_slash', kanban: 'aquatic_slash', zombie: 'aquatic_slash', swarm: 'aquatic_slash',
  fast: 'beast_bite', wanikun: 'beast_bite', usagin: 'beast_bite', kangaroo: 'beast_gore', gory: 'beast_gore', colossus: 'beast_gore',
  titan: 'beast_gore', behemoth: 'beast_gore', ikkaku: 'beast_gore', gagagaga: 'aquatic_smash',
  tank: 'plant_smash', guardian: 'plant_smash', aoe: 'plant_cast',
};

function attackSfxUrl(isPlayerSide, attackerConfig, vfxId) {
  if (vfxId) return `/audio/sfx/${vfxId}_attack.wav`;
  const family = !isPlayerSide && ENEMY_MELEE_SFX[attackerConfig.role];
  return family ? `/audio/sfx/${family}_attack.wav` : null;
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

// Fires a one-shot attack VFX + its matching sound for `attacker`'s hit
// landing at (targetX, targetY) — called exactly when an attack connects
// (GameScene's dealDamage/base-hit closures), purely cosmetic.
export function fireAttackVfx(scene, attacker, targetX, targetY) {
  const vfxId = attacker.isPlayerSide
    ? UNIT_ATTACK_VFX[attacker.config.id]
    : ROLE_ATTACK_VFX[attacker.config.role];

  const sfxUrl = attackSfxUrl(attacker.isPlayerSide, attacker.config, vfxId);
  if (sfxUrl) {
    playSfxFile(sfxUrl, attacker.isPlayerSide
      ? { gain: 0.5, group: 'attack-player', maxVoices: 3, minIntervalMs: 110, detune: 60 }
      : { gain: 0.32, group: 'attack-enemy', maxVoices: 2, minIntervalMs: 140, detune: 60 });
  }
  if (!vfxId) return;

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
