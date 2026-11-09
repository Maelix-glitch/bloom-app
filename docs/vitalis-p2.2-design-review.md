# Bloom Vitalis — P2.2 lifecycle design: technical review

**Status: review only.** No migration, application source, catalogue, licensing
rule, seed generator or database object has been changed. Nothing has been
committed or pushed. This document reviews the design in
`docs/vitalis-p2.2-lifecycle-design.md` and makes one recommendation per open
decision.

Every statement below is tagged:

| Tag     | Meaning                                                                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[V]** | **Verified** against the repository in this review, with the file cited. Not an assumption                                                           |
| **[A]** | **Assumption** — believed correct, not yet exercised against the real server. Listed together in Part G.8 so it can be checked before implementation |
| **[R]** | **Recommendation** — a design choice I am proposing                                                                                                  |

**Five corrections to the design document come out of this review.** They are
listed first because they change the answer to D1, D6, D7 and D11.

| #   | The design said                                                                                | Verification found                                                                                                                                                                                                     | Corrected position                                                                                               |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| C1  | `evidence_is_import_session()` uses `pg_has_role(current_user, 'evidence_importer', 'member')` | **[V]** The function is `SECURITY DEFINER`, so inside it `current_user` is the _owner_, not the caller; and a superuser membership test is vacuously true. The predicate would authorise every session that reaches it | Part B.2: exact `session_user` equality, `SECURITY INVOKER`, GUC demoted to a mode flag                          |
| C2  | A source may not leave `approved` while an approved claim cites it                             | **[V]** That also blocks `approved → superseded`, which is the _designed_ retirement path, making supersession of any cited source impossible                                                                          | Part A/C: block unreplaced demotions only; supersession stays allowed                                            |
| C3  | `version` may not change without a content change                                              | **[V]** The seed's content upsert compares whole rows including `version`, so a legitimate catalogue version bump with unchanged text would be refused                                                                 | Part E: version may only move by exactly +1; it need not accompany a content change                              |
| C4  | Revoke `service_role` writes                                                                   | **[V]** An existing passing test asserts `service_role` holds `UPDATE` on `evidence_claims`                                                                                                                            | Part D.5: the revocation needs an authorised test change at implementation, and that is a decision, not a detail |
| C5  | The importer role is created by the operator, not the migration                                | **[V]** `grant … to evidence_importer` and RLS policies naming it fail if the role is absent                                                                                                                           | Part B.6: guarded `create role` inside the migration, no login, no password                                      |

---

# Part A — Verified facts

These are the load-bearing facts for every recommendation that follows. Nothing
in this part is a proposal.

| #   | Fact                                                                                                                                                                                                                                                                     | Evidence                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Nothing in the application writes evidence. The only Supabase client in `src/` is the browser client using the **anon** key, and it never references an `evidence_*` table                                                                                               | **[V]** `src/lib/supabase.ts:35`; repository search for `evidence_(sources\|claims\|…)` under `src/` returns only tests, the generator and the domain modules |
| A2  | The only `service_role` consumer in the repository is the push function, and it touches `push_subscriptions` only                                                                                                                                                        | **[V]** `supabase/functions/push-send/index.ts:213-227`                                                                                                       |
| A3  | `service_role` currently holds `select, insert, update` on sources, claims and recommendations; `select, insert, update, delete` on citations; `select, insert, delete` on recommendation links; `select, insert` on revisions                                           | **[V]** `20261106_vitalis_evidence_foundation.sql:346-378`                                                                                                    |
| A4  | A test asserts `has_table_privilege('service_role','public.evidence_claims','UPDATE')` is **true**, and that `service_role` cannot `UPDATE` or `DELETE` revisions                                                                                                        | **[V]** `src/lib/vitalis/db/evidence.integration.test.ts:131-146`                                                                                             |
| A5  | A test asserts the literal grant statements exist in the 2026-11-06 migration file (so a later migration that revokes does not break it)                                                                                                                                 | **[V]** `src/lib/vitalis/evidence/evidence-migration.test.ts:114-117`                                                                                         |
| A6  | A test asserts the generated seed never mentions `service_role` or any service key                                                                                                                                                                                       | **[V]** `src/lib/vitalis/evidence/seed/seed.test.ts:196-197`                                                                                                  |
| A7  | The transition graph in `review.ts` has exactly ten edges: `draft→{in_review,withdrawn}`, `in_review→{approved,rejected,draft}`, `approved→{superseded,withdrawn,in_review}`, `rejected→{draft,withdrawn}`, `superseded→{}`, `withdrawn→{}`                              | **[V]** `src/lib/vitalis/evidence/review.ts:43-50`                                                                                                            |
| A8  | The seed's first write is a `do` block that raises if the three evidence tables are absent; the seed contains no `begin`/`commit` of its own and is applied with `--single-transaction` or inside the SQL editor's manual transaction                                    | **[V]** `supabase/seeds/20261107_vitalis_evidence_catalog.sql:44-57` and `:30-37`                                                                             |
| A9  | The seed inserts sources **with their recorded status** (`approved`, `superseded`)                                                                                                                                                                                       | **[V]** same file, source upsert at `:341-369`                                                                                                                |
| A10 | The seed inserts claims, then moves each to its recorded status in a **separate** `update`, writing `version`, `reviewed_on`, `review_interval_months`, `superseded_by`, `updated_at`                                                                                    | **[V]** same file, `:601-700`; four claims land as `approved`, `in_review`, `in_review`, `draft`                                                              |
| A11 | The seed's content upsert is `insert … on conflict do update … where excluded.version >= target.version and to_jsonb(excluded) - 'created_at' - 'updated_at' is distinct from to_jsonb(target) - …` — a whole-row comparison that includes `version` and `review_status` | **[V]** same file, `:330-350`; the same generator function serves both entities (`src/lib/vitalis/evidence/seed/sql.ts:406`)                                  |
| A12 | The seed's reconciliation refuses five categories of divergence (unknown rows, newer versions, cleared supersession, reviewed→draft, changed citations/links) before any write                                                                                           | **[V]** same file, sections `reconciliation`; `docs/vitalis-evidence-seed.md`                                                                                 |
| A13 | `evidence_claims` has **no** symmetric supersession constraint; a claim may carry `superseded_by` while `approved`                                                                                                                                                       | **[V]** `20261106…sql` `constraint evidence_claims_superseded_pointer` is one-directional; sources use equality                                               |
| A14 | `evidence_claim_sources.claim_id` cascades on claim delete; `source_id` restricts; `evidence_recommendation_claims.claim_id` restricts                                                                                                                                   | **[V]** same file, table definitions                                                                                                                          |
| A15 | No role holds `DELETE` on `evidence_claims` or `evidence_sources`, so the cascade in A14 is unreachable except by the owner                                                                                                                                              | **[V]** same file, grant block                                                                                                                                |
| A16 | The approval gate and the citation gate are `SECURITY DEFINER` with a pinned `search_path`, and `revoke all … from public, anon, authenticated`                                                                                                                          | **[V]** same file, both functions                                                                                                                             |
| A17 | The integration harness runs as the superuser `postgres` and switches identity with `set local role`; `session_user` therefore stays `postgres` for the whole test                                                                                                       | **[V]** `src/lib/vitalis/db/harness.ts`, `setRole`                                                                                                            |
| A18 | The harness can create cluster roles inside the test transaction, guarded by `if not exists`                                                                                                                                                                             | **[V]** `harness.ts`, `seedBaseDb` role block                                                                                                                 |
| A19 | `evidence_revisions` has no uniqueness on `(entity_type, entity_id, version)`; the seed prevents duplicates with `where not exists`                                                                                                                                      | **[V]** `20261106…sql`; seed `:695-707`                                                                                                                       |
| A20 | `isProductReady()` already requires approval, non-supersession, in-date review **and** every cited source approved, licensed, unsuperseded and in date; `traceability()` already reports `stalledRecommendations`                                                        | **[V]** `src/lib/vitalis/evidence/registry.ts`                                                                                                                |

