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

## Kit — its own download

`docs/mood-page/bloom-mood-page.zip` (`apply-mood-page.mjs` + `files/`),
separate from the Today-home kit, which the user has already applied and
which stays at v5 untouched. Requires `HomeSidebar.tsx` to exist (Today-home
v2+). Steps: move `src/routes/mood.tsx` → `src/routes/mood/intelligence.tsx`
(route id + "← Mood" link; falls back to the kit's copy, keeping an
unexpected local version as `mood.tsx.before-mood-kit.txt` so it never
registers `/mood` twice); copy the page files, `useRailIdentity.ts`, the
images and `HomeSidebar.tsx`; five marker-guarded edits in
`useProfileSpace.ts`; the Rewards link; `styles.css` gold tokens +
`.mood-page` block + refreshed app-shell tail (marker
`.app-sidebar-gold-rule {`). Idempotent; CRLF-preserving. Tested from
`02bcc2a` (v5), `4e2a87b` (v4), `df7d705` (v3), `8945284` (v2) and a CRLF
v4 tree: every run ends byte-identical to this branch for the files it owns,
second runs make 0 edits, and the applied v4 tree passes 34/34 tests, adds no
type errors once the dev server regenerates `routeTree.gen.ts`, and builds
with the six images bundled. Zip: 603,330 bytes.

---

# Phase 10 — width, flicker, lag, and the mood web

Follow-up on the first `/mood` build. Everything below was measured in
headless Chromium against the dev server before and after the change.

## What was wrong, and why

