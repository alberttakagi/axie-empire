import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { PROGRESSION_CONFIG, STORY_GATE_STAGE_ID } from './PROGRESSION_CONFIG.js';
import {
  loadPlayerProgress,
  getUnitProgress,
  getUnitLevelCap,
  getNextLevelCost,
  getGrowthCharmCost,
  hasStoryGateCleared,
  tryLevelUpUnit,
  tryUseGrowthCharm,
  tryEvolveUnit,
} from './PlayerProgress.js';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { getEffectiveUnitConfig } from './UnitStats.js';
import { preloadSpriteRoster, addUnitIcon } from './SpriteIcon.js';
import { hasReachedPartEvolution } from './PartEvolution.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, drawWoodFrame } from './UITheme.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';

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
const ROW_START_Y = 98;
const ROW_WIDTH_MARGIN = 32;
const ROWS_PER_PAGE = 4;

const BUTTON_HEIGHT = 40;

export default class UpgradeScene extends Phaser.Scene {
  constructor() {
    super('UpgradeScene');
  }

  // Same roster art GameScene battles use (see SpriteIcon.js) — loaded
  // here too since a player can reach this screen without ever having
  // started GameScene first.
  preload() {
    preloadSpriteRoster(this, UNIT_CONFIG, true);
    preloadBackgrounds(this);
  }

