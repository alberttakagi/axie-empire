# Accounts setup

The game ships with email sign-in and cloud saves on Supabase, and a Sky Mavis Account adapter. They switch on as soon as their keys are configured. Until then, the game runs as a guest-only build: progress is saved on the device, and Export/Import works.

## Supabase (email sign-in and cloud saves)

1. Create a project at supabase.com. The free plan is enough; Singapore is the closest region.
2. Create the saves table:
   - Open **SQL Editor → New query**.
   - Paste `supabase/schema.sql` and click **Run**.
   - This creates the `saves` table. Its Row Level Security rules mean each player can read and write only their own row.
3. Add the sign-in code to the email:
   - Go to **Authentication → Email Templates → Magic Link**.
   - Add the code line `<h2>{{ .Token }}</h2>` to the template. Keep the existing link too, so players can either type the 6-digit code or tap the link.
4. Allow the game's addresses for redirects:
   - Go to **Authentication → URL Configuration**.
   - Set **Site URL** to `https://axie-empire.vercel.app`.
   - Add **Redirect URLs**:
     - `https://axie-empire.vercel.app`
     - `http://localhost:5173`
     - `http://localhost:5174`
5. Find the keys under **Project Settings → API**: the **Project URL** and the **anon public** key.
   - The anon key is meant to be public.
   - Never use the `service_role` key in the game.
6. Configure the keys:
   - **Locally:** copy `.env.example` to `.env.local` (git ignores it) and fill both values.
   - **Production:** in Vercel, go to **Project → Settings → Environment Variables** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.

## What players see

- **Menu → Account & Save → Sign in with Email:** the player enters their email and receives a 6-digit code (or taps the link), and they're signed in.
- **Guest progress:** the first time someone signs in on a device, the progress already on it moves into their account.
- **Another device:** signing in there restores the cloud save.
- **Saving:** every change saves to the cloud a moment later. The chip at the top of the home screen shows the status, and failed saves retry automatically.
- **Sign out:** the progress is saved to the cloud first, then removed from the device.

The rules are in `src/CloudSync.js`, with tests in `test/cloudsync.test.js` and `test/supabase.test.js`.

## Sky Mavis Account (Ronin Waypoint)

The guide prefers this provider. It works on top of the Supabase setup above. After signing in with Sky Mavis, a player has the same kind of cloud save as an email player.

How it works:
1. The game opens the Waypoint popup (`@sky-mavis/waypoint`) and receives a signed ID token.
2. The `waypoint-login` Edge Function checks that token the way Sky Mavis's *Verify user identity* guide describes:
   - issuer `https://id.skymavis.com`
   - audience equal to your client ID
   - signing keys from `https://waypoint.roninchain.com/.well-known/jwks.json`
3. The function then returns a one-time token, which the game exchanges for a Supabase session.

Setup:
1. Register the app:
   - In the **Ronin Developer Console**, create or open your app and enable **Waypoint Account Service**.
   - Copy the **CLIENT ID**.
   - Add the **Redirect URIs**: `https://axie-empire.vercel.app` and `http://localhost:5173`.
2. Deploy the function with the Supabase CLI (`brew install supabase/tap/supabase`):
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase secrets set WAYPOINT_CLIENT_ID=YOUR-CLIENT-ID
   supabase functions deploy waypoint-login --no-verify-jwt
   ```
3. Add `VITE_WAYPOINT_CLIENT_ID` in `.env.local` and in Vercel, then redeploy.

Once all three are set, the sign-in form shows **Sign in with Sky Mavis** above the email option. Basic play never requires an account, a wallet or a signature.

Tested with mocks in `test/supabase.test.js`:
- the popup, then the server check, then the session
- a token the server rejects
- a cancelled popup
- a missing client ID

The Edge Function itself still needs a live test once the client ID and project exist.

## Sparring Grounds leaderboard

`supabase/schema.sql` also creates `dojo_scores`, which holds one best score per player per week.
- Anyone can read the board. Players can write only their own row.
- If you ran the schema before this table existed, run it again; it's safe to re-run.

Scores are submitted by the game itself, so a determined player could fake one. That's acceptable for an internal jam. Server-side replay verification would be the fix if the board ever matters more.
