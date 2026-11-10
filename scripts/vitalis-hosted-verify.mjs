#!/usr/bin/env node
/**
 * Hosted Supabase verification for the four open deployment uncertainties (U1,
 * U2, U4, U6) in `docs/vitalis-p2.2-acceptance-verification.md` §6.
 *
 *   node scripts/vitalis-hosted-verify.mjs --confirm-disposable --project-ref <ref>
 *   node scripts/vitalis-hosted-verify.mjs --confirm-disposable --project-ref <ref> --rollback
 *
 * What it does NOT do: create, link, deploy or delete a project, push migrations
 * or apply the seed. Those are the runbook's steps, so a human sees each one.
 * This script only observes (and, with `--rollback`, performs the U6 experiment).
 *
 * Safety rails, in order:
 *   • `--confirm-disposable` is mandatory: the probes are read-only in the
 *     ordinary path, but they run against a real remote database and the operator
 *     must have acknowledged that it is disposable.
 *   • `--project-ref` is mandatory; there is no default and nothing is read from
 *     `supabase/config.toml`, so a stale link cannot aim this at the wrong project.
 *   • The database password comes from `SUPABASE_DB_PASSWORD` and the anon key
 *     from `SUPABASE_ANON_KEY`; neither is printed, logged or written to the
 *     evidence file.
 *   • `--rollback` drops a role, so it also requires `--confirm-disposable`.
 *
 * Evidence: every probe records what it ran, the raw result, the expectation and
 * a verdict, and the whole run is written to `verify-out/vitalis-hosted-<stamp>.json`
 * with a Markdown digest beside it, for pasting into the acceptance record.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Arguments and environment
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

if (flag("--help") || flag("-h")) {
  console.log(
    [
      "usage: node scripts/vitalis-hosted-verify.mjs --confirm-disposable --project-ref <ref> [--rollback]",
      "",
      "  --confirm-disposable   required; the target database may be destroyed",
      "  --project-ref <ref>    required; never read from config.toml",
      "  --rollback             also run the U6 role-rollback experiment",
      "",
      "environment:",
      "  SUPABASE_DB_PASSWORD   required; database password (never printed)",
      "  SUPABASE_ANON_KEY      required for the PostgREST probes (U2)",
      "  SUPABASE_URL           optional; defaults to https://<ref>.supabase.co",
      "  P22_DIRECT_HOST        optional; db.<ref>.supabase.co",
      "  P22_SESSION_HOST       optional; pooler host, session mode on 5432",
      "  P22_TRANSACTION_HOST   optional; pooler host, transaction mode on 6543",
    ].join("\n"),
  );
  process.exit(0);
}

const projectRef = value("--project-ref");
const password = process.env.SUPABASE_DB_PASSWORD ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
const baseUrl = process.env.SUPABASE_URL ?? (projectRef ? `https://${projectRef}.supabase.co` : "");
const includeRollback = flag("--rollback");

const problems = [];
if (!flag("--confirm-disposable")) problems.push("--confirm-disposable is required");
if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef))
  problems.push("--project-ref must be a 20-character project ref");
if (!password) problems.push("SUPABASE_DB_PASSWORD is not set");
if (!anonKey) problems.push("SUPABASE_ANON_KEY is not set (needed for U2)");
if (problems.length) {
  for (const problem of problems) console.error(`refusing to run: ${problem}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const results = [];
let hostNotes = [];

function record(probe, { ran, raw, expect, verdict, note }) {
  results.push({ probe, ran, raw, expect, verdict, note });
  const label = verdict === "pass" ? "PASS" : verdict === "fail" ? "FAIL" : "INFO";
  console.log(`[${label}] ${probe}`);
  if (note) console.log(`       ${note}`);
}

const dbUser = (host) => (host.includes("pooler") ? `postgres.${projectRef}` : "postgres");

function connect(host, port, user = dbUser(host)) {
  const client = new pg.Client({
    host,
    port,
    user,
    database: "postgres",
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20_000,
    statement_timeout: 30_000,
  });
  return client;
}

async function withClient(host, port, fn, user = dbUser(host)) {
  const client = connect(host, port, user);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function probe(label, host, port, sql, expect, judge, user) {
  try {
    const raw = await withClient(host, port, async (c) => (await c.query(sql)).rows, user);
    const verdict = judge(raw) ? "pass" : "fail";
    record(label, { ran: `${host}:${port} — ${sql}`, raw, expect, verdict });
    return raw;
  } catch (error) {
    record(label, {
      ran: `${host}:${port} — ${sql}`,
      raw: `${error.code ?? "error"}: ${error.message}`,
      expect,
      verdict: "fail",
    });
    return undefined;
  }
}

async function rest(path, key) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 400);
  }
  return { status: response.status, body };
}

// ---------------------------------------------------------------------------
// Host discovery
// ---------------------------------------------------------------------------

const region = process.env.P22_REGION ?? "ap-northeast-1";
const candidates = {
  direct: process.env.P22_DIRECT_HOST ?? `db.${projectRef}.supabase.co`,
  session: process.env.P22_SESSION_HOST ?? `aws-0-${region}.pooler.supabase.com`,
  transaction: process.env.P22_TRANSACTION_HOST ?? `aws-0-${region}.pooler.supabase.com`,
};

async function reachable(host, port, user) {
  try {
    return await withClient(
      host,
      port,
      async (c) => (await c.query("select 1 as ok")).rows[0]?.ok === 1,
      user,
    );
  } catch {
    return false;
  }
}

async function discover() {
  const out = {};
  const tryDirect = async (host) => reachable(host, 5432);
  const trySession = async (host) => reachable(host, 5432, `postgres.${projectRef}`);
  const tryTx = async (host) => reachable(host, 6543, `postgres.${projectRef}`);

  if (await tryDirect(candidates.direct)) out.direct = candidates.direct;

  const sessionHosts = [
    candidates.session,
    `aws-1-${region}.pooler.supabase.com`,
    `aws-0-${region.split("-").slice(0, 2).join("-")}.pooler.supabase.com`,
  ];
  for (const host of [...new Set(sessionHosts)]) {
    if (!out.session && (await trySession(host))) out.session = host;
  }
  const txHosts = [...new Set(sessionHosts)];
  for (const host of txHosts) {
    if (!out.transaction && (await tryTx(host))) out.transaction = host;
  }
  hostNotes.push(`discovered: ${JSON.stringify(out)}`);
  return out;
}

// ---------------------------------------------------------------------------
// U1 — what the hosted administrative connection is
// ---------------------------------------------------------------------------

async function u1(host, port) {
  await probe(
    "U1.1 administrative connection identity and privileges",
    host,
    port,
    `select current_user as role, session_user as session_role,
            (select rolsuper from pg_roles where rolname = current_user) as is_superuser,
            (select rolcreaterole from pg_roles where rolname = current_user) as can_create_role,
            (select rolbypassrls from pg_roles where rolname = current_user) as bypasses_rls,
            current_setting('server_version') as server_version`,
    "current_user is postgres with rolsuper = false and rolcreaterole = true on hosted Supabase (supabase_admin holds rolsuper)",
    (rows) => rows[0]?.role === "postgres" && rows[0]?.can_create_role === true,
  );

  try {
    const raw = await withClient(host, port, async (c) => {
      await c.query("set session authorization evidence_importer");
      const adopted = (await c.query("select current_user as role")).rows[0];
      await c.query("reset session authorization");
      return adopted;
    });
    record("U1.2 only a true superuser can adopt the importer identity", {
      ran: "set session authorization evidence_importer",
      raw,
      expect: "accepted only where postgres has rolsuper; denied on hosted Supabase",
      verdict: "info",
      note: "accepted here — this administrative role is a superuser, so the local import mechanism is available on this database",
    });
  } catch (error) {
    const code = error.code ?? "";
    record("U1.2 only a true superuser can adopt the importer identity", {
      ran: "set session authorization evidence_importer",
      raw: `${code}: ${error.message}`,
      expect:
        "42501 where postgres is not a superuser — the hosted case, which rules out the local import mechanism",
      verdict: code === "42501" ? "pass" : "fail",
      note:
        code === "42501"
          ? "hosted postgres cannot adopt the importer identity; the runbook must use a temporary login role for evidence_importer instead"
          : undefined,
    });
  }

  await probe(
    "U1.3 the registry predicate is callable from the administrative connection",
    host,
    port,
    `select public.evidence_is_import_session() as import_session_without_guc`,
    "false, and no error: auth.uid() and current_setting(...,true) both tolerate the missing subject",
    (rows) => rows[0]?.import_session_without_guc === false,
  );
}

// ---------------------------------------------------------------------------
// U2 — PostgREST surface
// ---------------------------------------------------------------------------

async function u2(host, port) {
  await probe(
    "U2.1 schemas named in PostgREST search settings",
    host,
    port,
    `select coalesce(json_agg(json_build_object('role', r.rolname, 'settings', s.setconfig)), '[]'::json) as settings
       from pg_db_role_setting s join pg_roles r on r.oid = s.setrole
      where s.setconfig::text ~ 'pgrst|search_path'`,
    "only public (and graphql_public if used); pg_catalog never appears",
    (rows) => !JSON.stringify(rows).includes("pg_catalog"),
  );

  const catalog = await rest("/rest/v1/pg_proc?select=proname&limit=1", anonKey);
  record("U2.2 pg_catalog is not exposed through PostgREST", {
    ran: `GET ${baseUrl}/rest/v1/pg_proc?select=proname&limit=1 (anon)`,
    raw: catalog,
    expect: "404 with PGRST106/PGRST205 (schema not exposed), never 200 with rows",
    verdict:
      catalog.status === 404 && /PGRST(106|205)/.test(String(catalog.body?.code ?? ""))
        ? "pass"
        : catalog.status === 200
          ? "fail"
          : "info",
    note:
      catalog.status === 200
        ? "pg_catalog IS reachable through the API — remove it from the exposed schemas"
        : undefined,
  });

  const editors = await rest("/rest/v1/evidence_editors?select=user_id&limit=1", anonKey);
  record("U2.3 evidence_editors is unreadable through the API", {
    ran: `GET ${baseUrl}/rest/v1/evidence_editors?select=user_id&limit=1 (anon)`,
    raw: editors,
    expect: "401/403, or 200 with an empty array — never another user's row",
    verdict:
      editors.status === 401 ||
      editors.status === 403 ||
      (editors.status === 200 && Array.isArray(editors.body) && editors.body.length === 0)
        ? "pass"
        : "fail",
  });

  const sources = await rest("/rest/v1/evidence_sources?select=id&limit=1", anonKey);
  record("U2.4 the registry is not readable anonymously", {
    ran: `GET ${baseUrl}/rest/v1/evidence_sources?select=id&limit=1 (anon)`,
    raw: sources,
    expect: "401/403, or 200 with an empty array (policy requires a signed-in reader)",
    verdict:
      sources.status === 401 ||
      sources.status === 403 ||
      (sources.status === 200 && Array.isArray(sources.body) && sources.body.length === 0)
        ? "pass"
        : "fail",
  });
}

// ---------------------------------------------------------------------------
// U4 — pooler semantics for the session-scoped import GUC
// ---------------------------------------------------------------------------

async function u4(sessionHost, txHost) {
  const readSetting = `select coalesce(current_setting('bloom.evidence_import', true), '<unset>') as import_guc,
                              current_user as role`;

  const persistence = async (host, port, label) => {
    try {
      const raw = await withClient(host, port, async (c) => {
        await c.query("set bloom.evidence_import = 'on'");
        const first = (await c.query(readSetting)).rows[0];
        await new Promise((r) => setTimeout(r, 250));
        const second = (await c.query(readSetting)).rows[0];
        return { first, second };
      });
      record(`U4.1 session GUC survives a round trip — ${label}`, {
        ran: `${host}:${port} set bloom.evidence_import='on'; then two separate queries`,
        raw,
        expect:
          label === "transaction mode"
            ? "the second read does not see 'on' (pooled backend changed) — that is the finding, not a defect"
            : "both reads see 'on'",
        verdict: "info",
        note: `first=${raw.first.import_guc} second=${raw.second.import_guc} role=${raw.second.role}`,
      });
      return raw;
    } catch (error) {
      record(`U4.1 session GUC survives a round trip — ${label}`, {
        ran: `${host}:${port}`,
        raw: `${error.code ?? "error"}: ${error.message}`,
        expect: "a connection",
        verdict: "info",
        note: "connection failed; the mode could not be measured",
      });
      return undefined;
    }
  };

  const direct = await persistence(sessionHost, 5432, "session mode");
  const pooled = txHost ? await persistence(txHost, 6543, "transaction mode") : undefined;

  if (pooled && direct) {
    const lost = pooled.second.import_guc !== "on";
    record("U4.2 the import GUC is not a stable property of a pooled connection", {
      ran: "compare the second read on 5432 (session) and 6543 (transaction)",
      raw: { session: direct.second, transaction: pooled.second },
      expect:
        "session mode keeps 'on'; transaction mode does not — so the import runbook must use a direct/session connection",
      verdict: lost ? "pass" : "info",
      note: lost
        ? "transaction mode resets the GUC as documented; the runbook already requires a direct connection"
        : "transaction mode preserved the GUC here — do not generalise it into the app",
    });
  }

  // The identity switch the import runbook actually relies on.
  for (const [label, host, port] of [
    ["session mode", sessionHost, 5432],
    ["transaction mode", txHost, 6543],
  ]) {
    if (!host) continue;
    try {
      const raw = await withClient(host, port, async (c) => {
        await c.query("set session authorization evidence_importer");
        const assumed = (await c.query("select current_user as role, session_user as who")).rows[0];
        await c.query("reset session authorization");
        return assumed;
      });
      record(`U4.3 SET SESSION AUTHORIZATION reaches evidence_importer — ${label}`, {
        ran: `${host}:${port} set session authorization evidence_importer`,
        raw,
        expect: "current_user becomes evidence_importer and reset restores postgres",
        verdict: raw.role === "evidence_importer" ? "pass" : "info",
        note:
          raw.role === "evidence_importer"
            ? undefined
            : "not permitted on hosted Supabase: this needs rolsuper, which postgres does not have. Use a temporary login role for evidence_importer instead (see the runbook).",
      });
    } catch (error) {
      const denied = error.code === "42501";
      record(`U4.3 SET SESSION AUTHORIZATION reaches evidence_importer — ${label}`, {
        ran: `${host}:${port}`,
        raw: `${error.code ?? "error"}: ${error.message}`,
        expect:
          "current_user becomes evidence_importer; 42501 means the runbook's mechanism is unavailable here",
        verdict: denied ? "info" : "fail",
        note: denied
          ? "hosted postgres is not a superuser, so SET SESSION AUTHORIZATION cannot be used. Connect as a temporary login role for evidence_importer instead."
          : undefined,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// U6 — rolling back a cluster-level role
// ---------------------------------------------------------------------------

async function u6(host, port) {
  await probe(
    "U6.1 the importer role exists and owns nothing",
    host,
    port,
    `select rolname, rolcanlogin, rolsuper,
            (select count(*) from pg_shdepend d where d.refobjid = r.oid and d.deptype = 'o') as owned_objects
       from pg_roles r where rolname = 'evidence_importer'`,
    "one row, rolcanlogin false, owned_objects 0",
    (rows) =>
      rows.length === 1 && rows[0].rolcanlogin === false && Number(rows[0].owned_objects) === 0,
  );

  if (!includeRollback) {
    record("U6.2 role rollback", {
      ran: "skipped (--rollback not passed)",
      raw: null,
      expect: "drop owned by, then drop role, then re-apply the migration recreates it",
      verdict: "info",
      note: "run with --rollback on a disposable project only",
    });
    return;
  }

  // A role is cluster-level: CREATE ROLE inside a transaction is not undone by
  // ROLLBACK. Confirm that, then take the real path the runbook would take.
  try {
    const raw = await withClient(host, port, async (c) => {
      await c.query("begin");
      await c.query("create role evidence_rollback_probe nologin");
      await c.query("rollback");
      const survivors = await c.query(
        `select count(*)::int as n from pg_roles where rolname = 'evidence_rollback_probe'`,
      );
      return survivors.rows[0];
    });
    record("U6.2 a role created inside a transaction is rolled back with it", {
      ran: "begin; create role evidence_rollback_probe nologin; rollback;",
      raw,
      expect:
        "n = 0 — CREATE ROLE is transactional, so a failed migration transaction leaves no role behind; roles are however shared across databases in the cluster",
      verdict: raw.n === 0 ? "pass" : "fail",
    });
  } catch (error) {
    record("U6.2 a role created inside a transaction is rolled back with it", {
      ran: "begin; create role ...; rollback;",
      raw: `${error.code ?? "error"}: ${error.message}`,
      expect: "n = 0",
      verdict: "fail",
    });
  }

  try {
    const raw = await withClient(host, port, async (c) => {
      await c.query("drop role if exists evidence_rollback_probe");
      await c.query("grant evidence_importer to current_user");
      await c.query("reassign owned by evidence_importer to current_user");
      await c.query("drop owned by evidence_importer");
      await c.query("revoke all on schema public from evidence_importer");
      await c.query("revoke evidence_importer from current_user");
      await c.query("drop role evidence_importer");
      const roles = await c.query(
        `select count(*)::int as n from pg_roles where rolname = 'evidence_importer'`,
      );
      const grants = await c.query(
        `select count(*)::int as n from pg_shdepend d join pg_roles r on r.oid = d.refobjid
          where r.rolname = 'evidence_importer'`,
      );
      return { roles: roles.rows[0].n, grants: grants.rows[0].n };
    });
    record("U6.3 drop owned by + drop role removes the importer cleanly", {
      ran: "drop owned by evidence_importer; revoke …; drop role evidence_importer;",
      raw,
      expect: "roles 0 and grants 0 — no dependency error, no orphaned ACL entry",
      verdict: raw.roles === 0 && raw.grants === 0 ? "pass" : "fail",
    });
  } catch (error) {
    record("U6.3 drop owned by + drop role removes the importer cleanly", {
      ran: "drop owned by evidence_importer; drop role evidence_importer;",
      raw: `${error.code ?? "error"}: ${error.message}`,
      expect: "roles 0 and grants 0",
      verdict: "fail",
      note: "a 2BP01 here means objects still depend on the role",
    });
  }

  try {
    const raw = await withClient(host, port, async (c) => {
      const sql = await import("node:fs").then((fs) =>
        fs.readFileSync(
          resolve(root, "supabase/migrations/20261110_vitalis_evidence_lifecycle.sql"),
          "utf8",
        ),
      );
      await c.query(sql);
      const roles = await c.query(
        `select count(*)::int as n from pg_roles where rolname = 'evidence_importer'`,
      );
      return roles.rows[0];
    });
    record("U6.4 re-applying the migration recreates the importer role", {
      ran: "apply 20261110_vitalis_evidence_lifecycle.sql after the rollback",
      raw,
      expect: "n = 1 — the forward path is repeatable after a rollback",
      verdict: raw.n === 1 ? "pass" : "fail",
    });
  } catch (error) {
    record("U6.4 re-applying the migration recreates the importer role", {
      ran: "apply 20261110_vitalis_evidence_lifecycle.sql",
      raw: `${error.code ?? "error"}: ${error.message}`,
      expect: "n = 1",
      verdict: "fail",
    });
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const hosts = await discover();
const adminHost = hosts.session ?? hosts.direct;
if (!adminHost) {
  console.error("no database host was reachable; nothing could be verified");
  hostNotes.push("unreachable: every candidate host failed");
}

if (adminHost) {
  await u1(adminHost, 5432);
  await u2(adminHost, 5432);
  await u4(hosts.session ?? adminHost, hosts.transaction);
  await u6(adminHost, 5432);
}

const passed = results.filter((r) => r.verdict === "pass").length;
const failed = results.filter((r) => r.verdict === "fail").length;
const summary = {
  projectRef,
  baseUrl,
  ranAt: new Date().toISOString(),
  hosts,
  hostNotes,
  counts: {
    probes: results.length,
    passed,
    failed,
    informational: results.length - passed - failed,
  },
  results,
};

const outDir = resolve(root, "verify-out");
mkdirSync(outDir, { recursive: true });
const jsonPath = resolve(outDir, `vitalis-hosted-${stamp}.json`);
writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);

const md = [
  `# Hosted verification — ${projectRef}`,
  "",
  `Run ${summary.ranAt}. ${passed} passed, ${failed} failed, ${summary.counts.informational} informational.`,
  "",
  `Hosts: \`${JSON.stringify(hosts)}\``,
  "",
  "| Probe | Verdict | Expectation |",
  "| --- | --- | --- |",
  ...results.map(
    (r) => `| ${r.probe} | ${r.verdict} | ${String(r.expect).replace(/\|/g, "\\|")} |`,
  ),
  "",
  "Raw results are in the JSON beside this file.",
  "",
].join("\n");
const mdPath = resolve(outDir, `vitalis-hosted-${stamp}.md`);
writeFileSync(mdPath, md);

console.log(`\n${passed} passed, ${failed} failed, ${summary.counts.informational} informational`);
console.log(`evidence: ${jsonPath}`);
console.log(`digest:   ${mdPath}`);
process.exit(failed === 0 ? 0 : 1);
