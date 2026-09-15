// Dev-only sprite-generation harness — NOT part of the shipped game.
// Uses the official @axieinfinity/mixer (MIT-licensed npm package) +
// PixiJS + pixi-spine to build a 2D Axie entirely from a chosen
// CLASS + PART combo (no real Axie ownership / gene string required —
// see genesStuff.getAdultCombo), then renders one frame of a chosen
// animation and extracts it as a PNG data URL. Exposed on `window` so the
// browser-automation tooling driving this page can call it directly and
// pull back the resulting image.

import { Application, Assets, Texture } from 'pixi.js';
import { Spine, TextureAtlas } from 'pixi-spine';
import { AtlasAttachmentLoader, SkeletonJson, SkeletonBinary } from '@pixi-spine/runtime-3.8';
import {
  initAxieMixer,
  getAxieSpineFromCombo,
  getAxieColorPartShift,
  getVariantAttachmentPath,
  getAxieBodyStructure512,
  genesStuff,
} from '@axieinfinity/mixer';

import GenesData from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-genes.json';
import SamplesData from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-samples.json';
import VariantsData from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-variant.json';
import AnimationsData from '@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-animations.json';

const AXIE_IMAGES_URL = 'https://axiecdn.axieinfinity.com/mixer-stuffs/v6/';

initAxieMixer(GenesData, SamplesData, VariantsData, AnimationsData);

const app = new Application({
  view: document.getElementById('pixi-canvas'),
  width: 512,
  height: 512,
  backgroundAlpha: 0, // transparent — this is a sprite sheet source, not a scene
  resolution: 1,
});

document.getElementById('status').textContent = 'ready';

// Builds a "pure class" combo — every part is the SAME class as the body,
// all at the same partValue (a plain, un-mixed look; a real Axie usually
// mixes classes across parts, but a clean single-class silhouette is what
// we want for a legible small tower-defense sprite). partValue picks WHICH
// part sample within that class (each class has several eyes/mouth/etc.
// options at values like 2/4/6/8...) — left as a simple knob to vary the look.
function buildPureClassCombo(characterClass, partValue) {
  const bodyStructure = {
    class: characterClass,
    body: [0, 0, 0],
    bodySkin: 0,
    primaryColors: [0, 0, 0],
    secondaryColors: [0, 0, 0],
    parts: {},
  };

  for (const partType of ['Eyes', 'Mouth', 'Ears', 'Horn', 'Back', 'Tail']) {
    bodyStructure.parts[partType] = {
      stageCap: 2,
      stage: 0,
      reservation: 0,
      skinInheritability: true,
      skin: 0,
      groups: [
        { class: characterClass, value: partValue },
        { class: characterClass, value: partValue },
        { class: characterClass, value: partValue },
      ],
    };
  }

  return genesStuff.getAdultCombo(bodyStructure);
}

// Builds a combo matching one Starter Axie's REAL body, decoded straight
// from its actual gene hex string (pve-starters.json's `genes` field —
// the same authoritative source the Starter's own pre-baked Spine
// skeleton was built from), with one chosen part's `stage` set to 1
// instead of 0 — the mixer's own native "Lv2" part-evolution mechanic
// (see AxiePartStructure.stage/AxiePartSample.skinsLv2 in
// @axieinfinity/mixer's type defs): each part's gene data ships both a
// base skin and a distinct "-lv2" skin, selected by this exact field.
// (An earlier attempt hand-parsed pve-starters.json's descriptive
// eyesId/earsId/etc. strings like "beast-eyes-03" into class+partValue —
// those turned out to be a DIFFERENT id namespace than the generic
// mixer's own partValue numbering and didn't reliably resolve via
// genesStuff.findPart, hence decoding the real gene hex instead.)
// `evolvedPartType` is one of 'Eyes'/'Mouth'/'Ears'/'Horn'/'Back'/'Tail',
// or null for the unevolved baseline render.
function buildStarterCombo(starterEntry, evolvedPartType) {
  const bodyStructure = getAxieBodyStructure512(starterEntry.genes);
  if (evolvedPartType) {
    bodyStructure.parts[evolvedPartType].stage = 1;
  }
  return genesStuff.getAdultCombo(bodyStructure);
}

