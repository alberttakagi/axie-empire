// Per-part cosmetic evolution: every 10 levels, one more of a unit's 6 Axie
// body parts "evolves" — deterministic (always this fixed order), not
// random, and purely a function of the unit's current level (no separate
// currency/save-state needed, unlike the existing Evolved/True Form stat
// tiers in PROGRESSION_CONFIG.js, which this is independent of).
//
// Real per-part "Lv2" art exists in @axieinfinity/mixer's data for its own
// generic combo catalog, but NOT for the specific (mostly odd-numbered)
// part values each Starter Axie's actual gene string uses — confirmed by
// decoding a Starter's real genes and checking the bundled catalog only
// covers even values 2-12. So rather than swapping in mismatched
// substitute part art, an evolved part is shown as a golden glow on the
// unit's real, unmodified sprite (see GameScene's fitSpriteToRadius call
// site) — until/unless real per-part evolved art is hand-curated later.
export const PART_EVOLUTION_ORDER = ['Eyes', 'Ears', 'Horn', 'Mouth', 'Back', 'Tail'];
export const MAX_EVOLVED_PARTS = PART_EVOLUTION_ORDER.length;
export const LEVELS_PER_PART_EVOLUTION = 10;

export function getEvolvedPartCount(level) {
  return Math.min(MAX_EVOLVED_PARTS, Math.floor(level / LEVELS_PER_PART_EVOLUTION));
}

// The single most-recently-evolved part (e.g. for a badge label), or null
// if none have evolved yet.
export function getLatestEvolvedPart(level) {
  const count = getEvolvedPartCount(level);
  return count > 0 ? PART_EVOLUTION_ORDER[count - 1] : null;
}
