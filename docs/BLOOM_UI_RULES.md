# BLOOM UI RULES v2: The visual language

> Premium is not more effects. Premium is alignment, restraint, honest data and one clear
> focal point per screen. Sources: public principles (Apple HIG, Material, Stripe, Linear,
> GitHub Primer, WCAG 2.2). No company's internal specs are claimed.

## §1 What "beautiful" means in Bloom
1. **One focal point** per card and per screen.
2. **Snap to the grid.** 4/8 spacing, one container, one measure.
3. **Lighter = higher.** Dark UIs use lightness for elevation, not shadows.
4. **Structure over prose.** Status, requirements, rules and sources are components.
5. **Earned colour.** Gold marks the single most important thing. Semantic colours
   (green, amber, red, blue) carry meaning. Grey carries the rest.
6. **Honest confidence.** Solid = measured. Dashed = estimated.
7. **Rhythm.** Dense inside a group, generous between groups.
8. **Calm motion.** 120–200ms, transform and opacity only.
Test: **squint test** (blur it; the key thing must still show) and **5-second test**
(what is this, what is my status, what can I do).

## §2 Tokens (`tokens.css`)
```css
:root{
  color-scheme: dark;

  /* primitives: never used in components */
  --ink-900:#0b0d10; --ink-850:#12151a; --ink-800:#181c22; --ink-700:#20252d;
  --sand-50:#f3f0e9; --sand-300:#b9bcc2; --sand-500:#8d939c;
  --gold-300:#e4cd9f; --gold-400:#d6b579; --gold-500:#bf9a58;

  /* semantic: the only colours components may use */
  --bg:var(--ink-900);
  --surface:var(--ink-850);      /* cards */
  --surface-2:var(--ink-800);    /* raised rows, hover, notes */
  --surface-3:var(--ink-700);    /* tracks, chips, switch off */
  --border-subtle:rgba(255,255,255,.06);
  --border:rgba(255,255,255,.10);
  --border-strong:rgba(255,255,255,.22);

  --text-1:var(--sand-50);       /* titles, values */
  --text-2:var(--sand-300);      /* body, secondary */
  --text-3:var(--sand-500);      /* captions, labels (≥4.5:1; re-verify by script) */

  --accent:var(--gold-400); --accent-hover:var(--gold-300); --accent-press:var(--gold-500);
  --accent-ink:#1a1407;                      /* text on gold */
  --accent-soft:rgba(214,181,121,.12); --accent-line:rgba(214,181,121,.35);

  --success:#7cc79a; --success-soft:rgba(124,199,154,.12);
  --warning:#e2ac62; --warning-soft:rgba(226,172,98,.12);
  --danger:#e8806f;  --danger-soft:rgba(232,128,111,.12);
  --info:#86abd8;    --info-soft:rgba(134,171,216,.12);

  /* type */
  --font-display:/* keep the existing serif */;
  --font-ui:/* keep the existing sans */;
  --font-mono:ui-monospace,SFMono-Regular,Menlo,monospace;
  --fs-12:.75rem; --fs-14:.875rem; --fs-15:.9375rem; --fs-16:1rem;
  --fs-18:1.125rem; --fs-24:1.5rem; --fs-30:1.875rem; --fs-40:2.5rem;

  /* space (4/8) */
  --s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:20px; --s-6:24px;
  --s-8:32px; --s-10:40px; --s-12:48px; --s-14:56px; --s-16:64px;

  /* shape, layout, motion */
  --r-sm:8px; --r-md:12px; --r-lg:16px; --r-pill:999px;
  --measure:62ch; --container:1040px; --sidebar:232px;
  --ease:cubic-bezier(.2,.7,.2,1); --dur-1:120ms; --dur-2:200ms;
  --focus:0 0 0 2px var(--bg),0 0 0 4px var(--accent);
}
@media (prefers-reduced-motion:reduce){*{transition-duration:.01ms!important;animation:none!important}}
```
Rules: components never use primitives. Never add a colour without adding a token, a
contrast result and a usage rule here. Contrast numbers above are hand-calculated, so
**verify them with a script** in CI.

