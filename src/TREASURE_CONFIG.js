// Treasure Sets (bible §A.6.3) — the game's core "why keep replaying old
// stages" loop. Real Battle Cats groups each 48-stage chapter into a
// dozen-ish named sets — saga1 now matches that shape exactly (12 sets of
// 4 stages, stage1-48); saga2/saga3 stay the earlier smaller-scale
// approximation (2 sets of 5 each) since those chapters haven't had their
// own real-data rebuild yet (see docs/BATTLE_CATS_MAPPING.md's known gaps).
//
// Each set's `bonus` is a single stat effect that scales linearly from 0 at
// 0% set completion up to `valueAtMax` at 100% completion (every stage in
// the set at gold tier) — see Treasure.js's getSetCompletion/getBonusValue.
// Real Battle Cats has ~10 different bonus categories per saga; this build
// implements two illustrative ones (income-rate and unit-HP) rather than
// the full roster, since the point is demonstrating the SYSTEM (roll →
// ratchet → completion% → permanent bonus), not authoring a dozen bonus
// types.
//
// `type` values GameScene actually reads (see Treasure.js's getBonusPercent):
//   'moneyIncomePercent' — added to Worker Cat's income rate (GameScene's
//                          getMoneyAccrualPerSec), bible's "Energy Drink."
//   'unitHpPercent'      — multiplies every spawned player unit's HP on top
//                          of its level/evolution stats (bible's "Legendary
//                          Cat Shield").

export const TREASURE_SETS = [
  { id: 'set1', name: 'Iron Resolve', stageIds: ['stage1', 'stage2', 'stage3', 'stage4'], bonus: { type: 'moneyIncomePercent', valueAtMax: 15 } },
  { id: 'set2', name: 'Golden Dominion', stageIds: ['stage5', 'stage6', 'stage7', 'stage8'], bonus: { type: 'unitHpPercent', valueAtMax: 15 } },
  { id: 'set3', name: "Vanguard's Line", stageIds: ['stage9', 'stage10', 'stage11', 'stage12'], bonus: { type: 'moneyIncomePercent', valueAtMax: 18 } },
  { id: 'set4', name: 'Reinforced Bulwark', stageIds: ['stage13', 'stage14', 'stage15', 'stage16'], bonus: { type: 'unitHpPercent', valueAtMax: 18 } },
  { id: 'set5', name: "Ronin's Passage", stageIds: ['stage17', 'stage18', 'stage19', 'stage20'], bonus: { type: 'moneyIncomePercent', valueAtMax: 21 } },
  { id: 'set6', name: 'Sunlit Bastion', stageIds: ['stage21', 'stage22', 'stage23', 'stage24'], bonus: { type: 'unitHpPercent', valueAtMax: 21 } },
  { id: 'set7', name: "Merchant's Gambit", stageIds: ['stage25', 'stage26', 'stage27', 'stage28'], bonus: { type: 'moneyIncomePercent', valueAtMax: 24 } },
  { id: 'set8', name: 'Mountain Rampart', stageIds: ['stage29', 'stage30', 'stage31', 'stage32'], bonus: { type: 'unitHpPercent', valueAtMax: 24 } },
  { id: 'set9', name: "Capital's Vigil", stageIds: ['stage33', 'stage34', 'stage35', 'stage36'], bonus: { type: 'moneyIncomePercent', valueAtMax: 27 } },
  { id: 'set10', name: 'Frontier Stand', stageIds: ['stage37', 'stage38', 'stage39', 'stage40'], bonus: { type: 'unitHpPercent', valueAtMax: 27 } },
  { id: 'set11', name: "Northern Watch", stageIds: ['stage41', 'stage42', 'stage43', 'stage44'], bonus: { type: 'moneyIncomePercent', valueAtMax: 30 } },
  { id: 'set12', name: "Ascendant Legacy", stageIds: ['stage45', 'stage46', 'stage47', 'stage48'], bonus: { type: 'unitHpPercent', valueAtMax: 30 } },

  // Saga expansion (bible §A.6.1) — same 2-sets-of-5 pattern as before this
  // pass, renumbered onto saga2/saga3's own new stage IDs (see
  // STAGE_CONFIG.js — these two sagas shifted from stage11-30 to
  // stage49-68 once saga1 grew to its full real 48 stages).
  { id: 'set13', name: "Overlord's Wake", stageIds: ['stage49', 'stage50', 'stage51', 'stage52', 'stage53'], bonus: { type: 'moneyIncomePercent', valueAtMax: 35 } },
  { id: 'set14', name: 'Titan’s Reckoning', stageIds: ['stage54', 'stage55', 'stage56', 'stage57', 'stage58'], bonus: { type: 'unitHpPercent', valueAtMax: 35 } },
  { id: 'set15', name: "Empire's Twilight", stageIds: ['stage59', 'stage60', 'stage61', 'stage62', 'stage63'], bonus: { type: 'moneyIncomePercent', valueAtMax: 40 } },
  { id: 'set16', name: 'Ascendant Trial', stageIds: ['stage64', 'stage65', 'stage66', 'stage67', 'stage68'], bonus: { type: 'unitHpPercent', valueAtMax: 40 } },
];

// Which set (if any) a given stage belongs to — used by GameScene/
// StageSelectScene without every caller re-deriving it from TREASURE_SETS.
export function findSetForStage(stageId) {
  return TREASURE_SETS.find((set) => set.stageIds.includes(stageId));
}
