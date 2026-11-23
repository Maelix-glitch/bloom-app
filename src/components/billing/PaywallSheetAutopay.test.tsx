// @vitest-environment jsdom
/**
 * M-222 — the paywall sheet on the Autopay rail (CHECKOUT_RAIL =
 * "subscription", the default): the buy action asks the function
 * for a SUBSCRIPTION, opens the modal in subscription mode, and its
 * notices stay honest — "payments open soon" while unconfigured,
 * and once authorised, the renewal truth (it renews automatically
 * until cancelled) in both the success notice and the sheet foot.
 * The Orders-rail suite (PaywallSheet.test.tsx) pins the fallback.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const checkoutMock = vi.hoisted(() => ({
  createSubscription: vi.fn(async () => ({ state: "payments_not_configured" as const })),
  payWithRazorpaySubscription: vi.fn(async () => ({ kind: "dismissed" as const })),
  loadRazorpayCheckout: vi.fn(async () => null),
}));
vi.mock("@/lib/billing/checkout", () => ({
  CHECKOUT_RAIL: "subscription" as const,
  startCheckout: vi.fn(async () => ({ state: "payments_not_configured" as const })),
  createOrder: vi.fn(async () => ({ state: "payments_not_configured" as const })),
  payWithRazorpay: vi.fn(async () => ({ kind: "dismissed" as const })),
  createSubscription: checkoutMock.createSubscription,
  payWithRazorpaySubscription: checkoutMock.payWithRazorpaySubscription,
  verifyPayment: vi.fn(async () => false),
  loadRazorpayCheckout: checkoutMock.loadRazorpayCheckout,
}));

vi.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => ({ kind: "unavailable" }),
}));

import { PaywallHost } from "./PaywallSheet";
import { requestPaywall } from "@/lib/billing/paywall";

beforeEach(() => {
  checkoutMock.createSubscription.mockClear();
  checkoutMock.payWithRazorpaySubscription.mockClear();
  checkoutMock.loadRazorpayCheckout.mockClear();
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
});

afterEach(() => cleanup());

describe("PaywallSheet on the Autopay rail", () => {
  it("the sheet foot tells the renewal truth for this rail", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    const foot = document.querySelector(".bsheet-foot");
    expect(foot?.textContent).toContain("renews automatically each period until you cancel");
    expect(foot?.textContent).not.toContain("nothing is taken automatically");
  });

  it("a buy tap runs the subscription path, and unconfigured ends in the honest notice", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue with Premium" }));
    });
    /* The sheet opens on the yearly period by default. */
    expect(checkoutMock.createSubscription).toHaveBeenCalledWith("premium", "yearly");
    expect(checkoutMock.payWithRazorpaySubscription).not.toHaveBeenCalled();
    const notice = await screen.findByText(/Payments open soon/);
    expect(notice.textContent).toContain("Nothing has been charged.");
  });

  it("an authorised mandate reports the plan switching on — and the auto-renew truth", async () => {
    checkoutMock.createSubscription.mockResolvedValueOnce({
      state: "ready",
      subscriptionId: "sub_77",
      keyId: "rzp_live_x",
    } as never);
    checkoutMock.payWithRazorpaySubscription.mockResolvedValueOnce({
      kind: "authorized",
      paymentId: "pay_9",
      subscriptionId: "sub_77",
    } as never);
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    /* Design A (M-220): selecting the Plus row turns the one gold
       pill into its checkout — the G-era per-column button is gone. */
    fireEvent.click(document.querySelector('[data-plan-row="premium_plus"]')!);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue with Premium Plus" }));
    });
    expect(checkoutMock.payWithRazorpaySubscription).toHaveBeenCalledWith({
      keyId: "rzp_live_x",
      subscriptionId: "sub_77",
      description: "Premium Plus — yearly",
    });
    const notice = await screen.findByText(/Payment received/);
    expect(notice.textContent).toContain("renews automatically each period until you cancel");
  });
});