---

# Part B — D1: authorised evidence imports

The design needed this to be a labelled origin rather than a bypass. As written it
was neither — the predicate was unsound (**C1**). Here is the corrected model.

## B.1 The two-layer rule

**[R]** An import requires **both** of:

1. **Identity**: `session_user = 'evidence_importer'` — exact equality on the
   _session_ role, which the caller cannot change without superuser rights.
2. **Mode**: `current_setting('bloom.evidence_import', true) = 'on'` — a
   transaction-local flag.

Neither is sufficient alone. The GUC is never the authorisation; it is a switch
that says "this session intends an import", and it only means anything inside a
session that is already the importer.

```sql
-- Corrected. SECURITY INVOKER (it touches nothing but session state), and the
-- identity test is session_user, not current_user.
create or replace function public.evidence_is_import_session()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select session_user = 'evidence_importer'
     and coalesce(current_setting('bloom.evidence_import', true), 'off') = 'on';
$$;

revoke all on function public.evidence_is_import_session() from public;
revoke all on function public.evidence_is_import_session() from anon;
revoke all on function public.evidence_is_import_session() from authenticated;
```

Why `session_user` and not `current_user`:

- **[V]** inside a `SECURITY DEFINER` function `current_user` is the owner, so the
  design's predicate compared the _owner_ against the role list — it would have
  returned true for every caller.
- **[V]** a superuser is a member of every role for `pg_has_role`, so even a
  correctly-placed membership call is vacuous when the owner is `postgres`.
- `session_user` is set at authentication and changes only through
  `SET SESSION AUTHORIZATION`, which itself requires superuser (**[A]** to be
  exercised in test T26).

## B.2 How importer identity is authenticated

**[R]** PostgreSQL authenticates the connection; there is no second credential.

- `evidence_importer` is created `NOLOGIN` and **without a password**. It cannot
  be connected to, so there is no importer secret to leak, rotate or commit.
- It is entered only by a session that already holds administrative rights, using
  `SET LOCAL SESSION AUTHORIZATION evidence_importer` inside the seed
  transaction. That statement is superuser-only and transaction-scoped.
- Therefore: **importer identity = "an already-privileged administrative session
  deliberately assumed the importer role for one transaction"**. The gate does not
  create authority; it makes the exercise of existing authority explicit,
  narrow and attributed.

**[A]** `SET LOCAL SESSION AUTHORIZATION` reverts at `COMMIT`/`ROLLBACK`. If it
behaved as a session-wide switch, a pooled connection could carry the identity
into a later request — the single most important behaviour to verify (T26).

## B.3 How import permissions are verified

**[R]** Two independent checks, neither of which can be satisfied by a client:

| Check                                     | Mechanism                                                                | What it cannot be forged into                 |
| ----------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------- |
| May this session write at all?            | ordinary table grants to `evidence_importer` plus RLS policies naming it | a client holds no grant and matches no policy |
| May this session _move status_ off-graph? | `evidence_is_import_session()` inside the lifecycle trigger              | a client cannot set `session_user`            |

**[R]** Grants to `evidence_importer`: `select, insert, update` on sources,
claims, citations and recommendations; `select, insert` on recommendation links;
`select, insert` on revisions plus `usage` on its sequence. **No `delete`
anywhere** — which turns the P2.1 "the seed never deletes" promise into a
privilege rather than a habit (**[V]** A3 shows `service_role` currently _does_
hold `delete` on two of these tables; D6 removes that).

**[R]** No `BYPASSRLS`. A role with that attribute would also bypass row security
on the Phase 1 health tables, i.e. read every user's observations — a privilege
escalation far beyond importing a catalogue. Instead, twelve explicit policies
(`select` and `insert`/`update`, on six tables) scoped `to evidence_importer`
**[A]** no policy conflict with the existing `authenticated` read policies,
because policy predicates are OR-ed per role.

## B.4 How an import session is established

**[R]** One preamble, three statements, all transaction-local, in the same
transaction as the seed:

```sql
begin;
set local session authorization evidence_importer;
set local bloom.evidence_import = 'on';
set local bloom.evidence_reason = 'catalogue sha256:<hash>, applied by <operator>';
-- \i supabase/seeds/20261107_vitalis_evidence_catalog.sql
commit;
```

Both documented paths survive unchanged (**[V]** A8):

- **psql**: the preamble goes in the operator's wrapper, before `-f`, inside a
  `--single-transaction` invocation. The seed file itself is not touched — which
  is required, because a generator change is not authorised and the seed must
  never contain role logic (**[V]** A6).
- **SQL editor**: paste the preamble, the seed, and `commit;` into one editor
  transaction.

Filesystem note for the wrapper: it is a new operator script under `scripts/`, not
a change to the generator.

## B.5 How session privilege is prevented from being forged or reused

| Vector                                                        | Why it fails                                                                                                                                           | Status                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| A signed-in user sets the GUC                                 | PostgREST issues no caller-supplied SQL and exposes only the configured schemas; even a successful `set_config` leaves `session_user` = the JWT's role | **[A]** that `pg_catalog` is not in the exposed schema list is a project setting to confirm |
| A signed-in user sets the GUC _and_ becomes importer          | `SET SESSION AUTHORIZATION` requires superuser; the JWT role is not                                                                                    | **[V]** A3/A17                                                                              |
| A leaked `service_role` key                                   | That key authenticates as `service_role`, not as a superuser; the identity test fails before the GUC is read                                           | **[R]** the two checks are AND-ed, so the flag alone is inert                               |
| The GUC persists into the next request on a pooled connection | It is `SET LOCAL`, and the identity switch is `SET LOCAL`; both end at commit                                                                          | **[A]** verified by T26                                                                     |
| The seed reuses a privilege it was granted once               | There is no standing membership to reuse: `NOLOGIN`, no password, no `grant … to authenticated`                                                        | **[V]** by construction                                                                     |
| An editor RPC reaches the import branch                       | No RPC sets the flag, and every RPC runs as an editor whose `session_user` is its own JWT role                                                         | **[V]** A16 pattern                                                                         |
| Retry after a failed import inherits authorisation            | The transaction aborted; `psql --single-transaction` exits; a retry re-enters the preamble                                                             | **[A]** wrapper behaviour                                                                   |

