/**
 * Integration suite — the Phase 2.2 lifecycle, against real PostgreSQL.
 *
 * The static suite checks the SQL that will be applied. This one checks that the
 * server actually behaves that way: the graph, the reason requirement, the
 * version rules, supersession immutability, the retirement guard, citation
 * integrity, the overdue gate, the editorial boundary, and the import path.
 *
 * Same harness as the other Vitalis suites: a real PostgreSQL server, real roles,
 * one rolled-back transaction per test.
 */

import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SEED_FILE } from "../evidence/seed/sql";
import { makeHarness, type TestContext } from "./harness";

let db: TestContext;

const SEED_SQL = readFileSync(new URL(`../../../../${SEED_FILE}`, import.meta.url), "utf8");

const EDITOR = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";
const USABLE = ["us-public-domain", "cc0-1.0", "cc-by-4.0"];

const IMPORT_ON = `set local session authorization evidence_importer;
  set local bloom.evidence_import = 'on';
  set local bloom.evidence_reason = 'integration suite applying the catalogue';`;
const IMPORT_OFF = "reset session authorization;";

interface Rejection {
  readonly message: string;
  readonly code: string;
}

/** Run a statement expected to be refused, without aborting the transaction. */
async function rejected(sql: string): Promise<Rejection> {
  const savepoint = `sp_${Math.random().toString(36).slice(2, 10)}`;
  await db.raw(`savepoint ${savepoint}`);
  let out: Rejection = { message: "", code: "" };
  try {
    await db.raw(sql);
  } catch (error) {
    const failed = error as { message: string; code?: string };
    out = { message: failed.message, code: failed.code ?? "" };
  }
  await db.raw(`rollback to savepoint ${savepoint}`);
  return out;
}

/** Run a statement that must succeed. */
async function ok(sql: string): Promise<void> {
  await db.raw(sql);
}

async function asOwner(): Promise<void> {
  await db.raw(IMPORT_OFF);
  await db.setRole("superuser", "");
}

async function asEditor(subject: string = EDITOR): Promise<void> {
  await db.raw(IMPORT_OFF);
  await db.setRole("authenticated", subject);
}

/**
 * Fixtures are created through the import path, because a new row may not start
 * life already reviewed — that is the rule under test elsewhere.
 */
async function source(
  id: string,
  options: {
    readonly status?: string;
    readonly license?: string;
    readonly reviewedOn?: string;
    readonly interval?: number;
  } = {},
): Promise<void> {
  const license = options.license ?? "cc-by-4.0";
  const usable = USABLE.includes(license);
  await db.raw(`insert into public.evidence_sources (
      id, title, kind, publisher, authors, publication_year, url, license_id,
      license_note, product_use_allowed, permission_required, peer_reviewed,
      retrieved_on, reviewed_on, review_interval_months, review_status
    ) values (
      '${id}', 'Fixture source ${id}', 'guideline', 'Fixture Publisher',
      array['Fixture Author'], 2025, 'https://example.org/${id}', '${license}',
      'Fixture licence terms recorded for the lifecycle suite.',
      ${usable}, ${!usable}, true, '2026-01-01',
      '${options.reviewedOn ?? "2026-01-01"}', ${options.interval ?? 60},
      '${options.status ?? "approved"}'
    )`);
}

async function claim(id: string, sourceId: string | null = "src-one"): Promise<void> {
  await db.raw(`insert into public.evidence_claims (
      id, statement, topic, grade, confidence, population, uncertainty,
      review_status, version
    ) values (
      '${id}', 'A fixture claim statement for the lifecycle suite.', 'protein',
      'moderate', 0.5, 'Adults', '["Something remains unknown."]'::jsonb, 'draft', 1
    )`);
  if (sourceId !== null) {
    await db.raw(`insert into public.evidence_claim_sources
        (claim_id, source_id, direction, locator)
      values ('${id}', '${sourceId}', 'supports', 'p. 1')`);
  }
}

function approve(id: string, reason = "approving the fixture claim for the suite"): string {
  return `select public.evidence_transition_claim(
    '${id}', 'approved', 'in_review', 1, '${reason}', null)`;
}

