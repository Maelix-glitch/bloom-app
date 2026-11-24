-- Bloom Vitalis, evidence catalogue seed.
--
-- GENERATED FILE. Do not edit by hand.
--
--   source of truth  src/lib/vitalis/evidence/catalog.ts
--   generator        scripts/vitalis-evidence-seed.mjs
--   regenerate       npm run seed:evidence
--   verify           npm run seed:evidence:check
--
-- format version   2
-- catalogue hash   sha256:80767778703075cb94327edc1895dc706764b062be8800dddce1e175d847c519
-- rows             9 sources, 22 claims, 4 citations, 18 recommendations, 27 revisions
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
--     touched, so applying this file to a current database is a no-op.
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
   where d.id not in ('dga-2025-2030', 'dga-2020-2025', 'usda-fooddata-central', 'uk-cofid-2021', 'au-afcd-release-3', 'ca-cnf-2026', 'fao-who-unu-2004-energy', 'icmr-nin-dgi-2024', 'icmr-nin-ifct-2017');

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
            ('usda-fooddata-central', 2),
            ('uk-cofid-2021', 1),
            ('au-afcd-release-3', 1),
            ('ca-cnf-2026', 1),
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
            ('uk-cofid-2021', null::text),
            ('au-afcd-release-3', null::text),
            ('ca-cnf-2026', null::text),
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
            ('uk-cofid-2021', 'approved'),
            ('au-afcd-release-3', 'approved'),
            ('ca-cnf-2026', 'approved'),
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
   where d.id not in ('dga-whole-foods-emphasis', 'fao-energy-requirement-components', 'icmr-dgi-food-variety', 'rate-cap-1kg-per-week', 'rate-cap-0-75kg-per-week', 'usda-fdc-composition-source', 'mifflin-st-jeor-bmr', 'activity-factor-table', 'protein-recomp-2-2', 'protein-bands-by-goal', 'energy-per-kg-7700', 'calorie-floors', 'spectrum-rda-2020-references', 'plan-composition-derivations', 'water-35ml-per-kg', 'water-efsa-drinking-share', 'who-healthy-diet-principles', 'nice-ng246-individualisation', 'budget-tier-cost-bands', 'dish-region-markers', 'micro-gap-threshold', 'adaptation-ratios');

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
            ('rate-cap-1kg-per-week', 2),
            ('rate-cap-0-75kg-per-week', 1),
            ('usda-fdc-composition-source', 1),
            ('mifflin-st-jeor-bmr', 1),
            ('activity-factor-table', 1),
            ('protein-recomp-2-2', 1),
            ('protein-bands-by-goal', 2),
            ('energy-per-kg-7700', 1),
            ('calorie-floors', 1),
            ('spectrum-rda-2020-references', 2),
            ('plan-composition-derivations', 1),
            ('water-35ml-per-kg', 2),
            ('water-efsa-drinking-share', 1),
            ('who-healthy-diet-principles', 1),
            ('nice-ng246-individualisation', 1),
            ('budget-tier-cost-bands', 1),
            ('dish-region-markers', 1),
            ('micro-gap-threshold', 1),
            ('adaptation-ratios', 1)
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
            ('rate-cap-1kg-per-week', 'rate-cap-0-75kg-per-week'),
            ('rate-cap-0-75kg-per-week', null::text),
            ('usda-fdc-composition-source', null::text),
            ('mifflin-st-jeor-bmr', null::text),
            ('activity-factor-table', null::text),
            ('protein-recomp-2-2', null::text),
            ('protein-bands-by-goal', null::text),
            ('energy-per-kg-7700', null::text),
            ('calorie-floors', null::text),
            ('spectrum-rda-2020-references', null::text),
            ('plan-composition-derivations', null::text),
            ('water-35ml-per-kg', 'water-efsa-drinking-share'),
            ('water-efsa-drinking-share', null::text),
            ('who-healthy-diet-principles', null::text),
            ('nice-ng246-individualisation', null::text),
            ('budget-tier-cost-bands', null::text),
            ('dish-region-markers', null::text),
            ('micro-gap-threshold', null::text),
            ('adaptation-ratios', null::text)
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
            ('rate-cap-1kg-per-week', 'superseded'),
            ('rate-cap-0-75kg-per-week', 'draft'),
            ('usda-fdc-composition-source', 'approved'),
            ('mifflin-st-jeor-bmr', 'draft'),
            ('activity-factor-table', 'draft'),
            ('protein-recomp-2-2', 'draft'),
            ('protein-bands-by-goal', 'draft'),
            ('energy-per-kg-7700', 'draft'),
            ('calorie-floors', 'draft'),
            ('spectrum-rda-2020-references', 'draft'),
            ('plan-composition-derivations', 'draft'),
            ('water-35ml-per-kg', 'superseded'),
            ('water-efsa-drinking-share', 'draft'),
            ('who-healthy-diet-principles', 'draft'),
            ('nice-ng246-individualisation', 'draft'),
            ('budget-tier-cost-bands', 'draft'),
            ('dish-region-markers', 'draft'),
            ('micro-gap-threshold', 'draft'),
            ('adaptation-ratios', 'draft')
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
            ('icmr-dgi-food-variety', 'icmr-nin-dgi-2024'),
            ('usda-fdc-composition-source', 'usda-fooddata-central')
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
   where d.id not in ('vitalis.guidance.whole-foods', 'vitalis.safety.rate-cap', 'vitalis.nutrition.composition-source', 'vitalis.body.bmr-equation', 'vitalis.body.activity-factors', 'vitalis.body.protein-recomp', 'vitalis.body.protein-bands', 'vitalis.body.energy-per-kg', 'vitalis.body.calorie-floor', 'vitalis.nutrition.spectrum-references', 'vitalis.plan.composition-caps', 'vitalis.body.hydration-target', 'vitalis.guidance.healthy-diet-principles', 'vitalis.safety.no-vlcd', 'vitalis.plan.budget-tiers', 'vitalis.plan.dish-regions', 'vitalis.plan.micro-gap-bias', 'vitalis.plan.log-adaptation');

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
            ('vitalis.safety.rate-cap', 'rate-cap-0-75kg-per-week'),
            ('vitalis.nutrition.composition-source', 'usda-fdc-composition-source'),
            ('vitalis.body.bmr-equation', 'mifflin-st-jeor-bmr'),
            ('vitalis.body.activity-factors', 'activity-factor-table'),
            ('vitalis.body.protein-recomp', 'protein-recomp-2-2'),
            ('vitalis.body.protein-bands', 'protein-bands-by-goal'),
            ('vitalis.body.energy-per-kg', 'energy-per-kg-7700'),
            ('vitalis.body.calorie-floor', 'calorie-floors'),
            ('vitalis.nutrition.spectrum-references', 'spectrum-rda-2020-references'),
            ('vitalis.plan.composition-caps', 'plan-composition-derivations'),
            ('vitalis.body.hydration-target', 'water-efsa-drinking-share'),
            ('vitalis.guidance.healthy-diet-principles', 'who-healthy-diet-principles'),
            ('vitalis.safety.no-vlcd', 'nice-ng246-individualisation'),
            ('vitalis.plan.budget-tiers', 'budget-tier-cost-bands'),
            ('vitalis.plan.dish-regions', 'dish-region-markers'),
            ('vitalis.plan.micro-gap-bias', 'micro-gap-threshold'),
            ('vitalis.plan.log-adaptation', 'adaptation-ratios')
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
  'au-afcd-release-3', 'Australian Food Composition Database (AFCD), Release 3', 'dataset', 'Food Standards Australia New Zealand (FSANZ)', array['Food Standards Australia New Zealand']::text[], 2025, 'https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd/about-afcd', 'fsanz-data-user-licence', 'https://www.foodstandards.gov.au/science-data/monitoringnutrients/afcd/datauserlicenceagreement', 'The AFCD is published under FSANZ''s Data User Licence Agreement (modelled on CC BY-SA 3.0 AU): the data may be reproduced, adapted and distributed, including commercially, provided FSANZ is attributed, the licence is linked, the Limitation of Data Statement travels with the data, and the data are identified as Australian data that may not be appropriate for use in other countries. Bloom attributes Food Standards Australia New Zealand / the Australian Food Composition Database wherever these values are shown, and carries the statement: this data is based on Australian data, and Australian data may not be appropriate for use in other countries.', true, false, false, '2026-11-23'::date, null, '2026-11-23'::date, 12, 'approved', 1, null, 'Australian national food-composition database. Registered for SIX shipped foods (M-230, 2026-11-24), all with AFCD Derivation ''Analysed'', the majority of each row''s data from Australian laboratory analysis of representative samples, in src/lib/nutrition/data/afcdReferenceData.ts: lupin splits (F005249), broad beans dried (F000416), split peas dried (F006543), amaranth grain (F000061), chia seeds (F008209) and flaxseed/linseed (F008210). AFCD publishes energy in kilojoules only; Bloom''s kcal figure is the pinned kJ value divided by 4.184 and rounded, and the generator pins the kJ so the derivation is checkable. Fields AFCD''s own sampling notes attribute to another database are NOT shipped: vitamin C is omitted for lupin splits (borrowed from Kohajkova et al. 2011) and for broad beans (borrowed from USDA SR28) rather than letting a borrowed value wear an AFCD label. Limitation of Data Statement (FSANZ): there are limitations associated with food composition databases, the data represent an average of the nutrient content of a particular sample of foods, determined at a particular time, and composition can vary substantially between batches and brands with season, processing, ingredient source and methods of calculation.'
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
  'ca-cnf-2026', 'Canadian Nutrient File (CNF)', 'dataset', 'Health Canada', array['Health Canada']::text[], 2026, 'https://open.canada.ca/data/en/dataset/1b6139bd-ed7e-4043-bc28-ff00e10f3109', 'ogl-canada-2.0', 'https://open.canada.ca/en/open-government-licence-canada', 'The Canadian Nutrient File is published by Health Canada through the Government of Canada''s open data portal under the Open Government Licence – Canada v2.0: the data may be copied, modified, published, translated, adapted and distributed for commercial or non-commercial purposes, with attribution to the source and no suggestion of official endorsement. Bloom attributes Health Canada''s Canadian Nutrient File wherever these values are shown.', true, false, false, '2026-11-23'::date, null, '2026-11-23'::date, 12, 'approved', 1, null, 'Canadian national food-composition database. Registered for THREE shipped foods (M-230, 2026-11-24) in src/lib/nutrition/data/cnfReferenceData.ts: quark (food code 6995), kefir plain low fat (6999) and unsweetened fortified soy beverage (6330). Every shipped row carries CNF Food Source Code 37. Health Canada''s own CNF Sampling and Analysis Program (SNAP-CAN). CNF rows whose food source is code 0 (''based on data from USDA: no changes'') were deliberately NOT shipped from this wave: natto, lupins, amaranth, spirulina and broad beans exist in the CNF only as USDA data under a Canadian label, and lifting them would mislabel USDA values as Canadian, the same honesty rule that keeps IFCT values out until ICMR-NIN grants written permission.'
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
  'uk-cofid-2021', 'McCance and Widdowson''s Composition of Foods Integrated Dataset (CoFID)', 'dataset', 'Public Health England', array['Public Health England']::text[], 2021, 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid', 'ogl-3.0', 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', 'The CoFID workbook is published under the Open Government Licence v3.0: it may be copied, published, distributed and adapted, including commercially, free of charge, provided the source is acknowledged. Bloom acknowledges Public Health England / McCance and Widdowson''s CoFID wherever these values are shown.', true, false, false, '2026-11-23'::date, '2021-03-19'::date, '2026-11-23'::date, 12, 'approved', 1, null, 'UK national food-composition database (the McCance and Widdowson tables, maintained for the UK government). Registered for ONE shipped food (M-229, 2026-11-23): paneer, CoFID food code 12-495 (''Cheese, Paneer''), in src/lib/nutrition/data/cofidReferenceData.ts, the row''s own data reference is ''LGC, Nutrient analysis of cheese, 1999'' (9 samples, sampled in spring and autumn). USDA FoodData Central carries no paneer entry, and the Indian IFCT paneer row stays unusable until ICMR-NIN grants written permission, so CoFID is the licence-clean source for this food. Caveat recorded honestly: CoFID''s paneer is a UK retail product, harder-pressed than typical Indian market paneer (46.8 g water per 100 g against roughly 54-57 g), so its protein, fat and energy run higher per 100 g; the values are CoFID''s own and are labelled as such, never as USDA or IFCT values.'
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
  'usda-fooddata-central', 'FoodData Central', 'dataset', 'U.S. Department of Agriculture, Agricultural Research Service, Beltsville Human Nutrition Research Center', array['U.S. Department of Agriculture, Agricultural Research Service']::text[], 2019, 'https://fdc.nal.usda.gov/', 'cc0-1.0', 'https://creativecommons.org/publicdomain/zero/1.0/', 'USDA states that FoodData Central data are in the public domain, published under CC0 1.0. No permission is needed; USDA requests that FoodData Central be named as the source.', true, false, false, '2026-11-05'::date, null, '2026-11-05'::date, 12, 'approved', 2, null, 'Composition dataset. The shipped reference set (src/lib/nutrition/data/usdaReferenceData.ts) has since been checked entry by entry: every food carries its FoodData Central id and data type, Foundation and SR Legacy only. Branded and FNDDS are not shipped. Claim usda-fdc-composition-source cites this source for the dataset''s provenance and licence only, not for the accuracy of any individual value.'
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
  'activity-factor-table', 'Bloom turns BMR into a daily energy estimate with activity factors: 1.2 (sedentary), 1.375 (light), 1.55 (moderate), 1.725 (active) and 1.9 (very active).', 'energy_requirement', 'insufficient', 0, 'Adults using Bloom''s body targets and plan generation', '["No source is stated in the code for this factor table (src/lib/health/body.ts, ACTIVITY_FACTOR); the values are recorded as TO VERIFY rather than dressed up with a citation nobody checked."]'::jsonb, '["Five coarse bands cannot capture an individual''s real activity; the engine''s calibration from logged days and weigh-ins exists because this table is only a starting estimate."]'::jsonb, '["A misclassified activity level moves the whole energy target, so the result is an estimate to be corrected by observed weight trend, not a fact."]'::jsonb, 'draft', 1, null, 12, null
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
  'adaptation-ratios', 'When the last two or three logged days average under 85% of the protein target, the plan leans protein-first; when they average over 110% of the energy target, energy top-ups are left out. The targets themselves never move.', 'energy_balance', 'insufficient', 0, 'Adults whose food log the plan learns from', '["The 85% and 110% thresholds are engine constants (PROTEIN_SHORTFALL_RATIO and ENERGY_OVERSHOOT_RATIO in src/lib/nutrition/planAdaptation.ts) with no source stated in the code; recorded as TO VERIFY."]'::jsonb, '["Two or three days is a small sample by design: the bias is a nudge inside the composer''s own rules, and fewer than two logged days means no adaptation at all."]'::jsonb, '["Adaptation describes the log, not the person''s effort, and must never be worded as them falling short."]'::jsonb, 'draft', 1, null, 12, null
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
  'budget-tier-cost-bands', 'Dish budget tiers are an engine derivation, labelled an estimate: ingredient costs from stated 2026 urban-Indian retail approximations (₹ per gram by food group) put a serving at tier 1 (up to ₹20), tier 2 (up to ₹45) or tier 3 (above).', 'dietary_pattern', 'insufficient', 0, 'Adults who state a meal budget in their Assessment', '["The prices are approximations recorded in src/lib/nutrition/dishes.ts, not a price survey; they drift with season and city and are re-stated, not verified, at each release."]'::jsonb, '["A tier is a planning filter the person chooses; it is not a claim about what a dish costs any particular household."]'::jsonb, '["Never present a tier as a measured price, or as a judgement of what a person should spend."]'::jsonb, 'draft', 1, null, 12, null
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
  'calorie-floors', 'Bloom never sets a daily calorie target below a floor: 1,500 kcal for men, 1,200 kcal for women and 1,350 kcal when sex is not stated. When the floor is what sets the target, the app says so.', 'energy_requirement', 'insufficient', 0, 'Adults using Bloom''s body targets and plan generation', '["The code describes these as commonly used minimums (src/lib/health/body.ts, calorieFloor) with no source stated; recorded as TO VERIFY."]'::jsonb, '["A floor is a guardrail, not a finding that the resulting target is right for a given person."]'::jsonb, '["The floor does not make a target safe for someone the safety classifier flags; those people are directed to professional assessment instead."]'::jsonb, 'draft', 1, null, 12, null
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
  'dish-region-markers', 'Whether a dish counts as North or South Indian for the cuisine preference is derived by Bloom''s own curated marker tables over the dish library''s cuisine tags, names and ids; a dish matching both regions, or neither, is recorded as neither.', 'dietary_pattern', 'insufficient', 0, 'Adults who state a North or South Indian preference in their Assessment', '["Curated data, not a citation: the tables in src/lib/nutrition/regions.ts are Bloom''s own classification, maintained alongside the dish library."]'::jsonb, '["The preference only ranks dishes; it never filters one out, so a wrong marker costs variety, not access."]'::jsonb, '["A regional label describes the kitchen tradition the library records for a dish; it is not a claim about authenticity."]'::jsonb, 'draft', 1, null, 12, null
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
  'energy-per-kg-7700', 'Bloom''s energy-balance maths treats a kilogram of body-mass change as about 7,700 kcal, in the goal delta (rate × 7,700 ÷ 7) and in the expenditure estimate that learns from a person''s own weigh-ins and logged days.', 'energy_balance', 'insufficient', 0, 'Adults using Bloom''s goal timelines, targets or expenditure estimate', '["The constant is a stated approximation in the code (src/lib/nutrition/expenditure.ts, ENERGY_KCAL_PER_KG); its formal citation is TO VERIFY.","The real energy density of weight change varies with body composition and over time; the figure is a modelling assumption, not a measured constant."]'::jsonb, '["Estimates built on it, maintenance calories, goal timelines, inherit the approximation and are labelled estimates wherever they are shown."]'::jsonb, '["A projected weight or date is arithmetic on an approximation, never a promise."]'::jsonb, 'draft', 1, null, 12, null
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
  'micro-gap-threshold', 'A nutrient counts as a gap when at least 4 of the last 7 logged days report it and those days average under 70% of its Spectrum reference; the plan then favours dishes whose computed panels are rich in that nutrient.', 'dietary_pattern', 'insufficient', 0, 'Adults whose food log the plan learns from', '["The 70% threshold and the 4-of-7-days minimum are engine constants (MICRO_GAP_RATIO and MICRO_MIN_DAYS in src/lib/nutrition/planAdaptation.ts) with no source stated in the code; recorded as TO VERIFY."]'::jsonb, '["Averages rest only on days whose logged foods report the nutrient, and sodium, a ceiling, not a goal, is never counted as a gap."]'::jsonb, '["A gap is never a deficiency diagnosis, and no surface may word it as one or recommend a supplement from it."]'::jsonb, 'draft', 1, null, 12, null
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
  'mifflin-st-jeor-bmr', 'Bloom estimates resting energy (BMR) with the Mifflin–St Jeor equation: 10 × weight in kg + 6.25 × height in cm − 5 × age, plus 5 for men or −161 for women (−78, the midpoint, when sex is not stated).', 'energy_requirement', 'insufficient', 0, 'Adults using Bloom''s body targets and plan generation', '["The equation is named in the code (src/lib/health/body.ts, bmrOf), but its bibliographic citation has not been verified against the publication, so no source is linked.","Any predictive equation estimates a population average; an individual''s measured expenditure can differ materially."]'::jsonb, '["An estimate, never a measurement: BMR and everything derived from it must be presented as estimated."]'::jsonb, '["Not a clinical energy prescription; the safety classifier, not this equation, decides who should not receive a self-directed target."]'::jsonb, 'draft', 1, null, 12, null
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
  'nice-ng246-individualisation', 'Bloom individualises plans around the person''s cultural preferences, finances and recorded health circumstances, and it never generates a very-low-energy diet: its calorie floors and rate cap keep self-directed targets out of that territory.', 'energy_requirement', 'insufficient', 0, 'Adults using Bloom''s plan generation', '["Recorded from NICE guideline NG246 as cited in the product vision; not verified against the guideline, and Bloom must not claim NICE conformance until it is."]'::jsonb, '["The engine''s floors and classifier are consistent with the principle that very-low-energy diets belong in specialist programmes; consistency is not conformance, and this entry does not claim it."]'::jsonb, '["People whose recorded circumstances trigger the safety classifier are directed to professional assessment instead of a plan; that pathway, not this entry, is the protection."]'::jsonb, 'draft', 1, null, 12, null
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
  'plan-composition-derivations', 'The plan composer''s portion caps and day floors (for example 90 g dry grain and 60 g dry pulses per meal, and 120 g egg portions) are engine derivations recorded in the code from ICMR-NIN''s My Plate framework, British Nutrition Foundation portion sizes and ISSN protein-distribution guidance, not reproduced guideline text.', 'dietary_pattern', 'insufficient', 0, 'Adults receiving a generated meal plan', '["The derivations are stated in src/lib/nutrition/plan.ts and in the composition research notes behind it; the BNF and ISSN citations are TO VERIFY against the publications, so no source is linked."]'::jsonb, '["ICMR-NIN''s Dietary Guidelines are licence-blocked in this registry (icmr-nin-dgi-2024): the composer uses figures it derived and must not present them as ICMR-NIN''s published guidance."]'::jsonb, '["Caps are composition guardrails for plan realism, not intake recommendations to present to a person as health advice."]'::jsonb, 'draft', 1, null, 12, null
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
  'protein-bands-by-goal', 'Bloom''s other protein bands are 1.8 g per kg for weight loss, 1.6 g per kg for weight gain and 1.4 g per kg for maintenance. Above a BMI of 23 the bands multiply a reference weight, the healthy-ceiling weight for the person''s height (22.9 × height²), instead of current body weight; at or below it they apply to current body weight. (Corrected at version 2, M-219: the statement previously said the bands apply to current body weight throughout, which stopped being true when the dosing basis changed.)', 'protein', 'insufficient', 0, 'Adults using Bloom''s body targets who pass Bloom''s safety screening', '["No source is stated in the code for these three bands (src/lib/health/body.ts, bodyTargetsOf); recorded as TO VERIFY."]'::jsonb, '["Per-kilogram bands scale linearly with body weight, which overstates needs at high body weights; since M-219 the engine doses on the healthy-ceiling reference weight above a BMI of 23, but that reference is a BMI ceiling, not a measured lean-mass figure."]'::jsonb, '["Planning targets for the classifier''s cleared set, not therapeutic protein prescriptions."]'::jsonb, 'draft', 2, null, 12, null
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
  'protein-recomp-2-2', 'For body recomposition, fat loss and muscle gain at the same weight. Bloom sets the protein target at 2.2 g per kg of body weight, the highest of its four goal bands.', 'protein', 'insufficient', 0, 'Adults with a recomposition goal who pass Bloom''s safety screening', '["The figure''s citations are recorded in the code comment (src/lib/health/body.ts) as Morton et al.''s 2018 meta-analysis of protein and lean mass (BJSM) and the ISSN position stand''s range for maximising lean mass; they have not yet been verified against those publications, so no source is linked."]'::jsonb, '["The code describes 2.2 g/kg as the upper confidence bound in the cited meta-analysis, the top of a range, chosen deliberately for the most protein-demanding goal, not a typical requirement."]'::jsonb, '["The safety classifier blocks this band from reaching anyone for whom a high-protein target needs a clinician (chronic kidney disease, pregnancy, eating-disorder history)."]'::jsonb, 'draft', 1, null, 12, null
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
  'rate-cap-0-75kg-per-week', 'Bloom caps planned weight change at 0.75 kg per week.', 'weight_change_rate', 'insufficient', 0, 'Anyone using Bloom''s body-target calculator', '["The M-219 engine evidence audit (2026-11-22) set this cap against the published ranges it verified. CDC''s 1-2 lb per week and the AHA/ACC/TOS 500-750 kcal/day prescription the old 1 kg/week cap exceeded. Those sources are not yet registered in this catalogue, so the claim stays a draft: TO VERIFY, TO REGISTER.","How the ceiling should differ by body size remains unresolved."]'::jsonb, '["Deliberately recorded with no citation rather than attaching a plausible-looking reference to a number nobody checked.","Until a source is verified, this claim must not be presented to a person as evidence-based."]'::jsonb, '["A cap does not make an aggressive target safe for someone with a history of disordered eating; the safety classifier handles that separately."]'::jsonb, 'draft', 1, null, 12, null
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
  'rate-cap-1kg-per-week', 'Bloom caps planned weight change at 1 kg per week.', 'weight_change_rate', 'insufficient', 0, 'Anyone using Bloom''s body-target calculator', '["No source has been verified for this cap. It is a Phase 1 product safety constant, not a finding from the literature.","Whether 1 kg per week is the right ceiling for this population, and how it should differ by body size, is unresolved."]'::jsonb, '["Deliberately recorded with no citation rather than attaching a plausible-looking reference to a number nobody checked.","Until a source is verified, this claim must not be presented to a person as evidence-based."]'::jsonb, '["A cap does not make an aggressive target safe for someone with a history of disordered eating; the safety classifier handles that separately."]'::jsonb, 'draft', 2, null, 12, null
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
  'spectrum-rda-2020-references', 'The Nutrition tab''s micronutrient panel judges a day against reference intakes the code names as ICMR-NIN Recommended Dietary Allowances 2020: fibre 30 g, potassium 3,500 mg, magnesium 440 mg (370 mg for women), calcium 1,000 mg, iron 19 mg (29 mg for women), vitamin C 80 mg (65 mg for women), and sodium as a 2,000 mg ceiling rather than a goal. (Corrected at version 2, M-219: the magnesium figures previously recorded here were the ICMR-NIN estimated average requirements, not the RDA, and vitamin C was recorded as a single value where the RDA is sex-specific.)', 'dietary_pattern', 'insufficient', 0, 'Adults reading the Nutrition tab''s daily micronutrient panel', '["The values are stated in the code (src/lib/nutrition/dayView.ts, spectrumReferences) with the ICMR-NIN RDA 2020 attribution, but the registry has not verified them against the publication, so no source is linked."]'::jsonb, '["OPEN OWNER DECISION: this registry permission-gates ICMR-NIN publications for reproduction in a product (see icmr-nin-dgi-2024 and icmr-nin-ifct-2017). Whether stating RDA numeric values as reference intakes falls under the written permission Bloom is seeking is unresolved. The values stay in the product while the owner decides; this entry records the question and does not settle it."]'::jsonb, '["A day under a reference is a statement about the logged foods that report the nutrient, never a deficiency diagnosis, and no surface may word it as one."]'::jsonb, 'draft', 2, null, 12, null
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
  'usda-fdc-composition-source', 'Bloom''s reference food values come from USDA FoodData Central, the Foundation and SR Legacy datasets, each food carrying its FoodData Central id and data type, published under CC0 1.0 (public domain).', 'food_composition', 'moderate', 0.9, 'Anyone using Bloom''s food search, dish library or meal plans', '["FoodData Central is a living dataset and values can change between releases, which is why every shipped food records the release its values came from."]'::jsonb, '["This entry covers the dataset''s provenance and licence only. It does not certify any individual food value; each value''s standing rests on the dataset and on the per-food provenance the app shows."]'::jsonb, '["USDA values describe foods as analysed in the United States; a local variety or preparation can differ, so values are reference data, never a measurement of the food on a person''s plate."]'::jsonb, 'draft', 1, null, 12, null
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
  'water-efsa-drinking-share', 'Bloom''s daily water target is a drinking-water figure: a base of 1,900 ml for men, 1,500 ml for women and 1,700 ml when sex is unstated, plus an activity allowance of 0 to 700 ml, clamped between 1,200 and 3,000 ml. The base is set at roughly three quarters of EFSA''s total-water adequate intake (2.5 L a day for men, 2.0 L for women), the share ordinarily drunk rather than taken in food.', 'hydration', 'insufficient', 0, 'Adults using Bloom''s hydration tracker', '["The EFSA adequate-intake basis was verified by the M-219 engine evidence audit (2026-11-22) against EFSA''s 2010 opinion; the source is not yet registered in this catalogue, so the claim stays a draft: TO VERIFY, TO REGISTER.","The roughly-three-quarters drinking share is an estimate of how total water ordinarily splits between drink and food moisture, not an EFSA figure."]'::jsonb, '["EFSA''s adequate intake assumes a temperate climate; heat, illness and medication can move real needs well past any fixed figure."]'::jsonb, '["People whose condition or medication restricts fluid must follow their clinician, not this target."]'::jsonb, 'draft', 1, null, 12, null
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
  'water-35ml-per-kg', 'Bloom''s hydration target is 35 ml per kg of body weight plus an activity allowance of 0 to 1,000 ml, capped between 1,500 and 4,500 ml a day.', 'hydration', 'insufficient', 0, 'Adults using Bloom''s hydration tracker', '["The code calls 35 ml/kg the common adult maintenance estimate (src/lib/health/body.ts) with no source stated; recorded as TO VERIFY."]'::jsonb, '["A single per-kilogram figure ignores climate, illness and medication; heat alone can move real needs well past it."]'::jsonb, '["People whose condition or medication restricts fluid must follow their clinician, not this target."]'::jsonb, 'draft', 2, null, 12, null
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
  'who-healthy-diet-principles', 'Bloom''s plan design follows the healthy-diet principles of adequacy, balance, moderation and diversity.', 'dietary_pattern', 'insufficient', 0, 'Everyone Bloom designs plans for', '["The principles are recorded from the World Health Organization''s healthy-diet fact sheet as cited in the product vision; the registry has not verified the citation against the fact sheet, so no source is linked and the principles must not be presented as a verified WHO endorsement."]'::jsonb, '["Principles, not numeric rules: they shape design and review, and no plan figure is derived from them directly."]'::jsonb, '["A design principle never overrides a person''s recorded restrictions or the safety classifier."]'::jsonb, 'draft', 1, null, 12, null
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

