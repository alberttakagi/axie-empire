// Treasure Sets (bible §A.6.3) — the game's core "why keep replaying old
// stages" loop. Real Battle Cats groups ~48 stages per saga-chapter into a
// dozen-ish named sets; with only 10 stages total in this build, that's
// scaled down to 2 sets of 5 (roughly "the easier half" / "the harder
// half") rather than trying to force the real game's exact proportions.
//
// Each set's `bonus` is a single stat effect that scales linearly from 0 at
// 0% set completion up to `valueAtMax` at 100% completion (every stage in
// the set at gold tier) — see Treasure.js's getSetCompletion/getBonusValue.
// Real Battle Cats has ~10 different bonus categories per saga; this build
// implements two illustrative ones (income-rate and unit-HP) rather than
// the full roster, since the point is demonstrating the SYSTEM (roll →
// ratchet → completion% → permanent bonus), not authoring a dozen bonus
// types for a 10-stage demo.
//
// `type` values GameScene actually reads (see Treasure.js's getBonusPercent):
//   'moneyIncomePercent' — added to Worker Cat's income rate (GameScene's
//                          getMoneyAccrualPerSec), bible's "Energy Drink."
//   'unitHpPercent'      — multiplies every spawned player unit's HP on top
//                          of its level/evolution stats (bible's "Legendary
//                          Cat Shield").

export const TREASURE_SETS = [
  {
    id: 'set1',
    name: 'Iron Resolve',
    stageIds: ['stage1', 'stage2', 'stage3', 'stage4', 'stage5'],
    bonus: { type: 'moneyIncomePercent', valueAtMax: 30 },
  },
  {
    id: 'set2',
    name: 'Golden Dominion',
    stageIds: ['stage6', 'stage7', 'stage8', 'stage9', 'stage10'],
    bonus: { type: 'unitHpPercent', valueAtMax: 20 },
  },
  // Saga expansion (bible §A.6.1) — same 2-sets-of-5 pattern repeated for
  // each new saga, with valueAtMax creeping up alongside the saga's own
  // rising difficulty (later Treasure is worth more, same as later Base
  // Upgrades cost more).
  {
    id: 'set3',
    name: "Vanguard's Line",
    stageIds: ['stage11', 'stage12', 'stage13', 'stage14', 'stage15'],
    bonus: { type: 'moneyIncomePercent', valueAtMax: 35 },
  },
  {
    id: 'set4',
    name: 'Reinforced Bulwark',
    stageIds: ['stage16', 'stage17', 'stage18', 'stage19', 'stage20'],
    bonus: { type: 'unitHpPercent', valueAtMax: 25 },
  },
  {
    id: 'set5',
    name: "Titan's Wake",
    stageIds: ['stage21', 'stage22', 'stage23', 'stage24', 'stage25'],
    bonus: { type: 'moneyIncomePercent', valueAtMax: 40 },
  },
  {
    id: 'set6',
    name: 'Ascendant Legacy',
    stageIds: ['stage26', 'stage27', 'stage28', 'stage29', 'stage30'],
    bonus: { type: 'unitHpPercent', valueAtMax: 30 },
  },
];

// Which set (if any) a given stage belongs to — used by GameScene/
// StageSelectScene without every caller re-deriving it from TREASURE_SETS.
export function findSetForStage(stageId) {
  return TREASURE_SETS.find((set) => set.stageIds.includes(stageId));
}