beforeEach(async () => {
  db = await makeHarness("evidence-lifecycle", [EDITOR, STRANGER]);
  await db.raw(
    `insert into public.evidence_editors (user_id, note) values
      ('${EDITOR}', 'Lifecycle integration suite'),
      ('${STRANGER}', 'Present but not an editor')`,
  );
  await db.raw(`delete from public.evidence_editors where user_id = '${STRANGER}'`);
  await db.raw("select auth.set_subject(" + `'${EDITOR}'::uuid)`);
});

afterEach(async () => {
  await db?.destroy();
});

describe("vitalis evidence lifecycle against real PostgreSQL", () => {
  it("keeps direct writes out of every non-editorial role", async () => {
    expect(
      await db.one<boolean>(
        "select has_table_privilege('service_role', 'public.evidence_claims', 'UPDATE')",
      ),
      "service_role must not write evidence directly",
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('service_role', 'public.evidence_sources', 'INSERT')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('service_role', 'public.evidence_claim_sources', 'DELETE')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('authenticated', 'public.evidence_claims', 'INSERT')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_table_privilege('anon', 'public.evidence_claims', 'SELECT')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select relrowsecurity from pg_class where oid = 'public.evidence_lifecycle_events'::regclass",
      ),
    ).toBe(true);
  });

  it("exposes the editorial RPCs to signed-in callers only", async () => {
    expect(
      await db.one<boolean>(
        "select has_function_privilege('anon', 'public.evidence_transition_claim(text,text,text,integer,text,text)', 'execute')",
      ),
    ).toBe(false);
    expect(
      await db.one<boolean>(
        "select has_function_privilege('authenticated', 'public.evidence_transition_claim(text,text,text,integer,text,text)', 'execute')",
      ),
    ).toBe(true);
    expect(
      await db.one<boolean>(
        "select has_function_privilege('anon', 'public.evidence_review_queue(date)', 'execute')",
      ),
    ).toBe(false);
  });

  it("walks draft to in_review to approved and records each step", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await claim("clm-one");
    await db.raw(IMPORT_OFF);

    await asEditor();
    await ok(
      `select public.evidence_transition_claim('clm-one', 'in_review', 'draft', 1, 'sending the claim for review', null)`,
    );
    await ok(approve("clm-one"));

    expect(
      await db.one<string>("select review_status from public.evidence_claims where id = 'clm-one'"),
    ).toBe("approved");

    const events = await db.all<{ to_status: string; actor_label: string; reason: string }>(
      `select to_status, actor_label, reason from public.evidence_lifecycle_events
        where entity_id = 'clm-one' order by id`,
    );
    expect(events.map((e) => e.to_status)).toEqual(["in_review", "approved"]);
    for (const event of events) {
      expect(event.actor_label).toBe(`editor:${EDITOR}`);
    }
    expect(events[1]?.reason).toContain("approving the fixture claim");
  });

  it("refuses to skip review", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await claim("clm-one");
    await db.raw(IMPORT_OFF);

    await asEditor();
    const attempt = await rejected(
      `select public.evidence_transition_claim('clm-one', 'approved', 'draft', 1, 'skipping review entirely', null)`,
    );
    expect(attempt.code).toBe("23514");
    expect(attempt.message).toMatch(/cannot move evidence_claims clm-one from draft to approved/);
    expect(
      await db.one<string>("select review_status from public.evidence_claims where id = 'clm-one'"),
    ).toBe("draft");
  });

  it("refuses to demote an approved claim back to draft", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await claim("clm-one");
    await db.raw(
      `update public.evidence_claims set review_status = 'approved', reviewed_on = '2026-01-01' where id = 'clm-one'`,
    );
    await db.raw(IMPORT_OFF);

    await asEditor();
    const attempt = await rejected(
      `select public.evidence_transition_claim('clm-one', 'draft', 'approved', 1, 'quietly un-approving the claim', null)`,
    );
    expect(attempt.code).toBe("23514");
    expect(attempt.message).toMatch(/from approved to draft/);
    expect(
      await db.one<string>("select review_status from public.evidence_claims where id = 'clm-one'"),
    ).toBe("approved");
  });

  it("allows re-review but never resurrection", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await claim("clm-one");
    await db.raw(
      `update public.evidence_claims set review_status = 'approved', reviewed_on = '2026-01-01' where id = 'clm-one'`,
    );
    await db.raw(IMPORT_OFF);

    await asEditor();
    // Re-review is always available on an approved row.
    await ok(
      `select public.evidence_transition_claim('clm-one', 'in_review', 'approved', 1, 're-reviewing an expiring claim', null)`,
    );
    await ok(approve("clm-one", "re-approving after the re-review"));

    // Withdrawal is terminal: nothing comes back from it.
    await ok(
      `select public.evidence_transition_claim('clm-one', 'withdrawn', 'approved', 1, 'withdrawing a claim we no longer stand behind', null)`,
    );
    const revived = await rejected(
      `select public.evidence_transition_claim('clm-one', 'approved', 'withdrawn', 1, 'reviving a withdrawn claim', null)`,
    );
    expect(revived.code).toBe("23514");
    expect(revived.message).toMatch(/from withdrawn to approved/);
    expect(
      await db.one<string>("select review_status from public.evidence_claims where id = 'clm-one'"),
    ).toBe("withdrawn");
  });

  it("requires a reason and a fresh read", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await claim("clm-one");
    await db.raw(IMPORT_OFF);

    await asEditor();
    const noReason = await rejected(
      `select public.evidence_transition_claim('clm-one', 'in_review', 'draft', 1, 'short', null)`,
    );
    expect(noReason.code).toBe("22023");
    expect(noReason.message).toMatch(/reason of at least 10 characters/);

    const stale = await rejected(
      `select public.evidence_transition_claim('clm-one', 'in_review', 'draft', 7, 'a reason long enough to pass', null)`,
    );
    expect(stale.code).toBe("40001");
    expect(stale.message).toMatch(/is now draft at version 1/);
  });

  it("refuses editorial work from someone who is not an editor", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await claim("clm-one");
    await db.raw(IMPORT_OFF);

    await asEditor(STRANGER);
    const attempt = await rejected(
      `select public.evidence_transition_claim('clm-one', 'in_review', 'draft', 1, 'a stranger trying to move a claim', null)`,
    );
    expect(attempt.code).toBe("42501");
    expect(attempt.message).toMatch(/not an evidence editor/);
  });

  it("accepts exactly one version per edit and never a jump or a reversal", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await claim("clm-one");
    await db.raw(IMPORT_OFF);
    await asOwner();

    const same = await rejected(
      `update public.evidence_claims set statement = 'A different claim statement.' where id = 'clm-one'`,
    );
    expect(same.code).toBe("23514");
    expect(same.message).toMatch(/requires version 2 \(was 1\)/);

    const skip = await rejected(
      `update public.evidence_claims set version = 3 where id = 'clm-one'`,
    );
    expect(skip.code).toBe("23514");
    expect(skip.message).toMatch(/may only increase by one/);

    const decrease = await rejected(
      `update public.evidence_claims set statement = 'A different claim statement.', version = 0 where id = 'clm-one'`,
    );
    expect(decrease.code).toBe("23514");

    await ok(
      `update public.evidence_claims set statement = 'A different claim statement.', version = 2 where id = 'clm-one'`,
    );
    expect(
      await db.one<number>("select version from public.evidence_claims where id = 'clm-one'"),
    ).toBe(2);
  });

  it("records supersession once and validates the replacement", async () => {
    await db.raw(IMPORT_ON);
    await source("old", { status: "approved" });
    await source("newer", { status: "approved" });
    await source("draft-replacement", { status: "draft" });
    await claim("clm-one", "old");
    await db.raw(
      `update public.evidence_claims set review_status = 'approved', reviewed_on = '2026-01-01' where id = 'clm-one'`,
    );
    await db.raw(IMPORT_OFF);

    await asEditor();
    const toDraft = await rejected(
      `select public.evidence_transition_source('old', 'superseded', 'approved', 1, 'retiring the old edition', 'draft-replacement')`,
    );
    expect(toDraft.message).toMatch(/must be approved and not itself superseded/);

    await ok(
      `select public.evidence_transition_source('old', 'superseded', 'approved', 1, 'retiring the old edition', 'newer')`,
    );
    expect(
      await db.one<string>("select superseded_by from public.evidence_sources where id = 'old'"),
    ).toBe("newer");
    // The citation and the approved claim survive the retirement untouched.
    expect(
      await db.one<number>(
        "select count(*)::int from public.evidence_claim_sources where source_id = 'old'",
      ),
    ).toBe(1);
    expect(
      await db.one<string>("select review_status from public.evidence_claims where id = 'clm-one'"),
    ).toBe("approved");

    await asOwner();
    const clear = await rejected(
      `update public.evidence_sources set superseded_by = null, review_status = 'approved' where id = 'old'`,
    );
    expect(clear.code).toBe("42501");
    expect(clear.message).toMatch(/immutable once recorded/);
  });

  it("refuses a supersession whose replacement is already retired", async () => {
    await db.raw(IMPORT_ON);
    await source("src-a");
    await source("src-b");
    await db.raw(
      `update public.evidence_sources set review_status = 'superseded', superseded_by = 'src-b' where id = 'src-a'`,
    );
    await db.raw(IMPORT_OFF);

    await asEditor();
    const cycle = await rejected(
      `select public.evidence_transition_source('src-b', 'superseded', 'approved', 1, 'creating a supersession loop', 'src-a')`,
    );
    expect(cycle.code).toBe("23514");
    // The replacement check fires first: a retired row cannot be a replacement,
    // which is also why a longer loop is unreachable through the API.
    expect(cycle.message).toMatch(/must be approved and not itself superseded|cycle/);
  });

  it("refuses to strand an approved claim but allows supersession", async () => {
    await db.raw(IMPORT_ON);
    await source("cited");
    await source("replacement");
    await claim("clm-one", "cited");
    await db.raw(
      `update public.evidence_claims set review_status = 'approved', reviewed_on = '2026-01-01' where id = 'clm-one'`,
    );
    await db.raw(IMPORT_OFF);

    await asEditor();
    const withdraw = await rejected(
      `select public.evidence_transition_source('cited', 'withdrawn', 'approved', 1, 'withdrawing a cited source', null)`,
    );
    expect(withdraw.code).toBe("23514");
    expect(withdraw.message).toMatch(/approved claim\(s\) cite it: clm-one/);

    await ok(
      `select public.evidence_transition_source('cited', 'superseded', 'approved', 1, 'replacing the cited source', 'replacement')`,
    );
  });

  it("refuses to leave an approved claim without its last supporting citation", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await claim("clm-one");
    await db.raw(
      `update public.evidence_claims set review_status = 'approved', reviewed_on = '2026-01-01' where id = 'clm-one'`,
    );
    await db.raw(IMPORT_OFF);

    await asEditor();
    const last = await rejected(
      `select public.evidence_detach_citation('clm-one', 'src-one', 'removing the only supporting citation')`,
    );
    expect(last.code).toBe("23514");
    expect(last.message).toMatch(/last supporting citation/);
    expect(
      await db.one<number>(
        "select count(*)::int from public.evidence_claim_sources where claim_id = 'clm-one'",
      ),
    ).toBe(1);
  });

  it("narrates a citation removal in the curated history", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await source("src-two");
    await claim("clm-one", "src-one");
    await db.raw(
      `insert into public.evidence_claim_sources (claim_id, source_id, direction, locator)
        values ('clm-one', 'src-two', 'mixed', 'p. 9')`,
    );
    await db.raw(IMPORT_OFF);

    await asEditor();
    await ok(
      `select public.evidence_detach_citation('clm-one', 'src-two', 'second citation was wrong')`,
    );

    const revision = await db.one<string>(
      `select summary from public.evidence_revisions where entity_id = 'clm-one' order by id desc limit 1`,
    );
    expect(revision).toContain("Removed citation src-two");
    expect(revision).toContain("second citation was wrong");
  });

  it("refuses to approve on a source whose review has expired", async () => {
    await db.raw(IMPORT_ON);
    await source("stale", { reviewedOn: "2019-01-01", interval: 12 });
    await claim("clm-one", "stale");
    await db.raw(IMPORT_OFF);

    await asEditor();
    await ok(
      `select public.evidence_transition_claim('clm-one', 'in_review', 'draft', 1, 'sending the claim for review', null)`,
    );
    const attempt = await rejected(approve("clm-one"));
    expect(attempt.code).toBe("23514");
    expect(attempt.message).toMatch(/is overdue for review/);
  });

  it("offers the overdue queue to editors only", async () => {
    await db.raw(IMPORT_ON);
    await source("stale", { reviewedOn: "2019-01-01", interval: 12 });
    await db.raw(IMPORT_OFF);

    await asEditor(STRANGER);
    const refused = await rejected(
      "select * from public.evidence_review_queue('2026-11-05'::date)",
    );
    expect(refused.code).toBe("42501");

    await asEditor();
    const queued = await db.all<{ entity_type: string; id: string }>(
      "select entity_type, id from public.evidence_review_queue('2026-11-05'::date)",
    );
    expect(queued).toContainEqual({ entity_type: "source", id: "stale" });
  });

  it("keeps the lifecycle log append-only", async () => {
    await db.raw(IMPORT_ON);
    await source("src-one");
    await claim("clm-one");
    await db.raw(IMPORT_OFF);

    await asEditor();
    await ok(
      `select public.evidence_transition_claim('clm-one', 'in_review', 'draft', 1, 'creating the one event to try to rewrite', null)`,
    );

    // Even the owner cannot rewrite what the guard wrote.
    await asOwner();
    const attempt = await rejected(
      "update public.evidence_lifecycle_events set reason = 'rewritten history'",
    );
    expect(attempt.code).toBe("42501");
    expect(attempt.message).toMatch(/append-only/);
    expect(
      await db.one<string>(
        "select reason from public.evidence_lifecycle_events where entity_id = 'clm-one'",
      ),
    ).toBe("creating the one event to try to rewrite");
  });

  it("refuses to create an already-reviewed row outside an import", async () => {
    await asOwner();
    const attempt = await rejected(
      `insert into public.evidence_sources (
        id, title, kind, publisher, authors, publication_year, url, license_id,
        license_note, product_use_allowed, permission_required, retrieved_on,
        reviewed_on, review_interval_months, review_status
      ) values (
        'sneaky', 'Sneaky source', 'guideline', 'Publisher', array['Author'], 2025,
        'https://example.org/sneaky', 'cc-by-4.0',
        'Fixture licence terms recorded for the lifecycle suite.', true, false,
        '2026-01-01', '2026-01-01', 60, 'approved'
      )`,
    );
    expect(attempt.code).toBe("42501");
    expect(attempt.message).toMatch(/must start as draft or in_review/);
  });

  it("applies the catalogue through the labelled import path and attributes it", async () => {
    await db.raw(IMPORT_ON);
    await db.raw(SEED_SQL);
    await db.raw(IMPORT_OFF);

    expect(
      await db.one<number>("select count(*)::int from public.evidence_sources"),
    ).toBeGreaterThan(0);

    const attribution = await db.all<{ actor_label: string; reason: string; n: number }>(
      `select actor_label, reason, count(*)::int n
         from public.evidence_lifecycle_events group by 1, 2`,
    );
    expect(attribution).toHaveLength(1);
    expect(attribution[0]?.actor_label).toBe("seed:import");
    expect(attribution[0]?.reason).toContain("integration suite applying the catalogue");

    const before = await db.one<number>(
      "select count(*)::int from public.evidence_lifecycle_events",
    );
    await db.raw(IMPORT_ON);
    await db.raw(SEED_SQL);
    await db.raw(IMPORT_OFF);
    expect(await db.one<number>("select count(*)::int from public.evidence_lifecycle_events")).toBe(
      before,
    );
  });

  it("refuses the catalogue without the import identity", async () => {
    await asOwner();
    const attempt = await rejected(SEED_SQL);
    expect(attempt.code).toBe("42501");
    expect(attempt.message).toMatch(/must start as draft or in_review/);
    expect(await db.one<number>("select count(*)::int from public.evidence_sources")).toBe(0);
  });
});
