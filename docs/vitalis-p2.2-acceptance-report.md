# Bloom Vitalis Phase 2.2 — consolidated acceptance report

Date: 9 November 2026. Scope: the four outstanding acceptance items from the P2.2
verification pass, plus a re-check of everything the earlier passes established.

Verdict: **PASS, with two explicitly unverified items and six recorded residual
risks.** No requirement is claimed as passing on test output alone; each row names
the measurement behind it. Nothing was committed, pushed, deployed or written to
production.

---

## 1. Requirements and results

| ID  | Requirement                                                                    | Result           | Evidence                                                                                                     |
| --- | ------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| R1  | Full security review of the importer against the seed and the migrations       | **PASS**         | `docs/vitalis-import-security-review.md` — 10 findings, measured evidence, residuals                         |
| R2  | A real Supabase Dashboard SQL Editor session, identity and privileges recorded | **PASS**         | Evidence §10.1 — `postgres`/`postgres`, `is_superuser=false`, `bypass_rls=true`, 18 migrations               |
| R3  | Credential lifecycle review (generation, storage, use, clearing, residue)      | **PASS**         | Security review §2 — 192-bit in-memory password, `nologin` + `password null` in `finally`                    |
| R4  | Pooler behaviour review (session vs transaction mode, GUC reuse, caching)      | **PASS**         | Security review §3, §7; evidence §4 and §9.4                                                                 |
| R5  | Failure cleanup review, including the case where cleanup cannot run            | **PASS**         | Security review §4 — explicit `rollback`, documented residue window and its check                            |
| R6  | Session isolation review (identity + GUC + injection surface)                  | **PASS**         | Security review §5 — `session_user` assertion, parameterised `set_config`                                    |
| R7  | Repeat-import limitation documented, not hidden                                | **PASS**         | Seed doc "One import per project"; security review §7; `28P01` now reported as a cache problem               |
| R8  | Docs reproducible and free of overstated guarantees                            | **PASS**         | Seed doc rewritten (script is canonical, no `supabase_admin` route, runnable SQL); evidence §10.3            |
| R9  | TLS trust-anchor (`--ca`) pinning exercised end to end on hosted Supabase      | **NOT VERIFIED** | Two disposable projects became unreachable at the pooler before import; see §3                               |
| R10 | Repeat import re-measured on a fresh project                                   | **NOT VERIFIED** | Not re-run this pass; the earlier `28P01` measurement stands (evidence §9.4)                                 |
| R11 | 1,181-test baseline preserved                                                  | **PASS**         | `npm run test` — 107 files, **1,181 passed**, exit 0                                                         |
| R12 | Typecheck, build, lint, formatting, seed freshness after the changes           | **PASS**         | `tsc --noEmit` 0; `npm run build` 0; `eslint` 0; `prettier --check` 0; `seed:evidence:check` 0               |
| R13 | Migration renames byte-identical, no fabricated history                        | **PASS**         | `git mv` only; SHA-256 recorded; no `migration repair`, no manual version rows                               |
| R14 | Full `db push` from an empty project                                           | **PASS**         | 25 migrations, latest `20261112`, 13 tables / 11 triggers / 37 policies                                      |
| R15 | The renamed files re-apply cleanly to an existing schema                       | **PASS**         | `psql -f` exit 0, zero `ERROR` lines, 45 tables / 25 versions unchanged                                      |
| R16 | A1 — `erase_my_data()` covers `evidence_editors`                               | **PASS**         | `20261111_vitalis_erase_evidence_editors.sql`; `eraseCoverage` test green                                    |
| R17 | A2 — committed version requires a narrative                                    | **PASS**         | `20261112_vitalis_evidence_revision_coverage.sql`; suite green                                               |
| R18 | A3 — the lifecycle migration can be re-applied                                 | **PASS**         | `20261110`: 17 `create policy`, 17 matching `drop policy if exists`                                          |
| R19 | A4 — the lifecycle filename is resolved                                        | **PASS**         | `20261110_vitalis_evidence_lifecycle.sql`; three references updated                                          |
| R20 | No production change: no writes, deploy, commit or push                        | **PASS**         | Dashboard read-only session; production still 18 migrations, no importer role                                |
| R21 | Importer hardening F1–F7 as reviewed                                           | **PASS**         | Wrong target exit 2, `:6543` exit 2, no password exit 2, seven counts asserted, login probe, membership rule |
| R22 | Every changed file independently reviewable                                    | **PASS**         | Working tree only; no commit created; docs state measured vs residual                                        |

