/**
 * DishesSection — the dish library on the Nutrition tab (D4): search,
 * browse, open, log.
 *
 * The library is Bloom's recipes — Indian dishes first — each one a
 * set of USDA ingredient lines whose per-serving numbers are computed
 * by the lib and labelled with the recipe provenance. Nothing here
 * derives a number: cards read `browseDishes`' labelled bundles.
 *
 * Which dishes are on the shelf is governed silently by the person's
 * assessment answers: their dietary pattern is a hard filter.
 * Pattern and budget are asked in the assessment and nowhere else, so
 * this section offers no controls for them — search, category, cuisine
 * and the enriched toggle are the only filters here, and the status
 * line says what is being shown. Budget tiers are the lib's stated
 * ingredient-cost ESTIMATE and are labelled as one wherever they appear.
 *
 * Method 13 (2026-11-19): the meal budget is a PREFERENCE on the
 * shelf, not a cut. Until method 12 a stated budget kept every dish
 * above its tier off the shelf entirely — the owner saw 545 of the
 * library's 1,203 dishes, and the missing ones were
 * disproportionately the protein dishes (priced into the top tier
 * by a costing band that priced flesh and fish like almonds). Now
 * the shelf shows the full pattern pool; in-budget dishes sort
 * first in the "Best for you" order and the status line says the
 * budget is a preference.
 */

