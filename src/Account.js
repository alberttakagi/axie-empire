// Game-wide account/save singleton. Picks the cloud backend adapter and
// boots CloudSync:
//   - VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set (.env.local locally,
//     Vercel env vars in production) → real accounts (email sign-in) with
//     cloud saves (SupabaseBackend.js, supabase/schema.sql).
//   - otherwise dev builds use MockCloudBackend so every account flow can
//     still be exercised, and production runs guest-only (saves on this
//     device, with Export/Import for backup).
import { CloudSync, MockCloudBackend } from './CloudSync.js';
import { SupabaseBackend } from './SupabaseBackend.js';
import { installWriteMonitor, snapshotSave, restoreSave, validateSnapshot } from './SaveStore.js';

installWriteMonitor();

const env = import.meta.env || {};

function pickBackend() {
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
    return new SupabaseBackend({
      url: env.VITE_SUPABASE_URL,
      anonKey: env.VITE_SUPABASE_ANON_KEY,
      waypointClientId: env.VITE_WAYPOINT_CLIENT_ID || null,
    });
  }
  if (env.DEV) return new MockCloudBackend();
  return null;
}

const backend = pickBackend();
export const accountsAvailable = !!backend;
// 'email' → the email-code form (AccountForms.js); 'mock' → one-tap test account.
export const accountKind = backend instanceof SupabaseBackend ? 'email' : backend ? 'mock' : 'none';
export const accountProviderLabel = accountKind === 'email' ? 'Email' : backend ? 'Test account (dev)' : 'Sky Mavis Account';

// Sky Mavis Account (Ronin Waypoint) is offered when its client ID is set too.
export const waypointAvailable = accountKind === 'email' && !!env.VITE_WAYPOINT_CLIENT_ID;

export function preloadWaypoint() {
  return waypointAvailable ? backend.preloadWaypoint().catch(() => {}) : Promise.resolve();
}

export function requestEmailCode(email) {
  return backend.requestEmailCode(email);
}

export const cloudSync = backend
  ? new CloudSync({ backend })
  : {
    user: null,
    status: { state: 'local', message: 'Progress is saved on this device. Use Export to back it up.' },
    onStatus(fn) { fn(this.status); return () => {}; },
    resume: async () => null,
    getBackup: () => null,
  };

// Resume a remembered session at startup (never prompts).
cloudSync.resume().catch(() => {});
// Magic-link sign-in: the link reopens the game and the session arrives as
// an auth event — adopt it like a code sign-in.
if (backend?.onSignedIn) {
  backend.onSignedIn((user) => {
    if (!cloudSync.user || cloudSync.user.id !== user.id) cloudSync.adoptUser(user, { quiet: false }).catch(() => {});
  });
}

export function exportSaveFile() {
  const snap = snapshotSave();
  const blob = new Blob([JSON.stringify(snap)], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = `axie-empire-save-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Opens a file picker; resolves with an error message, or reloads on success.
export function importSaveFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve('No file chosen.');
      try {
        const snap = JSON.parse(await file.text());
        const err = validateSnapshot(snap);
        if (err) return resolve(err);
        restoreSave(snap);
        resolve(null);
        location.reload();
      } catch {
        resolve('That file is not an Axie Empire save.');
      }
    };
    input.click();
  });
}

// Sparring Grounds global leaderboard — real accounts only (Supabase).
export const leaderboardAvailable = accountKind === 'email';

export async function submitDojoScore(entry) {
  if (!leaderboardAvailable || !cloudSync.user) return false;
  try {
    return await backend.submitDojoScore(cloudSync.user, entry);
  } catch {
    return false; // the board is a bonus; never break the run's end screen
  }
}

export async function fetchDojoLeaderboard(week) {
  if (!leaderboardAvailable) return null;
  return backend.topDojoScores(week);
}
