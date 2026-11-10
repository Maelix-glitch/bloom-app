# Vitalis evidence methodology

How a scientific statement gets into Bloom Vitalis, how it is checked, how it is
retired, and what we are not allowed to publish.

This document describes the method the code enforces. Where the two differ, the
code wins and this document is wrong.

---

## 1. What an evidence entry is

Two objects, and they are not interchangeable.

**A source** is a published thing: a guideline, a report, a dataset, a paper. It
carries bibliographic facts, a licence, and an authority assessment.

**A claim** is one sentence Bloom might act on. It carries a grade, a confidence,
the population the evidence came from, what is uncertain, what the evidence
cannot answer, and when acting on it could cause harm.

A claim cites sources. A citation requires a **locator** — the chapter, section,
table or page where the claim can be found. "The WHO says so" is not a citation.

A **recommendation** is a product rule. It names the claims that justify it. This
is the chain that must never break:

```
product copy  →  recommendation  →  claim  →  citation (with locator)  →  source  →  publisher
```

Phase 2 builds the right-hand four links. Nothing consumes them yet, because
this phase implements no recommendations, no plan generation and no advice.

---

## 2. Authority and reliability

Authority is computed, not asserted, and it is computed from things a reviewer
can inspect:

| Factor              | Effect                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Kind of publication | Systematic review > guideline ≈ randomised trial ≈ government report > dataset > cohort > textbook > case report > expert opinion |
| Peer review         | Small positive adjustment when it actually applies                                                                                |
| Currency            | Penalty that grows once the source passes its own review interval                                                                 |

The output is a tier (A–D), a score, and **the reasons for it**. A reviewer who
disagrees can point at a specific premise — "this is a government report, not a
systematic review" — instead of arguing with a number.

Authority is not truth. It is a defensible ranking of publication types plus two
inspectable facts, and it never claims more than that.

A claim's grade is separate from its sources' authority. A single excellent source
does not make a claim "strong", and a claim whose sources disagree cannot be
"strong" at all. Contradicting citations are recorded rather than hidden; the
validator caps the grade instead of dropping the disagreement.

---

## 3. Review status

```
draft ──→ in_review ──→ approved ──→ superseded
  │           │  │          │
  │           │  └→ rejected│
  └─ withdrawn└─────────────┴→ withdrawn
```

- There is **no path from `draft` to `approved`.** Approval is a transition out of
  `in_review`, and every illegal transition throws.
- `rejected`, `superseded` and `withdrawn` are terminal. A superseded source
  cannot be moved back to approved; it has been replaced, and the history says so.
- An approved row must carry a `reviewedOn` date. Without it there is no record of
  who confirmed what, and no clock for the re-review sweep.

**Two different approvals exist, and they answer different questions:**

|                                        | Question                                    | Consequence               |
| -------------------------------------- | ------------------------------------------- | ------------------------- |
| `reviewStatus = approved`              | Did a person check this against its source? | It may be used internally |
| `productUseAllowed` (from the licence) | May we reproduce this in a shipped product? | It may reach a user       |

A source can be approved and still not product-usable. That is the normal state
for the Indian and FAO material below, and the registry says so rather than
quietly treating "approved" as "shippable".

---

## 4. Licensing — what the investigation found

Terms were read from the publishers themselves, not inferred from the publisher's
name. All checks were made on 2026-11-05.

| Source                                                | Licence as stated                                                                                                   | Product use                | Status                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------- |
| USDA FoodData Central                                 | Public domain, CC0 1.0; attribution requested                                                                       | **Allowed**                | Registered, not yet used            |
| Dietary Guidelines for Americans 2025–2030 (HHS/USDA) | US federal work, public domain; altered content must not be re-attributed                                           | **Allowed**                | Used by the one product-ready claim |
| Dietary Guidelines for Americans 2020–2025            | Public domain                                                                                                       | Allowed                    | **Superseded** 2026-01-07           |
| FAO/WHO/UNU Human Energy Requirements (2004)          | FAO copyright; non-commercial reuse with acknowledgement; commercial use needs written permission                   | **Blocked**                | Read, not shipped                   |
| ICMR-NIN Dietary Guidelines for Indians (2024)        | © ICMR-NIN; personal reproduction allowed, electronic storage to create a product requires prior written permission | **Blocked**                | Read, not shipped                   |
| ICMR-NIN Indian Food Composition Tables (2017)        | © ICMR-NIN; same restriction, explicitly covering electronic format for a product                                   | **Blocked — not imported** | Registered, import refused          |

