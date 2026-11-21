-- 20261121: trainer referral codes — admin-granted, server-held.
--
-- Owner decisions (2026-11-21, fixed):
--
--   1. Trainer status is ADMIN-GRANTED ONLY. There is no self-claim
--      toggle, no request flow, no UI that grants it. A trainer exists
--      only when the owner grants it from a trusted SQL session, via
--      `admin_grant_trainer(email)` below — the same shape as the
--      rewards single-recipient lock (20261109) and the invite list
--      (20260916): the authority lives in the database, not the client.
--
--   2. Each trainer gets ONE personal referral code, permanent. It is
--      generated server-side at grant time from the unambiguous
--      alphabet the client already uses (lib/trainer/referral.ts: no
--      0/O, no 1/I/L, 8 characters). Re-granting returns the existing
--      code — a grant never rotates it. Changing a code means an
--      admin editing this table from a trusted session, never the UI.
--
--   3. The code is shown ONLY on trainer accounts. The client reads
--      its OWN trainer row (RLS below) and renders the Profile
--      section only when a row exists; for everyone else the query
--      returns nothing and the section is never mounted.
--
--   4. A new member may enter a code in the Welcome flow. Validation
--      and linking happen ONLY through `link_trainer_code(text)` —
--      the client has no write grant on `trainer_links` at all. The
--      FIRST link stands: a second attempt changes nothing.
--
--   5. The trainer's "My clients" list is name + joined date ONLY,
--      exposed ONLY through `my_trainer_clients()`, which returns
--      rows solely when the caller is a trainer. No email, no health
--      data, no progress — the list proves the link exists, nothing
--      more.
--
-- This migration also retires the locally-derived referral code the
-- Trainer & clinician card used to show every signed-in person (a
-- deterministic hash of the account id, computed on-device). That
-- model contradicted decision 1 and 3: anyone could display a code,
-- and no code was connected to any server record. The card keeps its
-- share-summary and proposed-targets features; the code itself now
-- lives only here. See M-171.
--
-- NOTE: this file must be applied to the live project before (or
-- with) the deploy that ships the client side. Until it is applied,
-- the client reads fail closed: no trainer section, and a code
-- entered in Welcome is simply not linked — onboarding never blocks
-- on it.

-- ---------------------------------------------------------------------------
-- 1. The tables
-- ---------------------------------------------------------------------------
create table if not exists public.trainer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  /** The one permanent code. Alphabet matches lib/trainer/referral.ts. */
  code text not null unique check (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$'),
  created_at timestamptz not null default now()
);

comment on table public.trainer_profiles is
  'Admin-granted trainers and their one permanent referral code. Rows are created only by admin_grant_trainer() from a trusted session; no client role may write this table.';

create table if not exists public.trainer_links (
  /** One link per client, ever — the primary key IS the first-link rule. */
  client_user_id uuid primary key references auth.users (id) on delete cascade,
  trainer_user_id uuid not null references auth.users (id) on delete cascade,
  /** The code as entered, normalised — kept so a link can be audited
      against the code that created it even if codes are ever edited. */
  code_used text not null,
  created_at timestamptz not null default now()
);

comment on table public.trainer_links is
  'Client → trainer links created by link_trainer_code(). Written only by that function; a client may read their own link, nobody may read anyone else''s.';

create index if not exists trainer_links_trainer_idx
  on public.trainer_links (trainer_user_id, created_at);

alter table public.trainer_profiles enable row level security;
alter table public.trainer_links enable row level security;

-- Read-own only. There are deliberately no insert/update/delete
-- policies and no write grants: every write goes through the
-- SECURITY DEFINER functions below, which is what makes the
-- first-link rule and the grant rule unbypassable from the client.
drop policy if exists "trainer_profiles self select" on public.trainer_profiles;
create policy "trainer_profiles self select"
  on public.trainer_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "trainer_links self select" on public.trainer_links;
create policy "trainer_links self select"
  on public.trainer_links
  for select
  to authenticated
  using (client_user_id = auth.uid());

revoke all on public.trainer_profiles from anon;
revoke all on public.trainer_links from anon;
grant select on public.trainer_profiles to authenticated;
grant select on public.trainer_links to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Code generation (internal — never callable by a client role)
-- ---------------------------------------------------------------------------
create or replace function public.generate_trainer_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text := '';
  i int;
begin
  for i in 1..8 loop
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;
  return v_code;
end;
$$;

comment on function public.generate_trainer_code() is
  'Internal: one random 8-character code from the unambiguous alphabet. Uniqueness is enforced by the trainer_profiles.code constraint and the retry in admin_grant_trainer().';

revoke all on function public.generate_trainer_code() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. The grant — service role only, no UI, ever
-- ---------------------------------------------------------------------------
create or replace function public.admin_grant_trainer(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_code text;
  v_attempt int;
begin
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(coalesce(p_email, '')));

  if v_user_id is null then
    raise exception using errcode = '22023',
      message = 'No Bloom account exists for that email address.';
  end if;

  /* Already a trainer: the code is permanent, so hand back the one
     that exists. A grant is idempotent and never rotates a code. */
  select tp.code into v_code
  from public.trainer_profiles tp
  where tp.user_id = v_user_id;
  if v_code is not null then
    return v_code;
  end if;

  /* Generate-and-insert with a retry: a collision on the unique code
     is astronomically unlikely (31^8) but must not fail a grant. */
  for v_attempt in 1..10 loop
    begin
      v_code := public.generate_trainer_code();
      insert into public.trainer_profiles (user_id, code)
      values (v_user_id, v_code);
      return v_code;
    exception when unique_violation then
      /* Lost the race on the code (retry with a fresh one) or on the
         user (a concurrent grant won — return its code). */
      select tp.code into v_code
      from public.trainer_profiles tp
      where tp.user_id = v_user_id;
      if v_code is not null then
        return v_code;
      end if;
    end;
  end loop;

  raise exception using errcode = '40001',
    message = 'Could not generate a unique trainer code; try the grant again.';
