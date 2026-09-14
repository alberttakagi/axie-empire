import { NO_STATUS, STATUS_TYPES } from './STATUS_CONFIG.js';

// Player unit roster. Placeholder rendering only (colored circle + text
// label) — set `sprite` to a loaded texture key later and swap the `render`
// call in GameScene to draw that image instead; nothing else needs to change.
//
// Field reference:
//   id/displayName  reskin hooks — id is the stable lookup key, displayName is
//                   the human-facing name shown on the spawn button.
//   role            shared taxonomy with ENEMY_CONFIG.js (basic/fast/tank/ranged/aoe).
//   trait           one of TRAIT_CONFIG.js's TRAITS — drives matchup bonuses
//                    and the flat-damage-vs-alloy rule; see that file.
//   cost            yen spent to spawn one (see MONEY_CONFIG.js) — set to
//                   the literal real Battle Cats price for that unit's
//                   reference archetype, not a ratio-derived figure.
//   hp              max health.
//   damage          damage dealt per hit; combined with attackSpeed this is
//                   the unit's DPS (damage * attackSpeed).
//   attackSpeed     attacks per second.
//   moveSpeed       walk speed in px/sec while no target is in range.
//   radius          placeholder shape size (also its own melee reach — see `range`).
//   range           max distance (px, center-to-center) at which it can attack.
//                   For melee roles this equals `radius`, which reproduces the
//                   current contact-only combat exactly. Ranged/AoE roles get
//                   a larger number so they can strike before physical contact.
//   special         { type: 'none' } or an ability descriptor, e.g.
//                   { type: 'aoe', radius } to splash all enemies within that
//                   radius of the primary target instead of hitting one.
//   knockback       px this entity slides (away from its attacker) over the
//                   knockback duration each time it takes a hit — a real,
//                   timed position shift (see GameScene's tickKnockback),
//                   not just a visual flourish, so a big enough shove can
//                   land it out of its own attack range and force a brief
//                   re-approach. Lower = heavier/more knockback-resistant.
//                   Ignored entirely when knockbackType is 'immune'.
//   knockbackType   'normal' (slides per `knockback`) or 'immune' (does not
//                   move at all when hit, regardless of `knockback`'s value).
//   statusOnHit     see STATUS_CONFIG.js — an on-hit chance to inflict Slow/
//                   Stop/Curse on whatever this unit hits. NO_STATUS (the
//                   default) means it never does. Mirrors ENEMY_CONFIG.js's
//                   role-to-ability mapping: tank/Stop, ranged/Slow,
//                   fast+aoe/Curse, basic stays ability-less.
//   color/label     placeholder shape fill + single-letter text label.
//   sprite          reskin hook, unused until real art is added.

