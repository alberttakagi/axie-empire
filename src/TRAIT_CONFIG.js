// Trait/matchup layer: an elemental-style rock-paper-scissors system on top
// of raw stats, plus one unique defensive trait that rewards attack speed
// over raw damage. Both UNIT_CONFIG and ENEMY_CONFIG entries carry a
// `trait` field drawn from TRAITS; GameScene's dealDamage()/computeDamage()
// consult this file to resolve every hit.
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
// four non-Alloy traits form a simple 4-cycle (each beats exactly one,
// loses to exactly one); Alloy sits outside the cycle entirely as the
// "true tank" outlier — it hands out no bonuses of its own and is the sole
// beneficiary of the flat-damage rule above.
//
// RESIST_BONUSES: defenderTrait -> { attackerTrait: multiplier (< 1 = takes
// less damage) }. This is a SEPARATE, independent layer from
// MATCHUP_BONUSES — real reference material for this system keeps
// "strong against" and "resistant to" as two distinct dimensions rather
// than one combined bonus table, and this mirrors that. Applied to the two
// pairs MATCHUP_BONUSES's 4-cycle skips over (feral/blight and
// verdant/aerial) — and applied MUTUALLY within each pair, so e.g. feral
// resists blight AND blight resists feral. Combined with the 4-cycle, every
// non-Alloy trait now has exactly one thing it's strong against, one thing
// that's strong against it, and one thing it mutually resists — no
// leftover neutral matchups among the four. Alloy is deliberately absent
// here too, for the same reason as above — its flat-damage rule always
// overrides, so a resist entry for it could never fire.

export const TRAITS = ['feral', 'alloy', 'aerial', 'blight', 'verdant'];

export const FLAT_DAMAGE_TRAIT = 'alloy';
export const FLAT_DAMAGE_AMOUNT = 2;

export const MATCHUP_BONUSES = {
  feral: { verdant: 2.0 }, // beast tramples plant
  verdant: { blight: 2.0 }, // plant purges toxin
  blight: { aerial: 2.0 }, // toxin fouls wings/lungs
  aerial: { feral: 2.0 }, // flight evades/strikes grounded beasts
};

export const RESIST_BONUSES = {
  feral: { blight: 0.5 }, // thick hide shrugs off toxin
  blight: { feral: 0.5 }, // a toxic body shrugs off brute force
  verdant: { aerial: 0.5 }, // deep roots/ground cover reduce bombardment
  aerial: { verdant: 0.5 }, // flight stays clear of ground-level growth
};
