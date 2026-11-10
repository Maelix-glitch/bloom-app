# Vitalis P2.2 — hosted Supabase verification checklist (U1, U2, U4, U6)

Executable version of §6 in `docs/vitalis-p2.2-acceptance-verification.md`. Run it
against a **disposable** Supabase project. Every step states what to run, what a
pass looks like, and what to do when it is not.

Results from the first run of this checklist (6 November 2026) are in
`docs/vitalis-p2.2-hosted-verification-evidence.md`.

> **P2.2 stays acceptance-pending.** The four uncertainties are resolved, but the
> run uncovered two defects outside the migration logic — a from-empty `db push`
> that cannot succeed, and an import procedure that cannot run on hosted Supabase
> as written. Both are recorded below with the corrected procedure.

---

## 0. Safety gates

- [ ] The project is disposable. Never run this against `bloom-app`
      (`zsqsfxmjphctknnumgsi`) or any project holding real data: step 8 drops a
      role, and step 9 deletes the project.
- [ ] `supabase projects list` shows the disposable ref, and the org is the one
      you intend (`amujzdfhyayiesdmlvkk` at the time of writing).
- [ ] No credential is pasted into chat, a commit, a screenshot or this repository.
      The database password and anon key live in your shell environment only.
- [ ] You have the project's database password. The CLI stores auth separately;
      the password is needed for `psql` and `db push`.

Export once, in the shell you will use throughout:

```bash
export PROJECT_REF=<disposable-ref>
export DB_PASSWORD=<database-password>          # never echoed
export POOLER_HOST=aws-0-ap-northeast-1.pooler.supabase.com   # see step 1
export OWNER_URL="postgresql://postgres.$PROJECT_REF@$POOLER_HOST:5432/postgres?sslmode=require"
export PGPASSWORD="$DB_PASSWORD"
```

---

## 1. Create the disposable project

```bash
supabase projects create bloom-p22-verify \
  --org-id "$ORG_ID" --region ap-northeast-1 --db-password "$DB_PASSWORD"
```

Record the ref. Then find a host that answers:

```bash
for H in "db.$PROJECT_REF.supabase.co" "aws-0-ap-northeast-1.pooler.supabase.com" "aws-1-ap-northeast-1.pooler.supabase.com"; do
  psql "postgresql://postgres.$PROJECT_REF@$H:5432/postgres?sslmode=require" -tAc "select current_user" && echo "OK $H" && break
done
```

**Pass:** one host accepts `postgres.<ref>`. **Expected on current Supabase:** the
pooler answers; `db.<ref>.supabase.co` resolves only on networks with IPv6 DNS
(it failed with `could not translate host name` here). Session mode is 5432,
transaction mode 6543, same host and user.

**If no host answers:** the project is still provisioning (2–4 minutes) or the
password is wrong. `FATAL: password authentication failed` means the latter.

---

## 2. Apply the schema from empty

```bash
supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"
printf 'y
' | supabase db push --password "$DB_PASSWORD"
```

**Pass:** every migration applies, the last one is
`20261112_vitalis_evidence_revision_coverage.sql`, and nothing reports
`42P01`. This is the provisioning test the repository failed before 6 November
2026; it now succeeds because `20260825_core_tables.sql` runs before the files
that extend it.

**History of the defect, for context:** until the renames,
`20260828_profile_identity_stories.sql` altered `public.profiles` before
`20260909_core_tables.sql` created it, and the push stopped with
`ERROR: relation "public.profiles" does not exist (SQLSTATE 42P01)`, recording one
version and three tables. Four forward references existed in total; all are gone.
If this error ever returns, the ordering regressed — run the dependency analysis,
do not paper over it with a manual apply.

**Failure condition:** any `42P01` (ordering regression), `42710 … already exists`
(idempotency regression), or `23514` at push time (the revision-coverage trigger
rejecting the baseline).

## 3. Only if the project already has a schema, or push fails on ordering

A from-empty push needs no baseline step any more. The fallback exists for a
database that was provisioned by hand before the renames:

```bash
node scripts/vitalis-hosted-verify-baseline.mjs "$POOLER_HOST" "postgres.$PROJECT_REF"
```

**Pass:** `applied in fixpoint order: 19/19`. The fixpoint is a repair tool, not
the normal path, and running it means something above is wrong.

## 4. Record the baseline, then push the Vitalis set

