-- Bloom Vitalis — evidence catalogue seed.
--
-- GENERATED FILE. Do not edit by hand.
--
--   source of truth  src/lib/vitalis/evidence/catalog.ts
--   generator        scripts/vitalis-evidence-seed.mjs
--   regenerate       npm run seed:evidence
--   verify           npm run seed:evidence:check
--
-- format version   2
-- catalogue hash   sha256:b936c74655e7386fe4e90b460b152b197cace13fde9761f2d47de08451f9df0a
-- rows             6 sources, 4 claims, 3 citations, 2 recommendations, 4 revisions
--
-- What this file does, and does not do:
--
--   • Reconciled, not pruned. It deletes nothing at all: no source, no
--     claim, no citation, no recommendation link, no revision. If the
--     database holds something the catalogue does not describe, the file
--     raises and the transaction is left exactly as it was found.
--   • Upserts sources, claims, citations and recommendation links by stable
--     id, and moves a claim to its recorded status only after its citations
--     exist, because the licence gate is a trigger that also fires on
--     insert.
--   • Never moves a row backwards: a newer database version is not reverted,
--     a recorded supersession is not cleared, an approved claim is not
--     returned to draft, and a row whose content already matches is not
--     touched — so applying this file to a current database is a no-op.
--   • Appends revision history, and never rewrites or removes it.
--   • Touches no health, authentication or other Bloom table.
--
-- How to apply it: a controlled administrative step, not something the app
-- does at boot and not something a signed-in user can run. The operator runs
-- it against the project as a single transaction, having first applied
-- supabase/migrations/20261106_vitalis_evidence_foundation.sql:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
--        -f supabase/seeds/20261107_vitalis_evidence_catalog.sql
--
-- or paste the file into the Supabase SQL editor between a manual BEGIN/COMMIT.
-- No credentials belong in this file, in the generator, or in the repository.

-- section: preflight
-- Fail before writing anything if the evidence schema is not present. A seed
-- applied to the wrong database must not leave half a catalogue behind.
do $$
begin
  if to_regclass('public.evidence_sources') is null
     or to_regclass('public.evidence_claims') is null
     or to_regclass('public.evidence_claim_sources') is null then
    raise exception 'evidence tables are missing: apply 20261106_vitalis_evidence_foundation.sql first';
  end if;
end
$$;

-- section: reconciliation
-- The seed reconciles; it never prunes. Everything below reports and aborts
-- rather than removing a row, a citation, a recommendation link or a
-- revision. Removing evidence is a reviewed operator decision; see
-- docs/vitalis-evidence-seed.md.

-- evidence_sources: four refusals, checked before a single row is written.
do $$
declare
  offenders text;
begin
  -- 1. Rows the catalogue does not describe.
  select string_agg(d.id, ', ' order by d.id) into offenders
    from public.evidence_sources d
   where d.id not in ('dga-2025-2030', 'dga-2020-2025', 'usda-fooddata-central', 'fao-who-unu-2004-energy', 'icmr-nin-dgi-2024', 'icmr-nin-ifct-2017');

  if offenders is not null then
    raise exception 'seed refused: evidence_sources holds rows the catalogue does not describe: %', offenders
      using hint = 'Add them to catalog.ts, or retire them with a reviewed statement. The seed never deletes a row.';
  end if;

  -- 2. A database version newer than the catalogue's.
  select string_agg(c.id || ' (database v' || d.version || ', catalogue v' || c.version || ')', ', ' order by c.id)
    into offenders
    from (values
            ('dga-2025-2030', 1),
            ('dga-2020-2025', 2),
            ('usda-fooddata-central', 1),
            ('fao-who-unu-2004-energy', 1),
            ('icmr-nin-dgi-2024', 1),
            ('icmr-nin-ifct-2017', 1)
         ) as c (id, version)
    join public.evidence_sources d on d.id = c.id
   where d.version > c.version;

  if offenders is not null then
    raise exception 'seed refused: evidence_sources is newer in the database than in the catalogue: %', offenders
      using hint = 'Regenerate from the current catalogue, or roll the catalogue forward. The seed never reverts a newer row.';
  end if;

  -- 3. Supersession history the catalogue would erase or rewrite.
  select string_agg(c.id, ', ' order by c.id) into offenders
    from (values
            ('dga-2025-2030', null::text),
            ('dga-2020-2025', 'dga-2025-2030'),
            ('usda-fooddata-central', null::text),
            ('fao-who-unu-2004-energy', null::text),
            ('icmr-nin-dgi-2024', null::text),
            ('icmr-nin-ifct-2017', null::text)
         ) as c (id, superseded_by)
    join public.evidence_sources d on d.id = c.id
   where d.superseded_by is not null
     and d.superseded_by is distinct from c.superseded_by;

  if offenders is not null then
    raise exception 'seed refused: evidence_sources has supersession history the catalogue would erase: %', offenders
      using hint = 'Re-point or retire a row with a reviewed statement. The seed never clears a recorded supersession.';
  end if;

  -- 4. A reviewed row the catalogue would put back into draft.
  select string_agg(c.id, ', ' order by c.id) into offenders
    from (values
            ('dga-2025-2030', 'approved'),
            ('dga-2020-2025', 'superseded'),
            ('usda-fooddata-central', 'approved'),
            ('fao-who-unu-2004-energy', 'approved'),
            ('icmr-nin-dgi-2024', 'approved'),
            ('icmr-nin-ifct-2017', 'approved')
         ) as c (id, review_status)
    join public.evidence_sources d on d.id = c.id
   where d.review_status not in ('draft', 'in_review')
     and c.review_status in ('draft', 'in_review');

  if offenders is not null then
    raise exception 'seed refused: evidence_sources is reviewed in the database and the catalogue would return it to draft: %', offenders
      using hint = 'Demote a reviewed row with a reviewed statement, not by editing the catalogue. The seed only advances review state.';
  end if;
