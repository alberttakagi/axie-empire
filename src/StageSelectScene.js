import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';
import { getEnergyState, trySpendEnergy } from './Energy.js';
import { getStageTier } from './Treasure.js';
import { preloadSagaBackgrounds, addSagaBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, createResourceBadge, drawBcPanel } from './UITheme.js';

const DIFFICULTY_COLOR = {
  Easy: 0x4caf50,
  Normal: BC.gold,
  Hard: BC.red,
  Boss: 0xa855f7,
};

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

  // Same saga backdrop art GameScene battles use (see Backdrop.js) —
  // loads all 3 rather than just this.sagaId's, since sagaId isn't known
  // until create() runs.
  preload() {
    preloadSagaBackgrounds(this);
  }

  create(data) {
    const { width, height } = this.scale;
    const progress = loadStageProgress();

    // Saga expansion (bible §A.6.1): STAGE_CONFIG.js stays one flat array
    // (see its own header), so this screen just filters down to one saga's
    // slice of it for display — the game's own default (no data passed,
    // e.g. a stale deep-link) falls back to the very first saga rather than
    // erroring.
    this.sagaId = data?.sagaId || STAGE_CONFIG[0].saga;
    this.sagaStages = STAGE_CONFIG.filter((stage) => stage.saga === this.sagaId);

    // Backdrop matches the chosen saga (see Backdrop.js), dimmed by a flat
    // scrim for the stage grid's own text/contrast — mirrors HomeScene's
    // treatment for the same reason (most of this screen is small text-
    // bearing cards over open background, not one narrow lane).
    addSagaBackground(this, this.sagaId);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);

    createTitlePill(this, 24, 26, 'Select Stage');
    createBackButton(this, () => this.scene.start('SagaSelectScene'));
    this.createEnergyDisplay();
    this.createStageGrid(progress);
    this.setupGridScroll();
  }

  // Energy/Stamina (bible §A.9) — the one piece of the old header worth
  // repeating here even though HomeScene now owns the full status bar:
  // it's what actually gates whether a tap on a stage tile below will
  // succeed, so the player shouldn't have to go back to Home to check it.
  createEnergyDisplay() {
    const { width } = this.scale;
    const { current, cap } = getEnergyState();
    createResourceBadge(this, width - 24, 26, 'NRG', `${current}/${cap}`, { valueColor: '#8fffb0' });
  }

  // Real Battle Cats chapters run 48 stages long (see STAGE_CONFIG.js's
  // saga1) — far more than a fixed 5-column, non-scrolling grid could ever
  // show on an 800x450 canvas at once (48 stages is 10 rows; this grid
  // alone would need ~870px of vertical space). Every card below goes into
  // `this.gridContainer` instead of directly onto the scene, so the whole
  // grid can be scrolled as one unit — see setupGridScroll. GRID_TOP/
  // GRID_BOTTOM bound the visible window the container scrolls within;
  // everything outside it (back button, energy readout, popups) is added
  // straight to the scene and stays fixed regardless of scroll position.
  createStageGrid(progress) {
    const { width } = this.scale;
    const totalWidth = GRID_COLS * CARD_WIDTH + (GRID_COLS - 1) * CARD_GAP;
    const startX = (width - totalWidth) / 2 + CARD_WIDTH / 2;
    const startY = 110;
    this.gridContainer = this.add.container(0, 0);

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

      const cardObjects = [];

      // Cream rounded card, black outline, gold ring once cleared (the
      // reference's own "CLEAR!" tiles get a distinct border rather than a
      // different fill) — replaces the previous flat difficulty-color fill,
      // which made cleared/uncleared/difficulty all fight for the same
      // visual channel.
      const g = this.add.graphics();
      g.fillStyle(BC.ink, 0.25);
      g.fillRoundedRect(x - CARD_WIDTH / 2 + 2, y - CARD_HEIGHT / 2 + 4, CARD_WIDTH, CARD_HEIGHT, 10);
      g.fillStyle(isUnlocked ? BC.panel : 0x4a4a4a, 1);
      g.fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
      g.lineStyle(isCleared ? 3 : 2, isUnlocked ? (isCleared ? BC.gold : BC.ink) : 0x222222, 1);
      g.strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
      cardObjects.push(g);

      // Difficulty tab — a small colored ribbon along the card's own top
      // edge instead of dyeing the whole card, so cleared/locked state
      // (border/fill above) and difficulty (this ribbon) read independently.
      if (isUnlocked) {
        const ribbon = this.add.graphics();
        ribbon.fillStyle(DIFFICULTY_COLOR[stage.difficulty], 1);
        ribbon.fillRoundedRect(x - CARD_WIDTH / 2 + 4, y - CARD_HEIGHT / 2 + 4, 46, 14, 5);
        cardObjects.push(ribbon);
        cardObjects.push(
          this.add
            .text(x - CARD_WIDTH / 2 + 27, y - CARD_HEIGHT / 2 + 11, stage.difficulty, { fontFamily: FONT, fontSize: '8px', color: '#ffffff' })
            .setOrigin(0.5),
        );
      }

      const textColor = isUnlocked ? BC.inkHex : '#999999';
      cardObjects.push(
        this.add
          .text(x, y - 12, `${localIndex + 1}. ${stage.displayName}`, {
            fontFamily: FONT, fontSize: '10px',
            color: textColor,
            align: 'center',
            wordWrap: { width: CARD_WIDTH - 8 },
          })
          .setOrigin(0.5),
      );

      const statusLabel = !isUnlocked
        ? 'Locked'
        : isCleared
          ? `Best: ${stageProgress.bestScore}`
          : `Cost: ${stage.energyCost} NRG`;

      cardObjects.push(
        this.add
          .text(x, y + 20, statusLabel, {
            fontFamily: FONT, fontSize: '10px',
            color: isUnlocked ? '#7a5c1e' : '#999999',
          })
          .setOrigin(0.5),
      );

      // Treasure tier dot (bible §A.6.3) — top-right corner of the tile,
      // only drawn once a tier has actually been obtained for this stage.
      const tier = getStageTier(stage.id);
      if (isUnlocked && tier > 0) {
        cardObjects.push(
          this.add
            .circle(x + CARD_WIDTH / 2 - 10, y - CARD_HEIGHT / 2 + 10, 6, TREASURE_TIER_COLORS[tier])
            .setStrokeStyle(1.5, BC.ink),
        );
      }

      // Restriction Stage badge (bible §A.6.5) — top-left corner, mirroring
      // the treasure dot's top-right placement. The specific restriction
      // details show up in the deploy-confirmation popup (see
      // showDeployPopup) rather than being spelled out on this small tile.
      if (isUnlocked && stage.restrictions) {
        cardObjects.push(
          this.add
            .circle(x - CARD_WIDTH / 2 + 10, y + CARD_HEIGHT / 2 - 10, 7, BC.red)
            .setStrokeStyle(1.5, 0xffffff),
        );
        cardObjects.push(
          this.add
            .text(x - CARD_WIDTH / 2 + 10, y + CARD_HEIGHT / 2 - 10, '!', { fontFamily: FONT, fontSize: '10px', color: '#ffffff' })
            .setOrigin(0.5),
        );
      }

      if (isUnlocked) {
        const hit = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.onStageSelected(stage));
        cardObjects.push(hit);
      }

      this.gridContainer.add(cardObjects);
    });

    // Bottom edge of the last row, used by setupGridScroll to clamp how far
    // the container can scroll (never past the grid's own actual content).
    const totalRows = Math.ceil(this.sagaStages.length / GRID_COLS);
    this.gridContentBottom = startY + (totalRows - 1) * (CARD_HEIGHT + ROW_GAP) + CARD_HEIGHT / 2 + 16;
  }

  // Mouse-wheel + drag-to-scroll for the stage grid (see createStageGrid's
  // own header for why this exists — 48 real stages don't fit one screen).
  // Deliberately simple/vertical-only, unlike GameScene's own zoom+pan
  // camera controls: this is a single scrollable list, not a 2D battlefield.
  setupGridScroll() {
    const { height } = this.scale;
    const visibleBottom = height - 16;
    const maxScroll = Math.max(0, this.gridContentBottom - visibleBottom);
    const clamp = (y) => Phaser.Math.Clamp(y, -maxScroll, 0);

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.gridContainer.y = clamp(this.gridContainer.y - deltaY);
    });

    let isDragging = false;
    let dragStartY = 0;
    let containerStartY = 0;
    this.input.on('pointerdown', (pointer) => {
      isDragging = true;
      dragStartY = pointer.y;
      containerStartY = this.gridContainer.y;
    });
    this.input.on('pointermove', (pointer) => {
      if (!isDragging || !pointer.isDown) return;
      this.gridContainer.y = clamp(containerStartY + (pointer.y - dragStartY));
    });
    this.input.on('pointerup', () => { isDragging = false; });
    this.input.on('pointerupoutside', () => { isDragging = false; });
  }

  // Deploy-confirmation popup (guide Chapter 06's 出撃確認ポップアップ) — every
  // stage tap opens this now, not just Restriction Stages: it shows the
  // stage name/difficulty, the Energy cost, any restrictions, and the
  // real game's own two-button choice ("とじる"/Close vs "いざ出陣!!"/Deploy!).
  // Previously only Restriction Stages got a popup at all; a normal stage
  // skipped straight into battle with no confirmation step.
  onStageSelected(stage) {
    this.showDeployPopup(stage);
  }

  enterStage(stage) {
    if (!trySpendEnergy(stage.energyCost)) {
      this.showInsufficientEnergyMessage();
      return;
    }

    this.scene.start('GameScene', { stageId: stage.id });
  }

  formatRestrictionLines(restrictions) {
    const lines = [];
    if (restrictions.maxDeployed) {
      lines.push(`Max ${restrictions.maxDeployed} units deployed at once`);
    }
    if (restrictions.bannedUnitTypes) {
      const names = restrictions.bannedUnitTypes.map((key) => UNIT_CONFIG[key]?.displayName || key);
      lines.push(`Banned: ${names.join(', ')}`);
    }
    if (restrictions.costRange) {
      lines.push(`Units must cost ${restrictions.costRange.min}-${restrictions.costRange.max}円`);
    }
    return lines;
  }

  showDeployPopup(stage) {
    if (this.deployPopupObjects) return;

    const { width, height } = this.scale;
    const objects = [];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setInteractive();
    objects.push(overlay);

    const panelWidth = 340;
    const panelHeight = stage.restrictions ? 230 : 190;
    const panelY = height / 2;
    objects.push(drawBcPanel(this, width / 2, panelY, panelWidth, panelHeight));

    objects.push(
      this.add
        .text(width / 2, panelY - panelHeight / 2 + 26, stage.displayName, { fontFamily: FONT, fontSize: '18px', color: BC.inkHex })
        .setOrigin(0.5),
    );
    objects.push(
      this.add
        .text(width / 2, panelY - panelHeight / 2 + 52, `${stage.difficulty}  ·  Cost: ${stage.energyCost} NRG`, {
          fontFamily: FONT, fontSize: '12px', color: '#7a5c1e',
        })
        .setOrigin(0.5),
    );

    if (stage.restrictions) {
      const lines = ['Restriction Stage:', ...this.formatRestrictionLines(stage.restrictions)];
      objects.push(
        this.add
          .text(width / 2, panelY - 20, lines.join('\n'), { fontFamily: FONT, fontSize: '11px', color: BC.inkHex, align: 'center', lineSpacing: 6 })
          .setOrigin(0.5),
      );
    }

    const buttonY = panelY + panelHeight / 2 - 40;
    objects.push(
      createBcButton(this, width / 2 - 84, buttonY, 130, 48, 'Close', () => this.hideDeployPopup(), {
        fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 14,
      }),
    );
    objects.push(
      createBcButton(this, width / 2 + 84, buttonY, 130, 48, 'Deploy!!', () => {
        this.hideDeployPopup();
        this.enterStage(stage);
      }, { fontSize: 14 }),
    );

    this.deployPopupObjects = objects;
  }

  hideDeployPopup() {
    if (!this.deployPopupObjects) return;
    this.deployPopupObjects.forEach((obj) => obj.destroy());
    this.deployPopupObjects = null;
  }

  showInsufficientEnergyMessage() {
    if (this.insufficientEnergyText) this.insufficientEnergyText.destroy();

    const { width, height } = this.scale;
    const text = this.add
      .text(width / 2, height - 20, 'Not enough Energy!', {
        fontFamily: FONT, fontSize: '14px',
        color: '#ff6666',
        stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.insufficientEnergyText = text;

    this.time.delayedCall(INSUFFICIENT_ENERGY_MESSAGE_MS, () => {
      // Compare against the specific instance THIS call created, not just
      // "is there currently a message showing" — tapping a second locked
      // stage within this delay replaces this.insufficientEnergyText with
      // a newer Text before this timer fires; without this check, this
      // timer would destroy that newer message and null the property out
      // from under its own (still-pending) delayedCall.
      if (this.insufficientEnergyText === text) {
        text.destroy();
        this.insufficientEnergyText = null;
      }
    });
  }
}
