import Phaser from 'phaser';
import { SAGA_CONFIG } from './SAGA_CONFIG.js';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';
import { BC, FONT, createBackButton, createBcCircleButton, createTitlePill, drawWoodFrame } from './UITheme.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';

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

const SAGAS_PER_PAGE = 3;

export default class SagaSelectScene extends Phaser.Scene {
  constructor() {
    super('SagaSelectScene');
  }

  preload() {
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

    // This screen previously had no backdrop art at all.
    addBackground(this, 'beast');
    drawWoodFrame(this, width, height);
    createTitlePill(this, 24, 26, 'Select Saga');
    createBackButton(this, () => this.scene.start('HomeScene'));

    // Paged 3 sagas at a time (Round 2 expansion: 7 sagas). Opens on the
    // page holding the newest unlocked saga.
    this.cardContainer = this.add.container(0, 0);
    const progress0 = loadStageProgress();
    const lastUnlocked = SAGA_CONFIG.reduce((acc, saga, i) => (i === 0 || STAGE_CONFIG.filter((st) => st.saga === SAGA_CONFIG[i - 1].id).every((st) => progress0[st.id]?.cleared) ? i : acc), 0);
    this.sagaPage = Math.floor(lastUnlocked / SAGAS_PER_PAGE);
    const totalPages = Math.ceil(SAGA_CONFIG.length / SAGAS_PER_PAGE);
    const { width: w, height: h } = LOGICAL_SIZE;
    this.pagePrev = createBcCircleButton(this, w - 52, h / 2 - 40, 18, '▲', () => this.changeSagaPage(-1), { fontSize: 13 });
    this.pageNext = createBcCircleButton(this, w - 52, h / 2 + 40, 18, '▼', () => this.changeSagaPage(1), { fontSize: 13 });
    this.pageLabel = this.add.text(w - 52, h / 2, '', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
    this.totalSagaPages = totalPages;
    this.renderSagaCards();
  }

  changeSagaPage(delta) {
    const next = Phaser.Math.Clamp(this.sagaPage + delta, 0, this.totalSagaPages - 1);
    if (next === this.sagaPage) return;
    this.sagaPage = next;
    this.renderSagaCards();
  }

  renderSagaCards() {
    this.cardContainer.removeAll(true);
    this.pagePrev.setVisible(this.sagaPage > 0);
    this.pageNext.setVisible(this.sagaPage < this.totalSagaPages - 1);
    this.pageLabel.setText(this.totalSagaPages > 1 ? `${this.sagaPage + 1}/${this.totalSagaPages}` : '');
    const { width } = LOGICAL_SIZE;
    const progress = loadStageProgress();
    // User feedback: at width-64 the bottom card's left edge (x=32) sat
    // right under the back button (createBackButton's default x=40,
    // radius 26 -> spans x=14-66), overlapping it. Narrowed so the left
    // edge (x=80) clears the button's right edge (66) with room to spare.
    const cardWidth = width - 160;
    const startX = width / 2;
    const startY = 66 + CARD_HEIGHT / 2;

    SAGA_CONFIG.forEach((saga, sagaIndex) => {
      const slot = sagaIndex - this.sagaPage * SAGAS_PER_PAGE;
      if (slot < 0 || slot >= SAGAS_PER_PAGE) return;
      const add = (o) => { this.cardContainer.add(o); return o; };
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

      const y = startY + slot * (CARD_HEIGHT + CARD_GAP);

      const g = add(this.add.graphics());
      // Drop shelf.
      g.fillStyle(BC.ink, 0.25);
      g.fillRoundedRect(startX - cardWidth / 2 + 3, y - CARD_HEIGHT / 2 + 5, cardWidth, CARD_HEIGHT, 16);
      // Face.
      g.fillStyle(isUnlocked ? BC.panel : 0x555555, 1);
      g.fillRoundedRect(startX - cardWidth / 2, y - CARD_HEIGHT / 2, cardWidth, CARD_HEIGHT, 16);
      g.lineStyle(isUnlocked ? 4 : 3, isUnlocked ? BC.gold : BC.ink, 1);
      g.strokeRoundedRect(startX - cardWidth / 2, y - CARD_HEIGHT / 2, cardWidth, CARD_HEIGHT, 16);

      const textColor = isUnlocked ? BC.inkHex : '#aaaaaa';
      add(this.add
        .text(startX, y - 30, saga.displayName, { fontFamily: FONT, fontSize: '18px', color: textColor })
        .setOrigin(0.5));
      add(this.add
        .text(startX, y - 2, isUnlocked ? saga.description : 'Locked', {
          fontFamily: FONT, fontSize: '11px',
          color: isUnlocked ? '#5a4a2a' : '#999999',
          align: 'center',
          wordWrap: { width: cardWidth - 40 },
        })
        .setOrigin(0.5));

      if (isUnlocked) {
        add(this.add
          .text(startX, y + 32, `Cleared ${clearedCount}/${sagaStages.length}`, { fontFamily: FONT, fontSize: '12px', color: '#b8860b' })
          .setOrigin(0.5));
      } else {
        add(this.add.text(startX, y + 32, '🔒', { fontFamily: FONT, fontSize: '16px', color: '#cccccc' }).setOrigin(0.5));
      }

      if (isUnlocked) {
        const hit = add(this.add.rectangle(startX, y, cardWidth, CARD_HEIGHT, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
        hit.on('pointerdown', () => this.scene.start('StageSelectScene', { sagaId: saga.id }));
      }
    });
  }
}
