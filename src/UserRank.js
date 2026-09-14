// Account-wide User Rank (bible §A.7.4) — "a single account-wide score,
// incremented by leveling units, evolving them, and clearing content." This
// build deliberately does NOT wire it into any new content gate — the bible
// lists User Rank as gating which stages/difficulties unlock, but this
// project's saga/stage progression already has its own complete, working
// gate (STAGE_CONFIG's sequential chain + SAGA_CONFIG's per-saga clear
// check); layering a second, redundant gate on top would only risk locking
// a player out of stages they can already see and play. Rank here is purely
// a tracked, displayed progression signal — the same "number that only goes
// up" satisfaction the real game's rank provides.

const STORAGE_KEY = 'axieSkirmishUserRank';

export function getUserRank() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function addUserRank(amount) {
  const next = getUserRank() + amount;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // localStorage unavailable — the increment just won't persist this run.
  }
  return next;
}
