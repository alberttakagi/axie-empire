import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { ENEMY_CONFIG, ENEMY_RARITY } from './ENEMY_CONFIG.js';
import { preloadSpriteRoster, addUnitIcon } from './SpriteIcon.js';
import { preloadBackgrounds, addBackground, getStageBattleBackgroundId } from './Backdrop.js';
import { STAGE_CONFIG, getStageCostMultiplier } from './STAGE_CONFIG.js';
import { saveStageResult, getClearCount, loadStageProgress } from './StageProgress.js';
import { MONEY_CONFIG } from './MONEY_CONFIG.js';
import {
  METAL_ATTRIBUTE,
  METAL_FLAT_DAMAGE_AMOUNT,
  STRONG_DEALT_MULTIPLIER,
  STRONG_TAKEN_MULTIPLIER,
  MASSIVE_DEALT_MULTIPLIER,
  RESISTANT_TAKEN_MULTIPLIER,
  CRITICAL_DEALT_MULTIPLIER,
  SUPER_CLASS_SLAYER_BONUSES,
} from './TRAIT_CONFIG.js';
import { STATUS_TYPES } from './STATUS_CONFIG.js';
import { getEffectiveUnitConfig } from './UnitStats.js';
import {
  loadPlayerProgress,
  getUnitProgress,
  grantStageRewards,
  getBaseUpgradeLevel,
  addGems,
  trySpendGems,
} from './PlayerProgress.js';
import { BASE_UPGRADE_CONFIG } from './BASE_UPGRADE_CONFIG.js';
import { getBonusPercent, rollTreasureForStage, guaranteeTopTier } from './Treasure.js';
import { findSetForStage } from './TREASURE_CONFIG.js';
import { loadLoadout, MAX_LOADOUT_SIZE } from './Loadout.js';
import { trySpendEnergy } from './Energy.js';
import { getComboBonusValue } from './Combo.js';
import { hasReachedPartEvolution } from './PartEvolution.js';
import { DOJO_CONFIG } from './DOJO_CONFIG.js';
import { saveDojoScore } from './DojoProgress.js';
import { BC, FONT, createBcButton, createBcCircleButton, drawBcPanel } from './UITheme.js';
import { describeUnit } from './UnitDescription.js';
import { hasCompletedTutorial, markTutorialCompleted } from './Tutorial.js';
import {
  playCannonSfx,
  playBossShockwaveSfx,
  playHitSfx,
  playCritSfx,
  playUiTapSfx,
  playSfxFile,
  playMusic,
  preloadMusic,
  stopMusic,
  VOLUME_LEVEL_LABELS,
  getSfxVolumeLevel,
  cycleSfxVolumeLevel,
  getBgmVolumeLevel,
  cycleBgmVolumeLevel,
  isMuted,
  setMuted,
} from './Audio.js';
import { addUserRank } from './UserRank.js';
import { BATTLE_ITEMS_CONFIG } from './BATTLE_ITEMS_CONFIG.js';
import { getBattleItemCount, tryUseBattleItem, rollBattleItemDrop } from './BattleItems.js';
import { preloadAttackVfx, createAttackVfxAnims, fireAttackVfx } from './AttackVfx.js';
import { showDamageNumber } from './CombatFeedback.js';
import { addLifetimeStat } from './LifetimeStats.js';
import { LOGICAL_SIZE, RENDER_SCALE, CANVAS_WIDTH, CANVAS_HEIGHT } from './RenderConfig.js';

// Account-wide Base Upgrades (bible §A.7.1) — read once per battle at
// create() time into flat numbers, since they only change between battles
// (via UpgradeScene/BaseUpgradeScene), never mid-fight.
function getBaseUpgradeEffect(key) {
  const config = BASE_UPGRADE_CONFIG[key];
  const level = getBaseUpgradeLevel(key);
  // Most categories are a flat perLevelEffect per level; baseDefense's real
  // growth is tiered instead (see its own perLevelTiers comment) — sum
  // however many tiers the current level has actually reached.
  if (config.perLevelTiers) {
    return config.perLevelTiers.slice(0, level).reduce((sum, tier) => sum + tier, 0);
  }
  return level * config.perLevelEffect;
}

// Normalizes a raw STAGE_CONFIG spawnScript entry into the one real spawn
// rule shape every stage now runs on (see updateSpawns): a first-appearance
// time, an optional randomized repeat range (real Battle Cats re-rolls a
// random interval inside [min,max] after every spawn — see guide Chapter
// 14's "再登場F"), a total spawn cap (null = unlimited), and a castle-HP%
// gate (checked continuously, not just once — a stage can have several
// enemies/reinforcement bursts/multi-phase bosses gated at different
// thresholds). saga1's real 48 stages author entries in this shape
// directly; saga2/saga3/Sparring Grounds still use the older, simpler
// one-shot shapes (a single spawnDelayMs, or a single baseHpPercentTrigger
// boss), so those are translated into the same normalized shape here
// rather than needing two separate spawn engines.
function normalizeSpawnEntry(entry) {
  if (entry.firstMs !== undefined) {
    return {
      firstMs: entry.firstMs,
      repeatMs: entry.repeatMs ?? null,
      maxCount: entry.maxCount ?? null,
      castleHpBelowPercent: entry.castleHpBelowPercent ?? 100,
    };
  }
  if (entry.baseHpPercentTrigger !== undefined) {
    return { firstMs: 0, repeatMs: null, maxCount: 1, castleHpBelowPercent: entry.baseHpPercentTrigger };
  }
  return { firstMs: entry.spawnDelayMs ?? 0, repeatMs: null, maxCount: 1, castleHpBelowPercent: 100 };
}

const MIN_RECHARGE_MS = 2000; // bible §A.3.2: hard floor is 60 frames @ 30fps = 2.0s, across the whole game — Research can never push a unit's recharge below this

// Global deploy limit (bible §A.3.11) — confirmed real: real Battle Cats'
// own player deploy cap is a flat 50 on every stage that isn't a
// "Restriction Stage" (条件付きステージ, a later-introduced mechanic that
// doesn't exist anywhere in Japan Chapter 1 — see STAGE_CONFIG.js's saga2/
// saga3 for this build's own invented examples of that gimmick, tightened
// via `restrictions.maxDeployed`). This was originally a guessed
// placeholder of 20 based on a misreading of STAGE_CONFIG's own real
// per-stage 出撃最大数 column as a player restriction — that column is
// actually the ENEMY side's own simultaneous-on-field cap (see
// `maxEnemiesOnField`/updateSpawns below), corrected after the user
// double-checked against a clarified source.
const DEFAULT_MAX_DEPLOYED = 50;

const SPEED_UP_MULTIPLIER = 2;

// In-battle income ramps up over the fight rather than staying flat (bible
// §A.3.10: "early-battle income is slow, and it accelerates the longer the
// fight goes on, up to a cap") — climbs linearly from
// MONEY_RAMP_START_MULTIPLIER up to a full 1x over MONEY_RAMP_DURATION_MS,
// then holds there. Rich Cat (a Battle Item, see BATTLE_ITEMS_CONFIG.js)
// bypasses this ramp entirely by setting moneyRampBypassed.
const MONEY_RAMP_START_MULTIPLIER = 0.4;
const MONEY_RAMP_DURATION_MS = 60000;

const TREASURE_TIER_NAMES = ['', 'Bronze', 'Silver', 'Gold'];
const TREASURE_TIER_COLOR = [0x000000, 0xcd7f32, 0xc0c0c0, 0xffd700]; // index 0 (none) never drawn — see playVictorySequence
const TREASURE_TIER_ICON_KEYS = [null, 'bronze', 'silver', 'gold']; // matches TreasureScene.js's own TIER_KEYS

// Stage-clear XP reward decay (bible §A.5.1 — repeat clears taper toward a
// floor rather than paying full XP forever): each previous clear of this
// exact stage reduces its baseXp payout by XP_DECAY_PER_CLEAR, down to a
// floor of XP_DECAY_FLOOR (e.g. 15%/clear, floor 20% => full reward on a
// first clear, ~85% on the 2nd, ... bottoming out at 20% from the 6th on).
const XP_DECAY_PER_CLEAR = 0.15;
const XP_DECAY_FLOOR = 0.2;

// Evolution-material drop chances on a stage win (bible §A.4.4's Catfruit/
// Behemoth-Stone-equivalent economy, simplified to one flat chance per
// material rather than per-stage-tuned tables — a reasonable placeholder
// per the bible's own "tune to your own economy" framing).
const EVO_SHARD_DROP_CHANCE = 0.3;
const GROWTH_CHARM_DROP_CHANCE = 0.15;

// User Rank (bible §A.7.4) — see UserRank.js for why this doesn't gate
// anything; PlayerProgress.js awards its own share on level-up/evolution.
const RANK_PER_FIRST_CLEAR = 5;

// Continue (bible §A.3.9): "the player can pay Cat Food (or watch a
// rewarded ad) to refill and continue" on a loss — Gems, in this build's
// currency naming. Offered at most MAX_CONTINUES_PER_BATTLE times per
// battle (escalating cost each time) so it can't be chained indefinitely;
// a per-stage `allowContinue: false` flag (a subset of harder stages in
// STAGE_CONFIG.js) disables the offer outright, matching the bible's
// "a subset of harder/special stages explicitly disable this." Dojo never
// offers it — its own timer-based ending isn't a "loss" to continue past.
const CONTINUE_GEM_COSTS = [5, 10, 20];

// Evolution-stage visual cue: only the circle-placeholder fallback still
// uses this (a stroked ring around itself) — a sprite unit relies on the
// part-evolution glow alone (see spawnUnit). Index = evolutionStage
// (0 = not evolved, unused).
const EVOLUTION_RING_COLOR = [null, 0xffffff, 0xffdd33];
const EVOLUTION_RING_WIDTH = [0, 2, 3];

// Sprite sizing (see fitSpriteToRadius): a straight `radius * multiplier`
// made the smallest-radius units (Swarm/Sniper/Fast, radius 10-12) read as
// tiny while the biggest (Titan/Tank, radius 26-30) dominated the lane —
// the 3x spread in gameplay radius is a much bigger visual spread than any
// of these character designs can carry. A floor plus a gentler per-radius
// slope keeps "bigger stat = bigger sprite" while compressing that range:
// smallest unit reads at SPRITE_MIN_DIAMETER, biggest (titan, radius 30) at
// only ~1.5x that instead of ~3x.
const SPRITE_MIN_DIAMETER = 58;
const SPRITE_MIN_RADIUS = 10; // swarm — the smallest unit's radius
const SPRITE_SIZE_SLOPE = 1.45; // px of extra diameter per point of radius above the min

// How much bigger a non-idle pose is allowed to render than idle (see
// setEntityPose) before it gets scaled back down — a modest amount of
// "the swung weapon reaches further out" growth is intentional and reads
// fine (a few real rosters' attack frames run ~1.1-1.3x idle's own bounding
// box), but a handful of frames (Dryad Mage/Piggeh's own attack frame
// among them, at ~1.5x) blow well past that into a jarring sudden-growth
// pop with no gameplay reason for it.
const MAX_POSE_SCALE_GROWTH = 1.3;

// Run/idle-pose animation (see updateRunCycle/updateIdleCycle) — real bug,
// found live: an earlier pass fit however many frames a sequence had into
// a FIXED total cycle length (e.g. always 320ms for run, however many
// frames), which plays every sequence at a different, made-up speed
// instead of its own real one — a clip with more frames than another
// played faster, not smoother, which read as "fast-forwarded." Real
// smoothness means each frame holds for the same real amount of time the
// source Spine clip was authored at — tools/sprite-gen samples every
// sequence at ANIMATION_FPS now (see its own header comment), so stepping
// one frame every 1000/ANIMATION_FPS ms here reproduces that same real
// timing regardless of how many frames any particular clip ended up with.
const ANIMATION_FPS = 24;
const ANIMATION_FRAME_DELAY_MS = 1000 / ANIMATION_FPS;

// Attack lunge (see updateAttackLunge) — a texture swap to the attack pose
// alone (just the axie's face changing) barely reads as "attacking" at a
// glance. A small forward-and-back hop synced to the foreswing/backswing
// timing an attacker already tracks (tickCombatPhase) sells the hit far
// more clearly, the same way Battle Cats units visibly lunge at their
// target rather than just changing sprite. Kept small/quick rather than a
// big showy hop — it needs to read at a glance without ever looking like
// the unit actually changed lanes or left its gameplay position (which,
// net over one full foreswing+backswing cycle, it never does).
const ATTACK_LUNGE_DISTANCE = 7;

// Scroll-to-zoom (see setupZoomControls) — battle-camera-only, so the HUD
// (rendered by the separate always-zoom-1 uiCamera) never changes size.
// MIN is exactly 1, not below: the whole battlefield already fits the
// canvas exactly at zoom 1 (the backdrop/lane/bases are sized to it), so
// there's no more world a sub-1 zoom could reveal — it would just letterbox
// (the bounded battlefield shrinks to less than the viewport, leaving a
// bare border with nothing GameScene draws in it). MAX is close enough to
// see a unit's own run-cycle/attack animation clearly.
// Both bounds are expressed relative to RENDER_SCALE (the base zoom every
// camera now starts at — see RenderConfig.js) rather than the old raw 1/2.2,
// so the player's own zoom-in range still feels identical to before; only
// the floor/ceiling shifted to sit on top of the new HD base zoom instead of
// literal 1x.
const WORLD_ZOOM_MIN = RENDER_SCALE;
const WORLD_ZOOM_MAX = RENDER_SCALE * 2.2;
const WORLD_ZOOM_WHEEL_SENSITIVITY = 0.001; // fraction of zoom changed per wheel-delta unit

// A scripted boss (STAGE_CONFIG entries with isBoss: true) is otherwise
// pixel-identical to its normal namesake enemy aside from a big hp
// multiplier — the shockwave/warning flash at the moment it spawns is a
// one-time announcement, not an ongoing visual cue for the rest of the
// fight. A straightforward size bump keeps it reading as "the big one" for
// as long as it's alive — see spawnScriptedEnemy for why this scales
// radius/range directly rather than being a sprite-only multiplier (the
// hitbox needs to keep pace with what's actually on screen).
const BOSS_VISUAL_SCALE_MULTIPLIER = 1.6;

// Enemy rarity (see ENEMY_CONFIG.js's own ENEMY_RARITY header) — the same
// radius-scaling technique as the boss multiplier just above, applied by
// baseline rarity instead of a scripted boss flag; see spawnScriptedEnemy
// for why a scripted boss's own multiplier takes priority instead of the
// two stacking (a Legendary enemy scripted as a stage's boss should look
// like a normal boss, not both bonuses compounding into something bigger
// than intended).
const ENEMY_RARITY_SIZE_MULTIPLIER = {
  [ENEMY_RARITY.COMMON]: 1,
  [ENEMY_RARITY.RARE]: 1.15,
  [ENEMY_RARITY.EPIC]: 1.35,
  [ENEMY_RARITY.LEGENDARY]: 1.6,
  [ENEMY_RARITY.MYTHIC]: 2.6, // Behemoth/Werewolf alone — see ENEMY_CONFIG.js's own comment on why
};

// Part evolution's glow (see PartEvolution.js/spawnUnit) — a single flat,
// subtle strength rather than something that draws the eye across the
// whole lane; the evolved sprite art itself (where a unit has one) is
// already the primary "this leveled up" signal, so the glow's job is just
// a quiet accent, both for units that get it alongside real evolved art
// and Titan, which relies on it alone.
const PART_EVOLUTION_GLOW_STRENGTH = 0.9;
// Glow color now signals WHICH real Battle Cats Form a unit is standing in
// for (see UNIT_CONFIG.js's own header) — Form 2 (Evolved, evolutionStage 1)
// glows light blue, Form 3 (True, evolutionStage 2) glows purple — rather
// than a single fixed gold regardless of stage, so the two real evolution
// tiers this build already tracks (PROGRESSION_CONFIG.js's evolutionStage)
// read as visually distinct at a glance, not just via the stats screen.
const EVOLUTION_STAGE_GLOW_COLOR = { 1: 0x66ccff, 2: 0xaa66ff };

// Real per-status sound (Origins Asset Kit, public/audio/sfx/ — see
// Audio.js's own header) played once per successful statusOnHit proc — see
// applyStatusEffect. Picked for the closest real-world meaning to each
// effect: STOP freezes the target in place (stunned), WEAKEN saps its
// output (weak), CURSE is the same idea the kit's own name uses (hex), WARP
// removes the target from play for a while (summon_off — the closest
// "taken out of the fight" cue the kit has). SLOW has no equally direct
// match; `drain` (something being sapped away) is the closest fit.
const STATUS_SFX_FILE = {
  [STATUS_TYPES.SLOW]: 'drain.wav',
  [STATUS_TYPES.STOP]: 'stunned.wav',
  [STATUS_TYPES.WEAKEN]: 'weak.wav',
  [STATUS_TYPES.CURSE]: 'hex.wav',
  [STATUS_TYPES.WARP]: 'summon_off.wav',
};

// User-supplied battle/victory/defeat themes (replacing the old real
// per-saga PvE tracks and the synthesized victory/defeat jingles — see
// winStage/endGame below). One track for every saga/Dojo now rather than
// one per saga; the boss track is untouched.
const BATTLE_MUSIC_URL = '/audio/bgm_battle.mp3';
const BOSS_MUSIC_URL = '/audio/bgm_boss.wav';
const VICTORY_MUSIC_URL = '/audio/bgm_victory.mp3';
const DEFEAT_MUSIC_URL = '/audio/bgm_defeat.mp3';

const LANE_Y_RATIO = 0.5;
const BASE_WIDTH = 60;
// Player and enemy towers now use two DIFFERENT user-supplied totem
// sprites (a distinct mascot per side, rather than one asset mirrored) —
// both tall and narrow so they read as a distinct tower against the
// battle backdrop rather than blending into it. The enemy one is still
// flipped (setFlipX) so the pair leans/faces inward at each other across
// the lane instead of both facing the same way. Both are displayed at the
// same height (TOWER_SPRITE_DISPLAY_HEIGHT); width is derived per-sprite
// from its own native aspect ratio so neither looks stretched.
const TOWER_PLAYER_SPRITE_KEY = 'tower_player';
const TOWER_PLAYER_NATIVE_RATIO = 421 / 938;
const TOWER_ENEMY_SPRITE_KEY = 'tower_enemy';
const TOWER_ENEMY_NATIVE_RATIO = 263 / 573;
// Shrunk from 190 — combined with the spawn-button row layout below, the
// full-height tower's own bottom edge (laneY ± half this height) reached
// down far enough to visibly overlap the ALWAYS-2-ROW spawn button grid's
// top row (see createSpawnButtons — every Formation now always renders the
// full 5x2 grid, so that top row is never absent the way a small Formation
// used to make it).
const TOWER_SPRITE_DISPLAY_HEIGHT = 165;
const TOWER_PLAYER_DISPLAY_WIDTH = Math.round(TOWER_SPRITE_DISPLAY_HEIGHT * TOWER_PLAYER_NATIVE_RATIO);
const TOWER_ENEMY_DISPLAY_WIDTH = Math.round(TOWER_SPRITE_DISPLAY_HEIGHT * TOWER_ENEMY_NATIVE_RATIO);
const BASE_HP_TEXT_Y_OFFSET = 100; // above laneY — see the two HP text objects below

// Shrunk from 70 (see TOWER_SPRITE_DISPLAY_HEIGHT's own comment) — the
// tower shrink alone wasn't quite enough clearance once the towers'
// natural aspect ratio is accounted for, so the button grid gives up a
// little height too rather than relying on the tower shrink alone.
const BUTTON_HEIGHT = 62;
// BUTTON_WIDTH is a CEILING, not a fixed size — createSpawnButtons shrinks
// the actual per-button width to whatever fits SPAWN_BUTTONS_PER_ROW
// buttons in one row, capped at this value.
const BUTTON_WIDTH = 136;
const BUTTON_GAP = 8;
const SPAWN_ROW_CANNON_GAP = 10; // clearance kept between the row and the Cannon button's own footprint
const SPAWN_ROW_GAP = 5;
// A Formation/Deck can hold up to MAX_LOADOUT_SIZE (10, matching the real
// game's own Deck size) units — wrapped into rows of 5 (bible §A.10.3/real
// Battle Cats' own deploy bar) rather than shrunk to fit one long row, so
// each button stays large and legible regardless of Formation size.
const SPAWN_BUTTONS_PER_ROW = 5;

const SCORE_PER_KILL = 10;

// How long a knockback slide takes to play out. A stagger sets a defender's
// knockbackMs to this and computes a velocity (its `knockbackDistance` /
// this duration); every frame while knockbackMs > 0 it slides and cannot
// act at all (no attacking, no seeking a new target) — a real timed state,
// not an instant teleport. See resolveKnockback/startKnockbackSlide for how
// staggers are actually triggered (bible §A.3.5's HP-threshold model, not a
// per-hit chance/certainty).
const KNOCKBACK_DURATION_MS = 200;

// Boss arrivals (bible §A.3.9): a scripted "reset the board" shockwave —
// knocks back every currently-deployed player unit further and slower than
// a normal combat knockback (reference: ~24x the distance, ~2x the
// duration), interrupting whatever they were mid-swing on. Always shoves
// toward the player's own base (leftward, since bosses only ever spawn on
// the enemy side) regardless of the unit's own knockbackType — a boss's
// entrance overrides even knockback immunity, same spirit as a scripted
// cutscene beat rather than an ordinary hit.
const BOSS_SHOCKWAVE_DISTANCE_MULTIPLIER = 24;
const BOSS_SHOCKWAVE_DURATION_MULTIPLIER = 2;
const BOSS_SHOCKWAVE_FALLBACK_DISTANCE = 15; // used only if a unit has no knockbackDistance at all

// Status-effect visual cues — priority order when more than one is active:
// stop (fully frozen) beats curse beats slow beats weaken, so the most
// disruptive/visible state wins. Cleared back to the entity's own
// config.color once every timer runs out (see tickStatusEffects).
const STATUS_STOP_COLOR = 0x556677;
const STATUS_CURSE_COLOR = 0x9933cc;
const STATUS_SLOW_COLOR = 0x88ccff;
const STATUS_WEAKEN_COLOR = 0xcc8844;
const STATUS_DODGE_COLOR = 0xffffff; // a brief white flash — rare and outranks every other tint

// Hit-flash (combat-feedback pass, not a bible field) — same white as
// STATUS_DODGE_COLOR since both read as "something just happened to this
// entity," but ranked one step above it (see tickStatusEffects): the two
// are mutually exclusive in practice anyway (a hit either connects,
// setting hitFlashMs, or is dodged entirely, setting dodgeMs instead — see
// applyResolvedDamage/tryDodge), so this only matters for whichever
// leftover frame both happen to still be counting down together.
const HIT_FLASH_COLOR = 0xffffff;
const HIT_FLASH_DURATION_MS = 100;

// Status-effect ICONS (distinct from the tint above): unlike the tint,
// which only ever shows the single highest-priority status so the entity's
// silhouette reads as one clear state, these show every currently-active
// status at once as small badges above the entity's head — Weaken in
// particular never wins the tint priority chain but is still a real,
// separate debuff worth surfacing. Warp has no icon: a warping entity is
// invisible outright (see tickStatusEffects), so there'd be nothing to
// pin it to. One Image per status, reused every frame (created once per
// entity in makeEntityState) rather than created/destroyed on the fly.
//
// Real Axie Infinity status-icon art (Origins Asset Kit's StatusIcons set,
// see public/icons/status/ + its own README) — picked by matching NAME to
// what each of our own effects actually does, not just by look: Stop
// freezes an entity in place exactly like Axie's own "Stunned" (can't
// act at all); Weaken cuts outgoing damage exactly like Axie's own "Weak"
// (-20% DMG in the real card game); Curse already shares its name
// outright. Axie's real status list has no "Slow" at all — a real-time-
// only concept its turn-based card battles never needed — so Slow
// borrows the closest analog on hand, "Sleep," for both its icon and (see
// UnitDescription.js) its display name.
const STATUS_ICON_TEXTURE = {
  [STATUS_TYPES.STOP]: { key: 'status_icon_stop', file: 'stunned.png' },
  [STATUS_TYPES.CURSE]: { key: 'status_icon_curse', file: 'curse.png' },
  [STATUS_TYPES.SLOW]: { key: 'status_icon_slow', file: 'sleep.png' },
  [STATUS_TYPES.WEAKEN]: { key: 'status_icon_weaken', file: 'weak.png' },
};
const STATUS_ICON_ORDER = [STATUS_TYPES.STOP, STATUS_TYPES.CURSE, STATUS_TYPES.SLOW, STATUS_TYPES.WEAKEN];
const STATUS_ICON_DISPLAY_SIZE = 16;
const STATUS_ICON_SPACING = 18;
const STATUS_ICON_GAP_ABOVE_SPRITE = 14;

// Dodge (bible §A.3.8): "a % chance to take zero damage... for a short
// window after triggering; cannot re-trigger while already active" — see
// tryDodge. Used as the fallback window length for a unit whose config
// doesn't specify its own dodgeWindowMs.
const DEFAULT_DODGE_WINDOW_MS = 400;


// Low-HP base warning (this build's own addition — see updateLowHpVignette)
// — a pulsing full-screen red tint once the player's own base drops to or
// below this fraction of its max HP.
const LOW_HP_WARNING_RATIO = 0.25;
const LOW_HP_VIGNETTE_BASE_ALPHA = 0.2;
const LOW_HP_VIGNETTE_PULSE_ALPHA = 0.15;

