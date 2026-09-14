import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';

const DIFFICULTY_COLOR = {
  Easy: 0x33cc33,
  Normal: 0xffcc33,
  Hard: 0xcc3333,
  Boss: 0xcc66ff,
};

const LOCKED_COLOR = 0x333333;

const GRID_COLS = 5;
const CARD_WIDTH = 130;
const CARD_HEIGHT = 64;
const CARD_GAP = 8;
const ROW_GAP = 12;

const ENDLESS_BUTTON_WIDTH = 260;
const ENDLESS_BUTTON_HEIGHT = 60;

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
    this.createEndlessButton();
  }

  createStageGrid(progress) {
    const { width } = this.scale;
    const rows = Math.ceil(STAGE_CONFIG.length / GRID_COLS);
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
        .text(x, y - 20, `${index + 1}. ${stage.displayName}`, {
          fontSize: '10px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: CARD_WIDTH - 8 },
        })
        .setOrigin(0.5)
        .setAlpha(isUnlocked ? 1 : 0.7);

      this.add
        .text(x, y, stage.difficulty, {
          fontSize: '10px',
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
        .text(x, y + 20, statusLabel, {
          fontSize: '10px',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setAlpha(isUnlocked ? 1 : 0.7);

      if (isUnlocked) {
        rect.setInteractive({ useHandCursor: true });
        rect.on('pointerdown', () => this.onStageSelected(stage));
      }
    });
  }

  onStageSelected(stage) {
    this.scene.start('GameScene', { mode: 'stage', stageId: stage.id });
  }

  createEndlessButton() {
    const { width, height } = this.scale;
    const x = width / 2;
    const y = height - ENDLESS_BUTTON_HEIGHT / 2 - 24;

    const rect = this.add
      .rectangle(x, y, ENDLESS_BUTTON_WIDTH, ENDLESS_BUTTON_HEIGHT, 0x3366cc)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, 'Endless Mode', {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Pass data explicitly (never omit it): Phaser's scene.start only overwrites
    // a scene's stored data when given a truthy value, so an argument-less call
    // here would silently resume whatever mode/stageId GameScene last ran with.
    rect.on('pointerdown', () => this.scene.start('GameScene', { mode: 'endless' }));
  }
}
