# Bloom Vitalis Phase 2.2 — acceptance verification

**Status: acceptance-pending.** Verification-only pass on the P2.2 implementation.
Nothing was changed, committed, pushed or deployed. P2.2 closes only when you
approve it.

- Date of this pass: 6 November 2026 (UTC).
- Machine: the local Windows host, PostgreSQL 18.6 on `127.0.0.1:5433`.
- Database used for §2: three scratch databases created and dropped inside the
  run (`bloom_verify_p22_accept`, `bloom_verify_p22_rollback`,
  `bloom_verify_p22_upgrade`). The persistent `vitalis_test` database was used
  only by the test suites. Nothing touched a production or staging database.
- Migrations under test, in filename order:
  `20261104_vitalis_health_foundation.sql`,
  `20261105_vitalis_authoritative_safety.sql`,
  `20261106_vitalis_evidence_foundation.sql`,
  `20261109_vitalis_evidence_lifecycle.sql`.

---

## 1. Regression results

The database server was rebuilt as an empty cluster during this pass (the prior
instance had gone down with a host disconnect), so every number below was
re-executed against a freshly initialised PostgreSQL 18.6 — not carried over
from the implementation session.

| Check            | Command                                                                                                                                                   | Result                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Full suite       | `npm run test`                                                                                                                                            | **1 failed, 105 passed (106 files); 1174 passed, 1 failed, 0 skipped, 0 todo (1175 tests)**. Exit 1. |
| Vitalis          | `npx vitest run src/lib/vitalis`                                                                                                                          | **20 files passed; 241 tests passed.** Exit 0.                                                       |
| Phase 1 security | `npx vitest run src/lib/vitalis/db/security.integration.test.ts`                                                                                          | **1 file passed; 11 tests passed.** Exit 0.                                                          |
| P2.1 seed        | `npx vitest run src/lib/vitalis/db/evidence-seed.integration.test.ts src/lib/vitalis/evidence/seed/seed.test.ts src/lib/vitalis/evidence/catalog.test.ts` | **3 files passed; 53 tests passed.** Exit 0.                                                         |
| Types            | `npx tsc --noEmit`                                                                                                                                        | Clean, exit 0.                                                                                       |
| Lint             | `npx eslint <5 changed TS files> --rule '{"prettier/prettier":"off"}'`                                                                                    | Clean, exit 0.                                                                                       |
| Format           | `npx prettier --check --end-of-line crlf <5 TS + 2 documents>`                                                                                            | "All matched files use Prettier code style!", exit 0.                                                |
| Build            | `npm run build`                                                                                                                                           | Exit 0; Nitro output written, `.wrangler/deploy/config.json` generated.                              |

### The one failure is real and belongs to P2.2

```
FAIL src/lib/data/eraseCoverage.test.ts > erase_my_data covers every per-person table
     > deletes from every table that holds a person's rows
erase_my_data() in 20261104_vitalis_health_foundation.sql does not delete from these tables:
  evidence_editors: expected [ 'evidence_editors' ] to deeply equal []
```

`eraseCoverage` enumerates every table that holds a person column (`user_id`,
`profile_id`, `owner_id`, `sender_id`, `viewer_id`) and fails when the newest
`erase_my_data()` definition does not delete from it. `evidence_editors` is P2.2's
new per-person table, so the repository's own account-erasure policy is now
violated. Section 4 is the decision this needs.

### One environmental note, not a product failure

The first full run after the cluster rebuild produced four setup errors, all
`duplicate key value violates unique constraint "pg_database_datname_index"`,
from `createDatabaseIfMissing()` in `src/lib/vitalis/db/harness.ts:144`: four
workers raced to create `vitalis_test` because it did not exist yet. Re-running
with the database present gave the single `eraseCoverage` failure above. This is
pre-existing harness behaviour on a brand-new cluster; it only affects a machine
where the test database has never been created.

---

## 2. Migration and database verification

### 2.1 Full sequence on a genuinely empty database

Empty database: `public` held **0 tables**. Applied the Supabase base shim the
harness also uses (schema `auth` with `auth.uid()`, `auth.users`;
`storage.foldername`; roles `anon`, `authenticated`, `service_role`), then the
four migrations in filename order, with no errors:

```
20261104_vitalis_health_foundation.sql
20261105_vitalis_authoritative_safety.sql
20261106_vitalis_evidence_foundation.sql
20261109_vitalis_evidence_lifecycle.sql
```