window.debugPureCombo = function debugPureCombo(characterClass, partValue) {
  const combo = buildPureClassCombo(characterClass, partValue);
  return Object.fromEntries(combo);
};

window.debugFindPart = function debugFindPart(partClass, partType, partValue) {
  const sample = genesStuff.findPart(partClass, partType, partValue);
  return sample ? { class: sample.class, partType: sample.partType, partValue: sample.partValue, skins: sample.skins, skinsLv2: sample.skinsLv2 } : null;
};

window.debugDecodedBodyStructure = function debugDecodedBodyStructure(geneString) {
  return getAxieBodyStructure512(geneString);
};

window.debugStarterCombo = function debugStarterCombo(starterEntry, evolvedPartType) {
  const combo = buildStarterCombo(starterEntry, evolvedPartType);
  const comboObj = Object.fromEntries(combo);
  const result = getAxieSpineFromCombo(combo, 0, false);
  return { comboObj, error: result.error, hasSkeletonDataAsset: !!result.skeletonDataAsset, variant: result.variant };
};

// Debug: renders directly from a raw AxieBodyStructure (bypassing gene
// decoding) — for testing the stage/skinsLv2 mechanic in isolation with
// synthetic part values.
window.renderFromBodyStructure = async function renderFromBodyStructure(bodyStructure, animationName = 'action/idle/normal') {
  app.stage.removeChildren();
  const combo = genesStuff.getAdultCombo(bodyStructure);
  const { error, skeletonDataAsset, variant } = getAxieSpineFromCombo(combo, 0, false);
  if (error) throw new Error(error);
  const spine = await createAxieSpine(skeletonDataAsset, variant);
  spine.position.set(256, 340);
  spine.scale.set(0.55, 0.55);
  if (spine.state.data.skeletonData.animations.some((a) => a.name === animationName)) {
    spine.state.setAnimation(0, animationName, false);
  }
  app.stage.addChild(spine);
  spine.update(0.016);
  app.renderer.render(app.stage);
  return app.renderer.extract.base64(app.stage);
};

window.renderStarterEvolvedPart = async function renderStarterEvolvedPart(
  starterEntry,
  evolvedPartType,
  animationName = 'action/idle/normal',
  colorVariant = 0,
) {
  app.stage.removeChildren();
  const combo = buildStarterCombo(starterEntry, evolvedPartType);
  const { error, skeletonDataAsset, variant } = getAxieSpineFromCombo(combo, colorVariant, false);
  if (error) throw new Error(error);

  const spine = await createAxieSpine(skeletonDataAsset, variant);
  spine.position.set(256, 340);
  spine.scale.set(0.55, 0.55);
  if (spine.state.data.skeletonData.animations.some((a) => a.name === animationName)) {
    spine.state.setAnimation(0, animationName, false);
  }
  app.stage.addChild(spine);
  spine.update(0.016);
  app.renderer.render(app.stage);
  return app.renderer.extract.base64(app.stage);
};

async function createAxieSpine(skeletonDataAsset, variant) {
  const skinAttachments = skeletonDataAsset.skins[0].attachments;
  const partColorShift = getAxieColorPartShift(variant);

  const toLoad = [];
  for (const slotName in skinAttachments) {
    for (const attachmentName in skinAttachments[slotName]) {
      const path = skinAttachments[slotName][attachmentName].path;
      const imagePath = AXIE_IMAGES_URL + getVariantAttachmentPath(slotName, path, variant, partColorShift);
      toLoad.push({ key: path, imagePath });
    }
  }

  const loaded = await Promise.all(
    toLoad.map(async ({ key, imagePath }) => {
      try {
        return { key, texture: await Assets.load(imagePath) };
      } catch (e) {
        console.warn('failed to load', imagePath, e);
        return null;
      }
    }),
  );

  const textures = {};
  for (const rec of loaded) {
    if (rec) textures[rec.key] = rec.texture;
  }

  const atlas = new TextureAtlas();
  atlas.addTextureHash(textures, false);
  const atlasLoader = new AtlasAttachmentLoader(atlas);
  const skeletonJson = new SkeletonJson(atlasLoader);
  const spineData = skeletonJson.readSkeletonData(skeletonDataAsset);
  return new Spine(spineData);
}

