/**
 * Referral — pinned: a code is stable per user and unambiguous to
 * read aloud; commission is 30% of RECEIVED money only, paid monthly
 * once it reaches ₹1,000, and carries untouched below that.
 */

import { describe, expect, it } from "vitest";

import {
  MIN_PAYOUT_INR,
  TRAINER_COMMISSION_RATE,
  commissionFor,
  deriveReferralCode,
  formatReferralCode,
  isReferralCode,
  normalizeReferralCode,
  summariseMonthlyPayout,
  type ReceivedPayment,
} from "./referral";

const USER_ID = "104f6172-c166-46dd-9759-ced94379a2ea";

describe("deriveReferralCode", () => {
  it("is stable for the same user id", () => {
    expect(deriveReferralCode(USER_ID)).toBe(deriveReferralCode(USER_ID));
  });

  it("differs between users", () => {
    expect(deriveReferralCode(USER_ID)).not.toBe(
      deriveReferralCode("6cb9d835-7d57-4ab2-92c3-d92bd1f6c195"),
    );
  });

  it("is 8 characters from the unambiguous alphabet (no 0/O/1/I/L)", () => {
    const code = deriveReferralCode(USER_ID)!;
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it("refuses an empty or missing id", () => {
    expect(deriveReferralCode(null)).toBeNull();
    expect(deriveReferralCode(undefined)).toBeNull();
    expect(deriveReferralCode("")).toBeNull();
    expect(deriveReferralCode("   ")).toBeNull();
  });

  it("round-trips through normalisation, with or without the prefix", () => {
    const code = deriveReferralCode(USER_ID)!;
    expect(normalizeReferralCode(code)).toBe(code);
    expect(normalizeReferralCode(code.toLowerCase())).toBe(code);
    expect(normalizeReferralCode(formatReferralCode(code))).toBe(code);
    expect(isReferralCode(formatReferralCode(code))).toBe(true);
    expect(isReferralCode("BLOOM-IO01")).toBe(false);
    expect(isReferralCode("short")).toBe(false);
    expect(isReferralCode(42)).toBe(false);
  });
});

describe("commission", () => {
  it("is 30% of a received payment, to the paise", () => {
    expect(TRAINER_COMMISSION_RATE).toBe(0.3);
    expect(commissionFor(3999)).toBe(1199.7);
    expect(commissionFor(599)).toBe(179.7);
  });

  it("earns nothing on money that was never received", () => {
    expect(commissionFor(0)).toBe(0);
    expect(commissionFor(-599)).toBe(0);
    expect(commissionFor(Number.NaN)).toBe(0);
  });
});

describe("summariseMonthlyPayout", () => {
  const pay = (amountInr: number, receivedAt: string): ReceivedPayment => ({
    amountInr,
    receivedAt,
  });

  it("pays out once the month's commission reaches ₹1,000", () => {
    const out = summariseMonthlyPayout(
      [pay(3999, "2026-11-03T10:00:00Z"), pay(3999, "2026-11-20T10:00:00Z")],
      "2026-11",
    );
    expect(out.receivedInr).toBe(7998);
    expect(out.commissionInr).toBe(2399.4);
    expect(out.meetsThreshold).toBe(true);
    expect(out.payableInr).toBe(2399.4);
    expect(out.carriedInr).toBe(0);
    expect(out.paymentCount).toBe(2);
  });

  it("carries — pays nothing — below the ₹1,000 threshold", () => {
    const out = summariseMonthlyPayout([pay(599, "2026-11-05T10:00:00Z")], "2026-11");
    expect(out.commissionInr).toBe(179.7);
    expect(out.meetsThreshold).toBe(false);
    expect(out.payableInr).toBe(0);
    expect(out.carriedInr).toBe(179.7);
    expect(MIN_PAYOUT_INR).toBe(1000);
  });

  it("counts only the month asked for, and only real receipts", () => {
    const out = summariseMonthlyPayout(
      [
        pay(3999, "2026-10-31T10:00:00Z"),
        pay(3999, "2026-11-01T10:00:00Z"),
        pay(-3999, "2026-11-02T10:00:00Z"),
        pay(Number.NaN, "2026-11-02T10:00:00Z"),
      ],
      "2026-11",
    );
    expect(out.paymentCount).toBe(1);
    expect(out.receivedInr).toBe(3999);
  });

  it("an empty month is a clean zero", () => {
    const out = summariseMonthlyPayout([], "2026-11");
    expect(out).toEqual({
      month: "2026-11",
      receivedInr: 0,
      commissionInr: 0,
      meetsThreshold: false,
      payableInr: 0,
      carriedInr: 0,
      paymentCount: 0,
    });
  });
});
