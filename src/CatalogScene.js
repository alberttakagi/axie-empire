import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { ENEMY_CONFIG } from './ENEMY_CONFIG.js';
import { preloadSpriteRoster, addUnitIcon } from './SpriteIcon.js';
import { describeUnit } from './UnitDescription.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcCircleButton, createTitlePill, drawBcPanel } from './UITheme.js';

// Battle Cats reference: にゃんこ図鑑 (Cat Guide) / 敵キャラ図鑑 (Enemy Character
// Guide) — a browsable catalog of every unit/enemy: a grid of portraits,
// tap one for a detail view (bigger portrait + description) with
// left/right arrows to page through the whole roster without going back
// to the grid each time. One scene handles both guides (`data.rosterType`)
// since they're structurally identical browsers over UNIT_CONFIG vs
// ENEMY_CONFIG — see HomeScene's Menu popup for how each is launched.
//
// The real game's guide entries carry hand-written flavor text; we don't
// have that, so the detail view shows describeUnit()'s ability/matchup
// summary instead (same one Character Formation's hover tooltip uses) —
// still "what makes this one different," just mechanical rather than
// narrative.

const CARD_WIDTH = 120;
const CARD_HEIGHT = 96;
const CARD_GAP = 10;
const CARDS_PER_ROW = 6;
const GRID_START_Y = 110;

export default class CatalogScene extends Phaser.Scene {
  constructor() {
    super('CatalogScene');
  }

  preload() {
    preloadSpriteRoster(this, UNIT_CONFIG, true);
    preloadSpriteRoster(this, ENEMY_CONFIG, false);
    preloadBackgrounds(this);
  }

  create(data) {
    const { width, height } = this.scale;
    this.rosterType = data?.rosterType === 'enemies' ? 'enemies' : 'units';
    this.roster = this.rosterType === 'enemies' ? ENEMY_CONFIG : UNIT_CONFIG;
    this.isPlayerSide = this.rosterType === 'units';
    this.keys = Object.keys(this.roster);
    this.detailIndex = 0;

    addBackground(this, 'temple');
    // Teal graph-paper tint (reference screenshot's にゃんこ図鑑 background)
    // instead of a flat dark scrim, so this guide reads visually distinct
    // from the wood-frame hub screens.
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d3b44, 0.55);

    createTitlePill(this, 24, 22, this.rosterType === 'enemies' ? 'Enemy Guide' : 'Unit Guide');
    createBackButton(this, () => this.scene.start('HomeScene'));

    this.contentContainer = this.add.container(0, 0);
    this.renderGrid();
  }

  renderGrid() {
    this.contentContainer.removeAll(true);
    const { width } = this.scale;
    const totalRows = Math.ceil(this.keys.length / CARDS_PER_ROW);

    this.keys.forEach((key, index) => {
      const row = Math.floor(index / CARDS_PER_ROW);
      const col = index % CARDS_PER_ROW;
      // Each row is centered on ITS OWN card count, not a fixed
      // CARDS_PER_ROW-wide block — a short final row (10 units -> 6+4, 13
      // enemies -> 6+6+1) used to reuse the full-row startX regardless,
      // rendering flush to the grid's left edge instead of centered.
      const cardsInRow = row === totalRows - 1 ? this.keys.length - row * CARDS_PER_ROW : CARDS_PER_ROW;
      const rowWidth = cardsInRow * CARD_WIDTH + (cardsInRow - 1) * CARD_GAP;
      const startX = (width - rowWidth) / 2 + CARD_WIDTH / 2;
      const x = startX + col * (CARD_WIDTH + CARD_GAP);
      const y = GRID_START_Y + row * (CARD_HEIGHT + CARD_GAP);
      this.renderGridCard(key, x, y, index);
    });
  }

  renderGridCard(key, x, y, index) {
    const config = this.roster[key];
    // White/black-outline card (matches every other roster-browsing screen
    // in this pass) instead of a per-unit flat color fill.
    const g = this.add.graphics();
    g.fillStyle(BC.ink, 0.2);
    g.fillRoundedRect(x - CARD_WIDTH / 2 + 2, y - CARD_HEIGHT / 2 + 3, CARD_WIDTH, CARD_HEIGHT, 10);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
    g.lineStyle(2, BC.ink, 1);
    g.strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
    // idleAnimated (last arg): a gentle float instead of a dead-still
    // portrait — this guide is nothing but static cards otherwise.
    const icon = addUnitIcon(this, x, y - 18, config, CARD_HEIGHT - 48, this.isPlayerSide, false, true);
    // Character name first (e.g. "Buba"), role second and smaller — this
    // guide is about browsing specific characters, not picking a role.
    // Label sits a bit higher than a single-line name needs, since a few
    // longer names (e.g. "Aquatic Flowering Slime") wrap to two lines.
    const label = this.add
      .text(x, y + CARD_HEIGHT / 2 - 24, config.characterName, {
        fontFamily: FONT, fontSize: '10px',
        color: BC.inkHex,
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 8 },
      })
      .setOrigin(0.5);
    const roleLabel = this.add
      .text(x, y + CARD_HEIGHT / 2 - 6, `(${config.abilityLabel || config.displayName})`, {
        fontFamily: FONT, fontSize: '8px',
        color: '#5a5a5a',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 8 },
      })
      .setOrigin(0.5);

    const hit = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.showDetail(index));

    const objects = [g, label, roleLabel, hit];
    if (icon) objects.splice(1, 0, icon);
    this.contentContainer.add(objects);
  }

  showDetail(index) {
    this.detailIndex = index;
    this.renderDetail();
  }

  renderDetail() {
    this.contentContainer.removeAll(true);
    const { width, height } = this.scale;
    const key = this.keys[this.detailIndex];
    const config = this.roster[key];

    const panel = drawBcPanel(this, width / 2, height / 2 + 22, width - 60, height - 96, { radius: 24 });

    const icon = addUnitIcon(this, width / 2, 138, config, 100, this.isPlayerSide, false, true); // idleAnimated
    // Character name first (e.g. "Buba"), role second and smaller — same
    // ordering as the grid card and Character Formation.
    const nameText = this.add
      .text(width / 2, 198, config.characterName, { fontFamily: FONT, fontSize: '16px', color: BC.inkHex })
      .setOrigin(0.5);
    const roleText = this.add
      .text(width / 2, 216, `(${config.abilityLabel || config.displayName})`, { fontFamily: FONT, fontSize: '11px', color: '#7a5c1e' })
      .setOrigin(0.5);

    const lines = describeUnit(config);
    const descText = this.add
      .text(width / 2, 236, lines.map((line) => `• ${line}`).join('\n'), {
        fontFamily: FONT, fontSize: '11px',
        color: BC.inkHex,
        align: 'left',
        wordWrap: { width: width - 120 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    // Nav arrows page through the whole roster without returning to the
    // grid each time — mirrors the reference guide's own left/right arrows.
    const prevButton = createBcCircleButton(this, 40, height / 2 + 22, 22, '◀', () => {
      this.detailIndex = (this.detailIndex - 1 + this.keys.length) % this.keys.length;
      this.renderDetail();
    });
    const nextButton = createBcCircleButton(this, width - 40, height / 2 + 22, 22, '▶', () => {
      this.detailIndex = (this.detailIndex + 1) % this.keys.length;
      this.renderDetail();
    });

    const closeButton = createBcCircleButton(this, width - 30, 30, 16, '✕', () => this.renderGrid());

    const objects = [panel, nameText, roleText, descText, prevButton, nextButton, closeButton];
    if (icon) objects.splice(1, 0, icon);
    this.contentContainer.add(objects);
  }
}
