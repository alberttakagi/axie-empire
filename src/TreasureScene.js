import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { TREASURE_SETS } from './TREASURE_CONFIG.js';
import { getTreasureSummary } from './Treasure.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, drawWoodFrame } from './UITheme.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';

// The bible's §A.10.2 "dedicated per-chapter Treasure summary screen" —
// originally one screen covering both of this build's Treasure Sets (bible
// §A.6.3); the saga expansion added 4 more sets (bible §A.6.1 — one saga's
// worth of Treasure per saga), so this screen now paginates 2 sets at a
// time — the exact layout the original 2 sets were tuned to fit — rather
// than trying to cram all 6 into one screen at once.

const TIER_COLORS = [0xaaaaaa, 0xcd7f32, 0xc0c0c0, 0xffd700]; // none/bronze/silver/gold
const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold'];
const TIER_KEYS = [null, 'bronze', 'silver', 'gold'];
const SETS_PER_PAGE = 2;

// What each bonus.type actually does, for both the per-set row (below) and
// the "(max +N at 100%)" suffix — see TREASURE_CONFIG.js's own header for
// what each one hooks into. `unit` is what to print after the number;
// every type here is a percent EXCEPT staminaCapFlat, a flat add (matching
// the real game's own equivalent, see that file's note on why).
const BONUS_LABEL = {
  moneyIncomePercent: { text: 'Worker Cat income rate', unit: '%' },
  unitHpPercent: { text: 'unit HP', unit: '%' },
  unitAttackPercent: { text: 'unit DMG', unit: '%' },
  baseHpPercent: { text: 'Base max HP', unit: '%' },
  killMoneyPercent: { text: 'money from defeated enemies', unit: '%' },
  xpPercent: { text: 'XP from stage clears', unit: '%' },
  walletCapPercent: { text: 'battle wallet cap', unit: '%' },
  redeployPercent: { text: 'unit redeploy speed', unit: '%' },
  staminaCapFlat: { text: 'max Energy', unit: '' },
};

// User feedback: the 4 stage-tier icons per set only filled a card's left
// ~2/3 (4 columns spaced 145px apart, ending around x=495, inside a
// ~768px-wide card) — a large blank strip on the right of every row, with
// small 36px icons on top of it. Spread the same 4 columns across the
// card's FULL width and size the icons up to match, rather than leaving
// the extra room empty.
const CARD_HEIGHT = 155;
const ROW_SPACING = 175;
const PAGER_Y = 414;
const ICON_RING_RADIUS = 26;
const ICON_SIZE = 46;
const COL_SIDE_MARGIN = 56; // from each card edge to the first/last column center's own edge

export default class TreasureScene extends Phaser.Scene {
  constructor() {
    super('TreasureScene');
  }

