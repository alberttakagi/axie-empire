import { FONT, BC } from './UITheme.js';
import { LOGICAL_SIZE } from './RenderConfig.js';

// First-time tips: each mechanic explains itself once, the first time a
// player actually meets it in battle (not all up front in the tutorial).
// Non-blocking: a small card slides in under the HUD, "Got it" or ~7s to
// dismiss; tips that fire together queue. Seen tips persist per save.
const SEEN_KEY = 'axieEmpireTipsSeen';

export const TIPS = {
  cannon: 'RUNE CANNON is charged! Tap it (bottom-right) to blast every Chimera on the lane.',
  rally: 'RALLY is ready! Tap it at the top for a free squad of Axies — once per battle.',
  rain: 'RAIN FRONT: everyone moves slower for a while. Good time to stack up your wallet.',
  sunbeam: 'SUNBEAM: your Axies deal +25% damage while it lasts — deploy now!',
  elite: 'ELITE Chimera! The glowing ring shows its power: shielded, hasty or vampiric.',
  chest: 'A treasure chest floats on the lane — hit it with the Rune Cannon for Money (and maybe Gems).',
  boss: 'BOSS incoming! It knocks your Axies back on arrival. Save the cannon for it.',
  worker: 'Wallet full! Spend it on Axies, or upgrade the Worker (bottom-left) to raise the cap and earn faster.',
};

function loadSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY)) || {};
  } catch {
    return {};
  }
}

function markSeen(id) {
  const seen = loadSeen();
  seen[id] = true;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage unavailable — the tip may show again next time; harmless.
  }
}

export function hasSeenTip(id) {
  return !!loadSeen()[id];
}

// `scene` must have a uiCamera (GameScene). Safe to call every frame.
export function showTipOnce(scene, id) {
  if (!TIPS[id] || hasSeenTip(id) || scene.mode === 'dojo') return;
  scene.tipQueue ||= [];
  if (scene.tipQueue.includes(id) || scene.activeTipId === id) return;
  markSeen(id);
  scene.tipQueue.push(id);
  if (!scene.activeTip) showNext(scene);
}

function showNext(scene) {
  const id = scene.tipQueue.shift();
  if (!id || scene.isGameOver) {
    scene.activeTip = null;
    scene.activeTipId = null;
    return;
  }
  const { width } = LOGICAL_SIZE;
  const w = 360;
  const x = width / 2;
  const y = 158;
  const bg = scene.add.rectangle(x, y, w, 50, BC.panel, 0.97).setStrokeStyle(3, BC.ink);
  const badge = scene.add.text(x - w / 2 + 22, y, 'TIP', { fontFamily: FONT, fontSize: '9px', color: '#ffffff', backgroundColor: '#e07b00', padding: { x: 4, y: 2 } }).setOrigin(0.5);
  const text = scene.add.text(x - w / 2 + 42, y, TIPS[id], { fontFamily: FONT, fontSize: '10px', color: BC.inkHex, wordWrap: { width: w - 120 } }).setOrigin(0, 0.5);
  const ok = scene.add.text(x + w / 2 - 38, y, 'Got it', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', backgroundColor: '#3a8a4a', padding: { x: 6, y: 4 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  const parts = [bg, badge, text, ok];
  parts.forEach((p) => p.setDepth(1500).setAlpha(0));
  scene.cameras.main.ignore(parts);
  scene.tweens.add({ targets: parts, alpha: 1, duration: 200 });
  scene.activeTipId = id;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    scene.tweens.add({
      targets: parts, alpha: 0, duration: 200,
      onComplete: () => {
        parts.forEach((p) => p.destroy());
        scene.time.delayedCall(400, () => showNext(scene));
      },
    });
  };
  ok.on('pointerup', close);
  scene.time.delayedCall(7500, close);
  scene.activeTip = parts;
}

export function resetTipState(scene) {
  scene.tipQueue = [];
  scene.activeTip = null;
  scene.activeTipId = null;
}