// The main entry point — builds+renders one Axie and returns a transparent
// PNG data URL of the given animation's first pose.
window.renderAxie = async function renderAxie(characterClass, partValue = 2, animationName = 'action/idle/normal', colorVariant = 0) {
  document.getElementById('status').textContent = `rendering ${characterClass}...`;
  app.stage.removeChildren();

  const combo = buildPureClassCombo(characterClass, partValue);
  const { error, skeletonDataAsset, variant } = getAxieSpineFromCombo(combo, colorVariant, false);
  if (error) throw new Error(error);

  const spine = await createAxieSpine(skeletonDataAsset, variant);
  spine.position.set(256, 340);
  spine.scale.set(0.55, 0.55);

  if (spine.state.data.skeletonData.animations.some((a) => a.name === animationName)) {
    spine.state.setAnimation(0, animationName, false);
  }
  app.stage.addChild(spine);

  // Force one render tick with the pose applied (animation update at time 0
  // is enough for a single static frame — we're generating a still sprite,
  // not exporting a full clip).
  spine.update(0.016); // a nonzero delta is required for pixi-spine to actually apply the pose — update(0) silently no-ops
  app.renderer.render(app.stage);

  const dataUrl = app.renderer.extract.base64(app.stage);
  document.getElementById('status').textContent = `done: ${characterClass}`;
  return dataUrl;
};

// Renders and writes straight to tools/sprite-gen/output/<filename> via the
// dev-server middleware in vite.config.js — the practical batch-generation
// entry point (renderAxie alone only returns the data URL in-memory).
window.renderAndSave = async function renderAndSave(filename, characterClass, partValue = 2, animationName = 'action/idle/normal', colorVariant = 0) {
  const dataUrl = await window.renderAxie(characterClass, partValue, animationName, colorVariant);
  const res = await fetch('/api/save-sprite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, dataUrl }),
  });
  return res.json();
};

// Builds a visual contact sheet: one tile per (class, partValue) combo, each
// labeled, laid out in the #gallery grid — lets a human pick favorites
// across every available part-style option before committing to final
// looks for the actual unit roster.
window.renderGallery = async function renderGallery(classes, partValues, animationName = 'action/idle/normal', colorVariants = [0]) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';

  for (const cls of classes) {
    for (const partValue of partValues) {
      for (const colorVariant of colorVariants) {
        const tile = document.createElement('div');
        tile.style.cssText = 'width: 150px; text-align: center; color: #fff; font: 11px sans-serif; background: #222; padding: 4px; border-radius: 4px;';
        const caption = document.createElement('div');
        caption.textContent = `${cls} #${partValue} c${colorVariant}`;
        tile.appendChild(caption);

        try {
          const dataUrl = await window.renderAxie(cls, partValue, animationName, colorVariant);
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.cssText = 'width: 140px; height: 140px; object-fit: contain; background: repeating-conic-gradient(#333 0% 25%, #3a3a3a 0% 50%) 0 0/16px 16px;';
          tile.appendChild(img);
        } catch (e) {
          const errText = document.createElement('div');
          errText.textContent = `error: ${e.message}`;
          errText.style.color = '#f66';
          tile.appendChild(errText);
        }

        gallery.appendChild(tile);
      }
    }
  }

  document.getElementById('status').textContent = `gallery done: ${classes.length * partValues.length * colorVariants.length} tiles`;
};

// --- Starter Axies (real, named, hand-designed bodies — bible/Vibeathon's
// Origins Battle Kit, NOT the generic class+part mixer above) ---
// These are pre-built Spine skeleton+atlas+texture files per character
// (served from public/starters/<axieId>/, copied from the Origins Asset
// Kit's PvE/Starters folder), loaded with the standard pixi-spine atlas
// pattern rather than the mixer's combo-building — there's no gene mixing
// to do at all, just load the character's own finished art directly.

let startersCatalog = null;
async function getStartersCatalog() {
  if (!startersCatalog) {
    const data = await fetch('/pve-starters.json').then((r) => r.json());
    startersCatalog = data.starters; // [{ axieId, name, itemId, genes, ... }]
  }
  return startersCatalog;
}
window.getStartersCatalog = getStartersCatalog;

