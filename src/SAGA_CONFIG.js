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

export const SAGA_CONFIG = [
  {
    id: 'saga1',
    displayName: 'Saga 1: First Steps',
    description: 'The original 10-stage campaign — basic, fast, tank, ranged and AoE threats.',
    color: 0x3388cc,
  },
  {
    id: 'saga2',
    displayName: 'Saga 2: New Frontiers',
    description: 'Swarm, Sniper, Support and Guardian enter the field.',
    color: 0xcc8833,
  },
  {
    id: 'saga3',
    displayName: 'Saga 3: Titan Rising',
    description: 'The full 10-unit roster clashes, capped by the Titan-class threat.',
    color: 0x993388,
  },
];
