import Phaser from 'phaser';
import { loadPlayerProgress } from './PlayerProgress.js';
import {
  GACHA_SINGLE_ROLL_COST,
  GACHA_MULTI_ROLL_COUNT,
  GACHA_MULTI_ROLL_COST,
  XP_REWARD_MIN,
  XP_REWARD_MAX,
  rollSingle,
  rollMulti,
} from './Gacha.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, createResourceBadge, drawBcPanel } from './UITheme.js';
import { playGachaChargeSfx, playGachaRevealSfx } from './Audio.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';

// The bible's §A.10.7 Gacha screen — adapted per Gacha.js's scope note
// (reward-tier pulls instead of unit rolls, since this build's roster has
// no unowned units to grant). Same UI beats as the reference: a roll-cost
// button for both a single pull and a bulk multi-pull, and a reveal list
// after rolling.
//
// User feedback pass: the old version applied every reward and printed
// the whole result list instantly, in one flat text block, with no sound.
// Rewritten around a proper reveal SEQUENCE instead — a charge-up beat,
// then each reward pops in one at a time (a multi-roll reveals its 11
// slots in sequence, not all at once) with a rarity-scaled sound/flourish/
// sparkle burst, real icons for Evo Shard/Growth Charm, and XP rendered as
// text whose own color/glow scales continuously with the amount rather
// than a flat style regardless of size.

const RARITY_COLOR = {
  common: 0xcfc6ae,
  rare: 0x4aa3ff,
  epic: 0xb98cff,
  legendary: 0xffd700,
};

// Empty for common on purpose — a flourish word on every single pull would
// just be noise; it's meant to mark the ones worth noticing.
const RARITY_FLOURISH = {
  common: '',
  rare: 'Nice Pull!',
  epic: 'Great Pull!',
  legendary: 'JACKPOT!!!',
};

const CHARGE_MS = 1500; // suspense beat before the first reveal — "a few seconds", not instant
const REVEAL_STAGGER_MS = 380; // gap between each successive slot in a multi-roll

const GRID_COLS = 4;
const GRID_CELL_W = 145;
const GRID_CELL_H = 68;
const GRID_GAP = 10;
const GRID_TOP = 200;
// Was 240 — tall enough that both the results panel below and an 11x
// roll's own bottom row reached past the back button (bottom-left, see
// createBackButton's own default y). Shrunk together with the panel's own
// height (see create()'s drawBcPanel call) so nothing ever overlaps it.
const GRID_AREA_H = 165;

function colorIntToHex(int) {
  return `#${int.toString(16).padStart(6, '0')}`;
}

// t=0 -> a dull, unremarkable beige; t=1 -> a bright shiny gold — same
// continuous scale a low-vs-high XP amount is mapped onto below.
function xpShineColor(amount) {
  const t = Phaser.Math.Clamp((amount - XP_REWARD_MIN) / (XP_REWARD_MAX - XP_REWARD_MIN), 0, 1);
  const dull = Phaser.Display.Color.IntegerToColor(0x9a8c74);
  const shiny = Phaser.Display.Color.IntegerToColor(0xffd700);
  const mixed = Phaser.Display.Color.Interpolate.ColorWithColor(dull, shiny, 100, Math.round(t * 100));
  return { hex: colorIntToHex(Phaser.Display.Color.GetColor(mixed.r, mixed.g, mixed.b)), t };
}

// Single slot (a lone roll) vs a 4-col grid (an 11x roll) — same reveal
// logic either way, just laid out differently since one card can afford to
// be much bigger than 11 of them squeezed onto one screen.
function getSlotLayout(width, count) {
  if (count === 1) {
    return [{ x: width / 2, y: GRID_TOP + GRID_AREA_H / 2, w: 220, h: 150 }];
  }
  const rows = Math.ceil(count / GRID_COLS);
  const totalW = GRID_COLS * GRID_CELL_W + (GRID_COLS - 1) * GRID_GAP;
  const totalH = rows * GRID_CELL_H + (rows - 1) * GRID_GAP;
  const startX = width / 2 - totalW / 2 + GRID_CELL_W / 2;
  const startY = GRID_TOP + Math.max(0, (GRID_AREA_H - totalH) / 2) + GRID_CELL_H / 2;
  const layout = [];
  for (let i = 0; i < count; i += 1) {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS);
    layout.push({
      x: startX + col * (GRID_CELL_W + GRID_GAP),
      y: startY + row * (GRID_CELL_H + GRID_GAP),
      w: GRID_CELL_W,
      h: GRID_CELL_H,
    });
  }
  return layout;
}

export default class GachaScene extends Phaser.Scene {
  constructor() {
    super('GachaScene');
  }

  preload() {
    preloadBackgrounds(this);
    this.load.image('gacha_evo_shard', 'gacha/evo_shard.png');
    this.load.image('gacha_growth_charm', 'gacha/growth_charm.png');
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

    addBackground(this, 'metamorph');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);

