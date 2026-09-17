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
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);

    this.add.text(width / 2, 20, 'Gacha', { fontFamily: 'Rowdies, sans-serif', fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);

    const backButton = this.add.rectangle(50, 20, 80, 32, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 20, 'Back', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.scene.start('HomeScene'));

    this.gemsText = this.add
      .text(width - 16, 20, '', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#66ddff' })
      .setOrigin(1, 0.5);

    this.createRollButton(width / 2 - 130, `Single Roll\n${GACHA_SINGLE_ROLL_COST} Gems`, () => rollSingle());
    this.createRollButton(
      width / 2 + 130,
      `${GACHA_MULTI_ROLL_COUNT}x Roll\n${GACHA_MULTI_ROLL_COST} Gems`,
      () => rollMulti(),
    );

    this.resultText = this.add.text(width / 2, 200, '', {
      fontFamily: 'Rowdies, sans-serif', fontSize: '12px',
      color: '#ffdd33',
      align: 'center',
      wordWrap: { width: width - 80 },
    }).setOrigin(0.5, 0);

    this.refreshGems();
  }

  createRollButton(x, label, rollFn) {
    const y = 100;
    const rect = this.add.rectangle(x, y, 220, 60, 0x9933cc).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff', align: 'center' }).setOrigin(0.5);

    rect.on('pointerdown', () => {
      const result = rollFn();
      if (!result.ok) {
        this.resultText.setText('Not enough Gems!');
        return;
      }
      this.resultText.setText(result.rewards.map((label, index) => `${index + 1}. ${label}`).join('\n'));
      this.refreshGems();
    });
  }

  refreshGems() {
    const progress = loadPlayerProgress();
    this.gemsText.setText(`Gems: ${progress.gems.toLocaleString()}`);
  }
}
