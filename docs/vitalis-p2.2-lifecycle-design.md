# Bloom Vitalis — P2.2 evidence lifecycle enforcement

**Status: authoritative specification. Implemented locally; not applied to staging or production.**

This document is the single specification for Phase 2.2. It replaces
`docs/vitalis-p2.2-lifecycle-design.md` as the design of record by folding in the
design review and the PostgreSQL verification report, and it describes the
protocol exactly as implemented in
`supabase/migrations/20261110_vitalis_evidence_lifecycle.sql`.

## 0. Authority and reconciliation

Three documents produced this one. None of them is deleted; two are retained
unchanged as historical evidence.

| Document                                   | Role now                                                        | What survived into this specification                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `docs/vitalis-p2.2-lifecycle-design.md`    | **Superseded by this file.** Retained as the original proposal. | The six-state model, the transition graph, the gap analysis (G0–G9), the RPC-only editorial surface, the rollback plan. |
| `docs/vitalis-p2.2-design-review.md`       | **Retained unchanged** as the rationale for C1–C5 and D1–D12.   | Every correction C1–C5 and every decision D1–D12, with its argument.                                                    |
| `docs/vitalis-p2.2-verification-report.md` | **Retained unchanged** as executed evidence on PostgreSQL 18.6. | The measured predicate behaviour, C6, C7, F1, the GUC nuance, and the version/privilege matrices.                       |

Where the three disagree, this document wins. The rule used throughout:
**measured behaviour beats argument, and the implemented migration beats both.**

Corrections adopted wholesale, without further debate:

| Item | Adopted form                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| C1   | Importer identity is `session_user = 'evidence_importer'` **and** `bloom.evidence_import = 'on'`, tested by a `SECURITY INVOKER` function. |
| C2   | Only _unreplaced_ departures from `approved` are refused; `approved → superseded` stays legal.                                             |
| C3   | A content change requires version exactly `+1`; a version may only ever move `+1`.                                                         |
| C4   | `service_role` loses every direct evidence write; editorial writes go through `SECURITY DEFINER` RPCs.                                     |
| C5   | The importer role is created by the migration, guarded and idempotent.                                                                     |
| C6   | `reviewed_on` and `review_interval_months` are bookkeeping, not content.                                                                   |
| C7   | The importer needs **16** policies and sequence usage, not 12.                                                                             |

## 1. What P2.2 must keep true

P2.1's closure conditions are constraints on this phase, not aspirations:

| Guarantee                                          | Mechanism in this design                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Never delete evidence automatically                | No trigger, RPC or migration statement deletes a source, claim, revision or event. Retirement is status. |
| Never silently remove a citation or a relationship | Removal is a single explicit RPC that demands a reason and writes a `evidence_revisions` row.            |
| Never downgrade a reviewed or approved record      | `approved → draft` is absent from the graph at every privilege level, including the owner and imports.   |
| Never erase supersession history                   | `superseded_by` is immutable once set; `superseded` and `withdrawn` are terminal.                        |
| Detect unexpected state and fail closed            | The catalogue's reconciliation pass is untouched; the lifecycle guard is a second, independent layer.    |
| Deterministic, idempotent seeding                  | The import path is explicit and audited; a second application adds nothing, including events.            |

The database is the enforcement layer. Application checks in `registry.ts` and
`review.ts` remain previews that the database outranks.

## 2. The state machine

Six states, two of them terminal. One graph, shared by sources and claims.

| State        | Meaning                              | Product-usable?                       |
| ------------ | ------------------------------------ | ------------------------------------- |
| `draft`      | recorded, not yet checked            | no                                    |
| `in_review`  | a reviewer has it                    | no                                    |
| `approved`   | checked, licensed, in date           | yes, if un-superseded and not overdue |
| `rejected`   | checked and found unusable           | no                                    |
| `superseded` | replaced by another row              | no; retained for history              |
| `withdrawn`  | taken out of use without replacement | no; retained for history              |

The ten permitted edges, exactly as encoded in `evidence_transition_allowed`
and mirrored by `REVIEW_TRANSITIONS` in `src/lib/vitalis/evidence/review.ts`:

```
draft     → in_review, withdrawn
in_review → approved, rejected, draft
approved  → superseded, withdrawn, in_review
rejected  → draft, withdrawn
superseded → (none)   terminal
withdrawn  → (none)   terminal
```

