// First-launch-only opening lore screen (see OpeningScene.js) — same tiny
// localStorage-flag pattern as Tutorial.js, kept in its own module for the
// same reason: one concern, one file, never piled into PlayerProgress.js.
const OPENING_SEEN_KEY = 'axieSkirmishOpeningSeen';

export function hasSeenOpening() {
  try {
    return localStorage.getItem(OPENING_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markOpeningSeen() {
  try {
    localStorage.setItem(OPENING_SEEN_KEY, 'true');
  } catch {
    // localStorage unavailable — the opening will just replay next launch.
  }
}
