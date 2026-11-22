-- 20261122: verification becomes GRANT-ONLY — the self-claim path retires.
--
-- Owner directive (2026-11-22, fixed): "the verification badge is only
-- for eligible members… don't give everyone the verification badge; we
-- will release who will get the verification things." The eligibility
-- roster is the owner's, released by him later; this migration only
-- closes the door he pointed at. See M-208.
--
-- Verification v2 (20261115) made the tick a record in
-- `public.account_verifications`, granted by the security-definer
-- claim function when three gates passed: the account email on
-- app_invites, the email confirmed, a real name + @username. Bloom is
-- invite-only, so in practice those gates were effectively EVERY
-- member — anyone who finished their profile could claim the badge.
-- That is what ends here:
--
--   1. The claim function is DROPPED. No client-reachable path can
--      create a verification record any more. (A client old enough to
--      still call it gets a function-not-found error, which its facts
--      service already degrades to "no record" — fail-closed.)
--
--   2. `admin_grant_verification(email)` — SERVICE ROLE ONLY, the
--      trainer pattern (20261121): run from a trusted SQL session, it
--      resolves the account by email and inserts the record with
--      method 'admin'. Idempotent: re-granting returns the existing
--      record untouched, so a grant never rewrites a verified_at.
--
--   3. `admin_revoke_verification(email)` — SERVICE ROLE ONLY: removes
--      the record for that account, returning whether one existed.
--
--   4. The method check widens from ('invite') to ('invite', 'admin')
--      so a grant records how the badge was given.
--
-- EXISTING ROWS ARE NOT TOUCHED: every record granted under v2 keeps
-- its row, its method and its verified_at. Revoking anyone is a
-- separate, explicit act (function 3), never a migration side effect.
--
-- NOTE: apply to the live project before (or with) the deploy that
-- ships the grant-only client. Until it is applied the old claim
-- function still exists server-side, but the new client never calls
-- it; after it is applied, old clients fail closed as described above.

-- ---------------------------------------------------------------------------
-- 1. The self-claim path retires
-- ---------------------------------------------------------------------------
drop function if exists public.claim_account_verification();

-- ---------------------------------------------------------------------------
-- 2. The method check learns the admin grant
-- ---------------------------------------------------------------------------
alter table public.account_verifications
  drop constraint if exists account_verifications_method_check;

alter table public.account_verifications
  add constraint account_verifications_method_check
  check (method in ('invite', 'admin'));

comment on table public.account_verifications is
  'One row per verified person. The row is the blue tick. Since 20261122 the badge is GRANT-ONLY: rows are created only by admin_grant_verification() from a trusted session (owner directive 2026-11-22 — eligibility is the owner''s to release). Clients may select only their own row; no client role can write.';

-- ---------------------------------------------------------------------------
-- 3. The grant — service role only, no UI, ever
-- ---------------------------------------------------------------------------
create or replace function public.admin_grant_verification(p_email text)
returns public.account_verifications
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_invite_created_at timestamptz;
  v_row public.account_verifications;
begin
  select u.id, u.email into v_user_id, v_email
  from auth.users u
  where lower(u.email) = lower(trim(coalesce(p_email, '')));

  if v_user_id is null then
    raise exception using errcode = '22023',
      message = 'No Bloom account exists for that email address.';
  end if;

  /* Already verified: the record stands exactly as it was granted —
     a re-grant returns it untouched and never rewrites verified_at
     or method. */
  select v.* into v_row
  from public.account_verifications v
  where v.user_id = v_user_id;
  if found then
    return v_row;
  end if;

  /* Provenance: when the address is also on the invite list, keep the
     invite's date on the record, as v2 grants did. app_invites stores
     the address lowercased and trimmed (its own check enforces it). */
  select i.created_at into v_invite_created_at
  from public.app_invites i
  where i.email = lower(trim(v_email));

  insert into public.account_verifications (user_id, email, method, invite_created_at)
  values (v_user_id, lower(trim(v_email)), 'admin', v_invite_created_at)
  on conflict (user_id) do nothing
  returning * into v_row;

  if v_row is null then
    /* A concurrent grant won the race; its record is the answer. */
    select v.* into v_row
    from public.account_verifications v
    where v.user_id = v_user_id;
  end if;

  return v_row;
end;
$$;

comment on function public.admin_grant_verification(text) is
  'Grant the verification badge to the account with this email and return the record. SERVICE ROLE ONLY — run from a trusted SQL session: select * from public.admin_grant_verification(''name@example.com''); There is no UI for this, by owner decision (2026-11-22). Idempotent: an existing record is returned untouched.';

revoke all on function public.admin_grant_verification(text) from public, anon, authenticated;
grant execute on function public.admin_grant_verification(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. The revoke — service role only
-- ---------------------------------------------------------------------------
create or replace function public.admin_revoke_verification(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_removed int;
begin
  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(coalesce(p_email, '')));

  if v_user_id is null then
    raise exception using errcode = '22023',
      message = 'No Bloom account exists for that email address.';
  end if;

  delete from public.account_verifications v
  where v.user_id = v_user_id;
  get diagnostics v_removed = row_count;

  return v_removed > 0;
end;
$$;

comment on function public.admin_revoke_verification(text) is
  'Remove the verification record for the account with this email; returns true when a record was removed, false when the account held none. SERVICE ROLE ONLY — run from a trusted SQL session. There is no UI for this, by owner decision (2026-11-22).';

revoke all on function public.admin_revoke_verification(text) from public, anon, authenticated;
grant execute on function public.admin_revoke_verification(text) to service_role;