### The Indian food-composition question

This was investigated first because it is the dataset Bloom would most want. IFCT
2017 is the closest thing to an authoritative Indian composition table: 528 key
foods, 151 components, national sampling. Its own front matter says:

> The use and dissemination of the data in this book is encouraged. This
> publication can be reproduced for personal use with full acknowledgment of the
> source. However, no part of this publication can be stored or reproduced in any
> electronic format for creating a product without the prior written permission of
> the National Institute of Nutrition, Hyderabad.

That is a permission requirement, not a licence grant. Loading the tables into a
product database is precisely the act it names. **Therefore nothing from IFCT is
imported in this phase**, and the database forbids marking it usable:

```sql
constraint evidence_sources_license_consistent check (
  product_use_allowed = (license_id in ('us-public-domain', 'cc0-1.0', 'cc-by-4.0'))
);
```

A third-party re-publication (for example an AGPL package that mirrors the tables)
does not grant rights the original publisher withheld. The route to an Indian
composition dataset that can ship is one of:

1. written permission from ICMR-NIN, or
2. a separately licensed Indian dataset with explicit reuse terms, or
3. building composition values from permitted sources and documenting the method.

Until one of those exists, an Indian user's food data would have to come from a
permitted source, and copy that implies IFCT provenance must not be written.

The same reasoning keeps the FAO energy report out of shipping copy: FAO permits
non-commercial reuse but requires written permission for commercial use, and a
consumer app is commercial.

---

## 5. Reviewing outdated or superseded evidence

Three mechanisms, all mechanical:

1. **A date per row.** `reviewDueOn = reviewedOn + reviewIntervalMonths`, where
   the interval comes from the kind of source (guidelines 60 months, datasets 12,
   systematic reviews 36, expert opinion 24). The interval is measured from _our
   last check_, not the publication date, because our confirmation is what
   expires.
2. **A queue.** `overdueForReview(rows, asOf)` returns approved rows past their
   date, soonest first. This is the re-review work list; it does not depend on
   anyone remembering.
3. **A supersession pointer.** `supersededBy` records what replaced a row, and the
   old row stays in place. Nothing is deleted, so a report written last year still
   resolves.

Worked example, and the reason this phase found something real: the registry
initially cited the Dietary Guidelines for Americans 2020–2025. Checking whether a
successor existed showed the 2025–2030 edition was released on **7 January 2026**.
The 2020–2025 row is now `superseded`, pointing at the new edition, with a
revision recording when and why. The claim was re-anchored to the current edition
rather than carried forward on the old one.

**A superseded source never silently upgrades a claim.** Re-anchoring means reading
the new source and confirming the statement still holds; the specific numeric
recommendations of the old edition were _not_ assumed to survive into the new one.

---

## 6. What is deliberately unrivalled by inference

The registry refuses to do three things, on purpose:

- **No invented citations.** A claim with no source is allowed to exist in `draft`
  and is reported by `traceability()` as untraceable. It cannot be approved. This
  is how the Phase 1 rate cap is recorded: `rate-cap-1kg-per-week` has grade
  `insufficient`, confidence `0`, no citation, and a limitation saying the number
  is a safety constant nobody has sourced.
- **No paraphrase presented as quotation.** Claims are our summaries; the locator
  points at the passage a reviewer reads to check the summary.
- **No reuse of a secondary summary as if it were the source.** Where a claim rests
  on a publisher's own summary page, the locator says so.

---

## 7. Scope boundaries of this phase

Implemented:

- evidence source, claim, citation, recommendation and revision tables, with RLS
  and explicit grants
- licence registry with fail-closed behaviour for unknown licences
- authority assessment with stated reasons
- review state machine, review dates and the overdue queue
- traceability validation and the product-readiness gate
- the licence gate enforced in PostgreSQL, not only in TypeScript
- a six-source, four-claim catalogue with its licensing findings
- a generated, deterministic, re-runnable seed that carries that catalogue into
  PostgreSQL, with a catalogue hash and a parity test (see section 9)

