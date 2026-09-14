// Enemy roster — same 5 roles and exact same field shape as UNIT_CONFIG.js
// (see that file for the full field reference), so difficulty later comes
// from which enemy types a wave mixes in, not just flat stat scaling.
//
// Values below are base stats: STAGE_CONFIG's spawnScript applies each
// entry's own statMultiplier to hp on top of these at spawn time.
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

import { NO_STATUS, STATUS_TYPES } from './STATUS_CONFIG.js';

export const ENEMY_CONFIG = {
  basic: {
    id: 'basic',
    displayName: 'Basic Melee',
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
    sprite: null,
  },
  fast: {
    id: 'fast',
    displayName: 'Fast Melee',
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
    sprite: null,
  },
  tank: {
    id: 'tank',
    displayName: 'Tank',
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
    sprite: null,
  },
  ranged: {
    id: 'ranged',
    displayName: 'Ranged',
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
    sprite: null,
  },
  aoe: {
    id: 'aoe',
    displayName: 'Special (AoE)',
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
    sprite: null,
  },
};
