// @vitest-environment jsdom
/**
 * HistoryTable — exclude-a-cycle (Wave B8): the toggle is offered per row,
 * an excluded period is badged as such, and including it again is one tap.
 * The record itself is never removed by this control.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { analyzeCycle, type PeriodLog } from "@/lib/cycle/predict";
import { HistoryTable } from "./HistoryTable";

const logs: PeriodLog[] = [
  { id: "p1", start: "2026-09-07", end: "2026-09-11", flow: "medium", notes: null },
  { id: "p2", start: "2026-10-05", end: "2026-10-09", flow: "medium", notes: null, excluded: true },
];

function renderTable(onToggleExcluded = vi.fn()) {
  render(
    <HistoryTable
      analysis={analyzeCycle(logs, "2026-10-20")}
      logs={logs}
      onEdit={() => {}}
      onDelete={() => {}}
      onToggleExcluded={onToggleExcluded}
      onClearAll={() => {}}
    />,
  );
  return onToggleExcluded;
}

afterEach(cleanup);

describe("HistoryTable · exclude-a-cycle", () => {
  it("offers Exclude on a counted period and calls back with the entry", () => {
    const onToggleExcluded = renderTable();
    fireEvent.click(
      screen.getAllByRole("button", { name: /Exclude the period starting/ })[0]!,
    );
    expect(onToggleExcluded).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }));
  });

  it("badges an excluded period and offers to include it again", () => {
    const onToggleExcluded = renderTable();
    expect(screen.getAllByTestId("cycle-excluded-badge").length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getAllByRole("button", { name: /Include the period starting/ })[0]!,
    );
    expect(onToggleExcluded).toHaveBeenCalledWith(expect.objectContaining({ id: "p2" }));
  });
});
