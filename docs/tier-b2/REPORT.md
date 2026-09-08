# Bloom — Tier B, part 2

The five items the Tier B/C kit listed as "still to come": **B4** reminders · **B6** install on
the phone · **B7** export *everything* · **B8** import period history · **B9** erase my account.

Audit numbers are the ones in `docs/audit/WHAT-IS-MISSING.md`. Tests: `npx vitest run` →
**229 tests / 20 files** (was 199 / 17 — this part adds `importPeriods.test.ts`,
`schedule.test.ts`, `exportAll.test.ts`).

---

## B6 · Bloom can be installed on the phone

*Done first, because B4 depends on it.*

- `public/manifest.webmanifest` — real Bloom routes (`/`, `/mood`, `/cycle`, `/trackers`),
  standalone display, maskable + any icons from the existing `public/bloom/icons`, and four
  app shortcuts. The old `public/bloom/manifest.json` pointed at the legacy `.html` pages and
  was never linked from the React app; it is left alone.
- `src/routes/__root.tsx` — `<link rel="manifest">`, `apple-touch-icon`, `theme-color`,
  `mobile-web-app-capable` and the iOS status-bar meta.
- `public/sw.js` — a small offline shell: navigations are network-first falling back to the
  cached `/`, build assets are cache-first, **everything cross-origin (Supabase) is never
  cached**. A new `CACHE` name drops the old one on activate. The worker also owns
  notifications (`bloom-notify` message → `showNotification`, plus `notificationclick`
  focusing or opening the right route).
- `useInstallPrompt()` registers the worker after `load` (never competing with first paint),
  captures Chrome's `beforeinstallprompt` so the app can ask in its own words, and reports
  `ios: true` where no such event exists so the UI shows *Share → Add to Home Screen* instead.

## B4 · Reminders that actually fire

The Add-habit dialog has collected `reminder_enabled/time` since the beginning and only ever
used it to *order* Today's flow. Now:

- **`lib/reminders/schedule.ts`** — the pure half, fully tested. `dueReminders(input)` returns
  what should be shown right now:
  - a **habit** at its own reminder time — never one already ticked today;
  - **cycle**: "expected in about two days" `PERIOD_LEAD_DAYS` before a predicted start, the
    late message instead once the engine calls it late (never both), and "your fertile window
    opens today". All silent while the cycle is **paused** or **off** (B1);
  - the **evening nudge**, only on a day with nothing logged on it at all.
  - One notification per reason per day (the key carries the day), nothing before its time,
    nothing more than `GRACE_MINUTES` (120) stale — a laptop opened at midnight does not dump
    the whole day at once.
- **`useReminders()`** — permission is asked for **only** when someone turns reminders on,
  never on page load. Checks each minute and on `visibilitychange`; delivers through the
  service worker when there is one (the only route that works in an installed iOS PWA) and
  through `new Notification` otherwise. Delivered keys are per device; the settings live in
  the synced prefs document (`reminders.settings`), so "reminders on" follows the account.
- **Profile → Remind me** (`pf-row-reminders`): the master switch, per-kind switches
  (habits / cycle / evening), the evening time, **Show me one**, an honest note when the
  browser has blocked notifications, and the install card when Bloom isn't installed yet.

## B7 · "Export my data" now means all of it

- **`lib/data/exportAll.ts`** — `buildExport()` produces one `bloom.export.v1` document:
  profile, stories, highlights, **habits + every log**, tracker days + goals + the active set,
  mood entries, periods, the cycle daily log, check-in answers and the prefs document. It is
  pure — the caller passes the records, so an export never touches the network and can never
  disagree with what is on screen.
- **`useExportBundle()`** assembles it *lazily*: counts are cheap and always available (the
  erase sheet uses them too), the bundle itself is only built when the sheet asks.
- **Profile → Download everything** (`pf-row-export-all` → `pf-export-all-go`): the counts are
  shown **before** the download — mood check-ins, habit ticks, habits, tracker days, periods,
  cycle days, moments — with the total. `bloom-export-YYYYMMDD.json`.
- The old **Export my profile** row is untouched, and so is every existing CSV on
  /trackers and /cycle. Nothing was taken away.

## B8 · Bringing history in

