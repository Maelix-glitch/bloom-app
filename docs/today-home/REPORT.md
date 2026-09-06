# Today (home) page — migrated from insight-map and wired to real data

Source: <https://github.com/Maelix-glitch/insight-map> (`3176ad0`), a Lovable mock
with hardcoded numbers, a non-navigating sidebar and its own leaf logo.
Target: `/` in this repo. The previous `/` (Mood Intelligence) now lives at `/mood`.

## Decisions

| Question | Decision |
| --- | --- |
| Logo | Bloom's current header mark (single arc, sage→gold gradient, `BloomHeader`) — used in the shared header, the sidebar and the mobile top bar. insight-map's `BloomMark` leaf was not adopted. |
| Header | Bloom's shared `BloomHeader` stays on top of the page (Today now active at `/`, Mood → `/mood`, the context label follows the route). The insight-map sidebar sits under it on `lg+`; the bottom nav on mobile. Both use real `<Link>`s. |
| Fonts / tokens | Bloom's own (Fraunces / Inter / oklch palette). insight-map's six signal colours and its panel/chip/glow/float motion are ported under a `.home-page` scope (`--home-*`, `.home-panel`, `.home-chip`, …) so nothing leaks into Rewards (`--gold`) or Mood (`panel` utility). |
| Data | No constant on the page is fake. Every number comes from `useTrackers`, `useHabits` (new), `useMoodSystem`, `usePeriodLog`, `useProfileSpace` or `useCoachSystem`. Empty record → empty ring + honest copy. |

## Wiring

```
Progress ring   = habits 40% · trackers 35% · mood 25%, re-weighted over the inputs that exist today
Connection map  = node strength: share of the last 30 days carrying that signal (+15% if logged today)
                  arcs: real correlations only — tracker↔tracker (Pearson, core.ts) and mood↔signal (analytics.ts)
                  notes: computed sentences (averages, streaks, cycle day/phase) or a nudge when empty
Trackers rings  = today's value / goal from analyzeTrackers (same as /trackers)
Habits          = Supabase habits + habit_logs (legacy Today tables) with optimistic toggle,
                  points via increment/decrement_points → profiles.total_points, realtime subscription;
                  localStorage mirror (bloom.habits / bloom.habit_logs) is exactly what the Coach reads
Focus           = open habits by priority → mood check-in if missing → biggest tracker gaps → cycle anchor
Flow            = habits at reminder time + mood + study + movement + reflection, state now/done/later
Insights        = mood correlations (moderate+), tracker observations, bright-vs-low-days read,
                  habit timing (share after 6 PM), mood insights, cycle confidence
Activity        = newest 5 across habit logs, new habits, mood entries, tracker days, period starts
Coach card      = useCoachSystem.requestResponse (same grounded responder as /coach) in plan mode
                  for the opening read; one-line ask → saved to coach_messages via the same hook
Entry surfaces  = MetricsEntryModal (trackers), Composer (mood), AddHabitModal (habits) — one data path each
```

Greeting uses the profile display name when signed in (falls back to
"Good evening." — never a placeholder name). Date and time-of-day are live.

## Persistence

| Store | Local | Cloud table | Sync |
| --- | --- | --- | --- |
| trackers | `bloom.trackers.days.v1` | `tracker_days` | existing debounced upsert |
| habits | `bloom.habits`, `bloom.habit_logs` | `habits`, `habit_logs`, `profiles.total_points` | optimistic write + realtime |
| mood | — | `mood_entries` | existing |
| cycle | existing keys | `cycle_entries` | existing |
| coach | `bloom.coach.thread.*` | `coach_messages`, `coach_memory` | existing |

`supabase/migrations/20260906_today_home.sql` creates what was missing:
`tracker_days` (the app already assumed it), `habits`/`habit_logs` (tolerant of
the legacy shapes), `profiles.total_points` + the two RPCs, owner-only RLS on
everything, `anon` revoked, realtime publication for habits. Idempotent.

## Safety

- Existing routes untouched except three link targets (`RewardsPage` back-link,
  `CoachPage` sign-in link → `/profile`, legacy `shared-bloom-header.js`).
- `useMoodSystem` / `useProfileSpace` / `useCoachSystem` now short-circuit when
  `VITE_SUPABASE_*` is absent instead of throwing through the lazy client — this
  is what made `/` render in an env without `.env` (previously the error boundary).
- `tsc`: 11 errors, all pre-existing on `main` (ReflectSheet, BloomCycleAI,
  cycle-classic, a test missing `@testing-library/react`); none in new files.
  `eslint` on new files: 0 errors. `vitest`: 19/19. `vite build`: ok.

## Verification (headless Chromium, no `.env`)

- `/` renders "Good evening." with every panel; `/mood` and `/trackers` unchanged.
- Seeded 8 tracker days + 3 habits (1 done) → progress 33%, habits 1/3; ticking
  "Walk outside" → 51%, habits 2/3, log persisted to `bloom.habit_logs`,
  Flow/Focus/Activity updated. Connection map drew the real sleep↔study arc
  (r = 1.00 on the seeded data) and per-node averages.
