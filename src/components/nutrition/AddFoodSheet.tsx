/**
 * LogDialog — the log flow (design §4.2), rebuilt in the prototype's
 * modal composition (N-UI): a capped, solid sheet (mobile sheet rule:
 * ~88dvh, real backdrop, never a full-screen takeover) with three
 * steps — search with role chips, portion, and your own food.
 *
 * The engine is Bloom's, unchanged: one search over the user's own
 * foods and recents first, then the USDA reference set; every result
 * row carries its provenance badge BEFORE selection. Selecting a food
 * moves to the portion step: defined servings as chips or a weight in
 * grams, with a sensible default already chosen — there is no path
 * through this dialog that logs a food without an amount. The meal
 * slot defaults to the time of day, or to the meal the dialog was
 * opened from. The custom-food form lives in the same dialog, badged
 * "Your value" by construction, with an inline explanation for every
 * refused value.
 *
 * (The file keeps its original name — and the `AddFoodSheet` export —
 * because the nutrition guard pins this surface's lib usage here.)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNutrition } from "@/hooks/useNutrition";
import {
  FoodListFullError,
  MAX_FOODS,
  MEALS,
  USDA_REFERENCE_FOODS,
  entryNutrientsFor,
  foodDisplayName,
  labelledFoodNutrients,
  searchUsdaReference,
  usdaDataStamp,
  usdaDatasetVersionLine,
  type Amount,
  type EntrySource,
  type Food,
  type FoodGroup,
  type LogEntry,
  type Meal,
  type Nutrients,
} from "@/lib/nutrition";
import { MEAL_LABEL, mealForTime, nutrientLine, parseForgivingNumber } from "./input";
import { FoodPhoto } from "./FoodPhoto";
import { ProvenanceBadge } from "./ProvenanceBadge";

type View = "search" | "portion" | "custom";

interface Selection {
  food: Food;
  source: Exclude<EntrySource, "coach_photo">;
}

/** Role chips → Bloom food groups. A role is a browsing lens over the
 *  reference set's pinned groups, nothing more: a food appears under a
 *  role only when the data layer classified it there. The user's own
 *  foods are unclassified — Bloom does not guess what is in them — so
 *  they appear under All and Mine only. */
const ROLES: readonly { id: string; label: string; groups?: readonly FoodGroup[] }[] = [
  { id: "all", label: "All" },
  { id: "protein", label: "Protein", groups: ["pulses_legumes", "eggs"] },
  { id: "carbs", label: "Carbs", groups: ["cereals_grains"] },
  { id: "veg", label: "Veg", groups: ["vegetables"] },
  { id: "fruit", label: "Fruit", groups: ["fruits"] },
  { id: "fats", label: "Fats", groups: ["fats_oils", "nuts_seeds"] },
  { id: "dairy", label: "Dairy", groups: ["dairy"] },
  { id: "mine", label: "Mine" },
];

const PREVIEW_MICROS: readonly { key: keyof Nutrients; label: string; unit: string }[] = [
  { key: "fibreG", label: "Fibre", unit: "g" },
  { key: "sodiumMg", label: "Sodium", unit: "mg" },
  { key: "potassiumMg", label: "Potassium", unit: "mg" },
  { key: "ironMg", label: "Iron", unit: "mg" },
  { key: "calciumMg", label: "Calcium", unit: "mg" },
  { key: "vitaminCMg", label: "Vitamin C", unit: "mg" },
];

