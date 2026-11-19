# BLOOM: BUILD BRIEF v2 (for the coding agent)

You are a senior front-end engineer with a designer's eye working on **Bloom**, a food,
nutrition and health-tracking app. Deployed at maelix-glitch-bloom-app.bloomlabs.workers.dev.
Identity: dark ink, warm gold, serif display type, sans UI type.

## MISSION
Make Bloom look and behave like it was built by the design teams at Apple, Stripe, Linear
and GitHub, but unmistakably Bloom. "Beautiful" here is concrete and testable:
1. **Quiet.** One focal point per screen or card. Everything else steps back.
2. **Aligned.** Everything snaps to a 4/8 grid, a shared container and shared measures.
3. **Honest.** Every number is traced, rounded for humans, labelled with its window.
   Solid outline = measured. Dashed = estimated. (Bloom's signature, so build it once.)
4. **Structured.** Status is a component (badge, meter, dot, chip). It is never a sentence.
5. **Earned colour.** Gold marks one thing at a time. Semantic colours carry meaning.
6. **Consistent.** Same job, same component, same spacing, everywhere.

## READ FIRST
`docs/BLOOM_UI_RULES.md` is the source of truth for tokens, component CSS, patterns and
per-screen specs. Read it fully before coding. If this brief and the rulebook conflict,
this brief wins and you record the conflict in your report.

## HOW YOU WORK
1. **Inspect the repo first** (framework, build, styling method, routing, data layer,
   tests). Post a 10-line summary. Do not assume a framework. Adapt the rulebook's CSS to
   whatever styling method the repo uses (CSS modules, Tailwind config, vanilla).
2. **Small slices.** One slice, one branch, one PR. Never mix trust fixes with redesign.
3. **Fix the source, not the symptom.** A wrong number is fixed where it is computed.
4. **Migrate screen by screen.** Old and new may coexist. List every leftover.
5. **Decide conservatively and note it.** Ask only before destructive or irreversible
   changes (data migrations, deleting routes, billing logic).
6. **Never touch billing or auth** except the date computation bug (rulebook §11).
7. **Prove it.** Done means screenshots plus tests plus the checklist in §VERIFY. It never
   means "it compiles".

## NON-NEGOTIABLES
- No raw hex, px colours or font sizes in screen CSS. Tokens only (rulebook §2).
- At most ONE gold-filled button per viewport. Flat gold, no gradient, no glow.
- No control that does nothing. Unavailable = disabled switch plus "Not available yet" badge.
- No full-size "Nothing yet" cards. Use the empty row.
- No paragraph where a component belongs (status, requirements, rules, sources).
- Serif only for H1, H2 and one hero numeral per card. Never for data, lists or quantities.
- Text measure max 62ch. Cards never carry a half-empty right side without a purpose.
- All dates and numbers go through `/lib/format.js`.
- Modals use native `<dialog>`. Max z-index 50.
- WCAG 2.2 AA: text 4.5:1, UI 3:1. Measure with a script and don't eyeball.

## SCREEN-BY-SCREEN ACCEPTANCE CRITERIA
Each item is a testable "done" for the slice that touches that screen. Component CSS and
markup are in rulebook §6–§9.

**Shell and sidebar**
- Sidebar 232px. Nav items 40px high, radius 10, 18px icons at 1.5 stroke. The active
  indicator lives INSIDE the pill (never detached at the viewport edge).
- Points card becomes a "Level" card: "Seedling → Sprout", a labelled meter, and "35 points
  to Sprout". No unlabelled percentage.
- Account row (avatar, name, gear to Settings) pinned at the bottom. Tagline and fern
  artwork either fully contained with a gradient mask and ≥4.5:1 text, or removed.
- Assistant bubble: 48px `--surface-2` circle, 1px border, gold glyph, bottom-right at
  24px. No white fill, no rainbow ring. Back-to-top appears only after scrolling
  1.5 viewports.
- Page container: max-width 1040px, 32px gutters (24px on mobile), bottom padding 96px.

**Nutrition: Metabolic twin**
- Header = H2 plus a one-line subtitle plus "2 of 5 ready" with 5 dots. No eyebrow that
  repeats the H2.
- Signals list: ready signals first, each with a status dot, title, one key value (e.g.
  "32%" with "of due days done · 21 of 66 · last 14 days"), a "Ready" badge, and a
  source chip. Gathering signals show a dashed "Gathering data" badge plus requirement
  meters (Logged days 2/10, Weigh-ins 0/2) and are collapsed in a `<details>` by default.
- **P0: trace the "34% of energy target" claim.** 458 kcal at 34% implies about 1,350 kcal,
  but the plan shows about 2,950 kcal. Find the real target, fix the maths or the label,
  and add a unit test.

**Nutrition: Shopping for your plan**
- Header actions: Copy list, plus a "0 of 22 bought" progress. Subtitle uses `fmtDate`.
- Aisles: Produce, Protein, Dairy and eggs, Pantry, Spices and herbs (collapsed under
  "You probably have these"). Fix mis-categorised items (chicken, garlic, ginger,
  coriander, tofu, tempeh).
- Quantities via `fmtShoppingQty`: <5 g → "a pinch", rounded steps above. Never "0 g".
  Regular weight, `--text-2`, tabular numbers.
- Two balanced columns (CSS columns, `break-inside: avoid`). Group labels carry counts.
- Pantry sits ABOVE the list as "Covered by your pantry (N)". Matched items are demoted.
- Checked items strike through, dim, and sink to the bottom of their group.

**Nutrition: Condition modes**
- Settings-row pattern: title + optional badge, one description line, rules as chips,
  computed "Would hide N of 1,202 dishes", and the switch right-aligned at the card edge.
- Switch: 44×24 with a 1px visible track border, dim off-knob, gold only when on.
  Disabled rows are dimmed as a whole.
- The "not a diagnosis, not medical advice" text becomes a `.note` with an info icon.

**Nutrition: Programmes**
- Two comparison cards side by side. Each has name, a duration badge, 3 check-listed
  commitments and one outcome line. The recommended one (Build & Fuel for a strength
  goal) gets a "Matches your goal" badge and the only primary button. The other gets
  secondary.
- Past runs: compact rows with start date (`fmtDate`), an "Ended early" neutral badge
  (never the word "Quit", never red) and a meter "0 of 4 weeks". Label and value are
  adjacent.
- Card gets the same H2 plus subtitle pattern as its siblings.

**Everywhere else**
- Apply the same card, section-head, setting-row, badge, meter and empty-row components
  to Profile, Assessment, Lab reports, Heatmap, Tracker tiles and Dishes, following
  rulebook §9.
- Cards have 16px radius and a hairline border. Use `card--hero`, `card--list`, and
  `card--insight` variants so the page has rhythm. Group cards under H2 headings with
  56px between groups and 16px inside them.

## SLICES (in this order)
1. **TRUST**: formatters and tests, heatmap builder and tests, billing date bug, stat
   contract, points single-source, kcal-target trace, units and rounding, date
   unification, shopping quantity formatter.
2. **SYSTEM**: `tokens.css`, `base.css`, `components.css`, shell and sidebar, assistant
   bubble, container width, stylelint rule banning raw values.
3. **ATOMS**: button, switch, checkbox, badge, chip, src chips, meter, note, setting row,
   empty row, section-head.
4. **PATTERNS**: signals list (Metabolic twin), shopping list and pantry, condition
   modes, programme cards.
5. **SCREENS**: roll components across Profile, Assessment, Labs, Heatmap, Trackers, Dishes.
6. **IA**: Settings route, Profile tabs, Nutrition sub-nav, Dishes route, redirects.
7. **COPY**: one spelling (en-IN/UK), one term per concept, glossary in `docs/COPY.md`.

## VERIFY (before every PR)
1. Three seeded accounts (new, mid-use, power user with 365 days and very long names).
   Full-page screenshots of every changed screen on all three.
2. Widths 360, 768, 1280, 1920. No horizontal scroll, no clipped text.
3. Automated: axe (0 serious/critical), contrast script over every text/background token
   pair, stylelint, unit tests, Playwright smoke (open every dialog, Esc, focus returns).
4. Keyboard pass: visible focus ring everywhere, logical order.
5. Squint test: blur the screenshot. The primary action and key number must still stand out.
6. Grep gates: no raw hex, no inline date or number formatting, no z-index >50, no glow
   shadows on buttons.
7. `prefers-reduced-motion` and forced-colors checked.

## PR FORMAT
What · Why (rulebook sections and registry IDs closed) · Before/after screenshots · Checks
ticked honestly · Assumptions · Leftovers · Update `docs/MISTAKES.md` (never delete, only
mark FIXED with a PR link). Commits: `type(scope): summary`.

## FIRST ACTIONS
1. Repo inspection summary.
2. Seed `docs/MISTAKES.md` from rulebook §14.
3. Start Slice 1. Open its PR before touching visuals.
4. After each slice, post: what shipped, what's verified, what's next, any risk.

---

## Repo commands (preserved from the previous AGENTS.md)

# Bloom

Personal tracker web app — habits, mood, sleep, study and cycle — built with
TanStack Start, React and Tailwind CSS.

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run test` — unit tests (vitest)
- `npm run lint` — eslint

---

# BLOOM: ANTI-DOCUMENT BRIEF v3 (for the coding agent)

You are a senior front-end engineer with a product designer's eye. Bloom is a food,
nutrition and health app (dark ink, warm gold, serif display, sans UI). Tokens and base
components live in `docs/BLOOM_UI_RULES.md` (v2). This brief adds ONE new mission on top.

## THE PROBLEM TO SOLVE
Several Bloom screens read as **a document** (paragraphs split by hairlines) or **a form**
(label left, control or value far right, divider, repeat). Users cannot scan them, and
nothing tells them what matters. A dashboard shows state first and explanation second.

Affected now: Metabolic twin, What your plan learned, Condition modes, Programmes (and
Past runs), Assessment summary, Lab reports, Pantry, shopping footnotes, Nutrition
intro text. Assume other screens have the same disease. Audit them all.

## THE FIVE LAWS OF "NOT A DOCUMENT"
1. **Anchor law.** Every card has exactly one visual anchor the eye hits first: a hero
   number, a ring, a meter, a chart, a status badge, or an image. A card made only of
   text is a bug.
2. **State-first law.** Show the status or value first, then at most one line of
   explanation. "32% of due days done" beats a paragraph that contains it.
3. **Paragraph budget.** See the table below. Anything longer than the budget is
   moved behind a disclosure, trimmed or deleted.
4. **Form-vs-display law.** Forms are for INPUT and live in drawers and dialogs.
   Screens that DISPLAY data use value-first tiles and rows, not label-over-value
   stacks with dividers.
5. **Rhythm law.** Neighbouring cards must not share the same internal structure. Vary
   scale: one hero tile, a grid of tiles, a list, a chart.

## PARAGRAPH BUDGET (hard limits)
| Where | Limit |
|---|---|
| Card subtitle | 1 line, ≤ 90 characters |
| Tile or row description | ≤ 2 lines, ≤ 120 characters |
| Visible paragraphs per card | max 1 |
| Any `<p>` visible by default | ≤ 200 characters |
| Longer explanations | `<details>` ("How this works"), an info popover or a dialog |
| Source or provenance line | a chip, never a sentence |
| Requirements ("log 10 days…") | meters with X/Y, never a sentence |
| Rules ("hides dishes with >75 g carbs") | chips, never a sentence |
| Disclaimers | one `.note`, one or two lines |

## PROSE → COMPONENT CONVERSION TABLE
| If the text says… | Replace with… |
|---|---|
| "2 of 5 signals have enough data" | 5 dots plus "2 of 5 ready" in the header |
| "Log food on 10 days between…" | meters: Logged days 2/10, Weigh-ins 0/2 |
| "From your food log and weigh-ins" | source chip (solid = measured, dashed = estimated) |
| "No weigh-ins on record yet" | dashed badge "No data yet" plus ONE action button |
| "On those days you averaged 458 kcal and 23 g protein, 34% of…" | two mini-stats, each with a number, a unit and a % of target meter |
| "Hides dishes with more than 75 g carbs" | chip "Carbs > 75 g" |
| "Quit · 0 of 4 weeks met" | badge "Ended early" plus meter "0 of 4 weeks" |
| "A structure for the next 12 weeks…" | duration badge, 3 check-listed commitments, one outcome line |
| "Not medical advice, doesn't replace your doctor…" | `.note` with an info icon |
| Methodology (Mifflin–St Jeor, ICMR-NIN, USDA) | "How we calculate this" `<details>` or popover |

## FORM LOOK: HOW TO FIX IT
- **Never** a left label and a right control with 450px of nothing between them, unless the
  row is inside a `.setting` grid where the control is flush to the card's right edge.
- Settings that have rules or consequences become **tiles** (see Mode tile), not rows
  of paragraphs.
- Display values are **value-first**: big value on top, small label beneath (the Apple
  Health pattern). Never "Label ········ Value" across a wide card.
- Dividers are a last resort. Use spacing and surface changes (`--surface-2` tiles) to
  group. At most one hairline style per card.
- Inputs only appear in drawers, dialogs or via inline "Edit". Never expose an empty
  field on a display screen.

## COMPONENTS TO ADD (CSS uses v2 tokens)

### Tile (the core anti-document unit)
```html
<article class="tile" data-state="ready">
  <header class="tile__head">
    <h3>Habit rhythm</h3>
    <span class="badge badge--ok">Ready</span>
  </header>
  <p class="tile__figure"><strong>32%</strong><span>of due days done</span></p>
  <div class="meter" role="progressbar" aria-label="Habit rhythm"
       aria-valuenow="32" aria-valuemin="0" aria-valuemax="100" style="--v:32%"></div>
  <footer class="tile__foot">
    <span>21 of 66 · last 14 days</span>
    <span class="src src--measured">Habit log</span>
  </footer>
</article>
```
```css
.tile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:var(--s-4)}
.tile{display:flex;flex-direction:column;gap:var(--s-3);padding:var(--s-5);
  background:var(--surface-2);border:1px solid var(--border-subtle);border-radius:var(--r-md);
  min-block-size:176px}
