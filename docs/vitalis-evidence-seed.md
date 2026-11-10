# Applying the evidence catalogue seed

The evidence registry lives in PostgreSQL. It is authored in
`src/lib/vitalis/evidence/catalog.ts`, and reaches the database as generated SQL
that an operator applies deliberately.

This document covers the operational half: how the file is produced, how it is
applied, and what access it needs. The design rationale is in
[`vitalis-evidence-methodology.md`](./vitalis-evidence-methodology.md), section 9.
The security properties and residual risks of the application procedure are
reviewed in [`vitalis-import-security-review.md`](./vitalis-import-security-review.md).

---

## 1. The file

|                 |                                                        |
| --------------- | ------------------------------------------------------ |
| Generated file  | `supabase/seeds/20261107_vitalis_evidence_catalog.sql` |
| Source of truth | `src/lib/vitalis/evidence/catalog.ts`                  |
| Generator       | `scripts/vitalis-evidence-seed.mjs`                    |
| Fingerprint     | `catalogue hash` line in the file header (SHA-256)     |

The file is committed on purpose. It is the exact change that will be applied to
a database, so it is reviewed as a diff, the same as a migration.

**Never edit the generated file.** An edit is overwritten on the next run, and
until then it makes the file disagree with the catalogue it claims to represent.
Edit the catalogue and regenerate.

```bash
npm run seed:evidence          # regenerate after a catalogue change
npm run seed:evidence:check    # exit 1 if the committed file is stale
```

`seed:evidence:check` is safe to run in CI. It needs no database and no
credentials — it re-generates the SQL in memory and compares it with the
committed file, ignoring line-ending differences.

---

## 2. What the file does

Principally, an upsert of the six evidence tables keyed on stable ids.

- Sources, claims, citations, recommendations and recommendation links are
  inserted or updated.
- Claims land as `draft`, receive their citations, and are then moved to their
  recorded status. This order is required by the licence gate, which is a trigger
  on `evidence_claims` that fires on `INSERT` as well as `UPDATE`. A claim
  inserted as `approved` would be refused for having no supporting citation yet.
- Revision history is written with `insert … where not exists`, so re-running
  adds nothing.
- **Nothing is ever deleted.** Not a source, a claim, a citation, a
  recommendation link or a revision. The file contains no `delete`, no
  `truncate`, no `drop` and no `cascade`.
- No health, authentication, profile or other Bloom table is read or written.

### It reconciles instead of pruning

Before it writes anything, the file compares the database with the catalogue. If
they disagree in a way that a rewrite would silently destroy, it raises with the
offending ids and the transaction is left exactly as it was found. It refuses
when:

- a source, claim or recommendation exists in the database but not in the
  catalogue;
- a citation or recommendation link exists in the database but not in the
  catalogue;
- a row's `version` in the database is newer than the catalogue's;
- the database records a supersession the catalogue would clear or re-point;
- a row the database has already reviewed would be returned to `draft`.

Each of those is a decision for a person. A seed that quietly deleted the
difference would turn a schema-drift accident, or a colleague's editorial edit,
into unrecoverable history loss.

### It is idempotent, and more than idempotent

Applying the file to a database that is already current changes nothing at all:
no insert, no update, not even a refreshed `updated_at`. Every conflict branch is
guarded, so a re-run cannot revert a newer version, clear a supersession or
un-approve a claim even if the guards in the reconciliation block were removed.

---

## 3. Who applies it, and with what access

The seed is **editorial content**, not user data. It is never applied:

- at application start-up,
- by a scheduled job,
- by any code path reachable by a signed-in person,
- through the anon or authenticated PostgREST roles.

Every evidence table grants `SELECT` only to `authenticated`; writes are
`service_role` and above. The seed is applied by an operator holding database
owner rights, from a trusted administrative session.

### Credential rules

These are not suggestions. They are the reason the generator is a text tool with
no connection code in it.

1. **No key is stored in this repository.** Not in the script, not in the
   generated SQL, not in the tests, not in `.env`, `.dev.vars` or any committed
   file.
2. **No key is pasted into chat, an issue, a commit message or a screenshot.**
3. **The browser never sees a service-role key.** It is a server credential; the
   anon key is the only key that belongs in a client bundle, and even that lives
   in Vite `VITE_` configuration rather than in source.
