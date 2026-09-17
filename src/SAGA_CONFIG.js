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

// Saga descriptions updated for the real Empire of Cats Chapter 1 rebuild
// (see STAGE_CONFIG.js/docs/BATTLE_CATS_MAPPING.md): saga1 is now the full
// real 48-stage chapter, and every Basic-tier lineage unlocks WITHIN it
// (the last, Titan Cat, by stage 43) — matching real Battle Cats, where
// saga2/saga3 don't introduce anything new at all, they're the SAME map
// replayed at higher enemy strength (see STAGE_CONFIG's own saga2/3 note).
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
    // NOTE: still the smaller, pre-rebuild 10-stage approximation of "the
    // same map again, harder" — hasn't had its own real-48-stage pass yet
    // (see docs/BATTLE_CATS_MAPPING.md's known gaps).
    description: 'The same battlefield again — every enemy hitting noticeably harder.',
    color: 0xcc8833,
  },
  {
    id: 'saga3',
    displayName: 'Saga 3: Empire of Axies, Chapter 3',
    // Same note as saga2 above.
    description: 'The same battlefield a third time, at the campaign’s toughest enemy strength yet.',
    color: 0x993388,
  },
];
