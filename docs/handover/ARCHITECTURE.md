# BLOOM — Architecture (Handover)

Repository-backed. File paths are relative to the project root unless noted.

## 1. Application architecture

Bloom is a **single-package TanStack Start + React + Vite** application that can be built in two modes (`vite.config.ts`):

- **Default (SSR/worker):** TanStack Start with `server.entry = "server"` → `src/server.ts`. Build-only Nitro plugin uses `defaultPreset: "cloudflare-module"`. Output: `.output/server` (worker) and `.output/public` (assets). A post-build step `scripts/fix-worker-chunks.mjs` patches a Rolldown cyclic-chunk/runtime issue and pins Worker `compatibility_date` handling for deploy safety (`package.json` `build:worker`).
- **Capacitor static SPA:** `BLOOM_TARGET=capacitor` enables `tanstackStart({ spa: { enabled: true } })`, skips Nitro, produces a static bundle for `dist/client` consumed by Capacitor (`capacitor.config.ts`, `webDir: "dist/client"`).

Client entry/router: `src/router.tsx` creates a TanStack Router with `routeTree` from `./routeTree.gen`, a fresh `QueryClient` in context, `scrollRestoration`, and `defaultPreload: "intent"`. Start instance/middleware: `src/start.ts` adds `errorMiddleware` (renders `renderErrorPage()` for non-status errors) and `createCsrfMiddleware({ filter: serverFn })`. Server entry: `src/server.ts` lazy-imports `@tanstack/react-start/server-entry`, normalises h3-swallowed catastrophic SSR 500 JSON into an HTML error page, and catches thrown errors.

## 2. Frontend architecture

- **Routes:** file-based under `src/routes/` (23 files found). Key routes: `__root.tsx` (shell, head/meta/fonts/manifest/splash links, boot splash, `QueryClientProvider`, `AccessControl`, `WelcomeGate`, `AdminBar`, `ConnectionNotice`, `BloomSkin`, `RemindersEngine`, `BloomToaster`, `PointsAwardToast`), `index.tsx`/`dashboard.tsx` (home), `mood/index.tsx` + `mood/intelligence.tsx`, `cycle.tsx` (+ `cycle-classic.tsx`, `cycle-styles.tsx`), `trackers.tsx` (+ style/premium variants), `coach.tsx`, `profile.tsx`, `$handle.tsx` (public handle route), `rewards*`, `report.tsx`, admin routes, `privacy.tsx`/`terms.tsx`. `routeTree.gen.ts` is generated (modified in working tree).
- **Components:** large surface under `src/components/` (auth, ci/cycle intelligence, coach, cycle, home, mood, notifications, profile, progression, rewards, stories, system, trackers/tk, UI primitives/Radix wrappers, welcome). Many feature areas have both presentational components and local motion/primitives.
- **Hooks:** `src/hooks/` provides stateful feature orchestration — session/auth/admin/invite, habits/trackers/mood/cycle/period log, coach, rewards/progression/wallet, stories, profile space, reminders/sound/install prompt, export/import/restore, etc. (107 test files total across `src`; hooks include sync and local/degraded tests).
- **State management:** primarily **React hooks + module-level stores/subscriptions + TanStack Query context availability** rather than a single global Redux store. Examples: `useSession` uses `useSyncExternalStore` over a module store fed by `watchAuth` (`src/hooks/useSession.ts`, `src/lib/supabase.ts`); profile/prefs/points use specialised stores/hooks. Local persistence uses `localStorage` (keys prefixed `bloom.*` per erase logic) and IndexedDB/idb-keyval in places (dependency present; mood/persistence layers exist under `src/lib/mood/*`).
- **Styling/design system:** Tailwind CSS v4, `styles.css` imported in root, Radix UI primitives, `class-variance-authority`/`tailwind-merge`/`clsx`, `tw-animate-css`, `motion`. Root loads Google fonts (Caveat, Cormorant Garamond, Fraunces, IBM Plex Mono, Inter, Oswald) for brand/editor voices. Theme colour `#14151f`, mobile-web-app meta, PWA manifest/splash links. `BloomSkin` applies equipped Atelier look app-wide.

## 3. Backend architecture

Bloom is **BaaS-centric** (Supabase) with **no traditional custom Node API server in the app repo** beyond TanStack Start SSR/server middleware and Supabase Edge Functions:

