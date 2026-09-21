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
import { loadPlayerProgress, getUnitProgress, isUnitUnlocked } from './PlayerProgress.js';

const STORAGE_KEY = 'axieSkirmishFormations';
// Legacy single-Formation save (pre-dating multiple slots) — read once for
// migration only; never written to again.
const LEGACY_STORAGE_KEY = 'axieSkirmishLoadout';

// UNIT_CONFIG's own declared key order — Tripp, Olek, Shillin, Puffy, Buba,
// Noir, Momo, Mit, Temujin, Xia — doubles as every unit's permanent "home"
// deploy-bar slot (see rosterSlot/defaultSlotArray below), per the user's
// own request: Tripp top-left, Olek next, Shillin next, and so on. A unit's
// button always lives at its own fixed index in the MAX_LOADOUT_SIZE-length
// `unitKeys` array from here on — unitKeys is a SPARSE array (holes are
// `null`, never compacted away) specifically so seating a newly-unlocked
// unit at ITS OWN slot can never shift any other unit's already-placed
// button into a different slot, which a compacted push/insert would do the
// moment two units unlock out of their roster declaration order (a real
// case here: Buba unlocks at stage5, Puffy — declared earlier in the
// roster — not until stage6).
const ROSTER_KEYS = Object.keys(UNIT_CONFIG);

function rosterSlot(key) {
  return ROSTER_KEYS.indexOf(key);
}

// A brand-new Formation: every currently-unlocked unit seated at its own
// fixed roster slot, locked ones left as empty (null) slots.
function defaultSlotArray() {
  const arr = new Array(MAX_LOADOUT_SIZE).fill(null);
  ROSTER_KEYS.forEach((key, index) => {
    if (index < MAX_LOADOUT_SIZE && isUnitUnlocked(key)) arr[index] = key;
  });
  return arr;
}

// `seenUnits` (per slot) is what lets a LATER unlock auto-seat itself
// without also re-adding a unit the player deliberately benched earlier —
// every unit unlocked as of the last save (whether currently included or
// not) is "seen"; only a unit that unlocks AFTER that point is still
// eligible for the one-time auto-seat in sanitizeSlot below.
function defaultSlot(name) {
  return { name, unitKeys: defaultSlotArray(), seenUnits: ROSTER_KEYS.filter((key) => isUnitUnlocked(key)) };
}

// A player's existing single-Formation save (if any) becomes slot 1 the
// first time this runs, rather than being silently discarded by this
// feature's arrival. Re-seats each previously-included unit at its own
// fixed roster slot (falling back to the first open slot on a collision,
// which real data never actually has) so an old, arbitrarily-ordered save
// upgrades straight into the new fixed-slot layout instead of keeping
// whatever order it happened to have.
function migrateLegacySlot() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validKeys = parsed.filter((key) => UNIT_CONFIG[key]).slice(0, MAX_LOADOUT_SIZE);
    if (validKeys.length === 0) return null;

    const arr = new Array(MAX_LOADOUT_SIZE).fill(null);
    validKeys.forEach((key) => {
      const home = rosterSlot(key);
      const target = home !== -1 && arr[home] == null ? home : arr.findIndex((slotKey) => slotKey == null);
      if (target !== -1) arr[target] = key;
    });
    return arr;
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
      i === 0 && migrated
        ? { name: 'Formation 1', unitKeys: migrated, seenUnits: migrated.filter(Boolean) }
        : defaultSlot(`Formation ${i + 1}`),
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

// Rebuilds a clean, fixed-length sparse array from a slot's raw saved
// unitKeys — drops anything that's no longer a real UNIT_CONFIG key and
// discards any entry past index MAX_LOADOUT_SIZE-1, same defensive intent
// the old (compacted) sanitizeUnitKeys had.
function cleanUnitKeys(rawKeys) {
  const arr = new Array(MAX_LOADOUT_SIZE).fill(null);
  (rawKeys || []).forEach((key, index) => {
    // The isUnitUnlocked check guards against a real observed anomaly: a
    // unit stuck occupying a deploy slot after becoming locked again (e.g.
    // an unlockRequirement edited during dev against an existing save) —
    // stage progress itself never regresses in normal play, but nothing
    // else in this file double-checks it on every load, so a stale save
    // could otherwise show a unit in the Formation the roster screen
    // itself marks "Locked", and GameScene would happily deploy it anyway.
    if (index < MAX_LOADOUT_SIZE && key && UNIT_CONFIG[key] && isUnitUnlocked(key) && !arr.includes(key)) {
      arr[index] = key;
    }
  });
  return arr;
}

// Guards against a stale/corrupt save AND auto-seats any unit that's
// unlocked since this slot was last written (see `seenUnits` above) —
// each such unit lands in its own fixed roster slot if that's free, or the
// first open slot otherwise, and is added to `seenUnits` so it's never
// auto-touched again (a later manual bench of it sticks for good).
function sanitizeSlot(slot) {
  const arr = cleanUnitKeys(slot.unitKeys);
  const seenUnits = new Set(
    Array.isArray(slot.seenUnits) ? slot.seenUnits.filter((key) => UNIT_CONFIG[key]) : arr.filter(Boolean),
  );

  let changed = false;
  ROSTER_KEYS.forEach((key) => {
    if (seenUnits.has(key) || !isUnitUnlocked(key)) return;
    if (arr.includes(key)) {
      seenUnits.add(key);
      return;
    }
    const home = rosterSlot(key);
    const target = arr[home] == null ? home : arr.findIndex((slotKey) => slotKey == null);
    if (target === -1) return; // Formation already full (all 10 roster units unlocked+included) — nothing to do
    arr[target] = key;
    seenUnits.add(key);
    changed = true;
  });

  if (!arr.some(Boolean)) {
    // Corrupt/empty save (every entry was invalid) — a totally empty
    // Formation isn't a usable state, so fall back to a clean default.
    return { slot: defaultSlot(slot.name), changed: true };
  }

  return { slot: { name: slot.name, unitKeys: arr, seenUnits: [...seenUnits] }, changed };
}