async function loadStarterSkeletonData(axieId) {
  const basePath = `/starters/${axieId}`;
  const atlasText = await fetch(`${basePath}/${axieId}.atlas`).then((r) => r.text());
  const pageTexture = await Assets.load(`${basePath}/${axieId}.png`);

  const atlas = new TextureAtlas(atlasText, (_line, callback) => callback(pageTexture.baseTexture));
  const attachmentLoader = new AtlasAttachmentLoader(atlas);

  // Prefer JSON when both exist for this id — SkeletonBinary is otherwise
  // the fallback for ids that only ship a .skel file (see the folder-by-
  // folder format check done while exploring this repo). Can't rely on
  // fetch's own .ok/status here: Vite's dev server serves its SPA
  // index.html (a real 200) for any missing static path rather than a
  // clean 404, so a missing .json silently "succeeds" with HTML content —
  // sniff the actual body instead of trusting the status code.
  const jsonText = await fetch(`${basePath}/${axieId}.json`).then((r) => r.text());
  if (jsonText.trim().startsWith('{')) {
    return new SkeletonJson(attachmentLoader).readSkeletonData(JSON.parse(jsonText));
  }

  const buf = await fetch(`${basePath}/${axieId}.skel`).then((r) => r.arrayBuffer());
  return new SkeletonBinary(attachmentLoader).readSkeletonData(new Uint8Array(buf));
}

window.listStarterAnimations = async function listStarterAnimations(axieId) {
  const skeletonData = await loadStarterSkeletonData(axieId);
  return skeletonData.animations.map((a) => ({ name: a.name, duration: a.duration }));
};

// Debug: lists every slot name + its default (setup-pose) attachment name
// for a Starter skeleton — to check whether body-part slots (eyes/ears/
// horn/mouth/back/tail) expose more than one attachment each (which would
// mean alternate/evolved-part art actually exists in this skeleton).
window.debugStarterSlots = async function debugStarterSlots(axieId) {
  const skeletonData = await loadStarterSkeletonData(axieId);
  return skeletonData.slots.map((s) => ({ slot: s.name, attachment: s.attachmentName }));
};

// Debug: lists every region/attachment name defined in a Starter's atlas
// page — a skeleton might reference only ONE per slot in its setup pose,
// but the atlas page itself could still contain unused alternate regions.
window.debugStarterAtlasRegions = async function debugStarterAtlasRegions(axieId) {
  const basePath = `/starters/${axieId}`;
  const atlasText = await fetch(`${basePath}/${axieId}.atlas`).then((r) => r.text());
  return atlasText
    .split('\n')
    .filter((line) => line && !line.startsWith(' ') && !line.includes('.png') && !line.includes(':'))
    .map((line) => line.trim());
};

// poseFraction: how far into the animation's duration to freeze the pose for
// the still image (0 = bind pose bug workaround minimum, 1 = last frame).
// Many attack anims hold an anticipation/wind-up pose for their first ~20-30%
// before the actual motion, so a small fixed delta (e.g. 0.016s) can render
// almost identically to idle for longer animations — sampling by fraction of
// the real duration gets a representative "mid-action" frame instead.
window.renderStarter = async function renderStarter(axieId, animationName = 'action/idle/normal', poseFraction = 0.016) {
  document.getElementById('status').textContent = `rendering starter ${axieId}...`;
  app.stage.removeChildren();

  const skeletonData = await loadStarterSkeletonData(axieId);
  const spine = new Spine(skeletonData);
  spine.position.set(256, 340);
  spine.scale.set(0.4, 0.4);

  const anim = skeletonData.animations.find((a) => a.name === animationName);
  let poseDelta = 0.016; // nonzero minimum — update(0) silently no-ops in pixi-spine
  if (anim) {
    spine.state.setAnimation(0, animationName, false);
    // poseFraction > 1 is treated as an absolute seconds offset (back-compat
    // with callers that passed a raw delta like 0.016); <= 1 is a fraction
    // of this animation's real duration.
    poseDelta = poseFraction > 1 ? poseFraction : Math.max(0.016, anim.duration * poseFraction);
  }
  app.stage.addChild(spine);
  spine.update(poseDelta);
  app.renderer.render(app.stage);

  const dataUrl = app.renderer.extract.base64(app.stage);
  document.getElementById('status').textContent = `done: starter ${axieId}`;
  return dataUrl;
};

