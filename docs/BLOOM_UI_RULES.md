# BLOOM UI RULEBOOK
### The design and engineering standard for every screen we ship

Version 1.0 · Owner: whoever merges to main · Status: living document

> "A calmer you, a brighter tomorrow."
> Our interface should feel like that sentence: quiet, warm, unhurried, and trustworthy.

---

## TABLE OF CONTENTS

0. How to use this document
1. The Bloom design philosophy
2. What the best companies do, and what we borrow
3. Design tokens (the single source of truth)
4. Color rules
5. Typography rules
6. Spacing, layout and grid
7. Surfaces, borders and elevation (dark-mode physics)
8. Iconography and imagery
9. Component specifications
10. Page patterns
11. The state matrix (every component, every state)
12. Motion
13. Layering, overlays and the top layer
14. Accessibility (non-negotiable)
15. Responsive and adaptive behavior
16. Content design and microcopy
17. Data trust: numbers, dates, money
18. Performance as a design feature
19. Code architecture and conventions
20. The Mistakes Registry (what we got wrong, so we never repeat it)
21. The "Never" list
22. The premium 1% (details that separate good from exceptional)
23. QA procedure
24. Pull-request checklist and Definition of Done
25. Senior-dev mindset: tips for future development
26. Quick-reference cheat sheet
27. Roadmap

---

# 0. HOW TO USE THIS DOCUMENT

- **Designers and developers:** read sections 1-3 once, then keep 9, 11 and 24 open while building.
- **Reviewers:** use section 24 as your literal checklist.
- **When a rule conflicts with your taste:** the rule wins. If the rule is wrong, change the rule in a PR, not the screen.
- **When something is not covered:** pick the closest existing component and extend it. Never invent a one-off.

**Rule levels**

| Tag | Meaning |
|---|---|
| **MUST** | Blocks merge if violated |
| **SHOULD** | Needs a written reason to skip |
| **MAY** | Optional polish |

---

# 1. THE BLOOM DESIGN PHILOSOPHY

## 1.1 Our identity in five words

**Calm. Warm. Precise. Quiet. Earned.**

| Word | What it means in UI |
|---|---|
| Calm | Few things on screen, slow motion, no alarms unless truly urgent |
| Warm | Gold accents, warm whites, human copy, never cold blue-grey corporate |
| Precise | Aligned, consistent, numerically true, nothing approximately placed |
| Quiet | Hierarchy through spacing and weight, not through volume or color |
| Earned | Gold and emphasis are rare, so they mean something when they appear |

## 1.2 The seven laws

1. **Clarity over cleverness.** If a user pauses to decode it, the design failed.
2. **Status before prose.** Show state (numbers, badges, switches) first. Words only explain what the visuals cannot.
3. **One primary action per view.** One gold-filled button per viewport region.
4. **Deference.** The interface steps back so the user's content (moments, food, progress) is the hero.
5. **Consistency is trust.** Same job means same component. Always.
6. **Truth in every pixel.** Every number, date, count and status on screen must be real and internally consistent.
7. **Every state is designed.** Loading, empty, error, success, disabled and offline are not edge cases. They are the product half the time.

## 1.3 The 5-second scan test

Before shipping any section, show it to someone for five seconds and ask:

1. What is this?
2. What is my status?
3. What can I do here?

If they cannot answer all three, the layout is doing the explanation's job, and that is a bug.

## 1.4 Premium is subtraction

Premium products feel expensive because they:

- Use fewer colors, fewer font sizes, fewer borders, fewer shadows.
- Apply the same spacing math everywhere.
- Treat tiny details (alignment, number formatting, hover timing) as seriously as big features.
- Never show placeholder, broken or inconsistent data.

Our default move is always **remove**, not add.

---

# 2. WHAT THE BEST COMPANIES DO, AND WHAT WE BORROW

We do not copy their look. We copy their discipline.

| Company | Principle | How Bloom applies it |
|---|---|---|
| **Apple** | Clarity, deference, depth. Generous space. Large touch targets (44pt minimum). Hierarchy through type weight and size. Content is the hero. | One hero number per card. 44px touch targets. Soft depth through lighter surfaces, not heavy shadows. |
| **Google (Material)** | Strict grid (4/8 dp), elevation system, state layers, clear motion principles. 48dp targets. | Our 4/8 spacing grid, state matrix and motion tokens. |
| **Stripe** | Dense information that still feels calm. Excellent tables, forms, status badges. Copy is exact, not fluffy. | Badge system, settings rows, precise money/date formatting. |
| **Linear** | Speed is a feature. Keyboard-first. Almost no decoration. Subtle motion. | Fast transitions (under 200ms), visible focus rings, shortcuts for power actions. |
| **GitHub (Primer)** | Settings pages as clean rows. Danger zones isolated and confirmed. | Our settings-row pattern and Danger Zone card. |
| **Airbnb** | Rounded, friendly, photographic. Trust through clarity in pricing. | Rounded cards, transparent price breakdowns in the paywall. |
| **Notion** | Calm, content-first, collapsible structure. | `<details>` for rarely used forms. |
| **Vercel** | Black-and-white confidence, hairline borders, restrained accent. | Hairline borders and restraint with gold. |
| **Spotify/Headspace/Calm** | Emotional tone through color and copy, with calm motion. | Our "calm" voice, but never at the cost of clarity. |

**Bloom's own signature:** warm gold on deep ink, an editorial serif for moments of meaning, calm copy, and a leaf-like arc mark. That signature is what we protect. Everything else follows the discipline above.

---

# 3. DESIGN TOKENS: THE SINGLE SOURCE OF TRUTH

**RULE T1 (MUST):** No raw color, spacing, radius, shadow, duration or z-index value appears in a component. Components reference tokens only.

**RULE T2 (MUST):** Tokens come in two layers. *Primitives* (raw values) and *semantic* tokens (what a value means). Components use semantic tokens. This is how theming, light mode and rebrands become cheap.

## 3.1 Primitive tokens

```css
:root {
  /* Ink (neutrals, slightly warm-cool balanced for dark UI) */
  --ink-950: #07090c;
  --ink-900: #0b0d10;
  --ink-850: #101318;
  --ink-800: #13161b;
  --ink-750: #181c22;
  --ink-700: #1e232a;
  --ink-600: #2a3038;
  --ink-500: #3a414b;
  --ink-400: #6b717b;
  --ink-300: #8b9099;
  --ink-200: #a9adb4;
  --ink-100: #d4d6da;
  --ink-50:  #f3f0e9;   /* warm white: never pure #fff */

  /* Gold (brand accent) */
  --gold-200: #efdfbc;
  --gold-300: #e8d3a6;
  --gold-400: #dfc38f;
  --gold-500: #d6b579;
  --gold-600: #b8975c;
  --gold-700: #8f723f;

  /* Status */
  --green-400: #7fd6a4;
  --amber-400: #e8b85a;
  --red-400:   #ff8a8a;
  --red-600:   #d94f4f;
  --blue-400:  #7db4ff;
}
```

## 3.2 Semantic tokens

```css
:root {
  color-scheme: dark;  /* native selects, scrollbars, autofill, date pickers go dark */

  /* Surfaces */
  --bg:             var(--ink-900);
  --surface:        var(--ink-800);   /* cards */
  --surface-2:      var(--ink-750);   /* nested, hover, inputs */
  --surface-raised: var(--ink-700);   /* dialogs, menus, popovers */
  --surface-hover:  rgba(255,255,255,.03);

  /* Borders */
  --border:         rgba(255,255,255,.08);
  --border-strong:  rgba(255,255,255,.14);

  /* Text */
  --text-1: var(--ink-50);    /* primary */
  --text-2: var(--ink-200);   /* secondary */
  --text-3: var(--ink-300);   /* tertiary / placeholders (verify contrast) */
  --text-on-accent: #1a1409;

  /* Brand */
  --accent:        var(--gold-500);
  --accent-hover:  var(--gold-400);
  --accent-press:  var(--gold-600);
  --accent-dim:    rgba(214,181,121,.12);
  --accent-border: rgba(214,181,121,.38);

  /* Status */
  --success: var(--green-400);
  --warning: var(--amber-400);
  --danger:  var(--red-400);
  --info:    var(--blue-400);
  --danger-bg:     rgba(255,138,138,.06);
  --danger-border: rgba(255,138,138,.30);

  /* Focus */
  --ring: rgba(214,181,121,.65);

  /* Radius */
  --r-xs: 6px;
  --r-sm: 10px;
  --r-md: 14px;
  --r-lg: 20px;
  --r-pill: 999px;

  /* Spacing (4px base) */
  --s-1: 4px;   --s-2: 8px;   --s-3: 12px;  --s-4: 16px;
  --s-5: 20px;  --s-6: 24px;  --s-8: 32px;  --s-10: 40px;
  --s-12: 48px; --s-16: 64px; --s-20: 80px; --s-24: 96px;

  /* Elevation */
  --shadow-1: 0 1px 2px rgba(0,0,0,.35);
  --shadow-2: 0 6px 20px rgba(0,0,0,.35);
  --shadow-3: 0 18px 50px rgba(0,0,0,.5);
  --highlight: inset 0 1px 0 rgba(255,255,255,.04);

  /* Motion */
  --dur-1: 100ms;
  --dur-2: 160ms;
  --dur-3: 240ms;
  --dur-4: 360ms;
  --ease-out:    cubic-bezier(.2,.8,.2,1);
  --ease-in-out: cubic-bezier(.65,0,.35,1);
  --ease-spring: cubic-bezier(.34,1.36,.64,1);

  /* Layout */
  --sidebar-w: 220px;
  --content-max: 880px;
  --header-h: 56px;

  /* Z-index (only for non-top-layer UI) */
  --z-base: 0;
  --z-raised: 10;
  --z-sticky: 20;
  --z-dropdown: 30;
  --z-fab: 35;
  --z-toast: 50;
}
```

## 3.3 Token rules

- **T3 (MUST):** Never use `#000` or `#fff`. Use `--ink-950` and `--ink-50`. Pure black/white on screens causes harsh contrast and halation.
- **T4 (MUST):** Opacity is a token concern, not a component concern. If you need a new tint, add a token.
- **T5 (SHOULD):** Mirror tokens in a `tokens.json` so design tools and code never drift.
- **T6 (MUST):** Adding a token requires a PR note: what it is for and which existing token it could not satisfy.

---

# 4. COLOR RULES

## 4.1 The gold budget

Gold is our luxury signal. Spend it like money.

- **C1 (MUST):** At most **one gold-filled button per viewport**.
- **C2 (MUST):** Gold is allowed for: the primary action, the selected state, progress fills, links in running text, the active nav item, brand moments.
- **C3 (MUST NOT):** Use gold for decoration, borders on every card, headings, or icons that are not interactive or selected.
- **C4 (SHOULD):** Gold should cover less than roughly 5% of any screen's pixels.