    createTitlePill(this, 24, 26, 'Gacha');
    createBackButton(this, () => this.scene.start('HomeScene'));

    // Banner panel — a real gacha screen's whole top half is a giant
    // rotating art banner; without banner art this build shows a plain
    // cream panel as its stand-in, which at least reads as "a screen
    // region," not empty space.
    drawBcPanel(this, width / 2, 96, width - 64, 100, { fill: 0x2a1f3d });
    this.add
      .text(width / 2, 96, 'Axie Gacha', { fontFamily: FONT, fontSize: '20px', color: '#ffd27f' })
      .setOrigin(0.5);

    this.singleButton = this.createRollButton(width / 2 - 130, `Single Roll\n${GACHA_SINGLE_ROLL_COST} Gems`, () =>
      this.performRoll(rollSingle, 1),
    );
    this.multiButton = this.createRollButton(
      width / 2 + 130,
      `${GACHA_MULTI_ROLL_COUNT}x Roll\n${GACHA_MULTI_ROLL_COST} Gems`,
      () => this.performRoll(rollMulti, GACHA_MULTI_ROLL_COUNT),
      { fill: BC.gold, textColor: BC.goldInk },
    );

    // Was 250 tall centered at 310 (bottom edge 435) — reached well past
    // the back button (bottom-left, y≈390-442 by default). 190 tall
    // centered at 280 keeps a clear gap above it.
    drawBcPanel(this, width / 2, 280, width - 64, 190);
    this.messageText = this.add
      .text(width / 2, 190, 'Tap a roll button to begin!', {
        fontFamily: FONT, fontSize: '13px', color: BC.inkHex, align: 'center',
      })
      .setOrigin(0.5);
    this.resultsContainer = this.add.container(0, 0);
    this.fxContainer = this.add.container(0, 0).setDepth(2000);

