// localStorage-backed record of stage-mode progress.
// Shape: { [stageId]: { cleared: boolean, bestScore: number, clears: number } }
//
// `clears` (added for the bible's §A.5.1 XP-decay formula) counts how many
// times this stage has been WON, not attempted — see GameScene's
// getXpReward, which uses it to taper repeat-clear XP toward a floor.

const STORAGE_KEY = 'axieSkirmishStageProgress';

export function loadStageProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Records one stage attempt's outcome, called from GameScene on both a win
// and a loss (best score can improve either way; `cleared` only ever turns
// true — a later loss never un-clears a stage already won; `clears` only
// increments on an actual win).
export function saveStageResult(stageId, score, cleared) {
  const progress = loadStageProgress();
  const existing = progress[stageId] || { cleared: false, bestScore: 0, clears: 0 };

  const updated = {
    cleared: existing.cleared || cleared,
    bestScore: Math.max(existing.bestScore, score),
    // `existing.clears || 0`, not just `existing.clears`: a record saved
    // before this field existed (any stage progress from before this
    // session) has no `clears` key at all, and `undefined + 1` is `NaN` —
    // which then silently reads back as 0 forever (`NaN || 0`), masking
    // the corruption and making the XP-decay formula never actually decay
    // for any stage that had progress before this feature shipped. Caught
    // via an actual gameplay test, not just code review — Training
    // Grounds (already cleared many times) paid full undecayed XP on a
    // fresh clear until this fix.
    clears: (existing.clears || 0) + (cleared ? 1 : 0),
  };
  progress[stageId] = updated;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable (private mode, quota) — progress just won't persist this run.
  }

  return updated;
}

// How many times a stage has been cleared so far, BEFORE this attempt —
// read this before calling saveStageResult if you need the pre-clear count
// for a reward formula (see GameScene's getXpReward).
export function getClearCount(stageId) {
  const progress = loadStageProgress();
  return progress[stageId]?.clears || 0;
}
