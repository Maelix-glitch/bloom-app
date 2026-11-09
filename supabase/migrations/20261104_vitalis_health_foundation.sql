-- Bloom Vitalis — Phase 1 domain foundation.
--
-- Additive only. No existing table, policy, function or row is altered, except
-- `erase_my_data()`, which is redefined so account erasure also removes the new
-- health tables. Without that redefinition `eraseCoverage.test.ts` would (quite
-- correctly) fail: the new tables hold per-person rows.
--
-- Five tables:
--   health_profiles        stable attributes (units, age, sex, goal, activity,
--                          rate, diet, constraints) — one row per person
--   health_observations    a time series; every value carries its unit, its
--                          source and when it was true
--   health_consents        one row per (person, purpose), with the policy
--                          version the person actually agreed to
--   health_safety_events   append-only record of safety classifications
--   health_audit_events    append-only record of writes made through the RPCs
--
-- Access model:
--   • RLS on every table, always scoped to auth.uid() = user_id.
--   • profiles / observations / consents: the owner may read and write their
--     own rows directly.
--   • safety_events / audit_events: the owner may SELECT their own rows and
--     nothing else. Only the SECURITY DEFINER functions below may write them,
--     so the audit trail cannot be edited or forged by a client.
--
-- Three RPCs, each with one job:
--   health_record_observation(...)     validated append of one measurement
--   health_set_consent(...)            validated upsert of one consent purpose
--   health_record_safety_event(...)    validated append of one classification
--
-- Each function: fixed search_path, auth.uid() required, input allowlists,
-- ownership derived from auth.uid() (never from an argument), a single
-- transaction (plpgsql function scope), and an audit row written in the same
-- transaction. Execute is revoked from PUBLIC and anon, granted only to
-- authenticated. None of them can touch another user's rows and none is a
-- general-purpose RLS bypass.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.health_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version integer not null default 1 check (version = 1),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  age_years smallint check (age_years is null or age_years between 13 and 110),
  sex text not null default 'unspecified' check (sex in ('female', 'male', 'unspecified')),
  goal text not null default 'general_health'
    check (goal in ('lose', 'maintain', 'gain', 'recomp', 'general_health')),
  activity text
    check (activity is null or activity in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  rate_kg_per_week numeric(4, 2) not null default 0.50 check (rate_kg_per_week between 0 and 2),
  dietary jsonb not null default '{}'::jsonb check (jsonb_typeof(dietary) = 'object'),
  health_constraints jsonb not null default '{}'::jsonb check (jsonb_typeof(health_constraints) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.health_observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null
    check (kind in ('weight', 'height', 'waist', 'target_weight', 'body_fat', 'resting_heart_rate')),
  value numeric not null check (value > 0 and value < 100000),
  unit text not null check (unit in ('kg', 'lb', 'g', 'cm', 'm', 'in', 'percent', 'bpm')),
  source text not null
    check (source in ('user_reported', 'measured', 'calculated', 'estimated', 'imported', 'unknown')),
  quality text check (quality is null or quality in ('high', 'medium', 'low', 'unknown')),
  confidence numeric(3, 2) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  method text check (method is null or char_length(method) between 1 and 80),
  method_version text check (method_version is null or char_length(method_version) between 1 and 40),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (recorded_at <= now() + interval '1 day')
);

create index if not exists health_observations_user_kind_idx
  on public.health_observations (user_id, kind, recorded_at desc);

create table if not exists public.health_consents (
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null
    check (purpose in ('health_data_processing', 'sensitive_health_processing', 'ai_assistance', 'caregiver_sharing')),
  granted boolean not null,
  policy_version text not null check (char_length(policy_version) between 1 and 64),
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, purpose)
);

create table if not exists public.health_safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  classification text not null
    check (classification in ('standard', 'caution', 'professional_review_required', 'urgent_escalation')),
  findings jsonb not null default '[]'::jsonb check (jsonb_typeof(findings) = 'array'),
  rules_version text not null check (char_length(rules_version) between 1 and 40),
  recorded_at timestamptz not null default now()
);

