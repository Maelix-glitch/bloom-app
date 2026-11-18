// @vitest-environment jsdom
/**
 * Nutrition N4 — the tab, driven end to end against the real prefs
 * document and the real lib: search ordering and badges, the preselected
 * portion, logging into the day view, totals against the targets engine
 * (and the safety refusal that must show no target at all), custom-food
 * validation, the full-list error, undoable delete, copy-yesterday.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: () => ({ userId: "user-1", ready: true }),
}));

import { setPref } from "@/lib/prefs";
import { resetPrefCache } from "@/lib/prefsStore";
import { shiftDay, todayLocal } from "@/lib/localDay";
import { BODY_KEY, DEFAULT_BODY, bodyTargetsOf, type BodyProfile } from "@/lib/health/body";
import {
  ASSESSMENT_KEY,
  EMPTY_ANSWERS,
  emptyAssessmentState,
} from "@/lib/assessment/state";
import {
  FOOD_PHOTO_CREDITS,
  MAX_FOODS,
  createCustomFood,
  createEntryFromFood,
  foodsValueOf,
  logEntry,
  readDayLog,
  readFoodLog,
  saveCustomFood,
  searchUsdaReference,
  usdaDataStamp,
  usdaDatasetVersionLine,
  type Food,
  type LogEntry,
} from "@/lib/nutrition";
import { NutritionPage } from "./NutritionPage";
import { MEAL_LABEL } from "./input";
import { fmtKcalApprox } from "@/lib/format";

afterEach(cleanup);

beforeEach(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList);
  window.localStorage.clear();
  resetPrefCache();
});

const NOW = "2026-11-15T08:30:00.000Z";

function seedBodyProfile(): BodyProfile {
  const profile: BodyProfile = {
    ...DEFAULT_BODY,
    heightCm: 175,
    weightKg: 82,
    age: 30,
    sex: "female",
    activity: "light",
    goal: "maintain",
    updatedAt: NOW,
  };
  setPref(BODY_KEY, profile);
  return profile;
}

function seedOats(): Food {
  const food = saveCustomFood({
    name: "My Oats",
    per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
    servings: [{ label: "1 bowl", grams: 80 }],
  });
  if (!food) throw new Error("seed food refused");
  return food;
}

function logDirect(
  food: Food,
  grams: number,
  day: string,
  meal: LogEntry["meal"] = "breakfast",
): LogEntry {
  const entry = createEntryFromFood({
    food,
    amount: { grams },
    meal,
    day,
    source: "search",
    now: NOW,
  });
  if (!entry) throw new Error("seed entry refused");
  logEntry(entry);
  return entry;
}

function openSheet() {
  fireEvent.click(screen.getByRole("button", { name: "Add food" }));
  return screen.getByRole("dialog");
}

describe("NutritionPage — search & add flow", () => {
  it("lists own foods and recents before the USDA set, every row badged before selection", () => {
    const own = saveCustomFood({
      name: "Homemade Rice Bowl",
      per100g: { kcal: 210, proteinG: 6, carbsG: 38, fatG: 3 },
    });
    if (!own) throw new Error("seed food refused");
    const usdaRice = searchUsdaReference("rice")[0]!;
    logDirect(usdaRice, 100, shiftDay(todayLocal(), -1), "lunch");

    render(<NutritionPage />);
    const sheet = openSheet();
    fireEvent.change(within(sheet).getByLabelText("Search foods"), {
      target: { value: "rice" },
    });

    const ownSection = within(sheet).getByLabelText("Your foods and recents");
    const usdaSection = within(sheet).getByLabelText("USDA reference foods");
    /* Own first: the USDA section starts after the own section ends. */
    expect(
      ownSection.compareDocumentPosition(usdaSection) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    /* The recent (the USDA rice, logged yesterday) rides in the own list,
       and every row in both lists carries its badge before any tap. */
    const ownBadges = within(ownSection).getAllByTestId("provenance-badge");
    expect(ownBadges.map((b) => b.textContent)).toContain("Your value");
    expect(ownBadges.map((b) => b.textContent)).toContain("USDA FoodData Central");
    const usdaBadges = within(usdaSection).getAllByTestId("provenance-badge");
    expect(usdaBadges.length).toBeGreaterThan(0);
    expect(usdaBadges.every((b) => b.textContent === "USDA FoodData Central")).toBe(true);
  });

  it("shows the USDA data-version stamp on a reference food, and none on an own food (audit #29)", () => {
    const own = saveCustomFood({
      name: "Homemade Rice Bowl",
      per100g: { kcal: 210, proteinG: 6, carbsG: 38, fatG: 3 },
    });
    if (!own) throw new Error("seed food refused");
    const usdaRice = searchUsdaReference("rice")[0]!;

    render(<NutritionPage />);
    const sheet = openSheet();
    fireEvent.change(within(sheet).getByLabelText("Search foods"), {
      target: { value: "rice" },
    });

    const usdaSection = within(sheet).getByLabelText("USDA reference foods");
    const row = usdaSection.querySelector("button.nut-food-row-main");
    expect(row).not.toBeNull();
    fireEvent.click(row!);
    /* The portion step names the dataset release the numbers came from. */
    expect(within(sheet).getByTestId("usda-data-stamp").textContent).toBe(
      usdaDataStamp(usdaRice),
    );

    fireEvent.click(within(sheet).getByRole("button", { name: "Back to search" }));
    fireEvent.click(within(sheet).getByRole("button", { name: /Homemade Rice Bowl/ }));
    /* An own food has no dataset version — no stamp, its badge already
       says whose value it is. */
    expect(within(sheet).queryByTestId("usda-data-stamp")).toBeNull();
  });

  it("shows the dataset version line in the picker search view (audit #29)", () => {
    render(<NutritionPage />);
    const sheet = openSheet();
    /* One line naming the exact dataset behind the reference values:
       dataset, licence, retrieval date and the short fingerprint. */
    expect(within(sheet).getByTestId("usda-dataset-version").textContent).toBe(
      usdaDatasetVersionLine(),
    );
    expect(usdaDatasetVersionLine()).toContain("USDA FoodData Central reference set");
    expect(usdaDatasetVersionLine()).toContain("fingerprint 7760eaf6");
  });

  it("preselects a default portion, so logging never needs an amount decision first", () => {
    seedOats();
    render(<NutritionPage />);
    const sheet = openSheet();
    fireEvent.click(within(sheet).getByRole("button", { name: /My Oats/ }));

    const chip = within(sheet).getByRole("button", { name: /1 bowl · 80 g/ });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    /* 80 g of 380 kcal/100 g = 304 kcal, previewed before logging —
       the N-UI portion step carries it in the submit button itself. */
    const submit = within(sheet).getByRole("button", {
      name: /Log to .* · 304 kcal/,
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it("logs from the sheet into the day view, with the entry's badge attached", () => {
    seedOats();
    render(<NutritionPage />);
    const sheet = openSheet();
    fireEvent.click(within(sheet).getByRole("button", { name: /My Oats/ }));
    fireEvent.click(within(sheet).getByRole("button", { name: /Log to / }));

    const today = todayLocal();
    const stored = readDayLog(today);
    expect(stored.entries).toHaveLength(1);
    expect(stored.entries[0]?.provenance.kind).toBe("user_entered");

    /* The day view shows the entry under its meal, badge attached. The
       meal is the sheet's time-of-day default, so read it off the stored
       entry rather than assuming an hour. */
    const mealSection = screen.getByLabelText(
      MEAL_LABEL[stored.entries[0]!.meal],
    ) as HTMLElement;
    expect(within(mealSection).getByText("My Oats")).toBeTruthy();
    expect(within(mealSection).getByTestId("provenance-badge").textContent).toBe("Your value");
    /* The prototype's row format: kcal · P · C · F (the meal header
       repeats the kcal as the meal's own summary). */
    expect(within(mealSection).getAllByText(/304 kcal/).length).toBeGreaterThan(0);
    expect(within(mealSection).getByText(/P 10\.4 C 48 F 5\.6/)).toBeTruthy();
  });
});

describe("NutritionPage — totals vs targets", () => {
  it("measures the day against the same target Trackers computes", () => {
    const profile = seedBodyProfile();
    const oats = seedOats();
    logDirect(oats, 100, todayLocal());
    const targets = bodyTargetsOf(profile, todayLocal());
    if (!targets) throw new Error("expected targets for the seeded profile");

    render(<NutritionPage />);
    expect(screen.getByText(`of ${fmtKcalApprox(targets.calories)}`)).toBeTruthy();
    expect(screen.getByText(/Targets are estimates/)).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Calories against target" })).toBeTruthy();
  });

  it("a safety refusal shows totals only — no target, no bar, no deficit framing", () => {
    seedBodyProfile();
    const blocked = emptyAssessmentState(NOW);
    blocked.answers = { ...EMPTY_ANSWERS, eatingDisorderHistory: true };
    setPref(ASSESSMENT_KEY, blocked);
    const oats = seedOats();
    logDirect(oats, 100, todayLocal());

    render(<NutritionPage />);
    /* The day's totals still show (hero centre, week average)… */
    expect(screen.getAllByText("380").length).toBeGreaterThan(0);
    /* …but nothing that frames them against a target. */
    expect(screen.queryByText(/of ~/)).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText(/doesn't set calorie targets/)).toBeTruthy();
  });

  it("an absence-only block (safety questions never answered) still falls back to Trackers' target", () => {
    const profile = seedBodyProfile();
    const unanswered = emptyAssessmentState(NOW);
    unanswered.answers = {
      ...EMPTY_ANSWERS,
      ageYears: 30,
      heightCm: 175,
      weightKg: 82,
      activity: "light",
      goal: "maintain",
      /* pregnantOrBreastfeeding / eatingDisorderHistory stay null —
         never asked, which the classifier blocks on as absence. */
    };
    setPref(ASSESSMENT_KEY, unanswered);
    const oats = seedOats();
    logDirect(oats, 100, todayLocal());
    const targets = bodyTargetsOf(profile, todayLocal());
    if (!targets) throw new Error("expected targets for the seeded profile");

    render(<NutritionPage />);
    expect(screen.getByText(`of ${fmtKcalApprox(targets.calories)}`)).toBeTruthy();
    expect(screen.queryByText(/doesn't set calorie targets/)).toBeNull();
  });

  it("with no body numbers, totals stand alone and the next step is named", () => {
    const oats = seedOats();
    logDirect(oats, 100, todayLocal());
    render(<NutritionPage />);
    expect(screen.queryByText(/of ~/)).toBeNull();
    expect(screen.getByText(/No target yet/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add them on Trackers" })).toBeTruthy();
  });
});

describe("NutritionPage — custom food form", () => {
  it("explains invalid values inline, field by field", () => {
    render(<NutritionPage />);
    const sheet = openSheet();
    fireEvent.click(within(sheet).getByRole("button", { name: "Add your own food" }));
    fireEvent.click(within(sheet).getByRole("button", { name: "Save & log it" }));

    expect(within(sheet).getByText(/Give the food a name/)).toBeTruthy();
    expect(within(sheet).getByText(/Energy: enter the number/)).toBeTruthy();

    fireEvent.change(within(sheet).getByLabelText("Name"), { target: { value: "Test Milk" } });
    fireEvent.change(within(sheet).getByLabelText("Energy (kcal)"), { target: { value: "60" } });
    fireEvent.change(within(sheet).getByLabelText("Protein (g)"), { target: { value: "250" } });
    fireEvent.change(within(sheet).getByLabelText("Carbs (g)"), { target: { value: "5" } });
    fireEvent.change(within(sheet).getByLabelText("Fat (g)"), { target: { value: "3" } });
    fireEvent.click(within(sheet).getByRole("button", { name: "Save & log it" }));
    expect(within(sheet).getByText(/Protein: per 100 g, this can't be over 100 g/)).toBeTruthy();
  });

  it("surfaces the full-list error honestly instead of dropping the food", () => {
    const many: Food[] = [];
    for (let i = 0; i < MAX_FOODS; i += 1) {
      const food = createCustomFood(
        { name: `Seed food ${i}`, per100g: { kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 } },
        `seed-${i}`,
      );
      if (!food) throw new Error("seed food refused");
      many.push(food);
    }
    setPref("health.foods.v1", foodsValueOf(many));

    render(<NutritionPage />);
    const sheet = openSheet();
    fireEvent.click(within(sheet).getByRole("button", { name: "Add your own food" }));
    fireEvent.change(within(sheet).getByLabelText("Name"), { target: { value: "One too many" } });
    fireEvent.change(within(sheet).getByLabelText("Energy (kcal)"), { target: { value: "60" } });
    fireEvent.change(within(sheet).getByLabelText("Protein (g)"), { target: { value: "3" } });
    fireEvent.change(within(sheet).getByLabelText("Carbs (g)"), { target: { value: "5" } });
    fireEvent.change(within(sheet).getByLabelText("Fat (g)"), { target: { value: "3" } });
    fireEvent.click(within(sheet).getByRole("button", { name: "Save & log it" }));

    expect(within(sheet).getByText(/Your food list is full/)).toBeTruthy();
  });
});

describe("NutritionPage — delete, undo, copy", () => {
  it("delete is undoable and restores the identical entry", () => {
    const oats = seedOats();
    const entry = logDirect(oats, 100, todayLocal());
    const before = readFoodLog();

    render(<NutritionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Remove My Oats" }));
    expect(readFoodLog()).toHaveLength(0);
    expect(screen.queryByText("My Oats")).toBeNull();

    fireEvent.click(within(screen.getByTestId("nutrition-undo")).getByRole("button", { name: /Undo/ }));
    expect(readFoodLog()).toEqual(before);
    expect(readFoodLog()[0]).toEqual(entry);
    expect(screen.getByText("My Oats")).toBeTruthy();
  });

  it("copy yesterday duplicates yesterday's entries into today under new ids", () => {
    const oats = seedOats();
    const yesterday = shiftDay(todayLocal(), -1);
    const original = logDirect(oats, 100, yesterday, "dinner");

    render(<NutritionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Copy yesterday's meals" }));

    const todayLog = readDayLog(todayLocal());
    expect(todayLog.entries).toHaveLength(1);
    expect(todayLog.entries[0]?.foodId).toBe(original.foodId);
    expect(todayLog.entries[0]?.nutrients).toEqual(original.nutrients);
    expect(todayLog.entries[0]?.id).not.toBe(original.id);
    expect(screen.getByText("My Oats")).toBeTruthy();
  });
});

describe("NutritionPage — food photographs & credits (P3-R)", () => {
  it("shows photographs on USDA results, and never on the user's own foods", () => {
    const own = saveCustomFood({
      name: "Farm Egg Scramble Mix",
      per100g: { kcal: 155, proteinG: 11, carbsG: 2, fatG: 11 },
    });
    if (!own) throw new Error("seed food refused");

    render(<NutritionPage />);
    const sheet = openSheet();
    fireEvent.change(within(sheet).getByLabelText("Search foods"), {
      target: { value: "egg" },
    });

    const usdaSection = within(sheet).getByLabelText("USDA reference foods");
    /* D4 + wide: picker rows render under the friendly display name
       (Hindi alongside); the photograph is its own button — it opens
       the lightbox — beside the row's choose button, never nested
       inside it. The row's photo is found by its alt, the friendly
       name, which is what this test is about. */
    const img = within(usdaSection).getByAltText("Egg");
    expect(img.classList.contains("nut-food-thumb")).toBe(true);
    expect(
      within(usdaSection).getByRole("button", { name: "View photo of Egg" }),
    ).toBeTruthy();

    const ownSection = within(sheet).getByLabelText("Your foods and recents");
    expect(ownSection.querySelectorAll("img.nut-food-thumb").length).toBe(0);
  });

  it("credits every shipped photograph from the manifest, with its Commons link", () => {
    render(<NutritionPage />);
    fireEvent.click(screen.getByRole("button", { name: "Photo credits" }));

    const dialog = screen.getByRole("dialog");
    const links = within(dialog).getAllByRole("link", {
      name: /View on Wikimedia Commons/,
    });
    expect(links.length).toBe(FOOD_PHOTO_CREDITS.length);

    const first = FOOD_PHOTO_CREDITS[0]!;
    expect(within(dialog).getByText(first.foodName)).toBeTruthy();
    expect(dialog.textContent).toContain(first.author);
    expect(dialog.textContent).toContain(first.license);
    expect(links.map((l) => l.getAttribute("href"))).toContain(first.pageUrl);
  });
});
