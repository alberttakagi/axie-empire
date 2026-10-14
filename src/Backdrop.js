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
  // Round 2 additions (tools/import_backgrounds.py, full HD from the kit)
  bird: 'bg_bird',
  bug: 'bg_bug',
  dawn: 'bg_dawn',
  reptile: 'bg_reptile',
  reptile2: 'bg_reptile2',
  canyon: 'bg_canyon',
  halloween: 'bg_halloween',
  winter: 'bg_winter',
  xmas: 'bg_xmas',
  summer23: 'bg_summer23',
  beachRank: 'bg_beachRank',
  beachArcade: 'bg_beachArcade',
  rockyMountain: 'bg_rockyMountain',
};

// Only the composited arena/temple remain PNG; everything else is a
// 1920x1080 JPEG from tools/import_backgrounds.py (sharper AND smaller).
const PNG_BACKGROUNDS = new Set(['bg_gauntlet_arena', 'bg_temple']);
function backgroundUrl(key) {
  return `/backgrounds/${key}.${PNG_BACKGROUNDS.has(key) ? 'png' : 'jpg'}`;
}

// Backgrounds the menu screens use — loaded up front. Battle backgrounds
// load per stage (preloadBattleBackground) instead of all ~25 at launch.
const MENU_BACKGROUND_IDS = ['metamorph2', 'temple', 'metamorph', 'gauntletArena', 'mech', 'dusk', 'beast'];

export function preloadBackgrounds(scene, ids = MENU_BACKGROUND_IDS) {
  for (const id of ids) {
    const key = BACKGROUND_KEYS[id];
    if (key && !scene.textures.exists(key)) scene.load.image(key, backgroundUrl(key));
  }
}

export function preloadBattleBackground(scene, backgroundId) {
  preloadBackgrounds(scene, [BACKGROUND_KEYS[backgroundId] ? backgroundId : 'plant']);
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

// Battle backdrop per stage. Real bug, found in the round-2 audit: the old
// table only covered stage1-30 (written back when each saga had 10
// stages), so stages 31-144 — most of the campaign — all silently fell
// back to 'plant'. Each 48-stage saga is now split into six 8-stage
// "chapters" with their own scenery, and every saga finale (48/96/144)
// fights in the arena. Dojo (no stage number) falls back to the first.
const STAGES_PER_SAGA = 48;
const STAGES_PER_CHAPTER = 8;
const SAGA_CHAPTER_BACKGROUNDS = [
  ['plant', 'beast', 'autumn24', 'dusk', 'metamorph2', 'temple'], // saga1
  ['aquatic', 'summerGauntlet24', 'autumn25', 'metamorph', 'dusk', 'mech'], // saga2
  ['temple', 'mech', 'metamorph2', 'autumn24', 'beast', 'metamorph'], // saga3
];

export function getStageBattleBackgroundId(stageId) {
  const num = parseInt(String(stageId).replace('stage', ''), 10);
  if (!Number.isFinite(num) || num < 1) return SAGA_CHAPTER_BACKGROUNDS[0][0];
  const sagaIndex = Math.min(SAGA_CHAPTER_BACKGROUNDS.length - 1, Math.floor((num - 1) / STAGES_PER_SAGA));
  const local = (num - 1) % STAGES_PER_SAGA; // 0-47
  if (local === STAGES_PER_SAGA - 1) return 'gauntletArena'; // saga finale
  const chapters = SAGA_CHAPTER_BACKGROUNDS[sagaIndex];
  return chapters[Math.min(chapters.length - 1, Math.floor(local / STAGES_PER_CHAPTER))];
}
