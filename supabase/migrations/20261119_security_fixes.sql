-- Bloom — Security fixes from the 2026-11-19 penetration test.
--
-- Four findings, one migration:
--
--   H1  The legacy `increment_points()` / `decrement_points()` RPCs are
--       still granted to `authenticated` and pay out a CALLER-CHOSEN
--       amount (`greatest(0, pts)` of whatever the request sends). The
--       current client never calls them — grep of src/ and
--       supabase/functions/ finds only a test asserting their absence —
--       so they are dropped outright, not merely revoked. The live
--       award paths (award_habit_points, adjust_habit_points,
--       award_progress) compute every amount server-side and are
--       untouched. A guard trigger on profiles closes the mirror hole:
--       `total_points` may only change from a SECURITY DEFINER function
--       (owner context) or the service role, never from a direct
--       client UPDATE — the client's own profile save never writes
--       that column (profileService.saveProfile sends display fields
--       only), and every SQL writer of the column is a definer
--       function, so no legitimate flow can trip the guard.
--
--   H2  `habits.point_value` is client-written with no bound, and the
--       award RPCs pay the stored value once per habit per day. The
--       app's own habit form writes 5..500 (stepper range in
--       AddHabitModal, default 10), so the product maximum is 500:
--       a CHECK constraint pins the column to 1..500 (floor 1 matches
--       the award functions' own "points <= 0 pays nothing" rule and
--       can never reject an app-written row), existing out-of-range
--       rows are clamped INTO the range before the constraint lands
--       (an out-of-range row can only be a crafted one — the app
--       cannot write it), and both award functions clamp defensively
--       with least(..., 500) so even a future constraint gap cannot
--       pay out more than the product maximum.
--
--   M4  `billing_effective_tier()` returned the paid plan for any
--       subscription with status 'active' WITHOUT looking at
--       current_period_end — a subscription whose provider events
--       stop arriving (or a replayed activation) kept Premium
--       forever. 'active' now counts only while the period is open:
--       current_period_end is null, or in the future, or within a
--       3-day grace past it for renewal retries (a late
--       subscription.charged must not flicker a paying person to
--       free; past the grace, silence from the provider means the
--       plan lapses like any other). The cancelled branch is
--       unchanged (still inside its paid period or free).
--       The same section creates `billing_webhook_events`, the
--       webhook replay ledger: the billing function records the
--       SHA-256 of every verified webhook body before acting on it,
--       and a repeat delivery (provider retry or a captured replay —
--       Razorpay signatures carry no timestamp) hits the primary
--       key and is ignored.
--
-- Additive and idempotent; nothing here touches the billing
-- foundation's tables, grants or erase coverage (the webhook ledger
-- holds provider receipts, no per-person rows — it is a global table
-- like app_invites, and erase neither gains nor loses a target).

-- ---------------------------------------------------------------------------
-- H1 — drop the legacy caller-amount points RPCs
-- ---------------------------------------------------------------------------
drop function if exists public.increment_points(uuid, integer);
drop function if exists public.decrement_points(uuid, integer);

-- H1 hardening — total_points moves only through definer functions.
create or replace function public.guard_profile_total_points()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.total_points is distinct from old.total_points
     and current_user not in ('postgres', 'service_role') then
    raise exception 'total_points is server-owned'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_profile_total_points() from public;

drop trigger if exists profiles_total_points_guard on public.profiles;
create trigger profiles_total_points_guard
  before update on public.profiles
  for each row execute function public.guard_profile_total_points();

-- ---------------------------------------------------------------------------
-- H2 — bound habits.point_value to the product range, clamp in awards
-- ---------------------------------------------------------------------------

/* Bring any existing row inside the range first. App-written rows are
   already 5..500, so on a healthy database this updates nothing; a
   crafted 1,000,000 row becomes the product maximum, not a payout. */
update public.habits
   set point_value = least(greatest(point_value, 1), 500)
 where point_value < 1 or point_value > 500;

alter table public.habits
  drop constraint if exists habits_point_value_range;
alter table public.habits
  add constraint habits_point_value_range
  check (point_value between 1 and 500);

/* award_habit_points restated from 20261030 with ONE change: the
   stored point_value is clamped to the product maximum (500) before
   it is paid — defence in depth behind the CHECK constraint above. */