- **`lib/data/importPeriods.ts`** — parses, in one paste: the CSV Bloom itself writes
  (`start,end,flow,notes`, header optional), one date per line, `2026-08-03 to 2026-08-07`,
  tab/semicolon separated, `03/08/2026` (day-first) and `2026/08/03`. An impossible half
  resolves the ambiguity on its own (`25/08/2026` can only be the 25th); otherwise a
  **day-first** checkbox appears, and only when the paste actually contains an ambiguous date.
- **Nothing is silently dropped.** Every unreadable line comes back with its **line number**
  and a reason (future date, end before start, more than 15 days of bleeding, not a date).
- **Nothing is written blind.** `previewImport()` marks each row *will be added* /
  *already here* / *skipped (overlaps …)*, de-duplicating within the paste as well as against
  the record, and the button says exactly how many it will add.
- Commit goes through the store's **existing** `add()` — the same validation, sync, cloud
  write and undo. No new write path, no new table.
- **Cycle → Every entry you've logged → Import history** (`cycle-import-open`), next to
  Export CSV. Disabled in the style-gallery preview like every other write.

## B9 · Erase everything

- **`supabase/migrations/20260910_erase_account.sql`** — `erase_my_data()`, security definer
  with a locked `search_path`, deletes every row keyed to `auth.uid()` across habit_logs,
  habits, tracker_days, mood_entries, cycle_periods, cycle_entries, cycle_state, user_prefs,
  coach_messages, coach_memory, story_highlight_items, story_highlights, stories,
  profile_privacy, reward_assignments, the person's `profile-media` storage objects, the
  `profiles` row, and finally `auth.users` — each guarded with `to_regclass` so it installs and
  runs on a project that only has some of these tables, and the auth-user delete is wrapped so
  a project that doesn't permit it still erases everything else. Returns a per-table count.
  `execute` granted to `authenticated` only.
- **`lib/data/erase.ts`** — the device half always runs, even when the account half fails:
  someone asking to be forgotten on a borrowed laptop must not be blocked by the network.
  It removes **every `bloom.*` key and nothing else** (the Supabase auth token and unrelated
  keys are left alone), then signs out. The result reports which halves succeeded, verbatim.
- **Profile → Erase everything** (`pf-row-erase` → `pf-erase-confirm` / `pf-erase-go`): what is
  about to go, listed with counts; the typed confirmation `erase everything`; a pointer to the
  export row one line above. If the migration hasn't been run, the sheet says so plainly rather
  than pretending it worked.

---

## Migrations

Only one new file, and only B9 needs it. Everything else in this part needs no SQL.

| # | file | for |
|---|------|-----|
| 7 | `20260910_erase_account.sql` | `erase_my_data()` (B9) |

Run it after the six listed in `docs/tier-b-c/REPORT.md`. Idempotent, safe to re-run.

## Test ids

Profile `pf-row-export-all` · `pf-export-all-go` · `pf-row-reminders` · `pf-reminders-toggle|habits|cycle|evening|time`
· `pf-row-install` · `pf-install-go` · `pf-row-erase` · `pf-erase-confirm` · `pf-erase-go` —
Cycle `cycle-import-open` · `cycle-import-text` · `cycle-import-file` · `cycle-import-dayfirst` ·
`cycle-import-preview` · `cycle-import-go` · `cycle-import-done`.

## Files

New: `public/manifest.webmanifest` · `public/sw.js` · `src/lib/data/{exportAll,importPeriods,erase}.ts`
· `src/lib/reminders/schedule.ts` · `src/hooks/{useReminders,useInstallPrompt,useExportBundle}.ts`
· `src/components/profile/DataSheets.tsx` · `src/components/ci/ImportPeriods.tsx`
· `supabase/migrations/20260910_erase_account.sql` · three test files.

Changed: `src/routes/__root.tsx` (manifest/meta + worker registration) ·
`src/routes/profile.tsx` (three sheets, row wiring) · `src/components/profile/AccountRow.tsx`
(four new rows) · `src/components/ci/CycleIntelligence.tsx` and `HistoryTable.tsx`
(the Import history button). Nothing was removed.

## What is left

Tier B and Tier C are now complete. Beyond them, `WHAT-IS-MISSING.md` has nothing outstanding
in these two tiers; the next work would be new scope rather than a gap.
