# BLOOM — Bugs, Errors, Security and Misinformation

This report is evidence-based. “Previously reported” items are included when the repo/history/docs mention them; status is stated as **confirmed in this pass**, **not reproduced in this pass**, **partially resolved**, **resolved**, or **unknown**. No issue is hidden because it is inconvenient.

## A. Confirmed errors (this pass)

### A1 — Vitest: 64 Vitalis DB integration failures in the default local environment
- **Description:** `npm run test` failed (exit 1). 102 files / 1117 tests passed; **5 files / 64 tests failed**, all in `src/lib/vitalis/db/evidence-lifecycle.integration.test.ts`.
- **Severity:** Medium for general app confidence, **High for Vitalis verification confidence in an unprepared environment** (false-negative risk if misread; real risk if PG is unavailable in CI).
- **Reproduction (observed):** run `npm run test` with no PostgreSQL listening at `127.0.0.1:5433`. Failures report `connect ECONNREFUSED 127.0.0.1:5433`.
- **Relevant files:** `src/lib/vitalis/db/evidence-lifecycle.integration.test.ts`, `src/lib/vitalis/db/harness.ts` (`PG_HOST/PORT/DATABASE`, `vitalis_test`, roles, migration application).
- **Root cause (established):** harness requires a real PostgreSQL 18 server and specific roles/database; this pass did not have it running. P2.2 acceptance work recorded 107/1181 passing when local PG 18.6 was initialised and started on 5433.
- **Current status:** **Reproducible environment failure / not a confirmed product regression.** Must be re-verified with the harness environment.
- **Recommended resolution:** document and automate the test DB setup (local script/container), or split DB integration tests behind an explicit env flag/CI job; keep unit coverage fast and deterministic.

### A2 — Repo-wide lint/format gate fails
- **Description:** `npm run lint` exits 1 with ~181k problems (Prettier/CRLF and other findings), including generated/vendor-like areas (`.wrangler.bak` was mentioned in prior context; output shows widespread `prettier/prettier`).
- **Severity:** Medium (process/debt). Masks signal.
- **Reproduction:** `npm run lint`.
- **Relevant files:** `eslint.config.js`, `.prettierrc`, `.prettierignore` (inspect), whole tree.
- **Root cause:** formatting baseline drift / mixed line endings / generated artifacts in scope.
- **Current status:** Confirmed.
- **Recommended resolution:** define a scoped, enforceable lint target for maintained source; fix formatting intentionally; adjust ignore patterns; add CI for the chosen gate.

## B. Reproducible bugs

- **B1 — None newly reproduced in app runtime during this handover.** This pass verified build/tsc and automated tests (with the PG caveat) but did not perform full manual E2E across every route, auth state, device, and Supabase configuration. Absence of evidence is not evidence of absence. Muse should run targeted manual checks per `DEVELOPMENT_ROADMAP.md` Phase 0/7.

## C. Security vulnerabilities

### C1 — Dependency vulnerabilities (npm audit, verified 9 Nov 2026)
- **Description:** `npm audit --json` summary: **32 vulnerabilities — 7 critical, 10 high, 15 moderate, 0 low**.
- **Severity:** Critical (aggregate).
- **Reproduction:** `npm audit` / `npm audit --json`.
- **Relevant files:** `package.json`, `package-lock.json`.
- **Current status:** Confirmed unresolved.
- **Production implications:** exploitable classes reported by audit include server-function response XSS in TanStack Start chain, prototype pollution/RCE-class issues in transitive test tooling paths, ReDoS/DoS vectors in parsers/minimatch/glob chains, request/WS/network issues in undici, Zod memory exhaustion, and others. **Not every advisory is reachable from production runtime**, but the **TanStack Start server-function XSS path is directly relevant** to an SSR/Start app and must be treated as high priority.
- **Recommended resolution:** targeted upgrades with regression testing; do not `audit fix --force` blindly.

