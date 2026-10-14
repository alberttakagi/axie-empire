// One logical save for the whole game. Every system keeps its own small
// localStorage key (PlayerProgress, Energy, Treasure, ...); this module
// treats all of them together as ONE save so it can be snapshotted,
// validated, exported/imported, and (CloudSync.js) tied to a player
// account — without touching any of those systems.
//
// Device-only settings (volume, mute) are deliberately NOT part of the
// save: they belong to the device, not the player.

export const SAVE_VERSION = 1;
const SAVE_PREFIXES = ['axieSkirmish', 'axieEmpire'];
const DEVICE_KEYS = new Set([
  'axieSkirmishBgmVolumeLevel', 'axieSkirmishSfxVolumeLevel', 'axieSkirmishMuted',
]);
// Bookkeeping keys owned by the sync layer itself, never synced.
export const META_PREFIX = 'axieEmpireSync';

export function isSaveKey(key) {
  return typeof key === 'string'
    && SAVE_PREFIXES.some((p) => key.startsWith(p))
    && !DEVICE_KEYS.has(key)
    && !key.startsWith(META_PREFIX);
}

function storageKeys(storage) {
  // Works for the real localStorage and the tests' Map-backed mock.
  if (typeof storage.length === 'number' && typeof storage.key === 'function') {
    const keys = [];
    for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
    return keys;
  }
  return storage._keys ? storage._keys() : [];
}

// Stable checksum (FNV-1a) — catches truncated/corrupted imports.
function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

export function snapshotSave(storage = globalThis.localStorage) {
  const data = {};
  for (const key of storageKeys(storage).sort()) {
    if (isSaveKey(key)) data[key] = storage.getItem(key);
  }
  const body = JSON.stringify(data);
  return { version: SAVE_VERSION, savedAt: Date.now(), checksum: checksum(body), data };
}

// A save with no stage cleared, no XP and no units owned is "empty" —
// used to decide whether a first sign-in should upload local progress.
export function hasMeaningfulProgress(snapshot) {
  const d = snapshot?.data || {};
  try {
    const stages = JSON.parse(d.axieSkirmishStageProgress || '{}');
    if (Object.values(stages).some((s) => s?.cleared)) return true;
    const progress = JSON.parse(d.axieSkirmishPlayerProgress || '{}');
    return (progress.xp || 0) > 0;
  } catch {
    return false;
  }
}

export function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return 'Not a save file.';
  if (snapshot.version !== SAVE_VERSION) return `Unsupported save version (${snapshot.version}).`;
  if (!snapshot.data || typeof snapshot.data !== 'object') return 'Save has no data.';
  if (checksum(JSON.stringify(snapshot.data)) !== snapshot.checksum) return 'Save file is damaged (checksum mismatch).';
  for (const [k, v] of Object.entries(snapshot.data)) {
    if (!isSaveKey(k)) return `Unexpected entry "${k}".`;
    if (v !== null && typeof v !== 'string') return `Bad value for "${k}".`;
  }
  return null;
}

// Replaces the whole save with `snapshot` (keys missing from it are
// removed, so no progress from the previous player lingers).
export function restoreSave(snapshot, storage = globalThis.localStorage) {
  const err = validateSnapshot(snapshot);
  if (err) throw new Error(err);
  clearSave(storage);
  for (const [k, v] of Object.entries(snapshot.data)) {
    if (v !== null) storage.setItem(k, v);
  }
}

export function clearSave(storage = globalThis.localStorage) {
  for (const key of storageKeys(storage)) {
    if (isSaveKey(key)) {
      if (typeof storage.removeItem === 'function') storage.removeItem(key);
      else storage.setItem(key, null);
    }
  }
}

// ---- Write health ----
// Wraps localStorage.setItem once so any failed write of a save key (quota,
// private mode) is reported instead of silently lost, and every successful
// write marks the save dirty for CloudSync. Returns an unsubscribe-free
// listener registry.
const listeners = new Set();
const monitored = new WeakSet();

export function onSaveWrite(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function installWriteMonitor(storage = globalThis.localStorage) {
  if (!storage || monitored.has(storage)) return;
  monitored.add(storage);
  const original = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    try {
      original(key, value);
      if (isSaveKey(key)) listeners.forEach((fn) => fn({ ok: true, key }));
    } catch (e) {
      if (isSaveKey(key)) listeners.forEach((fn) => fn({ ok: false, key, error: e }));
      throw e;
    }
  };
}
