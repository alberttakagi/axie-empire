// localStorage-backed record of the player's META progression — XP, evolution
// materials, and each unit's level/evolution stage. This is a completely
// separate pool from in-battle "money" (GameScene's this.money/wallet) and
// from StageProgress.js's per-stage cleared/bestScore tracking; see the
// bible's glossary note on XP vs. in-battle cash being two genuinely
// different currencies.
//
// Shape:
// {
//   xp: number,
//   gems: number,
//   evoShards: number,
//   growthCharms: number,
//   units: {
//     [unitType]: { level: number, extraCap: number, evolutionStage: number }
//   },
//   baseUpgrades: { [BASE_UPGRADE_CONFIG key]: number }
// }
// A unit not yet present in `units` is treated as level 1, extraCap 0,
// evolutionStage 0 (Normal Form) — see getUnitProgress. A category not yet
// present in `baseUpgrades` is treated as level 0 — see getBaseUpgradeLevel.
//
// `gems` is the premium-currency-equivalent (bible §A.5's Cat Food) spent
// on Gacha pulls (Gacha.js/GachaScene.js) — separate from XP (the
// unit/base-upgrade currency) and from in-battle money.

import { PROGRESSION_CONFIG, STORY_GATE_LEVEL_CAP_BONUS, STORY_GATE_STAGE_ID } from './PROGRESSION_CONFIG.js';
import { BASE_UPGRADE_CONFIG } from './BASE_UPGRADE_CONFIG.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { loadStageProgress } from './StageProgress.js';
import { addUserRank } from './UserRank.js';

// User Rank (bible §A.7.4) points awarded per level-up / per evolution —
// see UserRank.js for why nothing is gated behind the resulting total.
const RANK_PER_LEVEL_UP = 1;
const RANK_PER_EVOLUTION = 10;

const STORAGE_KEY = 'axieSkirmishPlayerProgress';

const DEFAULT_UNIT_PROGRESS = { level: 1, extraCap: 0, evolutionStage: 0 };

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      xp: parsed.xp || 0,
      gems: parsed.gems || 0,
      evoShards: parsed.evoShards || 0,
      growthCharms: parsed.growthCharms || 0,
      units: parsed.units || {},
      baseUpgrades: parsed.baseUpgrades || {},
    };
  } catch {
    return { xp: 0, gems: 0, evoShards: 0, growthCharms: 0, units: {}, baseUpgrades: {} };
  }
}

function save(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable (private mode, quota) — progress just won't persist this run.
  }
}

export function loadPlayerProgress() {
  return load();
}

export function getUnitProgress(progress, unitType) {
  return progress.units[unitType] || DEFAULT_UNIT_PROGRESS;
}

// Real Battle Cats unlocks its Basic-tier roster progressively, roughly one
// lineage per early-stage clear (guide Chapter 11's per-lineage "unlock"
// column), rather than handing the player the whole roster on day one —
// UNIT_CONFIG.js's `unlockRequirement` field encodes exactly that gate:
// null = always available (Cat); { stageId } = unlocked once that
// STAGE_CONFIG entry has been cleared; { stageId: null } = never satisfied
// (the shelved Guardian/Xia slot — see UNIT_CONFIG.js's own note).
export function isUnitUnlocked(unitType) {
  const requirement = UNIT_CONFIG[unitType]?.unlockRequirement;
  if (requirement === null || requirement === undefined) return true;
  if (!requirement.stageId) return false;

  const stageProgress = loadStageProgress();
  return stageProgress[requirement.stageId]?.cleared === true;
}

// Real level-cap story gate (guide Chapter 09): every unit's level cap is
// stuck at 10 (baseLevelCap, XP alone) until the real Japan Chapter 2
// final stage is cleared, at which point it jumps to 20 for everyone —
// see PROGRESSION_CONFIG.js's STORY_GATE_STAGE_ID/STORY_GATE_LEVEL_CAP_BONUS.
export function hasStoryGateCleared() {
  const stageProgress = loadStageProgress();
  return stageProgress[STORY_GATE_STAGE_ID]?.cleared === true;
}

