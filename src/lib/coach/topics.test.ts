import { describe, expect, it } from "vitest";

import { detectTopics, isCareTopic, isTrackedTopic, TOPICS } from "./topics";

/**
 * The coach felt "very strict" because it only recognised its own trackers.
 * These tests pin the breadth — if a future edit narrows the table back down,
 * something here goes red.
 */

const primary = (s: string) => detectTopics(s).primary;

describe("breadth", () => {
  it("recognises subjects well outside the trackers", () => {
    expect(primary("I'm worried about rent this month")).toBe("money");
    expect(primary("my boss is impossible")).toBe("work");
    expect(primary("I had a fight with my sister")).toBe("relationships");
    expect(primary("I keep procrastinating")).toBe("motivation");
    expect(primary("I skipped lunch again")).toBe("food");
    expect(primary("too much coffee today")).toBe("caffeine");
    expect(primary("my grandmother died last week")).toBe("grief");
    expect(primary("I feel so lonely")).toBe("loneliness");
    expect(primary("I hate how I look")).toBe("body");
    expect(primary("how do I log a habit?")).toBe("appHelp");
    expect(primary("can I export my data?")).toBe("data");
  });

  it("still recognises every tracker", () => {
    expect(primary("how did I sleep")).toBe("sleep");
    expect(primary("have I drunk enough water")).toBe("water");
    expect(primary("my revision is going badly")).toBe("study");
    expect(primary("I went for a run")).toBe("movement");
    expect(primary("too much screen time")).toBe("screen");
    expect(primary("no energy at all")).toBe("energy");
    expect(primary("when is my period due")).toBe("period");
  });

  it("covers noticeably more ground than the old eleven topics", () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(25);
  });
});

describe("precedence", () => {
  it("puts high-stakes subjects ahead of softer matches", () => {
    /* mentions "feel", which would otherwise match mood */
    expect(primary("I feel awful since my dad died")).toBe("grief");
    expect(primary("I feel so isolated and no-one to talk to")).toBe("loneliness");
  });

  it("reads cycle words as the cycle, not as pain", () => {
    expect(primary("cramps are bad today")).toBe("period");
  });

  it("treats a greeting with a question attached as the question", () => {
    expect(primary("hey, why am I so tired?")).toBe("energy");
    expect(primary("hi")).toBe("greeting");
    expect(primary("thanks")).toBe("thanks");
  });

  it("reports the secondary subjects it also saw", () => {
    const { also } = detectTopics("I'm anxious about my exam and not sleeping");
    expect(also.length).toBeGreaterThan(0);
  });

  it("falls back to general rather than guessing", () => {
    expect(primary("qwertyuiop")).toBe("general");
    expect(primary("")).toBe("general");
  });
});

describe("classification", () => {
  it("marks the subjects that need a person before a number", () => {
    for (const t of ["grief", "loneliness", "stress", "money", "pain"] as const) {
      expect(isCareTopic(t)).toBe(true);
    }
    expect(isCareTopic("water")).toBe(false);
    expect(isCareTopic("habit")).toBe(false);
  });

  it("marks what the record can actually answer", () => {
    for (const t of ["sleep", "water", "study", "movement", "energy", "screen", "period"] as const) {
      expect(isTrackedTopic(t)).toBe(true);
    }
    expect(isTrackedTopic("money")).toBe(false);
    expect(isTrackedTopic("grief")).toBe(false);
  });
});