create or replace function public.award_habit_points(
  p_habit_id uuid,
  p_date date default (now() at time zone 'UTC')::date
)
returns table (awarded boolean, points integer, balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_points integer;
  v_rows integer := 0;
  v_inserted boolean := false;
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  -- The habit belongs to the caller, is active, and the day is actually
  -- ticked. The client cannot propose an amount; point_value is the record.
  select least(coalesce(h.point_value, 10), 500)
    into v_points
    from public.habits h
   where h.id = p_habit_id
     and h.profile_id = v_uid
     and coalesce(h.is_archived, false) = false;

  if v_points is null then
    return query select false, 0, coalesce((select total_points from public.profiles where id = v_uid), 0);
    return;
  end if;

  if v_points <= 0 then
    return query select false, 0, coalesce((select total_points from public.profiles where id = v_uid), 0);
    return;
  end if;

  if not exists (
    select 1 from public.habit_logs l
     where l.profile_id = v_uid
       and l.habit_id = p_habit_id
       and l.date = p_date
  ) then
    return query select false, 0, coalesce((select total_points from public.profiles where id = v_uid), 0);
    return;
  end if;

  insert into public.point_transactions
    (profile_id, kind, ref_id, period_key, title, source, points)
  values
    (v_uid, 'habit', p_habit_id::text, p_date::text, 'Habit completed', 'habits', v_points)
  on conflict (profile_id, kind, ref_id, coalesce(period_key, 'once')) do nothing;

  get diagnostics v_rows = row_count;
  v_inserted := v_rows > 0;

  if v_inserted then
    update public.profiles
       set total_points = coalesce(total_points, 0) + v_points,
           updated_at = now()
     where id = v_uid;
  end if;

  select coalesce(total_points, 0) into v_balance from public.profiles where id = v_uid;
  return query select v_inserted, case when v_inserted then v_points else 0 end, v_balance;
end;
$$;

revoke all on function public.award_habit_points(uuid, date) from public, anon;
grant execute on function public.award_habit_points(uuid, date) to authenticated;

/* adjust_habit_points restated from 20261109 (the alias-fixed body)
   with the same clamp in its award branch. The revoke branch is
   unchanged — it removes the ledger row that was actually written. */
create or replace function public.adjust_habit_points(p_habit_id uuid, p_date date, p_delta integer)
 returns table(applied boolean, points integer, balance integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_points integer;
  v_rows integer := 0;
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  if p_delta > 0 then
    -- Award. The habit belongs to the caller, is active, and the day is
    -- actually ticked — same checks as award_habit_points(), with the
    -- same clamp to the product maximum.
    select least(coalesce(h.point_value, 10), 500)
      into v_points
      from public.habits h
     where h.id = p_habit_id
       and h.profile_id = v_uid
       and coalesce(h.is_archived, false) = false;

    if v_points is null or v_points <= 0 then
      return query select false, 0, coalesce((select total_points from public.profiles where id = v_uid), 0);
      return;
    end if;

    if not exists (
      select 1 from public.habit_logs l
       where l.profile_id = v_uid
         and l.habit_id = p_habit_id
         and l.date = p_date
    ) then
      return query select false, 0, coalesce((select total_points from public.profiles where id = v_uid), 0);
      return;
    end if;

    insert into public.point_transactions
      (profile_id, kind, ref_id, period_key, title, source, points)
    values
      (v_uid, 'habit', p_habit_id::text, p_date::text, 'Habit completed', 'habits', v_points)
    on conflict (profile_id, kind, ref_id, coalesce(period_key, 'once')) do nothing;

    get diagnostics v_rows = row_count;

    if v_rows > 0 then
      update public.profiles
         set total_points = coalesce(total_points, 0) + v_points,
             updated_at = now()
       where id = v_uid;
    end if;

    select coalesce(total_points, 0) into v_balance from public.profiles where id = v_uid;
    return query select v_rows > 0, case when v_rows > 0 then v_points else 0 end, v_balance;
    return;
  end if;

  if p_delta < 0 then
    -- Revoke. Same rule as revoke_habit_points(): the balance moves only
    -- when the award's ledger row is actually removed.
    delete from public.point_transactions pt
     where pt.profile_id = v_uid
       and pt.kind = 'habit'
       and pt.ref_id = p_habit_id::text
       and pt.period_key = p_date::text
    returning pt.points into v_points;

    get diagnostics v_rows = row_count;

    if v_rows > 0 then
      update public.profiles
         set total_points = greatest(0, coalesce(total_points, 0) - coalesce(v_points, 0)),
             updated_at = now()
       where id = v_uid;
    end if;

    select coalesce(total_points, 0) into v_balance from public.profiles where id = v_uid;
    return query select v_rows > 0, coalesce(v_points, 0), v_balance;
    return;
  end if;

  select coalesce(total_points, 0) into v_balance from public.profiles where id = v_uid;
  return query select false, 0, v_balance;
end;
$function$;

-- ---------------------------------------------------------------------------
-- M4 — billing_effective_tier: 'active' expires with its period
-- ---------------------------------------------------------------------------
create or replace function public.billing_effective_tier(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
  v_period_end timestamptz;
begin
  select plan, status, current_period_end
    into v_plan, v_status, v_period_end
  from public.subscriptions
  where user_id = p_user_id;

  if v_plan is null or v_plan = 'free' then
    return 'free';
  end if;
  if v_status = 'active' then
    /* The period is the subscription's life: open-ended (null) counts,
       a future end counts, and a 3-day grace past the end absorbs
       renewal retries and late subscription.charged events. Beyond
       that, provider silence means the plan has lapsed. */
    if v_period_end is null or v_period_end > now() - interval '3 days' then
      return v_plan;
    end if;
    return 'free';
  end if;
  if v_status = 'cancelled' and v_period_end is not null and v_period_end > now() then
    return v_plan;
  end if;
  return 'free';
end;
$$;

revoke all on function public.billing_effective_tier(uuid) from public;

-- ---------------------------------------------------------------------------
-- M4 — billing_webhook_events: the webhook replay ledger
-- ---------------------------------------------------------------------------
create table if not exists public.billing_webhook_events (
  event_key text primary key,
  provider text not null default 'razorpay',
  event text not null default '',
  received_at timestamptz not null default now()
);

comment on table public.billing_webhook_events is
  'Replay ledger for verified payment webhooks: event_key is the SHA-256 of the raw webhook body, recorded by the billing function (service role) BEFORE the event is acted on. A second delivery of the same body — provider retry or captured replay — hits the primary key and is ignored. Provider receipts only; no per-person rows.';

alter table public.billing_webhook_events enable row level security;

revoke all on public.billing_webhook_events from anon;
revoke all on public.billing_webhook_events from authenticated;