insert into public.evidence_claim_sources as target (claim_id, source_id, direction, locator)
values ('usda-fdc-composition-source', 'usda-fooddata-central', 'supports', 'FoodData Central (fdc.nal.usda.gov). USDA publishes the data under CC0 1.0 and asks that FoodData Central be named as the source')
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
values ('vitalis.safety.rate-cap', 'The Phase 1 classifier clamps requested pace to this constant. Phase 2 records the rule and the fact that its evidence is missing, rather than inventing support for a number that was chosen as a safety margin. Implemented in src/lib/vitalis/domain/safety.ts. MIN_RATE_KG_PER_WEEK / MAX_RATE_KG_PER_WEEK.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.nutrition.composition-source', 'Implemented in src/lib/nutrition/usdaReference.ts: its licence gate resolves the usda provenance kind to this registry''s usda-fooddata-central source and fails closed for any source that is not product-allowed, which is what keeps IFCT and INDB values out of the product until written permission exists.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.body.bmr-equation', 'Implemented in src/lib/health/body.ts, bmrOf (Mifflin–St Jeor; sex constants +5 / −161 / −78). The Vitalis calculation path consumes the same figures via src/lib/vitalis/calc/body.ts (targetsFor).')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.body.activity-factors', 'Implemented in src/lib/health/body.ts. ACTIVITY_FACTOR, applied in bodyTargetsOf as TDEE = BMR × factor.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.body.protein-recomp', 'Implemented in src/lib/health/body.ts, bodyTargetsOf sets proteinPerKg to 2.2 when the goal is recomp; the comment there carries the citations this claim records as unverified.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.body.protein-bands', 'Implemented in src/lib/health/body.ts, bodyTargetsOf proteinPerKg: 1.8 (lose), 1.6 (gain), 1.4 (maintain).')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.body.energy-per-kg', 'Implemented in src/lib/nutrition/expenditure.ts. ENERGY_KCAL_PER_KG = 7700; the same figure appears as the 7700 literal in src/lib/health/body.ts, where bodyTargetsOf turns a weekly rate into a daily delta.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.body.calorie-floor', 'Implemented in src/lib/health/body.ts, calorieFloor(sex) returns 1500 / 1200 / 1350; bodyTargetsOf clamps the target to at least the floor and records floorApplied so the surface can say the floor did the work.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.nutrition.spectrum-references', 'Implemented in src/lib/nutrition/dayView.ts, spectrumReferences(sex) returns the seven reference rows the panel and the gap detection judge against.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.plan.composition-caps', 'Implemented in src/lib/nutrition/plan.ts, the portion-cap constants (CAP_GRAIN_DRY_G, CAP_DRY_PULSES_G, CAP_EGGS_G and their family) and the day-floor checks of the layered composer.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.body.hydration-target', 'Implemented in src/lib/health/body.ts, bodyTargetsOf computes waterMl as weightKg × 35 plus the activity bonus, clamped to [1500, 4500] and rounded to 50 ml.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.guidance.healthy-diet-principles', 'Design principles for plan composition and review. Where they bite in code is the composer''s variety and adequacy behaviour in src/lib/nutrition/plan.ts; no numeric target derives from them.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.safety.no-vlcd', 'Enforced by construction: calorieFloor in src/lib/health/body.ts plus the rate cap in src/lib/vitalis/domain/safety.ts (MIN_RATE_KG_PER_WEEK / MAX_RATE_KG_PER_WEEK) keep self-directed targets out of very-low-energy territory, and the safety classifier directs the people it flags to professional assessment.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.plan.budget-tiers', 'Implemented in src/lib/nutrition/dishes.ts. BUDGET_TIER_1_MAX_PER_SERVING = 20 and BUDGET_TIER_2_MAX_PER_SERVING = 45 (₹ per serving) over the stated ₹-per-gram group bands.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.plan.dish-regions', 'Implemented in src/lib/nutrition/regions.ts, the curated north/south marker tables; the plan composer applies the result as a ranking bonus, never a filter.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.plan.micro-gap-bias', 'Implemented in src/lib/nutrition/planAdaptation.ts, microGapsFor applies MICRO_GAP_RATIO = 0.7 with MICRO_MIN_DAYS = 4 reporting days inside MICRO_WINDOW_DAYS = 7, and the composer favours dishes rich in a gap nutrient (MICRO_RICH_SHARE).')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

