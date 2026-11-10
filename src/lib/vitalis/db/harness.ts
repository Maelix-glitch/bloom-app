/**
 * Real-PostgreSQL integration harness for the Vitalis security boundary.
 *
 * Instead of the PGlite WASM emulator (which runs sessions as the superuser
 * `postgres`, cannot `SET ROLE`, and does not throw on runtime errors such as
 * `RAISE EXCEPTION`), this harness connects to a genuine PostgreSQL 18 server
 * via TCP (`127.0.0.1:5433`) and authenticates as three real database roles:
 *
 *   - `anon`          reads as an anonymous caller
 *   - `authenticated` reads as a signed-in user
 *   - `service_role`  reads with admin privileges
 *
 * The suite runs in its own database (`vitalis_test` by default), created on
 * first use through the maintenance database, so a test run can never touch an
 * object in `postgres`.
 *
 * The test setup:
 *   1. Seeds the Supabase base schema (auth.users, storage.objects,
 *      the `auth` schema, and the three roles).
 *   2. Applies `20261104_vitalis_health_foundation.sql` (tables, RLS,
 *      the three Phase-1 RPCs, extended erase_my_data()).
 *   3. Applies `20261105_vitalis_authoritative_safety.sql` (drops the
 *      three-argument safety RPC, adds the argless SECURITY DEFINER
 *      health_record_safety_event(), append-only triggers, explicit grants).
 *
 * The harness is deliberately a thin wrapper over `node-postgres`. Every test
 * session begins as the superuser `postgres`; the test switches into the
 * target role with `SET ROLE`, and then simulates a caller identity by writing
 * the subject through `auth.set_subject()`, which is what `auth.uid()` reads.
 * Supabase derives that value from the request JWT; plain PostgreSQL has no JWT
 * claim parsing, so a small `auth.uid()` / `auth.set_subject()` shim stands in
 * for it. Both shims are SECURITY DEFINER, exactly like the caller-facing
 * behaviour in Supabase — reading the caller identity must not require table
 * privileges — so the harness grants no privilege on `auth.context` to the
 * application roles.
 *
 * Verification method: the suite asserts outcomes — role/catalog privileges,
 * policy existence, `auth.uid()` values, RPC verdicts, row counts, and whether
 * an append-only trigger fired — rather than relying on runtime error codes.
 * Those error-code paths (42501 session authorization failure, 22023
 * check-violation, 23503 FK violation) are real PostgreSQL behaviours and are
 * therefore exercised here; only the `SET ROLE` + `auth.uid()` emulation is
 * harness scaffolding rather than a Supabase-specific behaviour.
 */

import { readFileSync } from "node:fs";
import { Client } from "pg";

export type RoleName = "anon" | "authenticated" | "service_role" | "superuser";

export interface DbClient {
  label: string;
  /** Execute an arbitrary SQL statement. */
  raw(sql: string): Promise<void>;
  /** Run a query and return all rows as plain objects. */
  all<T extends { readonly [column: string]: unknown }>(sql: string): Promise<T[]>;
  /** Run a statement and return the first column of the first row, else undefined. */
  one<T>(sql: string): Promise<T | undefined>;
  /** Run a statement that returns no rows. */
  none(sql: string): Promise<void>;
}

export interface TestContext extends DbClient {
  /** The role the session is currently operating as. */
  role: RoleName;
  /** The authenticated subject used for `auth.uid()` lookups. */
  subject: string;
  /** Switch the session's role and caller identity. */
  setRole(role: RoleName, subject: string): Promise<void>;
  /** Roll the test transaction back and close the connection. */
  destroy(): Promise<void>;
}

interface ProcessEnv {
  VITEST_POSTGRES_HOST?: string;
  VITEST_POSTGRES_PORT?: string;
  VITEST_POSTGRES_DATABASE?: string;
  VITEST_POSTGRES_USER?: string;
  VITEST_POSTGRES_PASSWORD?: string;
  VITEST_POSTGRES_MAINTENANCE_DATABASE?: string;
}
const env = process.env as ProcessEnv;

export const PG_HOST = env.VITEST_POSTGRES_HOST || "127.0.0.1";
export const PG_PORT = Number(env.VITEST_POSTGRES_PORT || "5433");
export const PG_DATABASE = env.VITEST_POSTGRES_DATABASE || "vitalis_test";
/** Where `create database` is issued from — never where the tests run. */
export const PG_MAINTENANCE_DATABASE = env.VITEST_POSTGRES_MAINTENANCE_DATABASE || "postgres";
export const PG_USER = env.VITEST_POSTGRES_USER || "postgres";

