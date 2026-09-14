// On-hit status-effect system. Real reference: BCU-java-PC's combat engine
// (Entity.java/EUnit.java) has status effects beyond knockback — flagged
// during the earlier trait/knockback research but not implemented at the
// time. This fills that gap.
//
// Unlike knockback (a passive stat every unit/enemy has), a status effect is
// an opt-in *chance* to inflict on hit, via a `statusOnHit` field on a
// UNIT_CONFIG/ENEMY_CONFIG entry:
//   { type: STATUS_TYPES.NONE }                                   — default.
//   { type: STATUS_TYPES.SLOW,   chance, durationMs, multiplier }  — halves
//        (or `multiplier`s) the target's effective moveSpeed AND attackSpeed
//        for durationMs.
//   { type: STATUS_TYPES.STOP,   chance, durationMs }              — target
//        can't move, attack, or seek a target at all for durationMs (like
//        knockback's AI-skip, but no shove — a true freeze).
//   { type: STATUS_TYPES.WEAKEN, chance, durationMs, multiplier }   — target's
//        outgoing damage is multiplied by `multiplier` (bible §A.3.8 —
//        Weaken touches attack power only, never movement; that's Slow's
//        job) for durationMs. Independent of Slow — an entity can be both
//        Weakened and Slowed at once, unlike Slow/Stop/Curse which share
//        priority for tint purposes only, not for actually stacking.
//   { type: STATUS_TYPES.CURSE,  chance, durationMs }              — target's
//        special ability is suppressed for durationMs: a `special.type:
//        'aoe'` unit/enemy falls back to hitting only its primary target,
//        Wave Attack/Toxic don't trigger, and the player's base can't
//        trigger its special burst.
//   { type: STATUS_TYPES.WARP, chance, durationMs, minDistance,
//        maxDistance }                                             — target
//        vanishes from the field entirely for durationMs (invisible,
//        untargetable, no movement/attack/target-seeking — like Stop but
//        also removed from play), then reappears shoved a random distance
//        (minDistance..maxDistance, direction randomized forward/backward)
//        from where it vanished. A defender with `config.warpImmune: true`
//        negates this outright (the roll can still "hit," it just does
//        nothing) — see GameScene's applyStatusEffect.
//
// `chance` is rolled independently on every hit that lands (see GameScene's
// applyStatusEffect) — it can stack/refresh its own duration on repeat
// procs. Slow/Stop/Curse/Warp share one visual-priority tint/visibility
// state (stop beats curse beats slow beats weaken; warp overrides all of
// them by simply making the entity invisible) since only one can visibly
// "look like" the entity's state at a glance; Weaken is tracked the same
// way (an independent timer) but doesn't compete for tint priority since it
// doesn't change how the entity moves or looks mid-fight the way the others do.
//
// Two further abilities are NOT part of this statusOnHit slot — they're
// independent optional fields on a UNIT_CONFIG/ENEMY_CONFIG entry so they
// can coexist with whatever statusOnHit a unit already has, rather than
// competing for one slot:
//   toxicOnHit: { chance, percent }  — Toxic/Poison (bible §A.3.8): adds
//        bonus damage equal to `percent` of the DEFENDER's own max HP on
//        top of normal damage, bypassing the Metal/alloy flat-damage cap.
//        Suppressed by Curse like every other special ability.
//   waveOnHit: { radius }            — Wave Attack (bible §A.3.8): after the
//        primary hit resolves, sweeps outward from the ATTACKER's own
//        position (not the primary target's) toward the enemy side,
//        hitting every other living entity within `radius`, inheriting the
//        triggering attack's full damage/knockback/status pipeline. Never
//        affects Bases. A defender with `config.waveImmune: true` takes no
//        wave damage itself AND blocks the sweep from reaching anyone
//        further along — see GameScene's applyWaveAttack.

export const STATUS_TYPES = {
  NONE: 'none',
  SLOW: 'slow',
  STOP: 'stop',
  WEAKEN: 'weaken',
  CURSE: 'curse',
  WARP: 'warp',
};

export const NO_STATUS = { type: STATUS_TYPES.NONE };
