// @vitest-environment jsdom
/**
 * The paywall sheet: one prompt for every premium boundary. Pinned:
 * it opens on the bus event with the context's own headline, shows
 * the REAL plan prices from the shared constants (either region's —
 * the region is the runtime's, so the assertions accept both), the
 * yearly toggle re-prices honestly, and a checkout attempt while the
 * provider is unconfigured ends in the honest "payments open soon —
 * nothing has been charged" notice, never an error or a fake charge.
 *
 * M-220: the composition is design A, "The Invitation" (owner pick,
 * 2026-11-23) — the preview's three plan rows with radio marks, one
 * gold pill CTA whose label follows the selection, and the owner's
 * amendment: the selected row opens a glass drop-down listing what
 * is included (PAYWALL_BULLETS from lib/billing/plans). The G-era
 * pins (the shared ledger, the column heads, per-column buttons)
 * were rewritten for the rows where the composition legitimately
 * changed; prices, contexts, checkout states and the close are
 * unchanged behaviour and keep their pins.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

/* Hoisted so the M-217 pins can count calls and steer single
   calls; the defaults are the states the older tests exercise. */
const checkoutMock = vi.hoisted(() => ({
  /* The buy action runs the Orders rail; unconfigured is the state
     these tests exercise (the honest "payments open soon" notice). */
  createOrder: vi.fn(async () => ({ state: "payments_not_configured" as const })),
  payWithRazorpay: vi.fn(async () => ({ kind: "dismissed" as const })),
  loadRazorpayCheckout: vi.fn(async () => null),
}));
vi.mock("@/lib/billing/checkout", () => ({
  startCheckout: vi.fn(async () => ({ state: "payments_not_configured" as const })),
  createOrder: checkoutMock.createOrder,
  payWithRazorpay: checkoutMock.payWithRazorpay,
  verifyPayment: vi.fn(async () => false),
  loadRazorpayCheckout: checkoutMock.loadRazorpayCheckout,
}));

/* The entitlement the sheet sees, steered per test. The default is
   "unavailable" — the signed-out state the original tests in this file
   were written against (entitlement null, every plan actionable). */
const entitlementMock = vi.hoisted(() => ({
  state: { kind: "unavailable" } as EntitlementState | { kind: "loading" },
}));
vi.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state,
}));

import { PaywallHost, PaywallSheet } from "./PaywallSheet";
import { requestPaywall } from "@/lib/billing/paywall";
import { PAYWALL_BULLETS, TIER_ORDER, type PlanTier } from "@/lib/billing/plans";
import type { EntitlementState } from "@/lib/billing/entitlement";

