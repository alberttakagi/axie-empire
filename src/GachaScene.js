import Phaser from 'phaser';
import { loadPlayerProgress } from './PlayerProgress.js';
import {
  GACHA_SINGLE_ROLL_COST,
  GACHA_MULTI_ROLL_COUNT,
  GACHA_MULTI_ROLL_COST,
  rollSingle,
  rollMulti,
} from './Gacha.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, createResourceBadge, drawBcPanel } from './UITheme.js';

// The bible's §A.10.7 Gacha screen — adapted per Gacha.js's scope note
// (reward-tier pulls instead of unit rolls, since this build's roster has
// no unowned units to grant). Same UI beats as the reference: a roll-cost
// button for both a single pull and a bulk multi-pull, and a reveal list
// after rolling.

export default class GachaScene extends Phaser.Scene {
  constructor() {
    super('GachaScene');
  }

  preload() {
    preloadBackgrounds(this);
  }

  create() {
    const { width, height } = this.scale;

    addBackground(this, 'metamorph');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);

    createTitlePill(this, 24, 26, 'Gacha');
    createBackButton(this, () => this.scene.start('HomeScene'));

    // Banner panel — a real gacha screen's whole top half is a giant
    // rotating art banner; without banner art this build shows a plain
    // cream panel as its stand-in, which at least reads as "a screen
    // region," not empty space.
    drawBcPanel(this, width / 2, 96, width - 64, 100, { fill: 0x2a1f3d });
    this.add
      .text(width / 2, 96, 'Axie Gacha', { fontFamily: FONT, fontSize: '20px', color: '#ffd27f' })
      .setOrigin(0.5);

    this.createRollButton(width / 2 - 130, `Single Roll\n${GACHA_SINGLE_ROLL_COST} Gems`, () => rollSingle());
    this.createRollButton(
      width / 2 + 130,
      `${GACHA_MULTI_ROLL_COUNT}x Roll\n${GACHA_MULTI_ROLL_COST} Gems`,
      () => rollMulti(),
      { fill: BC.gold, textColor: BC.goldInk },
    );

    drawBcPanel(this, width / 2, 250, width - 64, 130);
    this.resultText = this.add.text(width / 2, 200, '', {
      fontFamily: FONT, fontSize: '12px',
      color: BC.inkHex,
      align: 'center',
      wordWrap: { width: width - 100 },
    }).setOrigin(0.5, 0);

    this.refreshGems();
  }

  createRollButton(x, label, rollFn, opts = {}) {
    const y = 165;
    const button = createBcButton(this, x, y, 220, 60, label, () => {
      const result = rollFn();
      if (!result.ok) {
        this.resultText.setText('Not enough Gems!');
        return;
      }
      this.resultText.setText(result.rewards.map((label, index) => `${index + 1}. ${label}`).join('\n'));
      this.refreshGems();
    }, { fill: 0xb98cff, highlight: 0xd9c3ff, textColor: '#2a1a3a', fontSize: 14, ...opts });
    return button;
  }

  // Recreated rather than updated in place — createResourceBadge sizes its
  // pill/tag background graphics once, off the INITIAL value's text width;
  // a wider number after a roll would otherwise overflow past that
  // now-too-small background instead of the pill growing with it.
  refreshGems() {
    const progress = loadPlayerProgress();
    if (this.gemsBadge) this.gemsBadge.destroy();
    this.gemsBadge = createResourceBadge(this, this.scale.width - 24, 26, 'GEM', progress.gems, { valueColor: '#ffd27f' });
  }
}
