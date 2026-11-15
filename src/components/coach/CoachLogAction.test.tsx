// @vitest-environment jsdom
/**
 * The "Log this" handoff, end to end at the component seam (W4-3 N5,
 * design §4.4).
 *
 * The lib suites pin detection, parsing and the write path; these pin
 * the part only the component can break: the button appears with its
 * hint, the sheet opens pre-filled digit-for-digit with what Coach
 * said, nothing is written until the user confirms, an edit lands as
 * the user's number inside a still-estimate entry, and afterwards the
 * action reads "Logged" — from the record, not from local optimism.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const mockDoc = new Map<string, unknown>();

vi.mock("@/lib/prefs", () => ({
  PREFS_CHANGED: "bloom:prefs-changed",
  getPref: (key: string, parse: (raw: unknown) => unknown, fallback: unknown) => {
    if (!mockDoc.has(key)) return fallback;
    const parsed = parse(mockDoc.get(key));
    return parsed === null ? fallback : parsed;
  },
  setPref: (key: string, value: unknown) => {
    mockDoc.set(key, value);
  },
  clearPref: (key: string) => {
    mockDoc.delete(key);
  },
}));

import { todayLocal } from "@/lib/localDay";
import type { CoachPhotoEstimate } from "@/lib/nutrition/coachLog";
import { logCoachEstimate } from "@/lib/nutrition/coachLog";
import { readFoodLog } from "@/lib/nutrition/store";
import { resetPrefCache } from "@/lib/prefsStore";

import { CoachLogAction } from "./CoachLogAction";

const ESTIMATE: CoachPhotoEstimate = {
  name: "That looks like a classic chicken biryani served with a side of cucumber raita.",
  totals: { kcal: 680, proteinG: 42, carbsG: 75, fatG: 24 },
};

/** jsdom ships no matchMedia, and BloomSheet asks it whether this is a phone. */
function mockMatchMedia() {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

/** The real setPref fires this after a write; the mocked one is a plain
 *  Map write, so the test fires it the same way the real write path does. */
function notifyPrefsChanged() {
  act(() => {
    window.dispatchEvent(new Event("bloom:prefs-changed"));
  });
}

beforeEach(() => {
  mockDoc.clear();
  resetPrefCache();
  mockMatchMedia();
});

afterEach(cleanup);

describe("CoachLogAction", () => {
  it("offers the button with its confirm-first hint, and writes nothing on render", () => {
    render(<CoachLogAction messageId="m1" estimate={ESTIMATE} />);
    expect(screen.getByRole("button", { name: /Log this/ })).toBeTruthy();
    expect(screen.getByText(/you confirm the numbers first/)).toBeTruthy();
    expect(readFoodLog()).toEqual([]);
  });

  it("opens the sheet pre-filled digit-for-digit, and logs only on confirm", () => {
    render(<CoachLogAction messageId="m1" estimate={ESTIMATE} />);
    fireEvent.click(screen.getByRole("button", { name: /Log this/ }));

    const name = screen.getByLabelText("Name") as HTMLInputElement;
    expect(name.value).toBe(ESTIMATE.name);
    expect((screen.getByLabelText("kcal") as HTMLInputElement).value).toBe("680");
    expect((screen.getByLabelText("Protein (g)") as HTMLInputElement).value).toBe("42");
    expect((screen.getByLabelText("Carbs (g)") as HTMLInputElement).value).toBe("75");
    expect((screen.getByLabelText("Fat (g)") as HTMLInputElement).value).toBe("24");
    expect(screen.getByText(/≈ 680 kcal · 42 g protein · 75 g carbs · 24 g fat/)).toBeTruthy();
    // A meal slot is pre-chosen — there is no path to log without one.
    const pressed = screen
      .getAllByRole("button", { name: /^(Breakfast|Lunch|Dinner|Snack)$/ })
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    // Opening the sheet wrote nothing.
    expect(readFoodLog()).toEqual([]);

    // The user corrects the protein, then confirms.
    fireEvent.change(screen.getByLabelText("Protein (g)"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Log it" }));
    notifyPrefsChanged();

    const stored = readFoodLog();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.nutrients).toEqual({ kcal: 680, proteinG: 50, carbsG: 75, fatG: 24 });
    expect(stored[0]!.provenance.kind).toBe("coach_estimate");
    expect(stored[0]!.source).toBe("coach_photo");
    expect(stored[0]!.day).toBe(todayLocal());
    expect(screen.getByText(/Logged to your food log/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Log this/ })).toBeNull();
  });

  it("closing the sheet without confirming logs nothing", () => {
    render(<CoachLogAction messageId="m1" estimate={ESTIMATE} />);
    fireEvent.click(screen.getByRole("button", { name: /Log this/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(readFoodLog()).toEqual([]);
  });

  it("a message already logged — with its entry still in the log — reads Logged", () => {
    const entry = logCoachEstimate({
      messageId: "m1",
      name: ESTIMATE.name,
      totals: ESTIMATE.totals,
      meal: "lunch",
      day: todayLocal(),
      now: new Date().toISOString(),
    });
    expect(entry).not.toBeNull();
    resetPrefCache();
    render(<CoachLogAction messageId="m1" estimate={ESTIMATE} />);
    expect(screen.getByText(/Logged to your food log/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Log this/ })).toBeNull();
  });
});
