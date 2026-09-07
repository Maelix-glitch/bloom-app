# Bloom — Tier B and Tier C (part 1) + the profile redesign

Kit: `docs/tier-b-c/bloom-tier-bc.zip` · branch tip **`54c903b`** · cut against what the
app shipped with (`ce972cf`), so one run brings **any** checkout up to date — the metrics
modal fix, Today, the shared rail, Mood, the full-width Cycle page with check-ins, all
of Tier A, everything below, and the new profile.

`docs/audit/WHAT-IS-MISSING.md` is the list this works through. Item numbers below are its
numbers.

---

## Shipped in this kit

### B1 · "I'm not expecting periods" / "I don't track a cycle" — commit `18c282f`

- The Cycle page gets an **Expecting periods?** card (`CycleModeCard`, under the header):
  **tracking** · **paused** (optional *until* date, optional reason — never required) ·
  **off**.
- *Paused* keeps every period and every daily-log day, but the engine predicts nothing:
  `analyzeCycle({ expecting: false })` returns no next start, no cycle day / phase, no
  fertile window, no forecast, and `isLate` is always false. `reconcile` stays quiet about
  lateness and long gaps. Today's Cycle ring reads **Paused**; the coach says the cycle is
  paused and that nothing counts as late.
- *Off* additionally removes the Cycle ring, the "set your anchor" focus nudge, the
  connection-map node, the sidebar entry, and the coach topic (`cycle = null`).
- The late check-in card offers **"I'm not expecting a period"** directly (resolution
  `not-expecting` → paused).
- A dated pause resumes itself the day after `until` (`effectiveMode()`), on every device.
- Mode lives in `bloom.cycle.settings.v1` on the device and in `cycle_state.settings`
  (`mode`, `pause`, `modeChangedAt`) on the account — later change wins. **No new table.**
- Events: `bloom:cycle-mode-changed` (Today, rail and coach re-read immediately).

### B2 · Partial saves + choose what you track — commit `9ae9773`

- The quick metrics log (`MetricsEntryModal`) saves **whatever is filled in**; blanks leave
  today's existing values untouched. The "All fields are required" gate is gone.
- **What you track** — a switch row on the Targets sheet (`tk-active-<trackerId>`; at least
  one stays on). The modal, the rings, the console, Today's readings / focus / flow and the
  Today score count **only active trackers** (`analysis.active`, `goalsCounted`), so someone
  tracking three things can reach 100 %.

### B3 · Tick yesterday — commit `c98bded`

- `toggle(habitId, date)` accepts any local day in the last seven.
- A **"Did it yesterday? Tick it"** repair appears under a habit whose streak is at risk;
  the row menu gets **Tick a past day** (yesterday … 6 days ago).

### B5 · Honest prediction wording, everywhere — commit `c98bded`

- One sentence, quoted by the Cycle page, Today's cycle signal and the coach
  (`describeNextPeriod()` / `describeNextPeriodShort()`): a single date only at **high**
  confidence, a window at **medium**, "rough estimate" at **low**, "28-day guide only" at
  **none**, and "N days later than predicted" once the engine calls it late.
  `PredictionsCard` says the same thing as the coach — no more two stories.

### B10 · The 1,000-row cliff — commit `6e519be`

- Every reader that wants the whole record pages through PostgREST's cap
  (`lib/pageAll.ts`, deterministic ordering): mood entries, tracker days, cycle daily log,
  period entries, habits, habit logs.

### B11 · Fresh Supabase projects can run Mood and Coach — commit `6e519be`

- `20260909_core_tables.sql` defines `profiles`, `mood_entries` (with `context`),
  `coach_messages`, `coach_memory` with RLS, indexes and `updated_at` triggers —
  additively (`if not exists`). The migrations folder is now the complete source of truth.

### C1 · Custom study subjects — `9ae9773`
"Other…" free-text subject (`tk-subject-other`), remembered per person as chips (up to 24,
forgettable).

### C2 · Goals follow the account — `9ae9773`
Tracker goals, the active set, subjects and Today's flow times live in **one synced prefs
document** (`lib/prefs.ts` → `user_prefs` table, per-key later-wins merge, device-first,
works before the migration is run). Synced from the rail on every shell page.
Keys: `trackers.goals`, `trackers.active`, `trackers.subjects`, `today.flowTimes`.

### C3 · Editable flow times — `9ae9773`
Today's flow anchors are editable on the panel (**Times**, `home-flow-times-toggle`),
validated, synced; study / movement rows disappear when those trackers are off.

### C4 · Points lead somewhere — `18c282f`
**How you earned these** strip on Rewards (`reward-points`): balance, last 7 days, per
habit — from the same logs Today counts.

### C5 · Tap a day on the rhythm map — `18c282f`
Any day on the 12-week cycle heatmap (`cycle-heat-<date>`) opens it in the daily log.

### C6 · "No bleeding" on the start day — `c98bded`
Asks *did it really start on …?* with "It started <first bleed day>" / pick a day / keep.

