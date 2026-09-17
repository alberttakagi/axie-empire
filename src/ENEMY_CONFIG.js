// Enemy roster — REBUILT to be 10 of the real early Empire of Cats enemies
// (guide Chapter 13, battlecats-db-sourced, "strength 100%" baseline values
// — STAGE_CONFIG's spawnScript statMultiplier scales these up/down per
// stage, exactly matching the guide's own convention). The other 14 enemies
// the guide lists (see docs/BATTLE_CATS_MAPPING.md's roadmap) aren't wired
// up yet — this pass covers a representative early-game slice, not the
// guide's full 24.
//
// Same TIME/MONEY conversion rules as UNIT_CONFIG.js (frame×1000/30 = ms;
// hp/damage/money used as literal real values — see that file's header for
// the full reasoning), and the same "spatial fields stay in this engine's
// own tuned pixel scale, adjusted only to preserve real RELATIVE
// proportions" approach for moveSpeed/radius/range. The guide's enemy table
// has no separate foreswing column (only total attack interval), so
// foreswingMs/backswingMs below still use this codebase's existing 35/65
// split of that real interval — a documented simplification, not a real
// per-enemy value.
//
// `attribute` (replaces the old `trait` field's combat role — see
// TRAIT_CONFIG.js) is the one real Battle Cats attribute this enemy
// carries, or omitted entirely for a plain "White"/no-attribute enemy.
// `characterName` stays the real PvE Chimera each enemy reskins (unchanged
// from the previous roster — only the STATS/NAMES/attribute below moved to
// real Battle Cats data; the existing Origins Asset Kit sprites are reused
// as-is per this pass's "reuse existing sprites" scope decision).
//
// See the previous revision of this file (git history) for the full,
// unabridged field-by-field reference comment (threat/foreswingMs/
// backswingMs/rechargeMs/knockbackCount etc.) — unchanged in shape here.

import { NO_STATUS } from './STATUS_CONFIG.js';

