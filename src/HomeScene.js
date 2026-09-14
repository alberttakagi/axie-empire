import Phaser from 'phaser';
import { loadPlayerProgress } from './PlayerProgress.js';
import { getEnergyState } from './Energy.js';
import { isMuted, setMuted } from './Audio.js';
import { getUserRank } from './UserRank.js';

// The bible's §A.10.1 Home/Base Screen — confirmed-from-screenshot layout:
// a top status bar, a center-lower stack of three primary action buttons
// ("Start Battle!!" / "Power Up" / "Character Formation"), and a secondary
// icon row (Menu / Gamatoto / Missions). This is now the game's actual
// first screen — StageSelectScene no longer doubles as the hub.
//
// Gamatoto (an idle side-activity for base-building materials) and
// Missions (quest objectives) are shown as real icons matching the
// confirmed layout, but have no backing system yet in this build — they're
// deliberately out of scope for this pass (nothing in the bible's Phase
// 1-5 build order requires them), so tapping either just shows a "coming
// soon"-style toast rather than pretending to be a finished feature.

const PRIMARY_BUTTON_WIDTH = 220;
const PRIMARY_BUTTON_HEIGHT = 56;
const PRIMARY_BUTTON_GAP = 14;

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, 40, 'Axie Skirmish', { fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);

    this.createStatusBar();
    this.createPrimaryButtons();
    this.createDojoButton();
    this.createSecondaryIcons();
    this.createSoundToggle();

    this.messageText = this.add
      .text(width / 2, height - 20, '', { fontSize: '13px', color: '#ffdd33' })
      .setOrigin(0.5);
  }

  createStatusBar() {
    const playerProgress = loadPlayerProgress();
    const { current, cap } = getEnergyState();

    this.add
      .text(16, 20, `XP: ${Math.floor(playerProgress.xp).toLocaleString()}`, {
        fontSize: '13px',
        color: '#ffdd33',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(16, 40, `Energy: ${current}/${cap}`, { fontSize: '13px', color: '#66ccff' })
      .setOrigin(0, 0.5);

    const treasureButton = this.add
      .rectangle(this.scale.width - 60, 24, 96, 32, 0xcc9933)
      .setInteractive({ useHandCursor: true });
    this.add.text(this.scale.width - 60, 24, 'Treasure', { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    treasureButton.on('pointerdown', () => this.scene.start('TreasureScene'));

    const gachaButton = this.add
      .rectangle(this.scale.width - 164, 24, 96, 32, 0x33aacc)
      .setInteractive({ useHandCursor: true });
    this.add.text(this.scale.width - 164, 24, 'Gacha', { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    gachaButton.on('pointerdown', () => this.scene.start('GachaScene'));

    this.add
      .text(16, 60, `Gems: ${playerProgress.gems.toLocaleString()}`, { fontSize: '13px', color: '#66ddff' })
      .setOrigin(0, 0.5);

    // User Rank (bible §A.7.4) — a plain, always-visible "number that only
    // goes up" progression signal; see UserRank.js for why it gates nothing.
    this.add
      .text(16, 80, `Rank: ${getUserRank().toLocaleString()}`, { fontSize: '13px', color: '#cc99ff' })
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
      this.add.text(centerX, y, button.label, { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
      rect.on('pointerdown', () => this.scene.start(button.scene));
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
    this.add.text(x, y, 'Sparring Grounds', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    rect.on('pointerdown', () => this.scene.start('GameScene', { mode: 'dojo' }));
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
        .text(icon.x, y + 36, icon.label, { fontSize: '11px', color: '#aaaaaa' })
        .setOrigin(0.5);
      rect.on('pointerdown', () => this.showComingSoon(icon.label));
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
    this.soundToggleText = this.add.text(x, y, isMuted() ? '🔇' : '🔊', { fontSize: '14px' }).setOrigin(0.5);
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
