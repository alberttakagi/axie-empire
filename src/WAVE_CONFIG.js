// Endless spawner pacing. Every `tierDurationMs`, the tier counter goes up by
// one and enemies get tougher/faster/denser — tune the difficulty ramp here
// without touching GameScene.js.

export const WAVE_CONFIG = {
  tierDurationMs: 20000,

  // Per-tier multipliers applied to each enemy's base hp/moveSpeed at spawn time.
  hpMultiplierPerTier: 0.25,
  speedMultiplierPerTier: 0.1,

  // Spawn cadence: interval shrinks by spawnIntervalStepMs per tier, floored at minSpawnIntervalMs.
  baseSpawnIntervalMs: 1800,
  minSpawnIntervalMs: 500,
  spawnIntervalStepMs: 150,

  // Simultaneous enemies per wave = 1 + floor(tier / burstTierStep).
  burstTierStep: 2,

  // Minimum tier at which each ENEMY_CONFIG role can be picked for a spawn.
  // Keys must match ENEMY_CONFIG's role keys.
  roleUnlockTier: {
    basic: 0,
    fast: 0,
    ranged: 1,
    tank: 2,
    aoe: 3,
  },
};