4. **The SQL editor is the right place for migrations, and the wrong place for
   this seed.** A Supabase SQL-editor session is authenticated by the operator's
   account and needs no key to be handled at all, which is why the project's
   migrations are applied there. The seed is the exception: the SQL editor
   connects as `postgres`, and the lifecycle guard requires a session whose
   `session_user` is `evidence_importer`. Pasting the file there is refused by
   design, not by an accident to work around. Use Route A below.
5. **Rotate rather than share.** If a key is ever exposed, rotate it in the
   Supabase dashboard. Do not "check whether it still works" first.

---

## 4. Applying it

### Prerequisite

`supabase/migrations/20261106_vitalis_evidence_foundation.sql` must already be
applied. The seed opens with a preflight check and stops before writing anything
if the evidence tables are absent, so a file pointed at the wrong database cannot
leave a partial catalogue behind.

### Route A — `scripts/vitalis-import-catalogue.mjs` (the supported route)

This script is the procedure. It performs the whole lifecycle in one command and
asserts the result instead of leaving an operator to eyeball it.

```bash
export SUPABASE_DB_PASSWORD=…   # the project's database password, never committed

node scripts/vitalis-import-catalogue.mjs \
  --project-ref <project-ref> \
  --confirm-target <project-ref> \
  --pooler-host aws-0-<region>.pooler.supabase.com \
  --ca <path to the project's SSL certificate>
```

It refuses to run unless all of the following hold, before it writes anything:

- `--confirm-target` equals `--project-ref` (a mistyped ref cannot target another
  project);
- the pooler host is the one named, and the port is 5432 — transaction-mode
  pooling (6543) is never used;
- `SUPABASE_DB_PASSWORD` is set;
- the seed file exists and carries the expected header.

Then it:

1. connects as `postgres.<ref>` and generates a 192-bit password in memory;
2. stores it with `alter role evidence_importer login password …`, clearing the
   role's previous password;
3. connects as `evidence_importer.<ref>`, asserts `session_user`, opens a single
   transaction, sets its GUCs transaction-locally and applies the seed;
4. asserts the seven catalogue counts before committing;
5. in a `finally` block — on success, failure or SIGINT — clears the credential
   (`nologin`, `password null`), resets the GUCs and asserts that the importer
   cannot log in, holds no GUC, and has no member other than the migration
   executor.

Exit codes: `0` applied and asserted; `1` import or assertion failed (cleanup was
attempted and reported); `2` refused before connecting.

**`--ca` is required against hosted Supabase.** Supabase signs the pooler chain
with its own CA (`Supabase Root 2021 CA`), so Node's default trust store rejects
it with `SELF_SIGNED_CERT_IN_CHAIN`. Download the project certificate from
Project Settings → Database → SSL configuration and pass it with `--ca`. Without
it the script fails closed with a message saying exactly that. `--insecure-tls`
exists as an explicit, recorded downgrade; it is meant for a local or throwaway
database, and using it for a real import should be justified in the change
record.

#### One import per project

Supavisor caches the role verifier. Immediately after a run, a second run can be
rejected with `28P01` even though the new password is correct, because the pooler
still holds the previous one; the cache expires in about a minute. The script
detects that code and says so instead of reporting a wrong password. Plan for one
import per project per session: if the catalogue must be re-applied, wait for the
cache to expire (or use a fresh project) and re-run. This is a property of the
pooler, not of the seed, and it is why the script is not designed to be looped.

#### What it deliberately does not do

- It does not survive the owner connection dying mid-run. If the process is
  killed while the transaction is open, the `finally` block cannot reach the
  owner, and the temporary login role stays login-capable until someone clears
  it. The window is closed by the runbook check in section 6.
- It does not rotate the role's password on a schedule, and it does not remove
  the `evidence_importer` role. Teardown restores _dormancy_: the role stays,
  owns the catalogue rows, and cannot log in.
- It does not make the seed safe to run against production data. The seed itself
  is what makes it non-destructive (section 2); the script only controls
  identity, transaction scope and credential lifetime.

### Manual equivalent, for review

The script exists so that this sequence is executable and checked. Reading it is
the way to audit the procedure; typing it by hand is the way to make a mistake.

```bash
# 1. a short-lived credential for the importer
psql "$OWNER_DATABASE_URL" -c "alter role evidence_importer login password '$IMPORT_PASSWORD'"

# 2. import as that role, session mode only (5432, never the 6543 pooler port)
PGPASSWORD="$IMPORT_PASSWORD" psql "postgresql://evidence_importer.$PROJECT_REF@$POOLER_HOST:5432/postgres?sslmode=verify-full&sslrootcert=$CA" \
  -v ON_ERROR_STOP=1 --single-transaction \
  -c "set local bloom.evidence_import = 'on'" \
  -c "set local bloom.evidence_reason = 'catalogue seed'" \
  -f supabase/seeds/20261107_vitalis_evidence_catalog.sql

# 3. take the login back: leaving it widens the boundary for no reason
psql "$OWNER_DATABASE_URL" -c "alter role evidence_importer nologin"
```