```bash
# 8-digit prefixes are rejected by `migration repair` ("invalid version number");
# record only the 14-digit versions, or expect the repair to abort on the first
# 2026MMDD file. The Vitalis files are 8-digit too, so do NOT rely on repair to
# make push skip them — verify what push intends to apply before answering y.
printf 'y\n' | supabase db push --password "$DB_PASSWORD"
```

**Expected:** `Applying migration 20261104…` through `20261112…`, exit 0, then

```sql
select count(*) as recorded, max(version) from supabase_migrations.schema_migrations;
-- 25 | 20261112
```

**Pass criteria — Vitalis objects only (name filter `health_%` / `evidence_%`):**

| Object    | Expected |
| --------- | -------- |
| tables    | 13       |
| triggers  | 11       |
| policies  | 37       |
| functions | 23       |

These match the local harness exactly (13 / 11 / 37, functions 23 under this filter
because `erase_my_data()` is not named `evidence_*`).

**Failure condition:** any Vitalis migration error. A `42710 … already exists` means
the idempotency fix (A3) regressed; a `23514` at push time means the revision-coverage
trigger (A2) rejects the baseline, which would be a genuine finding.

---

## 5. Load the catalogue as the importer

The seed is not anonymous. `evidence_is_import_session()` requires
`session_user = 'evidence_importer'` **and** `bloom.evidence_import = 'on'`, and the
seed sets neither. Pasting it into the dashboard SQL editor therefore fails at the
first reviewed row:

```
ERROR: a new evidence_sources row must start as draft or in_review
```

Hosted `postgres` is **not** a superuser, so `set session authorization
evidence_importer` fails with `42501`. Use a short-lived login role:

```bash
# 1. temporary credential
psql "$OWNER_URL" -c "alter role evidence_importer login password '$IMPORT_PASSWORD'"

# 2. import as that role, session mode only
PGPASSWORD="$IMPORT_PASSWORD" psql "postgresql://evidence_importer.$PROJECT_REF@$POOLER_HOST:5432/postgres?sslmode=require" -v ON_ERROR_STOP=1 --single-transaction -c "set local bloom.evidence_import = 'on'" -c "set local bloom.evidence_reason = 'catalogue seed'" -f supabase/seeds/20261107_vitalis_evidence_catalog.sql

# 3. take the login back immediately
psql "$OWNER_URL" -c "alter role evidence_importer nologin"
```

**Pass:** the session reports `session_user = evidence_importer`, and the counts match
the catalogue exactly:

```
sources 6, claims 4, citations 3, recommendations 2, links 2, revisions 4, events 3
```

**Failure conditions:** `42501` on the import means the flag or the identity is
missing; a `seed refused:` message is the file doing its job (do not work around it);
counts above the catalogue mean the database diverged.

**Rollback:** `alter role evidence_importer nologin` (always), and rotate the
password if it was ever exposed. The role itself is dropped with the project.

---

## 6. Run the probe suite

```bash
export SUPABASE_ANON_KEY=<anon-key>    # dashboard → Project Settings → API
node scripts/vitalis-hosted-verify.mjs \
  --confirm-disposable --project-ref "$PROJECT_REF" --rollback
```

`--rollback` runs the U6 teardown experiment; omit it for a read-only pass. The
script refuses to run without `--confirm-disposable`, validates the ref shape, never
reads `supabase/config.toml`, and writes `verify-out/vitalis-hosted-<stamp>.{json,md}`.

**Pass:** `11 passed, 0 failed, 5 informational`, exit 0.

### The probes, their expectations and their failure conditions

