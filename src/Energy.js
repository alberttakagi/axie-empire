// Stamina/Energy (bible §A.9 — confirmed real reference mechanic named
// 統率力 in-game, see the bible's cross-check notes): a real-time-regenerating
// resource spent to ENTER a stage at all, separate from every other
// currency in this build (in-battle money, meta XP, Gems, Evo Shards,
// Growth Charms). Persisted in localStorage as { current, lastUpdateMs } —
// note there's no stored `cap`: the cap is always computed LIVE from the
// staminaCap Base Upgrade (bible §A.7.1) via getMaxEnergy(), so buying that
// upgrade takes effect immediately rather than needing a stored value
// resynced. `current` is only ever "true as of lastUpdateMs"; every
// read/write below re-applies whatever regen has accrued since then before
// doing anything else, so the game doesn't need to be open for Energy to
// refill.
//
// Deliberately NOT modeled here (out of scope for this pass): Leadership-
// style full-refill items and ad-based partial refills.

import { getBaseUpgradeLevel } from './PlayerProgress.js';
import { BASE_UPGRADE_CONFIG } from './BASE_UPGRADE_CONFIG.js';
import { getBonusPercent } from './Treasure.js';

const STORAGE_KEY = 'axieSkirmishEnergy';
const BASE_MAX_ENERGY = 100;
const REGEN_INTERVAL_MS = 60 * 1000; // 1 point per real minute — bible's own reference rate

export function getMaxEnergy() {
  const level = getBaseUpgradeLevel('staminaCap');
  // Treasure's own staminaCapFlat (real BC: 南国の風 et al.) stacks as a
  // further flat add, same as the Base Upgrade above — see
  // TREASURE_CONFIG.js's header for why this one is flat, not a percent.
  return Math.round(BASE_MAX_ENERGY + level * BASE_UPGRADE_CONFIG.staminaCap.perLevelEffect + getBonusPercent('staminaCapFlat'));
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { current: getMaxEnergy(), lastUpdateMs: Date.now() };
    const parsed = JSON.parse(raw);
    return {
      current: typeof parsed.current === 'number' ? parsed.current : getMaxEnergy(),
      lastUpdateMs: typeof parsed.lastUpdateMs === 'number' ? parsed.lastUpdateMs : Date.now(),
    };
  } catch {
    return { current: getMaxEnergy(), lastUpdateMs: Date.now() };
  }
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — energy just won't persist between sessions this run.
  }
}

// Applies however much regen has accrued since the last save, persists the
// result (so the "whole minutes already consumed" isn't re-granted on the
// next call), and returns the up-to-date state. Every other function in
// this file routes through this first.
function applyRegen() {
  const state = loadRaw();
  const cap = getMaxEnergy();

  if (state.current >= cap) {
    state.current = cap; // clamp down if a staminaCap... this never actually shrinks, but stay defensive
    state.lastUpdateMs = Date.now();
    save(state);
    return state;
  }

  const elapsedMs = Date.now() - state.lastUpdateMs;
  const pointsRegenerated = Math.floor(elapsedMs / REGEN_INTERVAL_MS);

  if (pointsRegenerated > 0) {
    state.current = Math.min(cap, state.current + pointsRegenerated);
    // Only advance lastUpdateMs by the whole intervals actually consumed,
    // not all the way to now — otherwise partial progress toward the NEXT
    // point would be silently discarded.
    state.lastUpdateMs += pointsRegenerated * REGEN_INTERVAL_MS;
  }

  save(state);
  return state;
}

export function getEnergyState() {
  const { current } = applyRegen();
  return { current, cap: getMaxEnergy() };
}

export function getMsUntilNextPoint() {
  const state = applyRegen();
  if (state.current >= getMaxEnergy()) return 0;
  return REGEN_INTERVAL_MS - ((Date.now() - state.lastUpdateMs) % REGEN_INTERVAL_MS);
}

// Attempts to spend `amount` energy (a stage's entry cost). Returns false
// (spending nothing) if there isn't enough, even after applying regen —
// the caller should block stage entry in that case, per the bible.
export function trySpendEnergy(amount) {
  const state = applyRegen();
  if (state.current < amount) return false;

  state.current -= amount;
  save(state);
  return true;
}

// Real Battle Cats' own answer to "I'm brand new and always out of
// Energy": rank does NOT raise the cap (that's the staminaCap Base
// Upgrade above, exclusively) and does NOT auto-refill on its own — what
// actually happens is User Rank rewards periodically contain a
// "Leadership" item, a full refill you receive and use. UserRank.js calls
// this on crossing a rank milestone as a simplified stand-in for that
// same reward, without building out a whole reward-tier table.
export function refillEnergy() {
  const state = applyRegen();
  state.current = getMaxEnergy();
  state.lastUpdateMs = Date.now();
  save(state);
}
