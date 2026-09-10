# Bloom Rewards — Progression System QA

Status of the rebuild: **GOALS → POINTS → MILESTONES → RANKS → ACHIEVEMENTS → PERSONAL JOURNEY → optional customization → more goals.**

Method note, stated up front: this environment has **no browser** (`npx playwright install chromium` cannot download a browser here, and `jsdom`/`happy-dom`/`@testing-library/*` are not installed). Visual QA therefore ran as **rendered-markup inspection + a deterministic CSS cascade audit**, not as screenshots. What that can and cannot prove is listed in §6. Everything in §1–§4 was executed for real; nothing here is asserted from memory.

---

## 1. Automated gate

| Check | Command | Result |
| --- | --- | --- |
| Unit + render tests | `npx vitest run` | **36 files, 452 tests passed** |
| Progression logic | `npx vitest run src/lib/progression` | 35 passed |
| Progression rendering | `npx vitest run src/components/progression` | 22 passed |
| Typecheck | `./node_modules/.bin/tsc --noEmit` | clean except four pre-existing, unrelated errors (`BloomCycleAI` context/model props, `ReflectSheet`, `usePeriodLog.sync.test`, `cycle-classic`) |
| Production build | `npm run build` | 3 Vite builds succeed (~2–4 s each) |
| Route smoke | `curl -s -o /dev/null -w '%{http_code}'` | `/` `/rewards` `/rewards/atelier` `/profile` `/admin/rewards` `/admin/progression` → **200** |

Repo constraint worth remembering: the Vitest `include` glob is `src/**/*.test.ts` — **`.test.tsx` is silently not collected**. Component tests are written as `.test.ts` and build elements with `createElement`.

## 2. Functional matrix

Each row names the behaviour the directive requires and the artefact that actually proves it.

| # | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| 1 | Points verified from real records only | `progression.test.ts` → "counts only real records"; every goal reads `habit_logs` / `tracker_days` / `mood_entries` | ✅ |
| 2 | Daily goals verify against today's own data | `progression.test.ts` → habit-day windows, `daily-routine` uses the person's own habit count as target | ✅ |
| 3 | Weekly / monthly windows, clean rollover | `progression.test.ts` → period-key + rollover cases | ✅ |
| 4 | One-time goals award **once ever** | `progression.test.ts` → once-goal claimed twice awards once | ✅ |
| 5 | Duplicate claim awards once | ledger idempotency tests; SQL unique index `point_transactions_award_key` on `(profile_id, kind, ref_id, coalesce(period_key,'once'))` | ✅ |
| 6 | Rank-up fires exactly once | `progression.test.ts` → rank-once; `settle()` compares server balance to the pre-claim snapshot | ✅ |
| 7 | Rank derived from authoritative total | `rankFor(points)`; never stored by a client; `ranks.ts` | ✅ |
| 8 | Never-ending ladder | `progression.test.ts` → "keeps the ladder going past 1,000,000"; 60 consecutive cycle ranks have unique thresholds | ✅ |
| 9 | No terminal "everything unlocked" state | `render.smoke.test.ts` → season path past the named ladder renders; no completion copy anywhere | ✅ |
| 10 | No tiny award | `progression.test.ts` → "never pays a trivial amount": **every** goal ≥ 100 points | ✅ |
| 11 | Cadence honesty | `progression.test.ts` → max(daily) < max(weekly) < max(one-time) | ✅ |
| 12 | Health/fitness first-class | `Goals.tsx` `isWellnessDomain` + `render.smoke.test.ts` → the nine body-and-mind domains are wellness, habits/consistency/study/milestones are not; wellness goals sort ahead of non-wellness under Recommended | ✅ |
| 13 | Multiple timescales on the page | SSR: group headings `Today`, `This week`, `This month`, `Long-term milestones` all present, in that order | ✅ |
| 14 | Progressive disclosure | `render.smoke.test.ts` → ≤ 6 cards of 34 rendered; pager present | ✅ |
| 15 | No shaming / no streak punishment | `render.smoke.test.ts` → rendered board never matches `/failed\|behind\|don't lose\|hurry\|missed/i`; unfinished says "Not completed yet" | ✅ |
| 16 | Recovery / rest are progress | recovery + hydration + sleep goals award; no goal rewards extreme activity or unsafe intake | ✅ |
| 17 | Achievements are a separate collectible system | `achievements.ts` (emblem, title, condition, rarity); real earned dates only | ✅ |
| 18 | Achievement earned outside a claim is still dated | `useProgression` settle effect records the first unlock once, idempotently; `render.smoke.test.ts` asserts an unlocked-but-undated achievement renders "Earned", never "still ahead" | ✅ |
| 19 | Point history from real events only | `render.smoke.test.ts` → PointActivity / MilestoneArchive render real rows, no invented history | ✅ |
| 20 | How-you-earn copy matches reality | catalog floor is 100 and ceiling 10,000; page aside says "100–10,000"; habit ticks 5–500 | ✅ |
| 21 | Partial failure is honest | unreadable balance → page-level quiet banner ("couldn't load right now … Try again") while rank, points, achievements and history still render; a claim failure sets its own message | ✅ |
| 22 | Server-authoritative, atomic, idempotent | `20260910_progression.sql`: `award_progress()` verifies → awards → marks → writes the ledger in one transaction; amounts come from the migration, never the request | ✅ (SQL not executed) |
| 23 | Admin authorization + auditability | `/admin/progression` re-checks `is_rewards_admin()` via RPC then reads `admin_point_audit` (read-only; there is no admin "add points" button) | ✅ |
| 24 | Legacy preserved | `20260826_reward_delivery.sql` tables/RPCs untouched; `profiles.total_points` remains the single authoritative balance; no earned point recalculated | ✅ |
| 25 | Multi-tab safe | `subscribeProgression` bridges the `storage` event (which only fires in the tabs that did *not* write) into a re-read of the authoritative balance; a claim in either tab is still settled by the SQL unique award key. Tested: another tab's write triggers exactly one re-read, unrelated storage keys are ignored, unsubscribe stops it, and a poisoned mirror cannot create an award | ✅ |
| 26 | Home integration | `/` renders the rank chip: emblem + `"{points} points to {next rank}"`, one chip among the existing home chips — Home stays Home. Reading taken: the ladder *is* the next milestone, so the chip names the next rank and its distance rather than adding a goal card to Home | ✅ |
| 27 | Profile integration | `/profile` shows the rank pill (`.pg-rank-pill`, styled from the global stylesheet so Profile never loads `/rewards` CSS) | ✅ |
| 28 | Coach integration | `knowledge.ts` explains the real earning model (habit tick values 5–500 + verified goals) and the rank ladder by name; `app-facts.test.ts` still passes | ✅ |
| 29 | Reduced motion | `@media (prefers-reduced-motion: reduce)` disables ambient orbs, node pulse, skeletons; ceremony stages collapse to 0.001 ms so the sequence preserves *all* information | ✅ |