- Screenshots: `today-desktop-seeded.png`, `today-desktop-after-toggle.png`,
  `today-mobile-390.png`, `mood-route.png`, `trackers-route.png`.

## Apply locally

`bloom-today-home.zip` in this folder — see `KIT-README.md`.

---

# v2 — habits section, floating add-habit, one sidebar everywhere

Three requests, nothing else changed:

## 1. Dedicated habits section, high on the page

`src/components/home/HabitsSection.tsx`, rendered directly under the greeting/hero and
above the progress ring + connection map (`src/routes/index.tsx`). Same theme
tokens as the rest of Today (`.home-panel`, `.home-chip`, `--home-*` colours).

| Element | Source |
| --- | --- |
| Habit cards (icon tinted by the habit's colour, name, reminder time, `+N pts`) | `useHabits().todayHabits` — Supabase `habits` + `habit_logs` when signed in, `bloom.habits` / `bloom.habit_logs` on the device otherwise |
| Tap to toggle | `useHabits().toggle(id)` — the same optimistic path the progress ring, the trackers ring, the Coach and the points already use |
| Streak flame per habit (≥ 2 days) + "N-day streak" chip | new pure `streakOf(habit, logs, today)` in `src/lib/home/habits.ts`; counts consecutive *due* days back from today, today only counts once done, unscheduled days neither count nor break the run. 7 unit tests in `src/lib/home/habits.test.ts` |
| Progress bar + "2 of 3 done today" | derived from the same list |
| Points chip | `useHabits().points` (`profiles.total_points`) |
| Empty state | copy + "Add your first habit" button, opens the modal |

The previous lower "Today's habits" panel was removed (it duplicated this section);
`HabitsPanel` was deleted from `panels.tsx`.

## 2. Floating "Add habit" button

Fixed bottom-right (`.home-fab`), violet primary with the page's glow, icon-only on
phones (`aria-label="Add habit"`), label on `sm+`. Opens the existing
`AddHabitModal` → `useHabits().addHabit()` → `habits` insert (or device fallback).
On phones it sits above the tab bar via `--app-bottom-nav`.

## 3. The same sidebar on every main page

- `AppNav` (`src/components/home/HomeSidebar.tsx`) = the insight-map rail
  (`lg+`) + the bottom tab bar (`< lg`). Dropped right after `<BloomHeader />` on
  `/`, `/trackers`, `/cycle`, `/mood`, `/rewards`, `/coach` and `/profile`.
- The page wrapper gets `app-shell`: at `lg+` it becomes a two-column grid
  (`212px | 1fr`) with the header across the top, the rail in column 1 and the
  page's own `<main>` in column 2 (`src/styles.css`). Below `lg` nothing changes
  except bottom padding for the tab bar. **No page was re-nested** — each patch is
  one import + one class + one line, so the pages' fixed atmospheres, modals,
  drawers and z-indexes are untouched (verified: metrics modal centred on the
  viewport, Coach drawer/command palette cover the rail, Rewards toast and the
  trackers "Reflect & log" dock lift above the tab bar on phones).
- The rail pins Bloom's base palette on itself (`.app-nav`), so it is identical on
  Rewards (which re-tints `--background/--surface/--border`) and inside the Cycle
  themes. The nav block is sticky so it stays in reach on long pages; the
  botanical still sits at the very bottom.
- `BloomHeader` stays on top of every page as before.

## Also fixed on the way

- `/rewards` crashed to "This page didn't load" whenever the app runs without a
  Supabase `.env` (pre-existing; `useRewardsSystem` called `supabase.auth` without
  the `hasSupabaseConfig` guard the other hooks have). Now shows its normal
  "vault could not be opened" notice instead.
- Two `min-w-0` / explicit-column fixes on the Today grid so long activity lines
  can no longer widen the page horizontally.

## Verification (this branch, headless Chromium, no `.env`)

- `tsc`: the same 11 pre-existing errors (ReflectSheet, BloomCycleAI, cycle-classic, usePeriodLog test), none in touched files
- `eslint` on every touched file: 0 new errors (mood.tsx keeps its 7 pre-existing prettier errors — the patch there is 3 lines)
- `vitest`: 26/26 (19 existing + 7 streak tests) · `vite build`: ✓
- Desktop 1440 and phone 390 on `/`, `/trackers`, `/cycle`, `/mood`, `/rewards`, `/coach`, `/profile`: rail visible at 1440 with the right item active, tab bar at 390, `<main>` starts at x=212 beside the rail, no horizontal overflow (`scrollWidth == 1440 / 390`) — screenshots `p5-*.png`
- Today: section top is 24 px under the hero; toggling a habit from the section moves the ring 16% → 33% and the section bar to 33%; FAB opens the Add-habit modal (`p5-today-fab-modal.png`); on 390 the FAB bottom (772) clears the tab bar top (783); trackers dock bottom (756) clears it too

## Kit

`bloom-today-home.zip` (v2) — `apply-today-home.mjs` + `files/`. Tested from both
starting points: the metrics-fix baseline (`4f924ee`, everything applied, 31 steps)
and the v1 state (`bf49c7f`, only the v2 parts applied). Both results are
byte-identical to this branch, CRLF preserved, second run = 0 changes, `tsc` =
the same 11 pre-existing errors.
