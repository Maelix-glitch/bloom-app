-- Bloom — Bloom Points, identity and habit integrity.
--
-- This migration closes four holes that made the app's core loop feel
-- unreliable:
--
--   1. Habit ticks adjusted `profiles.total_points` with a blind increment.
--      A retry, a double-tap or a second tab could pay the same tick twice,
--      and the untick path had no matching receipt. Ticks now write an
--      idempotent row in `point_transactions` (one per habit per local day)
--      and the balance moves only when that row is actually inserted.
--   2. `increment_points()` / `decrement_points()` accepted any `user_id`,
--      so an authenticated caller could change another account's balance.
--      They now refuse anything but the caller's own row, and are only kept
--      for older clients.
--   3. Usernames could be checked and then lost to another account in the
--      gap before save, and the UI turned the database's unique violation
--      into a generic error. `claim_bloom_username()` reserves atomically,
--      reports a typed outcome, and `is_bloom_username_available()` no longer
--      calls your own handle "taken".
--   4. The AI and manual habit paths could create the same habit twice. The
--      migration de-duplicates existing rows (archiving, never deleting) and
--      installs a unique index for active habits.
--
-- Run after 20260919_push_subscriptions.sql. Additive and idempotent.

-- ---------------------------------------------------------------------------
-- 1. Habit points — one transaction per habit per local day
-- ---------------------------------------------------------------------------

-- The original transaction table only accepted goal/achievement/rank. Habit
-- awards use the same ledger, so the constraint has to admit them before the
-- first function call, not after.
alter table public.point_transactions
  drop constraint if exists point_transactions_kind_check;
alter table public.point_transactions
  add constraint point_transactions_kind_check
  check (kind in ('goal', 'achievement', 'rank', 'habit'));

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
  select coalesce(h.point_value, 10)
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

create or replace function public.revoke_habit_points(
  p_habit_id uuid,
  p_date date
)
returns table (revoked boolean, points integer, balance integer)
language plpgsql
security definer
set search_path = public
as $$
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
     and kind = 'habit'
     and ref_id = p_habit_id::text
     and period_key = p_date::text
  returning points into v_points;

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
$$;

revoke all on function public.revoke_habit_points(uuid, date) from public, anon;
grant execute on function public.revoke_habit_points(uuid, date) to authenticated;