## §3 Typography
| Role | Spec |
|---|---|
| Page H1 | serif 40/44, `-0.015em`, `text-wrap: balance` |
| Section H2 | serif 24/30, `-0.01em` |
| Item title H3 | sans 15–16/24, **600** |
| Body | sans 15/24, `--text-2`, max `62ch`, `text-wrap: pretty` |
| Secondary | sans 14/20, `--text-2` |
| Caption / label | sans 12/16 minimum, `--text-3`, never below 12px |
| Eyebrow | sans 12, **500**, `+0.06em`, uppercase, `--text-3`. ONE per card, and only if it does not repeat the H2 |
| Hero numeral | serif 40 (or sans 600 32), one per card |
| Code | mono, only for referral codes and IDs |

- Weights: 400, 500, 600 only.
- `font-variant-numeric: tabular-nums` on every number column and stat.
- Serif never touches lists, quantities, table cells or labels.
- The H2 must be visibly larger than any item title inside its card. If it isn't, the
  hierarchy is broken.
- Avoid the swash ampersand ("℅" look). Write "and".
- `::selection{background:var(--accent-soft)}`.

## §4 Layout and rhythm
```css
.app{display:grid;grid-template-columns:var(--sidebar) minmax(0,1fr);min-block-size:100dvh}
.page{max-inline-size:var(--container);margin-inline:auto;padding:var(--s-10) var(--s-8) 96px}
@media (max-width:720px){.page{padding-inline:var(--s-6)}}
.group{margin-block-start:var(--s-14)}                 /* between groups: 56px */
.stack>*+*{margin-block-start:var(--s-4)}               /* between cards in a group: 16px */
```
- Container 1040px. Reading text 62ch. Don't stretch a paragraph across a card.
- Page = H1 → sticky sub-nav (blur + bottom border) → groups. Each group = H2 and a
  one-line subtitle, then 1–4 cards.
- Inside cards: 24px padding (32px for `card--hero`), 16px between rows, 20–24px between
  header and body.
- **No half-empty cards.** If content is ≤ 60% of the card width, use `card--split`
  (content + aside), put the action at the right edge, or place two cards side by side.
- Row heights: settings 56+, list 44–48, dense 40. Hit targets ≥ 40px.

## §5 Colour, gold and elevation
- **Gold budget**: one gold-filled button per viewport. Gold also marks one key datum,
  the on-state of a switch, an active meter fill, and an italic emphasis word in an H1.
  Never gradients, glows or gold borders around whole cards.
- **Semantic colour**: green = ready, ok, measured success. Amber = gathering,
  estimated, caution. Red = irreversible, destructive. Blue = informational. Pair
  with a label or icon. Never colour alone.
- **Elevation**: `--bg` → `--surface` → `--surface-2` → overlay. Cards get a hairline
  border and `inset 0 1px 0 rgba(255,255,255,.03)`. Real shadows only on dialogs and
  menus: `0 24px 64px rgba(0,0,0,.5)`.
- Max two surface levels visible inside any card.

## §6 Core components

### Card and section header
```css
.card{background:var(--surface);border:1px solid var(--border-subtle);border-radius:var(--r-lg);
  padding:var(--s-6);box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
.card--hero{padding:var(--s-8)}
.card--split{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--s-6);align-items:start}
.section-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--s-1) var(--s-4);
  align-items:start;margin-block-end:var(--s-5)}
.section-head h2{font:400 var(--fs-24)/1.25 var(--font-display);letter-spacing:-.01em}
.section-head p{grid-column:1;color:var(--text-2);font-size:var(--fs-14);line-height:1.5;max-inline-size:var(--measure)}
.section-head .actions{grid-column:2;grid-row:1/span 2;display:flex;gap:var(--s-2)}
```
Rule: every card starts with `.section-head`: H2 + ≤1 line of subtitle (≤140 chars) + optional actions.

