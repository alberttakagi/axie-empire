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
//                 Normal 1x, Hard 0.8x, Boss 1x of that base for
//                 startingMoney; moneyAccrualPerSec uses the same ratios
//                 except Hard, which is 0.85x rather than 0.8x — every Hard
//                 stage's moneyAccrualPerSec is consistently 42.5, i.e.
//                 0.85 * the 50 baseline, not 40).
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
//                                    Mutually exclusive with baseHpPercentTrigger
//                                    below — an entry uses exactly one trigger.
//                   baseHpPercentTrigger (bible §A.3.9) — an alternative to
//                                    spawnDelayMs: fires once the enemy
//                                    base's remaining HP crosses at/below
//                                    this percent, checked in GameScene's
//                                    damageEnemyBase rather than on a timer
//                                    (a failsafe there guarantees this can't
//                                    be skipped by one huge burst). Every
//                                    boss entry in this file uses 99, per
//                                    the bible's "bosses conventionally
//                                    trigger at 99% enemy base HP" note.
//                   isBoss           triggers GameScene's boss-shockwave
//                                    moment (knocks back every deployed
//                                    player unit) the instant this entry
//                                    spawns.
//   baseXp        this stage's XP reward (bible §A.5.1) on a first clear;
//                 repeat clears taper toward a floor — see GameScene's
//                 getXpReward for the exact decay formula. This is the
//                 meta-progression XP (PlayerProgress.js), unrelated to
//                 the in-battle money economy above.
//   energyCost    stamina/Energy (bible §A.9, JP-confirmed term 統率力) spent
//                 to ENTER this stage at all — deducted (and entry blocked
//                 if insufficient) by StageSelectScene before GameScene ever
//                 starts; see Energy.js. Never refunded on a loss.
//   gemsFirstClear  a one-time Gems reward (bible §A.5's premium-currency
//                 equivalent) paid out ONLY the very first time this stage
//                 is won — distinct from the always-available XP/Treasure
//                 rewards above. See GameScene.winStage.
//   restrictions  optional (bible §A.6.5's Restriction Stage) — a modifier
//                 layer most stages omit entirely. Fields (any combo):
//                   maxDeployed       hard cap on simultaneously-alive
//                                     player units on the field at once
//                                     (well below the engine's implicit
//                                     "however many you can afford" limit).
//                   bannedUnitTypes   UNIT_CONFIG keys that can't be
//                                     deployed at all on this stage, even
//                                     though they're still in the Formation.
//                   costRange         { min, max } — a unit can't be
//                                     deployed unless its cost falls in
//                                     this (inclusive) band.
//                 All enforced in GameScene.trySpawnUnit, which shows a
//                 brief on-screen reason when a restriction blocks a tap.
//   allowContinue  optional, defaults to true — bible §A.3.9's Continue
//                 mechanic (pay Gems to refill your base and keep fighting
//                 after a loss) is offered on any stage that doesn't set
//                 this to false. Every saga boss disables it.
//   Clearing a stage = reducing its enemy base's HP to 0 (see GameScene's
//   damageEnemyBase/winStage).