export const MIGRATION_FILES = [
  "20261104_vitalis_health_foundation.sql",
  "20261105_vitalis_authoritative_safety.sql",
  "20261106_vitalis_evidence_foundation.sql",
  "20261110_vitalis_evidence_lifecycle.sql",
  "20261111_vitalis_erase_evidence_editors.sql",
  "20261112_vitalis_evidence_revision_coverage.sql",
] as const;

export function migrationSql(file: (typeof MIGRATION_FILES)[number]): string {
  const path = new URL(`../../../../supabase/migrations/${file}`, import.meta.url);
  return readFileSync(path, "utf8");
}

/**
 * The suite owns its database instead of running inside `postgres`.
 *
 * Every test still rolls back, but ownership means a crashed run, a statement
 * that commits on its own, or a stray object can never land in the maintenance
 * database. Creating a database is a cluster-level, non-transactional
 * operation, so it happens once per process and is memoized: the tests must not
 * race to create the same database.
 */
let databaseReady: Promise<void> | undefined;

export function ensureTestDatabase(): Promise<void> {
  databaseReady ??= createDatabaseIfMissing().catch((err: unknown) => {
    // Let a later test retry rather than memoizing a permanent failure.
    databaseReady = undefined;
    throw err;
  });
  return databaseReady;
}

async function createDatabaseIfMissing(): Promise<void> {
  // Explicitly pointed at the maintenance database: nothing to create.
  if (PG_DATABASE === PG_MAINTENANCE_DATABASE) return;
  // `create database` takes an identifier, not a bind parameter, so the name is
  // validated rather than interpolated freely.
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(PG_DATABASE)) {
    throw new Error(`VITEST_POSTGRES_DATABASE is not a safe database name: ${PG_DATABASE}`);
  }
  const admin = new Client({
    host: PG_HOST,
    port: PG_PORT,
    database: PG_MAINTENANCE_DATABASE,
    user: PG_USER,
    password: env.VITEST_POSTGRES_PASSWORD || "",
  });
  try {
    await admin.connect();
    const existing = await admin.query("select 1 from pg_database where datname = $1", [
      PG_DATABASE,
    ]);
    if (existing.rowCount === 1) return;
    await admin.query(`create database "${PG_DATABASE}"`);
  } finally {
    try {
      await admin.end();
    } catch {
      // Connection already gone.
    }
  }
}

/**
 * Supabase's base schema plus the three server roles it provides to clients.
 * Runs inside the harness transaction, so everything it creates is rolled back
 * with the test.
 *
 * `auth.users` is the FK target for every Vitalis health table, so the subject
 * rows must exist before the migrations run.
 *
 * Role creation is guarded: roles are cluster-wide objects, so a role left
 * behind by an interrupted run must not make the next run fail. Creating them
 * inside this transaction still rolls them back on teardown.
 */
export async function seedBaseDb(db: Client, subjects: readonly string[] = []): Promise<void> {
  // 1. Auth scheme: auth.users (the FK target for the Vitalis tables) plus the
  //    `auth.uid()` / `auth.set_subject()` caller-identity shim.
  await db.query(`create schema if not exists auth`);
  await db.query(
    `create table if not exists auth.context (
      id text primary key default 'subject',
      sub uuid
    )`,
  );
  await db.query(
    `create table if not exists auth.users (
      id uuid primary key,
      email text not null,
      encrypted_password text,
      created_at timestamptz not null default now()
    )`,
  );

  // SECURITY DEFINER mirrors Supabase: resolving the caller identity never
  // requires the caller to hold privileges on the claim store.
  await db.query(
    `create or replace function auth.uid() returns uuid
    language sql stable security definer
    set search_path = auth, pg_temp
    as $$
      select sub from context where id = 'subject';
    $$;`,
  );

  await db.query(
    `create or replace function auth.set_subject(p_sub uuid) returns void
    language plpgsql security definer
    set search_path = auth, pg_temp
    as $$
    begin
      -- A null subject means "no caller": remove the claim row, so auth.uid()
      -- returns null however the column was declared.
      if p_sub is null then
        delete from context where id = 'subject';
      else
        insert into context (id, sub) values ('subject', p_sub)
        on conflict (id) do update set sub = excluded.sub;
      end if;
    end;
    $$;`,
  );

  if (subjects.length > 0) {
    for (const id of subjects) {
      await db.query(
        `insert into auth.users (id, email, encrypted_password)
        values ('${id}'::uuid, 'user@example.com', 'x')
        on conflict (id) do nothing`,
      );
    }
  }

  // 2. Storage extension shim: plain PostgreSQL does not ship the `storage`
  //    extension that Supabase provides, but `erase_my_data()` references
  //    `storage.foldername(name)` for the Bloom attachment path.
  await db.query(`create schema if not exists storage`);
  await db.query(
    `create or replace function storage.foldername(p_full_path text)
    returns text
    language sql stable
    as $$
      select nullif(split_part(p_full_path, '/', 2), '')
    $$;`,
  );

  // 3. Server roles. Guarded because roles are cluster-wide, and created in
  //    this transaction so they disappear when the test rolls back.
  await db.query(
    `do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin;
      end if;
    end
    $$;`,
  );

  for (const role of ["anon", "authenticated", "service_role"] as const) {
    await db.query(`grant usage on schema public to ${role}`);
    await db.query(`grant usage on schema auth to ${role}`);
  }
}

