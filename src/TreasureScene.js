import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { TREASURE_SETS } from './TREASURE_CONFIG.js';
import { getTreasureSummary } from './Treasure.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, drawWoodFrame } from './UITheme.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';

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
    const { width, height } = this.scale;

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

    const pagerY = 372;
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

    pageEntries.forEach((entry, index) => this.renderSet(entry, 66 + index * 150));

    this.pageText.setText(`Page ${this.page + 1}/${totalPages}`);
  }

  renderSet(entry, y) {
    const { width } = this.scale;
    const { set, completion, bonusPercent, stageTiers } = entry;
    const rowObjects = [];

    const cardHeight = 130;
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

    const bonusLabel =
      set.bonus.type === 'moneyIncomePercent'
        ? `+${bonusPercent.toFixed(1)}% Worker Cat income rate`
        : `+${bonusPercent.toFixed(1)}% unit HP`;
    rowObjects.push(
      this.add
        .text(30, y + 40, `Bonus: ${bonusLabel}  (max +${set.bonus.valueAtMax}% at 100%)`, {
          fontFamily: FONT, fontSize: '12px',
          color: '#b8860b',
        })
        .setOrigin(0, 0.5),
    );

    stageTiers.forEach((stageTier, index) => {
      const stage = STAGE_CONFIG.find((s) => s.id === stageTier.stageId);
      const x = 60 + index * 145;
      const dotY = y + 80;

      // Medal-styled badge — a filled tier-colored ring, with the set's
      // real charm icon (its own colors untouched, with a tier-colored
      // glow drawn around it — see TREASURE_CONFIG.js's own note) layered
      // on top once actually earned. Tier 0 ("None")
      // has no charm art yet, so it stays the plain ring alone. Sized as
      // large as fits without touching the tier-name label above (fixed
      // at dotY-24) or the stage-name label below (fixed at dotY+22).
      rowObjects.push(
        this.add.circle(x, dotY, 20, TIER_COLORS[stageTier.tier]).setStrokeStyle(2, BC.ink),
      );
      if (stageTier.tier > 0) {
        rowObjects.push(
          this.add.image(x, dotY, `treasure_${set.icon}_${TIER_KEYS[stageTier.tier]}`).setDisplaySize(36, 36),
        );
      }
      rowObjects.push(
        this.add
          .text(x, dotY + 22, stage.displayName, {
            fontFamily: FONT, fontSize: '10px',
            color: '#7a5c1e',
            align: 'center',
            wordWrap: { width: 130 },
          })
          .setOrigin(0.5, 0),
      );
      rowObjects.push(
        this.add
          .text(x, dotY - 24, TIER_NAMES[stageTier.tier], {
            fontFamily: FONT, fontSize: '9px',
            color: '#5a5a5a',
          })
          .setOrigin(0.5, 1),
      );
    });

    this.rowContainer.add(rowObjects);
  }
}
