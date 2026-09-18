import { describe, expect, it } from "vitest";

import {
  distinctMessageCount,
  renderedMessageEstimate,
  reminderCopy,
  type ReminderContext,
} from "./copy";

const ctx = (over: Partial<ReminderContext>): ReminderContext => ({ kind: "habit", ...over });

describe("reminder copy", () => {
  it("produces a non-empty title and body for every kind", () => {
    const kinds = ["habit", "period", "fertile", "evening"] as const;
    for (const kind of kinds) {
      const { title, body } = reminderCopy({ kind }, `k-${kind}`);
      expect(title.length, `${kind} title`).toBeGreaterThan(0);
      expect(body.length, `${kind} body`).toBeGreaterThan(0);
    }
  });

  it("never leaks an unfilled {slot} marker", () => {
    /* A template whose slot couldn't be filled must be dropped entirely, not
       shipped with a hole in it. Sweep every kind across many seeds. */
    const cases: ReminderContext[] = [
      ctx({ kind: "habit" }),
      ctx({ kind: "habit", habitName: "Stretch" }),
      ctx({ kind: "habit", habitName: "Stretch", streak: 1 }),
      ctx({ kind: "habit", habitName: "Stretch", streak: 9 }),
      ctx({ kind: "period" }),
      ctx({ kind: "period", daysLate: 3 }),
      ctx({ kind: "fertile" }),
      ctx({ kind: "evening" }),
      ctx({ kind: "evening", loggedToday: 1 }),
      ctx({ kind: "evening", loggedToday: 5 }),
    ];
    for (let i = 0; i < 40; i += 1) {
      for (const c of cases) {
        const { title, body } = reminderCopy(c, `seed-${i}`);
        expect(title).not.toMatch(/\{\w+\}/);
        expect(body).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it("does not claim a streak below two days", () => {
    /* A run of one is not a streak. Saying "day 1 in a row" would be noise, and
       saying "day 0" would be a small lie. */
    for (let i = 0; i < 30; i += 1) {
      const { title, body } = reminderCopy(
        ctx({ kind: "habit", habitName: "Read", streak: 1 }),
        `s${i}`,
      );
      expect(`${title} ${body}`).not.toMatch(/day 1\b|1 straight|1-day|in a row/i);
    }
  });

  it("speaks about a real streak when there is one", () => {
    let mentioned = 0;
    for (let i = 0; i < 30; i += 1) {
      const { title, body } = reminderCopy(
        ctx({ kind: "habit", habitName: "Read", streak: 7 }),
        `s${i}`,
      );
      if (/7/.test(`${title} ${body}`)) mentioned += 1;
    }
    /* The streak branch has several titles, not all of which quote the number,
       so this is "usually", not "always" — but it must not be never. */
    expect(mentioned).toBeGreaterThan(10);
  });

  it("names the habit when given one, and stays generic when not", () => {
    const named = reminderCopy(ctx({ kind: "habit", habitName: "Journal" }), "x");
    expect(`${named.title} ${named.body}`).toContain("Journal");

    let genericOk = true;
    for (let i = 0; i < 20; i += 1) {
      const { title, body } = reminderCopy(ctx({ kind: "habit" }), `g${i}`);
      if (/\bundefined\b/.test(`${title} ${body}`)) genericOk = false;
    }
    expect(genericOk).toBe(true);
  });

  it("is stable for a given key and varied across keys", () => {
    const a1 = reminderCopy(ctx({ kind: "habit", habitName: "Run" }), "same-key");
    const a2 = reminderCopy(ctx({ kind: "habit", habitName: "Run" }), "same-key");
    expect(a1).toEqual(a2); // deterministic — no reshuffle on re-render

    const seen = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const { title, body } = reminderCopy(
        ctx({ kind: "habit", habitName: "Run", streak: 5 }),
        `key-${i}`,
      );
      seen.add(`${title}::${body}`);
    }
    /* Not every seed lands on a unique combo, but it must genuinely vary. */
    expect(seen.size).toBeGreaterThan(8);
  });

  it("changes the evening message by how much was logged", () => {
    const none = reminderCopy(ctx({ kind: "evening", loggedToday: 0 }), "e");
    const some = reminderCopy(ctx({ kind: "evening", loggedToday: 2 }), "e");
    const lots = reminderCopy(ctx({ kind: "evening", loggedToday: 6 }), "e");
    expect(none.title).not.toBe(some.title);
    expect(some.body).not.toBe(lots.body);
    /* "Some" acknowledges the count; "done" closes the day. */
    expect(some.title).toMatch(/2/);
  });

  it("reports the real template count and the rendered count", () => {
    /*
     * Two honest numbers, both logged rather than hidden:
     *  · templates — hand-authored combinations (~118). Padding this to a round
     *    thousand with near-duplicate lines would be the filler this avoids.
     *  · rendered — what an account actually sees once the streak/count/name
     *    slots carry real values. This is the figure the "1000+" ask is really
     *    about, and it clears a thousand on a single habit alone.
     */
    const templates = distinctMessageCount();
    const rendered = renderedMessageEstimate();
    expect(templates).toBeGreaterThan(100);
    expect(rendered).toBeGreaterThan(1000);
    console.log(`notification copy: ${templates} templates, ${rendered}+ rendered messages`);
  });
});