/** Build a fresh engine, seed the base Supabase environment, apply both migrations. */
export async function makeHarness(
  label: string,
  subjects: readonly string[] = [],
): Promise<TestContext> {
  const client = new Client({
    host: PG_HOST,
    port: PG_PORT,
    database: PG_DATABASE,
    user: PG_USER,
    // The test server runs as the superuser; we never assert on this role.
    // Identity is switched per assertion via `SET ROLE`.
    password: env.VITEST_POSTGRES_PASSWORD || "",
  });

  // The database must exist before this client can connect to it.
  await ensureTestDatabase();

  await client.connect();

  // One transaction per test: the schema, the migrations and every fixture are
  // rolled back on teardown, so each test starts from an empty database.
  try {
    await client.query("begin");
    await seedBaseDb(client, subjects);
    for (const file of MIGRATION_FILES) {
      await client.query(migrationSql(file));
    }
  } catch (err) {
    // Setup failed: unwind the transaction and close the connection so a
    // failing beforeEach cannot leak a session or a half-built schema.
    try {
      await client.query("rollback");
    } catch {
      // Already aborted; nothing left to roll back.
    }
    try {
      await client.end();
    } catch {
      // Connection already gone.
    }
    throw err;
  }

  const ctx: TestContext = {
    label: `${label}-${PG_DATABASE}@pg${PG_PORT}`,
    role: "superuser",
    subject: "",
    async raw(sql: string): Promise<void> {
      await client.query(sql);
    },
    async all<T extends { readonly [column: string]: unknown }>(sql: string): Promise<T[]> {
      const res = await client.query(sql);
      return res.rows as T[];
    },
    async one<T>(sql: string): Promise<T | undefined> {
      const res = await client.query(sql);
      if (res.rows.length === 0) return undefined;
      // Scalar queries (e.g. count(*), exists, has_table_privilege) return one
      // column; the caller wants that value, not the row wrapper.
      const keys = Object.keys(res.rows[0] as Record<string, unknown>);
      if (keys.length === 1) {
        const v = (res.rows[0] as Record<string, unknown>)[keys[0]!];
        return (v as T) ?? undefined;
      }
      return res.rows[0] as T;
    },
    async none(sql: string): Promise<void> {
      await client.query(sql);
    },
    async setRole(role: RoleName, subject: string): Promise<void> {
      // `SET LOCAL` is transaction-scoped, and `session_user` is still the
      // superuser, so the suite may switch roles repeatedly within one test.
      if (role === "superuser") {
        await client.query("reset role");
      } else {
        await client.query(`set local role ${role}`);
      }
      // `auth.set_subject()` is SECURITY DEFINER, so this works for every
      // role without granting table privileges on auth.context.
      await client.query(
        `select auth.set_subject(${subject ? `'${subject}'::uuid` : "null::uuid"})`,
      );
      ctx.role = role;
      ctx.subject = subject;
    },
    async destroy(): Promise<void> {
      try {
        await client.query("rollback");
      } catch {
        // Already closed or aborted.
      }
      try {
        await client.end();
      } catch {
        // Connection already gone.
      }
    },
  };

  return ctx;
}
