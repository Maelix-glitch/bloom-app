# Bloom Vitalis — P2.2 verification report

**Status: verification only.** No migration, application source, catalogue,
licensing rule, seed generator or production configuration was changed. No
commit, no push, no Phase 3 work. Implementation has not begun.

Everything below was executed against a genuine **PostgreSQL 18.6** server on
`127.0.0.1:5433` during this session. Where a claim could not be executed it is
labelled **unverified** in §7 rather than asserted.

---

## 0. Method, environment and cleanup

| Aspect                      | Detail                                                                                                                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server                      | PostgreSQL **18.6** (`show server_version`)                                                                                                                                                          |
| Part 1 — identity mechanics | A throwaway database `bloom_verify_p22`, created and dropped inside the run; a real second connection authenticated as a **non-superuser login** (`bloom_verify_app`)                                |
| Part 2 — evidence behaviour | The existing integration harness: the **real** `20261104`, `20261105`, `20261106` migration files and the **real committed seed**, inside one transaction that the harness rolls back                |
| Proactive objects           | The _proposed_ lifecycle functions, triggers and events table were installed **inside the test transaction only**; the proposal became executable for the duration and disappeared with the rollback |
| Scaffolding                 | Two temporary files (`verify/c1-identity.mjs`, `src/lib/vitalis/evidence/__verify_p22.test.ts`); both removed (§0.2)                                                                                 |
| Results                     | Part 1: **26/26 checks passed**, exit 0. Part 2: **all checks passed**, exit 0                                                                                                                       |

### 0.1 How the proposal became executable without becoming a migration

Every SQL fragment in the design was run as written — the transition graph, the
import predicate, the lifecycle guard, the event log, the demotion guard — after
being installed against the real tables. Nothing was simulated, stubbed or
re-implemented in a different language. The `pg` driver executed the same text
PostgreSQL would execute in production.

### 0.2 Cleanup evidence

- The scratch database was dropped at the end of Part 1; `bloom_verify_app` and
  `evidence_importer` were dropped with it.
- Part 2's objects and rows lived in a transaction that was rolled back, so no
  evidence row, function, trigger or policy survives.
- The two scaffolding files were deleted; `git status --porcelain` and
  `git diff --stat` show no change under `src/`, `supabase/`, `scripts/`,
  `package.json` or `package-lock.json` attributable to this verification.

---

## 1. C1 — importer authentication: proof

### 1.1 The exact SQL that was executed

```sql
-- the predicate under test
create or replace function public.evidence_is_import_session()
returns boolean
language sql stable
set search_path = public, pg_temp
as $$
  select session_user = 'evidence_importer'
     and coalesce(current_setting('bloom.evidence_import', true), 'off') = 'on';
$$;

-- establishing a session
begin;
set local session authorization evidence_importer;
set local bloom.evidence_import = 'on';
select session_user, current_user, public.evidence_is_import_session();
commit;
```

### 1.2 Results — 26/26

