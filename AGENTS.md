# BLOOM: BUILD BRIEF v4, "Polish and Clarity" (for the coding agent)

<!-- PARENT NOTES (Muse, 2026-11-19 — binding adaptations of this brief to this repo):
1. This repo is TypeScript + React (TanStack Start). The brief's `.js` paths are
   illustrative: the copy module is `src/lib/reasons.ts`, targets `src/lib/targets.ts`
   (or the existing nutrition targets module if one owns this — trace first), the
   flower is a React component. Class names and token names adapt to Bloom's house
   CSS and tokens, as in briefs v2/v3.
2. There is NO Playwright setup in this repo. Implement Part 6's checks as vitest/
   jsdom structural guards in the existing anti-document guard files, as was done
   for v3. Do not install Playwright.
3. M-82 context from the M-57 trace (PR #199): the Twin's "% of your energy target"
   and the Nutrition hero divide by the SAME targets object — the percentages are
   proven consistent. The ~2,950 kcal figure is the Maintenance energy estimate
   (estimated burn), a different number with its own label. M-82's open question is
   TARGET PLAUSIBILITY (1,350 kcal with 171 g protein = ~51% protein share), not a
   second target source. Trace the formula, report, and do NOT change it silently —
   it is flagged for human nutrition review (brief Part 3.5).
4. Brief v4 replaces brief v3 as the operative brief. Slices 1–5 of v3 are built
   (PRs #199/#200 merged; v3 Slice 5 in flight separately). Where v4 reorders the
   Nutrition page (Part 1) or absorbs sections (3.4), v4 wins.
-->

You are a senior front-end engineer with a product designer's eye. Bloom is a food,
nutrition and health app (dark ink, warm gold, serif display, sans UI).

**Precedence:** this brief > the v3 anti-document brief > `docs/BLOOM_UI_RULES.md`
(v2 + addendum §16–§22). Record any conflict in your PR.

## MISSION
Stop showing the planner's reasoning log. Show outcomes first, as charts, meters,
badges and short rows. Explanations go behind disclosures. Then bring every screen to
**at least 4/5 on all ten rubric dimensions**.

## RUBRIC (score every changed screen before and after, honestly, with screenshots)
Hierarchy · Scannability (one visual anchor per card) · Rhythm and spacing · Alignment
and grid · Colour discipline · Typography · Data visualisation · Consistency ·
Interaction polish · Brand identity. A PR that leaves any dimension under 4 says why.

## WORKING RULES
1. Inspect the repo first and post a 10-line summary. Do not assume a framework.
2. One slice, one branch, one PR. Never mix trust fixes with visual work.
3. Fix the source of a wrong value, not its display.
4. **The planner returns data, and the UI owns the words.** No prose strings are built
   in planner or business logic. Return `{kind, ...numbers}` and render copy in ONE
   file (`/lib/reasons.js`). This is the root fix for M-81.
5. Ask before destructive changes only (data migrations, route deletion, billing).
6. Never touch billing or auth, except the date computation bug.
7. "Done" means screenshots, tests and the verify list. Never "it compiles".

## PART 1: NUTRITION PAGE ARCHITECTURE

Final order (each is a `<section class="section">` with a real H2 and a one-line subtitle):
1. Hero (ring + day strip) · 2. Today's meals · 3. **Today's balance** · 4. **How today's
plan was adjusted** · 5. **Your metabolic twin** (absorbs "What your plan learned") ·
6. Shopping and pantry · 7. Condition modes · 8. Programmes · 9. Dishes (own route).
Add the sticky sub-nav: Today · Plan · Insights · Shopping and pantry · Programmes · Dishes.

**Say it once.** Each fact lives in exactly one place:
| Fact | Lives in | Elsewhere |
|---|---|---|
| Intake vs targets (458/1,350 kcal, 23/171 g) | Twin → Food-log coverage tile | link only, never restate |
| Maintenance requirements (2/10, 0/2) | Twin → Maintenance tile | never restate |
| Guideline coverage (veg, fruit, groups) | Today's balance | never restate |
| Plan adjustments | "How today's plan was adjusted" | never restate |
| Methodology (ICMR-NIN, USDA, Mifflin–St Jeor) | one "How this plan is built" dialog | link only |
Every rendered metric carries `data-metric="<key>"`. A guard test fails on duplicates.

## PART 2: SECTION ANATOMY AND SPACING (fixes M-84, M-86, M-87)
- Every section = `.section-head` (H2 serif 24 + subtitle ≤ 90 chars + optional actions)
  then content. **An eyebrow can never replace an H2.** Eyebrows are allowed only in
  the page hero.
- 56px between sections, 16px between cards in a section, 24px inside cards.
- Body text is 15px `--text-2` and secondary text is 14px. Nothing readable is below
  12px. One body style for the whole page.
- Sections get `scroll-margin-top: 80px` for the sub-nav.

```css
.section{margin-block-start:var(--s-14);scroll-margin-block-start:80px}
.section:first-of-type{margin-block-start:0}
```

## PART 3: REBUILDS

### 3.1 Today's meals (fixes M-88)
- The **next unlogged meal** gets the only `btn--primary`. Other meals get `btn--secondary`.
  A logged meal shows a "Logged ✓" badge and no button.
- Buttons are 10px-radius rectangles (see rulebook). Pills are for badges and chips only,
  which keeps interactive and non-interactive elements distinguishable.
- Label: "Log meal" (verb first, shorter).
- Macros use 8px category dots with a neutral number, never coloured text. If kcal is not
  already the first figure on the card, add it.
```html
<footer class="meal__foot">
  <ul class="macros">
    <li><i class="dot dot--protein"></i><b>47 g</b> protein</li>
    <li><i class="dot dot--fibre"></i><b>4 g</b> fibre</li>
  </ul>
  <button class="btn btn--primary btn--sm">Log meal</button>
</footer>
```
```css
:root{ /* macro dots only; never text, never badges. Verify ≥3:1 on --surface by script */
  --macro-protein:#8fbf9f; --macro-carb:#c9b8a0; --macro-fat:#8aa4c4; --macro-fibre:#a99bc9}
.macros{display:flex;gap:var(--s-4);list-style:none;margin:0;padding:0;color:var(--text-2);font-size:var(--fs-14)}
.macros b{color:var(--text-1);font-weight:600;font-variant-numeric:tabular-nums}
.dot{display:inline-block;inline-size:8px;block-size:8px;border-radius:50%;margin-inline-end:6px;background:var(--text-3)}
.dot--protein{background:var(--macro-protein)} .dot--carb{background:var(--macro-carb)}
.dot--fat{background:var(--macro-fat)}         .dot--fibre{background:var(--macro-fibre)}
```

### 3.2 Today's balance (replaces the three guideline paragraphs, fixes M-85)
Anchor = **the Bloom flower**, Bloom's own visualisation: one petal per food group, a
filled petal for each group covered today. Next to it, two goal meters (vegetables, fruit).
Under it, chips for the missing groups, which is the actionable part. Use the app's own
food-group list and classifier (the app says 8 groups). Do not hardcode names.

```js
// ui/bloom-flower.js
export function bloomFlower(groups, size = 112) {
  const n = groups.length, c = size / 2;
  const r = size * 0.285, rx = size * 0.105, ry = size * 0.19;
  const done = groups.filter(g => g.covered).length;
  const petals = groups.map((g, i) =>
    `<ellipse class="petal${g.covered ? " is-on" : ""}" style="--i:${i}"
       cx="${c}" cy="${c - r}" rx="${rx}" ry="${ry}"
       transform="rotate(${(360 / n) * i} ${c} ${c})"/>`).join("");
  return `<svg class="flower" viewBox="0 0 ${size} ${size}" role="img"
    aria-label="${done} of ${n} food groups covered">${petals}
    <circle class="flower__core" cx="${c}" cy="${c}" r="${size * 0.05}"/></svg>`;
}
export const coverage = (actual, goal) => ({
  pct: Math.min(100, Math.round((actual / goal) * 100)),
  gap: Math.max(0, goal - actual),
  met: actual >= goal,
});
```
```css
.flower{inline-size:112px;block-size:112px;flex:none}
.petal{fill:var(--surface-3);stroke:var(--border);stroke-width:1}
.petal.is-on{fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.25;
  animation:petal-in .5s var(--ease) both;animation-delay:calc(var(--i) * 60ms)}
.flower__core{fill:var(--accent)}
@keyframes petal-in{from{opacity:0}to{opacity:1}}   /* opacity only: the transform attr is in use */

.balance{display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--s-8);align-items:center}
.balance__flower{display:grid;justify-items:center;gap:var(--s-3)}
.balance__flower b{font:400 var(--fs-30)/1 var(--font-display);font-variant-numeric:tabular-nums}
.balance__flower span{font-size:var(--fs-12);color:var(--text-3)}
.balance__bars{display:grid;gap:var(--s-5);max-inline-size:28rem}
@media (max-width:720px){.balance{grid-template-columns:1fr}}

.cover{display:grid;gap:var(--s-2)}
.cover__row{display:flex;justify-content:space-between;align-items:baseline}
.cover__row span{font:500 var(--fs-14)/1.3 var(--font-ui);color:var(--text-2)}
.cover__row b{font:600 var(--fs-18)/1 var(--font-ui);font-variant-numeric:tabular-nums}
.cover__row small{font-size:var(--fs-12);color:var(--text-3);font-weight:400}
.cover__hint{font-size:var(--fs-12);color:var(--text-3)}
.cover .meter{--fill:var(--text-2)} .cover .meter.is-met{--fill:var(--success)}
```
```html
<div class="cover">
  <div class="cover__row"><span>Vegetables</span><b>360 <small>/ 400 g</small></b></div>
  <div class="meter meter--goal" role="progressbar" aria-label="Vegetables: 360 of 400 grams"
       aria-valuenow="360" aria-valuemin="0" aria-valuemax="400" style="--v:.9"></div>
  <p class="cover__hint">40 g to go · ICMR-NIN guideline</p>
</div>
```
- The unfilled petals use the neutral `--surface-3`, not a dashed outline. Dashed stays
  reserved for **estimated** (the signature rule), so "missing" never borrows it.
- A guideline is a target and not a verdict. Fill is neutral. It turns `--success` when met.
  Amber is only for under 50%. Tone: "40 g to go", never "short" or "failed".
- The ICMR-NIN chip carries an info popover with the methodology, not a sentence.

### 3.3 How today's plan was adjusted (replaces the other three paragraphs, fixes M-81)
Max 3 rows, using the `.insight` component (v3). Each row has a title (≤ 4 words), one
detail line (≤ 140 chars), a source chip and an optional action. Text comes ONLY from
`/lib/reasons.js`.
```js
// lib/reasons.js
import { fmtGrams } from "./format.js";
const COPY = {
  "protein-bias": r => ({ title: "Higher-protein picks",
    detail: `Your last ${r.days} logged days averaged ${fmtGrams(r.logged)} protein against a ${fmtGrams(r.target)} target. Target unchanged.`,
    source: { label: "Food log", kind: "measured" } }),
  "kitchen-relaxed": () => ({ title: "Kitchen limits relaxed",
    detail: "Your kitchen answers left almost no dishes, so no-cook dishes come first and cooking is allowed.",
    source: { label: "Assessment", kind: "measured" },
    action: { label: "Review kitchen answers", href: "/profile#assessment" } }),
  "snack-added": r => ({ title: "Snack added",
    detail: `You listed ${r.meals} meals a day; a snack spreads today across ${r.meals + 1} sittings.`,
    source: { label: "Assessment", kind: "measured" } }),
};
export function reasonCopy(r) {
  const c = COPY[r.kind]?.(r);
  if (c && c.detail.length > 140) console.warn("reason copy over 140 chars:", r.kind);
  return c ?? null;
}
```
Never `slice()` or clamp a sentence. If text can overflow, use CSS `line-clamp` with an
ellipsis, a `title`, and a "More" disclosure. Unknown reason kinds render nothing (log them).

### 3.4 Metabolic twin absorbs "What your plan learned" (fixes M-83, M-92, M-93)
- Retire "What your plan learned" as a separate section.
- Inside the twin: an optional **insight strip** (max 2 rows) of conclusions only, with
  numbers linking to the tile (never restated), then the tile grid from v3.
- A conclusion from fewer than 7 logged days carries a dashed badge **"Early read ·
  N days"**. The headline is neutral: "Intake is below target so far", never "running
  under".
- Each insight has a verb action when one exists ("Log today's meals", "Log weight").
- Requirement meters: grid `7rem minmax(0,320px) 3rem`, count adjacent to its bar.
```css
.req li{grid-template-columns:7rem minmax(0,20rem) 3rem}
```

### 3.5 Targets (M-82), a data task
```js
// lib/targets.js
export const pctOfTarget = (actual, target) => Math.round((actual / target) * 100);
export function assertPlausibleTargets({ kcal, proteinG }) {
  const share = (proteinG * 4) / kcal;
  const ok = kcal >= 1200 && share <= 0.35;
  if (!ok) console.warn("Implausible targets", { kcal, proteinG, proteinShare: +share.toFixed(2) });
  return ok;
}
```
Tests: `pctOfTarget(458,1350) === 34`, `pctOfTarget(23,171) === 13`, and
`assertPlausibleTargets({kcal:1350,proteinG:171}) === false`. Then trace how the kcal target
is computed (BMR vs maintenance, activity factor, goal adjustment). Find why the hero showed
about 2,950 kcal. **One target source for the whole app.** Report findings in the PR and do
not silently change the formula. Flag it for human nutrition review.

## PART 4: SHELL (fixes M-89, M-90, M-91)

### Nav: active vs focus
```css
.nav a{position:relative;outline:none}
.nav a:focus-visible{box-shadow:var(--focus)}               /* keyboard only */
.nav a[aria-current="page"]{background:var(--surface-2);color:var(--text-1)}
.nav a[aria-current="page"]::before{content:"";position:absolute;inset-block:10px;inset-inline-start:0;
  inline-size:3px;border-radius:0 3px 3px 0;background:var(--accent)}   /* inside the pill */
```
Mouse clicks must never leave a ring. Audit every `:focus` selector and replace with
`:focus-visible`.

### One dock for floating controls
```html
<div class="dock">
  <button class="fab dock__top" aria-label="Back to top" data-show="false"><!-- 18px up-arrow --></button>
  <button class="fab dock__assistant" aria-label="Ask Bloom"><!-- gold glyph --></button>
</div>
<div id="top-sentinel" aria-hidden="true"></div>
```
```css
.dock{position:fixed;inset:auto var(--s-6) var(--s-6) auto;display:flex;flex-direction:column;
  align-items:center;gap:var(--s-3);z-index:40}
.fab{inline-size:48px;block-size:48px;border-radius:50%;display:grid;place-items:center;
  background:var(--surface-2);border:1px solid var(--border);color:var(--accent);
  box-shadow:0 8px 24px rgba(0,0,0,.4)}
.fab:hover{border-color:var(--border-strong)}
.fab:focus-visible{outline:none;box-shadow:var(--focus)}
.dock__top{color:var(--text-2);visibility:hidden;opacity:0;transform:translateY(8px);
  transition:opacity var(--dur-2),transform var(--dur-2),visibility 0s var(--dur-2)}
.dock__top[data-show="true"]{visibility:visible;opacity:1;transform:none;transition-delay:0s}
#top-sentinel{position:absolute;inset:0 auto auto 0;inline-size:1px;block-size:150vh;pointer-events:none}
@media (max-width:720px){.dock{inset-block-end:calc(64px + var(--s-4) + env(safe-area-inset-bottom))}}
```
```js
const top = document.querySelector(".dock__top");
new IntersectionObserver(([e]) => { top.dataset.show = String(!e.isIntersecting); })
  .observe(document.getElementById("top-sentinel"));
top.addEventListener("click", () => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
```
Same size, same style, same x. No white fill, no rainbow ring, no logo on back-to-top.

### Sidebar footer
- Level card: "{current level} → {next level}", a labelled meter and "{n} points to {next}",
  with `n` computed from level thresholds. No bare percentage.
- Account row: avatar, name, plan or level (shown once, not duplicated in the Level card),
  gear. **Remove the presence dot.** Remove the blue tick, or make it gold if it means
  something real.
- Tagline artwork: contained in a fixed-height footer with a gradient mask and text at ≥4.5:1,
  or removed. No dead zone between Profile and the footer.

## PART 5: MOTION AND INTERACTION POLISH
- **Meters** animate from 0 once, when first visible: `transform: scaleX()` (no width
  animation), 600ms ease-out. `.js` class is set in `<head>` to avoid a flash.
```css
.meter{position:relative;block-size:6px;border-radius:var(--r-pill);background:var(--surface-3);overflow:hidden}
.meter::after{content:"";position:absolute;inset:0;background:var(--fill,var(--accent));
  transform-origin:left;transform:scaleX(var(--v,0));transition:transform .6s var(--ease)}
.js .meter:not(.is-in)::after{transform:scaleX(0)}
.meter--goal::before{content:"";position:absolute;inset-block:0;inset-inline-end:0;inline-size:2px;background:var(--text-3);z-index:1}
```
```js
document.documentElement.classList.add("js");
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: .4 });
document.querySelectorAll(".meter").forEach(m => io.observe(m));
```
- Here `--v` is a decimal 0–1 (`.9`), not a percentage. Update the meter in v2 to match.
- Cards: hover lifts the border to `--border`, never moves the layout.
- Buttons: `:active` moves down 1px. Every interactive element has a visible
  `:focus-visible`. Toasts confirm copy and save.
- Loading uses skeletons that match the final layout, never spinners for page content.
- All motion respects `prefers-reduced-motion`.

## PART 6: GUARD TESTS (extend `tests/anti-document.spec.js`; write them first and watch them fail)
```js
import { test, expect } from "@playwright/test";
test("nutrition: polish guards", async ({ page }) => {
  await page.goto("/nutrition");
  const r = await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const vis = el => !el.closest("details:not([open]), dialog:not([open]), [hidden]");
    // 1. no truncated sentences
    const truncated = [...document.querySelectorAll("main p")].filter(vis)
      .map(p => p.textContent.trim()).filter(t => t.length > 40 && !/[.!?…)”":]$/.test(t));
    // 2. every section has an H2
    const noH2 = [...document.querySelectorAll("main .section")]
      .filter(s => !s.querySelector(":scope > .section-head h2, :scope > h2"))
      .map(s => s.id || s.className);
    // 3. section spacing >= 48px
    const secs = [...document.querySelectorAll("main .section")];
    const tight = secs.slice(1).filter((s, i) =>
      s.getBoundingClientRect().top - secs[i].getBoundingClientRect().bottom < 48).length;
    // 4. at most one primary button in any viewport
    let maxPrimary = 0;
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
      scrollTo(0, y);
      const n = [...document.querySelectorAll(".btn--primary")].filter(b => {
        const q = b.getBoundingClientRect(); return q.width > 0 && q.bottom > 0 && q.top < innerHeight; }).length;
      maxPrimary = Math.max(maxPrimary, n);
    }
    scrollTo(0, 0);
    // 5. every fact once
    const seen = {};
    document.querySelectorAll("[data-metric]").forEach(e => seen[e.dataset.metric] = (seen[e.dataset.metric] || 0) + 1);
    const dup = Object.entries(seen).filter(([, n]) => n > 1).map(([k]) => k);
    // 6. back-to-top hidden at scroll 0
    const top = document.querySelector(".dock__top");
    const topHidden = !top || getComputedStyle(top).visibility === "hidden";
    return { truncated, noH2, tight, maxPrimary, dup, topHidden };
  });
  expect(r.truncated, "truncated sentences").toEqual([]);
  expect(r.noH2, "sections without an H2").toEqual([]);
  expect(r.tight, "sections closer than 48px").toBe(0);
  expect(r.maxPrimary, "primary buttons in one viewport").toBeLessThanOrEqual(1);
  expect(r.dup, "metrics shown twice").toEqual([]);
  expect(r.topHidden, "back-to-top visible at scroll 0").toBe(true);
});
```
Add unit tests for `coverage`, `pctOfTarget`, `assertPlausibleTargets` and
`reasonCopy` (every `detail` ≤ 140 chars and ends with a full stop). Tune the selectors to
the repo's real class names. Exemptions need `data-allow="…"` plus a PR justification.

## SLICES (in order)
1. **GUARDS + DATA**: failing tests, `reasons.js`, `targets.js`, truncation fix, target trace,
   one target source, `data-metric` attributes.
2. **SHELL**: nav focus and active, dock, level card, account row, tagline, container.
3. **SECTION SYSTEM**: `.section` and `.section-head` on every Nutrition section, spacing,
   body text sizes, sub-nav.
4. **TODAY**: meal cards (button hierarchy, macro dots), Today's balance (flower and
   meters), plan adjustments.
5. **TWIN**: absorb "What your plan learned", early-read badges, meter widths.
6. **Roll-out** to Profile, Trackers, Mood, Rewards and Coach using the same components.
7. **Rubric review**: score every screen, then fix anything under 4.

## VERIFY (every PR)
Three seeded accounts × widths 360, 768, 1280, 1920, full-page screenshots · axe clean ·
contrast script (including the macro dots at 3:1) · stylelint (no raw values) · keyboard pass
(mouse clicks leave no ring) · squint test · cover-the-text test · guard tests green ·
before/after rubric scores · `docs/MISTAKES.md` updated (M-81 to M-94).

## PR FORMAT
What · Why (registry IDs closed) · Before/after screenshots · Rubric scores · Checks ticked
honestly · Assumptions · Leftovers. Commits: `type(scope): summary`.

## NEVER
Build prose in planner or business logic · slice a sentence · restate a fact that has a home ·
use an eyebrow as the only heading · colour text to mean a category · show two filled gold
buttons in one viewport · leave a focus ring after a mouse click · animate width, height,
top or left · mix two floating-button styles · show a presence dot or a blue verified tick
without a real meaning · state a 2-day conclusion as fact · change a health target formula
without flagging it for human review.

## FIRST ACTIONS
1. Repo summary. 2. Add the failing guard tests and post their report. 3. Add M-81 to M-94 to
`docs/MISTAKES.md`. 4. Start Slice 1.

---

## Repo commands (preserved from the previous AGENTS.md)

# Bloom

Personal tracker web app — habits, mood, sleep, study and cycle — built with
TanStack Start, React and Tailwind CSS.

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run test` — unit tests (vitest)
- `npm run lint` — eslint