// Total level cap this unit can currently reach: baseLevelCap (10, XP
// alone), plus the story-gate bonus (10, once the real Chapter 2 final
// stage is cleared — see hasStoryGateCleared), plus 1 per Growth Charm
// already spent on it past that (bible §A.4.3 — a Charm raises the CAP,
// XP still pays for the level itself).
export function getUnitLevelCap(unitType) {
  const config = PROGRESSION_CONFIG[unitType];
  const unitProgress = getUnitProgress(loadPlayerProgress(), unitType);
  const storyGateBonus = hasStoryGateCleared() ? STORY_GATE_LEVEL_CAP_BONUS : 0;
  return config.baseLevelCap + storyGateBonus + unitProgress.extraCap;
}

// XP cost to go from the unit's CURRENT level to the next one.
export function getNextLevelCost(unitType) {
  const config = PROGRESSION_CONFIG[unitType];
  const progress = loadPlayerProgress();
  const unitProgress = getUnitProgress(progress, unitType);
  return Math.round(config.xpCostBase * Math.pow(unitProgress.level, 1.5));
}

// Spends XP to raise one unit's level by 1. Returns { ok, reason } rather
// than throwing, so the UI can just show why a button is disabled.
export function tryLevelUpUnit(unitType) {
  const config = PROGRESSION_CONFIG[unitType];
  const progress = loadPlayerProgress();
  const unitProgress = getUnitProgress(progress, unitType);
  const cap = getUnitLevelCap(unitType);

  if (unitProgress.level >= cap) return { ok: false, reason: 'at-cap' };

  const cost = Math.round(config.xpCostBase * Math.pow(unitProgress.level, 1.5));
  if (progress.xp < cost) return { ok: false, reason: 'insufficient-xp' };

  progress.xp -= cost;
  progress.units[unitType] = { ...unitProgress, level: unitProgress.level + 1 };
  save(progress);
  addUserRank(RANK_PER_LEVEL_UP);
  return { ok: true };
}

// Real Catseye cost per extraCap level (guide Chapter 09): 1 for most of
// the range, 2 for the final 5 levels of a unit's own maxExtraCap (real
// Lv46-50) — see PROGRESSION_CONFIG.js's header for how extraCap maps
// onto real level numbers.
export function getGrowthCharmCost(unitProgress, config) {
  return unitProgress.extraCap >= config.maxExtraCap - 5 ? 2 : 1;
}

// Spends Growth Charms to raise one unit's level CAP by 1 (bible §A.4.3) —
// only meaningful once the unit is already at its current cap; consuming
// one when it isn't just wastes it, so the UI should gate this the same
// way tryLevelUpUnit gates itself. Blocked entirely until the story gate
// is cleared — real Catseyes only ever apply past real Lv20.
export function tryUseGrowthCharm(unitType) {
  const config = PROGRESSION_CONFIG[unitType];
  const progress = loadPlayerProgress();
  const unitProgress = getUnitProgress(progress, unitType);

  if (!hasStoryGateCleared()) return { ok: false, reason: 'story-gate-locked' };
  if (unitProgress.extraCap >= config.maxExtraCap) return { ok: false, reason: 'max-extra-cap' };
  const cost = getGrowthCharmCost(unitProgress, config);
  if (progress.growthCharms < cost) return { ok: false, reason: 'no-charms' };

  progress.growthCharms -= cost;
  progress.units[unitType] = { ...unitProgress, extraCap: unitProgress.extraCap + 1 };
  save(progress);
  return { ok: true };
}

