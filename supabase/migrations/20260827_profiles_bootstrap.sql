-- Bloom — the profiles row, if your project doesn't have one yet.
--
-- 20260828_profile_identity_stories.sql is additive: it ALTERs public.profiles
-- to add the identity columns (username, display_name, bio, avatar_path,
-- accent, featured). That only works if the table is already there. Most Bloom
-- projects created it months ago; this file creates it for the ones that didn't,
-- so the identity migration can't fail halfway through.
--
-- Safe to run on a project that already has the table — every statement here is
-- guarded with "if not exists".

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  profile_name  text,
  total_points  integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- You read and edit your own row. Public reading goes through the
-- get_public_bloom_profile() function, which only returns what the privacy
-- settings allow — there is deliberately no anonymous SELECT policy here.
drop policy if exists "profiles bootstrap read own" on public.profiles;
create policy "profiles bootstrap read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles bootstrap insert own" on public.profiles;
create policy "profiles bootstrap insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles bootstrap update own" on public.profiles;
create policy "profiles bootstrap update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
