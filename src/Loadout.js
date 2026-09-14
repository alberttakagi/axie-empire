// Persisted Formation/Loadout (bible §A.10.3 "Pre-Battle Loadout ('Equip')
// Screen") — which units are actually available to deploy in battle.
// Simplified from the bible's multiple-named-saved-slots system (reference:
// up to a dozen-plus formations) down to a single active formation, since
// this build doesn't yet justify maintaining several.
//
// MAX_LOADOUT_SIZE mirrors the reference game's own real mechanic: owning a
// large roster doesn't mean every unit rides along into every battle — you
// assemble a capped Deck/Formation beforehand (bible §A.10.3), and the
// in-battle deploy bar only ever shows that capped subset. Set to 10 to
// match the real game's own Deck size exactly (and, right now, this
// build's entire roster — see UNIT_CONFIG.js — so in practice every owned
// unit can ride along at once; the cap stays in place for when the roster
// eventually grows past 10). GameScene.js's createSpawnButtons shrinks the
// deploy bar's per-button width to whatever fits the current Formation
// size in one un-scrolled row on the 800px-wide canvas, so this cap no
// longer needs to be tuned to a fixed button size.
export const MAX_LOADOUT_SIZE = 10;

// Persisted as a plain array of UNIT_CONFIG keys. Defaults to every unit in
// the roster (since MAX_LOADOUT_SIZE now equals the full roster size) — a
// player who never opens the Loadout screen still deploys with everything
// they own, matching the real game's own "full Deck by default" feel.
import { UNIT_CONFIG } from './UNIT_CONFIG.js';

const STORAGE_KEY = 'axieSkirmishLoadout';

function defaultLoadout() {
  return Object.keys(UNIT_CONFIG).slice(0, MAX_LOADOUT_SIZE);
}

export function loadLoadout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLoadout();

    const parsed = JSON.parse(raw);
    // Guard against a stale save referencing a unit key that no longer
    // exists (e.g. UNIT_CONFIG changed since), against an empty/corrupt save
    // leaving the player with zero deployable units, and against a legacy
    // save exceeding the current cap (defensive — LoadoutScene itself
    // enforces MAX_LOADOUT_SIZE going forward).
    const valid = parsed.filter((key) => UNIT_CONFIG[key]).slice(0, MAX_LOADOUT_SIZE);
    return valid.length > 0 ? valid : defaultLoadout();
  } catch {
    return defaultLoadout();
  }
}

export function saveLoadout(selectedKeys) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedKeys.slice(0, MAX_LOADOUT_SIZE)));
  } catch {
    // localStorage unavailable — the selection just won't persist this run.
  }
}
