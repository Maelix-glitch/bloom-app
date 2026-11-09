-- 20261109: fix the habit-points revoke path (live incident, 2026-11-09).
-- revoke_habit_points() and the revoke branch of adjust_habit_points() both
-- declared RETURNS TABLE(..., points integer, ...) and then ran
--   delete ... returning points into v_points
-- Inside the DELETE, bare "points" is ambiguous between the PL/pgSQL OUT
-- variable and the point_transactions.points column, so every call raised
-- SQLSTATE 42702 at runtime. Every habit UNTICK therefore failed server-side:
-- the habit log was deleted by the direct table call, but the points were
-- never revoked and the app showed "That tick didn't reach your account."
-- Fix: alias the table (pt) and qualify pt.points. Applied live 2026-11-09
-- together with a ledger reconciliation of the orphaned award rows the bug
-- left behind (balances re-verified equal to ledger sums).
-- Also re-asserts profiles.banner_path (the 20260828 migration adds it, but
-- the live database was missing it; every profile load failed its full and
-- first partial column sets before falling back). Idempotent.

alter table public.profiles add column if not exists banner_path text;

CREATE OR REPLACE FUNCTION public.revoke_habit_points(p_habit_id uuid, p_date date)
 RETURNS TABLE(revoked boolean, points integer, balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_points integer;
  v_rows integer := 0;
  v_deleted boolean := false;
  v_balance integer;
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  delete from public.point_transactions
   where profile_id = v_uid
     and pt.kind = 'habit'
     and pt.ref_id = p_habit_id::text
     and pt.period_key = p_date::text
  returning pt.points into v_points;

  get diagnostics v_rows = row_count;
  v_deleted := v_rows > 0;

  if v_deleted then
    update public.profiles
       set total_points = greatest(0, coalesce(total_points, 0) - coalesce(v_points, 0)),
           updated_at = now()
     where id = v_uid;
  end if;

  select coalesce(total_points, 0) into v_balance from public.profiles where id = v_uid;
  return query select v_deleted, coalesce(v_points, 0), v_balance;
end;
$function$


CREATE OR REPLACE FUNCTION public.adjust_habit_points(p_habit_id uuid, p_date date, p_delta integer)
 RETURNS TABLE(applied boolean, points integer, balance integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- actually ticked — same checks as award_habit_points().
    select coalesce(h.point_value, 10)
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
$function$

