import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { ENEMY_CONFIG } from './ENEMY_CONFIG.js';
import { WAVE_CONFIG } from './WAVE_CONFIG.js';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { saveStageResult } from './StageProgress.js';
import { MONEY_CONFIG } from './MONEY_CONFIG.js';
import { FLAT_DAMAGE_TRAIT, FLAT_DAMAGE_AMOUNT, MATCHUP_BONUSES, RESIST_BONUSES } from './TRAIT_CONFIG.js';
import { STATUS_TYPES } from './STATUS_CONFIG.js';

const LANE_Y_RATIO = 0.5;
const BASE_WIDTH = 60;
const BASE_MAX_HP = 100;

const BUTTON_HEIGHT = 70;
const BUTTON_WIDTH = 136;
const BUTTON_GAP = 8;

const CAP_BUTTON_WIDTH = 150;
const CAP_BUTTON_HEIGHT = 44;

const SCORE_PER_KILL = 10;
const HIGH_SCORE_KEY = 'axieSkirmishHighScore';

const BASE_COLOR = 0x3366cc;
const ENEMY_BASE_COLOR = 0x992222;
// Endless mode has no win state, so destroying the enemy base there instead
// grants a score bonus and respawns it tougher (stage mode just wins outright).
const ENEMY_BASE_DESTROY_SCORE_BONUS = 200;
const ENEMY_BASE_RESPAWN_HP_MULTIPLIER = 1.5;

// Stage mode's curated spawnScript is just the opening wave: once it's done,
// spawning continues via the same endless tier-scaled spawner (below) so
// enemies never stop coming — only destroying the enemy base wins the stage.
const STAGE_SCRIPT_TO_ENDLESS_HANDOFF_MS = 2000;

// How long a knockback slide takes to play out. A hit sets a defender's
// knockbackMs to this and computes a velocity (its `knockback` distance /
// this duration); every frame while knockbackMs > 0 it slides and cannot
// act at all (no attacking, no seeking a new target) — a real timed state,
// not an instant teleport.
const KNOCKBACK_DURATION_MS = 200;

// Status-effect visual cues — priority order when more than one is active:
// stop (fully frozen) beats curse beats slow, so the most disruptive state
// is always what's visible. Cleared back to the entity's own config.color
// once every timer runs out (see tickStatusEffects).
const STATUS_STOP_COLOR = 0x556677;
const STATUS_CURSE_COLOR = 0x9933cc;
const STATUS_SLOW_COLOR = 0x88ccff;

// Curse tint for the player's base itself (see baseCurseMs) — takes
// priority over the special-ready gold tint, since a cursed base can't
// fire its burst regardless of meter charge.
const BASE_CURSE_COLOR = 0x663399;

