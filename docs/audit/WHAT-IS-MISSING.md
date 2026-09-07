# Bloom — what is still missing

A whole-system audit of the app as it stands on `arena/01a0702b-bloom-app` at `807e629`
(Today, habits, trackers, mood, cycle, coach, rewards, profile, sync, dates, install, safety).

The filter for every item below was one question: **would a real person, using Bloom every
day, hit this?** Nothing is here because it would be nice to build. Each item says what
happens today (with the file that does it), why it matters to the person, and the fix.
Where a claim could be wrong I verified it by running the code (marked **verified**).

Effort: **S** = under an hour · **M** = a session · **L** = a phase like the cycle work.

| Tier | Meaning | Count |
| --- | --- | --- |
| **A** | Wrong today — misleads the person or loses their data | 12 |
| **B** | Missing, and a daily user will run into the hole | 11 |
| **C** | Small, real, worth doing when nearby | 10 |

A short list of what I checked and found **solid** is at the end, so you know the audit
covered it rather than skipped it.

---

## Tier A — wrong today

### A1 · Mood "today" is a UTC day on Today, a local day on Mood — **verified**

- **Today:** `src/lib/home/today.ts:149,321` compare `entry.timestamp.slice(0, 10)` (UTC
  date) against `today` (local date). `src/lib/mood/analytics.ts:18,528,530` key every
  day-aggregate, the correlation days and the streak by UTC too; `src/hooks/useMoodSystem.ts:115`
  and `src/lib/profile/journey.ts:33` the same. The Mood page itself uses `localDay()`
  (`src/lib/mood/page.ts:75`).
- **What the person sees (IST, +05:30):** any check-in between midnight and 05:30 is filed
  under *yesterday*. Ran it: an entry at 01:30 on 8 Sep → Mood page lights today's face, Today
  page still says "Log today's mood", the streak counts it as the 7th. Late-evening mood
  entries also land on a different calendar day from the tracker day they belong to, so
  mood↔sleep/study correlations pair the wrong days.
- **Fix (S):** one `localDay()` helper used everywhere a timestamp becomes a date
  (`today.ts`, `analytics.ts`, `useMoodSystem.ts`, `journey.ts`). Also unblocks the flaky
  `page.test.ts` "picks the latest entry logged today".

### A2 · The mood composer's context signals are thrown away on save — **verified**

- `src/components/mood/Composer.tsx` collects sleep, sleep quality, exercise, steps,
  productivity, study, screen time, social, weather and workload. `toRow()` in
  `src/lib/mood/storage.ts:69-87` writes only mood, energy, stress, tags, note, logged_at,
  date. `fromRow()` never reads them back.
