# Mood page — ported from `Maelix-glitch/harmonious-dashboard`

**Ask.** Make the Mood page look like the harmonious-dashboard model ("just like
we did" for Today), ignoring the model's own sidebar (Bloom's shared rail stays),
and implement the avatar block the model shows under its sidebar. The model is
a mock-up: every number on it is hardcoded, so the port is wired to the real
Mood record the same way Today was.

## What is where

| Route                 | What                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `/mood`               | **New.** The model page: hero window → Log your mood → Your mood journey → Mood distribution → Quick insights → Streak & consistency → closing banner. |
| `/mood/intelligence`  | The previous `/mood` (Mood Intelligence: heatmap, calendar, correlations, patterns, history) — moved, unchanged, with a small "← Mood" link at the top. Linked from the page's "See all" and "Explore your insights". |

Files: `src/routes/mood/index.tsx` (route + Composer wiring),
`src/components/mood/page/MoodPage.tsx` (the page), `MoodBlob.tsx` /
`MoodJourneyChart.tsx` / `MoodDonut.tsx` (the model's three SVG components,
ported 1:1), `src/lib/mood/page.ts` (+ tests — the pure view-model that turns
the record into what each section shows), `src/assets/mood/*.jpg` (six
images), the `.mood-page` block in `src/styles.css`.

## How each section is wired (no mock data left)

- **Hero** — the greeting reads today's latest entry: "Today you feel *calm*,
  Name." with "Logged at 9:14 AM — Refine it / add another"; before the first
  check-in it is the model's "How are you feeling today?". Name from the
  profile when it isn't the default.
- **Log your mood** — the six faces are real quick check-ins. A tap saves a
  `MoodEntry` through the same storage the Composer uses (Supabase
  `mood_entries`, preset mood/energy/stress + the matching emotion tag,
  tagged `quick-log`); tapping again today replaces that quick entry rather
  than stacking; a Composer entry with a note is never overwritten. The face
  lit up is today's entry (by its emotion tag first, then by score). "Log an
  entry" opens the full Composer. Signed out: faces are disabled with an
  honest line ("Sign in to save a check-in").
- **Your mood journey** — the last seven *logged* days as the model's line
  chart (value = day average on 1–10 → 0..1; point colour = the day's face).
  The period pill is a real selector (7 / 30 / 90 days, bound to
  `useMoodSystem.setRangeKey`). "A small insight" = average, change vs. the
  previous period, brightest weekday. Empty / one-day states say so.
- **Mood distribution** — the analytics layer's real buckets (Excellent →
  Very difficult) over the selected range, total = days logged; the note under
  "You feel. You heal. You grow." names the most common bucket and its share.
- **Quick insights** — up to three evidence-backed lines only: change vs. the
  previous period (or "more stable" when volatility is low over 5+ days),
  the time of day that reads brightest (needs 2+ entries in 2+ bands), the
  most frequent emotion. Nothing with fewer than two logged days.
- **Streak & consistency** — `analytics.streak`, the last seven days as
  check dots, this week vs. last week as a % (or "n of 7 days this week" when
  there was no previous week).

## The avatar block under the sidebar

`HomeSidebar` → `RailProfile`, at the foot of the rail on every main page:
the model's row — settings glyph · avatar · name · one-line tagline — under
the quote with its two gold hairlines. Data comes from a new light hook,
`useRailIdentity` (one read of the signed-in user's `profiles` row: name,
avatar, accent, bio), so the rail never runs the full Profile loader. It
listens to `bloom:profile-changed`, which `useProfileSpace` now dispatches
after saving the name/bio, accent or avatar — so a new photo appears in the
rail immediately. The avatar is the app's own `ProfileAvatar` (photo when set,
accent-tinted initials otherwise; never a broken image). Signed out it reads
"Sign in — Sync across your devices" and links to Profile. The row is
desktop-rail only — phones already carry the profile button in the brand
bar. On windows under 640px tall the quote hides so the links and the row
never collide.

## Images

The model's six photos are served from Lovable's private asset CDN
(`/__l5e/assets-v1/…`, not in the repo and not publicly reachable), so they
were recreated to the model's own alt-text briefs — arched window at golden
hour, blossoms on a dark branch, single pale flower in dark leaves, golden
bokeh in a night garden, candle in a dark bowl, sunset over a still mountain
lake — and exported as 1376×768 JPEGs (60–135 KB each) to `src/assets/mood/`.
Swap any of them for the originals by replacing the file; nothing else
changes.

## Verified (headless Chromium, 1440×900 and 390×844)

- Empty record: every section renders its honest empty state; no page
  errors; all six images load.
- With a demo record (preview only, not committed): hero "Today you feel
  happy."; journey labels Aug 31 → Sep 6; donut 25 days; three insights;
  streak 11 with 7/7 dots; tapping **Calm** → entry saved, "Calm" lit,
  hero "Today you feel calm. Logged at 12:01 PM".
- Rail identity row present on `/`, `/trackers`, `/cycle`, `/mood`,
  `/mood/intelligence`, `/rewards`, `/coach`, `/profile`; rail still fixed,
  one screen tall; no collision at 640px tall.
- Phone: 60px brand bar, tab bar, no horizontal overflow (docW 390).
- tsc: 0 new (11 pre-existing), eslint: 0 new errors, vitest 34/34 (8 new),
  build OK.

Screenshots: `mood-desktop-full.jpg`, `mood-log-your-mood.png`,
`mood-journey.png`, `mood-insights.png`, `mood-desktop-empty.png`,
`mood-mobile-full.jpg`, `rail-avatar-block.png`.
