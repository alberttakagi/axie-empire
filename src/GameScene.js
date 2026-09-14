import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { ENEMY_CONFIG } from './ENEMY_CONFIG.js';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { saveStageResult, getClearCount, loadStageProgress } from './StageProgress.js';
import { MONEY_CONFIG } from './MONEY_CONFIG.js';
import { FLAT_DAMAGE_TRAIT, FLAT_DAMAGE_AMOUNT, MATCHUP_BONUSES, RESIST_BONUSES } from './TRAIT_CONFIG.js';
import { STATUS_TYPES } from './STATUS_CONFIG.js';
import { getEffectiveUnitConfig } from './UnitStats.js';
import {
  loadPlayerProgress,
  getUnitProgress,
  grantStageRewards,
  getBaseUpgradeLevel,
  addGems,
} from './PlayerProgress.js';
import { BASE_UPGRADE_CONFIG } from './BASE_UPGRADE_CONFIG.js';
import { getBonusPercent, rollTreasureForStage } from './Treasure.js';
import { loadLoadout } from './Loadout.js';
import { getComboBonusValue } from './Combo.js';
import { DOJO_CONFIG } from './DOJO_CONFIG.js';
import { saveDojoScore } from './DojoProgress.js';

// Account-wide Base Upgrades (bible §A.7.1) — read once per battle at
// create() time into flat numbers, since they only change between battles
// (via UpgradeScene/BaseUpgradeScene), never mid-fight.
function getBaseUpgradeEffect(key) {
  return getBaseUpgradeLevel(key) * BASE_UPGRADE_CONFIG[key].perLevelEffect;
}

const MIN_RECHARGE_MS = 500; // Research can never push a unit's recharge below this
const SPEED_UP_MULTIPLIER = 2;

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

// Evolution-stage visual cue (sprites aren't in yet — see UNIT_CONFIG.js's
// `sprite` field — so evolved/True Form units get a stroked ring instead of
// new art, matching the bible's "sprites can be inserted later" scoping).
const EVOLUTION_RING_COLOR = [null, 0xffffff, 0xffdd33]; // index = evolutionStage
const EVOLUTION_RING_WIDTH = [0, 2, 3];

const LANE_Y_RATIO = 0.5;
const BASE_WIDTH = 60;

const BUTTON_HEIGHT = 70;
// BUTTON_WIDTH is now a CEILING, not a fixed size (bible §A.10.3/real
// Battle Cats: a Formation/Deck can hold up to 10 units) — createSpawnButtons
// shrinks the actual per-button width to whatever fits this.loadout.length
// buttons in one un-scrolled row, capped at this value so a small Formation
// (the common case) still gets buttons at (close to) this original size.
const BUTTON_WIDTH = 136;
const BUTTON_GAP = 8;
const SPAWN_ROW_LEFT_MARGIN = 16;
const SPAWN_ROW_CANNON_GAP = 10; // clearance kept between the row and the Cannon button's own footprint

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

// Status-effect visual cues — priority order when more than one is active:
// stop (fully frozen) beats curse beats slow beats weaken, so the most
// disruptive/visible state wins. Cleared back to the entity's own
// config.color once every timer runs out (see tickStatusEffects).
const STATUS_STOP_COLOR = 0x556677;
const STATUS_CURSE_COLOR = 0x9933cc;
const STATUS_SLOW_COLOR = 0x88ccff;
const STATUS_WEAKEN_COLOR = 0xcc8844;