end
$$;

-- evidence_claims: four refusals, checked before a single row is written.
do $$
declare
  offenders text;
begin
  -- 1. Rows the catalogue does not describe.
  select string_agg(d.id, ', ' order by d.id) into offenders
    from public.evidence_claims d
   where d.id not in ('dga-whole-foods-emphasis', 'fao-energy-requirement-components', 'icmr-dgi-food-variety', 'rate-cap-1kg-per-week');

  if offenders is not null then
    raise exception 'seed refused: evidence_claims holds rows the catalogue does not describe: %', offenders
      using hint = 'Add them to catalog.ts, or retire them with a reviewed statement. The seed never deletes a row.';
  end if;

  -- 2. A database version newer than the catalogue's.
  select string_agg(c.id || ' (database v' || d.version || ', catalogue v' || c.version || ')', ', ' order by c.id)
    into offenders
    from (values
            ('dga-whole-foods-emphasis', 1),
            ('fao-energy-requirement-components', 1),
            ('icmr-dgi-food-variety', 1),
            ('rate-cap-1kg-per-week', 1)
         ) as c (id, version)
    join public.evidence_claims d on d.id = c.id
   where d.version > c.version;

  if offenders is not null then
    raise exception 'seed refused: evidence_claims is newer in the database than in the catalogue: %', offenders
      using hint = 'Regenerate from the current catalogue, or roll the catalogue forward. The seed never reverts a newer row.';
  end if;

  -- 3. Supersession history the catalogue would erase or rewrite.
  select string_agg(c.id, ', ' order by c.id) into offenders
    from (values
            ('dga-whole-foods-emphasis', null::text),
            ('fao-energy-requirement-components', null::text),
            ('icmr-dgi-food-variety', null::text),
            ('rate-cap-1kg-per-week', null::text)
         ) as c (id, superseded_by)
    join public.evidence_claims d on d.id = c.id
   where d.superseded_by is not null
     and d.superseded_by is distinct from c.superseded_by;

  if offenders is not null then
    raise exception 'seed refused: evidence_claims has supersession history the catalogue would erase: %', offenders
      using hint = 'Re-point or retire a row with a reviewed statement. The seed never clears a recorded supersession.';
  end if;

  -- 4. A reviewed row the catalogue would put back into draft.
  select string_agg(c.id, ', ' order by c.id) into offenders
    from (values
            ('dga-whole-foods-emphasis', 'approved'),
            ('fao-energy-requirement-components', 'in_review'),
            ('icmr-dgi-food-variety', 'in_review'),
            ('rate-cap-1kg-per-week', 'draft')
         ) as c (id, review_status)
    join public.evidence_claims d on d.id = c.id
   where d.review_status not in ('draft', 'in_review')
     and c.review_status in ('draft', 'in_review');

  if offenders is not null then
    raise exception 'seed refused: evidence_claims is reviewed in the database and the catalogue would return it to draft: %', offenders
      using hint = 'Demote a reviewed row with a reviewed statement, not by editing the catalogue. The seed only advances review state.';
  end if;
