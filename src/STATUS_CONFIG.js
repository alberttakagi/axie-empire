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
//        and the player's base can't trigger its special burst.
//
// `chance` is rolled independently on every hit that lands (see GameScene's
// applyStatusEffect) — it can stack/refresh its own duration on repeat
// procs. Slow/Stop/Curse still share one visual-priority tint (stop beats
// curse beats slow) since only one can visibly "look like" the entity's
// state at a glance; Weaken is tracked the same way (an independent timer)
// but doesn't compete for tint priority since it doesn't change how the
// entity moves or looks mid-fight the way the other three do.

export const STATUS_TYPES = {
  NONE: 'none',
  SLOW: 'slow',
  STOP: 'stop',
  WEAKEN: 'weaken',
  CURSE: 'curse',
};

export const NO_STATUS = { type: STATUS_TYPES.NONE };
