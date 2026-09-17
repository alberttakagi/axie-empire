// Account-wide base-upgrade lines (bible §A.7.1's Upgrade Menu — distinct
// from PROGRESSION_CONFIG.js's per-UNIT leveling/evolution). These are
// permanent, XP-funded, apply-to-everything upgrades: they buff the
// player's Base/Cannon/economy directly rather than any one unit.
//
// Scope note: the bible lists more categories than this (Cannon Range is
// skipped here — our Cat Cannon has no adjustable "range" concept in this
// build's single-lane-sweep implementation). The seven below cover every
// category that maps onto something this build's GameScene actually reads.
//
// `xpCostBase` — cost to go from level L to L+1 is round(xpCostBase *
// (L+1)^1.3) — same shape as PROGRESSION_CONFIG's per-unit leveling curve,
// just its own tunable base per category.
// `perLevelEffect` — the flat (or %) amount each level adds; see each
// category's own `effectType` for units, and GameScene/Energy.js for where
// it's actually read.

export const BASE_UPGRADE_CONFIG = {
  cannonPower: {
    label: 'Cannon Power',
    description: 'Increases Cat Cannon burst damage.',
    maxLevel: 10,
    xpCostBase: 800,
    perLevelEffect: 5, // flat damage added to both SPECIAL_BURST_DAMAGE and SPECIAL_BURST_BASE_DAMAGE
    effectType: 'flat',
  },
  cannonCharge: {
    label: 'Cannon Charge',
    description: 'Charges the Cat Cannon faster.',
    maxLevel: 10,
    xpCostBase: 700,
    perLevelEffect: 0.5, // flat added to SPECIAL_CHARGE_PER_SEC
    effectType: 'flat',
  },
  baseDefense: {
    label: 'Base Defense',
    description: "Increases your Base's max HP.",
    maxLevel: 10,
    xpCostBase: 600,
    perLevelEffect: 1000, // real value (guide Chapter 08): "城体力 1レベルごとに体力+1,000"
    effectType: 'flat',
  },
  research: {
    label: 'Research',
    description: 'Reduces every unit’s redeploy Recharge time.',
    maxLevel: 10,
    xpCostBase: 900,
    // Real value (guide Chapter 06/08): 200ms (6F) shaved off per level.
    // Real Research goes up to Lv20+10 for a 5,800ms max reduction — this
    // build's upgrade lines only go to level 10, so the max reduction here
    // (2,000ms) is proportionally smaller, not the literal real ceiling.
    perLevelEffect: 200,
    effectType: 'flat',
  },
  accounting: {
    label: 'Accounting',
    description: 'Increases money earned from defeated enemies.',
    maxLevel: 10,
    xpCostBase: 500,
    perLevelEffect: 5, // % added to the enemy-kill money bonus
    effectType: 'percent',
  },
  study: {
    label: 'Study',
    description: 'Increases XP earned from stage clears.',
    maxLevel: 10,
    xpCostBase: 500,
    perLevelEffect: 5, // % added to a stage clear's XP reward
    effectType: 'percent',
  },
  staminaCap: {
    label: 'Stamina Cap',
    description: 'Increases max Energy.',
    maxLevel: 10,
    xpCostBase: 1000,
    perLevelEffect: 10, // flat Energy added to the cap
    effectType: 'flat',
  },
};
