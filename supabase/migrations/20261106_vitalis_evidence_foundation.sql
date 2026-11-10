-- Bloom Vitalis — Phase 2 scientific foundation: the evidence registry.
--
-- Additive only. No Phase 1 table, policy, function or grant is altered, and
-- `erase_my_data()` is deliberately NOT redefined: evidence is global reference
-- material, holds no per-person rows, and must survive a person deleting their
-- account (a guideline does not become untrue because one user leaves).
--
-- Six tables:
--   evidence_sources                  a published source, with its licence
--   evidence_claims                   a statement we may make, with its grade
--   evidence_claim_sources            claim -> source citations, with locators
--   evidence_recommendations          a product rule that needs evidence
--   evidence_recommendation_claims    recommendation -> claim traceability
--   evidence_revisions                append-only change history
--
-- Two rules are enforced here rather than only in TypeScript, because they are
-- the ones that decide whether copyrighted material ships:
--
--   1. A source's product_use flag must match its licence. The check constraints
--      below make the permissive licences the only ones that can be marked
--      usable, so a hand-edited row cannot grant itself permission.
--   2. A claim cannot reach 'approved' while it cites a source that is not
--      approved for product use. This is a trigger, not a convention: the
--      database refuses the update. Approval therefore requires the licence
--      question to have been answered first.
--
-- Access model, matching Phase 1's explicitness rather than relying on Supabase
-- defaults:
--   anon          nothing at all
--   authenticated read-only, on every evidence table
--   service_role  read and write the catalogue; append to history only
--
-- Nothing here is writable by a signed-in person: the evidence base is editorial
-- content, not user data, and a client that could write it could fabricate
-- support for a claim.

-- ---------------------------------------------------------------------------
-- Sources
-- ---------------------------------------------------------------------------

create table if not exists public.evidence_sources (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9.-]{2,63}$'),
  title text not null check (char_length(title) between 3 and 400),
  kind text not null check (kind in (
    'guideline', 'systematic_review', 'randomised_trial', 'cohort_study',
    'case_report', 'government_report', 'dataset', 'textbook', 'expert_opinion'
  )),
  publisher text not null check (char_length(publisher) between 2 and 300),
  authors text[] not null default '{}'::text[],
  publication_year smallint not null check (publication_year between 1900 and 2100),
  url text not null check (url ~ '^https://'),
  license_id text not null check (license_id in (
    'us-public-domain', 'cc0-1.0', 'cc-by-4.0', 'fao-noncommercial',
    'nin-copyright-restricted', 'proprietary-permission-required', 'unknown'
  )),
  license_url text check (license_url is null or license_url ~ '^https://'),
  license_note text not null check (char_length(license_note) >= 20),
  product_use_allowed boolean not null,
  permission_required boolean not null,
  peer_reviewed boolean not null default false,
  retrieved_on date not null,
  published_on date,
  reviewed_on date,
  review_interval_months smallint not null check (review_interval_months between 1 and 120),
  review_status text not null check (review_status in (
    'draft', 'in_review', 'approved', 'rejected', 'superseded', 'withdrawn'
  )),
  version integer not null default 1 check (version >= 1),
  superseded_by text references public.evidence_sources (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The licence decides usability. Only the three permissive licences may be
  -- marked as usable, so these flags cannot be set to whatever a client hopes.
  constraint evidence_sources_license_consistent check (
    product_use_allowed = (license_id in ('us-public-domain', 'cc0-1.0', 'cc-by-4.0'))
  ),
  constraint evidence_sources_permission_consistent check (
    permission_required = (
      license_id in (
        'fao-noncommercial', 'nin-copyright-restricted',
        'proprietary-permission-required', 'unknown'
      )
    )
  ),
  -- An approved source must say when it was last checked, or the re-review sweep
  -- has no clock to measure it against.
  constraint evidence_sources_approved_reviewed check (
    review_status <> 'approved' or reviewed_on is not null
  ),
  -- Supersession is a pair: the status and the pointer must agree.
  constraint evidence_sources_superseded_pair check (
    (review_status = 'superseded') = (superseded_by is not null)
  )
);

create index if not exists evidence_sources_kind_idx
  on public.evidence_sources (kind, review_status);
create index if not exists evidence_sources_review_idx
  on public.evidence_sources (review_status, reviewed_on);

-- ---------------------------------------------------------------------------
-- Claims
-- ---------------------------------------------------------------------------