import { useEffect, useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";

import { SectionHead } from "@/components/ui/SectionHead";
import { Input } from "@/components/ui/input";
import { useAssessment } from "@/hooks/useAssessment";
import { useSession } from "@/hooks/useSession";
import { DIETARY_LABEL } from "@/lib/assessment/questions";
import { toHealthProfile } from "@/lib/assessment/state";
import { fmtCount } from "@/lib/format";
import {
  DISH_CATEGORIES,
  DISH_CATEGORY_LABEL,
  DISH_CUISINES,
  DISH_CUISINE_LABEL,
  browseDishes,
  logDish,
  planPatternOf,
  sortDishesForYou,
  type Dish,
  type DishBrowseFilters,
  type DishCategory,
  type DishCuisine,
  type Meal,
} from "@/lib/nutrition";
import { DishDetailSheet } from "./DishDetailSheet";
import { DishPhoto } from "./DishPhoto";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { formatGrams } from "./input";

/** Cards per page of the shelf — the library is 1,200+ dishes, and
 *  rendering all of them (a photo card each) is the cost §M names.
 *  "Show more" pages through the rest; nothing is hidden, the full
 *  count stays in the status line. */
const DISH_PAGE_SIZE = 48;

export function DishesSection({ day }: { day: string }) {
  const assessment = useAssessment();
  const session = useSession();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DishCategory | null>(null);
  const [cuisine, setCuisine] = useState<DishCuisine | null>(null);
  const [enrichedOnly, setEnrichedOnly] = useState(false);
  const [selected, setSelected] = useState<Dish | null>(null);

  /* The shelf is the person's assessment answers, read through the
     domain profile: their pattern, and their meal budget when they
     stated one. Neither is a control here — both are changed in the
     assessment, and only there. */
  const profile = useMemo(
    () => toHealthProfile(assessment.state, session.userId ?? "local"),
    [assessment.state, session.userId],
  );
  const pattern = planPatternOf(profile.dietary.pattern);
  const budgetTier = profile.dietary.budgetTier;
  const cuisinePreference = profile.dietary.cuisinePreference;

  /* The shelf is browsed with no cuisine chosen: the cuisine chips
     count from the shelf, so a chip's number is exactly the number of
     dishes choosing it would show, and the cuisine choice then
     narrows the shelf like every other filter — it never widens it. */
  const filters: DishBrowseFilters = useMemo(
    () => ({ query, category, pattern, budgetTier: null, enrichedOnly, cuisine: null }),
    [query, category, pattern, enrichedOnly],
  );
  const browsed = useMemo(() => browseDishes(filters), [filters]);
  /* Method 13: the budget no longer cuts the shelf — the shelf is
     the full pattern pool, and the budget only orders it (in-budget
     first, inside the "Best for you" sort below). */
  const shelf = browsed;
  const cuisineCounts = useMemo(() => {
    const counts: Record<DishCuisine, number> = { india: 0, kerala: 0, international: 0 };
    for (const row of shelf) {
      const tag = row.dish.cuisine;
      if (tag === "india" || tag === "kerala" || tag === "international") counts[tag] += 1;
    }
    return counts;
  }, [shelf]);
  const rows = useMemo(() => {
    const filtered =
      cuisine === null ? shelf : shelf.filter((row) => row.dish.cuisine === cuisine);
    /* The default order is "Best for you" (§M): the lib's stable
       re-ordering by the judgements the app already makes — pattern
       suitability, then the person's cuisine region, then their
       budget as a preference — over the browse order. No other
       ranking exists here. */
    return sortDishesForYou(filtered, { pattern, cuisinePreference, budgetTier });
  }, [shelf, cuisine, pattern, cuisinePreference, budgetTier]);

  /* Paged rendering: only the first page of cards mounts; "Show
     more" extends it. Any filter change starts the shelf over at
     page one, so a narrowed list never opens mid-way. */
  const [shownCount, setShownCount] = useState(DISH_PAGE_SIZE);
  useEffect(() => {
    setShownCount(DISH_PAGE_SIZE);
  }, [query, category, cuisine, enrichedOnly, pattern, budgetTier]);
  const visibleRows = rows.slice(0, shownCount);

  const anyFilter = query.trim() !== "" || category !== null || cuisine !== null || enrichedOnly;

  const clearFilters = () => {
    setQuery("");
    setCategory(null);
    setCuisine(null);
    setEnrichedOnly(false);
  };

  const chipRow = (
    label: string,
    chips: readonly { key: string; label: string; selected: boolean; onSelect: () => void }[],
  ) => (
    <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={label}>
      <span className="nut-group-label w-16 shrink-0">{label}</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="nut-chip nut-chip-solid"
          data-selected={chip.selected || undefined}
          aria-pressed={chip.selected}
          onClick={chip.onSelect}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );

  return (
    <section className="nut-card nut-rise section" aria-label="Dishes">
      <SectionHead kicker="Dishes" title="Cook it, then log it" />
      <p className="mt-1 max-w-[58ch] text-[length:var(--text-callout)] leading-[var(--leading-body)] text-muted-foreground">
        Real recipes, Indian first. Every dish is built from USDA-verified ingredients, so
        its numbers are computed from the recipe itself and labelled as such. Budget marks
        are estimates from ingredient costs.
      </p>

      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <Input
          aria-label="Search dishes"
          placeholder="Search dishes — try “dal” or “दाल”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {chipRow("Category", [
        { key: "all", label: "All", selected: category === null, onSelect: () => setCategory(null) },
        ...DISH_CATEGORIES.map((c) => ({
          key: c,
          label: DISH_CATEGORY_LABEL[c],
          selected: category === c,
          onSelect: () => setCategory(c),
        })),
      ])}

      {chipRow("Cuisine", [
        {
          key: "all",
          label: `All · ${shelf.length}`,
          selected: cuisine === null,
          onSelect: () => setCuisine(null),
        },
        ...DISH_CUISINES.map((c) => ({
          key: c,
          label: `${DISH_CUISINE_LABEL[c]} · ${cuisineCounts[c]}`,
          selected: cuisine === c,
          onSelect: () => setCuisine(c),
        })),
      ])}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="nut-group-label w-16 shrink-0">Enriched</span>
        <button
          type="button"
          className="nut-chip nut-chip-solid"
          data-selected={enrichedOnly || undefined}
          aria-pressed={enrichedOnly}
          onClick={() => setEnrichedOnly((v) => !v)}
        >
          Enriched only
        </button>
      </div>

      <p className="mt-4 text-[length:var(--text-caption)] tabular-nums text-muted-foreground" role="status">
        {fmtCount(rows.length)} {rows.length === 1 ? "dish" : "dishes"}
        {pattern && profile.dietary.pattern ? (
          /* The person's pattern is named in the Assessment's own words
             (DIETARY_LABEL — "Omnivore"), never in the dish-suitability
             vocabulary ("non-vegetarian"). And the sentence must be
             true: the omnivore pattern filters nothing out (pinned in
             dishBrowse.test.ts), so it says so instead of implying a
             selection happened. */
          pattern === "non_vegetarian" ? (
            <> · your pattern is {DIETARY_LABEL[profile.dietary.pattern]} — it excludes nothing</>
          ) : (
            <> · showing what suits you — {DIETARY_LABEL[profile.dietary.pattern]} pattern</>
          )
        ) : null}
        {budgetTier === 1 ? <> · your everyday ₹ budget preferred first</> : null}
        {budgetTier === 2 ? <> · your moderate ₹₹ budget preferred first</> : null}
        {cuisine ? <> · {DISH_CUISINE_LABEL[cuisine]} dishes only</> : null}
        {/* The sort's name, stated only when a personal judgement is
            actually ordering the shelf — with no pattern and no
            cuisine preference there is no "for you" to claim. */}
        {pattern !== null ||
        cuisinePreference === "north_indian" ||
        cuisinePreference === "south_indian" ? (
          <> · best for you first</>
        ) : null}
      </p>

      {rows.length === 0 ? (
        <div className="mt-4 text-center">
          <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            No dishes match — try clearing a filter.
          </p>
          {anyFilter ? (
            <button type="button" className="nut-btn nut-btn-ghost nut-btn-sm mt-3" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {visibleRows.map(({ dish, labelled }) => (
              <li key={dish.id}>
                <button
                  type="button"
                  className="nut-dish-card"
                  onClick={() => setSelected(dish)}
                  aria-label={`${dish.name.en} — view recipe`}
                >
                  <DishPhoto dishId={dish.id} name={dish.name.en} lightbox={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[length:var(--text-callout)] font-medium text-foreground">
                      {dish.name.en} <span className="nut-hindi">({dish.name.hindi})</span>
                    </span>
                    <span className="mt-0.5 block text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
                      {Math.round(labelled.nutrients.kcal)} kcal ·{" "}
                      {formatGrams(labelled.nutrients.proteinG)} g protein ·{" "}
                      <Clock className="mb-0.5 inline size-3" aria-hidden /> {dish.timeMinutes} min
                    </span>
                    <span className="mt-0.5 block text-[length:var(--text-caption)] text-muted-foreground">
                      {DISH_CATEGORY_LABEL[dish.category]} ·{" "}
                      <span className="text-[var(--gold)]" aria-label={`Budget tier ${dish.budgetTier} of 3, estimated`}>
                        {"₹".repeat(dish.budgetTier)}
                      </span>
                      {dish.enriched ? (
                        <span className="font-medium text-[var(--sage)]"> · Enriched</span>
                      ) : null}
                    </span>
                    {/* The card's numbers carry their provenance chip
                        (§M/§N) — the same labelled bundle the detail
                        sheet renders: recipe-computed from USDA
                        ingredient data, solid outline (measured
                        class), never an estimate. */}
                    <span className="mt-1.5 block">
                      <ProvenanceBadge kind="recipe" label={labelled.label} />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {shownCount < rows.length ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="nut-btn nut-btn-ghost nut-btn-sm"
                onClick={() => setShownCount((n) => n + DISH_PAGE_SIZE)}
              >
                Show more — {fmtCount(rows.length - shownCount)} more{" "}
                {rows.length - shownCount === 1 ? "dish" : "dishes"}
              </button>
            </div>
          ) : null}
        </>
      )}

      <DishDetailSheet
        dish={selected}
        day={day}
        onClose={() => setSelected(null)}
        onLog={(dish, meal: Meal, logDay) => logDish(dish, meal, logDay) !== null}
      />
    </section>
  );
}
