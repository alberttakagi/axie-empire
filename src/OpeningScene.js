import Phaser from 'phaser';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { FONT } from './UITheme.js';
import { hasSeenOpening, markOpeningSeen } from './OpeningStory.js';

// Opening lore screen (guide Chapter 04's 起動・タイトル・オープニング) —
// real Battle Cats plays a bottom-to-top auto-scrolling story text only
// once, on a device's very first launch, before ever reaching the main
// menu. Every later launch skips straight past this scene (see create()'s
// very first check) — HomeScene stays the game's normal entry point, this
// is purely a first-run intro in front of it (see main.js's scene order).
//
// The reference spec (guide): ~27px/sec scroll (a full real chapter intro
// runs ~40 real seconds), a tap-hold 3x speed-up, top/bottom fade zones,
// and a Skip button that fades in shortly after start and works
// immediately with no confirmation. Reproduced here at the same relative
// pace, just with far shorter (original) flavor text than a real 6-10-line
// chapter intro, since this project has exactly one such intro to write,
// not one per chapter.
const SCROLL_SPEED_PX_PER_SEC = 26;
const HOLD_SPEED_MULTIPLIER = 3;
const FADE_ZONE_HEIGHT = 46;
const SKIP_BUTTON_FADE_IN_MS = 900;
const END_HOLD_MS = 500; // pause once the text fully clears the top fade, before handing off to HomeScene

const STORY_LINES = [
  'Long ago, the Empire of Axies flourished in peace, its lineages thriving from coast to coast.',
  'Then, without warning, the Chimeras came — twisted, hungry things from far beyond the borders.',
  'Village after village fell silent. The Empire’s armies were never built for a war like this one.',
  'But deep in the old bloodlines, a strength remained: small, round, and utterly relentless.',
  'One by one, the Basic-tier Axies rose to answer the call.',
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
    // The one and only gate: every later launch skips this whole scene
    // silently and instantly, straight into the game's real entry point.
    if (hasSeenOpening()) {
      this.scene.start('HomeScene');
      return;
    }

    const { width, height } = this.scale;

    addBackground(this, 'temple');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);

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
      .text(width - 20, 20, 'Skip »', {
        fontFamily: FONT, fontSize: '14px', color: '#ffffff',
        stroke: '#1d1a16', strokeThickness: 3,
      })
      .setOrigin(1, 0)
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
    markOpeningSeen();
    this.scene.start('HomeScene');
  }
}
