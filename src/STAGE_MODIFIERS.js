// Stage gimmicks (Round 2) — one twist stage per 8-stage chapter so a run
// of similar stages gets a change of pace, each paying bonus XP. Derived
// from the stage number rather than stored in STAGE_CONFIG.js, so the
// 144-stage data file stays untouched. Skipped: the first chapter
// (onboarding), saga finales, and stages that already have a Restriction.

export const STAGE_MODIFIERS = {
  fog: {
    id: 'fog',
    name: 'Fog of War',
    description: 'Thick fog hides the enemy half of the field.',
    xpBonusPercent: 30,
  },
  frenzy: {
    id: 'frenzy',
    name: 'Frenzy',
    description: 'Enemies move 35% faster.',
    xpBonusPercent: 30,
    enemySpeedMultiplier: 1.35,
  },
  budget: {
    id: 'budget',
    name: 'Tight Budget',
    description: 'Wallet cap -30%, income -20%.',
    xpBonusPercent: 30,
    walletCapMultiplier: 0.7,
    incomeMultiplier: 0.8,
  },
};

const ROTATION = ['fog', 'frenzy', 'budget'];
const STAGES_PER_SAGA = 48;
const STAGES_PER_CHAPTER = 8;
const TWIST_SLOT = 5; // 6th stage of each chapter

export function getStageModifier(stage) {
  if (!stage || stage.restrictions) return null;
  const num = parseInt(String(stage.id).replace('stage', ''), 10);
  if (!Number.isFinite(num) || num < 1) return null;
  const local = (num - 1) % STAGES_PER_SAGA;
  if (local === STAGES_PER_SAGA - 1) return null; // saga finale
  const chapterIndex = Math.floor((num - 1) / STAGES_PER_CHAPTER); // global, 0-17
  if (chapterIndex === 0) return null;
  if (local % STAGES_PER_CHAPTER !== TWIST_SLOT) return null;
  return STAGE_MODIFIERS[ROTATION[chapterIndex % ROTATION.length]];
}
