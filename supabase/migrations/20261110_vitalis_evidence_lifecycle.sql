-- Bloom Vitalis — Phase 2.2: evidence lifecycle enforcement.
--
-- Additive. Nothing in 20261104/05/06 is dropped, no evidence row is deleted, and
-- no health, authentication or other Bloom table is touched.
--
-- What this migration makes true, at the database rather than by convention:
--
--   1. A status change follows an explicit graph (draft -> in_review -> approved,
--      and the reviewed routes out). `approved -> draft` does not exist at any
--      privilege level: an approved row cannot be silently demoted.
--   2. Every status change records a row-level, attributable lifecycle event with
--      a reason. Missing the reason refuses the change.
--   3. Content may only change by introducing exactly one new version; a version
--      can only ever move by one. Approved text therefore identifies a version.
--   4. Supersession is recorded once and never rewritten. The replacement must be
--      approved, must not itself be superseded, and must not form a cycle.
--   5. A source may not leave `approved` *without a replacement* while an approved
--      claim cites it. Supersession stays available, because that is the designed
--      retirement path and it makes dependent claims non-product-ready.
--   6. Editorial writes arrive only through SECURITY DEFINER functions that check
--      `evidence_editors` against auth.uid(). Direct table writes by service_role
--      are revoked.
--   7. Bulk catalogue application is a labelled import: it requires
--      session_user = 'evidence_importer' (a NOLOGIN role with no password, only
--      reachable via SET LOCAL SESSION AUTHORIZATION) *and* an explicit flag. The
--      import skips the graph, never the gates, and logs one event per moved row.
--   8. Overdue evidence is computable in the database, and a claim may not be
--      approved while a cited source's confirmation has expired.
--
-- Verified before implementation against PostgreSQL 18.6; see
-- docs/vitalis-p2.2-verification-report.md and the reconciled design in
-- docs/vitalis-p2.2-lifecycle-design.md.

-- ---------------------------------------------------------------------------
-- The importer role
-- ---------------------------------------------------------------------------
--
-- Created here rather than by hand: the grants and policies below name it, and a
-- migration that fails when an operator forgot a prerequisite is worse than one
-- that owns the object. NOLOGIN and no password means there is no importer
-- credential to leak; the only way in is a superuser session switching to it for
-- one transaction.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'evidence_importer') then
    create role evidence_importer nologin;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Editorial authority
-- ---------------------------------------------------------------------------
--
-- Separate from app_admins on purpose: administering rewards and approving a
-- medical claim are different grants with different blast radii, and one list
-- would silently confer the second on whoever holds the first.

create table if not exists public.evidence_editors (
  user_id uuid primary key,
  note text check (note is null or char_length(note) between 3 and 300),
  created_at timestamptz not null default now()
);

alter table public.evidence_editors enable row level security;

-- No policy and no grant: membership is not enumerable by a client. The function
-- below is the only way to ask, and it answers with a boolean.
revoke all on table public.evidence_editors from public;
revoke all on table public.evidence_editors from anon;
revoke all on table public.evidence_editors from authenticated;
revoke all on table public.evidence_editors from service_role;

create or replace function public.evidence_is_editor(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.evidence_editors where user_id = p_user);
$$;

revoke all on function public.evidence_is_editor(uuid) from public;
revoke all on function public.evidence_is_editor(uuid) from anon;
grant execute on function public.evidence_is_editor(uuid) to authenticated;
grant execute on function public.evidence_is_editor(uuid) to service_role;

comment on function public.evidence_is_editor(uuid) is
  'Whether this user may edit evidence. Returns a boolean only; the membership table itself is unreadable by clients.';

-- The single guard every editorial RPC runs first. Typed as a separate function
-- so the rule exists once rather than eight times.
create or replace function public.evidence_require_editor()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'evidence editing requires a signed-in user' using errcode = '42501';
  end if;
  if not public.evidence_is_editor(auth.uid()) then
    raise exception 'not an evidence editor' using errcode = '42501';
  end if;
end
$$;

revoke all on function public.evidence_require_editor() from public;
revoke all on function public.evidence_require_editor() from anon;
revoke all on function public.evidence_require_editor() from authenticated;

-- ---------------------------------------------------------------------------
-- Lifecycle events: the mechanical record of decisions
-- ---------------------------------------------------------------------------
--
-- Deliberately separate from evidence_revisions. That table is curated prose: a
-- reviewer decides it is worth writing down what changed and why. This one is
-- generated by the trigger, and a status change cannot happen without one.

create table if not exists public.evidence_lifecycle_events (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('source', 'claim')),
  entity_id text not null check (char_length(entity_id) between 3 and 64),
  from_status text check (
    from_status is null
    or from_status in ('draft', 'in_review', 'approved', 'rejected', 'superseded', 'withdrawn')
  ),
  to_status text not null check (
    to_status in ('draft', 'in_review', 'approved', 'rejected', 'superseded', 'withdrawn')
  ),
  version integer not null check (version >= 1),
  actor uuid,
  actor_label text not null check (char_length(actor_label) between 2 and 80),
  reason text not null check (char_length(reason) between 5 and 500),
  occurred_at timestamptz not null default now()
);

