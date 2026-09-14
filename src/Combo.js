// Resolves which Cat-Combo-equivalent bonuses (bible §A.7.3, COMBO_CONFIG.js)
// are currently active for a given Formation/Loadout, and sums up bonus
// values by type. No persistence here — combos are purely a function of
// "which units are in the current Loadout," recomputed fresh every battle.

import { COMBO_CONFIG } from './COMBO_CONFIG.js';

export function getActiveCombos(loadout) {
  const loadoutSet = new Set(loadout);
  return COMBO_CONFIG.filter((combo) => combo.requiredUnitTypes.every((type) => loadoutSet.has(type)));
}

export function getComboBonusValue(loadout, type) {
  return getActiveCombos(loadout)
    .filter((combo) => combo.bonus.type === type)
    .reduce((sum, combo) => sum + combo.bonus.value, 0);
}
