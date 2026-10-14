import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PART_TYPES, randomGenome, isValidGenome, genomeStats, signatureClass, purity, deriveUnitStats,
} from '../src/AxieGenome.js';

function genome(bodyClass, partClasses) {
  const parts = {};
  PART_TYPES.forEach((t, i) => { parts[t] = { class: partClasses[i] ?? bodyClass, value: 2 }; });
  return { bodyClass, color: 0, parts, name: '' };
}

test('random genomes are always valid', () => {
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 200; i++) assert.ok(isValidGenome(randomGenome(rand)));
});

test('body class sets base stats and parts add their class bonus', () => {
  const pure = genomeStats(genome('plant', []));
  // plant base hp 43 + 6 plant parts × 3
  assert.equal(pure.hp, 43 + 18);
  const mixed = genomeStats(genome('plant', ['aquatic']));
  assert.equal(mixed.hp, 43 + 15 + 1);
  assert.equal(mixed.speed, 31 + 3);
});

test('combat parts choose the signature; ties go to the body', () => {
  // eyes, ears, back, horn, mouth, tail
  assert.equal(signatureClass(genome('beast', [null, null, 'bug', 'bug', 'bug', null])), 'bug');
  assert.equal(signatureClass(genome('beast', [null, null, 'bug', 'bug', null, null])), 'beast');
});

test('signatures change real combat fields; purity boosts stats', () => {
  const aquatic = deriveUnitStats(genome('aquatic', [null, null, 'aquatic']));
  assert.equal(aquatic.statusOnHit.type, 'slow');
  const bird = deriveUnitStats(genome('bird', []));
  assert.ok(bird.waveOnHit);
  const pureBug = deriveUnitStats(genome('bug', []));
  const mixedBug = deriveUnitStats(genome('bug', ['bird', 'bird']));
  assert.equal(purity(genome('bug', [])), 6);
  assert.ok(pureBug.cost > mixedBug.cost);
});
