-- Bloom — account verification: the blue tick, granted by invitation only.
--
-- Slice S3 (2026-11-14) introduced the blue tick as a purely DERIVED client
-- status: confirmed email + a real name and @username, computed fresh on
-- every render, with no stored record and no knowledge of the invite list.
-- The owner directed (2026-11-15) that verification become a proper step of
-- its own — done ONLY BY INVITES, with the table and everything set in
-- Supabase. This migration is that step:
--
--   1. `public.account_verifications` — one row per verified person. The
--      row IS the tick: no row, no tick, whatever the profile looks like.
--      Clients may read only their own row; no client role can insert,
--      update or delete — records are granted exclusively by the function
--      below (and by trusted SQL sessions, like app_invites itself).
--
--   2. `public.claim_account_verification()` — SECURITY DEFINER, the only
--      grant path. It records the caller ONLY when every gate holds:
--        (a) the account email is on `public.app_invites` — the owner's
--            core rule: verification is by invitation only;
--        (b) the auth user's email is confirmed (email_confirmed_at set);
--        (c) the profile carries a real display name (not the "Bloom User"
--            placeholder) and a @username.
--      It returns the caller's row after the attempt — empty when any gate
--      fails, with no reason leaked, the same boolean-only discretion as
--      is_email_invited.
--
--   3. `public.erase_my_data()` — restated below as the verified 20261113
--      body plus the account_verifications delete, so "erase everything"
--      covers the verification record too — and with three execution
--      corrections proven necessary by running the old body end-to-end on
--      the disposable project (each failure rolled the ENTIRE erasure
--      back, so the function could never complete): stories keys by
--      author_id, not owner_id; reward_assignments keys by user_id, not
--      profile_id (masked behind the first failure); and the storage
--      delete needs the transaction-local storage.allow_delete_query
--      setting that storage.protect_delete() documents as its escape
--      hatch. Fixing these is part of this slice, not scope creep: the
--      account_verifications delete sits after all three failure points,
--      so without them the new coverage would never execute either.
--
-- Existing members who already qualify are NOT backfilled here: the
-- backfill is a separate one-off insert...select applied with the live
-- rollout, so this file stays a pure schema change. Anyone it misses is
-- granted on their next sign-in anyway — the client calls the claim
-- function whenever the steps pass and no record exists yet.

-- ---------------------------------------------------------------------------
-- 1. The record
-- ---------------------------------------------------------------------------
create table public.account_verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null,
  verified_at timestamptz not null default now(),
  method text not null default 'invite' check (method in ('invite')),
  invite_created_at timestamptz
);

comment on table public.account_verifications is
  'One row per verified person. The row is the blue tick: granted only through claim_account_verification() (invite-gated) or a trusted SQL session. Clients may select only their own row.';

alter table public.account_verifications enable row level security;

-- No client writes, ever: revoke everything, then give back exactly the
-- one read the badge needs — the caller's own row, fenced by the policy.
revoke all on public.account_verifications from anon, authenticated;
grant select on public.account_verifications to authenticated;

create policy account_verifications_select_own
  on public.account_verifications
  for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. The only grant path
-- ---------------------------------------------------------------------------
create or replace function public.claim_account_verification()
returns setof public.account_verifications
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  v_invite_created_at timestamptz;
  v_display_name text;
  v_username text;
begin
  if v_uid is null then
    return;
  end if;

  select u.email, u.email_confirmed_at
    into v_email, v_confirmed
  from auth.users u
  where u.id = v_uid;

  -- Gate (b): the email must be confirmed, not merely supplied.
  if v_email is null or v_confirmed is null then
    return;
  end if;

  -- Gate (a): invitation only. app_invites stores the address lowercased
  -- and trimmed (its own primary-key check enforces it).
  select i.created_at
    into v_invite_created_at
  from public.app_invites i
  where i.email = lower(trim(v_email));

  if v_invite_created_at is null then
    return;
  end if;

  -- Gate (c): a real name and a handle. A profile row that was never saved
  -- reads back as the "Bloom User" placeholder — the absence of a name,
  -- not a name.
  select p.display_name, p.username
    into v_display_name, v_username
  from public.profiles p
  where p.id = v_uid;

  if coalesce(trim(v_display_name), '') = ''
     or trim(v_display_name) = 'Bloom User'
     or coalesce(trim(v_username), '') = '' then
    return;
  end if;

  insert into public.account_verifications (user_id, email, method, invite_created_at)
  values (v_uid, lower(trim(v_email)), 'invite', v_invite_created_at)
  on conflict (user_id) do nothing;

  return query
  select v.*
  from public.account_verifications v
  where v.user_id = v_uid;