// Advances one unit to its next evolution stage (bible §A.4.4). `stageIndex`
// is 0 to evolve Normal->Evolved, 1 to evolve Evolved->True — i.e., it must
// equal the unit's CURRENT evolutionStage (you can't skip a stage).
export function tryEvolveUnit(unitType) {
  const config = PROGRESSION_CONFIG[unitType];
  const progress = loadPlayerProgress();
  const unitProgress = getUnitProgress(progress, unitType);
  const nextEvolution = config.evolutions[unitProgress.evolutionStage];

  if (!nextEvolution) return { ok: false, reason: 'max-evolution' };
  // extraCap only raises the CAP a unit can be leveled TO — the real gate
  // here is the unit's actual current level.
  if (unitProgress.level < nextEvolution.unlockLevel) return { ok: false, reason: 'level-too-low' };
  if (progress.xp < nextEvolution.xpCost) return { ok: false, reason: 'insufficient-xp' };
  if (progress.evoShards < nextEvolution.evoShardCost) return { ok: false, reason: 'insufficient-shards' };

  progress.xp -= nextEvolution.xpCost;
  progress.evoShards -= nextEvolution.evoShardCost;
  progress.units[unitType] = { ...unitProgress, evolutionStage: unitProgress.evolutionStage + 1 };
  save(progress);
  addUserRank(RANK_PER_EVOLUTION);
  return { ok: true };
}

// Stage-clear rewards (called from GameScene.winStage) — adds XP and rolls
// for evolution-material drops. Returns what was actually granted so the
// results screen can show it.
export function grantStageRewards({ xp, evoShardChance, growthCharmChance }) {
  const progress = loadPlayerProgress();
  progress.xp += xp;

  let evoShardsGranted = 0;
  if (Math.random() < evoShardChance) {
    progress.evoShards += 1;
    evoShardsGranted = 1;
  }

  let growthCharmsGranted = 0;
  if (Math.random() < growthCharmChance) {
    progress.growthCharms += 1;
    growthCharmsGranted = 1;
  }

  save(progress);
  return { xpGranted: xp, evoShardsGranted, growthCharmsGranted };
}

// --- Account-wide Base Upgrades (bible §A.7.1) ---

export function getBaseUpgradeLevel(key) {
  return loadPlayerProgress().baseUpgrades[key] || 0;
}

export function getNextBaseUpgradeCost(key) {
  const config = BASE_UPGRADE_CONFIG[key];
  const level = getBaseUpgradeLevel(key);
  return Math.round(config.xpCostBase * Math.pow(level + 1, 1.3));
}

export function tryLevelUpBaseUpgrade(key) {
  const config = BASE_UPGRADE_CONFIG[key];
  const progress = loadPlayerProgress();
  const level = progress.baseUpgrades[key] || 0;

  if (level >= config.maxLevel) return { ok: false, reason: 'at-cap' };

  const cost = Math.round(config.xpCostBase * Math.pow(level + 1, 1.3));
  if (progress.xp < cost) return { ok: false, reason: 'insufficient-xp' };

  progress.xp -= cost;
  progress.baseUpgrades[key] = level + 1;
  save(progress);
  return { ok: true };
}

// Generic material grants (used by grantStageRewards above AND by
// Gacha.js's roll rewards, so both routes add to the same pools the same way).
export function addXp(amount) {
  const progress = loadPlayerProgress();
  progress.xp += amount;
  save(progress);
}

export function addEvoShards(amount) {
  const progress = loadPlayerProgress();
  progress.evoShards += amount;
  save(progress);
}

export function addGrowthCharms(amount) {
  const progress = loadPlayerProgress();
  progress.growthCharms += amount;
  save(progress);
}

// --- Gems (premium-currency-equivalent, bible §A.5's Cat Food) ---

export function addGems(amount) {
  const progress = loadPlayerProgress();
  progress.gems += amount;
  save(progress);
}

export function trySpendGems(amount) {
  const progress = loadPlayerProgress();
  if (progress.gems < amount) return false;

  progress.gems -= amount;
  save(progress);
  return true;
}
