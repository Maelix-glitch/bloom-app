// @vitest-environment jsdom
/**
 * LogPanel — closing a period that has ended.
 *
 * Regression suite for the reported "I can't stop my period" bug: the
 * close offer used to require the picked day to classify as "inside" the
 * period, but for an OPEN entry the classifier caps "inside" at the
 * guessed usual length — so the first dry day of a normal-length (or
 * longer) period classified as "adjacent"/"soon-after" and the
 * "period has ended" checkbox never appeared.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { analyzeCycle, type PeriodLog } from "@/lib/cycle/predict";
import type { DayLog } from "@/lib/cycle/dayLogs";
import { LogPanel } from "./LogPanel";

/* Two completed 5-day periods, then the current one. Usual bleed = 5. */
const baseLogs = (currentEnd: string | null): PeriodLog[] => [
  { id: "p1", start: "2026-09-07", end: "2026-09-11", flow: "medium", notes: null },
  { id: "p2", start: "2026-10-05", end: "2026-10-09", flow: "medium", notes: null },
  { id: "p3", start: "2026-11-02", end: currentEnd, flow: "medium", notes: null },
];

function renderPanel(opts: { logs: PeriodLog[]; today: string; date: string }) {
  const onSetPeriodEnd = vi.fn(() => ({ ok: true as const, id: "p3" }));
  const analysis = analyzeCycle(opts.logs, opts.today);
  render(
    <LogPanel
      logs={opts.logs}
      days={[]}
      today={opts.today}
      analysis={analysis}
      date={opts.date}
      onDateChange={() => {}}
      onSavePeriod={() => ({ ok: true as const, id: "p3" })}
      onSetPeriodEnd={onSetPeriodEnd}
      onSaveDay={() => ({ ok: true as const })}
      onDeleteDay={() => {}}
    />,
  );
  return { onSetPeriodEnd };
}

const pickNoneAndSave = () => {
  fireEvent.click(screen.getByRole("button", { name: "None" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
};

afterEach(cleanup);

describe("LogPanel · closing an ended period", () => {
  it("offers to close on the first dry day after a usual-length period (adjacent day)", () => {
    /* Period started 2 Nov, usual length 5 → bled to 6 Nov. Today, 7 Nov,
       is the first dry day: it classifies "adjacent", not "inside". */
    const { onSetPeriodEnd } = renderPanel({
      logs: baseLogs(null),
      today: "2026-11-07",
      date: "2026-11-07",
    });
    pickNoneAndSave();
    expect(onSetPeriodEnd).toHaveBeenCalledWith("p3", "2026-11-06");
  });

  it("offers to close when she comes back days after it ended (soon-after day)", () => {
    /* Same open period, but she only opens the app on 11 Nov and logs
       "none" for today — 9 days after the start, past the usual window. */
    const { onSetPeriodEnd } = renderPanel({
      logs: baseLogs(null),
      today: "2026-11-11",
      date: "2026-11-11",
    });
    fireEvent.click(screen.getByRole("button", { name: "None" }));
    const box = screen.getByTestId("log-close-period");
    expect((box as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSetPeriodEnd).toHaveBeenCalledWith("p3", "2026-11-10");
  });

  it("does not offer to close a period that already has a recorded end", () => {
    renderPanel({ logs: baseLogs("2026-11-06"), today: "2026-11-07", date: "2026-11-07" });
    fireEvent.click(screen.getByRole("button", { name: "None" }));
    expect(screen.queryByTestId("log-close-period")).toBeNull();
  });
});

describe("LogPanel · symptom severity + clots (Wave B10)", () => {
  it("saves severity for a picked symptom and the clots mark with the day", () => {
    let saved: DayLog | null = null;
    const onSaveDay = vi.fn((draft: DayLog) => {
      saved = draft;
      return { ok: true as const };
    });
    const logs = baseLogs("2026-11-06");
    render(
      <LogPanel
        logs={logs}
        days={[]}
        today="2026-11-07"
        analysis={analyzeCycle(logs, "2026-11-07")}
        date="2026-11-07"
        onDateChange={() => {}}
        onSavePeriod={() => ({ ok: true as const, id: "p3" })}
        onSaveDay={onSaveDay}
        onDeleteDay={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Advanced log/ }));
    fireEvent.click(screen.getByRole("button", { name: "cramps" }));
    fireEvent.click(screen.getByRole("button", { name: "Severe" }));
    fireEvent.click(screen.getByTestId("clots-toggle"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveDay).toHaveBeenCalledTimes(1);
    expect(saved).not.toBeNull();
    expect(saved!.clots).toBe(true);
    expect(saved!.symptomSeverity).toEqual({ cramps: 3 });
  });

  it("loads an existing day's clots and severity back into the form", () => {
    const logs = baseLogs("2026-11-06");
    render(
      <LogPanel
        logs={logs}
        days={[
          {
            date: "2026-11-07",
            symptoms: ["acne"],
            symptomSeverity: { acne: 2 },
            clots: true,
          },
        ]}
        today="2026-11-07"
        analysis={analyzeCycle(logs, "2026-11-07")}
        date="2026-11-07"
        onDateChange={() => {}}
        onSavePeriod={() => ({ ok: true as const, id: "p3" })}
        onSaveDay={() => ({ ok: true as const })}
        onDeleteDay={() => {}}
      />,
    );
    /* A day with advanced content opens the advanced section itself. */
    expect(screen.getByTestId("clots-toggle").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Moderate" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});
