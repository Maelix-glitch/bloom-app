-- 20261124: content reports + user blocks (M-232, App Store audit #14).
--
-- Stories are shared between people (audiences "all" / "close", replies,
-- reactions, gifts, public profiles) and until now Bloom had no report
-- action, no block, and no moderation path anywhere. This migration adds
-- the database half:
--
--   · content_reports — one row per report (story / profile / reply).
--     A reporter can insert a report and read back their own; nobody
--     else reads reports through the client. Moderation reads happen
--     only through the admin RPCs at the bottom of this file, gated on
--     public.is_rewards_admin() (the app_admins table) in the same
--     posture as the grant tables (member_badges / trainer_profiles):
--     no open client reads, ever.
--   · user_blocks — one row per block. A block hides BOTH directions:
--     the blocker's surfaces stop showing the blocked person, and the
--     blocked person's surfaces stop showing the blocker. The pair row
--     is readable by either side (each person needs to know the pair
--     exists to filter their own surfaces); inserts and deletes are
--     the blocker's alone.
--
-- The hiding itself is wired into the real data paths, restated below:
-- get_public_bloom_profile returns its private shape when a block
-- exists in either direction (and now carries the profile's user_id so
-- the client can offer Report / Block against the right person), and
-- search_profiles never returns a blocked counterpart. The client also
-- filters story interaction lists (replies / gifts / viewers) against
-- the same table — see src/lib/profile/safetyService.ts.
--
-- Erasure: the companion migration 20261124_content_safety_erase.sql
-- restates erase_my_data() with deletes for both tables. (Neither
-- table's person columns are in the erase-coverage guard's column list
-- — reporter_id / blocker_id / blocked_id / target_user_id — so the
-- deletes are added on the house rule, not because the guard derives
-- them: every per-person table owes the erase function a delete.)
--
-- This migration writes no rows at apply time.

-- ---------------------------------------------------------------------------
-- 1. content_reports
-- ---------------------------------------------------------------------------
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_kind text not null check (target_kind in ('story', 'profile', 'reply')),
  /* The reported thing's own id: a story id, the profile's user id, or
     a story reply id, depending on target_kind. Text, because the three
     kinds do not share one table to reference. */
  target_id text not null,
  /* Whose content or profile was reported — the moderation queue's
     subject, and the column erasure keys on for reports ABOUT a person. */
  target_user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists content_reports_status_idx
  on public.content_reports (status, created_at desc);
create index if not exists content_reports_reporter_idx
  on public.content_reports (reporter_id, created_at desc);

alter table public.content_reports enable row level security;

drop policy if exists "content_reports self insert" on public.content_reports;
create policy "content_reports self insert"
  on public.content_reports for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "content_reports self select" on public.content_reports;
create policy "content_reports self select"
  on public.content_reports for select to authenticated
  using (reporter_id = auth.uid());

/* Insert + read-own only. No update or delete grant exists for clients:
   a report's status moves only through admin_set_report_status below,
   and a reporter's rows leave only through erasure. */
revoke all on public.content_reports from anon, authenticated;
grant select, insert on public.content_reports to authenticated;

comment on table public.content_reports is
  'User reports of shared content (M-232): story / profile / reply, with a reason. Reporters insert and read their own rows only; moderation reads and status changes happen through the admin RPCs in this migration, gated on app_admins. Reports are private — the reported person is never told.';

-- ---------------------------------------------------------------------------
-- 2. user_blocks
-- ---------------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  /* Display-name snapshot, the way the story tables snapshot author
     names — the Settings "Blocked people" list must be able to name a
     person even after their profile goes private or is renamed. */
  blocked_name text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

/* Either side of the pair can read the row: the blocked person needs it
   to hide the blocker from their own surfaces, which is what makes the
   hide run in both directions. The row names only the pair itself. */
drop policy if exists "user_blocks pair select" on public.user_blocks;
create policy "user_blocks pair select"
  on public.user_blocks for select to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

drop policy if exists "user_blocks self insert" on public.user_blocks;
create policy "user_blocks self insert"
  on public.user_blocks for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "user_blocks self delete" on public.user_blocks;
create policy "user_blocks self delete"
  on public.user_blocks for delete to authenticated
  using (blocker_id = auth.uid());

revoke all on public.user_blocks from anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;

comment on table public.user_blocks is
  'One row per block (M-232). A block hides both directions: neither person''s stories, profile or search results show the other. Only the blocker can create or remove the row; either side can read the pair row so their own surfaces can filter.';

-- ---------------------------------------------------------------------------
-- 3. get_public_bloom_profile — block-aware, and carries the user id
-- ---------------------------------------------------------------------------
-- Restated from 20260915_story_slides.sql with exactly two changes:
--   · the payload gains 'user_id' (profiles.id IS the auth user id —
--     stories key on it as author_id), so the client can aim Report /
--     Block at the person behind the profile;
--   · when a block exists in either direction between the viewer and
--     this profile, the function returns the same private shape a
--     private profile returns — the block is never revealed as a block.

create or replace function public.get_public_bloom_profile(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  result jsonb;
begin
  select * into v_profile
  from public.profiles
  where username = lower(trim(p_username));

  if v_profile.id is null then
    return null;
  end if;

  if not public.is_profile_bloom_public(v_profile.id) then
    return jsonb_build_object('private', true, 'username', v_profile.username);
  end if;

  /* M-232: a block in either direction hides the profile entirely —
     the same answer a private profile gives. */
  if auth.uid() is not null and exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = v_profile.id)
       or (b.blocker_id = v_profile.id and b.blocked_id = auth.uid())
  ) then
    return jsonb_build_object('private', true, 'username', v_profile.username);
  end if;

  result := jsonb_build_object(
    'user_id', v_profile.id,
    'display_name', coalesce(nullif(trim(v_profile.display_name), ''), 'Bloom User'),
    'username', v_profile.username,
    'bio', nullif(trim(coalesce(v_profile.bio, '')), ''),
    'avatar_url', case
      when v_profile.avatar_path is null then null
      else 'profile-media/' || v_profile.avatar_path
    end,
    'accent', v_profile.accent,
    'featured', v_profile.featured,
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'kind', s.kind,
        'title', s.title,
        'body', s.body,
        'media_url', case when s.media_path is null then null
                          else 'profile-media/' || s.media_path end,
        'media_type', s.media_type,
        'duration_ms', s.duration_ms,
        'elements', s.elements,
        'filter_id', s.filter_id,
        'adjustments', s.adjustments,
        'background_id', s.background_id,
        'canvas', s.canvas,
        'slides', s.slides,
        'music', s.music,
        'alt_text', s.alt_text,
        'audience', s.audience,
        'accent', s.accent,
        'created_at', s.created_at,
        'expires_at', s.expires_at
      ) order by s.created_at desc)
      from public.stories s
      where s.author_id = v_profile.id
        and s.deleted_at is null
        and s.visibility = 'public'
        and s.expires_at > now()
        and (
          s.audience = 'all'
          or (
            s.audience = 'close'
            and exists (
              select 1 from public.close_friends cf
              where cf.owner_id = v_profile.id and cf.friend_id = auth.uid()
            )
          )
        )
    ), '[]'::jsonb),
    'highlights', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id,
        'name', h.name,
        'accent', h.accent,
        'stories', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', s.id,
            'kind', s.kind,
            'title', s.title,
            'body', s.body,
            'media_url', case when s.media_path is null then null
                              else 'profile-media/' || s.media_path end,
            'media_type', s.media_type,
            'duration_ms', s.duration_ms,
            'elements', s.elements,
            'filter_id', s.filter_id,
            'adjustments', s.adjustments,
            'background_id', s.background_id,
            'canvas', s.canvas,
            'slides', s.slides,
            'music', s.music,
            'alt_text', s.alt_text,
            'audience', s.audience,
            'accent', s.accent,
            'created_at', s.created_at,
            'expires_at', s.expires_at
          ) order by i.position)
          from public.story_highlight_items i
          join public.stories s on s.id = i.story_id
          where i.highlight_id = h.id
            and s.deleted_at is null
            and s.visibility = 'public'
        ), '[]'::jsonb)
      ) order by h.created_at)
      from public.story_highlights h
      where h.owner_id = v_profile.id
    ), '[]'::jsonb)
  );

  return result;
