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
 * it was generated (pattern as a filter, budget as a preference), and
 * the list is derived from that plan — the two-line note under the
 * list says where they live, and that is all.
 *
 * Anti-document form (brief v3, Slice 5): the header carries the
 * bought progress and the Copy list / Share actions (M-63); the
 * pantry's coverage is a "Covered by your pantry (N)" block ABOVE the
 * aisles, quoting the on-hand quantity from the pantry record (M-65),
 * while the aisle rows keep the lib's deduction wording exactly as
 * before; the footnote is two short lines (M-64). Rows are data, not
 * prose — names and quantities render as spans, so the card's one
 * true paragraph is its intro line. Pantry items lead with their
 * quantity figure.
 */

import { useMemo, useState } from "react";
import { Check, Copy, Info, Package, Plus, Share2, ShoppingBasket, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useNutrition } from "@/hooks/useNutrition";
import { usePantry } from "@/hooks/usePantry";
import { fmtDate } from "@/lib/format";
import { usePrefValue } from "@/lib/prefsStore";
import {
  DISH_LIBRARY,
  PLAN_KEY,
  USDA_REFERENCE_FOODS,
  foodDisplayName,
  parsePlanValue,
} from "@/lib/nutrition";
import {
  buildGroceryList,
  formatGramAmount,
  normalisePantryName,
  type GroceryItem,
  type GroceryListResult,
} from "@/lib/grocery";
import { parseForgivingNumber } from "./input";

function GroceryRow({
  item,
  bought,
  onToggle,
}: {
  item: GroceryItem;
  bought: boolean;
  onToggle: (foodId: string, next: boolean) => void;
}) {
  return (
    /* A bounded pair row (system slice): name and quantity stay next to
       each other inside the shop column — and the quantity is sans with
       tabular numerals, never serif (serif marks meaning, not data).
       The checkbox is the shopping state (§J): ticked as the item goes
       in the basket, here in the shop, on this device. Name, note and
       quantity are spans (Slice 5): a shopping row is data, not a
       paragraph. */
    <li className="kv-row kv-row--pair">
      <div className="flex min-w-0 items-start gap-2.5">
        <Checkbox
          className="mt-0.5"
          checked={bought}
          onCheckedChange={(v) => onToggle(item.foodId, v === true)}
          aria-label={`Mark ${item.name} as bought`}
        />
        <div className="min-w-0">
          <span
            className={
              bought
                ? "block text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground line-through"
                : "block text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground"
            }
          >
            {item.name}
          </span>
          {item.pantryGrams > 0 ? (
            <span className="block text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
              {formatGramAmount(item.pantryGrams)} already in your pantry —{" "}
              {item.toBuyGrams > 0
                ? `buy ${formatGramAmount(item.toBuyGrams)}`
                : "nothing more to buy"}
            </span>
          ) : item.pantryUnrecorded ? (
            <span className="block text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
              In your pantry — amount not recorded, so nothing was deducted. Check before you
              shop.
            </span>
          ) : null}
        </div>
      </div>
      <span className="kv-qty">{formatGramAmount(item.neededGrams)}</span>
    </li>
  );
}

type OkGroceryResult = Extract<GroceryListResult, { status: "ok" }>;

/** The list as plain text for the clipboard / share sheet: the same
 *  friendly names and rounded quantities the screen shows, grouped
 *  by aisle, with the pantry position stated per line. */
function groceryListText(result: OkGroceryResult): string {
  const lines: string[] = [
    `Shopping list — from your plan for ${result.days.map((d) => fmtDate(d)).join(", ")}`,
  ];
  for (const group of result.groups) {
    lines.push("", group.label);
    for (const item of group.items) {
      if (item.pantryGrams > 0 && item.toBuyGrams === 0) {
        lines.push(`- ${item.name} — in your pantry, nothing to buy`);
      } else if (item.pantryGrams > 0) {
        lines.push(
          `- ${item.name} — buy ${formatGramAmount(item.toBuyGrams)} (${formatGramAmount(item.pantryGrams)} already in your pantry)`,
        );
      } else if (item.pantryUnrecorded) {
        lines.push(
          `- ${item.name} — ${formatGramAmount(item.neededGrams)} (also in your pantry — amount not recorded, check before you shop)`,
        );
      } else {
        lines.push(`- ${item.name} — ${formatGramAmount(item.neededGrams)}`);
      }
    }
  }
  return lines.join("\n");
}

