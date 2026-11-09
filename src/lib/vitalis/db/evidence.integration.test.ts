/**
 * Integration suite — the Phase 2 evidence registry against real PostgreSQL.
 *
 * The unit tests check the TypeScript rules. This checks that the database
 * enforces them too, because the rules that matter here are the ones that decide
 * whether copyrighted material can reach a shipped product, and a rule that only
 * exists in an in-memory validator is a rule a direct SQL statement ignores.
 *
 * Same harness as the security suite: a real PostgreSQL server, real roles, one
 * rolled-back transaction per test, and the dedicated `vitalis_test` database.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeHarness, type TestContext } from "./harness";

/**
 * Phase 2.2: a new row may not start life already reviewed, so fixtures that need
 * an approved row create it through the same labelled import path the catalogue
 * uses. The lifecycle rules themselves are covered by
 * evidence-lifecycle.integration.test.ts.
 */
const IMPORT_ON = `set local session authorization evidence_importer;
  set local bloom.evidence_import = 'on';
  set local bloom.evidence_reason = 'fixture setup through the labelled import path';`;
const IMPORT_OFF = "reset session authorization;";

let db: TestContext;

const EVIDENCE_TABLES = [
  "evidence_sources",
  "evidence_claims",
  "evidence_claim_sources",
  "evidence_recommendations",
  "evidence_recommendation_claims",
  "evidence_revisions",
] as const;

const USABLE_LICENSES = ["us-public-domain", "cc0-1.0", "cc-by-4.0"];

function sourceInsert(
  id: string,
  licenseId: string,
  status: string,
  overrides: { readonly productUseAllowed?: boolean; readonly permissionRequired?: boolean } = {},
): string {
  const derived = USABLE_LICENSES.includes(licenseId);
  const usable = overrides.productUseAllowed ?? derived;
  const permission = overrides.permissionRequired ?? !derived;
  return `insert into public.evidence_sources (
      id, title, kind, publisher, authors, publication_year, url, license_id,
      license_note, product_use_allowed, permission_required, peer_reviewed,
      retrieved_on, reviewed_on, review_interval_months, review_status, notes
    ) values (
      '${id}', 'Fixture source ${id}', 'guideline', 'Fixture Publisher', array['Fixture Author'],
      2024, 'https://example.org/${id}', '${licenseId}',
      'Fixture terms recorded for the integration suite, long enough to pass.',
      ${usable}, ${permission}, false, '2026-01-01', '2026-01-01', 60, '${status}', null
    )`;
}

function claimInsert(id: string, status: string): string {
  const reviewed = status === "approved" ? "'2026-01-01'" : "null";
  return `insert into public.evidence_claims (
      id, statement, topic, grade, confidence, population, uncertainty,
      limitations, contraindications, review_status, reviewed_on, review_interval_months
    ) values (
      '${id}', 'A fixture claim statement for the integration suite.', 'dietary_pattern',
      'moderate', 0.5, 'Fixture population', '["Something remains unknown."]'::jsonb,
      '[]'::jsonb, '[]'::jsonb, '${status}', ${reviewed}, 12
    )`;
}

function linkInsert(claimId: string, sourceId: string, direction = "supports"): string {
  return `insert into public.evidence_claim_sources (claim_id, source_id, direction, locator)
    values ('${claimId}', '${sourceId}', '${direction}', 'Guideline 1, fixture locator')`;
}

/**
 * Run a statement expected to be refused, and return the server's message.
 *
 * Each attempt sits in its own savepoint: a rejection aborts the enclosing
 * transaction, and every later statement would then fail with "current
 * transaction is aborted" instead of the rule being tested.
 */
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

beforeEach(async () => {
  db = await makeHarness("evidence-integration");
});

afterEach(async () => {
  await db?.destroy();
});