export function loadFormationsData() {
  const data = load();
  let dirty = false;
  data.slots = data.slots.map((slot) => {
    const { slot: sanitized, changed } = sanitizeSlot(slot);
    if (changed) dirty = true;
    return sanitized;
  });
  // Persist immediately so a fresh unlock's auto-seat survives a reload,
  // not just this one in-memory read.
  if (dirty) save(data);
  return data;
}

export function setActiveFormationSlot(index) {
  const data = load();
  if (index < 0 || index >= data.slots.length) return;
  data.activeSlot = index;
  save(data);
}

// The ACTIVE slot's unit list — this is what GameScene actually deploys
// with. A sparse MAX_LOADOUT_SIZE-length array (unitKeys[i] is the unit
// permanently seated in deploy-bar slot i, or null for an empty slot) —
// GameScene.createSpawnButtons already reads it exactly this way.
export function loadLoadout() {
  const data = loadFormationsData();
  return data.slots[data.activeSlot]?.unitKeys ?? defaultSlotArray();
}

// Toggles one unit's Formation membership. Removing just clears its own
// slot to null (nothing else shifts). Adding seats it at its own fixed
// roster slot if that's free, otherwise the first open slot — see the
// module comment up top for why this (not a compacted push) is what keeps
// this the user explicitly asked for: unit buttons never move just because
// another one joined or left.
export function toggleUnitInActiveFormation(type) {
  const data = load();
  const slot = data.slots[data.activeSlot];
  const arr = cleanUnitKeys(slot.unitKeys);

  const currentIndex = arr.indexOf(type);
  let result = 'ok';
  if (currentIndex !== -1) {
    if (arr.filter(Boolean).length <= 1) {
      result = 'min-one'; // at least one unit must always stay in the Formation
    } else {
      arr[currentIndex] = null;
    }
  } else {
    const home = rosterSlot(type);
    const target = home !== -1 && arr[home] == null ? home : arr.findIndex((key) => key == null);
    if (target === -1) {
      result = 'full';
    } else {
      arr[target] = type;
    }
  }

  if (result === 'ok') {
    // Every currently-unlocked unit counts as "seen" the moment the player
    // actively edits this Formation — only a unit that unlocks AFTER this
    // point is still eligible for sanitizeSlot's one-time auto-seat.
    const seenUnits = ROSTER_KEYS.filter((key) => isUnitUnlocked(key));
    data.slots[data.activeSlot] = { ...slot, unitKeys: arr, seenUnits };
    save(data);
  }
  return { result, unitKeys: arr };
}

// Manual reorder — the "customizable in Character Formation" half of the
// user's request. Swaps whatever occupies these two deploy-bar slots
// (either may be empty); this is a pure position swap, so it never touches
// which units are actually included.
export function swapFormationSlots(indexA, indexB) {
  const data = load();
  const slot = data.slots[data.activeSlot];
  const arr = cleanUnitKeys(slot.unitKeys);
  if (indexA < 0 || indexA >= MAX_LOADOUT_SIZE || indexB < 0 || indexB >= MAX_LOADOUT_SIZE) return arr;

  [arr[indexA], arr[indexB]] = [arr[indexB], arr[indexA]];
  data.slots[data.activeSlot] = { ...slot, unitKeys: arr };
  save(data);
  return arr;
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
// stand-in for "bring my best units" without it. Still seats every chosen
// unit at its own fixed roster slot (not pick-order) so Auto-Equip doesn't
// scramble deploy-bar positions either.
export function autoEquipActiveSlot() {
  const data = load();
  const progress = loadPlayerProgress();
  const pinnedSet = new Set(data.pinned);
  const unlockedKeys = ROSTER_KEYS.filter((key) => isUnitUnlocked(key));

  const pinnedKeys = unlockedKeys.filter((key) => pinnedSet.has(key));
  const rest = unlockedKeys
    .filter((key) => !pinnedSet.has(key))
    .sort((a, b) => {
      const levelDiff = getUnitProgress(progress, b).level - getUnitProgress(progress, a).level;
      return levelDiff !== 0 ? levelDiff : UNIT_CONFIG[b].cost - UNIT_CONFIG[a].cost;
    });

  const chosen = [...pinnedKeys, ...rest].slice(0, MAX_LOADOUT_SIZE);
  const arr = new Array(MAX_LOADOUT_SIZE).fill(null);
  chosen.forEach((key) => {
    const home = rosterSlot(key);
    const target = home !== -1 && arr[home] == null ? home : arr.findIndex((slotKey) => slotKey == null);
    if (target !== -1) arr[target] = key;
  });

  data.slots[data.activeSlot] = { ...data.slots[data.activeSlot], unitKeys: arr, seenUnits: unlockedKeys };
  save(data);
  return arr;
}