Result: **13 tables, 9 user triggers, 37 policies, 23 functions** in `public`.

The real catalogue was then applied through the documented import path
(`set session authorization evidence_importer` + `bloom.evidence_import = 'on'` +
reason), producing **6 sources, 4 claims, 3 citations, 2 recommendations,
4 revisions, 3 lifecycle events**. Re-running the catalogue produced identical
counts — the seed is idempotent.

### 2.2 P2.2 against an existing, populated Phase 1/2 database

Separate scratch database: Phase 1 and Phase 2 migrations (`20261104` →
`20261106`), the catalogue loaded as owner exactly as an existing database would
hold it, then `20261109` applied on top.

- Every count and every digest is unchanged before/after (`dataUnchanged: true`).
- Baseline backfill created **9 events = 6 sources + 3 non-draft claims**, each
  with `from_status = null`, `actor_label = 'migration:baseline'`,
  `actor = null`, `reason = 'baseline recorded when lifecycle enforcement was
introduced'`. Exactly matches the non-draft row counts, so nothing is missed
  and nothing is invented.

### 2.3 Finding: the migration is not re-runnable

Re-applying `20261109` to an already-migrated database fails:

```
42710: policy "evidence_lifecycle_events_read" for table
       "evidence_lifecycle_events" already exists
```

The file guards tables with `create table if not exists` and functions with
`create or replace`, but all **17** `create policy` statements are unguarded, and
the baseline inserts are described in a comment as "Idempotent, so a re-apply adds
nothing" — which is true of the inserts and not of the file. No data was harmed
(`eventsAfterReapply` stayed at 9), and Supabase applies each migration file once,
so this does not block a normal `db push`. It does block the reasonable operator
move of manually re-running the file through the SQL editor. Recommended fix
(awaiting approval, not implemented): prefix each `create policy` in this file
with `drop policy if exists <name> on <table>;`, or amend the comment so nobody
assumes re-runnability.

### 2.4 Rollback in a disposable database

P2.2 was reversed by hand in a scratch database: drop triggers → drop the ten
RPCs and helpers → drop the view → drop the import policies → drop the two tables
→ drop the symmetric supersession check → restore the Phase 1 approval gate (the
`20261106` definition) and the Phase 1 `service_role` grants → drop the importer
role (after `drop owned by`).

| Claim                             | Result                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| No evidence row lost or rewritten | **True** — counts 6/4/3/4 and claim digest identical                                                                   |
| Guard genuinely gone afterwards   | **Yes** — an `approved → draft` update succeeded (returned `draft`) inside a transaction that was rolled back          |
| Phase 1 write grants restored     | **Yes** — `service_role` UPDATE on `evidence_claims` is `true` again                                                   |
| P2.2 objects removed              | **Yes** — remaining P2.2 functions `[]`, lifecycle triggers 0, import policies 0, importer role 0, events table absent |
| Phase 1 supersession check intact | **Yes** — `evidence_claims_superseded_pointer` present, P2.2's `..._pair` removed                                      |

Rollback is therefore clean and data-preserving, and it is a one-way door only in
the sense that the lifecycle rules stop existing — which is what a rollback means.

### 2.5 Trigger inventory and ordering

On the evidence tables after P2.2:

```
evidence_claims.evidence_claims_approvable
evidence_claims.evidence_claims_lifecycle
evidence_sources.evidence_sources_demotion_guard
evidence_sources.evidence_sources_lifecycle
evidence_lifecycle_events.evidence_lifecycle_events_append_only
```

Observed interaction: approving a draft claim that lacks a citation reports
`23514 cannot be approved without a supporting citation`, i.e. the approval gate
(`evidence_claims_approvable`, lexically first) fires before the lifecycle guard.
A downgrade reports the lifecycle message. Both fire; the caller may see either
rule name, which is what U3 already records as immaterial — no rule depends on
the order.

### 2.6 Protection under direct SQL (no RPC)

All attempts as the database owner with the RPCs bypassed:

| Attempt                            | Outcome                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Approve a draft with no citation   | `23514 cannot be approved without a supporting citation`                                                   |
| `approved → draft`                 | `23514 cannot move evidence_claims … from approved to draft`                                               |
| `version = 42`                     | `23514 version … may only increase by one`                                                                 |
| Content edit at the same version   | `23514 editing … requires version 2 (was 1)`                                                               |
| Insert a source already `approved` | `42501 a new evidence_sources row must start as draft or in_review`                                        |
| Rewrite a lifecycle event          | `42501 evidence_lifecycle_events is append-only and cannot be updated`                                     |
| Status change with no reason       | `22023 a status change … needs a reason (set bloom.evidence_reason)`                                       |
| `delete from evidence_claims`      | `23001 … violates RESTRICT setting of foreign key constraint evidence_recommendation_claims_claim_id_fkey` |

The claim was still `draft` afterwards. The guard is enforced by triggers, not by
grants, so it holds even for a connection that can write directly. Deleting a
claim is currently refused by foreign keys rather than by a named lifecycle rule —
worth knowing, since a claim with no citations, recommendations or events could be
deleted by the owner.

---

## 3. Importer and privilege boundary

`evidence_importer` is `NOLOGIN`, not superuser, no `BYPASSRLS`, no `CREATEDB`, no
`CREATEROLE`.

Legend: S = SELECT, I = INSERT, U = UPDATE, D = DELETE. "RPC" means EXECUTE on
`evidence_transition_claim(...)`; "queue" is `evidence_review_queue(date)`;
"predicate" is `evidence_is_import_session()`.

| Role                         | Evidence tables                                                                                | Events   | Editors | `health_profiles`    | RPC                                             | queue | predicate |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | -------- | ------- | -------------------- | ----------------------------------------------- | ----- | --------- |
| `anon`                       | none                                                                                           | none     | none    | none                 | no                                              | no    | no        |
| `authenticated` (non-editor) | S on all six                                                                                   | S        | none    | SIUD (own rows, RLS) | **yes**                                         | yes   | no        |
| `authenticated` (editor)     | same grants as above                                                                           | S        | none    | same                 | yes, **and passes `evidence_require_editor()`** | yes   | no        |
| `service_role`               | S on six                                                                                       | **none** | none    | S                    | **no**                                          | no    | no        |
| `evidence_importer`          | SIU on sources, claims, claim_sources, recommendations; SI on recommendation_claims, revisions | none     | none    | none                 | no                                              | no    | no        |
| owner / superuser            | SIUD everywhere                                                                                | SIUD     | SIUD    | SIUD                 | yes                                             | yes   | yes       |

Notes that matter for the boundary:

- Editorship is not a grant. An editor is an `authenticated` user with a row in
  `evidence_editors`; the RPCs are executable by any signed-in user and refuse
  inside via `evidence_require_editor()`. This is covered by
  `evidence-lifecycle.integration.test.ts: "refuses editorial work from someone
who is not an editor"`, which asserts `/not an evidence editor/`.
- `service_role` cannot execute the RPCs, cannot read the lifecycle log and cannot
  write evidence. That is stricter than Phase 1 (where it could INSERT/UPDATE) and
  is intentional per the design, but it means any server-side admin flow must use
  the editor RPCs as a user, not the service key.
- `anon` has no access at all, including no RPC execution.

### No ordinary application connection can assume the importer identity

Proven with a real non-superuser login (`bloom_app_verify`, `LOGIN`, not
superuser, not a member of anything), connected directly — not via `SET ROLE`
from a superuser session, which would have made the check meaningless:

| Probe                                         | Result                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `session_user` / `current_user`               | `bloom_app_verify` / `bloom_app_verify`                                        |
| `SET SESSION AUTHORIZATION evidence_importer` | **`42501 permission denied to set session authorization "evidence_importer"`** |
| `SET ROLE evidence_importer`                  | **`42501 permission denied to set role "evidence_importer"`**                  |
| Set `bloom.evidence_import = 'on'` itself     | Allowed (it is a session GUC)                                                  |
| `evidence_is_import_session()` then           | **`false`** — the predicate also requires `session_user = 'evidence_importer'` |
| `select … from evidence_claims`               | `42501 permission denied for table evidence_claims`                            |

So the flag alone buys nothing, and the identity cannot be reached. Writing the
flag is harmless.

### Superuser limitation

The database owner bypasses grants and RLS, but the lifecycle rules are triggers
and did refuse it (§2.6). The residual powers a superuser still has are
`ALTER TABLE … DISABLE TRIGGER`, `SET session_replication_role = replica`, and
`SET SESSION AUTHORIZATION evidence_importer` — which is exactly what the
migration's own import path uses. **Application code must never hold a superuser
connection**; the importer path is a migration-time tool only. This is U1 and
stays open.

