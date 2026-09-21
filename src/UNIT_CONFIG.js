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
    sprite: { idle: "/sprites/units/unit_basic_idle.png", attack: "/sprites/units/unit_basic_attack.png", hit: "/sprites/units/unit_basic_hit.png", run: ["/sprites/units/unit_basic_run_0.png", "/sprites/units/unit_basic_run_1.png"], idleAnim: ["/sprites/units/unit_basic_idleanim_0.png", "/sprites/units/unit_basic_idleanim_1.png"], evolved: { idle: "/sprites/units/unit_basic_evolved_idle.png", attack: "/sprites/units/unit_basic_evolved_attack.png", hit: "/sprites/units/unit_basic_evolved_hit.png", run: ["/sprites/units/unit_basic_evolved_run_0.png", "/sprites/units/unit_basic_evolved_run_1.png"] } },
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
    sprite: { idle: "/sprites/units/unit_tank_idle.png", attack: "/sprites/units/unit_tank_attack.png", hit: "/sprites/units/unit_tank_hit.png", run: ["/sprites/units/unit_tank_run_0.png", "/sprites/units/unit_tank_run_1.png"], idleAnim: ["/sprites/units/unit_tank_idleanim_0.png", "/sprites/units/unit_tank_idleanim_1.png"], evolved: { idle: "/sprites/units/unit_tank_evolved_idle.png", attack: "/sprites/units/unit_tank_evolved_attack.png", hit: "/sprites/units/unit_tank_evolved_hit.png", run: ["/sprites/units/unit_tank_evolved_run_0.png", "/sprites/units/unit_tank_evolved_run_1.png"] } },
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
    sprite: { idle: "/sprites/units/unit_swarm_idle.png", attack: "/sprites/units/unit_swarm_attack.png", hit: "/sprites/units/unit_swarm_hit.png", run: ["/sprites/units/unit_swarm_run_0.png", "/sprites/units/unit_swarm_run_1.png"], idleAnim: ["/sprites/units/unit_swarm_idleanim_0.png", "/sprites/units/unit_swarm_idleanim_1.png"], evolved: { idle: "/sprites/units/unit_swarm_evolved_idle.png", attack: "/sprites/units/unit_swarm_evolved_attack.png", hit: "/sprites/units/unit_swarm_evolved_hit.png", run: ["/sprites/units/unit_swarm_evolved_run_0.png", "/sprites/units/unit_swarm_evolved_run_1.png"] } },
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
    sprite: { idle: "/sprites/units/unit_ranged_idle.png", attack: "/sprites/units/unit_ranged_attack.png", hit: "/sprites/units/unit_ranged_hit.png", run: ["/sprites/units/unit_ranged_run_0.png", "/sprites/units/unit_ranged_run_1.png"], idleAnim: ["/sprites/units/unit_ranged_idleanim_0.png", "/sprites/units/unit_ranged_idleanim_1.png"], evolved: { idle: "/sprites/units/unit_ranged_evolved_idle.png", attack: "/sprites/units/unit_ranged_evolved_attack.png", hit: "/sprites/units/unit_ranged_evolved_hit.png", run: ["/sprites/units/unit_ranged_evolved_run_0.png", "/sprites/units/unit_ranged_evolved_run_1.png"] } },
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
    sprite: { idle: "/sprites/units/unit_fast_idle.png", attack: "/sprites/units/unit_fast_attack.png", hit: "/sprites/units/unit_fast_hit.png", run: ["/sprites/units/unit_fast_run_0.png", "/sprites/units/unit_fast_run_1.png"], idleAnim: ["/sprites/units/unit_fast_idleanim_0.png", "/sprites/units/unit_fast_idleanim_1.png"], evolved: { idle: "/sprites/units/unit_fast_evolved_idle.png", attack: "/sprites/units/unit_fast_evolved_attack.png", hit: "/sprites/units/unit_fast_evolved_hit.png", run: ["/sprites/units/unit_fast_evolved_run_0.png", "/sprites/units/unit_fast_evolved_run_1.png"] } },
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
    sprite: { idle: "/sprites/units/unit_aoe_idle.png", attack: "/sprites/units/unit_aoe_attack.png", hit: "/sprites/units/unit_aoe_hit.png", run: ["/sprites/units/unit_aoe_run_0.png", "/sprites/units/unit_aoe_run_1.png"], idleAnim: ["/sprites/units/unit_aoe_idleanim_0.png", "/sprites/units/unit_aoe_idleanim_1.png"], evolved: { idle: "/sprites/units/unit_aoe_evolved_idle.png", attack: "/sprites/units/unit_aoe_evolved_attack.png", hit: "/sprites/units/unit_aoe_evolved_hit.png", run: ["/sprites/units/unit_aoe_evolved_run_0.png", "/sprites/units/unit_aoe_evolved_run_1.png"] } },
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
    sprite: { idle: "/sprites/units/unit_sniper_idle.png", attack: "/sprites/units/unit_sniper_attack.png", hit: "/sprites/units/unit_sniper_hit.png", run: ["/sprites/units/unit_sniper_run_0.png", "/sprites/units/unit_sniper_run_1.png"], idleAnim: ["/sprites/units/unit_sniper_idleanim_0.png", "/sprites/units/unit_sniper_idleanim_1.png"], evolved: { idle: "/sprites/units/unit_sniper_evolved_idle.png", attack: "/sprites/units/unit_sniper_evolved_attack.png", hit: "/sprites/units/unit_sniper_evolved_hit.png", run: ["/sprites/units/unit_sniper_evolved_run_0.png", "/sprites/units/unit_sniper_evolved_run_1.png"] } },
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
    sprite: { idle: "/sprites/units/unit_support_idle.png", attack: "/sprites/units/unit_support_attack.png", hit: "/sprites/units/unit_support_hit.png", run: ["/sprites/units/unit_support_run_0.png", "/sprites/units/unit_support_run_1.png"], idleAnim: ["/sprites/units/unit_support_idleanim_0.png", "/sprites/units/unit_support_idleanim_1.png"], evolved: { idle: "/sprites/units/unit_support_evolved_idle.png", attack: "/sprites/units/unit_support_evolved_attack.png", hit: "/sprites/units/unit_support_evolved_hit.png", run: ["/sprites/units/unit_support_evolved_run_0.png", "/sprites/units/unit_support_evolved_run_1.png"] } },
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
    sprite: { idle: "/sprites/units/unit_titan_idle.png", attack: "/sprites/units/unit_titan_attack.png", hit: "/sprites/units/unit_titan_hit.png", run: ["/sprites/units/unit_titan_run_0.png", "/sprites/units/unit_titan_run_1.png"], idleAnim: ["/sprites/units/unit_titan_idleanim_0.png", "/sprites/units/unit_titan_idleanim_1.png"] },
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
    sprite: { idle: "/sprites/units/unit_guardian_idle.png", attack: "/sprites/units/unit_guardian_attack.png", hit: "/sprites/units/unit_guardian_hit.png", run: ["/sprites/units/unit_guardian_run_0.png", "/sprites/units/unit_guardian_run_1.png"], idleAnim: ["/sprites/units/unit_guardian_idleanim_0.png", "/sprites/units/unit_guardian_idleanim_1.png"], evolved: { idle: "/sprites/units/unit_guardian_evolved_idle.png", attack: "/sprites/units/unit_guardian_evolved_attack.png", hit: "/sprites/units/unit_guardian_evolved_hit.png", run: ["/sprites/units/unit_guardian_evolved_run_0.png", "/sprites/units/unit_guardian_evolved_run_1.png"] } },
  },
};
