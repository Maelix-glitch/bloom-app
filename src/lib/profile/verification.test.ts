import { describe, expect, it } from "vitest";

import { verificationStatus } from "./verification";

/**
 * The tick is a claim, so the criteria behind it are pinned combination by
 * combination. Verification v2: the tick appears only when the account is
 * an invited member, the email is confirmed, the basic profile (real name
 * + @username) is complete AND the grant has been recorded in
 * account_verifications — never for less, and never for a record alone.
 */

const COMPLETE = {
  invited: true,
  emailConfirmed: true,
  displayName: "Said Ali",
  username: "maelix",
  hasRecord: true,
} as const;

describe("verificationStatus", () => {
  it("verifies when invited, confirmed, complete — and the record exists", () => {
    /* The owner's own account shape: invited email, confirmed, display
       name and username all present, grant recorded — this case must
       yield verified. */
    const status = verificationStatus({ ...COMPLETE });
    expect(status.verified).toBe(true);
    expect(status.remaining).toBe(0);
    expect(status.pendingRecord).toBe(false);
    expect(status.steps.every((s) => s.done)).toBe(true);
  });

  it("never verifies without an invite, however complete everything else is", () => {
    /* The owner's core rule: verification is by invitation only. Even a
       (hypothetical) record cannot rescue an uninvited account — the
       status refuses, defence in depth behind the server-side gate. */
    const status = verificationStatus({ ...COMPLETE, invited: false });
    expect(status.verified).toBe(false);
    expect(status.remaining).toBe(1);
    expect(status.steps.find((s) => s.id === "invite")?.done).toBe(false);
    expect(status.steps.find((s) => s.id === "email")?.done).toBe(true);
    expect(status.steps.find((s) => s.id === "profile")?.done).toBe(true);
  });

  it("does not verify on steps alone — the record is the tick", () => {
    const status = verificationStatus({ ...COMPLETE, hasRecord: false });
    expect(status.verified).toBe(false);
    expect(status.remaining).toBe(0);
    expect(status.pendingRecord).toBe(true);
    expect(status.steps.every((s) => s.done)).toBe(true);
  });

  it("reports the steps honestly for an invited member with no record yet", () => {
    const status = verificationStatus({
      invited: true,
      emailConfirmed: false,
      displayName: "Ivy",
      username: "ivy",
      hasRecord: false,
    });
    expect(status.verified).toBe(false);
    expect(status.pendingRecord).toBe(false);
    expect(status.remaining).toBe(1);
    expect(status.steps.find((s) => s.id === "invite")?.done).toBe(true);
    expect(status.steps.find((s) => s.id === "email")?.done).toBe(false);
    expect(status.steps.find((s) => s.id === "profile")?.done).toBe(true);
  });

  it("does not verify on an unconfirmed email, however complete the profile", () => {
    const status = verificationStatus({ ...COMPLETE, emailConfirmed: false });
    expect(status.verified).toBe(false);
    expect(status.remaining).toBe(1);
    expect(status.steps.find((s) => s.id === "email")?.done).toBe(false);
    expect(status.steps.find((s) => s.id === "profile")?.done).toBe(true);
  });

  it("does not verify when the display name is missing", () => {
    for (const displayName of [null, undefined, "", "   "]) {
      const status = verificationStatus({ ...COMPLETE, displayName });
      expect(status.verified).toBe(false);
      expect(status.steps.find((s) => s.id === "profile")?.done).toBe(false);
    }
  });

  it("does not count the placeholder name as a name", () => {
    /* A profile row that was never saved reads back as "Bloom User" — that
       is the absence of a name, not a name. */
    const status = verificationStatus({ ...COMPLETE, displayName: "Bloom User" });
    expect(status.verified).toBe(false);
    expect(status.remaining).toBe(1);
  });

  it("does not verify when the handle is missing", () => {
    for (const username of [null, undefined, "", "   "]) {
      const status = verificationStatus({ ...COMPLETE, username });
      expect(status.verified).toBe(false);
      expect(status.steps.find((s) => s.id === "profile")?.done).toBe(false);
    }
  });

  it("counts all three steps remaining when nothing is done", () => {
    const status = verificationStatus({
      invited: false,
      emailConfirmed: false,
      displayName: null,
      username: null,
      hasRecord: false,
    });
    expect(status.verified).toBe(false);
    expect(status.remaining).toBe(3);
    expect(status.steps.map((s) => s.done)).toEqual([false, false, false]);
    expect(status.steps.map((s) => s.id)).toEqual(["invite", "email", "profile"]);
  });

  it("gives each unfinished step honest guidance", () => {
    const status = verificationStatus({
      invited: false,
      emailConfirmed: false,
      displayName: null,
      username: null,
      hasRecord: false,
    });
    for (const step of status.steps) {
      expect(step.label.length).toBeGreaterThan(0);
      expect(step.guidance.length).toBeGreaterThan(0);
    }
    expect(status.steps.find((s) => s.id === "invite")?.guidance).toContain("invit");
    expect(status.steps.find((s) => s.id === "email")?.guidance).toContain("sign-in link");
    expect(status.steps.find((s) => s.id === "profile")?.guidance).toContain("Edit profile");
  });
});
