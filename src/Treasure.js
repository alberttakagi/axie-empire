// Treasure drop/ratchet/bonus-bank logic (bible §A.6.3). Persisted in
// localStorage as { [stageId]: tier }, tier being 0 (none) / 1 (bronze,
// "Inferior") / 2 (silver, "Normal") / 3 (gold, "Superior").

import { TREASURE_SETS } from './TREASURE_CONFIG.js';

const STORAGE_KEY = 'axieSkirmishTreasure';

// Bible reference values: ~35% chance to drop anything on a clear, then a
// 45/30/25 bronze/silver/gold split AMONG drops (not of all clears).
const DROP_CHANCE = 0.35;
const TIER_WEIGHTS = [
  { tier: 1, weight: 0.45 },
  { tier: 2, weight: 0.3 },
  { tier: 3, weight: 0.25 },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable — treasure progress won't persist this run.
  }
}

export function getStageTier(stageId) {
  return load()[stageId] || 0;
}

function rollTier() {
  const roll = Math.random();
  let cumulative = 0;
  for (const { tier, weight } of TIER_WEIGHTS) {
    cumulative += weight;
    if (roll <= cumulative) return tier;
  }
  return TIER_WEIGHTS[TIER_WEIGHTS.length - 1].tier;
}

// Called from GameScene.winStage. Ratchets — a roll that comes in below the
// stage's already-obtained tier changes nothing (bible: "once a tier is
// obtained, replays can only ever match or upgrade it, never downgrade").
// Returns { tier, improved } — `tier` is the NEW current tier for this stage
// (unchanged if nothing dropped or the roll didn't beat it), `improved` is
// whether this specific clear actually raised it (what the results screen
// should announce).
export function rollTreasureForStage(stageId) {
  const progress = load();
  const existingTier = progress[stageId] || 0;

  if (Math.random() > DROP_CHANCE) {
    return { tier: existingTier, improved: false };
  }

  const rolledTier = rollTier();
  if (rolledTier <= existingTier) {
    return { tier: existingTier, improved: false };
  }

  progress[stageId] = rolledTier;
  save(progress);
  return { tier: rolledTier, improved: true };
}

// Treasure Radar (bible §A.8): bypasses the normal drop-chance/tier-roll
// entirely and forces this stage's tier straight to gold — still trivially
// respects the ratchet (gold is the max tier, so this can never "downgrade"
// anything the same way a low roll from rollTreasureForStage wouldn't).
export function guaranteeTopTier(stageId) {
  const progress = load();
  const existingTier = progress[stageId] || 0;
  const TOP_TIER = 3;

  if (existingTier >= TOP_TIER) return { tier: TOP_TIER, improved: false };

  progress[stageId] = TOP_TIER;
  save(progress);
  return { tier: TOP_TIER, improved: true };
}

// Fraction (0-1) of `set` currently completed — the average of each
// stage's tier/3 (bible §A.6.3's formula), NOT "how many stages have any
// treasure" — a set of all-bronze reads as 33% complete, not 100%.
export function getSetCompletion(set) {
  const progress = load();
  const total = set.stageIds.reduce((sum, stageId) => sum + (progress[stageId] || 0) / 3, 0);
  return total / set.stageIds.length;
}

// Current bonus % for one set, scaled linearly by its completion fraction.
export function getSetBonusPercent(set) {
  return getSetCompletion(set) * set.bonus.valueAtMax;
}

// Summed bonus % across every set whose bonus.type matches — this is what
// GameScene actually reads (e.g. getBonusPercent('unitHpPercent')), since a
// stat category isn't necessarily tied to just one set.
export function getBonusPercent(type) {
  return TREASURE_SETS.filter((set) => set.bonus.type === type).reduce(
    (sum, set) => sum + getSetBonusPercent(set),
    0,
  );
}

// Full per-set summary for TreasureScene: completion %, current bonus
// value, and each stage's tier (for rendering bronze/silver/gold dots).
export function getTreasureSummary() {
  return TREASURE_SETS.map((set) => ({
    set,
    completion: getSetCompletion(set),
    bonusPercent: getSetBonusPercent(set),
    stageTiers: set.stageIds.map((stageId) => ({ stageId, tier: getStageTier(stageId) })),
  }));
}