// Cat Cannon: fills PASSIVELY OVER TIME (bible §A.3.9), independent of
// combat performance — not from damage dealt. Rendered as a dedicated
// bottom-right circular button (confirmed screenshot layout: Worker Cat
// bottom-left, Cat Cannon bottom-right, both separate from the bases
// themselves) with a radial charge fill; once full it lights up and becomes
// tappable — tapping it fires a flat burst against every living enemy on
// screen plus the enemy base (with knockback, matching the bible), then
// resets to 0.
const SPECIAL_METER_MAX = 200;
// Real Battle Cats charges the Cat Cannon on a fixed TIME budget, not a
// flat rate (guide Chapter 08): 0%→100% in 1500F (50s) at baseline, and the
// Cannon Charge Base Upgrade shaves a flat amount of TIME off that budget
// per level (see BASE_UPGRADE_CONFIG.js's cannonCharge, now ms rather than
// a rate-per-second) rather than adding to a fill rate — replacing this
// build's earlier invented rate-based model (a flat charge/sec, tunable
// only by adding more rate). CANNON_CHARGE_FLOOR_MS is the real hard floor
// (950F ≈ 31.7s) research/upgrades can never push the total time below.
const SPECIAL_CHARGE_DURATION_MS = 50000; // real 1500F baseline
const CANNON_CHARGE_FLOOR_MS = 31667; // real 950F
// Real per-shot damage (guide Chapter 08): 攻撃力 = 100 + 50×(Cannon Power
// Lv−1) — one number applied to whatever the wave hits, not two separate
// invented values for units vs the enemy base (the old SPECIAL_BURST_DAMAGE
// =30 / SPECIAL_BURST_BASE_DAMAGE=25 split). CANNON_BASE_WAVE_COUNT is the
// real base wave count (guide: "波動の数3発"), raised by Cannon Range (see
// BASE_UPGRADE_CONFIG.js).
//
// CANNON_BLAST_START_MS/CANNON_BLAST_STEP_MS come from the guide's own
// later frame-by-frame breakdown (its "cannon.js" reference model) —
// explicitly labeled there as this build's-of-the-guide OWN reproduction
// timing, not a confirmed real internal value (no public source gives the
// exact per-blast frame interval), but still a real, deliberate, sourced
// choice rather than an arbitrary guess: blast 1 lands at real F8, each
// next blast F6 later — converted via the standard F×(1000/30) rule.
const CANNON_BASE_DAMAGE = 100;
const CANNON_BASE_WAVE_COUNT = 3;
const CANNON_BLAST_START_MS = 267; // real F8
const CANNON_BLAST_STEP_MS = 200; // real F6
// Real Cannon Power also SLOWS the charge by the same amount Cannon Charge
// speeds it up (guide Chapter 08's own charge formula) — same per-level
// magnitude as BASE_UPGRADE_CONFIG.cannonCharge's perLevelEffect, applied
// with the opposite sign in the charge-time calc below.
const CANNON_POWER_CHARGE_PENALTY_MS_PER_LEVEL = 1666.67;
const CANNON_BUTTON_RADIUS = 34;
const CANNON_NOT_READY_COLOR = 0x555566;
const CANNON_READY_COLOR = 0xffdd33;
const CANNON_CHARGE_FILL_COLOR = 0xffaa33;
// Cat Cannon VFX (see triggerSpecialBurst/fireCannonBeamFlashVfx/
// fireCannonBlastVfx), rebuilt against the guide's frame-by-frame
// breakdown: a quick recoil + aiming-beam flash (real F0-6, no hit
// detection of its own — purely cosmetic), then a real DISCRETE blast per
// wave (each one a single-frame hit in the real game, here a purple
// expanding "shockwave" ellipse) marching forward across the lane rather
// than one continuous sweeping beam. Real wave/blast color is purple for
// the player's own side (guide: "波動の色は味方が紫"), not the gold this
// build used before.
const CANNON_WAVE_COLOR = 0xb98cff; // real ally wave/blast color
const CANNON_RECOIL_MS = 333; // real 10F barrel recoil-and-return
const CANNON_BEAM_FLASH_MS = 200; // real F1-6 aiming-beam visual
// Real blast geometry (guide's own reference model): each blast is 400
// wide, the first one spanning -67.5..+332.5 relative to the caster, each
// next one advancing 200 further — used here directly as pixels rather
// than rescaled, since this canvas's own lane happens to be close enough
// in scale that a real 3-blast wave's total 732.5 reach already lands
// near this canvas's own ~750px playable lane width.
const CANNON_BLAST_WIDTH = 400;
const CANNON_BLAST_ADVANCE = 200;
const CANNON_BLAST_FIRST_CENTER_OFFSET = 332.5 - CANNON_BLAST_WIDTH / 2; // first blast's own center, relative to the caster
const CANNON_BLAST_LIFE_MS = 500; // real 15F visual lingers after each blast's single hit frame
const CANNON_BEAM_ORIGIN_X_FRACTION = 0.55; // of TOWER_PLAYER_DISPLAY_WIDTH
const CANNON_BEAM_ORIGIN_Y_FRACTION = 0.35; // of TOWER_SPRITE_DISPLAY_HEIGHT, above laneY

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // Phaser calls init(data) before preload() (create(data) gets the same
  // object again later) — preload() itself is always called with no
  // arguments, so this is the only way to know which stage (and therefore
  // which Treasure set) is being loaded in time to queue its icons below.
  init(data) {
    this.pendingTreasureSet = data.mode === 'dojo' ? null : findSetForStage(data.stageId);
  }

  // Real sprite art — Starter Axies for UNIT_CONFIG, PvE Chimeras for
  // ENEMY_CONFIG (see each file's `sprite` field and SpriteIcon.js) —
  // loaded once per texture key. Guarded by textures.exists (inside
  // preloadSpriteRoster) since this scene restarts fresh for every battle
  // and Phaser would otherwise re-fetch (and warn about) already-cached
  // textures each time; also shared with any other scene (e.g.
  // LoadoutScene) that preloads the same roster for its own portraits.
  preload() {
    preloadSpriteRoster(this, UNIT_CONFIG, true);
    preloadSpriteRoster(this, ENEMY_CONFIG, false);
    preloadBackgrounds(this);
    preloadAttackVfx(this);
    if (!this.textures.exists(TOWER_PLAYER_SPRITE_KEY)) this.load.image(TOWER_PLAYER_SPRITE_KEY, '/sprites/structures/tower_player.png');
    if (!this.textures.exists(TOWER_ENEMY_SPRITE_KEY)) this.load.image(TOWER_ENEMY_SPRITE_KEY, '/sprites/structures/tower_enemy.png');
    for (const { key, file } of Object.values(STATUS_ICON_TEXTURE)) {
      if (!this.textures.exists(key)) this.load.image(key, `/icons/status/${file}`);
    }
    // This stage's own Treasure Set art (see the victory-sequence reveal
    // card below) — only the 3 tier PNGs for the ONE set this stage
    // belongs to, not TreasureScene's full 108-file roster, since a battle
    // only ever reveals its own stage's set.
    if (this.pendingTreasureSet) {
      ['bronze', 'silver', 'gold'].forEach((tier) => {
        const key = `treasure_${this.pendingTreasureSet.icon}_${tier}`;
        if (!this.textures.exists(key)) this.load.image(key, `treasures/${this.pendingTreasureSet.icon}_${tier}.png`);
      });
    }
    // Music/sfx audio files need no Phaser preload step at all — Audio.js's
    // own playMusic/playSfxFile fetch+decode real files directly via the
    // Web Audio API (see its header comment), independent of Phaser's
    // loader/cache, the same as every other scene that plays a real sound.
  }

  create(data) {
    const { width, height } = LOGICAL_SIZE;

    // Sparring Grounds (bible §A.6.4's Catclaw Dojo) — a free, timed,
    // score-attack mode against an invincible base with endless waves,
    // reusing this exact combat engine. See the `this.mode === 'dojo'`
    // branches below/in damageBase/damageEnemyBase/onEnemyKilled/update
    // for the handful of points where it genuinely differs from a normal
    // stage: no Energy cost (enforced by HomeScene launching this scene
    // directly), an invincible player base, no destroy-the-enemy-base win
    // condition, endless escalating spawns instead of a scripted wave
    // list, a hard time limit instead of a base-HP-driven ending, no
    // money from kills, and no stage-clear rewards (XP/Treasure/Gems) —
    // just a best-score record (DojoProgress.js).
    this.mode = data.mode === 'dojo' ? 'dojo' : 'stage';
    this.stage =
      this.mode === 'dojo'
        ? {
            id: 'dojo',
            displayName: 'Sparring Grounds',
            baseHp: Infinity,
            enemyBaseHp: Infinity,
            startingMoney: DOJO_CONFIG.startingMoney,
            moneyAccrualPerSec: DOJO_CONFIG.moneyAccrualPerSec,
            spawnScript: [],
            baseXp: 0,
            gemsFirstClear: 0,
          }
        : STAGE_CONFIG.find((s) => s.id === data.stageId);

    // Worker Cat: an in-battle levelable economy building (bible §A.3.10/
    // §A.7.1 — confirmed real reference mechanic, not invented). Starts
    // every battle at level 1, using the stage's own moneyAccrualPerSec/
    // startingMoney as level-1's income rate/wallet cap; see
    // getMoneyAccrualPerSec/getWalletCap. Capped at MONEY_CONFIG.workerCat.maxLevel.
    this.workerCatLevel = 1;
    this.workerCatUpgradeCost = MONEY_CONFIG.workerCat.baseUpgradeCost * this.workerCatLevel;

    // Account-wide Base Upgrades (bible §A.7.1) — read once, since they
    // only change between battles via the Upgrade Menu. Cannon
    // power/charge feed the Cat Cannon constants directly (see
    // updateCannonButton/triggerSpecialBurst); baseDefense/research/
    // accounting/study are read where their effect actually applies below.
    this.cannonPowerBonus = getBaseUpgradeEffect('cannonPower');
    // Cannon Power's own LEVEL (not just its damage bonus) is needed
    // separately — it also slows the charge (see the update() charge
    // formula below), a real trade-off this build didn't model before.
    this.cannonPowerLevel = getBaseUpgradeLevel('cannonPower');
    this.cannonWaveBonus = getBaseUpgradeEffect('cannonRange');
    // ms shaved off the cannon's total charge TIME (see
    // SPECIAL_CHARGE_DURATION_MS/CANNON_CHARGE_FLOOR_MS above) — renamed
    // from the old rate-based cannonChargePerSecBonus now that
    // BASE_UPGRADE_CONFIG's cannonCharge line is itself time-based.
    this.cannonChargeReductionMs = getBaseUpgradeEffect('cannonCharge');
    this.baseDefenseBonus = getBaseUpgradeEffect('baseDefense');
    this.rechargeReductionMs = getBaseUpgradeEffect('research');
    this.accountingBonusPercent = getBaseUpgradeEffect('accounting');
    this.studyBonusPercent = getBaseUpgradeEffect('study');
    // Treasure set bonus (bible §A.6.3, "Energy Drink") — same "only
    // changes between battles" reasoning as the Base Upgrades above (it's
    // earned via TreasureScene, never mid-fight), but this one used to be
    // re-read from localStorage and recomputed on every single frame via
    // getMoneyAccrualPerSec instead of cached here like its neighbors.
    this.moneyIncomeBonusPercent = getBonusPercent('moneyIncomePercent');

    // The player's chosen Formation (bible §A.10.3) — a fixed-length
    // sparse array (Loadout.js): this.loadout[i] is whichever unit is
    // permanently seated in deploy-bar slot i (Tripp always slot 0, Olek
    // slot 1, ... as a default), or null for an empty slot — never
    // filtered/compacted here, since createSpawnButtons reads it index by
    // index and a locked/invalid entry can't appear in it to begin with
    // (Loadout.js's own sanitizeSlot already guarantees that).
    this.loadout = loadLoadout();

    // Cat-Combo-equivalent team synergy (bible §A.7.3) — purely a function
    // of which units are in the current Formation, read once here and
    // applied at the relevant point below (starting money immediately;
    // attack%/crit-chance-bonus at unit-spawn time in trySpawnUnit).
    this.comboUnitAttackPercent = getComboBonusValue(this.loadout, 'unitAttackPercent');
    this.comboCritChanceBonus = getComboBonusValue(this.loadout, 'critChanceBonus');
    const comboStartingMoneyPercent = getComboBonusValue(this.loadout, 'startingMoneyPercent');

    createAttackVfxAnims(this);

    this.laneY = height * LANE_Y_RATIO;
    this.baseX = BASE_WIDTH / 2;
    // Base Defense (Base Upgrade, flat) then Treasure's baseHpPercent (a %
    // on top of that total) — same layering as every other stat here:
    // upgrades first, Treasure as the final global multiplier.
    this.baseMaxHp = Math.round((this.stage.baseHp + this.baseDefenseBonus) * (1 + getBonusPercent('baseHpPercent') / 100));
    this.baseHp = this.baseMaxHp;
    this.enemyBaseX = width - BASE_WIDTH / 2;
    this.enemyBaseMaxHp = this.stage.enemyBaseHp;
    this.enemyBaseHp = this.enemyBaseMaxHp;
    this.enemies = [];
    this.playerUnits = [];
    // Real per-stage spawn rules (see updateSpawns/normalizeSpawnEntry) —
    // each tracks its own progress (how many times it's fired, when it's
    // next eligible) independently, driven off this.elapsedMs every frame
    // rather than one-shot timers. Dojo's synthetic pseudo-stage has no
    // spawnScript at all, so this is always empty there.
    this.spawnState = (this.stage.spawnScript || []).map((entry) => {
      const rule = normalizeSpawnEntry(entry);
      return { entry, rule, spawnedCount: 0, nextMs: rule.firstMs };
    });
    // saga1's real 48 stages (firstMs-based entries) already author their
    // own unlimited/counted repeat rules directly from real data — nothing
    // more to do. saga2/saga3/Sparring Grounds still use the older, simpler
    // one-shot spawnDelayMs format (a real-data pass for those is future
    // work — see docs/BATTLE_CATS_MAPPING.md), which has no repeat fields
    // of its own; without a fallback those stages would now go completely
    // quiet once their fixed list ends. Preserve their prior behavior
    // exactly: repeat the LAST scripted (non-nonBlocking) entry forever,
    // 6s after its own first appearance, every 7s after that.
    const isLegacyStage = this.spawnState.length > 0 && this.spawnState.every((state) => state.entry.firstMs === undefined);
    if (isLegacyStage) {
      const legacyTrickleState = this.spawnState
        .filter((state) => !ENEMY_CONFIG[state.entry.enemyId]?.nonBlocking)
        .reduce((latest, state) => (!latest || state.rule.firstMs > latest.rule.firstMs ? state : latest), null);
      if (legacyTrickleState) {
        legacyTrickleState.rule = { ...legacyTrickleState.rule, repeatMs: [7000, 7000], maxCount: null };
      }
    }
    // Battle Items (bible §A.8) — consumed mid-battle via useBattleItem;
    // these flags are what their effects actually read at the relevant
    // point (getMoneyRampMultiplier, getXpReward, winStage's Treasure roll).
    this.moneyRampBypassed = false; // Rich Cat
    this.xpBoostMultiplier = 1; // XP Boost
    this.treasureRadarActive = false; // Treasure Radar
    this.continuesUsed = 0; // Continue (bible §A.3.9) — see CONTINUE_GEM_COSTS
    this.aliveBossCount = 0; // how many currently-alive enemies are boss-tagged — see spawnScriptedEnemy/onEnemyKilled/updateBossMusic
    this.isBossMusicPlaying = false; // mirrors whether Audio.js's active track is the boss theme — see updateBossMusic
    // Real Battle Cats always starts a battle at 0¥ regardless of Worker
    // Cat level or wallet cap (guide's own "1プレイの流れ": "バトル開始：
    // お金0円...から始まる") — there is no "start with a full wallet"
    // mechanic at all. Combo's "Starting Money Up" is the one real
    // exception: a genuine up-front bonus (a % of the wallet cap), not a
    // top-up of an otherwise-full pool, so with no such combo active this
    // correctly comes out to exactly 0.
    this.money = this.getWalletCap() * (comboStartingMoneyPercent / 100);
    this.enemiesKilled = 0;
    this.specialMeter = 0;
    this.enemyBaseCurseMs = 0; // curse landed on the enemy base — currently a no-op, nothing to suppress there yet
    this.elapsedMs = 0;
    this.isGameOver = false;
    this.isPaused = false; // see setPaused — true while Options/tutorial/Quit-confirm/Continue-offer is up
    // Popup-tracking fields reset here for the same reason isGameOver/
    // isPaused are: Phaser reuses this same scene INSTANCE across every
    // scene.start (it's registered as a class in main.js), so a stale
    // non-null reference left over from a PREVIOUS visit survives into
    // this fresh create() otherwise. quitConfirmObjects specifically had a
    // real bug from this: the Quit button jumps straight to
    // scene.start('HomeScene') without calling hideQuitConfirm() first, so
    // it never got nulled out — meaning showQuitConfirm()'s own
    // "if (this.quitConfirmObjects) return" guard would then silently
    // no-op on every later battle this same instance ever loaded again,
    // permanently breaking Retreat's confirm dialog (found while chasing
    // the analogous StageSelectScene.isLeavingScene bug this same pass).
    this.quitConfirmObjects = null;
    this.settingsPopupObjects = null;
    this.tutorialObjects = null;
    // Speed Up (bible §A.10.4) — an unlimited toggle in this build (the
    // real game gates 2x/3x behind item charges and a subscription perk;
    // out of scope here, see the Battle Items note in this session's
    // commit). Scales BOTH this scene's own per-frame deltaMs (see update)
    // and Phaser's own timer clock (this.time.timeScale), so scripted
    // enemy spawns and the special-burst flash speed up consistently too.
    this.speedMultiplier = 1;
    // Explicit reset (not just relying on Phaser's own Clock lifecycle) for
    // the same reused-scene-instance reason as the popup-tracking fields
    // above — see setPaused, which is the only other place this gets
    // written, for why a stale non-1 value here would matter.
    this.time.timeScale = 1;

    // Per-unit-type redeploy cooldown (bible §A.3.2/§A.3.7) — global floor
    // is 2000ms across every UNIT_CONFIG entry; see trySpawnUnit/update.
    this.unitCooldowns = {};
    for (const key of this.loadout) this.unitCooldowns[key] = 0;
    // The EFFECTIVE (Research-reduced / evolution-adjusted) full recharge
    // duration each unit's current cooldown counts down from — separate
    // from the raw UNIT_CONFIG.rechargeMs updateSpawnButtons' button.config
    // holds, since that never reflects those bonuses. See trySpawnUnit
    // (which sets both together) and updateSpawnButtons (which needs the
    // real duration, not the base one, to compute the overlay's fraction).
    this.unitCooldownDurations = {};

    // World-vs-UI camera split (see the zoom-controls setup near the end of
    // this method, setupZoomControls): cameras.main renders ONLY the
    // battlefield itself — backdrop, lane band, bases, unit/enemy sprites —
    // and is what scroll-wheel zoom actually zooms. this.uiCamera, added
    // further down, is a second always-zoom-1 camera on top of it for every
    // HUD element (spawn buttons, wallet, popups, ...), so the HUD never
    // changes size or position as the player zooms the battle. Every world
    // object created directly in this method (as opposed to later, in
    // spawnUnit/createEnemy/triggerSpecialBurst) gets collected here so
    // that, once every OTHER (i.e. UI) object this method builds also
    // exists, one bulk diff below can tell the two apart without threading
    // an ignore() call through every individual button/text helper.
    this.worldGameObjects = [];

    // Battle backdrop (see Backdrop.js) — added before everything else so
    // it sits behind the whole scene. Picked per stage-number sub-range
    // rather than per-saga (getStageBattleBackgroundId); dojo mode's
    // synthetic stage has no real stage number, so it falls back to the
    // first range's background.
    this.worldGameObjects.push(
      addBackground(this, this.mode === 'dojo' ? undefined : getStageBattleBackgroundId(this.stage.id)),
    );

    // Origin (0, 0.5) at x=0 — edge-anchored rather than centered on baseX
    // (only 30px from the edge) — so the full sprite always renders
    // on-canvas regardless of its display width. baseX/enemyBaseX stay
    // exactly where combat math already expects them; only this visual's
    // own anchor point moved.
    this.base = this.add
      .image(0, this.laneY, TOWER_PLAYER_SPRITE_KEY)
      .setOrigin(0, 0.5)
      .setDisplaySize(TOWER_PLAYER_DISPLAY_WIDTH, TOWER_SPRITE_DISPLAY_HEIGHT)
      .setFlipX(true); // flipped so both towers face inward at each other — see the sprite constants' own comment above
    this.worldGameObjects.push(this.base);
    // Left-anchored (not centered on baseX): the base sits flush against the
    // canvas's left edge, so a centered "current/max" string would overflow
    // past x=0 (confirmed via direct measurement — a 76px-wide string
    // centered at baseX=30 spans -8..68). Anchoring to the left edge and
    // growing rightward keeps it fully on-screen regardless of digit count.
    // Raised further above laneY (BASE_HP_TEXT_Y_OFFSET) and shrunk so the
    // tall tower sprite has clear room beneath it instead of overlapping.
    this.baseHpText = this.add
      .text(2, this.laneY - BASE_HP_TEXT_Y_OFFSET, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);
    this.worldGameObjects.push(this.baseHpText);

    // Mirror of the player tower: origin (1, 0.5) at x=width, so it's the
    // RIGHT edge of the (mirrored) image pinned to the canvas's right edge
    // instead of centered on enemyBaseX (only 30px from that edge).
    this.enemyBase = this.add
      .image(width, this.laneY, TOWER_ENEMY_SPRITE_KEY)
      .setOrigin(1, 0.5)
      .setDisplaySize(TOWER_ENEMY_DISPLAY_WIDTH, TOWER_SPRITE_DISPLAY_HEIGHT);
    this.worldGameObjects.push(this.enemyBase);
    // Mirror of the above: right-anchored, growing leftward from the
    // canvas's right edge.
    this.enemyBaseHpText = this.add
      .text(width - 2, this.laneY - BASE_HP_TEXT_Y_OFFSET, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(1, 0.5);
    this.worldGameObjects.push(this.enemyBaseHpText);

    // Top-left: a pause icon (screenshot-confirmed reference position/
    // behavior — tapping it pauses the fight and opens an Options popup
    // with SFX/BGM volume and a Retreat action), then the stage name
    // alongside it.
    this.createPauseButton();
    this.add.text(46, 16, this.stage.displayName, {
      fontFamily: 'Rowdies, sans-serif', fontSize: '18px',
      color: '#ffcf3d',
      stroke: '#1d1a16', strokeThickness: 4,
    });

    // Top-right: a single combined "current/cap円" wallet readout
    // (confirmed screenshot format/position — replaces this build's old
    // separate top-left money text + small "Cap: ¥Y" line). Bold outlined
    // text directly on the battle backdrop, no pill behind it — matches
    // the reference screenshot exactly (unlike every other screen's dark
    // resource pill, the battle HUD's own money readout has no background).
    this.walletText = this.add
      .text(width - 16, 16, `${Math.round(this.money).toLocaleString()}/${Math.round(this.getWalletCap()).toLocaleString()}円`, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '22px',
        color: '#ffe58a',
        stroke: '#1d1a16', strokeThickness: 5,
      })
      .setOrigin(1, 0);

    this.createWorkerCatButton();
    this.createCannonButton();
    this.createSpeedUpButton();

    // Backing bar (reference screenshot: a translucent black stripe behind
    // the victory banner/reward lines, for legibility over the battle
    // backdrop) — hidden until showEndScreen actually has something to show.
    this.gameOverBackdrop = this.add.rectangle(width / 2, height / 2, width, 150, 0x000000, 0.55).setVisible(false);
    this.gameOverText = this.add
      .text(width / 2, height / 2, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '28px',
        color: '#ffffff',
        align: 'center',
        stroke: '#1d1a16', strokeThickness: 6,
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    if (this.mode === 'dojo') {
      this.dojoTimeRemainingMs = DOJO_CONFIG.timeLimitMs;
      this.dojoTimerText = this.add
        .text(width / 2, 16, '', { fontFamily: 'Rowdies, sans-serif', fontSize: '16px', color: '#ffdd33' })
        .setOrigin(0.5, 0);
    } else {
      // Battle Items (bible §A.8) only make sense against a real stage
      // clear — Sparring Grounds has no Treasure/XP reward for any of them
      // to affect, and its top-center is already the dojo timer's spot.
      this.createBattleItemButtons();
    }

    this.createSpawnButtons();

    // Low-HP base warning overlay (see updateLowHpVignette) — starts fully
    // transparent; added here (before setupZoomControls' bulk UI sweep) so
    // it's automatically classified as a UI object without its own
    // explicit ignore() call, same as every other HUD element above.
    this.lowHpVignette = this.add.rectangle(width / 2, height / 2, width, height, 0xff0000, 0);

    // Hover tooltip (see createBattleTooltip/showBattleTooltip) — wired to
    // both the spawn buttons and every live unit/enemy sprite, so "what
    // does this thing actually do" is answerable without leaving the fight.
    this.createBattleTooltip();

    // Split the two cameras now that every UI object create() itself builds
    // (pause button, stage name, wallet, spawn buttons, worker cat/cannon/
    // speed buttons, dojo timer or battle item buttons, game-over text) has
    // been created — see setupZoomControls (also creates this.uiCamera)
    // and this.worldGameObjects' own comment above for why this can be one
    // bulk diff instead of an ignore() call at every UI helper.
    this.setupZoomControls();

    // 戦闘開始！！ transition, other half (guide Chapter 10's transition
    // table): this scene loads fully black — see StageSelectScene's
    // matching fadeOut right before this scene starts — and fades back in
    // over the remaining 16F (≈533ms) of that same 24F transition. Both
    // cameras (cameras.main = battlefield, uiCamera = fixed HUD — see
    // setupZoomControls just above) fade together so the deploy bar/HUD
    // comes in right alongside the battlefield instead of popping in
    // ahead of it. A full-screen fixed blocker (same "ignore cameras.main"
    // UI convention every other full-screen overlay in this file uses)
    // eats every click for that same window, matching the guide's own
    // "城と地面が確定してから入力可" (input only unlocks once the base/ground
    // have visually settled).
    //
    // Real bug, found live: this used this.time.delayedCall to self-destruct,
    // which is gated by this.time.timeScale — and the first-ever battle's
    // own tutorial (showBattleTutorial, called a few lines below) calls
    // setPaused(true) essentially the same instant this blocker is created,
    // freezing timeScale at 0 before the 533ms could ever elapse. The
    // blocker (depth 20000, full-screen, invisible) then never destroyed
    // itself and sat on top of the tutorial's own Next/Skip buttons
    // forever, silently swallowing every click — a first-time player could
    // never get past "Step 1 of 5", the game looked completely frozen. A
    // one-time UI transition blocker has no business being pausable in the
    // first place, so this now uses a plain setTimeout (always real time)
    // instead of the game's own pausable clock.
    const introFadeMs = 533;
    this.cameras.main.fadeIn(introFadeMs, 0, 0, 0);
    this.uiCamera.fadeIn(introFadeMs, 0, 0, 0);
    const introBlocker = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(20000)
      .setInteractive();
    this.cameras.main.ignore(introBlocker);
    setTimeout(() => introBlocker.destroy(), introFadeMs);

    // Enemy spawning starts the instant the battle does, matching real
    // Battle Cats (every stage's own spawn timing — STAGE_CONFIG.js's
    // firstMs — is authored relative to battle start, not the player's
    // first deploy; some stages spawn at firstMs:0, others hold off for a
    // few real seconds, and that's entirely per-stage, not universal). A
    // scripted stage's own spawnState (built above) just needs update()'s
    // per-frame updateSpawns() call, which no longer waits on anything;
    // Dojo mode has no spawnScript at all, so its own wave loop is kicked
    // off explicitly here instead.
    if (this.mode === 'dojo') this.scheduleDojoWaves();

    // First-battle walkthrough (see Tutorial.js/showBattleTutorial) — real
    // stages only, once ever per browser (Sparring Grounds is an optional
    // extra mode a player reaches from Home, not their first real fight,
    // so it doesn't need its own walkthrough).
    if (this.mode !== 'dojo' && !hasCompletedTutorial()) this.showBattleTutorial();

    playMusic(BATTLE_MUSIC_URL);
    // Warm the boss/victory/defeat tracks' decoded-buffer cache right now,
    // in the background, rather than only starting to fetch+decode them at
    // the exact moment one is needed — e.g. the defeat stinger firing the
    // instant a player declines the Continue offer (endGame) used to have
    // an audible gap here on a track that had never played yet this
    // session (see Audio.js's preloadMusic/bufferCache).
    preloadMusic(BOSS_MUSIC_URL);
    preloadMusic(VICTORY_MUSIC_URL);
    preloadMusic(DEFEAT_MUSIC_URL);
    // Stop the battle music no matter HOW this scene ends — Restart, Quit,
    // the post-battle Menu button, Next Stage, all of them just call
    // scene.start/scene.restart, and Phaser fires 'shutdown' on every one
    // of those. A single hook here beats sprinkling stopMusic() calls at
    // every exit point. Covers the boss track too now — both it and the
    // normal battle track go through the same Audio.js player (see
    // updateBossMusic), so there's nothing separate left to tear down.
    this.events.once('shutdown', () => stopMusic());
  }


  // Two-camera HUD split (Battle Cats-style scroll-to-zoom + drag-to-pan on
  // the battlefield only): cameras.main renders the world — it's what
  // getWorldPoint/setZoom/scrollX below actually operate on — and
  // this.uiCamera, added on top of it (so it draws after/in front), renders
  // the HUD at a fixed zoom 1/scroll 0 regardless. Each camera ignores the
  // other's objects; see this.worldGameObjects' own comment for how the UI
  // side of that split is gathered.
  setupZoomControls() {
    const { width, height } = LOGICAL_SIZE;

    // cameras.add's own width/height args are the camera's VIEWPORT, in
    // real canvas pixels (CANVAS_WIDTH/HEIGHT) — not world units — so this
    // one call site deliberately does NOT use LOGICAL_SIZE like everywhere
    // else in this file; it needs the whole physical canvas covered.
    this.uiCamera = this.cameras.add(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.uiCamera.ignore(this.worldGameObjects);
    const uiObjectsSoFar = this.children.list.filter((obj) => !this.worldGameObjects.includes(obj));
    this.cameras.main.ignore(uiObjectsSoFar);

    // Base HD render zoom (see RenderConfig.js) on both cameras — the HUD
    // camera stays pinned here forever (no pan/zoom of its own), while the
    // battlefield camera's own zoom/pan controls just below treat this as
    // their floor (WORLD_ZOOM_MIN), not literal 1x.
    this.cameras.main.setZoom(RENDER_SCALE);
    this.uiCamera.setZoom(RENDER_SCALE);

    // uiCamera has no bounds (it never pans), so nothing else would ever
    // correct its default scroll=0, which centers on world point
    // (viewport-width/2, viewport-height/2) in RAW viewport pixels — i.e.
    // (960, 540) on this 1920x1080 canvas — squashing the whole HUD into a
    // small corner instead of over the real 800x450 layout. cameras.main
    // gets the same fix implicitly, from setBounds just below (its bounds
    // exactly equal its display size, so the clamp forces the equivalent
    // scroll on its own).
    this.uiCamera.centerOn(width / 2, height / 2);

    // Real bug, found live: bounds exactly matching the canvas meant
    // Phaser's own bounds-clamp pinned scrollY's top/bottom edge flush
    // against world y=0/height at high zoom — anything a sprite rendered
    // PAST that edge (a knockback/jump arc lifting it above its own logical
    // y, or just a tall enemy near the top/bottom of its own bounding box)
    // was past what the camera's clamped scroll could ever show, so it
    // simply never rendered: a hard, consistent "invisible crop line" right
    // at the lane's own top/bottom edge. Vertical scroll is ALWAYS
    // programmatically forced to centerOnY(laneY) below (never freely
    // scrolled — see the wheel/drag handlers' own comments), so padding the
    // vertical bounds costs nothing: the framing is identical at every zoom
    // level, this only stops the clamp from ever kicking in and eating part
    // of a sprite. Horizontal bounds stay exact — that axis IS freely
    // pannable, and there's genuinely nothing to see past the battlefield's
    // own left/right edges.
    const VERTICAL_BOUNDS_PADDING = 150;
    this.cameras.main.setBounds(0, -VERTICAL_BOUNDS_PADDING, width, height + VERTICAL_BOUNDS_PADDING * 2);

    // Real bug, found live (still cropping after the padding above): the
    // old exact-fit bounds used to force-clamp scrollY to the one value
    // that centered the lane, as a free side effect — padding the bounds
    // removed that accidental centering without anything replacing it, so
    // the battle's very first frame (before the player ever touches the
    // zoom wheel below) sat wherever Phaser's default scroll happened to
    // land, not on the lane. Every wheel-zoom afterward calls centerOnY
    // itself and looks correct — this is the one frame that never did.
    this.cameras.main.centerOnY(this.laneY);

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(
        cam.zoom * (1 - deltaY * WORLD_ZOOM_WHEEL_SENSITIVITY),
        WORLD_ZOOM_MIN,
        WORLD_ZOOM_MAX,
      );
      if (newZoom === cam.zoom) return;

      // Zoom toward the cursor HORIZONTALLY only (the same feel as Figma/
      // Google Maps — scrolling near either base zooms in on THAT base) —
      // but real bug, found live: doing the same toward-cursor adjustment
      // VERTICALLY let a zoom-in centered near the top or bottom of the
      // screen end up looking at empty ground/sky instead of the lane,
      // since the battlefield is only ever one horizontal strip, not an
      // open 2D area worth free vertical framing. scrollY is fixed to
      // keep the lane centered at every zoom level instead — see
      // centerOnY's own single-line implementation, this is exactly what
      // it already does.
      const worldPointBeforeX = cam.getWorldPoint(pointer.x, pointer.y).x;
      cam.setZoom(newZoom);
      const worldPointAfterX = cam.getWorldPoint(pointer.x, pointer.y).x;
      cam.scrollX += worldPointBeforeX - worldPointAfterX;
      cam.centerOnY(this.laneY);
    });

    // Drag-to-pan — once zoomed in, scrolling alone can leave either base
    // (or anything else off toward an edge) out of view with no way back;
    // click-and-drag anywhere pans the same world camera the wheel above
    // zooms. No world object is ever interactive (see the grep-able
    // absence of setInteractive on anything but UI/popup elements), so
    // there's nothing for this to conflict with — only a real drag moves
    // the camera at all (a plain click ends up with ~0 movement, so a
    // button tap underneath is unaffected), and it's skipped entirely
    // while a popup has the game paused, matching every other
    // battle-affecting input in this scene.
    //
    // Horizontal only — same reasoning as the wheel handler's own
    // centerOnY: this is a single-lane battlefield, so the only place left
    // to explore by dragging is further down the lane, never up/down into
    // open ground. scrollY is never touched here at all — the wheel
    // handler's centerOnY call is the only thing that ever moves it after
    // setup, so it stays locked on the lane through any amount of
    // horizontal dragging.
    let isDraggingWorld = false;
    let dragStartX = 0;
    let dragStartScrollX = 0;

    this.input.on('pointerdown', (pointer) => {
      if (this.isPaused) return;
      isDraggingWorld = true;
      dragStartX = pointer.x;
      dragStartScrollX = this.cameras.main.scrollX;
    });

    this.input.on('pointermove', (pointer) => {
      if (!isDraggingWorld || !pointer.isDown) return;
      const cam = this.cameras.main;
      cam.scrollX = dragStartScrollX - (pointer.x - dragStartX) / cam.zoom;
    });

    this.input.on('pointerup', () => {
      isDraggingWorld = false;
    });
    this.input.on('pointerupoutside', () => {
      isDraggingWorld = false;
    });
  }

  // Real per-stage spawning (guide Chapter 14's own pseudocode) — every
  // rule is checked every frame against the CURRENT castle HP% and elapsed
  // time, rather than a fixed one-shot timer, so a rule armed at (say) 50%
  // castle HP fires the instant that threshold is actually crossed, however
  // long that takes, and an unlimited rule keeps re-rolling a fresh random
  // interval inside its own repeat range forever. This is what makes
  // reinforcement bursts, multi-phase bosses (several isBoss entries at
  // different thresholds), and endless per-enemy-type trickle all "just
  // work" from the same normalized shape (see normalizeSpawnEntry) without
  // any of them needing special-cased scheduling of their own.
  updateSpawns() {
    if (this.isGameOver || this.spawnState.length === 0) return;

    // Real Battle Cats spawn rules are authored relative to battle start
    // (frame 0 the instant the stage loads), not the player's first
    // deploy — see this.elapsedMs, which ticks from create() itself.
    const battleMs = this.elapsedMs;
    const percent = this.enemyBaseMaxHp > 0 ? (this.enemyBaseHp / this.enemyBaseMaxHp) * 100 : 0;
    // maxEnemiesOnField (real per-stage 出撃最大数 — see STAGE_CONFIG.js's
    // header note on what that column actually means) caps how many
    // enemies can be alive on the field AT ONCE, not how many the player
    // may deploy. A rule that's otherwise due just waits — it doesn't
    // consume its turn or reroll its repeat delay — so it fires the
    // instant a slot frees up (an enemy dies) rather than possibly missing
    // a whole extra repeat interval.
    const maxEnemiesOnField = this.stage.maxEnemiesOnField ?? Infinity;
    let aliveEnemyCount = this.enemies.reduce((count, enemy) => count + (enemy.hp > 0 ? 1 : 0), 0);
    for (const state of this.spawnState) {
      const { rule } = state;
      if (rule.maxCount !== null && state.spawnedCount >= rule.maxCount) continue;
      if (percent > rule.castleHpBelowPercent) continue;
      if (battleMs < state.nextMs) continue;
      if (aliveEnemyCount >= maxEnemiesOnField) continue;

      this.spawnScriptedEnemy(state.entry);
      aliveEnemyCount += 1;
      state.spawnedCount += 1;
      if (rule.repeatMs) {
        const [min, max] = rule.repeatMs;
        state.nextMs = battleMs + (min >= max ? min : min + Math.random() * (max - min));
      } else {
        state.nextMs = Infinity;
      }
    }
  }

  // Sparring Grounds' endless, escalating spawner (DOJO_CONFIG.js) — every
  // tierDurationMs the "tier" rises, enemies get tougher/faster/denser, and
  // more of them spawn per burst. Re-schedules itself, so it keeps running
  // until endDojo() sets isGameOver.
  getDojoTier() {
    return Math.floor(this.elapsedMs / DOJO_CONFIG.tierDurationMs);
  }

  scheduleDojoWaves() {
    if (this.isGameOver) return;

    const tier = this.getDojoTier();
    const burstSize = 1 + Math.floor(tier / DOJO_CONFIG.burstTierStep);
    const availableRoles = Object.keys(ENEMY_CONFIG).filter(
      (role) => tier >= (DOJO_CONFIG.roleUnlockTier[role] ?? 0),
    );

    for (let i = 0; i < burstSize; i += 1) {
      const role = availableRoles[Math.floor(Math.random() * availableRoles.length)];
      this.time.delayedCall(i * 250, () => {
        if (this.isGameOver) return;
        this.spawnDojoEnemy(role);
      });
    }

    const delay = Math.max(
      DOJO_CONFIG.minSpawnIntervalMs,
      DOJO_CONFIG.baseSpawnIntervalMs - tier * DOJO_CONFIG.spawnIntervalStepMs,
    );
    this.time.delayedCall(delay, () => this.scheduleDojoWaves());
  }

  spawnDojoEnemy(type) {
    const base = ENEMY_CONFIG[type];
    const tier = this.getDojoTier();
    const config = {
      ...base,
      hp: Math.round(base.hp * (1 + tier * DOJO_CONFIG.hpMultiplierPerTier)),
      moveSpeed: base.moveSpeed * (1 + tier * DOJO_CONFIG.speedMultiplierPerTier),
    };

    // Same rarity-driven size bump as a real stage's spawnScriptedEnemy —
    // Dojo reuses this same roster and shouldn't be the one place a
    // Legendary/Mythic enemy renders at its plain base size.
    const sizeMultiplier = ENEMY_RARITY_SIZE_MULTIPLIER[base.rarity] || 1;
    if (sizeMultiplier !== 1) {
      config.radius = Math.round(base.radius * sizeMultiplier);
      if (base.range === base.radius) config.range = config.radius;
    }

    this.createEnemy(type, config);
  }

  // Shared hover/long-press info tooltip (LoadoutScene's own tooltip does
  // the same job for the roster-browsing screens) — a fixed panel near the
  // top of the screen rather than one that follows the cursor/unit: a
  // battle sprite moves continuously, so anchoring the tooltip to wherever
  // it happened to be at hover-start would drift away from the pointer
  // almost immediately, and a fixed screen-space panel needs no per-frame
  // repositioning or world/camera coordinate math at all (this panel is a
  // UI object — see setupZoomControls — so it never itself pans/zooms with
  // the battlefield anyway).
  createBattleTooltip() {
    const { width } = LOGICAL_SIZE;
    const y = 92;
    this.battleTooltipContainer = this.add.container(width / 2, y).setDepth(1000).setVisible(false);
    this.battleTooltipBg = this.add.rectangle(0, 0, 260, 40, 0x000000, 0.92).setStrokeStyle(2, 0xffdd33);
    this.battleTooltipText = this.add
      .text(0, 0, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '11px',
        color: '#ffffff',
        align: 'left',
        wordWrap: { width: 280 },
        lineSpacing: 5,
      })
      .setOrigin(0.5);
    this.battleTooltipContainer.add([this.battleTooltipBg, this.battleTooltipText]);
  }

  // `liveStats` (optional): { hp, maxHp } for an actual on-field entity, so
  // its CURRENT (damaged) HP shows instead of just the max — omitted for a
  // spawn-button hover, where nothing has been deployed yet and only the
  // base stats mean anything.
  showBattleTooltip(config, liveStats = null) {
    const header = `${config.characterName}  (${config.abilityLabel || config.displayName})`;
    // Cost isn't repeated here even on a spawn-button hover (liveStats ===
    // null) — the button underneath already prints its own price, so this
    // stayed a plain HP/DMG line either way.
    const statsLine = liveStats
      ? `HP: ${Math.max(0, Math.round(liveStats.hp))}/${liveStats.maxHp}   DMG: ${config.damage}`
      : `HP: ${config.hp}   DMG: ${config.damage}`;
    const abilityLines = describeUnit(config);
    const lines = [header, statsLine, ...abilityLines.map((line) => `• ${line}`)];
    this.battleTooltipText.setText(lines.join('\n'));

    const padding = 12;
    const bounds = this.battleTooltipText.getBounds();
    this.battleTooltipBg.setSize(bounds.width + padding * 2, bounds.height + padding * 2);
    this.battleTooltipContainer.setVisible(true);
  }

  hideBattleTooltip() {
    this.battleTooltipContainer.setVisible(false);
  }

  // Wires hover (desktop) — pointerover/pointerout — to show/hide the
  // shared battle tooltip for one live unit/enemy sprite. Called after the
  // entity's own state object exists (spawnUnit/createEnemy), not inside
  // createEntityVisual itself, since the live-HP closure below needs to
  // keep reading `entity.hp` for as long as the sprite is hovered, not
  // just whatever it was at spawn time.
  setupEntityHoverTooltip(shape, entity) {
    shape.setInteractive({ useHandCursor: true });
    shape.on('pointerover', () => this.showBattleTooltip(entity.config, { hp: entity.hp, maxHp: entity.config.hp }));
    shape.on('pointerout', () => this.hideBattleTooltip());
  }

  createSpawnButtons() {
    const { height } = LOGICAL_SIZE;
    const keys = this.loadout;

    // The row's available width is bounded on the right by the Cannon
    // button's own footprint (bottom-right corner), not the full canvas —
    // at the original fixed BUTTON_WIDTH, even a single row of exactly 5
    // buttons already reached into the Cannon's circle (an existing,
    // easy-to-miss overlap caught while first checking this against a full
    // 10-unit row); centering within this narrower zone instead of the
    // whole canvas fixes both.
    // Left bound now clears the Worker Cat circle (moved to bottom-left —
    // see createWorkerCatButton) the exact same way zoneRight already
    // clears the Cannon circle, instead of the old fixed left margin that
    // assumed nothing but the row itself lived down here.
    const zoneLeft = this.workerCatX + this.workerCatRadius + SPAWN_ROW_CANNON_GAP;
    const zoneRight = this.cannonX - CANNON_BUTTON_RADIUS - SPAWN_ROW_CANNON_GAP;
    const zoneWidth = zoneRight - zoneLeft;

    // Always lay out the full MAX_LOADOUT_SIZE (10) grid, not just however
    // many units are actually in the Formation — a 2-unit Formation still
    // shows all 10 slots, the other 8 rendered as empty/greyed placeholders
    // (see the `!key` branch below), matching the real game's own deploy bar
    // rather than shrinking to (and enlarging) just the filled slots.
    const totalSlots = MAX_LOADOUT_SIZE;
    const columns = Math.min(totalSlots, SPAWN_BUTTONS_PER_ROW);
    const totalRows = Math.ceil(totalSlots / SPAWN_BUTTONS_PER_ROW);
    const buttonWidth = Math.min(BUTTON_WIDTH, (zoneWidth - (columns - 1) * BUTTON_GAP) / columns);
    const isCompact = buttonWidth < BUTTON_WIDTH - 1;
    const rowWidth = columns * buttonWidth + (columns - 1) * BUTTON_GAP;
    const startX = zoneLeft + (zoneWidth - rowWidth) / 2 + buttonWidth / 2;
    // The BOTTOM row sits at the original single-row position (unchanged
    // for a Formation of 5 or fewer); any earlier row(s) stack upward from
    // there.
    const bottomY = height - BUTTON_HEIGHT / 2 - 8;

    this.spawnButtons = [];

    for (let index = 0; index < totalSlots; index += 1) {
      const key = keys[index];
      const row = Math.floor(index / SPAWN_BUTTONS_PER_ROW);
      const col = index % SPAWN_BUTTONS_PER_ROW;
      const x = startX + col * (buttonWidth + BUTTON_GAP);
      const y = bottomY - (totalRows - 1 - row) * (BUTTON_HEIGHT + SPAWN_ROW_GAP);

      if (!key) {
        // Empty Formation slot — greyed, no icon/cost/interaction.
        this.add
          .rectangle(x, y, buttonWidth, BUTTON_HEIGHT, 0x555555)
          .setStrokeStyle(2, 0x000000)
          .setAlpha(0.5);
        continue;
      }

      const config = UNIT_CONFIG[key];

      // White fill + black outline (reference screenshot's real deploy-icon
      // frame) — replaces the old per-unit flat-color background now that
      // the icon itself (a tight face crop, not a colored silhouette) is
      // what tells units apart.
      const rect = this.add
        .rectangle(x, y, buttonWidth, BUTTON_HEIGHT, 0xffffff)
        .setStrokeStyle(2, 0x000000)
        .setInteractive({ useHandCursor: true });

      // Full-bleed face closeup (faceZoom — see SpriteIcon.js), stretched
      // via setDisplaySize (rather than addUnitIcon's own uniform
      // fit-inside-a-square scale) to reach every edge of the button —
      // the crop's own aspect ratio is already close to the button's, so
      // the stretch is minor. Matches the reference's "face fills the
      // whole icon" framing; falls back to nothing for any unit with no
      // sprite (none currently).
      const icon = addUnitIcon(this, x, y, config, BUTTON_HEIGHT, true, false, false, true);
      if (icon) icon.setDisplaySize(buttonWidth - 4, BUTTON_HEIGHT - 4);

      // Price only, bottom-right corner, yellow-on-black-outline (reference
      // screenshot) — the name/ability label this button used to carry is
      // dropped entirely now that the face closeup itself identifies the
      // unit.
      const costText = this.add
        .text(x + buttonWidth / 2 - 4, y + BUTTON_HEIGHT / 2 - 3, `${this.getUnitCost(config).toLocaleString()}円`, {
          fontFamily: 'Rowdies, sans-serif', fontSize: isCompact ? '10px' : '12px',
          color: '#ffe066',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(1, 1);

      // Recharge cooldown overlay (bible §A.3.2/§A.10.4's "cooldown fill" on
      // a unit's deploy icon) — a dark wipe that shrinks from full button
      // height to 0 as unitCooldowns[key] counts down; see updateSpawnButtons.
      const cooldownOverlay = this.add
        .rectangle(x, y - BUTTON_HEIGHT / 2, buttonWidth, 0, 0x000000)
        .setOrigin(0.5, 0)
        .setAlpha(0.6);

      rect.on('pointerdown', () => this.trySpawnUnit(key));
      // No liveStats — nothing's deployed yet, so the tooltip shows base
      // stats/cost instead of a current HP reading (see showBattleTooltip).
      // getEffectiveUnitConfig (not the raw UNIT_CONFIG `config` the icon/
      // cost text above use) so the preview reflects this unit's real
      // current level/evolution — the same stats trySpawnUnit will
      // actually deploy, not always its base-level numbers.
      rect.on('pointerover', () => this.showBattleTooltip(getEffectiveUnitConfig(key)));
      rect.on('pointerout', () => this.hideBattleTooltip());

      this.spawnButtons.push({ key, config, rect, icon, costText, cooldownOverlay });
    }

    // Whole-row bounding box (not any one button's) — see
    // showBattleTutorial, which highlights this entire zone rather than
    // one specific slot (which unit is even in slot 1 varies by Formation).
    const rowHeight = totalRows * BUTTON_HEIGHT + (totalRows - 1) * SPAWN_ROW_GAP;
    this.spawnRowBounds = {
      x: startX + (rowWidth - buttonWidth) / 2,
      y: bottomY - (rowHeight - BUTTON_HEIGHT) / 2,
      width: rowWidth,
      height: rowHeight,
    };
  }

  // Pause/Options (reference-screenshot-confirmed: a small pause icon,
  // top-left, opens an Options popup with SFX/BGM volume controls and a
  // Retreat action) — replaces this build's earlier standalone "Quit"
  // button with the real layout: Retreat now lives inside this popup
  // instead of its own top-level button.
  createPauseButton() {
    createBcCircleButton(this, 24, 16, 14, '⏸', () => this.showSettingsPopup(), { fontSize: 12 });
  }

  // Reference screenshot: a small modal card (title + close X, a Help
  // button and BGM-note/SFX-speaker/vibration icons, a "出陣スロット" deploy-
  // slot-layout toggle, and a big "戦闘離脱" Retreat button beneath). This
  // build covers what's actually implementable here — SFX/BGM volume and
  // Retreat — and skips Help (no help content exists yet), the deploy-slot
  // toggle (already handled automatically by createSpawnButtons' own
  // row-wrapping), and vibration (no haptics on web).
  showSettingsPopup() {
    if (this.settingsPopupObjects) return; // already showing
    this.setPaused(true);

    const { width, height } = LOGICAL_SIZE;
    const objects = [];
    const panelY = height / 2 - 30;

    objects.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setInteractive());
    // Grown 40px taller (extending only downward — see the +20 on the
    // panel's own y below, half the added height, which keeps the top edge
    // where it was) to fit the new Mute All row without cramming everything
    // else together.
    objects.push(drawBcPanel(this, width / 2, panelY + 20, 340, 270));
    objects.push(this.add.text(width / 2, panelY - 80, 'Options', { fontFamily: FONT, fontSize: '20px', color: BC.inkHex }).setOrigin(0.5));

    objects.push(createBcCircleButton(this, width / 2 + 155, panelY - 85, 14, '✕', () => this.hideSettingsPopup()));

    // Same master Mute toggle as HomeScene's own Options popup — this one
    // was missing in-battle entirely, the only place a player could get to
    // SFX/BGM levels mid-run but not the one override that supersedes both.
    objects.push(
      this.add
        .text(width / 2 - 130, panelY - 35, 'Mute All', { fontFamily: FONT, fontSize: '14px', color: BC.inkHex })
        .setOrigin(0, 0.5),
    );
    const muteButton = createBcButton(
      this, width / 2 + 100, panelY - 35, 100, 32, isMuted() ? 'On' : 'Off',
      () => {
        const muted = !isMuted();
        setMuted(muted);
        muteButton.bcText.setText(muted ? 'On' : 'Off');
      },
      { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 },
    );
    objects.push(muteButton);

    objects.push(
      this.add
        .text(width / 2 - 130, panelY + 5, 'SFX Volume', { fontFamily: FONT, fontSize: '14px', color: BC.inkHex })
        .setOrigin(0, 0.5),
    );
    const sfxButton = createBcButton(
      this, width / 2 + 100, panelY + 5, 100, 32, VOLUME_LEVEL_LABELS[getSfxVolumeLevel()],
      () => sfxButton.bcText.setText(VOLUME_LEVEL_LABELS[cycleSfxVolumeLevel()]),
      { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 },
    );
    objects.push(sfxButton);

    objects.push(
      this.add
        .text(width / 2 - 130, panelY + 45, 'BGM Volume', { fontFamily: FONT, fontSize: '14px', color: BC.inkHex })
        .setOrigin(0, 0.5),
    );
    const bgmButton = createBcButton(
      this, width / 2 + 100, panelY + 45, 100, 32, VOLUME_LEVEL_LABELS[getBgmVolumeLevel()],
      () => bgmButton.bcText.setText(VOLUME_LEVEL_LABELS[cycleBgmVolumeLevel()]),
      { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 },
    );
    objects.push(bgmButton);

    // Replays the first-battle walkthrough on demand — Tutorial.js only
    // ever shows it once unprompted, so this is the one way back to it for
    // a player who skipped it, or just wants the refresher.
    objects.push(
      createBcButton(this, width / 2, panelY + 82, 220, 32, 'How to Play', () => {
        this.hideSettingsPopup({ keepPaused: true });
        this.showBattleTutorial();
      }, { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 14 }),
    );

    // Hands off to the existing Yes/No confirm rather than retreating
    // immediately — same "don't throw away a live run on one accidental
    // tap" reasoning as before, just reached from inside Options now.
    objects.push(
      createBcButton(this, width / 2, panelY + 124, 220, 40, 'Retreat', () => {
        this.hideSettingsPopup({ keepPaused: true });
        this.showQuitConfirm();
      }, { fill: BC.red, highlight: BC.redHighlight, textColor: '#ffffff', fontSize: 16 }),
    );

    this.cameras.main.ignore(objects); // UI (see setupZoomControls) — stays fixed regardless of battle zoom
    this.settingsPopupObjects = objects;
  }

  hideSettingsPopup(opts = {}) {
    if (!this.settingsPopupObjects) return;
    this.settingsPopupObjects.forEach((obj) => obj.destroy());
    this.settingsPopupObjects = null;
    if (!opts.keepPaused) this.setPaused(false);
  }

  // First-battle walkthrough (new request: a fresh player dropped straight
  // into this HUD has no way to guess what the spawn bar, Worker Cat, or
  // the Cat Cannon actually do). A short guided tour — one target
  // highlighted at a time, a callout with what it does, Back/Next/Skip —
  // rather than a wall of text up front; Tutorial.js remembers it's been
  // seen (or skipped) so it never runs again unprompted. Replayable anytime
  // from the Options popup's own "How to Play" button.
  //
  // Step positions are read live off this scene's own already-placed HUD
  // (this.spawnRowBounds/workerCatX/cannonX/laneY, ...) rather than
  // hardcoded coordinates, so a future layout tweak to any of those
  // elements can't silently leave the tutorial pointing at empty space.
  getTutorialSteps() {
    const { width } = LOGICAL_SIZE;
    return [
      {
        targets: [
          { x: TOWER_PLAYER_DISPLAY_WIDTH / 2, y: this.laneY, w: TOWER_PLAYER_DISPLAY_WIDTH + 12, h: TOWER_SPRITE_DISPLAY_HEIGHT + 12 },
          { x: width - TOWER_ENEMY_DISPLAY_WIDTH / 2, y: this.laneY, w: TOWER_ENEMY_DISPLAY_WIDTH + 12, h: TOWER_SPRITE_DISPLAY_HEIGHT + 12 },
        ],
        text: 'Destroy the enemy base before yours falls. That’s the whole goal — everything else is just how you get there.',
      },
      {
        targets: [{
          x: this.spawnRowBounds.x, y: this.spawnRowBounds.y,
          w: this.spawnRowBounds.width + 12, h: this.spawnRowBounds.height + 12,
        }],
        text: 'Tap a unit here to deploy it onto the field. Each one costs money, and refills on its own cooldown after you use it.',
      },
      {
        // Read the wallet text's OWN real rendered bounds rather than a
        // guessed rect — a hand-guessed box (previously x: width-90, y:16,
        // w:180, h:36) drifts out of alignment the moment the actual
        // string's length/position doesn't match the guess (origin (1,0)
        // means it grows leftward/downward from its anchor, not centered
        // on it), which is exactly the bug this replaces.
        targets: [(() => {
          const b = this.walletText.getBounds();
          return { x: b.centerX, y: b.centerY, w: b.width + 20, h: b.height + 14 };
        })()],
        text: 'Your money fills up on its own over time — there’s no way to "save up" beforehand, so spend it as it comes in.',
      },
      {
        targets: [{
          x: this.workerCatX, y: this.workerCatY,
          w: this.workerCatRadius * 2 + 16, h: this.workerCatRadius * 2 + 50,
        }],
        text: 'Worker Cat: spend money here to raise both your income rate and how much money you can hold at once.',
      },
      {
        targets: [{ x: this.cannonX, y: this.cannonY, w: CANNON_BUTTON_RADIUS * 2 + 16, h: CANNON_BUTTON_RADIUS * 2 + 16 }],
        text: 'The Rune Cannon charges on its own during the fight. Tap it once the ring fills all the way to unleash a powerful attack.',
      },
    ];
  }

  showBattleTutorial() {
    this.setPaused(true);
    this.tutorialStepIndex = 0;
    this.renderTutorialStep();
  }

  renderTutorialStep() {
    if (this.tutorialObjects) this.tutorialObjects.forEach((obj) => obj.destroy());

    const steps = this.getTutorialSteps();
    const step = steps[this.tutorialStepIndex];
    const { width, height } = LOGICAL_SIZE;
    const objects = [];

    objects.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setInteractive());

    // Bright gold outline around each target rect — no dimming cutout/mask
    // needed for "look here" to read clearly on top of the dim overlay
    // above.
    const highlight = this.add.graphics();
    highlight.lineStyle(4, BC.gold, 1);
    for (const t of step.targets) {
      highlight.strokeRoundedRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h, 10);
    }
    objects.push(highlight);

    // Callout panel — anchored below the target on the top half of the
    // screen, above it on the bottom half, so it never overlaps what it's
    // pointing at regardless of which step this is.
    const firstTarget = step.targets[0];
    const calloutY = firstTarget.y < height / 2 ? Math.min(height - 110, firstTarget.y + firstTarget.h / 2 + 90) : Math.max(110, firstTarget.y - firstTarget.h / 2 - 90);
    const panelWidth = width - 80;
    const panelHeight = 130;
    objects.push(drawBcPanel(this, width / 2, calloutY, panelWidth, panelHeight));
    objects.push(
      this.add
        .text(width / 2, calloutY - panelHeight / 2 + 20, `Step ${this.tutorialStepIndex + 1} of ${steps.length}`, {
          fontFamily: FONT, fontSize: '12px', color: '#7a5c1e',
        })
        .setOrigin(0.5),
    );
    objects.push(
      this.add
        .text(width / 2, calloutY, step.text, {
          fontFamily: FONT, fontSize: '13px', color: BC.inkHex, align: 'center',
          wordWrap: { width: panelWidth - 40 }, lineSpacing: 4,
        })
        .setOrigin(0.5),
    );

    const buttonY = calloutY + panelHeight / 2 - 26;
    const isLast = this.tutorialStepIndex === steps.length - 1;
    if (this.tutorialStepIndex > 0) {
      objects.push(
        createBcButton(this, width / 2 - 160, buttonY, 100, 36, 'Back', () => {
          this.tutorialStepIndex -= 1;
          this.renderTutorialStep();
        }, { fill: 0x8a8a8a, highlight: 0xbbbbbb, textColor: '#ffffff', fontSize: 13 }),
      );
    }
    objects.push(
      createBcButton(this, width / 2 + 160, buttonY, 100, 36, isLast ? 'Got it!' : 'Next', () => {
        if (isLast) this.closeTutorial();
        else {
          this.tutorialStepIndex += 1;
          this.renderTutorialStep();
        }
      }, { fontSize: 13 }),
    );
    if (!isLast) {
      objects.push(
        this.add
          .text(width / 2, buttonY, 'Skip', { fontFamily: FONT, fontSize: '12px', color: '#dddddd', stroke: '#000000', strokeThickness: 3 })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.closeTutorial()),
      );
    }

    this.cameras.main.ignore(objects); // UI (see setupZoomControls) — stays fixed regardless of battle zoom
    this.tutorialObjects = objects;
  }

  closeTutorial() {
    markTutorialCompleted();
    if (this.tutorialObjects) this.tutorialObjects.forEach((obj) => obj.destroy());
    this.tutorialObjects = null;
    this.setPaused(false);
  }

  // Battle Items (bible §A.8) — a compact top-center row, one button per
  // BATTLE_ITEMS_CONFIG entry, showing how many are held and greyed out at
  // zero. Tapping one with count > 0 spends it immediately (no confirm —
  // these are all beneficial, none of them risk anything the way Quit
  // does).
  createBattleItemButtons() {
    const { width } = LOGICAL_SIZE;
    const ids = Object.keys(BATTLE_ITEMS_CONFIG);
    const itemWidth = 76;
    const gap = 6;
    const totalWidth = ids.length * itemWidth + (ids.length - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + itemWidth / 2;
    const y = 48;

    this.battleItemButtons = ids.map((id, index) => {
      const config = BATTLE_ITEMS_CONFIG[id];
      const x = startX + index * (itemWidth + gap);

      const rect = this.add.rectangle(x, y, itemWidth, 34, config.color).setStrokeStyle(2, BC.ink).setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, y - 8, config.displayName, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '8px',
          color: '#000000',
          align: 'center',
          wordWrap: { width: itemWidth - 6 },
        })
        .setOrigin(0.5);
      const countText = this.add.text(x, y + 9, '', { fontFamily: 'Rowdies, sans-serif', fontSize: '9px', color: '#000000' }).setOrigin(0.5);

      rect.on('pointerdown', () => this.useBattleItem(id));

      return { id, rect, label, countText };
    });

    this.updateBattleItemButtons();
  }

  updateBattleItemButtons() {
    for (const button of this.battleItemButtons) {
      const count = getBattleItemCount(button.id);
      button.countText.setText(`x${count}`);
      button.rect.setAlpha(count > 0 && !this.isGameOver ? 1 : 0.35);
    }
  }

  useBattleItem(id) {
    if (this.isGameOver) return;
    if (!tryUseBattleItem(id)) return; // none held — nothing to do

    const config = BATTLE_ITEMS_CONFIG[id];
    if (config.effect === 'guaranteedTopTreasure') this.treasureRadarActive = true;
    else if (config.effect === 'richCat') this.moneyRampBypassed = true;
    else if (config.effect === 'xpBoost') this.xpBoostMultiplier = config.xpMultiplier;

    this.showRestrictionMessage(`Used ${config.displayName}!`);
    this.updateBattleItemButtons();
  }

  showQuitConfirm() {
    if (this.quitConfirmObjects) return; // already showing
    this.setPaused(true);

    const { width, height } = LOGICAL_SIZE;
    const objects = [];

    objects.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setInteractive());
    objects.push(drawBcPanel(this, width / 2, height / 2, 380, 160));
    objects.push(
      this.add
        .text(width / 2, height / 2 - 40, 'Quit this battle?\nProgress in this run will be lost.', {
          fontFamily: FONT, fontSize: '16px',
          color: BC.inkHex,
          align: 'center',
        })
        .setOrigin(0.5),
    );

    const buttonY = height / 2 + 30;
    // Same destination rule the post-battle Menu button already uses
    // (createEndScreenButtons): Dojo wasn't reached via Stage Select at all
    // (HomeScene launches it directly), so it has no saga stage list to go
    // back to — everything else returns to THIS stage's own saga list
    // rather than all the way out to the Home hub, so quitting mid-battle
    // drops you back where you'd actually pick another stage.
    objects.push(
      createBcButton(this, width / 2 - 80, buttonY, 130, 48, 'Quit', () => {
        this.scene.start(this.mode === 'dojo' ? 'HomeScene' : 'StageSelectScene', { sagaId: this.stage.saga });
      }, {
        fill: BC.red, highlight: BC.redHighlight, textColor: '#ffffff', fontSize: 16,
      }),
    );
    objects.push(
      createBcButton(this, width / 2 + 80, buttonY, 130, 48, 'Cancel', () => this.hideQuitConfirm(), {
        fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 16,
      }),
    );

    this.cameras.main.ignore(objects); // UI (see setupZoomControls) — stays fixed regardless of battle zoom
    this.quitConfirmObjects = objects;
  }

  hideQuitConfirm() {
    if (!this.quitConfirmObjects) return;
    this.quitConfirmObjects.forEach((obj) => obj.destroy());
    this.quitConfirmObjects = null;
    this.setPaused(false);
  }

  // Bottom-LEFT circular icon, mirroring the Cat Cannon's own bottom-right
  // placement exactly (reference screenshot: a round "LEVEL N" icon with
  // its cost in a pill underneath, sat at the same height as the spawn
  // button row's far side) — this used to sit top-left instead as a wide
  // rectangular card, which createCannonButton's OWN comment already
  // called out as the wrong position ("mirroring Worker Cat's bottom-left
  // placement") without anyone having actually moved it there.
  createWorkerCatButton() {
    const { height } = LOGICAL_SIZE;
    const radius = CANNON_BUTTON_RADIUS;
    const x = 16 + radius;
    // Shifted up an extra 16px versus the Cannon's own Y (which has no
    // text below it) — the cost pill drawn under this circle needs that
    // room, or it renders right at (and gets clipped by) the canvas'
    // bottom edge.
    const y = height - 16 - radius - 16;
    this.workerCatX = x;
    this.workerCatY = y;
    this.workerCatRadius = radius;

    const face = this.add.circle(x, y, radius, 0xffffff).setStrokeStyle(3, BC.ink);
    const hit = this.add.circle(x, y, radius, 0x000000, 0.001).setInteractive({ useHandCursor: true });

    const labelText = this.add
      .text(x, y, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '10px',
        color: BC.inkHex,
        align: 'center',
        lineSpacing: 1,
      })
      .setOrigin(0.5);

    // Cost pill sits BELOW the circle rather than sharing it (the circle
    // is barely big enough for the level line alone) — yellow-on-black-
    // outline, matching the spawn buttons' own cost-text convention.
    const costText = this.add
      .text(x, y + radius + 14, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '12px',
        color: '#ffe066',
        stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5);

    hit.on('pointerdown', () => this.tryUpgradeWorkerCat());

    this.workerCatButton = { rect: face, hit, labelText, costText };
  }

  // Bottom-right circular button (confirmed screenshot position, mirroring
  // Worker Cat's bottom-left placement) with a radial charge fill drawn via
  // Graphics — the confirmed real visual (a charge RING around the icon,
  // not a horizontal bar). Tapping it only does something once full; see
  // tryTriggerSpecialBurst.
  createCannonButton() {
    const { width, height } = LOGICAL_SIZE;
    this.cannonX = width - 16 - CANNON_BUTTON_RADIUS;
    this.cannonY = height - 16 - CANNON_BUTTON_RADIUS;

    this.cannonBase = this.add.circle(this.cannonX, this.cannonY, CANNON_BUTTON_RADIUS, CANNON_NOT_READY_COLOR).setStrokeStyle(3, BC.ink);
    this.cannonChargeGraphics = this.add.graphics();
    this.add
      .text(this.cannonX, this.cannonY, 'RUNE\nCANNON', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '10px',
        color: '#ffffff',
        align: 'center',
        stroke: '#1d1a16', strokeThickness: 3,
      })
      .setOrigin(0.5);

    // A hitArea Circle is defined in the object's own LOCAL space, which for
    // an Arc/Circle game object is top-left-anchored (0,0) to
    // (displayWidth, displayHeight) — NOT centered on the shape the way its
    // world x/y position is. A circle "centered" at local (0,0) actually
    // sits at the button's top-left corner, covering only its upper-left
    // quadrant (and an equal area beyond it, off the visible button
    // entirely) instead of the button itself, so a tap anywhere near the
    // visible circle's true center — which is what a player naturally taps
    // — silently misses. Centering the hitArea circle at (radius, radius)
    // instead matches it to the button's actual visible bounds.
    this.cannonBase
      .setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Circle(CANNON_BUTTON_RADIUS, CANNON_BUTTON_RADIUS, CANNON_BUTTON_RADIUS),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
      })
      .on('pointerdown', () => this.tryTriggerSpecialBurst());
  }

  // Speed Up (bible §A.10.4) — confirmed top-right position, just below the
  // wallet readout. See the speedMultiplier field comment in create() for
  // what toggling this actually scales.
  createSpeedUpButton() {
    const { width } = LOGICAL_SIZE;
    const x = width - 50;
    // Below the wallet readout (right-aligned at y=16, 20px font) — was
    // y=45, which put this button's top edge above the wallet text's own
    // bottom edge, visibly overlapping it.
    const y = 58;

    this.speedUpButton = this.add.rectangle(x, y, 68, 24, 0x555566).setStrokeStyle(2, BC.ink).setInteractive({ useHandCursor: true });
    this.speedUpText = this.add.text(x, y, '1x SPEED', { fontFamily: 'Rowdies, sans-serif', fontSize: '10px', color: '#ffffff' }).setOrigin(0.5);
    this.speedUpButton.on('pointerdown', () => this.toggleSpeedUp());
  }

  toggleSpeedUp() {
    this.speedMultiplier = this.speedMultiplier === 1 ? SPEED_UP_MULTIPLIER : 1;
    this.time.timeScale = this.speedMultiplier;
    this.speedUpText.setText(`${this.speedMultiplier}x SPEED`);
    this.speedUpButton.fillColor = this.speedMultiplier > 1 ? 0xffdd33 : 0x555566;
  }

  // The ONE place this.isPaused gets written (Options, the first-battle
  // tutorial, the mid-battle Quit confirm, and the base-destroyed Continue
  // offer all called `this.isPaused = true/false` directly before this).
  // isPaused alone only ever gated update()'s own per-frame deltaMs work —
  // it did nothing about Phaser's own Clock, so anything scheduled via
  // this.time.delayedCall (Cat Cannon's own multi-wave sequencing, Dojo's
  // self-rescheduling wave spawner, Surge Attack's delayed area hit) kept
  // firing in the background the whole time a popup had the game "paused".
  // Reuses the exact mechanism Speed Up already proved out for this same
  // Clock (this.time.timeScale) — 0 freezes every pending TimerEvent
  // without cancelling it, and un-pausing restores whatever speed setting
  // was actually active rather than resetting it to 1x.
  setPaused(paused) {
    this.isPaused = paused;
    this.time.timeScale = paused ? 0 : this.speedMultiplier;
  }

  // Level-1 values come from the stage itself; each Worker Cat level above 1
  // adds a flat amount on top (see MONEY_CONFIG.workerCat), then the
  // account-wide Treasure income bonus (bible §A.6.3, "Energy Drink")
  // multiplies the whole thing.
  getMoneyAccrualPerSec() {
    const base = this.stage.moneyAccrualPerSec + (this.workerCatLevel - 1) * MONEY_CONFIG.workerCat.accrualPerLevel;
    return base * (1 + this.moneyIncomeBonusPercent / 100) * this.getMoneyRampMultiplier();
  }

  // See MONEY_RAMP_START_MULTIPLIER/MONEY_RAMP_DURATION_MS above.
  getMoneyRampMultiplier() {
    if (this.moneyRampBypassed) return 1; // Rich Cat battle item (§A.8)
    const progress = Math.min(1, this.elapsedMs / MONEY_RAMP_DURATION_MS);
    return MONEY_RAMP_START_MULTIPLIER + (1 - MONEY_RAMP_START_MULTIPLIER) * progress;
  }

  getWalletCap() {
    const base = this.stage.startingMoney + (this.workerCatLevel - 1) * MONEY_CONFIG.workerCat.walletCapPerLevel;
    // Treasure's walletCapPercent, on top of Worker Cat's own per-level cap.
    return Math.round(base * (1 + getBonusPercent('walletCapPercent') / 100));
  }

  // Unit cost scales per stage/chapter, never per unit level (bible §A.3.7,
  // see STAGE_CONFIG.js's getStageCostMultiplier) — the single source every
  // afford-check, spawn-button label, and deduction reads from, so they
  // can't drift out of sync with each other.
  getUnitCost(config) {
    return Math.round(config.cost * getStageCostMultiplier(this.stage));
  }

  trySpawnUnit(key) {
    if (this.isGameOver) return;
    if (this.unitCooldowns[key] > 0) return;

    // Cost never scales with level/evolution (bible §A.3.2/§A.4.2) — always
    // checked/charged against the unit's plain UNIT_CONFIG cost (scaled only
    // by this stage's cost multiplier, bible §A.3.7 — see getUnitCost),
    // never the effective (leveled) config.
    const baseConfig = UNIT_CONFIG[key];
    const cost = this.getUnitCost(baseConfig);
    if (this.money < cost) return;

    // Restriction Stage checks (bible §A.6.5) — a no-op on any stage
    // without a `restrictions` block (including Sparring Grounds' synthetic
    // pseudo-stage, which never has one). costRange is checked against the
    // unit's UNSCALED base cost, matching how the restriction's own min/max
    // band was authored, independent of this stage's cost multiplier.
    const restrictions = this.stage.restrictions;
    if (restrictions?.bannedUnitTypes?.includes(key)) {
      this.showRestrictionMessage('Banned in this stage!');
      return;
    }
    if (restrictions?.costRange && (baseConfig.cost < restrictions.costRange.min || baseConfig.cost > restrictions.costRange.max)) {
      this.showRestrictionMessage(`Cost must be ${restrictions.costRange.min}-${restrictions.costRange.max}円!`);
      return;
    }
    // Global deploy limit (bible §A.3.11): every stage has SOME ceiling on
    // simultaneously-alive units, not just the ones that declare their own
    // (tighter) Restriction Stage value — the bible calls for "a wide
    // default ceiling," not "no ceiling at all," on ordinary stages.
    {
      const maxDeployed = restrictions?.maxDeployed ?? DEFAULT_MAX_DEPLOYED;
      const currentlyDeployed = this.playerUnits.filter((unit) => unit.hp > 0).length;
      if (currentlyDeployed >= maxDeployed) {
        this.showRestrictionMessage(`Max ${maxDeployed} units at once!`);
        return;
      }
    }

    // Recharge time DOES change with evolution (a True Form's
    // rechargeMultiplier — bible §A.4.4), so the cooldown uses the
    // effective config, computed once here rather than twice.
    const effectiveConfig = getEffectiveUnitConfig(key);
    // Account-wide Treasure HP bonus (bible §A.6.3, "Legendary Cat Shield")
    // and Cat-Combo attack/crit bonuses (bible §A.7.3) — all layered on top
    // of the unit's own level/evolution stats, not part of UnitStats.js's
    // per-unit formula, since they're GLOBAL modifiers rather than
    // anything specific to this one unit's own progression.
    const hpBonusMultiplier = 1 + getBonusPercent('unitHpPercent') / 100;
    // Treasure's own unitAttackPercent stacks independently alongside
    // Cat-Combo's attack bonus (real Battle Cats: "お宝効果とにゃんコンボ効果
    // は独立して掛け算される" — each is its own separate multiplier, not
    // summed into one shared percentage).
    const attackBonusMultiplier = (1 + this.comboUnitAttackPercent / 100) * (1 + getBonusPercent('unitAttackPercent') / 100);
    // Research Base Upgrade (bible §A.7.1) shaves flat time off every
    // unit's recharge, floored so it can never reach an unbeatable 0ms spam
    // rate; Treasure's redeployPercent then shaves a further % off that —
    // capped low in TREASURE_CONFIG.js specifically so it can't push
    // everything down to the floor on its own.
    const recharge = Math.max(
      MIN_RECHARGE_MS,
      (effectiveConfig.rechargeMs - this.rechargeReductionMs) * (1 - getBonusPercent('redeployPercent') / 100),
    );

    const finalConfig = {
      ...effectiveConfig,
      hp: Math.round(effectiveConfig.hp * hpBonusMultiplier),
      damage: Math.round(effectiveConfig.damage * attackBonusMultiplier * 100) / 100,
      critChance: effectiveConfig.critChance + this.comboCritChanceBonus,
      rechargeMs: recharge,
    };

    this.money -= cost;
    this.unitCooldowns[key] = recharge;
    this.unitCooldownDurations[key] = recharge;
    this.spawnUnit(key, finalConfig);
    // Real "summon" clip (Origins Asset Kit) instead of a synthesized
    // blip — deploy is the single most frequent action in a battle, so
    // this gets a real sound rather than the layered
    // synth-baseline-plus-real-flavor approach attack sounds use (see
    // AttackVfx.js's fireAttackVfx) — one clean sound, not two competing
    // ones, for the thing the player does constantly.
    playSfxFile('/audio/sfx/summon_on.wav', { gain: 0.6 });
    addLifetimeStat('unitsDeployed');
  }

  // Brief on-screen reason for a blocked Restriction Stage tap (bible
  // §A.6.5) — same "temporary bottom-of-screen text" pattern
  // StageSelectScene uses for its own "Not enough Energy!" message.
  showRestrictionMessage(text) {
    if (this.restrictionMessageText) this.restrictionMessageText.destroy();

    const { width } = LOGICAL_SIZE;
    this.restrictionMessageText = this.add
      .text(width / 2, 115, text, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '39px',
        color: '#ff6666',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.cameras.main.ignore(this.restrictionMessageText); // UI (see setupZoomControls)

    this.time.delayedCall(1500, () => {
      if (this.restrictionMessageText) {
        this.restrictionMessageText.destroy();
        this.restrictionMessageText = null;
      }
    });
  }

  tryUpgradeWorkerCat() {
    if (this.isGameOver) return;
    if (this.workerCatLevel >= MONEY_CONFIG.workerCat.maxLevel) return;
    if (this.money < this.workerCatUpgradeCost) return;

    this.money -= this.workerCatUpgradeCost;
    this.workerCatLevel += 1;
    this.workerCatUpgradeCost = MONEY_CONFIG.workerCat.baseUpgradeCost * this.workerCatLevel;
  }

  // `config` is the unit's EFFECTIVE (leveled + evolved) stat block — see
  // UnitStats.js — computed once by trySpawnUnit rather than recomputed here.
  spawnUnit(type, config) {
    const x = this.baseX + BASE_WIDTH / 2 + config.radius;
    const unitProgress = getUnitProgress(loadPlayerProgress(), type);
    const evolutionStage = unitProgress.evolutionStage;

    // Part evolution (see PartEvolution.js): a purely cosmetic, level-driven
    // milestone independent of the evoShard-driven evolutionStage above —
    // reaching level 10 swaps the unit to its real, official evolved
    // ("awakened") art (UNIT_CONFIG.js's `sprite.evolved`) where one exists,
    // plus a subtle glow. A unit with no real evolved art at all (currently
    // just Titan) gets the glow alone — it's still a real, visible signal
    // that this unit hit the milestone, just without art to swap to.
    const hasEvolved = hasReachedPartEvolution(unitProgress.level);
    const hasRealEvolvedArt = !!config.sprite?.evolved;
    const isEvolved = hasEvolved && hasRealEvolvedArt;

    const { shape, label, spriteImage } = this.createEntityVisual(x, config, '#000000', true, 1, isEvolved);

    const glowColor = EVOLUTION_STAGE_GLOW_COLOR[unitProgress.evolutionStage];
    if (spriteImage && hasEvolved && glowColor) {
      spriteImage.postFX.addGlow(glowColor, PART_EVOLUTION_GLOW_STRENGTH, 0, false, 0.1, 12);
    }

    // Evolution-stage visual cue: only the circle-placeholder fallback gets
    // a stroked ring — a sprite unit relies on the part-evolution glow
    // above alone (a separate star badge on top read as redundant/cluttered
    // once both existed at once).
    if (evolutionStage > 0 && !spriteImage) {
      shape.setStrokeStyle(EVOLUTION_RING_WIDTH[evolutionStage], EVOLUTION_RING_COLOR[evolutionStage]);
    }

    const entity = this.makeEntityState(type, config, shape, label, spriteImage, true, 1, isEvolved);
    this.playerUnits.push(entity);
    this.setupEntityHoverTooltip(shape, entity);
  }

  // Builds this entity's visual: real sprite art if its config gave it one
  // (Starter Axies for units, PvE Chimeras for enemies — see UNIT_CONFIG.js/
  // ENEMY_CONFIG.js's `sprite` field), otherwise the original colored-
  // circle-plus-letter placeholder (only used now if a future roster entry
  // ships with sprite: null). Both forms expose the same `.x`/`.setVisible`
  // surface so all the position/movement code elsewhere never needs to know
  // which one it has.
  //
  // `isPlayerSide` controls both the texture-key prefix (see preload's
  // comment on why unit/enemy keys can't share a bare `config.id`) and
  // facing: every pose was rendered facing screen-left (see
  // tools/sprite-gen) — that's already correct for an enemy (which walks/
  // attacks leftward, toward the player base) but backwards for a player
  // unit (which walks/attacks rightward), so only player-side sprites get
  // flipped horizontally. setFlipX is a property of the Image object
  // itself, not the texture, so it survives every later setEntityPose
  // texture swap without needing to be re-applied.
  // `visualScaleMultiplier` (default 1) is a pure display multiplier on top
  // of the usual radius-based fit, currently unused by anything (a boss's
  // bigger look now comes from its own pre-scaled config.radius instead —
  // see spawnScriptedEnemy/BOSS_VISUAL_SCALE_MULTIPLIER) — kept as a
  // general knob for whatever future entry wants to look bigger/smaller
  // than its radius alone would imply, without needing a hitbox to match.
  // `isEvolved` (player units only — see spawnUnit) selects the unit's real
  // evolved ("awakened") texture set instead of its base one, when
  // `config.sprite.evolved` exists — see UNIT_CONFIG.js's field comment and
  // PartEvolution.js.
  // One hidden real-Axie status icon per STATUS_ICON_ORDER entry, parked at
  // the entity's spawn position — updateStatusIcons shows/repositions/hides
  // these every frame rather than creating new ones, since which statuses
  // are active changes constantly but the set of possible statuses doesn't.
  createStatusIcons(shape) {
    const icons = {};
    for (const key of STATUS_ICON_ORDER) {
      const icon = this.add
        .image(shape.x, shape.y, STATUS_ICON_TEXTURE[key].key)
        .setDisplaySize(STATUS_ICON_DISPLAY_SIZE, STATUS_ICON_DISPLAY_SIZE)
        .setVisible(false);
      this.uiCamera.ignore(icon); // world object (see setupZoomControls) — zooms/pans with the battlefield
      icons[key] = icon;
    }
    return icons;
  }

  createEntityVisual(x, config, labelColor, isPlayerSide, visualScaleMultiplier = 1, isEvolved = false) {
    if (config.sprite) {
      const prefix = isPlayerSide ? 'unit' : 'enemy';
      const evolvedTag = isEvolved && config.sprite.evolved ? '_evolved' : '';
      // Explicit '__BASE' frame — see SpriteIcon.js's own addUnitIcon
      // comment: once any screen's faceZoom icon has registered a cropped
      // face frame on this same shared texture, an implicit/no-frame
      // add.image() on it can silently resolve to that crop instead of the
      // real full image. This is the actual in-battle sprite, so it's the
      // most visible place that bug showed up.
      const sprite = this.add.image(x, this.laneY, `${prefix}_${config.id}${evolvedTag}_idle`, '__BASE');
      sprite.setFlipX(isPlayerSide);
      this.fitSpriteToRadius(sprite, config.radius, visualScaleMultiplier);
      // Every unit/enemy sprite is a world object (see setupZoomControls) —
      // created well after that method's own one-time bulk ignore() call,
      // so it needs this explicit one instead.
      this.uiCamera.ignore(sprite);
      return { shape: sprite, label: null, spriteImage: sprite };
    }

    const shape = this.add.circle(x, this.laneY, config.radius, config.color);
    const label = this.add.text(x, this.laneY, config.label, {
      fontFamily: 'Rowdies, sans-serif', fontSize: '16px',
      color: labelColor,
    }).setOrigin(0.5);
    this.uiCamera.ignore([shape, label]);
    return { shape, label, spriteImage: null };
  }

  // Scales a freshly-textured sprite so every unit reads at a sensible,
  // consistent on-screen size — see SPRITE_MIN_DIAMETER/SPRITE_SIZE_SLOPE's
  // comment for why this is a floor-plus-gentle-slope rather than a plain
  // multiple of `radius`. Runs once, against the idle texture (see
  // setEntityPose's own comment for why every later pose reuses this same
  // fit rather than re-measuring itself) — idleMaxDim/baseTargetSize are
  // stashed on the sprite here so setEntityPose can rescale a later pose
  // relative to THIS one instead of blindly reapplying the same scale
  // factor to a texture of a very different native size.
  fitSpriteToRadius(sprite, radius, visualScaleMultiplier = 1) {
    const targetSize =
      (SPRITE_MIN_DIAMETER + Math.max(0, radius - SPRITE_MIN_RADIUS) * SPRITE_SIZE_SLOPE) * visualScaleMultiplier;
    sprite.idleMaxDim = Math.max(sprite.width, sprite.height);
    sprite.baseTargetSize = targetSize;
    sprite.setScale(targetSize / sprite.idleMaxDim);
  }

  // Stage mode: fixed script — no randomness, no tier-based auto-scaling.
  // Only hp is scaled (by the script entry's own statMultiplier) — per
  // STAGE_CONFIG.js's contract — EXCEPT for a boss's radius/range, which
  // need to keep pace with its visual size (see below).
  spawnScriptedEnemy(entry) {
    const base = ENEMY_CONFIG[entry.enemyId];
    // Real strength magnification scales BOTH hp and damage (guide Chapter
    // 13: "敵の実効体力/攻撃力 = 初期値 × 強さ倍率") — this only scaled hp
    // before, silently undertuning every saga2/saga3 stage's real damage
    // output (Chapter 1 itself is unaffected: its magnification is always
    // exactly 1, so this was invisible there).
    const config = {
      ...base,
      hp: Math.round(base.hp * entry.statMultiplier),
      damage: Math.round(base.damage * entry.statMultiplier),
    };

    // A boss needs to look BOSS_VISUAL_SCALE_MULTIPLIER bigger than its base
    // config would normally render, and a non-boss enemy's own rarity (see
    // ENEMY_RARITY_SIZE_MULTIPLIER) needs the same treatment — a scripted
    // boss takes its own multiplier instead of stacking both, since a
    // Legendary enemy scripted as a stage's boss should read as a normal
    // boss, not both bonuses compounding. Either way this inflates radius
    // directly (createEnemy's own fitSpriteToRadius sizes the sprite off
    // config.radius alone, so this IS what makes it look bigger — no
    // separate visual-only multiplier on top, which would double it up).
    // Left unscaled, radius/range would still be pure numbers with no idea
    // the sprite got bigger — inRange/getMaxRange only ever look at these
    // fields, never the actual rendered pixel size — so a small enough
    // unit's per-frame step could carry it from "not yet in range" to
    // "already past" without ever registering as in range at all, visibly
    // walking through the oversized sprite and straight on toward the
    // enemy base while it stands there undamaged. Scaling radius (and
    // range too, wherever range === radius — a pure melee identity) by the
    // same multiplier keeps the hitbox honest against what's actually on
    // screen.
    const sizeMultiplier = entry.isBoss ? BOSS_VISUAL_SCALE_MULTIPLIER : ENEMY_RARITY_SIZE_MULTIPLIER[base.rarity] || 1;
    if (sizeMultiplier !== 1) {
      config.radius = Math.round(base.radius * sizeMultiplier);
      if (base.range === base.radius) config.range = config.radius;
    }

    this.createEnemy(entry.enemyId, config, entry.isBoss);

    if (entry.isBoss) {
      this.triggerBossShockwave();
      this.aliveBossCount += 1;
    }
  }

  // Re-asserted every frame (see update()) rather than only reacting to the
  // spawn/kill events that change aliveBossCount — a boss dying is the
  // common case, but this stays correct regardless of how the track might
  // otherwise have gotten out of sync. Both tracks now go through the same
  // Audio.js playMusic player (see BATTLE_MUSIC_URL/BOSS_MUSIC_URL) — it
  // handles its own idempotency (calling it again with the track that's
  // already playing is a no-op) and keeps decoding/playing even while
  // muted/Off (at zero gain), so there's no separate "retry once volume
  // allows it" case to handle here the way a Phaser Sound object needed.
  updateBossMusic() {
    const shouldPlay = this.aliveBossCount > 0 && !this.isGameOver;
    if (shouldPlay && !this.isBossMusicPlaying) {
      playMusic(BOSS_MUSIC_URL);
      this.isBossMusicPlaying = true;
    } else if (!shouldPlay && this.isBossMusicPlaying) {
      playMusic(BATTLE_MUSIC_URL);
      this.isBossMusicPlaying = false;
    }
  }

  // See BOSS_SHOCKWAVE_* constants above.
  triggerBossShockwave() {
    const duration = KNOCKBACK_DURATION_MS * BOSS_SHOCKWAVE_DURATION_MULTIPLIER;

    for (const unit of this.playerUnits) {
      if (unit.hp <= 0) continue;
      const distance =
        (unit.config.knockbackDistance || BOSS_SHOCKWAVE_FALLBACK_DISTANCE) * BOSS_SHOCKWAVE_DISTANCE_MULTIPLIER;
      unit.knockbackVelocity = -distance / duration; // always leftward — bosses only ever spawn on the enemy side
      unit.knockbackMs = duration;
      unit.attackPhase = null;
      unit.phaseMs = 0;
    }

    this.showBossWarning();
    playBossShockwaveSfx();
    this.cameras.main.shake(300, 0.012);
  }

  showBossWarning() {
    const { width, height } = LOGICAL_SIZE;
    const text = this.add
      .text(width / 2, height / 2 - 60, 'BOSS!', { fontFamily: 'Rowdies, sans-serif', fontSize: '40px', color: '#ff3333', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.cameras.main.ignore(text); // UI (see setupZoomControls) — a fixed screen-center banner, not tied to a world position

    this.tweens.add({ targets: text, alpha: 1, duration: 200, yoyo: true, hold: 500, onComplete: () => text.destroy() });
  }

  createEnemy(type, config, isBoss = false) {
    const naiveX = this.enemyBaseX - BASE_WIDTH / 2 - config.radius;
    // Never let a freshly spawned enemy appear already past (left of) a
    // player unit parked ahead of that naive spawn point — e.g. a
    // short-range melee unit attacking the enemy base sits CLOSER to that
    // base than a wider-radius enemy's own naive spawn x, which used to
    // let the new enemy pop in behind it: the player would see it "walk
    // past" their unit (it was simply already on the wrong side from the
    // instant it spawned), and the two would fight back-to-back, since
    // each sprite's facing is fixed by side (player always facing right,
    // enemy always facing left) and never recomputed from relative
    // position. Clamping the spawn to at least the frontmost unit's own
    // engagement boundary keeps every enemy spawning in front of (right
    // of) whatever's already fighting there, same as the per-frame
    // advance-clamp already does for movement.
    let spawnBlockX = -Infinity;
    for (const unit of this.playerUnits) {
      if (unit.hp <= 0 || unit.warpMs > 0) continue;
      const entryX = unit.shape.x + this.getMaxRange(config) + unit.config.radius;
      if (entryX > spawnBlockX) spawnBlockX = entryX;
    }
    // Capped at the base's own center rather than its (tighter) engagement
    // edge — a deeply-parked long-range unit can legitimately push the
    // block boundary past the edge, and spawning right at the base's
    // doorstep instead of teleporting past it is still correct; only an
    // actual overlap with the base sprite itself needs guarding against.
    const x = Math.min(this.enemyBaseX, Math.max(naiveX, spawnBlockX));
    // No separate visual-only multiplier here anymore — a boss's config
    // already comes in with radius/range pre-scaled by
    // BOSS_VISUAL_SCALE_MULTIPLIER (see spawnScriptedEnemy), so the normal
    // radius-based sizing below already renders it bigger on its own;
    // multiplying again on top of that would double-scale it.
    const visualScaleMultiplier = 1;
    const { shape, label, spriteImage } = this.createEntityVisual(x, config, '#ffffff', false, visualScaleMultiplier);

    const entity = this.makeEntityState(type, config, shape, label, spriteImage, false, visualScaleMultiplier);
    entity.isBoss = isBoss; // see spawnScriptedEnemy/onEnemyKilled — drives updateBossMusic
    this.enemies.push(entity);
    this.setupEntityHoverTooltip(shape, entity);
  }

  // Shared initial-state shape for both player units and enemies (bible
  // Part C's Unit/Enemy schemas share the same combat-relevant fields).
  makeEntityState(
    type,
    config,
    shape,
    label,
    spriteImage = null,
    isPlayerSide = false,
    visualScaleMultiplier = 1,
    isEvolved = false,
  ) {
    return {
      type,
      config,
      shape,
      label,
      // Real sprite art (see createEntityVisual) or null for a circle
      // placeholder — currentPose tracks which of idle/attack/hit texture
      // is currently showing so setEntityPose can skip redundant
      // setTexture calls. See updateEntityPoses/getDesiredPose/setEntityPose.
      // isPlayerSide is only needed here so setEntityPose can rebuild the
      // same 'unit_'/'enemy_' prefixed texture key createEntityVisual used.
      // visualScaleMultiplier is a pure display multiplier, currently
      // always 1 in practice (see createEntityVisual's own comment) —
      // createEntityVisual is the only place it's actually applied
      // (setEntityPose never touches scale; see its own comment), kept
      // here only so it's available if a future
      // caller needs to know an entity's boss-ness after the fact.
      // isEvolved (player units only) is the same idea for the real evolved
      // texture set — see createEntityVisual/UNIT_CONFIG.js's
      // `sprite.evolved` field — fixed for the unit's whole time on the
      // field, since level doesn't change mid-battle.
      spriteImage,
      isPlayerSide,
      visualScaleMultiplier,
      isEvolved,
      currentPose: spriteImage ? 'idle' : null,
      // True only on a tick where this entity actually steps forward with
      // no target — see updatePlayerUnits/updateEnemies. Drives the 'run'
      // pose in getDesiredPose so a unit reads as walking instead of
      // sliding in place while it closes distance; falls back to 'idle'
      // for the one enemy with no move animation to render (see
      // ENEMY_CONFIG.js's sniper/Dryad Ranger entry).
      isMoving: false,
      // run-pose animation state — see updateRunCycle. runCycleMs tracks
      // position within one full run-sequence loop (reset whenever the
      // run pose is (re-)entered, in setEntityPose); runFrame is just the
      // last-set frame index, kept so updateRunCycle only calls setTexture
      // on an actual frame change rather than every tick.
      runCycleMs: 0,
      runFrame: 0,
      // Idle-pose breathing state — see updateIdleCycle. idleCycleMs starts
      // at a random offset (not 0, and not clamped to any one entry's own
      // real cycle length, which varies quite a bit per character/enemy —
      // updateIdleCycle's own modulo wraps whatever this is down to a
      // valid frame on its very first tick regardless) so a field full of
      // units spawned at different moments doesn't all breathe in visible
      // lockstep; idleFrame starts at -1 (not a real frame index) so that
      // first tick always counts as "changed" and actually sets a texture,
      // rather than possibly matching frame 0's default and silently
      // no-op'ing until the cycle comes back around.
      idleCycleMs: Math.random() * 5000,
      idleFrame: -1,
      // Attack lunge (see updateAttackLunge) — the px of forward offset
      // CURRENTLY applied to shape.x, so that method can compute this
      // tick's desired offset and adjust shape.x by just the difference,
      // rather than needing its own separate "resting position" bookkeeping.
      attackLungeOffset: 0,
      hp: config.hp,
      // Foreswing/backswing attack-cycle state (bible §A.3.4) — see
      // tickCombatPhase. null/0 means "not yet started a windup."
      attackPhase: null,
      phaseMs: 0,
      // Knockback slide state (see tickKnockback) plus the HP-threshold
      // "endurance" bookkeeping that decides WHEN a stagger triggers (bible
      // §A.3.5) — see resolveKnockback.
      knockbackMs: 0,
      knockbackVelocity: 0,
      knockbacksUsed: 0,
      hpAtLastKnockback: config.hp,
      slowMs: 0,
      slowMultiplier: 1,
      stopMs: 0,
      weakenMs: 0,
      weakenMultiplier: 1,
      curseMs: 0,
      // Warp state (bible §A.3.8) — while warpMs > 0 the entity is fully
      // removed from play (invisible, untargetable, no AI at all, same as
      // Stop but with visibility toggled too) — see tickStatusEffects and
      // the warpMs guards in updatePlayerUnits/updateEnemies. warpOffset is
      // the signed distance applied once warpMs reaches 0.
      warpMs: 0,
      warpOffset: 0,
      // One reusable icon per status type (see STATUS_ICON_TEXTURE), shown/
      // hidden and repositioned every frame in updateStatusIcons — created
      // once here rather than churned per-frame.
      statusIcons: this.createStatusIcons(shape),
      // Barrier shield (bible §A.3.8) — starts full if this config has one;
      // 0/undefined configs never enter the barrier-absorption branch at
      // all, see applyDamageAndEffects.
      barrierHp: config.barrierMaxHp || 0,
      // Dodge (bible §A.3.8) — while dodgeMs > 0, every incoming hit is
      // negated outright (see tryDodge); it does NOT re-roll or extend the
      // window, matching "cannot re-trigger while already active." See
      // tickStatusEffects for the countdown.
      dodgeMs: 0,
      // Hit-flash (this pass's own combat-feedback addition, not a bible
      // field) — a brief white tint pulse on any entity that just took real
      // damage, layered with a floating number (CombatFeedback.js) and a
      // hit/crit sfx so a landed attack actually reads as connecting. Takes
      // priority over every status tint below while active (see
      // tickStatusEffects) since it's meant to interrupt/flash over
      // whatever color the entity is already showing.
      hitFlashMs: 0,
      // Zombie (bible §A.3.8) — remainingRevives starts at config.reviveCount
      // (0 for every non-Zombie config) and counts down each time
      // processZombieRevives actually revives this entity; lastAttacker
      // records whoever most recently reduced its hp, so a revival check
      // can tell whether THIS specific finishing blow came from a
      // zombieKiller unit (see applyResolvedDamage).
      remainingRevives: config.reviveCount || 0,
      lastAttacker: null,
      target: null,
    };
  }

  // Can `attacker` hit `target` from their current distance? Melee roles set
  // `range` equal to their own radius, so this reduces to plain contact; a
  // bigger `range` lets ranged/AoE roles engage before physically touching.
  // Long Distance units (bible §A.3.8) replace this with an explicit
  // min/max window instead of the usual "anything within range" check — see
  // getMaxRange for how their stopping/detection distance is also affected.
  inRange(attacker, target) {
    const distance = Math.abs(attacker.shape.x - target.shape.x);
    const maxReach = this.getMaxRange(attacker.config) + target.config.radius;

    if (attacker.config.longDistance) {
      return distance >= attacker.config.longDistance.min && distance <= maxReach;
    }
    return distance <= maxReach;
  }

  // The distance at which a unit stops advancing and starts attacking (also
  // used for the "close enough to hit the base" checks). Long Distance units
  // use their extended max reach here instead of the plain `range` stat,
  // since their real detection distance is further out than a normal unit's.
  getMaxRange(config) {
    return config.longDistance ? config.longDistance.max : config.range;
  }

  // Target acquisition (bible: nearest enemy, not first-in-spawn-order) —
  // every acquisition site below used to be a plain Array.find(predicate),
  // which effectively targeted whichever eligible entity happened to be
  // earliest in this.enemies/this.playerUnits (spawn order), not the
  // closest one. On this single-lane battlefield "nearest" is just the
  // smallest |shape.x delta|, so this is a straight drop-in replacement —
  // same predicate, same eligibility rules, only the tie-among-eligible
  // selection changes.
  findNearest(from, candidates, predicate) {
    let best = null;
    let bestDistance = Infinity;
    for (const candidate of candidates) {
      if (!predicate(candidate)) continue;
      const distance = Math.abs(from.shape.x - candidate.shape.x);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
    return best;
  }

  update(time, deltaMs) {
    if (this.isGameOver || this.isPaused) return;

    // Speed Up (see toggleSpeedUp) scales every per-frame calculation below
    // by reassigning the parameter itself — everything downstream
    // (updatePlayerUnits(deltaMs), updateEnemies(deltaMs), updateSpawns's
    // elapsedMs-driven clock, etc.) already just uses whatever's passed in,
    // so nothing past this line needs to know Speed Up exists at all.
    // Phaser's own timer clock (this.time.timeScale, set in toggleSpeedUp)
    // handles the remaining delayedCall usages (scheduleDojoWaves, the
    // special-burst flash) consistently with this.
    deltaMs *= this.speedMultiplier;

    this.elapsedMs += deltaMs;

    for (const key of Object.keys(this.unitCooldowns)) {
      this.unitCooldowns[key] = Math.max(0, this.unitCooldowns[key] - deltaMs);
    }

    this.money = Math.min(this.getWalletCap(), this.money + (this.getMoneyAccrualPerSec() * deltaMs) / 1000);
    this.walletText.setText(`${Math.round(this.money).toLocaleString()}/${Math.round(this.getWalletCap()).toLocaleString()}円`);
    this.updateSpawnButtons();
    this.updateWorkerCatButton();
    this.enemyBaseCurseMs = Math.max(0, this.enemyBaseCurseMs - deltaMs);

    // Cat Cannon charges passively over a fixed TIME budget (bible §A.3.9,
    // guide Chapter 08's real formula), independent of combat performance,
    // starting from battle start (the moment this scene loads) same as
    // enemy spawning — real Battle Cats doesn't wait for the player's
    // first deploy for either (money income doesn't either — see
    // getMoneyRampMultiplier, which already used raw elapsedMs even before
    // this fix). Cannon Charge Base Upgrade shaves flat time off that
    // budget; Cannon Power adds an equal-and-opposite penalty per level (a
    // real trade-off — raising both to the same level exactly cancels out,
    // back to the 50s baseline), down to a hard floor (see
    // SPECIAL_CHARGE_DURATION_MS/CANNON_CHARGE_FLOOR_MS above).
    const cannonPowerPenaltyMs = this.cannonPowerLevel * CANNON_POWER_CHARGE_PENALTY_MS_PER_LEVEL;
    const chargeDurationMs = Math.max(
      CANNON_CHARGE_FLOOR_MS,
      SPECIAL_CHARGE_DURATION_MS + cannonPowerPenaltyMs - this.cannonChargeReductionMs,
    );
    this.specialMeter = Math.min(SPECIAL_METER_MAX, this.specialMeter + (SPECIAL_METER_MAX * deltaMs) / chargeDurationMs);
    if (this.mode !== 'dojo') this.updateSpawns();
    this.updateCannonButton();
    this.updateLowHpVignette(time);
    this.updateBossMusic();

    this.updatePlayerUnits(deltaMs);
    this.updateEnemies(deltaMs);
    this.updateEntityPoses(deltaMs);

    // Sparring Grounds' base is invincible (see damageBase/damageEnemyBase),
    // so its HP is always Infinity — shown as "∞/∞" rather than a literal
    // (and confusing) "Infinity/Infinity" string.
    // baseHp/enemyBaseHp themselves stay floats (damage amounts aren't
    // always whole numbers — a weaken multiplier, say) — only rounded here,
    // at display time, so the HP text never shows something like "47.35".
    this.baseHpText.setText(Number.isFinite(this.baseHp) ? `${Math.round(Math.max(0, this.baseHp))}/${this.baseMaxHp}` : '∞/∞');
    this.enemyBaseHpText.setText(
      Number.isFinite(this.enemyBaseHp) ? `${Math.round(Math.max(0, this.enemyBaseHp))}/${this.enemyBaseMaxHp}` : '∞/∞',
    );

    if (this.mode === 'dojo') {
      this.dojoTimeRemainingMs = Math.max(0, this.dojoTimeRemainingMs - deltaMs);
      const totalSeconds = Math.ceil(this.dojoTimeRemainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      this.dojoTimerText.setText(`Time: ${minutes}:${String(seconds).padStart(2, '0')}`);

      if (this.dojoTimeRemainingMs <= 0) {
        this.endDojo();
      }
    }
  }

  getScore() {
    return Math.floor(this.elapsedMs / 1000) + this.enemiesKilled * SCORE_PER_KILL;
  }

  updateSpawnButtons() {
    for (const button of this.spawnButtons) {
      const affordable = this.money >= this.getUnitCost(button.config);
      const alpha = affordable ? 1 : 0.4;

      button.rect.setAlpha(alpha);
      if (button.icon) button.icon.setAlpha(alpha);
      button.costText.setAlpha(alpha);

      const remaining = this.unitCooldowns[button.key] || 0;
      // Full duration THIS cooldown actually counts down from, not the raw
      // base rechargeMs — with any Research reduction or evolution
      // rechargeMultiplier, those differ, and using the base value made
      // the overlay clear well before the unit was really off cooldown.
      const fullDuration = this.unitCooldownDurations[button.key] || button.config.rechargeMs;
      const frac = fullDuration ? remaining / fullDuration : 0;
      button.cooldownOverlay.height = BUTTON_HEIGHT * frac;
    }
  }

  updateWorkerCatButton() {
    const button = this.workerCatButton;
    const maxed = this.workerCatLevel >= MONEY_CONFIG.workerCat.maxLevel;

    // Two short lines fit inside the circle (was one long "Land Worker
    // Lv1" line that only fit in the old wide rectangular card).
    button.labelText.setText(`Worker\nLv${this.workerCatLevel}`);
    button.costText.setText(maxed ? 'MAX' : `${Math.round(this.workerCatUpgradeCost).toLocaleString()}円`);

    const affordable = !maxed && this.money >= this.workerCatUpgradeCost;
    const alpha = maxed ? 0.5 : affordable ? 1 : 0.4;
    button.rect.setAlpha(alpha);
    button.labelText.setAlpha(alpha);
    button.costText.setAlpha(alpha);
  }

  // Draws the Cat Cannon's radial charge fill (a pie-slice sweeping clockwise
  // from the top as specialMeter fills, matching the confirmed screenshot
  // visual) and swaps the button's base color once it's fully charged and
  // tappable.
  updateCannonButton() {
    const ready = this.specialMeter >= SPECIAL_METER_MAX;
    this.cannonBase.fillColor = ready ? CANNON_READY_COLOR : CANNON_NOT_READY_COLOR;

    const fraction = Math.min(1, this.specialMeter / SPECIAL_METER_MAX);
    this.cannonChargeGraphics.clear();
    if (fraction > 0 && !ready) {
      this.cannonChargeGraphics.fillStyle(CANNON_CHARGE_FILL_COLOR, 1);
      this.cannonChargeGraphics.slice(
        this.cannonX,
        this.cannonY,
        CANNON_BUTTON_RADIUS,
        Phaser.Math.DegToRad(-90),
        Phaser.Math.DegToRad(-90 + 360 * fraction),
        false,
      );
      this.cannonChargeGraphics.fillPath();
    }
  }

  // A pulsing full-screen red tint once the player's own base drops below
  // LOW_HP_WARNING_RATIO — this build's own addition (not a bible field),
  // the same "you are about to lose" urgency cue most tower-defense games
  // give the base/tower specifically, since nothing here previously
  // signalled danger beyond the numeric HP text. Skipped entirely in dojo
  // mode (an invincible Infinity/Infinity base has no "low" to warn about).
  updateLowHpVignette(time) {
    if (this.mode === 'dojo' || this.isGameOver) {
      this.lowHpVignette.setAlpha(0);
      return;
    }
    const ratio = this.baseMaxHp > 0 ? this.baseHp / this.baseMaxHp : 1;
    if (ratio > LOW_HP_WARNING_RATIO) {
      this.lowHpVignette.setAlpha(0);
      return;
    }
    this.lowHpVignette.setAlpha(LOW_HP_VIGNETTE_BASE_ALPHA + LOW_HP_VIGNETTE_PULSE_ALPHA * Math.sin(time / 200));
  }

  updatePlayerUnits(deltaMs) {
    const { width } = LOGICAL_SIZE;
    const enemyBaseReachDistance = BASE_WIDTH / 2;

    for (const unit of this.playerUnits) {
      if (unit.hp <= 0) continue;

      unit.isMoving = false;
      this.tickStatusEffects(unit, deltaMs);

      if (unit.knockbackMs > 0) {
        this.tickKnockback(unit, deltaMs);
        continue;
      }

      if (unit.stopMs > 0 || unit.warpMs > 0) continue; // frozen/warped: no attack, no movement, no target-seeking

      // Long Distance units (bible §A.3.8) have a real dead zone against a
      // target unit (inRange enforces longDistance.min); computed up front
      // (rather than only at re-acquire time, as this used to) so an
      // ALREADY-targeting-the-base unit can be re-checked against it too —
      // a knockback that shoves a unit clear of the base's reach used to
      // leave `unit.target === 'enemyBase'` untouched, so it kept dealing
      // damage from wherever it landed, arbitrarily far away, every cycle
      // afterward. The bible's interruption rule (§A.3.4) already applies
      // to a knocked-back mid-foreswing hit against a live enemy; it should
      // apply the same way here — no longer in reach means no longer a
      // valid target, full stop.
      const enemyBaseDistance = this.enemyBaseX - unit.shape.x;
      const clearsMinRange = !unit.config.longDistance || enemyBaseDistance >= unit.config.longDistance.min;
      const inEnemyBaseReach = clearsMinRange && enemyBaseDistance <= enemyBaseReachDistance + this.getMaxRange(unit.config);

      if (unit.target === 'enemyBase' && !inEnemyBaseReach) {
        this.clearTarget(unit);
      }

      if (unit.target === 'enemyBase') {
        this.tickCombatPhase(unit, deltaMs, () => {
          fireAttackVfx(this, unit, this.enemyBaseX, this.laneY);
          const weakenMultiplier = unit.weakenMs > 0 ? unit.weakenMultiplier : 1;
          this.damageEnemyBase(unit.config.damage * weakenMultiplier);
          this.applyStatusEffectToEnemyBase(unit);
        });
        continue;
      }

      if (unit.target && (unit.target.hp <= 0 || unit.target.warpMs > 0 || unit.target.knockbackMs > 0 || !this.inRange(unit, unit.target))) {
        this.clearTarget(unit);
      }

      if (!unit.target) {
        unit.target = this.findNearest(
          unit, this.enemies,
          (enemy) => enemy.hp > 0 && enemy.warpMs <= 0 && enemy.knockbackMs <= 0 && !enemy.config.nonBlocking && this.inRange(unit, enemy),
        );
      }

      // Mirrors the enemy-side blind-spot handling in updateEnemies: a Long
      // Distance unit already backed up as far as it can go (its own base
      // is right there) can't retreat any further from an enemy inside its
      // blind spot, so fight it point-blank instead of standing there
      // ignoring it forever.
      const minRetreatX = this.baseX + BASE_WIDTH / 2 + unit.config.radius;
      if (!unit.target && unit.config.longDistance && unit.shape.x <= minRetreatX) {
        unit.target = this.findNearest(
          unit, this.enemies,
          (enemy) => enemy.hp > 0 && enemy.warpMs <= 0 && enemy.knockbackMs <= 0 && !enemy.config.nonBlocking
            && Math.abs(unit.shape.x - enemy.shape.x) < unit.config.longDistance.min,
        );
      }

      if (!unit.target && inEnemyBaseReach) {
        unit.target = 'enemyBase';
      }

      if (unit.target && unit.target !== 'enemyBase') {
        this.tickCombatPhase(unit, deltaMs, () => {
          this.dealDamage(unit, unit.target, this.enemies);
        });
      } else if (!unit.target) {
        unit.isMoving = true;
        const moveStep = (unit.config.moveSpeed * unit.slowMultiplier * deltaMs) / 1000;
        // Same blind-spot situation as above, but with room left to back
        // off — mirrors the enemy-side fix in updateEnemies: a Long
        // Distance unit that's too close to a live enemy kites backward
        // toward its own base to reopen the gap instead of advancing
        // blindly through the enemy it can't yet hit.
        const tooCloseEnemy = unit.config.longDistance
          && this.enemies.some(
            (enemy) => enemy.hp > 0 && enemy.warpMs <= 0
              && Math.abs(unit.shape.x - enemy.shape.x) < unit.config.longDistance.min,
          );
        if (tooCloseEnemy) {
          unit.shape.x = Math.max(minRetreatX, unit.shape.x - moveStep);
        } else {
          // Never let a single frame's step carry a unit clean through the
          // engagement window of the very next live enemy ahead of it — a
          // big enough step (a frame hitch, or simply a very fast mover
          // like Fast Melee's 165 px/sec, by far the highest moveSpeed in
          // the game) could otherwise jump from "not yet in range" straight
          // past "already beyond it" in one frame without ever landing
          // inside the window inRange checks, walking clean through the
          // enemy untouched. Clamp the advance to stop right at the
          // nearest such enemy's own near edge instead, so next frame's
          // inRange check (above) is guaranteed to see it as in range.
          let maxAdvanceX = width - unit.config.radius;
          for (const enemy of this.enemies) {
            if (enemy.hp <= 0 || enemy.warpMs > 0 || enemy.config.nonBlocking) continue;
            const entryX = enemy.shape.x - this.getMaxRange(unit.config) - enemy.config.radius;
            if (entryX >= unit.shape.x && entryX < maxAdvanceX) maxAdvanceX = entryX;
          }
          unit.shape.x = Math.min(maxAdvanceX, unit.shape.x + moveStep);
        }
        if (unit.label) unit.label.x = unit.shape.x;
      }
    }

    this.removeDead(this.playerUnits);
  }

  updateEnemies(deltaMs) {
    const baseReachDistance = BASE_WIDTH / 2;

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;

      enemy.isMoving = false;
      this.tickStatusEffects(enemy, deltaMs);

      if (enemy.knockbackMs > 0) {
        this.tickKnockback(enemy, deltaMs);
        continue;
      }

      if (enemy.stopMs > 0 || enemy.warpMs > 0) continue; // frozen/warped: no attack, no movement, no target-seeking

      // See the mirrored player-side check in updatePlayerUnits for why
      // longDistance.min needs its own guard here too, and why this is
      // computed up front rather than only at re-acquire time: an
      // already-targeting-the-base enemy needs to be re-checked against it
      // too, or a knockback that shoves it clear of the base's reach used
      // to leave `enemy.target === 'base'` untouched, dealing damage from
      // wherever it landed regardless of actual distance.
      const baseDistance = enemy.shape.x - this.baseX;
      const clearsMinRange = !enemy.config.longDistance || baseDistance >= enemy.config.longDistance.min;
      const inBaseReach = clearsMinRange && baseDistance <= baseReachDistance + this.getMaxRange(enemy.config);

      if (enemy.target === 'base' && !inBaseReach) {
        this.clearTarget(enemy);
      }

      if (enemy.target === 'base') {
        this.tickCombatPhase(enemy, deltaMs, () => {
          fireAttackVfx(this, enemy, this.baseX, this.laneY);
          const weakenMultiplier = enemy.weakenMs > 0 ? enemy.weakenMultiplier : 1;
          this.damageBase(enemy.config.damage * weakenMultiplier);
        });
        continue;
      }

      if (enemy.target && (enemy.target.hp <= 0 || enemy.target.warpMs > 0 || enemy.target.knockbackMs > 0)) {
        this.clearTarget(enemy);
      }
      if (enemy.target && !this.inRange(enemy, enemy.target)) {
        this.clearTarget(enemy);
      }

      if (!enemy.target) {
        enemy.target = this.findNearest(
          enemy, this.playerUnits,
          (unit) => unit.hp > 0 && unit.warpMs <= 0 && unit.knockbackMs <= 0 && this.inRange(enemy, unit),
        );
      }

      // Long Distance blind spot (bible §A.3.8, see inRange): a unit inside
      // longDistance.min was excluded just above. Normally this enemy backs
      // off toward its own base to reopen the gap (see the movement branch
      // below) — but if it's already backed up as far as it can go (its own
      // base is right there, e.g. a unit was already parked touching the
      // base when this enemy spawned right next to it), retreating further
      // isn't possible, so fight the blocking unit point-blank instead of
      // leaving it untouched forever.
      const maxRetreatX = this.enemyBaseX - BASE_WIDTH / 2 - enemy.config.radius;
      if (!enemy.target && enemy.config.longDistance && enemy.shape.x >= maxRetreatX) {
        enemy.target = this.findNearest(
          enemy, this.playerUnits,
          (unit) => unit.hp > 0 && unit.warpMs <= 0 && unit.knockbackMs <= 0
            && Math.abs(enemy.shape.x - unit.shape.x) < enemy.config.longDistance.min,
        );
      }

      if (!enemy.target && inBaseReach) {
        enemy.target = 'base';
      }

      if (enemy.target && enemy.target !== 'base') {
        this.tickCombatPhase(enemy, deltaMs, () => this.dealDamage(enemy, enemy.target, this.playerUnits));
      } else if (!enemy.target) {
        enemy.isMoving = true;
        const moveStep = (enemy.config.moveSpeed * enemy.slowMultiplier * deltaMs) / 1000;
        // Same blind-spot situation as above, but with room left to back
        // off — walking blindly forward here would carry it straight
        // through the too-close unit's position without ever fighting it,
        // since nothing here previously distinguished "no target anywhere
        // nearby" from "a target is too close to hit." Kite backward
        // instead, same as a real ranged unit, until the gap reopens past
        // longDistance.min and inRange can pick the unit up above.
        const tooCloseUnit = enemy.config.longDistance
          && this.playerUnits.some(
            (unit) => unit.hp > 0 && unit.warpMs <= 0
              && Math.abs(enemy.shape.x - unit.shape.x) < enemy.config.longDistance.min,
          );
        if (tooCloseUnit) {
          enemy.shape.x = Math.min(maxRetreatX, enemy.shape.x + moveStep);
        } else {
          // Mirrors the player-side clamp in updatePlayerUnits: never let a
          // single frame's step carry this enemy clean through the
          // engagement window of the nearest live player unit ahead of it.
          let minAdvanceX = enemy.config.radius;
          for (const unit of this.playerUnits) {
            if (unit.hp <= 0 || unit.warpMs > 0) continue;
            const entryX = unit.shape.x + this.getMaxRange(enemy.config) + unit.config.radius;
            if (entryX <= enemy.shape.x && entryX > minAdvanceX) minAdvanceX = entryX;
          }
          enemy.shape.x = Math.max(minAdvanceX, enemy.shape.x - moveStep);
        }
        if (enemy.label) enemy.label.x = enemy.shape.x;
      }
    }

    this.processZombieRevives(this.enemies);
    this.removeDead(this.enemies, (enemy) => this.onEnemyKilled(enemy));
  }

  // Zombie (bible §A.3.8) — checked immediately before every removeDead
  // pass over this.enemies: an entity that would otherwise be removed here
  // gets its hp bumped back above 0 instead, so removeDead's own hp<=0
  // check simply skips it afterward (no changes needed there, and no risk
  // of double-handling the same "death").
  processZombieRevives(list) {
    for (const entity of list) {
      if (entity.hp > 0) continue;
      if (entity.remainingRevives <= 0) continue;
      // Zombie Killer (bible §A.3.8): the finishing blow's attacker denies
      // the revive outright when it carries this flag.
      if (entity.lastAttacker?.config?.zombieKiller) continue;

      entity.remainingRevives -= 1;
      entity.hp = Math.round(entity.config.hp * entity.config.reviveHpPercent);
      entity.hpAtLastKnockback = entity.hp; // reset the HP-threshold knockback bookkeeping to the fresh HP
      entity.knockbacksUsed = 0;
      // A revived entity can die (hp <= 0, arriving here) while mid-slide
      // or mid-attack-windup — e.g. staggered by one hit, then finished off
      // by an AoE/Wave sweep before its slide ever finished. Without this,
      // it comes back to life still sliding on the ORIGINAL attacker's
      // now-stale velocity/direction, or resumes an attack cycle from
      // wherever it was interrupted, instead of starting clean.
      entity.knockbackMs = 0;
      entity.knockbackVelocity = 0;
      entity.attackPhase = null;
      entity.phaseMs = 0;
    }
  }

  onEnemyKilled(enemy) {
    this.enemiesKilled += 1;
    addLifetimeStat('enemiesDefeated');
    // updateBossMusic (called every frame) reacts to aliveBossCount itself
    // rather than needing an explicit call here.
    if (enemy.isBoss) this.aliveBossCount = Math.max(0, this.aliveBossCount - 1);
    // Sparring Grounds pays no money for kills at all (bible: it's a
    // damage-test venue, not a money-farming one) — score still counts
    // the kill via enemiesKilled above, just no economy payout.
    if (this.mode === 'dojo') return;

    // Real per-enemy kill payout (guide Chapter 14's own money list) when
    // available — only the 3 still-dormant enemies (no real Chapter 1 data,
    // see ENEMY_CONFIG.js) fall back to the old invented threat-based
    // formula. Accounting Base Upgrade (bible §A.7.1) still applies % more
    // on top either way.
    const baseReward = enemy.config.money ?? enemy.config.threat * MONEY_CONFIG.killBonusMultiplier;
    // Accounting Base Upgrade, then Treasure's killMoneyPercent as its own
    // independent multiplier on top (same "each stacks separately" rule as
    // attackBonusMultiplier above).
    const bonus = baseReward * (1 + this.accountingBonusPercent / 100) * (1 + getBonusPercent('killMoneyPercent') / 100);
    this.money = Math.min(this.getWalletCap(), this.money + bonus);
  }

  // Pose swap ("make the movements more interesting... when knocked back,
  // they can have a surprised look"): a standalone pass over both rosters,
  // run every frame after updatePlayerUnits/updateEnemies have resolved this
  // frame's knockback/attack-phase state, rather than threaded into that
  // branchy per-unit logic (several of its paths `continue` before reaching
  // the end of the loop body). Entities without a sprite (every enemy today
  // — see UNIT_CONFIG.js's `sprite` field) are silently no-ops here.
  updateEntityPoses(deltaMs) {
    for (const unit of this.playerUnits) {
      this.setEntityPose(unit, this.getDesiredPose(unit));
      this.updateRunCycle(unit, deltaMs);
      this.updateIdleCycle(unit, deltaMs);
      this.updateAttackLunge(unit);
    }
    for (const enemy of this.enemies) {
      this.setEntityPose(enemy, this.getDesiredPose(enemy));
      this.updateRunCycle(enemy, deltaMs);
      this.updateIdleCycle(enemy, deltaMs);
      this.updateAttackLunge(enemy);
    }
  }

  // hit (dazed/surprised) beats attack (mid-swing) beats run (walking with
  // no target) beats idle (standing still — frozen, warped, or between
  // steps) — a dead entity is left on whatever pose it last had; removeDead
  // destroys it this same frame regardless. run only fires for entities
  // with a real run sprite (see ENEMY_CONFIG.js's sniper/Dryad Ranger,
  // the one roster entry with no move animation to render) — everyone
  // else just stays on idle while moving rather than popping to a
  // nonexistent texture.
  getDesiredPose(entity) {
    if (entity.hp <= 0) return entity.currentPose;
    if (entity.knockbackMs > 0) return 'hit';
    if (entity.attackPhase === 'windup') return 'attack';
    if (entity.isMoving && entity.config.sprite?.run) return 'run';
    return 'idle';
  }

  // idle/attack/hit/run_0/run_1 are all just texture swaps on the SAME
  // sprite — none of them ever manually pick a scale. fitSpriteToRadius
  // runs exactly once, in createEntityVisual, sized off the idle texture;
  // every later pose starts from that same base scale. This used to
  // re-fit on every swap, which seems reasonable (each pose gets sized to
  // the same target diameter) but is actually wrong: every pose is
  // trimmed to its OWN tight bounding box (see tools/sprite-gen's
  // trimTransparentPadding), and an attack pose's box is usually bigger
  // than idle's (a swung weapon/limb reaches further out) even though the
  // character's actual body is the same true size in both — fitting THAT
  // bigger box to the same target diameter shrank the whole sprite, which
  // read as "enemies get small mid-attack." Reusing idle's scale instead
  // means each pose mostly renders at its own natural relative size
  // instead of being force-normalized to an identical bounding-box size —
  // "mostly" because rescaleForCurrentTexture below still steps in when a
  // pose's own box is disproportionately bigger than idle's (see
  // MAX_POSE_SCALE_GROWTH), rather than letting an outlier frame like
  // Dryad Mage's attack pose balloon the whole sprite.
  setEntityPose(entity, pose) {
    if (!entity.spriteImage || entity.currentPose === pose) return;
    entity.currentPose = pose;
    const prefix = entity.isPlayerSide ? 'unit' : 'enemy';
    const evolvedTag = entity.isEvolved && entity.config.sprite.evolved ? '_evolved' : '';
    if (pose === 'run') {
      entity.runFrame = 0;
      entity.runCycleMs = 0;
      entity.spriteImage.setTexture(`${prefix}_${entity.config.id}${evolvedTag}_run_0`, '__BASE');
    } else {
      // Explicit '__BASE' — see createEntityVisual's own comment. Pose
      // cycles back to 'idle' constantly during combat (between attacks,
      // before engaging), and a 2-arg setTexture on the 'idle' key has the
      // exact same "silently resolves to another screen's cropped face
      // frame" hazard as the sprite's initial creation.
      entity.spriteImage.setTexture(`${prefix}_${entity.config.id}${evolvedTag}_${pose}`, '__BASE');
    }
    this.rescaleForCurrentTexture(entity.spriteImage);
  }

  // Clamps how far a pose swap (see setEntityPose) can grow the sprite
  // beyond its idle size — `sprite.width`/`height` here read the NEW
  // texture's raw frame size regardless of the sprite's current scale
  // (Phaser's Components.ComputedSize — displayWidth/Height are the ones
  // scale actually affects), so this is comparing that pose's real native
  // bounding box against idle's, not anything already-scaled.
  rescaleForCurrentTexture(sprite) {
    const poseMaxDim = Math.max(sprite.width, sprite.height);
    const growth = poseMaxDim / sprite.idleMaxDim;
    const cappedGrowth = Math.min(growth, MAX_POSE_SCALE_GROWTH);
    sprite.setScale((sprite.baseTargetSize * cappedGrowth) / poseMaxDim);
  }

  // A single static "moving" pose read as barely different from idle for
  // these round, mostly-legless Axies/Chimeras (see SpriteIcon.js's own
  // comment), so while an entity is on the run pose this cycles through
  // its full run sequence (tools/sprite-gen now extracts every frame of
  // the real gait-cycle clip, not just 2 sampled extremes) at its own
  // real speed — see ANIMATION_FRAME_DELAY_MS's own comment — generic
  // over however many frames this entity's roster entry actually has
  // rather than hardcoded to 2, same one fixed scale as every other pose
  // (see setEntityPose's own comment) applies here too, unchanged.
  updateRunCycle(entity, deltaMs) {
    if (!entity.spriteImage || entity.currentPose !== 'run') return;

    const evolvedTag = entity.isEvolved && entity.config.sprite.evolved ? '_evolved' : '';
    const spriteSet = evolvedTag ? entity.config.sprite.evolved : entity.config.sprite;
    const frameCount = spriteSet.run.length;
    const cycleMs = frameCount * ANIMATION_FRAME_DELAY_MS;

    entity.runCycleMs = (entity.runCycleMs + deltaMs) % cycleMs;
    const frame = Math.min(frameCount - 1, Math.floor(entity.runCycleMs / ANIMATION_FRAME_DELAY_MS));
    if (frame !== entity.runFrame) {
      entity.runFrame = frame;
      const prefix = entity.isPlayerSide ? 'unit' : 'enemy';
      entity.spriteImage.setTexture(`${prefix}_${entity.config.id}${evolvedTag}_run_${frame}`, '__BASE');
    }
  }

  // Idle-pose counterpart to updateRunCycle just above — same generic
  // frame-count/real-speed shape, driven purely off entity.currentPose
  // (not off setEntityPose's own transition edge), so it keeps breathing
  // the whole time an entity sits idle rather than only animating once per
  // pose change. idleCycleMs is seeded with a random offset per entity at
  // creation (see spawnUnit/createEnemy) so a field full of idle units
  // doesn't all breathe in lockstep, the same reasoning as SpriteIcon.js's
  // own randomized `startAt`.
  updateIdleCycle(entity, deltaMs) {
    if (!entity.spriteImage || entity.currentPose !== 'idle') return;

    const evolvedTag = entity.isEvolved && entity.config.sprite.evolved ? '_evolved' : '';
    const spriteSet = evolvedTag ? entity.config.sprite.evolved : entity.config.sprite;
    if (!spriteSet.idleAnim) return;
    const frameCount = spriteSet.idleAnim.length;
    const cycleMs = frameCount * ANIMATION_FRAME_DELAY_MS;

    entity.idleCycleMs = (entity.idleCycleMs + deltaMs) % cycleMs;
    const frame = Math.min(frameCount - 1, Math.floor(entity.idleCycleMs / ANIMATION_FRAME_DELAY_MS));
    if (frame !== entity.idleFrame) {
      entity.idleFrame = frame;
      const prefix = entity.isPlayerSide ? 'unit' : 'enemy';
      entity.spriteImage.setTexture(`${prefix}_${entity.config.id}${evolvedTag}_idleanim_${frame}`, '__BASE');
    }
  }

  // Small forward-and-back hop synced to tickCombatPhase's own
  // foreswing/backswing timing — see ATTACK_LUNGE_DISTANCE. Recomputes
  // this tick's DESIRED offset from scratch (rather than integrating a
  // velocity like tickKnockback does) and applies only the delta from
  // last tick's offset, so shape.x always equals "wherever normal
  // movement/knockback left it" plus the current lunge — never drifting,
  // and never needing its own separate cleanup wherever attackPhase gets
  // forcibly reset to null (a knockback interrupting a windup, say): the
  // very next tick after that, desiredOffset naturally computes back to 0
  // and this retracts whatever lunge was mid-flight in one step.
  updateAttackLunge(entity) {
    if (!entity.shape || entity.hp <= 0) return;

    let desiredOffset = 0;
    if (entity.attackPhase === 'windup') {
      const foreswingMs = Math.max(1, entity.config.foreswingMs);
      desiredOffset = ATTACK_LUNGE_DISTANCE * Phaser.Math.Clamp(1 - entity.phaseMs / foreswingMs, 0, 1);
    } else if (entity.attackPhase === 'backswing') {
      const backswingMs = Math.max(1, entity.config.backswingMs);
      desiredOffset = ATTACK_LUNGE_DISTANCE * Phaser.Math.Clamp(entity.phaseMs / backswingMs, 0, 1);
    }

    const delta = desiredOffset - entity.attackLungeOffset;
    if (delta === 0) return;
    entity.attackLungeOffset = desiredOffset;
    entity.shape.x += delta * (entity.isPlayerSide ? 1 : -1); // toward the enemy side
    if (entity.label) entity.label.x = entity.shape.x;
  }

  // Real bug, found live: clearing `entity.target` alone (every site that
  // invalidates a target — dead/warped/out-of-range/base-out-of-reach —
  // used to just do `entity.target = null` directly) left attackPhase
  // exactly where tickCombatPhase's own cycle happened to be, most often
  // 'windup' (see getDesiredPose — the ONLY thing that ever moves
  // attackPhase off 'windup' again is tickCombatPhase itself completing
  // another full cycle, which never happens once there's no target to
  // call it with). A unit whose target died or walked out of range mid-
  // windup would fall through to normal movement — isMoving true, walking
  // toward whatever it finds next — while its POSE stayed frozen on
  // 'attack' forever, since nothing was left to ever tick attackPhase
  // again: a unit visibly sliding across the lane in its static attack
  // pose. Bundles the same attackPhase/phaseMs reset triggerBossShockwave
  // and startKnockbackSlide already do for their own interruption cases,
  // so every target-invalidation site gets it too instead of just some.
  clearTarget(entity) {
    entity.target = null;
    entity.attackPhase = null;
    entity.phaseMs = 0;
  }

  // Advances one attacker's foreswing/backswing attack cycle (bible §A.3.4,
  // simplified to two phases — see UNIT_CONFIG.js's file header for the
  // derivation from attackSpeed). `onHit` fires exactly once, at the moment
  // foreswing completes — NOT at the start of the attack — so a unit that's
  // knocked back mid-foreswing (startKnockbackSlide resets attackPhase/
  // phaseMs) deals no damage at all for that cycle: the windup is simply
  // wasted, matching the bible's interruption rule (§A.3.4).
  tickCombatPhase(attacker, deltaMs, onHit) {
    // slowMultiplier deliberately NOT applied here — bible §A.3.8: Slow
    // "reduces the target's movement speed... does not touch attack
    // power." Movement (moveStep in updatePlayerUnits/updateEnemies) is
    // the only place slowMultiplier should apply; this used to also slow
    // the attack foreswing/backswing cycle itself (and, since the lunge
    // animation reads this same phaseMs, the attack animation too).
    attacker.phaseMs -= deltaMs;

    while (attacker.phaseMs <= 0) {
      if (attacker.attackPhase === 'windup') {
        onHit();
        attacker.attackPhase = 'backswing';
        attacker.phaseMs += attacker.config.backswingMs;
      } else {
        attacker.attackPhase = 'windup';
        attacker.phaseMs += attacker.config.foreswingMs;
      }
    }
  }

  // Applies one attack's damage to `primaryTarget`. If the attacker's
  // `special` is an AoE ability, every living entity in `targetPool` within
  // `special.radius` of the primary target's position is hit too. A
  // separate, independent Wave Attack sweep (see applyWaveAttack) always
  // runs afterward regardless of `special`, since Wave Attack isn't a
  // `special.type` — it's its own optional field that can coexist with
  // whatever attack shape the unit already has (bible §A.3.8).
  dealDamage(attacker, primaryTarget, targetPool) {
    fireAttackVfx(this, attacker, primaryTarget.shape.x, primaryTarget.shape.y);
    const special = attacker.config.special;
    // A cursed attacker's special ability is suppressed — an aoe attacker
    // falls back to hitting only its primary target, same as a 'none' unit.
    const specialSuppressed = attacker.curseMs > 0;
    let totalDamage = 0;

    if (special && special.type === 'aoe' && !specialSuppressed) {
      const originX = primaryTarget.shape.x;
      for (const entity of targetPool) {
        if (entity.hp > 0 && Math.abs(entity.shape.x - originX) <= special.radius) {
          totalDamage += this.applyDamageAndEffects(attacker, entity);
        }
      }
    } else {
      totalDamage = this.applyDamageAndEffects(attacker, primaryTarget);
    }

    this.applyWaveAttack(attacker, targetPool, primaryTarget);
    this.scheduleSurgeAttack(attacker, targetPool, totalDamage);
    this.tryKnockbackOnHit(attacker, targetPool);

    return totalDamage;
  }

  // Knockback-all (bible §A.3.8, real Titan Cat True Form ability — guide
  // Chapter 11: "30%でふっとばす（メタル等を除く全敵）"): on a successful
  // per-hit chance roll, unconditionally knocks back every living, non-
  // immune member of targetPool — not just whatever this hit actually
  // damaged. Bypasses the normal HP-threshold "endurance" gate entirely
  // (resolveKnockback), same as the Cat Cannon's own unconditional
  // knockback burst, since this is a guaranteed special ability rather than
  // ordinary combat staggering. Suppressed by Curse, same as every other
  // special ability (see dealDamage's own specialSuppressed check).
  tryKnockbackOnHit(attacker, targetPool) {
    const ability = attacker.config.knockbackOnHit;
    if (!ability || attacker.curseMs > 0) return;
    if (Math.random() > ability.chance) return;

    for (const entity of targetPool) {
      if (entity.hp > 0 && entity.config.knockbackType !== 'immune') {
        this.startKnockbackSlide(attacker, entity);
      }
    }
  }

  // The shared per-hit pipeline: raw damage (crit/weaken/matchup, via
  // computeDamage) plus any Toxic bonus, then delegates the rest (barrier/
  // knockback/status) to applyResolvedDamage — see that for why it's split
  // out. Returns the total damage computed (barrier-absorbed or not, dodged
  // or not) for score/UI purposes.
  applyDamageAndEffects(attacker, entity) {
    const { damage, isCrit } = this.computeDamage(attacker, entity);
    const totalDamage = damage + this.computeToxicBonus(attacker, entity);
    this.applyResolvedDamage(attacker, entity, totalDamage, isCrit);
    return totalDamage;
  }

  // Applies an ALREADY-COMPUTED damage amount: Dodge first (a full negation,
  // see tryDodge — nothing below even runs if it triggers), then Barrier
  // absorption (if the defender has a shield), and finally knockback +
  // status effects — but ONLY for whatever portion of the hit actually
  // reached real HP. A hit fully absorbed by a Barrier deals no knockback/
  // status at all, matching the bible's "the shell absorbs the hit" framing
  // (§A.3.8). Split out from applyDamageAndEffects so Surge Attack (below)
  // can re-apply a hit's already-rolled damage value without re-rolling
  // Critical Hit/Weaken/trait matchups a second time.
  applyResolvedDamage(attacker, entity, totalDamage, isCrit = false) {
    // "No hitbox" during a knockback shove (bible §A.3.5: "the unit has no
    // hitbox — can't be hit, can't hit anything"). Target acquisition
    // already excludes a currently-sliding entity (see findNearest's own
    // callers), but that alone doesn't cover every path here — an AoE
    // splash (dealDamage) or a Surge Attack's delayed follow-up hit
    // (scheduleSurgeAttack) can still catch a NEIGHBOR that started
    // sliding after the attack was already committed. A silent no-op, not
    // a Dodge/miss — the hit isn't evaded, it simply never reaches a target
    // with nothing to connect with.
    if (entity.knockbackMs > 0) return;

    if (this.tryDodge(entity)) {
      showDamageNumber(this, entity.shape.x, entity.shape.y, 0, { isMiss: true });
      return;
    }

    let appliedToHp = totalDamage;

    if (entity.barrierHp > 0) {
      const barrierBroken =
        attacker.config.barrierBreakerChance && Math.random() < attacker.config.barrierBreakerChance;

      if (barrierBroken) {
        // Barrier Breaker (bible §A.3.8): the shield shatters outright, and
        // this SAME hit's full damage still reaches HP normally — it isn't
        // absorbed at all this time.
        entity.barrierHp = 0;
      } else {
        const absorbed = Math.min(entity.barrierHp, totalDamage);
        entity.barrierHp -= absorbed;
        appliedToHp = totalDamage - absorbed;
      }
    }

    entity.hp -= appliedToHp;
    if (appliedToHp > 0) entity.lastAttacker = attacker; // Zombie revival (bible §A.3.8) — see processZombieRevives

    if (appliedToHp > 0) {
      this.resolveKnockback(attacker, entity);
      this.applyStatusEffect(attacker, entity);
      entity.hitFlashMs = HIT_FLASH_DURATION_MS;
      showDamageNumber(this, entity.shape.x, entity.shape.y, appliedToHp, { isCrit });
      if (isCrit) playCritSfx();
      else playHitSfx();
      if (attacker.isPlayerSide) addLifetimeStat('damageDealt', appliedToHp);
    }
  }

  // Dodge (bible §A.3.8): "a % chance to take zero damage and ignore all
  // attack-attached effects... cannot re-trigger while already active, but
  // has no separate cooldown once the window ends." A defender already
  // inside an active window auto-negates without a fresh roll; otherwise
  // roll dodgeChance once per incoming hit.
  tryDodge(entity) {
    const dodgeChance = entity.config.dodgeChance;
    if (!dodgeChance) return false;
    // Curse (bible §A.3.8) suppresses Dodge too, same as every other
    // special ability — a cursed entity can't evade while cursed, even if
    // it was already mid-dodge-window from a prior successful roll.
    if (entity.curseMs > 0) return false;

    if (entity.dodgeMs > 0) return true;

    if (Math.random() < dodgeChance) {
      entity.dodgeMs = entity.config.dodgeWindowMs || DEFAULT_DODGE_WINDOW_MS;
      return true;
    }

    return false;
  }

  // Surge Attack (bible §A.3.8): "a secondary, delayed area effect that
  // fires from the attacker's OWN position (not the target's) after a
  // normal hit lands — hits everything within a band around the attacker
  // for the same damage as the triggering hit." Reuses the exact damage
  // value the triggering hit already computed (including for an AoE hit,
  // where it's the summed total across every target that hit connected
  // with — a deliberate simplification rather than re-deriving a single-
  // target number) rather than rolling Critical Hit/Weaken a second time.
  // Suppressed by Curse, same as every other special ability.
  scheduleSurgeAttack(attacker, targetPool, damage) {
    const surge = attacker.config.surgeOnHit;
    if (!surge) return;
    if (attacker.curseMs > 0) return;
    if (Math.random() > surge.chance) return;

    this.time.delayedCall(surge.delayMs, () => {
      if (this.isGameOver || attacker.hp <= 0) return;

      const originX = attacker.shape.x;
      const candidates = targetPool.filter(
        (entity) => entity.hp > 0 && Math.abs(entity.shape.x - originX) <= surge.radius,
      );
      for (const entity of candidates) {
        this.applyResolvedDamage(attacker, entity, damage);
      }
    });
  }

  // Toxic/Poison (bible §A.3.8): a chance-based bonus equal to a % of the
  // DEFENDER's own max HP, added on top of normal damage — computed
  // independently of computeDamage's trait resolution, which is what lets
  // it bypass the Metal/alloy flat-damage cap (a non-crit hit on an alloy
  // defender still only deals FLAT_DAMAGE_AMOUNT via computeDamage, but the
  // toxic bonus is added on top of that regardless). Suppressed by Curse,
  // same as every other special ability.
  computeToxicBonus(attacker, defender) {
    const toxic = attacker.config.toxicOnHit;
    if (!toxic) return 0;
    if (attacker.curseMs > 0) return 0;
    if (Math.random() > toxic.chance) return 0;

    return defender.config.hp * toxic.percent;
  }

  // Wave Attack (bible §A.3.8): after the primary hit resolves, sweeps
  // outward from the ATTACKER's own position (not the primary target's)
  // toward the enemy side, hitting every OTHER living entity within
  // `waveOnHit.radius` with the same full damage/knockback/status pipeline.
  // Never affects Bases (targetPool only ever contains live units/enemies,
  // never a base). A `waveImmune` defender takes no damage from the wave
  // AND blocks it from reaching anyone further along the sweep — "Wave
  // Shield" per the bible.
  applyWaveAttack(attacker, targetPool, primaryTarget) {
    const wave = attacker.config.waveOnHit;
    if (!wave) return;
    if (attacker.curseMs > 0) return; // suppressed, same as special.type:'aoe'

    const direction = targetPool === this.enemies ? 1 : -1;
    const originX = attacker.shape.x;

    const candidates = targetPool
      .filter((entity) => entity.hp > 0 && entity !== primaryTarget)
      .filter((entity) => {
        const delta = (entity.shape.x - originX) * direction;
        return delta >= 0 && delta <= wave.radius;
      })
      .sort((a, b) => Math.abs(a.shape.x - originX) - Math.abs(b.shape.x - originX));

    for (const entity of candidates) {
      if (entity.config.waveImmune) break; // shields itself AND blocks the sweep beyond it
      this.applyDamageAndEffects(attacker, entity);
    }
  }

  // Resolves the bible's HP-threshold "endurance" knockback model (§A.3.5):
  // endurance = max HP / knockbackCount. Every time defender's cumulative
  // damage since its last stagger crosses another multiple of that
  // endurance, it's shoved backward once (see startKnockbackSlide) instead
  // of just losing HP silently — and it can never be staggered past its own
  // death (a defender already at 0 HP this hit just dies, matching the
  // bible's "the next qualifying hit kills it outright rather than knocking
  // it back again" rule once every threshold has been used up).
  resolveKnockback(attacker, defender) {
    if (defender.config.knockbackType === 'immune') return;
    if (defender.hp <= 0) return;

    const count = defender.config.knockbackCount;
    if (!count) return;

    const endurance = defender.config.hp / count;

    while (defender.hpAtLastKnockback - defender.hp >= endurance && defender.knockbacksUsed < count) {
      defender.hpAtLastKnockback -= endurance;
      defender.knockbacksUsed += 1;
      this.startKnockbackSlide(attacker, defender);
    }
  }

  // Starts a timed knockback slide on `defender`, away from `attacker`, and
  // cancels any attack windup currently in progress (bible's interruption
  // rule — a unit shoved mid-foreswing wastes that attack entirely and must
  // restart its whole cycle once it stops sliding). Distance comes from
  // defender's own `knockbackDistance` stat; duration is the same fixed
  // KNOCKBACK_DURATION_MS for everyone. Bases have no shape.x to shove, so
  // this is never called for damageBase/damageEnemyBase.
  startKnockbackSlide(attacker, defender) {
    const distance = defender.config.knockbackDistance;
    if (!distance) return;

    const direction = Math.sign(defender.shape.x - attacker.shape.x) || 1;
    defender.knockbackVelocity = (direction * distance) / KNOCKBACK_DURATION_MS;
    defender.knockbackMs = KNOCKBACK_DURATION_MS;
    defender.attackPhase = null;
    defender.phaseMs = 0;
  }

  // Slides an entity mid-knockback and counts down its remaining time.
  // Entities in this state skip all normal AI this frame (see the
  // knockbackMs > 0 check in updatePlayerUnits/updateEnemies) — no
  // attacking, no target-seeking, just the slide.
  tickKnockback(entity, deltaMs) {
    const { width } = LOGICAL_SIZE;
    const step = entity.knockbackVelocity * Math.min(deltaMs, entity.knockbackMs);
    entity.shape.x = Math.max(entity.config.radius, Math.min(width - entity.config.radius, entity.shape.x + step));
    if (entity.label) entity.label.x = entity.shape.x;

    entity.knockbackMs = Math.max(0, entity.knockbackMs - deltaMs);
  }

  // Rolls `attacker.config.statusOnHit` against `defender` — a chance-based
  // debuff independent of knockback (see STATUS_CONFIG.js). No-op for
  // `{ type: 'none' }` attackers (the default), so units without a
  // statusOnHit ability never affect this at all.
  applyStatusEffect(attacker, defender) {
    const status = attacker.config.statusOnHit;
    if (!status || status.type === STATUS_TYPES.NONE) return;
    // Curse (bible §A.3.8): "suppresses Weaken, Freeze, Slow, ... Warp,
    // Curse itself... on whatever it hits" — every sibling special-ability
    // function here (tryKnockbackOnHit, scheduleSurgeAttack,
    // computeToxicBonus, applyWaveAttack) already gates on the attacker's
    // own curseMs; this one — Slow/Stop/Weaken/Curse/Warp infliction — was
    // the one place that check was missing, so a cursed attacker could
    // still freely inflict every status effect it carries.
    if (attacker.curseMs > 0) return;
    if (Math.random() > status.chance) return;

    // Real per-status stinger (Origins Asset Kit) — the guide never had a
    // matching sound for these, so this is new coverage, not a synth
    // replacement. Played once per successful proc, same point the effect
    // itself gets applied below.
    const statusSfxFile = STATUS_SFX_FILE[status.type];
    if (statusSfxFile) playSfxFile(`/audio/sfx/${statusSfxFile}`, { gain: 0.65 });

    switch (status.type) {
      case STATUS_TYPES.SLOW:
        defender.slowMs = status.durationMs;
        defender.slowMultiplier = status.multiplier;
        break;
      case STATUS_TYPES.STOP:
        defender.stopMs = status.durationMs;
        break;
      case STATUS_TYPES.WEAKEN:
        defender.weakenMs = status.durationMs;
        defender.weakenMultiplier = status.multiplier;
        break;
      case STATUS_TYPES.CURSE:
        defender.curseMs = status.durationMs;
        break;
      case STATUS_TYPES.WARP:
        if (defender.config.warpImmune) return; // negated outright — nothing happens
        // Direction (forward/backward) and magnitude are both randomized
        // once, at the moment of the proc — see tickStatusEffects for where
        // this offset actually gets applied (once warpMs runs out).
        {
          const { minDistance, maxDistance } = status;
          const distance = minDistance + Math.random() * (maxDistance - minDistance);
          const direction = Math.random() < 0.5 ? -1 : 1;
          defender.warpOffset = direction * distance;
        }
        defender.warpMs = status.durationMs;
        // A warping entity vanishes mid-cycle — same interruption as a
        // knockback: any in-progress windup is wasted.
        defender.attackPhase = null;
        defender.phaseMs = 0;
        break;
    }
  }

  // Same roll as applyStatusEffect, but for a player unit whose target is
  // the enemy base directly. Currently a deliberate no-op in practice: the
  // enemy base has no special ability of its own to suppress yet, so
  // nothing observable happens — kept in place for whenever the enemy side
  // gets one (the player's own base no longer has an equivalent — the Cat
  // Cannon fires regardless of any Curse landed on the base).
  applyStatusEffectToEnemyBase(attacker) {
    const status = attacker.config.statusOnHit;
    if (!status || status.type !== STATUS_TYPES.CURSE) return;
    if (attacker.curseMs > 0) return; // same suppression as applyStatusEffect
    if (Math.random() > status.chance) return;
    this.enemyBaseCurseMs = status.durationMs;
  }

  // Ticks all status timers down and drives the entity's tint/visibility —
  // stop (fully frozen) beats curse beats slow beats weaken, so the most
  // disruptive/visible active state is always what's shown; restores
  // config.color once every timer has run out. Called for every living
  // unit/enemy every frame, independent of whether they're also
  // mid-knockback.
  //
  // Warp is handled separately from the tint-priority chain below: rather
  // than a color, a warping entity is simply made invisible for its whole
  // duration (see the warpMs > 0 gate in updatePlayerUnits/updateEnemies —
  // it skips all AI exactly like Stop) and repositioned by its stored
  // warpOffset (bible §A.3.8) the instant warpMs reaches 0, becoming
  // visible and active again.
  tickStatusEffects(entity, deltaMs) {
    if (entity.slowMs > 0) {
      entity.slowMs = Math.max(0, entity.slowMs - deltaMs);
      if (entity.slowMs === 0) entity.slowMultiplier = 1;
    }
    if (entity.stopMs > 0) entity.stopMs = Math.max(0, entity.stopMs - deltaMs);
    if (entity.curseMs > 0) entity.curseMs = Math.max(0, entity.curseMs - deltaMs);
    if (entity.weakenMs > 0) {
      entity.weakenMs = Math.max(0, entity.weakenMs - deltaMs);
      if (entity.weakenMs === 0) entity.weakenMultiplier = 1;
    }
    if (entity.dodgeMs > 0) entity.dodgeMs = Math.max(0, entity.dodgeMs - deltaMs);
    if (entity.hitFlashMs > 0) entity.hitFlashMs = Math.max(0, entity.hitFlashMs - deltaMs);

    // Runs before the warp early-return below so a warping entity's icons
    // get hidden too (updateStatusIcons checks warpMs itself) instead of
    // freezing at wherever they last were.
    this.updateStatusIcons(entity);

    if (entity.warpMs > 0) {
      entity.warpMs = Math.max(0, entity.warpMs - deltaMs);
      entity.shape.setVisible(false);
      if (entity.label) entity.label.setVisible(false);

      if (entity.warpMs === 0) {
        const { width } = LOGICAL_SIZE;
        entity.shape.x = Math.max(
          entity.config.radius,
          Math.min(width - entity.config.radius, entity.shape.x + entity.warpOffset),
        );
        if (entity.label) entity.label.x = entity.shape.x;
        entity.warpOffset = 0;
        entity.shape.setVisible(true);
        if (entity.label) entity.label.setVisible(true);
      } else {
        return; // stays invisible — no point resolving a tint this frame
      }
    }

    // Status tint: a circle placeholder recolors its fill; a sprite-art
    // entity (see UNIT_CONFIG.js's `sprite` field) tints its texture instead
    // — Image doesn't have `fillColor`, and setTint/clearTint is the sprite
    // equivalent of "recolor, then restore to normal."
    if (entity.spriteImage) {
      if (entity.hitFlashMs > 0) entity.spriteImage.setTint(HIT_FLASH_COLOR);
      else if (entity.dodgeMs > 0) entity.spriteImage.setTint(STATUS_DODGE_COLOR);
      else if (entity.stopMs > 0) entity.spriteImage.setTint(STATUS_STOP_COLOR);
      else if (entity.curseMs > 0) entity.spriteImage.setTint(STATUS_CURSE_COLOR);
      else if (entity.slowMs > 0) entity.spriteImage.setTint(STATUS_SLOW_COLOR);
      else if (entity.weakenMs > 0) entity.spriteImage.setTint(STATUS_WEAKEN_COLOR);
      else entity.spriteImage.clearTint();
    } else {
      if (entity.hitFlashMs > 0) entity.shape.fillColor = HIT_FLASH_COLOR;
      else if (entity.dodgeMs > 0) entity.shape.fillColor = STATUS_DODGE_COLOR;
      else if (entity.stopMs > 0) entity.shape.fillColor = STATUS_STOP_COLOR;
      else if (entity.curseMs > 0) entity.shape.fillColor = STATUS_CURSE_COLOR;
      else if (entity.slowMs > 0) entity.shape.fillColor = STATUS_SLOW_COLOR;
      else if (entity.weakenMs > 0) entity.shape.fillColor = STATUS_WEAKEN_COLOR;
      else entity.shape.fillColor = entity.config.color;
    }
  }

  // Unlike the tint above (only ever the single highest-priority status),
  // shows a small badge for EVERY currently-active status at once, centered
  // in a row above the entity's head — see STATUS_ICON_TEXTURE's header
  // comment for why Weaken needs its own visible cue despite never winning
  // the tint. No badge for Warp: the whole entity is invisible while
  // warping (see the caller in tickStatusEffects), so hide every icon then.
  updateStatusIcons(entity) {
    const active = entity.warpMs > 0 ? [] : STATUS_ICON_ORDER.filter((key) => entity[`${key}Ms`] > 0);
    const rowWidth = (active.length - 1) * STATUS_ICON_SPACING;
    const startX = entity.shape.x - rowWidth / 2;
    const iconY = entity.shape.y - entity.config.radius - STATUS_ICON_GAP_ABOVE_SPRITE;

    for (const key of STATUS_ICON_ORDER) {
      const icon = entity.statusIcons[key];
      const slot = active.indexOf(key);
      if (slot === -1) {
        icon.setVisible(false);
        continue;
      }
      icon.setPosition(startX + slot * STATUS_ICON_SPACING, iconY).setVisible(true);
    }
  }

  // Resolves one hit's damage against `defender`'s real Battle Cats
  // attribute (see TRAIT_CONFIG.js), including this attacker's own Critical
  // Hit roll and Weaken debuff (if any is currently active on it). Critical
  // Hit is uniquely the one thing that bypasses Metal's flat-damage rule,
  // so it's rolled and checked FIRST — if it fires against a Metal
  // defender, the flat-damage short-circuit is skipped entirely and damage
  // is computed normally. Weaken multiplies the ATTACKER's outgoing damage
  // (bible §A.3.8 — Weaken touches attack power only, never movement).
  computeDamage(attacker, defender) {
    const isCrit = Math.random() < (attacker.config.critChance || 0);

    // Metal (TRAIT_CONFIG.js): any non-critical hit is capped at a flat
    // amount no matter what else would apply — Critical Hit is the one
    // thing that ignores it, checked first and separately from every other
    // ability below.
    if (defender.config.attribute === METAL_ATTRIBUTE && !isCrit) {
      return { damage: METAL_FLAT_DAMAGE_AMOUNT, isCrit };
    }

    // Real Battle Cats abilities target an ENEMY's attribute, not a
    // symmetric trait-vs-trait cycle (see TRAIT_CONFIG.js's header): a unit
    // never "has" an attribute of its own, so this only ever looks at
    // whichever side in this hit is the enemy.
    const enemyConfig = attacker.isPlayerSide ? defender.config : attacker.config;
    const unitConfig = attacker.isPlayerSide ? attacker.config : defender.config;
    const enemyAttribute = enemyConfig.attribute;

    // Curse (bible §A.3.8) suppresses Strong Against/Resistant/Massive
    // Damage same as every other special ability — dealt-side bonuses
    // (strongBonus) are the ATTACKER's own ability, taken-side bonuses
    // (resistMultiplier) are the DEFENDER's, so each checks its own side's
    // curse state independently.
    let strongBonus = 1;
    if (enemyAttribute && attacker.curseMs <= 0) {
      if (attacker.isPlayerSide && unitConfig.massiveVs === enemyAttribute) {
        strongBonus = MASSIVE_DEALT_MULTIPLIER; // Massive Damage: dealt only
      } else if (attacker.isPlayerSide && unitConfig.strongVs === enemyAttribute) {
        strongBonus = STRONG_DEALT_MULTIPLIER; // Strong Against, dealt half
      }
    }

    let resistMultiplier = 1;
    if (!attacker.isPlayerSide && enemyAttribute && defender.curseMs <= 0) {
      // The enemy is attacking; `unitConfig` is the defending unit here.
      if (unitConfig.strongVs === enemyAttribute) {
        resistMultiplier = STRONG_TAKEN_MULTIPLIER; // Strong Against, taken half
      } else if (unitConfig.resistantVs === enemyAttribute) {
        resistMultiplier = RESISTANT_TAKEN_MULTIPLIER; // Resistant: taken only
      }
    }

    const weakenMultiplier = attacker.weakenMs > 0 ? attacker.weakenMultiplier : 1;
    const critMultiplier = isCrit ? CRITICAL_DEALT_MULTIPLIER : 1;
    const superClassMultiplier = this.getSuperClassMultiplier(attacker, defender);

    const damage =
      attacker.config.damage * strongBonus * resistMultiplier * weakenMultiplier * critMultiplier * superClassMultiplier;
    return { damage, isCrit };
  }

  // Colossus/Behemoth Slayer (bible §A.3.8) — independent of, and stacking
  // multiplicatively with, the trait matchup above (both apply simultaneously
  // per the bible). Two symmetric halves, either or both of which can fire
  // on the same hit: the ATTACKER's own Slayer flag boosts damage dealt
  // against a superClass DEFENDER, and the DEFENDER's own Slayer flag
  // reduces damage taken from a superClass ATTACKER.
  getSuperClassMultiplier(attacker, defender) {
    let multiplier = 1;

    const defenderBonus = SUPER_CLASS_SLAYER_BONUSES[defender.config.superClass];
    if (defenderBonus && attacker.config[`${defender.config.superClass}Slayer`]) {
      multiplier *= defenderBonus.dealt;
    }

    const attackerBonus = SUPER_CLASS_SLAYER_BONUSES[attacker.config.superClass];
    if (attackerBonus && defender.config[`${attacker.config.superClass}Slayer`]) {
      multiplier *= attackerBonus.taken;
    }

    return multiplier;
  }

  // Player-triggered: tapping the Cat Cannon button only does something
  // once the meter is full (see updateCannonButton for its ready-state
  // visual) — nothing else can block it; it always fires the instant it's
  // charged, regardless of any status effect active on the base.
  tryTriggerSpecialBurst() {
    if (this.isGameOver) return;
    if (this.specialMeter < SPECIAL_METER_MAX) return;

    this.triggerSpecialBurst();
  }

  // Fires CANNON_BASE_WAVE_COUNT + Cannon Range discrete blasts (guide
  // Chapter 08: real Cat Cannon shots are multiple separate one-frame
  // hits, not one continuous beam), the first at CANNON_BLAST_START_MS and
  // each next one CANNON_BLAST_STEP_MS later, matching the guide's own
  // frame-by-frame breakdown. Resets the meter to 0 once, up front, plays
  // the cosmetic recoil-and-aim-flash immediately, then schedules each
  // blast's own damage/knockback/visual (fireCannonWave below).
  triggerSpecialBurst() {
    this.specialMeter = 0;
    playCannonSfx();
    this.cameras.main.shake(200, 0.008);
    addLifetimeStat('cannonUses');

    this.playCannonRecoilVfx();
    this.fireCannonBeamFlashVfx();

    const waveCount = CANNON_BASE_WAVE_COUNT + this.cannonWaveBonus;
    for (let wave = 0; wave < waveCount; wave += 1) {
      const delayMs = CANNON_BLAST_START_MS + wave * CANNON_BLAST_STEP_MS;
      this.time.delayedCall(delayMs, () => this.fireCannonWave(wave));
    }
  }

  // Cosmetic-only: the player tower itself stands in for the real game's
  // separate cannon barrel, nudging back and returning (real F0-10) as the
  // shot fires. Doesn't touch baseX — only this visual's own x offset.
  playCannonRecoilVfx() {
    this.tweens.add({
      targets: this.base,
      x: -8,
      duration: CANNON_RECOIL_MS / 2,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  // The real Cat Cannon's aiming-beam flash (F1-6) — purely cosmetic, no
  // hit detection of its own (real per-shot damage comes entirely from the
  // discrete blasts in fireCannonWave/fireCannonBlastVfx below). A quick
  // bright streak from the tower's head to the last blast's own far edge,
  // fading almost immediately.
  fireCannonBeamFlashVfx() {
    const waveCount = CANNON_BASE_WAVE_COUNT + this.cannonWaveBonus;
    const originX = TOWER_PLAYER_DISPLAY_WIDTH * CANNON_BEAM_ORIGIN_X_FRACTION;
    const originY = this.laneY - TOWER_SPRITE_DISPLAY_HEIGHT * CANNON_BEAM_ORIGIN_Y_FRACTION;
    const lastBlastFarEdge =
      originX + CANNON_BLAST_FIRST_CENTER_OFFSET + CANNON_BLAST_ADVANCE * (waveCount - 1) + CANNON_BLAST_WIDTH / 2;

    const beam = this.add
      .rectangle(originX, originY, lastBlastFarEdge - originX, 12, 0xffffff, 0.9)
      .setOrigin(0, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.uiCamera.ignore(beam); // world object (see setupZoomControls) — zooms/pans with the battlefield

    this.tweens.add({
      targets: beam,
      alpha: 0,
      scaleY: 0.25,
      duration: CANNON_BEAM_FLASH_MS,
      onComplete: () => beam.destroy(),
    });
  }

  // One blast's own visual: a purple expanding-and-fading "shockwave"
  // ellipse at the lane's own height (where enemies actually stand, unlike
  // the beam flash's higher head-level line) — see CANNON_BLAST_WIDTH's
  // own comment for why the real geometry is used directly as pixels.
  fireCannonBlastVfx(waveIndex) {
    const originX = TOWER_PLAYER_DISPLAY_WIDTH * CANNON_BEAM_ORIGIN_X_FRACTION;
    const centerX = originX + CANNON_BLAST_FIRST_CENTER_OFFSET + CANNON_BLAST_ADVANCE * waveIndex;

    const blast = this.add
      .ellipse(centerX, this.laneY, CANNON_BLAST_WIDTH, 90, CANNON_WAVE_COLOR, 0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.7);
    this.uiCamera.ignore(blast); // world object (see setupZoomControls) — zooms/pans with the battlefield

    this.tweens.add({
      targets: blast,
      scale: 1.15,
      alpha: 0,
      duration: CANNON_BLAST_LIFE_MS,
      ease: 'Cubic.Out',
      onComplete: () => blast.destroy(),
    });
  }

  // One blast of the Cat Cannon (see triggerSpecialBurst) — real per-shot
  // damage (guide Chapter 08's formula) to every living enemy actually
  // standing inside THIS blast's own x-range, plus the same amount to the
  // enemy base directly, since real data never distinguishes separate
  // unit-damage/base-damage values the way this build's old
  // SPECIAL_BURST_DAMAGE/SPECIAL_BURST_BASE_DAMAGE split did. Enemy kills
  // route through the normal removeDead/onEnemyKilled path so they still
  // pay out money like any other kill; the base damage goes through
  // damageEnemyBase so it still triggers a normal win if it finishes the
  // base off. Knockback here is unconditional (not the HP-threshold
  // "endurance" gate combat hits use) — the burst is a special, guaranteed
  // effect, matching the bible's Cat Cannon including knockback (§A.3.9).
  // `waveIndex` positions both the blast's own visual (fireCannonBlastVfx)
  // AND this same real per-blast POSITIONAL gating — an enemy standing
  // well behind or ahead of where this specific blast lands takes no
  // damage from it at all, even if a different blast in the same volley
  // will reach them a moment later. (The real Cat Cannon knockback's own
  // 55px/11-frame-invincibility specifics still aren't modeled — this
  // engine's knockback distances are all tuned to its own compressed
  // ~800px lane rather than the guide's raw several-thousand-unit
  // battlefield, so importing that one raw number would put it wildly out
  // of scale with every other knockbackDistance in ENEMY_CONFIG.js.)
  fireCannonWave(waveIndex) {
    if (this.isGameOver) return;
    this.fireCannonBlastVfx(waveIndex);

    const burstDamage = CANNON_BASE_DAMAGE + this.cannonPowerBonus;
    const syntheticAttacker = { shape: { x: this.baseX } };

    const originX = TOWER_PLAYER_DISPLAY_WIDTH * CANNON_BEAM_ORIGIN_X_FRACTION;
    const blastCenterX = originX + CANNON_BLAST_FIRST_CENTER_OFFSET + CANNON_BLAST_ADVANCE * waveIndex;
    const blastHalfWidth = CANNON_BLAST_WIDTH / 2;

    for (const enemy of this.enemies) {
      // Real Cat Cannon damage is a wave attack — a wave-immune enemy
      // takes none of it at all (guide Chapter 08: "波動無効の敵には
      // 一切効きません"). No enemy in this build's roster carries that
      // flag yet, but the check is here so adding one later just works.
      if (enemy.hp > 0 && !enemy.config.waveImmune && Math.abs(enemy.shape.x - blastCenterX) <= blastHalfWidth) {
        enemy.hp -= burstDamage;
        enemy.lastAttacker = syntheticAttacker; // no .config at all — never counts as a zombieKiller finish, see processZombieRevives
        // Still bypasses the HP-threshold "endurance" gate (per this
        // method's own header comment — the burst's knockback is
        // unconditional, not staggered), but 'immune' is a real wall, not a
        // threshold to skip past: this went straight to startKnockbackSlide
        // before, silently shoving knockback-immune enemies the one attack
        // in the game that's supposed to respect nothing else about them.
        if (enemy.hp > 0 && enemy.config.knockbackType !== 'immune') this.startKnockbackSlide(syntheticAttacker, enemy);
      }
    }
    this.processZombieRevives(this.enemies);
    this.removeDead(this.enemies, (enemy) => this.onEnemyKilled(enemy));
    // Same positional gating this method already applies to every enemy
    // (per its own header comment above) — this call used to run
    // unconditionally regardless of where the blast actually landed, so
    // even wave 0 (barely past the player's own base) could chip the
    // enemy base from clear across the lane.
    if (Math.abs(this.enemyBaseX - blastCenterX) <= blastHalfWidth) {
      this.damageEnemyBase(burstDamage);
    }
  }

  removeDead(list, onKill) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].hp <= 0) {
        const entity = list[i];
        entity.shape.destroy();
        if (entity.label) entity.label.destroy();
        for (const icon of Object.values(entity.statusIcons)) icon.destroy();
        list.splice(i, 1);
        if (onKill) onKill(entity);
      }
    }
  }

  damageBase(amount) {
    if (this.isGameOver) return;
    if (this.mode === 'dojo') return; // invincible — no loss condition in Sparring Grounds
    // Already destroyed and waiting on handleBaseDestroyed's own Continue-
    // vs-endGame call: showContinueOffer only sets isPaused, which doesn't
    // take effect until update()'s NEXT frame, so multiple enemies landing
    // a hit within the very same updateEnemies() pass that finishes the
    // base could otherwise each re-run handleBaseDestroyed once per
    // remaining hit — each one pushing another translucent Continue-offer
    // overlay on top of the last (and leaking the previous one, since
    // showContinueOffer overwrites this.continueOfferObjects unconditionally)
    // until they visually compounded into a solid black screen.
    if (this.baseHp <= 0) return;

    this.baseHp = Math.max(0, this.baseHp - amount);
    showDamageNumber(this, this.baseX, this.laneY - 40, amount);
    // User feedback: this fires on every single hit the base takes, which
    // with several enemies attacking at once reads as near-constant
    // shaking — was 120ms/0.005 (the same intensity the much rarer cannon
    // shot uses at 200ms/0.008), toned down since a per-hit shake needs to
    // stay subtle to not compound into something jarring.
    this.cameras.main.shake(80, 0.0025);
    if (this.baseHp <= 0) {
      this.handleBaseDestroyed();
    }
  }

  // Continue (bible §A.3.9) — offered instead of an immediate game-over
  // when the stage allows it, there are offers left this battle, and the
  // player can actually afford the next one; falls through to a normal
  // endGame() otherwise (including a decline).
  handleBaseDestroyed() {
    const cost = CONTINUE_GEM_COSTS[this.continuesUsed];
    const canOffer =
      cost !== undefined && this.stage.allowContinue !== false && loadPlayerProgress().gems >= cost;

    if (canOffer) this.showContinueOffer(cost);
    else this.endGame();
  }

  showContinueOffer(cost) {
    this.setPaused(true);

    const { width, height } = LOGICAL_SIZE;
    const objects = [];

    objects.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setInteractive());
    objects.push(
      this.add
        .text(width / 2, height / 2 - 60, `Your base was destroyed!\nContinue for ${cost} Gems?`, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '18px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5),
    );
    objects.push(
      this.add
        .text(width / 2, height / 2 - 20, `You have ${loadPlayerProgress().gems.toLocaleString()} Gems`, {
          fontFamily: 'Rowdies, sans-serif', fontSize: '13px',
          color: '#66ddff',
        })
        .setOrigin(0.5),
    );

    const buttonY = height / 2 + 30;
    const continueButton = this.add
      .rectangle(width / 2 - 90, buttonY, 150, 48, 0xffdd33)
      .setInteractive({ useHandCursor: true });
    objects.push(
      continueButton,
      this.add
        .text(width / 2 - 90, buttonY, `Continue\n${cost} Gems`, { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#000000', align: 'center' })
        .setOrigin(0.5),
    );

    const declineButton = this.add
      .rectangle(width / 2 + 90, buttonY, 150, 48, 0x444444)
      .setInteractive({ useHandCursor: true });
    objects.push(
      declineButton,
      this.add.text(width / 2 + 90, buttonY, 'No Thanks', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5),
    );

    continueButton.on('pointerdown', () => {
      if (!trySpendGems(cost)) return; // shouldn't happen (gated above), but never spend a hit you can't afford
      this.continuesUsed += 1;
      this.baseHp = this.baseMaxHp;
      this.hideContinueOffer();
    });
    declineButton.on('pointerdown', () => {
      this.hideContinueOffer();
      this.endGame();
    });

    this.cameras.main.ignore(objects); // UI (see setupZoomControls) — stays fixed regardless of battle zoom
    this.continueOfferObjects = objects;
  }

  hideContinueOffer() {
    if (!this.continueOfferObjects) return;
    this.continueOfferObjects.forEach((obj) => obj.destroy());
    this.continueOfferObjects = null;
    this.setPaused(false);
  }

  damageEnemyBase(amount) {
    if (this.isGameOver) return;
    if (this.mode === 'dojo') return; // no destroy-the-base win condition in Sparring Grounds

    // Failsafe (bible §A.3.9): a fast burst shouldn't be able to skip a
    // scripted boss spawn entirely — while any boss entry hasn't spawned
    // yet, the base is held at 1 HP (never actually finished off) just
    // long enough for the updateSpawns() call below to fire it.
    const hasPendingBossTrigger = this.spawnState.some(
      (state) => state.entry.isBoss && state.spawnedCount < (state.rule.maxCount ?? 1),
    );
    let nextHp = this.enemyBaseHp - amount;
    if (hasPendingBossTrigger && nextHp <= 0) nextHp = 1;

    this.enemyBaseHp = Math.max(0, nextHp);
    this.updateSpawns();

    if (this.enemyBaseHp <= 0) {
      this.winStage();
    }
  }

  endGame() {
    this.isGameOver = true;
    playMusic(DEFEAT_MUSIC_URL);

    const finalScore = this.getScore();
    // A loss can still raise a stage's best score; it never marks it cleared.
    saveStageResult(this.stage.id, finalScore, false);
    this.showEndScreen(['GAME OVER', `Score: ${finalScore}`]);
  }

  // Sparring Grounds' only ending: the timer runs out (see update()). No
  // stage-clear rewards at all (bible: Dojo is a pure damage-test venue) —
  // just a best-score record, same getScore() formula as a normal stage
  // (enemiesKilled-weighted + elapsed time), reused as-is since Dojo has no
  // reason to compute score any differently.
  endDojo() {
    this.isGameOver = true;

    const finalScore = this.getScore();
    const { bestScore, isNewBest } = saveDojoScore(finalScore);
    const lines = ['TIME UP!', `Score: ${finalScore}`];
    lines.push(isNewBest ? 'New best score!' : `Best: ${bestScore}`);
    this.showEndScreen(lines);
  }

  // The only win trigger: destroying the enemy base (see damageEnemyBase).
  winStage() {
    this.isGameOver = true;
    playMusic(VICTORY_MUSIC_URL);

    const finalScore = this.getScore();
    // Read both the clear count AND whether this stage was EVER cleared
    // before BEFORE saveStageResult updates either — the XP decay (bible
    // §A.5.1) needs the prior clear count, and the Gems first-clear bonus
    // (bible §A.5) needs to know this specific win is the first one.
    const wasAlreadyCleared = loadStageProgress()[this.stage.id]?.cleared === true;
    const xpReward = this.getXpReward();
    const rewards = grantStageRewards({
      xp: xpReward,
      evoShardChance: EVO_SHARD_DROP_CHANCE,
      growthCharmChance: GROWTH_CHARM_DROP_CHANCE,
    });
    saveStageResult(this.stage.id, finalScore, true);
    // Treasure Radar (bible §A.8) forces the top tier outright instead of
    // the normal drop-chance/tier-roll.
    const treasureResult = this.treasureRadarActive
      ? guaranteeTopTier(this.stage.id)
      : rollTreasureForStage(this.stage.id);
    const droppedItem = rollBattleItemDrop();

    const isFirstClear = !wasAlreadyCleared;
    if (isFirstClear) {
      addGems(this.stage.gemsFirstClear);
      addUserRank(RANK_PER_FIRST_CLEAR); // User Rank (bible §A.7.4) — see UserRank.js
    }

    // Results screen "Next Stage" button (bible §A.10.5) — only offered on
    // an actual win, and only when a next stage exists at all (this was
    // already the very last stage of the very last saga otherwise). It's
    // always unlockED the instant this win is recorded above, since
    // StageSelectScene's own unlock check is just "was the previous
    // STAGE_CONFIG entry cleared" — no separate unlock bookkeeping needed
    // here.
    const globalIndex = STAGE_CONFIG.indexOf(this.stage);
    const nextStage = STAGE_CONFIG[globalIndex + 1] || null;

    this.playVictorySequence({
      finalScore, xpReward, treasureResult, droppedItem, isFirstClear,
      evoShardsGranted: rewards.evoShardsGranted,
      growthCharmsGranted: rewards.growthCharmsGranted,
      gemsAwarded: this.stage.gemsFirstClear,
    }, nextStage);
  }

  // XP reward for THIS clear (bible §A.5.1): full baseXp on a first win,
  // decaying by XP_DECAY_PER_CLEAR per prior clear of this same stage down
  // to a floor of XP_DECAY_FLOOR — the same "don't let players farm one
  // easy stage forever at full reward" shape the bible's real formula has,
  // simplified to a flat per-clear decay instead of the real per-mode
  // lookup formula.
  getXpReward() {
    const previousClears = getClearCount(this.stage.id);
    const decay = Math.max(XP_DECAY_FLOOR, 1 - XP_DECAY_PER_CLEAR * previousClears);
    // Study Base Upgrade (bible §A.7.1) — % more XP per clear. Treasure's
    // xpPercent stacks as its own further independent multiplier. XP Boost
    // (bible §A.8, this.xpBoostMultiplier) is likewise separate, defaulting
    // to 1 (a no-op) when unused.
    return Math.round(
      this.stage.baseXp * decay * (1 + this.studyBonusPercent / 100) * (1 + getBonusPercent('xpPercent') / 100) * this.xpBoostMultiplier,
    );
  }

  // `nextStage` (winStage only) adds a third "Next Stage" button (bible
  // §A.10.5) alongside the always-present Restart/Menu pair.
  showEndScreen(lines, nextStage = null) {
    this.gameOverText.setText(lines.join('\n'));
    this.gameOverBackdrop.setVisible(true);
    if (this.mode !== 'dojo') this.updateBattleItemButtons(); // grey out now that isGameOver is true
    this.createEndScreenButtons(nextStage, LOGICAL_SIZE.height / 2 + 90);
  }

  // Restart/Next Stage/Menu row shared by the plain loss/Dojo end screen
  // (showEndScreen) and the win-only staged reveal (playVictorySequence) —
  // `startAlpha`/fade-in lets the latter hold these back until its own
  // sequence finishes instead of dumping every button on screen at once
  // alongside a still-animating reward reveal.
  createEndScreenButtons(nextStage, buttonY, startAlpha = 1) {
    const { width } = LOGICAL_SIZE;
    const buttonWidth = 160;
    const buttonGap = 20;

    const labels = ['Restart'];
    if (nextStage) labels.push('Next Stage');
    labels.push('Menu');

    const totalWidth = labels.length * buttonWidth + (labels.length - 1) * buttonGap;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;
    const buttons = [];

    labels.forEach((label, index) => {
      const x = startX + index * (buttonWidth + buttonGap);
      // Next Stage gets the primary gold treatment (reference's own
      // "OK"-style button) so it reads as the recommended action, not just
      // a third identical gray button.
      const isPrimary = label === 'Next Stage';
      let onClick;
      if (label === 'Restart') {
        onClick = () => {
          // Dojo is free entry (no energyCost on its synthetic this.stage —
          // see create()) and stays free to retry. A real stage battle
          // charges the same Energy a fresh map/Next-Stage entry would —
          // Restart was the one entry point that let a player replay a
          // stage for free, inconsistent with every other way in.
          if (this.mode !== 'dojo' && !trySpendEnergy(this.stage.energyCost)) {
            this.showRestrictionMessage('Not enough Energy to retry!');
            return;
          }
          this.scene.restart();
        };
      } else if (label === 'Next Stage') {
        onClick = () => {
          if (!trySpendEnergy(nextStage.energyCost)) {
            this.showRestrictionMessage('Not enough Energy for the next stage!');
            return;
          }
          this.scene.start('GameScene', { stageId: nextStage.id });
        };
      } else {
        // Dojo wasn't reached via Stage Select at all (HomeScene launches it
        // directly), so "Menu" should return there instead. A normal stage
        // battle returns to its OWN saga's stage list (bible §A.6.1), not
        // always saga1's — this.stage.saga is read straight off the stage
        // record STAGE_CONFIG already resolved in create().
        onClick = () => this.scene.start(this.mode === 'dojo' ? 'HomeScene' : 'StageSelectScene', { sagaId: this.stage.saga });
      }

      const button = createBcButton(this, x, buttonY, buttonWidth, 60, label, onClick, {
        fill: isPrimary ? BC.gold : 0x8a8a8a,
        highlight: isPrimary ? BC.goldHighlight : 0xbbbbbb,
        textColor: isPrimary ? BC.goldInk : '#ffffff',
        fontSize: 18,
      });
      this.cameras.main.ignore(button); // UI (see setupZoomControls)
      button.setAlpha(startAlpha);
      if (startAlpha === 0) button.bcHit.disableInteractive(); // the container itself is never interactive — only its bcHit child is
      buttons.push(button);
    });
    return buttons;
  }

  // The win-only staged reveal (guide Chapter 08's リザルトとお宝演出) — every
  // other ending (loss, Dojo time-up) stays the plain instant showEndScreen
  // above, since neither carries structured reward data nor gets the
  // guide's own elaborate treatment there. Real frame counts (30fps) are
  // adapted to real-time durations rather than followed literally — the
  // guide's own numbers are reproduction values, not confirmed originals
  // (see its own 事実/仕様/要計測 labeling), and some (e.g. "XP count-up
  // spans 2 frames") clearly don't survive that conversion literally.
  // Sequence: banner+score drop in with a bounce, XP counts up, each bonus
  // line (Evo Shard/Growth Charm/Battle Item/first-clear Gems) scales in
  // with a stagger, a treasure upgrade gets its own darkened reveal beat,
  // and only THEN do the Restart/Next Stage/Menu buttons fade in — so the
  // player watches the payout resolve before being invited to move on,
  // instead of everything landing in one static block at once.
  playVictorySequence(result, nextStage) {
    if (this.mode !== 'dojo') this.updateBattleItemButtons(); // grey out now that isGameOver is true

    const { width, height } = LOGICAL_SIZE;
    const panelWidth = 380;
    const hasTreasure = result.treasureResult?.improved;
    const bonusLines = [];
    if (result.evoShardsGranted) bonusLines.push('+1 Evo Shard!');
    if (result.growthCharmsGranted) bonusLines.push('+1 Growth Charm!');
    if (result.droppedItem) bonusLines.push(`+1 ${result.droppedItem.displayName}!`);
    if (result.isFirstClear) bonusLines.push(`+${result.gemsAwarded} Gems! (First Clear)`);

    const panelHeight = 150 + bonusLines.length * 22;
    const restY = height / 2 - 40;

    // Banner + score panel drops from off-screen with a bounce (guide:
    // "victory banner drops from top, bounces twice").
    const panel = drawBcPanel(this, width / 2, restY, panelWidth, panelHeight);
    panel.y = -panelHeight;
    const bannerText = this.add
      .text(width / 2, restY - panelHeight / 2 + 30, 'STAGE CLEAR', { fontFamily: FONT, fontSize: '24px', color: BC.inkHex })
      .setOrigin(0.5);
    bannerText.y -= panelHeight;
    const scoreText = this.add
      .text(width / 2, restY - panelHeight / 2 + 62, `Score: ${result.finalScore}`, { fontFamily: FONT, fontSize: '14px', color: '#7a5c1e' })
      .setOrigin(0.5);
    scoreText.y -= panelHeight;

    this.cameras.main.ignore([panel, bannerText, scoreText]); // UI (see setupZoomControls)
    this.tweens.add({
      targets: [panel, bannerText, scoreText], y: `+=${panelHeight}`,
      duration: 420, ease: 'Bounce.easeOut',
    });

    // XP count-up (guide: begins once the banner's landed, reaches the
    // real total over a short linear ramp).
    const xpY = restY - panelHeight / 2 + 90;
    const xpText = this.add
      .text(width / 2, xpY, '+0 XP', { fontFamily: FONT, fontSize: '16px', color: BC.goldInk })
      .setOrigin(0.5)
      .setAlpha(0);
    this.cameras.main.ignore(xpText);

    const xpCounter = { value: 0 };
    this.time.delayedCall(500, () => {
      xpText.setAlpha(1);
      this.tweens.add({
        targets: xpCounter, value: result.xpReward,
        duration: 700, ease: 'Cubic.easeOut',
        onUpdate: () => xpText.setText(`+${Math.round(xpCounter.value).toLocaleString()} XP`),
      });
    });

    // Bonus lines scale in one at a time (guide: 12F each, 6F stagger).
    const bonusStartY = xpY + 30;
    bonusLines.forEach((line, i) => {
      const bonusText = this.add
        .text(width / 2, bonusStartY + i * 22, line, { fontFamily: FONT, fontSize: '13px', color: BC.inkHex })
        .setOrigin(0.5)
        .setScale(0)
        .setAlpha(0);
      this.cameras.main.ignore(bonusText);
      this.time.delayedCall(1300 + i * 180, () => {
        playUiTapSfx();
        this.tweens.add({ targets: bonusText, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
      });
    });

    const sequenceEndMs = 1300 + bonusLines.length * 180 + 300;

    // Only now do Restart/Next Stage/Menu fade in — the payout has finished
    // resolving by this point instead of sitting there the whole time.
    // Shared between the natural timeout below and a manual treasure-card
    // dismiss (see hasTreasure below), guarded so a dismiss tap that lands
    // after the timeout already fired can't create a second button row.
    let buttonsShown = false;
    const revealButtons = () => {
      if (buttonsShown) return;
      buttonsShown = true;
      const buttons = this.createEndScreenButtons(nextStage, height / 2 + 90, 0);
      this.tweens.add({ targets: buttons, alpha: 1, duration: 300 });
      buttons.forEach((b) => b.bcHit.setInteractive({ useHandCursor: true }));
    };

    // Treasure upgrade gets its own darkened reveal beat (guide: screen
    // darkens, treasure card appears rotating) — only when one actually
    // happened, same "only decorate what's real" rule the plain
    // showEndScreen's line list already followed.
    let buttonDelayMs = sequenceEndMs;
    if (hasTreasure) {
      const treasureDelayMs = sequenceEndMs;
      buttonDelayMs = treasureDelayMs + 900;
      this.time.delayedCall(treasureDelayMs, () => {
        // Bug fix: this card used to just sit here forever once shown,
        // right on top of the Restart/Next Stage/Menu row that faded in
        // underneath it a moment later — with nothing to dismiss it, it
        // was blocking those buttons for the rest of the results screen.
        // `dim` is now interactive and covers the full screen specifically
        // so a tap ANYWHERE dismisses the whole reveal early and drops
        // straight into the (now unobstructed) button row, instead of only
        // ever being decorative.
        const dim = this.add
          .rectangle(width / 2, height / 2, width, height, 0x000000, 0)
          .setDepth(999)
          .setInteractive({ useHandCursor: true });
        this.cameras.main.ignore(dim);
        this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 200 });

        // Real reveal, not a generic tier-colored placeholder: shows the
        // actual charm that dropped (this stage's own Treasure Set — see
        // init()'s pendingTreasureSet/preload's own note) plus its real
        // name, same art TreasureScene itself renders for an earned tier.
        const tier = result.treasureResult.tier;
        const set = this.pendingTreasureSet;
        const iconKey = set ? `treasure_${set.icon}_${TREASURE_TIER_ICON_KEYS[tier]}` : null;
        const hasIcon = iconKey && this.textures.exists(iconKey);

        const cardWidth = 170;
        const cardHeight = 220;
        const card = this.add.container(width / 2, height / 2).setDepth(1000);
        card.setScale(0);
        card.setAngle(-25);

        const cardBg = this.add
          .rectangle(0, 0, cardWidth, cardHeight, BC.panel)
          .setStrokeStyle(4, TREASURE_TIER_COLOR[tier]);
        const tierText = this.add
          .text(0, -cardHeight / 2 + 24, `${TREASURE_TIER_NAMES[tier]} Treasure!`, {
            fontFamily: FONT, fontSize: '13px', color: BC.inkHex, align: 'center',
          })
          .setOrigin(0.5);
        const nameText = this.add
          .text(0, cardHeight / 2 - 30, set ? set.name : '', {
            fontFamily: FONT, fontSize: '15px', color: BC.inkHex, align: 'center',
            wordWrap: { width: cardWidth - 20 },
          })
          .setOrigin(0.5);
        const cardParts = [cardBg, tierText, nameText];

        if (hasIcon) {
          cardParts.push(this.add.image(0, -8, iconKey).setDisplaySize(76, 76));
        } else {
          // Fallback for the practically-impossible case of a stage with no
          // matching Treasure Set (every stage is covered by one — see
          // TREASURE_CONFIG.js) — still shows SOMETHING instead of a blank card.
          cardParts.push(this.add.circle(0, -8, 30, TREASURE_TIER_COLOR[tier]).setStrokeStyle(2, BC.ink));
        }

        card.add(cardParts);
        this.cameras.main.ignore([card, ...cardParts]);

        playUiTapSfx();
        this.tweens.add({
          targets: card, scale: 1, angle: 0,
          duration: 500, ease: 'Back.easeOut',
        });

        dim.on('pointerdown', () => {
          dim.disableInteractive();
          this.tweens.add({
            targets: [dim, card], alpha: 0, duration: 150,
            onComplete: () => {
              dim.destroy();
              card.destroy();
            },
          });
          revealButtons(); // don't make the player wait out the rest of the original timer too
        });
      });
    }

    this.time.delayedCall(buttonDelayMs, revealButtons);
  }
}
