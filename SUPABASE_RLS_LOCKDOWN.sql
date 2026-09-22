-- SUPABASE_RLS_LOCKDOWN.sql
-- One-click lockdown for Bloom. Paste into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run. It does NOT delete data. It only turns on RLS and adds owner-only policies.
-- After running, test: Table Editor should show "RLS enabled" on every table, and anon curl should return 0 rows.

-- ============================================================
-- 0) QUICK CHECK — run this alone first to see what's open
-- ============================================================
-- select tablename, rowsecurity as rls_enabled,
--   (select count(*) from pg_policies where schemaname='public' and tablename=t.tablename) as policy_count
-- from pg_tables t where schemaname='public' order by tablename;

-- ============================================================
-- 1) ENABLE RLS ON EVERY BLOOM TABLE (idempotent)
-- ============================================================
do $$ declare r record; begin
  -- core
  execute 'alter table if exists public.profiles enable row level security';
  execute 'alter table if exists public.mood_entries enable row level security';
  execute 'alter table if exists public.coach_messages enable row level security';
  execute 'alter table if exists public.coach_memory enable row level security';
  -- habits + trackers
  execute 'alter table if exists public.habits enable row level security';
  execute 'alter table if exists public.habit_logs enable row level security';
  execute 'alter table if exists public.tracker_days enable row level security';
  execute 'alter table if exists public.user_prefs enable row level security';
  -- cycle
  execute 'alter table if exists public.cycle_entries enable row level security';
  execute 'alter table if exists public.cycle_periods enable row level security';
  execute 'alter table if exists public.cycle_state enable row level security';
  -- progression
  execute 'alter table if exists public.goal_awards enable row level security';
  execute 'alter table if exists public.point_transactions enable row level security';
  execute 'alter table if exists public.user_achievements enable row level security';
  execute 'alter table if exists public.bloom_ranks enable row level security';
  execute 'alter table if exists public.rank_history enable row level security';
  -- stories
  execute 'alter table if exists public.stories enable row level security';
  execute 'alter table if exists public.story_settings enable row level security';
  execute 'alter table if exists public.story_views enable row level security';
  execute 'alter table if exists public.story_reactions enable row level security';
  execute 'alter table if exists public.story_replies enable row level security';
  execute 'alter table if exists public.story_poll_votes enable row level security';
  execute 'alter table if exists public.story_gifts enable row level security';
  execute 'alter table if exists public.story_highlights enable row level security';
  execute 'alter table if exists public.story_highlight_items enable row level security';
  -- other
  execute 'alter table if exists public.profile_privacy enable row level security';
  execute 'alter table if exists public.push_subscriptions enable row level security';
  execute 'alter table if exists public.close_friends enable row level security';
  execute 'alter table if exists public.app_invites enable row level security';
  -- rewards (already has RLS, but ensure on)
  execute 'alter table if exists public.app_admins enable row level security';
  execute 'alter table if exists public.reward_items enable row level security';
  execute 'alter table if exists public.reward_assignments enable row level security';
  -- future-proof: enable on ANY public table that is missing it
  for r in select tablename from pg_tables where schemaname='public' and not rowsecurity loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- ============================================================
-- 2) BLOCK anon (public key) FROM EVERY USER TABLE
--    The anon key is public by design — this is the fix.
-- ============================================================
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname='public' loop
    -- keep storage, realtime, etc. untouched — only Bloom data tables
    if r.tablename not in ('spatial_ref_sys','geography_columns','geometry_columns') then
      execute format('revoke all on public.%I from anon', r.tablename);
      -- keep authenticated able to use policies
      execute format('grant all on public.%I to authenticated', r.tablename);
    end if;
  end loop;
end $$;

-- ============================================================
-- 3) OWNER-ONLY POLICIES — recreate idempotently
--    Each table: only auth.uid() = owner column can select/insert/update/delete
--    For tables already correctly locked (rewards), we leave them alone.
-- ============================================================

-- profiles: id = auth.uid()
drop policy if exists "profiles owner select" on public.profiles;
create policy "profiles owner select" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles owner insert" on public.profiles;
create policy "profiles owner insert" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles owner delete" on public.profiles;
create policy "profiles owner delete" on public.profiles for delete using (id = auth.uid());

