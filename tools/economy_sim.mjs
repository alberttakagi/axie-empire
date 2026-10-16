// Economy simulator — models players' first N days using the game's REAL
// tables (STAGE_CONFIG energy/first-clear Gems, MISSIONS_CONFIG, the Economy.js
// login calendar / daily missions / Market prices, Gacha rates & costs).
//
// Usage:  node tools/economy_sim.mjs [days=30] [gemScale=1]
//   gemScale multiplies every stage's first-clear Gems, to compare tunings.
//
// Player profiles (sessions/day × minutes/session) cover a light, a regular
// and a heavy player. Each battle takes ~2.5 min; Energy regenerates 1/min
// up to the cap; normal stages are won ~90% of the time, saga finales
// ~35% per attempt (balance-sim results, docs/BALANCE_REPORT.md). Players
// pull the gacha whenever they can afford an 11x (500), buy an Energy Snack
// when they're out of Energy mid-session (if they can spare the Gems), and
// claim every daily they qualify for.
import { STAGE_CONFIG } from '../src/STAGE_CONFIG.js';
import { MISSIONS_CONFIG } from '../src/MISSIONS_CONFIG.js';
import { LOGIN_CALENDAR, DAILY_MISSIONS, DAILY_ALL_BONUS, MARKET_OFFERS } from '../src/Economy.js';

const DAYS = Number(process.argv[2] || 30);
// Extra multiplier on top of the shipped FIRST_CLEAR_GEM_SCALE (default 1 = as shipped).
const GEM_SCALE = Number(process.argv[3] || 1);
const BATTLE_MIN = 2.5;
const ENERGY_CAP = 100;
const MULTI_COST = 500;
const PULLS_PER_MULTI = 11;
const SNACK = MARKET_OFFERS.find((o) => o.id === 'energy30');

// Gacha unit odds per pull (Gacha.js): Rare 9% (4 units), Super Rare 2.5% (3), Uber 0.5% (2).
const GACHA = [
  ...['ena', 'venoki', 'pomodoro', 'bing'].map((id) => ({ id, p: 0.09 / 4 })),
  ...['rouge', 'machito', 'bard'].map((id) => ({ id, p: 0.025 / 3 })),
  ...['hope', 'shufen'].map((id) => ({ id, p: 0.005 / 2 })),
];

const PROFILES = {
  light: { sessions: 1, minutes: 15 },
  regular: { sessions: 2, minutes: 25 },
  heavy: { sessions: 4, minutes: 40 },
};

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function simulate(profileName, seed = 7) {
  const prof = PROFILES[profileName];
  const rand = rng(seed);
  let stageIdx = 0;
  let gems = 0;
  let energy = ENERGY_CAP;
  const owned = new Set();
  const totals = { earned: {}, spent: {} };
  const stats = { battlesWon: 0, unitsDeployed: 0, enemiesDefeated: 0, cannonUses: 0 };
  const claimedMissions = new Set();
  const earn = (src, n) => { gems += n; totals.earned[src] = (totals.earned[src] || 0) + n; };
  const spend = (sink, n) => { gems -= n; totals.spent[sink] = (totals.spent[sink] || 0) + n; };
  let pulls = 0;
  const days = [];
  let streak = 0;

  for (let day = 1; day <= DAYS; day++) {
    streak = (streak % LOGIN_CALENDAR.length) + 1;
    const login = LOGIN_CALENDAR[streak - 1];
    if (login.type === 'gems') earn('dailyLogin', login.amount);
    if (login.type === 'energy') energy = Math.min(999, energy + login.amount);
    const dayStart = { ...stats };
    // Energy regenerates between sessions (spread evenly over 24h).
    const regenBetween = Math.floor((24 * 60) / prof.sessions);
    let firstClears = 0;
    for (let s = 0; s < prof.sessions; s++) {
      energy = Math.min(Math.max(energy, 0) + regenBetween, Math.max(energy, ENERGY_CAP));
      let minutes = prof.minutes;
      while (minutes >= BATTLE_MIN && stageIdx < STAGE_CONFIG.length) {
        const stage = STAGE_CONFIG[stageIdx];
        if (energy < stage.energyCost) {
          if (gems >= SNACK.price + MULTI_COST * 0.2) { spend('market:energy', SNACK.price); energy += 30; } else break;
        }
        energy -= stage.energyCost;
        minutes -= BATTLE_MIN;
        energy += BATTLE_MIN; // regen during the battle
        const finale = (stageIdx + 1) % 48 === 0;
        const win = rand() < (finale ? 0.35 : 0.9);
        stats.unitsDeployed += 14;
        stats.enemiesDefeated += 18;
        stats.cannonUses += 1;
        if (rand() < 0.3 && rand() < 0.35) earn('chest', 10);
        if (win) {
          stats.battlesWon += 1;
          earn('firstClear', Math.round(stage.gemsFirstClear * GEM_SCALE));
          stageIdx += 1;
          firstClears += 1;
        }
      }
    }
    // Daily missions vs today's progress.
    let allDone = true;
    for (const m of DAILY_MISSIONS) {
      if (stats[m.stat] - dayStart[m.stat] >= m.target) { if (m.reward.type === 'gems') earn('dailyMission', m.reward.amount); } else allDone = false;
    }
    if (allDone) earn('dailyMission', DAILY_ALL_BONUS.amount);
    // Milestone missions (stage clears / deploys / defeats / cannon).
    for (const m of MISSIONS_CONFIG) {
      if (claimedMissions.has(m.id)) continue;
      const v = { stagesCleared: stageIdx, unitsDeployed: stats.unitsDeployed, enemiesDefeated: stats.enemiesDefeated, cannonUses: stats.cannonUses }[m.type];
      if (v !== undefined && v >= m.target) { claimedMissions.add(m.id); earn('mission', m.rewardGems); }
    }
    // Gacha: 11x whenever affordable.
    while (gems >= MULTI_COST) {
      spend('gacha', MULTI_COST);
      for (let i = 0; i < PULLS_PER_MULTI; i++) {
        pulls += 1;
        let r = rand();
        for (const u of GACHA) { if (r < u.p) { owned.add(u.id); break; } r -= u.p; }
      }
    }
    days.push({ day, stage: stageIdx, firstClears, gems, pulls, owned: owned.size });
  }
  return { profileName, days, totals, pulls, owned: [...owned], stageIdx };
}

function pct(part, whole) {
  return whole ? `${Math.round((100 * part) / whole)}%` : '0%';
}

console.log(`\n=== Economy sim: ${DAYS} days, first-clear Gems ×${GEM_SCALE} ===`);
for (const name of Object.keys(PROFILES)) {
  const r = simulate(name);
  const earned = Object.values(r.totals.earned).reduce((a, b) => a + b, 0);
  const at = (d) => r.days[Math.min(d, r.days.length) - 1];
  console.log(`\n[${name}] ${PROFILES[name].sessions}×${PROFILES[name].minutes}min/day`);
  console.log(`  progress: day7 stage ${at(7).stage}, day14 stage ${at(14).stage}, day30 stage ${at(30).stage}`);
  console.log(`  pulls: day1 ${at(1).pulls}, day7 ${at(7).pulls}, day30 ${at(30).pulls}  · gacha Axies owned day7 ${at(7).owned}/9, day30 ${at(30).owned}/9`);
  console.log(`  Gems earned ${earned}: ${Object.entries(r.totals.earned).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v} (${pct(v, earned)})`).join(', ')}`);
  console.log(`  Gems spent: ${Object.entries(r.totals.spent).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
