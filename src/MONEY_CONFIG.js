// Money economy knobs. Every stage supplies its own level-1 income rate and
// wallet cap (STAGE_CONFIG's moneyAccrualPerSec/startingMoney) — this file
// only holds the knobs for the in-battle "Worker Cat" upgrade layered on top
// of that per-stage baseline (confirmed against the bible as a real
// reference mechanic, not an invented one — see bible §A.3.10/§A.7.1 and the
// "Worker Cat" research notes: the real game lets you spend money mid-battle
// to level a Worker Cat up to a hard cap, each level raising both its income
// rate and the wallet cap it can hold).
//
// Currency is yen, matching Battle Cats' own denomination directly — unit
// costs in UNIT_CONFIG.js are literal real prices (no conversion factor
// needed).

export const MONEY_CONFIG = {
  // Killing an enemy grants its real ENEMY_CONFIG.js `money` value (guide
  // Chapter 14's own per-enemy payout list) — see GameScene.js's
  // onEnemyKilled. This multiplier is now only a FALLBACK, used solely for
  // the 3 still-dormant enemies (zombie/colossus/behemoth) that have no
  // real Chapter 1 data: enemy.config.threat * killBonusMultiplier. `threat`
  // itself isn't a real Battle Cats stat, so this remains just reasoned
  // proportionally (~11% of a basic unit's cost per basic-enemy kill).
  killBonusMultiplier: 3,

  // Worker Cat: starts every battle at level 1 (using the stage's own
  // moneyAccrualPerSec/startingMoney as level-1's income rate/wallet cap —
  // see STAGE_CONFIG.js). Spending money mid-battle levels it up, capped at
  // maxLevel (matches the real reference mechanic's own level-8 cap). Each
  // level adds a flat amount to BOTH the income rate and the wallet cap —
  // two separate levers a player is trading early income for.
  //
  // walletCapPerLevel and baseUpgradeCost are CONFIRMED real numbers, read
  // directly off in-game screenshots (three data points at Worker Cat
  // levels 1/2/4, all on the same stage): cap went 6000 → 7500 → 10500
  // (exactly +1500/level), and the on-screen upgrade cost went
  // 440 → 880 → 1760 (exactly 440 × current level). accrualPerLevel has no
  // screenshot evidence either way (money-accrual RATE isn't visible in a
  // static screenshot) and stays a reasoned placeholder.
  workerCat: {
    maxLevel: 8,
    accrualPerLevel: 8, // flat ¥/sec added per level above 1 — placeholder, unconfirmed
    walletCapPerLevel: 1500, // flat ¥ added to the wallet cap per level above 1 — confirmed
    // Cost to go from level N to N+1 is baseUpgradeCost * N (confirmed
    // formula AND confirmed base value from screenshot evidence).
    baseUpgradeCost: 440,
  },
};
