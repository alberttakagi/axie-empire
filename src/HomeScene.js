import Phaser from 'phaser';
import { loadPlayerProgress } from './PlayerProgress.js';
import { getEnergyState } from './Energy.js';
import { isMuted, setMuted, playUiTapSfx, playMusic } from './Audio.js';
import { getUserRank } from './UserRank.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { getMissionsWithStatus } from './Missions.js';
import { BC, FONT, createBcButton, createBcCircleButton, createTitlePill, createResourceBadge, drawWoodFrame, drawBcPanel } from './UITheme.js';

// The bible's §A.10.1 Home/Base Screen — confirmed-from-screenshot layout:
// a top status bar, a center-lower stack of three primary action buttons
// ("Start Battle!!" / "Power Up" / "Character Formation"), and a secondary
// icon row (Menu / Gamatoto / Missions). This is now the game's actual
// first screen — StageSelectScene no longer doubles as the hub.
//
// Gamatoto (an idle side-activity for base-building materials) is shown as
// a real icon matching the confirmed layout, but has no backing system yet
// in this build — deliberately out of scope for this pass (nothing in the
// bible's Phase 1-5 build order requires it), so tapping it just shows a
// "coming soon"-style toast rather than pretending to be a finished
// feature. Missions (quest objectives), previously the same kind of stub,
// now opens a real MissionsScene — see Missions.js/MISSIONS_CONFIG.js.
//
// Visual pass: restyled against the real game's own Cat Base screen
// (screenshot reference) — a wood-plank frame around the whole screen, the
// three primary actions as big beveled gold capsule buttons stacked on the
// left, and a secondary icon row (circular gold buttons) beneath them,
// instead of the previous flat-color rectangles. See UITheme.js.

