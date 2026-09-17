// Real Battle Cats attribute/ability system (guide Chapter 06 "f-trait" table
// + Chapter 07), replacing this codebase's earlier invented beast/bug/bird/
// plant/mech 4-cycle. In the real game, ATTRIBUTES belong to ENEMIES only
// (White/Red/Black/Floating/Metal/Angel/Alien/Zombie/... — Chapter 07's
// table); player units never carry a combat-relevant attribute of their own.
// Instead, a unit carries ABILITIES that target specific enemy attributes
// (Strong Against/Massive Damage/Resistant/Critical — same chapter's table).
// This file intentionally does NOT reintroduce a symmetric "every trait beats
// one, loses to one" cycle — real Battle Cats has no such thing; a unit with
// no ability at all just deals/takes plain damage against every attribute.
//
// ENEMY_CONFIG.js's `attribute` field (a single string, or null/omitted for
// a plain "White"/no-attribute enemy) is one of ENEMY_ATTRIBUTES below.
// UNIT_CONFIG.js entries carry zero or more of:
//   strongVs      attribute this unit is "Strong Against" (めっぽう強い) —
//                 the ONE real-BC ability that affects BOTH directions:
//                 ×STRONG_DEALT_MULTIPLIER dealt to that attribute, AND
//                 ×STRONG_TAKEN_MULTIPLIER taken FROM that attribute.
//   massiveVs     "Massive Damage" (超ダメージ) — ×MASSIVE_DEALT_MULTIPLIER
//                 dealt only, no resistance half.
//   resistantVs   "Resistant" (打たれ強い) — ×RESISTANT_TAKEN_MULTIPLIER
//                 taken only, no damage-dealt half.
// See GameScene.computeDamage for how these resolve, and critChance for
// Critical Hit (クリティカル): ×2 dealt AND the one thing that ignores
// METAL_ATTRIBUTE's flat-damage rule below, regardless of any other ability.
//
// Real multipliers (guide Chapter 06 f-trait table, base values — the
// guide's own "お宝・本能で強化時" column is a late-game power-up layer this
// build has no equivalent of yet, so this file uses only the base column):
export const STRONG_DEALT_MULTIPLIER = 1.5;
export const STRONG_TAKEN_MULTIPLIER = 0.5;
export const MASSIVE_DEALT_MULTIPLIER = 3;
export const RESISTANT_TAKEN_MULTIPLIER = 0.25;
export const CRITICAL_DEALT_MULTIPLIER = 2;

// Metal (メタル, bible/guide Chapter 06-07): any non-critical hit against a
// Metal-attribute enemy deals only METAL_FLAT_DAMAGE_AMOUNT, no matter the
// attacker's real damage or any Strong/Massive bonus — Critical Hit is the
// one thing that ignores this (see computeDamage). No enemy in this pass's
// Chapter-1 roster actually carries 'metal' yet (Metal isn't one of the
// guide's early-game attributes) — kept here so the rule is ready the
// moment one is added.
export const METAL_ATTRIBUTE = 'metal';
export const METAL_FLAT_DAMAGE_AMOUNT = 1; // guide: "通常ダメージ1" — real value (this build previously used a placeholder 2)

// Every attribute an enemy can carry (guide Chapter 07's early-game subset —
// Angel/Alien/Relic/Aku/etc. are real too but belong to later chapters this
// pass doesn't cover). An enemy with none of these (plain "White") just
// omits ENEMY_CONFIG's `attribute` field entirely.
export const ENEMY_ATTRIBUTES = ['red', 'black', 'floating', METAL_ATTRIBUTE, 'zombie'];

// Colossus/Behemoth Slayer (guide's "超獣/超生命体" super-class tier, bible
// §A.3.8) — unrelated to the attribute system above (a tag layered ON TOP of
// an enemy's normal attribute, per this constant's own original design),
// left untouched from the previous system: still used by
// GameScene.getSuperClassMultiplier and UNIT_CONFIG's colossusSlayer/
// behemothSlayer flags. Dormant again this pass (colossus/behemoth aren't in
// the rebuilt Chapter-1 roster), kept for whenever that later content returns.
export const SUPER_CLASS_SLAYER_BONUSES = {
  colossus: { dealt: 1.6, taken: 0.6 },
  behemoth: { dealt: 2.5, taken: 0.6 },
};
