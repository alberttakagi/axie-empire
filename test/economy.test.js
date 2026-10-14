import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  getDailyStatus, claimLoginReward, claimDailyMission, getLedgerSummary,
  buyOffer, getDailyDeal, earnGems, LOGIN_CALENDAR,
} from '../src/Economy.js';
import { loadPlayerProgress } from '../src/PlayerProgress.js';
import { addLifetimeStat } from '../src/LifetimeStats.js';

let values;

beforeEach(() => {
  values = new Map();
  // Disposable in-memory store, never browser saves.
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)) },
  });
});

test('login reward claims once per day and is logged', () => {
  const before = loadPlayerProgress().gems;
  const reward = claimLoginReward();
  assert.deepEqual(reward, LOGIN_CALENDAR[0]);
  assert.equal(claimLoginReward(), null);
  assert.equal(loadPlayerProgress().gems, before + LOGIN_CALENDAR[0].amount);
  assert.equal(getLedgerSummary().earned, LOGIN_CALENDAR[0].amount);
});

test('streak advances after a claimed day and resets after a gap', () => {
  claimLoginReward();
  const state = JSON.parse(values.get('axieEmpireDaily'));
  const yesterday = new Date(Date.now() - 86400000);
  state.day = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  values.set('axieEmpireDaily', JSON.stringify(state));
  assert.equal(getDailyStatus().streak, 2);

  const old = JSON.parse(values.get('axieEmpireDaily'));
  old.day = '2000-01-01';
  values.set('axieEmpireDaily', JSON.stringify(old));
  assert.equal(getDailyStatus().streak, 1);
});

test('daily missions count only progress made today', () => {
  addLifetimeStat('battlesWon', 10); // before today's snapshot
  getDailyStatus();
  assert.equal(claimDailyMission('win3'), null);
  addLifetimeStat('battlesWon', 3);
  assert.ok(claimDailyMission('win3'));
  assert.equal(claimDailyMission('win3'), null);
});

test('market spends Gems, refuses when broke, deal sells out', () => {
  assert.equal(buyOffer('evo').ok, false); // fresh save has too few Gems
  earnGems(500, 'test');
  const gems = loadPlayerProgress().gems;
  assert.ok(buyOffer('evo').ok);
  assert.equal(loadPlayerProgress().gems, gems - 120);
  assert.ok(buyOffer(null, { deal: true }).ok);
  assert.equal(getDailyDeal().bought, true);
  assert.equal(buyOffer(null, { deal: true }).reason, 'sold-out');
});
