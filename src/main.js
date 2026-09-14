import Phaser from 'phaser';
import StageSelectScene from './StageSelectScene.js';
import GameScene from './GameScene.js';

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
  scene: [StageSelectScene, GameScene],
});
