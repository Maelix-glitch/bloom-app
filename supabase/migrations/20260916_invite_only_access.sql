-- Bloom — invite-only access.
--
-- Access to Bloom is by invitation. This migration makes that a *server*
-- property rather than a client one, because the alternative is a whitelist
-- that lives in JavaScript and can be read, edited or simply not called.
--
-- Three layers, in increasing order of authority:
--
--   1. `public.app_invites` — the list. `anon` and `authenticated` have no
--      privileges on it at all, so nobody can read who is invited or insert
--      themselves. Invitations are granted from a trusted SQL session, exactly
--      like `app_admins` in 20260826_reward_delivery.sql.
--
--   2. `public.is_email_invited(text)` — a SECURITY DEFINER check the sign-in
--      screen calls before offering to send a link. It returns a boolean and
--      nothing else: no row, no reason, no hint about why. That is deliberate —
--      a rejection message that explains itself is an invitation list with
--      extra steps.
--
--   3. `auth.users` insert trigger — the actual enforcement. Layer 2 is a
--      courtesy that makes the UI honest; layer 3 is what stops someone who
--      skips the UI. Creating an account for an uninvited email raises an
--      exception and the signup fails, no matter what the client did.
--
-- Existing accounts are seeded into the list below so that running this
-- migration never locks out someone who is already using Bloom.

-- ---------------------------------------------------------------------------
-- 1. The list
-- ---------------------------------------------------------------------------
create table if not exists public.app_invites (
  email text primary key check (email = lower(trim(email)) and char_length(email) between 3 and 320),
  note text,
  created_at timestamptz not null default now(),
  /** Set when this address completes its first sign-in. Bookkeeping only —
      revoking access means deleting the row, not clearing this. */
  used_at timestamptz
);

comment on table public.app_invites is
  'Addresses allowed to create a Bloom account. No client role may read or write this table.';

alter table public.app_invites enable row level security;

-- No policies, and no grants: RLS with zero policies denies everything, and
-- the explicit revoke makes the intent legible to whoever reads this next.
revoke all on public.app_invites from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. The check the sign-in screen is allowed to make
-- ---------------------------------------------------------------------------
create or replace function public.is_email_invited(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_invites
    where email = lower(trim(coalesce(p_email, '')))
  );
$$;

comment on function public.is_email_invited(text) is
  'Is this address invited? Boolean only, by design — it must not leak the list.';

revoke all on function public.is_email_invited(text) from public;
grant execute on function public.is_email_invited(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. The enforcement
-- ---------------------------------------------------------------------------
create or replace function public.enforce_invited_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A signup with no email at all is not something this app creates; let auth
  -- reject it on its own terms rather than reporting it as "not invited".
  if new.email is null then
    return new;
  end if;

  if not exists (
    select 1 from public.app_invites
    where email = lower(trim(new.email))
  ) then
    raise exception 'Bloom access is by invitation only.'
      using errcode = '28000';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_invited_signup() from public;

drop trigger if exists bloom_invites_only on auth.users;
create trigger bloom_invites_only
  before insert on auth.users
  for each row
  execute function public.enforce_invited_signup();

-- ---------------------------------------------------------------------------
-- 4. Never lock out the people already here
-- ---------------------------------------------------------------------------
insert into public.app_invites (email, note)
select lower(trim(u.email)), 'existing account, seeded by migration'
from auth.users u
where u.email is not null
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Record first use
-- ---------------------------------------------------------------------------
create or replace function public.mark_invite_used()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null then
    update public.app_invites
    set used_at = now()
    where email = lower(trim(new.email))
      and used_at is null;
  end if;
  return new;
end;
$$;

revoke all on function public.mark_invite_used() from public;

drop trigger if exists bloom_invite_used on auth.users;
create trigger bloom_invite_used
  after insert on auth.users
  for each row
  execute function public.mark_invite_used();
