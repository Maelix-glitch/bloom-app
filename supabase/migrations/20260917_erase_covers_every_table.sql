-- "Erase everything" was leaving most of the record behind.
--
-- `public.erase_my_data()` (20260910_erase_account.sql) deleted from 16 tables.
-- Bloom has 31. Auditing the difference, eleven of the omitted tables hold rows
-- that belong to a person:
--
--   close_friends      owner_id    who they let see their close-friends stories
--   story_reactions    user_id     every reaction they left on someone's story
--   story_replies      user_id     every reply they wrote
--   story_poll_votes   user_id     how they voted
--   story_views        viewer_id   which stories they opened
--   story_gifts        sender_id   gifts they sent
--   story_settings     user_id     their replies/audience preferences
--   point_transactions profile_id  their points ledger
--   goal_awards        profile_id  goals they completed
--   rank_history       profile_id  their rank progression
--   user_achievements  profile_id  achievements they earned
--
-- So a person who pressed "Erase everything" and was told "Everything has been
-- erased." still had their close-friends list, their reply history and their
-- viewing history on the server. That is a privacy failure, not a tidiness
-- one — and both app stores require account deletion to actually delete the
-- account's data.
--
-- `reward_items`, `bloom_ranks`, `app_admins` and `app_invites` are
-- deliberately still excluded: they are global reference and access control,
-- with no per-person rows.
--
-- The function is replaced rather than patched because plpgsql has no way to
-- append a statement to an existing body. Every delete keeps the two rules the
-- original established: `to_regclass` guards, so it still installs on a
-- project missing tables, and `auth.uid()` scoping, so the caller can only ever
-- delete their own rows.

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

  -- ---- uploaded media ------------------------------------------------------
  if to_regclass('storage.objects') is not null then
    delete from storage.objects
    where bucket_id = 'profile-media'
      and (storage.foldername(name))[1] = uid::text;
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
  'Deletes every row belonging to auth.uid() across all of Bloom''s per-person tables, its storage objects, and (where permitted) the auth user. Returns a per-table count. Global reference tables (reward_items, bloom_ranks, app_admins, app_invites) are intentionally untouched.';