- **What the person sees:** "Your mood web", the MoodGraph copy ("Add sleep, exercise or
  screen time in the composer and the map shows what actually moves your mood"), the
  Today connection-map links (`MOOD_KEY_TO_SIGNAL` sleep/study/energy) and
  `calculateCorrelations` can **never** light up from anything they type — the values exist
  until the next reload. A promised feature that is structurally dead.
- **Fix (M):** best version — don't ask twice: on save, fill `sleep/study/screenTime/
  exercise` from the tracker day with the same local date (`bloom.trackers.days.v1` /
  `tracker_days`), and add a `context jsonb` column to `mood_entries` so anything typed in
  the composer round-trips. Migration + `toRow/fromRow` + one join in `useMoodSystem`.

### A3 · Habits cannot be edited, deleted, paused or archived — anywhere

- `useHabits()` exposes `toggle`, `addHabit`, `refresh` only (`src/hooks/useHabits.ts:286-302`).
  No UI on Today, Coach or Profile touches a habit after creation. The schema already has
  `is_archived`, the modal already supports `prefill` (`AddHabitModal.tsx:80,177`).
- **What the person sees:** a typo, a habit they've outgrown, or a holiday week — all
  permanent. Each one keeps counting as "not done" against the Today ring and the score,
  forever.
- **Fix (M):** long-press / "…" on a habit row → Edit (reuses the modal with `prefill`),
  Pause until a date, Archive (sets `is_archived`; keeps history), Delete (confirm + undo).

### A4 · "N times a week" habits are due every single day — **verified**

- `isDueOn()` (`src/lib/home/habits.ts:322-330`) returns `true` for `frequency: "weekly"`
  on every date; `timesPerWeek` is never read. Ran it: a "Gym · 3× a week" habit is due
  Mon–Sun.
- **What the person sees:** four "missed" days a week, the ring and streak punished for a
  habit they are completing exactly as planned.
- **Fix (S/M):** weekly habit is due until it has N completions in the current week
  (Mon–Sun, local); streak counts weeks that hit N; Today shows "2 of 3 this week".

### A5 · Period entries live only on this device — while everything else syncs

- Periods: `bloom.cycle.periods.v1` in localStorage only (`src/lib/cycle/periodStore.ts`).
  Day logs sync to `cycle_entries`; trackers to `tracker_days`; habits to `habits`; mood to
  `mood_entries`. Check-in answers (`bloom.cycle.checkins.v1`) are device-only too.
- **What the person sees:** new phone, cleared browser, or opening Bloom on the laptop →
  the whole period history, average, predictions and confidence are gone or different per
  device. For a cycle app this is the single biggest data-loss risk left.
- **Fix (M):** `cycle_periods` table (id, profile_id, start, end, flow, notes, updated_at,
  deleted_at) + the same pull/merge/push pattern `usePeriodLog` already uses for days;
  sync the check-in memory alongside. Migration included.

### A6 · "Your period is 3 days late" — from a population average — **verified**

- With one entry the engine is *generic* (28-day fallback, confidence `none`), yet
  `isLate` and the `late` check-in still fire (`predict.ts` `lateBy`/`isLate`;
  `reconcile.ts` §3). Ran it: one period on 7 Aug, natural 35-day cycle → on 7 Sep the person
  is told "Your period was due 3 days ago — has it started?".
- **Why it matters:** a nag about *their* body derived from nobody's body, on their very
  first month. Undermines the trust the rest of the page builds.
- **Fix (S):** never raise `late` while `isGeneric`; with `confidence === "low"` widen
  `lateAfterDays` to ≈7 and word it "later than the rough estimate".

### A7 · Long natural cycles are treated as mistakes forever — from the engine probe

- Every gap over `maxPlausible = 45` is excluded, flagged `anomaly-*`, and asked about as
  "was a period missed?" (`predict.ts` gaps; `reconcile.ts` §4). A person with consistent
  48–55-day cycles (PCOS, postpartum, perimenopause, teens) gets confidence `none`, a
  28-day prediction, a wrong "late" card every month and the same question every cycle —
  and "No — it really was that long" teaches the engine nothing.
- **Fix (M):** adaptive plausibility — when ≥2 consecutive gaps exceed 45 but agree with
  each other (±7), accept them as that person's range (cap at ~90); "it really was that
  long" persists a per-person `maxPlausible` override. Message becomes "your cycles run
  long and steady" instead of "you forgot".

### A8 · The "has it finished?" question arrives absurdly late — from the engine probe

- `still-open` fires whenever an open period is past `usual + 2` days with no cap
  (`reconcile.ts` §1c): "Day 91 since your period started — has it finished?".
- **Fix (S):** ask only between `usual+2` and `usual+10`; after that assume closed at the
  usual length silently (mark `end` as estimated, never as logged), and never ask it
  alongside `late` for the same period.

### A9 · Late + a bleed in the daily log → three overlapping cards — from the engine probe

- `new-period`, `late` and `still-open` all fire for the same situation. The person is asked
  one thing three ways.
- **Fix (S):** when a `new-period` candidate exists inside the late window, suppress `late`
  and `still-open`; the one card offers "Yes — period started <date>".

### A10 · "Clear all" on Trackers erases every day with no confirm and no undo — **verified**

- `TrackersPage.tsx:589` → `onClearAll={store.clearAll}`; `HistoryTable.tsx:62` calls it
  directly. Single-day delete (`onDelete`) also has no undo. `useTrackers` has no undo path
  at all. The cycle page has inline confirm + 8-second undo; the mood page confirms.
- **Fix (S):** the same inline confirm + `UndoToast` pattern from `src/components/ci`;
  `keepForUndo` snapshot in `useTrackers`.

### A11 · Habits created before signing in are dropped at sign-in

- On sign-in `setHabits(remoteHabits)` replaces the list (`useHabits.ts:150-153`); habits
  with `local-*` ids are never uploaded, and `toggle` skips them (`useHabits.ts:236`).
- **What the person sees:** try Bloom for a week, sign in to keep it, lose the week.
- **Fix (S):** on first sign-in, insert every `local-*` habit and its logs, then replace.

### A12 · Mood is the only module that fails offline or signed out

- Signed out: "Sign in to save a check-in" (`MoodPage.tsx:392`), nothing is kept. Offline
  while signed in: `moodRecord.save()` rolls the entry back on error
  (`src/lib/mood/record.ts:134-139`). Trackers, cycle and habits are device-first and
  retry.
- **Fix (M):** a local queue (`bloom.mood.pending.v1`) written first, flushed on
  reconnect/sign-in; the face stays lit with "saved here — not on your account yet",
  exactly the trackers' sync line.

---

## Tier B — missing, and a daily user will hit the hole

### B1 · No way to say "I'm not expecting periods" / "I don't track a cycle"

- Pregnancy, postpartum, hormonal contraception with no bleed, menopause, or simply not
  menstruating: the engine counts up forever ("due 61 days ago"), Today shows a Cycle ring
  and "Set your cycle anchor" as a focus item, and the coach keeps mentioning the cycle.
- **Fix (M):** a cycle *mode* in the person's settings: `tracking` · `paused until <date>
  / until I say` (reason optional, never required) · `off`. Paused hides predictions and
  late logic but keeps history and the daily log; `off` removes the Cycle ring, focus item,
  nav entry and coach topic. Pairs with A7 — the "not expecting" answer becomes one of the
  late card's options.

### B2 · Quick metrics log demands all six numbers; unused trackers count against you

- `MetricsEntryModal.tsx:157,192-193,343` — "All fields are required." And the Today score's
  tracker share is `goalsMetToday / 6` (`core.ts` `completion`), so someone who tracks
  sleep, water and movement can never pass 50 % on that slice.
- **Fix (S/M):** allow partial saves (the store is already null-safe), and let the person
  choose *which* trackers they track (a `bloom.trackers.active.v1` set, mirrored to the
  account); rings, the modal, the focus list and the score only count active ones.

### B3 · You can't tick yesterday

- `toggle()` writes `today` only (`useHabits.ts:225-249`). Forgot to tick before bed →
  streak broken, no repair. Habit apps live or die on this.
- **Fix (S):** a "yesterday" row (or tap-and-hold → pick date within 7 days) that calls the
  same insert/delete with that date.

### B4 · Reminders never fire

- The Add-habit modal collects a reminder time and stores `reminder_enabled/time`; it is
  only used to *order* the Today flow (`today.ts` `flowOf`). No `Notification` API use
  anywhere in `src/`. Nothing tells the person their period is due, the fertile window
  opens, or that nothing is logged tonight.
- **Fix (M, after B6):** Notification permission from Profile ("Remind me"), then local
  scheduling via the service worker: habit times, "period expected around <date>" two
  days out, "nothing logged today" at a chosen evening time. Android Chrome and installed
  iOS PWAs (16.4+) both support it; the app must be installable first.

### B5 · Predictions show one date even when the engine says it can't

- `PredictionsCard.tsx` prints a single `nextStart` at every confidence; irregular history
  (21/38/26/44) still yields "Oct 12". Today's Cycle signal (`today.ts` `readings`/
  `connections` "next in 12d") and the coach (`useCoachSystem.ts` `readCoachRecord`)
  quote the date with no confidence and no "late".
- **Fix (S):** low confidence → "between Oct 8 and Oct 16" (±variability); `none` → "rough
  guide, not personalised"; Today and coach carry the same wording and say "3 days late"
  when it is.

### B6 · Bloom can't be installed on the phone

- No `manifest` link or service worker in `src/routes/__root.tsx` (the old
  `public/bloom/manifest.json`, icons and worker exist but are not wired to the Vite app).
- **What the person sees:** no home-screen icon, browser chrome around a phone-first
  cycle/mood app, and no path to reminders (B4).
- **Fix (S):** manifest + `theme-color` in the root head, reuse `public/bloom/icons`, a
  minimal offline-shell worker (the pages are already device-first).

### B7 · "Export my data" exports the profile, not the data

- `AccountRow.tsx:66-103` exports identity, stories and highlights. Mood JSON lives on
  `/mood/intelligence`, trackers CSV on `/trackers`, cycle CSVs on `/cycle` — four places,
  three formats, and no habits export at all.
- **Fix (S):** one "Download everything" on Profile: a zip (or single JSON) with profile,
  habits + logs, tracker days, mood entries, periods, daily cycle log, check-in answers.

### B8 · No way to bring history in

- No import anywhere. Someone arriving from another period app (or from a spreadsheet)
  starts *generic* for three or four months. The trackers and mood pages can't take a file
  either.
- **Fix (M):** "Import period starts" on Cycle (paste or CSV `start,end` — the format
  `logsToCsv` already writes), validated through `validateLogDraft`, previewed before
  commit; later the same for tracker days.

### B9 · There is no "delete my account / erase everything"

- No `deleteAccount`/erase path in `useProfileSpace`, `AccountRow` or anywhere else. For an
  app holding cycle, mood and coach conversations this is expected — and usually required.
- **Fix (M):** an `erase_my_data()` RPC (security definer, deletes every `profile_id` row
  across the tables + storage objects + `auth.users`), behind a typed-confirmation dialog;
  the client also clears every `bloom.*` key.

### B10 · The quiet 1,000-row cliff

- `moodStorage.all()`, `pullDays()` (trackers and cycle) and `fetchHabits()` select
  without `.range()`; Supabase returns at most 1,000 rows by default. Three mood entries a
  day → after about a year the oldest history silently disappears from every average,
  streak and correlation. Nothing tells anyone.
- **Fix (S):** page with `.range()` in 1,000-row steps until short; or narrow the initial
  pull to the analytics window (1y) and page older rows on demand.

### B11 · Fresh Supabase projects can't run Mood or Coach

- `supabase/migrations/` creates rewards, profile/stories, `cycle_entries`, `tracker_days`,
  `habits`, `habit_logs` — but not `profiles`, `mood_entries`, `coach_messages`,
  `coach_memory`. Those exist only in the legacy `public/bloom/SETUP_SUPABASE.md`. A new
  environment gets "relation does not exist" on two pages.
- **Fix (S):** one additive migration (`create table if not exists` + RLS + indexes) so
  the folder is the complete source of truth; `A2` adds its column there too.

---

## Tier C — small, real, worth doing when nearby

### C1 · Study subjects are a fixed list of seven
`SUBJECTS` in `core.ts:177` (General/Maths/Science/…); the model already accepts any
string. Students track course names. **Fix (S):** "Other…" free text, remembered per
person, offered as chips.

### C2 · Tracker goals don't follow the account
`bloom.trackers.goals.v1` is device-only; `tracker_days` carries no goals. "Goal met" can
disagree between phone and laptop. **Fix (S):** a `tracker_goals` row per profile (or a
`goals jsonb` on `profiles`), same merge-by-`updatedAt`.

### C3 · The Today flow's fixed clock
`flowOf` (`today.ts:458-500`) hard-codes Mood 12:00, Study 14:00, Movement 18:00,
Reflection 21:00 and labels them "missed" once the time passes — for a night-shift nurse
that's every morning. **Fix (S):** three editable times in Profile, or derive from when the
person usually logs.

### C4 · Points lead nowhere
Today shows "1,234 points → Rewards"; `/rewards` never mentions points
(`RewardsPage.tsx`, no `points`). **Fix (S):** a small "how you earned these" strip on
Rewards (per-habit totals, this week), or drop the chip.

### C5 · Tap a day on the cycle heatmap to log it
`CycleHeatmap.tsx` renders twelve weeks but nothing is tappable; backfilling "I bled last
Tuesday" means finding the date input. **Fix (S):** cell click → `focus-form` with that
date (the follow-up plumbing from the check-ins already exists).

### C6 · "No bleeding" logged on the start day itself is ignored — from the engine probe
A `none` day on `period.start` should ask "did it really start on <date>?" with
"move it to <first bleed day>". **Fix (S)** in `reconcile.ts` §1.

### C7 · A future start on disk is accepted silently — from the engine probe
Imports or a wrong device clock produce `cycleDay = 0` and phase "menstrual" for a period
that hasn't happened. **Fix (S):** treat it as "upcoming" in the UI and offer to fix the
date.

### C8 · Habit streaks stop at 45 days
`fetchLogs(profileId, daysAgo(45))` (`useHabits.ts:146`) — a real 60-day streak reads
45, and "best streak" can't exist. **Fix (S):** pull 400 days for streak maths (or compute
streaks server-side later).

### C9 · Check-in answers aren't remembered across devices
Follows A5 — once periods sync, sync `bloom.cycle.checkins.v1` alongside so a "Don't ask
this cycle" on the phone holds on the laptop.

### C10 · One undo for single-day tracker deletes
Included in A10's fix; listed so it isn't forgotten if A10 is scoped to "Clear all" only.

---

## Checked and solid (no action)

- Trackers, cycle daily log and habits are **device-first** with merge-by-`updatedAt` and
  retry on failure; the sync line tells the truth about where data is.
- Cycle history has inline confirm on delete/clear and an 8-second undo; mood deletes
  confirm; rewards revoke confirms.
- Every route sets its own `<title>`; `lang="en"`; an error boundary and a not-found page
  exist at the root; 17 `aria-live` regions; `prefers-reduced-motion` is honoured in all
  seven style sheets and the animated components.
- Row-level security is declared in every migration that creates a table; the public
  profile RPC deliberately never returns email, points, mood, coach or tracker rows.
- Local-day (`todayKey`) is used consistently for trackers, habits and cycle — the mood
  module (A1) is the only outlier.
- The cycle engine's guards from the last phase behave as specified for the common paths
  (first entry silent, spotting never starts a period, `continued` after a close,
  long-bleed at 20 days).

---

## Suggested order

1. **Trust and data first (A1, A2, A5, A6, A8, A9, A10, A11, A12)** — nothing new to learn,
   everything the person already logs becomes true and safe. One phase.
2. **Habits that match real life (A3, A4, B3)** — edit/pause/archive, weekly counts,
   tick yesterday. One phase.
3. **The cycle for every body (A7, B1, B5, C6, C7)** — long cycles, pause/off mode,
   honest windows on Today and in the coach. One phase.
4. **On the phone (B6 → B4)** — install, then reminders that fire.
5. **Owning the data (B7, B8, B9, B10, B11, C2)** — export everything, import history,
   erase everything, no silent cliff.
6. **Polish when nearby (B2, C1, C3, C4, C5, C8)**.

Everything in tiers A and B comes with tests where there is logic to test, a migration
where a table changes, and the usual apply-kit for your local checkout.
