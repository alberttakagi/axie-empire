// Enemy roster — same 5 roles and exact same field shape as UNIT_CONFIG.js
// (see that file for the full field reference), so difficulty later comes
// from which enemy types a wave mixes in, not just flat stat scaling.
//
// Values below are base stats: STAGE_CONFIG's spawnScript applies each
// entry's own statMultiplier to hp on top of these at spawn time.
//
// `characterName` — the real PvE Chimera this enemy reskins (e.g.
// "Werewolf") — same idea as UNIT_CONFIG.js's own field: shown ahead of
// displayName wherever a screen is about browsing a specific character
// (Enemy Guide) rather than identifying an in-battle threat by role.
//
// `sprite` — like UNIT_CONFIG.js's own field, but sourced from the Origins
// Asset Kit's PvE "Chimeras" (monster/mob) skeletons instead of the Starter
// Axies (see tools/sprite-gen/ and tools/axie-origins-asset-kit/LICENSE.md
// — same restricted license). Each role's chimera was picked for thematic
// fit, not any mechanical property: basic/slime, fast/gray-wolf, tank/
// treant, ranged/aqua-slime-atk, aoe/dryad-mage, swarm/forest-slime-fighter,
// sniper/dryad-ranger, guardian/flowering-treant, support/aqua-slime-sup
// ("AquaticFloweringSlime" in the catalog — literally the "sup" variant),
// titan/daddy-bear, zombie/aqua-slime-def ("OldSlime" — a creature that just
// won't stop reforming fits the revive gimmick), colossus/alpha-wolf,
// behemoth/werewolf. GameScene's createEntityVisual/setEntityPose handle
// enemy sprites exactly like player units' — see UNIT_CONFIG.js.
//
// `threat` isn't spent by a player — it's a value weight used for spawn-side
// balancing (which enemies a wave director could mix in) and doubles as the
// payout basis for a kill's money bonus (see MONEY_CONFIG.killBonusMultiplier).
//
// `trait` is one of TRAIT_CONFIG.js's TRAITS — same matchup/flat-damage
// system as UNIT_CONFIG.js, applied symmetrically in both directions.
//
// `foreswingMs`/`backswingMs`/`rechargeMs` don't matter for enemies the same
// way they do for player units (enemies aren't "deployed" by a player, so
// rechargeMs is unused on this side — kept for schema symmetry with
// UNIT_CONFIG only), but foreswing/backswing still govern their attack
// pacing and can still be interrupted by a knockback exactly like a player
// unit's can.
//
// `knockbackCount`/`knockbackDistance`/`knockbackType` — see UNIT_CONFIG.js
// for the full explanation; same HP-threshold "endurance" mechanic applies
// to enemies taking hits from units (bible §A.3.5).
//
// `critChance` — see UNIT_CONFIG.js; enemies can crit player units too.
//
// `statusOnHit` — see STATUS_CONFIG.js. Every role but basic has one: tank
// owns Stop, ranged owns Warp (see below — the player side's ranged keeps
// Slow instead), fast and aoe both curse (differentiated by chance/duration
// — fast is frequent-but-short harassment, aoe is rarer-but-long lockdown).
// basic stays ability-less on both sides as the deliberate "no gimmick"
// baseline. UNIT_CONFIG.js mirrors this exact role-to-ability mapping on
// the player side, EXCEPT ranged: Warp is conventionally an enemy-only
// affliction in the reference game, so only this enemy-side ranged carries
// it — the player-side ranged keeps its own Slow instead of trading up.
//
// `longDistance`/`toxicOnHit`/`waveOnHit`/`waveImmune`/`warpImmune`/
// `barrierMaxHp`/`barrierBreakerChance` — see UNIT_CONFIG.js for the full
// field reference; same mechanics apply symmetrically to enemies.
//
// `reviveCount`/`reviveHpPercent` — Zombie's own special rule (bible
// §A.3.8), enemy-only: on what would otherwise be its death, if reviveCount
// is still > 0 it instead comes back at reviveHpPercent of its (unscaled)
// max HP with its revive counter decremented — UNLESS the finishing blow's
// attacker has UNIT_CONFIG's zombieKiller flag, which denies the revive
// outright. See GameScene's handleEnemyDeath.
//
// `superClass` — Colossus/Behemoth (bible §A.3.8): a tag layered ON TOP OF
// the normal `trait` above, not a replacement for it — see
// TRAIT_CONFIG.js's SUPER_CLASS_SLAYER_BONUSES and UNIT_CONFIG.js's
// colossusSlayer/behemothSlayer flags for the counter-play.

