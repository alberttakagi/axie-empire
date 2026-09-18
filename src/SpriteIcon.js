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

// Universal "zoomed to face" crop, as fractions of the source PNG's own
// width/height — used by the spawn-button portraits (real Battle Cats deploy
// icons are a tight face crop, not the whole body, so units are readable at
// a glance instead of all reading as "a round blob"). Checked by eye against
// every roster entry's idle art: each Axie's eyes/mouth/cheek markings sit
// within roughly the top-left/upper-middle 60% of the frame regardless of
// species (beast/plant/aquatic/reptile/bird/dusk), with the bottom third
// reliably just legs, tail and drop-shadow — one fixed rect crops all of
// them well enough without per-unit tuning.
const FACE_ZOOM_RECT = { x: 0.06, y: 0.08, w: 0.88, h: 0.58 };

// Registers (once per texture) a named sub-frame of `textureKey` cropped to
// FACE_ZOOM_RECT, and returns its frame name. Reusing Phaser's own
// multi-frame-per-texture support (rather than Image.setCrop) means the
// resulting Image's width/height ARE the crop's pixel size, so the caller's
// normal `setScale(targetDiameter / max(width, height))` + `setOrigin(0.5)`
// centers on the crop with no extra offset math.
function ensureFaceFrame(scene, textureKey) {
  const frameKey = `${textureKey}__face`;
  const texture = scene.textures.get(textureKey);
  if (!texture.has(frameKey)) {
    const source = texture.source[0];
    const cropX = Math.round(source.width * FACE_ZOOM_RECT.x);
    const cropY = Math.round(source.height * FACE_ZOOM_RECT.y);
    const cropW = Math.round(source.width * FACE_ZOOM_RECT.w);
    const cropH = Math.round(source.height * FACE_ZOOM_RECT.h);
    texture.add(frameKey, 0, cropX, cropY, cropW, cropH);
  }
  return frameKey;
}

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
//
// `faceZoom` (default off) shows FACE_ZOOM_RECT's crop instead of the full
// body — the real game's own deploy-icon framing (reference screenshot: a
// tight headshot, not the whole cat) — for whichever screen wants
// closeup-and-legible over whole-body-and-small. Ignored when `idleAnimated`
// is also on (no current caller combines them; the animated loop's own
// frames aren't cropped).
export function addUnitIcon(scene, x, y, config, targetDiameter, isPlayerSide = true, useEvolved = false, idleAnimated = false, faceZoom = false) {
  if (!config.sprite) return null;
  const prefix = isPlayerSide ? 'unit' : 'enemy';
  const evolvedTag = useEvolved && config.sprite.evolved ? '_evolved' : '';
  const spriteSet = useEvolved && config.sprite.evolved ? config.sprite.evolved : config.sprite;
  const frames = idleAnimated && spriteSet.idleAnim ? frameKeys(prefix, config.id, evolvedTag, 'idleAnim', spriteSet.idleAnim.length) : null;
  const idleKey = `${prefix}_${config.id}${evolvedTag}_idle`;

  let icon;
  if (frames) {
    icon = scene.add.image(x, y, frames[0]);
  } else if (faceZoom) {
    icon = scene.add.image(x, y, idleKey, ensureFaceFrame(scene, idleKey));
  } else {
    // Explicit '__BASE' (Phaser's own name for a single-image texture's
    // one real frame), NOT the 2-arg form that lets Phaser pick a
    // "default" frame — ensureFaceFrame's texture.add() reassigns that
    // texture's OWN notion of "default frame" to the newly added crop the
    // very first time it runs (Phaser's Texture.firstFrame updates to the
    // most recently added frame while a texture has exactly one custom
    // frame). Since textures are cached and shared across every scene, the
    // instant ANY screen renders this unit with faceZoom once, every other
    // 2-arg `add.image(x, y, idleKey)` anywhere in the game — including
    // GameScene's own in-battle sprite — would silently start rendering
    // the cropped face instead of the full body, scaled up as if it were
    // the whole sprite. Real, observed bug: a unit whose deploy-button icon
    // had rendered at least once looked cropped/zoomed in actual combat.
    icon = scene.add.image(x, y, idleKey, '__BASE');
  }
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
        icon.setTexture(frames[frame], '__BASE');
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