.tile__head{display:flex;justify-content:space-between;align-items:center;gap:var(--s-2)}
.tile__head h3{font:600 var(--fs-14)/1.3 var(--font-ui);color:var(--text-2)}
.tile__figure{display:flex;align-items:baseline;gap:var(--s-2);margin:0}
.tile__figure strong{font:400 var(--fs-40)/1 var(--font-display);color:var(--text-1);
  font-variant-numeric:tabular-nums}
.tile__figure span{font-size:var(--fs-14);color:var(--text-2)}
.tile__foot{margin-block-start:auto;display:flex;justify-content:space-between;
  align-items:center;gap:var(--s-2);font-size:var(--fs-12);color:var(--text-3)}
.tile[data-state="gathering"]{background:transparent;border-style:dashed;border-color:var(--border)}
.tile[data-state="gathering"] .tile__figure strong{color:var(--text-3)}  /* "—" placeholder */
```
- Gold appears on ONE tile figure per screen (the most meaningful ready signal). Use
  `--text-1` for the rest.
- Gathering tiles show "—" as the figure, a dashed border, a dashed "Gathering data"
  badge, and requirement meters instead of the main meter.
- A tile **never** contains a sentence longer than its footer.

### Requirement meters (inside gathering tiles)
```html
<ul class="req">
  <li><span>Logged days</span><div class="meter" … style="--v:20%"></div><b>2/10</b></li>
  <li><span>Weigh-ins</span><div class="meter" … style="--v:0%"></div><b>0/2</b></li>