> **Why:** In your screenshots, "Manage or upgrade", "Add to household", "Sharing off", the progress bar and "Browse all dishes" all compete with equal gold weight. When everything is gold, nothing is.

## 4.2 Contrast (WCAG 2.2 AA minimums)

| Element | Minimum ratio |
|---|---|
| Body text (under 18px, or under 14px bold) | **4.5:1** |
| Large text (24px+, or 18.66px+ bold) | **3:1** |
| UI component boundaries (inputs, switches) | **3:1** |
| Focus indicators | **3:1** against adjacent colors |
| Placeholder text | **4.5:1** |
| Disabled text | Exempt, but must still be legible |

- **C5 (MUST):** Verify every text/background pair with a contrast checker. Do not eyeball dark themes. Low-contrast grey on near-black is the number one dark-mode failure.
- **C6 (MUST):** Input borders must reach 3:1 against the page surface. `rgba(255,255,255,.08)` is fine for decorative card edges but **not** for form fields. Use `--border-strong` or brighter on inputs.

## 4.3 Color never works alone

- **C7 (MUST):** Never convey state by color only. Pair with an icon, text or shape (e.g., danger = red + warning icon + word "Delete").
- **C8 (MUST):** Status colors have fixed meanings:
  - Green = success, verified, active
  - Amber = attention, low, expiring
  - Red = destructive, error, irreversible
  - Blue = neutral information
  - Gold = brand, selected, primary
- **C9 (MUST NOT):** Use red for routine actions. "Sign out on this device" is routine and should be neutral. "Sign out everywhere" and "Delete account" earn red.

## 4.4 Dark-mode specific rules

- **C10:** Depth is expressed by getting **lighter**, not darker. Higher elevation means lighter surface.
- **C11:** Reduce saturation of status colors versus light mode so they do not vibrate on dark backgrounds.
- **C12:** Avoid large areas of saturated color. Use tinted backgrounds (`rgba(color, .06-.14)`) with a matching border.
- **C13:** Always set `color-scheme: dark`. Otherwise native controls render white.

## 4.5 Light mode readiness

Even if we never ship light mode, structure for it: components use only semantic tokens, so flipping is a token swap.

```css
@media (prefers-color-scheme: light) {
  :root[data-theme="auto"] {
    color-scheme: light;
    --bg: #faf8f4;
    --surface: #ffffff;
    --text-1: #15171a;
    /* ...remaining semantic tokens... */
  }
}
```

---

# 5. TYPOGRAPHY RULES

## 5.1 Type roles

| Role | Family | Used for |
|---|---|---|
| **Display** | Editorial serif (current brand serif) | Page titles, section titles, big numbers' context, quotes, tagline |
| **UI** | Neutral sans (Inter or system) | Everything interactive: labels, buttons, body, tables |
| **Data / Code** | Monospace | Referral codes, IDs, keys, timestamps in logs |

- **TY1 (MUST):** Serif is for meaning and moments. Never use serif for buttons, form labels, tables, badges or microcopy.
- **TY2 (MUST):** Never use monospace for status words ("signed in", "Verified", "active here"). Use the badge component in the UI font. Mono is for machine-like strings only.
- **TY3 (MUST):** Maximum two families on one screen, plus mono where a code appears.
- **TY4 (MUST):** Use a heading serif without swash ampersands. A display font that renders `&` like `℅` hurts scanning. Either use the font's alternate glyph (`font-feature-settings`), replace the character, or write "and".

## 5.2 The scale

Use this scale only. Do not invent 17px or 21px.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--fs-display` | clamp(32px, 4vw, 44px) / 1.1 | serif 500 | Page hero / identity name |
| `--fs-h1` | 30px / 1.2 | serif 500 | Page title |
| `--fs-h2` | 24px / 1.25 | serif 500 | Section title |
| `--fs-h3` | 18px / 1.35 | sans 600 | Card / row title |
| `--fs-body` | 16px / 1.6 | sans 400 | Body copy |
| `--fs-ui` | 15px / 1.5 | sans 500 | Buttons, inputs, rows |
| `--fs-small` | 14px / 1.5 | sans 400 | Supporting text |
| `--fs-caption` | 12px / 1.4 | sans 500 | Badges, helper, meta |
| `--fs-eyebrow` | 11.5px / 1.3, tracking .12em, uppercase | sans 600 | Eyebrow labels (sparingly) |
| `--fs-stat` | 30-40px / 1.1, tabular-nums | sans 600 | Hero numbers |

```css
:root {
  --font-display: "Fraunces", "Playfair Display", Georgia, serif; /* use your existing brand serif */
  --font-ui: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}

body {
  font: 400 16px/1.6 var(--font-ui);
  color: var(--text-1);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.num { font-variant-numeric: tabular-nums; }  /* digits align, no jitter */
```

## 5.3 Typography rules in detail

- **TY5 (MUST):** Body line length 45-75 characters. Use `max-width: 65ch` on paragraphs. A paragraph running across a 900px card is a fail.
- **TY6 (MUST):** Minimum text size 12px, and only for non-essential captions. Core reading text is 14px+.
- **TY7 (SHOULD):** Eyebrow labels (small uppercase) are a seasoning. **One per card maximum** and never stacked on a heading that says the same thing. Stacks like `ACCOUNT → Account & data → ACCOUNT` are a fail.
- **TY8 (MUST):** Use `font-variant-numeric: tabular-nums` on all numbers that update or sit in columns (credits, points, prices, counts).
- **TY9 (MUST):** Headings use weight and size for hierarchy, not color. Do not make headings gold.
- **TY10 (SHOULD):** Never center-align more than 2 lines. Left-align body text.
- **TY11 (MUST):** `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs to avoid orphans.
- **TY12 (MUST):** Do not letter-space lowercase text. Letter-spacing is for uppercase eyebrows only.
- **TY13 (MUST):** Use real typographic characters: `…` not `...`, `—` for dashes, `×` for multiply/close, curly quotes.
- **TY14 (SHOULD):** Preload only the critical font weights (400, 500, 600) with `font-display: swap`, and size-adjust the fallback to prevent layout shift.

```css
h1, h2, h3 { text-wrap: balance; }
p { text-wrap: pretty; max-width: 65ch; }
```

---

# 6. SPACING, LAYOUT AND GRID

## 6.1 The 4/8 system

- **L1 (MUST):** All spacing is a token from the scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64...). No `margin: 13px`.
- **L2 (MUST):** Internal spacing is always **smaller or equal** to external spacing. This is the law of proximity: related things sit closer than unrelated things.

| Relationship | Space |
|---|---|
| Icon to label | 8px |
| Label to input | 6-8px |
| Heading to its description | 4-8px |
| Row to row inside a card | 16-20px (with divider) |
| Card padding | 24px (20px on mobile) |
| Card to card | 16-24px |
| Section to section | 48-64px |

## 6.2 Page structure

```
┌───────────┬──────────────────────────────────────────┐
│           │   Page header (identity / title)          │
│  Sidebar  │   Tabs (sticky)                           │
│  220px    │   ─────────────────────────────────────── │
│           │   Content column  (max 880px)             │
│           │                                           │
└───────────┴──────────────────────────────────────────┘
```

- **L3 (MUST):** Content column max-width ≈ 880px (settings) or 1120px (dashboards). Never full-bleed text.
- **L4 (MUST):** Sidebar stays fixed and does not scroll with content. Anything in the sidebar must exist **once** (see Mistake M-02: duplicated points card).
- **L5 (SHOULD):** On very wide screens, center the content column rather than hugging the sidebar, or use a two-column layout (content + sticky side nav).

## 6.3 Alignment

- **L6 (MUST):** Every card in a column shares the same left and right edges. In the screenshots, some cards (moments) are narrower than the others. Decide on a grid and keep to it.
- **L7 (MUST):** Left edges of text align across components. A heading, its paragraph and the row beneath start at the same x.
- **L8 (SHOULD):** Optical alignment. Large rounded buttons and icons may need 1-2px nudges to look aligned.

## 6.4 Density

Bloom is a **calm** product: default to comfortable density.

- Row height: 56-64px (touch-friendly), 44px minimum.
- Never use dense/compact mode for health or money information.

## 6.5 The card rule

- **L9 (MUST):** A card contains **one topic**. If the card's intro paragraph describes two features, split it or use rows.
- **L10 (MUST NOT):** Nest card-inside-card-inside-card. Maximum one level of nested surface (e.g., a form inside a card). Prefer dividers and spacing.
- **L11 (SHOULD):** If a card's content exceeds roughly 480px tall, collapse the secondary part (`<details>`, "Show more") or move it behind an action.

---

# 7. SURFACES, BORDERS AND ELEVATION (DARK-MODE PHYSICS)

## 7.1 Surface ladder

| Level | Token | Use |
|---|---|---|
| 0 | `--bg` | Page |
| 1 | `--surface` | Cards |
| 2 | `--surface-2` | Inputs, nested blocks, hover |
| 3 | `--surface-raised` | Dialogs, menus, popovers |

**S1 (MUST):** Each step up is lighter. Do not skip levels to create contrast. Do not put a Level-1 element inside another Level-1 element.

## 7.2 Borders

- **S2 (MUST):** Hairline borders: `1px solid var(--border)`. Never 2px for decoration.
- **S3 (MUST):** A border exists to separate surfaces. If spacing already separates them, remove the border.
- **S4 (SHOULD):** Prefer dividers (`border-top` between rows) over boxing each row.

## 7.3 Shadows and glows

- **S5 (MUST):** Cards: no drop shadow in dark mode (borders + lighter surface do the work). Dialogs and menus: `--shadow-3`.
- **S6 (MUST NOT):** Use colored glows (like the gold glow under buttons) on every button. In dark UI, glow reads as cheap. Allowed: one subtle glow on a hero CTA at most, ideally only on hover.
- **S7 (SHOULD):** Add a 1px top inner highlight (`--highlight`) on raised surfaces. It simulates light from above and is a classic premium detail.

## 7.4 Card recipe

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  box-shadow: var(--highlight);
  padding: var(--s-6);
}
@media (max-width: 560px) { .card { padding: var(--s-5); } }
```

---

# 8. ICONOGRAPHY AND IMAGERY

## 8.1 Icons

- **I1 (MUST):** One icon family, one stroke weight (1.5px at 20px or 24px). Do not mix filled and outlined in the same context.
- **I2 (MUST):** Sizes: 16 (inline), 20 (rows, buttons), 24 (nav). No other sizes.
- **I3 (MUST):** Icon-only buttons need an `aria-label` and a tooltip, and a 44px hit area even if the glyph is 20px.
- **I4 (SHOULD):** Icons inherit `currentColor`, so state color changes apply automatically.
- **I5 (MUST):** Decorative icons get `aria-hidden="true"`.

```html
<button class="icon-btn" aria-label="Copy referral code">
  <svg width="20" height="20" aria-hidden="true">...</svg>