end
$$;

-- evidence_claim_sources: one refusal, checked before a single relationship is written.
do $$
declare
  offenders text;
begin
  select string_agg(d.claim_id || ' -> ' || d.source_id, ', '
                    order by d.claim_id, d.source_id) into offenders
    from public.evidence_claim_sources d
   where (d.claim_id, d.source_id) not in (
            ('dga-whole-foods-emphasis', 'dga-2025-2030'),
            ('fao-energy-requirement-components', 'fao-who-unu-2004-energy'),
            ('icmr-dgi-food-variety', 'icmr-nin-dgi-2024')
         );

  if offenders is not null then
    raise exception 'seed refused: citations exist that the catalogue does not describe: %', offenders
      using hint = 'Record the citation in catalog.ts, or remove it with a reviewed statement. The seed never deletes a citation.';
  end if;
end
$$;

-- evidence_recommendations: one refusal, checked before a single row is written.
do $$
declare
  offenders text;
begin
  select string_agg(d.id, ', ' order by d.id) into offenders
    from public.evidence_recommendations d
   where d.id not in ('vitalis.guidance.whole-foods', 'vitalis.safety.rate-cap');

  if offenders is not null then
    raise exception 'seed refused: evidence_recommendations holds rows the catalogue does not describe: %', offenders
      using hint = 'Add them to catalog.ts, or retire them with a reviewed statement. The seed never deletes a row.';
  end if;
end
$$;

-- evidence_recommendation_claims: one refusal, checked before a single relationship is written.
do $$
declare
  offenders text;
begin
  select string_agg(d.recommendation_id || ' -> ' || d.claim_id, ', '
                    order by d.recommendation_id, d.claim_id) into offenders
    from public.evidence_recommendation_claims d
   where (d.recommendation_id, d.claim_id) not in (
            ('vitalis.guidance.whole-foods', 'dga-whole-foods-emphasis'),
            ('vitalis.safety.rate-cap', 'rate-cap-1kg-per-week')
         );

  if offenders is not null then
    raise exception 'seed refused: recommendation links exist that the catalogue does not describe: %', offenders
      using hint = 'Record the link in catalog.ts, or remove it with a reviewed statement. The seed never deletes a relationship.';
  end if;
end
$$;
-- section: sources
insert into public.evidence_sources as target (
  id, title, kind, publisher, authors, publication_year, url, license_id, license_url, license_note, product_use_allowed, permission_required, peer_reviewed, retrieved_on, published_on, reviewed_on, review_interval_months, review_status, version, superseded_by, notes
) values (
  'dga-2025-2030', 'Dietary Guidelines for Americans, 2025-2030', 'guideline', 'U.S. Department of Health and Human Services and U.S. Department of Agriculture', array['U.S. Department of Health and Human Services', 'U.S. Department of Agriculture']::text[], 2026, 'https://realfood.gov/', 'us-public-domain', 'https://creativecommons.org/publicdomain/zero/1.0/', 'Work of the U.S. federal government, in the public domain. The Departments ask that content they did not create, and photographs in particular, not be treated as public domain, and that altered content not be sourced back to the Dietary Guidelines.', true, false, false, '2026-11-05'::date, '2026-01-07'::date, '2026-11-05'::date, 60, 'approved', 1, null, 'Released 7 January 2026; the current edition. Review interval follows the statutory five-year cycle, so it is next due when the 2030-2035 edition is expected.'
) on conflict (id) do update set
    title = excluded.title,
    kind = excluded.kind,
    publisher = excluded.publisher,
    authors = excluded.authors,
    publication_year = excluded.publication_year,
    url = excluded.url,
    license_id = excluded.license_id,
    license_url = excluded.license_url,
    license_note = excluded.license_note,
    product_use_allowed = excluded.product_use_allowed,
    permission_required = excluded.permission_required,
    peer_reviewed = excluded.peer_reviewed,
    retrieved_on = excluded.retrieved_on,
    published_on = excluded.published_on,
    reviewed_on = excluded.reviewed_on,
    review_interval_months = excluded.review_interval_months,
    review_status = excluded.review_status,
    version = excluded.version,
    superseded_by = excluded.superseded_by,
    notes = excluded.notes,
    updated_at = now()
  where excluded.version >= target.version
    and (target.superseded_by is null or target.superseded_by = excluded.superseded_by)
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        is distinct from to_jsonb(target) - 'created_at' - 'updated_at';