| Symptom | Cause found | Fix |
| --- | --- | --- |
| `/mood` and `/mood/intelligence` narrower than Today | `MoodPage` wrapped in `mx-auto max-w-6xl`, Intelligence in `max-w-[1200px]`; Today has a full-width `main` | Both now use Today's main (`min-w-0 w-full px-5 … lg:px-10`). Content spans x 260–1880 at 1920 on all three pages. |
| Spinner / flash when moving between pages | `useMoodSystem` fetched entries per mount **and** twice per mount (`getSession`, then supabase-js's `INITIAL_SESSION` event set `loading=true` again, remounting the page under it); `Reveal` started at `opacity-0` on hydration | New `src/lib/mood/record.ts` — one shared record per session read through `useSyncExternalStore`; auth events revalidate silently; `Reveal` is a CSS-only one-shot (`.mood-reveal`). Spinner now appears once per session, never again on navigation; 0 main remounts. |
| Lag (slow scroll, sluggish range switches) | 27 infinite animations idle on Intelligence: 18 motes, 3 blurred drift fields, a 60 fps spotlight rAF, per-panel sweep/breathe, 10 evidence-pill pings. **Atmosphere was invisible on Intelligence** (opaque `.app-shell` above its `-z-10` layer — 0-pixel screenshot diff) yet running. Range switch: ~370 ms of JS — every panel re-rendered, and the ECharts line re-rasterised an 18 px canvas `shadowBlur` on every animation frame. | Atmosphere: 8 motes, no blur, spotlight settles; removed from Intelligence. Panels static, pills quiet. Nine Intelligence panels `memo`ised with stable callbacks. Chart: no `shadowBlur`, merge-update (`replaceMerge`) instead of `notMerge`. **Idle infinite animations 27 → 3 on Intelligence, 2 on `/mood`; range-switch overhead 370 ms → ~30 ms.** |
| Click → wait on `/mood` → `/mood/intelligence` | The route's code chunk downloaded on click | `defaultPreload: "intent"` in `router.tsx` (plus `preload="intent"` on the mood links): cold click 758 ms → ~300 ms, hover-first 258 ms. |

## Your mood web

New section on `/mood`, right after the journey (`src/lib/mood/graph.ts`,
`src/components/mood/page/MoodGraph.tsx`, styles under `.mood-page .mg-*`).

- **Model.** Mood is the hub. Inner ring = the signals you actually log
  (energy and stress always; sleep, exercise, screen time, productivity,
  social, study, steps only when present). Outer ring = up to six named
  emotions (four on phones), sized by frequency. Edges Mood↔signal use the
  page's existing Pearson correlations on paired days; up to four
  signal↔signal cross-links are added only with real evidence. Gold = lifts
  mood, rose = lowers, dashed = not enough days (`evidenceFor`: n ≥ 8 and
  |r| ≥ 0.15). Node distance from the centre shrinks with |r|; line weight
  grows with it. Particles run along the strongest links only (SMIL
  `animateMotion`, ≤ 6, hidden under reduced motion).
- **Layout.** Deterministic, per-axis elliptical rings so a landscape canvas
  is filled; overlap relaxation; everything clamped in-bounds. Separate
  desktop (640×440) and mobile (360×440) layouts, only one mounted at a time.
- **Interaction.** Hover reads a node in the side column (signal average,
  each link's r and a plain-words statement); click / tap / Enter pins,
  Escape or "Unpin" releases. Headline is the strongest measured link
  ("Higher energy, higher mood."). "Open in Intelligence" and "See the full
  analysis" deep-link to `#relationships` on Intelligence.
- **Empty state.** Just the hub ("no entries yet") and a short explanation —
  which is what a signed-out preview shows.
- **Font note.** The display face has no "→" glyph (it rendered as a box), so
  statements read "Longer sleep, higher mood" instead.
- Tests: 9 new (`graph.test.ts`) — nodes only for logged signals, evidence
  gating, hub centred, in-bounds, no overlap, determinism, headline choice.

## Verified

- vitest 43/43; tsc 0 new errors (11 pre-existing); eslint 0 new errors on
  every touched file (pre-existing prettier drift in `MoodChart.tsx` and
  `analytics.ts` untouched); `npm run build` OK.
- Width at 1440/1920: `/`, `/mood`, `/mood/intelligence` share the same
  content edges. Phone 390: no horizontal overflow, single canvas, labels
  inside the card.
- Navigation `/mood` → `/mood/intelligence`: no spinner, no main remount.
- With a 118-day demo record (preview only): 14 nodes / 18 edges / 6
  particles; energy r +0.83, sleep r +0.50, stress r −0.82; hover, pin,
  Escape all behave.

Screenshots: `mood-web-1440.png`, `mood-web-1920.png`, `mood-web-390.png`
(signed-out, as the live preview shows it); `mood-web-demo-data.png`,
`mood-web-pinned.png`, `mood-web-demo-390.png` (with the demo record).

## Kit v2 (same download URL)

`docs/mood-page/bloom-mood-page.zip` now applies v1 + Phase 10. Idempotent
over a v1 tree and over a tree that never had it; byte-compared copies; CRLF
preserved; the two new CSS blocks are marker-guarded (`.mood-reveal {`,
`* Mood web —`). Tested from `4e2a87b` + v1, `02bcc2a` bare, a CRLF tree and
the unzipped kit in a path with spaces: every run ends byte-identical to this
branch across `src/`, second runs make 0 edits, and the applied tree passes
43/43 tests, adds no type errors once `routeTree.gen.ts` regenerates, and
builds. Zip: 650,257 bytes, 53 files.


## Mood fixes kit — its own download

The user applied a kit and reported "still the same", and asked for a
separate kit only for the reported problems. `docs/mood-fixes/bloom-mood-fixes.zip`
(`apply-mood-fixes.mjs` + `files/`, 34 files, 64,251-byte zip) installs exactly
Phase 10 on top of an installed Mood page (v1 or v2 — v2 trees get all
"already done"). Differences from the page kit: it refuses to run if the Mood
page isn't there (points at the page kit); prints a **Found:** block first
(one `→`/`✔` line per reported problem, so "nothing changed" is diagnosable
before any file is written); replaced files are version-checked (md5 after
CRLF/EOF-whitespace normalisation) against the v1 / original app versions and
any other version is kept as `<name>.before-mood-fixes.txt`; the README has an
"If it still looks the same" checklist (restart dev server + Ctrl+F5,
push for hosted previews, right repo, `<MoodGraph` file test). Tested from
`4e2a87b`+v1, `02bcc2a`+v2 (all skips), a CRLF tree, a locally-edited file
(backup made), a bare tree (refused), and the unzipped kit in a path with
spaces: every run ends byte-identical to this branch across `src/`, second
runs make 0 edits, the applied tree passes 43/43, builds, and adds 0 type
errors once `routeTree.gen.ts` regenerates.