  create() {
    // Every scene's camera is zoomed by RENDER_SCALE so the game's
    // original 800x450-authored layout (LOGICAL_SIZE, see RenderConfig.js)
    // renders onto the real, bigger HD canvas at full pixel density.
    this.cameras.main.setZoom(RENDER_SCALE);
    // Without a camera bounds set (only GameScene has one — its own
    // setBounds happens to clamp scroll to this same point), Phaser's
    // scroll=0 default centers the viewport on world point
    // (viewport-width/2, viewport-height/2) using RAW viewport pixels —
    // i.e. (960, 540) on this 1920x1080 canvas — not on the logical
    // 800x450 layout's own center. centerOn corrects that so world
    // (0,0)-(800,450) actually maps onto the full canvas instead of a
    // small corner of it.
    this.cameras.main.centerOn(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    const { width, height } = LOGICAL_SIZE;

    this.page = 0;

    // Dimmed by drawWoodFrame's own semi-transparent interior tint, not a
    // separate scrim — see HomeScene.js's identical note.
    addBackground(this, 'metamorph2');
    drawWoodFrame(this, width, height);

    createTitlePill(this, 24, 22, 'Power Up');
    createBackButton(this, () => this.scene.start('HomeScene'));

    createBcButton(this, width - 90, 22, 150, 30, 'Base Upgrades', () => this.scene.start('BaseUpgradeScene'), {
      fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 12,
    });

    this.rowContainer = this.add.container(0, 0);

    // Pagination controls (see file header) — sit below the last possible
    // row on any page, so they never fight the row grid for vertical space.
    const pagerY = ROW_START_Y + ROWS_PER_PAGE * ROW_HEIGHT + 12;
    createBcButton(this, width / 2 - 90, pagerY, 70, 28, '< Prev', () => {
      if (this.page > 0) {
        this.page -= 1;
        this.refresh();
      }
    }, { fill: 0x8a8a8a, highlight: 0xbbbbbb, textColor: '#ffffff', fontSize: 12 });

    createBcButton(this, width / 2 + 90, pagerY, 70, 28, 'Next >', () => {
      const totalPages = Math.ceil(Object.keys(UNIT_CONFIG).length / ROWS_PER_PAGE);
      if (this.page < totalPages - 1) {
        this.page += 1;
        this.refresh();
      }
    }, { fill: 0x8a8a8a, highlight: 0xbbbbbb, textColor: '#ffffff', fontSize: 12 });

    this.pageText = this.add.text(width / 2, pagerY, '', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);

    this.refresh();
  }

  refresh() {
    this.rowContainer.removeAll(true);

    const progress = loadPlayerProgress();
    if (this.currencyText) this.currencyText.destroy();
    const { width } = LOGICAL_SIZE;
    this.currencyText = this.add
      .text(
        width - 24, 54,
        `XP ${Math.floor(progress.xp).toLocaleString()}    Shards ${progress.evoShards}    Charms ${progress.growthCharms}`,
        { fontFamily: FONT, fontSize: '12px', color: '#ffcf6b', stroke: '#000000', strokeThickness: 3 },
      )
      .setOrigin(1, 0.5);

    const allKeys = Object.keys(UNIT_CONFIG);
    const totalPages = Math.ceil(allKeys.length / ROWS_PER_PAGE);
    const pageKeys = allKeys.slice(this.page * ROWS_PER_PAGE, this.page * ROWS_PER_PAGE + ROWS_PER_PAGE);

    pageKeys.forEach((type, index) => {
      this.renderUnitRow(type, ROW_START_Y + index * ROW_HEIGHT, progress);
    });

    this.pageText.setText(`Page ${this.page + 1}/${totalPages}`);
  }

  renderUnitRow(type, y, progress) {
    const { width } = LOGICAL_SIZE;
    const base = UNIT_CONFIG[type];
    const meta = PROGRESSION_CONFIG[type];
    const unitProgress = getUnitProgress(progress, type);
    const cap = getUnitLevelCap(type);
    const atCap = unitProgress.level >= cap;
    const effective = getEffectiveUnitConfig(type);
    const evoName =
      unitProgress.evolutionStage === 0 ? 'Normal Form' : `${meta.evolutions[unitProgress.evolutionStage - 1].name} Form`;

    // Portrait icon showing the unit's CURRENT look — its real evolved
    // ("awakened") art once it's reached the part-evolution milestone (see
    // PartEvolution.js), same as it'd appear in battle right now, rather
    // than always the base form. Falls back to the old colored swatch for
    // any (currently nonexistent) sprite-less unit.
    const isEvolved = hasReachedPartEvolution(unitProgress.level);
    const rowObjects = [];
    // Cream card, black outline — matches every other list/card screen in
    // this pass instead of the previous flat dark-grey rectangle.
    const g = this.add.graphics();
    g.fillStyle(BC.ink, 0.2);
    g.fillRoundedRect(width / 2 - (width - ROW_WIDTH_MARGIN) / 2 + 2, y - (ROW_HEIGHT - 8) / 2 + 3, width - ROW_WIDTH_MARGIN, ROW_HEIGHT - 8, 12);
    g.fillStyle(BC.panel, 1);
    g.fillRoundedRect(width / 2 - (width - ROW_WIDTH_MARGIN) / 2, y - (ROW_HEIGHT - 8) / 2, width - ROW_WIDTH_MARGIN, ROW_HEIGHT - 8, 12);
    g.lineStyle(2, BC.ink, 1);
    g.strokeRoundedRect(width / 2 - (width - ROW_WIDTH_MARGIN) / 2, y - (ROW_HEIGHT - 8) / 2, width - ROW_WIDTH_MARGIN, ROW_HEIGHT - 8, 12);
    rowObjects.push(g);
    // Row's own background sits from x=16 to x=width-16 (ROW_WIDTH_MARGIN,
    // split evenly) — icon centered well clear of that left edge so it
    // never pokes outside the row, text following it likewise pulled in
    // rather than leaving a dead gap between the icon and the name.
    const icon = addUnitIcon(this, 54, y, base, ROW_HEIGHT - 10, true, isEvolved);
    if (icon) rowObjects.push(icon);
    else rowObjects.push(this.add.rectangle(30, y, 20, 20, base.color));
    rowObjects.push(
      this.add
        .text(92, y - 12, `${base.displayName}  (${meta.rarity})  —  ${evoName}`, {
          fontFamily: FONT, fontSize: '13px',
          color: BC.inkHex,
        })
        .setOrigin(0, 0.5),
    );
    rowObjects.push(
      this.add
        .text(92, y + 10, `Lv ${unitProgress.level}/${cap}    HP ${effective.hp}    DMG ${effective.damage}`, {
          fontFamily: FONT, fontSize: '11px',
          color: '#5a5a5a',
        })
        .setOrigin(0, 0.5),
    );

    rowObjects.push(this.renderLevelUpButton(type, y, unitProgress, cap, atCap, progress));
    // Growth Charms only ever apply past the real story-gated Lv20 (see
    // PlayerProgress.js's hasStoryGateCleared) — below that, a unit stuck
    // at its Lv10 baseLevelCap gets an explanatory hint instead of a
    // charm button that would only ever fail.
    if (atCap && !hasStoryGateCleared()) {
      const gateStage = STAGE_CONFIG.find((s) => s.id === STORY_GATE_STAGE_ID);
      rowObjects.push(
        this.add
          .text(590, y, `Clear\n"${gateStage?.displayName ?? STORY_GATE_STAGE_ID}"\nto level further`, {
            fontFamily: FONT, fontSize: '9px', color: '#7a7a7a', align: 'center',
          })
          .setOrigin(0.5),
      );
    } else if (atCap && unitProgress.extraCap < meta.maxExtraCap) {
      rowObjects.push(this.renderGrowthCharmButton(type, y, progress));
    }
    const evolveButton = this.renderEvolveButton(type, y, meta, unitProgress, progress);
    if (evolveButton) rowObjects.push(evolveButton);

    this.rowContainer.add(rowObjects);
  }

  renderLevelUpButton(type, y, unitProgress, cap, atCap, progress) {
    const x = 480;
    const cost = getNextLevelCost(type);
    const affordable = !atCap && progress.xp >= cost;

    return createBcButton(this, x, y, 100, BUTTON_HEIGHT, atCap ? 'MAX LEVEL' : `Level Up\n${cost.toLocaleString()} XP`, () => {
      if (tryLevelUpUnit(type).ok) this.refresh();
    }, {
      fontSize: 10,
      fill: atCap ? 0x8a8a8a : affordable ? BC.blue : 0x6a6a6a,
      highlight: atCap ? 0xbbbbbb : BC.blueHighlight,
      textColor: '#ffffff',
    });
  }

  renderGrowthCharmButton(type, y, progress) {
    const x = 590;
    const meta = PROGRESSION_CONFIG[type];
    const unitProgress = getUnitProgress(progress, type);
    const cost = getGrowthCharmCost(unitProgress, meta);
    const affordable = progress.growthCharms >= cost;

    return createBcButton(this, x, y, 100, BUTTON_HEIGHT, `Use ${cost} Charm${cost > 1 ? 's' : ''}\n(${progress.growthCharms} held)`, () => {
      if (tryUseGrowthCharm(type).ok) this.refresh();
    }, { fontSize: 10, fill: affordable ? BC.gold : 0x8a8a8a, textColor: affordable ? BC.goldInk : '#ffffff' });
  }

  renderEvolveButton(type, y, meta, unitProgress, progress) {
    const x = 715;
    const nextEvolution = meta.evolutions[unitProgress.evolutionStage];
    if (!nextEvolution) return null;

    const eligible = unitProgress.level >= nextEvolution.unlockLevel;
    const affordable = eligible && progress.xp >= nextEvolution.xpCost && progress.evoShards >= nextEvolution.evoShardCost;

    return createBcButton(
      this, x, y, 130, BUTTON_HEIGHT,
      eligible
        ? `Evolve: ${nextEvolution.name}\n${nextEvolution.xpCost.toLocaleString()} XP + ${nextEvolution.evoShardCost} Shards`
        : `Evolve: ${nextEvolution.name}\nNeeds Lv ${nextEvolution.unlockLevel}`,
      () => {
        if (!eligible) return;
        if (tryEvolveUnit(type).ok) this.refresh();
      },
      { fontSize: 9, fill: !eligible ? 0x8a8a8a : affordable ? 0xb98cff : 0x9a7ab0, textColor: '#2a1a3a' },
    );
  }
}
