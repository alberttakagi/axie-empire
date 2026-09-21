// Generates bronze/silver/gold duotone versions of each source charm icon
// in input/ (one file per treasure set, any name) into output/, as
// "<basename>_bronze.png", "<basename>_silver.png", "<basename>_gold.png".
//
// Why duotone (luminance-remapped) instead of a flat Phaser setTint
// multiply: setTint just multiplies the source RGB by a constant color,
// which on a full-color icon muddies/darkens everything uniformly instead
// of looking like a different material. Remapping each pixel's luminance
// onto a per-tier shadow->base->highlight gradient (alpha untouched)
// produces a convincing "same shape, cast in bronze/silver/gold" result,
// the same technique real medal/trophy icon tiers use.
//
// Usage: npm install && npm run gen (from this directory).

import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, 'input');
const OUTPUT_DIR = path.join(__dirname, 'output');

// [R, G, B] stops. Picked to roughly match TreasureScene.js's existing
// TIER_COLORS medal dots (bronze 0xcd7f32, silver 0xc0c0c0, gold 0xffd700)
// at the midtone, with a darker shadow and a brighter highlight on either
// side for a metallic sheen instead of a flat fill.
const TIERS = {
  bronze: { shadow: [59, 32, 16], base: [165, 101, 31], highlight: [232, 179, 120] },
  silver: { shadow: [52, 56, 63], base: [168, 173, 181], highlight: [245, 247, 250] },
  gold: { shadow: [74, 52, 0], base: [209, 160, 33], highlight: [255, 241, 184] },
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// t in [0,1]: shadow at 0, base at 0.5, highlight at 1.
function gradientColor(stops, t) {
  if (t <= 0.5) {
    const u = t / 0.5;
    return stops.shadow.map((c, i) => lerp(c, stops.base[i], u));
  }
  const u = (t - 0.5) / 0.5;
  return stops.base.map((c, i) => lerp(stops.base[i], stops.highlight[i], u));
}

async function tintImage(inputPath, tierName, outputPath) {
  const stops = TIERS[tierName];
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const [nr, ng, nb] = gradientColor(stops, lum);
    out[i] = Math.round(nr);
    out[i + 1] = Math.round(ng);
    out[i + 2] = Math.round(nb);
    out[i + 3] = a;
  }

  await sharp(out, { raw: { width, height, channels } }).png().toFile(outputPath);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const entries = (await readdir(INPUT_DIR)).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));

  if (entries.length === 0) {
    console.log(`No source images in ${INPUT_DIR} — drop charm icons there first.`);
    return;
  }

  for (const file of entries) {
    const base = path.parse(file).name;
    const inputPath = path.join(INPUT_DIR, file);
    for (const tier of Object.keys(TIERS)) {
      const outputPath = path.join(OUTPUT_DIR, `${base}_${tier}.png`);
      await tintImage(inputPath, tier, outputPath);
      console.log(`${file} -> ${path.basename(outputPath)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
