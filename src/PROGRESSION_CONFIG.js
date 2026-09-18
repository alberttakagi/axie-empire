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
// `baseLevelCap` — the level reachable via XP alone, no items or story
// progress needed. Real value confirmed by the guide: 10.
// `STORY_GATE_LEVEL_CAP` (module-level, below, not per-unit — this bonus
// is a flat +10 for every unit alike) — clearing the real Japan Chapter 2
// final stage (西表島/Iriomote Island, this build's own equivalent —
// see PlayerProgress.js's hasStoryGateCleared) raises every unit's level
// cap from 10 to 20, no items involved, matching the guide's own
// "日本編第2章「西表島」クリアで20になる."
// `maxExtraCap`  — further levels PAST the story-gated 20, reachable only
// by consuming Growth Charms (bible §A.4.3 / the guide's "キャッツアイ"),
// one per level for most of the range, two per level for the final 5
// (real levels 46-50 cost 2 Catseyes each — see
// PlayerProgress.js's tryUseGrowthCharm). True max level = baseLevelCap +
// STORY_GATE_BONUS (10, once cleared) + maxExtraCap. Real cap is 50 for
// most characters (30 here, landing on 10+10+30=50) — some real rarities
// go to 60, not modeled since this roster has no such unit yet (see
// UNIT_CONFIG.js's rarity field).
// `growthPercentPerLevel` / `growthPercentPerLevelExtra` — bible §A.4.2
// describes a real per-unit, per-decade-bracket tapering curve (20%→10%→5%
// as level rises), keyed off real breakpoints (Lv60, etc) that don't
// correspond to any of the three tiers above — this build instead steps
// down exactly once, at `baseLevelCap`, same as before: the unit's usual
// rate applies through baseLevelCap, then growthPercentPerLevelExtra
// (always half the base rate) applies to every level past that,
// regardless of which of the two upper tiers a given level falls in.
// Applied as:
//   levelsAtBaseRate = min(level, baseLevelCap) - 1
//   levelsAtExtraRate = max(0, level - baseLevelCap)
//   growthMultiplier = 1 + growthPercentPerLevel * levelsAtBaseRate
//                        + growthPercentPerLevelExtra * levelsAtExtraRate
//   effectiveStat = baseStat * evolutionMultiplier * growthMultiplier
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

// Flat bonus every unit's level cap gains once the story gate (see
// PlayerProgress.js's hasStoryGateCleared) is cleared — same value for
// every unit, so it lives here once rather than repeated per-entry below.
export const STORY_GATE_LEVEL_CAP_BONUS = 10;
// This build's own equivalent of real Japan Chapter 2's final stage
// (西表島/Iriomote Island) — saga2's own stage96 (see STAGE_CONFIG.js's
// saga2/saga3 rebuild), the same map as saga1's stage48 replayed at real
// Chapter 2's 150% magnification.
export const STORY_GATE_STAGE_ID = 'stage96';

export const PROGRESSION_CONFIG = {
  basic: {
    rarity: 'Normal',
    baseLevelCap: 10,
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
        // Real Fish Cat ability (guide Chapter 11): "2%でクリティカル" — 2%
        // Critical Hit chance at True Form. Replaces the generic +5% every
        // other unit's True Form gets (see this file's header) with the
        // real value now that we have one for this specific lineage.
        critChanceBonus: 0.02,
        rechargeMultiplier: 0.9,
      },
    ],
  },
  guardian: {
    rarity: 'Normal',
    baseLevelCap: 10,
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
    maxExtraCap: 30,
    growthPercentPerLevel: 0.2, // real Battle Cats formula (guide Chapter 06 f-level): +20%/level up to Lv60
    growthPercentPerLevelExtra: 0.1, // real formula: +10%/level past Lv60 — applied here past this unit's own baseLevelCap instead (see this file's own header)
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
        // Real Titan Cat ability (guide Chapter 11): "30%でふっとばす（メタル
        // 等を除く全敵）" — a 30% chance per landed hit to unconditionally
        // Knockback every enemy on the field (see UnitStats.js's
        // abilityGrant handling and GameScene's tryKnockbackOnHit).
        abilityGrant: { knockbackOnHit: { chance: 0.3 } },
      },
    ],
  },
};
