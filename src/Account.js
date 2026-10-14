// Game-wide account/save singleton. Picks the cloud backend adapter and
// boots CloudSync. Until the real Sky Mavis Account / Supabase adapter is
// configured, production runs guest-only (saves on this device, with
// Export/Import for backup) and dev builds use MockCloudBackend so every
// account flow can be exercised end to end.
import { CloudSync, MockCloudBackend } from './CloudSync.js';
import { installWriteMonitor, snapshotSave, restoreSave, validateSnapshot } from './SaveStore.js';

installWriteMonitor();

function pickBackend() {
  if (import.meta.env?.DEV) return new MockCloudBackend();
  return null; // real adapter goes here once credentials exist
}

const backend = pickBackend();
export const accountsAvailable = !!backend;
export const accountProviderLabel = backend ? 'Test account (dev)' : 'Sky Mavis Account';

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