`--single-transaction` is not optional. Without it a failure part-way through
leaves claims staged as `draft`, which fails closed (nothing unusable becomes
visible) but is still a state somebody has to clean up.

### There is no `supabase_admin` route

An earlier draft suggested `set session authorization evidence_importer` from
`supabase_admin`. It is not a supported route and is not documented as one:
`set session authorization` needs superuser, hosted `postgres` is not a superuser
(`SET SESSION AUTHORIZATION` → `42501`, measured), and the `supabase_admin`
password is not part of any workflow this project supports. The importer role
with a temporary credential is the only route.

### If the database has diverged

A refused seed is not an obstacle to work around. It is the file doing its job.
It stops with a message naming the rows involved, for example:

```
seed refused: evidence_sources holds rows the catalogue does not describe: retired-by-hand
seed refused: citations exist that the catalogue does not describe: icmr-dgi-food-variety -> dga-2025-2030
seed refused: evidence_claims is newer in the database than in the catalogue: dga-whole-foods-emphasis (database v2, catalogue v1)
seed refused: evidence_sources has supersession history the catalogue would erase: usda-fooddata-central
```

Nothing was written. Each situation has one correct response, and none of them is
"delete the difference":

| Situation                                              | Correct response                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Row exists only in the database                        | Add it to `catalog.ts` if it belongs; otherwise retire it (section 7).               |
| Row exists only in the catalogue                       | The database is missing it. Nothing here deleted it — investigate before re-running. |
| Citation or link exists only in the database           | Record it in `catalog.ts`, or remove it deliberately after review.                   |
| Version is newer in the database                       | Roll the catalogue forward to that version. The seed will not revert it.             |
| Review status would go backwards                       | Demote with a reviewed statement. The seed only advances review state.               |
| A recorded supersession would be cleared or re-pointed | Re-point or retire with a reviewed statement. The seed never clears history.         |

---

## 5. Verifying an application

Run these after applying. They are the same checks the integration suite makes,
expressed so a person can run them without a test harness.

```sql
-- Row counts must match the header line of the seed file.
select
  (select count(*) from public.evidence_sources)               as sources,
  (select count(*) from public.evidence_claims)                as claims,
  (select count(*) from public.evidence_claim_sources)         as citations,
  (select count(*) from public.evidence_recommendations)       as recommendations,
  (select count(*) from public.evidence_recommendation_claims) as links,
  (select count(*) from public.evidence_revisions)             as revisions,
  (select count(*) from public.evidence_lifecycle_events)      as events;
```

```sql
-- No approved claim may rest on a source we are not licensed to ship.
-- This must return zero rows.
select c.id, s.id as source_id
  from public.evidence_claims c
  join public.evidence_claim_sources l on l.claim_id = c.id
  join public.evidence_sources s       on s.id = l.source_id
 where c.review_status = 'approved'
   and (s.review_status <> 'approved' or not s.product_use_allowed);
```

```sql
-- History must be one row per (entity, version) — a re-run must not duplicate it.
select entity_type, entity_id, version, count(*)
  from public.evidence_revisions
 group by 1, 2, 3
having count(*) > 1;
```

```sql
-- The current citation and recommendation-link pairs, for comparison with the
-- seed's own sections. Pair-level drift cannot be expressed in SQL without the
-- catalogue, so the authoritative check is the seed itself: re-running it raises
-- with the offending ids and writes nothing (section 4). This query is the
-- readable listing that makes the comparison possible by hand.
select 'citation' as kind, claim_id || ' -> ' || source_id as detail
  from public.evidence_claim_sources
union all
select 'recommendation link', recommendation_id || ' -> ' || claim_id
  from public.evidence_recommendation_claims
order by 1, 2;
```

The licence query and the duplicate-history query must return no rows.

---

## 6. Failure modes

