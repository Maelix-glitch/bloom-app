# Bloom — Today (home) page kit

Migrates the home page from `Maelix-glitch/insight-map` into the main Bloom app
as the index route (`/`), wired to real data. Mood Intelligence (the old `/`)
moves to `/mood`.

## Apply

```
cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
node "<where you unzipped>\bloom-today-home\apply-today-home.mjs"
```

(If the zip extracts double-nested like last time, the script is at
`…\bloom-today-home\bloom-today-home\apply-today-home.mjs`.)

Expected output ends with `Done.` and eight ✔ checks. Safe to run twice.

**Requires** the metrics-modal fix already applied (it reuses
`src/components/tk/MetricsEntryModal.tsx`).

## Then

1. `npm run dev` → `/` is the Today page; `/mood` is Mood Intelligence.
2. In Supabase → SQL editor, run `supabase/migrations/20260906_today_home.sql`
   once. It creates (if missing) `tracker_days`, `habits`, `habit_logs`,
   `profiles.total_points` + the points RPCs, all owner-only RLS, and enables
   realtime for habits. It is idempotent and tolerant of the legacy tables.
3. `git add -A && git commit -m "feat(home): Today page from insight-map, wired to Supabase" && git push`

## What's wired

| Panel | Source | Persists to |
| --- | --- | --- |
| Progress ring | habits 40% · trackers 35% · mood 25% (only inputs that exist) | — |
| Connection map | node strength = share of last 30 days carrying that signal; arcs = real correlations (trackers + mood) | — |
| Trackers at a glance | `useTrackers` (same store as /trackers) | `tracker_days` |
| Today's habits / focus / flow | `useHabits` (new) | `habits`, `habit_logs`, `profiles.total_points` (+ realtime) |
| Mood chip / composer | `useMoodSystem` | `mood_entries` |
| Cycle ring | `usePeriodLog` | `cycle_entries` |
| Coach card | `useCoachSystem` — same grounded responder as /coach | `coach_messages` |
| Insights / activity | computed from all of the above | — |

Signed out or without `.env`: everything still renders from device storage;
nothing is invented.

## Files

- new: `src/routes/index.tsx`, `src/routes/mood.tsx` (moved), `src/components/home/*`,
  `src/hooks/useHabits.ts`, `src/lib/home/{habits,today}.ts`, `src/assets/home/*.jpg`,
  `supabase/migrations/20260906_today_home.sql`
- patched: `src/components/BloomHeader.tsx` (Today → `/`, Mood → `/mood`, context label),
  `src/styles.css` (scoped `.home-*` tokens appended), `src/hooks/{useMoodSystem,useProfileSpace,useCoachSystem}.ts`
  (skip Supabase when no config), `RewardsPage.tsx`, `CoachPage.tsx`, `public/bloom/shared-bloom-header.js` (links)
