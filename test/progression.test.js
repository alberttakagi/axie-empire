import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  loadFormationsData, loadLoadout, setActiveFormationSlot, swapFormationSlots,
  toggleUnitInActiveFormation, autoEquipActiveSlot, isPinned, togglePinned,
} from '../src/Loadout.js';
import { saveStageResult, loadStageProgress, getClearCount } from '../src/StageProgress.js';
import {
  addXp, getNextLevelCost, loadPlayerProgress, tryLevelUpUnit, isUnitUnlocked,
} from '../src/PlayerProgress.js';
import { getUserRank } from '../src/UserRank.js';
import { claimMission, getMissionsWithStatus } from '../src/Missions.js';

const FORMATIONS_KEY = 'axieSkirmishFormations';
let storage;

beforeEach(() => {
  const values = new Map();
  storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  // Tests use only this disposable in-memory store, never browser saves.
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
});

function formation(name, entries = { 0: 'basic' }, seenUnits = ['basic']) {
  const unitKeys = Array(10).fill(null);
  for (const [index, key] of Object.entries(entries)) unitKeys[index] = key;
  return { name, unitKeys, seenUnits };
}

function seedFormations(data) {
  storage.setItem(FORMATIONS_KEY, JSON.stringify(data));
}

test('fresh formation has ten fixed slots and only the starter', () => {
  assert.deepEqual(loadLoadout(), ['basic', ...Array(9).fill(null)]);
  assert.equal(loadFormationsData().slots.length, 3);
});

test('valid formations retain active slot, custom order, names and pins without a rewrite', () => {
  const data = {
    activeSlot: 1,
    slots: [formation('First'), formation('Custom', { 7: 'basic' }), formation('Third')],
    pinned: ['basic'],
  };
  seedFormations(data);
  const raw = storage.getItem(FORMATIONS_KEY);
  assert.deepEqual(loadFormationsData(), data);
  assert.equal(loadLoadout()[7], 'basic');
  assert.equal(isPinned('basic'), true);
  assert.equal(storage.getItem(FORMATIONS_KEY), raw);
});

test('a new unlock fills a free slot without moving an existing unit, and stays benched after removal', () => {
  seedFormations({ activeSlot: 0, slots: [formation('Custom', { 1: 'basic' }), formation('B'), formation('C')], pinned: [] });
  saveStageResult('stage1', 100, true);
  assert.equal(isUnitUnlocked('tank'), true);
  assert.deepEqual(loadLoadout().slice(0, 3), ['tank', 'basic', null]);
  assert.equal(toggleUnitInActiveFormation('tank').result, 'ok');
  assert.equal(loadLoadout()[0], null);
  assert.equal(loadLoadout()[1], 'basic');
  assert.equal(toggleUnitInActiveFormation('basic').result, 'min-one');
});

test('manual reorder and formation switching survive subsequent reads', () => {
  swapFormationSlots(0, 8);
  assert.equal(loadLoadout()[8], 'basic');
  setActiveFormationSlot(1);
  assert.equal(loadLoadout()[0], 'basic');
  setActiveFormationSlot(0);
  assert.equal(loadLoadout()[8], 'basic');
  assert.equal(loadLoadout()[0], null);
});

test('legacy loadout migrates into formation one and preserves its original key', () => {
  saveStageResult('stage1', 100, true);
  const legacy = JSON.stringify(['tank', 'basic']);
  storage.setItem('axieSkirmishLoadout', legacy);
  assert.deepEqual(loadLoadout().slice(0, 3), ['basic', 'tank', null]);
  togglePinned('tank');
  assert.deepEqual(loadLoadout().slice(0, 3), ['basic', 'tank', null]);
  assert.equal(storage.getItem('axieSkirmishLoadout'), legacy);
});

test('malformed neighboring formations do not discard a valid active formation', () => {
  const valid = formation('Keep my order', { 6: 'basic' });
  seedFormations({ activeSlot: 1, slots: [null, valid, { unitKeys: 'invalid' }], pinned: ['basic'] });
  const data = loadFormationsData();
  assert.deepEqual(data.slots[1], valid);
  assert.equal(loadLoadout()[6], 'basic');
  assert.equal(data.slots[0].unitKeys[0], 'basic');
  assert.equal(data.slots[2].unitKeys[0], 'basic');
  assert.equal(isPinned('basic'), true);
});