</button>
```

```css
.icon-btn {
  width: 44px; height: 44px; display: grid; place-items: center;
  border-radius: var(--r-sm); color: var(--text-2);
}
.icon-btn:hover { background: var(--surface-hover); color: var(--text-1); }
```

## 8.2 Imagery and media

- **I6 (MUST):** Every media slot has a designed fallback. Never ship an empty dark rectangle (Mistake M-03).
- **I7 (MUST):** Reserve space with `aspect-ratio` to prevent layout shift.
- **I8 (SHOULD):** User photos get a subtle inner border (`inset 0 0 0 1px rgba(255,255,255,.06)`) so they do not bleed into dark surfaces.
- **I9 (MUST):** Use `loading="lazy"`, `decoding="async"` and explicit width/height on images below the fold.
- **I10 (SHOULD):** Provide meaningful `alt` text for content images (what the moment shows), and empty `alt=""` for decorative ones.

```css
.media {
  aspect-ratio: 16 / 10;
  background: linear-gradient(135deg, var(--ink-750), #2a241d);
  border-radius: var(--r-md) var(--r-md) 0 0;
  overflow: hidden;
}
.media img { width: 100%; height: 100%; object-fit: cover; }
```

---

# 9. COMPONENT SPECIFICATIONS

Every component below defines **anatomy, variants, sizes, states, rules and code**. Build once in `/components`, reuse everywhere.

---

## 9.1 Button

**Anatomy:** [icon?] label [icon?]

**Variants**

| Variant | Use | Limit |
|---|---|---|
| `primary` | The main action | 1 per viewport region |
| `secondary` | Alternate actions | Many |
| `ghost` | Tertiary, toolbar, inline | Many |
| `danger` | Destructive | Always with confirm for irreversible |
| `link` | Navigation-like inline | Many |

**Sizes**

| Size | Height | Padding | Use |
|---|---|---|---|
| `sm` | 32px | 0 12px | Dense desktop areas only |
| `md` | 40px | 0 16px | Default |
| `lg` | 48px | 0 24px | Hero CTAs, mobile primary |

- **B1 (MUST):** On touch devices (`pointer: coarse`), every button's hit area is at least 44x44px.
- **B2 (MUST):** Button labels are verbs: "Add to household", "Copy code", "Manage plan". Not "Submit", "OK", "Click here".
- **B3 (MUST):** A button that shows status but does nothing is **not a button**. Use a badge. ("Your current plan" and "Included in your plan" in the paywall are fails, Mistake M-07.)
- **B4 (MUST):** Show loading inside the button (spinner + disabled + keep width), never remove the label silently.
- **B5 (MUST):** Disabled buttons need a reason somewhere nearby (helper text or tooltip). Prefer enabled-with-validation over disabled-with-mystery.
- **B6 (MUST):** Do not change a button's width between states (use `min-width` or a fixed width for "Copy" / "Copied").

```css
.btn {
  --h: 40px;
  display: inline-flex; align-items: center; justify-content: center; gap: var(--s-2);
  height: var(--h); padding: 0 var(--s-4);
  border-radius: var(--r-pill);
  font: 600 15px/1 var(--font-ui);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background var(--dur-2) var(--ease-out),
              border-color var(--dur-2) var(--ease-out),
              transform var(--dur-1) var(--ease-out),
              box-shadow var(--dur-2) var(--ease-out);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.btn:active { transform: scale(.98); }
.btn[disabled], .btn[aria-disabled="true"] { opacity: .45; cursor: not-allowed; transform: none; }

.btn--primary {
  background: var(--accent);
  color: var(--text-on-accent);
}
.btn--primary:hover  { background: var(--accent-hover); }
.btn--primary:active { background: var(--accent-press); }

.btn--secondary {
  background: var(--surface-2);
  color: var(--text-1);
  border-color: var(--border-strong);
}
.btn--secondary:hover { background: var(--surface-raised); }

.btn--ghost { background: transparent; color: var(--text-2); }
.btn--ghost:hover { background: var(--surface-hover); color: var(--text-1); }

.btn--danger {
  background: transparent; color: var(--danger);
  border-color: var(--danger-border);
}
.btn--danger:hover { background: var(--danger-bg); }

.btn--sm { --h: 32px; padding: 0 var(--s-3); font-size: 14px; }
.btn--lg { --h: 48px; padding: 0 var(--s-6); font-size: 16px; }

@media (pointer: coarse) {
  .btn { min-height: 44px; }
  .btn--sm { min-height: 44px; }
}

.btn[data-loading="true"] { pointer-events: none; position: relative; color: transparent; }
.btn[data-loading="true"]::after {
  content: ""; position: absolute; width: 16px; height: 16px;
  border: 2px solid currentColor; border-color: var(--text-on-accent) transparent;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

> Note: the solid gold above replaces the gradient-plus-glow style currently in use. A flat gold with a clean hover reads more refined. If you keep a gradient, keep it to a 2-3% luminance shift.

---

## 9.2 Form controls

**Text input, select, textarea share one spec.**

- **F1 (MUST):** Visible `<label>` above every field. Placeholders are examples, never labels.
- **F2 (MUST):** Field height 44px (48px on mobile). Radius `--r-sm`. Border `--border-strong`.
- **F3 (MUST):** Show helper text under the field if format matters; show errors in the same slot with an icon and `aria-describedby`.
- **F4 (MUST):** Mark optional rather than required when most fields are required ("Optional" in muted text beside label).
- **F5 (MUST):** Use correct `type`, `inputmode`, `autocomplete` attributes. Mobile keyboards are part of the UI.
- **F6 (MUST):** Validate on blur (first time) then on input, never shout errors while the user is still typing the first character.
- **F7 (MUST):** Preserve typed values on error. Never clear a form on failure.
- **F8 (SHOULD):** Comma-separated lists (allergies, dislikes) should become **tag inputs**: type, press Enter or comma, a chip appears. It is more forgiving and shows how the app understood the input.
- **F9 (MUST):** After success, give inline confirmation and move focus sensibly.

```html
<div class="field">
  <label for="hh-name">Name <span class="opt">Optional</span></label>
  <input id="hh-name" class="input" type="text" autocomplete="off" placeholder="e.g. Amma">
  <p class="help" id="hh-name-help">How they will appear in your meal plans.</p>
</div>
```

```css
.field { display: grid; gap: 6px; }
.field label { font: 500 14px/1.3 var(--font-ui); color: var(--text-1); }
.field .opt { color: var(--text-3); font-weight: 400; margin-left: 6px; }
.help { font-size: 13px; color: var(--text-3); }

.input, .select, .textarea {
  width: 100%; min-height: 44px; padding: 10px 14px;
  background: var(--surface-2);
  color: var(--text-1);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-sm);
  font: 400 15px/1.4 var(--font-ui);
  transition: border-color var(--dur-2), box-shadow var(--dur-2), background var(--dur-2);
}
.input::placeholder { color: var(--text-3); }
.input:hover { border-color: rgba(255,255,255,.22); }
.input:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim);
}
.input[aria-invalid="true"] { border-color: var(--danger); }
.input[aria-invalid="true"]:focus-visible { box-shadow: 0 0 0 3px var(--danger-bg); }
.input:disabled { opacity: .5; cursor: not-allowed; }

.error { display: flex; gap: 6px; align-items: center; color: var(--danger); font-size: 13px; }
```

**Custom select:** keep native `<select>` on mobile (best UX). On desktop you may style the closed state with `appearance: none` plus a custom chevron, but never replace it with an inaccessible div.

```css
.select {
  appearance: none;
  background-image: url("data:image/svg+xml,...chevron...");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px;
}
```

---

## 9.3 Switch (toggle)

- **SW1 (MUST):** A switch applies immediately. If it needs a "Save" button, use a checkbox.
- **SW2 (MUST):** Use `role="switch"` and `aria-checked`. Label it with the setting name, not "on/off".
- **SW3 (MUST):** Track 44x26px, thumb 20px. Off state still has a visible 3:1 boundary.
- **SW4 (SHOULD):** Do **both** a switch and a state word only if the state is not obvious. Do not also add a paragraph that says "Sharing is off."
- **SW5 (MUST):** If turning a switch on has consequences (sharing data), show the preview or confirmation **before** committing, and revert the switch if the user cancels.

```css
.switch {
  width: 44px; height: 26px; padding: 0; border-radius: var(--r-pill);
  background: var(--surface-2); border: 1px solid var(--border-strong);
  position: relative; cursor: pointer;
  transition: background var(--dur-2), border-color var(--dur-2);
}
.switch .knob {
  position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%;
  background: var(--text-2);
  transition: transform var(--dur-3) var(--ease-spring), background var(--dur-2);
}
.switch[aria-checked="true"] { background: var(--accent-dim); border-color: var(--accent-border); }
.switch[aria-checked="true"] .knob { transform: translateX(18px); background: var(--accent); }
```

---

## 9.4 Badge (status label)

- **BD1 (MUST):** One component for all statuses: "Verified", "Yearly", "Active here", "Signed in", "Off", "Omnivore".
- **BD2 (MUST):** Sentence case, UI font, 12px, 500 weight. Never mono, never random capitalization.
- **BD3 (MUST):** Not interactive. If it is clickable, it is a chip or button.
- **BD4 (SHOULD):** Optional leading dot or icon for color-independent meaning.

```css
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  height: 24px; padding: 0 10px;
  font: 500 12px/1 var(--font-ui); letter-spacing: .01em;
  color: var(--text-2);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-pill);
  white-space: nowrap;
}
.badge--ok   { color: var(--success); border-color: rgba(127,214,164,.35); background: rgba(127,214,164,.06); }
.badge--acc  { color: var(--accent);  border-color: var(--accent-border);  background: var(--accent-dim); }
.badge--warn { color: var(--warning); border-color: rgba(232,184,90,.35);  background: rgba(232,184,90,.06); }
.badge--bad  { color: var(--danger);  border-color: var(--danger-border);  background: var(--danger-bg); }
```

---

## 9.5 Chip

- Interactive or removable tag (dietary tags, dish chips, filters).
- Height 32px, radius pill, `--surface-2` background, 14px text.
- Removable chips have a 24px "×" with `aria-label="Remove bottle gourd"`.
- **CH1 (MUST):** Lists of data like "Dislikes: bottle gourd, bitter gourd, ridge gourd" are chips, not sentences.

---

## 9.6 Card, Row and Section header

**Card:** see 7.4.

**Section header**

```html
<header class="card-head">
  <h2>Trainer &amp; clinician</h2>
  <p class="muted">Bring your professional into Bloom, on your terms.</p>
</header>
```

- **CD1 (MUST):** One heading + at most one line of supporting copy.
- **CD2 (MUST):** Heading text equals the nav pill text (Rule N1).

**Settings row** (the workhorse)

```
┌──────────────────────────────────────────────────────────┐
│ Title                                          [Control] │
│ One muted line of explanation.                           │
└──────────────────────────────────────────────────────────┘
```

```css
.row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-6);
  padding: var(--s-5) 0;
  border-top: 1px solid var(--border);
}
.row:first-child { border-top: 0; }
.row h3 { font: 600 15px/1.4 var(--font-ui); }
.row .muted { color: var(--text-2); font-size: 14px; max-width: 52ch; margin-top: 2px; }
.row-control { display: flex; align-items: center; gap: var(--s-3); flex-shrink: 0; }

@media (max-width: 640px) {
  .row { flex-direction: column; gap: var(--s-3); }
  .row-control { width: 100%; justify-content: space-between; }
}
```

**Navigational row** (like "Sign out ›"): whole row is clickable, chevron right, hover background, minimum height 56px. The entire row is the hit target, not just the text.

---

## 9.7 Stat (hero number)

- **ST1 (MUST):** The number is the hero: 30-40px, tabular-nums. Label is small and muted.
- **ST2 (MUST):** Label sits **below or beside** the value, never far away.
- **ST3 (SHOULD):** Numbers animate on change (count up over 300-500ms), but only on meaningful updates, never on first paint, and not when `prefers-reduced-motion`.

```html
<p class="stat">
  <span class="stat-value num">800</span>
  <span class="stat-of">of 800</span>
  <span class="stat-label">AI credits left this month</span>
</p>
```

---

## 9.8 Meter / progress

- **PR1 (MUST):** `role="progressbar"` (for task progress) or `role="meter"` (for a quantity like credits) with `aria-valuenow/min/max` and a text label.
- **PR2 (MUST):** Height 6-8px, radius pill, track `--surface-2`, fill `--accent`.
- **PR3 (MUST):** Define the low/empty states up front: <=25% amber, <=10% red, with a message and an action ("Top up").
- **PR4 (MUST NOT):** Use the meter as the only way to read the value. The number must also be shown.

```html
<div class="meter" role="meter" aria-valuemin="0" aria-valuemax="800" aria-valuenow="800"
     aria-label="AI credits remaining">
  <div class="meter-fill" style="width:100%"></div>
</div>
```

```css
.meter { height: 6px; background: var(--surface-2); border-radius: var(--r-pill); overflow: hidden; }
.meter-fill { height: 100%; background: var(--accent); border-radius: inherit;
  transition: width var(--dur-4) var(--ease-out); }
.meter-fill[data-level="low"]   { background: var(--warning); }
.meter-fill[data-level="empty"] { background: var(--danger); }
```

---

## 9.9 Navigation

### 9.9.1 Sidebar

- **N-S1 (MUST):** Active item has: tinted background, 2px accent indicator, `aria-current="page"`, and brighter text. Not color alone.
- **N-S2 (MUST):** Item height 40-44px, icon 20px, gap 12px.
- **N-S3 (MUST):** Footer user block is the only place for account identity. Gamification (points) appears in **one** place.
- **N-S4 (SHOULD):** Collapse to icon rail at medium widths, bottom tab bar on mobile (max 5 items).

### 9.9.2 Tabs vs. pills vs. links

| Pattern | Use when |
|---|---|
| **Tabs** (`role="tablist"`) | Switch views *in place* at the same URL (Moments / Highlights / Journey) |
| **Pill anchor nav** | Jump within one long page (Membership / Trainer / Household...) |
| **Segmented control** | Switch a *mode* of the same data (Monthly / Yearly) |
| **Links** | Go to a different page |

- **N1 (MUST):** **Pill text = section eyebrow = section heading.** One name per concept.
- **N2 (MUST):** A section nav lists **every** section on the page. A menu that misses some trains users to distrust it.
- **N3 (MUST):** Show the active section via scroll-spy (`aria-current="true"`).
- **N4 (MUST):** Sticky bars get a backdrop (blur + translucent bg) and a bottom border so content never collides with them.
- **N5 (MUST):** Anchor targets have `scroll-margin-top` equal to sticky-header height + 16px.
- **N6 (SHOULD):** Sync active tab/section to the URL hash so it is shareable and back-button friendly.
- **N7 (SHOULD):** On mobile, pills scroll horizontally with edge fade, rather than wrapping.

```css
.tabbar {
  position: sticky; top: 0; z-index: var(--z-sticky);
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: saturate(1.4) blur(14px);
  border-bottom: 1px solid var(--border);
}
.tab { position: relative; padding: 14px 4px; margin-right: 20px; color: var(--text-2); }
.tab[aria-selected="true"] { color: var(--text-1); }
.tab[aria-selected="true"]::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px;
  background: var(--accent); border-radius: 2px;
}

.pills {
  display: flex; gap: var(--s-2); overflow-x: auto; scrollbar-width: none;
  mask-image: linear-gradient(90deg, #000 92%, transparent);
}
.pill {
  flex: none; height: 36px; padding: 0 16px; display: inline-flex; align-items: center;
  border: 1px solid var(--border-strong); border-radius: var(--r-pill);
  color: var(--text-2); font: 500 14px var(--font-ui);
  transition: all var(--dur-2) var(--ease-out);
}
.pill:hover { color: var(--text-1); background: var(--surface-hover); }
.pill[aria-current="true"] { color: var(--accent); border-color: var(--accent-border); background: var(--accent-dim); }

section[id] { scroll-margin-top: calc(var(--header-h) + 56px); }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

---

## 9.10 Dialog (modal)

**Always native `<dialog>` + `showModal()`.** It gives us the top layer (nothing can overlap it), focus trapping, Escape-to-close and inertness of the background.

- **D1 (MUST):** A visible close button (top-right, 44px target) **and** Escape **and** backdrop click for non-destructive dialogs.
- **D2 (MUST):** Max height `min(86dvh, 760px)`; content scrolls **inside** the dialog; header/footer can stay pinned.
- **D3 (MUST):** Backdrop is opaque enough (about .7) with blur, so underlying text never reads through.
- **D4 (MUST):** Lock page scroll while open.
- **D5 (MUST):** Focus moves into the dialog on open (first focusable or heading) and returns to the trigger on close.
- **D6 (MUST):** Mobile (<560px): full-screen sheet or bottom sheet with drag handle.
- **D7 (MUST):** Confirmation dialogs: title states the consequence ("Sign out everywhere?"), body states what happens and what does not, buttons are verbs, the destructive button is visually distinct, and focus starts on **Cancel**.
- **D8 (MUST):** Only one dialog at a time. No dialog launches another dialog.
- **D9 (SHOULD):** Open: scale .98 → 1 + fade over 240ms. Close: faster (160ms).

```html
<dialog id="paywall" class="modal" aria-labelledby="paywall-title">
  <header class="modal-head">
    <h2 id="paywall-title">Bloom Premium</h2>
    <button class="icon-btn" aria-label="Close" data-close>✕</button>
  </header>
  <div class="modal-body"><!-- scrollable content --></div>
  <footer class="modal-foot"><!-- pinned fine print / actions --></footer>
</dialog>
```

```css
.modal {
  width: min(720px, calc(100vw - 32px));
  max-height: min(86dvh, 760px);
  padding: 0; margin: auto;
  background: var(--surface-raised);
  color: var(--text-1);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-3), var(--highlight);
  overflow: hidden;
}
.modal[open] { display: flex; flex-direction: column; animation: modal-in var(--dur-3) var(--ease-out); }
.modal::backdrop { background: rgba(3,5,7,.72); backdrop-filter: blur(6px); }

.modal-head { display:flex; justify-content:space-between; align-items:center;
  padding: var(--s-5) var(--s-6); border-bottom: 1px solid var(--border); }
.modal-body { overflow-y: auto; overscroll-behavior: contain; padding: var(--s-6); flex: 1; }
.modal-foot { padding: var(--s-4) var(--s-6); border-top: 1px solid var(--border);
  color: var(--text-3); font-size: 13px; }

body:has(dialog[open]) { overflow: hidden; }

@keyframes modal-in { from { opacity: 0; transform: translateY(8px) scale(.98); } }

@media (max-width: 560px) {
  .modal { width: 100vw; max-width: none; height: 100dvh; max-height: none; border-radius: 0; }
}
```

```js
const dlg = document.getElementById("paywall");
let opener = null;

export function openDialog(el, trigger) {
  opener = trigger ?? document.activeElement;
  el.showModal();
}
dlg.addEventListener("close", () => opener?.focus());
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) dlg.close();                // click on ::backdrop area
  if (e.target.closest("[data-close]")) dlg.close();
});
```

> The `e.target === dlg` check works when the dialog has zero padding and all content lives in child elements, as in the structure above.

---

## 9.11 Pricing / plan cards (paywall)

- **PC1 (MUST):** The user's **current plan** is unmistakable: "Current plan" badge + accent border + disabled/absent CTA. Do not highlight a *different* plan with the stronger border.
- **PC2 (MUST):** Status ("Your current plan", "Included in your plan") is a **badge**, not a button.
- **PC3 (MUST):** Price block hierarchy: price (hero), cadence (small), equivalent (muted), savings (accent badge).
- **PC4 (MUST):** Show what will be charged and when. Yearly: "₹7,999 billed yearly · renews 18 Nov 2026".
- **PC5 (MUST):** Show how savings were computed or keep the claim verifiably true. "Save 44%" must match math. Check it.
- **PC6 (SHOULD):** Feature lists: 5-7 items max, check icons in `--accent`, each item one line where possible, bold the *differentiator* ("800 AI credits a month").
- **PC7 (SHOULD):** "Everything in Premium" pattern for higher tiers. Never repeat the whole list.
- **PC8 (MUST):** Segmented control for Monthly/Yearly with `role="radiogroup"` semantics. Changing it updates every price on the cards.
- **PC9 (MUST):** For users already on the top plan, replace the comparison with a "Manage" experience (renewal date, invoices, cancel) instead of a sales pitch.

---

## 9.12 Toast

- **TO1 (MUST):** Confirms an action that has no other visible result ("Code copied", "Member added"). Do not toast what the UI already shows.
- **TO2 (MUST):** Position bottom-center (mobile) / bottom-left (desktop) above the FAB, 4s auto-dismiss, pause on hover/focus.
- **TO3 (MUST):** `role="status"` (polite) for success; `role="alert"` for errors; errors do **not** auto-dismiss.
- **TO4 (MUST NOT):** Use toast for critical information or anything requiring a decision.
- **TO5 (SHOULD):** Offer "Undo" for reversible actions instead of confirm dialogs. This is the Apple/Google pattern, and it feels much faster.

```css
.toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  background: var(--surface-raised); border: 1px solid var(--border-strong);
  padding: 12px 16px; border-radius: var(--r-pill); box-shadow: var(--shadow-2);
  z-index: var(--z-toast);
  animation: toast-in var(--dur-3) var(--ease-out);
}
@keyframes toast-in { from { opacity: 0; transform: translate(-50%, 8px); } }
```

---

## 9.13 Empty state

Every list/feed needs one.

Anatomy: small illustration or icon → one-line title → one-line explanation → one action.

- **E1 (MUST):** Tell the user why it is empty and what to do next.
- **E2 (MUST):** Voice stays Bloom: "No moments yet. Your first check-in will appear here."
- **E3 (MUST NOT):** Show an empty bordered box or a blank area.

## 9.14 Skeleton / loading

- **SK1 (MUST):** Use skeletons that match the final layout for loads over ~300ms. Spinners only for button/inline actions.
- **SK2 (MUST):** Do not show a skeleton for under 200ms (flash). Delay it.
- **SK3 (MUST):** Skeleton shimmer is slow (1.6s+), low-contrast, and stops with `prefers-reduced-motion`.

```css
.skel { background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-raised) 37%, var(--surface-2) 63%);
  background-size: 400% 100%; animation: shimmer 1.8s ease infinite; border-radius: var(--r-xs); }