---

## 4. Account erasure — decision required

**Finding.** `evidence_editors` is a per-person table (`user_id uuid primary key`)
with **no foreign key** to `auth.users`, so it is not removed by cascade. The
newest `erase_my_data()` — re-declared in `20261104_vitalis_health_foundation.sql`
— does not delete from it. Hence the failing coverage test.

**Recommendation.** Erasure should revoke editor membership and keep the audit
attribution:

```sql
if to_regclass('public.evidence_editors') is not null then
  delete from public.evidence_editors where user_id = uid;
  get diagnostics n = row_count; removed := removed || jsonb_build_object('evidence_editors', n);
end if;
```

`evidence_lifecycle_events` is append-only and stores `actor` as a bare uuid with
no foreign key, so historical events keep their attribution; the uuid simply stops
resolving to a person, which is the intent of erasure. Nothing in the log is
rewritten and no event is deleted.

**Consequences.**

- An erased user loses editorial authority immediately. That is correct: the row
  is what grants it, and a deleted account must not retain medical-claims
  authority.
- Audit entries survive with an orphaned `actor` uuid. That is deliberate, and it
  is the only reading consistent with an append-only log.
- The erase response gains an `evidence_editors` count.
- Ordering is irrelevant here (no dependants), so the delete can sit with the
  other Vitalis statements.

**Required changes, for approval:**

1. A new migration — suggested `20261110_vitalis_erase_evidence_editors.sql` —
   re-declaring `erase_my_data()` with the block above, keeping
   `security definer`, `set search_path = public, storage, auth` and the existing
   revoke/grant. Re-declaration follows the established newest-definition-wins
   pattern, which is what the coverage test reads.
2. `MIGRATION_FILES` in `src/lib/vitalis/db/harness.ts`.
3. No change to `eraseCoverage.test.ts` is needed or wanted; it should go green on
   its own, which is the point of the test.

I have **not** changed the erasure function.

---

## 5. Version bump without a narrative — decision required

**Finding.** The guard allows a version to advance by exactly one, and
`evidence_update_claim()` does exactly that (`version = c.version + 1`) without
writing `evidence_revisions`. `evidence_add_revision()` is an independent RPC that
accepts **any** `p_version` for an existing entity. Nothing links the two, so a
version can exist with no narrative, and a narrative can be filed for a version
that does not exist.

**Recommended deterministic fix — narrative required in the same transaction:**

1. Add a `CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED` on
   `evidence_claims` and `evidence_sources` that, at commit time, requires a
   matching `evidence_revisions` row `(entity_type, entity_id, version)` for every
   changed row whose `version >= 2`, and raises otherwise. Deferral is what lets
   the RPC update the row and then write the narrative in either order, while
   still making "bumped with no narrative" impossible to commit.
2. Tighten `evidence_add_revision()` to require
   `p_version = current version` of the entity, so narrative cannot be registered
   for a future or imaginary version.
3. Have `evidence_update_claim()` / `evidence_update_source()` write the revision
   row from the reason/summary they already receive, so RPC callers cannot forget.

**Why this shape.** It is enforced by the database, not by convention, so direct
SQL is covered too. It creates no empty or duplicated revision rows — the
narrative is the one the editor already supplies. Seed parity holds because the
catalogue's claims are v1 (no bump), and any bumped row in a fixture must carry
its narrative, which is where the `+1` fixture change already lives.

**Alternative considered and not recommended:** forbidding a bump unless a
revision row already exists before the update. That inverts the natural order
(review, then write the change), needs every writer to know the internal ordering,
and leaves the "revision for a version that never happens" hole open unless step 2
is also done.

Costs: one deferred constraint trigger per entity table, checked once per
transaction; negligible at this data volume. Rollback needs the trigger dropped
alongside the other P2.2 objects.

I have **not** implemented any of this.

---

## 6. Deployment uncertainties — still open

Kept open deliberately; nothing here was assumed away by the local harness.

- **U1 — does the production SQL editor / psql connect as a superuser?** Open. The
  import runbook needs a superuser (or the `evidence_importer` role) at migration
  time. Application code must never hold one. Verify in a disposable Supabase
  project what the SQL editor's role actually is.