A static test extracts the SQL graph and compares it with the TypeScript one, so
the two cannot drift.

Deliberate absences, all of them load-bearing:

- **`approved → draft`** — the silent downgrade the phase exists to prevent.
- **`draft → approved`** — skipping review; legal only on the audited import path.
- **`rejected → approved`**, **`draft → rejected`**, **`approved → rejected`** —
  rejection is a review outcome, reachable only from `in_review`.
- **Anything out of `superseded` or `withdrawn`** — a returning position is a new
  row with a new id.

`approved → in_review` exists so a row whose confirmation is expiring can be
re-reviewed without pretending it was never approved.

## 3. The lifecycle guard

One trigger function, `evidence_assert_lifecycle()`, attached `BEFORE INSERT OR
UPDATE` on `evidence_sources` and `evidence_claims`. It is `SECURITY DEFINER`
with `search_path = public, pg_temp` — it must be able to write the audit log
where the caller cannot.

Rules, in the order the function applies them:

1. **Insert.** A new row must start `draft` or `in_review` unless the caller is
   the import session (`42501`). An insert may carry `superseded_by` only on the
   import path (`23514`): the catalogue legitimately records an edition that was
   already retired when it was written, and its replacement is an FK target.
2. **Identity.** `id` and `created_at` are immutable (`42501`).
3. **Supersession immutability.** Once `superseded_by` is non-null it may not be
   cleared or re-pointed (`42501`). A wrong pointer is corrected by a new row.
4. **Audit.** When the status changes, the event row is inserted here, in the
   same statement, so a status change cannot occur without an event and a refused
   change cannot leave one behind.
5. **Graph.** Outside the import path, the edge must exist (`23514`).
6. **Reason.** Outside the import path, a status change needs
   `bloom.evidence_reason` of at least 10 characters (`22023`).
7. **Pointer agreement.** `review_status = 'superseded'` and `superseded_by is
not null` must agree (`23514`). This is the symmetric form of a rule sources
   already had and claims did not.
8. **Replacement.** The target must exist (`23503`) and must itself be `approved`
   and not superseded (`23514`). A cycle check follows as defence in depth: it is
   unreachable through the API, because a superseded row can never be a valid
   replacement, but it costs one recursive query and it does not depend on that
   argument staying true.

Transitions do **not** bump `version`. `version` identifies the text; the log
records the decision (D4).

## 4. The version rule

Two clauses, both enforced by the guard, applying to imports as well (D11):

1. **Content changed ⇒ version is exactly `old.version + 1`** (`23514`).
2. **A version may only ever move `+1`** — no jump, no reversal (`23514`).
   Bumping with no content change is legal, so a re-review can re-stamp a row.

Content is `to_jsonb(row)` minus the bookkeeping set:

```
created_at, updated_at, review_status, superseded_by, version,
reviewed_on, review_interval_months          <-- C6
```

`reviewed_on` and `review_interval_months` are review facts, not assertions about
the world. Without them in the set the real catalogue fails to apply, which is
how C6 was found (`23514 editing evidence_claims … requires version 2 (was 1)`).

**Documented limitation, retained:** an editor may bump a version without
narrating it in `evidence_revisions`. The lifecycle event records that a change
happened and why, not what the text said. Closing that needs per-edit snapshots
or mandatory prose — both larger than this phase.

## 5. Supersession, citations and retirement

- A retired source keeps its citations. Nothing cascades, nothing is copied onto
  the replacement, and the citing claim does not inherit readiness (D9). Since
  the replacement must independently pass approval and licensing, a claim that
  still cites the old row is not product-ready.
- **Retirement guard (D7).** A source may leave `approved` for `in_review` or
  `withdrawn` only if no approved claim cites it (`23514`, naming the claims).
  `approved → superseded` is deliberately **not** guarded: supersession is the
  documented way to retire a cited source, and blocking it would leave no legal
  path at all.
- **Citation integrity.** `evidence_detach_citation` refuses to remove the last
  `supports` citation of an approved claim (`23514`) and otherwise records a
  revision with the reason. `evidence_attach_citation` keeps the pre-existing
  licensing gate: a citation may not be attached to an approved claim from a
  source that may not ship.

### F1 — the frozen claim (expected, surprising, documented)

