// Unit progression data (bible Part B Phase 3 / §A.4). Kept in its own file
// rather than folded into UNIT_CONFIG.js: UNIT_CONFIG describes a unit's
// BASE (level 1, un-evolved) combat stats, while this file describes how
// those stats change over the meta-progression layer (leveling, evolving) —
// two different concerns that change at very different rates.
//
// `rarity` — Normal/Special/Rare/Super Rare/Uber Rare/Legend Rare (bible
// §A.4.1). All five of our units are freely obtainable right now (there's
// no gacha yet — that's a later phase, §A.5.2), so rarity here ONLY affects
// the growth-curve numbers below; it doesn't gate acquisition yet.
//
// `baseLevelCap` — the level reachable via XP alone, no items needed
// (bible §A.4.2's "level 1→30 (ish) purely by spending XP").
// `maxExtraCap`  — further levels reachable ONLY by consuming a Growth
// Charm per level (bible §A.4.3's Catseye-equivalent) once baseLevelCap is
// hit. True max level = baseLevelCap + maxExtraCap.
// `growthPercentPerLevel` — bible §A.4.2 describes a real per-unit,
// per-decade-bracket tapering curve (20%→10%→5% as level rises); this build
// simplifies that to one flat rate for the unit's whole level range
// (documented as a deliberate simplification, same spirit as the
// foreswing/backswing split in UNIT_CONFIG.js). Applied as:
//   effectiveStat = baseStat * evolutionMultiplier * (1 + growthPercentPerLevel * (level - 1))
// to hp and damage ONLY — every other stat (cost, recharge, range, etc.)
// stays level-invariant, per the bible.
//
// `xpCostBase` — XP cost to go from level L to L+1 is
// round(xpCostBase * L^1.5) — a simple, clearly-tunable curve (not the
// bible's real per-decade lookup-table formula, which needs far more
// per-unit authoring than a 5-unit demo roster justifies right now).
//
// `evolutions` — an ordered list (index 0 = "Evolved Form", index 1 =
// "True Form" — bible §A.4.4; Ultra Form is skipped for this pass, it's
// explicitly a "small minority of top-tier units only" feature). Each
// entry:
//   name              display name for the Upgrade Menu / evolution ring.
//   unlockLevel       total level (base + extraCap) required before this
//                     evolution becomes purchasable.
//   xpCost            XP spent on evolving (bible: 1st evolution is
//                     XP-only, no material — matches evolutions[0] having
//                     evoShardCost: 0).
//   evoShardCost      Evolution-material cost (bible's Catfruit-equivalent,
//                     kept as one unified currency rather than 5 colors for
//                     this pass — see the bible's own note that "a single
//                     combined farm-any-color stage is simpler to implement
//                     and just as functional").
//   hpMultiplier/damageMultiplier — applied to the unit's BASE (level-1)
//                     hp/damage before the per-level growth curve is
//                     layered on top, per the bible's "evolving changes the
//                     unit's power tier; leveling further refines it."
//   critChanceBonus / rechargeMultiplier — evolution isn't just bigger
//                     numbers (bible §A.4.4: "don't treat evolution as a
//                     pure stat-multiplier pass — give it an ability
//                     diff too"). True Form uniformly sharpens crit odds
//                     and shaves a little off redeploy time; a full roster
//                     would author a bespoke ability diff per unit instead
//                     of this uniform bump.
//
// Separate from the above: PartEvolution.js layers a purely cosmetic,
// level-driven (not evoShard-driven) milestone on top — reaching level 10
// unlocks a unit's real evolved ("awakened") Starter art where one exists,
// plus a subtle glow (or glow alone, for the one unit with no real evolved
// art). See that file for the full reasoning.

export const PROGRESSION_CONFIG = {
  basic: {
    rarity: 'Normal',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.08,
    xpCostBase: 100,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 2500, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 10000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },
  fast: {
    rarity: 'Rare',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.06,
    xpCostBase: 1000,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 25000, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 100000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },
  tank: {
    rarity: 'Normal',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.08,
    xpCostBase: 200,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 5000, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 20000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },
  ranged: {
    rarity: 'Rare',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.07,
    xpCostBase: 800,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 20000, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 80000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },
  aoe: {
    rarity: 'Super Rare',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.05,
    xpCostBase: 1300,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 32500, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 130000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },

  // --- Roster expansion (see UNIT_CONFIG.js's own matching section). Same
  // 25x/100x xpCost-to-xpCostBase ratio and uniform evolution bonus block
  // as the original five, just keyed off each new unit's own rarity tier.
  swarm: {
    rarity: 'Normal',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.08,
    xpCostBase: 50,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 1250, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 5000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },
  sniper: {
    rarity: 'Rare',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.06,
    xpCostBase: 900,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 22500, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 90000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },
  guardian: {
    rarity: 'Normal',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.08,
    xpCostBase: 250,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 6250, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 25000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },
  support: {
    rarity: 'Rare',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.07,
    xpCostBase: 600,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 15000, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 60000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },
  titan: {
    rarity: 'Super Rare',
    baseLevelCap: 10,
    maxExtraCap: 10,
    growthPercentPerLevel: 0.05,
    xpCostBase: 1500,
    evolutions: [
      { name: 'Evolved', unlockLevel: 5, xpCost: 37500, evoShardCost: 0, hpMultiplier: 1.25, damageMultiplier: 1.15 },
      {
        name: 'True',
        unlockLevel: 10,
        xpCost: 150000,
        evoShardCost: 3,
        hpMultiplier: 1.6,
        damageMultiplier: 1.35,
        critChanceBonus: 0.05,
        rechargeMultiplier: 0.9,
      },
    ],
  },
};
