# Bloom — Complete Product & Engineering Prompt

> A single, self-contained brief describing what Bloom is, everything it contains,
> how it is built, and the rules it must never break. Written to be handed to an
> engineer, a designer, or an AI agent so they can extend or rebuild it faithfully.
>
> Every count, name, colour and file path below was read out of the repository
> (`Maelix-glitch/bloom-app`) rather than invented.

---

## 1. What Bloom is

Bloom is a **personal daily companion and self-knowledge tracker**. Its own
description, used as the page meta on `/`:

> "Bloom is a calm daily companion: track mood, sleep, habits, study, cycle and
> energy, and see how they connect in one living map."

The internal package name is `bloom-app`. An older `README.md` in the repo is
**not** documentation — it is a leftover prompt file from the Mood Intelligence
redesign and still refers to the app as "MindScape Analytics". The real project
brief is `AGENTS.md`: *"Personal tracker web app — habits, mood, sleep, study and
cycle — built with TanStack Start, React and Tailwind CSS."*

**The product idea in one paragraph.** Most trackers record a number and show a
chart. Bloom records several kinds of day — how you slept, what you drank, how
long you studied, how you moved, how bright you felt, how much screen you took,
what you felt emotionally, where you are in your cycle — and then does the thing
those apps skip: it shows the **connections** between them on one living map, and
it explains them in plain language. The emotional register is calm and warm, not
clinical and not gamified-shouty. It is closer to a journal that happens to be
rigorous than a dashboard that happens to be pretty.

**Who it is for.** One person, tracking themselves. There is a social surface —
a public handle, 24-hour stories, highlights — but it is opt-in and private by
default. Bloom is not a social network and never pressures the user to share.

---

## 2. The design philosophy (non-negotiable)

These are the convictions that show up repeatedly in the code and comments. Any
change that violates one of them is a regression, however good it looks.

1. **Local-first, honestly.** Everything works with no account and no network;
   data lives on the device. Cloud sync is an enhancement, never a requirement.
   When Supabase is absent the app does not break — it says so. `supabase.ts`
   exposes `supabaseConfigProblem()` precisely so *"nothing saves" is never a
   silent mystery*.
2. **Never fabricate data.** No demo numbers, no seeded analytics, no invented
   streaks. The rewards system states it plainly: *"It does not generate rewards
   from mood, XP, points, streaks, or demo data."* When there is not enough data,
   the honest answer is "not enough data yet."
3. **Every control is real.** No fake upload buttons, no decorative filters that
   do nothing, no export that doesn't export. The story editor's tests assert
   absent affordances (`expect(screen.queryByRole("button", { name: /upload a
   gif/i })).toBeNull()`) — dead controls are treated as bugs.
4. **Honest failure over fake fallbacks.** The coach is *"strictly online"* —
   if the edge function is missing it shows an error with a retry rather than
   pretending on-device. GIF and sticker trays stay **empty** when GIPHY is not
   configured rather than substituting another catalog.
5. **Grounded or silent.** The cycle assistant *"never invents, never diagnoses,
   and answers 'not enough data yet' when that's the truth."* The coach:
   *"an ungrounded coach is just a chat window."*
6. **Privacy by default.** Cycle data is owner-only with `anon` revoked entirely
   and is *never* returned by the public profile function. Profiles and stories
   default to private.
7. **Mobile-first 9:16.** Stories are authored against true 1080×1920 with
   story-safe zones; the editing stage stays a centred portrait even on desktop.

---

## 3. Technology stack

| Layer | Choice |
| --- | --- |
| Framework | TanStack Start + TanStack Router (file-based routes), React |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), CSS custom properties, `oklch()` colour |
| Components | Radix UI primitives (~25 packages) in a shadcn-style `src/components/ui` (37 files), `class-variance-authority`, `lucide-react` icons |
| Server data | TanStack Query |
| Backend | Supabase — Auth, Postgres + RLS, Storage, Edge Functions (Deno) |
| Build / deploy | Vite → Nitro → Cloudflare Worker via Wrangler (`npm run deploy`) |
| Native shell | Capacitor (`android/`, `ios/`, `capacitor.config.ts`) |
| PWA | `public/manifest.webmanifest`, `public/sw.js`, generated splash |
| Tests | Vitest — **46 files, 559 tests** |
| Lint / format | ESLint, Prettier |
| Type | TypeScript, strict |

