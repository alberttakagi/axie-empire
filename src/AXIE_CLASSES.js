// Axie classes in combat — the real Axie Infinity class triangle:
//
//   Reptile / Plant / Dusk   beat  Aquatic / Bird / Dawn
//   Aquatic / Bird / Dawn    beat  Beast / Bug / Mech
//   Beast / Bug / Mech       beat  Reptile / Plant / Dusk
//
// A hit from the advantaged side deals +CLASS_BONUS damage, from the
// disadvantaged side −CLASS_PENALTY. Applies to Axies AND Chimeras, so
// both building a Formation and reading enemy intel are about classes.
//
// Unit classes are the Axies' REAL body classes, decoded from each
// starter's genes with @axieinfinity/mixer (getAxieBodyStructure512).
// The Lab Axie uses its designed body class. Chimera classes follow their
// look (slimes aquatic, treants/dryad brawlers plant, wolves/bears beast,
// the Werewolf dusk…), balanced so each third of the triangle has 7–8.

export const CLASS_BONUS = 0.15;
export const CLASS_PENALTY = 0.15;

const GROUP = {
  reptile: 0, plant: 0, dusk: 0,
  aquatic: 1, bird: 1, dawn: 1,
  beast: 2, bug: 2, mech: 2,
};

export const CLASS_STYLE = {
  beast: { label: 'Beast', color: 0xffb812, hex: '#ffb812' },
  aquatic: { label: 'Aquatic', color: 0x00b8ce, hex: '#00b8ce' },
  plant: { label: 'Plant', color: 0x6cc000, hex: '#6cc000' },
  bird: { label: 'Bird', color: 0xff8bbd, hex: '#ff8bbd' },
  bug: { label: 'Bug', color: 0xff5341, hex: '#ff5341' },
  reptile: { label: 'Reptile', color: 0xc77ee8, hex: '#c77ee8' },
  mech: { label: 'Mech', color: 0xc6bdd4, hex: '#c6bdd4' },
  dawn: { label: 'Dawn', color: 0xbeceff, hex: '#beceff' },
  dusk: { label: 'Dusk', color: 0x129092, hex: '#129092' },
};

// From the starters' genes (see header).
export const UNIT_CLASS = {
  basic: 'beast', // Tripp
  tank: 'plant', // Olek
  swarm: 'bug', // Shillin
  ranged: 'aquatic', // Puffy
  fast: 'beast', // Buba
  aoe: 'aquatic', // Noir
  sniper: 'bird', // Momo
  support: 'plant', // Mit
  titan: 'dawn', // Temujin
  guardian: 'beast', // Xia
  ena: 'plant',
  venoki: 'reptile',
  pomodoro: 'bug',
  bing: 'beast',
  rouge: 'aquatic',
  machito: 'reptile',
  bard: 'plant',
  hope: 'beast',
  shufen: 'dusk',
};

// Keyed by enemy ART id (enemies that reuse another's sprites share it).
export const ENEMY_CLASS = {
  ranged: 'aquatic', // aqua slime (attack)
  mehmeh: 'aquatic', // aqua slime boss
  gagagaga: 'aquatic', // aqua alpha wolf
  tank: 'plant', // treant
  guardian: 'plant', // flowering treant
  ikkaku: 'plant', // treant brawler
  basic: 'plant', // green slime — Tripp (Beast) beats it, so stage 1 teaches the triangle
  fast: 'beast', // gray wolf
  gory: 'beast', // alpha wolf
  titan: 'beast', // daddy bear
  colossus: 'beast', // mommy bear
  usagin: 'beast', // dryad fighter
  kangaroo: 'reptile', // machito chimera
  wanikun: 'reptile', // aqua wolf ("wani" = crocodile)
  kanban: 'bug', // shilin chimera
  thatguy: 'bug', // flower slime
  swarm: 'bug', // forest slime fighter
  sniper: 'bird', // dryad ranger
  aoe: 'dawn', // dryad mage
  support: 'dawn', // aqua slime support
  behemoth: 'dusk', // werewolf
  zombie: 'dusk', // undead slime
};

// +1: attacker has the advantage, −1: defender has it, 0: neutral.
export function classEdge(attackerClass, defenderClass) {
  const a = GROUP[attackerClass];
  const d = GROUP[defenderClass];
  if (a === undefined || d === undefined || a === d) return 0;
  if ((a + 1) % 3 === d) return 1;
  return -1;
}

export function classMultiplier(attackerClass, defenderClass) {
  const edge = classEdge(attackerClass, defenderClass);
  return edge > 0 ? 1 + CLASS_BONUS : edge < 0 ? 1 - CLASS_PENALTY : 1;
}

// Which classes a given class beats / loses to (for UI hints).
export function beatsClasses(cls) {
  return Object.keys(GROUP).filter((c) => classEdge(cls, c) > 0);
}
export function weakToClasses(cls) {
  return Object.keys(GROUP).filter((c) => classEdge(c, cls) > 0);
}

export function enemyArtIdOf(config) {
  const m = (config?.sprite?.idle || '').match(/enemy_([a-z0-9]+)_idle\.png$/);
  return m ? m[1] : config?.id;
}

export function classOfEnemy(config) {
  return config?.axieClass || ENEMY_CLASS[enemyArtIdOf(config)] || null;
}

export function classOfUnit(config) {
  return config?.axieClass || UNIT_CLASS[config?.id] || null;
}

// Small round class badge (colored disc + initial) for cards and lists.
// Returns a Phaser container; caller positions/ignores cameras as needed.
export function addClassBadge(scene, x, y, cls, radius = 8) {
  const style = CLASS_STYLE[cls];
  if (!style) return null;
  const c = scene.add.container(x, y);
  c.add(scene.add.circle(0, 0, radius, style.color).setStrokeStyle(Math.max(1, radius / 5), 0x1d1a16));
  // Two letters: Beast/Bird/Bug would all be "B" otherwise.
  c.add(scene.add.text(0, 0, style.label.slice(0, 2), {
    fontFamily: 'Rowdies, sans-serif', fontSize: `${Math.round(radius * 0.95)}px`, color: '#1d1a16',
  }).setOrigin(0.5));
  return c;
}
