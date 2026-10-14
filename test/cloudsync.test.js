import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { snapshotSave, restoreSave, validateSnapshot, installWriteMonitor, isSaveKey } from '../src/SaveStore.js';
import { CloudSync, MockCloudBackend } from '../src/CloudSync.js';

// localStorage-shaped store with key()/length/removeItem.
function makeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _map: m,
  };
}

// Device = local storage; cloud = a separate storage behind the mock backend.
let device;
let cloudStore;
let backend;
let reloads;
const noTimers = { setTimeout: () => 0, clearTimeout: () => {} };

function progress(xp, cleared = []) {
  return {
    axieSkirmishPlayerProgress: JSON.stringify({ xp, gems: 0, units: {} }),
    axieSkirmishStageProgress: JSON.stringify(Object.fromEntries(cleared.map((s) => [s, { cleared: true }]))),
  };
}

function sync() {
  return new CloudSync({ backend, storage: device, reload: () => { reloads += 1; }, timers: noTimers });
}

beforeEach(() => {
  device = makeStorage();
  cloudStore = makeStorage();
  backend = new MockCloudBackend({ storage: cloudStore });
  reloads = 0;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: device });
  installWriteMonitor(device);
});

test('device settings are not part of the save; snapshots round-trip', () => {
  assert.equal(isSaveKey('axieSkirmishMuted'), false);
  assert.equal(isSaveKey('axieSkirmishTreasure'), true);
  Object.entries({ ...progress(500), axieSkirmishMuted: 'true' }).forEach(([k, v]) => device.setItem(k, v));
  const snap = snapshotSave(device);
  assert.equal(validateSnapshot(snap), null);
  assert.ok(!('axieSkirmishMuted' in snap.data));
  snap.data.axieSkirmishTreasure = '{}';
  assert.match(validateSnapshot(snap), /damaged/);
});

test('first sign-in migrates guest progress into the account', async () => {
  Object.entries(progress(1200, ['stage1'])).forEach(([k, v]) => device.setItem(k, v));
  await sync().signIn({ id: 'alice', name: 'Alice' });
  const cloud = await backend.load('alice');
  assert.equal(JSON.parse(cloud.data.axieSkirmishPlayerProgress).xp, 1200);
  assert.equal(reloads, 0); // nothing changed locally
});

test('returning sign-in on a fresh device restores the cloud save', async () => {
  const other = makeStorage(progress(9000, ['stage1', 'stage2']));
  await backend.save('alice', snapshotSave(other));
  await sync().signIn({ id: 'alice', name: 'Alice' });
  assert.equal(JSON.parse(device.getItem('axieSkirmishPlayerProgress')).xp, 9000);
  assert.equal(reloads, 1);
});

test('switching accounts never mixes or exposes the previous player', async () => {
  Object.entries(progress(700, ['stage1'])).forEach(([k, v]) => device.setItem(k, v));
  const s = sync();
  await s.signIn({ id: 'alice', name: 'Alice' });
  await s.signOut();
  assert.equal(device.getItem('axieSkirmishPlayerProgress'), null); // cleared on sign-out
  await s.signIn({ id: 'bob', name: 'Bob' });
  assert.equal(device.getItem('axieSkirmishPlayerProgress'), null); // Bob starts fresh
  const alice = await backend.load('alice');
  assert.equal(JSON.parse(alice.data.axieSkirmishPlayerProgress).xp, 700); // Alice's is safe
});

test('outage at sign-in is a clear error and does not sign the player in', async () => {
  backend.failNext = 1;
  const s = sync();
  await assert.rejects(() => s.signIn({ id: 'alice' }));
  assert.equal(s.user, null);
  assert.match(s.status.message, /failed|retry/i);
});

test('failed cloud save reports and retries', async () => {
  const s = sync();
  await s.signIn({ id: 'alice', name: 'Alice' });
  backend.failNext = 1;
  assert.equal(await s.push(), false);
  assert.match(s.status.message, /retrying/);
  assert.equal(await s.push(), true);
  assert.equal(s.status.state, 'saved');
});

test('restoreSave removes keys the snapshot does not have', () => {
  Object.entries(progress(10)).forEach(([k, v]) => device.setItem(k, v));
  device.setItem('axieSkirmishTreasure', '{"x":1}');
  restoreSave(snapshotSave(makeStorage(progress(50))), device);
  assert.equal(device.getItem('axieSkirmishTreasure'), null);
});
