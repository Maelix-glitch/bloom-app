# Bloom — Tier B part 2 kit

One script brings your checkout up to the branch tip — every phase so far (metrics modal fix,
Today home + habits + rail, Add-habit dialog, Mood pages, full-width /cycle with check-ins,
all of Tier A, all of Tier B part 1 and Tier C, the redesigned profile and the premium sheets)
**plus** the five items that were still open:

| | |
|---|---|
| **B4** | Reminders that actually fire — habits at their time, "period expected in ~2 days" / "N days late", the fertile window, and a "nothing logged today" nudge |
| **B6** | Bloom installs on the phone — real manifest, offline shell, in-app "Add to home screen" |
| **B7** | **Download everything** — one JSON with habits, logs, trackers, mood, periods, cycle days, check-ins, prefs and the profile |
| **B8** | **Import period history** — paste or drop a file from another app, with a preview before anything is written |
| **B9** | **Erase everything** — this device *and* the account, behind a typed confirmation |

Safe to run on a checkout that already has the earlier kits: files that already match are
skipped, and any file you edited yourself is kept as `<name>.before-tier-b2.txt`.

`REPORT.md` in this folder explains each item; `WHAT-IS-MISSING.md` is the audit it works
through; `REPORT-tier-b-c.md` is the previous tier's report for reference.

---

## Apply — VS Code

Open the repo folder in VS Code, then open a terminal (**Ctrl + `**) and run:

### Windows (PowerShell or cmd)

    cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
    node "C:\Users\Windows 11 Pro\OneDrive\Desktop\bloom-tier-b2\bloom-tier-b2\apply-tier-b2.mjs"

(Windows unzips into a double-nested folder — keep the quotes and the full path.)

### macOS / Linux

    cd ~/path/to/bloom-app/chronos-feel
    node ~/Downloads/bloom-tier-b2/apply-tier-b2.mjs

The script prints what it **Found**, what it **Applied**, and a **Verify** list of 31 ✔/✖
checks — one per feature. If any line shows ✖, send me the whole output.

---

## Then

1. **`npm install`** — no new packages; the lockfile may refresh.
2. Stop the dev server, then **`npm run dev`**, and hard-refresh once (**Ctrl + F5**).
   The dev server regenerates `src/routeTree.gen.ts` — commit that file too.
3. **Supabase → SQL editor** — run the files in `migrations/` in this order (each once; all are
   idempotent and safe to re-run). **Skip any you have already run** — only the last is new:

   | # | file | for |
   |---|------|-----|
   | 1 | `20260909_core_tables.sql` | **first on a fresh project** — profiles, mood_entries, coach tables |
   | 2 | `20260906_today_home.sql` | tracker_days, habits, habit_logs, cycle_state |
   | 3 | `20260907_habit_pause.sql` | habit pause / archive columns |
   | 4 | `20260907_cycle_periods.sql` | cycle_periods + tombstones |
   | 5 | `20260908_mood_context.sql` | mood_entries.context |
   | 6 | `20260909_user_prefs.sql` | user_prefs (goals / active trackers / subjects / flow times) |
   | 7 | **`20260910_erase_account.sql`** | **new** — `erase_my_data()` for B9 |

   B4, B6, B7 and B8 need **no** migration. Everything except the erase button works before
   you run number 7.
4. Optional: **`npx vitest run`** → **229 tests / 20 files**.
5. `git add -A && git commit -m "feat: Tier B part 2" && git push`

---

## Where to find the new things

| What | Where |
|---|---|
| **Reminders** | Profile → *Account & data* → **Remind me** → allow → **Show me one** |
| **Install** | the same sheet, or your browser's install button in the address bar |
| **Download everything** | Profile → *Sharing & data* → **Download everything** (counts shown first) |
| **Import history** | Cycle → *Every entry you've logged* → **Import history** |
| **Erase everything** | Profile → *Sharing & data* → **Erase everything** (type `erase everything`) |

**Notifications and install need `https` or `localhost`.** `npm run dev` on localhost is fine;
a preview URL over plain http will not offer them. On iPhone, reminders only fire once Bloom
has been added to the home screen (Share → Add to Home Screen) — the sheet says so.

---

## What the script does

- **Found:** tells you which earlier kits it can see in your tree.
- **Apply:** writes each file only if it differs (CRLF checkouts stay CRLF); a file that is
  neither the shipped version nor any version this branch produced is copied to
  `<name>.before-tier-b2.txt` first.
- Removes the files the branch removed — only when they match a known version.
- **Verify:** greps 31 needles (one per feature) and prints ✔/✖.

## Rebuilding this kit

    python3 docs/tier-b2/make-kit.py           # or: python3 docs/tier-b2/make-kit.py <sha>

Cuts the zip from git history against the shipped commit, so the result is always exactly
what is on the branch.
