-- Bloom — Story Platform: interactions, audiences, rich elements.
-- Additive to 20260828_profile_identity_stories.sql. Existing rows keep working:
-- every new column is nullable or has a safe default, and new tables start empty.
--
-- What this adds:
--   stories: media_type, duration_ms, elements (text/sticker/poll/...),
--            filter_id, adjustments, background_id, music, alt_text, audience
--   story_views / story_reactions / story_replies / story_gifts / story_poll_votes
--   close_friends, story_settings
--   audience-aware public read policy + public profile payload extension

-- ---------------------------------------------------------------------------
-- 1. Story kind: video joins the family
-- ---------------------------------------------------------------------------
do $$ begin
  alter type public.bloom_story_kind add value if not exists 'video';
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Rich story columns
-- ---------------------------------------------------------------------------
alter table public.stories
  add column if not exists media_type text not null default 'image'
    check (media_type in ('none', 'image', 'video')),
  add column if not exists duration_ms integer
    check (duration_ms is null or (duration_ms > 0 and duration_ms <= 120000)),
  add column if not exists elements jsonb not null default '[]'::jsonb,
  add column if not exists filter_id text,
  add column if not exists adjustments jsonb,
  add column if not exists background_id text,
  add column if not exists music jsonb,
  add column if not exists alt_text text
    check (alt_text is null or char_length(alt_text) <= 300),
  add column if not exists audience text not null default 'all'
    check (audience in ('all', 'close'));

-- Text-only stories never had media: normalize them so clients can trust media_type.
update public.stories
   set media_type = 'none'
 where media_path is null and media_type = 'image';

create index if not exists stories_audience_idx
  on public.stories (author_id, expires_at)
  where deleted_at is null and audience = 'close';

-- ---------------------------------------------------------------------------
-- 3. Close friends — the intimate audience
-- ---------------------------------------------------------------------------
create table if not exists public.close_friends (
  owner_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  check (owner_id <> friend_id)
);

alter table public.close_friends enable row level security;

drop policy if exists "owner manages close friends" on public.close_friends;
create policy "owner manages close friends" on public.close_friends
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Story settings — interaction + archive preferences per user
-- ---------------------------------------------------------------------------
create table if not exists public.story_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allow_replies boolean not null default true,
  allow_reactions boolean not null default true,
  allow_gifts boolean not null default true,
  auto_archive boolean not null default true,
  default_audience text not null default 'all' check (default_audience in ('all', 'close')),
  updated_at timestamptz not null default now()
);

alter table public.story_settings enable row level security;

drop policy if exists "owner manages story settings" on public.story_settings;
create policy "owner manages story settings" on public.story_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Views — idempotent: one row per (story, viewer)
-- ---------------------------------------------------------------------------
create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index if not exists story_views_story_idx on public.story_views (story_id);

alter table public.story_views enable row level security;

-- ---------------------------------------------------------------------------
-- 6. Reactions — one per (story, user); change = update, not a new row
-- ---------------------------------------------------------------------------
create table if not exists public.story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null
    check (reaction in ('heart', 'bloom', 'sparkle', 'smile', 'cheer', 'moon')),
  created_at timestamptz not null default now(),
  unique (story_id, user_id)
);

create index if not exists story_reactions_story_idx on public.story_reactions (story_id);

alter table public.story_reactions enable row level security;

