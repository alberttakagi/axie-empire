// Whether the player has ever finished (or explicitly skipped) the
// first-battle walkthrough — see GameScene.js's showBattleTutorial. A tiny
// dedicated module (its own localStorage key) rather than a field tacked
// onto PlayerProgress.js, matching this codebase's existing pattern of one
// small focused module per concern (UserRank.js, StageProgress.js, ...)
// rather than growing the meta-progression blob for something that isn't
// meta progression at all.

const STORAGE_KEY = 'axieSkirmishTutorialCompleted';

export function hasCompletedTutorial() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markTutorialCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Storage unavailable (private browsing, quota, ...) — the tutorial
    // just replays next battle instead of persisting; not worth surfacing.
  }
}
