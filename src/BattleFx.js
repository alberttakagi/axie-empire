import Phaser from 'phaser';
import { LOGICAL_SIZE } from './RenderConfig.js';
import { playSfxFile } from './Audio.js';

// Round 2 game-feel layer: purely visual/audio flourishes installed onto
// GameScene.prototype (installBattleFx). Nothing here changes combat math.
//   - Signature moves: a ground shockwave for wave attackers, a delayed
//     burst for surge attackers, and a callout when a status effect lands.
//   - Rune Cannon charge glow on the player's tower as the meter fills.
//   - Victory/defeat: the losing tower crumbles, an impact flash, and the
//     surviving Axies celebrate (or slump).

const STATUS_CALLOUT = {
  slow: { text: 'SLOWED', color: '#7fd6ff' },
  stop: { text: 'FROZEN', color: '#d8f3ff' },
  weaken: { text: 'WEAKENED', color: '#c58bff' },
  curse: { text: 'CURSED', color: '#ff7ab8' },
  warp: { text: 'WARPED', color: '#ffe58a' },
};

const methods = {
  // ---- Signature moves ----
  fxWave(attacker, radius, direction) {
    const x = attacker.shape.x;
    const y = this.laneY + 14;
    const color = attacker.isPlayerSide ? 0x9be7ff : 0xff8a65;
    for (let k = 0; k < 2; k++) {
      const crest = this.add.ellipse(x, y, 34, 14, color, 0.75).setDepth(5);
      this.uiCamera.ignore(crest);
      this.tweens.add({
        targets: crest, x: x + direction * radius, scaleX: 3.2, scaleY: 1.6, alpha: 0,
        delay: k * 90, duration: 420, ease: 'Cubic.out', onComplete: () => crest.destroy(),
      });
    }
  },

  fxSurge(x, radius) {
    const y = this.laneY;
    const ring = this.add.circle(x, y, radius, 0xffd54f, 0.35).setStrokeStyle(4, 0xfff3a0, 0.9).setScale(0.2).setDepth(5);
    this.uiCamera.ignore(ring);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 380, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    for (let k = 0; k < 7; k++) {
      const spark = this.add.rectangle(x + (k - 3) * (radius / 4), y + 10, 4, 18, 0xfff3a0, 0.9).setDepth(6);
      this.uiCamera.ignore(spark);
      this.tweens.add({ targets: spark, y: y - 50 - Math.random() * 30, alpha: 0, duration: 450, ease: 'Cubic.out', onComplete: () => spark.destroy() });
    }
    this.cameras.main.shake(90, 0.003);
  },

  fxStatus(defender, type) {
    const info = STATUS_CALLOUT[type];
    if (!info || !defender.shape) return;
    const top = defender.spriteImage ? defender.spriteImage.getTopCenter().y : defender.shape.y - 30;
    const label = this.add
      .text(defender.shape.x, top - 6, info.text, { fontFamily: 'Rowdies, sans-serif', fontSize: '11px', color: info.color, stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(1001).setScale(0.4);
    this.uiCamera.ignore(label);
    this.tweens.add({ targets: label, scale: 1, duration: 140, ease: 'Back.out' });
    this.tweens.add({ targets: label, y: label.y - 22, alpha: 0, delay: 450, duration: 450, onComplete: () => label.destroy() });
  },

  // ---- Rune Cannon charge glow ----
  initCannonGlow() {
    const x = this.base.x + this.base.displayWidth / 2;
    const glow = this.add.ellipse(x, this.laneY, this.base.displayWidth * 1.3, this.base.displayHeight * 1.05, 0xffe58a, 0).setDepth(this.base.depth - 1);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    this.uiCamera.ignore(glow);
    this.cannonGlow = glow;
  },

  updateCannonGlow(time) {
    if (!this.cannonGlow) return;
    const frac = Phaser.Math.Clamp(this.specialMeter / (this.specialMeterMax || 1), 0, 1);
    if (frac < 0.6) {
      this.cannonGlow.setAlpha(0);
      return;
    }
    const ready = frac >= 1;
    const pulse = 0.5 + 0.5 * Math.sin(time / (ready ? 140 : 320));
    this.cannonGlow.setAlpha((ready ? 0.28 : 0.12) + pulse * (ready ? 0.22 : 0.08));
  },

  // ---- Victory / defeat ----
  crumbleTower(tower) {
    if (!tower || !tower.active) return;
    const x0 = tower.x;
    this.tweens.add({ targets: tower, x: x0 + 6, duration: 50, yoyo: true, repeat: 5 });
    this.tweens.add({ targets: tower, y: tower.y + 60, angle: tower.originX === 0 ? -9 : 9, alpha: 0.25, delay: 320, duration: 900, ease: 'Quad.in' });
    for (let k = 0; k < 10; k++) {
      const puff = this.add.circle(x0 + (tower.originX === 0 ? 1 : -1) * Math.random() * tower.displayWidth, this.laneY + 40 - Math.random() * 120, 8 + Math.random() * 10, 0xcfc6ae, 0.85);
      this.uiCamera.ignore(puff);
      this.tweens.add({ targets: puff, scale: 2.2, alpha: 0, y: puff.y - 30, delay: 300 + Math.random() * 600, duration: 700, onComplete: () => puff.destroy() });
    }
    this.cameras.main.shake(700, 0.012);
  },

  playVictoryFx() {
    const { width, height } = LOGICAL_SIZE;
    const flash = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0.7).setDepth(4000);
    this.cameras.main.ignore(flash);
    this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
    this.crumbleTower(this.enemyBase);
    playSfxFile('/audio/sfx/bubble_bomb.wav', { gain: 0.7 });
    // Surviving Axies hop for joy, staggered so it reads as a crowd.
    this.playerUnits.forEach((unit, i) => {
      const s = unit.spriteImage;
      if (!s || unit.hp <= 0) return;
      this.tweens.add({ targets: s, y: s.y - 16, duration: 160, yoyo: true, repeat: 3, delay: 200 + (i % 8) * 60, ease: 'Quad.out' });
    });
  },

  playDefeatFx() {
    this.crumbleTower(this.base);
    for (const enemy of this.enemies) {
      const s = enemy.spriteImage;
      if (s && enemy.hp > 0) this.tweens.add({ targets: s, y: s.y - 10, duration: 200, yoyo: true, repeat: 2 });
    }
    for (const unit of this.playerUnits) {
      if (unit.spriteImage) this.tweens.add({ targets: unit.spriteImage, alpha: 0.55, duration: 600 });
    }
  },
};

// Per-saga battle themes (unused kit tracks now in rotation).
export const SAGA_BATTLE_MUSIC = {
  saga1: '/audio/bgm_battle.mp3',
  saga2: '/audio/bgm_pve1.wav',
  saga3: '/audio/bgm_pve2.wav',
  saga4: '/audio/bgm_forest_theme.mp3',
  saga5: '/audio/bgm_arctic_theme.mp3',
  saga6: '/audio/bgm_pve3.wav',
  saga7: '/audio/bgm_battle.mp3',
};

export function installBattleFx(proto) {
  Object.assign(proto, methods);
}