### Buttons
```css
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s-2);block-size:40px;
  padding-inline:var(--s-4);border-radius:10px;border:1px solid transparent;cursor:pointer;
  font:500 var(--fs-14)/1 var(--font-ui);
  transition:background var(--dur-1),border-color var(--dur-1),transform var(--dur-1)}
.btn:active{transform:translateY(1px)}
.btn:focus-visible{outline:none;box-shadow:var(--focus)}
.btn--sm{block-size:32px;padding-inline:var(--s-3)}
.btn--primary{background:var(--accent);color:var(--accent-ink)}
.btn--primary:hover{background:var(--accent-hover)}
.btn--secondary{border-color:var(--border-strong);color:var(--text-1)}
.btn--secondary:hover{background:var(--surface-2)}
.btn--ghost{color:var(--text-2)} .btn--ghost:hover{color:var(--text-1);background:var(--surface-2)}
.btn--danger{border-color:rgba(232,128,111,.4);color:var(--danger)}
.btn[aria-disabled="true"]{opacity:.45;pointer-events:none}
```
One primary per card, and the recommended action only. Cancel is ghost. Retake is secondary.
Never dim gold to signal disabled.

### Switch (44×24, visible in both states)
```css
.switch{position:relative;flex:none;inline-size:44px;block-size:24px;border-radius:var(--r-pill);
  background:var(--surface-3);border:1px solid var(--border-strong);cursor:pointer;
  transition:background var(--dur-2) var(--ease),border-color var(--dur-2) var(--ease)}
.switch::after{content:"";position:absolute;inset:2px auto auto 2px;inline-size:18px;block-size:18px;
  border-radius:50%;background:var(--text-3);
  transition:transform var(--dur-2) var(--ease),background var(--dur-2) var(--ease)}
.switch[aria-checked="true"]{background:var(--accent);border-color:var(--accent)}
.switch[aria-checked="true"]::after{transform:translateX(20px);background:var(--accent-ink)}
.switch:focus-visible{outline:none;box-shadow:var(--focus)}
.switch:disabled{opacity:.45;cursor:not-allowed}
```
Markup: `<button role="switch" aria-checked="false" class="switch" aria-labelledby="…">`.
A switch must do something. If it can't, it is disabled with a "Not available yet" badge.

### Checkbox
```css
.check{appearance:none;inline-size:20px;block-size:20px;border:1.5px solid var(--border-strong);
  border-radius:6px;background:transparent;display:grid;place-content:center;cursor:pointer;
  transition:background var(--dur-1),border-color var(--dur-1)}
.check::after{content:"";inline-size:10px;block-size:10px;clip-path:polygon(14% 52%,0 66%,40% 100%,100% 22%,86% 8%,40% 72%);
  background:var(--accent-ink);transform:scale(0);transition:transform var(--dur-1) var(--ease)}
.check:checked{background:var(--accent);border-color:var(--accent)}
.check:checked::after{transform:scale(1)}
.check:focus-visible{outline:none;box-shadow:var(--focus)}
```

### Badge, chip and the confidence signature
```css
.badge{display:inline-flex;align-items:center;gap:6px;block-size:22px;padding-inline:var(--s-2);
  border-radius:var(--r-pill);font:500 var(--fs-12)/1 var(--font-ui);
  background:var(--surface-3);color:var(--text-2);border:1px solid var(--border-subtle)}
.badge--ok{background:var(--success-soft);color:var(--success);border-color:transparent}
.badge--accent{background:var(--accent-soft);color:var(--accent);border-color:transparent}
.badge--gathering{background:transparent;color:var(--warning);border:1px dashed currentColor}
.chip{display:inline-flex;align-items:center;block-size:28px;padding-inline:var(--s-3);
  border-radius:var(--r-pill);background:var(--surface-2);border:1px solid var(--border-subtle);
  color:var(--text-2);font-size:var(--fs-12)}
.src{composes:chip}                                   /* or duplicate the rules */
.src--measured{border:1px solid var(--border-strong)}
.src--estimated{border:1px dashed var(--border-strong)}
```
**Signature:** a measured value uses solid outlines (chip, ring, bar, target). An estimated
value uses dashed ones. A badge is never styled like a button. Chips and badges are not clickable.

