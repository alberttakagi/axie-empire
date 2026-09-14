import Phaser from 'phaser';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { getTreasureSummary } from './Treasure.js';

// The bible's §A.10.2 "dedicated per-chapter Treasure summary screen" —
// scaled down to one screen covering both of this build's Treasure Sets
// (bible §A.6.3) rather than one screen per saga-chapter.

const TIER_COLORS = [0x333333, 0xcd7f32, 0xc0c0c0, 0xffd700]; // none/bronze/silver/gold
const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold'];

export default class TreasureScene extends Phaser.Scene {
  constructor() {
    super('TreasureScene');
  }

  create() {
    const { width } = this.scale;

    this.add.text(width / 2, 20, 'Treasure Sets', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);

    const backButton = this.add.rectangle(50, 20, 80, 32, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 20, 'Back', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.scene.start('StageSelectScene'));

    const summary = getTreasureSummary();
    summary.forEach((entry, index) => this.renderSet(entry, 70 + index * 150));
  }

  renderSet(entry, y) {
    const { width } = this.scale;
    const { set, completion, bonusPercent, stageTiers } = entry;

    this.add.rectangle(width / 2, y + 55, width - 32, 130, 0x222222);
    this.add
      .text(30, y, `${set.name}  —  ${Math.round(completion * 100)}% complete`, {
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    const bonusLabel =
      set.bonus.type === 'moneyIncomePercent'
        ? `+${bonusPercent.toFixed(1)}% Worker Cat income rate`
        : `+${bonusPercent.toFixed(1)}% unit HP`;
    this.add
      .text(30, y + 24, `Bonus: ${bonusLabel}  (max +${set.bonus.valueAtMax}% at 100%)`, {
        fontSize: '12px',
        color: '#ffdd33',
      })
      .setOrigin(0, 0.5);

    stageTiers.forEach((stageTier, index) => {
      const stage = STAGE_CONFIG.find((s) => s.id === stageTier.stageId);
      const x = 60 + index * 145;
      const dotY = y + 60;

      this.add.circle(x, dotY, 10, TIER_COLORS[stageTier.tier]).setStrokeStyle(1, 0xffffff);
      this.add
        .text(x, dotY + 20, stage.displayName, {
          fontSize: '10px',
          color: '#aaaaaa',
          align: 'center',
          wordWrap: { width: 130 },
        })
        .setOrigin(0.5, 0);
      this.add
        .text(x, dotY - 22, TIER_NAMES[stageTier.tier], {
          fontSize: '9px',
          color: '#888888',
        })
        .setOrigin(0.5, 1);
    });
  }
}