// Special meter: fills from total damage dealt BY PLAYER UNITS ONLY (enemy
// damage never charges it). Once full, the player's base turns gold and
// becomes clickable — tapping it fires a flat burst against every living
// enemy on screen plus the enemy base, then resets to 0. A "crowd clear +
// tower chip" moment more than a boss-killer, deliberately bypassing the
// trait/matchup system entirely (there's no single attacker to assign a
// trait to for a screen-wide effect), and skipping knockback for the same
// reason.
const SPECIAL_METER_MAX = 200;
const SPECIAL_BURST_DAMAGE = 30;
const SPECIAL_BURST_BASE_DAMAGE = 25;
const SPECIAL_BAR_WIDTH = 140;
const SPECIAL_BAR_HEIGHT = 14;
const SPECIAL_FLASH_COLOR = 0xffdd33;
const SPECIAL_FLASH_DURATION_MS = 250;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create(data) {
    const { width, height } = this.scale;

    this.mode = data && data.mode === 'stage' ? 'stage' : 'endless';
    this.stage = this.mode === 'stage' ? STAGE_CONFIG.find((s) => s.id === data.stageId) : null;

    this.moneyCap = this.stage ? this.stage.startingMoney : MONEY_CONFIG.startingCap;
    this.moneyAccrualPerSec = this.stage ? this.stage.moneyAccrualPerSec : MONEY_CONFIG.accrualPerSec;
    this.capUpgradeCost = MONEY_CONFIG.capUpgradeBaseCost;

    this.laneY = height * LANE_Y_RATIO;
    this.baseX = BASE_WIDTH / 2;
    this.baseHp = this.stage ? this.stage.baseHp : BASE_MAX_HP;
    this.enemyBaseX = width - BASE_WIDTH / 2;
    this.enemyBaseMaxHp = this.stage ? this.stage.enemyBaseHp : BASE_MAX_HP;
    this.enemyBaseHp = this.enemyBaseMaxHp;
    this.enemies = [];
    this.playerUnits = [];
    this.money = this.moneyCap;
    this.enemiesKilled = 0;
    this.bonusScore = 0;
    this.specialMeter = 0;
    this.baseCurseMs = 0; // curse landed directly on the player's base — blocks triggerSpecialBurst
    this.enemyBaseCurseMs = 0; // mirror on the enemy base — currently a no-op, nothing to suppress there yet
    this.elapsedMs = 0;
    this.isGameOver = false;

    this.add.rectangle(width / 2, this.laneY, width, 80, 0x2a2a2a);

    this.base = this.add
      .rectangle(this.baseX, this.laneY, BASE_WIDTH, 100, BASE_COLOR)
      .setInteractive({ useHandCursor: true });
    this.base.on('pointerdown', () => this.tryTriggerSpecialBurst());
    this.baseHpText = this.add
      .text(this.baseX, this.laneY - 70, `${this.baseHp}`, {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.enemyBase = this.add.rectangle(this.enemyBaseX, this.laneY, BASE_WIDTH, 100, ENEMY_BASE_COLOR);
    this.enemyBaseHpText = this.add
      .text(this.enemyBaseX, this.laneY - 70, `${this.enemyBaseHp}`, {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.moneyText = this.add.text(16, 16, '', {
      fontSize: '20px',
      color: '#ffffff',
    });

    this.capText = this.add.text(16, 40, '', {
      fontSize: '13px',
      color: '#aaaaaa',
    });

    this.createCapUpgradeButton();

    this.scoreText = this.add
      .text(width - 16, 16, '', {
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(1, 0);

    this.createSpecialMeter();

    this.gameOverText = this.add
      .text(width / 2, height / 2, '', {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.createSpawnButtons();

    if (this.mode === 'stage') {
      this.scheduleStageScript();
    } else {
      this.scheduleNextWave();
    }
  }

  scheduleStageScript() {
    for (const entry of this.stage.spawnScript) {
      this.time.delayedCall(entry.spawnDelayMs, () => {
        if (this.isGameOver) return;
        this.spawnScriptedEnemy(entry);
      });
    }

    const lastEntry = this.stage.spawnScript[this.stage.spawnScript.length - 1];
    this.time.delayedCall(lastEntry.spawnDelayMs + STAGE_SCRIPT_TO_ENDLESS_HANDOFF_MS, () => {
      if (this.isGameOver) return;
      this.scheduleNextWave();
    });
  }

  getTier() {
    return Math.floor(this.elapsedMs / WAVE_CONFIG.tierDurationMs);
  }

  scheduleNextWave() {
    if (this.isGameOver) return;

    const tier = this.getTier();
    const burstSize = 1 + Math.floor(tier / WAVE_CONFIG.burstTierStep);
    const roles = Object.keys(ENEMY_CONFIG).filter(
      (role) => tier >= (WAVE_CONFIG.roleUnlockTier[role] ?? 0),
    );
    for (let i = 0; i < burstSize; i += 1) {
      const role = roles[Math.floor(Math.random() * roles.length)];
      this.time.delayedCall(i * 250, () => this.spawnEnemy(role));
    }

    const delay = Math.max(
      WAVE_CONFIG.minSpawnIntervalMs,
      WAVE_CONFIG.baseSpawnIntervalMs - tier * WAVE_CONFIG.spawnIntervalStepMs,
    );
    this.time.delayedCall(delay, () => this.scheduleNextWave());
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
        .text(x, y + 14, `¥${Math.round(config.cost).toLocaleString()}`, {
          fontSize: '11px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      rect.on('pointerdown', () => this.trySpawnUnit(key));

      return { key, config, rect, labelText, costText };
    });
  }

  createCapUpgradeButton() {
    const x = 16 + CAP_BUTTON_WIDTH / 2;
    const y = 76;

    const rect = this.add
      .rectangle(x, y, CAP_BUTTON_WIDTH, CAP_BUTTON_HEIGHT, 0x555555)
      .setInteractive({ useHandCursor: true });

    const labelText = this.add
      .text(x, y - 10, 'Upgrade Cap', {
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

    rect.on('pointerdown', () => this.trySpawnCapUpgrade());

    this.capUpgradeButton = { rect, labelText, costText };
  }

  createSpecialMeter() {
    const { width } = this.scale;
    const barCenterX = width - 16 - SPECIAL_BAR_WIDTH / 2;
    const barY = 50;

    this.add
      .text(width - 16, barY - 16, 'Special', {
        fontSize: '12px',
        color: '#ffdd33',
      })
      .setOrigin(1, 0.5);

    this.add.rectangle(barCenterX, barY, SPECIAL_BAR_WIDTH, SPECIAL_BAR_HEIGHT, 0x333333);

    this.specialBarFill = this.add
      .rectangle(barCenterX - SPECIAL_BAR_WIDTH / 2, barY, 0, SPECIAL_BAR_HEIGHT, SPECIAL_FLASH_COLOR)
      .setOrigin(0, 0.5);
  }

  trySpawnUnit(key) {
    if (this.isGameOver) return;

    const config = UNIT_CONFIG[key];
    if (this.money < config.cost) return;

    this.money -= config.cost;
    this.spawnUnit(key);
  }

  trySpawnCapUpgrade() {
    if (this.isGameOver) return;
    if (this.money < this.capUpgradeCost) return;

    this.money -= this.capUpgradeCost;
    this.moneyCap += MONEY_CONFIG.capUpgradeAmount;
    this.capUpgradeCost *= MONEY_CONFIG.capUpgradeCostMultiplier;
  }

  spawnUnit(type) {
    const config = UNIT_CONFIG[type];
    const x = this.baseX + BASE_WIDTH / 2 + config.radius;

    const shape = this.add.circle(x, this.laneY, config.radius, config.color);
    const label = this.add.text(x, this.laneY, config.label, {
      fontSize: '16px',
      color: '#000000',
    }).setOrigin(0.5);

    this.playerUnits.push({
      type,
      config,
      shape,
      label,
      hp: config.hp,
      attackAccumulatorMs: 0,
      knockbackMs: 0,
      knockbackVelocity: 0,
      slowMs: 0,
      slowMultiplier: 1,
      stopMs: 0,
      curseMs: 0,
      target: null,
    });
  }

  spawnEnemy(type) {
    if (this.isGameOver) return;

    const base = ENEMY_CONFIG[type];
    const tier = this.getTier();
    const config = {
      ...base,
      hp: Math.round(base.hp * (1 + tier * WAVE_CONFIG.hpMultiplierPerTier)),
      moveSpeed: base.moveSpeed * (1 + tier * WAVE_CONFIG.speedMultiplierPerTier),
    };

    this.createEnemy(type, config);
  }

  // Stage mode: fixed script instead of endless's random/tier-scaled roll.
  // Only hp is scaled (by the script entry's own statMultiplier) — no
  // WAVE_CONFIG tier scaling applies here, per STAGE_CONFIG.js's contract.
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

    this.enemies.push({
      type,
      config,
      shape,
      label,
      hp: config.hp,
      attackAccumulatorMs: 0,
      knockbackMs: 0,
      knockbackVelocity: 0,
      slowMs: 0,
      slowMultiplier: 1,
      stopMs: 0,
      curseMs: 0,
      target: null,
    });
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

    this.money = Math.min(this.moneyCap, this.money + (this.moneyAccrualPerSec * deltaMs) / 1000);
    this.moneyText.setText(`¥${Math.round(this.money).toLocaleString()}`);
    this.capText.setText(`Cap: ¥${Math.round(this.moneyCap).toLocaleString()}`);
    this.updateSpawnButtons();
    this.updateCapUpgradeButton();
    this.baseCurseMs = Math.max(0, this.baseCurseMs - deltaMs);
    this.enemyBaseCurseMs = Math.max(0, this.enemyBaseCurseMs - deltaMs);
    this.specialBarFill.setSize(SPECIAL_BAR_WIDTH * Math.min(1, this.specialMeter / SPECIAL_METER_MAX), SPECIAL_BAR_HEIGHT);
    this.base.fillColor =
      this.baseCurseMs > 0
        ? BASE_CURSE_COLOR
        : this.specialMeter >= SPECIAL_METER_MAX
          ? SPECIAL_FLASH_COLOR
          : BASE_COLOR;

    this.updatePlayerUnits(deltaMs);
    this.updateEnemies(deltaMs);

    this.baseHpText.setText(`${this.baseHp}`);
    this.enemyBaseHpText.setText(`${this.enemyBaseHp}`);
    this.scoreText.setText(`Score: ${this.getScore()}`);
  }

  getScore() {
    return Math.floor(this.elapsedMs / 1000) + this.enemiesKilled * SCORE_PER_KILL + this.bonusScore;
  }

  updateSpawnButtons() {
    for (const button of this.spawnButtons) {
      const affordable = this.money >= button.config.cost;
      button.rect.setAlpha(affordable ? 1 : 0.4);
      button.labelText.setAlpha(affordable ? 1 : 0.4);
      button.costText.setAlpha(affordable ? 1 : 0.4);
    }
  }

  updateCapUpgradeButton() {
    const button = this.capUpgradeButton;
    button.costText.setText(`¥${Math.round(this.capUpgradeCost).toLocaleString()}`);

    const affordable = this.money >= this.capUpgradeCost;
    button.rect.setAlpha(affordable ? 1 : 0.4);
    button.labelText.setAlpha(affordable ? 1 : 0.4);
    button.costText.setAlpha(affordable ? 1 : 0.4);
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
        this.tickAttack(unit, deltaMs, () => {
          this.damageEnemyBase(unit.config.damage);
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
        this.tickAttack(unit, deltaMs, () => {
          const dmg = this.dealDamage(unit, unit.target, this.enemies);
          this.chargeSpecialMeter(dmg);
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
        this.tickAttack(enemy, deltaMs, () => {
          this.damageBase(enemy.config.damage);
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
        this.tickAttack(enemy, deltaMs, () => this.dealDamage(enemy, enemy.target, this.playerUnits));
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
    this.money = Math.min(this.moneyCap, this.money + bonus);
  }

  tickAttack(attacker, deltaMs, onHit) {
    attacker.attackAccumulatorMs += deltaMs;
    const effectiveAttackSpeed = attacker.config.attackSpeed * attacker.slowMultiplier;
    const attackIntervalMs = 1000 / effectiveAttackSpeed;
    if (attacker.attackAccumulatorMs >= attackIntervalMs) {
      attacker.attackAccumulatorMs -= attackIntervalMs;
      onHit();
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
          this.applyKnockback(attacker, entity);
          this.applyStatusEffect(attacker, entity);
          totalDamage += dmg;
        }
      }
    } else {
      totalDamage = this.computeDamage(attacker, primaryTarget);
      primaryTarget.hp -= totalDamage;
      this.applyKnockback(attacker, primaryTarget);
      this.applyStatusEffect(attacker, primaryTarget);
    }

    return totalDamage;
  }

  // Starts a timed knockback slide on `defender`, away from `attacker`.
  // Distance comes from defender's own `knockback` stat; duration is the
  // same fixed KNOCKBACK_DURATION_MS for everyone. While active (see
  // tickKnockback), the defender can't attack or seek a target at all —
  // that's what makes this "interrupt the attack" rather than just a
  // visual push. 'immune' knockbackType skips this entirely: a true wall
  // doesn't budge no matter how hard it's hit. Bases have no shape.x to
  // shove, so this is never called for damageBase/damageEnemyBase.
  applyKnockback(attacker, defender) {
    if (defender.config.knockbackType === 'immune') return;

    const knockback = defender.config.knockback;
    if (!knockback) return;

    const direction = Math.sign(defender.shape.x - attacker.shape.x) || 1;
    defender.knockbackVelocity = (direction * knockback) / KNOCKBACK_DURATION_MS;
    defender.knockbackMs = KNOCKBACK_DURATION_MS;
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
      case STATUS_TYPES.CURSE:
        defender.curseMs = status.durationMs;
        break;
    }
  }

  // Same roll as applyStatusEffect, but for an attacker whose target is the
  // player's base directly (see updatePlayerUnits's 'enemyBase' — wait, this
  // one is the enemy-hits-player-base case). Only CURSE has anywhere to land
  // here (bases don't move or attack, so slow/stop have nothing to affect) —
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

  // Ticks all three status timers down and drives the entity's tint —
  // stop (fully frozen) beats curse beats slow, so the most disruptive
  // active state is always what's visible; restores config.color once
  // every timer has run out. Called for every living unit/enemy every
  // frame, independent of whether they're also mid-knockback.
  tickStatusEffects(entity, deltaMs) {
    if (entity.slowMs > 0) {
      entity.slowMs = Math.max(0, entity.slowMs - deltaMs);
      if (entity.slowMs === 0) entity.slowMultiplier = 1;
    }
    if (entity.stopMs > 0) entity.stopMs = Math.max(0, entity.stopMs - deltaMs);
    if (entity.curseMs > 0) entity.curseMs = Math.max(0, entity.curseMs - deltaMs);

    if (entity.stopMs > 0) entity.shape.fillColor = STATUS_STOP_COLOR;
    else if (entity.curseMs > 0) entity.shape.fillColor = STATUS_CURSE_COLOR;
    else if (entity.slowMs > 0) entity.shape.fillColor = STATUS_SLOW_COLOR;
    else entity.shape.fillColor = entity.config.color;
  }

  // Resolves one hit's damage against `defender`'s trait. The flat-damage
  // trait always short-circuits here (see TRAIT_CONFIG.js) — it ignores
  // the attacker's damage stat and any matchup/resist multiplier entirely,
  // which is what makes attack speed (not raw damage) the deciding stat
  // against it. Otherwise, MATCHUP_BONUSES ("attacker strong against
  // defender") and RESIST_BONUSES ("defender resists attacker") are two
  // independent multipliers stacked together, not one combined table.
  computeDamage(attacker, defender) {
    if (defender.config.trait === FLAT_DAMAGE_TRAIT) {
      return FLAT_DAMAGE_AMOUNT;
    }

    const strongBonus = MATCHUP_BONUSES[attacker.config.trait]?.[defender.config.trait] ?? 1;
    const resistMultiplier = RESIST_BONUSES[defender.config.trait]?.[attacker.config.trait] ?? 1;
    return attacker.config.damage * strongBonus * resistMultiplier;
  }

  chargeSpecialMeter(damageDealt) {
    if (this.isGameOver) return;

    this.specialMeter = Math.min(SPECIAL_METER_MAX, this.specialMeter + damageDealt);
  }

  // Player-triggered: tapping the base only does something once the meter
  // is full (the base itself turns gold as the "ready" signal — see
  // update()). A cursed base blocks this outright regardless of meter
  // charge — see applyStatusEffectToBase/baseCurseMs.
  tryTriggerSpecialBurst() {
    if (this.isGameOver) return;
    if (this.baseCurseMs > 0) return;
    if (this.specialMeter < SPECIAL_METER_MAX) return;

    this.triggerSpecialBurst();
  }

  // Flat damage to every living enemy plus a chip of enemy-base damage,
  // then resets to 0. Enemy kills route through the normal removeDead/
  // onEnemyKilled path so they still pay out money and count toward score
  // like any other kill; the base damage goes through damageEnemyBase so it
  // still triggers a normal win/respawn if it finishes the base off.
  triggerSpecialBurst() {
    this.specialMeter = 0;

    for (const enemy of this.enemies) {
      if (enemy.hp > 0) {
        enemy.hp -= SPECIAL_BURST_DAMAGE;
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
      if (this.mode === 'stage') {
        this.winStage();
      } else {
        this.destroyEnemyBaseEndless();
      }
    }
  }

  // Endless has no win state, so razing the enemy base instead pays out a
  // big score bonus and brings it back tougher than before.
  destroyEnemyBaseEndless() {
    this.bonusScore += ENEMY_BASE_DESTROY_SCORE_BONUS;
    this.enemyBaseMaxHp = Math.round(this.enemyBaseMaxHp * ENEMY_BASE_RESPAWN_HP_MULTIPLIER);
    this.enemyBaseHp = this.enemyBaseMaxHp;
  }

  endGame() {
    this.isGameOver = true;

    const finalScore = this.getScore();
    const lines = ['GAME OVER', `Score: ${finalScore}`];

    // Endless mode's high score is a separate, endless-only concern from
    // stage mode's per-stage best score (tracked below via StageProgress).
    if (this.mode === 'endless') {
      const previousHighScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
      const isNewHighScore = finalScore > previousHighScore;
      if (isNewHighScore) {
        localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
      }
      const highScore = isNewHighScore ? finalScore : previousHighScore;
      lines.push(isNewHighScore ? 'New high score!' : `High score: ${highScore}`);
    } else {
      // A loss can still raise a stage's best score; it never marks it cleared.
      saveStageResult(this.stage.id, finalScore, false);
    }

    this.showEndScreen(lines);
  }

  // Stage mode's only win trigger: destroying the enemy base (see damageEnemyBase).
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
