/**
 * Integration suite — revision coverage (A2) and editor erasure (A1).
 *
 * The harness runs each test inside a transaction it rolls back, so the deferred
 * constraint trigger is exercised with `set constraints all immediate`: that is
 * the same check the server performs at COMMIT, requested early.
 *
 * What is asserted here:
 *   - a version above 1 with no evidence_revisions row cannot commit;
 *   - the same bump with its narrative in the same transaction can;
 *   - evidence_update_claim() writes that narrative from the reason it requires;
 *   - evidence_add_revision() refuses a version the entity is not at;
 *   - erasing an account removes its evidence_editors row and keeps the
 *     append-only lifecycle attribution.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeHarness, type TestContext } from "./harness";

let db: TestContext;

const EDITOR = "11111111-1111-4111-8111-111111111111";
const ERASED = "33333333-3333-4333-8333-333333333333";

interface Rejection {
  readonly message: string;
  readonly code: string;
}

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

/** Force the deferred checks the server would run at COMMIT. */
async function checkNow(): Promise<void> {
  await db.raw("set constraints all immediate");
}

async function asOwner(): Promise<void> {
  await db.setRole("superuser", "");
}

async function asEditor(): Promise<void> {
  await db.setRole("authenticated", EDITOR);
}

async function draftClaim(id: string): Promise<void> {
  await asOwner();
  await db.raw(`insert into public.evidence_claims (
      id, statement, topic, grade, confidence, population, uncertainty,
      review_status, version
    ) values (
      '${id}', 'A fixture claim statement for the coverage suite.', 'protein',
      'moderate', 0.5, 'Adults', '["Something remains unknown."]'::jsonb, 'draft', 1
    )`);
}

beforeEach(async () => {
  db = await makeHarness("evidence-revision-coverage", [EDITOR, ERASED]);
  await db.raw(
    `insert into public.evidence_editors (user_id) values ('${EDITOR}')
       on conflict (user_id) do nothing`,
  );
  await asEditor();
});

afterEach(async () => {
  await db?.destroy();
});

describe("evidence revision coverage against real PostgreSQL", () => {
  it("refuses a version bump that carries no narrative", async () => {
    await draftClaim("clm-bare");
    await asOwner();

    const savepoint = "sp_bare_bump";
    await db.raw(`savepoint ${savepoint}`);
    let message = "";
    let code = "";
    try {
      await db.raw(`update public.evidence_claims set version = 2 where id = 'clm-bare'`);
      await checkNow();
    } catch (error) {
      const failed = error as { message: string; code?: string };
      message = failed.message;
      code = failed.code ?? "";
    }
    await db.raw(`rollback to savepoint ${savepoint}`);

    expect(code).toBe("23514");
    expect(message).toMatch(/no evidence_revisions row/);
    expect(
      await db.one<number>(`select version from public.evidence_claims where id = 'clm-bare'`),
      "the refused bump must not survive",
    ).toBe(1);
  });

  it("accepts a bump whose narrative lands in the same transaction", async () => {
    await draftClaim("clm-paired");
    await asOwner();

    await db.raw(`update public.evidence_claims set version = 2 where id = 'clm-paired';
      insert into public.evidence_revisions
        (entity_type, entity_id, version, changed_on, changed_by, summary)
      values ('claim', 'clm-paired', 2, current_date, 'test:coverage',
              'Narrative written alongside the version it describes.')`);

    await checkNow();

    expect(
      await db.one<number>(`select version from public.evidence_claims where id = 'clm-paired'`),
    ).toBe(2);
  });

  it("writes the narrative from the reason when the update RPC bumps a version", async () => {
    await draftClaim("clm-rpc");
    await asEditor();

    const reason = "Correcting the statement after re-reading the cited source.";
    await db.raw(
      `select public.evidence_update_claim(
        'clm-rpc',
        '{"statement": "A revised statement for the coverage suite."}'::jsonb,
        1,
        '${reason}'
      )`,
    );

    // The RPC must leave a state that survives the commit-time check.
    await checkNow();

    const row = await db.one<{ version: number; summary: string }>(
      `select c.version, r.summary
         from public.evidence_claims c
         join public.evidence_revisions r
           on r.entity_type = 'claim' and r.entity_id = c.id and r.version = c.version
        where c.id = 'clm-rpc'`,
    );
    expect(row?.version).toBe(2);
    expect(row?.summary).toContain("Correcting the statement");
  });

  it("refuses a narrative for a version the entity is not at", async () => {
    await draftClaim("clm-ahead");
    await asEditor();

    const refusal = await rejected(
      `select public.evidence_add_revision('claim', 'clm-ahead', 99, 'A narrative for a version that does not exist yet.')`,
    );

    expect(refusal.code).toBe("23514");
    expect(refusal.message).toMatch(/is at version 1, not 99/);
  });

  it("accepts a narrative for the current version", async () => {
    await draftClaim("clm-current");
    await asEditor();

    const id = await db.one<string>(
      `select public.evidence_add_revision(
        'claim', 'clm-current', 1,
        'Narrative for the version the claim is actually at.'
      )::text`,
    );

    expect(Number(id)).toBeGreaterThan(0);
  });
});

describe("evidence editor erasure against real PostgreSQL", () => {
  it("revokes editor membership and keeps the audit attribution", async () => {
    await asOwner();
    await db.raw(`insert into public.evidence_editors (user_id, note)
      values ('${ERASED}', 'Editor who is about to erase their account')`);
    await db.raw(`insert into public.evidence_lifecycle_events
        (entity_type, entity_id, from_status, to_status, version, actor, actor_label, reason)
      values ('claim', 'clm-erased', null, 'draft', 1, '${ERASED}',
              'editor:${ERASED}', 'Recorded before the account was erased.')`);

    expect(await db.one<boolean>(`select public.evidence_is_editor('${ERASED}'::uuid)`)).toBe(true);

    await db.setRole("authenticated", ERASED);
    const removed = await db.one<Record<string, number>>(`select public.erase_my_data()`);
    await asOwner();

    expect(removed?.["evidence_editors"], "erasure must report the membership it removed").toBe(1);
    expect(await db.one<boolean>(`select public.evidence_is_editor('${ERASED}'::uuid)`)).toBe(
      false,
    );
    expect(
      await db.one<number>(
        `select count(*)::int from public.evidence_lifecycle_events where actor = '${ERASED}'`,
      ),
      "append-only history keeps its attribution",
    ).toBe(1);
  });
});
