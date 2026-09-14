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
  // Killing an enemy grants enemy.config.threat * killBonusMultiplier yen.
  // `threat` itself isn't a real Battle Cats stat (see ENEMY_CONFIG.js) so
  // this multiplier is still just reasoned proportionally: ~11% of a basic
  // unit's cost per basic-enemy kill.
  killBonusMultiplier: 3,

  // Worker Cat: starts every battle at level 1 (using the stage's own
  // moneyAccrualPerSec/startingMoney as level-1's income rate/wallet cap —
  // see STAGE_CONFIG.js). Spending money mid-battle levels it up, capped at
  // maxLevel (matches the real reference mechanic's own level-8 cap). Each
  // level adds a flat amount to BOTH the income rate and the wallet cap —
  // two separate levers a player is trading early income for.
  workerCat: {
    maxLevel: 8,
    accrualPerLevel: 8, // flat ¥/sec added per level above 1
    walletCapPerLevel: 150, // flat ¥ added to the wallet cap per level above 1
    // Cost to go from level N to N+1 is baseUpgradeCost * N (matches the
    // researched real formula: "level 1 cost × current level").
    baseUpgradeCost: 150,
  },
};