@keyframes shimmer { 0% { background-position: 100% 0 } 100% { background-position: 0 0 } }
@media (prefers-reduced-motion: reduce) { .skel { animation: none; } }
```

## 9.15 Banner / alert (inline)

- Persistent, in-flow messages: info, warning, error, success.
- Layout: icon, title (optional), one-two lines, optional action, optional dismiss.
- Left accent border 3px or tinted background. Always icon + text.
- **AL1 (MUST):** Use for states that persist (payment failed, offline). Not for confirmations (use toast).

## 9.16 Avatar

- Sizes 24/32/40/64/96, circle, `object-fit: cover`, fallback to initials on `--surface-2`.
- Verified badge sits at bottom-right, max 40% of avatar size, with a 2px ring in the surface color.
- Online dot: `aria-label` or text alternative, never color only.

## 9.17 Tooltip and popover

- **Tooltip:** description of an icon-only control. Shows on hover **and** focus. 600ms hover delay, no interactive content. Use `role="tooltip"` with `aria-describedby`.
- **Popover/menu:** interactive. Use the native `popover` attribute where possible (top layer, light dismiss). Arrow-key navigation for menus.
- **Never** hide essential information in a tooltip. Touch users cannot see it.

## 9.18 Table / data list

- Use real `<table>` for tabular data. Right-align numbers, tabular-nums, sticky header, row hover.
- On mobile, convert rows to stacked cards. Do not horizontally scroll a table unless unavoidable.

## 9.19 Danger zone

```html
<section class="danger-card" id="danger">
  <h2>Danger zone</h2>
  <div class="row">
    <div>
      <h3>Delete account</h3>
      <p class="muted">Permanently removes your record. This cannot be undone.</p>
    </div>
    <button class="btn btn--danger">Delete account</button>
  </div>
