// Supabase adapter for CloudSync (same five methods as MockCloudBackend,
// plus requestEmailCode for passwordless email sign-in).
//
// Sign-in: the player types their email → Supabase emails them a 6-digit
// code (and a magic link) → they type the code here, or tap the link,
// which reopens the game already signed in (the client picks the session
// out of the URL). No passwords to store or forget.
//
// Saves live in public.saves (see supabase/schema.sql), one row per player,
// protected by Row Level Security.
//
// The supabase-js client is created lazily (dynamic import) so guests who
// never sign in don't download it. Tests pass a fake `client`.

const TABLE = 'saves';

function friendly(error, fallback) {
  const msg = error?.message || String(error || '');
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts — please wait a minute and try again.';
  if (/expired|invalid.*(token|otp)|token.*(invalid|expired)/i.test(msg)) return 'That code is wrong or expired. Request a new one.';
  if (/fetch|network|failed to/i.test(msg)) return "Can't reach the account server. Check your connection and try again.";
  if (/email/i.test(msg) && /invalid/i.test(msg)) return 'Please enter a valid email address.';
  return fallback || msg || 'Something went wrong. Please try again.';
}

function toUser(u) {
  if (!u) return null;
  const email = u.email || '';
  const meta = u.user_metadata || {};
  if (meta.provider === 'waypoint') {
    return { id: u.id, name: meta.display_name || 'Lunacian', email: '', provider: 'waypoint', roninAddress: meta.ronin_address || null };
  }
  return { id: u.id, name: email ? email.split('@')[0] : 'Player', email, provider: 'email' };
}

export class SupabaseBackend {
  constructor({ url, anonKey, client = null, waypointClientId = null, fetchImpl = null, waypointAuthorize = null } = {}) {
    this.url = url;
    this.anonKey = anonKey;
    this.client = client;
    this.waypointClientId = waypointClientId;
    this.fetchImpl = fetchImpl;
    this.waypointAuthorize = waypointAuthorize; // tests inject; the game lazy-loads @sky-mavis/waypoint
    this.label = 'Email';
  }

  async sb() {
    if (!this.client) {
      const { createClient } = await import('@supabase/supabase-js');
      this.client = createClient(this.url, this.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
      });
    }
    return this.client;
  }

  async currentUser() {
    const sb = await this.sb();
    const { data, error } = await sb.auth.getSession();
    if (error) throw new Error(friendly(error));
    return toUser(data?.session?.user);
  }

  async requestEmailCode(email) {
    const clean = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Please enter a valid email address.');
    const sb = await this.sb();
    const redirect = typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : undefined;
    const { error } = await sb.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true, emailRedirectTo: redirect } });
    if (error) throw new Error(friendly(error, "Couldn't send the code."));
    return clean;
  }

  // options: { email, code } for email, or { provider: 'waypoint' }
  async signIn({ email, code, provider } = {}) {
    if (provider === 'waypoint') return this.signInWithWaypoint();
    const sb = await this.sb();
    const token = String(code || '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(token)) throw new Error('Enter the 6-digit code from the email.');
    const { data, error } = await sb.auth.verifyOtp({ email: String(email).trim().toLowerCase(), token, type: 'email' });
    if (error) throw new Error(friendly(error, "Couldn't verify that code."));
    return toUser(data?.user || data?.session?.user);
  }

  // Sky Mavis Account (Ronin Waypoint): popup → ID token → our Edge
  // Function verifies it (supabase/functions/waypoint-login) → one-time
  // token → normal Supabase session. Basic play never needs this.
  // Load the Waypoint SDK ahead of the tap: browsers only allow the popup
  // if it opens straight from the click, with no network wait in between.
  async preloadWaypoint() {
    if (!this.waypointAuthorize && this.waypointClientId) {
      ({ authorize: this.waypointAuthorize } = await import('@sky-mavis/waypoint'));
    }
  }

  async signInWithWaypoint() {
    if (!this.waypointClientId) throw new Error('Sky Mavis sign-in is not configured yet.');
    let authorize = this.waypointAuthorize;
    if (!authorize) ({ authorize } = await import('@sky-mavis/waypoint'));
    let result;
    try {
      result = await authorize({ mode: 'popup', clientId: this.waypointClientId, scopes: ['openid', 'profile'] });
    } catch (e) {
      if (/closed|cancel|denied|reject/i.test(e?.message || '')) throw new Error('Sign-in was cancelled.');
      throw new Error(friendly(e, "Couldn't open Sky Mavis sign-in. Allow pop-ups and try again."));
    }
    if (!result?.token) throw new Error('Sky Mavis sign-in did not return a token.');
    const doFetch = this.fetchImpl || globalThis.fetch.bind(globalThis);
    let res;
    try {
      res = await doFetch(`${this.url}/functions/v1/waypoint-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: this.anonKey, Authorization: `Bearer ${this.anonKey}` },
        body: JSON.stringify({ id_token: result.token }),
      });
    } catch (e) {
      throw new Error(friendly(e));
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Sky Mavis sign-in failed. Please try again.');
    const sb = await this.sb();
    const { data, error } = await sb.auth.verifyOtp({ token_hash: body.token_hash, type: 'magiclink' });
    if (error) throw new Error(friendly(error, "Couldn't finish signing in."));
    return toUser(data?.user || data?.session?.user);
  }

  async signOut() {
    const sb = await this.sb();
    await sb.auth.signOut();
  }

  async load(userId) {
    const sb = await this.sb();
    const { data, error } = await sb.from(TABLE).select('snapshot').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(friendly(error, "Couldn't load your save."));
    return data?.snapshot || null;
  }

  async save(userId, snapshot) {
    const sb = await this.sb();
    const now = new Date().toISOString();
    const { error } = await sb.from(TABLE).upsert(
      { user_id: userId, snapshot, saved_at: new Date(snapshot.savedAt || Date.now()).toISOString(), updated_at: now },
      { onConflict: 'user_id' },
    );
    if (error) throw new Error(friendly(error, "Couldn't save to your account."));
  }

  // Magic-link sign-ins land as an auth event after the page loads.
  async onSignedIn(fn) {
    const sb = await this.sb();
    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) fn(toUser(session.user));
    });
  }
}
