import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { ENEMY_CONFIG } from './ENEMY_CONFIG.js';
import { preloadSpriteRoster, addUnitIcon } from './SpriteIcon.js';
import { preloadBackgrounds, addBackground, getStageBattleBackgroundId } from './Backdrop.js';
import { STAGE_CONFIG, getStageCostMultiplier } from './STAGE_CONFIG.js';
import { saveStageResult, getClearCount, loadStageProgress } from './StageProgress.js';
import { MONEY_CONFIG } from './MONEY_CONFIG.js';
import {
  FLAT_DAMAGE_TRAIT,
  FLAT_DAMAGE_AMOUNT,
  MATCHUP_BONUSES,
  RESIST_BONUSES,
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
import { loadLoadout } from './Loadout.js';
import { trySpendEnergy } from './Energy.js';
import { getComboBonusValue } from './Combo.js';
import { hasReachedPartEvolution } from './PartEvolution.js';
import { DOJO_CONFIG } from './DOJO_CONFIG.js';
import { saveDojoScore } from './DojoProgress.js';
import {
  playDeploySfx,
  playCannonSfx,
  playBossShockwaveSfx,
  playVictorySfx,
  playDefeatSfx,
  playHitSfx,
  playCritSfx,
  startMusic,
  stopMusic,
  VOLUME_LEVEL_LABELS,
  getSfxVolumeLevel,
  cycleSfxVolumeLevel,
  getBgmVolumeLevel,
  cycleBgmVolumeLevel,
  isMuted,
  VOLUME_LEVELS,
} from './Audio.js';
import { addUserRank } from './UserRank.js';
import { BATTLE_ITEMS_CONFIG } from './BATTLE_ITEMS_CONFIG.js';
import { getBattleItemCount, tryUseBattleItem, rollBattleItemDrop } from './BattleItems.js';
import { preloadAttackVfx, createAttackVfxAnims, fireAttackVfx } from './AttackVfx.js';
import { showDamageNumber } from './CombatFeedback.js';
import { addLifetimeStat } from './LifetimeStats.js';

// Account-wide Base Upgrades (bible §A.7.1) — read once per battle at
// create() time into flat numbers, since they only change between battles
// (via UpgradeScene/BaseUpgradeScene), never mid-fight.
function getBaseUpgradeEffect(key) {
  return getBaseUpgradeLevel(key) * BASE_UPGRADE_CONFIG[key].perLevelEffect;
}

const MIN_RECHARGE_MS = 2000; // bible §A.3.2: hard floor is 60 frames @ 30fps = 2.0s, across the whole game — Research can never push a unit's recharge below this

// Global deploy limit (bible §A.3.11) — "a wide default ceiling" on every
// stage, tightened by specific Restriction Stages' own (much smaller)
// `restrictions.maxDeployed` value (see STAGE_CONFIG.js — those already use
// 3/4/5). The bible doesn't pin an exact reference number for the
// unrestricted default, only that it should rarely bind — 20 sits
// comfortably above every Restriction Stage's own explicit cap while still
// being a real ceiling against unlimited spam.
const DEFAULT_MAX_DEPLOYED = 20;

// Trickle-spawn fallback (see scheduleStageScript/scheduleTrickleWave) — how
// long to wait after the last scripted wave before starting the repeat, and
// how often it repeats after that. Reasoned to sit close to this game's own
// scripted wave spacing (commonly 4000ms apart — see STAGE_CONFIG.js) rather
// than a bible-cited number, since the bible only specifies that repeating
// waves should exist, not their exact cadence.
const TRICKLE_START_DELAY_MS = 6000;
const TRICKLE_INTERVAL_MS = 7000;
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

// Run-pose animation (see updateRunCycle) — how long one full run_0/run_1
// alternation takes.
const RUN_FRAME_PERIOD_MS = 320;

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
const WORLD_ZOOM_MIN = 1;
const WORLD_ZOOM_MAX = 2.2;
const WORLD_ZOOM_WHEEL_SENSITIVITY = 0.001; // fraction of zoom changed per wheel-delta unit

// A scripted boss (STAGE_CONFIG entries with isBoss: true) is otherwise
// pixel-identical to its normal namesake enemy aside from a big hp
// multiplier — the shockwave/warning flash at the moment it spawns is a
// one-time announcement, not an ongoing visual cue for the rest of the
// fight. A straightforward size bump (visual only — its actual gameplay
// radius/hitbox is untouched, so this doesn't change combat/spacing at
// all) keeps it reading as "the big one" for as long as it's alive.
const BOSS_VISUAL_SCALE_MULTIPLIER = 1.6;

// Part evolution's glow (see PartEvolution.js/spawnUnit) — a single flat,
// subtle strength rather than something that draws the eye across the
// whole lane; the evolved sprite art itself (where a unit has one) is
// already the primary "this leveled up" signal, so the glow's job is just
// a quiet accent, both for units that get it alongside real evolved art
// and Titan, which relies on it alone.
const PART_EVOLUTION_GLOW_STRENGTH = 0.9;

const LANE_Y_RATIO = 0.5;
const BASE_WIDTH = 60;

const BUTTON_HEIGHT = 70;
// BUTTON_WIDTH is a CEILING, not a fixed size — createSpawnButtons shrinks
// the actual per-button width to whatever fits SPAWN_BUTTONS_PER_ROW
// buttons in one row, capped at this value.
const BUTTON_WIDTH = 136;
const BUTTON_GAP = 8;
const SPAWN_ROW_LEFT_MARGIN = 16;
const SPAWN_ROW_CANNON_GAP = 10; // clearance kept between the row and the Cannon button's own footprint
const SPAWN_ROW_GAP = 6;
// A Formation/Deck can hold up to MAX_LOADOUT_SIZE (10, matching the real
// game's own Deck size) units — wrapped into rows of 5 (bible §A.10.3/real
// Battle Cats' own deploy bar) rather than shrunk to fit one long row, so
// each button stays large and legible regardless of Formation size.
const SPAWN_BUTTONS_PER_ROW = 5;

const CAP_BUTTON_WIDTH = 150;
const CAP_BUTTON_HEIGHT = 44;

const SCORE_PER_KILL = 10;


const BASE_COLOR = 0x3366cc;
const ENEMY_BASE_COLOR = 0x992222;

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
const SPECIAL_CHARGE_PER_SEC = 10; // fills from empty in 20s
const SPECIAL_BURST_DAMAGE = 30;
const SPECIAL_BURST_BASE_DAMAGE = 25;
const CANNON_BUTTON_RADIUS = 34;
const CANNON_NOT_READY_COLOR = 0x555566;
const CANNON_READY_COLOR = 0xffdd33;
const CANNON_CHARGE_FILL_COLOR = 0xffaa33;
const SPECIAL_FLASH_COLOR = 0xffdd33;
const SPECIAL_FLASH_DURATION_MS = 250;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
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
    // Real boss battle theme (see updateBossMusic) — the only real audio
    // FILE this build plays; everything else in Audio.js is synthesized on
    // the fly and needs no preloading.
    if (!this.cache.audio.exists('bgm_boss')) this.load.audio('bgm_boss', '/audio/bgm_boss.wav');
  }

  create(data) {
    const { width, height } = this.scale;

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
    this.cannonChargePerSecBonus = getBaseUpgradeEffect('cannonCharge');
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

    // The player's chosen Formation (bible §A.10.3) — only these units get
    // a deploy button at all, see createSpawnButtons. Falls back to every
    // unit if nothing's saved (Loadout.js's own default), so this never
    // regresses a player who's never opened the Formation screen.
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
    this.baseMaxHp = this.stage.baseHp + this.baseDefenseBonus;
    this.baseHp = this.baseMaxHp;
    this.enemyBaseX = width - BASE_WIDTH / 2;
    this.enemyBaseMaxHp = this.stage.enemyBaseHp;
    this.enemyBaseHp = this.enemyBaseMaxHp;
    this.enemies = [];
    this.playerUnits = [];
    // Base-HP%-triggered spawns (bible §A.3.9) — e.g. a scripted boss at
    // 99% enemy base HP — checked in damageEnemyBase rather than on a timer.
    // Dojo's synthetic pseudo-stage has no spawnScript at all, so this is
    // always empty there.
    this.pendingHpTriggers = (this.stage.spawnScript || [])
      .filter((entry) => entry.baseHpPercentTrigger !== undefined)
      .map((entry) => ({ entry, fired: false }));
    // Battle Items (bible §A.8) — consumed mid-battle via useBattleItem;
    // these flags are what their effects actually read at the relevant
    // point (getMoneyRampMultiplier, getXpReward, winStage's Treasure roll).
    this.moneyRampBypassed = false; // Rich Cat
    this.xpBoostMultiplier = 1; // XP Boost
    this.treasureRadarActive = false; // Treasure Radar
    this.continuesUsed = 0; // Continue (bible §A.3.9) — see CONTINUE_GEM_COSTS
    this.aliveBossCount = 0; // how many currently-alive enemies are boss-tagged — see spawnScriptedEnemy/onEnemyKilled/updateBossMusic
    this.bossMusicSound = null; // the real boss.wav Sound instance while one's playing, else null
    // Combo's "Starting Money Up" is a bonus ON TOP of the normal starting
    // fill — deliberately allowed to exceed getWalletCap() for this one
    // initial value (a real "bonus," not just a differently-computed cap);
    // every accrual tick afterward still clamps to the normal cap as usual.
    this.money = this.getWalletCap() * (1 + comboStartingMoneyPercent / 100);
    this.enemiesKilled = 0;
    this.specialMeter = 0;
    this.enemyBaseCurseMs = 0; // curse landed on the enemy base — currently a no-op, nothing to suppress there yet
    this.elapsedMs = 0;
    // Nothing enemy-side should happen before the player deploys their
    // first unit — no scripted/dojo spawns, no Cat Cannon charge (bible
    // §A.3.9 describes the cannon as charging "during battle," and there's
    // no battle yet). See trySpawnUnit (flips this true and kicks off
    // scheduleStageScript/scheduleDojoWaves, which create() itself no
    // longer calls) and update (gates specialMeter's charge on it).
    this.battleStarted = false;
    this.isGameOver = false;
    this.isPaused = false; // true while the Quit confirm overlay is up — see showQuitConfirm/update
    // Speed Up (bible §A.10.4) — an unlimited toggle in this build (the
    // real game gates 2x/3x behind item charges and a subscription perk;
    // out of scope here, see the Battle Items note in this session's
    // commit). Scales BOTH this scene's own per-frame deltaMs (see update)
    // and Phaser's own timer clock (this.time.timeScale), so scripted
    // enemy spawns and the special-burst flash speed up consistently too.
    this.speedMultiplier = 1;

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

    // Semi-transparent (rather than the old fully-opaque fill) so the
    // backdrop's own ground/sky still shows through above and below the
    // lane while still giving unit/text contrast a darkened band to sit on.
    this.worldGameObjects.push(this.add.rectangle(width / 2, this.laneY, width, 80, 0x2a2a2a, 0.55));

    this.base = this.add.rectangle(this.baseX, this.laneY, BASE_WIDTH, 100, BASE_COLOR);
    this.worldGameObjects.push(this.base);
    // Left-anchored (not centered on baseX): the base sits flush against the
    // canvas's left edge, so a centered "current/max" string would overflow
    // past x=0 (confirmed via direct measurement — a 76px-wide string
    // centered at baseX=30 spans -8..68). Anchoring to the left edge and
    // growing rightward keeps it fully on-screen regardless of digit count.
    this.baseHpText = this.add
      .text(2, this.laneY - 70, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);
    this.worldGameObjects.push(this.baseHpText);

    this.enemyBase = this.add.rectangle(this.enemyBaseX, this.laneY, BASE_WIDTH, 100, ENEMY_BASE_COLOR);
    this.worldGameObjects.push(this.enemyBase);
    // Mirror of the above: right-anchored, growing leftward from the
    // canvas's right edge.
    this.enemyBaseHpText = this.add
      .text(width - 2, this.laneY - 70, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '18px',
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
      color: '#ffdd33',
    });

    // Top-right: a single combined "current/cap円" wallet readout
    // (confirmed screenshot format/position — replaces this build's old
    // separate top-left money text + small "Cap: ¥Y" line).
    this.walletText = this.add
      .text(width - 16, 16, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(1, 0);

    this.createWorkerCatButton();
    this.createCannonButton();
    this.createSpeedUpButton();

    this.gameOverText = this.add
      .text(width / 2, height / 2, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '32px',
        color: '#ffffff',
        align: 'center',
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

    // Split the two cameras now that every UI object create() itself builds
    // (pause button, stage name, wallet, spawn buttons, worker cat/cannon/
    // speed buttons, dojo timer or battle item buttons, game-over text) has
    // been created — see setupZoomControls (also creates this.uiCamera)
    // and this.worldGameObjects' own comment above for why this can be one
    // bulk diff instead of an ignore() call at every UI helper.
    this.setupZoomControls();

    // Enemy spawning (scripted stage or dojo waves) no longer starts here —
    // see battleStarted's own comment/trySpawnUnit, which kicks it off once
    // the player deploys their first unit.

    startMusic();
    // Stop the placeholder music loop no matter HOW this scene ends —
    // Restart, Quit, the post-battle Menu button, Next Stage, all of them
    // just call scene.start/scene.restart, and Phaser fires 'shutdown' on
    // every one of those. A single hook here beats sprinkling stopMusic()
    // calls at every exit point. Also tears down the real boss track
    // directly (not via updateBossMusic's own teardown branch, which would
    // wrongly resume the synth loop right as the scene is going away) if
    // one's still playing.
    this.events.once('shutdown', () => {
      stopMusic();
      if (this.bossMusicSound) {
        this.bossMusicSound.stop();
        this.bossMusicSound.destroy();
        this.bossMusicSound = null;
      }
    });
  }

  // Two-camera HUD split (Battle Cats-style scroll-to-zoom + drag-to-pan on
  // the battlefield only): cameras.main renders the world — it's what
  // getWorldPoint/setZoom/scrollX below actually operate on — and
  // this.uiCamera, added on top of it (so it draws after/in front), renders
  // the HUD at a fixed zoom 1/scroll 0 regardless. Each camera ignores the
  // other's objects; see this.worldGameObjects' own comment for how the UI
  // side of that split is gathered.
  setupZoomControls() {
    const { width, height } = this.scale;

    this.uiCamera = this.cameras.add(0, 0, width, height);
    this.uiCamera.ignore(this.worldGameObjects);
    const uiObjectsSoFar = this.children.list.filter((obj) => !this.worldGameObjects.includes(obj));
    this.cameras.main.ignore(uiObjectsSoFar);

    // Nothing to see past the battlefield's own edges (the backdrop/lane
    // exactly fill the canvas), so bounds just keep the zoomed-in view from
    // ever panning off into empty space.
    this.cameras.main.setBounds(0, 0, width, height);

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const cam = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(
        cam.zoom * (1 - deltaY * WORLD_ZOOM_WHEEL_SENSITIVITY),
        WORLD_ZOOM_MIN,
        WORLD_ZOOM_MAX,
      );
      if (newZoom === cam.zoom) return;

      // Zoom toward the cursor (the same feel as Figma/Google Maps) rather
      // than always toward the battlefield's center, so scrolling near
      // either base zooms in on THAT base instead of the lane's midpoint.
      const worldPointBefore = cam.getWorldPoint(pointer.x, pointer.y);
      cam.setZoom(newZoom);
      const worldPointAfter = cam.getWorldPoint(pointer.x, pointer.y);
      cam.scrollX += worldPointBefore.x - worldPointAfter.x;
      cam.scrollY += worldPointBefore.y - worldPointAfter.y;
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
    let isDraggingWorld = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartScrollX = 0;
    let dragStartScrollY = 0;

    this.input.on('pointerdown', (pointer) => {
      if (this.isPaused) return;
      isDraggingWorld = true;
      dragStartX = pointer.x;
      dragStartY = pointer.y;
      dragStartScrollX = this.cameras.main.scrollX;
      dragStartScrollY = this.cameras.main.scrollY;
    });

    this.input.on('pointermove', (pointer) => {
      if (!isDraggingWorld || !pointer.isDown) return;
      const cam = this.cameras.main;
      cam.scrollX = dragStartScrollX - (pointer.x - dragStartX) / cam.zoom;
      cam.scrollY = dragStartScrollY - (pointer.y - dragStartY) / cam.zoom;
    });

    this.input.on('pointerup', () => {
      isDraggingWorld = false;
    });
    this.input.on('pointerupoutside', () => {
      isDraggingWorld = false;
    });
  }

  scheduleStageScript() {
    let lastTimedEntry = null;

    for (const entry of this.stage.spawnScript) {
      // A baseHpPercentTrigger entry has no spawnDelayMs at all — it's
      // handled entirely by checkHpTriggers (called from damageEnemyBase)
      // instead of a timer.
      if (entry.spawnDelayMs === undefined) continue;

      this.time.delayedCall(entry.spawnDelayMs, () => {
        if (this.isGameOver) return;
        this.spawnScriptedEnemy(entry);
      });
      if (!lastTimedEntry || entry.spawnDelayMs > lastTimedEntry.spawnDelayMs) lastTimedEntry = entry;
    }

    // Trickle fallback (bible §A.3.11 — the reference schema's own
    // `repeat_count`/`repeat_interval` fields exist specifically so a stage
    // never leaves the enemy base standing with nothing left to fight; this
    // build's spawnScript is a plain fixed list with no repeat fields of its
    // own, so once every scripted timed wave has fired, keep re-spawning
    // the stage's own last scripted enemy on a fixed interval for as long
    // as the enemy base is still alive, rather than the field going silent).
    if (lastTimedEntry) {
      this.time.delayedCall(lastTimedEntry.spawnDelayMs + TRICKLE_START_DELAY_MS, () =>
        this.scheduleTrickleWave(lastTimedEntry),
      );
    }
  }

  scheduleTrickleWave(entry) {
    if (this.isGameOver || this.enemyBaseHp <= 0) return;
    // Never re-trigger a boss shockwave/entrance a second time — only the
    // enemy type/strength is reused, not its one-time boss behavior.
    this.spawnScriptedEnemy({ ...entry, isBoss: false });
    this.time.delayedCall(TRICKLE_INTERVAL_MS, () => this.scheduleTrickleWave(entry));
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

    this.createEnemy(type, config);
  }

  createSpawnButtons() {
    const { height } = this.scale;
    const keys = this.loadout;

    // The row's available width is bounded on the right by the Cannon
    // button's own footprint (bottom-right corner), not the full canvas —
    // at the original fixed BUTTON_WIDTH, even a single row of exactly 5
    // buttons already reached into the Cannon's circle (an existing,
    // easy-to-miss overlap caught while first checking this against a full
    // 10-unit row); centering within this narrower zone instead of the
    // whole canvas fixes both.
    const zoneLeft = SPAWN_ROW_LEFT_MARGIN;
    const zoneRight = this.cannonX - CANNON_BUTTON_RADIUS - SPAWN_ROW_CANNON_GAP;
    const zoneWidth = zoneRight - zoneLeft;

    // Wrapped into rows of SPAWN_BUTTONS_PER_ROW (5) instead of shrinking
    // to fit the whole Formation in one long row — a Formation bigger than
    // 5 gets a second row below the first, but every button stays the same
    // (near-BUTTON_WIDTH) size regardless of Formation size, matching the
    // real game's own fixed-size deploy icons.
    const columns = Math.min(keys.length, SPAWN_BUTTONS_PER_ROW);
    const totalRows = Math.ceil(keys.length / SPAWN_BUTTONS_PER_ROW);
    const buttonWidth = Math.min(BUTTON_WIDTH, (zoneWidth - (columns - 1) * BUTTON_GAP) / columns);
    const isCompact = buttonWidth < BUTTON_WIDTH - 1;
    const rowWidth = columns * buttonWidth + (columns - 1) * BUTTON_GAP;
    const startX = zoneLeft + (zoneWidth - rowWidth) / 2 + buttonWidth / 2;
    // The BOTTOM row sits at the original single-row position (unchanged
    // for a Formation of 5 or fewer); any earlier row(s) stack upward from
    // there.
    const bottomY = height - BUTTON_HEIGHT / 2 - 10;

    this.spawnButtons = keys.map((key, index) => {
      const config = UNIT_CONFIG[key];
      const row = Math.floor(index / SPAWN_BUTTONS_PER_ROW);
      const col = index % SPAWN_BUTTONS_PER_ROW;
      const x = startX + col * (buttonWidth + BUTTON_GAP);
      const y = bottomY - (totalRows - 1 - row) * (BUTTON_HEIGHT + SPAWN_ROW_GAP);

      const rect = this.add
        .rectangle(x, y, buttonWidth, BUTTON_HEIGHT, config.color)
        .setInteractive({ useHandCursor: true });

      // Portrait icon (bible's "cooldown fill on a unit's deploy icon"
      // framing implies real per-unit art on these buttons, matching the
      // reference game) — sits in the button's middle, with the name/cost
      // text squeezed to the top/bottom edges to make room. Falls back to
      // the original centered-text-only layout for any unit with no
      // sprite (none currently, but keeps this robust to a future entry).
      const icon = addUnitIcon(this, x, y - 2, config, BUTTON_HEIGHT - 22);
      const labelY = icon ? y - BUTTON_HEIGHT / 2 + 9 : y - 14;
      const costY = icon ? y + BUTTON_HEIGHT / 2 - 9 : y + 14;

      const labelText = this.add
        .text(x, labelY, config.displayName, {
          fontFamily: 'Rowdies, sans-serif', fontSize: isCompact ? '10px' : '13px',
          color: '#000000',
          align: 'center',
          wordWrap: { width: buttonWidth - 6 },
        })
        .setOrigin(0.5);

      const costText = this.add
        .text(x, costY, `${this.getUnitCost(config).toLocaleString()}円`, {
          fontFamily: 'Rowdies, sans-serif', fontSize: isCompact ? '9px' : '11px',
          color: '#000000',
        })
        .setOrigin(0.5);

      // Recharge cooldown overlay (bible §A.3.2/§A.10.4's "cooldown fill" on
      // a unit's deploy icon) — a dark wipe that shrinks from full button
      // height to 0 as unitCooldowns[key] counts down; see updateSpawnButtons.
      const cooldownOverlay = this.add
        .rectangle(x, y - BUTTON_HEIGHT / 2, buttonWidth, 0, 0x000000)
        .setOrigin(0.5, 0)
        .setAlpha(0.6);

      rect.on('pointerdown', () => this.trySpawnUnit(key));

      return { key, config, rect, icon, labelText, costText, cooldownOverlay };
    });
  }

  // Pause/Options (reference-screenshot-confirmed: a small pause icon,
  // top-left, opens an Options popup with SFX/BGM volume controls and a
  // Retreat action) — replaces this build's earlier standalone "Quit"
  // button with the real layout: Retreat now lives inside this popup
  // instead of its own top-level button.
  createPauseButton() {
    const rect = this.add.circle(24, 16, 14, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(24, 16, '⏸', { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    rect.on('pointerdown', () => this.showSettingsPopup());
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
    this.isPaused = true;

    const { width, height } = this.scale;
    const objects = [];
    const panelY = height / 2 - 30;

    objects.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setInteractive());
    objects.push(this.add.rectangle(width / 2, panelY, 340, 200, 0x333333).setStrokeStyle(2, 0xffdd33));
    objects.push(this.add.text(width / 2, panelY - 80, 'Options', { fontFamily: 'Rowdies, sans-serif', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5));

    const closeButton = this.add
      .rectangle(width / 2 + 155, panelY - 85, 28, 28, 0xcc3333)
      .setInteractive({ useHandCursor: true });
    objects.push(
      closeButton,
      this.add.text(width / 2 + 155, panelY - 85, 'X', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5),
    );
    closeButton.on('pointerdown', () => this.hideSettingsPopup());

    const sfxLabel = this.add
      .text(width / 2 - 130, panelY - 35, 'SFX Volume', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff' })
      .setOrigin(0, 0.5);
    const sfxButton = this.add
      .rectangle(width / 2 + 100, panelY - 35, 100, 32, 0x3388cc)
      .setInteractive({ useHandCursor: true });
    const sfxText = this.add
      .text(width / 2 + 100, panelY - 35, VOLUME_LEVEL_LABELS[getSfxVolumeLevel()], { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5);
    sfxButton.on('pointerdown', () => sfxText.setText(VOLUME_LEVEL_LABELS[cycleSfxVolumeLevel()]));
    objects.push(sfxLabel, sfxButton, sfxText);

    const bgmLabel = this.add
      .text(width / 2 - 130, panelY + 5, 'BGM Volume', { fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffffff' })
      .setOrigin(0, 0.5);
    const bgmButton = this.add
      .rectangle(width / 2 + 100, panelY + 5, 100, 32, 0x33aa66)
      .setInteractive({ useHandCursor: true });
    const bgmText = this.add
      .text(width / 2 + 100, panelY + 5, VOLUME_LEVEL_LABELS[getBgmVolumeLevel()], { fontFamily: 'Rowdies, sans-serif', fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5);
    bgmButton.on('pointerdown', () => bgmText.setText(VOLUME_LEVEL_LABELS[cycleBgmVolumeLevel()]));
    objects.push(bgmLabel, bgmButton, bgmText);

    const retreatButton = this.add
      .rectangle(width / 2, panelY + 65, 220, 40, 0xcc3333)
      .setInteractive({ useHandCursor: true });
    objects.push(
      retreatButton,
      this.add.text(width / 2, panelY + 65, 'Retreat', { fontFamily: 'Rowdies, sans-serif', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5),
    );
    // Hands off to the existing Yes/No confirm rather than retreating
    // immediately — same "don't throw away a live run on one accidental
    // tap" reasoning as before, just reached from inside Options now.
    retreatButton.on('pointerdown', () => {
      this.hideSettingsPopup({ keepPaused: true });
      this.showQuitConfirm();
    });

    this.cameras.main.ignore(objects); // UI (see setupZoomControls) — stays fixed regardless of battle zoom
    this.settingsPopupObjects = objects;
  }

  hideSettingsPopup(opts = {}) {
    if (!this.settingsPopupObjects) return;
    this.settingsPopupObjects.forEach((obj) => obj.destroy());
    this.settingsPopupObjects = null;
    if (!opts.keepPaused) this.isPaused = false;
  }

  // Battle Items (bible §A.8) — a compact top-center row, one button per
  // BATTLE_ITEMS_CONFIG entry, showing how many are held and greyed out at
  // zero. Tapping one with count > 0 spends it immediately (no confirm —
  // these are all beneficial, none of them risk anything the way Quit
  // does).
  createBattleItemButtons() {
    const { width } = this.scale;
    const ids = Object.keys(BATTLE_ITEMS_CONFIG);
    const itemWidth = 76;
    const gap = 6;
    const totalWidth = ids.length * itemWidth + (ids.length - 1) * gap;
    const startX = width / 2 - totalWidth / 2 + itemWidth / 2;
    const y = 48;

    this.battleItemButtons = ids.map((id, index) => {
      const config = BATTLE_ITEMS_CONFIG[id];
      const x = startX + index * (itemWidth + gap);

      const rect = this.add.rectangle(x, y, itemWidth, 34, config.color).setInteractive({ useHandCursor: true });
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
    this.isPaused = true;

    const { width, height } = this.scale;
    const objects = [];

    objects.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setInteractive());
    objects.push(
      this.add
        .text(width / 2, height / 2 - 40, 'Quit this battle?\nProgress in this run will be lost.', {
          fontFamily: 'Rowdies, sans-serif', fontSize: '18px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5),
    );

    const buttonY = height / 2 + 30;
    const yesButton = this.add
      .rectangle(width / 2 - 80, buttonY, 130, 48, 0xcc3333)
      .setInteractive({ useHandCursor: true });
    objects.push(yesButton, this.add.text(width / 2 - 80, buttonY, 'Quit', { fontFamily: 'Rowdies, sans-serif', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5));

    const noButton = this.add
      .rectangle(width / 2 + 80, buttonY, 130, 48, 0x444444)
      .setInteractive({ useHandCursor: true });
    objects.push(noButton, this.add.text(width / 2 + 80, buttonY, 'Cancel', { fontFamily: 'Rowdies, sans-serif', fontSize: '16px', color: '#ffffff' }).setOrigin(0.5));

    // Dojo wasn't reached via Stage Select at all (HomeScene launches it
    // directly), but unlike the post-battle Menu button, quitting mid-battle
    // always goes all the way back to the Home hub/lobby regardless of
    // mode — there's no "current saga's stage list" to return to mid-run.
    yesButton.on('pointerdown', () => this.scene.start('HomeScene'));
    noButton.on('pointerdown', () => this.hideQuitConfirm());

    this.cameras.main.ignore(objects); // UI (see setupZoomControls) — stays fixed regardless of battle zoom
    this.quitConfirmObjects = objects;
  }

  hideQuitConfirm() {
    if (!this.quitConfirmObjects) return;
    this.quitConfirmObjects.forEach((obj) => obj.destroy());
    this.quitConfirmObjects = null;
    this.isPaused = false;
  }

  createWorkerCatButton() {
    const x = 16 + CAP_BUTTON_WIDTH / 2;
    const y = 76;

    const rect = this.add
      .rectangle(x, y, CAP_BUTTON_WIDTH, CAP_BUTTON_HEIGHT, 0x555555)
      .setInteractive({ useHandCursor: true });

    const labelText = this.add
      .text(x, y - 10, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const costText = this.add
      .text(x, y + 10, '', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    rect.on('pointerdown', () => this.tryUpgradeWorkerCat());

    this.workerCatButton = { rect, labelText, costText };
  }

  // Bottom-right circular button (confirmed screenshot position, mirroring
  // Worker Cat's bottom-left placement) with a radial charge fill drawn via
  // Graphics — the confirmed real visual (a charge RING around the icon,
  // not a horizontal bar). Tapping it only does something once full; see
  // tryTriggerSpecialBurst.
  createCannonButton() {
    const { width, height } = this.scale;
    this.cannonX = width - 16 - CANNON_BUTTON_RADIUS;
    this.cannonY = height - 16 - CANNON_BUTTON_RADIUS;

    this.cannonBase = this.add.circle(this.cannonX, this.cannonY, CANNON_BUTTON_RADIUS, CANNON_NOT_READY_COLOR);
    this.cannonChargeGraphics = this.add.graphics();
    this.add
      .text(this.cannonX, this.cannonY, 'RUNE\nCANNON', {
        fontFamily: 'Rowdies, sans-serif', fontSize: '10px',
        color: '#ffffff',
        align: 'center',
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
    const { width } = this.scale;
    const x = width - 50;
    // Below the wallet readout (right-aligned at y=16, 20px font) — was
    // y=45, which put this button's top edge above the wallet text's own
    // bottom edge, visibly overlapping it.
    const y = 58;

    this.speedUpButton = this.add.rectangle(x, y, 68, 24, 0x555566).setInteractive({ useHandCursor: true });
    this.speedUpText = this.add.text(x, y, '1x SPEED', { fontFamily: 'Rowdies, sans-serif', fontSize: '10px', color: '#ffffff' }).setOrigin(0.5);
    this.speedUpButton.on('pointerdown', () => this.toggleSpeedUp());
  }

  toggleSpeedUp() {
    this.speedMultiplier = this.speedMultiplier === 1 ? SPEED_UP_MULTIPLIER : 1;
    this.time.timeScale = this.speedMultiplier;
    this.speedUpText.setText(`${this.speedMultiplier}x SPEED`);
    this.speedUpButton.fillColor = this.speedMultiplier > 1 ? 0xffdd33 : 0x555566;
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
    return this.stage.startingMoney + (this.workerCatLevel - 1) * MONEY_CONFIG.workerCat.walletCapPerLevel;
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
    const attackBonusMultiplier = 1 + this.comboUnitAttackPercent / 100;
    // Research Base Upgrade (bible §A.7.1) shaves flat time off every
    // unit's recharge, floored so it can never reach an unbeatable 0ms spam rate.
    const recharge = Math.max(MIN_RECHARGE_MS, effectiveConfig.rechargeMs - this.rechargeReductionMs);

    const finalConfig = {
      ...effectiveConfig,
      hp: Math.round(effectiveConfig.hp * hpBonusMultiplier),
      damage: Math.round(effectiveConfig.damage * attackBonusMultiplier * 100) / 100,
      critChance: effectiveConfig.critChance + this.comboCritChanceBonus,
      rechargeMs: recharge,
    };

    if (!this.battleStarted) {
      this.battleStarted = true;
      if (this.mode === 'dojo') {
        this.scheduleDojoWaves();
      } else {
        this.scheduleStageScript();
      }
    }

    this.money -= cost;
    this.unitCooldowns[key] = recharge;
    this.unitCooldownDurations[key] = recharge;
    this.spawnUnit(key, finalConfig);
    playDeploySfx();
    addLifetimeStat('unitsDeployed');
  }

  // Brief on-screen reason for a blocked Restriction Stage tap (bible
  // §A.6.5) — same "temporary bottom-of-screen text" pattern
  // StageSelectScene uses for its own "Not enough Energy!" message.
  showRestrictionMessage(text) {
    if (this.restrictionMessageText) this.restrictionMessageText.destroy();

    const { width } = this.scale;
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

    if (spriteImage && hasEvolved) {
      spriteImage.postFX.addGlow(0xffdd33, PART_EVOLUTION_GLOW_STRENGTH, 0, false, 0.1, 12);
    }

    // Evolution-stage visual cue: only the circle-placeholder fallback gets
    // a stroked ring — a sprite unit relies on the part-evolution glow
    // above alone (a separate star badge on top read as redundant/cluttered
    // once both existed at once).
    if (evolutionStage > 0 && !spriteImage) {
      shape.setStrokeStyle(EVOLUTION_RING_WIDTH[evolutionStage], EVOLUTION_RING_COLOR[evolutionStage]);
    }

    this.playerUnits.push(this.makeEntityState(type, config, shape, label, spriteImage, true, 1, isEvolved));
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
  createEntityVisual(x, config, labelColor, isPlayerSide, visualScaleMultiplier = 1, isEvolved = false) {
    if (config.sprite) {
      const prefix = isPlayerSide ? 'unit' : 'enemy';
      const evolvedTag = isEvolved && config.sprite.evolved ? '_evolved' : '';
      const sprite = this.add.image(x, this.laneY, `${prefix}_${config.id}${evolvedTag}_idle`);
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
  // multiple of `radius`.
  fitSpriteToRadius(sprite, radius, visualScaleMultiplier = 1) {
    const targetSize =
      (SPRITE_MIN_DIAMETER + Math.max(0, radius - SPRITE_MIN_RADIUS) * SPRITE_SIZE_SLOPE) * visualScaleMultiplier;
    sprite.setScale(targetSize / Math.max(sprite.width, sprite.height));
  }

  // Stage mode: fixed script — no randomness, no tier-based auto-scaling.
  // Only hp is scaled (by the script entry's own statMultiplier) — per
  // STAGE_CONFIG.js's contract — EXCEPT for a boss's radius/range, which
  // need to keep pace with its visual size (see below).
  spawnScriptedEnemy(entry) {
    const base = ENEMY_CONFIG[entry.enemyId];
    const config = {
      ...base,
      hp: Math.round(base.hp * entry.statMultiplier),
    };

    if (entry.isBoss) {
      // A boss needs to look BOSS_VISUAL_SCALE_MULTIPLIER bigger than its
      // base config would normally render (createEnemy's own
      // fitSpriteToRadius already sizes a sprite off config.radius alone,
      // so inflating radius here is what makes it look bigger — no
      // separate visual-only multiplier is applied on top anymore, which
      // would double it up). Left unscaled, radius/range would still be
      // pure numbers with no idea the sprite got bigger —
      // inRange/getMaxRange only ever look at these fields, never the
      // actual rendered pixel size — so a small enough unit's per-frame
      // step could carry it from "not yet in range" to "already past the
      // boss's position" without ever registering as in range at all,
      // visibly walking through the oversized sprite and straight on
      // toward the enemy base while the boss stands there undamaged.
      // Scaling radius (and range too, for every boss role here, where
      // range === radius —
      // a pure melee identity) by the same multiplier keeps the hitbox
      // honest against what's actually on screen.
      config.radius = Math.round(base.radius * BOSS_VISUAL_SCALE_MULTIPLIER);
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
  // otherwise stop (BGM was muted/Off the instant the boss spawned, so the
  // track never actually started; a browser tab-visibility pause; anything
  // else) instead of getting permanently stuck once aliveBossCount and the
  // Sound object's real playing state disagree with each other.
  updateBossMusic() {
    const shouldPlay = this.aliveBossCount > 0 && !this.isGameOver;
    const isOn = !!this.bossMusicSound;

    if (shouldPlay && isOn && !this.bossMusicSound.isPlaying) {
      // Exists but isn't actually sounding (paused, stalled, whatever the
      // cause) — tear it down so the branch below recreates it fresh.
      this.bossMusicSound.destroy();
      this.bossMusicSound = null;
      return;
    }

    if (shouldPlay && !isOn) {
      stopMusic();
      if (isMuted() || getBgmVolumeLevel() === 0) return; // retried again next frame once volume/mute allows it
      this.bossMusicSound = this.sound.add('bgm_boss', { loop: true, volume: VOLUME_LEVELS[getBgmVolumeLevel()] });
      this.bossMusicSound.play();
      return;
    }

    if (!shouldPlay && isOn) {
      this.bossMusicSound.stop();
      this.bossMusicSound.destroy();
      this.bossMusicSound = null;
      if (!this.isGameOver) startMusic(); // resume the normal battle loop
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
    const { width, height } = this.scale;
    const text = this.add
      .text(width / 2, height / 2 - 60, 'BOSS!', { fontFamily: 'Rowdies, sans-serif', fontSize: '40px', color: '#ff3333', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setAlpha(0);
    this.cameras.main.ignore(text); // UI (see setupZoomControls) — a fixed screen-center banner, not tied to a world position

    this.tweens.add({ targets: text, alpha: 1, duration: 200, yoyo: true, hold: 500, onComplete: () => text.destroy() });
  }

  // Base-HP%-triggered spawns (bible §A.3.9) — checked every time the enemy
  // base actually takes damage rather than every frame, since that's the
  // only thing that can change the percentage. See damageEnemyBase for the
  // "don't let a fast burst skip a scripted boss" failsafe that works
  // alongside this.
  checkHpTriggers() {
    if (this.pendingHpTriggers.length === 0) return;

    const percent = this.enemyBaseMaxHp > 0 ? (this.enemyBaseHp / this.enemyBaseMaxHp) * 100 : 0;
    for (const pending of this.pendingHpTriggers) {
      if (pending.fired) continue;
      if (percent <= pending.entry.baseHpPercentTrigger) {
        pending.fired = true;
        this.spawnScriptedEnemy(pending.entry);
      }
    }
  }

  createEnemy(type, config, isBoss = false) {
    const x = this.enemyBaseX - BASE_WIDTH / 2 - config.radius;
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
      // position within one run_0/run_1 alternation (reset whenever the
      // run pose is (re-)entered, in setEntityPose); runFrame is just the
      // last-set frame index (0/1), kept so updateRunCycle only calls
      // setTexture on an actual frame change rather than every tick.
      runCycleMs: 0,
      runFrame: 0,
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

  update(time, deltaMs) {
    if (this.isGameOver || this.isPaused) return;

    // Speed Up (see toggleSpeedUp) scales every per-frame calculation below
    // by reassigning the parameter itself — everything downstream
    // (updatePlayerUnits(deltaMs), updateEnemies(deltaMs), etc.) already
    // just uses whatever's passed in, so nothing past this line needs to
    // know Speed Up exists at all. Phaser's own timer clock
    // (this.time.timeScale, set in toggleSpeedUp) handles the two
    // delayedCall usages elsewhere (scheduleStageScript, the special-burst
    // flash) consistently with this.
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

    // Cat Cannon charges passively over time (bible §A.3.9), independent of
    // combat performance. Cannon Charge Base Upgrade (bible §A.7.1) adds
    // flat charge-per-second on top. Doesn't start until the player's first
    // deploy (see battleStarted) — nothing to charge "during battle" before
    // there's a battle.
    if (this.battleStarted) {
      const chargePerSec = SPECIAL_CHARGE_PER_SEC + this.cannonChargePerSecBonus;
      this.specialMeter = Math.min(SPECIAL_METER_MAX, this.specialMeter + (chargePerSec * deltaMs) / 1000);
    }
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
      button.labelText.setAlpha(alpha);
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

    button.labelText.setText(`Land Worker Lv${this.workerCatLevel}`);
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
    const { width } = this.scale;
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
        unit.target = null;
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

      if (unit.target && (unit.target.hp <= 0 || unit.target.warpMs > 0 || !this.inRange(unit, unit.target))) {
        unit.target = null;
      }

      if (!unit.target) {
        unit.target =
          this.enemies.find((enemy) => enemy.hp > 0 && enemy.warpMs <= 0 && this.inRange(unit, enemy)) || null;
      }

      // Mirrors the enemy-side blind-spot handling in updateEnemies: a Long
      // Distance unit already backed up as far as it can go (its own base
      // is right there) can't retreat any further from an enemy inside its
      // blind spot, so fight it point-blank instead of standing there
      // ignoring it forever.
      const minRetreatX = this.baseX + BASE_WIDTH / 2 + unit.config.radius;
      if (!unit.target && unit.config.longDistance && unit.shape.x <= minRetreatX) {
        unit.target =
          this.enemies.find(
            (enemy) => enemy.hp > 0 && enemy.warpMs <= 0
              && Math.abs(unit.shape.x - enemy.shape.x) < unit.config.longDistance.min,
          ) || null;
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
            if (enemy.hp <= 0 || enemy.warpMs > 0) continue;
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
        enemy.target = null;
      }

      if (enemy.target === 'base') {
        this.tickCombatPhase(enemy, deltaMs, () => {
          fireAttackVfx(this, enemy, this.baseX, this.laneY);
          const weakenMultiplier = enemy.weakenMs > 0 ? enemy.weakenMultiplier : 1;
          this.damageBase(enemy.config.damage * weakenMultiplier);
        });
        continue;
      }

      if (enemy.target && (enemy.target.hp <= 0 || enemy.target.warpMs > 0)) {
        enemy.target = null;
      }
      if (enemy.target && !this.inRange(enemy, enemy.target)) {
        enemy.target = null;
      }

      if (!enemy.target) {
        enemy.target =
          this.playerUnits.find((unit) => unit.hp > 0 && unit.warpMs <= 0 && this.inRange(enemy, unit)) || null;
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
        enemy.target =
          this.playerUnits.find(
            (unit) => unit.hp > 0 && unit.warpMs <= 0
              && Math.abs(enemy.shape.x - unit.shape.x) < enemy.config.longDistance.min,
          ) || null;
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

    // Accounting Base Upgrade (bible §A.7.1) — % more money per kill.
    const bonus = enemy.config.threat * MONEY_CONFIG.killBonusMultiplier * (1 + this.accountingBonusPercent / 100);
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
      this.updateAttackLunge(unit);
    }
    for (const enemy of this.enemies) {
      this.setEntityPose(enemy, this.getDesiredPose(enemy));
      this.updateRunCycle(enemy, deltaMs);
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
  // sprite — none of them ever touch scale. fitSpriteToRadius runs exactly
  // once, in createEntityVisual, sized off the idle texture; every later
  // pose reuses that one scale. This used to re-fit on every swap, which
  // seems reasonable (each pose gets sized to the same target diameter)
  // but is actually wrong: every pose is trimmed to its OWN tight bounding
  // box (see tools/sprite-gen's trimTransparentPadding), and an attack
  // pose's box is bigger than idle's (a swung weapon/limb reaches further
  // out) even though the character's actual body is the same true size in
  // both — fitting THAT bigger box to the same target diameter shrank the
  // whole sprite, which read as "enemies get small mid-attack." Keeping
  // one fixed scale for the sprite's whole lifetime means each pose just
  // renders at its own natural relative size (attack's weapon reaches out
  // further, idle doesn't) instead of every pose being force-normalized to
  // an identical bounding-box size.
  setEntityPose(entity, pose) {
    if (!entity.spriteImage || entity.currentPose === pose) return;
    entity.currentPose = pose;
    const prefix = entity.isPlayerSide ? 'unit' : 'enemy';
    const evolvedTag = entity.isEvolved && entity.config.sprite.evolved ? '_evolved' : '';
    if (pose === 'run') {
      entity.runFrame = 0;
      entity.runCycleMs = 0;
      entity.spriteImage.setTexture(`${prefix}_${entity.config.id}${evolvedTag}_run_0`);
    } else {
      entity.spriteImage.setTexture(`${prefix}_${entity.config.id}${evolvedTag}_${pose}`);
    }
  }

  // A single static "moving" pose read as barely different from idle for
  // these round, mostly-legless Axies/Chimeras (see SpriteIcon.js's own
  // comment), so while an entity is on the run pose this alternates
  // between its two run frames — same one fixed scale as every other pose
  // (see setEntityPose's own comment) applies here too, unchanged.
  updateRunCycle(entity, deltaMs) {
    if (!entity.spriteImage || entity.currentPose !== 'run') return;

    entity.runCycleMs = (entity.runCycleMs + deltaMs) % RUN_FRAME_PERIOD_MS;
    const frame = entity.runCycleMs < RUN_FRAME_PERIOD_MS / 2 ? 0 : 1;
    if (frame !== entity.runFrame) {
      entity.runFrame = frame;
      const prefix = entity.isPlayerSide ? 'unit' : 'enemy';
      const evolvedTag = entity.isEvolved && entity.config.sprite.evolved ? '_evolved' : '';
      entity.spriteImage.setTexture(`${prefix}_${entity.config.id}${evolvedTag}_run_${frame}`);
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

  // Advances one attacker's foreswing/backswing attack cycle (bible §A.3.4,
  // simplified to two phases — see UNIT_CONFIG.js's file header for the
  // derivation from attackSpeed). `onHit` fires exactly once, at the moment
  // foreswing completes — NOT at the start of the attack — so a unit that's
  // knocked back mid-foreswing (startKnockbackSlide resets attackPhase/
  // phaseMs) deals no damage at all for that cycle: the windup is simply
  // wasted, matching the bible's interruption rule (§A.3.4).
  tickCombatPhase(attacker, deltaMs, onHit) {
    attacker.phaseMs -= deltaMs * attacker.slowMultiplier;

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

    return totalDamage;
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
    const { width } = this.scale;
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
    if (Math.random() > status.chance) return;

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

    if (entity.warpMs > 0) {
      entity.warpMs = Math.max(0, entity.warpMs - deltaMs);
      entity.shape.setVisible(false);
      if (entity.label) entity.label.setVisible(false);

      if (entity.warpMs === 0) {
        const { width } = this.scale;
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

  // Resolves one hit's damage against `defender`'s trait, including this
  // attacker's own Critical Hit roll and Weaken debuff (if any is currently
  // active on it). Critical Hit is uniquely the one thing that bypasses the
  // flat-damage-vs-alloy rule (bible §A.3.6), so it's rolled and checked
  // FIRST — if it fires against an alloy defender, the flat-damage
  // short-circuit is skipped entirely and damage is computed normally
  // (alloy has no MATCHUP_BONUSES/RESIST_BONUSES entries either way, so
  // that normal computation already reduces to plain attacker damage,
  // doubled by the crit). Weaken multiplies the ATTACKER's outgoing damage
  // (bible §A.3.8 — Weaken touches attack power only, never movement).
  computeDamage(attacker, defender) {
    const isCrit = Math.random() < (attacker.config.critChance || 0);

    if (defender.config.trait === FLAT_DAMAGE_TRAIT && !isCrit) {
      return { damage: FLAT_DAMAGE_AMOUNT, isCrit };
    }

    const strongBonus = MATCHUP_BONUSES[attacker.config.trait]?.[defender.config.trait] ?? 1;
    const resistMultiplier = RESIST_BONUSES[defender.config.trait]?.[attacker.config.trait] ?? 1;
    const weakenMultiplier = attacker.weakenMs > 0 ? attacker.weakenMultiplier : 1;
    const critMultiplier = isCrit ? 2 : 1;
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

  // Flat damage + knockback to every living enemy plus a chip of enemy-base
  // damage, then resets to 0. Enemy kills route through the normal
  // removeDead/onEnemyKilled path so they still pay out money like any
  // other kill; the base damage goes through damageEnemyBase so it still
  // triggers a normal win if it finishes the base off. Knockback here is
  // unconditional (not the HP-threshold "endurance" gate combat hits use)
  // — the burst is a special, guaranteed effect, matching the bible's Cat
  // Cannon including knockback (§A.3.9).
  triggerSpecialBurst() {
    this.specialMeter = 0;
    playCannonSfx();
    this.cameras.main.shake(200, 0.008);
    addLifetimeStat('cannonUses');

    // Cannon Power Base Upgrade (bible §A.7.1) adds flat damage to both
    // halves of the burst.
    const burstDamage = SPECIAL_BURST_DAMAGE + this.cannonPowerBonus;
    const burstBaseDamage = SPECIAL_BURST_BASE_DAMAGE + this.cannonPowerBonus;

    const syntheticAttacker = { shape: { x: this.baseX } };
    for (const enemy of this.enemies) {
      if (enemy.hp > 0) {
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
    this.damageEnemyBase(burstBaseDamage);

    const { width } = this.scale;
    const flash = this.add.rectangle(width / 2, this.laneY, width, 80, SPECIAL_FLASH_COLOR).setAlpha(0.5);
    this.uiCamera.ignore(flash); // world object (see setupZoomControls) — zooms/pans with the battlefield
    this.time.delayedCall(SPECIAL_FLASH_DURATION_MS, () => flash.destroy());
  }

  removeDead(list, onKill) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].hp <= 0) {
        const entity = list[i];
        entity.shape.destroy();
        if (entity.label) entity.label.destroy();
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
    this.cameras.main.shake(120, 0.005);
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
    this.isPaused = true;

    const { width, height } = this.scale;
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
    this.isPaused = false;
  }

  damageEnemyBase(amount) {
    if (this.isGameOver) return;
    if (this.mode === 'dojo') return; // no destroy-the-base win condition in Sparring Grounds

    // Failsafe (bible §A.3.9): a fast burst shouldn't be able to skip a
    // scripted boss spawn entirely — while any baseHpPercentTrigger entry
    // hasn't fired yet, the base is held at 1 HP (never actually finished
    // off) just long enough for checkHpTriggers to fire it below.
    const hasPendingTrigger = this.pendingHpTriggers.some((pending) => !pending.fired);
    let nextHp = this.enemyBaseHp - amount;
    if (hasPendingTrigger && nextHp <= 0) nextHp = 1;

    this.enemyBaseHp = Math.max(0, nextHp);
    this.checkHpTriggers();

    if (this.enemyBaseHp <= 0) {
      this.winStage();
    }
  }

  endGame() {
    this.isGameOver = true;
    playDefeatSfx();

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
    playVictorySfx();

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

    const lines = ['STAGE CLEAR', `Score: ${finalScore}`, `+${xpReward.toLocaleString()} XP`];
    if (rewards.evoShardsGranted) lines.push('+1 Evo Shard!');
    if (rewards.growthCharmsGranted) lines.push('+1 Growth Charm!');
    if (treasureResult.improved) lines.push(`${TREASURE_TIER_NAMES[treasureResult.tier]} Treasure!`);
    if (droppedItem) lines.push(`+1 ${droppedItem.displayName}!`);
    if (!wasAlreadyCleared) {
      addGems(this.stage.gemsFirstClear);
      lines.push(`+${this.stage.gemsFirstClear} Gems! (First Clear)`);
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

    this.showEndScreen(lines, nextStage);
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
    // Study Base Upgrade (bible §A.7.1) — % more XP per clear. XP Boost
    // (bible §A.8, this.xpBoostMultiplier) is a separate, independent
    // multiplier on top, defaulting to 1 (a no-op) when unused.
    return Math.round(this.stage.baseXp * decay * (1 + this.studyBonusPercent / 100) * this.xpBoostMultiplier);
  }

  // `nextStage` (winStage only) adds a third "Next Stage" button (bible
  // §A.10.5) alongside the always-present Restart/Menu pair.
  showEndScreen(lines, nextStage = null) {
    this.gameOverText.setText(lines.join('\n'));
    if (this.mode !== 'dojo') this.updateBattleItemButtons(); // grey out now that isGameOver is true

    const { width, height } = this.scale;
    const buttonY = height / 2 + 90;
    const buttonWidth = 160;
    const buttonGap = 20;

    const labels = ['Restart'];
    if (nextStage) labels.push('Next Stage');
    labels.push('Menu');

    const totalWidth = labels.length * buttonWidth + (labels.length - 1) * buttonGap;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;

    labels.forEach((label, index) => {
      const x = startX + index * (buttonWidth + buttonGap);
      // Next Stage gets its own accent color so it reads as the primary/
      // recommended action, not just a third identical gray button.
      const color = label === 'Next Stage' ? 0xffcc33 : 0x444444;
      const textColor = label === 'Next Stage' ? '#000000' : '#ffffff';

      const button = this.add.rectangle(x, buttonY, buttonWidth, 60, color).setInteractive({ useHandCursor: true });
      const buttonLabel = this.add.text(x, buttonY, label, { fontFamily: 'Rowdies, sans-serif', fontSize: '20px', color: textColor }).setOrigin(0.5);
      this.cameras.main.ignore([button, buttonLabel]); // UI (see setupZoomControls)

      if (label === 'Restart') {
        button.on('pointerdown', () => this.scene.restart());
      } else if (label === 'Next Stage') {
        button.on('pointerdown', () => {
          if (!trySpendEnergy(nextStage.energyCost)) {
            this.showRestrictionMessage('Not enough Energy for the next stage!');
            return;
          }
          this.scene.start('GameScene', { stageId: nextStage.id });
        });
      } else {
        // Dojo wasn't reached via Stage Select at all (HomeScene launches it
        // directly), so "Menu" should return there instead. A normal stage
        // battle returns to its OWN saga's stage list (bible §A.6.1), not
        // always saga1's — this.stage.saga is read straight off the stage
        // record STAGE_CONFIG already resolved in create().
        button.on('pointerdown', () =>
          this.scene.start(this.mode === 'dojo' ? 'HomeScene' : 'StageSelectScene', { sagaId: this.stage.saga }),
        );
      }
    });
  }
}
