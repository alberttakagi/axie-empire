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

  // Real attack clip (public/audio/sfx/<vfxId>_attack.wav — same Origins
  // Asset Kit clip set these visual VFX come from) — every vfxId here has
  // one. Played alongside (not instead of) GameScene's own generic hit/crit
  // blip (see applyResolvedDamage) — this is the character-specific
  // flavor layered on top of that universal baseline, not a replacement.
  playSfxFile(`/audio/sfx/${vfxId}_attack.wav`, { gain: 0.55 });

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
