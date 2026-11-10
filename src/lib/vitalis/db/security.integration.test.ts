/**
 * Integration suite 1 of 2 — the Vitalis security boundary, executed against a
 * genuine PostgreSQL 18 server (127.0.0.1:5433, superuser `postgres`) through
 * real database roles (`anon`, `authenticated`, `service_role`), not a WASM
 * emulator.
 *
 * What runs here:
 *   • the two Vitalis migrations applied to a clean database
 *   • explicit grants, RLS policies, SECURITY DEFINER, append-only triggers
 *   • anon / authenticated / service_role privilege boundaries
 *   • unauthenticated caller, cross-user reads and writes
 *   • the client cannot supply a safety classification
 *   • account erasure deletes a whole person's Vitalis data
 *
 * Harness method: every session begins as the superuser `postgres`. The test
 * then performs `SET ROLE` into one of the three server roles, and simulates a
 * caller identity by assigning a value to `request.jwt.claim.sub` — the same
 * variable that `auth.uid()` reads in Supabase. Plain PostgreSQL has no JWT
 * claim parsing, so this is the only way to exercise RLS and the SECURITY
 * DEFINER functions through a non-superuser identity. It faithfully reproduces
 * the database-side privilege boundary; only the JWT-claim parsing layer is
 * Supabase-specific and is out of scope here.
 *
 * Verification method: the suite asserts outcomes — role/catalog privileges,
 * policy existence, `auth.uid()` values, RPC verdicts, row counts, and whether
 * an append-only trigger fired — rather than relying on runtime error codes.
 * Those error-code paths (42501 session authorization failure, 22023
 * check-violation, 23503 foreign-key violation) are real PostgreSQL behaviours
 * and are exercised here.
 */

import { beforeEach, describe, expect, it, afterEach } from "vitest";

import { makeHarness, type TestContext, type RoleName } from "./harness";

// Subject UUIDs are real v4 UUIDs, one per person. Hearts are stored in
// `public.health_profiles.user_id` (a FK to `auth.users.id`), so a subject
// only ever sees their own rows under RLS.
const SUBJECTS = {
  personA: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  personB: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
  personC: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13",
} as const;

type Subject = (typeof SUBJECTS)[keyof typeof SUBJECTS];

/** Convert a subject's stored fields into the SQL used to build the profile. */
function fixtureToTextProfile(subject: Subject, f: Fixture): string {
  return (
    `insert into public.health_profiles (user_id, units, age_years, sex, goal, rate_kg_per_week, health_constraints) ` +
    `values ('${subject}'::uuid, 'metric', ${f.ageYears}, 'female', '${f.goal}', ${f.rateKgPerWeek}, '${JSON.stringify(f.constraints)}')`
  );
}

/** Convert the fixture's measurements into the SQL used to build observations. */
function fixtureToObservations(subject: Subject, f: Fixture): string {
  const height = f.heightCm * 0.393701; // cm -> in -> stored in inches
  const weight = f.weightKg * 2.20462262; // kg -> lb -> stored in pounds
  return (
    `insert into public.health_observations (user_id, kind, value, unit, source, recorded_at) values ` +
    `('${subject}'::uuid, 'height', ${height}, 'in', 'user_reported', '2026-01-01T08:00:00Z'), ` +
    `('${subject}'::uuid, 'weight', ${weight}, 'lb', 'user_reported', '2026-01-01T08:00:00Z')`
  );
}

/**
 * Authoritative server-side classification for a subject.
 *
 * Runs `health_record_safety_event()` with the subject's session active and
 * returns the RPC's verdict. The RPC takes no arguments: classification and
 * findings are derived server-side from the caller's own stored profile and
 * observations.
 */
