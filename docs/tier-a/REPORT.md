# Bloom — Tier A: trust and data first

Every item from `docs/audit/WHAT-IS-MISSING.md` tier A, done. Nothing new to
learn: everything the person already logs becomes true, safe, and the same on
every device.

Branch `arena/01a0702b-bloom-app`, tip `1c364ab`. 150 tests pass
(`npx vitest run`); `npx tsc --noEmit` shows only the 11 pre-existing errors
in files this work never touched.

## What changed, item by item

| # | Problem (what the person saw) | What happens now |
|---|---|---|
| A1 | Mood entries logged after 5:30 pm IST landed on the *next* day (days were keyed by the UTC slice). Streaks, "today's mood" and the weekly dots were all off by one. | One authority for "which day is this" — `src/lib/localDay.ts` — used by mood, trackers, cycle and habits. Tests pin `TZ=Asia/Kolkata`. |
| A2 | Sleep, exercise, screen time… typed into the mood composer vanished on reload; "Your mood web" and the correlations could never light up. | `mood_entries.context jsonb` round-trips every signal. **Don't ask twice:** the composer prefills sleep / quality / exercise / study / screen time from the tracker day with the same local date (minutes → hours, 1–5 → /10), says so, follows the "When" date, never overwrites what you typed. One-tap faces carry the same context. |
| A3 | Habits could only be created and ticked. | Edit, pause (a window: "for a week", "until…"), archive (history kept, restorable), delete — with an 8 s undo. Remote write happens only when the undo window settles. |
| A4 | "3× a week" habits were treated as daily: due every day, streak broken every day. | Weeks run Mon–Sun local. A weekly habit is due until it has hit its count this week; the streak counts consecutive weeks that hit target (flame shows "3w"). |
| A5 | Period entries lived only in the browser. New phone or cleared cache = whole history gone; check-in answers were asked again on every device. | `cycle_periods` (one row per entry, deletions as tombstones) + `cycle_state` (check-in memory + personal settings). Per id the later change wins; a deletion elsewhere removes the entry here; a device-only history is uploaded at first sign-in; the same period logged on two devices before they ever synced is retired to one. The sync line and history footer say where the record actually is. |
| A6 | With no history at all, the generic 28-day guess declared people "late". | "Late" never fires at confidence *none*; 7 days of grace at *low*; 3 at medium/high. |
| A7 | Natural 46–60-day cycles were treated as impossible and silently dropped from the pattern. | Cycles above 45 days count when two gaps agree, or when you confirm "yes, cycles this long are mine" (`personalMaxPlausible`, cap 90) — which now also syncs (A5). |
| A8 | "Has your period finished?" kept asking forever on an open entry. | Asked only while `usual+2 < day ≤ usual+10`; after that the entry is closed at the estimated length, quietly, with a note. |
| A9 | Three cards at once for one situation (late + still open + new period). | One card per situation; "late" only when actually late and no new period is pending. |
| A10 | "Clear all" on trackers wiped everything instantly; row delete was final. | Confirm first; every delete/clear has an 8 s undo (`src/lib/undo.ts`, shared with the cycle page). |
| A11 | Habits created before signing in disappeared at sign-in. | `uploadLocalHabits` moves `local-*` habits and their logs to the account (upsert on `profile_id, habit_id, date`). |
| A12 | Mood was the only module that failed offline / signed out — a failed save rolled the entry back in front of you. | Outbox `bloom.mood.pending.v1`: the device is written first, the face lights at once, the account catches up on the next push / reconnect / focus / sign-in / **Retry now**. Honest sync line under "Log your mood". Mood Intelligence offers to log on the device instead of a dead end. |

## Before the migrations are run, nothing breaks

The app probes each table/column once and falls back:

- **`cycle_periods` / `cycle_state` missing** → the daily log keeps syncing exactly
  as before; period entries and answers wait on the device and the sync line says
  *"period entries wait on this device until the cycle_periods table exists"*. They
  go up on the first sync after the migration.
