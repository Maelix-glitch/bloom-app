# BLOOM — Master Context (Handover to Muse)

**Status:** repository-backed handover. Written 9 November 2026 from the working tree on branch `freebuff/in-the-app-we-cant-choosee-the-userhandle-like-ins-1f00cb6b-4f7b-4617-82bb-a8dd58336f7a` (HEAD `8bbe3be2`). This document describes what the repository and verified command output establish; it does not invent missing facts.

## 1. What Bloom is

Bloom is a **personal wellbeing / self-tracking web application**. In product code and metadata it presents itself as **Bloom — Mood Intelligence** (`src/routes/__root.tsx` title/description). Its shipped scope, as evidenced by routes, hooks, migrations and the coach’s own app facts (`supabase/functions/coach/index.ts`, `docs/bloom-ai-skills.md`), covers:

- **Today / home** — mood/feeling check-ins and the day’s habits with one-tap ticking (`src/routes/index.tsx`, `src/routes/dashboard.tsx`, `src/lib/home/*`, `src/hooks/useHabits.ts`).
- **Habits** — routines with name, note, colour/emoji, schedule (daily / N-per-week / custom weekdays), optional reminder time and measurable goal; ticking earns points and builds streaks (`src/hooks/useHabits.ts`, `src/lib/home/habits.ts`, `src/components/home/HabitsSection.tsx`).
- **Trackers** — daily metrics (sleep minutes, water ml, study minutes, movement minutes, energy 1–5, screen minutes) with goals, averages and streaks; study as timed sessions (`src/routes/trackers.tsx`, `src/hooks/useTrackers.ts`, `src/components/tk/*`).
- **Cycle** — optional period tracking with phase / next-period predictions and deep “Cycle Intelligence” analytics (`src/routes/cycle.tsx`, `src/hooks/useCycleSystem.ts`, `src/hooks/usePeriodLog.ts`, `src/lib/cycle/*`, `supabase/migrations/20260829_cycle_intelligence.sql`, `20260907_cycle_periods.sql`).
- **Mood** — daily check-ins plus a premium “Mood Intelligence” analytics experience (`src/routes/mood/index.tsx`, `src/routes/mood/intelligence.tsx`, `src/lib/mood/*`, `src/components/mood/*`). The README contains an extensive Mood-Intelligence design brief; the repository also contains a substantial implemented mood/page/analytics surface — treat the brief as **vision/intent** and verify specific claims against `COMPLETED_WORK.md`.
- **Coach** — an in-app coach with Ask/Reflect/Plan modes, grounded in the user’s derived record, with memory and app actions. It is **online-only through a Supabase Edge Function** (`src/lib/coach/engine.ts` throws `CoachUnavailable` when the edge cannot answer; `src/routes/coach.tsx`, `src/lib/coach/*`, `supabase/functions/coach/index.ts`).
- **Profile / identity / privacy / stories / highlights** — account details, username/avatar/banner, privacy controls, stories, highlights, export/import/erase, sessions (`src/routes/profile.tsx`, `src/routes/$handle.tsx`, `src/lib/profile/*`, `src/components/profile/*`, `supabase/migrations/20260828_profile_identity_stories.sql`, `20260910150000/160000` story platform migrations).
- **Rewards / progression / points** — Bloom Points from habit ticks and verified Journey goals, reward delivery, atelier/skin, admin reward console (`src/routes/rewards*.tsx`, `src/routes/admin/*`, `src/hooks/useRewardsSystem.ts`, `src/hooks/useProgression.ts`, `src/lib/points/*`, `supabase/migrations/20260826_reward_delivery.sql`, `20260910140000_progression.sql`, `20261030_points_identity_habits.sql`).
- **Report** — weekly report route (`src/routes/report.tsx`).
- **Legal** — public `/privacy` and `/terms` (`src/routes/privacy.tsx`, `terms.tsx`, `src/components/legal/LegalPage.tsx`).

Bloom is **offline-first in data posture**: without Supabase configuration it falls back to device-local storage and surfaces that state (`src/lib/supabase.ts` `hasSupabaseConfig`/proxy/`watchAuth`/`trySupabase`; many hooks/stores degrade gracefully). The **coach is the notable exception** — it requires the online edge path and does not substitute an on-device answer.

## 2. Target audience and philosophy (as established)

- **Audience (inferred from product behaviour):** people tracking personal wellbeing — habits, mood, sleep/study/movement/screen, and optionally cycle — who want a private, polished, data-grounded view rather than a social feed. The product is **invite-only when Supabase is configured** (`AccessControl` in `__root.tsx`, `AccessGate`, `useInviteAccess`, `supabase/migrations/20260916_invite_only_access.sql`).
- **Philosophy evidenced in code:** privacy by default / data on the user’s device or their own Supabase project; no social feed, no marketplace, no payments, no third-party integrations in the core app; no professional medical advice; grounded answers (the coach must not invent numbers/dates/trends; cycle science phrased as population averages, not diagnosis). See `supabase/functions/coach/index.ts` system prompt and `docs/bloom-ai-skills.md`.
- **Product posture:** premium, calm, data-dense visual identity (Cinzel/Fraunces/IBM Plex Mono/Inter font stack in `__root.tsx`, Bloom boot splash, `BloomSkin`/Atelier). The Mood area explicitly targets a “Mood Intelligence” / premium analytics direction.