export function LogDialog({
  open,
  onClose,
  day,
  editing = null,
  initialMeal = null,
}: {
  open: boolean;
  onClose: () => void;
  /** The local day the entry lands on. */
  day: string;
  /** When set, the dialog edits this entry's amount and meal instead. */
  editing?: LogEntry | null;
  /** The meal the dialog was opened from (a Timeline meal card). */
  initialMeal?: Meal | null;
}) {
  const nutrition = useNutrition();
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [servingLabel, setServingLabel] = useState<string | null>(null);
  const [servingCount, setServingCount] = useState(1);
  const [gramsText, setGramsText] = useState("");
  const [meal, setMeal] = useState<Meal>("lunch");
  const [logError, setLogError] = useState<string | null>(null);
  const [loggedOk, setLoggedOk] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* (Re)initialise each time the dialog opens: a fresh log starts at
     search with the opening meal (or the time-of-day meal); an edit
     starts at the portion step with the entry's own amount and meal. */
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setRole("all");
    setLogError(null);
    setLoggedOk(false);
    setGramsText("");
    setServingCount(1);
    if (editing) {
      const food = editing.foodId ? nutrition.foodById(editing.foodId) : null;
      setSelection(food ? { food, source: "search" } : null);
      setMeal(editing.meal);
      if (editing.amount && "servings" in editing.amount) {
        setServingLabel(editing.amount.servingLabel);
        setServingCount(editing.amount.servings);
      } else {
        setServingLabel(null);
        if (editing.amount && "grams" in editing.amount) {
          setGramsText(String(editing.amount.grams));
        }
      }
      setView("portion");
    } else {
      setSelection(null);
      setServingLabel(null);
      setMeal(initialMeal ?? mealForTime(new Date()));
      setView("search");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, initialMeal]);

  /* Scroll lock + Escape, while open. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [open, onClose]);

  const chooseFood = (food: Food, source: Selection["source"]) => {
    setSelection({ food, source });
    setLogError(null);
    /* The dumb-proof default: the first defined serving, or 100 g — an
       amount is always preselected, so logging can never skip it. */
    if (food.servings.length > 0) {
      setServingLabel(food.servings[0]!.label);
      setServingCount(1);
      setGramsText("");
    } else {
      setServingLabel(null);
      setGramsText("100");
    }
    setView("portion");
  };

  const amount: Amount | null = useMemo(() => {
    if (servingLabel) return { servings: servingCount, servingLabel };
    const grams = parseForgivingNumber(gramsText);
    return grams !== null && grams > 0 ? { grams } : null;
  }, [servingLabel, servingCount, gramsText]);

  const preview =
    selection && amount ? entryNutrientsFor(selection.food, amount) : null;

  const submit = () => {
    if (!selection || !amount) return;
    if (editing) {
      nutrition.editEntry(editing, { meal, amount });
      onClose();
      return;
    }
    const entry = nutrition.logFood(selection.food, amount, meal, day, selection.source);
    if (!entry) {
      setLogError(
        "Bloom couldn't log that — the portion may be out of range. Try a smaller amount.",
      );
      return;
    }
    /* The prototype's beat: the button confirms, then the sheet goes. */
    setLoggedOk(true);
    closeTimer.current = setTimeout(onClose, 650);
  };

  if (!open) return null;

  const title = editing
    ? "Edit entry"
    : view === "custom"
      ? "Add your own food"
      : view === "portion"
        ? "Choose a portion"
        : "Log food";

  return (
    <div
      className="nut-dialog-backdrop nut-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="nut-dialog-panel nut-pop"
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5 sm:px-7">
          <div className="flex items-start gap-2">
            {view !== "search" && !editing ? (
              <button
                type="button"
                className="nut-icon-btn mt-1"
                aria-label="Back to search"
                onClick={() => setView("search")}
              >
                <ArrowLeft className="size-4" aria-hidden />
              </button>
            ) : null}
            <div>
              <p className="eyebrow">Nutrition</p>
              <h2 className="mt-1.5 font-display text-[28px] leading-tight text-foreground">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="nut-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="nut-dialog-scroll px-5 pb-6 pt-2 sm:px-7">
          {view === "search" ? (
            <>
              <SearchStep
                query={query}
                onQuery={setQuery}
                role={role}
                onRole={setRole}
                onChoose={chooseFood}
                onCustom={() => setView("custom")}
              />
              <p
                className="mt-4 text-[length:var(--text-caption)] text-muted-foreground"
                data-testid="usda-dataset-version"
              >
                {usdaDatasetVersionLine()}
              </p>
            </>
          ) : null}

          {view === "custom" ? (
            <CustomFoodStep
              onBack={() => setView("search")}
              onCreated={(food) => chooseFood(food, "custom")}
            />
          ) : null}

          {view === "portion" && selection ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[24px] text-foreground">
                  {foodDisplayName(selection.food).en}
                </h3>
                <ProvenanceBadge
                  kind={selection.food.provenance.kind}
                  label={labelledFoodNutrients(selection.food).label}
                />
              </div>
              <p className="mt-1 text-[length:var(--text-caption)] text-muted-foreground">
                {selection.food.servings.length > 0
                  ? `${selection.food.servings[0]!.label} ≈ ${selection.food.servings[0]!.grams} g · Per 100 g: ${nutrientLine(labelledFoodNutrients(selection.food).nutrients)}`
                  : `Per 100 g reference · ${nutrientLine(labelledFoodNutrients(selection.food).nutrients)}`}
              </p>
              {usdaDataStamp(selection.food) ? (
                <p
                  className="mt-1 text-[length:var(--text-caption)] text-muted-foreground"
                  data-testid="usda-data-stamp"
                >
                  {usdaDataStamp(selection.food)}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-3">
                <p className="font-display text-[56px] leading-none text-foreground tabular-nums">
                  {preview ? Math.round(preview.kcal) : "—"}
                  <span className="ml-1.5 text-[length:var(--text-section)] text-muted-foreground">
                    kcal
                  </span>
                </p>
                <label className="flex items-center gap-2 pb-1.5">
                  <input
                    aria-label="Grams"
                    inputMode="decimal"
                    className="nut-grams-input w-28 text-right font-display text-[length:var(--text-title)]"
                    value={
                      servingLabel
                        ? String(
                            Math.round(
                              (selection.food.servings.find((s) => s.label === servingLabel)
                                ?.grams ?? 0) * servingCount,
                            ),
                          )
                        : gramsText
                    }
                    onChange={(e) => {
                      setGramsText(e.target.value);
                      if (e.target.value.trim()) setServingLabel(null);
                    }}
                  />
                  <span className="text-[length:var(--text-support)] text-muted-foreground">
                    grams
                  </span>
                </label>
              </div>

              {!servingLabel ? (
                <input
                  type="range"
                  aria-label="Portion size"
                  className="nut-range mt-4"
                  min={5}
                  max={Math.min(
                    800,
                    Math.max(
                      150,
                      Math.round(((selection.food.servings[0]?.grams ?? 100) * 5) / 10) * 10,
                    ),
                  )}
                  step={5}
                  value={parseForgivingNumber(gramsText) ?? 5}
                  onChange={(e) => setGramsText(e.target.value)}
                />
              ) : null}

              {selection.food.servings.length > 0 ? (
                <fieldset className="mt-5">
                  <legend className="nut-field-label">Serving</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selection.food.servings.map((serving) => (
                      <button
                        key={serving.label}
                        type="button"
                        className="nut-chip"
                        data-selected={servingLabel === serving.label || undefined}
                        aria-pressed={servingLabel === serving.label}
                        onClick={() => {
                          setServingLabel(serving.label);
                          setGramsText("");
                        }}
                      >
                        {serving.label} · {serving.grams} g
                      </button>
                    ))}
                    {[50, 100, 150, 250].map((grams) => (
                      <button
                        key={grams}
                        type="button"
                        className="nut-chip"
                        data-selected={
                          (!servingLabel && parseForgivingNumber(gramsText) === grams) ||
                          undefined
                        }
                        aria-pressed={
                          !servingLabel && parseForgivingNumber(gramsText) === grams
                        }
                        onClick={() => {
                          setServingLabel(null);
                          setGramsText(String(grams));
                        }}
                      >
                        {grams} g
                      </button>
                    ))}
                  </div>
                  {servingLabel ? (
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-[length:var(--text-support)] text-muted-foreground">
                        How many?
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          aria-label="One fewer serving"
                          onClick={() => setServingCount((c) => Math.max(0.5, c - 0.5))}
                        >
                          <Minus className="size-3.5" aria-hidden />
                        </Button>
                        <span
                          className="min-w-8 text-center text-[length:var(--text-callout)] tabular-nums text-foreground"
                          data-testid="serving-count"
                        >
                          {servingCount}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          aria-label="One more serving"
                          onClick={() => setServingCount((c) => Math.min(20, c + 0.5))}
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </fieldset>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {[50, 100, 150, 250].map((grams) => (
                    <button
                      key={grams}
                      type="button"
                      className="nut-chip"
                      data-selected={parseForgivingNumber(gramsText) === grams || undefined}
                      aria-pressed={parseForgivingNumber(gramsText) === grams}
                      onClick={() => setGramsText(String(grams))}
                    >
                      {grams} g
                    </button>
                  ))}
                </div>
              )}

              {preview ? (
                <>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      { label: "Protein", value: preview.proteinG, color: "var(--sage)" },
                      { label: "Carbs", value: preview.carbsG, color: "var(--sky)" },
                      { label: "Fat", value: preview.fatG, color: "var(--amber)" },
                    ].map((tile) => (
                      <div
                        key={tile.label}
                        className="rounded-[var(--radius-control)] border border-border-subtle p-3"
                      >
                        <p className="flex items-center gap-1.5 text-[length:var(--text-caption)] text-muted-foreground">
                          <span
                            className="size-2 rounded-full"
                            style={{ background: tile.color }}
                            aria-hidden
                          />
                          {tile.label}
                        </p>
                        <p className="mt-1 font-display text-[24px] text-foreground tabular-nums">
                          {tile.value}
                          <span className="ml-0.5 text-[length:var(--text-caption)] text-muted-foreground">
                            g
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-2">
                    {PREVIEW_MICROS.map((micro) => {
                      const value = preview[micro.key];
                      return (
                        <p
                          key={micro.key}
                          className="flex items-baseline justify-between gap-2 text-[length:var(--text-caption)]"
                        >
                          <span className="text-muted-foreground">{micro.label}</span>
                          {value !== undefined ? (
                            <span className="font-medium text-foreground tabular-nums">
                              {value} {micro.unit}
                            </span>
                          ) : (
                            <span className="text-faint-strong">not reported</span>
                          )}
                        </p>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="mt-6 text-[length:var(--text-support)] text-muted-foreground">
                  Choose a serving or enter a weight to log this food.
                </p>
              )}

              <fieldset className="mt-6">
                <legend className="nut-field-label">Add to</legend>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Meal">
                  {MEALS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="nut-chip"
                      data-selected={meal === m || undefined}
                      aria-pressed={meal === m}
                      onClick={() => setMeal(m)}
                    >
                      {MEAL_LABEL[m]}
                    </button>
                  ))}
                </div>
              </fieldset>

              {logError ? (
                <p role="alert" className="nut-error mt-3">
                  {logError}
                </p>
              ) : null}
              <button
                type="button"
                className="nut-btn nut-btn-gold mt-5 h-12 w-full text-[length:var(--text-body)]"
                disabled={!preview || loggedOk}
                onClick={submit}
              >
                {loggedOk ? (
                  <>
                    <Check className="size-4" aria-hidden /> Logged
                  </>
                ) : editing ? (
                  "Save changes"
                ) : preview ? (
                  `Log to ${MEAL_LABEL[meal]} · ${Math.round(preview.kcal)} kcal`
                ) : (
                  "Log it"
                )}
              </button>
            </div>
          ) : null}

          {view === "portion" && !selection ? (
            <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              The food this entry came from is no longer in your foods, so its portion can't
              be changed. You can still remove the entry from the day view and log the food
              again.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The original export name, kept for existing call sites. */
export const AddFoodSheet = LogDialog;

/* --------------------------------- search --------------------------------- */

function SearchStep({
  query,
  onQuery,
  role,
  onRole,
  onChoose,
  onCustom,
}: {
  query: string;
  onQuery: (q: string) => void;
  role: string;
  onRole: (role: string) => void;
  onChoose: (food: Food, source: Selection["source"]) => void;
  onCustom: () => void;
}) {
  const { foods, recents } = useNutrition();
  const q = query.trim().toLowerCase();
  const roleDef = ROLES.find((r) => r.id === role) ?? ROLES[0]!;
  const searching = q !== "" || role !== "all";

  const own: Selection[] = useMemo(() => {
    if (role !== "all" && role !== "mine") return [];
    const out: Selection[] = [];
    const seen = new Set<string>();
    for (const food of recents) {
      if (seen.has(food.id)) continue;
      if (q && !food.name.toLowerCase().includes(q)) continue;
      seen.add(food.id);
      out.push({ food, source: "recent" });
    }
    for (const food of foods) {
      if (seen.has(food.id)) continue;
      if (q && !food.name.toLowerCase().includes(q)) continue;
      seen.add(food.id);
      out.push({ food, source: "search" });
    }
    return out;
  }, [foods, recents, q, role]);

  const reference = useMemo(() => {
    if (role === "mine") return [];
    const base = q ? searchUsdaReference(query) : USDA_BROWSE;
    if (!roleDef.groups) return base;
    return base.filter(
      (food) => food.classification && roleDef.groups!.includes(food.classification.group),
    );
  }, [q, query, role, roleDef]);

  const nothingFound = searching && own.length === 0 && reference.length === 0;

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <Input
          aria-label="Search foods"
          placeholder="Search foods — try “rice” or “egg”"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Food roles">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            className="nut-chip nut-chip-solid"
            data-selected={role === r.id || undefined}
            aria-pressed={role === r.id}
            onClick={() => onRole(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!searching && recents.length > 0 ? (
        <section aria-label="Recently logged" className="mt-5">
          <h3 className="nut-group-label">Recently logged</h3>
          <ul className="mt-2 divide-y divide-border-subtle">
            {recents.map((food) => (
              <FoodRow
                key={food.id}
                food={food}
                onChoose={() => onChoose(food, "recent")}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {own.length > 0 && (searching || recents.length === 0) ? (
        <section aria-label="Your foods and recents" className="mt-5">
          <h3 className="nut-group-label">Your foods &amp; recents</h3>
          <ul className="mt-2 divide-y divide-border-subtle">
            {own.map(({ food, source }) => (
              <FoodRow key={food.id} food={food} onChoose={() => onChoose(food, source)} />
            ))}
          </ul>
        </section>
      ) : null}

      {!searching && recents.length > 0 && foods.length > 0 ? (
        <section aria-label="Your foods and recents" className="mt-5">
          <h3 className="nut-group-label">Your foods</h3>
          <ul className="mt-2 divide-y divide-border-subtle">
            {foods.map((food) => (
              <FoodRow key={food.id} food={food} onChoose={() => onChoose(food, "search")} />
            ))}
          </ul>
        </section>
      ) : null}

      {reference.length > 0 ? (
        <section aria-label="USDA reference foods" className="mt-5">
          <h3 className="nut-group-label">
            {q ? "USDA FoodData Central" : "Reference library"}
          </h3>
          <ul className="mt-2 divide-y divide-border-subtle">
            {reference.map((food) => (
              <FoodRow key={food.id} food={food} onChoose={() => onChoose(food, "search")} />
            ))}
          </ul>
        </section>
      ) : null}

      {nothingFound ? (
        <p className="mt-5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          {q
            ? `Nothing matches “${query.trim()}”. You can add it as your own food, straight from the packet label.`
            : "Nothing in this group yet. Try another group, or add a food of your own."}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
        <p className="text-[length:var(--text-caption)] text-muted-foreground">
          Every value is labelled with where it came from.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={onCustom}>
          <Plus className="size-4" aria-hidden /> Add your own food
        </Button>
      </div>
    </div>
  );
}

/** The reference set browsable without a query (the prototype's Browse):
 *  the full USDA list, in its shipped order. */
const USDA_BROWSE = USDA_REFERENCE_FOODS;

function FoodRow({
  food,
  onChoose,
}: {
  food: Food;
  onChoose: () => void;
}) {
  const labelled = labelledFoodNutrients(food);
  /* Reference foods render under their friendly display name, Hindi
     alongside (D4); the raw USDA description stays in the provenance
     layer. A user's own food keeps the name its owner gave it. */
  const display = foodDisplayName(food);
  return (
    <li className="nut-food-row">
      {food.provenance.kind === "usda" ? (
        <FoodPhoto foodId={food.id} name={display.en} />
      ) : null}
      <button type="button" className="nut-food-row-main" onClick={onChoose}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[length:var(--text-callout)] font-medium text-foreground">
            {display.en}
            {display.hindi ? <span className="nut-hindi"> ({display.hindi})</span> : null}
          </span>
          <span className="mt-0.5 block text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
            Per 100 g · {nutrientLine(labelled.nutrients)}
          </span>
        </span>
        <ProvenanceBadge kind={food.provenance.kind} label={labelled.label} />
      </button>
    </li>
  );
}

/* ------------------------------- custom food ------------------------------ */

interface FieldErrors {
  name?: string;
  kcal?: string;
  proteinG?: string;
  carbsG?: string;
  fatG?: string;
  fibreG?: string;
  sodiumMg?: string;
  servingGrams?: string;
  form?: string;
}

function CustomFoodStep({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (food: Food) => void;
}) {
  const { addCustomFood } = useNutrition();
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [fibreG, setFibreG] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [servingLabelText, setServingLabelText] = useState("");
  const [servingGrams, setServingGrams] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const macroError = (raw: string, label: string): string | undefined => {
    const value = parseForgivingNumber(raw);
    if (value === null)
      return `${label}: enter the number from the label — 0 is fine if that's what it says.`;
    if (value > 100) return `${label}: per 100 g, this can't be over 100 g.`;
    return undefined;
  };

  const submit = () => {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Give the food a name — the packet's name works.";
    const kcalValue = parseForgivingNumber(kcal);
    if (kcalValue === null) {
      next.kcal = "Energy: enter the number from the label, per 100 g.";
    } else if (kcalValue > 2000) {
      next.kcal =
        "Energy: that's more than any food has per 100 g — check the label isn't per pack or per serving.";
    }
    const proteinError = macroError(proteinG, "Protein");
    if (proteinError) next.proteinG = proteinError;
    const carbsError = macroError(carbsG, "Carbs");
    if (carbsError) next.carbsG = carbsError;
    const fatError = macroError(fatG, "Fat");
    if (fatError) next.fatG = fatError;
    const fibreValue = fibreG.trim() ? parseForgivingNumber(fibreG) : null;
    if (fibreG.trim() && (fibreValue === null || fibreValue > 100)) {
      next.fibreG = "Fibre: per 100 g, enter the number from the label (it can't be over 100 g).";
    }
    const sodiumValue = sodiumMg.trim() ? parseForgivingNumber(sodiumMg) : null;
    if (sodiumMg.trim() && (sodiumValue === null || sodiumValue > 40000)) {
      next.sodiumMg = "Sodium: enter the milligrams from the label, per 100 g.";
    }
    const servingGramsValue = parseForgivingNumber(servingGrams);
    if (servingLabelText.trim() && (servingGramsValue === null || servingGramsValue <= 0)) {
      next.servingGrams = "Give the serving a weight in grams, so Bloom can use it.";
    }
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    try {
      const food = addCustomFood({
        name: name.trim(),
        per100g: {
          kcal: kcalValue!,
          proteinG: parseForgivingNumber(proteinG)!,
          carbsG: parseForgivingNumber(carbsG)!,
          fatG: parseForgivingNumber(fatG)!,
          ...(fibreValue !== null ? { fibreG: fibreValue } : {}),
          ...(sodiumValue !== null ? { sodiumMg: sodiumValue } : {}),
        },
        servings:
          servingLabelText.trim() && servingGramsValue
            ? [{ label: servingLabelText.trim(), grams: servingGramsValue }]
            : [],
      });
      if (!food) {
        setErrors({
          form: "One of those values is outside the range Bloom can store — check the per-100 g numbers against the packet.",
        });
        return;
      }
      onCreated(food);
    } catch (err) {
      if (err instanceof FoodListFullError) {
        setErrors({
          form: `Your food list is full — Bloom keeps up to ${MAX_FOODS} of your own foods, so this one couldn't be saved.`,
        });
        return;
      }
      throw err;
    }
  };

  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    error: string | undefined,
    placeholder: string,
  ) => (
    <div>
      <label className="nut-field-label" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => set(e.target.value)}
        className="mt-2"
      />
      {error ? (
        <p role="alert" className="nut-error mt-1.5">
          {error}
        </p>
      ) : null}
    </div>
  );

  return (
    <div>
      <button type="button" className="nut-backlink" onClick={onBack}>
        <ArrowLeft className="size-3.5" aria-hidden /> All foods
      </button>
      <p className="mt-3 max-w-[52ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        Copy the values from the packet label, per 100 g. Bloom saves them as your own food,
        badged “Your value” wherever they're used. Anything you leave blank is stored as “not
        reported” — never as zero.
      </p>
      <div className="mt-5">
        <label className="nut-field-label" htmlFor="nut-custom-name">
          Name
        </label>
        <Input
          id="nut-custom-name"
          value={name}
          placeholder="e.g. Amul Taaza Milk"
          aria-invalid={errors.name ? true : undefined}
          onChange={(e) => setName(e.target.value)}
          className="mt-2"
        />
        {errors.name ? (
          <p role="alert" className="nut-error mt-1.5">
            {errors.name}
          </p>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {field("nut-custom-kcal", "Energy (kcal)", kcal, setKcal, errors.kcal, "per 100 g")}
        {field("nut-custom-protein", "Protein (g)", proteinG, setProteinG, errors.proteinG, "per 100 g")}
        {field("nut-custom-carbs", "Carbs (g)", carbsG, setCarbsG, errors.carbsG, "per 100 g")}
        {field("nut-custom-fat", "Fat (g)", fatG, setFatG, errors.fatG, "per 100 g")}
        {field("nut-custom-fibre", "Fibre (g, optional)", fibreG, setFibreG, errors.fibreG, "per 100 g")}
        {field("nut-custom-sodium", "Sodium (mg, optional)", sodiumMg, setSodiumMg, errors.sodiumMg, "per 100 g")}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="nut-field-label" htmlFor="nut-custom-serving-label">
            Serving (optional)
          </label>
          <Input
            id="nut-custom-serving-label"
            value={servingLabelText}
            placeholder="e.g. 1 glass"
            onChange={(e) => setServingLabelText(e.target.value)}
            className="mt-2"
          />
        </div>
        {field(
          "nut-custom-serving-grams",
          "Serving weight (g)",
          servingGrams,
          setServingGrams,
          errors.servingGrams,
          "e.g. 200",
        )}
      </div>
      {errors.form ? (
        <p role="alert" className="nut-error mt-4">
          {errors.form}
        </p>
      ) : null}
      <Button type="button" className="mt-5" onClick={submit}>
        Save &amp; log it
      </Button>
    </div>
  );
}