**Packages/advisories reported by audit (as captured):**

| Package | Severity | Audit note (truncated) | Fix available (audit) |
|---|---:|---|---|
| `@tanstack/react-start` | critical | RSC/server/plugin/start-server-core; reflected XSS in Start server-function responses | `1.169.5` (semver-minor per audit) |
| `@tanstack/react-start-rsc` | critical | via start-plugin-core/start-server-core | via start upgrade |
| `@tanstack/react-start-server` | critical | via start-server-core | via start upgrade |
| `@tanstack/start-plugin-core` | critical | via start-server-core | via start upgrade |
| `@tanstack/start-server-core` | critical | “Unauthenticated reflected XSS in TanStack Start server-function responses” | via start upgrade |
| `vitest` | critical | mocker/vite-node/UI path issues; file read/code injection vectors reported in transitive graph | `5.1.0` (major) |
| `tinypool` | critical | prototype pollution gadget → RCE-class reports | via vitest major |
| `vite` | high | path traversal in optimized deps `.map`; launch-editor issues | via vitest major (per audit) / verify direct |
| `seroval` | high | code/script injection, RegExp/fromJSON issues | `true` (audit) |
| `zod` | high | memory exhaustion validating oversized constrained collections | `4.6.7` (major) |
| `wrangler` | high | via miniflare | `true` |
| `miniflare` | high | via sharp/undici | `true` |
| `undici` | high | DoS (websocket decompression / orphaned Response) | `true` |
| `sharp` | high | libheif/librsvg dependency CVEs reported | `true` |
| `js-yaml` | high | CPU use / maxTotalMergeKeys | `true` |
| `brace-expansion` | high | quadratic expansion / CPU DoS | `true` |
| `source-map-js` | high | event-loop DoS via offsets | `true` |
| plus moderate chain | moderate | `esbuild`, `typescript-eslint`/`minimatch`, `glob`/`rimraf`, `@capacitor/cli`/`xcode`/`uuid`, `@vitest/mocker`/`vite-node`, etc. | varies |

**Required action for Muse:** record exact advisory IDs/CVEs from a fresh `npm audit`/registry view before and after remediation; confirm the installed versions resolve the Start XSS advisory specifically (installed `@tanstack/react-start` is `1.168.32`; audit suggests `1.169.5` fix path — verify). Treat Zod and Seroval upgrades as breaking-change candidates requiring code/tests.

## D. Performance problems

- **D1 — Large analytics bundles (observed at build):** server libs include `echarts+tslib+zrender` ~2.57 MB (gzip ~610 kB) and a large TanStack router chunk. **Severity:** Medium (mobile/startup/edge CPU/memory risk). **Relevant files:** `package.json` (echarts), mood/ci chart components. **Status:** Observed. **Recommendation:** route/lazy-load charts, consider lighter chart paths where feasible, measure real-user performance.

## E. Configuration problems

- **E1 — No root `wrangler.jsonc`/`wrangler.toml`:** by design (Nitro generates). Can confuse operators expecting a root Wrangler config. **Severity:** Low. **Status:** Confirmed. **Fix:** document generated-config deploy flow.
- **E2 — `supabase/config.toml` `project_id` placeholder:** expected for template; must not be mistaken for a linked production target. **Severity:** Low/operational. **Status:** Confirmed.
- **E3 — Package manager ambiguity:** `package-lock.json`, `bun.lock`, and `bunfig.toml` coexist; scripts use npm. **Severity:** Low/Medium (drift risk). **Status:** Confirmed. **Fix:** standardise.
- **E4 — Root `README.md` is not a real README:** it contains a Mood Intelligence prompt/rambling brief, not accurate setup. **Severity:** Medium (onboarding misinformation). **Status:** Confirmed. **Fix:** replace (see H).

## F. Incomplete functionality