insert into public.evidence_sources as target (
  id, title, kind, publisher, authors, publication_year, url, license_id, license_url, license_note, product_use_allowed, permission_required, peer_reviewed, retrieved_on, published_on, reviewed_on, review_interval_months, review_status, version, superseded_by, notes
) values (
  'dga-2020-2025', 'Dietary Guidelines for Americans, 2020-2025 (9th edition)', 'guideline', 'U.S. Department of Agriculture and U.S. Department of Health and Human Services', array['U.S. Department of Agriculture', 'U.S. Department of Health and Human Services']::text[], 2020, 'https://www.dietaryguidelines.gov/', 'us-public-domain', 'https://creativecommons.org/publicdomain/zero/1.0/', 'Work of the U.S. federal government, in the public domain. Graphs, figures and tables may be used without permission; photographs are not public domain.', true, false, false, '2026-11-05'::date, '2020-12-29'::date, '2026-01-07'::date, 60, 'superseded', 2, 'dga-2025-2030', 'Retained for history only. Superseded on 7 January 2026 when HHS and USDA released the 2025-2030 edition. Claims resting on this edition must be re-checked against the new one, not carried forward.'
) on conflict (id) do update set
    title = excluded.title,
    kind = excluded.kind,
    publisher = excluded.publisher,
    authors = excluded.authors,
    publication_year = excluded.publication_year,
    url = excluded.url,
    license_id = excluded.license_id,
    license_url = excluded.license_url,
    license_note = excluded.license_note,
    product_use_allowed = excluded.product_use_allowed,
    permission_required = excluded.permission_required,
    peer_reviewed = excluded.peer_reviewed,
    retrieved_on = excluded.retrieved_on,
    published_on = excluded.published_on,
    reviewed_on = excluded.reviewed_on,
    review_interval_months = excluded.review_interval_months,
    review_status = excluded.review_status,
    version = excluded.version,
    superseded_by = excluded.superseded_by,
    notes = excluded.notes,
    updated_at = now()
  where excluded.version >= target.version
    and (target.superseded_by is null or target.superseded_by = excluded.superseded_by)
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        is distinct from to_jsonb(target) - 'created_at' - 'updated_at';

insert into public.evidence_sources as target (
  id, title, kind, publisher, authors, publication_year, url, license_id, license_url, license_note, product_use_allowed, permission_required, peer_reviewed, retrieved_on, published_on, reviewed_on, review_interval_months, review_status, version, superseded_by, notes
) values (
  'fao-who-unu-2004-energy', 'Human Energy Requirements: Report of a Joint FAO/WHO/UNU Expert Consultation (FAO Food and Nutrition Technical Report Series 1)', 'government_report', 'Food and Agriculture Organization of the United Nations, on behalf of FAO, WHO and UNU', array['Food and Agriculture Organization of the United Nations', 'World Health Organization', 'United Nations University']::text[], 2004, 'https://www.fao.org/4/y5686e/y5686e00.htm', 'fao-noncommercial', 'https://www.fao.org/contact-us/terms/en', 'FAO copyright, all rights reserved. Reproduction for educational or other non-commercial purposes is authorised without permission provided the source is fully acknowledged; reproduction for resale or other commercial purposes is prohibited without written permission of the copyright holders.', false, true, false, '2026-11-05'::date, null, '2026-11-05'::date, 60, 'approved', 1, null, 'Bibliographic details and licensing verified; the content may be read and summarised, but nothing derived from it may ship commercially without written permission from FAO. ISBN 92-5-105212-3.'
) on conflict (id) do update set
    title = excluded.title,
    kind = excluded.kind,
    publisher = excluded.publisher,
    authors = excluded.authors,
    publication_year = excluded.publication_year,
    url = excluded.url,
    license_id = excluded.license_id,
    license_url = excluded.license_url,
    license_note = excluded.license_note,
    product_use_allowed = excluded.product_use_allowed,
    permission_required = excluded.permission_required,
    peer_reviewed = excluded.peer_reviewed,
    retrieved_on = excluded.retrieved_on,
    published_on = excluded.published_on,
    reviewed_on = excluded.reviewed_on,
    review_interval_months = excluded.review_interval_months,
    review_status = excluded.review_status,
    version = excluded.version,
    superseded_by = excluded.superseded_by,
    notes = excluded.notes,
    updated_at = now()
  where excluded.version >= target.version
    and (target.superseded_by is null or target.superseded_by = excluded.superseded_by)
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        is distinct from to_jsonb(target) - 'created_at' - 'updated_at';

