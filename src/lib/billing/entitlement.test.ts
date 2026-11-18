/**
 * The client entitlement read: the RPC row shape is parsed
 * tolerantly, and anything unprovable degrades to null — the caller
 * reads that as "unavailable", and the UI then treats the person as
 * Free WITHOUT inventing numbers (no balance, no allowance, no
 * period end is ever synthesised out of a malformed row).
 */
import { describe, expect, it } from "vitest";

import { parseEntitlementRows } from "./entitlement";

const ROW = {
  tier: "premium",
  status: "active",
  credit_balance: 287,
  monthly_allowance: 300,
  current_period_end: "2026-12-18T00:00:00.000Z",
  period_start: "2026-11-18T00:00:00.000Z",
};

describe("parseEntitlementRows", () => {
  it("reads a well-formed RPC row", () => {
    expect(parseEntitlementRows([ROW])).toEqual({
      tier: "premium",
      status: "active",
      currentPeriodEnd: "2026-12-18T00:00:00.000Z",
      creditBalance: 287,
      monthlyAllowance: 300,
      periodStart: "2026-11-18T00:00:00.000Z",
    });
  });

  it("an unknown tier string reads as free, never as paid", () => {
    expect(parseEntitlementRows([{ ...ROW, tier: "gold" }])?.tier).toBe("free");
    expect(parseEntitlementRows([{ ...ROW, tier: null }])?.tier).toBe("free");
  });

  it("a row missing the tier or balance key is unprovable → null", () => {
    const { tier: _t, ...noTier } = ROW;
    const { credit_balance: _b, ...noBalance } = ROW;
    expect(parseEntitlementRows([noTier])).toBeNull();
    expect(parseEntitlementRows([noBalance])).toBeNull();
  });

  it("non-row inputs are unprovable → null", () => {
    expect(parseEntitlementRows([])).toBeNull();
    expect(parseEntitlementRows(null)).toBeNull();
    expect(parseEntitlementRows(undefined)).toBeNull();
    expect(parseEntitlementRows("nope")).toBeNull();
    expect(parseEntitlementRows([null])).toBeNull();
    expect(parseEntitlementRows([42])).toBeNull();
  });

  it("a free row with no subscription period parses with nulls", () => {
    const parsed = parseEntitlementRows([
      {
        tier: "free",
        status: "none",
        credit_balance: 20,
        monthly_allowance: 20,
        current_period_end: null,
        period_start: "2026-11-01T00:00:00.000Z",
      },
    ]);
    expect(parsed?.tier).toBe("free");
    expect(parsed?.currentPeriodEnd).toBeNull();
    expect(parsed?.creditBalance).toBe(20);
  });

  it("balances are floored and clamped at zero, never rounded up", () => {
    expect(parseEntitlementRows([{ ...ROW, credit_balance: 12.9 }])?.creditBalance).toBe(12);
    expect(parseEntitlementRows([{ ...ROW, credit_balance: -5 }])?.creditBalance).toBe(0);
    expect(parseEntitlementRows([{ ...ROW, credit_balance: "abc" }])?.creditBalance).toBe(0);
  });

  it("a missing status reads as 'none'; a missing period start as null", () => {
    const { status: _s, period_start: _p, ...rest } = ROW;
    const parsed = parseEntitlementRows([rest]);
    expect(parsed?.status).toBe("none");
    expect(parsed?.periodStart).toBeNull();
  });
});
