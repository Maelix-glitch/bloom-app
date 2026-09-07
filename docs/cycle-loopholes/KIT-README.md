# Bloom — Cycle fixes kit (v1)

Two things for `/cycle`, in one script.

**1. Width.** The page was capped at 1060 px and centred in a wide gap. It now
runs edge to edge inside the app shell with the same gutters as Today and Mood
(20 / 32 / 40 px). The design gallery (`/cycle-styles`) keeps its centred column.

**2. Period-logging loopholes.** The record now understands the person instead
of assuming:

- *"First day of a period"* is pre-ticked **only** when the date plausibly
  starts a cycle. A bleed on day 3 of a period offers **"Same period, still
  going"** (extends it) — it no longer creates a 2-day "cycle".
- *"None"* logged on day 2+ of an open period offers **"The period ended early
  — record ⟨yesterday⟩ as its last day"**. Untick if it's just a quiet day.
- A **Check-ins** card under the pattern strip asks what the record needs, one
  or two questions at a time, each with Yes / No / Not now:
  - *"Bleeding stopped on day 3 — did your period end early?"*
  - *"You logged bleeding the day after your period ended — did it continue?"*
  - *"Bleeding on 5 Sep — the same period, or a new one?"*
  - *"Bleeding logged from 12 Aug — was that a period starting?"*
  - *"Day 10 since your period started — has it finished?"*
  - *"Your period was due 3 days ago — has it started?"*
  - *"48 days between two starts — was a period missed?"*
  Answers are remembered (never asked twice); *Not now* parks a question for
  two days; every question disappears by itself once the record no longer
  needs it.
- **Undo** (8 s) for delete, "Clear this day" and "Clear all data".
- **Spotting** is a real option that never starts a period and survives sync.
- Softer walls: bleeds up to 30 days save (a note past 10); dates two years
  back save with a "check the year" note; an end date can't run into the next
  logged period.

The complete numbered list — **103 loopholes, each with its protection** — is
in `REPORT.md` in this folder (the script also copies it to
`docs/cycle-loopholes/REPORT.md` in your repo).

## Apply (Windows, PowerShell or cmd)

```
cd "C:\Users\Windows 11 Pro\Documents\trae_projects\bloom-app\chronos-feel"
node "C:\Users\Windows 11 Pro\OneDrive\Desktop\bloom-cycle-fixes\bloom-cycle-fixes\apply-cycle-fixes.mjs"
```

(Windows' unzip usually double-nests the folder, hence
`bloom-cycle-fixes\bloom-cycle-fixes\`. If it landed elsewhere, point the second
path at wherever `apply-cycle-fixes.mjs` is.)

The script first prints **Found:** — one line per problem saying whether your
tree still has it (`→`) or already has the fix (`✔`). Then **Apply:** with
`✔ added …` / `✔ updated …` lines, then **Verify:** with every line `✔`, then
`Done.` If anything prints `✖`, send me the whole output.

It is safe to run twice (a second run makes no edits), and it never silently
overwrites a file you changed yourself — an unexpected version is kept beside
the new one as `<name>.before-cycle-fixes.txt` and the script tells you so.

It does not depend on the Mood or Today kits, and it does not touch the
Supabase schema (spotting was already allowed in `cycle_entries.flow`).

## Then

1. **Stop the dev server and start it again** (`npm run dev`). Vite regenerates
   `src/routeTree.gen.ts` on start — commit that file too.
2. Open `/cycle` and hard-refresh once (**Ctrl+F5**).
3. Try it: with a period logged 2 days ago, pick **Medium** on today — the form
   says *"Day 3 of the period that started …"* and ticks *"Same period, still
   going"*. Pick **None** instead — it offers *"The period ended early — record
   … as its last day"*. If your record already has an open period past its
   usual length, or a late one, the Check-ins card is there on load.
4. Optional: `npx vitest run` — 86 tests, 42 of them new
   (`src/lib/cycle/reconcile.test.ts`, `src/lib/cycle/predict.test.ts`).
5. Commit:
   `git add -A && git commit -m "feat(cycle): full-width page + period check-ins that close the logging loopholes" && git push`

## If it still looks the same

- The script's **Found:** block said `✔` for everything → the code is already
  right; the running app is stale. Stop `npm run dev`, start it again, Ctrl+F5.
- The page is still narrow → `src/styles/cycle2.css` is served as a static URL
  (`?url`); a hard refresh is needed for the browser to drop the old copy.
- No Check-ins card → that's expected when the record has nothing to ask
  about (closed period, on time, no unexplained bleeding). It appears when
  there is a real question.
- A `✖` line → send me the whole output.

## Files

New: `src/lib/cycle/reconcile.ts`, `src/lib/cycle/reconcile.test.ts`,
`src/lib/cycle/predict.test.ts`, `src/components/ci/CheckIns.tsx`,
`src/components/ci/UndoToast.tsx`, `docs/cycle-loopholes/REPORT.md`.

Replaced (byte-compared, backed up if changed locally): `src/lib/cycle/predict.ts`,
`src/lib/cycle/dayLogs.ts`, `src/lib/cycle/periodStore.ts`,
`src/hooks/usePeriodLog.ts`, `src/components/ci/LogPanel.tsx`,
`src/components/ci/CycleIntelligence.tsx`, `src/components/ci/HistoryTable.tsx`,
`src/components/ci/SyncLine.tsx`, `src/styles/cycle2.css`,
`src/routes/cycle-styles.tsx`, `src/lib/cycle/cycleCloud.test.ts`.
