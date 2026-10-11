// Gacha-only unit ownership (Round 2 unit collection). Units whose
// UNIT_CONFIG.unlockRequirement is { gacha: true } are unlocked by owning
// them here — pulled from the Rare Capsule (see Gacha.js). Kept in its own
// storage key so no existing save shape changes.
const STORAGE_KEY = 'axieSkirmishOwnedUnits';

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable — ownership just won't persist this run
  }
}

export function isUnitOwned(unitType) {
  return load().includes(unitType);
}

export function getOwnedUnits() {
  return load();
}

// Returns true if this was a NEW unit (false = duplicate).
export function addOwnedUnit(unitType) {
  const list = load();
  if (list.includes(unitType)) return false;
  list.push(unitType);
  save(list);
  return true;
}