Not implemented, and not started:

- nutrition-plan generation
- calorie or macro adjustment of any kind
- adaptive recommendations
- AI-generated health or medical decisions
- treatment or diagnosis
- plan-transition RPCs
- UI
- subscription or payment infrastructure
- importing any external dataset, including IFCT

---

## 8. Open questions this phase could not close

1. **Whether ICMR-NIN will grant product permission**, and on what terms. Until
   answered, Indian guidance can be read but not reproduced.
2. **Whether an Indian composition dataset with usable terms exists.** Not found
   in this phase; not assumed.
3. **What evidence supports the 1 kg/week rate cap.** Sourced as `insufficient` so
   it cannot be mistaken for established.
4. **Whether the 2025–2030 guidance's numeric recommendations are usable as
   numbers.** Only its qualitative emphasis is recorded; no figure was transcribed.
5. **Reviewer identity.** `changed_by` is a free-text operator id. There is no
   reviewer account model, and inventing one was out of scope.

---

## 9. Seeding: how the catalogue reaches the database

The catalogue is written once, in TypeScript, and reaches PostgreSQL as generated
SQL. Hand-writing both would guarantee they diverge, and divergence in this file
is not cosmetic: the database is what a future feature reads when it wants to put
a sentence about evidence in front of a person.

```
src/lib/vitalis/evidence/catalog.ts        the only thing a human edits
            │  scripts/vitalis-evidence-seed.mjs  (npm run seed:evidence)
            ▼
supabase/seeds/…_vitalis_evidence_catalog.sql   generated, committed, reviewed
            │  applied as one transaction by an operator
            ▼
PostgreSQL evidence tables
```

**The generator writes text and nothing else.** It opens no connection, reads no
environment variable and holds no key. No credential exists in the script, the
output, the tests or the repository; applying the file is a separate step with
its own access control, documented in `docs/vitalis-evidence-seed.md`.

**Order is a correctness property, not a style choice.** The Phase 2 licence gate
is a trigger that fires on `INSERT` as well as `UPDATE`, so a claim inserted
already approved would be rejected for having no citation. The seed therefore
stages every claim as `draft`, attaches its citations, and only then moves it to
its recorded status. Supersession pointers are foreign keys onto the same table,
so a superseded row is emitted after the row that replaces it.

**Re-running is safe, and it reconciles rather than prunes.** Every write is an
upsert keyed on a stable id, and revision history is written with
insert-if-absent. The file deletes nothing at all — not a source, a claim, a
citation, a recommendation link or a revision. If the database holds a row or a
relationship the catalogue does not describe, or a version, review status or
supersession the catalogue would move backwards, the seed raises with the
offending ids before it writes anything and leaves the transaction untouched.
Removing evidence is a reviewed operator action, documented in
`docs/vitalis-evidence-seed.md` section 7, never a side effect of regenerating a
file. Every conflict branch is also guarded, so applying the file to a database
that is already current changes nothing at all; the integration suite proves it
by snapshotting all six tables, timestamps included, and running the file twice.

**Freshness is enforced mechanically.** `catalogHash` is a SHA-256 over a
canonical serialisation of the catalogue — sorted keys, preserved array order — so
it is identical on every machine and changes when any recorded fact changes. It
is written into the seed header, asserted by a unit test, and recomputed by
`npm run seed:evidence:check`. Editing the catalogue without regenerating fails
the suite; regenerating produces a diff a reviewer can read.

**Parity is proven, not assumed.** `src/lib/vitalis/db/evidence-seed.integration.test.ts`
applies the file to a real PostgreSQL server, reads all six tables back and
compares them field by field with the catalogue. A hash proves the files agree
with each other; only this proves the database agrees with both.

### What the seed deliberately cannot do

It cannot create a claim that is product-ready without a licensed source: the
trigger refusing that is unchanged, and the integration suite asserts it still
refuses after seeding. It cannot delete anything, or revert a row the database
has already moved past. It cannot touch a health,
authentication or profile table — asserted structurally by inspecting the
generated SQL before it is ever executed.

One consequence worth stating plainly: the seed has no mechanism to make the
Indian sources usable. It records what the licence says, and the licence says
permission is required. If that ever changes, it changes in `licensing.ts` and
`catalog.ts` after a written grant, not in the seed.
