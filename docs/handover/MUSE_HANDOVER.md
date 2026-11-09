# Handover to Muse — Bloom

**From:** Glyph (handover author, 9 Nov 2026). **To:** Muse (incoming engineering/product agent).  
**Purpose:** give you a complete, technically accurate starting point for Bloom **without relying on my conversational memory**. Everything important here is tied to repository files or command results captured in this pass. Where I could not verify, I say so.

---

## 1. What Bloom is

Bloom (`bloom-app`) is a **personal wellbeing web application** — branded in the app as **Bloom — Mood Intelligence** — for tracking and understanding daily life: habits, mood/check-ins, six daily trackers (sleep, water, study, movement, energy, screen), optional cycle tracking with Cycle Intelligence, rewards/progression/points, profile/identity/privacy/stories, and an AI **Coach** (Ask/Reflect/Plan). It is designed to feel private and premium, with **offline-first/local-fallback** data behaviour when no Supabase project is configured. **Invite-only access** applies when Supabase is configured. See `MASTER_CONTEXT.md` and `ARCHITECTURE.md`.

Bloom also contains a parallel **Vitalis** evidence-registry track (migrations `20261104`–`20261112`, `src/lib/vitalis/*`, `scripts/vitalis-*`, `docs/vitalis-*`, seeds/importer). Treat it as **security-sensitive, separately verified work** — not the same as the end-user Bloom UX.

## 2. Technology (verified)

- **React 19**, **TypeScript 5.8 (strict)**, **Vite 8**
- **TanStack Start 1.168.32 / TanStack Router 1.170.18 / TanStack Query 5**
- **Nitro 3.0.260603-beta** (`cloudflare-module` preset), **Cloudflare Workers** deployment target
- **Supabase 2.x** — Auth, Postgres + RLS, Storage, Edge Functions (Deno): `coach`, `giphy`, `push-send`
- **Capacitor 8** for iOS/Android wrapper (static SPA build mode)
- **Tailwind CSS v4**, Radix UI, `motion`, **ECharts 6**, `dayjs`, `zod`
- **Vitest 2.x** (+ Testing Library/jsdom; DB integration harness uses real PostgreSQL via `pg`)

Key files: `package.json`, `vite.config.ts`, `src/start.ts`, `src/server.ts`, `src/router.tsx`, `src/routes/__root.tsx`, `src/lib/supabase.ts`, `supabase/migrations/*`, `supabase/functions/*`, `capacitor.config.ts`.

## 3. Where the project currently stands

**Verified good (this pass):** `npx tsc --noEmit` exit 0; `npm run build` exit 0 (Cloudflare/Nitro output generated).  
**Partially good:** `npm run test` → 102 files / 1117 tests passed, **64 tests failed in 5 invocations** of `src/lib/vitalis/db/evidence-lifecycle.integration.test.ts` — **all due to `ECONNREFUSED 127.0.0.1:5433`** because the required local PostgreSQL harness was not running. P2.2 records show 107/1181 passing under the prepared PG environment; **do not read this as proof those tests regressed.**  
**Not green:** `npm run lint` exit 1 (large Prettier/CRLF baseline).  
**Not verified:** `npm ci`, wrangler dry-run/module count, current local worker at `127.0.0.1:8787`, **any production deployment/URL**. **Do not claim Bloom is live.**

Git: branch `freebuff/in-the-app-we-cant-choosee-the-userhandle-like-ins-1f00cb6b-4f7b-4617-82bb-a8dd58336f7a`, HEAD `8bbe3be`. Remote `origin-fetch-target` = `https://github.com/Maelix-glitch/bloom-app.git` (no local `origin/main` ref resolved). **41 uncommitted/untracked entries** — P2.2/Vitalis work, migration renames, package/test/src changes. **Preserve all of it.**

## 4. What has been completed

See `COMPLETED_WORK.md` for the full inventory with status labels. High-confidence implemented areas (code + partial verification): app shell/routing/SSR error handling; Supabase lazy client and session sharing; invite/access UX patterns; PWA/manifest/SW/native boot hooks; habits/trackers/cycle/mood/coach/profile/stories/rewards/progression/notifications/report/legal route and component surfaces; Supabase migrations and RLS-backed patterns; three edge functions; export/import/erase flows; Vitalis evidence schema/tooling/importer hardening (with documented hosted gaps). **“Implemented” is not “production-verified.”**

## 5. What remains incomplete

See `INCOMPLETE_WORK.md`. Top items: dependency security remediation (32 vulns, 7 critical); reproducible PG-backed full test run; scoped lint/CI; production deploy verification; coach/giphy/push operational verification with real secrets; Mood Intelligence parity audit vs README brief; E2E and accessibility coverage; Vitalis hosted `--ca` and repeat-import closure; root README/route-canonicalisation cleanup.

