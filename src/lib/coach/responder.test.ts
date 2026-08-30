import { describe, expect, it } from "vitest";

import { answer, detectTopic, type CoachRecord, type TrackerFacts } from "@/lib/coach/responder";
import type { CoachContext } from "@/lib/coach/intelligence";

const window = (mood = 0, energy = 0, stress = 0): CoachContext["mood"]["recent"] => ({
  label: "last_7_days",
  start: "2026-08-24",
  end: "2026-08-30",
  entries: 0,
  days: 0,
  mood,
  energy,
  stress,
});

const context = (over: Partial<CoachContext["mood"]> = {}): CoachContext => ({
  mood: {
    average: 0,
    energy: 0,
    stress: 0,
    entries: 0,
    dataQuality: "none",
    recent: window(),
    previous: window(),
    month: window(),
    change: { mood: null, energy: null, stress: null, direction: "insufficient" },
    trend: { mood: "insufficient", perWeek: 0 },
    timeOfDay: [],
    emotions: [],
    patterns: [],
    anomalies: [],
    ...over,
  },
  habits: { available: false, activeCount: 0, recentCompleted: 0, previousCompleted: 0, selected: [] },
  memory: { available: 0, selected: [] },
  intent: { primary: "REFLECT", mode: "ask" },
  policy: {
    factsFromApplication: true,
    currentMessageHasPriority: true,
    actionsRequireConfirmation: true,
    uncertaintyIsRequired: true,
  },
  evidence: [],
  contextSources: [],
});

const tracker = (over: Partial<TrackerFacts> = {}): TrackerFacts => ({
  id: "sleep",
  name: "Sleep",
  today: 450,
  goal: 480,
  avg7: 420,
  streak: 2,
  daysLogged: 12,
  series: [400, 410, 420, 430, 440, 450, 460, 455, 445, 435, 425, 420],
  format: (value: number) => `${Math.floor(value / 60)}h ${value % 60}m`,
  ...over,
});

const emptyRecord: CoachRecord = {
  today: "2026-08-30",
  trackers: [],
  cycle: null,
  memories: [],
  habitsActive: 0,
};

describe("detectTopic", () => {
  it("reads what the person actually asked about", () => {
    expect(detectTopic("how did I sleep last night?", "ask")).toBe("sleep");
    expect(detectTopic("am I drinking enough water", "ask")).toBe("water");
    expect(detectTopic("my period is late", "ask")).toBe("period");
    expect(detectTopic("I can't focus on revision", "ask")).toBe("study");
    expect(detectTopic("I'm so stressed", "ask")).toBe("stress");
    expect(detectTopic("hey", "ask")).toBe("greeting");
  });

  it("falls back to the mode when nothing is named", () => {
    expect(detectTopic("what should I do tonight?", "plan")).toBe("habit");
    expect(detectTopic("", "plan")).toBe("habit");
    expect(detectTopic("how is it going?", "reflect")).toBe("mood");
  });
});

