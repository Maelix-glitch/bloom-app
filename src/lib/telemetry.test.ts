// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  getSession: vi.fn(),
  configured: true,
}));

vi.mock("@/lib/supabase", () => ({
  get hasSupabaseConfig() {
    return mocks.configured;
  },
  supabaseConfigProblem: () => null,
  supabase: {
    auth: { getSession: mocks.getSession },
    from: () => ({ insert: mocks.insert }),
  },
}));

import { report } from "./profile/errors";
import { __errorBufferForTests, __resetTelemetryForTests, enqueueError, flushErrors } from "./telemetry";

beforeEach(() => {
  __resetTelemetryForTests();
  mocks.insert.mockReset().mockResolvedValue({ error: null });
  mocks.getSession.mockReset().mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  mocks.configured = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("enqueueError", () => {
  it("collapses repeats of the same scope + message into an occurrence count", () => {
    enqueueError("coach:send", new Error("boom"));
    enqueueError("coach:send", new Error("boom"));
    enqueueError("coach:send", new Error("different"));
    const buf = __errorBufferForTests();
    expect(buf).toHaveLength(2);
    expect(buf[0]).toMatchObject({ scope: "coach:send", message: "boom", occurrences: 2 });
    expect(buf[1]).toMatchObject({ message: "different", occurrences: 1 });
  });

  it("scrubs query strings and credential params out of messages", () => {
    enqueueError("access:magic-link", new Error("failed https://x.dev/cb?token=abc123&code=zz for a@b.c"));
    const [event] = __errorBufferForTests();
    expect(event!.message).not.toContain("abc123");
    expect(event!.message).not.toContain("code=zz");
    expect(event!.message).toContain("https://x.dev/cb");
  });

  it("reads plain-object (PostgREST/Supabase) errors instead of '[object Object]'", () => {
    enqueueError("profile:load", {
      message: 'column profiles.banner_path does not exist',
      code: "42703",
      details: null,
      hint: null,
    });
    const [event] = __errorBufferForTests();
    expect(event!.message).toContain("banner_path does not exist");
    expect(event!.message).toContain("42703");
    expect(event!.message).not.toContain("[object Object]");
  });

  it("includes details and hint from plain-object errors when present", () => {
    enqueueError("habits:save", { message: "insert failed", code: "23505", details: "Key already exists.", hint: "Use upsert." });
    const [event] = __errorBufferForTests();
    expect(event!.message).toContain("Key already exists.");
    expect(event!.message).toContain("hint: Use upsert.");
  });

  it("falls back to JSON for message-less objects and survives circular ones", () => {
    enqueueError("x", { weird: true });
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    enqueueError("y", circular);
    const buf = __errorBufferForTests();
    expect(buf[0]!.message).toContain('"weird":true');
    expect(buf[1]!.message).toBe("unknown");
  });

  it("persists the buffer so a dead page still reports on next launch", () => {
    enqueueError("profile:load", new Error("gone"));
    const raw = window.localStorage.getItem("bloom:error-log:v1");
    expect(raw).toContain("profile:load");
    expect(raw).toContain("gone");
  });

  it("caps the buffer at 50 events", () => {
    mocks.configured = false; // keep flushes out of the way; this tests the cap, not the send
    for (let i = 0; i < 55; i++) enqueueError("s", new Error(`e${i}`));
    expect(__errorBufferForTests()).toHaveLength(50);
    expect(__errorBufferForTests()[0]!.message).toBe("e5");
  });
});

describe("flushErrors", () => {
  it("inserts the batch with the signed-in profile id and clears the buffer", async () => {
    enqueueError("mood:save", new Error("nope"));
    await flushErrors();
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    const rows = mocks.insert.mock.calls[0]![0] as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ profile_id: "user-1", scope: "mood:save", message: "nope", occurrences: 1 });
    expect(__errorBufferForTests()).toHaveLength(0);
  });

  it("retries anonymously when the insert fails (stale session profile)", async () => {
    mocks.insert
      .mockResolvedValueOnce({ error: { message: "fk violation" } })
      .mockResolvedValueOnce({ error: null });
    enqueueError("habits:save", new Error("bad fk"));
    await flushErrors();
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    const retryRows = mocks.insert.mock.calls[1]![0] as Record<string, unknown>[];
    expect(retryRows[0]!["profile_id"]).toBeNull();
  });

  it("drops the batch quietly when both attempts fail — never loops", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "table missing" } });
    enqueueError("x", new Error("y"));
    await expect(flushErrors()).resolves.toBeUndefined();
    expect(mocks.insert).toHaveBeenCalledTimes(2);
    expect(__errorBufferForTests()).toHaveLength(0);
  });

  it("does nothing when Supabase is not configured", async () => {
    mocks.configured = false;
    enqueueError("x", new Error("y"));
    await flushErrors();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("report() wiring", () => {
  it("every report() call reaches the telemetry buffer", () => {
    const message = report("access:magic-link", new Error("smtp down"));
    expect(message).toBe("Something went wrong.");
    expect(__errorBufferForTests()).toHaveLength(1);
    expect(__errorBufferForTests()[0]).toMatchObject({ scope: "access:magic-link", message: "smtp down" });
  });
});