/** Clipboard with the plain-text fallback for contexts where the
 *  async clipboard API is unavailable. False when neither worked —
 *  the button then simply keeps its label, never a false "Copied". */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function GrocerySection() {
  const nutrition = useNutrition();
  const pantry = usePantry();
  const plan = usePrefValue(PLAN_KEY, parsePlanValue, null);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [copied, setCopied] = useState(false);
  /* Shopping ticks (§J): which list items are already in the basket.
     Session state only, deliberately — the list re-derives from the
     plan on every visit, and a tick is about this shop, not a record
     Bloom keeps. Nothing is written to storage. */
  const [bought, setBought] = useState<ReadonlySet<string>>(new Set());
  const toggleBought = (foodId: string, next: boolean) => {
    setBought((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(foodId);
      else copy.delete(foodId);
      return copy;
    });
  };

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

  const ok = result.status === "ok" ? result : null;
  const allItems = useMemo(
    () => (ok ? ok.groups.flatMap((group) => group.items) : []),
    [ok],
  );
  /* What the pantry already covers (M-65): every list item the pantry
     matched, by recorded amount or by presence alone. The maths is
     the lib's — this only reads its result. */
  const covered = allItems.filter((item) => item.pantryGrams > 0 || item.pantryUnrecorded);
  const boughtCount = allItems.filter((item) => bought.has(item.foodId)).length;

  const copyList = async () => {
    if (!ok) return;
    const done = await writeClipboard(groceryListText(ok));
    if (done) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareList = async () => {
    if (!ok) return;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Bloom shopping list", text: groceryListText(ok) });
      } catch {
        /* A dismissed share sheet is a choice, not an error. */
      }
      return;
    }
    await copyList();
  };

  const addPantryItem = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const grams = quantity.trim() ? parseForgivingNumber(quantity) : null;
    /* The name a person types is the name they read — the display
       name — so match against it as well as the stored name. */
    const match = foods.find(
      (food) =>
        normalisePantryName(food.name) === normalisePantryName(trimmed) ||
        normalisePantryName(foodDisplayName(food).en) === normalisePantryName(trimmed),
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
    <section className="nut-card nut-rise section" aria-label="Grocery list and pantry">
      <div className="section-head">
        <div className="section-head__main">
          <div className="eyebrow">Grocery &amp; pantry</div>
          <h2 className="section-head__title mt-1.5">Shopping for your plan</h2>
        </div>
        {ok && ok.totalItems > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
              {boughtCount} of {ok.totalItems} bought
            </span>
            <Button type="button" size="sm" variant="secondary" onClick={copyList}>
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? "Copied" : "Copy list"}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={shareList}>
              <Share2 className="size-4" aria-hidden />
              Share
            </Button>
          </div>
        ) : null}
      </div>

      {result.status === "no_plan" ? (
        <div className="empty-row mt-4">
          <span className="empty-row-icon" aria-hidden>
            <ShoppingBasket className="size-4" />
          </span>
          <p className="empty-row-text">
            {result.reason} Generate your plan above and this list follows.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 max-w-[var(--measure)] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            From your plan for {result.days.map((d) => fmtDate(d)).join(", ")} — the ingredients of every dish in
            it, added up per food. Amounts are grams, the units the plan itself uses.
          </p>

          {result.totalItems === 0 && result.unlisted.length === 0 ? (
            <div className="note mt-4">
              <Info className="size-4" aria-hidden />
              <span>
                Your plan has no dishes or foods in it yet, so there is nothing to buy for
                it.
              </span>
            </div>
          ) : null}

          {covered.length > 0 ? (
            <div className="mt-5">
              <h3 className="nut-group-title">Covered by your pantry ({covered.length})</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {covered.map((item) => (
                  <li key={item.foodId} className="nut-badge">
                    {item.name} ·{" "}
                    {item.pantryOnHandGrams > 0
                      ? `${formatGramAmount(item.pantryOnHandGrams)} at home`
                      : "at home — amount not recorded"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="shop-groups">
            {result.groups.map((group) => (
              <div key={group.category} className="shop-group">
                <h3 className="nut-group-title">{group.label}</h3>
                <ul>
                  {group.items.map((item) => (
                    <GroceryRow
                      key={item.foodId}
                      item={item}
                      bought={bought.has(item.foodId)}
                      onToggle={toggleBought}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {result.unlisted.length > 0 ? (
            <div className="mt-4">
              <h3 className="nut-group-title">Couldn&apos;t be listed</h3>
              <ul className="mt-2 list-disc pl-5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
                {result.unlisted.map((entry, index) => (
                  <li key={`${entry.name}-${index}`}>
                    {entry.name} ({entry.where}) — {entry.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="note mt-5">
            <Info className="size-4" aria-hidden />
            <span>
              Your pattern and budget come from your Assessment.
              <br />
              Change them there and this list follows.
            </span>
          </div>
        </>
      )}

      <div className="mt-6 border-t border-border-subtle pt-4">
        <h3 className="nut-group-title">Your pantry</h3>
        {pantry.items.length === 0 ? (
          <div className="empty-row mt-3">
            <span className="empty-row-icon" aria-hidden>
              <Package className="size-4" />
            </span>
            <p className="empty-row-text">
              <strong>Nothing recorded yet.</strong> Add what you already have at home and
              the list above will deduct it — with the deduction shown, never hidden.
            </p>
          </div>
        ) : (
          <ul className="kv-bound">
            {pantry.items.map((item) => (
              <li key={item.id} className="nut-entry">
                {/* Value-first (Slice 5): the quantity is the figure,
                    the name its label — never name-over-amount. */}
                <span className="w-24 shrink-0 text-[length:var(--text-callout)] font-semibold tabular-nums text-foreground">
                  {item.quantityGrams !== null ? formatGramAmount(item.quantityGrams) : "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
                    {item.name}
                  </span>
                  {item.quantityGrams === null ? (
                    <span className="block text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
                      Amount not recorded
                    </span>
                  ) : null}
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
          {/* Never dimmed gold (system slice): an empty form gets a
              neutral secondary, and the button turns primary — flat
              gold — the moment the name makes it valid. */}
          <Button
            type="button"
            size="sm"
            variant={name.trim() ? "default" : "secondary"}
            onClick={addPantryItem}
            disabled={!name.trim()}
          >
            <Plus className="size-4" aria-hidden /> Add
          </Button>
        </div>
        <div className="note mt-4">
          <Info className="size-4" aria-hidden />
          <span>
            The amount is optional — without it, the item is marked as at home but nothing
            is deducted, because a deduction needs a real number.
          </span>
        </div>
      </div>
    </section>
  );
}