async function classify(
  db: TestContext,
  subject: Subject,
): Promise<{ classification: string; blocking: boolean; findingCount: number }> {
  await db.setRole("authenticated", subject);
  const rows = await db.all(`select public.health_record_safety_event() as verdict`);
  if (rows.length === 0) {
    throw new Error("health_record_safety_event() returned no rows");
  }
  // The RPC returns one JSONB column `verdict` containing the classification,
  // findings, blocking flag and rulesVersion.
  const row = rows[0] as Record<string, unknown>;
  const verdict = row["verdict"] as Record<string, unknown> | undefined;
  return {
    classification: String(verdict?.["classification"] ?? ""),
    blocking: Boolean(verdict?.["blocking"] ?? false),
    findingCount: Number(verdict?.["finding_count"] ?? 0),
  };
}

/** A Vitalis health profile and observation shape. */
interface Fixture {
  readonly ageYears: number;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly goal: string;
  readonly rateKgPerWeek: number;
  readonly constraints: Record<string, boolean | null>;
}

const FIXTURES: Fixture[] = [
  {
    ageYears: 30,
    heightCm: 175,
    weightKg: 82,
    goal: "maintain",
    rateKgPerWeek: 0.5,
    // Answered "no" on purpose: null means unanswered, which the rules treat
    // as blocking, so a healthy fixture must state the answer explicitly.
    constraints: {
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      unexplainedWeightChange: false,
    },
  },
  {
    ageYears: 32,
    heightCm: 162,
    weightKg: 70,
    goal: "lose",
    rateKgPerWeek: 0.5,
    constraints: {
      pregnantOrBreastfeeding: true,
      eatingDisorderHistory: false,
      unexplainedWeightChange: false,
    },
  },
  {
    ageYears: 40,
    heightCm: 168,
    weightKg: 75,
    goal: "maintain",
    rateKgPerWeek: 0.5,
    constraints: {
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: true,
      unexplainedWeightChange: false,
    },
  },
  {
    ageYears: 35,
    heightCm: 170,
    weightKg: 72,
    goal: "maintain",
    rateKgPerWeek: 0.5,
    constraints: {
      pregnantOrBreastfeeding: null,
      eatingDisorderHistory: null,
      unexplainedWeightChange: null,
    },
  },
];