**Commands**

```bash
npm run dev        # dev server
npm run build      # production build
npm run test       # vitest
npm run lint       # eslint
npm run deploy     # build:worker + wrangler deploy
npm run app:build  # Capacitor build + sync
```

**Environment.** Only two client vars, both optional:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (copy `.env.example`). Vite reads
env files **only at startup** — editing `.env` under a running dev server does
nothing.

---

## 4. Information architecture

**Primary navigation** (`src/components/home/HomeSidebar.tsx`, six entries):

| Label | Route | Icon |
| --- | --- | --- |
| Today | `/` | CalendarCheck |
| Trackers | `/trackers` | GitBranch |
| Cycle | `/cycle` | Droplet |
| Mood | `/mood` | Smile |
| Rewards | `/rewards` | Gift |
| Coach | `/coach` | LifeBuoy |

**All routes**

```
/                        Today — the living map
/trackers                Trackers (+ /trackers-premium, /trackers-styles)
/cycle                   Cycle (+ /cycle-classic, /cycle-styles)
/mood                    Mood (+ /mood/intelligence)
/rewards                 Rewards (+ /rewards.atelier, /rewards.index)
/coach                   Coach
/profile                 Your profile
/dashboard               Dashboard
/$handle                 Public profile at a handle (stories, highlights)
/admin/rewards           Reward administration (allow-listed)
/admin/progression       Progression administration
```

**Component modules** (file counts): `ui` 37, `stories` 28, `ci` 26, `tk` 25,
`mood` 20, `cycle` 17, `profile` 16, `progression` 16, `coach` 14, `home` 7,
`welcome` 4, `rewards` 3, `highlights` 3, `system` 3.

**Domain libraries** (`src/lib`): `stories` 38 files, `coach` 21, `cycle` 21,
`profile` 15, `mood` 14, `progression` 8, `rewards` 6, `data` 5, `trackers` 4,
`onboarding` 4, `home` 3, `voice` 3, `sound` 2, `reminders` 2, plus `supabase.ts`,
`prefs.ts`, `undo.ts`, `localDay.ts`, `native-shell.ts`, `error-capture.ts`.

---

## 5. Feature by feature

### 5.1 Today (`/`)