| #   | Check                                                               | Observed                                                                             | Verdict |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------- |
| T1a | Identities inside the import transaction                            | `session_user=evidence_importer`, `current_user=evidence_importer`                   | pass    |
| T1b | Predicate inside the transaction                                    | `true`                                                                               | pass    |
| T1c | `SECURITY INVOKER` probe inside the transaction                     | `session_user=evidence_importer`, `current_user=evidence_importer`                   | pass    |
| T2a | Identities after **COMMIT**                                         | `session_user=postgres`, `current_user=postgres`                                     | pass    |
| T2b | Import flag after COMMIT                                            | not `'on'`                                                                           | pass    |
| T2c | Predicate after COMMIT                                              | `false`                                                                              | pass    |
| T3a | Identities inside a transaction                                     | `evidence_importer` / `evidence_importer`                                            | pass    |
| T3b | Identities after **ROLLBACK**                                       | `postgres` / `postgres`                                                              | pass    |
| T3c | Import flag after ROLLBACK                                          | not `'on'`                                                                           | pass    |
| T4  | Same connection, three subsequent uses                              | `postgres` / `postgres` each time                                                    | pass    |
| T4  | Predicate on reuse                                                  | `false`                                                                              | pass    |
| T5  | `SET LOCAL ROLE authenticated`                                      | `session_user=postgres`, `current_user=authenticated`                                | pass    |
| T6a | Genuine non-superuser connection                                    | `session_user=bloom_verify_app`                                                      | pass    |
| T6b | App role assuming the importer                                      | **`42501` — "permission denied to set session authorization \"evidence_importer\""** | pass    |
| T6c | App role assuming the owner                                         | `42501`                                                                              | pass    |
| T6d | App role `SET ROLE evidence_importer`                               | `42501`                                                                              | pass    |
| T7a | App role sets the GUC                                               | GUC reads `'on'`                                                                     | pass    |
| T7b | **GUC alone, as the app role**                                      | predicate `false`                                                                    | pass    |
| T7c | Invoker probe as the app role                                       | `session_user=bloom_verify_app`, `current_user=bloom_verify_app`                     | pass    |
| T7d | Definer probe as the app role                                       | `session_user=bloom_verify_app`, `current_user=postgres`                             | pass    |
| T8a | `SET SESSION AUTHORIZATION authenticated` from the owner connection | succeeds                                                                             | pass    |
| T8b | **The design's original predicate**, as a non-member                | **`true`**                                                                           | pass    |
| T9a | `SET LOCAL SESSION AUTHORIZATION` outside a transaction             | identity unchanged                                                                   | pass    |
| T9b | Notice emitted                                                      | `SET LOCAL can only be used in transaction blocks`                                   | pass    |
| T10 | Role attributes                                                     | `canlogin=false, super=false, bypassrls=false, createdb=false, createrole=false`     | pass    |

### 1.3 Three things the first attempt got wrong, and what they prove

**The first run was invalid and its results were misleading.** I ran the escalation
tests on a connection opened as the superuser and switched with `SET ROLE`. There,
`SET SESSION AUTHORIZATION evidence_importer` **succeeded** — because PostgreSQL
judges that privilege by the connection's **initial authenticated user**, not by
`current_user`. The corrected run, with a genuine non-superuser login, refuses it
with `42501` (T6b).

This has three consequences worth stating plainly:

1. **The gate is only as strong as the connection that holds it.** Any connection
   authenticated as a superuser can enter the importer identity. That is the
   operator's psql/SQL-editor session, and it can do anything anyway — but it is
   also why a superuser connection must never be handed to application code.
2. **`SET ROLE` is not an identity.** T5 shows it changes `current_user` only, so a
   test or a helper that uses `SET ROLE` cannot prove or disprove anything about
   the import gate. My first attempt is the demonstration.
3. **The original predicate returned `true` for a non-member** (T8b), because
   inside `SECURITY DEFINER` `current_user` is the owner (`postgres`, T7d). C1 is
   not a theoretical concern; it was reproduced.

### 1.4 The one behavioural nuance to carry into the implementation

After the transaction ends, the custom setting does **not** read as `NULL`; it
reads as the **empty string** (T2b, T3c). A predicate written as
`current_setting('bloom.evidence_import', true) is not null` would therefore be
true on an idle connection. The design's form — compare to `'on'` — is safe, and
this fact must stay in the comment beside it.

### 1.5 Verdict

**C1 is proven, not inferred.** The mechanism does what the design claims:
identity inside the transaction, reversion after both COMMIT and ROLLBACK, no
retention on a reused connection, no path from an application role, and no
authorisation from the flag alone.

---

## 2. C2 — supersession and product-readiness

### 2.1 Executed chain (real tables, real gates)

