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

// This game's own opening narration — the earlier draft told an original
// "Empire of Axies vs. the Chimeras" story from scratch; this pass folds in
// a few real names/beats from Axie Infinity's actual lore (Atia the sun
// god, the world Lunacia, the moon shards atop the totems every base
// screen already shows) without retelling that myth straight — the user
// specifically wants the ORIGINAL narrative's lighter, funnier, Battle-
// Cats-style tone (self-aware, deadpan about the absurdity of it all) over
// a faithful dramatic retelling of the real thing.
const STORY_LINES = [
  'Gather round, little ones. This is the story of how it all began. Or at least, our best guess.',
  'Long before the Empire, before the Chimeras, there was Atia — a sun god who spent a thousand years wandering the cosmos, looking for a planet worth the trip.',
  'He found one: Lunacia. Green, glowing, and blissfully free of paperwork.',
  'Life took root. Everyone was happy. This lasted almost an entire chapter.',
  'Then the Chimeras showed up, because peace is apparently against the rules out here.',
  'They corrupted Atia himself — so, being a sun god about it, he collapsed and poured every last spark of himself into keeping the light alive.',
  'From his ashes rose the Axies: small, round, and far more stubborn than the Chimeras had budgeted for. They’d go on to found the Empire of Axies. Yes, named after themselves. No, nobody stopped them.',
  'Outnumbered a thousand to one, the Axies did the only sensible thing. They kept fighting anyway.',
  'Desperate, the Chimera lord Argonia blew up the moon. As one does.',
  'The Axies survived the blast, if a little worse for wear — so they bolted the moon’s leftover shards onto some old totems and called it a power grid.',
  'Which is, more or less, why your totem glows like that.',
  'Anyway. That’s the backstory. Time to go fight some Chimeras.',
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
