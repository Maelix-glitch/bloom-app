/**
 * vitalis-core — the deliberation checks, the proposal allowlist and
 * the record schema, tested behaviourally against the same pure
 * module the edge function bundles. If a check can be fooled, it
 * should fail HERE, not in production.
 */

import { describe, expect, it } from "vitest";

import {
  COACH_ASSESSMENT_DIGEST_CAP,
  coachAssessmentSection,
  DeliberationUnavailable,
  checkEnjoyment,
  checkRules,
  extractClaimedNumbers,
  looksLikePlanRequest,
  parseActionBlocks,
  runDeliberation,
  sanitizeProposals,
  validateProposal,
  validateVitalisRecord,
  verifyNumbers,
  type DeliberationDeps,
  type DeliberationStageId,
  type VitalisRecordData,
} from "../../../supabase/functions/coach/vitalis-core";

function record(overrides: Partial<VitalisRecordData> = {}): VitalisRecordData {
  return {
    v: 1,
    pattern: "eggetarian",
    allergies: ["peanut"],
    dislikes: ["mushroom"],
    intolerances: [],
    safety: {
      pregnantOrBreastfeeding: false,
      eatingDisorderHistory: false,
      takesMedication: false,
      unexplainedWeightChange: false,
      conditions: [],
      symptoms: [],
    },
    targets: { kcal: 3288, proteinG: 220 },
    targetsBlocked: false,
    plan: null,
    todayTotals: { kcal: 1210, proteinG: 121, carbsG: 130, fatG: 40 },
    dishes: [
      { id: "dish-paneer", name: "Paneer Bhurji", kcal: 420, proteinG: 28 },
      { id: "dish-quinoa", name: "Quinoa Buddha Bowl", kcal: 510, proteinG: 19 },
    ],
    foods: [{ id: "food-whey", name: "Whey Protein Isolate", kcalPer100g: 400, proteinPer100g: 80 }],
    loggedNames: ["Paneer Bhurji"],
    ...overrides,
  };
}

const CTX =
  "Your targets: about 3,288 kcal and 220 g protein a day. Eaten so far today: 1,210 kcal · 121 g protein (55% of the protein target). Paneer Bhurji — 420 kcal · 28 g protein.";

/* ------------------------------ schema ------------------------------ */

describe("validateVitalisRecord", () => {
  it("accepts the builder's shape", () => {
    expect(validateVitalisRecord(record()).ok).toBe(true);
  });

  it("rejects non-objects, wrong versions and missing fields", () => {
    expect(validateVitalisRecord(null).ok).toBe(false);
    expect(validateVitalisRecord("record").ok).toBe(false);
    expect(validateVitalisRecord({ ...record(), v: 2 }).ok).toBe(false);
    const missing = { ...record() } as Record<string, unknown>;
    delete missing["dishes"];
    expect(validateVitalisRecord(missing).ok).toBe(false);
  });

  it("rejects wrong-typed fields — a present-but-malformed record is forgery-shaped", () => {
    expect(validateVitalisRecord({ ...record(), allergies: "peanut" }).ok).toBe(false);
    expect(validateVitalisRecord({ ...record(), targets: { kcal: "lots" } }).ok).toBe(false);
    expect(
      validateVitalisRecord({
        ...record(),
        safety: { ...record().safety, pregnantOrBreastfeeding: "yes" },
      }).ok,
    ).toBe(false);
    expect(
      validateVitalisRecord({
        ...record(),
        dishes: [{ id: "x", name: "Y", kcal: "many", proteinG: 1 }],
      }).ok,
    ).toBe(false);
    expect(validateVitalisRecord({ ...record(), todayTotals: null }).ok).toBe(false);
  });
});

/* --------------------------- number checks --------------------------- */

