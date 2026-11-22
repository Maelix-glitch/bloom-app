// @vitest-environment jsdom
/**
 * The Weekly Report's Premium Plus gate (M-214): the report is
 * advanced analytics, so a KNOWN entitlement below Plus meets the
 * invitation page and none of the report; Plus and unread
 * entitlements render the report as before. The data hooks are
 * mocked at the module boundary with empty records — the gate is
 * what is under test, not the report's arithmetic (pinned in
 * lib/report tests).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const entitlementState = vi.hoisted(() => ({
  current: { kind: "unavailable" } as { kind: string; entitlement?: Record<string, unknown> },
}));
vi.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => entitlementState.current,
}));
vi.mock("@/hooks/useHabits", () => ({ useHabits: () => ({ habits: [], logs: [] }) }));
vi.mock("@/hooks/useMoodSystem", () => ({ useMoodSystem: () => ({ entries: [] }) }));
vi.mock("@/hooks/useTrackers", () => ({ useTrackers: () => ({ days: [], goals: [] }) }));
vi.mock("@/hooks/usePeriodLog", () => ({
  usePeriodLog: () => ({
    today: "2026-11-22",
    mode: "off",
    analysis: { phase: null, phaseLabel: "", cycleDay: null },
  }),
}));
vi.mock("@/hooks/useCycleVisible", () => ({ useCycleVisible: () => ({ visible: false }) }));
/* The router's Link needs a provider the jsdom render does not
   carry; a plain anchor is its honest stand-in here (the same stub
   NutritionReportPage's tests use). */
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children?: React.ReactNode;
    to?: string;
    [k: string]: unknown;
  }) => (
    <a href={to ?? "/"} {...rest}>
      {children}
    </a>
  ),
}));

import { WeeklyReportPage } from "./WeeklyReportPage";

afterEach(() => {
  cleanup();
  entitlementState.current = { kind: "unavailable" };
});

const readyWith = (tier: string) => ({
  kind: "ready",
  entitlement: {
    tier,
    status: "active",
    currentPeriodEnd: null,
    creditBalance: 300,
    monthlyAllowance: 300,
    periodStart: null,
  },
});

describe("WeeklyReportPage — the Premium Plus gate (M-214)", () => {
  it("Premium meets the invitation, not the report", () => {
    entitlementState.current = readyWith("premium");
    const { container } = render(<WeeklyReportPage />);
    expect(container.textContent).toContain("Your Weekly Report is part of Premium Plus");
    expect(screen.getByRole("button", { name: "See Premium Plus" })).toBeTruthy();
  });

  it("Free meets the invitation too", () => {
    entitlementState.current = readyWith("free");
    const { container } = render(<WeeklyReportPage />);
    expect(container.textContent).toContain("Your Weekly Report is part of Premium Plus");
  });

  it("Premium Plus gets the report page itself", () => {
    entitlementState.current = readyWith("premium_plus");
    const { container } = render(<WeeklyReportPage />);
    expect(container.textContent).not.toContain("Your Weekly Report is part of Premium Plus");
    expect(container.querySelector(".app-shell")).not.toBeNull();
  });

  it("an unread entitlement never blocks the report", () => {
    entitlementState.current = { kind: "unavailable" };
    const { container } = render(<WeeklyReportPage />);
    expect(container.textContent).not.toContain("Your Weekly Report is part of Premium Plus");
  });
});
