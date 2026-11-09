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

/* Wall-clock fixtures are built from local components on purpose: the
   daypart expectations are about the local hour, so these read as 09:30 /
   20:30 in whatever timezone the suite runs in. Anything that measures
   ELAPSED time (daysWithBloom) must not pair them with a fixed UTC
   timestamp — that was the flake: in IST the pair spanned 44h, not the
   ≥48h the expectation needs. Elapsed fixtures are computed relative to
   MORNING instead (see hoursBefore), which is exact in every timezone. */
const MORNING = new Date(2026, 8, 20, 9, 30, 0);
const EVENING = new Date(2026, 8, 20, 20, 30, 0);

/** An ISO timestamp exactly `hours` before `date` — timezone-proof. */
const hoursBefore = (date: Date, hours: number): string =>
  new Date(date.getTime() - hours * 3600_000).toISOString();

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
        /* 49.5 hours before the read: two whole days, in every timezone. */
        at: hoursBefore(MORNING, 49.5),
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
        /* 8.5 hours before the read: still day one, in every timezone. */
        at: hoursBefore(MORNING, 8.5),
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
    expect(line.toLowerCase()).toMatch(/good night|quiet hours/);
  });
});
