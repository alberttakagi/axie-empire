import Phaser from 'phaser';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { BC, FONT, createBcButton, createBcCircleButton, drawBcPanel } from './UITheme.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';
import {
  getSfxVolumeLevel, cycleSfxVolumeLevel,
  getBgmVolumeLevel, cycleBgmVolumeLevel,
  VOLUME_LEVEL_LABELS,
} from './Audio.js';

// Title screen (guide Chapter 04's 起動・タイトル・オープニング) — the one
// piece of that boot sequence this project had skipped entirely: it went
// straight from `new Phaser.Game` into the opening lore scroll with no
// logo/"Game Start" screen at all. Reached from OpeningScene once the lore
// scroll finishes (or Skip is tapped); "Game Start" here hands off to
// HomeScene.
//
// Real Battle Cats: Splash -> Loading -> Title -> Opening (first launch
// only) -> Menu. This project's Splash/Loading has nothing to actually
// wait on (everything's a local Vite build, not a downloaded asset
// bundle), so those two are skipped outright. The Title/Opening ORDER is
// also deliberately swapped from the guide's own — per the user's own
// call, the lore plays first and this screen second — so main.js boots
// straight into OpeningScene, not this one.
const LOGO_BOB_PX = 6;
const LOGO_BOB_MS = 1400;
const LOGO_DISPLAY_WIDTH = 520; // logical px — leaves clear margin on the 800-wide canvas either side
const VERSION_TEXT = 'v1.0';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  preload() {
    preloadBackgrounds(this);
    this.load.image('title_logo', 'logo.png');
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
    // Phaser reuses this same scene instance across every scene.start
    // (registered as a class in main.js) — see StageSelectScene's
    // isLeavingScene/deployPopupObjects and GameScene's quitConfirmObjects
    // for the confirmed real bug this exact pattern already caused
    // elsewhere this pass. Not known to be reachable here today (the
    // settings overlay's own full-screen interactive scrim should block
    // "Game Start" underneath it), but resetting defensively costs
    // nothing and matches the convention everywhere else now.
    this.settingsPopupObjects = null;

    const { width, height } = LOGICAL_SIZE;

    // Same backdrop HomeScene uses — Title and the hub it leads into read
    // as one continuous place, distinct from the opening lore's own
    // separate moonlit-forest mood.
    addBackground(this, 'gauntletArena');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.35);

    // Real logo art (public/logo.png) in place of the old plain text
    // treatment — same floating bob tween carried over unchanged, just
    // applied to the image instead of a Text object.
    const logo = this.add.image(width / 2, height * 0.32, 'title_logo');
    logo.setDisplaySize(LOGO_DISPLAY_WIDTH, LOGO_DISPLAY_WIDTH * (logo.height / logo.width));
    this.tweens.add({
      targets: logo, y: logo.y - LOGO_BOB_PX,
      duration: LOGO_BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    createBcButton(this, width / 2, height * 0.62, 260, 72, 'Game Start', () => {
      this.scene.start('HomeScene');
    }, { fontSize: 22 });

    createBcCircleButton(this, width - 30, height - 30, 20, '⚙', () => this.showSettingsPopup(), { fill: 0x8a8a8a, highlight: 0xbbbbbb });

    this.add
      .text(12, height - 12, VERSION_TEXT, {
        fontFamily: FONT, fontSize: '11px', color: '#ffffff',
        stroke: '#1d1a16', strokeThickness: 3,
      })
      .setOrigin(0, 1);
  }

  // Same SFX/BGM volume controls as GameScene's own Options popup — this is
  // the only other place a player might reasonably want to mute/adjust
  // before ever reaching a battle.
  showSettingsPopup() {
    if (this.settingsPopupObjects) return;

    const { width, height } = LOGICAL_SIZE;
    const objects = [];
    const panelY = height / 2;

    objects.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setInteractive());
    objects.push(drawBcPanel(this, width / 2, panelY, 320, 170));
    objects.push(this.add.text(width / 2, panelY - 60, 'Settings', { fontFamily: FONT, fontSize: '18px', color: BC.inkHex }).setOrigin(0.5));
    objects.push(createBcCircleButton(this, width / 2 + 145, panelY - 65, 14, '✕', () => this.hideSettingsPopup()));

    objects.push(
      this.add.text(width / 2 - 120, panelY - 20, 'SFX Volume', { fontFamily: FONT, fontSize: '14px', color: BC.inkHex }).setOrigin(0, 0.5),
    );
    const sfxButton = createBcButton(
      this, width / 2 + 90, panelY - 20, 100, 32, VOLUME_LEVEL_LABELS[getSfxVolumeLevel()],
      () => sfxButton.bcText.setText(VOLUME_LEVEL_LABELS[cycleSfxVolumeLevel()]),
      { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 },
    );
    objects.push(sfxButton);

    objects.push(
      this.add.text(width / 2 - 120, panelY + 20, 'BGM Volume', { fontFamily: FONT, fontSize: '14px', color: BC.inkHex }).setOrigin(0, 0.5),
    );
    const bgmButton = createBcButton(
      this, width / 2 + 90, panelY + 20, 100, 32, VOLUME_LEVEL_LABELS[getBgmVolumeLevel()],
      () => bgmButton.bcText.setText(VOLUME_LEVEL_LABELS[cycleBgmVolumeLevel()]),
      { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 },
    );
    objects.push(bgmButton);

    this.settingsPopupObjects = objects;
  }

  hideSettingsPopup() {
    if (!this.settingsPopupObjects) return;
    this.settingsPopupObjects.forEach((obj) => obj.destroy());
    this.settingsPopupObjects = null;
  }
}