end;
$$;

comment on function public.claim_account_verification() is
  'Grants the caller''s verification record when — and only when — their email is on app_invites, their email is confirmed, and their profile has a real name and a @username. Returns the caller''s row, or no rows when any gate fails. The only client-reachable grant path.';

revoke all on function public.claim_account_verification() from public;
grant execute on function public.claim_account_verification() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Erasure covers the record (20261113 body verbatim + the one delete)
-- ---------------------------------------------------------------------------
create or replace function public.erase_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  uid uuid := auth.uid();
  removed jsonb := '{}'::jsonb;
  n bigint;
begin
  if uid is null then
    raise exception 'erase_my_data() must be called by a signed-in user';
  end if;

  -- ---- vitalis health record ----------------------------------------------
  if to_regclass('public.health_safety_events') is not null then
    delete from public.health_safety_events where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_safety_events', n);
  end if;

  if to_regclass('public.health_audit_events') is not null then
    delete from public.health_audit_events where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_audit_events', n);
  end if;

  if to_regclass('public.health_consents') is not null then
    delete from public.health_consents where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_consents', n);
  end if;

  if to_regclass('public.health_observations') is not null then
    delete from public.health_observations where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_observations', n);
  end if;

  if to_regclass('public.health_profiles') is not null then
    delete from public.health_profiles where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('health_profiles', n);
  end if;

  -- Editorial membership is a per-person row too. Revoking it does not touch the
  -- append-only lifecycle log, which keeps the actor uuid as attribution.
  if to_regclass('public.evidence_editors') is not null then
    delete from public.evidence_editors where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('evidence_editors', n);
  end if;

  -- ---- the logs -----------------------------------------------------------
  if to_regclass('public.habit_logs') is not null then
    delete from public.habit_logs where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('habit_logs', n);
  end if;

  if to_regclass('public.habits') is not null then
    delete from public.habits where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('habits', n);
  end if;

  if to_regclass('public.tracker_days') is not null then
    delete from public.tracker_days where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('tracker_days', n);
  end if;

  if to_regclass('public.mood_entries') is not null then
    delete from public.mood_entries where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('mood_entries', n);
  end if;

  -- ---- the cycle ----------------------------------------------------------
  if to_regclass('public.cycle_periods') is not null then
    delete from public.cycle_periods where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('cycle_periods', n);
  end if;

  if to_regclass('public.cycle_entries') is not null then
    delete from public.cycle_entries where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('cycle_entries', n);
  end if;

  if to_regclass('public.cycle_state') is not null then
    delete from public.cycle_state where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('cycle_state', n);
  end if;

  -- ---- the coach ----------------------------------------------------------
  if to_regclass('public.coach_messages') is not null then
    delete from public.coach_messages where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('coach_messages', n);
  end if;

  if to_regclass('public.coach_memory') is not null then
    delete from public.coach_memory where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('coach_memory', n);
  end if;

  -- ---- stories ------------------------------------------------------------
  -- Interactions first: these reference a story, so they must go before it.
  if to_regclass('public.story_reactions') is not null then
    delete from public.story_reactions where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_reactions', n);
  end if;

  if to_regclass('public.story_replies') is not null then
    delete from public.story_replies where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_replies', n);
  end if;

  if to_regclass('public.story_poll_votes') is not null then
    delete from public.story_poll_votes where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_poll_votes', n);
  end if;

  if to_regclass('public.story_views') is not null then
    delete from public.story_views where viewer_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_views', n);
  end if;

  if to_regclass('public.story_gifts') is not null then
    delete from public.story_gifts where sender_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_gifts', n);
  end if;

  if to_regclass('public.story_settings') is not null then
    delete from public.story_settings where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_settings', n);
  end if;

  if to_regclass('public.close_friends') is not null then
    delete from public.close_friends where owner_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('close_friends', n);
  end if;

  if to_regclass('public.story_highlight_items') is not null then
    delete from public.story_highlight_items
    where highlight_id in (select id from public.story_highlights where owner_id = uid);
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_highlight_items', n);
  end if;

  if to_regclass('public.story_highlights') is not null then
    delete from public.story_highlights where owner_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('story_highlights', n);
  end if;

  -- Column correction (audit 2026-11-15, proven by executing the previous
  -- body on the disposable project): stories keys its author as
  -- `author_id` on every real project, not `owner_id` — the old line threw
  -- 42703 at this step and rolled the whole erasure back, so nothing after
  -- it (including the account_verifications delete below) ever ran.
  if to_regclass('public.stories') is not null then
    delete from public.stories where author_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('stories', n);
  end if;

  -- ---- progression --------------------------------------------------------
  if to_regclass('public.point_transactions') is not null then
    delete from public.point_transactions where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('point_transactions', n);
  end if;

  if to_regclass('public.goal_awards') is not null then
    delete from public.goal_awards where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('goal_awards', n);
  end if;

  if to_regclass('public.rank_history') is not null then
    delete from public.rank_history where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('rank_history', n);
  end if;

  if to_regclass('public.user_achievements') is not null then
    delete from public.user_achievements where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('user_achievements', n);
  end if;

  -- Column correction (same audit): reward_assignments keys by `user_id`
  -- on every real project, not `profile_id` — this line was the second
  -- masked failure, reached only once the stories line above was fixed.
  if to_regclass('public.reward_assignments') is not null then
    delete from public.reward_assignments where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('reward_assignments', n);
  end if;

  -- ---- identity and settings ----------------------------------------------
  if to_regclass('public.profile_privacy') is not null then
    delete from public.profile_privacy where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('profile_privacy', n);
  end if;

  if to_regclass('public.user_prefs') is not null then
    delete from public.user_prefs where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('user_prefs', n);
  end if;

  -- The verification record is a per-person row too: erasing the account
  -- must not leave a "verified" shell behind. (It also cascades from
  -- profiles, but the explicit delete is what reports the count.)
  if to_regclass('public.account_verifications') is not null then
    delete from public.account_verifications where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('account_verifications', n);
  end if;


  -- ---- push ---------------------------------------------------------------
  if to_regclass('public.push_subscriptions') is not null then
    delete from public.push_subscriptions where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('push_subscriptions', n);
  end if;
  -- ---- uploaded media ------------------------------------------------------
  -- Correction (same audit): storage.protect_delete() refuses direct SQL
  -- deletes from storage.objects on current Supabase unless the caller
  -- sets storage.allow_delete_query for the transaction — the function's
  -- own documented escape hatch. Without it this step threw 42501 and,
  -- like the column errors above, rolled the whole erasure back.
  if to_regclass('storage.objects') is not null then
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects
    where bucket_id = 'profile-media'
      and (storage.foldername(name))[1] = uid::text;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('media', n);
  end if;

  if to_regclass('public.profiles') is not null then
    delete from public.profiles where id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('profiles', n);
  end if;

  -- ---- telemetry ---------------------------------------------------------
  if to_regclass('public.client_errors') is not null then
    delete from public.client_errors where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('client_errors', n);
  end if;

  -- ---- the account itself, last -------------------------------------------
  begin
    delete from auth.users where id = uid;
    removed := removed || jsonb_build_object('account', true);
  exception
    when insufficient_privilege or others then
      -- Everything belonging to this person is already gone; the login row
      -- stays until it is removed from the dashboard. Reported, not hidden.
      removed := removed || jsonb_build_object('account', false);
  end;

  return removed;
end;
$$;

revoke all on function public.erase_my_data() from public;
grant execute on function public.erase_my_data() to authenticated;

comment on function public.erase_my_data() is
  'Deletes every row belonging to auth.uid() across all of Bloom''s per-person tables (including the Vitalis health tables, evidence editor membership and the account verification record), its storage objects, and (where permitted) the auth user. Returns a per-table count. Global reference tables (reward_items, bloom_ranks, app_admins, app_invites) are intentionally untouched, as is the append-only evidence lifecycle log.';
