# Bloom Vitalis — P2.2 implementation report

**Status: implemented locally and verified against PostgreSQL 18.6. Not applied to
staging, not applied to production, not deployed. Nothing committed, nothing
pushed.**

The specification implemented is `docs/vitalis-p2.2-lifecycle-design.md`, which
now reconciles the original design, the design review (C1–C5, D1–D12) and the
verification report (C6, C7, F1).

## 1. What was written

| File                                                          | Change                                                                                                                                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20261110_vitalis_evidence_lifecycle.sql` | **New.** The whole of Phase 2.2 (details below).                                                                                                                                              |
| `src/lib/vitalis/db/harness.ts`                               | `MIGRATION_FILES` gains the new migration.                                                                                                                                                    |
| `src/lib/vitalis/db/evidence.integration.test.ts`             | One assertion flipped (`service_role` may no longer update a claim); fixtures that create reviewed rows enter through the import preamble; the per-person test scoped to the registry tables. |
| `src/lib/vitalis/db/evidence-seed.integration.test.ts`        | The catalogue is applied through a `runSeed()` preamble (identity + flag + reason); one fixture jump becomes `+1`; one fixture insert moves under the preamble.                               |
| `src/lib/vitalis/db/evidence-lifecycle.integration.test.ts`   | **New**, 19 cases against real PostgreSQL.                                                                                                                                                    |
| `src/lib/vitalis/evidence/lifecycle-migration.test.ts`        | **New**, 14 static cases over the migration text.                                                                                                                                             |
| `docs/vitalis-p2.2-lifecycle-design.md`                       | Rewritten as the single authoritative specification.                                                                                                                                          |

The migration contains: `evidence_editors` with `evidence_is_editor` and
`evidence_require_editor`; `evidence_lifecycle_events` with RLS, a read policy and
the Phase 1 append-only trigger; `evidence_transition_allowed` (the ten edges);
`evidence_is_import_session`; `evidence_assert_lifecycle` (insert rule,
immutability, version clauses, graph, reason, pointer agreement, replacement and
cycle checks, and the event write); `evidence_assert_source_change_safe` (D7);
a redefined `evidence_assert_claim_approvable` (adds the overdue condition, D5);
the symmetric claims supersession CHECK (`not valid`, then validated);
`evidence_review_due` and `evidence_review_queue`; ten editor RPCs;
the `service_role` revocations; the guarded importer role with 16 policies and
sequence usage; baseline events for already-reviewed rows; and comments.

No evidence row is deleted, no table is dropped, no Phase 1 table is altered, and
no application source outside the four test/harness files changed.

## 2. How it was verified

| Check                                                                                 | Result                            |
| ------------------------------------------------------------------------------------- | --------------------------------- |
| `npx vitest run src/lib/vitalis/evidence/ src/lib/vitalis/db/`                        | **12 files, 165 tests, all pass** |
| `npx tsc --noEmit`                                                                    | clean                             |
| `npx eslint` on the five changed TypeScript files (prettier rule off, repo runs CRLF) | clean                             |
| `npx prettier --write --end-of-line crlf` on the changed TypeScript files             | applied                           |

The integration suites run the real migration files, in order, against a real
PostgreSQL 18.6 server, inside one rolled-back transaction per test. That settles
U7 from the verification report: the complete migration applies to an empty
database and the real catalogue lands on top of it.

Behaviour demonstrated, not inferred:

- **Import path.** The catalogue applies only under
  `session authorization evidence_importer` with the flag set; without it the
  first approved insert is refused (`42501`) and nothing is written. Events carry
  `actor_label = seed:import` and the operator's reason; a second application adds
  no events.
- **Graph.** Every permitted edge works through the RPC; `draft → approved`,
  `approved → draft`, and `withdrawn → approved` are refused (`23514`) and the
  row is unchanged.
- **Reasons and fences.** A short reason is `22023`; a stale version is `40001`
  and names the current status and version.
- **Version rules.** Same version with changed content, a `+2` jump, and a
  decrease are all `23514`; exactly `+1` is accepted; the seed's own `+1`
  fixture passes.
- **Supersession.** A draft or already-retired replacement is refused; a valid
  one succeeds, keeps the citation and the approved claim, and the pointer cannot
  then be cleared (`42501`).
- **Retirement.** Withdrawing a cited source is `23514` naming the claim;
  superseding the same source succeeds.
- **Citations.** Removing the last supporting citation of an approved claim is
  `23514`; removing a second one succeeds and writes a reason-bearing revision.
- **Overdue gate.** A claim citing a source reviewed in 2019 with a 12-month
  cadence cannot be approved (`23514 … is overdue for review`), and the queue
  lists that source for editors only (`42501` for a non-editor).
- **Audit log.** Written by the guard; even the owner cannot rewrite it
  (`42501 … append-only`), and the reason read back is the operator's.
- **Privileges.** `service_role` has no insert/update/delete on evidence;
  `authenticated` has no direct write; `anon` neither reads nor executes;
  `evidence_lifecycle_events` has RLS on.

## 3. What implementation changed about the design

Four things were only discoverable by making it run. All four are folded into the
specification.

1. **The guard must write the log.** The first working draft validated
   transitions but nothing wrote `evidence_lifecycle_events`; the log stayed
   empty and the append-only and attribution requirements were untestable. The
   event insert now lives inside the guard, in the same statement as the change.
   That gives the guarantee the phase wanted — no status change without an event,
   and no event left behind by a refused change — and it removes any path by which
   a caller could write history directly.
2. **An import may establish an already-retired row.** The catalogue records an
   edition that was superseded before it was written, so the "a new row cannot
   start superseded" rule is scoped to non-import callers. The replacement is an
   FK target, so existence is still enforced.
3. **The cycle check is unreachable, and kept.** Because a valid replacement must
   itself be approved and un-superseded, no sequence of API calls can close a
   loop. The check stays as defence in depth and the test asserts the refusal the
   API actually produces (the replacement rule), not the message the unreachable
   branch would emit.
4. **The `+1` rule bites fixtures too.** The seed suite's "database is newer"
   fixture used to jump six versions; under clause 2 it must be `+1`. That is the
   rule working, not a test being weakened: the refusal it asserts still fires.

## 4. Deviations, and what was deliberately not done

- **No staging migration, no production database change, no production
  configuration change, no deployment.** The migration exists as a file and is
  exercised only by the local harness.
- **No Phase 3 work.** No UI, no route, no server function, no editor screen.
- **No unrelated refactoring.** `registry.ts`, `review.ts`, `licensing.ts`, the
  seed generator, the catalogue file and every Phase 1 migration are untouched.
  The only Phase 1 code touched is the four test/harness files listed above, and
  only where the new enforcement made their assertions untrue.
- **`erase_my_data()` was not changed**, even though `evidence_editors.user_id`
  now identifies a person. Removing editorial authority when an account is erased
  is a product decision with an audit consequence (the `actor` uuid in history),
  and touching Phase 1's erasure function was outside this phase. It is recorded
  as an open item in the specification (§16) rather than silently decided.

## 5. What remains open

- **U1** (does the production SQL editor connect as a superuser?) and **U4**
  (pooled connections) are deployment facts that cannot be settled locally, and
  both bear on the import gate's strength.
- **U2** (PostgREST exposed schemas) and **U6** (rolling back a cluster-level
  role) remain unexercised.
- **U3** is immaterial: the two claim triggers both fire, and no rule depends on
  which message a caller sees first.
- **The revision-prose gap** (§4 of the specification): a version bump need not be
  narrated in `evidence_revisions`.
- **Editor membership and erasure**, above.

## 6. Where to look

- The specification: `docs/vitalis-p2.2-lifecycle-design.md`.
- Executed evidence for the predicate and the version rules:
  `docs/vitalis-p2.2-verification-report.md` (retained unchanged).
- Rationale for C1–C5 and D1–D12: `docs/vitalis-p2.2-design-review.md` (retained
  unchanged).
- The implementation: `supabase/migrations/20261110_vitalis_evidence_lifecycle.sql`
  and the two new suites.

Awaiting review. No staging or production change has been made and nothing has
been committed.
