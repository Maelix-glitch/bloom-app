# Where to paste — the trackers page

Your project root is the folder that contains `package.json`, `vite.config.ts`
and `src/`. Everything below is written from there.

## The one command

Unzip `bloom-trackers-page.zip`, then from **your project root**:

```bash
# macOS / Linux — this MERGES into src/ (nothing else is touched)
cp -R /path/to/bloom-trackers-page/src/. src/
```

```bat
:: Windows
xcopy /E /Y /I "C:\path\to\bloom-trackers-page\src" "src"
```

`new` = create it · `replace` = overwrite the file already there.

## 1. Run this SQL once (Supabase → SQL editor)

`supabase/migrations/20260830120000_tracker_days.sql` creates the table the page
syncs to — **`tracker_days`**, one row per person per day, unique on
`(profile_id, date)`, with row-level security so a person only ever sees their
own days. Until it exists the page keeps working from the device and the header
says so.

## 2. `src/routes/` — the pages

| `src/routes/trackers.tsx` | new | `/trackers` |
| `src/routes/trackers-styles.tsx` | new | `/trackers-styles` — the design picker |

## 3. `src/components/tk/designs/` — the four designs

| `src/components/tk/designs/TrackersDesign.tsx` | new | the switcher `/trackers` renders |
| `src/components/tk/designs/Atlas.tsx` | new | **the default** — compass, territories, route |
| `src/components/tk/designs/Ledger.tsx` | new | bookkeeper's sheet |
| `src/components/tk/designs/Strip.tsx` | new | filmstrip bands |
| `src/components/tk/designs/shared.tsx` | new | disclaimer, quick-add, sync note |

## 4. `src/components/tk/` — the parts

| `src/components/tk/AdvancedCard.tsx` | new | the "bright vs low days" read |
| `src/components/tk/Correlations.tsx` | new | how the six move together |
| `src/components/tk/HistoryTable.tsx` | new | the day-by-day table |
| `src/components/tk/LogPanel.tsx` | new | the entry form |
| `src/components/tk/StudyMap.tsx` | new | subject × time grid |
| `src/components/tk/TrackersPage.tsx` | new | the earlier "Console" design, kept as a fourth option |
| `src/components/tk/DayDial.tsx`, `Ring.tsx`, `SeriesBars.tsx`, `Sparkline.tsx`, `StreakBeads.tsx`, `TodayStrip.tsx`, `ConsoleRow.tsx`, `icons.tsx` | new | small parts |

## 5. `src/hooks/` and `src/lib/`

| `src/hooks/useTrackers.ts` | new | the store — device first, syncs to the table |
| `src/lib/trackers/core.ts` | new | `DayEntry`, validation, the six trackers |
| `src/lib/trackers/store.ts` | new | localStorage read/write |
| `src/lib/trackers/trackerCloud.ts` | new | **the Supabase layer** — pull, push, delete, merge |
| `src/lib/supabase.ts` | **replace** | lazy client — a missing env var no longer blanks a route |
| `src/lib/utils.ts` | **replace** | `cn()` helper |
| `src/hooks/usePeriodLog.ts`, `src/lib/cycle/{predict,dayLogs,periodStore,themes,cycleCloud}.ts` | new | shared with the cycle page |
| `src/components/BloomHeader.tsx` | **replace** | adds the Trackers link |
| `src/components/ci/{Atmosphere,motion,primitives}.tsx` | new | shared shell parts |

## 6. `src/styles/`

| `src/styles/trackers2.css` | new | one stylesheet for all four designs |
| `src/styles/trackers.css` | new | the older Console styling |

## 7. Repo root

| File | Notes |
| --- | --- |
| `.env.example` | copy to `.env.local`, fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |

## Do NOT paste or edit

| File | Why |
| --- | --- |
| `src/routeTree.gen.ts` | generated — it rewrites itself when the dev server starts |
| `package.json` | nothing new to install unless you want the tests (`jsdom`, `@testing-library/react`) |
| `vite.config.ts`, `tsconfig.json` | your `@/` → `src/` alias is already there |

## After pasting

```bash
npm install
npm run dev
```

- `http://localhost:3000/trackers` — Atlas, the default
- `http://localhost:3000/trackers-styles` — Atlas / Ledger / Strip / Console

If `/trackers` 404s, restart the dev server so `routeTree.gen.ts` regenerates.

## How the sync behaves

The device is the source of truth for drawing: the page reads localStorage,
renders immediately, then pulls the table and reconciles — on any date it has
both copies of, the newer `updated_at` wins; dates held on only one side are
kept; anything newer here is pushed straight back up. Edits go up ~0.7s after
you stop typing, deletes propagate as deletes, and a failed push puts the dates
back in the queue so the retry doesn't lose them. The header always tells you
which of those states you're in — `saved`, `saving…`, `not signed in`, or
`couldn't reach your account, safe on this device`.
