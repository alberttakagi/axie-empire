import Phaser from 'phaser';
import { LOGICAL_SIZE } from './RenderConfig.js';
import { playSfxFile, playCoinSfx } from './Audio.js';
import { addGems } from './PlayerProgress.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';

// Round 2 battle twists — small, readable surprises layered on the core
// lane fight. Installed onto GameScene.prototype (installBattleTwists) so
// GameScene only needs a handful of one-line hooks:
//   1. Boss Enrage    — a boss below 30% HP turns red, hits harder, moves faster.
//   2. Elite enemies  — some spawns carry an aura: Shield, Regen or Haste.
//   3. Treasure chest — floats over the enemy half now and then; hit it with
//                       the Rune Cannon for bonus money (and sometimes Gems).
//   4. Rally horn     — once per battle, call a free squad of reinforcements.
//   5. Weather fronts — a mid-battle Rain (everyone slower) or Sunbeam (your
//                       Axies hit 25% harder) for a short spell.

const ENRAGE_HP_RATIO = 0.3;
const ELITE_TYPES = {
  shield: { label: 'SHIELD', color: 0x6ec6ff },
  regen: { label: 'REGEN', color: 0x7ddc6b },
  haste: { label: 'HASTE', color: 0xffc04d },
};
const CHEST_FIRST_MS = 40000;
const CHEST_INTERVAL_MS = 50000;
const CHEST_LIFETIME_MS = 22000;
const RALLY_UNLOCK_MS = 45000;
const WEATHER_DURATION_MS = 18000;

function stageNumber(scene) {
  const n = parseInt(String(scene.stage?.id ?? '').replace('stage', ''), 10);
  return Number.isFinite(n) ? n : 0;
}

