# BLOOM: NUTRITION › PLAN, BRIEF v7 — "Plan, as a day"

Read this before touching Nutrition › Plan, the sub-nav, the sidebar points card,
or any `<details>`. Precedence: **v7 > v6 > v4 > rulebook**. Registry: M-138…M-159
in `docs/MISTAKES.md`. Reviewer score at brief time: ~13/50; target ≥ 40/50.

The Plan tab reads like a settings document: a heading, a paragraph, a table, more
paragraphs. A plan is a **day**, so the page should look like one: a horizontal path
from waking to bed, the meals as clean rows, the balance as a flower, the adjustments
as a short list.

**Owner override (2026-11-19, supersedes §3.5 of the originating brief):** the sidebar
points card goes back to the NORMAL (pre-v4-Slice-2) version. Do not redesign it.

## Hard rules (do not break)

1. **Never change targets, the target formula, the plan composer's dish selection, or
   any calorie/protein number.** Display only. Anything that looks wrong in the numbers
   goes in the REPORT (below), never a silent change.
2. **Say it once.** A name, kcal or protein value appears once per meal row. A fact
   appears in one component only.
3. **Planner returns data; `src/lib/reasons.ts` owns the words** (≤ 140 chars per
   detail). No prose in the plan-view lib.
4. **Solid = measured, dashed/hatched = estimated or planned.** Applies to chips,
   meters, flower petals, rail connectors, estimated times.
5. **One gold-filled button per viewport; flat; no gradient, no glow.** The primary
   "Log meal" follows the clock (`pickPrimaryMeal`). Everything else is neutral.
6. **No empty column shown as data ("—").** If a value is unknown, show a word
   ("Morning") or nothing.
7. **No card-in-card.** Meals are rows inside one panel.
8. **Respect `hideCalories`** everywhere on this page (no kcal in the stat strip,
   the rail or the rows when it is on).
9. **Wellbeing:** never "left", "to go", "burn", "earn", "cheat", "failed", "junk",
   "clean". Calories are never the hero when hidden. Gaps are "Open groups",
   not "No X yet".
10. **Motion:** transform/opacity only (one-shot stroke-dashoffset allowed), house
    durations/easings, everything inside `prefers-reduced-motion`.
11. The rail "now" ring is the **only** looping animation on the page.

House adaptations: TypeScript/React + vitest/jsdom guards instead of Playwright; the
lib layer is the contract authority; format helpers in `src/lib/format.ts`; copy in
`src/lib/reasons.ts`; BloomSheet, not native `<dialog>`; seeded accounts → fixture
states in tests (new / mid / power, incl. hideCalories).

## Slices (one PR each)

### N1 — Single source of truth (no visual change)
- `src/lib/nutrition/planView.ts`: `buildPlanView({plan, log, prefs, now, byFoodId,
  byDishId})` with `sortMeals` (breakfast, lunch, snack, dinner — ONE order for rail
  AND meals), `mealTotals` (dish + INCLUDED add-ons only, the only place a meal's
  totals are computed), `pickPrimaryMeal` (in-window unlogged → next upcoming
  unlogged → none; windows are UI windows, not advice), rail stops, balance (ONE
  groups array feeds flower + headline + chips; meters carry eaten / planned /
  target separately), totals (plan vs guide), adjustments.
- `adjustments[]` is planner-owned data (`{kind, ...data}`, max 3) derived by ONE
  function (`adjustmentsOf`) from the plan's reasons; both the balance prose
  partition and the adjusted list read from that derivation (M-138 data half).
- `adjustmentCopy()` in `src/lib/reasons.ts` (protein-lean / kitchen-relaxed /
  meal-added; unknown kinds dropped, never rendered raw; protein-lean under 7 days
  carries "Early read · N days" badge data; banned words "to go" / "left" / "failed").
- Level progress: `rankFor` in `src/lib/progression/ranks.ts` is already the single
  level source for sidebar, Today and Rewards — do NOT fork it into a new helper.