// Some PvE Chimera skeletons (unlike any Starter Axie) include a full-canvas
// "vignette"/backdrop attachment — sometimes only during a specific special
// attack (e.g. dryad-mage's spellcast), sometimes for the whole skeleton
// (e.g. werewolf) — that's opaque solid black instead of blending
// transparently against our stage (almost certainly authored to be
// composited with a non-'normal' blend mode against the real game's own
// darker battle backdrop, which our bare stage doesn't provide). Flood-
// filling in from all 4 canvas corners and clearing any contiguous,
// near-black, fully-opaque region catches exactly that backdrop — it's
// always attached to the edges of a 512x512 render at our small
// scale/position — while leaving a character's own black outline/shading
// untouched, since those are enclosed by non-black pixels and never reached.
async function stripOpaqueBlackBackground(dataUrl, threshold = 12) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;

  const isBlackOpaque = (i) =>
    data[i] <= threshold && data[i + 1] <= threshold && data[i + 2] <= threshold && data[i + 3] >= 250;

  const visited = new Uint8Array(width * height);
  const stack = [];
  for (const [cx, cy] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
    const idx = cy * width + cx;
    if (!visited[idx] && isBlackOpaque(idx * 4)) {
      visited[idx] = 1;
      stack.push(idx);
    }
  }

  while (stack.length) {
    const idx = stack.pop();
    const x = idx % width;
    const y = (idx / width) | 0;
    data[idx * 4 + 3] = 0; // clear alpha — this pixel is background, not character

    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (visited[nIdx]) continue;
      if (isBlackOpaque(nIdx * 4)) {
        visited[nIdx] = 1;
        stack.push(nIdx);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
window.stripOpaqueBlackBackground = stripOpaqueBlackBackground;

// Crops a data URL down to the bounding box of its non-transparent pixels
// (plus a small even margin) — the 512x512 render canvas is much bigger
// than any single pose actually needs, and a consistent tight crop across
// every pose/unit keeps their in-game sizes/anchors comparable instead of
// each one carrying a different amount of invisible padding.
async function trimTransparentPadding(dataUrl, margin = 6) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return dataUrl; // fully transparent — nothing to trim

  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(canvas.width - 1, maxX + margin);
  maxY = Math.min(canvas.height - 1, maxY + margin);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  outCanvas.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return outCanvas.toDataURL('image/png');
}
window.trimTransparentPadding = trimTransparentPadding;

window.renderStarterAndSave = async function renderStarterAndSave(filename, axieId, animationName = 'action/idle/normal', poseFraction = 0.016) {
  const rawDataUrl = await window.renderStarter(axieId, animationName, poseFraction);
  const dataUrl = await trimTransparentPadding(rawDataUrl);
  const res = await fetch('/api/save-sprite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, dataUrl }),
  });
  return res.json();
};

// Contact sheet of every starter in the catalog (defaults to all 19).
window.renderStarterGallery = async function renderStarterGallery(animationName = 'action/idle/normal', axieIds = null) {
  const catalog = await getStartersCatalog();
  const entries = axieIds ? catalog.filter((s) => axieIds.includes(s.axieId)) : catalog;

  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';

  for (const entry of entries) {
    const tile = document.createElement('div');
    tile.style.cssText = 'width: 150px; text-align: center; color: #fff; font: 11px sans-serif; background: #222; padding: 4px; border-radius: 4px;';
    const caption = document.createElement('div');
    caption.textContent = `${entry.name} (#${entry.axieId})`;
    tile.appendChild(caption);

    try {
      const dataUrl = await window.renderStarter(entry.axieId, animationName);
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = 'width: 140px; height: 140px; object-fit: contain; background: repeating-conic-gradient(#333 0% 25%, #3a3a3a 0% 50%) 0 0/16px 16px;';
      tile.appendChild(img);
    } catch (e) {
      const errText = document.createElement('div');
      errText.textContent = `error: ${e.message}`;
      errText.style.color = '#f66';
      tile.appendChild(errText);
    }

    gallery.appendChild(tile);
  }

  document.getElementById('status').textContent = `starter gallery done: ${entries.length} tiles`;
};

