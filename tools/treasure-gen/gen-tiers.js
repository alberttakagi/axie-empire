// Generates bronze/silver/gold GLOW versions of each source charm icon in
// input/ (one file per treasure set, any name) into output/, as
// "<basename>_bronze.png", "<basename>_silver.png", "<basename>_gold.png".
//
// Earlier version of this script recolored the whole icon (a duotone
// luminance remap). User feedback: keep the charm's own original colors —
// add a bronze/silver/gold outline/glow around it instead. So each output
// is the untouched source icon, composited on top of two halo layers built
// from its own alpha silhouette:
//   - "rim": the alpha mask blurred a little then re-solidified (boosted
//     back toward opaque) — an approximate dilation (sharp has no
//     morphological dilate op), giving a crisp colored ring right at the
//     icon's edge.
//   - "glow": the rim blurred a lot more, for a soft ambient falloff
//     outside the rim.
// Composited back-to-front (glow, then rim, then the original icon
// unchanged) with standard alpha-over math, so the charm's real colors are
// never touched — only pixels outside/at its silhouette gain color.
//
// Usage: npm install && npm run gen (from this directory).

import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, 'input');
const OUTPUT_DIR = path.join(__dirname, 'output');

// [R, G, B]. Matches TreasureScene.js's existing TIER_COLORS medal-ring
// colors (bronze 0xcd7f32, silver 0xc0c0c0, gold 0xffd700), pushed slightly
// brighter/more saturated since these now only cover a thin rim + glow
// instead of the whole icon, where a duller tone would barely read.
const TIER_COLORS = {
  bronze: [196, 114, 45],
  silver: [206, 213, 224],
  gold: [255, 197, 61],
};

const RIM_BLUR = 2; // small blur used to thicken the mask before re-solidifying it
const RIM_BOOST = 3; // re-solidify factor — approximates a morphological dilate
const GLOW_BLUR = 6; // wide blur for the soft outer falloff
const GLOW_BOOST = 2.2; // brighten the glow so it reads at icon size

// Most source charm art is cropped tight — many touch the canvas edge on
// at least one side (checked directly: most have 0px of transparent
// margin on top and/or bottom). Without extra padding the glow has nowhere
// to go and gets hard-clipped by the canvas edge. Extend the canvas by this
// fraction of its smaller dimension on every side before drawing the glow.
const EXTEND_RATIO = 0.1;

// sharp silently upconverts a single-channel raw buffer to 3-channel RGB
// somewhere in the blur pipeline unless the colourspace is pinned back to
// greyscale first — without this, .raw()'s output buffer is 3x the
// expected size and every downstream pixel read is misaligned (visible as
// diagonal striping and the glow flooding the whole canvas).
function blurAlpha(alphaBuf, width, height, sigma) {
  return sharp(alphaBuf, { raw: { width, height, channels: 1 } })
    .toColourspace('b-w')
    .blur(sigma)
    .raw()
    .toBuffer();
}

function boost(buf, factor) {
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = Math.min(255, Math.round(buf[i] * factor));
  return out;
}

async function glowImage(inputPath, tierName, outputPath) {
  const color = TIER_COLORS[tierName];
  const probe = await sharp(inputPath).ensureAlpha().metadata();
  const pad = Math.round(Math.min(probe.width, probe.height) * EXTEND_RATIO);
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const pixelCount = width * height;

  const srcAlpha = Buffer.alloc(pixelCount);
  for (let p = 0; p < pixelCount; p++) srcAlpha[p] = data[p * channels + 3];

  const rim = boost(await blurAlpha(srcAlpha, width, height, RIM_BLUR), RIM_BOOST);
  const glow = boost(await blurAlpha(rim, width, height, GLOW_BLUR), GLOW_BOOST);

  const out = Buffer.alloc(data.length);
  for (let p = 0; p < pixelCount; p++) {
    const i = p * channels;
    const srcA = data[i + 3] / 255;
    const rimA = rim[p] / 255;
    const glowA = glow[p] / 255;

    // glow (bottom layer)
    let r = color[0];
    let g = color[1];
    let b = color[2];
    let a = glowA;

    // rim over glow
    r = color[0] * rimA + r * (1 - rimA);
    g = color[1] * rimA + g * (1 - rimA);
    b = color[2] * rimA + b * (1 - rimA);
    a = rimA + a * (1 - rimA);

    // original icon over (glow + rim) — untouched colors on top
    r = data[i] * srcA + r * (1 - srcA);
    g = data[i + 1] * srcA + g * (1 - srcA);
    b = data[i + 2] * srcA + b * (1 - srcA);
    a = srcA + a * (1 - srcA);

    out[i] = Math.round(r);
    out[i + 1] = Math.round(g);
    out[i + 2] = Math.round(b);
    out[i + 3] = Math.round(a * 255);
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
    for (const tier of Object.keys(TIER_COLORS)) {
      const outputPath = path.join(OUTPUT_DIR, `${base}_${tier}.png`);
      await glowImage(inputPath, tier, outputPath);
      console.log(`${file} -> ${path.basename(outputPath)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
