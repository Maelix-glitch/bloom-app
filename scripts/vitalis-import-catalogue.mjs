#!/usr/bin/env node
/**
 * Apply the Vitalis evidence catalogue to a Supabase project.
 *
 *   SUPABASE_DB_PASSWORD=… node scripts/vitalis-import-catalogue.mjs \
 *     --project-ref <ref> --confirm-target <ref> [--pooler-host <host>] [--seed <path>]
 *
 * The seed cannot run as an anonymous session. `evidence_is_import_session()`
 * requires `session_user = 'evidence_importer'` **and** `bloom.evidence_import =
 * 'on'`, and hosted Supabase's `postgres` is not a superuser, so
 * `set session authorization` is denied there (42501). The only non-superuser
 * route is a real session authenticated as the importer — which is what this
 * script creates, briefly, and then removes.
 *
 * Hardening, by design:
 *
 *   1. `--confirm-target` must equal `--project-ref`; nothing is read from
 *      `supabase/config.toml`, so a stale link cannot aim this at a project.
 *   2. Only port 5432 is ever used, and the host is validated, so transaction-mode
 *      pooling (6543) cannot be selected. The backend's own `port` GUC reads 5432
 *      through either pooler mode, so it is checked only as defence in depth;
 *      the client port is the real control.
 *   3. The temporary password is generated in memory (192 bits), never printed,
 *      never written to disk, and cleared with `password null` afterwards.
 *   4. Cleanup runs in `finally`: `nologin`, `password null`, and an attempted
 *      membership revoke. A failed import cannot leave a login-capable importer
 *      behind while the owner connection survives; if the network drops first,
 *      see the residue window in docs/vitalis-import-security-review.md.
 *   5. Success is asserted, not eyeballed: the seven catalogue counts, a dormant
 *      role, a failed login attempt with the temporary password, no membership
 *      other than the migration executor, and no inherited GUC.
 *   6. TLS certificates are verified by default. Supabase signs its pooler chain
 *      with its own CA, so verification needs the project's certificate
 *      (`--ca <pem>`); `--insecure-tls` is an explicit, recorded downgrade.
 *
 * Two platform behaviours this had to learn the hard way, both verified against
 * hosted Supabase:
 *
 *   • `pg_roles.rolpassword` is masked for a non-superuser, so "password is NULL"
 *     is not observable from this connection. The only trustworthy check is to
 *     try logging in with the temporary password and require the failure.
 *   • PostgreSQL 16 grants the creating role membership of the role it creates,
 *     and hosted Supabase records that grant under `supabase_admin`, so a
 *     `revoke` issued by `postgres` leaves the row in place (measured). It is not
 *     an escalation — the role is NOLOGIN and the guard also needs the session
 *     GUC — so the row is reported and any *other* member fails the run.
 *
 * The database password is read from `SUPABASE_DB_PASSWORD` only.
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Mirrors the catalogue header: 6 sources, 4 claims, 3 citations, 2 recs, 4 revisions. */
const EXPECTED = {
  sources: 6,
  claims: 4,
  citations: 3,
  recommendations: 2,
  links: 2,
  revisions: 4,
  events: 3,
};

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

if (flag("--help") || flag("-h")) {
  console.log(
    [
      "usage: node scripts/vitalis-import-catalogue.mjs --project-ref <ref> --confirm-target <ref>",
      "",
      "  --project-ref <ref>    20-character Supabase project ref (required)",
      "  --confirm-target <ref> must equal --project-ref (required)",
      "  --pooler-host <host>   defaults to aws-0-ap-northeast-1.pooler.supabase.com",
      "  --seed <path>          defaults to supabase/seeds/20261107_vitalis_evidence_catalog.sql",
      "  --reason <text>        audit reason recorded on status changes",
      "  --ca <path>            PEM chain for pooler TLS verification (recommended)",
      "  --insecure-tls         skip pooler certificate verification (recorded risk)",
      "",
      "environment:",
      "  SUPABASE_DB_PASSWORD   database password (required; never printed)",
    ].join("\n"),
  );
  process.exit(0);
}

const projectRef = value("--project-ref") ?? "";
const confirmTarget = value("--confirm-target") ?? "";
const poolerHost = value("--pooler-host") ?? "aws-0-ap-northeast-1.pooler.supabase.com";
const seedPath = resolve(
  root,
  value("--seed") ?? "supabase/seeds/20261107_vitalis_evidence_catalog.sql",
);
const reason = value("--reason") ?? "catalogue seed";
const caPath = value("--ca");
const insecureTls = flag("--insecure-tls");
const ownerPassword = process.env.SUPABASE_DB_PASSWORD ?? "";