const methods = {
  initBattleTwists() {
    this.twistTimeMs = 0;
    this.weatherSpeedMult = 1;
    this.sunbeamMs = 0;
    this.weather = null;
    this.chest = null;
    this.nextChestMs = CHEST_FIRST_MS;
    this.rallyUsed = false;
    this.twistAuras = [];
    const num = stageNumber(this);
    this.twistLevel = this.mode === 'dojo' ? 3 : Math.floor((num - 1) / 48); // 0..6 by saga
    // One weather front per battle on most stages past the first chapter.
    this.weatherAtMs = num > 8 || this.mode === 'dojo' ? 60000 + Math.random() * 40000 : Infinity;
    this.createRallyButton();
  },

  // ---- per-frame ----
  updateBattleTwists(deltaMs) {
    this.twistTimeMs += deltaMs;
    this.updateEnrage();
    this.updateEliteAuras(deltaMs);
    this.updateChest(deltaMs);
    this.updateWeather(deltaMs);
    this.updateRallyButton();
  },

  // ---- 1. Boss Enrage ----
  updateEnrage() {
    for (const enemy of this.enemies) {
      if (!enemy.isBoss || enemy.enraged || enemy.hp <= 0) continue;
      if (enemy.hp / enemy.config.hp > ENRAGE_HP_RATIO) continue;
      enemy.enraged = true;
      enemy.config = {
        ...enemy.config,
        damage: Math.round(enemy.config.damage * 1.5),
        moveSpeed: enemy.config.moveSpeed * 1.3,
        foreswingMs: enemy.config.foreswingMs * 0.75,
        backswingMs: enemy.config.backswingMs * 0.75,
      };
      this.cameras.main.shake(400, 0.014);
      playSfxFile('/audio/sfx/death_mark.wav', { gain: 0.6 });
      this.twistBanner(`${(enemy.config.characterName || 'BOSS').toUpperCase()} IS ENRAGED!`, '#ff5a3c');
    }
  },

  // ---- 2. Elite enemies ----
  maybeMakeElite(enemy) {
    if (!enemy || enemy.isBoss || this.twistLevel < 0) return;
    const num = stageNumber(this);
    if (this.mode !== 'dojo' && num < 17) return;
    const chance = 0.06 + 0.02 * this.twistLevel;
    if (Math.random() > chance) return;
    const types = Object.keys(ELITE_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    enemy.eliteType = type;
    if (type === 'shield') enemy.barrierHp = (enemy.barrierHp || 0) + Math.round(enemy.config.hp * 0.3);
    if (type === 'haste') enemy.config = { ...enemy.config, moveSpeed: enemy.config.moveSpeed * 1.45 };
    const ring = this.add.ellipse(enemy.shape.x, this.laneY + 18, 70, 18, ELITE_TYPES[type].color, 0.45).setDepth(-1);
    const tag = this.add
      .text(enemy.shape.x, this.laneY - 60, ELITE_TYPES[type].label, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.uiCamera.ignore([ring, tag]);
    this.tweens.add({ targets: ring, scaleX: 1.25, alpha: 0.2, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.twistAuras.push({ enemy, ring, tag });
  },

  updateEliteAuras(deltaMs) {
    this.twistAuras = this.twistAuras.filter((aura) => {
      const { enemy, ring, tag } = aura;
      if (enemy.hp <= 0 || !this.enemies.includes(enemy)) {
        this.tweens.killTweensOf(ring);
        ring.destroy();
        tag.destroy();
        return false;
      }
      const top = enemy.spriteImage ? enemy.spriteImage.getTopCenter().y : enemy.shape.y - 40;
      ring.setPosition(enemy.shape.x, this.laneY + 18);
      tag.setPosition(enemy.shape.x, top - 8);
      if (enemy.eliteType === 'regen') {
        enemy.hp = Math.min(enemy.config.hp, enemy.hp + (enemy.config.hp * 0.02 * deltaMs) / 1000);
      }
      return true;
    });
  },

  // ---- 3. Treasure chest (Rune Cannon target) ----
  updateChest(deltaMs) {
    if (this.mode === 'dojo' || stageNumber(this) < 5) return;
    if (this.chest) {
      this.chest.ageMs += deltaMs;
      if (this.chest.ageMs > CHEST_LIFETIME_MS) this.removeChest(false);
      return;
    }
    if (this.twistTimeMs < this.nextChestMs) return;
    this.nextChestMs = this.twistTimeMs + CHEST_INTERVAL_MS;
    const { width } = LOGICAL_SIZE;
    const x = width * (0.55 + Math.random() * 0.3);
    const y = this.laneY - 95;
    // Treasure chest art (public/vfx/treasure_chest.png, user-supplied).
    const chestImg = this.textures.exists('fx_treasure_chest')
      ? this.add.image(x, y - 4, 'fx_treasure_chest').setDisplaySize(48, 40)
      : this.add.rectangle(x, y, 30, 18, 0x8d5524).setStrokeStyle(2, 0x3e2310);
    const glow = this.add.circle(x, y - 4, 28, 0xfff3a0, 0.25);
    const hint = this.add
      .text(x, y - 34, 'Hit me with the cannon!', { fontFamily: 'Rowdies, sans-serif', fontSize: '9px', color: '#ffe58a', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);
    const parts = [glow, chestImg, hint];
    // Above Fog of War (900) and weather (950-951): it's a target players must see.
    parts.forEach((p) => p.setDepth(960));
    this.uiCamera.ignore(parts);
    this.tweens.add({ targets: [chestImg, hint], y: '-=8', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: chestImg, angle: { from: -6, to: 6 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.08, duration: 700, yoyo: true, repeat: -1 });
    this.chest = { x, parts, ageMs: 0 };
  },

  checkCannonChest(blastCenterX, blastHalfWidth) {
    if (!this.chest || Math.abs(this.chest.x - blastCenterX) > blastHalfWidth) return;
    const money = 400 + 200 * this.twistLevel;
    this.money = Math.min(this.getWalletCap(), this.money + money);
    const gems = Math.random() < 0.35 ? 5 + 5 * Math.min(3, this.twistLevel) : 0;
    if (gems) addGems(gems);
    playCoinSfx();
    playSfxFile('/audio/sfx/buff.wav', { gain: 0.5 });
    const x = this.chest.x;
    this.removeChest(true);
    const label = this.add
      .text(x, this.laneY - 110, `TREASURE! +${money}円${gems ? `  +${gems} Gems` : ''}`, {
        fontFamily: 'Rowdies, sans-serif', fontSize: '14px', color: '#ffd84a', stroke: '#5a3a00', strokeThickness: 4,
      })
      .setOrigin(0.5).setDepth(1001);
    this.uiCamera.ignore(label);
    this.tweens.add({ targets: label, y: label.y - 40, alpha: 0, delay: 900, duration: 700, onComplete: () => label.destroy() });
  },

  removeChest(opened) {
    if (!this.chest) return;
    const { parts, x } = this.chest;
    this.chest = null;
    parts.forEach((p) => this.tweens.killTweensOf(p));
    if (opened) {
      for (let k = 0; k < 14; k++) {
        const sp = this.add.circle(x, this.laneY - 95, 3, [0xffd54f, 0xffffff, 0x81d4fa][k % 3]).setDepth(1000);
        this.uiCamera.ignore(sp);
        const ang = Phaser.Math.DegToRad(Math.random() * 360);
        this.tweens.add({ targets: sp, x: x + Math.cos(ang) * 60, y: this.laneY - 95 + Math.sin(ang) * 60, alpha: 0, duration: 600, onComplete: () => sp.destroy() });
      }
    }
    this.tweens.add({ targets: parts, alpha: 0, duration: 250, onComplete: () => parts.forEach((p) => p.destroy()) });
  },

  // ---- 4. Rally horn ----
  // Sits at the end of the top battle-item row (same 76x34 tile style), so
  // it never covers the player's tower.
  createRallyButton() {
    const { width } = LOGICAL_SIZE;
    const x = width / 2 + 120 + 6 + 38;
    const y = 48;
    const ring = this.add.rectangle(x, y, 76, 34, 0xffe58a).setStrokeStyle(2, 0x1d1a16).setInteractive({ useHandCursor: true });
    const icon = this.add.text(x, y - 8, '📯 Rally', { fontFamily: 'Rowdies, sans-serif', fontSize: '9px', color: '#000000' }).setOrigin(0.5);
    const label = this.add.text(x, y + 9, '', { fontFamily: 'Rowdies, sans-serif', fontSize: '9px', color: '#000000' }).setOrigin(0.5);
    ring.on('pointerdown', () => this.tryRally());
    this.cameras.main.ignore([ring, icon, label]);
    this.rallyParts = { ring, icon, label };
  },

  updateRallyButton() {
    if (!this.rallyParts) return;
    const ready = !this.rallyUsed && this.twistTimeMs >= RALLY_UNLOCK_MS;
    const { ring, icon, label } = this.rallyParts;
    const alpha = this.rallyUsed ? 0.25 : ready ? 1 : 0.45;
    ring.setAlpha(alpha);
    icon.setAlpha(alpha);
    label.setAlpha(alpha);
    if (!this.rallyUsed && !ready) label.setText(`in ${Math.ceil((RALLY_UNLOCK_MS - this.twistTimeMs) / 1000)}s`);
    else label.setText(this.rallyUsed ? 'used' : 'free squad!');
  },

  // Free squad: 3 of the cheapest Formation unit + 1 random Formation unit,
  // ignoring cost and cooldowns. Once per battle.
  tryRally() {
    if (this.rallyUsed || this.isGameOver || this.isPaused || this.twistTimeMs < RALLY_UNLOCK_MS) return;
    const formation = Object.keys(this.unitCooldowns || {}).filter((k) => UNIT_CONFIG[k]);
    if (!formation.length) return;
    this.rallyUsed = true;
    const cheapest = [...formation].sort((a, b) => UNIT_CONFIG[a].cost - UNIT_CONFIG[b].cost)[0];
    const pick = formation[Math.floor(Math.random() * formation.length)];
    const squad = [cheapest, cheapest, cheapest, pick];
    squad.forEach((key, i) => {
      this.time.delayedCall(i * 250, () => {
        if (this.isGameOver) return;
        const savedMoney = this.money;
        const savedCooldown = this.unitCooldowns[key];
        this.money = 1e9;
        this.unitCooldowns[key] = 0;
        this.trySpawnUnit(key, { ignoreLimit: true });
        this.money = savedMoney;
        this.unitCooldowns[key] = savedCooldown;
      });
    });
    playSfxFile('/audio/sfx/power_awaken.wav', { gain: 0.6 });
    this.twistBanner('RALLY! Reinforcements arrive!', '#ffe58a');
  },

  // ---- 5. Weather fronts ----
  updateWeather(deltaMs) {
    if (this.weather) {
      this.weather.ms -= deltaMs;
      if (this.weather.kind === 'sunbeam') this.sunbeamMs = this.weather.ms;
      if (this.weather.ms <= 0) this.endWeather();
      return;
    }
    if (this.twistTimeMs < this.weatherAtMs) return;
    this.weatherAtMs = Infinity;
    const kind = Math.random() < 0.5 ? 'rain' : 'sunbeam';
    const { width, height } = LOGICAL_SIZE;
    const objs = [];
    if (kind === 'rain') {
      this.weatherSpeedMult = 0.75;
      objs.push(this.add.rectangle(width / 2, height / 2, width, height, 0x2c3e6b, 0.18).setDepth(950));
      if (!this.textures.exists('fx_raindrop')) {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xbfe3ff, 0.9).fillRect(0, 0, 2, 12);
        g.generateTexture('fx_raindrop', 2, 12);
        g.destroy();
      }
      const rain = this.add.particles(0, 0, 'fx_raindrop', {
        x: { min: -40, max: width + 40 }, y: -20, speedY: { min: 420, max: 560 }, speedX: -60,
        lifespan: 1400, frequency: 12, quantity: 2, alpha: { start: 0.8, end: 0.3 },
      }).setDepth(951);
      objs.push(rain);
      this.twistBanner('RAIN FRONT — everyone moves slower', '#bfe3ff');
    } else {
      this.sunbeamMs = WEATHER_DURATION_MS;
      objs.push(this.add.rectangle(width / 2, height / 2, width, height, 0xfff1a8, 0.14).setDepth(950).setBlendMode(Phaser.BlendModes.ADD));
      for (let k = 0; k < 4; k++) {
        const beam = this.add.rectangle(width * (0.15 + k * 0.25), height / 2 - 40, 60, height * 1.4, 0xfff6c8, 0.12)
          .setAngle(-18).setDepth(950).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: beam, alpha: 0.03, duration: 1200 + k * 200, yoyo: true, repeat: -1 });
        objs.push(beam);
      }
      this.twistBanner('SUNBEAM — your Axies hit 25% harder!', '#ffe58a');
    }
    this.cameras.main.ignore(objs);
    this.weather = { kind, ms: WEATHER_DURATION_MS, objs };
  },

  endWeather() {
    const { objs } = this.weather;
    this.weather = null;
    this.weatherSpeedMult = 1;
    this.sunbeamMs = 0;
    this.tweens.add({ targets: objs.filter((o) => o.setAlpha), alpha: 0, duration: 600, onComplete: () => objs.forEach((o) => o.destroy()) });
  },

  // Shared top-center announcement (below the boss bar).
  twistBanner(text, color) {
    const { width } = LOGICAL_SIZE;
    const t = this.add
      .text(width / 2, 124, text, { fontFamily: 'Rowdies, sans-serif', fontSize: '18px', color, stroke: '#000000', strokeThickness: 5 })
      .setOrigin(0.5).setDepth(1400).setScale(0.3);
    this.cameras.main.ignore(t);
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
  },
};

export function installBattleTwists(proto) {
  Object.assign(proto, methods);
}
