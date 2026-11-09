import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  report: vi.fn(),
  configured: true,
  configProblem: null as string | null,
}));
const { signInWithOtp, report } = mocks;

vi.mock("@/lib/supabase", () => ({
  get hasSupabaseConfig() {
    return mocks.configured;
  },
  supabaseConfigProblem: () => mocks.configProblem,
  supabase: { auth: { signInWithOtp: mocks.signInWithOtp } },
}));

vi.mock("@/lib/profile/errors", () => ({ report: mocks.report }));

import { requestMagicLink } from "./magicLink";

beforeEach(() => {
  signInWithOtp.mockReset();
  report.mockReset();
  mocks.configured = true;
  mocks.configProblem = null;
});

describe("requestMagicLink", () => {
  it("normalises the email and passes the caller's redirect through", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    const result = await requestMagicLink("  Person@Example.COM ", {
      redirectTo: "https://bloom.example/",
      scope: "access:magic-link",
    });
    expect(result).toEqual({ ok: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "person@example.com",
      options: { emailRedirectTo: "https://bloom.example/" },
    });
    expect(report).not.toHaveBeenCalled();
  });

  it("omits the options object entirely when no redirect is given", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    await requestMagicLink("a@b.co", { scope: "profile:magic-link" });
    expect(signInWithOtp).toHaveBeenCalledWith({ email: "a@b.co" });
  });

  it("words a rate-limit failure for the person and reports it under scope", async () => {
    signInWithOtp.mockResolvedValue({ error: new Error("Email rate limit exceeded") });
    const result = await requestMagicLink("a@b.co", { scope: "access:magic-link" });
    expect(result).toEqual({
      ok: false,
      message: "That's a few too many attempts. Give it a minute and try again.",
    });
    expect(report).toHaveBeenCalledWith("access:magic-link", expect.any(Error));
  });

  it("refuses plainly when the build has no account system connected", async () => {
    mocks.configured = false;
    mocks.configProblem = "Missing Supabase URL.";
    const result = await requestMagicLink("a@b.co", { scope: "profile:magic-link" });
    expect(result).toEqual({ ok: false, message: "Missing Supabase URL." });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("turns a thrown 'not connected' into its own sentence", async () => {
    signInWithOtp.mockRejectedValue(new Error("Supabase is not connected"));
    const result = await requestMagicLink("a@b.co", { scope: "profile:magic-link" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("isn't connected to a database");
    expect(report).toHaveBeenCalledWith("profile:magic-link", expect.any(Error));
  });

  it("maps a thrown network failure through the shared wording", async () => {
    signInWithOtp.mockRejectedValue(new Error("Failed to fetch"));
    const result = await requestMagicLink("a@b.co", { scope: "access:magic-link" });
    expect(result).toEqual({
      ok: false,
      message: "No connection. Check your network and try again.",
    });
  });
});
