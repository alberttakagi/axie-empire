// Sparring Grounds weekly class challenge.
// Each calendar week features one Axie class (rotating through all nine):
//   - most Sparring Grounds spawns that week are Chimeras of that class,
//   - your Axies that BEAT that class (AXIE_CLASSES.js triangle) get an
//     extra +10% "challenge bonus" on top of the normal class edge,
//   - best score of the week unlocks Bronze / Silver / Gold rewards (each
//     claimable once per week), and your top runs are kept for the board.
// Pure logic + storage; DojoScene.js is the UI, GameScene's dojo mode uses
// featuredClass()/featuredEnemyRoles() and recordWeeklyScore().
import { ENEMY_CONFIG } from './ENEMY_CONFIG.js';
import { classOfEnemy, weakToClasses } from './AXIE_CLASSES.js';
import { grantReward } from './Economy.js';

const KEY = 'axieEmpireWeekly';
export const FEATURED_SPAWN_SHARE = 0.65;
export const CHALLENGE_BONUS = 0.1;
// Rotation order (alternates sides of the triangle week to week).
const ROTATION = ['aquatic', 'beast', 'plant', 'bird', 'bug', 'reptile', 'dawn', 'mech', 'dusk'];

export const WEEKLY_TIERS = [
  { id: 'bronze', label: 'Bronze', score: 600, reward: { type: 'gems', amount: 20 } },
  { id: 'silver', label: 'Silver', score: 1100, reward: { type: 'gems', amount: 40 } },
  { id: 'gold', label: 'Gold', score: 1600, reward: { type: 'gems', amount: 70 }, bonus: { type: 'evoShard', amount: 1 } },
];

// ISO-8601 week id, e.g. "2026-W42" (local calendar date).
export function weekKey(now = new Date()) {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekIndex(key) {
  const [y, w] = key.split('-W').map(Number);
  return y * 53 + w;
}

// Classes with no Chimeras (Mech) fall through to the next in rotation.
export function featuredClass(key = weekKey()) {
  const start = weekIndex(key) % ROTATION.length;
  for (let i = 0; i < ROTATION.length; i++) {
    const cls = ROTATION[(start + i) % ROTATION.length];
    if (featuredEnemyRoles(cls).length) return cls;
  }
  return ROTATION[start];
}

export function featuredEnemyRoles(cls) {
  return Object.keys(ENEMY_CONFIG).filter((id) => classOfEnemy(ENEMY_CONFIG[id]) === cls);
}

// Your Axie classes that beat this week's featured class.
export function counterClasses(cls) {
  return weakToClasses(cls);
}

function load(key = weekKey()) {
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem(KEY));
  } catch {
    s = null;
  }
  if (!s || s.week !== key) s = { week: key, best: 0, claimed: {}, runs: [] };
  return s;
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage unavailable — this week's record just won't persist
  }
}

export function getWeeklyState() {
  const s = load();
  return {
    ...s,
    featured: featuredClass(s.week),
    tiers: WEEKLY_TIERS.map((t) => ({ ...t, reached: s.best >= t.score, claimed: !!s.claimed[t.id] })),
  };
}

// Returns { best, isNewBest, newlyReached: [tierIds] }.
export function recordWeeklyScore(score, formation = []) {
  const s = load();
  const before = s.best;
  s.best = Math.max(s.best, score);
  s.runs.push({ score, at: Date.now(), formation: formation.slice(0, 10) });
  s.runs.sort((a, b) => b.score - a.score);
  s.runs = s.runs.slice(0, 5);
  save(s);
  return {
    best: s.best,
    isNewBest: score > before,
    newlyReached: WEEKLY_TIERS.filter((t) => before < t.score && s.best >= t.score).map((t) => t.id),
  };
}

export function claimWeeklyTier(id) {
  const s = load();
  const tier = WEEKLY_TIERS.find((t) => t.id === id);
  if (!tier || s.best < tier.score || s.claimed[id]) return null;
  s.claimed[id] = true;
  save(s);
  grantReward(tier.reward, 'weeklyChallenge');
  if (tier.bonus) grantReward(tier.bonus, 'weeklyChallenge');
  return tier;
}

export function countWeeklyClaimables() {
  return getWeeklyState().tiers.filter((t) => t.reached && !t.claimed).length;
}