| Symptom                                                                | Meaning                                                                                   | Action                                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `evidence tables are missing`                                          | The Phase 2 migration has not been applied, or the seed is pointed at the wrong database. | Apply `20261106_vitalis_evidence_foundation.sql` first. Nothing was written.                          |
| `the pooler's certificate chain is not trusted by this host`           | No `--ca` was supplied, so the Supabase root is unknown to Node.                          | Download the project certificate and pass `--ca`. Do not reach for `--insecure-tls` on a real import. |
| `the pooler rejected the temporary credential (28P01)`                 | Supavisor still holds the previous verifier, usually after a run in the last minute.      | Wait about a minute and re-run, or use a fresh project. The password is not wrong.                    |
| `could not revert the importer role`                                   | The owner connection was already gone when cleanup ran.                                   | Run the check below and clear the role by hand.                                                       |
| `seed refused: … holds rows the catalogue does not describe`           | Someone added a row outside this process.                                                 | Decide: add it to `catalog.ts`, or retire it. Nothing was written, and nothing was deleted.           |
| `seed refused: … exist that the catalogue does not describe`           | A citation or recommendation link was added outside this process.                         | Record it in `catalog.ts`, or remove it after review. Nothing was written.                            |
| `seed refused: … is newer in the database than in the catalogue`       | The database has moved past the catalogue.                                                | Roll the catalogue forward. The seed will not revert a newer row.                                     |
| `seed refused: … has supersession history the catalogue would erase`   | A replacement recorded in the database is absent from the catalogue.                      | Re-point or retire with a reviewed statement. History is never cleared by a seed.                     |
| `seed refused: … would return it to draft`                             | The catalogue demotes a row the database has already reviewed.                            | Demote deliberately with a reviewed statement.                                                        |
| `claim … cannot be approved: source … is not approved for product use` | The catalogue itself asks to approve a claim resting on a restricted source.              | Fix the catalogue: the licensing findings say that source may not ship. Do not weaken the trigger.    |
| `claim … cannot be approved without a supporting citation`             | A claim in the catalogue has no citations.                                                | Add a citation with a locator, or leave the claim `draft`.                                            |
| `is out of date with catalog.ts` from `seed:evidence:check`            | The catalogue changed and the seed was not regenerated.                                   | `npm run seed:evidence`, review the diff, commit both.                                                |
| `supersession cycle` from the generator                                | Two rows point at each other as replacements.                                             | Fix the catalogue. Nothing was written.                                                               |

### After an interrupted run

Check the role before doing anything else:

```sql
select rolname, rolcanlogin, rolpassword is not null as has_password
  from pg_authid
 where rolname = 'evidence_importer';
```

`rolcanlogin = false` and `has_password = false` is the dormant state. If either
is true, clear it from an owner session:

```sql
alter role evidence_importer nologin password null;
```

Also confirm no importer session is still open:

```sql
select count(*) from pg_stat_activity where usename = 'evidence_importer';
```

A lingering session keeps the pooled backend alive; it cannot be removed by the
role change, and it ends when the backend is recycled.

---

## 7. Changing the evidence

1. Edit `src/lib/vitalis/evidence/catalog.ts`.
2. Add or update the matching entry in `revisions` — the history is the audit
   trail, and the seed cannot infer why a change was made.
3. `npm run seed:evidence`.
4. Read the diff. It is the reviewable record of what will change in the
   database.
5. `npm run test -- src/lib/vitalis` to prove the file still applies and still
   round-trips.
6. Apply it as in section 4, then run the checks in section 5.

For a source that changes materially — a new edition of a guideline, a revised
dataset — do not overwrite the row. Raise its `version`, return it to
`in_review`, and let the licence and review gates decide what may still ship. A
superseded source keeps its row and gains a `supersededBy` pointer; nothing is
erased, because the point of the history is that a past statement can be
explained.

### Retiring evidence

There is no delete path in the seed, by design. To take a source or a claim out
of use, retire it:

1. If something replaces it, add the replacement row to `catalog.ts` first.
2. Set the old row's `reviewStatus` to `superseded` with a `supersededBy`
   pointer, or to `withdrawn` if nothing replaces it. The Phase 2 constraints
   require the status and the pointer to agree.
3. Add a revision entry recording who decided this and why.
4. Regenerate, review the diff, apply.

The retired row keeps its citations and its history, and a reviewer can still see
what was once claimed and on whose authority.

If a **relationship** must go — a citation that was attached in error, a
recommendation link that no longer applies — the database and the catalogue have
to be changed together, and the seed will not run while they disagree. Remove it
from the database with a reviewed `delete` at the psql prompt, and from
`catalog.ts` in the same change. That is deliberately manual: the one thing that
removes evidence should be a person typing it, not a regenerated file.
