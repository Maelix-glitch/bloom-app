-- Bloom — mood entries.
--
-- The mood page (/) has been writing to `mood_entries` for a while, but no
-- migration in this repo ever created it. On a project without it, saving a
-- mood throws and the page quietly falls back to the device: nothing is lost,
-- but nothing syncs either. This is the missing table.
--
-- One row per moment, not per day — you can log as often as you like, so there
-- is deliberately no unique key on (profile_id, date).

create table if not exists public.mood_entries (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references auth.users (id) on delete cascade,

  mood_label      text,
  -- 0–100: the client stores mood × 10 so older Bloom rows still read back
  mood_intensity  smallint check (mood_intensity is null or (mood_intensity between 0 and 100)),
  energy          smallint check (energy is null or (energy between 1 and 10)),
  stress          smallint check (stress is null or (stress between 1 and 10)),

  note            text,
  tags            text[] not null default '{}',

  logged_at       timestamptz not null default now(),
  date            date not null,
  created_at      timestamptz not null default now()
);

-- mood_entries usually already exists on a project that has been running the
-- mood page; make sure the columns the indexes need are there. No-op otherwise.
alter table public.mood_entries
  add column if not exists logged_at timestamptz not null default now(),
  add column if not exists date date,
  add column if not exists profile_id uuid;

create index if not exists mood_entries_profile_logged_idx
  on public.mood_entries (profile_id, logged_at desc);

create index if not exists mood_entries_profile_date_idx
  on public.mood_entries (profile_id, date desc);

-- ---------------------------------------------------------------------------
-- RLS: authenticated owner only. anon is granted nothing.
-- ---------------------------------------------------------------------------
alter table public.mood_entries enable row level security;

drop policy if exists "mood owner select" on public.mood_entries;
create policy "mood owner select" on public.mood_entries
  for select using (profile_id = auth.uid());

drop policy if exists "mood owner insert" on public.mood_entries;
create policy "mood owner insert" on public.mood_entries
  for insert with check (profile_id = auth.uid());

drop policy if exists "mood owner update" on public.mood_entries;
create policy "mood owner update" on public.mood_entries
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "mood owner delete" on public.mood_entries;
create policy "mood owner delete" on public.mood_entries
  for delete using (profile_id = auth.uid());
