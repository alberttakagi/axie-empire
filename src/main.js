import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, RENDER_SCALE } from './RenderConfig.js';
import TitleScene from './TitleScene.js';
import OpeningScene from './OpeningScene.js';
import HomeScene from './HomeScene.js';
import SagaSelectScene from './SagaSelectScene.js';
import StageSelectScene from './StageSelectScene.js';
import GameScene from './GameScene.js';
import UpgradeScene from './UpgradeScene.js';
import TreasureScene from './TreasureScene.js';
import LoadoutScene from './LoadoutScene.js';
import BaseUpgradeScene from './BaseUpgradeScene.js';
import GachaScene from './GachaScene.js';
import CatalogScene from './CatalogScene.js';
import MissionsScene from './MissionsScene.js';
import { applyDevUnlock } from './DevMode.js';

// Visit this game's URL with `?devunlock` once (either locally or on the
// live site) to seed a fully-unlocked save — every stage, every unit
// maxed, plenty of gems/XP/materials/Energy — see DevMode.js. Runs once,
// then strips the param via replaceState so an ordinary reload/bookmark of
// the resulting plain URL doesn't keep re-stomping later real progress.
if (new URLSearchParams(window.location.search).has('devunlock')) {
  try {
    applyDevUnlock();
  } catch (e) {
    console.warn('devunlock failed', e);
  }
  const url = new URL(window.location.href);
  url.searchParams.delete('devunlock');
  window.history.replaceState(null, '', url);
}

// Text Game Objects rasterize themselves to their own internal canvas at a
// fixed pixel size (their `style.resolution`, default 1) and that texture
// is what actually gets drawn — so once every scene's camera is zoomed by
// RENDER_SCALE (see RenderConfig.js), text would just be a blurrier 1x
// texture stretched bigger, not real added sharpness. Patching the
// `add.text` factory itself (the one place ~every Text object in this game
// is actually created, per Phaser's own GameObjectFactory pattern) means
// every scene gets crisp HD text for free, with no per-callsite changes.
const originalTextFactory = Phaser.GameObjects.GameObjectFactory.prototype.text;
//
// Performance (Round 2, measured): every new Text ran Phaser's MeasureText,
// which draws the font to a scratch canvas and scans its pixels to find
// ascent/descent — at RENDER_SCALE that made ONE floating damage number
// cost hundreds of ms in a software-rendered browser and was the single
// biggest per-hit cost in big fights. Metrics only depend on the font, so
// they're measured once per font string and handed to every later Text
// via the style's `metrics` field (Phaser then skips the scan).
const textMetricsCache = new Map();
function fontKey(style = {}) {
  return `${style.fontStyle || ''}|${style.fontSize || '16px'}|${style.fontFamily || 'Courier'}|${style.font || ''}`;
}
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  const key = fontKey(style);
  const cached = textMetricsCache.get(key);
  const finalStyle = { resolution: RENDER_SCALE, ...style };
  if (cached && !finalStyle.metrics) finalStyle.metrics = cached;
  const obj = originalTextFactory.call(this, x, y, text, finalStyle);
  // Only cache once the web font has actually loaded, so a fallback
  // font's metrics never stick for the real one.
  if (!cached && obj.style?.metrics && (!document.fonts || document.fonts.status === 'loaded')) {
    textMetricsCache.set(key, { ...obj.style.metrics });
  }
  return obj;
};

// index.html's own CSS auto-rotates #app 90° to fake landscape on a
// touch-primary phone that's still held in portrait, so the game fills the
// real screen instead of rendering as a small letterboxed strip. Real bug,
// found live: that rotation is CSS-only, and Phaser's own pointer mapping
// (ScaleManager#transformX/Y, called from InputManager#transformPointer)
// only ever applies a plain translate+scale — no rotation awareness at
// all — so every tap landed nowhere near what was visually under the
// finger (confirmed live: tapping the on-screen "Skip" text never
// triggered it). transformX/Y each only receive ONE of pageX/pageY, too
// late to recombine into a rotation-aware answer, so this replaces
// transformPointer itself (the one call site with both at once) with a
// version that manually inverts the CSS rotate(90deg) and the canvas's
// own object-fit:contain letterboxing — see index.html's own comment for
// the forward rotation math this reverses. Falls through to Phaser's
// untouched original the instant the media query stops matching (a real
// device rotation, or a desktop window), so this has zero effect outside
// the one case it exists to fix.
const FAKE_LANDSCAPE_QUERY = '(orientation: portrait) and (hover: none) and (pointer: coarse)';
function isFakeLandscapeActive() {
  return window.matchMedia(FAKE_LANDSCAPE_QUERY).matches;
}

const originalTransformPointer = Phaser.Input.InputManager.prototype.transformPointer;
Phaser.Input.InputManager.prototype.transformPointer = function (pointer, pageX, pageY, wasMove) {
  if (!isFakeLandscapeActive()) {
    return originalTransformPointer.call(this, pointer, pageX, pageY, wasMove);
  }

  const rect = this.canvas.getBoundingClientRect();
  // Undo rotate(90deg) + translateY(-100%): a page point (relX, relY)
  // relative to the rotated canvas's own top-left corner came from local
  // (pre-rotation) point (localY = relX's source, localX = relY's
  // source) — see index.html's forward derivation, this is its inverse.
  const relX = pageX - rect.left;
  const relY = pageY - rect.top;
  const localX = relY;
  const localY = rect.width - relX;

  // Undo the canvas's own object-fit:contain: localX/localY sit in the
  // canvas's LOCAL (pre-rotation) CSS pixel box — rect.height wide by
  // rect.width tall, the same axis swap the rotation causes — which is
  // bigger than the actual letterboxed game content drawn inside it.
  const localWidth = rect.height;
  const localHeight = rect.width;
  const gameWidth = this.canvas.width;
  const gameHeight = this.canvas.height;
  const scale = Math.min(localWidth / gameWidth, localHeight / gameHeight);
  const offsetX = (localWidth - gameWidth * scale) / 2;
  const offsetY = (localHeight - gameHeight * scale) / 2;
  const x = (localX - offsetX) / scale;
  const y = (localY - offsetY) / scale;

  const p0 = pointer.position;
  const p1 = pointer.prevPosition;
  p1.x = p0.x;
  p1.y = p0.y;

  const a = pointer.smoothFactor;
  if (!wasMove || a === 0) {
    p0.x = x;
    p0.y = y;
  } else {
    p0.x = x * a + p1.x * (1 - a);
    p0.y = y * a + p1.y * (1 - a);
  }
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#111111',
  // Without a threshold any 1px finger wobble starts a drag, which
  // swallowed Formation's tap-to-remove on touch screens.
  input: { dragDistanceThreshold: 8 },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // OpeningScene is first in this list, so it's the scene Phaser boots
  // into — per the user's own call, the lore scroll plays before the
  // title screen, not after it (a deliberate departure from the guide's
  // own Title -> Opening -> Menu order). OpeningScene always hands off to
  // TitleScene, whose "Game Start" then hands off to HomeScene.
  scene: [
    OpeningScene,
    TitleScene,
    HomeScene,
    SagaSelectScene,
    StageSelectScene,
    GameScene,
    UpgradeScene,
    TreasureScene,
    LoadoutScene,
    BaseUpgradeScene,
    GachaScene,
    CatalogScene,
    MissionsScene,
  ],
});

// Dev-server only: handle for browser-driven debugging/verification.
if (import.meta.env.DEV) window.__game = game;