describe("vitalis evidence registry against real PostgreSQL", () => {
  it("enables row level security on every evidence table", async () => {
    for (const table of EVIDENCE_TABLES) {
      const enabled = await db.one<boolean>(
        `select relrowsecurity from pg_class where oid = 'public.${table}'::regclass`,
      );
      expect(enabled, `${table} must have row level security`).toBe(true);
    }
  });

  it("publishes explicit privileges rather than relying on defaults", async () => {
    expect(
      await db.one<boolean>(
        "select has_table_privilege('anon', 'public.evidence_sources', 'SELECT')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('anon', 'public.evidence_claims', 'SELECT')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('authenticated', 'public.evidence_sources', 'SELECT')",
      ),
    ).toBe(true);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('authenticated', 'public.evidence_sources', 'INSERT')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('authenticated', 'public.evidence_claims', 'UPDATE')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('service_role', 'public.evidence_claims', 'UPDATE')",
      ),
      // Phase 2.2: editorial writes go through the RPCs, not a server key.
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('service_role', 'public.evidence_revisions', 'UPDATE')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('service_role', 'public.evidence_revisions', 'DELETE')",
      ),
    ).toBe(false);
  });

  it("serves evidence to a signed-in reader and to nobody else", async () => {
    await db.setRole("superuser", "");
    await db.raw(IMPORT_ON);
    await db.raw(sourceInsert("visible-source", "us-public-domain", "approved"));

    await db.raw(IMPORT_OFF);
    await db.setRole("authenticated", "");
    expect(await db.one<number>("select count(*)::int from public.evidence_sources")).toBe(1);

    await db.setRole("anon", "");
    const message = await rejectionMessage("select count(*) from public.evidence_sources");
    expect(message).toMatch(/permission denied/);
  });

  it("does not let a signed-in reader write the evidence base", async () => {
    await db.setRole("authenticated", "");
    const message = await rejectionMessage(
      sourceInsert("sneaky-source", "us-public-domain", "approved"),
    );
    expect(message).toMatch(/permission denied/);
  });

  it("refuses a source whose flags overstate its licence", async () => {
    await db.raw(IMPORT_ON);
    const message = await rejectionMessage(
      sourceInsert("overstated-source", "nin-copyright-restricted", "approved", {
        productUseAllowed: true,
        permissionRequired: false,
      }),
    );
    expect(message).toMatch(/evidence_sources_license_consistent/);
  });

  it("refuses to approve a claim that cites a source we may not ship", async () => {
    await db.setRole("superuser", "");
    await db.raw(IMPORT_ON);
    await db.raw(sourceInsert("restricted-source", "nin-copyright-restricted", "approved"));
    await db.raw(claimInsert("restricted-claim", "draft"));
    await db.raw(linkInsert("restricted-claim", "restricted-source"));

    const message = await rejectionMessage(
      "update public.evidence_claims set review_status = 'approved', reviewed_on = '2026-01-01' where id = 'restricted-claim'",
    );
    expect(message).toMatch(/is not approved for product use/);
    expect(
      await db.one<string>(
        "select review_status from public.evidence_claims where id = 'restricted-claim'",
      ),
    ).toBe("draft");
  });

  it("approves a claim whose source is public domain", async () => {
    await db.setRole("superuser", "");
    await db.raw(IMPORT_ON);
    await db.raw(sourceInsert("open-source", "us-public-domain", "approved"));
    await db.raw(claimInsert("open-claim", "draft"));
    await db.raw(linkInsert("open-claim", "open-source"));
    await db.raw(
      "update public.evidence_claims set review_status = 'approved', reviewed_on = '2026-01-01' where id = 'open-claim'",
    );
    expect(
      await db.one<string>(
        "select review_status from public.evidence_claims where id = 'open-claim'",
      ),
    ).toBe("approved");
  });

  it("refuses to approve a claim with no supporting citation", async () => {
    await db.setRole("superuser", "");
    await db.raw(IMPORT_ON);
    await db.raw(claimInsert("bare-claim", "draft"));
    const message = await rejectionMessage(
      "update public.evidence_claims set review_status = 'approved', reviewed_on = '2026-01-01' where id = 'bare-claim'",
    );
    expect(message).toMatch(/without a supporting citation/);
  });

  it("refuses to attach an unusable source to an already approved claim", async () => {
    await db.setRole("superuser", "");
    await db.raw(IMPORT_ON);
    await db.raw(sourceInsert("open-source", "us-public-domain", "approved"));
    await db.raw(sourceInsert("later-restricted", "fao-noncommercial", "approved"));
    await db.raw(claimInsert("open-claim", "draft"));
    await db.raw(linkInsert("open-claim", "open-source"));
    await db.raw(
      "update public.evidence_claims set review_status = 'approved', reviewed_on = '2026-01-01' where id = 'open-claim'",
    );

    const message = await rejectionMessage(linkInsert("open-claim", "later-restricted", "mixed"));
    expect(message).toMatch(/is not approved for product use/);
  });

  it("keeps the evidence history append-only", async () => {
    await db.setRole("superuser", "");
    await db.raw(IMPORT_ON);
    await db.raw(`insert into public.evidence_revisions
        (entity_type, entity_id, version, changed_on, changed_by, summary)
      values ('claim', 'some-claim', 1, '2026-01-01', 'fixture-reviewer', 'Recorded an approved change.')`);
    await db.raw(IMPORT_OFF);

    const message = await rejectionMessage(
      "update public.evidence_revisions set summary = 'rewritten' where entity_id = 'some-claim'",
    );
    expect(message).toMatch(/append-only/);
    expect(await db.one<number>("select count(*)::int from public.evidence_revisions")).toBe(1);
  });

  it("stores no per-person columns, so erasure need not touch it", async () => {
    const personal = await db.all<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public'
          -- evidence_editors is deliberately excluded: it holds the identifier of
          -- an editor (an authority grant), not personal data about a member.
          and table_name in (
            'evidence_sources', 'evidence_claims', 'evidence_claim_sources',
            'evidence_recommendations', 'evidence_recommendation_claims',
            'evidence_revisions', 'evidence_lifecycle_events'
          )
          and column_name in ('user_id', 'profile_id', 'owner_id')`,
    );
    expect(personal).toEqual([]);
  });
});