create index if not exists evidence_lifecycle_events_entity_idx
  on public.evidence_lifecycle_events (entity_type, entity_id, occurred_at desc);

alter table public.evidence_lifecycle_events enable row level security;

drop policy if exists evidence_lifecycle_events_read on public.evidence_lifecycle_events;
create policy evidence_lifecycle_events_read on public.evidence_lifecycle_events
  for select to authenticated using (true);

revoke all on table public.evidence_lifecycle_events from public;
revoke all on table public.evidence_lifecycle_events from anon;
revoke all on table public.evidence_lifecycle_events from authenticated;
grant select on table public.evidence_lifecycle_events to authenticated;

revoke all on sequence public.evidence_lifecycle_events_id_seq from public;
revoke all on sequence public.evidence_lifecycle_events_id_seq from anon;
revoke all on sequence public.evidence_lifecycle_events_id_seq from authenticated;

-- Reuses the Phase 1 function: "append-only" should mean the same thing
-- everywhere in this schema, and a second implementation would be a second place
-- to get it wrong.
drop trigger if exists evidence_lifecycle_events_append_only
  on public.evidence_lifecycle_events;
create trigger evidence_lifecycle_events_append_only
  before update on public.evidence_lifecycle_events
  for each row execute function public.health_reject_mutation();

comment on table public.evidence_lifecycle_events is
  'Append-only record of every review-status change: entity, from, to, version, actor and reason. Written by trigger, never by a client. Holds no per-person data beyond the editor identifier.';

-- ---------------------------------------------------------------------------
-- The transition graph
-- ---------------------------------------------------------------------------
--
-- This is src/lib/vitalis/evidence/review.ts, expressed where it is enforced. A
-- static test compares the two lists so they cannot drift.

create or replace function public.evidence_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from (values
        ('draft', 'in_review'),
        ('draft', 'withdrawn'),
        ('in_review', 'approved'),
        ('in_review', 'rejected'),
        ('in_review', 'draft'),
        ('approved', 'superseded'),
        ('approved', 'withdrawn'),
        ('approved', 'in_review'),
        ('rejected', 'draft'),
        ('rejected', 'withdrawn')
      ) as rule (from_status, to_status)
     where rule.from_status = p_from
       and rule.to_status = p_to
  );
$$;

revoke all on function public.evidence_transition_allowed(text, text) from public;
revoke all on function public.evidence_transition_allowed(text, text) from anon;
grant execute on function public.evidence_transition_allowed(text, text) to authenticated;

comment on function public.evidence_transition_allowed(text, text) is
  'The review lifecycle graph. approved -> draft is absent on purpose: it is the silent downgrade this phase exists to prevent.';

-- ---------------------------------------------------------------------------
-- Import identity
-- ---------------------------------------------------------------------------
--
-- Identity is session_user, not current_user: inside a SECURITY DEFINER function
-- current_user is the owner, and a superuser is a member of every role, so a
-- membership test here would authorise everyone. SECURITY INVOKER because this
-- reads session state and nothing else.
--
-- The flag is a mode, never the authorisation: with the identity it does nothing,
-- and an application role can set it freely while remaining unable to import.
-- Note that after a transaction the setting reads as '' rather than NULL, so the
-- comparison must be to 'on'.

create or replace function public.evidence_is_import_session()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select session_user = 'evidence_importer'
     and coalesce(current_setting('bloom.evidence_import', true), 'off') = 'on';
$$;

revoke all on function public.evidence_is_import_session() from public;
revoke all on function public.evidence_is_import_session() from anon;
revoke all on function public.evidence_is_import_session() from authenticated;

comment on function public.evidence_is_import_session() is
  'True only for a session authenticated as evidence_importer with the explicit import flag set. The flag alone never authorises.';

-- ---------------------------------------------------------------------------
-- The lifecycle guard
-- ---------------------------------------------------------------------------

create or replace function public.evidence_assert_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  importing boolean := public.evidence_is_import_session();
  reason text := nullif(btrim(coalesce(current_setting('bloom.evidence_reason', true), '')), '');
  -- Review facts, not content: refreshing a review date or cadence is not an
  -- edit to what the row asserts, so it must not force a version bump.
  bookkeeping constant text[] := array[
    'created_at', 'updated_at', 'review_status', 'superseded_by', 'version',
    'reviewed_on', 'review_interval_months'
  ];
  content_changed boolean;
  target_status text;
  target_superseded text;
  cycles integer;
