import Phaser from 'phaser';
import { getMissionsWithStatus, claimMission } from './Missions.js';
import { loadPlayerProgress } from './PlayerProgress.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { playUiTapSfx } from './Audio.js';

// The bible §A.10.1 Missions icon — previously a "coming soon" toast (see
// HomeScene.js's own header comment on why Gamatoto/Missions were deferred).
// A permanent one-time milestone list rather than a daily-reset one (see
// MISSIONS_CONFIG.js for why), paginated the same way UpgradeScene handles
// its own longer-than-one-screen roster list.

const ROW_HEIGHT = 78;
const ROW_START_Y = 84;
const ROW_WIDTH_MARGIN = 32;
const ROWS_PER_PAGE = 4;

const PROGRESS_BAR_WIDTH = 260;
const PROGRESS_BAR_HEIGHT = 14;

export default class MissionsScene extends Phaser.Scene {
  constructor() {
    super('MissionsScene');
  }

  preload() {
    preloadBackgrounds(this);
  }

  create() {
    const { width, height } = this.scale;

    this.page = 0;

    addBackground(this, 'gauntletArena');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);

    this.add
      .text(width / 2, 20, 'Missions', { fontFamily: 'Rowdies, sans-serif', fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5);

    const backButton = this.add.rectangle(50, 20, 80, 32, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 20, 'Back', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.scene.start('HomeScene'));

    this.gemsText = this.add
      .text(width - 16, 20, '', { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#66ddff' })
      .setOrigin(1, 0.5);

    this.rowContainer = this.add.container(0, 0);

    const pagerY = ROW_START_Y + ROWS_PER_PAGE * ROW_HEIGHT + 10;
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
      const totalPages = Math.ceil(getMissionsWithStatus().length / ROWS_PER_PAGE);
      if (this.page < totalPages - 1) {
        this.page += 1;
        this.refresh();
      }
    });

    this.pageText = this.add.text(width / 2, pagerY, '', { fontFamily: 'Rowdies, sans-serif', fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);

    this.messageText = this.add
      .text(width / 2, height - 16, '', { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#ffdd33' })
      .setOrigin(0.5);

    this.refresh();
  }

  refresh() {
    this.rowContainer.removeAll(true);

    const missions = getMissionsWithStatus();
    // Not-yet-complete missions first (what a player can still work toward),
    // then complete-but-unclaimed (needs a tap), then already-claimed —
    // rather than the config's own fixed order, so finished business never
    // buries what's still actionable.
    const sorted = [...missions].sort((a, b) => {
      const rank = (m) => (m.isClaimed ? 2 : m.isComplete ? 0 : 1);
      return rank(a) - rank(b);
    });

    const totalPages = Math.ceil(sorted.length / ROWS_PER_PAGE);
    const pageMissions = sorted.slice(this.page * ROWS_PER_PAGE, this.page * ROWS_PER_PAGE + ROWS_PER_PAGE);

    pageMissions.forEach((mission, index) => {
      this.renderMissionRow(mission, ROW_START_Y + index * ROW_HEIGHT);
    });

    this.pageText.setText(`Page ${this.page + 1}/${totalPages}`);
    this.gemsText.setText(`Gems: ${loadPlayerProgress().gems}`);
  }

  renderMissionRow(mission, y) {
    const { width } = this.scale;
    const rowObjects = [];

    rowObjects.push(this.add.rectangle(width / 2, y, width - ROW_WIDTH_MARGIN, ROW_HEIGHT - 8, 0x222222, mission.isClaimed ? 0.55 : 0.85));

    rowObjects.push(
      this.add
        .text(24, y - 22, mission.displayName, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '14px',
          color: mission.isClaimed ? '#888888' : '#ffffff',
        })
        .setOrigin(0, 0.5),
    );
    rowObjects.push(
      this.add
        .text(24, y - 3, mission.description, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '10px',
          color: '#aaaaaa',
        })
        .setOrigin(0, 0.5),
    );

    // Progress bar — a plain fill rather than a mask/crop, since it never
    // needs partial-pixel precision, just a quick "how close am I" read.
    const barX = 24;
    const barY = y + 18;
    rowObjects.push(this.add.rectangle(barX, barY, PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT, 0x111111).setOrigin(0, 0.5));
    const fillWidth = Math.max(2, (mission.progress / mission.target) * PROGRESS_BAR_WIDTH);
    rowObjects.push(
      this.add
        .rectangle(barX, barY, fillWidth, PROGRESS_BAR_HEIGHT, mission.isComplete ? 0x33cc66 : 0x3366cc)
        .setOrigin(0, 0.5),
    );
    rowObjects.push(
      this.add
        .text(barX + PROGRESS_BAR_WIDTH + 10, barY, `${mission.progress.toLocaleString()}/${mission.target.toLocaleString()}`, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '10px',
          color: '#cccccc',
        })
        .setOrigin(0, 0.5),
    );

    rowObjects.push(...this.renderClaimButton(mission, y));

    this.rowContainer.add(rowObjects);
  }

  renderClaimButton(mission, y) {
    const x = this.scale.width - 90;

    if (mission.isClaimed) {
      const rect = this.add.rectangle(x, y, 120, 40, 0x333333);
      const label = this.add
        .text(x, y, 'Claimed', { fontFamily: 'Rowdies, sans-serif', fontSize: '12px', color: '#888888' })
        .setOrigin(0.5);
      return [rect, label];
    }

    const rect = this.add
      .rectangle(x, y, 120, 40, mission.isComplete ? 0xffdd33 : 0x444444)
      .setAlpha(mission.isComplete ? 1 : 0.5);
    const label = this.add
      .text(x, y, `Claim\n${mission.rewardGems} Gems`, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '11px',
        color: mission.isComplete ? '#000000' : '#aaaaaa',
        align: 'center',
      })
      .setOrigin(0.5);

    if (mission.isComplete) {
      rect.setInteractive({ useHandCursor: true });
      rect.on('pointerdown', () => {
        playUiTapSfx();
        const claimed = claimMission(mission.id);
        if (claimed) this.showMessage(`+${claimed.rewardGems} Gems!`);
        this.refresh();
      });
    }

    return [rect, label];
  }

  showMessage(text) {
    this.messageText.setText(text);
    this.time.delayedCall(1800, () => {
      if (this.messageText.text === text) this.messageText.setText('');
    });
  }
}