insert into public.evidence_sources as target (
  id, title, kind, publisher, authors, publication_year, url, license_id, license_url, license_note, product_use_allowed, permission_required, peer_reviewed, retrieved_on, published_on, reviewed_on, review_interval_months, review_status, version, superseded_by, notes
) values (
  'icmr-nin-dgi-2024', 'Dietary Guidelines for Indians - 2024 (Revised Edition)', 'guideline', 'ICMR-National Institute of Nutrition, Indian Council of Medical Research, Ministry of Health and Family Welfare, Government of India', array['ICMR-NIN Expert Committee']::text[], 2024, 'https://nin.res.in/dietaryguidelines/pdfjs/locale/DGI_2024.pdf', 'nin-copyright-restricted', 'https://www.nin.res.in/', 'Copyright ICMR-National Institute of Nutrition. The publisher states that use and dissemination of the data is encouraged and that the publication may be reproduced for personal use with full acknowledgement, but that no part may be stored or reproduced in electronic form for creating a product without prior written permission.', false, true, false, '2026-11-05'::date, null, '2026-11-05'::date, 60, 'approved', 1, null, 'The most relevant guidance for an Indian audience, and currently unusable in a product. Written permission from NIN is a prerequisite before any of its content is reproduced. Cited here so the gap is visible rather than quietly filled with a US source.'
) on conflict (id) do update set
    title = excluded.title,
    kind = excluded.kind,
    publisher = excluded.publisher,
    authors = excluded.authors,
    publication_year = excluded.publication_year,
    url = excluded.url,
    license_id = excluded.license_id,
    license_url = excluded.license_url,
    license_note = excluded.license_note,
    product_use_allowed = excluded.product_use_allowed,
    permission_required = excluded.permission_required,
    peer_reviewed = excluded.peer_reviewed,
    retrieved_on = excluded.retrieved_on,
    published_on = excluded.published_on,
    reviewed_on = excluded.reviewed_on,
    review_interval_months = excluded.review_interval_months,
    review_status = excluded.review_status,
    version = excluded.version,
    superseded_by = excluded.superseded_by,
    notes = excluded.notes,
    updated_at = now()
  where excluded.version >= target.version
    and (target.superseded_by is null or target.superseded_by = excluded.superseded_by)
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        is distinct from to_jsonb(target) - 'created_at' - 'updated_at';

insert into public.evidence_sources as target (
  id, title, kind, publisher, authors, publication_year, url, license_id, license_url, license_note, product_use_allowed, permission_required, peer_reviewed, retrieved_on, published_on, reviewed_on, review_interval_months, review_status, version, superseded_by, notes
) values (
  'icmr-nin-ifct-2017', 'Indian Food Composition Tables 2017', 'dataset', 'National Institute of Nutrition, Indian Council of Medical Research, Hyderabad, India', array['T. Longvah', 'R. Ananthan', 'K. Bhaskarachary', 'K. Venkaiah']::text[], 2017, 'https://www.nin.res.in/ebooks/IFCT2017.pdf', 'nin-copyright-restricted', 'https://www.nin.res.in/', 'Copyright 2017 National Institute of Nutrition. The publisher encourages use and dissemination and permits personal reproduction with full acknowledgement, but states that no part of the publication may be stored or reproduced in any electronic format for creating a product without the prior written permission of NIN, Hyderabad.', false, true, false, '2026-11-05'::date, null, '2026-11-05'::date, 12, 'approved', 1, null, 'Import blocked. 528 key foods and 151 components, and the closest thing to an authoritative Indian composition table, but the terms forbid loading it into a product''s electronic database without written permission. Not imported in this phase; see the methodology document.'
) on conflict (id) do update set
    title = excluded.title,
    kind = excluded.kind,
    publisher = excluded.publisher,
    authors = excluded.authors,
    publication_year = excluded.publication_year,
    url = excluded.url,
    license_id = excluded.license_id,
    license_url = excluded.license_url,
    license_note = excluded.license_note,
    product_use_allowed = excluded.product_use_allowed,
    permission_required = excluded.permission_required,
    peer_reviewed = excluded.peer_reviewed,
    retrieved_on = excluded.retrieved_on,
    published_on = excluded.published_on,
    reviewed_on = excluded.reviewed_on,
    review_interval_months = excluded.review_interval_months,
    review_status = excluded.review_status,
    version = excluded.version,
    superseded_by = excluded.superseded_by,
    notes = excluded.notes,
    updated_at = now()
  where excluded.version >= target.version
    and (target.superseded_by is null or target.superseded_by = excluded.superseded_by)
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        is distinct from to_jsonb(target) - 'created_at' - 'updated_at';

