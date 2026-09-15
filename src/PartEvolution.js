// Per-part cosmetic evolution: every 10 levels, one more of a unit's 6 Axie
// body parts "evolves" — deterministic, not random, and purely a function
// of the unit's current level (no separate currency/save-state needed,
// unlike the existing Evolved/True Form stat tiers in PROGRESSION_CONFIG.js,
// which this is independent of).
//
// What "evolves" actually looks like, in two layers (see GameScene's
// spawnUnit):
//   1. The FIRST milestone (level 10) swaps the unit to its real, official
//      evolved ("awakened") art — Sky Mavis's own bodyStage 1 Spine
//      skeleton for that Starter (see UNIT_CONFIG.js's `sprite.evolved`
//      field), confirmed via the Origins Asset Kit's own catalog note:
//      "-1 folders are body stage 1 (awakened)". This is real, hand-drawn
//      art, not a substitute — one specific part (different per Starter)
//      is genuinely redrawn bigger/richer. Only ONE such evolved look
//      exists per Starter, though, not a chosen sequence of 6 — an early
//      attempt to reconstruct 6 progressive stages via the generic mixer's
//      own "Lv2" part catalog didn't pan out: that catalog only covers
//      even-numbered part values, and a real Starter's actual gene-decoded
//      parts use different (often odd) values not present in it.
//   2. Every milestone AFTER the first (levels 20-60) has no further real
//      art to switch to, so instead layers an escalating golden glow
//      (Phaser's postFX Glow) on top of that same evolved sprite, to keep
//      signaling continued progress without inventing mismatched art.
// A unit with no real evolved art at all (currently just Titan/Temujin —
// its Starter has no bodyStage 1 variant) stays on its base sprite for
// every level, using the glow alone from the first milestone onward.
export const MAX_EVOLVED_PARTS = 6;
export const LEVELS_PER_PART_EVOLUTION = 10;

export function getEvolvedPartCount(level) {
  return Math.min(MAX_EVOLVED_PARTS, Math.floor(level / LEVELS_PER_PART_EVOLUTION));
}
