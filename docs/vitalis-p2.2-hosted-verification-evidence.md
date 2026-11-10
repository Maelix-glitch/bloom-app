# Vitalis P2.2 — hosted Supabase verification evidence

First execution of `docs/vitalis-p2.2-hosted-verification-checklist.md`.

- **When:** 6 November 2026, 17:23–19:19 UTC
- **Where:** disposable project `uniqlrrboihfdzklsc` ("bloom-p22-verify"), org
  `amujzdfhyayiesdmlvkk`, region `ap-northeast-1`
- **Host:** `aws-0-ap-northeast-1.pooler.supabase.com` — session 5432, transaction
  6543, user `postgres.<ref>`. `db.<ref>.supabase.co` did not resolve from this
  machine (no IPv6 DNS), so the direct host was not exercised.
- **Script:** `scripts/vitalis-hosted-verify.mjs --confirm-disposable --rollback`
- **Result:** **11 passed, 0 failed, 5 informational**, exit 0.

The project was deleted after the run. No production project was touched.

---

## 1. Schema deployment

### 1.1 `db push` from a genuinely empty project — fails

```
Applying migration 20260826_reward_delivery.sql...
ERROR: relation "public.profiles" does not exist (SQLSTATE 42P01)
At statement: 0
-- Bloom — Profile 2.0: identity, privacy, stories, highlights.
```

One version recorded (`20260826`), 3 public tables. `20260828_profile_identity_stories.sql`
alters `public.profiles`; that table is created by `20260909_core_tables.sql`, which
sorts _after_ it. **This is a pre-existing repository defect, not a Vitalis one:** no
Vitalis migration had run at the failure point, and the same ordering would fail on
any fresh Supabase project.

**Corrected after this run.** The two creators were moved into dependency
order on 6 November 2026 — `20260825_core_tables.sql` (was `20260909`) and
`20260910160000_story_interaction_names.sql` (was `20260910120000`) — with
contents byte-identical (SHA-256 verified) and every reference updated. See
`docs/vitalis-migration-dependency-analysis.md` §8 for the post-fix result.

Consequence: the acceptance criterion "a full `db push` from empty matches the local
result" is **not met**, and cannot be met until the app migration ordering is fixed
(a baseline/squashed migration, or renaming the August files after core tables).

### 1.2 With an app baseline — passes

The 19 app-level files were applied with a fixpoint (filename order, deferring files
that fail on a missing relation). Observed order placed `20260909_core_tables.sql`
fifth and `20260828_profile_identity_stories.sql` tenth — the dependency the
filenames encode wrongly. Then the real runner applied the Vitalis set:

```
Applying migration 20261104_vitalis_health_foundation.sql ...
Applying migration 20261112_vitalis_evidence_revision_coverage.sql ...
```

| Check                                     | Result                |
| ----------------------------------------- | --------------------- |
| recorded versions                         | 25, latest `20261112` |
| `health_*` + `evidence_*` tables          | **13**                |
| triggers on those tables                  | **11**                |
| policies on those tables                  | **37**                |
| functions named `evidence_*` / `health_*` | **23**                |

Identical to the local harness, including the two constraint triggers added by A2.
`evidence_importer` exists with `rolcanlogin = false`, `rolsuper = false`.

Also found: `supabase migration repair` rejects the 8-digit prefixes
(`failed to parse 20260826_reward_delivery: invalid version number`), so repairing
history for this repository is not available as a shortcut — the baseline must be
applied, not declared.

---

## 2. U1 — the administrative role on hosted Supabase

```sql
select rolname, rolsuper, rolcreaterole, rolbypassrls from pg_roles
 where rolname in ('postgres','supabase_admin','evidence_importer');
```

```
postgres         super=false createrole=true  bypassrls=true
supabase_admin   super=true  createrole=true  bypassrls=true
evidence_importer super=false createrole=false bypassrls=false
```

- `set session authorization evidence_importer` → **`42501 permission denied`**.
  The local import mechanism (and the one documented in
  `docs/vitalis-evidence-seed.md`) requires a superuser. Hosted `postgres` is one
  only at `createrole`/`bypassrls` level, not superuser.
