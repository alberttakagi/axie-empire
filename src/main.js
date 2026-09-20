import Phaser from 'phaser';
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

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 450,
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
