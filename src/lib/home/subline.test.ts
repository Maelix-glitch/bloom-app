import { describe, expect, it } from "vitest";

import { genuineFirstDay, RECORD_READING, sublineFor } from "./subline";

describe("genuineFirstDay", () => {
  it("trusts the claim only when the record itself is new", () => {
    expect(genuineFirstDay(true, 0)).toBe(true);
    expect(genuineFirstDay(true, 1)).toBe(true);
    /* A fresh device's onboarding answer over an established record. */
    expect(genuineFirstDay(true, 2)).toBe(false);
    expect(genuineFirstDay(true, 88)).toBe(false);
    expect(genuineFirstDay(false, 0)).toBe(false);
  });
});

describe("home subtitle", () => {
  it("is deterministic while the record is loading", () => {
    const state = { ready: false, firstDay: false, openCount: 3 };
    expect(sublineFor(state)).toBe(RECORD_READING);
    // Repeated renders, and no dependence on anything transient.
    for (let i = 0; i < 5; i += 1) expect(sublineFor(state)).toBe(RECORD_READING);
  });

  it("keeps the loaded message stable across repeated renders", () => {
    const state = { ready: true, firstDay: false, openCount: 3 };
    const first = sublineFor(state);
    for (let i = 0; i < 20; i += 1) expect(sublineFor(state)).toBe(first);
    expect(first).toBe("Three things left to shape your day.");
  });

  it("reports the day's real state instead of rotating copy", () => {
    expect(sublineFor({ ready: true, firstDay: false, openCount: 0 })).toBe(
      "Everything you track is logged. Enjoy the quiet.",
    );
    expect(sublineFor({ ready: true, firstDay: false, openCount: 1 })).toBe(
      "One thing left to shape your day.",
    );
    expect(sublineFor({ ready: true, firstDay: false, openCount: 2 })).toBe(
      "Two things left to shape your day.",
    );
    expect(sublineFor({ ready: true, firstDay: false, openCount: 7 })).toBe(
      "7 things left to shape your day.",
    );
  });

  it("gives day one its own line, once the record has loaded", () => {
    expect(sublineFor({ ready: true, firstDay: true, openCount: 4 })).toBe(
      "Day one — look around, log one thing when it's natural.",
    );
    // While loading, day one still shows the reading state — never a flash.
    expect(sublineFor({ ready: false, firstDay: true, openCount: 4 })).toBe(RECORD_READING);
  });

  it("transitions exactly once from loading to loaded", () => {
    const loading = sublineFor({ ready: false, firstDay: false, openCount: 3 });
    const loaded = sublineFor({ ready: true, firstDay: false, openCount: 3 });
    expect(loading).not.toBe(loaded);
    // Re-entering a loading flag must not restart the message in the UI, which
    // is why the caller latches readiness rather than reading it directly.
    expect(sublineFor({ ready: true, firstDay: false, openCount: 3 })).toBe(loaded);
  });
});
