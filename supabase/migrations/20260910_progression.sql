-- Bloom Progression — goals, verified point awards, ranks and achievements.
--
-- The progression spine:
--   verified goal → Bloom Points → milestone → rank → achievement → journey
--
-- Everything here is additive and idempotent. Nothing existing is altered:
-- `profiles.total_points` stays the single authoritative balance that habits
-- already maintain, `rewards` / `reward_claims` keep working exactly as they
-- did, and no previously earned point is touched or recalculated.
--
-- Design rules enforced in SQL (never trusted from the client):
--   · completion is *verified* against habit_logs / tracker_days / mood_entries
--   · points are awarded, the goal is marked and the ledger row is written in
--     one transaction — a second call for the same period awards nothing
--   · rank is derived from `profiles.total_points`, never stored by a client
--   · point amounts come from this migration, not from the request
--
-- Run once, at any point, in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. The award ledger. One row per real point movement.
-- ---------------------------------------------------------------------------
create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('goal', 'achievement', 'rank')),
  ref_id text not null,
  period_key text,
  title text not null,
  source text not null default 'milestones',
  points integer not null,
  created_at timestamptz not null default now()
);

alter table public.point_transactions add column if not exists kind text not null default 'goal';
alter table public.point_transactions add column if not exists ref_id text not null default '';
alter table public.point_transactions add column if not exists period_key text;
alter table public.point_transactions add column if not exists title text not null default 'Milestone';
alter table public.point_transactions add column if not exists source text not null default 'milestones';
alter table public.point_transactions add column if not exists points integer not null default 0;
alter table public.point_transactions add column if not exists created_at timestamptz not null default now();

-- one award per (goal, period) and one ever for achievements: the hard guarantee
create unique index if not exists point_transactions_award_key
  on public.point_transactions (profile_id, kind, ref_id, coalesce(period_key, 'once'));
create index if not exists point_transactions_owner_time_idx
  on public.point_transactions (profile_id, created_at desc);

alter table public.point_transactions enable row level security;

drop policy if exists "point_transactions owner select" on public.point_transactions;
create policy "point_transactions owner select" on public.point_transactions
  for select using (profile_id = auth.uid());

-- rows are only ever written by award_progress() (security definer, see below)
revoke insert, update, delete on public.point_transactions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Awarded progress — which goal period has already been paid.
--    Mirrors point_transactions; kept so a goal can be marked complete
--    without awarding a second time.
-- ---------------------------------------------------------------------------
create table if not exists public.goal_awards (
  profile_id uuid not null references auth.users(id) on delete cascade,
  goal_id text not null,
  period_key text not null default 'once',
  title text not null default '',
  points integer not null default 0,
  awarded_at timestamptz not null default now(),
  primary key (profile_id, goal_id, period_key)
);

alter table public.goal_awards add column if not exists title text not null default '';
alter table public.goal_awards add column if not exists points integer not null default 0;
alter table public.goal_awards add column if not exists awarded_at timestamptz not null default now();

create index if not exists goal_awards_owner_time_idx
  on public.goal_awards (profile_id, awarded_at desc);

alter table public.goal_awards enable row level security;

drop policy if exists "goal_awards owner select" on public.goal_awards;
create policy "goal_awards owner select" on public.goal_awards
  for select using (profile_id = auth.uid());

revoke insert, update, delete on public.goal_awards from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Achievements, once ever.
-- ---------------------------------------------------------------------------
create table if not exists public.user_achievements (
  profile_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  title text not null default '',
  awarded_at timestamptz not null default now(),
  primary key (profile_id, achievement_id)
);

alter table public.user_achievements add column if not exists title text not null default '';
alter table public.user_achievements add column if not exists awarded_at timestamptz not null default now();
create index if not exists user_achievements_owner_time_idx
  on public.user_achievements (profile_id, awarded_at desc);

alter table public.user_achievements enable row level security;
drop policy if exists "user_achievements owner select" on public.user_achievements;
create policy "user_achievements owner select" on public.user_achievements
  for select using (profile_id = auth.uid());
