// Live Axie Mixer: renders an Axie Lab genome in the player's browser with
// the official @axieinfinity/mixer (gene data → Spine skeleton, part art
// streamed from Axie's CDN) + PixiJS/pixi-spine, then hands the frames to
// Phaser as ordinary textures. Everything heavy (Pixi, pixi-spine, the
// mixer and its ~6 MB of gene/animation data) is loaded with dynamic
// import() the first time it's needed, so players who never open the Lab
// don't download it.
//
// Output matches the shipped-unit convention (see SpriteIcon.js):
//   unit_<id>_idle / _attack / _hit     single-frame textures
//   unit_<id>_run / _idleanim           multi-frame textures, frames "0".."n"
// with every frame cropped to ONE shared box so poses never jitter.

const AXIE_IMAGES_URL = 'https://axiecdn.axieinfinity.com/mixer-stuffs/v6/';
const FPS = 24; // must match GameScene/SpriteIcon ANIMATION_FPS
const CANVAS = { width: 480, height: 540, x: 240, y: 390, scale: 0.3 };
const MAX_IDLE_FRAMES = 48;

let libsPromise = null;

function loadLibs() {
  libsPromise ||= (async () => {
    const [pixi, spineMod, runtime, mixer, genes, samples, variants, animations] = await Promise.all([
      import('pixi.js'),
      import('pixi-spine'),
      import('@pixi-spine/runtime-3.8'),
      import('@axieinfinity/mixer'),
      import('@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-genes.json'),
      import('@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-samples.json'),
      import('@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-variant.json'),
      import('@axieinfinity/mixer/dist/data/axie-2d-v3-stuff-animations.json'),
    ]);
    mixer.initAxieMixer(genes.default, samples.default, variants.default, animations.default);
    const app = new pixi.Application({
      width: CANVAS.width, height: CANVAS.height, backgroundAlpha: 0, resolution: 1,
      preserveDrawingBuffer: true, autoStart: false,
    });
    app.ticker.stop();
    return { pixi, spineMod, runtime, mixer, app };
  })();
  libsPromise.catch(() => { libsPromise = null; }); // allow a retry after a network failure
  return libsPromise;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// `evolved`: every part at stage 1 — the mixer's own Lv2 ("evolved part")
// skins, used for the Lab Axie's True Form.
function genomeToCombo(mixer, genome, evolved = false) {
  const bodyStructure = {
    class: cap(genome.bodyClass), // the mixer's gene tables use capitalized class names
    body: [0, 0, 0],
    bodySkin: 0,
    primaryColors: [0, 0, 0],
    secondaryColors: [0, 0, 0],
    parts: {},
  };
  for (const [type, part] of Object.entries(genome.parts)) {
    bodyStructure.parts[cap(type)] = {
      stageCap: 2, stage: evolved ? 1 : 0, reservation: 0, skinInheritability: true, skin: 0,
      groups: [0, 1, 2].map(() => ({ class: cap(part.class), value: part.value })),
    };
  }
  return mixer.genesStuff.getAdultCombo(bodyStructure);
}

async function buildSkeletonData(libs, genome, evolved = false) {
  const { mixer, pixi, spineMod, runtime } = libs;
  const combo = genomeToCombo(mixer, genome, evolved);
  const { error, skeletonDataAsset, variant } = mixer.getAxieSpineFromCombo(combo, genome.color || 0, false);
  if (error) throw new Error(`Mixer: ${error}`);
  const attachments = skeletonDataAsset.skins[0].attachments;
  const shift = mixer.getAxieColorPartShift(variant);
  const jobs = [];
  for (const slot in attachments) {
    for (const name in attachments[slot]) {
      const path = attachments[slot][name].path;
      const url = AXIE_IMAGES_URL + mixer.getVariantAttachmentPath(slot, path, variant, shift);
      jobs.push(pixi.Assets.load(url).then((texture) => [path, texture]).catch(() => null));
    }
  }
  const textures = {};
  for (const rec of await Promise.all(jobs)) if (rec) textures[rec[0]] = rec[1];
  if (!Object.keys(textures).length) throw new Error('Could not reach the Axie art CDN');
  const atlas = new spineMod.TextureAtlas();
  atlas.addTextureHash(textures, false);
  const json = new runtime.SkeletonJson(new runtime.AtlasAttachmentLoader(atlas));
  return json.readSkeletonData(skeletonDataAsset);
}

function findAnim(skeletonData, preferred, pattern) {
  const anims = skeletonData.animations;
  return anims.find((a) => a.name === preferred) || anims.find((a) => pattern.test(a.name)) || anims[0];
}

// Renders one pose into a fresh full-size canvas (fixed coordinate system,
// so frames can be union-cropped afterwards).
function renderPose(libs, skeletonData, anim, timeSec) {
  const { app, spineMod } = libs;
  app.stage.removeChildren();
  const spine = new spineMod.Spine(skeletonData);
  spine.position.set(CANVAS.x, CANVAS.y);
  spine.scale.set(CANVAS.scale);
  spine.state.setAnimation(0, anim.name, false);
  app.stage.addChild(spine);
  spine.update(Math.max(0.016, timeSec));
  app.renderer.render(app.stage);
  const out = document.createElement('canvas');
  out.width = CANVAS.width;
  out.height = CANVAS.height;
  out.getContext('2d').drawImage(app.view, 0, 0);
  spine.destroy();
  return out;
}

function sequence(libs, skeletonData, anim, maxFrames) {
  const count = Math.min(maxFrames, Math.max(2, Math.round(anim.duration * FPS)));
  const frames = [];
  for (let i = 0; i < count; i++) frames.push(renderPose(libs, skeletonData, anim, (anim.duration * i) / count));
  return frames;
}

function alphaBounds(canvas) {
  const { width, height } = canvas;
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let minX = width; let minY = height; let maxX = -1; let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

function crop(canvas, b, pad = 4) {
  const x = Math.max(0, b.minX - pad);
  const y = Math.max(0, b.minY - pad);
  const w = Math.min(canvas.width, b.maxX + pad + 1) - x;
  const h = Math.min(canvas.height, b.maxY + pad + 1) - y;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return out;
}

// → { idle: [canvas], run: [canvas], attack: canvas, hit: canvas, attackSeq: [canvas], attackDurationMs }
export async function renderGenomeFrames(genome, { evolved = false } = {}) {
  const libs = await loadLibs();
  const skeletonData = await buildSkeletonData(libs, genome, evolved);
  const idleAnim = findAnim(skeletonData, 'action/idle/normal', /idle/);
  const runAnim = findAnim(skeletonData, 'draft/run-origin', /run/);
  const attackAnim = findAnim(skeletonData, 'attack/melee/horn-gore', /attack\/melee/);
  const hitAnim = findAnim(skeletonData, 'defense/hit-by-normal', /hit/);

  const idle = sequence(libs, skeletonData, idleAnim, MAX_IDLE_FRAMES);
  const run = sequence(libs, skeletonData, runAnim, 30);
  const attack = renderPose(libs, skeletonData, attackAnim, attackAnim.duration * 0.45);
  const attackSeq = sequence(libs, skeletonData, attackAnim, 30);
  const hit = renderPose(libs, skeletonData, hitAnim, hitAnim.duration * 0.3);

  // One shared box across every pose: idle/run/attack/hit stay aligned.
  let box = null;
  for (const c of [...idle, ...run, ...attackSeq, attack, hit]) {
    const b = alphaBounds(c);
    if (!b) continue;
    box = box ? { minX: Math.min(box.minX, b.minX), minY: Math.min(box.minY, b.minY), maxX: Math.max(box.maxX, b.maxX), maxY: Math.max(box.maxY, b.maxY) } : b;
  }
  if (!box) throw new Error('Mixer rendered an empty Axie');
  return {
    idle: idle.map((c) => crop(c, box)),
    run: run.map((c) => crop(c, box)),
    attack: crop(attack, box),
    attackSeq: attackSeq.map((c) => crop(c, box)),
    attackDurationMs: Math.round(attackAnim.duration * 1000),
    hit: crop(hit, box),
  };
}

// Registers frames as Phaser textures under the shipped-unit key scheme.
// Replaces any previous textures for this id (e.g. after a re-design).
// Game objects (in any running scene) currently showing texture `key`, so
// they can be re-pointed instead of left holding a destroyed texture.
function usersOf(game, key) {
  const found = [];
  const walk = (list) => {
    for (const o of list) {
      if (o.texture?.key === key) found.push([o, o.frame?.name]);
      if (o.list) walk(o.list);
    }
  };
  for (const scene of game?.scene?.getScenes(true) || []) walk(scene.children.list);
  return found;
}

function replaceTexture(textureManager, key, create) {
  const users = usersOf(textureManager.game, key);
  if (textureManager.exists(key)) textureManager.remove(key);
  const tex = create();
  for (const [obj, frame] of users) {
    if (!obj.active) continue;
    obj.setTexture(key, tex.has(String(frame)) ? frame : (tex.has('0') ? '0' : '__BASE'));
  }
  return tex;
}

export function registerFramesAsTextures(textureManager, id, frames) {
  const single = (key, canvas) => {
    replaceTexture(textureManager, key, () => textureManager.addCanvas(key, canvas));
  };
  const strip = (key, list) => {
    const w = list[0].width;
    const h = list[0].height;
    const sheet = document.createElement('canvas');
    sheet.width = w * list.length;
    sheet.height = h;
    const ctx = sheet.getContext('2d');
    list.forEach((c, i) => ctx.drawImage(c, i * w, 0));
    replaceTexture(textureManager, key, () => {
      const tex = textureManager.addCanvas(key, sheet);
      list.forEach((_, i) => tex.add(String(i), 0, i * w, 0, w, h));
      return tex;
    });
  };
  single(`unit_${id}_idle`, frames.idle[0]);
  single(`unit_${id}_attack`, frames.attack);
  single(`unit_${id}_hit`, frames.hit);
  strip(`unit_${id}_idleanim`, frames.idle);
  strip(`unit_${id}_run`, frames.run);
  if (frames.attackSeq?.length) strip(`unit_${id}_attackanim`, frames.attackSeq);
}

