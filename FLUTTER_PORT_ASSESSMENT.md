# Flutter port of Bloom — honest cost assessment

*Measured from this repository, not estimated from vibes. Every count below
came from `find`/`wc` over the actual source tree.*

---

## The conflict you need to resolve first

You asked for three things that do not all fit together:

| You want | Flutter delivers it? |
| --- | --- |
| "Make it **exact**" | **No.** Structurally impossible — see below. |
| Both App Store and Play Store | Yes, eventually — but Capacitor already does this today. |
| Native app | Yes. |

**"Exact" and "Flutter" are mutually exclusive.** If *exact* is the priority,
the answer is Capacitor (already built in this repo). If *Flutter* is the
priority, you must accept a different-looking app.

---

## Why Flutter cannot be exact

Flutter does not use a browser engine. It has no HTML, no DOM and no CSS. It
paints every pixel itself through Skia/Impeller. So nothing in Bloom's visual
layer transfers — it all gets re-expressed by hand in a different system, and
then renders through a different rasteriser.

Concretely, these are all over this codebase and all have to be rebuilt:

- **24,745 lines of CSS** across 19 files. In Flutter this becomes `ThemeData`,
  `TextStyle`, `BoxDecoration` and widget composition. There is no stylesheet.
- **~180 `oklch()` and ~1,300 `color-mix()`** colours. Dart has no oklch; each
  needs converting to sRGB, and the *derived* colours (`color-mix`) need
  computing by hand or reimplementing as a helper.
- **Container queries** (`cqw` units) used to scale story typography to its box
  — no Flutter equivalent; needs `LayoutBuilder` everywhere it appears.
- **`backdrop-filter`, masks, clip-paths, blend modes, the story canvas** — the
  1080×1920 canvas2d exporter alone is a substantial rewrite against
  `dart:ui`/`Canvas`.
- **23 Radix UI packages** (dialogs, popovers, tabs, tooltips, sliders…) — no
  Flutter equivalent; each maps to a different Flutter widget with different
  behaviour and accessibility semantics.

## What the rewrite actually costs

| Unit | Count | Flutter outcome |
| --- | --- | --- |
| React components (`.tsx`) | **217** | Rewrite as widgets |
| Route screens | **19** | Rewrite with a Flutter router |
| CSS lines | **24,745** | Rewrite as Flutter styling |
| Total TS/TSX lines | **112,185** | Reference material; Dart is written fresh |
| Tests | **46 files / 565 tests** | Rewrite in `flutter_test` |

**What you get to keep** — this is the good news, and it's real:

- **Supabase.** Official Flutter SDK exists (`supabase_flutter`). Auth,
  Postgres + RLS, Storage and Edge Functions all carry over unchanged, because
  they're server-side. Your migrations and RLS policies are untouched.
- **Domain logic as a spec.** The 161 `lib/*.ts` files — the cycle engine,
  prediction, mood analytics, coach topic/brevity logic, progression ranks,
  template DSL — can be ported close to 1:1 in structure. Dart and TypeScript
  are similar enough that this is translation, not redesign.
- **The product decisions.** Tracker definitions and goals, the 15 emotions, the
  12 ranks, the 294 templates' content, the design philosophy. All portable as
  data and intent.

**What is thrown away entirely:** every `.tsx` file, every `.css` file, the
Tailwind setup, Radix, TanStack Router/Start, and the DOM story canvas.

## Realistic effort

Roughly **112k lines of TS/TSX** and **24.7k lines of CSS**, with about 40% of
the logic portable as a spec. For one experienced Flutter developer that is
**on the order of 4–8 months** to reach parity with what exists today, before
store submission. The story editor alone (canvas, gestures, masks, filters,
exporter, 294-template DSL) is plausibly 4–6 weeks of that.

## What this sandbox can and cannot do

- Flutter is **not installed** here. It is installable (19 GB free, `git`,
  `curl`, `unzip`, `xz` all present).
- **Android build**: would additionally need a JDK and the Android SDK. Not
  present. Large downloads, may not be permitted.
- **iOS build: impossible from this Linux sandbox.** Building for iOS requires
  macOS and Xcode. No amount of setup here produces an `.ipa`.

## The alternative that already works

Capacitor is scaffolded and **verified working** in this repo right now:

- `npm run build:app` → exit 0
- `npx cap sync android` → "Sync finished", web assets bundled (15 MB, offline)
- `android/` is a real Gradle project (`app.bloom.tracker`, minSdk 24)
- `ios/App` present

That path is **exact** (it is literally the same code), reaches **both stores**,
and is a matter of days — not months. The tradeoff is that it is a WebView app
rather than a Skia-rendered one.

## Recommendation

If the goal is genuinely "Bloom, in both stores", ship Capacitor and revisit
Flutter later if you outgrow the WebView. If the goal is specifically "learn
Flutter" or "own a Flutter codebase", then port it — but pick **one surface
first** (Trackers, or Cycle) and port that end to end before committing to the
whole app, so you find out the true cost on 5% of the surface area instead of
100%.
