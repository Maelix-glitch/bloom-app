# Bloom Vitalis Phase 2.2 — follow-up changes (A1–A4)

Four approved changes made after the acceptance-verification pass. P2.2 is still
**not accepted** and not production-ready: §6 of
`docs/vitalis-p2.2-acceptance-verification.md` (hosted Supabase behaviour) remains
open, and that report is preserved unchanged as the record of the state at
verification time.

The lifecycle logic itself is untouched: which statuses may follow which, the
reason requirement, supersession, the licence gate and the audit events all
behave exactly as verified.

## Migration order after these changes

```
20261104_vitalis_health_foundation.sql
20261105_vitalis_authoritative_safety.sql
20261106_vitalis_evidence_foundation.sql
20261110_vitalis_evidence_lifecycle.sql            (was 20261109)
20261111_vitalis_erase_evidence_editors.sql        (new, A1)
20261112_vitalis_evidence_revision_coverage.sql    (new, A2)
```

`MIGRATION_FILES` in `src/lib/vitalis/db/harness.ts` lists all six.

## A1 — account erasure revokes editor membership

`20261111_vitalis_erase_evidence_editors.sql` re-declares `erase_my_data()` in
full, because plpgsql cannot append to an existing body. The definition was
extracted from `20261104` programmatically rather than retyped, so the only
difference is the new block: 34 `delete from public.*` statements against the
previous 33.

```sql
if to_regclass('public.evidence_editors') is not null then
  delete from public.evidence_editors where user_id = uid;
  get diagnostics n = row_count; removed := removed || jsonb_build_object('evidence_editors', n);
end if;
```

Why this shape:

- `evidence_editors` is a per-person table with **no** foreign key to
  `auth.users`, so nothing removed it by cascade.
- Membership is deleted; the audit trail is not. `evidence_lifecycle_events` is
  append-only and stores `actor` as a bare uuid, so history keeps its attribution
  while the uuid stops resolving to a person. No event is deleted or rewritten.
- The `to_regclass` guard keeps the function installable on a project without the
  table, like every other block in it.
- `security definer`, `search_path = public, storage, auth` and the
  revoke-public/grant-authenticated pair are preserved, and the function comment
  now states that editor membership is erased and the lifecycle log is not.

Result: `src/lib/data/eraseCoverage.test.ts` passes without being modified.

## A2 — a version always has a narrative

`20261112_vitalis_evidence_revision_coverage.sql` closes the gap where a version
could advance with nothing in `evidence_revisions`, and a narrative could be
filed for a version that did not exist.

1. **Commit-time coverage.** `evidence_assert_revision_coverage()` is a
   `CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED` on `evidence_claims` and
   `evidence_sources` (AFTER INSERT OR UPDATE). At COMMIT, every changed row at
   version 2 or above must have an `evidence_revisions` row matching
   `(entity_type, entity_id, version)`. Deferral is what lets the row and its
   narrative be written in either order inside one transaction, as both the import
   path and the RPCs do, while making a bare bump impossible to commit — from a
   function or from direct SQL. Version 1 needs no narrative: it is the row's
   creation.
2. **Narratives belong to real versions.** `evidence_add_revision()` now reads the
   entity's current version and refuses anything else (`23514 … is at version N,
not M`). Previously it accepted any number.
3. **The update RPCs narrate.** `evidence_update_claim()` and
   `evidence_update_source()` insert the revision row for the version they just
   created, using the reason they already require (≥ 10 characters, truncated to
   the column's 500). A caller can no longer bump a version by forgetting.

Seed parity: the catalogue's claims are v1, and the one v2 row — the superseded
source `dga-2020-2025` — already carries its version-2 summary, so nothing is
invented and no backfill was added.

Transaction-boundary note: with PostgREST each RPC call is its own transaction, so
the check fires at the request's commit. In a single-statement autocommit
connection it fires at the end of that statement. Either way it is the same check.

## A3 — the lifecycle migration can be re-applied

Two defects, both found by re-applying the migrated file against a populated
database:

1. All **17** `create policy` statements assumed a clean database, so a re-apply
   failed with `42710 policy "evidence_lifecycle_events_read" already exists`.
   Each is now preceded by `drop policy if exists <name> on <table>;`. The
   constraints were already guarded with `drop constraint if exists`.
2. The baseline backfill deduplicated per entity against rows labelled
   `migration:baseline`, so a re-apply added baseline events for rows that
   arrived (without history) after the first run — and whose reason text,
   "recorded when lifecycle enforcement was introduced", would have been untrue.
   The whole block now runs only when the log is empty:

```sql
do $$
begin
  if exists (select 1 from public.evidence_lifecycle_events) then
    return;
  end if;
  …both baseline inserts…
