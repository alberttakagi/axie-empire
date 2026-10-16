import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  weekKey, featuredClass, featuredEnemyRoles, counterClasses, recordWeeklyScore, claimWeeklyTier, getWeeklyState, WEEKLY_TIERS,
} from '../src/WeeklyChallenge.js';
import { loadPlayerProgress } from '../src/PlayerProgress.js';

beforeEach(() => {
  const m = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) } });
});

test('ISO week keys and a featured class that always has Chimeras', () => {
  assert.equal(weekKey(new Date(2026, 0, 1)), '2026-W01');
  assert.equal(weekKey(new Date(2026, 9, 16)), '2026-W42');
  for (let w = 1; w <= 53; w++) {
    const cls = featuredClass(`2026-W${String(w).padStart(2, '0')}`);
    assert.ok(featuredEnemyRoles(cls).length > 0, `week ${w} featured ${cls} has no enemies`);
    assert.ok(counterClasses(cls).length === 3);
  }
});

test('weekly best, tier unlocks and one-time claims', () => {
  const r1 = recordWeeklyScore(700);
  assert.deepEqual(r1.newlyReached, ['bronze']);
  const r2 = recordWeeklyScore(500);
  assert.equal(r2.isNewBest, false);
  assert.equal(r2.best, 700);
  const gems = loadPlayerProgress().gems;
  assert.ok(claimWeeklyTier('bronze'));
  assert.equal(claimWeeklyTier('bronze'), null);
  assert.equal(claimWeeklyTier('silver'), null); // not reached
  assert.equal(loadPlayerProgress().gems, gems + WEEKLY_TIERS[0].reward.amount);
  assert.equal(getWeeklyState().runs.length, 2);
});
