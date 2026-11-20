// @vitest-environment jsdom
/**
 * The paywall sheet: one prompt for every premium boundary. Pinned:
 * it opens on the bus event with the context's own headline, shows
 * the REAL plan prices from the shared constants (either region's —
 * the region is the runtime's, so the assertions accept both), the
 * yearly toggle re-prices honestly, and a checkout attempt while the
 * provider is unconfigured ends in the honest "payments open soon —
 * nothing has been charged" notice, never an error or a fake charge.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/billing/checkout", () => ({
  startCheckout: vi.fn(async () => ({ state: "payments_not_configured" as const })),
  /* The buy action runs the Orders rail; unconfigured is the state
     these tests exercise (the honest "payments open soon" notice). */
  createOrder: vi.fn(async () => ({ state: "payments_not_configured" as const })),
  payWithRazorpay: vi.fn(async () => ({ kind: "dismissed" as const })),
  verifyPayment: vi.fn(async () => false),
}));

/* The entitlement the sheet sees, steered per test. The default is
   "unavailable" — the signed-out state the original tests in this file
   were written against (entitlement null, every card actionable). */
const entitlementMock = vi.hoisted(() => ({
  state: { kind: "unavailable" } as EntitlementState | { kind: "loading" },
}));
vi.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state,
}));

import { PaywallHost, PaywallSheet } from "./PaywallSheet";
import { requestPaywall } from "@/lib/billing/paywall";
import type { EntitlementState } from "@/lib/billing/entitlement";

beforeEach(() => {
  entitlementMock.state = { kind: "unavailable" };
  /* jsdom has no matchMedia; BloomSheet asks it about phone width
     (the same stub the CoachOrb tests use). */
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
});

afterEach(() => cleanup());

const MONTHLY_PREMIUM = /₹599|\$9\.99/;
const YEARLY_PREMIUM = /₹3,999|\$59\.99/;

/** The price line's text (amount + period suffix live in one <p>). */
function priceLines(): string[] {
  return [...document.querySelectorAll(".bill-price")].map((el) => el.textContent ?? "");
}

describe("PaywallHost + PaywallSheet", () => {
  it("stays closed until a paywall is requested, then opens with the context headline", async () => {
    render(<PaywallHost />);
    expect(screen.queryByText("You've used this month's AI credits")).toBeNull();

    await act(async () => {
      requestPaywall("coach_credits");
    });

    expect(screen.getByText("You've used this month's AI credits")).toBeTruthy();
    expect(screen.getByText("Premium")).toBeTruthy();
    expect(screen.getByText("Premium Plus")).toBeTruthy();
    /* The sheet opens on yearly — the better-value period. */
    expect(priceLines()[0]).toMatch(YEARLY_PREMIUM);
    /* The free-keeps-working promise is part of the sheet. */
    expect(screen.getByText(/Free keeps working either way/)).toBeTruthy();
  });

  it("the period toggle re-prices from the same constants, with the yearly saving shown", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });

    /* Yearly (the default) shows the per-month equivalent + saving. */
    expect(priceLines()[0]).toMatch(YEARLY_PREMIUM);
    expect(screen.getAllByText(/Works out to .* a month\./).length).toBe(2);
    expect(screen.getByRole("button", { name: /Yearly/ }).textContent).toMatch(/save \d+%/);

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(priceLines()[0]).toMatch(MONTHLY_PREMIUM);
    expect(screen.queryByText(/Works out to .* a month\./)).toBeNull();
  });

  it("a checkout attempt with no provider configured ends in the honest notice", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("habits_limit");
    });
    expect(screen.getByText("Free includes up to 5 habits")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Go Premium" }));
    });

    const notice = await screen.findByText(/Payments open soon/);
    expect(notice.textContent).toContain("Nothing has been charged.");
  });

  it("renders its content inside the sheet's scroll region, never flush on the panel", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });

    /* The panel is overflow-hidden with a 28px radius and no inset of its
       own; content placed directly inside it is clipped by the rounded
       corners (the eyebrow lost its first letter) and cannot scroll past
       the panel cap. The stack must live inside .bsheet-scroll, inset by
       its own padding — the layout the layout guard pins in the CSS. */
    const stack = document.querySelector(".bill-stack");
    expect(stack).toBeTruthy();
    const scroll = stack!.closest(".bsheet-scroll");
    expect(scroll).toBeTruthy();
    expect(scroll!.closest(".bsheet-panel")).toBeTruthy();
    expect(document.querySelector(".bill-toggle-row .bill-toggle")).toBeTruthy();
  });

  it("different contexts open with their own headline", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("assessment");
    });
    expect(screen.getByText("The Assessment is part of Premium")).toBeTruthy();
  });
});

describe("audit slice A — close, current-plan emphasis, status badges", () => {
  const plusMember = () => {
    entitlementMock.state = {
      kind: "ready",
      entitlement: {
        tier: "premium_plus",
        status: "active",
        currentPeriodEnd: "2027-01-01T00:00:00.000Z",
        creditBalance: 800,
        monthlyAllowance: 800,
        periodStart: null,
      },
    };
  };

  it("carries a visible Close button that dismisses the sheet", async () => {
    const onClose = vi.fn();
    render(<PaywallSheet open onClose={onClose} context="profile" />);
    const close = screen.getByRole("button", { name: "Close" });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("a Premium Plus member's own card carries the featured border, not Premium's", async () => {
    plusMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(screen.getByText(/You're on/)).toBeTruthy();
    const cards = [...document.querySelectorAll(".bill-card")];
    expect(cards.length).toBe(2);
    /* Order is Premium then Premium Plus. The owned Plus card is the
       featured one; the included Premium card is not. */
    expect(cards[0]!.className).not.toContain("bill-card--featured");
    expect(cards[1]!.className).toContain("bill-card--featured");
  });

  it("plan states render as badges, never as buttons", async () => {
    plusMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    for (const label of ["Your current plan", "Included in your plan"]) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
      const badge = screen.getByText(label);
      expect(badge.tagName).not.toBe("BUTTON");
      expect(badge.className).toContain("bill-card-status");
    }
    /* Nothing on either card is an action for a top-tier member. */
    expect(screen.queryByRole("button", { name: "Go Premium" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Upgrade to Plus" })).toBeNull();
  });

  it("a visitor still meets Premium featured, with real action buttons", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    const cards = [...document.querySelectorAll(".bill-card")];
    expect(cards[0]!.className).toContain("bill-card--featured");
    expect(cards[1]!.className).not.toContain("bill-card--featured");
    expect(screen.getByRole("button", { name: "Go Premium" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upgrade to Plus" })).toBeTruthy();
  });
});
