import Phaser from 'phaser';
import { playSfxFile } from './Audio.js';
import { loadPlayerProgress } from './PlayerProgress.js';
import { getEnergyState } from './Energy.js';
import {
  getSfxVolumeLevel, cycleSfxVolumeLevel,
  getBgmVolumeLevel, cycleBgmVolumeLevel,
  VOLUME_LEVEL_LABELS,
  isMuted, setMuted,
  playMusic,
} from './Audio.js';
import { getUserRank } from './UserRank.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { getMissionsWithStatus } from './Missions.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { loadLoadout } from './Loadout.js';
import { preloadSpriteRoster } from './SpriteIcon.js';
import { EXPEDITION_OPTIONS, getExpeditionStatus, startExpedition, collectExpedition, formatRemaining } from './Expedition.js';
import { BC, FONT, createBcButton, createBcCircleButton, createTitlePill, createResourceBadge, drawWoodFrame, drawBcPanel } from './UITheme.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';

// The bible's §A.10.1 Home/Base Screen — confirmed-from-screenshot layout:
// a top status bar, a center-lower stack of three primary action buttons
// ("Start Battle!!" / "Power Up" / "Character Formation"), and a secondary
// icon row (Menu / Gamatoto / Missions). This is now the game's actual
// first screen — StageSelectScene no longer doubles as the hub.
//
// Gamatoto (an idle side-activity for base-building materials) is shown as
// a real icon matching the confirmed layout, but has no backing system yet
// in this build — deliberately out of scope for this pass (nothing in the
// bible's Phase 1-5 build order requires it), so tapping it just shows a
// "coming soon"-style toast rather than pretending to be a finished
// feature. Missions (quest objectives), previously the same kind of stub,
// now opens a real MissionsScene — see Missions.js/MISSIONS_CONFIG.js.
//
// Visual pass: restyled against the real game's own Cat Base screen
// (screenshot reference) — a wood-plank frame around the whole screen, the
// three primary actions as big beveled gold capsule buttons stacked on the
// left, and a secondary icon row (circular gold buttons) beneath them,
// instead of the previous flat-color rectangles. See UITheme.js.

