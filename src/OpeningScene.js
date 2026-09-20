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
// here, running this game's own origin story below (see STORY_LINES)
// instead of a made-up per-chapter intro, since this project has exactly
// one such story to tell.
const SCROLL_SPEED_PX_PER_SEC = 26;
const HOLD_SPEED_MULTIPLIER = 3;
const FADE_ZONE_HEIGHT = 46;
const SKIP_BUTTON_FADE_IN_MS = 900;
const END_HOLD_MS = 500; // pause once the text fully clears the top fade, before handing off to HomeScene

// This game's own opening narration — told in the same earnest, mythic
// campfire-story register as Axie Infinity's real "Tales of Lunacia" (a
// comedic Battle-Cats-parody pass was tried and rejected: it read as
// dumb, not charming, and the user wants the tone Axie's real lore
// actually has, not a joke about it). The BEATS are also corrected against
// that real source rather than assumed from memory: Atia isn't shown
// losing an active fight — the real text has the Chimeras corrupt him,
// and his collapse is a deliberate sacrifice (pouring his own life into
// the world) rather than a defeat, which is the nuance line 5 below
// preserves; everything else (Lunacia, the Axies born from Atia's
// remains, the Empire of Axies, Argonia shattering the moon, moon shards
// on the totems) follows that same source.
const STORY_LINES = [
  'Gather together, children of light. We have a story to share, the first of many.',
  'Long before the Empire, before the war, there was Atia — a sun god who searched the cosmos for a thousand years, seeking a world worthy of his light.',
  'He found Lunacia. And here, at last, life began to bloom in his loving embrace.',
  'But wherever life takes root, corruption follows close behind. The Chimeras descended upon Lunacia, and even Atia’s own light could not hold them back.',
  'Overwhelmed, but never hopeless, Atia made his final choice: he let himself fall, pouring every last spark of his being into the world he loved, so its light would not go out with him.',
  'From the pieces of that fallen god, the Axies were born.',
  'Outnumbered and untested, they rose anyway, carrying Atia’s own light into battle against the Chimera legions.',
  'In time, they built an Empire from the ashes — the Empire of Axies, first line of defense against the Chimera tide.',
  'Desperate, the Chimera lord Argonia struck at the one thing left to break: he shattered the moon itself, and the invasion pressed on.',
  'The Axies endured. What remained of the moon, they gathered and set atop ancient totems, to light the way for the settlements still standing.',
  'This is only the first page. The war for Lunacia continues still.',
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
