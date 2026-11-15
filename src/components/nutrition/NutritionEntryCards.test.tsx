// @vitest-environment jsdom
/**
 * Nutrition's two doors (Today band + Profile card): with food logged
 * they show today's kcal against the target; without, they invite. Both
 * read the real prefs document through the real lib.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

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
import { todayLocal } from "@/lib/localDay";
import { BODY_KEY, DEFAULT_BODY, bodyTargetsOf, type BodyProfile } from "@/lib/health/body";
import { createEntryFromFood, logEntry, saveCustomFood } from "@/lib/nutrition";
import { NutritionProfileCard, NutritionTodayCard } from "./NutritionEntryCards";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  resetPrefCache();
});

function seedBodyProfile(): BodyProfile {
  const profile: BodyProfile = {
    ...DEFAULT_BODY,
    heightCm: 175,
    weightKg: 82,
    age: 30,
    sex: "female",
    activity: "light",
    goal: "maintain",
    updatedAt: "2026-11-15T08:00:00.000Z",
  };
  setPref(BODY_KEY, profile);
  return profile;
}

function seedLoggedOats() {
  const food = saveCustomFood({
    name: "My Oats",
    per100g: { kcal: 380, proteinG: 13, carbsG: 60, fatG: 7 },
  });
  if (!food) throw new Error("seed food refused");
  const entry = createEntryFromFood({
    food,
    amount: { grams: 100 },
    meal: "breakfast",
    day: todayLocal(),
    source: "search",
    now: "2026-11-15T08:30:00.000Z",
  });
  if (!entry) throw new Error("seed entry refused");
  logEntry(entry);
}

describe("NutritionTodayCard", () => {
  it("invites when nothing is logged yet", () => {
    render(<NutritionTodayCard />);
    expect(screen.getByText("What did you eat today?")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Log food" });
    expect(link.getAttribute("href")).toBe("/nutrition");
  });

  it("shows today's kcal against the target once food is logged", () => {
    const profile = seedBodyProfile();
    seedLoggedOats();
    const targets = bodyTargetsOf(profile, todayLocal());
    if (!targets) throw new Error("expected targets");
    render(<NutritionTodayCard />);
    expect(
      screen.getByText(`380 of your ~${targets.calories} kcal target`),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Nutrition" })).toBeTruthy();
  });
});

describe("NutritionProfileCard", () => {
  it("renders the invitation state and the door to the tab", () => {
    render(<NutritionProfileCard />);
    expect(screen.getByText("Food & your target")).toBeTruthy();
    expect(screen.getByText(/Nothing logged today yet/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Log your first food" })).toBeTruthy();
  });

  it("summarises today once food is logged", () => {
    seedBodyProfile();
    seedLoggedOats();
    render(<NutritionProfileCard />);
    expect(screen.getByText(/Today: 380 kcal · 13 g protein · 1 food logged/)).toBeTruthy();
  });
});
