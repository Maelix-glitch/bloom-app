// @vitest-environment jsdom
/**
 * The Orders-rail client seam (checkout.ts), and M-217's speed
 * contract: payWithRazorpay starts the checkout.js download and
 * the prefill session fetch CONCURRENTLY (neither waits for the
 * other), then constructs the modal with exactly the options it
 * always did. A script that cannot load settles "unavailable" —
 * and the loader's cache clears, so a later attempt can retry.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMock = vi.hoisted(() => ({
  getSession: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: { getSession: sessionMock.getSession },
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
  },
}));

interface FakeOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  handler: (r: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
}

const constructed: FakeOptions[] = [];
const opened = vi.fn();
class FakeRazorpay {
  constructor(options: FakeOptions) {
    constructed.push(options);
  }
  open = opened;
  on = vi.fn();
}

/** The script elements checkout.ts injects, in order. */
function injectedScripts(): HTMLScriptElement[] {
  return [...document.head.querySelectorAll("script")].filter((s) =>
    (s.getAttribute("src") ?? "").includes("checkout.razorpay.com"),
  ) as HTMLScriptElement[];
}

const INPUT = {
  keyId: "rzp_test_key",
  orderId: "order_42",
  amount: 499900,
  currency: "INR",
  description: "Bloom Premium — yearly",
};

/** Let queued microtasks run without resolving anything steered. */
async function flushMicrotasks(rounds = 6) {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

beforeEach(() => {
  vi.resetModules();
  constructed.length = 0;
  opened.mockClear();
  sessionMock.getSession.mockReset();
  delete (window as unknown as { Razorpay?: unknown }).Razorpay;
  document.head.querySelectorAll("script").forEach((s) => s.remove());
});

describe("M-217 — payWithRazorpay runs the script load and the session fetch concurrently", () => {
  it("both start before either settles, and the modal opens with the identical options", async () => {
    let settleSession!: (v: unknown) => void;
    sessionMock.getSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          settleSession = resolve;
        }),
    );
    const { payWithRazorpay } = await import("./checkout");

    const payPromise = payWithRazorpay(INPUT);
    await flushMicrotasks();

    /* Neither has settled, yet BOTH are in flight: the script tag
       is injected and the session fetch has been called. Before
       M-217 the session fetch waited for the script's onload. */
    expect(injectedScripts().length).toBe(1);
    expect(sessionMock.getSession).toHaveBeenCalledTimes(1);
    expect(constructed.length).toBe(0);

    /* The script lands (with the constructor on window, as the
       real checkout.js leaves it) and the session answers. */
    (window as unknown as { Razorpay: unknown }).Razorpay = FakeRazorpay;
    injectedScripts()[0]!.onload?.(new Event("load"));
    settleSession({ data: { session: { user: { email: "member@example.com" } } } });
    await flushMicrotasks();

    expect(constructed.length).toBe(1);
    const options = constructed[0]!;
    expect(options.key).toBe(INPUT.keyId);
    expect(options.amount).toBe(INPUT.amount);
    expect(options.currency).toBe(INPUT.currency);
    expect(options.order_id).toBe(INPUT.orderId);
    expect(options.name).toBe("Bloom Vitalis");
    expect(options.description).toBe(INPUT.description);
    expect(options.prefill).toEqual({ email: "member@example.com" });
    expect(options.theme).toEqual({ color: "#dcc08f" });
    expect(opened).toHaveBeenCalledTimes(1);

    /* The handler settles the payment exactly as before. */
    options.handler({
      razorpay_payment_id: "pay_1",
      razorpay_order_id: INPUT.orderId,
      razorpay_signature: "sig_1",
    });
    await expect(payPromise).resolves.toEqual({
      kind: "paid",
      signature: { orderId: INPUT.orderId, paymentId: "pay_1", signature: "sig_1" },
    });
  });

  it("a session failure never blocks the modal — it opens without prefill", async () => {
    sessionMock.getSession.mockRejectedValueOnce(new Error("no session"));
    const { payWithRazorpay } = await import("./checkout");

    const payPromise = payWithRazorpay(INPUT);
    await flushMicrotasks();
    (window as unknown as { Razorpay: unknown }).Razorpay = FakeRazorpay;
    injectedScripts()[0]!.onload?.(new Event("load"));
    await flushMicrotasks();

    expect(constructed.length).toBe(1);
    expect(constructed[0]!.prefill).toBeUndefined();
    expect(opened).toHaveBeenCalledTimes(1);
    constructed[0]!.modal?.ondismiss?.();
    await expect(payPromise).resolves.toEqual({ kind: "dismissed" });
  });
});

describe("checkout.js load failure — the honest unavailable state", () => {
  it("a script error settles unavailable, and the cleared cache lets a retry load", async () => {
    sessionMock.getSession.mockResolvedValue({
      data: { session: { user: { email: "member@example.com" } } },
    });
    const { loadRazorpayCheckout, payWithRazorpay } = await import("./checkout");

    const payPromise = payWithRazorpay(INPUT);
    await flushMicrotasks();
    expect(injectedScripts().length).toBe(1);
    injectedScripts()[0]!.onerror?.(new Event("error"));
    await expect(payPromise).resolves.toEqual({ kind: "unavailable" });
    expect(constructed.length).toBe(0);

    /* The failure did not poison the cache: asking again injects a
       fresh tag, and this time it can succeed. */
    const retry = loadRazorpayCheckout();
    await flushMicrotasks();
    expect(injectedScripts().length).toBe(2);
    (window as unknown as { Razorpay: unknown }).Razorpay = FakeRazorpay;
    injectedScripts()[1]!.onload?.(new Event("load"));
    await expect(retry).resolves.toBe(FakeRazorpay);
  });
});
