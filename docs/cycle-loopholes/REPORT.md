# Cycle page — every period-logging loophole, and what now protects against it

**Branch:** `arena/01a0702b-bloom-app` · **Page:** `/cycle` · **Date:** 7 Sep 2026

> The goal you set: *"the cycle is inherently different for each person, so the system must
> always give free margins — understand the user."* Everything below follows one rule:
> **the record never silently assumes; it either asks a plain question, or it saves what you
> said and tells you what it noticed. Nothing that can be a real body is refused.**

---

## 0. What changed, in one screen

| Before | After |
| --- | --- |
| Page capped at 1060 px, centred in a wide gap | Full width inside the app shell, same gutters as Today / Mood (20 / 32 / 40 px) |
| Any bleed level auto-ticked **"first day of a period"** — day 3 of a period became a new 2-day "cycle" | Pre-ticked **only** when the date plausibly starts a cycle. Day ≥ 2 offers **"Same period, still going"**; "None" inside an open period offers **"The period ended early — record … as its last day"** |
| Nobody ever asked whether a period ended early, continued, or started | **Check-ins** card under the pattern strip: *"Bleeding stopped on day 3 — did your period end early?"* · *"You logged bleeding the day after your period ended — did it continue?"* · *"Bleeding on 5 Sep — the same period, or a new one?"* · *"Was that a period starting?"* · *"Day 10 — has it finished?"* · *"Due 3 days ago — has it started?"* · *"Was a period missed?"* — each with Yes / No / Not now |
| Delete and "Clear all" were final | 8-second **Undo** strip; clear-all restores periods **and** daily log together |
| Bleed > 15 days refused; entries > 2 years back refused | 15 → 30-day hard ceiling with a gentle note past 10; two-year wall is now a warning (ten-year wall stays) |
| "Spotting" didn't exist; cloud rows with spotting lost their flow | Spotting is a real option that **never** starts a period and survives the cloud round-trip |
| End date could run into the next logged period | Refused with a specific message |
| Sync line said "saved to your account" (only the daily log is) | Says plainly: *daily log saved to your account · period dates stay on this device* |

Screenshots: `screenshots/before-1920.jpg`, `after-1920.jpg`, `checkin-ended-early-1440.jpg`,
`form-none-closes-period.jpg`, `form-bleed-extends-period.jpg`, `undo-toast.jpg`,
`checkin-phone-390.jpg`.

---

## 1. How the protection works (the design)

Three layers, in order of how much they interrupt:

1. **The form understands the day before you save** — `classifyBleedDay()` in
   `src/lib/cycle/reconcile.ts` says what a bleed on that date most likely is: *inside* a period
   (day N), *adjacent* (1–3 days after it ended), *soon after* (< 15 days since the last start —
   can't be a cycle) or *new*. The form's defaults and its one-line context follow from that.
2. **Soft warnings save anyway** — `assessLogDraft()` in `src/lib/cycle/predict.ts` returns
   `errors` (the few real walls) **plus** `warnings` (too close to the last start, earlier than
   your usual, long bleed, very old date). The entry is saved and the note stays under the field.
3. **Check-ins after the fact** — `reconcile()` reads the period entries and the daily log
   *together* and asks about every disagreement it finds. Every question:
   - has a **primary Yes** that performs one concrete edit (set the last day / add the period /
     open the form on that date), a **No** that dismisses forever for that situation, and
     **Not now** that parks it for 2 days;
   - is **remembered** per (question · entry · date) in `bloom.cycle.checkins.v1`, so the same
     thing is never asked twice, across reloads and tabs;
   - **disappears by itself** the moment the record stops needing it (answered, edited, deleted);
   - never blocks the page — at most two are shown, the rest queue.

Nothing here diagnoses. The two "medical" notes (long bleed, irregularity) point at ordinary causes
first and suggest a clinician only if something is *new for you*.

---

## 2. The exhaustive list

Legend — **Protection kind:** `ask` (check-in question) · `default` (form pre-fill / tick) ·
`warn` (saves, with a note) · `refuse` (hard validation, only where no real body can produce it)
· `engine` (maths in `analyzeCycle`) · `ui` (display/undo/copy) · `store` (persistence).

### A. The day-to-day period being lived

| # | Loophole | Protection | Where |
| --- | --- | --- | --- |
| 1 | **Period ends early** (e.g. day 4 of a usual 5) — the record kept assuming the average length | `ask` *"Bleeding stopped on day 3 — did your period end early?"* → Yes sets the last day to the day before the first "None" · *No, it's continuing* · *Not now* | `reconcile.ts` §1a; test `ended early` |
| 2 | Same as #1 but the entry already **had a last day** later than reality | `ask` same question, body says *"You had the last day down as …"* | `reconcile.ts` §1a |
| 3 | "None" logged **on a quiet day in the middle** of a period, then bleeding resumed | Not asked as "ended early" (a later bleed suppresses it) — the *continued / same-period* questions cover it instead | `reconcile.ts` §1a `bleedAfter` guard; test `does not ask when bleeding resumes` |
| 4 | **Period continued** past its recorded last day (bleeding logged the next day) | `ask` *"You logged bleeding the day after your period ended — did it continue?"* → Yes moves the last day to the end of the run · *No — that was spotting* · *No — a new period started* (opens the form on that date) | `reconcile.ts` §1b; tests `continued` |
| 5 | Bleeding resumed **2–3 days** after the recorded end | Same question, worded *"Bleeding again N days after your period ended — was it the same one?"* | `reconcile.ts` §1b (`samePeriodWithinDays = 3`) |
| 6 | Run after the end spans several days — only the first was recognised | Extends to the **end of the whole run** (tolerating one unlogged day) | `bleedRunFrom()`; test `extends to the end of the run` |
| 7 | **No last day ever logged** and the period ran well past the usual length | `ask` *"Day 10 since your period started — has it finished?"* → Yes (guess = last logged bleed or start + usual − 1) · *Pick the last day* (opens Edit) · *Still going* (2-day snooze) · *Don't ask about this one* | `reconcile.ts` §1c (`usual + 2` grace) |
| 8 | Open period still inside its usual length — must not nag | No question until `usual + 2` days | test `does not nag about an open period` |
| 9 | **Very long bleed** (daily log says bleeding > 10 days in a row) | `ask` (attention tone) *"N days of bleeding logged so far"* — recorded as logged; suggests a clinician only if it's new for you. One "Understood" button | `reconcile.ts` §1d |
| 10 | Logging **"None" in the form on day ≥ 2** of an open period did nothing to the period | `default` a visible tick *"The period ended early — record ⟨yesterday⟩ as its last day — untick if it's just a quiet day"*; Save closes it | `LogPanel.tsx` `canCloseHere`; screenshot `form-none-closes-period.jpg` |
| 11 | "None" on day 1 itself (the start day) | No close offered — you can't end a period the day it starts; edit or delete instead | `LogPanel.tsx` `dayOfPeriod >= 2` |
| 12 | "None" logged **after** the recorded last day (already closed) | Nothing to close → no tick shown; nothing changes | `LogPanel.tsx` `nearPeriodEnd >= date` |
| 13 | The **ended-early tick uses the wrong day** when the recorded end is earlier than the "None" day | Guarded: only offered when the recorded end is on/after the "None" day | `LogPanel.tsx` `canCloseHere` |

### B. Starting a period (the main historical loophole)

| # | Loophole | Protection | Where |
| --- | --- | --- | --- |
| 14 | **Any bleed level auto-ticked "first day of a period"** — day 2/3 of a period created a bogus new entry and an implausible < 15-day gap | `default` pre-ticked **only** when `classifyBleedDay()` says *new* (≥ 15 days since the last start and not right after a period) or it *is* the start day | `LogPanel.tsx` `pickBleed`; tests `classifyBleedDay` |
| 15 | Bleed on **day ≥ 2 inside an open period** (no last day yet) | `default` tick *"Same period, still going — move its last day to ⟨date⟩"*; the "first day" line explains *"Not ticked, because this looks like day 3 of a period you already logged"* | `LogPanel.tsx` `canExtendHere`; screenshot `form-bleed-extends-period.jpg` |
| 16 | Bleed on a day **inside a period that already has a later last day** | Just a day log — no start, no extend (nothing to change) | `classifyBleedDay` → `inside` + `nearPeriodEnd >= date` |
| 17 | Bleed **1–3 days after** the recorded last day | `default` extend tick (*"untick if this is spotting between periods"*), not a new start | `classifyBleedDay` → `adjacent` |
| 18 | Bleed **4–14 days after the last start** — too soon to be a cycle | Not pre-ticked; context line *"N days after your last period started — too soon to count as a new cycle, so if you log it as one the gap is left out of your average"*; if ticked anyway → `warn` and saved | `classifyBleedDay` → `soon-after`; `assessLogDraft` gap warning |
| 19 | New start **noticeably earlier than your own average** (< 75 % of it) | `warn` *"N days after your last start — noticeably earlier than your usual M. If this was spotting rather than a period, untick …"* — saved | `assessLogDraft` |
| 20 | **Same start date twice** | `refuse` with a pointer to Edit (only exact duplicate — a genuine wall) | `validateLogDraft` |
| 21 | Start **inside another period's span** | `refuse` with the span named | `validateLogDraft` |
| 22 | Ticking "first day" **on a spotting day** | `refuse` with an explanation — spotting alone doesn't start a period; the tick isn't even shown for spotting/none | `LogPanel.tsx` `isPeriodBleed` |
| 23 | Bleeding logged in the **daily log only** (no period entry) — predictions never moved | `ask` *"Bleeding logged from ⟨date⟩ — was that a period starting?"* → Yes adds the period (start = first day of the run, end = last day if the run is over, flow = strongest) · *No — spotting* · *Not now* | `reconcile.ts` §2b; test `unexplained bleed run` |
| 24 | Daily-log bleed **right after** a period (1–3 days) that isn't the newest entry | `ask` *"Bleeding on ⟨date⟩ — the same period, or a new one?"* → *Same period — ends ⟨date⟩* · *A new period started* (adds it) · *Just spotting* | `reconcile.ts` §2a |
| 25 | Daily-log bleed inside the **implausible window** (< 15 days) and not adjacent | Never proposed as a new period; never silently merged either — shown in the day log as what it is | test `never proposes a new period inside the 15-day window` |
| 26 | Daily-log bleed runs are judged one day at a time | Runs are grouped (≤ 2 quiet days between) and judged by their **first** day | `reconcile.ts` §2 |
| 27 | A run that would make a period **> 28 days long** if merged | Never merged (`maxBleedDays × 2` guard) | `reconcile.ts` |
| 28 | **Future start date** | `refuse` (a period that hasn't happened) | `validateLogDraft` |
| 29 | Start **more than two years back** | Was refused → now `warn` *"check the year"*, saved. Ten years back is still refused (a wrong year, not a memory) | `MAX_YEARS_BACK`; test `allows a two-year-old date` |
| 30 | Start typed as **invalid / empty** | `refuse` with a plain message | `validateLogDraft` |

### C. Ending a period (the "Last day" field)

| # | Loophole | Protection | Where |
| --- | --- | --- | --- |
| 31 | Bleed **> 15 days refused** — real for some bodies | Hard ceiling raised to **30** (`MAX_BLEED_DAYS`); **> 10** days saves with a `warn` and a gentle clinician note | `predict.ts`; test `allows a long-but-real bleed of 12 days` |
| 32 | End **before start** | `refuse` — suggests swapping or clearing | `validateLogDraft` |
| 33 | End **in the future** | `refuse` *"leave it blank until the bleeding stops"* | `validateLogDraft` |
| 34 | End date **runs into the next logged period** (overlapping entries — previously accepted) | `refuse` naming that period | `validateLogDraft`; test `refuses an end date that runs into the next` |
| 35 | End date only settable later via Edit | Now also set by: the "ended early" tick in the day log (#10), the extend tick (#15/#17), and four check-ins (#1, #4, #7, #24) | `usePeriodLog.setPeriodEnd` |
| 36 | Set-end from a check-in when the entry was **deleted meanwhile** | Validation fails gracefully → the question is parked, nothing thrown | `answerCheckIn` `set-end` branch |
| 37 | End kept on disk that is **before its start** (corrupt storage) | Normalised to "no end" on load | `periodStore.normalizeLog` |

### D. Time passing without a word

| # | Loophole | Protection | Where |
| --- | --- | --- | --- |
| 38 | Period **late** — only a passive flag existed | `ask` *"Your period was due N days ago — has it started?"* from 3 days late → *Yes — log the first day* (form opens on today, ticked) · *Not yet* (2-day snooze) · *Don't ask this cycle* | `reconcile.ts` §3 |
| 39 | Late, and the daily log **already shows a bleed** since the last period | Yes button becomes *"Yes — it started ⟨that date⟩"* and opens the form on it | test `offers the bleed already in the daily log` |
| 40 | "Late" asked every day | One id per predicted date; *Don't ask this cycle* silences it until the next prediction | id `late:<periodId>:<nextStart>` |
| 41 | Lateness threshold too tight for irregular cycles | Kept at 3 days after the *weighted* average, and the insight copy names ordinary causes first | `CYCLE_DEFAULTS.lateAfterDays` |
| 42 | **Implausibly long gap** (> 45 days) between two starts — a period probably went unlogged | `ask` *"N days between two starts — was a period missed?"* → *Add one around ⟨midpoint⟩* · *No — it really was that long* (dismiss) · *Not now*; the gap is excluded from the average either way | `reconcile.ts` §4 + `analyzeCycle` anomaly flag |
| 43 | Gap so long it hides **several** periods | Copy says so and each added start re-splits the gap | `analyzeCycle` (> 2 × max) |
| 44 | **Implausibly short gap** (< 15 days) silently averaged | Excluded from the average, flagged in Insights and marked *"Nd — not counted"* in the history table | `analyzeCycle` |
| 45 | Prediction shown as fact after one entry | Generic 28-day placeholder is labelled as such; confidence "none" | `analyzeCycle` `isGeneric` |
| 46 | Confidence inflated by 2 cycles | Confidence tiers: none / low (< 3 cycles or sd > 7) / medium / high (≥ 4 cycles and sd ≤ 3), always with a reason | `analyzeCycle` |
| 47 | Old, no-longer-typical cycles dominate the average | Recency-weighted average over the last 6 plausible cycles | `weightedAverage` |
| 48 | Trend reported from noise | Needs ≥ 4 cycles and ≥ 3 days of drift between halves | `analyzeCycle` trend |
| 49 | "Today" **rolled over at midnight** while the tab stayed open | Clock ticks every minute and on focus / visibility; the form's date follows | `usePeriodLog` tick effect |
| 50 | Timezone / DST off-by-one in date maths | All keys are local `YYYY-MM-DD`; arithmetic is done in UTC on the key (`parseDateKey` / `addDays` / `diffDays`) so a DST day is never 23 h long | `predict.ts` helpers |

### E. Remembering answers (never ask twice, never nag)

| # | Loophole | Protection | Where |
| --- | --- | --- | --- |
| 51 | Same question re-asked after reload / in another tab | Answers persisted in `bloom.cycle.checkins.v1`; **No** = dismissed for that exact situation forever | `periodStore.loadCheckInMemory` |
| 52 | **Not now** silences forever | It snoozes for 2 days, then the question returns if still true | `remember(..., "snooze")`; test `"Not now" parks the question for two days` |
| 53 | A dismissed *"ended early"* stops a **later, different** end from being asked | Ids include the proposed date (`ended-early:<id>:<date>`), so a new situation is a new question | id scheme |
| 54 | Memory grows forever | Pruned on every answer: entries that no longer exist, dates > 400 days old, expired snoozes | `pruneMemory`; test |
| 55 | Corrupt memory JSON breaks the page | Parsed defensively; anything odd → empty memory | `loadCheckInMemory` |
| 56 | Too many questions at once | Most-pressing-first ordering; two shown, *"N more questions once these are answered"* | `CheckIns.tsx` `limit = 2` |
| 57 | Check-in acts on the **styles gallery preview** | Buttons disabled in preview; undo toast not rendered there | `CycleIntelligence` `preview` |

### F. Losing data

| # | Loophole | Protection | Where |
| --- | --- | --- | --- |
| 58 | **Delete an entry** was final after one inline confirm | Confirm kept **plus** 8-second Undo strip that restores it | `usePeriodLog.remove` + `UndoToast` |
| 59 | **Clear all data** wiped periods and the daily log for good | One Undo restores **both** (single snapshot when the two clears happen together) | `clearAll` / `clearDays` snapshot sharing |
| 60 | **Clear this day** in the form was final | Undo strip as well; restored days are re-queued for the account | `removeDay` |
| 61 | Undo restores a day already deleted on the server | Restored dates are marked dirty and pushed again | `undo()` |
| 62 | Two deletes in a row — undo restores the wrong one | Each snapshot has an id; only the latest is kept and restorable | `snapshot.current.id` |
| 63 | Period dates were **device-only and nobody knew** | Sync line now says *"period dates stay on this device"* (and *"sign in to sync your daily log"*); CSV export still covers both | `SyncLine.tsx` |
| 64 | localStorage full / blocked | Writes are try/caught; the session keeps working unpersisted | `periodStore.save*` |
| 65 | Corrupt period rows on disk | `normalizeLog` drops bad rows instead of throwing | `periodStore` |
| 66 | Two tabs editing at once | `storage` event + `bloom:periods-changed` re-read the other tab's write | `usePeriodLog` mount effect |
| 67 | Cloud row newer than device (or vice-versa) | Newer `updatedAt` wins per date; device-newer rows are re-pushed | `mergeDayLists` |

### G. Spotting, flow and the daily log

| # | Loophole | Protection | Where |
| --- | --- | --- | --- |
| 68 | No way to log **spotting** — people logged "Light" and started periods by mistake | "Spotting" is a bleeding option; it **never** pre-ticks a period, never counts in bleed runs, never extends a period | `LogPanel` `BLEEDS`, `isBleed` |
| 69 | Cloud rows with `flow = 'spotting'` **lost their flow** on the way down | `isDayFlow` accepts it; round-trip test added | `periodStore`, `cycleCloud.test.ts` |
| 70 | Spotting inflated the **flow curve** | Excluded from flow samples (score 0.5 shown only as a label) | `dayLogs.analyzeDayLogs` |
| 71 | Legacy import turned a spotting day into a period | Legacy grouping skips `spotting` too | `legacyPeriodCandidates` |
| 72 | Legacy import guessed **"medium"** for unknown flow | Still medium (documented) but only real bleed days form runs, runs need ≤ 2-day gaps, and each candidate is skipped if that start already exists | `legacyPeriodCandidates` |
| 73 | Daily log **future date** | `refuse` | `validateDayLog` |
| 74 | Daily log values out of range (energy, pain, sleep, temperature, > 12 symptoms, notes > 400) | `refuse` with specific messages | `validateDayLog` |
| 75 | Saving an **empty** day | `refuse` *"Pick a bleed level or open the advanced log first"* — unless the save is a close/extend action | `LogPanel.submit` |
| 76 | A bad temperature let the **period half** save while the day failed | Day validated first; nothing written unless both halves are sound | `LogPanel.submit` order |
| 77 | Day log placed in a cycle **before** the first logged start | Placement is reconstructed from the average and **labelled** *"(from your average)"* | `placeDate` `reconstructed` |

### H. Editing an existing entry

| # | Loophole | Protection | Where |
| --- | --- | --- | --- |
| 78 | Editing moved a start **onto** another entry | `refuse` (duplicate / inside-span checks exclude only the entry being edited) | `validateLogDraft(editingId)` |
| 79 | Editing produced an implausible gap silently | Live `warn` under the fields while editing, saved anyway; the gap is excluded from the average | `liveAssessment` |
| 80 | Edit form pre-tick logic fought the day-log reload | The edit effect owns the fields; classification is skipped while editing | `LogPanel` `if (editing) return` |
| 81 | Cancel left half-typed state | Cancel resets bleed, end, notes, ticks, warnings | `LogPanel` cancel button |
| 82 | An entry deleted elsewhere while being edited | Edit state drops automatically | `CycleIntelligence` effect on `logs` |
| 83 | Insight *"Add ⟨date⟩"* opened the form but "first day" wasn't ticked | `pendingStart` ticks it and focuses the date | `LogPanel` pending effect |

### I. What the page shows

| # | Loophole | Protection | Where |
| --- | --- | --- | --- |
| 84 | Open period shown with **no hint** that its length is a guess | History rows now say *"no last day logged"*; the analysis exposes `periodLengthIsLogged` | `HistoryTable` |
| 85 | Excluded gaps hidden from charts | They stay on the rhythm chart as dashed bars and in the table as *"not counted"* | `RhythmChart`, `HistoryTable` |
| 86 | "Late" shown as if certain | Copy: ordinary explanations first; the phase dial says *"Nd past"*; every prediction carries a confidence badge and reason | `PredictionsCard`, `CycleDial` |
| 87 | Medical-sounding certainty | Disclaimer in the footer; long-bleed / irregularity notes say *"if this is new for you"* | `Disclaimer`, `reconcile` copy |
| 88 | Page too narrow on wide screens (1060 px cap) | Full width; gutters match the shell contract; bottom padding clears the phone tab bar | `cycle2.css .ci-shell` |
| 89 | Styles gallery broke when the cap moved | Gallery keeps `.ci-shell--narrow` | `cycle-styles.tsx` |
| 90 | Undo toast hidden behind the phone tab bar / rail | Fixed above the tab bar on phones; centred in the content area (offset by `--app-rail`) on desktop | `cycle2.css .ci-undo` |
| 91 | Reduced-motion users get animations | Check-in / undo animations disabled under `prefers-reduced-motion` | `cycle2.css` |
| 92 | Screen readers miss check-ins / undo | Check-ins are a labelled `<section>`; the undo strip is `role="status" aria-live="polite"` | `CheckIns.tsx`, `UndoToast.tsx` |

### J. Engine constants (the "free margins", all in one place)

| # | Margin | Value | Why |
| --- | --- | --- | --- |
| 93 | Plausible cycle | 15 – 45 days | Outside this a gap is a typo or a missed log, not a cycle — excluded, never averaged |
| 94 | Average window | last 6 plausible cycles, recency-weighted | Your recent body, not your 2019 body |
| 95 | Fallback length | 28 (labelled generic) | Only until one real cycle exists |
| 96 | Luteal assumption | 14 days | Ovulation is counted back from the *next* period because the luteal half is steadier |
| 97 | Fertile window | ovulation − 5 … + 1 | Standard; labelled an estimate |
| 98 | Late after | 3 days | Below that, a normal wobble |
| 99 | Same-period window | ≤ 3 days after the end | A quiet day or two inside one period |
| 100 | Open-period grace | usual length + 2 days | Ask *has it finished?* only past that |
| 101 | Long bleed note | > 10 days (hard wall 30) | Recorded as logged; note, don't refuse |
| 102 | Snooze | 2 days | *Not now* means not now, not never |
| 103 | Memory retention | entries that still exist; dates ≤ 400 days | Nothing accumulates forever |

---

## 3. Files

**New**

- `src/lib/cycle/reconcile.ts` — check-in engine, `classifyBleedDay`, memory helpers (pure; `today` passed in)
- `src/lib/cycle/reconcile.test.ts` — 26 tests (every question, every guard, memory)
- `src/lib/cycle/predict.test.ts` — 16 tests (validator walls, soft warnings, engine facts)
- `src/components/ci/CheckIns.tsx` — the questions card
- `src/components/ci/UndoToast.tsx` — the undo strip

**Changed**

- `src/lib/cycle/predict.ts` — `CYCLE_DEFAULTS` exported; `assessLogDraft()`; `MAX_BLEED_DAYS = 30`, `LONG_BLEED_DAYS = 10`, `MAX_YEARS_BACK = 10`; end-runs-into-next-period rule
- `src/lib/cycle/dayLogs.ts` — `DayFlow` gains `"spotting"`; excluded from the flow curve
- `src/lib/cycle/periodStore.ts` — check-in memory (`bloom.cycle.checkins.v1`); spotting accepted; legacy import skips spotting
- `src/hooks/usePeriodLog.ts` — `checkIns`, `answerCheckIn`, `setPeriodEnd`, `undoable` / `undo` / `dismissUndo`, `UNDO_WINDOW_MS`
- `src/components/ci/LogPanel.tsx` — context-aware defaults, close/extend ticks, live warnings, spotting
- `src/components/ci/CycleIntelligence.tsx` — check-ins card, follow-ups, undo toast, `onSetPeriodEnd`
- `src/components/ci/HistoryTable.tsx` — *"no last day logged"*
- `src/components/ci/SyncLine.tsx` — honest copy about what syncs
- `src/styles/cycle2.css` — full-width `.ci-shell`, `.ci-shell--narrow`, `.ci-checkin*`, `.ci-undo*`, `.ci-note`
- `src/routes/cycle-styles.tsx` — gallery uses `.ci-shell--narrow`
- `src/lib/cycle/cycleCloud.test.ts` — spotting round-trip test

**Unchanged on purpose:** the `CycleAnalysis` shape (Today, Coach, Trackers and the dashboard keep
reading it as before), the legacy `/cycle-classic` page, the Supabase schema (spotting was already
in the column check).

## 4. Verification

- `npx vitest run` — **86 / 86** (43 before)
- `npx tsc --noEmit` — 0 new errors (the 11 pre-existing ones are untouched files)
- `npm run build` — passes
- Headless Chromium at 1920 / 1440 / 390: shell spans the full content width (`220 → 1440` at
  1440 px, previously `540 → 1600` at 1920 px); every check-in above rendered from seeded data;
  Yes on *ended early* wrote `end` and the question did not return in a fresh tab; day-3 bleed
  extended the period instead of adding one; "None" on day 3 closed it; delete / clear-all undone.

## 5. Still open (product decisions, not bugs)

- Period entries are still **device-only**. Syncing them needs a small `cycle_periods` table +
  migration; the check-in memory would go with it. Say the word and I'll add it.
- The **luteal 14-day** assumption and the **15–45** plausibility window are constants, not
  per-person learned values. They are the widest safe defaults; personalising them needs more
  logged cycles than most records have.
