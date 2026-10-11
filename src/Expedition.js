// Expedition (Round 2's take on Battle Cats' Gamatoto): send your Axies out
// for a real-time trip, come back later to collect rewards. A light
// return-to-the-game loop that keeps working between sessions. Single
// active expedition, stored in its own key (no existing save shape changes).
import { addXp, addEvoShards, addGrowthCharms } from './PlayerProgress.js';
import { addEnergy } from './Energy.js';

const STORAGE_KEY = 'axieSkirmishExpedition';

export const EXPEDITION_OPTIONS = [
  { id: 'short', label: '15 min', durationMs: 15 * 60 * 1000, xp: 1500, bonusChance: 0.15 },
  { id: 'medium', label: '1 hour', durationMs: 60 * 60 * 1000, xp: 5000, bonusChance: 0.4 },
  { id: 'long', label: '4 hours', durationMs: 4 * 60 * 60 * 1000, xp: 18000, bonusChance: 1 },
];

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && typeof parsed.startedAt === 'number' && EXPEDITION_OPTIONS.some((o) => o.id === parsed.optionId)) return parsed;
  } catch {
    // corrupt — treat as no expedition
  }
  return null;
}

function save(value) {
  try {
    // Always setItem (even to clear): a failed/unsupported removeItem would
    // leave a finished trip in place and let it be collected twice.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value ?? null));
  } catch {
    // storage unavailable
  }
}

// { state: 'idle' } | { state: 'away', option, remainingMs } | { state: 'ready', option }
export function getExpeditionStatus(now = Date.now()) {
  const exp = load();
  if (!exp) return { state: 'idle' };
  const option = EXPEDITION_OPTIONS.find((o) => o.id === exp.optionId);
  const remainingMs = exp.startedAt + option.durationMs - now;
  return remainingMs > 0 ? { state: 'away', option, remainingMs } : { state: 'ready', option };
}

export function startExpedition(optionId, now = Date.now()) {
  if (getExpeditionStatus(now).state !== 'idle') return false;
  if (!EXPEDITION_OPTIONS.some((o) => o.id === optionId)) return false;
  save({ optionId, startedAt: now });
  return true;
}

// Grants and clears; returns a list of { label } lines, or null if not ready.
export function collectExpedition(now = Date.now()) {
  const status = getExpeditionStatus(now);
  if (status.state !== 'ready') return null;
  save(null); // clear first so a double-tap can't pay twice
  const { option } = status;
  const lines = [`+${option.xp.toLocaleString()} XP`];
  addXp(option.xp);
  if (Math.random() < option.bonusChance) {
    const roll = Math.random();
    if (roll < 0.4) {
      addEnergy(30);
      lines.push('+30 Energy');
    } else if (roll < 0.75) {
      addEvoShards(1);
      lines.push('+1 Evo Shard');
    } else {
      addGrowthCharms(1);
      lines.push('+1 Growth Charm');
    }
  }
  return lines;
}

export function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}:${String(s).padStart(2, '0')}`;
}
