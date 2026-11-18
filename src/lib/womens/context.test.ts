/**
 * Women's Health — cycle context builder.
 *
 * The pins that matter:
 *   · availability is earned by the record — paused/off, empty and
 *     fallback-only records produce `unavailable` with a reason, never a
 *     dressed-up guess (no phase is fabricated);
 *   · the engine's confidence passes through verbatim — never upgraded;
 *   · phase / cycle day / next window are the prediction module's own
 *     values, checked against analyzeCycle itself;
 *   · the context never carries a fertile window (Bloom is not a
 *     contraceptive tool).
 */

import { describe, expect, it } from "vitest";

import { analyzeCycle, type PeriodLog } from "@/lib/cycle/predict";
import { buildCycleContext } from "./context";

const TODAY = "2026-09-07";
const log = (id: string, start: string): PeriodLog => ({ id, start, end: null, flow: "medium" });

/** Four steady 28-day cycles; the latest started 2026-08-24 (day 15 today). */
const STEADY: PeriodLog[] = [
  log("a", "2026-05-04"),
  log("b", "2026-06-01"),
  log("c", "2026-06-29"),
  log("d", "2026-07-27"),
  log("e", "2026-08-24"),
];

/** Three cycles of 27/30/28 days — a real but still-settling pattern. */
const SETTLING: PeriodLog[] = [
  log("a", "2026-05-27"),
  log("b", "2026-06-23"),
  log("c", "2026-07-23"),
  log("d", "2026-08-20"),
];

/** Two very different cycles (26, 34) — a rough guide at best. */
const ROUGH: PeriodLog[] = [log("a", "2026-06-16"), log("b", "2026-07-12"), log("c", "2026-08-15")];

describe("buildCycleContext · available", () => {
  it("steady record: phase, day and window are the engine's own values", () => {
    const engine = analyzeCycle(STEADY, TODAY);
    const ctx = buildCycleContext({ logs: STEADY, today: TODAY, mode: "tracking" });
    expect(ctx.state).toBe("available");
    if (ctx.state !== "available") return;
    expect(engine.confidence).toBe("high");
    expect(ctx.confidence).toBe("high");
    expect(ctx.phase).toBe(engine.phase);
    expect(ctx.phaseLabel).toBe(engine.phaseLabel);
    expect(ctx.cycleDay).toBe(engine.cycleDay);
    expect(ctx.cycleDay).toBe(15);
    expect(ctx.confidenceReason).toBe(engine.confidenceReason);
    expect(ctx.nextStart).toBe("2026-09-21");
    /* high confidence: the single estimated date, no padded range */
    expect(ctx.nextWindow).toEqual({ from: "2026-09-21", to: "2026-09-21", spread: 0 });
    expect(ctx.note.length).toBeGreaterThan(0);
    expect(ctx.basis).toMatch(/your own logged cycle/i);
  });

  it("settling record: medium confidence passes through, window stays a range", () => {
    const engine = analyzeCycle(SETTLING, TODAY);
    const ctx = buildCycleContext({ logs: SETTLING, today: TODAY, mode: "tracking" });
    expect(ctx.state).toBe("available");
    if (ctx.state !== "available") return;
    expect(engine.confidence).toBe("medium");
    expect(ctx.confidence).toBe("medium");
    expect(ctx.phase).toBe("luteal");
    expect(ctx.nextWindow).toEqual(engine.nextWindow);
    expect(ctx.nextWindow!.from < ctx.nextStart!).toBe(true);
    expect(ctx.nextWindow!.to > ctx.nextStart!).toBe(true);
  });

  it("rough record: low confidence is shown as low — never upgraded", () => {
    const engine = analyzeCycle(ROUGH, TODAY);
    const ctx = buildCycleContext({ logs: ROUGH, today: TODAY, mode: "tracking" });
    expect(ctx.state).toBe("available");
    if (ctx.state !== "available") return;
    expect(engine.confidence).toBe("low");
    expect(ctx.confidence).toBe("low");
    expect(ctx.nextWindow).toEqual(engine.nextWindow);
    expect(ctx.nextWindow!.spread).toBe(4);
  });

  it("never carries a fertile window or ovulation date", () => {
    const ctx = buildCycleContext({ logs: STEADY, today: TODAY, mode: "tracking" });
    expect(ctx.state).toBe("available");
    const keys = Object.keys(ctx);
    expect(keys).not.toContain("fertileStart");
    expect(keys).not.toContain("fertileEnd");
    expect(keys).not.toContain("fertileWindow");
    expect(keys).not.toContain("ovulationDate");
  });
});

describe("buildCycleContext · unavailable — nothing is fabricated", () => {
  it("tracking off: no context even with a rich history", () => {
    const ctx = buildCycleContext({ logs: STEADY, today: TODAY, mode: "off" });
    expect(ctx.state).toBe("unavailable");
    if (ctx.state !== "unavailable") return;
    expect(ctx.reason).toBe("tracking-off");
    expect("phase" in ctx).toBe(false);
    expect("cycleDay" in ctx).toBe(false);
  });

  it("tracking paused: no context, history untouched", () => {
    const ctx = buildCycleContext({ logs: STEADY, today: TODAY, mode: "paused" });
    expect(ctx.state).toBe("unavailable");
    if (ctx.state !== "unavailable") return;
    expect(ctx.reason).toBe("tracking-paused");
    expect("phase" in ctx).toBe(false);
  });

  it("nothing logged: unavailable with the reason, not a generic phase", () => {
    const ctx = buildCycleContext({ logs: [], today: TODAY, mode: "tracking" });
    expect(ctx.state).toBe("unavailable");
    if (ctx.state !== "unavailable") return;
    expect(ctx.reason).toBe("no-entries");
    expect("phase" in ctx).toBe(false);
  });

  it("one entry only: the population fallback is NOT presented as her pattern", () => {
    const one = [log("a", "2026-08-24")];
    /* the engine itself confirms this record carries no personal confidence */
    expect(analyzeCycle(one, TODAY).confidence).toBe("none");
    const ctx = buildCycleContext({ logs: one, today: TODAY, mode: "tracking" });
    expect(ctx.state).toBe("unavailable");
    if (ctx.state !== "unavailable") return;
    expect(ctx.reason).toBe("not-personalised");
    expect("phase" in ctx).toBe(false);
    expect("confidence" in ctx).toBe(false);
  });

  it("entries with no usable cycle length: still not personalised", () => {
    const thin = [log("a", "2026-08-20"), log("b", "2026-08-30")]; // 10 days apart — implausible gap
    expect(analyzeCycle(thin, TODAY).isGeneric).toBe(true);
    const ctx = buildCycleContext({ logs: thin, today: TODAY, mode: "tracking" });
    expect(ctx.state).toBe("unavailable");
    if (ctx.state !== "unavailable") return;
    expect(ctx.reason).toBe("not-personalised");
  });
});
