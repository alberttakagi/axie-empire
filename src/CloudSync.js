// Account-linked saves. Ties the one logical save (SaveStore.js) to a
// signed-in player and keeps it synced with a backend. The backend is an
// adapter (see MockCloudBackend below; a Supabase / Sky Mavis Account
// adapter plugs in with the same five methods), so the rules here are
// written and tested once:
//
//  - First sign-in on a device: local progress that belongs to nobody is
//    MIGRATED into the account (no second registration, nothing lost).
//  - Returning sign-in: the account's cloud save is restored; if this
//    device holds newer progress for the SAME account, that wins.
//  - Account switching: progress owned by another account is never shown
//    to or merged into a different player — it's backed up locally and the
//    new account's own save loads.
//  - Sign-out: the save is flushed to the cloud, then cleared from this
//    device so the next person can't see it.
//  - Outage: sign-in fails with a clear, retryable error; the player is
//    NOT treated as signed in (no bypassing auth), but local play stays
//    available as a guest.
//  - Saving: writes are debounced and pushed with retry/backoff; the
//    status (saved / saving / failed — retrying) is published for the HUD.
import {
  snapshotSave, restoreSave, clearSave, hasMeaningfulProgress, onSaveWrite, META_PREFIX,
} from './SaveStore.js';

const OWNER_KEY = `${META_PREFIX}Owner`; // account id the local save belongs to
const LOCAL_WRITE_KEY = `${META_PREFIX}LocalWriteAt`;
const BACKUP_KEY = `${META_PREFIX}Backup`; // last displaced local save, for recovery
const PUSH_DEBOUNCE_MS = 1500;
const RETRY_STEPS_MS = [2000, 5000, 15000, 30000];

export class CloudSync {
  constructor({ backend, storage = globalThis.localStorage, reload = () => globalThis.location?.reload(), timers = globalThis }) {
    this.backend = backend;
    this.storage = storage;
    this.reload = reload;
    this.timers = timers;
    this.user = null;
    this.status = { state: 'local', message: 'Playing as guest — progress is saved on this device only.' };
    this.listeners = new Set();
    this.pushTimer = null;
    this.retryIndex = 0;
    this.unsubscribe = onSaveWrite((e) => this.onLocalWrite(e));
  }

