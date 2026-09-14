// Enemy roster — same 5 roles and exact same field shape as UNIT_CONFIG.js
// (see that file for the full field reference), so difficulty later comes
// from which enemy types a wave mixes in, not just flat stat scaling.
//
// Values below are base (tier 0) stats: GameScene applies WAVE_CONFIG's
// per-tier hp/speed multipliers on top of these at spawn time.
//
// `threat` isn't spent by a player — it's a value weight a future wave
// director can use to budget which enemies to mix into a wave (e.g. "tier 3
// wave gets 12 threat points to spend"), same idea as player money cost but
// for spawn-side balancing. It also doubles as the payout basis for a kill's
// money bonus (see MONEY_CONFIG.killBonusMultiplier).
//
// `trait` is one of TRAIT_CONFIG.js's TRAITS — same matchup/flat-damage
// system as UNIT_CONFIG.js, applied symmetrically in both directions.
//
// `knockback`/`knockbackType` — see UNIT_CONFIG.js for the full
// explanation; same mechanic applies to enemies taking hits from units.
//
// `statusOnHit` — see STATUS_CONFIG.js. Every role but basic has one: tank
// owns Stop, ranged owns Slow, fast and aoe both curse (differentiated by
// chance/duration — fast is frequent-but-short harassment, aoe is
// rarer-but-long lockdown). basic stays ability-less on both sides as the
// deliberate "no gimmick" baseline. UNIT_CONFIG.js mirrors this exact
// role-to-ability mapping on the player side.

import { NO_STATUS, STATUS_TYPES } from './STATUS_CONFIG.js';

export const ENEMY_CONFIG = {
  basic: {
    id: 'basic',
    displayName: 'Basic Melee',
    role: 'basic',
    trait: 'feral',
    threat: 2,
    hp: 16,
    damage: 3,
    attackSpeed: 1, // dps 3
    moveSpeed: 40,
    radius: 16,
    range: 16,
    knockback: 12,
    knockbackType: 'normal',
    color: 0xcc3333,
    label: 'B',
    special: { type: 'none' },
    statusOnHit: NO_STATUS,
    sprite: null,
  },
  fast: {
    id: 'fast',
    displayName: 'Fast Melee',
    role: 'fast',
    trait: 'aerial',
    // Directional push only, mirroring the unit-side literal-ratio jump
    // (the real reference here is a premium unit, a poor tier match to
    // apply literally against our other enemy-tier stats).
    threat: 6,
    hp: 22,
    damage: 4,
    attackSpeed: 1.5, // dps 6
    moveSpeed: 115,
    radius: 12,
    range: 12,
    knockback: 18,
    knockbackType: 'normal',
    color: 0xff6666,
    label: 'F',
    special: { type: 'none' },
    // Status-effect rollout: a quick harasser that curses on hit — shorter
    // duration than aoe's curse (fast attacks more often, so uptime stays
    // comparable rather than strictly better) but easy to land.
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.2, durationMs: 1500 },
    sprite: null,
  },
  tank: {
    id: 'tank',
    displayName: 'Tank',
    role: 'tank',
    trait: 'alloy',
    // Pushed toward the real reference direction (enemy-side walls skew even
    // harder toward "pure roadblock" than player walls do) without going all
    // the way to the literal ratio, which would demand ~1,776 hp off our
    // basic enemy's 16 — not viable at our lane length/wave pacing.
    threat: 4,
    hp: 150,
    damage: 1,
    attackSpeed: 0.6, // dps 0.6
    moveSpeed: 32,
    radius: 26,
    range: 26,
    knockback: 4,
    knockbackType: 'immune', // a true wall doesn't budge, regardless of `knockback`
    color: 0x993333,
    label: 'T',
    special: { type: 'none' },
    // Status-effect demo (STATUS_CONFIG.js): a heavy bruiser that can stun
    // whatever it lands a hit on — thematically a "you can't push it, but it
    // can freeze you" bruiser, since knockbackType 'immune' already means it
    // can't be shoved itself.
    statusOnHit: { type: STATUS_TYPES.STOP, chance: 0.15, durationMs: 800 },
    sprite: null,
  },
  ranged: {
    id: 'ranged',
    displayName: 'Ranged',
    role: 'ranged',
    trait: 'blight',
    // Directional push only (the tier-matched real reference for this
    // archetype was ~44x our basic enemy's hp — a poor tier match, not a
    // ratio to apply literally): more hp, notably more burst dps, a bit
    // slower, mirroring the same "hits hard, not fragile" shape as the
    // rebalanced unit-side ranged.
    threat: 7,
    hp: 20,
    damage: 6,
    attackSpeed: 1, // dps 6
    moveSpeed: 30,
    radius: 13,
    range: 85,
    knockback: 14,
    knockbackType: 'normal',
    color: 0xff9966,
    label: 'R',
    special: { type: 'none' },
    // Status-effect demo (STATUS_CONFIG.js): a debuffing sniper — halves the
    // target's move/attack speed for 1.5s on a hit, matching the genre trope
    // of a long-range unit that slows you down rather than hitting hardest.
    statusOnHit: { type: STATUS_TYPES.SLOW, chance: 0.3, durationMs: 1500, multiplier: 0.5 },
    sprite: null,
  },
  aoe: {
    id: 'aoe',
    displayName: 'Special (AoE)',
    role: 'aoe',
    trait: 'verdant',
    // Directional push only (poor tier match — the real splash-attack
    // reference sits well above our whole enemy-stat tier; see
    // UNIT_CONFIG.js's aoe entry for the full ratio derivation).
    threat: 12,
    hp: 30,
    damage: 10,
    attackSpeed: 0.4, // dps 4, ~1 attack every 2.5s
    moveSpeed: 34,
    radius: 16,
    range: 16,
    knockback: 10,
    knockbackType: 'normal',
    color: 0xcc33cc,
    label: 'A',
    special: { type: 'aoe', radius: 50 },
    // Status-effect demo (STATUS_CONFIG.js): whatever it hits gets cursed —
    // a player unit's own special ability is suppressed, and landing this
    // on the player's base blocks the special-burst trigger for 3s, so
    // there's real stakes to letting this one connect.
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.25, durationMs: 3000 },
    sprite: null,
  },
};
