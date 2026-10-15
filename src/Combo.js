// Resolves which Cat-Combo-equivalent bonuses (bible §A.7.3, COMBO_CONFIG.js)
// are currently active for a given Formation/Loadout, and sums up bonus
// values by type. No persistence here — combos are purely a function of
// "which units are in the current Loadout," recomputed fresh every battle.

import { COMBO_CONFIG } from './COMBO_CONFIG.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { classOfUnit } from './AXIE_CLASSES.js';

const SIDE = { reptile: 0, plant: 0, dusk: 0, aquatic: 1, bird: 1, dawn: 1, beast: 2, bug: 2, mech: 2 };

export function getActiveCombos(loadout) {
  const loadoutSet = new Set(loadout);
  const classes = [...loadoutSet].filter((k) => UNIT_CONFIG[k]).map((k) => classOfUnit(UNIT_CONFIG[k])).filter(Boolean);
  return COMBO_CONFIG.filter((combo) => {
    if (combo.requiredClass) return classes.filter((c) => c === combo.requiredClass.cls).length >= combo.requiredClass.count;
    if (combo.requiredSides) return new Set(classes.map((c) => SIDE[c])).size === 3;
    return combo.requiredUnitTypes.every((type) => loadoutSet.has(type));
  });
}

export function getComboBonusValue(loadout, type) {
  return getActiveCombos(loadout)
    .filter((combo) => combo.bonus.type === type)
    .reduce((sum, combo) => sum + combo.bonus.value, 0);
}
