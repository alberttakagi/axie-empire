// localStorage-backed record of stage-mode progress.
// Shape: { [stageId]: { cleared: boolean, bestScore: number } }

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
// true — a later loss never un-clears a stage already won).
export function saveStageResult(stageId, score, cleared) {
  const progress = loadStageProgress();
  const existing = progress[stageId] || { cleared: false, bestScore: 0 };

  const updated = {
    cleared: existing.cleared || cleared,
    bestScore: Math.max(existing.bestScore, score),
  };
  progress[stageId] = updated;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable (private mode, quota) — progress just won't persist this run.
  }

  return updated;
}