</section>
```

```css
.danger-card {
  border: 1px solid var(--danger-border);
  background: var(--danger-bg);
  border-radius: var(--r-md); padding: var(--s-6);
}
.danger-card h2 { color: var(--danger); font: 600 15px var(--font-ui); }
```

- **DZ1 (MUST):** Irreversible actions require **type-to-confirm** (type the email or "DELETE"); the confirm button stays disabled until it matches.
- **DZ2 (MUST):** State exactly what is lost, and offer export before deletion.
- **DZ3 (SHOULD):** Place at the bottom, separated by generous space, and include it in the section nav.

## 9.20 Floating action button / assistant widget

- **FAB1 (MUST):** Must not cover content or controls. Reserve bottom padding on pages (`padding-bottom: 96px`).
- **FAB2 (MUST):** Hidden or inert while a dialog is open (top layer handles this for native dialogs).
- **FAB3 (MUST):** Do not stack **two** floating widgets (assistant bubble + back-to-top) at the same edge without a plan. Consolidate or space them with a defined offset.
- **FAB4 (SHOULD):** Back-to-top appears only after scrolling >1.5 screens.

---

# 10. PAGE PATTERNS

## 10.1 Profile page (Plan A, final structure)

```
Identity header (avatar · name · plan badge · member since)
Tabs (sticky): Moments · Highlights · Journey
 └ tab content (moment grid etc.)

Account (H2)
 Pills (sticky within page): Account · Membership · Trainer · Household · Personalization · Sessions · Danger
 
 [Account]          rows: email, verification, tracking since
 [Membership]       plan card (identity → status → action)
 [Trainer]          settings rows (referral, share summary)
 [Household]        member list (chips) + collapsible add form + dish teaser
 [Personalization]  switches (cycle tracking etc.)
 [Sessions]         devices (info) / actions (sign out)
 [Danger zone]      isolated card
```

**Rules**

- **PG1 (MUST):** The page has exactly one `<h1>`: the identity name or "Profile".
- **PG2 (MUST):** Moment cards: consistent aspect ratio, consistent width grid (e.g., 2-3 columns), real titles, fallback media, date formatted by the shared formatter.
- **PG3 (MUST):** Each account section is a `<section id aria-labelledby>` card, ordered by frequency of use and consequence (safe → dangerous).
- **PG4 (SHOULD):** If the Account area grows beyond ~8 sections, **graduate to Plan B** (separate Settings page). Plan A is a stage, not a destination.

## 10.2 Membership card (status card pattern)

```
Row 1: Plan name + cycle badge ................ Renews 18 Nov 2026
Row 2: 800 of 800  AI credits left this month
       [██████████████████████████████]
