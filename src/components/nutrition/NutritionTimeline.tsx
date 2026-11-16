/**
 * Nutrition — the day's timeline (N-UI): one card per meal, entries
 * with their photograph, provenance badge, inline gram editing, the
 * calorie-matched swaps panel and delete (the page owns the undo
 * toast). All writes go through the nutrition hook into the lib's
 * validated paths — gram edits recompute via `entryNutrientsFor`,
 * swaps via the swap builder that refuses non-USDA sides.
 */

import { useMemo, useState, type CSSProperties } from "react";
import { ArrowLeftRight, Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { useNutrition } from "@/hooks/useNutrition";
import {
  MEALS,
  displayNameForFoodId,
  entryClock,
  foodDisplayName,
  labelledEntryNutrients,
  swapFocusFor,
  sumNutrients,
  type LogEntry,
  type Meal,
  type SwapOption,
} from "@/lib/nutrition";
import { FoodPhoto } from "./FoodPhoto";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { MEAL_LABEL, formatGrams, parseForgivingNumber } from "./input";

function amountText(entry: LogEntry): string {
  if ("grams" in entry.amount) return `${formatGrams(entry.amount.grams)} g`;
  return `${formatGrams(entry.amount.servings)} × ${entry.amount.servingLabel}`;
}

export function NutritionTimeline({
  entries,
  onAdd,
  onEdit,
  onRemove,
}: {
  entries: readonly LogEntry[];
  /** Open the log dialog at this meal. */
  onAdd: (meal: Meal) => void;
  /** Open the log dialog editing this entry. */
  onEdit: (entry: LogEntry) => void;
  onRemove: (entry: LogEntry) => void;
}) {
  const nutrition = useNutrition();
  const [swapOpenFor, setSwapOpenFor] = useState<string | null>(null);
  const [editingGramsFor, setEditingGramsFor] = useState<string | null>(null);
  const [gramsText, setGramsText] = useState("");

  const targets = nutrition.targetState.kind === "ready" ? nutrition.targetState.targets : null;
  const focus = useMemo(
    () => swapFocusFor(sumNutrients(entries.map((e) => e.nutrients)), targets, 30),
    [entries, targets],
  );

  const saveGrams = (entry: LogEntry) => {
    const grams = parseForgivingNumber(gramsText);
    if (grams !== null && grams > 0) {
      nutrition.editEntry(entry, { amount: { grams } });
    }
    setEditingGramsFor(null);
  };

  return (
    <div className="space-y-4">
      {MEALS.map((meal, mealIndex) => {
        const mealEntries = entries.filter((e) => e.meal === meal);
        const mealTotals = sumNutrients(mealEntries.map((e) => e.nutrients));
        const clocks = mealEntries
          .map((e) => entryClock(e))
          .filter((c): c is string => c !== null);
        const range =
          clocks.length > 1 && clocks[0] !== clocks[clocks.length - 1]
            ? `${clocks[0]} – ${clocks[clocks.length - 1]}`
            : clocks.length === 1
              ? clocks[0]
              : null;
        return (
          <section
            key={meal}
            aria-label={MEAL_LABEL[meal]}
            className="nut-card nut-rise"
            style={{ "--d": `${120 + mealIndex * 70}ms` } as CSSProperties}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-[22px] leading-tight text-foreground">
                  {MEAL_LABEL[meal]}
                </h3>
                {range ? (
                  <p className="mt-0.5 text-[length:var(--text-caption)] text-muted-foreground tabular-nums">
                    {range}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2.5">
                {mealEntries.length > 0 ? (
                  <p className="text-[length:var(--text-callout)] text-muted-foreground tabular-nums">
                    <span className="font-semibold text-foreground">
                      {Math.round(mealTotals.kcal)} kcal
                    </span>{" "}
                    · {formatGrams(mealTotals.proteinG)} g protein
                  </p>
                ) : null}
                <button
                  type="button"
                  className="nut-icon-btn"
                  aria-label={`Add food to ${MEAL_LABEL[meal]}`}
                  onClick={() => onAdd(meal)}
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            {mealEntries.length === 0 ? (
              <p className="mt-3 text-[length:var(--text-callout)] text-muted-foreground">
                Nothing logged for {MEAL_LABEL[meal]} yet.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border-subtle">
                {mealEntries.map((entry) => {
                  const labelled = labelledEntryNutrients(entry);
                  const n = labelled.nutrients;
                  /* A reference food renders under its friendly name
                     (D4) — the stored name keeps the source's words;
                     estimates and own foods keep the name they were
                     logged under. */
                  const entryName = displayNameForFoodId(entry.foodId, entry.name).en;
                  const clock = entryClock(entry);
                  const swappable = entry.provenance.kind === "usda" && entry.foodId !== null;
                  const swapsOpen = swapOpenFor === entry.id;
                  const options: SwapOption[] =
                    swapsOpen && swappable ? nutrition.swapsForEntry(entry, focus) : [];
                  const editingGrams = editingGramsFor === entry.id;
                  return (
                    <li key={entry.id} className="py-3">
                      <div className="flex items-start gap-3">
                        {entry.foodId ? (
                          <FoodPhoto foodId={entry.foodId} name={entryName} />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[length:var(--text-callout)] font-semibold text-foreground">
                              {entryName}
                            </p>
                            <ProvenanceBadge
                              kind={entry.provenance.kind}
                              label={labelled.label}
                              estimate={labelled.estimate}
                            />
                          </div>
                          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[length:var(--text-caption)] text-muted-foreground tabular-nums">
                            {"grams" in entry.amount ? (
                              editingGrams ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <input
                                    className="nut-grams-input"
                                    inputMode="decimal"
                                    aria-label={`Grams for ${entryName}`}
                                    value={gramsText}
                                    autoFocus
                                    onChange={(e) => setGramsText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveGrams(entry);
                                      if (e.key === "Escape") setEditingGramsFor(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="nut-icon-btn"
                                    aria-label="Save grams"
                                    onClick={() => saveGrams(entry)}
                                  >
                                    <Check className="size-3.5" aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    className="nut-icon-btn"
                                    aria-label="Cancel edit"
                                    onClick={() => setEditingGramsFor(null)}
                                  >
                                    <X className="size-3.5" aria-hidden />
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="nut-grams-btn"
                                  aria-label={`Edit grams for ${entryName}`}
                                  onClick={() => {
                                    setEditingGramsFor(entry.id);
                                    setGramsText(
                                      "grams" in entry.amount
                                        ? String(entry.amount.grams)
                                        : "",
                                    );
                                  }}
                                >
                                  {amountText(entry)}
                                </button>
                              )
                            ) : (
                              <span>{amountText(entry)}</span>
                            )}
                            <span aria-hidden>·</span>
                            <span className="font-semibold text-foreground">
                              {Math.round(n.kcal)} kcal
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                              P {formatGrams(n.proteinG)} C {formatGrams(n.carbsG)} F{" "}
                              {formatGrams(n.fatG)}
                            </span>
                            {clock ? (
                              <>
                                <span aria-hidden>·</span>
                                <span>{clock}</span>
                              </>
                            ) : null}
                          </p>

                          {swapsOpen ? (
                            <div className="nut-swaps nut-fade mt-3">
                              <p className="eyebrow">
                                Calorie-matched swaps · more {focus}
                              </p>
                              {options.length === 0 ? (
                                <p className="mt-2 text-[length:var(--text-caption)] text-muted-foreground">
                                  No better like-for-like option in your library.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2">
                                  {options.map((option) => {
                                    const optionName = foodDisplayName(option.food).en;
                                    return (
                                    <li
                                      key={option.food.id}
                                      className="flex items-center gap-3"
                                    >
                                      <FoodPhoto
                                        foodId={option.food.id}
                                        name={optionName}
                                      />
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[length:var(--text-callout)] font-medium text-foreground">
                                          {optionName}
                                        </span>
                                        <span className="block text-[length:var(--text-caption)] text-muted-foreground tabular-nums">
                                          {formatGrams(option.grams)} g ·{" "}
                                          {Math.round(option.nutrients.kcal)} kcal ·{" "}
                                          {formatGrams(option.nutrients.proteinG)} g protein{" "}
                                          <span className="font-semibold text-[var(--sage)]">
                                            +{formatGrams(option.delta)} g {focus}
                                          </span>
                                        </span>
                                      </span>
                                      <button
                                        type="button"
                                        className="nut-btn nut-btn-ghost nut-btn-sm"
                                        aria-label={`Swap ${entryName} for ${optionName}`}
                                        onClick={() => {
                                          nutrition.applySwap(entry, option);
                                          setSwapOpenFor(null);
                                        }}
                                      >
                                        Swap
                                      </button>
                                    </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {swappable ? (
                            <button
                              type="button"
                              className="nut-icon-btn"
                              data-active={swapsOpen || undefined}
                              aria-label={`Swaps for ${entryName}`}
                              aria-expanded={swapsOpen}
                              onClick={() => setSwapOpenFor(swapsOpen ? null : entry.id)}
                            >
                              <ArrowLeftRight className="size-4" aria-hidden />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="nut-icon-btn"
                            aria-label={`Edit ${entryName}`}
                            onClick={() => onEdit(entry)}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="nut-icon-btn nut-icon-btn-danger"
                            aria-label={`Remove ${entryName}`}
                            onClick={() => onRemove(entry)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
