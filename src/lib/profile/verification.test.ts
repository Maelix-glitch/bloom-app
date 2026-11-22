import { describe, expect, it } from "vitest";

import { verificationStatus, verificationStatusFromRecord } from "./verification";

/**
 * Grant-only (owner directive, 2026-11-22): the tick is a RECORD the
 * owner grants to eligible members — nothing a member is, or completes,
 * earns it. These pins hold both directions of that truth:
 *
 *   · No record → not verified, full stop. The old v2 gates (invited,
 *     email confirmed, complete profile) are not consulted any more —
 *     the status does not even take them as input, and there is no
 *     "pending" state in which a grant is on its way.
 *   · A record → verified, even with an incomplete profile. The record
 *     is the whole truth; the profile is never re-judged. (Under v2
 *     this combination read NOT verified — the gates could veto a
 *     granted record. That veto is what the directive removes.)
 */

describe("verificationStatus", () => {
  it("verifies when the record exists", () => {
    const status = verificationStatus({ hasRecord: true });
    expect(status.verified).toBe(true);
    expect(status.remaining).toBe(0);
    expect(status.pendingRecord).toBe(false);
    expect(status.steps).toEqual([]);
  });

  it("does not verify without a record — and promises nothing on its way", () => {
    /* A member who passes every old gate but holds no record lands
       here: simply not verified. pendingRecord stays false — no grant
       is ever "recording" itself from anything the member does. */
    const status = verificationStatus({ hasRecord: false });
    expect(status.verified).toBe(false);
    expect(status.remaining).toBe(0);
    expect(status.pendingRecord).toBe(false);
    expect(status.steps).toEqual([]);
  });
});

describe("verificationStatusFromRecord", () => {
  /* For someone else, the record is the whole public truth — it can
     only have been created by the owner's grant, and their profile
     facts are private. People search renders its tick from exactly
     this. It and the signed-in status are the same function now:
     grant-only made the two readings one. */
  it("verifies when the record exists", () => {
    const status = verificationStatusFromRecord(true);
    expect(status.verified).toBe(true);
    expect(status.remaining).toBe(0);
    expect(status.pendingRecord).toBe(false);
    expect(status.steps).toEqual([]);
  });

  it("does not verify when there is no record", () => {
    const status = verificationStatusFromRecord(false);
    expect(status.verified).toBe(false);
    expect(status.pendingRecord).toBe(false);
  });

  it("agrees with verificationStatus on both readings", () => {
    expect(verificationStatusFromRecord(true)).toEqual(verificationStatus({ hasRecord: true }));
    expect(verificationStatusFromRecord(false)).toEqual(verificationStatus({ hasRecord: false }));
  });
});
