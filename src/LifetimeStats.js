// localStorage-backed lifetime activity counters — separate from
// PlayerProgress.js (meta currencies/unit levels) and StageProgress.js
// (per-stage cleared/bestScore/clears) because none of these are "per
// stage" or "spendable currency": they're cumulative totals across every
// battle ever played, that only ever go up. Exists purely to back
// Missions.js's activity-based missions (deploy N units, deal N damage,
// etc.) — nothing else in the game reads these.

const STORAGE_KEY = 'axieSkirmishLifetimeStats';

const DEFAULTS = {
  unitsDeployed: 0,
  enemiesDefeated: 0,
  damageDealt: 0,
  cannonUses: 0,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // localStorage unavailable (private mode, quota) — the increment just won't persist this run.
  }
}

export function loadLifetimeStats() {
  return load();
}

// Adds `amount` (default 1) to one counter and persists immediately —
// called from GameScene right at the moment each activity happens (unit
// deployed, enemy killed, damage dealt, cannon fired) rather than batched
// at battle-end, so progress survives even a mid-battle refresh/crash.
export function addLifetimeStat(key, amount = 1) {
  const stats = load();
  stats[key] = (stats[key] || 0) + amount;
  save(stats);
  return stats;
}