## 3. Bloom and VITALIS

The repository establishes a **broader Vitalis health-intelligence direction** alongside Bloom’s shipped app surface:

- `docs/vitalis-p2.2-acceptance-report.md` frames Phase 2.2 as “Bloom Vitalis…” (evidence registry / importer / migrations / lifecycle). A substantial Vitalis evidence subsystem exists in migrations `20261104`–`20261112`, seeds, `scripts/vitalis-*`, `src/lib/vitalis/*`, and many `docs/vitalis-*` files.
- Vitalis evidence work is **schema, tooling and review-heavy** (catalogue, editorial lifecycle RPCs, security-reviewed importer, DB integration tests against real PostgreSQL). It is **not** the same thing as the user-facing Bloom routes; Muse must treat it as a parallel, security-sensitive track with its own verification requirements (notably real-PG tests), not as “finished product UI”.

## 4. Technical foundations (verified)

| Area | Verified choice | Key evidence |
|---|---|---|
| UI | React 19 (`react`/`react-dom` ^19.2.0) | `package.json` |
| Meta-framework | TanStack Start `1.168.32` + TanStack Router `1.170.18` | `package.json`, `src/start.ts`, `src/router.tsx`, `src/routes/*` |
| Build | Vite `^8.2.0`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, Tailwind v4 via `@tailwindcss/vite`, `lightningcss` | `package.json`, `vite.config.ts` |
| Language | TypeScript `^5.8.3`, strict compiler options | `package.json`, `tsconfig.json` |
| Server/runtime | Nitro `3.0.260603-beta` (build-only plugin, Cloudflare module preset by default) | `vite.config.ts`, `.output/nitro.json`, `DEPLOY.md` |
| Hosting target (configured) | Cloudflare Workers / `cloudflare-module` | `vite.config.ts`, generated `.output/server/wrangler.json` |
| BaaS | Supabase JS `^2.112.3` (auth, Postgres/RLS, storage, edge functions, RPCs) | `package.json`, `src/lib/supabase.ts`, `supabase/*` |
| Native wrapper | Capacitor 8 (`appId` `app.bloom.tracker`, `webDir` `dist/client`, static SPA build) | `capacitor.config.ts`, `vite.config.ts` (`BLOOM_TARGET=capacitor`) |
| Data/async UI | `@tanstack/react-query` ^5 | `package.json`, `src/router.tsx` |
| Charts/visuals | `echarts` ^6, `dayjs`, `motion`, Radix UI primitives | `package.json`, component usage |
| Validation | `zod` ^3.24.2 (installed) | `package.json` |
| Tests | Vitest `^2.1.9`, jsdom, Testing Library, `pg`/PGlite deps for DB tests | `package.json`, `vitest.config.ts` |
| Edge functions | Deno-based Supabase functions: `coach`, `giphy`, `push-send` | `supabase/functions/*` |

## 5. Repository shape (high level)

Single-package app at repo root (no monorepo workspaces in `package.json`). Notable top-level areas: `src/` (app code), `supabase/` (migrations, seeds, functions, config), `scripts/` (build/deploy/helpers + Vitalis tooling), `docs/` (including `vitalis-*` and this `handover/` set), `public/` (PWA assets, `sw.js`, manifest, icons/splash), `android/` & `ios/` (Capacitor projects), `.github/workflows/` (contains `bloom-discord.yml` — **scoped to `bloom-discord/**` and not the root Bloom app**), and many root markdown/status files from prior work. `wrangler.jsonc`/`wrangler.toml` do **not** exist at root; Nitro generates Worker config under `.output/server/`.

## 6. Non-negotiable truths for the incoming agent

- **Do not assume production is live.** DEPLOY.md describes Cloudflare deployment, and `.output/` artifacts exist, but no verified production URL or successful production deploy is established by this handover. The historical tunnel failure (SIGTERM) did **not** prove production deployment.
- **The working tree is dirty (41 entries) with unrelated/user in-progress work** — including P2.2/Vitalis changes, staged migration renames, modified package files and misc files. **Preserve it.** Do not discard, reset, or “clean up” unrelated changes.
- **`origin-fetch-target` is the configured remote name** (not `origin`); there is no local `origin/main` tracking ref resolved in this environment. Verify remote/branch reality before pushing.
- **Security is not clean:** `npm audit` reports 32 vulnerabilities (7 critical, 10 high), including TanStack Start/server-function XSS-advisory chain and others (Zod, Seroval/Vite chain context, vitest, esbuild, miniflare/wrangler/undici, etc.). Remediation requires careful, non-destructive upgrades — not blind `npm audit fix --force`.
- **Coach is online-only by design.** Failure modes must be honest in UI; do not reintroduce fake local answers that claim to be the coach.
- **RLS/privacy boundaries matter.** Cycle data is owner-only and explicitly protected by migrations; public profile access is gated through specific RPCs/policies. Never weaken RLS to “make it work”.

## 7. Where to start

Read, in order: `docs/handover/MUSE_HANDOVER.md` → `ARCHITECTURE.md` → `BUGS_AND_ERRORS.md` → `DEPLOYMENT.md` → `DEVELOPMENT_ROADMAP.md`, then `COMPLETED_WORK.md` / `INCOMPLETE_WORK.md` for feature-level truth. Cross-check any claim against the files it cites.
