# BLOOM — Build, Test, Configuration and Deployment Status

**Honest summary:** local build/typecheck succeeded in this pass; tests are mostly green but Vitalis real-PG integration tests fail without a local PostgreSQL harness; lint is not green repo-wide; **production deployment is NOT verified**. Do not assume Bloom is live.

## 1. Environment prerequisites

- Node.js + npm (repo scripts use `npm`/`npx`; lockfiles `package-lock.json` and `bun.lock` both exist — **standardise before CI**).
- For Cloudflare deploy/preview: `wrangler` (installed as dev dep `^4.130.0`) and Cloudflare auth (`npx wrangler login`).
- For full test suite including Vitalis DB tests: PostgreSQL 18+ reachable per `src/lib/vitalis/db/harness.ts` defaults — `127.0.0.1:5433`, database `vitalis_test`, maintenance `postgres`, user `postgres`, roles `anon`/`authenticated`/`service_role` available to tests as designed. Env overrides: `VITEST_POSTGRES_HOST/PORT/DATABASE/USER/PASSWORD/MAINTENANCE_DATABASE`.
- For connected app behaviour: Supabase project envs (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) at build/runtime as applicable; Supabase migrations applied; Edge Functions deployed with required secrets.

## 2. Environment variables

From `.env.example` (client/build, `VITE_` prefix): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_COACH_FUNCTION` (default `coach`), optional `VITE_VAPID_PUBLIC_KEY`. **These are build-time-injected/public-context values** in Vite usage patterns described by `DEPLOY.md`; handle accordingly.

Server-side Supabase secrets (never `VITE_`): coach provider keys and tuning (`GEMINI_API_KEY`, `GROQ_API_KEY`, `APINEX_API_KEY`, `HF_TOKEN`, `COACH_*`), `GIPHY_API_KEY`, push secrets (`PUSH_CRON_SECRET`, VAPID private side) as per `supabase/functions/*` and `supabase/config.toml`/README.

## 3. Actual command results (this pass, 9 Nov 2026)

| Command | Result | Evidence / notes |
|---|---|---|
| `npm ci` | **Not executed** | Would be destructive/slow relative to dirty tree and not required to capture current build truth; `package-lock.json` present, `node_modules` present. Run in a clean environment/CI to verify reproducible install. |
| `npx tsc --noEmit` | **PASS (exit 0)** | completed successfully |
| `npm run build` | **PASS (exit 0)** | Nitro `cloudflare-module` output; generated `.output/server/wrangler.json`, `.output/nitro.json`, `.output/public/_headers`; large chunks noted (`echarts`+deps ~2.57 MB) |
| `npm run build:worker` | **Not re-run separately after build in this pass** | `build:worker` = build + `scripts/fix-worker-chunks.mjs`. The fix script exists and is part of deploy; run it explicitly before deploy/dry-run to be certain post-patch steps applied to current `.output`. |
| `npm run lint` | **FAIL (exit 1)** | ~181k problems, overwhelmingly `prettier/prettier` (CRLF/format baseline), not a clean signal for recent changes alone |
| `npm run test` | **FAIL (exit 1) — environment-dependent** | **102 files passed, 5 failed; 1117 tests passed, 64 failed** (1181 total). All failures: `src/lib/vitalis/db/evidence-lifecycle.integration.test.ts` → `connect ECONNREFUSED 127.0.0.1:5433`. No local PG was running; P2.2 previously recorded 107/1181 pass with local PG 18.6 on 5433. |
| `npx wrangler --cwd .output/server deploy --dry-run` (or equivalent) | **Not executed in this pass** | Requires Cloudflare auth/context and careful cwd; historical claim: dry-run recognised generated Worker config and attached 103 modules — **verify current**. |
| Wrangler local dev (`wrangler --cwd .output/server dev` / `preview:prod`) | **Not executed in this pass** | Historical claim: local Worker started at `http://127.0.0.1:8787`, homepage and static assets returned 200 — **verify current**. |
| Production deploy | **Not executed / not verified** | No authorised deploy performed. Historical tunnel failure (SIGTERM) did **not** establish production deployment. **Actual current deployment status: UNKNOWN / NOT VERIFIED as live.** |

## 4. Build outputs and configuration

- `.output/nitro.json` (present): preset `cloudflare-module`, Nitro `3.0.260603-beta`, `serverEntry: "server/index.mjs"`, deploy config `cloudflare.deployConfig: true`, `nodeCompat: true`, commands preview/deploy via `wrangler --cwd ./`.
- `.output/server/wrangler.json` (generated): `main: "index.mjs"`, assets binding `ASSETS` → `../public`, `name: bloom-app`, `compatibility_flags: ["nodejs_compat"]`, `compatibility_date` observed as `2026-11-10` in generated file; `scripts/fix-worker-chunks.mjs` contains logic to pin `2026-09-10` — **verify final deployed value** (possible ordering/staleness; Cloudflare rejects future dates).
- No root `wrangler.jsonc`/`wrangler.toml`. Nitro generates config.

## 5. Exact deployment procedure (documented / to verify)

1. Ensure clean, intended commit state and env values. **Do not deploy from a dirty tree containing unrelated work without understanding it.**
2. Set build-time envs: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (and optional `VITE_*` as needed). On Windows PowerShell: `$env:VITE_SUPABASE_URL="..."; $env:VITE_SUPABASE_ANON_KEY="..."`.
3. `npm run build:worker` (build + chunk fix). Confirm it completed and inspect `.output/server` if needed.
4. Authenticate: `npx wrangler login` (once).
5. Optional safety check: `npx wrangler --cwd .output/server deploy --dry-run` (or the generated command form) — verify module count/bindings.
6. Deploy: `npm run deploy` (or `npx wrangler --cwd .output/server deploy` / `deploy:name` per `package.json`).
7. Post-deploy verification (required): open the returned `*.workers.dev` or custom domain; check `/`, `/privacy`, `/terms`, static assets, auth flow (if configured), SW registration, and key routes; confirm console/network have no blocking errors; never claim success from HTTP 200 alone for complex flows.

## 6. Supabase / backend deployment (separate from Worker)

- Apply migrations in order to the target project; never fabricate migration history. Use reviewed procedures for sensitive migrations (Vitalis importer has its own security runbook — **do not run on production without approval**).
- Deploy Edge Functions as needed: `supabase functions deploy coach|giphy|push-send`; set required secrets (`supabase secrets set ...`). See `supabase/config.toml`, `supabase/README.md`, function headers.
- Configure storage buckets/policies (profile-media, story assets) per migrations.
- Invite-only/auth/email settings must match product expectations.

## 7. Capacitor / app builds

- Static build: `BLOOM_TARGET=capacitor` path via `npm run build:app`/`app:build`; output to `dist/client`; sync to `android/`/`ios`. **Native build/signing/store submission not verified here.** See `APP_WRAPPER.md`.

## 8. Known operational risks

- Dependency vulnerabilities (especially TanStack Start server-function XSS chain) — remediate before trusting production exposure.
- Coach/GIPHY/push depend on correctly deployed functions and secrets; missing secrets should fail honestly, but operationally this is a common “it doesn’t work” source.
- Dirty working tree contains migration renames, package changes and Vitalis work — deploying “current state” without deliberate commit selection is unsafe.
- RLS/admin/invite policies are security boundaries; verify on the target Supabase project, not assumed from local code.

## 9. What “deployed and verified” would mean

A dated record containing: commit hash, exact commands, wrangler output (redacted), deployed URL, HTTP checks, screenshots/logs for key flows, environment (preview/prod), and known limitations. **That record does not exist in this handover.**
