import Phaser from 'phaser';
import { SAGA_CONFIG } from './SAGA_CONFIG.js';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';
import { BC, FONT, createBackButton, createTitlePill, drawWoodFrame } from './UITheme.js';

// The bible's §A.6.1 saga/chapter select screen — an intermediate hub
// between Home and Stage Select, needed once the flat stage list grew past
// one saga's worth (bible reference: the real game's own "Empire of Cats /
// Into the Future / Cats of the Cosmos"-style chapter list). STAGE_CONFIG.js
// itself stays one flat array (see that file's header) — this screen only
// groups its entries by their own `saga` field for display/navigation.
//
// Visual pass: cards now read like the real game's own chapter-select tiles
// (reference screenshot) — a cream rounded panel with a black outline, a
// gold ring around the currently-clickable/unlocked ones, and a padlock
// glyph + flat grey fill for anything not yet unlocked — replacing the
// previous flat solid-color rectangles.

const CARD_HEIGHT = 104;
const CARD_GAP = 14;

export default class SagaSelectScene extends Phaser.Scene {
  constructor() {
    super('SagaSelectScene');
  }

  create() {
    const { width, height } = this.scale;

    drawWoodFrame(this, width, height);
    createTitlePill(this, 24, 26, 'Select Saga');
    createBackButton(this, () => this.scene.start('HomeScene'));

    this.renderSagaCards();
  }

  renderSagaCards() {
    const { width } = this.scale;
    const progress = loadStageProgress();
    const cardWidth = width - 64;
    const startX = width / 2;
    const startY = 66 + CARD_HEIGHT / 2;

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

      const g = this.add.graphics();
      // Drop shelf.
      g.fillStyle(BC.ink, 0.25);
      g.fillRoundedRect(startX - cardWidth / 2 + 3, y - CARD_HEIGHT / 2 + 5, cardWidth, CARD_HEIGHT, 16);
      // Face.
      g.fillStyle(isUnlocked ? BC.panel : 0x555555, 1);
      g.fillRoundedRect(startX - cardWidth / 2, y - CARD_HEIGHT / 2, cardWidth, CARD_HEIGHT, 16);
      g.lineStyle(isUnlocked ? 4 : 3, isUnlocked ? BC.gold : BC.ink, 1);
      g.strokeRoundedRect(startX - cardWidth / 2, y - CARD_HEIGHT / 2, cardWidth, CARD_HEIGHT, 16);

      const textColor = isUnlocked ? BC.inkHex : '#aaaaaa';
      this.add
        .text(startX, y - 30, saga.displayName, { fontFamily: FONT, fontSize: '18px', color: textColor })
        .setOrigin(0.5);
      this.add
        .text(startX, y - 2, isUnlocked ? saga.description : 'Locked', {
          fontFamily: FONT, fontSize: '11px',
          color: isUnlocked ? '#5a4a2a' : '#999999',
          align: 'center',
          wordWrap: { width: cardWidth - 40 },
        })
        .setOrigin(0.5);

      if (isUnlocked) {
        this.add
          .text(startX, y + 32, `Cleared ${clearedCount}/${sagaStages.length}`, { fontFamily: FONT, fontSize: '12px', color: '#b8860b' })
          .setOrigin(0.5);
      } else {
        this.add.text(startX, y + 32, '🔒', { fontFamily: FONT, fontSize: '16px', color: '#cccccc' }).setOrigin(0.5);
      }

      if (isUnlocked) {
        const hit = this.add.rectangle(startX, y, cardWidth, CARD_HEIGHT, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => this.scene.start('StageSelectScene', { sagaId: saga.id }));
      }
    });
  }
}