end
$$;
```

Measured on a scratch database with the catalogue loaded, then each migrated file
re-applied in turn:

| Quantity                        | before       | after re-apply       |
| ------------------------------- | ------------ | -------------------- |
| sources / claims / revisions    | 6 / 4 / 4    | 6 / 4 / 4            |
| lifecycle events                | 3            | 3                    |
| policies / triggers / functions | 37 / 11 / 24 | 37 / 11 / 24         |
| re-apply result                 | —            | all three files `ok` |

And the first-run behaviour is unchanged on a genuinely pre-enforcement database
(Phase 1 + catalogue, then the lifecycle file): 6 non-draft sources + 3 non-draft
claims ⇒ 9 baseline events, still 9 after a re-apply.

The static assertion in `lifecycle-migration.test.ts` that looked for the old
per-entity `and not exists (` guard now asserts the empty-log guard instead.

## A4 — the filename

Renamed `20261109_vitalis_evidence_lifecycle.sql` →
`20261110_vitalis_evidence_lifecycle.sql`, and every living reference moved with
it: `MIGRATION_FILES` in the harness, the path in
`src/lib/vitalis/evidence/lifecycle-migration.test.ts`, and both
`docs/vitalis-p2.2-*.md` design/implementation documents.

Why 20261110 and not 20261106: Supabase derives a migration's version from the
leading numeric token, so `20261106` would collide with
`20261106_vitalis_evidence_foundation.sql`. `20261110` sorts after the foundation
and after `20261107`'s seed date, keeps the four files distinct, and matches the
date the work actually concluded.

The rename was free: `supabase/config.toml` still holds the placeholder project
ref, so no remote version or checksum exists yet. After the first `db push` a
rename would require `supabase migration repair`.

`docs/vitalis-p2.2-acceptance-verification.md` was deliberately **not** edited: it
records what was true when it was written, including the old filename.

## Verification

| Check            | Command                                                                            | Result                                                  |
| ---------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| New invariants   | `npx vitest run src/lib/vitalis/db/evidence-revision-coverage.integration.test.ts` | 1 file, **6 tests passed**                              |
| Erasure coverage | `npx vitest run src/lib/data/eraseCoverage.test.ts`                                | passed (was the only failure)                           |
| Full suite       | `npm run test`                                                                     | **107 files, 1181 tests, 0 failed, 0 skipped** (exit 0) |
| Types            | `npx tsc --noEmit`                                                                 | clean                                                   |
| Lint             | `npx eslint … --rule '{"prettier/prettier":"off"}'`                                | clean                                                   |
| Format           | `npx prettier --check --end-of-line crlf …`                                        | clean                                                   |
| Build            | `npm run build`                                                                    | exit 0                                                  |

The new suite (`src/lib/vitalis/db/evidence-revision-coverage.integration.test.ts`)
covers: a bare version bump refused at commit and not surviving; the same bump with
its narrative accepted; `evidence_update_claim()` writing the narrative from its
reason; `evidence_add_revision()` refusing a version the entity is not at and
accepting the current one; and erasure removing the membership while the
append-only event keeps its `actor`.

One fixture changed: `evidence-seed.integration.test.ts` bumped a claim's version
to test the catalogue's version guard; that bump now carries a revision row in the
same statement, as the new invariant requires. The test's subject is unchanged.

## Still open

§6 of the acceptance report is unchanged and unresolved: U1 (role behind the
hosted SQL editor), U2 (PostgREST exposed schemas), U4 (pooler semantics for the
session-scoped import GUC) and U6 (cluster-level role rollback) must be verified in
a disposable Supabase project before staging or production. Local PostgreSQL 18.6
says nothing about the hosted version, its pooler or its editor.

Also unchanged: an owner-level `DELETE` of a claim is refused by foreign keys
rather than by a named lifecycle rule, and a superuser can still disable triggers
or assume the importer identity — which is why application code must never use a
superuser connection.
