-- The tables the migrations folder never defined (Tier B · B11).
--
-- `profiles`, `mood_entries`, `coach_messages` and `coach_memory` only ever
-- existed in the legacy setup guide (public/bloom/SETUP_SUPABASE.md and the
-- comments in coach.html). A fresh Supabase project that ran every file in this
-- folder still answered "relation does not exist" on Mood and Coach, and the
-- 20260828 migration's `alter table public.profiles` failed outright.
--
-- Everything here is additive and idempotent: an existing project with these
-- tables keeps every row and every column; only missing pieces are added.
--
-- Run once in the Supabase SQL editor — FIRST on a fresh project (before
-- 20260826_reward_delivery.sql), or at any point on an existing one.

-- ---------------------------------------------------------------------------
-- 1. profiles — one row per auth user (the identity migration extends it)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  profile_name text,
  total_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists profile_name text;
alter table public.profiles add column if not exists total_points integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;

drop policy if exists "profiles owner select" on public.profiles;
create policy "profiles owner select" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "profiles owner insert" on public.profiles;
create policy "profiles owner insert" on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

revoke all on public.profiles from anon;

-- a row for every existing user, so nothing downstream has to create one
insert into public.profiles (id, profile_name)
select u.id, 'Bloom User'
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);

-- ---------------------------------------------------------------------------
-- 2. mood_entries — the Mood record (A2 adds `context`; kept here as well so a
--    fresh project needs no particular order)
-- ---------------------------------------------------------------------------
create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  mood_label text,
  -- 0–100 (older clients) or 1–10 ×10; the app normalises on read
  mood_intensity integer,
  energy integer,
  stress integer,
  note text,
  tags text[] not null default '{}',
  logged_at timestamptz not null default now(),
  -- the local day the person experienced (client-computed)
  date date,
  context jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mood_entries add column if not exists energy integer;
alter table public.mood_entries add column if not exists stress integer;
alter table public.mood_entries add column if not exists note text;
alter table public.mood_entries add column if not exists tags text[] not null default '{}';
alter table public.mood_entries add column if not exists logged_at timestamptz not null default now();
alter table public.mood_entries add column if not exists date date;
alter table public.mood_entries add column if not exists context jsonb;
alter table public.mood_entries add column if not exists created_at timestamptz not null default now();
alter table public.mood_entries add column if not exists updated_at timestamptz not null default now();

create index if not exists mood_entries_owner_logged_idx
  on public.mood_entries (profile_id, logged_at);
create index if not exists mood_entries_owner_date_idx
  on public.mood_entries (profile_id, date);

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

revoke all on public.mood_entries from anon;

-- ---------------------------------------------------------------------------
-- 3. coach_messages — the conversation thread
-- ---------------------------------------------------------------------------
create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'coach')),
  -- text today; older rows may hold jsonb-shaped strings — the app unwraps both
  content jsonb,
  sources text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.coach_messages add column if not exists sources text[] not null default '{}';
alter table public.coach_messages add column if not exists created_at timestamptz not null default now();

create index if not exists coach_messages_owner_time_idx
  on public.coach_messages (profile_id, created_at);

alter table public.coach_messages enable row level security;

drop policy if exists "coach messages owner select" on public.coach_messages;
create policy "coach messages owner select" on public.coach_messages
  for select using (profile_id = auth.uid());
drop policy if exists "coach messages owner insert" on public.coach_messages;
create policy "coach messages owner insert" on public.coach_messages
  for insert with check (profile_id = auth.uid());
drop policy if exists "coach messages owner delete" on public.coach_messages;
create policy "coach messages owner delete" on public.coach_messages
  for delete using (profile_id = auth.uid());

revoke all on public.coach_messages from anon;

-- ---------------------------------------------------------------------------
-- 4. coach_memory — what the coach remembers about the person
-- ---------------------------------------------------------------------------
create table if not exists public.coach_memory (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  fact text not null,
  confidence real not null default 0.5,
  source text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_referenced_at timestamptz
);

alter table public.coach_memory add column if not exists pinned boolean not null default false;
alter table public.coach_memory add column if not exists updated_at timestamptz not null default now();
alter table public.coach_memory add column if not exists last_referenced_at timestamptz;

create index if not exists coach_memory_owner_updated_idx
  on public.coach_memory (profile_id, updated_at desc);

alter table public.coach_memory enable row level security;

drop policy if exists "coach memory owner select" on public.coach_memory;
create policy "coach memory owner select" on public.coach_memory
  for select using (profile_id = auth.uid());
drop policy if exists "coach memory owner insert" on public.coach_memory;
create policy "coach memory owner insert" on public.coach_memory
  for insert with check (profile_id = auth.uid());
drop policy if exists "coach memory owner update" on public.coach_memory;
create policy "coach memory owner update" on public.coach_memory
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "coach memory owner delete" on public.coach_memory;
create policy "coach memory owner delete" on public.coach_memory
  for delete using (profile_id = auth.uid());

revoke all on public.coach_memory from anon;

-- ---------------------------------------------------------------------------
-- 5. updated_at upkeep (shared trigger function; harmless if it already exists)
-- ---------------------------------------------------------------------------
create or replace function public.touch_bloom_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_bloom_updated_at();

drop trigger if exists touch_mood_entries_updated_at on public.mood_entries;
create trigger touch_mood_entries_updated_at
  before update on public.mood_entries
  for each row execute function public.touch_bloom_updated_at();

drop trigger if exists touch_coach_memory_updated_at on public.coach_memory;
create trigger touch_coach_memory_updated_at
  before update on public.coach_memory
  for each row execute function public.touch_bloom_updated_at();
