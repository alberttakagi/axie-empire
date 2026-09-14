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

  for (let i = 0; i < unitProgress.evolutionStage; i += 1) {
    const evolution = meta.evolutions[i];
    hp *= evolution.hpMultiplier;
    damage *= evolution.damageMultiplier;
    if (evolution.critChanceBonus) critChance += evolution.critChanceBonus;
    if (evolution.rechargeMultiplier) rechargeMs *= evolution.rechargeMultiplier;
  }

  const growthMultiplier = 1 + meta.growthPercentPerLevel * (unitProgress.level - 1);
  hp *= growthMultiplier;
  damage *= growthMultiplier;

  return {
    ...base,
    hp: Math.round(hp),
    damage: Math.round(damage * 100) / 100,
    critChance,
    rechargeMs: Math.round(rechargeMs),
  };
}
