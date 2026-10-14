// Enemy roster — REBUILT to be 10 of the real early Empire of Cats enemies
// (guide Chapter 13, battlecats-db-sourced, "strength 100%" baseline values
// — STAGE_CONFIG's spawnScript statMultiplier scales these up/down per
// stage, exactly matching the guide's own convention). The other 14 enemies
// the guide lists (see docs/BATTLE_CATS_MAPPING.md's roadmap) aren't wired
// up yet — this pass covers a representative early-game slice, not the
// guide's full 24.
//
// Same TIME/MONEY conversion rules as UNIT_CONFIG.js (frame×1000/30 = ms;
// hp/damage/money used as literal real values — see that file's header for
// the full reasoning), and the same "spatial fields stay in this engine's
// own tuned pixel scale, adjusted only to preserve real RELATIVE
// proportions" approach for moveSpeed/radius/range. The guide's enemy table
// has no separate foreswing column (only total attack interval), so
// foreswingMs/backswingMs below still use this codebase's existing 35/65
// split of that real interval — a documented simplification, not a real
// per-enemy value.
//
// `attribute` (replaces the old `trait` field's combat role — see
// TRAIT_CONFIG.js) is the one real Battle Cats attribute this enemy
// carries, or omitted entirely for a plain "White"/no-attribute enemy.
// `characterName` stays the real PvE Chimera each enemy reskins (unchanged
// from the previous roster — only the STATS/NAMES/attribute below moved to
// real Battle Cats data; the existing Origins Asset Kit sprites are reused
// as-is per this pass's "reuse existing sprites" scope decision).
//
// `money` — real yen paid out for killing this enemy (guide Chapter 14's
// own per-enemy payout list), read directly by GameScene's onEnemyKilled
// instead of the old invented threat-based formula. Omitted on the 3
// still-dormant enemies below (no real Chapter 1 data), which keep using
// that formula as a fallback.
//
// `nonBlocking` (kanban only) — GameScene.js's lane model normally never
// lets a unit advance past ANY live enemy ahead of it (bible-accurate
// single-lane collision), which is fine for every real combat threat but
// breaks kanban specifically: her real 10000 HP is an intentional
// "never actually meant to be killed" joke value, not a real combat gate,
// and every real Chapter 1-3 stage includes her. Without this flag she
// would permanently wall off literally every stage the instant she spawns,
// since no early-game roster can out-damage 10000 HP in a stage's
// lifetime. `nonBlocking: true` excludes her from both the player-side
// advance-clamp and player-side target acquisition (see updatePlayerUnits)
// and from ever being picked as the endless-trickle template (see
// scheduleStageScript) — she still spawns, animates, and can be hit if a
// unit is already fighting something else in her exact spot, but she can
// never be the thing standing between your units and the castle.
//
// See the previous revision of this file (git history) for the full,
// unabridged field-by-field reference comment (threat/foreswingMs/
// backswingMs/rechargeMs/knockbackCount etc.) — unchanged in shape here.

import { NO_STATUS } from './STATUS_CONFIG.js';

// Enemy rarity (this build's own addition — no real Battle Cats enemy has
// a rarity at all, and the Origins Asset Kit's own Chimera catalog carries
// no such field either). Read by GameScene's fitSpriteToRadius/
// spawnScriptedEnemy to size a sprite up as rarity increases, mostly
// bucketed by `threat` below (a reasonable "how special is this" proxy)
// with one deliberate exception: Behemoth/Werewolf sits alone at MYTHIC,
// specifically so it renders bigger than the player/enemy base towers —
// not the highest-threat enemy in the roster (Titan, the real stage-48
// final boss, is LEGENDARY), just the one this reskin wants to loom over
// everything else on the field.
export const ENEMY_RARITY = {
  COMMON: 'Common',
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
  MYTHIC: 'Mythic',
};