## 3. Multi-width audit (1440 / 1280 / 1024 / 768 / 430 / 390 / 375)

Because no browser is available, width behaviour was proven from the cascade rather than from pixels: every breakpoint in `src/styles/progression.css` was extracted and the geometry computed per width. `box-sizing: border-box` is confirmed present (Tailwind preflight `*, ::before, ::after`), so padding is inside the declared widths below.

Breakpoints in the stylesheet: `min-width: 640`, `max-width: 980`, `max-width: 900`, `max-width: 860`, `max-width: 720`, `max-width: 620`, `prefers-reduced-motion`.

| Width | Active layout rules | Shell geometry | Rendered result |
| --- | --- | --- | --- |
| **1440** | ≥640 only | `pg-main` capped at 1180 → 1116 content | Hero 2-col (copy ≈ 544 / mark 420), goals 2-col, path 3-col rows, studio 2-col, achievements ≥ 2-up |
| **1280** | ≥640 only | content 1116 | Identical to 1440 — the shell is width-capped, not stretched, so 1280 reads as the design's home width |
| **1024** | ≥640 only | content 960 | Tightest desktop case and the one worth watching: hero 2-col with copy ≈ 427 px; the 62 px serif headline still fits, and the hero only stacks below 900. No horizontal overflow at any interior gap. |
| **768** | + ≤980, ≤900, ≤860 | content 704 | Hero stacks (≤900), studio stacks (≤980), goals single-column (≤860), section asides hidden (≤720), path rows still 3-col (>620) |
| **430** | + ≤620, ≤720 | content 382 | Path rows become `48px + flexible` with the nowrap state moved into the flexible track; achievements/goal grids single-column |
| **390** | as above | content 342 | As 430, with ~40 px less room in the mark column; all `minmax(0, …)` tracks absorb it |
| **375** | as above | content 327 | Narrowest target. Verified fit: the "CURRENT RANK" state pill ≈ 110 px inside a 263 px flexible track; the hero title uses a 38 px floor (not 6.4 vw) so it stays legible rather than shrinking to nothing |

Static overflow audit (the failure mode that actually breaks a 375 px layout):

