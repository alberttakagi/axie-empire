import Phaser from 'phaser';
import { loadPlayerProgress } from './PlayerProgress.js';
import { getEnergyState } from './Energy.js';
import { isMuted, setMuted, playUiTapSfx } from './Audio.js';
import { getUserRank } from './UserRank.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { getMissionsWithStatus } from './Missions.js';

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

const PRIMARY_BUTTON_WIDTH = 220;
const PRIMARY_BUTTON_HEIGHT = 56;
const PRIMARY_BUTTON_GAP = 14;

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
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);

    this.add
      .text(width / 2, 40, 'Axie Skirmish', { fontFamily: 'Rowdies, sans-serif', fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);

    this.createStatusBar();
    this.createPrimaryButtons();
    this.createDojoButton();
    this.createSecondaryIcons();
    this.createSoundToggle();

    this.messageText = this.add
      .text(width / 2, height - 20, '', { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#ffdd33' })
      .setOrigin(0.5);
  }

  createStatusBar() {
    const playerProgress = loadPlayerProgress();
    const { current, cap } = getEnergyState();

    this.add
      .text(16, 20, `XP: ${Math.floor(playerProgress.xp).toLocaleString()}`, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '13px',
        color: '#ffdd33',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(16, 40, `Energy: ${current}/${cap}`, { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#66ccff' })
      .setOrigin(0, 0.5);

    const treasureButton = this.add
      .rectangle(this.scale.width - 60, 24, 96, 32, 0xcc9933)
      .setInteractive({ useHandCursor: true });
    this.add.text(this.scale.width - 60, 24, 'Treasure', { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    treasureButton.on('pointerdown', () => {
      playUiTapSfx();
      this.scene.start('TreasureScene');
    });

    const gachaButton = this.add
      .rectangle(this.scale.width - 164, 24, 96, 32, 0x33aacc)
      .setInteractive({ useHandCursor: true });
    this.add.text(this.scale.width - 164, 24, 'Gacha', { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    gachaButton.on('pointerdown', () => {
      playUiTapSfx();
      this.scene.start('GachaScene');
    });

    this.add
      .text(16, 60, `Gems: ${playerProgress.gems.toLocaleString()}`, { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#66ddff' })
      .setOrigin(0, 0.5);

    // User Rank (bible §A.7.4) — a plain, always-visible "number that only
    // goes up" progression signal; see UserRank.js for why it gates nothing.
    this.add
      .text(16, 80, `Rank: ${getUserRank().toLocaleString()}`, { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#cc99ff' })
      .setOrigin(0, 0.5);
  }

  createPrimaryButtons() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const startY = height / 2 - PRIMARY_BUTTON_HEIGHT - PRIMARY_BUTTON_GAP;

    const buttons = [
      // Saga expansion (bible §A.6.1): Start Battle now opens the saga
      // picker first — StageSelectScene itself moved one level deeper in
      // the nav hierarchy (Home -> Sagas -> Stages -> Battle).
      { label: 'Start Battle!!', color: 0xffcc33, scene: 'SagaSelectScene' },
      { label: 'Power Up', color: 0x9933cc, scene: 'UpgradeScene' },
      { label: 'Character Formation', color: 0x3366cc, scene: 'LoadoutScene' },
    ];

    buttons.forEach((button, index) => {
      const y = startY + index * (PRIMARY_BUTTON_HEIGHT + PRIMARY_BUTTON_GAP);
      const rect = this.add
        .rectangle(centerX, y, PRIMARY_BUTTON_WIDTH, PRIMARY_BUTTON_HEIGHT, button.color)
        .setInteractive({ useHandCursor: true });
      this.add.text(centerX, y, button.label, { fontFamily: 'Rowdies, sans-serif', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
      rect.on('pointerdown', () => {
        playUiTapSfx();
        this.scene.start(button.scene);
      });
    });
  }

  // Sparring Grounds (bible §A.6.4's Catclaw Dojo) — a free, timed,
  // score-attack mode. No Energy cost, so it launches GameScene directly,
  // skipping StageSelectScene's energy gate entirely (matching the bible's
  // "free-play" framing).
  createDojoButton() {
    const { width, height } = this.scale;
    const x = width / 2;
    // Sits in the gap between the primary-button stack's bottom edge and
    // the secondary-icon row's top edge — computed from the same layout
    // constants createPrimaryButtons/createSecondaryIcons use, so it never
    // collides with either regardless of future tweaks to those.
    const lastPrimaryButtonY =
      height / 2 - PRIMARY_BUTTON_HEIGHT - PRIMARY_BUTTON_GAP + 2 * (PRIMARY_BUTTON_HEIGHT + PRIMARY_BUTTON_GAP);
    const stackBottom = lastPrimaryButtonY + PRIMARY_BUTTON_HEIGHT / 2;
    const iconRowTop = height - 60 - 26;
    const y = (stackBottom + iconRowTop) / 2;

    const rect = this.add.rectangle(x, y, 200, 36, 0x669933).setInteractive({ useHandCursor: true });
    this.add.text(x, y, 'Sparring Grounds', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    rect.on('pointerdown', () => {
      playUiTapSfx();
      this.scene.start('GameScene', { mode: 'dojo' });
    });
  }

  createSecondaryIcons() {
    const { width, height } = this.scale;
    const y = height - 60;
    const icons = [
      { label: 'Menu', x: width / 2 - 100 },
      { label: 'Gamatoto', x: width / 2 },
      { label: 'Missions', x: width / 2 + 100 },
    ];

    icons.forEach((icon) => {
      const rect = this.add.circle(icon.x, y, 26, 0x444444).setInteractive({ useHandCursor: true });
      this.add
        .text(icon.x, y + 36, icon.label, { fontFamily: 'Rowdies, sans-serif', fontSize: '11px', color: '#aaaaaa' })
        .setOrigin(0.5);

      // A small red badge on Missions when at least one is complete and
      // still unclaimed — the same "something's waiting for you" nudge
      // Battle Cats uses on its own Missions icon.
      if (icon.label === 'Missions') {
        const claimable = getMissionsWithStatus().filter((m) => m.isComplete && !m.isClaimed).length;
        if (claimable > 0) {
          this.add.circle(icon.x + 18, y - 18, 10, 0xff3333);
          this.add
            .text(icon.x + 18, y - 18, String(claimable), { fontFamily: 'Rowdies, sans-serif', fontSize: '11px', color: '#ffffff' })
            .setOrigin(0.5);
        }
      }

      rect.on('pointerdown', () => {
        playUiTapSfx();
        if (icon.label === 'Menu') this.showMenuPopup();
        else if (icon.label === 'Missions') this.scene.start('MissionsScene');
        else this.showComingSoon(icon.label);
      });
    });
  }

  // Battle Cats reference: tapping Menu opens a small popup offering the
  // にゃんこ図鑑/敵キャラ図鑑 guides (here: Unit Guide/Enemy Guide, both backed
  // by CatalogScene) — a scaled-down version of the reference's own Menu
  // popup, which also has several buttons (Treasure List, Cat Medals,
  // Cat Club, Help) this build has no equivalent system for yet.
  showMenuPopup() {
    const { width, height } = this.scale;
    const objects = [];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();
    objects.push(overlay);

    const panelWidth = 280;
    const panelHeight = 180;
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0xf5f0e0).setStrokeStyle(3, 0x996633);
    objects.push(panel);

    objects.push(
      this.add
        .text(width / 2, height / 2 - panelHeight / 2 + 22, 'Menu', { fontFamily: 'Rowdies, sans-serif', fontSize: '18px', color: '#333333' })
        .setOrigin(0.5),
    );

    const closeButton = this.add
      .text(width / 2 + panelWidth / 2 - 18, height / 2 - panelHeight / 2 + 16, '✕', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '16px',
        color: '#333333',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    objects.push(closeButton);

    const guideButtons = [
      { label: 'Unit Guide', rosterType: 'units' },
      { label: 'Enemy Guide', rosterType: 'enemies' },
    ];
    guideButtons.forEach((guide, index) => {
      const bx = width / 2 + (index === 0 ? -70 : 70);
      const by = height / 2 + 10;
      const rect = this.add.rectangle(bx, by, 120, 70, 0xffcc66).setStrokeStyle(2, 0x996633).setInteractive({ useHandCursor: true });
      const label = this.add
        .text(bx, by, guide.label, { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#333333', align: 'center', wordWrap: { width: 100 } })
        .setOrigin(0.5);
      // stopPropagation: this button sits on top of the full-screen overlay
      // below, which also listens for pointerdown to close the popup —
      // without this, tapping a guide button would fire both handlers.
      rect.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        playUiTapSfx();
        this.scene.start('CatalogScene', { rosterType: guide.rosterType });
      });
      objects.push(rect, label);
    });

    const closePopup = () => objects.forEach((obj) => obj.destroy());
    overlay.on('pointerdown', closePopup);
    closeButton.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      closePopup();
    });
  }

  // Placeholder audio (bible §A.10.8, see Audio.js) is synthesized rather
  // than sampled — cheap and functional, but with a harsher/more artificial
  // timbre than shipped sound assets would have, so an easy-to-find mute
  // toggle matters more here than it would for a finished game.
  createSoundToggle() {
    const x = this.scale.width - 164 - 100;
    const y = 24;

    this.soundToggle = this.add.circle(x, y, 16, 0x444444).setInteractive({ useHandCursor: true });
    this.soundToggleText = this.add.text(x, y, isMuted() ? '🔇' : '🔊', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px' }).setOrigin(0.5);
    this.soundToggle.on('pointerdown', () => {
      const muted = !isMuted();
      setMuted(muted);
      this.soundToggleText.setText(muted ? '🔇' : '🔊');
    });
  }

  showComingSoon(label) {
    this.messageText.setText(`${label}: coming soon!`);
    this.time.delayedCall(1500, () => this.messageText.setText(''));
  }
}