beforeEach(() => {
  entitlementMock.state = { kind: "unavailable" };
  /* Call counts are per test; implementations are the hoisted
     defaults unless a test steers one call with a *Once method. */
  checkoutMock.createOrder.mockClear();
  checkoutMock.payWithRazorpay.mockClear();
  checkoutMock.loadRazorpayCheckout.mockClear();
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
const YEARLY_PREMIUM = /₹4,999|\$59\.99/;
const MONTHLY_PLUS = /₹999|\$14\.99/;
const YEARLY_PLUS = /₹9,999|\$89\.99/;

/** Design A's three plan rows, in TIER_ORDER. */
function rows(): Element[] {
  return [...document.querySelectorAll("[data-plan-row]")];
}

function rowFor(tier: PlanTier): Element {
  const row = document.querySelector(`[data-plan-row="${tier}"]`);
  expect(row, `plan row "${tier}"`).toBeTruthy();
  return row!;
}

/** The price block's text (amount + per line live in one span). */
function priceText(tier: PlanTier): string {
  return rowFor(tier).querySelector(".bill-a-price")?.textContent ?? "";
}

/** The glass drop-down currently open, if any. */
function openIncludes(): Element | null {
  return document.querySelector("[data-includes-for]");
}

describe("PaywallHost + PaywallSheet", () => {
  it("stays closed until a paywall is requested, then opens with the A head and the context headline", async () => {
    render(<PaywallHost />);
    expect(screen.queryByText("You've used this month's AI credits")).toBeNull();

    await act(async () => {
      requestPaywall("coach_credits");
    });

    /* Design A's own head (owner-approved preview, 2026-11-23). */
    expect(screen.getByText("Bloom Membership")).toBeTruthy();
    expect(document.querySelector(".bill-a-title")!.textContent).toContain("full bloom.");
    expect(screen.getByText(/Choose how much of Bloom you want/)).toBeTruthy();
    /* The context's specific headline still opens the story, in the
       context strip under the A head. */
    expect(screen.getByText("You've used this month's AI credits")).toBeTruthy();
    /* Three rows, in tier order; Premium is the pre-selected row. */
    expect(rows().map((r) => r.getAttribute("data-plan-row"))).toEqual(TIER_ORDER);
    expect(rowFor("premium").getAttribute("aria-checked")).toBe("true");
    expect(rowFor("premium_plus").getAttribute("aria-checked")).toBe("false");
    /* The sheet opens on yearly — the better-value period. */
    expect(priceText("premium")).toMatch(YEARLY_PREMIUM);
    expect(priceText("premium_plus")).toMatch(YEARLY_PLUS);
    expect(priceText("free")).toContain("forever");
    /* The free-keeps-working promise is part of the sheet. */
    expect(screen.getByText(/Free keeps working either way/)).toBeTruthy();
  });

  it("the sheet says what a credit buys — the weighted line (M-215), in the foot zone", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("coach_credits");
    });

    const line = screen.getByText(/What uses credits/);
    expect(line.textContent).toContain("a food photo 5");
    expect(line.textContent).toContain("a Vitalis plan session 10");
    /* M-220: design A's column has no room for the line, so it rides
       in the always-visible foot zone (the brief's placement). */
    expect(line.closest(".bsheet-foot")).toBeTruthy();
  });

  it("the period toggle re-prices from the same constants, with the yearly saving shown", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });

    /* Yearly (the default) shows the per-month equivalent in each
       row's per line, and design A's own saving note beside the
       toggle (India: ₹2,189 on Premium · ₹1,989 on Plus). */
    expect(priceText("premium")).toMatch(YEARLY_PREMIUM);
    expect(priceText("premium_plus")).toMatch(YEARLY_PLUS);
    expect(priceText("premium")).toMatch(/₹417\/mo|\$5\.00\/mo/);
    expect(priceText("premium_plus")).toMatch(/₹833\/mo|\$7\.50\/mo/);
    expect(screen.getByText(/Yearly saves .* on Premium · .* on Plus/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(priceText("premium")).toMatch(MONTHLY_PREMIUM);
    expect(priceText("premium_plus")).toMatch(MONTHLY_PLUS);
    expect(priceText("premium")).toContain("per month");
    /* M-214: the tiers save different shares, so the monthly note
       states the best one, labelled "up to". */
    expect(screen.getByText(/Switch to yearly to save up to \d+%/)).toBeTruthy();
  });

  it("a checkout attempt with no provider configured ends in the honest notice", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("habits_limit");
    });
    expect(screen.getByText("Free includes up to 5 habits")).toBeTruthy();

    /* Premium is the pre-selected row, so the one gold pill is its. */
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue with Premium" }));
    });

    const notice = await screen.findByText(/Payments open soon/);
    expect(notice.textContent).toContain("Nothing has been charged.");
  });

  it("selecting the Plus row turns the pill into its checkout", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });

    fireEvent.click(rowFor("premium_plus"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue with Premium Plus" }));
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
    expect(document.querySelector(".bill-a-period .bill-toggle")).toBeTruthy();
    /* The panel wears design A's ground, and the glows ride in it. */
    expect(scroll!.closest(".bsheet-panel")!.className).toContain("bill-a-panel");
    expect(document.querySelector(".bsheet-panel .bill-a-glows")).toBeTruthy();
  });

  it("different contexts open with their own headline", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("assessment");
    });
    expect(screen.getByText("The Assessment is part of Premium")).toBeTruthy();
  });

  it("the closing honesty lines live in the foot zone, whole", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    const foot = document.querySelector(".bsheet-foot");
    expect(foot).toBeTruthy();
    /* The foot zone is outside the scroll region — the cap can never
       slice these lines (M-202 pattern). */
    expect(foot!.closest(".bsheet-scroll")).toBeNull();
    expect(foot!.textContent).toContain("Payments are handled securely by Razorpay");
    expect(foot!.textContent).toContain("UPI, cards and netbanking");
    expect(foot!.textContent).toContain("Renewals are charged manually in this version");
    expect(foot!.textContent).toContain("nothing is taken automatically");
  });
});