</ul>
```
Use `.req` from the v2 rulebook (§7). Maximum 3 per tile.

### Mode tile (replaces Condition modes rows)
```html
<article class="tile mode" aria-disabled="false">
  <header class="tile__head">
    <h3>Blood-sugar aware</h3>
    <button role="switch" aria-checked="false" class="switch" aria-label="Blood-sugar aware"></button>
  </header>
  <p class="mode__desc">Hides dishes high in added sugar or carbohydrate.</p>
  <ul class="chips"><li class="chip">Added sugar</li><li class="chip">Carbs &gt; 75 g</li></ul>
  <footer class="tile__foot">
    <span>Would hide <strong>N</strong> of 1,202 dishes</span>
  </footer>
</article>
```
- `N` is computed from the real dish data per mode. If it can't be computed, don't
  show the footer.
- Unavailable mode (Thyroid): `aria-disabled="true"`, disabled switch, "Not available yet"
  badge, whole tile dimmed to 55%, footer reads "Needs iodine and selenium data".
- The "not medical advice" sentence is a single `.note` ABOVE the grid, not inside tiles.
- The switch sits top-right inside the tile (never floating in an empty row).

### Insight card (for "What your plan learned" and similar)
```html
<article class="insight">
  <span class="insight__icon" aria-hidden="true"><!-- 20px icon --></span>
  <div>
    <h3>Logging looks partial</h3>
    <p>You've logged 2 of the last 14 days, averaging 458 kcal.</p>
  </div>
  <button class="btn btn--secondary btn--sm">Log today</button>
