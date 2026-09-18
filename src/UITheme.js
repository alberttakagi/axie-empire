// Shared Battle Cats visual language — colors, fonts, and reusable Phaser
// widget factories — so every scene (Home, Saga/Stage select, Loadout,
// Upgrade, Gacha, Catalog, Treasure, Missions, GameScene's own HUD chrome)
// draws its buttons/panels/bars the same way instead of each hand-rolling
// its own rectangle+text. Palette and shapes are read off the real game's
// own screenshots and the nyanko_ui_guide.html reference (thick black
// outlines, beveled gold/blue capsule buttons with a Y+4 press-down, cream
// popup panels, a dark wood-plank frame around hub-style screens) — no
// official images/audio are used, only the structure and color language.
const FONT = 'Rowdies, sans-serif';

export const BC = {
  gold: 0xffc83d,
  goldHighlight: 0xffe58a,
  goldInk: '#3a2600',
  blue: 0x5ec1e8,
  blueHighlight: 0xa7e4fb,
  red: 0xd8443b,
  redHighlight: 0xf0958d,
  ink: 0x1d1a16,
  inkHex: '#1d1a16',
  panel: 0xfff7e2,
  panelHex: '#fff7e2',
  sky: 0xbfe3f2,
  woodDark: 0x5b3a22,
  woodMid: 0x8a5a30,
  woodLight: 0xb98a52,
};

export { FONT };

function pressFeedback(scene, face, text, extra = []) {
  return () => {
    face.y = 4;
    text.y = 4;
    extra.forEach((o) => { o.y += 4; });
    scene.time.delayedCall(90, () => {
      face.y = 0;
      text.y = 0;
      extra.forEach((o) => { o.y -= 4; });
    });
  };
}

// A beveled capsule/rounded-rect button: black-outlined face, a soft top
// highlight sliver, and a dark "shelf" shadow offset down 4px (the guide's
// own universal press spec: "Y+4, shadow off, 4F back") which the face
// visually sits on top of until pressed, when the face drops onto it.
export function createBcButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const {
    fill = BC.gold,
    highlight = BC.goldHighlight,
    textColor = BC.goldInk,
    fontSize = 16,
    radius = Math.min(16, h / 2.4),
    strokeWidth = 3,
  } = opts;

  const container = scene.add.container(x, y);

  const shadow = scene.add.graphics();
  shadow.fillStyle(BC.ink, 1);
  shadow.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, radius);

  const face = scene.add.graphics();
  face.fillStyle(fill, 1);
  face.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  face.fillStyle(highlight, 0.5);
  face.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, Math.max(4, h * 0.4), radius * 0.7);
  face.lineStyle(strokeWidth, BC.ink, 1);
  face.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT, fontSize: `${fontSize}px`, color: textColor,
      align: 'center', wordWrap: { width: w - 14 },
    })
    .setOrigin(0.5);

  const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true });
  container.add([shadow, face, text, hit]);

  const feedback = pressFeedback(scene, face, text);
  hit.on('pointerdown', () => {
    feedback();
    if (onClick) onClick();
  });

  container.bcFace = face;
  container.bcText = text;
  container.bcHit = hit;
  return container;
}

// Plain circular gold button (Battle Cats' own "back"/round icon buttons) —
// used for the corner Back arrow and small icon buttons (Menu/Gamatoto/...).
export function createBcCircleButton(scene, x, y, radius, glyph, onClick, opts = {}) {
  const { fill = BC.gold, highlight = BC.goldHighlight, textColor = BC.goldInk, fontSize = radius } = opts;
  const container = scene.add.container(x, y);

  const shadow = scene.add.circle(0, 4, radius, BC.ink);
  const face = scene.add.circle(0, 0, radius, fill).setStrokeStyle(3, BC.ink);
  const sheen = scene.add.circle(-radius * 0.25, -radius * 0.3, radius * 0.5, highlight, 0.5);
  const text = scene.add.text(0, 0, glyph, { fontFamily: FONT, fontSize: `${fontSize}px`, color: textColor }).setOrigin(0.5);
  const hit = scene.add.circle(0, 0, radius, 0x000000, 0.001).setInteractive({ useHandCursor: true });

  container.add([shadow, face, sheen, text, hit]);
  const feedback = pressFeedback(scene, face, text, [sheen]);
  hit.on('pointerdown', () => {
    feedback();
    if (onClick) onClick();
  });
  return container;
}

