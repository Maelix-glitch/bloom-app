// @vitest-environment jsdom
/**
 * The Profile membership card as a status card (rulebook §10.2):
 * identity → live status → action. Pinned: the plan name and the
 * period fact share Row 1 with a truthful verb (a cancelled plan
 * "Ends", it does not "Renews"); the credit balance is the hero with
 * a real meter under it whose fill turns amber at a quarter left and
 * rose at a tenth; Row 3 carries exactly one muted line and the one
 * action; and the unreadable-entitlement state shows no numbers at
 * all. There is no billing-cycle badge — the entitlement carries no
 * cycle field, so the card must not invent one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const entitlementMock = vi.hoisted(() => ({
  state: { kind: "loading" } as UseEntitlementState,
}));
vi.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state,
}));
vi.mock("@/lib/billing/paywall", () => ({
  requestPaywall: vi.fn(),
}));

const checkoutMock = vi.hoisted(() => ({
  cancelAutoRenew: vi.fn(),
}));
vi.mock("@/lib/billing/checkout", () => ({
  cancelAutoRenew: checkoutMock.cancelAutoRenew,
}));

import { PremiumSection } from "./PremiumSection";
import { requestPaywall } from "@/lib/billing/paywall";
import type { UseEntitlementState } from "@/hooks/useEntitlement";
import type { Entitlement } from "@/lib/billing/entitlement";

function ready(entitlement: Partial<Entitlement> & Pick<Entitlement, "tier">): UseEntitlementState {
  return {
    kind: "ready",
    entitlement: {
      status: "active",
      currentPeriodEnd: null,
      creditBalance: 0,
      monthlyAllowance: 0,
      periodStart: null,
      ...entitlement,
    },
  };
}

beforeEach(() => {
  entitlementMock.state = { kind: "loading" };
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe("PremiumSection, the status card", () => {
  it("identity row: plan name, and the renewal fact with its real date", () => {
    entitlementMock.state = ready({
      tier: "premium_plus",
      status: "active",
      currentPeriodEnd: "2126-11-18T12:00:00.000Z",
      creditBalance: 800,
      monthlyAllowance: 800,
    });
    render(<PremiumSection />);

    expect(screen.getByRole("heading", { name: "Premium Plus" })).toBeTruthy();
    const fact = screen.getByText(/Renews/);
    expect(fact.textContent).toContain("18 Nov 2126");
    /* No cycle badge: the entitlement has no monthly/yearly field. */
    expect(screen.queryByText("Yearly")).toBeNull();
    expect(screen.queryByText("Monthly")).toBeNull();
  });

  it("live status: the balance is the hero, the meter beneath reads as a meter", () => {
    entitlementMock.state = ready({
      tier: "premium_plus",
      status: "active",
      currentPeriodEnd: "2126-11-18T12:00:00.000Z",
      creditBalance: 800,
      monthlyAllowance: 800,
    });
    render(<PremiumSection />);

    const value = document.querySelector(".bill-plan-value");
    expect(value?.textContent).toBe("800");
    expect(screen.getByText("of 800")).toBeTruthy();
    const meter = screen.getByRole("meter", { name: "AI credits left this month" });
    expect(meter.getAttribute("aria-valuenow")).toBe("800");
    expect(meter.getAttribute("aria-valuemax")).toBe("800");
    const fill = document.querySelector(".bill-meter-fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
    /* A full meter wears no low-state level. */
    expect(fill.getAttribute("data-level")).toBeNull();
  });

  it("the balance card also says what things cost, the weighted line (M-215)", () => {
    entitlementMock.state = ready({
      tier: "premium",
      status: "active",
      currentPeriodEnd: "2126-11-18T12:00:00.000Z",
      creditBalance: 300,
      monthlyAllowance: 300,
    });
    render(<PremiumSection />);

    const line = screen.getByText(/What uses credits/);
    expect(line.textContent).toContain("a Coach message 1");
    expect(line.textContent).toContain("a food photo 5");
    expect(line.textContent).toContain("a Vitalis plan session 10");
    expect(line.textContent).toContain("voice 1 per 500 characters");
  });

  it("action row: one muted line, and Manage or upgrade opens the paywall", () => {
    entitlementMock.state = ready({
      tier: "premium_plus",
      status: "active",
      currentPeriodEnd: "2126-11-18T12:00:00.000Z",
      creditBalance: 800,
      monthlyAllowance: 800,
    });
    render(<PremiumSection />);

    expect(
      screen.getByText("Deep AI allowance, daily Vitalis conversations and photo-led logging."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Manage or upgrade" }));
    expect(requestPaywall).toHaveBeenCalledWith("profile");
  });

  it("a cancelled plan Ends, it does not Renew", () => {
    entitlementMock.state = ready({
      tier: "premium",
      status: "cancelled",
      currentPeriodEnd: "2026-12-01T12:00:00.000Z",
      creditBalance: 120,
      monthlyAllowance: 300,
    });
    render(<PremiumSection />);

    expect(screen.queryByText(/Renews/)).toBeNull();
    expect(screen.getByText(/Ends/).textContent).toContain("1 Dec 2026");
  });

  it("past due: the Row-3 line is the attention fact, not the tagline", () => {
    entitlementMock.state = ready({
      tier: "premium",
      status: "past_due",
      currentPeriodEnd: "2026-12-01T12:00:00.000Z",
      creditBalance: 300,
      monthlyAllowance: 300,
    });
    render(<PremiumSection />);

    expect(screen.getByText("Payment needs attention.")).toBeTruthy();
    expect(screen.getByText(/Ends/).textContent).toContain("1 Dec 2026");
  });

  it("the meter fill turns amber at a quarter left and rose at a tenth", () => {
    entitlementMock.state = ready({
      tier: "premium_plus",
      creditBalance: 160,
      monthlyAllowance: 800,
    });
    const { unmount } = render(<PremiumSection />);
    expect(
      (document.querySelector(".bill-meter-fill") as HTMLElement).getAttribute("data-level"),
    ).toBe("low");
    unmount();

    entitlementMock.state = ready({
      tier: "premium_plus",
      creditBalance: 40,
      monthlyAllowance: 800,
    });
    render(<PremiumSection />);
    expect(
      (document.querySelector(".bill-meter-fill") as HTMLElement).getAttribute("data-level"),
    ).toBe("empty");
  });

  it("free: no period fact, the free line, and See Premium plans", () => {
    entitlementMock.state = ready({
      tier: "free",
      status: "none",
      currentPeriodEnd: null,
      creditBalance: 20,
      monthlyAllowance: 20,
    });
    render(<PremiumSection />);

    expect(screen.getByRole("heading", { name: "Free" })).toBeTruthy();
    expect(screen.queryByText(/Renews|Ends/)).toBeNull();
    expect(screen.getByText("The everyday Bloom, with a monthly taste of the AI.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "See Premium plans" })).toBeTruthy();
  });

  it("unavailable: no numbers are invented, just the invitation", () => {
    entitlementMock.state = { kind: "unavailable" };
    render(<PremiumSection />);

    expect(screen.getByRole("heading", { name: "Bloom Premium" })).toBeTruthy();
    expect(screen.queryByRole("meter")).toBeNull();
    expect(screen.queryByText(/AI credits left/)).toBeNull();
    expect(screen.getByRole("button", { name: "See what Premium includes" })).toBeTruthy();
  });

  it("loading: the plan is on its way, nothing is shown early", () => {
    entitlementMock.state = { kind: "loading" };
    render(<PremiumSection />);

    expect(screen.getByText("Loading your plan…")).toBeTruthy();
    expect(screen.queryByRole("meter")).toBeNull();
  });
});

describe("PremiumSection, cancel auto-renew (M-222)", () => {
  it("a live paid plan offers it; cancelling answers with the period-end truth", async () => {
    checkoutMock.cancelAutoRenew.mockResolvedValue({
      state: "cancel_scheduled",
      periodEnd: "2027-01-15T00:00:00.000Z",
    });
    entitlementMock.state = ready({
      tier: "premium",
      status: "active",
      currentPeriodEnd: "2027-01-15T00:00:00.000Z",
      creditBalance: 300,
      monthlyAllowance: 300,
    });
    render(<PremiumSection />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel auto-renew" }));
    const note = await screen.findByText(/Auto-renew is off/);
    expect(note.textContent).toContain("15 Jan 2027");
    expect(note.textContent).toContain("nothing is charged after that");
    /* The button is gone once the outcome is stated. */
    expect(screen.queryByRole("button", { name: "Cancel auto-renew" })).toBeNull();
  });

  it("no auto-renewing subscription is stated plainly, not as an error", async () => {
    checkoutMock.cancelAutoRenew.mockResolvedValue({ state: "no_active_subscription" });
    entitlementMock.state = ready({
      tier: "premium_plus",
      status: "active",
      currentPeriodEnd: "2126-11-18T12:00:00.000Z",
      creditBalance: 800,
      monthlyAllowance: 800,
    });
    render(<PremiumSection />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel auto-renew" }));
    const note = await screen.findByText(/No auto-renewing subscription was found/);
    expect(note.textContent).toContain("nothing to cancel");
  });

  it("free and non-active plans never offer it", () => {
    entitlementMock.state = ready({ tier: "free", status: "none", creditBalance: 20, monthlyAllowance: 20 });
    render(<PremiumSection />);
    expect(screen.queryByRole("button", { name: "Cancel auto-renew" })).toBeNull();
    cleanup();

    entitlementMock.state = ready({
      tier: "premium",
      status: "cancelled",
      currentPeriodEnd: "2027-01-15T00:00:00.000Z",
      creditBalance: 300,
      monthlyAllowance: 300,
    });
    render(<PremiumSection />);
    expect(screen.queryByRole("button", { name: "Cancel auto-renew" })).toBeNull();
  });
});