- **`mood_entries.context` missing** → Mood reads/writes the old column list;
  context stays on the entry in memory and in the outbox until the column exists.
- **`habits.paused_from/paused_until` missing** → the pause holds on the device
  with a clear note.

## Migrations — run once, in this order (Supabase → SQL editor)

All four are idempotent (`if not exists` / `drop policy if exists` everywhere), so
running one twice is harmless.

1. `20260906_today_home.sql` — `tracker_days`, `habits`, `habit_logs`, points
   (from the Today-home phase; skip if you already ran it).
2. `20260907_habit_pause.sql` — `habits.paused_from`, `habits.paused_until`,
   `habit_logs` cascade delete.
3. `20260907_cycle_periods.sql` — `cycle_periods`, `cycle_state`, owner-only RLS,
   `anon` revoked, tombstone pruning function.
4. `20260908_mood_context.sql` — `mood_entries.context jsonb`.

## Sync model (so the behaviour is predictable)

- **Trackers, cycle daily log, habits, periods, mood** are all *device first*: the
  local copy is written and shown before any network call; the account is a
  mirror that catches up.
- **Merge rule everywhere:** per record, the later `updated_at` wins. Deletions
  are tombstones for periods (so an offline device can't resurrect an entry) and
  hard deletes for day logs / mood rows (single-owner, no resurrection path).
- **Check-in memory** merges as: dismissed = union (a "no, never ask this" anywhere
  stands), snoozed = later date, `personalMaxPlausible` = max.
- **Duplicates across devices** (same period start logged twice before first
  sync): the one with a last day wins, else the fresher one; the loser is
  tombstoned everywhere.

## Files (relative to the repo)

New: `src/lib/localDay.ts`, `src/lib/undo.ts`, `src/lib/cycle/periodCloud.ts`,
`src/lib/mood/context.ts`, `src/lib/mood/pending.ts`, `src/components/home/HabitUndo.tsx`,
migrations `20260907_habit_pause.sql`, `20260907_cycle_periods.sql`,
`20260908_mood_context.sql`, and their tests.

Changed: `usePeriodLog.ts`, `useHabits.ts`, `useTrackers.ts`, `useMoodSystem.ts`,
`useCoachSystem.ts`, `lib/home/habits.ts`, `lib/home/today.ts`, `lib/cycle/{predict,reconcile,periodStore}.ts`,
`lib/mood/{analytics,page,record,storage}.ts`, `lib/profile/journey.ts`,
`components/ci/*`, `components/tk/{HistoryTable,TrackersPage,AddHabitModal}.tsx`,
`components/home/HabitsSection.tsx`, `components/mood/Composer.tsx`,
`components/mood/page/MoodPage.tsx`, `routes/index.tsx`, `routes/mood/intelligence.tsx`,
`styles.css`.

## Test ids (for your own checks)

Today: `home-habit-menu-<id>`, `home-habit-paused-<id>`, `home-habit-archived-<id>`,
`home-undo`. Trackers: `tk-clear-all`, `tk-clear-all-confirm`, `tk-undo`. Cycle:
`cycle-checkins`, `cycle-checkin-<kind>`, `cycle-undo`. Mood: `mood-sync`
(`data-state` = off / signed-out / saved / pending / error), `mood-sync-retry`,
`mood-context-prefill`, `mood-face-<mood>`.

## Not in this tier (deliberately)

Tier B/C items from the audit — "I don't track a cycle" mode, partial saves in
the metrics modal, reminders, export/import/erase-everything, install prompt —
are unchanged. The only optional leftovers from this tier: the coach's
`expectedHabitSessions` and Today's subtitle still count weekly habits as if
daily (cosmetic), and there is no UI yet to *lower* a confirmed
`personalMaxPlausible` (it can only be raised by confirming).
