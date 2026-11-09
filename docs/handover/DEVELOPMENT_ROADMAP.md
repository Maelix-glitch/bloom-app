# BLOOM — Development Roadmap (for Muse)

Prioritised by **safety/data integrity first, then verifiable correctness, then product completeness and polish**. Dependencies are explicit; do not start later phases by assuming earlier ones are done. Labels reference `BUGS_AND_ERRORS.md` and `INCOMPLETE_WORK.md`.

## PHASE 0 — KNOWLEDGE TRANSFER AND BASELINE
**Objectives:** eliminate guesswork; establish a reproducible, measured baseline on the current branch/tree.  
**Current status:** PARTIALLY DONE by this handover (docs created; build/tsc/test/lint/audit sampled). Not complete: PG-backed test rerun, wrangler dry-run/local worker re-verification, and clean-environment install check not executed.  
**Outstanding tasks:**
- Read all `docs/handover/*`; map claims to cited files/commands.
- In a controlled environment, run `npm ci` (or chosen canonical install), `tsc --noEmit`, `npm run build`, `npm run build:worker`.
- Start local PostgreSQL per `src/lib/vitalis/db/harness.ts` and re-run `npm test`; record 107/1181 or explain diffs.
- Run `npx wrangler --cwd .output/server deploy --dry-run` (with auth) and local worker preview; capture module count and HTTP checks (homepage/assets). Compare to historical 103 modules / `127.0.0.1:8787` 200.
- Inventory dirty working tree (41 entries) with owners/intent; decide commit plan **without discarding unrelated changes**.
**Dependencies:** access to toolchain, optionally Cloudflare auth, local PG.  
**Risks:** “fixing” tests by weakening assertions; confusing environment failures with regressions.  
**Acceptance criteria:** a dated baseline note (can extend handover changelog) with exact command outputs, pass/fail counts, and environment details.  
**Definition of completion:** any engineer can reproduce the baseline from documented steps.

## PHASE 1 — STABILITY AND SECURITY
**Objectives:** remove critical known risk; protect auth/data boundaries; make failures honest.  
**Current status:** NOT STARTED. Audit shows 32 vulns (7 critical, 10 high).  
**Outstanding tasks (priority order):**
1. **TanStack Start/server-function XSS chain** — upgrade `@tanstack/react-start` ecosystem to verified patched versions; regression-test SSR, routing, server middleware, and any Start server-function paths (advisory: unauthenticated reflected XSS in server-function responses). (C1)
2. **Zod, Seroval, Vite/vitest toolchain advisories** — assess reachability; upgrade with tests; treat majors as breaking. (C1)
3. **Wrangler/miniflare/undici/esbuild/minimatch chains** — upgrade dev/deploy tooling; re-verify build/worker output.
4. Review `supabase/functions/coach/index.ts` CORS/auth and rate/abuse posture; confirm gateway protection matches intent. (G3)
5. Confirm RLS/invite/admin/reward policies on the real project match migrations; no permissive shortcuts.
6. Resolve package-manager/lockfile strategy (npm canonical?) and document it. (E3)
**Dependencies:** Phase 0 baseline; access to advisories; staging Supabase project for integration checks.  
**Risks:** breaking upgrades; accidental policy weakening; secret exposure during debugging.  
**Acceptance criteria:** critical/high audit items remediated or formally risk-accepted with evidence; targeted security smoke tests pass; no secrets committed.  
**Definition of completion:** dependency report shows no unresolved critical/high findings in the shipping/runtime-relevant graph without documented exception; authz boundaries verified.

## PHASE 2 — ARCHITECTURAL MATURITY
**Objectives:** reduce fragility, clarify boundaries, pay down structural debt.  
**Current status:** PARTIAL. App works as a large single-package system with offline-first patterns and edge functions, but has variants, generated artefacts, and workaround scripts.  
**Outstanding tasks:**
- Document canonical vs experimental routes (`cycle-*`, `trackers-*` variants); remove or gate dead surfaces.
- Make root CI for Bloom (scoped lint/format, typecheck, build, tests with PG service). (No root CI today.)
- Replace/repair root `README.md`; keep one source of truth (`docs/handover/` + concise README). (H1/E4)
- Evaluate removing `scripts/fix-worker-chunks.mjs` when Rolldown/Nitro toolchain is fixed; until then, add a comment/test ensuring it runs in deploy path.
- Clarify server/client data boundaries per feature; add server functions only where they reduce risk/duplication, with CSRF/auth considered.
- Rationalise large root-level historical markdown into `docs/archive/` (only with care, preserving history). 
**Dependencies:** Phase 1 security decisions may affect structure; Phase 0 baseline.  
**Risks:** large refactors without tests; breaking offline/local flows.  
**Acceptance criteria:** CI green on agreed checks; canonical route map documented; README accurate.  
**Definition of completion:** architecture decisions are written down and enforced by tooling/review, not tribal knowledge.

