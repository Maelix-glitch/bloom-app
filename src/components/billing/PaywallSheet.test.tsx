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
 * M-216: the composition is design G, "The Comparison" (owner pick,
 * 2026-11-22) — one shared feature ledger under two column heads,
 * driven by PAYWALL_COMPARISON in lib/billing/plans. The card-era
 * pins (per-card bullets, the featured card, status badges) were
 * rewritten for the ledger where the composition legitimately
 * changed; prices, contexts, checkout states and the close are
 * unchanged behaviour and keep their pins.
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
   were written against (entitlement null, every column actionable). */
const entitlementMock = vi.hoisted(() => ({
  state: { kind: "unavailable" } as EntitlementState | { kind: "loading" },
}));
vi.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => entitlementMock.state,
}));

import { PaywallHost, PaywallSheet } from "./PaywallSheet";
import { requestPaywall } from "@/lib/billing/paywall";
import { PAYWALL_COMPARISON, comparisonHas } from "@/lib/billing/plans";
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
const YEARLY_PREMIUM = /₹4,999|\$59\.99/;
const MONTHLY_PLUS = /₹999|\$14\.99/;
const YEARLY_PLUS = /₹9,999|\$89\.99/;

/** The price line's text (amount + period suffix live in one <p>). */
function priceLines(): string[] {
  return [...document.querySelectorAll(".bill-price")].map((el) => el.textContent ?? "");
}

/** The two G column heads, Premium first. */
function heads(): Element[] {
  return [...document.querySelectorAll(".bill-g-head")];
}

/** One ledger row by its feature label. */
function ledgerRow(label: string): Element {
  const row = [...document.querySelectorAll("[data-comparison-row]")].find(
    (el) => el.getAttribute("data-comparison-row") === label,
  );
  expect(row, `ledger row "${label}"`).toBeTruthy();
  return row!;
}

/** One ledger cell: data-included is the tick/dash truth. */
function cell(row: Element, tier: "premium" | "premium_plus"): Element {
  const c = row.querySelector(`[data-tier="${tier}"]`);
  expect(c, `cell ${tier}`).toBeTruthy();
  return c!;
}

