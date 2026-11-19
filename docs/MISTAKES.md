# MISTAKES REGISTRY

Every UI/data-trust mistake Bloom has made, numbered once and never deleted.
An entry is only ever re-marked — OPEN → FIXED (with the PR or branch that
fixed it) — never removed. Sources: BLOOM UI RULES v1 §registry (M-01..M-25),
the second senior screen-by-screen diagnosis of 2026-11-18 (M-26..M-45), and
BLOOM UI RULES v2 §14 (M-46..M-76). Statuses below were verified against the
code on main `af9f1b21` on 2026-11-19 (census in the rulebook-v2-trust log);
an entry is marked FIXED only where that verification found the fix in code.

## M-01..M-25 (rulebook v1)

| ID | Mistake | Status |
|---|---|---|
| M-01 | Billing period shows **18 Nov 2126** (100-year offset) | **NOT A BUG** — the date is the owner's intentional manual 100-year Premium Plus grant. Never "fix" it. |
| M-02 | Points widget duplicated in the sidebar | FIXED — one RailPointsCard in the rail; the PointsChip exists only on the separate mobile-bar surface (HomeSidebar.tsx). |
| M-03 | Moment cards inconsistent: blank media box, identical "A moment" titles | FIXED — gradient fallback media + type-based titles (FeaturedMoment.tsx, MomentsGrid.tsx). |
| M-04 | Pill nav lacked active state and did not cover all sections | FIXED — PR #177; the IA was later superseded by Plan B (PR #191). |
| M-05 | Sign out styled as danger (red) | FIXED — sign-out rows are neutral `.pf-row`s; red is reserved for the separate Erase danger card (SessionsSection.tsx). |
| M-06 | Sticky tab bar had no backdrop; content collided with it | FIXED (superseded) — the bar it named was removed by Plan B (PR #191); remaining sticky chrome carries backdrop blur + border. |
| M-07 | Paywall status labels styled as buttons ("Your current plan") | FIXED — PR #175 (statuses are badges; current-plan emphasis corrected). |
| M-08 | Paywall: no close button, thin backdrop, assistant widget above modal | FIXED — PR #179 (real close, opaque panels, backdrops at .72). Native `<dialog>` deliberately deferred with stated reasons in that PR. |
| M-09 | Paragraph-heavy Membership & Trainer sections | FIXED — PR #181 (Membership status card) + PR #180 (Trainer settings rows). |
| M-10 | Always-open household form (~450px) | PARTIAL — the add form is a compact inline form now, still always open; no `<details>`/dialog collapse. |
| M-11 | Dish list wall (8+ items, 1,194 more) | FIXED — 3 chips + "Browse all {total}" (verified live, PR #176). |
| M-12 | "Sharing off" faux-button | FIXED — real `role="switch"` control. |
| M-13 | No Copy action on referral code | FIXED — Copy button + feedback (PR #176). |
| M-14 | Three date formats on one page | FIXED — PR #182 (shared `fmtDate`) + PR #192 (en-IN pinned at every call site). Native date inputs are browser-rendered, out of scope by design. |
| M-15 | Swash ampersand reads as "℅" in headings | OPEN — no merged fix found. |
| M-16 | Wayfinding speaks three dialects (pill / eyebrow / heading) | PARTIAL — one label per section largely achieved by Plan B (PR #191); full unification is rulebook-v2 SYSTEM work. |
| M-17 | Status words in monospace, mixed styles | FIXED — statuses render as Badge components; mono survives only on codes/URLs, which the rulebook sanctions. |
| M-18 | Orphaned sections (Personalization, Danger) missing from pills | FIXED — PR #191: every section lives on the /settings route with anchors. |
| M-19 | Stacked "SETTINGS / Account / ACCOUNT / Account & data" | FIXED — PR #191: one eyebrow + H1 pair. Residual: the eyebrow repeats the H1 word (same class as M-51; SYSTEM slice). |
| M-20 | Dark native `<select>` popup renders white | FIXED — `color-scheme: dark` (src/styles.css). |
| M-21 | Gold overused (buttons, links, glows compete) | PARTIAL — gradient/glow primaries retired (PR #183, PR #193); a gold-gradient track remains on the rail points card; the full gold budget is rulebook-v2 SYSTEM work. |
| M-22 | "1202 of 1202 dishes suit everyone" while only one member | FIXED — PR #182 (household count copy is state-aware). |
| M-23 | Two floating widgets stacked at right edge (assistant + back-to-top) | NOT REPRODUCIBLE — no back-to-top control exists (see M-31); the single floating control is the CoachOrb by design; orb stacking guard-pinned in PR #175. |
| M-24 | Moment grid narrower than other cards (alignment break) | OPEN — no merged fix found. |
| M-25 | Sign-out-everywhere has no confirmation | ALREADY SATISFIED — two-tap "Tap again to confirm" (SessionsSection.tsx), verified in code; it predates this entry. |

## M-26..M-45 (second senior diagnosis, 2026-11-18)

The P0 items were individually numbered (M-26..M-31, M-45) and are listed
individually. The P1/P2 items M-32..M-44 were recorded as a theme set; they
are seeded here per theme with the status the six-slice programme
(PRs #182–#192) verifiably reached, rather than inventing per-ID text the
audit file did not preserve.

| ID | Mistake | Status |
|---|---|---|
| M-26 | Heatmap probably not weekday-aligned; header/legend cited different windows | FIXED — PR #182. The weekday computation was already correct (Monday-first recordGrid, test-pinned after the fix); the real defect — two windows on one card — was fixed. |
| M-27 | Stat tiles contradict (Rewards 0 vs 945 points; "4" with a last-30 sub-line) | FIXED — PR #182 (Points tile single-sourced; week tile "4 of 7"; house date format). |
| M-28 | "Thyroid aware" is a live switch whose own copy admits it checks/hides nothing | FIXED — PR #182 (disabled, forced off, "Not available yet" badge, missing-data named). Residual switch styling is M-67. |
| M-29 | Units/precision: 206.25 g compared against 300 ml; "~2964 kcal" false precision | FIXED — PR #182 (grams-to-grams comparisons; `fmtKcalApprox` rounds estimates to the nearest 50; whole grams). |
| M-30 | Four date formats across screens | FIXED — PR #182 + PR #192 (see M-14). |
| M-31 | Back-to-top visible at scroll position 0, using the Bloom mark | NOT REPRODUCIBLE — no back-to-top control exists anywhere in src; the floating Bloom-mark control is the CoachOrb/Vitalis launcher, present at all scroll positions by design (PR #182 census). |
| M-32..M-44 (themes) | Mixed text measures | FIXED as a token — `--measure: 62ch` (PR #183); row-level application continues under M-52/M-73. |
| | ~1,100px label-to-value gaps | FIXED for list rows — bounded `.kv-row` pairs (PR #183); wide-card rows remain under M-66/M-72. |
| | Collapsed gold-button hierarchy (gradient + glow primaries) | FIXED — PR #183 (flat `var(--gold)` primaries), extended app-wide in PR #193. |
| | Full-card empty states | FIXED — PR #186 (`.empty-row`, merged Nutrition empty state, GettingStartedCard). |
| | Mono uppercase micro-labels ~10–11px | PARTIAL — size floors raised in the OTT passes; labels remain an uppercase eyebrow style by design. |
| | Serif overuse on data | PARTIAL — shopping quantities de-seriffed (PR #183); Twin numerals remain serif display (see M-56). |
| | Identical cards, no grouping | OPEN — carried forward as M-75. |
| | Safety disclaimer quieter than surrounding text | PARTIAL — the `.note` component exists (PR #183); Modes still doesn't use it (M-69). |
| | Jargon without plain subtitles | PARTIAL — PR #192 copy pass; the glossary (docs/COPY.md) is rulebook-v2 COPY-slice work. |
| | Profile hero wider than grid + unlabelled sparkline | PARTIAL — Profile layout rebuilt under Plan B (PR #191). |
| | Barcode-like heatmap cells | OPEN — no merged fix found. |
| | Tracker tiles without metric/window/latest value | FIXED — PR #190 (stat-card contract). |
| | Lab form (raw form, no drawer pattern) | FIXED — PR #190 (house BloomSheet drawer form). |
| | Nutrition ring/macros without target honesty | FIXED — PR #190 (ring centre = remaining) + PR #183 (EstimateChip, dashed = estimated). |
| | Signal rows as walls of text | PARTIAL — PR #190 (figures from the same comparison as the prose); the full signals pattern is M-53/M-54. |
| | Shopping list: raw USDA names, no checkboxes | FIXED — PR #190 (friendly names, house Checkbox). Quantities/aisles were NOT fixed there — see M-58..M-60. |
| | Pantry placement below the list | OPEN — carried forward as M-65. |
| | Programme cards (no goal match) | FIXED — PR #183 (goal-match data) + component rendering; residual hierarchy is M-70. |
| | Dish cards: missing thumbs, misalignment, truncation, alphabetical default, unpaginated 1,202 DOM | FIXED — PR #190 (provenance badge, sortDishesForYou, 48-per-page pagination, thumbnail fallback). |
| M-45 | Terminology/spelling drift ("Omnivore" vs "non-vegetarian"; US "Personalization" beside UK spellings) | FIXED — PR #182 (`DIETARY_LABEL`) + PR #192 (en-IN pass). One dead export (`PLAN_PATTERN_LABEL`) remains flagged for cleanup. |

## M-46..M-76 (rulebook v2 §14; census 2026-11-19)

| ID | Mistake | Status |
|---|---|---|
| M-46 | Active indicator detached from nav pill (tick at the rail's edge, `left:-1rem`) | OPEN — owner slice SYSTEM. |
| M-47 | Unlabelled 66% on the points card; no "points to Sprout" | OPEN — owner slice SYSTEM (Level card). |
| M-48 | White rainbow assistant bubble | STALE — not reproducible in current code: the orb is a dark panel circle with a gold border/glyph (src/styles/orb.css). Residual: 56px vs the brief's 48px and z-index 60 — SYSTEM. |
| M-49 | Clipped tagline artwork (fern) and dead zone in the sidebar footer | OPEN — owner slice SYSTEM. (The companion ask, an account row pinned at the bottom, already exists: RailProfile.) |
| M-51 | Eyebrow repeats the H2 ("METABOLIC TWIN" / "Your metabolic twin") | FIXED — antidoc-twin slice (anti-document v3, slices 1–3): the eyebrow is deleted; the header is H2 + one subtitle line + readiness dots. |
| M-52 | Mixed measures in one card (intro 58ch, rows full width) | FIXED — antidoc-twin slice: the intro paragraph is deleted; the five signals are tiles in one grid, each carrying only its own value, hint and footer. |
| M-53 | Ready and gathering signals indistinguishable (status in prose) | FIXED — antidoc-twin slice: state is structural — Ready / Gathering data / No data yet badges, sage-vs-dashed readiness dots, gathering tiles dashed with figure "—". |
| M-54 | Requirements written as sentences, not meters | FIXED — antidoc-twin slice: requirements render as .req meters built from counts twin.ts now returns (TwinField.progress: Logged days x/10, Weigh-ins x/2, Logged days x/4). |
| M-55 | Source lines as small grey text, not the solid/dashed source chip | FIXED — antidoc-twin slice: provenance is a source chip in each tile footer (nut-badge src-chip; solid = measured, dashed = estimated); the full provenance sentences moved into the "How the twin works" details. |
| M-56 | H2 (18px) smaller than the row numerals (22px) inside its card | FIXED — antidoc-twin slice: tile titles are 14px and the H2 sits at the house section size above them; the old 22px mid-paragraph numerals are gone — figures are the tiles' sanctioned anchors. |
| M-57 | Energy-target maths contradicts (458 kcal = "34% of target" vs ~2,950 kcal elsewhere) | **NOT A BUG** — traced 2026-11-19: the Twin divides by `targets.kcal` from the same targetState the Nutrition hero uses; they cannot diverge. The ~2,950 figure is the maintenance (burn) estimate, a different labelled quantity. Pinned by unit tests (lib twin.test.ts; section pin added in the rulebook-v2-trust slice). |
| M-58 | Shopping quantities can render "0 g" | FIXED — rulebook-v2-trust slice (fmtShoppingQty: under 5 g renders "a pinch"). |
| M-59 | Unrounded, gram-precise spice quantities (358 g, 103 g, 263 g) | FIXED — rulebook-v2-trust slice (fmtShoppingQty rounding steps). |
| M-60 | Wrong aisles (chicken/garlic/ginger/coriander under "Other"; tofu/tempeh under "Pantry staples") | FIXED — rulebook-v2-trust slice (five aisles derived from classification facts at the grocery grouping). |
| M-61 | Unbalanced shopping columns | PARTIAL — CSS columns + break-inside already in place (PR #183); the imbalance was materially the bloated "Other" group, shrunk by the M-60 fix. Residual: PATTERNS. |
| M-62 | Shopping quantities bold white, far from the name | PARTIAL — distance fixed by bounded pair rows (PR #183); weight/colour (600, full foreground) still open: PATTERNS. |
| M-63 | No progress ("0 of 22 bought") and no Copy/Share on the shopping list | FIXED — antidoc-slice5 (anti-document v3, slice 5): the header carries "{bought} of {total} bought" from the session bought state, a Copy list button (plain-text list — friendly names, fmtShoppingQty quantities, grouped by aisle — with a Copied confirmation state) and a Share button (navigator.share, falling back to copy). Guard-pinned in antiDocumentSlice5.guard.test. |
| M-64 | Confusing shopping footnote ("…set in the Assessment, nowhere else") | FIXED — antidoc-slice5: the footnote is exactly two short lines in a `.note` — "Your pattern and budget come from your Assessment." / "Change them there and this list follows." The old sentence no longer renders (guard-asserted). |
| M-65 | Pantry sits below the list it changes; no "Covered by your pantry (N)" | FIXED — antidoc-slice5: a "Covered by your pantry (N)" block sits ABOVE the aisles, chips naming each covered food with the on-hand quantity from the pantry record (new additive `pantryOnHandGrams` on the lib result; the deduction maths is untouched and the aisle rows keep their deduction wording). The pantry's own card stays below the list — it is the editor for the record, and its items now lead with the quantity figure. |
| M-66 | Condition-mode switches float mid-card, not at the row's right edge | FIXED — antidoc-modes slice (anti-document v3, slice 4): modes are tiles; the switch sits inside the tile's head at its top-right. The system-slice mid-card choice is superseded per rulebook v2. |
| M-67 | Switch track nearly invisible; off knob is the brightest element | FIXED — antidoc-modes slice: the shared ui/switch track carries a 1px --border-strong rim in both states (gold when on) and the off thumb is muted-foreground, not cream. Every switch consumer inherits it (Assessment, Home, Modes, Profile data sheets, Trainer). |
| M-68 | Mode rules as paragraphs, not chips | FIXED — antidoc-modes slice: rules are chips derived from the mode rule data ("Added sugar", "Carbs > 75 g", "Sodium > 800 mg"), and the computed footer "Would hide N of 1,202 dishes" shows in BOTH switch states (blood-sugar 201, blood-pressure 265 on the current library). |
| M-69 | Safety disclaimer is plain intro text, not the `.note` component | FIXED — antidoc-modes slice: the safety line is a single `.note` with an info icon above the mode tile grid. |
| M-70 | Inverted hierarchy in Programmes (H2 and programme titles both 18px; no intro line) | FIXED — antidoc-modes slice: section H2 stays the serif house section size; programme card titles are --text-body semibold sans inside comparison cards, and the section gained the subtitle "Pick a structure for the next few weeks." |
| M-71 | No recommended programme ("Matches your goal") | FIXED — PR #183 (goal-match data + badge + sole primary). No badge shows when neither programme declares the user's goal — by design. |
| M-72 | Past-run row: label/value ~1,100px apart, "Quit" wording, no status component | FIXED — antidoc-modes slice: past runs are compact rows inside a "Past runs (N)" disclosure — name, fmtDate, neutral "Ended early" badge (completed runs keep "Completed") and an adjacent "X of Y weeks" progressbar meter. The word "Quit" no longer renders anywhere in the section (the active run's button is "End programme"); the guard test proves it. |
| M-73 | Half-empty cards (full-width cards, measure-capped text) | OPEN — owner slice SYSTEM (container). |
| M-74 | Monochrome grey; no semantic colour carrying meaning | OPEN — owner slices SYSTEM/ATOMS (semantic tokens exist; the audited surfaces don't apply them). |
| M-75 | Oversized radius (24px) and identical card weights, no variants | OPEN — owner slice SYSTEM. |
| M-76 | Content container too wide (~1,180px; rulebook cap is 1040px) | OPEN — owner slice SYSTEM. |
| M-77 | Data and status explained in paragraphs (Metabolic twin, What your plan learned) | FIXED — antidoc-twin slice (anti-document v3, slices 1–3): both named sections rebuilt to tiles and insight cards; every value byte-identical, enforced by the anti-document guard + the M-57 pin. |
| M-78 | Display screens use form anatomy (label left, value or control far right, dividers) | PARTIAL — antidoc slices 3–4: the form anatomy is gone on the Metabolic Twin, What-your-plan-learned, Condition Modes and Programmes (tiles and comparison cards, guard-enforced). antidoc-slice5: Lab reports are value-first (latest value is the figure, test name its label; range position as a meter against the person's own entered range only) and the assessment summary's scalar answers are value-first stats, so neither surface reads as label/value rows. Remaining display screens keep their rows until the sweep slice (anti-document slice 6). |
| M-79 | Cards with no visual anchor (all text) | FIXED for the audited sections — antidoc-twin slice anchored the Twin and plan-learned cards; antidoc-modes slice anchored Modes (chips, badges) and Programmes (duration/match badges, meters), and the anti-document guard's census pins for both were flipped to strict. antidoc-slice5 extends the strict guard to the shopping list + pantry, Lab reports, the assessment summary view and the Profile starting-point header (anchors: vstats, range meters, note icons, state badges). The sweep slice extends the guard route by route; un-audited screens are not claimed here. |
| M-80 | Neighbouring cards share one structure, so the page is a wall of identical slabs | OPEN — anti-document brief v3: rhythm law (hero, grid, list, chart). |
| M-81 | Truncated copy: "…Retake the Assessment if those answers no longer fit — y" — a sentence cut mid-word (P0) | FIXED 2026-11-19 (brief v4 Slice 1) — root cause was NOT a render clamp: the stored-plan parser (`parsePlanValue` in plan.ts) read each plan note through the storage sanitiser `text(item, 300)`, a hard `slice` with no ellipsis; the composer's kitchen-relaxation note runs ~370 chars and was cut at exactly 300 on every read. Root fix per the brief: the planner returns DATA — the composer emits structured reasons (20 kinds) and `src/lib/reasons.ts` owns ALL the copy (every detail ≤140 chars, ends with a full stop, unit-pinned per kind); `DailyPlan.notes` strings are derived from the reasons at compose time, so stored text and data can never disagree; stored plans keep parsing (reasons ride alongside notes; legacy notes-only plans read as before; unknown/invalid reasons drop, never fatal). The parser's note bounds are now tamper bounds (2,000), never editors. PLAN_METHOD_VERSION stays 13 — composition is byte-identical (matrices 500 + 1000 pass). Pinned by `src/lib/polish.guard.test.tsx` (storage round-trip on the owner's exact corner + render truncation check). |
| M-82 | Targets look inconsistent: 1,350 kcal with 171 g protein ≈ 51% protein share; a ~2,950 kcal figure also appears (P0, verify) | OPEN — traced 2026-11-19 (brief v4 Slice 1), FLAGGED FOR HUMAN NUTRITION REVIEW; no formula, target or user number changed. Trace: ONE target source — Assessment → `targetsFor` (src/lib/vitalis/calc/body.ts) → `bodyTargetsOf` (src/lib/health/body.ts) → `nutritionTargetsFromOutcome` (src/lib/nutrition/targets.ts); hero, plan and Twin all divide by that one `NutritionTargets` (now through the single `pctOfTarget` in targets.ts). BMR = Mifflin–St Jeor (10·kg + 6.25·cm − 5·age; sex constant male +5 / female −161 / unspecified −78); maintenance (formula) = BMR × activity factor (1.2–1.9); goal adjustment = pace clamped 0.25–1.0 kg/wk × 7,700/7 kcal/day (≈1,100 at 1 kg/wk) subtracted for lose; kcal floor = max(floor, …) with floor male 1,500 / female 1,200 / unspecified 1,350; protein = g/kg × ACTUAL body weight (lose 1.8, gain 1.6, recomp 2.2, maintain 1.4). Owner's pair reproduced exactly: 95 kg × 1.8 = 171 g; BMR 1,808 (unspecified) → TDEE 2,170 → raw lose target 1,070 → the unspecified-sex FLOOR 1,350 binds. So 1,350 is the safety floor — NOT his BMR (1,808–1,891) and NOT maintenance (2,070–2,269 formula). The ~2,950 figure is the MEASURED maintenance estimate (`estimateExpenditure`, energy balance over logged days + weigh-ins) rendered in the Twin's Maintenance-energy tile and the plan's target-proposal block — an estimated burn with its own label, never an intake target; the hero never renders it. PLAUSIBILITY VERDICT: protein share = 171×4/1,350 = 50.7%, far over the brief's ≤35% line; `assertPlausibleTargets({kcal:1350, proteinG:171}) === false` (pinned in targets.test.ts). Cause: the kcal side is a safety FLOOR (a minimum, deliberately not lower) while the protein side is an unfloored g/kg band on actual weight — at 95 kg in a deficit the two rules collide into a pair that follows the engine's rules but is nutritionally implausible as a day's eating. Whether the floor, the band, or the weight basis should change is a qualified human reviewer's call. Stays OPEN until that review. |
| M-83 | One fact, three places (intake vs target in Today's mix, plan-learned and Twin; maintenance requirements in two) | OPEN — brief v4 Part 1 "say it once" table + data-metric guard; Twin absorbs plan-learned (Slice 5). |
| M-84 | Eyebrow-only headings ("TODAY'S MIX", "WHAT YOUR PLAN LEARNED" — 11px labels, no H2) | OPEN — brief v4 Slice 3 (section system: real H2 + subtitle per section). |
| M-85 | Today's mix: 6 paragraphs on a bare background; the three guideline items are meters, not sentences; ~60% empty width | OPEN — brief v4 Slice 4: Today's balance (Bloom flower + goal meters + missing-group chips). |
| M-86 | Inconsistent body text (Today's mix ~12px grey vs insight text ~15px near-white) | OPEN — brief v4 Slice 3 (one body style: 15px body, 14px secondary, nothing readable under 12px). |
| M-87 | Section spacing 25–31px instead of 56px — sections fuse into one scroll | OPEN — brief v4 Slice 3 (.section margin 56px, scroll-margin for sub-nav). |
| M-88 | Two filled tan "Log this meal" pills side by side (gold budget), pill shape instead of 10px-radius buttons, "47 g" in green category text | OPEN — brief v4 Slice 4: next meal only gets primary, "Log meal", macro dots never coloured text. |
| M-89 | Nav active state: thick gold ring around the Nutrition pill (stuck :focus or outlined active) and the gold marker still detached at x≈5 (extends M-46) | OPEN — brief v4 Slice 2: :focus-visible only, active = filled surface + 3px bar inside the pill. |
| M-90 | Two mismatched floating circles: white rainbow assistant bubble (~46px, mid-edge) and a dark back-to-top (~56px, Bloom logo), misaligned ~35px (extends M-31/M-48) | OPEN — brief v4 Slice 2: one .dock, two 48px fabs, same style and x. Census note: the v2 census found the orb already dark in code and no back-to-top control exists — the slice must identify both circles from the live DOM/code before rebuilding. |
| M-91 | Sidebar account row: green presence dot (meaningless in a health app), blue verified tick (off-palette, social-media read), level name duplicated ("First Bloom" in two places) | OPEN — brief v4 Slice 2: level card "{current} → {next}" + labelled meter + "N points to {next}" computed from the real rank thresholds; presence dot removed; tick removed or gold with a real meaning. Auditor correction recorded: "Seedling → Sprout" was his guess — use Bloom's real level names. |
| M-92 | Meter rows spread ~900px (label left, count at far right) | OPEN — brief v4 Slice 5: requirement meters capped (label 7rem, bar ≤320px, count adjacent). |
| M-93 | Insight cards state a conclusion from 2 days of data as fact — no confidence marker, no action, half-empty | OPEN — brief v4 Slice 5: "Early read · N days" dashed badge under 7 logged days, neutral headlines, verb actions. |
| M-94 | Visible gutter/panel edge at x≈273 and x≈1435 around the cards — possible nested container (verify) | OPEN — brief v4 Slice 2 (container): verify from the layout code/DOM; remove the nesting if real. |