- **U2 — is `pg_catalog` reachable through PostgREST's exposed schemas?** Open;
  project configuration. Verify the exposed-schema list includes only `public` (and
  `graphql_public` if used).
- **U4 — does a pooled connection behave like the reused client?** Open. The
  session GUC `bloom.evidence_import` and `SET SESSION AUTHORIZATION` are
  session-scoped; transaction-mode pooling resets sessions. Repeat the T4 probes
  through the pooler.
- **U6 — rolling back a cluster-level role.** Open. Only the forward path has been
  exercised here. In a disposable project, confirm that dropping the importer role
  on rollback succeeds after `drop owned by`, and that no grants remain.

**Must be verified in a disposable Supabase project before staging or production:**
the four points above; that `create policy` succeeds under the Supabase migration
runner's role; that `auth.uid()` resolves as expected inside
`security definer` functions there; that RLS policies referencing
`evidence_is_import_session()` are accepted by the hosted `postgres` role; and
that a full `db push` from empty matches this local result (13 tables, 9 triggers,
37 policies, 23 functions). Local PostgreSQL 18.6 is not evidence about a hosted
Supabase version, its pooler, or its SQL editor.

---

## 7. The `20261109` filename — verdict

Today is **6 November 2026**; the file is dated the 9th, three days ahead. Nothing
in the repository records 9 November as reserved, and I cannot know whether you
reserved it. It looks like a typo or a deliberate future slot — not something I
should silently resolve.

Renaming is cheap **right now**: `supabase/config.toml` still carries
`project_id = "replace-with-your-project-ref"`, so the project is not linked and
**no remote migration history or checksum exists**. The file is untracked, so
nothing depends on its history.

Implications if you rename:

- Do **not** rename to `20261106_…`. Supabase derives the version from the leading
  numeric token, so it would collide with
  `20261106_vitalis_evidence_foundation.sql`: two files, one version. `db push`
  rejects or mis-records that, and `schema_migrations` ends up with an ambiguity
  that needs `supabase migration repair`.
- The next free date prefix is `20261107` (only the seed file uses that date, and
  seeds live in `supabase/seeds/`, outside the version table) or `20261110`.
  Either keeps ordering after `20261106` and resolves the date discrepancy.
- Three places encode the filename and must move with it:
  `MIGRATION_FILES` in `src/lib/vitalis/db/harness.ts`,
  the path in `src/lib/vitalis/evidence/lifecycle-migration.test.ts:18`, and both
  `docs/vitalis-p2.2-*.md` references.
- **After** any remote apply, the prefix becomes the recorded version and a rename
  requires `supabase migration repair --status reverted <old>` plus a new push;
  forcing it otherwise breaks checksum comparison.

My recommendation: confirm the intent. If 9 November was not reserved, rename to
`20261110_vitalis_evidence_lifecycle.sql` before the first push and update the
three references above. If it was reserved, keep it and record why in the design
doc. I have not renamed anything.

---

## Changed files

**None.** This pass changed no product, test, migration or document file. Three
throwaway scripts were written under `verify/` to drive the disposable databases
and were deleted after the runs, together with the scratch PostgreSQL cluster.

## Unresolved risks

1. Account erasure does not revoke editor membership (§4) — open decision, and it
   is the only failing test in the repository.
2. A version can advance with no narrative, and a narrative can be filed for a
   nonexistent version (§5) — open decision.
3. The P2.2 migration cannot be re-applied (§2.3) despite a comment implying it
   can — small, operator-facing.
4. U1, U2, U4, U6 remain unverified against hosted Supabase (§6).
5. Filename/date mismatch (§7) — cosmetic today, expensive after the first push.
6. Owner-level `DELETE` of a claim is prevented by foreign keys rather than by a
   named rule (§2.6) — acceptable, but not the same guarantee as the rest.

## Approvals requested

- **A1.** Add `evidence_editors` to `erase_my_data()` via a new migration (§4).
- **A2.** Implement the deferred revision-coverage trigger, the
  `evidence_add_revision` version check and the RPC narrative write (§5).
- **A3.** Guard the 17 `create policy` statements so the file can be re-applied
  (§2.3).
- **A4.** Decide the filename: keep `20261109`, or rename to `20261110` and update
  the three references (§7).

**P2.2 remains acceptance-pending.**