**Attribution.** **[R]** The AFTER trigger writes one `evidence_lifecycle_events`
row per changed row: `actor` null, `actor_label = 'seed:import'`, `reason` copied
from `bloom.evidence_reason`, `occurred_at = now()`. The seed's own
`evidence_revisions` rows continue to record `changed_by = 'vitalis-evidence-registry'`.

Honest limitation (**[R]**, to be stated in the runbook): `session_user = 'evidence_importer'`
cannot distinguish _which_ administrator ran the import. With `NOLOGIN` there is
no per-operator identity to distinguish. The `reason` string is the only carrier
of "who", so the wrapper must include the operator's name — and a reader must
treat it as an unverified claim, because a superuser could write anything there.

## B.6 What the import path may still not do

| Prohibition                                    | Enforced by                                                         | Unchanged from P2.2 |
| ---------------------------------------------- | ------------------------------------------------------------------- | ------------------- |
| Write rows the catalogue does not describe     | seed reconciliation                                                 | **[V]** A12         |
| Approve a claim whose citations are unlicensed | `evidence_claims_approvable` still fires on every insert and update | **[V]** A16, A10    |
| Mark a source usable against its licence       | two CHECK constraints                                               | **[V]** A3          |
| Clear a recorded supersession                  | unconditional trigger condition                                     | **[R]**             |
| Degrade an approved row to draft               | not in the graph, and the import branch skips only the graph        | **[R]**             |
| Revert a newer version                         | `excluded.version >= target.version`                                | **[V]** A11         |
| Import without a reason                        | `bloom.evidence_reason` required; event insert fails closed         | **[R]**             |

So: the import skips **the transition graph only**, because its whole purpose is to
establish rows that already have a reviewed status in the catalogue. Everything
that decides whether material may ship still runs.

## B.7 The role must be created by the migration (**C5**)

**[V]** `grant … to evidence_importer` and `create policy … to evidence_importer`
both fail if the role does not exist, so an operator prerequisite would make a
failed migration the normal outcome of a forgotten step. **[R]** the migration
creates it idempotently, before any grant:

```sql
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'evidence_importer') then
    create role evidence_importer nologin;
  end if;
end
$$;
```

`nologin`, no password, no `superuser`, no `bypassrls`, no `createdb`,
no `createrole`. On rollback the role is left in place: it owns nothing and
holds no grants after the reverse script, and the guarded create makes a re-apply
clean.

---

# Part C — D5: overdue supporting evidence

## C.1 The four concepts, separated

| Concept                           | What it is                                                                        | Where it lives                                                                   | Changes when a source ages?                     |
| --------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Claim approval**                | an editorial decision that this sentence may be used, taken by a person on a date | stored: `evidence_claims.review_status` + `reviewed_on`                          | **No.** Nobody re-decides because a clock moved |
| **Product-readiness eligibility** | whether this claim may be _shown in a product right now_                          | derived: `isProductReady()` **[V]** A20                                          | **Yes, immediately**, without a write           |
| **Historical preservation**       | the record of what was reviewed, when, by whom, against what                      | stored: statuses, citations, `evidence_revisions`, `evidence_lifecycle_events`   | **Never**                                       |
| **Recommendation generation**     | producing a rule that a person will be shown                                      | not implemented in Phase 2; `evidence_recommendations` records traceability only | must consult product-readiness, not approval    |

The essential point **[R]**: approval is an _event_, product-readiness is a
_predicate_. Collapsing them would make evidence expire silently, which is a state
change nobody authorised.

## C.2 What happens when a source becomes overdue after its claim was approved

Sequence, all **[V]** against `registry.ts` and the proposed design:

1. `evidence_sources.reviewed_on + review_interval_months` passes `current_date`.
   **No row is written.** The source stays `approved`; the claim stays `approved`.
2. `isReviewOverdue(source)` returns true, so `isProductReady(claim)` returns
   false — the claim is approved and **not** product-ready.
3. `traceability()` files the claim under `overdue` and every recommendation
   citing it under `stalledRecommendations`.
4. The new `evidence_review_due` view and `evidence_review_queue()` make the same
   rows visible inside the database, so this does not depend on a bundle being
   rebuilt.
5. Any _new_ recommendation must be gated on `isProductReady`, evaluated
   server-side at `current_date` — never on `review_status = 'approved'` alone.

## C.3 Where the database enforces it, and where it does not

| Rule                                                            | Layer                                                  | Rationale                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| A claim may not be **approved** while a cited source is overdue | **[R]** database, extra condition in the approval gate | approval on expired confirmation is the same defect as approval without a citation                 |
| An already-approved claim is **not** demoted when a source ages | deliberately **not** enforced anywhere                 | automatic demotion is an unreviewed state change, and it would destroy the record of what was true |
| Product-readiness is a read-time predicate                      | application, already implemented (**[V]** A20)         | it must follow the clock without writing                                                           |
| The queue is visible                                            | **[R]** view + editor RPC                              | a person must be able to find the work                                                             |

## C.4 Why the "no automatic expiry" choice is safe

The danger of not demoting is stale material shipping. That is closed at read
time: the only function that answers "may this ship" already requires every cited
source to be in date (**[V]** A20). The danger of demoting is losing the audit
trail of a decision that was correctly taken. Demotion is therefore the worse
failure, which is why the design refuses it.

**One edge to name [R]:** if a future consumer queries `review_status = 'approved'`
directly instead of `isProductReady`, expiry becomes invisible. **[R]** the
`evidence_review_due` view exists partly so that shortcut has an obvious
alternative, and the methodology doc should name `isProductReady` as the only
permitted gate.

---

# Part D — D6: `service_role` restriction

## D.1 Complete dependency analysis

**[V]** Method: every reference to `service_role`, `SUPABASE_SERVICE_ROLE_KEY`,
`createClient(` and every `evidence_*` table name across `src/`, `scripts/`,
`supabase/tests/` and `supabase/functions/`, then each hit read in place.