| Step                                                                    | Observed                                                                                                                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Supersede a cited source (`v-a → v-r`)                                  | **allowed**; the corrected D7 rule does not block it                                                                         |
| After supersession                                                      | `review_status='superseded'`, `superseded_by='v-r'`, title preserved, **1 citation retained**, citing claim still `approved` |
| Clear the supersession pointer                                          | **`42501`** — "supersession on evidence_sources is immutable once recorded"                                                  |
| Re-approve the claim still citing the retired source                    | **`23514`** — "claim v-c cannot be approved: source v-a is not approved for product use"                                     |
| Point the citation at a replacement carrying `nin-copyright-restricted` | **`23514`** — "claim v-c cannot be approved: source v-r is not approved for product use"                                     |
| Make the replacement `cc-by-4.0` and re-approve                         | **succeeds**; `review_status='approved'`                                                                                     |
| Withdraw a source cited by an approved claim                            | **`23514`** — "source v-x cannot leave approved without a replacement while approved claim(s) cite it: v-y"                  |
| Supersede that same source                                              | **succeeds**                                                                                                                 |

Readiness predicate, executed against the real `registry.ts`:

| Scenario                                 | `isProductReady` |
| ---------------------------------------- | ---------------- |
| Source live, approved, licensed, in date | `true`           |
| Source **superseded**                    | `false`          |
| Replacement **unlicensed**               | `false`          |
| Source **overdue**                       | `false`          |

`traceability()` on the superseded fixture: `stalledRecommendations = ["r1"]`,
`overdue = []` — the recommendation citing the stranded claim is reported, so
nothing bypasses the predicate.

### 2.2 Finding F1 — the approved claim is frozen, not silently ready

When a cited source is superseded, the **pre-existing** approval gate
re-validates the claim on every `UPDATE`. A version bump on such a claim is
refused:

```
23514  claim v-y cannot be approved: source v-x is not approved for product use
```

This is an interaction I had not predicted. It is **correct behaviour** — an
approved claim resting on retired evidence should not be editable while still
approved — but it has a real consequence: **the only way out is a status change**
(`approved → in_review`), which withdraws approval and forces re-review.

Two things follow, and one of them is a correction to my own C2 test expectation:

- The claim cannot "remain product-ready merely because it is still approved": it
  is not product-ready, and it cannot even be edited without demoting it first.
- A **re-review version bump with unchanged text** is only demonstrable on a claim
  whose sources are all live (it was verified there: `C3 re-review bump with
unchanged text → ok`).
- **Recommendation:** document F1 in the methodology, because it is surprising in
  exactly the way operators will trip over. No schema change is needed.

### 2.3 Verdict

**C2 is proven and stronger than claimed.** The historical relationship survives,
the replacement must satisfy approval, licensing and review independently, and no
consumer can bypass readiness — the type system and the database agree.

---

## 3. C3 — versioning and revision consistency

### 3.1 Correction C6 — the bookkeeping set was incomplete

The rule was executed exactly as written in the design first. **The real seed
failed**:

```
23514  editing evidence_claims dga-whole-foods-emphasis requires version 2 (was 1)
```

The seed's status pass writes `reviewed_on` (and `review_interval_months`) on a row
at the same version. Under the narrow bookkeeping set those columns counted as
_content_, so the rule demanded a version bump the seed does not make.

With `reviewed_on` and `review_interval_months` added to the bookkeeping set — they
are review facts, not content — the seed applied cleanly: **6 sources, 4 claims,
3 citations, 4 revisions, 13 lifecycle events**, and a second application changed
**nothing** (claims identical, **0** new events).

This is a genuine defect in the design document, caught only by executing it. It is
the third such correction after C1 and C2.

### 3.2 Version matrix, as executed

| Case                                                     | Observed                                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Content change, same version                             | **`23514`** — "editing evidence_claims v-c requires version 2 (was 1)"                                     |
| Content change, skip to `+2`                             | **`23514`** — same                                                                                         |
| Content change, version decreasing                       | **`23514`** — same                                                                                         |
| Content change with exactly `+1`                         | **accepted**                                                                                               |
| Version `+1` with **no** content change (re-review)      | **accepted**                                                                                               |
| Version skip with **no** content change (clause 2 alone) | **`23514`** — "version on evidence_claims v-c may only increase by one"                                    |
| Rewrite a revision                                       | **`42501`** — "evidence_revisions is append-only and cannot be updated"                                    |
| Rewrite a lifecycle event                                | **`42501`** — "evidence_lifecycle_events is append-only and cannot be updated"                             |
| Status change with no reason                             | **`22023`** — "a status change on evidence_claims v-y needs a reason"                                      |
| Status change with a reason                              | accepted; event `actor=1111…1111`, `actor_label=editor:1111…1111`, `reason='withdrawn after verification'` |

