// Account-wide base-upgrade lines (bible §A.7.1's Upgrade Menu — distinct
// from PROGRESSION_CONFIG.js's per-UNIT leveling/evolution). These are
// permanent, XP-funded, apply-to-everything upgrades: they buff the
// player's Base/Cannon/economy directly rather than any one unit.
//
// Scope note: Cannon Range's real extended-reach effect has no equivalent
// here (this build's Cat Cannon already unconditionally sweeps the whole
// lane, single-lane implementation) — but its OTHER real effect (raising
// the cannon's wave count) is meaningful regardless of range modeling, so
// `cannonRange` below only reproduces that half.
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
    description: 'Increases Cat Cannon damage — but slows its charge.',
    maxLevel: 10,
    xpCostBase: 800,
    // Real formula (guide Chapter 08): 攻撃力 = 100 + 50×(Lv−1) — this
    // build's own level 0 (unpurchased) IS real Lv1, so perLevelEffect is
    // just the +50/level term; GameScene.js adds it on top of a real
    // CANNON_BASE_DAMAGE=100 constant instead of an old invented base of
    // 30 (units) / 25 (enemy base) — real data never distinguishes those
    // as two different values, it's one damage number applied to whatever
    // the wave hits. This is also a real TRADE-OFF, not a pure buff: every
    // level here also SLOWS the charge by the same 1,666.67ms/level that
    // Cannon Charge below speeds it up by — see GameScene.js's charge
    // formula, which reads this category's own LEVEL (not just its damage
    // effect) to apply that penalty.
    perLevelEffect: 50,
    effectType: 'flat',
  },
  cannonCharge: {
    label: 'Cannon Charge',
    description: 'Reduces the Cat Cannon’s charge time.',
    maxLevel: 10,
    xpCostBase: 700,
    // Real value (guide Chapter 08): 50F (≈1,666.67ms) shaved off the
    // cannon's total charge TIME per level, down to a hard floor (see
    // GameScene.js's CANNON_CHARGE_FLOOR_MS) — real Battle Cats needs 11
    // levels to fully hit that floor; this build's 10-level cap gets close
    // (50s → ~33.3s) but doesn't quite reach it, same honest shortfall
    // as Research's own real-vs-this-build's-level-cap note below. Exactly
    // cancels out Cannon Power's own equal-and-opposite charge penalty
    // when both are raised to the same level, matching the real game.
    perLevelEffect: 1666.67,
    effectType: 'flat',
  },
  cannonRange: {
    label: 'Cannon Range',
    description: 'Adds another wave to every Cat Cannon shot.',
    maxLevel: 10,
    xpCostBase: 750,
    // Real formula (guide Chapter 08): 波動の数 = 3 + 1×(Lv−1) — this
    // build's level 0 IS real Lv1 (3 waves), so perLevelEffect is the
    // +1/level term, added on top of GameScene.js's own
    // CANNON_BASE_WAVE_COUNT=3. The real upgrade's actual RANGE-extending
    // half has no equivalent in this build (see file header) — only the
    // wave-count half is reproduced.
    perLevelEffect: 1,
    effectType: 'flat',
  },
  baseDefense: {
    label: 'Base Defense',
    description: "Increases your Base's max HP.",
    maxLevel: 10,
    xpCostBase: 600,
    // Real per-level growth is TIERED, not a flat +1,000 (confirmed:
    // default/unupgraded Cat Base HP is exactly 1,000 — matching this
    // build's own STAGE_CONFIG.js baseHp — real Lv2-4 add 1,000/level,
    // Lv5-8 add 2,000/level, Lv9-30 add 3,000/level, capping at 78,000 at
    // Lv30). This build's own level 1 purchase maps to real Lv2 (Lv1 is
    // already the stage's own baseHp), so perLevelTiers is this build's
    // level→bonus table, shifted by that same 1 — level 10 here lands on
    // real Lv11, still inside the +2,000/3,000 tiers, well short of real's
    // Lv30 ceiling (same honest "smaller level cap" shortfall as Research/
    // Cannon Charge above).
    perLevelTiers: [1000, 1000, 1000, 2000, 2000, 2000, 2000, 3000, 3000, 3000],
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