insert into public.evidence_recommendations as target (id, rationale)
values ('vitalis.plan.log-adaptation', 'Implemented in src/lib/nutrition/planAdaptation.ts, planAdaptationFor applies PROTEIN_SHORTFALL_RATIO = 0.85 and ENERGY_OVERSHOOT_RATIO = 1.1 over the last two to three logged days; targets are read, never written.')
on conflict (id) do update set
    rationale = excluded.rationale,
    updated_at = now()
  where target.rationale is distinct from excluded.rationale;

-- section: recommendation-claims
insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.guidance.whole-foods', 'dga-whole-foods-emphasis')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.safety.rate-cap', 'rate-cap-0-75kg-per-week')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.nutrition.composition-source', 'usda-fdc-composition-source')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.body.bmr-equation', 'mifflin-st-jeor-bmr')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.body.activity-factors', 'activity-factor-table')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.body.protein-recomp', 'protein-recomp-2-2')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.body.protein-bands', 'protein-bands-by-goal')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.body.energy-per-kg', 'energy-per-kg-7700')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.body.calorie-floor', 'calorie-floors')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.nutrition.spectrum-references', 'spectrum-rda-2020-references')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.plan.composition-caps', 'plan-composition-derivations')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.body.hydration-target', 'water-efsa-drinking-share')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.guidance.healthy-diet-principles', 'who-healthy-diet-principles')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.safety.no-vlcd', 'nice-ng246-individualisation')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.plan.budget-tiers', 'budget-tier-cost-bands')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.plan.dish-regions', 'dish-region-markers')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.plan.micro-gap-bias', 'micro-gap-threshold')
on conflict (recommendation_id, claim_id) do nothing;

insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
values ('vitalis.plan.log-adaptation', 'adaptation-ratios')
on conflict (recommendation_id, claim_id) do nothing;

-- section: claims-final
-- Only now, with citations in place, may a claim take its recorded status.
update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'activity-factor-table'
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

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'adaptation-ratios'
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

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'budget-tier-cost-bands'
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

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'calorie-floors'
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
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'dish-region-markers'
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

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'energy-per-kg-7700'
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
 where id = 'micro-gap-threshold'
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

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'mifflin-st-jeor-bmr'
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

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'nice-ng246-individualisation'
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

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'plan-composition-derivations'
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

update public.evidence_claims
   set review_status = 'draft',
       version = 2,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'protein-bands-by-goal'
   and version <= 2
   and (superseded_by is null or superseded_by = null)
   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)
       is distinct from row(
         'draft',
         2,
         null::date,
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
 where id = 'protein-recomp-2-2'
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

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'rate-cap-0-75kg-per-week'
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

update public.evidence_claims
   set review_status = 'superseded',
       version = 2,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = 'rate-cap-0-75kg-per-week',
       updated_at = now()
 where id = 'rate-cap-1kg-per-week'
   and version <= 2
   and (superseded_by is null or superseded_by = 'rate-cap-0-75kg-per-week')
   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)
       is distinct from row(
         'superseded',
         2,
         null::date,
         12::smallint,
         'rate-cap-0-75kg-per-week'
       );