describe("number verification", () => {
  it("extracts unit-anchored claims and meaningful bare numbers only", () => {
    const claims = extractClaimedNumbers(
      "Have 420 kcal and 28 g at 7 pm, about 55% — aim for 3,288 kcal.",
    );
    const values = claims.map((c) => c.value);
    expect(values).toContain(420);
    expect(values).toContain(28);
    expect(values).toContain(55);
    expect(values).toContain(3288);
    expect(values).not.toContain(7);
  });

  it("passes numbers the record actually carries", () => {
    const failures = verifyNumbers(
      "Paneer Bhurji gives you 420 kcal and 28 g protein — you're at 55% of your protein target.",
      record(),
      CTX,
    );
    expect(failures).toEqual([]);
  });

  it("flags an invented number", () => {
    const failures = verifyNumbers(
      "Add a shake for 999 kcal and you'll hit 450 g protein.",
      record(),
      CTX,
    );
    expect(failures.map((f) => f.detail).join(" ")).toContain("999");
    expect(failures.map((f) => f.detail).join(" ")).toContain("450");
    expect(failures.every((f) => f.kind === "number")).toBe(true);
  });

  it("flags a subtly wrong number, not just wild ones", () => {
    const failures = verifyNumbers("Your target is 2,900 kcal a day.", record(), CTX);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.kind).toBe("number");
  });
});

/* ----------------------------- rule checks ---------------------------- */

describe("rule checks", () => {
  const rules = (prose: string, rec: VitalisRecordData, msg = "dinner ideas?") =>
    checkRules(prose, [], rec, msg);

  it("an allergen in the draft fails the check", () => {
    const failures = rules("Finish with a peanut satay drizzle.", record());
    expect(failures.some((f) => f.kind === "allergen")).toBe(true);
  });

  it("a disliked food in the draft fails the check", () => {
    const failures = rules("A mushroom stir-fry would suit tonight.", record());
    expect(failures.some((f) => f.kind === "dislike")).toBe(true);
  });

  it("meat in a draft for an eggetarian fails the pattern check", () => {
    const failures = rules("Grilled chicken with rice is an easy win.", record());
    expect(failures.some((f) => f.kind === "pattern")).toBe(true);
  });

  it("a clean draft passes", () => {
    expect(rules("Paneer Bhurji with roti keeps tonight simple.", record())).toEqual([]);
  });

  it("deficit framing is refused when pregnancy is on the record", () => {
    const pregnant = record({
      safety: { ...record().safety, pregnantOrBreastfeeding: true },
    });
    const failures = rules("Stay in a calorie deficit this week.", pregnant, "how do I lose weight?");
    expect(failures.some((f) => f.kind === "safety-framing")).toBe(true);
  });

  it("deficit framing is refused with an eating-disorder history", () => {
    const ed = record({ safety: { ...record().safety, eatingDisorderHistory: true } });
    const failures = rules("A small calorie deficit will do it.", ed, "tips?");
    expect(failures.some((f) => f.kind === "safety-framing")).toBe(true);
  });

  it("diagnosing the person fails the check", () => {
    const failures = rules("You have diabetes, so avoid rice.", record(), "can I eat rice?");
    expect(failures.some((f) => f.kind === "diagnosis")).toBe(true);
  });

  it("red-flag symptoms in the ask require a clinician direction", () => {
    const bare = rules("Eat something light and rest.", record(), "I get chest pain after meals");
    expect(bare.some((f) => f.kind === "red-flag")).toBe(true);
    const directed = rules(
      "Please see a clinician about that soon — it needs a person, not an app.",
      record(),
      "I get chest pain after meals",
    );
    expect(directed).toEqual([]);
  });
});

/* --------------------------- enjoyment check -------------------------- */

describe("enjoyment check", () => {
  it("revises when the draft ignores everything the person actually logs", () => {
    const failure = checkEnjoyment("The Quinoa Buddha Bowl is perfect tonight.", record());
    expect(failure?.kind).toBe("enjoyment");
  });

  it("passes when the draft names a logged favourite", () => {
    expect(checkEnjoyment("Paneer Bhurji again tonight keeps it easy.", record())).toBeNull();
  });

  it("never revises when the record shows no logging history", () => {
    expect(checkEnjoyment("Anything at all.", record({ loggedNames: [] }))).toBeNull();
  });
});

/* ------------------------------ proposals ----------------------------- */

