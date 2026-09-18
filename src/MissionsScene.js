import Phaser from 'phaser';
import { getMissionsWithStatus, claimMission } from './Missions.js';
import { loadPlayerProgress } from './PlayerProgress.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { playUiTapSfx } from './Audio.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, createResourceBadge, drawWoodFrame } from './UITheme.js';

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

    // Dimmed by drawWoodFrame's own semi-transparent interior tint, not a
    // separate scrim — see HomeScene.js's identical note. Frame is added
    // BEFORE any content container regardless — see TreasureScene.js's own
    // note: adding it after would render the tint OVER every row instead
    // of behind it.
    addBackground(this, 'gauntletArena');
    drawWoodFrame(this, width, height);

    createTitlePill(this, 24, 22, 'Missions');
    createBackButton(this, () => this.scene.start('HomeScene'));

    this.rowContainer = this.add.container(0, 0);

    const pagerY = ROW_START_Y + ROWS_PER_PAGE * ROW_HEIGHT + 10;
    createBcButton(this, width / 2 - 90, pagerY, 70, 28, '< Prev', () => {
      if (this.page > 0) {
        this.page -= 1;
        this.refresh();
      }
    }, { fill: 0x8a8a8a, highlight: 0xbbbbbb, textColor: '#ffffff', fontSize: 12 });

    createBcButton(this, width / 2 + 90, pagerY, 70, 28, 'Next >', () => {
      const totalPages = Math.ceil(getMissionsWithStatus().length / ROWS_PER_PAGE);
      if (this.page < totalPages - 1) {
        this.page += 1;
        this.refresh();
      }
    }, { fill: 0x8a8a8a, highlight: 0xbbbbbb, textColor: '#ffffff', fontSize: 12 });

    this.pageText = this.add.text(width / 2, pagerY, '', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);

    this.messageText = this.add
      .text(width / 2, height - 16, '', { fontFamily: FONT, fontSize: '13px', color: '#ffcf6b', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);

    this.refresh();
  }

  refresh() {
    this.rowContainer.removeAll(true);
    const { width } = this.scale;

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
    if (this.gemsBadge) this.gemsBadge.destroy();
    this.gemsBadge = createResourceBadge(this, width - 24, 22, 'GEM', loadPlayerProgress().gems, { valueColor: '#ffd27f', fontSize: 16 });
  }

  renderMissionRow(mission, y) {
    const { width } = this.scale;
    const rowObjects = [];

    const cardHeight = ROW_HEIGHT - 8;
    const g = this.add.graphics();
    g.fillStyle(BC.ink, 0.2);
    g.fillRoundedRect(width / 2 - (width - ROW_WIDTH_MARGIN) / 2 + 2, y - cardHeight / 2 + 3, width - ROW_WIDTH_MARGIN, cardHeight, 12);
    g.fillStyle(mission.isClaimed ? 0xcccccc : BC.panel, 1);
    g.fillRoundedRect(width / 2 - (width - ROW_WIDTH_MARGIN) / 2, y - cardHeight / 2, width - ROW_WIDTH_MARGIN, cardHeight, 12);
    g.lineStyle(mission.isComplete && !mission.isClaimed ? 3 : 2, mission.isComplete && !mission.isClaimed ? BC.gold : BC.ink, 1);
    g.strokeRoundedRect(width / 2 - (width - ROW_WIDTH_MARGIN) / 2, y - cardHeight / 2, width - ROW_WIDTH_MARGIN, cardHeight, 12);
    rowObjects.push(g);

    rowObjects.push(
      this.add
        .text(24, y - 22, mission.displayName, {
          fontFamily: FONT, fontSize: '14px',
          color: mission.isClaimed ? '#8a8a8a' : BC.inkHex,
        })
        .setOrigin(0, 0.5),
    );
    rowObjects.push(
      this.add
        .text(24, y - 3, mission.description, {
          fontFamily: FONT, fontSize: '10px',
          color: '#6a6a6a',
        })
        .setOrigin(0, 0.5),
    );

    // Progress bar — a plain fill rather than a mask/crop, since it never
    // needs partial-pixel precision, just a quick "how close am I" read.
    const barX = 24;
    const barY = y + 18;
    rowObjects.push(this.add.rectangle(barX, barY, PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT, 0xffffff).setStrokeStyle(2, BC.ink).setOrigin(0, 0.5));
    const fillWidth = Math.max(2, (mission.progress / mission.target) * PROGRESS_BAR_WIDTH);
    rowObjects.push(
      this.add
        .rectangle(barX + 2, barY, Math.max(2, fillWidth - 4), PROGRESS_BAR_HEIGHT - 4, mission.isComplete ? 0x4caf50 : BC.blue)
        .setOrigin(0, 0.5),
    );
    rowObjects.push(
      this.add
        .text(barX + PROGRESS_BAR_WIDTH + 10, barY, `${mission.progress.toLocaleString()}/${mission.target.toLocaleString()}`, {
          fontFamily: FONT, fontSize: '10px',
          color: '#5a5a5a',
        })
        .setOrigin(0, 0.5),
    );

    rowObjects.push(this.renderClaimButton(mission, y));

    this.rowContainer.add(rowObjects);
  }

  renderClaimButton(mission, y) {
    const x = this.scale.width - 90;

    if (mission.isClaimed) {
      return createBcButton(this, x, y, 120, 40, 'Claimed', () => {}, { fill: 0x8a8a8a, textColor: '#e0e0e0' });
    }

    return createBcButton(this, x, y, 120, 40, `Claim\n${mission.rewardGems} Gems`, () => {
      if (!mission.isComplete) return;
      playUiTapSfx();
      const claimed = claimMission(mission.id);
      if (claimed) this.showMessage(`+${claimed.rewardGems} Gems!`);
      this.refresh();
    }, mission.isComplete ? { fontSize: 11 } : { fill: 0x8a8a8a, textColor: '#cccccc', fontSize: 11 });
  }

  showMessage(text) {
    this.messageText.setText(text);
    this.time.delayedCall(1800, () => {
      if (this.messageText.text === text) this.messageText.setText('');
    });
  }
}