| Probe                    | Expected                                                                                                            | Failure means                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| U1.1 identity            | `current_user = postgres`, `rolcreaterole = true`, `rolsuper = false` (on hosted; `supabase_admin` holds superuser) | a role other than `postgres` is what `db push` and `psql` execute as — re-derive every privilege assumption before continuing |
| U1.2 importer identity   | `set session authorization evidence_importer` → `42501`                                                             | accepted means you are on a superuser connection: fine locally, but do not conclude the hosted runbook can do this            |
| U1.3 registry predicate  | `evidence_is_import_session()` returns `false` without the flag, and does not error                                 | an error means `current_setting(..., true)`/`auth.uid()` semantics differ on this platform                                    |
| U2.1 exposed settings    | no `pg_catalog` in any `pgrst.*` / `search_path` setting                                                            | `pg_catalog` exposed is a platform misconfiguration; remove it in API settings                                                |
| U2.2 `pg_proc` over REST | `404` with `PGRST106`/`PGRST205`                                                                                    | `200` with rows = catalogue exposure                                                                                          |
| U2.3 `evidence_editors`  | `401`/`403`, or `200` with `[]`                                                                                     | any row returned is a membership leak                                                                                         |
| U2.4 `evidence_sources`  | `401`/`403`, or `200` with `[]`                                                                                     | rows returned anonymously = the RLS read policy is not holding                                                                |
| U4.1 GUC round trip      | informational: reports whether `bloom.evidence_import` survives on 5432 and 6543                                    | —                                                                                                                             |
| U4.2 stability           | informational; see the leak note below                                                                              | —                                                                                                                             |
| U4.3 identity switch     | `42501` on hosted (no superuser)                                                                                    | a pass means the connection is superuser; the import path must still not depend on it                                         |
| U6.1 role shape          | one row, `rolcanlogin = false`, zero owned objects                                                                  | a login role or owned objects left behind widens the boundary                                                                 |
| U6.2 transactional DDL   | `CREATE ROLE` inside a transaction, then `ROLLBACK` → 0 survivors                                                   | survivors mean rollback leaves a cluster-wide role behind                                                                     |
| U6.3 clean teardown      | 0 roles, 0 `pg_shdepend` entries                                                                                    | `2BP01` = a dependency remains; `42501` = you lack membership, `grant evidence_importer to current_user` first                |
| U6.4 re-apply            | re-running `20261110` recreates the role                                                                            | failure means rollback is one-way                                                                                             |

### Two manual checks the script cannot make

1. **Dashboard SQL editor identity.** The script observes the `postgres` _role_, not
   the editor's UI session. Paste this into the editor and record the row:

   ```sql
   select current_user, session_user,
          (select rolsuper from pg_roles where rolname = session_user) as is_super;
   ```

   **Pass:** `postgres | postgres | false` — the editor cannot run the import
   procedure. If it shows `supabase_admin` or `is_super = true`, that project's
   editor _can_, and Route A2 in `docs/vitalis-evidence-seed.md` is available to it.

2. **Pooled-connection leak.** Set the flag on one connection, then read it from a
   fresh one:

   ```bash
   psql "$TRANSACTION_URL" -c "set bloom.evidence_import='on'"
   psql "$TRANSACTION_URL" -tAc "select coalesce(current_setting('bloom.evidence_import',true),'<unset>')"
   ```

   **Observed:** `on`. The flag is not reset between pooled clients. It does not
   authorise anything — the predicate also requires `session_user` — but it means
   a session must never _inherit_ the flag, and `bloom.evidence_reason` can be
   inherited just as easily. Treat both as per-session values that must be set
   explicitly, and never read them as proof of anything but the current session.

---

## 7. Decide

| Item | Pass looks like                                                         | Verdict on 2026-11-06                                                                                                         |
| ---- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| U1   | §6 question answered; import procedure exists for the real role         | **Resolved, with a required doc change** — hosted `postgres` is not superuser; the seed doc's SQL-editor route was impossible |
| U2   | only `public` exposed; `pg_catalog` unreachable; evidence tables closed | **Pass**                                                                                                                      |
| U4   | measured on 5432 and 6543; no reliance on pooled session state          | **Pass, with a leak finding** — the GUC is not reset between pooled clients                                                   |
| U6   | rollback drops the role cleanly; re-apply recreates it                  | **Pass, with a correction** — `CREATE ROLE` _is_ transactional                                                                |

P2.2 remains acceptance-pending until the from-empty `db push` ordering defect (step 2) is scheduled as its own change and the import doc correction is reviewed.

---

## 8. Rollback of the experiment

```bash
# 1. remove the disposable project (this drops its database, roles and keys)
supabase projects delete "$PROJECT_REF"

# 2. unlink the workspace so no later command aims at it
rm -rf supabase/.temp
git checkout -- supabase/config.toml   # only if `link` changed project_id

# 3. destroy local evidence and scratch state
rm -rf verify-out verify /tmp/p22
```

If `projects delete` is unavailable or the project must be kept: make
`evidence_importer` nologin, `drop owned by evidence_importer`, revoke its schema
privileges, `drop role evidence_importer`, then re-run `20261110` to recreate the
role (verified in U6.4). Leaving the project published with a login-capable importer
is the one state that must not persist.

**Order matters:** deleting the project is the only step that removes the temporary
password. Do not skip it, and do not reuse that password anywhere.
