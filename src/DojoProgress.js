// localStorage-backed best-score record for Sparring Grounds (bible's
// Catclaw Dojo) — a single flat value, unlike StageProgress.js's per-stage
// map, since Dojo isn't tied to any one stage.

const STORAGE_KEY = 'axieSkirmishDojoBestScore';

export function loadDojoBestScore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

// Returns { bestScore, isNewBest } — saves only if `score` actually beats
// the existing best.
export function saveDojoScore(score) {
  const existing = loadDojoBestScore();
  const isNewBest = score > existing;
  const bestScore = isNewBest ? score : existing;

  if (isNewBest) {
    try {
      localStorage.setItem(STORAGE_KEY, String(bestScore));
    } catch {
      // localStorage unavailable — this run's score just won't persist.
    }
  }

  return { bestScore, isNewBest };
}