insert into public.evidence_sources as target (
  id, title, kind, publisher, authors, publication_year, url, license_id, license_url, license_note, product_use_allowed, permission_required, peer_reviewed, retrieved_on, published_on, reviewed_on, review_interval_months, review_status, version, superseded_by, notes
) values (
  'usda-fooddata-central', 'FoodData Central', 'dataset', 'U.S. Department of Agriculture, Agricultural Research Service, Beltsville Human Nutrition Research Center', array['U.S. Department of Agriculture, Agricultural Research Service']::text[], 2019, 'https://fdc.nal.usda.gov/', 'cc0-1.0', 'https://creativecommons.org/publicdomain/zero/1.0/', 'USDA states that FoodData Central data are in the public domain, published under CC0 1.0. No permission is needed; USDA requests that FoodData Central be named as the source.', true, false, false, '2026-11-05'::date, null, '2026-11-05'::date, 12, 'approved', 1, null, 'Composition dataset, registered for a later phase''s food matching. No claim cites it yet, and none should until a specific food entry and data type (Foundation, FNDDS, SR Legacy, Branded) has been checked.'
) on conflict (id) do update set
    title = excluded.title,
    kind = excluded.kind,
    publisher = excluded.publisher,
    authors = excluded.authors,
    publication_year = excluded.publication_year,
    url = excluded.url,
    license_id = excluded.license_id,
    license_url = excluded.license_url,
    license_note = excluded.license_note,
    product_use_allowed = excluded.product_use_allowed,
    permission_required = excluded.permission_required,
    peer_reviewed = excluded.peer_reviewed,
    retrieved_on = excluded.retrieved_on,
    published_on = excluded.published_on,
    reviewed_on = excluded.reviewed_on,
    review_interval_months = excluded.review_interval_months,
    review_status = excluded.review_status,
    version = excluded.version,
    superseded_by = excluded.superseded_by,
    notes = excluded.notes,
    updated_at = now()
  where excluded.version >= target.version
    and (target.superseded_by is null or target.superseded_by = excluded.superseded_by)
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        is distinct from to_jsonb(target) - 'created_at' - 'updated_at';

-- section: claims-staged
-- Staged as draft: the approval gate refuses a claim with no citation yet.
insert into public.evidence_claims as target (
  id, statement, topic, grade, confidence, population, uncertainty, limitations, contraindications, review_status, version, reviewed_on, review_interval_months, superseded_by
) values (
  'dga-whole-foods-emphasis', 'US federal dietary guidance for 2025-2030 emphasises whole, nutrient-dense foods and limiting highly processed foods, added sugars and refined carbohydrates.', 'dietary_pattern', 'moderate', 0.8, 'The United States general population; the guidance is not clinical advice for treating disease', '["This is a qualitative emphasis, not a numeric target, so it cannot be used to derive calories or macros.","The edition is new; how its recommendations are operationalised in federal programmes is still being published."]'::jsonb, '["Written for US dietary patterns. Applicability to Indian or other cuisines is not established by this source.","The publisher asks that altered or excerpted content not be attributed back to the Dietary Guidelines."]'::jsonb, '["Not a substitute for individual clinical nutrition advice where a medical condition is present."]'::jsonb, 'draft', 1, null, 12, null
) on conflict (id) do update set
    statement = excluded.statement,
    topic = excluded.topic,
    grade = excluded.grade,
    confidence = excluded.confidence,
    population = excluded.population,
    uncertainty = excluded.uncertainty,
    limitations = excluded.limitations,
    contraindications = excluded.contraindications,
    version = excluded.version,
    review_interval_months = excluded.review_interval_months,
    updated_at = now()
  where excluded.version >= target.version
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        - 'review_status' - 'reviewed_on' - 'superseded_by'
        is distinct from
        to_jsonb(target) - 'created_at' - 'updated_at'
        - 'review_status' - 'reviewed_on' - 'superseded_by';

