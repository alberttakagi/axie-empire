// Persisted Formation/Loadout (bible §A.10.3 "Pre-Battle Loadout ('Equip')
// Screen") — which units are actually available to deploy in battle.
// Simplified from the bible's multiple-named-saved-slots system (reference:
// up to a dozen-plus formations) down to a single active formation, since
// this build's 5-unit roster doesn't yet justify maintaining several.
//
// Persisted as a plain array of UNIT_CONFIG keys. Defaults to every unit
// selected (so a player who never opens the Loadout screen sees the exact
// same 5-button row this build always had — no surprise regression).

import { UNIT_CONFIG } from './UNIT_CONFIG.js';

const STORAGE_KEY = 'axieSkirmishLoadout';

function allUnitKeys() {
  return Object.keys(UNIT_CONFIG);
}

export function loadLoadout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return allUnitKeys();

    const parsed = JSON.parse(raw);
    // Guard against a stale save referencing a unit key that no longer
    // exists (e.g. UNIT_CONFIG changed since), and against an empty/corrupt
    // save leaving the player with zero deployable units.
    const valid = parsed.filter((key) => UNIT_CONFIG[key]);
    return valid.length > 0 ? valid : allUnitKeys();
  } catch {
    return allUnitKeys();
  }
}

export function saveLoadout(selectedKeys) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys));
  } catch {
    // localStorage unavailable — the selection just won't persist this run.
  }
}