- `set role evidence_importer` (after `grant … to postgres`) succeeds, but the seed
  is still refused: `a new evidence_sources row must start as draft or in_review`,
  because the guard keys on **`session_user`**, not `current_user`. The design holds
  under a role swap — this is the intended behaviour, not a bug.
- **Working route, verified:** temporarily make the role login-capable, connect as
  `evidence_importer.<ref>`, set the flag in that session. It imported the
  catalogue exactly.

**Verdict: resolved.** The §6 question is answered (hosted `postgres` is not a
superuser) and a working import route exists. The seed documentation's "paste it in
the SQL editor" route is impossible on hosted and has been corrected.

Observation limit: the dashboard SQL editor's own session was not observed from the
CLI. The runbook includes a one-line query for whoever opens the editor; on the
current platform it will report `postgres`, i.e. not superuser.

---

## 3. U2 — PostgREST surface

Exposed settings found in `pg_db_role_setting`:

```
postgres        => search_path="$user", public, extensions
supabase_admin  => search_path="$user", public, auth, extensions
```

No `pg_catalog` anywhere; no `pgrst.db_schemas` override on this project.

| Request (anon key)                                         | Response                                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `GET /rest/v1/pg_proc?select=proname&limit=1`              | **404** `PGRST205` "Could not find the table 'public.pg_proc' in the schema cache" |
| `GET /rest/v1/evidence_editors?select=user_id&limit=1`     | **401** `42501`                                                                    |
| `GET /rest/v1/evidence_sources?select=id&limit=1`          | **401** `42501`                                                                    |
| `GET /rest/v1/evidence_lifecycle_events?select=id&limit=1` | **401** `42501`                                                                    |

**Verdict: pass.** `pg_catalog` is unreachable through the API and none of the
Vitalis tables leaks anonymously. Note: `PGRST205` ("not in the schema cache")
rather than `PGRST106` ("schema not exposed") is what this stack returns — both mean
the request never reaches a relation, but the checklist now accepts either.

