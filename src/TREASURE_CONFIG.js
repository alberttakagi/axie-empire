// Treasure Sets (bible §A.6.3) — the game's core "why keep replaying old
// stages" loop. Real Battle Cats groups each 48-stage chapter into a
// dozen-ish named sets — all three sagas now match that shape (12 sets of
// 4 stages each, stage1-48/49-96/97-144) following saga2/saga3's own
// real-48-stage rebuild (see docs/BATTLE_CATS_MAPPING.md).
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

  { id: 'set13', name: "Overlord's Wake", stageIds: ['stage49', 'stage50', 'stage51', 'stage52'], bonus: { type: 'moneyIncomePercent', valueAtMax: 32 } },
  { id: 'set14', name: "Titan's Reckoning", stageIds: ['stage53', 'stage54', 'stage55', 'stage56'], bonus: { type: 'unitHpPercent', valueAtMax: 34 } },
  { id: 'set15', name: "Empire's Twilight", stageIds: ['stage57', 'stage58', 'stage59', 'stage60'], bonus: { type: 'moneyIncomePercent', valueAtMax: 36 } },
  { id: 'set16', name: 'Ascendant Trial', stageIds: ['stage61', 'stage62', 'stage63', 'stage64'], bonus: { type: 'unitHpPercent', valueAtMax: 38 } },
  { id: 'set17', name: 'Crimson Vanguard', stageIds: ['stage65', 'stage66', 'stage67', 'stage68'], bonus: { type: 'moneyIncomePercent', valueAtMax: 40 } },
  { id: 'set18', name: 'Iron Tempest', stageIds: ['stage69', 'stage70', 'stage71', 'stage72'], bonus: { type: 'unitHpPercent', valueAtMax: 42 } },
  { id: 'set19', name: 'Shattered Horizon', stageIds: ['stage73', 'stage74', 'stage75', 'stage76'], bonus: { type: 'moneyIncomePercent', valueAtMax: 44 } },
  { id: 'set20', name: 'Molten Bastion', stageIds: ['stage77', 'stage78', 'stage79', 'stage80'], bonus: { type: 'unitHpPercent', valueAtMax: 46 } },
  { id: 'set21', name: 'Silent Reckoning', stageIds: ['stage81', 'stage82', 'stage83', 'stage84'], bonus: { type: 'moneyIncomePercent', valueAtMax: 48 } },
  { id: 'set22', name: 'Storm Warden', stageIds: ['stage85', 'stage86', 'stage87', 'stage88'], bonus: { type: 'unitHpPercent', valueAtMax: 50 } },
  { id: 'set23', name: 'Twilight Citadel', stageIds: ['stage89', 'stage90', 'stage91', 'stage92'], bonus: { type: 'moneyIncomePercent', valueAtMax: 52 } },
  { id: 'set24', name: 'Final Ember', stageIds: ['stage93', 'stage94', 'stage95', 'stage96'], bonus: { type: 'unitHpPercent', valueAtMax: 54 } },
  { id: 'set25', name: 'Apex Predator', stageIds: ['stage97', 'stage98', 'stage99', 'stage100'], bonus: { type: 'moneyIncomePercent', valueAtMax: 56 } },
  { id: 'set26', name: "Cataclysm's Edge", stageIds: ['stage101', 'stage102', 'stage103', 'stage104'], bonus: { type: 'unitHpPercent', valueAtMax: 58 } },
  { id: 'set27', name: 'Void Sovereign', stageIds: ['stage105', 'stage106', 'stage107', 'stage108'], bonus: { type: 'moneyIncomePercent', valueAtMax: 60 } },
  { id: 'set28', name: 'Eternal Vanguard', stageIds: ['stage109', 'stage110', 'stage111', 'stage112'], bonus: { type: 'unitHpPercent', valueAtMax: 62 } },
  { id: 'set29', name: 'Scorched Dominion', stageIds: ['stage113', 'stage114', 'stage115', 'stage116'], bonus: { type: 'moneyIncomePercent', valueAtMax: 64 } },
  { id: 'set30', name: 'Obsidian Reckoning', stageIds: ['stage117', 'stage118', 'stage119', 'stage120'], bonus: { type: 'unitHpPercent', valueAtMax: 66 } },
  { id: 'set31', name: 'Endless Siege', stageIds: ['stage121', 'stage122', 'stage123', 'stage124'], bonus: { type: 'moneyIncomePercent', valueAtMax: 68 } },
  { id: 'set32', name: 'Abyssal Bastion', stageIds: ['stage125', 'stage126', 'stage127', 'stage128'], bonus: { type: 'unitHpPercent', valueAtMax: 70 } },
  { id: 'set33', name: 'Last Bastion', stageIds: ['stage129', 'stage130', 'stage131', 'stage132'], bonus: { type: 'moneyIncomePercent', valueAtMax: 72 } },
  { id: 'set34', name: 'Doomherald', stageIds: ['stage133', 'stage134', 'stage135', 'stage136'], bonus: { type: 'unitHpPercent', valueAtMax: 74 } },
  { id: 'set35', name: "Requiem's Gate", stageIds: ['stage137', 'stage138', 'stage139', 'stage140'], bonus: { type: 'moneyIncomePercent', valueAtMax: 76 } },
  { id: 'set36', name: 'Omega Ascendant', stageIds: ['stage141', 'stage142', 'stage143', 'stage144'], bonus: { type: 'unitHpPercent', valueAtMax: 78 } },
];

// Which set (if any) a given stage belongs to — used by GameScene/
// StageSelectScene without every caller re-deriving it from TREASURE_SETS.
export function findSetForStage(stageId) {
  return TREASURE_SETS.find((set) => set.stageIds.includes(stageId));
}
