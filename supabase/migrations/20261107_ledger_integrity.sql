-- Bloom — Ledger integrity: every balance change writes its ledger row.
--
-- The hole: when `award_habit_points()` / `revoke_habit_points()` were
-- unavailable on a project, the client fell back to adjusting
-- `profiles.total_points` through `increment_points()` /
-- `decrement_points()` — or, if those failed too, a direct profile update.
-- None of those write a `point_transactions` row, so the balance could move
-- with no receipt and the ledger stopped summing to the balance (found live:
-- a 375-point balance whose ledger rows summed to 70).
--
-- `adjust_habit_points()` is that fallback, ledgered. It follows the exact
-- rules of the primary functions:
--
--   · the amount is the habit's own `point_value`, read server-side — the
--     client proposes only the direction (the sign of `p_delta`);
--   · an award writes the same ledger row `award_habit_points()` writes —
--     same kind, ref and period, so the shared unique award key
--     (`point_transactions_award_key`) makes the two functions
--     interchangeable: either one paying first makes the other a no-op, and
--     either revoke removes the row;
--   · the balance moves only when the ledger row is actually inserted
--     (award) or deleted (revoke), in the same transaction.
--
-- `increment_points()` / `decrement_points()` stay for pre-ledger clients
-- only. They take no award identity, so no idempotent ledger row can be
-- written for them; current clients must not call them.
--
-- Run after 20261030_points_identity_habits.sql. Additive and idempotent.

create or replace function public.adjust_habit_points(
  p_habit_id uuid,
  p_date date,
  p_delta integer
)
returns table (applied boolean, points integer, balance integer)
language plpgsql
security definer
set search_path = public
as $$
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
    delete from public.point_transactions
     where profile_id = v_uid
       and kind = 'habit'
       and ref_id = p_habit_id::text
       and period_key = p_date::text
    returning points into v_points;

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
$$;

revoke all on function public.adjust_habit_points(uuid, date, integer) from public, anon;
grant execute on function public.adjust_habit_points(uuid, date, integer) to authenticated;
