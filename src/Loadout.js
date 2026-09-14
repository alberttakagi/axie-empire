// Persisted Formation/Loadout (bible §A.10.3 "Pre-Battle Loadout ('Equip')
// Screen") — which units are actually available to deploy in battle.
// Simplified from the bible's multiple-named-saved-slots system (reference:
// up to a dozen-plus formations) down to a single active formation, since
// this build doesn't yet justify maintaining several.
//
// MAX_LOADOUT_SIZE mirrors the reference game's own real mechanic: owning a
// large roster doesn't mean every unit rides along into every battle — you
// assemble a capped Deck/Formation beforehand (bible §A.10.3), and the
// in-battle deploy bar only ever shows that capped subset. Now that the
// roster has grown past what the deploy bar (GameScene's BUTTON_WIDTH row,
// tuned for a 800px-wide canvas) can fit in one un-scrolled row, this cap
// is load-bearing, not cosmetic — see GameScene.js's createSpawnButtons.
export const MAX_LOADOUT_SIZE = 5;

// Persisted as a plain array of UNIT_CONFIG keys. Defaults to the game's
// original 5-unit starter roster (so a player who never opens the Loadout
// screen keeps seeing the exact same button row this build always had — no
// surprise regression — and newly-added units must be deliberately swapped
// in via the Loadout screen, same as "unlocking" a new deck slot choice).
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
