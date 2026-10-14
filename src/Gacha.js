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
import { addPlusLevel, isUnitUnlocked } from './PlayerProgress.js';

// Round 2: the capsule now also drops real units — the gacha-only roster
// (UNIT_CONFIG entries with unlockRequirement { gacha: true }), grouped by
// PROGRESSION_CONFIG rarity. A duplicate converts to XP, Battle Cats-style.
// 'Lineage' = the original 10 campaign units: pulls only ones you've
// already unlocked through stages (the gacha never skips campaign gating),
// and every pull is a duplicate that raises the unit's level cap.
const LINEAGE_DUPE_XP = 1500;
const UNIT_TIERS = {
  'Lineage': { revealRarity: 'rare', dupeXp: LINEAGE_DUPE_XP },
  'Rare': { revealRarity: 'epic', dupeXp: 3000 },
  'Super Rare': { revealRarity: 'legendary', dupeXp: 8000 },
  'Uber Rare': { revealRarity: 'legendary', dupeXp: 20000 },
};
function gachaUnitsOfRarity(rarity) {
  if (rarity === 'Lineage') {
    return Object.keys(UNIT_CONFIG).filter((k) => !UNIT_CONFIG[k].unlockRequirement?.gacha && isUnitUnlocked(k));
  }
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
  { weight: 12, type: 'unit', unitRarity: 'Lineage', rarity: 'rare' },
  { weight: 17, type: 'xp', amount: 1000, label: '1,000 XP', rarity: 'common' },
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
  const isNew = entry.unitRarity === 'Lineage' ? false : addOwnedUnit(unitId);
  const tier = UNIT_TIERS[entry.unitRarity];
  // Duplicate: +1 level cap (Battle Cats' "+ level"); once maxed, XP instead.
  let plusLevels = null;
  let dupeXp = 0;
  if (!isNew) {
    const cap = addPlusLevel(unitId);
    if (cap.ok) plusLevels = cap.plusLevels;
    else {
      dupeXp = tier.dupeXp;
      addXp(dupeXp);
    }
  }
  return {
    type: 'unit', unitId, unitRarity: entry.unitRarity, isNew, plusLevels,
    dupeXp,
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
    if (reward.type === 'unit') reward = resolveUnitReward(reward);
    applyReward(reward);
    rewards.push(reward);
  }
  return { ok: true, rewards };
}

// First-ever pull is free and guarantees a NEW Rare Axie — the first five
// minutes should end with a new friend, not a pile of XP.
const FIRST_FREE_KEY = 'axieEmpireFirstFreePullUsed';
export function hasFirstFreePull() {
  try {
    return !localStorage.getItem(FIRST_FREE_KEY);
  } catch {
    return false;
  }
}

export function rollFirstFree() {
  if (!hasFirstFreePull()) return { ok: false, rewards: [] };
  try { localStorage.setItem(FIRST_FREE_KEY, '1'); } catch { /* storage unavailable */ }
  const fresh = gachaUnitsOfRarity('Rare').filter((k) => !isUnitUnlocked(k));
  const pool = fresh.length ? fresh : gachaUnitsOfRarity('Rare');
  const unitId = pool[Math.floor(Math.random() * pool.length)];
  const isNew = addOwnedUnit(unitId);
  return {
    ok: true,
    rewards: [{ type: 'unit', unitId, unitRarity: 'Rare', isNew, plusLevels: null, dupeXp: 0, rarity: 'epic', label: UNIT_CONFIG[unitId].characterName }],
  };
}

export function rollSingle() {
  return performRolls(1, GACHA_SINGLE_ROLL_COST);
}

export function rollMulti() {
  return performRolls(GACHA_MULTI_ROLL_COUNT, GACHA_MULTI_ROLL_COST);
}