---

## 2. What changed in this pass

- `docs/vitalis-import-security-review.md` — new. Findings SR-1…SR-10 with
  severity, disposition and the measurement behind each; residual risks; the
  production identity observation.
- `docs/vitalis-evidence-seed.md` — rewritten where it was wrong or implied more
  than the code does: the script is the canonical route; the `supabase_admin`
  route is removed and explained; the non-runnable pair-drift query is replaced
  with a runnable listing plus the seed's own refusal as the authoritative check;
  the one-import-per-project limit, the `--ca` requirement, the residue window and
  the "what it does not do" list are stated.
- `docs/vitalis-p2.2-hosted-verification-evidence.md` — new §10: the dashboard
  session, the TLS chain and refusal, and the two unverified items.
- `scripts/vitalis-import-catalogue.mjs` — verified TLS by default, `--ca` trust
  anchor, explicit `--insecure-tls`, bound-parameter `set_config`, explicit
  `rollback`, actionable `SELF_SIGNED_CERT_IN_CHAIN` and `28P01` messages,
  corrected header comments.

No migration, test, product source or data file was changed in this pass.

---

## 3. Unverified items, in full

**R9 — `--ca` pinning.** Supabase signs the pooler chain with its own CA
(`Supabase Root 2021 CA`, self-signed), so verification with Node's default trust
store fails — measured, `SELF_SIGNED_CERT_IN_CHAIN`, exit 1, no credential
created. The fix is a trust anchor passed with `--ca`. That path was not exercised
against hosted Supabase: `bloom-p22-verify8` and `-9` (both disposable, both
deleted) became unreachable at the pooler (`ECONNRESET`, then `server closed the
connection` on the owner connection) before the import ran. What remains untested
is the certificate read plus one successful verified handshake.

Consequence, stated plainly: a real import using `--ca` has not been demonstrated
in this pass. The alternative, `--insecure-tls`, is a recorded downgrade and is not
what the runbook recommends.

**R10 — repeat import.** The `28P01` pooler-cache behaviour was measured earlier
(evidence §9.4) and is unchanged in kind; it was not re-measured this pass. The
script now reports that code as a cache problem with its remedy, which is the
change that matters for an operator.

Neither item blocks the migration changes or the security review. Both are recorded
rather than rounded up.

---

## 4. Residual risks carried forward

1. **Residue window.** If the owner connection dies mid-run, the temporary login
   role survives with a 192-bit password nobody holds. One query in the runbook
   detects and clears it.
2. **Statement-log exposure.** The temporary password is a literal in a DDL
   statement; Supabase's default `log_statement = none` is what keeps that quiet.
3. **`postgres` remains a member of `evidence_importer`.** Hosted records the grant
   under `supabase_admin`, so the revoke cannot succeed. Asserted and reported; not
   an escalation.
4. **Owner-level claim deletion.** Prevented by foreign keys, not by a named
   lifecycle rule. An unreferenced claim could be deleted by the owner.
5. **`--ca` file provenance.** The trust anchor is only as good as the file the
   operator downloads.
6. **Trigger strength.** The seed's non-destructive guarantees live in the
   triggers; a future migration that weakens them would not be caught by the
   importer. The integration suite is the control.

---

## 5. Operational observation, outside the acceptance scope

The Supabase organisation reported egress at 659 % of its 5 GB allowance for the
billing period ending 10 November 2026, with a grace period to **4 December 2026**,
after which project requests may return HTTP 402. This did not cause any failure in
this pass (the failures above are pooler connection resets), but it is worth
resolving before further hosted verification.

---

## 6. Verdict

**Acceptance-ready.** The security review is complete and its high-severity finding
is fixed, the dashboard session is now measured rather than assumed, the
documentation matches what the code actually enforces, and the 1,181-test baseline
still holds with typecheck and build green. Two items are explicitly unverified
(R9, R10) and six residual risks are recorded; none of them is presented as closed.

Per the standing instruction, nothing has been committed, pushed or deployed, and
production `bloom-app` was only read.
