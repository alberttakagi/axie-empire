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

import { refillEnergy } from './Energy.js';

const STORAGE_KEY = 'axieSkirmishUserRank';

// Real Battle Cats: rank does NOT raise max Energy on its own (that's the
// staminaCap Base Upgrade, exclusively — see Energy.js), and rank itself
// doesn't auto-refill either. What actually happens is User Rank reward
// tiers periodically hand out a "Leadership" item (a full Energy refill).
// A fixed milestone cadence here is a simplified stand-in for that same
// reward table, without building out the real game's full per-rank-tier
// reward list.
const RANK_MILESTONE_INTERVAL = 25;

export function getUserRank() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function addUserRank(amount) {
  const prev = getUserRank();
  const next = prev + amount;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // localStorage unavailable — the increment just won't persist this run.
  }

  if (Math.floor(next / RANK_MILESTONE_INTERVAL) > Math.floor(prev / RANK_MILESTONE_INTERVAL)) {
    refillEnergy();
  }

  return next;
}