create index if not exists health_safety_events_user_idx
  on public.health_safety_events (user_id, recorded_at desc);

create table if not exists public.health_audit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (char_length(action) between 1 and 80),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists health_audit_events_user_idx
  on public.health_audit_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.health_profiles enable row level security;
alter table public.health_observations enable row level security;
alter table public.health_consents enable row level security;
alter table public.health_safety_events enable row level security;
alter table public.health_audit_events enable row level security;

create policy health_profiles_owner_select on public.health_profiles
  for select to authenticated using (auth.uid() = user_id);
create policy health_profiles_owner_insert on public.health_profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy health_profiles_owner_update on public.health_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy health_profiles_owner_delete on public.health_profiles
  for delete to authenticated using (auth.uid() = user_id);

create policy health_observations_owner_select on public.health_observations
  for select to authenticated using (auth.uid() = user_id);
create policy health_observations_owner_insert on public.health_observations
  for insert to authenticated with check (auth.uid() = user_id);
create policy health_observations_owner_update on public.health_observations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy health_observations_owner_delete on public.health_observations
  for delete to authenticated using (auth.uid() = user_id);

create policy health_consents_owner_select on public.health_consents
  for select to authenticated using (auth.uid() = user_id);
create policy health_consents_owner_insert on public.health_consents
  for insert to authenticated with check (auth.uid() = user_id);
create policy health_consents_owner_update on public.health_consents
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy health_consents_owner_delete on public.health_consents
  for delete to authenticated using (auth.uid() = user_id);

-- Read-only to their owner. No insert/update/delete policy exists, so a client
-- cannot write these tables; the definer functions below are the only writers.
create policy health_safety_events_owner_select on public.health_safety_events
  for select to authenticated using (auth.uid() = user_id);

create policy health_audit_events_owner_select on public.health_audit_events
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RPC: record one measurement
-- ---------------------------------------------------------------------------

