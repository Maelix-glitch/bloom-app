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