end;
$$;

comment on function public.admin_grant_trainer(text) is
  'Grant trainer status to the account with this email and return their permanent referral code. SERVICE ROLE ONLY — run from a trusted SQL session: select public.admin_grant_trainer(''name@example.com''); There is no UI for this, by owner decision (2026-11-21).';

revoke all on function public.admin_grant_trainer(text) from public, anon, authenticated;
grant execute on function public.admin_grant_trainer(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Linking — the only door from a typed code to a link
-- ---------------------------------------------------------------------------
create or replace function public.link_trainer_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_trainer uuid;
begin
  if v_uid is null then
    raise exception using errcode = '42501', message = 'Sign in first.';
  end if;

  /* Normalise exactly as the client does (lib/trainer/referral.ts):
     any case, spaces and hyphens ignored, optional BLOOM- prefix. */
  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  if left(v_code, 5) = 'BLOOM' and length(v_code) = 13 then
    v_code := substr(v_code, 6);
  end if;

  /* The first link stands. Whatever this attempt carries — valid,
     invalid, even the same code again — an existing link is the
     answer, and nothing is re-linked or silently replaced. */
  if exists (select 1 from public.trainer_links l where l.client_user_id = v_uid) then
    return 'already_linked';
  end if;

  select tp.user_id into v_trainer
  from public.trainer_profiles tp
  where tp.code = v_code;

  if v_trainer is null then
    /* A clean, expected refusal — the Welcome flow turns this into
       one gentle line and carries on. No hint about which part of
       the code was wrong. */
    raise exception using errcode = 'P0002', message = 'Trainer code not recognised.';
  end if;

  if v_trainer = v_uid then
    raise exception using errcode = '22023', message = 'That is your own trainer code.';
  end if;

  begin
    insert into public.trainer_links (client_user_id, trainer_user_id, code_used)
    values (v_uid, v_trainer, v_code);
  exception when unique_violation then
    /* A concurrent first link won the race; it stands. */
    return 'already_linked';
  end;

  return 'linked';
end;
$$;

comment on function public.link_trainer_code(text) is
  'Link the signed-in caller to the trainer whose code this is. Returns ''linked'' or ''already_linked'' (the first link always stands). Raises P0002 for an unrecognised code, 22023 for the caller''s own code, 42501 when signed out.';

revoke all on function public.link_trainer_code(text) from public;
grant execute on function public.link_trainer_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. The clients list — name + joined date, trainers only
-- ---------------------------------------------------------------------------
create or replace function public.my_trainer_clients()
returns table (display_name text, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  /* Not signed in, or not a trainer: no rows. The function does not
     distinguish the two — the list is simply not yours to see. */
  if v_uid is null then
    return;
  end if;
  if not exists (select 1 from public.trainer_profiles tp where tp.user_id = v_uid) then
    return;
  end if;

  return query
  select
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.profile_name), ''),
      nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      'Bloom User'
    )::text,
    l.created_at
  from public.trainer_links l
  join auth.users u on u.id = l.client_user_id
  left join public.profiles p on p.id = l.client_user_id
  where l.trainer_user_id = v_uid
  order by l.created_at asc;
end;
$$;

comment on function public.my_trainer_clients() is
  'The caller''s clients: display name + the date they linked, oldest first. Rows only when the caller is an admin-granted trainer. Name and date are the whole payload, by owner decision (2026-11-21).';

revoke all on function public.my_trainer_clients() from public;
grant execute on function public.my_trainer_clients() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Erasure — erase_my_data() restated with the trainer tables covered
-- ---------------------------------------------------------------------------
-- The full function is restated (the house pattern: 20260917, 20261113,
-- 20261118) with exactly two additions, in the account block: a person's
-- trainer_links go when EITHER side of the link erases, and their
-- trainer_profiles row goes with the rest of the account.
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

  -- ---- trainer referral ---------------------------------------------------
  -- Links first: a link names two people, and either side's erasure ends it.
  if to_regclass('public.trainer_links') is not null then
    delete from public.trainer_links where client_user_id = uid or trainer_user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('trainer_links', n);
  end if;

  if to_regclass('public.trainer_profiles') is not null then
    delete from public.trainer_profiles where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('trainer_profiles', n);
  end if;

  -- ---- billing ------------------------------------------------------------
  -- The Money System record is per-person data too: the subscription,
  -- the credit balance and the append-only credit ledger all go. (The
  -- ledger is append-only against every client role, but erase is the
  -- person's own deletion right and this definer function is its path.)
  if to_regclass('public.ai_credit_ledger') is not null then
    delete from public.ai_credit_ledger where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('ai_credit_ledger', n);
  end if;

  if to_regclass('public.ai_credit_balances') is not null then
    delete from public.ai_credit_balances where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('ai_credit_balances', n);
  end if;

  if to_regclass('public.subscriptions') is not null then
    delete from public.subscriptions where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('subscriptions', n);
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
  'Erases every per-person row for the signed-in caller and returns per-table counts. Restated 20261121 to cover trainer_links and trainer_profiles.';