### Meter
```css
.meter{block-size:6px;border-radius:var(--r-pill);background:var(--surface-3);overflow:hidden}
.meter::after{content:"";display:block;block-size:100%;inline-size:var(--v,0%);
  background:var(--accent);border-radius:inherit}
.meter--estimated{background:repeating-linear-gradient(90deg,var(--surface-3) 0 6px,transparent 6px 9px)}
```
Always `role="progressbar"` with `aria-valuenow/min/max` and an `aria-label`, and a visible `X/Y`.

### Setting row (Condition modes, Settings, Household)
```css
.setting{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:var(--s-2) var(--s-6);
  align-items:start;padding-block:var(--s-4);border-block-start:1px solid var(--border-subtle)}
.setting:first-child{border-block-start:0;padding-block-start:0}
.setting__title{display:flex;align-items:center;gap:var(--s-2);font:600 var(--fs-15)/1.4 var(--font-ui)}
.setting__desc{color:var(--text-2);font-size:var(--fs-14);line-height:1.5;max-inline-size:var(--measure)}
.setting__meta{display:flex;flex-wrap:wrap;gap:var(--s-2);margin-block-start:var(--s-2)}
.setting[aria-disabled="true"] :is(.setting__title,.setting__desc){color:var(--text-3)}
```
The control is always at the right edge. The title is ≤1 line. The description is ≤2 lines.
Rules are chips.

### Note (safety and disclaimers)
```css
.note{display:flex;gap:var(--s-3);padding:var(--s-3) var(--s-4);border-radius:var(--r-md);
  background:var(--surface-2);border:1px solid var(--border-subtle);
  color:var(--text-2);font-size:var(--fs-14);line-height:1.5}
.note svg{flex:none;inline-size:18px;block-size:18px;margin-block-start:1px;color:var(--text-3)}
```
Safety text is at least as prominent as the surrounding body text.

### Empty row
```css
.empty-row{display:flex;align-items:center;justify-content:space-between;gap:var(--s-4);
  min-block-size:64px;padding:var(--s-3) var(--s-4);border:1px dashed var(--border);
  border-radius:var(--r-md);color:var(--text-2);font-size:var(--fs-14)}
```
One line, one action. Never a full card for "Nothing yet".

## §7 Patterns