import { NO_STATUS, STATUS_TYPES } from './STATUS_CONFIG.js';

export const ENEMY_CONFIG = {
  basic: {
    id: 'basic',
    displayName: 'Basic Melee',
    characterName: "Slime", // the real PvE Chimera this enemy reskins
    role: 'basic',
    trait: 'beast',
    threat: 2,
    hp: 16,
    damage: 3,
    attackSpeed: 1, // dps 3 — interval 1000ms, split 35/65 below
    foreswingMs: 350,
    backswingMs: 650,
    moveSpeed: 40,
    radius: 16,
    range: 16,
    rechargeMs: 0, // unused on the enemy side, see file header
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xcc3333,
    label: 'B',
    special: { type: 'none' },
    critChance: 0.05,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_basic_idle.png", attack: "/sprites/enemies/enemy_basic_attack.png", hit: "/sprites/enemies/enemy_basic_hit.png" },
  },
  fast: {
    id: 'fast',
    displayName: 'Fast Melee',
    characterName: "Gray Wolf", // the real PvE Chimera this enemy reskins
    role: 'fast',
    trait: 'bird',
    // Directional push only, mirroring the unit-side literal-ratio jump
    // (the real reference here is a premium unit, a poor tier match to
    // apply literally against our other enemy-tier stats).
    threat: 6,
    hp: 22,
    damage: 4,
    attackSpeed: 1.5, // dps 6 — interval ~667ms, split 35/65 below
    foreswingMs: 233,
    backswingMs: 434,
    moveSpeed: 115,
    radius: 12,
    range: 12,
    rechargeMs: 0,
    knockbackCount: 2,
    knockbackDistance: 18,
    knockbackType: 'normal',
    color: 0xff6666,
    label: 'F',
    special: { type: 'none' },
    critChance: 0.07,
    // Status-effect rollout: a quick harasser that curses on hit — shorter
    // duration than aoe's curse (fast attacks more often, so uptime stays
    // comparable rather than strictly better) but easy to land.
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.2, durationMs: 1500 },
    // Wave Attack (bible §A.3.8): mirrors the player-side fast unit's own
    // shockwave-on-hit.
    waveOnHit: { radius: 60 },
    sprite: { idle: "/sprites/enemies/enemy_fast_idle.png", attack: "/sprites/enemies/enemy_fast_attack.png", hit: "/sprites/enemies/enemy_fast_hit.png" },
  },
  tank: {
    id: 'tank',
    displayName: 'Tank',
    characterName: "Treant", // the real PvE Chimera this enemy reskins
    role: 'tank',
    trait: 'mech',
    // Pushed toward the real reference direction (enemy-side walls skew even
    // harder toward "pure roadblock" than player walls do) without going all
    // the way to the literal ratio, which would demand ~1,776 hp off our
    // basic enemy's 16 — not viable at our lane length/wave pacing.
    threat: 4,
    hp: 150,
    damage: 1,
    attackSpeed: 0.6, // dps 0.6 — interval ~1667ms, split 35/65 below
    foreswingMs: 583,
    backswingMs: 1084,
    moveSpeed: 32,
    radius: 26,
    range: 26,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 4,
    knockbackType: 'immune', // a true wall doesn't budge, regardless of the other knockback fields
    color: 0x993333,
    label: 'T',
    special: { type: 'none' },
    critChance: 0,
    // Status-effect demo (STATUS_CONFIG.js): a heavy bruiser that can stun
    // whatever it lands a hit on — thematically a "you can't push it, but it
    // can freeze you" bruiser, since knockbackType 'immune' already means it
    // can't be shoved itself.
    statusOnHit: { type: STATUS_TYPES.STOP, chance: 0.15, durationMs: 800 },
    // Same "nothing moves this thing" logic as the player-side tank.
    warpImmune: true,
    // Barrier (bible §A.3.8): this enemy has a shell that must be cracked
    // (or Barrier-Broken — see the player-side tank's barrierBreakerChance)
    // before real damage gets through, reinforcing its "hard to kill" role.
    barrierMaxHp: 30,
    sprite: { idle: "/sprites/enemies/enemy_tank_idle.png", attack: "/sprites/enemies/enemy_tank_attack.png", hit: "/sprites/enemies/enemy_tank_hit.png" },
  },
  ranged: {
    id: 'ranged',
    displayName: 'Ranged',
    characterName: "Aquatic Slime", // the real PvE Chimera this enemy reskins
    role: 'ranged',
    trait: 'bug',
    // Directional push only (the tier-matched real reference for this
    // archetype was ~44x our basic enemy's hp — a poor tier match, not a
    // ratio to apply literally): more hp, notably more burst dps, a bit
    // slower, mirroring the same "hits hard, not fragile" shape as the
    // rebalanced unit-side ranged.
    threat: 7,
    hp: 20,
    damage: 6,
    attackSpeed: 1, // dps 6 — interval 1000ms, split 35/65 below
    foreswingMs: 350,
    backswingMs: 650,
    moveSpeed: 30,
    radius: 13,
    range: 85,
    rechargeMs: 0,
    knockbackCount: 2,
    knockbackDistance: 14,
    knockbackType: 'normal',
    color: 0xff9966,
    label: 'R',
    special: { type: 'none' },
    critChance: 0.05,
    // Warp (bible §A.3.8), not Slow — this is the deliberate asymmetry with
    // the player-side ranged unit (see file header): a sniper that
    // occasionally teleports a player unit out of position entirely,
    // rather than merely slowing it.
    statusOnHit: {
      type: STATUS_TYPES.WARP,
      chance: 0.2,
      durationMs: 1500,
      minDistance: 60,
      maxDistance: 160,
    },
    // Long Distance (bible §A.3.8): mirrors the player-side ranged unit's
    // own blind-spot-but-long-reach shape.
    longDistance: { min: 40, max: 140 },
    sprite: { idle: "/sprites/enemies/enemy_ranged_idle.png", attack: "/sprites/enemies/enemy_ranged_attack.png", hit: "/sprites/enemies/enemy_ranged_hit.png" },
  },
  aoe: {
    id: 'aoe',
    displayName: 'Special (AoE)',
    characterName: "Dryad Mage", // the real PvE Chimera this enemy reskins
    role: 'aoe',
    trait: 'plant',
    // Directional push only (poor tier match — the real splash-attack
    // reference sits well above our whole enemy-stat tier; see
    // UNIT_CONFIG.js's aoe entry for the full ratio derivation).
    threat: 12,
    hp: 30,
    damage: 10,
    attackSpeed: 0.4, // dps 4 — interval 2500ms, split 35/65 below (~1 attack every 2.5s)
    foreswingMs: 875,
    backswingMs: 1625,
    moveSpeed: 34,
    radius: 16,
    range: 16,
    rechargeMs: 0,
    knockbackCount: 2,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xcc33cc,
    label: 'A',
    special: { type: 'aoe', radius: 50 },
    critChance: 0.03,
    // Status-effect demo (STATUS_CONFIG.js): whatever it hits gets cursed —
    // a player unit's own special ability is suppressed, and landing this
    // on the player's base blocks the special-burst trigger for 3s, so
    // there's real stakes to letting this one connect.
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.25, durationMs: 3000 },
    sprite: { idle: "/sprites/enemies/enemy_aoe_idle.png", attack: "/sprites/enemies/enemy_aoe_attack.png", hit: "/sprites/enemies/enemy_aoe_hit.png" },
  },

  // --- Roster expansion mirrors (see UNIT_CONFIG.js's own matching section)
  // for the 5 new player units — these give the new sagas fresh enemy
  // silhouettes to escalate difficulty with, same shared schema as above.

  swarm: {
    id: 'swarm',
    displayName: 'Swarmling',
    characterName: "Forest Slime Fighter", // the real PvE Chimera this enemy reskins
    role: 'swarm',
    trait: 'beast',
    threat: 3,
    hp: 10,
    damage: 2,
    attackSpeed: 1.6, // dps 3.2 — interval 625ms, split 35/65 below
    foreswingMs: 219,
    backswingMs: 406,
    moveSpeed: 70,
    radius: 10,
    range: 10,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xff3366,
    label: 'Sw',
    special: { type: 'none' },
    critChance: 0.03,
    statusOnHit: NO_STATUS,
    // Dodge (bible §A.3.8) — mirrors the player-side swarm unit's own
    // evasive identity.
    dodgeChance: 0.12,
    dodgeWindowMs: 400,
    sprite: { idle: "/sprites/enemies/enemy_swarm_idle.png", attack: "/sprites/enemies/enemy_swarm_attack.png", hit: "/sprites/enemies/enemy_swarm_hit.png" },
  },
  sniper: {
    id: 'sniper',
    displayName: 'Sniper',
    characterName: "Dryad Ranger", // the real PvE Chimera this enemy reskins
    role: 'sniper',
    trait: 'bird',
    threat: 14,
    hp: 35,
    damage: 25,
    attackSpeed: 0.3, // dps 7.5 — interval ~3333ms, split 35/65 below
    foreswingMs: 1167,
    backswingMs: 2167,
    moveSpeed: 45,
    radius: 13,
    range: 150,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 16,
    knockbackType: 'normal',
    color: 0xff9933,
    label: 'Sn',
    special: { type: 'none' },
    critChance: 0.1,
    statusOnHit: NO_STATUS,
    // Long Distance (bible §A.3.8): mirrors the player-side sniper's own
    // blind-spot-but-long-reach shape.
    longDistance: { min: 70, max: 200 },
    sprite: { idle: "/sprites/enemies/enemy_sniper_idle.png", attack: "/sprites/enemies/enemy_sniper_attack.png", hit: "/sprites/enemies/enemy_sniper_hit.png" },
  },
  guardian: {
    id: 'guardian',
    displayName: 'Guardian',
    characterName: "Flowering Treant", // the real PvE Chimera this enemy reskins
    role: 'guardian',
    trait: 'mech',
    threat: 10,
    hp: 220,
    damage: 4,
    attackSpeed: 0.7, // dps 2.8 — interval ~1429ms, split 35/65 below
    foreswingMs: 500,
    backswingMs: 929,
    moveSpeed: 26,
    radius: 24,
    range: 24,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 4,
    knockbackType: 'normal',
    color: 0x996633,
    label: 'Gd',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: { type: STATUS_TYPES.STOP, chance: 0.15, durationMs: 700 },
    // Barrier (bible §A.3.8): a shell that must be cracked before real
    // damage gets through, on top of already-high HP.
    barrierMaxHp: 40,
    sprite: { idle: "/sprites/enemies/enemy_guardian_idle.png", attack: "/sprites/enemies/enemy_guardian_attack.png", hit: "/sprites/enemies/enemy_guardian_hit.png" },
  },
  support: {
    id: 'support',
    displayName: 'Support',
    characterName: "Aquatic Flowering Slime", // the real PvE Chimera this enemy reskins
    role: 'support',
    trait: 'bug',
    threat: 9,
    hp: 45,
    damage: 6,
    attackSpeed: 1.0, // dps 6 — interval 1000ms, split 35/65 below
    foreswingMs: 350,
    backswingMs: 650,
    moveSpeed: 48,
    radius: 14,
    range: 75,
    rechargeMs: 0,
    knockbackCount: 2,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xcc6666,
    label: 'Su',
    special: { type: 'none' },
    critChance: 0.05,
    statusOnHit: { type: STATUS_TYPES.WEAKEN, chance: 0.3, durationMs: 1500, multiplier: 0.6 },
    toxicOnHit: { chance: 0.25, percent: 0.06 },
    sprite: { idle: "/sprites/enemies/enemy_support_idle.png", attack: "/sprites/enemies/enemy_support_attack.png", hit: "/sprites/enemies/enemy_support_hit.png" },
  },
  titan: {
    id: 'titan',
    displayName: 'Titan',
    characterName: "Daddy Bear", // the real PvE Chimera this enemy reskins
    role: 'titan',
    trait: 'plant',
    threat: 20,
    hp: 260,
    damage: 45,
    attackSpeed: 0.4, // dps 18 — interval 2500ms, split 35/65 below
    foreswingMs: 875,
    backswingMs: 1625,
    moveSpeed: 22,
    radius: 32,
    range: 32,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 5,
    knockbackType: 'normal',
    color: 0x992222,
    label: 'Ti',
    special: { type: 'aoe', radius: 55 },
    critChance: 0.05,
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.25, durationMs: 3000 },
    // Surge Attack (bible §A.3.8) — mirrors the player-side Titan's own
    // delayed ground-slam.
    surgeOnHit: { chance: 0.25, delayMs: 600, radius: 70 },
    sprite: { idle: "/sprites/enemies/enemy_titan_idle.png", attack: "/sprites/enemies/enemy_titan_attack.png", hit: "/sprites/enemies/enemy_titan_hit.png" },
  },

  // --- Wider enemy trait roster (bible §A.3.8) — see this file's own
  // header and TRAIT_CONFIG.js for the mechanical rationale. Introduced no
  // earlier than saga2 (see STAGE_CONFIG.js) — saga1 stays the original
  // "no exotic traits yet" 5-enemy roster, matching how the reference game
  // itself only introduces Zombie/Colossus/Behemoth-tier content well past
  // its own opening chapters.

  zombie: {
    id: 'zombie',
    displayName: 'Zombie',
    characterName: "Old Slime", // the real PvE Chimera this enemy reskins
    role: 'zombie',
    trait: 'zombie', // its own outlier trait (see TRAIT_CONFIG.js) — no matchup bonuses either way
    // Identity: an ordinary-strength recurring nuisance whose real threat
    // isn't its stats at all — it just won't stay dead. See
    // reviveCount/reviveHpPercent below and GameScene's handleEnemyDeath.
    threat: 10,
    hp: 40,
    damage: 8,
    attackSpeed: 1, // dps 8 — interval 1000ms, split 35/65 below
    foreswingMs: 350,
    backswingMs: 650,
    moveSpeed: 35,
    radius: 14,
    range: 14,
    rechargeMs: 0,
    knockbackCount: 2,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0x556b2f,
    label: 'Z',
    special: { type: 'none' },
    critChance: 0.05,
    statusOnHit: NO_STATUS,
    // Zombie (bible §A.3.8): revives twice at half its (unscaled) max HP
    // unless the finishing blow comes from a zombieKiller unit (this
    // build's `sniper`) — see GameScene.handleEnemyDeath.
    reviveCount: 2,
    reviveHpPercent: 0.5,
    sprite: { idle: "/sprites/enemies/enemy_zombie_idle.png", attack: "/sprites/enemies/enemy_zombie_attack.png", hit: "/sprites/enemies/enemy_zombie_hit.png" },
  },
  colossus: {
    id: 'colossus',
    displayName: 'Colossus',
    characterName: "Alpha Wolf", // the real PvE Chimera this enemy reskins
    role: 'colossus',
    trait: 'bug',
    // Identity: a recurring "big, dangerous, but not a scripted boss"
    // threat — tougher and harder-hitting than anything else short of an
    // actual boss spawn, appearing multiple times through saga2/saga3
    // rather than as a single one-off encounter.
    threat: 22,
    hp: 320,
    damage: 35,
    attackSpeed: 0.4, // dps 14 — interval 2500ms, split 35/65 below
    foreswingMs: 875,
    backswingMs: 1625,
    moveSpeed: 20,
    radius: 34,
    range: 34,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 4,
    knockbackType: 'normal',
    color: 0x996633,
    label: 'Co',
    special: { type: 'aoe', radius: 50 },
    critChance: 0.05,
    statusOnHit: { type: STATUS_TYPES.STOP, chance: 0.15, durationMs: 800 },
    // Colossus (bible §A.3.8): a superClass tag layered on top of its own
    // normal `trait` above (still Bug for ordinary matchup purposes) — see
    // TRAIT_CONFIG.js's SUPER_CLASS_SLAYER_BONUSES and UNIT_CONFIG.js's
    // `guardian`, this build's Colossus Slayer.
    superClass: 'colossus',
    sprite: { idle: "/sprites/enemies/enemy_colossus_idle.png", attack: "/sprites/enemies/enemy_colossus_attack.png", hit: "/sprites/enemies/enemy_colossus_hit.png" },
  },
  behemoth: {
    id: 'behemoth',
    displayName: 'Behemoth',
    characterName: "Werewolf", // the real PvE Chimera this enemy reskins
    role: 'behemoth',
    trait: 'beast',
    // Identity: the single toughest non-scripted-boss enemy in the game —
    // reserved for the very end of saga3, sparingly, matching the bible's
    // own Behemoth-tier content being a rare, dreaded endgame threat.
    threat: 35,
    hp: 500,
    damage: 55,
    attackSpeed: 0.35, // dps ~19 — interval ~2857ms, split 35/65 below
    foreswingMs: 1000,
    backswingMs: 1857,
    moveSpeed: 18,
    radius: 38,
    range: 38,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 3,
    knockbackType: 'immune', // a true juggernaut doesn't budge, same as this build's own `tank`
    color: 0x330000,
    label: 'Be',
    special: { type: 'aoe', radius: 60 },
    critChance: 0.05,
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.2, durationMs: 2500 },
    // Behemoth (bible §A.3.8): a superClass tag layered on top of its own
    // normal `trait` above (still Beast for ordinary matchup purposes) —
    // see TRAIT_CONFIG.js's SUPER_CLASS_SLAYER_BONUSES and UNIT_CONFIG.js's
    // `titan`, this build's Behemoth Slayer.
    superClass: 'behemoth',
    sprite: { idle: "/sprites/enemies/enemy_behemoth_idle.png", attack: "/sprites/enemies/enemy_behemoth_attack.png", hit: "/sprites/enemies/enemy_behemoth_hit.png" },
  },
};
