# Cycle Intelligence — the canonical model

One engine, one result, one source of truth.

```
store records ──► buildCanonicalCycle()            src/lib/cycle/canonical.ts
                    ├─ toCycleRecord()   normalise  src/lib/cycle/intel/record.ts
                    ├─ analyseCycle()    compute    src/lib/cycle/intel/analyse.ts
                    └─ toCycleAnalysis() project    src/lib/cycle/canonical.ts
                                   │
                                   ├─► IntelligenceResult  (brief, insights, backtest, …)
                                   └─► CycleAnalysis       (dial, wave, cards, charts, history)
```

Every view — overview, calendar, dial, phase wave, phase cards, rhythm chart,
heatmap, comparison, brief, history — renders from that single call. No
component calls the analyser, re-derives a prediction or keeps its own copy of
"today's phase"; `src/lib/cycle/canonical.test.ts` fails if one starts to.
The legacy `analyzeCycle` in `src/lib/cycle/predict.ts` is kept only for the
design-gallery route (`/cycle-styles`) and for its date/number formatting
helpers; it no longer feeds a user-facing prediction.

Editing or deleting an entry rebuilds the record, so the baseline, forecast,
phase, phase windows, forward cycles, brief, insights, comparison and history
table all change together in the same render. Nothing is cached across calls.

## Statistical thresholds and why they exist

| Threshold | Value | Why |
| --- | --- | --- |
| Plausible minimum interval | **15 days** | A start-to-start interval shorter than ~2 weeks is almost always two separate bleeds logged as past periods — a mid-cycle bleed, a spotting day, or a duplicate entry — rather than a completed cycle. Keeping it would drag the median towards a length the person never had. |
| Plausible maximum interval | **45 days** | Published clinical descriptions of a "normal" cycle span roughly 21–35 days, and 45 days sits far into the tail. A gap beyond that is far more often a missed log than a genuine 50-day cycle, so it is not used to shift the typical length. 45 is also the point at which a forecast stops being useful planning information. |
| Unusual interval ceiling | **45 days** | Intervals above it are `unusual`. They are *retained* in `baseline.intervals` and surfaced as a change finding, but excluded from the median, IQR, MAD and variability. |

Nothing is deleted or rewritten. `baseline.intervals` keeps every observed gap,
`baseline.unusual` lists the ones set aside, and the History view keeps the raw
entries. A long gap is reported as a long gap and a possible missed log, never
as a condition — the engine has no diagnostic vocabulary and must not acquire
one.

Other sample-size guards:

- **Cycle-length statistics** need at least two starts (one interval). With one
  start there is a cycle day but no length, so no forecast is shown.
- **Forecast status** is `none` → `preliminary` (one interval, ±4 days) →
  `personal` (two or more intervals, window from the person's own spread).
- **Symptom patterns** need three cycles carrying daily records, a symptom in at
  least two of them, and at least three occurrences before any pattern is named.
- **Phase averages** compare energy/mood only once a phase has three
  observations, and only report a "high"/"low" phase when the gap is ≥ 0.5.
- **Change detection** needs four intervals (length) or five (variability), and
  requires the shift to exceed a stated margin before it is mentioned.
- Missing daily records count as *missing*, never as "no symptom".

## What confidence means

`confidence.score` is a **0–100 heuristic index**, not a calibrated probability
and not a confidence interval. 85/100 does not mean "85% likely to start
tomorrow". It is a bounded index of how much evidence exists for this person:

| Band | Score | Meaning |
| --- | --- | --- |
| `none` | 0–19 | No usable interval yet |
| `low` | 20–44 | One or two intervals, or high spread |
| `moderate` | 45–69 | Several intervals, moderate spread or a mixed backtest |
| `good` | 70–100 | Many intervals, low spread, backtest landing close |

The UI leads with the band label and prints the number only as an index. The
actual date range — `forecast.next.from` to `forecast.next.to` — is the thing
that carries the uncertainty, and it is what every view displays.

## Backtesting

`runBacktest` replays the record chronologically: the prediction for target
`i` uses only `starts.slice(0, i)`, so no future information leaks in. Errors
are signed (`errorDays > 0` means the cycle ran longer than predicted).

The backtest measures **this model against this person's own history**. It is a
self-consistency check, not evidence of real-world predictive accuracy. The
fixtures in the test suite are synthetic; passing them proves the arithmetic,
not that Bloom can predict a period in advance.

## Known limits

- Rendered visual verification (desktop and mobile screenshots) has not been
  completed for this branch; treat layout changes as unverified until reviewed
  in a browser.
- Phase boundaries are an estimate from the median cycle length. They are
  labelled `estimated` and are not evidence that ovulation occurred.