begin
  if tg_op = 'INSERT' then
    -- Creation is not a transition, but starting life already approved would
    -- bypass review entirely. Only the labelled import may do it.
    if new.review_status not in ('draft', 'in_review') and not importing then
      raise exception 'a new % row must start as draft or in_review', tg_table_name
        using errcode = '42501';
    end if;
    -- A catalogue import may establish an already-retired edition: the
    -- replacement is an FK target, and the history is the point.
    if new.superseded_by is not null and not importing then
      raise exception 'a new % row cannot start superseded', tg_table_name
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'id and created_at are immutable on %', tg_table_name
      using errcode = '42501';
  end if;

  -- Supersession is a fact about history: recorded once, never rewritten.
  if old.superseded_by is not null
     and new.superseded_by is distinct from old.superseded_by then
    raise exception 'supersession on % % is immutable once recorded', tg_table_name, new.id
      using errcode = '42501';
  end if;

  content_changed := (to_jsonb(new) - bookkeeping) is distinct from (to_jsonb(old) - bookkeeping);

  -- Clause 1: an edit requires exactly the next version.
  if content_changed and new.version <> old.version + 1 then
    raise exception 'editing % % requires version % (was %)',
      tg_table_name, new.id, old.version + 1, old.version
      using errcode = '23514';
  end if;

  -- Clause 2: a version may only ever move by one. A re-review that leaves the
  -- text alone may still advance it.
  if new.version <> old.version and new.version <> old.version + 1 then
    raise exception 'version on % % may only increase by one', tg_table_name, new.id
      using errcode = '23514';
  end if;

  if new.review_status is distinct from old.review_status then
    -- The log is written here, in the same statement as the change it describes,
    -- so a status change cannot happen without an event and a refused change
    -- cannot leave one behind. Attribution is derived, never supplied.
    insert into public.evidence_lifecycle_events
      (entity_type, entity_id, from_status, to_status, version, actor, actor_label, reason)
    values (
      case tg_table_name
        when 'evidence_sources' then 'source'
        when 'evidence_claims' then 'claim'
        else tg_table_name
      end,
      new.id,
      old.review_status,
      new.review_status,
      new.version,
      auth.uid(),
      case
        when importing then 'seed:import'
        else 'editor:' || coalesce(auth.uid()::text, 'unknown')
      end,
      case
        when reason is null or char_length(reason) < 5 then 'catalogue import'
        else left(reason, 500)
      end
    );

    if not importing
       and not public.evidence_transition_allowed(old.review_status, new.review_status) then
      raise exception 'cannot move % % from % to %',
        tg_table_name, new.id, old.review_status, new.review_status
        using errcode = '23514';
    end if;

    if reason is null and not importing then
      raise exception 'a status change on % % needs a reason (set bloom.evidence_reason)',
        tg_table_name, new.id
        using errcode = '22023';
    end if;

    if (new.review_status = 'superseded') is distinct from (new.superseded_by is not null) then
      raise exception 'status and supersession pointer must agree on %', tg_table_name
        using errcode = '23514';
    end if;

    -- The replacement must be usable as a replacement.
    if new.review_status = 'superseded' then
      execute format(
        'select review_status, superseded_by from public.%I where id = $1',
        tg_table_name
      )
        into target_status, target_superseded
        using new.superseded_by;

      if target_status is null then
        raise exception 'supersession on % % names an unknown replacement %',
          tg_table_name, new.id, new.superseded_by
          using errcode = '23503';
      end if;
      if target_status <> 'approved' or target_superseded is not null then
        raise exception 'replacement % for % % must be approved and not itself superseded',
          new.superseded_by, tg_table_name, new.id
          using errcode = '23514';
      end if;

      execute format(
        'with recursive chain as (
           select id, superseded_by from public.%I where id = $1
           union all
           select x.id, x.superseded_by
             from public.%I x join chain c on x.id = c.superseded_by
         )
         select count(*)::int from chain where id = $2',
        tg_table_name, tg_table_name
      )
        into cycles
        using new.superseded_by, new.id;

      if cycles > 0 then
        raise exception 'supersession would create a cycle at % %', tg_table_name, new.id
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end
$$;

revoke all on function public.evidence_assert_lifecycle() from public;
revoke all on function public.evidence_assert_lifecycle() from anon;
revoke all on function public.evidence_assert_lifecycle() from authenticated;

-- Named so that the pre-existing approval gate (evidence_claims_approvable) fires
-- first: the licence refusal is the more specific diagnosis of the two.
drop trigger if exists evidence_claims_lifecycle on public.evidence_claims;
create trigger evidence_claims_lifecycle
  before insert or update on public.evidence_claims
  for each row execute function public.evidence_assert_lifecycle();

drop trigger if exists evidence_sources_lifecycle on public.evidence_sources;
create trigger evidence_sources_lifecycle
  before insert or update on public.evidence_sources
  for each row execute function public.evidence_assert_lifecycle();

-- ---------------------------------------------------------------------------
-- Retirement of a cited source
-- ---------------------------------------------------------------------------
--
-- Only an *unreplaced* departure from approved is refused. Supersession carries a
-- replacement, so dependent claims become non-product-ready immediately and
-- nobody is stranded; withdrawal and re-review carry nothing, so doing them while
-- an approved claim cites the source would leave that claim pointing at evidence
-- no reviewer retired.

create or replace function public.evidence_assert_source_change_safe()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  blocking text;
begin
  if old.review_status = 'approved' and new.review_status in ('in_review', 'withdrawn') then
    select string_agg(c.id, ', ' order by c.id)
      into blocking
      from public.evidence_claim_sources l
      join public.evidence_claims c on c.id = l.claim_id
     where l.source_id = new.id
       and c.review_status = 'approved';

    if blocking is not null then
      raise exception
        'source % cannot leave approved without a replacement while approved claim(s) cite it: %',
        new.id, blocking
        using errcode = '23514',
              hint = 'Supersede it with a replacement, or retire those claims first.';
    end if;
  end if;

  return new;
