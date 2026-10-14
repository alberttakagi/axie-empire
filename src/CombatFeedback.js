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
// Damage numbers are pooled per scene (one pool per style) instead of
// creating and destroying a Text — each new Text allocates its own canvas
// and GPU texture, which in a 50-unit late-saga brawl meant hundreds of
// allocations per second on phones. Non-crit numbers are also capped:
// past MAX_ACTIVE_NUMBERS a pile-up is unreadable anyway, while crits and
// misses always show.
const MAX_ACTIVE_NUMBERS = 36;
const NUMBER_STYLES = {
  normal: { fontSize: '14px', color: '#ffffff', strokeThickness: 3 },
  crit: { fontSize: '20px', color: '#ffcc33', strokeThickness: 4 },
  miss: { fontSize: '14px', color: '#bbbbbb', strokeThickness: 3 },
};

function damagePool(scene) {
  if (!scene._damagePool) {
    scene._damagePool = { free: { normal: [], crit: [], miss: [] }, active: 0 };
    scene.events.once('shutdown', () => { scene._damagePool = null; });
  }
  return scene._damagePool;
}

function takeLabel(scene, pool, kind) {
  const label = pool.free[kind].pop();
  if (label && label.active) return label.setVisible(true).setAlpha(1).setScale(1);
  const created = scene.add
    .text(0, 0, '', { fontFamily: 'Rowdies, sans-serif', stroke: '#000000', ...NUMBER_STYLES[kind] })
    .setOrigin(0.5)
    .setDepth(1000);
  scene.uiCamera?.ignore(created);
  return created;
}

export function showDamageNumber(scene, x, y, amount, { isCrit = false, isMiss = false } = {}) {
  const pool = damagePool(scene);
  const kind = isMiss ? 'miss' : isCrit ? 'crit' : 'normal';
  if (kind === 'normal' && pool.active >= MAX_ACTIVE_NUMBERS) return;
  const text = isMiss ? 'MISS' : `-${Math.round(amount)}`;
  const label = takeLabel(scene, pool, kind);
  label.setText(text).setPosition(x + Phaser.Math.Between(-6, 6), y - 18);
  pool.active += 1;
  const release = () => {
    pool.active -= 1;
    if (!label.active) return;
    label.setVisible(false);
    pool.free[kind].push(label);
  };

  if (isCrit) {
    // Crits get a stamped "CRITICAL!" and a pop-in so they read instantly.
    const stamp = scene.add
      .text(label.x, label.y - 20, 'CRITICAL!', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '11px', color: '#ff5a3c', stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5).setDepth(1000).setScale(1.8).setAngle(-8);
    scene.uiCamera?.ignore(stamp);
    scene.tweens.add({ targets: stamp, scale: 1, duration: 120, ease: 'Back.out' });
    scene.tweens.add({ targets: stamp, y: stamp.y - RISE_DISTANCE_PX, alpha: 0, delay: 200, duration: DURATION_MS, onComplete: () => stamp.destroy() });
    label.setScale(1.6);
    scene.tweens.add({ targets: label, scale: 1, duration: 140, ease: 'Back.out' });
  }

  scene.tweens.add({
    targets: label,
    y: label.y - RISE_DISTANCE_PX,
    alpha: 0,
    duration: DURATION_MS,
    ease: 'Cubic.out',
    onComplete: release,
  });
}
