/**
 * personal.ts — the voice knows who it's talking to.
 *
 * The contract that matters: a name only ever appears when the person gave
 * one, everything degrades silently when nothing was answered, and nothing
 * here can throw.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { firstNameOf, readPersonalVoice, welcomeLine } from "./personal";

type Store = Record<string, string>;

function withStorage(doc: Store): void {
  const store: Store = { ...doc };
  (globalThis as Record<string, unknown>)["window"] = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
  };
}

function onboardingDoc(value: unknown): Store {
  return {
    "bloom.prefs.v1": JSON.stringify({
      "onboarding.v1": { value, updatedAt: "2026-09-01T00:00:00.000Z" },
    }),
  };
}

const MORNING = new Date("2026-09-20T09:30:00");
const EVENING = new Date("2026-09-20T20:30:00");

/**
 * An instant `hours` before `now`, as an ISO string — the shape onboarding
 * stores in `at`.
 *
 * `daysWithBloom` counts elapsed whole 24-hour periods, so a fixture that pins
 * `at` to a UTC instant and `now` to a local one measures a different duration
 * in every time zone: `2026-09-18T08:00:00.000Z` against a local 09:30 on the
 * 20th is 49.5 hours in UTC but 44 hours in IST, which floors to 2 days in one
 * zone and 1 in the other. Deriving the stored instant from the same `now` the
 * test passes in makes the elapsed time exactly what the test says it is,
 * wherever the suite runs.
 */
const hoursBefore = (now: Date, hours: number): string =>
  new Date(now.getTime() - hours * 3_600_000).toISOString();

beforeEach(() => {
  withStorage({});
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>)["window"];
});

describe("firstNameOf — a greeting-length name, or nothing", () => {
  it("takes the first word of a full name", () => {
    expect(firstNameOf("Maya Krishnan")).toBe("Maya");
  });
  it("trims and keeps a single name", () => {
    expect(firstNameOf("  Ada  ")).toBe("Ada");
  });
  it("refuses nothing and refuses nonsense", () => {
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf("")).toBeNull();
    expect(firstNameOf("   ")).toBeNull();
  });
  it("refuses a pasted sentence — that is not a name", () => {
    expect(firstNameOf("the quick brown fox jumped over the lazy dog again and again")).toBeNull();
  });
});

describe("readPersonalVoice — identity from the onboarding answer, or honest blanks", () => {
  it("reads the name, focus and cycle capability", () => {
    withStorage(
      onboardingDoc({
        done: true,
        kind: "cycle",
        sex: "female",
        focus: ["sleep", "mood"],
        name: "Maya Krishnan",
        // Two whole 24-hour periods and two hours, so the expectation below is
        // about whole days rather than about the clock this machine is set to.
        at: hoursBefore(MORNING, 50),
      }),
    );
    const voice = readPersonalVoice(MORNING);
    expect(voice.name).toBe("Maya");
    expect(voice.focus).toEqual(["sleep", "mood"]);
    expect(voice.cycle).toBe(true);
    expect(voice.daysWithBloom).toBe(2);
    expect(voice.firstDay).toBe(false);
    expect(voice.daypart).toBe("morning");
  });

  it("day one is day one", () => {
    withStorage(
      onboardingDoc({
        done: true,
        kind: "cycle",
        sex: null,
        focus: [],
        name: "Ada",
        // Answered two hours ago, so this is the first 24-hour period in every
        // zone — not "an hour after midnight UTC", which is a different tenure
        // depending on where the runner is.
        at: hoursBefore(MORNING, 2),
      }),
    );
    expect(readPersonalVoice(MORNING).firstDay).toBe(true);
  });

  it("degrades to blanks when nothing was answered — and must not throw", () => {
    withStorage({});
    const voice = readPersonalVoice(EVENING);
    expect(voice.name).toBeNull();
    expect(voice.focus).toEqual([]);
    expect(voice.cycle).toBeNull();
    expect(voice.daysWithBloom).toBeNull();
    expect(voice.firstDay).toBe(false);
  });

  it("survives corrupt storage", () => {
    withStorage({ "bloom.prefs.v1": "{not json" });
    expect(() => readPersonalVoice(MORNING)).not.toThrow();
    expect(readPersonalVoice(MORNING).name).toBeNull();
  });

  it("no-cycle profiles read as capability false", () => {
    withStorage(
      onboardingDoc({ done: true, kind: "no-cycle", sex: "male", focus: ["habits"], name: null }),
    );
    expect(readPersonalVoice(MORNING).cycle).toBe(false);
  });
});

describe("welcomeLine — personal from minute zero, varied by daypart", () => {
  const base = {
    focus: [] as string[],
    cycle: null,
    daysWithBloom: null,
    firstDay: false,
  };

  it("uses the name when there is one", () => {
    const line = welcomeLine({ ...base, name: "Maya", daypart: "evening" });
    expect(line).toContain("Maya");
    expect(line).not.toContain("{name}");
  });

  it("never leaks the placeholder without a name", () => {
    const line = welcomeLine({ ...base, name: null, daypart: "morning" });
    expect(line).not.toContain("{name}");
    expect(line.length).toBeGreaterThan(4);
  });

  it("the night hears about the hour", () => {
    const line = welcomeLine({ ...base, name: null, daypart: "night" });
    expect(line.toLowerCase()).toMatch(/still up|quiet hours/);
  });
});