- See `INCOMPLETE_WORK.md`. Key gaps: production deploy verification, full Mood brief parity verification, E2E/accessibility gates, push end-to-end, coach operational deployment verification, Vitalis hosted `--ca`/repeat-import closure.

## G. Suspected problems requiring investigation

- **G1 — TanStack Start SSR/server-function exposure:** with critical audit findings in the Start server core, any server-function or SSR response path reachable from untrusted input should be reviewed. No `createServerFn` usage was found under `src/routes` in grep, but Start internals/middleware still warrant verification against the advisory.
- **G2 — `fix-worker-chunks.mjs` pins compatibility_date to `2026-09-10` (script) while generated config showed `2026-11-10`:** the script attempts to pin/replace; confirm the deployed artefact’s final date and Cloudflare acceptance. Mismatch could indicate ordering or stale output. **Investigate:** read the script’s actual replacement target vs generated JSON at deploy time.
- **G3 — Coach edge function complexity and CORS/auth posture:** large function with permissive CORS headers in code; verify intended auth (Supabase gateway/JWT/apikey) and abuse controls before production reliance.
- **G4 — `__root` README/metadata claim “computed entirely from what you log”:** partially true for mood analytics, but coach can use connected LLM providers and app facts; be precise in product claims.

## H. Incorrect or outdated documentation

- **H1 — `README.md` (root):** contains “MindScape Analytics” heading, conversational Mood prompt text, and inaccurate framing — **not** Bloom’s current name/setup truth. **Correct state:** app is `bloom-app`, Bloom/Mood Intelligence branding in code; setup is Vite/TanStack Start + Supabase envs as in `.env.example` and `DEPLOY.md`.
- **H2 — `DEPLOY.md` “already wired up — one command”:** directionally useful but **overstates certainty** without verified account binding, env injection, and a successful production deploy from the current tree. It also omits the `build:worker` chunk-fix nuance except via `deploy` script.
- **H3 — P2.2 docs saying “1181-test baseline preserved” in current dirty tree:** **not true for this pass without local PG**. The earlier P2.2 run achieved it under a prepared environment; this handover records 1117/1181 passing + 64 PG-dependent failures. Both facts must be stated.
- **H4 — Historical “production deployed” implication:** the tunnel SIGTERM did **not** establish production deployment. Any doc implying live status without a verified URL is inaccurate/unknown.

## I. Previously reported errors — status

| Item | Status now | Notes |
|---|---|---|
| TanStack Start server-function response XSS vulnerability (audit) | **Unresolved / confirmed by audit** | still in dependency graph per `npm audit` |
| Zod / Seroval / Vite flagged dependencies | **Unresolved / confirmed by audit** (Zod, Seroval, Vite present in findings) | versions/fix paths require verified upgrades |
| Cloudflare Worker build previously succeeded | **Confirmed still succeeds** in this pass (`npm run build` exit 0) | not the same as deploy |
| Wrangler dry-run previously attached 103 modules | **Not re-verified in this pass** | `.output/server` exists; re-run dry-run to confirm current count |
| Local Worker at `127.0.0.1:8787`, homepage/assets 200 | **Not re-verified in this pass** | plausible given build, but unconfirmed now |
| Cloudflare tunnel failed with SIGTERM | **Historical, accepted as “not a production deploy proof”** | do not treat as deployment success |
| Git pull blocked by local npm install-script approvals (`esbuild@0.28.1`, `0.21.5`, `workerd@1.20260908.1` in package.json context) | **Not present in current `package.json` diff in that form; lockfile contains workerd/miniflare/esbuild references but the specific historical approval-strings were not found as current blockers in `package.json`** — **investigate before pull** | working tree already has package/lock changes; resolve carefully without destroying work |

## Cross-cutting recommendation

Create a single “known issues” register (can be this file, kept updated) and require every production claim to cite: command output, URL, HTTP response, or dashboard screenshot/text captured in-repo under an evidence path — never memory.
