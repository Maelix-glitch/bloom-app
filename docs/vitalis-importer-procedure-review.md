# Importer procedure review and remaining SQL-editor verification

Status: **F1–F7 addressed** in `scripts/vitalis-import-catalogue.mjs`; verification
results are recorded in `docs/vitalis-p2.2-hosted-verification-evidence.md` §9. No procedure has been changed beyond the
documentation correction already recorded in `docs/vitalis-evidence-seed.md`;
no project was touched for this review.

Background: `docs/vitalis-p2.2-hosted-verification-evidence.md` and
`docs/vitalis-p2.2-hosted-verification-checklist.md`.

## 1. What the hosted run established

- Hosted `postgres` is **not** a superuser (`rolsuper = false`, `rolcreaterole =
true`, `rolbypassrls = true`). `supabase_admin` is the superuser.
- `set session authorization evidence_importer` → `42501` on hosted. The mechanism
  the local harness uses is unavailable there.
- `set role evidence_importer` succeeds after a membership grant, but the guard
  still refuses the seed: `a new evidence_sources row must start as draft or in
review`, because `evidence_is_import_session()` keys on **`session_user`**.
- A real `evidence_importer` login session imports the catalogue correctly:
  `6 sources / 4 claims / 3 citations / 2 recommendations / 2 links / 4 revisions /
3 events`.
- On this pooler, `bloom.evidence_import` is **not** reset between pooled clients:
  a fresh transaction-mode connection read `on` after another client set it.

## 2. Review of the corrected procedure (Route A1)

The corrected route is right in substance: a temporary login role is the only
non-superuser way to satisfy `session_user = 'evidence_importer'`. It needs six
hardening changes before it should be called production-grade.

| #   | Finding                                                     | Why it matters                                                                                                                     | Proposed change                                                                                                  |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| F1  | Reverting the login is step 3, executed only on success     | A failed seed leaves `evidence_importer` login-capable with a known password, possibly for days                                    | Run the revert in a `finally`/`trap`, unconditionally                                                            |
| F2  | The temporary password is never cleared                     | `nologin` blocks login but leaves the hash                                                                                         | After import, `alter role evidence_importer password null` (then `nologin`)                                      |
| F3  | Password passed as a SQL literal on the command line        | Visible in shell history and process listings; may reach logs                                                                      | Set via a quoted `psql -v` variable or a generated secret file the shell reads; keep `PGPASSWORD` for the client |
| F4  | Session vs transaction port is prose, not enforcement       | The 6543 port leaks session GUCs (measured), so an import there can inherit or leave `bloom.evidence_*`                            | Script refuses a URL on port 6543, and asserts `current_setting('port')`/connection port before running          |
| F5  | Membership leftovers from the U6 experiment are not cleaned | `grant evidence_importer to postgres` is needed for teardown; if left, a future superuser-ish role can adopt the importer          | Teardown revokes membership; the script then fails on any member other than `postgres` (see below)               |
| F6  | Success is judged by eyeballing counts                      | Counts are the real invariant; a partial import that is later "fixed" is worse than a failed one                                   | Assert the six expected counts and `rolcanlogin = false` before exiting 0                                        |
| F7  | Route A2 (`supabase_admin`) is presented as a peer option   | It requires the platform's superuser password; the project's key policy does not sanction holding one, and it bypasses every guard | Demote to "not supported; use only if the platform operator supplies it", or drop it                             |

Not findings, worth keeping: `--single-transaction` (a partial import leaves draft
rows), `set local` for both GUCs (transaction-scoped, matching the single
transaction), and the explicit statement that a refused seed is the file doing its
job rather than something to work around.

## 3. Proposed replacement: one reviewed script (not implemented)

`scripts/vitalis-import-catalogue.mjs`, shaped like `vitalis-evidence-seed.mjs`
(text-only, no connection) but for applying:

```text
node scripts/vitalis-import-catalogue.mjs \
  --project-ref <ref> --pooler-host <host> [--confirm-target <ref>]
```

Contract, for review:

1. Refuses without `--confirm-target`, whose value must equal `--project-ref` — the
   same guard style as the verification script.
