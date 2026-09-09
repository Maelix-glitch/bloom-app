-- Preferences that follow the person (Tier B/C · B2, C1, C2, C3).
--
-- One jsonb document per account: tracker goals, which trackers are tracked,
-- the study subjects someone typed, the anchor times on Today's flow. Each
-- key carries its own updatedAt, so two devices merge per key, later wins —
-- the browser does the merge, this table just holds the result.
--
-- Run once in the Supabase SQL editor. Safe to re-run. The app works without
-- it (preferences stay on the device until the table exists).

create table if not exists public.user_prefs (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_prefs enable row level security;

drop policy if exists "user prefs owner select" on public.user_prefs;
create policy "user prefs owner select" on public.user_prefs
  for select using (profile_id = auth.uid());
drop policy if exists "user prefs owner insert" on public.user_prefs;
create policy "user prefs owner insert" on public.user_prefs
  for insert with check (profile_id = auth.uid());
drop policy if exists "user prefs owner update" on public.user_prefs;
create policy "user prefs owner update" on public.user_prefs
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "user prefs owner delete" on public.user_prefs;
create policy "user prefs owner delete" on public.user_prefs
  for delete using (profile_id = auth.uid());

revoke all on public.user_prefs from anon;