revoke insert, update, delete on public.user_achievements from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Rank history — every rank a person actually reached, once.
-- ---------------------------------------------------------------------------
create table if not exists public.rank_history (
  profile_id uuid not null references auth.users(id) on delete cascade,
  tier integer not null,
  rank_id text not null,
  name text not null,
  at_points integer not null default 0,
  reached_at timestamptz not null default now(),
  primary key (profile_id, tier)
);

alter table public.rank_history add column if not exists rank_id text not null default '';
alter table public.rank_history add column if not exists name text not null default '';
alter table public.rank_history add column if not exists at_points integer not null default 0;
alter table public.rank_history add column if not exists reached_at timestamptz not null default now();
create index if not exists rank_history_owner_idx
  on public.rank_history (profile_id, tier desc);

alter table public.rank_history enable row level security;
drop policy if exists "rank_history owner select" on public.rank_history;
create policy "rank_history owner select" on public.rank_history
  for select using (profile_id = auth.uid());
revoke insert, update, delete on public.rank_history from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. The rank ladder, as data. Ranks are *derived* from total_points, so this
--    exists for inspection and for the achievement checks below — the client
--    never writes a rank.
-- ---------------------------------------------------------------------------
create table if not exists public.bloom_ranks (
  tier integer primary key,
  rank_id text not null,
  name text not null,
  threshold integer not null,
  cycle integer not null default 1
);

insert into public.bloom_ranks (tier, rank_id, name, threshold, cycle) values
  (1,  'seedling',        'Seedling',        0,     1),
  (2,  'first-bloom',     'First Bloom',     500,   1),
  (3,  'sprout',          'Sprout',          1200,  1),
  (4,  'budding',         'Budding',         2200,  1),
  (5,  'in-bloom',        'In Bloom',        3500,  1),
  (6,  'flourish',        'Flourish',        5000,  1),
  (7,  'wildflower',      'Wildflower',      7000,  1),
  (8,  'evergreen',       'Evergreen',       9500,  1),
  (9,  'blossom-keeper',  'Blossom Keeper',  12500, 1),
  (10, 'perennial',       'Perennial',       16000, 1),
  (11, 'everbloom',       'Everbloom',       20000, 1),
  (12, 'bloomkeeper',     'Bloomkeeper',     25000, 1)
on conflict (tier) do update
  set rank_id = excluded.rank_id,
      name = excluded.name,
      threshold = excluded.threshold;

alter table public.bloom_ranks enable row level security;
drop policy if exists "bloom_ranks read" on public.bloom_ranks;
create policy "bloom_ranks read" on public.bloom_ranks
  for select using (true);
revoke insert, update, delete on public.bloom_ranks from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Server-side verification.
--
--    These mirror src/lib/progression/evaluate.ts exactly. They read only the
--    person's own records and are the *only* thing allowed to authorise an
--    award. `p_today` is the client's local day (the person's own calendar
--    day); every window counts back from it, so a request can never widen a
--    window and invent progress.
-- ---------------------------------------------------------------------------

-- Distinct local days with at least one habit tick, within p_window days.
create or replace function public.bloom_habit_days(p_profile uuid, p_today date, p_window integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct l.date)::integer
    from public.habit_logs l
   where l.profile_id = p_profile
     and l.date between p_today - (greatest(p_window, 1) - 1) and p_today;
$$;

-- Longest run of consecutive ticked days (missing a day restarts the run;
-- nothing already achieved is ever erased).
create or replace function public.bloom_habit_run(p_profile uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select distinct l.date
      from public.habit_logs l
     where l.profile_id = p_profile
  ),
  grouped as (
    select d.date,
           d.date - (row_number() over (order by d.date))::integer as streak_group
      from days d
  )
  select coalesce(max(run), 0)::integer
    from (
      select count(*)::integer as run
        from grouped
       group by streak_group
    ) runs;
$$;

-- Distinct days a tracker was filled in, within p_window days.
create or replace function public.bloom_tracker_days(
  p_profile uuid,
  p_today date,
  p_tracker text,
  p_window integer
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct t.date)::integer
    from public.tracker_days t
   where t.profile_id = p_profile
     and t.date between p_today - (greatest(p_window, 1) - 1) and p_today
     and case p_tracker
           when 'sleep'    then t.sleep_minutes is not null
           when 'water'    then t.water_ml is not null
           when 'movement' then t.movement_minutes is not null
           when 'study'    then jsonb_array_length(coalesce(t.sessions, '[]'::jsonb)) > 0
           when 'energy'   then t.energy is not null
           else false
         end;
