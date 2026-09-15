import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { ENEMY_CONFIG } from './ENEMY_CONFIG.js';
import { preloadSpriteRoster, addUnitIcon } from './SpriteIcon.js';
import { describeUnit } from './UnitDescription.js';

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
  }

  create(data) {
    const { width } = this.scale;
    this.rosterType = data?.rosterType === 'enemies' ? 'enemies' : 'units';
    this.roster = this.rosterType === 'enemies' ? ENEMY_CONFIG : UNIT_CONFIG;
    this.isPlayerSide = this.rosterType === 'units';
    this.keys = Object.keys(this.roster);
    this.detailIndex = 0;

    this.add
      .text(width / 2, 20, this.rosterType === 'enemies' ? 'Enemy Guide' : 'Unit Guide', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const backButton = this.add.rectangle(50, 20, 80, 28, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 20, 'Back', { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.scene.start('HomeScene'));

    this.contentContainer = this.add.container(0, 0);
    this.renderGrid();
  }

  renderGrid() {
    this.contentContainer.removeAll(true);
    const { width } = this.scale;
    const columns = Math.min(this.keys.length, CARDS_PER_ROW);
    const rowWidth = columns * CARD_WIDTH + (columns - 1) * CARD_GAP;
    const startX = (width - rowWidth) / 2 + CARD_WIDTH / 2;

    this.keys.forEach((key, index) => {
      const row = Math.floor(index / CARDS_PER_ROW);
      const col = index % CARDS_PER_ROW;
      const x = startX + col * (CARD_WIDTH + CARD_GAP);
      const y = GRID_START_Y + row * (CARD_HEIGHT + CARD_GAP);
      this.renderGridCard(key, x, y, index);
    });
  }

  renderGridCard(key, x, y, index) {
    const config = this.roster[key];
    const card = this.add
      .rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, config.color)
      .setStrokeStyle(1, 0x666666)
      .setInteractive({ useHandCursor: true });
    const icon = addUnitIcon(this, x, y - 18, config, CARD_HEIGHT - 48, this.isPlayerSide);
    // Character name first (e.g. "Buba"), role second and smaller — this
    // guide is about browsing specific characters, not picking a role.
    // Label sits a bit higher than a single-line name needs, since a few
    // longer names (e.g. "Aquatic Flowering Slime") wrap to two lines.
    const label = this.add
      .text(x, y + CARD_HEIGHT / 2 - 24, config.characterName, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '10px',
        color: '#000000',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 8 },
      })
      .setOrigin(0.5);
    const roleLabel = this.add
      .text(x, y + CARD_HEIGHT / 2 - 6, `(${config.displayName})`, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '8px',
        color: '#222222',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 8 },
      })
      .setOrigin(0.5);

    card.on('pointerdown', () => this.showDetail(index));

    const objects = [card, label, roleLabel];
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

    const panel = this.add
      .rectangle(width / 2, height / 2 + 22, width - 60, height - 96, 0x222222)
      .setStrokeStyle(2, 0xffdd33);

    const icon = addUnitIcon(this, width / 2, 138, config, 100, this.isPlayerSide);
    // Character name first (e.g. "Buba"), role second and smaller — same
    // ordering as the grid card and Character Formation.
    const nameText = this.add
      .text(width / 2, 198, config.characterName, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const roleText = this.add
      .text(width / 2, 216, `(${config.displayName})`, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '11px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    const lines = describeUnit(config);
    const descText = this.add
      .text(width / 2, 236, lines.map((line) => `• ${line}`).join('\n'), {
        fontFamily: 'Rowdies, sans-serif', fontSize: '11px',
        color: '#dddddd',
        align: 'left',
        wordWrap: { width: width - 120 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    // Nav arrows page through the whole roster without returning to the
    // grid each time — mirrors the reference guide's own left/right arrows.
    const prevButton = this.add
      .text(40, height / 2 + 22, '◀', { fontFamily: 'Rowdies, sans-serif', fontSize: '28px', color: '#ffdd33' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const nextButton = this.add
      .text(width - 40, height / 2 + 22, '▶', { fontFamily: 'Rowdies, sans-serif', fontSize: '28px', color: '#ffdd33' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    prevButton.on('pointerdown', () => {
      this.detailIndex = (this.detailIndex - 1 + this.keys.length) % this.keys.length;
      this.renderDetail();
    });
    nextButton.on('pointerdown', () => {
      this.detailIndex = (this.detailIndex + 1) % this.keys.length;
      this.renderDetail();
    });

    const closeButton = this.add
      .text(width - 24, 20, '✕', { fontFamily: 'Rowdies, sans-serif', fontSize: '16px', color: '#ffffff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => this.renderGrid());

    const objects = [panel, nameText, roleText, descText, prevButton, nextButton, closeButton];
    if (icon) objects.splice(1, 0, icon);
    this.contentContainer.add(objects);
  }
}
