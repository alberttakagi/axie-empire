import { NO_STATUS, STATUS_TYPES } from './STATUS_CONFIG.js';

// Player unit roster. Each unit now carries real Axie Starter art (from Sky
// Mavis's Origins Asset Kit, restricted-license — see tools/sprite-gen/ and
// tools/axie-origins-asset-kit/LICENSE.md) instead of a placeholder circle:
// `sprite.idle/attack/hit/run` point at pre-rendered PNGs under
// public/sprites/units/, one pose per combat state (GameScene swaps between
// them based on whether the entity is mid-attack-windup, mid-knockback, or
// walking with no target — see getDesiredPose). `color`/`label` remain as a
// fallback only for any entity that has no sprite (currently just enemies,
// which still render as colored circles).
//
// Field reference (kept aligned to the bible's Part C Unit schema, §A.3.2):
//   id/displayName  reskin hooks — id is the stable lookup key, displayName is
//                   the role name shown on the in-battle spawn button
//                   (where a player picks by ROLE, not by character).
//   characterName   the real Starter Axie this unit reskins (e.g. "Buba")
//                   — shown ahead of displayName wherever a screen is about
//                   browsing/inspecting a specific character rather than
//                   picking a role mid-battle (Character Formation, Unit
//                   Guide) — see LoadoutScene.js/CatalogScene.js.
//   role            shared taxonomy with ENEMY_CONFIG.js (basic/fast/tank/ranged/aoe).
//   trait           one of TRAIT_CONFIG.js's TRAITS — drives matchup bonuses
//                    and the flat-damage-vs-mech rule; see that file.
//   cost            yen spent to spawn one (see MONEY_CONFIG.js) — set to
//                   the literal real Battle Cats price for that unit's
//                   reference archetype, not a ratio-derived figure.
//   hp              max health.
//   damage          damage dealt per hit; combined with attackSpeed this is
//                   the unit's DPS (damage * attackSpeed) — see foreswingMs/
//                   backswingMs below for how that cycle is actually paced.
//   attackSpeed     attacks per second — kept as the balance/DPS reference
//                   number; foreswingMs/backswingMs are derived from it (see
//                   note below) rather than the runtime reading this field
//                   directly.
//   foreswingMs     wind-up time before a hit lands (bible §A.3.4) — an
//                   attack in progress here is wasted (no damage dealt) if
//                   interrupted by a knockback.
//   backswingMs     recovery time after a hit lands, before the next
//                   foreswing can begin.
//                   foreswingMs + backswingMs together are this build's
//                   stand-in for the bible's fuller
//                   foreswing/backswing/attack_cooldown three-term model —
//                   simplified to two phases at a fixed 35/65 split of the
//                   original attackSpeed-derived interval for this pass.
//                   Re-author per-unit once real reference frame data is
//                   pulled in (see the bible's Part E tooling list).
//   moveSpeed       walk speed in px/sec while no target is in range.
//   radius          placeholder shape size (also its own melee reach — see `range`).
//   range           max distance (px, center-to-center) at which it can attack.
//                   For melee roles this equals `radius`, which reproduces the
//                   current contact-only combat exactly. Ranged/AoE roles get
//                   a larger number so they can strike before physical contact.
//   rechargeMs      cooldown after deploying one copy before this unit can be
//                   deployed again (bible §A.3.2/§A.3.7) — global floor is
//                   2000ms; never reduced by the unit's own level (there is
//                   no leveling yet at all — see the bible's §A.4).
//   special         { type: 'none' } or an ability descriptor, e.g.
//                   { type: 'aoe', radius } to splash all enemies within that
//                   radius of the primary target instead of hitting one.
//   critChance      0-1 chance per landed hit to deal double damage AND
//                   bypass the flat-damage-vs-mech rule entirely (bible
//                   §A.3.6 — Critical Hit is the one thing that ignores
//                   Metal/mech's damage cap). 0 = never crits.
//   knockbackCount  how many times cumulative damage can stagger this entity
//                   (bible §A.3.5's "endurance" model: endurance = hp /
//                   knockbackCount) before it's simply destroyed by normal HP
//                   loss instead of being shoved again. This is NOT a
//                   per-hit chance — it's a running HP-threshold tally, see
//                   GameScene's resolveKnockback.
//   knockbackDistance px this entity slides (away from its attacker) over the
//                   knockback duration each time an HP threshold triggers a
//                   stagger — a real, timed position shift (see GameScene's
//                   tickKnockback), not just a visual flourish: it also
//                   cancels the entity's in-progress attack windup (bible's
//                   interruption rule). Lower = shorter shove.
//   knockbackType   'normal' (staggers per knockbackCount/knockbackDistance)
//                   or 'immune' (never moves at all when hit, regardless of
//                   the other two fields' values).
//   statusOnHit     see STATUS_CONFIG.js — an on-hit chance to inflict Slow/
//                   Stop/Weaken/Curse/Warp on whatever this unit hits.
//                   NO_STATUS (the default) means it never does. Mirrors
//                   ENEMY_CONFIG.js's role-to-ability mapping: tank/Stop,
//                   ranged/Slow, fast+aoe/Curse, basic stays ability-less
//                   (ENEMY ranged trades its Slow for Warp instead — see
//                   ENEMY_CONFIG.js — since Warp is conventionally an
//                   enemy-only affliction in the reference game).
//   longDistance    { min, max } (bible §A.3.8) — this unit's attack has an
//                   explicit blind spot (can't hit anything closer than
//                   `min`) but reaches out to `max`, which also becomes its
//                   effective stopping/detection distance in place of
//                   `range` (see GameScene's getMaxRange). Omitted = normal
//                   fixed-range behavior. Omni Strike is just this with
//                   `min: 0` (no blind spot), conventionally paired with an
//                   Area special.
//   toxicOnHit      { chance, percent } (bible §A.3.8, Toxic/Poison) —
//                   independent of statusOnHit, so it can stack with
//                   whatever status ability this unit already has: on a
//                   successful roll, adds bonus damage equal to `percent`
//                   of the DEFENDER's own max HP, bypassing the
//                   Metal/mech flat-damage cap. Suppressed by Curse.
//   waveOnHit       { radius } (bible §A.3.8, Wave Attack) — also
//                   independent of statusOnHit/special: after the primary
//                   hit resolves, sweeps outward from THIS unit's own
//                   position (not the target's) toward the enemy side,
//                   hitting every other living entity within `radius` with
//                   the same damage/knockback/status pipeline. Never
//                   affects Bases; suppressed by Curse; blocked (and
//                   itself deals no damage) by a `waveImmune` defender,
//                   which also stops the sweep from reaching anyone past it.
//   waveImmune      true = this entity takes no Wave Attack damage and
//                   blocks a wave from reaching anything positioned beyond
//                   it (bible's "Wave Shield").
//   warpImmune      true = Warp status (see statusOnHit above) always
//                   fails against this entity outright.
//   barrierMaxHp    this entity has a Barrier shield (bible §A.3.8):
//                   incoming damage is absorbed by this pool first (fully
//                   blocking knockback/status effects on any hit that's
//                   completely absorbed) before any overflow reaches real
//                   HP. Omitted/0 = no barrier.
//   barrierBreakerChance 0-1 chance per landed hit that this unit's attack
//                   instantly destroys the target's Barrier outright
//                   (bible's "Barrier Breaker") — the SAME hit's full
//                   damage then still applies to real HP normally, rather
//                   than being absorbed.
//   color/label     placeholder shape fill + single-letter text label — only
//                   used as a fallback when `sprite` is null (no unit here
//                   still lacks a sprite, but enemies currently do).
//   sprite          { idle, attack, hit, run } public-relative PNG paths, or
//                   null to fall back to the color/label circle. `run` is
//                   the pose GameScene shows while a unit is walking with no
//                   target (see getDesiredPose) — every unit has one (see
//                   tools/sprite-gen/'s "action/run" Starter animation).
//                   See GameScene's preload()/spawn rendering for how these
//                   are swapped.
//                   An optional nested `evolved: { idle, attack, hit, run }`
//                   holds that unit's REAL, official Sky Mavis "awakened"
//                   (bodyStage 1) art — a second complete Spine skeleton
//                   the Origins Asset Kit ships per Starter, one specific
//                   part visibly grown/enriched versus the base form (see
//                   PartEvolution.js for why only ONE such real evolved
//                   look exists per unit, not a chosen sequence of 6).
//                   GameScene swaps to this whole set once the unit's
//                   first part-evolution milestone (level 10) is reached;
//                   omitted for any unit with no real evolved variant
//                   (currently just Titan/Temujin) — that unit stays on
//                   its base art at every level, using the escalating
//                   glow alone to show further part-evolution progress.