  preload() {
    preloadBackgrounds(this);
    // Each set's real Axie Charm art (see TREASURE_CONFIG.js's own note),
    // one bronze/silver/gold PNG per set from tools/treasure-gen — tier 0
    // ("None") has no art of its own, stays the plain gray dot below.
    TREASURE_SETS.forEach((set) => {
      ['bronze', 'silver', 'gold'].forEach((tier) => {
        this.load.image(`treasure_${set.icon}_${tier}`, `treasures/${set.icon}_${tier}.png`);
      });
    });
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

    // This screen previously had no backdrop art at all (drawWoodFrame's
    // interior alone, with nothing behind it to tint) — every other
    // wood-framed screen in this pass loads one via addBackground.
    addBackground(this, 'dusk');

    // Frame must be added BEFORE rowContainer — drawWoodFrame's own
    // interior tint would otherwise render OVER every treasure card
    // instead of behind it, since Phaser draws later-added objects on top
    // of earlier ones regardless of when a container's own children are
    // populated.
    drawWoodFrame(this, width, height);
    this.rowContainer = this.add.container(0, 0);

    createTitlePill(this, 24, 26, 'Treasure Sets');
    createBackButton(this, () => this.scene.start('HomeScene'));

    const pagerY = PAGER_Y;
    createBcButton(this, width / 2 - 90, pagerY, 70, 28, '< Prev', () => {
      if (this.page > 0) {
        this.page -= 1;
        this.refresh();
      }
    }, { fill: 0x8a8a8a, highlight: 0xbbbbbb, textColor: '#ffffff', fontSize: 12 });

    createBcButton(this, width / 2 + 90, pagerY, 70, 28, 'Next >', () => {
      const totalPages = Math.ceil(getTreasureSummary().length / SETS_PER_PAGE);
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

    const summary = getTreasureSummary();
    const totalPages = Math.ceil(summary.length / SETS_PER_PAGE);
    const pageEntries = summary.slice(this.page * SETS_PER_PAGE, this.page * SETS_PER_PAGE + SETS_PER_PAGE);

    pageEntries.forEach((entry, index) => this.renderSet(entry, 66 + index * ROW_SPACING));

    this.pageText.setText(`Page ${this.page + 1}/${totalPages}`);
  }

  renderSet(entry, y) {
    const { width } = LOGICAL_SIZE;
    const { set, completion, bonusPercent, stageTiers } = entry;
    const rowObjects = [];

    const cardHeight = CARD_HEIGHT;
    const g = this.add.graphics();
    g.fillStyle(BC.ink, 0.2);
    g.fillRoundedRect(18, y + 5, width - 32, cardHeight, 14);
    g.fillStyle(BC.panel, 1);
    g.fillRoundedRect(16, y, width - 32, cardHeight, 14);
    const complete = completion >= 1;
    g.lineStyle(complete ? 4 : 3, complete ? BC.gold : BC.ink, 1);
    g.strokeRoundedRect(16, y, width - 32, cardHeight, 14);
    rowObjects.push(g);

    rowObjects.push(
      this.add
        .text(30, y + 18, `${set.name}  —  ${Math.round(completion * 100)}% complete`, {
          fontFamily: FONT, fontSize: '15px',
          color: BC.inkHex,
        })
        .setOrigin(0, 0.5),
    );
    if (complete) {
      rowObjects.push(this.add.text(width - 40, y + 18, 'ACTIVE!', { fontFamily: FONT, fontSize: '12px', color: '#c98a00' }).setOrigin(1, 0.5));
    }

    const { text: bonusText, unit } = BONUS_LABEL[set.bonus.type];
    const bonusLabel = `+${bonusPercent.toFixed(1)}${unit} ${bonusText}`;
    rowObjects.push(
      this.add
        .text(30, y + 40, `Bonus: ${bonusLabel}  (max +${set.bonus.valueAtMax}${unit} at 100%)`, {
          fontFamily: FONT, fontSize: '12px',
          color: '#b8860b',
        })
        .setOrigin(0, 0.5),
    );

    // Spread the fixed 4 columns evenly across the card's full interior
    // width (COL_SIDE_MARGIN in from each edge) instead of clustering them
    // at fixed 145px steps from the left — see this file's own top-level
    // comment on why.
    const colSpan = width - 32 - COL_SIDE_MARGIN * 2;
    stageTiers.forEach((stageTier, index) => {
      const stage = STAGE_CONFIG.find((s) => s.id === stageTier.stageId);
      const x = 16 + COL_SIDE_MARGIN + (colSpan / stageTiers.length) * (index + 0.5);
      const dotY = y + 92;

      // Medal-styled badge — a filled tier-colored ring, with the set's
      // real charm icon (its own colors untouched, with a tier-colored
      // glow drawn around it — see TREASURE_CONFIG.js's own note) layered
      // on top once actually earned. Tier 0 ("None") has no charm art yet,
      // so it stays the plain ring alone.
      rowObjects.push(
        this.add.circle(x, dotY, ICON_RING_RADIUS, TIER_COLORS[stageTier.tier]).setStrokeStyle(2, BC.ink),
      );
      if (stageTier.tier > 0) {
        rowObjects.push(
          this.add.image(x, dotY, `treasure_${set.icon}_${TIER_KEYS[stageTier.tier]}`).setDisplaySize(ICON_SIZE, ICON_SIZE),
        );
      }
      rowObjects.push(
        this.add
          .text(x, dotY + ICON_RING_RADIUS + 14, stage.displayName, {
            fontFamily: FONT, fontSize: '11px',
            color: '#7a5c1e',
            align: 'center',
            wordWrap: { width: colSpan / stageTiers.length - 10 },
          })
          .setOrigin(0.5, 0),
      );
      rowObjects.push(
        this.add
          .text(x, dotY - ICON_RING_RADIUS - 10, TIER_NAMES[stageTier.tier], {
            fontFamily: FONT, fontSize: '10px',
            color: '#5a5a5a',
          })
          .setOrigin(0.5, 1),
      );
    });

    this.rowContainer.add(rowObjects);
  }
}
