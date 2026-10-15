import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classEdge, classMultiplier, beatsClasses, weakToClasses, classOfUnit, classOfEnemy, CLASS_STYLE,
} from '../src/AXIE_CLASSES.js';
import { UNIT_CONFIG } from '../src/UNIT_CONFIG.js';
import { ENEMY_CONFIG } from '../src/ENEMY_CONFIG.js';

test('the Axie class triangle', () => {
  // Reptile/Plant/Dusk > Aquatic/Bird/Dawn > Beast/Bug/Mech > Reptile/Plant/Dusk
  assert.equal(classEdge('plant', 'aquatic'), 1);
  assert.equal(classEdge('aquatic', 'beast'), 1);
  assert.equal(classEdge('beast', 'reptile'), 1);
  assert.equal(classEdge('aquatic', 'plant'), -1);
  assert.equal(classEdge('bird', 'dawn'), 0);
  assert.equal(classEdge('beast', null), 0);
  assert.equal(classMultiplier('dusk', 'bird'), 1.15);
  assert.equal(classMultiplier('bird', 'dusk'), 0.85);
  assert.deepEqual(beatsClasses('bug').sort(), ['dusk', 'plant', 'reptile']);
  assert.deepEqual(weakToClasses('bug').sort(), ['aquatic', 'bird', 'dawn']);
});

test('every roster unit and every enemy has a real class', () => {
  for (const [id, u] of Object.entries(UNIT_CONFIG)) {
    if (id === 'lab') continue; // set from the player's design
    assert.ok(CLASS_STYLE[classOfUnit(u)], `unit ${id} has no class`);
  }
  for (const [id, e] of Object.entries(ENEMY_CONFIG)) {
    assert.ok(CLASS_STYLE[classOfEnemy(e)], `enemy ${id} has no class`);
  }
});

test('the roster spans all three sides of the triangle', () => {
  const sides = new Set(Object.keys(UNIT_CONFIG).filter((k) => k !== 'lab').map((k) => {
    const c = classOfUnit(UNIT_CONFIG[k]);
    return ['reptile', 'plant', 'dusk'].includes(c) ? 'A' : ['aquatic', 'bird', 'dawn'].includes(c) ? 'B' : 'C';
  }));
  assert.equal(sides.size, 3);
});

test('class synergies activate from Formation classes', async () => {
  const { getActiveCombos } = await import('../src/Combo.js');
  const ids = (l) => getActiveCombos(l).map((c) => c.id);
  assert.ok(ids(['basic', 'fast', 'bing']).includes('beastPack')); // 3 Beasts
  assert.ok(!ids(['basic', 'fast']).includes('beastPack'));
  assert.ok(ids(['tank', 'ranged', 'basic']).includes('balancedLunacia')); // Plant + Aquatic + Beast
  assert.ok(!ids(['tank', 'support', 'basic']).includes('balancedLunacia'));
});