Seed reruns: **no version change, no timestamp change, no new events** — the P2.1
idempotency test's premise survives enforcement.

### 3.3 Documented limitation, retained

An editor can bump a version without narrating the change in `evidence_revisions`.
The lifecycle event records _that_ a version change happened and why; it does not
record what the text said. Closing that needs either a snapshot per edit or a
mandatory-prose workflow — both larger than this phase. **Retained as documented,
unresolved.**

### 3.4 Verdict

**C3 is proven**, with **C6** as a required correction to the design: the
bookkeeping set must include `reviewed_on` and `review_interval_months`, and the
seed's pass depends on it.

---

## 4. C4 — `service_role` restrictions

### 4.1 The exact assertion that must change

`src/lib/vitalis/db/evidence.integration.test.ts:131-134`, verbatim:

```ts
expect(
  await db.one<boolean>(
    "select has_table_privilege('service_role', 'public.evidence_claims', 'UPDATE')",
  ),
).toBe(true);
```

Observed before revocation: **`true`**. After revocation: **`false`**. This is the
only existing assertion the change invalidates; `:139-146` (no `UPDATE`/`DELETE` on
revisions) stays true.

### 4.2 Dependencies affected

| Dependency                                             | Effect                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `src/lib/supabase.ts` (anon client)                    | none — never touched evidence                                                                       |
| Application features                                   | none — no evidence writes exist                                                                     |
| `supabase/functions/push-send`                         | none — `push_subscriptions` only                                                                    |
| Seed application                                       | moves to the import path (§1)                                                                       |
| `src/lib/vitalis/db/evidence.integration.test.ts`      | **one assertion flips**                                                                             |
| `src/lib/vitalis/db/evidence-seed.integration.test.ts` | needs the importer role provisioned in the harness, and the seed run wrapped in the import preamble |
| `harness.ts` `MIGRATION_FILES`                         | must list the new migration                                                                         |
| `evidence-migration.test.ts`                           | unaffected — it asserts text inside the 2026-11-06 file                                             |

### 4.3 RPC permissions after revocation

| Check                              | Observed                                                        |
| ---------------------------------- | --------------------------------------------------------------- |
| `service_role` direct `UPDATE`     | **`42501`** — "permission denied for table evidence_claims"     |
| `anon` execute on the RPC          | `false`                                                         |
| `authenticated` execute on the RPC | `true`                                                          |
| RPC as an editor, after revocation | **succeeds** — the definer owner writes where the client cannot |
| RPC as a non-editor                | **`42501`** — "not an evidence editor"                          |
| RPC with a stale expected version  | **`40001`** — "claim v-c is at version 4"                       |

### 4.4 Verdict

**C4 is proven.** Revocation does not break the editorial workflow: the definer RPC
writes as its owner, and the client's lack of table privileges is precisely what
makes the RPC the only route.

**This needs your explicit decision**, because it changes a test the closure
directive froze.

---

## 5. C5 — permissions and migration

| Check                                         | Observed                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Guarded `create role … nologin` applied twice | **second application succeeded** (idempotent)                                                           |
| Role attributes                               | `canlogin=false, super=false, bypassrls=false, createdb=false, createrole=false`                        |
| Importer reading Phase 1 health data          | **`42501`** — "permission denied for table health_profiles"                                             |
| Importer reading the lifecycle log            | also denied by default; the operator steps out (§5.1)                                                   |
| Migration execution role                      | all DDL ran as the owner (`postgres`), which is what the harness uses to apply the real migration files |

### 5.1 Correction C7 — sixteen policies, not twelve

The design said "twelve explicit policies". Executing the importer's workload
required **sixteen**: read/write/update on sources, claims, citations and
recommendations (12), read/write on recommendation links (2), read/write on
revisions (2). The importer also needs `usage` on the revisions sequence. A design
that under-specifies this fails on the first import with a permission error.

