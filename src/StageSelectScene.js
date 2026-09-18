import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';
import { getEnergyState, trySpendEnergy } from './Energy.js';
import { getStageTier } from './Treasure.js';
import { preloadSagaBackgrounds, addSagaBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcButton, createBcCircleButton, createTitlePill, createResourceBadge, drawBcPanel } from './UITheme.js';

const DIFFICULTY_COLOR = {
  Easy: 0x4caf50,
  Normal: BC.gold,
  Hard: BC.red,
  Boss: 0xa855f7,
};

const TREASURE_TIER_COLORS = [null, 0xcd7f32, 0xc0c0c0, 0xffd700]; // index 0 (none) never drawn

const INSUFFICIENT_ENERGY_MESSAGE_MS = 1600;

// Map view (guide Chapter 06's own マップ選択: stage icons strung along a
// path on a map, not a grid of cards) — a horizontally-scrollable strip of
// small dot markers connected by a dotted line in stage order, echoing the
// reference's own "red dots on a winding trail" look. No real Japan-map art
// exists in this repo, so the "map" is the saga backdrop itself; the path's
// gentle vertical wave (NODE_WAVE_*) is what reads as a trail rather than a
// flat row of icons.
const NODE_SPACING_X = 88;
const NODE_WAVE_AMPLITUDE = 46;
const NODE_WAVE_PERIOD = 6; // stages per full up/down cycle
const MAP_VIEWPORT_TOP = 64;
const MAP_VIEWPORT_BOTTOM = 396;
const MAP_CENTER_Y = (MAP_VIEWPORT_TOP + MAP_VIEWPORT_BOTTOM) / 2;
const DOT_TRAIL_STEP = 10; // px between each small dot of the connecting dotted line

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

    // Map container is created (and populated) BEFORE the header — its own
    // geometry mask keeps it strictly inside MAP_VIEWPORT_TOP/BOTTOM, but a
    // scrolled-past-content bug previously let stage cards visually cover
    // the title/energy readout (added first, so the grid — added after —
    // painted over it once scrolled). Building the header last guarantees
    // it always draws on top regardless, and the mask is the real fix.
    this.createStageMap(progress);
    this.setupMapScroll();

    createTitlePill(this, 24, 26, 'Select Stage');
    createBackButton(this, () => this.scene.start('SagaSelectScene'));
    this.createEnergyDisplay();
    this.createMapArrows();
  }

  // Energy/Stamina (bible §A.9) — the one piece of the old header worth
  // repeating here even though HomeScene now owns the full status bar:
  // it's what actually gates whether a tap on a stage tile below will
  // succeed, so the player shouldn't have to go back to Home to check it.
  createEnergyDisplay() {
    const { width } = this.scale;
    const { current, cap } = getEnergyState();
    createResourceBadge(this, width - 24, 26, 'ENERGY', `${current}/${cap}`, { valueColor: '#8fffb0' });
  }

  // A stage's position along the winding path — shared by node rendering
  // and the dotted connector so both agree exactly on where each stage is.
  nodePosition(localIndex) {
    const x = 60 + localIndex * NODE_SPACING_X;
    const y = MAP_CENTER_Y + Math.sin((localIndex / NODE_WAVE_PERIOD) * Math.PI * 2) * NODE_WAVE_AMPLITUDE;
    return { x, y };
  }

  // Real Battle Cats chapters run 48 stages long (see STAGE_CONFIG.js's
  // saga1) — far more than one screen could ever show as full-size cards.
  // Guide Chapter 06's own マップ選択 strings stage icons along a path on a
  // map instead of a card grid; this reproduces that shape — small dot
  // markers in stage order, connected by a dotted trail, laid out along a
  // gentle sine wave (see nodePosition) so it reads as a winding path
  // rather than a flat row — scrolled horizontally as one unit inside
  // `this.mapContainer`. A geometry mask clips the container strictly to
  // MAP_VIEWPORT_TOP/BOTTOM so scrolled content can never visually bleed
  // into the header or footer, regardless of scroll position (see
  // setupMapScroll's own note on the bug this replaces).
  createStageMap(progress) {
    const { width } = this.scale;
    this.mapContainer = this.add.container(0, 0);

    const maskShape = this.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, MAP_VIEWPORT_TOP, width, MAP_VIEWPORT_BOTTOM - MAP_VIEWPORT_TOP);
    this.mapContainer.setMask(maskShape.createGeometryMask());

    // Dotted connector FIRST (so every node's own marker/label draws on
    // top of the line passing behind it, not the other way around).
    const positions = this.sagaStages.map((_, i) => this.nodePosition(i));
    const trailDots = this.add.graphics();
    trailDots.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < positions.length - 1; i += 1) {
      const a = positions[i];
      const b = positions[i + 1];
      const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      const steps = Math.max(1, Math.round(dist / DOT_TRAIL_STEP));
      for (let s = 1; s < steps; s += 1) {
        const t = s / steps;
        trailDots.fillCircle(Phaser.Math.Linear(a.x, b.x, t), Phaser.Math.Linear(a.y, b.y, t), 2);
      }
    }
    this.mapContainer.add(trailDots);

    // The first unlocked-but-not-yet-cleared stage is "current" — the one
    // node that gets the bigger highlighted marker and an always-visible
    // name card, matching the reference's own single enlarged stage tile.
    const currentLocalIndex = this.sagaStages.findIndex((stage) => {
      const globalIndex = STAGE_CONFIG.indexOf(stage);
      const previousStage = STAGE_CONFIG[globalIndex - 1];
      const isUnlocked = globalIndex === 0 || progress[previousStage.id]?.cleared === true;
      return isUnlocked && progress[stage.id]?.cleared !== true;
    });
    this.currentLocalIndex = currentLocalIndex === -1 ? this.sagaStages.length - 1 : currentLocalIndex;

    this.sagaStages.forEach((stage, localIndex) => {
      const { x, y } = positions[localIndex];

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
      const isCurrent = localIndex === this.currentLocalIndex;

      const nodeObjects = [];
      const radius = isCurrent ? 16 : 9;
      const fill = !isUnlocked ? 0x777777 : DIFFICULTY_COLOR[stage.difficulty];
      const ringColor = isCleared ? BC.gold : BC.ink;

      nodeObjects.push(this.add.circle(x, y + 3, radius, 0x000000, 0.3)); // drop shadow
      const dot = this.add.circle(x, y, radius, fill).setStrokeStyle(isCurrent ? 4 : 2.5, ringColor);
      nodeObjects.push(dot);
      if (isCleared) {
        nodeObjects.push(this.add.text(x, y, '★', { fontFamily: FONT, fontSize: `${radius}px`, color: '#fff7cc' }).setOrigin(0.5));
      }

      // Treasure tier dot (bible §A.6.3) — small badge above-right of the
      // node, only drawn once a tier has actually been obtained.
      const tier = getStageTier(stage.id);
      if (isUnlocked && tier > 0) {
        nodeObjects.push(
          this.add.circle(x + radius - 2, y - radius, 5, TREASURE_TIER_COLORS[tier]).setStrokeStyle(1.5, BC.ink),
        );
      }
      // Restriction Stage badge (bible §A.6.5) — small red "!" badge
      // above-left, mirroring the treasure dot. Full details show in the
      // deploy-confirmation popup (see showDeployPopup).
      if (isUnlocked && stage.restrictions) {
        nodeObjects.push(this.add.circle(x - radius + 2, y - radius, 5, BC.red).setStrokeStyle(1.5, 0xffffff));
        nodeObjects.push(this.add.text(x - radius + 2, y - radius, '!', { fontFamily: FONT, fontSize: '7px', color: '#ffffff' }).setOrigin(0.5));
      }

      // Name label — alternates above/below the path per node so
      // consecutive close-together labels don't collide, same idea a real
      // hand-drawn map's own place-names use.
      const labelUp = localIndex % 2 === 0;
      const labelY = isCurrent ? y - radius - 34 : y + (labelUp ? -radius - 12 : radius + 12);
      nodeObjects.push(
        this.add
          .text(x, labelY, `${localIndex + 1}. ${stage.displayName}`, {
            fontFamily: FONT, fontSize: isCurrent ? '11px' : '9px',
            color: isUnlocked ? '#ffffff' : '#aaaaaa',
            align: 'center',
            stroke: '#000000', strokeThickness: 3,
            wordWrap: { width: NODE_SPACING_X + 20 },
          })
          .setOrigin(0.5, labelUp || isCurrent ? 1 : 0),
      );

      // The current node gets an always-visible little callout card
      // (cost/best-score) — every other node relies on the deploy popup
      // for that detail, same as the reference's own single enlarged tile.
      if (isCurrent) {
        const statusLabel = isCleared ? `Best: ${stageProgress.bestScore}` : `Cost: ${stage.energyCost} Energy`;
        nodeObjects.push(
          this.add
            .text(x, y - radius - 18, statusLabel, { fontFamily: FONT, fontSize: '9px', color: '#ffe58a', stroke: '#000000', strokeThickness: 3 })
            .setOrigin(0.5, 1),
        );
      }

      if (isUnlocked) {
        const hit = this.add.circle(x, y, radius + 10, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.onStageSelected(stage));
        nodeObjects.push(hit);
      }

      this.mapContainer.add(nodeObjects);
    });

    // Rightmost content edge, used by setupMapScroll to clamp how far the
    // container can scroll (never past the path's own actual end).
    this.mapContentRight = positions[positions.length - 1].x + 80;
  }

  // Auto-scroll (on load only) to center the current/next stage in the
  // viewport, so a returning player sees their actual progress immediately
  // instead of the saga's very first stage every time.
  centerOnCurrentStage() {
    const { width } = this.scale;
    const { x } = this.nodePosition(this.currentLocalIndex);
    const maxScroll = Math.max(0, this.mapContentRight - (width - 16));
    this.mapContainer.x = -Phaser.Math.Clamp(x - width / 2, 0, maxScroll);
  }

  // Mouse-wheel + drag-to-scroll for the stage map (see createStageMap's
  // own header for why this exists — 48 real stages don't fit one screen).
  // Horizontal-only, matching the reference's own left/right map scroll —
  // unlike GameScene's zoom+pan battle camera, this is a single scrollable
  // path, not a 2D battlefield.
  setupMapScroll() {
    const { width } = this.scale;
    const maxScroll = Math.max(0, this.mapContentRight - (width - 16));
    const clamp = (x) => Phaser.Math.Clamp(x, -maxScroll, 0);
    this.mapMaxScroll = maxScroll;
    this.mapScrollClamp = clamp;

    this.centerOnCurrentStage();

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.mapContainer.x = clamp(this.mapContainer.x - (deltaX || deltaY));
    });

    let isDragging = false;
    let dragStartX = 0;
    let containerStartX = 0;
    this.input.on('pointerdown', (pointer) => {
      if (pointer.y < MAP_VIEWPORT_TOP || pointer.y > MAP_VIEWPORT_BOTTOM) return;
      isDragging = true;
      dragStartX = pointer.x;
      containerStartX = this.mapContainer.x;
    });
    this.input.on('pointermove', (pointer) => {
      if (!isDragging || !pointer.isDown) return;
      this.mapContainer.x = clamp(containerStartX + (pointer.x - dragStartX));
    });
    this.input.on('pointerup', () => { isDragging = false; });
    this.input.on('pointerupoutside', () => { isDragging = false; });
  }

  // Left/right arrow buttons at the map viewport's own edges (reference:
  // big triangular arrows flanking the map) — a discoverable alternative
  // to drag-scrolling, one "page" (a handful of stages) per tap.
  createMapArrows() {
    const { width } = this.scale;
    const y = MAP_CENTER_Y;
    const pageStep = NODE_SPACING_X * 3;

    createBcCircleButton(this, 16, y, 20, '◀', () => {
      this.mapContainer.x = this.mapScrollClamp(this.mapContainer.x + pageStep);
    }, { fill: 0x8a8a8a, highlight: 0xbbbbbb });
    createBcCircleButton(this, width - 16, y, 20, '▶', () => {
      this.mapContainer.x = this.mapScrollClamp(this.mapContainer.x - pageStep);
    }, { fill: 0x8a8a8a, highlight: 0xbbbbbb });
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
        .text(width / 2, panelY - panelHeight / 2 + 52, `${stage.difficulty}  ·  Cost: ${stage.energyCost} Energy`, {
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
