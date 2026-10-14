// Round 2 mock economy: the daily loop (login calendar + daily missions),
// the Lunacia Market's exchanges, and a ledger of every Gem earned/spent.
//
// Loop: battles → XP / Gems / materials → spend in Gacha, Market and
// upgrades → stronger Formation → harder stages. Sources and sinks are
// recorded by source name (ledger) so playtests can show where Gems really
// come from and go — see getLedgerSummary and the Market's "Today" line.
//
// Day boundaries use the player's local calendar date. Daily missions are
// measured as LifetimeStats deltas from a snapshot taken at the first
// visit of the day, so they need no extra in-battle hooks.
import { addGems, trySpendGems, addXp, addEvoShards, addGrowthCharms, loadPlayerProgress } from './PlayerProgress.js';
import { addEnergy, getEnergyState, getMaxEnergy } from './Energy.js';
import { loadLifetimeStats } from './LifetimeStats.js';
import { addBattleItem } from './BattleItems.js';
import { BATTLE_ITEMS_CONFIG } from './BATTLE_ITEMS_CONFIG.js';

const DAILY_KEY = 'axieEmpireDaily';
const LEDGER_KEY = 'axieEmpireLedger';
const LEDGER_MAX_ENTRIES = 400;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — economy state just won't persist this run.
  }
}

export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
}

// ---- Ledger ----

export function logEconomy(direction, currency, amount, source) {
  if (!amount) return;
  const ledger = read(LEDGER_KEY, { entries: [], totals: {} });
  const day = todayKey();
  ledger.entries.push({ t: Date.now(), d: direction, c: currency, a: amount, s: source });
  if (ledger.entries.length > LEDGER_MAX_ENTRIES) ledger.entries.splice(0, ledger.entries.length - LEDGER_MAX_ENTRIES);
  const totals = (ledger.totals[day] ||= {});
  const k = `${direction}:${currency}:${source}`;
  totals[k] = (totals[k] || 0) + amount;
  write(LEDGER_KEY, ledger);
}

export function earnGems(amount, source) {
  addGems(amount);
  logEconomy('earn', 'gems', amount, source);
}

export function spendGems(amount, sink) {
  if (!trySpendGems(amount)) return false;
  logEconomy('spend', 'gems', amount, sink);
  return true;
}

// { earned, spent, bySource: {source: net} } for one day (default today).
export function getLedgerSummary(day = todayKey()) {
  const totals = read(LEDGER_KEY, { totals: {} }).totals[day] || {};
  let earned = 0;
  let spent = 0;
  const bySource = {};
  for (const [k, v] of Object.entries(totals)) {
    const [dir, currency, source] = k.split(':');
    if (currency !== 'gems') continue;
    if (dir === 'earn') earned += v;
    else spent += v;
    bySource[source] = (bySource[source] || 0) + (dir === 'earn' ? v : -v);
  }
  return { earned, spent, bySource };
}

// ---- Rewards (shared by login calendar, daily missions, market) ----

export function grantReward(reward, source) {
  switch (reward.type) {
    case 'gems': earnGems(reward.amount, source); break;
    case 'energy': addEnergy(reward.amount); break;
    case 'energyFull': addEnergy(Math.max(0, getMaxEnergy() - getEnergyState().current)); break;
    case 'xp': addXp(reward.amount); break;
    case 'evoShard': addEvoShards(reward.amount); break;
    case 'growthCharm': addGrowthCharms(reward.amount); break;
    case 'battleItem': addBattleItem(reward.itemId, reward.amount); break;
    default: break;
  }
  if (reward.type !== 'gems') logEconomy('earn', reward.type, reward.amount || 1, source);
}

export function rewardLabel(reward) {
  switch (reward.type) {
    case 'gems': return `${reward.amount} Gems`;
    case 'energy': return `${reward.amount} Energy`;
    case 'energyFull': return 'Full Energy';
    case 'xp': return `${reward.amount.toLocaleString()} XP`;
    case 'evoShard': return `${reward.amount} Evo Shard${reward.amount > 1 ? 's' : ''}`;
    case 'growthCharm': return `${reward.amount} Growth Charm${reward.amount > 1 ? 's' : ''}`;
    case 'battleItem': return `${reward.amount}× ${BATTLE_ITEMS_CONFIG[reward.itemId]?.displayName || 'Item'}`;
    default: return '';
  }
}

// ---- Daily login calendar (7-day cycle; missing a day restarts at Day 1) ----

export const LOGIN_CALENDAR = [
  { type: 'gems', amount: 30 },
  { type: 'energy', amount: 40 },
  { type: 'growthCharm', amount: 1 },
  { type: 'gems', amount: 50 },
  { type: 'battleItem', itemId: 'xpBoost', amount: 2 },
  { type: 'evoShard', amount: 1 },
  { type: 'gems', amount: 120 },
];

// ---- Daily missions ----

export const DAILY_MISSIONS = [
  { id: 'win3', stat: 'battlesWon', target: 3, text: 'Win 3 battles', reward: { type: 'gems', amount: 20 } },
  { id: 'deploy40', stat: 'unitsDeployed', target: 40, text: 'Deploy 40 Axies', reward: { type: 'xp', amount: 3000 } },
  { id: 'defeat60', stat: 'enemiesDefeated', target: 60, text: 'Defeat 60 Chimeras', reward: { type: 'gems', amount: 15 } },
  { id: 'cannon2', stat: 'cannonUses', target: 2, text: 'Fire the Rune Cannon twice', reward: { type: 'energy', amount: 20 } },
];
// Finishing every daily mission pays a bonus on top.
export const DAILY_ALL_BONUS = { type: 'gems', amount: 30 };

