# Bloom — Tier B/C kit (part 1) + profile redesign

One script brings your checkout up to the branch tip `54c903b` — every phase so far
(metrics modal fix, Today home + habits + rail, Add-habit dialog, Mood pages, full-width
/cycle with check-ins, all of Tier A) **plus** Tier B items B1 B2 B3 B5 B10 B11, Tier C
items C1–C10, and the redesigned Profile. It is safe to run on a checkout that already
has some of the earlier kits: files that already match are skipped, files you edited
yourself are kept as `<name>.before-tier-bc.txt`.

`REPORT.md` in this folder explains each item; `WHAT-IS-MISSING.md` is the audit it
works through.

## Apply (Windows, PowerShell or cmd)

    cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
    node "C:\Users\Windows 11 Pro\OneDrive\Desktop\bloom-tier-bc\bloom-tier-bc\apply-tier-bc.mjs"

(Windows unzips into a double-nested folder — keep the quotes and the full path.)

Then:

1. `npm install` (no new packages; the lockfile may refresh)
2. Stop the dev server, `npm run dev`, hard-refresh once (Ctrl+F5).
   The dev server regenerates `src/routeTree.gen.ts` — commit that file too.
3. Supabase → SQL editor → run the files in `migrations/` **in this order** (each once;
   all are safe to re-run, all `if not exists`):
   1. `20260909_core_tables.sql` — **first**; defines profiles / mood_entries / coach tables
      for a fresh project. Harmless on a project that already has them.
   2. `20260906_today_home.sql` (skip if you ran it for the Today page)
   3. `20260907_habit_pause.sql`
   4. `20260907_cycle_periods.sql`
   5. `20260908_mood_context.sql`
   6. `20260909_user_prefs.sql` — new: goals / active trackers / subjects / flow times
      follow the account
4. Optional: `npx vitest run` → 199 tests.
5. `git add -A && git commit -m "feat: Tier B/C part 1 + profile redesign" && git push`

## What the script does

- **Found:** tells you which earlier kits it can see.
- **Apply:** writes each file only if it differs (CRLF checkouts stay CRLF); a file that is
  neither the shipped version nor any version this branch produced is copied to
  `<name>.before-tier-bc.txt` first.
- Removes the files the branch removed (Lovable duplicates, the flat `src/routes/mood.tsx`,
  the two profile components the redesign replaced) — only when they match a known version.
- **Verify:** greps 24 needles (one per feature) and prints ✔/✖.

If any line shows ✖, send the whole output.