end;
$$;

revoke all on function public.get_public_bloom_profile(text) from anon;
grant execute on function public.get_public_bloom_profile(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. search_profiles — blocked counterparts never appear
-- ---------------------------------------------------------------------------
-- Restated from 20261122_member_badges.sql with one added WHERE clause:
-- a profile the caller blocked, or that blocked the caller, is excluded.

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
  v_term := replace(replace(replace(v_raw, '\\', '\\\\'), '%', '\\%'), '_', '\\_');

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
    /* M-232: a block in either direction removes the person from the
       other's search results entirely. */
    and not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = v_uid and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = v_uid)
    )
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
  'People search for signed-in members: up to 20 public profiles whose display name or @username contains the term (min 2 chars). Public fields only; caller excluded; only profiles the owner made public are listed; profiles in a block relationship with the caller (either direction) are excluded (M-232). `verified` is the account_verifications record''s existence — the tick, grant-only since 20261122. `is_trainer` and `badges` (M-209) are the member badges'' public facts: the trainer_profiles row''s existence and the member_badges kinds held.';

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Moderation — admin-only reads and status changes
-- ---------------------------------------------------------------------------
-- The owner's review path. Both functions refuse non-admins in the
-- rewards-admin pattern (42501), and neither is reachable by anon.
-- Report rows are never exposed through the client tables (section 1),
-- so this list — with reporter and subject names resolved here, where
-- the definer can read profiles — is the only way reports are read.