describe("M-220 — design A rows and the glass drop-down", () => {
  it("the selected row's drop-down lists that plan's inclusions from plans.ts", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    /* Premium is pre-selected: its drop-down is open, listing
       PAYWALL_BULLETS verbatim, and no other plan's is. */
    const panel = openIncludes();
    expect(panel).toBeTruthy();
    expect(panel!.getAttribute("data-includes-for")).toBe("premium");
    for (const bullet of PAYWALL_BULLETS.premium) {
      expect(panel!.textContent).toContain(bullet);
    }
    expect(document.querySelectorAll("[data-includes-for]").length).toBe(1);

    /* Selecting Plus moves the drop-down to Plus's own list. */
    fireEvent.click(rowFor("premium_plus"));
    const plusPanel = openIncludes();
    expect(plusPanel!.getAttribute("data-includes-for")).toBe("premium_plus");
    for (const bullet of PAYWALL_BULLETS.premium_plus) {
      expect(plusPanel!.textContent).toContain(bullet);
    }
    expect(plusPanel!.textContent).not.toContain(PAYWALL_BULLETS.premium[1]!);
  });

  it("the drop-down wears the glass material — the owner's one in-sheet exception", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    const panel = openIncludes();
    expect(panel!.className).toContain("glass-panel");
    expect(panel!.className).toContain("bill-a-includes");
    /* It expands directly under its row, inside the rows group. */
    expect(panel!.closest(".bill-a-rows")).toBeTruthy();
    expect(rowFor("premium").parentElement!.contains(panel)).toBe(true);
  });

  it("the Free row's drop-down is assembled from the same authorities, and its pill just stays", async () => {
    const onClose = vi.fn();
    render(<PaywallSheet open onClose={onClose} context="profile" />);
    fireEvent.click(rowFor("free"));
    const panel = openIncludes();
    expect(panel!.getAttribute("data-includes-for")).toBe("free");
    expect(panel!.textContent).toContain("Up to 5 habits");
    expect(panel!.textContent).toContain("Trackers & mood");
    expect(panel!.textContent).toContain("Basic Stories templates");
    expect(panel!.textContent).toContain("20 AI credits a month");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Stay on Free" }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(checkoutMock.createOrder).not.toHaveBeenCalled();
  });

  it("a Plus-bound context pre-selects the Plus row; a neutral one pre-selects Premium", async () => {
    const onClose = vi.fn();
    const { unmount } = render(<PaywallSheet open onClose={onClose} context="vitalis_plus" />);
    expect(rowFor("premium_plus").getAttribute("aria-checked")).toBe("true");
    expect(rowFor("premium").getAttribute("aria-checked")).toBe("false");
    unmount();
    render(<PaywallSheet open onClose={onClose} context="profile" />);
    expect(rowFor("premium").getAttribute("aria-checked")).toBe("true");
  });

  it("the rows carry the preview's pills — Most popular on Premium, Vitalis on Plus", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(rowFor("premium").textContent).toContain("Most popular");
    expect(rowFor("premium_plus").textContent).toContain("Vitalis");
    expect(rowFor("free").textContent).not.toContain("Most popular");
  });
});

