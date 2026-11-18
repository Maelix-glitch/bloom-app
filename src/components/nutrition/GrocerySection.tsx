/**
 * GrocerySection — the Nutrition tab's shopping list and pantry
 * (System 5, Grocery & Pantry Intelligence, foundation).
 *
 * The list is built by the pure lib (`buildGroceryList`) from the
 * person's CURRENT stored plan: the plan's dish ingredients,
 * aggregated per food across the plan, grouped by the categories the
 * food data itself carries, with what the pantry already covers
 * deducted in plain sight. Nothing here computes a nutrient, invents
 * an amount, or drops a plan dish it cannot resolve — unresolvable
 * dishes are named, with the reason.
 *
 * The owner's Assessment-only rule holds: this section has NO dietary
 * pattern and NO budget controls. Both already governed the plan when
 * it was generated (pattern as a filter, budget tier as a hard cap),
 * and the list is derived from that plan — the note under the list
 * says so, and that is all.
 */

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNutrition } from "@/hooks/useNutrition";
import { usePantry } from "@/hooks/usePantry";
import { fmtDate } from "@/lib/format";
import { usePrefValue } from "@/lib/prefsStore";
import {
  DISH_LIBRARY,
  PLAN_KEY,
  USDA_REFERENCE_FOODS,
  parsePlanValue,
} from "@/lib/nutrition";
import {
  buildGroceryList,
  formatGramAmount,
  normalisePantryName,
  type GroceryItem,
} from "@/lib/grocery";
import { parseForgivingNumber } from "./input";

function GroceryRow({ item }: { item: GroceryItem }) {
  return (
    <li className="nut-entry">
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
          {item.name}
        </p>
        {item.pantryGrams > 0 ? (
          <p className="text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
            {formatGramAmount(item.pantryGrams)} already in your pantry —{" "}
            {item.toBuyGrams > 0
              ? `buy ${formatGramAmount(item.toBuyGrams)}`
              : "nothing more to buy"}
          </p>
        ) : item.pantryUnrecorded ? (
          <p className="text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
            In your pantry — amount not recorded, so nothing was deducted. Check before you
            shop.
          </p>
        ) : null}
      </div>
      <p className="shrink-0 font-display text-[length:var(--text-support)] text-foreground">
        {formatGramAmount(item.neededGrams)}
      </p>
    </li>
  );
}

export function GrocerySection() {
  const nutrition = useNutrition();
  const pantry = usePantry();
  const plan = usePrefValue(PLAN_KEY, parsePlanValue, null);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  const foods = useMemo(
    () => [...nutrition.foods, ...USDA_REFERENCE_FOODS],
    [nutrition.foods],
  );

  const result = useMemo(
    () =>
      buildGroceryList({
        plans: plan ? [plan] : [],
        dishes: DISH_LIBRARY,
        foods,
        pantry: pantry.items,
      }),
    [plan, foods, pantry.items],
  );

  const addPantryItem = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const grams = quantity.trim() ? parseForgivingNumber(quantity) : null;
    const match = foods.find(
      (food) => normalisePantryName(food.name) === normalisePantryName(trimmed),
    );
    pantry.add({
      name: trimmed,
      foodId: match?.id ?? null,
      quantityGrams: grams !== null && grams > 0 ? grams : null,
    });
    setName("");
    setQuantity("");
  };

  return (
    <section className="nut-card nut-rise mt-4" aria-label="Grocery list and pantry">
      <p className="eyebrow">Grocery &amp; pantry</p>
      <div className="mt-2">
        <h2 className="font-display text-[length:var(--text-section)] text-foreground">
          Shopping for your plan
        </h2>
      </div>

      {result.status === "no_plan" ? (
        <p className="mt-2 max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          {result.reason} Generate your plan above and this list will be built from it —
          every ingredient, added up.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            From your plan for {result.days.map((d) => fmtDate(d)).join(", ")} — the ingredients of every dish in
            it, added up per food. Amounts are grams, the units the plan itself uses.
          </p>

          {result.totalItems === 0 && result.unlisted.length === 0 ? (
            <p className="nut-note">
              Your plan has no dishes or foods in it yet, so there is nothing to buy for
              it.
            </p>
          ) : null}

          {result.groups.map((group) => (
            <div key={group.category} className="mt-4">
              <h3 className="nut-meal-title">{group.label}</h3>
              <ul>
                {group.items.map((item) => (
                  <GroceryRow key={item.foodId} item={item} />
                ))}
              </ul>
            </div>
          ))}

          {result.unlisted.length > 0 ? (
            <div className="mt-4">
              <h3 className="nut-meal-title">Couldn&apos;t be listed</h3>
              <ul className="mt-2 list-disc pl-5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
                {result.unlisted.map((entry, index) => (
                  <li key={`${entry.name}-${index}`}>
                    {entry.name} ({entry.where}) — {entry.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="nut-note">
            Built from your plan, so the dietary pattern and budget from your Assessment
            are already in it — they are set in the Assessment, nowhere else.
          </p>
        </>
      )}

      <div className="mt-6 border-t border-border-subtle pt-4">
        <h3 className="nut-meal-title">Your pantry</h3>
        {pantry.items.length === 0 ? (
          <p className="nut-note">
            Nothing recorded yet. Add what you already have at home and the list above
            will deduct it — with the deduction shown, never hidden.
          </p>
        ) : (
          <ul>
            {pantry.items.map((item) => (
              <li key={item.id} className="nut-entry">
                <div className="min-w-0 flex-1">
                  <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
                    {item.name}
                  </p>
                  <p className="text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
                    {item.quantityGrams !== null
                      ? formatGramAmount(item.quantityGrams)
                      : "Amount not recorded"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => pantry.remove(item.id)}
                  aria-label={`Remove ${item.name} from your pantry`}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <Input
              aria-label="Pantry item name"
              placeholder="What do you have? Try “Rice”"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addPantryItem();
              }}
            />
          </div>
          <div className="w-28">
            <Input
              aria-label="Amount in grams (optional)"
              placeholder="Grams"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addPantryItem();
              }}
            />
          </div>
          <Button type="button" size="sm" onClick={addPantryItem} disabled={!name.trim()}>
            <Plus className="size-4" aria-hidden /> Add
          </Button>
        </div>
        <p className="nut-note">
          The amount is optional — without it, the item is marked as at home but nothing
          is deducted, because a deduction needs a real number.
        </p>
      </div>
    </section>
  );
}