- **Supabase Postgres** — application data, migrations, RLS policies, security-definer RPCs (profile public view, username claim/check, rewards delivery/claim, erase, cycle/intelligence, points/progression, evidence/Vitalis lifecycle RPCs, etc.). 25 migrations under `supabase/migrations/` (20260825–20261112).
- **Supabase Auth** — session handling via `@supabase/supabase-js`; `watchAuth`/`useSession`; invite-only gate when configured; magic-link / OTP flow implied by `AccessGate` and Supabase auth usage.
- **Supabase Storage** — profile media bucket `profile-media` (`src/lib/profile/profileService.ts`), namespaced paths; migration docs reference storage policies.
- **Supabase Edge Functions (Deno):** `coach` (multi-provider LLM orchestrator, server secrets, vision/tools/memory sidecars, never exposes keys), `giphy` (GIF/sticker proxy using `GIPHY_API_KEY` secret), `push-send` (cron/caller-authenticated reminder delivery; uses service role semantics per header, scoped by user_id).
- **Server functions:** no `createServerFn` usage found under `src/routes` by grep in this pass; client talks to Supabase directly (anon key + RLS) and to Edge Functions. Treat “server/client boundaries” accordingly: SSR renders shell/pages; sensitive model keys stay in Edge Function secrets.

## 4. Routing

TanStack file routes; generated tree in `src/routeTree.gen.ts`. `__root` defines global error/not-found components, head, shell, and `AccessControl`: public routes `/privacy`, `/terms` bypass invite gate; if no Supabase config, app is open and `ConnectionNotice` explains device-only mode; if mounted+session ready and no user, shows `AccessGate` (invite-only). Unknown/session-pending states intentionally render children to avoid SSR/hydration flash — **server-side/RLS/trigger enforcement remains the real authority** (documented in code).

## 5. Server/client boundaries

- **Client:** most feature logic, local caches, direct Supabase reads/writes subject to RLS, coach UI calling edge function via `src/lib/coach/edge.ts`/engine, PWA/SW registration.
- **SSR/server:** `src/server.ts` + `src/start.ts` middleware/error handling; CSRF middleware for server functions. No evidence of extensive server-only data loaders in routes from grep; verify per route when changing data flow.
- **Edge/server secrets:** AI provider keys, GIPHY key, push/VAPID private/cron secrets live as Supabase secrets — **never `VITE_` client env**. Client envs are `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_COACH_FUNCTION`, optional `VITE_VAPID_PUBLIC_KEY`.

## 6. Data flow

Typical authenticated flow: UI → hook/store → `supabase` client (`src/lib/supabase.ts`) → Postgres tables/RPCs/storage constrained by RLS and triggers; realtime subscriptions used in places (e.g. habits realtime helper exists). Unauthenticated/no-config flow: UI → local/device stores. Coach flow: UI → `useCoachSystem`/engine → `askEdge` → `supabase.functions.invoke` (coach) → edge orchestrator → external LLM providers → paragraphs/tool/memory sidecars back to client → local/apply effects. Exports/import/erase operate across local + account surfaces (`src/lib/data/*`, `src/hooks/useExportBundle.ts`).

## 7. Database structure

25 SQL migrations in `supabase/migrations/`. Themes visible from filenames/content: core tables (`20260825`), reward delivery, profile identity/stories/privacy/storage (`20260828`), cycle intelligence/periods, today/home, habit pause, mood context, user prefs, erase account and coverage fixes, progression, story platform/canvas/slides, invite-only access, push subscriptions, points/identity/habits, and Vitalis health/evidence foundation, authoritative safety, evidence foundation/lifecycle/erase/revision coverage (`20261104`–`20261112`). Evidence/Vitalis schema includes `evidence_*` tables, RLS read policies, editorial RPCs and lifecycle guards (see `src/lib/vitalis/db/harness.ts` migration list and `docs/vitalis-*`). **Production migration state is not fully verified here** beyond the P2.2 dashboard observation recorded in Vitalis docs (18 migrations applied, no evidence migrations/importer role on that project at that time) — treat as historical measurement, re-verify before relying on it.

## 8. Authentication

Supabase Auth via JS client. `src/lib/supabase.ts` builds a lazy Proxy client, derives a project-specific storage key from the Supabase URL, and exposes `watchAuth`/`trySupabase`. `useSession` shares session state app-wide. `__root` enforces invite-only UX when configured. `AccessGate`/auth flow handle email/OTP magic-link style access (per component naming/flow libs). Session refresh is attempted in profile loading paths (`profileService.ts`). Public routes remain accessible.

## 9. Authorization

- **RLS-first:** migrations enable RLS and define policies (e.g. cycle owner-only; evidence read policies; profile privacy; rewards/admin allow-list `app_admins`). Public data exposure goes through controlled RPCs such as `get_public_bloom_profile`, `is_bloom_username_available`, `claim_bloom_username` (`profileService.ts`). Reward claiming uses RPC server checks.
- **Invite-only:** `AccessControl` in `__root` gates app UI; DB trigger/RPC (`bloom_invites_only` / invite checks referenced in hooks/migrations) is the enforcement backstop — UI can be bypassed, rule should not.
- **Coach edge:** callable by app; auth/headers/CORS handled in function (read full implementation before changing). Push-send uses cron/secret auth; GIPHY proxy protects key.
- **Admin surfaces:** `/admin/rewards`, `/admin/progression` and `useAdminAccess`/`AdminBar` exist — verify admin checks (RPC/allow-list) before exposing actions.

