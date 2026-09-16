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
// `run` (the walking/moving pose — see GameScene's getDesiredPose) and
// `idleAnim` (see addUnitIcon's own comment) are both short arrays of PNG
// paths rather than one path like idle/attack/hit — a single static frame
// read as barely-different from idle (these are round, mostly-legless
// Axies/Chimeras — there's no dramatic motion for one extra frame to
// capture), so whatever uses them cycles through 2 real frames of that
// same source animation instead. Both are optional per entry rather than
// always-on like idle/attack/hit: every unit/enemy has `idleAnim`, but
// only units and every enemy except sniper/Dryad Ranger (no move clip in
// its source skeleton) have `run`.
const CORE_POSES = ['idle', 'attack', 'hit'];
const FRAME_FIELDS = ['run', 'idleAnim'];

function frameKeys(prefix, id, evolvedTag, fieldName, frameCount) {
  const keys = [];
  for (let i = 0; i < frameCount; i++) keys.push(`${prefix}_${id}${evolvedTag}_${fieldName.toLowerCase()}_${i}`);
  return keys;
}

function loadFrames(scene, prefix, id, evolvedTag, sprite) {
  for (const field of FRAME_FIELDS) {
    if (!sprite[field]) continue;
    const keys = frameKeys(prefix, id, evolvedTag, field, sprite[field].length);
    sprite[field].forEach((path, i) => {
      if (!scene.textures.exists(keys[i])) scene.load.image(keys[i], path);
    });
  }
}

export function preloadSpriteRoster(scene, roster, isPlayerSide = true) {
  const prefix = isPlayerSide ? 'unit' : 'enemy';
  for (const config of Object.values(roster)) {
    if (!config.sprite) continue;
    for (const pose of CORE_POSES) {
      const key = `${prefix}_${config.id}_${pose}`;
      if (!scene.textures.exists(key)) scene.load.image(key, config.sprite[pose]);
    }
    loadFrames(scene, prefix, config.id, '', config.sprite);
    if (!config.sprite.evolved) continue;
    for (const pose of CORE_POSES) {
      const key = `${prefix}_${config.id}_evolved_${pose}`;
      if (!scene.textures.exists(key)) scene.load.image(key, config.sprite.evolved[pose]);
    }
    loadFrames(scene, prefix, config.id, '_evolved', config.sprite.evolved);
  }
}

// idleAnimated's cycle (see addUnitIcon) alternates the icon's texture
// between idleAnim[0]/[1] — 2 real frames sampled from the same
// "action/idle/normal" Spine clip GameScene's own idle pose already uses
// (see tools/sprite-gen), rather than a made-up motion: a slow, subtle
// breathing-style loop, calmer/slower than GameScene's own run-cycle hop
// (a different context entirely — that one's brisk, meant to sell
// "walking"). Frame swaps are staggered per icon via a randomized initial
// delay so a whole grid of them doesn't visibly breathe in lockstep.
const IDLE_ANIM_FRAME_MS = 550;

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
// `idleAnimated` (default off) plays the small idleAnim loop described
// above — opt-in rather than automatic on every icon, since a battle
// spawn button or an Upgrade-screen row already has plenty going on
// (cooldown fills, level text) without also drawing the eye with motion;
// it's meant for screens that are otherwise showing a completely static
// portrait (Character Formation, the Unit/Enemy Guide). Falls back to the
// plain static idle pose if this config has no `idleAnim` (there's none
// currently — every roster entry has one — but a future entry might not).
export function addUnitIcon(scene, x, y, config, targetDiameter, isPlayerSide = true, useEvolved = false, idleAnimated = false) {
  if (!config.sprite) return null;
  const prefix = isPlayerSide ? 'unit' : 'enemy';
  const evolvedTag = useEvolved && config.sprite.evolved ? '_evolved' : '';
  const spriteSet = useEvolved && config.sprite.evolved ? config.sprite.evolved : config.sprite;
  const frames = idleAnimated && spriteSet.idleAnim ? frameKeys(prefix, config.id, evolvedTag, 'idleAnim', spriteSet.idleAnim.length) : null;

  const icon = scene.add.image(x, y, frames ? frames[0] : `${prefix}_${config.id}${evolvedTag}_idle`);
  icon.setFlipX(isPlayerSide);
  icon.setScale(targetDiameter / Math.max(icon.width, icon.height));

  if (frames && frames.length > 1) {
    let frame = 0;
    const timer = scene.time.addEvent({
      delay: IDLE_ANIM_FRAME_MS,
      startAt: Math.random() * IDLE_ANIM_FRAME_MS,
      loop: true,
      callback: () => {
        frame = (frame + 1) % frames.length;
        icon.setTexture(frames[frame]);
      },
    });
    // LoadoutScene/CatalogScene rebuild their cards repeatedly (tapping a
    // card, paging through the detail view, ...) without restarting the
    // whole scene, which destroys THIS icon but leaves scene.time's own
    // timer list (and this callback) running otherwise — it would keep
    // firing against a destroyed Image forever. Tying its life to the
    // icon's own 'destroy' event means every card rebuild cleans up
    // exactly the timers that card's own icons started, no more.
    icon.once('destroy', () => timer.remove());
  }

  return icon;
}