export const ENEMY_CONFIG = {
  basic: {
    id: 'basic',
    abilityLabel: 'Small Fry', // battle-style tag shown in (), like the units'
    displayName: 'Doge',
    characterName: 'Slime', // わんこ (Doge) — the first enemy in the real game
    role: 'basic',
    threat: 2,
    rarity: ENEMY_RARITY.COMMON,
    money: 15,
    hp: 90,
    damage: 8,
    attackSpeed: 5.1, // dps ~1.53 — interval 1567ms (47F), split 35/65 below (no real per-enemy foreswing data — see file header)
    foreswingMs: 548,
    backswingMs: 1019,
    moveSpeed: 30,
    // User request: visual size rebalance across the roster (Slime smaller,
    // Gray Wolf/Dryad Mage/Dryad Ranger/Daddy Bear bigger — see each role's
    // own comment). Slime is the baseline "smallest enemy" now — range
    // shrunk right alongside radius to keep it a pure melee contact hit,
    // same character as before, just a smaller body.
    radius: 12,
    range: 12,
    rechargeMs: 0, // unused on the enemy side, see file header
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xcc3333,
    label: 'D',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_basic_idle.png", attack: "/sprites/enemies/enemy_basic_attack.png", hit: "/sprites/enemies/enemy_basic_hit.png", run: ["/sprites/enemies/enemy_basic_run_0.png", "/sprites/enemies/enemy_basic_run_1.png", "/sprites/enemies/enemy_basic_run_2.png", "/sprites/enemies/enemy_basic_run_3.png", "/sprites/enemies/enemy_basic_run_4.png", "/sprites/enemies/enemy_basic_run_5.png", "/sprites/enemies/enemy_basic_run_6.png", "/sprites/enemies/enemy_basic_run_7.png", "/sprites/enemies/enemy_basic_run_8.png", "/sprites/enemies/enemy_basic_run_9.png", "/sprites/enemies/enemy_basic_run_10.png", "/sprites/enemies/enemy_basic_run_11.png", "/sprites/enemies/enemy_basic_run_12.png", "/sprites/enemies/enemy_basic_run_13.png", "/sprites/enemies/enemy_basic_run_14.png", "/sprites/enemies/enemy_basic_run_15.png"], idleAnim: ["/sprites/enemies/enemy_basic_idleanim_0.png", "/sprites/enemies/enemy_basic_idleanim_1.png", "/sprites/enemies/enemy_basic_idleanim_2.png", "/sprites/enemies/enemy_basic_idleanim_3.png", "/sprites/enemies/enemy_basic_idleanim_4.png", "/sprites/enemies/enemy_basic_idleanim_5.png", "/sprites/enemies/enemy_basic_idleanim_6.png", "/sprites/enemies/enemy_basic_idleanim_7.png", "/sprites/enemies/enemy_basic_idleanim_8.png", "/sprites/enemies/enemy_basic_idleanim_9.png", "/sprites/enemies/enemy_basic_idleanim_10.png", "/sprites/enemies/enemy_basic_idleanim_11.png", "/sprites/enemies/enemy_basic_idleanim_12.png", "/sprites/enemies/enemy_basic_idleanim_13.png", "/sprites/enemies/enemy_basic_idleanim_14.png", "/sprites/enemies/enemy_basic_idleanim_15.png", "/sprites/enemies/enemy_basic_idleanim_16.png", "/sprites/enemies/enemy_basic_idleanim_17.png", "/sprites/enemies/enemy_basic_idleanim_18.png", "/sprites/enemies/enemy_basic_idleanim_19.png", "/sprites/enemies/enemy_basic_idleanim_20.png", "/sprites/enemies/enemy_basic_idleanim_21.png", "/sprites/enemies/enemy_basic_idleanim_22.png", "/sprites/enemies/enemy_basic_idleanim_23.png", "/sprites/enemies/enemy_basic_idleanim_24.png", "/sprites/enemies/enemy_basic_idleanim_25.png", "/sprites/enemies/enemy_basic_idleanim_26.png", "/sprites/enemies/enemy_basic_idleanim_27.png", "/sprites/enemies/enemy_basic_idleanim_28.png", "/sprites/enemies/enemy_basic_idleanim_29.png", "/sprites/enemies/enemy_basic_idleanim_30.png", "/sprites/enemies/enemy_basic_idleanim_31.png", "/sprites/enemies/enemy_basic_idleanim_32.png", "/sprites/enemies/enemy_basic_idleanim_33.png", "/sprites/enemies/enemy_basic_idleanim_34.png", "/sprites/enemies/enemy_basic_idleanim_35.png", "/sprites/enemies/enemy_basic_idleanim_36.png", "/sprites/enemies/enemy_basic_idleanim_37.png", "/sprites/enemies/enemy_basic_idleanim_38.png", "/sprites/enemies/enemy_basic_idleanim_39.png"] },
  },
  fast: {
    id: 'fast',
    abilityLabel: 'Quick Biter', // battle-style tag shown in (), like the units'
    displayName: 'Snache',
    characterName: 'Gray Wolf', // にょろ (Snache)
    role: 'fast',
    threat: 4,
    rarity: ENEMY_RARITY.COMMON,
    money: 30,
    hp: 100,
    damage: 15,
    attackSpeed: 12.2, // dps ~12.2 — interval 1233ms (37F), split 35/65 below
    foreswingMs: 431,
    backswingMs: 802,
    moveSpeed: 40,
    // User request: bigger than Slime (see basic's own comment on this
    // rebalance) — range left untouched, now equal to it for a snug melee
    // fit instead of radius trailing behind its own reach.
    radius: 16,
    range: 16,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 18,
    knockbackType: 'normal',
    color: 0xff6666,
    label: 'S',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_fast_idle.png", attack: "/sprites/enemies/enemy_fast_attack.png", hit: "/sprites/enemies/enemy_fast_hit.png", run: ["/sprites/enemies/enemy_fast_run_0.png", "/sprites/enemies/enemy_fast_run_1.png", "/sprites/enemies/enemy_fast_run_2.png", "/sprites/enemies/enemy_fast_run_3.png", "/sprites/enemies/enemy_fast_run_4.png", "/sprites/enemies/enemy_fast_run_5.png", "/sprites/enemies/enemy_fast_run_6.png", "/sprites/enemies/enemy_fast_run_7.png", "/sprites/enemies/enemy_fast_run_8.png", "/sprites/enemies/enemy_fast_run_9.png", "/sprites/enemies/enemy_fast_run_10.png", "/sprites/enemies/enemy_fast_run_11.png", "/sprites/enemies/enemy_fast_run_12.png", "/sprites/enemies/enemy_fast_run_13.png", "/sprites/enemies/enemy_fast_run_14.png", "/sprites/enemies/enemy_fast_run_15.png"], idleAnim: ["/sprites/enemies/enemy_fast_idleanim_0.png", "/sprites/enemies/enemy_fast_idleanim_1.png", "/sprites/enemies/enemy_fast_idleanim_2.png", "/sprites/enemies/enemy_fast_idleanim_3.png", "/sprites/enemies/enemy_fast_idleanim_4.png", "/sprites/enemies/enemy_fast_idleanim_5.png", "/sprites/enemies/enemy_fast_idleanim_6.png", "/sprites/enemies/enemy_fast_idleanim_7.png", "/sprites/enemies/enemy_fast_idleanim_8.png", "/sprites/enemies/enemy_fast_idleanim_9.png", "/sprites/enemies/enemy_fast_idleanim_10.png", "/sprites/enemies/enemy_fast_idleanim_11.png", "/sprites/enemies/enemy_fast_idleanim_12.png", "/sprites/enemies/enemy_fast_idleanim_13.png", "/sprites/enemies/enemy_fast_idleanim_14.png", "/sprites/enemies/enemy_fast_idleanim_15.png", "/sprites/enemies/enemy_fast_idleanim_16.png", "/sprites/enemies/enemy_fast_idleanim_17.png", "/sprites/enemies/enemy_fast_idleanim_18.png", "/sprites/enemies/enemy_fast_idleanim_19.png", "/sprites/enemies/enemy_fast_idleanim_20.png", "/sprites/enemies/enemy_fast_idleanim_21.png", "/sprites/enemies/enemy_fast_idleanim_22.png", "/sprites/enemies/enemy_fast_idleanim_23.png", "/sprites/enemies/enemy_fast_idleanim_24.png", "/sprites/enemies/enemy_fast_idleanim_25.png", "/sprites/enemies/enemy_fast_idleanim_26.png", "/sprites/enemies/enemy_fast_idleanim_27.png", "/sprites/enemies/enemy_fast_idleanim_28.png", "/sprites/enemies/enemy_fast_idleanim_29.png", "/sprites/enemies/enemy_fast_idleanim_30.png", "/sprites/enemies/enemy_fast_idleanim_31.png", "/sprites/enemies/enemy_fast_idleanim_32.png", "/sprites/enemies/enemy_fast_idleanim_33.png", "/sprites/enemies/enemy_fast_idleanim_34.png", "/sprites/enemies/enemy_fast_idleanim_35.png", "/sprites/enemies/enemy_fast_idleanim_36.png", "/sprites/enemies/enemy_fast_idleanim_37.png", "/sprites/enemies/enemy_fast_idleanim_38.png", "/sprites/enemies/enemy_fast_idleanim_39.png"] },
  },
  tank: {
    id: 'tank',
    abilityLabel: 'Stump Wall', // battle-style tag shown in (), like the units'
    displayName: 'Hippoe',
    characterName: 'Treant', // カバちゃん (Hippoe) — real Battle Cats' own early "wall boss"
    role: 'tank',
    threat: 10,
    rarity: ENEMY_RARITY.RARE,
    money: 400,
    hp: 1000,
    damage: 100,
    attackSpeed: 4.5, // dps ~44.8 — interval 2233ms (67F), split 35/65 below
    foreswingMs: 781,
    backswingMs: 1452,
    moveSpeed: 27,
    radius: 26,
    range: 26,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 8,
    knockbackType: 'normal',
    color: 0x993333,
    label: 'H',
    special: { type: 'aoe', radius: 30 },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_tank_idle.png", attack: "/sprites/enemies/enemy_tank_attack.png", hit: "/sprites/enemies/enemy_tank_hit.png", run: ["/sprites/enemies/enemy_tank_run_0.png", "/sprites/enemies/enemy_tank_run_1.png", "/sprites/enemies/enemy_tank_run_2.png", "/sprites/enemies/enemy_tank_run_3.png", "/sprites/enemies/enemy_tank_run_4.png", "/sprites/enemies/enemy_tank_run_5.png", "/sprites/enemies/enemy_tank_run_6.png", "/sprites/enemies/enemy_tank_run_7.png", "/sprites/enemies/enemy_tank_run_8.png", "/sprites/enemies/enemy_tank_run_9.png", "/sprites/enemies/enemy_tank_run_10.png", "/sprites/enemies/enemy_tank_run_11.png", "/sprites/enemies/enemy_tank_run_12.png", "/sprites/enemies/enemy_tank_run_13.png", "/sprites/enemies/enemy_tank_run_14.png", "/sprites/enemies/enemy_tank_run_15.png"], idleAnim: ["/sprites/enemies/enemy_tank_idleanim_0.png", "/sprites/enemies/enemy_tank_idleanim_1.png", "/sprites/enemies/enemy_tank_idleanim_2.png", "/sprites/enemies/enemy_tank_idleanim_3.png", "/sprites/enemies/enemy_tank_idleanim_4.png", "/sprites/enemies/enemy_tank_idleanim_5.png", "/sprites/enemies/enemy_tank_idleanim_6.png", "/sprites/enemies/enemy_tank_idleanim_7.png", "/sprites/enemies/enemy_tank_idleanim_8.png", "/sprites/enemies/enemy_tank_idleanim_9.png", "/sprites/enemies/enemy_tank_idleanim_10.png", "/sprites/enemies/enemy_tank_idleanim_11.png", "/sprites/enemies/enemy_tank_idleanim_12.png", "/sprites/enemies/enemy_tank_idleanim_13.png", "/sprites/enemies/enemy_tank_idleanim_14.png", "/sprites/enemies/enemy_tank_idleanim_15.png", "/sprites/enemies/enemy_tank_idleanim_16.png", "/sprites/enemies/enemy_tank_idleanim_17.png", "/sprites/enemies/enemy_tank_idleanim_18.png", "/sprites/enemies/enemy_tank_idleanim_19.png", "/sprites/enemies/enemy_tank_idleanim_20.png", "/sprites/enemies/enemy_tank_idleanim_21.png", "/sprites/enemies/enemy_tank_idleanim_22.png", "/sprites/enemies/enemy_tank_idleanim_23.png", "/sprites/enemies/enemy_tank_idleanim_24.png", "/sprites/enemies/enemy_tank_idleanim_25.png", "/sprites/enemies/enemy_tank_idleanim_26.png", "/sprites/enemies/enemy_tank_idleanim_27.png", "/sprites/enemies/enemy_tank_idleanim_28.png", "/sprites/enemies/enemy_tank_idleanim_29.png", "/sprites/enemies/enemy_tank_idleanim_30.png", "/sprites/enemies/enemy_tank_idleanim_31.png", "/sprites/enemies/enemy_tank_idleanim_32.png", "/sprites/enemies/enemy_tank_idleanim_33.png", "/sprites/enemies/enemy_tank_idleanim_34.png", "/sprites/enemies/enemy_tank_idleanim_35.png", "/sprites/enemies/enemy_tank_idleanim_36.png", "/sprites/enemies/enemy_tank_idleanim_37.png", "/sprites/enemies/enemy_tank_idleanim_38.png", "/sprites/enemies/enemy_tank_idleanim_39.png"] },
  },
  ranged: {
    id: 'ranged',
    abilityLabel: 'Water Cannon', // battle-style tag shown in (), like the units'
    displayName: 'Paon',
    characterName: 'Aquatic Slime', // パオン (Paon) — real long-range artillery
    role: 'ranged',
    threat: 25,
    rarity: ENEMY_RARITY.LEGENDARY,
    money: 1300,
    hp: 4000,
    damage: 654,
    attackSpeed: 1.6, // dps ~104.9 — interval 6233ms (187F), split 35/65 below
    foreswingMs: 2182,
    backswingMs: 4051,
    moveSpeed: 27,
    radius: 18,
    range: 58,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 14,
    knockbackType: 'normal',
    color: 0xff9966,
    label: 'P',
    special: { type: 'aoe', radius: 40 },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_ranged_idle.png", attack: "/sprites/enemies/enemy_ranged_attack.png", hit: "/sprites/enemies/enemy_ranged_hit.png", run: ["/sprites/enemies/enemy_ranged_run_0.png", "/sprites/enemies/enemy_ranged_run_1.png", "/sprites/enemies/enemy_ranged_run_2.png", "/sprites/enemies/enemy_ranged_run_3.png", "/sprites/enemies/enemy_ranged_run_4.png", "/sprites/enemies/enemy_ranged_run_5.png", "/sprites/enemies/enemy_ranged_run_6.png", "/sprites/enemies/enemy_ranged_run_7.png", "/sprites/enemies/enemy_ranged_run_8.png", "/sprites/enemies/enemy_ranged_run_9.png", "/sprites/enemies/enemy_ranged_run_10.png", "/sprites/enemies/enemy_ranged_run_11.png", "/sprites/enemies/enemy_ranged_run_12.png", "/sprites/enemies/enemy_ranged_run_13.png", "/sprites/enemies/enemy_ranged_run_14.png", "/sprites/enemies/enemy_ranged_run_15.png", "/sprites/enemies/enemy_ranged_run_16.png", "/sprites/enemies/enemy_ranged_run_17.png", "/sprites/enemies/enemy_ranged_run_18.png", "/sprites/enemies/enemy_ranged_run_19.png", "/sprites/enemies/enemy_ranged_run_20.png", "/sprites/enemies/enemy_ranged_run_21.png", "/sprites/enemies/enemy_ranged_run_22.png", "/sprites/enemies/enemy_ranged_run_23.png", "/sprites/enemies/enemy_ranged_run_24.png", "/sprites/enemies/enemy_ranged_run_25.png", "/sprites/enemies/enemy_ranged_run_26.png", "/sprites/enemies/enemy_ranged_run_27.png"], idleAnim: ["/sprites/enemies/enemy_ranged_idleanim_0.png", "/sprites/enemies/enemy_ranged_idleanim_1.png", "/sprites/enemies/enemy_ranged_idleanim_2.png", "/sprites/enemies/enemy_ranged_idleanim_3.png", "/sprites/enemies/enemy_ranged_idleanim_4.png", "/sprites/enemies/enemy_ranged_idleanim_5.png", "/sprites/enemies/enemy_ranged_idleanim_6.png", "/sprites/enemies/enemy_ranged_idleanim_7.png", "/sprites/enemies/enemy_ranged_idleanim_8.png", "/sprites/enemies/enemy_ranged_idleanim_9.png", "/sprites/enemies/enemy_ranged_idleanim_10.png", "/sprites/enemies/enemy_ranged_idleanim_11.png", "/sprites/enemies/enemy_ranged_idleanim_12.png", "/sprites/enemies/enemy_ranged_idleanim_13.png", "/sprites/enemies/enemy_ranged_idleanim_14.png", "/sprites/enemies/enemy_ranged_idleanim_15.png", "/sprites/enemies/enemy_ranged_idleanim_16.png", "/sprites/enemies/enemy_ranged_idleanim_17.png", "/sprites/enemies/enemy_ranged_idleanim_18.png", "/sprites/enemies/enemy_ranged_idleanim_19.png", "/sprites/enemies/enemy_ranged_idleanim_20.png", "/sprites/enemies/enemy_ranged_idleanim_21.png", "/sprites/enemies/enemy_ranged_idleanim_22.png", "/sprites/enemies/enemy_ranged_idleanim_23.png", "/sprites/enemies/enemy_ranged_idleanim_24.png", "/sprites/enemies/enemy_ranged_idleanim_25.png", "/sprites/enemies/enemy_ranged_idleanim_26.png", "/sprites/enemies/enemy_ranged_idleanim_27.png", "/sprites/enemies/enemy_ranged_idleanim_28.png", "/sprites/enemies/enemy_ranged_idleanim_29.png", "/sprites/enemies/enemy_ranged_idleanim_30.png", "/sprites/enemies/enemy_ranged_idleanim_31.png", "/sprites/enemies/enemy_ranged_idleanim_32.png", "/sprites/enemies/enemy_ranged_idleanim_33.png", "/sprites/enemies/enemy_ranged_idleanim_34.png", "/sprites/enemies/enemy_ranged_idleanim_35.png", "/sprites/enemies/enemy_ranged_idleanim_36.png", "/sprites/enemies/enemy_ranged_idleanim_37.png", "/sprites/enemies/enemy_ranged_idleanim_38.png", "/sprites/enemies/enemy_ranged_idleanim_39.png", "/sprites/enemies/enemy_ranged_idleanim_40.png", "/sprites/enemies/enemy_ranged_idleanim_41.png"] },
  },
  aoe: {
    id: 'aoe',
    abilityLabel: 'Red Caster', // battle-style tag shown in (), like the units'
    displayName: 'Piggeh',
    characterName: 'Dryad Mage', // ブタヤロウ (Piggeh) — the first Red enemy
    role: 'aoe',
    threat: 12,
    rarity: ENEMY_RARITY.RARE,
    money: 400,
    hp: 1500,
    damage: 120,
    attackSpeed: 4.9, // dps ~49.3 — interval 2433ms (73F), split 35/65 below
    foreswingMs: 852,
    backswingMs: 1585,
    moveSpeed: 30,
    // User request: much bigger, clearly bigger than Slime/Gray Wolf — same
    // target size as Dryad Ranger and Daddy Bear (see each role's own
    // comment). Range left untouched at its own real reach.
    radius: 30,
    range: 22,
    rechargeMs: 0,
    knockbackCount: 2,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xcc33cc,
    label: 'Pg',
    special: { type: 'aoe', radius: 40 },
    critChance: 0,
    attribute: 'red', // the guide's first colored/attribute enemy
    statusOnHit: NO_STATUS,
    // No `run` field: Dryad Mage's own "action/move-forward"/"move-back"
    // clips are real entries in its skeleton but both carry a literal 0
    // duration (confirmed live) — a spellcaster that hovers rather than
    // walks, same idea as sniper/Dryad Ranger's own complete absence of a
    // move clip just below, so this gets the same "no run" treatment
    // getDesiredPose already handles (falls back to idle while moving)
    // rather than shipping a fake 2-frame non-animation.
    sprite: { idle: "/sprites/enemies/enemy_aoe_idle.png", attack: "/sprites/enemies/enemy_aoe_attack.png", hit: "/sprites/enemies/enemy_aoe_hit.png", idleAnim: ["/sprites/enemies/enemy_aoe_idleanim_0.png", "/sprites/enemies/enemy_aoe_idleanim_1.png", "/sprites/enemies/enemy_aoe_idleanim_2.png", "/sprites/enemies/enemy_aoe_idleanim_3.png", "/sprites/enemies/enemy_aoe_idleanim_4.png", "/sprites/enemies/enemy_aoe_idleanim_5.png", "/sprites/enemies/enemy_aoe_idleanim_6.png", "/sprites/enemies/enemy_aoe_idleanim_7.png", "/sprites/enemies/enemy_aoe_idleanim_8.png", "/sprites/enemies/enemy_aoe_idleanim_9.png", "/sprites/enemies/enemy_aoe_idleanim_10.png", "/sprites/enemies/enemy_aoe_idleanim_11.png", "/sprites/enemies/enemy_aoe_idleanim_12.png", "/sprites/enemies/enemy_aoe_idleanim_13.png", "/sprites/enemies/enemy_aoe_idleanim_14.png", "/sprites/enemies/enemy_aoe_idleanim_15.png", "/sprites/enemies/enemy_aoe_idleanim_16.png", "/sprites/enemies/enemy_aoe_idleanim_17.png", "/sprites/enemies/enemy_aoe_idleanim_18.png", "/sprites/enemies/enemy_aoe_idleanim_19.png", "/sprites/enemies/enemy_aoe_idleanim_20.png", "/sprites/enemies/enemy_aoe_idleanim_21.png", "/sprites/enemies/enemy_aoe_idleanim_22.png", "/sprites/enemies/enemy_aoe_idleanim_23.png", "/sprites/enemies/enemy_aoe_idleanim_24.png", "/sprites/enemies/enemy_aoe_idleanim_25.png", "/sprites/enemies/enemy_aoe_idleanim_26.png", "/sprites/enemies/enemy_aoe_idleanim_27.png", "/sprites/enemies/enemy_aoe_idleanim_28.png", "/sprites/enemies/enemy_aoe_idleanim_29.png", "/sprites/enemies/enemy_aoe_idleanim_30.png", "/sprites/enemies/enemy_aoe_idleanim_31.png", "/sprites/enemies/enemy_aoe_idleanim_32.png", "/sprites/enemies/enemy_aoe_idleanim_33.png", "/sprites/enemies/enemy_aoe_idleanim_34.png", "/sprites/enemies/enemy_aoe_idleanim_35.png", "/sprites/enemies/enemy_aoe_idleanim_36.png", "/sprites/enemies/enemy_aoe_idleanim_37.png", "/sprites/enemies/enemy_aoe_idleanim_38.png", "/sprites/enemies/enemy_aoe_idleanim_39.png", "/sprites/enemies/enemy_aoe_idleanim_40.png", "/sprites/enemies/enemy_aoe_idleanim_41.png", "/sprites/enemies/enemy_aoe_idleanim_42.png", "/sprites/enemies/enemy_aoe_idleanim_43.png", "/sprites/enemies/enemy_aoe_idleanim_44.png", "/sprites/enemies/enemy_aoe_idleanim_45.png", "/sprites/enemies/enemy_aoe_idleanim_46.png", "/sprites/enemies/enemy_aoe_idleanim_47.png"] },
  },

  swarm: {
    id: 'swarm',
    abilityLabel: 'Rusher', // battle-style tag shown in (), like the units'
    displayName: 'Listen To Me',
    characterName: 'Forest Slime Fighter', // リッスントゥミー — cheap, extremely fast swarm filler
    role: 'swarm',
    threat: 3,
    rarity: ENEMY_RARITY.COMMON,
    money: 100,
    hp: 80,
    damage: 30,
    attackSpeed: 56.3, // dps ~56.3 — interval 533ms (16F), split 35/65 below
    foreswingMs: 187,
    backswingMs: 346,
    moveSpeed: 115,
    radius: 10,
    range: 10,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xff3366,
    label: 'L',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_swarm_idle.png", attack: "/sprites/enemies/enemy_swarm_attack.png", hit: "/sprites/enemies/enemy_swarm_hit.png", run: ["/sprites/enemies/enemy_swarm_run_0.png", "/sprites/enemies/enemy_swarm_run_1.png", "/sprites/enemies/enemy_swarm_run_2.png", "/sprites/enemies/enemy_swarm_run_3.png", "/sprites/enemies/enemy_swarm_run_4.png", "/sprites/enemies/enemy_swarm_run_5.png", "/sprites/enemies/enemy_swarm_run_6.png", "/sprites/enemies/enemy_swarm_run_7.png", "/sprites/enemies/enemy_swarm_run_8.png", "/sprites/enemies/enemy_swarm_run_9.png", "/sprites/enemies/enemy_swarm_run_10.png", "/sprites/enemies/enemy_swarm_run_11.png", "/sprites/enemies/enemy_swarm_run_12.png", "/sprites/enemies/enemy_swarm_run_13.png", "/sprites/enemies/enemy_swarm_run_14.png", "/sprites/enemies/enemy_swarm_run_15.png", "/sprites/enemies/enemy_swarm_run_16.png", "/sprites/enemies/enemy_swarm_run_17.png", "/sprites/enemies/enemy_swarm_run_18.png", "/sprites/enemies/enemy_swarm_run_19.png", "/sprites/enemies/enemy_swarm_run_20.png", "/sprites/enemies/enemy_swarm_run_21.png", "/sprites/enemies/enemy_swarm_run_22.png", "/sprites/enemies/enemy_swarm_run_23.png"], idleAnim: ["/sprites/enemies/enemy_swarm_idleanim_0.png", "/sprites/enemies/enemy_swarm_idleanim_1.png", "/sprites/enemies/enemy_swarm_idleanim_2.png", "/sprites/enemies/enemy_swarm_idleanim_3.png", "/sprites/enemies/enemy_swarm_idleanim_4.png", "/sprites/enemies/enemy_swarm_idleanim_5.png", "/sprites/enemies/enemy_swarm_idleanim_6.png", "/sprites/enemies/enemy_swarm_idleanim_7.png", "/sprites/enemies/enemy_swarm_idleanim_8.png", "/sprites/enemies/enemy_swarm_idleanim_9.png", "/sprites/enemies/enemy_swarm_idleanim_10.png", "/sprites/enemies/enemy_swarm_idleanim_11.png", "/sprites/enemies/enemy_swarm_idleanim_12.png", "/sprites/enemies/enemy_swarm_idleanim_13.png", "/sprites/enemies/enemy_swarm_idleanim_14.png", "/sprites/enemies/enemy_swarm_idleanim_15.png", "/sprites/enemies/enemy_swarm_idleanim_16.png", "/sprites/enemies/enemy_swarm_idleanim_17.png", "/sprites/enemies/enemy_swarm_idleanim_18.png", "/sprites/enemies/enemy_swarm_idleanim_19.png", "/sprites/enemies/enemy_swarm_idleanim_20.png", "/sprites/enemies/enemy_swarm_idleanim_21.png", "/sprites/enemies/enemy_swarm_idleanim_22.png", "/sprites/enemies/enemy_swarm_idleanim_23.png", "/sprites/enemies/enemy_swarm_idleanim_24.png", "/sprites/enemies/enemy_swarm_idleanim_25.png", "/sprites/enemies/enemy_swarm_idleanim_26.png", "/sprites/enemies/enemy_swarm_idleanim_27.png", "/sprites/enemies/enemy_swarm_idleanim_28.png", "/sprites/enemies/enemy_swarm_idleanim_29.png", "/sprites/enemies/enemy_swarm_idleanim_30.png", "/sprites/enemies/enemy_swarm_idleanim_31.png", "/sprites/enemies/enemy_swarm_idleanim_32.png", "/sprites/enemies/enemy_swarm_idleanim_33.png", "/sprites/enemies/enemy_swarm_idleanim_34.png", "/sprites/enemies/enemy_swarm_idleanim_35.png", "/sprites/enemies/enemy_swarm_idleanim_36.png", "/sprites/enemies/enemy_swarm_idleanim_37.png", "/sprites/enemies/enemy_swarm_idleanim_38.png", "/sprites/enemies/enemy_swarm_idleanim_39.png"] },
  },
  sniper: {
    id: 'sniper',
    abilityLabel: 'Bruiser', // battle-style tag shown in (), like the units'
    displayName: 'Jackie Penguin',
    characterName: 'Dryad Ranger', // ジャッキー・ペン (Jackie Penguin) — a fast attacker
    role: 'sniper',
    threat: 14,
    rarity: ENEMY_RARITY.EPIC,
    money: 450,
    hp: 1300,
    damage: 80,
    attackSpeed: 37.5, // dps ~37.5 — interval 800ms (24F), split 35/65 below
    foreswingMs: 280,
    backswingMs: 520,
    moveSpeed: 51,
    // User request: much bigger, same target size as Dryad Mage and Daddy
    // Bear — see aoe's own comment.
    radius: 30,
    range: 22,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 14,
    knockbackType: 'normal',
    color: 0xff9933,
    label: 'J',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_sniper_idle.png", attack: "/sprites/enemies/enemy_sniper_attack.png", hit: "/sprites/enemies/enemy_sniper_hit.png", idleAnim: ["/sprites/enemies/enemy_sniper_idleanim_0.png", "/sprites/enemies/enemy_sniper_idleanim_1.png", "/sprites/enemies/enemy_sniper_idleanim_2.png", "/sprites/enemies/enemy_sniper_idleanim_3.png", "/sprites/enemies/enemy_sniper_idleanim_4.png", "/sprites/enemies/enemy_sniper_idleanim_5.png", "/sprites/enemies/enemy_sniper_idleanim_6.png", "/sprites/enemies/enemy_sniper_idleanim_7.png", "/sprites/enemies/enemy_sniper_idleanim_8.png", "/sprites/enemies/enemy_sniper_idleanim_9.png", "/sprites/enemies/enemy_sniper_idleanim_10.png", "/sprites/enemies/enemy_sniper_idleanim_11.png", "/sprites/enemies/enemy_sniper_idleanim_12.png", "/sprites/enemies/enemy_sniper_idleanim_13.png", "/sprites/enemies/enemy_sniper_idleanim_14.png", "/sprites/enemies/enemy_sniper_idleanim_15.png", "/sprites/enemies/enemy_sniper_idleanim_16.png", "/sprites/enemies/enemy_sniper_idleanim_17.png", "/sprites/enemies/enemy_sniper_idleanim_18.png", "/sprites/enemies/enemy_sniper_idleanim_19.png", "/sprites/enemies/enemy_sniper_idleanim_20.png", "/sprites/enemies/enemy_sniper_idleanim_21.png", "/sprites/enemies/enemy_sniper_idleanim_22.png", "/sprites/enemies/enemy_sniper_idleanim_23.png", "/sprites/enemies/enemy_sniper_idleanim_24.png", "/sprites/enemies/enemy_sniper_idleanim_25.png", "/sprites/enemies/enemy_sniper_idleanim_26.png", "/sprites/enemies/enemy_sniper_idleanim_27.png", "/sprites/enemies/enemy_sniper_idleanim_28.png", "/sprites/enemies/enemy_sniper_idleanim_29.png", "/sprites/enemies/enemy_sniper_idleanim_30.png", "/sprites/enemies/enemy_sniper_idleanim_31.png", "/sprites/enemies/enemy_sniper_idleanim_32.png", "/sprites/enemies/enemy_sniper_idleanim_33.png", "/sprites/enemies/enemy_sniper_idleanim_34.png", "/sprites/enemies/enemy_sniper_idleanim_35.png", "/sprites/enemies/enemy_sniper_idleanim_36.png", "/sprites/enemies/enemy_sniper_idleanim_37.png", "/sprites/enemies/enemy_sniper_idleanim_38.png", "/sprites/enemies/enemy_sniper_idleanim_39.png", "/sprites/enemies/enemy_sniper_idleanim_40.png", "/sprites/enemies/enemy_sniper_idleanim_41.png", "/sprites/enemies/enemy_sniper_idleanim_42.png", "/sprites/enemies/enemy_sniper_idleanim_43.png", "/sprites/enemies/enemy_sniper_idleanim_44.png", "/sprites/enemies/enemy_sniper_idleanim_45.png", "/sprites/enemies/enemy_sniper_idleanim_46.png", "/sprites/enemies/enemy_sniper_idleanim_47.png", "/sprites/enemies/enemy_sniper_idleanim_48.png", "/sprites/enemies/enemy_sniper_idleanim_49.png", "/sprites/enemies/enemy_sniper_idleanim_50.png", "/sprites/enemies/enemy_sniper_idleanim_51.png", "/sprites/enemies/enemy_sniper_idleanim_52.png", "/sprites/enemies/enemy_sniper_idleanim_53.png", "/sprites/enemies/enemy_sniper_idleanim_54.png", "/sprites/enemies/enemy_sniper_idleanim_55.png", "/sprites/enemies/enemy_sniper_idleanim_56.png", "/sprites/enemies/enemy_sniper_idleanim_57.png", "/sprites/enemies/enemy_sniper_idleanim_58.png", "/sprites/enemies/enemy_sniper_idleanim_59.png", "/sprites/enemies/enemy_sniper_idleanim_60.png", "/sprites/enemies/enemy_sniper_idleanim_61.png", "/sprites/enemies/enemy_sniper_idleanim_62.png", "/sprites/enemies/enemy_sniper_idleanim_63.png", "/sprites/enemies/enemy_sniper_idleanim_64.png", "/sprites/enemies/enemy_sniper_idleanim_65.png", "/sprites/enemies/enemy_sniper_idleanim_66.png", "/sprites/enemies/enemy_sniper_idleanim_67.png", "/sprites/enemies/enemy_sniper_idleanim_68.png", "/sprites/enemies/enemy_sniper_idleanim_69.png", "/sprites/enemies/enemy_sniper_idleanim_70.png", "/sprites/enemies/enemy_sniper_idleanim_71.png", "/sprites/enemies/enemy_sniper_idleanim_72.png", "/sprites/enemies/enemy_sniper_idleanim_73.png", "/sprites/enemies/enemy_sniper_idleanim_74.png", "/sprites/enemies/enemy_sniper_idleanim_75.png", "/sprites/enemies/enemy_sniper_idleanim_76.png", "/sprites/enemies/enemy_sniper_idleanim_77.png", "/sprites/enemies/enemy_sniper_idleanim_78.png", "/sprites/enemies/enemy_sniper_idleanim_79.png", "/sprites/enemies/enemy_sniper_idleanim_80.png", "/sprites/enemies/enemy_sniper_idleanim_81.png", "/sprites/enemies/enemy_sniper_idleanim_82.png", "/sprites/enemies/enemy_sniper_idleanim_83.png", "/sprites/enemies/enemy_sniper_idleanim_84.png", "/sprites/enemies/enemy_sniper_idleanim_85.png", "/sprites/enemies/enemy_sniper_idleanim_86.png", "/sprites/enemies/enemy_sniper_idleanim_87.png", "/sprites/enemies/enemy_sniper_idleanim_88.png", "/sprites/enemies/enemy_sniper_idleanim_89.png", "/sprites/enemies/enemy_sniper_idleanim_90.png", "/sprites/enemies/enemy_sniper_idleanim_91.png", "/sprites/enemies/enemy_sniper_idleanim_92.png", "/sprites/enemies/enemy_sniper_idleanim_93.png", "/sprites/enemies/enemy_sniper_idleanim_94.png", "/sprites/enemies/enemy_sniper_idleanim_95.png", "/sprites/enemies/enemy_sniper_idleanim_96.png", "/sprites/enemies/enemy_sniper_idleanim_97.png", "/sprites/enemies/enemy_sniper_idleanim_98.png", "/sprites/enemies/enemy_sniper_idleanim_99.png", "/sprites/enemies/enemy_sniper_idleanim_100.png", "/sprites/enemies/enemy_sniper_idleanim_101.png", "/sprites/enemies/enemy_sniper_idleanim_102.png", "/sprites/enemies/enemy_sniper_idleanim_103.png", "/sprites/enemies/enemy_sniper_idleanim_104.png", "/sprites/enemies/enemy_sniper_idleanim_105.png", "/sprites/enemies/enemy_sniper_idleanim_106.png", "/sprites/enemies/enemy_sniper_idleanim_107.png", "/sprites/enemies/enemy_sniper_idleanim_108.png", "/sprites/enemies/enemy_sniper_idleanim_109.png", "/sprites/enemies/enemy_sniper_idleanim_110.png", "/sprites/enemies/enemy_sniper_idleanim_111.png", "/sprites/enemies/enemy_sniper_idleanim_112.png", "/sprites/enemies/enemy_sniper_idleanim_113.png", "/sprites/enemies/enemy_sniper_idleanim_114.png", "/sprites/enemies/enemy_sniper_idleanim_115.png", "/sprites/enemies/enemy_sniper_idleanim_116.png", "/sprites/enemies/enemy_sniper_idleanim_117.png", "/sprites/enemies/enemy_sniper_idleanim_118.png", "/sprites/enemies/enemy_sniper_idleanim_119.png", "/sprites/enemies/enemy_sniper_idleanim_120.png", "/sprites/enemies/enemy_sniper_idleanim_121.png", "/sprites/enemies/enemy_sniper_idleanim_122.png", "/sprites/enemies/enemy_sniper_idleanim_123.png", "/sprites/enemies/enemy_sniper_idleanim_124.png", "/sprites/enemies/enemy_sniper_idleanim_125.png", "/sprites/enemies/enemy_sniper_idleanim_126.png", "/sprites/enemies/enemy_sniper_idleanim_127.png"] },
  },
  guardian: {
    id: 'guardian',
    abilityLabel: 'Siege Tree', // battle-style tag shown in (), like the units'
    displayName: 'Kuma-sensei',
    characterName: 'Flowering Treant', // クマ先生 (Kuma-sensei) — long range, KB10
    role: 'guardian',
    threat: 18,
    rarity: ENEMY_RARITY.EPIC,
    money: 2000,
    hp: 3000,
    damage: 1000,
    attackSpeed: 8.4, // dps ~280.7 — interval 3567ms (107F), split 35/65 below
    foreswingMs: 1248,
    backswingMs: 2319,
    moveSpeed: 27,
    radius: 24,
    range: 51,
    rechargeMs: 0,
    knockbackCount: 10,
    knockbackDistance: 8,
    knockbackType: 'normal',
    color: 0x996633,
    label: 'K',
    special: { type: 'aoe', radius: 45 },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_guardian_idle.png", attack: "/sprites/enemies/enemy_guardian_attack.png", hit: "/sprites/enemies/enemy_guardian_hit.png", run: ["/sprites/enemies/enemy_guardian_run_0.png", "/sprites/enemies/enemy_guardian_run_1.png", "/sprites/enemies/enemy_guardian_run_2.png", "/sprites/enemies/enemy_guardian_run_3.png", "/sprites/enemies/enemy_guardian_run_4.png", "/sprites/enemies/enemy_guardian_run_5.png", "/sprites/enemies/enemy_guardian_run_6.png", "/sprites/enemies/enemy_guardian_run_7.png", "/sprites/enemies/enemy_guardian_run_8.png", "/sprites/enemies/enemy_guardian_run_9.png", "/sprites/enemies/enemy_guardian_run_10.png", "/sprites/enemies/enemy_guardian_run_11.png", "/sprites/enemies/enemy_guardian_run_12.png", "/sprites/enemies/enemy_guardian_run_13.png", "/sprites/enemies/enemy_guardian_run_14.png", "/sprites/enemies/enemy_guardian_run_15.png"], idleAnim: ["/sprites/enemies/enemy_guardian_idleanim_0.png", "/sprites/enemies/enemy_guardian_idleanim_1.png", "/sprites/enemies/enemy_guardian_idleanim_2.png", "/sprites/enemies/enemy_guardian_idleanim_3.png", "/sprites/enemies/enemy_guardian_idleanim_4.png", "/sprites/enemies/enemy_guardian_idleanim_5.png", "/sprites/enemies/enemy_guardian_idleanim_6.png", "/sprites/enemies/enemy_guardian_idleanim_7.png", "/sprites/enemies/enemy_guardian_idleanim_8.png", "/sprites/enemies/enemy_guardian_idleanim_9.png", "/sprites/enemies/enemy_guardian_idleanim_10.png", "/sprites/enemies/enemy_guardian_idleanim_11.png", "/sprites/enemies/enemy_guardian_idleanim_12.png", "/sprites/enemies/enemy_guardian_idleanim_13.png", "/sprites/enemies/enemy_guardian_idleanim_14.png", "/sprites/enemies/enemy_guardian_idleanim_15.png", "/sprites/enemies/enemy_guardian_idleanim_16.png", "/sprites/enemies/enemy_guardian_idleanim_17.png", "/sprites/enemies/enemy_guardian_idleanim_18.png", "/sprites/enemies/enemy_guardian_idleanim_19.png", "/sprites/enemies/enemy_guardian_idleanim_20.png", "/sprites/enemies/enemy_guardian_idleanim_21.png", "/sprites/enemies/enemy_guardian_idleanim_22.png", "/sprites/enemies/enemy_guardian_idleanim_23.png", "/sprites/enemies/enemy_guardian_idleanim_24.png", "/sprites/enemies/enemy_guardian_idleanim_25.png", "/sprites/enemies/enemy_guardian_idleanim_26.png", "/sprites/enemies/enemy_guardian_idleanim_27.png", "/sprites/enemies/enemy_guardian_idleanim_28.png", "/sprites/enemies/enemy_guardian_idleanim_29.png", "/sprites/enemies/enemy_guardian_idleanim_30.png", "/sprites/enemies/enemy_guardian_idleanim_31.png", "/sprites/enemies/enemy_guardian_idleanim_32.png", "/sprites/enemies/enemy_guardian_idleanim_33.png", "/sprites/enemies/enemy_guardian_idleanim_34.png", "/sprites/enemies/enemy_guardian_idleanim_35.png", "/sprites/enemies/enemy_guardian_idleanim_36.png", "/sprites/enemies/enemy_guardian_idleanim_37.png", "/sprites/enemies/enemy_guardian_idleanim_38.png", "/sprites/enemies/enemy_guardian_idleanim_39.png"] },
  },
  support: {
    id: 'support',
    abilityLabel: 'Red Splasher', // battle-style tag shown in (), like the units'
    displayName: 'Gomasama',
    characterName: 'Aquatic Flowering Slime', // ゴマさま (Gomasama) — fast Red area attacker
    role: 'support',
    threat: 16,
    rarity: ENEMY_RARITY.EPIC,
    money: 650,
    hp: 2500,
    damage: 150,
    attackSpeed: 39.1, // dps ~195.7 — interval 767ms (23F), split 35/65 below
    foreswingMs: 268,
    backswingMs: 499,
    moveSpeed: 47,
    radius: 14,
    range: 25,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xcc6666,
    label: 'Go',
    special: { type: 'aoe', radius: 35 },
    critChance: 0,
    attribute: 'red',
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_support_idle.png", attack: "/sprites/enemies/enemy_support_attack.png", hit: "/sprites/enemies/enemy_support_hit.png", run: ["/sprites/enemies/enemy_support_run_0.png", "/sprites/enemies/enemy_support_run_1.png", "/sprites/enemies/enemy_support_run_2.png", "/sprites/enemies/enemy_support_run_3.png", "/sprites/enemies/enemy_support_run_4.png", "/sprites/enemies/enemy_support_run_5.png", "/sprites/enemies/enemy_support_run_6.png", "/sprites/enemies/enemy_support_run_7.png", "/sprites/enemies/enemy_support_run_8.png", "/sprites/enemies/enemy_support_run_9.png", "/sprites/enemies/enemy_support_run_10.png", "/sprites/enemies/enemy_support_run_11.png", "/sprites/enemies/enemy_support_run_12.png"], idleAnim: ["/sprites/enemies/enemy_support_idleanim_0.png", "/sprites/enemies/enemy_support_idleanim_1.png", "/sprites/enemies/enemy_support_idleanim_2.png", "/sprites/enemies/enemy_support_idleanim_3.png", "/sprites/enemies/enemy_support_idleanim_4.png", "/sprites/enemies/enemy_support_idleanim_5.png", "/sprites/enemies/enemy_support_idleanim_6.png", "/sprites/enemies/enemy_support_idleanim_7.png", "/sprites/enemies/enemy_support_idleanim_8.png", "/sprites/enemies/enemy_support_idleanim_9.png", "/sprites/enemies/enemy_support_idleanim_10.png", "/sprites/enemies/enemy_support_idleanim_11.png", "/sprites/enemies/enemy_support_idleanim_12.png", "/sprites/enemies/enemy_support_idleanim_13.png", "/sprites/enemies/enemy_support_idleanim_14.png", "/sprites/enemies/enemy_support_idleanim_15.png", "/sprites/enemies/enemy_support_idleanim_16.png", "/sprites/enemies/enemy_support_idleanim_17.png", "/sprites/enemies/enemy_support_idleanim_18.png", "/sprites/enemies/enemy_support_idleanim_19.png", "/sprites/enemies/enemy_support_idleanim_20.png", "/sprites/enemies/enemy_support_idleanim_21.png", "/sprites/enemies/enemy_support_idleanim_22.png", "/sprites/enemies/enemy_support_idleanim_23.png", "/sprites/enemies/enemy_support_idleanim_24.png", "/sprites/enemies/enemy_support_idleanim_25.png", "/sprites/enemies/enemy_support_idleanim_26.png", "/sprites/enemies/enemy_support_idleanim_27.png", "/sprites/enemies/enemy_support_idleanim_28.png", "/sprites/enemies/enemy_support_idleanim_29.png", "/sprites/enemies/enemy_support_idleanim_30.png", "/sprites/enemies/enemy_support_idleanim_31.png", "/sprites/enemies/enemy_support_idleanim_32.png", "/sprites/enemies/enemy_support_idleanim_33.png", "/sprites/enemies/enemy_support_idleanim_34.png", "/sprites/enemies/enemy_support_idleanim_35.png", "/sprites/enemies/enemy_support_idleanim_36.png", "/sprites/enemies/enemy_support_idleanim_37.png"] },
  },
  // Corrected against the user's updated guide (its real per-stage
  // Chapter 1 boss table): 悪の帝王ニャンダム (Emperor Nyandam) never
  // actually appears as one of the 48 real stage bosses — カオル君
  // (Kaoru-kun) is the REAL stage-48/西表島 final boss, so this slot
  // (kept as 'titan' — the same "biggest, scariest enemy" identity,
  // still fits) now holds his real data instead.
  titan: {
    id: 'titan',
    abilityLabel: 'Elite Brute', // battle-style tag shown in (), like the units'
    displayName: 'Kaoru-kun',
    characterName: 'Daddy Bear', // カオル君 (Kaoru-kun) — the real Empire of Cats Chapter 1 final boss (stage 48, 西表島)
    role: 'titan',
    threat: 80,
    rarity: ENEMY_RARITY.LEGENDARY,
    money: 4000,
    // 99999 here (and the matching stage48/96/144 enemyBaseHp) was an
    // unreviewed placeholder — the only stat on this whole enemy with no
    // "// real ..." citation, and a 6-25x outlier against every other
    // LEGENDARY-rarity boss (kangaroo 4000, gagagaga 5000, ikkaku 15000,
    // all threat 35-45 vs this one's 80). Retuned to continue that same
    // threat/hp curve as the true chapter-final boss, still scaled by the
    // existing per-saga statMultiplier (1x/1.5x/4x) like every other enemy.
    hp: 40000,
    damage: 2000,
    attackSpeed: 3.3, // dps ~106.9 — interval 9100ms (273F), split 35/65 below
    foreswingMs: 3185,
    backswingMs: 5915,
    moveSpeed: 17,
    // User request: same target size as Dryad Mage/Dryad Ranger (was 32) —
    // see aoe's own comment. Range left untouched at its own real reach.
    radius: 30,
    range: 49,
    rechargeMs: 0,
    knockbackCount: 2,
    knockbackDistance: 6,
    knockbackType: 'normal',
    color: 0x992222,
    label: 'Ka',
    special: { type: 'aoe', radius: 55 },
    critChance: 0,
    attribute: 'floating',
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_titan_idle.png", attack: "/sprites/enemies/enemy_titan_attack.png", hit: "/sprites/enemies/enemy_titan_hit.png", run: ["/sprites/enemies/enemy_titan_run_0.png", "/sprites/enemies/enemy_titan_run_1.png", "/sprites/enemies/enemy_titan_run_2.png", "/sprites/enemies/enemy_titan_run_3.png", "/sprites/enemies/enemy_titan_run_4.png", "/sprites/enemies/enemy_titan_run_5.png", "/sprites/enemies/enemy_titan_run_6.png", "/sprites/enemies/enemy_titan_run_7.png", "/sprites/enemies/enemy_titan_run_8.png", "/sprites/enemies/enemy_titan_run_9.png", "/sprites/enemies/enemy_titan_run_10.png", "/sprites/enemies/enemy_titan_run_11.png", "/sprites/enemies/enemy_titan_run_12.png", "/sprites/enemies/enemy_titan_run_13.png", "/sprites/enemies/enemy_titan_run_14.png", "/sprites/enemies/enemy_titan_run_15.png", "/sprites/enemies/enemy_titan_run_16.png", "/sprites/enemies/enemy_titan_run_17.png", "/sprites/enemies/enemy_titan_run_18.png", "/sprites/enemies/enemy_titan_run_19.png", "/sprites/enemies/enemy_titan_run_20.png", "/sprites/enemies/enemy_titan_run_21.png", "/sprites/enemies/enemy_titan_run_22.png", "/sprites/enemies/enemy_titan_run_23.png", "/sprites/enemies/enemy_titan_run_24.png", "/sprites/enemies/enemy_titan_run_25.png", "/sprites/enemies/enemy_titan_run_26.png", "/sprites/enemies/enemy_titan_run_27.png", "/sprites/enemies/enemy_titan_run_28.png", "/sprites/enemies/enemy_titan_run_29.png", "/sprites/enemies/enemy_titan_run_30.png", "/sprites/enemies/enemy_titan_run_31.png", "/sprites/enemies/enemy_titan_run_32.png", "/sprites/enemies/enemy_titan_run_33.png"], idleAnim: ["/sprites/enemies/enemy_titan_idleanim_0.png", "/sprites/enemies/enemy_titan_idleanim_1.png", "/sprites/enemies/enemy_titan_idleanim_2.png", "/sprites/enemies/enemy_titan_idleanim_3.png", "/sprites/enemies/enemy_titan_idleanim_4.png", "/sprites/enemies/enemy_titan_idleanim_5.png", "/sprites/enemies/enemy_titan_idleanim_6.png", "/sprites/enemies/enemy_titan_idleanim_7.png", "/sprites/enemies/enemy_titan_idleanim_8.png", "/sprites/enemies/enemy_titan_idleanim_9.png", "/sprites/enemies/enemy_titan_idleanim_10.png", "/sprites/enemies/enemy_titan_idleanim_11.png", "/sprites/enemies/enemy_titan_idleanim_12.png", "/sprites/enemies/enemy_titan_idleanim_13.png", "/sprites/enemies/enemy_titan_idleanim_14.png", "/sprites/enemies/enemy_titan_idleanim_15.png", "/sprites/enemies/enemy_titan_idleanim_16.png", "/sprites/enemies/enemy_titan_idleanim_17.png", "/sprites/enemies/enemy_titan_idleanim_18.png", "/sprites/enemies/enemy_titan_idleanim_19.png", "/sprites/enemies/enemy_titan_idleanim_20.png", "/sprites/enemies/enemy_titan_idleanim_21.png", "/sprites/enemies/enemy_titan_idleanim_22.png", "/sprites/enemies/enemy_titan_idleanim_23.png", "/sprites/enemies/enemy_titan_idleanim_24.png", "/sprites/enemies/enemy_titan_idleanim_25.png", "/sprites/enemies/enemy_titan_idleanim_26.png", "/sprites/enemies/enemy_titan_idleanim_27.png", "/sprites/enemies/enemy_titan_idleanim_28.png", "/sprites/enemies/enemy_titan_idleanim_29.png", "/sprites/enemies/enemy_titan_idleanim_30.png", "/sprites/enemies/enemy_titan_idleanim_31.png", "/sprites/enemies/enemy_titan_idleanim_32.png", "/sprites/enemies/enemy_titan_idleanim_33.png", "/sprites/enemies/enemy_titan_idleanim_34.png", "/sprites/enemies/enemy_titan_idleanim_35.png", "/sprites/enemies/enemy_titan_idleanim_36.png", "/sprites/enemies/enemy_titan_idleanim_37.png", "/sprites/enemies/enemy_titan_idleanim_38.png", "/sprites/enemies/enemy_titan_idleanim_39.png", "/sprites/enemies/enemy_titan_idleanim_40.png", "/sprites/enemies/enemy_titan_idleanim_41.png", "/sprites/enemies/enemy_titan_idleanim_42.png", "/sprites/enemies/enemy_titan_idleanim_43.png", "/sprites/enemies/enemy_titan_idleanim_44.png", "/sprites/enemies/enemy_titan_idleanim_45.png", "/sprites/enemies/enemy_titan_idleanim_46.png", "/sprites/enemies/enemy_titan_idleanim_47.png", "/sprites/enemies/enemy_titan_idleanim_48.png", "/sprites/enemies/enemy_titan_idleanim_49.png", "/sprites/enemies/enemy_titan_idleanim_50.png", "/sprites/enemies/enemy_titan_idleanim_51.png", "/sprites/enemies/enemy_titan_idleanim_52.png", "/sprites/enemies/enemy_titan_idleanim_53.png", "/sprites/enemies/enemy_titan_idleanim_54.png", "/sprites/enemies/enemy_titan_idleanim_55.png", "/sprites/enemies/enemy_titan_idleanim_56.png", "/sprites/enemies/enemy_titan_idleanim_57.png", "/sprites/enemies/enemy_titan_idleanim_58.png", "/sprites/enemies/enemy_titan_idleanim_59.png", "/sprites/enemies/enemy_titan_idleanim_60.png", "/sprites/enemies/enemy_titan_idleanim_61.png", "/sprites/enemies/enemy_titan_idleanim_62.png", "/sprites/enemies/enemy_titan_idleanim_63.png", "/sprites/enemies/enemy_titan_idleanim_64.png", "/sprites/enemies/enemy_titan_idleanim_65.png", "/sprites/enemies/enemy_titan_idleanim_66.png", "/sprites/enemies/enemy_titan_idleanim_67.png", "/sprites/enemies/enemy_titan_idleanim_68.png", "/sprites/enemies/enemy_titan_idleanim_69.png", "/sprites/enemies/enemy_titan_idleanim_70.png", "/sprites/enemies/enemy_titan_idleanim_71.png", "/sprites/enemies/enemy_titan_idleanim_72.png", "/sprites/enemies/enemy_titan_idleanim_73.png", "/sprites/enemies/enemy_titan_idleanim_74.png", "/sprites/enemies/enemy_titan_idleanim_75.png", "/sprites/enemies/enemy_titan_idleanim_76.png"] },
  },
  thatguy: {
    id: 'thatguy',
    abilityLabel: 'Grunt', // battle-style tag shown in (), like the units'
    displayName: 'That Guy',
    characterName: 'Flower Slime', // 例のヤツ (That Guy) — real early stage filler, KB1
    role: 'thatguy',
    threat: 5,
    rarity: ENEMY_RARITY.COMMON,
    money: 75,
    hp: 200,
    damage: 20,
    attackSpeed: 20, // dps 20 — interval 1000ms (30F), split 35/65 below
    foreswingMs: 350,
    backswingMs: 650,
    moveSpeed: 47,
    radius: 14,
    range: 16,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0x996633,
    label: 'Th',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_thatguy_idle.png", attack: "/sprites/enemies/enemy_thatguy_attack.png", hit: "/sprites/enemies/enemy_thatguy_hit.png", run: ["/sprites/enemies/enemy_thatguy_run_0.png", "/sprites/enemies/enemy_thatguy_run_1.png", "/sprites/enemies/enemy_thatguy_run_2.png", "/sprites/enemies/enemy_thatguy_run_3.png", "/sprites/enemies/enemy_thatguy_run_4.png", "/sprites/enemies/enemy_thatguy_run_5.png", "/sprites/enemies/enemy_thatguy_run_6.png", "/sprites/enemies/enemy_thatguy_run_7.png", "/sprites/enemies/enemy_thatguy_run_8.png", "/sprites/enemies/enemy_thatguy_run_9.png", "/sprites/enemies/enemy_thatguy_run_10.png", "/sprites/enemies/enemy_thatguy_run_11.png", "/sprites/enemies/enemy_thatguy_run_12.png", "/sprites/enemies/enemy_thatguy_run_13.png", "/sprites/enemies/enemy_thatguy_run_14.png", "/sprites/enemies/enemy_thatguy_run_15.png"], idleAnim: ["/sprites/enemies/enemy_thatguy_idleanim_0.png", "/sprites/enemies/enemy_thatguy_idleanim_1.png", "/sprites/enemies/enemy_thatguy_idleanim_2.png", "/sprites/enemies/enemy_thatguy_idleanim_3.png", "/sprites/enemies/enemy_thatguy_idleanim_4.png", "/sprites/enemies/enemy_thatguy_idleanim_5.png", "/sprites/enemies/enemy_thatguy_idleanim_6.png", "/sprites/enemies/enemy_thatguy_idleanim_7.png", "/sprites/enemies/enemy_thatguy_idleanim_8.png", "/sprites/enemies/enemy_thatguy_idleanim_9.png", "/sprites/enemies/enemy_thatguy_idleanim_10.png", "/sprites/enemies/enemy_thatguy_idleanim_11.png", "/sprites/enemies/enemy_thatguy_idleanim_12.png", "/sprites/enemies/enemy_thatguy_idleanim_13.png", "/sprites/enemies/enemy_thatguy_idleanim_14.png", "/sprites/enemies/enemy_thatguy_idleanim_15.png", "/sprites/enemies/enemy_thatguy_idleanim_16.png", "/sprites/enemies/enemy_thatguy_idleanim_17.png", "/sprites/enemies/enemy_thatguy_idleanim_18.png", "/sprites/enemies/enemy_thatguy_idleanim_19.png", "/sprites/enemies/enemy_thatguy_idleanim_20.png", "/sprites/enemies/enemy_thatguy_idleanim_21.png", "/sprites/enemies/enemy_thatguy_idleanim_22.png", "/sprites/enemies/enemy_thatguy_idleanim_23.png", "/sprites/enemies/enemy_thatguy_idleanim_24.png", "/sprites/enemies/enemy_thatguy_idleanim_25.png", "/sprites/enemies/enemy_thatguy_idleanim_26.png", "/sprites/enemies/enemy_thatguy_idleanim_27.png", "/sprites/enemies/enemy_thatguy_idleanim_28.png", "/sprites/enemies/enemy_thatguy_idleanim_29.png", "/sprites/enemies/enemy_thatguy_idleanim_30.png", "/sprites/enemies/enemy_thatguy_idleanim_31.png", "/sprites/enemies/enemy_thatguy_idleanim_32.png", "/sprites/enemies/enemy_thatguy_idleanim_33.png", "/sprites/enemies/enemy_thatguy_idleanim_34.png", "/sprites/enemies/enemy_thatguy_idleanim_35.png", "/sprites/enemies/enemy_thatguy_idleanim_36.png", "/sprites/enemies/enemy_thatguy_idleanim_37.png", "/sprites/enemies/enemy_thatguy_idleanim_38.png", "/sprites/enemies/enemy_thatguy_idleanim_39.png"] },
  },
  gory: {
    id: 'gory',
    abilityLabel: 'Pack Leader', // battle-style tag shown in (), like the units'
    displayName: 'Gory',
    characterName: 'Alpha Wolf', // ゴリさん (Gory) — real stage-16 boss, fast AoE
    role: 'gory',
    threat: 16,
    rarity: ENEMY_RARITY.EPIC,
    money: 550,
    hp: 1000,
    damage: 80,
    attackSpeed: 45, // dps 45 — interval 533ms (16F), split 35/65 below
    foreswingMs: 187,
    backswingMs: 346,
    moveSpeed: 64,
    radius: 18,
    range: 22,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0x669933,
    label: 'Go',
    special: { type: 'aoe', radius: 35 },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_gory_idle.png", attack: "/sprites/enemies/enemy_gory_attack.png", hit: "/sprites/enemies/enemy_gory_hit.png", run: ["/sprites/enemies/enemy_gory_run_0.png", "/sprites/enemies/enemy_gory_run_1.png", "/sprites/enemies/enemy_gory_run_2.png", "/sprites/enemies/enemy_gory_run_3.png", "/sprites/enemies/enemy_gory_run_4.png", "/sprites/enemies/enemy_gory_run_5.png", "/sprites/enemies/enemy_gory_run_6.png", "/sprites/enemies/enemy_gory_run_7.png", "/sprites/enemies/enemy_gory_run_8.png", "/sprites/enemies/enemy_gory_run_9.png", "/sprites/enemies/enemy_gory_run_10.png", "/sprites/enemies/enemy_gory_run_11.png", "/sprites/enemies/enemy_gory_run_12.png", "/sprites/enemies/enemy_gory_run_13.png", "/sprites/enemies/enemy_gory_run_14.png", "/sprites/enemies/enemy_gory_run_15.png", "/sprites/enemies/enemy_gory_run_16.png", "/sprites/enemies/enemy_gory_run_17.png", "/sprites/enemies/enemy_gory_run_18.png", "/sprites/enemies/enemy_gory_run_19.png"], idleAnim: ["/sprites/enemies/enemy_gory_idleanim_0.png", "/sprites/enemies/enemy_gory_idleanim_1.png", "/sprites/enemies/enemy_gory_idleanim_2.png", "/sprites/enemies/enemy_gory_idleanim_3.png", "/sprites/enemies/enemy_gory_idleanim_4.png", "/sprites/enemies/enemy_gory_idleanim_5.png", "/sprites/enemies/enemy_gory_idleanim_6.png", "/sprites/enemies/enemy_gory_idleanim_7.png", "/sprites/enemies/enemy_gory_idleanim_8.png", "/sprites/enemies/enemy_gory_idleanim_9.png", "/sprites/enemies/enemy_gory_idleanim_10.png", "/sprites/enemies/enemy_gory_idleanim_11.png", "/sprites/enemies/enemy_gory_idleanim_12.png", "/sprites/enemies/enemy_gory_idleanim_13.png", "/sprites/enemies/enemy_gory_idleanim_14.png", "/sprites/enemies/enemy_gory_idleanim_15.png", "/sprites/enemies/enemy_gory_idleanim_16.png", "/sprites/enemies/enemy_gory_idleanim_17.png", "/sprites/enemies/enemy_gory_idleanim_18.png", "/sprites/enemies/enemy_gory_idleanim_19.png", "/sprites/enemies/enemy_gory_idleanim_20.png", "/sprites/enemies/enemy_gory_idleanim_21.png", "/sprites/enemies/enemy_gory_idleanim_22.png", "/sprites/enemies/enemy_gory_idleanim_23.png", "/sprites/enemies/enemy_gory_idleanim_24.png", "/sprites/enemies/enemy_gory_idleanim_25.png", "/sprites/enemies/enemy_gory_idleanim_26.png", "/sprites/enemies/enemy_gory_idleanim_27.png", "/sprites/enemies/enemy_gory_idleanim_28.png", "/sprites/enemies/enemy_gory_idleanim_29.png", "/sprites/enemies/enemy_gory_idleanim_30.png", "/sprites/enemies/enemy_gory_idleanim_31.png", "/sprites/enemies/enemy_gory_idleanim_32.png", "/sprites/enemies/enemy_gory_idleanim_33.png", "/sprites/enemies/enemy_gory_idleanim_34.png", "/sprites/enemies/enemy_gory_idleanim_35.png", "/sprites/enemies/enemy_gory_idleanim_36.png", "/sprites/enemies/enemy_gory_idleanim_37.png", "/sprites/enemies/enemy_gory_idleanim_38.png", "/sprites/enemies/enemy_gory_idleanim_39.png", "/sprites/enemies/enemy_gory_idleanim_40.png", "/sprites/enemies/enemy_gory_idleanim_41.png", "/sprites/enemies/enemy_gory_idleanim_42.png", "/sprites/enemies/enemy_gory_idleanim_43.png", "/sprites/enemies/enemy_gory_idleanim_44.png"] },
  },
  mehmeh: {
    id: 'mehmeh',
    abilityLabel: 'Tough Fry', // battle-style tag shown in (), like the units'
    displayName: 'Meh Meh',
    characterName: 'Big Bubble Slime', // メェメェ (Meh Meh) — plain early filler
    role: 'mehmeh',
    threat: 8,
    rarity: ENEMY_RARITY.RARE,
    money: 150,
    hp: 500,
    damage: 50,
    attackSpeed: 17, // dps 17 — interval 1767ms (53F), split 35/65 below
    foreswingMs: 618,
    backswingMs: 1149,
    moveSpeed: 37,
    radius: 15,
    range: 16,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xaaaaaa,
    label: 'Me',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_mehmeh_idle.png", attack: "/sprites/enemies/enemy_mehmeh_attack.png", hit: "/sprites/enemies/enemy_mehmeh_hit.png", run: ["/sprites/enemies/enemy_mehmeh_run_0.png", "/sprites/enemies/enemy_mehmeh_run_1.png", "/sprites/enemies/enemy_mehmeh_run_2.png", "/sprites/enemies/enemy_mehmeh_run_3.png", "/sprites/enemies/enemy_mehmeh_run_4.png", "/sprites/enemies/enemy_mehmeh_run_5.png", "/sprites/enemies/enemy_mehmeh_run_6.png", "/sprites/enemies/enemy_mehmeh_run_7.png", "/sprites/enemies/enemy_mehmeh_run_8.png", "/sprites/enemies/enemy_mehmeh_run_9.png", "/sprites/enemies/enemy_mehmeh_run_10.png", "/sprites/enemies/enemy_mehmeh_run_11.png", "/sprites/enemies/enemy_mehmeh_run_12.png", "/sprites/enemies/enemy_mehmeh_run_13.png", "/sprites/enemies/enemy_mehmeh_run_14.png", "/sprites/enemies/enemy_mehmeh_run_15.png", "/sprites/enemies/enemy_mehmeh_run_16.png", "/sprites/enemies/enemy_mehmeh_run_17.png", "/sprites/enemies/enemy_mehmeh_run_18.png", "/sprites/enemies/enemy_mehmeh_run_19.png"], idleAnim: ["/sprites/enemies/enemy_mehmeh_idleanim_0.png", "/sprites/enemies/enemy_mehmeh_idleanim_1.png", "/sprites/enemies/enemy_mehmeh_idleanim_2.png", "/sprites/enemies/enemy_mehmeh_idleanim_3.png", "/sprites/enemies/enemy_mehmeh_idleanim_4.png", "/sprites/enemies/enemy_mehmeh_idleanim_5.png", "/sprites/enemies/enemy_mehmeh_idleanim_6.png", "/sprites/enemies/enemy_mehmeh_idleanim_7.png", "/sprites/enemies/enemy_mehmeh_idleanim_8.png", "/sprites/enemies/enemy_mehmeh_idleanim_9.png", "/sprites/enemies/enemy_mehmeh_idleanim_10.png", "/sprites/enemies/enemy_mehmeh_idleanim_11.png", "/sprites/enemies/enemy_mehmeh_idleanim_12.png", "/sprites/enemies/enemy_mehmeh_idleanim_13.png", "/sprites/enemies/enemy_mehmeh_idleanim_14.png", "/sprites/enemies/enemy_mehmeh_idleanim_15.png", "/sprites/enemies/enemy_mehmeh_idleanim_16.png", "/sprites/enemies/enemy_mehmeh_idleanim_17.png", "/sprites/enemies/enemy_mehmeh_idleanim_18.png", "/sprites/enemies/enemy_mehmeh_idleanim_19.png", "/sprites/enemies/enemy_mehmeh_idleanim_20.png", "/sprites/enemies/enemy_mehmeh_idleanim_21.png", "/sprites/enemies/enemy_mehmeh_idleanim_22.png", "/sprites/enemies/enemy_mehmeh_idleanim_23.png", "/sprites/enemies/enemy_mehmeh_idleanim_24.png", "/sprites/enemies/enemy_mehmeh_idleanim_25.png", "/sprites/enemies/enemy_mehmeh_idleanim_26.png", "/sprites/enemies/enemy_mehmeh_idleanim_27.png", "/sprites/enemies/enemy_mehmeh_idleanim_28.png", "/sprites/enemies/enemy_mehmeh_idleanim_29.png", "/sprites/enemies/enemy_mehmeh_idleanim_30.png", "/sprites/enemies/enemy_mehmeh_idleanim_31.png", "/sprites/enemies/enemy_mehmeh_idleanim_32.png", "/sprites/enemies/enemy_mehmeh_idleanim_33.png", "/sprites/enemies/enemy_mehmeh_idleanim_34.png", "/sprites/enemies/enemy_mehmeh_idleanim_35.png", "/sprites/enemies/enemy_mehmeh_idleanim_36.png", "/sprites/enemies/enemy_mehmeh_idleanim_37.png", "/sprites/enemies/enemy_mehmeh_idleanim_38.png", "/sprites/enemies/enemy_mehmeh_idleanim_39.png"] },
  },
  wanikun: {
    id: 'wanikun',
    abilityLabel: 'Pup Rusher', // battle-style tag shown in (), like the units'
    displayName: 'Wanikun',
    characterName: 'Tide Lurker', // ワニック (Wanikun) — weak but fast filler
    role: 'wanikun',
    threat: 3,
    rarity: ENEMY_RARITY.COMMON,
    money: 50,
    hp: 70,
    damage: 30,
    attackSpeed: 50, // dps 50 — interval 600ms (18F), split 35/65 below
    foreswingMs: 210,
    backswingMs: 390,
    moveSpeed: 61,
    radius: 11,
    range: 16,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0x669966,
    label: 'Wa',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_wanikun_idle.png", attack: "/sprites/enemies/enemy_wanikun_attack.png", hit: "/sprites/enemies/enemy_wanikun_hit.png", run: ["/sprites/enemies/enemy_wanikun_run_0.png", "/sprites/enemies/enemy_wanikun_run_1.png", "/sprites/enemies/enemy_wanikun_run_2.png", "/sprites/enemies/enemy_wanikun_run_3.png", "/sprites/enemies/enemy_wanikun_run_4.png", "/sprites/enemies/enemy_wanikun_run_5.png", "/sprites/enemies/enemy_wanikun_run_6.png", "/sprites/enemies/enemy_wanikun_run_7.png", "/sprites/enemies/enemy_wanikun_run_8.png", "/sprites/enemies/enemy_wanikun_run_9.png", "/sprites/enemies/enemy_wanikun_run_10.png", "/sprites/enemies/enemy_wanikun_run_11.png", "/sprites/enemies/enemy_wanikun_run_12.png", "/sprites/enemies/enemy_wanikun_run_13.png", "/sprites/enemies/enemy_wanikun_run_14.png", "/sprites/enemies/enemy_wanikun_run_15.png", "/sprites/enemies/enemy_wanikun_run_16.png", "/sprites/enemies/enemy_wanikun_run_17.png", "/sprites/enemies/enemy_wanikun_run_18.png", "/sprites/enemies/enemy_wanikun_run_19.png", "/sprites/enemies/enemy_wanikun_run_20.png", "/sprites/enemies/enemy_wanikun_run_21.png", "/sprites/enemies/enemy_wanikun_run_22.png", "/sprites/enemies/enemy_wanikun_run_23.png", "/sprites/enemies/enemy_wanikun_run_24.png", "/sprites/enemies/enemy_wanikun_run_25.png", "/sprites/enemies/enemy_wanikun_run_26.png", "/sprites/enemies/enemy_wanikun_run_27.png", "/sprites/enemies/enemy_wanikun_run_28.png", "/sprites/enemies/enemy_wanikun_run_29.png", "/sprites/enemies/enemy_wanikun_run_30.png", "/sprites/enemies/enemy_wanikun_run_31.png"], idleAnim: ["/sprites/enemies/enemy_wanikun_idleanim_0.png", "/sprites/enemies/enemy_wanikun_idleanim_1.png", "/sprites/enemies/enemy_wanikun_idleanim_2.png", "/sprites/enemies/enemy_wanikun_idleanim_3.png", "/sprites/enemies/enemy_wanikun_idleanim_4.png", "/sprites/enemies/enemy_wanikun_idleanim_5.png", "/sprites/enemies/enemy_wanikun_idleanim_6.png", "/sprites/enemies/enemy_wanikun_idleanim_7.png", "/sprites/enemies/enemy_wanikun_idleanim_8.png", "/sprites/enemies/enemy_wanikun_idleanim_9.png", "/sprites/enemies/enemy_wanikun_idleanim_10.png", "/sprites/enemies/enemy_wanikun_idleanim_11.png", "/sprites/enemies/enemy_wanikun_idleanim_12.png", "/sprites/enemies/enemy_wanikun_idleanim_13.png", "/sprites/enemies/enemy_wanikun_idleanim_14.png", "/sprites/enemies/enemy_wanikun_idleanim_15.png", "/sprites/enemies/enemy_wanikun_idleanim_16.png", "/sprites/enemies/enemy_wanikun_idleanim_17.png", "/sprites/enemies/enemy_wanikun_idleanim_18.png", "/sprites/enemies/enemy_wanikun_idleanim_19.png", "/sprites/enemies/enemy_wanikun_idleanim_20.png", "/sprites/enemies/enemy_wanikun_idleanim_21.png", "/sprites/enemies/enemy_wanikun_idleanim_22.png", "/sprites/enemies/enemy_wanikun_idleanim_23.png", "/sprites/enemies/enemy_wanikun_idleanim_24.png", "/sprites/enemies/enemy_wanikun_idleanim_25.png", "/sprites/enemies/enemy_wanikun_idleanim_26.png", "/sprites/enemies/enemy_wanikun_idleanim_27.png", "/sprites/enemies/enemy_wanikun_idleanim_28.png", "/sprites/enemies/enemy_wanikun_idleanim_29.png", "/sprites/enemies/enemy_wanikun_idleanim_30.png", "/sprites/enemies/enemy_wanikun_idleanim_31.png", "/sprites/enemies/enemy_wanikun_idleanim_32.png", "/sprites/enemies/enemy_wanikun_idleanim_33.png", "/sprites/enemies/enemy_wanikun_idleanim_34.png", "/sprites/enemies/enemy_wanikun_idleanim_35.png", "/sprites/enemies/enemy_wanikun_idleanim_36.png", "/sprites/enemies/enemy_wanikun_idleanim_37.png", "/sprites/enemies/enemy_wanikun_idleanim_38.png", "/sprites/enemies/enemy_wanikun_idleanim_39.png", "/sprites/enemies/enemy_wanikun_idleanim_40.png", "/sprites/enemies/enemy_wanikun_idleanim_41.png", "/sprites/enemies/enemy_wanikun_idleanim_42.png", "/sprites/enemies/enemy_wanikun_idleanim_43.png", "/sprites/enemies/enemy_wanikun_idleanim_44.png", "/sprites/enemies/enemy_wanikun_idleanim_45.png", "/sprites/enemies/enemy_wanikun_idleanim_46.png", "/sprites/enemies/enemy_wanikun_idleanim_47.png", "/sprites/enemies/enemy_wanikun_idleanim_48.png", "/sprites/enemies/enemy_wanikun_idleanim_49.png", "/sprites/enemies/enemy_wanikun_idleanim_50.png", "/sprites/enemies/enemy_wanikun_idleanim_51.png", "/sprites/enemies/enemy_wanikun_idleanim_52.png", "/sprites/enemies/enemy_wanikun_idleanim_53.png", "/sprites/enemies/enemy_wanikun_idleanim_54.png", "/sprites/enemies/enemy_wanikun_idleanim_55.png", "/sprites/enemies/enemy_wanikun_idleanim_56.png", "/sprites/enemies/enemy_wanikun_idleanim_57.png", "/sprites/enemies/enemy_wanikun_idleanim_58.png", "/sprites/enemies/enemy_wanikun_idleanim_59.png", "/sprites/enemies/enemy_wanikun_idleanim_60.png", "/sprites/enemies/enemy_wanikun_idleanim_61.png", "/sprites/enemies/enemy_wanikun_idleanim_62.png", "/sprites/enemies/enemy_wanikun_idleanim_63.png", "/sprites/enemies/enemy_wanikun_idleanim_64.png", "/sprites/enemies/enemy_wanikun_idleanim_65.png", "/sprites/enemies/enemy_wanikun_idleanim_66.png", "/sprites/enemies/enemy_wanikun_idleanim_67.png", "/sprites/enemies/enemy_wanikun_idleanim_68.png", "/sprites/enemies/enemy_wanikun_idleanim_69.png", "/sprites/enemies/enemy_wanikun_idleanim_70.png", "/sprites/enemies/enemy_wanikun_idleanim_71.png", "/sprites/enemies/enemy_wanikun_idleanim_72.png", "/sprites/enemies/enemy_wanikun_idleanim_73.png", "/sprites/enemies/enemy_wanikun_idleanim_74.png", "/sprites/enemies/enemy_wanikun_idleanim_75.png", "/sprites/enemies/enemy_wanikun_idleanim_76.png", "/sprites/enemies/enemy_wanikun_idleanim_77.png", "/sprites/enemies/enemy_wanikun_idleanim_78.png", "/sprites/enemies/enemy_wanikun_idleanim_79.png", "/sprites/enemies/enemy_wanikun_idleanim_80.png", "/sprites/enemies/enemy_wanikun_idleanim_81.png", "/sprites/enemies/enemy_wanikun_idleanim_82.png", "/sprites/enemies/enemy_wanikun_idleanim_83.png", "/sprites/enemies/enemy_wanikun_idleanim_84.png", "/sprites/enemies/enemy_wanikun_idleanim_85.png", "/sprites/enemies/enemy_wanikun_idleanim_86.png", "/sprites/enemies/enemy_wanikun_idleanim_87.png", "/sprites/enemies/enemy_wanikun_idleanim_88.png", "/sprites/enemies/enemy_wanikun_idleanim_89.png", "/sprites/enemies/enemy_wanikun_idleanim_90.png", "/sprites/enemies/enemy_wanikun_idleanim_91.png", "/sprites/enemies/enemy_wanikun_idleanim_92.png", "/sprites/enemies/enemy_wanikun_idleanim_93.png", "/sprites/enemies/enemy_wanikun_idleanim_94.png", "/sprites/enemies/enemy_wanikun_idleanim_95.png"] },
  },
  usagin: {
    id: 'usagin',
    abilityLabel: 'Red Sprinter', // battle-style tag shown in (), like the units'
    displayName: 'Usagin',
    characterName: 'Dryad Fighter', // ウサ銀 (Usagin) — real Red-attribute speedster
    role: 'usagin',
    threat: 9,
    rarity: ENEMY_RARITY.RARE,
    money: 180,
    hp: 500,
    damage: 50,
    attackSpeed: 22, // dps 22 — interval 1367ms (41F), split 35/65 below
    foreswingMs: 478,
    backswingMs: 889,
    moveSpeed: 88,
    radius: 13,
    range: 16,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xdd6666,
    label: 'Us',
    special: { type: 'none' },
    critChance: 0,
    attribute: 'red',
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_usagin_idle.png", attack: "/sprites/enemies/enemy_usagin_attack.png", hit: "/sprites/enemies/enemy_usagin_hit.png", run: ["/sprites/enemies/enemy_usagin_run_0.png", "/sprites/enemies/enemy_usagin_run_1.png", "/sprites/enemies/enemy_usagin_run_2.png", "/sprites/enemies/enemy_usagin_run_3.png", "/sprites/enemies/enemy_usagin_run_4.png", "/sprites/enemies/enemy_usagin_run_5.png", "/sprites/enemies/enemy_usagin_run_6.png", "/sprites/enemies/enemy_usagin_run_7.png", "/sprites/enemies/enemy_usagin_run_8.png", "/sprites/enemies/enemy_usagin_run_9.png", "/sprites/enemies/enemy_usagin_run_10.png", "/sprites/enemies/enemy_usagin_run_11.png", "/sprites/enemies/enemy_usagin_run_12.png", "/sprites/enemies/enemy_usagin_run_13.png", "/sprites/enemies/enemy_usagin_run_14.png", "/sprites/enemies/enemy_usagin_run_15.png", "/sprites/enemies/enemy_usagin_run_16.png", "/sprites/enemies/enemy_usagin_run_17.png", "/sprites/enemies/enemy_usagin_run_18.png", "/sprites/enemies/enemy_usagin_run_19.png", "/sprites/enemies/enemy_usagin_run_20.png", "/sprites/enemies/enemy_usagin_run_21.png", "/sprites/enemies/enemy_usagin_run_22.png", "/sprites/enemies/enemy_usagin_run_23.png", "/sprites/enemies/enemy_usagin_run_24.png", "/sprites/enemies/enemy_usagin_run_25.png", "/sprites/enemies/enemy_usagin_run_26.png", "/sprites/enemies/enemy_usagin_run_27.png", "/sprites/enemies/enemy_usagin_run_28.png", "/sprites/enemies/enemy_usagin_run_29.png", "/sprites/enemies/enemy_usagin_run_30.png", "/sprites/enemies/enemy_usagin_run_31.png"], idleAnim: ["/sprites/enemies/enemy_usagin_idleanim_0.png", "/sprites/enemies/enemy_usagin_idleanim_1.png", "/sprites/enemies/enemy_usagin_idleanim_2.png", "/sprites/enemies/enemy_usagin_idleanim_3.png", "/sprites/enemies/enemy_usagin_idleanim_4.png", "/sprites/enemies/enemy_usagin_idleanim_5.png", "/sprites/enemies/enemy_usagin_idleanim_6.png", "/sprites/enemies/enemy_usagin_idleanim_7.png", "/sprites/enemies/enemy_usagin_idleanim_8.png", "/sprites/enemies/enemy_usagin_idleanim_9.png", "/sprites/enemies/enemy_usagin_idleanim_10.png", "/sprites/enemies/enemy_usagin_idleanim_11.png", "/sprites/enemies/enemy_usagin_idleanim_12.png", "/sprites/enemies/enemy_usagin_idleanim_13.png", "/sprites/enemies/enemy_usagin_idleanim_14.png", "/sprites/enemies/enemy_usagin_idleanim_15.png", "/sprites/enemies/enemy_usagin_idleanim_16.png", "/sprites/enemies/enemy_usagin_idleanim_17.png", "/sprites/enemies/enemy_usagin_idleanim_18.png", "/sprites/enemies/enemy_usagin_idleanim_19.png", "/sprites/enemies/enemy_usagin_idleanim_20.png", "/sprites/enemies/enemy_usagin_idleanim_21.png", "/sprites/enemies/enemy_usagin_idleanim_22.png", "/sprites/enemies/enemy_usagin_idleanim_23.png", "/sprites/enemies/enemy_usagin_idleanim_24.png", "/sprites/enemies/enemy_usagin_idleanim_25.png", "/sprites/enemies/enemy_usagin_idleanim_26.png", "/sprites/enemies/enemy_usagin_idleanim_27.png", "/sprites/enemies/enemy_usagin_idleanim_28.png", "/sprites/enemies/enemy_usagin_idleanim_29.png", "/sprites/enemies/enemy_usagin_idleanim_30.png", "/sprites/enemies/enemy_usagin_idleanim_31.png", "/sprites/enemies/enemy_usagin_idleanim_32.png", "/sprites/enemies/enemy_usagin_idleanim_33.png", "/sprites/enemies/enemy_usagin_idleanim_34.png", "/sprites/enemies/enemy_usagin_idleanim_35.png", "/sprites/enemies/enemy_usagin_idleanim_36.png", "/sprites/enemies/enemy_usagin_idleanim_37.png", "/sprites/enemies/enemy_usagin_idleanim_38.png", "/sprites/enemies/enemy_usagin_idleanim_39.png", "/sprites/enemies/enemy_usagin_idleanim_40.png", "/sprites/enemies/enemy_usagin_idleanim_41.png", "/sprites/enemies/enemy_usagin_idleanim_42.png", "/sprites/enemies/enemy_usagin_idleanim_43.png", "/sprites/enemies/enemy_usagin_idleanim_44.png", "/sprites/enemies/enemy_usagin_idleanim_45.png", "/sprites/enemies/enemy_usagin_idleanim_46.png", "/sprites/enemies/enemy_usagin_idleanim_47.png", "/sprites/enemies/enemy_usagin_idleanim_48.png", "/sprites/enemies/enemy_usagin_idleanim_49.png", "/sprites/enemies/enemy_usagin_idleanim_50.png", "/sprites/enemies/enemy_usagin_idleanim_51.png", "/sprites/enemies/enemy_usagin_idleanim_52.png", "/sprites/enemies/enemy_usagin_idleanim_53.png", "/sprites/enemies/enemy_usagin_idleanim_54.png", "/sprites/enemies/enemy_usagin_idleanim_55.png", "/sprites/enemies/enemy_usagin_idleanim_56.png", "/sprites/enemies/enemy_usagin_idleanim_57.png", "/sprites/enemies/enemy_usagin_idleanim_58.png", "/sprites/enemies/enemy_usagin_idleanim_59.png", "/sprites/enemies/enemy_usagin_idleanim_60.png", "/sprites/enemies/enemy_usagin_idleanim_61.png", "/sprites/enemies/enemy_usagin_idleanim_62.png", "/sprites/enemies/enemy_usagin_idleanim_63.png", "/sprites/enemies/enemy_usagin_idleanim_64.png", "/sprites/enemies/enemy_usagin_idleanim_65.png", "/sprites/enemies/enemy_usagin_idleanim_66.png", "/sprites/enemies/enemy_usagin_idleanim_67.png", "/sprites/enemies/enemy_usagin_idleanim_68.png", "/sprites/enemies/enemy_usagin_idleanim_69.png", "/sprites/enemies/enemy_usagin_idleanim_70.png", "/sprites/enemies/enemy_usagin_idleanim_71.png", "/sprites/enemies/enemy_usagin_idleanim_72.png", "/sprites/enemies/enemy_usagin_idleanim_73.png", "/sprites/enemies/enemy_usagin_idleanim_74.png", "/sprites/enemies/enemy_usagin_idleanim_75.png", "/sprites/enemies/enemy_usagin_idleanim_76.png", "/sprites/enemies/enemy_usagin_idleanim_77.png", "/sprites/enemies/enemy_usagin_idleanim_78.png", "/sprites/enemies/enemy_usagin_idleanim_79.png", "/sprites/enemies/enemy_usagin_idleanim_80.png", "/sprites/enemies/enemy_usagin_idleanim_81.png", "/sprites/enemies/enemy_usagin_idleanim_82.png", "/sprites/enemies/enemy_usagin_idleanim_83.png", "/sprites/enemies/enemy_usagin_idleanim_84.png", "/sprites/enemies/enemy_usagin_idleanim_85.png", "/sprites/enemies/enemy_usagin_idleanim_86.png", "/sprites/enemies/enemy_usagin_idleanim_87.png", "/sprites/enemies/enemy_usagin_idleanim_88.png", "/sprites/enemies/enemy_usagin_idleanim_89.png", "/sprites/enemies/enemy_usagin_idleanim_90.png", "/sprites/enemies/enemy_usagin_idleanim_91.png", "/sprites/enemies/enemy_usagin_idleanim_92.png", "/sprites/enemies/enemy_usagin_idleanim_93.png", "/sprites/enemies/enemy_usagin_idleanim_94.png", "/sprites/enemies/enemy_usagin_idleanim_95.png"] },
  },
  kangaroo: {
    id: 'kangaroo',
    abilityLabel: 'Speed Boss', // battle-style tag shown in (), like the units'
    displayName: 'Kangaroo',
    characterName: 'Mimic Machito', // カ・ンガリュ (Kangaroo) — real stage-35/Tokyo boss
    role: 'kangaroo',
    threat: 35,
    rarity: ENEMY_RARITY.LEGENDARY,
    money: 1400,
    hp: 4000,
    damage: 250,
    attackSpeed: 12.5, // dps ~125 — interval 1200ms (36F), split 35/65 below (real ability is a 3-hit combo, simplified to one hit per cycle)
    foreswingMs: 420,
    backswingMs: 780,
    moveSpeed: 81,
    radius: 22,
    range: 23,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xcc9933,
    label: 'Kn',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_kangaroo_idle.png", attack: "/sprites/enemies/enemy_kangaroo_attack.png", hit: "/sprites/enemies/enemy_kangaroo_hit.png", run: ["/sprites/enemies/enemy_kangaroo_run_0.png", "/sprites/enemies/enemy_kangaroo_run_1.png", "/sprites/enemies/enemy_kangaroo_run_2.png", "/sprites/enemies/enemy_kangaroo_run_3.png", "/sprites/enemies/enemy_kangaroo_run_4.png", "/sprites/enemies/enemy_kangaroo_run_5.png", "/sprites/enemies/enemy_kangaroo_run_6.png", "/sprites/enemies/enemy_kangaroo_run_7.png", "/sprites/enemies/enemy_kangaroo_run_8.png", "/sprites/enemies/enemy_kangaroo_run_9.png", "/sprites/enemies/enemy_kangaroo_run_10.png", "/sprites/enemies/enemy_kangaroo_run_11.png", "/sprites/enemies/enemy_kangaroo_run_12.png", "/sprites/enemies/enemy_kangaroo_run_13.png", "/sprites/enemies/enemy_kangaroo_run_14.png", "/sprites/enemies/enemy_kangaroo_run_15.png"], idleAnim: ["/sprites/enemies/enemy_kangaroo_idleanim_0.png", "/sprites/enemies/enemy_kangaroo_idleanim_1.png", "/sprites/enemies/enemy_kangaroo_idleanim_2.png", "/sprites/enemies/enemy_kangaroo_idleanim_3.png", "/sprites/enemies/enemy_kangaroo_idleanim_4.png", "/sprites/enemies/enemy_kangaroo_idleanim_5.png", "/sprites/enemies/enemy_kangaroo_idleanim_6.png", "/sprites/enemies/enemy_kangaroo_idleanim_7.png", "/sprites/enemies/enemy_kangaroo_idleanim_8.png", "/sprites/enemies/enemy_kangaroo_idleanim_9.png", "/sprites/enemies/enemy_kangaroo_idleanim_10.png", "/sprites/enemies/enemy_kangaroo_idleanim_11.png", "/sprites/enemies/enemy_kangaroo_idleanim_12.png", "/sprites/enemies/enemy_kangaroo_idleanim_13.png", "/sprites/enemies/enemy_kangaroo_idleanim_14.png", "/sprites/enemies/enemy_kangaroo_idleanim_15.png", "/sprites/enemies/enemy_kangaroo_idleanim_16.png", "/sprites/enemies/enemy_kangaroo_idleanim_17.png", "/sprites/enemies/enemy_kangaroo_idleanim_18.png", "/sprites/enemies/enemy_kangaroo_idleanim_19.png", "/sprites/enemies/enemy_kangaroo_idleanim_20.png", "/sprites/enemies/enemy_kangaroo_idleanim_21.png", "/sprites/enemies/enemy_kangaroo_idleanim_22.png", "/sprites/enemies/enemy_kangaroo_idleanim_23.png", "/sprites/enemies/enemy_kangaroo_idleanim_24.png", "/sprites/enemies/enemy_kangaroo_idleanim_25.png", "/sprites/enemies/enemy_kangaroo_idleanim_26.png", "/sprites/enemies/enemy_kangaroo_idleanim_27.png", "/sprites/enemies/enemy_kangaroo_idleanim_28.png", "/sprites/enemies/enemy_kangaroo_idleanim_29.png", "/sprites/enemies/enemy_kangaroo_idleanim_30.png", "/sprites/enemies/enemy_kangaroo_idleanim_31.png"] },
  },
  ikkaku: {
    id: 'ikkaku',
    abilityLabel: 'Red Crusher', // battle-style tag shown in (), like the units'
    displayName: 'Ikkaku-kun',
    characterName: 'Treant Brawler', // 一角くん (Ikkaku-kun) — real stage-41 boss, ultra-close range, Red
    role: 'ikkaku',
    threat: 45,
    rarity: ENEMY_RARITY.LEGENDARY,
    money: 2500,
    hp: 15000,
    damage: 500,
    attackSpeed: 22.5, // dps ~937.5 — interval 533ms (16F), split 35/65 below
    foreswingMs: 187,
    backswingMs: 346,
    moveSpeed: 23,
    radius: 20,
    range: 6, // real range 40 — the shortest reach of any enemy (guide: "射程40の超近距離")
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 6,
    knockbackType: 'normal',
    color: 0xdd3333,
    label: 'Ik',
    special: { type: 'aoe', radius: 30 },
    critChance: 0,
    attribute: 'red',
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_ikkaku_idle.png", attack: "/sprites/enemies/enemy_ikkaku_attack.png", hit: "/sprites/enemies/enemy_ikkaku_hit.png", run: ["/sprites/enemies/enemy_ikkaku_run_0.png", "/sprites/enemies/enemy_ikkaku_run_1.png", "/sprites/enemies/enemy_ikkaku_run_2.png", "/sprites/enemies/enemy_ikkaku_run_3.png", "/sprites/enemies/enemy_ikkaku_run_4.png", "/sprites/enemies/enemy_ikkaku_run_5.png", "/sprites/enemies/enemy_ikkaku_run_6.png", "/sprites/enemies/enemy_ikkaku_run_7.png", "/sprites/enemies/enemy_ikkaku_run_8.png", "/sprites/enemies/enemy_ikkaku_run_9.png"], idleAnim: ["/sprites/enemies/enemy_ikkaku_idleanim_0.png", "/sprites/enemies/enemy_ikkaku_idleanim_1.png", "/sprites/enemies/enemy_ikkaku_idleanim_2.png", "/sprites/enemies/enemy_ikkaku_idleanim_3.png", "/sprites/enemies/enemy_ikkaku_idleanim_4.png", "/sprites/enemies/enemy_ikkaku_idleanim_5.png", "/sprites/enemies/enemy_ikkaku_idleanim_6.png", "/sprites/enemies/enemy_ikkaku_idleanim_7.png", "/sprites/enemies/enemy_ikkaku_idleanim_8.png", "/sprites/enemies/enemy_ikkaku_idleanim_9.png", "/sprites/enemies/enemy_ikkaku_idleanim_10.png", "/sprites/enemies/enemy_ikkaku_idleanim_11.png", "/sprites/enemies/enemy_ikkaku_idleanim_12.png", "/sprites/enemies/enemy_ikkaku_idleanim_13.png", "/sprites/enemies/enemy_ikkaku_idleanim_14.png", "/sprites/enemies/enemy_ikkaku_idleanim_15.png", "/sprites/enemies/enemy_ikkaku_idleanim_16.png", "/sprites/enemies/enemy_ikkaku_idleanim_17.png", "/sprites/enemies/enemy_ikkaku_idleanim_18.png"] },
  },
  gagagaga: {
    id: 'gagagaga',
    abilityLabel: 'Floating Raider', // battle-style tag shown in (), like the units'
    displayName: 'Gagagaga',
    characterName: 'Elder Aquatic Wolf', // ガガガガ (Gagagaga) — real stage-38 boss, Floating
    role: 'gagagaga',
    threat: 40,
    rarity: ENEMY_RARITY.LEGENDARY,
    money: 1800,
    hp: 5000,
    damage: 350,
    attackSpeed: 10.7, // dps ~107.2 — interval 2933ms (88F), split 35/65 below
    foreswingMs: 1027,
    backswingMs: 1906,
    moveSpeed: 81,
    radius: 20,
    range: 49,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0x33cccc,
    label: 'Ga',
    special: { type: 'aoe', radius: 45 },
    critChance: 0,
    attribute: 'floating',
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_gagagaga_idle.png", attack: "/sprites/enemies/enemy_gagagaga_attack.png", hit: "/sprites/enemies/enemy_gagagaga_hit.png", run: ["/sprites/enemies/enemy_gagagaga_run_0.png", "/sprites/enemies/enemy_gagagaga_run_1.png", "/sprites/enemies/enemy_gagagaga_run_2.png", "/sprites/enemies/enemy_gagagaga_run_3.png", "/sprites/enemies/enemy_gagagaga_run_4.png", "/sprites/enemies/enemy_gagagaga_run_5.png", "/sprites/enemies/enemy_gagagaga_run_6.png", "/sprites/enemies/enemy_gagagaga_run_7.png", "/sprites/enemies/enemy_gagagaga_run_8.png", "/sprites/enemies/enemy_gagagaga_run_9.png", "/sprites/enemies/enemy_gagagaga_run_10.png", "/sprites/enemies/enemy_gagagaga_run_11.png", "/sprites/enemies/enemy_gagagaga_run_12.png", "/sprites/enemies/enemy_gagagaga_run_13.png", "/sprites/enemies/enemy_gagagaga_run_14.png", "/sprites/enemies/enemy_gagagaga_run_15.png", "/sprites/enemies/enemy_gagagaga_run_16.png", "/sprites/enemies/enemy_gagagaga_run_17.png", "/sprites/enemies/enemy_gagagaga_run_18.png", "/sprites/enemies/enemy_gagagaga_run_19.png", "/sprites/enemies/enemy_gagagaga_run_20.png", "/sprites/enemies/enemy_gagagaga_run_21.png", "/sprites/enemies/enemy_gagagaga_run_22.png", "/sprites/enemies/enemy_gagagaga_run_23.png", "/sprites/enemies/enemy_gagagaga_run_24.png", "/sprites/enemies/enemy_gagagaga_run_25.png", "/sprites/enemies/enemy_gagagaga_run_26.png", "/sprites/enemies/enemy_gagagaga_run_27.png", "/sprites/enemies/enemy_gagagaga_run_28.png", "/sprites/enemies/enemy_gagagaga_run_29.png", "/sprites/enemies/enemy_gagagaga_run_30.png", "/sprites/enemies/enemy_gagagaga_run_31.png", "/sprites/enemies/enemy_gagagaga_run_32.png", "/sprites/enemies/enemy_gagagaga_run_33.png", "/sprites/enemies/enemy_gagagaga_run_34.png", "/sprites/enemies/enemy_gagagaga_run_35.png", "/sprites/enemies/enemy_gagagaga_run_36.png"], idleAnim: ["/sprites/enemies/enemy_gagagaga_idleanim_0.png", "/sprites/enemies/enemy_gagagaga_idleanim_1.png", "/sprites/enemies/enemy_gagagaga_idleanim_2.png", "/sprites/enemies/enemy_gagagaga_idleanim_3.png", "/sprites/enemies/enemy_gagagaga_idleanim_4.png", "/sprites/enemies/enemy_gagagaga_idleanim_5.png", "/sprites/enemies/enemy_gagagaga_idleanim_6.png", "/sprites/enemies/enemy_gagagaga_idleanim_7.png", "/sprites/enemies/enemy_gagagaga_idleanim_8.png", "/sprites/enemies/enemy_gagagaga_idleanim_9.png", "/sprites/enemies/enemy_gagagaga_idleanim_10.png", "/sprites/enemies/enemy_gagagaga_idleanim_11.png", "/sprites/enemies/enemy_gagagaga_idleanim_12.png", "/sprites/enemies/enemy_gagagaga_idleanim_13.png", "/sprites/enemies/enemy_gagagaga_idleanim_14.png", "/sprites/enemies/enemy_gagagaga_idleanim_15.png", "/sprites/enemies/enemy_gagagaga_idleanim_16.png", "/sprites/enemies/enemy_gagagaga_idleanim_17.png", "/sprites/enemies/enemy_gagagaga_idleanim_18.png", "/sprites/enemies/enemy_gagagaga_idleanim_19.png", "/sprites/enemies/enemy_gagagaga_idleanim_20.png", "/sprites/enemies/enemy_gagagaga_idleanim_21.png", "/sprites/enemies/enemy_gagagaga_idleanim_22.png", "/sprites/enemies/enemy_gagagaga_idleanim_23.png", "/sprites/enemies/enemy_gagagaga_idleanim_24.png", "/sprites/enemies/enemy_gagagaga_idleanim_25.png", "/sprites/enemies/enemy_gagagaga_idleanim_26.png", "/sprites/enemies/enemy_gagagaga_idleanim_27.png", "/sprites/enemies/enemy_gagagaga_idleanim_28.png", "/sprites/enemies/enemy_gagagaga_idleanim_29.png", "/sprites/enemies/enemy_gagagaga_idleanim_30.png", "/sprites/enemies/enemy_gagagaga_idleanim_31.png", "/sprites/enemies/enemy_gagagaga_idleanim_32.png", "/sprites/enemies/enemy_gagagaga_idleanim_33.png", "/sprites/enemies/enemy_gagagaga_idleanim_34.png", "/sprites/enemies/enemy_gagagaga_idleanim_35.png", "/sprites/enemies/enemy_gagagaga_idleanim_36.png", "/sprites/enemies/enemy_gagagaga_idleanim_37.png", "/sprites/enemies/enemy_gagagaga_idleanim_38.png", "/sprites/enemies/enemy_gagagaga_idleanim_39.png", "/sprites/enemies/enemy_gagagaga_idleanim_40.png", "/sprites/enemies/enemy_gagagaga_idleanim_41.png", "/sprites/enemies/enemy_gagagaga_idleanim_42.png", "/sprites/enemies/enemy_gagagaga_idleanim_43.png", "/sprites/enemies/enemy_gagagaga_idleanim_44.png", "/sprites/enemies/enemy_gagagaga_idleanim_45.png", "/sprites/enemies/enemy_gagagaga_idleanim_46.png", "/sprites/enemies/enemy_gagagaga_idleanim_47.png", "/sprites/enemies/enemy_gagagaga_idleanim_48.png", "/sprites/enemies/enemy_gagagaga_idleanim_49.png", "/sprites/enemies/enemy_gagagaga_idleanim_50.png", "/sprites/enemies/enemy_gagagaga_idleanim_51.png", "/sprites/enemies/enemy_gagagaga_idleanim_52.png", "/sprites/enemies/enemy_gagagaga_idleanim_53.png", "/sprites/enemies/enemy_gagagaga_idleanim_54.png", "/sprites/enemies/enemy_gagagaga_idleanim_55.png", "/sprites/enemies/enemy_gagagaga_idleanim_56.png", "/sprites/enemies/enemy_gagagaga_idleanim_57.png", "/sprites/enemies/enemy_gagagaga_idleanim_58.png", "/sprites/enemies/enemy_gagagaga_idleanim_59.png", "/sprites/enemies/enemy_gagagaga_idleanim_60.png", "/sprites/enemies/enemy_gagagaga_idleanim_61.png", "/sprites/enemies/enemy_gagagaga_idleanim_62.png", "/sprites/enemies/enemy_gagagaga_idleanim_63.png", "/sprites/enemies/enemy_gagagaga_idleanim_64.png", "/sprites/enemies/enemy_gagagaga_idleanim_65.png", "/sprites/enemies/enemy_gagagaga_idleanim_66.png", "/sprites/enemies/enemy_gagagaga_idleanim_67.png", "/sprites/enemies/enemy_gagagaga_idleanim_68.png", "/sprites/enemies/enemy_gagagaga_idleanim_69.png", "/sprites/enemies/enemy_gagagaga_idleanim_70.png", "/sprites/enemies/enemy_gagagaga_idleanim_71.png", "/sprites/enemies/enemy_gagagaga_idleanim_72.png", "/sprites/enemies/enemy_gagagaga_idleanim_73.png", "/sprites/enemies/enemy_gagagaga_idleanim_74.png", "/sprites/enemies/enemy_gagagaga_idleanim_75.png", "/sprites/enemies/enemy_gagagaga_idleanim_76.png", "/sprites/enemies/enemy_gagagaga_idleanim_77.png", "/sprites/enemies/enemy_gagagaga_idleanim_78.png", "/sprites/enemies/enemy_gagagaga_idleanim_79.png", "/sprites/enemies/enemy_gagagaga_idleanim_80.png", "/sprites/enemies/enemy_gagagaga_idleanim_81.png", "/sprites/enemies/enemy_gagagaga_idleanim_82.png", "/sprites/enemies/enemy_gagagaga_idleanim_83.png", "/sprites/enemies/enemy_gagagaga_idleanim_84.png", "/sprites/enemies/enemy_gagagaga_idleanim_85.png", "/sprites/enemies/enemy_gagagaga_idleanim_86.png", "/sprites/enemies/enemy_gagagaga_idleanim_87.png", "/sprites/enemies/enemy_gagagaga_idleanim_88.png", "/sprites/enemies/enemy_gagagaga_idleanim_89.png", "/sprites/enemies/enemy_gagagaga_idleanim_90.png", "/sprites/enemies/enemy_gagagaga_idleanim_91.png", "/sprites/enemies/enemy_gagagaga_idleanim_92.png", "/sprites/enemies/enemy_gagagaga_idleanim_93.png", "/sprites/enemies/enemy_gagagaga_idleanim_94.png", "/sprites/enemies/enemy_gagagaga_idleanim_95.png", "/sprites/enemies/enemy_gagagaga_idleanim_96.png", "/sprites/enemies/enemy_gagagaga_idleanim_97.png", "/sprites/enemies/enemy_gagagaga_idleanim_98.png", "/sprites/enemies/enemy_gagagaga_idleanim_99.png", "/sprites/enemies/enemy_gagagaga_idleanim_100.png", "/sprites/enemies/enemy_gagagaga_idleanim_101.png"] },
  },
  // カンバン娘 (Kanban Musume) — a real, deliberately near-harmless "billboard"
  // gimmick filler (atk 1, money 1): real KB is an absurd 10,000, which
  // under this engine's endurance formula (endurance = hp/kbCount) would
  // do the OPPOSITE of the intent (tiny endurance chunks = staggers
  // constantly) — capped at 1 instead, since it poses no real threat
  // either way and this keeps the formula meaningful.
  kanban: {
    id: 'kanban',
    abilityLabel: 'Decoy', // battle-style tag shown in (), like the units'
    displayName: 'Kanban Musume',
    characterName: 'Mimic Shilin', // カンバン娘 — a harmless recurring background filler present in every real Chapter 1 stage
    role: 'kanban',
    nonBlocking: true, // see file header — never lets her wall off the lane or drive the endless trickle
    threat: 2,
    rarity: ENEMY_RARITY.COMMON,
    money: 1,
    hp: 10000,
    damage: 1,
    attackSpeed: 1.5, // dps ~1.5 — interval 20233ms (607F), split 35/65 below
    foreswingMs: 7082,
    backswingMs: 13151,
    moveSpeed: 27,
    radius: 20,
    range: 49,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 6,
    knockbackType: 'normal',
    color: 0xbbbbbb,
    label: 'Kb',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_kanban_idle.png", attack: "/sprites/enemies/enemy_kanban_attack.png", hit: "/sprites/enemies/enemy_kanban_hit.png", run: ["/sprites/enemies/enemy_kanban_run_0.png", "/sprites/enemies/enemy_kanban_run_1.png", "/sprites/enemies/enemy_kanban_run_2.png", "/sprites/enemies/enemy_kanban_run_3.png", "/sprites/enemies/enemy_kanban_run_4.png", "/sprites/enemies/enemy_kanban_run_5.png", "/sprites/enemies/enemy_kanban_run_6.png", "/sprites/enemies/enemy_kanban_run_7.png", "/sprites/enemies/enemy_kanban_run_8.png", "/sprites/enemies/enemy_kanban_run_9.png", "/sprites/enemies/enemy_kanban_run_10.png", "/sprites/enemies/enemy_kanban_run_11.png", "/sprites/enemies/enemy_kanban_run_12.png", "/sprites/enemies/enemy_kanban_run_13.png", "/sprites/enemies/enemy_kanban_run_14.png", "/sprites/enemies/enemy_kanban_run_15.png"], idleAnim: ["/sprites/enemies/enemy_kanban_idleanim_0.png", "/sprites/enemies/enemy_kanban_idleanim_1.png", "/sprites/enemies/enemy_kanban_idleanim_2.png", "/sprites/enemies/enemy_kanban_idleanim_3.png", "/sprites/enemies/enemy_kanban_idleanim_4.png", "/sprites/enemies/enemy_kanban_idleanim_5.png", "/sprites/enemies/enemy_kanban_idleanim_6.png", "/sprites/enemies/enemy_kanban_idleanim_7.png", "/sprites/enemies/enemy_kanban_idleanim_8.png", "/sprites/enemies/enemy_kanban_idleanim_9.png", "/sprites/enemies/enemy_kanban_idleanim_10.png", "/sprites/enemies/enemy_kanban_idleanim_11.png", "/sprites/enemies/enemy_kanban_idleanim_12.png", "/sprites/enemies/enemy_kanban_idleanim_13.png", "/sprites/enemies/enemy_kanban_idleanim_14.png", "/sprites/enemies/enemy_kanban_idleanim_15.png", "/sprites/enemies/enemy_kanban_idleanim_16.png", "/sprites/enemies/enemy_kanban_idleanim_17.png", "/sprites/enemies/enemy_kanban_idleanim_18.png", "/sprites/enemies/enemy_kanban_idleanim_19.png", "/sprites/enemies/enemy_kanban_idleanim_20.png", "/sprites/enemies/enemy_kanban_idleanim_21.png", "/sprites/enemies/enemy_kanban_idleanim_22.png", "/sprites/enemies/enemy_kanban_idleanim_23.png", "/sprites/enemies/enemy_kanban_idleanim_24.png", "/sprites/enemies/enemy_kanban_idleanim_25.png", "/sprites/enemies/enemy_kanban_idleanim_26.png", "/sprites/enemies/enemy_kanban_idleanim_27.png", "/sprites/enemies/enemy_kanban_idleanim_28.png", "/sprites/enemies/enemy_kanban_idleanim_29.png", "/sprites/enemies/enemy_kanban_idleanim_30.png", "/sprites/enemies/enemy_kanban_idleanim_31.png"] },
  },

  // --- Dormant this pass (see file header) — no longer plugged into any
  // rebuilt Chapter-1 stage, kept in place (real revive mechanic still
  // intact) for whenever an "Into the Future"-equivalent saga returns.
  // Their old `trait` values ('zombie'/'bug'/'beast') came from the retired
  // beast-cycle system — zombie IS a real attribute so it carries over
  // directly; colossus/behemoth have no real attribute of their own besides
  // their superClass tag, so `attribute` is simply omitted for them now.
  zombie: {
    id: 'zombie',
    abilityLabel: 'Undying', // battle-style tag shown in (), like the units'
    displayName: 'Zombie',
    characterName: 'Old Slime',
    role: 'zombie',
    attribute: 'zombie',
    threat: 10,
    rarity: ENEMY_RARITY.RARE,
    hp: 40,
    damage: 8,
    attackSpeed: 1,
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
    reviveCount: 2,
    reviveHpPercent: 0.5,
    sprite: { idle: "/sprites/enemies/enemy_zombie_idle.png", attack: "/sprites/enemies/enemy_zombie_attack.png", hit: "/sprites/enemies/enemy_zombie_hit.png", run: ["/sprites/enemies/enemy_zombie_run_0.png", "/sprites/enemies/enemy_zombie_run_1.png", "/sprites/enemies/enemy_zombie_run_2.png", "/sprites/enemies/enemy_zombie_run_3.png", "/sprites/enemies/enemy_zombie_run_4.png", "/sprites/enemies/enemy_zombie_run_5.png", "/sprites/enemies/enemy_zombie_run_6.png", "/sprites/enemies/enemy_zombie_run_7.png", "/sprites/enemies/enemy_zombie_run_8.png", "/sprites/enemies/enemy_zombie_run_9.png", "/sprites/enemies/enemy_zombie_run_10.png", "/sprites/enemies/enemy_zombie_run_11.png", "/sprites/enemies/enemy_zombie_run_12.png", "/sprites/enemies/enemy_zombie_run_13.png", "/sprites/enemies/enemy_zombie_run_14.png", "/sprites/enemies/enemy_zombie_run_15.png", "/sprites/enemies/enemy_zombie_run_16.png", "/sprites/enemies/enemy_zombie_run_17.png", "/sprites/enemies/enemy_zombie_run_18.png", "/sprites/enemies/enemy_zombie_run_19.png", "/sprites/enemies/enemy_zombie_run_20.png", "/sprites/enemies/enemy_zombie_run_21.png", "/sprites/enemies/enemy_zombie_run_22.png", "/sprites/enemies/enemy_zombie_run_23.png"], idleAnim: ["/sprites/enemies/enemy_zombie_idleanim_0.png", "/sprites/enemies/enemy_zombie_idleanim_1.png", "/sprites/enemies/enemy_zombie_idleanim_2.png", "/sprites/enemies/enemy_zombie_idleanim_3.png", "/sprites/enemies/enemy_zombie_idleanim_4.png", "/sprites/enemies/enemy_zombie_idleanim_5.png", "/sprites/enemies/enemy_zombie_idleanim_6.png", "/sprites/enemies/enemy_zombie_idleanim_7.png", "/sprites/enemies/enemy_zombie_idleanim_8.png", "/sprites/enemies/enemy_zombie_idleanim_9.png", "/sprites/enemies/enemy_zombie_idleanim_10.png", "/sprites/enemies/enemy_zombie_idleanim_11.png", "/sprites/enemies/enemy_zombie_idleanim_12.png", "/sprites/enemies/enemy_zombie_idleanim_13.png", "/sprites/enemies/enemy_zombie_idleanim_14.png", "/sprites/enemies/enemy_zombie_idleanim_15.png", "/sprites/enemies/enemy_zombie_idleanim_16.png", "/sprites/enemies/enemy_zombie_idleanim_17.png", "/sprites/enemies/enemy_zombie_idleanim_18.png", "/sprites/enemies/enemy_zombie_idleanim_19.png", "/sprites/enemies/enemy_zombie_idleanim_20.png", "/sprites/enemies/enemy_zombie_idleanim_21.png", "/sprites/enemies/enemy_zombie_idleanim_22.png", "/sprites/enemies/enemy_zombie_idleanim_23.png", "/sprites/enemies/enemy_zombie_idleanim_24.png", "/sprites/enemies/enemy_zombie_idleanim_25.png", "/sprites/enemies/enemy_zombie_idleanim_26.png", "/sprites/enemies/enemy_zombie_idleanim_27.png", "/sprites/enemies/enemy_zombie_idleanim_28.png", "/sprites/enemies/enemy_zombie_idleanim_29.png", "/sprites/enemies/enemy_zombie_idleanim_30.png", "/sprites/enemies/enemy_zombie_idleanim_31.png", "/sprites/enemies/enemy_zombie_idleanim_32.png", "/sprites/enemies/enemy_zombie_idleanim_33.png", "/sprites/enemies/enemy_zombie_idleanim_34.png", "/sprites/enemies/enemy_zombie_idleanim_35.png", "/sprites/enemies/enemy_zombie_idleanim_36.png", "/sprites/enemies/enemy_zombie_idleanim_37.png", "/sprites/enemies/enemy_zombie_idleanim_38.png", "/sprites/enemies/enemy_zombie_idleanim_39.png", "/sprites/enemies/enemy_zombie_idleanim_40.png", "/sprites/enemies/enemy_zombie_idleanim_41.png", "/sprites/enemies/enemy_zombie_idleanim_42.png", "/sprites/enemies/enemy_zombie_idleanim_43.png", "/sprites/enemies/enemy_zombie_idleanim_44.png", "/sprites/enemies/enemy_zombie_idleanim_45.png", "/sprites/enemies/enemy_zombie_idleanim_46.png", "/sprites/enemies/enemy_zombie_idleanim_47.png"] },
  },
  colossus: {
    id: 'colossus',
    abilityLabel: 'Alpha Bruiser', // battle-style tag shown in (), like the units'
    displayName: 'Colossus',
    characterName: 'Mommy Bear',
    role: 'colossus',
    threat: 22,
    rarity: ENEMY_RARITY.EPIC,
    hp: 320,
    damage: 35,
    attackSpeed: 0.4,
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
    statusOnHit: NO_STATUS,
    superClass: 'colossus',
    sprite: { idle: "/sprites/enemies/enemy_colossus_idle.png", attack: "/sprites/enemies/enemy_colossus_attack.png", hit: "/sprites/enemies/enemy_colossus_hit.png", run: ["/sprites/enemies/enemy_colossus_run_0.png", "/sprites/enemies/enemy_colossus_run_1.png", "/sprites/enemies/enemy_colossus_run_2.png", "/sprites/enemies/enemy_colossus_run_3.png", "/sprites/enemies/enemy_colossus_run_4.png", "/sprites/enemies/enemy_colossus_run_5.png", "/sprites/enemies/enemy_colossus_run_6.png", "/sprites/enemies/enemy_colossus_run_7.png", "/sprites/enemies/enemy_colossus_run_8.png", "/sprites/enemies/enemy_colossus_run_9.png", "/sprites/enemies/enemy_colossus_run_10.png", "/sprites/enemies/enemy_colossus_run_11.png", "/sprites/enemies/enemy_colossus_run_12.png", "/sprites/enemies/enemy_colossus_run_13.png", "/sprites/enemies/enemy_colossus_run_14.png", "/sprites/enemies/enemy_colossus_run_15.png", "/sprites/enemies/enemy_colossus_run_16.png", "/sprites/enemies/enemy_colossus_run_17.png", "/sprites/enemies/enemy_colossus_run_18.png", "/sprites/enemies/enemy_colossus_run_19.png", "/sprites/enemies/enemy_colossus_run_20.png", "/sprites/enemies/enemy_colossus_run_21.png", "/sprites/enemies/enemy_colossus_run_22.png", "/sprites/enemies/enemy_colossus_run_23.png", "/sprites/enemies/enemy_colossus_run_24.png", "/sprites/enemies/enemy_colossus_run_25.png", "/sprites/enemies/enemy_colossus_run_26.png", "/sprites/enemies/enemy_colossus_run_27.png", "/sprites/enemies/enemy_colossus_run_28.png", "/sprites/enemies/enemy_colossus_run_29.png", "/sprites/enemies/enemy_colossus_run_30.png", "/sprites/enemies/enemy_colossus_run_31.png"], idleAnim: ["/sprites/enemies/enemy_colossus_idleanim_0.png", "/sprites/enemies/enemy_colossus_idleanim_1.png", "/sprites/enemies/enemy_colossus_idleanim_2.png", "/sprites/enemies/enemy_colossus_idleanim_3.png", "/sprites/enemies/enemy_colossus_idleanim_4.png", "/sprites/enemies/enemy_colossus_idleanim_5.png", "/sprites/enemies/enemy_colossus_idleanim_6.png", "/sprites/enemies/enemy_colossus_idleanim_7.png", "/sprites/enemies/enemy_colossus_idleanim_8.png", "/sprites/enemies/enemy_colossus_idleanim_9.png", "/sprites/enemies/enemy_colossus_idleanim_10.png", "/sprites/enemies/enemy_colossus_idleanim_11.png", "/sprites/enemies/enemy_colossus_idleanim_12.png", "/sprites/enemies/enemy_colossus_idleanim_13.png", "/sprites/enemies/enemy_colossus_idleanim_14.png", "/sprites/enemies/enemy_colossus_idleanim_15.png", "/sprites/enemies/enemy_colossus_idleanim_16.png", "/sprites/enemies/enemy_colossus_idleanim_17.png", "/sprites/enemies/enemy_colossus_idleanim_18.png", "/sprites/enemies/enemy_colossus_idleanim_19.png", "/sprites/enemies/enemy_colossus_idleanim_20.png", "/sprites/enemies/enemy_colossus_idleanim_21.png", "/sprites/enemies/enemy_colossus_idleanim_22.png", "/sprites/enemies/enemy_colossus_idleanim_23.png", "/sprites/enemies/enemy_colossus_idleanim_24.png", "/sprites/enemies/enemy_colossus_idleanim_25.png", "/sprites/enemies/enemy_colossus_idleanim_26.png", "/sprites/enemies/enemy_colossus_idleanim_27.png", "/sprites/enemies/enemy_colossus_idleanim_28.png", "/sprites/enemies/enemy_colossus_idleanim_29.png", "/sprites/enemies/enemy_colossus_idleanim_30.png", "/sprites/enemies/enemy_colossus_idleanim_31.png", "/sprites/enemies/enemy_colossus_idleanim_32.png", "/sprites/enemies/enemy_colossus_idleanim_33.png", "/sprites/enemies/enemy_colossus_idleanim_34.png", "/sprites/enemies/enemy_colossus_idleanim_35.png", "/sprites/enemies/enemy_colossus_idleanim_36.png", "/sprites/enemies/enemy_colossus_idleanim_37.png", "/sprites/enemies/enemy_colossus_idleanim_38.png", "/sprites/enemies/enemy_colossus_idleanim_39.png", "/sprites/enemies/enemy_colossus_idleanim_40.png", "/sprites/enemies/enemy_colossus_idleanim_41.png", "/sprites/enemies/enemy_colossus_idleanim_42.png", "/sprites/enemies/enemy_colossus_idleanim_43.png", "/sprites/enemies/enemy_colossus_idleanim_44.png", "/sprites/enemies/enemy_colossus_idleanim_45.png", "/sprites/enemies/enemy_colossus_idleanim_46.png", "/sprites/enemies/enemy_colossus_idleanim_47.png"] },
  },
  behemoth: {
    id: 'behemoth',
    abilityLabel: 'Apex Predator', // battle-style tag shown in (), like the units'
    displayName: 'Behemoth',
    characterName: 'Werewolf',
    role: 'behemoth',
    threat: 35,
    rarity: ENEMY_RARITY.MYTHIC,
    // Round 2 (user decision): the Werewolf is the biggest threat in the
    // lore, so it is the saga finales' true final boss — tougher than
    // Daddy Bear (40000/2000) at every stage multiplier.
    hp: 60000,
    damage: 2600,
    attackSpeed: 0.35,
    foreswingMs: 1000,
    backswingMs: 1857,
    moveSpeed: 18,
    radius: 38,
    bossScale: 3.2, // drawn even bigger than other bosses when it's the stage boss
    range: 38,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 3,
    knockbackType: 'immune',
    color: 0x330000,
    label: 'Be',
    special: { type: 'aoe', radius: 60 },
    critChance: 0.05,
    statusOnHit: NO_STATUS,
    superClass: 'behemoth',
    sprite: { idle: "/sprites/enemies/enemy_behemoth_idle.png", attack: "/sprites/enemies/enemy_behemoth_attack.png", hit: "/sprites/enemies/enemy_behemoth_hit.png", run: ["/sprites/enemies/enemy_behemoth_run_0.png", "/sprites/enemies/enemy_behemoth_run_1.png", "/sprites/enemies/enemy_behemoth_run_2.png", "/sprites/enemies/enemy_behemoth_run_3.png", "/sprites/enemies/enemy_behemoth_run_4.png", "/sprites/enemies/enemy_behemoth_run_5.png", "/sprites/enemies/enemy_behemoth_run_6.png", "/sprites/enemies/enemy_behemoth_run_7.png", "/sprites/enemies/enemy_behemoth_run_8.png", "/sprites/enemies/enemy_behemoth_run_9.png", "/sprites/enemies/enemy_behemoth_run_10.png", "/sprites/enemies/enemy_behemoth_run_11.png", "/sprites/enemies/enemy_behemoth_run_12.png", "/sprites/enemies/enemy_behemoth_run_13.png", "/sprites/enemies/enemy_behemoth_run_14.png", "/sprites/enemies/enemy_behemoth_run_15.png", "/sprites/enemies/enemy_behemoth_run_16.png", "/sprites/enemies/enemy_behemoth_run_17.png", "/sprites/enemies/enemy_behemoth_run_18.png"], idleAnim: ["/sprites/enemies/enemy_behemoth_idleanim_0.png", "/sprites/enemies/enemy_behemoth_idleanim_1.png", "/sprites/enemies/enemy_behemoth_idleanim_2.png", "/sprites/enemies/enemy_behemoth_idleanim_3.png", "/sprites/enemies/enemy_behemoth_idleanim_4.png", "/sprites/enemies/enemy_behemoth_idleanim_5.png", "/sprites/enemies/enemy_behemoth_idleanim_6.png", "/sprites/enemies/enemy_behemoth_idleanim_7.png", "/sprites/enemies/enemy_behemoth_idleanim_8.png", "/sprites/enemies/enemy_behemoth_idleanim_9.png", "/sprites/enemies/enemy_behemoth_idleanim_10.png", "/sprites/enemies/enemy_behemoth_idleanim_11.png", "/sprites/enemies/enemy_behemoth_idleanim_12.png", "/sprites/enemies/enemy_behemoth_idleanim_13.png", "/sprites/enemies/enemy_behemoth_idleanim_14.png", "/sprites/enemies/enemy_behemoth_idleanim_15.png", "/sprites/enemies/enemy_behemoth_idleanim_16.png", "/sprites/enemies/enemy_behemoth_idleanim_17.png", "/sprites/enemies/enemy_behemoth_idleanim_18.png", "/sprites/enemies/enemy_behemoth_idleanim_19.png", "/sprites/enemies/enemy_behemoth_idleanim_20.png", "/sprites/enemies/enemy_behemoth_idleanim_21.png", "/sprites/enemies/enemy_behemoth_idleanim_22.png", "/sprites/enemies/enemy_behemoth_idleanim_23.png", "/sprites/enemies/enemy_behemoth_idleanim_24.png", "/sprites/enemies/enemy_behemoth_idleanim_25.png", "/sprites/enemies/enemy_behemoth_idleanim_26.png", "/sprites/enemies/enemy_behemoth_idleanim_27.png", "/sprites/enemies/enemy_behemoth_idleanim_28.png", "/sprites/enemies/enemy_behemoth_idleanim_29.png", "/sprites/enemies/enemy_behemoth_idleanim_30.png", "/sprites/enemies/enemy_behemoth_idleanim_31.png", "/sprites/enemies/enemy_behemoth_idleanim_32.png", "/sprites/enemies/enemy_behemoth_idleanim_33.png", "/sprites/enemies/enemy_behemoth_idleanim_34.png", "/sprites/enemies/enemy_behemoth_idleanim_35.png", "/sprites/enemies/enemy_behemoth_idleanim_36.png", "/sprites/enemies/enemy_behemoth_idleanim_37.png", "/sprites/enemies/enemy_behemoth_idleanim_38.png", "/sprites/enemies/enemy_behemoth_idleanim_39.png", "/sprites/enemies/enemy_behemoth_idleanim_40.png", "/sprites/enemies/enemy_behemoth_idleanim_41.png", "/sprites/enemies/enemy_behemoth_idleanim_42.png", "/sprites/enemies/enemy_behemoth_idleanim_43.png", "/sprites/enemies/enemy_behemoth_idleanim_44.png", "/sprites/enemies/enemy_behemoth_idleanim_45.png", "/sprites/enemies/enemy_behemoth_idleanim_46.png", "/sprites/enemies/enemy_behemoth_idleanim_47.png", "/sprites/enemies/enemy_behemoth_idleanim_48.png", "/sprites/enemies/enemy_behemoth_idleanim_49.png", "/sprites/enemies/enemy_behemoth_idleanim_50.png", "/sprites/enemies/enemy_behemoth_idleanim_51.png", "/sprites/enemies/enemy_behemoth_idleanim_52.png", "/sprites/enemies/enemy_behemoth_idleanim_53.png", "/sprites/enemies/enemy_behemoth_idleanim_54.png", "/sprites/enemies/enemy_behemoth_idleanim_55.png", "/sprites/enemies/enemy_behemoth_idleanim_56.png", "/sprites/enemies/enemy_behemoth_idleanim_57.png", "/sprites/enemies/enemy_behemoth_idleanim_58.png", "/sprites/enemies/enemy_behemoth_idleanim_59.png", "/sprites/enemies/enemy_behemoth_idleanim_60.png", "/sprites/enemies/enemy_behemoth_idleanim_61.png", "/sprites/enemies/enemy_behemoth_idleanim_62.png", "/sprites/enemies/enemy_behemoth_idleanim_63.png", "/sprites/enemies/enemy_behemoth_idleanim_64.png", "/sprites/enemies/enemy_behemoth_idleanim_65.png", "/sprites/enemies/enemy_behemoth_idleanim_66.png", "/sprites/enemies/enemy_behemoth_idleanim_67.png", "/sprites/enemies/enemy_behemoth_idleanim_68.png", "/sprites/enemies/enemy_behemoth_idleanim_69.png", "/sprites/enemies/enemy_behemoth_idleanim_70.png", "/sprites/enemies/enemy_behemoth_idleanim_71.png", "/sprites/enemies/enemy_behemoth_idleanim_72.png", "/sprites/enemies/enemy_behemoth_idleanim_73.png", "/sprites/enemies/enemy_behemoth_idleanim_74.png", "/sprites/enemies/enemy_behemoth_idleanim_75.png", "/sprites/enemies/enemy_behemoth_idleanim_76.png", "/sprites/enemies/enemy_behemoth_idleanim_77.png", "/sprites/enemies/enemy_behemoth_idleanim_78.png", "/sprites/enemies/enemy_behemoth_idleanim_79.png", "/sprites/enemies/enemy_behemoth_idleanim_80.png", "/sprites/enemies/enemy_behemoth_idleanim_81.png", "/sprites/enemies/enemy_behemoth_idleanim_82.png", "/sprites/enemies/enemy_behemoth_idleanim_83.png", "/sprites/enemies/enemy_behemoth_idleanim_84.png", "/sprites/enemies/enemy_behemoth_idleanim_85.png", "/sprites/enemies/enemy_behemoth_idleanim_86.png", "/sprites/enemies/enemy_behemoth_idleanim_87.png", "/sprites/enemies/enemy_behemoth_idleanim_88.png", "/sprites/enemies/enemy_behemoth_idleanim_89.png", "/sprites/enemies/enemy_behemoth_idleanim_90.png", "/sprites/enemies/enemy_behemoth_idleanim_91.png", "/sprites/enemies/enemy_behemoth_idleanim_92.png", "/sprites/enemies/enemy_behemoth_idleanim_93.png", "/sprites/enemies/enemy_behemoth_idleanim_94.png", "/sprites/enemies/enemy_behemoth_idleanim_95.png"] },
  },
};