$$;

-- Distinct days a tracker met the person's own goal, within p_window days.
create or replace function public.bloom_tracker_goal_days(
  p_profile uuid,
  p_today date,
  p_tracker text,
  p_window integer
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct t.date)::integer
    from public.tracker_days t
   where t.profile_id = p_profile
     and t.date between p_today - (greatest(p_window, 1) - 1) and p_today
     and case p_tracker
           when 'sleep'    then t.sleep_minutes is not null
                                and t.sleep_minutes >= 480
           when 'water'    then t.water_ml is not null
                                and t.water_ml >= 2200
           when 'movement' then t.movement_minutes is not null
                                and t.movement_minutes >= 30
           when 'study'    then jsonb_array_length(coalesce(t.sessions, '[]'::jsonb)) > 0
           else false
         end;
$$;

-- Movement sessions: a day counts once per day that logged movement.
create or replace function public.bloom_movement_sessions(p_profile uuid, p_today date, p_window integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.tracker_days t
   where t.profile_id = p_profile
     and t.date between p_today - (greatest(p_window, 1) - 1) and p_today
     and coalesce(t.movement_minutes, 0) > 0;
$$;

-- Study sessions: the recorded list, summed.
create or replace function public.bloom_study_sessions(p_profile uuid, p_today date, p_window integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(jsonb_array_length(coalesce(t.sessions, '[]'::jsonb))), 0)::integer
    from public.tracker_days t
   where t.profile_id = p_profile
     and t.date between p_today - (greatest(p_window, 1) - 1) and p_today;
$$;

-- Distinct days with a mood entry.
create or replace function public.bloom_mood_days(p_profile uuid, p_today date, p_window integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct coalesce(m.date, (m.logged_at at time zone 'UTC')::date))::integer
    from public.mood_entries m
   where m.profile_id = p_profile
     and coalesce(m.date, (m.logged_at at time zone 'UTC')::date)
         between p_today - (greatest(p_window, 1) - 1) and p_today;
$$;

-- Days where rest was honoured: sleep met the person's goal and felt 3+.
create or replace function public.bloom_recovery_days(p_profile uuid, p_today date, p_window integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct t.date)::integer
    from public.tracker_days t
   where t.profile_id = p_profile
     and t.date between p_today - (greatest(p_window, 1) - 1) and p_today
     and coalesce(t.sleep_minutes, 0) >= 480
     and coalesce(t.sleep_quality, 0) >= 3;
$$;

-- Days with any check-in at all — the balance goal.
create or replace function public.bloom_balance_days(p_profile uuid, p_today date, p_window integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with habit as (
    select distinct l.date from public.habit_logs l where l.profile_id = p_profile
  ),
  tracked as (
    select distinct t.date
      from public.tracker_days t
     where t.profile_id = p_profile
       and (t.sleep_minutes is not null or t.water_ml is not null
            or t.movement_minutes is not null or t.energy is not null
            or jsonb_array_length(coalesce(t.sessions, '[]'::jsonb)) > 0)
  ),
  moods as (
    select distinct coalesce(m.date, (m.logged_at at time zone 'UTC')::date) as date
      from public.mood_entries m
     where m.profile_id = p_profile
  ),
  everything as (
    select date from habit union select date from tracked union select date from moods
  )
  select count(*)::integer
    from everything
   where date between p_today - (greatest(p_window, 1) - 1) and p_today;
$$;

-- ---------------------------------------------------------------------------
-- 7. The award function.
--
--    Given a goal id (and the person's local day), verify it server-side,
--    award the points for that period exactly once, and return the new
--    balance. Raises instead of awarding when verification fails, so a
--    tampered client gets nothing.
-- ---------------------------------------------------------------------------
create or replace function public.award_progress(
  p_goal_id text,
  p_today date default (now() at time zone 'UTC')::date
)
returns table (
  awarded boolean,
  points integer,
  balance integer,
  reason text,
  period_key text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_points integer;
  v_title text;
  v_source text;
  v_cadence text;
  v_target integer;
  v_progress integer := 0;
  v_period text;
  v_balance integer;
  v_already timestamptz;
  v_habit_count integer;
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  -- Goal definitions live here, server-side. The client cannot propose an
  -- amount, a target or a window.
  select g.points, g.title, g.source, g.cadence, g.target
    into v_points, v_title, v_source, v_cadence, v_target
    from (values
      ('daily-routine',       50,  'Complete today''s habit routine',       'habits',       'daily',    0),
      ('daily-move',          60,  'Log movement today',                    'movement',     'daily',    1),
      ('daily-mood',          50,  'Check in with how today feels',         'mood',         'daily',    1),
      ('daily-water',         50,  'Log hydration today',                   'hydration',    'daily',    1),
      ('daily-sleep',         60,  'Log last night''s sleep',               'sleep',        'daily',    1),
      ('week-consistency',    500, 'Keep 5 days of habit consistency',      'consistency',  'weekly',   5),
      ('week-movement',       600, 'Complete 5 movement sessions',          'fitness',      'weekly',   5),
      ('week-mood',           400, 'Log your mood on 5 days',               'mindfulness',  'weekly',   5),
      ('week-hydration',      450, 'Log hydration on 5 days',               'hydration',    'weekly',   5),
      ('week-sleep-rhythm',   500, 'Keep your sleep rhythm on 5 nights',    'sleep',        'weekly',   5),
      ('week-balance',        500, 'Check in with Bloom on 5 days',         'recovery',     'weekly',   5),
      ('week-study',          450, 'Study on 4 days',                       'study',        'weekly',   4),
      ('week-recovery',       500, 'Honour rest on 3 days',                 'recovery',     'weekly',   3),
      ('month-consistency',  1500, 'Keep 20 days of habit consistency',     'consistency',  'monthly',  20),
      ('month-movement',     1200, 'Move on 12 days this month',            'fitness',      'monthly',  12),
      ('month-reflection',   1000, 'Reflect on 15 days this month',         'mindfulness',  'monthly',  15),
      ('month-study',        1000, 'Study on 10 days this month',           'study',        'monthly',  10),
      ('first-bloom',         100, 'Tick your first habit',                 'milestones',   'one-time', 1),
      ('run-7',               500, 'Keep 7 days in a row',                  'consistency',  'one-time', 7),
      ('days-30',            1000, 'Keep 30 days of habit consistency',     'consistency',  'one-time', 30),
      ('run-14',              900, 'Keep 14 days in a row',                 'consistency',  'one-time', 14),
      ('run-30',             1800, 'Keep 30 days in a row',                 'consistency',  'one-time', 30),
      ('movement-25',        2000, 'Complete 25 movement sessions',         'fitness',      'one-time', 25),
      ('mood-30',            1000, 'Reflect on 30 days',                    'mindfulness',  'one-time', 30),
      ('sleep-30',           1000, 'Log 30 nights of sleep',                'sleep',        'one-time', 30),
      ('hydration-30',       1000, 'Log hydration on 30 days',              'hydration',    'one-time', 30),
      ('recovery-20',        1200, 'Honour rest on 20 days',                'recovery',     'one-time', 20),
      ('study-50',           2000, 'Complete 50 study sessions',            'study',        'one-time', 50),
      ('run-60',             3200, 'Keep 60 days in a row',                 'consistency',  'one-time', 60),
      ('days-100',           3000, 'Keep 100 days of habit consistency',    'consistency',  'one-time', 100),
      ('movement-100',       6000, 'Complete 100 movement sessions',        'fitness',      'one-time', 100),
      ('mood-100',           2500, 'Reflect on 100 days',                   'mindfulness',  'one-time', 100),
      ('run-90',             4500, 'Keep 90 days in a row',                 'consistency',  'one-time', 90),
      ('days-365',          10000, 'A year of showing up',                  'consistency',  'one-time', 365)
    ) as g(id, points, title, source, cadence, target)
   where g.id = p_goal_id;

  if not found then
    return query select false, 0, 0, 'Unknown goal.', null::text;
    return;
  end if;

  -- The period this award belongs to.
  v_period := case v_cadence
    when 'daily'   then to_char(p_today, 'YYYY-MM-DD')
    when 'weekly'  then to_char(p_today, 'IYYY-"W"IW')
    when 'monthly' then to_char(p_today, 'YYYY-MM')
    else 'once'
  end;

  -- Already paid?
  select a.awarded_at into v_already
    from public.goal_awards a
   where a.profile_id = v_uid and a.goal_id = p_goal_id and a.period_key = v_period;
  if v_already is not null then
    select p.total_points into v_balance from public.profiles p where p.id = v_uid;
    return query select false, v_points, coalesce(v_balance, 0), 'Already earned for this period.', v_period;
    return;
  end if;

  -- Verify. (Same windows as the client engine; the server decides.)
  v_progress := case p_goal_id
    when 'daily-routine' then
      (select count(*)::integer from public.habit_logs l
        where l.profile_id = v_uid and l.date = p_today)
    when 'daily-move'    then public.bloom_tracker_days(v_uid, p_today, 'movement', 1)
    when 'daily-mood'    then public.bloom_mood_days(v_uid, p_today, 1)
    when 'daily-water'   then public.bloom_tracker_days(v_uid, p_today, 'water', 1)
    when 'daily-sleep'   then public.bloom_tracker_days(v_uid, p_today, 'sleep', 1)
    when 'week-consistency' then public.bloom_habit_days(v_uid, p_today, 7)
    when 'week-movement'    then public.bloom_movement_sessions(v_uid, p_today, 7)
    when 'week-mood'        then public.bloom_mood_days(v_uid, p_today, 7)
    when 'week-hydration'   then public.bloom_tracker_days(v_uid, p_today, 'water', 7)
    when 'week-sleep-rhythm' then public.bloom_tracker_goal_days(v_uid, p_today, 'sleep', 7)
    when 'week-balance'     then public.bloom_balance_days(v_uid, p_today, 7)
    when 'week-study'       then public.bloom_tracker_days(v_uid, p_today, 'study', 7)
    when 'week-recovery'    then public.bloom_recovery_days(v_uid, p_today, 7)
    when 'month-consistency' then public.bloom_habit_days(v_uid, p_today, 30)
    when 'month-movement'    then public.bloom_tracker_days(v_uid, p_today, 'movement', 30)
    when 'month-reflection'  then public.bloom_mood_days(v_uid, p_today, 30)
    when 'month-study'       then public.bloom_tracker_days(v_uid, p_today, 'study', 30)
    when 'first-bloom'  then (select count(*)::integer from public.habit_logs l where l.profile_id = v_uid)
    when 'run-7'        then public.bloom_habit_run(v_uid)
    when 'run-14'       then public.bloom_habit_run(v_uid)
    when 'run-30'       then public.bloom_habit_run(v_uid)
    when 'run-60'       then public.bloom_habit_run(v_uid)
    when 'run-90'       then public.bloom_habit_run(v_uid)
    when 'days-30'      then public.bloom_habit_days(v_uid, p_today, 400)
    when 'days-100'     then public.bloom_habit_days(v_uid, p_today, 400)
    when 'days-365'     then public.bloom_habit_days(v_uid, p_today, 400)
    when 'movement-25'  then public.bloom_movement_sessions(v_uid, p_today, 400)
    when 'movement-100' then public.bloom_movement_sessions(v_uid, p_today, 400)
    when 'mood-30'      then public.bloom_mood_days(v_uid, p_today, 400)
    when 'mood-100'     then public.bloom_mood_days(v_uid, p_today, 400)
    when 'sleep-30'     then public.bloom_tracker_days(v_uid, p_today, 'sleep', 400)
    when 'hydration-30' then public.bloom_tracker_days(v_uid, p_today, 'water', 400)
    when 'recovery-20'  then public.bloom_recovery_days(v_uid, p_today, 400)
    when 'study-50'     then public.bloom_study_sessions(v_uid, p_today, 400)
    else 0
  end;

  -- "Today's routine" is however many habits the person actually keeps.
  if p_goal_id = 'daily-routine' then
    select count(*)::integer into v_habit_count
      from public.habits h
     where h.profile_id = v_uid and coalesce(h.is_archived, false) = false;
    v_target := greatest(v_habit_count, 1);
  end if;

  -- Achievements unlock as achievements, not as goals.
  if p_goal_id like 'ach-%' then
    return query select false, 0, 0, 'Unknown goal.', v_period;
    return;
  end if;

  if coalesce(v_progress, 0) < v_target then
    select p.total_points into v_balance from public.profiles p where p.id = v_uid;
    return query select false, v_points, coalesce(v_balance, 0), 'Not completed yet.', v_period;
    return;
  end if;

  -- Award: ledger + mark + balance, one transaction.
  insert into public.point_transactions (profile_id, kind, ref_id, period_key, title, source, points)
  values (v_uid, 'goal', p_goal_id, v_period, v_title, v_source, v_points)
  on conflict do nothing;

  if not found then
    select p.total_points into v_balance from public.profiles p where p.id = v_uid;
    return query select false, v_points, coalesce(v_balance, 0), 'Already earned for this period.', v_period;
    return;
  end if;

  insert into public.goal_awards (profile_id, goal_id, period_key, title, points)
  values (v_uid, p_goal_id, v_period, v_title, v_points)
  on conflict (profile_id, goal_id, period_key) do nothing;

  update public.profiles p
     set total_points = coalesce(p.total_points, 0) + v_points,
         updated_at = now()
   where p.id = v_uid
  returning p.total_points into v_balance;

  -- The rank the new balance has reached (recorded once per tier, for the
  -- ceremony and the archive — the rank itself is always derived).
  insert into public.rank_history (profile_id, tier, rank_id, name, at_points)
  select v_uid, r.tier, r.rank_id, r.name, coalesce(v_balance, 0)
    from public.bloom_ranks r
   where r.threshold <= coalesce(v_balance, 0)
     and r.tier = (select max(r2.tier) from public.bloom_ranks r2 where r2.threshold <= coalesce(v_balance, 0))
  on conflict (profile_id, tier) do nothing;

  return query select true, v_points, coalesce(v_balance, 0), 'Awarded.', v_period;
end;
$$;

revoke all on function public.award_progress(text, date) from anon;
grant execute on function public.award_progress(text, date) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Award an achievement (once ever). Verification mirrors the client's
--    `achievements.ts` conditions.
-- ---------------------------------------------------------------------------
create or replace function public.award_achievement(p_achievement_id text)
returns table (awarded boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'UTC')::date;
  v_ok boolean := false;
  v_title text;
  v_inserted integer;
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  v_ok := case p_achievement_id
    when 'ach-first-bloom'      then (select count(*) > 0 from public.habit_logs l where l.profile_id = v_uid)
    when 'ach-seven-strong'     then public.bloom_habit_run(v_uid) >= 7
    when 'ach-thirty-strong'    then public.bloom_habit_run(v_uid) >= 30
    when 'ach-consistent-mind'  then public.bloom_mood_days(v_uid, v_today, 400) >= 7
    when 'ach-quiet-focus'      then public.bloom_study_sessions(v_uid, v_today, 400) >= 10
    when 'ach-movement-milestone' then public.bloom_movement_sessions(v_uid, v_today, 400) >= 25
    when 'ach-deep-rest'        then public.bloom_recovery_days(v_uid, v_today, 400) >= 7
    when 'ach-hydration-habit'  then public.bloom_tracker_days(v_uid, v_today, 'water', 400) >= 14
    when 'ach-balance-keeper'   then public.bloom_balance_days(v_uid, v_today, 400) >= 30
    when 'ach-night-keeper'     then public.bloom_tracker_days(v_uid, v_today, 'sleep', 400) >= 60
    when 'ach-reflection-ritual' then public.bloom_mood_days(v_uid, v_today, 400) >= 30
    when 'ach-century'          then public.bloom_habit_days(v_uid, v_today, 400) >= 100
    when 'ach-year-of-bloom'    then public.bloom_habit_days(v_uid, v_today, 400) >= 365
    when 'ach-in-bloom'         then coalesce((select p.total_points from public.profiles p where p.id = v_uid), 0) >= 3500
    when 'ach-flourish'         then coalesce((select p.total_points from public.profiles p where p.id = v_uid), 0) >= 5000
    when 'ach-evergreen'        then coalesce((select p.total_points from public.profiles p where p.id = v_uid), 0) >= 9500
    when 'ach-ten-thousand'     then coalesce((select p.total_points from public.profiles p where p.id = v_uid), 0) >= 10000
    when 'ach-bloomkeeper'      then coalesce((select p.total_points from public.profiles p where p.id = v_uid), 0) >= 25000
    -- Wake-time achievement needs the tracker's own wake column.
    when 'ach-early-riser'      then (
      select count(*)::integer >= 5
        from public.tracker_days t
       where t.profile_id = v_uid
         and t.wake_time is not null
         and t.wake_time < '07:30'
         and t.date between v_today - 59 and v_today
    )
    else false
  end;

  select a.title into v_title from (values
    ('ach-first-bloom', 'First Bloom'),
    ('ach-seven-strong', 'Seven Days Strong'),
    ('ach-consistent-mind', 'Consistent Mind'),
    ('ach-early-riser', 'Early Riser'),
    ('ach-quiet-focus', 'Quiet Focus'),
    ('ach-movement-milestone', 'Movement Milestone'),
    ('ach-deep-rest', 'Deep Rest'),
    ('ach-hydration-habit', 'Hydration Habit'),
    ('ach-balance-keeper', 'Balance Keeper'),
    ('ach-night-keeper', 'Night Keeper'),
    ('ach-thirty-strong', 'Thirty Days Strong'),
    ('ach-reflection-ritual', 'Reflection Ritual'),
    ('ach-century', 'Century'),
    ('ach-in-bloom', 'In Bloom'),
    ('ach-flourish', 'Flourish'),
    ('ach-evergreen', 'Evergreen'),
    ('ach-ten-thousand', 'Ten Thousand'),
    ('ach-bloomkeeper', 'Bloomkeeper'),
    ('ach-year-of-bloom', 'Year of Bloom')
  ) as a(id, title) where a.id = p_achievement_id;

  if v_title is null then
    return query select false, 'Unknown achievement.';
    return;
  end if;

  if not coalesce(v_ok, false) then
    return query select false, 'Not earned yet.';
    return;
  end if;

  insert into public.user_achievements (profile_id, achievement_id, title)
  values (v_uid, p_achievement_id, v_title)
  on conflict (profile_id, achievement_id) do nothing;

  get diagnostics v_inserted = row_count;
  return query select v_inserted > 0, case when v_inserted > 0 then 'Earned.' else 'Already earned.' end;
end;
$$;

revoke all on function public.award_achievement(text) from anon;
grant execute on function public.award_achievement(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Read helpers: the point history and the archive, owner-only.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_point_history(p_limit integer default 60)
returns table (
  id uuid,
  kind text,
  ref_id text,
  title text,
  source text,
  points integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.kind, t.ref_id, t.title, t.source, t.points, t.created_at
    from public.point_transactions t
   where t.profile_id = auth.uid()
   order by t.created_at desc
   limit greatest(1, least(coalesce(p_limit, 60), 200));
$$;

grant execute on function public.get_my_point_history(integer) to authenticated;

create or replace function public.get_my_achievements()
returns table (achievement_id text, title text, awarded_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.achievement_id, a.title, a.awarded_at
    from public.user_achievements a
   where a.profile_id = auth.uid()
   order by a.awarded_at desc;
$$;

grant execute on function public.get_my_achievements() to authenticated;

create or replace function public.get_my_ranks()
returns table (tier integer, rank_id text, name text, at_points integer, reached_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.tier, r.rank_id, r.name, r.at_points, r.reached_at
    from public.rank_history r
   where r.profile_id = auth.uid()
   order by r.tier desc;
$$;

grant execute on function public.get_my_ranks() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Admin audit — read-only inspection of every award, admins only.
--     (Authorization is the existing is_rewards_admin() check, server-side.)
-- ---------------------------------------------------------------------------
create or replace function public.admin_point_audit(p_limit integer default 200)
returns table (
  profile_id uuid,
  profile_name text,
  kind text,
  ref_id text,
  title text,
  points integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select t.profile_id, p.profile_name, t.kind, t.ref_id, t.title, t.points, t.created_at
    from public.point_transactions t
    left join public.profiles p on p.id = t.profile_id
   where public.is_rewards_admin()
   order by t.created_at desc
   limit greatest(1, least(coalesce(p_limit, 200), 1000));
$$;

revoke all on function public.admin_point_audit(integer) from anon;
grant execute on function public.admin_point_audit(integer) to authenticated;
