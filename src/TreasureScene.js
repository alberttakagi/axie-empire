import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { getTreasureSummary } from './Treasure.js';

// The bible's §A.10.2 "dedicated per-chapter Treasure summary screen" —
// originally one screen covering both of this build's Treasure Sets (bible
// §A.6.3); the saga expansion added 4 more sets (bible §A.6.1 — one saga's
// worth of Treasure per saga), so this screen now paginates 2 sets at a
// time — the exact layout the original 2 sets were tuned to fit — rather
// than trying to cram all 6 into one screen at once.

const TIER_COLORS = [0x333333, 0xcd7f32, 0xc0c0c0, 0xffd700]; // none/bronze/silver/gold
const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold'];
const SETS_PER_PAGE = 2;

export default class TreasureScene extends Phaser.Scene {
  constructor() {
    super('TreasureScene');
  }

  create() {
    const { width } = this.scale;

    this.page = 0;
    this.rowContainer = this.add.container(0, 0);

    this.add.text(width / 2, 20, 'Treasure Sets', { fontFamily: 'Rowdies, sans-serif', fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);

    const backButton = this.add.rectangle(50, 20, 80, 32, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 20, 'Home', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.scene.start('HomeScene'));

    const pagerY = 365;
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
      const totalPages = Math.ceil(getTreasureSummary().length / SETS_PER_PAGE);
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

    const summary = getTreasureSummary();
    const totalPages = Math.ceil(summary.length / SETS_PER_PAGE);
    const pageEntries = summary.slice(this.page * SETS_PER_PAGE, this.page * SETS_PER_PAGE + SETS_PER_PAGE);

    pageEntries.forEach((entry, index) => this.renderSet(entry, 70 + index * 150));

    this.pageText.setText(`Page ${this.page + 1}/${totalPages}`);
  }

  renderSet(entry, y) {
    const { width } = this.scale;
    const { set, completion, bonusPercent, stageTiers } = entry;
    const rowObjects = [];

    rowObjects.push(this.add.rectangle(width / 2, y + 55, width - 32, 130, 0x222222));
    rowObjects.push(
      this.add
        .text(30, y, `${set.name}  —  ${Math.round(completion * 100)}% complete`, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '16px',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5),
    );

    const bonusLabel =
      set.bonus.type === 'moneyIncomePercent'
        ? `+${bonusPercent.toFixed(1)}% Worker Cat income rate`
        : `+${bonusPercent.toFixed(1)}% unit HP`;
    rowObjects.push(
      this.add
        .text(30, y + 24, `Bonus: ${bonusLabel}  (max +${set.bonus.valueAtMax}% at 100%)`, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '12px',
          color: '#ffdd33',
        })
        .setOrigin(0, 0.5),
    );

    stageTiers.forEach((stageTier, index) => {
      const stage = STAGE_CONFIG.find((s) => s.id === stageTier.stageId);
      const x = 60 + index * 145;
      const dotY = y + 60;

      rowObjects.push(this.add.circle(x, dotY, 10, TIER_COLORS[stageTier.tier]).setStrokeStyle(1, 0xffffff));
      rowObjects.push(
        this.add
          .text(x, dotY + 20, stage.displayName, {
            fontFamily: 'Rowdies, sans-serif', fontSize: '10px',
            color: '#aaaaaa',
            align: 'center',
            wordWrap: { width: 130 },
          })
          .setOrigin(0.5, 0),
      );
      rowObjects.push(
        this.add
          .text(x, dotY - 22, TIER_NAMES[stageTier.tier], {
            fontFamily: 'Rowdies, sans-serif', fontSize: '9px',
            color: '#888888',
          })
          .setOrigin(0.5, 1),
      );
    });

    this.rowContainer.add(rowObjects);
  }
}
