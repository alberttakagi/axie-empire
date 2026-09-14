// Battle Items (bible §A.8) — consumables usable mid-battle. The bible's
// full v1 scope is six items (Speed Up, Treasure Radar, Rich Cat, Auto-Clear
// Ticket, XP Boost, Support Strike); Speed Up already exists as its own
// always-available, unlimited toggle button (see GameScene's
// createSpeedUpButton), so it's deliberately left out of this consumable-
// inventory system. Auto-Clear Ticket and Support Strike need mechanics
// this build doesn't have yet (an auto-play/replay system, a periodic
// automatic assist tick) — this file covers the three that are a clean fit
// for the existing engine: Treasure Radar, Rich Cat, XP Boost.
//
// `effect` is read directly by GameScene (see useBattleItem):
//   'guaranteedTopTreasure'  forces this clear's Treasure roll to gold tier.
//   'richCat'                Worker Cat's income-ramp (bible §A.3.10) starts
//                            already maxed for the rest of this battle.
//   'xpBoost'                multiplies this specific clear's XP reward.

export const BATTLE_ITEMS_CONFIG = {
  treasureRadar: {
    id: 'treasureRadar',
    displayName: 'Treasure Radar',
    description: 'Guarantees Gold Treasure on this clear.',
    effect: 'guaranteedTopTreasure',
    color: 0xffd700,
  },
  richCat: {
    id: 'richCat',
    displayName: 'Rich Cat',
    description: "Starts this battle's income already at full rate.",
    effect: 'richCat',
    color: 0x33cc99,
  },
  xpBoost: {
    id: 'xpBoost',
    displayName: 'XP Boost',
    description: '+50% XP from this stage clear.',
    effect: 'xpBoost',
    xpMultiplier: 1.5,
    color: 0x66aaff,
  },
};

// Free drop chance on any stage win (bible: "earned in small free
// quantities from a themed daily-rotation stage" — simplified here to a
// flat per-clear chance rather than building a full weekday-rotation
// calendar system; see BattleItems.js's rollBattleItemDrop).
export const BATTLE_ITEM_DROP_CHANCE = 0.2;
