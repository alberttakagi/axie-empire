// Per-unit cosmetic evolution: reaching level 10 unlocks a unit's real,
// official evolved ("awakened") Starter art where one exists (see
// UNIT_CONFIG.js's `sprite.evolved` field) — a single one-time milestone,
// not a repeating stage counter. Only ONE real evolved form exists per
// Starter (confirmed via the Origins Asset Kit's own catalog note: "-1
// folders are body stage 1 (awakened)"), so there's nothing further to
// unlock past this one level threshold — an earlier attempt to build a
// repeating multi-stage version of this via the generic mixer's own "Lv2"
// part catalog didn't pan out, since that catalog only covers part values
// a real Starter's own genes don't actually use.
//
// See GameScene's spawnUnit for how this plays out visually: a unit with
// real evolved art swaps to it at this milestone (plus a subtle glow); a
// unit with none (currently just Titan/Temujin) gets the glow alone.
export const PART_EVOLUTION_LEVEL = 10;

export function hasReachedPartEvolution(level) {
  return level >= PART_EVOLUTION_LEVEL;
}
