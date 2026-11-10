/**
 * Integration suite — the generated evidence seed against real PostgreSQL.
 *
 * The unit suite proves the file is deterministic, fresh and contained. This one
 * proves the thing that actually matters: that PostgreSQL accepts it, that the
 * rows it leaves behind are exactly the catalogue, and that running it a second
 * time changes nothing but the clock columns.
 *
 * It also re-checks that seeding does not weaken the Phase 2 licence gate. A seed
 * that loaded the catalogue by disabling a trigger, or by inserting claims as
 * approved before their citations existed, would pass a naive row-count test and
 * fail the security property the whole registry exists for.
 */

import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CATALOG } from "../evidence/catalog";
import { catalogHashLabel } from "../evidence/seed/canonical";
import { buildSeedSql, SEED_FILE } from "../evidence/seed/sql";
import type { EvidenceRegistry } from "../evidence/types";
import { makeHarness, type TestContext } from "./harness";

let db: TestContext;

const IMPORT_ON = `set local session authorization evidence_importer;
  set local bloom.evidence_import = 'on';
  set local bloom.evidence_reason = 'catalogue follow-up from the integration suite';`;
const IMPORT_OFF = "reset session authorization;";

const SEED_SQL = readFileSync(new URL(`../../../../${SEED_FILE}`, import.meta.url), "utf8");

/**
 * Phase 2.2: the catalogue is applied through the labelled import path. The seed
 * file itself is unchanged — it is generated — so the identity switch lives here,
 * exactly as the runbook does it.
 */
async function runSeed(): Promise<void> {
  await db.raw(`set local session authorization evidence_importer;
    set local bloom.evidence_import = 'on';
    set local bloom.evidence_reason = 'catalogue application from the integration suite';`);
  await db.raw(SEED_SQL);
  await db.raw("reset session authorization");
}

/** Run a statement expected to be refused, without aborting the transaction. */
async function rejectionMessage(sql: string): Promise<string> {
  const savepoint = `sp_${Math.random().toString(36).slice(2, 10)}`;
  await db.raw(`savepoint ${savepoint}`);
  let message = "";
  try {
    await db.raw(sql);
  } catch (error) {
    message = (error as Error).message;
  }
  await db.raw(`rollback to savepoint ${savepoint}`);
  return message;
}

type Row = Record<string, unknown>;

async function rows(sql: string): Promise<Row[]> {
  return db.all<Row>(sql);
}

async function count(table: string): Promise<number> {
  return (await db.one<number>(`select count(*)::int from public.${table}`)) ?? -1;
}

/** Every row of every registry table, in a stable order. */
const SNAPSHOT_TABLES = [
  ["evidence_sources", "id"],
  ["evidence_claims", "id"],
  ["evidence_claim_sources", "claim_id, source_id"],
  ["evidence_recommendations", "id"],
  ["evidence_recommendation_claims", "recommendation_id, claim_id"],
  ["evidence_revisions", "id"],
] as const;

/**
 * The whole registry, timestamps included.
 *
 * Comparing this before and after a run is the only honest way to assert that a
 * seed "changed nothing": a row count would miss a rewritten value, and a value
 * comparison would miss a refreshed `updated_at`.
 */
async function snapshot(): Promise<Record<string, Row[]>> {
  const out: Record<string, Row[]> = {};
  for (const [table, order] of SNAPSHOT_TABLES) {
    out[table] = await rows(`select * from public.${table} order by ${order}`);
  }
  return out;
}

function text(value: unknown): string {
  return value as string;
}

function nullable(value: unknown): string | null {
  return (value as string | null) ?? null;
}