describe("PaywallHost + PaywallSheet", () => {
  it("stays closed until a paywall is requested, then opens with the G head and the context headline", async () => {
    render(<PaywallHost />);
    expect(screen.queryByText("You've used this month's AI credits")).toBeNull();

    await act(async () => {
      requestPaywall("coach_credits");
    });

    /* Design G's own head (owner-approved preview, round 2). */
    expect(screen.getByText("Bloom Membership")).toBeTruthy();
    expect(screen.getByText("Two plans. One ledger.")).toBeTruthy();
    expect(screen.getByText(/Every feature, side by side/)).toBeTruthy();
    /* The context's specific headline still opens the story, in the
       context strip under the G head. */
    expect(screen.getByText("You've used this month's AI credits")).toBeTruthy();
    expect(heads().length).toBe(2);
    expect(heads()[0]!.textContent).toContain("Premium");
    expect(heads()[1]!.textContent).toContain("Premium Plus");
    /* The sheet opens on yearly — the better-value period. */
    expect(priceLines()[0]).toMatch(YEARLY_PREMIUM);
    expect(priceLines()[1]).toMatch(YEARLY_PLUS);
    /* The free-keeps-working promise is part of the sheet. */
    expect(screen.getByText(/Free keeps working either way/)).toBeTruthy();
  });

  it("the sheet says what a credit buys — the weighted line (M-215)", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("coach_credits");
    });

    const line = screen.getByText(/What uses credits/);
    expect(line.textContent).toContain("a food photo 5");
    expect(line.textContent).toContain("a Vitalis plan session 10");
  });

  it("the period toggle re-prices from the same constants, with the yearly saving shown", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });

    /* Yearly (the default) shows the per-month equivalent + saving. */
    expect(priceLines()[0]).toMatch(YEARLY_PREMIUM);
    expect(priceLines()[1]).toMatch(YEARLY_PLUS);
    const equivalents = screen.getAllByText(/Works out to .* a month\./);
    expect(equivalents.length).toBe(2);
    expect(equivalents[0]!.textContent).toMatch(/₹417|\$5\.00/);
    expect(equivalents[1]!.textContent).toMatch(/₹833|\$7\.50/);
    /* M-214: the tiers save different shares now, so the toggle
       states the best one, labelled "up to". */
    expect(screen.getByRole("button", { name: /Yearly/ }).textContent).toMatch(/save up to \d+%/);

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    expect(priceLines()[0]).toMatch(MONTHLY_PREMIUM);
    expect(priceLines()[1]).toMatch(MONTHLY_PLUS);
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

  it("the Plus column's button runs the same checkout flow", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Go Premium Plus" }));
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

describe("M-216 — the comparison ledger (design G)", () => {
  it("renders every row of PAYWALL_COMPARISON, in order, exactly once", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    const labels = [...document.querySelectorAll("[data-comparison-row]")].map((el) =>
      el.getAttribute("data-comparison-row"),
    );
    expect(labels).toEqual(PAYWALL_COMPARISON.map((r) => r.label));
  });

  it("every cell's tick or dash matches the tier truth in plans.ts", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    for (const row of PAYWALL_COMPARISON) {
      const el = ledgerRow(row.label);
      for (const tier of ["premium", "premium_plus"] as const) {
        const c = cell(el, tier);
        const included = comparisonHas(row, tier);
        expect(c.getAttribute("data-included"), `${row.label} / ${tier}`).toBe(String(included));
        /* A tick is an SVG check; a dash is the muted em dash — never
           a tick wearing a dash's colour or vice versa. */
        expect(c.querySelector("svg") !== null, `${row.label} / ${tier} tick`).toBe(included);
        expect(c.textContent).toContain(included ? "Included" : "Not included");
      }
    }
  });

  it("a Plus-only row can never show a Premium tick (the M-214 split, in the ledger)", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    for (const label of [
      "Vitalis AI + daily voice",
      "Plans that adapt and learn",
      "Metabolic Twin",
      "Advanced analytics & reports",
      "Photo-led logging",
      "Stories premium templates",
      "Priority features",
    ]) {
      const row = ledgerRow(label);
      expect(cell(row, "premium").getAttribute("data-included")).toBe("false");
      expect(cell(row, "premium_plus").getAttribute("data-included")).toBe("true");
    }
    /* …and the shared essentials tick under both. */
    for (const label of [
      "Unlimited habits",
      "Coach chat",
      "Food-photo analysis",
      "Assessment + standard plan",
      "Grocery list",
      "Trackers & mood",
      "Basic Stories templates",
    ]) {
      const row = ledgerRow(label);
      expect(cell(row, "premium").getAttribute("data-included")).toBe("true");
      expect(cell(row, "premium_plus").getAttribute("data-included")).toBe("true");
    }
  });

  it("the column heads carry the credit lines and Plus carries Most loved", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(heads()[0]!.textContent).toContain("300 AI credits a month");
    expect(heads()[1]!.textContent).toContain("800 AI credits a month");
    expect(heads()[1]!.textContent).toContain("Most loved");
    expect(heads()[0]!.textContent).not.toContain("Most loved");
    /* The ledger's own column names ride above the cells. */
    const ledgerHead = document.querySelector(".bill-g-row--head");
    expect(ledgerHead).toBeTruthy();
    expect(ledgerHead!.textContent).toContain("Premium");
    expect(ledgerHead!.textContent).toContain("Plus");
  });

  it("a Plus-bound context spotlights the Plus column; a neutral one does not", async () => {
    const onClose = vi.fn();
    const { unmount } = render(<PaywallSheet open onClose={onClose} context="vitalis_plus" />);
    expect(heads()[1]!.className).toContain("bill-g-head--spotlight");
    expect(heads()[0]!.className).not.toContain("bill-g-head--spotlight");
    unmount();
    render(<PaywallSheet open onClose={onClose} context="profile" />);
    expect(heads()[1]!.className).not.toContain("bill-g-head--spotlight");
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

  it("a Premium Plus member's own column is the marked one, not Premium's", async () => {
    plusMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    /* M-205 (F-37) re-contract: a paid member's banner no longer
       repeats "You're on …" — the column's "Your plan" mark is the
       single current-plan claim; the banner leads with credits. */
    expect(screen.getByText(/800 AI credits left this month/)).toBeTruthy();
    expect(screen.queryByText(/You're on/)).toBeNull();
    expect(heads().length).toBe(2);
    expect(heads()[1]!.className).toContain("bill-g-head--mine");
    expect(heads()[1]!.textContent).toContain("Your plan");
    expect(heads()[0]!.className).not.toContain("bill-g-head--mine");
    expect(heads()[0]!.textContent).toContain("Included");
  });

  it("plan states are disabled buttons in the button row, never gold actions", async () => {
    plusMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    /* Design G keeps one button per column so the pair composes;
       a state is a DISABLED button in the state's own treatment —
       it cannot be tapped and does not wear the gold action fill. */
    for (const label of ["Your plan", "Included in your plan"]) {
      const btn = screen.getByRole("button", { name: label }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(btn.className).not.toContain("bill-btn-gold");
      expect(btn.className).toContain("bill-btn-state");
    }
    expect(screen.queryByRole("button", { name: "Go Premium" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Go Premium Plus" })).toBeNull();
  });

  it("a Premium member's own button is disabled; the Plus button stays live", async () => {
    premiumMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    const mine = screen.getByRole("button", { name: "Your plan" }) as HTMLButtonElement;
    expect(mine.disabled).toBe(true);
    const plus = screen.getByRole("button", { name: "Go Premium Plus" }) as HTMLButtonElement;
    expect(plus.disabled).toBe(false);
    expect(heads()[0]!.textContent).toContain("Your plan");
  });

  it("a top-tier member gets exactly one clear action: manage the membership (M-205, F-37)", async () => {
    plusMember();
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(screen.getByRole("button", { name: "Manage your membership" })).toBeTruthy();
    /* The ledger still renders whole for a top-tier member — the
       comparison is the sheet's content, whoever opens it. */
    expect(document.querySelectorAll("[data-comparison-row]").length).toBe(
      PAYWALL_COMPARISON.length,
    );
  });

  it("a visitor gets no manage action — the columns carry the actions (M-205, F-37)", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    expect(screen.queryByRole("button", { name: "Manage your membership" })).toBeNull();
  });

  it("a visitor meets both buttons live, and Plus carries the Most loved head", async () => {
    render(<PaywallHost />);
    await act(async () => {
      requestPaywall("profile");
    });
    const goPremium = screen.getByRole("button", { name: "Go Premium" }) as HTMLButtonElement;
    const goPlus = screen.getByRole("button", { name: "Go Premium Plus" }) as HTMLButtonElement;
    expect(goPremium.disabled).toBe(false);
    expect(goPlus.disabled).toBe(false);
    expect(heads()[1]!.className).toContain("bill-g-head--plus");
    expect(heads()[0]!.className).not.toContain("bill-g-head--plus");
    /* No column is marked as anyone's plan for a visitor. */
    expect(screen.queryByRole("button", { name: "Your plan" })).toBeNull();
  });
});
