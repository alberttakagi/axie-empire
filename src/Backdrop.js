// Shared saga-backdrop helpers — factored out of GameScene so any other
// scene (Home, Stage Select, etc.) can show the same scenic art without
// duplicating the texture-key convention or re-loading logic. See
// tools/sprite-gen's one-off compositing script for how these 3 PNGs
// (public/backgrounds/bg_saga1/2/3.png) were built from the Origins Asset
// Kit's PvE/Backgrounds/story layer sets.

export const SAGA_BACKGROUND_KEYS = { saga1: 'bg_saga1', saga2: 'bg_saga2', saga3: 'bg_saga3' };
export const DEFAULT_BACKGROUND_SAGA = 'saga1';

// Loads all 3 saga backgrounds into `scene`'s texture cache. Guarded by
// textures.exists so calling this from more than one scene's preload()
// never re-fetches an already-cached texture.
export function preloadSagaBackgrounds(scene) {
  for (const key of Object.values(SAGA_BACKGROUND_KEYS)) {
    if (!scene.textures.exists(key)) scene.load.image(key, `/backgrounds/${key}.png`);
  }
}

// Adds a full-canvas backdrop image for `saga` (falling back to
// DEFAULT_BACKGROUND_SAGA for a saga-less/unrecognized value, e.g. Sparring
// Grounds' synthetic dojo pseudo-stage) — stretched to cover the canvas
// rather than cropped, since these are painterly scenes without straight
// lines that would make a slight stretch obvious. Call this before adding
// anything else in the scene so it sits behind everything.
export function addSagaBackground(scene, saga) {
  const { width, height } = scene.scale;
  const key = SAGA_BACKGROUND_KEYS[saga] || SAGA_BACKGROUND_KEYS[DEFAULT_BACKGROUND_SAGA];
  return scene.add.image(width / 2, height / 2, key).setDisplaySize(width, height);
}
