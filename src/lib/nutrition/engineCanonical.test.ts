import { describe, expect, it } from "vitest";

import {
  canonicalOutcome,
  planOutcomeHash,
  stableStringify,
} from "@/lib/nutrition/engineCanonical";

const planA = {
  ok: true,
  plan: {
    id: "plan-1",
    generatedAt: "2026-11-28T04:00:00.000Z",
    day: "2026-11-28",
    methodVersion: 16,
    targets: { kcal: 1350, proteinG: 112 },
    meals: [
      {
        meal: "lunch",
        kcal: 540.00001,
        dishes: [{ dishId: "d1", servings: 1.5 }],
        suggestions: [],
      },
    ],
  },
};

describe("engineCanonical", () => {
  it("ignores the plan id and generatedAt stamps", async () => {
    const other = {
      ...planA,
      plan: { ...planA.plan, id: "plan-2", generatedAt: "2026-11-28T09:30:00.000Z" },
    };
    expect(await planOutcomeHash(planA)).toBe(await planOutcomeHash(other));
  });

  it("changes when a real field changes", async () => {
    const other = {
      ...planA,
      plan: {
        ...planA.plan,
        meals: [{ ...planA.plan.meals[0], dishes: [{ dishId: "d2", servings: 1.5 }] }],
      },
    };
    expect(await planOutcomeHash(planA)).not.toBe(await planOutcomeHash(other));
  });

  it("rounds away sub-1e-4 serialization noise", () => {
    const noisy = {
      ...planA,
      plan: {
        ...planA.plan,
        meals: [{ ...planA.plan.meals[0], kcal: 540.00004 }],
      },
    };
    expect(stableStringify(canonicalOutcome(noisy))).toBe(
      stableStringify(canonicalOutcome(planA)),
    );
  });

  it("hashes refusals as first-class outcomes", async () => {
    const refusal = { ok: false, refusal: { kind: "safety_blocked" } };
    const other = { ok: false, refusal: { kind: "no_targets" } };
    expect(await planOutcomeHash(refusal)).not.toBe(await planOutcomeHash(other));
    expect(await planOutcomeHash(refusal)).toBe(
      await planOutcomeHash({ ok: false, refusal: { kind: "safety_blocked" } }),
    );
  });

  it("is key-order independent", () => {
    const a = { ok: false, refusal: { kind: "x", missing: ["a"] } };
    const b = { refusal: { missing: ["a"], kind: "x" }, ok: false };
    expect(stableStringify(canonicalOutcome(a))).toBe(
      stableStringify(canonicalOutcome(b)),
    );
  });
});
