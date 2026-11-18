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
 * assessment answers: their dietary pattern is a hard filter, and a
 * stated meal budget keeps dishes above their tier off the shelf.
 * Pattern and budget are asked in the assessment and nowhere else, so
 * this section offers no controls for them — search, category, cuisine
 * and the enriched toggle are the only filters here, and the status
 * line says what is being shown. Budget tiers are the lib's stated
 * ingredient-cost ESTIMATE and are labelled as one wherever they appear.
 */

import { useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";

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
  type Dish,
  type DishBrowseFilters,
  type DishCategory,
  type DishCuisine,
  type Meal,
} from "@/lib/nutrition";
import { DishDetailSheet } from "./DishDetailSheet";
import { DishPhoto } from "./DishPhoto";
import { formatGrams } from "./input";

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

  /* The shelf is browsed with no cuisine chosen: the cuisine chips
     count from the shelf, so a chip's number is exactly the number of
     dishes choosing it would show, and the cuisine choice then
     narrows the shelf like every other filter — it never widens it. */
  const filters: DishBrowseFilters = useMemo(
    () => ({ query, category, pattern, budgetTier: null, enrichedOnly, cuisine: null }),
    [query, category, pattern, enrichedOnly],
  );
  const browsed = useMemo(() => browseDishes(filters), [filters]);
  /* The budget keeps dishes ABOVE the person's tier off the shelf
     (at or under it stays) — the lib's budget filter is an exact-tier
     match for other callers, so the at-or-under rule is applied here. */
  const shelf = useMemo(
    () =>
      budgetTier === null
        ? browsed
        : browsed.filter((row) => row.dish.budgetTier <= budgetTier),
    [browsed, budgetTier],
  );
  const cuisineCounts = useMemo(() => {
    const counts: Record<DishCuisine, number> = { india: 0, kerala: 0, international: 0 };
    for (const row of shelf) {
      const tag = row.dish.cuisine;
      if (tag === "india" || tag === "kerala" || tag === "international") counts[tag] += 1;
    }
    return counts;
  }, [shelf]);
  const rows = useMemo(
    () => (cuisine === null ? shelf : shelf.filter((row) => row.dish.cuisine === cuisine)),
    [shelf, cuisine],
  );

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
    <section className="nut-card nut-rise mt-4" aria-label="Dishes">
      <p className="eyebrow">Dishes</p>
      <h2 className="mt-1.5 font-display text-[30px] leading-tight text-foreground">
        Cook it, then log it
      </h2>
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
        {budgetTier === 1 ? <> · kept to an everyday ₹ budget</> : null}
        {budgetTier === 2 ? <> · kept to a moderate ₹₹ budget</> : null}
        {cuisine ? <> · {DISH_CUISINE_LABEL[cuisine]} dishes only</> : null}
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
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map(({ dish, labelled }) => (
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
                </span>
              </button>
            </li>
          ))}
        </ul>
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