Row 3: One muted description ............ [Manage or upgrade]
```

Reusable for any "plan/usage" object (storage, credits, coach sessions).

## 10.3 Settings page rules (any settings screen)

1. Group by user task, not by database table.
2. Order: Account → Preferences → Connections → Billing → Security → Danger.
3. One row = one setting = one control.
4. Immediate-apply (switch) vs. explicit-save (form) never mix in one card.
5. Forms get a single primary "Save" at the bottom and show unsaved-change state.
6. Always show what is currently set (value on the right), not just a chevron.

## 10.4 Dashboard ("Today") rules

1. The first viewport answers: "How am I doing today and what's next?"
2. One hero metric, one next-best action.
3. Cards in a consistent grid; no more than ~6 modules above the fold.
4. Gamification (points, streaks) is supportive, never louder than health data.

## 10.5 Onboarding / assessment rules

1. One question per screen on mobile; show progress ("3 of 8").
2. Always allow back; persist answers.
3. Never ask for the same thing twice (our Household copy promises this. Keep the promise in code).
4. Explain *why* you ask sensitive questions, in one line, adjacent to the field.

---

# 11. THE STATE MATRIX

**Rule S-M (MUST):** Every interactive or data-driven component ships with all of these, or documents why one does not apply.

| State | Visual requirement |
|---|---|
| **Default** | Resting appearance |
| **Hover** | Subtle bg/border change (desktop only, never the sole affordance) |
| **Focus-visible** | 2px ring, 3:1 contrast, 2px offset |
| **Active/pressed** | Slight scale (.98) or darker fill, under 100ms |
| **Disabled** | 45% opacity, `not-allowed`, a reason nearby |
| **Loading** | Inline spinner or skeleton, preserves layout |
| **Empty** | Designed empty state with next action |
| **Error** | Message, icon, recovery action, preserved input |
| **Success** | Confirmation (inline or toast), reversible if possible |
| **Selected/current** | Tint + border + `aria-current/selected` |
| **Offline** | Banner; queue actions or disable with explanation |
| **Overflow** | Long text truncates with tooltip/expand; layout never breaks |

**Stress-test strings** (always test with them):
- Name: `Alexandria-Wilhelmina Featherstonehaugh-Smythe-Nakamura`
- Email: `a.very.long.email.address.for.testing@subdomain.example-company.co.in`
- Zero, one, 999,999 items
- RTL text and emoji
- Large font settings (200% zoom)

```css
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
```

> In flex/grid children, add `min-width: 0` or long text will blow out the layout.

---

# 12. MOTION

## 12.1 Principles

1. **Purposeful:** motion explains cause and effect (where it came from, where it went).
2. **Fast:** most UI transitions 120-240ms. Nothing in a routine flow over 400ms.
3. **Quiet:** ease-out for entering, ease-in for leaving, no bounce except on delight moments.
4. **Optional:** respect `prefers-reduced-motion`.

## 12.2 Duration guide

| Interaction | Duration |
|---|---|
| Hover/press feedback | 100-160ms |
| Switch, tab underline, chip | 160-240ms |
| Dialog/sheet enter | 240ms (exit 160ms) |
| Page/section transition | 240-360ms |
| Progress fill, number count | 360-600ms |
| Celebration (level-up) | up to 900ms, once |

## 12.3 Rules

- **M1 (MUST):** Animate only `transform` and `opacity` (GPU-friendly). Avoid animating `width/height/top/left` except for small cases like the meter.
- **M2 (MUST):** Wrap non-essential motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- **M3 (MUST):** No infinite animations except loading indicators.
- **M4 (SHOULD):** Stagger list entrances by 30-40ms per item, max 6 items.
- **M5 (MUST NOT):** Animate on scroll in ways that delay reading content.
- **M6 (SHOULD):** Use the View Transitions API for page-to-page and tab changes where supported, as progressive enhancement.

```js
function go(update) {
  if (!document.startViewTransition) return update();
  document.startViewTransition(update);
}
```

---

# 13. LAYERING, OVERLAYS AND THE TOP LAYER

**The problem we had:** the assistant bubble rendered above the dimmed modal, and page text showed through the backdrop.

## Rules

- **Z1 (MUST):** Modals use native `<dialog>.showModal()`. Menus/popovers use the `popover` attribute. Both live in the **top layer**, above any `z-index`.
- **Z2 (MUST):** Never use `z-index` above 50 in component code. Never invent `z-index: 99999`.
- **Z3 (MUST):** All non-top-layer z-indexes come from the token scale.
- **Z4 (MUST):** Create stacking contexts deliberately. Be aware that `transform`, `filter`, `opacity<1`, and `will-change` create new stacking contexts and can trap a child's z-index.
- **Z5 (SHOULD):** Debug layering with a rule: *"What is this inside of?"*, not *"what number should I give it?"*.

| Layer | Mechanism |
|---|---|
| Page content | normal flow |
| Sticky bars | `--z-sticky` |
| Dropdowns | `popover` or `--z-dropdown` |
| FAB / assistant | `--z-fab` |
| Toast | `--z-toast` |
| Modal / menu | **top layer** |

---

# 14. ACCESSIBILITY (NON-NEGOTIABLE)

Accessibility is a quality bar, not a feature. It also directly improves the experience for everyone (keyboard power users, bright sunlight, one-handed use).

## 14.1 Keyboard

- **A1 (MUST):** Every interactive element reachable and operable by keyboard. Tab order follows visual order.
- **A2 (MUST):** Visible focus on **every** focusable element, always. Never `outline: none` without a replacement.
- **A3 (MUST):** Provide a "Skip to content" link as the first focusable element.
- **A4 (MUST):** Dialogs trap focus, restore it on close, close on Escape.
- **A5 (SHOULD):** Arrow keys within tablists, menus and radio groups (roving tabindex).
- **A6 (SHOULD):** Keyboard shortcuts for frequent actions, listed in a "?" help sheet, and never conflicting with browser/screen-reader keys.

```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: var(--r-xs);
}
```

## 14.2 Semantics

- **A7 (MUST):** Use the right element: `button` for actions, `a` for navigation, `input/label` for forms, `dialog` for modals, `details` for disclosure, `table` for data.
- **A8 (MUST):** One `h1` per page; headings never skip levels; headings describe sections, not styling.
- **A9 (MUST):** Landmarks: `header`, `nav` (with `aria-label`), `main`, `aside`, `footer`.
- **A10 (MUST):** `aria-live="polite"` for dynamic updates the user should hear (copy confirmation, credit changes after an action).
- **A11 (MUST NOT):** Use `div` with `onclick` as a button. No exceptions.
- **A12 (MUST):** First rule of ARIA: do not use ARIA if a native element does the job.

## 14.3 Perception

- **A13 (MUST):** Text resizes to 200% without loss of content or function. Use `rem`/`em` for type, never fixed pixel heights on text containers.
- **A14 (MUST):** Reflow at 320px width without horizontal scroll.
- **A15 (MUST):** Respect `prefers-reduced-motion`, `prefers-contrast`, `prefers-color-scheme`, and `forced-colors`.
- **A16 (MUST):** Do not use color alone (C7).
- **A17 (MUST):** Do not rely on hover for any action or information.

```css
@media (forced-colors: active) {
  .btn--primary { border: 1px solid ButtonText; }
  .switch[aria-checked="true"] { forced-color-adjust: none; }
}
@media (prefers-contrast: more) {
  :root { --border: rgba(255,255,255,.28); --text-2: var(--ink-100); }
}
```

## 14.4 Targets

- **A18 (MUST):** Minimum target size 24x24 CSS px (WCAG 2.2 AA). Bloom standard: **44x44** for primary touch targets (Apple HIG); 48 on mobile where practical.
- **A19 (MUST):** At least 8px between adjacent targets.

## 14.5 Forms

- **A20 (MUST):** Every input has a programmatically associated label.
- **A21 (MUST):** Errors are identified in text, linked via `aria-describedby`, and focus moves to the first error on submit.
- **A22 (MUST):** Support autofill/autocomplete tokens.
- **A23 (MUST):** Do not block paste.

## 14.6 Testing tools

- Keyboard-only pass (unplug the mouse).
- Screen reader smoke test: VoiceOver (macOS/iOS), NVDA (Windows), TalkBack (Android).
- axe DevTools / Lighthouse accessibility.
- Contrast checker on every new token pair.
- Zoom 200% and 400%.

---

# 15. RESPONSIVE AND ADAPTIVE BEHAVIOR

## 15.1 Breakpoints

| Name | Min width | Layout |
|---|---|---|
| `xs` | 0 | single column, bottom tab bar, full-screen sheets |
| `sm` | 560px | single column, wider cards |
| `md` | 768px | icon-rail sidebar |
| `lg` | 1024px | full sidebar |
| `xl` | 1280px | extra margins / two-column settings |

- **R1 (MUST):** Mobile-first CSS: base styles for small, `min-width` queries to enhance.
- **R2 (SHOULD):** Prefer **container queries** for components (a card should adapt to its container, not the viewport).

```css
.card-host { container-type: inline-size; }
@container (max-width: 520px) {
  .plan-head, .plan-foot { flex-direction: column; align-items: flex-start; }
}
```

- **R3 (MUST):** Use `dvh`/`svh` for full-height on mobile (not `vh`) to handle browser chrome.
- **R4 (MUST):** Respect safe areas on notched devices.

```css
.bottom-bar { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
```

- **R5 (MUST):** Inputs 16px+ on iOS to prevent auto-zoom on focus.
- **R6 (MUST):** Test: 320, 375, 414, 768, 1024, 1280, 1440, 1920.
- **R7 (MUST):** Test landscape on phones, and large text settings.
- **R8 (SHOULD):** Hover-only enhancements wrapped in `@media (hover: hover)`.

```css
@media (hover: hover) { .row:hover { background: var(--surface-hover); } }
```

---

# 16. CONTENT DESIGN AND MICROCOPY

## 16.1 Bloom's voice

Calm, kind, direct. Like a thoughtful friend who happens to be an expert.

| Do | Don't |
|---|---|
| "Add to household" | "Submit" |
| "Your record stays in your account." | "Data will be retained." |
| "Couldn't save. Check your connection and try again." | "Error 500" |
| "Nothing is sent while sharing is off." | Three sentences repeating the switch state |

## 16.2 Rules

- **CP1 (MUST):** Say it once. If a control or badge shows the state, do not also write a sentence stating it.
- **CP2 (MUST):** Lead with the benefit or outcome, then the detail.
- **CP3 (MUST):** Wayfinding is literal, brand voice lives in body copy. The pill, eyebrow and heading use the same plain words; the poetry goes in the description.
- **CP4 (MUST):** Sentence case everywhere (not Title Case) except proper nouns, and ALL CAPS only for eyebrow labels via CSS (`text-transform`), never typed in caps.
- **CP5 (MUST):** Buttons: verb + object. 1-3 words.
- **CP6 (MUST):** Error messages: what happened + why (if known) + what to do. No blame, no codes alone.
- **CP7 (MUST):** Destructive confirmations name the consequence in the title.
- **CP8 (SHOULD):** Maximum ~35 words in any card intro. If longer, it belongs in a help article or an expandable.
- **CP9 (MUST):** Never use "Please", "Oops", "Sorry" as filler. Use "Sorry" only for real failures on our side.
- **CP10 (MUST):** Consistent terms: pick *Premium Plus*, *plan*, *credits*, *household member*, and never swap synonyms (subscription/membership/plan) for the same thing without reason.
- **CP11 (SHOULD):** Write for translation. Avoid idioms; allow 30-40% text expansion; do not concatenate sentence fragments in code.

## 16.3 Copy diet example (applied)

**Before (≈90 words):**
> If a trainer or clinician helps you, Bloom can meet them halfway: a code that credits them when their clients join, and a summary of your record that only exists while you allow it. [...] Sharing is off. Nothing about your record is prepared or sent anywhere while this stays off, turning it on shows you the exact summary first.

**After (≈35 words):**
> **Trainer & clinician.** Bring your professional into Bloom, on your terms.
> **Referral code.** They earn 30% of net revenue from clients who join with it, paid monthly above ₹1,000.
> **Share summary.** A one-page record summary, visible only while sharing is on.

---

# 17. DATA TRUST: NUMBERS, DATES, MONEY

## 17.1 The trust rule

**D-T1 (MUST):** A single wrong number or date destroys more trust than ten missing features. All displayed values pass through shared formatters, and fixtures never leak into production.

## 17.2 One formatter per type

```js
// /lib/format.js
const LOCALE = "en-IN";

export const fmtDate = (d) =>
  new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
// "18 Nov 2026"

export const fmtDateTime = (d) =>
  new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));

export const fmtRelative = (d) => {
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const diffDays = Math.round((new Date(d) - Date.now()) / 864e5);
  return rtf.format(diffDays, "day");
};

export const fmtINR = (n, opts = {}) =>
  new Intl.NumberFormat(LOCALE, { style: "currency", currency: "INR", maximumFractionDigits: 0, ...opts }).format(n);
// ₹7,999

export const fmtNumber = (n) => new Intl.NumberFormat(LOCALE).format(n);
// 1,202

export const fmtPercent = (n) =>
  new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 0 }).format(n);
```

## 17.3 Rules

- **D-T2 (MUST):** Exactly one date format in the UI. Never mix "18 Nov 2126", "Aug 13, 2026" and "2026-08-13" on one screen. ISO strings are for storage only.
- **D-T3 (MUST):** Store time in UTC, display in the user's timezone, and be explicit when it matters.
- **D-T4 (MUST):** **Sanity-check data at the boundary.** A billing period ending 100 years from now should trip an assertion in dev and a monitor in prod.

```js
export function assertPlausiblePeriod(startIso, endIso) {
  const days = (new Date(endIso) - new Date(startIso)) / 864e5;
  if (days < 1 || days > 400) {
    console.error("[billing] implausible period length", { startIso, endIso, days });
    // report to monitoring; show a safe fallback in UI
  }
}
```

- **D-T5 (MUST):** Pluralization via `Intl.PluralRules`, never `count + "s"`.
- **D-T6 (MUST):** Counts are consistent across the page: "1202 of 1202 dishes" in one place and "1,202" in another is a fail. Use `fmtNumber` everywhere.
- **D-T7 (MUST):** "1202 of 1202 dishes suit everyone" when it is just you: say "All 1,202 dishes suit you" and switch to "X of 1,202 suit everyone at your table" only when there are other members. Copy should reflect the actual state.
- **D-T8 (MUST):** Percentages and savings claims ("Save 44%") are computed from the displayed prices, not hard-coded.

```js
const saving = (monthly, yearly) => Math.round((1 - yearly / (monthly * 12)) * 100);
```

- **D-T9 (MUST):** Fixtures/test data are clearly tagged and excluded from production builds. No "test@", no year 2126.

---

# 18. PERFORMANCE AS A DESIGN FEATURE

Slow UI feels cheap, no matter how pretty it is.

## 18.1 Budgets

| Metric | Target |
|---|---|
| LCP | under 2.5s on mid-range mobile |
| INP | under 200ms |
| CLS | under 0.1 |
| JS per route | under 170KB gzipped (initial) |
| Tap-to-feedback | under 100ms |

## 18.2 Rules

- **P1 (MUST):** Reserve space for everything async (images, embeds, fonts, cards) to prevent layout shift.
- **P2 (MUST):** Optimistic UI for low-risk actions (add household member, copy, toggle), then reconcile; roll back with an error toast on failure.
- **P3 (SHOULD):** `content-visibility: auto` for long below-the-fold sections.

```css
section[id] { content-visibility: auto; contain-intrinsic-size: auto 600px; }
```

- **P4 (SHOULD):** Virtualize or paginate lists beyond ~100 items. Never render 1,202 dishes into the DOM. The profile page shows 3, a dedicated page paginates.
- **P5 (MUST):** Debounce search/typing handlers (150-250ms); never block the main thread for over 50ms.
- **P6 (SHOULD):** Prefetch the likely next route on hover/idle.
- **P7 (MUST):** Images: modern formats (AVIF/WebP), responsive `srcset`, lazy loading.
- **P8 (SHOULD):** Prefer CSS over JS for interaction (`<details>`, `:has()`, scroll snap, `popover`).
- **P9 (MUST):** Skeletons/streaming for data-heavy sections so the shell appears instantly.

---

# 19. CODE ARCHITECTURE AND CONVENTIONS

## 19.1 File structure

```
/src
  /styles
    tokens.css          ← primitives + semantic tokens (only place for raw values)
    base.css            ← reset, typography, focus, reduced-motion
    utilities.css       ← .truncate, .num, .sr-only, .stack
  /components
    /button   button.css  button.js(optional)  README.md
    /badge
    /card
    /row
    /switch
    /dialog
    /tabs
    /pills
    /meter
    /field
    /toast
  /features
    /profile
      moments.js
      membership.js
      trainer.js
      household.js
      sessions.js
  /lib
    format.js           ← date, money, number formatters
    a11y.js             ← focus trap helpers, announcer
    assert.js           ← data sanity checks