const PRIMARY_BUTTON_WIDTH = 240;
const PRIMARY_BUTTON_HEIGHT = 52;
const PRIMARY_BUTTON_GAP = 12;

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  preload() {
    preloadBackgrounds(this);
    // Expedition popup's party (first 3 Formation units): stills + run/idle atlases.
    const party = {};
    for (const key of this.getExpeditionParty()) party[key] = UNIT_CONFIG[key];
    preloadSpriteRoster(this, party, true);
  }

  create() {
    this.expeditionObjects = null; // reused scene instance — see other scenes' popup resets
    this.expeditionTimer = null;
    // Every scene's camera is zoomed by RENDER_SCALE so the game's
    // original 800x450-authored layout (LOGICAL_SIZE, see RenderConfig.js)
    // renders onto the real, bigger HD canvas at full pixel density.
    this.cameras.main.setZoom(RENDER_SCALE);
    // Without a camera bounds set (only GameScene has one — its own
    // setBounds happens to clamp scroll to this same point), Phaser's
    // scroll=0 default centers the viewport on world point
    // (viewport-width/2, viewport-height/2) using RAW viewport pixels —
    // i.e. (960, 540) on this 1920x1080 canvas — not on the logical
    // 800x450 layout's own center. centerOn corrects that so world
    // (0,0)-(800,450) actually maps onto the full canvas instead of a
    // small corner of it.
    this.cameras.main.centerOn(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    const { width, height } = LOGICAL_SIZE;

    // Backdrop, dimmed by drawWoodFrame's own semi-transparent interior
    // tint rather than a separate scrim rectangle — that tint already does
    // the "keep bare text/buttons legible over open art" job the scrim
    // used to (a redundant SECOND dark layer just made the backdrop nearly
    // invisible). See Backdrop.js / UITheme.js's own drawWoodFrame comment.
    addBackground(this, 'gauntletArena');
    drawWoodFrame(this, width, height);

    // User-provided theme (replaces the Origins Asset Kit's own
    // PvE/Music/home.wav). playMusic is a no-op if it's already the active
    // track (returning here from any menu screen that doesn't touch music
    // itself, e.g. Saga/Stage Select), so this never restarts the loop
    // mid-phrase just from re-entering Home.
    playMusic('/audio/bgm_forest_theme.mp3');

    createTitlePill(this, 24, 26, 'AXIE BASE');

    this.createStatusBar();
    this.createPrimaryButtons();
    this.createDojoButton();
    this.createSecondaryIcons();

    this.messageText = this.add
      .text(width / 2, height - 26, '', { fontFamily: FONT, fontSize: '13px', color: '#ffdd33', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);
  }

  // Reference layout: the lobby's top-right corner shows ONLY XP — every
  // other stat (a rank-like number, Energy) sits in a secondary row
  // top-LEFT, under the title, and currency (ネコカン) sits bottom-right,
  // clear of everything else. The previous build stacked XP/Energy/Gems/
  // Rank all in one tall right-edge column with two Treasure/Gacha buttons
  // floating beside it — nothing there echoed the reference's actual
  // grouping, which is why it read as "lost."
  createStatusBar() {
    const playerProgress = loadPlayerProgress();
    const { current, cap } = getEnergyState();
    const { width, height } = LOGICAL_SIZE;

    this.xpBadge = createResourceBadge(this, width - 24, 26, 'XP', Math.floor(playerProgress.xp), { valueColor: '#7fe0ff' });
    // Rebuilt (not just re-texted) so the pill resizes with the new value.
    this.refreshXpBadge = () => {
      this.xpBadge?.destroy();
      this.xpBadge = createResourceBadge(this, width - 24, 26, 'XP', Math.floor(loadPlayerProgress().xp), { valueColor: '#7fe0ff' });
    };

    // Secondary status row, top-left under the title — mirrors the
    // reference's own "(i) 2502 [calendar]" cluster position. Both badges
    // are right-anchored (content grows LEFTWARD from their x), so a fixed
    // x gap between them could get closed up by a long value string (a
    // high Rank number, a raised Energy cap) — measure each one's actual
    // rendered width instead and place Energy exactly BADGE_GAP to the
    // right of wherever Rank's own content actually ends.
    const STATUS_ROW_LEFT = 40;
    const BADGE_GAP = 20;
    const rankBadge = createResourceBadge(this, 0, 66, 'RANK', getUserRank(), { valueColor: '#e2b8ff', fontSize: 16 });
    rankBadge.setPosition(STATUS_ROW_LEFT + rankBadge.bcWidth - 12, 66);

    const energyBadge = createResourceBadge(this, 0, 66, 'ENERGY', `${current}/${cap}`, { valueColor: '#8fffb0', fontSize: 16 });
    const energyLeftEdge = STATUS_ROW_LEFT + rankBadge.bcWidth + BADGE_GAP;
    energyBadge.setPosition(energyLeftEdge + energyBadge.bcWidth - 12, 66);

    // Currency, bottom-right corner — mirrors the reference's ネコカン
    // position, clear of the icon row (and its under-labels) beneath it.
    createResourceBadge(this, width - 24, height - 110, 'GEM', playerProgress.gems, { valueColor: '#ffd27f' });
  }

  createPrimaryButtons() {
    const { height } = LOGICAL_SIZE;
    const centerX = 150;
    const startY = height / 2 - PRIMARY_BUTTON_HEIGHT - PRIMARY_BUTTON_GAP;

    const buttons = [
      // Saga expansion (bible §A.6.1): Start Battle now opens the saga
      // picker first — StageSelectScene itself moved one level deeper in
      // the nav hierarchy (Home -> Sagas -> Stages -> Battle).
      { label: 'Start Battle!!', scene: 'SagaSelectScene' },
      { label: 'Power Up', scene: 'UpgradeScene' },
      { label: 'Character Formation', scene: 'LoadoutScene' },
    ];

    buttons.forEach((button, index) => {
      const y = startY + index * (PRIMARY_BUTTON_HEIGHT + PRIMARY_BUTTON_GAP);
      createBcButton(this, centerX, y, PRIMARY_BUTTON_WIDTH, PRIMARY_BUTTON_HEIGHT, button.label, () => {
        this.scene.start(button.scene);
      }, { fontSize: 17 });
    });
  }

  // Sparring Grounds (bible §A.6.4's Catclaw Dojo) — a free, timed,
  // score-attack mode. No Energy cost, so it launches GameScene directly,
  // skipping StageSelectScene's energy gate entirely (matching the bible's
  // "free-play" framing).
  createDojoButton() {
    const { height } = LOGICAL_SIZE;
    const x = 150;
    // Sits in the gap between the primary-button stack's bottom edge and
    // the secondary-icon row's top edge — computed from the same layout
    // constants createPrimaryButtons/createSecondaryIcons use, so it never
    // collides with either regardless of future tweaks to those.
    const lastPrimaryButtonY =
      height / 2 - PRIMARY_BUTTON_HEIGHT - PRIMARY_BUTTON_GAP + 2 * (PRIMARY_BUTTON_HEIGHT + PRIMARY_BUTTON_GAP);
    const stackBottom = lastPrimaryButtonY + PRIMARY_BUTTON_HEIGHT / 2;
    const iconRowTop = height - 70 - 26;
    const y = (stackBottom + iconRowTop) / 2;

    createBcButton(this, x, y, 200, 34, 'Sparring Grounds', () => {
      this.scene.start('GameScene', { mode: 'dojo' });
    }, { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 });
  }

  // Two clusters on the same row (reference: the hub-feature icons sit
  // left, under the primary buttons; Gacha/storage sit right, in their own
  // group) — rather than Gacha/Treasure floating as isolated buttons with
  // no visual relationship to anything else on the screen.
  createSecondaryIcons() {
    const { height } = LOGICAL_SIZE;
    const y = height - 62;
    // Menu/Excavation/Missions centered on x=150 (80px spacing either side)
    // to match createPrimaryButtons' own centerX — was 110/190/270, whose
    // own midpoint (190) didn't line up with the button stack above it.
    const icons = [
      { label: 'Menu', x: 70, glyph: '☰', action: () => this.showMenuPopup() },
      { label: 'Expedition', x: 150, glyph: '⛏', action: () => this.showExpeditionPopup() },
      { label: 'Missions', x: 230, glyph: '📋', action: () => this.scene.start('MissionsScene') },
      { label: 'Gacha', x: 560, glyph: '🎰', action: () => this.scene.start('GachaScene') },
      { label: 'Treasure', x: 650, glyph: '🏆', action: () => this.scene.start('TreasureScene') },
    ];

    // "!" badge on Expedition when a trip is ready to collect.
    this.expeditionBadge = this.add
      .text(150 + 20, y - 24, '!', { fontFamily: FONT, fontSize: '14px', color: '#ffffff', backgroundColor: '#e53935', padding: { x: 5, y: 1 } })
      .setOrigin(0.5).setDepth(10);
    this.refreshExpeditionBadge = () => this.expeditionBadge?.setVisible(getExpeditionStatus().state === 'ready');
    this.refreshExpeditionBadge();
    this.time.addEvent({ delay: 5000, loop: true, callback: () => this.refreshExpeditionBadge() });

    icons.forEach((icon) => {
      createBcCircleButton(this, icon.x, y, 28, icon.glyph, () => icon.action());
      this.add
        .text(icon.x, y + 38, icon.label, { fontFamily: FONT, fontSize: '11px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 })
        .setOrigin(0.5);

      // A small red badge on Missions when at least one is complete and
      // still unclaimed — the same "something's waiting for you" nudge
      // Battle Cats uses on its own Missions icon.
      if (icon.label === 'Missions') {
        const claimable = getMissionsWithStatus().filter((m) => m.isComplete && !m.isClaimed).length;
        if (claimable > 0) {
          this.add.circle(icon.x + 20, y - 20, 11, BC.red).setStrokeStyle(3, 0xffffff);
          this.add
            .text(icon.x + 20, y - 20, String(claimable), { fontFamily: FONT, fontSize: '11px', color: '#ffffff' })
            .setOrigin(0.5);
        }
      }
    });
  }

  // Battle Cats reference: tapping Menu opens a small popup offering the
  // にゃんこ図鑑/敵キャラ図鑑 guides (here: Unit Guide/Enemy Guide, both backed
  // by CatalogScene) — a scaled-down version of the reference's own Menu
  // popup (cream panel, gold close button, gold guide tiles), which also
  // has several buttons (Treasure List, Cat Medals, Cat Club, Help) this
  // build has no equivalent system for yet.
  // Expedition (Expedition.js). Three states, each its own little scene
  // inside the popup: idle (pick a trip), away (your party runs along a
  // scrolling trail with a progress bar), ready (party waits beside a
  // bouncing treasure chest that bursts open on Collect). The per-second
  // tick only updates the countdown/progress; the animated stage is
  // rebuilt only when the state changes.
  getExpeditionParty() {
    const party = loadLoadout().filter((key) => key && UNIT_CONFIG[key]).slice(0, 3);
    return party.length ? party : ['basic'];
  }

  showExpeditionPopup() {
    if (this.expeditionObjects) return;
    const { width, height } = LOGICAL_SIZE;
    const objects = [];
    this.expeditionObjects = objects;
    const close = () => {
      this.expeditionTimer?.remove();
      this.expeditionTimer = null;
      stageObjs.forEach((o) => o.destroy());
      objects.forEach((o) => o.destroy());
      this.expeditionObjects = null;
      this.refreshExpeditionBadge?.();
    };
    const cx = width / 2;
    const cy = height / 2;
    const panelW = 470;
    const panelH = 300;
    objects.push(this.add.rectangle(cx, cy, width, height, 0x000000, 0.6).setInteractive());
    objects.push(drawBcPanel(this, cx, cy, panelW, panelH));
    objects.push(this.add.text(cx, cy - panelH / 2 + 22, '⛏  Expedition', { fontFamily: FONT, fontSize: '18px', color: BC.inkHex }).setOrigin(0.5));
    objects.push(createBcCircleButton(this, cx + panelW / 2 - 8, cy - panelH / 2 - 8, 16, '✕', close, { fill: BC.gold }));

    // Trail "window" — the animated stage for every state.
    const stripW = panelW - 40;
    const stripH = 118;
    const stripY = cy - 40;
    const stripLeft = cx - stripW / 2;
    const stageObjs = [];
    const party = this.getExpeditionParty();
    let lastState = null;
    let countdownText = null;
    let progressFill = null;

    const addStage = (o) => { stageObjs.push(o); return o; };
    const clearStage = () => { stageObjs.forEach((o) => { this.tweens.killTweensOf(o); o.destroy(); }); stageObjs.length = 0; };

    // Masked sky + ground so scrolling props never spill outside the window.
    const maskShape = this.make.graphics({ add: false });
    maskShape.fillStyle(0xffffff).fillRoundedRect(stripLeft, stripY - stripH / 2, stripW, stripH, 10);
    const mask = maskShape.createGeometryMask();
    objects.push({ destroy: () => maskShape.destroy() });

    const drawBackdrop = (night) => {
      addStage(this.add.rectangle(cx, stripY - 14, stripW, stripH - 28, night ? 0x2c3e6b : 0x9ad7f5)).setMask(mask);
      addStage(this.add.rectangle(cx, stripY + stripH / 2 - 14, stripW, 28, 0x7cb342)).setMask(mask);
      addStage(this.add.rectangle(cx, stripY + stripH / 2 - 27, stripW, 3, 0x558b2f)).setMask(mask);
      const frame = addStage(this.add.graphics());
      frame.lineStyle(3, BC.ink, 1).strokeRoundedRect(stripLeft, stripY - stripH / 2, stripW, stripH, 10);
    };

    // Party sprite cycling an atlas sequence (run/idleanim) at 24fps;
    // falls back to the still idle pose if the atlas isn't cached yet.
    const addPartyMember = (key, x, field, size) => {
      const atlasKey = `unit_${key}_${field}`;
      const hasAtlas = this.textures.exists(atlasKey);
      const img = hasAtlas ? this.add.image(x, 0, atlasKey, '0') : this.add.image(x, 0, `unit_${key}_idle`, '__BASE');
      img.setFlipX(true).setMask(mask);
      const base = this.textures.exists(`unit_${key}_idle`) ? this.textures.get(`unit_${key}_idle`).getSourceImage() : img;
      img.setScale(size / Math.max(base.width, base.height));
      img.setY(stripY + stripH / 2 - 26 - img.displayHeight * 0.45);
      addStage(img);
      if (hasAtlas) {
        const frames = this.textures.get(atlasKey).getFrameNames().sort((a, b) => a - b);
        let f = Math.floor(Math.random() * frames.length);
        const ev = this.time.addEvent({ delay: 1000 / 24, loop: true, callback: () => { f = (f + 1) % frames.length; if (img.active) img.setFrame(frames[f]); } });
        addStage({ destroy: () => ev.remove() });
      }
      return img;
    };

    const buildStage = (state) => {
      clearStage();
      countdownText = null;
      progressFill = null;
      if (state === 'idle') {
        drawBackdrop(false);
        party.forEach((key, i) => {
          const m = addPartyMember(key, cx - 60 + i * 60, 'idleanim', 56);
          this.tweens.add({ targets: m, y: m.y - 3, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        });
        addStage(this.add.text(cx, stripY - stripH / 2 + 16, 'Your party is ready to explore Lunacia!', { fontFamily: FONT, fontSize: '12px', color: '#1d1a16' }).setOrigin(0.5));
        EXPEDITION_OPTIONS.forEach((opt, i) => {
          const bx = cx + (i - 1) * 146;
          const label = `${opt.label}\n+${opt.xp.toLocaleString()} XP${opt.bonusChance >= 1 ? '\n+ bonus item' : `\n${Math.round(opt.bonusChance * 100)}% bonus`}`;
          addStage(createBcButton(this, bx, cy + 82, 132, 72, label, () => {
            if (!startExpedition(opt.id)) return;
            playSfxFile('/audio/sfx/summon_on.wav', { gain: 0.5 });
            refresh(true);
          }, { fontSize: 12 }));
        });
      } else if (state === 'away') {
        drawBackdrop(false);
        // Scrolling props: clouds above, bushes/rocks on the ground.
        const scroller = (y, w, h, color, dur, count) => {
          for (let k = 0; k < count; k++) {
            const startX = stripLeft + (stripW / count) * k + Math.random() * 30;
            const o = addStage(this.add.ellipse(startX, y, w, h, color)).setMask(mask);
            const travel = startX - (stripLeft - w);
            this.tweens.add({
              targets: o, x: stripLeft - w, duration: dur * (travel / (stripW + w)), onComplete: () => {
                o.x = stripLeft + stripW + w;
                this.tweens.add({ targets: o, x: stripLeft - w, duration: dur, repeat: -1 });
              },
            });
          }
        };
        scroller(stripY - 34, 54, 18, 0xffffff, 9000, 3);
        scroller(stripY + stripH / 2 - 30, 26, 14, 0x4e8a2a, 2600, 5);
        scroller(stripY + stripH / 2 - 8, 10, 6, 0x8d6e63, 1800, 7);
        party.forEach((key, i) => {
          const m = addPartyMember(key, cx + 40 - i * 52, 'run', 52);
          this.tweens.add({ targets: m, y: m.y - 4, duration: 220 + i * 30, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        });
        countdownText = addStage(this.add.text(cx, cy + 50, '', { fontFamily: FONT, fontSize: '20px', color: '#2a7ab0' }).setOrigin(0.5));
        addStage(this.add.rectangle(cx, cy + 80, 300, 14, 0x000000, 0.25).setStrokeStyle(2, BC.ink));
        progressFill = addStage(this.add.rectangle(cx - 148, cy + 80, 0, 10, 0xffc93c).setOrigin(0, 0.5));
        addStage(this.add.text(cx, cy + 108, 'Keeps going while you play or close the game.', { fontFamily: FONT, fontSize: '10px', color: '#7a5c1e' }).setOrigin(0.5));
      } else {
        drawBackdrop(true);
        for (let k = 0; k < 14; k++) {
          const star = addStage(this.add.circle(stripLeft + 10 + Math.random() * (stripW - 20), stripY - stripH / 2 + 8 + Math.random() * 40, 1.5, 0xffffff)).setMask(mask);
          this.tweens.add({ targets: star, alpha: 0.2, duration: 600 + Math.random() * 900, yoyo: true, repeat: -1 });
        }
        party.forEach((key, i) => addPartyMember(key, cx - 120 + i * 50, 'idleanim', 52));
        // Treasure chest (drawn, no art needed): body + lid that pops open.
        const chestX = cx + 110;
        const groundY = stripY + stripH / 2 - 28;
        const body = addStage(this.add.rectangle(chestX, groundY - 14, 56, 30, 0x8d5524).setStrokeStyle(3, 0x3e2310));
        const band = addStage(this.add.rectangle(chestX, groundY - 14, 56, 6, 0xffc93c));
        const lid = addStage(this.add.rectangle(chestX, groundY - 33, 60, 14, 0xa0652d).setStrokeStyle(3, 0x3e2310));
        const glow = addStage(this.add.circle(chestX, groundY - 20, 42, 0xfff3a0, 0.25));
        this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.08, duration: 800, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: [body, band, lid], y: '-=6', duration: 380, yoyo: true, repeat: -1, ease: 'Quad.out' });
        addStage(this.add.text(cx, stripY - stripH / 2 + 16, 'Your party is back with loot!', { fontFamily: FONT, fontSize: '12px', color: '#ffffff' }).setOrigin(0.5));
        addStage(createBcButton(this, cx, cy + 82, 170, 54, 'Collect!', () => {
          const lines = collectExpedition();
          if (!lines) return;
          playSfxFile('/audio/sfx/buff.wav', { gain: 0.6 });
          this.refreshXpBadge?.();
          this.tweens.killTweensOf([body, band, lid]);
          this.tweens.add({ targets: lid, y: lid.y - 26, angle: -35, duration: 260, ease: 'Back.out' });
          for (let k = 0; k < 18; k++) {
            const sp = this.add.circle(chestX, groundY - 26, 3, [0xffd54f, 0xffffff, 0x81d4fa][k % 3]).setDepth(5000);
            const ang = Phaser.Math.DegToRad(-160 + Math.random() * 140);
            const dist = 50 + Math.random() * 70;
            this.tweens.add({ targets: sp, x: chestX + Math.cos(ang) * dist, y: groundY - 26 + Math.sin(ang) * dist, alpha: 0, duration: 700, ease: 'Cubic.out', onComplete: () => sp.destroy() });
          }
          const msg = this.add.text(cx, cy + 40, lines.join('   '), { fontFamily: FONT, fontSize: '16px', color: '#e8a400', stroke: '#ffffff', strokeThickness: 4 }).setOrigin(0.5).setScale(0).setDepth(5000);
          objects.push(msg);
          this.tweens.add({ targets: msg, scale: 1, duration: 280, ease: 'Back.out' });
          this.time.delayedCall(1600, () => { if (this.expeditionObjects === objects) refresh(true); });
        }, { fontSize: 16 }));
      }
      objects.push(...stageObjs.filter((o) => o.setDepth)); // keep popup objects above the hub
    };

    const refresh = (force = false) => {
      const status = getExpeditionStatus();
      if (force || status.state !== lastState) {
        lastState = status.state;
        buildStage(status.state);
      }
      if (status.state === 'away' && countdownText) {
        countdownText.setText(`${status.option.label} trip — back in ${formatRemaining(status.remainingMs)}`);
        const frac = 1 - status.remainingMs / status.option.durationMs;
        progressFill.width = 296 * Phaser.Math.Clamp(frac, 0, 1);
      }
    };
    refresh(true);
    this.expeditionTimer = this.time.addEvent({ delay: 1000, loop: true, callback: () => refresh() });
  }

  showMenuPopup() {
    const { width, height } = LOGICAL_SIZE;
    const objects = [];

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setInteractive();
    objects.push(overlay);

    const panelWidth = 300;
    const panelHeight = 250;
    const panel = drawBcPanel(this, width / 2, height / 2, panelWidth, panelHeight);
    objects.push(panel);

    objects.push(
      this.add
        .text(width / 2, height / 2 - panelHeight / 2 + 24, 'Menu', { fontFamily: FONT, fontSize: '18px', color: BC.inkHex })
        .setOrigin(0.5),
    );

    const closeButton = createBcCircleButton(this, width / 2 + panelWidth / 2 - 8, height / 2 - panelHeight / 2 - 8, 16, '✕', () => closePopup(), {
      fill: BC.gold,
    });
    objects.push(closeButton);

    const guideButtons = [
      { label: 'Unit Guide', rosterType: 'units' },
      { label: 'Enemy Guide', rosterType: 'enemies' },
    ];
    guideButtons.forEach((guide, index) => {
      const bx = width / 2 + (index === 0 ? -76 : 76);
      const by = height / 2 - 6;
      const btn = createBcButton(this, bx, by, 130, 74, guide.label, () => {
        this.scene.start('CatalogScene', { rosterType: guide.rosterType });
      }, { fontSize: 13 });
      objects.push(btn);
    });

    // Settings (SFX/BGM volume) — moved in here from its own standalone
    // bottom-left icon per the user's own call, same "Menu -> Settings"
    // structure the reference game itself uses rather than a floating
    // audio toggle loose on the hub screen.
    objects.push(
      createBcButton(this, width / 2, height / 2 + 74, 268, 40, 'Settings', () => {
        closePopup();
        this.showSettingsPopup();
      }, { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 14 }),
    );

    const closePopup = () => objects.forEach((obj) => obj.destroy());
    overlay.on('pointerdown', closePopup);
  }

  // Same SFX/BGM volume controls as GameScene's/TitleScene's own Options
  // popup, PLUS the master Mute toggle that used to be its own standalone
  // bottom-left icon (see showMenuPopup) — that button was removed outright
  // when this moved into Menu -> Settings without anywhere else picking up
  // its job, which left a muted save with no way to ever un-mute again
  // (a real regression, caught from the user asking "why is no sound
  // playing" — isMuted overrides the volume levels below regardless of
  // what they're set to, so losing access to it meant losing all audio).
  showSettingsPopup() {
    const { width, height } = LOGICAL_SIZE;
    const objects = [];
    const panelY = height / 2;

    objects.push(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setInteractive());
    objects.push(drawBcPanel(this, width / 2, panelY, 320, 210));
    objects.push(this.add.text(width / 2, panelY - 80, 'Settings', { fontFamily: FONT, fontSize: '18px', color: BC.inkHex }).setOrigin(0.5));
    objects.push(createBcCircleButton(this, width / 2 + 145, panelY - 85, 14, '✕', () => closePopup(), { fill: BC.gold }));

    objects.push(
      this.add.text(width / 2 - 120, panelY - 40, 'Mute All', { fontFamily: FONT, fontSize: '14px', color: BC.inkHex }).setOrigin(0, 0.5),
    );
    const muteButton = createBcButton(
      this, width / 2 + 90, panelY - 40, 100, 32, isMuted() ? 'On' : 'Off',
      () => {
        const muted = !isMuted();
        setMuted(muted);
        muteButton.bcText.setText(muted ? 'On' : 'Off');
      },
      { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 },
    );
    objects.push(muteButton);

    objects.push(
      this.add.text(width / 2 - 120, panelY, 'SFX Volume', { fontFamily: FONT, fontSize: '14px', color: BC.inkHex }).setOrigin(0, 0.5),
    );
    const sfxButton = createBcButton(
      this, width / 2 + 90, panelY, 100, 32, VOLUME_LEVEL_LABELS[getSfxVolumeLevel()],
      () => sfxButton.bcText.setText(VOLUME_LEVEL_LABELS[cycleSfxVolumeLevel()]),
      { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 },
    );
    objects.push(sfxButton);

    objects.push(
      this.add.text(width / 2 - 120, panelY + 40, 'BGM Volume', { fontFamily: FONT, fontSize: '14px', color: BC.inkHex }).setOrigin(0, 0.5),
    );
    const bgmButton = createBcButton(
      this, width / 2 + 90, panelY + 40, 100, 32, VOLUME_LEVEL_LABELS[getBgmVolumeLevel()],
      () => bgmButton.bcText.setText(VOLUME_LEVEL_LABELS[cycleBgmVolumeLevel()]),
      { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 13 },
    );
    objects.push(bgmButton);

    const closePopup = () => objects.forEach((obj) => obj.destroy());
  }

  showComingSoon(label) {
    const msg = `${label}: coming soon!`;
    this.messageText.setText(msg);
    this.time.delayedCall(1500, () => {
      if (this.messageText.text === msg) this.messageText.setText('');
    });
  }
}