export const UNIT_CONFIG = {
  basic: {
    id: 'basic',
    displayName: 'Basic Melee',
    characterName: "Tripp", // the real Starter Axie this unit reskins
    role: 'basic',
    trait: 'beast',
    cost: 50, // literal real price of this archetype's basic-attacker reference
    hp: 14,
    damage: 3,
    attackSpeed: 1.2, // dps 3.6 — interval ~833ms, split 35/65 below
    foreswingMs: 290,
    backswingMs: 540,
    moveSpeed: 55,
    radius: 14,
    range: 14,
    rechargeMs: 3000,
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0x33cc33,
    label: 'B',
    special: { type: 'none' },
    critChance: 0.05,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/units/unit_basic_idle.png", attack: "/sprites/units/unit_basic_attack.png", hit: "/sprites/units/unit_basic_hit.png", run: "/sprites/units/unit_basic_run.png", evolved: { idle: "/sprites/units/unit_basic_evolved_idle.png", attack: "/sprites/units/unit_basic_evolved_attack.png", hit: "/sprites/units/unit_basic_evolved_hit.png", run: "/sprites/units/unit_basic_evolved_run.png" } },
  },
  fast: {
    id: 'fast',
    displayName: 'Fast Melee',
    characterName: "Buba", // the real Starter Axie this unit reskins
    role: 'fast',
    trait: 'bird',
    // Rebalanced against real reference ratios (fastest-mover archetype vs.
    // basic attacker): hp 5x basic, dps ~6x basic, speed 3x basic. The real
    // reference unit for "fastest mover" turned out to be a premium unit
    // (priciest/tankiest of its tier), not a cheap glass cannon — flagged
    // and confirmed: this turns "fast" into a premium heavy-rusher rather
    // than an early cheap skirmisher. cost is that unit's literal real price.
    cost: 500,
    hp: 70,
    damage: 4.88,
    attackSpeed: 4.44, // dps ~21.65 — interval ~225ms, split 35/65 below
    foreswingMs: 80,
    backswingMs: 145,
    moveSpeed: 165,
    radius: 12,
    range: 12,
    rechargeMs: 6000,
    knockbackCount: 2,
    knockbackDistance: 18,
    knockbackType: 'normal',
    color: 0x33ffcc,
    label: 'F',
    special: { type: 'none' },
    critChance: 0.07,
    // Status-effect rollout, mirroring ENEMY_CONFIG's fast entry: a quick
    // harasser that curses on hit — shorter duration than aoe's curse.
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.2, durationMs: 1500 },
    // Wave Attack (bible §A.3.8): every hit also sweeps a shockwave ahead of
    // this unit, catching whatever else is nearby — fits its "quick skirmisher"
    // identity as a way to punish enemies clustering up behind its target.
    waveOnHit: { radius: 60 },
    sprite: { idle: "/sprites/units/unit_fast_idle.png", attack: "/sprites/units/unit_fast_attack.png", hit: "/sprites/units/unit_fast_hit.png", run: "/sprites/units/unit_fast_run.png", evolved: { idle: "/sprites/units/unit_fast_evolved_idle.png", attack: "/sprites/units/unit_fast_evolved_attack.png", hit: "/sprites/units/unit_fast_evolved_hit.png", run: "/sprites/units/unit_fast_evolved_run.png" } },
  },
  tank: {
    id: 'tank',
    displayName: 'Tank',
    characterName: "Olek", // the real Starter Axie this unit reskins
    role: 'tank',
    trait: 'mech',
    // Rebalanced against real reference ratios (wall unit vs. basic attacker):
    // hp 4x basic, dps ~0.14x basic, speed ~0.8x basic. cost is that unit's
    // literal real price (happens to land at 2x basic).
    cost: 100,
    hp: 56,
    damage: 0.8,
    attackSpeed: 0.6, // dps 0.48 — interval ~1667ms, split 35/65 below
    foreswingMs: 585,
    backswingMs: 1085,
    moveSpeed: 44,
    radius: 26,
    range: 26,
    rechargeMs: 5000,
    knockbackCount: 1,
    knockbackDistance: 4,
    knockbackType: 'immune', // a true wall doesn't budge, regardless of the other knockback fields
    color: 0x6699ff,
    label: 'T',
    special: { type: 'none' },
    critChance: 0,
    // Status-effect rollout, mirroring ENEMY_CONFIG's tank entry: an
    // immovable bruiser that can also freeze whatever it hits.
    statusOnHit: { type: STATUS_TYPES.STOP, chance: 0.15, durationMs: 800 },
    // An anchored heavy unit is a natural fit for "can't be teleported" —
    // pairs with its existing knockback immunity as "nothing moves this thing."
    warpImmune: true,
    // Barrier Breaker (bible §A.3.8): every hit that lands on a Barrier-bearing
    // target shatters it outright, then still deals full damage that hit —
    // fits "heavy hitter that shrugs off shields" even at Tank's low DPS.
    barrierBreakerChance: 1.0,
    sprite: { idle: "/sprites/units/unit_tank_idle.png", attack: "/sprites/units/unit_tank_attack.png", hit: "/sprites/units/unit_tank_hit.png", run: "/sprites/units/unit_tank_run.png", evolved: { idle: "/sprites/units/unit_tank_evolved_idle.png", attack: "/sprites/units/unit_tank_evolved_attack.png", hit: "/sprites/units/unit_tank_evolved_hit.png", run: "/sprites/units/unit_tank_evolved_run.png" } },
  },
  ranged: {
    id: 'ranged',
    displayName: 'Ranged',
    characterName: "Puffy", // the real Starter Axie this unit reskins
    role: 'ranged',
    trait: 'bug',
    // Rebalanced against real reference ratios (ranged attacker vs. basic
    // attacker): hp 4x basic (this archetype isn't a glass cannon in HP —
    // its edge is one huge hit on a slow cadence), dps ~3.64x basic, speed
    // same as basic. cost is that unit's literal real price (8x basic).
    // Range is NOT scaled by the real 2.5x ratio — our "range" is a pixel
    // distance relative to tiny melee hitboxes (14-26px), not a real
    // distance unit, so that ratio would actually shrink this unit's reach;
    // kept at its existing value instead.
    cost: 400,
    hp: 56,
    damage: 33,
    attackSpeed: 0.4, // dps 13.2 — interval 2500ms, split 35/65 below
    foreswingMs: 875,
    backswingMs: 1625,
    moveSpeed: 55,
    radius: 13,
    range: 90,
    rechargeMs: 5500,
    knockbackCount: 2,
    knockbackDistance: 14,
    knockbackType: 'normal',
    color: 0xffcc33,
    label: 'R',
    special: { type: 'none' },
    critChance: 0.05,
    // Status-effect rollout, mirroring ENEMY_CONFIG's ranged entry: a
    // debuffing sniper that halves the target's move/attack speed on hit.
    statusOnHit: { type: STATUS_TYPES.SLOW, chance: 0.3, durationMs: 1500, multiplier: 0.5 },
    // Long Distance (bible §A.3.8): can't hit anything within 40px of
    // itself, but reaches out to 140px — fits the "sniper" archetype of
    // being useless up close but dangerous from afar.
    longDistance: { min: 40, max: 140 },
    sprite: { idle: "/sprites/units/unit_ranged_idle.png", attack: "/sprites/units/unit_ranged_attack.png", hit: "/sprites/units/unit_ranged_hit.png", run: "/sprites/units/unit_ranged_run.png", evolved: { idle: "/sprites/units/unit_ranged_evolved_idle.png", attack: "/sprites/units/unit_ranged_evolved_attack.png", hit: "/sprites/units/unit_ranged_evolved_hit.png", run: "/sprites/units/unit_ranged_evolved_run.png" } },
  },
  aoe: {
    id: 'aoe',
    displayName: 'Special (AoE)',
    characterName: "Noir", // the real Starter Axie this unit reskins
    role: 'aoe',
    trait: 'plant',
    // Rebalanced against real reference ratios (splash/area attacker vs.
    // basic attacker): hp 3x basic, dps ~16.2x basic, speed same as basic.
    // No basic-tier real unit has a true area attack — pulled this from the
    // wider roster instead, and even THAT unit's literal real price (used
    // as cost below) sits well above this tier (splash is a premium
    // mechanic in the real data, not a starter one). Its per-hit damage is
    // huge because it's meant to be split across every enemy caught in the
    // splash, same as our `special.aoe` already does.
    cost: 650,
    hp: 42,
    damage: 52.5,
    attackSpeed: 1.11, // dps ~58.3 — interval ~901ms, split 35/65 below
    foreswingMs: 315,
    backswingMs: 586,
    moveSpeed: 55,
    radius: 16,
    range: 16,
    rechargeMs: 7000,
    knockbackCount: 2,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xcc66ff,
    label: 'A',
    special: { type: 'aoe', radius: 55 },
    critChance: 0.03,
    // Status-effect rollout, mirroring ENEMY_CONFIG's aoe entry: curses
    // whatever it hits — including landing on an enemy aoe and shutting
    // down its own splash right back.
    statusOnHit: { type: STATUS_TYPES.CURSE, chance: 0.25, durationMs: 3000 },
    // Toxic/Poison (bible §A.3.8): a corrosive splash also chips bonus
    // damage off whatever it hits, scaled to that target's own max HP.
    toxicOnHit: { chance: 0.3, percent: 0.1 },
    sprite: { idle: "/sprites/units/unit_aoe_idle.png", attack: "/sprites/units/unit_aoe_attack.png", hit: "/sprites/units/unit_aoe_hit.png", run: "/sprites/units/unit_aoe_run.png", evolved: { idle: "/sprites/units/unit_aoe_evolved_idle.png", attack: "/sprites/units/unit_aoe_evolved_attack.png", hit: "/sprites/units/unit_aoe_evolved_hit.png", run: "/sprites/units/unit_aoe_evolved_run.png" } },
  },

  // --- Roster expansion (bible §A.4.1 — "more Normal-tier units" per the
  // reference game's own free/no-gacha basic roster). These five are
  // original designs rather than the "matches a real reference unit's
  // ratio" derivations above — there's no single real-game unit each one
  // is patterned after, so their numbers are reasoned/placeholder like the
  // bible's own "tune to your own economy" framing recommends, not
  // cross-referenced against real data. Each fills a mechanical niche none
  // of the original five covers, and pairs up with one of them under the
  // same trait (2 units per trait, 10 units / 5 traits) for a clean roster.

  swarm: {
    id: 'swarm',
    displayName: 'Swarm',
    characterName: "Shillin", // the real Starter Axie this unit reskins
    role: 'swarm',
    trait: 'beast', // pairs with `basic`
    // Identity: the cheapest, fastest-recharging unit in the roster — meant
    // to be spammed in numbers rather than relied on individually. Its one
    // ability (Dodge, bible §A.3.8) fits that same "hard to pin down"
    // fantasy rather than adding raw power — a small, nimble body that
    // occasionally just isn't where the hit landed.
    cost: 30,
    hp: 8,
    damage: 2,
    attackSpeed: 1.5, // dps 3 — interval ~667ms, split 35/65 below
    foreswingMs: 233,
    backswingMs: 434,
    moveSpeed: 60,
    radius: 10,
    range: 10,
    rechargeMs: 1500,
    knockbackCount: 2,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0x99cc33,
    label: 'Sw',
    special: { type: 'none' },
    critChance: 0.03,
    statusOnHit: NO_STATUS,
    // Dodge (bible §A.3.8): a modest chance to take zero damage entirely
    // (and ignore whatever status effect came with that hit), with a brief
    // window afterward where further hits also auto-negate without a fresh
    // roll.
    dodgeChance: 0.12,
    dodgeWindowMs: 400,
    sprite: { idle: "/sprites/units/unit_swarm_idle.png", attack: "/sprites/units/unit_swarm_attack.png", hit: "/sprites/units/unit_swarm_hit.png", run: "/sprites/units/unit_swarm_run.png", evolved: { idle: "/sprites/units/unit_swarm_evolved_idle.png", attack: "/sprites/units/unit_swarm_evolved_attack.png", hit: "/sprites/units/unit_swarm_evolved_hit.png", run: "/sprites/units/unit_swarm_evolved_run.png" } },
  },
  sniper: {
    id: 'sniper',
    displayName: 'Sniper',
    characterName: "Momo", // the real Starter Axie this unit reskins
    role: 'sniper',
    trait: 'bird', // pairs with `fast`
    // Identity: the roster's glass cannon — huge single-hit damage, high
    // crit chance, but low HP, slow recharge, and (via Long Distance) a
    // genuine blind spot up close, on top of the longest reach in the game.
    cost: 700,
    hp: 30,
    damage: 80,
    attackSpeed: 0.25, // dps 20 — interval 4000ms, split 35/65 below
    foreswingMs: 1400,
    backswingMs: 2600,
    moveSpeed: 50,
    radius: 12,
    range: 160,
    rechargeMs: 8000,
    knockbackCount: 1,
    knockbackDistance: 16,
    knockbackType: 'normal',
    color: 0x3399ff,
    label: 'Sn',
    special: { type: 'none' },
    critChance: 0.15,
    statusOnHit: NO_STATUS,
    // Long Distance (bible §A.3.8): can't hit anything within 80px, but
    // reaches all the way out to 220px — the longest window in the roster.
    longDistance: { min: 80, max: 220 },
    // Zombie Killer (bible §A.3.8): a precise finishing shot that denies a
    // Zombie-trait enemy its revive when this unit lands the killing blow
    // — see ENEMY_CONFIG.js's `zombie` entry and GameScene.handleEnemyDeath.
    zombieKiller: true,
    sprite: { idle: "/sprites/units/unit_sniper_idle.png", attack: "/sprites/units/unit_sniper_attack.png", hit: "/sprites/units/unit_sniper_hit.png", run: "/sprites/units/unit_sniper_run.png", evolved: { idle: "/sprites/units/unit_sniper_evolved_idle.png", attack: "/sprites/units/unit_sniper_evolved_attack.png", hit: "/sprites/units/unit_sniper_evolved_hit.png", run: "/sprites/units/unit_sniper_evolved_run.png" } },
  },
  guardian: {
    id: 'guardian',
    displayName: 'Guardian',
    characterName: "Xia", // the real Starter Axie this unit reskins
    role: 'guardian',
    trait: 'mech', // pairs with `tank`
    // Identity: the roster's other mech-trait defender — not knockback-
    // immune like `tank`, but far tankier in raw HP, hits harder, and
    // carries its own Barrier shield (bible §A.3.8) on top, at the cost of
    // being slower and much more expensive to field.
    cost: 250,
    hp: 120,
    damage: 3,
    attackSpeed: 0.8, // dps 2.4 — interval 1250ms, split 35/65 below
    foreswingMs: 438,
    backswingMs: 812,
    moveSpeed: 30,
    radius: 22,
    range: 22,
    rechargeMs: 6000,
    knockbackCount: 1,
    knockbackDistance: 3,
    knockbackType: 'normal',
    color: 0x6666cc,
    label: 'Gd',
    special: { type: 'none' },
    critChance: 0,
    // A shield-basher: weakens whatever it hits rather than freezing it
    // (differentiating it from `tank`'s Stop).
    statusOnHit: { type: STATUS_TYPES.WEAKEN, chance: 0.2, durationMs: 1000, multiplier: 0.6 },
    // Barrier (bible §A.3.8): its own shell that must be cracked (or
    // Barrier-Broken) before real damage gets through, layered on top of
    // its already-high HP.
    barrierMaxHp: 20,
    // Colossus Slayer (bible §A.3.8): 1.6x damage dealt / 0.6x damage taken
    // specifically against enemies carrying the Colossus superClass tag —
    // see TRAIT_CONFIG.js's SUPER_CLASS_SLAYER_BONUSES.
    colossusSlayer: true,
    sprite: { idle: "/sprites/units/unit_guardian_idle.png", attack: "/sprites/units/unit_guardian_attack.png", hit: "/sprites/units/unit_guardian_hit.png", run: "/sprites/units/unit_guardian_run.png", evolved: { idle: "/sprites/units/unit_guardian_evolved_idle.png", attack: "/sprites/units/unit_guardian_evolved_attack.png", hit: "/sprites/units/unit_guardian_evolved_hit.png", run: "/sprites/units/unit_guardian_evolved_run.png" } },
  },
  support: {
    id: 'support',
    displayName: 'Support',
    characterName: "Mit", // the real Starter Axie this unit reskins
    role: 'support',
    trait: 'bug', // pairs with `ranged`
    // Identity: low direct damage, but a strong, reliable Weaken plus a
    // Toxic tick on the side — a utility/debuff specialist rather than a
    // damage dealer, fitting bug/toxin theming.
    cost: 350,
    hp: 40,
    damage: 8,
    attackSpeed: 1.0, // dps 8 — interval 1000ms, split 35/65 below
    foreswingMs: 350,
    backswingMs: 650,
    moveSpeed: 55,
    radius: 14,
    range: 70,
    rechargeMs: 5000,
    knockbackCount: 2,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0x99cc99,
    label: 'Su',
    special: { type: 'none' },
    critChance: 0.05,
    statusOnHit: { type: STATUS_TYPES.WEAKEN, chance: 0.4, durationMs: 2000, multiplier: 0.5 },
    toxicOnHit: { chance: 0.3, percent: 0.08 },
    sprite: { idle: "/sprites/units/unit_support_idle.png", attack: "/sprites/units/unit_support_attack.png", hit: "/sprites/units/unit_support_hit.png", run: "/sprites/units/unit_support_run.png", evolved: { idle: "/sprites/units/unit_support_evolved_idle.png", attack: "/sprites/units/unit_support_evolved_attack.png", hit: "/sprites/units/unit_support_evolved_hit.png", run: "/sprites/units/unit_support_evolved_run.png" } },
  },
  titan: {
    id: 'titan',
    displayName: 'Titan',
    characterName: "Temujin", // the real Starter Axie this unit reskins
    role: 'titan',
    trait: 'plant', // pairs with `aoe`
    // Identity: the roster's top-end powerhouse — the single most
    // expensive and slowest-recharging unit, but hits an entire area for
    // huge damage. The "if you can afford it, it changes the fight" unit.
    // Surge Attack (bible §A.3.8) layers a second, independent ground-slam
    // on top of its primary aoe hit — a colossus that keeps hurting things
    // around itself for a moment after it swings.
    cost: 1500,
    hp: 200,
    damage: 60,
    attackSpeed: 0.5, // dps 30 — interval 2000ms, split 35/65 below
    foreswingMs: 700,
    backswingMs: 1300,
    moveSpeed: 25,
    radius: 30,
    range: 30,
    rechargeMs: 12000,
    knockbackCount: 1,
    knockbackDistance: 5,
    knockbackType: 'normal',
    color: 0x338833,
    label: 'Ti',
    special: { type: 'aoe', radius: 60 },
    critChance: 0.05,
    statusOnHit: NO_STATUS,
    // Surge Attack (bible §A.3.8): a delayed second shockwave from the
    // Titan's own position, dealing the same damage as whatever hit
    // triggered it.
    surgeOnHit: { chance: 0.25, delayMs: 600, radius: 70 },
    // Behemoth Slayer (bible §A.3.8): 2.5x damage dealt / 0.6x damage taken
    // specifically against enemies carrying the Behemoth superClass tag —
    // the roster's biggest unit countering the roster's biggest enemy
    // class. See TRAIT_CONFIG.js's SUPER_CLASS_SLAYER_BONUSES.
    behemothSlayer: true,
    sprite: { idle: "/sprites/units/unit_titan_idle.png", attack: "/sprites/units/unit_titan_attack.png", hit: "/sprites/units/unit_titan_hit.png", run: "/sprites/units/unit_titan_run.png" },
  },
};