</article>
```
```css
.insight{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:var(--s-4);
  align-items:center;padding:var(--s-4);background:var(--surface-2);
  border:1px solid var(--border-subtle);border-radius:var(--r-md)}
.insight__icon{display:grid;place-items:center;inline-size:36px;block-size:36px;
  border-radius:10px;background:var(--accent-soft);color:var(--accent)}
.insight h3{font:600 var(--fs-15)/1.4 var(--font-ui)}
.insight p{color:var(--text-2);font-size:var(--fs-14);max-inline-size:var(--measure)}
```
Each insight = a headline conclusion (≤ 6 words), one supporting line and at most one
action. Insights must be derived from data and never hardcoded.

### Value-first stat (replaces label-left/value-right pairs)
```css
.vstat{display:grid;gap:2px}
.vstat b{font:600 var(--fs-24)/1.1 var(--font-ui);font-variant-numeric:tabular-nums}
.vstat span{font-size:var(--fs-12);color:var(--text-3)}
.vstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:var(--s-5)}
```

## SCREEN-BY-SCREEN REBUILD SPEC

### 1. Metabolic twin
Replace the 5 paragraph rows with:
- **Header:** H2 "Your metabolic twin", subtitle "Computed fresh from your record. Nothing
  stored, nothing guessed." (≤ 90 chars), and on the right five dots plus "2 of 5 ready".
- **Body:** a `.tile-grid` of five tiles. Ready tiles come first and gathering tiles
  after, with dashed borders.
- **Tiles:**
  1. Habit rhythm (ready): `32%` · "of due days done" · meter · "21 of 66 · last 14 days" · chip "Habit log".
  2. Food-log coverage (ready): `2/14` · "days logged" · two mini `vstat`s: "458 kcal avg · 34% of target" and "23 g protein · 13% of target" · chip "Food log". Add an insight line only if coverage < 50%: "Logging looks partial".
  3. Maintenance energy (gathering): `—` · badge "Gathering data" · `.req` Logged days 2/10, Weigh-ins 0/2.
  4. Weight trend (gathering): `—` · `.req` Weigh-ins 0/2 · button "Log weight".
  5. Nutrient gaps (gathering): `—` · `.req` Logged days 2/4.
- **Delete** the long intro. Put methodology in `<details><summary>How the twin works</summary>…</details>` under the grid.
- **P0 data check:** "458 kcal = 34% of energy target" implies a target of about 1,350 kcal, but
  the Nutrition hero shows about 2,950 kcal. Trace the real target. Fix the maths or label
  and add a unit test for the percentage.
  *(Parent note, 2026-11-19: this trace is DONE — registry M-57, NOT A BUG. The twin divides
  by the identical target object the hero uses; the ~2,950 figure is the Maintenance energy
  estimate. A pinning test ships in PR #199. Do not redo it.)*

### 2. What your plan learned
Convert to 2–4 insight cards. Each has a one-line headline, one supporting line and an
optional action. The long "Plans are built from real dishes…" paragraph goes into a
`<details>` titled "How this plan is built".

### 3. Condition modes
- One `.note` (info icon) with the safety line, max 2 lines.
- A `.tile-grid` of mode tiles (spec above). Rules become chips and "Would hide N dishes"
  is computed. The switch sits inside the tile at the top right. Thyroid is dimmed and
  disabled as a whole.

### 4. Programmes
- Header H2 + subtitle "Pick a structure for the next few weeks." Two side-by-side
  `.programme` cards (v2 rulebook §7).
- Each card: name, duration badge, check-listed commitments (3 max), one outcome line.
- "Build & Fuel" gets a "Matches your goal: build strength" badge, an accent border and the
  card's one primary button "Enrol". "Strong Start" gets a secondary button.
- **Past runs:** a compact list inside a `<details open>` titled "Past runs (1)". Each
  row is a name, `fmtDate`, an "Ended early" neutral badge and an inline "0 of 4 weeks"
  meter, all adjacent. Never the word "Quit".

### 5. Assessment, Lab reports, Pantry
- **Assessment summary:** `vstats` grid (e.g. Goal, Eating pattern, Budget, Activity),
  value-first, and a single "Retake" secondary button in the header. Previous assessments
  collapse into `<details>`.
- **Lab reports:** the empty state is one `.empty-row`, then a `.note` for the disclaimer
  at equal weight. The form is in a drawer, never inline.
- **Pantry:** a chip input ("Type an ingredient, press Enter") above the shopping list.
  Matches show as "Covered by your pantry (N)" chips. The Add button is secondary until
  the input is valid.

### 6. Shopping list footnote
Delete "they are set in the Assessment, nowhere else". If the information matters, use a
chip: "Diet: Vegetarian · Budget: ₹₹" with an "Edit" ghost link to the Assessment.

### 7. Everything else
Run the Document Test and the Form Test (below) on every card in Profile, Trackers, Mood,
Rewards and Coach. Convert failures using the conversion table.

## COPY REWRITES (before → after, real examples from the app)
| Before | After |
|---|---|
| "A living model of you, computed from your own record each time you look — nothing stored, nothing guessed. 2 of 5 signals have enough data to speak today." | Subtitle: "Computed fresh from your record. Nothing stored, nothing guessed." Header: "2 of 5 ready" |
| "2 of the 10 logged days, and 0 weigh-ins spanning 0 days, are on record. Log food on 10 days between two weigh-ins at least 10 days apart and your maintenance estimate appears — no formula guess in the meantime." | Title "Maintenance energy" · badge "Gathering data" · Logged days 2/10 · Weigh-ins 0/2 · hint "Needs two weigh-ins 10+ days apart." |
| "No weigh-ins on record yet. Log your weight on two different days and the trend appears." | `—` · badge "No data yet" · button "Log weight" |
| "Logged 2 of the last 14 days. On those days you averaged 458 kcal and 23 g protein — 34% of your energy target, 13% of your protein target." | `2/14` days logged · "458 kcal avg · 34%" · "23 g protein · 13%" |
| "Hides dishes whose ingredients include added sugar (granulated sugar or honey). Hides dishes with more than 75 g of carbohydrate in a serving." | Chips: "Added sugar", "Carbs > 75 g" |
| "Bloom's food data doesn't include iodine or selenium, so this mode can't check dishes yet. It hides nothing." | Badge "Not available yet" · "Needs iodine and selenium data." |
| "Four weeks of getting the basics recorded: food in the log, habits ticked, one weigh-in a week…" | ✓ Log food daily · ✓ Tick habits · ✓ Weigh in weekly — "Build the habit of recording." |
| "19 Nov 2026 · Quit · 0 of 4 weeks met" | "Strong Start" · 19 Nov 2026 · badge "Ended early" · meter 0 of 4 weeks |

## AUTOMATED GUARDS (write these first, as part of Slice 1)
Playwright test that fails the build when a screen reads like a document.
```js
// tests/anti-document.spec.js
import { test, expect } from "@playwright/test";
const ROUTES = ["/profile","/nutrition","/today","/trackers","/mood","/rewards","/coach"];