describe("answer — with data", () => {
  it("answers a sleep question from the logged nights", () => {
    const record: CoachRecord = {
      ...emptyRecord,
      trackers: [tracker()],
    };
    const result = answer({ text: "how did I sleep?", mode: "ask" }, context(), record);
    const text = result.paragraphs.join(" ");
    expect(text).toMatch(/12 nights/);
    expect(text).toMatch(/7h 0m/); // the seven-night average, formatted
    expect(result.blocks.some((b) => b.type === "metric")).toBe(true);
    expect(result.sources.join(" ")).toMatch(/Sleep/);
  });

  it("says what's missing instead of guessing when a tracker is empty", () => {
    const record: CoachRecord = {
      ...emptyRecord,
      trackers: [tracker({ daysLogged: 0, avg7: null, today: null, series: [] })],
    };
    const result = answer({ text: "how did I sleep?", mode: "ask" }, context(), record);
    const text = result.paragraphs.join(" ");
    expect(text).toMatch(/haven't logged a night/i);
    expect(text).not.toMatch(/7h/);
    expect(result.blocks).toHaveLength(0);
  });
});

describe("answer — period", () => {
  it("reads the cycle day, phase and confidence when there's a record", () => {
    const record: CoachRecord = {
      ...emptyRecord,
      cycle: {
        daysLogged: 9,
        cycleDay: 14,
        phaseLabel: "Ovulation",
        nextStart: "2026-09-14",
        daysUntilNext: 15,
        averageLength: 28,
        confidence: "medium",
        confidenceReason: "Two cycles logged so far.",
      },
    };
    const result = answer({ text: "when is my period due?", mode: "ask" }, context(), record);
    const text = result.paragraphs.join(" ");
    expect(text).toMatch(/day 14/);
    expect(text).toMatch(/ovulation/i);
    expect(text).toMatch(/medium confidence/i);
    expect(text).toMatch(/Two cycles logged so far/);
  });

  it("names the one log that would change the answer when there's no cycle", () => {
    const result = answer({ text: "when is my period due?", mode: "ask" }, context(), emptyRecord);
    expect(result.paragraphs.join(" ")).toMatch(/no cycle logged yet/i);
  });
});

describe("answer — nothing logged at all", () => {
  it("admits it rather than producing a template", () => {
    const result = answer({ text: "how am I doing?", mode: "ask" }, context(), emptyRecord);
    const text = result.paragraphs.join(" ");
    expect(text).toMatch(/empty/i);
    expect(text).toMatch(/Trackers page/);
    expect(result.blocks).toHaveLength(0);
  });

  it("greets by pointing at what it can actually read", () => {
    const result = answer({ text: "hey", mode: "ask" }, context(), emptyRecord);
    expect(result.paragraphs.join(" ")).toMatch(/nothing logged to read from yet/i);
  });
});

describe("answer — plan mode", () => {
  it("builds steps from the record instead of a template", () => {
    const record: CoachRecord = {
      ...emptyRecord,
      trackers: [
        tracker({ id: "study", name: "Study", daysLogged: 8, avg7: 90, goal: 120, today: 60 }),
        tracker({ id: "water", name: "Water", daysLogged: 8, avg7: 1500, goal: 2200, today: 1200 }),
      ],
      habitsActive: 2,
    };
    const result = answer({ text: "plan my evening", mode: "plan" }, context(), record);
    const plan = result.blocks.find((b) => b.type === "plan");
    expect(plan).toBeDefined();
    if (plan?.type !== "plan") throw new Error("expected a plan block");
    expect(plan.steps.length).toBeGreaterThanOrEqual(3);
    expect(plan.steps.some((s) => /habit/i.test(s.label))).toBe(true);
    expect(plan.steps.some((s) => /water/i.test(s.label))).toBe(true);
  });
});

describe("answer — mood", () => {
  it("uses the mood check-ins when they exist", () => {
    const ctx = context({
      entries: 12,
      dataQuality: "usable",
      recent: window(6.4, 5.1, 4.2),
      previous: window(5.8),
      month: window(6.1),
      change: { mood: 0.6, energy: 0.2, stress: -0.3, direction: "improving" },
      patterns: [{ title: "Dips midweek", statement: "Wednesdays read lower than the rest of the week", evidence: "moderate", sampleSize: 6, metrics: [] }],
    });
    const result = answer({ text: "how has my week been?", mode: "reflect" }, ctx, emptyRecord);
    const text = result.paragraphs.join(" ");
    expect(text).toMatch(/12 check-ins/);
    expect(text).toMatch(/6\.4/);
    expect(text).toMatch(/wednesdays read lower/i);
  });

  it("won't invent a mood reading when there are none", () => {
    const result = answer({ text: "how has my week been?", mode: "reflect" }, context(), emptyRecord);
    expect(result.paragraphs.join(" ")).toMatch(/no mood check-ins to read yet/i);
  });
});
