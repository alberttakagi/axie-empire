import Phaser from 'phaser';
import { preloadBackgrounds, addBackground } from './Backdrop.js';
import { BC, FONT, createBackButton, createBcButton, createTitlePill, createResourceBadge, drawBcPanel } from './UITheme.js';
import { loadPlayerProgress } from './PlayerProgress.js';
import { playSfxFile, playCoinSfx } from './Audio.js';
import { spendGems } from './Economy.js';
import { LOGICAL_SIZE, LOGICAL_WIDTH, LOGICAL_HEIGHT, RENDER_SCALE } from './RenderConfig.js';
import {
  AXIE_CLASSES, PART_TYPES, PART_VALUES, COLOR_COUNT, CLASS_INFO,
  randomGenome, describeGenome, deriveUnitStats, defaultName,
} from './AxieGenome.js';
import { loadLabGenome, saveLabGenome, ensureLabTextures } from './LabUnit.js';

// Axie Lab: design your own Axie with the live Axie Mixer. Pick a body
// class, a color and each of the six parts (class + style); the preview is
// rendered live by @axieinfinity/mixer, and the stat card updates from the
// same genome (AxieGenome.js) the battle unit uses. First design is free;
// re-designing costs Gems (an economy sink with a clear, personal payoff).
const REDESIGN_COST = 100;
const ANIM_MS = 1000 / 24;
const PREVIEW_KEY = 'lab_preview';

const ATTR_LABEL = { red: 'Red (Ravagers)', floating: 'Floating (flyers)', zombie: 'Zombie (undead)' };

export default class AxieLabScene extends Phaser.Scene {
  constructor() {
    super('AxieLabScene');
  }

  preload() {
    preloadBackgrounds(this);
  }

