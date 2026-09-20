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
  // TitleScene is first in this list, so it's the scene Phaser boots
  // into (guide Chapter 04's boot sequence: Title -> Opening -> Menu —
  // this project's own Splash/Loading steps have nothing to wait on, so
  // they're skipped). "Game Start" hands off to OpeningScene, which in
  // turn always hands off to HomeScene (see OpeningScene.js's own header).
  scene: [
    TitleScene,
    OpeningScene,
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
