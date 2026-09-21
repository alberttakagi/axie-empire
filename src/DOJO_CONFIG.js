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
  // Roster expansion (bible §A.4.1): the 5 new enemy roles slot in above the
  // original ceiling of 3, escalating roughly by how dangerous each one is.
  // Wider enemy trait roster (bible §A.3.8): zombie/colossus/behemoth slot
  // in even later, mirroring their late-saga3 introduction in STAGE_CONFIG.
  //
  // The 9 named ENEMY_CONFIG roles below (thatguy/mehmeh/wanikun/usagin/
  // gory/kangaroo/ikkaku/gagagaga/kanban — the roster's real per-stage
  // "filler and boss" cast, see its own file header) were missing from this
  // map entirely — the spawn-role filter below reads a missing key as tier
  // 0 (`?? 0`), so all 9 were available from Dojo's very first wave,
  // including three LEGENDARY-rarity late-campaign bosses (kangaroo/
  // gagagaga/ikkaku, each ENEMY_CONFIG.js-commented as a real stage-35/38/41
  // boss with 4,000-15,000 HP). Tiers below follow each entry's own
  // `threat`/rarity/real-stage-number, matched against the closest
  // already-tiered role of similar threat: COMMON early filler at threat
  // 2-5 (kanban/wanikun/thatguy) alongside basic/fast/swarm at tier 0; RARE
  // early-mid roles at threat 8-9 (mehmeh/usagin) at tier 1; gory (EPIC,
  // stage-16 boss, threat 16 — same as support) at tier 3; the three
  // LEGENDARY late bosses staggered past the existing behemoth ceiling in
  // their own real stage order (kangaroo stage35/threat35 ties behemoth's
  // own threat35, gagagaga stage38/threat40, ikkaku stage41/threat45).
  roleUnlockTier: {
    basic: 0,
    fast: 0,
    swarm: 0,
    thatguy: 0,
    wanikun: 0,
    kanban: 0,
    ranged: 1,
    mehmeh: 1,
    usagin: 1,
    sniper: 2,
    tank: 2,
    aoe: 3,
    support: 3,
    gory: 3,
    guardian: 4,
    titan: 5,
    zombie: 5,
    colossus: 7,
    behemoth: 9,
    kangaroo: 9,
    gagagaga: 10,
    ikkaku: 11,
  },
};
