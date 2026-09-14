// Stamina/Energy (bible §A.9 — confirmed real reference mechanic named
// 統率力 in-game, see the bible's cross-check notes): a real-time-regenerating
// resource spent to ENTER a stage at all, separate from every other
// currency in this build (in-battle money, meta XP, Evo Shards, Growth
// Charms). Persisted in localStorage as { current, cap, lastUpdateMs } —
// `current` is only ever "true as of lastUpdateMs"; every read/write below
// re-applies whatever regen has accrued since then before doing anything
// else, so the game doesn't need to be open for Energy to refill.
//
// Deliberately NOT modeled here (out of scope for this pass, flagged so a
// later phase doesn't silently forget them): cap upgrades from Treasure
// bonuses or account milestones (bible §A.7.1/§A.9 — this build's cap is a
// flat constant), Leadership-style full-refill items, and ad-based partial
// refills.

const STORAGE_KEY = 'axieSkirmishEnergy';
const MAX_ENERGY = 100;
const REGEN_INTERVAL_MS = 60 * 1000; // 1 point per real minute — bible's own reference rate

function loadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { current: MAX_ENERGY, cap: MAX_ENERGY, lastUpdateMs: Date.now() };
    const parsed = JSON.parse(raw);
    return {
      current: typeof parsed.current === 'number' ? parsed.current : MAX_ENERGY,
      cap: typeof parsed.cap === 'number' ? parsed.cap : MAX_ENERGY,
      lastUpdateMs: typeof parsed.lastUpdateMs === 'number' ? parsed.lastUpdateMs : Date.now(),
    };
  } catch {
    return { current: MAX_ENERGY, cap: MAX_ENERGY, lastUpdateMs: Date.now() };
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
  if (state.current >= state.cap) {
    state.lastUpdateMs = Date.now();
    save(state);
    return state;
  }

  const elapsedMs = Date.now() - state.lastUpdateMs;
  const pointsRegenerated = Math.floor(elapsedMs / REGEN_INTERVAL_MS);

  if (pointsRegenerated > 0) {
    state.current = Math.min(state.cap, state.current + pointsRegenerated);
    // Only advance lastUpdateMs by the whole intervals actually consumed,
    // not all the way to now — otherwise partial progress toward the NEXT
    // point would be silently discarded.
    state.lastUpdateMs += pointsRegenerated * REGEN_INTERVAL_MS;
  }

  save(state);
  return state;
}

export function getEnergyState() {
  const { current, cap } = applyRegen();
  return { current, cap };
}

export function getMsUntilNextPoint() {
  const state = applyRegen();
  if (state.current >= state.cap) return 0;
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