function refuse(message) {
  console.error(`refusing to import: ${message}`);
  process.exit(2);
}

if (!/^[a-z0-9]{20}$/.test(projectRef)) refuse("--project-ref must be a 20-character project ref");
if (confirmTarget !== projectRef) refuse("--confirm-target must repeat --project-ref exactly");
if (!ownerPassword) refuse("SUPABASE_DB_PASSWORD is not set");
if (poolerHost.includes(":") || poolerHost.includes("/"))
  refuse("--pooler-host takes a host name only; the port is always 5432 (session mode)");
if (
  !/\.pooler\.supabase\.com$/.test(poolerHost) &&
  !/^db\.[a-z0-9]{20}\.supabase\.co$/.test(poolerHost)
)
  refuse("--pooler-host must be a Supabase pooler or db.<ref>.supabase.co host");

let seed;
try {
  seed = readFileSync(seedPath, "utf8");
} catch (error) {
  refuse(`cannot read the seed at ${seedPath}: ${error.message}`);
}

/** Default is verified TLS; the platform chain is only known via `--ca`. */
const ssl = (() => {
  if (insecureTls) return { rejectUnauthorized: false };
  if (!caPath) return { rejectUnauthorized: true };
  try {
    return { ca: readFileSync(resolve(root, caPath), "utf8"), rejectUnauthorized: true };
  } catch (error) {
    refuse(`cannot read the CA bundle at ${caPath}: ${error.message}`);
  }
})();

const untrustedChain = new Set([
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "CERT_HAS_EXPIRED",
]);

const tlsHint = (error) => {
  if (!insecureTls && untrustedChain.has(error.code))
    return new Error(
      "the pooler's certificate chain is not trusted by this host (Supabase signs it with its " +
        "own CA). Download the project's SSL certificate from the dashboard " +
        "(Project Settings -> Database -> SSL) and pass --ca <path>, or accept the recorded " +
        "risk with --insecure-tls.",
    );
  return error;
};

const connect = (user, password) =>
  new pg.Client({
    host: poolerHost,
    port: 5432,
    user,
    database: "postgres",
    password,
    ssl,
    connectionTimeoutMillis: 20_000,
    statement_timeout: 120_000,
  });

const countsSql = `select
  (select count(*)::int from public.evidence_sources) as sources,
  (select count(*)::int from public.evidence_claims) as claims,
  (select count(*)::int from public.evidence_claim_sources) as citations,
  (select count(*)::int from public.evidence_recommendations) as recommendations,
  (select count(*)::int from public.evidence_recommendation_claims) as links,
  (select count(*)::int from public.evidence_revisions) as revisions,
  (select count(*)::int from public.evidence_lifecycle_events) as events`;

const membersSql = `select r.rolname as member
  from pg_auth_members m
  join pg_roles r on r.oid = m.member
  join pg_roles g on g.oid = m.roleid
 where g.rolname = 'evidence_importer'`;

const importedPassword = randomBytes(24).toString("base64url");
let owner;
let importer;
let failure;
let result;
let dormantAt = null;

try {
  owner = connect(`postgres.${projectRef}`, ownerPassword);
  try {
    await owner.connect();
  } catch (error) {
    throw tlsHint(error);
  }

  // Session-mode assertions before anything changes.
  const port = await owner.query("select current_setting('port') as port");
  if (port.rows[0]?.port !== "5432")
    throw new Error(`connected on port ${port.rows[0]?.port}; session mode (5432) is required`);
  const gucBefore = await owner.query(
    "select coalesce(current_setting('bloom.evidence_import', true), '') as flag",
  );
  if (gucBefore.rows[0]?.flag !== "")
    throw new Error("bloom.evidence_import was already set on the owner connection");

  await owner.query(`alter role evidence_importer login password '${importedPassword}'`);

  importer = connect(`evidence_importer.${projectRef}`, importedPassword);
  try {
    await importer.connect();
  } catch (error) {
    if (error.code === "28P01")
      throw new Error(
        "the pooler rejected the temporary credential (28P01). A recent import leaves " +
          "Supavisor's verifier cache stale for about a minute: wait and retry, or use a " +
          "fresh project (one import per project).",
      );
    throw tlsHint(error);
  }

  const identity = await importer.query("select session_user as who");
  if (identity.rows[0]?.who !== "evidence_importer")
    throw new Error(`session_user is ${identity.rows[0]?.who}, not evidence_importer`);

  await importer.query("begin");
  // set_config(..., true) is transaction-local, i.e. `set local`, and takes the
  // reason as a bound parameter so no quoting path exists into this session.
  await importer.query("select set_config('bloom.evidence_import', 'on', true)");
  await importer.query("select set_config('bloom.evidence_reason', $1, true)", [reason]);
  await importer.query(seed);
  await importer.query("commit");

  // Explicit reset, then prove it took effect on this session.
  await importer.query("reset bloom.evidence_reason");
  await importer.query("reset bloom.evidence_import");
  const gucAfter = await importer.query(
    `select coalesce(current_setting('bloom.evidence_import', true), '') as flag,
            coalesce(current_setting('bloom.evidence_reason', true), '') as reason`,
  );
  if (gucAfter.rows[0]?.flag !== "" || gucAfter.rows[0]?.reason !== "")
    throw new Error("import GUCs were still set after reset");
} catch (error) {
  failure = error;
  // Closing the session would abort the open transaction anyway; be explicit so a
  // partially applied seed is never left pending on a pooled backend.
  if (importer) await importer.query("rollback").catch(() => {});
} finally {
  if (importer) await importer.end().catch(() => {});
  if (owner) {
    // Unconditional: a failed import must not leave a login-capable importer.
    try {
      await owner.query("alter role evidence_importer nologin");
      await owner.query("alter role evidence_importer password null");
      dormantAt = new Date();
    } catch (error) {
      console.error(`could not revert the importer role: ${error.message}`);
      if (!failure) failure = error;
    }
  }
}