export const ENEMY_CONFIG = {
  basic: {
    id: 'basic',
    displayName: 'Doge',
    characterName: 'Slime', // わんこ (Doge) — the first enemy in the real game
    role: 'basic',
    threat: 2,
    hp: 90,
    damage: 8,
    attackSpeed: 5.1, // dps ~1.53 — interval 1567ms (47F), split 35/65 below (no real per-enemy foreswing data — see file header)
    foreswingMs: 548,
    backswingMs: 1019,
    moveSpeed: 30,
    radius: 16,
    range: 16,
    rechargeMs: 0, // unused on the enemy side, see file header
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xcc3333,
    label: 'D',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_basic_idle.png", attack: "/sprites/enemies/enemy_basic_attack.png", hit: "/sprites/enemies/enemy_basic_hit.png", run: ["/sprites/enemies/enemy_basic_run_0.png", "/sprites/enemies/enemy_basic_run_1.png"], idleAnim: ["/sprites/enemies/enemy_basic_idleanim_0.png", "/sprites/enemies/enemy_basic_idleanim_1.png"] },
  },
  fast: {
    id: 'fast',
    displayName: 'Snache',
    characterName: 'Gray Wolf', // にょろ (Snache)
    role: 'fast',
    threat: 4,
    hp: 100,
    damage: 15,
    attackSpeed: 12.2, // dps ~12.2 — interval 1233ms (37F), split 35/65 below
    foreswingMs: 431,
    backswingMs: 802,
    moveSpeed: 40,
    radius: 12,
    range: 16,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 18,
    knockbackType: 'normal',
    color: 0xff6666,
    label: 'S',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_fast_idle.png", attack: "/sprites/enemies/enemy_fast_attack.png", hit: "/sprites/enemies/enemy_fast_hit.png", run: ["/sprites/enemies/enemy_fast_run_0.png", "/sprites/enemies/enemy_fast_run_1.png"], idleAnim: ["/sprites/enemies/enemy_fast_idleanim_0.png", "/sprites/enemies/enemy_fast_idleanim_1.png"] },
  },
  tank: {
    id: 'tank',
    displayName: 'Hippoe',
    characterName: 'Treant', // カバちゃん (Hippoe) — real Battle Cats' own early "wall boss"
    role: 'tank',
    threat: 10,
    hp: 1000,
    damage: 100,
    attackSpeed: 4.5, // dps ~44.8 — interval 2233ms (67F), split 35/65 below
    foreswingMs: 781,
    backswingMs: 1452,
    moveSpeed: 27,
    radius: 26,
    range: 26,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 8,
    knockbackType: 'normal',
    color: 0x993333,
    label: 'H',
    special: { type: 'aoe', radius: 30 },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_tank_idle.png", attack: "/sprites/enemies/enemy_tank_attack.png", hit: "/sprites/enemies/enemy_tank_hit.png", run: ["/sprites/enemies/enemy_tank_run_0.png", "/sprites/enemies/enemy_tank_run_1.png"], idleAnim: ["/sprites/enemies/enemy_tank_idleanim_0.png", "/sprites/enemies/enemy_tank_idleanim_1.png"] },
  },
  ranged: {
    id: 'ranged',
    displayName: 'Paon',
    characterName: 'Aquatic Slime', // パオン (Paon) — real long-range artillery
    role: 'ranged',
    threat: 25,
    hp: 4000,
    damage: 654,
    attackSpeed: 1.6, // dps ~104.9 — interval 6233ms (187F), split 35/65 below
    foreswingMs: 2182,
    backswingMs: 4051,
    moveSpeed: 27,
    radius: 18,
    range: 58,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 14,
    knockbackType: 'normal',
    color: 0xff9966,
    label: 'P',
    special: { type: 'aoe', radius: 40 },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_ranged_idle.png", attack: "/sprites/enemies/enemy_ranged_attack.png", hit: "/sprites/enemies/enemy_ranged_hit.png", run: ["/sprites/enemies/enemy_ranged_run_0.png", "/sprites/enemies/enemy_ranged_run_1.png"], idleAnim: ["/sprites/enemies/enemy_ranged_idleanim_0.png", "/sprites/enemies/enemy_ranged_idleanim_1.png"] },
  },
  aoe: {
    id: 'aoe',
    displayName: 'Piggeh',
    characterName: 'Dryad Mage', // ブタヤロウ (Piggeh) — the first Red enemy
    role: 'aoe',
    threat: 12,
    hp: 1500,
    damage: 120,
    attackSpeed: 4.9, // dps ~49.3 — interval 2433ms (73F), split 35/65 below
    foreswingMs: 852,
    backswingMs: 1585,
    moveSpeed: 30,
    radius: 16,
    range: 22,
    rechargeMs: 0,
    knockbackCount: 2,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xcc33cc,
    label: 'Pg',
    special: { type: 'aoe', radius: 40 },
    critChance: 0,
    attribute: 'red', // the guide's first colored/attribute enemy
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_aoe_idle.png", attack: "/sprites/enemies/enemy_aoe_attack.png", hit: "/sprites/enemies/enemy_aoe_hit.png", run: ["/sprites/enemies/enemy_aoe_run_0.png", "/sprites/enemies/enemy_aoe_run_1.png"], idleAnim: ["/sprites/enemies/enemy_aoe_idleanim_0.png", "/sprites/enemies/enemy_aoe_idleanim_1.png"] },
  },

  swarm: {
    id: 'swarm',
    displayName: 'Listen To Me',
    characterName: 'Forest Slime Fighter', // リッスントゥミー — cheap, extremely fast swarm filler
    role: 'swarm',
    threat: 3,
    hp: 80,
    damage: 30,
    attackSpeed: 56.3, // dps ~56.3 — interval 533ms (16F), split 35/65 below
    foreswingMs: 187,
    backswingMs: 346,
    moveSpeed: 115,
    radius: 10,
    range: 10,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0xff3366,
    label: 'L',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_swarm_idle.png", attack: "/sprites/enemies/enemy_swarm_attack.png", hit: "/sprites/enemies/enemy_swarm_hit.png", run: ["/sprites/enemies/enemy_swarm_run_0.png", "/sprites/enemies/enemy_swarm_run_1.png"], idleAnim: ["/sprites/enemies/enemy_swarm_idleanim_0.png", "/sprites/enemies/enemy_swarm_idleanim_1.png"] },
  },
  sniper: {
    id: 'sniper',
    displayName: 'Jackie Penguin',
    characterName: 'Dryad Ranger', // ジャッキー・ペン (Jackie Penguin) — a fast attacker
    role: 'sniper',
    threat: 14,
    hp: 1300,
    damage: 80,
    attackSpeed: 37.5, // dps ~37.5 — interval 800ms (24F), split 35/65 below
    foreswingMs: 280,
    backswingMs: 520,
    moveSpeed: 51,
    radius: 13,
    range: 22,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 14,
    knockbackType: 'normal',
    color: 0xff9933,
    label: 'J',
    special: { type: 'none' },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_sniper_idle.png", attack: "/sprites/enemies/enemy_sniper_attack.png", hit: "/sprites/enemies/enemy_sniper_hit.png", idleAnim: ["/sprites/enemies/enemy_sniper_idleanim_0.png", "/sprites/enemies/enemy_sniper_idleanim_1.png"] },
  },
  guardian: {
    id: 'guardian',
    displayName: 'Kuma-sensei',
    characterName: 'Flowering Treant', // クマ先生 (Kuma-sensei) — long range, KB10
    role: 'guardian',
    threat: 18,
    hp: 3000,
    damage: 1000,
    attackSpeed: 8.4, // dps ~280.7 — interval 3567ms (107F), split 35/65 below
    foreswingMs: 1248,
    backswingMs: 2319,
    moveSpeed: 27,
    radius: 24,
    range: 51,
    rechargeMs: 0,
    knockbackCount: 10,
    knockbackDistance: 8,
    knockbackType: 'normal',
    color: 0x996633,
    label: 'K',
    special: { type: 'aoe', radius: 45 },
    critChance: 0,
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_guardian_idle.png", attack: "/sprites/enemies/enemy_guardian_attack.png", hit: "/sprites/enemies/enemy_guardian_hit.png", run: ["/sprites/enemies/enemy_guardian_run_0.png", "/sprites/enemies/enemy_guardian_run_1.png"], idleAnim: ["/sprites/enemies/enemy_guardian_idleanim_0.png", "/sprites/enemies/enemy_guardian_idleanim_1.png"] },
  },
  support: {
    id: 'support',
    displayName: 'Gomasama',
    characterName: 'Aquatic Flowering Slime', // ゴマさま (Gomasama) — fast Red area attacker
    role: 'support',
    threat: 16,
    hp: 2500,
    damage: 150,
    attackSpeed: 39.1, // dps ~195.7 — interval 767ms (23F), split 35/65 below
    foreswingMs: 268,
    backswingMs: 499,
    moveSpeed: 47,
    radius: 14,
    range: 25,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 12,
    knockbackType: 'normal',
    color: 0xcc6666,
    label: 'Go',
    special: { type: 'aoe', radius: 35 },
    critChance: 0,
    attribute: 'red',
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_support_idle.png", attack: "/sprites/enemies/enemy_support_attack.png", hit: "/sprites/enemies/enemy_support_hit.png", run: ["/sprites/enemies/enemy_support_run_0.png", "/sprites/enemies/enemy_support_run_1.png"], idleAnim: ["/sprites/enemies/enemy_support_idleanim_0.png", "/sprites/enemies/enemy_support_idleanim_1.png"] },
  },
  titan: {
    id: 'titan',
    displayName: 'Emperor Nyandam',
    characterName: 'Daddy Bear', // 悪の帝王ニャンダム (Emperor Nyandam) — the real Empire of Cats final boss
    role: 'titan',
    threat: 60,
    hp: 99999,
    damage: 1800,
    attackSpeed: 3.9, // dps ~116.6 — interval 15433ms (463F), split 35/65 below
    foreswingMs: 5402,
    backswingMs: 10031,
    moveSpeed: 20,
    radius: 32,
    range: 73,
    rechargeMs: 0,
    knockbackCount: 3,
    knockbackDistance: 6,
    knockbackType: 'normal',
    color: 0x992222,
    label: 'N',
    special: { type: 'aoe', radius: 55 },
    critChance: 0,
    attribute: 'red',
    statusOnHit: NO_STATUS,
    sprite: { idle: "/sprites/enemies/enemy_titan_idle.png", attack: "/sprites/enemies/enemy_titan_attack.png", hit: "/sprites/enemies/enemy_titan_hit.png", run: ["/sprites/enemies/enemy_titan_run_0.png", "/sprites/enemies/enemy_titan_run_1.png"], idleAnim: ["/sprites/enemies/enemy_titan_idleanim_0.png", "/sprites/enemies/enemy_titan_idleanim_1.png"] },
  },

  // --- Dormant this pass (see file header) — no longer plugged into any
  // rebuilt Chapter-1 stage, kept in place (real revive mechanic still
  // intact) for whenever an "Into the Future"-equivalent saga returns.
  // Their old `trait` values ('zombie'/'bug'/'beast') came from the retired
  // beast-cycle system — zombie IS a real attribute so it carries over
  // directly; colossus/behemoth have no real attribute of their own besides
  // their superClass tag, so `attribute` is simply omitted for them now.
  zombie: {
    id: 'zombie',
    displayName: 'Zombie',
    characterName: 'Old Slime',
    role: 'zombie',
    attribute: 'zombie',
    threat: 10,
    hp: 40,
    damage: 8,
    attackSpeed: 1,
    foreswingMs: 350,
    backswingMs: 650,
    moveSpeed: 35,
    radius: 14,
    range: 14,
    rechargeMs: 0,
    knockbackCount: 2,
    knockbackDistance: 10,
    knockbackType: 'normal',
    color: 0x556b2f,
    label: 'Z',
    special: { type: 'none' },
    critChance: 0.05,
    statusOnHit: NO_STATUS,
    reviveCount: 2,
    reviveHpPercent: 0.5,
    sprite: { idle: "/sprites/enemies/enemy_zombie_idle.png", attack: "/sprites/enemies/enemy_zombie_attack.png", hit: "/sprites/enemies/enemy_zombie_hit.png", run: ["/sprites/enemies/enemy_zombie_run_0.png", "/sprites/enemies/enemy_zombie_run_1.png"], idleAnim: ["/sprites/enemies/enemy_zombie_idleanim_0.png", "/sprites/enemies/enemy_zombie_idleanim_1.png"] },
  },
  colossus: {
    id: 'colossus',
    displayName: 'Colossus',
    characterName: 'Alpha Wolf',
    role: 'colossus',
    threat: 22,
    hp: 320,
    damage: 35,
    attackSpeed: 0.4,
    foreswingMs: 875,
    backswingMs: 1625,
    moveSpeed: 20,
    radius: 34,
    range: 34,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 4,
    knockbackType: 'normal',
    color: 0x996633,
    label: 'Co',
    special: { type: 'aoe', radius: 50 },
    critChance: 0.05,
    statusOnHit: NO_STATUS,
    superClass: 'colossus',
    sprite: { idle: "/sprites/enemies/enemy_colossus_idle.png", attack: "/sprites/enemies/enemy_colossus_attack.png", hit: "/sprites/enemies/enemy_colossus_hit.png", run: ["/sprites/enemies/enemy_colossus_run_0.png", "/sprites/enemies/enemy_colossus_run_1.png"], idleAnim: ["/sprites/enemies/enemy_colossus_idleanim_0.png", "/sprites/enemies/enemy_colossus_idleanim_1.png"] },
  },
  behemoth: {
    id: 'behemoth',
    displayName: 'Behemoth',
    characterName: 'Werewolf',
    role: 'behemoth',
    threat: 35,
    hp: 500,
    damage: 55,
    attackSpeed: 0.35,
    foreswingMs: 1000,
    backswingMs: 1857,
    moveSpeed: 18,
    radius: 38,
    range: 38,
    rechargeMs: 0,
    knockbackCount: 1,
    knockbackDistance: 3,
    knockbackType: 'immune',
    color: 0x330000,
    label: 'Be',
    special: { type: 'aoe', radius: 60 },
    critChance: 0.05,
    statusOnHit: NO_STATUS,
    superClass: 'behemoth',
    sprite: { idle: "/sprites/enemies/enemy_behemoth_idle.png", attack: "/sprites/enemies/enemy_behemoth_attack.png", hit: "/sprites/enemies/enemy_behemoth_hit.png", run: ["/sprites/enemies/enemy_behemoth_run_0.png", "/sprites/enemies/enemy_behemoth_run_1.png"], idleAnim: ["/sprites/enemies/enemy_behemoth_idleanim_0.png", "/sprites/enemies/enemy_behemoth_idleanim_1.png"] },
  },
};