create or replace function public.health_record_observation(
  p_kind text,
  p_value numeric,
  p_unit text,
  p_source text,
  p_recorded_at timestamptz default now(),
  p_method text default null,
  p_method_version text default null,
  p_confidence numeric default null,
  p_quality text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'health_record_observation() requires a signed-in user' using errcode = '42501';
  end if;

  if p_kind is null or p_kind not in
    ('weight', 'height', 'waist', 'target_weight', 'body_fat', 'resting_heart_rate') then
    raise exception 'unsupported observation kind: %', coalesce(p_kind, '(null)') using errcode = '22023';
  end if;

  if p_value is null or p_value <> p_value or p_value <= 0 or p_value >= 100000 then
    raise exception 'observation value must be a positive number below 100000' using errcode = '22023';
  end if;

  if p_unit is null or p_unit not in ('kg', 'lb', 'g', 'cm', 'm', 'in', 'percent', 'bpm') then
    raise exception 'unsupported observation unit: %', coalesce(p_unit, '(null)') using errcode = '22023';
  end if;

  if p_source is null or p_source not in
    ('user_reported', 'measured', 'calculated', 'estimated', 'imported', 'unknown') then
    raise exception 'unsupported observation source: %', coalesce(p_source, '(null)') using errcode = '22023';
  end if;

  if p_quality is not null and p_quality not in ('high', 'medium', 'low', 'unknown') then
    raise exception 'unsupported observation quality: %', p_quality using errcode = '22023';
  end if;

  if p_confidence is not null and (p_confidence < 0 or p_confidence > 1) then
    raise exception 'confidence must be between 0 and 1' using errcode = '22023';
  end if;

  if p_method is not null and (char_length(p_method) < 1 or char_length(p_method) > 80) then
    raise exception 'method must be 1–80 characters' using errcode = '22023';
  end if;

  if p_method_version is not null and (char_length(p_method_version) < 1 or char_length(p_method_version) > 40) then
    raise exception 'method_version must be 1–40 characters' using errcode = '22023';
  end if;

  if p_recorded_at is null then
    raise exception 'recorded_at is required' using errcode = '22023';
  end if;

  if p_recorded_at > now() + interval '1 day' then
    raise exception 'recorded_at cannot be in the future' using errcode = '22023';
  end if;

  insert into public.health_observations
    (user_id, kind, value, unit, source, quality, confidence, method, method_version, recorded_at)
  values
    (uid, p_kind, p_value, p_unit, p_source, p_quality, p_confidence, p_method, p_method_version, p_recorded_at)
  returning id into new_id;

  insert into public.health_audit_events (user_id, action, detail)
  values (
    uid,
    'health.observation.recorded',
    jsonb_build_object('observation_id', new_id, 'kind', p_kind, 'unit', p_unit, 'source', p_source)
  );

  return new_id;
end;
$$;

revoke all on function public.health_record_observation(text, numeric, text, text, timestamptz, text, text, numeric, text) from public;
revoke all on function public.health_record_observation(text, numeric, text, text, timestamptz, text, text, numeric, text) from anon;
grant execute on function public.health_record_observation(text, numeric, text, text, timestamptz, text, text, numeric, text) to authenticated;

comment on function public.health_record_observation(text, numeric, text, text, timestamptz, text, text, numeric, text) is
  'Appends one measurement for auth.uid() after validating kind, value, unit, source, quality, confidence, method and recorded_at. Writes an audit row in the same transaction. Cannot address another user.';

-- ---------------------------------------------------------------------------
-- RPC: record one consent decision
-- ---------------------------------------------------------------------------

create or replace function public.health_set_consent(
  p_purpose text,
  p_granted boolean,
  p_policy_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  row_out public.health_consents;
begin
  if uid is null then
    raise exception 'health_set_consent() requires a signed-in user' using errcode = '42501';
  end if;

  if p_purpose is null or p_purpose not in
    ('health_data_processing', 'sensitive_health_processing', 'ai_assistance', 'caregiver_sharing') then
    raise exception 'unsupported consent purpose: %', coalesce(p_purpose, '(null)') using errcode = '22023';
  end if;

  if p_granted is null then
    raise exception 'p_granted is required' using errcode = '22023';
  end if;

  if p_policy_version is null or char_length(p_policy_version) < 1 or char_length(p_policy_version) > 64 then
    raise exception 'policy_version must be 1–64 characters' using errcode = '22023';
  end if;

  insert into public.health_consents
    (user_id, purpose, granted, policy_version, granted_at, revoked_at, updated_at)
  values (
    uid,
    p_purpose,
    p_granted,
    p_policy_version,
    case when p_granted then now() else null end,
    case when p_granted then null else now() end,
    now()
  )
  on conflict (user_id, purpose) do update
    set granted = excluded.granted,
        policy_version = excluded.policy_version,
        granted_at = case when excluded.granted then now() else public.health_consents.granted_at end,
        revoked_at = case when excluded.granted then null else now() end,
        updated_at = now()
  returning * into row_out;

  insert into public.health_audit_events (user_id, action, detail)
  values (
    uid,
    case when p_granted then 'health.consent.granted' else 'health.consent.withdrawn' end,
    jsonb_build_object('purpose', p_purpose, 'policy_version', p_policy_version)
  );

  return jsonb_build_object(
    'user_id', row_out.user_id,
    'purpose', row_out.purpose,
    'granted', row_out.granted,
    'policy_version', row_out.policy_version,
    'updated_at', row_out.updated_at
  );
end;
$$;

revoke all on function public.health_set_consent(text, boolean, text) from public;
revoke all on function public.health_set_consent(text, boolean, text) from anon;
grant execute on function public.health_set_consent(text, boolean, text) to authenticated;

comment on function public.health_set_consent(text, boolean, text) is
  'Grants or withdraws one consent purpose for auth.uid(), recording the policy version actually shown. Upserts one row and writes an audit row in the same transaction.';

-- ---------------------------------------------------------------------------
-- RPC: record one safety classification
-- ---------------------------------------------------------------------------

create or replace function public.health_record_safety_event(
  p_classification text,
  p_findings jsonb,
  p_rules_version text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
begin
  if uid is null then
    raise exception 'health_record_safety_event() requires a signed-in user' using errcode = '42501';
  end if;

  if p_classification is null or p_classification not in
    ('standard', 'caution', 'professional_review_required', 'urgent_escalation') then
    raise exception 'unsupported safety classification: %', coalesce(p_classification, '(null)') using errcode = '22023';
  end if;

  if p_findings is null or jsonb_typeof(p_findings) <> 'array' then
    raise exception 'findings must be a JSON array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_findings) > 20 then
    raise exception 'at most 20 findings may be recorded' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_findings) as finding
    where jsonb_typeof(finding) <> 'object'
       or not (finding ? 'ruleId')
       or not (finding ? 'classification')
  ) then
    raise exception 'each finding must be an object with ruleId and classification' using errcode = '22023';
  end if;

  if p_rules_version is null or char_length(p_rules_version) < 1 or char_length(p_rules_version) > 40 then
    raise exception 'rules_version must be 1–40 characters' using errcode = '22023';
  end if;

  insert into public.health_safety_events (user_id, classification, findings, rules_version)
  values (uid, p_classification, p_findings, p_rules_version)
  returning id into new_id;

  insert into public.health_audit_events (user_id, action, detail)
  values (
    uid,
    'health.safety.classified',
    jsonb_build_object(
      'safety_event_id', new_id,
      'classification', p_classification,
      'rules_version', p_rules_version
    )
  );

  return new_id;
end;
$$;

revoke all on function public.health_record_safety_event(text, jsonb, text) from public;
revoke all on function public.health_record_safety_event(text, jsonb, text) from anon;
grant execute on function public.health_record_safety_event(text, jsonb, text) to authenticated;

comment on function public.health_record_safety_event(text, jsonb, text) is
  'Appends one safety classification for auth.uid() after validating the class, the findings array shape and the rules version. Append-only: no client may update or delete it.';

-- ---------------------------------------------------------------------------
-- Account erasure, extended to the Vitalis tables
-- ---------------------------------------------------------------------------
--
-- Reproduced in full because plpgsql has no way to append to an existing body.
-- Every prior delete and its ordering rules are unchanged; the Vitalis block is
-- the only addition, placed before the account row is removed. `to_regclass`
-- guards mean the function still installs on a project missing any table, and
-- every delete is scoped to auth.uid().

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

  if to_regclass('public.stories') is not null then
    delete from public.stories where owner_id = uid;
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

  if to_regclass('public.reward_assignments') is not null then
    delete from public.reward_assignments where profile_id = uid;
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

  -- Push subscriptions hold a per-person endpoint. This delete was missing from
  -- every earlier erase_my_data(); the coverage test could not report it while
  -- its path handling failed on Windows. Fixed here rather than reproduced.
  if to_regclass('public.push_subscriptions') is not null then
    delete from public.push_subscriptions where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('push_subscriptions', n);
  end if;

  -- ---- uploaded media ------------------------------------------------------
  if to_regclass('storage.objects') is not null then
    delete from storage.objects
    where bucket_id = 'profile-media'
      and storage.foldername(name) = uid::text;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('media', n);
  end if;

  if to_regclass('public.profiles') is not null then
    delete from public.profiles where id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('profiles', n);
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
  'Deletes every row belonging to auth.uid() across all of Bloom''s per-person tables (including the Vitalis health tables), its storage objects, and (where permitted) the auth user. Returns a per-table count. Global reference tables (reward_items, bloom_ranks, app_admins, app_invites) are intentionally untouched.';
