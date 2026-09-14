// Persisted Formation/Loadout (bible §A.10.3 "Pre-Battle Loadout ('Equip')
// Screen") — which units are actually available to deploy in battle.
//
// MAX_LOADOUT_SIZE mirrors the reference game's own real mechanic: owning a
// large roster doesn't mean every unit rides along into every battle — you
// assemble a capped Deck/Formation beforehand, and the in-battle deploy bar
// only ever shows that capped subset. Set to 10 to match the real game's
// own Deck size exactly (and, right now, this build's entire roster — see
// UNIT_CONFIG.js — so in practice every owned unit can ride along at once;
// the cap stays in place for when the roster eventually grows past 10).
// GameScene.js's createSpawnButtons wraps the deploy bar into rows of 5 to
// fit any Formation size on the 800px-wide canvas.
export const MAX_LOADOUT_SIZE = 10;

// Multiple saved Formation slots (bible §A.10.3: "expandable well past a
// dozen" in the reference game) — simplified to a fixed 3 here rather than
// building slot-adding/removing UI, since 3 already covers "one Formation
// per saga's own roster" without the added complexity of a variable-length
// list. Each slot is independently a full Formation; switching the active
// one is instant (no re-picking every time you want a different setup).
export const FORMATION_SLOT_COUNT = 3;

import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { loadPlayerProgress, getUnitProgress } from './PlayerProgress.js';

const STORAGE_KEY = 'axieSkirmishFormations';
// Legacy single-Formation save (pre-dating multiple slots) — read once for
// migration only; never written to again.
const LEGACY_STORAGE_KEY = 'axieSkirmishLoadout';

function defaultUnitKeys() {
  return Object.keys(UNIT_CONFIG).slice(0, MAX_LOADOUT_SIZE);
}

function defaultSlot(name) {
  return { name, unitKeys: defaultUnitKeys() };
}

// A player's existing single-Formation save (if any) becomes slot 1 the
// first time this runs, rather than being silently discarded by this
// feature's arrival.
function migrateLegacySlot() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const valid = parsed.filter((key) => UNIT_CONFIG[key]).slice(0, MAX_LOADOUT_SIZE);
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.slots) && parsed.slots.length === FORMATION_SLOT_COUNT) return parsed;
    }
  } catch {
    // falls through to a fresh default below
  }

  const migrated = migrateLegacySlot();
  return {
    activeSlot: 0,
    slots: Array.from({ length: FORMATION_SLOT_COUNT }, (_, i) =>
      i === 0 && migrated ? { name: 'Formation 1', unitKeys: migrated } : defaultSlot(`Formation ${i + 1}`),
    ),
    pinned: [],
  };
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable — changes just won't persist this run.
  }
}

// Guards against a stale unitKeys array (a UNIT_CONFIG key that no longer
// exists, an empty/corrupt save, or a legacy array over the current cap).
function sanitizeUnitKeys(unitKeys) {
  const valid = (unitKeys || []).filter((key) => UNIT_CONFIG[key]).slice(0, MAX_LOADOUT_SIZE);
  return valid.length > 0 ? valid : defaultUnitKeys();
}

export function loadFormationsData() {
  const data = load();
  data.slots = data.slots.map((slot) => ({ ...slot, unitKeys: sanitizeUnitKeys(slot.unitKeys) }));
  return data;
}

export function setActiveFormationSlot(index) {
  const data = load();
  if (index < 0 || index >= data.slots.length) return;
  data.activeSlot = index;
  save(data);
}

// The ACTIVE slot's unit list — this is what GameScene actually deploys
// with. Kept as its own function (rather than making every caller reach
// into loadFormationsData()) since this is the one thing outside
// LoadoutScene that needs it.
export function loadLoadout() {
  const data = load();
  return sanitizeUnitKeys(data.slots[data.activeSlot]?.unitKeys);
}

export function saveLoadout(selectedKeys) {
  const data = load();
  data.slots[data.activeSlot] = { ...data.slots[data.activeSlot], unitKeys: selectedKeys.slice(0, MAX_LOADOUT_SIZE) };
  save(data);
}

// Pin (bible §A.10.3): "so Auto-Equip won't swap out a player's favorites."
// Account-wide (not per-slot) — a unit you've marked a favorite stays a
// favorite regardless of which Formation you're currently editing.
export function isPinned(unitType) {
  return load().pinned.includes(unitType);
}

export function togglePinned(unitType) {
  const data = load();
  const set = new Set(data.pinned);
  if (set.has(unitType)) set.delete(unitType);
  else set.add(unitType);
  data.pinned = [...set];
  save(data);
}

// Auto-Equip (bible §A.10.3): fills the ACTIVE slot with every pinned unit
// first, then the player's highest-level units (cost as a tiebreak) —
// simplified from the bible's "based on the currently-selected stage's
// known enemy composition" version, which would need stage context this
// screen doesn't have; "bring my most-invested-in units" is a reasonable
// stand-in for "bring my best units" without it.
export function autoEquipActiveSlot() {
  const data = load();
  const progress = loadPlayerProgress();
  const pinnedSet = new Set(data.pinned);
  const allKeys = Object.keys(UNIT_CONFIG);

  const pinnedKeys = allKeys.filter((key) => pinnedSet.has(key));
  const rest = allKeys
    .filter((key) => !pinnedSet.has(key))
    .sort((a, b) => {
      const levelDiff = getUnitProgress(progress, b).level - getUnitProgress(progress, a).level;
      return levelDiff !== 0 ? levelDiff : UNIT_CONFIG[b].cost - UNIT_CONFIG[a].cost;
    });

  const unitKeys = [...pinnedKeys, ...rest].slice(0, MAX_LOADOUT_SIZE);
  data.slots[data.activeSlot] = { ...data.slots[data.activeSlot], unitKeys };
  save(data);
  return unitKeys;
}