export const UNIT_CONFIG = {
  basic: {
    id: 'basic',
    displayName: 'Basic Melee',
    role: 'basic',
    trait: 'feral',
    cost: 50, // literal real price of this archetype's basic-attacker reference
    hp: 14,
    damage: 3,
    attackSpeed: 1.2, // dps 3.6
    moveSpeed: 55,
    radius: 14,
    range: 14,
    knockback: 12,
    knockbackType: 'normal',
    color: 0x33cc33,
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
    // Rebalanced against real reference ratios (fastest-mover archetype vs.
    // basic attacker): hp 5x basic, dps ~6x basic, speed 3x basic. The real
    // reference unit for "fastest mover" turned out to be a premium unit
    // (priciest/tankiest of its tier), not a cheap glass cannon — flagged
    // and confirmed: this turns "fast" into a premium heavy-rusher rather
    // than an early cheap skirmisher. cost is that unit's literal real price.
    cost: 500,
    hp: 70,
    damage: 4.88,
    attackSpeed: 4.44, // dps ~21.65
    moveSpeed: 165,
    radius: 12,
    range: 12,
    knockback: 18,
    knockbackType: 'normal',
    color: 0x33ffcc,
    label: 'F',
    special: { type: 'none' },
    // Status-effect rollout, mirroring ENEMY_CONFIG's fast entry: a quick
    // harasser that curses on hit — shorter duration than aoe's curse.
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.2, durationMs: 1500 },
    sprite: null,
  },
  tank: {
    id: 'tank',
    displayName: 'Tank',
    role: 'tank',
    trait: 'alloy',
    // Rebalanced against real reference ratios (wall unit vs. basic attacker):
    // hp 4x basic, dps ~0.14x basic, speed ~0.8x basic. cost is that unit's
    // literal real price (happens to land at 2x basic).
    cost: 100,
    hp: 56,
    damage: 0.8,
    attackSpeed: 0.6, // dps 0.48
    moveSpeed: 44,
    radius: 26,
    range: 26,
    knockback: 4,
    knockbackType: 'immune', // a true wall doesn't budge, regardless of `knockback`
    color: 0x6699ff,
    label: 'T',
    special: { type: 'none' },
    // Status-effect rollout, mirroring ENEMY_CONFIG's tank entry: an
    // immovable bruiser that can also freeze whatever it hits.
    statusOnHit: { type: STATUS_TYPES.STOP, chance: 0.15, durationMs: 800 },
    sprite: null,
  },
  ranged: {
    id: 'ranged',
    displayName: 'Ranged',
    role: 'ranged',
    trait: 'blight',
    // Rebalanced against real reference ratios (ranged attacker vs. basic
    // attacker): hp 4x basic (this archetype isn't a glass cannon in HP —
    // its edge is one huge hit on a slow cadence), dps ~3.64x basic, speed
    // same as basic. cost is that unit's literal real price (8x basic).
    // Range is NOT scaled by the real 2.5x ratio — our "range" is a pixel
    // distance relative to tiny melee hitboxes (14-26px), not a real
    // distance unit, so that ratio would actually shrink this unit's reach;
    // kept at its existing value instead.
    cost: 400,
    hp: 56,
    damage: 33,
    attackSpeed: 0.4, // dps 13.2
    moveSpeed: 55,
    radius: 13,
    range: 90,
    knockback: 14,
    knockbackType: 'normal',
    color: 0xffcc33,
    label: 'R',
    special: { type: 'none' },
    // Status-effect rollout, mirroring ENEMY_CONFIG's ranged entry: a
    // debuffing sniper that halves the target's move/attack speed on hit.
    statusOnHit: { type: STATUS_TYPES.SLOW, chance: 0.3, durationMs: 1500, multiplier: 0.5 },
    sprite: null,
  },
  aoe: {
    id: 'aoe',
    displayName: 'Special (AoE)',
    role: 'aoe',
    trait: 'verdant',
    // Rebalanced against real reference ratios (splash/area attacker vs.
    // basic attacker): hp 3x basic, dps ~16.2x basic, speed same as basic.
    // No basic-tier real unit has a true area attack — pulled this from the
    // wider roster instead, and even THAT unit's literal real price (used
    // as cost below) sits well above this tier (splash is a premium
    // mechanic in the real data, not a starter one). Its per-hit damage is
    // huge because it's meant to be split across every enemy caught in the
    // splash, same as our `special.aoe` already does.
    cost: 650,
    hp: 42,
    damage: 52.5,
    attackSpeed: 1.11, // dps ~58.3, up from a slow ~1 attack/2.5s cadence
    moveSpeed: 55,
    radius: 16,
    range: 16,
    knockback: 10,
    knockbackType: 'normal',
    color: 0xcc66ff,
    label: 'A',
    special: { type: 'aoe', radius: 55 },
    // Status-effect rollout, mirroring ENEMY_CONFIG's aoe entry: curses
    // whatever it hits — including landing on an enemy aoe and shutting
    // down its own splash right back.
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.25, durationMs: 3000 },
    sprite: null,
  },
};