Because the pre-existing approval gate re-validates on every write, an approved
claim citing a source that has since been superseded cannot even be edited: the
gate refuses the version bump with `23514 claim … cannot be approved: source …
is not approved for product use`. The only way out is a status change
(`approved → in_review`), which withdraws approval and forces re-review. That is
correct — an approved claim resting on retired evidence must not be quietly
editable — but operators will meet it, so it is specified here rather than
discovered in a support ticket.

## 6. The approval gate (D5)

`evidence_assert_claim_approvable()` is redefined to add one condition to the
existing ones. A claim may be `approved` only if:

1. at least one citation `supports` it;
2. every cited source is `approved` and licensed for product use;
3. **no cited source is overdue for review** — `reviewed_on +
review_interval_months` has not passed. A source with no `reviewed_on` counts
   as overdue.

Nothing in the catalogue is overdue today (`reviewed_on` is 2026-11-05), so the
seed is unaffected.

## 7. The import path (C1, C5, C7, D1)

One predicate, `evidence_is_import_session()`, `SECURITY INVOKER`, `search_path =
public, pg_temp`:

```sql
select session_user = 'evidence_importer'
   and coalesce(current_setting('bloom.evidence_import', true), 'off') = 'on';
```

Both halves are required. The measured facts behind that shape:

- `current_user` is the owner inside a `SECURITY DEFINER` function, so the
  original predicate returned `true` for a non-member (T8b). The function is
  therefore invoker, and the check is on `session_user`.
- `session_user` cannot be changed by an application role: a real non-superuser
  login gets `42501` on `SET SESSION AUTHORIZATION` (T6b). Only an operator
  connection can enter the identity.
- The flag alone is inert: a role that sets the GUC without the identity sees
  `false` (T7b).
- After `COMMIT` or `ROLLBACK` the setting reads as the **empty string**, not
  `NULL` (T2b, T3c). A predicate written as `is not null` would be true on an
  idle connection. Comparing to `'on'` is what makes this safe, and the comment
  beside the function says so.
- `SET LOCAL SESSION AUTHORIZATION` outside a transaction is a silent no-op
  (T9). The runbook therefore wraps the preamble in an explicit transaction.

The role is created inside the migration, guarded by
`pg_roles`, with `nologin` and no attribute that would let it authenticate or
skip a policy:

```sql
begin;
  set local session authorization evidence_importer;
  set local bloom.evidence_import = 'on';
  set local bloom.evidence_reason = 'applying the evidence catalogue';
  \i supabase/seeds/20261107_vitalis_evidence_catalog.sql
  reset session authorization;
commit;
```

Privileges granted to the importer, and nothing else (C7):

- **16 policies** — read/insert/update on sources, claims, citations and
  recommendations (12); read/insert on recommendation links (2); read/insert on
  revisions (2);
- `usage` on `evidence_revisions_id_seq` and `evidence_lifecycle_events_id_seq`;
- **no `SELECT` on `evidence_lifecycle_events`** — the importer writes history it
  cannot read back;
- **no access at all to Phase 1 health tables** (`42501`, verified).

Without the preamble the catalogue fails closed on its first approved insert
(`42501 a new evidence_sources row must start as draft or in_review`) and writes
nothing.

## 8. Editorial identity (D2, D6)

Authority is no longer "holds `service_role`". It is membership of
`public.evidence_editors (user_id uuid primary key, note text)`, read through
`evidence_is_editor(uuid)` and enforced by `evidence_require_editor()`, which
raises `42501 … not an evidence editor` when `auth.uid()` is not a member. A
reward administrator is not a medical approver, and the table is the place that
distinction lives.

`service_role` keeps `SELECT` and loses `INSERT`/`UPDATE`/`DELETE` on every
evidence table (`SELECT`-only on revisions and events). The editorial RPCs are
`SECURITY DEFINER`, so the client's lack of table privileges is exactly what
makes them the only route.

## 9. The RPC surface

All ten are `SECURITY DEFINER`, editor-gated, and executable by `authenticated`
only (`anon` is revoked).

