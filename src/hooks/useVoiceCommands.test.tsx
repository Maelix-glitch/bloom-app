// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveVoiceIntent, useVoiceCommands, type VoiceActionDeps } from "./useVoiceCommands";
import type { Food } from "@/lib/nutrition/types";

/* The four stores + router are mocked at the module boundary: these
   tests pin the voice layer's own contract — resolution honesty and
   the confirm gate — not the stores (each has its own suite). */

const toggle = vi.fn();
const saveDay = vi.fn((_draft: unknown) => ({ ok: true as const, errors: {} }));
const logWeight = vi.fn();
const logFood = vi.fn(() => ({ id: "entry-1" }));
const navigate = vi.fn();

const egg: Food = {
  id: "egg-1",
  name: "Egg",
  per100g: { kcal: 155 } as Food["per100g"],
  servings: [{ label: "1 large egg", grams: 50 }],
  provenance: { kind: "usda", sourceId: "171287", label: "USDA FoodData Central" } as Food["provenance"],
};
const mystery: Food = { ...egg, id: "m-1", name: "Mystery Mix", servings: [] };

vi.mock("@/hooks/useHabits", () => ({
  useHabits: () => ({
    habits: [{ id: "h-gym", name: "Gym", archived: false }],
    toggle,
  }),
}));
vi.mock("@/hooks/useTrackers", () => ({
  useTrackers: () => ({
    days: [],
    today: "2026-11-18",
    saveDay,
  }),
}));
vi.mock("@/hooks/useBodyProfile", () => ({
  useBodyProfile: () => ({ logWeight }),
}));
vi.mock("@/hooks/useNutrition", () => ({
  useNutrition: () => ({ foods: [egg, mystery], logFood }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

beforeEach(() => {
  vi.clearAllMocks();
  saveDay.mockReturnValue({ ok: true, errors: {} });
  logFood.mockReturnValue({ id: "entry-1" });
});

describe("resolveVoiceIntent — honesty", () => {
  const deps = (): VoiceActionDeps => ({
    habits: [{ id: "h-gym", name: "Gym" }],
    toggleHabit: vi.fn(),
    foods: [egg, mystery],
    logFood: vi.fn(() => null),
    addWater: vi.fn(() => null),
    logWeight: vi.fn(),
    navigateTo: vi.fn(),
    defaultMeal: "lunch",
  });

  it("an unmatched habit name is a no-action naming what was heard", () => {
    const r = resolveVoiceIntent({ kind: "tick-habit", heardName: "swimming" }, deps());
    expect(r.type).toBe("no-action");
    if (r.type === "no-action") expect(r.message).toContain("swimming");
  });

  it("water with no amount is a no-action — no amount is invented", () => {
    const d = deps();
    const r = resolveVoiceIntent({ kind: "log-water" }, d);
    expect(r.type).toBe("no-action");
    expect(d.addWater).not.toHaveBeenCalled();
  });

  it("a food with no serving size is a no-action", () => {
    const r = resolveVoiceIntent({ kind: "log-food", heardName: "mystery mix" }, deps());
    expect(r.type).toBe("no-action");
  });

  it("resolution itself NEVER runs the action", () => {
    const d = deps();
    const r = resolveVoiceIntent({ kind: "tick-habit", heardName: "gym" }, d);
    expect(r.type).toBe("action");
    expect(d.toggleHabit).not.toHaveBeenCalled();
    if (r.type === "action") {
      expect(r.label).toBe('Mark "Gym" done?');
      r.run();
      expect(d.toggleHabit).toHaveBeenCalledWith("h-gym");
    }
  });

  it("a food label states count, serving and meal before anything logs", () => {
    const r = resolveVoiceIntent({ kind: "log-food", heardName: "eggs", count: 2 }, deps());
    if (r.type === "action") expect(r.label).toBe("Log Egg × 2 (1 large egg) for lunch?");
    else throw new Error("expected an action");
  });
});

describe("useVoiceCommands — the confirm gate", () => {
  it("hear() alone executes NOTHING; confirm() runs the real action once", () => {
    const { result } = renderHook(() => useVoiceCommands());
    act(() => result.current.hear("mark gym done"));
    expect(result.current.state.phase).toBe("confirm");
    expect(toggle).not.toHaveBeenCalled();
    act(() => result.current.confirm());
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(toggle.mock.calls[0]![0]).toBe("h-gym");
    expect(result.current.state.phase).toBe("done");
  });

  it("dismiss() after hear() leaves nothing executed and nothing pending", () => {
    const { result } = renderHook(() => useVoiceCommands());
    act(() => result.current.hear("drank 500 ml water"));
    expect(result.current.state.phase).toBe("confirm");
    act(() => result.current.dismiss());
    act(() => result.current.confirm());
    expect(saveDay).not.toHaveBeenCalled();
    expect(result.current.state.phase).toBe("idle");
  });

  it("an unknown transcript becomes a notice, never an action", () => {
    const { result } = renderHook(() => useVoiceCommands());
    act(() => result.current.hear("blah blah blah"));
    expect(result.current.state.phase).toBe("notice");
    expect(toggle).not.toHaveBeenCalled();
    expect(saveDay).not.toHaveBeenCalled();
  });

  it("a confirmed water log adds to today's water through saveDay", () => {
    const { result } = renderHook(() => useVoiceCommands());
    act(() => result.current.hear("two glasses of water"));
    act(() => result.current.confirm());
    expect(saveDay).toHaveBeenCalledTimes(1);
    const draft = saveDay.mock.calls[0]![0] as unknown as { date: string; waterMl: number };
    expect(draft.date).toBe("2026-11-18");
    expect(draft.waterMl).toBe(500);
  });

  it("a confirmed weight log calls logWeight with the heard kg", () => {
    const { result } = renderHook(() => useVoiceCommands());
    act(() => result.current.hear("my weight is 82"));
    act(() => result.current.confirm());
    expect(logWeight).toHaveBeenCalledWith(82);
  });

  it("a confirmed food log calls logFood with servings of the food's own serving", () => {
    const { result } = renderHook(() => useVoiceCommands());
    act(() => result.current.hear("log two eggs"));
    act(() => result.current.confirm());
    expect(logFood).toHaveBeenCalledTimes(1);
    const [food, amount] = logFood.mock.calls[0]! as unknown as [Food, { servings: number; servingLabel: string }];
    expect(food.id).toBe("egg-1");
    expect(amount).toEqual({ servings: 2, servingLabel: "1 large egg" });
  });
});
