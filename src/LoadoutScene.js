import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { preloadSpriteRoster, addUnitIcon } from './SpriteIcon.js';
import { PROGRESSION_CONFIG } from './PROGRESSION_CONFIG.js';
import { getUnitProgress, loadPlayerProgress, isUnitUnlocked } from './PlayerProgress.js';
import { hasReachedPartEvolution } from './PartEvolution.js';
import {
  loadLoadout,
  saveLoadout,
  MAX_LOADOUT_SIZE,
  FORMATION_SLOT_COUNT,
  loadFormationsData,
  setActiveFormationSlot,
  isPinned,
  togglePinned,
  autoEquipActiveSlot,
} from './Loadout.js';
import { getActiveCombos } from './Combo.js';
import { describeUnit } from './UnitDescription.js';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, drawWoodFrame } from './UITheme.js';

// The bible's §A.10.3 Pre-Battle Loadout ("Equip") Screen — a standalone
// "manage my formation" screen reachable from the Home screen, rather than
// an extra confirm-step wedged between Stage Select and every single
// battle. GameScene reads whatever's saved here (see Loadout.js) directly.

const CARD_WIDTH = 130;
const CARD_HEIGHT = 100;
const CARD_GAP = 12;
const CARDS_PER_ROW = 5;
const ROW_GAP = 118;

export default class LoadoutScene extends Phaser.Scene {
  constructor() {
    super('LoadoutScene');
  }

  // Same roster art GameScene battles use (see SpriteIcon.js) — loaded
  // here too since a player can reach this screen without ever having
  // started GameScene yet, and Phaser's texture cache is per-load, not
  // pre-populated just because another scene also uses the same keys.
  preload() {
    preloadSpriteRoster(this, UNIT_CONFIG, true);
    preloadBackgrounds(this);
  }

  create() {
    const { width, height } = this.scale;

    addBackground(this, 'mech');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);
    drawWoodFrame(this, width, height);

    createTitlePill(this, 24, 22, 'Character Formation');
    createBackButton(this, () => this.scene.start('HomeScene'));