/docs
  BLOOM_UI_RULES.md     ← this file
  CHANGELOG-UI.md
```

## 19.2 Naming

- **CODE1 (MUST):** BEM-style class names for components (`.plan-card`, `.plan-card__head`, `.plan-card--compact`) or a consistent utility system. Not both mixed randomly.
- **CODE2 (MUST):** State via attributes (`aria-*`, `data-*`), not ad-hoc classes (`.is-active-2-final`).
- **CODE3 (MUST):** Components are named by **role**, not appearance (`.badge--ok`, not `.green-pill`).

## 19.3 Principles

- **CODE4 (MUST):** No magic numbers. If you type `37px`, you are missing a token or a layout rule.
- **CODE5 (MUST):** No `!important` outside the reduced-motion reset and utility overrides.
- **CODE6 (MUST):** No inline styles except dynamic values (e.g., meter width, via CSS variable).

```html
<div class="meter-fill" style="--pct:100%"></div>
```
```css
.meter-fill { width: var(--pct); }
```

- **CODE7 (SHOULD):** Prefer logical properties for RTL readiness: `margin-inline`, `padding-block`, `inset-inline-start`.
- **CODE8 (MUST):** Single source of truth for UI strings (a copy file) so wording stays consistent and translatable.
- **CODE9 (SHOULD):** Component README: purpose, props/attributes, states, do/don't screenshot.
- **CODE10 (MUST):** Use CSS `@layer` for predictable cascade.

```css
@layer reset, tokens, base, components, utilities;
```

## 19.4 Tooling (set up once, benefits forever)

| Tool | Purpose |
|---|---|
| **Stylelint** | Ban raw colors/px outside tokens, enforce order |
| **ESLint + jsx-a11y (or html-validate)** | Catch accessibility errors at commit |
| **Prettier** | No style debates |
| **Storybook / a /ui-kit page** | Every component in every state, in one place |
| **Playwright visual regression** | Screenshot diffs at 375 / 768 / 1280 |
| **axe-core in CI** | Fail build on a11y violations |
| **Lighthouse CI** | Performance budget gate |
| **Husky + lint-staged** | Run the above before commits |

Stylelint example:

```json
{
  "rules": {
    "color-no-hex": [true, { "message": "Use design tokens" }],
    "declaration-property-value-disallowed-list": {
      "/^(margin|padding|gap)/": ["/\\d+px/"],
      "z-index": ["/^[0-9]{3,}$/"]
    }
  },
  "overrides": [{ "files": ["src/styles/tokens.css"], "rules": { "color-no-hex": null } }]
}
```

## 19.5 Component API example (vanilla, framework-agnostic)

```js
// components/dialog/dialog.js
export function createDialog(el) {
  let opener;
  const open = (trigger) => { opener = trigger ?? document.activeElement; el.showModal(); };
  const close = () => el.close();
  el.addEventListener("close", () => opener?.focus());
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest("[data-close]")) close();
  });
  return { open, close };
}
```

## 19.6 Git and review hygiene

- Small PRs (under ~400 lines). One concern each ("slice A", "slice B" is exactly right).
- Every UI PR includes before/after screenshots at desktop + mobile, and a note on states tested.
- Commit messages: `type(scope): summary`, e.g. `fix(billing): correct period end year offset`.
- Never mix refactors and visual changes in a single commit.

---

# 20. THE MISTAKES REGISTRY

Every issue found in audits, kept so we never repeat them. Add to it at the end of every sprint.

| ID | Mistake | Category | Fix | Status |
|---|---|---|---|---|
| M-01 | Billing period shows **18 Nov 2126** (100-year offset) | Data trust | Fix source + `assertPlausiblePeriod` + shared `fmtDate` | OPEN |
| M-02 | Points widget **duplicated** in sidebar | Layout bug | Single instance; IntersectionObserver if sticky clone is needed | OPEN |
| M-03 | Moment cards inconsistent: blank media box, identical "A moment" titles | Content/states | Fallback gradient, type-based titles, empty state | OPEN |
| M-04 | Pill nav lacked active state and did not cover all sections | Navigation | Scroll-spy, list every section, pill = eyebrow = heading | PARTIAL |
| M-05 | Sign out styled as danger (red) | Color semantics | Neutral for routine; red only for irreversible | OPEN |
| M-06 | Sticky tab bar had no backdrop; content collided with it | Layering | Blur + translucent + border | OPEN |
| M-07 | Paywall status labels styled as buttons ("Your current plan") | Affordance | Badges + "Current plan" highlight | OPEN |
| M-08 | Paywall: no close button, thin backdrop, assistant widget above modal | Overlay | Native `<dialog>`, close button, opaque backdrop | OPEN |
| M-09 | Paragraph-heavy Membership & Trainer sections | Information design | Status card / settings rows | OPEN |
| M-10 | Always-open household form (~450px) | Density | `<details>` or modal form; tag input for lists | OPEN |
| M-11 | Dish list wall (8+ items, 1,194 more) | Density | 3 chips + "Browse all" | FIXED |
| M-12 | "Sharing off" faux-button | Affordance | Real `role="switch"` | FIXED |
| M-13 | No Copy action on referral code | Missing action | Copy button + feedback | FIXED |
| M-14 | Three date formats on one page | Consistency | `fmtDate` everywhere | OPEN |
| M-15 | Swash ampersand reads as "℅" in headings | Typography | Alternate glyph or "and" | OPEN |
| M-16 | Wayfinding speaks three dialects (pill / eyebrow / heading) | Naming | One label per section | OPEN |
| M-17 | Status words in monospace, mixed styles | Typography | Badge component | OPEN |
| M-18 | Orphaned sections (Personalization, Danger) missing from pills | Navigation | Add to nav | OPEN |
| M-19 | Stacked "SETTINGS / Account / ACCOUNT / Account & data" | Hierarchy | Remove redundant eyebrows | OPEN |
| M-20 | Dark native `<select>` popup renders white | Theming | `color-scheme: dark` | OPEN |
| M-21 | Gold overused (buttons, links, glows compete) | Color | Gold budget (C1-C4) | OPEN |
| M-22 | "1202 of 1202 dishes suit everyone" while only one member | Copy truth | State-aware copy | OPEN |
| M-23 | Two floating widgets stacked at right edge (assistant + back-to-top) | Layering | Consolidate or define offsets | OPEN |
| M-24 | Moment grid narrower than other cards (alignment break) | Layout | One content width | OPEN |
| M-25 | Sign-out-everywhere has no confirmation | Safety | Native confirm `<dialog>` | OPEN |

**Mistake patterns (meta-lessons)**

1. We shipped **structure** before **system**. Components were styled one at a time instead of from shared primitives.
2. We trusted data without sanity checks.
3. We designed the happy path and a single state.
4. We wrote copy like documentation instead of interface.
5. We used color for emphasis instead of hierarchy.

---

# 21. THE "NEVER" LIST

- Never ship `outline: none` without a focus replacement.
- Never use a `div` as a button.
- Never show placeholder, broken, empty or test data.
- Never use red for routine actions.
- Never use color alone to convey meaning.
- Never use pure `#000` or `#fff`.
- Never put hover-only actions on touch UIs.
- Never nest cards three deep.
- Never show two primary buttons in the same region.
- Never write a paragraph where a badge, switch or number would do.
- Never repeat the same information in two nearby places.
- Never leave a media slot empty.
- Never invent a z-index above 50.
- Never animate layout properties for decoration.
- Never hide essential info in tooltips.
- Never mix date formats.
- Never hard-code a computed value (savings %, counts).
- Never put a destructive action next to a safe one without spacing and confirmation.
- Never auto-dismiss an error.
- Never clear a form on failure.
- Never block paste or zoom (`user-scalable=no`).
- Never rely on a placeholder as a label.
- Never ship a screen you have not tested at 320px and 200% zoom.
- Never ship a modal without close, Escape, focus management and scroll containment.
- Never let a long string break a layout.
- Never merge UI without before/after screenshots.

---

# 22. THE PREMIUM 1%: DETAILS THAT SEPARATE GOOD FROM EXCEPTIONAL

These are small, cheap, and add up to "this feels expensive."

