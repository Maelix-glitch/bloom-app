-- Bloom — Today (home) page: the tables it reads and writes.
-- Idempotent. Safe on projects where the legacy static Today page already
-- created `habits` / `habit_logs`, and it creates everything for fresh projects.
--
--   tracker_days  – one row per person per day, written by useTrackers (all six
--                   trackers, the metrics modal, quick-adds). Until now the app
--                   assumed this table existed but no migration created it.
--   habits        – routines. Columns mirror what the legacy page inserted so
--                   old rows keep working (icon/icon_value, points/point_value,
--                   archived/is_archived are all tolerated by the client).
--   habit_logs    – one row per completed habit per day.
--   profiles.total_points + increment/decrement RPCs – the points pill.
--
-- Privacy: owner-only RLS on every table; anon is granted nothing.

-- ---------------------------------------------------------------------------
-- 1. tracker_days
-- ---------------------------------------------------------------------------
create table if not exists public.tracker_days (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  sleep_minutes integer check (sleep_minutes is null or (sleep_minutes >= 0 and sleep_minutes <= 1440)),
  bed_time text,
  wake_time text,
  sleep_quality integer check (sleep_quality is null or (sleep_quality between 1 and 5)),
  water_ml integer check (water_ml is null or (water_ml >= 0 and water_ml <= 20000)),
  sessions jsonb not null default '[]'::jsonb,
  movement_minutes integer check (movement_minutes is null or (movement_minutes >= 0 and movement_minutes <= 1440)),
  energy integer check (energy is null or (energy between 1 and 5)),
  screen_minutes integer check (screen_minutes is null or (screen_minutes >= 0 and screen_minutes <= 1440)),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tracker_days add column if not exists bed_time text;
alter table public.tracker_days add column if not exists wake_time text;
alter table public.tracker_days add column if not exists sleep_quality integer;
alter table public.tracker_days add column if not exists sessions jsonb not null default '[]'::jsonb;
alter table public.tracker_days add column if not exists movement_minutes integer;
alter table public.tracker_days add column if not exists energy integer;
alter table public.tracker_days add column if not exists screen_minutes integer;
alter table public.tracker_days add column if not exists notes text;
alter table public.tracker_days add column if not exists updated_at timestamptz not null default now();

-- the client upserts on (profile_id, date)
create unique index if not exists tracker_days_owner_day_key
  on public.tracker_days (profile_id, date);
create index if not exists tracker_days_owner_date_idx
  on public.tracker_days (profile_id, date desc);

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

revoke all on public.tracker_days from anon;

-- ---------------------------------------------------------------------------
-- 2. habits
-- ---------------------------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  note text,
  icon_type text not null default 'emoji',
  icon_value text,
  icon_url text,
  color text not null default 'amber',
  frequency text not null default 'daily',
  days integer[],
  times_per_week integer,
  goal_enabled boolean not null default false,
  goal_target numeric,
  goal_unit text,
  point_value integer not null default 10,
  priority text not null default 'medium',
  reminder_enabled boolean not null default false,
  reminder_time time,
  tags text[],
  start_date date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- additive columns for projects where the legacy page created a slimmer table
alter table public.habits add column if not exists note text;
alter table public.habits add column if not exists icon_type text not null default 'emoji';
alter table public.habits add column if not exists icon_value text;
alter table public.habits add column if not exists icon_url text;
alter table public.habits add column if not exists color text not null default 'amber';
alter table public.habits add column if not exists frequency text not null default 'daily';
alter table public.habits add column if not exists days integer[];
alter table public.habits add column if not exists times_per_week integer;
alter table public.habits add column if not exists goal_enabled boolean not null default false;
alter table public.habits add column if not exists goal_target numeric;
alter table public.habits add column if not exists goal_unit text;
alter table public.habits add column if not exists point_value integer not null default 10;
alter table public.habits add column if not exists priority text not null default 'medium';
alter table public.habits add column if not exists reminder_enabled boolean not null default false;
alter table public.habits add column if not exists reminder_time time;
alter table public.habits add column if not exists tags text[];
alter table public.habits add column if not exists start_date date;
alter table public.habits add column if not exists is_archived boolean not null default false;
alter table public.habits add column if not exists updated_at timestamptz not null default now();

create index if not exists habits_owner_idx on public.habits (profile_id, created_at);

alter table public.habits enable row level security;

drop policy if exists "habits owner select" on public.habits;
create policy "habits owner select" on public.habits
  for select using (profile_id = auth.uid());
drop policy if exists "habits owner insert" on public.habits;
create policy "habits owner insert" on public.habits
  for insert with check (profile_id = auth.uid());
drop policy if exists "habits owner update" on public.habits;
create policy "habits owner update" on public.habits
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "habits owner delete" on public.habits;
create policy "habits owner delete" on public.habits
  for delete using (profile_id = auth.uid());

revoke all on public.habits from anon;

-- ---------------------------------------------------------------------------
-- 3. habit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  value numeric not null default 1,
  completed_at timestamptz default now(),
  created_at timestamptz not null default now()
);

alter table public.habit_logs add column if not exists value numeric not null default 1;
alter table public.habit_logs add column if not exists completed_at timestamptz default now();
alter table public.habit_logs add column if not exists created_at timestamptz not null default now();
-- the legacy table had completed_at NOT NULL, which broke date-only inserts
alter table public.habit_logs alter column completed_at drop not null;

-- one completion per habit per day; the client toggles by delete/insert
create unique index if not exists habit_logs_owner_habit_day_key
  on public.habit_logs (profile_id, habit_id, date);
create index if not exists habit_logs_owner_date_idx
  on public.habit_logs (profile_id, date desc);

alter table public.habit_logs enable row level security;

drop policy if exists "habit logs owner select" on public.habit_logs;
create policy "habit logs owner select" on public.habit_logs
  for select using (profile_id = auth.uid());
drop policy if exists "habit logs owner insert" on public.habit_logs;
create policy "habit logs owner insert" on public.habit_logs
  for insert with check (profile_id = auth.uid());
drop policy if exists "habit logs owner update" on public.habit_logs;
create policy "habit logs owner update" on public.habit_logs
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "habit logs owner delete" on public.habit_logs;
create policy "habit logs owner delete" on public.habit_logs
  for delete using (profile_id = auth.uid());

revoke all on public.habit_logs from anon;

-- ---------------------------------------------------------------------------
-- 4. points on the profile
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists total_points integer not null default 0;

create or replace function public.increment_points(user_id uuid, pts integer)
returns void language sql security definer set search_path = public as $$
  update public.profiles
     set total_points = coalesce(total_points, 0) + greatest(0, pts),
         updated_at = now()
   where id = user_id and id = auth.uid();
$$;

create or replace function public.decrement_points(user_id uuid, pts integer)
returns void language sql security definer set search_path = public as $$
  update public.profiles
     set total_points = greatest(0, coalesce(total_points, 0) - greatest(0, pts)),
         updated_at = now()
   where id = user_id and id = auth.uid();
$$;

revoke all on function public.increment_points(uuid, integer) from public, anon;
revoke all on function public.decrement_points(uuid, integer) from public, anon;
grant execute on function public.increment_points(uuid, integer) to authenticated;
grant execute on function public.decrement_points(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. realtime — the home page subscribes to habit changes so a tick on one
--    device moves the ring on another. Harmless if already published.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.habit_logs;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.habits;
    exception when duplicate_object then null; end;
  end if;
end $$;
