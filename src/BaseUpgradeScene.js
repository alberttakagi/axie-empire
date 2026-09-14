import Phaser from 'phaser';
import { BASE_UPGRADE_CONFIG } from './BASE_UPGRADE_CONFIG.js';
import {
  loadPlayerProgress,
  getBaseUpgradeLevel,
  getNextBaseUpgradeCost,
  tryLevelUpBaseUpgrade,
} from './PlayerProgress.js';

// The account-wide half of the bible's §A.7.1 Upgrade Menu — Cannon Power/
// Charge, Base Defense, Research, Accounting, Study, Stamina Cap. Reachable
// from UpgradeScene (which handles the OTHER half, per-unit leveling) via
// its own "Base Upgrades" button, mirroring how the confirmed screenshots
// showed these as a separate tab/section from per-unit leveling.

const ROW_HEIGHT = 58;
const ROW_START_Y = 62;

export default class BaseUpgradeScene extends Phaser.Scene {
  constructor() {
    super('BaseUpgradeScene');
  }

  create() {
    const { width } = this.scale;

    this.add.text(width / 2, 20, 'Base Upgrades', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    const backButton = this.add.rectangle(50, 20, 80, 32, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 20, 'Back', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.scene.start('UpgradeScene'));

    this.xpText = this.add.text(width - 16, 20, '', { fontSize: '13px', color: '#ffdd33' }).setOrigin(1, 0.5);

    this.rowContainer = this.add.container(0, 0);
    this.refresh();
  }

  refresh() {
    this.rowContainer.removeAll(true);

    const progress = loadPlayerProgress();
    this.xpText.setText(`XP: ${Math.floor(progress.xp).toLocaleString()}`);

    Object.keys(BASE_UPGRADE_CONFIG).forEach((key, index) => {
      this.renderRow(key, ROW_START_Y + index * ROW_HEIGHT, progress);
    });
  }

  renderRow(key, y, progress) {
    const { width } = this.scale;
    const config = BASE_UPGRADE_CONFIG[key];
    const level = getBaseUpgradeLevel(key);
    const atCap = level >= config.maxLevel;
    const cost = getNextBaseUpgradeCost(key);
    const affordable = !atCap && progress.xp >= cost;

    const rowObjects = [];
    rowObjects.push(this.add.rectangle(width / 2, y, width - 32, ROW_HEIGHT - 8, 0x222222));
    rowObjects.push(
      this.add
        .text(30, y - 12, `${config.label}  (Lv ${level}/${config.maxLevel})`, { fontSize: '14px', color: '#ffffff' })
        .setOrigin(0, 0.5),
    );
    rowObjects.push(
      this.add.text(30, y + 10, config.description, { fontSize: '11px', color: '#aaaaaa' }).setOrigin(0, 0.5),
    );

    const buttonX = width - 130;
    const rect = this.add
      .rectangle(buttonX, y, 160, 40, 0x3366cc)
      .setInteractive({ useHandCursor: true })
      .setAlpha(atCap ? 0.4 : affordable ? 1 : 0.5);
    const label = this.add
      .text(buttonX, y, atCap ? 'MAX LEVEL' : `Upgrade\n${cost.toLocaleString()} XP`, {
        fontSize: '11px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    rect.on('pointerdown', () => {
      if (tryLevelUpBaseUpgrade(key).ok) this.refresh();
    });

    rowObjects.push(rect, label);
    this.rowContainer.add(rowObjects);
  }
}