-- mood_entries: profile_id = auth.uid()
drop policy if exists "mood owner select" on public.mood_entries;
create policy "mood owner select" on public.mood_entries for select using (profile_id = auth.uid());
drop policy if exists "mood owner insert" on public.mood_entries;
create policy "mood owner insert" on public.mood_entries for insert with check (profile_id = auth.uid());
drop policy if exists "mood owner update" on public.mood_entries;
create policy "mood owner update" on public.mood_entries for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "mood owner delete" on public.mood_entries;
create policy "mood owner delete" on public.mood_entries for delete using (profile_id = auth.uid());

-- coach_messages
drop policy if exists "coach messages owner select" on public.coach_messages;
create policy "coach messages owner select" on public.coach_messages for select using (profile_id = auth.uid());
drop policy if exists "coach messages owner insert" on public.coach_messages;
create policy "coach messages owner insert" on public.coach_messages for insert with check (profile_id = auth.uid());
drop policy if exists "coach messages owner delete" on public.coach_messages;
create policy "coach messages owner delete" on public.coach_messages for delete using (profile_id = auth.uid());

-- coach_memory
drop policy if exists "coach memory owner select" on public.coach_memory;
create policy "coach memory owner select" on public.coach_memory for select using (profile_id = auth.uid());
drop policy if exists "coach memory owner insert" on public.coach_memory;
create policy "coach memory owner insert" on public.coach_memory for insert with check (profile_id = auth.uid());
drop policy if exists "coach memory owner update" on public.coach_memory;
create policy "coach memory owner update" on public.coach_memory for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "coach memory owner delete" on public.coach_memory;
create policy "coach memory owner delete" on public.coach_memory for delete using (profile_id = auth.uid());

-- habits
drop policy if exists "habits owner select" on public.habits;
create policy "habits owner select" on public.habits for select using (profile_id = auth.uid());
drop policy if exists "habits owner insert" on public.habits;
create policy "habits owner insert" on public.habits for insert with check (profile_id = auth.uid());
drop policy if exists "habits owner update" on public.habits;
create policy "habits owner update" on public.habits for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "habits owner delete" on public.habits;
create policy "habits owner delete" on public.habits for delete using (profile_id = auth.uid());

-- habit_logs
drop policy if exists "habit_logs owner select" on public.habit_logs;
create policy "habit_logs owner select" on public.habit_logs for select using (profile_id = auth.uid());
drop policy if exists "habit_logs owner insert" on public.habit_logs;
create policy "habit_logs owner insert" on public.habit_logs for insert with check (profile_id = auth.uid());
drop policy if exists "habit_logs owner delete" on public.habit_logs;
create policy "habit_logs owner delete" on public.habit_logs for delete using (profile_id = auth.uid());

-- tracker_days
drop policy if exists "tracker_days owner select" on public.tracker_days;
create policy "tracker_days owner select" on public.tracker_days for select using (profile_id = auth.uid());
drop policy if exists "tracker_days owner insert" on public.tracker_days;
create policy "tracker_days owner insert" on public.tracker_days for insert with check (profile_id = auth.uid());
drop policy if exists "tracker_days owner update" on public.tracker_days;
create policy "tracker_days owner update" on public.tracker_days for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "tracker_days owner delete" on public.tracker_days;
create policy "tracker_days owner delete" on public.tracker_days for delete using (profile_id = auth.uid());

-- user_prefs
drop policy if exists "user_prefs owner select" on public.user_prefs;
create policy "user_prefs owner select" on public.user_prefs for select using (profile_id = auth.uid());
drop policy if exists "user_prefs owner insert" on public.user_prefs;
create policy "user_prefs owner insert" on public.user_prefs for insert with check (profile_id = auth.uid());
drop policy if exists "user_prefs owner update" on public.user_prefs;
create policy "user_prefs owner update" on public.user_prefs for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "user_prefs owner delete" on public.user_prefs;
create policy "user_prefs owner delete" on public.user_prefs for delete using (profile_id = auth.uid());