update public.evidence_claims
   set review_status = 'draft',
       version = 2,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'spectrum-rda-2020-references'
   and version <= 2
   and (superseded_by is null or superseded_by = null)
   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)
       is distinct from row(
         'draft',
         2,
         null::date,
         12::smallint,
         null::text
       );

update public.evidence_claims
   set review_status = 'approved',
       version = 1,
       reviewed_on = '2026-11-18'::date,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'usda-fdc-composition-source'
   and version <= 1
   and (superseded_by is null or superseded_by = null)
   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)
       is distinct from row(
         'approved',
         1,
         '2026-11-18'::date,
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
 where id = 'water-efsa-drinking-share'
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

update public.evidence_claims
   set review_status = 'superseded',
       version = 2,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = 'water-efsa-drinking-share',
       updated_at = now()
 where id = 'water-35ml-per-kg'
   and version <= 2
   and (superseded_by is null or superseded_by = 'water-efsa-drinking-share')
   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)
       is distinct from row(
         'superseded',
         2,
         null::date,
         12::smallint,
         'water-efsa-drinking-share'
       );

update public.evidence_claims
   set review_status = 'draft',
       version = 1,
       reviewed_on = null,
       review_interval_months = 12,
       superseded_by = null,
       updated_at = now()
 where id = 'who-healthy-diet-principles'
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

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'source', 'usda-fooddata-central', 2, '2026-11-18'::date, 'vitalis-evidence-registry', 'Notes updated: the shipped reference set has been checked entry by entry (FDC id and data type per food, Foundation and SR Legacy only), and claim usda-fdc-composition-source now cites this source for provenance and licence. Bibliographic details unchanged.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'source'
      and entity_id = 'usda-fooddata-central'
      and version = 2
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'usda-fdc-composition-source', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the engine''s composition-source rule (Evidence Registry v1): approved against the CC0 dataset record after the shipped set''s per-food FDC ids and data types were checked in code.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'usda-fdc-composition-source'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'mifflin-st-jeor-bmr', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the BMR equation as implemented in src/lib/health/body.ts (Evidence Registry v1). Draft with no source: the equation is named in code, its bibliographic citation is TO VERIFY.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'mifflin-st-jeor-bmr'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'activity-factor-table', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the ACTIVITY_FACTOR table as implemented (Evidence Registry v1). Draft with no source: no citation is stated in the code.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'activity-factor-table'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'protein-recomp-2-2', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the 2.2 g/kg recomposition band (Evidence Registry v1). Draft: the Morton et al. 2018 (BJSM) and ISSN citations are recorded as they appear in the code comment, unverified against the publications.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'protein-recomp-2-2'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'protein-bands-by-goal', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the 1.8 / 1.6 / 1.4 g/kg protein bands (Evidence Registry v1). Draft with no source: none is stated in the code.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'protein-bands-by-goal'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'energy-per-kg-7700', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the 7,700 kcal/kg constant as a stated approximation (Evidence Registry v1). Draft: formal citation TO VERIFY.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'energy-per-kg-7700'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'calorie-floors', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the 1500 / 1200 / 1350 kcal floors (Evidence Registry v1). Draft with no source: the code calls them commonly used minimums and cites nothing.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'calorie-floors'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'spectrum-rda-2020-references', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the Spectrum reference intakes with their in-code ICMR-NIN RDA 2020 attribution (Evidence Registry v1). Draft with no source, and the ICMR licence question recorded in its limitations as an open owner decision.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'spectrum-rda-2020-references'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'plan-composition-derivations', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the composer''s portion caps and day floors as engine derivations from the My Plate framework, BNF portions and ISSN distribution guidance (Evidence Registry v1). Draft: derivations recorded, BNF/ISSN citations TO VERIFY, no guideline text reproduced.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'plan-composition-derivations'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'water-35ml-per-kg', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the 35 ml/kg hydration target (Evidence Registry v1). Draft with no source: none is stated in the code.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'water-35ml-per-kg'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'who-healthy-diet-principles', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the WHO healthy-diet principles (adequacy, balance, moderation, diversity) as design principles (Evidence Registry v1). Draft: the fact-sheet citation is recorded as cited in the product vision, TO VERIFY / TO REGISTER as a source.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'who-healthy-diet-principles'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'nice-ng246-individualisation', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the individualisation and no-very-low-energy-diet rule (Evidence Registry v1). Draft: NICE NG246 recorded as cited in the product vision; no conformance claimed.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'nice-ng246-individualisation'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'budget-tier-cost-bands', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the dish budget tiers as an engine derivation from stated 2026 retail approximations, labelled an estimate (Evidence Registry v1). No external citation applies.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'budget-tier-cost-bands'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'dish-region-markers', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the North/South dish-region marker tables as curated engine data (Evidence Registry v1), so the absence of an external citation is deliberate and visible.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'dish-region-markers'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'micro-gap-threshold', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the micronutrient gap threshold (70% of reference, at least 4 of 7 logged days) (Evidence Registry v1). Draft with no source: none is stated in the code.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'micro-gap-threshold'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'adaptation-ratios', 1, '2026-11-18'::date, 'vitalis-evidence-registry', 'Registered the log-adaptation ratios (protein under 85%, energy over 110% of target) (Evidence Registry v1). Draft with no source: none is stated in the code.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'adaptation-ratios'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'rate-cap-1kg-per-week', 2, '2026-11-22'::date, 'vitalis-evidence-registry', 'Marked superseded by rate-cap-0-75kg-per-week: the M-219 engine evidence audit found the 1 kg/week cap exceeds the CDC and AHA/ACC/TOS ranges, and the engine''s cap changed with it. Retained for history, no longer the live rule.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'rate-cap-1kg-per-week'
      and version = 2
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'rate-cap-0-75kg-per-week', 1, '2026-11-22'::date, 'vitalis-evidence-registry', 'Registered the 0.75 kg/week rate cap (M-219). Draft: the audit''s CDC and AHA/ACC/TOS sources are recorded in the claim''s uncertainty as TO VERIFY / TO REGISTER, not yet linked.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'rate-cap-0-75kg-per-week'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'water-35ml-per-kg', 2, '2026-11-22'::date, 'vitalis-evidence-registry', 'Marked superseded by water-efsa-drinking-share: the M-219 audit found the 35 ml/kg rule produced a drinking schedule above EFSA''s total-water adequate intake, and the engine''s formula changed with it. Retained for history.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'water-35ml-per-kg'
      and version = 2
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'water-efsa-drinking-share', 1, '2026-11-22'::date, 'vitalis-evidence-registry', 'Registered the drinking-share hydration target (M-219). Draft: the EFSA 2010 adequate-intake basis is recorded in the claim''s uncertainty as TO VERIFY / TO REGISTER, not yet linked.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'water-efsa-drinking-share'
      and version = 1
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'protein-bands-by-goal', 2, '2026-11-22'::date, 'vitalis-evidence-registry', 'Statement corrected (M-219, audit F-05): above a BMI of 23 the bands now multiply the healthy-ceiling reference weight, not current body weight. The bands themselves are unchanged.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'protein-bands-by-goal'
      and version = 2
 );

insert into public.evidence_revisions
  (entity_type, entity_id, version, changed_on, changed_by, summary)
select 'claim', 'spectrum-rda-2020-references', 2, '2026-11-22'::date, 'vitalis-evidence-registry', 'Statement corrected (M-219, audit F-09): magnesium is the ICMR-NIN RDA 2020 (440 mg men / 370 mg women), not the EAR figures previously recorded, and vitamin C is sex-specific (80 mg men / 65 mg women). The OPEN OWNER DECISION limitation is unchanged.'
 where not exists (
   select 1 from public.evidence_revisions
    where entity_type = 'claim'
      and entity_id = 'spectrum-rda-2020-references'
      and version = 2
 );