describe("action proposals", () => {
  it("parses a fenced block and strips it from the shown text", () => {
    const draft =
      "Shall I log it?\n\n```bloom-action\n{\"action\":\"log_dish\",\"dishId\":\"dish-paneer\",\"meal\":\"dinner\"}\n```";
    const { prose, rawProposals, malformedBlocks } = parseActionBlocks(draft);
    expect(rawProposals).toHaveLength(1);
    expect(malformedBlocks).toBe(0);
    expect(prose).not.toContain("bloom-action");
    expect(prose).toContain("Shall I log it?");
  });

  it("counts malformed JSON as malformed and strips the block anyway", () => {
    const { prose, rawProposals, malformedBlocks } = parseActionBlocks(
      "Text.\n```bloom-action\n{not json}\n```",
    );
    expect(rawProposals).toHaveLength(0);
    expect(malformedBlocks).toBe(1);
    expect(prose).not.toContain("bloom-action");
  });

  it("accepts each allowlisted action with a valid payload", () => {
    const rec = record();
    expect(validateProposal({ action: "log_dish", dishId: "dish-paneer", meal: "dinner" }, rec).ok).toBe(true);
    expect(validateProposal({ action: "log_food", foodId: "food-whey", grams: 30, meal: "snack" }, rec).ok).toBe(true);
    expect(validateProposal({ action: "compose_plan" }, rec).ok).toBe(true);
    expect(
      validateProposal({ action: "propose_assessment_change", field: "goal", value: "maintain" }, rec).ok,
    ).toBe(true);
    expect(
      validateProposal({ action: "propose_assessment_change", field: "foodBudget", value: null }, rec).ok,
    ).toBe(true);
  });

  it("swap_dish: a plan dish may be swapped for a suitable record dish", () => {
    const rec = record({
      plan: {
        day: "2026-11-17",
        kcal: 3288,
        proteinG: 220,
        meals: [
          { meal: "dinner", kcal: 1100, proteinG: 73, items: ["Paneer Bhurji (dish)"], dishIds: ["dish-paneer"] },
        ],
      },
    });
    expect(
      validateProposal(
        { action: "swap_dish", meal: "dinner", fromDishId: "dish-paneer", toDishId: "dish-quinoa" },
        rec,
      ).ok,
    ).toBe(true);
  });

  it("swap_dish: refuses swaps the plan or the record cannot support", () => {
    const rec = record({
      plan: {
        day: "2026-11-17",
        kcal: 3288,
        proteinG: 220,
        meals: [
          { meal: "dinner", kcal: 1100, proteinG: 73, items: ["Paneer Bhurji (dish)"], dishIds: ["dish-paneer"] },
        ],
      },
    });
    /* the from-dish is not in that meal */
    expect(
      validateProposal(
        { action: "swap_dish", meal: "dinner", fromDishId: "dish-quinoa", toDishId: "dish-paneer" },
        rec,
      ).ok,
    ).toBe(false);
    /* the meal is not in the plan */
    expect(
      validateProposal(
        { action: "swap_dish", meal: "lunch", fromDishId: "dish-paneer", toDishId: "dish-quinoa" },
        rec,
      ).ok,
    ).toBe(false);
    /* the replacement is outside the record's suitable dishes */
    expect(
      validateProposal(
        { action: "swap_dish", meal: "dinner", fromDishId: "dish-paneer", toDishId: "dish-forged" },
        rec,
      ).ok,
    ).toBe(false);
    /* a dish cannot be swapped for itself */
    expect(
      validateProposal(
        { action: "swap_dish", meal: "dinner", fromDishId: "dish-paneer", toDishId: "dish-paneer" },
        rec,
      ).ok,
    ).toBe(false);
    /* no plan at all */
    expect(
      validateProposal(
        { action: "swap_dish", meal: "dinner", fromDishId: "dish-paneer", toDishId: "dish-quinoa" },
        record(),
      ).ok,
    ).toBe(false);
  });

  it("refuses a forged habit action — and every other non-allowlisted shape", () => {
    const rec = record();
    expect(validateProposal({ action: "create_habit", name: "Run" }, rec).ok).toBe(false);
    expect(validateProposal({ action: "log_mood", value: 3 }, rec).ok).toBe(false);
    expect(validateProposal({ action: "award_points", points: 500 }, rec).ok).toBe(false);
    expect(validateProposal({ action: "update_profile", name: "X" }, rec).ok).toBe(false);
  });

  it("refuses ids the record does not carry and out-of-range payloads", () => {
    const rec = record();
    expect(validateProposal({ action: "log_dish", dishId: "dish-forged", meal: "dinner" }, rec).ok).toBe(false);
    expect(validateProposal({ action: "log_food", foodId: "food-whey", grams: 5000, meal: "snack" }, rec).ok).toBe(false);
    expect(validateProposal({ action: "log_dish", dishId: "dish-paneer", meal: "brunch" }, rec).ok).toBe(false);
    expect(
      validateProposal({ action: "propose_assessment_change", field: "name", value: "X" }, rec).ok,
    ).toBe(false);
    expect(
      validateProposal({ action: "propose_assessment_change", field: "foodBudget", value: 5 }, rec).ok,
    ).toBe(false);
  });

  it("sanitizeProposals keeps the valid and counts the forged", () => {
    const { proposals, invalidCount } = sanitizeProposals(
      [
        { action: "compose_plan" },
        { action: "delete_account" },
        { action: "log_dish", dishId: "dish-paneer", meal: "lunch" },
        "garbage",
      ],
      record(),
    );
    expect(proposals.map((p) => p.action)).toEqual(["compose_plan", "log_dish"]);
    expect(invalidCount).toBe(2);
  });
});