// Saga 1 — REBUILT to mirror real Battle Cats' own Empire of Cats Chapter 1
// pacing (guide Chapter 04/11): one new Basic-tier lineage unlocks roughly
// once per early stage cleared (see UNIT_CONFIG.js's unlockRequirement on
// each lineage), enemies are introduced in the same rough order the real
// game does (plain white filler first, then the first Red enemy, then
// increasingly tanky/ranged threats), and the final stage's boss is the
// real Empire of Cats final boss (Emperor Nyandam) rather than a scaled-up
// regular enemy. This is a faithful RECONSTRUCTION of that pacing, not a
// byte-exact dump of the real game's actual 48-stage chapter — the guide's
// own data doesn't include full stage-by-stage spawn tables for all 48, only
// the general schema/roster/formula this build is built from (see
// docs/BATTLE_CATS_MAPPING.md for the full reasoning and what's condensed).
//
// startingMoney/moneyAccrualPerSec now use the guide's own real numbers
// directly: 6000 is the real, screenshot-confirmed Worker Cat Lv1 wallet cap
// (see MONEY_CONFIG.js's own header), and 170/sec is the guide's stated real
// Lv1 income rate (Chapter 08) — both held constant across every Chapter-1
// stage, matching how the real game scales difficulty through the ENEMIES
// a stage throws at you, not by nerfing your own economy stage-to-stage.
export const STAGE_CONFIG = [
  {
    id: 'stage1',
    saga: 'saga1',
    displayName: 'Empire of Axies I',
    difficulty: 'Easy',
    baseXp: 1000,
    energyCost: 5,
    gemsFirstClear: 20,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 1000,
    enemyBaseHp: 300,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 2000 },
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 8000 },
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 14000 },
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 20000 },
      { enemyId: 'basic', statMultiplier: 1.1, spawnDelayMs: 26000 },
    ],
  },
  {
    id: 'stage2',
    saga: 'saga1',
    displayName: 'Empire of Axies II',
    difficulty: 'Easy',
    baseXp: 1200,
    energyCost: 6,
    gemsFirstClear: 25,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 1000,
    enemyBaseHp: 450,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 2000 },
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 6000 },
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 10000 },
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 14000 },
      { enemyId: 'basic', statMultiplier: 1.1, spawnDelayMs: 18000 },
      { enemyId: 'fast', statMultiplier: 1.1, spawnDelayMs: 22000 },
    ],
  },
  {
    id: 'stage3',
    saga: 'saga1',
    displayName: 'Empire of Axies III',
    difficulty: 'Easy',
    baseXp: 1400,
    energyCost: 7,
    gemsFirstClear: 30,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 1000,
    enemyBaseHp: 650,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1, spawnDelayMs: 1500 },
      { enemyId: 'swarm', statMultiplier: 1, spawnDelayMs: 4000 },
      { enemyId: 'fast', statMultiplier: 1, spawnDelayMs: 7000 },
      { enemyId: 'swarm', statMultiplier: 1, spawnDelayMs: 9500 },
      { enemyId: 'basic', statMultiplier: 1.05, spawnDelayMs: 13000 },
      { enemyId: 'swarm', statMultiplier: 1.05, spawnDelayMs: 15500 },
      { enemyId: 'fast', statMultiplier: 1.05, spawnDelayMs: 19000 },
    ],
  },
  {
    id: 'stage4',
    saga: 'saga1',
    displayName: 'Empire of Axies IV',
    difficulty: 'Normal',
    baseXp: 2000,
    energyCost: 8,
    gemsFirstClear: 35,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    enemyBaseHp: 900,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.05, spawnDelayMs: 1500 },
      { enemyId: 'swarm', statMultiplier: 1.05, spawnDelayMs: 4000 },
      { enemyId: 'sniper', statMultiplier: 1, spawnDelayMs: 7000 },
      { enemyId: 'fast', statMultiplier: 1.05, spawnDelayMs: 10500 },
      { enemyId: 'sniper', statMultiplier: 1.05, spawnDelayMs: 13500 },
      { enemyId: 'swarm', statMultiplier: 1.1, spawnDelayMs: 17000 },
      { enemyId: 'sniper', statMultiplier: 1.1, spawnDelayMs: 20000 },
    ],
  },
  {
    id: 'stage5',
    saga: 'saga1',
    displayName: 'Empire of Axies V',
    difficulty: 'Normal',
    baseXp: 2500,
    energyCost: 9,
    gemsFirstClear: 40,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    enemyBaseHp: 1300,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.1, spawnDelayMs: 1500 },
      { enemyId: 'sniper', statMultiplier: 1.05, spawnDelayMs: 4500 },
      // Hippoe (real Battle Cats' own early "wall boss") — this stage's
      // first genuinely tanky enemy, matching the real game's own pacing.
      { enemyId: 'tank', statMultiplier: 1, spawnDelayMs: 8000 },
      { enemyId: 'fast', statMultiplier: 1.1, spawnDelayMs: 14000 },
      { enemyId: 'swarm', statMultiplier: 1.1, spawnDelayMs: 17000 },
      { enemyId: 'tank', statMultiplier: 1.05, spawnDelayMs: 21000 },
    ],
  },
  {
    id: 'stage6',
    saga: 'saga1',
    displayName: 'Empire of Axies VI',
    difficulty: 'Normal',
    baseXp: 3000,
    energyCost: 10,
    gemsFirstClear: 45,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    enemyBaseHp: 1800,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.1, spawnDelayMs: 1500 },
      { enemyId: 'tank', statMultiplier: 1.05, spawnDelayMs: 4500 },
      // Piggeh — the guide's first Red-attribute enemy (see UNIT_CONFIG.js's
      // Axe Cat/Fish Cat, the two lineages Strong Against Red).
      { enemyId: 'aoe', statMultiplier: 1, spawnDelayMs: 8000 },
      { enemyId: 'sniper', statMultiplier: 1.1, spawnDelayMs: 12000 },
      { enemyId: 'swarm', statMultiplier: 1.15, spawnDelayMs: 15500 },
      { enemyId: 'aoe', statMultiplier: 1.05, spawnDelayMs: 19000 },
      { enemyId: 'tank', statMultiplier: 1.1, spawnDelayMs: 23000 },
    ],
  },
  {
    id: 'stage7',
    saga: 'saga1',
    displayName: 'Empire of Axies VII',
    difficulty: 'Hard',
    baseXp: 4000,
    energyCost: 12,
    gemsFirstClear: 55,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 850,
    enemyBaseHp: 2400,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.15, spawnDelayMs: 1500 },
      { enemyId: 'aoe', statMultiplier: 1.05, spawnDelayMs: 4500 },
      // Gomasama — a fast, Red-attribute area attacker.
      { enemyId: 'support', statMultiplier: 1, spawnDelayMs: 8000 },
      { enemyId: 'tank', statMultiplier: 1.15, spawnDelayMs: 12000 },
      { enemyId: 'sniper', statMultiplier: 1.15, spawnDelayMs: 16000 },
      { enemyId: 'support', statMultiplier: 1.05, spawnDelayMs: 20000 },
      { enemyId: 'swarm', statMultiplier: 1.2, spawnDelayMs: 23500 },
    ],
  },
  {
    id: 'stage8',
    saga: 'saga1',
    displayName: 'Empire of Axies VIII',
    difficulty: 'Hard',
    baseXp: 5000,
    energyCost: 14,
    gemsFirstClear: 65,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 850,
    enemyBaseHp: 3200,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.2, spawnDelayMs: 1500 },
      { enemyId: 'support', statMultiplier: 1.1, spawnDelayMs: 4500 },
      // Kuma-sensei — long range, KB10, the toughest non-boss enemy this
      // stage introduces.
      { enemyId: 'guardian', statMultiplier: 1, spawnDelayMs: 8000 },
      { enemyId: 'aoe', statMultiplier: 1.1, spawnDelayMs: 13000 },
      { enemyId: 'tank', statMultiplier: 1.2, spawnDelayMs: 17000 },
      { enemyId: 'guardian', statMultiplier: 1.05, spawnDelayMs: 21500 },
      { enemyId: 'sniper', statMultiplier: 1.2, spawnDelayMs: 25500 },
    ],
  },
  {
    id: 'stage9',
    saga: 'saga1',
    displayName: 'Empire of Axies IX',
    difficulty: 'Hard',
    baseXp: 6000,
    energyCost: 16,
    gemsFirstClear: 75,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 850,
    // Restriction Stage (bible §A.6.5): forces lineup discipline instead of
    // just spamming everything at once — this is also the full-roster
    // "gauntlet" stage, mixing every enemy introduced so far.
    restrictions: { maxDeployed: 6 },
    enemyBaseHp: 4200,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.2, spawnDelayMs: 1000 },
      { enemyId: 'fast', statMultiplier: 1.15, spawnDelayMs: 3000 },
      { enemyId: 'swarm', statMultiplier: 1.25, spawnDelayMs: 5500 },
      { enemyId: 'sniper', statMultiplier: 1.25, spawnDelayMs: 8500 },
      { enemyId: 'tank', statMultiplier: 1.25, spawnDelayMs: 12000 },
      { enemyId: 'aoe', statMultiplier: 1.2, spawnDelayMs: 16000 },
      { enemyId: 'support', statMultiplier: 1.2, spawnDelayMs: 19500 },
      { enemyId: 'guardian', statMultiplier: 1.1, spawnDelayMs: 23000 },
      // Paon — real long-range artillery, this stage's escalation past
      // Kuma-sensei's own reach.
      { enemyId: 'ranged', statMultiplier: 1, spawnDelayMs: 27000 },
    ],
  },
  {
    id: 'stage10',
    saga: 'saga1',
    displayName: 'Empire of Axies: Overlord',
    difficulty: 'Boss',
    baseXp: 12000,
    energyCost: 25,
    gemsFirstClear: 150,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    // Continue (bible §A.3.9): "a subset of harder/special stages explicitly
    // disable this" — every saga's final boss does, here.
    allowContinue: false,
    enemyBaseHp: 6000,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.2, spawnDelayMs: 1000 },
      { enemyId: 'fast', statMultiplier: 1.2, spawnDelayMs: 3500 },
      { enemyId: 'sniper', statMultiplier: 1.25, spawnDelayMs: 6500 },
      { enemyId: 'tank', statMultiplier: 1.25, spawnDelayMs: 10000 },
      { enemyId: 'aoe', statMultiplier: 1.2, spawnDelayMs: 14000 },
      { enemyId: 'support', statMultiplier: 1.2, spawnDelayMs: 18000 },
      { enemyId: 'guardian', statMultiplier: 1.15, spawnDelayMs: 22000 },
      { enemyId: 'ranged', statMultiplier: 1.1, spawnDelayMs: 26000 },
      // Base-HP%-triggered boss spawn (bible §A.3.9): fires once the enemy
      // base drops to 99% HP — i.e. almost immediately once it's taken ANY
      // damage — rather than at a fixed time offset, with a failsafe
      // (GameScene's damageEnemyBase) guaranteeing it can't be skipped by a
      // single huge burst. isBoss triggers the shockwave-knockback moment.
      // Emperor Nyandam — the real Empire of Cats Chapter 1 final boss, at
      // its own real (unscaled) strength.
      { enemyId: 'titan', statMultiplier: 1, baseHpPercentTrigger: 99, isBoss: true },
    ],
  },
  // Saga 2 & 3 — real Battle Cats repeats the SAME map across Chapters 1-3,
  // just with the enemy strength magnification (statMultiplier) climbing —
  // so these reuse saga1's own 10 real enemies (no zombie/colossus/behemoth;
  // still dormant, see ENEMY_CONFIG.js) at progressively higher %, rather
  // than introducing new enemy types. Economy again held constant
  // (6000¥/170¥-sec, see saga1's own header) — difficulty comes entirely
  // from enemy strength here, matching the real game.
  {
    id: 'stage11',
    saga: 'saga2',
    displayName: 'Empire of Axies: Chapter 2, I',
    difficulty: 'Easy',
    baseXp: 13000,
    energyCost: 26,
    gemsFirstClear: 160,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 1000,
    enemyBaseHp: 5000,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.4, spawnDelayMs: 1000 },
      { enemyId: 'swarm', statMultiplier: 1.4, spawnDelayMs: 3000 },
      { enemyId: 'fast', statMultiplier: 1.4, spawnDelayMs: 5500 },
      { enemyId: 'sniper', statMultiplier: 1.4, spawnDelayMs: 8500 },
      { enemyId: 'tank', statMultiplier: 1.4, spawnDelayMs: 12000 },
    ],
  },
  {
    id: 'stage12',
    saga: 'saga2',
    displayName: 'Empire of Axies: Chapter 2, II',
    difficulty: 'Easy',
    baseXp: 14500,
    energyCost: 27,
    gemsFirstClear: 175,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 1000,
    enemyBaseHp: 5800,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.45, spawnDelayMs: 1000 },
      { enemyId: 'aoe', statMultiplier: 1.45, spawnDelayMs: 3500 },
      { enemyId: 'support', statMultiplier: 1.45, spawnDelayMs: 6500 },
      { enemyId: 'swarm', statMultiplier: 1.5, spawnDelayMs: 9500 },
      { enemyId: 'tank', statMultiplier: 1.5, spawnDelayMs: 12500 },
      { enemyId: 'sniper', statMultiplier: 1.5, spawnDelayMs: 16000 },
    ],
  },
  {
    id: 'stage13',
    saga: 'saga2',
    displayName: 'Empire of Axies: Chapter 2, III',
    difficulty: 'Normal',
    baseXp: 16500,
    energyCost: 29,
    gemsFirstClear: 195,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 950,
    enemyBaseHp: 6700,
    spawnScript: [
      { enemyId: 'fast', statMultiplier: 1.55, spawnDelayMs: 1000 },
      { enemyId: 'sniper', statMultiplier: 1.55, spawnDelayMs: 3500 },
      { enemyId: 'guardian', statMultiplier: 1.5, spawnDelayMs: 6500 },
      { enemyId: 'aoe', statMultiplier: 1.55, spawnDelayMs: 9500 },
      { enemyId: 'tank', statMultiplier: 1.6, spawnDelayMs: 13000 },
      { enemyId: 'support', statMultiplier: 1.55, spawnDelayMs: 16500 },
    ],
  },
  {
    id: 'stage14',
    saga: 'saga2',
    displayName: 'Empire of Axies: Chapter 2, IV',
    difficulty: 'Normal',
    baseXp: 18500,
    energyCost: 31,
    gemsFirstClear: 215,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 950,
    enemyBaseHp: 7700,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.6, spawnDelayMs: 1000 },
      { enemyId: 'ranged', statMultiplier: 1.5, spawnDelayMs: 3500 },
      { enemyId: 'aoe', statMultiplier: 1.65, spawnDelayMs: 7000 },
      { enemyId: 'guardian', statMultiplier: 1.6, spawnDelayMs: 10500 },
      { enemyId: 'sniper', statMultiplier: 1.65, spawnDelayMs: 14000 },
      { enemyId: 'support', statMultiplier: 1.65, spawnDelayMs: 17500 },
    ],
  },
  {
    id: 'stage15',
    saga: 'saga2',
    displayName: 'Empire of Axies: Chapter 2, V',
    difficulty: 'Normal',
    baseXp: 21000,
    energyCost: 33,
    gemsFirstClear: 240,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 950,
    restrictions: { costRange: { min: 100, max: 1500 } },
    enemyBaseHp: 8800,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.7, spawnDelayMs: 1000 },
      { enemyId: 'fast', statMultiplier: 1.7, spawnDelayMs: 2800 },
      { enemyId: 'tank', statMultiplier: 1.7, spawnDelayMs: 5600 },
      { enemyId: 'sniper', statMultiplier: 1.75, spawnDelayMs: 9000 },
      { enemyId: 'ranged', statMultiplier: 1.6, spawnDelayMs: 12500 },
      { enemyId: 'aoe', statMultiplier: 1.75, spawnDelayMs: 16000 },
      { enemyId: 'support', statMultiplier: 1.75, spawnDelayMs: 19000 },
    ],
  },
  {
    id: 'stage16',
    saga: 'saga2',
    displayName: 'Empire of Axies: Chapter 2, VI',
    difficulty: 'Hard',
    baseXp: 24000,
    energyCost: 36,
    gemsFirstClear: 270,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    enemyBaseHp: 10000,
    spawnScript: [
      { enemyId: 'swarm', statMultiplier: 1.8, spawnDelayMs: 1000 },
      { enemyId: 'guardian', statMultiplier: 1.75, spawnDelayMs: 3500 },
      { enemyId: 'sniper', statMultiplier: 1.85, spawnDelayMs: 7000 },
      { enemyId: 'tank', statMultiplier: 1.85, spawnDelayMs: 10500 },
      { enemyId: 'support', statMultiplier: 1.85, spawnDelayMs: 14000 },
      { enemyId: 'aoe', statMultiplier: 1.85, spawnDelayMs: 17500 },
      { enemyId: 'ranged', statMultiplier: 1.7, spawnDelayMs: 21000 },
    ],
  },
  {
    id: 'stage17',
    saga: 'saga2',
    displayName: 'Empire of Axies: Chapter 2, VII',
    difficulty: 'Hard',
    baseXp: 27000,
    energyCost: 39,
    gemsFirstClear: 300,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    enemyBaseHp: 11400,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 1.9, spawnDelayMs: 1000 },
      { enemyId: 'fast', statMultiplier: 1.9, spawnDelayMs: 2800 },
      { enemyId: 'aoe', statMultiplier: 1.95, spawnDelayMs: 5600 },
      { enemyId: 'guardian', statMultiplier: 1.85, spawnDelayMs: 9000 },
      { enemyId: 'sniper', statMultiplier: 1.95, spawnDelayMs: 12500 },
      { enemyId: 'tank', statMultiplier: 1.95, spawnDelayMs: 16000 },
      { enemyId: 'support', statMultiplier: 1.95, spawnDelayMs: 19500 },
    ],
  },
  {
    id: 'stage18',
    saga: 'saga2',
    displayName: 'Empire of Axies: Chapter 2, VIII',
    difficulty: 'Hard',
    baseXp: 30500,
    energyCost: 42,
    gemsFirstClear: 335,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    enemyBaseHp: 13000,
    spawnScript: [
      { enemyId: 'swarm', statMultiplier: 2, spawnDelayMs: 1000 },
      { enemyId: 'ranged', statMultiplier: 1.85, spawnDelayMs: 3000 },
      { enemyId: 'guardian', statMultiplier: 1.95, spawnDelayMs: 6000 },
      { enemyId: 'aoe', statMultiplier: 2.05, spawnDelayMs: 9500 },
      { enemyId: 'sniper', statMultiplier: 2.05, spawnDelayMs: 13000 },
      { enemyId: 'tank', statMultiplier: 2.05, spawnDelayMs: 16500 },
      { enemyId: 'support', statMultiplier: 2.05, spawnDelayMs: 20000 },
    ],
  },
  {
    id: 'stage19',
    saga: 'saga2',
    displayName: 'Empire of Axies: Chapter 2, IX',
    difficulty: 'Hard',
    baseXp: 34500,
    energyCost: 45,
    gemsFirstClear: 375,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    // Restriction Stage (bible §A.6.5): full-roster gauntlet before the
    // Chapter 2 boss.
    restrictions: { maxDeployed: 6 },
    enemyBaseHp: 14800,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 2.1, spawnDelayMs: 800 },
      { enemyId: 'fast', statMultiplier: 2.1, spawnDelayMs: 2400 },
      { enemyId: 'swarm', statMultiplier: 2.15, spawnDelayMs: 4800 },
      { enemyId: 'sniper', statMultiplier: 2.15, spawnDelayMs: 8000 },
      { enemyId: 'tank', statMultiplier: 2.15, spawnDelayMs: 11500 },
      { enemyId: 'aoe', statMultiplier: 2.15, spawnDelayMs: 15000 },
      { enemyId: 'support', statMultiplier: 2.15, spawnDelayMs: 18500 },
      { enemyId: 'guardian', statMultiplier: 2.1, spawnDelayMs: 22000 },
      { enemyId: 'ranged', statMultiplier: 2, spawnDelayMs: 25500 },
    ],
  },
  {
    id: 'stage20',
    saga: 'saga2',
    displayName: 'Empire of Axies: Overlord Returns',
    difficulty: 'Boss',
    baseXp: 60000,
    energyCost: 55,
    gemsFirstClear: 600,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    restrictions: { bannedUnitTypes: ['titan'] },
    allowContinue: false, // Continue (bible §A.3.9) — disabled for saga bosses, see stage10's own comment
    enemyBaseHp: 20000,
    spawnScript: [
      { enemyId: 'sniper', statMultiplier: 2.2, spawnDelayMs: 1000 },
      { enemyId: 'support', statMultiplier: 2.2, spawnDelayMs: 3500 },
      { enemyId: 'swarm', statMultiplier: 2.2, spawnDelayMs: 6500 },
      { enemyId: 'tank', statMultiplier: 2.2, spawnDelayMs: 10000 },
      { enemyId: 'aoe', statMultiplier: 2.2, spawnDelayMs: 14000 },
      { enemyId: 'guardian', statMultiplier: 2.15, spawnDelayMs: 18000 },
      { enemyId: 'ranged', statMultiplier: 2.1, spawnDelayMs: 22000 },
      // Base-HP%-triggered boss spawn (see stage10's own comment) — same
      // 99% trigger + isBoss shockwave. Emperor Nyandam again — real Battle
      // Cats re-fights its own Chapter 1 final boss, stronger, as Chapter
      // 2's finale too.
      { enemyId: 'titan', statMultiplier: 1.6, baseHpPercentTrigger: 99, isBoss: true },
    ],
  },
  {
    id: 'stage21',
    saga: 'saga3',
    displayName: 'Empire of Axies: Chapter 3, I',
    difficulty: 'Easy',
    baseXp: 65000,
    energyCost: 57,
    gemsFirstClear: 640,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 1000,
    enemyBaseHp: 22000,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 2.3, spawnDelayMs: 1000 },
      { enemyId: 'swarm', statMultiplier: 2.3, spawnDelayMs: 3000 },
      { enemyId: 'sniper', statMultiplier: 2.3, spawnDelayMs: 5500 },
      { enemyId: 'tank', statMultiplier: 2.3, spawnDelayMs: 8500 },
      { enemyId: 'support', statMultiplier: 2.3, spawnDelayMs: 12000 },
    ],
  },
  {
    id: 'stage22',
    saga: 'saga3',
    displayName: 'Empire of Axies: Chapter 3, II',
    difficulty: 'Easy',
    baseXp: 72000,
    energyCost: 60,
    gemsFirstClear: 680,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 1000,
    enemyBaseHp: 24500,
    spawnScript: [
      { enemyId: 'fast', statMultiplier: 2.4, spawnDelayMs: 1000 },
      { enemyId: 'aoe', statMultiplier: 2.4, spawnDelayMs: 3500 },
      { enemyId: 'guardian', statMultiplier: 2.35, spawnDelayMs: 6500 },
      { enemyId: 'sniper', statMultiplier: 2.45, spawnDelayMs: 10000 },
      { enemyId: 'tank', statMultiplier: 2.45, spawnDelayMs: 13500 },
      { enemyId: 'ranged', statMultiplier: 2.3, spawnDelayMs: 17000 },
    ],
  },
  {
    id: 'stage23',
    saga: 'saga3',
    displayName: 'Empire of Axies: Chapter 3, III',
    difficulty: 'Normal',
    baseXp: 82000,
    energyCost: 63,
    gemsFirstClear: 740,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 950,
    enemyBaseHp: 27500,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 2.55, spawnDelayMs: 1000 },
      { enemyId: 'support', statMultiplier: 2.55, spawnDelayMs: 3500 },
      { enemyId: 'swarm', statMultiplier: 2.6, spawnDelayMs: 7000 },
      { enemyId: 'guardian', statMultiplier: 2.5, spawnDelayMs: 10500 },
      { enemyId: 'aoe', statMultiplier: 2.6, spawnDelayMs: 14000 },
      { enemyId: 'sniper', statMultiplier: 2.65, spawnDelayMs: 17500 },
      { enemyId: 'tank', statMultiplier: 2.65, spawnDelayMs: 21000 },
    ],
  },
  {
    id: 'stage24',
    saga: 'saga3',
    displayName: 'Empire of Axies: Chapter 3, IV',
    difficulty: 'Normal',
    baseXp: 92000,
    energyCost: 67,
    gemsFirstClear: 800,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 950,
    enemyBaseHp: 31000,
    spawnScript: [
      { enemyId: 'fast', statMultiplier: 2.75, spawnDelayMs: 1000 },
      { enemyId: 'ranged', statMultiplier: 2.6, spawnDelayMs: 3000 },
      { enemyId: 'aoe', statMultiplier: 2.8, spawnDelayMs: 6500 },
      { enemyId: 'support', statMultiplier: 2.8, spawnDelayMs: 10000 },
      { enemyId: 'guardian', statMultiplier: 2.7, spawnDelayMs: 13500 },
      { enemyId: 'sniper', statMultiplier: 2.85, spawnDelayMs: 17000 },
      { enemyId: 'tank', statMultiplier: 2.85, spawnDelayMs: 20500 },
    ],
  },
  {
    id: 'stage25',
    saga: 'saga3',
    displayName: 'Empire of Axies: Chapter 3, V',
    difficulty: 'Normal',
    baseXp: 104000,
    energyCost: 70,
    gemsFirstClear: 870,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 950,
    restrictions: { costRange: { min: 400, max: 1600 } },
    enemyBaseHp: 35000,
    spawnScript: [
      { enemyId: 'basic', statMultiplier: 3, spawnDelayMs: 1000 },
      { enemyId: 'fast', statMultiplier: 3, spawnDelayMs: 2600 },
      { enemyId: 'swarm', statMultiplier: 3, spawnDelayMs: 5200 },
      { enemyId: 'tank', statMultiplier: 3, spawnDelayMs: 8500 },
      { enemyId: 'sniper', statMultiplier: 3, spawnDelayMs: 12000 },
      { enemyId: 'guardian', statMultiplier: 2.9, spawnDelayMs: 15500 },
      { enemyId: 'support', statMultiplier: 3, spawnDelayMs: 18500 },
      { enemyId: 'aoe', statMultiplier: 3, spawnDelayMs: 21500 },
    ],
  },
  {
    id: 'stage26',
    saga: 'saga3',
    displayName: 'Empire of Axies: Chapter 3, VI',
    difficulty: 'Hard',
    baseXp: 117000,
    energyCost: 75,
    gemsFirstClear: 950,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    enemyBaseHp: 40000,
    spawnScript: [
      { enemyId: 'ranged', statMultiplier: 3, spawnDelayMs: 1000 },
      { enemyId: 'guardian', statMultiplier: 3.1, spawnDelayMs: 3500 },
      { enemyId: 'sniper', statMultiplier: 3.2, spawnDelayMs: 7000 },
      { enemyId: 'support', statMultiplier: 3.2, spawnDelayMs: 10500 },
      { enemyId: 'swarm', statMultiplier: 3.2, spawnDelayMs: 14000 },
      { enemyId: 'tank', statMultiplier: 3.2, spawnDelayMs: 17500 },
      { enemyId: 'aoe', statMultiplier: 3.2, spawnDelayMs: 21000 },
    ],
  },
  {
    id: 'stage27',
    saga: 'saga3',
    displayName: 'Empire of Axies: Chapter 3, VII',
    difficulty: 'Hard',
    baseXp: 131000,
    energyCost: 80,
    gemsFirstClear: 1040,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    enemyBaseHp: 45500,
    spawnScript: [
      { enemyId: 'aoe', statMultiplier: 3.35, spawnDelayMs: 1000 },
      { enemyId: 'basic', statMultiplier: 3.35, spawnDelayMs: 2800 },
      { enemyId: 'support', statMultiplier: 3.4, spawnDelayMs: 5600 },
      { enemyId: 'sniper', statMultiplier: 3.45, spawnDelayMs: 9000 },
      { enemyId: 'guardian', statMultiplier: 3.35, spawnDelayMs: 12500 },
      { enemyId: 'tank', statMultiplier: 3.45, spawnDelayMs: 16000 },
      { enemyId: 'swarm', statMultiplier: 3.45, spawnDelayMs: 19500 },
    ],
  },
  {
    id: 'stage28',
    saga: 'saga3',
    displayName: 'Empire of Axies: Chapter 3, VIII',
    difficulty: 'Hard',
    baseXp: 147000,
    energyCost: 85,
    gemsFirstClear: 1140,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    enemyBaseHp: 51500,
    spawnScript: [
      { enemyId: 'guardian', statMultiplier: 3.6, spawnDelayMs: 1000 },
      { enemyId: 'fast', statMultiplier: 3.6, spawnDelayMs: 3500 },
      { enemyId: 'sniper', statMultiplier: 3.7, spawnDelayMs: 6500 },
      { enemyId: 'support', statMultiplier: 3.7, spawnDelayMs: 10000 },
      { enemyId: 'ranged', statMultiplier: 3.5, spawnDelayMs: 13500 },
      { enemyId: 'swarm', statMultiplier: 3.7, spawnDelayMs: 17000 },
      { enemyId: 'tank', statMultiplier: 3.7, spawnDelayMs: 20500 },
      { enemyId: 'aoe', statMultiplier: 3.7, spawnDelayMs: 24000 },
    ],
  },
  {
    id: 'stage29',
    saga: 'saga3',
    displayName: 'Empire of Axies: Chapter 3, IX',
    difficulty: 'Hard',
    baseXp: 166000,
    energyCost: 89,
    gemsFirstClear: 1250,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    // Restriction Stage (bible §A.6.5): full-roster gauntlet before the
    // campaign's final boss.
    restrictions: { maxDeployed: 7 },
    enemyBaseHp: 58000,
    spawnScript: [
      { enemyId: 'swarm', statMultiplier: 3.9, spawnDelayMs: 800 },
      { enemyId: 'sniper', statMultiplier: 3.95, spawnDelayMs: 2400 },
      { enemyId: 'support', statMultiplier: 3.95, spawnDelayMs: 4800 },
      { enemyId: 'tank', statMultiplier: 3.9, spawnDelayMs: 8000 },
      { enemyId: 'guardian', statMultiplier: 3.85, spawnDelayMs: 11500 },
      { enemyId: 'aoe', statMultiplier: 3.95, spawnDelayMs: 15000 },
      { enemyId: 'ranged', statMultiplier: 3.75, spawnDelayMs: 18500 },
      { enemyId: 'basic', statMultiplier: 3.95, spawnDelayMs: 22000 },
      { enemyId: 'fast', statMultiplier: 3.95, spawnDelayMs: 25500 },
    ],
  },
  {
    id: 'stage30',
    saga: 'saga3',
    displayName: 'Empire of Axies: The Ascendant',
    difficulty: 'Boss',
    baseXp: 289000,
    energyCost: 107,
    gemsFirstClear: 2130,
    startingMoney: 6000,
    moneyAccrualPerSec: 170,
    baseHp: 900,
    restrictions: { bannedUnitTypes: ['titan'] },
    allowContinue: false, // Continue (bible §A.3.9) — disabled for saga bosses, see stage10's own comment
    enemyBaseHp: 80000,
    spawnScript: [
      { enemyId: 'guardian', statMultiplier: 4.1, spawnDelayMs: 1000 },
      { enemyId: 'sniper', statMultiplier: 4.2, spawnDelayMs: 3000 },
      { enemyId: 'support', statMultiplier: 4.2, spawnDelayMs: 5500 },
      { enemyId: 'swarm', statMultiplier: 4.2, spawnDelayMs: 8000 },
      { enemyId: 'aoe', statMultiplier: 4.2, spawnDelayMs: 11000 },
      { enemyId: 'tank', statMultiplier: 4.2, spawnDelayMs: 14500 },
      { enemyId: 'ranged', statMultiplier: 4, spawnDelayMs: 18000 },
      // Base-HP%-triggered boss spawn (see stage10's own comment) — same
      // 99% trigger + isBoss shockwave, for the campaign's final boss —
      // Emperor Nyandam's strongest real-Chapter-1-boss-refight form yet.
      { enemyId: 'titan', statMultiplier: 3, baseHpPercentTrigger: 99, isBoss: true },
    ],
  },
];

// Unit cost scales per stage/chapter (bible §A.3.7) — NEVER per unit level.
// Battle Cats' own stated range is "commonly 1.0x in the earliest content,
// rising to ~1.5x-2.0x in later chapters"; mapped directly onto this game's
// 3 sagas (rather than a smooth per-stage ramp) since the bible describes it
// in exactly those chapter-bucket terms. Applied at summon time
// (GameScene.trySpawnUnit) on top of UNIT_CONFIG's own base cost — falls
// back to 1.0x for a saga-less pseudo-stage (Sparring Grounds' dojo mode).
const SAGA_COST_MULTIPLIERS = { saga1: 1.0, saga2: 1.5, saga3: 2.0 };

export function getStageCostMultiplier(stage) {
  return SAGA_COST_MULTIPLIERS[stage?.saga] ?? 1.0;
}
