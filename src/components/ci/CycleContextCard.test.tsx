// @vitest-environment jsdom
/**
 * CycleContextCard — renders the available context honestly, and renders
 * nothing at all when the context is unavailable (the page's own cards
 * already explain paused / off / first-run states).
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { buildCycleContext } from "@/lib/womens/context";
import type { PeriodLog } from "@/lib/cycle/predict";
import { CycleContextCard } from "./CycleContextCard";

const log = (id: string, start: string): PeriodLog => ({ id, start, end: null, flow: "medium" });
const STEADY: PeriodLog[] = [
  log("a", "2026-05-04"),
  log("b", "2026-06-01"),
  log("c", "2026-06-29"),
  log("d", "2026-07-27"),
  log("e", "2026-08-24"),
];

afterEach(cleanup);

describe("CycleContextCard", () => {
  it("shows phase, day, confidence, window, note and the estimate label", () => {
    const ctx = buildCycleContext({ logs: STEADY, today: "2026-09-07", mode: "tracking" });
    render(<CycleContextCard context={ctx} />);
    const card = screen.getByTestId("cycle-context-card");
    expect(card.textContent).toMatch(/Cycle context/);
    expect(card.textContent).toMatch(/day 15 of your cycle/);
    expect(card.textContent).toMatch(/High confidence/);
    expect(card.textContent).toMatch(/Next period estimated around (21 Sep|Sep 21)/);
    expect(card.textContent).toMatch(/your own logged patterns matter more than general notes/);
    expect(card.textContent).toMatch(/Estimates from your own logged cycle/);
    expect(card.textContent).toMatch(/not medical advice/);
    /* the card never surfaces fertility/contraception content */
    expect(card.textContent).not.toMatch(/fertile|contracept/i);
  });

  it("renders nothing when the context is unavailable", () => {
    const paused = buildCycleContext({ logs: STEADY, today: "2026-09-07", mode: "paused" });
    const { container } = render(<CycleContextCard context={paused} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("cycle-context-card")).toBeNull();
  });
});
