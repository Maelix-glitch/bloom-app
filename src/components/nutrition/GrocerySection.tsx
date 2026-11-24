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
 * Copy list / Share actions (M-63); the pantry's coverage is a
 * "Covered by your pantry (N)" block ABOVE the aisles, quoting the
 * on-hand quantity from the pantry record (M-65), while the aisle
 * rows keep the lib's deduction wording exactly as before; the
 * footnote is two short lines (M-64). Rows are data, not prose —
 * names and quantities render as spans, so the card's one true
 * paragraph is its intro line. Pantry items lead with their
 * quantity figure.
 *
 * The Grocery Journey (M-201) rebuilt the shopping half of this
 * section from the owner-approved concept preview: a progress
 * component (ring, bar, milestone and message lines — the words
 * live in the lib's journey module) replaces the header's plain
 * bought count; All / To buy / In basket tabs and an ingredient
 * search filter the aisles; each aisle carries its small glyph and
 * its own completion count; a shopping mode enlarges the ticks,
 * pins a compact progress bar and gathers the basket at the end;
 * and at 100% the progress gives way to the completion state. The
 * one state change underneath: the bought ticks now PERSIST WITH
 * THE PLAN — a versioned prefs key (`health.groceryBought.v1`)
 * stores the ticked food ids together with the list's signature
 * (its plan days + item ids, from the grocery result itself), so
 * ticks restore only for the list they belong to and a new plan
 * starts with a clean basket. The derivation, the quantities, the
 * Copy / Share actions and the pantry below are untouched.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Info,
  Package,
  Plus,
  Search,
  Share2,
  ShoppingBasket,
  X,
} from "lucide-react";

import { SectionHead } from "@/components/ui/SectionHead";
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
  REFERENCE_FOODS,
  foodDisplayName,
  parsePlanValue,
} from "@/lib/nutrition";
import {
  GROCERY_BOUGHT_KEY,
  GROCERY_CATEGORY_ICONS,
  boughtIdsFor,
  buildGroceryList,
  formatGramAmount,
  groceryListSignature,
  groceryMessageFor,
  groceryMilestoneFor,
  groceryMilestoneStep,
  normalisePantryName,
  parseGroceryBoughtValue,
  readGroceryBought,
  toggleGroceryBought,
  writeGroceryBought,
  type GroceryGroup,
  type GroceryItem,
  type GroceryListResult,
} from "@/lib/grocery";
import { parseForgivingNumber } from "./input";