## PHASE 3 — DESIGN SYSTEM AND VISUAL IDENTITY
**Objectives:** consistent, premium, accessible UI across Bloom’s real product areas.  
**Current status:** PARTIAL/strong in places (brand fonts, boot splash, skin system, Radix primitives, motion), uneven verification.  
**Outstanding tasks:**
- Audit design tokens (colour, spacing, type, radii, elevation, focus rings) and consolidate into a documented system.
- Ensure reduced-motion support and focus visibility across modals/sheets/editor/canvas.
- Verify dark-theme contrast and semantic colour use in charts and status states.
- Unify loading/empty/error/degraded/offline states (especially profile/coach/stories/sync).
**Dependencies:** none hard, but coordinate with Phase 4/6.  
**Risks:** visual regressions; “premium” effects harming readability/performance.  
**Acceptance criteria:** component inventory maps to tokens; accessibility spot checks pass on key flows.  
**Definition of completion:** new UI work uses the system by default; major surfaces feel coherent.

## PHASE 4 — COMPLETE PRODUCT EXPERIENCE
**Objectives:** every user-facing route and core interaction works end to end in supported configurations.  
**Current status:** PARTIAL. Most areas implemented; depth/edge cases and environment integrations unverified.  
**Outstanding tasks:**
- **Home/habits/trackers/cycle/mood:** verify create/log/edit/delete/undo, streaks, goals, timezone/local-day behaviour, sync conflicts, empty states.
- **Profile/stories/highlights/public handle:** verify save, uploads, privacy, public view RPC, GIPHY-backed editor (with secret), archive/delete.
- **Rewards/progression/admin:** verify earning rules, claim idempotency, admin allow-list, delivery windows.
- **Report/legal:** verify data accuracy and navigation.
- Audit Mood Intelligence against the README brief; produce a gap checklist and implement/descope deliberately.
- Validate invite-only + magic-link happy/sad paths on a real Supabase project.
**Dependencies:** Phase 1 for auth/security confidence; staging backend with migrations/functions/secrets.  
**Risks:** shipping “UI complete” without data/policy correctness.  
**Acceptance criteria:** per-route acceptance checklist signed off; critical CRUD/sync flows pass; RLS prevents cross-user access.  
**Definition of completion:** supported routes have no known blocking defects in their defined scope.

## PHASE 5 — INTELLIGENCE AND PERSONALIZATION
**Objectives:** make coach/insights accurate, grounded, safe, and operationally reliable.  
**Current status:** PARTIAL. Rich implementation and tests; online dependency and provider ops are real constraints.  
**Outstanding tasks:**
- Deploy and verify `coach` edge function across provider configurations; test timeouts, failover, vision, PDF, tool sidecars, memory remember/forget.
- Validate “strictly online” UX: clear errors, retry, no fake local coach answers (regression guard).
- Tune/verify mood/cycle correlation and pattern claims — sample sizes, insufficiency logic, no false causation, no diagnosis.
- Verify Bloom facts in coach prompt stay in sync with actual app capabilities (drift risk as features change).
- Cost/control: provider order, token/latency budgets, logging (no personal data/keys in logs).
**Dependencies:** Phase 1 (secrets/CORS/auth review), staging environment.  
**Risks:** hallucinated grounding, unsafe health language, provider outages, prompt drift.  
**Acceptance criteria:** golden-question suite passes; sensitive topics follow safety rules; media never stored; actions only execute with valid tool sidecars.  
**Definition of completion:** coach/insights behaviour is measured, bounded, and monitored.

