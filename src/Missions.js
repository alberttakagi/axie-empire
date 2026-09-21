// Live progress + claiming for MISSIONS_CONFIG.js's one-time milestone
// list. Progress is never stored per-mission — it's always computed fresh
// from whichever existing system already tracks that stat (StageProgress,
// PlayerProgress, UserRank, Loadout) or from LifetimeStats.js for the
// handful of activity counters nothing else tracks. Only the CLAIMED set
// is its own persisted state (see loadClaimedMissions/claimMission below),
// since "was this already paid out" can't be derived from anything else.

import { MISSIONS_CONFIG } from './MISSIONS_CONFIG.js';
import { loadLifetimeStats } from './LifetimeStats.js';
import { loadStageProgress } from './StageProgress.js';
import { loadPlayerProgress, addGems } from './PlayerProgress.js';
import { getUserRank } from './UserRank.js';
import { loadLoadout } from './Loadout.js';

const CLAIMED_STORAGE_KEY = 'axieSkirmishMissionsClaimed';

function loadClaimedMissions() {
  try {
    const raw = localStorage.getItem(CLAIMED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveClaimedMissions(claimed) {
  try {
    localStorage.setItem(CLAIMED_STORAGE_KEY, JSON.stringify(claimed));
  } catch {
    // localStorage unavailable — the claim still pays out this run, it just won't stick around.
  }
}

function getMissionProgressValue(mission) {
  switch (mission.type) {
    case 'stagesCleared':
      return Object.values(loadStageProgress()).filter((s) => s.cleared).length;
    case 'unitsDeployed':
      return loadLifetimeStats().unitsDeployed;
    case 'enemiesDefeated':
      return loadLifetimeStats().enemiesDefeated;
    case 'damageDealt':
      return Math.floor(loadLifetimeStats().damageDealt);
    case 'cannonUses':
      return loadLifetimeStats().cannonUses;
    case 'unitLevel': {
      const levels = Object.values(loadPlayerProgress().units).map((u) => u.level);
      return levels.length ? Math.max(...levels) : 1;
    }
    case 'unitEvolved':
      return Object.values(loadPlayerProgress().units).some((u) => u.evolutionStage > 0) ? 1 : 0;
    case 'userRank':
      return getUserRank();
    case 'baseUpgradeLevel': {
      const levels = Object.values(loadPlayerProgress().baseUpgrades || {});
      return levels.length ? Math.max(...levels) : 0;
    }
    case 'formationSize':
      // loadLoadout() is a fixed-length sparse array now (Loadout.js) —
      // .length is always MAX_LOADOUT_SIZE regardless of how many slots are
      // actually filled, so count the real occupants instead.
      return loadLoadout().filter(Boolean).length;
    default:
      return 0;
  }
}

// Every mission, each with its current progress (capped at `target`, so a
// caller can drive a progress bar straight off it), whether it's complete,
// and whether it's already been claimed.
export function getMissionsWithStatus() {
  const claimed = loadClaimedMissions();
  return MISSIONS_CONFIG.map((mission) => {
    const progress = getMissionProgressValue(mission);
    return {
      ...mission,
      progress: Math.min(progress, mission.target),
      isComplete: progress >= mission.target,
      isClaimed: !!claimed[mission.id],
    };
  });
}

// Pays out `mission.rewardGems` and marks it claimed — a no-op (returns
// null) if the mission isn't actually complete yet or was already claimed,
// so a caller can just always call this on a button tap without its own
// separate guard.
export function claimMission(id) {
  const mission = getMissionsWithStatus().find((m) => m.id === id);
  if (!mission || !mission.isComplete || mission.isClaimed) return null;

  const claimed = loadClaimedMissions();
  claimed[id] = true;
  saveClaimedMissions(claimed);
  addGems(mission.rewardGems);

  return mission;
}