function GroceryRow({
  item,
  bought,
  shopping,
  onToggle,
}: {
  item: GroceryItem;
  bought: boolean;
  shopping: boolean;
  onToggle: (foodId: string, next: boolean) => void;
}) {
  return (
    /* A bounded pair row (system slice): name and quantity stay next to
       each other inside the shop column — and the quantity is sans with
       tabular numerals, never serif (serif marks meaning, not data).
       The checkbox is the shopping state (§J): ticked as the item goes
       in the basket. M-201 sizes it for the hand (26px at rest, 44px in
       shopping mode), fills it sage when ticked, and draws the item's
       strike line across its name as it completes — the classes live in
       nutrition.css (.shop-check / .shop-item-name). Name, note and
       quantity are spans (Slice 5): a shopping row is data, not a
       paragraph. */
    <li className={`kv-row kv-row--pair shop-row${bought ? " is-bought" : ""}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        <Checkbox
          className={
            shopping
              ? "shop-check mt-0 h-11 w-11 rounded-xl data-[state=checked]:border-[var(--sage)] data-[state=checked]:bg-[var(--sage)] data-[state=checked]:text-[var(--background)]"
              : "shop-check mt-0.5 h-[26px] w-[26px] rounded-lg data-[state=checked]:border-[var(--sage)] data-[state=checked]:bg-[var(--sage)] data-[state=checked]:text-[var(--background)]"
          }
          checked={bought}
          onCheckedChange={(v) => onToggle(item.foodId, v === true)}
          aria-label={`Mark ${item.name} as bought`}
        />
        <div className="min-w-0">
          <span
            className={
              bought
                ? "shop-item-name text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground"
                : "shop-item-name text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground"
            }
          >
            {item.name}
          </span>
          {item.pantryGrams > 0 ? (
            <span className="block text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
              {formatGramAmount(item.pantryGrams)} already in your pantry -{" "}
              {item.toBuyGrams > 0
                ? `buy ${formatGramAmount(item.toBuyGrams)}`
                : "nothing more to buy"}
            </span>
          ) : item.pantryUnrecorded ? (
            <span className="block text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
              In your pantry, amount not recorded, so nothing was deducted. Check before you
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

type ShopTab = "all" | "tobuy" | "basket";

/** The list as plain text for the clipboard / share sheet: the same
 *  friendly names and rounded quantities the screen shows, grouped
 *  by aisle, with the pantry position stated per line. */
function groceryListText(result: OkGroceryResult): string {
  const lines: string[] = [
    `Shopping list, from your plan for ${result.days.map((d) => fmtDate(d)).join(", ")}`,
  ];
  for (const group of result.groups) {
    lines.push("", group.label);
    for (const item of group.items) {
      if (item.pantryGrams > 0 && item.toBuyGrams === 0) {
        lines.push(`- ${item.name}, in your pantry, nothing to buy`);
      } else if (item.pantryGrams > 0) {
        lines.push(
          `- ${item.name}, buy ${formatGramAmount(item.toBuyGrams)} (${formatGramAmount(item.pantryGrams)} already in your pantry)`,
        );
      } else if (item.pantryUnrecorded) {
        lines.push(
          `- ${item.name} - ${formatGramAmount(item.neededGrams)} (also in your pantry, amount not recorded, check before you shop)`,
        );
      } else {
        lines.push(`- ${item.name} - ${formatGramAmount(item.neededGrams)}`);
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

  /* The Grocery Journey's view state (M-201): presentation only —
     which tab is showing, what the search holds, whether shopping
     mode is on. None of it is stored; the ticks below are the only
     state that outlives the visit. */
  const [tab, setTab] = useState<ShopTab>("all");
  const [query, setQuery] = useState("");
  const [shopping, setShopping] = useState(false);
  const [pulse, setPulse] = useState(false);

  const foods = useMemo(
    () => [...nutrition.foods, ...REFERENCE_FOODS],
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
  const allItemIds = useMemo(() => allItems.map((item) => item.foodId), [allItems]);

  /* Shopping ticks (M-201): persisted with the plan. The stored
     value carries the list's signature — the plan days and item ids
     from the grocery result itself — and the read restores ticks
     only when that signature IS the list on screen, intersected
     with the ids the list still carries. A new or changed plan is
     a fresh list: no inherited ticks. Writes go through the lib's
     toggle, which re-stamps the signature on every tick. */
  const storedBought = usePrefValue(GROCERY_BOUGHT_KEY, parseGroceryBoughtValue, null);
  const signature = useMemo(
    () => (ok ? groceryListSignature(ok.days, allItemIds) : ""),
    [ok, allItemIds],
  );
  const bought = useMemo(
    () => boughtIdsFor(storedBought, signature, allItemIds),
    [storedBought, signature, allItemIds],
  );
  const toggleBought = (foodId: string, next: boolean) => {
    if (!ok) return;
    writeGroceryBought(toggleGroceryBought(readGroceryBought(), signature, foodId, next));
  };

  /* What the pantry already covers (M-65): every list item the pantry
     matched, by recorded amount or by presence alone. The maths is
     the lib's — this only reads its result. */
  const covered = allItems.filter((item) => item.pantryGrams > 0 || item.pantryUnrecorded);

  const total = ok?.totalItems ?? 0;
  const boughtCount = allItems.filter((item) => bought.has(item.foodId)).length;
  const remaining = total - boughtCount;
  const pct = total > 0 ? Math.round((boughtCount / total) * 100) : 0;
  const complete = total > 0 && boughtCount === total;
  const milestone = groceryMilestoneFor(pct);
  const message = groceryMessageFor(boughtCount, pct);

  /* Crossing a milestone step upward earns one pulse on the
     progress card (the preview's celebration, kept quiet): never on
     first paint, never on the way down. */
  const step = groceryMilestoneStep(pct);
  const prevStepRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;
    if (prev === null || step <= prev) return;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 950);
    return () => window.clearTimeout(timer);
  }, [step]);

  /* The completion state scrolls itself into view once, when the
     last item lands — the person ticking at the foot of a long list
     should see the moment arrive. */
  const heroRef = useRef<HTMLDivElement | null>(null);
  const wasCompleteRef = useRef(false);
  useEffect(() => {
    if (complete && !wasCompleteRef.current) {
      const reduce =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      heroRef.current?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "center",
      });
    }
    wasCompleteRef.current = complete;
  }, [complete]);

  const backToPlan = () => {
    document
      .getElementById("nut-plan")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  /* Filtering (M-201): the active tab and the search decide which
     items show; a group with nothing visible under them is hidden,
     and its header counts always describe the WHOLE aisle, never
     the filtered slice. */
  const needle = query.trim().toLowerCase();
  const matchesQuery = (item: GroceryItem) =>
    needle.length === 0 || item.name.toLowerCase().includes(needle);
  const visibleFor = (item: GroceryItem) => {
    if (!matchesQuery(item)) return false;
    if (tab === "tobuy") return !bought.has(item.foodId);
    if (tab === "basket") return bought.has(item.foodId);
    return true;
  };
  const visibleGroups = ok
    ? ok.groups
        .map((group) => ({ group, items: group.items.filter(visibleFor) }))
        .filter((entry) => entry.items.length > 0)
    : [];
  /* Shopping mode regroups: what is still to get keeps its aisles;
     what is bought gathers into one flat basket at the end. The tab
     still rules — the basket hides on To buy, the aisles on In
     basket. */
  const remainingGroups = ok
    ? ok.groups
        .map((group) => ({
          group,
          items: group.items.filter(
            (item) => !bought.has(item.foodId) && matchesQuery(item),
          ),
        }))
        .filter((entry) => entry.items.length > 0)
    : [];
  const collectedItems = allItems.filter(
    (item) => bought.has(item.foodId) && matchesQuery(item),
  );
  const showRemaining = shopping && tab !== "basket" && remainingGroups.length > 0;
  const showCollected = shopping && tab !== "tobuy" && collectedItems.length > 0;
  const anyVisible = shopping
    ? showRemaining || showCollected
    : visibleGroups.length > 0;
  const emptyTitle = needle
    ? `Nothing matches “${query.trim()}”`
    : tab === "basket"
      ? "Your basket is empty"
      : "Nothing left to buy";
  const emptyLine = needle
    ? "Try a different ingredient name."
    : tab === "basket"
      ? "Tick items off as you shop and they will gather here."
      : "Everything on the list is in your basket.";

  const renderGroup = (group: GroceryGroup, items: GroceryItem[]) => {
    const done = group.items.filter((item) => bought.has(item.foodId)).length;
    const Icon = GROCERY_CATEGORY_ICONS[group.category];
    return (
      <div key={group.category} className="shop-group">
        <div className="shop-group-head">
          <h3 className="nut-group-title shop-group-title">
            {Icon ? <Icon className="shop-group-icon" aria-hidden /> : null}
            {group.label}
          </h3>
          <span className="shop-group-count">
            <b>{done}</b> / {group.items.length} completed
          </span>
        </div>
        <div className="shop-group-mini" aria-hidden>
          <div
            className="shop-group-mini-fill"
            style={{
              transform: `scaleX(${group.items.length > 0 ? done / group.items.length : 0})`,
            }}
          />
        </div>
        <ul>
          {items.map((item) => (
            <GroceryRow
              key={item.foodId}
              item={item}
              bought={bought.has(item.foodId)}
              shopping={shopping}
              onToggle={toggleBought}
            />
          ))}
        </ul>
      </div>
    );
  };

  const tabs: { id: ShopTab; label: string; count: number }[] = [
    { id: "all", label: "All items", count: total },
    { id: "tobuy", label: "To buy", count: remaining },
    { id: "basket", label: "In basket", count: boughtCount },
  ];

  return (
    <section
      className={`nut-card nut-rise section${shopping ? " is-shopping" : ""}`}
      aria-label="Grocery list and pantry"
    >
      <SectionHead
        kicker="Grocery & pantry"
        title="Shopping for your plan"
        right={
          ok && ok.totalItems > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
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
          ) : null
        }
      />

      {shopping && ok && total > 0 ? (
        /* Shopping mode's pinned progress: count, bar and the way
           out, stuck under the section sub-nav while the list
           scrolls beneath it. */
        <div className="shop-sticky">
          <span className="shop-sticky-count">
            <b>{boughtCount}</b> / {total} in basket
          </span>
          <div className="shop-bar" aria-hidden>
            <div
              className="shop-bar-fill"
              style={{ transform: `scaleX(${total > 0 ? boughtCount / total : 0})` }}
            />
          </div>
          <button type="button" className="shop-exit" onClick={() => setShopping(false)}>
            Exit shopping
          </button>
        </div>
      ) : null}

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
          <p className="shop-intro mt-2 max-w-[var(--measure)] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            From your plan for {result.days.map((d) => fmtDate(d)).join(", ")}, the ingredients of every dish in
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

          {complete ? (
            /* The completion state (M-201): at 100% the progress
               card gives way to this — the drawn check, the count
               collected, and the way back to the plan. Unchecking
               any item leaves it, because the state is derived. */
            <div className="shop-complete" ref={heroRef} aria-live="polite">
              <div className="shop-complete-badge" aria-hidden>
                <svg width="42" height="42" viewBox="0 0 24 24">
                  <path className="shop-complete-check" d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <span className="shop-complete-eyebrow">Your shopping is complete</span>
              <h3 className="shop-complete-title">{total} items collected.</h3>
              <span className="shop-complete-line">
                Everything you need for your meal plan is ready.
              </span>
              <Button
                type="button"
                size="lg"
                className="shop-back rounded-full"
                onClick={backToPlan}
              >
                Back to meal plan →
              </Button>
            </div>
          ) : ok && total > 0 ? (
            /* The progress component (M-201): ring, count, the
               milestone line and the personality line under it, then
               the bar — two separate word lines, as the approved
               preview keeps them. */
            <div className={`shop-progress${pulse ? " is-pulse" : ""}`}>
              <div className="shop-progress-main">
                <div
                  className={`shop-ring${pulse ? " is-pop" : ""}`}
                  role="progressbar"
                  aria-label="Shopping progress"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={boughtCount}
                >
                  <svg viewBox="0 0 104 104" aria-hidden>
                    <circle
                      className="shop-ring-track"
                      cx="52"
                      cy="52"
                      r="44"
                      fill="none"
                      strokeWidth="7"
                    />
                    <circle
                      className="shop-ring-fill"
                      cx="52"
                      cy="52"
                      r="44"
                      fill="none"
                      strokeWidth="7"
                      strokeDasharray="276.5"
                      strokeDashoffset={276.5 * (1 - pct / 100)}
                    />
                  </svg>
                  <div className="shop-ring-centre" aria-hidden>
                    <span className="shop-ring-pct">{pct}%</span>
                    <span className="shop-ring-of">done</span>
                  </div>
                </div>
                <div className="shop-progress-copy">
                  <span className="shop-progress-count">
                    <b>{boughtCount}</b> / {total} Items
                  </span>
                  <span className="shop-milestone">{milestone}</span>
                  <span className="shop-message" aria-live="polite">
                    {message}
                  </span>
                </div>
              </div>
              <div className="shop-bar" aria-hidden>
                <div
                  className="shop-bar-fill"
                  style={{ transform: `scaleX(${pct / 100})` }}
                />
              </div>
              <div className="shop-bar-row">
                <span className="shop-pct-label">{pct}% completed</span>
                <span>{remaining > 0 ? `${remaining} still to buy` : "Nothing left to buy"}</span>
              </div>
            </div>
          ) : null}

          {covered.length > 0 ? (
            <div className="shop-away mt-5">
              <h3 className="nut-group-title">Covered by your pantry ({covered.length})</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {covered.map((item) => (
                  <li key={item.foodId} className="nut-badge">
                    {item.name} ·{" "}
                    {item.pantryOnHandGrams > 0
                      ? `${formatGramAmount(item.pantryOnHandGrams)} at home`
                      : "at home, amount not recorded"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {ok && total > 0 ? (
            <>
              <div className="shop-tabs" role="group" aria-label="Shopping list views">
                {tabs.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="shop-tab"
                    aria-pressed={tab === entry.id}
                    onClick={() => setTab(entry.id)}
                  >
                    {entry.label}
                    <span className="shop-tab-count">{entry.count}</span>
                  </button>
                ))}
              </div>

              <div className="shop-toolbar">
                <label className="shop-search">
                  <Search className="size-[18px] shrink-0" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search ingredients…"
                    aria-label="Search ingredients"
                  />
                </label>
                {!shopping ? (
                  <button
                    type="button"
                    className="shop-start"
                    onClick={() => setShopping(true)}
                  >
                    Start shopping →
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {ok && total > 0 && !anyVisible ? (
            <div className="shop-empty">
              <span className="shop-empty-title">{emptyTitle}</span>
              <span className="shop-empty-line">{emptyLine}</span>
            </div>
          ) : null}

          {shopping ? (
            <>
              {showRemaining ? (
                <>
                  <div className="shop-group-label">Still to get · {remaining}</div>
                  <div className="shop-groups">
                    {remainingGroups.map((entry) => renderGroup(entry.group, entry.items))}
                  </div>
                </>
              ) : null}
              {showCollected ? (
                <>
                  <div className="shop-group-label is-collected">
                    In your basket · {collectedItems.length}
                  </div>
                  <ul className="shop-basket-list">
                    {collectedItems.map((item) => (
                      <GroceryRow
                        key={item.foodId}
                        item={item}
                        bought
                        shopping
                        onToggle={toggleBought}
                      />
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <div className="shop-groups">
              {visibleGroups.map((entry) => renderGroup(entry.group, entry.items))}
            </div>
          )}

          {result.unlisted.length > 0 ? (
            <div className="shop-away mt-4">
              <h3 className="nut-group-title">Couldn&apos;t be listed</h3>
              <ul className="mt-2 list-disc pl-5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
                {result.unlisted.map((entry, index) => (
                  <li key={`${entry.name}-${index}`}>
                    {entry.name} ({entry.where}), {entry.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="note shop-away mt-5">
            <Info className="size-4" aria-hidden />
            <span>
              Your pattern and budget come from your Assessment.
              <br />
              Change them there and this list follows.
            </span>
          </div>
        </>
      )}

      <div className="shop-away mt-6 border-t border-border-subtle pt-4">
        <h3 className="nut-group-title">Your pantry</h3>
        {pantry.items.length === 0 ? (
          <div className="empty-row mt-3">
            <span className="empty-row-icon" aria-hidden>
              <Package className="size-4" />
            </span>
            <p className="empty-row-text">
              <strong>Nothing recorded yet.</strong> Add what you already have at home and
              the list above will deduct it, with the deduction shown, never hidden.
            </p>
          </div>
        ) : (
          <ul className="kv-bound">
            {pantry.items.map((item) => (
              <li key={item.id} className="nut-entry">
                {/* Value-first (Slice 5): the quantity is the figure,
                    the name its label — never name-over-amount. */}
                <span className="w-24 shrink-0 text-[length:var(--text-callout)] font-semibold tabular-nums text-foreground">
                  {item.quantityGrams !== null ? formatGramAmount(item.quantityGrams) : "-"}
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
            The amount is optional, without it, the item is marked as at home but nothing
            is deducted, because a deduction needs a real number.
          </span>
        </div>
      </div>
    </section>
  );
}
