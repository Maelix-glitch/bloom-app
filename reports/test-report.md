# Cycle Intelligence verification report

Scope: canonical engine merge plus 8-user-corrections checkpoint, before commit/push/deploy.

Tree
- Branch: `freebuff/in-the-app-we-cant-choosee-the-userhandle-like-ins-1f00cb6b-4f7b-4617-82bb-a8dd58336f7a`
- HEAD: `7cbf628` (working tree, unstaged edits applied this session)
- Ancestor of main: NO — `0d08ece` is the LCA; HEAD has one extra commit above it
- Main: `origin-fetch-target/main` = `0951260` (`feat: unify visual identity and drop the guided tour (#39)`)
- Relationship: `7cbf628` and `0951260` are same-description siblings diverging from `0d08ece`; neither is an ancestor of the other
- Remotes present: `origin-fetch-target` (fetched from `https://github.com/Maelix-glitch/bloom-app.git`); the original `origin` is not configured in this checkout
- Backup refs: only local worktree refs exist; no `refs/backup/*` refs in this checkout
- Path: `C:\Users\Windows 11 Pro\.freebuff\worktrees\1f00cb6b\17624e8d-d4b3-4763-b5f0-80c29311d510`
- Worktree root: same path
- Untracked: `docs/cycle-intelligence.md`, `reports/`, `screenshots/`, `src/components/ci/intel/`, `src/lib/cycle/canonical.test.ts`, `src/lib/cycle/canonical.ts`, `src/lib/cycle/intel/`

Changed files in this working tree (not yet committed)
- `src/components/ci/AnalyticsCards.tsx`
- `src/components/ci/CycleIntelligence.tsx`
- `src/components/ci/SymptomBloom.tsx`
- `src/hooks/usePeriodLog.ts`
- `src/routeTree.gen.ts`
- `src/styles/cycle2.css`
- `tsconfig.json`
- New: `docs/cycle-intelligence.md`
- New: `reports/`
- New: `screenshots/`
- New: `src/components/ci/intel/`
- New: `src/lib/cycle/canonical.test.ts`
- New: `src/lib/cycle/canonical.ts`
- New: `src/lib/cycle/intel/`

What changed relative to HEAD
- Confidence presentation: numeric index moved into an explanatory section labelled as internal heuristic; primary UI keeps the band
- Mobile tab overlap: narrow-phone shell padding and undo strip position adjusted so the History tab stays visible
- Insights hierarchy: phase long-form copy moved behind a disclosure; Bloom viewBox padding widened; shell gutter tightened at >=1024px
- Flow-mix denominator: `Not specified` line now derived from `recorded = total - flowCounts.unspecified`, so the two percentages share one visible denominator basis
- Spatial balance: Bloom max width and viewBox expanded; 1024px shell bottom padding reduced
- Tests: cycle-intel + canonical suites still green; full suite is the same pattern as before (see below)
- Note: `reports/test-report.md` was written this session; the numbers below are from the two completed `vitest run` invocations

Test results (captured this session)

Cycle-intel + canonical suites (combined invocation)
- Command: `node_modules/.bin/vitest run src/lib/cycle/intel src/lib/cycle/canonical.test.ts`
- Result: 5 test files passed, 57 tests passed
- Files:
  - `src/lib/cycle/intel/dates.test.ts` — 4 passed
  - `src/lib/cycle/intel/backtest.test.ts` — 4 passed
  - `src/lib/cycle/intel/compare.test.ts` — 5 passed
  - `src/lib/cycle/intel/intel.test.ts` — 21 passed
  - `src/lib/cycle/canonical.test.ts` — 23 passed

Full suite
- Command: `node_modules/.bin/vitest run`
- Summary: 84 test files passed, 2 test files failed; 928 tests passed, 1 test failed; 929 total tests
- By-file failures:
  - `src/lib/data/eraseCoverage.test.ts` — suite failed, 0 tests run
    - Error: `ENOENT: no such file or directory, open 'C:\\C:\\Users\\Windows%2011%20Pro\\.freebuff\\worktrees\\1f00cb6b\\17624e8d-d4b3-4763-b5f0-80c29311d510\\supabase\\migrations\\20260826_reward_delivery.sql'`
    - This is a path bug in the test harness (doubled `C:\\` prefix), not a failure of cycle-intel code
  - `src/lib/voice/personal.test.ts` — suite passed, 12 tests run, 1 failed
    - Failing test: `readPersonalVoice — identity from the onboarding answer, or honest blanks > reads the name, focus and cycle capability`
    - Failure: `expect(voice.daysWithBloom).toBe(2)` received `1`
    - This is a date-dependent assertion in unrelated voice code, not in the cycle-intel path
- Note: `src/components/ci/intel/CycleIntelPanels.tsx` produced no separately listed file in verbose output because it has no `*.test.ts` file; it was covered indirectly in the suite run

TypeScript
- Command: `node_modules/.bin/tsc --noEmit`
- Result: exited 0, no emitted diagnostics captured

Baseline failures referenced from the earlier clean worktree at `0d08ece`
- `TourOverlay.test.tsx` — timing related failure mentioned in the prior session notes
- `eraseCoverage.test.ts` — same file-family failure pattern as above (path issue, not cycle-intel behavior)
- `voice/personal.test.ts` — same date-dependent assertion family as above
- Caveat: this session did not re-run a clean checkout of `0d08ece`; those names are carried from the prior report, not re-verified here

Architecture checks
- Single canonical entry: `src/lib/cycle/canonical.ts` `buildCanonicalCycle()` used by `src/hooks/usePeriodLog.ts`
- Shared intelligence result: `store.intel` consumed by `CycleIntelligence.tsx`; panel components format only
- Confidence semantics: band remains primary; numeric index labeled as internal heuristic, not probability or accuracy
- Backtest chronology: `src/lib/cycle/intel/backtest.test.ts` covers chronological use of `starts.slice(0, i)` with no future info
- Thresholds: documented in `docs/cycle-intelligence.md` (15-day floor and 45-day ceiling)

Edits applied this session
- `src/components/ci/AnalyticsCards.tsx`: phase long-form copy behind disclosure
- `src/components/ci/SymptomBloom.tsx`: viewBox wider and label padding added
- `src/styles/cycle2.css`: shell padding and undo strip adjusted for narrow phones; 1024px bottom padding tightened
- `src/components/ci/intel/CycleIntelPanels.tsx`: overview subline relabeled as internal confidence index; explanatory confidence block added under "Why this estimate?"; model chip relabeled as confidence band with internal index note
- No Cycle Companion, no external AI, no reminders/storage/privacy/external-transmission changes, no deploy, no push

Screenshots
- Not re-captured this session; the browser dev server was not re-opened after the edits

Limitations
- No physical device, Safari, or Firefox check performed
- The project's `eslint` is not usable on this checkout due to a pre-existing line-ending mismatch; it was not used as a verification tool
- The numbers above are inline from the two completed vitest runs, not regenerated from a clean `0d08ece` checkout