1. **Inner top highlight** on cards and dialogs: `box-shadow: inset 0 1px 0 rgba(255,255,255,.04)`.
2. **Hairline borders** with alpha, not solid grey, so they adapt to any surface.
3. **Tabular numbers** everywhere digits live.
4. **Press feedback**: `scale(.98)` on active, under 100ms.
5. **Focus ring with offset** and brand tint, not the default browser blue.
6. **Smooth number transitions** for credits/points (count over 400ms).
7. **Skeletons that match the layout**, so the page does not jump.
8. **Optimistic updates** so every tap feels instant.
9. **Text balance** on headings: no lonely last words.
10. **Subtle noise or grain** (2-3% opacity) on large dark areas to prevent banding. Optional.
11. **Gradient borders only for the hero element** (current plan), never for all cards.
12. **Consistent corner radii:** nested radius = outer radius minus padding (e.g., 14px card with 6px padding gives 8px inner).
13. **Cursor and selection polish:** `::selection { background: var(--accent-dim); color: var(--text-1); }`
14. **Scrollbar styling** that matches: `scrollbar-color: var(--ink-600) transparent;`
15. **Haptics** on mobile via `navigator.vibrate(10)` for switch/confirm (progressive enhancement, tiny).
16. **Meaningful empty states** with Bloom's voice and a single action.
17. **Keyboard shortcuts**: `g p` for profile, `?` for help, `/` for search.
18. **A real "Copied ✓" micro-interaction**: icon morphs, label changes, no layout shift.
19. **Skeleton to content cross-fade** (120ms) instead of a hard swap.
20. **Respect OS settings** (reduced motion, contrast, color scheme, text size).
21. **Meta details:** correct `<title>` per page, `theme-color`, favicon set, Open Graph image, `color-scheme` meta tag.
22. **Print and share** styles for the trainer summary (clean one-page output).
23. **Offline grace:** cached shell and a clear offline banner.
24. **Error boundaries** with branded recovery screens, not blank pages.
25. **Version the design:** changelog of UI changes, so the team feels the product maturing.

```css
::selection { background: var(--accent-dim); color: var(--text-1); }
html { scrollbar-color: var(--ink-600) transparent; }
meta[name="theme-color"] /* set to --bg for browser chrome matching */
```

**Nested radius formula**

```css
.card { --pad: 8px; border-radius: 14px; padding: var(--pad); }
.card > .inner { border-radius: calc(14px - var(--pad)); }
```

---

# 23. QA PROCEDURE

## 23.1 Pre-merge manual pass (10 minutes)

1. **Keyboard:** Tab through the whole screen. Is focus always visible and logical? Can I operate every control with Enter/Space/Escape/arrows?
2. **Zoom:** 200% and 400%. Anything clipped, overlapping, or unreachable?
3. **Widths:** 320, 375, 768, 1280, 1920.
4. **States:** loading, empty, error, success, disabled, offline for every new component.
5. **Stress data:** long names, 0/1/many items, RTL text.
6. **Content truth:** verify every number, date and count against the data source.
7. **Layering:** open every dialog/menu. Does anything float above? Does the page scroll behind?
8. **Reduced motion:** toggle the OS setting. Does the UI still make sense?
9. **Screen reader:** read the page top to bottom for 60 seconds. Does it make sense?
10. **Contrast:** check any new color pair.

## 23.2 Automated gates

- axe-core: zero serious/critical violations.
- Lighthouse: a11y >= 95, best practices >= 95, performance budget met.
- Visual regression: no unintended diffs.
- Stylelint/ESLint clean.

## 23.3 Device matrix (minimum)

- Chrome Windows (your main environment)
- Safari iOS (real device)
- Chrome Android (real device)
- Safari macOS
- Firefox desktop

---

# 24. PULL-REQUEST CHECKLIST AND DEFINITION OF DONE

Copy into `.github/pull_request_template.md`.

```markdown
## What and why
<!-- one paragraph -->

## Screenshots
| Before | After |
|---|---|
| desktop | desktop |
| mobile  | mobile  |

## Design system
- [ ] Uses tokens only (no raw colors/px/z-index)
- [ ] Reuses existing components (or adds a new one to /components with README)
- [ ] One primary action per region; gold budget respected
- [ ] Wayfinding labels consistent (pill = eyebrow = heading)

## States
- [ ] Loading  - [ ] Empty  - [ ] Error  - [ ] Success  - [ ] Disabled  - [ ] Overflow (long text)

## Accessibility
- [ ] Keyboard operable, focus visible
- [ ] Labels, roles, aria-live where needed
- [ ] Contrast checked for new color pairs
- [ ] 44px touch targets; no hover-only actions
- [ ] Reduced motion respected
- [ ] Tested at 200% zoom and 320px

## Data trust
- [ ] Dates/money/numbers go through formatters
- [ ] Counts and claims are computed, not hard-coded
- [ ] No test data visible

## Layering & performance
- [ ] Dialogs use <dialog>; no new z-index > 50
- [ ] No layout shift; images sized; lists paginated

## Copy
- [ ] Says it once; sentence case; verbs on buttons; errors are actionable
```

## Definition of Done

A UI task is **done** only when:

1. It matches the spec in this document.
2. All states exist and were seen with your own eyes.
3. It works by keyboard, at 320px, at 200% zoom.
4. Numbers and dates are true.
5. Screenshots (before/after, desktop/mobile) are in the PR.
6. The Mistakes Registry is updated if you learned something.

---

# 25. SENIOR-DEV MINDSET: TIPS FOR FUTURE DEVELOPMENT

## 25.1 How seniors think differently

1. **They fix classes of bugs, not instances.** The 2126 bug is not "fix a date"; it is "make implausible dates impossible to display silently."
2. **They build the system before the screens.** Ten screens on a shared component library are cheaper than three screens with ten bespoke styles.
3. **They design for the unhappy path first.** Empty, error, slow, offline, huge, tiny.
4. **They delete.** The best PR often has more red than green.
5. **They name things carefully.** Naming is design. "Trainer & clinician" is the same everywhere or it is wrong somewhere.
6. **They measure.** Contrast ratios, INP, CLS, tap sizes: numbers, not feelings.
7. **They protect the user's trust.** Wrong data, surprise charges, hidden sharing, hard-to-find cancel: never.
8. **They ship in slices** (as you are doing with A/B slices) and keep main always releasable.
9. **They document decisions**, not just code. The "why" is what gets lost.
10. **They test on real devices**, not only a resized desktop window.

## 25.2 Debugging UI like a senior

- **Layout bug?** Open DevTools, toggle `* { outline: 1px solid red }`, and find the element that is *actually* wider than you think. Usually a missing `min-width: 0`.
- **z-index bug?** Find the stacking context. Do not raise the number.
- **Overflow bug?** `overflow: hidden` is a bandage; find what is too big.
- **Flicker/jank?** Performance panel, look for layout thrash and long tasks.
- **Weird focus?** `document.activeElement` in the console.
- **Mobile-only bug?** Remote debugging on a real device. Check `dvh`, safe areas, and 16px inputs.

## 25.3 Habits to build

- Build a **/ui-kit page** showing every component and state. Review changes there first.
- Keep a **"design debt" list** and spend 20% of every sprint on it.
- Do a **weekly 15-minute audit** of one screen using the 5-second scan test and the PR checklist.
- Record a **short screen capture** of each new flow on mobile. Motion bugs hide in static screenshots.
- **Dogfood:** use the product daily with real data. You will find the 2126-style bugs yourself.
- Collect **real user quotes**. One sentence from a user outranks ten opinions.
- **Read the source of great systems:** Apple HIG, Material 3, GitHub Primer, Radix, Stripe docs, Linear's changelog. Steal principles, not pixels.

## 25.4 When to break the rules

Rules protect consistency. Break one only when:
1. You can state the user benefit in one sentence,
2. You tried the compliant version first, and
3. You write the exception into this document.

## 25.5 Scaling the team

- Adopt a **design-token pipeline** (Style Dictionary or similar) to generate CSS, iOS and Android tokens from one JSON.
- Introduce **component ownership**: every component has an owner.
- Use **semantic versioning** for the UI kit.
- Add **feature flags** so half-built UI never reaches users.
- Add **analytics on friction**: rage clicks, form abandonment, modal dismiss rates.

---

# 26. QUICK-REFERENCE CHEAT SHEET

**Colors:** gold = primary/selected only · red = irreversible only · green = success · amber = attention · everything else ink.

**Type:** serif for meaning, sans for UI, mono for codes · scale: 12 / 14 / 15 / 16 / 18 / 24 / 30 / 40 · tabular-nums on numbers · 65ch paragraphs.

**Space:** 4, 8, 12, 16, 20, 24, 32, 48, 64 · card padding 24 · section gap 48-64.

**Radius:** 6 / 10 / 14 / 20 / pill.

**Targets:** 44px · 8px apart · visible focus.

**Motion:** 100-240ms · transform/opacity · reduced-motion respected.

**Overlays:** `<dialog>` + `showModal()` · close button + Esc + focus return · scroll inside, lock behind.

**Sections:** identity → status → action · one topic per card · rows not paragraphs.

**Copy:** say it once · verbs on buttons · sentence case · actionable errors.

**Data:** one date format · formatters only · computed claims · sanity asserts.

**Every component:** default, hover, focus, active, disabled, loading, empty, error, success, overflow.

**5-second test:** What is this? What is my status? What can I do?

---

# 27. ROADMAP

## Phase 1: Stop the bleeding (this week)
- [ ] Fix 2126 date + formatters + sanity assert (M-01, M-14)
- [ ] Remove duplicate points widget (M-02)
- [ ] Native `<dialog>` for paywall with close, backdrop, top layer (M-08)
- [ ] `color-scheme: dark` (M-20)
- [ ] Sticky bar backdrop (M-06)
- [ ] Sign-out styling and confirm dialog (M-05, M-25)

## Phase 2: Systemize (next 2 weeks)
- [ ] `tokens.css` with semantic tokens; migrate components
- [ ] Button, badge, switch, card, row, field components
- [ ] Pill scroll-spy covering all sections; unified naming (M-04, M-16, M-18, M-19)
- [ ] Membership status card; Trainer settings rows (M-09)
- [ ] Moment card fallback and titles (M-03, M-24)

## Phase 3: Elevate (following 2-4 weeks)
- [ ] Tag inputs, collapsible household form (M-10)
- [ ] Meter states; count-up animations
- [ ] Toast system with undo
- [ ] Skeletons and empty states everywhere
- [ ] Danger zone with type-to-confirm
- [ ] Typography pass: ampersand, scale, line lengths (M-15)

## Phase 4: Prove it (ongoing)
- [ ] `/ui-kit` page and Storybook
- [ ] axe + Lighthouse + Playwright visual regression in CI
- [ ] Stylelint token enforcement
- [ ] Real-device QA matrix every release
- [ ] Light-theme option (token swap)
- [ ] Evaluate graduating Account to a dedicated Settings page (Plan B) when sections exceed ~8

---

## FINAL WORD

Apple, Stripe and Linear do not feel premium because of a secret style. They feel premium because **nothing is accidental**. Every spacing value has a reason, every state is designed, every number is true, every word is earned.

Bloom's version of that is **calm, warm, precise, quiet, earned.**

When in doubt: remove something, align something, name something clearly, and check a number.

*End of document.*
