import Phaser from 'phaser';
import HomeScene from './HomeScene.js';
import StageSelectScene from './StageSelectScene.js';
import GameScene from './GameScene.js';
import UpgradeScene from './UpgradeScene.js';
import TreasureScene from './TreasureScene.js';
import LoadoutScene from './LoadoutScene.js';

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
  // HomeScene is first in this list, so it's the scene Phaser boots into.
  scene: [HomeScene, StageSelectScene, GameScene, UpgradeScene, TreasureScene, LoadoutScene],
});
