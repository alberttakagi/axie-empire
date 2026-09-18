import Phaser from 'phaser';
import { loadPlayerProgress } from './PlayerProgress.js';
import { getEnergyState } from './Energy.js';
import { isMuted, setMuted, playUiTapSfx } from './Audio.js';
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

    // Backdrop, dimmed by a flat scrim (rather than GameScene's own
    // lane-only darkened band) since almost this whole screen is bare text
    // over open background, not just one narrow strip — see Backdrop.js.
    addBackground(this, 'gauntletArena');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    drawWoodFrame(this, width, height);

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

  createStatusBar() {
    const playerProgress = loadPlayerProgress();
    const { current, cap } = getEnergyState();
    const { width } = this.scale;

    createResourceBadge(this, width - 24, 26, 'XP', Math.floor(playerProgress.xp), { valueColor: '#7fe0ff' });
    createResourceBadge(this, width - 24, 58, 'NRG', `${current}/${cap}`, { valueColor: '#8fffb0' });
    createResourceBadge(this, width - 24, 90, 'GEM', playerProgress.gems, { valueColor: '#ffd27f' });
    createResourceBadge(this, width - 24, 122, 'RANK', getUserRank(), { valueColor: '#e2b8ff' });

    createBcButton(this, width - 158, 158, 96, 32, 'Treasure', () => {
      playUiTapSfx();
      this.scene.start('TreasureScene');
    }, { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 });

    createBcButton(this, width - 158, 198, 96, 32, 'Gacha', () => {
      playUiTapSfx();
      this.scene.start('GachaScene');
    }, { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 });
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

  createSecondaryIcons() {
    const { height } = this.scale;
    const y = height - 62;
    const icons = [
      { label: 'Menu', x: 150 - 100, glyph: '☰' },
      { label: 'Gamatoto', x: 150, glyph: '⛏' },
      { label: 'Missions', x: 150 + 100, glyph: '📋' },
    ];

    icons.forEach((icon) => {
      createBcCircleButton(this, icon.x, y, 28, icon.glyph, () => {
        playUiTapSfx();
        if (icon.label === 'Menu') this.showMenuPopup();
        else if (icon.label === 'Missions') this.scene.start('MissionsScene');
        else this.showComingSoon(icon.label);
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
    const x = this.scale.width - 24 - 210;
    const y = 158;

    const toggle = createBcCircleButton(this, x, y, 18, isMuted() ? '🔇' : '🔊', () => {
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