- `fmtInt` (en-IN grouping) in `src/lib/format.ts`; no raw "1350" on this page.
- VERIFY: add-on semantics (M-147 — header 313 = 276 + 37 proves top-ups are
  included in totals); the 5-vs-6 food-group sources (M-151); the white rainbow
  circle's DOM presence (M-158, amending M-48/M-90).

### N2 — Primitives
- Segmented goal control (sliding neutral thumb, radio inputs, arrow keys native,
  no gold). Changing the goal goes through ONE `setGoal()` and must not make the
  page disagree with Assessment/Programmes without saying so (M-115).
- Underline sub-nav (aria-current="page", sliding indicator, sticky, 48px),
  replacing the pills (M-155).
- One `.more` disclosure style used by EVERY `<details>` (M-157).
- Stat strip (Energy, Protein, Water, Meals); guide values are dashed badges;
  water via `fmtLitres`.
- Day rail (7 stops; meal stops link to `#meal-{slot}`; done = sage check drawn in;
  now = accent ring with a soft pulse; later = outline; estimated times
  dashed-underlined; no dashes ever).

### N3 — Meals as rows (M-141, M-146–M-150, M-159)
- One panel, rows separated by 1px borders, uniform height on desktop; macros in
  four FIXED-width columns so values align down the page; name/kcal/protein ONCE
  per row.
- Cooking badge from dish data; amber + dashed when it violates the user's kitchen
  answers (M-139 display half).
- Primary gold button only on the clock-picked meal (M-149); logged rows show
  sage "Logged", button disabled, photo at 60%.
- Add-ons say what they are: a chip for an included top-up, Remove/Add inside the
  row's details (M-147 display half).
- Local-language name only when the curated-real flag says so (M-148). Never
  auto-transliterate.
- Photos render only when reviewed; a load error falls back to the petal tile.
  Non-food photos are REPORTED, not silently shown (M-150).

### N4 — Balance + adjustments (M-138, M-140, M-151, M-152, M-154)
- Balance: flower (8 petals, states eaten/planned/open from the ONE groups array)
  + one serif hero numeral + two-layer meters (solid = eaten, hatched = plan
  reach) + one legend + one source chip + "Open groups" dashed chips.
  ZERO paragraphs. "To go" is gone.
- Adjustments: rows (icon, title, optional dashed badge, ≤ 140-char detail,
  optional action) rendered from the ONE adjustments array via `adjustmentCopy`.
  Empty → one `.empty-row`, never a card.

### N5 — Header + shell (M-142, M-143, M-156, M-158)
- Plan header: H2 "Today's plan" (not the goal name), one sub-line, dashed
  estimate chip, ghost "Suggest different meals" (renamed from "Compose again").
  The "Composed to land near…" sentence and the duplicate goal H2 are deleted.
- Sidebar points card: OWNER OVERRIDE — the pre-v4-Slice-2 normal version (see
  header note), NOT a redesign.
- M-158 verdict recorded in N1: the white rainbow circle is not in the app DOM.

### N6 — Rubric review
Score the page on the 10-dimension rubric (hierarchy, scannability, rhythm,
alignment, colour, type, data viz, consistency, interaction, brand), 1–5 each.
Target ≥ 4 on all. Attach scores and the three-account screenshots to the PR.
Do not grade leniently: the reviewer will compare.

## Method 14 addendum (2026-11-20 — M-160, M-161; PLAN_METHOD_VERSION 14)

Two composer rules the owner asked for on the live page; they bind every
future slice that touches composition:

- **A curry gets its base.** A lunch/dinner anchor the gravy derivation
  (`dishIsGravyStyle`, recipe structure only — ingredient lines + method
  text, never the dish's name) calls gravy-style is served ONE base at a
  fixed half serving: phulka for a North Indian anchor, steamed rice
  otherwise, each the fallback for the other when gated out of the pool.
  The base is counted in the meal and the day; the repair re-strikes the
  day around it (re-picks judge whole plates; a based meal is never
  re-picked). Never a base at breakfast, at the snack, beside a dry
  anchor, or beside a one-pot/rice/bread anchor. The plain Steamed Rice
  is a library dish like any other (recipe provenance, honestly
  photo-less); the library is 1,203 dishes.
- **The snack's seat is the person's choice.** Preference
  `health.snackPlacement.v1`: "In the longest gap" (default — the P12
  widest-gap rule, unchanged) or "In the morning" (the breakfast→lunch
  gap's midpoint when it holds the snack by the 90-minute rule; the
  widest gap otherwise). It is a composition input recorded on the
  plan's snapshot: changing it names the plan stale ("where your snack
  sits") and rebuilds only on the person's own regenerate tap. The one
  control is a quiet two-choice row inside "How this plan is built" —
  no new section, §7.1 order untouched. Labels follow the clock
  ("Mid-morning snack" at 10:55 on a 07:00–23:00 frame).

## Method 16 addendum (2026-11-25 — M-244; PLAN_METHOD_VERSION 16)

One composer rule from the daily research programme (R-2511-04, ISSN
2017 per-meal protein distribution), approved by the owner as part of
the M-244 package:

- **Each main meal carries a protein aim.** A main-meal pick under
  0.25 g per kg of the engine's own protein-basis weight (the
  reference weight body.ts doses the day's protein on, recovered
  from the resolved targets — the basis itself is unchanged and
  remains the M-82 human-review item) pays a bounded shortfall cost
  in the pick (0.1 at a total shortfall, ranking-term class), so the
  day's protein is distributed across its meals instead of landing
  wherever the fit leaves it. Snacks carry no aim. The day bands the
  day guard judges are untouched, and the aim is stated on the plan
  page itself, in the working-diagnosis block (M-244's PES card:
  "What this plan is working on" at the head of the day card).

## Acceptance (every slice)
- No horizontal scroll at 360/768/1280/1920 (guard proxies in vitest/jsdom;
  geometry verified live by the parent after deploy).
- Dish name appears exactly once in each meal row.
- 0 occurrences of card-in-card (`.card .card`, `.panel .panel`).
- 0 "—" placeholder leaves inside the rail or the meals.
- No paragraph over 200 chars inside the plan; the balance card has 0 paragraphs.
- If "No adjustments today" is present, no adjustment prose exists anywhere on
  the page (M-138).
- ≤ 1 primary button inside the meals.
- Meal row height spread ≤ 24px at ≥ 1280.
- Flower number equals the count of non-open petals.
- Axe: 0 serious/critical. Contrast: text 4.5:1, UI 3:1.
- Keyboard: sub-nav, segmented (arrows), rail links, Log meal, details.
- Reduced motion: no looping animation, no thumb slide.

## REPORT (do not fix; list in the PR description)
a. Plan includes cooked dishes while the Assessment says no cooking / ~10 min:
   how many no-cook dishes exist in the catalogue? (content gap — M-139)
b. Water 3,350 ml/day and 775 ml per meal: where does the formula come from?
   Needs qualified review. (M-145)
c. Guide 1,350 kcal with 171 g protein (~51% of kcal from protein): needs
   qualified nutrition review. Do NOT change. (M-82)
d. Plan adapted from 2 logged days averaging 23 g protein vs the 171 g target:
   confirm the minimum-days rule for adaptation; consider whether a 7× gap
   should be surfaced to review. (M-153)
e. Goal conflict: Plan says "Lose weight", Programmes said "build-strength".
   (M-115 — resolved as static copy in v6 Slice 1; the code reads one setting.)
f. Dishes with non-food or low-quality photos. (M-150)
g. Hindi/local names: which are curated vs auto-generated? (M-148)
h. Container width: measured ~1,160px content vs the 1,120 token.

## Protect (keep)
Serif H1/H2 style; the Bloom flower; macro dots; the USDA source chip; "How this
plan is built" transparency; the metabolic twin signal header
(`●●○○○ 2 of 5 signals ready`) — do not touch; the voice of "…the plan follows
your Assessment as set."

## Do not
- Add gradients, glows, or a second gold fill.
- Add paragraphs to explain a component; fix the component.
- Reorder meals in any one place (use `sortMeals`).
- Delete the old copy without moving its information into an adjustments row or
  a badge. Nothing the user was told may silently disappear.
- Touch the metabolic twin header.
