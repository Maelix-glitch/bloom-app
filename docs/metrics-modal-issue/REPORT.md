# Metrics data-entry modal — why it looks faded / unfinished

**Date:** 2026-09-05
**Page:** `/trackers` → "REFLECT & LOG TODAY" button
**Reference ("perfect") version:** https://github.com/Maelix-glitch/lovable-data-entry → `src/components/metrics-entry-modal.tsx`

This is a diagnosis only. No app code has been changed — the screenshots in this
folder were taken by actually running both projects in a headless browser.

---

## TL;DR

**The app is not rendering the perfect modal at all.**

The AI that "completed" the modal did copy your perfect file into the repo
(`src/components/lovable/metrics-entry-modal.tsx` is byte-for-byte identical to
the one in `lovable-data-entry`) — **but nothing imports it**. Instead, it wrote
a *second*, hand-rolled rewrite (`src/components/tk/MetricsModal.tsx`) and wired
**that** into all three tracker designs. The rewrite is the faded, broken thing
you see. It also left a *third* half-finished copy that isn't used either.

| File | Used? | State |
|---|---|---|
| `src/components/lovable/metrics-entry-modal.tsx` | ❌ never imported | ✅ identical to your perfect repo |
| `src/components/tk/MetricsModal.tsx` | ✅ used by Atlas / Ledger / Strip | ❌ **this is the faded one** |
| `src/components/tk/designs/MetricsEntryModal.tsx` | ❌ never imported | ❌ doesn't even type-check (10 TS errors) |
| `src/styles/lovable-styles.css` | ❌ never imported | the design tokens the perfect modal needs |

Where it's wired in:

```
src/components/tk/designs/Atlas.tsx:19    import { MetricsModal } from "@/components/tk/MetricsModal";
src/components/tk/designs/Ledger.tsx:20   import { MetricsModal } from "@/components/tk/MetricsModal";
src/components/tk/designs/Strip.tsx:19    import { MetricsModal } from "@/components/tk/MetricsModal";
```

---

## Side-by-side

| What you have now (`tk/MetricsModal.tsx`) | What you want (`lovable-data-entry`) |
|---|---|
| ![current](current-empty.png) | ![reference](reference-empty.png) |
| ![current filled](current-filled-scrolled.png) | ![reference filled](reference-filled.png) |

Mobile (390 px wide) — the current modal is completely unusable:

![mobile](current-mobile-390px.png)

---

## The concrete bugs in `src/components/tk/MetricsModal.tsx` (the one being rendered)

Measured in the browser with DevTools-style inspection, not guessed.

### 1. Everything is grey because the "faded" colours are hard-coded

The rewrite never uses the metric colours for anything except the tiny icon.
Compare:

| Element | Current (faded) | Reference |
|---|---|---|
| Header | flat dark navy `#1A1A2E → #16213E` | pink→violet gradient (`--metric-screen → --brand → --metric-sleep`) |
| Input underline | `rgba(255,255,255,0.1)` grey | the metric's own colour (`var(--metric-sleep)` etc.) |
| Placeholder | a single `—` dash in `rgba(255,255,255,0.4)` | `e.g. 7.5` in muted foreground |
| Empty input text | `rgba(255,255,255,0.4)` (line 454) | full foreground |
| Label | `rgba(255,255,255,0.7)` | `text-muted-foreground` |
| Card bg | `rgba(255,255,255,0.02)` (almost invisible) | `var(--surface-raised)` |
| Save button when empty | `opacity: 0.4` **and** `pointer-events: none` (lines 484–485) | full-strength gradient, always visible |

So on first open every visible thing is 2%–40% white on black. That is the
"faded" look — it's literally 60 %-transparent text over a near-black box.

### 2. The inputs are twice as wide as their cards → content overflows and the modal scrolls sideways

`METRIC_INPUT` uses `flex: 1` but **no `width: 0` / `min-width: 0`**. A
`<input type="number">` has a large intrinsic width, so flex can't shrink it.
Measured:

```
input width   = 402 px
card width    = 201 px      ← input is exactly 2× the card
overflow      = 222 px per card (into the neighbouring card)
dialog scrollWidth = 888 px, clientWidth = 698 px
```

Consequences you can see in the screenshots:
- The right-hand cards get their input invisibly covered by the left card's
  input (hence the number spinner arrows appearing in odd places).
- The moment you focus the 6th input, the browser scrolls the dialog
  `190 px` to the left — the header title slides off-screen
  (`current-filled-scrolled.png`).
- On mobile it's a horizontal-scrolling mess (`current-mobile-390px.png`).

The reference avoids this with `className="w-full"` on the input (Tailwind
`width: 100%`), inside a `flex` row.

### 3. The header is fake-full-bleed using negative margins that don't match the padding

`HEADER_STYLE` uses `margin: -32px -32px 0` to pull itself edge-to-edge, but the
modal was given `padding: 0` (line 373) and the body was given its own
`padding: "0 32px 32px"`. Net result the header sits at `left: -31px,
top: -31px` and is `762 px` wide inside a `700 px` dialog — it bleeds past the
rounded corners on the left and top. The reference just puts the header as the
first child of an `overflow-hidden rounded-2xl` box, no negative margins.

### 4. The grid is `auto-fit` → 3 columns on desktop instead of the designed 2

`gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"` gives 3 columns at
700 px and 1 column on phones. The reference is a fixed `grid-cols-2`, which is
what makes the 6 metrics read as three neat rows.

### 5. The CSS variables it references don't exist where it's rendered