Because the importer holds **no** `SELECT` on `evidence_lifecycle_events`, the
verification had to step out of importer mode to read the log. That is correct and
worth keeping: the importer writes history it cannot read back.

### 5.2 Verdict

**C5 is proven**, with **C7** as a correction (16 policies, plus sequence usage).

---

## 6. Decision matrix

Legend: **Y** = needs your explicit product/architectural decision. **N** =
mechanical, covered by approving the design.

### Corrections

| Item   | Final recommendation                                                                                   | Evidence                                                                       | Security                                                       | Operational                                                                                 | Remaining uncertainty                             | Yours |
| ------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----- |
| **C1** | Adopt the tested predicate: `session_user = 'evidence_importer'` AND flag `= 'on'`, `SECURITY INVOKER` | 26/26 checks; T6b `42501`; T7b false; T8b shows the defect                     | Removes the authorisation hole in the original text            | Operator must set identity + flag; `SET LOCAL` outside a transaction is a silent no-op (T9) | None material; see §7 on the superuser connection | **Y** |
| **C2** | Keep supersession legal; refuse only unreplaced demotion                                               | Withdrawal `23514` naming the claim; supersession accepted; citations retained | Prevents silent stranding without blocking the retirement path | To retire a source, supersede it; to withdraw one in use, retire the claim first            | None                                              | **Y** |
| **C3** | Two clauses: content ⇒ `+1`; version may only move `+1`                                                | Full matrix §3.2, including clause 2 in isolation                              | Keeps "a version identifies a text" true                       | Catalogue edits must raise `version`                                                        | Revision-prose gap retained (§3.3)                | **Y** |
| **C4** | Revoke `service_role` writes; editorial writes only through definer RPCs                               | §4.3; one assertion flips                                                      | Closes the leaked-key rewrite path                             | Owner SQL for emergencies; harness gains grants                                             | Authorising the test change                       | **Y** |
| **C5** | Guarded `create role` inside the migration                                                             | Idempotent twice; attributes verified                                          | No `BYPASSRLS`, no login, no password                          | Migration must run as a role able to create roles                                           | Production runner role (§7)                       | **Y** |
| **C6** | Add `reviewed_on` and `review_interval_months` to the bookkeeping set                                  | The real seed failed with the narrow set (`23514`), passed with the wide one   | None — review facts are not content                            | Without it, every seed run fails                                                            | None                                              | N     |
| **C7** | Specify 16 policies + sequence usage for the importer                                                  | Importer workload executed end to end                                          | Least privilege; no log read                                   | None                                                                                        | None                                              | N     |

### Open decisions

| Item    | Final recommendation                                        | Evidence                                                     | Security                                           | Operational                                          | Remaining uncertainty                 | Yours |
| ------- | ----------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------- | ------------------------------------- | ----- |
| **D1**  | Role-gated import session, as tested                        | Seed applied, 13 attributed events, rerun a no-op            | Flag inert without identity; app role refused (§1) | Three-line preamble; fails closed without it         | None                                  | **Y** |
| **D2**  | Separate `evidence_editors` table                           | Real `evidence_is_editor` used by the tested RPC             | Reward admin ≠ medical approver                    | One grant step per editor                            | None                                  | **Y** |
| **D3**  | `withdrawn`/`superseded` terminal                           | Pointer immutability enforced (`42501`)                      | Prevents revival without review                    | A returning claim needs a new id                     | None                                  | **Y** |
| **D4**  | No version bump on status change                            | Seed lands claims at version 1 in three statuses             | Decisions are logged, not counted in `version`     | Stable version across review                         | None                                  | **Y** |
| **D5**  | No approval while a cited source is overdue                 | Overdue fixture ⇒ `isProductReady=false`                     | Blocks stale-evidence approval                     | Nothing overdue today (all `reviewed_on` 2026-11-05) | Policy choice for you                 | **Y** |
| **D6**  | Revoke `service_role` writes                                | §4                                                           | Closes the most exposed write path                 | One test assertion flips                             | None                                  | **Y** |
| **D7**  | Immediate refusal, narrowed to unreplaced demotion          | §2.1, both directions                                        | No silent stranding                                | Supersede to retire                                  | Deferred-trigger alternative untested | **Y** |
| **D8**  | Symmetric supersession CHECK on claims                      | No current row violates it; F1 shows the gate already reacts | Removes contradictory state                        | `not valid` then validate                            | None                                  | N     |
| **D9**  | Citations stay on the retired row                           | Supersession retained the citation in §2.1                   | No inherited approval                              | Re-citation required                                 | None                                  | **Y** |
| **D10** | No uniqueness on `evidence_revisions`                       | Seed uses `not exists`; no constraint exists                 | None                                               | Allows two notes per version                         | None                                  | N     |
| **D11** | Bump rule applies to imports; bump without content is legal | Seed passes; re-review bump accepted                         | No silent text rewrite                             | Catalogue must bump `version`                        | None                                  | **Y** |
| **D12** | One lifecycle event per row                                 | 13 events for 10 catalogue rows + 3 status moves             | Row-level attribution                              | 13 rows; linear                                      | None                                  | N     |

