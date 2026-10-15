import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { SupabaseBackend } from '../src/SupabaseBackend.js';
import { CloudSync } from '../src/CloudSync.js';
import { installWriteMonitor } from '../src/SaveStore.js';

// Minimal fake of the supabase-js surface the adapter uses: auth OTP flow
// + one table with RLS-like "only your own row" behaviour.
function fakeSupabase() {
  const rows = new Map();
  const sent = [];
  let session = null;
  const users = new Map();
  const api = {
    sent,
    rows,
    auth: {
      async getSession() { return { data: { session }, error: null }; },
      async signInWithOtp({ email }) {
        if (email.includes('ratelimit')) return { error: { message: 'Email rate limit exceeded' } };
        sent.push(email);
        return { error: null };
      },
      async verifyOtp({ email, token }) {
        if (token !== '123456') return { data: {}, error: { message: 'Token has expired or is invalid' } };
        if (!users.has(email)) users.set(email, { id: `uid-${users.size + 1}`, email });
        session = { user: users.get(email) };
        return { data: { user: session.user, session }, error: null };
      },
      async signOut() { session = null; return { error: null }; },
      onAuthStateChange() {},
    },
    from() {
      const q = { filters: {} };
      return {
        select() { return this; },
        eq(col, v) { q.filters[col] = v; return this; },
        async maybeSingle() {
          const uid = q.filters.user_id;
          if (!session || session.user.id !== uid) return { data: null, error: null }; // RLS hides other rows
          return { data: rows.has(uid) ? { snapshot: rows.get(uid).snapshot } : null, error: null };
        },
        async upsert(row) {
          if (!session || session.user.id !== row.user_id) return { error: { message: 'new row violates row-level security policy' } };
          rows.set(row.user_id, row);
          return { error: null };
        },
      };
    },
  };
  return api;
}

function makeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

let sb;
let backend;
beforeEach(() => {
  sb = fakeSupabase();
  backend = new SupabaseBackend({ client: sb });
});

test('email code request validates and normalises the address', async () => {
  await assert.rejects(() => backend.requestEmailCode('not-an-email'), /valid email/);
  assert.equal(await backend.requestEmailCode('  Alice@Example.com '), 'alice@example.com');
  assert.deepEqual(sb.sent, ['alice@example.com']);
  await assert.rejects(() => backend.requestEmailCode('ratelimit@x.io'), /wait a minute/);
});

test('code sign-in returns a game user; wrong codes give a friendly error', async () => {
  await assert.rejects(() => backend.signIn({ email: 'a@b.co', code: '12' }), /6-digit/);
  await assert.rejects(() => backend.signIn({ email: 'a@b.co', code: '000000' }), /wrong or expired/);
  const user = await backend.signIn({ email: 'a@b.co', code: '123 456' });
  assert.equal(user.name, 'a');
  assert.equal((await backend.currentUser()).id, user.id);
});

test('saves round-trip for the signed-in player only', async () => {
  const user = await backend.signIn({ email: 'a@b.co', code: '123456' });
  await backend.save(user.id, { version: 1, savedAt: 5, checksum: 'x', data: {} });
  assert.equal((await backend.load(user.id)).savedAt, 5);
  await assert.rejects(() => backend.save('someone-else', { data: {} }), /Couldn't save|row-level/);
});

test('full CloudSync flow over the Supabase adapter migrates guest progress', async () => {
  const device = makeStorage({ axieSkirmishPlayerProgress: JSON.stringify({ xp: 4200 }) });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: device });
  installWriteMonitor(device);
  const sync = new CloudSync({ backend, storage: device, reload: () => {}, timers: { setTimeout: () => 0, clearTimeout: () => {} } });
  await backend.requestEmailCode('p@q.io');
  const { user } = await sync.signIn({ email: 'p@q.io', code: '123456' });
  const row = sb.rows.get(user.id);
  assert.equal(JSON.parse(row.snapshot.data.axieSkirmishPlayerProgress).xp, 4200);
  assert.equal(sync.status.state, 'saved');
});

test('Sky Mavis (Waypoint) sign-in: verified token becomes a Supabase session', async () => {
  const calls = [];
  sb.auth.verifyOtp = async ({ token_hash, type }) => {
    calls.push(['verify', token_hash, type]);
    return { data: { user: { id: 'uid-wp', email: 'wp-x@waypoint.axie-empire.app', user_metadata: { provider: 'waypoint', display_name: 'Lunacian', ronin_address: '0xabc' } } }, error: null };
  };
  const wp = new SupabaseBackend({
    url: 'https://p.supabase.co', anonKey: 'anon', client: sb, waypointClientId: 'cid',
    waypointAuthorize: async (opts) => { calls.push(['authorize', opts.mode, opts.clientId]); return { token: 'jwt.from.skymavis' }; },
    fetchImpl: async (url, init) => {
      calls.push(['fetch', url, JSON.parse(init.body).id_token]);
      return { ok: true, json: async () => ({ token_hash: 'hash123', email: 'wp-x@waypoint.axie-empire.app' }) };
    },
  });
  const user = await wp.signIn({ provider: 'waypoint' });
  assert.deepEqual(calls, [
    ['authorize', 'popup', 'cid'],
    ['fetch', 'https://p.supabase.co/functions/v1/waypoint-login', 'jwt.from.skymavis'],
    ['verify', 'hash123', 'magiclink'],
  ]);
  assert.equal(user.provider, 'waypoint');
  assert.equal(user.roninAddress, '0xabc');
});

test('Sky Mavis sign-in surfaces server rejection and cancelled popups', async () => {
  const base = { url: 'https://p.supabase.co', anonKey: 'anon', client: sb, waypointClientId: 'cid' };
  const rejected = new SupabaseBackend({
    ...base,
    waypointAuthorize: async () => ({ token: 'bad' }),
    fetchImpl: async () => ({ ok: false, json: async () => ({ error: 'Sky Mavis sign-in could not be verified (expired).' }) }),
  });
  await assert.rejects(() => rejected.signIn({ provider: 'waypoint' }), /could not be verified/);
  const cancelled = new SupabaseBackend({ ...base, waypointAuthorize: async () => { throw new Error('Popup closed by user'); } });
  await assert.rejects(() => cancelled.signIn({ provider: 'waypoint' }), /cancelled/);
  const unconfigured = new SupabaseBackend({ url: 'x', anonKey: 'y', client: sb });
  await assert.rejects(() => unconfigured.signIn({ provider: 'waypoint' }), /not configured/);
});