create or replace function public.admin_list_content_reports(p_status text default null)
returns table (
  id uuid,
  created_at timestamptz,
  reporter_id uuid,
  reporter_name text,
  target_kind text,
  target_id text,
  target_user_id uuid,
  target_name text,
  reason text,
  note text,
  status text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_rewards_admin() then
    raise exception using errcode = '42501', message = 'Bloom administrator access required.';
  end if;

  return query
  select
    r.id,
    r.created_at,
    r.reporter_id,
    coalesce(
      nullif(trim(rp.display_name), ''),
      nullif(trim(rp.profile_name), ''),
      'Bloom User'
    ),
    r.target_kind,
    r.target_id,
    r.target_user_id,
    coalesce(
      nullif(trim(tp.display_name), ''),
      nullif(trim(tp.profile_name), ''),
      'Bloom User'
    ),
    r.reason,
    r.note,
    r.status
  from public.content_reports r
  left join public.profiles rp on rp.id = r.reporter_id
  left join public.profiles tp on tp.id = r.target_user_id
  where p_status is null or r.status = p_status
  order by r.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_content_reports(text) from public, anon;
grant execute on function public.admin_list_content_reports(text) to authenticated;

create or replace function public.admin_set_report_status(p_report_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_rewards_admin() then
    raise exception using errcode = '42501', message = 'Bloom administrator access required.';
  end if;

  if p_status not in ('open', 'reviewed', 'dismissed') then
    raise exception using errcode = '22023', message = 'Unknown report status.';
  end if;

  update public.content_reports
  set status = p_status
  where id = p_report_id;

  return found;
end;
$$;

revoke all on function public.admin_set_report_status(uuid, text) from public, anon;
grant execute on function public.admin_set_report_status(uuid, text) to authenticated;

comment on function public.admin_list_content_reports(text) is
  'Moderation queue (M-232): the content reports, newest first, with reporter and subject names. Admin-only — refuses anyone not in app_admins.';
comment on function public.admin_set_report_status(uuid, text) is
  'Moderation action (M-232): move one report between open / reviewed / dismissed. Admin-only — refuses anyone not in app_admins.';
