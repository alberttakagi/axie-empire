// Axie Lab genome → battle unit. Pure data (no Phaser/Pixi), so it's unit
// tested and shared by the Lab screen, the live Mixer renderer and battle.
//
// A genome mirrors what the official @axieinfinity/mixer needs to draw an
// Axie: a body class, a color, and six parts that each have their own class
// and part value. Axie identity drives combat the way it does in Axie
// Infinity:
//   - Body class sets the base stats (Origins-style HP / Speed / Skill /
//     Morale) and which enemy attribute the Axie is strong against.
//   - Every part adds its own class's stat bonus.
//   - The four combat parts (Back, Horn, Mouth, Tail) pick the signature
//     ability: whichever class holds the majority (ties go to the body).
//   - Purity: each part matching the body class adds +3% HP and damage.

export const AXIE_CLASSES = ['beast', 'aquatic', 'plant', 'bird', 'bug', 'reptile'];
export const PART_TYPES = ['eyes', 'ears', 'back', 'horn', 'mouth', 'tail'];
export const COMBAT_PARTS = ['back', 'horn', 'mouth', 'tail'];
// Part values the mixer's gene data actually has for every class.
export const PART_VALUES = {
  eyes: [2, 4, 8, 10],
  mouth: [2, 4, 8, 10],
  ears: [2, 4, 6, 8, 10, 12],
  back: [2, 4, 6, 8, 10, 12],
  horn: [2, 4, 6, 8, 10, 12],
  tail: [2, 4, 6, 8, 10, 12],
};
export const COLOR_COUNT = 4;

export const CLASS_INFO = {
  beast: { label: 'Beast', color: 0xffb812, base: { hp: 31, speed: 35, skill: 31, morale: 43 }, part: { speed: 1, morale: 3 }, strongVs: 'red' },
  aquatic: { label: 'Aquatic', color: 0x00b8ce, base: { hp: 39, speed: 39, skill: 35, morale: 27 }, part: { hp: 1, speed: 3 }, strongVs: 'floating' },
  plant: { label: 'Plant', color: 0x6cc000, base: { hp: 43, speed: 31, skill: 31, morale: 35 }, part: { hp: 3, morale: 1 }, strongVs: 'zombie' },
  bird: { label: 'Bird', color: 0xff8bbd, base: { hp: 27, speed: 43, skill: 35, morale: 35 }, part: { speed: 3, morale: 1 }, strongVs: 'floating' },
  bug: { label: 'Bug', color: 0xff5341, base: { hp: 35, speed: 31, skill: 35, morale: 39 }, part: { hp: 1, morale: 3 }, strongVs: 'zombie' },
  reptile: { label: 'Reptile', color: 0xc77ee8, base: { hp: 39, speed: 35, skill: 31, morale: 35 }, part: { hp: 3, speed: 1 }, strongVs: 'red' },
};

export const SIGNATURES = {
  beast: { label: 'Savage Strike', desc: '+12% crit chance; crits hit extra hard' },
  aquatic: { label: 'Riptide', desc: '30% chance to SLOW the target' },
  plant: { label: 'Bulwark', desc: '+20% HP and hard to knock back' },
  bird: { label: 'Gale Wave', desc: 'Every hit sends a wave down the lane' },
  bug: { label: 'Sap', desc: '25% chance to WEAKEN the target' },
  reptile: { label: 'Venom Surge', desc: '30% chance of a delayed burst' },
};

export function randomGenome(rand = Math.random) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const bodyClass = pick(AXIE_CLASSES);
  const parts = {};
  for (const type of PART_TYPES) {
    // Lean toward the body class so random Axies read as a "family".
    parts[type] = { class: rand() < 0.5 ? bodyClass : pick(AXIE_CLASSES), value: pick(PART_VALUES[type]) };
  }
  return { bodyClass, color: Math.floor(rand() * COLOR_COUNT), parts, name: '' };
}

export function isValidGenome(g) {
  return !!g && AXIE_CLASSES.includes(g.bodyClass)
    && PART_TYPES.every((t) => AXIE_CLASSES.includes(g.parts?.[t]?.class) && PART_VALUES[t].includes(g.parts[t].value));
}

export function genomeStats(g) {
  const s = { ...CLASS_INFO[g.bodyClass].base };
  for (const type of PART_TYPES) {
    for (const [k, v] of Object.entries(CLASS_INFO[g.parts[type].class].part)) s[k] += v;
  }
  return s;
}

export function signatureClass(g) {
  const counts = {};
  for (const type of COMBAT_PARTS) counts[g.parts[type].class] = (counts[g.parts[type].class] || 0) + 1;
  let best = g.bodyClass;
  for (const [cls, n] of Object.entries(counts)) {
    if (n > (counts[best] || 0)) best = cls;
  }
  return best;
}

export function purity(g) {
  return PART_TYPES.filter((t) => g.parts[t].class === g.bodyClass).length;
}

export function defaultName(g) {
  return `${CLASS_INFO[g.bodyClass].label} Recruit`;
}

// UNIT_CONFIG-shaped fields (everything but `sprite`). Tuned to sit around
// a Super Rare: a strong, personal unit, not a must-have Uber.
export function deriveUnitStats(g) {
  const st = genomeStats(g);
  const pure = purity(g);
  const sig = signatureClass(g);
  const pureMult = 1 + 0.03 * pure;
  const out = {
    hp: Math.round(st.hp * 17 * pureMult),
    damage: Math.round((st.skill * 4.5 + st.morale * 1.5) * pureMult),
    moveSpeed: Math.round(30 + st.speed * 0.6),
    foreswingMs: 400,
    backswingMs: Math.max(900, 2100 - st.speed * 18),
    critChance: Math.max(0, Math.min(0.2, (st.morale - 30) / 150)),
    range: 18,
    radius: 18,
    cost: 800 + pure * 20,
    rechargeMs: 15000,
    knockbackCount: 3,
    knockbackDistance: 12,
    knockbackType: 'normal',
    special: { type: 'none' },
    statusOnHit: { type: 'none' },
    strongVs: CLASS_INFO[g.bodyClass].strongVs,
    abilityLabel: SIGNATURES[sig].label,
  };
  switch (sig) {
    case 'beast': out.critChance += 0.12; break;
    case 'aquatic': out.statusOnHit = { type: 'slow', chance: 0.3, durationMs: 3000, multiplier: 0.5 }; break;
    case 'plant': out.hp = Math.round(out.hp * 1.2); out.knockbackCount = 1; break;
    case 'bird': out.waveOnHit = { radius: 110 }; out.damage = Math.round(out.damage * 0.8); break;
    case 'bug': out.statusOnHit = { type: 'weaken', chance: 0.25, durationMs: 3000, multiplier: 0.5 }; break;
    case 'reptile': out.surgeOnHit = { chance: 0.3, delayMs: 400, radius: 60 }; break;
    default: break;
  }
  out.attackSpeed = Math.round((out.damage / ((out.foreswingMs + out.backswingMs) / 1000)) * 10) / 10;
  return out;
}

// Plain-language breakdown for the Lab screen.
export function describeGenome(g) {
  const st = genomeStats(g);
  const sig = signatureClass(g);
  return {
    stats: st,
    purity: purity(g),
    signature: { cls: sig, ...SIGNATURES[sig] },
    strongVs: CLASS_INFO[g.bodyClass].strongVs,
  };
}
