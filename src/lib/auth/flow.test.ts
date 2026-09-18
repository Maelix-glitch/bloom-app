/**
 * The sign-in flow.
 *
 * The point of these tests is that the eleven states actually connect. A flow
 * like this fails in the gaps — a resend that re-checks approval, a rejection
 * you can't escape, a retry that loses the address — and none of those show up
 * as a crash.
 */

import { describe, expect, it } from "vitest";

import {
  authReducer,
  canResend,
  canSubmit,
  INITIAL_AUTH,
  isLikelyEmail,
  messageFor,
  submitLabel,
  type AuthState,
} from "./flow";

/** Drive a state through a list of events. */
const run = (events: Parameters<typeof authReducer>[1][], from: AuthState = INITIAL_AUTH) =>
  events.reduce(authReducer, from);

describe("isLikelyEmail", () => {
  it.each([
    ["a@b.co", true],
    ["someone@example.com", true],
    ["first.last+tag@sub.domain.org", true],
    ["", false],
    ["nope", false],
    ["@example.com", false],
    ["someone@", false],
    ["someone@example", false],
    ["two words@example.com", false],
    ["someone@.com", false],
    ["someone@example.", false],
  ])("classifies %s as %s", (value, expected) => {
    expect(isLikelyEmail(value)).toBe(expected);
  });

  it("trims rather than rejecting", () => {
    expect(isLikelyEmail("  a@b.co  ")).toBe(true);
  });
});

describe("the happy path", () => {
  it("goes idle -> typing -> checking -> sending -> sent", () => {
    const s = run([
      { type: "email", value: "friend@bloom.app" },
      { type: "submit" },
      { type: "invited" },
      { type: "sent", email: "friend@bloom.app" },
    ]);

    expect(s.phase).toBe("sent");
    expect(s.sentTo).toBe("friend@bloom.app");
    expect(s.sends).toBe(1);
  });

  it("lands on personalization for a first-time sign-in", () => {
    const s = run(
      [{ type: "authenticated", needsPersonalization: true }],
      run([
        { type: "email", value: "a@b.co" },
        { type: "submit" },
        { type: "invited" },
        { type: "sent", email: "a@b.co" },
      ]),
    );
    expect(s.phase).toBe("personalization");
  });

  it("lands on authenticated for a returning user", () => {
    const s = authReducer(INITIAL_AUTH, { type: "authenticated", needsPersonalization: false });
    expect(s.phase).toBe("authenticated");
  });
});

describe("rejection", () => {
  const rejected = run([
    { type: "email", value: "stranger@nowhere.test" },
    { type: "submit" },
    { type: "not-invited" },
  ]);

  it("is a clear dead end with a message", () => {
    expect(rejected.phase).toBe("rejected");
    expect(rejected.message).toMatch(/invite list/i);
  });

  it("can be escaped by typing another address", () => {
    expect(authReducer(rejected, { type: "email", value: "other@bloom.app" }).phase).toBe("typing");
  });

  it("does not leak a reason", () => {
    // The message must not distinguish "never invited" from "revoked" or
    // "already used" — that would turn the screen into a list probe.
    expect(rejected.message).toBe("That address isn't on the invite list.");
  });
});

describe("invalid input", () => {
  it("never reaches the network", () => {
    const s = run([{ type: "email", value: "not-an-email" }, { type: "submit" }]);
    expect(s.phase).toBe("invalid");
    expect(s.message).toMatch(/email address/i);
  });

  it("clears once they fix it", () => {
    const s = run([
      { type: "email", value: "not-an-email" },
      { type: "submit" },
      { type: "email", value: "a@b.co" },
    ]);
    expect(s.phase).toBe("typing");
    expect(s.message).toBeNull();
  });
});

describe("failure and retry", () => {
  const failed = run([
    { type: "email", value: "a@b.co" },
    { type: "submit" },
    { type: "invited" },
    { type: "error", message: "Failed to fetch" },
  ]);

  it("shows a human message, not the backend string", () => {
    expect(failed.phase).toBe("failed");
    expect(failed.message).not.toMatch(/fetch/i);
    expect(failed.message).toMatch(/connection/i);
  });

  it("keeps the address so retry doesn't start from scratch", () => {
    const retried = authReducer(failed, { type: "retry" });
    expect(retried.email).toBe("a@b.co");
    expect(retried.phase).toBe("typing");
  });
});

describe("resend", () => {
  const sent = run([
    { type: "email", value: "a@b.co" },
    { type: "submit" },
    { type: "invited" },
    { type: "sent", email: "a@b.co" },
  ]);

  it("does not re-check approval", () => {
    // They were already approved; resending must go straight to sending.
    expect(authReducer(sent, { type: "submit" }).phase).toBe("sending");
  });

  it("counts sends and stops after three", () => {
    let s = sent;
    for (let i = 0; i < 2; i += 1) {
      s = authReducer(authReducer(s, { type: "submit" }), { type: "sent", email: "a@b.co" });
    }
    expect(s.sends).toBe(3);
    expect(canResend(s)).toBe(false);
  });

  it("resets the count for a different address", () => {
    const s = authReducer(sent, { type: "sent", email: "other@bloom.app" });
    expect(s.sends).toBe(1);
  });

  it("drops the sent state when they edit the address", () => {
    const s = authReducer(sent, { type: "email", value: "other@bloom.app" });
    expect(s.phase).toBe("typing");
    expect(s.sentTo).toBe("a@b.co"); // still remembered for "edit back"
  });
});

describe("guards", () => {
  it("blocks submission while checking or sending", () => {
    expect(canSubmit({ ...INITIAL_AUTH, phase: "checking" })).toBe(false);
    expect(canSubmit({ ...INITIAL_AUTH, phase: "sending" })).toBe(false);
    expect(canSubmit({ ...INITIAL_AUTH, phase: "typing" })).toBe(true);
  });

  it("ignores events that arrive out of order", () => {
    // A late "invited" from a superseded check must not resurrect the flow.
    expect(authReducer(INITIAL_AUTH, { type: "invited" })).toEqual(INITIAL_AUTH);
    expect(authReducer(INITIAL_AUTH, { type: "not-invited" })).toEqual(INITIAL_AUTH);
  });

  it("labels the button per state", () => {
    expect(submitLabel({ ...INITIAL_AUTH, phase: "idle" })).toBe("Continue");
    expect(submitLabel({ ...INITIAL_AUTH, phase: "checking" })).toBe("Checking…");
    expect(submitLabel({ ...INITIAL_AUTH, phase: "sending" })).toBe("Sending…");
    expect(submitLabel({ ...INITIAL_AUTH, phase: "sent" })).toBe("Resend link");
  });
});

describe("messageFor", () => {
  it.each([
    ["rate limit exceeded", /minute/i],
    ["SMTP provider error", /email right now/i],
    ["Failed to fetch", /connection/i],
    ["Bloom access is by invitation only.", /invite list/i],
    ["some opaque internal thing", /didn't work/i],
  ])("translates %s", (input, expected) => {
    expect(messageFor(new Error(input))).toMatch(expected);
  });

  it("survives a non-Error", () => {
    expect(messageFor(undefined)).toMatch(/didn't work/i);
    expect(messageFor("boom")).toMatch(/didn't work/i);
  });
});
