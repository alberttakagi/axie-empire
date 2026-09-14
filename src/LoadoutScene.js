import Phaser from 'phaser';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { PROGRESSION_CONFIG } from './PROGRESSION_CONFIG.js';
import { getUnitProgress, loadPlayerProgress } from './PlayerProgress.js';
import { loadLoadout, saveLoadout } from './Loadout.js';
import { getActiveCombos } from './Combo.js';

// The bible's §A.10.3 Pre-Battle Loadout ("Equip") Screen — a standalone
// "manage my formation" screen reachable from the Home screen, rather than
// an extra confirm-step wedged between Stage Select and every single
// battle. GameScene reads whatever's saved here (see Loadout.js) directly.

const CARD_WIDTH = 130;
const CARD_HEIGHT = 100;
const CARD_GAP = 12;

export default class LoadoutScene extends Phaser.Scene {
  constructor() {
    super('LoadoutScene');
  }

  create() {
    const { width } = this.scale;

    this.add.text(width / 2, 20, 'Character Formation', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this.add
      .text(width / 2, 42, 'Tap a unit to include/exclude it from battle', {
        fontSize: '11px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    const backButton = this.add.rectangle(50, 20, 80, 32, 0x444444).setInteractive({ useHandCursor: true });
    this.add.text(50, 20, 'Back', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    backButton.on('pointerdown', () => this.scene.start('HomeScene'));

    this.selected = new Set(loadLoadout());
    this.cardContainer = this.add.container(0, 0);

    // Squad Synergy (bible §A.7.3's Cat Combo) — this mechanic otherwise
    // applies completely silently in battle (a starting-money/attack/crit
    // bonus with no on-screen label anywhere), so this is the one place a
    // player can actually see which synergies their current Formation has
    // activated and why.
    this.add
      .text(width / 2, 250, 'Active Squad Synergies:', { fontSize: '13px', color: '#ffdd33' })
      .setOrigin(0.5);
    this.synergyText = this.add
      .text(width / 2, 272, '', { fontSize: '12px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5);

    this.messageText = this.add
      .text(width / 2, 400, '', { fontSize: '12px', color: '#ff6666' })
      .setOrigin(0.5);

    this.renderCards();
    this.refreshSynergies();
  }

  refreshSynergies() {
    const activeCombos = getActiveCombos([...this.selected]);
    this.synergyText.setText(activeCombos.length > 0 ? activeCombos.map((combo) => combo.name).join('   •   ') : 'None');
  }

  renderCards() {
    this.cardContainer.removeAll(true);

    const keys = Object.keys(UNIT_CONFIG);
    const totalWidth = keys.length * CARD_WIDTH + (keys.length - 1) * CARD_GAP;
    const startX = (this.scale.width - totalWidth) / 2 + CARD_WIDTH / 2;
    const y = 130;

    keys.forEach((key, index) => {
      const x = startX + index * (CARD_WIDTH + CARD_GAP);
      this.renderCard(key, x, y);
    });
  }

  renderCard(type, x, y) {
    const config = UNIT_CONFIG[type];
    const meta = PROGRESSION_CONFIG[type];
    const unitProgress = getUnitProgress(loadPlayerProgress(), type);
    const isSelected = this.selected.has(type);

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

    card.on('pointerdown', () => this.toggleUnit(type));

    this.cardContainer.add([card, label, levelLabel, statusLabel]);
  }

  toggleUnit(type) {
    if (this.selected.has(type)) {
      if (this.selected.size <= 1) {
        this.showMessage('At least one unit must stay in your formation!');
        return;
      }
      this.selected.delete(type);
    } else {
      this.selected.add(type);
    }

    saveLoadout([...this.selected]);
    this.renderCards();
    this.refreshSynergies();
  }

  showMessage(text) {
    this.messageText.setText(text);
    this.time.delayedCall(1800, () => this.messageText.setText(''));
  }
}
