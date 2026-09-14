// Gacha (bible §A.5.2's Rare Cat Capsule) — SCOPE ADAPTATION, flagged
// explicitly: the real system's whole point is rolling for NEW UNITS at
// weighted rarity odds. This build has a fixed 5-unit roster with no
// separate "owned vs. unowned" concept (every unit is always available,
// gated only by the Loadout screen — bible §A.10.3), so a literal
// unit-rarity gacha wouldn't have anything real to grant.
//
// Adapted instead into a weighted REWARD-TIER gacha (small/medium XP,
// Evo Shards, Growth Charms, a rare Jackpot bundle) — same underlying
// mechanic (Gems -> weighted random roll -> reward), same UI beats (roll
// button, per-pull cost, a bulk-discount multi-roll), just granting
// currency/materials instead of characters. If a later pass adds more
// units to the roster, this is the natural place to reintroduce real
// unit rolls without touching the rest of the system.

import { addXp, addEvoShards, addGrowthCharms, trySpendGems } from './PlayerProgress.js';

export const GACHA_SINGLE_ROLL_COST = 50;
export const GACHA_MULTI_ROLL_COUNT = 11;
export const GACHA_MULTI_ROLL_COST = 500; // ~9% cheaper than 11 singles, mirroring the bible's bulk-discount convention

// Weighted reward pool — weights sum to 100 for readability (treated as
// percentages), not enforced at runtime.
const REWARD_POOL = [
  { weight: 45, type: 'xp', amount: 1000, label: '1,000 XP' },
  { weight: 25, type: 'xp', amount: 3000, label: '3,000 XP' },
  { weight: 15, type: 'evoShard', amount: 1, label: '1 Evo Shard' },
  { weight: 10, type: 'growthCharm', amount: 1, label: '1 Growth Charm' },
  { weight: 5, type: 'jackpot', label: 'JACKPOT! 10,000 XP + 1 Evo Shard + 1 Growth Charm' },
];

function rollReward() {
  const totalWeight = REWARD_POOL.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of REWARD_POOL) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return REWARD_POOL[REWARD_POOL.length - 1];
}

function applyReward(reward) {
  switch (reward.type) {
    case 'xp':
      addXp(reward.amount);
      break;
    case 'evoShard':
      addEvoShards(reward.amount);
      break;
    case 'growthCharm':
      addGrowthCharms(reward.amount);
      break;
    case 'jackpot':
      addXp(10000);
      addEvoShards(1);
      addGrowthCharms(1);
      break;
  }
}

// Spends `cost` Gems and performs `count` rolls, applying every reward.
// Returns { ok, rewards } — `rewards` is the list of labels rolled, for the
// results screen; `ok: false` (no Gems spent, no rewards rolled) if the
// player can't afford it.
function performRolls(count, cost) {
  if (!trySpendGems(cost)) return { ok: false, rewards: [] };

  const rewards = [];
  for (let i = 0; i < count; i += 1) {
    const reward = rollReward();
    applyReward(reward);
    rewards.push(reward.label);
  }
  return { ok: true, rewards };
}

export function rollSingle() {
  return performRolls(1, GACHA_SINGLE_ROLL_COST);
}

export function rollMulti() {
  return performRolls(GACHA_MULTI_ROLL_COUNT, GACHA_MULTI_ROLL_COST);
}
