import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { PROGRESSION_CONFIG } from './PROGRESSION_CONFIG.js';
import {
  loadPlayerProgress,
  getUnitProgress,
  getNextLevelCost,
  tryLevelUpUnit,
  tryUseGrowthCharm,
  tryEvolveUnit,
} from './PlayerProgress.js';
import { getEffectiveUnitConfig } from './UnitStats.js';

// The bible's §A.10.6(a) per-unit leveling screen — shows every unit's
// current level/cap, evolution stage, and a live stat preview, with
// buttons to spend XP/materials on leveling, extending the level cap
// (Growth Charms), and evolving. Everything here re-reads
// PlayerProgress.js fresh on every action rather than caching state
// locally, then does a full-redraw refresh() — simple and correct at this
// scale, even if it's not the most efficient possible approach.
//
// Roster expansion (bible §A.4.1): the roster no longer fits as one
// un-scrolled column of rows on an 800x450 canvas, so this screen paginates
// (ROWS_PER_PAGE at a time) rather than scroll — consistent with this
// build's existing button-driven nav (no scroll/drag interactions used
// anywhere else yet).

const ROW_HEIGHT = 74;
const ROW_START_Y = 86;
const ROW_WIDTH_MARGIN = 32;
const ROWS_PER_PAGE = 4;

const BUTTON_HEIGHT = 40;

