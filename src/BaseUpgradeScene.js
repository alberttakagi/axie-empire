import Phaser from 'phaser';
import { BASE_UPGRADE_CONFIG } from './BASE_UPGRADE_CONFIG.js';
import {
  loadPlayerProgress,
  getBaseUpgradeLevel,
  getNextBaseUpgradeCost,
  tryLevelUpBaseUpgrade,
} from './PlayerProgress.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, drawWoodFrame } from './UITheme.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';

// The account-wide half of the bible's §A.7.1 Upgrade Menu — Cannon Power/
// Charge, Base Defense, Research, Accounting, Study, Stamina Cap. Reachable
// from UpgradeScene (which handles the OTHER half, per-unit leveling) via
// its own "Base Upgrades" button, mirroring how the confirmed screenshots
// showed these as a separate tab/section from per-unit leveling.

// Tight enough that all 8 real BASE_UPGRADE_CONFIG rows fit above the
// bottom-left Back button on an 800x450 canvas with no scrolling — this
// screen previously ran 58px/row from y=66 (530px of content on a 450px
// canvas), pushing the last 2 rows and the Back button off-screen entirely
// and undiscovered until this pass's live check surfaced it.
const ROW_HEIGHT = 40;
const ROW_START_Y = 58;

export default class BaseUpgradeScene extends Phaser.Scene {
  constructor() {
    super('BaseUpgradeScene');
  }

  preload() {
    preloadBackgrounds(this);
  }

  create() {
    const { width, height } = this.scale;

    // Matches its sibling UpgradeScene's own backdrop (reached from the
    // same "Power Up" flow) — this screen previously had none at all.
    addBackground(this, 'metamorph2');
    drawWoodFrame(this, width, height);
    createTitlePill(this, 24, 22, 'Base Upgrades');
    createBackButton(this, () => this.scene.start('UpgradeScene'));

    this.xpText = this.add
      .text(width - 24, 22, '', { fontFamily: FONT, fontSize: '15px', color: '#7fe0ff', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(1, 0.5);

    this.rowContainer = this.add.container(0, 0);
    this.refresh();
  }

  refresh() {
    this.rowContainer.removeAll(true);

    const progress = loadPlayerProgress();
    this.xpText.setText(`XP ${Math.floor(progress.xp).toLocaleString()}`);

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
    const rowWidth = width - 32;
    const cardHeight = ROW_HEIGHT - 6;
    const g = this.add.graphics();
    g.fillStyle(BC.ink, 0.2);
    g.fillRoundedRect(width / 2 - rowWidth / 2 + 2, y - cardHeight / 2 + 2, rowWidth, cardHeight, 10);
    g.fillStyle(BC.panel, 1);
    g.fillRoundedRect(width / 2 - rowWidth / 2, y - cardHeight / 2, rowWidth, cardHeight, 10);
    g.lineStyle(2, BC.ink, 1);
    g.strokeRoundedRect(width / 2 - rowWidth / 2, y - cardHeight / 2, rowWidth, cardHeight, 10);
    rowObjects.push(g);

    rowObjects.push(
      this.add
        .text(30, y - 9, `${config.label}  (Lv ${level}/${config.maxLevel})`, { fontFamily: FONT, fontSize: '12px', color: BC.inkHex })
        .setOrigin(0, 0.5),
    );
    rowObjects.push(
      this.add.text(30, y + 8, config.description, { fontFamily: FONT, fontSize: '9px', color: '#5a5a5a' }).setOrigin(0, 0.5),
    );

    const buttonX = width - 110;
    rowObjects.push(
      createBcButton(this, buttonX, y, 150, cardHeight - 2, atCap ? 'MAX LEVEL' : `Upgrade — ${cost.toLocaleString()} XP`, () => {
        if (tryLevelUpBaseUpgrade(key).ok) this.refresh();
      }, {
        fontSize: 10,
        fill: atCap ? 0x8a8a8a : affordable ? BC.blue : 0x6a6a6a,
        highlight: atCap ? 0xbbbbbb : BC.blueHighlight,
        textColor: '#ffffff',
      }),
    );
    this.rowContainer.add(rowObjects);
  }
}