insert into public.evidence_claims as target (
  id, statement, topic, grade, confidence, population, uncertainty, limitations, contraindications, review_status, version, reviewed_on, review_interval_months, superseded_by
) values (
  'fao-energy-requirement-components', 'Human energy requirements are estimated from measured energy expenditure plus the additional energy needs for growth, pregnancy and lactation.', 'energy_requirement', 'strong', 0.95, 'Populations across the life cycle, as assessed by the 2001 joint expert consultation', '["The report estimates requirements for populations; individual requirements vary around those estimates."]'::jsonb, '["Published in 2004 from a consultation held in 2001; newer evidence may since have refined the figures.","Cannot be reproduced in a commercial product without written permission from FAO."]'::jsonb, '["Population estimates must not be applied as an individual''s clinical energy prescription."]'::jsonb, 'draft', 1, null, 12, null
) on conflict (id) do update set
    statement = excluded.statement,
    topic = excluded.topic,
    grade = excluded.grade,
    confidence = excluded.confidence,
    population = excluded.population,
    uncertainty = excluded.uncertainty,
    limitations = excluded.limitations,
    contraindications = excluded.contraindications,
    version = excluded.version,
    review_interval_months = excluded.review_interval_months,
    updated_at = now()
  where excluded.version >= target.version
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        - 'review_status' - 'reviewed_on' - 'superseded_by'
        is distinct from
        to_jsonb(target) - 'created_at' - 'updated_at'
        - 'review_status' - 'reviewed_on' - 'superseded_by';

insert into public.evidence_claims as target (
  id, statement, topic, grade, confidence, population, uncertainty, limitations, contraindications, review_status, version, reviewed_on, review_interval_months, superseded_by
) values (
  'icmr-dgi-food-variety', 'ICMR-NIN''s first dietary guideline for Indians is to eat a variety of foods to ensure a balanced diet.', 'dietary_pattern', 'moderate', 0.85, 'The Indian general population', '["The guideline states a principle; it does not specify quantities, which the document handles in later sections."]'::jsonb, '["The document is copyright ICMR-NIN and may not be stored or reproduced electronically in a product without written permission."]'::jsonb, '["Not a prescription for individuals with a medical condition requiring therapeutic dietetics."]'::jsonb, 'draft', 1, null, 12, null
) on conflict (id) do update set
    statement = excluded.statement,
    topic = excluded.topic,
    grade = excluded.grade,
    confidence = excluded.confidence,
    population = excluded.population,
    uncertainty = excluded.uncertainty,
    limitations = excluded.limitations,
    contraindications = excluded.contraindications,
    version = excluded.version,
    review_interval_months = excluded.review_interval_months,
    updated_at = now()
  where excluded.version >= target.version
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        - 'review_status' - 'reviewed_on' - 'superseded_by'
        is distinct from
        to_jsonb(target) - 'created_at' - 'updated_at'
        - 'review_status' - 'reviewed_on' - 'superseded_by';

insert into public.evidence_claims as target (
  id, statement, topic, grade, confidence, population, uncertainty, limitations, contraindications, review_status, version, reviewed_on, review_interval_months, superseded_by
) values (
  'rate-cap-1kg-per-week', 'Bloom caps planned weight change at 1 kg per week.', 'weight_change_rate', 'insufficient', 0, 'Anyone using Bloom''s body-target calculator', '["No source has been verified for this cap. It is a Phase 1 product safety constant, not a finding from the literature.","Whether 1 kg per week is the right ceiling for this population, and how it should differ by body size, is unresolved."]'::jsonb, '["Deliberately recorded with no citation rather than attaching a plausible-looking reference to a number nobody checked.","Until a source is verified, this claim must not be presented to a person as evidence-based."]'::jsonb, '["A cap does not make an aggressive target safe for someone with a history of disordered eating; the safety classifier handles that separately."]'::jsonb, 'draft', 1, null, 12, null
) on conflict (id) do update set
    statement = excluded.statement,
    topic = excluded.topic,
    grade = excluded.grade,
    confidence = excluded.confidence,
    population = excluded.population,
    uncertainty = excluded.uncertainty,
    limitations = excluded.limitations,
    contraindications = excluded.contraindications,
    version = excluded.version,
    review_interval_months = excluded.review_interval_months,
    updated_at = now()
  where excluded.version >= target.version
    and to_jsonb(excluded) - 'created_at' - 'updated_at'
        - 'review_status' - 'reviewed_on' - 'superseded_by'
        is distinct from
        to_jsonb(target) - 'created_at' - 'updated_at'
        - 'review_status' - 'reviewed_on' - 'superseded_by';