if (failure) {
  console.error(`import failed: ${failure.code ?? ""} ${failure.message}`);
  if (owner) await owner.end().catch(() => {});
  process.exit(1);
}

try {
  const role = await owner.query(
    "select rolname, rolcanlogin from pg_roles where rolname = 'evidence_importer'",
  );

  // PostgreSQL 16 grants the creating role membership of the role it just made,
  // and hosted Supabase records that grant under `supabase_admin`, so `postgres`
  // cannot revoke it (measured: the row survives REVOKE). It is not an
  // escalation — the importer is NOLOGIN and the guard also needs the session
  // GUC — so it is measured rather than assumed away: any member other than the
  // role that ran the migration fails the run.
  await owner.query("revoke evidence_importer from postgres").catch(() => {});
  const members = await owner.query(membersSql);
  const counts = (await owner.query(countsSql)).rows[0];

  // rolpassword is masked for a non-superuser, so prove dormancy behaviourally.
  // A session-mode pooler can hand the probe the backend the import itself left
  // moments ago — PostgreSQL does not re-check rolcanlogin on an already open
  // backend — so a connection only counts as a failure when the backend started
  // after the role was made dormant.
  let loginBlocked = false;
  let lingeringBackend = null;
  try {
    const probe = connect(`evidence_importer.${projectRef}`, importedPassword);
    await probe.connect();
    const seen = await probe.query(
      "select backend_start from pg_stat_activity where pid = pg_backend_pid()",
    );
    await probe.end();
    const started = seen.rows[0]?.backend_start ? new Date(seen.rows[0].backend_start) : null;
    if (started && dormantAt && started < dormantAt) lingeringBackend = started.toISOString();
  } catch {
    loginBlocked = true;
  }

  const dormant = role.rows[0];
  const problems = [];
  if (!dormant) problems.push("evidence_importer does not exist");
  if (dormant?.rolcanlogin) problems.push("evidence_importer is still a login role");
  if (!loginBlocked && !lingeringBackend)
    problems.push("the importer still accepts the temporary password");
  const foreignMembers = members.rows.filter((r) => r.member !== "postgres");
  if (foreignMembers.length)
    problems.push(`unexpected members: ${foreignMembers.map((r) => r.member).join(", ")}`);
  for (const [key, expected] of Object.entries(EXPECTED)) {
    if (counts[key] !== expected)
      problems.push(`${key}: expected ${expected}, found ${counts[key]}`);
  }

  result = {
    counts,
    role: dormant,
    members: members.rows,
    loginBlocked,
    lingeringBackend,
    problems,
  };
} finally {
  if (owner) await owner.end().catch(() => {});
}

for (const [key, value] of Object.entries(result.counts)) {
  console.log(`${key.padEnd(16)} ${value}`);
}
console.log(
  `role             evidence_importer login=${result.role?.rolcanlogin} login_blocked=${result.loginBlocked}${
    result.lingeringBackend ? ` (pooler backend from ${result.lingeringBackend}, pre-cleanup)` : ""
  }`,
);
console.log(
  `memberships      ${result.members.map((m) => m.member).join(", ") || "none"} (migration executor only)`,
);

if (result.problems.length) {
  for (const problem of result.problems) console.error(`FAILED: ${problem}`);
  process.exit(1);
}
console.log("\ncatalogue imported, importer dormant, GUCs cleared");