-- cycle_entries / cycle_periods / cycle_state
drop policy if exists "cycle entries owner select" on public.cycle_entries;
create policy "cycle entries owner select" on public.cycle_entries for select using (profile_id = auth.uid());
drop policy if exists "cycle entries owner insert" on public.cycle_entries;
create policy "cycle entries owner insert" on public.cycle_entries for insert with check (profile_id = auth.uid());
drop policy if exists "cycle entries owner update" on public.cycle_entries;
create policy "cycle entries owner update" on public.cycle_entries for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "cycle entries owner delete" on public.cycle_entries;
create policy "cycle entries owner delete" on public.cycle_entries for delete using (profile_id = auth.uid());

drop policy if exists "cycle periods owner select" on public.cycle_periods;
create policy "cycle periods owner select" on public.cycle_periods for select using (profile_id = auth.uid());
drop policy if exists "cycle periods owner insert" on public.cycle_periods;
create policy "cycle periods owner insert" on public.cycle_periods for insert with check (profile_id = auth.uid());
drop policy if exists "cycle periods owner update" on public.cycle_periods;
create policy "cycle periods owner update" on public.cycle_periods for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "cycle periods owner delete" on public.cycle_periods;
create policy "cycle periods owner delete" on public.cycle_periods for delete using (profile_id = auth.uid());

drop policy if exists "cycle state owner select" on public.cycle_state;
create policy "cycle state owner select" on public.cycle_state for select using (profile_id = auth.uid());
drop policy if exists "cycle state owner insert" on public.cycle_state;
create policy "cycle state owner insert" on public.cycle_state for insert with check (profile_id = auth.uid());
drop policy if exists "cycle state owner update" on public.cycle_state;
create policy "cycle state owner update" on public.cycle_state for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "cycle state owner delete" on public.cycle_state;
create policy "cycle state owner delete" on public.cycle_state for delete using (profile_id = auth.uid());

-- stories + story_settings / views / reactions / highlights
drop policy if exists "stories owner select" on public.stories;
create policy "stories owner select" on public.stories for select using (profile_id = auth.uid());
drop policy if exists "stories owner insert" on public.stories;
create policy "stories owner insert" on public.stories for insert with check (profile_id = auth.uid());
drop policy if exists "stories owner delete" on public.stories;
create policy "stories owner delete" on public.stories for delete using (profile_id = auth.uid());

drop policy if exists "story_settings owner select" on public.story_settings;
create policy "story_settings owner select" on public.story_settings for select using (profile_id = auth.uid());
drop policy if exists "story_settings owner insert" on public.story_settings;
create policy "story_settings owner insert" on public.story_settings for insert with check (profile_id = auth.uid());
drop policy if exists "story_settings owner update" on public.story_settings;
create policy "story_settings owner update" on public.story_settings for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- allow public read for stories that are marked public (if your stories table has is_public)
-- This is safe: private stories stay owner-only. If you don't have is_public, the owner-only above is enough.
-- Uncomment if you have a public stories view:
-- drop policy if exists "stories public read" on public.stories;
-- create policy "stories public read" on public.stories for select using (is_public = true);

-- push_subscriptions, profile_privacy, close_friends
drop policy if exists "push_subscriptions owner select" on public.push_subscriptions;
create policy "push_subscriptions owner select" on public.push_subscriptions for select using (profile_id = auth.uid());
drop policy if exists "push_subscriptions owner insert" on public.push_subscriptions;
create policy "push_subscriptions owner insert" on public.push_subscriptions for insert with check (profile_id = auth.uid());
drop policy if exists "push_subscriptions owner delete" on public.push_subscriptions;
create policy "push_subscriptions owner delete" on public.push_subscriptions for delete using (profile_id = auth.uid());

-- ============================================================
-- 4) VERIFY — run this after and screenshot the result
-- ============================================================
-- select tablename, rowsecurity as rls_on,
--   (select count(*) from pg_policies where schemaname='public' and tablename=t.tablename) as policies
-- from pg_tables t where schemaname='public' order by tablename;

-- Expected: every Bloom table has rls_on = t and policies >= 1
-- If any shows rls_on = f, re-run section 1 for that table name.

-- ============================================================
-- 5) TEST anon can't read (paste anon key in dashboard → API Docs → try)
-- ============================================================
-- In Supabase Dashboard → API Docs, copy your anon key, then in terminal:
-- curl "https://YOUR_PROJECT.supabase.co/rest/v1/mood_entries?select=*" -H "apikey: ANON_KEY" -H "Authorization: Bearer ANON_KEY"
-- Should return [] (empty) when logged out, not everyone's data.