-- section: citations
insert into public.evidence_claim_sources as target (claim_id, source_id, direction, locator)
values ('dga-whole-foods-emphasis', 'dga-2025-2030', 'supports', 'USDA Food and Nutrition Service, Dietary Guidelines for Americans page (updated 13 April 2026), summary of the 2025-2030 edition')
on conflict (claim_id, source_id) do update set
    direction = excluded.direction,
    locator = excluded.locator
  where (target.direction, target.locator)
        is distinct from (excluded.direction, excluded.locator);

insert into public.evidence_claim_sources as target (claim_id, source_id, direction, locator)
values ('fao-energy-requirement-components', 'fao-who-unu-2004-energy', 'supports', 'Chapter 2, Principles and definitions, opening paragraph')
on conflict (claim_id, source_id) do update set
    direction = excluded.direction,
    locator = excluded.locator
  where (target.direction, target.locator)
        is distinct from (excluded.direction, excluded.locator);

insert into public.evidence_claim_sources as target (claim_id, source_id, direction, locator)
values ('icmr-dgi-food-variety', 'icmr-nin-dgi-2024', 'supports', 'Guideline 1 - Eat a variety of foods to ensure a balanced diet')
on conflict (claim_id, source_id) do update set
    direction = excluded.direction,
    locator = excluded.locator
  where (target.direction, target.locator)
        is distinct from (excluded.direction, excluded.locator);

-- section: recommendations
insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.guidance.whole-foods', 'Any future dietary-pattern copy should rest on this claim and carry its citation, so the wording can be traced to a public-domain source a reviewer can open.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.safety.rate-cap', 'The Phase 1 classifier clamps requested pace to this constant. Phase 2 records the rule and the fact that its evidence is missing, rather than inventing support for a number that was chosen as a safety margin.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

-- section: recommendation-claims
insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.guidance.whole-foods', 'dga-whole-foods-emphasis')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.safety.rate-cap', 'rate-cap-1kg-per-week')
on conflict (recommendation_id, claim_id) do nothing;

-- section: claims-final
-- Only now, with citations in place, may a claim take its recorded status.
update public.evidence_claims
   set review_status = 'approved',
       version = 1,
       reviewed_on = '2026-11-05'::date,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'dga-whole-foods-emphasis'
   and version <= 1
   and (superseded_by is null or superseded_by = null)
   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)
       is distinct from row(
         'approved',
         1,
         '2026-11-05'::date,
         12::smallint,
         null::text
       );

update public.evidence_claims
   set review_status = 'in_review',
       version = 1,
       reviewed_on = '2026-11-05'::date,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'fao-energy-requirement-components'
   and version <= 1
   and (superseded_by is null or superseded_by = null)
   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)
       is distinct from row(
         'in_review',
         1,
         '2026-11-05'::date,
         12::smallint,
         null::text
       );

update public.evidence_claims
   set review_status = 'in_review',
       version = 1,
       reviewed_on = '2026-11-05'::date,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'icmr-dgi-food-variety'
   and version <= 1
   and (superseded_by is null or superseded_by = null)
   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)
       is distinct from row(
         'in_review',
         1,
         '2026-11-05'::date,
         12::smallint,
         null::text
       );

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'rate-cap-1kg-per-week'
   and version <= 1
   and (superseded_by is null or superseded_by = null)
   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)
       is distinct from row(
         'draft',
         1,
         null::date,
         12::smallint,
         null::text
       );

-- section: revisions
-- Insert-if-absent: history is append-only, so a re-run adds nothing.
insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'source', 'dga-2025-2030', 1, '2026-11-05'::date, 'vitalis-evidence-registry', 'Registered the 2025-2030 edition, released 7 January 2026, after confirming public-domain status and the publisher''s attribution request.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'source'
      and entity_id = 'dga-2025-2030'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'source', 'dga-2020-2025', 2, '2026-01-07'::date, 'vitalis-evidence-registry', 'Marked superseded by dga-2025-2030 when HHS and USDA released the new edition; retained for history, no longer citable as current.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'source'
      and entity_id = 'dga-2020-2025'
      and version = 2
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'dga-whole-foods-emphasis', 1, '2026-11-05'::date, 'vitalis-evidence-registry', 'Approved against the current edition with an explicit locator, after the earlier edition was found to be superseded during verification.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'dga-whole-foods-emphasis'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'rate-cap-1kg-per-week', 1, '2026-11-05'::date, 'vitalis-evidence-registry', 'Recorded the Phase 1 rate cap as an assumption with no verified source, so it cannot be presented as evidence-based until one is found.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'rate-cap-1kg-per-week'
      and version = 1
 );
