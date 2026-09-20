import Phaser from 'phaser';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { FONT } from './UITheme.js';

// Opening lore screen (guide Chapter 04's 起動・タイトル・オープニング,
// adapted per the user's own call: play it on every launch, not just the
// first — a deliberate departure from the real game's one-time intro).
// HomeScene stays the game's normal destination; this is the scene that
// boots first and always hands off to it, either after the full scroll or
// the instant the player taps Skip (see main.js's scene order).
//
// The reference spec (guide): ~27px/sec scroll (a full real chapter intro
// runs ~40 real seconds), a tap-hold 3x speed-up, top/bottom fade zones,
// and a Skip button that works immediately with no confirmation — kept
// here, running the real Tales of Lunacia text below instead of a made-up
// chapter intro, since this project has exactly one origin story to tell,
// not one per chapter.
const SCROLL_SPEED_PX_PER_SEC = 26;
const HOLD_SPEED_MULTIPLIER = 3;
const FADE_ZONE_HEIGHT = 46;
const SKIP_BUTTON_FADE_IN_MS = 900;
const END_HOLD_MS = 500; // pause once the text fully clears the top fade, before handing off to HomeScene

// The Tales of Lunacia — Axie Infinity's own real origin myth, reproduced
// here near-verbatim at the user's own request (this is their fan project,
// already built entirely on Axie's official art/characters/terminology —
// the game's every totem, tower, and Chimera enemy already comes straight
// from this same lore).
const STORY_LINES = [
  'Gather together, children of light. We have a story to share, the first of many.',
  'It all began with a glimmer in the dark unknown. For a millennium, a young sun god explored the cosmos. He grew strong and gained great knowledge on a divine quest for a matching planet to fulfill his existence.',
  'He was our sun god, Aethel.',
  'Finally, he discovered our beautiful Lunacia. Here life began and blossomed in his loving embrace.',
  'But the cosmos is full of riddles, and wherever life reigns, corruption follows. The chimeras descended and infected noble Aethel with the realm.',
  'Yet the sun’s heart remained full of hope. He collapsed, offering that pulse to keep light alive.',
  'And from the ashes of the all-loving god, the supreme Axies were born and began to fight. They were outnumbered by the wicked legions. Yet pushed forward and were winning the war. Aethel’s legacy was powering them to victory.',
  'But desperate Argonia, lord of chimeras, attempted a final deadly ruse.',
  'He sacrificed himself to destroy the moon, allowing the chimeras to continue their assault.',
  'The moon was broken and many foes remained. The Axies survived, but their power faded. Falling back, they placed moon shards atop ancient totems to power new settlements for their resistance.',
  'These are just the first pages of the stories we will tell together.',
  'The tales of Lunacia.',
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
    const { width, height } = this.scale;

    addBackground(this, 'dusk'); // a glowing moonlit forest — fits Lunacia's own moon-and-light imagery better than the temple ruins
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
    this.scene.start('HomeScene');
  }
}
