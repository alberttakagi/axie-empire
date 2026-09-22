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

// Text Game Objects rasterize themselves to their own internal canvas at a
// fixed pixel size (their `style.resolution`, default 1) and that texture
// is what actually gets drawn — so once every scene's camera is zoomed by
// RENDER_SCALE (see RenderConfig.js), text would just be a blurrier 1x
// texture stretched bigger, not real added sharpness. Patching the
// `add.text` factory itself (the one place ~every Text object in this game
// is actually created, per Phaser's own GameObjectFactory pattern) means
// every scene gets crisp HD text for free, with no per-callsite changes.
const originalTextFactory = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  return originalTextFactory.call(this, x, y, text, { resolution: RENDER_SCALE, ...style });
};

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#111111',
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
