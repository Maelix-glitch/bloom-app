-- Bloom — Profile 2.0: identity, privacy, stories, highlights.
-- Run this in the Supabase SQL editor after 20260826_reward_delivery.sql.
-- It is additive: existing `profiles` rows (id, profile_name, total_points)
-- keep working; new columns arrive with safe defaults so old clients are
-- unaffected. Privacy is enforced here (RLS), never in the browser.

-- ---------------------------------------------------------------------------
-- 1. Identity fields on the existing profiles row
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists avatar_path text,
  add column if not exists accent text not null default 'violet',
  add column if not exists featured jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- Legacy rows used profile_name; copy it into display_name once so nobody
-- loses the name they already had.
update public.profiles
   set display_name = nullif(trim(profile_name), '')
 where display_name is null and profile_name is not null;

create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
 where username is not null;

do $$ begin
  alter table public.profiles
    add constraint profiles_username_shape
    check (username is null or (
      char_length(username) between 3 and 30
      and username ~ '^[a-z0-9_]+$'
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 48);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 200);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_accent_allowed
    check (accent in ('violet', 'sky', 'amber', 'sage', 'rose'));
exception when duplicate_object then null; end $$;

-- Keep the row for a signed-in user existing even for accounts created after
-- this migration (the legacy app only created rows on magic-link sign-in).
create or replace function public.handle_new_bloom_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, profile_name, display_name)
  values (new.id, 'Bloom User', null)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_bloom_profile();

-- ---------------------------------------------------------------------------
-- 2. Privacy (separate table — identity row stays identity)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.bloom_visibility as enum ('private', 'public');
exception when duplicate_object then null; end $$;

create table if not exists public.profile_privacy (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  profile_visibility public.bloom_visibility not null default 'private',
  story_visibility public.bloom_visibility not null default 'private',
  updated_at timestamptz not null default now()
);

alter table public.profile_privacy enable row level security;

drop policy if exists "owner reads own privacy" on public.profile_privacy;
create policy "owner reads own privacy" on public.profile_privacy
  for select using (profile_id = auth.uid());

drop policy if exists "owner writes own privacy" on public.profile_privacy;
create policy "owner writes own privacy" on public.profile_privacy
  for insert with check (profile_id = auth.uid());

drop policy if exists "owner updates own privacy" on public.profile_privacy;
create policy "owner updates own privacy" on public.profile_privacy
  for update using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Stories
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.bloom_story_kind as enum
    ('text', 'photo', 'mood', 'reflection', 'win', 'reward', 'milestone');
exception when duplicate_object then null; end $$;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  kind public.bloom_story_kind not null default 'text',
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 2000),
  media_path text,
  media_width integer,
  media_height integer,
  accent text not null default 'violet'
    check (accent in ('violet', 'sky', 'amber', 'sage', 'rose')),
  source_kind text,
  source_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  visibility public.bloom_visibility not null default 'private',
  deleted_at timestamptz,
  constraint stories_expire_after_creation check (expires_at > created_at)
);

create index if not exists stories_active_idx
  on public.stories (author_id, expires_at)
  where deleted_at is null;

alter table public.stories enable row level security;

-- Is profile public? Used by story policies so a private person's stories can
-- never leak even if their story rows say "public".
create or replace function public.is_profile_bloom_public(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile_privacy pp
    where pp.profile_id = p_id
      and pp.profile_visibility = 'public'
  );
$$;

drop policy if exists "owner reads own stories" on public.stories;
create policy "owner reads own stories" on public.stories
  for select using (author_id = auth.uid());

drop policy if exists "visitors read public stories" on public.stories;
create policy "visitors read public stories" on public.stories
  for select using (
    deleted_at is null
    and visibility = 'public'
    and expires_at > now()
    and public.is_profile_bloom_public(author_id)
  );

drop policy if exists "owner creates stories" on public.stories;
create policy "owner creates stories" on public.stories
  for insert with check (author_id = auth.uid());

drop policy if exists "owner updates own stories" on public.stories;
create policy "owner updates own stories" on public.stories
  for update using (author_id = auth.uid());

drop policy if exists "owner deletes own stories" on public.stories;
create policy "owner deletes own stories" on public.stories
  for delete using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Highlights — permanent, curated; private until the story is public
-- ---------------------------------------------------------------------------
create table if not exists public.story_highlights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  accent text not null default 'violet'
    check (accent in ('violet', 'sky', 'amber', 'sage', 'rose')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_highlight_items (
  highlight_id uuid not null references public.story_highlights(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  position integer not null default 0,
  primary key (highlight_id, story_id)
);

create index if not exists story_highlight_items_story_idx
  on public.story_highlight_items (story_id);

alter table public.story_highlights enable row level security;
alter table public.story_highlight_items enable row level security;

drop policy if exists "owner reads own highlights" on public.story_highlights;
create policy "owner reads own highlights" on public.story_highlights
  for select using (owner_id = auth.uid());

drop policy if exists "visitors read public highlights" on public.story_highlights;
create policy "visitors read public highlights" on public.story_highlights
  for select using (public.is_profile_bloom_public(owner_id));

drop policy if exists "owner writes highlights" on public.story_highlights;
create policy "owner writes highlights" on public.story_highlights
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner reads highlight items" on public.story_highlight_items;
create policy "owner reads highlight items" on public.story_highlight_items
  for select using (
    exists (
      select 1 from public.story_highlights sh
      where sh.id = highlight_id
        and (sh.owner_id = auth.uid() or public.is_profile_bloom_public(sh.owner_id))
    )
  );

drop policy if exists "owner writes highlight items" on public.story_highlight_items;
create policy "owner writes highlight items" on public.story_highlight_items
  for all using (
    exists (
      select 1 from public.story_highlights sh
      where sh.id = highlight_id and sh.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.story_highlights sh
      where sh.id = highlight_id and sh.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Identity reads
-- ---------------------------------------------------------------------------
-- Everyone may see the public identity columns (name/username are needed for
-- mentions); email/points are never exposed. Owner sees everything.
drop policy if exists "self reads own profile" on public.profiles;
create policy "self reads own profile" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "owner updates own profile" on public.profiles;
create policy "owner updates own profile" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "owner inserts own profile" on public.profiles;
create policy "owner inserts own profile" on public.profiles
  for insert with check (id = auth.uid());

-- Public profile card. Returns ONLY public fields, and only when the owner
-- chose public visibility. Never returns email, points, mood, coach, tracker.
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
        'accent', s.accent,
        'created_at', s.created_at,
        'expires_at', s.expires_at
      ) order by s.created_at desc)
      from public.stories s
      where s.author_id = v_profile.id
        and s.deleted_at is null
        and s.visibility = 'public'
        and s.expires_at > now()
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

-- Username availability without exposing the table (returns a boolean only).
create or replace function public.is_bloom_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where username = lower(trim(p_username))
  );
$$;

grant execute on function public.is_bloom_username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Media storage — one bucket, namespaced by user id
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do nothing;

drop policy if exists "profile media public read" on storage.objects;
create policy "profile media public read" on storage.objects
  for select using (bucket_id = 'profile-media');

drop policy if exists "profile media owner writes" on storage.objects;
create policy "profile media owner writes" on storage.objects
  for insert with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile media owner updates" on storage.objects;
create policy "profile media owner updates" on storage.objects
  for update using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile media owner deletes" on storage.objects;
create policy "profile media owner deletes" on storage.objects
  for delete using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
