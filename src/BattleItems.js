// Battle Item inventory (bible §A.8) — a plain { [itemId]: count } bag,
// persisted separately from PlayerProgress.js since these are consumables
// spent per-battle, not part of the XP/evolution meta-progression pool.

import { BATTLE_ITEMS_CONFIG, BATTLE_ITEM_DROP_CHANCE } from './BATTLE_ITEMS_CONFIG.js';

const STORAGE_KEY = 'axieSkirmishBattleItems';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(inventory) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  } catch {
    // localStorage unavailable — the inventory just won't persist this run.
  }
}

export function getBattleItemInventory() {
  return load();
}

export function getBattleItemCount(itemId) {
  return load()[itemId] || 0;
}

function addBattleItem(itemId, amount = 1) {
  const inventory = load();
  inventory[itemId] = (inventory[itemId] || 0) + amount;
  save(inventory);
  return inventory[itemId];
}

// Spends one of `itemId` if the player has any. Returns whether it spent.
export function tryUseBattleItem(itemId) {
  const inventory = load();
  if (!inventory[itemId] || inventory[itemId] <= 0) return false;

  inventory[itemId] -= 1;
  save(inventory);
  return true;
}

// Called from GameScene.winStage on every win (bible: items are earned "in
// small free quantities" from clearing content) — one random item at
// BATTLE_ITEM_DROP_CHANCE, or none. Returns the granted item's config (for
// a results-screen line) or null.
export function rollBattleItemDrop() {
  if (Math.random() > BATTLE_ITEM_DROP_CHANCE) return null;

  const ids = Object.keys(BATTLE_ITEMS_CONFIG);
  const itemId = ids[Math.floor(Math.random() * ids.length)];
  addBattleItem(itemId);
  return BATTLE_ITEMS_CONFIG[itemId];
}
