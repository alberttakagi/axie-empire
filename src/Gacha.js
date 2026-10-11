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
import { addEnergy } from './Energy.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { PROGRESSION_CONFIG } from './PROGRESSION_CONFIG.js';
import { addOwnedUnit } from './UnitCollection.js';

// Round 2: the capsule now also drops real units — the gacha-only roster
// (UNIT_CONFIG entries with unlockRequirement { gacha: true }), grouped by
// PROGRESSION_CONFIG rarity. A duplicate converts to XP, Battle Cats-style.
const UNIT_TIERS = {
  'Rare': { revealRarity: 'epic', dupeXp: 3000 },
  'Super Rare': { revealRarity: 'legendary', dupeXp: 8000 },
  'Uber Rare': { revealRarity: 'legendary', dupeXp: 20000 },
};
function gachaUnitsOfRarity(rarity) {
  return Object.keys(UNIT_CONFIG).filter(
    (k) => UNIT_CONFIG[k].unlockRequirement?.gacha && PROGRESSION_CONFIG[k]?.rarity === rarity,
  );
}

export const GACHA_SINGLE_ROLL_COST = 50;
export const GACHA_MULTI_ROLL_COUNT = 11;
export const GACHA_MULTI_ROLL_COST = 500; // ~9% cheaper than 11 singles, mirroring the bible's bulk-discount convention

// Reference range for GachaScene's own "shinier at a higher XP amount"
// treatment — the lowest and highest XP amount that can ever come out of
// this pool (the jackpot's own 10,000 counts as the ceiling).
export const XP_REWARD_MIN = 1000;
export const XP_REWARD_MAX = 10000;

// Weighted reward pool — weights sum to 100 for readability (treated as
// percentages), not enforced at runtime. `rarity` drives GachaScene's own
// reveal flourish (text/color/sound/particles) — ordered the same as the
// weights (rarer reward = louder reveal), not a separate balance concept.
const REWARD_POOL = [
  { weight: 9, type: 'unit', unitRarity: 'Rare', rarity: 'epic' },
  { weight: 2.5, type: 'unit', unitRarity: 'Super Rare', rarity: 'legendary' },
  { weight: 0.5, type: 'unit', unitRarity: 'Uber Rare', rarity: 'legendary' },
  { weight: 29, type: 'xp', amount: 1000, label: '1,000 XP', rarity: 'common' },
  { weight: 21, type: 'xp', amount: 3000, label: '3,000 XP', rarity: 'rare' },
  // Energy (bible's real "Leadership" item is a full refill — see
  // Energy.js's addEnergy comment for why this grants a smaller partial
  // bump instead): user request, roughly one mid-tier stage's worth of
  // Energy (see STAGE_CONFIG.js's own energyCost range) so a pull is
  // worth taking without trivializing the resource.
  { weight: 10, type: 'energy', amount: 30, label: '30 Energy', rarity: 'rare' },
  { weight: 14, type: 'evoShard', amount: 1, label: '1 Evo Shard', rarity: 'epic' },
  { weight: 9, type: 'growthCharm', amount: 1, label: '1 Growth Charm', rarity: 'epic' },
  {
    weight: 5,
    type: 'jackpot',
    label: 'JACKPOT!',
    rarity: 'legendary',
    bundle: [
      { type: 'xp', amount: 10000 },
      { type: 'energy', amount: 100 },
      { type: 'evoShard', amount: 1 },
      { type: 'growthCharm', amount: 1 },
    ],
  },
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

function grantOne(type, amount) {
  switch (type) {
    case 'xp':
      addXp(amount);
      break;
    case 'evoShard':
      addEvoShards(amount);
      break;
    case 'growthCharm':
      addGrowthCharms(amount);
      break;
    case 'energy':
      addEnergy(amount);
      break;
  }
}

// Turns a pool 'unit' entry into a concrete pull: picks one unit of that
// rarity, records ownership, or pays dupe XP. Returns the reward object
// GachaScene renders ({ type:'unit', unitId, isNew, dupeXp, rarity }).
function resolveUnitReward(entry) {
  const candidates = gachaUnitsOfRarity(entry.unitRarity);
  if (!candidates.length) return { weight: 0, type: 'xp', amount: 3000, label: '3,000 XP', rarity: 'rare' };
  const unitId = candidates[Math.floor(Math.random() * candidates.length)];
  const isNew = addOwnedUnit(unitId);
  const tier = UNIT_TIERS[entry.unitRarity];
  if (!isNew) addXp(tier.dupeXp);
  return {
    type: 'unit', unitId, unitRarity: entry.unitRarity, isNew,
    dupeXp: isNew ? 0 : tier.dupeXp,
    rarity: tier.revealRarity,
    label: UNIT_CONFIG[unitId].characterName,
  };
}

function applyReward(reward) {
  if (reward.type === 'unit') return; // already applied in resolveUnitReward
  if (reward.type === 'jackpot') {
    reward.bundle.forEach(({ type, amount }) => grantOne(type, amount));
  } else {
    grantOne(reward.type, reward.amount);
  }
}

// Spends `cost` Gems and performs `count` rolls, applying every reward.
// Returns { ok, rewards } — `rewards` is the full list of reward objects
// rolled (type/amount/label/rarity/bundle), for GachaScene's own reveal
// sequence; `ok: false` (no Gems spent, no rewards rolled) if the player
// can't afford it.
function performRolls(count, cost) {
  if (!trySpendGems(cost)) return { ok: false, rewards: [] };

  const rewards = [];
  for (let i = 0; i < count; i += 1) {
    let reward = rollReward();
    // 11x pull guarantee: the last pull is at least a Rare unit if none
    // dropped yet — a multi-roll should always feel like it got you someone.
    if (count > 1 && i === count - 1 && !rewards.some((r) => r.type === 'unit') && reward.type !== 'unit') {
      reward = REWARD_POOL.find((e) => e.type === 'unit');
    }
    if (reward.type === 'unit') reward = resolveUnitReward(reward);
    applyReward(reward);
    rewards.push(reward);
  }
  return { ok: true, rewards };
}

export function rollSingle() {
  return performRolls(1, GACHA_SINGLE_ROLL_COST);
}

export function rollMulti() {
  return performRolls(GACHA_MULTI_ROLL_COUNT, GACHA_MULTI_ROLL_COST);
}
