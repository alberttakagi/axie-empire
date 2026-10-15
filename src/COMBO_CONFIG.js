// Cat-Combo-equivalent team synergy (bible §A.7.3): owning/fielding a
// specific SET of units together auto-activates a named passive bonus for
// that battle, regardless of order, and multiple combos can stack. The real
// game has ~247 of these across its full roster; this build's 5-unit
// roster gets 3 illustrative ones instead — the point is demonstrating the
// "check Formation membership -> look up a bonus -> apply additively"
// SYSTEM, not authoring dozens of named combos for 5 units.
//
// `requiredUnitTypes` — every one of these keys must be in the player's
// current Loadout (bible §A.10.3 "Formation") for the combo to activate;
// order doesn't matter and units NOT in the list are simply ignored (a
// combo checks for a subset, not an exact-match set).
// `bonus.type` — read by GameScene the same way Treasure bonuses are:
//   'startingMoneyPercent' — battle starts with the wallet this % fuller
//                            (bible's "Starting Money Up").
//   'unitAttackPercent'    — multiplies every spawned unit's damage
//                            (bible's "Unit Attack Up").
//   'critChanceBonus'      — added directly to every spawned unit's
//                            critChance (bible's "Critical Chance Up").

export const COMBO_CONFIG = [
  {
    id: 'fullSquad',
    name: 'Full Squad',
    requiredUnitTypes: ['basic', 'fast', 'tank', 'ranged', 'aoe'],
    bonus: { type: 'startingMoneyPercent', value: 10 },
  },
  {
    id: 'meleeTrio',
    name: 'Melee Trio',
    requiredUnitTypes: ['basic', 'fast', 'tank'],
    bonus: { type: 'unitAttackPercent', value: 10 },
  },
  {
    id: 'glassCannons',
    name: 'Glass Cannons',
    requiredUnitTypes: ['ranged', 'aoe'],
    bonus: { type: 'critChanceBonus', value: 0.1 },
  },
  // Roster expansion (bible §A.4.1) additions — same illustrative-not-
  // exhaustive spirit as the original three, giving the 5 new units their
  // own reason to be fielded together rather than only alongside the
  // originals.
  {
    id: 'vanguard',
    name: 'Vanguard',
    requiredUnitTypes: ['swarm', 'guardian'],
    bonus: { type: 'startingMoneyPercent', value: 8 },
  },
  {
    id: 'debuffBattery',
    name: 'Debuff Battery',
    requiredUnitTypes: ['support', 'sniper'],
    bonus: { type: 'critChanceBonus', value: 0.08 },
  },
];

// Axie class synergies (AXIE_CLASSES.js): fielding several Axies of one
// class — or a balanced squad covering all three sides of the class
// triangle — activates a bonus, so Formation building is about Axie
// identity, not only individual units. `requiredClass` = { cls, count };
// `requiredSides` = true needs at least one Axie from each side.
COMBO_CONFIG.push(
  { id: 'beastPack', name: 'Beast Pack', requiredClass: { cls: 'beast', count: 3 }, bonus: { type: 'critChanceBonus', value: 0.06 } },
  { id: 'plantGrove', name: 'Plant Grove', requiredClass: { cls: 'plant', count: 3 }, bonus: { type: 'startingMoneyPercent', value: 10 } },
  { id: 'aquaticCurrent', name: 'Aquatic Current', requiredClass: { cls: 'aquatic', count: 3 }, bonus: { type: 'unitAttackPercent', value: 6 } },
  { id: 'bugSwarm', name: 'Bug Swarm', requiredClass: { cls: 'bug', count: 2 }, bonus: { type: 'critChanceBonus', value: 0.05 } },
  { id: 'reptileScales', name: 'Reptile Scales', requiredClass: { cls: 'reptile', count: 2 }, bonus: { type: 'unitAttackPercent', value: 6 } },
  { id: 'balancedLunacia', name: 'Balanced Lunacia', requiredSides: true, bonus: { type: 'unitAttackPercent', value: 5 } },
);
