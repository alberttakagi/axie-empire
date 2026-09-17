// Computes a unit's EFFECTIVE combat config — its UNIT_CONFIG base stats
// adjusted for the player's current meta-progression (level + evolution
// stage, from PlayerProgress.js/PROGRESSION_CONFIG.js). Shared by GameScene
// (to actually spawn units at their real current power) and UpgradeScene
// (to preview that same power in the menu) so the two never drift out of
// sync with two copies of this formula.
//
// Order of operations (bible §A.4.2/§A.4.4): evolution multipliers apply to
// the unit's BASE (level-1) stat first — evolving changes its power TIER —
// then the per-level growth curve is layered on top of that already-evolved
// base — leveling further REFINES whatever tier it's currently at. Only hp
// and damage scale this way; every other stat is level-invariant, except
// where a specific evolution stage explicitly grants a critChanceBonus or
// rechargeMultiplier (bible §A.4.4 — evolution isn't just bigger numbers).

import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { PROGRESSION_CONFIG } from './PROGRESSION_CONFIG.js';
import { loadPlayerProgress, getUnitProgress } from './PlayerProgress.js';

export function getEffectiveUnitConfig(type) {
  const base = UNIT_CONFIG[type];
  const meta = PROGRESSION_CONFIG[type];
  const unitProgress = getUnitProgress(loadPlayerProgress(), type);

  let hp = base.hp;
  let damage = base.damage;
  let critChance = base.critChance;
  let rechargeMs = base.rechargeMs;

  // hpMultiplier/damageMultiplier/rechargeMultiplier apply ONCE, from base,
  // using only the highest evolution stage actually reached — per this
  // file's own header ("effectiveStat = baseStat * evolutionMultiplier *
  // ...", ONE evolutionMultiplier) and PROGRESSION_CONFIG.js's ("applied to
  // the unit's BASE (level-1) hp/damage"), these define what TIER the unit
  // is at now, not a per-stage bonus meant to stack. A previous version of
  // this loop multiplied by every passed stage's own multiplier in turn,
  // silently compounding them (e.g. a True Form unit got hp *= 1.25 * 1.6
  // instead of the documented hp *= 1.6) — every evolved unit was stronger
  // than its own config intended. critChanceBonus is the one real
  // exception: it's an additive bonus layered on top, not a tier-defining
  // multiplier, so it still sums across every stage passed through (today
  // only True Form sets one, but a future Evolved-stage bonus should add
  // to it, not replace it).
  if (unitProgress.evolutionStage > 0) {
    const currentEvolution = meta.evolutions[unitProgress.evolutionStage - 1];
    hp *= currentEvolution.hpMultiplier;
    damage *= currentEvolution.damageMultiplier;
    if (currentEvolution.rechargeMultiplier) rechargeMs *= currentEvolution.rechargeMultiplier;
  }
  // abilityGrant (bible §A.4.4 — "evolution isn't just bigger numbers"):
  // an evolution stage can hand a unit a whole new ability outright (e.g.
  // Fish Cat's real 2% Critical Hit chance, Titan Cat's real 30%-chance
  // Knockback-all — see PROGRESSION_CONFIG.js) rather than just scaling an
  // existing stat. Same additive-across-every-reached-stage treatment as
  // critChanceBonus above, for the same reason: it's cumulative progress,
  // not a tier-defining replacement.
  let abilityGrants = {};
  for (let i = 0; i < unitProgress.evolutionStage; i += 1) {
    if (meta.evolutions[i].critChanceBonus) critChance += meta.evolutions[i].critChanceBonus;
    if (meta.evolutions[i].abilityGrant) abilityGrants = { ...abilityGrants, ...meta.evolutions[i].abilityGrant };
  }

  // Stepped growth curve (bible §A.4.2 — see PROGRESSION_CONFIG.js's own
  // header comment for the full reasoning): the unit's usual rate applies
  // up through baseLevelCap, then the halved "extra" rate applies to every
  // level reached only via Growth Charms beyond that — growth STEPS DOWN
  // as level rises rather than staying flat for the unit's whole life.
  const levelsAtBaseRate = Math.min(unitProgress.level, meta.baseLevelCap) - 1;
  const levelsAtExtraRate = Math.max(0, unitProgress.level - meta.baseLevelCap);
  const growthMultiplier =
    1 + meta.growthPercentPerLevel * levelsAtBaseRate + meta.growthPercentPerLevelExtra * levelsAtExtraRate;
  hp *= growthMultiplier;
  damage *= growthMultiplier;

  return {
    ...base,
    ...abilityGrants,
    hp: Math.round(hp),
    damage: Math.round(damage * 100) / 100,
    critChance,
    rechargeMs: Math.round(rechargeMs),
  };
}