/* ---------------------------- deliberation ---------------------------- */

function scripted(drafts: (string | null)[]) {
  let i = 0;
  return {
    callModel: async (_system: string, _turns: unknown) =>
      drafts[Math.min(i++, drafts.length - 1)] ?? null,
    calls: () => i,
  };
}

function deps(drafts: (string | null)[], onStage?: (stage: string) => void) {
  const s = scripted(drafts);
  const args: DeliberationDeps = {
    callModel: s.callModel,
    draftSystem: "SYS",
    reviseSystem: "SYS",
    turns: [{ role: "user", content: "dinner?" }],
    record: record(),
    contextText: CTX,
    userMessage: "dinner?",
    ...(onStage ? { onStage: (stage: DeliberationStageId) => onStage(stage) } : {}),
  };
  return { args, calls: s.calls };
}

describe("runDeliberation", () => {
  it("accepts a clean first draft in one round", async () => {
    const { args } = deps(["Paneer Bhurji gives 420 kcal and 28 g protein."]);
    const outcome = await runDeliberation(args);
    expect(outcome.fellBack).toBe(false);
    expect(outcome.revised).toBe(0);
    expect(outcome.paragraphs.join(" ")).toContain("420 kcal");
    expect(outcome.stages.map((s) => s.stage)).toEqual([
      "drafting",
      "verifying",
      "rules",
      "enjoyment",
    ]);
  });

  it("revises an invented number away", async () => {
    const { args, calls } = deps([
      "A shake adds 999 kcal — easy.",
      "Paneer Bhurji gives 420 kcal and 28 g protein.",
    ]);
    const outcome = await runDeliberation(args);
    expect(calls()).toBe(2);
    expect(outcome.revised).toBe(1);
    expect(outcome.fellBack).toBe(false);
    expect(outcome.paragraphs.join(" ")).not.toContain("999");
  });

  it("removes an allergen through the revise loop", async () => {
    const { args } = deps([
      "Finish it with a peanut drizzle for crunch.",
      "Paneer Bhurji with roti keeps tonight simple and safe.",
    ]);
    const outcome = await runDeliberation(args);
    expect(outcome.fellBack).toBe(false);
    expect(outcome.paragraphs.join(" ").toLowerCase()).not.toContain("peanut");
  });

  it("falls back honestly after the bounded revises run out", async () => {
    const { args, calls } = deps([
      "Try 999 kcal of anything.",
      "Still 888 kcal, trust me.",
      "And 777 kcal more.",
    ]);
    const outcome = await runDeliberation(args);
    expect(calls()).toBe(3); /* draft + max 2 revises */
    expect(outcome.fellBack).toBe(true);
    const text = outcome.paragraphs.join(" ");
    expect(text).toContain("couldn't verify");
    expect(text).toContain("don't appear anywhere in your record");
    expect(text).not.toContain("999");
    expect(text).not.toContain("888");
    expect(text).not.toContain("777");
  });

  it("throws DeliberationUnavailable when no draft can be produced at all", async () => {
    const { args } = deps([null]);
    await expect(runDeliberation(args)).rejects.toBeInstanceOf(DeliberationUnavailable);
  });

  it("carries validated proposals out and strips the block from the prose", async () => {
    const draft =
      "Paneer Bhurji fits tonight. Shall I log it?\n\n```bloom-action\n{\"action\":\"log_dish\",\"dishId\":\"dish-paneer\",\"meal\":\"dinner\"}\n```";
    const { args } = deps([draft]);
    const outcome = await runDeliberation(args);
    expect(outcome.actions).toEqual([{ action: "log_dish", dishId: "dish-paneer", meal: "dinner" }]);
    expect(outcome.paragraphs.join(" ")).not.toContain("bloom-action");
    expect(outcome.invalidProposals).toBe(0);
  });

  it("a forged proposal forces revises, then the honest fallback counts it", async () => {
    const draft =
      "Paneer Bhurji fits tonight.\n\n```bloom-action\n{\"action\":\"create_habit\",\"name\":\"Run\"}\n```";
    const { args, calls } = deps([draft]);
    const outcome = await runDeliberation(args);
    expect(calls()).toBe(3);
    expect(outcome.fellBack).toBe(true);
    expect(outcome.actions).toEqual([]);
    expect(outcome.invalidProposals).toBe(1);
  });

  it("a forged proposal revised away cleanly is accepted with no strike signal", async () => {
    const bad =
      "Paneer Bhurji fits tonight.\n\n```bloom-action\n{\"action\":\"create_habit\",\"name\":\"Run\"}\n```";
    const good = "Paneer Bhurji fits tonight — 420 kcal and 28 g protein.";
    const { args } = deps([bad, good]);
    const outcome = await runDeliberation(args);
    expect(outcome.fellBack).toBe(false);
    expect(outcome.revised).toBe(1);
    expect(outcome.invalidProposals).toBe(0);
  });

  it("reports stages through onStage in pipeline order, ending at done", async () => {
    const seen: string[] = [];
    const { args } = deps(
      ["999 kcal of anything.", "420 kcal of Paneer Bhurji."],
      (stage) => seen.push(stage),
    );
    await runDeliberation(args);
    expect(seen[0]).toBe("drafting");
    expect(seen).toContain("revising");
    expect(seen[seen.length - 1]).toBe("done");
  });
});

