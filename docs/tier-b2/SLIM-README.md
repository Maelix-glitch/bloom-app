# Bloom — Tier B part 2, **slim** kit

**Only the 20 files this tier touched.** Use this one if your checkout is already at the
previous kit (Tier B/C + the profile redesign + premium sheets) — which it is, if you ran
`apply-tier-bc.mjs`.

If you're not sure, use the full **`bloom-tier-b2.zip`** instead: it carries every earlier file
too (160) and brings any checkout up to date in one run. This slim kit **checks first and
refuses to write anything** if the earlier tiers are missing, so you can't break the app by
picking the wrong one.

---

## What's inside

**New (16)**

    public/manifest.webmanifest                     B6  installable
    public/sw.js                                    B6  offline shell + notifications
    src/hooks/useInstallPrompt.ts                   B6  register worker, install prompt
    src/lib/reminders/schedule.ts                   B4  the scheduler (pure)
    src/lib/reminders/schedule.test.ts              B4  12 tests
    src/hooks/useReminders.ts                       B4  permission + delivery
    src/lib/data/exportAll.ts                       B7  one export
    src/lib/data/exportAll.test.ts                  B7  6 tests
    src/hooks/useExportBundle.ts                    B7  gathers the record
    src/lib/data/importPeriods.ts                   B8  parser + preview
    src/lib/data/importPeriods.test.ts              B8  12 tests
    src/components/ci/ImportPeriods.tsx             B8  the import sheet
    src/lib/data/erase.ts                           B9  erase device + account
    src/components/profile/DataSheets.tsx           B7/B4/B9  three sheets
    supabase/migrations/20260910_erase_account.sql  B9  erase_my_data()

**Changed (4)** — small, additive edits; nothing was removed

    src/routes/__root.tsx                  + manifest/theme-color links, worker registration
    src/routes/profile.tsx                 + the three sheets and their rows
    src/components/profile/AccountRow.tsx  + 4 settings rows
    src/components/ci/HistoryTable.tsx     + "Import history" button
    src/components/ci/CycleIntelligence.tsx + mounts the import sheet

Files are written **whole**, not as patches — the script compares by md5 so it can tell an
untouched file from one you edited, which a partial patch can't do. If a file doesn't match
either the previous kit's version or the new one, your copy is kept as
`<name>.before-tier-b2.txt` and nothing is lost.

---

## Run it (VS Code terminal, **Ctrl + `**)

### Windows

    cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
    node "C:\Users\Windows 11 Pro\Downloads\bloom-tier-b2-slim\bloom-tier-b2-slim\apply-slim.mjs"

### macOS / Linux

    cd ~/path/to/bloom-app/chronos-feel
    node ~/Downloads/bloom-tier-b2-slim/apply-slim.mjs

It prints a prerequisite check, then what it applied, then 19 ✔/✖ verify lines.

## Then

1. `npm install` — no new packages.
2. `npm run dev`, hard-refresh once (Ctrl + F5).
3. **Supabase → SQL editor: `migrations/20260910_erase_account.sql`** — the only new
   migration. Everything else ran with the last kit. Only the Erase button needs it;
   B4/B6/B7/B8 need no SQL at all.
4. Optional: `npx vitest run` → **229 tests / 20 files**.
5. `git add -A && git commit -m "feat: Tier B part 2" && git push`

## Where the new things are

| What | Where |
|---|---|
| Reminders | Profile → *Account & data* → **Remind me** → allow → **Show me one** |
| Install | the same sheet, or the browser's install button |
| Download everything | Profile → **Download everything** |
| Import history | Cycle → *Every entry you've logged* → **Import history** |
| Erase everything | Profile → **Erase everything** (type `erase everything`) |

Notifications and install need **https or localhost** — `npm run dev` is fine. On iPhone,
reminders fire only after Add to Home Screen.