    this.add
      .text(width / 2, 60, `Tap a unit to include/exclude — max ${MAX_LOADOUT_SIZE} in Formation`, {
        fontFamily: FONT, fontSize: '10px',
        color: '#ffffff',
        stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.selected = new Set(loadLoadout());
    this.cardContainer = this.add.container(0, 0);
    this.slotTabContainer = this.add.container(0, 0);

    // Squad Synergy (bible §A.7.3's Cat Combo) — this mechanic otherwise
    // applies completely silently in battle (a starting-money/attack/crit
    // bonus with no on-screen label anywhere), so this is the one place a
    // player can actually see which synergies their current Formation has
    // activated and why.
    this.add
      .text(width / 2, 350, 'Active Squad Synergies:', { fontFamily: FONT, fontSize: '13px', color: '#ffcf6b', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);
    this.synergyText = this.add
      .text(width / 2, 370, '', { fontFamily: FONT, fontSize: '12px', color: '#ffffff', align: 'center', wordWrap: { width: width - 40 }, stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);

    this.messageText = this.add
      .text(width / 2, 394, '', { fontFamily: FONT, fontSize: '12px', color: '#ff8a80', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);

    // Formation cost summary (bible §A.10.3: "show... a running total-cost/
    // summary indicator for the loadout as a whole") — the sum of every
    // selected unit's plain UNIT_CONFIG cost (never the leveled/evolved
    // effective cost, since cost itself never scales with level anyway —
    // see UNIT_CONFIG.js).
    this.totalCostText = this.add
      .text(width / 2, 418, '', { fontFamily: FONT, fontSize: '12px', color: '#7fe0ff', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5);

    this.createTooltip();
    this.renderSlotTabs();
    this.renderCards();
    this.refreshSynergies();
    this.refreshTotalCost();
  }

  // Hover-to-inspect (bible/Battle Cats reference: long-press or hover a
  // unit to see its abilities and elemental matchups) — one shared
  // tooltip reused across every card rather than one per card, created
  // once here (outside cardContainer, which renderCards() wipes and
  // rebuilds on every selection change) and repositioned/shown on demand.
  createTooltip() {
    this.tooltipContainer = this.add.container(0, 0).setDepth(1000).setVisible(false);
    this.tooltipBg = this.add.rectangle(0, 0, 200, 40, 0x000000, 0.92).setStrokeStyle(2, BC.gold);
    this.tooltipText = this.add
      .text(0, 0, '', {
        fontFamily: FONT, fontSize: '10px',
        color: '#ffffff',
        align: 'left',
        wordWrap: { width: 220 },
        lineSpacing: 5,
      })
      .setOrigin(0.5);
    this.tooltipContainer.add([this.tooltipBg, this.tooltipText]);
  }

  // `isTopRow` flips the tooltip to sit below (top-row cards) or above
  // (bottom-row cards) the hovered card, so it never runs off the canvas
  // top/bottom edge; horizontal position is separately clamped to stay
  // inside the canvas' left/right edges too.
  showTooltip(type, x, y, isTopRow) {
    const lines = describeUnit(UNIT_CONFIG[type]);
    this.tooltipText.setText(lines.map((line) => `• ${line}`).join('\n'));

    const padding = 10;
    const bounds = this.tooltipText.getBounds();
    this.tooltipBg.setSize(bounds.width + padding * 2, bounds.height + padding * 2);

    const tooltipY = isTopRow
      ? y + CARD_HEIGHT / 2 + this.tooltipBg.height / 2 + 8
      : y - CARD_HEIGHT / 2 - this.tooltipBg.height / 2 - 8;
    const clampedX = Phaser.Math.Clamp(x, this.tooltipBg.width / 2 + 6, this.scale.width - this.tooltipBg.width / 2 - 6);

    this.tooltipContainer.setPosition(clampedX, tooltipY);
    this.tooltipContainer.setVisible(true);
  }

  hideTooltip() {
    this.tooltipContainer.setVisible(false);
  }

  // Multiple saved Formation slots + Auto-Equip (bible §A.10.3) — one row
  // of slot tabs (switch which Formation you're editing/using) plus a
  // dedicated Auto-Equip button, both above the unit grid.
  renderSlotTabs() {
    this.slotTabContainer.removeAll(true);

    const { width } = this.scale;
    const data = loadFormationsData();
    const tabWidth = 90;
    const autoEquipWidth = 110;
    const gap = 8;
    const totalWidth = FORMATION_SLOT_COUNT * tabWidth + autoEquipWidth + (FORMATION_SLOT_COUNT) * gap;
    const startX = width / 2 - totalWidth / 2 + tabWidth / 2;
    const y = 84;

    const objects = [];

    data.slots.forEach((slot, index) => {
      const x = startX + index * (tabWidth + gap);
      const isActive = index === data.activeSlot;
      const tab = createBcButton(this, x, y, tabWidth, 26, slot.name, () => {
        setActiveFormationSlot(index);
        this.selected = new Set(loadLoadout());
        this.renderSlotTabs();
        this.renderCards();
        this.refreshSynergies();
        this.refreshTotalCost();
      }, isActive
        ? { fontSize: 11 }
        : { fill: 0x8a8a8a, highlight: 0xbbbbbb, textColor: '#ffffff', fontSize: 11 });
      objects.push(tab);
    });

    const autoEquipX = startX + FORMATION_SLOT_COUNT * (tabWidth + gap) + autoEquipWidth / 2 - tabWidth / 2;
    const autoEquipButton = createBcButton(this, autoEquipX, y, autoEquipWidth, 26, 'Auto-Equip', () => {
      this.selected = new Set(autoEquipActiveSlot());
      this.renderCards();
      this.refreshSynergies();
      this.refreshTotalCost();
      this.showMessage('Auto-Equipped your highest-level units!');
    }, { fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a', fontSize: 11 });
    objects.push(autoEquipButton);

    this.slotTabContainer.add(objects);
  }

  refreshSynergies() {
    const activeCombos = getActiveCombos([...this.selected]);
    this.synergyText.setText(activeCombos.length > 0 ? activeCombos.map((combo) => combo.name).join('   •   ') : 'None');
  }

  refreshTotalCost() {
    const totalCost = [...this.selected].reduce((sum, key) => sum + UNIT_CONFIG[key].cost, 0);
    this.totalCostText.setText(`Formation total cost: ${totalCost.toLocaleString()}円`);
  }

  renderCards() {
    this.cardContainer.removeAll(true);
    this.hideTooltip(); // a rebuild destroys whatever card the pointer was over

    // Roster expansion (bible §A.4.1): the full owned roster no longer fits
    // in one row, so it wraps into rows of CARDS_PER_ROW — this is just a
    // browse/select grid (unlike GameScene's in-battle deploy bar, it
    // doesn't need to fit in one un-scrolled strip).
    const keys = Object.keys(UNIT_CONFIG);
    const rowWidth = Math.min(keys.length, CARDS_PER_ROW) * CARD_WIDTH + (Math.min(keys.length, CARDS_PER_ROW) - 1) * CARD_GAP;
    const startX = (this.scale.width - rowWidth) / 2 + CARD_WIDTH / 2;
    const startY = 162;

    keys.forEach((key, index) => {
      const row = Math.floor(index / CARDS_PER_ROW);
      const col = index % CARDS_PER_ROW;
      const x = startX + col * (CARD_WIDTH + CARD_GAP);
      const y = startY + row * ROW_GAP;
      this.renderCard(key, x, y, row === 0);
    });
  }

  renderCard(type, x, y, isTopRow) {
    const config = UNIT_CONFIG[type];
    const meta = PROGRESSION_CONFIG[type];
    const unitProgress = getUnitProgress(loadPlayerProgress(), type);
    const isSelected = this.selected.has(type);
    const pinned = isPinned(type);
    // Roster gating (bible-guide progression pass — see PlayerProgress's
    // isUnitUnlocked/UNIT_CONFIG's unlockRequirement): a lineage not yet
    // unlocked still shows on this screen (so its eventual unlock reads as
    // real progress), just greyed and unselectable, same idea as a locked
    // stage on StageSelectScene.
    const unlocked = isUnitUnlocked(type);

    // White card + black outline (real deploy-icon framing, matching
    // GameScene's own spawn buttons — see UITheme.js/SpriteIcon.js), with a
    // gold ring instead of a colored fill to show "in Formation" — locked/
    // benched units dim via a semi-transparent grey overlay drawn on top
    // rather than recoloring the base card, so the white/black-outline look
    // stays consistent across every state.
    const g = this.add.graphics();
    g.fillStyle(BC.ink, 0.2);
    g.fillRoundedRect(x - CARD_WIDTH / 2 + 2, y - CARD_HEIGHT / 2 + 3, CARD_WIDTH, CARD_HEIGHT, 10);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
    g.lineStyle(isSelected && unlocked ? 4 : 2, isSelected && unlocked ? BC.gold : BC.ink, 1);
    g.strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);

    // Character name first (e.g. "Buba") — this screen is about browsing/
    // picking specific characters, not selecting a role mid-battle, so the
    // real name leads.
    const label = this.add
      .text(x, y - CARD_HEIGHT / 2 + 9, config.characterName, {
        fontFamily: FONT, fontSize: '13px',
        color: BC.inkHex,
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 8 },
      })
      .setOrigin(0.5);

    // Portrait icon, squeezed between the name and the level/role text —
    // see SpriteIcon.js. useEvolved matches UpgradeScene/GameScene's own
    // hasReachedPartEvolution check — this screen was showing every unit's
    // pre-evolution look even past level 10, out of sync with both of them.
    // faceZoom matches GameScene's own spawn-button portraits (a tight face
    // closeup, not the whole body) for the same "tell units apart at a
    // glance" reason — traded off against the idle-float animation the
    // previous version used, since SpriteIcon.js's faceZoom crop only
    // applies to the plain static idle pose.
    const isEvolved = hasReachedPartEvolution(unitProgress.level);
    const icon = addUnitIcon(this, x, y - 1, config, CARD_HEIGHT - 46, true, isEvolved, false, true);

    // Selected/benched state reads fine from the card's own dimming
    // (setAlpha below) — an explicit "IN FORMATION"/"benched" label was
    // redundant, so it's gone; the ability tag takes that slot instead,
    // below the level for easier reading. See UNIT_CONFIG.js's own field
    // reference: abilityLabel (not displayName, the real Battle Cats
    // lineage name) is what pairs with the character name up top.
    const levelLabel = this.add
      .text(x, y + CARD_HEIGHT / 2 - 22, unlocked ? `Lv ${unitProgress.level}` : 'Locked', { fontFamily: FONT, fontSize: '11px', color: BC.inkHex })
      .setOrigin(0.5);
    const roleLabel = this.add
      .text(x, y + CARD_HEIGHT / 2 - 9, `(${config.abilityLabel})`, {
        fontFamily: FONT, fontSize: '9px',
        color: '#5a5a5a',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 8 },
      })
      .setOrigin(0.5);

    const dimOverlay = this.add
      .rectangle(x, y, CARD_WIDTH - 4, CARD_HEIGHT - 4, 0x1a1a1a, unlocked ? (isSelected ? 0 : 0.55) : 0.75);
    if (icon) icon.setAlpha(unlocked ? 1 : 0.6);

    // Pin (bible §A.10.3) — its own small badge in the card's corner, with
    // its own independent hit area; stopPropagation keeps a pin tap from
    // also toggling the card's Formation membership underneath it.
    const pinBadge = this.add
      .circle(x + CARD_WIDTH / 2 - 14, y - CARD_HEIGHT / 2 + 14, 10, pinned ? BC.gold : 0x000000, pinned ? 1 : 0.4)
      .setStrokeStyle(2, BC.ink)
      .setInteractive({ useHandCursor: true });
    const pinLabel = this.add
      .text(x + CARD_WIDTH / 2 - 14, y - CARD_HEIGHT / 2 + 14, '📌', { fontFamily: FONT, fontSize: '10px' })
      .setOrigin(0.5);

    pinBadge.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      togglePinned(type);
      this.renderCards();
    });

    const hit = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.toggleUnit(type));
    hit.on('pointerover', () => this.showTooltip(type, x, y, isTopRow));
    hit.on('pointerout', () => this.hideTooltip());

    const objects = [g, label, levelLabel, roleLabel, dimOverlay, hit, pinBadge, pinLabel];
    if (icon) objects.splice(2, 0, icon); // between the name and the level/role text, in front of the card
    this.cardContainer.add(objects);
  }

  // Names exactly which stage clear unlocks a still-locked lineage (see
  // UNIT_CONFIG.js's unlockRequirement/PlayerProgress.isUnitUnlocked) —
  // "Not unlocked yet!" alone left the player with no idea how far off it
  // was. Guardian/Xia's requirement is permanently unsatisfiable
  // (stageId: null — see UNIT_CONFIG.js's own shelving note), so it gets
  // its own message rather than naming a stage that doesn't actually grant it.
  describeLockedUnit(type) {
    const requirement = UNIT_CONFIG[type]?.unlockRequirement;
    const stage = requirement?.stageId && STAGE_CONFIG.find((s) => s.id === requirement.stageId);
    return stage ? `Clear "${stage.displayName}" to unlock!` : 'Not available yet!';
  }

  toggleUnit(type) {
    if (!isUnitUnlocked(type)) {
      this.showMessage(this.describeLockedUnit(type));
      return;
    }

    if (this.selected.has(type)) {
      if (this.selected.size <= 1) {
        this.showMessage('At least one unit must stay in your formation!');
        return;
      }
      this.selected.delete(type);
    } else {
      if (this.selected.size >= MAX_LOADOUT_SIZE) {
        this.showMessage(`Formation is full! Max ${MAX_LOADOUT_SIZE} units — remove one first.`);
        return;
      }
      this.selected.add(type);
    }

    saveLoadout([...this.selected]);
    this.renderCards();
    this.refreshSynergies();
    this.refreshTotalCost();
  }

  showMessage(text) {
    this.messageText.setText(text);
    this.time.delayedCall(1800, () => {
      // Only blank it out if nothing has overwritten this exact message in
      // the meantime — triggering a second showMessage within 1800ms of
      // the first (e.g. two disallowed toggles in a row) used to let the
      // first call's timer blank the second message out early, since both
      // timers blindly cleared the same shared messageText with no check.
      if (this.messageText.text === text) this.messageText.setText('');
    });
  }
}