// --- PvE Chimeras (enemy/mob art) section — same Spine pipeline as the
// Starters above, pointed at Assets/OriginsKit/PvE/Chimeras instead (see
// tools/axie-origins-asset-kit/LICENSE.md — same restricted license as the
// Starters). Every folder here shipped .skel-only (no .json variant), so
// this loader skips the starters loader's JSON/SKEL sniff entirely.
let chimerasCatalog = null;
async function getChimerasCatalog() {
  if (!chimerasCatalog) {
    const data = await fetch('/pve-chimeras.json').then((r) => r.json());
    chimerasCatalog = data.chimeras; // [{ chimeraId, asset: "chimera/<folder>", ... }]
  }
  return chimerasCatalog;
}
window.getChimerasCatalog = getChimerasCatalog;

async function loadChimeraSkeletonData(chimeraFolder) {
  const basePath = `/chimeras/${chimeraFolder}`;
  const atlasText = await fetch(`${basePath}/${chimeraFolder}.atlas`).then((r) => r.text());
  const pageTexture = await Assets.load(`${basePath}/${chimeraFolder}.png`);

  const atlas = new TextureAtlas(atlasText, (_line, callback) => callback(pageTexture.baseTexture));
  const attachmentLoader = new AtlasAttachmentLoader(atlas);

  const buf = await fetch(`${basePath}/${chimeraFolder}.skel`).then((r) => r.arrayBuffer());
  return new SkeletonBinary(attachmentLoader).readSkeletonData(new Uint8Array(buf));
}

window.listChimeraAnimations = async function listChimeraAnimations(chimeraFolder) {
  const skeletonData = await loadChimeraSkeletonData(chimeraFolder);
  return skeletonData.animations.map((a) => ({ name: a.name, duration: a.duration }));
};

// Debug helper: lists every slot name (e.g. to find a "shadow" slot to hide
// before rendering, if one of these skeletons has a heavier/more-opaque
// ground shadow than the Starter Axies did).
window.debugChimeraSlots = async function debugChimeraSlots(chimeraFolder) {
  const skeletonData = await loadChimeraSkeletonData(chimeraFolder);
  return skeletonData.slots.map((s) => s.name);
};

// A handful of chimera skeletons intermittently rendered with a large stray
// opaque-black region using the shared, reused `app` instance — never
// reproduced consistently, and unrelated to any particular animation/slot
// (ruled out via renderChimeraHidingSlots/renderChimeraFixedExtract below),
// pointing at some cross-call WebGL/renderer state issue rather than the
// skeleton data itself. A fresh, fully isolated PIXI Application per call
// sidesteps the whole class of bug — slower (a new WebGL context each
// time) but fine for a tool that only ever batch-generates a couple dozen
// images at once, not a live game.
async function withFreshRenderer(renderFn) {
  const freshApp = new Application({ width: 512, height: 512, backgroundAlpha: 0, resolution: 1 });
  try {
    return await renderFn(freshApp);
  } finally {
    freshApp.destroy(true, { children: true, texture: false, baseTexture: false });
  }
}

// Same poseFraction contract as renderStarter (see that function's comment).
window.renderChimera = async function renderChimera(chimeraFolder, animationName = 'idle', poseFraction = 0.016) {
  document.getElementById('status').textContent = `rendering chimera ${chimeraFolder}...`;

  const skeletonData = await loadChimeraSkeletonData(chimeraFolder);

  const dataUrl = await withFreshRenderer(async (freshApp) => {
    const spine = new Spine(skeletonData);
    spine.position.set(256, 340);
    spine.scale.set(0.4, 0.4);

    const anim = skeletonData.animations.find((a) => a.name === animationName);
    let poseDelta = 0.016;
    if (anim) {
      spine.state.setAnimation(0, animationName, false);
      poseDelta = poseFraction > 1 ? poseFraction : Math.max(0.016, anim.duration * poseFraction);
    }
    freshApp.stage.addChild(spine);
    spine.update(poseDelta);
    freshApp.renderer.render(freshApp.stage);
    return freshApp.renderer.extract.base64(freshApp.stage);
  });

  document.getElementById('status').textContent = `done: chimera ${chimeraFolder}`;
  return dataUrl;
};

