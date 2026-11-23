-- 20261123: erase_my_data() restated for Autopay subscription tracking (M-222).
--
-- The companion to 20261123_billing_autopay.sql. Every migration that
-- adds a per-person table owes the erase function a delete for it —
-- the house pattern (20260917, 20261113, 20261118, 20261121, 20261122),
-- pinned by src/lib/data/eraseCoverage.test.ts, which derives the
-- per-person table set from the migrations and requires the NEWEST
-- erase definition to delete from each one, uid-scoped.
--
-- The restatement lives in its own file for the same mechanical
-- reason as 20261122's: the coverage check reads the newest
-- erase-defining file whole and requires every `delete from public.…`
-- in it to be scoped `= uid`. The body below is the 20261122
-- restatement verbatim plus exactly one block: the
-- billing_subscriptions delete in the billing block, beside the
-- entitlement row's. (billing_subscriptions also cascades from
-- auth.users, but the explicit delete is what reports the count — and
-- it runs even in the path where the final auth-row delete cannot.)
-- billing_plans, the migration's other table, is a global provider
-- registry with no per-person rows and is deliberately absent here.

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

  -- The granted member badges are per-person rows too (M-209): they go
  -- with the account, like the verification record above.
  if to_regclass('public.member_badges') is not null then
    delete from public.member_badges where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('member_badges', n);
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

  -- The Autopay lifecycle record is per-person data too (M-222): the
  -- provider subscription id, its plan and its status go with the
  -- account, beside the entitlement row above.
  if to_regclass('public.billing_subscriptions') is not null then
    delete from public.billing_subscriptions where user_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('billing_subscriptions', n);
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
  'Erases every per-person row for the signed-in caller and returns per-table counts. Restated 20261123 to cover billing_subscriptions (M-222); otherwise the 20261122 restatement verbatim.';
