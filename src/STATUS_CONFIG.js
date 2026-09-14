// On-hit status-effect system. Real reference: BCU-java-PC's combat engine
// (Entity.java/EUnit.java) has status effects beyond knockback — flagged
// during the earlier trait/knockback research but not implemented at the
// time. This fills that gap.
//
// Unlike knockback (a passive stat every unit/enemy has), a status effect is
// an opt-in *chance* to inflict on hit, via a `statusOnHit` field on a
// UNIT_CONFIG/ENEMY_CONFIG entry:
//   { type: STATUS_TYPES.NONE }                                   — default.
//   { type: STATUS_TYPES.SLOW,  chance, durationMs, multiplier }  — halves
//        (or `multiplier`s) the target's effective moveSpeed AND attackSpeed
//        for durationMs.
//   { type: STATUS_TYPES.STOP,  chance, durationMs }              — target
//        can't move, attack, or seek a target at all for durationMs (like
//        knockback's AI-skip, but no shove — a true freeze).
//   { type: STATUS_TYPES.CURSE, chance, durationMs }              — target's
//        special ability is suppressed for durationMs: a `special.type:
//        'aoe'` unit/enemy falls back to hitting only its primary target,
//        and the player's base can't trigger its special burst.
//
// `chance` is rolled independently on every hit that lands (see GameScene's
// applyStatusEffect) — it can stack/refresh its own duration on repeat
// procs, but the three types don't stack with each other (an entity is
// just tracked via three independent timers: slowMs/stopMs/curseMs).

export const STATUS_TYPES = {
  NONE: 'none',
  SLOW: 'slow',
  STOP: 'stop',
  CURSE: 'curse',
};

export const NO_STATUS = { type: STATUS_TYPES.NONE };
