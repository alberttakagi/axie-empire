import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { isUnitUnlocked } from './PlayerProgress.js';
import { loadSpriteRosterFramesInBackground, sequenceAtlasKey } from './SpriteIcon.js';

// Home screen life: a few of the player's unlocked Axies stroll around the
// open arena floor (right of the menu buttons), pausing to idle, turning
// around, and hopping now and then. Purely decorative, behind the UI.
const AREA = { minX: 330, maxX: 740, minY: 268, maxY: 330 };
const FRAME_MS = 1000 / 24;
const COUNT = 4;
const SIZE = 54;

function frameNames(scene, key) {
  return scene.textures.exists(key) ? scene.textures.get(key).getFrameNames().sort((a, b) => a - b) : null;
}

export function addHomeWanderers(scene) {
  const keys = Phaser.Utils.Array.Shuffle(Object.keys(UNIT_CONFIG).filter((k) => isUnitUnlocked(k) && UNIT_CONFIG[k].sprite?.run)).slice(0, COUNT);
  if (!keys.length) return;
  // Created now (right after the backdrop/frame) so it sits under every
  // menu button in draw order even though the sprites arrive later.
  const layer = scene.add.container(0, 0);
  const roster = Object.fromEntries(keys.map((k) => [k, UNIT_CONFIG[k]]));
  loadSpriteRosterFramesInBackground(scene, roster, true, () => {
    keys.forEach((key, i) => spawnWanderer(scene, layer, UNIT_CONFIG[key], i));
  });
}

function spawnWanderer(scene, layer, config, i) {
  const run = frameNames(scene, sequenceAtlasKey('unit', config.id, '', 'run'));
  const idle = frameNames(scene, sequenceAtlasKey('unit', config.id, '', 'idleAnim'));
  if (!run || !idle) return;
  const runKey = sequenceAtlasKey('unit', config.id, '', 'run');
  const idleKey = sequenceAtlasKey('unit', config.id, '', 'idleAnim');
  const y = AREA.minY + ((AREA.maxY - AREA.minY) * (i + 0.5)) / COUNT;
  const x = Phaser.Math.Between(AREA.minX, AREA.maxX);
  const sprite = scene.add.image(x, y, idleKey, idle[0]).setOrigin(0.5, 1);
  sprite.setScale(SIZE / Math.max(sprite.width, sprite.height));
  const baseScale = sprite.scale;
  layer.add(sprite); // sprites carry their own baked ground shadow

  const state = { mode: 'idle', frame: 0, dir: Math.random() < 0.5 ? -1 : 1, targetX: x, nextMs: 800 + Math.random() * 2000 };
  sprite.setFlipX(state.dir > 0);

  scene.time.addEvent({
    delay: FRAME_MS,
    loop: true,
    callback: () => {
      if (!sprite.active) return;
      const frames = state.mode === 'run' ? run : idle;
      state.frame = (state.frame + 1) % frames.length;
      sprite.setTexture(state.mode === 'run' ? runKey : idleKey, frames[state.frame]);
      sprite.setScale(baseScale);
      sprite.setFlipX(state.dir > 0);
      if (state.mode === 'run') {
        sprite.x += state.dir * 1.1;
        if ((state.dir > 0 && sprite.x >= state.targetX) || (state.dir < 0 && sprite.x <= state.targetX)) {
          state.mode = 'idle';
          state.frame = 0;
          state.nextMs = 1200 + Math.random() * 2600;
          if (Math.random() < 0.35) scene.tweens.add({ targets: sprite, y: y - 14, duration: 180, yoyo: true, ease: 'Quad.out' });
        }
      } else {
        state.nextMs -= FRAME_MS;
        if (state.nextMs <= 0) {
          state.targetX = Phaser.Math.Between(AREA.minX, AREA.maxX);
          state.dir = state.targetX > sprite.x ? 1 : -1;
          state.mode = 'run';
          state.frame = 0;
        }
      }
    },
  });
}