function loadDaily() {
  const day = todayKey();
  const state = read(DAILY_KEY, null);
  if (state && state.day === day) return state;
  // New day: roll the streak forward (or reset) and snapshot stats.
  const gap = state ? daysBetween(state.day, day) : Infinity;
  const streak = state && gap === 1 && state.loginClaimed ? (state.streak % LOGIN_CALENDAR.length) + 1 : 1;
  const fresh = {
    day,
    streak,
    loginClaimed: false,
    baseline: loadLifetimeStats(),
    claimed: {},
    bonusClaimed: false,
  };
  write(DAILY_KEY, fresh);
  return fresh;
}

export function getDailyStatus() {
  const state = loadDaily();
  const stats = loadLifetimeStats();
  const missions = DAILY_MISSIONS.map((m) => {
    const progress = Math.max(0, (stats[m.stat] || 0) - (state.baseline[m.stat] || 0));
    return { ...m, progress: Math.min(progress, m.target), done: progress >= m.target, claimed: !!state.claimed[m.id] };
  });
  const allClaimed = missions.every((m) => m.claimed);
  return {
    day: state.day,
    streak: state.streak,
    loginReward: LOGIN_CALENDAR[state.streak - 1],
    loginClaimed: state.loginClaimed,
    missions,
    bonusReady: allClaimed && !state.bonusClaimed,
    bonusClaimed: state.bonusClaimed,
  };
}

export function countDailyClaimables() {
  const s = getDailyStatus();
  return (s.loginClaimed ? 0 : 1) + s.missions.filter((m) => m.done && !m.claimed).length + (s.bonusReady ? 1 : 0);
}

export function claimLoginReward() {
  const state = loadDaily();
  if (state.loginClaimed) return null;
  const reward = LOGIN_CALENDAR[state.streak - 1];
  state.loginClaimed = true;
  write(DAILY_KEY, state);
  grantReward(reward, 'dailyLogin');
  return reward;
}

export function claimDailyMission(id) {
  const status = getDailyStatus();
  const mission = status.missions.find((m) => m.id === id);
  if (!mission || !mission.done || mission.claimed) return null;
  const state = loadDaily();
  state.claimed[id] = true;
  write(DAILY_KEY, state);
  grantReward(mission.reward, 'dailyMission');
  return mission.reward;
}

export function claimDailyBonus() {
  if (!getDailyStatus().bonusReady) return null;
  const state = loadDaily();
  state.bonusClaimed = true;
  write(DAILY_KEY, state);
  grantReward(DAILY_ALL_BONUS, 'dailyBonus');
  return DAILY_ALL_BONUS;
}

// ---- Lunacia Market ----
// Gems are the only premium-like currency; XP is the soft currency. Prices
// are anchored to the Gacha (50 Gems/pull) and first-clear payouts so one
// stage's first clear buys roughly one small exchange.

export const MARKET_OFFERS = [
  { id: 'energy30', name: 'Energy Snack', desc: '+30 Energy', price: 20, reward: { type: 'energy', amount: 30 } },
  { id: 'energyFull', name: 'Full Refill', desc: 'Refill Energy to max', price: 60, reward: { type: 'energyFull' } },
  { id: 'xp5k', name: 'Training Scroll', desc: '+5,000 XP', price: 40, reward: { type: 'xp', amount: 5000 } },
  { id: 'growth', name: 'Growth Charm', desc: 'Raise a level cap', price: 80, reward: { type: 'growthCharm', amount: 1 } },
  { id: 'evo', name: 'Evo Shard', desc: 'Toward True Form', price: 120, reward: { type: 'evoShard', amount: 1 } },
  { id: 'radar', name: 'Treasure Radar', desc: 'Battle item ×1', price: 35, reward: { type: 'battleItem', itemId: 'treasureRadar', amount: 1 } },
  { id: 'rich', name: 'Rich Cat', desc: 'Battle item ×1', price: 35, reward: { type: 'battleItem', itemId: 'richCat', amount: 1 } },
  { id: 'xpboost', name: 'XP Boost', desc: 'Battle item ×1', price: 35, reward: { type: 'battleItem', itemId: 'xpBoost', amount: 1 } },
];

// One offer per day at half price, picked deterministically from the date
// so it's stable across reloads and the same for everyone on that day.
export function getDailyDeal(day = todayKey()) {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const offer = MARKET_OFFERS[h % MARKET_OFFERS.length];
  const state = read(DAILY_KEY, {});
  return { ...offer, price: Math.ceil(offer.price / 2), isDeal: true, bought: state.day === day && !!state.dealBought };
}

export function buyOffer(offerId, { deal = false } = {}) {
  const offer = deal ? getDailyDeal() : MARKET_OFFERS.find((o) => o.id === offerId);
  if (!offer) return { ok: false, reason: 'missing' };
  if (deal && offer.bought) return { ok: false, reason: 'sold-out' };
  if (offer.reward.type === 'energyFull' && getEnergyState().current >= getMaxEnergy()) return { ok: false, reason: 'energy-full' };
  if (loadPlayerProgress().gems < offer.price) return { ok: false, reason: 'gems' };
  spendGems(offer.price, `market:${offer.id}`);
  grantReward(offer.reward, 'market');
  if (deal) {
    const state = loadDaily();
    state.dealBought = true;
    write(DAILY_KEY, state);
  }
  return { ok: true, offer };
}