end
$$;

revoke all on function public.evidence_assert_source_change_safe() from public;
revoke all on function public.evidence_assert_source_change_safe() from anon;
revoke all on function public.evidence_assert_source_change_safe() from authenticated;

drop trigger if exists evidence_sources_demotion_guard on public.evidence_sources;
create trigger evidence_sources_demotion_guard
  before update on public.evidence_sources
  for each row execute function public.evidence_assert_source_change_safe();

-- ---------------------------------------------------------------------------
-- Overdue evidence blocks approval
-- ---------------------------------------------------------------------------
--
-- Redefined rather than replaced wholesale: the licence and citation conditions
-- from Phase 2 are preserved verbatim, and one condition is added. Approving on
-- confirmation that has expired is the same defect as approving without a
-- citation, one step removed.

create or replace function public.evidence_assert_claim_approvable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  offending text;
begin
  if new.review_status <> 'approved' then
    return new;
  end if;

  select s.id into offending
    from public.evidence_claim_sources l
    join public.evidence_sources s on s.id = l.source_id
   where l.claim_id = new.id
     and (s.review_status <> 'approved' or not s.product_use_allowed)
   limit 1;

  if offending is not null then
    raise exception
      'claim % cannot be approved: source % is not approved for product use',
      new.id, offending
      using errcode = '23514';
  end if;

  if not exists (
    select 1
      from public.evidence_claim_sources l
      join public.evidence_sources s on s.id = l.source_id
     where l.claim_id = new.id
       and l.direction = 'supports'
  ) then
    raise exception 'claim % cannot be approved without a supporting citation',
      new.id
      using errcode = '23514';
  end if;

  select s.id into offending
    from public.evidence_claim_sources l
    join public.evidence_sources s on s.id = l.source_id
   where l.claim_id = new.id
     and s.review_status = 'approved'
     and s.superseded_by is null
     and s.reviewed_on is not null
     and (s.reviewed_on + make_interval(months => s.review_interval_months))::date < current_date
   limit 1;

  if offending is not null then
    raise exception 'claim % cannot be approved: source % is overdue for review',
      new.id, offending
      using errcode = '23514';
  end if;

  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Supersession pointer agreement on claims
-- ---------------------------------------------------------------------------
--
-- Sources already enforce this; claims only checked the forward direction, so a
-- claim could be approved and carry a supersession pointer at the same time.

alter table public.evidence_claims
  drop constraint if exists evidence_claims_superseded_pair;
alter table public.evidence_claims
  add constraint evidence_claims_superseded_pair
  check ((review_status = 'superseded') = (superseded_by is not null)) not valid;
alter table public.evidence_claims validate constraint evidence_claims_superseded_pair;

-- ---------------------------------------------------------------------------
-- Review dates, visible in the database
-- ---------------------------------------------------------------------------

create or replace view public.evidence_review_due
with (security_invoker = true) as
select
  'source'::text as entity_type,
  s.id,
  s.reviewed_on,
  s.review_interval_months,
  (s.reviewed_on + make_interval(months => s.review_interval_months))::date as due_on
from public.evidence_sources s
where s.review_status = 'approved'
  and s.superseded_by is null
union all
select
  'claim'::text,
  c.id,
  c.reviewed_on,
  c.review_interval_months,
  (c.reviewed_on + make_interval(months => c.review_interval_months))::date
from public.evidence_claims c
where c.review_status = 'approved'
  and c.superseded_by is null;

revoke all on public.evidence_review_due from public;
revoke all on public.evidence_review_due from anon;
grant select on public.evidence_review_due to authenticated;

comment on view public.evidence_review_due is
  'Approved rows and the date their confirmation expires. Read-only; expiry is a predicate, never a stored demotion.';

-- ---------------------------------------------------------------------------
-- Editorial RPCs
-- ---------------------------------------------------------------------------
--
-- Every one checks evidence_editors against auth.uid(), fences on the values the
-- caller read, and carries a reason into the trigger through a transaction-local
-- setting. There is no path that lets a caller supply product_use_allowed: the
-- flags follow license_id by CHECK constraint.