### Nothing is recommended for rejection

No decision survived confirmation as wrong. Five were **revised before this
report** (C1–C5) and two more were revised **by this verification** (C6, C7). The
remaining twelve are recommended as stated.

---

## 7. Remaining uncertainty

| #   | Question                                                                                     | Why it is unresolved                                                          | Test that would settle it                                          |
| --- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| U1  | Does the Supabase production SQL editor / psql connect as a superuser?                       | Local cluster only; a superuser connection can enter the importer (§1.3)      | Run the preamble once against a scratch Supabase project           |
| U2  | Is `pg_catalog` reachable through PostgREST's exposed schemas?                               | Project configuration, not testable here                                      | Review the project's exposed schema list                           |
| U3  | Do the two BEFORE triggers on claims fire in the name order assumed?                         | Both were installed and both fired, but their relative order was not asserted | A test with a claim that fails both rules and inspecting the error |
| U4  | Does a pooled connection (pgbouncer) behave like the reused `pg` client?                     | Only a direct connection was tested                                           | Repeat T4 through the pooler                                       |
| U5  | Does `SET LOCAL SESSION AUTHORIZATION` inside a `SECURITY DEFINER` function behave the same? | Not needed by the design, not tested                                          | Explicit test if a future RPC wants it                             |
| U6  | Rollback of a cluster-level role                                                             | Not exercised                                                                 | Run the reverse script on a scratch project                        |
| U7  | The full migration on an empty database with all objects in final order                      | Only the proposal's pieces were installed, not the complete file              | First implementation run                                           |

U1 and U2 are configuration facts about the deployment, not about PostgreSQL, and
neither can be settled from this machine.

---

## 8. What this verification changes in the design

1. **C6** — add `reviewed_on` and `review_interval_months` to the bookkeeping set.
   Without it the seed cannot run at all.
2. **C7** — the importer needs **16** policies and sequence usage, not 12.
3. **F1** — document that an approved claim resting on a superseded source is
   frozen until it is demoted; that is intended, and surprising.
4. **GUC nuance** — after the transaction, the flag reads as `''`, not `NULL`;
   the predicate must compare to `'on'` and say so in a comment.
5. **Test plan** — the 28-case plan gains: importer identity inside/after
   COMMIT and ROLLBACK, the non-superuser escalation refusal, the GUC-alone case,
   the 16-policy grant, and F1.

Everything else in `docs/vitalis-p2.2-lifecycle-design.md` and
`docs/vitalis-p2.2-design-review.md` stands as written.

---

## 9. Request for approval

Implementation remains unstarted. The items needing your decision, in the order
that matters:

1. **C1** — the tested importer predicate (identity + flag, `SECURITY INVOKER`).
2. **C6, C7** — the two corrections this run produced.
3. **C4** — authorising the single test assertion to flip, plus the harness gains
   (importer role, `MIGRATION_FILES`, seed preamble).
4. **C2, C3, C5** — as revised.
5. **D1–D12** — as recommended in §6.