/* ------------------------------ intent gate ---------------------------- */

describe("looksLikePlanRequest", () => {
  it("flags plan and recommendation intent", () => {
    expect(looksLikePlanRequest("Build me a plan for today")).toBe(true);
    expect(looksLikePlanRequest("What should I eat for dinner?")).toBe(true);
    expect(looksLikePlanRequest("Suggest a high-protein breakfast")).toBe(true);
    expect(looksLikePlanRequest("Recommend something for lunch")).toBe(true);
  });

  it("leaves ordinary questions on the fast path", () => {
    expect(looksLikePlanRequest("How much protein have I had today?")).toBe(false);
    expect(looksLikePlanRequest("What is in my assessment?")).toBe(false);
    expect(looksLikePlanRequest("Why is protein important?")).toBe(false);
  });
});

describe("coachAssessmentSection — the Coach's Assessment fold", () => {
  const DIGEST = "Assessment completed on 2026-11-02.\nGoal: Build strength and muscle.\nAllergies: peanut.";

  it("folds a provided digest into a section carrying the digest verbatim", () => {
    const section = coachAssessmentSection(DIGEST);
    expect(section).not.toBeNull();
    expect(section!.startsWith("FROM THEIR ASSESSMENT\n")).toBe(true);
    expect(section).toContain(DIGEST);
    /* The discipline the Coach answers under: only what is written. */
    expect(section).toContain("Never state anything about their assessment beyond what is written here");
  });

  it("is omitted — null — when no digest was provided", () => {
    expect(coachAssessmentSection(undefined)).toBeNull();
    expect(coachAssessmentSection(null)).toBeNull();
    expect(coachAssessmentSection("")).toBeNull();
    expect(coachAssessmentSection("   \n  ")).toBeNull();
  });

  it("refuses non-string payloads rather than stringifying them", () => {
    expect(coachAssessmentSection(42)).toBeNull();
    expect(coachAssessmentSection({ digest: DIGEST })).toBeNull();
    expect(coachAssessmentSection([DIGEST])).toBeNull();
  });

  it("caps an overlong digest at the section cap", () => {
    const huge = `Goal: gain. ${"x".repeat(COACH_ASSESSMENT_DIGEST_CAP * 3)}`;
    const section = coachAssessmentSection(huge)!;
    expect(section).not.toBeNull();
    expect(section.length).toBeLessThan(COACH_ASSESSMENT_DIGEST_CAP + 400);
    expect(section).toContain("Goal: gain.");
  });
});
