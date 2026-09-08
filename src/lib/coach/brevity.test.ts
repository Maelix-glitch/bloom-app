import { describe, expect, it } from "vitest";

import { budgetFor, fitToBudget } from "./brevity";

/**
 * The complaint that motivated this file was "it answers a one-line question
 * with a long paragraph". These tests are the guard on that promise.
 */

describe("budgetFor", () => {
  it("keeps a greeting to one line", () => {
    expect(budgetFor("hey", { greeting: true }).register).toBe("terse");
  });

  it("answers a short closed question briefly", () => {
    for (const q of ["did I sleep enough?", "am I on track", "is my streak alive?"]) {
      const b = budgetFor(q);
      expect(b.maxParagraphs).toBe(1);
      expect(b.maxWords).toBeLessThanOrEqual(70);
    }
  });

  it("gives an open question room even when it is short", () => {
    /* "why?" is three characters and a real request for reasoning */
    expect(budgetFor("why am I tired?").register).toBe("normal");
    expect(budgetFor("explain why my energy keeps dropping in the afternoons").register).toBe(
      "full",
    );
  });

  it("keeps a closed question closed however long it rambles", () => {
    const q =
      "did I actually manage to hit my water goal on more days than not this week, roughly speaking, over the last seven days or so";
    expect(budgetFor(q).register).toBe("normal");
    expect(budgetFor(q).maxParagraphs).toBeLessThanOrEqual(2);
  });

  it("obeys an explicit request for brevity over everything else", () => {
    expect(budgetFor("explain in detail why I'm tired, briefly").register).toBe("terse");
  });

  it("obeys an explicit request for depth", () => {
    expect(budgetFor("sleep, in detail").register).toBe("full");
  });

  it("scales with length for plain statements", () => {
    expect(budgetFor("tired").register).toBe("terse");
    expect(budgetFor("I've been really tired this week").register).toBe("brief");
    expect(
      budgetFor(
        "I've been tired all week and I think it started when I began staying up late to finish the essay that is due on Friday",
      ).register,
    ).toBe("normal");
  });

  it("never allows blocks in the tersest register", () => {
    expect(budgetFor("hi", { greeting: true }).allowBlocks).toBe(false);
  });
});

describe("fitToBudget", () => {
  const budget = budgetFor("did I sleep enough?");

  it("drops paragraphs beyond the cap", () => {
    const out = fitToBudget(["one.", "two.", "three."], budget);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe("one.");
  });

  it("always returns something when given something", () => {
    const long = "word ".repeat(200);
    expect(fitToBudget([long], budget).length).toBe(1);
  });

  it("cuts at a sentence boundary, never mid-word", () => {
    const p = `${"alpha beta gamma delta. ".repeat(20)}`;
    const [out] = fitToBudget([p], budget);
    expect(out).toBeTruthy();
    expect(out!.endsWith(".")).toBe(true);
    /* and it actually shortened it */
    expect(out!.length).toBeLessThan(p.length);
  });

  it("ignores blank paragraphs", () => {
    expect(fitToBudget(["", "  ", "real."], budget)).toEqual(["real."]);
  });

  it("returns nothing for nothing", () => {
    expect(fitToBudget([], budget)).toEqual([]);
  });

  it("lets a full budget through untouched", () => {
    const full = budgetFor("explain everything about my week in detail");
    const ps = ["a.", "b.", "c.", "d."];
    expect(fitToBudget(ps, full)).toEqual(ps);
  });
});
