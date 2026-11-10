-- Bloom Vitalis — Phase 2.2 follow-up (A2): a version always has a narrative.
--
-- Phase 2.2 lets a version advance by exactly one and records a lifecycle event
-- for the change, but nothing tied the new version to the curated history. An
-- editor could therefore bump a claim or source while evidence_revisions stayed
-- silent, and evidence_add_revision() would happily file a narrative for a
-- version that did not exist. Both holes are closed here:
--
--   1. A deferred constraint trigger requires, at COMMIT time, an
--      evidence_revisions row matching (entity_type, entity_id, version) for every
--      changed row at version 2 or above. Deferring it is what lets the row and its
--      narrative be written in either order inside one transaction — which is how
--      the import path and the RPCs work — while making "bumped with no story"
--      impossible to commit, from the RPCs or from direct SQL.
--   2. evidence_add_revision() accepts only the current version of the entity, so
--      a narrative cannot be registered for a future or imaginary version.
--   3. evidence_update_claim() and evidence_update_source() write that narrative
--      themselves from the reason they already require, so a caller cannot bump a
--      version by accident-of-forgetting.
--
-- Version 1 needs no narrative: it is the row's own creation, and the catalogue
-- records its own first-version summaries directly.
--
-- Upgrading a database that already holds versions above 1 without narratives is
-- possible in principle; the only such row in the catalogue today is the
-- superseded source, which carries its version-2 summary, so nothing is invented
-- here and no backfill is attempted.

-- ---------------------------------------------------------------------------
-- 1. Commit-time coverage
-- ---------------------------------------------------------------------------

create or replace function public.evidence_assert_revision_coverage()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  entity text := case tg_table_name
                   when 'evidence_claims' then 'claim'
                   when 'evidence_sources' then 'source'
                 end;
begin
  if new.version >= 2 and not exists (
    select 1
      from public.evidence_revisions r
     where r.entity_type = entity
       and r.entity_id = new.id
       and r.version = new.version
  ) then
    raise exception '% % is at version % with no evidence_revisions row; record the narrative in the same transaction',
      entity, new.id, new.version
      using errcode = '23514';
  end if;

  return null;
end
$$;

revoke all on function public.evidence_assert_revision_coverage() from public;

drop trigger if exists evidence_claims_revision_coverage on public.evidence_claims;
create constraint trigger evidence_claims_revision_coverage
  after insert or update on public.evidence_claims
  deferrable initially deferred
  for each row execute function public.evidence_assert_revision_coverage();

drop trigger if exists evidence_sources_revision_coverage on public.evidence_sources;
create constraint trigger evidence_sources_revision_coverage
  after insert or update on public.evidence_sources
  deferrable initially deferred
  for each row execute function public.evidence_assert_revision_coverage();

-- ---------------------------------------------------------------------------
-- 2. A narrative belongs to a version that exists
-- ---------------------------------------------------------------------------

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
  current_version integer;
begin
  perform public.evidence_require_editor();

  if p_summary is null or char_length(btrim(p_summary)) < 5 then
    raise exception 'a revision summary of at least 5 characters is required' using errcode = '22023';
  end if;

  if p_entity_type = 'source' then
    select version into current_version from public.evidence_sources where id = p_entity_id;
  elsif p_entity_type = 'claim' then
    select version into current_version from public.evidence_claims where id = p_entity_id;
  else
    raise exception 'unknown entity type %', p_entity_type using errcode = '22023';
  end if;

  if current_version is null then
    raise exception 'unknown % %', p_entity_type, p_entity_id using errcode = 'P0002';
  end if;

  if p_version is distinct from current_version then
    raise exception '% % is at version %, not %', p_entity_type, p_entity_id, current_version, p_version
      using errcode = '23514';
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

-- ---------------------------------------------------------------------------
-- 3. The update RPCs narrate the version they create
-- ---------------------------------------------------------------------------

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

  -- The version this update just created gets the reason as its narrative.
  insert into public.evidence_revisions
    (entity_type, entity_id, version, changed_on, changed_by, summary)
  select 'claim', c.id, c.version, current_date, 'editor:' || auth.uid()::text,
         left(btrim(p_reason), 500)
    from public.evidence_claims c
   where c.id = p_id;

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

  insert into public.evidence_revisions
    (entity_type, entity_id, version, changed_on, changed_by, summary)
  select 'source', s.id, s.version, current_date, 'editor:' || auth.uid()::text,
         left(btrim(p_reason), 500)
    from public.evidence_sources s
   where s.id = p_id;

  return (select to_jsonb(s) from public.evidence_sources s where s.id = p_id);
end
$$;

comment on function public.evidence_assert_revision_coverage() is
  'Deferred constraint trigger: at COMMIT, every claim or source at version 2 or above must have an evidence_revisions row for that version. Makes a version without a narrative impossible to commit.';

comment on function public.evidence_add_revision(text, text, integer, text, jsonb) is
  'Appends a curated revision summary for the current version of a claim or source. Refuses a version the entity is not at.';
