-- Period entries and check-in memory on the account (Tier A · A5).
--
-- Until now the daily cycle log synced (cycle_entries) but the period entries
-- themselves — the start/end dates every prediction is built from — lived only
-- in the browser, as did the answers to the check-in questions. A new phone or
-- a cleared browser lost the whole history.
--
--   cycle_periods  one row per period entry, keyed by the entry's own id.
--                  Deletions are tombstones (deleted_at), so a device that was
--                  offline when another one deleted an entry can't resurrect it.
--   cycle_state    one row per person: the check-in memory ("never ask this
--                  exact thing twice") and personal settings ("cycles up to
--                  58 days are mine"), so an answer on one device counts on all.
--
-- Privacy is enforced HERE, not in the browser: anon gets nothing, every row is
-- only visible/mutable by its owner, and — as with cycle_entries — nothing here
-- is ever read by public profile surfaces.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. cycle_periods
-- ---------------------------------------------------------------------------
create table if not exists public.cycle_periods (
  profile_id uuid not null references auth.users(id) on delete cascade,
  -- the client's own id (uuid for new entries; older devices used short ids)
  id text not null,
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  flow text check (flow is null or flow in ('light','medium','heavy')),
  notes text,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (profile_id, id)
);

create index if not exists cycle_periods_owner_start_idx
  on public.cycle_periods (profile_id, start_date desc);

alter table public.cycle_periods enable row level security;

drop policy if exists "cycle periods owner select" on public.cycle_periods;
create policy "cycle periods owner select" on public.cycle_periods
  for select using (profile_id = auth.uid());
drop policy if exists "cycle periods owner insert" on public.cycle_periods;
create policy "cycle periods owner insert" on public.cycle_periods
  for insert with check (profile_id = auth.uid());
drop policy if exists "cycle periods owner update" on public.cycle_periods;
create policy "cycle periods owner update" on public.cycle_periods
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "cycle periods owner delete" on public.cycle_periods;
create policy "cycle periods owner delete" on public.cycle_periods
  for delete using (profile_id = auth.uid());

revoke all on public.cycle_periods from anon;

-- ---------------------------------------------------------------------------
-- 2. cycle_state — check-in memory + settings, one row per person
-- ---------------------------------------------------------------------------
create table if not exists public.cycle_state (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  checkins jsonb not null default '{"dismissed":{},"snoozed":{}}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.cycle_state enable row level security;

drop policy if exists "cycle state owner select" on public.cycle_state;
create policy "cycle state owner select" on public.cycle_state
  for select using (profile_id = auth.uid());
drop policy if exists "cycle state owner insert" on public.cycle_state;
create policy "cycle state owner insert" on public.cycle_state
  for insert with check (profile_id = auth.uid());
drop policy if exists "cycle state owner update" on public.cycle_state;
create policy "cycle state owner update" on public.cycle_state
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "cycle state owner delete" on public.cycle_state;
create policy "cycle state owner delete" on public.cycle_state
  for delete using (profile_id = auth.uid());

revoke all on public.cycle_state from anon;

-- ---------------------------------------------------------------------------
-- 3. housekeeping — tombstones older than a year serve no one
-- ---------------------------------------------------------------------------
create or replace function public.prune_cycle_period_tombstones()
returns void language sql security definer set search_path = public as $$
  delete from public.cycle_periods
  where deleted_at is not null and deleted_at < now() - interval '365 days';
$$;
revoke all on function public.prune_cycle_period_tombstones() from public, anon;
