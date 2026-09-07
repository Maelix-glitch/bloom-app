# Bloom — Tier A kit

One script brings your checkout up to the branch tip `1c364ab` — every phase so
far (metrics modal fix, Today home + habits + rail, Add-habit dialog, Mood pages,
full-width /cycle with check-ins) **and** all twelve Tier A items. It is safe to
run on a checkout that already has some of the earlier kits: files that already
match are skipped, files you edited yourself are kept as `<name>.before-tier-a.txt`.

`REPORT.md` in this folder explains each item, the sync model and the fallbacks.

## Apply (Windows, PowerShell or cmd)

    cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
    node "C:\Users\Windows 11 Pro\OneDrive\Desktop\bloom-tier-a\bloom-tier-a\apply-tier-a.mjs"

(Windows unzips into a double-nested folder — keep the quotes and the full path.)

Then:

1. `npm install` (no new packages; the lockfile may refresh)
2. Stop the dev server, `npm run dev`, hard-refresh once (Ctrl+F5).
   The dev server regenerates `src/routeTree.gen.ts` — commit that file too.
3. Supabase → SQL editor → run the files in `migrations/` **in order** (each once;
   all are safe to re-run):
   - `20260906_today_home.sql` (skip if you ran it for the Today page)
   - `20260907_habit_pause.sql`
   - `20260907_cycle_periods.sql`
   - `20260908_mood_context.sql`
4. Optional: `npx vitest run` → 150 tests.
5. `git add -A && git commit -m "feat: Tier A — trust and data first (A1–A12)" && git push`

## What to look at afterwards

- **/cycle** → the sync line under the title reads *"saved to your account — periods,
  daily log and your answers"* once signed in and step 3 is done. Log a period on
  the phone; it is on the laptop after a refresh. Delete it on one; it is gone on the other.
- **/mood** → sign out (or go offline) and tap a face: it lights, the line says
  *"Saved on this device…"*, and it moves to the account when you sign in / reconnect.
  Open "Log an entry" on a day with tracker data: sleep, exercise, study, screen
  time are already filled in, with a note saying they came from your trackers.
- **/** (Today) → the `⋯` on a habit: Edit, Pause, Archive, Delete (with Undo).
  A "3× a week" habit stops being due once you've done it three times this week.
- **/trackers** → "Clear all" asks first; every delete can be undone for 8 s.

## If the script prints ✖

Send the whole output. Nothing destructive happens before the `Apply:` section,
and every replaced file that differed from a known version is still next to the
new one as `.before-tier-a.txt`.
