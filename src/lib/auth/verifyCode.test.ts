import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  report: vi.fn(),
  configured: true,
  configProblem: null as string | null,
}));
const { verifyOtp, report } = mocks;

vi.mock("@/lib/supabase", () => ({
  get hasSupabaseConfig() {
    return mocks.configured;
  },
  supabaseConfigProblem: () => mocks.configProblem,
  supabase: { auth: { verifyOtp: mocks.verifyOtp } },
}));

vi.mock("@/lib/profile/errors", () => ({ report: mocks.report }));

import { verifyEmailCode } from "./verifyCode";

beforeEach(() => {
  verifyOtp.mockReset();
  report.mockReset();
  mocks.configured = true;
  mocks.configProblem = null;
});

describe("verifyEmailCode", () => {
  it("normalises the email, trims the code and checks it as an email token", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    const result = await verifyEmailCode("  Person@Example.COM ", " 1234 5678 ", {
      scope: "access:verify-code",
    });
    expect(result).toEqual({ ok: true });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "person@example.com",
      token: "1234 5678",
      type: "email",
    });
    expect(report).not.toHaveBeenCalled();
  });

  it("words a wrong code for the person and reports it under scope", async () => {
    verifyOtp.mockResolvedValue({ error: new Error("Invalid token") });
    const result = await verifyEmailCode("a@b.co", "00000000", { scope: "access:verify-code" });
    expect(result).toEqual({
      ok: false,
      message:
        "That code doesn't match, or it has expired. Check the email and try again — or send a fresh code.",
    });
    expect(report).toHaveBeenCalledWith("access:verify-code", expect.any(Error));
  });

  it("words an expired code the same human way — the backend can't tell them apart", async () => {
    verifyOtp.mockResolvedValue({ error: new Error("Token has expired or is invalid") });
    const result = await verifyEmailCode("a@b.co", "12345678", { scope: "profile:verify-code" });
    expect(result).toEqual({
      ok: false,
      message:
        "That code doesn't match, or it has expired. Check the email and try again — or send a fresh code.",
    });
    expect(report).toHaveBeenCalledWith("profile:verify-code", expect.any(Error));
  });

  it("refuses plainly when the build has no account system connected", async () => {
    mocks.configured = false;
    mocks.configProblem = "Missing Supabase URL.";
    const result = await verifyEmailCode("a@b.co", "12345678", { scope: "access:verify-code" });
    expect(result).toEqual({ ok: false, message: "Missing Supabase URL." });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("turns a thrown 'not connected' into its own sentence", async () => {
    verifyOtp.mockRejectedValue(new Error("Supabase is not connected"));
    const result = await verifyEmailCode("a@b.co", "12345678", { scope: "profile:verify-code" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("isn't connected to a database");
    expect(report).toHaveBeenCalledWith("profile:verify-code", expect.any(Error));
  });

  it("maps a thrown network failure through the shared wording", async () => {
    verifyOtp.mockRejectedValue(new Error("Failed to fetch"));
    const result = await verifyEmailCode("a@b.co", "12345678", { scope: "access:verify-code" });
    expect(result).toEqual({
      ok: false,
      message: "No connection. Check your network and try again.",
    });
  });
});