2. Refuses a port other than 5432, and a host that is not the pooler or `db.<ref>`.
3. Generates a random password in memory, never prints it, and never writes it to
   disk.
4. `alter role evidence_importer login password` → connect as
   `evidence_importer.<ref>` → one transaction: `set local bloom.evidence_import`,
   `set local bloom.evidence_reason`, seed file → `commit`.
5. `finally`: `alter role evidence_importer nologin`, `password null`, and a query
   confirming `rolcanlogin = false`.
6. Asserts the counts, then exits 0 printing only the counts and the role state.
7. On any error, prints the failing statement class and exits non-zero — without
   the password.

This is a behaviour-neutral wrapper around a file that already exists, so it is
independently reviewable and testable against a disposable project.

## 4. The remaining SQL-editor verification

What the CLI could not observe: the identity of the dashboard SQL editor's session.
It is read-only, needs no credentials, and takes one paste. Run it in the
**disposable** project after `db push`, or on any project during a maintenance
window — every query below is a read.

```sql
-- 1. who is the editor, and can it adopt an identity?
select current_user,
       session_user,
       (select rolsuper from pg_roles where rolname = session_user) as is_superuser,
       (select rolcreaterole from pg_roles where rolname = session_user) as can_create_role,
       current_setting('server_version') as server_version;

-- 2. the importer role must be dormant
select rolname, rolcanlogin, rolsuper
  from pg_roles
 where rolname in ('evidence_importer', 'postgres', 'supabase_admin')
 order by rolname;

-- 3. what history does this project actually carry? (decides the rename question)
select count(*) as recorded, max(version) as latest
  from supabase_migrations.schema_migrations;

-- 4. who may assume the importer?
select r.rolname as member_of_evidence_importer
  from pg_auth_members m
  join pg_roles r on r.oid = m.member
  join pg_roles g on g.oid = m.roleid
 where g.rolname = 'evidence_importer';
```

Expected on a correct, post-import project:

| #   | Expected                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | `postgres \| postgres \| false \| true \| <version>` — the editor cannot run the import, and cannot adopt an identity |
| 2   | `evidence_importer \| false \| false`, `postgres \| false \| false`, `supabase_admin \| false \| true`                |
| 3   | `25 \| 20261112` on a project pushed from this repo; anything else is data for §5 of the dependency analysis          |
| 4   | zero rows                                                                                                             |

Anything different is a finding: `is_superuser = true` in query 1 means the editor
_can_ import and F7's route A2 is available on that project; rows in query 4 mean an
import left a membership behind (F5); `rolcanlogin = true` in query 2 means a failed
import never reverted (F1).

Record the four result rows, with date, project ref and operator, at the end of
`docs/vitalis-p2.2-hosted-verification-evidence.md`. Do **not** paste the seed into
the editor: it connects as `postgres`, and the guard will refuse it — correctly.

## 5. Sequencing

1. Review the dependency analysis and approve or amend the two renames.
2. Review F1–F7 and the proposed import script.
3. Only then: apply renames, implement the script, re-run the disposable
   verification, capture the SQL-editor rows.

P2.2 remains **acceptance-pending** until 1–3 are done and the from-empty push is
green on a disposable project.

## Measured during implementation (6 November 2026)

Two hosted behaviours changed the shape of the assertions; both were observed, not
assumed.

- **F5, corrected.** PostgreSQL 16 grants the creating role membership of the role it
  created, and hosted Supabase records that grant with `grantor = supabase_admin`.
  `revoke evidence_importer from postgres` from the `postgres` session therefore does
  not remove the row. The risk F5 describes — a privileged role that can adopt the
  importer — is unchanged by the row itself, because the role is `NOLOGIN` and the
  seed guard also requires `bloom.evidence_import` on the session. The script now
  keeps the row visible, reports who holds it, and fails on any member _other_ than
  the migration executor.
- **F4, bounded.** The dormancy probe traverses the session pooler, which can hand a
  new client the backend the import itself just released; PostgreSQL does not
  re-check `rolcanlogin` on an open backend, so a naive probe can report a dormant
  role as login-capable. The probe compares `backend_start` against the cleanup time
  and only fails on a backend created afterwards. A re-run seconds later is refused
  at authentication (`28P01`, pooler credential cache) — fail-closed.