describe("audit slice A — close, current-plan marking, plan states", () => {
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
  const premiumMember = () => {
    entitlementMock.state = {
      kind: "ready",
      entitlement: {
        tier: "premium",
        status: "active",
        currentPeriodEnd: "2027-01-01T00:00:00.000Z",
        creditBalance: 300,
        monthlyAllowance: 300,
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

  it("a Premium Plus member's own row is the marked one, not Premium's", async () => {
    plusMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    /* M-205 (F-37) re-contract: a paid member's banner no longer
       repeats "You're on …" — the row's "Your plan" mark is the
       single current-plan claim; the banner leads with credits. */
    expect(screen.getByText(/800 AI credits left this month/)).toBeTruthy();
    expect(screen.queryByText(/You're on/)).toBeNull();
    expect(rowFor("premium_plus").textContent).toContain("Your plan");
    expect(rowFor("premium_plus").getAttribute("aria-checked")).toBe("true");
    expect(rowFor("premium").textContent).not.toContain("Your plan");
  });

  it("plan states are a disabled pill in the state treatment, never a gold action", async () => {
    plusMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    /* Design A keeps ONE pill under the rows; a state is that pill
       DISABLED in the sage state treatment — it cannot be tapped
       and does not wear the gold action fill. */
    const mine = screen.getByRole("button", { name: "Your plan" }) as HTMLButtonElement;
    expect(mine.disabled).toBe(true);
    expect(mine.className).toContain("bill-a-cta--state");

    fireEvent.click(rowFor("premium"));
    const included = screen.getByRole("button", {
      name: "Included in your plan",
    }) as HTMLButtonElement;
    expect(included.disabled).toBe(true);
    expect(included.className).toContain("bill-a-cta--state");
    expect(screen.queryByRole("button", { name: /Continue with/ })).toBeNull();
  });

  it("a Premium member's own pill is disabled; selecting Plus keeps the pill live", async () => {
    premiumMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(rowFor("premium").textContent).toContain("Your plan");
    const mine = screen.getByRole("button", { name: "Your plan" }) as HTMLButtonElement;
    expect(mine.disabled).toBe(true);

    fireEvent.click(rowFor("premium_plus"));
    const plus = screen.getByRole("button", {
      name: "Continue with Premium Plus",
    }) as HTMLButtonElement;
    expect(plus.disabled).toBe(false);
    expect(plus.className).not.toContain("bill-a-cta--state");
  });

  it("a top-tier member gets exactly one clear action: manage the membership (M-205, F-37)", async () => {
    plusMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(screen.getByRole("button", { name: "Manage your membership" })).toBeTruthy();
    /* The rows still render whole for a top-tier member — the
       invitation is the sheet's content, whoever opens it. */
    expect(rows().length).toBe(3);
  });

  it("a visitor gets no manage action — the pill carries the action (M-205, F-37)", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(screen.queryByRole("button", { name: "Manage your membership" })).toBeNull();
  });

  it("a visitor meets the pill live on Premium, and no row is marked as anyone's plan", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    const cta = screen.getByRole("button", {
      name: "Continue with Premium",
    }) as HTMLButtonElement;
    expect(cta.disabled).toBe(false);
    expect(cta.className).not.toContain("bill-a-cta--state");
    expect(screen.queryByText("Your plan")).toBeNull();
  });
});

describe("M-217 — the checkout window opens fast", () => {
  it("opening the sheet preloads checkout.js exactly once; closed, never", async () => {
    render(<PaywallHost />);
    /* Closed: the loader has not been touched. */
    expect(checkoutMock.loadRazorpayCheckout).not.toHaveBeenCalled();

    await act(async () => {
      requestPaywall("profile");
    });
    /* One open, one preload — the script downloads while the
       member reads the plans. */
    expect(checkoutMock.loadRazorpayCheckout).toHaveBeenCalledTimes(1);
  });

  it("at tap, the script load starts before the order settles", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(checkoutMock.loadRazorpayCheckout).toHaveBeenCalledTimes(1);

    /* The order round trip hangs — the tap must not wait for it
       before starting the script load. */
    let settleOrder!: (v: { state: "payments_not_configured" }) => void;
    const orderPromise = new Promise<{ state: "payments_not_configured" }>((resolve) => {
      settleOrder = resolve;
    });
    checkoutMock.createOrder.mockImplementationOnce(() => orderPromise);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue with Premium" }));
    });
    /* Order still in flight, yet the loader has been started again
       (the cached promise), and the modal step has not run yet. */
    expect(checkoutMock.loadRazorpayCheckout).toHaveBeenCalledTimes(2);
    expect(checkoutMock.payWithRazorpay).not.toHaveBeenCalled();

    await act(async () => {
      settleOrder({ state: "payments_not_configured" });
    });
    const notice = await screen.findByText(/Payments open soon/);
    expect(notice.textContent).toContain("Nothing has been charged.");
  });

  it("a failed preload stays silent, and the tap still reaches the honest unavailable state", async () => {
    /* The preload REJECTS — the sheet must swallow it (no error
       surfaces on open)… */
    checkoutMock.loadRazorpayCheckout.mockRejectedValueOnce(new Error("offline"));
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(document.querySelector(".bill-a-title")).toBeTruthy();
    expect(screen.queryByText(/couldn't load/)).toBeNull();

    /* …and when the tap's own load genuinely cannot produce the
       modal, the same unavailable copy as before is what shows. */
    checkoutMock.createOrder.mockResolvedValueOnce({
      state: "ready",
      orderId: "order_1",
      amount: 499900,
      currency: "INR",
      keyId: "rzp_test_key",
    } as never);
    checkoutMock.payWithRazorpay.mockResolvedValueOnce({ kind: "unavailable" } as never);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continue with Premium" }));
    });
    const notice = await screen.findByText(/The secure payment window couldn't load/);
    expect(notice.textContent).toContain("Nothing has been charged.");
  });
});
