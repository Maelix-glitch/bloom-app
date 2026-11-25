/**
 * DishDetailSheet — one dish, whole (D4): its photograph when it has
 * one, where its numbers come from, what one serving carries, the
 * recipe itself (ingredient lines under their friendly names, method
 * steps in order), and "Log this dish".
 *
 * The sheet is BloomSheet chrome — the mobile sheet rules hold (capped
 * height, solid surface, real backdrop, never a full-screen takeover).
 * Every number on it is the lib's computation over the dish's USDA
 * ingredient lines, shown under the recipe provenance label; the dish
 * carries no numbers of its own and none are invented here. Logging
 * writes ONE serving through the lib's dish path (a portion snapshot —
 * see dishLog.ts), into the day being viewed, at the meal slot the
 * time of day suggests, exactly like the add-food flow's default.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Clock, Users, X } from "lucide-react";

import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import {
  DISH_CATEGORY_LABEL,
  dishNutrients,
  findReferenceFood,
  foodDisplayName,
  type Dish,
  type Meal,
  type Nutrients,
} from "@/lib/nutrition";
import { rawBasisFraming } from "@/lib/nutrition/preparation";
import { DishPhoto } from "./DishPhoto";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { MEAL_LABEL, formatGrams, mealForTime } from "./input";

const MICROS: readonly { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: "fibreG", label: "Fibre", unit: "g" },
  { key: "sodiumMg", label: "Sodium", unit: "mg" },
  { key: "potassiumMg", label: "Potassium", unit: "mg" },
  { key: "magnesiumMg", label: "Magnesium", unit: "mg" },
  { key: "calciumMg", label: "Calcium", unit: "mg" },
  { key: "ironMg", label: "Iron", unit: "mg" },
  { key: "vitaminCMg", label: "Vitamin C", unit: "mg" },
];

export function DishDetailSheet({
  dish,
  day,
  onClose,
  onLog,
}: {
  dish: Dish | null;
  /** The local day the serving lands on (the day being viewed). */
  day: string;
  onClose: () => void;
  /** Log one serving into `meal` on `day`. False when the lib refused. */
  onLog: (dish: Dish, meal: Meal, day: string) => boolean;
}) {
  const [loggedOk, setLoggedOk] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Each dish opens fresh — no stale "Logged" from the previous one. */
  useEffect(() => {
    setLoggedOk(false);
    setLogError(null);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [dish?.id]);

  if (!dish) return null;

  const labelled = dishNutrients(dish);
  const n = labelled.nutrients;
  const meal = mealForTime(new Date());

  const log = () => {
    if (!onLog(dish, meal, day)) {
      setLogError("Bloom couldn't log that dish, its values fall outside the range the log can store.");
      return;
    }
    setLogError(null);
    setLoggedOk(true);
    closeTimer.current = setTimeout(onClose, 650);
  };

  return (
    <BloomSheet open onClose={onClose} title={dish.name.en} size="lg" className="nut-sheet">
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-6 pt-6 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
              {DISH_CATEGORY_LABEL[dish.category]}
            </p>
            <h2 className="mt-2 font-display text-[length:var(--text-title)] leading-tight text-foreground">
              {dish.name.en}{" "}
              <span className="nut-hindi-title">({dish.name.hindi})</span>
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="bsheet-scroll no-scrollbar mt-4 pr-1">
          <DishPhoto dishId={dish.id} name={dish.name.en} size="large" />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ProvenanceBadge kind="recipe" label={labelled.label} />
            <span className="text-[length:var(--text-caption)] text-muted-foreground">
              Per-serving values are computed from this recipe's USDA ingredient data, nothing is copied from a printed table.
            </span>
          </div>

          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[length:var(--text-callout)] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden /> Serves {dish.servings}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden /> ~{dish.timeMinutes} min
            </span>
            <span>
              Budget <span className="text-[var(--gold)]">{"₹".repeat(dish.budgetTier)}</span>
              <span className="text-faint-strong">{"₹".repeat(3 - dish.budgetTier)}</span>{" "}
              (estimate)
            </span>
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-3">
            <p className="font-display text-[44px] leading-none text-foreground tabular-nums">
              {Math.round(n.kcal)}
              <span className="ml-1.5 text-[length:var(--text-section)] text-muted-foreground">
                kcal per serving
              </span>
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Protein", value: n.proteinG, color: "var(--sage)" },
              { label: "Carbs", value: n.carbsG, color: "var(--macro-carb)" },
              { label: "Fat", value: n.fatG, color: "var(--amber)" },
            ].map((tile) => (
              <div
                key={tile.label}
                className="rounded-[var(--radius-control)] border border-border-subtle p-3"
              >
                <p className="flex items-center gap-1.5 text-[length:var(--text-caption)] text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: tile.color }} aria-hidden />
                  {tile.label}
                </p>
                <p className="mt-1 font-display text-[24px] text-foreground tabular-nums">
                  {formatGrams(tile.value)}
                  <span className="ml-0.5 text-[length:var(--text-caption)] text-muted-foreground">g</span>
                </p>
              </div>
            ))}
          </div>
          {MICROS.some((m) => n[m.key] !== undefined) ? (
            <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-2">
              {MICROS.map((micro) => {
                const value = n[micro.key];
                if (value === undefined) return null;
                return (
                  <p
                    key={micro.key}
                    className="flex items-baseline justify-between gap-2 text-[length:var(--text-caption)]"
                  >
                    <span className="text-muted-foreground">{micro.label}</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {formatGrams(value)} {micro.unit}
                    </span>
                  </p>
                );
              })}
            </div>
          ) : null}

          {dish.enriched && dish.enrichment ? (
            <p className="nut-swaps nut-fade mt-5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
              <span className="font-semibold">Enriched:</span> {dish.enrichment}
            </p>
          ) : null}

          <h3 className="nut-group-label mt-6">Ingredients · per serving</h3>
          <ul className="mt-2 divide-y divide-border-subtle">
            {dish.lines.map((line) => {
              const food = findReferenceFood(line.foodId);
              const names = food
                ? foodDisplayName(food)
                : { en: line.foodId, hindi: null as string | null };
              /* Method 13: a raw-basis line's grams are the dry
                 weight that goes into the pot — the framing says
                 so, so they are never read as a cooked portion. */
              const framing = food ? rawBasisFraming(food) : null;
              return (
                <li key={line.foodId} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="min-w-0 text-[length:var(--text-callout)] text-foreground">
                    {names.en}
                    {names.hindi ? <span className="nut-hindi"> ({names.hindi})</span> : null}
                    {framing ? (
                      <span className="block text-[length:var(--text-caption)] text-muted-foreground">
                        {framing}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[length:var(--text-callout)] tabular-nums text-muted-foreground">
                    {formatGrams(line.grams / dish.servings)} g
                  </span>
                </li>
              );
            })}
          </ul>

          <h3 className="nut-group-label mt-6">Method</h3>
          <ol className="mt-2 space-y-2.5">
            {dish.method.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground"
              >
                <span className="font-display text-[length:var(--text-callout)] text-[var(--gold)] tabular-nums">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {logError ? (
          <p role="alert" className="nut-error mt-3">
            {logError}
          </p>
        ) : null}
        <button
          type="button"
          className="nut-btn nut-btn-gold mt-5 h-12 w-full shrink-0 text-[length:var(--text-body)]"
          disabled={loggedOk}
          onClick={log}
        >
          {loggedOk ? (
            <>
              <Check className="size-4" aria-hidden /> Logged
            </>
          ) : (
            `Log this dish · ${MEAL_LABEL[meal]}`
          )}
        </button>
      </div>
    </BloomSheet>
  );
}
