# BLOOM — Incomplete, Partial and Outstanding Work

This is a candid inventory. “Incomplete” includes missing verification, unfinished product surfaces, operational gaps and debt. Items are grouped; each states what remains and what “done” means.

## 1. Security remediation (critical path)

- **Unresolved:** 32 dependency vulnerabilities reported by `npm audit` (7 critical, 10 high, 15 moderate). Includes `@tanstack/react-start` / `start-server-core` / `start-plugin-core` chain (unauthenticated reflected XSS in server-function responses advisory as reported by audit), `zod`, `seroval`, `vitest`/`vite`/`esbuild`, `miniflare`/`wrangler`/`undici`, `minimatch`/tooling chain, etc. **Fix:** on a branch, map each advisory to the minimum safe version bump; upgrade TanStack Start/router ecosystem coherently; verify Start/Start-server-core patched versions against the actual advisory IDs; re-run `tsc`, `build`, `build:worker`, `test` (with PG for Vitalis DB tests), and targeted SSR/server-function smoke tests; do not use force upgrades without review. **Done when:** audit shows no known critical/high issues in the shipped graph (or each residual is formally accepted with justification) and app behaviour is verified.

## 2. Hosted/production verification

- **Unresolved:** no verified production URL or confirmed successful `wrangler deploy` from this state. `.output` exists but deploy recency/success is unknown. **Fix:** confirm Cloudflare account/project binding, set build-time envs, run `npm run build:worker` and `npx wrangler deploy --dry-run` from the correct cwd/config, then deploy only when authorised; verify routes, assets, auth callback, SW, and public pages. **Done when:** a named production/preview URL is documented with HTTP checks and core flows verified.
- **Unresolved:** historical note said local Worker at `http://127.0.0.1:8787` returned 200 for homepage/assets but tunnel failed (SIGTERM) — **re-verify current local worker** (`wrangler dev`/preview commands) because toolchain and tree changed. **Done when:** current local preview evidence is captured or limitations recorded.

## 3. Vitalis evidence rollout (security-sensitive)

- **Unresolved (from P2.2):** `--ca` trust-anchor path exercised end-to-end on hosted Supabase — **NOT VERIFIED** (disposable projects became unreachable). **Fix:** on a fresh disposable project with stable connectivity and quota, run importer with downloaded project CA via `--ca`, confirm verified handshake and counts; record exact output. **Done when:** evidence doc updated with PASS and artefacts.
- **Unresolved:** repeat-import re-measurement on a fresh project — **NOT VERIFIED** (earlier `28P01` measurement stands). **Fix:** after cache expiry/window per pooler behaviour, re-run and capture. **Done when:** measured and documented.
- **Unresolved:** applying evidence migrations (`20261104`–`20261112`) and running the importer on any non-disposable/production target. **Fix:** only with explicit authorisation, backup/rollback plan, and the reviewed procedure; never against `bloom-app` production without approval. **Done when:** migrations applied in intended order, verification queries pass, seed/import audited.
- **Residuals documented (not bugs to “fix” casually):** importer residue window on owner-connection death, statement-log exposure reliance on `log_statement=none`, `postgres` membership in `evidence_importer` on hosted, unreferenced-claim deletion not lifecycle-named, `--ca` file provenance, trigger-strength regression detection via integration suite. **Fix:** keep docs accurate; improve only with reviewed migrations/code.

## 4. Testing and quality gates

- **Unresolved in this environment:** 64 Vitalis lifecycle DB tests fail with `ECONNREFUSED 127.0.0.1:5433` because local PostgreSQL 18.6 is not running. **Fix:** start/configure the expected test database/roles (see `src/lib/vitalis/db/harness.ts`: host 5433, db `vitalis_test`, maintenance `postgres`, roles `anon`/`authenticated`/`service_role`) or adapt CI/dev docs; re-run `npm test`. **Done when:** 107 files / 1181 tests pass (or failures are explained by intentional changes with updated expectations).
- **Unresolved:** root `npm run lint` is not a usable gate (massive Prettier/CRLF baseline). **Fix:** choose a strategy — format the repo intentionally (big, review carefully), or add a scoped lint gate for changed/app code and `.prettierignore`/CI config; do not hide real errors. **Done when:** a deterministic lint/format check passes for the maintained surface.
- **Unresolved:** end-to-end coverage appears absent/minimal as an enforced gate (Playwright dep exists; no dedicated CI workflow for root app). **Fix:** add critical-path E2E (auth gate, home, habit tick, tracker log, cycle log, coach happy/failure, profile save, erase confirmation) against a safe environment. **Done when:** repeatable E2E suite runs in CI/local docs.
- **Unresolved:** accessibility audit (keyboard, focus, contrast, reduced motion beyond ad-hoc handling, screen-reader labels) is not verified. **Fix:** run axe/lighthouse/manual passes on key routes. **Done when:** critical issues fixed or tracked with evidence.

## 5. Feature completeness / UX verification

