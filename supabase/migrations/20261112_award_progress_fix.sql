-- 20261112: repair award_progress() — quest claims never credited points.
--
-- Live incident (reported by the owner 2026-11-12, reproduced the same day
-- against the live project): completing a Rewards quest and claiming it
-- appeared to succeed in the app, but the points balance never moved.
--
-- Root cause: the goal_awards insert inside award_progress() named its
-- conflict target as (profile_id, goal_id, period_key). The function
-- RETURNS TABLE(..., period_key text), so the bare `period_key` in the
-- target is ambiguous between the PL/pgSQL OUT variable and the table
-- column. Every claim that passed verification raised SQLSTATE 42702 at
-- that insert, the transaction aborted, and neither the ledger row, the
-- award mark nor the profiles.total_points update ever landed. (Same
-- defect class as the 2026-11-09 revoke_habit_points incident.) The
-- client then settled the claim in its local ledger only, so the quest
-- showed as claimed while the account balance — the only number the app
-- displays when signed in — never changed, and the local record blocked
-- any retry.
--
-- This migration recreates the function with exactly two changes:
--   1. the goal_awards insert uses an untargeted ON CONFLICT DO NOTHING
--      (goal_awards has a single unique constraint — its primary key —
--      so the guard is unchanged);
--   2. the five daily goal values are aligned with the client catalog in
--      src/lib/progression/goals.ts (100/120/100/100/120), which is the
--      amount the quest cards promise and what the local ledger has
--      recorded since launch. Every other value already matched.
--
-- Idempotent: CREATE OR REPLACE, safe to re-run.

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
      ('daily-routine',       100,  'Complete today''s habit routine',       'habits',       'daily',    0),
      ('daily-move',          120,  'Log movement today',                    'movement',     'daily',    1),
      ('daily-mood',          100,  'Check in with how today feels',         'mood',         'daily',    1),
      ('daily-water',         100,  'Log hydration today',                   'hydration',    'daily',    1),
      ('daily-sleep',         120,  'Log last night''s sleep',               'sleep',        'daily',    1),
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
  -- No inference target here on purpose: this function RETURNS TABLE(...,
  -- period_key text), so a bare `period_key` in an ON CONFLICT target is
  -- ambiguous between the OUT variable and the column and raised 42702 at
  -- runtime, aborting every verified award before the balance update.
  -- goal_awards has exactly one unique constraint (its primary key), so an
  -- untargeted DO NOTHING guards the same key.
  on conflict do nothing;

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
