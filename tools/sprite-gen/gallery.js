// Dev-only LIVE animation preview — NOT part of the shipped game, and not
// the same thing as main.js's still-frame extractor (this never calls
// app.renderer.render() manually or extracts a PNG; every Spine instance
// below shares ONE ticking PixiJS Application/WebGL context and just plays
// its own real animation in a loop at real speed, so the user can actually
// see the motion rather than judge it from a single frozen frame). An
// earlier version gave each clip its OWN small Application/canvas — 30
// simultaneous WebGL contexts hit the browser's hard cap ("too many active
// WebGL contexts"), silently killing the oldest ones. One shared canvas
// with everything laid out on it avoids that entirely.
//
// Buba (axieId '1') only, for now — a quick look, not a full asset build.

import { Application, Text, Graphics } from 'pixi.js';
import { Spine, TextureAtlas } from 'pixi-spine';
import { AtlasAttachmentLoader, SkeletonJson, SkeletonBinary } from '@pixi-spine/runtime-3.8';

const AXIE_ID = '1'; // Buba

const COLUMNS = 6;
const CELL = 130;
const GAP = 8;
const LABEL_HEIGHT = 28;
const HEADER_HEIGHT = 30;
const SECTION_GAP = 14;
const MARGIN = 12;

// Matches main.js's renderStarter (spine.scale.set(0.4, 0.4) at a 512x512
// canvas, positioned at (256, 340)) scaled down proportionally to this
// gallery's smaller per-cell footprint, so every clip's framing/proportions
// match what the real sprite-gen pipeline already renders.
const SCALE = 0.4 * (CELL / 512);
const LOCAL_POS_X = 256 * (CELL / 512);
const LOCAL_POS_Y = 340 * (CELL / 512);

// Curated to match the categories requested in chat — melee attacks,
// movement, idle, activity, battle status — deliberately excluding this
// skeleton's ranged/defense clips (not asked for). Every name here is
// confirmed common to all 10 assigned Starter units, so whichever gets
// picked will be available to apply to any of them later.
const CATEGORIES = [
  {
    label: 'Idle',
    names: [
      'action/idle/normal',
      'action/idle/random-01',
      'action/idle/random-02',
      'action/idle/random-03',
      'action/idle/random-04',
      'action/idle/random-05',
    ],
  },
  {
    label: 'Activity',
    names: [
      'activity/appear',
      'activity/bath',
      'activity/eat-bite',
      'activity/eat-chew',
      'activity/entrance',
      'activity/evolve',
      'activity/prepare',
      'activity/sleep',
      'activity/victory-pose-back-flip',
    ],
  },
  {
    label: 'Movement',
    names: ['action/move-back', 'action/move-forward', 'action/run', 'draft/run-origin'],
  },
  {
    label: 'Melee attacks',
    names: [
      'attack/melee/horn-gore',
      'attack/melee/mouth-bite',
      'attack/melee/multi-attack',
      'attack/melee/normal-attack',
      'attack/melee/shrimp',
      'attack/melee/tail-multi-slap',
      'attack/melee/tail-roll',
      'attack/melee/tail-smash',
      'attack/melee/tail-thrash',
    ],
  },
  {
    label: 'Battle status',
    names: ['battle/get-buff', 'battle/get-debuff'],
  },
];

// Same loader as main.js's loadStarterSkeletonData, duplicated rather than
// imported — this file intentionally stays fully standalone from the
// still-frame extractor.
async function loadStarterSkeletonData(axieId) {
  const basePath = `/starters/${axieId}`;
  const atlasText = await fetch(`${basePath}/${axieId}.atlas`).then((r) => r.text());
  const { Assets } = await import('pixi.js');
  const pageTexture = await Assets.load(`${basePath}/${axieId}.png`);

  const atlas = new TextureAtlas(atlasText, (_line, callback) => callback(pageTexture.baseTexture));
  const attachmentLoader = new AtlasAttachmentLoader(atlas);

  const jsonText = await fetch(`${basePath}/${axieId}.json`).then((r) => r.text());
  if (jsonText.trim().startsWith('{')) {
    return new SkeletonJson(attachmentLoader).readSkeletonData(JSON.parse(jsonText));
  }

  const buf = await fetch(`${basePath}/${axieId}.skel`).then((r) => r.arrayBuffer());
  return new SkeletonBinary(attachmentLoader).readSkeletonData(new Uint8Array(buf));
}

// Precomputes every cell's (x, y) top-left on one shared canvas, wrapping
// at COLUMNS per row and starting a fresh row for each new category — so
// the whole gallery is just one flat list of "draw this at this spot"
// entries by the time the render loop below runs.
function layoutCells() {
  const cells = [];
  const headers = [];
  let y = MARGIN;

  for (const { label, names } of CATEGORIES) {
    headers.push({ label, x: MARGIN, y });
    y += HEADER_HEIGHT;

    names.forEach((name, i) => {
      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      cells.push({ name, x: MARGIN + col * (CELL + GAP), y: y + row * (CELL + LABEL_HEIGHT + GAP) });
    });
    const rows = Math.ceil(names.length / COLUMNS);
    y += rows * (CELL + LABEL_HEIGHT + GAP) + SECTION_GAP;
  }

  const width = MARGIN * 2 + COLUMNS * CELL + (COLUMNS - 1) * GAP;
  const height = y;
  return { cells, headers, width, height };
}

async function main() {
  const status = document.getElementById('status');
  status.textContent = 'loading Buba skeleton…';
  const skeletonData = await loadStarterSkeletonData(AXIE_ID);

  const { cells, headers, width, height } = layoutCells();

  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const app = new Application({ view: canvas, width, height, backgroundAlpha: 1, background: '#2a2a2a' });

  for (const { label, x, y } of headers) {
    const text = new Text(label.toUpperCase(), {
      fontFamily: 'sans-serif', fontSize: 13, fontWeight: 'bold',
      fill: 0xffdd33, letterSpacing: 1,
    });
    text.position.set(x, y);
    app.stage.addChild(text);
  }

  let missing = 0;
  for (const { name, x, y } of cells) {
    const cellBg = new Graphics();
    cellBg.beginFill(0x4488cc);
    cellBg.drawRect(x, y, CELL, CELL);
    cellBg.endFill();
    app.stage.addChild(cellBg);

    const spine = new Spine(skeletonData);
    spine.position.set(x + LOCAL_POS_X, y + LOCAL_POS_Y);
    spine.scale.set(SCALE, SCALE);
    app.stage.addChild(spine);

    const anim = skeletonData.animations.find((a) => a.name === name);
    if (anim) {
      spine.state.setAnimation(0, name, true); // loop: true — the whole point, live continuous playback
    } else {
      missing += 1;
    }

    const label = new Text(anim ? name : `${name} (missing)`, {
      fontFamily: 'monospace', fontSize: 10,
      fill: anim ? 0xdddddd : 0xff6666,
      wordWrap: true, wordWrapWidth: CELL,
      align: 'center',
    });
    label.position.set(x + CELL / 2 - label.width / 2, y + CELL + 4);
    app.stage.addChild(label);
  }

  status.textContent = `done — ${cells.length} clips playing live${missing ? ` (${missing} missing on this skeleton)` : ''}`;
}

main();
