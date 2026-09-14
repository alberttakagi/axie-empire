import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { ENEMY_CONFIG } from './ENEMY_CONFIG.js';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { saveStageResult } from './StageProgress.js';
import { MONEY_CONFIG } from './MONEY_CONFIG.js';
import { FLAT_DAMAGE_TRAIT, FLAT_DAMAGE_AMOUNT, MATCHUP_BONUSES, RESIST_BONUSES } from './TRAIT_CONFIG.js';
import { STATUS_TYPES } from './STATUS_CONFIG.js';

const LANE_Y_RATIO = 0.5;
const BASE_WIDTH = 60;

const BUTTON_HEIGHT = 70;
const BUTTON_WIDTH = 136;
const BUTTON_GAP = 8;

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

    this.stage = STAGE_CONFIG.find((s) => s.id === data.stageId);

    // Worker Cat: an in-battle levelable economy building (bible §A.3.10/
    // §A.7.1 — confirmed real reference mechanic, not invented). Starts
    // every battle at level 1, using the stage's own moneyAccrualPerSec/
    // startingMoney as level-1's income rate/wallet cap; see
    // getMoneyAccrualPerSec/getWalletCap. Capped at MONEY_CONFIG.workerCat.maxLevel.
    this.workerCatLevel = 1;
    this.workerCatUpgradeCost = MONEY_CONFIG.workerCat.baseUpgradeCost * this.workerCatLevel;

    this.laneY = height * LANE_Y_RATIO;
    this.baseX = BASE_WIDTH / 2;
    this.baseHp = this.stage.baseHp;
    this.baseMaxHp = this.stage.baseHp;
    this.enemyBaseX = width - BASE_WIDTH / 2;
    this.enemyBaseMaxHp = this.stage.enemyBaseHp;
    this.enemyBaseHp = this.enemyBaseMaxHp;
    this.enemies = [];
    this.playerUnits = [];
    this.money = this.getWalletCap();
    this.enemiesKilled = 0;
    this.specialMeter = 0;
    this.baseCurseMs = 0; // curse landed directly on the player's base — blocks triggerSpecialBurst
    this.enemyBaseCurseMs = 0; // mirror on the enemy base — currently a no-op, nothing to suppress there yet
    this.elapsedMs = 0;
    this.isGameOver = false;

    // Per-unit-type redeploy cooldown (bible §A.3.2/§A.3.7) — global floor
    // is 2000ms across every UNIT_CONFIG entry; see trySpawnUnit/update.
    this.unitCooldowns = {};
    for (const key of Object.keys(UNIT_CONFIG)) this.unitCooldowns[key] = 0;

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

    // Top-left: stage name (confirmed screenshot position — a pause icon
    // sits here too in the reference game; not implemented yet, see the
    // bible cross-check notes).
    this.add.text(16, 16, this.stage.displayName, {
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

    this.gameOverText = this.add
      .text(width / 2, height / 2, '', {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.createSpawnButtons();
    this.scheduleStageScript();
  }

  scheduleStageScript() {
    for (const entry of this.stage.spawnScript) {
      this.time.delayedCall(entry.spawnDelayMs, () => {
        if (this.isGameOver) return;
        this.spawnScriptedEnemy(entry);
      });
    }
  }

  createSpawnButtons() {
    const { width, height } = this.scale;
    const keys = Object.keys(UNIT_CONFIG);
    const totalWidth = keys.length * BUTTON_WIDTH + (keys.length - 1) * BUTTON_GAP;
    const startX = (width - totalWidth) / 2 + BUTTON_WIDTH / 2;
    const y = height - BUTTON_HEIGHT / 2 - 10;

    this.spawnButtons = keys.map((key, index) => {
      const config = UNIT_CONFIG[key];
      const x = startX + index * (BUTTON_WIDTH + BUTTON_GAP);

      const rect = this.add
        .rectangle(x, y, BUTTON_WIDTH, BUTTON_HEIGHT, config.color)
        .setInteractive({ useHandCursor: true });

      const labelText = this.add
        .text(x, y - 14, config.displayName, {
          fontSize: '13px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5);

      const costText = this.add
        .text(x, y + 14, `${Math.round(config.cost).toLocaleString()}円`, {
          fontSize: '11px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      // Recharge cooldown overlay (bible §A.3.2/§A.10.4's "cooldown fill" on
      // a unit's deploy icon) — a dark wipe that shrinks from full button
      // height to 0 as unitCooldowns[key] counts down; see updateSpawnButtons.
      const cooldownOverlay = this.add
        .rectangle(x, y - BUTTON_HEIGHT / 2, BUTTON_WIDTH, 0, 0x000000)
        .setOrigin(0.5, 0)
        .setAlpha(0.6);

      rect.on('pointerdown', () => this.trySpawnUnit(key));

      return { key, config, rect, labelText, costText, cooldownOverlay };
    });
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
      .text(this.cannonX, this.cannonY, 'CANNON', {
        fontSize: '10px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.cannonBase
      .setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Circle(0, 0, CANNON_BUTTON_RADIUS), hitAreaCallback: Phaser.Geom.Circle.Contains })
      .on('pointerdown', () => this.tryTriggerSpecialBurst());
  }

  // Level-1 values come from the stage itself; each Worker Cat level above 1
  // adds a flat amount on top (see MONEY_CONFIG.workerCat).
  getMoneyAccrualPerSec() {
    return this.stage.moneyAccrualPerSec + (this.workerCatLevel - 1) * MONEY_CONFIG.workerCat.accrualPerLevel;
  }

  getWalletCap() {
    return this.stage.startingMoney + (this.workerCatLevel - 1) * MONEY_CONFIG.workerCat.walletCapPerLevel;
  }

  trySpawnUnit(key) {
    if (this.isGameOver) return;
    if (this.unitCooldowns[key] > 0) return;

    const config = UNIT_CONFIG[key];
    if (this.money < config.cost) return;

    this.money -= config.cost;
    this.unitCooldowns[key] = config.rechargeMs;
    this.spawnUnit(key);
  }

  tryUpgradeWorkerCat() {
    if (this.isGameOver) return;
    if (this.workerCatLevel >= MONEY_CONFIG.workerCat.maxLevel) return;
    if (this.money < this.workerCatUpgradeCost) return;

    this.money -= this.workerCatUpgradeCost;
    this.workerCatLevel += 1;
    this.workerCatUpgradeCost = MONEY_CONFIG.workerCat.baseUpgradeCost * this.workerCatLevel;
  }

  spawnUnit(type) {
    const config = UNIT_CONFIG[type];
    const x = this.baseX + BASE_WIDTH / 2 + config.radius;

    const shape = this.add.circle(x, this.laneY, config.radius, config.color);
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
      target: null,
    };
  }

  // Can `attacker` hit `target` from their current distance? Melee roles set
  // `range` equal to their own radius, so this reduces to plain contact; a
  // bigger `range` lets ranged/AoE roles engage before physically touching.
  inRange(attacker, target) {
    return Math.abs(attacker.shape.x - target.shape.x) <= attacker.config.range + target.config.radius;
  }

  update(time, deltaMs) {
    if (this.isGameOver) return;

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
    // combat performance.
    this.specialMeter = Math.min(SPECIAL_METER_MAX, this.specialMeter + (SPECIAL_CHARGE_PER_SEC * deltaMs) / 1000);
    this.updateCannonButton();
    this.base.fillColor = this.baseCurseMs > 0 ? BASE_CURSE_COLOR : BASE_COLOR;

    this.updatePlayerUnits(deltaMs);
    this.updateEnemies(deltaMs);

    this.baseHpText.setText(`${Math.max(0, this.baseHp)}/${this.baseMaxHp}`);
    this.enemyBaseHpText.setText(`${Math.max(0, this.enemyBaseHp)}/${this.enemyBaseMaxHp}`);
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

    button.labelText.setText(`Worker Cat Lv${this.workerCatLevel}`);
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

      if (unit.stopMs > 0) continue; // frozen: no attack, no movement, no target-seeking

      if (unit.target === 'enemyBase') {
        this.tickCombatPhase(unit, deltaMs, () => {
          const weakenMultiplier = unit.weakenMs > 0 ? unit.weakenMultiplier : 1;
          this.damageEnemyBase(unit.config.damage * weakenMultiplier);
          this.applyStatusEffectToEnemyBase(unit);
        });
        continue;
      }

      if (unit.target && (unit.target.hp <= 0 || !this.inRange(unit, unit.target))) {
        unit.target = null;
      }

      if (!unit.target) {
        unit.target = this.enemies.find((enemy) => enemy.hp > 0 && this.inRange(unit, enemy)) || null;
      }

      if (!unit.target && this.enemyBaseX - unit.shape.x <= enemyBaseReachDistance + unit.config.range) {
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

      if (enemy.stopMs > 0) continue; // frozen: no attack, no movement, no target-seeking

      if (enemy.target === 'base') {
        this.tickCombatPhase(enemy, deltaMs, () => {
          const weakenMultiplier = enemy.weakenMs > 0 ? enemy.weakenMultiplier : 1;
          this.damageBase(enemy.config.damage * weakenMultiplier);
          this.applyStatusEffectToBase(enemy);
        });
        continue;
      }

      if (enemy.target && enemy.target.hp <= 0) {
        enemy.target = null;
      }
      if (enemy.target && !this.inRange(enemy, enemy.target)) {
        enemy.target = null;
      }

      if (!enemy.target) {
        enemy.target =
          this.playerUnits.find((unit) => unit.hp > 0 && this.inRange(enemy, unit)) || null;
      }

      if (!enemy.target && enemy.shape.x - this.baseX <= baseReachDistance + enemy.config.range) {
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
    const bonus = enemy.config.threat * MONEY_CONFIG.killBonusMultiplier;
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
  // `special.radius` of the primary target's position is hit too.
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
          const dmg = this.computeDamage(attacker, entity);
          entity.hp -= dmg;
          this.resolveKnockback(attacker, entity);
          this.applyStatusEffect(attacker, entity);
          totalDamage += dmg;
        }
      }
    } else {
      totalDamage = this.computeDamage(attacker, primaryTarget);
      primaryTarget.hp -= totalDamage;
      this.resolveKnockback(attacker, primaryTarget);
      this.applyStatusEffect(attacker, primaryTarget);
    }

    return totalDamage;
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

  // Ticks all four status timers down and drives the entity's tint — stop
  // (fully frozen) beats curse beats slow beats weaken, so the most
  // disruptive/visible active state is always what's shown; restores
  // config.color once every timer has run out. Called for every living
  // unit/enemy every frame, independent of whether they're also
  // mid-knockback.
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

    const syntheticAttacker = { shape: { x: this.baseX } };
    for (const enemy of this.enemies) {
      if (enemy.hp > 0) {
        enemy.hp -= SPECIAL_BURST_DAMAGE;
        if (enemy.hp > 0) this.startKnockbackSlide(syntheticAttacker, enemy);
      }
    }
    this.removeDead(this.enemies, (enemy) => this.onEnemyKilled(enemy));
    this.damageEnemyBase(SPECIAL_BURST_BASE_DAMAGE);

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

    this.baseHp = Math.max(0, this.baseHp - amount);
    if (this.baseHp <= 0) {
      this.endGame();
    }
  }

  damageEnemyBase(amount) {
    if (this.isGameOver) return;

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

  // The only win trigger: destroying the enemy base (see damageEnemyBase).
  winStage() {
    this.isGameOver = true;

    const finalScore = this.getScore();
    saveStageResult(this.stage.id, finalScore, true);
    this.showEndScreen(['STAGE CLEAR', `Score: ${finalScore}`]);
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
    menuButton.on('pointerdown', () => this.scene.start('StageSelectScene'));
  }
}