    this.refreshGems();
  }

  createRollButton(x, label, onRoll, opts = {}) {
    const y = 165;
    return createBcButton(this, x, y, 220, 60, label, onRoll, {
      fill: 0xb98cff, highlight: 0xd9c3ff, textColor: '#2a1a3a', fontSize: 14, ...opts,
    });
  }

  setRollButtonsEnabled(enabled) {
    [this.singleButton, this.multiButton].forEach((button) => {
      button.setAlpha(enabled ? 1 : 0.5);
      if (enabled) button.bcHit.setInteractive({ useHandCursor: true });
      else button.bcHit.disableInteractive();
    });
  }

  performRoll(rollFn, count) {
    const result = rollFn();
    this.refreshGems();
    if (!result.ok) {
      this.messageText.setText('Not enough Gems!');
      return;
    }
    this.startRevealSequence(result.rewards);
  }

  startRevealSequence(rewards) {
    const { width } = LOGICAL_SIZE;

    this.resultsContainer.removeAll(true);
    this.fxContainer.removeAll(true);
    this.setRollButtonsEnabled(false);
    this.messageText.setText('');

    const layout = getSlotLayout(width, rewards.length);
    const placeholders = layout.map(({ x, y, w, h }) => {
      const holder = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, w, h, 0x1a1a1a, 0.55).setStrokeStyle(2, BC.ink);
      const mark = this.add.text(0, 0, '?', { fontFamily: FONT, fontSize: `${Math.round(Math.min(w, h) * 0.4)}px`, color: '#6a6a6a' }).setOrigin(0.5);
      holder.add([bg, mark]);
      this.resultsContainer.add(holder);
      return holder;
    });

    // Charge-up beat: a pulsing glow at the panel's center, so a roll reads
    // as "something is about to happen" instead of the result just
    // appearing — see this file's own header note.
    const chargeGlow = this.add.circle(width / 2, GRID_TOP + GRID_AREA_H / 2, 30, BC.gold, 0.25).setDepth(1999);
    this.fxContainer.add(chargeGlow);
    this.tweens.add({
      targets: chargeGlow, scale: 1.6, alpha: 0.05, duration: 500, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
    });
    playGachaChargeSfx();

    this.time.delayedCall(CHARGE_MS, () => {
      chargeGlow.destroy();
      this.revealNext(rewards, layout, placeholders, 0);
    });
  }

  revealNext(rewards, layout, placeholders, index) {
    if (index >= rewards.length) {
      this.setRollButtonsEnabled(true);
      return;
    }

    placeholders[index].destroy();
    this.revealSlot(layout[index], rewards[index]);

    this.time.delayedCall(REVEAL_STAGGER_MS, () => this.revealNext(rewards, layout, placeholders, index + 1));
  }

  revealSlot(slot, reward) {
    const { x, y, w, h } = slot;
    const color = RARITY_COLOR[reward.rarity] || RARITY_COLOR.common;

    const card = this.add.container(x, y).setScale(0);
    const bg = this.add.rectangle(0, 0, w, h, BC.panel).setStrokeStyle(3, color);
    card.add(bg);
    card.add(this.renderRewardContent(reward, w, h));
    this.resultsContainer.add(card);

    this.tweens.add({ targets: card, scale: 1, duration: 320, ease: 'Back.easeOut' });

    playGachaRevealSfx(reward.rarity);
    this.sparkleBurst(x, y, color, reward.rarity === 'legendary' ? 14 : reward.rarity === 'epic' ? 9 : 6);

    const flourish = RARITY_FLOURISH[reward.rarity];
    if (flourish) {
      const flourishText = this.add
        .text(x, y - h / 2 - 4, flourish, {
          fontFamily: FONT, fontSize: reward.rarity === 'legendary' ? '18px' : '13px', color: colorIntToHex(color),
          stroke: '#000000', strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(2001);
      this.fxContainer.add(flourishText);
      this.tweens.add({
        targets: flourishText, y: y - h / 2 - 26, alpha: 0, duration: 750, ease: 'Cubic.easeOut',
        onComplete: () => flourishText.destroy(),
      });
    }

    if (reward.rarity === 'legendary') {
      this.cameras.main.shake(220, 0.006);
      const flash = this.add.rectangle(LOGICAL_SIZE.width / 2, LOGICAL_SIZE.height / 2, LOGICAL_SIZE.width, LOGICAL_SIZE.height, 0xffffff, 0.5).setDepth(1998);
      this.fxContainer.add(flash);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
    }
  }

  // Content is laid out in LOCAL coordinates (added into the slot's own
  // container), scaled off `w`/`h` — the exact same renderer serves both
  // the one big single-roll card and each small 11x-roll grid cell.
  renderRewardContent(reward, w, h) {
    const iconSize = Phaser.Math.Clamp(Math.min(w, h) * 0.5, 18, 64);
    const objects = [];

    if (reward.type === 'jackpot') {
      objects.push(
        this.add
          .text(0, -h / 2 + Math.min(18, h * 0.22), 'JACKPOT!', {
            fontFamily: FONT, fontSize: `${Math.round(Math.min(w, h) * 0.24)}px`, color: '#ffd700',
          })
          .setOrigin(0.5),
      );
      const subIconSize = Phaser.Math.Clamp(Math.min(w, h) * 0.32, 14, 34);
      const rowY = h / 2 - subIconSize / 2 - Math.min(10, h * 0.12);
      const xp = reward.bundle.find((b) => b.type === 'xp');
      const { hex } = xpShineColor(xp.amount);
      const gap = subIconSize + Math.max(6, w * 0.05);
      objects.push(
        this.add.text(-gap, rowY, `+${xp.amount}`, { fontFamily: FONT, fontSize: `${Math.round(subIconSize * 0.42)}px`, color: hex }).setOrigin(0.5),
        this.add.image(0, rowY, 'gacha_evo_shard').setDisplaySize(subIconSize, subIconSize),
        this.add.image(gap, rowY, 'gacha_growth_charm').setDisplaySize(subIconSize, subIconSize),
      );
      return objects;
    }

    if (reward.type === 'evoShard' || reward.type === 'growthCharm') {
      const textureKey = reward.type === 'evoShard' ? 'gacha_evo_shard' : 'gacha_growth_charm';
      const iconY = h > 100 ? -h * 0.12 : -h * 0.18;
      objects.push(this.add.image(0, iconY, textureKey).setDisplaySize(iconSize, iconSize));
      objects.push(
        this.add
          .text(0, iconY + iconSize / 2 + Math.min(16, h * 0.14), `+${reward.amount}`, {
            fontFamily: FONT, fontSize: `${Math.round(Math.min(w, h) * 0.2)}px`, color: BC.inkHex,
          })
          .setOrigin(0.5),
      );
      return objects;
    }

    // Plain XP — "just text but fancier," shinier the higher the amount,
    // dull for a low roll (see xpShineColor) — a gentle pulse is added on
    // top only once it's shiny enough to be worth drawing the eye to.
    const { hex, t } = xpShineColor(reward.amount);
    const xpText = this.add
      .text(0, 0, `+${reward.amount.toLocaleString()}\nXP`, {
        fontFamily: FONT, fontSize: `${Math.round(Math.min(w, h) * 0.26)}px`, color: hex, align: 'center',
      })
      .setOrigin(0.5);
    objects.push(xpText);
    if (t > 0.5) {
      this.tweens.add({ targets: xpText, scale: 1.08, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    return objects;
  }

  sparkleBurst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 26 + Math.random() * 22;
      const dot = this.add.circle(x, y, 3, color).setDepth(2000);
      this.fxContainer.add(dot);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 450 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  // Recreated rather than updated in place — createResourceBadge sizes its
  // pill/tag background graphics once, off the INITIAL value's text width;
  // a wider number after a roll would otherwise overflow past that
  // now-too-small background instead of the pill growing with it.
  refreshGems() {
    const progress = loadPlayerProgress();
    if (this.gemsBadge) this.gemsBadge.destroy();
    this.gemsBadge = createResourceBadge(this, LOGICAL_SIZE.width - 24, 26, 'GEM', progress.gems, { valueColor: '#ffd27f' });
  }
}