  onStatus(fn) {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  setStatus(state, message) {
    this.status = { state, message, at: Date.now() };
    this.listeners.forEach((fn) => fn(this.status));
  }

  get owner() {
    return this.storage.getItem(OWNER_KEY) || null;
  }

  setOwner(id) {
    if (id) this.storage.setItem(OWNER_KEY, id);
    else if (this.storage.removeItem) this.storage.removeItem(OWNER_KEY);
    else this.storage.setItem(OWNER_KEY, null);
  }

  localWriteAt() {
    return Number(this.storage.getItem(LOCAL_WRITE_KEY)) || 0;
  }

  onLocalWrite(e) {
    if (!e.ok) {
      this.setStatus('error', "Couldn't save on this device (storage full or blocked). Progress since then may be lost.");
      return;
    }
    this.storage.setItem(LOCAL_WRITE_KEY, String(Date.now()));
    if (!this.user) return;
    this.schedulePush(PUSH_DEBOUNCE_MS);
  }

  schedulePush(delay) {
    if (this.pushTimer) this.timers.clearTimeout(this.pushTimer);
    this.pushTimer = this.timers.setTimeout(() => this.push(), delay);
  }

  async push() {
    this.pushTimer = null;
    if (!this.user) return false;
    this.setStatus('saving', 'Saving…');
    try {
      const snap = snapshotSave(this.storage);
      await this.backend.save(this.user.id, snap);
      this.retryIndex = 0;
      this.setStatus('saved', `Saved to ${this.user.name}'s account`);
      return true;
    } catch (e) {
      const wait = RETRY_STEPS_MS[Math.min(this.retryIndex, RETRY_STEPS_MS.length - 1)];
      this.retryIndex += 1;
      this.setStatus('error', `Save failed — retrying in ${Math.round(wait / 1000)}s`);
      this.schedulePush(wait);
      return false;
    }
  }

  // Boot: resume a remembered session (no prompt) and pull newer cloud data.
  async resume() {
    let user = null;
    try {
      user = await this.backend.currentUser();
    } catch {
      this.setStatus('local', 'Offline — playing as guest. Your account will sync when you reconnect.');
      return null;
    }
    if (!user) return null;
    return this.adoptUser(user, { quiet: true });
  }

  async signIn(options) {
    this.setStatus('saving', 'Signing in…');
    let user;
    try {
      user = await this.backend.signIn(options);
    } catch (e) {
      this.setStatus('local', `Sign-in failed: ${e.message || e}. Please try again.`);
      throw e;
    }
    return this.adoptUser(user, { quiet: false });
  }

  async adoptUser(user, { quiet }) {
    // A session can surface twice at load (resume + auth event): adopt once.
    if (this.adopting?.id === user.id) return this.adopting.promise;
    const promise = this.adoptUserInner(user, { quiet });
    this.adopting = { id: user.id, promise };
    try {
      return await promise;
    } finally {
      this.adopting = null;
    }
  }

  async adoptUserInner(user, { quiet }) {
    let cloud;
    try {
      cloud = await this.backend.load(user.id);
    } catch (e) {
      // Don't treat the player as signed in if we can't read their save —
      // that could overwrite their real progress with this device's.
      this.setStatus('local', "Couldn't reach the save server. Your account is safe — tap to retry.");
      throw e;
    }
    const local = snapshotSave(this.storage);
    const owner = this.owner;
    let changed = false;

    if (owner && owner !== user.id) {
      // Another player's progress is on this device: set it aside, never merge.
      this.storage.setItem(BACKUP_KEY, JSON.stringify({ owner, snapshot: local }));
      if (cloud) restoreSave(cloud, this.storage);
      else clearSave(this.storage);
      changed = true;
    } else if (cloud) {
      const localNewer = owner === user.id && this.localWriteAt() > (cloud.savedAt || 0);
      if (!localNewer) {
        if (!owner && hasMeaningfulProgress(local)) {
          this.storage.setItem(BACKUP_KEY, JSON.stringify({ owner: null, snapshot: local }));
        }
        restoreSave(cloud, this.storage);
        changed = true;
      }
    }
    // else: no cloud save yet → this device's (guest or own) progress becomes the account's.

    this.setOwner(user.id);
    this.user = user;
    await this.push();
    if (!quiet) this.setStatus('saved', `Signed in as ${user.name} — progress saved to your account`);
    if (changed) this.reload();
    return { user, restored: changed };
  }

  async signOut() {
    if (!this.user) return;
    if (this.pushTimer) this.timers.clearTimeout(this.pushTimer);
    const ok = await this.push();
    if (!ok) {
      this.setStatus('error', "Couldn't save before signing out. Stay signed in and try again so nothing is lost.");
      return false;
    }
    try {
      await this.backend.signOut();
    } catch {
      // Session cleanup failure is harmless — the local save is cleared below either way.
    }
    clearSave(this.storage);
    this.setOwner(null);
    this.user = null;
    this.setStatus('local', 'Signed out. Playing as guest.');
    this.reload();
    return true;
  }

  // Recovery: the save that a sign-in displaced, if any.
  getBackup() {
    try {
      return JSON.parse(this.storage.getItem(BACKUP_KEY));
    } catch {
      return null;
    }
  }
}

// In-memory/localStorage "cloud" with the exact adapter shape a real
// backend implements. Used by tests, and in dev builds as a test account
// so every account flow can be exercised before Supabase / Sky Mavis
// credentials exist. NOT a real account system.
export class MockCloudBackend {
  constructor({ storage = globalThis.localStorage, failNext = 0 } = {}) {
    this.storage = storage;
    this.failNext = failNext;
    this.KEY = `${META_PREFIX}MockCloud`;
    this.SESSION = `${META_PREFIX}MockSession`;
  }

  db() {
    try {
      return JSON.parse(this.storage.getItem(this.KEY)) || {};
    } catch {
      return {};
    }
  }

  maybeFail() {
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error('Network error (simulated)');
    }
  }

  async currentUser() {
    this.maybeFail();
    try {
      return JSON.parse(this.storage.getItem(this.SESSION));
    } catch {
      return null;
    }
  }

  async signIn({ id, name } = {}) {
    this.maybeFail();
    const user = { id: id || 'tester', name: name || 'Tester', provider: 'mock' };
    this.storage.setItem(this.SESSION, JSON.stringify(user));
    return user;
  }

  async signOut() {
    if (this.storage.removeItem) this.storage.removeItem(this.SESSION);
    else this.storage.setItem(this.SESSION, null);
  }

  async load(userId) {
    this.maybeFail();
    return this.db()[userId] || null;
  }

  async save(userId, snapshot) {
    this.maybeFail();
    const db = this.db();
    db[userId] = snapshot;
    this.storage.setItem(this.KEY, JSON.stringify(db));
  }
}
