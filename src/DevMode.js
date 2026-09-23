// Dev-only "unlock everything" seed (user request: re-testing a change
// shouldn't mean grinding back through real progression from stage 1 every
// time). Never runs during normal play — only when main.js sees `?devunlock`
// in the URL, so it can never affect a real player or the shipped build's
// own default behavior. Visiting `<url>?devunlock` once seeds a fully
// unlocked save; it persists in localStorage from then on like any other
// save, so it only needs re-applying if you want to wipe back to it (e.g.
// after clearing site data) — not on every single visit.
import { STAGE_CONFIG } from './STAGE_CONFIG.js';
import { UNIT_CONFIG } from './UNIT_CONFIG.js';
import { BASE_UPGRADE_CONFIG } from './BASE_UPGRADE_CONFIG.js';
import { PROGRESSION_CONFIG } from './PROGRESSION_CONFIG.js';

const STAGE_PROGRESS_KEY = 'axieSkirmishStageProgress';
const PLAYER_PROGRESS_KEY = 'axieSkirmishPlayerProgress';
const ENERGY_KEY = 'axieSkirmishEnergy';

const DEV_GEMS = 999999;
const DEV_XP = 999999;
const DEV_EVO_SHARDS = 999;
const DEV_GROWTH_CHARMS = 999;
const DEV_UNIT_LEVEL = 50; // >= PartEvolution's own PART_EVOLUTION_LEVEL (10), so evolved art shows too
const DEV_EXTRA_CAP = 50;
const DEV_ENERGY = 999999;

export function applyDevUnlock() {
  // Every real stage marked cleared with a generous score — this alone
  // satisfies every unit's own stageId-gated unlockRequirement (see
  // PlayerProgress.js's isUnitUnlocked) AND StageSelectScene's own
  // sequential "previous stage cleared" unlock check, in one pass.
  const stageProgress = {};
  for (const stage of STAGE_CONFIG) {
    stageProgress[stage.id] = { cleared: true, bestScore: 999999, clears: 10 };
  }
  localStorage.setItem(STAGE_PROGRESS_KEY, JSON.stringify(stageProgress));

  // Every unit maxed (level + evolution stage + extra cap) — also covers
  // the roster's one unitEvolved-gated unlock (Xia/guardian, gated on
  // basic/Tripp reaching final evolution), since every unit gets maxed
  // here, not just basic.
  //
  // Real bug, found live: evolutionStage isn't safe to just set "generously
  // high" — UnitStats.js's getEffectiveUnitConfig indexes straight into
  // PROGRESSION_CONFIG's own `evolutions` array with no bounds check
  // (`meta.evolutions[unitProgress.evolutionStage - 1]`), unlike
  // PlayerProgress.js's own tryEvolveUnit, which treats an out-of-range
  // index as "already maxed" and never crashes. Each unit's REAL max is
  // its own evolutions.length, not one blanket number for the whole roster.
  const units = {};
  for (const key of Object.keys(UNIT_CONFIG)) {
    const maxEvolutionStage = PROGRESSION_CONFIG[key]?.evolutions?.length || 0;
    units[key] = { level: DEV_UNIT_LEVEL, extraCap: DEV_EXTRA_CAP, evolutionStage: maxEvolutionStage };
  }

  // Every account-wide Base Upgrade (cannon, base HP, research, accounting,
  // study, stamina cap, ...) maxed at its own real maxLevel too — reads
  // BASE_UPGRADE_CONFIG.js itself rather than hardcoding its key list, so
  // this can't quietly drift out of sync if that file ever changes.
  const baseUpgrades = {};
  for (const key of Object.keys(BASE_UPGRADE_CONFIG)) {
    baseUpgrades[key] = BASE_UPGRADE_CONFIG[key].maxLevel;
  }

  localStorage.setItem(
    PLAYER_PROGRESS_KEY,
    JSON.stringify({
      xp: DEV_XP,
      gems: DEV_GEMS,
      evoShards: DEV_EVO_SHARDS,
      growthCharms: DEV_GROWTH_CHARMS,
      units,
      baseUpgrades,
    }),
  );

  // Energy.js's own getMaxEnergy() is capped by the Stamina Cap Base
  // Upgrade level above (now maxed) — real bug, found live: writing a
  // huge `current` here alone silently got clamped straight back down to
  // whatever the cap actually was on the very next read (applyRegen's own
  // "current can't exceed cap" rule), so DEV_ENERGY only actually sticks
  // now that the cap itself is maxed too, matching it exactly rather than
  // relying on a bigger number that gets thrown away.
  localStorage.setItem(ENERGY_KEY, JSON.stringify({ current: DEV_ENERGY, lastUpdateMs: Date.now() }));
}
