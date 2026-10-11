// Gacha-only unit ownership (Round 2 unit collection). Units whose
// UNIT_CONFIG.unlockRequirement is { gacha: true } are unlocked by owning
// them here — pulled from the Rare Capsule (see Gacha.js). Kept in its own
// storage key so no existing save shape changes.
const STORAGE_KEY = 'axieSkirmishOwnedUnits';

// In-memory mirror: isUnitUnlocked runs this for every collection unit on
// every Formation rebuild (no repeated JSON.parse), and ownership/dupe
// logic stays correct for the session even when storage writes fail
// (Safari private mode, full quota).
let cache = null;

function load() {
  if (cache) return cache.slice();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cache = Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
  } catch {
    cache = [];
  }
  return cache.slice();
}

function save(list) {
  cache = list.slice();
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

// Test hook: drop the in-memory mirror (tests swap localStorage per case).
export function _resetUnitCollectionCache() {
  cache = null;
}