| Consumer                                           | Uses `service_role`?                                                            | Touches evidence?                           | Verdict under revocation                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `src/lib/supabase.ts` (browser client)             | No — anon key (**[V]** A1)                                                      | No                                          | Unaffected                                          |
| Application code (`src/`), all features            | No                                                                              | No                                          | Unaffected                                          |
| `supabase/functions/push-send`                     | Yes                                                                             | No — `push_subscriptions` only (**[V]** A2) | Unaffected; its privileges are on a different table |
| `supabase/functions/coach`, `giphy`                | **[V]** no service-role client found                                            | No                                          | Unaffected                                          |
| Seed generator `scripts/vitalis-evidence-seed.mjs` | **[V]** never connects; it is a text generator (**[V]** A6)                     | Produces SQL only                           | Unaffected                                          |
| Seed application (operator, psql)                  | Runs as the owner/superuser, **not** `service_role`                             | Yes                                         | **Requires the import path instead** (Part B)       |
| `src/lib/vitalis/db/*` integration tests           | **[V]** connect as superuser, `set local role` to `service_role` for assertions | Yes (as a fixture author)                   | **Two assertions must change** (D.5)                |
| Migrations                                         | Run as owner                                                                    | Yes                                         | Unaffected                                          |

**[V] Conclusion: there are zero application-code dependencies on `service_role`
write access to evidence.** The grant is currently dead weight that only widens
the blast radius of a leaked key.

## D.2 Which operations need which mechanism

| Operation                    | Needs privileged access?    | Mechanism after P2.2                             | Identity                           |
| ---------------------------- | --------------------------- | ------------------------------------------------ | ---------------------------------- |
| Approve/reject a claim       | Yes — editorial judgment    | `evidence_transition_claim`                      | `auth.uid()` in `evidence_editors` |
| Move a source through review | Yes                         | `evidence_transition_source`                     | same                               |
| Fix a typo in a statement    | Yes                         | `evidence_update_claim` (+1 version)             | same                               |
| Attach/detach a citation     | Yes                         | `evidence_attach_citation` / `detach`            | same                               |
| Read the catalogue           | No                          | `SELECT` as `authenticated`                      | any signed-in user                 |
| Apply the reviewed catalogue | Yes — bulk, whole-catalogue | import path (Part B)                             | `session_user = evidence_importer` |
| Serve a push notification    | Yes, for its own table      | unchanged `service_role` on `push_subscriptions` | `service_role`                     |
| Migrate the schema           | Yes — DDL                   | owner; not delegated                             | owner                              |

## D.3 Why `service_role` must not be the editorial identity

**[V]** `service_role` is a JWT claim role used by server code, not a person. Three
consequences:

1. It carries no `auth.uid()`, so no transition could be attributed — the brief
   requires attribution.
2. It is shared: every server-side token in every environment is the same
   identity, so "who approved this" becomes unanswerable.
3. It bypasses RLS by attribute, so every trigger in this design would be
   advisory for exactly the actor most likely to be compromised.

## D.4 Do migrations and administrative maintenance still work?

**[R]** Yes, and nothing in this design removes a capability the operator needs:

| Need                                 | Still possible?                     | How                                                                                              |
| ------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Apply migrations                     | Yes                                 | owner (Supabase `postgres`)                                                                      |
| Apply the seed                       | Yes                                 | import preamble (Part B.4)                                                                       |
| Add or remove an editor              | Yes                                 | SQL session: `insert into evidence_editors`                                                      |
| Recover from a wrong decision        | Yes                                 | forward migration replacing a function body                                                      |
| Run the integration suite            | Yes, with the harness change in D.5 | harness creates the role and grants, guarded (**[V]** A18)                                       |
| Read evidence from a server function | Yes                                 | `SELECT` is retained for `service_role`                                                          |
| Bulk-correct a single row by hand    | Yes                                 | SQL session as owner, still subject to every trigger; requires `set local bloom.evidence_reason` |

## D.5 What actually breaks, and the decision it forces (**C4**)

**[V]** `src/lib/vitalis/db/evidence.integration.test.ts:131-134` asserts:

```ts
expect(
  await db.one<boolean>(
    "select has_table_privilege('service_role', 'public.evidence_claims', 'UPDATE')",
  ),
).toBe(true);
```

That assertion is a _true statement about the pre-P2.2 surface_ and becomes false
by design. The test is not wrong; it is describing the thing being removed.
**[R]** the implementation must change it to `.toBe(false)` and add the
corresponding RPC-path assertions. This is the only test change P2.2 requires, and
it needs explicit authorisation because the closure directive froze the test
suite. Two other assertions at `:139-146` (no `UPDATE`/`DELETE` on revisions)
stay true and need no change (**[V]** A4).

**[V]** A5 confirms the _migration-text_ assertions are unaffected: they read the
2026-11-06 file, which keeps its original grants.

## D.6 Operational consequences after revocation

| Consequence                                             | Impact                                      | Mitigation                                                        |
| ------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| A server function can no longer write evidence directly | none today (**[V]** D.1)                    | use the RPCs                                                      |
| An emergency "fix a row with a service key" disappears  | a slow path becomes the only path           | owner SQL session, which is auditable by role                     |
| A leaked service key can still read evidence            | acceptable: it is public reference material | **not** acceptable for health tables, which stay RLS-protected    |
| Tests must provision the importer role                  | harness change                              | guarded create, exactly as the three existing roles (**[V]** A18) |
| Someone must remember the import preamble               | seed would fail closed without it           | the wrapper script contains it; the failure message names it      |

**[R]** The last row is the design working: a silent fallback would be the
convenience the brief refuses.

---

# Part E — D11: version discipline

## E.1 The three writers and what each may do

| Writer                | Arrives as                         | May change content? | May change status?                                | May bump version?            |
| --------------------- | ---------------------------------- | ------------------- | ------------------------------------------------- | ---------------------------- |
| Editor RPC            | `authenticated` + editor           | yes, +1 only        | yes, on-graph only                                | only with the content change |
| Import                | `session_user = evidence_importer` | yes, +1 only        | **yes, off-graph** (labelled)                     | yes, +1 only                 |
| Owner maintenance SQL | superuser                          | yes, +1 only        | on-graph only, unless the import preamble is used | +1 only                      |

## E.2 The corrected rule (**C3**)

**[R]** Two clauses, both monotonic:

1. **A content change requires `version = old.version + 1`.** Changing a statement,
   a locator, a licence, a grade — anything outside the bookkeeping set — without
   a new version is refused.
2. **`version` may only move to `old.version + 1`.** It cannot be set backwards,
   skipped forward, or repeated.

What I remove from the design: "a version change without a content change is
refused". **[V]** A11 shows why that is wrong. The seed's upsert guard compares
whole rows, so raising a catalogue version while the text happens to be identical
_does_ write the row; clause (2) permits it, which is correct — "I re-reviewed it,
the words are unchanged, the version advances" is a legitimate editorial act. It
is the lifecycle event, not the version, that records why.

| Clause       | Prevents                                         | Permits                                       |
| ------------ | ------------------------------------------------ | --------------------------------------------- |
| content ⇒ +1 | silent edits under a stable version              | any edit with a new version                   |
| version = +1 | rollback of a version, jumps that hide revisions | status-only writes (no bump), re-review bumps |

## E.3 Six required demonstrations

