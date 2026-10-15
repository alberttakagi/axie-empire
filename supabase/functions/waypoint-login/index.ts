// Supabase Edge Function: sign in with Ronin Waypoint (Sky Mavis Account).
//
// The game opens the Waypoint popup (@sky-mavis/waypoint authorize) and
// gets an ID token (a JWT signed by Sky Mavis). It POSTs that token here.
// We verify it exactly as Sky Mavis's "Verify user identity" guide says
// (issuer https://id.skymavis.com, audience = our Waypoint client ID, keys
// from https://waypoint.roninchain.com/.well-known/jwks.json), then find or
// create the matching Supabase user and return a one-time sign-in token
// the game exchanges for a normal Supabase session (auth.verifyOtp with
// token_hash). From then on saves work exactly like email accounts — the
// same RLS-protected `saves` row, keyed by the Supabase user id.
//
// Deploy:  supabase functions deploy waypoint-login --no-verify-jwt
// Secrets: supabase secrets set WAYPOINT_CLIENT_ID=<client id>
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const ISSUER = 'https://id.skymavis.com';
const JWKS = createRemoteJWKSet(new URL('https://waypoint.roninchain.com/.well-known/jwks.json'));
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let idToken = '';
  try {
    idToken = (await req.json()).id_token || '';
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }
  if (!idToken) return json({ error: 'Missing id_token.' }, 400);

  // 1. Verify the Waypoint ID token (signature, issuer, audience, expiry).
  let sub: string;
  let address: string | undefined;
  let name: string | undefined;
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: ISSUER,
      audience: Deno.env.get('WAYPOINT_CLIENT_ID'),
    });
    sub = String(payload.sub);
    address = (payload as Record<string, unknown>).ronin_address as string | undefined;
    name = ((payload as Record<string, unknown>).name as string | undefined) || undefined;
  } catch (e) {
    return json({ error: `Sky Mavis sign-in could not be verified (${(e as Error).message}).` }, 401);
  }

  // 2. Find or create the Supabase user for this Waypoint identity. A
  //    synthetic, never-emailed address keeps one stable user per `sub`.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const email = `wp-${sub.toLowerCase().replace(/[^a-z0-9-]/g, '')}@waypoint.axie-empire.app`;
  const metadata = { provider: 'waypoint', waypoint_sub: sub, ronin_address: address, display_name: name };
  const created = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: metadata });
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    return json({ error: `Could not create the game profile (${created.error.message}).` }, 500);
  }

  // 3. One-time sign-in token for that user (never emailed — returned here).
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) return json({ error: `Could not start the session (${link.error.message}).` }, 500);

  return json({
    token_hash: link.data.properties.hashed_token,
    email,
    display_name: name || (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Lunacian'),
  });
});