The `401` bodies include a generic PostgREST hint ("Grant the required privileges to
the current role with: GRANT SELECT … TO anon"). It is PostgREST's boilerplate, not a
project recommendation; do not act on it.

---

## 4. U4 — pooled connections

Two separate round trips on one connection, per mode:

```
session mode      : first=on second=on role=postgres
transaction mode  : first=on second=on role=postgres
```

Then the leak test — set the flag on one connection, read it from a **fresh** one:

```
$ psql "$TRANSACTION_URL" -c "set bloom.evidence_import='on'"
$ psql "$TRANSACTION_URL" -tAc "select coalesce(current_setting('bloom.evidence_import',true),'<unset>')"
on
```

**Verdict: pass on the acceptance question, with a finding.** The import flag is a
session property that this pooler does **not** reset between clients. That is safer
than the reverse assumption in one respect — it shows why the flag alone must never
authorise anything, which the `session_user` check already guarantees — but it means:

- an import session must set the flag itself and must not inherit it;
- `bloom.evidence_reason` can be inherited the same way, so an editor's audit reason
  could theoretically come from another session's setting;
- application code must not treat either setting as evidence of anything beyond the
  current session.

`set session authorization evidence_importer` fails with `42501` in both modes, so
the pooler is not the obstacle there — the missing superuser is.

---

## 5. U6 — rolling back the importer role

```sql
begin; create role evidence_rollback_probe nologin; rollback;
select count(*) from pg_roles where rolname = 'evidence_rollback_probe';
-- 0
```

**Correction to the local reading:** `CREATE ROLE` _is_ transactional in PostgreSQL.
A failed migration transaction leaves no role behind. What is cluster-wide is the
role's _scope_: it is shared across every database in the instance, so a role
survives dropping the database, not a rollback.

Teardown, as a non-superuser (the hosted reality):

```sql
grant evidence_importer to current_user;      -- required: DROP OWNED needs membership
reassign owned by evidence_importer to current_user;
drop owned by evidence_importer;
revoke all on schema public from evidence_importer;
revoke evidence_importer from current_user;
drop role evidence_importer;
```

Result: `DROP OWNED`, `REVOKE`, `DROP ROLE`; `roles left 0`, `dependent entries left 0`.
Re-applying `20261110_vitalis_evidence_lifecycle.sql` recreated the role
(`login=false super=false`) — the forward path is repeatable after rollback.

**Verdict: pass.** Two operational details worth keeping: the membership grant is
required before `DROP OWNED` (otherwise `42501 permission denied to drop objects`),
and the membership must be revoked before `DROP ROLE`.

---

## 6. Catalogue parity on hosted

Applied as a real `evidence_importer` session on the pooler (session mode):

```
imported_as = evidence_importer
sources 6, claims 4, citations 3, recommendations 2, links 2, revisions 4, events 3
```

Exactly the local seed result, i.e. the import path works end to end on hosted
Supabase once the identity is right. The v2 row kept its version-2 narrative
(`dga-2020-2025`), so A2's commit-time rule held through the import.

---

## 7. What this pass does not prove

- The dashboard **SQL editor's** session was not observed from the CLI; the runbook
  includes the one-line query for a human to paste.
- The `supabase_admin` path (the only superuser) was not exercised: its password was
  not available, and it is not needed once the login-role route is used.
- `db push` **from empty** does not work, for a reason unrelated to P2.2 (§1.1). The
  Vitalis set is proven against a realistic app baseline, not against an empty project.
- Only one region (Tokyo) and one pooler generation were tested. The leak in §4 should
  be re-measured on the region that actually serves production.
- Nothing here tests application code paths; it tests the database boundary the
  application depends on.

## 8. Status

U1, U2, U4 and U6 are answered. P2.2 remains **acceptance-pending**:

1. ~~the from-empty `db push` ordering defect needs its own reviewed change~~ —
   resolved and verified in §9.1;
2. the import procedure change (§2) must be reviewed with the seed documentation;
3. the dashboard-editor line in §7 should be recorded from a real editor session.

## 9. Follow-up verification: renames and hardened importer

Run on 6 November 2026 against disposable projects `bloom-p22-verify5`, `-6` and `-7`
in `ap-northeast-1`. Every project was deleted after use; `bloom-app`
(`zsqsfxmjphctknnumgsi`) was not touched, and no migration history was patched by hand.

### 9.1 Provisioning from empty now passes

`supabase db push` on an empty project: exit 0, 25 migrations, latest `20261112`,
13 `health_*`/`evidence_*` tables, 11 triggers, 37 policies. The `42P01` failure in
§1.1 no longer reproduces; see `docs/vitalis-migration-dependency-analysis.md` §8.

### 9.2 Re-applying the renamed files to an existing schema

Both files applied with `psql -f` against an already-migrated project: exit 0, no
`ERROR` lines, counts unchanged (45 tables, 25 recorded versions, catalogue 6 rows).

### 9.3 Catalogue importer

`node scripts/vitalis-import-catalogue.mjs --project-ref <ref> --confirm-target <ref>
--pooler-host aws-0-ap-northeast-1.pooler.supabase.com`

| Check                       | Result                                                       |
| --------------------------- | ------------------------------------------------------------ |
| exit status                 | 0                                                            |
| counts                      | 6 / 4 / 3 / 2 / 2 / 4 / 3                                    |
| role state                  | `evidence_importer`: `rolcanlogin = false`, password cleared |
| memberships                 | `postgres` only, `grantor = supabase_admin`                  |
| `--confirm-target` mismatch | exit 2                                                       |
| `:6543` in `--pooler-host`  | exit 2                                                       |

### 9.4 Two platform behaviours that shaped the assertions

1. **PG16 creator membership.** Creating a role grants the creating role membership of
   it, and hosted Supabase records the grantor as `supabase_admin`, so
   `revoke evidence_importer from postgres` from the `postgres` session leaves the row
   in place (measured; only the platform's owning role can remove it). It is not an
   escalation — the importer is `NOLOGIN` and the guard additionally requires the
   session GUC — so the script measures it: any member other than `postgres` fails.
2. **Session-pooler backend reuse.** For a short moment after the import connection
   closes, the session pooler can hand a new client the backend the import left open.
   PostgreSQL does not re-check `rolcanlogin` on an open backend, so a naive probe
   reports a dormant role as login-capable. The probe now compares `backend_start`
   with the cleanup time and reports such a connection as informational; a genuinely
   new login still fails. A second import seconds later is refused at authentication
   (`28P01`, the pooler's credential cache) — fail-closed, which is why the procedure
   is one import per project.

### 9.5 Regression

`npm run test` 1,181 passed / 0 failed (107 files); `npx tsc --noEmit` and
`npm run build` exit 0.

---

## 10. Dashboard session, TLS and repeat import (9 November 2026)

### 10.1 The dashboard SQL editor, observed

The session that section 7 said had not been observed was finally observed on
production `bloom-app` (`zsqsfxmjphctknnumgsi`), signed in as the project owner
(`maelix67@gmail.com`) at the Supabase dashboard, SQL editor, read-only.

```sql
select current_user as current_user, session_user as session_user,
       (select rolsuper from pg_roles where rolname = current_user) as is_superuser,
       (select rolbypassrls from pg_roles where rolname = current_user) as bypass_rls,
       inet_server_port() as server_port,
       current_setting('port') as guc_port,
       (select count(*) from pg_roles where rolname = 'evidence_importer') as importer_roles,
       (select count(*) from pg_policies where schemaname = 'public'
          and tablename like 'evidence%') as evidence_policies,
       (select count(*) from supabase_migrations.schema_migrations) as migration_versions;
```

One row:

```
current_user        postgres
session_user        postgres
is_superuser        false
bypass_rls          true
server_port         5432
guc_port            5432
importer_roles      0
evidence_policies   0
migration_versions  18
```

This is the missing measurement for §2: the dashboard session is `postgres`, not a
superuser, exactly as the CLI-side probes predicted. It also confirms the seed
cannot be pasted there (the guard needs `session_user = evidence_importer`), which
is what `docs/vitalis-evidence-seed.md` now says.

`evidence_importer` does not exist and there are no `evidence_*` policies on
production, so none of the P2.2 evidence migrations has been applied there, and
the importer has never run against it. The migration list was captured partially
(the results grid virtualises rows); the count, 18, is from the query above and
matches the production schema as deployed in August and September 2026.

### 10.2 Verification is on by default, and the pooler fails it

`aws-0-ap-northeast-1.pooler.supabase.com` presents a chain that ends in a
self-signed root:

```
*.pooler.supabase.com  <- Supabase Intermediate 2021 CA
Supabase Intermediate 2021 CA <- Supabase Root 2021 CA
Supabase Root 2021 CA  <- Supabase Root 2021 CA   (self-signed)
```

Node's default trust store rejects it, so the importer's default configuration
(`rejectUnauthorized: true`) refuses before any credential exists:

```
import failed: the pooler's certificate chain is not trusted by this host (Supabase
signs it with its own CA). Download the project's SSL certificate from the dashboard
(Project Settings -> Database -> SSL) and pass --ca <path>, or accept the recorded
risk with --insecure-tls.
exit=1
```

### 10.3 Not verified in this pass

- **`--ca` pinning.** Two disposable projects (`bloom-p22-verify8`, `-9`) became
  unreachable at the pooler (`ECONNRESET`, then `server closed the connection` on
  the owner connection) before the import ran. Both were deleted; `bloom-app` was
  untouched. The trust-anchor path is implemented and unexercised against hosted.
- **Repeat import.** The `28P01` pooler-cache refusal recorded in §9.4 remains the
  measurement; it was not re-run on a fresh project in this pass. The script now
  reports that code as a cache problem with its remedy instead of as a wrong
  password.

Nothing in this section changes the P2.2 verdict; it records what was measured and
what was not.