**1. Content changes increment versions. [V] by construction.** The bookkeeping
set is `created_at, updated_at, review_status, superseded_by, version`. Editing
`statement` changes `to_jsonb(new) - bookkeeping`, so clause 1 fires and demands
`old.version + 1`.

**2. Status transitions do not unexpectedly increment versions. [V]** A10: the
seed's status pass writes `version = 1` on a row already at version 1 — unchanged,
so neither clause fires. Approval at version 1 is therefore legal, which is what
the existing records contain (**[V]** A10, four claims at version 1 in three
different statuses).

**3. Stale writes are rejected. [R]** `evidence_transition_claim` and
`evidence_update_claim` select `for update`, compare `expected_version` **and**
`expected_status`, and raise `40001` otherwise. **[V]** harness note A17 means the
row lock is real in tests too, because tests run on a genuine server.

**4. Seed reruns remain idempotent. [V]** A11: the guard is a whole-row
comparison excluding only timestamps, so after the first apply every statement
matches and skips. Adding the lifecycle trigger does not change this: a skipped
`update` fires no trigger, so a rerun writes **no** lifecycle events and **no**
`updated_at`. The P2.1 test that compares full snapshots including timestamps
keeps passing (**[V]** `evidence-seed.integration.test.ts:284-297`).

**5. Approved records cannot be downgraded. [R]** three independent barriers:
the graph omits `approved → draft`; the import branch skips the graph but the
seed's own reconciliation already refuses reviewed → draft (**[V]** A12); and the
`review_status` CHECK has no path to a demoted state other than a legal edge.

**6. Revision history remains complete. [R]** Two histories, both append-only:
`evidence_revisions` (curated, trigger-protected since Phase 2 — **[V]** A16) and
`evidence_lifecycle_events` (mechanical, one row per status change, including
imports). A content edit with a version bump is required to carry a reason, so
"what changed and why" is answerable from the pair; a content edit without a bump
cannot exist.

## E.4 The one residual hole, named

**[R]** An editor can change content _and_ bump the version without adding a
curated revision row, because `evidence_revisions` is curated, not generated. The
lifecycle event records that a version change happened and why, but not what the
text said. Closing that would mean snapshotting every row on every edit, which is
a different design (and a large one). **[R]** Accept it, and state it: the
lifecycle log is complete about _decisions_; the revision table is complete only
where an editor chose to narrate. This is a real limitation, not a solved problem.

---

# Part F — every remaining decision

Each entry: recommended option, justification, security implications, operational
consequences, alternatives, and the risk of choosing wrongly. **[R]** throughout
unless tagged otherwise.

## D1 — How the seed reaches `approved`

- **Recommend:** role-gated import session, exactly as Part B.
- **Justification:** **[V]** A10 means the seed must write `draft → approved`
  directly; the alternative is regenerating it, which needs a generator change
  that is not authorised, and which would emit two log rows per claim on every
  fresh database.
- **Security:** the flag alone is inert; identity is `session_user`, unforgeable
  without superuser; every imported row is logged.
- **Operational:** the operator adds a three-statement preamble; the seed file is
  unchanged; a missing preamble fails closed with a named error.
- **Alternatives:** (i) regenerate the seed to walk `draft → in_review → approved`
  — largest blast radius, needs a generator change, pollutes the log with
  transitions nobody made; (ii) exempt imports from lifecycle entirely — rejected,
  it is the bypass the brief forbids; (iii) pre-seed statuses via a separate
  migration — rejected, migrations are not a data channel.
- **Risk if wrong:** if the identity test is written as `current_user` or as a
  membership check (**C1**), the gate is vacuous and every client-side write that
  reaches the trigger is treated as an import. That is the single most dangerous
  line of code in the phase.

## D2 — `evidence_editors` vs `app_admins`

- **Recommend:** a separate `evidence_editors` table.
- **Justification:** the two authorities differ in kind. **[V]** `app_admins`
  governs reward delivery; this governs whether a medical sentence may ship.
  Sharing a table would silently grant the second to whoever holds the first.
- **Security:** a small, explicit, separately revocable list; `select` denied to
  every application role, so membership is not enumerable by a client;
  `evidence_is_editor()` returns only a boolean.
- **Operational:** one extra table and one extra grant step per editor; no UI is
  proposed here.
- **Alternatives:** (i) reuse `app_admins` — cheapest, wrong blast radius;
  (ii) a Postgres role per editor — most precise, but role sprawl and no
  `auth.uid()` attribution; (iii) a JWT claim — unverifiable server-side without
  a secret.
- **Risk if wrong:** with `app_admins`, one reward-admin compromise becomes
  authority to approve unlicensed medical claims — an escalation path from a
  cosmetic feature to a legal exposure.

## D3 — Are `withdrawn` and `superseded` terminal?

- **Recommend:** yes, terminal, no exceptions.
- **Justification:** **[V]** A7 already defines them as terminal; reviving a
  withdrawn row makes its own history a lie ("withdrawn" happened, then ceased to
  have happened). A new id costs one row.
- **Security:** removes the only remaining route by which an old, unvetted row
  could re-enter `approved` without passing review again.
- **Operational:** a withdrawn claim that must return needs a new id and a new
  citation set; slightly more catalogue work, honest history.
- **Alternatives:** allow `withdrawn → draft` — cheap to operate, destroys the
  meaning of the withdrawal; allow it only for the importer — reintroduces a
  bypass.
- **Risk if wrong:** allowing revival makes §C.3's "historical preservation"
  claim false, and an auditor cannot distinguish "never withdrawn" from
  "withdrawn then quietly revived".

## D4 — Does a status transition bump `version`?

- **Recommend:** no. `version` counts content revisions.
- **Justification:** **[V]** A10 — the catalogue records approval at version 1, and
  P2.1 parity depends on it. A bump per transition would also make the version
  ambiguous between "edition of the text" and "number of decisions taken".
- **Security:** the decision record is the lifecycle event, which cannot be
  skipped; the version is not the audit trail, so it need not carry audit meaning.
- **Operational:** editors see a stable version across review; the history is read
  from the event log.
- **Alternatives:** bump on every transition — makes version a monotonically
  increasing decision counter, but breaks existing records and conflates two
  meanings.
- **Risk if wrong:** if version also counted decisions, re-approving an unchanged
  claim would force a version bump, and every version-based concurrency check
  would fire spuriously on re-review.

## D5 — May a claim be approved while a cited source is overdue?

- **Recommend:** no. Detail in Part C.
- **Justification:** approval is the moment someone asserts the claim is usable;
  doing so on confirmation that has expired is the defect the interval exists to
  catch.
- **Security:** closes a route to shipping stale evidence that the licensing gate
  alone would not catch (a stale source is still licensed).
- **Operational:** overdue sources must be re-reviewed before any dependent claim
  is approved; **[V]** none is overdue today (all six sources `reviewed_on`
  2026-11-05, intervals 12–60 months), so nothing is blocked at introduction.