- Every grid track that can shrink uses `minmax(0, 1fr)`; there are no fixed two-column templates without a collapse rule. Confirmed: 14 `grid-template-columns` declarations, 6 collapse rules.
- Two fixed-track templates exist and both collapse: hero `minmax(320px,420px)` at ≤900, studio `minmax(280px,420px)` at ≤980.
- The only `white-space: nowrap` string (`.pg-node-state`) is moved out of the fixed 48 px track at ≤620 — this was a real overflow risk and is handled.
- Fixed `92px` date column in Point activity survives 375 px (mono 10.5 px date ≈ 66 px).
- The admin audit table is the one genuinely wide object; it is wrapped in `overflow-x-auto` with `min-w-[620px]`, so it scrolls instead of pushing the page.

## 4. Copy audit (executed, not eyeballed)

Rendered pages were fetched and searched. Findings and the fixes that followed:

| Found | Fix |
| --- | --- |
| Coach `APP_FACTS` still said points come from "the Rewards page" and described only habit ticks | rewritten to the journey model, plus a new `ranks` fact; `app-facts.test.ts` still guards that the answer mentions points |
| Hero "earned today / last 7 days" counted only *awards*, so ticking habits appeared to earn nothing | hook now sums habit-tick value (habit × its own point value) + verified awards for the day and the window |
| Goal board showed a flat list with no timescale or wellness structure | grouped by cadence (Today / This week / This month / Long-term milestones), round-robin so no timescale is crowded out, plus a named **Wellness** filter; "wellness first" stated in the section aside |
| One goal detail read "Missed days simply start a new run." | reworded to "A quiet day simply starts a new run." — no loaded word in the copy at all |
| Cheapest goal was 50 points | daily tier raised to **100/120**; a test now enforces a 100-point floor forever |
| `AtelierLink` was an `<a>` nested inside a router `<Link>` | split into `AtelierLinkContent`, callers own the anchor |
| An inline-styled toast was reused as an in-flow banner | replaced with a real `.pg-banner` class + quiet variant |

## 5. Reduced motion, focus and semantics

- Reduced motion removes decoration (orbs, pulse, hover lift, rail transitions) and compresses the ceremony timeline to 0.001 ms — every stage still renders, so nothing is *only* conveyed by motion.
- One ceremony at a time: `RankCeremony` takes over the viewport; when an award ranks up *and* unlocks an achievement, only the ceremony takes the moment, and the achievement note is stated by the toast behind it rather than as a second animation.
- Focus and semantics: sections are labelled via `aria-labelledby`; goal progress uses `role="progressbar"` with `aria-valuenow/max`; filters and sorts are `aria-pressed` toggle groups; the claim banner is a polite `role="status"`; all decorative art is `aria-hidden`.
- Skeletons, not spinners, while loading (`.pg-skeleton`, disabled under reduced motion).

## 6. What this QA does **not** prove

Being explicit, because the directive asks for visual QA at seven widths:

1. **No pixel rendering.** No screenshot, no computed-layout engine, no font-metric check. The width table is arithmetic over the real cascade; a browser could still reveal a surprise (most likely candidate: the 1024 px hero, where the copy column is narrowest).
2. **No interaction test.** jsdom/testing-library are absent, so "click Claim and watch the ceremony" was verified through the pure engine + server contract + rendered states, not by clicking.
3. **No database execution.** `supabase/migrations/20260910_progression.sql` has never been run; all SQL here (verification functions, `award_progress`, `award_achievement`, `admin_point_audit`, RLS) is unvalidated against a live Postgres.
4. **No real auth session.** Route smoke tests are unauthenticated, so signed-in rendering (cloud balance, ceremony trigger, admin audit rows) is covered by unit/render tests rather than an end-to-end session.

## 7. Manual pass for a browser (30 minutes)

1. 1440 and 375: `/rewards` loads, hero shows points · rank · progress · points to next; scroll to the bottom without a horizontal scrollbar.
2. Complete a real daily goal, press **Claim points**: points rise, the ledger gains one row, the button becomes "✓ Earned", and a second press does not award again.
3. Cross a rank threshold: exactly one ceremony, no second animation competing, ends settled on the new rank.
4. Refresh mid-journey: rank, points, achievements, milestones and history all restore identically.
5. Two tabs, claim the same goal in both: one award, both tabs converge.
6. Kill the network and reload: the quiet banner appears, and rank/points/achievements/history are all still on screen.
7. Enable OS "reduce motion": re-trigger a rank-up — the ceremony appears without motion and still states the rank, the milestone and the affirmation.