// Standard "go back one screen" button — bottom-left corner, gold circle
// with a "<" glyph, matching every hub/list screen in the reference.
export function createBackButton(scene, onClick, x = 40, y = null) {
  const targetY = y === null ? scene.scale.height - 34 : y;
  return createBcCircleButton(scene, x, targetY, 26, '◀', onClick);
}

// Cream rounded panel with a thick black outline (popups, cards) — returns
// the Graphics object so callers can layer their own content on top at the
// same depth/container as everything else already does.
export function drawBcPanel(scene, x, y, w, h, opts = {}) {
  const { fill = BC.panel, radius = 20, strokeWidth = 4 } = opts;
  const g = scene.add.graphics();
  g.fillStyle(BC.ink, 0.18);
  g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 6, w, h, radius);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.lineStyle(strokeWidth, BC.ink, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

// The dark wood-plank frame the real game's hub-style screens (Cat Base,
// Power Up, Character Formation, ...) sit inside — approximated as two
// solid brown bands (no tileable wood texture asset exists in this repo)
// rather than a flat single-color border, so it still reads as a distinct
// "frame" instead of an arbitrary color bar.
export function drawWoodFrame(scene, width, height, thickness = 18) {
  const g = scene.add.graphics();
  g.fillStyle(BC.woodDark, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(BC.woodMid, 1);
  g.fillRect(thickness, thickness, width - thickness * 2, height - thickness * 2);
  g.lineStyle(3, BC.woodDark, 1);
  g.strokeRect(thickness * 0.5, thickness * 0.5, width - thickness, height - thickness);
  return g;
}

// The top title pill (screen name, upper-left) used on every non-battle
// screen — a dark rounded capsule with bold cream/orange text.
export function createTitlePill(scene, x, y, label, opts = {}) {
  const { fontSize = 20, paddingX = 18, height = 40 } = opts;
  const text = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, color: '#ffcf6b' })
    .setOrigin(0, 0.5);
  const w = text.width + paddingX * 2;
  const bg = scene.add.graphics();
  bg.fillStyle(BC.ink, 0.75);
  bg.fillRoundedRect(0, -height / 2, w, height, height / 2);
  const container = scene.add.container(x, y, [bg, text]);
  text.setPosition(paddingX, 0);
  return container;
}

// Top-right resource counter — a dark pill with a gold "tag" label
// (e.g. "XP", "円") and the value in a bright counting-number color,
// matching every screenshot's upper-right resource readout.
export function createResourceBadge(scene, x, y, tag, value, opts = {}) {
  const { valueColor = '#7fe0ff', tagColor = BC.goldInk, fontSize = 20 } = opts;
  const container = scene.add.container(x, y);

  const valueStr = typeof value === 'number' ? value.toLocaleString() : String(value);
  const valueText = scene.add.text(0, 0, valueStr, { fontFamily: FONT, fontSize: `${fontSize}px`, color: valueColor }).setOrigin(1, 0.5);
  const tagText = scene.add.text(0, 0, tag, { fontFamily: FONT, fontSize: `${fontSize - 6}px`, color: tagColor }).setOrigin(1, 0.5);

  const gap = 10;
  const tagPadX = 8;
  const tagPadY = 4;
  const tagW = tagText.width + tagPadX * 2;
  const tagH = tagText.height + tagPadY * 2;
  const tagRight = -valueText.width - gap;
  tagText.setPosition(tagRight, 0);

  const tagBg = scene.add.graphics();
  tagBg.fillStyle(BC.gold, 1);
  tagBg.lineStyle(2, BC.ink, 1);
  tagBg.fillRoundedRect(tagRight - tagW + tagPadX, -tagH / 2, tagW, tagH, 8);
  tagBg.strokeRoundedRect(tagRight - tagW + tagPadX, -tagH / 2, tagW, tagH, 8);

  const pillLeft = tagRight - tagW + tagPadX - 12;
  const pillRight = 12;
  const pillBg = scene.add.graphics();
  pillBg.fillStyle(BC.ink, 0.7);
  pillBg.fillRoundedRect(pillLeft, -20, pillRight - pillLeft, 40, 20);

  container.add([pillBg, tagBg, tagText, valueText]);
  container.bcValueText = valueText;
  return container;
}