### Signals list (Metabolic twin)
```html
<ul class="signals">
  <li class="signal" data-state="ready">
    <span class="signal__dot" aria-hidden="true"></span>
    <div class="signal__main">
      <h3>Habit rhythm</h3>
      <p class="signal__value"><strong>32%</strong> of due days done
         <span>21 of 66 · last 14 days · 5 habits</span></p>
    </div>
    <div class="signal__side"><span class="badge badge--ok">Ready</span>
      <span class="src src--measured">Habit log</span></div>
  </li>
  <li class="signal" data-state="gathering">
    <span class="signal__dot" aria-hidden="true"></span>
    <div class="signal__main">
      <h3>Maintenance energy</h3>
      <p class="signal__hint">Needs 10 logged days and two weigh-ins 10+ days apart.</p>
      <ul class="req">
        <li><span>Logged days</span><div class="meter" role="progressbar" aria-label="Logged days"
             aria-valuenow="2" aria-valuemin="0" aria-valuemax="10" style="--v:20%"></div><b>2/10</b></li>
        <li><span>Weigh-ins</span><div class="meter" role="progressbar" aria-label="Weigh-ins"
             aria-valuenow="0" aria-valuemin="0" aria-valuemax="2" style="--v:0%"></div><b>0/2</b></li>
      </ul>
    </div>
    <div class="signal__side"><span class="badge badge--gathering">Gathering data</span></div>
  </li>
</ul>
```
```css
.signals{list-style:none;margin:0;padding:0}
.signal{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:var(--s-4);
  padding-block:var(--s-4);border-block-start:1px solid var(--border-subtle)}
.signal__dot{inline-size:8px;block-size:8px;border-radius:50%;margin-block-start:8px;background:var(--success)}
.signal[data-state="gathering"] .signal__dot{background:transparent;border:1.5px dashed var(--warning)}
.signal h3{font:600 var(--fs-15)/1.4 var(--font-ui)}
.signal__value{display:flex;align-items:baseline;gap:var(--s-2);flex-wrap:wrap;color:var(--text-2)}
.signal__value strong{font:400 var(--fs-30)/1 var(--font-display);color:var(--accent)}
.signal__value span,.signal__hint{color:var(--text-2);font-size:var(--fs-14)}
.signal__side{display:flex;flex-direction:column;align-items:flex-end;gap:var(--s-2)}
.req{list-style:none;margin:var(--s-3) 0 0;padding:0;display:grid;gap:var(--s-2);max-inline-size:var(--measure)}
.req li{display:grid;grid-template-columns:7rem 1fr 3rem;gap:var(--s-3);align-items:center;
  font-size:var(--fs-14);color:var(--text-2)}
.req b{text-align:end;font-weight:500;font-variant-numeric:tabular-nums;color:var(--text-1)}
```
Order: ready first. Collapse gathering signals into `<details>` ("3 signals still
gathering data"). The header shows "2 of 5 ready" with 5 dots. Copy: ≤1 line per hint.

### Shopping list
```css
.shop{columns:2 18rem;column-gap:var(--s-10)}
.shop__group{break-inside:avoid;margin-block-end:var(--s-6)}
.shop__group h3{display:flex;justify-content:space-between;padding-block-end:var(--s-2);
  border-block-end:1px solid var(--border-subtle);
  font:500 var(--fs-12)/1 var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--text-3)}
.shop__item{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:var(--s-3);
  align-items:center;min-block-size:44px;border-block-end:1px solid var(--border-subtle)}
.shop__qty{color:var(--text-2);font-size:var(--fs-14);font-variant-numeric:tabular-nums}
.shop__item:has(.check:checked) .shop__name{color:var(--text-3);text-decoration:line-through}
```
```js
// format.js (addition)
export function fmtShoppingQty(g) {
  if (g < 5) return "a pinch";
  if (g < 50) return `~${roundTo(g, 5)} g`;
  if (g < 500) return `~${roundTo(g, 25)} g`;
  const r = roundTo(g, 50);
  return r >= 1000 ? `~${+(r / 1000).toFixed(2)} kg` : `~${r} g`;
}
```
Aisles: Produce (including fresh herbs, garlic, ginger) · Protein (chicken, tofu, tempeh,
eggs) · Dairy · Pantry · Spices and herbs (dry; collapsed under "You probably have
these"). Header: Copy list + "0 of 22 bought". Pantry matches appear first as "Covered by
your pantry (N)".

### Programme comparison
```css
.programmes{display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:var(--s-4)}
.programme{display:flex;flex-direction:column;gap:var(--s-4);padding:var(--s-5);
  border:1px solid var(--border-subtle);border-radius:var(--r-md);background:var(--surface-2)}
.programme--recommended{border-color:var(--accent-line);background:var(--accent-soft)}
.programme ul{list-style:none;margin:0;padding:0;display:grid;gap:var(--s-2);color:var(--text-2);font-size:var(--fs-14)}
.programme .btn{margin-block-start:auto;align-self:flex-start}
```
Each programme has an H3 (sans 600 18), a duration badge, 3 check-listed commitments and
one outcome line. Recommended gets "Matches your goal: build strength" and the one
primary button. Past runs use a compact row: name, `fmtDate`, an "Ended early" neutral
badge, and a meter "0 of 4 weeks".

## §8 App shell
```css
.sidebar{inline-size:var(--sidebar);padding:var(--s-6) var(--s-4);display:flex;flex-direction:column;
  gap:var(--s-6);background:var(--bg);border-inline-end:1px solid var(--border-subtle);
  position:sticky;inset-block-start:0;block-size:100dvh}
.nav{display:grid;gap:var(--s-1)}
.nav a{display:flex;align-items:center;gap:var(--s-3);block-size:40px;padding-inline:var(--s-3);
  border-radius:10px;color:var(--text-2);font:500 var(--fs-14)/1 var(--font-ui)}
.nav a:hover{background:var(--surface);color:var(--text-1)}
.nav a[aria-current="page"]{background:var(--surface-2);color:var(--text-1);box-shadow:inset 2px 0 0 var(--accent)}
.nav svg{inline-size:18px;block-size:18px;stroke-width:1.5;flex:none}
.sidebar__account{margin-block-start:auto;display:flex;align-items:center;gap:var(--s-3);
  padding:var(--s-3);border-radius:var(--r-md)}
.assistant{position:fixed;inset:auto var(--s-6) var(--s-6) auto;inline-size:48px;block-size:48px;
  border-radius:50%;background:var(--surface-2);border:1px solid var(--border);color:var(--accent);
  display:grid;place-items:center;z-index:40;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.to-top{position:fixed;inset:auto var(--s-6) calc(var(--s-6) + 60px) auto;z-index:40}
```
- Points card = "Level" card: tier names, a labelled meter, "35 points to Sprout".
  No bare percentages.
- Account row (avatar, name, gear) is pinned at the bottom.
- Decorative artwork is `aria-hidden`, contained, and never carries essential text
  unless it passes 4.5:1.
- Mobile: the sidebar becomes a 5-item bottom bar. The assistant moves above it.

## §9 Area-by-area spec
- **Profile hero**: shares the 1040 container with the stat row. Avatar 72px.
  Completeness is a labelled meter plus a link to the next step ("4 of 5 · add a goal").
  A sparkline is labelled or `aria-hidden` at 20% opacity.
- **Stat cards**: sans label (12/500), hero number (serif 40 or sans 600 32), sub-line on
  the same metric and window. Data contract `{label,value,window,sub,source}`.
- **Featured moment and Moments**: gradient fallback media, type-based titles, an empty row
  if none.
- **Heatmap**: 16px cells, 4px gap, 7 rows, Monday-first, empties visible at
  `--surface-3`, today outlined, weekday labels in sans, one window everywhere, `role="img"`
  with a text summary.
- **Tracker tiles ("8 things")**: each tile shows metric, window and the latest value, never
  just "1 day logged".
- **Assessment**: summary as a KV list (`11rem minmax(0,1fr) auto`), "Retake" secondary,
  past assessments as rows with the date adjacent to the label.
- **Lab reports**: form in a `<dialog>` drawer, 12-column grid, "e.g." placeholders,
  Save primary and Cancel ghost, and the `.note` above the form.
- **Nutrition hero**: one SVG ring (`pathLength=100`), dashed track when estimated, a target
  or "No target" on every macro bar, a single merged empty state.
- **Today's mix and day strip**: `aria-current="date"`, dot for logged days, future days
  muted, Monday-first.
- **What your plan learned**: structured rows like the signals list, with no paragraph walls.
- **Dishes**: grid `56px minmax(0,1fr) auto`, always a thumbnail fallback, one name plus
  one subtitle, `₹₹₹` with unused symbols dimmed, default sort "Best for you", 24 per page,
  and "Load more".
- **Settings (route)**: Account, Membership, Trainer and clinician, Household,
  Personalization, Sessions and devices, Danger zone, all as setting rows. The danger zone
  is the only place for red, and it is confirmed by `<dialog>`.
- **Dialogs**: native `<dialog>`, backdrop `rgba(3,5,7,.72)` plus blur, `max-height:
  min(86dvh,760px)`, inner scroll, `overscroll-behavior: contain`, full-screen on mobile.

## §10 Polish checklist (the 1% details)
- `text-wrap: balance` on headings, `pretty` on paragraphs.
- Tabular numbers everywhere. Icons all 18px at 1.5 stroke.
- Optical alignment: baseline-align a big number with its label.
- Hover on a card lifts the border to `--border`, never moves the layout.
- Focus ring: 2px gap, 2px gold, on every interactive element.
- `scroll-margin-top` on anchored sections (sticky nav height + 16px).
- Skeletons match the final layout. No spinners for page content.
- Toast on every copy or save ("Copied ✓"), `aria-live="polite"`.
- `scrollbar-color: var(--surface-3) transparent`.
- Images: fixed aspect ratio, `loading="lazy"`, blur-up or a gradient fallback.

## §11 Data trust and copy
- One `/lib/format.js`: `fmtDate` (`en-IN`, "18 Nov 2026"), `fmtNumber`, `fmtKcal`
  ("~2,950 kcal"), `fmtGrams`, `fmtShoppingQty`, `assertPlausiblePeriod`. Everything else
  is banned by lint or grep.
- Every number states its window and has one source. The same metric is never different
  in two places.
- Any "X% of target" claim has a unit test tying the percentage to the displayed target.
- Units match inside a comparison (no "206.25 g" beside "300 ml").
- Weekday maths uses local dates, never `toISOString()`.
- Microcopy: sentence case, verbs on buttons, say it once, no apologies ("nowhere
  else"), no judgment words ("Quit" → "Ended early"). One spelling (en-IN/UK) and one
  term per concept in `docs/COPY.md`.

## §12 Accessibility floor
Text ≥4.5:1, UI and focus ≥3:1. `:focus-visible` everywhere. Hit targets ≥40px (44px on
touch). `role="switch"`, `aria-current`, `aria-live`. Never colour alone. Dialogs trap and
restore focus. Reduced motion and forced-colors respected.

## §13 Definition of Done
Screenshots on 3 seeded accounts × 4 widths · axe clean · contrast script clean ·
stylelint clean (no raw values) · keyboard pass · squint test · 5-second test · registry
updated · PR checklist ticked honestly.

## §14 Registry additions (all OPEN; keep M-01 to M-45 in `docs/MISTAKES.md`)
M-46 active indicator detached from nav pill · M-47 unlabelled 66% on points · M-48 white
rainbow assistant bubble · M-49 clipped tagline artwork and dead zone · M-51 eyebrow
repeats H2 · M-52 mixed measures (48 vs 140ch) · M-53 ready and gathering indistinguishable
· M-54 requirements as prose · M-55 11px source lines · M-56 H2 not larger than item
titles · **M-57 energy-target maths contradicts (P0)** · M-58 "0 g" quantities · M-59
unrounded and gram-level spice quantities · M-60 wrong aisles · M-61 unbalanced columns ·
M-62 bold far-away quantities · M-63 no progress or actions on list · M-64 confusing
footnote · M-65 pantry below the list · M-66 switch floating mid-card · M-67 invisible switch
track, bright off-knob · M-68 rules as paragraphs · M-69 disclaimer not a note · M-70
inverted hierarchy in Programmes · M-71 no recommended programme · M-72 past-run row
(gap, "Quit", no status) · M-73 half-empty cards · M-74 monochrome, no semantic colour ·
M-75 oversized radius and identical card weights · M-76 over-wide container.

## §15 Never
Never ship an untraced number · add a dead control · use gradient or glow on buttons · use
more than one gold button per viewport · use red for non-destructive actions · use
placeholder as label · render "Nothing yet" as a full card · use serif for data · write
inline date or number formatting · build a custom modal · explain a card with a paragraph
when a component fits · put a switch anywhere but the row's right edge · let a card be
half-empty without reason · show "0 g" · call a user's choice "Quit".
