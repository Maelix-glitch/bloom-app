/**
 * askVitalis, phases 3–5: the deliberation flag routes to the
 * streaming transport with the structured record attached; the fast
 * path keeps riding askEdge and now carries the record too; whatever
 * proposals come back are re-validated against the caller's own
 * record before the window can render them.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VitalisRecordData } from "../../../supabase/functions/coach/vitalis-core";

const hoisted = vi.hoisted(() => ({
  askEdge: vi.fn(),
  streamVitalis: vi.fn(),
}));

vi.mock("@/lib/coach/edge", () => ({
  COACH_FUNCTION: "coach",
  askEdge: hoisted.askEdge,
}));

vi.mock("@/lib/vitalis-ai/stream", () => ({
  streamVitalis: hoisted.streamVitalis,
  DELIBERATION_TIMEOUT_MS: 125_000,
}));

import { askVitalis, isDeliberationIntent } from "./client";

const RECORD: VitalisRecordData = {
  v: 1,
  pattern: "eggetarian",
  allergies: [],
  dislikes: [],
  intolerances: [],
  safety: {
    pregnantOrBreastfeeding: null,
    eatingDisorderHistory: null,
    takesMedication: null,
    unexplainedWeightChange: null,
    conditions: [],
    symptoms: [],
  },
  targets: { kcal: 3288, proteinG: 220 },
  targetsBlocked: false,
  plan: null,
  todayTotals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  dishes: [{ id: "dish-1", name: "Paneer Bhurji", kcal: 420, proteinG: 28 }],
  foods: [],
  loggedNames: [],
};

beforeEach(() => {
  hoisted.askEdge.mockReset();
  hoisted.streamVitalis.mockReset();
});

describe("askVitalis — deliberation transport", () => {
  it("routes a flagged request to the stream with the record attached", async () => {
    const stages: string[] = [];
    hoisted.streamVitalis.mockImplementation(
      async (_request: unknown, onStage: (s: { stage: string; label: string }) => void) => {
        onStage({ stage: "drafting", label: "Drafting your answer" });
        onStage({ stage: "verifying", label: "Checking every number against your record" });
        return {
          ok: true,
          paragraphs: ["Here is your plan."],
          actions: [],
          stages: [
            { stage: "drafting", ms: 900 },
            { stage: "verifying", ms: 12 },
          ],
          locked: false,
          deliberated: true,
        };
      },
    );

    const reply = await askVitalis({
      text: "Build me a plan for today",
      history: [],
      contextText: "RECORD",
      record: RECORD,
      deliberate: true,
      onStage: (s) => stages.push(s.stage),
    });

    expect(hoisted.askEdge).not.toHaveBeenCalled();
    const request = hoisted.streamVitalis.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request["mode"]).toBe("vitalis");
    expect(request["deliberate"]).toBe(true);
    expect(request["vitalisRecord"]).toEqual(RECORD);
    expect(request["vitalisContext"]).toBe("RECORD");
    expect(stages).toEqual(["drafting", "verifying"]);
    expect(reply.deliberated).toBe(true);
    expect(reply.stages).toHaveLength(2);
  });

  it("drops forged proposals from a streamed reply before returning them", async () => {
    hoisted.streamVitalis.mockResolvedValue({
      ok: true,
      paragraphs: ["Done."],
      actions: [
        { action: "create_habit", name: "Run" },
        { action: "log_dish", dishId: "dish-1", meal: "dinner" },
        { action: "log_dish", dishId: "dish-forged", meal: "dinner" },
      ],
      stages: [],
      locked: false,
      deliberated: true,
    });
    const reply = await askVitalis({
      text: "Plan my dinner",
      history: [],
      contextText: "RECORD",
      record: RECORD,
      deliberate: true,
    });
    expect(reply.actions).toEqual([{ action: "log_dish", dishId: "dish-1", meal: "dinner" }]);
  });

  it("surfaces the lock from a streamed reply", async () => {
    hoisted.streamVitalis.mockResolvedValue({
      ok: true,
      paragraphs: ["Vitalis is paused for now."],
      actions: [],
      stages: [],
      locked: true,
      deliberated: false,
    });
    const reply = await askVitalis({
      text: "Plan my dinner",
      history: [],
      contextText: "RECORD",
      record: RECORD,
      deliberate: true,
    });
    expect(reply.locked).toBe(true);
  });
});

describe("askVitalis — fast path with a record", () => {
  it("sends the record on askEdge and maps the vitalis extras back", async () => {
    hoisted.askEdge.mockResolvedValue({
      ok: true,
      paragraphs: ["You're at 121 g protein."],
      provider: "vitalis",
      vitalis: {
        actions: [{ action: "compose_plan" }],
        stages: [],
        locked: false,
        deliberated: false,
      },
    });
    const reply = await askVitalis({
      text: "How is my protein?",
      history: [],
      contextText: "RECORD",
      record: RECORD,
    });
    expect(hoisted.streamVitalis).not.toHaveBeenCalled();
    const request = hoisted.askEdge.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(request["vitalisRecord"]).toEqual(RECORD);
    expect(request["deliberate"]).toBeUndefined();
    expect(reply.actions).toEqual([{ action: "compose_plan" }]);
    expect(reply.locked).toBe(false);
  });
});

describe("isDeliberationIntent", () => {
  it("matches the server's escalation heuristic", () => {
    expect(isDeliberationIntent("Make me a meal plan")).toBe(true);
    expect(isDeliberationIntent("What should I eat tonight?")).toBe(true);
    expect(isDeliberationIntent("How much protein today?")).toBe(false);
  });
});