## 6. What is broken / failing now

- **Test run in this environment:** 64 Vitalis DB integration tests fail with `ECONNREFUSED 127.0.0.1:5433` (environment, not yet proven code regression). Reproduce with PG harness running before concluding.
- **Lint gate:** fails repo-wide (format baseline). Not a precise signal for a small change.
- **Security posture:** **not clean** — audit reports critical/high vulnerabilities including the TanStack Start server-function XSS chain. Treat as blocking for confident production exposure.

No other runtime crashes were reproduced in this handover (limited to build/tsc/tests; no full manual E2E). See `BUGS_AND_ERRORS.md` for suspected issues.

## 7. What is known to be inaccurate

- `README.md` at repo root is **misleading/outdated** (prompt text, not accurate setup). Use `.env.example`, `DEPLOY.md` (with caution), and `docs/handover/*`.
- Any claim that Bloom is **deployed/live in production** is **unverified**. Historical tunnel SIGTERM ≠ deployment success.
- “1181 tests passing” is true only in the **right environment** (P2.2 pass with local PG 18.6). This pass got 1117/1181 for an environmental reason — report both facts, not one.
- `DEPLOY.md` “one command, wired up” understates env/auth/dry-run verification and current-tree risk.

## 8. Security risks that remain

- **Critical:** `@tanstack/react-start` / `start-server-core` chain — reflected XSS in server-function responses (per `npm audit`). Upgrade to verified patched versions and test.
- **High:** `zod` memory-exhaustion advisory, `seroval` injection issues, `vite`/tooling chains, `wrangler/miniflare/undici` and others — assess reachability and remediate.
- **Operational:** coach edge has broad CORS and complex provider orchestration — verify auth/abuse controls; keep all provider/GIPHY/push secrets server-side.
- **Data/authz:** RLS, invite-only triggers, admin allow-lists and erase coverage are critical. Never weaken policies to pass tests; extend erase/export when adding user-data tables.
- **Vitalis importer:** powerful, security-reviewed tooling — follow `docs/vitalis-import-security-review.md` and seed/import runbooks; never run against production without explicit approval.

## 9. What you must inspect first

1. `git status`, `git diff --stat`, and the 41 dirty entries — understand P2.2 renames, package changes, and untracked Vitalis work before editing.
2. `docs/handover/BUGS_AND_ERRORS.md` and `DEPLOYMENT.md` — know the red lines (security, deploy unknown, PG test harness).
3. `src/lib/supabase.ts`, `src/routes/__root.tsx`, `src/components/auth/AccessGate.tsx` — auth/config/invite model.
4. `src/lib/coach/engine.ts` + `supabase/functions/coach/index.ts` — online-only contract and side effects.
5. `package.json`, `vite.config.ts`, `scripts/fix-worker-chunks.mjs` — build/deploy reality.
6. `supabase/migrations/` (order and intent), especially recent/Vitalis and erase-related migrations.

## 10. What you must not change without justification

- **Do not** deploy to production, apply migrations to production, or run Vitalis importer/hosted verification against `bloom-app`/real user projects without explicit approval.
- **Do not** discard, reset, clean, or overwrite the existing dirty working tree or stashes (none present now, but preserve if they appear). Unrelated user changes are not yours to delete.
- **Do not** use destructive git operations (no force-push, no hard reset of others’ work, no branch deletion without cause).
- **Do not** weaken RLS, invite checks, admin checks, or erase semantics to “fix” behaviour.
- **Do not** commit secrets, API keys, tokens, or `.env` values.
- **Do not** mark features complete/secure/deployed without evidence (command output, URL, HTTP checks, policy verification).

## 11. Recommended execution order

1. **Phase 0:** reproduce baseline (clean install if needed, build/tsc, tests with local PG on 5433, wrangler dry-run/local worker). Record results.
2. **Phase 1:** remediate dependency security — **TanStack Start XSS chain first**, then Zod/Seroval/Vite/tooling — with regression tests. Review coach edge auth/CORS posture.
3. **Phase 2/7 foundation:** establish root CI, canonical lint/format gate, and reliable test environments (including PG integration job or explicit split).
4. **Phase 8 (staging):** verify wrangler dry-run/preview and perform an authorised staging deploy with post-deploy checklist.
5. **Phase 4/5:** close critical product gaps (invite/auth flows, coach ops, push end-to-end, Mood parity checklist) in a configured environment.
6. **Phase 6/3/9:** performance, design consistency, accessibility, and release hardening.

Use `DEVELOPMENT_ROADMAP.md` for full phase acceptance criteria.

---

## Final note

The objective is **zero loss of engineering context**. If you discover that a statement in this handover is wrong, correct it in-repo with evidence — do not silently “fix” history, and do not guess. Good luck, Muse.