- **Alternatives:** allow with a warning — no database warning exists that anyone
  reads; allow if the claim's own reviewed_on is newer — plausible, but it makes
  the rule depend on two clocks in a way nobody will check by hand.
- **Risk if wrong:** a claim approved against a five-year-old guideline passes
  every other gate and ships, while the reviewer believes the database checked.

## D6 — Revoke direct writes from `service_role`

- **Recommend:** yes, with the test change in D.5 authorised.
- **Justification:** **[V]** zero application dependencies (D.1); the only writer
  is the seed, which uses the owner.
- **Security:** converts every guard from "advisory for the most exposed actor" to
  enforced; also removes `delete` from two tables, strengthening P2.1.
- **Operational:** one existing assertion flips; the emergency hand-edit path
  becomes an owner SQL session.
- **Alternatives:** (i) keep the grants and rely on triggers — every trigger stays
  bypassable by the token most likely to leak; (ii) keep `insert` only, revoke
  `update` — smaller change, but leaves row creation available to a leaked key;
  (iii) scope writes to a new `evidence_service` role — more roles, same
  attribution problem.
- **Risk if wrong:** leaving the grants means an incident response that rotates a
  service key is insufficient — the key could have rewritten approved evidence
  with no reason and no actor.

## D7 — Demotion of a cited source: immediate refusal or deferred?

- **Recommend:** immediate refusal, but **narrowed** (**C2**): refuse `approved →
in_review` and `approved → withdrawn` while an approved claim cites the source;
  **allow `approved → superseded`**.
- **Justification:** supersession _is_ the retirement path, and it carries a
  replacement, so dependent claims become non-product-ready immediately and
  correctly (**[V]** A20) without a write. Withdrawal and re-review carry no
  replacement, so they strand approved claims in a state no reviewer decided.
- **Security:** prevents the silent-stranding case without forbidding the
  legitimate one; the error names the blocking claims so the fix is obvious.
- **Operational:** to retire a source, supersede it; to withdraw one used by a
  claim, retire the claim first.
- **Alternatives:** (i) deferred constraint trigger — allows both changes in one
  transaction, but makes failure order-dependent and hard to explain; (ii) no
  guard, rely on product-readiness — leaves an approved claim citing a withdrawn
  source, which is indistinguishable from an intentional historical record.
- **Risk if wrong:** the design-as-written version (**C2**) would make supersession
  of any cited source impossible — a deadlock in the routine maintenance path, and
  the reason anyone would abandon the feature.

## D8 — Symmetric supersession CHECK on claims

- **Recommend:** add it.
- **Justification:** **[V]** A13 — sources already enforce equality; claims permit
  `approved` + `superseded_by`, a contradiction only TypeScript notices.
- **Security:** removes a state that a reader could misinterpret as "this approved
  claim is retired" — the exact confusion supersession exists to prevent.
- **Operational:** one `alter table`, added `not valid` then validated; **[V]** no
  current row violates it (four claims, none superseded), so validation passes on
  first application.
- **Alternatives:** enforce only in the trigger — leaves the state reachable by any
  path that skips the trigger (none today, but the CHECK is free).
- **Risk if wrong:** without it, `isProductReady` and the database disagree about
  whether a claim is current, and the disagreement surfaces only at read time.

## D9 — Citations on the superseded row

- **Recommend:** citations stay; the new version starts uncited.
- **Justification:** carrying citations forward would assert support that no
  reviewer confirmed for the new wording. **[V]** A14 also means the old row
  cannot be deleted while recommendations link to it, so its citations remain
  reachable.
- **Security:** prevents a fabricated support chain: edits cannot silently inherit
  the approvals of their predecessor.
- **Operational:** a superseding claim must be re-cited and re-approved; that is
  the cost of an honest supersession.
- **Alternatives:** copy citations — fast, and destroys the property that citation
  set ⇒ reviewed content.
- **Risk if wrong:** copied citations let a materially changed claim inherit an
  approval, which is the silent downgrade in a different disguise.

## D10 — Uniqueness on `evidence_revisions`

- **Recommend:** no constraint; duplicate prevention belongs in the RPC.
- **Justification:** **[V]** A19 — several curated entries can legitimately share a
  version (a correction and its approval note), and the seed already uses
  `where not exists`.
- **Security:** none either way; history is append-only regardless.
- **Operational:** a future legitimate second entry at the same version is not
  blocked.
- **Alternatives:** `unique (entity_type, entity_id, version)` — simpler mental
  model, but it forces editors to invent version numbers to narrate two changes.
- **Risk if wrong:** with the constraint, a legitimate second note fails with a
  constraint violation an editor cannot fix without bumping the text version.

## D11 — Does the content-change rule apply to imports?

- **Recommend:** yes, with clause (2) of E.2 the only rule about version movement.
- **Justification:** otherwise a catalogue edit could rewrite a statement without
  a new version — exactly the silent history loss this phase exists to stop —
  while the reviewed diff still shows the change.
- **Security:** keeps "a version identifies an exact text" true for every writer,
  including the importer.
- **Operational:** editing catalogue text now requires raising `version` and adding
  a revision, or the seed is refused by the database. **[V]** the current
  catalogue satisfies this (all rows version 1, matching the database).
- **Alternatives:** exempt imports — fewer surprises for the operator, at the cost
  of the property above; require +1 but allow any jump — permits skipping
  versions, which hides intermediate texts.
- **Risk if wrong:** exempting imports makes the version field advisory for the
  only bulk writer, and a re-import becomes the one path that can rewrite approved
  text invisibly.

## D12 — Attribution granularity for imports

- **Recommend:** one event per changed row.
- **Justification:** a single "import" event cannot answer which rows moved; per
  row it can, and the volume is trivial (**[V]** 10 rows today).
- **Security:** makes an import's effect visible row by row, so a review can
  diff events rather than trust a summary.
- **Operational:** a 10-row import writes up to 10 events; a 10,000-row import
  writes 10,000, which is still small.
- **Alternatives:** one event per import — compact, useless for "when did this
  claim become approved"; events only for approvals — leaves rejections,
  withdrawals and supersessions unattributed.
- **Risk if wrong:** coarse attribution turns the audit log into a statement that
  _something_ changed, which is not attributable history.

---

# Part G — Final architecture validation

Re-evaluating six states, ten transitions, eight RPCs, six triggers, and the test
plan as one system.

## G.1 Circular dependencies

