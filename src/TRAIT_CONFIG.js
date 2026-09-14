// Trait/matchup layer: an elemental-style rock-paper-scissors system on top
// of raw stats, plus one unique defensive trait that rewards attack speed
// over raw damage. Both UNIT_CONFIG and ENEMY_CONFIG entries carry a
// `trait` field drawn from TRAITS; GameScene's dealDamage()/computeDamage()
// consult this file to resolve every hit.
//
// Trait names map directly onto Axie Infinity's real class system (bible
// Part D's rename table) — beast/bug/bird/plant are 4 of its 6 base
// classes, and mech is one of its 3 rarer "hidden" classes, a natural fit
// for this system's "true tank, flat-damage-immune" outlier since Axie's
// actual Mech class is themed around armor plating.
//
// FLAT_DAMAGE_TRAIT: any hit landing on a defender with this trait deals a
// flat FLAT_DAMAGE_AMOUNT instead of the attacker's damage stat — no matter
// who's attacking, and regardless of any matchup bonus that would otherwise
// apply. This always takes precedence over MATCHUP_BONUSES, which is why
// FLAT_DAMAGE_TRAIT is deliberately absent from every entry in that table:
// a bonus targeting it could never actually fire, so listing one would be
// dead, misleading data.
//
// MATCHUP_BONUSES: attackerTrait -> { defenderTrait: multiplier }. Only the
// listed pairs get a bonus; every other pairing is a normal 1x hit. The
// four non-Mech traits form a simple 4-cycle (each beats exactly one,
// loses to exactly one); Mech sits outside the cycle entirely as the
// "true tank" outlier — it hands out no bonuses of its own and is the sole
// beneficiary of the flat-damage rule above.
//
// RESIST_BONUSES: defenderTrait -> { attackerTrait: multiplier (< 1 = takes
// less damage) }. This is a SEPARATE, independent layer from
// MATCHUP_BONUSES — real reference material for this system keeps
// "strong against" and "resistant to" as two distinct dimensions rather
// than one combined bonus table, and this mirrors that. Applied to the two
// pairs MATCHUP_BONUSES's 4-cycle skips over (beast/bug and plant/bird) —
// and applied MUTUALLY within each pair, so e.g. beast resists bug AND bug
// resists beast. Combined with the 4-cycle, every non-Mech trait now has
// exactly one thing it's strong against, one thing that's strong against
// it, and one thing it mutually resists — no leftover neutral matchups
// among the four. Mech is deliberately absent here too, for the same
// reason as above — its flat-damage rule always overrides, so a resist
// entry for it could never fire.
//
// Wider enemy trait roster (bible §A.3.8's fuller trait catalogue —
// Red/Floating/Black/Metal/Angel/Alien/Zombie/Relic/Aku/White plus the
// Colossus/Behemoth "super-classes"): rather than bolt on more reskinned
// members of the existing 4-cycle (which would just be more of the same
// rock-paper-scissors with no new mechanical texture), this build adds the
// entries that carry a genuinely distinct RULE, matching the bible's own
// "encode as rules, not abilities" framing for these:
//   'zombie'   — a second outlier trait alongside Mech, same "no matchup/
//                resist entries of its own" treatment, but its distinct
//                rule is revival rather than flat damage: see
//                ENEMY_CONFIG.js's reviveCount/reviveHpPercent fields and
//                GameScene's handleEnemyDeath. UNIT_CONFIG's zombieKiller
//                flag (bible's Zombie Killer ability) denies a zombie enemy
//                its revive when IT lands the finishing blow.
// Colossus/Behemoth are deliberately NOT added here at all — the bible is
// explicit that they're a superClass TAG layered on top of a normal
// primary trait, not a replacement for one (a Colossus enemy is still
// also, say, Bird underneath) — see ENEMY_CONFIG.js's `superClass` field
// and UNIT_CONFIG.js's colossusSlayer/behemothSlayer flags instead.

export const TRAITS = ['beast', 'mech', 'bird', 'bug', 'plant', 'zombie'];

export const FLAT_DAMAGE_TRAIT = 'mech';
export const FLAT_DAMAGE_AMOUNT = 2;

// Super-class Slayer bonuses (bible §A.3.8) — layered independently of the
// trait system above: a unit with `colossusSlayer`/`behemothSlayer` (see
// UNIT_CONFIG.js) deals SUPER_CLASS_SLAYER_BONUSES[class].dealt against any
// defender whose ENEMY_CONFIG carries that `superClass` tag, and takes
// .taken damage when on the receiving end of one — independent of, and
// stacking multiplicatively with, whatever the normal trait matchup above
// already resolved (bible: "so both sets of counters... apply
// simultaneously and multiply together").
export const SUPER_CLASS_SLAYER_BONUSES = {
  colossus: { dealt: 1.6, taken: 0.6 },
  behemoth: { dealt: 2.5, taken: 0.6 },
};

export const MATCHUP_BONUSES = {
  beast: { plant: 2.0 }, // beast tramples plant
  plant: { bug: 2.0 }, // plant purges toxin
  bug: { bird: 2.0 }, // toxin fouls wings/lungs
  bird: { beast: 2.0 }, // flight evades/strikes grounded beasts
};

export const RESIST_BONUSES = {
  beast: { bug: 0.5 }, // thick hide shrugs off toxin
  bug: { beast: 0.5 }, // a toxic body shrugs off brute force
  plant: { bird: 0.5 }, // deep roots/ground cover reduce bombardment
  bird: { plant: 0.5 }, // flight stays clear of ground-level growth
};