The opening screen and the product's thesis in one page. It composes:
`ConnectionMap` (the living map of how today's variables relate), `CoachPanel`,
`HabitsSection` + `HabitUndo`, the mood `Composer`, and a panel set —
`ActivityPanel`, `FlowPanel`, `FocusPanel`, `InsightsPanel`, `ProgressPanel`,
`TrackersPanel`. Plus `StoryRail`, `StoryComposer`, `StoryViewer`, a `RankChip`,
and `MetricsEntryModal` / `AddHabitModal`.

Its logic lives in `src/lib/home/today.ts`, which exports the vocabulary of the
page: `greetingFor`, `longDate`, `scoreOf`, `readings`, `connections`,
`activityOf`, `flowOf`, `focusOf`, `insightsOf`, `moodToday`. The hero image is
`src/assets/home/window-dusk.jpg`.

**Rule:** Today must never feel like a dashboard of cards. It is one map with
panels hanging off it.

### 5.2 Trackers (`/trackers`)

Six trackers, defined once in `src/lib/trackers/core.ts` as `TrackerDef[]`:

| id | Name | Kind | Direction | Default goal | Quick-adds | Range | Accent token |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sleep` | Sleep | duration | more | 480 min | 30, 60 | 0–18h | `--ci-luteal` |
| `water` | Water | volume | more | 2200 ml | 250, 500 | 0–8000 ml | `--ci-follicular` |
| `study` | Study | duration | more | 120 min | 25, 50 | 0–16h | `--ci-ovulation` |
| `movement` | Movement | duration | more | 30 min | 10, 20 | 0–8h | `--ci-follicular` |
| `energy` | Energy | rating | more | 3 / 5 | — | 1–5 | `--ci-ovulation` |
| `screen` | Screen | duration | **less** | 180 min | 30, 60 | 0–20h | `--ci-menstrual` |

Notes that matter:

- `direction: "less"` (screen) is a **ceiling**, not a target. The UI must never
  reward exceeding it.
- Each tracker carries a one-line `blurb` ("Last night, against your target",
  "Glassed up today", "How today actually felt") and a `format` function, so
  water reads `1.5L` / `750ml` and durations read `7h 20m`.
- **The whole day record is `DayEntry`, keyed by `date: "YYYY-MM-DD"`** — *"the
  one field everything hangs off."* It holds `sleepMinutes`, `bedTime`,
  `wakeTime`, `sleepQuality` (1 rough – 5 excellent), `waterMl`,
  `sessions: StudySession[]` (each `{ subject, minutes, startAt }`),
  `movementMinutes`, `energy`, `screenMinutes`, `notes`, and `updatedAt` — used
  *only* to reconcile two copies of the same date.
- Sleep keeps bedtime and wake time so the duration can be **recomputed and
  checked** rather than trusted.
- Cloud table `tracker_days`, upsert conflict key `profile_id,date`.
- Trackers are individually activatable (`active` option); the day score counts
  only the active set and falls back to all six if none are.

### 5.3 Habits

`src/components/tk/` (25 files) — `AddHabitModal`, `MetricsEntryModal` and
friends; `src/lib/home/habits.ts` with `habitToDraft` / `HabitDraft`. Habits
support prefill from context (`AddHabitPrefill`) and **undo** (`HabitUndo`,
`src/lib/undo.ts`).

### 5.4 Mood Intelligence (`/mood`, `/mood/intelligence`)

Fifteen emotions in `src/lib/mood/types.ts`, each with a valence and a visual
accent:

| Valence | Emotions (accent) |
| --- | --- |
| positive | happy (amber), calm (sage), excited (rose), focused (sky), motivated (violet), confident (amber), grateful (sage) |
| neutral | neutral (sky) |
| negative | tired (violet), anxious (rose), sad (sky), angry (rose), frustrated, overwhelmed, lonely |

Accent vocabulary is exactly five tokens: `violet | sky | amber | sage | rose`.

`src/lib/mood/` splits cleanly: `record.ts` (entry), `analytics.ts` (patterns,
intensity, correlations), `graph.ts` (visualisation), `context.ts` (correlation
with the rest of the day), `page.ts` / `pending.ts` (page state), `storage.ts`,
`seed.ts`, `cssColor.ts`.

**Intended character** (from the original Mood brief in `README.md`): a *Mood
Intelligence System* and "premium analytics command center, not a diary" —
record detailed entries, track states over time, analyse intensity/energy/stress,
discover correlations with other life areas, compare periods, search and filter
history, review a beautiful timeline, and surface automatically generated,
**data-driven** insights. Insights must be derived from the user's own records —
never templated filler.

### 5.5 Cycle (`/cycle`)

The most rigorous module. `src/lib/cycle/` (21 files): `engine.ts`,
`predict.ts`, `patterns.ts`, `intelligence.ts`, `presentation.ts`, `reconcile.ts`,
`dayLogs.ts`, `assistant.ts`, `themes.ts`, `palette.ts`, `motion.ts`, plus
storage/cloud.

- **Phases** (`PhaseKey`): `menstrual`, `follicular`, `ovulation`, `luteal`.
  Labels: Menstrual, Follicular, "Ovulation window", Luteal. Reproductive phase
  (`ReproductivePhaseKey`) is **independent of bleeding** — follicular begins at
  cycle day 1.
- **`CycleContext`** is the single object the whole page reads: `currentDay`,
  `currentPhase`, `currentProvenance`, `confidence`, `dataSufficiency`,
  `usesDefaultAssumption`, `baselineCycleLength`, `completedCount`,
  `recentLengths`, `average`, `median`, `rangeMin`/`rangeMax`,
  `variabilityPercent`, `periodLengthAverage`, `estimatedPeriodLength`,
  `currentPeriodEpisode`, `recentCorrections`, `issues`, `events`,
  `loggedDays30`, `observedPeriodDays`, `explicitNoFlowDays`,
  `unloggedRecentDays`, `estimatedPeriodDays`, `bleedingState`,
  `reproductivePhase`, `ovulationDay`, `lutealLength`, `calculationVersion`,
  `generatedAt`.
- **Provenance and confidence are first-class.** Estimated dates are labelled
  estimated; the UI can answer *"Why is this date estimated and not logged?"*
  Explicit "no flow" days are distinguished from merely unlogged days — a gap is
  never silently read as a period.
- **Advanced log** columns: flow, temperature, cervical mucus, LH tests, pain,
  activity, contraception, energy, sleep, mood, symptoms, notes.
- **The assistant is deterministic and on-device**, provider-shaped
  (`AssistantProvider`) so a real language model can be swapped in later without
  touching the UI. It explains, compares and summarises; it never diagnoses.
  Quick prompts are gated by `available(ctx)` so you are never offered a question
  the data cannot answer.
- **Privacy:** `cycle_entries` is owner-only, `anon` revoked entirely, unique
  index on `(profile_id, date)`, and cycle data never appears in public profile
  responses.

### 5.6 Stories (`src/lib/stories`, `src/components/stories`)

A complete, Instagram-class story system — the largest single subsystem.

**The DSL** (`src/lib/stories/templates/dsl.ts`). *A template is data: a
background plus a list of seeds.* Nothing in the library is a component, so it
grows to hundreds of designs without adding a screen.

- `StoryTemplateDef` = `{ id, name, hint, category, tags, tone, background,
  seeds, storyKind?, previewSrc? }`
- Seed kinds: `text`, `photo`, `shape`, `sticker`, `data`
- Constructors: `tpl`, `solid`, `gradient`, `photoBg`, `preset`, `photo`, `text`,
  `shape`, `sticker`, `data`
- 14 photo masks (`rect, rounded, circle, oval, arch, arch-soft, blob, leaf,
  diamond, hexagon, scallop, torn, asym, soft-corner`), 8 frames (`none,
  polaroid, tape, mat, film, window, magazine, torn-paper`), 11 filters (`warm,
  cool, soft, matte, film, fade, vintage, noir, dream, golden, bloom, original`)
- `data` seeds render a real metric inline (`inline | ring | bars | phase | list
  | card`) so a template can show *your* sleep or streak as composition, not as a
  dashboard widget
- `storyKind` ∈ `text | photo | video | mood | reflection | win | reward |
  milestone`

**The library.** **294 templates** across `library/{style,more,days,living,body,
boards,premium,premium2,premium3}.ts`, covering **26 categories**
(`TEMPLATE_CATEGORIES`: morning, night, mood, selfcare, wellness, fitness,
hydration, sleep, cycle, habits, goals, wins, study, food, travel, memories,
gratitude, love, nature, quotes, scrapbook, cinematic, minimal, playful,
seasonal, data).

**78 of them are the "Signature" collection** — the art-directed front of the
library, in three waves (`premium.ts` 18, `premium2.ts` 24, `premium3.ts` 36),
led by a "Signature" row in `TemplateBrowser.tsx`. They are composed like
editorial artwork: a dominant type voice, tiny metadata, deliberate negative
space, and a photo composition that genuinely differs from its neighbours —
full-bleed, arch, polaroid, film strip, torn paper, window, oval, diptych, hero,
contact sheet, mosaic, triptych, edge-to-edge.

**Type system** (`src/lib/stories/canvas/typography.ts`): **18 presets** —
editorial, display, elegant, romantic, classic, soft, whisper, handwritten, note,
journal, bold, poster, condensed, cinematic, minimal, modern, typewriter,
playful.

**Stickers** (`src/lib/stories/stickers.tsx`): **56**, grouped by `bloom,
celebrate, deco, everyday, fitness, habits, love, mood, seasonal, sleep, wellness`.

**Editor tools** (`StoryEditor.tsx`): text, stickers, drawing, filters, music,
GIFs, interactive stickers. **Media trays** (`MediaTrays.tsx`): music and GIF
pickers; *"GIFs search GIPHY only — no uploads, no local motion pack."*

**Export** (`exporter.ts`): the live canvas is DOM, but the export is a real
**1080×1920 canvas2d render** (`EXPORT_WIDTH = 1080`, `EXPORT_HEIGHT = 1920`),
because `foreignObject` cannot carry `oklch()` colours or a GIPHY URL.

**Photo slots are empty by design.** A template never ships a photograph the user
did not choose; empty slots show an ink-adaptive "Add photo" affordance. Template
previews may use tasteful neutral placeholders — **never grey "unfinished"
boxes.**

**Lifetime.** Stories live **24 hours** (`expires_at`, soft `deleted_at`), can be
saved into `story_highlights` collections, and are viewable at `/$handle`.

### 5.7 Progression (`src/lib/progression`)

A lifetime-points rank ladder with **12 named ranks**, each carrying
`threshold`, `tone`, `emblem` and a written `affirmation`:

| # | id | Name | Threshold | Tone | Affirmation |
| --- | --- | --- | --- | --- | --- |
| 1 | seedling | Seedling | 0 | sage | "Everything begins quietly. You began." |
| 2 | first-bloom | First Bloom | 500 | rose | "You kept showing up. That is the whole secret." |
| 3 | sprout | Sprout | … | | |
| 4 | budding | Budding | … | | |
| 5 | in-bloom | In Bloom | … | | |
| 6 | flourish | Flourish | … | | |
| 7 | wildflower | Wildflower | … | | |
| 8 | evergreen | Evergreen | … | | |
| 9 | blossom-keeper | Blossom Keeper | … | | |
| 10 | perennial | Perennial | … | | |
| 11 | everbloom | Everbloom | … | | |
| 12 | bloomkeeper | Bloomkeeper | … | | |

Achievements (`achievements.ts`) fire on events like `rankTier`; the ledger keys
on the tier so **re-crossing a threshold can never be mistaken for a new
rank-up**. Also `goals.ts`, `evaluate.ts`, `store.ts`, `format.ts`.

### 5.8 Rewards (`/rewards`, `/admin/rewards`)

*"A curated delivery system."* A human administrator writes real rewards and
assigns them to real people. Schema: `app_admins` (allow-list), `reward_items`
(draft / published / revoked), `reward_assignments` (per-user delivery state),
plus RLS and security-definer RPCs.

Rules: drafts never reach user pages; published rewards go only to their assigned
users; claiming re-checks the signed-in user server-side (`claim_reward`);
`get_my_rewards()` uses `auth.uid()` and honours the publication window.
**No service-role key in the browser.** The catalog (`catalog.ts`) carries
`CATALOG`, `ALL_OFFERS`, `componentsById`, `collectionsById`, `REWARD_ART`,
`KIND_GLYPH` and per-domain `DOMAIN_RITUALS`. There is also an `.atelier`
variant and a `LegacyRewards` compatibility view.

### 5.9 Coach (`/coach`)

Rebuilt around three ideas, stated verbatim in `src/lib/coach/engine.ts`:

1. **Answer the question that was asked.** The `Topic` union in `topics.ts` has
   **31 members** — the six trackers with real data behind them, `period`, six
   inner-weather topics (mood, stress, motivation, loneliness, grief,
   confidence), six body topics (food, caffeine, alcohol, pain, illness, body),
   six life topics (work, relationships, money, time, habit, goals), and six
   conversational ones (appHelp, data, greeting, thanks, smalltalk, general). So
   a question about money, grief or a job interview gets an answer about *that* —
   not a redirect to hydration. (The file's own comment says "thirty"; the union
   has 31.)
2. **Match the length to the question.** `brevity.ts` reads the shape of the ask
   and returns a budget. "Did I sleep enough?" gets a line; "Why do I keep
   crashing at 3pm?" gets the analysis.
3. **Strictly online.** Every question goes to the Supabase edge function. If it
   cannot answer, the UI shows an honest error with a retry. *There is no
   on-device fallback pretending to be the coach.*

It will not invent a number, diagnose anything, or claim the record says
something it doesn't. Supporting modules: `compose`, `responder`, `intelligence`,
`knowledge`, `media`, `providers`, `sidecar`, `tools`, `edge`, plus tests for
brevity, breadth, cancellation and reveal.

### 5.10 Profile & public presence (`/profile`, `/$handle`)

`profiles` extended with `display_name`, `username`, `bio`, `avatar_path`,
`accent`, `featured` (legacy `profile_name` rows keep working).
`profile_privacy` holds profile and story visibility — **private by default**.
`get_public_bloom_profile()` is the *only* path to another person's data and
returns public fields only. Storage bucket `profile-media` is namespaced per user
(`{user}/avatar.jpg`, `{user}/stories/{uuid}.jpg`) with write policies.

Components: `AvatarEditor` (accepts jpeg/png/webp/gif), `JourneyCard`,
`AccountRow` (JSON export of your own data), `presetAvatars`, `highlightMeta`,
`storyMeta`, `ambient`, `drafts`, `journey`, `media`, `validation`.

### 5.11 Data portability (`src/lib/data`)

`exportAll.ts` (full export), `importPeriods.ts`, `erase.ts`. Your data is yours;
leaving must be possible in one action.

### 5.12 Backends & infrastructure

- `supabase/functions/giphy` — GIPHY proxy. Holds `GIPHY_API_KEY` as a **server
  secret**, never a `VITE_` var; returns GIPHY's `data` array with the key
  stripped. Rating `g`, limit clamped to 1–24, 8s timeout, CORS enabled.
- `supabase/functions/coach` — the coach model endpoint.
- `supabase/migrations/` — reward delivery, profile identity + stories, cycle
  intelligence, story canvas. All additive and idempotent; re-runnable.
- Cloud sync pattern: upsert with an explicit conflict key and an `updatedAt`
  field used only for reconciliation.

---

## 6. Visual & design system

**Type.** Three faces only, set as CSS custom properties:

```css
--font-display: "Fraunces", ui-serif, Georgia, serif;   /* headings, numerals */
--font-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;
--font-mono:    "IBM Plex Mono", ui-monospace, monospace; /* metadata, labels */
```

Display type is weight 500 with `font-variant-numeric: tabular-nums`, so numbers
never jitter. Small metadata is mono, uppercased, wide-tracked — this is the
house style for timestamps, eyebrows and captions.

**Colour.** Everything is `oklch()`. Dark is the default register:

```css
--background: oklch(0.19 0.021 279);
--surface:    oklch(0.235 0.023 279);
--foreground: oklch(0.955 0.008 85);

--violet: oklch(0.7 0.107 297);   --sky:   oklch(0.71 0.073 250);
--amber:  oklch(0.81 0.11 82);    --gold:  oklch(0.855 0.086 82);
--sage:   oklch(0.71 0.062 155);  --rose:  oklch(0.72 0.083 355);

--brand:  oklch(0.6 0.28 320);
```

Plus `surface-2/3`, `border`, `border-strong`, `muted-foreground`, `faint`,
`destructive`, `success`, `danger`, and per-metric tokens `--metric-sleep`,
`--metric-water`, `--metric-study`, `--metric-movement`, `--metric-energy`,
`--metric-screen`. Cycle phases own their own accent family — `--ci-menstrual`,
`--ci-follicular`, `--ci-ovulation`, `--ci-luteal` — and the trackers borrow it,
which is why Sleep is luteal-toned and Screen is menstrual-toned.

**Structure.** Semantic classes (`bg-surface`, `text-faint`, `border-border`)
rather than raw hex in components. `src/components/ui` is a shadcn-style kit over
Radix. Radii derive from one `--radius`.

**Feature CSS** lives in `src/styles/` — 18 files: `stories.css`, `trackers.css`,
`trackers2.css`, `cycle.css`, `cycle2.css`, `coach.css`, `mood-composer.css`,
`mood-motion.css`, `motion.css`, `profile.css`, `progression.css`, `rewards.css`,
`welcome.css`, `bloom-sheet.css`, `connection-notice.css`, `add-habit-modal.css`,
`admin-panel.css`, `responsive.css`. Container queries (`cqw`) scale type with its
box, so a panel reads correctly at any width.

**Palette discipline for authored artwork** (Signature templates): ivory,
charcoal, champagne, sage, dusty rose, lavender, midnight, deep forest,
terracotta, warm beige, taupe, plum, mist, soft blue. **No neon.** Backgrounds
use solids, restrained gradients, or shipped photographic backdrops in
`public/bloom/templates/`.

---

## 7. Hard rules — things Bloom must never do

1. Never invent, estimate-and-present-as-fact, or seed data the user did not
   create.
2. Never diagnose, medically interpret, or imply clinical authority — especially
   in Cycle and Coach.
3. Never ship a control that does nothing.
4. Never substitute a different content source when the configured one is
   unavailable; go empty and say so.
5. Never put a secret (`GIPHY_API_KEY`, service-role key) in the browser bundle.
6. Never expose cycle data, private profiles, or unpublished rewards through a
   public path.
7. Never bake a stock photograph into a template as if it were the user's photo —
   photo slots stay empty until the user chooses.
8. Never let a missing Supabase config take a route down; degrade to local and
   tell the user.
9. Never break local-first: the app must remain fully usable offline and
   account-free.
10. Never widen the palette into neon or the layout into generic card-grids; the
    calm, editorial register *is* the product.

---

## 8. Testing & quality gates

Run all four before calling anything done:

```bash
npx tsc --noEmit   # strict typecheck
npm run lint       # eslint
npx vitest run     # 46 files, 559 tests
npm run build      # Vite → Nitro → worker
```

Notable guarantees already encoded as tests:

- **Template library integrity** — unique ids, unique names, and **unique
  composition fingerprints** so two designs cannot be the same layout re-skinned;
  every photo/text seed must fit inside the 0..1 canvas; every mask, frame,
  shape, metric and gradient preset referenced must actually exist; more than 60
  photo slots across the library.
- **Story export** renders at 1080×1920.
- **Media trays** search GIPHY only, and dead affordances stay absent.
- **Coach** brevity, topic breadth, cancellation and reveal behaviour.
- **Cycle** prediction, reconciliation and mode logic.
- **Progression** rank thresholds and the no-double-rank-up ledger.
- **Supabase guard**, prefs, undo, local-day boundaries, and cloud-sync tests.

---

## 9. Known gaps and rough edges (be honest about these)

- `README.md` is a leftover Mood-redesign prompt and calls the app "MindScape
  Analytics". It should be replaced with real documentation; `AGENTS.md` is the
  accurate short brief today.
- GIFs, stickers and the Coach all require setup before they do anything:
  deploy the edge functions, set `GIPHY_API_KEY` as a Supabase secret, and add
  the two `VITE_SUPABASE_*` vars. Until then the trays read *"GIF catalog isn't
  connected"* (with the setup steps shown in dev) and the coach errors with a
  retry.
- Of the 294 templates, roughly 216 are legacy designs of uneven quality next to
  the 78 Signature ones; thinning the weakest of them is still open work.
- Headless-browser visual QA is unavailable in some sandboxes (Playwright
  browsers may not install), so template work is verified structurally — tests
  and tokens — rather than by eye. Say so rather than claiming visual inspection.
- `docs/` prompt files and `template1.png` / `template2.png` reference boards sit
  at the repo root; `downloads/` holds committed delivery zips by convention.

---

## 10. How to extend Bloom well

- **Add a tracker**: extend `TrackerId`, add a `TrackerDef` with blurb, kind,
  direction, goal key, quick-adds, range, accent token and format; extend
  `DayEntry`, `Goals`, `DEFAULT_GOALS`, the `tracker_days` row mapping and the
  day-score logic. Keep `date` as the join key.
- **Add a story template**: one `tpl({...})` in a `library/*.ts` file, registered
  in `index.ts`. It needs a unique id, a unique name, a unique composition
  fingerprint, seeds inside the canvas, and a composition that differs from its
  neighbours. Empty photo slots. Real copy, not lorem.
- **Add a page**: a file under `src/routes/`, a nav entry in `HomeSidebar.tsx`,
  a `src/styles/<page>.css`, semantic tokens only, and a test.
- **Add cloud**: a migration that is additive, idempotent and owner-only under
  RLS; never a service-role key in the client.
- **Anything user-facing**: local-first, honest when empty, grounded in real
  records, and calm in tone.

---

*Bloom is the app you would build if you believed a tracker's job is not to
collect numbers but to help one person understand themselves — and if you
refused to fake any part of it.*