create or replace function public.evidence_transition_claim(
  p_id text,
  p_to text,
  p_expected_status text,
  p_expected_version integer,
  p_reason text,
  p_superseded_by text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.evidence_claims;
begin
  perform public.evidence_require_editor();

  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'a reason of at least 10 characters is required' using errcode = '22023';
  end if;

  select * into current_row from public.evidence_claims where id = p_id for update;
  if not found then
    raise exception 'unknown claim %', p_id using errcode = 'P0002';
  end if;
  if current_row.review_status <> p_expected_status
     or current_row.version <> p_expected_version then
    raise exception 'claim % is now % at version %',
      p_id, current_row.review_status, current_row.version
      using errcode = '40001';
  end if;

  if p_to = 'superseded' then
    if p_superseded_by is null then
      raise exception 'supersession needs a replacement claim' using errcode = '22023';
    end if;
    -- Serialise against a concurrent supersession in the other direction, so two
    -- transactions cannot each pass the cycle check and then commit a loop.
    perform 1 from public.evidence_claims where id = p_superseded_by for update;
  end if;

  perform set_config('bloom.evidence_reason', btrim(p_reason), true);

  update public.evidence_claims
     set review_status = p_to,
         superseded_by = case when p_to = 'superseded' then p_superseded_by
                              else superseded_by end,
         reviewed_on = case when p_to in ('approved', 'rejected')
                            then coalesce(reviewed_on, current_date)
                            else reviewed_on end,
         updated_at = now()
   where id = p_id;

  return (select to_jsonb(c) from public.evidence_claims c where c.id = p_id);
end
$$;

create or replace function public.evidence_transition_source(
  p_id text,
  p_to text,
  p_expected_status text,
  p_expected_version integer,
  p_reason text,
  p_superseded_by text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.evidence_sources;
begin
  perform public.evidence_require_editor();

  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'a reason of at least 10 characters is required' using errcode = '22023';
  end if;

  select * into current_row from public.evidence_sources where id = p_id for update;
  if not found then
    raise exception 'unknown source %', p_id using errcode = 'P0002';
  end if;
  if current_row.review_status <> p_expected_status
     or current_row.version <> p_expected_version then
    raise exception 'source % is now % at version %',
      p_id, current_row.review_status, current_row.version
      using errcode = '40001';
  end if;

  if p_to = 'superseded' then
    if p_superseded_by is null then
      raise exception 'supersession needs a replacement source' using errcode = '22023';
    end if;
    perform 1 from public.evidence_sources where id = p_superseded_by for update;
  end if;

  perform set_config('bloom.evidence_reason', btrim(p_reason), true);

  update public.evidence_sources
     set review_status = p_to,
         superseded_by = case when p_to = 'superseded' then p_superseded_by
                              else superseded_by end,
         reviewed_on = case when p_to in ('approved', 'rejected')
                            then coalesce(reviewed_on, current_date)
                            else reviewed_on end,
         updated_at = now()
   where id = p_id;

  return (select to_jsonb(s) from public.evidence_sources s where s.id = p_id);
end
$$;

create or replace function public.evidence_update_claim(
  p_id text,
  p_patch jsonb,
  p_expected_version integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  patch public.evidence_claims;
  updated integer;
begin
  perform public.evidence_require_editor();

  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'a reason of at least 10 characters is required' using errcode = '22023';
  end if;

  patch := jsonb_populate_record(null::public.evidence_claims, p_patch);

  perform set_config('bloom.evidence_reason', btrim(p_reason), true);

  update public.evidence_claims c
     set statement = coalesce(patch.statement, c.statement),
         grade = coalesce(patch.grade, c.grade),
         confidence = coalesce(patch.confidence, c.confidence),
         population = coalesce(patch.population, c.population),
         uncertainty = coalesce(patch.uncertainty, c.uncertainty),
         limitations = coalesce(patch.limitations, c.limitations),
         contraindications = coalesce(patch.contraindications, c.contraindications),
         review_interval_months = coalesce(patch.review_interval_months, c.review_interval_months),
         version = c.version + 1,
         updated_at = now()
   where c.id = p_id
     and c.version = p_expected_version;

  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'claim % is not at version %', p_id, p_expected_version
      using errcode = '40001';
  end if;

  return (select to_jsonb(c) from public.evidence_claims c where c.id = p_id);
end
$$;

create or replace function public.evidence_update_source(
  p_id text,
  p_patch jsonb,
  p_expected_version integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  patch public.evidence_sources;
  next_license text;
  updated integer;
begin
  perform public.evidence_require_editor();

  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'a reason of at least 10 characters is required' using errcode = '22023';
  end if;

  patch := jsonb_populate_record(null::public.evidence_sources, p_patch);
  select coalesce(patch.license_id, s.license_id) into next_license
    from public.evidence_sources s where s.id = p_id;

  if next_license is null then
    raise exception 'unknown source %', p_id using errcode = 'P0002';
  end if;

  perform set_config('bloom.evidence_reason', btrim(p_reason), true);

  update public.evidence_sources s
     set title = coalesce(patch.title, s.title),
         kind = coalesce(patch.kind, s.kind),
         publisher = coalesce(patch.publisher, s.publisher),
         authors = coalesce(patch.authors, s.authors),
         publication_year = coalesce(patch.publication_year, s.publication_year),
         url = coalesce(patch.url, s.url),
         license_id = next_license,
         -- Derived, never supplied: the licence decides what we may do.
         product_use_allowed = next_license in ('us-public-domain', 'cc0-1.0', 'cc-by-4.0'),
         permission_required = next_license in (
           'fao-noncommercial', 'nin-copyright-restricted',
           'proprietary-permission-required', 'unknown'
         ),
         license_url = coalesce(patch.license_url, s.license_url),
         license_note = coalesce(patch.license_note, s.license_note),
         peer_reviewed = coalesce(patch.peer_reviewed, s.peer_reviewed),
         retrieved_on = coalesce(patch.retrieved_on, s.retrieved_on),
         published_on = coalesce(patch.published_on, s.published_on),
         reviewed_on = coalesce(patch.reviewed_on, s.reviewed_on),
         review_interval_months = coalesce(patch.review_interval_months, s.review_interval_months),
         notes = coalesce(patch.notes, s.notes),
         version = s.version + 1,
         updated_at = now()
   where s.id = p_id
     and s.version = p_expected_version;

  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'source % is not at version %', p_id, p_expected_version
      using errcode = '40001';
  end if;

  return (select to_jsonb(s) from public.evidence_sources s where s.id = p_id);
end
$$;

create or replace function public.evidence_attach_citation(
  p_claim_id text,
  p_source_id text,
  p_direction text,
  p_locator text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.evidence_require_editor();

  insert into public.evidence_claim_sources (claim_id, source_id, direction, locator)
  values (p_claim_id, p_source_id, p_direction, p_locator)
  on conflict (claim_id, source_id)
  do update set direction = excluded.direction, locator = excluded.locator;
end
$$;

create or replace function public.evidence_detach_citation(
  p_claim_id text,
  p_source_id text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claim_status text;
  removed public.evidence_claim_sources;
  supporting integer;
begin
  perform public.evidence_require_editor();

  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'a reason of at least 10 characters is required' using errcode = '22023';
  end if;

  select review_status into claim_status from public.evidence_claims where id = p_claim_id;
  if claim_status is null then
    raise exception 'unknown claim %', p_claim_id using errcode = 'P0002';
  end if;

  select * into removed
    from public.evidence_claim_sources
   where claim_id = p_claim_id and source_id = p_source_id;

  if not found then
    raise exception 'claim % does not cite %', p_claim_id, p_source_id
      using errcode = 'P0002';
  end if;

  if claim_status = 'approved' and removed.direction = 'supports' then
    select count(*)::int into supporting
      from public.evidence_claim_sources
     where claim_id = p_claim_id and direction = 'supports';
    if supporting <= 1 then
      raise exception 'claim % cannot lose its last supporting citation while approved',
        p_claim_id
        using errcode = '23514';
    end if;
  end if;

  delete from public.evidence_claim_sources
   where claim_id = p_claim_id and source_id = p_source_id;

  -- Removal is a meaningful editorial act, so it is narrated in the curated
  -- history rather than left to the absence of a row.
  insert into public.evidence_revisions
    (entity_type, entity_id, version, changed_on, changed_by, summary)
  select 'claim', c.id, c.version, current_date, 'editor:' || auth.uid()::text,
         left(format('Removed citation %s: %s', p_source_id, btrim(p_reason)), 500)
    from public.evidence_claims c
   where c.id = p_claim_id;
end
$$;

create or replace function public.evidence_link_recommendation(
  p_recommendation_id text,
  p_claim_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.evidence_require_editor();

  insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
  values (p_recommendation_id, p_claim_id)
  on conflict do nothing;
end
$$;

create or replace function public.evidence_unlink_recommendation(
  p_recommendation_id text,
  p_claim_id text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  perform public.evidence_require_editor();

  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'a reason of at least 10 characters is required' using errcode = '22023';
  end if;

  delete from public.evidence_recommendation_claims
   where recommendation_id = p_recommendation_id and claim_id = p_claim_id;

  get diagnostics removed = row_count;
  if removed = 0 then
    raise exception 'recommendation % does not cite %', p_recommendation_id, p_claim_id
      using errcode = 'P0002';
  end if;

  insert into public.evidence_revisions
    (entity_type, entity_id, version, changed_on, changed_by, summary)
  select 'claim', c.id, c.version, current_date, 'editor:' || auth.uid()::text,
         left(format('Unlinked recommendation %s: %s', p_recommendation_id, btrim(p_reason)), 500)
    from public.evidence_claims c
   where c.id = p_claim_id;
end
$$;

create or replace function public.evidence_add_revision(
  p_entity_type text,
  p_entity_id text,
  p_version integer,
  p_summary text,
  p_snapshot jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_id bigint;
  known boolean;
begin
  perform public.evidence_require_editor();

  if p_summary is null or char_length(btrim(p_summary)) < 5 then
    raise exception 'a revision summary of at least 5 characters is required' using errcode = '22023';
  end if;

  if p_entity_type = 'source' then
    select exists (select 1 from public.evidence_sources where id = p_entity_id) into known;
  elsif p_entity_type = 'claim' then
    select exists (select 1 from public.evidence_claims where id = p_entity_id) into known;
  else
    raise exception 'unknown entity type %', p_entity_type using errcode = '22023';
  end if;

  if not known then
    raise exception 'unknown % %', p_entity_type, p_entity_id using errcode = 'P0002';
  end if;

  insert into public.evidence_revisions
    (entity_type, entity_id, version, changed_on, changed_by, summary, snapshot)
  values
    (p_entity_type, p_entity_id, p_version, current_date, 'editor:' || auth.uid()::text,
     btrim(p_summary), coalesce(p_snapshot, '{}'::jsonb))
  returning id into new_id;

  return new_id;
end
$$;

create or replace function public.evidence_review_queue(p_as_of date default current_date)
returns table (
  entity_type text,
  id text,
  reviewed_on date,
  due_on date,
  days_overdue integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.evidence_require_editor();

  return query
    select q.entity_type, q.id, q.reviewed_on, q.due_on, (p_as_of - q.due_on)::integer
      from public.evidence_review_due q
     where q.due_on < p_as_of
     order by q.due_on asc, q.id asc;
end
$$;

-- Function privileges: signed-in callers execute the editorial surface, anon
-- never does, and the internal guards are not callable at all.
revoke all on function public.evidence_transition_claim(text, text, text, integer, text, text) from public;
revoke all on function public.evidence_transition_source(text, text, text, integer, text, text) from public;
revoke all on function public.evidence_update_claim(text, jsonb, integer, text) from public;
revoke all on function public.evidence_update_source(text, jsonb, integer, text) from public;
revoke all on function public.evidence_attach_citation(text, text, text, text) from public;
revoke all on function public.evidence_detach_citation(text, text, text) from public;
revoke all on function public.evidence_link_recommendation(text, text) from public;
revoke all on function public.evidence_unlink_recommendation(text, text, text) from public;
revoke all on function public.evidence_add_revision(text, text, integer, text, jsonb) from public;
revoke all on function public.evidence_review_queue(date) from public;

revoke all on function public.evidence_transition_claim(text, text, text, integer, text, text) from anon;
revoke all on function public.evidence_transition_source(text, text, text, integer, text, text) from anon;
revoke all on function public.evidence_update_claim(text, jsonb, integer, text) from anon;
revoke all on function public.evidence_update_source(text, jsonb, integer, text) from anon;
revoke all on function public.evidence_attach_citation(text, text, text, text) from anon;
revoke all on function public.evidence_detach_citation(text, text, text) from anon;
revoke all on function public.evidence_link_recommendation(text, text) from anon;
revoke all on function public.evidence_unlink_recommendation(text, text, text) from anon;
revoke all on function public.evidence_add_revision(text, text, integer, text, jsonb) from anon;
revoke all on function public.evidence_review_queue(date) from anon;

grant execute on function public.evidence_transition_claim(text, text, text, integer, text, text) to authenticated;
grant execute on function public.evidence_transition_source(text, text, text, integer, text, text) to authenticated;
grant execute on function public.evidence_update_claim(text, jsonb, integer, text) to authenticated;
grant execute on function public.evidence_update_source(text, jsonb, integer, text) to authenticated;
grant execute on function public.evidence_attach_citation(text, text, text, text) to authenticated;
grant execute on function public.evidence_detach_citation(text, text, text) to authenticated;
grant execute on function public.evidence_link_recommendation(text, text) to authenticated;
grant execute on function public.evidence_unlink_recommendation(text, text, text) to authenticated;
grant execute on function public.evidence_add_revision(text, text, integer, text, jsonb) to authenticated;
grant execute on function public.evidence_review_queue(date) to authenticated;

-- ---------------------------------------------------------------------------
-- service_role loses direct writes
-- ---------------------------------------------------------------------------
--
-- Read access stays: evidence is public reference material. Writes move to the
-- RPCs above, so the only actor with table-level write privilege is the import
-- path and the owner. `delete` disappears from the two link tables as well, which
-- is stricter than Phase 2 and matches the seed's "never delete" promise.

revoke insert, update, delete on table public.evidence_sources from service_role;
revoke insert, update, delete on table public.evidence_claims from service_role;
revoke insert, update, delete on table public.evidence_claim_sources from service_role;
revoke insert, update, delete on table public.evidence_recommendations from service_role;
revoke insert, delete on table public.evidence_recommendation_claims from service_role;
revoke insert on table public.evidence_revisions from service_role;
revoke usage, select on sequence public.evidence_revisions_id_seq from service_role;

-- ---------------------------------------------------------------------------
-- The import path's privileges
-- ---------------------------------------------------------------------------
--
-- Sixteen policies, not twelve: read/write/update on four tables, read/write on
-- the two link/history tables. No delete anywhere. No BYPASSRLS: that attribute
-- would also bypass row security on the Phase 1 health tables.

grant select, insert, update on table public.evidence_sources to evidence_importer;
grant select, insert, update on table public.evidence_claims to evidence_importer;
grant select, insert, update on table public.evidence_claim_sources to evidence_importer;
grant select, insert, update on table public.evidence_recommendations to evidence_importer;
grant select, insert on table public.evidence_recommendation_claims to evidence_importer;
grant select, insert on table public.evidence_revisions to evidence_importer;
grant usage, select on sequence public.evidence_revisions_id_seq to evidence_importer;

drop policy if exists evidence_sources_import_read on public.evidence_sources;
create policy evidence_sources_import_read on public.evidence_sources
  for select to evidence_importer using (true);
drop policy if exists evidence_sources_import_insert on public.evidence_sources;
create policy evidence_sources_import_insert on public.evidence_sources
  for insert to evidence_importer with check (true);
drop policy if exists evidence_sources_import_update on public.evidence_sources;
create policy evidence_sources_import_update on public.evidence_sources
  for update to evidence_importer using (true) with check (true);

drop policy if exists evidence_claims_import_read on public.evidence_claims;
create policy evidence_claims_import_read on public.evidence_claims
  for select to evidence_importer using (true);
drop policy if exists evidence_claims_import_insert on public.evidence_claims;
create policy evidence_claims_import_insert on public.evidence_claims
  for insert to evidence_importer with check (true);
drop policy if exists evidence_claims_import_update on public.evidence_claims;
create policy evidence_claims_import_update on public.evidence_claims
  for update to evidence_importer using (true) with check (true);

drop policy if exists evidence_claim_sources_import_read on public.evidence_claim_sources;
create policy evidence_claim_sources_import_read on public.evidence_claim_sources
  for select to evidence_importer using (true);
drop policy if exists evidence_claim_sources_import_insert on public.evidence_claim_sources;
create policy evidence_claim_sources_import_insert on public.evidence_claim_sources
  for insert to evidence_importer with check (true);
drop policy if exists evidence_claim_sources_import_update on public.evidence_claim_sources;
create policy evidence_claim_sources_import_update on public.evidence_claim_sources
  for update to evidence_importer using (true) with check (true);

drop policy if exists evidence_recommendations_import_read on public.evidence_recommendations;
create policy evidence_recommendations_import_read on public.evidence_recommendations
  for select to evidence_importer using (true);
drop policy if exists evidence_recommendations_import_insert on public.evidence_recommendations;
create policy evidence_recommendations_import_insert on public.evidence_recommendations
  for insert to evidence_importer with check (true);
drop policy if exists evidence_recommendations_import_update on public.evidence_recommendations;
create policy evidence_recommendations_import_update on public.evidence_recommendations
  for update to evidence_importer using (true) with check (true);

drop policy if exists evidence_recommendation_claims_import_read on public.evidence_recommendation_claims;
create policy evidence_recommendation_claims_import_read
  on public.evidence_recommendation_claims
  for select to evidence_importer using (true);
drop policy if exists evidence_recommendation_claims_import_insert on public.evidence_recommendation_claims;
create policy evidence_recommendation_claims_import_insert
  on public.evidence_recommendation_claims
  for insert to evidence_importer with check (true);

drop policy if exists evidence_revisions_import_read on public.evidence_revisions;
create policy evidence_revisions_import_read on public.evidence_revisions
  for select to evidence_importer using (true);
drop policy if exists evidence_revisions_import_insert on public.evidence_revisions;
create policy evidence_revisions_import_insert on public.evidence_revisions
  for insert to evidence_importer with check (true);

-- ---------------------------------------------------------------------------
-- Baseline
-- ---------------------------------------------------------------------------
--
-- The log starts complete rather than claiming nothing ever happened: every row
-- that already carries a reviewed status is recorded once, at the moment this
-- file first runs. The whole block is skipped when the log already holds any
-- event, because that means enforcement was already in place — a later row that
-- arrived without history did so *under* enforcement, and calling it a baseline
-- would be a lie. Skipping the block is also what makes a re-apply a true no-op.

do $$
begin
  if exists (select 1 from public.evidence_lifecycle_events) then
    return;
  end if;

  insert into public.evidence_lifecycle_events
    (entity_type, entity_id, from_status, to_status, version, actor, actor_label, reason)
  select 'source', s.id, null, s.review_status, s.version, null, 'migration:baseline',
         'baseline recorded when lifecycle enforcement was introduced'
    from public.evidence_sources s
   where s.review_status <> 'draft';

  insert into public.evidence_lifecycle_events
    (entity_type, entity_id, from_status, to_status, version, actor, actor_label, reason)
  select 'claim', c.id, null, c.review_status, c.version, null, 'migration:baseline',
         'baseline recorded when lifecycle enforcement was introduced'
    from public.evidence_claims c
   where c.review_status <> 'draft';
end
$$;

-- ---------------------------------------------------------------------------
-- Notes for the next reader
-- ---------------------------------------------------------------------------

comment on table public.evidence_editors is
  'Users permitted to edit and review evidence. Unreadable by clients; ask through evidence_is_editor(). Separate from app_admins because approving a medical claim is a different authority from administering rewards.';

comment on function public.evidence_transition_claim(text, text, text, integer, text, text) is
  'Moves a claim along the lifecycle graph. Fences on the status and version the caller read, requires a reason, and records the change in evidence_lifecycle_events.';

comment on function public.evidence_transition_source(text, text, text, integer, text, text) is
  'Moves a source along the lifecycle graph. Refuses to withdraw or re-review a source that an approved claim cites; supersession remains the retirement route.';

comment on function public.evidence_update_claim(text, jsonb, integer, text) is
  'Edits claim content and advances the version by exactly one. Accepts only content fields; status, version and supersession are not patchable.';

comment on function public.evidence_update_source(text, jsonb, integer, text) is
  'Edits source content and advances the version by exactly one. product_use_allowed and permission_required are recomputed from the licence, never supplied.';

comment on function public.evidence_detach_citation(text, text, text) is
  'Removes one citation, with a reason, and narrates it in evidence_revisions. Refuses to leave an approved claim without a supporting citation.';

comment on function public.evidence_review_queue(date) is
  'Overdue approved rows, oldest first. Editor-only; the same data is visible to any signed-in reader through evidence_review_due.';

comment on table public.evidence_claims is
  'Statements Vitalis may make, with grade, confidence, population, uncertainty, limitations and contraindications. Lifecycle: draft -> in_review -> approved, with reviewed exits; approved can never return to draft. Every status change is recorded in evidence_lifecycle_events with its reason.';