// Debug helper: renders with specific slots' attachments forced off, to
// isolate which slot is responsible for an unwanted opaque region (e.g. an
// oversized/overly-dark "shadow" slot, or an ambient smoke/liquid FX slot
// that idles as a solid dark shape rather than something semi-transparent).
window.renderChimeraHidingSlots = async function renderChimeraHidingSlots(chimeraFolder, animationName, poseFraction, hideSlotNames) {
  app.stage.removeChildren();
  const skeletonData = await loadChimeraSkeletonData(chimeraFolder);
  const spine = new Spine(skeletonData);
  spine.position.set(256, 340);
  spine.scale.set(0.4, 0.4);

  const anim = skeletonData.animations.find((a) => a.name === animationName);
  let poseDelta = 0.016;
  if (anim) {
    spine.state.setAnimation(0, animationName, false);
    poseDelta = poseFraction > 1 ? poseFraction : Math.max(0.016, anim.duration * poseFraction);
  }
  spine.update(poseDelta);

  for (const name of hideSlotNames) {
    const slot = spine.skeleton.slots.find((s) => s.data.name === name);
    if (slot) slot.color.a = 0;
  }

  app.stage.addChild(spine);
  app.renderer.render(app.stage);
  return app.renderer.extract.base64(app.stage);
};

// Debug: like renderChimera, but extracts via the renderer's own fixed
// screen/view (no target passed to extract.base64) instead of app.stage's
// computed bounds — testing whether stage-bounds computation is the source
// of the oversized-canvas/stray-opaque-region bug seen on some chimeras.
window.renderChimeraFixedExtract = async function renderChimeraFixedExtract(chimeraFolder, animationName, poseFraction) {
  app.stage.removeChildren();
  const skeletonData = await loadChimeraSkeletonData(chimeraFolder);
  const spine = new Spine(skeletonData);
  spine.position.set(256, 340);
  spine.scale.set(0.4, 0.4);
  const anim = skeletonData.animations.find((a) => a.name === animationName);
  let poseDelta = 0.016;
  if (anim) {
    spine.state.setAnimation(0, animationName, false);
    poseDelta = poseFraction > 1 ? poseFraction : Math.max(0.016, anim.duration * poseFraction);
  }
  app.stage.addChild(spine);
  spine.update(poseDelta);
  app.renderer.render(app.stage);
  return app.renderer.extract.base64(); // no target = the renderer's own fixed screen/view
};

// Fraction of a render's OPAQUE pixels that are near-black — every clean
// chimera render tested tops out around 0.03-0.07 (normal outline/shading
// ink), while a corrupted one (see renderChimeraAndSave's retry loop
// comment) lands around 0.20-0.25.
async function computeBlackFraction(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let black = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 250) {
      opaque++;
      if (data[i] < 15 && data[i + 1] < 15 && data[i + 2] < 15) black++;
    }
  }
  return opaque ? black / opaque : 0;
}
window.computeBlackFraction = computeBlackFraction;

window.renderChimeraAndSave = async function renderChimeraAndSave(filename, chimeraFolder, animationName = 'idle', poseFraction = 0.016) {
  // Some renders — cause unconfirmed; likely WebGL context-churn/texture-
  // upload timing rather than anything about the skeleton data itself,
  // since it's nondeterministic across identical calls (see
  // withFreshRenderer's comment) — come back with a large stray opaque-
  // black region instead of a clean silhouette. computeBlackFraction gives
  // a cheap, reliable tell (~0.03-0.07 clean vs ~0.20-0.25 corrupted), so
  // retry a few times whenever it's suspiciously high rather than saving a
  // bad frame.
  const MAX_ATTEMPTS = 5;
  const BLACK_FRACTION_THRESHOLD = 0.12;
  let rawDataUrl;
  let blackFraction = 1;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    rawDataUrl = await window.renderChimera(chimeraFolder, animationName, poseFraction);
    blackFraction = await computeBlackFraction(rawDataUrl);
    if (blackFraction < BLACK_FRACTION_THRESHOLD) break;
    console.warn(
      `renderChimeraAndSave: ${chimeraFolder}/${animationName} looked corrupted (blackFraction=${blackFraction.toFixed(3)}), retrying (attempt ${attempt + 1}/${MAX_ATTEMPTS})`,
    );
  }

  const cleanedDataUrl = await stripOpaqueBlackBackground(rawDataUrl);
  const dataUrl = await trimTransparentPadding(cleanedDataUrl);
  const res = await fetch('/api/save-sprite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, dataUrl }),
  });
  const json = await res.json();
  return { ...json, blackFraction };
};

document.getElementById('status').textContent = 'ready — call window.renderAxie(className, partValue, animationName)';
