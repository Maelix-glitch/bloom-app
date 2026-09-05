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
