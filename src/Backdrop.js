import { LOGICAL_SIZE } from './RenderConfig.js';
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
  const { width, height } = LOGICAL_SIZE;
  const key = SAGA_BACKGROUND_KEYS[saga] || SAGA_BACKGROUND_KEYS[DEFAULT_BACKGROUND_SAGA];
  return scene.add.image(width / 2, height / 2, key).setDisplaySize(width, height);
}

// General-purpose backdrops (public/backgrounds/<file>.png) — a separate,
// per-scene-purpose set from the saga-level art above, picked individually
// per menu screen (see HomeScene/UpgradeScene/LoadoutScene/CatalogScene/
// GachaScene) and per battle-stage range (see getStageBattleBackgroundId)
// rather than one-per-saga. Sourced from the Origins Asset Kit's PvE/
// Backgrounds/class and /events sets (single flat images) except `temple`,
// composited from PvE/Backgrounds/story/8-temple/'s 3 layers the same way
// the saga backgrounds above were.
export const BACKGROUND_KEYS = {
  plant: 'bg_plant',
  beast: 'bg_beast',
  aquatic: 'bg_aquatic',
  dusk: 'bg_dusk',
  autumn24: 'bg_autumn24',
  autumn25: 'bg_autumn25',
  summerGauntlet24: 'bg_summer24_gauntlet',
  gauntletArena: 'bg_gauntlet_arena',
  metamorph: 'bg_metamorph',
  metamorph2: 'bg_metamorph2',
  mech: 'bg_mech',
  temple: 'bg_temple',
};

// Loads every background above into `scene`'s texture cache. Guarded by
// textures.exists like preloadSagaBackgrounds, so calling this from more
// than one scene's preload() never re-fetches an already-cached texture.
export function preloadBackgrounds(scene) {
  for (const key of Object.values(BACKGROUND_KEYS)) {
    if (!scene.textures.exists(key)) scene.load.image(key, `/backgrounds/${key}.png`);
  }
}

// Adds a full-canvas backdrop image for `backgroundId` (a BACKGROUND_KEYS
// key) — stretched to cover the canvas, same convention as
// addSagaBackground. Call this before adding anything else in the scene so
// it sits behind everything.
export function addBackground(scene, backgroundId) {
  const { width, height } = LOGICAL_SIZE;
  const key = BACKGROUND_KEYS[backgroundId] || BACKGROUND_KEYS.plant;
  return scene.add.image(width / 2, height / 2, key).setDisplaySize(width, height);
}

// Battle backdrop per stage, at a finer grain than one-per-saga: each saga
// is itself split into stage sub-ranges, each with its own background (a
// deliberate choice, not derived from anything in STAGE_CONFIG.js itself).
// Falls back to the first range's background for a saga-less/unrecognized
// stage id (e.g. Sparring Grounds' synthetic dojo pseudo-stage, which has
// no stage number at all).
const STAGE_BATTLE_BACKGROUND_RANGES = [
  { min: 1, max: 5, id: 'plant' }, // saga1 stage1-5
  { min: 6, max: 10, id: 'beast' }, // saga1 stage6-10
  { min: 11, max: 15, id: 'aquatic' }, // saga2 stage11-15 (local 1-5)
  { min: 16, max: 20, id: 'dusk' }, // saga2 stage16-20 (local 6-10)
  { min: 21, max: 23, id: 'autumn24' }, // saga3 stage21-23 (local 1-3)
  { min: 24, max: 26, id: 'autumn25' }, // saga3 stage24-26 (local 4-6)
  { min: 27, max: 30, id: 'summerGauntlet24' }, // saga3 stage27-30 (local 7-10)
];

export function getStageBattleBackgroundId(stageId) {
  const num = parseInt(String(stageId).replace('stage', ''), 10);
  const range = STAGE_BATTLE_BACKGROUND_RANGES.find((r) => num >= r.min && num <= r.max);
  return range ? range.id : STAGE_BATTLE_BACKGROUND_RANGES[0].id;
}
