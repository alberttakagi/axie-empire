import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { ENEMY_CONFIG } from './ENEMY_CONFIG.js';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { isUnitUnlocked } from './PlayerProgress.js';
import { preloadSpriteRoster, addUnitIcon } from './SpriteIcon.js';
import { describeUnit } from './UnitDescription.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcButton, createBcCircleButton, createTitlePill, drawBcPanel } from './UITheme.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';

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

// 4x2 (8/page) rather than an unbounded 6-wide grid — the enemy roster (22
// entries) at the old fixed 6-per-row/no-pagination layout needed 4 rows of
// content (534px) on a ~450px canvas, silently running its last row off the
// bottom of the screen. Paginating also frees each card to be much bigger
// (previously CARD_HEIGHT 96 with a 48px icon — cramped enough that the
// full-body portrait read as "small/cropped" even though nothing was
// actually cut off).
const CARD_WIDTH = 176;
const CARD_HEIGHT = 130;
const CARD_GAP = 12;
const CARDS_PER_ROW = 4;
const ROWS_PER_PAGE = 2;
const CARDS_PER_PAGE = CARDS_PER_ROW * ROWS_PER_PAGE;
// Clears the title pill's own bottom edge (pill spans y 2-42) with margin —
// GRID_START_Y=96 put the FIRST row's top edge (96-75=21) right underneath
// the title text, overlapping it.
const GRID_START_Y = 115;

export default class CatalogScene extends Phaser.Scene {
  constructor() {
    super('CatalogScene');
  }

  preload() {
    preloadSpriteRoster(this, UNIT_CONFIG, true);
    preloadSpriteRoster(this, ENEMY_CONFIG, false);
    preloadBackgrounds(this);
  }

  create(data) {
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
    this.rosterType = data?.rosterType === 'enemies' ? 'enemies' : 'units';
    this.roster = this.rosterType === 'enemies' ? ENEMY_CONFIG : UNIT_CONFIG;
    this.isPlayerSide = this.rosterType === 'units';
    this.keys = Object.keys(this.roster);
    this.detailIndex = 0;
    this.page = 0;

    addBackground(this, 'temple');
    // Teal graph-paper tint (reference screenshot's にゃんこ図鑑 background)
    // instead of a flat dark scrim, so this guide reads visually distinct
    // from the wood-frame hub screens.
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d3b44, 0.55);

    createTitlePill(this, 24, 22, this.rosterType === 'enemies' ? 'Enemy Guide' : 'Unit Guide');
    createBackButton(this, () => this.scene.start('HomeScene'));

    const pagerY = GRID_START_Y + ROWS_PER_PAGE * (CARD_HEIGHT + CARD_GAP) + 10;
    this.pagerObjects = [
      createBcButton(this, width / 2 - 90, pagerY, 70, 28, '< Prev', () => {
        if (this.page > 0) {
          this.page -= 1;
          this.renderGrid();
        }
      }, { fill: 0x8a8a8a, highlight: 0xbbbbbb, textColor: '#ffffff', fontSize: 12 }),
      createBcButton(this, width / 2 + 90, pagerY, 70, 28, 'Next >', () => {
        const totalPages = Math.ceil(this.keys.length / CARDS_PER_PAGE);
        if (this.page < totalPages - 1) {
          this.page += 1;
          this.renderGrid();
        }
      }, { fill: 0x8a8a8a, highlight: 0xbbbbbb, textColor: '#ffffff', fontSize: 12 }),
    ];
    this.pageText = this.add.text(width / 2, pagerY, '', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);

