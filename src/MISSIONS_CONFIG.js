// One-time milestone missions (bible §A.10.1's Missions icon, previously a
// "coming soon" stub — see HomeScene.js) — permanent achievement-style
// goals rather than a daily-reset list, since a daily reset needs server
// time or at least a trustworthy local clock to gate against, and nothing
// else in this build depends on either. Each mission is claimed once;
// claiming pays its rewardGems via PlayerProgress.addGems and never expires
// or re-rolls. See Missions.js for how `type` maps to a live progress value
// and MissionsScene.js for the list/claim UI.
export const MISSION_TYPES = {
  STAGES_CLEARED: 'stagesCleared',
  UNITS_DEPLOYED: 'unitsDeployed',
  ENEMIES_DEFEATED: 'enemiesDefeated',
  DAMAGE_DEALT: 'damageDealt',
  CANNON_USES: 'cannonUses',
  UNIT_LEVEL: 'unitLevel', // highest level any single unit has reached
  UNIT_EVOLVED: 'unitEvolved', // 1 once any unit has reached True Form, else 0
  USER_RANK: 'userRank',
  BASE_UPGRADE_LEVEL: 'baseUpgradeLevel', // highest level any single Base Upgrade has reached
  FORMATION_SIZE: 'formationSize', // units currently in the active Formation
};

export const MISSIONS_CONFIG = [
  { id: 'clear_1_stage', type: MISSION_TYPES.STAGES_CLEARED, target: 1, displayName: 'First Victory', description: 'Clear any 1 stage.', rewardGems: 50 },
  { id: 'clear_5_stages', type: MISSION_TYPES.STAGES_CLEARED, target: 5, displayName: 'Getting Started', description: 'Clear 5 stages.', rewardGems: 100 },
  { id: 'clear_15_stages', type: MISSION_TYPES.STAGES_CLEARED, target: 15, displayName: 'Battle-Tested', description: 'Clear 15 stages.', rewardGems: 250 },
  { id: 'clear_25_stages', type: MISSION_TYPES.STAGES_CLEARED, target: 25, displayName: 'Saga Veteran', description: 'Clear 25 stages.', rewardGems: 400 },
  { id: 'deploy_50_units', type: MISSION_TYPES.UNITS_DEPLOYED, target: 50, displayName: 'Steady Hand', description: 'Deploy 50 units across all battles.', rewardGems: 80 },
  { id: 'deploy_250_units', type: MISSION_TYPES.UNITS_DEPLOYED, target: 250, displayName: 'Mass Mobilization', description: 'Deploy 250 units across all battles.', rewardGems: 200 },
  { id: 'defeat_100_enemies', type: MISSION_TYPES.ENEMIES_DEFEATED, target: 100, displayName: 'Exterminator', description: 'Defeat 100 enemies.', rewardGems: 100 },
  { id: 'defeat_500_enemies', type: MISSION_TYPES.ENEMIES_DEFEATED, target: 500, displayName: 'Relentless', description: 'Defeat 500 enemies.', rewardGems: 300 },
  { id: 'deal_10000_damage', type: MISSION_TYPES.DAMAGE_DEALT, target: 10000, displayName: 'Heavy Hitter', description: 'Deal a total of 10,000 damage.', rewardGems: 120 },
  { id: 'deal_100000_damage', type: MISSION_TYPES.DAMAGE_DEALT, target: 100000, displayName: 'Devastator', description: 'Deal a total of 100,000 damage.', rewardGems: 350 },
  { id: 'use_cannon_5', type: MISSION_TYPES.CANNON_USES, target: 5, displayName: 'Big Guns', description: 'Fire the Rune Cannon 5 times.', rewardGems: 80 },
  { id: 'level_10_unit', type: MISSION_TYPES.UNIT_LEVEL, target: 10, displayName: 'Rising Star', description: 'Level any one unit up to Lv 10.', rewardGems: 100 },
  { id: 'level_25_unit', type: MISSION_TYPES.UNIT_LEVEL, target: 25, displayName: 'Elite Trainer', description: 'Level any one unit up to Lv 25.', rewardGems: 250 },
  { id: 'evolve_1_unit', type: MISSION_TYPES.UNIT_EVOLVED, target: 1, displayName: 'True Form', description: 'Evolve any unit to its True Form.', rewardGems: 150 },
  { id: 'rank_10', type: MISSION_TYPES.USER_RANK, target: 10, displayName: 'Rookie No More', description: 'Reach User Rank 10.', rewardGems: 100 },
  { id: 'rank_50', type: MISSION_TYPES.USER_RANK, target: 50, displayName: 'Seasoned Commander', description: 'Reach User Rank 50.', rewardGems: 300 },
  { id: 'base_upgrade_5', type: MISSION_TYPES.BASE_UPGRADE_LEVEL, target: 5, displayName: 'Fortified', description: 'Raise any Base Upgrade to level 5.', rewardGems: 120 },
  { id: 'formation_10', type: MISSION_TYPES.FORMATION_SIZE, target: 10, displayName: 'Full Squad', description: 'Fill your Formation with 10 units.', rewardGems: 80 },
];
