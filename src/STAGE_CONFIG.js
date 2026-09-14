// Stage roster: 10 curated stages. spawnScript is each stage's COMPLETE wave
// list (no more hand-off into an endless/tier-scaled spawner once it's
// exhausted — Endless Mode and its shared spawner were removed; every enemy
// a stage will ever throw at the player is listed explicitly below, matching
// the bible's model of a stage as a finite, scripted encounter — §A.6.5).
// The only way to clear a stage is destroying its enemy base; if every
// scripted enemy is dead and the base isn't, the player just has to keep
// chipping at it with whatever's left on the field.
//
// Each stage:
//   id            stable key, also the localStorage progress key.
//   displayName   reskin hook / stage-select label.
//   difficulty    'Easy' | 'Normal' | 'Hard' | 'Boss' — just a label + the
//                 select-screen's accent color, doesn't affect gameplay math.
//   startingMoney, moneyAccrualPerSec, baseHp
//                 startingMoney doubles as this stage's level-1 Worker Cat
//                 wallet cap and moneyAccrualPerSec as its level-1 income
//                 rate (see MONEY_CONFIG.js's workerCat block and
//                 GameScene's getWalletCap/getMoneyAccrualPerSec — Worker
//                 Cat levels add flat increments on top of these per-stage
//                 baselines). Values are yen, matching Battle Cats' real
//                 "start each stage with 1000" convention (Easy 1.2x,
//                 Normal 1x, Hard 0.8x, Boss 1x of that base).
//   enemyBaseHp   the enemy tower's max HP — independent of baseHp (the
//                 player's own base) so it can climb with the difficulty
//                 curve instead of following the player-forgiveness curve.
//                 No fixed cap; scale it however high a stage calls for.
//   spawnScript   ordered, fixed list of enemies — no randomness, no
//                 tier-based auto-scaling. Each entry:
//                   enemyId          key into ENEMY_CONFIG.js
//                   statMultiplier   multiplies that enemy's base hp only
//                                    (1 = unscaled; the stage 10 boss uses 8)
//                   spawnDelayMs     time since the STAGE STARTED (not since
//                                    the previous spawn) — so entries must be
//                                    listed in increasing spawnDelayMs order.
//   Clearing a stage = reducing its enemy base's HP to 0 (see GameScene's
//   damageEnemyBase/winStage).

