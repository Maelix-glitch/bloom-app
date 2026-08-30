# Where to paste — exact folder map

Your project root is the folder that contains `package.json`, `vite.config.ts`
and `src/`. Everything below is written from there.

## The one command

Unzip `bloom-cycle-page.zip`, then from **your project root**:

```bash
# macOS / Linux — this MERGES into src/ (nothing else is touched)
cp -R /path/to/bloom-cycle-page/src/. src/
```

```bat
:: Windows
xcopy /E /Y /I "C:\path\to\bloom-cycle-page\src" "src"
```

`new` = create it · `replace` = overwrite the file already there.

## 1. `src/routes/` — the pages
| `src/routes/cycle-classic.tsx` | new |
| `src/routes/cycle-styles.tsx` | new |
| `src/routes/cycle.tsx` | **replace** |

## 2. `src/components/ci/` — the whole redesign
| `src/components/ci/AnalyticsCards.tsx` | new |
| `src/components/ci/Atmosphere.tsx` | new |
| `src/components/ci/CycleDial.tsx` | new |
| `src/components/ci/CycleHeatmap.tsx` | new |
| `src/components/ci/CycleIntelligence.tsx` | new |
| `src/components/ci/DayLogInsights.tsx` | new |
| `src/components/ci/HistoryTable.tsx` | new |
| `src/components/ci/InsightsPanel.tsx` | new |
| `src/components/ci/LogPanel.tsx` | new |
| `src/components/ci/PhaseWave.tsx` | new |
| `src/components/ci/PredictionsCard.tsx` | new |
| `src/components/ci/RhythmChart.tsx` | new |
| `src/components/ci/SignatureStrip.tsx` | new |
| `src/components/ci/SymptomBloom.tsx` | new |
| `src/components/ci/SymptomPhaseGrid.tsx` | new |
| `src/components/ci/SyncLine.tsx` | new |
| `src/components/ci/TipsCard.tsx` | new |
| `src/components/ci/VitalDials.tsx` | new |
| `src/components/ci/motion.tsx` | new |
| `src/components/ci/primitives.tsx` | new |
| `src/components/ci/useMeasuredWidth.ts` | new |

## 3. `src/components/` — the rest
| `src/components/cycle/BloomCycleAI.tsx` | **replace** |
| `src/components/cycle/CycleCalendar.tsx` | **replace** |
| `src/components/cycle/CycleHero.tsx` | **replace** |
| `src/components/cycle/CycleHistory.tsx` | **replace** |
| `src/components/cycle/CycleLengthSheet.tsx` | **replace** |
| `src/components/cycle/CycleOrbit.tsx` | **replace** |
| `src/components/cycle/CycleRhythm.tsx` | **replace** |
| `src/components/cycle/CycleRoad.tsx` | **replace** |
| `src/components/cycle/CycleTimeline.tsx` | **replace** |
| `src/components/cycle/Insights.tsx` | **replace** |
| `src/components/cycle/Logs.tsx` | **replace** |
| `src/components/cycle/PatternInsights.tsx` | **replace** |
| `src/components/cycle/PhasesGuide.tsx` | **replace** |
| `src/components/cycle/TodaySurface.tsx` | **replace** |
| `src/components/cycle/parts.tsx` | **replace** |
| `src/components/mood/primitives.tsx` | **replace** |
| `src/components/ui/dialog.tsx` | **replace** |
| `src/components/ui/sheet.tsx` | **replace** |
| `src/components/BloomHeader.tsx` | **replace** (adds the Trackers link) |

## 4. `src/lib/cycle/` — intelligence + Supabase sync
| `src/lib/cycle/assistant.ts` | **replace** |
| `src/lib/cycle/dayLogs.ts` | new |
| `src/lib/cycle/engine.ts` | **replace** |
| `src/lib/cycle/intelligence.ts` | **replace** |
| `src/lib/cycle/motion.ts` | **replace** |
| `src/lib/cycle/palette.ts` | **replace** |
| `src/lib/cycle/patterns.ts` | **replace** |
| `src/lib/cycle/periodStore.ts` | new |
| `src/lib/cycle/predict.ts` | new |
| `src/lib/cycle/presentation.ts` | **replace** |
| `src/lib/cycle/storage.ts` | **replace** |
| `src/lib/cycle/themes.ts` | new |
| `src/lib/cycle/types.ts` | **replace** |

## 5. `src/lib/`
| `src/lib/mood/types.ts` | **replace** |
| `src/lib/supabase.ts` | **replace** — now lazy, a missing env var no longer blanks the route |
| `src/lib/utils.ts` | **replace** |

## 6. `src/hooks/`
| `src/hooks/useCycleSystem.ts` | **replace** |
| `src/hooks/usePeriodLog.ts` | new |

## 7. `src/styles/`
| `src/styles/cycle.css` | **replace** |
| `src/styles/cycle2.css` | new |

## 8. Repo root

| File | Notes |
| --- | --- |
| `.env.example` | copy to `.env.local` and fill in `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |

## Do NOT paste or edit

| File | Why |
| --- | --- |
| `src/routeTree.gen.ts` | generated — it rewrites itself when the dev server starts |
| `package.json` | nothing new to install |
| `vite.config.ts`, `tsconfig.json` | your `@/` → `src/` alias is already there |

## After pasting

```bash
npm install
npm run dev
```

- `http://localhost:3000/cycle` — the redesign
- `http://localhost:3000/cycle-styles` — all eight themes, pick one
- `http://localhost:3000/cycle-classic` — the old page, kept for comparison

If `/cycle` 404s, restart the dev server so `routeTree.gen.ts` regenerates.

## Supabase

Same table and conflict key as the old page: `cycle_entries`, upsert on
`(profile_id, date)`, `profile_id` = the signed-in user's id. The page draws from
localStorage first, pulls and reconciles on load (newer `updated_at` wins), then
pushes your changes ~0.7s later. If the table can't be reached, the day stays on
the device and the header says so.