| Function                                                                          | Purpose                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `evidence_transition_claim(id, to, from, version, reason, superseded_by?)`        | Move a claim along the graph, fenced on the state read.          |
| `evidence_transition_source(id, to, from, version, reason, superseded_by?)`       | The same for a source.                                           |
| `evidence_update_claim(id, patch jsonb, expected_version, reason)`                | Edit content; the caller never supplies `version`.               |
| `evidence_update_source(id, patch jsonb, expected_version, reason)`               | Edit a source; licence flags are re-derived, never patched.      |
| `evidence_attach_citation(claim, source, direction, locator)`                     | Add a citation through the licensing gate.                       |
| `evidence_detach_citation(claim, source, reason)`                                 | Remove one, reasoned, with a revision and a last-citation guard. |
| `evidence_link_recommendation(recommendation, claim)`                             | Add traceability.                                                |
| `evidence_unlink_recommendation(recommendation, claim, reason)`                   | Remove it, reasoned.                                             |
| `evidence_add_revision(entity_type, entity_id, version, summary, snapshot jsonb)` | Curated history; append-only.                                    |
| `evidence_review_queue(as_of date default current_date)`                          | The overdue queue, editor-only.                                  |

`evidence_update_source` recomputes `product_use_allowed` and
`permission_required` from the resulting `license_id`. A caller cannot
manufacture usability by patching a flag, which is the same rule
`licensing.ts` follows in TypeScript.

Error codes are part of the contract: `42501` privilege, immutability or
append-only; `23514` invariant; `22023` missing or short reason; `40001` stale
version; `23503` unknown replacement.

## 10. Concurrency

Every mutating RPC takes the status and version the editor read and fences on
them:

```
40001  claim v-c is now in_review at version 4 (you had draft at version 3)
```

Two editors over the same row cannot silently overwrite each other; the loser
re-reads. Inside a transaction the fence is statement-level, so an RPC that
fails leaves the transaction usable (tests rely on this through savepoints).

## 11. The audit log (D12)

`public.evidence_lifecycle_events` is machine-written, one row per status change,
append-only by the Phase 1 `health_reject_mutation()` trigger — "append-only"
means the same thing everywhere in the schema.

| Column                                | Contains                                                   |
| ------------------------------------- | ---------------------------------------------------------- |
| `entity_type`, `entity_id`            | `source`/`claim` and the row id                            |
| `from_status`, `to_status`, `version` | the edge and the version after it                          |
| `actor`                               | `auth.uid()` at the time of the write                      |
| `actor_label`                         | `editor:<uuid>` or `seed:import` — derived, never supplied |
| `reason`                              | the reason the RPC required                                |
| `occurred_at`                         | `now()`                                                    |

Rows that already carried a reviewed status when the migration ran get a
`migration:baseline` event, so no reviewed row has an unexplained status.

## 12. The review queue

`public.evidence_review_due` computes, per row, the due date, days remaining and
an `overdue` flag; `evidence_review_queue(as_of)` returns the overdue rows oldest
first, editor-only. This is the documented way to find stale evidence rather than
waiting for someone to remember it, and it is the same definition the approval
gate uses (D5), so the queue and the gate cannot disagree.

## 13. Migration, idempotency and rollback

`supabase/migrations/20261110_vitalis_evidence_lifecycle.sql` is additive: it
creates the editor table, the events table, the guard, the demotion guard, the
queue and the RPCs; redefines the approval gate; replaces the one-directional
claims supersession check with the symmetric one (`not valid`, then `validate`);
and revokes the `service_role` writes. No evidence row is deleted, no table is
dropped, no Phase 1 table is altered.

Re-applying it is safe: every object is `if not exists` / `create or replace`, the
role creation is guarded, and the baseline insert is `not exists`-guarded.

Rollback, if ever needed, is the reverse script in the original design's §11 —
drop the RPCs, the triggers, the view, the events table, the editor table, restore
the Phase 1 grants, restore the one-directional check, drop the role. Because
nothing is deleted and no status is rewritten, rolling back loses only the
lifecycle log and the capability to write evidence, not the evidence.

## 14. Test plan, as built

