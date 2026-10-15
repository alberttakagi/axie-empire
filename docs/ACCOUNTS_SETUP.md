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