The modal is portalled to `<body>` (via `Overlay`), so it is **outside**
`.ci-root / .tk2-root`. Anything it asks for from that scope is empty:

```
--ci-font-mono   on page: "IBM Plex Mono"…   in dialog: (empty)  → falls back to system font
--text-muted     on page: #b0b0b8            in dialog: (empty)  → close button colour undefined
--text-primary   on page: #fff               in dialog: (empty)
```

The reference has the same portalling problem solved differently: all of its
tokens (`--metric-*`, `--surface`, `--surface-raised`, `--brand`, `--success`,
`--danger`) are defined in `:root` in `styles.css`, so they're available
everywhere. **Those tokens are not defined anywhere in bloom-app's active CSS**
— they only live in `src/styles/lovable-styles.css`, which nobody imports.
(`--surface` does exist in bloom, but with a *different* meaning/value.)

### 6. Missing states / behaviour vs the reference

The reference has three views (`form` → `saved` → `reset`) plus: per-field
inline error with icon, "Clear all fields" link, reset confirmation, a proper
"Saved!" summary with all six values, "View My Day" / "Add Another Entry".
The rewrite has: a success screen that auto-closes after 1.8 s, no reset, no
clear, and `handleSave` returns a cleanup function that is thrown away
(`return () => window.clearTimeout(closeTimer)` on line 280 — that's a `useEffect`
pattern pasted into a click handler, it does nothing).

### 7. It doesn't type-check either

```
src/components/tk/MetricsModal.tsx(265,22): error TS7030: Not all code paths return a value.
src/components/tk/MetricsModal.tsx(457,52): error TS2339: Property 'unit' does not exist on type 'TrackerDef'.
```

`def.unit` is `undefined` at runtime, which is why **no unit label ("hrs",
"ml", "min") shows next to any input** in the current modal. `TrackerDef` in
`src/lib/trackers/core.ts` has no `unit` field — the rewrite assumed one.

Also line 462 hard-codes a `goals[...]` lookup chain ending in
`: "screenMinutes"` for `energy` — so the "Target" line under Energy would show
the screen-time goal.

---

## Why the AI probably ended up here

Your perfect modal uses Bloom-incompatible units/ranges (sleep in **hours**
0–24, energy **1–10**) while Bloom's store wants **minutes** and energy **1–5**
(`core.ts`: `sleep max 18*60`, `energy min 1 max 5`). Rather than adapt the
perfect component's data layer, the AI rewrote the *whole* component from
scratch with inline styles and lost the design in the process.

---

## What needs to change (for when you fix it)

You said you'll do the code changes yourself — this is the shopping list, in
order of impact:

1. **Render the right component.** In `Atlas.tsx`, `Ledger.tsx`, `Strip.tsx`
   swap the import from `@/components/tk/MetricsModal` to your perfect
   component (or a thin Bloom adapter around it). Delete
   `tk/MetricsModal.tsx` and `tk/designs/MetricsEntryModal.tsx` so nobody
   picks them up again.

2. **Make the reference's tokens available globally.** Its whole look depends
   on `--metric-sleep/-water/-study/-movement/-energy/-screen`, `--brand`,
   `--surface-raised`, `--success`, `--danger`. Copy the `@layer base { :root
   { … } }` block from `lovable-data-entry/src/styles.css` (lines ~112–124)
   into `src/styles.css` (rename `--surface` → e.g. `--modal-surface` because
   bloom already defines `--surface` for cards) and register them in
   `@theme inline` if you want the `text-metric-sleep` utilities. Delete the
   unused `src/styles/lovable-styles.css`.

3. **Keep the reference component's DOM/classes exactly as-is** — it already
   handles: `w-full` inputs (no overflow), `grid-cols-2`, gradient header,
   coloured underlines, `dark` class, `overflow-hidden rounded-2xl`, all 3
   views.

4. **Adapt only the data layer** (a ~30-line wrapper is enough):
   - `onSaved(values)` → convert hours→minutes for sleep/study/screen and
     call `setTrackerValues(store, [...])` from `tk/designs/shared.tsx`.
   - Pre-fill from `readTrackerValue(store, id)` (minutes→hours).
   - Either change `METRICS[…].validate` to Bloom's ranges (energy 1–5,
     sleep ≤ 18 h, water ≤ 8000 ml, …) or map 1–10 → 1–5 on save.
   - The reference's "all six required" rule (`allFilled`) may be too strict
     for Bloom's "partial entry OK" model — decide which you want.

5. **Portal it.** Your reference renders inline (`fixed inset-0 z-50`). Inside
   Bloom the tracker pages are fine (no `transform`/`filter` ancestors found),
   but for safety wrap it in the existing `<Overlay>` from `shared.tsx` or use
   `createPortal(…, document.body)` and bump `z-50` → `z-[2000]` to match the
   other Bloom sheets.

6. **Duplicate shadcn folder.** `src/components/lovable/ui/*` is a copy of
   `src/components/ui/*` (only 2 files differ). Nothing imports the `lovable`
   copy — safe to delete along with the `hooks/lovable-use-mobile.tsx`,
   `lib/lovable-utils.ts` and `lib/lovable-error-capture.ts` duplicates.
   (**Keep** `lib/lovable-error-reporting.ts` — `routes/__root.tsx` uses it.)

---

## How the screenshots were made

Both projects were run with `vite dev` and driven with headless Chromium at
1280×900 (and 390×844 for mobile). `current-*` = bloom-app `/trackers` with the
Ledger design (Atlas and Strip render the identical modal). `reference-*` =
`lovable-data-entry` `/`.