  create() {
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.centerOn(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    const { width, height } = LOGICAL_SIZE;
    addBackground(this, 'metamorph');
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5);
    createTitlePill(this, 24, 22, 'Axie Lab');
    createBackButton(this, () => this.scene.start('HomeScene'));

    this.saved = loadLabGenome();
    this.genome = this.saved ? JSON.parse(JSON.stringify(this.saved)) : randomGenome();
    this.renderToken = 0;
    this.previewFrames = null;
    this.previewTimer = null;

    // Preview stage (left)
    drawBcPanel(this, 150, 222, 250, 300, { fill: 0x1b1330 });
    this.add.ellipse(150, 300, 150, 26, 0xffd27f, 0.25).setStrokeStyle(2, 0xffd27f, 0.7);
    this.previewImage = this.add.image(150, 300, '__WHITE').setOrigin(0.5, 1).setVisible(false);
    this.statusText = this.add.text(150, 210, '', { fontFamily: FONT, fontSize: '12px', color: '#cdb8ff', align: 'center' }).setOrigin(0.5);
    this.nameText = this.add.text(150, 92, '', { fontFamily: FONT, fontSize: '17px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
    this.classTag = this.add.text(150, 114, '', { fontFamily: FONT, fontSize: '11px', color: '#ffd27f' }).setOrigin(0.5);
    this.add.text(150, 352, 'Drawn live by the Axie Mixer', { fontFamily: FONT, fontSize: '9px', color: '#8f7cc7' }).setOrigin(0.5);

    createBcButton(this, 95, 330, 90, 26, 'Rename', () => this.rename(), { fontSize: 11, fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a' });
    createBcButton(this, 205, 330, 90, 26, 'Randomize', () => {
      const name = this.genome.name;
      this.genome = randomGenome();
      this.genome.name = name;
      this.onChange();
    }, { fontSize: 11, fill: BC.blue, highlight: BC.blueHighlight, textColor: '#0a2e3a' });

    // Editor (middle)
    this.editor = this.add.container(0, 0);
    // Stat card (right)
    this.card = this.add.container(0, 0);

    this.saveButton = createBcButton(this, width - 130, height - 52, 190, 40, '', () => this.save(), { fontSize: 13 });
    this.toast = this.add.text(width / 2, height - 18, '', { fontFamily: FONT, fontSize: '12px', color: '#ffdd33', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);

    this.refreshGems();
    this.onChange(true);
  }

  refreshGems() {
    if (this.gemsBadge) this.gemsBadge.destroy();
    this.gemsBadge = createResourceBadge(this, LOGICAL_SIZE.width - 24, 26, 'GEM', loadPlayerProgress().gems, { valueColor: '#ffd27f' });
  }

  say(text) {
    this.toast.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    this.tweens.add({ targets: this.toast, alpha: 0, delay: 2400, duration: 500 });
  }

  isDirty() {
    return !this.saved || JSON.stringify(this.saved) !== JSON.stringify(this.genome);
  }

  onChange(immediate = false) {
    this.drawEditor();
    this.drawCard();
    const isFirst = !this.saved;
    this.saveButton.bcText?.setText(isFirst ? 'Recruit this Axie!' : this.isDirty() ? `Save design · ${REDESIGN_COST} Gems` : 'Saved ✓');
    this.saveButton.setAlpha(this.isDirty() ? 1 : 0.6);
    this.nameText.setText(this.genome.name || defaultName(this.genome));
    this.classTag.setText(`${CLASS_INFO[this.genome.bodyClass].label} · Purity ${describeGenome(this.genome).purity}/6`);
    // Debounced live render: rapid clicking only renders the final pick.
    if (this.renderDelay) this.renderDelay.remove();
    this.renderDelay = this.time.delayedCall(immediate ? 0 : 350, () => this.renderPreview());
  }

  async renderPreview() {
    const token = ++this.renderToken;
    this.statusText.setText('Mixing your Axie…');
    this.tweens.add({ targets: this.previewImage, alpha: 0.35, duration: 150 });
    try {
      const { renderGenomeFrames } = await import('./MixerRuntime.js');
      const frames = await renderGenomeFrames(this.genome);
      if (token !== this.renderToken || !this.sys.isActive()) return;
      this.showPreview(frames);
      this.statusText.setText('');
    } catch (e) {
      if (token !== this.renderToken || !this.sys.isActive()) return;
      console.warn('Axie Lab preview failed', e);
      this.statusText.setText("Couldn't reach the Axie Mixer.\nCheck your connection and try again.");
    }
  }

  showPreview(frames) {
    const tm = this.textures;
    if (tm.exists(PREVIEW_KEY)) tm.remove(PREVIEW_KEY);
    const w = frames.idle[0].width;
    const h = frames.idle[0].height;
    const sheet = document.createElement('canvas');
    sheet.width = w * frames.idle.length;
    sheet.height = h;
    const ctx = sheet.getContext('2d');
    frames.idle.forEach((c, i) => ctx.drawImage(c, i * w, 0));
    const tex = tm.addCanvas(PREVIEW_KEY, sheet);
    frames.idle.forEach((_, i) => tex.add(String(i), 0, i * w, 0, w, h));

    const img = this.previewImage;
    img.setTexture(PREVIEW_KEY, '0').setVisible(true).setAlpha(1).setFlipX(true);
    img.setScale(Math.min(200 / w, 200 / h));
    let frame = 0;
    if (this.previewTimer) this.previewTimer.remove();
    this.previewTimer = this.time.addEvent({
      delay: ANIM_MS, loop: true,
      callback: () => {
        frame = (frame + 1) % frames.idle.length;
        if (img.active && tm.exists(PREVIEW_KEY)) img.setTexture(PREVIEW_KEY, String(frame));
      },
    });
    this.tweens.add({ targets: img, scaleY: img.scaleY * 1.04, duration: 120, yoyo: true });
  }

  // ---- Editor ----
  drawEditor() {
    const c = this.editor;
    c.removeAll(true);
    const x0 = 306;
    c.add(drawBcPanel(this, 430, 222, 270, 300));
    c.add(this.add.text(x0, 80, 'Body class', { fontFamily: FONT, fontSize: '11px', color: BC.inkHex }));
    AXIE_CLASSES.forEach((cls, i) => {
      const x = x0 + 16 + i * 40;
      const on = this.genome.bodyClass === cls;
      const chip = this.add.circle(x, 108, on ? 16 : 13, CLASS_INFO[cls].color).setStrokeStyle(on ? 3 : 1, BC.ink).setInteractive({ useHandCursor: true });
      chip.on('pointerup', () => {
        this.genome.bodyClass = cls;
        this.onChange();
      });
      c.add(chip);
      c.add(this.add.text(x, 128, CLASS_INFO[cls].label, { fontFamily: FONT, fontSize: '7px', color: BC.inkHex }).setOrigin(0.5));
    });

    c.add(this.add.text(x0, 140, 'Color', { fontFamily: FONT, fontSize: '11px', color: BC.inkHex }));
    for (let i = 0; i < COLOR_COUNT; i++) {
      const on = this.genome.color === i;
      const b = this.add.text(x0 + 60 + i * 36, 147, String(i + 1), {
        fontFamily: FONT, fontSize: '11px', color: on ? '#ffffff' : BC.inkHex, backgroundColor: on ? '#6a55a0' : '#e8dcc0', padding: { x: 8, y: 2 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      b.on('pointerup', () => {
        this.genome.color = i;
        this.onChange();
      });
      c.add(b);
    }

    PART_TYPES.forEach((type, i) => {
      const y = 182 + i * 30;
      const part = this.genome.parts[type];
      c.add(this.add.text(x0, y, type[0].toUpperCase() + type.slice(1), { fontFamily: FONT, fontSize: '11px', color: BC.inkHex }).setOrigin(0, 0.5));
      // Class picker
      c.add(this.arrow(x0 + 52, y, '◀', () => this.cyclePart(type, 'class', -1)));
      c.add(this.add.circle(x0 + 68, y, 6, CLASS_INFO[part.class].color).setStrokeStyle(1, BC.ink));
      c.add(this.add.text(x0 + 77, y, CLASS_INFO[part.class].label, { fontFamily: FONT, fontSize: '10px', color: BC.inkHex }).setOrigin(0, 0.5));
      c.add(this.arrow(x0 + 138, y, '▶', () => this.cyclePart(type, 'class', 1)));
      // Style picker
      c.add(this.arrow(x0 + 162, y, '◀', () => this.cyclePart(type, 'value', -1)));
      c.add(this.add.text(x0 + 188, y, `Style ${PART_VALUES[type].indexOf(part.value) + 1}`, { fontFamily: FONT, fontSize: '10px', color: BC.inkHex }).setOrigin(0.5));
      c.add(this.arrow(x0 + 214, y, '▶', () => this.cyclePart(type, 'value', 1)));
    });
    c.add(this.add.text(430, 360, 'Back · Horn · Mouth · Tail choose the signature move', { fontFamily: FONT, fontSize: '8px', color: '#7a5c1e' }).setOrigin(0.5));
  }

  arrow(x, y, glyph, onClick) {
    const t = this.add.text(x, y, glyph, { fontFamily: FONT, fontSize: '12px', color: '#ffffff', backgroundColor: '#6a55a0', padding: { x: 4, y: 1 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerup', onClick);
    return t;
  }

  cyclePart(type, field, dir) {
    const part = this.genome.parts[type];
    if (field === 'class') {
      const i = AXIE_CLASSES.indexOf(part.class);
      part.class = AXIE_CLASSES[(i + dir + AXIE_CLASSES.length) % AXIE_CLASSES.length];
    } else {
      const vals = PART_VALUES[type];
      part.value = vals[(vals.indexOf(part.value) + dir + vals.length) % vals.length];
    }
    this.onChange();
  }

  // ---- Stat card ----
  drawCard() {
    const c = this.card;
    c.removeAll(true);
    const d = describeGenome(this.genome);
    const u = deriveUnitStats(this.genome);
    const x = 580;
    c.add(drawBcPanel(this, 680, 205, 190, 266, { fill: 0x2a1f3d }));
    c.add(this.add.text(x + 4, 80, 'Battle card', { fontFamily: FONT, fontSize: '12px', color: '#ffd27f' }));
    const rows = [
      ['HP', u.hp.toLocaleString()],
      ['Damage', u.damage.toLocaleString()],
      ['Move speed', String(u.moveSpeed)],
      ['Attack every', `${((u.foreswingMs + u.backswingMs) / 1000).toFixed(1)}s`],
      ['Crit chance', `${Math.round(u.critChance * 100)}%`],
      ['Cost', `${u.cost}円`],
    ];
    rows.forEach(([k, v], i) => {
      c.add(this.add.text(x + 4, 102 + i * 17, k, { fontFamily: FONT, fontSize: '10px', color: '#cdb8ff' }));
      c.add(this.add.text(x + 176, 102 + i * 17, v, { fontFamily: FONT, fontSize: '10px', color: '#ffffff' }).setOrigin(1, 0));
    });
    const sigColor = `#${CLASS_INFO[d.signature.cls].color.toString(16).padStart(6, '0')}`;
    c.add(this.add.text(x + 4, 210, `★ ${d.signature.label}`, { fontFamily: FONT, fontSize: '12px', color: sigColor, stroke: '#000000', strokeThickness: 2 }));
    c.add(this.add.text(x + 4, 228, d.signature.desc, { fontFamily: FONT, fontSize: '9px', color: '#ffffff', wordWrap: { width: 176 } }));
    c.add(this.add.text(x + 4, 262, `Strong vs ${ATTR_LABEL[d.strongVs] || d.strongVs}`, { fontFamily: FONT, fontSize: '9px', color: '#7dff9a', wordWrap: { width: 176 } }));
    c.add(this.add.text(x + 4, 284, `Purity ${d.purity}/6: +${d.purity * 3}% HP & damage`, { fontFamily: FONT, fontSize: '9px', color: '#ffd27f' }));
    c.add(this.add.text(x + 4, 302, `Base: HP ${d.stats.hp} · SPD ${d.stats.speed} · SKL ${d.stats.skill} · MRL ${d.stats.morale}`, { fontFamily: FONT, fontSize: '8px', color: '#a996d6', wordWrap: { width: 180 } }));
  }

  rename() {
    const current = this.genome.name || defaultName(this.genome);
    const next = window.prompt('Name your Axie (max 14 characters):', current);
    if (next === null) return;
    const clean = next.replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 14);
    this.genome.name = clean;
    this.onChange(true);
  }

  save() {
    if (!this.isDirty()) return;
    const isFirst = !this.saved;
    if (!isFirst && !spendGems(REDESIGN_COST, 'axieLab')) {
      this.say(`Re-designing costs ${REDESIGN_COST} Gems.`);
      return;
    }
    saveLabGenome(this.genome);
    this.saved = JSON.parse(JSON.stringify(this.genome));
    this.refreshGems();
    playCoinSfx();
    playSfxFile('/audio/sfx/power_awaken.wav', { gain: 0.7 });
    this.say(isFirst ? `${this.genome.name || defaultName(this.genome)} joined your army! Add it in Formation.` : 'Design saved!');
    ensureLabTextures(this.game);
    this.onChange(true);
  }
}