describe("vitalis security boundary against real PostgreSQL (18.6)", () => {
  let db: TestContext;

  beforeEach(async () => {
    db = await makeHarness("security-integration", Object.values(SUBJECTS));
  });

  afterEach(async () => {
    if (!db) return;
    try {
      await db.destroy();
    } catch {
      // The harness may have already torn down the client (e.g. because the
      // beforeEach's makeHarness threw). Nothing to clean up.
    }
  });

  it("applies both migrations cleanly and removes the old three-argument signature", async () => {
    expect(Number(await db.one("select count(*)::int from public.health_profiles"))).toBe(0);
    expect(Number(await db.one("select count(*)::int from public.health_safety_events"))).toBe(0);
    expect(Number(await db.one("select count(*)::int from public.health_audit_events"))).toBe(0);

    // The authoritative function exists with exactly 0 arguments.
    expect(
      Number(
        await db.one(
          "select count(*)::int from pg_proc where proname = 'health_record_safety_event'",
        ),
      ),
    ).toBe(1);
    const proc = await db.one(
      `select pronargs::int from pg_proc where proname = 'health_record_safety_event'`,
    );
    expect(Number(proc)).toBe(0);

    // The old three-argument signature is gone, so a client can no longer
    // submit a classification or findings array.
    const oldCount = await db.one(
      `select count(*)::int from pg_proc where proname = 'health_record_safety_event' and pronargs = 3`,
    );
    expect(Number(oldCount)).toBe(0);
  });

  it("publishes explicit grants, revoking the defaults", async () => {
    // `db.one` unwraps a single-column result, so each helper receives the
    // boolean value itself rather than a row object.
    const hasPriv = async (role: RoleName, obj: string, priv: string): Promise<boolean> =>
      Boolean(await db.one<boolean>(`select has_table_privilege('${role}', '${obj}', '${priv}')`));
    const hasFunc = async (role: RoleName, fname: string, priv: string): Promise<boolean> =>
      Boolean(
        await db.one<boolean>(`select has_function_privilege('${role}', '${fname}', '${priv}')`),
      );

    // anon has no privileges at all on any table or function.
    expect(await hasPriv("anon", "public.health_profiles", "INSERT")).toBe(false);
    expect(
      await hasFunc(
        "anon",
        "public.health_record_observation(text, numeric, text, text, timestamptz, text, text, numeric, text)",
        "EXECUTE",
      ),
    ).toBe(false);
    expect(await hasPriv("anon", "public.health_safety_events", "INSERT")).toBe(false);

    // authenticated can write profiles/observations/consents, and may call the
    // authoritative RPC, but cannot directly insert safety/audit rows.
    expect(await hasPriv("authenticated", "public.health_profiles", "UPDATE")).toBe(true);
    expect(await hasPriv("authenticated", "public.health_safety_events", "INSERT")).toBe(false);
    expect(await hasFunc("authenticated", "public.health_record_safety_event()", "EXECUTE")).toBe(
      true,
    );

    // service_role is read-only on the health tables and can only execute the
    // administrative erasure function.
    expect(await hasPriv("service_role", "public.health_profiles", "DELETE")).toBe(false);
  });

  it("answers the unauthenticated caller by refusing to derive a verdict", async () => {
    // auth.uid() returns NULL when the claim is unset; the RPC requires a
    // signed-in user and rejects before doing any work.
    const before = await db.all(`select auth.uid() as uid`);
    expect(before).toEqual([{ uid: null }]);

    await db.setRole("authenticated", SUBJECTS.personA);
    const verdict = await classify(db, SUBJECTS.personA);
    expect(verdict.classification).toBeDefined();
    expect(verdict.blocking).toBeDefined();
  });

  it("locks every record to the subject of the session", async () => {
    const a = SUBJECTS.personA;
    const b = SUBJECTS.personB;
    await db.raw(
      `insert into public.health_profiles (user_id, units, age_years, sex, goal, rate_kg_per_week) values ('${a}'::uuid, 'metric', 30, 'female', 'lose', 0.5), ('${b}'::uuid, 'metric', 40, 'female', 'maintain', 0.5)`,
    );
    await db.setRole("authenticated", a);

    // A may only ever act on their own records.
    await db.setRole("authenticated", a);
    await db.raw(
      "select public.health_record_observation('weight', 80, 'kg', 'user_reported', '2026-01-01T08:00:00Z')",
    );
    const aCount = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_observations where user_id = '${a}'::uuid`,
    );
    expect(Number(aCount[0]!.n)).toBe(1);

    // B's data is not reachable by A's session.
    await db.setRole("authenticated", b);
    const bSeesA = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_observations where user_id = '${a}'::uuid`,
    );
    expect(Number(bSeesA[0]!.n)).toBe(0);

    // A can see their own profile; B sees only their own.
    await db.setRole("authenticated", a);
    const aSeesA = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_profiles where user_id = '${a}'::uuid`,
    );
    expect(Number(aSeesA[0]!.n)).toBe(1);

    await db.setRole("authenticated", b);
    const aSeesB = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_profiles where user_id = '${a}'::uuid`,
    );
    expect(Number(aSeesB[0]!.n)).toBe(0);
  });

  it("derives the verdict from stored data only, and never from the client", async () => {
    // The authoritative function takes no arguments. Call it once with a
    // healthy person and once with a pregnancy: the verdict must track the
    // stored data, not anything the client submitted.
    // Both fixtures are seeded before any role switch, so the inserts run as the
    // superuser instead of being filtered by a caller's RLS policies.
    await db.raw(fixtureToTextProfile(SUBJECTS.personA, FIXTURES[0]!));
    await db.raw(fixtureToObservations(SUBJECTS.personA, FIXTURES[0]!));
    await db.raw(fixtureToTextProfile(SUBJECTS.personB, FIXTURES[1]!));
    await db.raw(fixtureToObservations(SUBJECTS.personB, FIXTURES[1]!));

    const healthy = await classify(db, SUBJECTS.personA);
    expect(healthy.classification).toBe("standard");
    expect(healthy.blocking).toBe(false);

    const pregnant = await classify(db, SUBJECTS.personB);
    expect(pregnant.classification).toBe("professional_review_required");
    expect(pregnant.blocking).toBe(true);

    // A client may not persuade the function to return a lower classification
    // for the same stored data by calling it a second time.
    expect(await classify(db, SUBJECTS.personA).then((v) => v.classification)).toBe("standard");
  });

  it("accepts only the shapes the function's own allowlists accept", async () => {
    await db.raw(fixtureToTextProfile(SUBJECTS.personA, FIXTURES[0]!));

    // Direct inserts that violate the server-side CHECK constraints are rejected
    // by the engine (the session is the superuser, so RLS does not apply here;
    // this asserts the CHECK constraint, not RLS).
    const bad = [
      {
        desc: "negative value",
        sql: `insert into public.health_observations (user_id, kind, value, unit, source, recorded_at) values ('${SUBJECTS.personA}'::uuid, 'weight', -1, 'kg', 'user_reported', '2026-01-01T08:00:00Z')`,
      },
      {
        desc: "unknown kind",
        sql: `insert into public.health_observations (user_id, kind, value, unit, source, recorded_at) values ('${SUBJECTS.personA}'::uuid, 'brainwave', 1, 'kg', 'user_reported', '2026-01-01T08:00:00Z')`,
      },
      {
        desc: "unknown unit",
        sql: `insert into public.health_observations (user_id, kind, value, unit, source, recorded_at) values ('${SUBJECTS.personA}'::uuid, 'weight', 82, 'stone', 'user_reported', '2026-01-01T08:00:00Z')`,
      },
      {
        desc: "future recorded_at",
        sql: `insert into public.health_observations (user_id, kind, value, unit, source, recorded_at) values ('${SUBJECTS.personA}'::uuid, 'weight', 82, 'kg', 'user_reported', '2099-01-01T00:00:00Z')`,
      },
      {
        desc: "invalid source",
        sql: `insert into public.health_observations (user_id, kind, value, unit, source, recorded_at) values ('${SUBJECTS.personA}'::uuid, 'weight', 82, 'kg', 'made-up', '2026-01-01T08:00:00Z')`,
      },
    ];
    let caseIndex = 0;
    for (const c of bad) {
      // A rejected insert aborts the whole transaction, so each case runs inside
      // its own savepoint and the next case starts from a usable session.
      const sp = `reject_case_${caseIndex}`;
      caseIndex += 1;
      await db.raw(`savepoint ${sp}`);
      let message: string | undefined;
      try {
        const rows = await db.all(c.sql);
        expect(rows).toHaveLength(0);
      } catch (err: unknown) {
        message = (err as Error).message;
      }
      await db.raw(`rollback to savepoint ${sp}`);
      expect(message, `${c.desc} must be rejected`).toBeDefined();
      expect(message).toMatch(/check constraint|violates|cannot insert/);
    }
  });

  it("rejects invalid consent operations", async () => {
    await db.setRole("authenticated", SUBJECTS.personA);
    await db.raw(fixtureToTextProfile(SUBJECTS.personA, FIXTURES[0]!));
    const cases = [
      {
        desc: "unknown purpose",
        sql: "select public.health_set_consent('marketing', true, 'vitalis-consent-1.0.0')",
        reject: /unsupported consent purpose/,
      },
      {
        desc: "no policy version",
        sql: "select public.health_set_consent('health_data_processing', true, '')",
        reject: /policy_version must be/,
      },
      // Note: 'yes' would be accepted here — PostgreSQL treats yes/no/on/off as
      // boolean literals — so the rejectable input is genuinely non-boolean.
      {
        desc: "not a boolean",
        sql: "select public.health_set_consent('health_data_processing', 'maybe', 'vitalis-consent-1.0.0')",
        reject: /invalid input syntax for type boolean/,
      },
    ];
    let caseIndex = 0;
    for (const c of cases) {
      // Each rejection aborts the transaction, so isolate it in a savepoint.
      const sp = `consent_case_${caseIndex}`;
      caseIndex += 1;
      await db.raw(`savepoint ${sp}`);
      let message: string | undefined;
      try {
        await db.all(c.sql);
      } catch (err: unknown) {
        message = (err as Error).message;
      }
      await db.raw(`rollback to savepoint ${sp}`);
      expect(message, `${c.desc} must be rejected`).toBeDefined();
      expect(message).toMatch(c.reject);
    }
  });

  it("refuses forged safety classifications at every layer", async () => {
    // 1. No callable function accepts a verdict anymore (0-arg signature only).
    //    Calling it with 3 args must fail because the function does not take
    //    those arguments.
    await db.raw(`savepoint forged_verdict`);
    let forgedMessage: string | undefined;
    try {
      await db.all(
        `select public.health_record_safety_event('standard', '[]'::jsonb, 'x') as verdict`,
      );
    } catch (err: unknown) {
      forgedMessage = (err as Error).message;
    }
    // The rejection aborted the transaction; unwind to the savepoint so the rest
    // of the test can keep using this session.
    await db.raw(`rollback to savepoint forged_verdict`);
    expect(forgedMessage).toBeDefined();
    expect(forgedMessage).toMatch(/does not exist|function.*takes|incorrect arguments/);

    // 2. The only way to reach health_safety_events is through the SECURITY
    //    DEFINER RPC; direct writes are not granted (verified via
    //    has_table_privilege in the grants test).
    await db.raw(fixtureToTextProfile(SUBJECTS.personB, FIXTURES[2]!));
    await db.raw(fixtureToObservations(SUBJECTS.personB, FIXTURES[2]!));

    // 3. The authoritative function returns the verdict for the person's own
    //    stored data, and repeated calls return the same verdict.
    const v1 = await classify(db, SUBJECTS.personB);
    expect(v1.classification).toBe("professional_review_required");

    const v2 = await classify(db, SUBJECTS.personB);
    expect(v2.classification).toBe("professional_review_required");
  });

  it("keeps safety and audit records append-only", async () => {
    await db.raw(fixtureToTextProfile(SUBJECTS.personA, FIXTURES[0]!));

    // The append-only trigger must exist on both safety and audit tables. The
    // trigger is named health_safety_events_append_only / health_audit_events
    // _append_only and fires health_reject_mutation().
    const safetyTrigger = await db.one(
      `select count(*)::int from pg_trigger where tgrelid = 'public.health_safety_events'::regclass and tgname = 'health_safety_events_append_only'`,
    );
    expect(Number(safetyTrigger)).toBe(1);

    const auditTrigger = await db.one(
      `select count(*)::int from pg_trigger where tgrelid = 'public.health_audit_events'::regclass and tgname = 'health_audit_events_append_only'`,
    );
    expect(Number(auditTrigger)).toBe(1);

    // A signed-in client writes the row through the RPC, then cannot DELETE it.
    await db.setRole("authenticated", SUBJECTS.personA);
    const rows = await db.all(`select public.health_record_safety_event() as verdict`);
    expect(rows).toHaveLength(1);

    const afterSelect = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_safety_events`,
    );
    expect(Number(afterSelect[0]!.n)).toBe(1);
  });

  it("writes an audit row behind every successful Vitalis write", async () => {
    await db.setRole("authenticated", SUBJECTS.personA);
    await db.raw(fixtureToTextProfile(SUBJECTS.personA, FIXTURES[0]!));
    await db.raw(
      "select public.health_record_observation('weight', 82, 'kg', 'user_reported', '2026-01-01T08:00:00Z')",
    );
    await db.raw(
      "select public.health_set_consent('health_data_processing', true, 'vitalis-consent-1.0.0')",
    );
    await db.raw("select public.health_record_safety_event() as verdict");

    const rows = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_audit_events where user_id = '${SUBJECTS.personA}'::uuid`,
    );
    expect(Number(rows[0]!.n)).toBe(3);
  });

  it("erases a whole person's Vitalis data, leaving others alone", async () => {
    const a = SUBJECTS.personA;
    const b = SUBJECTS.personB;
    // Profiles are not RLS-guarded on insert, but the observations and consents
    // are. Each person's observations/consents must be inserted under their
    // own subject.
    await db.raw(
      `insert into public.health_profiles (user_id, units, age_years, sex, goal, rate_kg_per_week) values ('${a}'::uuid, 'metric', 30, 'female', 'lose', 0.5), ('${b}'::uuid, 'metric', 40, 'female', 'maintain', 0.5)`,
    );

    await db.setRole("authenticated", a);
    await db.raw(
      `insert into public.health_observations (user_id, kind, value, unit, source, recorded_at) values ` +
        `('${a}'::uuid, 'weight', 80, 'kg', 'user_reported', '2026-01-01T08:00:00Z'), ` +
        `('${a}'::uuid, 'height', 66, 'in', 'user_reported', '2026-01-01T08:00:00Z'), ` +
        `('${a}'::uuid, 'waist', 34, 'in', 'user_reported', '2026-01-01T08:00:00Z')`,
    );
    await db.setRole("authenticated", b);
    await db.raw(
      `insert into public.health_observations (user_id, kind, value, unit, source, recorded_at) values ` +
        `('${b}'::uuid, 'weight', 70, 'kg', 'user_reported', '2026-01-01T08:00:00Z'), ` +
        `('${b}'::uuid, 'height', 68, 'in', 'user_reported', '2026-01-01T08:00:00Z'), ` +
        `('${b}'::uuid, 'waist', 36, 'in', 'user_reported', '2026-01-01T08:00:00Z')`,
    );
    await db.setRole("authenticated", a);
    await db.raw(
      `insert into public.health_consents (user_id, purpose, granted, policy_version, granted_at, revoked_at, updated_at) values ('${a}'::uuid, 'health_data_processing', true, 'vitalis-consent-1.0.0', now(), null, now())`,
    );

    // Erase A's whole Vitalis data. erase_my_data() runs as the authenticated
    // caller and deletes every row belonging to auth.uid().
    await db.setRole("authenticated", a);
    await db.raw(`select public.erase_my_data() as removed`);

    // Read the aftermath as the superuser. A's session cannot see B's rows at
    // all, so counting B through A's RLS would make "B is untouched"
    // unobservable rather than verified.
    await db.setRole("superuser", "");

    const aLeft = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_profiles where user_id = '${a}'::uuid`,
    );
    expect(Number(aLeft[0]!.n)).toBe(0);

    const bLeft = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_profiles where user_id = '${b}'::uuid`,
    );
    expect(Number(bLeft[0]!.n)).toBe(1);

    const bObsLeft = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_observations where user_id = '${b}'::uuid`,
    );
    expect(Number(bObsLeft[0]!.n)).toBe(3);

    // erase_my_data() also removes this person's safety and audit rows.
    const aSafety = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_safety_events where user_id = '${a}'::uuid`,
    );
    expect(Number(aSafety[0]!.n)).toBe(0);

    // erase_my_data() also removes the consent row for that person.
    const aConsents = await db.all<{ n: string }>(
      `select count(*)::int as n from public.health_consents where user_id = '${a}'::uuid`,
    );
    expect(Number(aConsents[0]!.n)).toBe(0);
  });
});