## 10. State management (detail)

No single global store library. Patterns: React state/context in components; module singletons with `useSyncExternalStore` for cross-cutting session/prefs; TanStack Query client in router context (usage depth varies by feature — inspect hooks/components); local-first caches synced to Supabase when available; undo/toast/notification systems under `components/system` and feature hooks.

## 11. API communication

- **Supabase:** `@supabase/supabase-js` for auth, `from()/rpc()/storage/functions` operations.
- **Coach:** edge invocation; derived facts + bounded history + optional media; strict error propagation (`CoachUnavailable`/`CoachCancelled`) so UI can show honest retry.
- **External LLMs:** only from `supabase/functions/coach/index.ts` (Gemini direct, Groq, APINEX, Hugging Face router by config; provider order/health/budget/vision/tool handling). Keys are server secrets.
- **GIPHY:** only via `giphy` edge function.
- **Push:** browser subscription + `push-send` edge function.

## 12. Storage

- **Browser:** `localStorage` (`bloom.*` namespace — erase removes these), IndexedDB (`idb-keyval` dependency) for heavier/persisted cases (notably mood/storage paths — verify per module). Service worker cache (`public/sw.js`, registered from root).
- **Supabase Storage:** public `profile-media` bucket for avatars/banners/story media per migrations/service usage.
- **No committed secrets:** `.env.example` documents VITE vars; coach/GIPHY/push secrets are set via `supabase secrets`.

## 13. Build and deployment pipeline

- `npm run dev` → Vite dev (host `::`, port 8080; E2B hosts allowed). TanStack Start + Nitro dev behaviour per config.
- `npm run build` → Vite build (SSR/Cloudflare path by default); Nitro writes `.output/` artifacts including `wrangler.json`, `nitro.json`, headers.
- `npm run build:worker` → build + `node scripts/fix-worker-chunks.mjs` (repairs cyclic chunk helper imports; pins compatibility date in generated worker config).
- `npm run deploy` → `build:worker` + `wrangler deploy`; `deploy:name` variant exists. Wrangler reads generated config under `.output/server` (commands shown in `nitro.json`).
- `npm run build:app` / `app:build` → Capacitor static SPA + `cap sync`.
- CI: only `.github/workflows/bloom-discord.yml`, path-scoped to `bloom-discord/**` and its own workflow file — **not root Bloom CI**.

## 14. External services

Supabase (auth/db/storage/functions/secrets, project-specific), Cloudflare Workers (deployment target), LLM providers behind coach (Gemini/Groq/APINEX/HF as configured), GIPHY via proxy, Web Push (VAPID + push-send). All third-party API keys for server-side features must remain in Supabase secrets; VAPID public key is a client config only.

## 15. Dependencies (notable)

See `package.json`. Notable risk-bearing deps: `@tanstack/react-start`/start-server-core chain (audit-critical XSS advisory path present), `zod` v3 (audit flags memory-exhaustion issue on affected range — verify exact advisory/fix), `seroval` appears in audit graph, `vite`/`vitest`/`esbuild`/`wrangler`/`miniflare`/`undici` audit findings, `nitro` beta, `playwright` present but end-to-end coverage status unknown. Do not upgrade destructively during handover; plan remediations in Phase 1.

## 16. Important file map

- `package.json`, `package-lock.json` — scripts/deps (lockfile has local modifications in tree).
- `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `capacitor.config.ts` — build/test/native config.
- `src/server.ts`, `src/start.ts`, `src/router.tsx`, `src/routes/__root.tsx`, `src/routeTree.gen.ts` — runtime spine.
- `src/lib/supabase.ts` — lazy client, config detection, auth watcher, safe helpers.
- `src/lib/coach/*`, `supabase/functions/coach/index.ts` — coach engine/edge contract/orchestrator.
- `src/lib/profile/*`, `src/lib/data/*` — identity/privacy, export/import/erase.
- `src/lib/vitalis/*`, `scripts/vitalis-*`, `supabase/migrations/202611*` — Vitalis evidence subsystem.
- `supabase/migrations/*`, `supabase/config.toml`, `supabase/functions/*`, `supabase/seeds/*` — backend schema/functions.
- `scripts/fix-worker-chunks.mjs`, `DEPLOY.md`, `.output/nitro.json` — Worker build/deploy details.
- `docs/vitalis-*`, `docs/handover/*` — technical review and handover record.
