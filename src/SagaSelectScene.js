import Phaser from 'phaser';
import { SAGA_CONFIG } from './SAGA_CONFIG.js';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';

// The bible's §A.6.1 saga/chapter select screen — an intermediate hub
// between Home and Stage Select, needed once the flat stage list grew past
// one saga's worth (bible reference: the real game's own "Empire of Cats /
// Into the Future / Cats of the Cosmos"-style chapter list). STAGE_CONFIG.js
// itself stays one flat array (see that file's header) — this screen only
// groups its entries by their own `saga` field for display/navigation.

const CARD_HEIGHT = 110;
const CARD_GAP = 14;
const LOCKED_COLOR = 0x333333;

export default class SagaSelectScene extends Phaser.Scene {
  constructor() {
    super('SagaSelectScene');
  }

  create() {
    const { width } = this.scale;

    this.add.text(width / 2, 24, 'Select Saga', { fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);

    const homeButton = this.add.rectangle(50, 24, 80, 32, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 24, 'Home', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    homeButton.on('pointerdown', () => this.scene.start('HomeScene'));

    this.renderSagaCards();
  }

  renderSagaCards() {
    const { width } = this.scale;
    const progress = loadStageProgress();
    const cardWidth = width - 64;
    const startX = width / 2;
    const startY = 60 + CARD_HEIGHT / 2;

    SAGA_CONFIG.forEach((saga, sagaIndex) => {
      const sagaStages = STAGE_CONFIG.filter((s) => s.saga === saga.id);
      const clearedCount = sagaStages.filter((s) => progress[s.id]?.cleared).length;

      // A saga unlocks once the FIRST saga's first stage is always open, and
      // every later saga unlocks once the previous saga's every stage is
      // cleared — mirrors STAGE_CONFIG's own flat sequential-unlock chain
      // (this is really just that same chain, summarized per-saga).
      const previousSaga = SAGA_CONFIG[sagaIndex - 1];
      const isUnlocked =
        sagaIndex === 0 ||
        STAGE_CONFIG.filter((s) => s.saga === previousSaga.id).every((s) => progress[s.id]?.cleared === true);

      const y = startY + sagaIndex * (CARD_HEIGHT + CARD_GAP);
      const fillColor = isUnlocked ? saga.color : LOCKED_COLOR;

      const rect = this.add.rectangle(startX, y, cardWidth, CARD_HEIGHT, fillColor).setAlpha(isUnlocked ? 1 : 0.6);

      this.add
        .text(startX, y - 36, saga.displayName, { fontSize: '18px', color: '#ffffff' })
        .setOrigin(0.5)
        .setAlpha(isUnlocked ? 1 : 0.7);
      this.add
        .text(startX, y - 6, saga.description, {
          fontSize: '11px',
          color: '#dddddd',
          align: 'center',
          wordWrap: { width: cardWidth - 40 },
        })
        .setOrigin(0.5)
        .setAlpha(isUnlocked ? 1 : 0.7);
      this.add
        .text(startX, y + 34, isUnlocked ? `Cleared ${clearedCount}/${sagaStages.length}` : 'Locked', {
          fontSize: '12px',
          color: '#ffdd33',
        })
        .setOrigin(0.5)
        .setAlpha(isUnlocked ? 1 : 0.7);

      if (isUnlocked) {
        rect.setInteractive({ useHandCursor: true });
        rect.on('pointerdown', () => this.scene.start('StageSelectScene', { sagaId: saga.id }));
      }
    });
  }
}