export const STAGE_CONFIG = [
  {
    id: 'stage1',
    displayName: 'Training Grounds',
    difficulty: 'Easy',
    startingMoney: 1200,
    moneyAccrualPerSec: 60,
    baseHp: 120,
    enemyBaseHp: 100,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 2000 },
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 6000 },
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 10000 },
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 14000 },
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 18000 },
      { enemyId: 'basic', statMultiplier: 1.1, spawnDelayMs: 22000 },
    ],
  },
  {
    id: 'stage2',
    displayName: 'Basic Skirmish',
    difficulty: 'Easy',
    startingMoney: 1200,
    moneyAccrualPerSec: 60,
    baseHp: 120,
    enemyBaseHp: 130,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 2000 },
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 5000 },
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 8000 },
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 11000 },
      { enemyId: 'basic', statMultiplier: 1.1, spawnDelayMs: 14000 },
      { enemyId: 'fast', statMultiplier: 1.1, spawnDelayMs: 17000 },
      { enemyId: 'basic', statMultiplier: 1.2, spawnDelayMs: 20000 },
      { enemyId: 'fast', statMultiplier: 1.2, spawnDelayMs: 23000 },
    ],
  },
  {
    id: 'stage3',
    displayName: 'Fast Rush',
    difficulty: 'Easy',
    startingMoney: 1200,
    moneyAccrualPerSec: 60,
    baseHp: 120,
    enemyBaseHp: 160,
    spawnScript: [
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 2000 },
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 4500 },
      { enemyId: 'basic', statMultiplier: 1.1, spawnDelayMs: 7000 },
      { enemyId: 'fast', statMultiplier: 1.1, spawnDelayMs: 9500 },
      { enemyId: 'fast', statMultiplier: 1.1, spawnDelayMs: 12000 },
      { enemyId: 'basic', statMultiplier: 1.2, spawnDelayMs: 15000 },
      { enemyId: 'fast', statMultiplier: 1.2, spawnDelayMs: 17500 },
      { enemyId: 'fast', statMultiplier: 1.3, spawnDelayMs: 20000 },
      { enemyId: 'basic', statMultiplier: 1.3, spawnDelayMs: 22500 },
    ],
  },
  {
    id: 'stage4',
    displayName: 'Ranged Threat',
    difficulty: 'Normal',
    startingMoney: 1000,
    moneyAccrualPerSec: 50,
    baseHp: 100,
    enemyBaseHp: 220,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 2000 },
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 5000 },
      { enemyId: 'ranged', statMultiplier: 1, spawnDelayMs: 8000 },
      { enemyId: 'basic', statMultiplier: 1.1, spawnDelayMs: 11000 },
      { enemyId: 'ranged', statMultiplier: 1.1, spawnDelayMs: 14000 },
      { enemyId: 'fast', statMultiplier: 1.2, spawnDelayMs: 17000 },
      { enemyId: 'ranged', statMultiplier: 1.2, spawnDelayMs: 20000 },
      { enemyId: 'basic', statMultiplier: 1.3, spawnDelayMs: 23000 },
      { enemyId: 'ranged', statMultiplier: 1.3, spawnDelayMs: 26000 },
    ],
  },
  {
    id: 'stage5',
    displayName: 'Armor Up',
    difficulty: 'Normal',
    startingMoney: 1000,
    moneyAccrualPerSec: 50,
    baseHp: 100,
    enemyBaseHp: 260,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 2000 },
      { enemyId: 'ranged', statMultiplier: 1, spawnDelayMs: 5000 },
      { enemyId: 'tank', statMultiplier: 1, spawnDelayMs: 8000 },
      { enemyId: 'fast', statMultiplier: 1.1, spawnDelayMs: 12000 },
      { enemyId: 'ranged', statMultiplier: 1.1, spawnDelayMs: 15000 },
      { enemyId: 'tank', statMultiplier: 1.1, spawnDelayMs: 18000 },
      { enemyId: 'basic', statMultiplier: 1.2, spawnDelayMs: 22000 },
      { enemyId: 'ranged', statMultiplier: 1.2, spawnDelayMs: 25000 },
      { enemyId: 'tank', statMultiplier: 1.2, spawnDelayMs: 28000 },
    ],
  },
  {
    id: 'stage6',
    displayName: 'Combined Arms',
    difficulty: 'Normal',
    startingMoney: 1000,
    moneyAccrualPerSec: 50,
    baseHp: 100,
    enemyBaseHp: 300,
    spawnScript: [
      { enemyId: 'fast', statMultiplier: 1.1, spawnDelayMs: 2000 },
      { enemyId: 'ranged', statMultiplier: 1.1, spawnDelayMs: 4500 },
      { enemyId: 'basic', statMultiplier: 1.1, spawnDelayMs: 7000 },
      { enemyId: 'tank', statMultiplier: 1.1, spawnDelayMs: 10000 },
      { enemyId: 'fast', statMultiplier: 1.2, spawnDelayMs: 14000 },
      { enemyId: 'ranged', statMultiplier: 1.2, spawnDelayMs: 16500 },
      { enemyId: 'tank', statMultiplier: 1.2, spawnDelayMs: 19000 },
      { enemyId: 'basic', statMultiplier: 1.3, spawnDelayMs: 22000 },
      { enemyId: 'ranged', statMultiplier: 1.3, spawnDelayMs: 24500 },
      { enemyId: 'tank', statMultiplier: 1.3, spawnDelayMs: 27000 },
    ],
  },
  {
    id: 'stage7',
    displayName: 'All-Out Assault',
    difficulty: 'Hard',
    startingMoney: 800,
    moneyAccrualPerSec: 42.5,
    baseHp: 90,
    enemyBaseHp: 380,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.2, spawnDelayMs: 1500 },
      { enemyId: 'fast', statMultiplier: 1.2, spawnDelayMs: 3500 },
      { enemyId: 'ranged', statMultiplier: 1.2, spawnDelayMs: 6000 },
      { enemyId: 'tank', statMultiplier: 1.2, spawnDelayMs: 9000 },
      { enemyId: 'aoe', statMultiplier: 1.2, spawnDelayMs: 12000 },
      { enemyId: 'fast', statMultiplier: 1.3, spawnDelayMs: 15000 },
      { enemyId: 'ranged', statMultiplier: 1.3, spawnDelayMs: 17500 },
      { enemyId: 'tank', statMultiplier: 1.3, spawnDelayMs: 20500 },
      { enemyId: 'aoe', statMultiplier: 1.3, spawnDelayMs: 23500 },
      { enemyId: 'basic', statMultiplier: 1.4, spawnDelayMs: 26000 },
    ],
  },
  {
    id: 'stage8',
    displayName: 'Pressure Point',
    difficulty: 'Hard',
    startingMoney: 800,
    moneyAccrualPerSec: 42.5,
    baseHp: 90,
    enemyBaseHp: 440,
    spawnScript: [
      { enemyId: 'fast', statMultiplier: 1.3, spawnDelayMs: 1500 },
      { enemyId: 'ranged', statMultiplier: 1.3, spawnDelayMs: 3000 },
      { enemyId: 'basic', statMultiplier: 1.3, spawnDelayMs: 4500 },
      { enemyId: 'tank', statMultiplier: 1.3, spawnDelayMs: 7000 },
      { enemyId: 'aoe', statMultiplier: 1.3, spawnDelayMs: 9500 },
      { enemyId: 'fast', statMultiplier: 1.4, spawnDelayMs: 12000 },
      { enemyId: 'ranged', statMultiplier: 1.4, spawnDelayMs: 13500 },
      { enemyId: 'tank', statMultiplier: 1.4, spawnDelayMs: 16000 },
      { enemyId: 'aoe', statMultiplier: 1.4, spawnDelayMs: 18500 },
      { enemyId: 'basic', statMultiplier: 1.5, spawnDelayMs: 21000 },
      { enemyId: 'ranged', statMultiplier: 1.5, spawnDelayMs: 22500 },
    ],
  },
  {
    id: 'stage9',
    displayName: 'Gauntlet',
    difficulty: 'Hard',
    startingMoney: 800,
    moneyAccrualPerSec: 42.5,
    baseHp: 90,
    enemyBaseHp: 500,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.4, spawnDelayMs: 1000 },
      { enemyId: 'fast', statMultiplier: 1.4, spawnDelayMs: 2500 },
      { enemyId: 'ranged', statMultiplier: 1.4, spawnDelayMs: 4500 },
      { enemyId: 'tank', statMultiplier: 1.4, spawnDelayMs: 7000 },
      { enemyId: 'aoe', statMultiplier: 1.4, spawnDelayMs: 9500 },
      { enemyId: 'fast', statMultiplier: 1.5, spawnDelayMs: 12000 },
      { enemyId: 'ranged', statMultiplier: 1.5, spawnDelayMs: 13500 },
      { enemyId: 'basic', statMultiplier: 1.5, spawnDelayMs: 15000 },
      { enemyId: 'tank', statMultiplier: 1.5, spawnDelayMs: 17500 },
      { enemyId: 'aoe', statMultiplier: 1.5, spawnDelayMs: 20000 },
      { enemyId: 'fast', statMultiplier: 1.6, spawnDelayMs: 22500 },
      { enemyId: 'ranged', statMultiplier: 1.6, spawnDelayMs: 24000 },
      { enemyId: 'tank', statMultiplier: 1.6, spawnDelayMs: 26500 },
    ],
  },
  {
    id: 'stage10',
    displayName: 'The Overlord',
    difficulty: 'Boss',
    startingMoney: 1000,
    moneyAccrualPerSec: 50,
    baseHp: 100,
    enemyBaseHp: 900,
    spawnScript: [
      { enemyId: 'fast', statMultiplier: 1.2, spawnDelayMs: 1000 },
      { enemyId: 'basic', statMultiplier: 1.2, spawnDelayMs: 3000 },
      { enemyId: 'ranged', statMultiplier: 1.3, spawnDelayMs: 6000 },
      { enemyId: 'tank', statMultiplier: 8, spawnDelayMs: 10000 }, // the boss
    ],
  },
];
