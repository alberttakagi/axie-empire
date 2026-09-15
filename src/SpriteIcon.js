// Shared sprite-portrait helpers — factored out of GameScene so any UI
// scene (roster/loadout cards, spawn buttons, a future unit-detail screen,
// etc.) can show the same real idle-pose art GameScene battles use (see
// UNIT_CONFIG.js/ENEMY_CONFIG.js's `sprite` field) without duplicating the
// texture-key convention or re-loading logic.
//
// Texture keys are prefixed 'unit_'/'enemy_' rather than a bare
// `config.id` because UNIT_CONFIG and ENEMY_CONFIG share several literal
// id values (both have 'tank', 'basic', 'ranged', etc.) — GameScene's own
// preload/createEntityVisual/setEntityPose use this exact same convention,
// so textures loaded by one scene are immediately reusable by another
// (Phaser's texture cache is shared across all scenes in the Game).

// Loads every entry's idle/attack/hit textures into `scene`'s texture
// cache. Guarded by textures.exists so calling this from more than one
// scene's preload() (e.g. both GameScene and LoadoutScene) never re-fetches
// an already-cached texture.
export function preloadSpriteRoster(scene, roster, isPlayerSide = true) {
  const prefix = isPlayerSide ? 'unit' : 'enemy';
  for (const config of Object.values(roster)) {
    if (!config.sprite) continue;
    for (const pose of ['idle', 'attack', 'hit']) {
      const key = `${prefix}_${config.id}_${pose}`;
      if (!scene.textures.exists(key)) scene.load.image(key, config.sprite[pose]);
    }
  }
}

// A small UI portrait (spawn buttons, roster/loadout cards, etc.) — always
// shows the idle pose, scaled to a caller-chosen fixed pixel diameter
// (unlike GameScene's own in-battle fitSpriteToRadius, which sizes off a
// unit's gameplay radius — a UI icon has no such stat to key off).
// isPlayerSide also controls facing, matching createEntityVisual: art is
// rendered facing screen-left, correct for an enemy portrait, flipped for
// a player unit's. Returns null (nothing added) if this config has no
// sprite, so callers can lay out a text-only fallback instead.
export function addUnitIcon(scene, x, y, config, targetDiameter, isPlayerSide = true) {
  if (!config.sprite) return null;
  const prefix = isPlayerSide ? 'unit' : 'enemy';
  const icon = scene.add.image(x, y, `${prefix}_${config.id}_idle`);
  icon.setFlipX(isPlayerSide);
  icon.setScale(targetDiameter / Math.max(icon.width, icon.height));
  return icon;
}
