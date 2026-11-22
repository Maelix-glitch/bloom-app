-- 20261122: member badges — Founder and Tester, grant-only.
--
-- Owner directive (2026-11-22): "add badges like trainer, tester, and
-- other badges". Three labelled badges sit beside the verified tick —
-- Founder, Trainer, Tester — each with ONE truth, never two:
--
--   · Trainer is NOT in this migration's table. It derives from the
--     existing trainer grant: a row in `trainer_profiles`
--     (20261121). There is no second grant path for it, ever.
--   · Founder and Tester live here, in `member_badges`, and are
--     GRANT-ONLY in the pattern M-208 set for verification the same
--     day: rows are created only by `admin_grant_badge(email, badge)`
--     from a trusted SQL session (service role), and removed only by
--     `admin_revoke_badge(email, badge)`. No client role can write
--     the table, no UI grants anything, and there is no claim,
--     request or application path — who holds a badge is the owner's
--     call, person by person.
--
-- Reads: a member reads their OWN rows (RLS below) — that is all the
-- Profile hero, the rail and Settings need. OTHER people's badges
-- travel the one door that already exists for other people's facts:
-- `search_profiles` (20261116) is restated below with two added
-- columns, `is_trainer` and `badges`, computed inside the
-- security-definer function. No policy is widened: `trainer_profiles`
-- and `member_badges` stay own-row-only through PostgREST, exactly
-- like `account_verifications` before them.
--
-- Erasure: the companion file 20261122_member_badges_erase.sql
-- restates erase_my_data() with the member_badges delete added — the
-- house pattern for every new per-person table, pinned by the
-- eraseCoverage guard (and kept in its own file for the reason its
-- header gives). The table also cascades from auth.users, but the
-- explicit delete is what reports the count, and it runs even in the
-- path where the final auth-row delete cannot.
--
-- NOTE: apply to the live project before (or with) the deploy that
-- ships the badge client. Until it is applied, the client reads fail
-- closed: the member_badges read errors and reports "not held", and
-- search rows arrive without the new columns, which the client reads
-- as no badges. After it is applied, older clients simply ignore the
-- two extra search columns.

-- ---------------------------------------------------------------------------
-- 1. The table — founder and tester only, by constraint
-- ---------------------------------------------------------------------------
create table if not exists public.member_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge text not null check (badge in ('founder', 'tester')),
  granted_at timestamptz not null default now(),
  primary key (user_id, badge)
);

comment on table public.member_badges is
  'Granted member badges: founder and tester. (Trainer is not a badge row — it derives from trainer_profiles.) Rows are created only by admin_grant_badge() from a trusted session (owner directive 2026-11-22); clients may select only their own rows and can never write.';

alter table public.member_badges enable row level security;

-- Read-own only. There are deliberately no insert/update/delete
-- policies and no write grants: every write goes through the
-- SECURITY DEFINER grant/revoke below.
drop policy if exists "member_badges self select" on public.member_badges;
create policy "member_badges self select"
  on public.member_badges
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.member_badges from anon;
grant select on public.member_badges to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The grant — service role only, no UI, ever
-- ---------------------------------------------------------------------------
create or replace function public.admin_grant_badge(p_email text, p_badge text)
returns public.member_badges
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_badge text := lower(trim(coalesce(p_badge, '')));
  v_row public.member_badges;
begin
  if v_badge not in ('founder', 'tester') then
    raise exception using errcode = '22023',
      message = 'Unknown badge: use ''founder'' or ''tester''. (Trainer is granted by admin_grant_trainer.)';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(coalesce(p_email, '')));

  if v_user_id is null then
    raise exception using errcode = '22023',
      message = 'No Bloom account exists for that email address.';
  end if;

  /* Idempotent: a badge already held is returned untouched — a
     re-grant never rewrites granted_at. */
  insert into public.member_badges (user_id, badge)
  values (v_user_id, v_badge)
  on conflict (user_id, badge) do nothing
  returning * into v_row;

  if v_row is null then
    select b.* into v_row
    from public.member_badges b
    where b.user_id = v_user_id and b.badge = v_badge;
  end if;

  return v_row;
end;
$$;

