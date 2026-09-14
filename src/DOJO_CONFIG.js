// Sparring Grounds (bible §A.6.4's Catclaw Dojo) — a free, timed,
// score-attack mode against an invincible base with endless, escalating
// waves. Reuses the exact same combat engine as stage battles (GameScene
// branches on `this.mode === 'dojo'` at the handful of points that
// genuinely differ — win/loss, spawning, rewards — rather than
// duplicating the whole engine); this file only holds the escalation/pacing
// knobs specific to that endless spawner.

export const DOJO_CONFIG = {
  // No Energy cost to enter (bible: Dojo is free-play) — enforced by
  // HomeScene launching GameScene directly, without StageSelectScene's
  // energy gate in between.
  timeLimitMs: 3 * 60 * 1000, // bible reference: ~3-5 minutes: using the shorter end

  // Level-1-equivalent economy for a mode with no stage to inherit values
  // from. Deliberately modest — Dojo is about testing units against an
  // ever-tougher gauntlet, not about a big spending spree.
  startingMoney: 1000,
  moneyAccrualPerSec: 50,

  // Every tierDurationMs, the tier counter goes up by one and enemies get
  // tougher/faster/denser.
  tierDurationMs: 20000,
  hpMultiplierPerTier: 0.25,
  speedMultiplierPerTier: 0.1,

  // Spawn cadence: interval shrinks by spawnIntervalStepMs per tier, floored at minSpawnIntervalMs.
  baseSpawnIntervalMs: 1800,
  minSpawnIntervalMs: 500,
  spawnIntervalStepMs: 150,

  // Simultaneous enemies per wave = 1 + floor(tier / burstTierStep).
  burstTierStep: 2,

  // Minimum tier at which each ENEMY_CONFIG role can be picked for a spawn.
  roleUnlockTier: {
    basic: 0,
    fast: 0,
    ranged: 1,
    tank: 2,
    aoe: 3,
  },
};
