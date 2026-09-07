-- Tier B · B9 — "delete my account / erase everything".
--
-- Bloom holds cycle, mood and coach conversations. A person must be able to
-- take all of it back, from inside the app, without emailing anyone. The
-- client already wipes this device; this function is the account half.
--
-- Design notes
--   · security definer + a locked-down search_path, so it can delete across
--     tables the caller's RLS would otherwise protect — but only ever rows
--     belonging to `auth.uid()`, which the caller cannot spoof;
--   · every delete is guarded with `to_regclass`, so the function installs and
--     runs on a project that has only some of these tables;
--   · storage objects under the person's own folder go too;
--   · the auth user itself is deleted last, and only if this role is allowed
--     to — on projects where it isn't, everything else is still gone and the
--     client signs out.
--
-- Idempotent: running it twice is a no-op. Safe to re-run the migration.

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
  end if;

  if to_regclass('public.user_prefs') is not null then
    delete from public.user_prefs where profile_id = uid;
  end if;

  -- ---- the conversations --------------------------------------------------
  if to_regclass('public.coach_messages') is not null then
    delete from public.coach_messages where profile_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('coach_messages', n);
  end if;

  if to_regclass('public.coach_memory') is not null then
    delete from public.coach_memory where profile_id = uid;
  end if;

  -- ---- the profile space --------------------------------------------------
  if to_regclass('public.story_highlight_items') is not null then
    delete from public.story_highlight_items
    where highlight_id in (select id from public.story_highlights where owner_id = uid);
  end if;

  if to_regclass('public.story_highlights') is not null then
    delete from public.story_highlights where owner_id = uid;
  end if;

  if to_regclass('public.stories') is not null then
    delete from public.stories where owner_id = uid;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('stories', n);
  end if;

  if to_regclass('public.profile_privacy') is not null then
    delete from public.profile_privacy where profile_id = uid;
  end if;

  if to_regclass('public.reward_assignments') is not null then
    delete from public.reward_assignments where profile_id = uid;
  end if;

  -- ---- uploaded media -----------------------------------------------------
  if to_regclass('storage.objects') is not null then
    delete from storage.objects
    where bucket_id = 'profile-media'
      and (storage.foldername(name))[1] = uid::text;
    get diagnostics n = row_count; removed := removed || jsonb_build_object('media', n);
  end if;

  -- ---- the identity row and the account itself ----------------------------
  if to_regclass('public.profiles') is not null then
    delete from public.profiles where id = uid;
  end if;

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
  'Tier B · B9. Deletes every row belonging to auth.uid() across Bloom''s tables, its storage objects, and (where permitted) the auth user. Returns a per-table count.';