| Candidate                                                                       | Finding                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claim approval gate ↔ source demotion guard                                     | **Not circular.** The gate reads sources; the guard reads claims. Neither writes the other table, so no cascade loop. **[A]** no trigger performs a write to the table it guards — worth asserting in the test suite                                                                                                                             |
| Lifecycle log trigger ↔ lifecycle guard                                         | Safe: AFTER trigger reads the setting the BEFORE guard required; it writes a different table                                                                                                                                                                                                                                                     |
| Import predicate called from the lifecycle trigger, which is `SECURITY DEFINER` | Safe **only after C1**: the predicate must read `session_user`, which survives the definer context                                                                                                                                                                                                                                               |
| `evidence_is_editor()` used by RPCs, which are definers                         | Safe: reads `evidence_editors` as owner; returns a boolean                                                                                                                                                                                                                                                                                       |
| **Trigger firing order**                                                        | **[R]** BEFORE triggers fire in name order. `evidence_assert_lifecycle` sorts **before** `evidence_claims_approvable`, so a bad transition and an unlicensed approval report the transition error first. Fix deliberately by naming the new trigger `evidence_claims_lifecycle` (sorts after `…_approvable`) so the most specific diagnosis wins |

## G.2 Privilege-escalation opportunities

| #   | Opportunity                                                                | Control                                                                  | Residual                                                                                                                |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| P1  | Definer function with an unpinned `search_path`                            | every function sets `search_path = public, pg_temp` (**[V]** A16 style)  | **[A]** `public` is not writable by application roles (Postgres 15+ default revokes `CREATE` on `public` from `PUBLIC`) |
| P2  | `evidence_importer` reachable by a client                                  | `NOLOGIN`, no password, `SET SESSION AUTHORIZATION` is superuser-only    | owner compromise                                                                                                        |
| P3  | `BYPASSRLS` for convenience                                                | not granted; twelve explicit policies instead                            | none                                                                                                                    |
| P4  | Editor function returning rows instead of a boolean                        | `evidence_is_editor()` returns `boolean` only                            | none                                                                                                                    |
| P5  | Editor list readable by a client                                           | no `select` grant to any application role                                | none                                                                                                                    |
| P6  | `authenticated` gaining `EXECUTE` on a definer helper                      | every internal function `revoke all … from public, anon, authenticated`  | **[A]** verify with `has_function_privilege` in tests                                                                   |
| P7  | RPC accepting `product_use_allowed` / `permission_required` as a parameter | **[R]** they are never parameters; recomputed from `license_id` by CHECK | none                                                                                                                    |

## G.3 Race conditions

| #   | Race                                                                | Analysis                                                                                                                                      | Fix                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Two editors edit the same row                                       | `select … for update` + `expected_version` + `expected_status` ⇒ loser gets `40001`                                                           | as designed                                                                                                                                                                                                                                                                                                                                                     |
| R2  | Two editors approve and withdraw the same claim                     | Row lock serialises; second sees the new status and fails its `expected_status` check                                                         | as designed                                                                                                                                                                                                                                                                                                                                                     |
| R3  | **Mutual supersession cycle** (A supersedes B while B supersedes A) | Cycle walk runs before commit, so both transactions can pass it and commit                                                                    | **[R]** lock the _target_ row (`select … from … where id = p_superseded_by for update`) before the walk, so the pair serialises and the second walk sees the cycle                                                                                                                                                                                              |
| R4  | Import concurrent with an editor                                    | Import runs in one transaction taking row locks as it updates; an editor blocked on the same row waits, then fails its expected-version check | acceptable — the operator should not import during editorial work                                                                                                                                                                                                                                                                                               |
| R5  | Overdue check at approval vs. a source ageing mid-transaction       | `current_date` is transaction start; a source ageing at midnight cannot change within the transaction                                         | acceptable, and worth a comment                                                                                                                                                                                                                                                                                                                                 |
| R6  | Seed reconciliation reading while another session writes            | Reconciliation and writes share the transaction, but a concurrent commit can land between the check and the update                            | **[R]** the seed should run `lock table … in share row exclusive mode`… **rejected: that would change the seed generator.** Instead document: the seed is a single-writer administrative step, run when no editor is active. **[V]** the seed's own guards (`version >=`, supersession immutability, whole-row comparison) still prevent the dangerous outcomes |

## G.4 Inconsistent state possibilities

| State                                         | Reachable?                                                                                                             | Verdict                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Approved claim citing a now-superseded source | **yes**, by design                                                                                                     | acceptable: `isProductReady` is false, history is honest. **[R]** name it in the methodology doc |
| Approved claim citing an overdue source       | **yes**, by design                                                                                                     | acceptable (Part C)                                                                              |
| Claim `approved` with `superseded_by` set     | **no** after D8                                                                                                        | fixed                                                                                            |
| Source `approved` with `superseded_by` set    | already impossible (**[V]** A13)                                                                                       | —                                                                                                |
| Superseded row with a cleared pointer         | prevented by the immutability condition                                                                                | —                                                                                                |
| Published claim whose citations were detached | **[R]** detach is refused when it would leave an approved claim without a supporting citation                          | added                                                                                            |
| Two current versions of the same claim        | unreachable: supersession requires target `approved` and not superseded; **[R]** add "target version > source version" | must be enforced explicitly                                                                      |

## G.5 Migration-ordering problems

**[V]** The new file must sort after `20261106`, and the harness applies a fixed
list (`MIGRATION_FILES`), so the implementation must add it there — a test-file
change, like D.5, needing authorisation.

Ordering _within_ the file matters and the design got one item wrong (**C5**):

1. role (guarded) → 2. `evidence_editors` → 3. `evidence_lifecycle_events` →
2. predicate functions → 5. CHECK (added `not valid`, then validated) → 6. guard
   triggers → 7. view and queue → 8. RPCs → 9. grants and `revoke` from
   `service_role` → 10. import grants and policies to `evidence_importer` → 11.
   baseline events.

Two traps:

- **[R]** the RLS policies naming `evidence_importer` must come _after_ the role
  exists, in the same file, or a fresh apply fails.
- **[R]** the baseline backfill must run _after_ the append-only trigger exists, or
  a later re-run could ... in fact it cannot, since the trigger only blocks
  `UPDATE`. Order it last regardless, so the log's first rows are the oldest.

## G.6 Seed compatibility

| Check                                         | Result                                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Seed still runs unmodified                    | **Yes**, with the import preamble. **[V]** A8, A10                                                                                                           |
| Seed idempotent under triggers                | **Yes**. **[V]** guards skip every row on a current database, so no trigger fires and no timestamp changes (**[V]** `evidence-seed.integration.test.ts:284`) |
| Seed's reconciliation still fails closed      | **Yes**, untouched                                                                                                                                           |
| Seed inserts sources as `approved`            | needs the import branch (INSERT path) — otherwise refused                                                                                                    |
| Seed's `draft → approved`                     | needs the import branch — this is the whole of D1                                                                                                            |
| Seed's actions attributable                   | **[R]** one event per moved row, `actor_label = 'seed:import'`                                                                                               |
| Catalogue version bump with unchanged text    | **was blocked** by the design's `elsif` branch; **C3** removes it                                                                                            |
| Seed test asserting no `service_role` mention | unaffected (**[V]** A6)                                                                                                                                      |

## G.7 Rollback limitations