create table if not exists public.evidence_claims (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9.-]{2,63}$'),
  statement text not null check (char_length(statement) between 10 and 700),
  topic text not null check (topic in (
    'energy_requirement', 'energy_balance', 'weight_change_rate',
    'dietary_pattern', 'protein', 'hydration', 'food_composition',
    'physical_activity'
  )),
  grade text not null check (grade in ('strong', 'moderate', 'limited', 'insufficient')),
  confidence numeric(3, 2) not null check (confidence >= 0 and confidence <= 1),
  population text not null check (char_length(population) between 3 and 300),
  uncertainty jsonb not null default '[]'::jsonb check (jsonb_typeof(uncertainty) = 'array'),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  contraindications jsonb not null default '[]'::jsonb
    check (jsonb_typeof(contraindications) = 'array'),
  review_status text not null check (review_status in (
    'draft', 'in_review', 'approved', 'rejected', 'superseded', 'withdrawn'
  )),
  version integer not null default 1 check (version >= 1),
  reviewed_on date,
  review_interval_months smallint not null default 12
    check (review_interval_months between 1 and 120),
  superseded_by text references public.evidence_claims (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint evidence_claims_approved_reviewed check (
    review_status <> 'approved' or reviewed_on is not null
  ),
  -- Anything short of a strong grade has to say what is still unknown. A claim
  -- that reads as certain but rests on weak evidence is the failure this stops.
  constraint evidence_claims_uncertainty_declared check (
    grade = 'strong' or jsonb_array_length(uncertainty) > 0
  ),
  constraint evidence_claims_superseded_pointer check (
    review_status <> 'superseded' or superseded_by is not null
  )
);

create index if not exists evidence_claims_topic_idx
  on public.evidence_claims (topic, review_status);

-- ---------------------------------------------------------------------------
-- Citations
-- ---------------------------------------------------------------------------

create table if not exists public.evidence_claim_sources (
  claim_id text not null references public.evidence_claims (id) on delete cascade,
  source_id text not null references public.evidence_sources (id) on delete restrict,
  direction text not null check (direction in ('supports', 'contradicts', 'mixed')),
  -- "The source says so" is not traceable. A locator is mandatory.
  locator text not null check (char_length(locator) between 3 and 300),
  created_at timestamptz not null default now(),
  primary key (claim_id, source_id)
);

create index if not exists evidence_claim_sources_source_idx
  on public.evidence_claim_sources (source_id);

-- ---------------------------------------------------------------------------
-- Recommendation traceability
-- ---------------------------------------------------------------------------