## PHASE 6 — PERFORMANCE AND RESPONSIVENESS
**Objectives:** fast, smooth experience on mobile and desktop, including heavy analytics.  
**Current status:** UNKNOWN/PARTIAL. Large ECharts chunks observed; no perf budget evidence.  
**Outstanding tasks:**
- Establish budgets (LCP/INP/CLS, JS size per route, worker CPU where relevant).
- Lazy-load Mood Intelligence/Cycle analytics charts; defer non-critical visual layers.
- Profile React renders in heavy pages (coach thread, mood intelligence, cycle intel, story editor).
- Verify Cloudflare edge caching/headers for static assets; confirm SW update strategy doesn’t strand users.
- Test low-end mobile, offline/lie-fi, and background tab behaviour.
**Dependencies:** Phase 4 feature completeness helps target real screens.  
**Risks:** premature optimisation; regressions in interactivity.  
**Acceptance criteria:** budgets met on representative devices/routes; no major jank in core logging flows.  
**Definition of completion:** performance is measured and tracked, not assumed.

## PHASE 7 — QUALITY ASSURANCE
**Objectives:** confidence through automated and manual verification.  
**Current status:** PARTIAL. Strong unit/lib test breadth (107 files, 1181 tests in suite); DB integration tests need environment; no root CI; E2E/accessibility unverified.  
**Outstanding tasks:**
- Make Vitest fully green in CI: provide PG service for Vitalis harness or split/mark DB integration tests appropriately. (A1)
- Add scoped lint/format gate and fix baseline intentionally. (A2)
- Add E2E (Playwright) for critical journeys and auth/privacy boundaries.
- Add accessibility checks (axe) and manual SR/keyboard passes.
- Regression tests for every Phase 1 security fix and every P2.2/Vitalis invariant touched.
**Dependencies:** Phases 0–1.  
**Risks:** slow/flaky tests; false confidence from mocked-only coverage.  
**Acceptance criteria:** CI required checks cover type/build/lint-scope/unit (+DB where applicable); E2E smoke green; a11y blockers resolved.  
**Definition of completion:** releases are gated by repeatable evidence.

## PHASE 8 — INFRASTRUCTURE AND DEPLOYMENT
**Objectives:** reliable, documented, reversible delivery to Cloudflare + Supabase.  
**Current status:** PARTIAL. Scripts/config patterns exist; live deployment unverified.  
**Outstanding tasks:**
- Re-verify wrangler dry-run (module count) and local worker (`127.0.0.1:8787`) behaviour; record current results.
- Execute authorised preview/prod deploy; verify URL, assets, auth callbacks, RLS-backed flows, SW, functions.
- Document rollback strategy (previous worker version, migration cautions — migrations are forward-only in practice; plan carefully).
- Set up monitoring/logging: Worker errors, edge function failures, auth anomalies, push delivery outcomes (privacy-safe).
- Resolve the `fix-worker-chunks` compatibility_date pin vs generated date question (G2).
- Supabase: environment separation (dev/staging/prod), migration discipline, secret rotation runbook.
**Dependencies:** Phases 1, 7.  
**Risks:** deploying dirty tree; production data impact; secret leakage.  
**Acceptance criteria:** staging and prod (if applicable) deployed from known commits with post-deploy checklists; alerts exist for critical failures.  
**Definition of completion:** deploy is boring, repeatable, and observable.

## PHASE 9 — FINAL PRODUCT MATURITY
**Objectives:** ship-ready quality, documentation, and operational handoff beyond Muse if needed.  
**Current status:** NOT STARTED.  
**Outstanding tasks:**
- Full regression pass across routes, roles (signed out/invited/admin), devices, and offline/online transitions.
- Security re-audit after upgrades; dependency/process review.
- Finalise user-facing copy (coach safety language, empty states, legal pages with product/legal sign-off).
- Archive obsolete docs/experiments; keep `docs/handover/` and runbooks current.
- Produce release notes, support playbook, and “how to verify health” checklist.
**Dependencies:** Phases 1–8 substantially complete.  
**Risks:** declaring maturity without evidence; scope creep.  
**Acceptance criteria:** all phase acceptance criteria met or explicitly deferred with owner/date; no known critical/high security issues; deployment and rollback rehearsed.  
**Definition of completion:** Bloom can be operated, debugged, and extended by a new engineer using repo evidence alone — which is the standard this handover is meant to establish.