const PRIMARY_BUTTON_WIDTH = 240;
const PRIMARY_BUTTON_HEIGHT = 52;
const PRIMARY_BUTTON_GAP = 12;

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  preload() {
    preloadBackgrounds(this);
  }

  create() {
    const { width, height } = this.scale;

    // Backdrop, dimmed by drawWoodFrame's own semi-transparent interior
    // tint rather than a separate scrim rectangle — that tint already does
    // the "keep bare text/buttons legible over open art" job the scrim
    // used to (a redundant SECOND dark layer just made the backdrop nearly
    // invisible). See Backdrop.js / UITheme.js's own drawWoodFrame comment.
    addBackground(this, 'gauntletArena');
    drawWoodFrame(this, width, height);

    // Real menu theme (Origins Asset Kit's PvE/Music/home.wav) — this
    // screen had no music at all before. playMusic is a no-op if it's
    // already the active track (returning here from any menu screen that
    // doesn't touch music itself, e.g. Saga/Stage Select), so this never
    // restarts the loop mid-phrase just from re-entering Home.
    playMusic('/audio/bgm_home.wav');

    createTitlePill(this, 24, 26, 'AXIE BASE');

    this.createStatusBar();
    this.createPrimaryButtons();
    this.createDojoButton();
    this.createSecondaryIcons();
    this.createSoundToggle();

    this.messageText = this.add
      .text(width / 2, height - 26, '', { fontFamily: FONT, fontSize: '13px', color: '#ffdd33', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);
  }

  // Reference layout: the lobby's top-right corner shows ONLY XP — every
  // other stat (a rank-like number, Energy) sits in a secondary row
  // top-LEFT, under the title, and currency (ネコカン) sits bottom-right,
  // clear of everything else. The previous build stacked XP/Energy/Gems/
  // Rank all in one tall right-edge column with two Treasure/Gacha buttons
  // floating beside it — nothing there echoed the reference's actual
  // grouping, which is why it read as "lost."
  createStatusBar() {
    const playerProgress = loadPlayerProgress();
    const { current, cap } = getEnergyState();
    const { width, height } = this.scale;

    createResourceBadge(this, width - 24, 26, 'XP', Math.floor(playerProgress.xp), { valueColor: '#7fe0ff' });

    // Secondary status row, top-left under the title — mirrors the
    // reference's own "(i) 2502 [calendar]" cluster position.
    createResourceBadge(this, 140, 66, 'RANK', getUserRank(), { valueColor: '#e2b8ff', fontSize: 16 });
    createResourceBadge(this, 300, 66, 'ENERGY', `${current}/${cap}`, { valueColor: '#8fffb0', fontSize: 16 });

    // Currency, bottom-right corner — mirrors the reference's ネコカン
    // position, clear of the icon row (and its under-labels) beneath it.
    createResourceBadge(this, width - 24, height - 110, 'GEM', playerProgress.gems, { valueColor: '#ffd27f' });
  }

  createPrimaryButtons() {
    const { height } = this.scale;
    const centerX = 150;
    const startY = height / 2 - PRIMARY_BUTTON_HEIGHT - PRIMARY_BUTTON_GAP;

    const buttons = [
      // Saga expansion (bible §A.6.1): Start Battle now opens the saga
      // picker first — StageSelectScene itself moved one level deeper in
      // the nav hierarchy (Home -> Sagas -> Stages -> Battle).
      { label: 'Start Battle!!', scene: 'SagaSelectScene' },
      { label: 'Power Up', scene: 'UpgradeScene' },
      { label: 'Character Formation', scene: 'LoadoutScene' },
    ];

    buttons.forEach((button, index) => {
      const y = startY + index * (PRIMARY_BUTTON_HEIGHT + PRIMARY_BUTTON_GAP);
      createBcButton(this, centerX, y, PRIMARY_BUTTON_WIDTH, PRIMARY_BUTTON_HEIGHT, button.label, () => {
        playUiTapSfx();
        this.scene.start(button.scene);
      }, { fontSize: 17 });
    });
  }

  // Sparring Grounds (bible §A.6.4's Catclaw Dojo) — a free, timed,
  // score-attack mode. No Energy cost, so it launches GameScene directly,
  // skipping StageSelectScene's energy gate entirely (matching the bible's
  // "free-play" framing).
  createDojoButton() {
    const { height } = this.scale;
    const x = 150;
    // Sits in the gap between the primary-button stack's bottom edge and
    // the secondary-icon row's top edge — computed from the same layout
    // constants createPrimaryButtons/createSecondaryIcons use, so it never
    // collides with either regardless of future tweaks to those.
    const lastPrimaryButtonY =
      height / 2 - PRIMARY_BUTTON_HEIGHT - PRIMARY_BUTTON_GAP + 2 * (PRIMARY_BUTTON_HEIGHT + PRIMARY_BUTTON_GAP);
    const stackBottom = lastPrimaryButtonY + PRIMARY_BUTTON_HEIGHT / 2;
    const iconRowTop = height - 70 - 26;
    const y = (stackBottom + iconRowTop) / 2;

    createBcButton(this, x, y, 200, 34, 'Sparring Grounds', () => {
      playUiTapSfx();
      this.scene.start('GameScene', { mode: 'dojo' });
    }, { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 });
  }

  // Two clusters on the same row (reference: the hub-feature icons sit
  // left, under the primary buttons; Gacha/storage sit right, in their own
  // group) — rather than Gacha/Treasure floating as isolated buttons with
  // no visual relationship to anything else on the screen.
  createSecondaryIcons() {
    const { height } = this.scale;
    const y = height - 62;
    const icons = [
      // Starts clear of the audio toggle's own bottom-left corner slot
      // (x=40) — x:70 put "Menu"'s label close enough to visually collide
      // with it.
      { label: 'Menu', x: 110, glyph: '☰', action: () => this.showMenuPopup() },
      { label: 'Gamatoto', x: 190, glyph: '⛏', action: () => this.showComingSoon('Gamatoto') },
      { label: 'Missions', x: 270, glyph: '📋', action: () => this.scene.start('MissionsScene') },
      { label: 'Gacha', x: 560, glyph: '🎰', action: () => this.scene.start('GachaScene') },
      { label: 'Treasure', x: 650, glyph: '🏆', action: () => this.scene.start('TreasureScene') },
    ];

    icons.forEach((icon) => {
      createBcCircleButton(this, icon.x, y, 28, icon.glyph, () => {
        playUiTapSfx();
        icon.action();
      });
      this.add
        .text(icon.x, y + 38, icon.label, { fontFamily: FONT, fontSize: '11px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 })
        .setOrigin(0.5);

      // A small red badge on Missions when at least one is complete and
      // still unclaimed — the same "something's waiting for you" nudge
      // Battle Cats uses on its own Missions icon.
      if (icon.label === 'Missions') {
        const claimable = getMissionsWithStatus().filter((m) => m.isComplete && !m.isClaimed).length;
        if (claimable > 0) {
          this.add.circle(icon.x + 20, y - 20, 11, BC.red).setStrokeStyle(3, 0xffffff);
          this.add
            .text(icon.x + 20, y - 20, String(claimable), { fontFamily: FONT, fontSize: '11px', color: '#ffffff' })
            .setOrigin(0.5);
        }
      }
    });
  }

  // Battle Cats reference: tapping Menu opens a small popup offering the
  // にゃんこ図鑑/敵キャラ図鑑 guides (here: Unit Guide/Enemy Guide, both backed
  // by CatalogScene) — a scaled-down version of the reference's own Menu
  // popup (cream panel, gold close button, gold guide tiles), which also
  // has several buttons (Treasure List, Cat Medals, Cat Club, Help) this
  // build has no equivalent system for yet.
  showMenuPopup() {
    const { width, height } = this.scale;
    const objects = [];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();
    objects.push(overlay);

    const panelWidth = 300;
    const panelHeight = 190;
    const panel = drawBcPanel(this, width / 2, height / 2, panelWidth, panelHeight);
    objects.push(panel);

    objects.push(
      this.add
        .text(width / 2, height / 2 - panelHeight / 2 + 24, 'Menu', { fontFamily: FONT, fontSize: '18px', color: BC.inkHex })
        .setOrigin(0.5),
    );

    const closeButton = createBcCircleButton(this, width / 2 + panelWidth / 2 - 8, height / 2 - panelHeight / 2 - 8, 16, '✕', () => closePopup(), {
      fill: BC.gold,
    });
    objects.push(closeButton);

    const guideButtons = [
      { label: 'Unit Guide', rosterType: 'units' },
      { label: 'Enemy Guide', rosterType: 'enemies' },
    ];
    guideButtons.forEach((guide, index) => {
      const bx = width / 2 + (index === 0 ? -76 : 76);
      const by = height / 2 + 18;
      const btn = createBcButton(this, bx, by, 130, 74, guide.label, () => {
        this.scene.start('CatalogScene', { rosterType: guide.rosterType });
      }, { fontSize: 13 });
      objects.push(btn);
    });

    const closePopup = () => objects.forEach((obj) => obj.destroy());
    overlay.on('pointerdown', closePopup);
  }

  // Placeholder audio (bible §A.10.8, see Audio.js) is synthesized rather
  // than sampled — cheap and functional, but with a harsher/more artificial
  // timbre than shipped sound assets would have, so an easy-to-find mute
  // toggle matters more here than it would for a finished game.
  createSoundToggle() {
    // Bottom-left corner — the one slot every other screen in this pass
    // reserves for a circular icon button (their own Back button); Home is
    // the root screen and has no "back" to put there, so the audio toggle
    // takes that same visual slot instead of floating in the header.
    const x = 40;
    const y = this.scale.height - 34;

    const toggle = createBcCircleButton(this, x, y, 22, isMuted() ? '🔇' : '🔊', () => {
      const muted = !isMuted();
      setMuted(muted);
      toggle.list[3].setText(muted ? '🔇' : '🔊');
    }, { fill: BC.blue, highlight: BC.blueHighlight });
    // list[3] is the glyph Text object per createBcCircleButton's own
    // [shadow, face, sheen, text, hit] container order.
  }

  showComingSoon(label) {
    this.messageText.setText(`${label}: coming soon!`);
    this.time.delayedCall(1500, () => this.messageText.setText(''));
  }
}