-- ---------------------------------------------------------------------------
-- 7. Replies — short, private to the story owner + author
-- ---------------------------------------------------------------------------
create table if not exists public.story_replies (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists story_replies_story_idx on public.story_replies (story_id, created_at);

alter table public.story_replies enable row level security;

-- ---------------------------------------------------------------------------
-- 8. Gifts — free expressive blooms, never money
-- ---------------------------------------------------------------------------
create table if not exists public.story_gifts (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  gift text not null
    check (gift in ('bloom', 'petal', 'star', 'heart', 'candle', 'moon', 'ribbon', 'spark')),
  created_at timestamptz not null default now()
);

create index if not exists story_gifts_story_idx on public.story_gifts (story_id, created_at);

alter table public.story_gifts enable row level security;

-- ---------------------------------------------------------------------------
-- 9. Poll / slider / question votes — one per (story, element, user)
-- ---------------------------------------------------------------------------
create table if not exists public.story_poll_votes (
  story_id uuid not null references public.stories(id) on delete cascade,
  element_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null default 0 check (option_index >= 0),
  value_text text check (value_text is null or char_length(value_text) <= 280),
  created_at timestamptz not null default now(),
  primary key (story_id, element_id, user_id)
);

alter table public.story_poll_votes enable row level security;

-- ---------------------------------------------------------------------------
-- 10. Visibility helper — one server-authoritative answer
-- ---------------------------------------------------------------------------
create or replace function public.can_view_bloom_story(p_story uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_story public.stories%rowtype;
begin
  select * into v_story from public.stories where id = p_story;
  if v_story.id is null then return false; end if;
  if v_story.deleted_at is not null then return false; end if;
  if v_story.expires_at <= now() then return false; end if;
  -- Owners always see their own stories (active or resting in archive).
  if v_story.author_id = auth.uid() then return true; end if;
  -- Everyone else: public profile + public story + matching audience.
  if v_story.visibility <> 'public' then return false; end if;
  if not public.is_profile_bloom_public(v_story.author_id) then return false; end if;
  if v_story.audience = 'close' then
    return exists (
      select 1 from public.close_friends cf
      where cf.owner_id = v_story.author_id and cf.friend_id = auth.uid()
    );
  end if;
  return true;
end;
$$;

-- Settings gate: missing row = everything allowed (safe default for old users).
create or replace function public.story_allows(p_author uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case p_kind
      when 'reply' then s.allow_replies
      when 'reaction' then s.allow_reactions
      when 'gift' then s.allow_gifts
      else true
    end
    from public.story_settings s
    where s.user_id = p_author
  ), true);
$$;

-- ---------------------------------------------------------------------------
-- 11. Audience-aware story read policy (replaces the visitors policy)
-- ---------------------------------------------------------------------------
drop policy if exists "visitors read public stories" on public.stories;
create policy "visitors read public stories" on public.stories
  for select using (
    deleted_at is null
    and visibility = 'public'
    and expires_at > now()
    and public.is_profile_bloom_public(author_id)
    and (
      audience = 'all'
      or (
        audience = 'close'
        and exists (
          select 1 from public.close_friends cf
          where cf.owner_id = author_id and cf.friend_id = auth.uid()
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 12. Interaction policies
-- ---------------------------------------------------------------------------
-- Views: record your own view on anything you can see; owners read their own.
drop policy if exists "viewers record own views" on public.story_views;
create policy "viewers record own views" on public.story_views
  for insert with check (
    viewer_id = auth.uid() and public.can_view_bloom_story(story_id)
  );

drop policy if exists "owners read story views" on public.story_views;
create policy "owners read story views" on public.story_views
  for select using (
    viewer_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = auth.uid()
    )
  );

-- Reactions: interact where allowed; read own + owner's.
drop policy if exists "viewers react where allowed" on public.story_reactions;
create policy "viewers react where allowed" on public.story_reactions
  for insert with check (
    user_id = auth.uid()
    and public.can_view_bloom_story(story_id)
    and public.story_allows((select author_id from public.stories where id = story_id), 'reaction')
  );

drop policy if exists "viewers change own reaction" on public.story_reactions;
create policy "viewers change own reaction" on public.story_reactions
  for update using (user_id = auth.uid());

drop policy if exists "viewers remove own reaction" on public.story_reactions;
create policy "viewers remove own reaction" on public.story_reactions
  for delete using (user_id = auth.uid());

drop policy if exists "owners read reactions" on public.story_reactions;
create policy "owners read reactions" on public.story_reactions
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = auth.uid()
    )
  );

-- Replies: same shape, gated by allow_replies.
drop policy if exists "viewers reply where allowed" on public.story_replies;
create policy "viewers reply where allowed" on public.story_replies
  for insert with check (
    user_id = auth.uid()
    and public.can_view_bloom_story(story_id)
    and public.story_allows((select author_id from public.stories where id = story_id), 'reply')
  );

drop policy if exists "owners read replies" on public.story_replies;
create policy "owners read replies" on public.story_replies
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = auth.uid()
    )
  );

drop policy if exists "authors remove own reply" on public.story_replies;
create policy "authors remove own reply" on public.story_replies
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = auth.uid()
    )
  );

-- Gifts: same shape, gated by allow_gifts.
drop policy if exists "viewers gift where allowed" on public.story_gifts;
create policy "viewers gift where allowed" on public.story_gifts
  for insert with check (
    sender_id = auth.uid()
    and public.can_view_bloom_story(story_id)
    and public.story_allows((select author_id from public.stories where id = story_id), 'gift')
  );

drop policy if exists "owners read gifts" on public.story_gifts;
create policy "owners read gifts" on public.story_gifts
  for select using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = auth.uid()
    )
  );

-- Poll votes: interact + read own; owners read aggregate on own stories.
drop policy if exists "viewers vote where allowed" on public.story_poll_votes;
create policy "viewers vote where allowed" on public.story_poll_votes
  for insert with check (
    user_id = auth.uid() and public.can_view_bloom_story(story_id)
  );

drop policy if exists "viewers change own vote" on public.story_poll_votes;
create policy "viewers change own vote" on public.story_poll_votes
  for update using (user_id = auth.uid());

drop policy if exists "owners read votes" on public.story_poll_votes;
create policy "owners read votes" on public.story_poll_votes
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.author_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 13. Public profile payload grows (additive — old clients ignore new keys)
-- ---------------------------------------------------------------------------
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

  result := jsonb_build_object(
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
grant execute on function public.can_view_bloom_story(uuid) to anon, authenticated;
