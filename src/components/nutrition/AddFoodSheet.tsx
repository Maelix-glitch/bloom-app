/**
 * AddFoodSheet — the log flow (design §4.2), in BloomSheet chrome.
 *
 * One search box over the user's own foods and recents first, then the
 * USDA reference set; every result row carries its provenance badge
 * BEFORE selection. Selecting a food moves to the portion step: defined
 * servings as chips or a weight in grams, with a sensible default already
 * chosen — there is no path through this sheet that logs a food without
 * an amount. The meal slot defaults to the time of day. The custom-food
 * form lives in the same sheet, badged "Your value" by construction.
 *
 * Dumb-proof rules (owner directive): forgiving number parsing, an inline
 * explanation for every refused value (which field, why), an honest
 * message when the food list is full, and no dead ends — every empty
 * state names the next action.
 */

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Search, X } from "lucide-react";

import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNutrition } from "@/hooks/useNutrition";
import {
  FoodListFullError,
  MAX_FOODS,
  MEALS,
  entryNutrientsFor,
  labelledFoodNutrients,
  searchUsdaReference,
  type Amount,
  type EntrySource,
  type Food,
  type LogEntry,
  type Meal,
} from "@/lib/nutrition";
import { MEAL_LABEL, mealForTime, nutrientLine, parseForgivingNumber } from "./input";
import { FoodPhoto } from "./FoodPhoto";
import { ProvenanceBadge } from "./ProvenanceBadge";

type View = "search" | "portion" | "custom";

interface Selection {
  food: Food;
  source: Exclude<EntrySource, "coach_photo">;
}

export function AddFoodSheet({
  open,
  onClose,
  day,
  editing = null,
}: {
  open: boolean;
  onClose: () => void;
  /** The local day the entry lands on. */
  day: string;
  /** When set, the sheet edits this entry's amount and meal instead. */
  editing?: LogEntry | null;
}) {
  const nutrition = useNutrition();
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [servingLabel, setServingLabel] = useState<string | null>(null);
  const [servingCount, setServingCount] = useState(1);
  const [gramsText, setGramsText] = useState("");
  const [meal, setMeal] = useState<Meal>("lunch");
  const [logError, setLogError] = useState<string | null>(null);

  /* (Re)initialise each time the sheet opens: a fresh log starts at
     search with the time-of-day meal; an edit starts at the portion step
     with the entry's own amount and meal. */
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setLogError(null);
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
      setMeal(mealForTime(new Date()));
      setView("search");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

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
    onClose();
  };

  return (
    <BloomSheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit entry" : "Log food"}
      size="lg"
      className="nut-sheet"
    >
      <div className="flex max-h-[82vh] flex-col px-5 pb-6 pt-6 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
              Nutrition
            </p>
            <h2 className="mt-2 font-display text-[length:var(--text-title)] leading-tight text-foreground">
              {editing ? "Edit entry" : view === "custom" ? "Your own food" : "Log food"}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="no-scrollbar mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
          {view === "search" ? (
            <SearchStep
              query={query}
              onQuery={setQuery}
              onChoose={chooseFood}
              onCustom={() => setView("custom")}
            />
          ) : null}

          {view === "custom" ? (
            <CustomFoodStep
              onBack={() => setView("search")}
              onCreated={(food) => chooseFood(food, "custom")}
            />
          ) : null}

          {view === "portion" && selection ? (
            <div>
              {!editing ? (
                <button
                  type="button"
                  className="nut-backlink"
                  onClick={() => setView("search")}
                >
                  <ArrowLeft className="size-3.5" aria-hidden /> All foods
                </button>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[length:var(--text-section)] text-foreground">
                  {selection.food.name}
                </h3>
                <ProvenanceBadge
                  kind={selection.food.provenance.kind}
                  label={labelledFoodNutrients(selection.food).label}
                />
              </div>
              <p className="mt-1 text-[length:var(--text-caption)] text-muted-foreground">
                Per 100 g: {nutrientLine(labelledFoodNutrients(selection.food).nutrients)}
              </p>

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
              ) : null}

              <div className="mt-5">
                <label className="nut-field-label" htmlFor="nut-grams">
                  {selection.food.servings.length > 0 ? "Or by weight" : "Weight"}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="nut-grams"
                    inputMode="decimal"
                    placeholder="100"
                    value={gramsText}
                    onChange={(e) => {
                      setGramsText(e.target.value);
                      if (e.target.value.trim()) setServingLabel(null);
                    }}
                    className="max-w-32"
                  />
                  <span className="text-[length:var(--text-support)] text-muted-foreground">
                    grams
                  </span>
                </div>
              </div>

              <fieldset className="mt-5">
                <legend className="nut-field-label">Meal</legend>
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

              <div className="mt-6 border-t border-border-subtle pt-4">
                {preview ? (
                  <p className="text-[length:var(--text-support)] text-foreground">
                    {nutrientLine(preview)}
                  </p>
                ) : (
                  <p className="text-[length:var(--text-support)] text-muted-foreground">
                    Choose a serving or enter a weight to log this food.
                  </p>
                )}
                {logError ? (
                  <p role="alert" className="nut-error mt-2">
                    {logError}
                  </p>
                ) : null}
                <Button
                  type="button"
                  className="mt-4 w-full sm:w-auto"
                  disabled={!preview}
                  onClick={submit}
                >
                  {editing ? "Save changes" : "Log it"}
                </Button>
              </div>
            </div>
          ) : null}

          {view === "portion" && !selection ? (
            <p className="text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              The food this entry came from is no longer in your foods, so its portion can't be
              changed. You can still remove the entry from the day view and log the food again.
            </p>
          ) : null}
        </div>
      </div>
    </BloomSheet>
  );
}

