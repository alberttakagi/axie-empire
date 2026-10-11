import { NO_STATUS } from './STATUS_CONFIG.js';

// Player unit roster — REBUILT to be the real Battle Cats "Basic" tier (all
// 9 Chapter-1-relevant lineages; the guide's 10th, Superfeline/ネコ超人, only
// unlocks post-Cosmos-chapter-3 and is out of this pass's scope), one
// starter Axie per lineage, each Axie's own 2 real art tiers (base/"bodyStage
// 0" and evolved/"bodyStage 1") standing in for that lineage's 3 real forms:
// Form 1 = base art, no glow. Form 2 = evolved art + a light-blue glow.
// Form 3 = the SAME evolved art, but a purple glow instead (see
// PartEvolution.js) — this is the user's own scheme for stretching a
// limited named-Axie roster across every lineage's full 3-form chain
// without needing a 3rd distinct art asset per unit.
//
// Every stat below is ported from the user's guide (にゃんこ大戦争 完全解剖
// ガイド, Chapter 05/06/11 — battlecats-db-sourced, Lv1/no-treasure/no-
// research base values) using two conversions:
//   TIME   any frame(F) value ×(1000/30) = ms. Battle Cats runs at a fixed
//          30F/sec, so this is exact regardless of anything else — recharge,
//          attack interval, foreswing/backswing all convert this way.
//   MONEY  yen, used as-is — this engine's currency already matches Battle
//          Cats' own denomination directly (see MONEY_CONFIG.js), so cost is
//          the literal real price, hp/damage are the literal real Lv1 values.
// SPATIAL fields (moveSpeed, radius, range, knockbackDistance) are NOT
// converted from the guide's raw pixel/frame numbers — the guide's own
// reference battlefield is several thousand units long, many times this
// engine's ~800px canvas, so porting absolute distances would make every
// unit cross the field in one bound. Instead these keep this engine's own
// already-tuned pixel scale, adjusted only to preserve each lineage's real
// RELATIVE proportions against the others (e.g. Cow Cat's real speed stat is
// exactly 3x Cat's — so its moveSpeed here is exactly 3x Cat's own, same
// ratio, just at this engine's own absolute scale).
//
// `unlockRequirement` (new) — null for the one lineage available from the
// very start (Cat); every other lineage requires a specific stage clear
// (see PROGRESSION_CONFIG... no — see PlayerProgress.js's isUnitUnlocked and
// STAGE_CONFIG.js's saga1, which this pass rebuilds to mirror the guide's
// real Empire of Cats unlock pacing: roughly one new lineage becomes
// deployable per early stage cleared, matching the guide's own
// "第1章◯◯県クリア" per-lineage unlock notes).
//
// `strongVs`/`massiveVs`/`resistantVs` — TRAIT_CONFIG.js's real ability
// model (Strong Against/Massive Damage/Resistant), replacing this file's
// earlier invented beast/bug/bird/plant/mech matchup cycle. Only Axe Cat and
// Fish Cat carry a real ability at all in the guide's Basic-tier data
// (both "対赤：めっぽう強い" — Strong Against Red); every other lineage in
// this tier is a plain attacker with no targeted ability, and this build
// follows that faithfully rather than inventing one.
//
// Field reference for everything NOT covered above — unchanged from the
// previous roster, still aligned to the bible's Part C Unit schema §A.3.2:
//   id              stable lookup key (also STAGE_CONFIG's unlockRequirement
//                   target and PROGRESSION_CONFIG's own matching key).
//   displayName     the real Battle Cats lineage name (e.g. "Tank Cat") —
//                   used wherever a screen needs to name the unit's real BC
//                   identity on its own (unlock messages, docs), but NOT
//                   the in-battle spawn button or Character Formation cards
//                   — see abilityLabel below for what those actually show.
//   characterName   the real Starter Axie this lineage reskins — shown as
//                   the PRIMARY label wherever a screen is about a specific
//                   character (spawn button, Formation card), paired with
//                   abilityLabel in parentheses: "Tripp (Basic Melee)".
//   abilityLabel    a short, functional role tag distinct from both of the
//                   above — what the unit actually DOES at a glance, same
//                   spirit as this roster's pre-rebuild displayName values
//                   (e.g. "Basic Melee", "Long Range"). Real Battle Cats
//                   lineage names read as flavor/identity, not gameplay
//                   function, to a player unfamiliar with the reference
//                   game — this keeps that at-a-glance clarity alongside
//                   the real name instead of losing it.
//   cost            yen to deploy one — the real Chapter 1 BASELINE price
//                   (guide's updated Chapter 14 data: "コストは章によって
//                   変わります。第1章は基準値、第2章は1.5倍です"). Chapter
//                   2/3 pricing isn't a different config value — it's
//                   STAGE_CONFIG.js's own SAGA_COST_MULTIPLIERS (1.0/1.5/2.0)
//                   applied on top of this same base at spawn time, exactly
//                   reproducing the guide's real per-chapter numbers.
//   hp/damage       Lv1, no treasure, no research — see UnitStats.js for how
//                   PROGRESSION_CONFIG.js's real Lv-multiplier formula scales
//                   these up from here.
//   attackSpeed     documentation-only DPS reference (damage/interval) —
//                   the runtime reads foreswingMs/backswingMs directly,
//                   both now the EXACT real fore/back-swing split (fore = the
//                   guide's own frame value; back = freq − fore), not an
//                   invented 35/65 ratio.
//   moveSpeed/radius/range/rechargeMs/special/critChance/knockbackCount/
//   knockbackDistance/knockbackType/statusOnHit/sprite — see the previous
//   revision of this file (git history) for the exhaustive per-field
//   reference; unchanged in shape, just re-tuned per lineage above.
export const UNIT_CONFIG = {
  basic: {
    id: 'basic',
    displayName: 'Cat',
    abilityLabel: 'Basic Melee',
    characterName: 'Tripp', // ネコ／ネコビルダー／ネコモヒカン (Cat / Macho Cat / Mohawk Cat)
    role: 'basic',
    unlockRequirement: null, // available from the very start, matching real Battle Cats' own day-1 roster
    cost: 50,
    hp: 100,
    damage: 8,
    attackSpeed: 24.3, // dps ~1.95 — interval 1233ms (37F), split 267/966 below (real 8F/29F)
    foreswingMs: 267,
    backswingMs: 966,
    moveSpeed: 55, // baseline reference speed for the whole roster (real spd 10)
    radius: 14,
    range: 14,
    rechargeMs: 5333, // real 160F
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0x33cc33,
    label: 'C',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/units/unit_basic_idle.png", attack: "/sprites/units/unit_basic_attack.png", hit: "/sprites/units/unit_basic_hit.png", run: ["/sprites/units/unit_basic_run_0.png", "/sprites/units/unit_basic_run_1.png", "/sprites/units/unit_basic_run_2.png", "/sprites/units/unit_basic_run_3.png", "/sprites/units/unit_basic_run_4.png", "/sprites/units/unit_basic_run_5.png", "/sprites/units/unit_basic_run_6.png", "/sprites/units/unit_basic_run_7.png", "/sprites/units/unit_basic_run_8.png", "/sprites/units/unit_basic_run_9.png", "/sprites/units/unit_basic_run_10.png", "/sprites/units/unit_basic_run_11.png", "/sprites/units/unit_basic_run_12.png", "/sprites/units/unit_basic_run_13.png", "/sprites/units/unit_basic_run_14.png", "/sprites/units/unit_basic_run_15.png", "/sprites/units/unit_basic_run_16.png", "/sprites/units/unit_basic_run_17.png"], idleAnim: ["/sprites/units/unit_basic_idleanim_0.png", "/sprites/units/unit_basic_idleanim_1.png", "/sprites/units/unit_basic_idleanim_2.png", "/sprites/units/unit_basic_idleanim_3.png", "/sprites/units/unit_basic_idleanim_4.png", "/sprites/units/unit_basic_idleanim_5.png", "/sprites/units/unit_basic_idleanim_6.png", "/sprites/units/unit_basic_idleanim_7.png", "/sprites/units/unit_basic_idleanim_8.png", "/sprites/units/unit_basic_idleanim_9.png", "/sprites/units/unit_basic_idleanim_10.png", "/sprites/units/unit_basic_idleanim_11.png", "/sprites/units/unit_basic_idleanim_12.png", "/sprites/units/unit_basic_idleanim_13.png", "/sprites/units/unit_basic_idleanim_14.png", "/sprites/units/unit_basic_idleanim_15.png", "/sprites/units/unit_basic_idleanim_16.png", "/sprites/units/unit_basic_idleanim_17.png", "/sprites/units/unit_basic_idleanim_18.png", "/sprites/units/unit_basic_idleanim_19.png", "/sprites/units/unit_basic_idleanim_20.png", "/sprites/units/unit_basic_idleanim_21.png", "/sprites/units/unit_basic_idleanim_22.png", "/sprites/units/unit_basic_idleanim_23.png", "/sprites/units/unit_basic_idleanim_24.png", "/sprites/units/unit_basic_idleanim_25.png", "/sprites/units/unit_basic_idleanim_26.png", "/sprites/units/unit_basic_idleanim_27.png", "/sprites/units/unit_basic_idleanim_28.png", "/sprites/units/unit_basic_idleanim_29.png", "/sprites/units/unit_basic_idleanim_30.png", "/sprites/units/unit_basic_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_basic_evolved_idle.png", attack: "/sprites/units/unit_basic_evolved_attack.png", hit: "/sprites/units/unit_basic_evolved_hit.png", idleAnim: ["/sprites/units/unit_basic_evolved_idleanim_0.png", "/sprites/units/unit_basic_evolved_idleanim_1.png", "/sprites/units/unit_basic_evolved_idleanim_2.png", "/sprites/units/unit_basic_evolved_idleanim_3.png", "/sprites/units/unit_basic_evolved_idleanim_4.png", "/sprites/units/unit_basic_evolved_idleanim_5.png", "/sprites/units/unit_basic_evolved_idleanim_6.png", "/sprites/units/unit_basic_evolved_idleanim_7.png", "/sprites/units/unit_basic_evolved_idleanim_8.png", "/sprites/units/unit_basic_evolved_idleanim_9.png", "/sprites/units/unit_basic_evolved_idleanim_10.png", "/sprites/units/unit_basic_evolved_idleanim_11.png", "/sprites/units/unit_basic_evolved_idleanim_12.png", "/sprites/units/unit_basic_evolved_idleanim_13.png", "/sprites/units/unit_basic_evolved_idleanim_14.png", "/sprites/units/unit_basic_evolved_idleanim_15.png", "/sprites/units/unit_basic_evolved_idleanim_16.png", "/sprites/units/unit_basic_evolved_idleanim_17.png", "/sprites/units/unit_basic_evolved_idleanim_18.png", "/sprites/units/unit_basic_evolved_idleanim_19.png", "/sprites/units/unit_basic_evolved_idleanim_20.png", "/sprites/units/unit_basic_evolved_idleanim_21.png", "/sprites/units/unit_basic_evolved_idleanim_22.png", "/sprites/units/unit_basic_evolved_idleanim_23.png", "/sprites/units/unit_basic_evolved_idleanim_24.png", "/sprites/units/unit_basic_evolved_idleanim_25.png", "/sprites/units/unit_basic_evolved_idleanim_26.png", "/sprites/units/unit_basic_evolved_idleanim_27.png", "/sprites/units/unit_basic_evolved_idleanim_28.png", "/sprites/units/unit_basic_evolved_idleanim_29.png", "/sprites/units/unit_basic_evolved_idleanim_30.png", "/sprites/units/unit_basic_evolved_idleanim_31.png", "/sprites/units/unit_basic_evolved_idleanim_32.png", "/sprites/units/unit_basic_evolved_idleanim_33.png", "/sprites/units/unit_basic_evolved_idleanim_34.png", "/sprites/units/unit_basic_evolved_idleanim_35.png", "/sprites/units/unit_basic_evolved_idleanim_36.png", "/sprites/units/unit_basic_evolved_idleanim_37.png", "/sprites/units/unit_basic_evolved_idleanim_38.png", "/sprites/units/unit_basic_evolved_idleanim_39.png", "/sprites/units/unit_basic_evolved_idleanim_40.png", "/sprites/units/unit_basic_evolved_idleanim_41.png", "/sprites/units/unit_basic_evolved_idleanim_42.png", "/sprites/units/unit_basic_evolved_idleanim_43.png", "/sprites/units/unit_basic_evolved_idleanim_44.png", "/sprites/units/unit_basic_evolved_idleanim_45.png", "/sprites/units/unit_basic_evolved_idleanim_46.png", "/sprites/units/unit_basic_evolved_idleanim_47.png", "/sprites/units/unit_basic_evolved_idleanim_48.png", "/sprites/units/unit_basic_evolved_idleanim_49.png", "/sprites/units/unit_basic_evolved_idleanim_50.png", "/sprites/units/unit_basic_evolved_idleanim_51.png", "/sprites/units/unit_basic_evolved_idleanim_52.png", "/sprites/units/unit_basic_evolved_idleanim_53.png", "/sprites/units/unit_basic_evolved_idleanim_54.png", "/sprites/units/unit_basic_evolved_idleanim_55.png", "/sprites/units/unit_basic_evolved_idleanim_56.png", "/sprites/units/unit_basic_evolved_idleanim_57.png", "/sprites/units/unit_basic_evolved_idleanim_58.png", "/sprites/units/unit_basic_evolved_idleanim_59.png", "/sprites/units/unit_basic_evolved_idleanim_60.png", "/sprites/units/unit_basic_evolved_idleanim_61.png", "/sprites/units/unit_basic_evolved_idleanim_62.png", "/sprites/units/unit_basic_evolved_idleanim_63.png"], run: ["/sprites/units/unit_basic_evolved_run_0.png", "/sprites/units/unit_basic_evolved_run_1.png", "/sprites/units/unit_basic_evolved_run_2.png", "/sprites/units/unit_basic_evolved_run_3.png", "/sprites/units/unit_basic_evolved_run_4.png", "/sprites/units/unit_basic_evolved_run_5.png", "/sprites/units/unit_basic_evolved_run_6.png", "/sprites/units/unit_basic_evolved_run_7.png", "/sprites/units/unit_basic_evolved_run_8.png", "/sprites/units/unit_basic_evolved_run_9.png", "/sprites/units/unit_basic_evolved_run_10.png", "/sprites/units/unit_basic_evolved_run_11.png", "/sprites/units/unit_basic_evolved_run_12.png", "/sprites/units/unit_basic_evolved_run_13.png", "/sprites/units/unit_basic_evolved_run_14.png", "/sprites/units/unit_basic_evolved_run_15.png", "/sprites/units/unit_basic_evolved_run_16.png", "/sprites/units/unit_basic_evolved_run_17.png"] } },
  },
  tank: {
    id: 'tank',
    displayName: 'Tank Cat',
    abilityLabel: 'Tank',
    characterName: 'Olek', // タンクネコ／ネコカベ／ゴムネコ (Tank Cat / Wall Cat / Eraser Cat)
    role: 'tank',
    unlockRequirement: { stageId: 'stage1' },
    cost: 100,
    hp: 400,
    damage: 2,
    attackSpeed: 2.4, // dps ~0.9 — interval 2233ms (67F), split 267/1966 below (real 8F/59F)
    foreswingMs: 267,
    backswingMs: 1966,
    moveSpeed: 44, // real spd 8 — 0.8x Cat's
    radius: 26,
    range: 26,
    rechargeMs: 8333, // real 250F
    knockbackCount: 1, // real kb 1 — a plain (not immune) single stagger threshold, same shape as Titan Cat
    knockbackDistance: 8,
    knockbackType: 'normal',
    color: 0x6699ff,
    label: 'T',
    special: { type: 'aoe', radius: 30 }, // real Tank Cat forms are area-type despite the negligible damage
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/units/unit_tank_idle.png", attack: "/sprites/units/unit_tank_attack.png", hit: "/sprites/units/unit_tank_hit.png", run: ["/sprites/units/unit_tank_run_0.png", "/sprites/units/unit_tank_run_1.png", "/sprites/units/unit_tank_run_2.png", "/sprites/units/unit_tank_run_3.png", "/sprites/units/unit_tank_run_4.png", "/sprites/units/unit_tank_run_5.png", "/sprites/units/unit_tank_run_6.png", "/sprites/units/unit_tank_run_7.png", "/sprites/units/unit_tank_run_8.png", "/sprites/units/unit_tank_run_9.png", "/sprites/units/unit_tank_run_10.png", "/sprites/units/unit_tank_run_11.png", "/sprites/units/unit_tank_run_12.png", "/sprites/units/unit_tank_run_13.png", "/sprites/units/unit_tank_run_14.png", "/sprites/units/unit_tank_run_15.png", "/sprites/units/unit_tank_run_16.png", "/sprites/units/unit_tank_run_17.png"], idleAnim: ["/sprites/units/unit_tank_idleanim_0.png", "/sprites/units/unit_tank_idleanim_1.png", "/sprites/units/unit_tank_idleanim_2.png", "/sprites/units/unit_tank_idleanim_3.png", "/sprites/units/unit_tank_idleanim_4.png", "/sprites/units/unit_tank_idleanim_5.png", "/sprites/units/unit_tank_idleanim_6.png", "/sprites/units/unit_tank_idleanim_7.png", "/sprites/units/unit_tank_idleanim_8.png", "/sprites/units/unit_tank_idleanim_9.png", "/sprites/units/unit_tank_idleanim_10.png", "/sprites/units/unit_tank_idleanim_11.png", "/sprites/units/unit_tank_idleanim_12.png", "/sprites/units/unit_tank_idleanim_13.png", "/sprites/units/unit_tank_idleanim_14.png", "/sprites/units/unit_tank_idleanim_15.png", "/sprites/units/unit_tank_idleanim_16.png", "/sprites/units/unit_tank_idleanim_17.png", "/sprites/units/unit_tank_idleanim_18.png", "/sprites/units/unit_tank_idleanim_19.png", "/sprites/units/unit_tank_idleanim_20.png", "/sprites/units/unit_tank_idleanim_21.png", "/sprites/units/unit_tank_idleanim_22.png", "/sprites/units/unit_tank_idleanim_23.png", "/sprites/units/unit_tank_idleanim_24.png", "/sprites/units/unit_tank_idleanim_25.png", "/sprites/units/unit_tank_idleanim_26.png", "/sprites/units/unit_tank_idleanim_27.png", "/sprites/units/unit_tank_idleanim_28.png", "/sprites/units/unit_tank_idleanim_29.png", "/sprites/units/unit_tank_idleanim_30.png", "/sprites/units/unit_tank_idleanim_31.png", "/sprites/units/unit_tank_idleanim_32.png", "/sprites/units/unit_tank_idleanim_33.png", "/sprites/units/unit_tank_idleanim_34.png", "/sprites/units/unit_tank_idleanim_35.png", "/sprites/units/unit_tank_idleanim_36.png", "/sprites/units/unit_tank_idleanim_37.png", "/sprites/units/unit_tank_idleanim_38.png", "/sprites/units/unit_tank_idleanim_39.png"], evolved: { idle: "/sprites/units/unit_tank_evolved_idle.png", attack: "/sprites/units/unit_tank_evolved_attack.png", hit: "/sprites/units/unit_tank_evolved_hit.png", idleAnim: ["/sprites/units/unit_tank_evolved_idleanim_0.png", "/sprites/units/unit_tank_evolved_idleanim_1.png", "/sprites/units/unit_tank_evolved_idleanim_2.png", "/sprites/units/unit_tank_evolved_idleanim_3.png", "/sprites/units/unit_tank_evolved_idleanim_4.png", "/sprites/units/unit_tank_evolved_idleanim_5.png", "/sprites/units/unit_tank_evolved_idleanim_6.png", "/sprites/units/unit_tank_evolved_idleanim_7.png", "/sprites/units/unit_tank_evolved_idleanim_8.png", "/sprites/units/unit_tank_evolved_idleanim_9.png", "/sprites/units/unit_tank_evolved_idleanim_10.png", "/sprites/units/unit_tank_evolved_idleanim_11.png", "/sprites/units/unit_tank_evolved_idleanim_12.png", "/sprites/units/unit_tank_evolved_idleanim_13.png", "/sprites/units/unit_tank_evolved_idleanim_14.png", "/sprites/units/unit_tank_evolved_idleanim_15.png", "/sprites/units/unit_tank_evolved_idleanim_16.png", "/sprites/units/unit_tank_evolved_idleanim_17.png", "/sprites/units/unit_tank_evolved_idleanim_18.png", "/sprites/units/unit_tank_evolved_idleanim_19.png", "/sprites/units/unit_tank_evolved_idleanim_20.png", "/sprites/units/unit_tank_evolved_idleanim_21.png", "/sprites/units/unit_tank_evolved_idleanim_22.png", "/sprites/units/unit_tank_evolved_idleanim_23.png", "/sprites/units/unit_tank_evolved_idleanim_24.png", "/sprites/units/unit_tank_evolved_idleanim_25.png", "/sprites/units/unit_tank_evolved_idleanim_26.png", "/sprites/units/unit_tank_evolved_idleanim_27.png", "/sprites/units/unit_tank_evolved_idleanim_28.png", "/sprites/units/unit_tank_evolved_idleanim_29.png", "/sprites/units/unit_tank_evolved_idleanim_30.png", "/sprites/units/unit_tank_evolved_idleanim_31.png", "/sprites/units/unit_tank_evolved_idleanim_32.png", "/sprites/units/unit_tank_evolved_idleanim_33.png", "/sprites/units/unit_tank_evolved_idleanim_34.png", "/sprites/units/unit_tank_evolved_idleanim_35.png", "/sprites/units/unit_tank_evolved_idleanim_36.png", "/sprites/units/unit_tank_evolved_idleanim_37.png", "/sprites/units/unit_tank_evolved_idleanim_38.png", "/sprites/units/unit_tank_evolved_idleanim_39.png"], run: ["/sprites/units/unit_tank_evolved_run_0.png", "/sprites/units/unit_tank_evolved_run_1.png", "/sprites/units/unit_tank_evolved_run_2.png", "/sprites/units/unit_tank_evolved_run_3.png", "/sprites/units/unit_tank_evolved_run_4.png", "/sprites/units/unit_tank_evolved_run_5.png", "/sprites/units/unit_tank_evolved_run_6.png", "/sprites/units/unit_tank_evolved_run_7.png", "/sprites/units/unit_tank_evolved_run_8.png", "/sprites/units/unit_tank_evolved_run_9.png", "/sprites/units/unit_tank_evolved_run_10.png", "/sprites/units/unit_tank_evolved_run_11.png", "/sprites/units/unit_tank_evolved_run_12.png", "/sprites/units/unit_tank_evolved_run_13.png", "/sprites/units/unit_tank_evolved_run_14.png", "/sprites/units/unit_tank_evolved_run_15.png", "/sprites/units/unit_tank_evolved_run_16.png", "/sprites/units/unit_tank_evolved_run_17.png"] } },
  },
  swarm: {
    id: 'swarm',
    displayName: 'Axe Cat',
    abilityLabel: 'Melee Attacker',
    characterName: 'Shillin', // バトルネコ／勇者ネコ／暗黒ネコ (Axe Cat / Brave Cat / Dark Cat)
    role: 'swarm',
    unlockRequirement: { stageId: 'stage3' }, // real: 鹿児島県クリア
    cost: 200,
    hp: 200,
    damage: 25,
    attackSpeed: 33.3, // dps ~9.3 — interval 900ms (27F), split 267/633 below (real 8F/19F)
    foreswingMs: 267,
    backswingMs: 633,
    moveSpeed: 66, // real spd 12 — 1.2x Cat's
    radius: 12,
    range: 12,
    rechargeMs: 7333, // real 220F
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0x99cc33,
    label: 'A',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    // Strong Against Red (めっぽう強い) — the guide's real ability for this
    // lineage, replacing the previous roster's invented Dodge gimmick.
    strongVs: 'red',
    sprite: { idle: "/sprites/units/unit_swarm_idle.png", attack: "/sprites/units/unit_swarm_attack.png", hit: "/sprites/units/unit_swarm_hit.png", run: ["/sprites/units/unit_swarm_run_0.png", "/sprites/units/unit_swarm_run_1.png", "/sprites/units/unit_swarm_run_2.png", "/sprites/units/unit_swarm_run_3.png", "/sprites/units/unit_swarm_run_4.png", "/sprites/units/unit_swarm_run_5.png", "/sprites/units/unit_swarm_run_6.png", "/sprites/units/unit_swarm_run_7.png", "/sprites/units/unit_swarm_run_8.png", "/sprites/units/unit_swarm_run_9.png", "/sprites/units/unit_swarm_run_10.png", "/sprites/units/unit_swarm_run_11.png", "/sprites/units/unit_swarm_run_12.png", "/sprites/units/unit_swarm_run_13.png", "/sprites/units/unit_swarm_run_14.png", "/sprites/units/unit_swarm_run_15.png", "/sprites/units/unit_swarm_run_16.png", "/sprites/units/unit_swarm_run_17.png"], idleAnim: ["/sprites/units/unit_swarm_idleanim_0.png", "/sprites/units/unit_swarm_idleanim_1.png", "/sprites/units/unit_swarm_idleanim_2.png", "/sprites/units/unit_swarm_idleanim_3.png", "/sprites/units/unit_swarm_idleanim_4.png", "/sprites/units/unit_swarm_idleanim_5.png", "/sprites/units/unit_swarm_idleanim_6.png", "/sprites/units/unit_swarm_idleanim_7.png", "/sprites/units/unit_swarm_idleanim_8.png", "/sprites/units/unit_swarm_idleanim_9.png", "/sprites/units/unit_swarm_idleanim_10.png", "/sprites/units/unit_swarm_idleanim_11.png", "/sprites/units/unit_swarm_idleanim_12.png", "/sprites/units/unit_swarm_idleanim_13.png", "/sprites/units/unit_swarm_idleanim_14.png", "/sprites/units/unit_swarm_idleanim_15.png", "/sprites/units/unit_swarm_idleanim_16.png", "/sprites/units/unit_swarm_idleanim_17.png", "/sprites/units/unit_swarm_idleanim_18.png", "/sprites/units/unit_swarm_idleanim_19.png", "/sprites/units/unit_swarm_idleanim_20.png", "/sprites/units/unit_swarm_idleanim_21.png", "/sprites/units/unit_swarm_idleanim_22.png", "/sprites/units/unit_swarm_idleanim_23.png", "/sprites/units/unit_swarm_idleanim_24.png", "/sprites/units/unit_swarm_idleanim_25.png", "/sprites/units/unit_swarm_idleanim_26.png", "/sprites/units/unit_swarm_idleanim_27.png", "/sprites/units/unit_swarm_idleanim_28.png", "/sprites/units/unit_swarm_idleanim_29.png", "/sprites/units/unit_swarm_idleanim_30.png", "/sprites/units/unit_swarm_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_swarm_evolved_idle.png", attack: "/sprites/units/unit_swarm_evolved_attack.png", hit: "/sprites/units/unit_swarm_evolved_hit.png", idleAnim: ["/sprites/units/unit_swarm_evolved_idleanim_0.png", "/sprites/units/unit_swarm_evolved_idleanim_1.png", "/sprites/units/unit_swarm_evolved_idleanim_2.png", "/sprites/units/unit_swarm_evolved_idleanim_3.png", "/sprites/units/unit_swarm_evolved_idleanim_4.png", "/sprites/units/unit_swarm_evolved_idleanim_5.png", "/sprites/units/unit_swarm_evolved_idleanim_6.png", "/sprites/units/unit_swarm_evolved_idleanim_7.png", "/sprites/units/unit_swarm_evolved_idleanim_8.png", "/sprites/units/unit_swarm_evolved_idleanim_9.png", "/sprites/units/unit_swarm_evolved_idleanim_10.png", "/sprites/units/unit_swarm_evolved_idleanim_11.png", "/sprites/units/unit_swarm_evolved_idleanim_12.png", "/sprites/units/unit_swarm_evolved_idleanim_13.png", "/sprites/units/unit_swarm_evolved_idleanim_14.png", "/sprites/units/unit_swarm_evolved_idleanim_15.png", "/sprites/units/unit_swarm_evolved_idleanim_16.png", "/sprites/units/unit_swarm_evolved_idleanim_17.png", "/sprites/units/unit_swarm_evolved_idleanim_18.png", "/sprites/units/unit_swarm_evolved_idleanim_19.png", "/sprites/units/unit_swarm_evolved_idleanim_20.png", "/sprites/units/unit_swarm_evolved_idleanim_21.png", "/sprites/units/unit_swarm_evolved_idleanim_22.png", "/sprites/units/unit_swarm_evolved_idleanim_23.png", "/sprites/units/unit_swarm_evolved_idleanim_24.png", "/sprites/units/unit_swarm_evolved_idleanim_25.png", "/sprites/units/unit_swarm_evolved_idleanim_26.png", "/sprites/units/unit_swarm_evolved_idleanim_27.png", "/sprites/units/unit_swarm_evolved_idleanim_28.png", "/sprites/units/unit_swarm_evolved_idleanim_29.png", "/sprites/units/unit_swarm_evolved_idleanim_30.png", "/sprites/units/unit_swarm_evolved_idleanim_31.png"], run: ["/sprites/units/unit_swarm_evolved_run_0.png", "/sprites/units/unit_swarm_evolved_run_1.png", "/sprites/units/unit_swarm_evolved_run_2.png", "/sprites/units/unit_swarm_evolved_run_3.png", "/sprites/units/unit_swarm_evolved_run_4.png", "/sprites/units/unit_swarm_evolved_run_5.png", "/sprites/units/unit_swarm_evolved_run_6.png", "/sprites/units/unit_swarm_evolved_run_7.png", "/sprites/units/unit_swarm_evolved_run_8.png", "/sprites/units/unit_swarm_evolved_run_9.png", "/sprites/units/unit_swarm_evolved_run_10.png", "/sprites/units/unit_swarm_evolved_run_11.png", "/sprites/units/unit_swarm_evolved_run_12.png", "/sprites/units/unit_swarm_evolved_run_13.png", "/sprites/units/unit_swarm_evolved_run_14.png", "/sprites/units/unit_swarm_evolved_run_15.png", "/sprites/units/unit_swarm_evolved_run_16.png", "/sprites/units/unit_swarm_evolved_run_17.png"] } },
  },
  ranged: {
    id: 'ranged',
    displayName: 'Gross Cat',
    abilityLabel: 'Ranged Attacker',
    characterName: 'Puffy', // キモネコ／美脚ネコ／ムキあしネコ (Gross Cat / Sexy Legs Cat / Macho Leg Cat)
    role: 'ranged',
    unlockRequirement: { stageId: 'stage6' }, // real: 大分県クリア
    cost: 400,
    hp: 400,
    damage: 100,
    attackSpeed: 7.1, // dps ~23.6 — interval 4233ms (127F), split 267/3966 below (real 8F/119F)
    foreswingMs: 267,
    backswingMs: 3966,
    moveSpeed: 55, // real spd 10 — same as Cat's
    radius: 13,
    range: 35, // first lineage with real reach beyond contact (real range 350 vs Cat's 140 — a 2.5x ratio)
    rechargeMs: 11333, // real 340F
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xffcc33,
    label: 'G',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/units/unit_ranged_idle.png", attack: "/sprites/units/unit_ranged_attack.png", hit: "/sprites/units/unit_ranged_hit.png", run: ["/sprites/units/unit_ranged_run_0.png", "/sprites/units/unit_ranged_run_1.png", "/sprites/units/unit_ranged_run_2.png", "/sprites/units/unit_ranged_run_3.png", "/sprites/units/unit_ranged_run_4.png", "/sprites/units/unit_ranged_run_5.png", "/sprites/units/unit_ranged_run_6.png", "/sprites/units/unit_ranged_run_7.png", "/sprites/units/unit_ranged_run_8.png", "/sprites/units/unit_ranged_run_9.png", "/sprites/units/unit_ranged_run_10.png", "/sprites/units/unit_ranged_run_11.png", "/sprites/units/unit_ranged_run_12.png", "/sprites/units/unit_ranged_run_13.png", "/sprites/units/unit_ranged_run_14.png", "/sprites/units/unit_ranged_run_15.png", "/sprites/units/unit_ranged_run_16.png", "/sprites/units/unit_ranged_run_17.png"], idleAnim: ["/sprites/units/unit_ranged_idleanim_0.png", "/sprites/units/unit_ranged_idleanim_1.png", "/sprites/units/unit_ranged_idleanim_2.png", "/sprites/units/unit_ranged_idleanim_3.png", "/sprites/units/unit_ranged_idleanim_4.png", "/sprites/units/unit_ranged_idleanim_5.png", "/sprites/units/unit_ranged_idleanim_6.png", "/sprites/units/unit_ranged_idleanim_7.png", "/sprites/units/unit_ranged_idleanim_8.png", "/sprites/units/unit_ranged_idleanim_9.png", "/sprites/units/unit_ranged_idleanim_10.png", "/sprites/units/unit_ranged_idleanim_11.png", "/sprites/units/unit_ranged_idleanim_12.png", "/sprites/units/unit_ranged_idleanim_13.png", "/sprites/units/unit_ranged_idleanim_14.png", "/sprites/units/unit_ranged_idleanim_15.png", "/sprites/units/unit_ranged_idleanim_16.png", "/sprites/units/unit_ranged_idleanim_17.png", "/sprites/units/unit_ranged_idleanim_18.png", "/sprites/units/unit_ranged_idleanim_19.png", "/sprites/units/unit_ranged_idleanim_20.png", "/sprites/units/unit_ranged_idleanim_21.png", "/sprites/units/unit_ranged_idleanim_22.png", "/sprites/units/unit_ranged_idleanim_23.png", "/sprites/units/unit_ranged_idleanim_24.png", "/sprites/units/unit_ranged_idleanim_25.png", "/sprites/units/unit_ranged_idleanim_26.png", "/sprites/units/unit_ranged_idleanim_27.png", "/sprites/units/unit_ranged_idleanim_28.png", "/sprites/units/unit_ranged_idleanim_29.png", "/sprites/units/unit_ranged_idleanim_30.png", "/sprites/units/unit_ranged_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_ranged_evolved_idle.png", attack: "/sprites/units/unit_ranged_evolved_attack.png", hit: "/sprites/units/unit_ranged_evolved_hit.png", idleAnim: ["/sprites/units/unit_ranged_evolved_idleanim_0.png", "/sprites/units/unit_ranged_evolved_idleanim_1.png", "/sprites/units/unit_ranged_evolved_idleanim_2.png", "/sprites/units/unit_ranged_evolved_idleanim_3.png", "/sprites/units/unit_ranged_evolved_idleanim_4.png", "/sprites/units/unit_ranged_evolved_idleanim_5.png", "/sprites/units/unit_ranged_evolved_idleanim_6.png", "/sprites/units/unit_ranged_evolved_idleanim_7.png", "/sprites/units/unit_ranged_evolved_idleanim_8.png", "/sprites/units/unit_ranged_evolved_idleanim_9.png", "/sprites/units/unit_ranged_evolved_idleanim_10.png", "/sprites/units/unit_ranged_evolved_idleanim_11.png", "/sprites/units/unit_ranged_evolved_idleanim_12.png", "/sprites/units/unit_ranged_evolved_idleanim_13.png", "/sprites/units/unit_ranged_evolved_idleanim_14.png", "/sprites/units/unit_ranged_evolved_idleanim_15.png", "/sprites/units/unit_ranged_evolved_idleanim_16.png", "/sprites/units/unit_ranged_evolved_idleanim_17.png", "/sprites/units/unit_ranged_evolved_idleanim_18.png", "/sprites/units/unit_ranged_evolved_idleanim_19.png", "/sprites/units/unit_ranged_evolved_idleanim_20.png", "/sprites/units/unit_ranged_evolved_idleanim_21.png", "/sprites/units/unit_ranged_evolved_idleanim_22.png", "/sprites/units/unit_ranged_evolved_idleanim_23.png", "/sprites/units/unit_ranged_evolved_idleanim_24.png", "/sprites/units/unit_ranged_evolved_idleanim_25.png", "/sprites/units/unit_ranged_evolved_idleanim_26.png", "/sprites/units/unit_ranged_evolved_idleanim_27.png", "/sprites/units/unit_ranged_evolved_idleanim_28.png", "/sprites/units/unit_ranged_evolved_idleanim_29.png", "/sprites/units/unit_ranged_evolved_idleanim_30.png", "/sprites/units/unit_ranged_evolved_idleanim_31.png"], run: ["/sprites/units/unit_ranged_evolved_run_0.png", "/sprites/units/unit_ranged_evolved_run_1.png", "/sprites/units/unit_ranged_evolved_run_2.png", "/sprites/units/unit_ranged_evolved_run_3.png", "/sprites/units/unit_ranged_evolved_run_4.png", "/sprites/units/unit_ranged_evolved_run_5.png", "/sprites/units/unit_ranged_evolved_run_6.png", "/sprites/units/unit_ranged_evolved_run_7.png", "/sprites/units/unit_ranged_evolved_run_8.png", "/sprites/units/unit_ranged_evolved_run_9.png", "/sprites/units/unit_ranged_evolved_run_10.png", "/sprites/units/unit_ranged_evolved_run_11.png", "/sprites/units/unit_ranged_evolved_run_12.png", "/sprites/units/unit_ranged_evolved_run_13.png", "/sprites/units/unit_ranged_evolved_run_14.png", "/sprites/units/unit_ranged_evolved_run_15.png", "/sprites/units/unit_ranged_evolved_run_16.png", "/sprites/units/unit_ranged_evolved_run_17.png"] } },
  },
  fast: {
    id: 'fast',
    displayName: 'Cow Cat',
    abilityLabel: 'Fast Melee',
    characterName: 'Buba', // ウシネコ／ネコキリン／ネコライオン (Cow Cat / Giraffe Cat / Lion Cat)
    role: 'fast',
    unlockRequirement: { stageId: 'stage5' }, // real: "第1章の進行で解放" (vague) — placed here for even pacing
    cost: 500,
    hp: 500,
    damage: 13,
    attackSpeed: 39, // dps ~39 — interval 333ms (10F), split 200/133 below (real 6F/4F)
    foreswingMs: 200,
    backswingMs: 133,
    moveSpeed: 165, // real spd 30 — exactly 3x Cat's, the fastest mover in the roster
    radius: 12,
    range: 12,
    rechargeMs: 9333, // real 280F
    knockbackCount: 5,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0x33ffcc,
    label: 'Cw',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/units/unit_fast_idle.png", attack: "/sprites/units/unit_fast_attack.png", hit: "/sprites/units/unit_fast_hit.png", run: ["/sprites/units/unit_fast_run_0.png", "/sprites/units/unit_fast_run_1.png", "/sprites/units/unit_fast_run_2.png", "/sprites/units/unit_fast_run_3.png", "/sprites/units/unit_fast_run_4.png", "/sprites/units/unit_fast_run_5.png", "/sprites/units/unit_fast_run_6.png", "/sprites/units/unit_fast_run_7.png", "/sprites/units/unit_fast_run_8.png", "/sprites/units/unit_fast_run_9.png", "/sprites/units/unit_fast_run_10.png", "/sprites/units/unit_fast_run_11.png", "/sprites/units/unit_fast_run_12.png", "/sprites/units/unit_fast_run_13.png", "/sprites/units/unit_fast_run_14.png", "/sprites/units/unit_fast_run_15.png", "/sprites/units/unit_fast_run_16.png", "/sprites/units/unit_fast_run_17.png"], idleAnim: ["/sprites/units/unit_fast_idleanim_0.png", "/sprites/units/unit_fast_idleanim_1.png", "/sprites/units/unit_fast_idleanim_2.png", "/sprites/units/unit_fast_idleanim_3.png", "/sprites/units/unit_fast_idleanim_4.png", "/sprites/units/unit_fast_idleanim_5.png", "/sprites/units/unit_fast_idleanim_6.png", "/sprites/units/unit_fast_idleanim_7.png", "/sprites/units/unit_fast_idleanim_8.png", "/sprites/units/unit_fast_idleanim_9.png", "/sprites/units/unit_fast_idleanim_10.png", "/sprites/units/unit_fast_idleanim_11.png", "/sprites/units/unit_fast_idleanim_12.png", "/sprites/units/unit_fast_idleanim_13.png", "/sprites/units/unit_fast_idleanim_14.png", "/sprites/units/unit_fast_idleanim_15.png", "/sprites/units/unit_fast_idleanim_16.png", "/sprites/units/unit_fast_idleanim_17.png", "/sprites/units/unit_fast_idleanim_18.png", "/sprites/units/unit_fast_idleanim_19.png", "/sprites/units/unit_fast_idleanim_20.png", "/sprites/units/unit_fast_idleanim_21.png", "/sprites/units/unit_fast_idleanim_22.png", "/sprites/units/unit_fast_idleanim_23.png", "/sprites/units/unit_fast_idleanim_24.png", "/sprites/units/unit_fast_idleanim_25.png", "/sprites/units/unit_fast_idleanim_26.png", "/sprites/units/unit_fast_idleanim_27.png", "/sprites/units/unit_fast_idleanim_28.png", "/sprites/units/unit_fast_idleanim_29.png", "/sprites/units/unit_fast_idleanim_30.png", "/sprites/units/unit_fast_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_fast_evolved_idle.png", attack: "/sprites/units/unit_fast_evolved_attack.png", hit: "/sprites/units/unit_fast_evolved_hit.png", idleAnim: ["/sprites/units/unit_fast_evolved_idleanim_0.png", "/sprites/units/unit_fast_evolved_idleanim_1.png", "/sprites/units/unit_fast_evolved_idleanim_2.png", "/sprites/units/unit_fast_evolved_idleanim_3.png", "/sprites/units/unit_fast_evolved_idleanim_4.png", "/sprites/units/unit_fast_evolved_idleanim_5.png", "/sprites/units/unit_fast_evolved_idleanim_6.png", "/sprites/units/unit_fast_evolved_idleanim_7.png", "/sprites/units/unit_fast_evolved_idleanim_8.png", "/sprites/units/unit_fast_evolved_idleanim_9.png", "/sprites/units/unit_fast_evolved_idleanim_10.png", "/sprites/units/unit_fast_evolved_idleanim_11.png", "/sprites/units/unit_fast_evolved_idleanim_12.png", "/sprites/units/unit_fast_evolved_idleanim_13.png", "/sprites/units/unit_fast_evolved_idleanim_14.png", "/sprites/units/unit_fast_evolved_idleanim_15.png", "/sprites/units/unit_fast_evolved_idleanim_16.png", "/sprites/units/unit_fast_evolved_idleanim_17.png", "/sprites/units/unit_fast_evolved_idleanim_18.png", "/sprites/units/unit_fast_evolved_idleanim_19.png", "/sprites/units/unit_fast_evolved_idleanim_20.png", "/sprites/units/unit_fast_evolved_idleanim_21.png", "/sprites/units/unit_fast_evolved_idleanim_22.png", "/sprites/units/unit_fast_evolved_idleanim_23.png", "/sprites/units/unit_fast_evolved_idleanim_24.png", "/sprites/units/unit_fast_evolved_idleanim_25.png", "/sprites/units/unit_fast_evolved_idleanim_26.png", "/sprites/units/unit_fast_evolved_idleanim_27.png", "/sprites/units/unit_fast_evolved_idleanim_28.png", "/sprites/units/unit_fast_evolved_idleanim_29.png", "/sprites/units/unit_fast_evolved_idleanim_30.png", "/sprites/units/unit_fast_evolved_idleanim_31.png"], run: ["/sprites/units/unit_fast_evolved_run_0.png", "/sprites/units/unit_fast_evolved_run_1.png", "/sprites/units/unit_fast_evolved_run_2.png", "/sprites/units/unit_fast_evolved_run_3.png", "/sprites/units/unit_fast_evolved_run_4.png", "/sprites/units/unit_fast_evolved_run_5.png", "/sprites/units/unit_fast_evolved_run_6.png", "/sprites/units/unit_fast_evolved_run_7.png", "/sprites/units/unit_fast_evolved_run_8.png", "/sprites/units/unit_fast_evolved_run_9.png", "/sprites/units/unit_fast_evolved_run_10.png", "/sprites/units/unit_fast_evolved_run_11.png", "/sprites/units/unit_fast_evolved_run_12.png", "/sprites/units/unit_fast_evolved_run_13.png", "/sprites/units/unit_fast_evolved_run_14.png", "/sprites/units/unit_fast_evolved_run_15.png", "/sprites/units/unit_fast_evolved_run_16.png", "/sprites/units/unit_fast_evolved_run_17.png"] } },
  },
  aoe: {
    id: 'aoe',
    displayName: 'Bird Cat',
    abilityLabel: 'Area Attacker',
    characterName: 'Noir', // ネコノトリ／ネコUFO／天空のネコ (Bird Cat / UFO Cat / The Flying Cat)
    role: 'aoe',
    unlockRequirement: { stageId: 'stage12' }, // real: 山口県クリア
    cost: 650,
    hp: 300,
    damage: 140,
    attackSpeed: 25.5, // dps ~25.7 — interval 1633ms (49F), split 333/1300 below (real 10F/39F)
    foreswingMs: 333,
    backswingMs: 1300,
    moveSpeed: 55, // real spd 10 — same as Cat's
    radius: 16,
    range: 21, // real range 170 vs Cat's 140
    rechargeMs: 8667, // real 260F
    knockbackCount: 4,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xcc66ff,
    label: 'B',
    special: { type: 'aoe', radius: 40 },
    critChance: 0,
    statusOnHit: NO_STATUS,
    // Round 2: a bird hunting fliers — gives Floating enemies a counter.
    strongVs: 'floating',
    sprite: { idle: "/sprites/units/unit_aoe_idle.png", attack: "/sprites/units/unit_aoe_attack.png", hit: "/sprites/units/unit_aoe_hit.png", run: ["/sprites/units/unit_aoe_run_0.png", "/sprites/units/unit_aoe_run_1.png", "/sprites/units/unit_aoe_run_2.png", "/sprites/units/unit_aoe_run_3.png", "/sprites/units/unit_aoe_run_4.png", "/sprites/units/unit_aoe_run_5.png", "/sprites/units/unit_aoe_run_6.png", "/sprites/units/unit_aoe_run_7.png", "/sprites/units/unit_aoe_run_8.png", "/sprites/units/unit_aoe_run_9.png", "/sprites/units/unit_aoe_run_10.png", "/sprites/units/unit_aoe_run_11.png", "/sprites/units/unit_aoe_run_12.png", "/sprites/units/unit_aoe_run_13.png", "/sprites/units/unit_aoe_run_14.png", "/sprites/units/unit_aoe_run_15.png", "/sprites/units/unit_aoe_run_16.png", "/sprites/units/unit_aoe_run_17.png"], idleAnim: ["/sprites/units/unit_aoe_idleanim_0.png", "/sprites/units/unit_aoe_idleanim_1.png", "/sprites/units/unit_aoe_idleanim_2.png", "/sprites/units/unit_aoe_idleanim_3.png", "/sprites/units/unit_aoe_idleanim_4.png", "/sprites/units/unit_aoe_idleanim_5.png", "/sprites/units/unit_aoe_idleanim_6.png", "/sprites/units/unit_aoe_idleanim_7.png", "/sprites/units/unit_aoe_idleanim_8.png", "/sprites/units/unit_aoe_idleanim_9.png", "/sprites/units/unit_aoe_idleanim_10.png", "/sprites/units/unit_aoe_idleanim_11.png", "/sprites/units/unit_aoe_idleanim_12.png", "/sprites/units/unit_aoe_idleanim_13.png", "/sprites/units/unit_aoe_idleanim_14.png", "/sprites/units/unit_aoe_idleanim_15.png", "/sprites/units/unit_aoe_idleanim_16.png", "/sprites/units/unit_aoe_idleanim_17.png", "/sprites/units/unit_aoe_idleanim_18.png", "/sprites/units/unit_aoe_idleanim_19.png", "/sprites/units/unit_aoe_idleanim_20.png", "/sprites/units/unit_aoe_idleanim_21.png", "/sprites/units/unit_aoe_idleanim_22.png", "/sprites/units/unit_aoe_idleanim_23.png", "/sprites/units/unit_aoe_idleanim_24.png", "/sprites/units/unit_aoe_idleanim_25.png", "/sprites/units/unit_aoe_idleanim_26.png", "/sprites/units/unit_aoe_idleanim_27.png", "/sprites/units/unit_aoe_idleanim_28.png", "/sprites/units/unit_aoe_idleanim_29.png", "/sprites/units/unit_aoe_idleanim_30.png", "/sprites/units/unit_aoe_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_aoe_evolved_idle.png", attack: "/sprites/units/unit_aoe_evolved_attack.png", hit: "/sprites/units/unit_aoe_evolved_hit.png", idleAnim: ["/sprites/units/unit_aoe_evolved_idleanim_0.png", "/sprites/units/unit_aoe_evolved_idleanim_1.png", "/sprites/units/unit_aoe_evolved_idleanim_2.png", "/sprites/units/unit_aoe_evolved_idleanim_3.png", "/sprites/units/unit_aoe_evolved_idleanim_4.png", "/sprites/units/unit_aoe_evolved_idleanim_5.png", "/sprites/units/unit_aoe_evolved_idleanim_6.png", "/sprites/units/unit_aoe_evolved_idleanim_7.png", "/sprites/units/unit_aoe_evolved_idleanim_8.png", "/sprites/units/unit_aoe_evolved_idleanim_9.png", "/sprites/units/unit_aoe_evolved_idleanim_10.png", "/sprites/units/unit_aoe_evolved_idleanim_11.png", "/sprites/units/unit_aoe_evolved_idleanim_12.png", "/sprites/units/unit_aoe_evolved_idleanim_13.png", "/sprites/units/unit_aoe_evolved_idleanim_14.png", "/sprites/units/unit_aoe_evolved_idleanim_15.png", "/sprites/units/unit_aoe_evolved_idleanim_16.png", "/sprites/units/unit_aoe_evolved_idleanim_17.png", "/sprites/units/unit_aoe_evolved_idleanim_18.png", "/sprites/units/unit_aoe_evolved_idleanim_19.png", "/sprites/units/unit_aoe_evolved_idleanim_20.png", "/sprites/units/unit_aoe_evolved_idleanim_21.png", "/sprites/units/unit_aoe_evolved_idleanim_22.png", "/sprites/units/unit_aoe_evolved_idleanim_23.png", "/sprites/units/unit_aoe_evolved_idleanim_24.png", "/sprites/units/unit_aoe_evolved_idleanim_25.png", "/sprites/units/unit_aoe_evolved_idleanim_26.png", "/sprites/units/unit_aoe_evolved_idleanim_27.png", "/sprites/units/unit_aoe_evolved_idleanim_28.png", "/sprites/units/unit_aoe_evolved_idleanim_29.png", "/sprites/units/unit_aoe_evolved_idleanim_30.png", "/sprites/units/unit_aoe_evolved_idleanim_31.png"], run: ["/sprites/units/unit_aoe_evolved_run_0.png", "/sprites/units/unit_aoe_evolved_run_1.png", "/sprites/units/unit_aoe_evolved_run_2.png", "/sprites/units/unit_aoe_evolved_run_3.png", "/sprites/units/unit_aoe_evolved_run_4.png", "/sprites/units/unit_aoe_evolved_run_5.png", "/sprites/units/unit_aoe_evolved_run_6.png", "/sprites/units/unit_aoe_evolved_run_7.png", "/sprites/units/unit_aoe_evolved_run_8.png", "/sprites/units/unit_aoe_evolved_run_9.png", "/sprites/units/unit_aoe_evolved_run_10.png", "/sprites/units/unit_aoe_evolved_run_11.png", "/sprites/units/unit_aoe_evolved_run_12.png", "/sprites/units/unit_aoe_evolved_run_13.png", "/sprites/units/unit_aoe_evolved_run_14.png", "/sprites/units/unit_aoe_evolved_run_15.png", "/sprites/units/unit_aoe_evolved_run_16.png", "/sprites/units/unit_aoe_evolved_run_17.png"] } },
  },
  sniper: {
    id: 'sniper',
    displayName: 'Fish Cat',
    abilityLabel: 'Heavy Attacker',
    characterName: 'Momo', // ネコフィッシュ／ネコクジラ／ネコ島 (Fish Cat / Whale Cat / Island Cat)
    role: 'sniper',
    unlockRequirement: { stageId: 'stage16' }, // real: 鳥取県クリア
    cost: 800,
    hp: 700,
    damage: 180,
    attackSpeed: 10.2, // dps ~30.6 — interval 1767ms (53F), split 333/1434 below (real 10F/43F)
    foreswingMs: 333,
    backswingMs: 1434,
    moveSpeed: 55, // real spd 10 — same as Cat's; a high-hp/high-atk bruiser, not a true long-range unit
    radius: 16,
    range: 16,
    rechargeMs: 13333, // real 400F
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0x3399ff,
    label: 'F',
    special: { type: 'none' },
    critChance: 0,
    // Strong Against Red (めっぽう強い) — the guide's real ability here too.
    strongVs: 'red',
    statusOnHit: NO_STATUS,
    // Round 2: the only answer to revive-on-death Zombies.
    massiveVs: 'zombie',
    sprite: { idle: "/sprites/units/unit_sniper_idle.png", attack: "/sprites/units/unit_sniper_attack.png", hit: "/sprites/units/unit_sniper_hit.png", run: ["/sprites/units/unit_sniper_run_0.png", "/sprites/units/unit_sniper_run_1.png", "/sprites/units/unit_sniper_run_2.png", "/sprites/units/unit_sniper_run_3.png", "/sprites/units/unit_sniper_run_4.png", "/sprites/units/unit_sniper_run_5.png", "/sprites/units/unit_sniper_run_6.png", "/sprites/units/unit_sniper_run_7.png", "/sprites/units/unit_sniper_run_8.png", "/sprites/units/unit_sniper_run_9.png", "/sprites/units/unit_sniper_run_10.png", "/sprites/units/unit_sniper_run_11.png", "/sprites/units/unit_sniper_run_12.png", "/sprites/units/unit_sniper_run_13.png", "/sprites/units/unit_sniper_run_14.png", "/sprites/units/unit_sniper_run_15.png", "/sprites/units/unit_sniper_run_16.png", "/sprites/units/unit_sniper_run_17.png"], idleAnim: ["/sprites/units/unit_sniper_idleanim_0.png", "/sprites/units/unit_sniper_idleanim_1.png", "/sprites/units/unit_sniper_idleanim_2.png", "/sprites/units/unit_sniper_idleanim_3.png", "/sprites/units/unit_sniper_idleanim_4.png", "/sprites/units/unit_sniper_idleanim_5.png", "/sprites/units/unit_sniper_idleanim_6.png", "/sprites/units/unit_sniper_idleanim_7.png", "/sprites/units/unit_sniper_idleanim_8.png", "/sprites/units/unit_sniper_idleanim_9.png", "/sprites/units/unit_sniper_idleanim_10.png", "/sprites/units/unit_sniper_idleanim_11.png", "/sprites/units/unit_sniper_idleanim_12.png", "/sprites/units/unit_sniper_idleanim_13.png", "/sprites/units/unit_sniper_idleanim_14.png", "/sprites/units/unit_sniper_idleanim_15.png", "/sprites/units/unit_sniper_idleanim_16.png", "/sprites/units/unit_sniper_idleanim_17.png", "/sprites/units/unit_sniper_idleanim_18.png", "/sprites/units/unit_sniper_idleanim_19.png", "/sprites/units/unit_sniper_idleanim_20.png", "/sprites/units/unit_sniper_idleanim_21.png", "/sprites/units/unit_sniper_idleanim_22.png", "/sprites/units/unit_sniper_idleanim_23.png", "/sprites/units/unit_sniper_idleanim_24.png", "/sprites/units/unit_sniper_idleanim_25.png", "/sprites/units/unit_sniper_idleanim_26.png", "/sprites/units/unit_sniper_idleanim_27.png", "/sprites/units/unit_sniper_idleanim_28.png", "/sprites/units/unit_sniper_idleanim_29.png", "/sprites/units/unit_sniper_idleanim_30.png", "/sprites/units/unit_sniper_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_sniper_evolved_idle.png", attack: "/sprites/units/unit_sniper_evolved_attack.png", hit: "/sprites/units/unit_sniper_evolved_hit.png", idleAnim: ["/sprites/units/unit_sniper_evolved_idleanim_0.png", "/sprites/units/unit_sniper_evolved_idleanim_1.png", "/sprites/units/unit_sniper_evolved_idleanim_2.png", "/sprites/units/unit_sniper_evolved_idleanim_3.png", "/sprites/units/unit_sniper_evolved_idleanim_4.png", "/sprites/units/unit_sniper_evolved_idleanim_5.png", "/sprites/units/unit_sniper_evolved_idleanim_6.png", "/sprites/units/unit_sniper_evolved_idleanim_7.png", "/sprites/units/unit_sniper_evolved_idleanim_8.png", "/sprites/units/unit_sniper_evolved_idleanim_9.png", "/sprites/units/unit_sniper_evolved_idleanim_10.png", "/sprites/units/unit_sniper_evolved_idleanim_11.png", "/sprites/units/unit_sniper_evolved_idleanim_12.png", "/sprites/units/unit_sniper_evolved_idleanim_13.png", "/sprites/units/unit_sniper_evolved_idleanim_14.png", "/sprites/units/unit_sniper_evolved_idleanim_15.png", "/sprites/units/unit_sniper_evolved_idleanim_16.png", "/sprites/units/unit_sniper_evolved_idleanim_17.png", "/sprites/units/unit_sniper_evolved_idleanim_18.png", "/sprites/units/unit_sniper_evolved_idleanim_19.png", "/sprites/units/unit_sniper_evolved_idleanim_20.png", "/sprites/units/unit_sniper_evolved_idleanim_21.png", "/sprites/units/unit_sniper_evolved_idleanim_22.png", "/sprites/units/unit_sniper_evolved_idleanim_23.png", "/sprites/units/unit_sniper_evolved_idleanim_24.png", "/sprites/units/unit_sniper_evolved_idleanim_25.png", "/sprites/units/unit_sniper_evolved_idleanim_26.png", "/sprites/units/unit_sniper_evolved_idleanim_27.png", "/sprites/units/unit_sniper_evolved_idleanim_28.png", "/sprites/units/unit_sniper_evolved_idleanim_29.png", "/sprites/units/unit_sniper_evolved_idleanim_30.png", "/sprites/units/unit_sniper_evolved_idleanim_31.png"], run: ["/sprites/units/unit_sniper_evolved_run_0.png", "/sprites/units/unit_sniper_evolved_run_1.png", "/sprites/units/unit_sniper_evolved_run_2.png", "/sprites/units/unit_sniper_evolved_run_3.png", "/sprites/units/unit_sniper_evolved_run_4.png", "/sprites/units/unit_sniper_evolved_run_5.png", "/sprites/units/unit_sniper_evolved_run_6.png", "/sprites/units/unit_sniper_evolved_run_7.png", "/sprites/units/unit_sniper_evolved_run_8.png", "/sprites/units/unit_sniper_evolved_run_9.png", "/sprites/units/unit_sniper_evolved_run_10.png", "/sprites/units/unit_sniper_evolved_run_11.png", "/sprites/units/unit_sniper_evolved_run_12.png", "/sprites/units/unit_sniper_evolved_run_13.png", "/sprites/units/unit_sniper_evolved_run_14.png", "/sprites/units/unit_sniper_evolved_run_15.png", "/sprites/units/unit_sniper_evolved_run_16.png", "/sprites/units/unit_sniper_evolved_run_17.png"] } },
  },
  support: {
    id: 'support',
    displayName: 'Lizard Cat',
    abilityLabel: 'Long Range',
    characterName: 'Mit', // ネコトカゲ／ネコドラゴン／ネコキングドラゴン (Lizard Cat / Dragon Cat / King Dragon Cat)
    role: 'support',
    // Real unlock note previously read "京都府クリア" (Kyoto) — the guide
    // has since retracted that as unconfirmed ("第1章の進行で解放（DBの
    // 開放条件を参照）", deferring to the DB rather than naming a stage).
    // stage20 kept as a placeholder pacing choice, same treatment as Cow
    // Cat/stage5 and Titan Cat/stage43 below.
    unlockRequirement: { stageId: 'stage20' },
    cost: 1000,
    hp: 800,
    damage: 350,
    attackSpeed: 8.1, // dps ~28.4 — interval 4300ms (129F), split 333/3967 below (real 10F/119F)
    foreswingMs: 333,
    backswingMs: 3967,
    moveSpeed: 55, // real spd 10 — same as Cat's
    radius: 14,
    range: 40, // the roster's true longest reach (real range 400 — the biggest of any Basic-tier lineage)
    rechargeMs: 19333, // real 580F
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0x6666cc,
    label: 'L',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/units/unit_support_idle.png", attack: "/sprites/units/unit_support_attack.png", hit: "/sprites/units/unit_support_hit.png", run: ["/sprites/units/unit_support_run_0.png", "/sprites/units/unit_support_run_1.png", "/sprites/units/unit_support_run_2.png", "/sprites/units/unit_support_run_3.png", "/sprites/units/unit_support_run_4.png", "/sprites/units/unit_support_run_5.png", "/sprites/units/unit_support_run_6.png", "/sprites/units/unit_support_run_7.png", "/sprites/units/unit_support_run_8.png", "/sprites/units/unit_support_run_9.png", "/sprites/units/unit_support_run_10.png", "/sprites/units/unit_support_run_11.png", "/sprites/units/unit_support_run_12.png", "/sprites/units/unit_support_run_13.png", "/sprites/units/unit_support_run_14.png", "/sprites/units/unit_support_run_15.png", "/sprites/units/unit_support_run_16.png", "/sprites/units/unit_support_run_17.png"], idleAnim: ["/sprites/units/unit_support_idleanim_0.png", "/sprites/units/unit_support_idleanim_1.png", "/sprites/units/unit_support_idleanim_2.png", "/sprites/units/unit_support_idleanim_3.png", "/sprites/units/unit_support_idleanim_4.png", "/sprites/units/unit_support_idleanim_5.png", "/sprites/units/unit_support_idleanim_6.png", "/sprites/units/unit_support_idleanim_7.png", "/sprites/units/unit_support_idleanim_8.png", "/sprites/units/unit_support_idleanim_9.png", "/sprites/units/unit_support_idleanim_10.png", "/sprites/units/unit_support_idleanim_11.png", "/sprites/units/unit_support_idleanim_12.png", "/sprites/units/unit_support_idleanim_13.png", "/sprites/units/unit_support_idleanim_14.png", "/sprites/units/unit_support_idleanim_15.png", "/sprites/units/unit_support_idleanim_16.png", "/sprites/units/unit_support_idleanim_17.png", "/sprites/units/unit_support_idleanim_18.png", "/sprites/units/unit_support_idleanim_19.png", "/sprites/units/unit_support_idleanim_20.png", "/sprites/units/unit_support_idleanim_21.png", "/sprites/units/unit_support_idleanim_22.png", "/sprites/units/unit_support_idleanim_23.png", "/sprites/units/unit_support_idleanim_24.png", "/sprites/units/unit_support_idleanim_25.png", "/sprites/units/unit_support_idleanim_26.png", "/sprites/units/unit_support_idleanim_27.png", "/sprites/units/unit_support_idleanim_28.png", "/sprites/units/unit_support_idleanim_29.png", "/sprites/units/unit_support_idleanim_30.png", "/sprites/units/unit_support_idleanim_31.png", "/sprites/units/unit_support_idleanim_32.png", "/sprites/units/unit_support_idleanim_33.png", "/sprites/units/unit_support_idleanim_34.png", "/sprites/units/unit_support_idleanim_35.png", "/sprites/units/unit_support_idleanim_36.png", "/sprites/units/unit_support_idleanim_37.png", "/sprites/units/unit_support_idleanim_38.png", "/sprites/units/unit_support_idleanim_39.png", "/sprites/units/unit_support_idleanim_40.png", "/sprites/units/unit_support_idleanim_41.png", "/sprites/units/unit_support_idleanim_42.png", "/sprites/units/unit_support_idleanim_43.png", "/sprites/units/unit_support_idleanim_44.png", "/sprites/units/unit_support_idleanim_45.png", "/sprites/units/unit_support_idleanim_46.png", "/sprites/units/unit_support_idleanim_47.png", "/sprites/units/unit_support_idleanim_48.png", "/sprites/units/unit_support_idleanim_49.png", "/sprites/units/unit_support_idleanim_50.png", "/sprites/units/unit_support_idleanim_51.png", "/sprites/units/unit_support_idleanim_52.png", "/sprites/units/unit_support_idleanim_53.png", "/sprites/units/unit_support_idleanim_54.png", "/sprites/units/unit_support_idleanim_55.png", "/sprites/units/unit_support_idleanim_56.png", "/sprites/units/unit_support_idleanim_57.png", "/sprites/units/unit_support_idleanim_58.png", "/sprites/units/unit_support_idleanim_59.png", "/sprites/units/unit_support_idleanim_60.png", "/sprites/units/unit_support_idleanim_61.png", "/sprites/units/unit_support_idleanim_62.png", "/sprites/units/unit_support_idleanim_63.png", "/sprites/units/unit_support_idleanim_64.png", "/sprites/units/unit_support_idleanim_65.png", "/sprites/units/unit_support_idleanim_66.png", "/sprites/units/unit_support_idleanim_67.png", "/sprites/units/unit_support_idleanim_68.png", "/sprites/units/unit_support_idleanim_69.png", "/sprites/units/unit_support_idleanim_70.png", "/sprites/units/unit_support_idleanim_71.png", "/sprites/units/unit_support_idleanim_72.png", "/sprites/units/unit_support_idleanim_73.png", "/sprites/units/unit_support_idleanim_74.png", "/sprites/units/unit_support_idleanim_75.png", "/sprites/units/unit_support_idleanim_76.png", "/sprites/units/unit_support_idleanim_77.png", "/sprites/units/unit_support_idleanim_78.png", "/sprites/units/unit_support_idleanim_79.png", "/sprites/units/unit_support_idleanim_80.png", "/sprites/units/unit_support_idleanim_81.png", "/sprites/units/unit_support_idleanim_82.png", "/sprites/units/unit_support_idleanim_83.png", "/sprites/units/unit_support_idleanim_84.png", "/sprites/units/unit_support_idleanim_85.png", "/sprites/units/unit_support_idleanim_86.png", "/sprites/units/unit_support_idleanim_87.png", "/sprites/units/unit_support_idleanim_88.png", "/sprites/units/unit_support_idleanim_89.png", "/sprites/units/unit_support_idleanim_90.png", "/sprites/units/unit_support_idleanim_91.png", "/sprites/units/unit_support_idleanim_92.png", "/sprites/units/unit_support_idleanim_93.png", "/sprites/units/unit_support_idleanim_94.png", "/sprites/units/unit_support_idleanim_95.png"], evolved: { idle: "/sprites/units/unit_support_evolved_idle.png", attack: "/sprites/units/unit_support_evolved_attack.png", hit: "/sprites/units/unit_support_evolved_hit.png", idleAnim: ["/sprites/units/unit_support_evolved_idleanim_0.png", "/sprites/units/unit_support_evolved_idleanim_1.png", "/sprites/units/unit_support_evolved_idleanim_2.png", "/sprites/units/unit_support_evolved_idleanim_3.png", "/sprites/units/unit_support_evolved_idleanim_4.png", "/sprites/units/unit_support_evolved_idleanim_5.png", "/sprites/units/unit_support_evolved_idleanim_6.png", "/sprites/units/unit_support_evolved_idleanim_7.png", "/sprites/units/unit_support_evolved_idleanim_8.png", "/sprites/units/unit_support_evolved_idleanim_9.png", "/sprites/units/unit_support_evolved_idleanim_10.png", "/sprites/units/unit_support_evolved_idleanim_11.png", "/sprites/units/unit_support_evolved_idleanim_12.png", "/sprites/units/unit_support_evolved_idleanim_13.png", "/sprites/units/unit_support_evolved_idleanim_14.png", "/sprites/units/unit_support_evolved_idleanim_15.png", "/sprites/units/unit_support_evolved_idleanim_16.png", "/sprites/units/unit_support_evolved_idleanim_17.png", "/sprites/units/unit_support_evolved_idleanim_18.png", "/sprites/units/unit_support_evolved_idleanim_19.png", "/sprites/units/unit_support_evolved_idleanim_20.png", "/sprites/units/unit_support_evolved_idleanim_21.png", "/sprites/units/unit_support_evolved_idleanim_22.png", "/sprites/units/unit_support_evolved_idleanim_23.png", "/sprites/units/unit_support_evolved_idleanim_24.png", "/sprites/units/unit_support_evolved_idleanim_25.png", "/sprites/units/unit_support_evolved_idleanim_26.png", "/sprites/units/unit_support_evolved_idleanim_27.png", "/sprites/units/unit_support_evolved_idleanim_28.png", "/sprites/units/unit_support_evolved_idleanim_29.png", "/sprites/units/unit_support_evolved_idleanim_30.png", "/sprites/units/unit_support_evolved_idleanim_31.png", "/sprites/units/unit_support_evolved_idleanim_32.png", "/sprites/units/unit_support_evolved_idleanim_33.png", "/sprites/units/unit_support_evolved_idleanim_34.png", "/sprites/units/unit_support_evolved_idleanim_35.png", "/sprites/units/unit_support_evolved_idleanim_36.png", "/sprites/units/unit_support_evolved_idleanim_37.png", "/sprites/units/unit_support_evolved_idleanim_38.png", "/sprites/units/unit_support_evolved_idleanim_39.png", "/sprites/units/unit_support_evolved_idleanim_40.png", "/sprites/units/unit_support_evolved_idleanim_41.png", "/sprites/units/unit_support_evolved_idleanim_42.png", "/sprites/units/unit_support_evolved_idleanim_43.png", "/sprites/units/unit_support_evolved_idleanim_44.png", "/sprites/units/unit_support_evolved_idleanim_45.png", "/sprites/units/unit_support_evolved_idleanim_46.png", "/sprites/units/unit_support_evolved_idleanim_47.png", "/sprites/units/unit_support_evolved_idleanim_48.png", "/sprites/units/unit_support_evolved_idleanim_49.png", "/sprites/units/unit_support_evolved_idleanim_50.png", "/sprites/units/unit_support_evolved_idleanim_51.png", "/sprites/units/unit_support_evolved_idleanim_52.png", "/sprites/units/unit_support_evolved_idleanim_53.png", "/sprites/units/unit_support_evolved_idleanim_54.png", "/sprites/units/unit_support_evolved_idleanim_55.png", "/sprites/units/unit_support_evolved_idleanim_56.png", "/sprites/units/unit_support_evolved_idleanim_57.png", "/sprites/units/unit_support_evolved_idleanim_58.png", "/sprites/units/unit_support_evolved_idleanim_59.png", "/sprites/units/unit_support_evolved_idleanim_60.png", "/sprites/units/unit_support_evolved_idleanim_61.png", "/sprites/units/unit_support_evolved_idleanim_62.png", "/sprites/units/unit_support_evolved_idleanim_63.png", "/sprites/units/unit_support_evolved_idleanim_64.png", "/sprites/units/unit_support_evolved_idleanim_65.png", "/sprites/units/unit_support_evolved_idleanim_66.png", "/sprites/units/unit_support_evolved_idleanim_67.png", "/sprites/units/unit_support_evolved_idleanim_68.png", "/sprites/units/unit_support_evolved_idleanim_69.png", "/sprites/units/unit_support_evolved_idleanim_70.png", "/sprites/units/unit_support_evolved_idleanim_71.png", "/sprites/units/unit_support_evolved_idleanim_72.png", "/sprites/units/unit_support_evolved_idleanim_73.png", "/sprites/units/unit_support_evolved_idleanim_74.png", "/sprites/units/unit_support_evolved_idleanim_75.png", "/sprites/units/unit_support_evolved_idleanim_76.png", "/sprites/units/unit_support_evolved_idleanim_77.png", "/sprites/units/unit_support_evolved_idleanim_78.png", "/sprites/units/unit_support_evolved_idleanim_79.png", "/sprites/units/unit_support_evolved_idleanim_80.png", "/sprites/units/unit_support_evolved_idleanim_81.png", "/sprites/units/unit_support_evolved_idleanim_82.png", "/sprites/units/unit_support_evolved_idleanim_83.png", "/sprites/units/unit_support_evolved_idleanim_84.png", "/sprites/units/unit_support_evolved_idleanim_85.png", "/sprites/units/unit_support_evolved_idleanim_86.png", "/sprites/units/unit_support_evolved_idleanim_87.png", "/sprites/units/unit_support_evolved_idleanim_88.png", "/sprites/units/unit_support_evolved_idleanim_89.png", "/sprites/units/unit_support_evolved_idleanim_90.png", "/sprites/units/unit_support_evolved_idleanim_91.png", "/sprites/units/unit_support_evolved_idleanim_92.png", "/sprites/units/unit_support_evolved_idleanim_93.png", "/sprites/units/unit_support_evolved_idleanim_94.png", "/sprites/units/unit_support_evolved_idleanim_95.png"], run: ["/sprites/units/unit_support_evolved_run_0.png", "/sprites/units/unit_support_evolved_run_1.png", "/sprites/units/unit_support_evolved_run_2.png", "/sprites/units/unit_support_evolved_run_3.png", "/sprites/units/unit_support_evolved_run_4.png", "/sprites/units/unit_support_evolved_run_5.png", "/sprites/units/unit_support_evolved_run_6.png", "/sprites/units/unit_support_evolved_run_7.png", "/sprites/units/unit_support_evolved_run_8.png", "/sprites/units/unit_support_evolved_run_9.png", "/sprites/units/unit_support_evolved_run_10.png", "/sprites/units/unit_support_evolved_run_11.png", "/sprites/units/unit_support_evolved_run_12.png", "/sprites/units/unit_support_evolved_run_13.png", "/sprites/units/unit_support_evolved_run_14.png", "/sprites/units/unit_support_evolved_run_15.png", "/sprites/units/unit_support_evolved_run_16.png", "/sprites/units/unit_support_evolved_run_17.png"] } },
  },
  titan: {
    id: 'titan',
    displayName: 'Titan Cat',
    abilityLabel: 'Titan',
    characterName: 'Temujin', // 巨神ネコ／ネコダラボッチ／ネコジャラミ (Titan Cat / Mythical Titan Cat / Jamiera Cat)
    role: 'titan',
    unlockRequirement: { stageId: 'stage43' }, // real: "第1章の最終盤で解放" — placed in the last stretch
    cost: 1300,
    hp: 1000,
    damage: 280,
    attackSpeed: 12.5, // dps ~125.6 — interval 2233ms (67F), split 600/1633 below (real 18F/49F)
    foreswingMs: 600,
    backswingMs: 1633,
    moveSpeed: 44, // real spd 8 — 0.8x Cat's
    radius: 30,
    range: 30,
    rechargeMs: 27333, // real 820F — the slowest recharge in the roster
    knockbackCount: 1, // real kb 1 — doesn't stagger until it's actually defeated
    knockbackDistance: 6,
    knockbackType: 'normal',
    color: 0x338833,
    label: 'Ti',
    special: { type: 'aoe', radius: 60 },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/units/unit_titan_idle.png", attack: "/sprites/units/unit_titan_attack.png", hit: "/sprites/units/unit_titan_hit.png", run: ["/sprites/units/unit_titan_run_0.png", "/sprites/units/unit_titan_run_1.png", "/sprites/units/unit_titan_run_2.png", "/sprites/units/unit_titan_run_3.png", "/sprites/units/unit_titan_run_4.png", "/sprites/units/unit_titan_run_5.png", "/sprites/units/unit_titan_run_6.png", "/sprites/units/unit_titan_run_7.png", "/sprites/units/unit_titan_run_8.png", "/sprites/units/unit_titan_run_9.png", "/sprites/units/unit_titan_run_10.png", "/sprites/units/unit_titan_run_11.png", "/sprites/units/unit_titan_run_12.png", "/sprites/units/unit_titan_run_13.png", "/sprites/units/unit_titan_run_14.png", "/sprites/units/unit_titan_run_15.png", "/sprites/units/unit_titan_run_16.png", "/sprites/units/unit_titan_run_17.png"], idleAnim: ["/sprites/units/unit_titan_idleanim_0.png", "/sprites/units/unit_titan_idleanim_1.png", "/sprites/units/unit_titan_idleanim_2.png", "/sprites/units/unit_titan_idleanim_3.png", "/sprites/units/unit_titan_idleanim_4.png", "/sprites/units/unit_titan_idleanim_5.png", "/sprites/units/unit_titan_idleanim_6.png", "/sprites/units/unit_titan_idleanim_7.png", "/sprites/units/unit_titan_idleanim_8.png", "/sprites/units/unit_titan_idleanim_9.png", "/sprites/units/unit_titan_idleanim_10.png", "/sprites/units/unit_titan_idleanim_11.png", "/sprites/units/unit_titan_idleanim_12.png", "/sprites/units/unit_titan_idleanim_13.png", "/sprites/units/unit_titan_idleanim_14.png", "/sprites/units/unit_titan_idleanim_15.png", "/sprites/units/unit_titan_idleanim_16.png", "/sprites/units/unit_titan_idleanim_17.png", "/sprites/units/unit_titan_idleanim_18.png", "/sprites/units/unit_titan_idleanim_19.png", "/sprites/units/unit_titan_idleanim_20.png", "/sprites/units/unit_titan_idleanim_21.png", "/sprites/units/unit_titan_idleanim_22.png", "/sprites/units/unit_titan_idleanim_23.png", "/sprites/units/unit_titan_idleanim_24.png", "/sprites/units/unit_titan_idleanim_25.png", "/sprites/units/unit_titan_idleanim_26.png", "/sprites/units/unit_titan_idleanim_27.png", "/sprites/units/unit_titan_idleanim_28.png", "/sprites/units/unit_titan_idleanim_29.png", "/sprites/units/unit_titan_idleanim_30.png", "/sprites/units/unit_titan_idleanim_31.png", "/sprites/units/unit_titan_idleanim_32.png", "/sprites/units/unit_titan_idleanim_33.png", "/sprites/units/unit_titan_idleanim_34.png", "/sprites/units/unit_titan_idleanim_35.png", "/sprites/units/unit_titan_idleanim_36.png", "/sprites/units/unit_titan_idleanim_37.png", "/sprites/units/unit_titan_idleanim_38.png", "/sprites/units/unit_titan_idleanim_39.png"] },
  },

  // --- Not part of the stage-clear unlock chain the other 9 lineages use
  // (see docs/BATTLE_CATS_MAPPING.md's roadmap section) — Xia/guardian
  // doesn't correspond to any real Battle Cats Basic-tier lineage; its
  // Barrier-tank identity belongs to a specific real Rare/Super-Rare-tier
  // cat instead. Given a mastery-gated unlock instead: clearing Tripp
  // (role 'basic', UNIT_CONFIG's `basic` entry) to its True Form is the
  // natural "prove you've mastered the original Basic Cat lineage" gate —
  // see PlayerProgress.js's isUnitUnlocked for how `unitEvolved` is checked.
  guardian: {
    id: 'guardian',
    displayName: 'Guardian',
    abilityLabel: 'Barrier Tank',
    characterName: 'Xia',
    role: 'guardian',
    unlockRequirement: { unitEvolved: 'basic' }, // Tripp reaches True Form (evolutionStage 2)
    cost: 250,
    hp: 120,
    damage: 3,
    attackSpeed: 0.8,
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
    statusOnHit: NO_STATUS,
    barrierMaxHp: 20,
    sprite: { idle: "/sprites/units/unit_guardian_idle.png", attack: "/sprites/units/unit_guardian_attack.png", hit: "/sprites/units/unit_guardian_hit.png", run: ["/sprites/units/unit_guardian_run_0.png", "/sprites/units/unit_guardian_run_1.png", "/sprites/units/unit_guardian_run_2.png", "/sprites/units/unit_guardian_run_3.png", "/sprites/units/unit_guardian_run_4.png", "/sprites/units/unit_guardian_run_5.png", "/sprites/units/unit_guardian_run_6.png", "/sprites/units/unit_guardian_run_7.png", "/sprites/units/unit_guardian_run_8.png", "/sprites/units/unit_guardian_run_9.png", "/sprites/units/unit_guardian_run_10.png", "/sprites/units/unit_guardian_run_11.png", "/sprites/units/unit_guardian_run_12.png", "/sprites/units/unit_guardian_run_13.png", "/sprites/units/unit_guardian_run_14.png", "/sprites/units/unit_guardian_run_15.png", "/sprites/units/unit_guardian_run_16.png", "/sprites/units/unit_guardian_run_17.png"], idleAnim: ["/sprites/units/unit_guardian_idleanim_0.png", "/sprites/units/unit_guardian_idleanim_1.png", "/sprites/units/unit_guardian_idleanim_2.png", "/sprites/units/unit_guardian_idleanim_3.png", "/sprites/units/unit_guardian_idleanim_4.png", "/sprites/units/unit_guardian_idleanim_5.png", "/sprites/units/unit_guardian_idleanim_6.png", "/sprites/units/unit_guardian_idleanim_7.png", "/sprites/units/unit_guardian_idleanim_8.png", "/sprites/units/unit_guardian_idleanim_9.png", "/sprites/units/unit_guardian_idleanim_10.png", "/sprites/units/unit_guardian_idleanim_11.png", "/sprites/units/unit_guardian_idleanim_12.png", "/sprites/units/unit_guardian_idleanim_13.png", "/sprites/units/unit_guardian_idleanim_14.png", "/sprites/units/unit_guardian_idleanim_15.png", "/sprites/units/unit_guardian_idleanim_16.png", "/sprites/units/unit_guardian_idleanim_17.png", "/sprites/units/unit_guardian_idleanim_18.png", "/sprites/units/unit_guardian_idleanim_19.png", "/sprites/units/unit_guardian_idleanim_20.png", "/sprites/units/unit_guardian_idleanim_21.png", "/sprites/units/unit_guardian_idleanim_22.png", "/sprites/units/unit_guardian_idleanim_23.png", "/sprites/units/unit_guardian_idleanim_24.png", "/sprites/units/unit_guardian_idleanim_25.png", "/sprites/units/unit_guardian_idleanim_26.png", "/sprites/units/unit_guardian_idleanim_27.png", "/sprites/units/unit_guardian_idleanim_28.png", "/sprites/units/unit_guardian_idleanim_29.png", "/sprites/units/unit_guardian_idleanim_30.png", "/sprites/units/unit_guardian_idleanim_31.png", "/sprites/units/unit_guardian_idleanim_32.png", "/sprites/units/unit_guardian_idleanim_33.png", "/sprites/units/unit_guardian_idleanim_34.png", "/sprites/units/unit_guardian_idleanim_35.png", "/sprites/units/unit_guardian_idleanim_36.png", "/sprites/units/unit_guardian_idleanim_37.png", "/sprites/units/unit_guardian_idleanim_38.png", "/sprites/units/unit_guardian_idleanim_39.png"], evolved: { idle: "/sprites/units/unit_guardian_evolved_idle.png", attack: "/sprites/units/unit_guardian_evolved_attack.png", hit: "/sprites/units/unit_guardian_evolved_hit.png", idleAnim: ["/sprites/units/unit_guardian_evolved_idleanim_0.png", "/sprites/units/unit_guardian_evolved_idleanim_1.png", "/sprites/units/unit_guardian_evolved_idleanim_2.png", "/sprites/units/unit_guardian_evolved_idleanim_3.png", "/sprites/units/unit_guardian_evolved_idleanim_4.png", "/sprites/units/unit_guardian_evolved_idleanim_5.png", "/sprites/units/unit_guardian_evolved_idleanim_6.png", "/sprites/units/unit_guardian_evolved_idleanim_7.png", "/sprites/units/unit_guardian_evolved_idleanim_8.png", "/sprites/units/unit_guardian_evolved_idleanim_9.png", "/sprites/units/unit_guardian_evolved_idleanim_10.png", "/sprites/units/unit_guardian_evolved_idleanim_11.png", "/sprites/units/unit_guardian_evolved_idleanim_12.png", "/sprites/units/unit_guardian_evolved_idleanim_13.png", "/sprites/units/unit_guardian_evolved_idleanim_14.png", "/sprites/units/unit_guardian_evolved_idleanim_15.png", "/sprites/units/unit_guardian_evolved_idleanim_16.png", "/sprites/units/unit_guardian_evolved_idleanim_17.png", "/sprites/units/unit_guardian_evolved_idleanim_18.png", "/sprites/units/unit_guardian_evolved_idleanim_19.png", "/sprites/units/unit_guardian_evolved_idleanim_20.png", "/sprites/units/unit_guardian_evolved_idleanim_21.png", "/sprites/units/unit_guardian_evolved_idleanim_22.png", "/sprites/units/unit_guardian_evolved_idleanim_23.png", "/sprites/units/unit_guardian_evolved_idleanim_24.png", "/sprites/units/unit_guardian_evolved_idleanim_25.png", "/sprites/units/unit_guardian_evolved_idleanim_26.png", "/sprites/units/unit_guardian_evolved_idleanim_27.png", "/sprites/units/unit_guardian_evolved_idleanim_28.png", "/sprites/units/unit_guardian_evolved_idleanim_29.png", "/sprites/units/unit_guardian_evolved_idleanim_30.png", "/sprites/units/unit_guardian_evolved_idleanim_31.png", "/sprites/units/unit_guardian_evolved_idleanim_32.png", "/sprites/units/unit_guardian_evolved_idleanim_33.png", "/sprites/units/unit_guardian_evolved_idleanim_34.png", "/sprites/units/unit_guardian_evolved_idleanim_35.png", "/sprites/units/unit_guardian_evolved_idleanim_36.png", "/sprites/units/unit_guardian_evolved_idleanim_37.png", "/sprites/units/unit_guardian_evolved_idleanim_38.png", "/sprites/units/unit_guardian_evolved_idleanim_39.png"], run: ["/sprites/units/unit_guardian_evolved_run_0.png", "/sprites/units/unit_guardian_evolved_run_1.png", "/sprites/units/unit_guardian_evolved_run_2.png", "/sprites/units/unit_guardian_evolved_run_3.png", "/sprites/units/unit_guardian_evolved_run_4.png", "/sprites/units/unit_guardian_evolved_run_5.png", "/sprites/units/unit_guardian_evolved_run_6.png", "/sprites/units/unit_guardian_evolved_run_7.png", "/sprites/units/unit_guardian_evolved_run_8.png", "/sprites/units/unit_guardian_evolved_run_9.png", "/sprites/units/unit_guardian_evolved_run_10.png", "/sprites/units/unit_guardian_evolved_run_11.png", "/sprites/units/unit_guardian_evolved_run_12.png", "/sprites/units/unit_guardian_evolved_run_13.png", "/sprites/units/unit_guardian_evolved_run_14.png", "/sprites/units/unit_guardian_evolved_run_15.png", "/sprites/units/unit_guardian_evolved_run_16.png", "/sprites/units/unit_guardian_evolved_run_17.png"] } },
  },

  // --- Round 2 unit collection: gacha-only units (UnitCollection.js),
  // real Origins Starter Axies the original roster didn't use. Rarity lives
  // in PROGRESSION_CONFIG and drives Gacha.js's pull odds.
  ena: {
    id: 'ena',
    displayName: 'Bubble Cat',
    abilityLabel: 'Ranged Slow',
    characterName: 'Ena',
    role: 'ena',
    unlockRequirement: { gacha: true },
    cost: 450,
    hp: 380,
    damage: 85,
    attackSpeed: 7.1,
    foreswingMs: 267,
    backswingMs: 3000,
    moveSpeed: 55,
    radius: 13,
    range: 38,
    rechargeMs: 10000,
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0x55ccee,
    label: 'En',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: { type: 'slow', chance: 0.3, durationMs: 3000, multiplier: 0.5 },
    strongVs: 'floating',
    sprite: { idle: "/sprites/units/unit_ena_idle.png", attack: "/sprites/units/unit_ena_attack.png", hit: "/sprites/units/unit_ena_hit.png", run: ["/sprites/units/unit_ena_run_0.png", "/sprites/units/unit_ena_run_1.png", "/sprites/units/unit_ena_run_2.png", "/sprites/units/unit_ena_run_3.png", "/sprites/units/unit_ena_run_4.png", "/sprites/units/unit_ena_run_5.png", "/sprites/units/unit_ena_run_6.png", "/sprites/units/unit_ena_run_7.png", "/sprites/units/unit_ena_run_8.png", "/sprites/units/unit_ena_run_9.png", "/sprites/units/unit_ena_run_10.png", "/sprites/units/unit_ena_run_11.png", "/sprites/units/unit_ena_run_12.png", "/sprites/units/unit_ena_run_13.png", "/sprites/units/unit_ena_run_14.png", "/sprites/units/unit_ena_run_15.png", "/sprites/units/unit_ena_run_16.png", "/sprites/units/unit_ena_run_17.png"], idleAnim: ["/sprites/units/unit_ena_idleanim_0.png", "/sprites/units/unit_ena_idleanim_1.png", "/sprites/units/unit_ena_idleanim_2.png", "/sprites/units/unit_ena_idleanim_3.png", "/sprites/units/unit_ena_idleanim_4.png", "/sprites/units/unit_ena_idleanim_5.png", "/sprites/units/unit_ena_idleanim_6.png", "/sprites/units/unit_ena_idleanim_7.png", "/sprites/units/unit_ena_idleanim_8.png", "/sprites/units/unit_ena_idleanim_9.png", "/sprites/units/unit_ena_idleanim_10.png", "/sprites/units/unit_ena_idleanim_11.png", "/sprites/units/unit_ena_idleanim_12.png", "/sprites/units/unit_ena_idleanim_13.png", "/sprites/units/unit_ena_idleanim_14.png", "/sprites/units/unit_ena_idleanim_15.png", "/sprites/units/unit_ena_idleanim_16.png", "/sprites/units/unit_ena_idleanim_17.png", "/sprites/units/unit_ena_idleanim_18.png", "/sprites/units/unit_ena_idleanim_19.png", "/sprites/units/unit_ena_idleanim_20.png", "/sprites/units/unit_ena_idleanim_21.png", "/sprites/units/unit_ena_idleanim_22.png", "/sprites/units/unit_ena_idleanim_23.png", "/sprites/units/unit_ena_idleanim_24.png", "/sprites/units/unit_ena_idleanim_25.png", "/sprites/units/unit_ena_idleanim_26.png", "/sprites/units/unit_ena_idleanim_27.png", "/sprites/units/unit_ena_idleanim_28.png", "/sprites/units/unit_ena_idleanim_29.png", "/sprites/units/unit_ena_idleanim_30.png", "/sprites/units/unit_ena_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_ena_evolved_idle.png", attack: "/sprites/units/unit_ena_evolved_attack.png", hit: "/sprites/units/unit_ena_evolved_hit.png", idleAnim: ["/sprites/units/unit_ena_evolved_idleanim_0.png", "/sprites/units/unit_ena_evolved_idleanim_1.png", "/sprites/units/unit_ena_evolved_idleanim_2.png", "/sprites/units/unit_ena_evolved_idleanim_3.png", "/sprites/units/unit_ena_evolved_idleanim_4.png", "/sprites/units/unit_ena_evolved_idleanim_5.png", "/sprites/units/unit_ena_evolved_idleanim_6.png", "/sprites/units/unit_ena_evolved_idleanim_7.png", "/sprites/units/unit_ena_evolved_idleanim_8.png", "/sprites/units/unit_ena_evolved_idleanim_9.png", "/sprites/units/unit_ena_evolved_idleanim_10.png", "/sprites/units/unit_ena_evolved_idleanim_11.png", "/sprites/units/unit_ena_evolved_idleanim_12.png", "/sprites/units/unit_ena_evolved_idleanim_13.png", "/sprites/units/unit_ena_evolved_idleanim_14.png", "/sprites/units/unit_ena_evolved_idleanim_15.png", "/sprites/units/unit_ena_evolved_idleanim_16.png", "/sprites/units/unit_ena_evolved_idleanim_17.png", "/sprites/units/unit_ena_evolved_idleanim_18.png", "/sprites/units/unit_ena_evolved_idleanim_19.png", "/sprites/units/unit_ena_evolved_idleanim_20.png", "/sprites/units/unit_ena_evolved_idleanim_21.png", "/sprites/units/unit_ena_evolved_idleanim_22.png", "/sprites/units/unit_ena_evolved_idleanim_23.png", "/sprites/units/unit_ena_evolved_idleanim_24.png", "/sprites/units/unit_ena_evolved_idleanim_25.png", "/sprites/units/unit_ena_evolved_idleanim_26.png", "/sprites/units/unit_ena_evolved_idleanim_27.png", "/sprites/units/unit_ena_evolved_idleanim_28.png", "/sprites/units/unit_ena_evolved_idleanim_29.png", "/sprites/units/unit_ena_evolved_idleanim_30.png", "/sprites/units/unit_ena_evolved_idleanim_31.png"], run: ["/sprites/units/unit_ena_evolved_run_0.png", "/sprites/units/unit_ena_evolved_run_1.png", "/sprites/units/unit_ena_evolved_run_2.png", "/sprites/units/unit_ena_evolved_run_3.png", "/sprites/units/unit_ena_evolved_run_4.png", "/sprites/units/unit_ena_evolved_run_5.png", "/sprites/units/unit_ena_evolved_run_6.png", "/sprites/units/unit_ena_evolved_run_7.png", "/sprites/units/unit_ena_evolved_run_8.png", "/sprites/units/unit_ena_evolved_run_9.png", "/sprites/units/unit_ena_evolved_run_10.png", "/sprites/units/unit_ena_evolved_run_11.png", "/sprites/units/unit_ena_evolved_run_12.png", "/sprites/units/unit_ena_evolved_run_13.png", "/sprites/units/unit_ena_evolved_run_14.png", "/sprites/units/unit_ena_evolved_run_15.png", "/sprites/units/unit_ena_evolved_run_16.png", "/sprites/units/unit_ena_evolved_run_17.png"] } },
  },
  venoki: {
    id: 'venoki',
    displayName: 'Venom Cat',
    abilityLabel: 'Melee Weaken',
    characterName: 'Venoki',
    role: 'venoki',
    unlockRequirement: { gacha: true },
    cost: 300,
    hp: 260,
    damage: 30,
    attackSpeed: 30,
    foreswingMs: 267,
    backswingMs: 700,
    moveSpeed: 62,
    radius: 12,
    range: 12,
    rechargeMs: 7000,
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xaa55dd,
    label: 'Ve',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: { type: 'weaken', chance: 0.25, durationMs: 3000, multiplier: 0.5 },
    sprite: { idle: "/sprites/units/unit_venoki_idle.png", attack: "/sprites/units/unit_venoki_attack.png", hit: "/sprites/units/unit_venoki_hit.png", run: ["/sprites/units/unit_venoki_run_0.png", "/sprites/units/unit_venoki_run_1.png", "/sprites/units/unit_venoki_run_2.png", "/sprites/units/unit_venoki_run_3.png", "/sprites/units/unit_venoki_run_4.png", "/sprites/units/unit_venoki_run_5.png", "/sprites/units/unit_venoki_run_6.png", "/sprites/units/unit_venoki_run_7.png", "/sprites/units/unit_venoki_run_8.png", "/sprites/units/unit_venoki_run_9.png", "/sprites/units/unit_venoki_run_10.png", "/sprites/units/unit_venoki_run_11.png", "/sprites/units/unit_venoki_run_12.png", "/sprites/units/unit_venoki_run_13.png", "/sprites/units/unit_venoki_run_14.png", "/sprites/units/unit_venoki_run_15.png", "/sprites/units/unit_venoki_run_16.png", "/sprites/units/unit_venoki_run_17.png"], idleAnim: ["/sprites/units/unit_venoki_idleanim_0.png", "/sprites/units/unit_venoki_idleanim_1.png", "/sprites/units/unit_venoki_idleanim_2.png", "/sprites/units/unit_venoki_idleanim_3.png", "/sprites/units/unit_venoki_idleanim_4.png", "/sprites/units/unit_venoki_idleanim_5.png", "/sprites/units/unit_venoki_idleanim_6.png", "/sprites/units/unit_venoki_idleanim_7.png", "/sprites/units/unit_venoki_idleanim_8.png", "/sprites/units/unit_venoki_idleanim_9.png", "/sprites/units/unit_venoki_idleanim_10.png", "/sprites/units/unit_venoki_idleanim_11.png", "/sprites/units/unit_venoki_idleanim_12.png", "/sprites/units/unit_venoki_idleanim_13.png", "/sprites/units/unit_venoki_idleanim_14.png", "/sprites/units/unit_venoki_idleanim_15.png", "/sprites/units/unit_venoki_idleanim_16.png", "/sprites/units/unit_venoki_idleanim_17.png", "/sprites/units/unit_venoki_idleanim_18.png", "/sprites/units/unit_venoki_idleanim_19.png", "/sprites/units/unit_venoki_idleanim_20.png", "/sprites/units/unit_venoki_idleanim_21.png", "/sprites/units/unit_venoki_idleanim_22.png", "/sprites/units/unit_venoki_idleanim_23.png", "/sprites/units/unit_venoki_idleanim_24.png", "/sprites/units/unit_venoki_idleanim_25.png", "/sprites/units/unit_venoki_idleanim_26.png", "/sprites/units/unit_venoki_idleanim_27.png", "/sprites/units/unit_venoki_idleanim_28.png", "/sprites/units/unit_venoki_idleanim_29.png", "/sprites/units/unit_venoki_idleanim_30.png", "/sprites/units/unit_venoki_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_venoki_evolved_idle.png", attack: "/sprites/units/unit_venoki_evolved_attack.png", hit: "/sprites/units/unit_venoki_evolved_hit.png", idleAnim: ["/sprites/units/unit_venoki_evolved_idleanim_0.png", "/sprites/units/unit_venoki_evolved_idleanim_1.png", "/sprites/units/unit_venoki_evolved_idleanim_2.png", "/sprites/units/unit_venoki_evolved_idleanim_3.png", "/sprites/units/unit_venoki_evolved_idleanim_4.png", "/sprites/units/unit_venoki_evolved_idleanim_5.png", "/sprites/units/unit_venoki_evolved_idleanim_6.png", "/sprites/units/unit_venoki_evolved_idleanim_7.png", "/sprites/units/unit_venoki_evolved_idleanim_8.png", "/sprites/units/unit_venoki_evolved_idleanim_9.png", "/sprites/units/unit_venoki_evolved_idleanim_10.png", "/sprites/units/unit_venoki_evolved_idleanim_11.png", "/sprites/units/unit_venoki_evolved_idleanim_12.png", "/sprites/units/unit_venoki_evolved_idleanim_13.png", "/sprites/units/unit_venoki_evolved_idleanim_14.png", "/sprites/units/unit_venoki_evolved_idleanim_15.png", "/sprites/units/unit_venoki_evolved_idleanim_16.png", "/sprites/units/unit_venoki_evolved_idleanim_17.png", "/sprites/units/unit_venoki_evolved_idleanim_18.png", "/sprites/units/unit_venoki_evolved_idleanim_19.png", "/sprites/units/unit_venoki_evolved_idleanim_20.png", "/sprites/units/unit_venoki_evolved_idleanim_21.png", "/sprites/units/unit_venoki_evolved_idleanim_22.png", "/sprites/units/unit_venoki_evolved_idleanim_23.png", "/sprites/units/unit_venoki_evolved_idleanim_24.png", "/sprites/units/unit_venoki_evolved_idleanim_25.png", "/sprites/units/unit_venoki_evolved_idleanim_26.png", "/sprites/units/unit_venoki_evolved_idleanim_27.png", "/sprites/units/unit_venoki_evolved_idleanim_28.png", "/sprites/units/unit_venoki_evolved_idleanim_29.png", "/sprites/units/unit_venoki_evolved_idleanim_30.png", "/sprites/units/unit_venoki_evolved_idleanim_31.png"], run: ["/sprites/units/unit_venoki_evolved_run_0.png", "/sprites/units/unit_venoki_evolved_run_1.png", "/sprites/units/unit_venoki_evolved_run_2.png", "/sprites/units/unit_venoki_evolved_run_3.png", "/sprites/units/unit_venoki_evolved_run_4.png", "/sprites/units/unit_venoki_evolved_run_5.png", "/sprites/units/unit_venoki_evolved_run_6.png", "/sprites/units/unit_venoki_evolved_run_7.png", "/sprites/units/unit_venoki_evolved_run_8.png", "/sprites/units/unit_venoki_evolved_run_9.png", "/sprites/units/unit_venoki_evolved_run_10.png", "/sprites/units/unit_venoki_evolved_run_11.png", "/sprites/units/unit_venoki_evolved_run_12.png", "/sprites/units/unit_venoki_evolved_run_13.png", "/sprites/units/unit_venoki_evolved_run_14.png", "/sprites/units/unit_venoki_evolved_run_15.png", "/sprites/units/unit_venoki_evolved_run_16.png", "/sprites/units/unit_venoki_evolved_run_17.png"] } },
  },
  pomodoro: {
    id: 'pomodoro',
    displayName: 'Tomato Wall',
    abilityLabel: 'Red Wall',
    characterName: 'Pomodoro',
    role: 'pomodoro',
    unlockRequirement: { gacha: true },
    cost: 150,
    hp: 650,
    damage: 3,
    attackSpeed: 2.4,
    foreswingMs: 267,
    backswingMs: 1966,
    moveSpeed: 44,
    radius: 26,
    range: 26,
    rechargeMs: 8000,
    knockbackCount: 1,
    knockbackDistance: 8,
    knockbackType: 'normal',
    color: 0xcc3344,
    label: 'Po',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    resistantVs: 'red',
    sprite: { idle: "/sprites/units/unit_pomodoro_idle.png", attack: "/sprites/units/unit_pomodoro_attack.png", hit: "/sprites/units/unit_pomodoro_hit.png", run: ["/sprites/units/unit_pomodoro_run_0.png", "/sprites/units/unit_pomodoro_run_1.png", "/sprites/units/unit_pomodoro_run_2.png", "/sprites/units/unit_pomodoro_run_3.png", "/sprites/units/unit_pomodoro_run_4.png", "/sprites/units/unit_pomodoro_run_5.png", "/sprites/units/unit_pomodoro_run_6.png", "/sprites/units/unit_pomodoro_run_7.png", "/sprites/units/unit_pomodoro_run_8.png", "/sprites/units/unit_pomodoro_run_9.png", "/sprites/units/unit_pomodoro_run_10.png", "/sprites/units/unit_pomodoro_run_11.png", "/sprites/units/unit_pomodoro_run_12.png", "/sprites/units/unit_pomodoro_run_13.png", "/sprites/units/unit_pomodoro_run_14.png", "/sprites/units/unit_pomodoro_run_15.png", "/sprites/units/unit_pomodoro_run_16.png", "/sprites/units/unit_pomodoro_run_17.png"], idleAnim: ["/sprites/units/unit_pomodoro_idleanim_0.png", "/sprites/units/unit_pomodoro_idleanim_1.png", "/sprites/units/unit_pomodoro_idleanim_2.png", "/sprites/units/unit_pomodoro_idleanim_3.png", "/sprites/units/unit_pomodoro_idleanim_4.png", "/sprites/units/unit_pomodoro_idleanim_5.png", "/sprites/units/unit_pomodoro_idleanim_6.png", "/sprites/units/unit_pomodoro_idleanim_7.png", "/sprites/units/unit_pomodoro_idleanim_8.png", "/sprites/units/unit_pomodoro_idleanim_9.png", "/sprites/units/unit_pomodoro_idleanim_10.png", "/sprites/units/unit_pomodoro_idleanim_11.png", "/sprites/units/unit_pomodoro_idleanim_12.png", "/sprites/units/unit_pomodoro_idleanim_13.png", "/sprites/units/unit_pomodoro_idleanim_14.png", "/sprites/units/unit_pomodoro_idleanim_15.png", "/sprites/units/unit_pomodoro_idleanim_16.png", "/sprites/units/unit_pomodoro_idleanim_17.png", "/sprites/units/unit_pomodoro_idleanim_18.png", "/sprites/units/unit_pomodoro_idleanim_19.png", "/sprites/units/unit_pomodoro_idleanim_20.png", "/sprites/units/unit_pomodoro_idleanim_21.png", "/sprites/units/unit_pomodoro_idleanim_22.png", "/sprites/units/unit_pomodoro_idleanim_23.png", "/sprites/units/unit_pomodoro_idleanim_24.png", "/sprites/units/unit_pomodoro_idleanim_25.png", "/sprites/units/unit_pomodoro_idleanim_26.png", "/sprites/units/unit_pomodoro_idleanim_27.png", "/sprites/units/unit_pomodoro_idleanim_28.png", "/sprites/units/unit_pomodoro_idleanim_29.png", "/sprites/units/unit_pomodoro_idleanim_30.png", "/sprites/units/unit_pomodoro_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_pomodoro_evolved_idle.png", attack: "/sprites/units/unit_pomodoro_evolved_attack.png", hit: "/sprites/units/unit_pomodoro_evolved_hit.png", idleAnim: ["/sprites/units/unit_pomodoro_evolved_idleanim_0.png", "/sprites/units/unit_pomodoro_evolved_idleanim_1.png", "/sprites/units/unit_pomodoro_evolved_idleanim_2.png", "/sprites/units/unit_pomodoro_evolved_idleanim_3.png", "/sprites/units/unit_pomodoro_evolved_idleanim_4.png", "/sprites/units/unit_pomodoro_evolved_idleanim_5.png", "/sprites/units/unit_pomodoro_evolved_idleanim_6.png", "/sprites/units/unit_pomodoro_evolved_idleanim_7.png", "/sprites/units/unit_pomodoro_evolved_idleanim_8.png", "/sprites/units/unit_pomodoro_evolved_idleanim_9.png", "/sprites/units/unit_pomodoro_evolved_idleanim_10.png", "/sprites/units/unit_pomodoro_evolved_idleanim_11.png", "/sprites/units/unit_pomodoro_evolved_idleanim_12.png", "/sprites/units/unit_pomodoro_evolved_idleanim_13.png", "/sprites/units/unit_pomodoro_evolved_idleanim_14.png", "/sprites/units/unit_pomodoro_evolved_idleanim_15.png", "/sprites/units/unit_pomodoro_evolved_idleanim_16.png", "/sprites/units/unit_pomodoro_evolved_idleanim_17.png", "/sprites/units/unit_pomodoro_evolved_idleanim_18.png", "/sprites/units/unit_pomodoro_evolved_idleanim_19.png", "/sprites/units/unit_pomodoro_evolved_idleanim_20.png", "/sprites/units/unit_pomodoro_evolved_idleanim_21.png", "/sprites/units/unit_pomodoro_evolved_idleanim_22.png", "/sprites/units/unit_pomodoro_evolved_idleanim_23.png", "/sprites/units/unit_pomodoro_evolved_idleanim_24.png", "/sprites/units/unit_pomodoro_evolved_idleanim_25.png", "/sprites/units/unit_pomodoro_evolved_idleanim_26.png", "/sprites/units/unit_pomodoro_evolved_idleanim_27.png", "/sprites/units/unit_pomodoro_evolved_idleanim_28.png", "/sprites/units/unit_pomodoro_evolved_idleanim_29.png", "/sprites/units/unit_pomodoro_evolved_idleanim_30.png", "/sprites/units/unit_pomodoro_evolved_idleanim_31.png"], run: ["/sprites/units/unit_pomodoro_evolved_run_0.png", "/sprites/units/unit_pomodoro_evolved_run_1.png", "/sprites/units/unit_pomodoro_evolved_run_2.png", "/sprites/units/unit_pomodoro_evolved_run_3.png", "/sprites/units/unit_pomodoro_evolved_run_4.png", "/sprites/units/unit_pomodoro_evolved_run_5.png", "/sprites/units/unit_pomodoro_evolved_run_6.png", "/sprites/units/unit_pomodoro_evolved_run_7.png", "/sprites/units/unit_pomodoro_evolved_run_8.png", "/sprites/units/unit_pomodoro_evolved_run_9.png", "/sprites/units/unit_pomodoro_evolved_run_10.png", "/sprites/units/unit_pomodoro_evolved_run_11.png", "/sprites/units/unit_pomodoro_evolved_run_12.png", "/sprites/units/unit_pomodoro_evolved_run_13.png", "/sprites/units/unit_pomodoro_evolved_run_14.png", "/sprites/units/unit_pomodoro_evolved_run_15.png", "/sprites/units/unit_pomodoro_evolved_run_16.png", "/sprites/units/unit_pomodoro_evolved_run_17.png"] } },
  },
  bing: {
    id: 'bing',
    displayName: 'Dash Cat',
    abilityLabel: 'Fast Crit',
    characterName: 'Bing',
    role: 'bing',
    unlockRequirement: { gacha: true },
    cost: 550,
    hp: 450,
    damage: 18,
    attackSpeed: 39,
    foreswingMs: 200,
    backswingMs: 133,
    moveSpeed: 170,
    radius: 12,
    range: 12,
    rechargeMs: 9000,
    knockbackCount: 5,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xeeddcc,
    label: 'Bi',
    special: { type: 'none' },
    statusOnHit: NO_STATUS,
    critChance: 0.1,
    sprite: { idle: "/sprites/units/unit_bing_idle.png", attack: "/sprites/units/unit_bing_attack.png", hit: "/sprites/units/unit_bing_hit.png", run: ["/sprites/units/unit_bing_run_0.png", "/sprites/units/unit_bing_run_1.png", "/sprites/units/unit_bing_run_2.png", "/sprites/units/unit_bing_run_3.png", "/sprites/units/unit_bing_run_4.png", "/sprites/units/unit_bing_run_5.png", "/sprites/units/unit_bing_run_6.png", "/sprites/units/unit_bing_run_7.png", "/sprites/units/unit_bing_run_8.png", "/sprites/units/unit_bing_run_9.png", "/sprites/units/unit_bing_run_10.png", "/sprites/units/unit_bing_run_11.png", "/sprites/units/unit_bing_run_12.png", "/sprites/units/unit_bing_run_13.png", "/sprites/units/unit_bing_run_14.png", "/sprites/units/unit_bing_run_15.png", "/sprites/units/unit_bing_run_16.png", "/sprites/units/unit_bing_run_17.png"], idleAnim: ["/sprites/units/unit_bing_idleanim_0.png", "/sprites/units/unit_bing_idleanim_1.png", "/sprites/units/unit_bing_idleanim_2.png", "/sprites/units/unit_bing_idleanim_3.png", "/sprites/units/unit_bing_idleanim_4.png", "/sprites/units/unit_bing_idleanim_5.png", "/sprites/units/unit_bing_idleanim_6.png", "/sprites/units/unit_bing_idleanim_7.png", "/sprites/units/unit_bing_idleanim_8.png", "/sprites/units/unit_bing_idleanim_9.png", "/sprites/units/unit_bing_idleanim_10.png", "/sprites/units/unit_bing_idleanim_11.png", "/sprites/units/unit_bing_idleanim_12.png", "/sprites/units/unit_bing_idleanim_13.png", "/sprites/units/unit_bing_idleanim_14.png", "/sprites/units/unit_bing_idleanim_15.png", "/sprites/units/unit_bing_idleanim_16.png", "/sprites/units/unit_bing_idleanim_17.png", "/sprites/units/unit_bing_idleanim_18.png", "/sprites/units/unit_bing_idleanim_19.png", "/sprites/units/unit_bing_idleanim_20.png", "/sprites/units/unit_bing_idleanim_21.png", "/sprites/units/unit_bing_idleanim_22.png", "/sprites/units/unit_bing_idleanim_23.png", "/sprites/units/unit_bing_idleanim_24.png", "/sprites/units/unit_bing_idleanim_25.png", "/sprites/units/unit_bing_idleanim_26.png", "/sprites/units/unit_bing_idleanim_27.png", "/sprites/units/unit_bing_idleanim_28.png", "/sprites/units/unit_bing_idleanim_29.png", "/sprites/units/unit_bing_idleanim_30.png", "/sprites/units/unit_bing_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_bing_evolved_idle.png", attack: "/sprites/units/unit_bing_evolved_attack.png", hit: "/sprites/units/unit_bing_evolved_hit.png", idleAnim: ["/sprites/units/unit_bing_evolved_idleanim_0.png", "/sprites/units/unit_bing_evolved_idleanim_1.png", "/sprites/units/unit_bing_evolved_idleanim_2.png", "/sprites/units/unit_bing_evolved_idleanim_3.png", "/sprites/units/unit_bing_evolved_idleanim_4.png", "/sprites/units/unit_bing_evolved_idleanim_5.png", "/sprites/units/unit_bing_evolved_idleanim_6.png", "/sprites/units/unit_bing_evolved_idleanim_7.png", "/sprites/units/unit_bing_evolved_idleanim_8.png", "/sprites/units/unit_bing_evolved_idleanim_9.png", "/sprites/units/unit_bing_evolved_idleanim_10.png", "/sprites/units/unit_bing_evolved_idleanim_11.png", "/sprites/units/unit_bing_evolved_idleanim_12.png", "/sprites/units/unit_bing_evolved_idleanim_13.png", "/sprites/units/unit_bing_evolved_idleanim_14.png", "/sprites/units/unit_bing_evolved_idleanim_15.png", "/sprites/units/unit_bing_evolved_idleanim_16.png", "/sprites/units/unit_bing_evolved_idleanim_17.png", "/sprites/units/unit_bing_evolved_idleanim_18.png", "/sprites/units/unit_bing_evolved_idleanim_19.png", "/sprites/units/unit_bing_evolved_idleanim_20.png", "/sprites/units/unit_bing_evolved_idleanim_21.png", "/sprites/units/unit_bing_evolved_idleanim_22.png", "/sprites/units/unit_bing_evolved_idleanim_23.png", "/sprites/units/unit_bing_evolved_idleanim_24.png", "/sprites/units/unit_bing_evolved_idleanim_25.png", "/sprites/units/unit_bing_evolved_idleanim_26.png", "/sprites/units/unit_bing_evolved_idleanim_27.png", "/sprites/units/unit_bing_evolved_idleanim_28.png", "/sprites/units/unit_bing_evolved_idleanim_29.png", "/sprites/units/unit_bing_evolved_idleanim_30.png", "/sprites/units/unit_bing_evolved_idleanim_31.png"], run: ["/sprites/units/unit_bing_evolved_run_0.png", "/sprites/units/unit_bing_evolved_run_1.png", "/sprites/units/unit_bing_evolved_run_2.png", "/sprites/units/unit_bing_evolved_run_3.png", "/sprites/units/unit_bing_evolved_run_4.png", "/sprites/units/unit_bing_evolved_run_5.png", "/sprites/units/unit_bing_evolved_run_6.png", "/sprites/units/unit_bing_evolved_run_7.png", "/sprites/units/unit_bing_evolved_run_8.png", "/sprites/units/unit_bing_evolved_run_9.png", "/sprites/units/unit_bing_evolved_run_10.png", "/sprites/units/unit_bing_evolved_run_11.png", "/sprites/units/unit_bing_evolved_run_12.png", "/sprites/units/unit_bing_evolved_run_13.png", "/sprites/units/unit_bing_evolved_run_14.png", "/sprites/units/unit_bing_evolved_run_15.png", "/sprites/units/unit_bing_evolved_run_16.png", "/sprites/units/unit_bing_evolved_run_17.png"] } },
  },
  rouge: {
    id: 'rouge',
    displayName: 'Ruby Cat',
    abilityLabel: 'Red Slayer',
    characterName: 'Rouge',
    role: 'rouge',
    unlockRequirement: { gacha: true },
    cost: 900,
    hp: 750,
    damage: 200,
    attackSpeed: 10.2,
    foreswingMs: 333,
    backswingMs: 1434,
    moveSpeed: 55,
    radius: 16,
    range: 18,
    rechargeMs: 14000,
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xff6688,
    label: 'Ro',
    special: { type: 'none' },
    statusOnHit: NO_STATUS,
    massiveVs: 'red',
    critChance: 0.05,
    sprite: { idle: "/sprites/units/unit_rouge_idle.png", attack: "/sprites/units/unit_rouge_attack.png", hit: "/sprites/units/unit_rouge_hit.png", run: ["/sprites/units/unit_rouge_run_0.png", "/sprites/units/unit_rouge_run_1.png", "/sprites/units/unit_rouge_run_2.png", "/sprites/units/unit_rouge_run_3.png", "/sprites/units/unit_rouge_run_4.png", "/sprites/units/unit_rouge_run_5.png", "/sprites/units/unit_rouge_run_6.png", "/sprites/units/unit_rouge_run_7.png", "/sprites/units/unit_rouge_run_8.png", "/sprites/units/unit_rouge_run_9.png", "/sprites/units/unit_rouge_run_10.png", "/sprites/units/unit_rouge_run_11.png", "/sprites/units/unit_rouge_run_12.png", "/sprites/units/unit_rouge_run_13.png", "/sprites/units/unit_rouge_run_14.png", "/sprites/units/unit_rouge_run_15.png", "/sprites/units/unit_rouge_run_16.png", "/sprites/units/unit_rouge_run_17.png"], idleAnim: ["/sprites/units/unit_rouge_idleanim_0.png", "/sprites/units/unit_rouge_idleanim_1.png", "/sprites/units/unit_rouge_idleanim_2.png", "/sprites/units/unit_rouge_idleanim_3.png", "/sprites/units/unit_rouge_idleanim_4.png", "/sprites/units/unit_rouge_idleanim_5.png", "/sprites/units/unit_rouge_idleanim_6.png", "/sprites/units/unit_rouge_idleanim_7.png", "/sprites/units/unit_rouge_idleanim_8.png", "/sprites/units/unit_rouge_idleanim_9.png", "/sprites/units/unit_rouge_idleanim_10.png", "/sprites/units/unit_rouge_idleanim_11.png", "/sprites/units/unit_rouge_idleanim_12.png", "/sprites/units/unit_rouge_idleanim_13.png", "/sprites/units/unit_rouge_idleanim_14.png", "/sprites/units/unit_rouge_idleanim_15.png", "/sprites/units/unit_rouge_idleanim_16.png", "/sprites/units/unit_rouge_idleanim_17.png", "/sprites/units/unit_rouge_idleanim_18.png", "/sprites/units/unit_rouge_idleanim_19.png", "/sprites/units/unit_rouge_idleanim_20.png", "/sprites/units/unit_rouge_idleanim_21.png", "/sprites/units/unit_rouge_idleanim_22.png", "/sprites/units/unit_rouge_idleanim_23.png", "/sprites/units/unit_rouge_idleanim_24.png", "/sprites/units/unit_rouge_idleanim_25.png", "/sprites/units/unit_rouge_idleanim_26.png", "/sprites/units/unit_rouge_idleanim_27.png", "/sprites/units/unit_rouge_idleanim_28.png", "/sprites/units/unit_rouge_idleanim_29.png", "/sprites/units/unit_rouge_idleanim_30.png", "/sprites/units/unit_rouge_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_rouge_evolved_idle.png", attack: "/sprites/units/unit_rouge_evolved_attack.png", hit: "/sprites/units/unit_rouge_evolved_hit.png", idleAnim: ["/sprites/units/unit_rouge_evolved_idleanim_0.png", "/sprites/units/unit_rouge_evolved_idleanim_1.png", "/sprites/units/unit_rouge_evolved_idleanim_2.png", "/sprites/units/unit_rouge_evolved_idleanim_3.png", "/sprites/units/unit_rouge_evolved_idleanim_4.png", "/sprites/units/unit_rouge_evolved_idleanim_5.png", "/sprites/units/unit_rouge_evolved_idleanim_6.png", "/sprites/units/unit_rouge_evolved_idleanim_7.png", "/sprites/units/unit_rouge_evolved_idleanim_8.png", "/sprites/units/unit_rouge_evolved_idleanim_9.png", "/sprites/units/unit_rouge_evolved_idleanim_10.png", "/sprites/units/unit_rouge_evolved_idleanim_11.png", "/sprites/units/unit_rouge_evolved_idleanim_12.png", "/sprites/units/unit_rouge_evolved_idleanim_13.png", "/sprites/units/unit_rouge_evolved_idleanim_14.png", "/sprites/units/unit_rouge_evolved_idleanim_15.png", "/sprites/units/unit_rouge_evolved_idleanim_16.png", "/sprites/units/unit_rouge_evolved_idleanim_17.png", "/sprites/units/unit_rouge_evolved_idleanim_18.png", "/sprites/units/unit_rouge_evolved_idleanim_19.png", "/sprites/units/unit_rouge_evolved_idleanim_20.png", "/sprites/units/unit_rouge_evolved_idleanim_21.png", "/sprites/units/unit_rouge_evolved_idleanim_22.png", "/sprites/units/unit_rouge_evolved_idleanim_23.png", "/sprites/units/unit_rouge_evolved_idleanim_24.png", "/sprites/units/unit_rouge_evolved_idleanim_25.png", "/sprites/units/unit_rouge_evolved_idleanim_26.png", "/sprites/units/unit_rouge_evolved_idleanim_27.png", "/sprites/units/unit_rouge_evolved_idleanim_28.png", "/sprites/units/unit_rouge_evolved_idleanim_29.png", "/sprites/units/unit_rouge_evolved_idleanim_30.png", "/sprites/units/unit_rouge_evolved_idleanim_31.png"], run: ["/sprites/units/unit_rouge_evolved_run_0.png", "/sprites/units/unit_rouge_evolved_run_1.png", "/sprites/units/unit_rouge_evolved_run_2.png", "/sprites/units/unit_rouge_evolved_run_3.png", "/sprites/units/unit_rouge_evolved_run_4.png", "/sprites/units/unit_rouge_evolved_run_5.png", "/sprites/units/unit_rouge_evolved_run_6.png", "/sprites/units/unit_rouge_evolved_run_7.png", "/sprites/units/unit_rouge_evolved_run_8.png", "/sprites/units/unit_rouge_evolved_run_9.png", "/sprites/units/unit_rouge_evolved_run_10.png", "/sprites/units/unit_rouge_evolved_run_11.png", "/sprites/units/unit_rouge_evolved_run_12.png", "/sprites/units/unit_rouge_evolved_run_13.png", "/sprites/units/unit_rouge_evolved_run_14.png", "/sprites/units/unit_rouge_evolved_run_15.png", "/sprites/units/unit_rouge_evolved_run_16.png", "/sprites/units/unit_rouge_evolved_run_17.png"] } },
  },
  machito: {
    id: 'machito',
    displayName: 'Brawler Cat',
    abilityLabel: 'Shockwave',
    characterName: 'Machito',
    role: 'machito',
    unlockRequirement: { gacha: true },
    cost: 1100,
    hp: 900,
    damage: 160,
    attackSpeed: 12,
    foreswingMs: 400,
    backswingMs: 1500,
    moveSpeed: 50,
    radius: 18,
    range: 18,
    rechargeMs: 16000,
    knockbackCount: 4,
    knockbackDistance: 14,
    knockbackType: 'normal',
    color: 0x7755ee,
    label: 'Ma',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    waveOnHit: { radius: 120 },
    sprite: { idle: "/sprites/units/unit_machito_idle.png", attack: "/sprites/units/unit_machito_attack.png", hit: "/sprites/units/unit_machito_hit.png", run: ["/sprites/units/unit_machito_run_0.png", "/sprites/units/unit_machito_run_1.png", "/sprites/units/unit_machito_run_2.png", "/sprites/units/unit_machito_run_3.png", "/sprites/units/unit_machito_run_4.png", "/sprites/units/unit_machito_run_5.png", "/sprites/units/unit_machito_run_6.png", "/sprites/units/unit_machito_run_7.png", "/sprites/units/unit_machito_run_8.png", "/sprites/units/unit_machito_run_9.png", "/sprites/units/unit_machito_run_10.png", "/sprites/units/unit_machito_run_11.png", "/sprites/units/unit_machito_run_12.png", "/sprites/units/unit_machito_run_13.png", "/sprites/units/unit_machito_run_14.png", "/sprites/units/unit_machito_run_15.png", "/sprites/units/unit_machito_run_16.png", "/sprites/units/unit_machito_run_17.png"], idleAnim: ["/sprites/units/unit_machito_idleanim_0.png", "/sprites/units/unit_machito_idleanim_1.png", "/sprites/units/unit_machito_idleanim_2.png", "/sprites/units/unit_machito_idleanim_3.png", "/sprites/units/unit_machito_idleanim_4.png", "/sprites/units/unit_machito_idleanim_5.png", "/sprites/units/unit_machito_idleanim_6.png", "/sprites/units/unit_machito_idleanim_7.png", "/sprites/units/unit_machito_idleanim_8.png", "/sprites/units/unit_machito_idleanim_9.png", "/sprites/units/unit_machito_idleanim_10.png", "/sprites/units/unit_machito_idleanim_11.png", "/sprites/units/unit_machito_idleanim_12.png", "/sprites/units/unit_machito_idleanim_13.png", "/sprites/units/unit_machito_idleanim_14.png", "/sprites/units/unit_machito_idleanim_15.png", "/sprites/units/unit_machito_idleanim_16.png", "/sprites/units/unit_machito_idleanim_17.png", "/sprites/units/unit_machito_idleanim_18.png", "/sprites/units/unit_machito_idleanim_19.png", "/sprites/units/unit_machito_idleanim_20.png", "/sprites/units/unit_machito_idleanim_21.png", "/sprites/units/unit_machito_idleanim_22.png", "/sprites/units/unit_machito_idleanim_23.png", "/sprites/units/unit_machito_idleanim_24.png", "/sprites/units/unit_machito_idleanim_25.png", "/sprites/units/unit_machito_idleanim_26.png", "/sprites/units/unit_machito_idleanim_27.png", "/sprites/units/unit_machito_idleanim_28.png", "/sprites/units/unit_machito_idleanim_29.png", "/sprites/units/unit_machito_idleanim_30.png", "/sprites/units/unit_machito_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_machito_evolved_idle.png", attack: "/sprites/units/unit_machito_evolved_attack.png", hit: "/sprites/units/unit_machito_evolved_hit.png", idleAnim: ["/sprites/units/unit_machito_evolved_idleanim_0.png", "/sprites/units/unit_machito_evolved_idleanim_1.png", "/sprites/units/unit_machito_evolved_idleanim_2.png", "/sprites/units/unit_machito_evolved_idleanim_3.png", "/sprites/units/unit_machito_evolved_idleanim_4.png", "/sprites/units/unit_machito_evolved_idleanim_5.png", "/sprites/units/unit_machito_evolved_idleanim_6.png", "/sprites/units/unit_machito_evolved_idleanim_7.png", "/sprites/units/unit_machito_evolved_idleanim_8.png", "/sprites/units/unit_machito_evolved_idleanim_9.png", "/sprites/units/unit_machito_evolved_idleanim_10.png", "/sprites/units/unit_machito_evolved_idleanim_11.png", "/sprites/units/unit_machito_evolved_idleanim_12.png", "/sprites/units/unit_machito_evolved_idleanim_13.png", "/sprites/units/unit_machito_evolved_idleanim_14.png", "/sprites/units/unit_machito_evolved_idleanim_15.png", "/sprites/units/unit_machito_evolved_idleanim_16.png", "/sprites/units/unit_machito_evolved_idleanim_17.png", "/sprites/units/unit_machito_evolved_idleanim_18.png", "/sprites/units/unit_machito_evolved_idleanim_19.png", "/sprites/units/unit_machito_evolved_idleanim_20.png", "/sprites/units/unit_machito_evolved_idleanim_21.png", "/sprites/units/unit_machito_evolved_idleanim_22.png", "/sprites/units/unit_machito_evolved_idleanim_23.png", "/sprites/units/unit_machito_evolved_idleanim_24.png", "/sprites/units/unit_machito_evolved_idleanim_25.png", "/sprites/units/unit_machito_evolved_idleanim_26.png", "/sprites/units/unit_machito_evolved_idleanim_27.png", "/sprites/units/unit_machito_evolved_idleanim_28.png", "/sprites/units/unit_machito_evolved_idleanim_29.png", "/sprites/units/unit_machito_evolved_idleanim_30.png", "/sprites/units/unit_machito_evolved_idleanim_31.png"], run: ["/sprites/units/unit_machito_evolved_run_0.png", "/sprites/units/unit_machito_evolved_run_1.png", "/sprites/units/unit_machito_evolved_run_2.png", "/sprites/units/unit_machito_evolved_run_3.png", "/sprites/units/unit_machito_evolved_run_4.png", "/sprites/units/unit_machito_evolved_run_5.png", "/sprites/units/unit_machito_evolved_run_6.png", "/sprites/units/unit_machito_evolved_run_7.png", "/sprites/units/unit_machito_evolved_run_8.png", "/sprites/units/unit_machito_evolved_run_9.png", "/sprites/units/unit_machito_evolved_run_10.png", "/sprites/units/unit_machito_evolved_run_11.png", "/sprites/units/unit_machito_evolved_run_12.png", "/sprites/units/unit_machito_evolved_run_13.png", "/sprites/units/unit_machito_evolved_run_14.png", "/sprites/units/unit_machito_evolved_run_15.png", "/sprites/units/unit_machito_evolved_run_16.png", "/sprites/units/unit_machito_evolved_run_17.png"] } },
  },
  bard: {
    id: 'bard',
    displayName: 'Bard Cat',
    abilityLabel: 'Freeze Caster',
    characterName: 'Bard',
    role: 'bard',
    unlockRequirement: { gacha: true },
    cost: 1200,
    hp: 700,
    damage: 220,
    attackSpeed: 8.1,
    foreswingMs: 333,
    backswingMs: 3500,
    moveSpeed: 55,
    radius: 14,
    range: 42,
    rechargeMs: 18000,
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xcccc33,
    label: 'Ba',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: { type: 'stop', chance: 0.25, durationMs: 1500 },
    sprite: { idle: "/sprites/units/unit_bard_idle.png", attack: "/sprites/units/unit_bard_attack.png", hit: "/sprites/units/unit_bard_hit.png", run: ["/sprites/units/unit_bard_run_0.png", "/sprites/units/unit_bard_run_1.png", "/sprites/units/unit_bard_run_2.png", "/sprites/units/unit_bard_run_3.png", "/sprites/units/unit_bard_run_4.png", "/sprites/units/unit_bard_run_5.png", "/sprites/units/unit_bard_run_6.png", "/sprites/units/unit_bard_run_7.png", "/sprites/units/unit_bard_run_8.png", "/sprites/units/unit_bard_run_9.png", "/sprites/units/unit_bard_run_10.png", "/sprites/units/unit_bard_run_11.png", "/sprites/units/unit_bard_run_12.png", "/sprites/units/unit_bard_run_13.png", "/sprites/units/unit_bard_run_14.png", "/sprites/units/unit_bard_run_15.png", "/sprites/units/unit_bard_run_16.png", "/sprites/units/unit_bard_run_17.png"], idleAnim: ["/sprites/units/unit_bard_idleanim_0.png", "/sprites/units/unit_bard_idleanim_1.png", "/sprites/units/unit_bard_idleanim_2.png", "/sprites/units/unit_bard_idleanim_3.png", "/sprites/units/unit_bard_idleanim_4.png", "/sprites/units/unit_bard_idleanim_5.png", "/sprites/units/unit_bard_idleanim_6.png", "/sprites/units/unit_bard_idleanim_7.png", "/sprites/units/unit_bard_idleanim_8.png", "/sprites/units/unit_bard_idleanim_9.png", "/sprites/units/unit_bard_idleanim_10.png", "/sprites/units/unit_bard_idleanim_11.png", "/sprites/units/unit_bard_idleanim_12.png", "/sprites/units/unit_bard_idleanim_13.png", "/sprites/units/unit_bard_idleanim_14.png", "/sprites/units/unit_bard_idleanim_15.png", "/sprites/units/unit_bard_idleanim_16.png", "/sprites/units/unit_bard_idleanim_17.png", "/sprites/units/unit_bard_idleanim_18.png", "/sprites/units/unit_bard_idleanim_19.png", "/sprites/units/unit_bard_idleanim_20.png", "/sprites/units/unit_bard_idleanim_21.png", "/sprites/units/unit_bard_idleanim_22.png", "/sprites/units/unit_bard_idleanim_23.png", "/sprites/units/unit_bard_idleanim_24.png", "/sprites/units/unit_bard_idleanim_25.png", "/sprites/units/unit_bard_idleanim_26.png", "/sprites/units/unit_bard_idleanim_27.png", "/sprites/units/unit_bard_idleanim_28.png", "/sprites/units/unit_bard_idleanim_29.png", "/sprites/units/unit_bard_idleanim_30.png", "/sprites/units/unit_bard_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_bard_evolved_idle.png", attack: "/sprites/units/unit_bard_evolved_attack.png", hit: "/sprites/units/unit_bard_evolved_hit.png", idleAnim: ["/sprites/units/unit_bard_evolved_idleanim_0.png", "/sprites/units/unit_bard_evolved_idleanim_1.png", "/sprites/units/unit_bard_evolved_idleanim_2.png", "/sprites/units/unit_bard_evolved_idleanim_3.png", "/sprites/units/unit_bard_evolved_idleanim_4.png", "/sprites/units/unit_bard_evolved_idleanim_5.png", "/sprites/units/unit_bard_evolved_idleanim_6.png", "/sprites/units/unit_bard_evolved_idleanim_7.png", "/sprites/units/unit_bard_evolved_idleanim_8.png", "/sprites/units/unit_bard_evolved_idleanim_9.png", "/sprites/units/unit_bard_evolved_idleanim_10.png", "/sprites/units/unit_bard_evolved_idleanim_11.png", "/sprites/units/unit_bard_evolved_idleanim_12.png", "/sprites/units/unit_bard_evolved_idleanim_13.png", "/sprites/units/unit_bard_evolved_idleanim_14.png", "/sprites/units/unit_bard_evolved_idleanim_15.png", "/sprites/units/unit_bard_evolved_idleanim_16.png", "/sprites/units/unit_bard_evolved_idleanim_17.png", "/sprites/units/unit_bard_evolved_idleanim_18.png", "/sprites/units/unit_bard_evolved_idleanim_19.png", "/sprites/units/unit_bard_evolved_idleanim_20.png", "/sprites/units/unit_bard_evolved_idleanim_21.png", "/sprites/units/unit_bard_evolved_idleanim_22.png", "/sprites/units/unit_bard_evolved_idleanim_23.png", "/sprites/units/unit_bard_evolved_idleanim_24.png", "/sprites/units/unit_bard_evolved_idleanim_25.png", "/sprites/units/unit_bard_evolved_idleanim_26.png", "/sprites/units/unit_bard_evolved_idleanim_27.png", "/sprites/units/unit_bard_evolved_idleanim_28.png", "/sprites/units/unit_bard_evolved_idleanim_29.png", "/sprites/units/unit_bard_evolved_idleanim_30.png", "/sprites/units/unit_bard_evolved_idleanim_31.png"], run: ["/sprites/units/unit_bard_evolved_run_0.png", "/sprites/units/unit_bard_evolved_run_1.png", "/sprites/units/unit_bard_evolved_run_2.png", "/sprites/units/unit_bard_evolved_run_3.png", "/sprites/units/unit_bard_evolved_run_4.png", "/sprites/units/unit_bard_evolved_run_5.png", "/sprites/units/unit_bard_evolved_run_6.png", "/sprites/units/unit_bard_evolved_run_7.png", "/sprites/units/unit_bard_evolved_run_8.png", "/sprites/units/unit_bard_evolved_run_9.png", "/sprites/units/unit_bard_evolved_run_10.png", "/sprites/units/unit_bard_evolved_run_11.png", "/sprites/units/unit_bard_evolved_run_12.png", "/sprites/units/unit_bard_evolved_run_13.png", "/sprites/units/unit_bard_evolved_run_14.png", "/sprites/units/unit_bard_evolved_run_15.png", "/sprites/units/unit_bard_evolved_run_16.png", "/sprites/units/unit_bard_evolved_run_17.png"] } },
  },
  hope: {
    id: 'hope',
    displayName: 'Dawn Cat',
    abilityLabel: 'Uber Wave',
    characterName: 'Hope',
    role: 'hope',
    unlockRequirement: { gacha: true },
    cost: 2200,
    hp: 1600,
    damage: 420,
    attackSpeed: 12.5,
    foreswingMs: 500,
    backswingMs: 1500,
    moveSpeed: 50,
    radius: 26,
    range: 26,
    rechargeMs: 30000,
    knockbackCount: 2,
    knockbackDistance: 8,
    knockbackType: 'normal',
    color: 0xeecc99,
    label: 'Ho',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    waveOnHit: { radius: 160 },
    strongVs: 'zombie',
    sprite: { idle: "/sprites/units/unit_hope_idle.png", attack: "/sprites/units/unit_hope_attack.png", hit: "/sprites/units/unit_hope_hit.png", run: ["/sprites/units/unit_hope_run_0.png", "/sprites/units/unit_hope_run_1.png", "/sprites/units/unit_hope_run_2.png", "/sprites/units/unit_hope_run_3.png", "/sprites/units/unit_hope_run_4.png", "/sprites/units/unit_hope_run_5.png", "/sprites/units/unit_hope_run_6.png", "/sprites/units/unit_hope_run_7.png", "/sprites/units/unit_hope_run_8.png", "/sprites/units/unit_hope_run_9.png", "/sprites/units/unit_hope_run_10.png", "/sprites/units/unit_hope_run_11.png", "/sprites/units/unit_hope_run_12.png", "/sprites/units/unit_hope_run_13.png", "/sprites/units/unit_hope_run_14.png", "/sprites/units/unit_hope_run_15.png", "/sprites/units/unit_hope_run_16.png", "/sprites/units/unit_hope_run_17.png"], idleAnim: ["/sprites/units/unit_hope_idleanim_0.png", "/sprites/units/unit_hope_idleanim_1.png", "/sprites/units/unit_hope_idleanim_2.png", "/sprites/units/unit_hope_idleanim_3.png", "/sprites/units/unit_hope_idleanim_4.png", "/sprites/units/unit_hope_idleanim_5.png", "/sprites/units/unit_hope_idleanim_6.png", "/sprites/units/unit_hope_idleanim_7.png", "/sprites/units/unit_hope_idleanim_8.png", "/sprites/units/unit_hope_idleanim_9.png", "/sprites/units/unit_hope_idleanim_10.png", "/sprites/units/unit_hope_idleanim_11.png", "/sprites/units/unit_hope_idleanim_12.png", "/sprites/units/unit_hope_idleanim_13.png", "/sprites/units/unit_hope_idleanim_14.png", "/sprites/units/unit_hope_idleanim_15.png", "/sprites/units/unit_hope_idleanim_16.png", "/sprites/units/unit_hope_idleanim_17.png", "/sprites/units/unit_hope_idleanim_18.png", "/sprites/units/unit_hope_idleanim_19.png", "/sprites/units/unit_hope_idleanim_20.png", "/sprites/units/unit_hope_idleanim_21.png", "/sprites/units/unit_hope_idleanim_22.png", "/sprites/units/unit_hope_idleanim_23.png", "/sprites/units/unit_hope_idleanim_24.png", "/sprites/units/unit_hope_idleanim_25.png", "/sprites/units/unit_hope_idleanim_26.png", "/sprites/units/unit_hope_idleanim_27.png", "/sprites/units/unit_hope_idleanim_28.png", "/sprites/units/unit_hope_idleanim_29.png", "/sprites/units/unit_hope_idleanim_30.png", "/sprites/units/unit_hope_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_hope_evolved_idle.png", attack: "/sprites/units/unit_hope_evolved_attack.png", hit: "/sprites/units/unit_hope_evolved_hit.png", idleAnim: ["/sprites/units/unit_hope_evolved_idleanim_0.png", "/sprites/units/unit_hope_evolved_idleanim_1.png", "/sprites/units/unit_hope_evolved_idleanim_2.png", "/sprites/units/unit_hope_evolved_idleanim_3.png", "/sprites/units/unit_hope_evolved_idleanim_4.png", "/sprites/units/unit_hope_evolved_idleanim_5.png", "/sprites/units/unit_hope_evolved_idleanim_6.png", "/sprites/units/unit_hope_evolved_idleanim_7.png", "/sprites/units/unit_hope_evolved_idleanim_8.png", "/sprites/units/unit_hope_evolved_idleanim_9.png", "/sprites/units/unit_hope_evolved_idleanim_10.png", "/sprites/units/unit_hope_evolved_idleanim_11.png", "/sprites/units/unit_hope_evolved_idleanim_12.png", "/sprites/units/unit_hope_evolved_idleanim_13.png", "/sprites/units/unit_hope_evolved_idleanim_14.png", "/sprites/units/unit_hope_evolved_idleanim_15.png", "/sprites/units/unit_hope_evolved_idleanim_16.png", "/sprites/units/unit_hope_evolved_idleanim_17.png", "/sprites/units/unit_hope_evolved_idleanim_18.png", "/sprites/units/unit_hope_evolved_idleanim_19.png", "/sprites/units/unit_hope_evolved_idleanim_20.png", "/sprites/units/unit_hope_evolved_idleanim_21.png", "/sprites/units/unit_hope_evolved_idleanim_22.png", "/sprites/units/unit_hope_evolved_idleanim_23.png", "/sprites/units/unit_hope_evolved_idleanim_24.png", "/sprites/units/unit_hope_evolved_idleanim_25.png", "/sprites/units/unit_hope_evolved_idleanim_26.png", "/sprites/units/unit_hope_evolved_idleanim_27.png", "/sprites/units/unit_hope_evolved_idleanim_28.png", "/sprites/units/unit_hope_evolved_idleanim_29.png", "/sprites/units/unit_hope_evolved_idleanim_30.png", "/sprites/units/unit_hope_evolved_idleanim_31.png"], run: ["/sprites/units/unit_hope_evolved_run_0.png", "/sprites/units/unit_hope_evolved_run_1.png", "/sprites/units/unit_hope_evolved_run_2.png", "/sprites/units/unit_hope_evolved_run_3.png", "/sprites/units/unit_hope_evolved_run_4.png", "/sprites/units/unit_hope_evolved_run_5.png", "/sprites/units/unit_hope_evolved_run_6.png", "/sprites/units/unit_hope_evolved_run_7.png", "/sprites/units/unit_hope_evolved_run_8.png", "/sprites/units/unit_hope_evolved_run_9.png", "/sprites/units/unit_hope_evolved_run_10.png", "/sprites/units/unit_hope_evolved_run_11.png", "/sprites/units/unit_hope_evolved_run_12.png", "/sprites/units/unit_hope_evolved_run_13.png", "/sprites/units/unit_hope_evolved_run_14.png", "/sprites/units/unit_hope_evolved_run_15.png", "/sprites/units/unit_hope_evolved_run_16.png", "/sprites/units/unit_hope_evolved_run_17.png"] } },
  },
  shufen: {
    id: 'shufen',
    displayName: 'Lucky Cat',
    abilityLabel: 'Uber Surge',
    characterName: 'Shufen',
    role: 'shufen',
    unlockRequirement: { gacha: true },
    cost: 2400,
    hp: 1300,
    damage: 380,
    attackSpeed: 14,
    foreswingMs: 400,
    backswingMs: 1400,
    moveSpeed: 55,
    radius: 24,
    range: 30,
    rechargeMs: 32000,
    knockbackCount: 3,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0x55ddcc,
    label: 'Sh',
    special: { type: 'none' },
    statusOnHit: NO_STATUS,
    surgeOnHit: { chance: 0.35, delayMs: 400, radius: 70 },
    strongVs: 'floating',
    critChance: 0.05,
    sprite: { idle: "/sprites/units/unit_shufen_idle.png", attack: "/sprites/units/unit_shufen_attack.png", hit: "/sprites/units/unit_shufen_hit.png", run: ["/sprites/units/unit_shufen_run_0.png", "/sprites/units/unit_shufen_run_1.png", "/sprites/units/unit_shufen_run_2.png", "/sprites/units/unit_shufen_run_3.png", "/sprites/units/unit_shufen_run_4.png", "/sprites/units/unit_shufen_run_5.png", "/sprites/units/unit_shufen_run_6.png", "/sprites/units/unit_shufen_run_7.png", "/sprites/units/unit_shufen_run_8.png", "/sprites/units/unit_shufen_run_9.png", "/sprites/units/unit_shufen_run_10.png", "/sprites/units/unit_shufen_run_11.png", "/sprites/units/unit_shufen_run_12.png", "/sprites/units/unit_shufen_run_13.png", "/sprites/units/unit_shufen_run_14.png", "/sprites/units/unit_shufen_run_15.png", "/sprites/units/unit_shufen_run_16.png", "/sprites/units/unit_shufen_run_17.png"], idleAnim: ["/sprites/units/unit_shufen_idleanim_0.png", "/sprites/units/unit_shufen_idleanim_1.png", "/sprites/units/unit_shufen_idleanim_2.png", "/sprites/units/unit_shufen_idleanim_3.png", "/sprites/units/unit_shufen_idleanim_4.png", "/sprites/units/unit_shufen_idleanim_5.png", "/sprites/units/unit_shufen_idleanim_6.png", "/sprites/units/unit_shufen_idleanim_7.png", "/sprites/units/unit_shufen_idleanim_8.png", "/sprites/units/unit_shufen_idleanim_9.png", "/sprites/units/unit_shufen_idleanim_10.png", "/sprites/units/unit_shufen_idleanim_11.png", "/sprites/units/unit_shufen_idleanim_12.png", "/sprites/units/unit_shufen_idleanim_13.png", "/sprites/units/unit_shufen_idleanim_14.png", "/sprites/units/unit_shufen_idleanim_15.png", "/sprites/units/unit_shufen_idleanim_16.png", "/sprites/units/unit_shufen_idleanim_17.png", "/sprites/units/unit_shufen_idleanim_18.png", "/sprites/units/unit_shufen_idleanim_19.png", "/sprites/units/unit_shufen_idleanim_20.png", "/sprites/units/unit_shufen_idleanim_21.png", "/sprites/units/unit_shufen_idleanim_22.png", "/sprites/units/unit_shufen_idleanim_23.png", "/sprites/units/unit_shufen_idleanim_24.png", "/sprites/units/unit_shufen_idleanim_25.png", "/sprites/units/unit_shufen_idleanim_26.png", "/sprites/units/unit_shufen_idleanim_27.png", "/sprites/units/unit_shufen_idleanim_28.png", "/sprites/units/unit_shufen_idleanim_29.png", "/sprites/units/unit_shufen_idleanim_30.png", "/sprites/units/unit_shufen_idleanim_31.png"], evolved: { idle: "/sprites/units/unit_shufen_evolved_idle.png", attack: "/sprites/units/unit_shufen_evolved_attack.png", hit: "/sprites/units/unit_shufen_evolved_hit.png", idleAnim: ["/sprites/units/unit_shufen_evolved_idleanim_0.png", "/sprites/units/unit_shufen_evolved_idleanim_1.png", "/sprites/units/unit_shufen_evolved_idleanim_2.png", "/sprites/units/unit_shufen_evolved_idleanim_3.png", "/sprites/units/unit_shufen_evolved_idleanim_4.png", "/sprites/units/unit_shufen_evolved_idleanim_5.png", "/sprites/units/unit_shufen_evolved_idleanim_6.png", "/sprites/units/unit_shufen_evolved_idleanim_7.png", "/sprites/units/unit_shufen_evolved_idleanim_8.png", "/sprites/units/unit_shufen_evolved_idleanim_9.png", "/sprites/units/unit_shufen_evolved_idleanim_10.png", "/sprites/units/unit_shufen_evolved_idleanim_11.png", "/sprites/units/unit_shufen_evolved_idleanim_12.png", "/sprites/units/unit_shufen_evolved_idleanim_13.png", "/sprites/units/unit_shufen_evolved_idleanim_14.png", "/sprites/units/unit_shufen_evolved_idleanim_15.png", "/sprites/units/unit_shufen_evolved_idleanim_16.png", "/sprites/units/unit_shufen_evolved_idleanim_17.png", "/sprites/units/unit_shufen_evolved_idleanim_18.png", "/sprites/units/unit_shufen_evolved_idleanim_19.png", "/sprites/units/unit_shufen_evolved_idleanim_20.png", "/sprites/units/unit_shufen_evolved_idleanim_21.png", "/sprites/units/unit_shufen_evolved_idleanim_22.png", "/sprites/units/unit_shufen_evolved_idleanim_23.png", "/sprites/units/unit_shufen_evolved_idleanim_24.png", "/sprites/units/unit_shufen_evolved_idleanim_25.png", "/sprites/units/unit_shufen_evolved_idleanim_26.png", "/sprites/units/unit_shufen_evolved_idleanim_27.png", "/sprites/units/unit_shufen_evolved_idleanim_28.png", "/sprites/units/unit_shufen_evolved_idleanim_29.png", "/sprites/units/unit_shufen_evolved_idleanim_30.png", "/sprites/units/unit_shufen_evolved_idleanim_31.png"], run: ["/sprites/units/unit_shufen_evolved_run_0.png", "/sprites/units/unit_shufen_evolved_run_1.png", "/sprites/units/unit_shufen_evolved_run_2.png", "/sprites/units/unit_shufen_evolved_run_3.png", "/sprites/units/unit_shufen_evolved_run_4.png", "/sprites/units/unit_shufen_evolved_run_5.png", "/sprites/units/unit_shufen_evolved_run_6.png", "/sprites/units/unit_shufen_evolved_run_7.png", "/sprites/units/unit_shufen_evolved_run_8.png", "/sprites/units/unit_shufen_evolved_run_9.png", "/sprites/units/unit_shufen_evolved_run_10.png", "/sprites/units/unit_shufen_evolved_run_11.png", "/sprites/units/unit_shufen_evolved_run_12.png", "/sprites/units/unit_shufen_evolved_run_13.png", "/sprites/units/unit_shufen_evolved_run_14.png", "/sprites/units/unit_shufen_evolved_run_15.png", "/sprites/units/unit_shufen_evolved_run_16.png", "/sprites/units/unit_shufen_evolved_run_17.png"] } },
  },
};
