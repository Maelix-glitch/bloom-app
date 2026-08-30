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

One component tree, five directions, switched by `data-theme` on a `.ci` root:
`nocturne` (default, charcoal-teal), `orchid` (plum-black), `tide` (slate-blue),
`fern` (charcoal-green), `daybreak` (light). Palette, surface treatment, corner
geometry and type weights change; structure, copy and behaviour do not.

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