| Limitation                                              | Consequence                                                                                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Lifecycle events are lost with their table              | accepted: they are new, and nothing references them                                                                                             |
| The `evidence_importer` role survives                   | intentional — it owns nothing after the reverse script                                                                                          |
| Re-granting `service_role` restores a known-bad surface | unavoidable if rolling back _before_ app changes; the reverse script comments say so                                                            |
| No data is restored because none was modified           | **[V]** the migration only adds objects and constraints; the one CHECK could reject rows on validation, which is why it is validated separately |
| A partially-applied migration is impossible             | `psql --single-transaction`, plus `--single-transaction` is what the seed docs already use                                                      |

## G.8 Assumptions not yet verified

| #   | Assumption                                                                                                                                     | Risk if false                                       | How to verify                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------ |
| A-1 | `SET LOCAL SESSION AUTHORIZATION` is transaction-scoped                                                                                        | a pooled connection could inherit importer identity | T26                                        |
| A-2 | `session_user` cannot be changed by a non-superuser                                                                                            | identity gate is forgeable                          | T27                                        |
| A-3 | PostgREST does not expose `pg_catalog` or arbitrary SQL                                                                                        | a client could set the GUC (still not the identity) | project settings review                    |
| A-4 | The Supabase owner role is a superuser able to `SET SESSION AUTHORIZATION`                                                                     | import path unusable                                | run the preamble once on a scratch project |
| A-5 | `public` is not `CREATE`-able by application roles                                                                                             | definer functions could be hijacked                 | `has_schema_privilege` in tests            |
| A-6 | `authenticated`'s policy is `using (true)` for select on all six tables (**[V]**) and adding `to evidence_importer` policies does not widen it | **[V]** policies are per-role, so no widening       | already verified in the migration text     |
| A-7 | Trigger firing order is name order                                                                                                             | a confusing error message, not a hole               | T28                                        |
| A-8 | `pg_has_role` on a superuser is vacuous                                                                                                        | it is why C1 matters; no longer used                | not used after C1                          |

---

# Part H — Consolidated risk register

Ordered by what would hurt most if this review is approved as written.

| #   | Risk                                                                                      | Likelihood                                                         | Impact                                             | Mitigation                                                                                        |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | The importer predicate is implemented from the design text, not from C1                   | **high** — the unsound version is in the approved-looking document | **critical**                                       | replace the function body in the design doc before implementation; T26/T27 assert both directions |
| 2   | Supersession of a cited source is blocked (C2)                                            | high                                                               | high — routine maintenance becomes impossible      | narrow the guard as in D7                                                                         |
| 3   | The `service_role` revocation is applied without the test change                          | medium                                                             | medium — suite fails, tempting someone to re-grant | D.5 authorisation, and the assertion documents the intent                                         |
| 4   | Content edits pass without a version bump somewhere the rule does not look (a new column) | low — the bookkeeping set is explicit                              | medium                                             | the set is a named array in one function; a new column must be added to it deliberately           |
| 5   | The role is assumed to exist and the migration fails on a fresh project                   | medium                                                             | low                                                | guarded create in the migration (C5)                                                              |
| 6   | An editor forgets the reason, gets an error, and sets a one-word reason                   | medium                                                             | low — attribution is weak but present              | minimum length plus the review queue                                                              |
| 7   | Approval on a stale source ships because a consumer reads `review_status` directly        | medium                                                             | high                                               | Part C.4: name `isProductReady` as the only gate; the view exists to make the alternative obvious |
| 8   | Mutual supersession creates a cycle                                                       | low                                                                | medium                                             | R3: lock the target row before the cycle walk                                                     |

## What I would need approved before implementation

1. **C1** — the corrected importer predicate (identity, not membership).
2. **C2** — supersession of a cited source stays legal.
3. **C3** — version may move by +1 with or without a content change.
4. **C4** — one test assertion flips from `true` to `false`, and the harness gains
   the importer role and `MIGRATION_FILES` entry.
5. **C5** — the migration creates `evidence_importer` (guarded, `NOLOGIN`).
6. **D1–D12** as recommended here.

Everything else in the design document stands as written.

---

## Appendix — the corrected lifecycle guard, for review only

Shown whole because pieces of it changed. Not a migration; nothing applied.

```sql
create or replace function public.evidence_assert_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  importing boolean := public.evidence_is_import_session();
  reason    text    := nullif(current_setting('bloom.evidence_reason', true), '');
  bookkeeping constant text[] := array[
    'created_at', 'updated_at', 'review_status', 'superseded_by', 'version'
  ];
  content_changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.review_status not in ('draft', 'in_review') and not importing then
      raise exception 'a new % row must start as draft or in_review', tg_table_name
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'id and created_at are immutable on %', tg_table_name using errcode = '42501';
  end if;

  if old.superseded_by is not null and new.superseded_by is distinct from old.superseded_by then
    raise exception 'supersession on % is immutable once recorded', tg_table_name
      using errcode = '42501';
  end if;

  content_changed := (to_jsonb(new) - bookkeeping) is distinct from (to_jsonb(old) - bookkeeping);

  -- Clause 1: content requires exactly one new version.
  if content_changed and new.version <> old.version + 1 then
    raise exception 'editing % % requires version % (was %)',
      tg_table_name, new.id, old.version + 1, old.version using errcode = '23514';
  end if;

  -- Clause 2: a version may never move by anything but exactly one.
  -- (A bump with unchanged content is legal: a re-review can leave the words alone.)
  if new.version <> old.version and new.version <> old.version + 1 then
    raise exception 'version on % % may only increase by one', tg_table_name, new.id
      using errcode = '23514';
  end if;

  if new.review_status is distinct from old.review_status then
    if not importing
       and not public.evidence_transition_allowed(old.review_status, new.review_status) then
      raise exception 'cannot move % % from % to %',
        tg_table_name, new.id, old.review_status, new.review_status using errcode = '23514';
    end if;
    if reason is null and not importing then
      raise exception 'a status change on % % needs a reason', tg_table_name, new.id
        using errcode = '22023';
    end if;
    if (new.review_status = 'superseded') is distinct from (new.superseded_by is not null) then
      raise exception 'status and supersession pointer must agree on %', tg_table_name
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;
```

And the narrowed demotion guard (**C2**), which now permits supersession:

```sql
-- Only an *unreplaced* departure from approved is refused.
if old.review_status = 'approved'
   and new.review_status in ('in_review', 'withdrawn') then
  select string_agg(c.id, ', ' order by c.id) into blocking
    from public.evidence_claim_sources l
    join public.evidence_claims c on c.id = l.claim_id
   where l.source_id = new.id and c.review_status = 'approved';
  if blocking is not null then
    raise exception 'source % cannot leave approved without a replacement while approved claim(s) cite it: %',
      new.id, blocking
      using errcode = '23514',
            hint = 'Supersede it with a replacement instead, or retire those claims first.';
  end if;
end if;
```
