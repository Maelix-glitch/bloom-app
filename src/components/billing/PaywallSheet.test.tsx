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
}));

import { PaywallHost } from "./PaywallSheet";
import { requestPaywall } from "@/lib/billing/paywall";

beforeEach(() => {
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

  it("different contexts open with their own headline", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("assessment");
    });
    expect(screen.getByText("The Assessment is part of Premium")).toBeTruthy();
  });
});
