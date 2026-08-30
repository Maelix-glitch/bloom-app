-- Bloom — daily trackers.
--
-- One row per person per day, holding sleep, water, study sessions, movement,
-- energy and screen time. Same shape as the app's DayEntry, same conflict key
-- the client upserts on: (profile_id, date).
--
-- Run this in the Supabase SQL editor (or `supabase db push`). Until it exists
-- the trackers page keeps working from the device and says so in the header.

create table if not exists public.tracker_days (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references auth.users (id) on delete cascade,
  date            date not null,

  sleep_minutes   smallint check (sleep_minutes is null or (sleep_minutes >= 0 and sleep_minutes <= 1080)),
  bed_time        text check (bed_time is null or bed_time ~ '^\d{1,2}:\d{2}$'),
  wake_time       text check (wake_time is null or wake_time ~ '^\d{1,2}:\d{2}$'),
  sleep_quality   smallint check (sleep_quality is null or (sleep_quality between 1 and 5)),

  water_ml        integer check (water_ml is null or (water_ml >= 0 and water_ml <= 8000)),
  sessions        jsonb not null default '[]'::jsonb,

  movement_minutes smallint check (movement_minutes is null or (movement_minutes >= 0 and movement_minutes <= 480)),
  energy          smallint check (energy is null or (energy between 1 and 5)),
  screen_minutes  smallint check (screen_minutes is null or (screen_minutes >= 0 and screen_minutes <= 1200)),

  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint tracker_days_profile_date unique (profile_id, date)
);

create index if not exists tracker_days_profile_date_idx
  on public.tracker_days (profile_id, date desc);

-- Keep updated_at honest; the client also sends it, and the trigger wins.
create or replace function public.touch_tracker_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists tracker_days_touch_updated_at on public.tracker_days;
create trigger tracker_days_touch_updated_at
before update on public.tracker_days
for each row execute function public.touch_tracker_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: authenticated owner only. anon is granted nothing.
-- ---------------------------------------------------------------------------
alter table public.tracker_days enable row level security;

drop policy if exists "tracker owner select" on public.tracker_days;
create policy "tracker owner select" on public.tracker_days
  for select using (profile_id = auth.uid());

drop policy if exists "tracker owner insert" on public.tracker_days;
create policy "tracker owner insert" on public.tracker_days
  for insert with check (profile_id = auth.uid());

drop policy if exists "tracker owner update" on public.tracker_days;
create policy "tracker owner update" on public.tracker_days
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "tracker owner delete" on public.tracker_days;
create policy "tracker owner delete" on public.tracker_days
  for delete using (profile_id = auth.uid());