### C7 · A future start on disk — `c98bded`
Treated as *upcoming* (no "day 0 · menstrual"); a check-in offers the last bleed day,
today, the date picker or removal; the engine stays quiet until it is fixed.

### C8 · Habit streaks past 45 days — `6e519be`
Completions are read 400 days back; a 60-day streak reads 60.

### C9 · Check-in answers across devices — verified
Already travel in `cycle_state.checkins` since A5 — nothing extra to run.

### C10 · Undo for single-day tracker deletes — verified
`removeDay` keeps a 6-second undo (`tk-undo`), same as Clear all (A10).

### Profile — redesigned from scratch — commit `54c903b`

A tracker's profile in the grammar of a social profile:

- **Cover** with the last twelve weeks drawn as a pulse line and *tracking* tags; the
  **avatar** breaks the cover edge and is still the story ring (unseen story lights it;
  the **+** starts a moment).
- **Name · @username · bio · Edit profile / Moment**, share and ⋯ (preview, archive,
  privacy, sign in/out) up in the cover.
- **Four numbers only logging can move:** days logged · day streak (with best) · of the
  last 7 days (with last 30) · rewards (with mood check-ins).
- **The record:** a 12 × 7 grid, one cell per day, brighter the fuller the day, each cell
  labelled with its sources; tap a day to open the page that can show it.
- **Tracking now:** chips for every active tracker + Mood + Habits + Cycle (hidden when
  cycle mode is *off*, dimmed when *paused*).
- **Pinned** — the featured moment as a pinned post.
- **Moments / Highlights / Journey** tabs (sticky, with counts). Journey = milestones as a
  badge shelf (earned bright, the rest outlined), the next one as a progress bar, "lately".
- **Account & data** as grouped settings rows: email, tracking since, accent, privacy,
  sign in/out · share, preview, archive, **export JSON** (same payload as before).

**Nothing behind it changed.** `profileService` / `storyService`, the `profiles`,
`profile_privacy`, `stories`, `story_highlights`, `story_highlight_items` tables and every
read/write in `useProfileSpace` are untouched; the record comes from the same tracker, mood,
habit and cycle stores their own pages use (`lib/profile/record.ts`, `useProfileRecord`).
`/@username` keeps working. Every feature of the first profile is still there: identity
editor + avatar, stories (compose / archive / viewer / share again / delete + undo),
highlights, featured picker, privacy sheet, public preview, share link, offline toast,
`?story=mood:<id>` deep link from Mood, signed-out preview, skeleton and error states.

---

## Still to come (Tier B, part 2)

B4 reminders · B6 install on the phone (manifest + service worker) · B7 export **everything**
(not just the profile) · B8 import period history · B9 erase my account. These are next; the
kit is cut so a later kit layers on top of this one the same way.

---

## Migrations — run once, in this order (Supabase → SQL editor)

All idempotent (`if not exists`), all safe to re-run. The app keeps working before you run
them — new things stay on the device until the table exists, then upload.

| # | file | for |
|---|------|-----|
| 1 | `20260909_core_tables.sql` | **first on a fresh project** — profiles, mood_entries, coach tables (B11). Harmless on an existing project. |
| 2 | `20260906_today_home.sql` | tracker_days, habits, habit_logs, cycle_state (Today) |
| 3 | `20260907_habit_pause.sql` | habit pause / archive columns (A3) |
| 4 | `20260907_cycle_periods.sql` | cycle_periods + tombstones (A5) |
| 5 | `20260908_mood_context.sql` | mood_entries.context (A2) |
| 6 | `20260909_user_prefs.sql` | user_prefs (C2 — goals / active trackers / subjects / flow times) |

B1, B2, B3, B5, C1, C3–C10 and the profile need **no** migration.

---

## Test ids

Today `home-fab-add-habit` · `home-habits-section` · `home-habit-<id>` · `home-undo(-button)`
· `home-ring-<signal>` · `home-flow-times(-toggle)` — Mood `mood-log` · `mood-face-<mood>` ·
`mood-sync(-retry)` — Cycle `cycle-checkins` · `cycle-checkin-<kind>` ·
`cycle-checkin-action-<actionId>` · `cycle-undo(-button)` · `cycle-next-period` ·
`cycle-mode-open|status|until|reason|pause|resume|off` · `cycle-paused-note` ·
`cycle-heat-<date>` — Rewards `reward-points` — Trackers `tk-clear-all(-confirm|-yes)` ·
`tk-undo(-button)` · `tk-active-<trackerId>` · `tk-subject-other` — Profile
`pf-number-days|streak|week|rewards` · `pf-tab-moments|highlights|journey` ·
`pf-row-privacy|signout|signin|export`.

Tests: `npx vitest run` → **199 tests / 17 files** (this tier adds `mode.test.ts`,
`prefs.test.ts`, `pageAll.test.ts`, `core.active.test.ts`, `responder.test.ts`, `record.test.ts`).
