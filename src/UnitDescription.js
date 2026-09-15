// Builds a short, human-readable list of lines describing what makes a
// UNIT_CONFIG/ENEMY_CONFIG entry tick — its trait matchups plus whichever
// of its optional ability fields it actually carries — for a hover/long-
// press tooltip (Battle Cats reference: hovering a unit shows its ability
// icons and elemental matchups; we don't have icon art for these, so this
// renders as short text lines instead).
import { MATCHUP_BONUSES, RESIST_BONUSES, FLAT_DAMAGE_TRAIT, SUPER_CLASS_SLAYER_BONUSES } from './TRAIT_CONFIG.js';
import { STATUS_TYPES } from './STATUS_CONFIG.js';

const TRAIT_LABEL = { beast: 'Beast', mech: 'Mech', bird: 'Bird', bug: 'Bug', plant: 'Plant', zombie: 'Zombie' };

const STATUS_LABEL = {
  [STATUS_TYPES.SLOW]: 'Slow',
  [STATUS_TYPES.STOP]: 'Stop',
  [STATUS_TYPES.WEAKEN]: 'Weaken',
  [STATUS_TYPES.CURSE]: 'Curse',
  [STATUS_TYPES.WARP]: 'Warp',
};

export function describeUnit(config) {
  const lines = [];

  // Trait + matchups (see TRAIT_CONFIG.js) — Mech's flat-damage rule always
  // overrides the matchup table, so it gets its own distinct line instead
  // of a (never-applicable) strong-vs/resists line.
  const traitLabel = TRAIT_LABEL[config.trait] || config.trait;
  if (config.trait === FLAT_DAMAGE_TRAIT) {
    lines.push(`${traitLabel} trait — takes only flat damage from every hit`);
  } else {
    const strongAgainst = Object.keys(MATCHUP_BONUSES[config.trait] || {}).map((t) => TRAIT_LABEL[t] || t);
    const resists = Object.keys(RESIST_BONUSES[config.trait] || {}).map((t) => TRAIT_LABEL[t] || t);
    let line = `${traitLabel} trait`;
    if (strongAgainst.length) line += ` — strong vs ${strongAgainst.join(', ')}`;
    if (resists.length) line += `${strongAgainst.length ? ',' : ' —'} resists ${resists.join(', ')}`;
    lines.push(line);
  }

  if (config.special?.type === 'aoe') {
    lines.push(`Area Attack (radius ${config.special.radius})`);
  }

  if (config.statusOnHit && config.statusOnHit.type !== STATUS_TYPES.NONE) {
    const s = config.statusOnHit;
    const label = STATUS_LABEL[s.type] || s.type;
    lines.push(`${Math.round(s.chance * 100)}% chance to ${label} on hit (${(s.durationMs / 1000).toFixed(1)}s)`);
  }

  if (config.toxicOnHit) {
    lines.push(
      `Toxic: ${Math.round(config.toxicOnHit.chance * 100)}% chance for +${Math.round(config.toxicOnHit.percent * 100)}% of target's max HP`,
    );
  }

  if (config.waveOnHit) {
    lines.push(`Wave Attack: also hits everything within ${config.waveOnHit.radius}px of itself`);
  }

  if (config.longDistance) {
    lines.push(`Long Distance: can't hit within ${config.longDistance.min}px, reaches out to ${config.longDistance.max}px`);
  }

  if (config.barrierMaxHp) {
    lines.push(`Barrier: absorbs the first ${config.barrierMaxHp} damage of each hit`);
  }
  if (config.barrierBreakerChance) {
    lines.push(`Barrier Breaker: ${Math.round(config.barrierBreakerChance * 100)}% chance to shatter shields outright`);
  }

  if (config.knockbackType === 'immune') lines.push(`Can't be knocked back`);
  if (config.warpImmune) lines.push(`Immune to Warp`);
  if (config.dodgeChance) lines.push(`Dodge: ${Math.round(config.dodgeChance * 100)}% chance to take no damage`);
  if (config.critChance) lines.push(`Critical Hit: ${Math.round(config.critChance * 100)}% chance for double damage`);

  if (config.zombieKiller) lines.push(`Zombie Killer: denies a Zombie enemy's revive on a finishing blow`);
  if (config.colossusSlayer) {
    const b = SUPER_CLASS_SLAYER_BONUSES.colossus;
    lines.push(`Colossus Slayer: ${b.dealt}x damage dealt, ${b.taken}x damage taken vs. Colossus enemies`);
  }
  if (config.behemothSlayer) {
    const b = SUPER_CLASS_SLAYER_BONUSES.behemoth;
    lines.push(`Behemoth Slayer: ${b.dealt}x damage dealt, ${b.taken}x damage taken vs. Behemoth enemies`);
  }
  if (config.surgeOnHit) {
    lines.push(`Surge Attack: ${Math.round(config.surgeOnHit.chance * 100)}% chance for a delayed second shockwave`);
  }

  return lines;
}