// Curse tint for the player's base itself (see baseCurseMs) — a cursed base
// can't fire the Cat Cannon regardless of meter charge (see
// tryTriggerSpecialBurst); the base's own fillColor only ever reflects this,
// never the cannon's ready state (that's the cannon button's own job now —
// see updateCannonButton).
const BASE_CURSE_COLOR = 0x663399;

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

    this.laneY = height * LANE_Y_RATIO;
    this.baseX = BASE_WIDTH / 2;
    this.baseMaxHp = this.stage.baseHp + this.baseDefenseBonus;
    this.baseHp = this.baseMaxHp;
    this.enemyBaseX = width - BASE_WIDTH / 2;
    this.enemyBaseMaxHp = this.stage.enemyBaseHp;
    this.enemyBaseHp = this.enemyBaseMaxHp;
    this.enemies = [];
    this.playerUnits = [];
    // Combo's "Starting Money Up" is a bonus ON TOP of the normal starting
    // fill — deliberately allowed to exceed getWalletCap() for this one
    // initial value (a real "bonus," not just a differently-computed cap);
    // every accrual tick afterward still clamps to the normal cap as usual.
    this.money = this.getWalletCap() * (1 + comboStartingMoneyPercent / 100);
    this.enemiesKilled = 0;
    this.specialMeter = 0;
    this.baseCurseMs = 0; // curse landed directly on the player's base — blocks triggerSpecialBurst
    this.enemyBaseCurseMs = 0; // mirror on the enemy base — currently a no-op, nothing to suppress there yet
    this.elapsedMs = 0;
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

    this.add.rectangle(width / 2, this.laneY, width, 80, 0x2a2a2a);

    this.base = this.add.rectangle(this.baseX, this.laneY, BASE_WIDTH, 100, BASE_COLOR);
    // Left-anchored (not centered on baseX): the base sits flush against the
    // canvas's left edge, so a centered "current/max" string would overflow
    // past x=0 (confirmed via direct measurement — a 76px-wide string
    // centered at baseX=30 spans -8..68). Anchoring to the left edge and
    // growing rightward keeps it fully on-screen regardless of digit count.
    this.baseHpText = this.add
      .text(2, this.laneY - 70, '', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    this.enemyBase = this.add.rectangle(this.enemyBaseX, this.laneY, BASE_WIDTH, 100, ENEMY_BASE_COLOR);
    // Mirror of the above: right-anchored, growing leftward from the
    // canvas's right edge.
    this.enemyBaseHpText = this.add
      .text(width - 2, this.laneY - 70, '', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(1, 0.5);

    // Top-left: a Quit button (this build's stand-in for the reference
    // game's own pause icon in this exact corner — see the bible
    // cross-check notes) so a battle can be abandoned mid-fight instead of
    // only ever reachable from the post-battle Menu button, then the stage
    // name alongside it (shifted right to make room).
    this.createQuitButton();
    this.add.text(92, 16, this.stage.displayName, {
      fontSize: '18px',
      color: '#ffdd33',
    });

    // Top-right: a single combined "current/cap円" wallet readout
    // (confirmed screenshot format/position — replaces this build's old
    // separate top-left money text + small "Cap: ¥Y" line).
    this.walletText = this.add
      .text(width - 16, 16, '', {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(1, 0);

    this.createWorkerCatButton();
    this.createCannonButton();
    this.createSpeedUpButton();

    this.gameOverText = this.add
      .text(width / 2, height / 2, '', {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    if (this.mode === 'dojo') {
      this.dojoTimeRemainingMs = DOJO_CONFIG.timeLimitMs;
      this.dojoTimerText = this.add
        .text(width / 2, 16, '', { fontSize: '16px', color: '#ffdd33' })
        .setOrigin(0.5, 0);
    }

    this.createSpawnButtons();

    if (this.mode === 'dojo') {
      this.scheduleDojoWaves();
    } else {
      this.scheduleStageScript();
    }
  }

  scheduleStageScript() {
    for (const entry of this.stage.spawnScript) {
      this.time.delayedCall(entry.spawnDelayMs, () => {
        if (this.isGameOver) return;
        this.spawnScriptedEnemy(entry);
      });
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

    this.createEnemy(type, config);
  }

  createSpawnButtons() {
    const { height } = this.scale;
    const keys = this.loadout;

    // The row's available width is bounded on the right by the Cannon
    // button's own footprint (bottom-right corner), not the full canvas —
    // at the original fixed BUTTON_WIDTH, even the base 5-unit Formation's
    // row already reached into the Cannon's circle (an existing, easy-to-
    // miss overlap caught while checking a full 10-unit row here); centering
    // within this narrower zone instead of the whole canvas fixes both.
    const zoneLeft = SPAWN_ROW_LEFT_MARGIN;
    const zoneRight = this.cannonX - CANNON_BUTTON_RADIUS - SPAWN_ROW_CANNON_GAP;
    const zoneWidth = zoneRight - zoneLeft;

    // Shrink to fit a Formation of up to MAX_LOADOUT_SIZE (10, matching the
    // real game's own Deck size) in one un-scrolled row, without shrinking
    // below the original BUTTON_WIDTH for a smaller Formation that already
    // fits the zone at full size.
    const buttonWidth = Math.min(BUTTON_WIDTH, (zoneWidth - (keys.length - 1) * BUTTON_GAP) / keys.length);
    const isCompact = buttonWidth < BUTTON_WIDTH - 1;
    const totalWidth = keys.length * buttonWidth + (keys.length - 1) * BUTTON_GAP;
    const startX = zoneLeft + (zoneWidth - totalWidth) / 2 + buttonWidth / 2;
    const y = height - BUTTON_HEIGHT / 2 - 10;

    this.spawnButtons = keys.map((key, index) => {
      const config = UNIT_CONFIG[key];
      const x = startX + index * (buttonWidth + BUTTON_GAP);

      const rect = this.add
        .rectangle(x, y, buttonWidth, BUTTON_HEIGHT, config.color)
        .setInteractive({ useHandCursor: true });

      const labelText = this.add
        .text(x, y - 14, config.displayName, {
          fontSize: isCompact ? '10px' : '13px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: buttonWidth - 6 },
        })
        .setOrigin(0.5);

      const costText = this.add
        .text(x, y + 14, `${Math.round(config.cost).toLocaleString()}円`, {
          fontSize: isCompact ? '9px' : '11px',
          color: '#ffffff',
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

      return { key, config, rect, labelText, costText, cooldownOverlay };
    });
  }

  // Quit mid-battle (not just from the post-battle Menu button) — a plain
  // scene.start away, same as the existing Menu button, is one accidental
  // tap away from throwing away a live run (Energy already spent, non-
  // refundable per STAGE_CONFIG.js; no stage-clear rewards, since
  // winStage() never runs), so this is gated behind a Yes/No confirm
  // overlay rather than firing immediately.
  createQuitButton() {
    const rect = this.add.rectangle(48, 16, 64, 28, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(48, 16, 'Quit', { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    rect.on('pointerdown', () => this.showQuitConfirm());
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
          fontSize: '18px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5),
    );

    const buttonY = height / 2 + 30;
    const yesButton = this.add
      .rectangle(width / 2 - 80, buttonY, 130, 48, 0xcc3333)
      .setInteractive({ useHandCursor: true });
    objects.push(yesButton, this.add.text(width / 2 - 80, buttonY, 'Quit', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5));

    const noButton = this.add
      .rectangle(width / 2 + 80, buttonY, 130, 48, 0x444444)
      .setInteractive({ useHandCursor: true });
    objects.push(noButton, this.add.text(width / 2 + 80, buttonY, 'Cancel', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5));

    // Dojo wasn't reached via Stage Select at all (HomeScene launches it
    // directly), but unlike the post-battle Menu button, quitting mid-battle
    // always goes all the way back to the Home hub/lobby regardless of
    // mode — there's no "current saga's stage list" to return to mid-run.
    yesButton.on('pointerdown', () => this.scene.start('HomeScene'));
    noButton.on('pointerdown', () => this.hideQuitConfirm());

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
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const costText = this.add
      .text(x, y + 10, '', {
        fontSize: '12px',
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
        fontSize: '10px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.cannonBase
      .setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Circle(0, 0, CANNON_BUTTON_RADIUS), hitAreaCallback: Phaser.Geom.Circle.Contains })
      .on('pointerdown', () => this.tryTriggerSpecialBurst());
  }

  // Speed Up (bible §A.10.4) — confirmed top-right position, just below the
  // wallet readout. See the speedMultiplier field comment in create() for
  // what toggling this actually scales.
  createSpeedUpButton() {
    const { width } = this.scale;
    const x = width - 50;
    const y = 45;

    this.speedUpButton = this.add.rectangle(x, y, 68, 24, 0x555566).setInteractive({ useHandCursor: true });
    this.speedUpText = this.add.text(x, y, '1x SPEED', { fontSize: '10px', color: '#ffffff' }).setOrigin(0.5);
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
    return base * (1 + getBonusPercent('moneyIncomePercent') / 100);
  }

  getWalletCap() {
    return this.stage.startingMoney + (this.workerCatLevel - 1) * MONEY_CONFIG.workerCat.walletCapPerLevel;
  }

  trySpawnUnit(key) {
    if (this.isGameOver) return;
    if (this.unitCooldowns[key] > 0) return;

    // Cost never scales with level/evolution (bible §A.3.2/§A.4.2) — always
    // checked/charged against the unit's plain UNIT_CONFIG cost, never the
    // effective (leveled) config.
    const baseConfig = UNIT_CONFIG[key];
    if (this.money < baseConfig.cost) return;

    // Restriction Stage checks (bible §A.6.5) — a no-op on any stage
    // without a `restrictions` block (including Sparring Grounds' synthetic
    // pseudo-stage, which never has one).
    const restrictions = this.stage.restrictions;
    if (restrictions?.bannedUnitTypes?.includes(key)) {
      this.showRestrictionMessage('Banned in this stage!');
      return;
    }
    if (restrictions?.costRange && (baseConfig.cost < restrictions.costRange.min || baseConfig.cost > restrictions.costRange.max)) {
      this.showRestrictionMessage(`Cost must be ${restrictions.costRange.min}-${restrictions.costRange.max}円!`);
      return;
    }
    if (restrictions?.maxDeployed) {
      const currentlyDeployed = this.playerUnits.filter((unit) => unit.hp > 0).length;
      if (currentlyDeployed >= restrictions.maxDeployed) {
        this.showRestrictionMessage(`Max ${restrictions.maxDeployed} units at once!`);
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

    this.money -= baseConfig.cost;
    this.unitCooldowns[key] = recharge;
    this.spawnUnit(key, finalConfig);
  }

  // Brief on-screen reason for a blocked Restriction Stage tap (bible
  // §A.6.5) — same "temporary bottom-of-screen text" pattern
  // StageSelectScene uses for its own "Not enough Energy!" message.
  showRestrictionMessage(text) {
    if (this.restrictionMessageText) this.restrictionMessageText.destroy();

    const { width, height } = this.scale;
    this.restrictionMessageText = this.add
      .text(width / 2, height - 90, text, { fontSize: '13px', color: '#ff6666' })
      .setOrigin(0.5);

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

    const shape = this.add.circle(x, this.laneY, config.radius, config.color);
    // Evolution-stage visual cue (no sprites yet — see UNIT_CONFIG.js's
    // `sprite` field): an evolved/True Form unit gets a stroked ring around
    // its placeholder shape instead of new art.
    const evolutionStage = getUnitProgress(loadPlayerProgress(), type).evolutionStage;
    if (evolutionStage > 0) {
      shape.setStrokeStyle(EVOLUTION_RING_WIDTH[evolutionStage], EVOLUTION_RING_COLOR[evolutionStage]);
    }
    const label = this.add.text(x, this.laneY, config.label, {
      fontSize: '16px',
      color: '#000000',
    }).setOrigin(0.5);

    this.playerUnits.push(this.makeEntityState(type, config, shape, label));
  }

  // Stage mode: fixed script — no randomness, no tier-based auto-scaling.
  // Only hp is scaled (by the script entry's own statMultiplier) — per
  // STAGE_CONFIG.js's contract.
  spawnScriptedEnemy(entry) {
    const base = ENEMY_CONFIG[entry.enemyId];
    const config = {
      ...base,
      hp: Math.round(base.hp * entry.statMultiplier),
    };

    this.createEnemy(entry.enemyId, config);
  }

  createEnemy(type, config) {
    const x = this.enemyBaseX - BASE_WIDTH / 2 - config.radius;

    const shape = this.add.circle(x, this.laneY, config.radius, config.color);
    const label = this.add.text(x, this.laneY, config.label, {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.enemies.push(this.makeEntityState(type, config, shape, label));
  }

  // Shared initial-state shape for both player units and enemies (bible
  // Part C's Unit/Enemy schemas share the same combat-relevant fields).
  makeEntityState(type, config, shape, label) {
    return {
      type,
      config,
      shape,
      label,
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
    this.baseCurseMs = Math.max(0, this.baseCurseMs - deltaMs);
    this.enemyBaseCurseMs = Math.max(0, this.enemyBaseCurseMs - deltaMs);

    // Cat Cannon charges passively over time (bible §A.3.9), independent of
    // combat performance. Cannon Charge Base Upgrade (bible §A.7.1) adds
    // flat charge-per-second on top.
    const chargePerSec = SPECIAL_CHARGE_PER_SEC + this.cannonChargePerSecBonus;
    this.specialMeter = Math.min(SPECIAL_METER_MAX, this.specialMeter + (chargePerSec * deltaMs) / 1000);
    this.updateCannonButton();
    this.base.fillColor = this.baseCurseMs > 0 ? BASE_CURSE_COLOR : BASE_COLOR;

    this.updatePlayerUnits(deltaMs);
    this.updateEnemies(deltaMs);

    // Sparring Grounds' base is invincible (see damageBase/damageEnemyBase),
    // so its HP is always Infinity — shown as "∞/∞" rather than a literal
    // (and confusing) "Infinity/Infinity" string.
    this.baseHpText.setText(Number.isFinite(this.baseHp) ? `${Math.max(0, this.baseHp)}/${this.baseMaxHp}` : '∞/∞');
    this.enemyBaseHpText.setText(
      Number.isFinite(this.enemyBaseHp) ? `${Math.max(0, this.enemyBaseHp)}/${this.enemyBaseMaxHp}` : '∞/∞',
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
      const affordable = this.money >= button.config.cost;
      const alpha = affordable ? 1 : 0.4;

      button.rect.setAlpha(alpha);
      button.labelText.setAlpha(alpha);
      button.costText.setAlpha(alpha);

      const remaining = this.unitCooldowns[button.key] || 0;
      const frac = button.config.rechargeMs ? remaining / button.config.rechargeMs : 0;
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
    const ready = this.specialMeter >= SPECIAL_METER_MAX && this.baseCurseMs <= 0;
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

  updatePlayerUnits(deltaMs) {
    const { width } = this.scale;
    const enemyBaseReachDistance = BASE_WIDTH / 2;

    for (const unit of this.playerUnits) {
      if (unit.hp <= 0) continue;

      this.tickStatusEffects(unit, deltaMs);

      if (unit.knockbackMs > 0) {
        this.tickKnockback(unit, deltaMs);
        continue;
      }

      if (unit.stopMs > 0 || unit.warpMs > 0) continue; // frozen/warped: no attack, no movement, no target-seeking

      if (unit.target === 'enemyBase') {
        this.tickCombatPhase(unit, deltaMs, () => {
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

      if (!unit.target && this.enemyBaseX - unit.shape.x <= enemyBaseReachDistance + this.getMaxRange(unit.config)) {
        unit.target = 'enemyBase';
      }

      if (unit.target && unit.target !== 'enemyBase') {
        this.tickCombatPhase(unit, deltaMs, () => {
          this.dealDamage(unit, unit.target, this.enemies);
        });
      } else if (!unit.target) {
        const moveStep = (unit.config.moveSpeed * unit.slowMultiplier * deltaMs) / 1000;
        unit.shape.x = Math.min(width - unit.config.radius, unit.shape.x + moveStep);
        unit.label.x = unit.shape.x;
      }
    }

    this.removeDead(this.playerUnits);
  }

  updateEnemies(deltaMs) {
    const baseReachDistance = BASE_WIDTH / 2;

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;

      this.tickStatusEffects(enemy, deltaMs);

      if (enemy.knockbackMs > 0) {
        this.tickKnockback(enemy, deltaMs);
        continue;
      }

      if (enemy.stopMs > 0 || enemy.warpMs > 0) continue; // frozen/warped: no attack, no movement, no target-seeking

      if (enemy.target === 'base') {
        this.tickCombatPhase(enemy, deltaMs, () => {
          const weakenMultiplier = enemy.weakenMs > 0 ? enemy.weakenMultiplier : 1;
          this.damageBase(enemy.config.damage * weakenMultiplier);
          this.applyStatusEffectToBase(enemy);
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

      if (!enemy.target && enemy.shape.x - this.baseX <= baseReachDistance + this.getMaxRange(enemy.config)) {
        enemy.target = 'base';
      }

      if (enemy.target && enemy.target !== 'base') {
        this.tickCombatPhase(enemy, deltaMs, () => this.dealDamage(enemy, enemy.target, this.playerUnits));
      } else if (!enemy.target) {
        const moveStep = (enemy.config.moveSpeed * enemy.slowMultiplier * deltaMs) / 1000;
        enemy.shape.x -= moveStep;
        enemy.label.x = enemy.shape.x;
      }
    }

    this.removeDead(this.enemies, (enemy) => this.onEnemyKilled(enemy));
  }

  onEnemyKilled(enemy) {
    this.enemiesKilled += 1;
    // Sparring Grounds pays no money for kills at all (bible: it's a
    // damage-test venue, not a money-farming one) — score still counts
    // the kill via enemiesKilled above, just no economy payout.
    if (this.mode === 'dojo') return;

    // Accounting Base Upgrade (bible §A.7.1) — % more money per kill.
    const bonus = enemy.config.threat * MONEY_CONFIG.killBonusMultiplier * (1 + this.accountingBonusPercent / 100);
    this.money = Math.min(this.getWalletCap(), this.money + bonus);
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

    return totalDamage;
  }

  // The shared per-hit pipeline: raw damage (crit/weaken/matchup, via
  // computeDamage) plus any Toxic bonus, then Barrier absorption (if the
  // defender has a shield), and finally knockback + status effects — but
  // ONLY for whatever portion of the hit actually reached real HP. A hit
  // fully absorbed by a Barrier deals no knockback/status at all, matching
  // the bible's "the shell absorbs the hit" framing (§A.3.8). Returns the
  // total damage computed (barrier-absorbed or not) for score/UI purposes.
  applyDamageAndEffects(attacker, entity) {
    const totalDamage = this.computeDamage(attacker, entity) + this.computeToxicBonus(attacker, entity);
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

    if (appliedToHp > 0) {
      this.resolveKnockback(attacker, entity);
      this.applyStatusEffect(attacker, entity);
    }

    return totalDamage;
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
    entity.label.x = entity.shape.x;

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

  // Same roll as applyStatusEffect, but for an attacker whose target is the
  // player's base directly. Only CURSE has anywhere to land here (bases
  // don't move or attack, so slow/stop/weaken have nothing to affect) —
  // curses this.baseCurseMs, which blocks tryTriggerSpecialBurst.
  applyStatusEffectToBase(attacker) {
    const status = attacker.config.statusOnHit;
    if (!status || status.type !== STATUS_TYPES.CURSE) return;
    if (Math.random() > status.chance) return;
    this.baseCurseMs = status.durationMs;
  }

  // Mirror of applyStatusEffectToBase for a player unit hitting the enemy
  // base. Currently a deliberate no-op in practice: the enemy base has no
  // special ability of its own to suppress yet, so nothing observable
  // happens — kept symmetric for whenever the enemy side gets one.
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

    if (entity.warpMs > 0) {
      entity.warpMs = Math.max(0, entity.warpMs - deltaMs);
      entity.shape.setVisible(false);
      entity.label.setVisible(false);

      if (entity.warpMs === 0) {
        const { width } = this.scale;
        entity.shape.x = Math.max(
          entity.config.radius,
          Math.min(width - entity.config.radius, entity.shape.x + entity.warpOffset),
        );
        entity.label.x = entity.shape.x;
        entity.warpOffset = 0;
        entity.shape.setVisible(true);
        entity.label.setVisible(true);
      } else {
        return; // stays invisible — no point resolving a tint this frame
      }
    }

    if (entity.stopMs > 0) entity.shape.fillColor = STATUS_STOP_COLOR;
    else if (entity.curseMs > 0) entity.shape.fillColor = STATUS_CURSE_COLOR;
    else if (entity.slowMs > 0) entity.shape.fillColor = STATUS_SLOW_COLOR;
    else if (entity.weakenMs > 0) entity.shape.fillColor = STATUS_WEAKEN_COLOR;
    else entity.shape.fillColor = entity.config.color;
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
      return FLAT_DAMAGE_AMOUNT;
    }

    const strongBonus = MATCHUP_BONUSES[attacker.config.trait]?.[defender.config.trait] ?? 1;
    const resistMultiplier = RESIST_BONUSES[defender.config.trait]?.[attacker.config.trait] ?? 1;
    const weakenMultiplier = attacker.weakenMs > 0 ? attacker.weakenMultiplier : 1;
    const critMultiplier = isCrit ? 2 : 1;

    return attacker.config.damage * strongBonus * resistMultiplier * weakenMultiplier * critMultiplier;
  }

  // Player-triggered: tapping the Cat Cannon button only does something
  // once the meter is full (see updateCannonButton for its ready-state
  // visual). A cursed base blocks this outright regardless of meter charge
  // — see applyStatusEffectToBase/baseCurseMs.
  tryTriggerSpecialBurst() {
    if (this.isGameOver) return;
    if (this.baseCurseMs > 0) return;
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

    // Cannon Power Base Upgrade (bible §A.7.1) adds flat damage to both
    // halves of the burst.
    const burstDamage = SPECIAL_BURST_DAMAGE + this.cannonPowerBonus;
    const burstBaseDamage = SPECIAL_BURST_BASE_DAMAGE + this.cannonPowerBonus;

    const syntheticAttacker = { shape: { x: this.baseX } };
    for (const enemy of this.enemies) {
      if (enemy.hp > 0) {
        enemy.hp -= burstDamage;
        if (enemy.hp > 0) this.startKnockbackSlide(syntheticAttacker, enemy);
      }
    }
    this.removeDead(this.enemies, (enemy) => this.onEnemyKilled(enemy));
    this.damageEnemyBase(burstBaseDamage);

    const { width } = this.scale;
    const flash = this.add.rectangle(width / 2, this.laneY, width, 80, SPECIAL_FLASH_COLOR).setAlpha(0.5);
    this.time.delayedCall(SPECIAL_FLASH_DURATION_MS, () => flash.destroy());
  }

  removeDead(list, onKill) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].hp <= 0) {
        const entity = list[i];
        entity.shape.destroy();
        entity.label.destroy();
        list.splice(i, 1);
        if (onKill) onKill(entity);
      }
    }
  }

  damageBase(amount) {
    if (this.isGameOver) return;
    if (this.mode === 'dojo') return; // invincible — no loss condition in Sparring Grounds

    this.baseHp = Math.max(0, this.baseHp - amount);
    if (this.baseHp <= 0) {
      this.endGame();
    }
  }

  damageEnemyBase(amount) {
    if (this.isGameOver) return;
    if (this.mode === 'dojo') return; // no destroy-the-base win condition in Sparring Grounds

    this.enemyBaseHp = Math.max(0, this.enemyBaseHp - amount);
    if (this.enemyBaseHp <= 0) {
      this.winStage();
    }
  }

  endGame() {
    this.isGameOver = true;

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
    const treasureResult = rollTreasureForStage(this.stage.id);

    const lines = ['STAGE CLEAR', `Score: ${finalScore}`, `+${xpReward.toLocaleString()} XP`];
    if (rewards.evoShardsGranted) lines.push('+1 Evo Shard!');
    if (rewards.growthCharmsGranted) lines.push('+1 Growth Charm!');
    if (treasureResult.improved) lines.push(`${TREASURE_TIER_NAMES[treasureResult.tier]} Treasure!`);
    if (!wasAlreadyCleared) {
      addGems(this.stage.gemsFirstClear);
      lines.push(`+${this.stage.gemsFirstClear} Gems! (First Clear)`);
    }
    this.showEndScreen(lines);
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
    // Study Base Upgrade (bible §A.7.1) — % more XP per clear.
    return Math.round(this.stage.baseXp * decay * (1 + this.studyBonusPercent / 100));
  }

  showEndScreen(lines) {
    this.gameOverText.setText(lines.join('\n'));

    const { width, height } = this.scale;
    const buttonY = height / 2 + 90;
    const buttonWidth = 160;
    const buttonGap = 20;
    const restartX = width / 2 - buttonWidth / 2 - buttonGap / 2;
    const menuX = width / 2 + buttonWidth / 2 + buttonGap / 2;

    const restartButton = this.add
      .rectangle(restartX, buttonY, buttonWidth, 60, 0x444444)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(restartX, buttonY, 'Restart', {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    restartButton.on('pointerdown', () => this.scene.restart());

    const menuButton = this.add
      .rectangle(menuX, buttonY, buttonWidth, 60, 0x444444)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(menuX, buttonY, 'Menu', {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    // Dojo wasn't reached via Stage Select at all (HomeScene launches it
    // directly), so "Menu" should return there instead. A normal stage
    // battle returns to its OWN saga's stage list (bible §A.6.1), not
    // always saga1's — this.stage.saga is read straight off the stage
    // record STAGE_CONFIG already resolved in create().
    menuButton.on('pointerdown', () =>
      this.scene.start(this.mode === 'dojo' ? 'HomeScene' : 'StageSelectScene', { sagaId: this.stage.saga }),
    );
  }
}