test('a missing formation is defaulted without resetting valid saved slots', () => {
  seedFormations({ activeSlot: 1, slots: [formation('A'), formation('B', { 9: 'basic' })], pinned: [] });
  const data = loadFormationsData();
  assert.equal(data.slots.length, 3);
  assert.equal(data.slots[1].name, 'B');
  assert.equal(loadLoadout()[9], 'basic');
});

test('invalid active indexes and pins cannot crash formation actions', () => {
  for (const activeSlot of [-1, 3, 0.5, '1', null]) {
    const corrupted = { activeSlot, slots: [null, null, null], pinned: {} };
    for (const action of [
      () => loadLoadout(), () => toggleUnitInActiveFormation('basic'),
      () => swapFormationSlots(0, 4), () => autoEquipActiveSlot(),
      () => isPinned('basic'), () => togglePinned('basic'),
    ]) {
      seedFormations(corrupted);
      assert.doesNotThrow(action);
    }
  }
});

test('invalid unit entries are removed without compacting valid slot positions', () => {
  const slot = formation('Sparse', { 0: 'unknown', 2: 'basic', 4: 'basic', 6: 'guardian', 8: 'constructor' });
  seedFormations({ activeSlot: 0, slots: [slot, formation('B'), formation('C')], pinned: [] });
  assert.deepEqual(loadLoadout(), [null, null, 'basic', ...Array(7).fill(null)]);
});

test('invalid JSON and unavailable storage do not prevent loading a starter formation', () => {
  storage.setItem(FORMATIONS_KEY, '{');
  assert.equal(loadLoadout()[0], 'basic');
  storage.getItem = () => { throw new Error('Storage unavailable'); };
  storage.setItem = () => { throw new Error('Storage unavailable'); };
  assert.equal(loadLoadout()[0], 'basic');
  assert.doesNotThrow(() => swapFormationSlots(0, 5));
});

test('a loss preserves an earlier clear, best score and unlock', () => {
  saveStageResult('stage1', 200, true);
  saveStageResult('stage1', 20, false);
  assert.deepEqual(loadStageProgress().stage1, { cleared: true, bestScore: 200, clears: 1 });
  assert.equal(isUnitUnlocked('tank'), true);
  saveStageResult('stage1', 300, true);
  assert.equal(getClearCount('stage1'), 2);
  assert.equal(loadStageProgress().stage1.bestScore, 300);
});

test('older stage records without clear counts remain usable', () => {
  storage.setItem('axieSkirmishStageProgress', JSON.stringify({ stage1: { cleared: true, bestScore: 50 } }));
  saveStageResult('stage1', 100, true);
  assert.equal(getClearCount('stage1'), 1);
});

test('level-up charges the displayed XP cost once and adds rank', () => {
  assert.deepEqual(tryLevelUpUnit('basic'), { ok: false, reason: 'insufficient-xp' });
  const cost = getNextLevelCost('basic');
  addXp(cost);
  assert.deepEqual(tryLevelUpUnit('basic'), { ok: true });
  assert.equal(loadPlayerProgress().xp, 0);
  assert.equal(loadPlayerProgress().units.basic.level, 2);
  assert.equal(getUserRank(), 1);
  assert.equal(tryLevelUpUnit('basic').ok, false);
  assert.equal(getUserRank(), 1);
});

test('mission rewards cannot be claimed before eligibility or paid twice', () => {
  const stageMission = getMissionsWithStatus().find((mission) => mission.type === 'stagesCleared' && mission.target === 1);
  assert.ok(stageMission);
  assert.equal(claimMission(stageMission.id), null);
  saveStageResult('stage1', 100, true);
  assert.ok(claimMission(stageMission.id));
  assert.equal(loadPlayerProgress().gems, stageMission.rewardGems);
  assert.equal(claimMission(stageMission.id), null);
  assert.equal(loadPlayerProgress().gems, stageMission.rewardGems);
});
