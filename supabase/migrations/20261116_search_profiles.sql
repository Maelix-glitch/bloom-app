-- Bloom — people search: find other members by name or @username.
--
-- Owner directive (2026-11-16): a magnifying glass on the Profile page so
-- people can search for other users, with the verification tick shown in
-- the results.
--
-- Why an RPC and not a wider policy: `profiles` RLS is owner-only in every
-- migration that defines it ("self reads own profile" / "profiles owner
-- select", both `id = auth.uid()`), and `account_verifications` is
-- own-row-only too. A signed-in user cannot read ANY other person's name,
-- @username or avatar through PostgREST today — discovery exists only
-- through security-definer functions for a handle you already know
-- (`get_public_bloom_profile`). This migration adds the search half of
-- that pattern and changes NO policy:
--
--   `public.search_profiles(p_term)` — SECURITY DEFINER, signed-in
--   callers only. Returns at most 20 rows of PUBLIC fields only:
--   user id, display name, @username, avatar path, accent, and a
--   `verified` boolean. It never returns email, points, bio, or any
--   tracker / mood / coach data.
--
-- The privacy gate is the app's own: a person appears only when
-- `is_profile_bloom_public(id)` holds — the same check the public
-- profile page makes — so everyone listed can actually be opened at
-- /@username, and a member who kept their profile private is not listed
-- at all (not even as a locked row). The caller is always excluded,
-- server-side; the client filters again as defence in depth.
--
-- The `verified` boolean is exactly the blue tick's truth for another
-- person: a row exists in `account_verifications`. That record can only
-- be created by `claim_account_verification()`, which checks the invite,
-- the confirmed email and the complete profile server-side before
-- granting — so the existence of the row is the whole public fact. (The
-- gates behind someone else's tick are private and are not exposed here.)
--
-- Search is a substring match over display name and @username, minimum
-- two characters (enforced here and in the client). LIKE wildcards in
-- the term are escaped, so "%" is a literal percent, not a match-all.
-- An exact @username match sorts first, then alphabetical by name.

create or replace function public.search_profiles(p_term text)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_path text,
  accent text,
  verified boolean
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
  v_term := replace(replace(replace(v_raw, '\', '\\'), '%', '\%'), '_', '\_');

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
    )
  from public.profiles p
  where p.id <> v_uid
    and public.is_profile_bloom_public(p.id)
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
  'People search for signed-in members: up to 20 public profiles whose display name or @username contains the term (min 2 chars). Public fields only; caller excluded; only profiles the owner made public are listed. `verified` is the account_verifications record''s existence — the blue tick.';

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;
