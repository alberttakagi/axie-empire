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
// cache, plus its optional real evolved ("awakened") set if it has one
// (see UNIT_CONFIG.js's `sprite.evolved` field) — keyed
// '<prefix>_<id>_evolved_<pose>'. Guarded by textures.exists so calling
// this from more than one scene's preload() (e.g. both GameScene and
// LoadoutScene) never re-fetches an already-cached texture.
//
// `run` (the walking/moving pose — see GameScene's getDesiredPose) is a
// short array of PNG paths rather than one path like idle/attack/hit: a
// single static frame read as barely-different from idle (these are round,
// mostly-legless Axies/Chimeras — there's no dramatic leg-swing to capture),
// so GameScene instead cycles between run[0]/run[1] and layers a bounce on
// top while an entity is actually moving, to actually read as running
// rather than sliding. `run` is optional per entry rather than always-on
// like idle/attack/hit: every unit has one, but one enemy (sniper/Dryad
// Ranger) has no move animation in its source skeleton to render one from,
// so it simply has no `sprite.run` and falls back to idle while moving.
const CORE_POSES = ['idle', 'attack', 'hit'];

function runFrameKeys(prefix, id, evolvedTag, frameCount) {
  const keys = [];
  for (let i = 0; i < frameCount; i++) keys.push(`${prefix}_${id}${evolvedTag}_run_${i}`);
  return keys;
}

export function preloadSpriteRoster(scene, roster, isPlayerSide = true) {
  const prefix = isPlayerSide ? 'unit' : 'enemy';
  for (const config of Object.values(roster)) {
    if (!config.sprite) continue;
    for (const pose of CORE_POSES) {
      const key = `${prefix}_${config.id}_${pose}`;
      if (!scene.textures.exists(key)) scene.load.image(key, config.sprite[pose]);
    }
    if (config.sprite.run) {
      const keys = runFrameKeys(prefix, config.id, '', config.sprite.run.length);
      config.sprite.run.forEach((path, i) => {
        if (!scene.textures.exists(keys[i])) scene.load.image(keys[i], path);
      });
    }
    if (!config.sprite.evolved) continue;
    for (const pose of CORE_POSES) {
      const key = `${prefix}_${config.id}_evolved_${pose}`;
      if (!scene.textures.exists(key)) scene.load.image(key, config.sprite.evolved[pose]);
    }
    if (config.sprite.evolved.run) {
      const keys = runFrameKeys(prefix, config.id, '_evolved', config.sprite.evolved.run.length);
      config.sprite.evolved.run.forEach((path, i) => {
        if (!scene.textures.exists(keys[i])) scene.load.image(keys[i], path);
      });
    }
  }
}

// idleAnimated's gentle float (see addUnitIcon) — a slow, small bob rather
// than anything reading as "walking" (that's GameScene's own, much
// brisker, run-cycle hop — a totally different context/purpose), meant
// to read as "alive and at rest," the same subtle breathing motion the
// real Axie Infinity app's own Axie cards have, instead of a dead-still
// portrait. Duration is randomized a little per-icon (see addUnitIcon) so
// a whole grid of them doesn't visibly bob in lockstep.
const IDLE_BOB_AMPLITUDE = 3;
const IDLE_BOB_DURATION_MS = 900;

// A small UI portrait (spawn buttons, roster/loadout cards, etc.) — always
// shows the idle pose, scaled to a caller-chosen fixed pixel diameter
// (unlike GameScene's own in-battle fitSpriteToRadius, which sizes off a
// unit's gameplay radius — a UI icon has no such stat to key off).
// isPlayerSide also controls facing, matching createEntityVisual: art is
// rendered facing screen-left, correct for an enemy portrait, flipped for
// a player unit's. `useEvolved` shows the unit's real evolved ("awakened")
// look instead of its base one (see UNIT_CONFIG.js's `sprite.evolved`
// field/PartEvolution.js) — falls back to the base idle if this config has
// no evolved art. Returns null (nothing added) if this config has no
// sprite at all, so callers can lay out a text-only fallback instead.
//
// `idleAnimated` (default off) adds the small looping float described
// above — opt-in rather than automatic on every icon, since a battle
// spawn button or an Upgrade-screen row already has plenty going on
// (cooldown fills, level text) without also drawing the eye with motion;
// it's meant for screens that are otherwise showing a completely static
// portrait (Character Formation, the Unit/Enemy Guide).
export function addUnitIcon(scene, x, y, config, targetDiameter, isPlayerSide = true, useEvolved = false, idleAnimated = false) {
  if (!config.sprite) return null;
  const prefix = isPlayerSide ? 'unit' : 'enemy';
  const evolvedTag = useEvolved && config.sprite.evolved ? '_evolved' : '';
  const icon = scene.add.image(x, y, `${prefix}_${config.id}${evolvedTag}_idle`);
  icon.setFlipX(isPlayerSide);
  icon.setScale(targetDiameter / Math.max(icon.width, icon.height));
  if (idleAnimated) {
    scene.tweens.add({
      targets: icon,
      y: y - IDLE_BOB_AMPLITUDE,
      duration: IDLE_BOB_DURATION_MS,
      delay: Math.random() * IDLE_BOB_DURATION_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  return icon;
}