    this.contentContainer = this.add.container(0, 0);
    this.renderGrid();
  }

  renderGrid() {
    this.contentContainer.removeAll(true);
    const { width } = LOGICAL_SIZE;
    const totalPages = Math.ceil(this.keys.length / CARDS_PER_PAGE);
    const pageKeys = this.keys.slice(this.page * CARDS_PER_PAGE, this.page * CARDS_PER_PAGE + CARDS_PER_PAGE);
    this.pageText.setText(`Page ${this.page + 1}/${totalPages}`);
    this.pagerObjects.forEach((obj) => obj.setVisible(true));

    const totalRows = Math.ceil(pageKeys.length / CARDS_PER_ROW);
    pageKeys.forEach((key, indexOnPage) => {
      const globalIndex = this.page * CARDS_PER_PAGE + indexOnPage;
      const row = Math.floor(indexOnPage / CARDS_PER_ROW);
      const col = indexOnPage % CARDS_PER_ROW;
      // Each row is centered on ITS OWN card count, not a fixed
      // CARDS_PER_ROW-wide block — a short final row on the last page
      // (e.g. 22 enemies -> 8+8+6) used to reuse the full-row startX
      // regardless, rendering flush to the grid's left edge instead of
      // centered.
      const cardsInRow = row === totalRows - 1 ? pageKeys.length - row * CARDS_PER_ROW : CARDS_PER_ROW;
      const rowWidth = cardsInRow * CARD_WIDTH + (cardsInRow - 1) * CARD_GAP;
      const startX = (width - rowWidth) / 2 + CARD_WIDTH / 2;
      const x = startX + col * (CARD_WIDTH + CARD_GAP);
      const y = GRID_START_Y + row * (CARD_HEIGHT + CARD_GAP);
      this.renderGridCard(key, x, y, globalIndex);
    });
  }

  // Names exactly which stage clear unlocks a still-locked lineage — same
  // pattern/wording as LoadoutScene's own describeLockedUnit, duplicated
  // rather than shared since the two scenes otherwise have nothing else in
  // common to justify a joint module. Never called for the enemy roster
  // (enemies have no unlock concept at all).
  describeLockedUnit(type) {
    const requirement = UNIT_CONFIG[type]?.unlockRequirement;
    if (requirement?.unitEvolved) {
      const otherName = UNIT_CONFIG[requirement.unitEvolved]?.characterName ?? requirement.unitEvolved;
      return `Evolve ${otherName} to True Form to unlock!`;
    }
    const stage = requirement?.stageId && STAGE_CONFIG.find((s) => s.id === requirement.stageId);
    return stage ? `Clear "${stage.displayName}" to unlock!` : 'Not available yet!';
  }

  renderGridCard(key, x, y, index) {
    const config = this.roster[key];
    // Roster gating (see LoadoutScene's own identical treatment) — this
    // screen used to render a still-locked lineage identically to an
    // unlocked one, spoiling its name/ability text with no indication it
    // hadn't actually been earned yet (the project's own documented
    // "Known Gap #7"). Enemies have no unlock concept, so this is always
    // `true` on that roster.
    const unlocked = !this.isPlayerSide || isUnitUnlocked(key);

    // White/black-outline card (matches every other roster-browsing screen
    // in this pass) instead of a per-unit flat color fill.
    const g = this.add.graphics();
    g.fillStyle(BC.ink, 0.2);
    g.fillRoundedRect(x - CARD_WIDTH / 2 + 2, y - CARD_HEIGHT / 2 + 3, CARD_WIDTH, CARD_HEIGHT, 12);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 12);
    g.lineStyle(2, BC.ink, 1);
    g.strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 12);
    // idleAnimated (last arg): a gentle float instead of a dead-still
    // portrait — this guide is nothing but static cards otherwise. Full
    // body (no faceZoom) sized to fill most of the now much bigger card.
    const icon = addUnitIcon(this, x, y - 18, config, CARD_HEIGHT - 46, this.isPlayerSide, false, true);
    if (icon) icon.setAlpha(unlocked ? 1 : 0.5);
    // Character name first (e.g. "Buba"), role second and smaller — this
    // guide is about browsing specific characters, not picking a role. A
    // still-locked lineage shows neither — its name/role are exactly what
    // "locked" is supposed to be withholding.
    const label = this.add
      .text(x, y + CARD_HEIGHT / 2 - 30, unlocked ? config.characterName : '???', {
        fontFamily: FONT, fontSize: '14px',
        color: BC.inkHex,
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 12 },
      })
      .setOrigin(0.5);
    const roleLabel = this.add
      .text(x, y + CARD_HEIGHT / 2 - 12, unlocked ? `(${config.abilityLabel || config.displayName})` : 'Locked', {
        fontFamily: FONT, fontSize: '11px',
        color: unlocked ? '#5a5a5a' : BC.red,
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 12 },
      })
      .setOrigin(0.5);
    const dimOverlay = this.add.rectangle(x, y, CARD_WIDTH - 4, CARD_HEIGHT - 4, 0x1a1a1a, unlocked ? 0 : 0.6);

    const hit = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.showDetail(index));

    const objects = [g, label, roleLabel, dimOverlay, hit];
    if (icon) objects.splice(1, 0, icon);
    this.contentContainer.add(objects);
  }

  showDetail(index) {
    this.detailIndex = index;
    this.renderDetail();
  }

  renderDetail() {
    this.contentContainer.removeAll(true);
    this.pagerObjects.forEach((obj) => obj.setVisible(false));
    this.pageText.setText('');
    const { width, height } = LOGICAL_SIZE;
    const key = this.keys[this.detailIndex];
    const config = this.roster[key];
    const unlocked = !this.isPlayerSide || isUnitUnlocked(key);

    const panel = drawBcPanel(this, width / 2, height / 2 + 22, width - 60, height - 96, { radius: 24 });

    // Full body, sized big enough to actually look at (was 100px — now
    // fills most of the panel's own width, matching the reference's own
    // large single-character detail portrait) — idleAnimated for the same
    // gentle-float reason as the grid cards.
    const icon = addUnitIcon(this, width / 2, 170, config, 170, this.isPlayerSide, false, true);
    if (icon) icon.setAlpha(unlocked ? 1 : 0.5);
    // Character name first (e.g. "Buba"), role second and smaller — same
    // ordering as the grid card and Character Formation. A still-locked
    // lineage withholds both, same as the grid card, and its ability
    // breakdown is replaced with the same "how to unlock it" message
    // LoadoutScene shows instead of spoiling what it actually does.
    const nameText = this.add
      .text(width / 2, 262, unlocked ? config.characterName : '???', { fontFamily: FONT, fontSize: '18px', color: BC.inkHex })
      .setOrigin(0.5);
    const roleText = this.add
      .text(width / 2, 282, unlocked ? `(${config.abilityLabel || config.displayName})` : 'Locked', { fontFamily: FONT, fontSize: '12px', color: unlocked ? '#7a5c1e' : BC.red })
      .setOrigin(0.5);

    // HP/DMG always lead when unlocked (see LoadoutScene's own tooltip,
    // GameScene's in-battle one) — describeUnit() alone can return an empty
    // array for a unit with no special trait, which otherwise left this
    // panel with a name/role but a blank body.
    const descLines = unlocked
      ? [`HP: ${config.hp}   DMG: ${config.damage}`, ...describeUnit(config).map((line) => `• ${line}`)]
      : [this.describeLockedUnit(key)];
    const descText = this.add
      .text(width / 2, 302, descLines.join('\n'), {
        fontFamily: FONT, fontSize: '12px',
        color: BC.inkHex,
        align: 'left',
        wordWrap: { width: width - 120 },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    // Nav arrows page through the whole roster without returning to the
    // grid each time — mirrors the reference guide's own left/right arrows.
    const prevButton = createBcCircleButton(this, 40, height / 2 + 22, 22, '◀', () => {
      this.detailIndex = (this.detailIndex - 1 + this.keys.length) % this.keys.length;
      this.renderDetail();
    });
    const nextButton = createBcCircleButton(this, width - 40, height / 2 + 22, 22, '▶', () => {
      this.detailIndex = (this.detailIndex + 1) % this.keys.length;
      this.renderDetail();
    });

    const closeButton = createBcCircleButton(this, width - 30, 30, 16, '✕', () => {
      this.page = Math.floor(this.detailIndex / CARDS_PER_PAGE);
      this.renderGrid();
    });

    const objects = [panel, nameText, roleText, descText, prevButton, nextButton, closeButton];
    if (icon) objects.splice(1, 0, icon);
    this.contentContainer.add(objects);
  }
}