-- Legacy helpers: keep the signature, remove the "write anyone's balance"
-- behaviour. New clients never call these, older builds keep working.
create or replace function public.increment_points(user_id uuid, pts integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> user_id then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  update public.profiles
     set total_points = coalesce(total_points, 0) + greatest(0, pts),
         updated_at = now()
   where id = user_id;
end;
$$;

create or replace function public.decrement_points(user_id uuid, pts integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> user_id then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  update public.profiles
     set total_points = greatest(0, coalesce(total_points, 0) - greatest(0, pts)),
         updated_at = now()
   where id = user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Username claiming — atomic, typed, never a generic failure
-- ---------------------------------------------------------------------------

create or replace function public.is_bloom_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
      from public.profiles p
     where lower(p.username) = lower(trim(p_username))
       and (auth.uid() is null or p.id <> auth.uid())
  );
$$;

grant execute on function public.is_bloom_username_available(text) to anon, authenticated;

-- Reserved handles are Bloom's own routes and words. Keep in step with
-- src/lib/profile/validation.ts.
create or replace function public.bloom_username_is_reserved(p_username text)
returns boolean
language sql
immutable
as $$
  select lower(trim(p_username)) = any (array[
    'admin','administrator','api','bloom','coach','cycle','help','index',
    'login','logout','mood','not-found','privacy','profile','rewards',
    'root','settings','signin','signout','signup','story','stories',
    'support','today','trackers','user','users','health','points','tools'
  ]);
$$;

grant execute on function public.bloom_username_is_reserved(text) to anon, authenticated;

/**
 * Claim a handle for the caller in one statement.
 *
 * Returns `claimed`, `taken`, `invalid` or `reserved` — the UI can say what
 * actually happened, including the race where someone else claimed the same
 * name between the availability check and the save.
 */
create or replace function public.claim_bloom_username(p_username text)
returns table (status text, username text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text := lower(trim(coalesce(p_username, '')));
begin
  if v_uid is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  if v_handle !~ '^[a-z0-9_]{3,30}$' or v_handle ~ '^_|_$' then
    return query select 'invalid'::text, null::text;
    return;
  end if;

  if public.bloom_username_is_reserved(v_handle) then
    return query select 'reserved'::text, null::text;
    return;
  end if;

  begin
    update public.profiles
       set username = v_handle,
           updated_at = now()
     where id = v_uid;
  exception when unique_violation then
    return query select 'taken'::text, null::text;
    return;
  end;

  if not found then
    -- The profile row hasn't been created yet; create it with the handle.
    begin
      insert into public.profiles (id, profile_name, username, total_points, updated_at)
      values (v_uid, 'Bloom User', v_handle, 0, now());
    exception when unique_violation then
      return query select 'taken'::text, null::text;
      return;
    end;
  end if;

  return query select 'claimed'::text, v_handle;
end;
$$;

revoke all on function public.claim_bloom_username(text) from anon;
grant execute on function public.claim_bloom_username(text) to authenticated;

/**
 * A few genuinely-free handles near the one someone wanted.
 * Deterministic suffixing (no random names that change on every tap).
 */
create or replace function public.bloom_username_suggestions(p_base text)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  base text := regexp_replace(lower(trim(coalesce(p_base, ''))), '[^a-z0-9_]', '', 'g');
  candidate text;
  out_handles text[] := '{}';
  i integer;
begin
  base := trim(both '_' from left(base, 24));
  if length(base) < 3 then base := 'bloomer'; end if;
  if public.bloom_username_is_reserved(base) then base := base || '_'; end if;

  if public.is_bloom_username_available(base) then
    out_handles := array_append(out_handles, base);
  end if;

  foreach i in array array[1, 2, 3, 7, 12, 24] loop
    exit when cardinality(out_handles) >= 5;
    candidate := base || i::text;
    if length(candidate) <= 30 and public.is_bloom_username_available(candidate) then
      out_handles := array_append(out_handles, candidate);
    end if;
  end loop;

  return out_handles;
end;
$$;

revoke all on function public.bloom_username_suggestions(text) from anon;
grant execute on function public.bloom_username_suggestions(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Habit integrity — de-duplicate, then prevent a repeat
-- ---------------------------------------------------------------------------

-- Keep the oldest habit of each (profile, case-insensitive name). Its logs
-- become the keeper's logs; duplicates are archived, not deleted, so nothing
-- a person recorded disappears and it can still be restored by hand.
do $$
declare
  dup record;
  keeper uuid;
begin
  for dup in
    select profile_id, lower(trim(name)) as normalized
      from public.habits
     where coalesce(is_archived, false) = false
     group by profile_id, lower(trim(name))
    having count(*) > 1
  loop
    select id into keeper
      from public.habits
     where profile_id = dup.profile_id
       and lower(trim(name)) = dup.normalized
       and coalesce(is_archived, false) = false
     order by created_at asc nulls last, id asc
     limit 1;

    insert into public.habit_logs (profile_id, habit_id, date, value, completed_at)
    select profile_id, keeper, date, value, completed_at
      from public.habit_logs
     where profile_id = dup.profile_id
       and habit_id in (
         select id from public.habits
          where profile_id = dup.profile_id
            and lower(trim(name)) = dup.normalized
            and coalesce(is_archived, false) = false
            and id <> keeper
       )
    on conflict do nothing;

    update public.habits
       set is_archived = true,
           note = coalesce(note || ' · ', '') || 'Archived: duplicate of ' || keeper::text,
           updated_at = now()
     where profile_id = dup.profile_id
       and lower(trim(name)) = dup.normalized
       and coalesce(is_archived, false) = false
       and id <> keeper;
  end loop;
end $$;

create unique index if not exists habits_active_name_key
  on public.habits (profile_id, lower(trim(name)))
  where coalesce(is_archived, false) = false;

-- ---------------------------------------------------------------------------
-- 4. One more guard: point transactions always belong to their profile
-- ---------------------------------------------------------------------------

alter table public.point_transactions enable row level security;

drop policy if exists "point_transactions owner select" on public.point_transactions;
create policy "point_transactions owner select" on public.point_transactions
  for select using (profile_id = auth.uid());