- **Mood Intelligence parity with README brief:** README contains a long premium “Mood Intelligence System” spec; components exist for many parts, but parity (every named metric/visual/insufficiency rule/correlation quality/IndexedDB-only claim) is **not verified**. **Fix:** audit `src/lib/mood/*` + `components/mood/*` against the brief; mark each item implemented/partial/missing; implement gaps or consciously descope. **Done when:** a checklist maps every brief requirement to code + tests.
- **Stories/editor depth:** rich editor code exists; real-device media capture, storage/RLS policy correctness, GIPHY secret configuration, and sharing/privacy edge cases need verification. **Fix:** exercise flows with a configured Supabase project and secrets. **Done when:** create/edit/publish/view/delete flows pass with policies enforced.
- **Push notifications end-to-end:** local scheduling exists, but closed-app delivery requires deployed `push-send`, secrets/cron, valid VAPID, SW, and subscription rows. **Fix:** stage with a test user/device; verify opt-in, delivery, failure cleanup. **Done when:** due reminder arrives with app closed and errors are observable.
- **Coach operational readiness:** depends on deployed `coach` function and at least one healthy provider key; local dev without function yields unavailable state (by design). **Fix:** deploy function, set secrets, verify provider order/timeouts/cost controls, and test memory/tool sidecars and image/PDF paths. **Done when:** Ask/Reflect/Plan, error/retry, and action/memory flows work in a real environment.
- **Admin/progression operational checks:** admin routes exist; allow-list/policy behaviour must be validated on the target project. **Fix:** confirm `app_admins` and RPC grants; test publish/claim flows. **Done when:** non-admins cannot perform admin actions; intended admins can.

## 6. Architecture / maintainability

- **Generated/large artefacts in tree awareness:** `.output`, `.wrangler`, `.wrangler.bak`, `node_modules` present locally; root contains many historical markdown files and screenshots — can confuse ownership and lint. **Fix:** clarify canonical docs (`docs/handover/` + selected root docs) and ignore/build policies. **Done when:** contributors know where truth lives.
- **Route variants:** `cycle-classic.tsx`, `cycle-styles.tsx`, `trackers-styles.tsx`, `trackers-premium.tsx` etc. suggest experiments. **Fix:** identify canonical routes, deprecate/remove dead ones, or hide behind flags. **Done when:** navigation points only to supported surfaces.
- **README is misleading:** root `README.md` currently contains a Mood Intelligence prompt/notes, not accurate setup/deploy/product documentation (also stale relative to actual stack naming). **Fix:** replace with truthful quickstart, env, scripts, deploy, and links to `docs/handover/`. **Done when:** a new engineer can bootstrap without following the prompt text.
- **Bundle/performance:** server build reports very large ECharts-related chunks; mobile/perf budgets unverified. **Fix:** lazy-load heavy analytics, audit route-level splitting, measure CWV/Lighthouse. **Done when:** key routes meet agreed budgets.
- **Nitro beta / toolchain churn:** Nitro `3.0.260603-beta`, Vite 8, TanStack Start versions — upgrade path and Worker chunk workaround need periodic review. **Fix:** track upstream fixes; remove `fix-worker-chunks` workaround when safe. **Done when:** builds/deploys are stable without post-patch or patch is removed.

## 7. Configuration and operations

- **`wrangler.jsonc` missing at root:** deployment relies on Nitro-generated config; this is fine but must be understood. **Fix:** document the exact deploy cwd/commands and generated files. **Done when:** DEPLOYMENT handover is followed successfully.
- **Supabase `config.toml` placeholder:** `project_id = "replace-with-your-project-ref"`. **Fix:** never commit real secrets; link locally per environment. **Done when:** operators know how to target the right project.
- **No root Bloom CI workflow:** only `bloom-discord.yml` (scoped). **Fix:** add CI for install/typecheck/build/test/lint (scoped) and optional worker dry-run. **Done when:** PRs to Bloom code get automated checks.
- **npm/pnpm/bun ambiguity:** repo has `package-lock.json`, `bun.lock`, `bunfig.toml`; scripts use `npm`/`npx`. **Fix:** pick and document the canonical package manager; align lockfiles/CI. **Done when:** one install path is authoritative.

## 8. Data/privacy/compliance follow-through

- **Erase coverage over time:** `erase_my_data()` has been extended by multiple migrations (including Vitalis evidence editors). Any new table holding user data must be added to erase/export logic and coverage tests. **Fix:** maintain `eraseCoverage` tests and migration discipline. **Done when:** new data surfaces are covered before release.
- **Legal copy review:** `/privacy` and `/terms` exist as routes/components but legal adequacy is not an engineering certification. **Fix:** product/legal review. **Done when:** approved copy matches actual data flows.

## Priority order (summary)

1. **Security upgrades** (TanStack Start XSS chain, Zod, high/critical audit items) with regression verification.  
2. **Stabilise quality gates** (PG-backed test run reproducible, scoped lint/format gate, basic CI).  
3. **Deployment verification** (wrangler dry-run/preview, then authorised deploy) and environment docs.  
4. **Coach/notifications operationalisation** in a configured environment.  
5. **Mood/Vitalis/product parity audits** with explicit checklists and measured completion.