create table if not exists public.evidence_recommendations (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9.-]{2,63}$'),
  rationale text not null check (char_length(rationale) between 10 and 700),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_recommendation_claims (
  recommendation_id text not null
    references public.evidence_recommendations (id) on delete cascade,
  claim_id text not null references public.evidence_claims (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (recommendation_id, claim_id)
);

-- ---------------------------------------------------------------------------
-- Change history
-- ---------------------------------------------------------------------------

create table if not exists public.evidence_revisions (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('source', 'claim')),
  entity_id text not null check (char_length(entity_id) between 3 and 64),
  version integer not null check (version >= 1),
  changed_on date not null,
  changed_by text not null check (char_length(changed_by) between 2 and 80),
  summary text not null check (char_length(summary) between 5 and 500),
  snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists evidence_revisions_entity_idx
  on public.evidence_revisions (entity_type, entity_id, version desc);

-- ---------------------------------------------------------------------------
-- The licence gate
-- ---------------------------------------------------------------------------

-- A claim may only be approved when every source it cites is itself approved and
-- licensed for product use, and at least one citation supports it. Without this,
-- approval and licensing could disagree and the product could ship material it
-- has no right to reproduce.
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

  return new;
end;
$$;

revoke all on function public.evidence_assert_claim_approvable() from public;
revoke all on function public.evidence_assert_claim_approvable() from anon;
revoke all on function public.evidence_assert_claim_approvable() from authenticated;

drop trigger if exists evidence_claims_approvable on public.evidence_claims;
create trigger evidence_claims_approvable
  before insert or update on public.evidence_claims
  for each row execute function public.evidence_assert_claim_approvable();

-- The same gate from the other side: a new citation cannot be attached to an
-- already-approved claim if the source may not be shipped.
create or replace function public.evidence_assert_link_licensed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claim_status text;
  source_status text;
  source_allowed boolean;
begin
  select review_status into claim_status
    from public.evidence_claims where id = new.claim_id;
  select review_status, product_use_allowed into source_status, source_allowed
    from public.evidence_sources where id = new.source_id;

  if claim_status = 'approved' and (source_status <> 'approved' or not source_allowed) then
    raise exception
      'claim % is approved; source % is not approved for product use',
      new.claim_id, new.source_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.evidence_assert_link_licensed() from public;
revoke all on function public.evidence_assert_link_licensed() from anon;
revoke all on function public.evidence_assert_link_licensed() from authenticated;

drop trigger if exists evidence_claim_sources_licensed on public.evidence_claim_sources;
create trigger evidence_claim_sources_licensed
  before insert or update on public.evidence_claim_sources
  for each row execute function public.evidence_assert_link_licensed();

-- History is append-only, enforced at the table because RLS and grants are both
-- bypassed by the owner. Reuses the Phase 1 trigger function rather than adding a
-- second one with identical behaviour.
drop trigger if exists evidence_revisions_append_only on public.evidence_revisions;
create trigger evidence_revisions_append_only
  before update on public.evidence_revisions
  for each row execute function public.health_reject_mutation();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
--
-- Evidence is public reference material, not personal data, so the policies are
-- "any signed-in reader" rather than "the owner". Writing is not permitted to
-- anyone holding a user session: this content is editorial.

alter table public.evidence_sources enable row level security;
alter table public.evidence_claims enable row level security;
alter table public.evidence_claim_sources enable row level security;
alter table public.evidence_recommendations enable row level security;
alter table public.evidence_recommendation_claims enable row level security;
alter table public.evidence_revisions enable row level security;

create policy evidence_sources_read on public.evidence_sources
  for select to authenticated using (true);
create policy evidence_claims_read on public.evidence_claims
  for select to authenticated using (true);
create policy evidence_claim_sources_read on public.evidence_claim_sources
  for select to authenticated using (true);
create policy evidence_recommendations_read on public.evidence_recommendations
  for select to authenticated using (true);
create policy evidence_recommendation_claims_read on public.evidence_recommendation_claims
  for select to authenticated using (true);
create policy evidence_revisions_read on public.evidence_revisions
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Explicit privileges
-- ---------------------------------------------------------------------------

revoke all on table public.evidence_sources from public;
revoke all on table public.evidence_sources from anon;
revoke all on table public.evidence_sources from authenticated;
grant select on table public.evidence_sources to authenticated;
grant select, insert, update on table public.evidence_sources to service_role;

revoke all on table public.evidence_claims from public;
revoke all on table public.evidence_claims from anon;
revoke all on table public.evidence_claims from authenticated;
grant select on table public.evidence_claims to authenticated;
grant select, insert, update on table public.evidence_claims to service_role;

revoke all on table public.evidence_claim_sources from public;
revoke all on table public.evidence_claim_sources from anon;
revoke all on table public.evidence_claim_sources from authenticated;
grant select on table public.evidence_claim_sources to authenticated;
grant select, insert, update, delete on table public.evidence_claim_sources to service_role;

revoke all on table public.evidence_recommendations from public;
revoke all on table public.evidence_recommendations from anon;
revoke all on table public.evidence_recommendations from authenticated;
grant select on table public.evidence_recommendations to authenticated;
grant select, insert, update on table public.evidence_recommendations to service_role;

revoke all on table public.evidence_recommendation_claims from public;
revoke all on table public.evidence_recommendation_claims from anon;
revoke all on table public.evidence_recommendation_claims from authenticated;
grant select on table public.evidence_recommendation_claims to authenticated;
grant select, insert, delete on table public.evidence_recommendation_claims to service_role;

-- History: append only. No update and no delete grant exists for any role, and
-- the trigger above rejects an update even from the owner.
revoke all on table public.evidence_revisions from public;
revoke all on table public.evidence_revisions from anon;
revoke all on table public.evidence_revisions from authenticated;
grant select on table public.evidence_revisions to authenticated;
grant select, insert on table public.evidence_revisions to service_role;

revoke all on sequence public.evidence_revisions_id_seq from public;
revoke all on sequence public.evidence_revisions_id_seq from anon;
revoke all on sequence public.evidence_revisions_id_seq from authenticated;
grant usage, select on sequence public.evidence_revisions_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

comment on table public.evidence_sources is
  'Published sources behind Vitalis claims, each with the licence as read from the publisher. product_use_allowed is constrained by license_id: only public-domain and CC licences may be marked usable. Global reference data; never touched by erase_my_data().';

comment on table public.evidence_claims is
  'Statements Vitalis may make, with grade, confidence, population, uncertainty, limitations and contraindications. Cannot reach approved status without an approved, product-use-licensed supporting citation.';

comment on table public.evidence_claim_sources is
  'Claim-to-source citations with a required locator and a direction. The locator is what makes a claim traceable rather than merely attributed.';

comment on table public.evidence_recommendations is
  'Product rules that must be justified by evidence. Phase 2 records them for traceability only; it generates no plans.';

comment on table public.evidence_recommendation_claims is
  'Which claims justify which recommendation, so a shipped rule can be traced back to a source.';

comment on table public.evidence_revisions is
  'Append-only history of changes to sources and claims. Updates are rejected by trigger; no role holds update or delete.';
