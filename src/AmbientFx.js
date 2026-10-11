import Phaser from 'phaser';
import { LOGICAL_SIZE } from './RenderConfig.js';

// Ambient battlefield atmosphere — drifting leaves, dust, bubbles, embers or
// fireflies matched to the stage's backdrop (see Backdrop.js's
// getStageBattleBackgroundId). Pure decoration: low counts, behind units,
// never touches gameplay. Textures are generated once at runtime so this
// needs no new art files.

const STYLES = {
  leaves: { tex: 'fx_leaf', tint: [0x8bc34a, 0xc5e17a, 0x5f9e3a], count: 14, speedX: [-40, -15], speedY: [15, 40], scale: [0.6, 1.1], alpha: [0.5, 0.9], rotate: true },
  autumn: { tex: 'fx_leaf', tint: [0xe8833a, 0xd9542b, 0xf2c14e], count: 16, speedX: [-45, -15], speedY: [15, 40], scale: [0.6, 1.1], alpha: [0.6, 0.95], rotate: true },
  dust: { tex: 'fx_dot', tint: [0xf3e2b8, 0xe0c890], count: 22, speedX: [-30, -8], speedY: [-6, 6], scale: [0.3, 0.8], alpha: [0.15, 0.45] },
  bubbles: { tex: 'fx_ring', tint: [0xbfefff, 0xffffff], count: 16, speedX: [-6, 6], speedY: [-35, -15], scale: [0.4, 1], alpha: [0.3, 0.7], fromBottom: true },
  embers: { tex: 'fx_dot', tint: [0xffb347, 0xff6a2b, 0xffe08a], count: 20, speedX: [-10, 10], speedY: [-40, -15], scale: [0.25, 0.6], alpha: [0.5, 1], fromBottom: true, additive: true },
  fireflies: { tex: 'fx_glow', tint: [0xfff59d, 0xc6ff8a], count: 12, speedX: [-10, 10], speedY: [-10, 10], scale: [0.4, 0.8], alpha: [0.2, 0.9], additive: true, blink: true },
};

const BACKGROUND_STYLE = {
  plant: 'leaves',
  beast: 'dust',
  aquatic: 'bubbles',
  dusk: 'fireflies',
  autumn24: 'autumn',
  autumn25: 'autumn',
  summerGauntlet24: 'dust',
  gauntletArena: 'embers',
  metamorph: 'fireflies',
  metamorph2: 'leaves',
  mech: 'embers',
  temple: 'dust',
};

function ensureTextures(scene) {
  if (!scene.textures.exists('fx_dot')) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
    g.generateTexture('fx_dot', 8, 8);
    g.clear().fillStyle(0xffffff, 1).fillEllipse(6, 4, 12, 7).lineStyle(1, 0xffffff, 0.6).lineBetween(1, 4, 11, 4);
    g.generateTexture('fx_leaf', 12, 8);
    g.clear().lineStyle(1.5, 0xffffff, 1).strokeCircle(6, 6, 5).fillStyle(0xffffff, 0.8).fillCircle(4, 4, 1.2);
    g.generateTexture('fx_ring', 12, 12);
    g.clear();
    for (let r = 8; r > 0; r -= 2) g.fillStyle(0xffffff, 0.18 + (8 - r) * 0.1).fillCircle(8, 8, r);
    g.generateTexture('fx_glow', 16, 16);
    g.destroy();
  }
}

// Returns the emitter (a world object — caller handles camera ignore lists).
export function addAmbientFx(scene, backgroundId) {
  const style = STYLES[BACKGROUND_STYLE[backgroundId] || 'leaves'];
  ensureTextures(scene);
  const { width, height } = LOGICAL_SIZE;
  const lifespan = 9000;
  const emitter = scene.add.particles(0, 0, style.tex, {
    x: { min: 0, max: width + 60 },
    y: style.fromBottom ? { min: height * 0.55, max: height } : { min: -10, max: height * 0.7 },
    speedX: { min: style.speedX[0], max: style.speedX[1] },
    speedY: { min: style.speedY[0], max: style.speedY[1] },
    scale: { min: style.scale[0], max: style.scale[1] },
    alpha: style.blink ? { start: style.alpha[1], end: 0, ease: 'Sine.inOut' } : { min: style.alpha[0], max: style.alpha[1] },
    rotate: style.rotate ? { min: 0, max: 360 } : 0,
    tint: style.tint,
    lifespan,
    frequency: lifespan / style.count,
    quantity: 1,
    blendMode: style.additive ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
  });
  // Pre-warm so the field is already populated when the battle opens.
  emitter.fastForward(lifespan);
  return emitter;
}