for (const route of ROUTES) {
  test(`anti-document: ${route}`, async ({ page }) => {
    await page.goto(route);
    const report = await page.evaluate(() => {
      const visible = (el) => !el.closest("details:not([open]), dialog:not([open]), [hidden]");
      const longP = [...document.querySelectorAll("main p")]
        .filter(visible).filter(p => p.textContent.trim().length > 200)
        .map(p => p.textContent.trim().slice(0, 60));
      const cards = [...document.querySelectorAll("main .card, main .tile")];
      const textOnly = cards.filter(c =>
        !c.querySelector(".meter,[role=progressbar],svg,img,canvas,.tile__figure,.vstat,.badge,.empty-row,.stat"))
        .map(c => c.querySelector("h2,h3")?.textContent.trim() ?? "(untitled)");
      const manyP = cards.filter(c => [...c.querySelectorAll(":scope > p, :scope > * > p")]
        .filter(visible).length > 1).map(c => c.querySelector("h2,h3")?.textContent.trim());
      const wideGap = [...document.querySelectorAll(".setting, .kv-row")].filter(r => {
        const kids = [...r.children]; if (kids.length < 2) return false;
        const a = kids[0].getBoundingClientRect(), b = kids[kids.length-1].getBoundingClientRect();
        return b.left - a.right > 320;
      }).length;
      return { longP, textOnly, manyP, wideGap };
    });
    expect(report.longP, "paragraphs over 200 chars").toEqual([]);
    expect(report.textOnly, "cards with no visual anchor").toEqual([]);
    expect(report.manyP, "cards with more than one paragraph").toEqual([]);
    expect(report.wideGap, "label/value gaps over 320px").toBe(0);
  });
}
```
Start with this test failing on every offending screen, then make it pass. That gives you
a measurable "done". Tune the selectors to the repo's real class names. If a card
legitimately needs an exemption, add `data-allow="long-text"` and justify it in the PR.
*(Parent note, 2026-11-19: this repo has NO Playwright setup — its guard tradition is
vitest/jsdom guard tests (sheet.guard, contrast.guard, trust.guard). Implement the same
four checks as a vitest/jsdom structural guard over the rendered sections, selectors tuned
to Bloom's real classes, failing-first. Do not install Playwright.)*

## MANUAL TESTS (the agent must do these and attach the evidence)
1. **Squint test.** Blur the full-page screenshot at 8px. You must still see the hero
   number, the status colours and the primary action.
2. **Cover-the-text test.** Hide all text longer than 3 words. You should still tell
   what's ready, what's gathering and what to do next from shapes and colour alone.
3. **Form test.** If you could submit the screen and it would make sense, it looks like
   a form. Fix it.
4. **Print test.** If a screen would look the same as a printed Word document, it fails.
5. **Five-second test.** "What is this? What's my status? What can I do?"

## SLICES
1. **GUARDS + TRUST:** the anti-document test (failing), formatters, kcal-target trace,
   points single-source.
2. **ATOMS:** tile, req meters, mode tile, insight, vstat, `.note`, `.empty-row`, chips.
3. **METABOLIC TWIN** rebuild + "What your plan learned".
4. **CONDITION MODES + PROGRAMMES** rebuild + Past runs.
5. **ASSESSMENT / LABS / PANTRY / SHOPPING** rebuild.
6. **Sweep** the remaining screens with the conversion table until the guard test is green on every route.
7. **Copy pass** (glossary, spelling, tone).

## VERIFY / PR / NEVER
- Verification and PR format are as in the v2 brief: 3 seeded accounts × 4 widths,
  axe, contrast script, stylelint, keyboard pass, registry updated.
- Every PR also states: guard test before/after, plus the squint and cover-the-text
  screenshots.
- **Never:** write a visible paragraph over 200 characters · put two paragraphs in one
  card · explain a status in a sentence when a badge or meter exists · use label-left,
  value-far-right on a display screen · show an empty form field on a display screen ·
  repeat the same row structure more than 3 times in a row without a tile, grid or chart ·
  use gold on more than one figure per screen · say "Quit" · ship a number that
  contradicts another one.

## FIRST ACTIONS
1. Summarise the repo (framework, styling, routes) in 10 lines.
2. Add the anti-document Playwright test and post its failing report.
3. Add registry entries M-77 to M-80 (below), then begin Slice 1.
