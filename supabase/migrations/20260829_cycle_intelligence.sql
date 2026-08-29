-- Bloom — Cycle intelligence: schema hardening + owner-only enforcement.
-- Idempotent: safe on projects where the legacy page already created
-- `cycle_entries`, and it creates the table for fresh projects.
-- Privacy is enforced HERE, not in the browser: anon gets nothing at all,
-- every row is only ever visible/mutable by its owner, and there is no
-- cross-user path, no public view, and no public policy — cycle data never
-- reaches public profiles, stories, or share metadata (see the
-- get_public_bloom_profile function in the Profile migration, which selects
-- from other tables only).

create table if not exists public.cycle_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  cycle_day integer,
  phase text check (phase is null or phase in ('menstrual','follicular','ovulation','luteal')),
  flow text check (flow is null or flow in ('none','spotting','light','medium','heavy')),
  temperature numeric check (temperature is null or (temperature >= 34 and temperature <= 40)),
  cervical_mucus text check (cervical_mucus is null or cervical_mucus in ('dry','sticky','creamy','watery','egg-white')),
  lh_test text check (lh_test is null or lh_test in ('negative','positive')),
  pain_level numeric check (pain_level is null or (pain_level >= 0 and pain_level <= 5)),
  sexual_activity text check (sexual_activity is null or sexual_activity in ('none','protected','unprotected')),
  contraceptive text check (contraceptive is null or contraceptive in ('none','pill','condom','iud','other')),
  energy numeric check (energy is null or (energy >= 1 and energy <= 5)),
  sleep_hours numeric check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)),
  mood text check (mood is null or mood in ('Low','Flat','Okay','Good','Energized')),
  symptoms text[] not null default '{}',
  notes text,
  next_period_in_days integer,
  logged_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- additive columns for projects where the legacy table predates these fields
alter table public.cycle_entries add column if not exists temperature numeric;
alter table public.cycle_entries add column if not exists cervical_mucus text;
alter table public.cycle_entries add column if not exists lh_test text;
alter table public.cycle_entries add column if not exists pain_level numeric;
alter table public.cycle_entries add column if not exists sexual_activity text;
alter table public.cycle_entries add column if not exists contraceptive text;
alter table public.cycle_entries add column if not exists energy numeric;
alter table public.cycle_entries add column if not exists sleep_hours numeric;
alter table public.cycle_entries add column if not exists mood text;
alter table public.cycle_entries add column if not exists symptoms text[] not null default '{}';
alter table public.cycle_entries add column if not exists notes text;
alter table public.cycle_entries add column if not exists next_period_in_days integer;
alter table public.cycle_entries add column if not exists logged_at timestamptz default now();
alter table public.cycle_entries add column if not exists updated_at timestamptz default now();

create unique index if not exists cycle_entries_owner_day_key
  on public.cycle_entries (profile_id, date);
create index if not exists cycle_entries_owner_date_idx
  on public.cycle_entries (profile_id, date desc);

create or replace function public.touch_cycle_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists cycle_entries_touch_updated_at on public.cycle_entries;
create trigger cycle_entries_touch_updated_at
before update on public.cycle_entries
for each row execute function public.touch_cycle_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: authenticated owner only. anon is granted nothing.
-- ---------------------------------------------------------------------------
alter table public.cycle_entries enable row level security;

drop policy if exists "cycle owner select" on public.cycle_entries;
create policy "cycle owner select" on public.cycle_entries
  for select using (profile_id = auth.uid());

drop policy if exists "cycle owner insert" on public.cycle_entries;
create policy "cycle owner insert" on public.cycle_entries
  for insert with check (profile_id = auth.uid());

drop policy if exists "cycle owner update" on public.cycle_entries;
create policy "cycle owner update" on public.cycle_entries
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists "cycle owner delete" on public.cycle_entries;
create policy "cycle owner delete" on public.cycle_entries
  for delete using (profile_id = auth.uid());

revoke all on public.cycle_entries from anon;

-- No cycle data in public surfaces — assert the public profile function
-- never touched this table (it doesn't; documented here for reviewers):
--   public.get_public_bloom_profile() → profiles + stories + story_highlights only.
