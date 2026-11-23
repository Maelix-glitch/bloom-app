// @vitest-environment jsdom
/**
 * M-222 Autopay — the client seam: createSubscription asks the
 * function for a subscription (never an amount — the plan carries
 * the price), the modal opens in subscription mode (subscription_id,
 * no order_id), and cancelAutoRenew maps the function's honest
 * states. The rail flag defaults to subscription with the Orders
 * rail one flip away.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.hoisted(() => ({ invoke: vi.fn() }));
const sessionMock = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: { getSession: sessionMock.getSession },
    functions: { invoke: invokeMock.invoke },
  },
}));

interface FakeSubOptions {
  key: string;
  name: string;
  description: string;
  subscription_id?: string;
  order_id?: string;
  amount?: number;
  prefill?: { email?: string };
  modal?: { ondismiss?: () => void };
  handler: (r: {
    razorpay_payment_id: string;
    razorpay_subscription_id?: string;
    razorpay_signature: string;
  }) => void;
}

const constructed: FakeSubOptions[] = [];
const opened = vi.fn();
class FakeRazorpay {
  constructor(options: FakeSubOptions) {
    constructed.push(options);
  }
  open = opened;
  on = vi.fn();
}

function injectedScripts(): HTMLScriptElement[] {
  return [...document.head.querySelectorAll("script")].filter((s) =>
    (s.getAttribute("src") ?? "").includes("checkout.razorpay.com"),
  ) as HTMLScriptElement[];
}

async function flushMicrotasks(rounds = 6) {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

beforeEach(() => {
  vi.resetModules();
  constructed.length = 0;
  opened.mockClear();
  invokeMock.invoke.mockReset();
  sessionMock.getSession.mockReset();
  sessionMock.getSession.mockResolvedValue({
    data: { session: { user: { email: "member@example.com" } } },
  });
  delete (window as unknown as { Razorpay?: unknown }).Razorpay;
  document.head.querySelectorAll("script").forEach((s) => s.remove());
});

describe("CHECKOUT_RAIL", () => {
  it("defaults to subscription; the Orders rail stays selectable in code", async () => {
    const { CHECKOUT_RAIL } = await import("./checkout");
    expect(CHECKOUT_RAIL).toBe("subscription");
  });
});

describe("createSubscription — the function's states, mapped honestly", () => {
  it("ready carries the subscription id and the public key id", async () => {
    invokeMock.invoke.mockResolvedValue({
      data: { state: "ready", subscription_id: "sub_77", key_id: "rzp_live_x" },
      error: null,
    });
    const { createSubscription } = await import("./checkout");
    await expect(createSubscription("premium", "yearly")).resolves.toEqual({
      state: "ready",
      subscriptionId: "sub_77",
      keyId: "rzp_live_x",
    });
    expect(invokeMock.invoke).toHaveBeenCalledWith("billing", {
      body: { action: "create_subscription", tier: "premium", period: "yearly" },
    });
  });

  it("not-configured and provider states pass through; a shapeless answer fails closed", async () => {
    const { createSubscription } = await import("./checkout");
    invokeMock.invoke.mockResolvedValue({ data: { state: "payments_not_configured" }, error: null });
    await expect(createSubscription("premium_plus", "monthly")).resolves.toEqual({
      state: "payments_not_configured",
    });
    invokeMock.invoke.mockResolvedValue({ data: { state: "provider_error" }, error: null });
    await expect(createSubscription("premium_plus", "monthly")).resolves.toEqual({
      state: "provider_error",
    });
    invokeMock.invoke.mockResolvedValue({ data: { state: "ready" }, error: null });
    await expect(createSubscription("premium_plus", "monthly")).resolves.toEqual({ state: "failed" });
    invokeMock.invoke.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(createSubscription("premium_plus", "monthly")).resolves.toEqual({ state: "failed" });
  });
});

describe("payWithRazorpaySubscription — the modal in subscription mode", () => {
  it("constructs with subscription_id and NO order_id/amount, and settles authorized", async () => {
    const { payWithRazorpaySubscription } = await import("./checkout");
    const payPromise = payWithRazorpaySubscription({
      keyId: "rzp_live_x",
      subscriptionId: "sub_77",
      description: "Bloom Premium — yearly",
    });
    await flushMicrotasks();
    (window as unknown as { Razorpay: unknown }).Razorpay = FakeRazorpay;
    injectedScripts()[0]!.onload?.(new Event("load"));
    await flushMicrotasks();

    expect(constructed.length).toBe(1);
    const options = constructed[0]!;
    expect(options.key).toBe("rzp_live_x");
    expect(options.subscription_id).toBe("sub_77");
    expect(options.order_id).toBeUndefined();
    expect(options.amount).toBeUndefined();
    expect(options.name).toBe("Bloom Vitalis");
    expect(options.prefill).toEqual({ email: "member@example.com" });
    expect(opened).toHaveBeenCalledTimes(1);

    options.handler({
      razorpay_payment_id: "pay_9",
      razorpay_subscription_id: "sub_77",
      razorpay_signature: "sig_9",
    });
    await expect(payPromise).resolves.toEqual({
      kind: "authorized",
      paymentId: "pay_9",
      subscriptionId: "sub_77",
    });
  });

  it("dismissal settles dismissed — nothing was authorised", async () => {
    const { payWithRazorpaySubscription } = await import("./checkout");
    const payPromise = payWithRazorpaySubscription({
      keyId: "rzp_live_x",
      subscriptionId: "sub_77",
      description: "Bloom Premium — yearly",
    });
    await flushMicrotasks();
    (window as unknown as { Razorpay: unknown }).Razorpay = FakeRazorpay;
    injectedScripts()[0]!.onload?.(new Event("load"));
    await flushMicrotasks();
    constructed[0]!.modal?.ondismiss?.();
    await expect(payPromise).resolves.toEqual({ kind: "dismissed" });
  });
});

describe("cancelAutoRenew — the function's honest answers", () => {
  it("cancel_scheduled carries the period end the plan stays live until", async () => {
    invokeMock.invoke.mockResolvedValue({
      data: { state: "cancel_scheduled", period_end: "2026-12-23T00:00:00.000Z" },
      error: null,
    });
    const { cancelAutoRenew } = await import("./checkout");
    await expect(cancelAutoRenew()).resolves.toEqual({
      state: "cancel_scheduled",
      periodEnd: "2026-12-23T00:00:00.000Z",
    });
    expect(invokeMock.invoke).toHaveBeenCalledWith("billing", {
      body: { action: "cancel_subscription" },
    });
  });

  it("no auto-renewing subscription is an answer, not an error", async () => {
    const { cancelAutoRenew } = await import("./checkout");
    invokeMock.invoke.mockResolvedValue({ data: { state: "no_active_subscription" }, error: null });
    await expect(cancelAutoRenew()).resolves.toEqual({ state: "no_active_subscription" });
    invokeMock.invoke.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(cancelAutoRenew()).resolves.toEqual({ state: "failed" });
  });
});
