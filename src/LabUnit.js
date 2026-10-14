import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { isValidGenome, deriveUnitStats, defaultName } from './AxieGenome.js';
import { ATTACK_ANIM_META } from './ATTACK_ANIM_META.js';

// The player's Axie Lab design: saved genome → live UNIT_CONFIG.lab stats,
// and (via MixerRuntime, loaded lazily) live Mixer textures for battle.
const GENOME_KEY = 'axieEmpireLabGenome';

export function loadLabGenome() {
  try {
    const g = JSON.parse(localStorage.getItem(GENOME_KEY));
    return isValidGenome(g) ? g : null;
  } catch {
    return null;
  }
}

export function applyLabGenome(genome) {
  if (!genome) return;
  Object.assign(UNIT_CONFIG.lab, deriveUnitStats(genome), {
    characterName: genome.name || defaultName(genome),
    displayName: 'Lab Axie',
  });
  // Clear abilities a previous design may have had.
  if (!deriveUnitStats(genome).waveOnHit) delete UNIT_CONFIG.lab.waveOnHit;
  if (!deriveUnitStats(genome).surgeOnHit) delete UNIT_CONFIG.lab.surgeOnHit;
}

export function saveLabGenome(genome) {
  try {
    localStorage.setItem(GENOME_KEY, JSON.stringify(genome));
  } catch {
    // Storage unavailable — the design lives for this session only.
  }
  applyLabGenome(genome);
  labTexturesFor = null; // force a re-render with the new look
}

// Apply on import so every screen sees the saved design's stats.
applyLabGenome(loadLabGenome());

// ---- Live textures ----
let labTexturesFor = null; // JSON of the genome the current textures show
let pending = null;

// Renders the saved design with the live Mixer and registers its textures
// (unit_lab_*). Resolves true when live art is in place, false if there's
// no design or the render failed (the fallback art is used instead).
export function ensureLabTextures(game) {
  const genome = loadLabGenome();
  if (!genome) return Promise.resolve(false);
  const sig = JSON.stringify(genome);
  if (labTexturesFor === sig && game.textures.exists('unit_lab_idleanim')) return Promise.resolve(true);
  if (pending) return pending;
  pending = (async () => {
    try {
      const { renderGenomeFrames, registerFramesAsTextures } = await import('./MixerRuntime.js');
      const frames = await renderGenomeFrames(genome);
      registerFramesAsTextures(game.textures, 'lab', frames);
      // Frame counts drive GameScene's run cycle / SpriteIcon's idle loop.
      UNIT_CONFIG.lab.sprite.run = frames.run.map((_, i) => `mixer:run:${i}`);
      UNIT_CONFIG.lab.sprite.idleAnim = frames.idle.map((_, i) => `mixer:idle:${i}`);
      if (frames.attackSeq?.length) {
        UNIT_CONFIG.lab.sprite.attackAnim = frames.attackSeq.map((_, i) => `mixer:attack:${i}`);
        // Every live frame shares one crop box, so the anchor is identical
        // in idle and attack frames — the origin stays centered.
        const size = { w: frames.idle[0].width, h: frames.idle[0].height };
        ATTACK_ANIM_META.lab = {
          frames: frames.attackSeq.length, durationMs: frames.attackDurationMs, impact: 0.45,
          anchor: { x: 0, y: 0 }, size, idleAnchor: { x: 0, y: 0 }, idleSize: size,
        };
      }
      labTexturesFor = sig;
      return true;
    } catch (e) {
      console.warn('Axie Lab: live Mixer render failed, using fallback art', e);
      return false;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

export function hasLiveLabTextures() {
  return labTexturesFor !== null;
}