| Suite                                                       | Proves                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/vitalis/evidence/lifecycle-migration.test.ts`      | Static: graph parity with `REVIEW_TRANSITIONS`, no downgrade edge, importer predicate uses `session_user` and is invoker, bookkeeping set, symmetric check, 16 policies, no `service_role` write grants, licence flags derived, append-only trigger, baseline events.                                                                                                                         |
| `src/lib/vitalis/db/evidence-lifecycle.integration.test.ts` | The behaviour above against real PostgreSQL: privileges, editor gate, the full graph including refusals, reason, stale version, version matrix, supersession target and immutability, retirement guard, last-citation guard, revision narration, overdue gate, queue, append-only log, approved-insert refusal, catalogue via the import path with attribution, catalogue refusal without it. |
| `src/lib/vitalis/db/evidence.integration.test.ts`           | The Phase 1 guarantees, updated: `service_role` can no longer update a claim; fixtures enter through the import path.                                                                                                                                                                                                                                                                         |
| `src/lib/vitalis/db/evidence-seed.integration.test.ts`      | P2.1 idempotency survives enforcement: the catalogue applies through the preamble, a rerun changes nothing, and the reconciliation refusals still fire.                                                                                                                                                                                                                                       |

## 15. Decisions register

Adopted, with the form actually implemented.

| Item | Decision                                                                       |
| ---- | ------------------------------------------------------------------------------ |
| C1   | Identity **and** flag, `SECURITY INVOKER`, compared to `'on'`.                 |
| C2   | Refuse only unreplaced demotion; supersession stays legal.                     |
| C3   | Content ⇒ `+1`; version may only move `+1`.                                    |
| C4   | `service_role` loses every direct write.                                       |
| C5   | Guarded `create role evidence_importer nologin` in the migration.              |
| C6   | `reviewed_on`, `review_interval_months` are bookkeeping.                       |
| C7   | 16 policies plus sequence usage.                                               |
| D1   | Role-gated import session; fails closed without the preamble.                  |
| D2   | Separate `evidence_editors`; reward admin ≠ medical approver.                  |
| D3   | `withdrawn` and `superseded` terminal.                                         |
| D4   | No version bump on a status change.                                            |
| D5   | No approval while a cited source is overdue.                                   |
| D6   | `service_role` writes revoked (same as C4).                                    |
| D7   | Immediate refusal, narrowed to unreplaced departures from `approved`.          |
| D8   | Symmetric supersession CHECK on claims, `not valid` then validated.            |
| D9   | Citations stay on the retired row; readiness is never inherited.               |
| D10  | No uniqueness on `evidence_revisions`.                                         |
| D11  | The version rule applies to imports; a bump without a content change is legal. |
| D12  | One lifecycle event per status change, written by the guard.                   |

## 16. Remaining uncertainty

| #   | Question                                                                          | Status after implementation                                                                                     |
| --- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| U1  | Does the production SQL editor / psql connect as a superuser?                     | **Open.** A superuser connection can enter the importer identity; application code must never hold one.         |
| U2  | Is `pg_catalog` reachable through PostgREST's exposed schemas?                    | **Open.** Project configuration.                                                                                |
| U3  | Do the two BEFORE triggers on claims fire in the assumed order?                   | **Open but immaterial.** Both fire; the error a caller sees may name either rule. No rule depends on the order. |
| U4  | Does a pooled connection behave like the reused client?                           | **Open.** Repeat T4 through the pooler before production.                                                       |
| U5  | Does `SET LOCAL SESSION AUTHORIZATION` inside a definer function behave the same? | **Not needed.** No RPC uses it; the runbook is a top-level transaction.                                         |
| U6  | Rolling back a cluster-level role                                                 | **Open.** Only the forward path has been exercised.                                                             |
| U7  | The full migration on an empty database, in final order                           | **Settled.** The harness applies 20261104 → 20261112 then the real catalogue; every suite passes.               |

Two further items surfaced during implementation and are recorded rather than
fixed:

- **Editor membership and erasure.** `evidence_editors.user_id` identifies a
  person, so Phase 1's "no per-person columns in evidence" test was scoped to the
  seven registry tables and says so. `erase_my_data()` does not remove an editor
  grant. Whether erasing an account should also drop editorial authority (and
  what happens to the `actor` uuid in history) is a product decision, not a
  mechanical one, and changing Phase 1 was outside this phase.
- **The revision-prose gap** in §4. Retained as documented and unresolved.

## 17. Out of scope

Phase 3 (application surfaces, editor UI, the seed generator's own changes),
staging and production application, deployment, custom domains, and any
refactoring of Phase 1 or the catalogue beyond the import preamble.
