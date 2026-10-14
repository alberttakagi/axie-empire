// Sagas 4-7 (Round 2 expansion). Each is 48 stages generated from Saga 1's
// hand-tuned layouts (pacing, castle HP, field caps, boss timing), with:
//   - enemies swapped for same-role cousins, rotating per saga, so each
//     saga leans on a different slice of the roster (incl. the new designs)
//   - its own strength multiplier (saga3 is 4x; these climb from there —
//     tuned with src/dev/BalanceSim.js so later sagas keep pace with how
//     fast players grow: 5 / 7.5 / 10.5 / 14)
//   - a finale where the Werewolf is the final boss, opened by a
//     saga-specific elite instead of always Daddy Bear.
// Names live in SAGA_EXPANSION_NAMES.js (lore-inspired copy).
import { EXPANSION_STAGE_NAMES } from './SAGA_EXPANSION_NAMES.js';

export const EXPANSION_SAGAS = [
  { id: 'saga4', strength: 5, elite: 'colossus' }, // Mommy Bear
  { id: 'saga5', strength: 7.5, elite: 'ikkaku' }, // Treant Brawler
  { id: 'saga6', strength: 10.5, elite: 'gagagaga' }, // Elder Aquatic Wolf
  { id: 'saga7', strength: 14, elite: 'titan' }, // Daddy Bear returns for the last stand
];

// Same-role cousin groups; saga N maps each enemy N steps along its group.
const ROLE_GROUPS = [
  ['basic', 'thatguy', 'mehmeh', 'zombie'], // small fry slimes
  ['fast', 'wanikun', 'usagin', 'gory'], // runners
  ['tank', 'ikkaku', 'guardian'], // walls
  ['ranged', 'support', 'aoe', 'sniper'], // casters / shooters
  ['swarm', 'thatguy', 'wanikun'], // rushers
  ['kangaroo', 'gagagaga', 'colossus'], // mid-bosses
];

function cousin(enemyId, step) {
  for (const group of ROLE_GROUPS) {
    const i = group.indexOf(enemyId);
    if (i !== -1) return group[(i + step) % group.length];
  }
  return enemyId; // kanban, titan, behemoth stay themselves
}

export function buildExpansionStages(saga1Stages) {
  const out = [];
  EXPANSION_SAGAS.forEach((saga, sagaOffset) => {
    const step = sagaOffset + 1;
    saga1Stages.forEach((template, i) => {
      const globalNum = 145 + sagaOffset * 48 + i;
      const isFinale = i === 47;
      const spawnScript = template.spawnScript.map((entry) => {
        let enemyId = entry.enemyId;
        if (isFinale && enemyId === 'titan') enemyId = saga.elite;
        else if (!entry.isBoss) enemyId = cousin(enemyId, step);
        return { ...entry, enemyId, statMultiplier: saga.strength };
      });
      out.push({
        ...template,
        id: `stage${globalNum}`,
        saga: saga.id,
        displayName: EXPANSION_STAGE_NAMES[globalNum - 145] || `Stage ${globalNum}`,
        // Rewards scale with strength so later sagas stay worth replaying.
        baseXp: Math.round(template.baseXp * (1 + saga.strength / 4)),
        gemsFirstClear: Math.round(template.gemsFirstClear * 1.5),
        spawnScript,
      });
    });
  });
  return out;
}
