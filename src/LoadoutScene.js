import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { PROGRESSION_CONFIG } from './PROGRESSION_CONFIG.js';
import { getUnitProgress, loadPlayerProgress } from './PlayerProgress.js';
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

  create() {
    const { width } = this.scale;

    this.add.text(width / 2, 16, 'Character Formation', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);

    const backButton = this.add.rectangle(50, 16, 80, 28, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 16, 'Back', { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.scene.start('HomeScene'));

    this.add
      .text(width / 2, 60, `Tap a unit to include/exclude — max ${MAX_LOADOUT_SIZE} in Formation`, {
        fontSize: '10px',
        color: '#aaaaaa',
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
      .text(width / 2, 350, 'Active Squad Synergies:', { fontSize: '13px', color: '#ffdd33' })
      .setOrigin(0.5);
    this.synergyText = this.add
      .text(width / 2, 370, '', { fontSize: '12px', color: '#ffffff', align: 'center', wordWrap: { width: width - 40 } })
      .setOrigin(0.5);

    this.messageText = this.add
      .text(width / 2, 394, '', { fontSize: '12px', color: '#ff6666' })
      .setOrigin(0.5);

    // Formation cost summary (bible §A.10.3: "show... a running total-cost/
    // summary indicator for the loadout as a whole") — the sum of every
    // selected unit's plain UNIT_CONFIG cost (never the leveled/evolved
    // effective cost, since cost itself never scales with level anyway —
    // see UNIT_CONFIG.js).
    this.totalCostText = this.add
      .text(width / 2, 418, '', { fontSize: '12px', color: '#66ccff' })
      .setOrigin(0.5);

    this.renderSlotTabs();
    this.renderCards();
    this.refreshSynergies();
    this.refreshTotalCost();
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
      const rect = this.add
        .rectangle(x, y, tabWidth, 26, isActive ? 0xffdd33 : 0x444444)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, y, slot.name, { fontSize: '11px', color: isActive ? '#000000' : '#ffffff' })
        .setOrigin(0.5);

      rect.on('pointerdown', () => {
        setActiveFormationSlot(index);
        this.selected = new Set(loadLoadout());
        this.renderSlotTabs();
        this.renderCards();
        this.refreshSynergies();
        this.refreshTotalCost();
      });

      objects.push(rect, label);
    });

    const autoEquipX = startX + FORMATION_SLOT_COUNT * (tabWidth + gap) + autoEquipWidth / 2 - tabWidth / 2;
    const autoEquipButton = this.add
      .rectangle(autoEquipX, y, autoEquipWidth, 26, 0x3388cc)
      .setInteractive({ useHandCursor: true });
    const autoEquipLabel = this.add.text(autoEquipX, y, 'Auto-Equip', { fontSize: '11px', color: '#ffffff' }).setOrigin(0.5);
    autoEquipButton.on('pointerdown', () => {
      this.selected = new Set(autoEquipActiveSlot());
      this.renderCards();
      this.refreshSynergies();
      this.refreshTotalCost();
      this.showMessage('Auto-Equipped your highest-level units!');
    });
    objects.push(autoEquipButton, autoEquipLabel);

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
      this.renderCard(key, x, y);
    });
  }

  renderCard(type, x, y) {
    const config = UNIT_CONFIG[type];
    const meta = PROGRESSION_CONFIG[type];
    const unitProgress = getUnitProgress(loadPlayerProgress(), type);
    const isSelected = this.selected.has(type);
    const pinned = isPinned(type);

    const card = this.add
      .rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, config.color)
      .setAlpha(isSelected ? 1 : 0.3)
      .setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0xffdd33 : 0x666666)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(x, y - 30, config.displayName, {
        fontSize: '12px',
        color: '#000000',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 8 },
      })
      .setOrigin(0.5);
    const levelLabel = this.add
      .text(x, y, `Lv ${unitProgress.level}`, { fontSize: '11px', color: '#000000' })
      .setOrigin(0.5);
    const statusLabel = this.add
      .text(x, y + 30, isSelected ? 'IN FORMATION' : 'benched', {
        fontSize: '10px',
        color: isSelected ? '#003300' : '#000000',
      })
      .setOrigin(0.5);

    // Pin (bible §A.10.3) — its own small badge in the card's corner, with
    // its own independent hit area; stopPropagation keeps a pin tap from
    // also toggling the card's Formation membership underneath it.
    const pinBadge = this.add
      .circle(x + CARD_WIDTH / 2 - 14, y - CARD_HEIGHT / 2 + 14, 10, pinned ? 0xffdd33 : 0x000000, pinned ? 1 : 0.4)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const pinLabel = this.add
      .text(x + CARD_WIDTH / 2 - 14, y - CARD_HEIGHT / 2 + 14, '📌', { fontSize: '10px' })
      .setOrigin(0.5);

    pinBadge.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      togglePinned(type);
      this.renderCards();
    });

    card.on('pointerdown', () => this.toggleUnit(type));

    this.cardContainer.add([card, label, levelLabel, statusLabel, pinBadge, pinLabel]);
  }

  toggleUnit(type) {
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
    this.time.delayedCall(1800, () => this.messageText.setText(''));
  }
}
