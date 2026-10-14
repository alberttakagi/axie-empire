// Saga/Chapter structure (bible §A.6.1) — the reference game groups its
// hundreds of stages into named chapters ("The Story of Legend" Ch.1/2/3,
// etc.), each cleared in full before the next unlocks, with later chapters
// reusing earlier ones' enemy roster at a higher power level rather than
// introducing an entirely new cast every time. STAGE_CONFIG.js stays ONE
// flat array (each entry tagged with the `saga` id below) specifically so
// its existing index-based sequential-unlock logic — "this stage unlocks
// once the previous STAGE_CONFIG entry is cleared" — keeps working
// completely unchanged across saga boundaries; this file only adds the
// grouping/display layer on top for SagaSelectScene.
//
// `id`            stable key, matches every STAGE_CONFIG entry's own `saga`
//                  field.
// `displayName`   Saga Select screen label.
// `description`   one-line flavor/summary shown under the name.
// `color`         Saga Select tile accent (mirrors STAGE_CONFIG's own
//                  difficulty-color convention).

// Saga descriptions updated for the real Empire of Cats Chapter 1-3 rebuild
// (see STAGE_CONFIG.js/docs/BATTLE_CATS_MAPPING.md): saga1 is the full real
// 48-stage chapter, and every Basic-tier lineage unlocks WITHIN it (the
// last, Titan Cat, by stage 43). saga2/saga3 now also match real Battle
// Cats exactly — the SAME 48 maps replayed at a flat, real per-chapter
// enemy strength magnification (150%/400%, guide Chapter 04's own table),
// not new content and not a per-stage climbing curve like this build's
// earlier (wrong) approximation used.
export const SAGA_CONFIG = [
  {
    id: 'saga1',
    displayName: 'Saga 1: Moonwood Rising',
    description: 'The lotus blooms, the wolves howl, and the Empire digs in its tiny heels.',
    color: 0x3388cc,
  },
  {
    id: 'saga2',
    displayName: 'Saga 2: Tides of the Serpent\'s Maw',
    description: 'From lagoon to gearworks, something hungry is stirring beneath the waves.',
    color: 0xcc8833,
  },
  {
    id: 'saga3',
    displayName: 'Saga 3: Whispers of the Forgotten Temple',
    description: 'Old stones remember. The Chimera would rather they didn\'t.',
    color: 0x993388,
  },
];

// Lore-inspired chapter names (Round 2): each saga's 48 stages are six
// 8-stage chapters (matches Backdrop.js's chapter backgrounds).
export const CHAPTER_NAMES = ["Lotus Meadows", "Wildfang Thicket", "Amberleaf Valley", "Duskglow Marches", "Shimmering Shells", "Shrine of the Lotus Moon", "Lunid Lagoon", "Buccaneer Beach", "Harvest Moon Wilds", "Mysticland Rifts", "Nightmarescape Edge", "Clockwork Bastion", "The Forgotten Temple", "Sky Foundry", "Prism Hollows", "Silverthorne Woods", "Garuda Grove", "Nirvana Heights"];

export function getStageChapterName(stageId) {
  const num = parseInt(String(stageId).replace('stage', ''), 10);
  if (!Number.isFinite(num) || num < 1) return null;
  return CHAPTER_NAMES[Math.floor((num - 1) / 8)] ?? null;
}
