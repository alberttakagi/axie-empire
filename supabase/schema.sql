-- Axie Empire cloud saves. Run once in the Supabase SQL editor
-- (Dashboard → SQL Editor → New query → paste → Run).
--
-- One row per player. Row Level Security makes every row readable and
-- writable ONLY by the signed-in player it belongs to, so the public anon
-- key shipped in the game can't read or change anyone else's save.

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  snapshot jsonb not null,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "read own save" on public.saves;
create policy "read own save" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "insert own save" on public.saves;
create policy "insert own save" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own save" on public.saves;
create policy "update own save" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Guard against absurd payloads (a full save is ~50–200 KB).
alter table public.saves drop constraint if exists snapshot_size;
alter table public.saves add constraint snapshot_size check (pg_column_size(snapshot) < 2000000);

-- Sparring Grounds weekly leaderboard (one best score per player per week).
-- Anyone may READ the board; players may only write THEIR OWN row.
create table if not exists public.dojo_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  week text not null,
  score integer not null check (score >= 0 and score < 100000),
  name text not null check (char_length(name) <= 24),
  featured_class text,
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);

alter table public.dojo_scores enable row level security;

drop policy if exists "board is public" on public.dojo_scores;
create policy "board is public" on public.dojo_scores for select using (true);

drop policy if exists "insert own score" on public.dojo_scores;
create policy "insert own score" on public.dojo_scores
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own score" on public.dojo_scores;
create policy "update own score" on public.dojo_scores
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists dojo_scores_week_score on public.dojo_scores (week, score desc);