function sortedById<T extends { readonly id: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

function normaliseSource(row: Row) {
  return {
    id: text(row["id"]),
    title: text(row["title"]),
    kind: text(row["kind"]),
    publisher: text(row["publisher"]),
    authors: row["authors"] as string[],
    publicationYear: Number(row["publication_year"]),
    url: text(row["url"]),
    license: text(row["license_id"]),
    licenseUrl: nullable(row["license_url"]),
    licenseNote: text(row["license_note"]),
    productUseAllowed: row["product_use_allowed"] as boolean,
    permissionRequired: row["permission_required"] as boolean,
    peerReviewed: row["peer_reviewed"] as boolean,
    retrievedOn: text(row["retrieved_on"]),
    publishedOn: nullable(row["published_on"]),
    reviewedOn: nullable(row["reviewed_on"]),
    reviewIntervalMonths: Number(row["review_interval_months"]),
    reviewStatus: text(row["review_status"]),
    version: Number(row["version"]),
    supersededBy: nullable(row["superseded_by"]),
    notes: nullable(row["notes"]),
  };
}

function normaliseClaim(row: Row) {
  return {
    id: text(row["id"]),
    statement: text(row["statement"]),
    topic: text(row["topic"]),
    grade: text(row["grade"]),
    confidence: Number(row["confidence"]),
    population: text(row["population"]),
    uncertainty: row["uncertainty"] as string[],
    limitations: row["limitations"] as string[],
    contraindications: row["contraindications"] as string[],
    reviewStatus: text(row["review_status"]),
    version: Number(row["version"]),
    reviewedOn: nullable(row["reviewed_on"]),
    reviewIntervalMonths: Number(row["review_interval_months"]),
    supersededBy: nullable(row["superseded_by"]),
  };
}

const SELECT_SOURCES = `select id, title, kind, publisher, authors, publication_year, url,
  license_id, license_url, license_note, product_use_allowed, permission_required,
  peer_reviewed, retrieved_on::text as retrieved_on,
  published_on::text as published_on, reviewed_on::text as reviewed_on,
  review_interval_months, review_status, version, superseded_by, notes
 from public.evidence_sources`;

const SELECT_CLAIMS = `select id, statement, topic, grade, confidence::text as confidence,
  population, uncertainty, limitations, contraindications, review_status, version,
  reviewed_on::text as reviewed_on, review_interval_months, superseded_by
 from public.evidence_claims`;

beforeEach(async () => {
  db = await makeHarness("evidence-seed");
});

afterEach(async () => {
  await db?.destroy();
});

describe("evidence seed against real PostgreSQL", () => {
  it("applies cleanly to a database that has only the migrations", async () => {
    expect(await count("evidence_sources")).toBe(0);
    await expect(runSeed()).resolves.toBeUndefined();
    expect(await count("evidence_sources")).toBe(CATALOG.sources.length);
    expect(await count("evidence_claims")).toBe(CATALOG.claims.length);
  });

  it("reproduces the catalogue field for field", async () => {
    await runSeed();

    const sources = (await rows(SELECT_SOURCES)).map(normaliseSource);
    expect(sortedById(sources)).toEqual(sortedById(CATALOG.sources));

    const claims = (await rows(SELECT_CLAIMS)).map(normaliseClaim);
    // Citations live in their own table and are compared separately below, so
    // the claim comparison deliberately drops the catalogue's `sources` array.
    const expected = CATALOG.claims.map((claim) => {
      const { sources: _citations, ...scalar } = claim;
      return scalar;
    });
    expect(sortedById(claims)).toEqual(sortedById(expected));
  });

  it("reproduces every citation with its locator and direction", async () => {
    await runSeed();

    const stored = (
      await rows(
        `select claim_id, source_id, direction, locator from public.evidence_claim_sources`,
      )
    )
      .map((row) => ({
        claimId: text(row["claim_id"]),
        sourceId: text(row["source_id"]),
        direction: text(row["direction"]),
        locator: text(row["locator"]),
      }))
      .sort((a, b) => `${a.claimId}/${a.sourceId}`.localeCompare(`${b.claimId}/${b.sourceId}`));

    const expected = CATALOG.claims
      .flatMap((claim) =>
        claim.sources.map((link) => ({
          claimId: claim.id,
          sourceId: link.sourceId,
          direction: link.direction,
          locator: link.locator,
        })),
      )
      .sort((a, b) => `${a.claimId}/${a.sourceId}`.localeCompare(`${b.claimId}/${b.sourceId}`));

    expect(stored).toEqual(expected);
  });

  it("reproduces recommendation traceability", async () => {
    await runSeed();

    const recommendations = (
      await rows("select id, rationale from public.evidence_recommendations")
    )
      .map((row) => ({ id: text(row["id"]), rationale: text(row["rationale"]) }))
      .sort((a, b) => a.id.localeCompare(b.id));

    expect(recommendations).toEqual(
      CATALOG.recommendations
        .map((entry) => ({ id: entry.recommendationId, rationale: entry.rationale }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );

    const links = (
      await rows("select recommendation_id, claim_id from public.evidence_recommendation_claims")
    )
      .map((row) => ({
        recommendationId: text(row["recommendation_id"]),
        claimId: text(row["claim_id"]),
      }))
      .sort((a, b) =>
        `${a.recommendationId}/${a.claimId}`.localeCompare(`${b.recommendationId}/${b.claimId}`),
      );

    expect(links).toEqual(
      CATALOG.recommendations
        .flatMap((entry) =>
          entry.claimIds.map((claimId) => ({
            recommendationId: entry.recommendationId,
            claimId,
          })),
        )
        .sort((a, b) =>
          `${a.recommendationId}/${a.claimId}`.localeCompare(`${b.recommendationId}/${b.claimId}`),
        ),
    );
  });

  it("records the catalogue's revision history and nothing more", async () => {
    await runSeed();

    const stored = (
      await rows(
        `select entity_type, entity_id, version, changed_on::text as changed_on,
              changed_by, summary
         from public.evidence_revisions`,
      )
    )
      .map((row) => ({
        entityType: text(row["entity_type"]),
        entityId: text(row["entity_id"]),
        version: Number(row["version"]),
        changedOn: text(row["changed_on"]),
        changedBy: text(row["changed_by"]),
        summary: text(row["summary"]),
      }))
      .sort((a, b) =>
        `${a.entityType}/${a.entityId}/${String(a.version)}`.localeCompare(
          `${b.entityType}/${b.entityId}/${String(b.version)}`,
        ),
      );

    expect(stored).toEqual(
      CATALOG.revisions
        .map((revision) => ({ ...revision }))
        .sort((a, b) =>
          `${a.entityType}/${a.entityId}/${String(a.version)}`.localeCompare(
            `${b.entityType}/${b.entityId}/${String(b.version)}`,
          ),
        ),
    );
  });

  it("changes nothing at all when applied a second time", async () => {
    await runSeed();
    const before = await snapshot();

    await expect(runSeed()).resolves.toBeUndefined();

    // Every column of every row, `created_at` and `updated_at` included: an
    // unchanged catalogue must not even refresh a bookkeeping timestamp.
    expect(await snapshot()).toEqual(before);

    // History is append-only, so a re-run must not duplicate a version record.
    expect(before["evidence_revisions"]).toHaveLength(CATALOG.revisions.length);
  });

  it("lands each claim in the status the catalogue records", async () => {
    await runSeed();

    const statuses = (await rows("select id, review_status from public.evidence_claims"))
      .map((row) => ({ id: text(row["id"]), status: text(row["review_status"]) }))
      .sort((a, b) => a.id.localeCompare(b.id));

    expect(statuses).toEqual(
      CATALOG.claims
        .map((claim) => ({ id: claim.id, status: claim.reviewStatus }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );

    // The honest state of the registry: exactly one claim is usable today, and
    // it rests on public-domain US guidance rather than on Indian material.
    expect(
      await db.one<number>(
        "select count(*)::int from public.evidence_claims where review_status = 'approved'",
      ),
    ).toBe(1);
    expect(
      await db.one<number>(`select count(*)::int from public.evidence_claims
         where review_status = 'approved'
           and not exists (
             select 1 from public.evidence_claim_sources l
               join public.evidence_sources s on s.id = l.source_id
              where l.claim_id = evidence_claims.id and s.product_use_allowed
           )`),
    ).toBe(0);
  });

  it("does not disable the licence gate while seeding", async () => {
    await runSeed();

    // The seeded approved claim still refuses a source we may not ship, so the
    // seed loaded data through the gate rather than around it.
    // A new row may not start life approved outside the import path.
    await db.raw(IMPORT_ON);
    await db.raw(`insert into public.evidence_sources (
        id, title, kind, publisher, authors, publication_year, url, license_id,
        license_note, product_use_allowed, permission_required, peer_reviewed,
        retrieved_on, reviewed_on, review_interval_months, review_status, notes)
      values ('newly-restricted', 'A source added after seeding', 'guideline',
        'Fixture Publisher', array['Fixture Author'], 2024, 'https://example.org/restricted',
        'nin-copyright-restricted',
        'Fixture terms recorded for this test, long enough to satisfy the constraint.',
        false, true, false, '2026-01-01', '2026-01-01', 60, 'approved', null)`);
    await db.raw(IMPORT_OFF);

    const message = await rejectionMessage(
      `insert into public.evidence_claim_sources (claim_id, source_id, direction, locator)
       values ('dga-whole-foods-emphasis', 'newly-restricted', 'mixed', 'Fixture locator')`,
    );
    expect(message).toMatch(/is approved; source .* is not approved for product use/);

    // And a claim still cannot be approved while it cites something unusable.
    // Phase 2.2 requires a reason for every status change; the gate is what this
    // test is about, so the reason is supplied and the gate still refuses.
    await db.raw(
      `select set_config('bloom.evidence_reason', 're-approving a catalogued claim', true)`,
    );
    const approval = await rejectionMessage(
      `update public.evidence_claims
          set review_status = 'approved', reviewed_on = '2026-11-05'
        where id = 'icmr-dgi-food-variety'`,
    );
    expect(approval).toMatch(/is not approved for product use/);
  });

  it("serves the seeded registry to a signed-in reader and to nobody else", async () => {
    await runSeed();

    await db.setRole("authenticated", "");
    expect(await db.one<number>("select count(*)::int from public.evidence_sources")).toBe(
      CATALOG.sources.length,
    );
    expect(await db.one<number>("select count(*)::int from public.evidence_claims")).toBe(
      CATALOG.claims.length,
    );

    await db.setRole("anon", "");
    const message = await rejectionMessage("select count(*) from public.evidence_sources");
    expect(message).toMatch(/permission denied/);
  });

  it("refuses a citation the catalogue does not describe, and leaves it in place", async () => {
    await runSeed();

    const claim = CATALOG.claims.find(
      (entry) => entry.reviewStatus !== "approved" && entry.sources.length > 0,
    );
    if (!claim) throw new Error("fixture: expected a claim that is not approved");
    const source = CATALOG.sources.find(
      (entry) =>
        entry.reviewStatus === "approved" &&
        entry.productUseAllowed &&
        !claim.sources.some((link) => link.sourceId === entry.id),
    );
    if (!source) throw new Error("fixture: expected an uncited, usable source");

    await db.raw(`insert into public.evidence_claim_sources
        (claim_id, source_id, direction, locator)
      values ('${claim.id}', '${source.id}', 'mixed', 'Added by hand, not in catalog.ts')`);

    const before = await snapshot();
    const message = await rejectionMessage(SEED_SQL);

    expect(message).toMatch(/citations exist that the catalogue does not describe/);
    expect(message).toContain(`${claim.id} -> ${source.id}`);
    // The refused seed wrote nothing and removed nothing: the citation is still
    // there, which is the whole point of refusing instead of pruning.
    expect(await snapshot()).toEqual(before);
  });

  it("refuses a recommendation link the catalogue does not describe", async () => {
    await runSeed();

    const recommendation = CATALOG.recommendations[0];
    if (!recommendation) throw new Error("fixture: expected a recommendation");
    const claim = CATALOG.claims.find((entry) => !recommendation.claimIds.includes(entry.id));
    if (!claim) throw new Error("fixture: expected a claim outside the recommendation");

    await db.raw(`insert into public.evidence_recommendation_claims (recommendation_id, claim_id)
      values ('${recommendation.recommendationId}', '${claim.id}')`);

    const before = await snapshot();
    const message = await rejectionMessage(SEED_SQL);

    expect(message).toMatch(/recommendation links exist that the catalogue does not describe/);
    expect(message).toContain(`${recommendation.recommendationId} -> ${claim.id}`);
    expect(await snapshot()).toEqual(before);
  });

  it("refuses a source the catalogue does not describe, and leaves it in place", async () => {
    await runSeed();

    await db.raw(`insert into public.evidence_sources
        (id, title, kind, publisher, authors, publication_year, url, license_id,
         license_note, product_use_allowed, permission_required, peer_reviewed,
         retrieved_on, reviewed_on, review_interval_months, review_status, notes)
      values ('retired-by-hand', 'A source added outside the catalogue', 'guideline',
        'Fixture Publisher', array['Fixture Author'], 2024, 'https://example.org/retired',
        'unknown',
        'Terms are unknown for this fixture row, so it must not ship in a product.',
        false, true, false, '2026-01-01', null, 12, 'draft', null)`);

    const before = await snapshot();
    const message = await rejectionMessage(SEED_SQL);

    expect(message).toMatch(/evidence_sources holds rows the catalogue does not describe/);
    expect(message).toContain("retired-by-hand");
    expect(await snapshot()).toEqual(before);
  });

  it("refuses to revert a row the database has moved to a newer version", async () => {
    await runSeed();

    const claim = CATALOG.claims.find((entry) => entry.reviewStatus === "approved");
    if (!claim) throw new Error("fixture: expected an approved claim");
    const newer = claim.version + 1;
    // A version carries its narrative, so the bump is written with one. The point
    // of this test is the catalogue's version guard, not the narrative rule.
    await db.raw(
      `update public.evidence_claims set version = ${String(newer)} where id = '${claim.id}';
       insert into public.evidence_revisions
         (entity_type, entity_id, version, changed_on, changed_by, summary)
       values ('claim', '${claim.id}', ${String(newer)}, current_date, 'test:bump',
               'Fixture bump so the catalogue version guard has something newer to refuse.')`,
    );

    const message = await rejectionMessage(SEED_SQL);

    expect(message).toMatch(/newer in the database than in the catalogue/);
    expect(
      await db.one<number>(`select version from public.evidence_claims where id = '${claim.id}'`),
    ).toBe(newer);
  });

  it("refuses to return a reviewed claim to draft", async () => {
    await runSeed();

    const approved = CATALOG.claims.find((entry) => entry.reviewStatus === "approved");
    if (!approved) throw new Error("fixture: expected an approved claim");

    // The only way to provoke this refusal is a catalogue that demotes a reviewed
    // claim, so the variant seed is generated from one.
    const demoted: EvidenceRegistry = {
      ...CATALOG,
      claims: CATALOG.claims.map((claim) =>
        claim.id === approved.id
          ? { ...claim, reviewStatus: "draft" as const, reviewedOn: null }
          : claim,
      ),
    };
    const message = await rejectionMessage(buildSeedSql(demoted, catalogHashLabel(demoted)));

    expect(message).toMatch(/would return it to draft/);
    expect(
      await db.one<string>(
        `select review_status from public.evidence_claims where id = '${approved.id}'`,
      ),
    ).toBe("approved");
  });

  it("refuses to erase a supersession the database already records", async () => {
    await runSeed();

    const current = CATALOG.sources.filter(
      (entry) => entry.supersededBy === null && entry.reviewStatus === "approved",
    );
    const doomed = current[0];
    const replacement = current[1];
    if (!doomed || !replacement) throw new Error("fixture: expected two current sources");

    await db.raw(`update public.evidence_sources
        set review_status = 'superseded', superseded_by = '${replacement.id}'
      where id = '${doomed.id}'`);

    const message = await rejectionMessage(SEED_SQL);

    expect(message).toMatch(/supersession history the catalogue would erase/);
    expect(
      await db.one<string>(
        `select superseded_by from public.evidence_sources where id = '${doomed.id}'`,
      ),
    ).toBe(replacement.id);
  });

  it("refuses to run before the evidence migration has been applied", async () => {
    // The preflight exists so a seed pointed at the wrong database stops at once
    // rather than leaving a partial catalogue behind. Prove it fires by hiding
    // the table inside this transaction only.
    await db.raw("alter table public.evidence_sources rename to evidence_sources_hidden");
    const message = await rejectionMessage(SEED_SQL);
    expect(message).toMatch(/evidence tables are missing/);
    await db.raw("alter table public.evidence_sources_hidden rename to evidence_sources");
  });
});
