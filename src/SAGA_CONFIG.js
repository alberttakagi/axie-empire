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
    displayName: 'Saga 1: Empire of Axies',
    description: 'The real 48-stage campaign — every Basic-tier lineage unlocks here, ending with Kaoru-kun.',
    color: 0x3388cc,
  },
  {
    id: 'saga2',
    displayName: 'Saga 2: Empire of Axies, Chapter 2',
    description: 'The same 48 battlefields again, every enemy at a real 150% strength.',
    color: 0xcc8833,
  },
  {
    id: 'saga3',
    displayName: 'Saga 3: Empire of Axies, Chapter 3',
    description: 'The same 48 battlefields a third time, at the campaign’s real 400% enemy strength.',
    color: 0x993388,
  },
];
