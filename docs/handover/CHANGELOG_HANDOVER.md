# BLOOM — Handover Changelog / Historical Context

This file summarises **relevant historical work and the current working-tree state** as established by git history visible in this repo, existing `docs/vitalis-*` records, and the 9 Nov 2026 handover pass. It is not a complete commit-by-commit narrative of the entire project; it highlights what Muse needs to avoid losing context.

## Recent visible commits (local branch tip)

Branch: `freebuff/in-the-app-we-cant-choosee-the-userhandle-like-ins-1f00cb6b-4f7b-4617-82bb-a8dd58336f7a`  
HEAD: `8bbe3be2d2770ee3fe066dc32beb5664dc2b56af`

1. **`8bbe3be` — `fix(cycle): present the canonical result honestly and legibly`**  
   Touched cycle intelligence presentation/panels and styles; added `reports/` artefacts (`full-suite-raw.txt`, `make-report.mjs`, `test-report.md`) and `src/components/ci/intel/CycleIntelPanels.tsx`.
2. **`4e5bd15` — `feat(cycle): one canonical Cycle Intelligence engine`**
3. **`0951260` — `feat: unify visual identity and drop the guided tour (#39)`**
4. **`0d08ece` — `feat: unify identity, points, habits, AI plans, cycle and trackers (#38)`**
5. **`e3dada0` — `feat(database): scope repositories to each bot's capabilities (#37)`** (commit message as shown in log; interpret in context of repo history)

Remote configured as `origin-fetch-target` → `https://github.com/Maelix-glitch/bloom-app.git`. No `origin/main` tracking ref resolved locally in this environment; compare/push targets must be verified explicitly.

## Vitalis / P2.2 work (documented in-repo, partly in working tree)

A substantial Phase 2.2 acceptance effort is recorded in `docs/vitalis-p2.2-acceptance-report.md`, `docs/vitalis-p2.2-hosted-verification-evidence.md`, `docs/vitalis-import-security-review.md`, and related `docs/vitalis-*` files. Key outcomes recorded there:

- Two migration renames staged as `git mv` with byte-identical content (ordering fix): `20260909_core_tables.sql` → `20260825_core_tables.sql`; `20260910120000_story_interaction_names.sql` → `20260910160000_story_interaction_names.sql`. References updated in scripts/tests/services as part of that work (verify current diff).
- Evidence importer hardened (`scripts/vitalis-import-catalogue.mjs`): TLS verified by default, `--ca`/`--insecure-tls`, bound parameters, explicit rollback/cleanup, pooler hints, target confirmation.
- Dashboard SQL Editor session measured on production `bloom-app` (`postgres`, non-superuser, `bypass_rls=true`, 18 migrations, no `evidence_importer` role/policies at the time of measurement) — **historical measurement; re-verify before acting**.
- Hosted gaps left **NOT VERIFIED** in that report: end-to-end `--ca` pinning on a fresh disposable project and repeat-import re-measurement (disposable projects became unreachable; org quota pressure noted).

**These P2.2 changes are present as uncommitted/untracked work in the current tree** (see below) and must be handled deliberately — not dropped, not blindly committed with unrelated changes.

## Current working tree (observed 9 Nov 2026)

`git status --porcelain`: **41 entries** (11 modified/staged renames tracked changes visible + 30 untracked entries).

**Tracked modifications / renames (preserve):**
- `M package-lock.json`, `M package.json` (adds `seed:evidence` scripts and deps `@electric-sql/pglite`, `@types/pg`, `pg`; lockfile changes).
- `M src/lib/data/eraseCoverage.test.ts`, `M src/lib/mood/page.test.ts`, `M src/lib/profile/profileService.test.ts`, `M src/lib/profile/profileService.ts`, `M src/lib/voice/personal.test.ts`, `M src/routeTree.gen.ts`.
- `M supabase/README.md`.
- Renames: `supabase/migrations/20260909_core_tables.sql` → `20260825_core_tables.sql`; `supabase/migrations/20260910120000_story_interaction_names.sql` → `20260910160000_story_interaction_names.sql`.

**Untracked (review individually; do not delete as “junk” without confirmation):** Vitalis docs (`docs/vitalis-*`), `probe-seed.mjs`, `screenshots/`, Vitalis scripts (`scripts/vitalis-evidence-seed.mjs`, `vitalis-hosted-verify*.mjs`, `vitalis-import-catalogue.mjs`), `src/lib/vitalis/`, Vitalis migrations `20261104`–`20261112`, `supabase/seeds/`.

## Historical deployment/build notes to verify (not current proof)

- Cloudflare Worker build previously succeeded; **confirmed again this pass** (`npm run build` exit 0).
- Wrangler dry-run previously recognised generated Worker config and attached 103 modules — **not re-verified**.
- Local Worker previously at `http://127.0.0.1:8787` with homepage/assets HTTP 200 — **not re-verified**.
- Cloudflare tunnel failed with SIGTERM — **explicitly not a successful production deployment**.

## Previously reported git/npm friction

History notes mentioned git pull blocked by local npm install-script approvals in `package.json` for `esbuild@0.28.1`, `esbuild@0.21.5`, `workerd@1.20260908.1`. In the current `package.json` diff those specific approval strings were not observed; lockfile/deps have evolved and the tree is mid-change. **Treat pull/merge as a careful operation:** stash or commit intentionally, preserve all work, resolve conflicts deliberately.

## Handover actions taken in this pass

- Investigated repository structure, configs, routes, migrations, Supabase functions, auth/coach/data code paths, git state, and dependency audit.
- Ran verification commands: `npx tsc --noEmit` (0), `npm run build` (0), `npm run lint` (1, repo-wide format baseline), `npm run test` (1 — 1117/1181 pass, 64 Vitalis PG-harness failures due to no local PG on 5433). Did **not** run `npm ci`, wrangler dry-run/local preview, or any deploy.
- Created `docs/handover/` with: `MASTER_CONTEXT.md`, `ARCHITECTURE.md`, `COMPLETED_WORK.md`, `INCOMPLETE_WORK.md`, `BUGS_AND_ERRORS.md`, `DEPLOYMENT.md`, `DEVELOPMENT_ROADMAP.md`, `MUSE_HANDOVER.md`, `CHANGELOG_HANDOVER.md`.

No production deployment, no database writes outside local verification context, and no destructive git operations were performed. Unrelated working-tree changes were preserved.
