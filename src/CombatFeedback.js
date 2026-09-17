import Phaser from 'phaser';

// Floating combat text — the "-12" / "-24!" / "MISS" popups every hit
// produces, layered on top of hit-flash (see GameScene's hitFlashMs) and
// hit/crit sfx (Audio.js) as this pass's core combat "juice": Battle Cats
// leans hard on all three landing together to make a hit feel like it
// actually connected, which this build had none of before now.

const RISE_DISTANCE_PX = 34;
const DURATION_MS = 650;

// `scene.uiCamera` (see GameScene's setupZoomControls) only exists on
// GameScene itself — guarded so this stays usable from anywhere a hit can
// land without needing to know which scene that is.
export function showDamageNumber(scene, x, y, amount, { isCrit = false, isMiss = false } = {}) {
  const text = isMiss ? 'MISS' : `-${Math.round(amount)}`;
  const label = scene.add
    .text(x + Phaser.Math.Between(-6, 6), y - 18, text, {
      fontFamily: 'Rowdies, sans-serif',
      fontSize: isCrit ? '20px' : '14px',
      color: isMiss ? '#bbbbbb' : isCrit ? '#ffcc33' : '#ffffff',
      stroke: '#000000',
      strokeThickness: isCrit ? 4 : 3,
    })
    .setOrigin(0.5)
    .setDepth(1000);
  scene.uiCamera?.ignore(label);

  scene.tweens.add({
    targets: label,
    y: label.y - RISE_DISTANCE_PX,
    alpha: 0,
    duration: DURATION_MS,
    ease: 'Cubic.out',
    onComplete: () => label.destroy(),
  });
}