comment on function public.admin_grant_badge(text, text) is
  'Grant a member badge (''founder'' or ''tester'') to the account with this email and return the row. SERVICE ROLE ONLY — run from a trusted SQL session: select * from public.admin_grant_badge(''name@example.com'', ''tester''); There is no UI for this, by owner decision (2026-11-22). Idempotent: an existing row is returned untouched.';

revoke all on function public.admin_grant_badge(text, text) from public, anon, authenticated;
grant execute on function public.admin_grant_badge(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. The revoke — service role only
-- ---------------------------------------------------------------------------
create or replace function public.admin_revoke_badge(p_email text, p_badge text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_badge text := lower(trim(coalesce(p_badge, '')));
  v_removed int;
begin
  if v_badge not in ('founder', 'tester') then
    raise exception using errcode = '22023',
      message = 'Unknown badge: use ''founder'' or ''tester''. (Trainer is revoked by removing the trainer_profiles row from a trusted session.)';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(coalesce(p_email, '')));

  if v_user_id is null then
    raise exception using errcode = '22023',
      message = 'No Bloom account exists for that email address.';
  end if;

  delete from public.member_badges b
  where b.user_id = v_user_id and b.badge = v_badge;
  get diagnostics v_removed = row_count;

  return v_removed > 0;
end;
$$;

comment on function public.admin_revoke_badge(text, text) is
  'Remove one member badge (''founder'' or ''tester'') from the account with this email; returns true when a row was removed, false when the account held none. SERVICE ROLE ONLY — run from a trusted SQL session. There is no UI for this, by owner decision (2026-11-22).';

revoke all on function public.admin_revoke_badge(text, text) from public, anon, authenticated;
grant execute on function public.admin_revoke_badge(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. People search learns the badges — search_profiles restated
-- ---------------------------------------------------------------------------
-- The return shape grows two columns, so the function is dropped and
-- recreated (Postgres cannot change a return type in place). The body
-- is the 20261116 body with exactly two added select expressions; the
-- privacy gate, the caller exclusion, the escaping and the ordering
-- are unchanged.
drop function if exists public.search_profiles(text);

create or replace function public.search_profiles(p_term text)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_path text,
  accent text,
  verified boolean,
  is_trainer boolean,
  badges text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_raw text := lower(trim(coalesce(p_term, '')));
  v_term text;
begin
  /* Search is a signed-in feature, and a one-letter term is a browse,
     not a search — both refuse quietly with no rows. */
  if v_uid is null then
    return;
  end if;
  if length(v_raw) < 2 then
    return;
  end if;

  /* Escape the LIKE wildcards so the term is matched literally. */
  v_term := replace(replace(replace(v_raw, '\', '\\'), '%', '\%'), '_', '\_');

  return query
  select
    p.id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.profile_name), ''),
      'Bloom User'
    ),
    p.username,
    p.avatar_path,
    p.accent,
    exists (
      select 1
      from public.account_verifications v
      where v.user_id = p.id
    ),
    /* The trainer badge's one truth, for someone else: their
       trainer_profiles row exists. */
    exists (
      select 1
      from public.trainer_profiles tp
      where tp.user_id = p.id
    ),
    /* The granted badges (founder/tester), as raw kinds — the client
       derives labels and display order in lib/profile/badges. */
    coalesce(
      (
        select array_agg(mb.badge order by mb.badge)
        from public.member_badges mb
        where mb.user_id = p.id
      ),
      array[]::text[]
    )
  from public.profiles p
  where p.id <> v_uid
    and public.is_profile_bloom_public(p.id)
    and (
      lower(coalesce(p.display_name, '')) like '%' || v_term || '%'
      or lower(coalesce(p.username, '')) like '%' || v_term || '%'
    )
  order by
    (lower(coalesce(p.username, '')) = v_raw) desc,
    lower(coalesce(nullif(trim(p.display_name), ''), p.username, '')) asc
  limit 20;
end;
$$;

comment on function public.search_profiles(text) is
  'People search for signed-in members: up to 20 public profiles whose display name or @username contains the term (min 2 chars). Public fields only; caller excluded; only profiles the owner made public are listed. `verified` is the account_verifications record''s existence — the tick, grant-only since 20261122. `is_trainer` and `badges` (M-209) are the member badges'' public facts: the trainer_profiles row''s existence and the member_badges kinds held.';

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;
