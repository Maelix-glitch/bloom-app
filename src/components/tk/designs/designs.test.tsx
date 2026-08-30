// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Atlas } from "./Atlas";
import { Ledger } from "./Ledger";
import { Strip } from "./Strip";
import { todayKey } from "@/lib/cycle/predict";

/** Fourteen real-looking days ending today, so the pages have something to draw. */
function seed() {
  const today = todayKey();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() - (13 - i));
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
      sleepMinutes: 420 + i * 5,
      bedTime: "23:00",
      wakeTime: "07:00",
      sleepQuality: 3,
      waterMl: 1400 + i * 90,
      sessions: [{ subject: "Maths", minutes: 45 + i * 5, startAt: "09:00" }],
      movementMinutes: 20 + i,
      energy: (i % 5) + 1,
      screenMinutes: 180 + i * 10,
      notes: null,
    };
  });
  window.localStorage.setItem("bloom.trackers.days.v1", JSON.stringify(days));
  return days;
}

let errors: unknown[] = [];

beforeEach(() => {
  errors = [];
  vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args));
  window.localStorage.clear();
  seed();
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as never;
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the three trackers designs", () => {
  it("Ledger draws the sheet with today's figures", () => {
    render(<Ledger />);
    expect(screen.getByText("Six entries a day.")).toBeTruthy();
    expect(screen.getAllByText("Sleep").length).toBeGreaterThan(0);
    /* 470 minutes on the last seeded day reads as 7h 50m */
    expect(screen.getAllByText("7h 50m").length).toBeGreaterThan(0);
    expect(screen.getByText(/On target/)).toBeTruthy();
    expect(errors).toHaveLength(0);
  });

  it("Atlas draws the compass and the six territories", () => {
    render(<Atlas />);
    expect(screen.getByText(/Where your hours/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /twenty-four hour compass/i })).toBeTruthy();
    for (const name of ["Sleep", "Water", "Study", "Movement", "Energy", "Screen"]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(errors).toHaveLength(0);
  });

  it("Strip draws six bands of fourteen cells", () => {
    const { container } = render(<Strip />);
    expect(screen.getByText(/Six bands/)).toBeTruthy();
    expect(container.querySelectorAll(".sp-band")).toHaveLength(6);
    expect(container.querySelectorAll(".sp-cell")).toHaveLength(84);
    expect(errors).toHaveLength(0);
  });

  it("all three show the advanced read, not a placeholder", () => {
    for (const [name, Component] of [
      ["Ledger", Ledger],
      ["Atlas", Atlas],
      ["Strip", Strip],
    ] as const) {
      const { unmount } = render(<Component />);
      const headline = screen
        .getAllByText(/bright|low days|alike on paper|Not yet/i)
        .filter((el) => el.closest("p"));
      expect(headline.length, `${name} shows the advanced read`).toBeGreaterThan(0);
      unmount();
    }
    expect(errors).toHaveLength(0);
  });

  it("an empty record explains itself instead of going blank", () => {
    window.localStorage.clear();
    for (const [name, Component] of [
      ["Ledger", Ledger],
      ["Atlas", Atlas],
      ["Strip", Strip],
    ] as const) {
      const { unmount } = render(<Component />);
      const copy = document.body.textContent ?? "";
      expect(copy.length, `${name} renders copy when empty`).toBeGreaterThan(200);
      expect(/empty|blank|Nothing plotted|Add one day/i.test(copy) || /Six entries|Six bands|Where your hours/.test(copy)).toBe(true);
      unmount();
    }
    expect(errors).toHaveLength(0);
  });
});
