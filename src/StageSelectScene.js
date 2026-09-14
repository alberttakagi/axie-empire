import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';
import { loadPlayerProgress } from './PlayerProgress.js';
import { getEnergyState, trySpendEnergy } from './Energy.js';
import { getStageTier } from './Treasure.js';

const DIFFICULTY_COLOR = {
  Easy: 0x33cc33,
  Normal: 0xffcc33,
  Hard: 0xcc3333,
  Boss: 0xcc66ff,
};

const LOCKED_COLOR = 0x333333;
const TREASURE_TIER_COLORS = [null, 0xcd7f32, 0xc0c0c0, 0xffd700]; // index 0 (none) never drawn

const GRID_COLS = 5;
const CARD_WIDTH = 130;
const CARD_HEIGHT = 64;
const CARD_GAP = 8;
const ROW_GAP = 12;

const INSUFFICIENT_ENERGY_MESSAGE_MS = 1600;

export default class StageSelectScene extends Phaser.Scene {
  constructor() {
    super('StageSelectScene');
  }

  create() {
    const { width } = this.scale;
    const progress = loadStageProgress();

    this.add
      .text(width / 2, 24, 'Axie Skirmish', {
        fontSize: '26px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 52, 'Select Stage', {
        fontSize: '16px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.createStageGrid(progress);
    this.createTreasureButton();
    this.createUpgradeButton();
    this.createXpDisplay();
    this.createEnergyDisplay();
  }

  createUpgradeButton() {
    const { width } = this.scale;
    const x = width - 60;
    const y = 24;

    const rect = this.add
      .rectangle(x, y, 90, 32, 0x9933cc)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, 'Upgrade', { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    rect.on('pointerdown', () => this.scene.start('UpgradeScene'));
  }

  createTreasureButton() {
    const { width } = this.scale;
    const x = width - 158;
    const y = 24;

    const rect = this.add
      .rectangle(x, y, 96, 32, 0xcc9933)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, 'Treasure', { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    rect.on('pointerdown', () => this.scene.start('TreasureScene'));
  }

  // XP is the meta-progression currency spent in the Upgrade Menu (bible
  // §A.5.1) — shown here so the player has a reason to check the Upgrade
  // screen between runs without having to open it just to see the number.
  createXpDisplay() {
    const playerProgress = loadPlayerProgress();
    this.add
      .text(16, 24, `XP: ${Math.floor(playerProgress.xp).toLocaleString()}`, {
        fontSize: '13px',
        color: '#ffdd33',
      })
      .setOrigin(0, 0.5);
  }

  // Energy/Stamina (bible §A.9) — shown on its own line so it doesn't
  // collide with the XP text above it (same overlap lesson learned in
  // UpgradeScene: don't share a row with a fixed-position neighbor without
  // checking both strings' actual widths).
  createEnergyDisplay() {
    const { current, cap } = getEnergyState();
    this.add
      .text(16, 44, `Energy: ${current}/${cap}`, {
        fontSize: '13px',
        color: '#66ccff',
      })
      .setOrigin(0, 0.5);
  }

  createStageGrid(progress) {
    const { width } = this.scale;
    const totalWidth = GRID_COLS * CARD_WIDTH + (GRID_COLS - 1) * CARD_GAP;
    const startX = (width - totalWidth) / 2 + CARD_WIDTH / 2;
    const startY = 110;

    STAGE_CONFIG.forEach((stage, index) => {
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);
      const x = startX + col * (CARD_WIDTH + CARD_GAP);
      const y = startY + row * (CARD_HEIGHT + ROW_GAP);

      const previousStage = STAGE_CONFIG[index - 1];
      const isUnlocked = index === 0 || progress[previousStage.id]?.cleared === true;
      const stageProgress = progress[stage.id];
      const isCleared = stageProgress?.cleared === true;

      const fillColor = isUnlocked ? DIFFICULTY_COLOR[stage.difficulty] : LOCKED_COLOR;
      const rect = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, fillColor).setAlpha(isUnlocked ? 1 : 0.6);

      this.add
        .text(x, y - 24, `${index + 1}. ${stage.displayName}`, {
          fontSize: '10px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: CARD_WIDTH - 8 },
        })
        .setOrigin(0.5)
        .setAlpha(isUnlocked ? 1 : 0.7);

      this.add
        .text(x, y - 6, `${stage.difficulty}  ·  E:${stage.energyCost}`, {
          fontSize: '9px',
          color: '#000000',
        })
        .setOrigin(0.5)
        .setAlpha(isUnlocked ? 0.8 : 0.5);

      const statusLabel = !isUnlocked
        ? 'Locked'
        : isCleared
          ? `Best: ${stageProgress.bestScore}`
          : 'Not cleared';

      this.add
        .text(x, y + 14, statusLabel, {
          fontSize: '10px',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setAlpha(isUnlocked ? 1 : 0.7);

      // Treasure tier dot (bible §A.6.3) — top-right corner of the tile,
      // only drawn once a tier has actually been obtained for this stage.
      const tier = getStageTier(stage.id);
      if (isUnlocked && tier > 0) {
        this.add
          .circle(x + CARD_WIDTH / 2 - 10, y - CARD_HEIGHT / 2 + 10, 6, TREASURE_TIER_COLORS[tier])
          .setStrokeStyle(1, 0xffffff);
      }

      if (isUnlocked) {
        rect.setInteractive({ useHandCursor: true });
        rect.on('pointerdown', () => this.onStageSelected(stage));
      }
    });
  }

  onStageSelected(stage) {
    if (!trySpendEnergy(stage.energyCost)) {
      this.showInsufficientEnergyMessage();
      return;
    }

    this.scene.start('GameScene', { stageId: stage.id });
  }

  showInsufficientEnergyMessage() {
    if (this.insufficientEnergyText) this.insufficientEnergyText.destroy();

    const { width, height } = this.scale;
    this.insufficientEnergyText = this.add
      .text(width / 2, height - 20, 'Not enough Energy!', {
        fontSize: '14px',
        color: '#ff6666',
      })
      .setOrigin(0.5);

    this.time.delayedCall(INSUFFICIENT_ENERGY_MESSAGE_MS, () => {
      if (this.insufficientEnergyText) {
        this.insufficientEnergyText.destroy();
        this.insufficientEnergyText = null;
      }
    });
  }
}
