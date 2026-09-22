import Phaser from 'phaser';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { FONT } from './UITheme.js';
import { playMusic } from './Audio.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';

// Opening lore screen (guide Chapter 04's 起動・タイトル・オープニング,
// adapted per the user's own call in two ways: it plays on every launch,
// not just the first (a departure from the real game's one-time intro),
// and it runs BEFORE the title screen rather than after it (a departure
// from the guide's own Title -> Opening order). This is the scene that
// boots first (see main.js's scene order) and always hands off to
// TitleScene next, either after the full scroll or the instant the player
// taps Skip.
//
// The reference spec (guide): ~27px/sec scroll (a full real chapter intro
// runs ~40 real seconds), a tap-hold 3x speed-up, top/bottom fade zones,
// and a Skip button that works immediately with no confirmation — kept
// here, running this game's own origin story below (see STORY_LINES)
// instead of a made-up per-chapter intro, since this project has exactly
// one such story to tell.
const SCROLL_SPEED_PX_PER_SEC = 26;
const HOLD_SPEED_MULTIPLIER = 3;
const FADE_ZONE_HEIGHT = 46;
const SKIP_BUTTON_FADE_IN_MS = 900;
const END_HOLD_MS = 500; // pause once the text fully clears the top fade, before handing off to TitleScene

// This game's own opening narration — back to the very first draft's
// original "Empire of Axies vs. the Chimeras" story (no real Axie-lore
// names/beats borrowed), per the user's own standing call: they want the
// ORIGINAL narrative's lighter, Battle-Cats-style tone over a faithful
// retelling of Axie Infinity's actual lore — later passes that leaned into
// the real "Tales of Lunacia" material (Atia, moon shards, etc.) were a
// deviation from that, not an improvement on it.
const STORY_LINES = [
  'Long ago, the Empire of Axies flourished in peace, its lineages thriving from coast to coast.',
  'Then, without warning, the Chimeras came — twisted, hungry things from far beyond the borders.',
  'Village after village fell silent. The Empire’s armies were never built for a war like this one.',
  'But deep in the old bloodlines, a strength remained: small, round, and utterly relentless.',
  'One by one, the Axies rose to answer the call.',
  'Their weapons were humble. Their numbers, endless. Their spirit, unbreakable.',
  'This is the story of that stand — stage by stage, chapter by chapter — until the Empire stands again.',
  'The battle for the Empire of Axies begins now.',
];

export default class OpeningScene extends Phaser.Scene {
  constructor() {
    super('OpeningScene');
  }

  preload() {
    // Only actually needed on a first-ever launch (see create()'s early
    // return below), but preload() has no way to know that yet — loading
    // one extra background image is cheap enough not to bother gating it.
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

    addBackground(this, 'dusk'); // a glowing moonlit forest — fits Lunacia's own moon-and-light imagery better than the temple ruins
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);

    // User-provided theme for the lore scroll — this screen had no music
    // at all before.
    playMusic('/audio/bgm_arctic_theme.mp3');

    this.storyText = this.add
      .text(width / 2, height, STORY_LINES.join('\n\n'), {
        fontFamily: FONT, fontSize: '15px', color: '#f5ead0',
        align: 'center', lineSpacing: 14,
        wordWrap: { width: width * 0.72 },
      })
      .setOrigin(0.5, 0);

    // Text starts fully below the screen and scrolls up until it's fully
    // cleared the top — see update()'s own end-condition check.
    this.scrollDistance = height + this.storyText.height + FADE_ZONE_HEIGHT;
    this.scrolledSoFar = 0;
    this.hasEnded = false;

    // Fade zones (guide: 72px @1280x720, scaled to this canvas) so the
    // text visually dissolves into the frame's edges rather than just
    // getting clipped — drawn OVER the text, which is why these are added
    // last.
    const topFade = this.add.graphics();
    topFade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 1, 1, 0, 0);
    topFade.fillRect(0, 0, width, FADE_ZONE_HEIGHT);
    const bottomFade = this.add.graphics();
    bottomFade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 1, 1);
    bottomFade.fillRect(0, height - FADE_ZONE_HEIGHT, width, FADE_ZONE_HEIGHT);

    this.skipText = this.add
      .text(20, height - 20, 'Skip »', {
        fontFamily: FONT, fontSize: '14px', color: '#ffffff',
        stroke: '#1d1a16', strokeThickness: 3,
      })
      .setOrigin(0, 1)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.finishOpening());
    this.tweens.add({ targets: this.skipText, alpha: 1, duration: 300, delay: SKIP_BUTTON_FADE_IN_MS });
  }

  update(time, deltaMs) {
    if (this.hasEnded) return;

    const speed = this.input.activePointer.isDown ? SCROLL_SPEED_PX_PER_SEC * HOLD_SPEED_MULTIPLIER : SCROLL_SPEED_PX_PER_SEC;
    const step = (speed * deltaMs) / 1000;
    this.storyText.y -= step;
    this.scrolledSoFar += step;

    if (this.scrolledSoFar >= this.scrollDistance) {
      this.hasEnded = true;
      this.time.delayedCall(END_HOLD_MS, () => this.finishOpening());
    }
  }

  finishOpening() {
    if (this.isFinishing) return; // Skip tapped again during the natural end-hold delay, or twice in a row
    this.isFinishing = true;
    this.scene.start('TitleScene');
  }
}
