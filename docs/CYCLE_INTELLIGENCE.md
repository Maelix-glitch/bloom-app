# Cycle Intelligence

The `/cycle` page rebuilt around a simple idea: log the day a period starts, and
everything else on the page is _computed from your own record_ — predictions,
how much to trust them, your current phase, and what tends to help.

## Routes

| Route            | What it is                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `/cycle`         | The Cycle Intelligence page (new).                                                                       |
| `/cycle-styles`  | Design gallery: five directions for the same page, previewed on real components, with an "apply" switch. |
| `/cycle-classic` | The previous version of the page, kept for comparison.                                                   |

## The pure core — `src/lib/cycle/predict.ts`

`analyzeCycle(logs, today, options?)` is a pure function. No React, no DOM, no
storage, no `Date.now()` — the same input always gives the same output, so it can
be lifted into any frontend, worker or edge function unchanged. Tests live in
`src/lib/cycle/predict.test.ts` (39 cases, `npm test`).

What it does:

- **Gaps** between consecutive logged start dates are the raw cycle-length history.
- **Plausibility**: gaps of 15–45 days count as cycles. Shorter or longer gaps are
  excluded from the average but _kept visible and flagged_ — a missed log or a
  mistyped date, not a real cycle.
- **Recency weighting**: the last 6 plausible cycles are weighted 1…6, newest
  heaviest, because the recent past predicts better than a year ago.
- **Fallback**: with no plausible gap yet, a generic 28-day estimate is used — and
  the UI says plainly that it is a placeholder, not personal.
- **Variability**: population standard deviation of the plausible lengths, which
  drives confidence — `none` / `low` (< 3 cycles or very variable) / `medium` /
  `high` (4+ steady cycles). No prediction is ever shown without its confidence.
- **Next period** = last start + weighted average.
- **Ovulation** = next period − 14 days (the luteal phase is the steadier half, so
  we count back from the next period rather than forward from the last one).
- **Fertile window** = 5 days before ovulation through 1 day after.
- **Phase** from the day of the current cycle, relative to the logged or estimated
  bleed length and the average cycle length. Always framed as an estimate.
- **Trend**: earliest half of the plausible cycles vs the most recent half, surfaced
  only when the shift is 3+ days.

`validateLogDraft(draft, existing, today, editingId)` is the entry-time gate —
duplicates, dates inside an existing logged period, backwards end dates, future
dates and impossible bleed lengths are rejected with a message that says what is
wrong _and_ how to fix it, so bad data never reaches the averaging logic.

## What's on the page

Opening with a time-of-day greeting, then a **signature strip**: a consistency
ring (share of cycles within ±3 days of the average), a one-sentence read of
the person's own pattern, and the four figures that matter — cycle day, cycles
logged, average length, logging streak. Numbers count up when they scroll in.

| Section              | What it shows                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase wave           | The signature element: where today sits in the cycle, banded by phase, with ovulation, the fertile window and the predicted next start marked.                                             |
| Predictions          | Next period, days until/late, ovulation estimate, fertile window, average cycle length, where you are — each next to a confidence badge.                                                   |
| Cycle lengths chart  | Every cycle as a bar against the recency-weighted average, with a ±1 SD band. Excluded gaps stay on the chart as dashed bars, so the chart explains the average instead of hiding from it. |
| The numbers          | Cycles logged, average, shortest–longest range, variability and the share of cycles within ±3 days, average bleed length, days tracked since the first entry.                              |
| Flow mix             | Light / medium / heavy distribution across entries, plus how many entries carry an end date or a note.                                                                                     |
| Phase cards          | The current cycle split into the four phases, with the dates each window is expected to cover and a "you are here" marker.                                                                 |
| Forward look         | The next three cycles projected from the average, phase by phase, with ovulation and fertile dates.                                                                                        |
| Insights             | Whichever edge-case banners currently apply — each with a specific message and, where it can be fixed, a one-click action.                                                                 |
| Tips for this phase  | Phase-matched wellness suggestions.                                                                                                                                                        |
| Entry form + history | Logging with inline validation; every entry with its computed length since the previous one, anomaly flags, edit, delete, clear all.                                                       |

With no entries the page hides predictions entirely and lists the eight views
that fill in once something is logged — no fake numbers, no greyed-out dummy
charts.

### Advanced log

`src/lib/cycle/dayLogs.ts` is the pure core for day-level logging:
`placeDate()` puts any date in a cycle (reconstructing earlier cycles from the
average, and flagging that it did), `validateDayLog()` keeps numbers in range,
and `analyzeDayLogs()` aggregates everything by phase. Day logs are stored
separately from period entries under `bloom.cycle.days.v1` and are exported as
their own CSV.

## Edge cases, each with its own message

1. No entries → predictions hidden, prompt to log the first period.
2. One entry → generic 28-day estimate, labelled generic.
3. Implausible gap → flagged, excluded, and the likely missed date (the midpoint)
   offered as a one-click fix.
4. Duplicate / backwards / future dates → rejected inline at entry time.
5. Meaningfully late (3+ days) → calm note with ordinary causes; a clinician is
   only mentioned if it would be unusual _for that person_.
6. High variability → plain-language irregularity note, common causes, no alarm.
7. Lengthening / shortening trend → a soft heads-up.
8. Edited or deleted entry → every number recomputes from what remains; nothing
   is cached.

## Design system — `src/styles/cycle2.css`

One component tree, eight directions, switched by `data-theme` on a `.ci` root:
`nocturne` (default, charcoal-teal), `orchid` (plum-black, glassy), `tide`
(slate-blue, flat), `fern` (charcoal-green, shadow-built), `aurora` (drifting
light behind glass panels), `ember` (warm charcoal and candlelight), `ink`
(near-black, 6px corners, no ornament), `daybreak` (light). Palette, surface
treatment, corner geometry and type weights change; structure, copy and
behaviour do not.

### Life, and when to take it away

- **Atmosphere** — three blurred orbs drift behind the page (`ci-drift-a/b/c`,
  38–54s). `--ci-atmos-opacity: 0` turns it off for a direction (`ink`).
- **Grain** — a low-opacity fractal-noise overlay per direction.
- **Reveal** — sections fade and lift in as they enter the viewport
  (IntersectionObserver, staggered), so the page assembles as you scroll.
- **Count-up** — the signature figures tick up from zero on first view.
- **Grow-in** — chart bars and grid cells scale in, staggered.
- **Pulse & sheen** — the today marker breathes; the "you are here" badge has a
  slow sheen.
- **Lift** — cards rise 3px on hover (pointer devices only).

All of it is off under `prefers-reduced-motion: reduce`, and `.ci-reveal`
elements fall back to visible if IntersectionObserver is unavailable, so no
content can ever be trapped at opacity 0.

Type: Fraunces (characterful serif) for headings, Space Grotesk (geometric sans)
for body and controls, IBM Plex Mono for data.

## Quality bar

- Responsive to 390px; tables become stacked cards on mobile.
- Visible 2px focus ring on every interactive element, offset so it never sinks
  into a border.
- `prefers-reduced-motion` removes entrance animations and the wave draw-in.
- Body copy and data hold 4.5:1 contrast or better in all five directions.
- Empty states explain what to do next instead of rendering nothing.
- The standing disclaimer is permanent: estimates from your own logged data, not
  medical advice, and not able to diagnose anything.

## Storage

Entries live in `localStorage` under `bloom.cycle.periods.v1` — the page works
signed out and offline, and nothing is sent anywhere. The previous page's
day-level log (`bloom.cycle.entries.local`) can be grouped into periods and
brought across with one click from the empty state.