/* --------------------------------- search --------------------------------- */

function SearchStep({
  query,
  onQuery,
  onChoose,
  onCustom,
}: {
  query: string;
  onQuery: (q: string) => void;
  onChoose: (food: Food, source: Selection["source"]) => void;
  onCustom: () => void;
}) {
  const { foods, recents } = useNutrition();
  const q = query.trim().toLowerCase();

  const own: Selection[] = useMemo(() => {
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
  }, [foods, recents, q]);

  const reference = useMemo(() => (q ? searchUsdaReference(query) : []), [q, query]);
  const nothingFound = q !== "" && own.length === 0 && reference.length === 0;

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

      {own.length > 0 ? (
        <section aria-label="Your foods and recents" className="mt-5">
          <h3 className="nut-group-label">Your foods &amp; recents</h3>
          <ul className="mt-2 divide-y divide-border-subtle">
            {own.map(({ food, source }) => (
              <FoodRow key={food.id} food={food} onChoose={() => onChoose(food, source)} />
            ))}
          </ul>
        </section>
      ) : null}

      {reference.length > 0 ? (
        <section aria-label="USDA reference foods" className="mt-5">
          <h3 className="nut-group-label">USDA FoodData Central</h3>
          <ul className="mt-2 divide-y divide-border-subtle">
            {reference.map((food) => (
              <FoodRow key={food.id} food={food} photo onChoose={() => onChoose(food, "search")} />
            ))}
          </ul>
        </section>
      ) : null}

      {nothingFound ? (
        <p className="mt-5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          Nothing matches “{query.trim()}”. You can add it as your own food, straight from the
          packet label.
        </p>
      ) : null}

      {q === "" && own.length === 0 ? (
        <p className="mt-5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          Search the USDA reference set above, or add a food of your own from its packet label —
          it will be badged “Your value”.
        </p>
      ) : null}

      <Button type="button" variant="secondary" className="mt-5" onClick={onCustom}>
        <Plus className="size-4" aria-hidden /> Add your own food
      </Button>
    </div>
  );
}

function FoodRow({
  food,
  onChoose,
  photo = false,
}: {
  food: Food;
  onChoose: () => void;
  /** Reference-set rows show the food's real photograph (P3-R); the
   *  user's own foods and recents never do — Bloom has no photograph
   *  of a food it did not curate. */
  photo?: boolean;
}) {
  const labelled = labelledFoodNutrients(food);
  return (
    <li>
      <button type="button" className="nut-food-row" onClick={onChoose}>
        {photo ? <FoodPhoto foodId={food.id} name={food.name} /> : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[length:var(--text-callout)] font-medium text-foreground">
            {food.name}
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
        badged “Your value” wherever they're used.
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