export default class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('UpgradeScene');
  }

  create() {
    const { width } = this.scale;

    this.page = 0;

    this.add
      .text(width / 2, 20, 'Upgrade', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const backButton = this.add
      .rectangle(50, 20, 80, 32, 0x444444)
      .setInteractive({ useHandCursor: true });
    this.add.text(50, 20, 'Back', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.scene.start('HomeScene'));

    const baseUpgradesButton = this.add
      .rectangle(175, 20, 150, 32, 0x336699)
      .setInteractive({ useHandCursor: true });
    this.add.text(175, 20, 'Base Upgrades', { fontFamily: 'Rowdies, sans-serif', fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    baseUpgradesButton.on('pointerdown', () => this.scene.start('BaseUpgradeScene'));

    // Its own row below the header (not sharing a row with the centered
    // title) — the full currency string is too wide to sit beside "Upgrade"
    // without overlapping it.
    this.currencyText = this.add
      .text(width - 16, 46, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '13px',
        color: '#ffdd33',
        align: 'right',
      })
      .setOrigin(1, 0.5);

    this.rowContainer = this.add.container(0, 0);

    // Pagination controls (see file header) — sit below the last possible
    // row on any page, so they never fight the row grid for vertical space.
    const pagerY = ROW_START_Y + ROWS_PER_PAGE * ROW_HEIGHT + 10;
    const prevButton = this.add.rectangle(width / 2 - 90, pagerY, 70, 28, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(width / 2 - 90, pagerY, '< Prev', { fontFamily: 'Rowdies, sans-serif', fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    prevButton.on('pointerdown', () => {
      if (this.page > 0) {
        this.page -= 1;
        this.refresh();
      }
    });

    const nextButton = this.add.rectangle(width / 2 + 90, pagerY, 70, 28, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(width / 2 + 90, pagerY, 'Next >', { fontFamily: 'Rowdies, sans-serif', fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    nextButton.on('pointerdown', () => {
      const totalPages = Math.ceil(Object.keys(UNIT_CONFIG).length / ROWS_PER_PAGE);
      if (this.page < totalPages - 1) {
        this.page += 1;
        this.refresh();
      }
    });

    this.pageText = this.add.text(width / 2, pagerY, '', { fontFamily: 'Rowdies, sans-serif', fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);

    this.refresh();
  }

  refresh() {
    this.rowContainer.removeAll(true);

    const progress = loadPlayerProgress();
    this.currencyText.setText(
      `XP: ${Math.floor(progress.xp).toLocaleString()}    Evo Shards: ${progress.evoShards}    Growth Charms: ${progress.growthCharms}`,
    );

    const allKeys = Object.keys(UNIT_CONFIG);
    const totalPages = Math.ceil(allKeys.length / ROWS_PER_PAGE);
    const pageKeys = allKeys.slice(this.page * ROWS_PER_PAGE, this.page * ROWS_PER_PAGE + ROWS_PER_PAGE);

    pageKeys.forEach((type, index) => {
      this.renderUnitRow(type, ROW_START_Y + index * ROW_HEIGHT, progress);
    });

    this.pageText.setText(`Page ${this.page + 1}/${totalPages}`);
  }

  renderUnitRow(type, y, progress) {
    const { width } = this.scale;
    const base = UNIT_CONFIG[type];
    const meta = PROGRESSION_CONFIG[type];
    const unitProgress = getUnitProgress(progress, type);
    const cap = meta.baseLevelCap + unitProgress.extraCap;
    const atCap = unitProgress.level >= cap;
    const effective = getEffectiveUnitConfig(type);
    const evoName =
      unitProgress.evolutionStage === 0 ? 'Normal Form' : `${meta.evolutions[unitProgress.evolutionStage - 1].name} Form`;

    const rowObjects = [];
    rowObjects.push(this.add.rectangle(width / 2, y, width - ROW_WIDTH_MARGIN, ROW_HEIGHT - 8, 0x222222));
    rowObjects.push(this.add.rectangle(30, y, 20, 20, base.color));
    rowObjects.push(
      this.add
        .text(48, y - 12, `${base.displayName}  (${meta.rarity})  —  ${evoName}`, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '13px',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5),
    );
    rowObjects.push(
      this.add
        .text(48, y + 10, `Lv ${unitProgress.level}/${cap}    HP ${effective.hp}    DMG ${effective.damage}`, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '11px',
          color: '#aaaaaa',
        })
        .setOrigin(0, 0.5),
    );

    rowObjects.push(...this.renderLevelUpButton(type, y, unitProgress, cap, atCap, progress));
    if (atCap && unitProgress.extraCap < meta.maxExtraCap) {
      rowObjects.push(...this.renderGrowthCharmButton(type, y, progress));
    }
    rowObjects.push(...this.renderEvolveButton(type, y, meta, unitProgress, progress));

    this.rowContainer.add(rowObjects);
  }

  renderLevelUpButton(type, y, unitProgress, cap, atCap, progress) {
    const x = 480;
    const cost = getNextLevelCost(type);
    const affordable = !atCap && progress.xp >= cost;

    const rect = this.add
      .rectangle(x, y, 100, BUTTON_HEIGHT, 0x3366cc)
      .setInteractive({ useHandCursor: true })
      .setAlpha(atCap ? 0.4 : affordable ? 1 : 0.5);
    const label = this.add
      .text(x, y, atCap ? 'MAX LEVEL' : `Level Up\n${cost.toLocaleString()} XP`, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '10px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    rect.on('pointerdown', () => {
      if (tryLevelUpUnit(type).ok) this.refresh();
    });

    return [rect, label];
  }

  renderGrowthCharmButton(type, y, progress) {
    const x = 590;
    const affordable = progress.growthCharms >= 1;

    const rect = this.add
      .rectangle(x, y, 100, BUTTON_HEIGHT, 0x996633)
      .setInteractive({ useHandCursor: true })
      .setAlpha(affordable ? 1 : 0.4);
    const label = this.add
      .text(x, y, `Use Charm\n(${progress.growthCharms} held)`, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '10px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    rect.on('pointerdown', () => {
      if (tryUseGrowthCharm(type).ok) this.refresh();
    });

    return [rect, label];
  }

  renderEvolveButton(type, y, meta, unitProgress, progress) {
    const x = 715;
    const nextEvolution = meta.evolutions[unitProgress.evolutionStage];
    if (!nextEvolution) return [];

    const eligible = unitProgress.level >= nextEvolution.unlockLevel;
    const affordable = eligible && progress.xp >= nextEvolution.xpCost && progress.evoShards >= nextEvolution.evoShardCost;

    const rect = this.add
      .rectangle(x, y, 130, BUTTON_HEIGHT, 0x9933cc)
      .setInteractive({ useHandCursor: true })
      .setAlpha(!eligible ? 0.3 : affordable ? 1 : 0.5);
    const label = this.add
      .text(
        x,
        y,
        eligible
          ? `Evolve: ${nextEvolution.name}\n${nextEvolution.xpCost.toLocaleString()} XP + ${nextEvolution.evoShardCost} Shards`
          : `Evolve: ${nextEvolution.name}\nNeeds Lv ${nextEvolution.unlockLevel}`,
        { fontFamily: 'Rowdies, sans-serif', fontSize: '9px', color: '#ffffff', align: 'center' },
      )
      .setOrigin(0.5);

    rect.on('pointerdown', () => {
      if (!eligible) return;
      if (tryEvolveUnit(type).ok) this.refresh();
    });

    return [rect, label];
  }
}
