import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';
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

  create(data) {
    const { width } = this.scale;
    const progress = loadStageProgress();

    // Saga expansion (bible §A.6.1): STAGE_CONFIG.js stays one flat array
    // (see its own header), so this screen just filters down to one saga's
    // slice of it for display — the game's own default (no data passed,
    // e.g. a stale deep-link) falls back to the very first saga rather than
    // erroring.
    this.sagaId = data?.sagaId || STAGE_CONFIG[0].saga;
    this.sagaStages = STAGE_CONFIG.filter((stage) => stage.saga === this.sagaId);

    this.add
      .text(width / 2, 24, 'Select Stage', {
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.createBackButton();
    this.createEnergyDisplay();
    this.createStageGrid(progress);
  }

  createBackButton() {
    const rect = this.add.rectangle(50, 24, 80, 32, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 24, 'Sagas', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    rect.on('pointerdown', () => this.scene.start('SagaSelectScene'));
  }

  // Energy/Stamina (bible §A.9) — the one piece of the old header worth
  // repeating here even though HomeScene now owns the full status bar:
  // it's what actually gates whether a tap on a stage tile below will
  // succeed, so the player shouldn't have to go back to Home to check it.
  createEnergyDisplay() {
    const { width } = this.scale;
    const { current, cap } = getEnergyState();
    this.add
      .text(width - 16, 24, `Energy: ${current}/${cap}`, {
        fontSize: '13px',
        color: '#66ccff',
      })
      .setOrigin(1, 0.5);
  }

  createStageGrid(progress) {
    const { width } = this.scale;
    const totalWidth = GRID_COLS * CARD_WIDTH + (GRID_COLS - 1) * CARD_GAP;
    const startX = (width - totalWidth) / 2 + CARD_WIDTH / 2;
    const startY = 110;

    this.sagaStages.forEach((stage, localIndex) => {
      const col = localIndex % GRID_COLS;
      const row = Math.floor(localIndex / GRID_COLS);
      const x = startX + col * (CARD_WIDTH + CARD_GAP);
      const y = startY + row * (CARD_HEIGHT + ROW_GAP);

      // Unlock state is resolved against STAGE_CONFIG's GLOBAL flat index,
      // not this screen's per-saga local index — this is what keeps a saga
      // boundary working as a plain continuation of the same sequential
      // chain (this saga's stage 1 unlocks only once the PREVIOUS saga's
      // final stage is cleared), with zero changes to the unlock logic
      // itself.
      const globalIndex = STAGE_CONFIG.indexOf(stage);
      const previousStage = STAGE_CONFIG[globalIndex - 1];
      const isUnlocked = globalIndex === 0 || progress[previousStage.id]?.cleared === true;
      const stageProgress = progress[stage.id];
      const isCleared = stageProgress?.cleared === true;

      const fillColor = isUnlocked ? DIFFICULTY_COLOR[stage.difficulty] : LOCKED_COLOR;
      const rect = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, fillColor).setAlpha(isUnlocked ? 1 : 0.6);

      this.add
        .text(x, y - 24, `${localIndex + 1}. ${stage.displayName}`, {
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

      // Restriction Stage badge (bible §A.6.5) — top-left corner, mirroring
      // the treasure dot's top-right placement. The specific restriction
      // details show up as a message in GameScene when a blocked action is
      // actually attempted, rather than being spelled out on this small tile.
      if (isUnlocked && stage.restrictions) {
        this.add
          .circle(x - CARD_WIDTH / 2 + 10, y - CARD_HEIGHT / 2 + 10, 6, 0xcc3333)
          .setStrokeStyle(1, 0xffffff);
        this.add
          .text(x - CARD_WIDTH / 2 + 10, y - CARD_HEIGHT / 2 + 10, 'R', { fontSize: '8px', color: '#ffffff' })
          .setOrigin(0.5);
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
